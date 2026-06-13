#!/usr/bin/env bash
# Synthetic <task-notification> injections skip task-start (they'd otherwise
# reset the human-turn anchor mid-workflow) but still tick last-prompt.
input=$(cat)
# One jq emitting each field on its own line (not @tsv, which doubles backslashes
# in Windows paths and whose trailing field carries jq.exe's CRLF); strip CR once.
{ IFS= read -r sid; IFS= read -r is_tasknotif; } < <(
  jq -r '(.session_id // "default"),
         ((.prompt // "") | startswith("<task-notification>"))' <<<"$input" | tr -d '\r')
now=$(date +%s)
echo "$now" > "/tmp/claude-last-prompt-${sid}"
[ "$is_tasknotif" = "true" ] && exit 0
echo "$now" > "/tmp/claude-task-start-${sid}"
