#!/usr/bin/env node

/**
 * Codex turn-completion notifications for Discord.
 *
 * Runtime dependencies: Node.js standard library only. The fast notify entry
 * point sanitizes Codex's payload, writes a mode-600 one-shot job, and detaches
 * a worker so Codex never waits for the debounce or webhook request.
 */

import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  closeSync,
  existsSync,
  fstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const DEFAULT_MIN_DURATION_SECONDS = 30;
const DEFAULT_DEBOUNCE_SECONDS = 8;
const MAX_TRANSCRIPT_BYTES = 32 * 1024 * 1024;
const MAX_JOB_AGE_MS = 5 * 60 * 1000;
const CODEX_GREEN = 0x10a37f;
const EMPTY_USAGE = Object.freeze({
  input_tokens: 0,
  cached_input_tokens: 0,
  output_tokens: 0,
  reasoning_output_tokens: 0,
  total_tokens: 0,
});

export function getCodexHome(env = process.env, homeDir = homedir()) {
  return env.CODEX_HOME || join(homeDir, '.codex');
}

export function getDataPaths(codexHome) {
  const dataDir = join(codexHome, 'data', 'discord-task-notifications');
  return {
    dataDir,
    configPath: join(dataDir, 'config.json'),
    jobsDir: join(dataDir, 'jobs'),
    webhookPath: join(dataDir, 'webhook-url'),
  };
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function sanitizeNotifyPayload(rawPayload, now = Date.now()) {
  let parsed;
  try {
    parsed = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
  } catch {
    return null;
  }

  if (!parsed || parsed.type !== 'agent-turn-complete') return null;

  const threadId = nonEmptyString(parsed['thread-id']);
  const turnId = nonEmptyString(parsed['turn-id']);
  if (!threadId || !turnId) return null;

  return {
    schemaVersion: 1,
    createdAt: now,
    threadId,
    turnId,
    cwd: nonEmptyString(parsed.cwd) || process.cwd(),
    lastAssistantMessage: nonEmptyString(parsed['last-assistant-message']) || '',
  };
}

function atomicWritePrivate(path, content) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const tempPath = `${path}.${process.pid}.${randomUUID()}.tmp`;
  writeFileSync(tempPath, content, { mode: 0o600, flag: 'wx' });
  renameSync(tempPath, path);
}

export function enqueueJob(job, {
  codexHome = getCodexHome(),
  scriptPath = SCRIPT_PATH,
  spawnFn = spawn,
} = {}) {
  const { jobsDir } = getDataPaths(codexHome);
  mkdirSync(jobsDir, { recursive: true, mode: 0o700 });
  const jobPath = join(jobsDir, `${job.threadId}-${job.turnId}-${randomUUID()}.json`);
  atomicWritePrivate(jobPath, `${JSON.stringify(job)}\n`);

  try {
    const child = spawnFn(process.execPath, [scriptPath, '--worker', jobPath], {
      detached: true,
      stdio: 'ignore',
    });
    child.on?.('error', () => {
      try { rmSync(jobPath, { force: true }); } catch { /* best effort */ }
    });
    child.unref?.();
  } catch {
    rmSync(jobPath, { force: true });
    return false;
  }

  return true;
}

function readJsonFile(path, fallback = null) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

export function loadConfig(configPath) {
  const raw = readJsonFile(configPath, {});
  const minDurationSeconds = Number(raw?.minDurationSeconds);
  const debounceSeconds = Number(raw?.debounceSeconds);
  return {
    minDurationSeconds: Number.isFinite(minDurationSeconds) && minDurationSeconds >= 0
      ? minDurationSeconds
      : DEFAULT_MIN_DURATION_SECONDS,
    debounceSeconds: Number.isFinite(debounceSeconds) && debounceSeconds >= 0
      ? debounceSeconds
      : DEFAULT_DEBOUNCE_SECONDS,
  };
}

function walkForTranscript(root, suffix, matches) {
  if (!existsSync(root)) return;
  const pending = [root];

  while (pending.length > 0) {
    const current = pending.pop();
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(path);
      } else if (entry.isFile() && entry.name.endsWith(suffix)) {
        matches.push(path);
      }
    }
  }
}

