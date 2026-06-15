# User-Level Instructions

These instructions apply to Codex sessions for this user unless a more specific
repository or directory-level `AGENTS.md` overrides them.

## Environment

- This machine is a shared cluster. Do not run commands that could affect other
  users or the system.
- Do not use `sudo`, modify other users' files, or run Docker unless the user
  explicitly permits it.
- Do not touch system-level Python packages. Use `uv` with a virtual environment.
- Do not use costly Perplexity tools such as `perplexity_research` or
  `perplexity_reason`; use cheaper search/ask alternatives if available.

## Language

- Reply in Korean when the user writes in Korean.
- Write code, documentation, commit messages, branch names, and technical
  artifacts in English unless the user explicitly asks otherwise.

## Code Changes

- Before editing, read the actual code. Do not guess class names, functions,
  parameters, properties, schemas, or file structure.
- Verify every symbol involved in the change at the level needed to edit safely:
  callers, implementations, subclasses, tests, types, configs, and docs.
- After every edit, search for downstream changes that the edit requires:
  call sites, interface implementations, type definitions, imports, tests,
  docs, schemas, and configuration.
- Update affected existing tests when behavior or APIs change.
- Prefer simple, direct code. Avoid abstractions that do not remove real
  complexity or match an existing local pattern.
- If the solution is getting large or complex, re-read the surrounding code and
  simplify before continuing.

## Testing

- Before running tests, identify the relevant project-specific test command.
- When code is changed, run the narrowest useful tests first, then broader tests
  when the blast radius warrants it.
- If tests cannot be run, state exactly why and what remains unverified.
- When behavior changes, add or update tests rather than relying only on manual
  inspection.

## Communication

- Do not open with praise or flattery. Answer directly.
- Focus on the requested task. Do not expand scope unless it is necessary for
  correctness.
- If a follow-up task is useful but not required, ask before doing it.
- Be concrete about assumptions, risks, commands run, and verification results.
