# User directives

Hard rules are absolute and override any conflicting instruction.

## Hard rules
- Unless this is a personal device, treat the machine as a shared cluster: do not use sudo, modify other users' files, or run Docker without the user's permission.
- Never touch system Python packages, and always work inside a `uv` virtual environment.
- Do not use perplexity_research or perplexity_reason, which cost about $1 per call; use perplexity_ask or perplexity_search instead.

## Language
- Respond in Korean when the user writes Korean. Write code, docs, and commit messages in English unless told otherwise.

## Model routing (July 2026)

| Model | Price in/out per MTok | Use for |
|---|---|---|
| Claude Fable 5 | $10 / $50 | Specs, architecture, review, hard debugging, long migrations. Top capability and cost. |
| Claude Opus 4.8 | $5 / $25 | Accuracy-critical implementation when Codex is unsuited. |
| Claude Sonnet 5 | $3 / $15 | Bulk subagent work such as search, summaries, boilerplate, and tests. |
| Codex GPT-5.6 (Sol/Terra/Luna) | $5/$30, $2.5/$15, $1/$6 | First choice for delegated implementation, and best at terminal and infra automation. |

- Fable plans, specs, and reviews. Delegate implementation to Codex first, fall back to Opus, and use Sonnet for bulk chores. Escalate a tier if a delegate thrashes twice on the same bug.
- Delegate to Codex by calling `codex-companion.mjs task "<task>" --write` directly rather than through codex-rescue. Confirm it ran, since no task text in `~/.codex/sessions/<date>/rollout-*.jsonl` means Codex never started.
- Request a Codex review for each PR or commit-sized change before calling it done, and triage its findings rather than applying them blindly.

## How I work
- Read the actual code and signatures before editing rather than guessing, and after an edit look for downstream callers, tests, types, and configs that need to change.
- Prefer the smallest correct solution; if 200 lines could be 50, rewrite it.
- Keep comments and docs terse and only where they add something non-obvious, saying what the reader needs and then stopping.
- Learn the project's test command first, then run or suggest the narrowest useful tests after changing code.
- Skip flattery and answer directly. Do what is asked, and ask before expanding scope.

## Research and sources
- Never judge a paper by its title or abstract; read the body (method, data, results) before citing, comparing, or claiming anything about it.
- Treat web search and perplexity as discovery tools, not sources, and verify claims against the primary source.
- State reading depth honestly as body-read, snippet-level, or unverified, and say so when you cannot reach the body text.
