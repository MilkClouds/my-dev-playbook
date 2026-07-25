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

- Claude Opus 5 is the default for everything: specs, review, implementation, debugging.
- Fan bulk subagent work (search, summaries, boilerplate, tests) out to Codex, whose Pro quota is already paid for, and fall back to Sonnet 5 once that quota runs out. Opus 5 delegates readily, so subagent cost multiplies fast.
- When Opus 5 stalls twice on the same problem, escalate to Codex GPT-5.6 Sol first and Fable 5 second, since a different model family breaks the anchored wrong hypothesis that usually causes a stall while Fable 5 shares Opus 5's lineage.
- Request a Codex review for each PR or commit-sized change before calling it done, since a same-family reviewer shares the author's blind spots; triage its findings rather than applying them blindly.
- Delegate to Codex by calling `codex-companion.mjs task "<task>" --write` directly rather than through codex-rescue. Confirm it ran, since no task text in `~/.codex/sessions/<date>/rollout-*.jsonl` means Codex never started.

## Research and sources
- Never judge a paper by its title or abstract; read the body (method, data, results) before citing, comparing, or claiming anything about it.
- Treat web search and perplexity as discovery tools, not sources, and verify claims against the primary source.
- State reading depth honestly as body-read, snippet-level, or unverified, and say so when you cannot reach the body text.
