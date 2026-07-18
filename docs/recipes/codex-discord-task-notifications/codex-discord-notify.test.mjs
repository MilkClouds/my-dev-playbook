import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import test from 'node:test';

import {
  analyzeTranscript,
  buildDiscordPayload,
  formatCount,
  formatDuration,
  formatTokenUsage,
  runWorker,
  sanitizeNotifyPayload,
} from './codex-discord-notify.mjs';

const TURN_ID = 'turn-12345678';

function event(timestamp, type, payload = {}) {
  return { timestamp, type: 'event_msg', payload: { type, ...payload } };
}

function token(timestamp, usage) {
  return event(timestamp, 'token_count', {
    info: { total_token_usage: { total_tokens: 0, ...usage } },
  });
}

const transcript = [
  token('2026-07-18T10:00:00.000Z', {
    input_tokens: 100,
    cached_input_tokens: 40,
    output_tokens: 20,
    reasoning_output_tokens: 5,
    total_tokens: 120,
  }),
  event('2026-07-18T10:01:00.000Z', 'task_started', { turn_id: TURN_ID }),
  {
    timestamp: '2026-07-18T10:01:01.000Z',
    type: 'turn_context',
    payload: { turn_id: TURN_ID, model: 'gpt-5.6-codex' },
  },
  {
    timestamp: '2026-07-18T10:01:02.000Z',
    type: 'response_item',
    payload: { type: 'custom_tool_call', name: 'exec' },
  },
  {
    timestamp: '2026-07-18T10:01:03.000Z',
    type: 'response_item',
    payload: { type: 'custom_tool_call', name: 'exec' },
  },
  {
    timestamp: '2026-07-18T10:01:04.000Z',
    type: 'response_item',
    payload: { type: 'custom_tool_call', name: 'apply_patch' },
  },
  token('2026-07-18T10:01:34.000Z', {
    input_tokens: 1500,
    cached_input_tokens: 900,
    output_tokens: 320,
    reasoning_output_tokens: 80,
    total_tokens: 1820,
  }),
  event('2026-07-18T10:01:35.000Z', 'task_complete', {
    turn_id: TURN_ID,
    duration_ms: 35_000,
  }),
];

test('sanitizeNotifyPayload keeps only the fields needed by the worker', () => {
  const job = sanitizeNotifyPayload(JSON.stringify({
    type: 'agent-turn-complete',
    'thread-id': 'thread-12345678',
    'turn-id': TURN_ID,
    cwd: '/work/project',
    'input-messages': ['secret user prompt'],
    'last-assistant-message': 'Done.',
  }), 1234);

  assert.deepEqual(job, {
    schemaVersion: 1,
    createdAt: 1234,
    threadId: 'thread-12345678',
    turnId: TURN_ID,
    cwd: '/work/project',
    lastAssistantMessage: 'Done.',
  });
  assert.equal(JSON.stringify(job).includes('secret user prompt'), false);
});

test('sanitizeNotifyPayload rejects other event types and malformed payloads', () => {
  assert.equal(sanitizeNotifyPayload('{}'), null);
  assert.equal(sanitizeNotifyPayload('not-json'), null);
  assert.equal(sanitizeNotifyPayload(JSON.stringify({
    type: 'agent-turn-complete',
    'thread-id': 'thread-12345678',
  })), null);
});

test('analyzeTranscript returns per-turn deltas, model, tools, and duration', () => {
  const result = analyzeTranscript(transcript, TURN_ID);
  assert.equal(result.complete, true);
  assert.equal(result.durationMs, 35_000);
  assert.equal(result.model, 'gpt-5.6-codex');
  assert.deepEqual(result.tokenUsage, {
    input_tokens: 1400,
    cached_input_tokens: 860,
    output_tokens: 300,
    reasoning_output_tokens: 75,
    total_tokens: 1700,
  });
  assert.deepEqual(result.tools, [
    { name: 'exec', count: 2 },
    { name: 'apply_patch', count: 1 },
  ]);
  assert.equal(result.hasLaterActivity, false);
});

