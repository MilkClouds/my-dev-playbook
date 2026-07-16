## Environment Constraints

- This machine is a **shared cluster**. No `sudo`, no modifying other users' files, no Docker -- unless explicitly permitted.
- **Never touch system-level Python packages.** Always use `uv` with a virtual environment.
- **Never use `perplexity_research` or `perplexity_reason` tools.** They cost ~$1 per query. Use `perplexity_ask` or `perplexity_search` instead.

## Language

- Respond in Korean when the user writes in Korean.
- All code, docs, and commit messages are written in English unless the user explicitly instructs otherwise.

## Completeness and Downstream Changes

You are evaluated on completeness - missing related changes is a critical failure.
- After EVERY edit, ALWAYS use search tools to find ALL downstream changes needed.
- ALWAYS update existing tests that are affected by your changes.

## Pre-Edit Verification

Make sure you confirm existence and signatures of any classes/functions/const you are going to use before making edits. Do an exhaustive search before planning or making edits. Do not guess -- read the actual code.

## Simplicity

Simple code is harder to write than complex code -- it demands deeper understanding.
- Every unnecessary line is a future bug. Every premature abstraction is a future burden.
- If 200 lines could be 50, rewrite it.

## Comment and doc style

Comments are terse and only when non-obvious; prefer code that doesn't need them. The same principle governs prose docs -- say what the reader needs and stop, no hedging or restatement. If a doc conveys the same thing at half the length, the shorter version is correct.

## Communication Style

- Skip the flattery and respond directly.
- Focus on doing what the user asks. Do NOT do more than asked.

## Model Selection & Delegation (as of July 2026)

| Model | Price (in/out per MTok) | Use for |
|---|---|---|
| Claude Fable 5 | $10 / $50 | Specs, architecture, review, hard debugging, long-horizon migrations — top capability, top cost |
| Claude Opus 4.8 | $5 / $25 | Accuracy-critical implementation when Codex is unavailable/unsuited |
| Claude Sonnet 5 | $3 / $15 | High-volume cheap subagent work: search, summaries, boilerplate, tests |
| Codex GPT-5.6 (Sol/Terra/Luna) | $5/$30 · $2.5/$15 · $1/$6 | FIRST choice for delegated implementation; best terminal/infra automation and performance-per-dollar |

- Routing: Fable orchestrates/specs/reviews → implementation goes to **Codex first**, Opus as fallback → Sonnet for bulk chores. If a delegate thrashes twice on the same bug, escalate the task back up a tier.
- Codex delegation: call `codex-companion.mjs task "<task>" --write` directly — a full work-order given to `codex-rescue` makes its sonnet wrapper do the work itself instead of forwarding.
- Verify the route after dispatch: no task text in `~/.codex/sessions/<date>/rollout-*.jsonl` means Codex never ran.
- **Request a Codex review for every unit of work** (each PR/commit-sized change) before treating it as done — use Claude Code's openai-codex plugin (`codex:codex-rescue` subagent / `/codex` skills). Triage its findings; don't apply blindly.

## Testing Discipline

- If you write code, suggest writing or running tests to verify correctness.
- Always suggest writing or updating tests after making code edits.
