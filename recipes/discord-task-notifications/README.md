# Discord Task-Completion Notifications

Three Claude Code hooks that post Discord webhook embeds when a turn takes ≥30s
and you're away from the terminal. Includes per-turn token usage and accurate
USD cost via a per-model pricing catalog (read from disk). Designed for long-running tasks
where you want to step away and get pinged.

## What you get

| Trigger | Color | When | Debounced |
|---|---|---|---|
| Stop hook (task complete) | 🟠 Claude orange | Turn ≥ 30s ends AND no new prompt during debounce window (8s for human turns, 300s for Monitor-driven turns — see [Monitor-aware turn handling](#monitor-aware-turn-handling)) | yes |
| Notification hook (input needed) | 🔴 Red | Claude waiting on you (permission prompt, idle prompt, etc.) | no |
| UserPromptSubmit hook | — | Internal; records prompt timestamps for the Stop hook | — |

Embed fields (Stop hook):

```
[orange bar]
Claude Code · Task complete
✅ my-project · 4m 40s                       ← title: project + duration (shows in mobile push)

Project       Branch      Model         💰 Cost
`my-project`  `main`      `opus-4-7`    **$0.42** · in:1.2K out:3.4K cache_r:8.9K cache_w:175

🛠 Tools
`Bash×8` `Edit×3` `Read×1` `Write×1`

📝 Files
3: foo.py, bar.py, baz.py

(⚠ Stop reason — only on max_tokens / refusal)

💬 Last reply
First 500 chars of Claude's final message...

Claude Code · Stop hook        · 10:54
```

Mobile push notifications render only the embed **title** (fields are
desktop-only), so the title leads with the project name + duration — the
glanceable summary lands on your phone, the full metrics/reply stay in the
fields for the desktop client.

Inside a linked worktree (`claude --worktree`, `claude agents`), `${PWD##*/}`
is a random worktree name (e.g. `bubbly-roaming-star`). Both hooks resolve the
real repo name via `git rev-parse --git-common-dir` for the title, and surface
the worktree leaf in a separate **Worktree** field.

The user's prompt is **never** echoed back to Discord. Keep that local.

## Files

Everything lives under Claude Code's config dir (`$CLAUDE_CONFIG_DIR`, default
`~/.claude`), following its conventions: hook scripts in `hooks/`, recipe data
scoped under `data/discord-task-notifications/`. Nothing is written to the
Claude-owned `cache/` dir, and nothing clutters the config-dir root. Paths below
use `~/.claude` for brevity.

| Path | Role |
|---|---|
| `~/.claude/hooks/discord-start-task.sh` | UserPromptSubmit hook. Records start time + last-prompt time. |
| `~/.claude/hooks/discord-stop-task.sh` | Stop hook. Debounce → parse last turn → cost → Discord. |
| `~/.claude/hooks/discord-notification.sh` | Notification hook. Immediate red embed. |
| `~/.claude/hooks/discord-refresh-pricing.sh` | Helper (not a hook). Refreshes the catalog from LiteLLM. Run by hand or auto-triggered by the Stop hook every 14 days. |
| `~/.claude/data/discord-task-notifications/webhook-url` | Webhook URL, perm 600. Kept out of `settings.json` for tighter perms on shared hosts. |
| `~/.claude/data/discord-task-notifications/mention-id` *(optional)* | Your Discord user ID. When present, the Notification hook prepends `<@ID>` to content — forces mobile push even on muted channels. |
| `~/.claude/data/discord-task-notifications/pricing-catalog.json` | Self-managed per-model price table for the 💰 cost field. Independent of any plugin; ships with this recipe; auto-refreshed. |
| `~/.claude/data/discord-task-notifications/.last-refresh`, `.refresh.lock` | Catalog refresh state + lock (managed automatically). |
| `~/.claude/settings.json` | Registers the three hooks. |

## Install

### 1. Create a Discord webhook URL

Server → channel settings → **Integrations** → **Webhooks** → **New Webhook** →
copy URL. (You need *Manage Channel* permission. A self-only server works fine.)

### 2. Create the directories + save the URL

```bash
CFG="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
DATA="$CFG/data/discord-task-notifications"
mkdir -p "$CFG/hooks" "$DATA"
umask 077
printf '%s' 'https://discord.com/api/webhooks/...' > "$DATA/webhook-url"
```

### 3. Drop the scripts and the price table in place

From this recipe directory:

```bash
# Hook scripts (+ the refresh helper) → hooks/
cp discord-start-task.sh discord-stop-task.sh discord-notification.sh \
   discord-refresh-pricing.sh "$CFG/hooks/"
chmod +x "$CFG"/hooks/discord-*.sh
# Self-managed price table for the cost field (no plugin dependency) → data/
cp pricing-catalog.json "$DATA/pricing-catalog.json"
```

### 4. Register the hooks in `~/.claude/settings.json`

Merge into the existing `hooks` block (don't replace; preserves any plugin hooks):

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/discord-start-task.sh",
            "async": true
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/discord-stop-task.sh",
            "async": true
          }
        ]
      }
    ],
    "Notification": [
      {
        "matcher": "permission_prompt|auth_success|elicitation_dialog|elicitation_response",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/discord-notification.sh",
            "async": true
          }
        ]
      }
    ]
  }
}
```

If the current Claude Code session doesn't pick up the new hooks immediately,
open `/hooks` once — the settings watcher reloads on that menu open.

**Windows (Git Bash):** Windows can't exec a `.sh` directly and `~` isn't
reliably expanded by the hook runner, so wrap each command in `bash` with an
absolute, forward-slash path — same as the `statusLine` command form:

```json
"command": "bash C:/Users/<you>/.claude/hooks/discord-stop-task.sh"
```

Apply the same `bash C:/Users/<you>/.claude/hooks/…` form to all three hooks.
The scripts themselves are identical across platforms; only this registration
line differs. (`jq`, `curl`, and `bash` must be on `PATH` — Git for Windows ships
`bash`/`curl`; install `jq` separately, e.g. `pixi global install jq`.)

### 5. (Optional) Mobile push for "input needed"

```bash
# Discord → User Settings → Advanced → Developer Mode (on)
# Right-click your username → "Copy User ID"
echo 'YOUR_USER_ID' > "$DATA/mention-id"   # $DATA from step 2
chmod 600 "$DATA/mention-id"
```

When this file exists, the Notification hook prepends `<@ID>` to the message
content. Discord mentions force mobile push notifications even on muted
channels — useful for "Claude is waiting on me" alerts.

## How it works

### The anti-noise insight

The naive setup (`Stop hook → curl`) pings on **every** turn end. Painful when
you're actively at the terminal: every "ok" gets a notification.

Two layers solve this:

1. **Threshold**: skip if `elapsed < 30s` (short Q&A doesn't ping).
2. **Debounce**: when Stop fires, sleep N seconds. If `UserPromptSubmit` writes
   a newer timestamp during the sleep (= a new prompt arrived), abort.

Two files in `/tmp/`, both keyed on session_id:

- `claude-task-start-${sid}` — anchors elapsed. Set by `UserPromptSubmit`
  **only for human-typed prompts**; left alone for synthetic injections (see
  next section). Persistent across Stops — overwritten on the next human
  prompt, so it always points at "when the current human turn began."
- `claude-last-prompt-${sid}` — set by `UserPromptSubmit` on **every** prompt
  (human or synthetic). Read by Stop's debounce check.

### Monitor-aware turn handling

Monitor injects each background-task event as a `<task-notification>` user
message with `origin.kind: "task-notification"`. Without filtering, those
reset `task-start` mid-workflow (elapsed wrong) and shrink the `$turn` slice
to just the last event (cost wrong). `discord-start-task.sh` skips them for
`task-start`; the cost parser drops them from `real_user`; and Stop uses a
300s debounce when the last submission was a task-notification so only the
workflow's final Stop fires, with metrics cumulative since the last human
prompt.

### Notification vs Stop — the community consensus

The strongest open-source examples treat **`Notification`** (not `Stop`) as
the right trigger for "ping me when something needs me." `Notification` fires
on a few subtypes — `permission_prompt`, `auth_success`,
`elicitation_dialog`, `elicitation_response`, and `idle_prompt`. The last one
fires every ~2 minutes whenever the user is idle and is almost always noise;
both the recommended matcher (`permission_prompt|auth_success|elicitation_*`)
and the script itself skip `idle_prompt`.

We register both: Stop with debounce (for "long task done") + Notification
narrowed to the real attention signals (for "Claude is blocked waiting on
you").

### Per-turn parsing from the transcript JSONL

The Stop hook reads `~/.claude/projects/<sanitized-cwd>/<session_id>.jsonl`
(path arrives in stdin as `transcript_path`). One `jq` pass extracts:

- last user prompt index (to slice "just this turn")
- last assistant text → 💬 Last reply (truncated to 500 chars)
- model name → Model field + pricing lookup key
- `gitBranch` → Branch field
- `tool_use` names → 🛠 Tools counts (grouped, sorted, top 8)
- `usage.{input,output,cache_read,cache_creation}_tokens` → token totals
- `Edit`/`Write`/`MultiEdit`/`NotebookEdit` `file_path` → 📝 Files
- `stop_reason` → ⚠ field (only on `max_tokens` / `refusal`)

The full transcript can be 70k+ lines; we `tail -n 2000` first to bound
memory + CPU. Per-turn iteration uses one `[$turn[] | select(.type ==
"assistant")] as $ax` binding instead of re-walking the slice 6 times.

### Accurate cost via a self-managed pricing catalog

The Stop hook reads a per-model pricing catalog on disk. Resolution order:

1. `~/.claude/data/discord-task-notifications/pricing-catalog.json` — the
   **self-managed** file shipped with this recipe (`pricing-catalog.json`). This
   is the source of truth; it needs no plugin and is auto-refreshed (below).
2. Fallback: first hit of `~/.claude/plugins/marketplaces/*/shared/pricing-catalog.json`
   (e.g. a plugin that vendors [ccusage](https://github.com/ryoppippi/ccusage)'s
   catalog) — only used if the file above is absent.

The schema is ccusage's `modelPricing` map (in turn sourced from
[LiteLLM](https://github.com/BerriAI/litellm)): keys are model ids, values are
`{input, output, cacheRead, cacheWrite}` in USD per million tokens. The hook
strips a trailing `-YYYYMMDD` from the transcript's model id before lookup, so
dated ids (e.g. `claude-haiku-4-5-20251001`) match the short keys in the
shipped catalog. The shipped seed was verified against
<https://platform.claude.com/docs/en/docs/about-claude/pricing>.

### Keeping the catalog current (auto-refresh)

`discord-refresh-pricing.sh` pulls Anthropic's `claude-*` prices from
[LiteLLM's price feed](https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json)
— the same data ccusage uses — and **merges them over** the existing catalog:
upstream entries win, and any model you added by hand that LiteLLM doesn't list
yet is preserved. Cache prices missing upstream fall back to Anthropic's
documented multipliers (read `0.1×` input, 5-minute write `1.25×` input). Writes
are atomic and validated, so a failed or empty download leaves the current
catalog untouched.

- **Automatic**: the Stop hook checks the last-refresh timestamp
  (`~/.claude/data/discord-task-notifications/.last-refresh`) and, if it's older than 14 days (or
  missing), kicks off the refresh **detached in the background** (`nohup … &`).
  The current turn's notification is never delayed — new prices land for the next
  one. The script self-throttles (skips if a successful refresh ran < 14 days
  ago) and lock-guards against concurrent runs, so the trigger is cheap to fire.
- **Manual**: `bash ~/.claude/hooks/discord-refresh-pricing.sh` (add `--force` to
  bypass the 14-day throttle). Prints a one-line summary to stderr.
- **Brand-new model not in LiteLLM yet**: cost silently falls back to hidden
  (token counts still show). Add a short key by hand to
  `~/.claude/data/discord-task-notifications/pricing-catalog.json`; the next refresh keeps it.

```jq
($catalog.modelPricing[$mfull] // {input:0, output:0, cacheRead:0, cacheWrite:0}) as $pr
| (($tin*$pr.input + $tout*$pr.output + $tcr*$pr.cacheRead + $tcc*$pr.cacheWrite) / 1000000) as $cost
```

Falls back to **zero** (cost field hidden) if no catalog is found or the
model isn't in it. Better than displaying a wrong number — token counts
still show.

## Tunables

| Knob | Location | Default | Effect |
|---|---|---|---|
| Threshold | `DEBOUNCE_HUMAN=8` in `discord-stop-task.sh` | 8s | Wait window for human-typed turn endings |
| Threshold | `DEBOUNCE_TASKNOTIF=300` in `discord-stop-task.sh` | 300s | Wait window for Monitor-driven turn endings — longer so only the workflow's final Stop fires |
| Threshold | `[ "$elapsed" -ge 30 ] \|\| exit 0` | 30s | Lower = more pings, also for short tasks |
| Last-reply length | `clip(500)` | 500 chars | Discord field-value limit is 1024 |
| Tool count cap | `.[:8]` | 8 | Top-N tools shown; rest hidden |
| Token tail window | `tail -n 5000` | 5000 lines | Higher = more transcript history scanned; Monitor-heavy workflows can push the last human prompt past a small window |
| Color | `CLAUDE_ORANGE=14251863` (Stop) / `URGENT_RED=15158332` (Notification) | — | Decimal of `0xRRGGBB` |
| Bot nickname | `--arg username "Waddle Dee"` | "Waddle Dee" | Per-message Discord override |
| Notification matcher | `"matcher": "permission_prompt\|auth_success\|elicitation_dialog\|elicitation_response"` in `settings.json` | (no idle_prompt) | Add `\|idle_prompt` if you actually want the 2-min idle reminders |
| Catalog refresh cadence | `1209600` in both `discord-stop-task.sh` (trigger) and `discord-refresh-pricing.sh` (`MAX_AGE`) | 14 days | How stale the price catalog may get before the Stop hook auto-refreshes it |

## Gotchas

### jq array literal precedence trap

```jq
[ A | gsub | clip(500),  ← element 1 with trailing | ops
  B | sub,               ← element 2 with trailing | op
  C,
  D ]
```

This inflates from 4 to 6 elements at runtime — the comma/pipe interaction
collapses adjacent `| op, … | op` chains. Workaround: wrap each element in
extra `(...)`:

```jq
[ (A | gsub | clip(500)),
  (B | sub),
  C,
  D ]
```

Empirically discovered while debugging field misalignment (Branch field
showed tool counts; Model field showed branch; etc.).

### `@tsv` mishandled tabs

Switched from `[a,b,c,d] | @tsv` to `[a,b,c,d] | join("\n")` because @tsv
splits fields incorrectly when array elements contain (legitimately escaped)
tabs. Newline join is safe because every text field passes through
`gsub("\\s+"; " ")` first, eliminating embedded newlines.

### Cost was 3× too high before ccusage catalog

Hardcoded Opus prices started as `[15, 75, 1.50, 18.75]` (old Opus 4). Opus
4.5 / 4.6 / 4.7 are actually `[5, 25, 0.50, 6.25]`. A current catalog covers all the per-version differences correctly and
refreshes whenever its source plugin updates.

### Cache write 5min vs 1h pricing

The catalog has one `cacheWrite` price (5min TTL). 1-hour cache costs 1.6×
more. The transcript doesn't record which TTL the cache used, so 5min is
assumed. Heavy 1-hour-cache users will see costs underestimated by up to 60%.

### Long-context (>200K) tier pricing

Sonnet 4 charges 2× input/output above 200K context. This catalog
schema doesn't expose `above_200k` fields (ccusage's Rust source does,
from LiteLLM). Not modeled here. Opus 4.5+ pricing is flat across context
sizes, so this only matters if you use Sonnet 4 (legacy).

### Fast mode multiplier

Claude Code "fast mode" costs 6× more on Opus. The transcript doesn't
flag fast vs normal, so fast mode usage shows as standard pricing.

### Windows (Git Bash) — native curl/jq argv + CRLF

These hooks run fine on Windows via Git Bash, but the *native* `curl.exe` and
`jq.exe` introduce four traps the scripts already work around. Keep them in mind
if you edit the scripts:

1. **curl mangles multibyte argv.** Passing the JSON payload as a `-d "$payload"`
   argument corrupts UTF-8 (emoji, `·`) in the Windows argv↔codepage
   translation, so Discord rejects it with `400 {"code":50109}`. Fix: pipe the
   payload over stdin — `printf '%s' "$payload" | curl … --data-binary @-`.
2. **jq.exe emits CRLF.** Every value captured from jq into a shell variable
   gets a trailing `\r`. On `transcript_path` that makes `[ -f "$transcript" ]`
   fail, silently skipping the entire metrics-parsing block (no model / tokens /
   tools / cost — only Project shows). Fix: pipe jq output through `tr -d '\r'`.
3. **`@tsv` doubles backslashes.** jq's `@tsv` escapes `\` → `\\`, so a Windows
   path `C:\Users\…` becomes `C:\\Users\\…` and won't open. Fix: read each field
   with a separate `jq -r` (which keeps single backslashes) instead of one
   `@tsv` row.
4. **Basename stripping needs `\`.** The 📝 Files field stripped directories with
   `sub("^.*/"; "")`, which misses backslash paths and printed full Windows
   paths. Fix: `sub("^.*[/\\\\]"; "")` to split on either separator.

All four fixes are no-ops on macOS/Linux, so the scripts stay cross-platform.

## Why not just shell out to `ccusage`?

`ccusage` aggregates the **entire** session history. The Stop hook needs
**per-turn** attribution (just the slice from the last `user` prompt
forward). Different scope. We reuse ccusage's pricing catalog but compute
the totals ourselves.

## Credits

- ccusage and its pricing approach: https://github.com/ryoppippi/ccusage
- LiteLLM model pricing data: https://github.com/BerriAI/litellm
- `Notification` hook prior art: https://github.com/wyattjoh/claude-code-notification
- Concrete embed-shape reference: https://github.com/book000/dotfiles (`home/dot_claude/scripts/completion-notify/`)
