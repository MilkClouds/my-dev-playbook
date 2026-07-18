# my-dev-playbook

Personal development environment setup. Linux and macOS focused.

## Layout

- **[docs/](docs/)**: guides and reference notes you read.
  - **[setup/](docs/setup/)**: first-run environment setup (shell, editors, cluster tools).
  - **[recipes/](docs/recipes/)**: optional, scenario-specific setups.
  - **[references/](docs/references/)**: curated lists and migration notes.
- **[configs/](configs/)**: VS Code settings, keybindings, Claude Code/Codex agent configs, MCP servers, user-level agent directives.
- **[tools/](tools/)**: runnable code.
  - **[whalebin/](tools/whalebin/)**: wrap binaries that live in a Docker image as host CLIs via Charliecloud.
  - **[progress-utils/](tools/progress-utils/)**: oh-my-zsh plugin for progress bars on cp/mv/rm/tar/wget.
- **[skills/](skills/)**: Claude Code skills, distributed as marketplace plugins.
- **[commands/](commands/)**: Claude Code slash commands (e.g. `/sf`), installed by copying into `~/.claude/commands/`.

## Setup

Start with common, then add environment-specific setup.

1. **[docs/setup/common.md](docs/setup/common.md)**: Shell, package managers, editor, AI coding agents. Every machine.
2. **[docs/setup/hpc.md](docs/setup/hpc.md)**: Slurm aliases, smon, Docker GPU aliases, VS Code Remote-SSH. Cluster nodes.
3. **[docs/setup/env-vars.md](docs/setup/env-vars.md)**: User-level env vars via `environment.d`; MANPATH and SLURM exceptions.

## Recipes

Optional, scenario-specific setups. Apply only when you need them.

- **[docs/recipes/mobile-tmux/](docs/recipes/mobile-tmux/)**: Authenticated mobile browser access to tmux via `ttyd` + cookie auth proxy.
- **[docs/recipes/windows.md](docs/recipes/windows.md)**: Windows 11 package install method decisions (installer / pixi / choco). *Experimental.*
- **[docs/recipes/discord-task-notifications/](docs/recipes/discord-task-notifications/)**: Stop / Notification / UserPromptSubmit hooks that post Discord embeds when Claude Code finishes a long task. Debounced to silence when you're at the terminal; per-turn token + USD cost via ccusage pricing catalog.
- **[docs/recipes/codex-discord-task-notifications/](docs/recipes/codex-discord-task-notifications/)**: Self-contained Codex `notify` handler for debounced Discord turn-completion alerts. Node built-ins only; no Claude plugin, ccusage-worv, or Oh My Codex dependency.
- **[docs/recipes/pretty-git-diffs/](docs/recipes/pretty-git-diffs/)**: Syntax-highlighted git diffs via delta + lazygit, across the CLI, the lazygit TUI, and inside Claude Code's `!` bash (with the non-TTY color workaround).
- **[docs/recipes/claude-code/](docs/recipes/claude-code/)**: Claude Code workflow notes: MCP update flow and the `/simplify` history reconstruction.

## References

- **[docs/references/python-libraries.md](docs/references/python-libraries.md)**: Curated go-to Python libraries, grouped by category.

## Skills

This repo is a Claude Code **plugin marketplace** (`.claude-plugin/marketplace.json`); each skill in [`skills/`](skills/) ships as its own plugin.

- **sync-repos**: Cherry-pick commits between two git remotes with unrelated histories, preserving authorship.
- **editable-pptx**: Build fully editable PowerPoint decks from code: native textboxes/shapes/tables/charts (pptxgenjs) + native PowerPoint equations (LaTeX→OMML via pandoc). Reusable helper library and LibreOffice-based QA scripts.

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

Swap `editable-pptx` for any skill above. To remove, use
`claude plugin marketplace remove my-dev-playbook`; this also updates the
global `known_marketplaces.json` registry, which hand-deleting the cache dir does not.

## Commands

- **[`/sf`](commands/sf.md)**: Pre-2.1.147 `/simplify`: 3 parallel review agents that find reuse/simplification/efficiency cleanups, then apply the fixes directly.

Marketplace-distributed commands are namespaced (`/<plugin>:<command>`), so to keep the bare `/sf` invocation, install it as a **user command** by copying, not via the marketplace:

```bash
mkdir -p ~/.claude/commands
cp commands/sf.md ~/.claude/commands/          # from a local clone
# …or fetch directly:
curl -fsSL https://raw.githubusercontent.com/MilkClouds/my-dev-playbook/main/commands/sf.md -o ~/.claude/commands/sf.md
```

## License

MIT
