# Claude Code `/simplify` history

Archaeology of every distinct implementation of the `/simplify` slash command across Claude Code versions 2.1.63 (introduction) through 2.1.150 (current as of 2026-05-24).

Why this exists: Claude Code 2.1.147 swapped `/simplify`'s behavior wholesale: old behavior auto-applied fixes, new behavior only reports. The changelog calls it a "rename to `/code-review`," but `/simplify` had already been a `code-review` alias for many versions; the real change was the prompt rewrite. This directory preserves every prompt text from the binary so the original behavior can be reproduced if needed.

## Method

For each of the 73 versions on npm in the range:

1. `npm pack @anthropic-ai/claude-code@<ver>` (or the `claude-code-linux-x64` subpackage for 2.1.110+).
2. Search the minified JS / native binary for the command-registration block: either `{name:"simplify"...}` (early) or `{name:"code-review",aliases:["simplify"]...}` (later).
3. Parse the JavaScript template literal containing the prompt, walking past nested `${...}` substitutions and escaped backticks (the naive `[^`]+` regex truncates at the first `` `git diff` `` code span).
4. Normalize each prompt by replacing minified variable names (`${tq}`, `${u4}`, etc.) with `${VAR}` and decoding `\uXXXX` escapes before SHA-hashing. Otherwise every minifier reshuffle looks like a different prompt.

After normalization, 73 versions collapse to **7 unique implementations**.

Extraction scripts and raw artifacts: `/tmp/cc-old/` on the local machine (transient). Per-version raw results: `manifest.json` in this directory.

## Timeline

| # | Versions | Span | Name | Prompt size | What changed |
|---|---|---|---|---|---|
| [1](prompts/01-2.1.63-to-2.1.70.md) | 2.1.63..2.1.70 | 7 | `simplify` | 2983 | Initial release: 3 agents (Reuse / Quality / Efficiency), Quality has 5 items, Efficiency 6. Argument = free-text appended as "Additional Focus." |
| [2](prompts/02-2.1.71-to-2.1.71.md) | 2.1.71 | 1 | `simplify` | 3153 | Quality +1: "Unnecessary JSX nesting." |
| [3](prompts/03-2.1.72-to-2.1.80.md) | 2.1.72..2.1.80 | 9 | `simplify` | 3581 | Efficiency +1: "Recurring no-op updates", the long item about change-detection guards and updater/reducer same-reference returns. |
| [4](prompts/04-2.1.81-to-2.1.114.md) | 2.1.81..2.1.114 | 26 | `simplify` | 3833 | Quality +1: "Unnecessary comments." The longest-running form of the prompt. Over a quarter of all versions used this exact text. |
| [5](prompts/05-2.1.116-to-2.1.145.md) | 2.1.116..2.1.145 | 25 | `simplify` | 4035 | Quality +1: "Nested conditionals." Stable through nearly all of late 2.1.x. (2.1.115 was not published.) |
| [6](prompts/06-2.1.146-to-2.1.146.md) | 2.1.146 | 1 | `code-review` (alias `simplify`) | 4025 | Surface change: heading drops "Simplify:" prefix, argument switches from free-text "Additional Focus" to effort level `[low\|medium\|high\|xhigh\|max]`. Body is still the same 3-agent reuse/quality/efficiency + direct-fix flow. |
| [7](prompts/07-2.1.147-to-2.1.150.md) | 2.1.147..2.1.150 | 4 | `code-review` (alias `simplify`) | 567 + 10 pieces | **The rewrite.** Entire prompt replaced with a multi-piece, effort-aware, verify-then-report pipeline. No more auto-fix. Argument adds `--comment` (post findings as inline PR comments) and an optional target. Pieces in [`prompts/pieces-2.1.147-to-2.1.150/`](prompts/pieces-2.1.147-to-2.1.150/). |

Gaps in the version sequence (2.1.65, 2.1.82, 2.1.88, 2.1.93, 2.1.95, 2.1.99, 2.1.102, 2.1.103, 2.1.106, 2.1.115, 2.1.125, 2.1.127, 2.1.130, 2.1.134, 2.1.135) are versions that npm shows as unpublished, not extraction failures. 73 published versions in the 2.1.63..2.1.150 range were processed.

## What old `/simplify` actually did (implementations #1-#6)

A single markdown prompt with this shape:

1. **Phase 1: Identify Changes.** Run `git diff` (or `git diff HEAD` with staged changes). If clean, review recently-modified files.
2. **Phase 2: Launch Three Review Agents in Parallel.**
   - **Agent 1 / Code Reuse**: find existing utilities that could replace new code; flag duplicate helpers and hand-rolled patterns.
   - **Agent 2 / Code Quality**: redundant state, parameter sprawl, copy-paste, leaky abstractions, stringly-typed code, JSX nesting (added 2.1.71), nested conditionals (added 2.1.116), unnecessary comments (added 2.1.81).
   - **Agent 3 / Efficiency**: unnecessary work, missed concurrency, hot-path bloat, recurring no-op updates (added 2.1.72), TOCTOU existence checks, memory/listener leaks, overly broad reads.
3. **Phase 3: Fix Issues.** Aggregate findings, **edit the code directly**. False positive → skip silently. Summarize fixes at the end.

The argument was free-text and got appended as an `## Additional Focus` block to the agents.

## What new `/code-review` does (implementation #7)

Compose a prompt from named pieces based on effort:

- `low`: 1 angle pass, no verification, ≤4 findings.
- `medium`: 3 angles × 6 candidates, 1-vote verify (CONFIRMED / PLAUSIBLE / REFUTED), ≤8 findings.
- `high` / `xhigh` / `max`: same plus 2 more angles (language pitfalls, wrapper/proxy correctness), recall-biased verifier, ≤10 findings.

Output is a **JSON array**: `file`, `line`, `summary`, `failure_scenario`. With `--comment`, each finding becomes an inline PR comment via `mcp__github_inline_comment__create_inline_comment` (or `gh api`).

Code is never modified. This is the change that prompted writing this dossier.

## Restoring the old behavior

The faithful path is to copy the prompt body from one of [`prompts/04-2.1.81-to-2.1.114.md`](prompts/04-2.1.81-to-2.1.114.md) (most-stable era), [`prompts/05-2.1.116-to-2.1.145.md`](prompts/05-2.1.116-to-2.1.145.md) (final pre-rewrite form), or [`prompts/06-2.1.146-to-2.1.146.md`](prompts/06-2.1.146-to-2.1.146.md) (last version before behavior change) into `~/.claude/commands/<name>.md`. Replace `${VAR}` placeholders: they were minified references to the runtime Task-tool name (always meant "the Agent / Task tool") and `${k5}` (only in #1, the codebase-search tool name, equivalent to `Grep`).

The `/simplify` name itself cannot be reused; 2.1.147+ holds it as a built-in alias.
