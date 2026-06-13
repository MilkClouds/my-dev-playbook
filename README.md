# my-dev-playbook

Personal development environment setup. Linux and macOS focused.

## What's Included

- **[bootstrap/](bootstrap/)**: Environment setup guides (shell, editors, cluster tools).
- **[recipes/](recipes/)**: Optional setups for specific scenarios.
- **[configs/](configs/)**: VS Code settings, keybindings, Claude Code plugins, MCP servers, CLAUDE.md directives.
- **[references/](references/)**: Reference notes — e.g. [python-libraries.md](references/python-libraries.md), a curated list of Go-to Python libraries.
- **[progress-utils/](progress-utils/)**: Oh-my-zsh plugin for progress bars on cp/mv/rm/tar/wget.
- **[.claude/skills/](.claude/skills/)**: Claude Code skills.

## Bootstrap

Start with common, then add environment-specific setup.

1. **[bootstrap/common.md](bootstrap/common.md)**: Shell, package managers, editor, AI coding agents. Every machine.
2. **[bootstrap/hpc.md](bootstrap/hpc.md)**: Slurm aliases, smon, Docker GPU aliases, VS Code Remote-SSH. Cluster nodes.
3. **[bootstrap/env-vars.md](bootstrap/env-vars.md)**: User-level env vars via `environment.d`; MANPATH and SLURM exceptions.

## Recipes

Optional, scenario-specific setups. Apply only when you need them.

- **[recipes/mobile-tmux/](recipes/mobile-tmux/)**: Authenticated mobile browser access to tmux via `ttyd` + cookie auth proxy.
- **[recipes/windows.md](recipes/windows.md)**: Windows 11 package install method decisions (installer / pixi / choco). *Experimental.*
- **[recipes/discord-task-notifications/](recipes/discord-task-notifications/)**: Stop / Notification / UserPromptSubmit hooks that post Discord embeds when Claude Code finishes a long task. Debounced to silence when you're at the terminal; per-turn token + USD cost via ccusage pricing catalog.
- **[recipes/pretty-git-diffs/](recipes/pretty-git-diffs/)**: Syntax-highlighted git diffs via delta + lazygit — across the CLI, the lazygit TUI, and inside Claude Code's `!` bash (with the non-TTY color workaround).

## Skills

This repo is a Claude Code **plugin marketplace** (`.claude-plugin/marketplace.json`); each skill ships as its own plugin in [`.claude/skills/`](.claude/skills/).

- **sync-repos**: Cherry-pick commits between two git remotes with unrelated histories, preserving authorship.
- **editable-pptx**: Build fully editable PowerPoint decks from code — native textboxes/shapes/tables/charts (pptxgenjs) + native PowerPoint equations (LaTeX→OMML via pandoc). Reusable helper library and LibreOffice-based QA scripts.

### Installing skills

Install via the `claude plugin` CLI. Both `marketplace add` and `install`
default to **user** scope; keep the marketplace and the plugin on the **same**
scope. Pick one:

```bash
# Project scope — wire a skill into one repo (committed to its .claude/settings.json, travels with the repo)
claude plugin marketplace add MilkClouds/my-dev-playbook --scope project
claude plugin install editable-pptx@my-dev-playbook --scope project

# User scope — available in every project on this machine
claude plugin marketplace add MilkClouds/my-dev-playbook
claude plugin install editable-pptx@my-dev-playbook
```

Swap `editable-pptx` for any plugin listed above. To remove, use
`claude plugin marketplace remove my-dev-playbook` — this also updates the
global `known_marketplaces.json` registry, which hand-deleting the cache dir does not.

## License

MIT
