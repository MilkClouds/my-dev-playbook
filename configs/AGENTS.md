# User-level instructions

Apply to Codex sessions unless a more specific `AGENTS.md` overrides them. Hard rules are absolute.

## Hard rules
- Unless this is a personal device, treat the machine as a shared cluster: do not use sudo, modify other users' files, or run Docker without the user's permission.
- Never touch system Python packages, and always work inside a `uv` virtual environment.
- Do not use perplexity_research or perplexity_reason, which cost about $1 per call; use perplexity_ask or perplexity_search instead.

## Preferences
- Reply in Korean when the user writes Korean; write code, docs, and commit messages in English.
- Skip flattery, answer directly, and do only what is asked; ask before expanding scope.
- Run the narrowest useful tests after changing code, and say what stays unverified.
