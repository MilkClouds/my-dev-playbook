# Common Setup

Applies to every new machine. Linux and macOS focused.

## Shell

zsh with oh-my-zsh, random theme. A different prompt every session keeps things fresh. Plugins:

- **git**: well-known aliases (`gst`, `gco`, `gl`, etc.).
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

- **Python**: [uv](https://github.com/astral-sh/uv). Fast (Rust-based) and all-in-one; replaces pip, venv, and pipx in a single tool. `uv venv`/`uv pip`/`uv run` for projects, `uv tool install` for standalone CLIs.
- **Python project envs**: [Miniforge](https://github.com/conda-forge/miniforge) (conda-forge). Anaconda is too bloated, and Miniconda has commercial license restrictions. Miniforge is community-maintained and uses conda-forge by default.
- **Node.js**: [nvm](https://github.com/nvm-sh/nvm). fnm/volta are faster alternatives, but nvm works fine and there's no compelling reason to switch.
- **JVM**: [sdkman](https://sdkman.io/). Only relevant when a JVM project comes up.

## Git

Global config: user name, email, default branch `main`. No commit signing for now. Nice to have, but not worth the hassle of managing keys across multiple machines.

## Editor

VS Code. Settings and keybindings: [settings.json](../configs/settings.json), [keybindings.json](../configs/keybindings.json).

## Agentic Coding Tools

[Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) is the primary agentic coding tool. Currently the strongest coding model, and Claude Code is its first-party CLI with the deepest integration. Runs in the VS Code integrated terminal over SSH. Enhanced with [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) (`omc`), a multi-agent orchestration layer that provides autopilot, ralph, ultrawork, and team workflows.

[Codex](https://github.com/openai/codex) (OpenAI) is a standalone agentic coding tool, also enhanced with [oh-my-codex](https://github.com/Yeachan-Heo/oh-my-codex) for orchestration. The [codex plugin](https://github.com/openai/codex-plugin-cc) allows calling Codex from within Claude Code as a subagent for second opinions.

[agf](https://github.com/subinium/agf) (AI Agent Session Finder) helps locate and manage running agent sessions.

Config files: [claude-plugins.json](../configs/claude-plugins.json), [mcp-servers.json](../configs/mcp-servers.json), [CLAUDE.md](../configs/CLAUDE.md)

## Dev Tools

**tmux**: persistent terminal sessions. Essential for SSH workflows: sessions survive disconnects, and it doubles as a workspace manager for running multiple agent sessions side by side.

**[glances](https://github.com/nicolargo/glances)**: system-wide monitoring dashboard (CPU, RAM, disk, network, GPU). Use this for a full overview.

**[gpustat](https://github.com/wookayin/gpustat)**: quick GPU-only utilization check. Use this when you just need a fast `nvidia-smi` replacement.
