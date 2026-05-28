# Discord Task-Completion Notifications

Three Claude Code hooks that post Discord webhook embeds when a turn takes ≥30s
and you're away from the terminal. Includes per-turn token usage and accurate
USD cost via a per-model pricing catalog (read from disk). Designed for long-running tasks
where you want to step away and get pinged.

## What you get

| Trigger | Color | When | Debounced |
|---|---|---|---|
| Stop hook (task complete) | 🟠 Claude orange | Turn ≥ 30s ends AND no new prompt within 8s | yes |
| Notification hook (input needed) | 🔴 Red | Claude waiting on you (permission prompt, idle prompt, etc.) | no |
| UserPromptSubmit hook | — | Internal; records start time for the Stop hook | — |

Embed fields (Stop hook):

```
[orange bar]
Claude Code · Task complete
✅ 4m 40s

Directory     Branch      Model         💰 Cost
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

The user's prompt is **never** echoed back to Discord. Keep that local.

## Files

| Path | Role |
|---|---|
| `~/.claude/discord-webhook-url` | Webhook URL, perm 600. Separate from `settings.json` for tighter perms on shared hosts. |
| `~/.claude/discord-mention-id` *(optional)* | Your Discord user ID. When present, the Notification hook prepends `<@ID>` to content — forces mobile push even on muted channels. |
| `~/.claude/start-task-hook.sh` | UserPromptSubmit hook. Records start time + last-prompt time. |
| `~/.claude/stop-task-hook.sh` | Stop hook. Debounce → parse last turn → ccusage cost → Discord. |
| `~/.claude/notification-hook.sh` | Notification hook. Immediate red embed. |
| `~/.claude/settings.json` | Registers the three hooks. |

## Install

### 1. Create a Discord webhook URL

Server → channel settings → **Integrations** → **Webhooks** → **New Webhook** →
copy URL. (You need *Manage Channel* permission. A self-only server works fine.)

### 2. Save the URL

```bash
umask 077
printf '%s' 'https://discord.com/api/webhooks/...' > ~/.claude/discord-webhook-url
```

### 3. Drop the hook scripts in place

From this recipe directory:

```bash
cp start-task-hook.sh stop-task-hook.sh notification-hook.sh ~/.claude/
chmod +x ~/.claude/{start,stop,notification}-task-hook.sh
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
            "command": "~/.claude/start-task-hook.sh",
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
            "command": "~/.claude/stop-task-hook.sh",
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
            "command": "~/.claude/notification-hook.sh",
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

### 5. (Optional) Mobile push for "input needed"

```bash
# Discord → User Settings → Advanced → Developer Mode (on)
# Right-click your username → "Copy User ID"
echo 'YOUR_USER_ID' > ~/.claude/discord-mention-id
chmod 600 ~/.claude/discord-mention-id
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
2. **Debounce**: when Stop fires, sleep 8s. If `UserPromptSubmit` writes a
   newer timestamp during the sleep (= you typed a follow-up), abort.

Both files in `/tmp/`:

- `claude-task-start-${session_id}` — written by UserPromptSubmit, consumed
  (`rm`'d) by Stop's elapsed check.
- `claude-last-prompt-${session_id}` — written by UserPromptSubmit, read by
  Stop's debounce check. Cleaned up after the Stop hook sends a notification.

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

### Accurate cost via a local pricing catalog

The Stop hook expects a per-model pricing catalog on disk, glob-matched at
`~/.claude/plugins/marketplaces/*/shared/pricing-catalog.json`. The schema is
the one used by [ccusage](https://github.com/ryoppippi/ccusage) (in turn
sourced from [LiteLLM](https://github.com/BerriAI/litellm)) — any Claude Code
plugin that ships that file will work; first match wins.

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
| Threshold | `DEBOUNCE_SECS=8` in `stop-task-hook.sh` | 8s | Higher = quieter, more latency |
| Threshold | `[ "$elapsed" -ge 30 ] \|\| exit 0` | 30s | Lower = more pings, also for short tasks |
| Last-reply length | `clip(500)` | 500 chars | Discord field-value limit is 1024 |
| Tool count cap | `.[:8]` | 8 | Top-N tools shown; rest hidden |
| Token tail window | `tail -n 2000` | 2000 lines | Higher = more transcript history scanned |
| Color | `CLAUDE_ORANGE=14251863` (Stop) / `URGENT_RED=15158332` (Notification) | — | Decimal of `0xRRGGBB` |
| Bot nickname | `--arg username "Waddle Dee"` | "Waddle Dee" | Per-message Discord override |
| Notification matcher | `"matcher": "permission_prompt\|auth_success\|elicitation_dialog\|elicitation_response"` in `settings.json` | (no idle_prompt) | Add `\|idle_prompt` if you actually want the 2-min idle reminders |

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