export function findTranscript(codexHome, threadId) {
  if (!/^[A-Za-z0-9-]{8,128}$/u.test(threadId)) return null;
  const matches = [];
  const suffix = `${threadId}.jsonl`;
  walkForTranscript(join(codexHome, 'sessions'), suffix, matches);
  walkForTranscript(join(codexHome, 'archived_sessions'), suffix, matches);
  if (matches.length === 0) return null;

  return matches
    .map((path) => {
      try { return { path, mtimeMs: statSync(path).mtimeMs }; } catch { return null; }
    })
    .filter(Boolean)
    .sort((left, right) => right.mtimeMs - left.mtimeMs)[0]?.path || null;
}

export function readJsonlTail(path, maxBytes = MAX_TRANSCRIPT_BYTES) {
  let fd;
  try {
    fd = openSync(path, 'r');
    const size = fstatSync(fd).size;
    const start = Math.max(0, size - maxBytes);
    const length = size - start;
    const buffer = Buffer.allocUnsafe(length);
    readSync(fd, buffer, 0, length, start);
    let text = buffer.toString('utf8');
    if (start > 0) {
      const firstNewline = text.indexOf('\n');
      text = firstNewline >= 0 ? text.slice(firstNewline + 1) : '';
    }
    return text.split('\n').flatMap((line) => {
      if (!line.trim()) return [];
      try { return [JSON.parse(line)]; } catch { return []; }
    });
  } catch {
    return [];
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function eventType(event) {
  return event?.type === 'event_msg' ? event?.payload?.type : null;
}

function usageFrom(event) {
  if (eventType(event) !== 'token_count') return null;
  const usage = event?.payload?.info?.total_token_usage;
  if (!usage || typeof usage !== 'object') return null;
  return Object.fromEntries(Object.keys(EMPTY_USAGE).map((key) => [
    key,
    Number.isFinite(Number(usage[key])) ? Number(usage[key]) : 0,
  ]));
}

function subtractUsage(end, start) {
  return Object.fromEntries(Object.keys(EMPTY_USAGE).map((key) => [
    key,
    Math.max(0, (end?.[key] || 0) - (start?.[key] || 0)),
  ]));
}

export function analyzeTranscript(events, turnId) {
  const startIndex = events.findIndex((event) => (
    eventType(event) === 'task_started' && event?.payload?.turn_id === turnId
  ));
  if (startIndex < 0) return { complete: false, hasLaterActivity: false };

  const relativeCompleteIndex = events.slice(startIndex).findIndex((event) => (
    eventType(event) === 'task_complete' && event?.payload?.turn_id === turnId
  ));
  if (relativeCompleteIndex < 0) return { complete: false, hasLaterActivity: false };
  const completeIndex = startIndex + relativeCompleteIndex;
  const completeEvent = events[completeIndex];

  let baselineUsage = EMPTY_USAGE;
  for (let index = 0; index < startIndex; index += 1) {
    baselineUsage = usageFrom(events[index]) || baselineUsage;
  }

  let endUsage = baselineUsage;
  for (let index = startIndex; index <= completeIndex; index += 1) {
    endUsage = usageFrom(events[index]) || endUsage;
  }

  let model = '';
  const toolCounts = new Map();
  for (let index = startIndex; index <= completeIndex; index += 1) {
    const event = events[index];
    if (event?.type === 'turn_context' && event?.payload?.turn_id === turnId) {
      model = nonEmptyString(event?.payload?.model) || model;
    }
    if (event?.type === 'response_item' && event?.payload?.type === 'custom_tool_call') {
      const name = nonEmptyString(event?.payload?.name);
      if (name) toolCounts.set(name, (toolCounts.get(name) || 0) + 1);
    }
  }

  const laterEvents = events.slice(completeIndex + 1);
  const hasLaterActivity = laterEvents.some((event) => (
    eventType(event) === 'task_started'
    || eventType(event) === 'user_message'
    || (event?.type === 'turn_context' && event?.payload?.turn_id !== turnId)
  ));

  return {
    complete: true,
    completionTimestamp: completeEvent?.timestamp || null,
    durationMs: Math.max(0, Number(completeEvent?.payload?.duration_ms) || 0),
    hasLaterActivity,
    model,
    tokenUsage: subtractUsage(endUsage, baselineUsage),
    tools: [...toolCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name)),
  };
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function waitForAnalysis(codexHome, job, {
  attempts = 11,
  intervalMs = 500,
} = {}) {
  let transcriptPath = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    transcriptPath ||= findTranscript(codexHome, job.threadId);
    if (transcriptPath) {
      const analysis = analyzeTranscript(readJsonlTail(transcriptPath), job.turnId);
      if (analysis.complete) return { analysis, transcriptPath };
    }
    if (attempt + 1 < attempts) await sleep(intervalMs);
  }
  return { analysis: null, transcriptPath };
}

function runGit(cwd, args) {
  try {
    const result = spawnSync('git', ['-C', cwd, ...args], {
      encoding: 'utf8',
      timeout: 2000,
      windowsHide: true,
    });
    return result.status === 0 ? result.stdout.trim() : '';
  } catch {
    return '';
  }
}

export function resolveProject(cwd) {
  const fallbackProject = basename(resolve(cwd || process.cwd())) || 'unknown';
  const output = runGit(cwd, [
    'rev-parse',
    '--path-format=absolute',
    '--show-toplevel',
    '--git-common-dir',
  ]);
  const [topLevel, commonDir] = output.split(/\r?\n/u);
  if (!topLevel || !commonDir) {
    return { project: fallbackProject, worktree: '', branch: '' };
  }

  const mainRoot = dirname(commonDir);
  return {
    project: basename(mainRoot) || fallbackProject,
    worktree: resolve(topLevel) === resolve(mainRoot) ? '' : basename(topLevel),
    branch: runGit(cwd, ['branch', '--show-current']),
  };
}

export function formatDuration(durationMs) {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function formatCount(value) {
  const count = Math.max(0, Number(value) || 0);
  if (count < 1000) return String(Math.round(count));
  if (count < 1_000_000) return `${(count / 1000).toFixed(count < 10_000 ? 1 : 0)}K`;
  return `${(count / 1_000_000).toFixed(count < 10_000_000 ? 1 : 0)}M`;
}

function clip(value, limit) {
  const text = String(value || '').replace(/\s+/gu, ' ').trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function discordSafe(value, limit) {
  return clip(value, limit).replace(/@/gu, '@\u200b');
}

function inlineCode(value) {
  return `\`${discordSafe(value, 200).replace(/`/gu, "'")}\``;
}

export function formatTokenUsage(usage) {
  if (!usage || (usage.total_tokens || 0) <= 0) return '';
  const parts = [
    `in:${formatCount(usage.input_tokens)}`,
    `out:${formatCount(usage.output_tokens)}`,
  ];
  if (usage.cached_input_tokens > 0) parts.push(`cached:${formatCount(usage.cached_input_tokens)}`);
  if (usage.reasoning_output_tokens > 0) parts.push(`reason:${formatCount(usage.reasoning_output_tokens)}`);
  return parts.join(' ');
}

export function buildDiscordPayload({ job, analysis, projectInfo, now = new Date() }) {
  const duration = formatDuration(analysis.durationMs);
  const title = discordSafe(`✅ ${projectInfo.project} · ${duration}`, 256);
  const fields = [
    { name: 'Project', value: inlineCode(projectInfo.project), inline: true },
  ];

  if (projectInfo.worktree) {
    fields.push({ name: 'Worktree', value: inlineCode(projectInfo.worktree), inline: true });
  }
  if (projectInfo.branch) {
    fields.push({ name: 'Branch', value: inlineCode(projectInfo.branch), inline: true });
  }
  if (analysis.model) {
    fields.push({ name: 'Model', value: inlineCode(analysis.model), inline: true });
  }

  const tokens = formatTokenUsage(analysis.tokenUsage);
  if (tokens) fields.push({ name: 'Tokens', value: tokens, inline: true });

  if (analysis.tools.length > 0) {
    fields.push({
      name: '🛠 Tools',
      value: analysis.tools.slice(0, 8).map(({ name, count }) => (
        inlineCode(`${name.replace(/^mcp__/u, '').replace(/__/gu, ':')}×${count}`)
      )).join(' '),
      inline: false,
    });
  }

  const lastReply = discordSafe(job.lastAssistantMessage, 700);
  if (lastReply) {
    fields.push({ name: '💬 Last reply', value: lastReply, inline: false });
  }

  return {
    username: 'Waddle Dee',
    allowed_mentions: { parse: [] },
    embeds: [{
      author: { name: 'Codex · Task complete' },
      title,
      color: CODEX_GREEN,
      fields,
      footer: { text: 'Codex · notify' },
      timestamp: now.toISOString(),
    }],
  };
}

async function postWebhook(webhookUrl, payload, fetchFn = fetch) {
  try {
    const response = await fetchFn(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function readAndRemoveJob(jobPath) {
  try {
    const raw = readFileSync(jobPath, 'utf8');
    rmSync(jobPath, { force: true });
    const job = JSON.parse(raw);
    if (job?.schemaVersion !== 1 || !job.threadId || !job.turnId) return null;
    if (!Number.isFinite(job.createdAt) || Date.now() - job.createdAt > MAX_JOB_AGE_MS) return null;
    return job;
  } catch {
    try { rmSync(jobPath, { force: true }); } catch { /* best effort */ }
    return null;
  }
}

export async function runWorker(jobPath, {
  codexHome = getCodexHome(),
  fetchFn = fetch,
} = {}) {
  const job = readAndRemoveJob(jobPath);
  if (!job) return false;

  const paths = getDataPaths(codexHome);
  const config = loadConfig(paths.configPath);
  const first = await waitForAnalysis(codexHome, job);
  if (!first.analysis) return false;
  if (first.analysis.durationMs < config.minDurationSeconds * 1000) return false;

  await sleep(config.debounceSeconds * 1000);
  const latest = analyzeTranscript(readJsonlTail(first.transcriptPath), job.turnId);
  if (!latest.complete || latest.hasLaterActivity) return false;

  const webhookUrl = nonEmptyString(readFileSafe(paths.webhookPath));
  if (!webhookUrl) return false;
  const payload = buildDiscordPayload({
    job,
    analysis: latest,
    projectInfo: resolveProject(job.cwd),
  });
  return postWebhook(webhookUrl, payload, fetchFn);
}

function readFileSafe(path) {
  try { return readFileSync(path, 'utf8'); } catch { return ''; }
}

export function checkInstallation(codexHome = getCodexHome()) {
  const paths = getDataPaths(codexHome);
  const webhookUrl = nonEmptyString(readFileSafe(paths.webhookPath));
  let webhookValid = false;
  try {
    const parsed = new URL(webhookUrl || '');
    webhookValid = parsed.protocol === 'https:';
  } catch {
    webhookValid = false;
  }

  return {
    codexHome,
    config: loadConfig(paths.configPath),
    sessionsDirectoryExists: existsSync(join(codexHome, 'sessions')),
    webhookConfigured: Boolean(webhookUrl),
    webhookValid,
  };
}

async function main(argv) {
  if (argv[0] === '--worker') {
    if (argv[1]) await runWorker(argv[1]);
    return;
  }

  if (argv[0] === '--check') {
    const result = checkInstallation();
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.webhookValid && result.sessionsDirectoryExists ? 0 : 1;
    return;
  }

  const rawPayload = argv.at(-1);
  const job = sanitizeNotifyPayload(rawPayload);
  if (job) enqueueJob(job);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(SCRIPT_PATH)) {
  main(process.argv.slice(2)).catch(() => {
    // Notifications are best-effort and must never fail a Codex turn.
    process.exitCode = 0;
  });
}
