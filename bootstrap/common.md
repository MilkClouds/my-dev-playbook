# Common Setup

Apply these steps on every new machine. Linux and macOS focused.

## Shell

Install zsh with oh-my-zsh. Set the theme to `random`. A different prompt every session keeps things fresh. Enable these plugins:

- **git**: well-known aliases (`gst`, `gco`, `gl`, etc.).
- **zsh-syntax-highlighting**: catches typos before hitting enter.
- **zsh-autosuggestions**: fish-like history suggestions.
- **progress-utils**: custom plugin (included in this repo) that wraps cp/mv/rm/tar/wget with progress bars via tqdm and rsync.

Run this one-liner to install oh-my-zsh, all plugins, and configure the theme:

```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended \
  && git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting \
  && git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions \
  && tmp=$(mktemp -d) \
  && git clone --depth=1 https://github.com/MilkClouds/my-dev-playbook "$tmp" \
  && mkdir -p ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/progress-utils \
  && cp "$tmp/progress-utils/progress-utils.plugin.zsh" ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/progress-utils/ \
  && rm -rf "$tmp" \
  && sed -i 's/^plugins=(.*/plugins=(git zsh-syntax-highlighting zsh-autosuggestions progress-utils)/' ~/.zshrc \
  && sed -i 's/^ZSH_THEME=".*/ZSH_THEME="random"/' ~/.zshrc
```

## Package Management

Prefer isolated/virtualized environments over installing into system runtimes.

- **Python**: Install [uv](https://github.com/astral-sh/uv). Fast (Rust-based) and all-in-one; replaces pip, venv, and pipx in a single tool. Use `uv venv`/`uv pip`/`uv run` for projects, `uv tool install` for standalone CLIs.
- **Python project envs**: Install [Miniforge](https://github.com/conda-forge/miniforge) (conda-forge). Anaconda is too bloated, and Miniconda has commercial license restrictions. Miniforge is community-maintained and uses conda-forge by default.
- **Node.js**: Install [nvm](https://github.com/nvm-sh/nvm). fnm/volta are faster alternatives, but nvm works fine and there's no compelling reason to switch.
- **JVM** (optional): Install [sdkman](https://sdkman.io/) when a JVM project comes up.

## Git

Configure global settings: user name, email, default branch `main`. Skip commit signing. Nice to have, but not worth the hassle of managing keys across multiple machines.

## Editor

Use VS Code. Apply settings and keybindings from: [settings.json](../configs/settings.json), [keybindings.json](../configs/keybindings.json).

## Agentic Coding Tools

Install [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) as the primary agentic coding tool. Currently the strongest coding model, and Claude Code is its first-party CLI with the deepest integration. Run it in the VS Code integrated terminal over SSH. Set up [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) (`omc`) on top. This is a multi-agent orchestration layer that provides autopilot, ralph, ultrawork, and team workflows.

Install [Codex](https://github.com/openai/codex) (OpenAI) as a secondary agentic coding tool. Set up [oh-my-codex](https://github.com/Yeachan-Heo/oh-my-codex) (`omx`) on top for orchestration. Install the [codex plugin](https://github.com/openai/codex-plugin-cc) to call Codex from within Claude Code as a subagent for second opinions.

Install [agf](https://github.com/subinium/agf) (AI Agent Session Finder) to locate and manage running agent sessions.

Apply config files: [claude-plugins.json](../configs/claude-plugins.json), [mcp-servers.json](../configs/mcp-servers.json), [CLAUDE.md](../configs/CLAUDE.md)

## Dev Tools

Install **tmux** for persistent terminal sessions. Essential for SSH workflows: sessions survive disconnects, and it doubles as a workspace manager for running multiple agent sessions side by side.

Install **[glances](https://github.com/nicolargo/glances)** for system-wide monitoring (CPU, RAM, disk, network, GPU). Use this for a full overview.

Install **[gpustat](https://github.com/wookayin/gpustat)** for quick GPU-only utilization checks. Use this when you just need a fast `nvidia-smi` replacement.
