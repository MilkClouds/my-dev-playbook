#!/usr/bin/env bash
# Stop hook → Discord embed when:
#   1. elapsed >= 60s (long task), AND
#   2. user did not submit a new prompt during a short debounce window
#      (= they're not actively at the terminal).
# Intentionally never includes the user's own prompt — keep that local.

DEBOUNCE_SECS=8

input=$(cat)
IFS=$'\t' read -r sid stop_active transcript < <(
  jq -r '[.session_id // "default", (.stop_hook_active // false | tostring), .transcript_path // ""] | @tsv' <<<"$input"
)

# Avoid recursive Stop loops (when our hook itself triggers another Stop).
[ "$stop_active" = "true" ] && exit 0

f="/tmp/claude-task-start-${sid}"
[ -f "$f" ] || exit 0
start=$(cat "$f")
rm -f "$f"
elapsed=$(( $(date +%s) - start ))
[ "$elapsed" -ge 60 ] || exit 0

# Debounce: sleep, then bail if a new UserPromptSubmit landed after we fired.
stop_time=$(date +%s)
sleep "$DEBOUNCE_SECS"
last_prompt=$(cat "/tmp/claude-last-prompt-${sid}" 2>/dev/null || echo 0)
[ "$last_prompt" -gt "$stop_time" ] && exit 0
rm -f "/tmp/claude-last-prompt-${sid}"

url=$(cat ~/.claude/discord-webhook-url 2>/dev/null)
[ -n "$url" ] || exit 0

dir=$(basename "$PWD")
duration=$(printf '%dm %ds' $((elapsed / 60)) $((elapsed % 60)))
ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# All transcript-derived fields in one jq pass over the last ~2000 lines.
# Slurping the full file is multi-second on long sessions; the last turn is
# always near the tail. 2000 lines covers many tool-heavy turns.
last_ai=""; model=""; branch=""; tools_value=""
tokens_str=""; cost_str=""; files_str=""; stop_reason=""
if [ -n "$transcript" ] && [ -f "$transcript" ]; then
  # Use ccusage-worv pricing catalog if installed (~/.claude/plugins/...).
  # That catalog tracks per-model prices accurately (Opus 4.7 = $5/$25/M,
  # not the old Opus 4 = $15/$75). Falls back to 0 if catalog missing or
  # model unknown, so cost just hides instead of being misleading.
  CATALOG=
  for c in ~/.claude/plugins/marketplaces/*/shared/pricing-catalog.json; do
    [ -f "$c" ] && CATALOG=$c && break
  done
  catalog_json=$(cat "$CATALOG" 2>/dev/null)
  [ -z "$catalog_json" ] && catalog_json='{"modelPricing":{}}'
  # gsub removes any embedded newlines from text fields, so each field is
  # one line in jq output. Each element wrapped in extra parens to dodge
  # jq comma/pipe precedence which otherwise inflates the array length.
  parsed=$(tail -n 2000 "$transcript" 2>/dev/null | jq -sr \
    --argjson catalog "$catalog_json" '
    def real_user($e):
      ($e.type == "user")
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
    | ($catalog.modelPricing[$mfull] // {input:0, output:0, cacheRead:0, cacheWrite:0}) as $pr
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
              elif $n <= 5 then "\($n): " + (map(sub("^.*/"; "")) | join(", "))
              else "\($n) files modified" end)),
        (([$ax[] | .message.stop_reason? // empty] | last // "")
         | if . == "max_tokens" or . == "refusal" then . else "" end)
      ] | join("\n")
  ' 2>/dev/null)
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
fi

CLAUDE_ORANGE=14251863  # 0xD97757

payload=$(jq -nc \
  --arg username "Waddle Dee" \
  --arg title "✅ $duration" \
  --arg dir "$dir" \
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
        [{name: "Directory", value: ("`" + $dir + "`"), inline: true}]
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

curl -s -m 10 -H "Content-Type: application/json" -d "$payload" "$url" >/dev/null 2>&1 || true
