#!/usr/bin/env bash
# Notification hook → Discord embed (red, no debounce, fires immediately).
# Claude Code fires this when it actually needs the user (permission prompt,
# idle prompt, auth events). Unlike Stop, this is the "real" attention signal.
input=$(cat)
sid=$(jq -r '.session_id // "default"' <<<"$input")
message=$(jq -r '.message // ""' <<<"$input")
title=$(jq -r '.title // "Claude Code needs you"' <<<"$input")
transcript=$(jq -r '.transcript_path // ""' <<<"$input")

url=$(cat ~/.claude/discord-webhook-url 2>/dev/null)
[ -n "$url" ] || exit 0

dir=$(basename "$PWD")
branch=""
if [ -n "$transcript" ] && [ -f "$transcript" ]; then
  # gitBranch is on virtually every entry; last 50 lines is plenty.
  branch=$(tail -n 50 "$transcript" 2>/dev/null | jq -rs '[.[].gitBranch? // empty] | last // ""' 2>/dev/null)
fi

# Optional @mention to force mobile push even if channel is muted.
mention_id=$(cat ~/.claude/discord-mention-id 2>/dev/null || echo "")
content=""
[ -n "$mention_id" ] && content="<@${mention_id}> "

ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
URGENT_RED=15158332  # 0xE74C3C

payload=$(jq -nc \
  --arg username "Waddle Dee" \
  --arg content "$content" \
  --arg title "$title" \
  --arg desc "$message" \
  --arg dir "$dir" \
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
        [{name: "Directory", value: ("`" + $dir + "`"), inline: true}]
        + (if $branch != "" then [{name: "Branch", value: ("`" + $branch + "`"), inline: true}] else [] end)
      ),
      footer: {text: "Claude Code · Notification hook"},
      timestamp: $ts
    }]
  }')

curl -s -m 10 -H "Content-Type: application/json" -d "$payload" "$url" >/dev/null 2>&1 || true
