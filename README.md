# my-dev-playbook

Personal development environment setup. Linux and macOS focused.

## What's Included

- **[bootstrap/](bootstrap/)**: Environment setup guides (shell, editors, cluster tools).
- **[configs/](configs/)**: VS Code settings, keybindings, Claude Code plugins, MCP servers, CLAUDE.md directives.
- **[progress-utils/](progress-utils/)**: Oh-my-zsh plugin for progress bars on cp/mv/rm/tar/wget.
- **[.claude/skills/](.claude/skills/)**: Claude Code skills.

## Bootstrap

Start with common, then add environment-specific setup.

1. **[bootstrap/common.md](bootstrap/common.md)**: Shell, package managers, editor, AI coding agents, environment variables. Every machine.
2. **[bootstrap/hpc.md](bootstrap/hpc.md)**: Slurm aliases, smon, Docker GPU aliases. Cluster nodes.

## Skills

Claude Code skills in [`.claude/skills/`](.claude/skills/).

- **sync-repos**: Cherry-pick commits between two git remotes with unrelated histories, preserving authorship.

### Installing skills

**Remote install** (no clone needed):

```bash
git clone --depth 1 git@github.com:MilkClouds/my-dev-playbook.git /tmp/_playbook && mkdir -p ~/.claude/skills && cp -r /tmp/_playbook/.claude/skills/sync-repos ~/.claude/skills/ && rm -rf /tmp/_playbook
```

**Local symlink** (if already cloned):

```bash
ln -s "$(pwd)/.claude/skills/sync-repos" ~/.claude/skills/sync-repos
```

## License

MIT
