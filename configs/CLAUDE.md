# User directives

Hard rules are absolute and override any conflicting instruction.

## Hard rules
- Unless this is a personal device, treat the machine as a shared cluster: do not use sudo, modify other users' files, or run Docker without the user's permission.
- Never touch system Python packages, and always work inside a `uv` virtual environment.
- Do not use perplexity_research or perplexity_reason, which cost about $1 per call; use perplexity_ask or perplexity_search instead.

## Preferences
- Respond in Korean when the user writes Korean; write code, docs, and commit messages in English.
- Keep comments and docs terse and only where they add something non-obvious.

## Model routing (July 2026)

- Default: Fable 5 judges and Opus 5 executes, so specs, design, review, and diagnosis go to Fable 5, while settled specs and wide mechanical changes go to Opus 5.
- Bulk subagent work: fan search, summaries, boilerplate, and tests out to Codex, whose Pro quota is already paid for, and fall back to Opus 5 or Sonnet 5 once that quota runs out.
- Escalation: when you stall twice on the same problem, prefer Codex GPT-5.6 Sol, since Fable 5 and Opus 5 share a lineage and only a different family reliably breaks the anchored hypothesis; if the Codex quota is gone, fall back to the other Claude model and say the cross-family check was skipped.
- Codex delegation: `codex-companion.mjs` below means `node ~/.claude/plugins/marketplaces/openai-codex/plugins/codex/scripts/codex-companion.mjs`. Call it directly with `task "<task>" --write` rather than going through codex-rescue, and confirm it ran, since no task text in `~/.codex/sessions/<date>/rollout-*.jsonl` means Codex never started.
- Code review: run `codex-companion.mjs review` before calling a PR or commit-sized change done, since a same-family reviewer shares the author's blind spots; triage its findings rather than applying them blindly.
- Adversarial review: when the design itself is the risk rather than the code details, run `codex-companion.mjs adversarial-review "<focus>"` and name the suspected failure area in the focus text.

## Research and sources
- Never judge a paper by its title or abstract; read the body (method, data, results) before citing, comparing, or claiming anything about it.
- Treat web search and perplexity as discovery tools, not sources, and verify claims against the primary source.
- State reading depth honestly as body-read, snippet-level, or unverified, and say so when you cannot reach the body text.
