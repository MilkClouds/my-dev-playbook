#!/usr/bin/env bash
# UserPromptSubmit hook: record start time (consumed by Stop's elapsed check)
# AND a persistent "last prompt time" (read by Stop's debounce check — not
# removed, so a debouncing Stop hook can detect a new prompt after it fired).
sid=$(jq -r '.session_id // "default"')
now=$(date +%s)
echo "$now" > "/tmp/claude-task-start-${sid}"
echo "$now" > "/tmp/claude-last-prompt-${sid}"
