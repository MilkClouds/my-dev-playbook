#!/usr/bin/env bash
# Synthetic <task-notification> injections skip task-start (they'd otherwise
# reset the human-turn anchor mid-workflow) but still tick last-prompt.
input=$(cat)
IFS=$'\t' read -r sid is_tasknotif < <(
  jq -r '[.session_id // "default", ((.prompt // "") | startswith("<task-notification>") | tostring)] | @tsv' <<<"$input"
)
now=$(date +%s)
echo "$now" > "/tmp/claude-last-prompt-${sid}"
[ "$is_tasknotif" = "true" ] && exit 0
echo "$now" > "/tmp/claude-task-start-${sid}"
