#!/usr/bin/env bash
# Stop hook → Discord embed when elapsed >= 30s and no new prompt during
# debounce. Monitor-driven turns use a long debounce so only the final Stop
# (after the workflow quiets down) notifies, with cumulative metrics.

DEBOUNCE_HUMAN=8
DEBOUNCE_TASKNOTIF=300

# Config dir: honor CLAUDE_CONFIG_DIR if Claude Code's config was relocated.
CFG="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
DATA="$CFG/data/discord-task-notifications"

input=$(cat)
# One jq emitting each field on its own line (not @tsv, which doubles backslashes
# in Windows paths — breaking [ -f "$transcript" ] — and whose trailing field
# carries jq.exe's CRLF); strip CR once. Harmless on *nix.
{ IFS= read -r sid; IFS= read -r stop_active; IFS= read -r transcript; } < <(
  jq -r '(.session_id // "default"),
         (.stop_hook_active // false),
         (.transcript_path // "")' <<<"$input" | tr -d '\r')

# Avoid recursive Stop loops (when our hook itself triggers another Stop).
[ "$stop_active" = "true" ] && exit 0

f="/tmp/claude-task-start-${sid}"
[ -f "$f" ] || exit 0
start=$(cat "$f")
elapsed=$(( $(date +%s) - start ))
[ "$elapsed" -ge 30 ] || exit 0

DEBOUNCE_SECS=$DEBOUNCE_HUMAN
if [ -n "$transcript" ] && [ -f "$transcript" ]; then
  last_origin=$(tail -n 200 "$transcript" 2>/dev/null | jq -sr '
    [.[] | select(.type == "user")] | last | .origin?.kind? // ""' 2>/dev/null | tr -d '\r')
  [ "$last_origin" = "task-notification" ] && DEBOUNCE_SECS=$DEBOUNCE_TASKNOTIF
fi

# Debounce: sleep, then bail if any new prompt (real or synthetic) landed.
stop_time=$(date +%s)
sleep "$DEBOUNCE_SECS"
last_prompt=$(cat "/tmp/claude-last-prompt-${sid}" 2>/dev/null || echo 0)
[ "$last_prompt" -gt "$stop_time" ] && exit 0

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
duration=$(printf '%dm %ds' $((elapsed / 60)) $((elapsed % 60)))
ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# All transcript-derived fields in one jq pass; tail bounds memory + CPU.
last_ai=""; model=""; branch=""; tools_value=""
tokens_str=""; cost_str=""; files_str=""; stop_reason=""
if [ -n "$transcript" ] && [ -f "$transcript" ]; then
  # Lightweight auto-refresh: if our self-managed catalog hasn't had a successful
  # refresh in 14 days (or never), kick off a detached background update from
  # LiteLLM. Non-blocking — this turn uses the current file; new prices land next
  # time. No-op if the refresh script isn't installed.
  REFRESH="$CFG/hooks/discord-refresh-pricing.sh"
  if [ -f "$REFRESH" ]; then
    last_refresh=$(cat "$DATA/.last-refresh" 2>/dev/null | tr -dc 0-9)
    # 1209600s = 14 days; keep in sync with MAX_AGE in discord-refresh-pricing.sh.
    if [ -z "$last_refresh" ] || [ $(( $(date +%s) - last_refresh )) -ge 1209600 ]; then
      nohup bash "$REFRESH" >/dev/null 2>&1 &
      disown 2>/dev/null || true
    fi
  fi

  # Pricing catalog: our self-managed file first (independent of any plugin),
  # then fall back to a ccusage-style catalog shipped under marketplaces/*/shared.
  # Schema = ccusage (github.com/ryoppippi/ccusage). Missing → cost hides.
  CATALOG="$DATA/pricing-catalog.json"
  if [ ! -f "$CATALOG" ]; then
    CATALOG=
    for c in "$CFG"/plugins/marketplaces/*/shared/pricing-catalog.json; do
      [ -f "$c" ] && CATALOG=$c && break
    done
  fi
  catalog_json=$(cat "$CATALOG" 2>/dev/null)
  [ -z "$catalog_json" ] && catalog_json='{"modelPricing":{}}'
  # real_user excludes <task-notification> so $turn anchors at the human prompt.
  parsed=$(tail -n 5000 "$transcript" 2>/dev/null | jq -sr \
    --argjson catalog "$catalog_json" '
    def real_user($e):
      ($e.type == "user")
      and (($e.origin?.kind? // "") != "task-notification")
      and (($e.message?.content?) as $c
           | $c != null
             and (($c|type) == "string"
                  or (($c|type) == "array" and any($c[]?; .type? == "text"))));
    def clip($n): if length > $n then .[:$n] + "…" else . end;
    def fmt_usd: if . < 1 then ("$" + ((. * 10000 | round) / 10000 | tostring))
                 else ("$" + ((. * 100 | round) / 100 | tostring)) end;
    def hum: if . < 1000 then tostring
             elif . < 1000000 then ((. * 10 / 1000 | round) / 10 | tostring) + "K"
             else ((. * 10 / 1000000 | round) / 10 | tostring) + "M" end;
    . as $all
    | ([range(0; length) | select(real_user($all[.]))] | last // null) as $idx
    | (if $idx == null then [] else $all[$idx:] end) as $turn
    | ([$turn[] | select(.type == "assistant")]) as $ax
    | (([$ax[] | .message.model? // empty] | last // "")) as $mfull
    | ([$ax[] | .message.usage]) as $u
    | (([$u[] | .input_tokens // 0]            | add // 0)) as $tin
    | (([$u[] | .output_tokens // 0]           | add // 0)) as $tout
    | (([$u[] | .cache_read_input_tokens // 0] | add // 0)) as $tcr
    | (([$u[] | .cache_creation_input_tokens // 0] | add // 0)) as $tcc
    | (($mfull | sub("-[0-9]{8}$"; "")) as $mkey
       | $catalog.modelPricing[$mfull] // $catalog.modelPricing[$mkey]
         // {input:0, output:0, cacheRead:0, cacheWrite:0}) as $pr
    | (($tin*$pr.input + $tout*$pr.output + $tcr*$pr.cacheRead + $tcc*$pr.cacheWrite) / 1000000) as $cost
    | [
        (([$ax[] | .message.content[]?
          | select(.type == "text") | .text] | last // "")
          | gsub("\\s+"; " ") | clip(500)),
        ($mfull | sub("^claude-"; "")),
        ([$turn[] | .gitBranch? // empty] | last // ""),
        ([$ax[] | .message.content[]?
          | select(.type == "tool_use") | .name]
         | group_by(.) | map({name: .[0], count: length}) | sort_by(-.count) | .[:8]
         | map("`" + (.name | gsub("^mcp__"; "") | gsub("__"; ":")) + "×" + (.count|tostring) + "`")
         | join(" ")),
        (if ($tin + $tout + $tcr + $tcc) == 0 then ""
         else "in:\($tin | hum) out:\($tout | hum)"
              + (if $tcr > 0 then " cache_r:\($tcr | hum)" else "" end)
              + (if $tcc > 0 then " cache_w:\($tcc | hum)" else "" end)
         end),
        (if $cost == 0 then "" else ($cost | fmt_usd) end),
        ([$ax[] | .message.content[]?
          | select(.type == "tool_use" and ((.name == "Edit") or (.name == "Write")
                                            or (.name == "MultiEdit") or (.name == "NotebookEdit")))
          | .input.file_path? // empty]
         | unique
         | (length as $n
            | if   $n == 0 then ""
              elif $n <= 5 then "\($n): " + (map(sub("^.*[/\\\\]"; "")) | join(", "))
              else "\($n) files modified" end)),
        (([$ax[] | .message.stop_reason? // empty] | last // "")
         | if . == "max_tokens" or . == "refusal" then . else "" end)
      ] | join("\n")
  ' 2>/dev/null | tr -d '\r')
  {
    IFS= read -r last_ai
    IFS= read -r model
    IFS= read -r branch
    IFS= read -r tools_value
    IFS= read -r tokens_str
    IFS= read -r cost_str
    IFS= read -r files_str
    IFS= read -r stop_reason
  } <<<"$parsed"

  # Cache-miss refresh: tokens but no cost ⇒ this turn's model isn't in the
  # catalog yet (e.g. a model released since the last refresh). Kick a background
  # refresh, throttled to once a day — separate from the 14-day schedule above so
  # cost recovers within a turn or two of a new model's launch, while a model
  # LiteLLM hasn't published yet doesn't retrigger every turn. --force bypasses
  # the refresher's own 14-day skip; the day guard here bounds the retries.
  if [ -f "$REFRESH" ] && [ -n "$tokens_str" ] && [ -z "$cost_str" ] && [ -n "$model" ]; then
    last_refresh=$(cat "$DATA/.last-refresh" 2>/dev/null | tr -dc 0-9)
    if [ -z "$last_refresh" ] || [ $(( $(date +%s) - last_refresh )) -ge 86400 ]; then
      nohup bash "$REFRESH" --force >/dev/null 2>&1 &
      disown 2>/dev/null || true
    fi
  fi
fi

# Mobile push shows only the title (fields are desktop-only), so the title
# carries the project + duration for a glanceable summary.
status="✅"
[ -n "$stop_reason" ] && status="⚠️"
title="$status $project · $duration"

CLAUDE_ORANGE=14251863  # 0xD97757

payload=$(jq -nc \
  --arg username "Waddle Dee" \
  --arg title "$title" \
  --arg project "$project" \
  --arg worktree "$worktree" \
  --arg branch "$branch" \
  --arg model "$model" \
  --arg tools "$tools_value" \
  --arg tokens "$tokens_str" \
  --arg cost "$cost_str" \
  --arg files "$files_str" \
  --arg stop_reason "$stop_reason" \
  --arg ai "$last_ai" \
  --arg ts "$ts" \
  --argjson color "$CLAUDE_ORANGE" \
  '{
    username: $username,
    embeds: [{
      author: {name: "Claude Code · Task complete"},
      title: $title,
      color: $color,
      fields: (
        [{name: "Project", value: ("`" + $project + "`"), inline: true}]
        + (if $worktree != "" then [{name: "Worktree", value: ("`" + $worktree + "`"), inline: true}] else [] end)
        + (if $branch != "" then [{name: "Branch", value: ("`" + $branch + "`"), inline: true}] else [] end)
        + (if $model  != "" then [{name: "Model",  value: ("`" + $model  + "`"), inline: true}] else [] end)
        + (if ($cost != "" or $tokens != "")
             then [{name: "💰 Cost",
                    value: ((if $cost != "" then "**\($cost)**" else "" end)
                            + (if $cost != "" and $tokens != "" then " · " else "" end)
                            + (if $tokens != "" then $tokens else "" end)),
                    inline: true}]
             else [] end)
        + (if $tools  != "" then [{name: "🛠 Tools",     value: $tools, inline: false}] else [] end)
        + (if $files  != "" then [{name: "📝 Files",     value: $files, inline: false}] else [] end)
        + (if $stop_reason != "" then [{name: "⚠ Stop reason", value: ("`" + $stop_reason + "`"), inline: false}] else [] end)
        + (if $ai     != "" then [{name: "💬 Last reply", value: $ai,    inline: false}] else [] end)
      ),
      footer: {text: "Claude Code · Stop hook"},
      timestamp: $ts
    }]
  }')

# Pass the payload over stdin (--data-binary @-), not as a -d argument: on
# Windows the native curl mangles multibyte UTF-8 (emoji, ·) in argv, which
# Discord rejects as invalid JSON. stdin avoids argv entirely. Safe on *nix too.
printf '%s' "$payload" | curl -s -m 10 -H "Content-Type: application/json" --data-binary @- "$url" >/dev/null 2>&1 || true
