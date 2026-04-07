# Common Setup

Applies to every new machine. Linux and macOS focused.

## Shell

zsh with oh-my-zsh, random theme. Different prompt every session. Plugins:

- **git**: alias set (`gst`, `gco`, `gl`, etc.) that's muscle memory at this point.
- **zsh-syntax-highlighting**: catches typos before hitting enter.
- **zsh-autosuggestions**: fish-like history suggestions.
- **progress-utils**: custom plugin (included in this repo) that wraps cp/mv/rm/tar/wget with progress bars via tqdm and rsync.

One-liner that installs oh-my-zsh, all plugins, and configures the theme:

```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended \
  && git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting \
  && git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions \
  && git clone https://github.com/MilkClouds/my-dev-playbook ~/.my-dev-playbook \
  && ln -s ~/.my-dev-playbook/progress-utils ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/progress-utils \
  && sed -i 's/^plugins=(.*/plugins=(git zsh-syntax-highlighting zsh-autosuggestions progress-utils)/' ~/.zshrc \
  && sed -i 's/^ZSH_THEME=".*/ZSH_THEME="random"/' ~/.zshrc
```

## Package Management

Prefer isolated/virtualized environments over installing into system runtimes.

- **Python**: [uv](https://github.com/astral-sh/uv). Two main uses: `uv venv`/`uv pip`/`uv run` for project-level dependency management and virtual environments, and `uv tool install` for standalone CLI executables (each gets its own isolated env).
- **Python project envs**: [Miniforge](https://github.com/conda-forge/miniforge) (conda-forge)
- **Node.js**: [nvm](https://github.com/nvm-sh/nvm)
- **JVM**: [sdkman](https://sdkman.io/). Only relevant when a JVM project comes up.

## Git

Global config: user name, email, default branch `main`. No signing or special settings.

## Editor

VS Code. Settings and keybindings: [settings.json](../configs/settings.json), [keybindings.json](../configs/keybindings.json).

## Agentic Coding Tools

[Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) is the primary agentic coding tool, running in the VS Code integrated terminal over SSH. Enhanced with [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) (`omc`), a multi-agent orchestration layer that provides autopilot, ralph, ultrawork, and team workflows.

[Codex](https://github.com/openai/codex) (OpenAI) is a standalone agentic coding tool, also enhanced with [oh-my-codex](https://github.com/Yeachan-Heo/oh-my-codex) for orchestration. The [codex plugin](https://github.com/openai/codex-plugin-cc) allows calling Codex from within Claude Code as a subagent for second opinions.

[agf](https://github.com/subinium/agf) (AI Agent Session Finder) helps locate and manage running agent sessions.

Config files: [claude-plugins.json](../configs/claude-plugins.json), [mcp-servers.json](../configs/mcp-servers.json), [CLAUDE.md](../configs/CLAUDE.md)

## Dev Tools

**tmux**: persistent terminal sessions. SSH connections drop, but tmux sessions survive.

**[glances](https://github.com/nicolargo/glances)**: system-wide monitoring dashboard. CPU, RAM, disk, network, GPU in one view. More comprehensive than htop.

**[gpustat](https://github.com/wookayin/gpustat)**: quick GPU utilization check. Cleaner and more concise than `nvidia-smi`.
