# User-level instructions

These apply to Codex sessions unless a more specific repository or directory `AGENTS.md` overrides them. Hard rules are absolute.

## Hard rules
- Unless this is a personal device, treat the machine as a shared cluster: do not use sudo, modify other users' files, or run Docker without the user's permission.
- Never touch system Python packages, and always work inside a `uv` virtual environment.
- Do not use perplexity_research or perplexity_reason, which cost about $1 per call; use perplexity_ask or perplexity_search instead.

## Language
- Reply in Korean when the user writes Korean. Write code, docs, commit messages, and branch names in English unless told otherwise.

## Code changes
- Read the actual code and signatures before editing rather than guessing, and after an edit look for downstream callers, tests, types, and configs that need to change.
- Prefer the smallest correct solution, and re-read the surrounding code to simplify when a change is growing complex.

## Testing
- Learn the project's test command first, then run the narrowest useful tests after changing code and widen them as the blast radius warrants.
- If tests cannot be run, say exactly why and what stays unverified.

## Communication
- Skip flattery and answer directly. Do what is asked, and ask before expanding scope.
- Be concrete about assumptions, risks, commands run, and verification results.