test('analyzeTranscript detects a new turn during the debounce window', () => {
  const withNextTurn = [
    ...transcript,
    event('2026-07-18T10:01:40.000Z', 'task_started', { turn_id: 'turn-next-1234' }),
  ];
  assert.equal(analyzeTranscript(withNextTurn, TURN_ID).hasLaterActivity, true);
});

test('formatters keep mobile-facing values compact', () => {
  assert.equal(formatDuration(35_000), '35s');
  assert.equal(formatDuration(280_000), '4m 40s');
  assert.equal(formatDuration(3_750_000), '1h 2m');
  assert.equal(formatCount(950), '950');
  assert.equal(formatCount(1_250), '1.3K');
  assert.equal(formatCount(12_500), '13K');
  assert.equal(formatTokenUsage({
    input_tokens: 1400,
    cached_input_tokens: 860,
    output_tokens: 300,
    reasoning_output_tokens: 75,
    total_tokens: 1700,
  }), 'in:1.4K out:300 cached:860 reason:75');
});

test('Discord payload includes completion data but never the user prompt', () => {
  const job = sanitizeNotifyPayload(JSON.stringify({
    type: 'agent-turn-complete',
    'thread-id': 'thread-12345678',
    'turn-id': TURN_ID,
    cwd: '/work/project',
    'input-messages': ['do not leak this'],
    'last-assistant-message': 'Finished @everyone.',
  }), 1234);
  const payload = buildDiscordPayload({
    job,
    analysis: analyzeTranscript(transcript, TURN_ID),
    projectInfo: { project: 'project', worktree: '', branch: 'main' },
    now: new Date('2026-07-18T10:02:00.000Z'),
  });
  const serialized = JSON.stringify(payload);
  assert.equal(serialized.includes('do not leak this'), false);
  assert.equal(serialized.includes('@everyone'), false);
  assert.equal(serialized.includes('Codex · Task complete'), true);
  assert.equal(payload.allowed_mentions.parse.length, 0);
});

test('worker follows the full transcript-to-webhook path with a fake fetch', async () => {
  const root = mkdtempSync(join(tmpdir(), 'codex-discord-test-'));
  const threadId = 'thread-12345678';
  const sessionsDir = join(root, 'sessions', '2026', '07', '18');
  const dataDir = join(root, 'data', 'discord-task-notifications');
  const jobsDir = join(dataDir, 'jobs');
  mkdirSync(sessionsDir, { recursive: true });
  mkdirSync(jobsDir, { recursive: true });
  writeFileSync(
    join(sessionsDir, `rollout-${threadId}.jsonl`),
    `${transcript.map((entry) => JSON.stringify(entry)).join('\n')}\n`,
  );
  writeFileSync(join(dataDir, 'webhook-url'), 'https://discord.example.test/webhook');
  writeFileSync(join(dataDir, 'config.json'), JSON.stringify({
    minDurationSeconds: 0,
    debounceSeconds: 0,
  }));
  const jobPath = join(jobsDir, 'job.json');
  writeFileSync(jobPath, JSON.stringify({
    schemaVersion: 1,
    createdAt: Date.now(),
    threadId,
    turnId: TURN_ID,
    cwd: root,
    lastAssistantMessage: 'Done.',
  }));

  const requests = [];
  const sent = await runWorker(jobPath, {
    codexHome: root,
    fetchFn: async (url, options) => {
      requests.push({ url, body: JSON.parse(options.body) });
      return { ok: true };
    },
  });

  assert.equal(sent, true);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://discord.example.test/webhook');
  assert.equal(requests[0].body.embeds[0].title, `✅ ${basename(root)} · 35s`);
  assert.equal(requests[0].body.embeds[0].fields.some((field) => field.name === 'Tokens'), true);
  rmSync(root, { recursive: true, force: true });
});
