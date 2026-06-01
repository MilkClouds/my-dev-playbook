#!/usr/bin/env bash
# Notification hook → Discord embed (red, no debounce, fires immediately).
# Claude Code fires this when it actually needs the user (permission prompt,
# idle prompt, auth events). Unlike Stop, this is the "real" attention signal.

# Config dir: honor CLAUDE_CONFIG_DIR if Claude Code's config was relocated.
DATA="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/data/discord-task-notifications"

input=$(cat)
# Skip idle_prompt (fires every ~2 min while idle); other subtypes pass.
notification_type=$(jq -r '.notification_type // ""' <<<"$input")
[ "$notification_type" = "idle_prompt" ] && exit 0

sid=$(jq -r '.session_id // "default"' <<<"$input")
# tr -d '\r': Windows jq.exe emits CRLF, so a trailing \r would otherwise break
# [ -f "$transcript" ] and leave a stray CR in the embed text.
message=$(jq -r '.message // ""' <<<"$input" | tr -d '\r')
title=$(jq -r '.title // "Claude Code needs you"' <<<"$input" | tr -d '\r')
transcript=$(jq -r '.transcript_path // ""' <<<"$input" | tr -d '\r')

url=$(cat "$DATA/webhook-url" 2>/dev/null)
[ -n "$url" ] || exit 0

# Resolve the real project name even inside a linked worktree (claude --worktree,
# claude agents); ${PWD##*/} alone would show the random worktree name instead.
project=${PWD##*/}
worktree=""
# --path-format=absolute so --git-common-dir is absolute even from a subdir.
{ IFS= read -r toplevel; IFS= read -r common; } < <(git rev-parse --path-format=absolute --show-toplevel --git-common-dir 2>/dev/null | tr -d '\r')
if [ -n "$toplevel" ]; then
  main_root=${common%/*}
  project=${main_root##*/}
  [ "$toplevel" != "$main_root" ] && worktree=${toplevel##*/}
fi

body="$message"
[ -z "$body" ] && body="$title"

branch=""
if [ -n "$transcript" ] && [ -f "$transcript" ]; then
  # gitBranch is on virtually every entry; last 50 lines is plenty.
  branch=$(tail -n 50 "$transcript" 2>/dev/null | jq -rs '[.[].gitBranch? // empty] | last // ""' 2>/dev/null | tr -d '\r')
fi

# Optional @mention to force mobile push even if channel is muted.
mention_id=$(cat "$DATA/mention-id" 2>/dev/null || echo "")
content=""
[ -n "$mention_id" ] && content="<@${mention_id}> "

ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
URGENT_RED=15158332  # 0xE74C3C

payload=$(jq -nc \
  --arg username "Waddle Dee" \
  --arg content "$content" \
  --arg title "⛔ $project" \
  --arg desc "$body" \
  --arg worktree "$worktree" \
  --arg branch "$branch" \
  --arg ts "$ts" \
  --argjson color "$URGENT_RED" \
  '{
    username: $username,
    content: $content,
    embeds: [{
      author: {name: "Claude Code · Input needed"},
      title: $title,
      description: $desc,
      color: $color,
      fields: (
        (if $branch != "" then [{name: "Branch", value: ("`" + $branch + "`"), inline: true}] else [] end)
        + (if $worktree != "" then [{name: "Worktree", value: ("`" + $worktree + "`"), inline: true}] else [] end)
      ),
      footer: {text: "Claude Code · Notification hook"},
      timestamp: $ts
    }]
  }')

# Pass the payload over stdin (--data-binary @-), not as a -d argument: on
# Windows the native curl mangles multibyte UTF-8 (emoji, ·) in argv, which
# Discord rejects as invalid JSON. stdin avoids argv entirely. Safe on *nix too.
printf '%s' "$payload" | curl -s -m 10 -H "Content-Type: application/json" --data-binary @- "$url" >/dev/null 2>&1 || true
