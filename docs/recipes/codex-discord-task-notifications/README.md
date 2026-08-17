# Codex Discord Task-Completion Notifications

A self-contained Codex `notify` handler that posts a Discord embed when a turn takes at least 30 seconds and no new turn starts during an 8-second debounce. It uses Node.js built-ins only: no npm package, `jq`, `curl`, Claude plugin, ccusage-worv, or Oh My Codex dependency.

Codex currently invokes `notify` for `agent-turn-complete`. The JSON payload is passed as the final command-line argument. This recipe deliberately discards `input-messages`; user prompts are never copied into a job or sent to Discord.

## What the notification contains

- Project, linked-worktree name, and branch when Git is available
- Turn duration and model
- Per-turn input, output, cached-input, and reasoning token deltas
- Tool-call counts
- The final assistant reply, clipped to fit a Discord embed

The Discord title starts with the project and duration so mobile push previews remain useful. Cost is intentionally omitted: the handler has no pricing feed or third-party runtime dependency.

## Files

| Path | Role |
|---|---|
| `~/.codex/hooks/codex-discord-notify.mjs` | Fast `notify` entry point and detached worker |
| `~/.codex/data/discord-task-notifications/webhook-url` | Discord webhook URL, mode 600 |
| `~/.codex/data/discord-task-notifications/config.json` | Optional threshold/debounce overrides |
| `~/.codex/data/discord-task-notifications/jobs/` | Mode-600 one-shot jobs, removed as workers start |
| `~/.codex/config.toml` | Registers the handler in top-level `notify` |

## Install

Create a Discord webhook under Server → Channel Settings → Integrations → Webhooks, then run from this recipe directory:

```bash
CODEX_DIR="${CODEX_HOME:-$HOME/.codex}"
DATA="$CODEX_DIR/data/discord-task-notifications"
mkdir -p "$CODEX_DIR/hooks" "$DATA"
install -m 755 codex-discord-notify.mjs "$CODEX_DIR/hooks/codex-discord-notify.mjs"
umask 077
printf '%s' 'https://discord.com/api/webhooks/...' > "$DATA/webhook-url"
```

Find Node's absolute path with `command -v node`, then set the top-level entry in `~/.codex/config.toml` before the first `[section]`:

```toml
notify = ["/absolute/path/to/node", "/home/you/.codex/hooks/codex-discord-notify.mjs"]
```

Codex supports one top-level `notify` command. Replace the previous value; do not chain this handler through another tool. Independent lifecycle automation belongs in `~/.codex/hooks.json` or an inline `[hooks]` table.

Validate the installation without sending a Discord message:

```bash
node "$CODEX_DIR/hooks/codex-discord-notify.mjs" --check
```

Run the unit tests from the recipe directory:

```bash
node --test codex-discord-notify.test.mjs
```

## Optional tuning

Create `~/.codex/data/discord-task-notifications/config.json`:

```json
{
  "minDurationSeconds": 30,
  "debounceSeconds": 8
}
```

Set either value to `0` while testing. The webhook request is still detached from Codex and has a 10-second timeout.

## How debounce and transcript parsing work

The `notify` entry point returns immediately after writing a sanitized mode-600 job and detaching a Node worker. The worker waits briefly for Codex to flush the matching `task_complete` event, reads a bounded tail of the session JSONL, and uses the matching `turn-id` to calculate duration, token deltas, model, and tool counts. After the debounce, it rereads the transcript and suppresses the alert if a later `task_started`, `user_message`, or different `turn_context` appeared.

The transcript format is not a stable Codex hook interface. Parsing failure is therefore fail-closed: no partial or misleading notification is sent, and a Codex turn is never failed by the handler.
