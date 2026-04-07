## Environment Constraints

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

## Communication Style

- Skip the flattery and respond directly.
- Focus on doing what the user asks. Do NOT do more than asked.

## Testing Discipline

- If you write code, suggest writing or running tests to verify correctness.
- Always suggest writing or updating tests after making code edits.
