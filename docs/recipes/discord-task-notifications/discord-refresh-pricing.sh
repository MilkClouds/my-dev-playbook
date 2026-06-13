#!/usr/bin/env bash
# Refresh the Discord cost catalog from LiteLLM's model price data (the same
# source ccusage uses). Merges UPSTREAM over the existing catalog: Anthropic
# `claude-*` entries from LiteLLM win; curated entries LiteLLM lacks (e.g. a
# brand-new model added by hand before LiteLLM catches up) are kept.
#
# Safe to run anytime, by hand or from the Stop hook's background trigger:
#   bash ~/.claude/hooks/discord-refresh-pricing.sh
#
# Atomic + validated: a failed/empty/invalid fetch leaves the current catalog
# untouched. Self-throttled (skips if a successful refresh ran < 14 days ago)
# and lock-guarded (no concurrent runs). USD per million tokens; cache prices
# fall back to Anthropic's documented multipliers (read 0.1x, 5m write 1.25x).
set -u

# Config dir: honor CLAUDE_CONFIG_DIR if Claude Code's config was relocated.
DATA="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/data/discord-task-notifications"
mkdir -p "$DATA" 2>/dev/null || true
CATALOG="$DATA/pricing-catalog.json"
STAMP="$DATA/.last-refresh"
LOCK="$DATA/.refresh.lock"
URL='https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json'
MAX_AGE=1209600  # 14 days

# Lock (atomic mkdir): bail if another refresh is already running. A refresh
# takes seconds, so a lock older than 10 min is an orphan from a hard-killed run
# (mkdir locks don't self-release) — steal it, else refreshes stall forever.
[ -n "$(find "$LOCK" -maxdepth 0 -mmin +10 2>/dev/null)" ] && rmdir "$LOCK" 2>/dev/null
mkdir "$LOCK" 2>/dev/null || exit 0
# Install cleanup before allocating more resources so a signal can't orphan the
# lock. tmp/out are emptied first so the trap is safe under set -u.
tmp=""; out=""
trap 'rm -f "$tmp" "$out"; rmdir "$LOCK" 2>/dev/null' EXIT
tmp=$(mktemp 2>/dev/null) || exit 0

# Skip if a successful refresh happened recently (unless --force).
if [ "${1:-}" != "--force" ]; then
  last=$(cat "$STAMP" 2>/dev/null | tr -dc 0-9)
  now=$(date +%s)
  [ -n "$last" ] && [ $(( now - last )) -lt "$MAX_AGE" ] && exit 0
fi

curl -fsS -m 30 "$URL" -o "$tmp" 2>/dev/null || { echo "refresh: fetch failed" >&2; exit 0; }
[ -s "$tmp" ] || { echo "refresh: empty download" >&2; exit 0; }

existing='{"modelPricing":{}}'
if [ -f "$CATALOG" ]; then
  cur=$(tr -d '\r' < "$CATALOG" 2>/dev/null)
  echo "$cur" | jq empty 2>/dev/null && existing=$cur
fi

merged=$(jq -n --slurpfile up "$tmp" --argjson cur "$existing" '
  def mtok: (. * 1000000 * 10000 | round) / 10000;
  ($up[0] | to_entries
    | map(select(.value.litellm_provider == "anthropic"
                 and (.key | test("claude"))
                 and (.value.input_cost_per_token != null)
                 and (.value.output_cost_per_token != null)))
    | map({ key: (.key | sub("^anthropic/"; "")),
            value: ( .value as $v
              | ($v.input_cost_per_token) as $in
              | { input:      ($in | mtok),
                  output:     ($v.output_cost_per_token | mtok),
                  cacheRead:  (($v.cache_read_input_token_cost      // ($in * 0.1))  | mtok),
                  cacheWrite: (($v.cache_creation_input_token_cost  // ($in * 1.25)) | mtok) }) })
    | from_entries) as $upm
  | { _comment: "Self-managed Claude API pricing for the Discord Stop hook. USD per million tokens. Auto-refreshed from LiteLLM (merged over curated entries) by discord-refresh-pricing.sh; edit by hand for models LiteLLM has not added yet.",
      modelPricing: (($cur.modelPricing // {}) + $upm) }
')

[ -n "$merged" ] || { echo "refresh: merge produced nothing" >&2; exit 0; }
echo "$merged" | jq empty 2>/dev/null || { echo "refresh: merged JSON invalid" >&2; exit 0; }
count=$(echo "$merged" | jq '.modelPricing | length')
[ "${count:-0}" -gt 0 ] 2>/dev/null || { echo "refresh: empty modelPricing" >&2; exit 0; }

# Write atomically: a reader (the Stop hook) must never see a half-written file.
# out lives in the catalog's dir so mv is a same-filesystem rename. The trap
# cleans it up if any step fails before the mv consumes it.
out="$CATALOG.new"
printf '%s\n' "$merged" > "$out" && mv -f "$out" "$CATALOG"
date +%s > "$STAMP" 2>/dev/null || true
echo "refresh: catalog updated ($count models)" >&2
