# Common Setup

Apply these steps on every new machine. Linux and macOS focused.

## Installation tiers

Each installable item below is tagged with one of (cumulative — `full` is a superset of `minimal`):

- **minimal** — the smallest set needed to be productive on this machine
- **full** — `minimal` plus all standard extras; the default for a new dev machine
- **as-needed** — outside both presets; install only when a specific project or task calls for it

**For agents reading this doc**: First, use `AskUserQuestion` to ask the user which baseline preset to install — `minimal` or `full`. Then install everything tagged at or below the chosen preset without further prompting. For each `as-needed` item, use a separate `AskUserQuestion` to confirm whether to install it on this particular machine. Never install `as-needed` items silently.

## Shell *(minimal)*

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

## Tool Management

Install once, use system-wide. **On shared clusters, never touch system packages (`sudo apt`/`yum`/`brew`) — always prefer user-space installers (`pixi global`, `uv tool`) so you don't disturb other users.**

- **Installers** (meta layer — tools whose job is to install other tools):
  - **[uv](https://github.com/astral-sh/uv) (`uv tool install`)** *(minimal)*: For pypi-distributed CLIs. Installs each tool in its own isolated env. Same `uv` binary covered in Package Management below — this is its global-tool side.
  - **npm (`npm install -g`)** *(minimal)*: Comes bundled with Node.js (installed via nvm — see Package Management). Used to install Node-distributed CLIs globally.
  - **[pixi](https://pixi.sh)** *(minimal)*: Conda-forge backed cross-language installer. Default choice for non-pypi global CLIs. Use `pixi global install <tool>` (e.g., `pixi global install gh` for the GitHub CLI).
  - **cargo (`cargo install`)** *(full)*: Rust's package installer. Install when you need a Rust-distributed CLI; requires the Rust toolchain (`rustup`). Pair with [`cargo-update`](https://github.com/nabijaczleweli/cargo-update) for `cargo install-update -a` to bulk-upgrade everything cargo installed.
- **System CLIs** (non-pypi — install via `pixi global install <name>`):
  - **Git** *(minimal)*: Usually pre-installed by the OS, but the system version may be too old to support features you'll want (`git switch`/`git restore`, recent submodule fixes, etc.). If so, install a newer copy with `pixi global install git`. Then configure global settings: user name, email, default branch `main`. Skip commit signing — not worth managing keys across multiple machines.
  - **[gh](https://cli.github.com/)** *(minimal)*: GitHub CLI for PR/issue/repo workflows from the terminal. Run `gh auth login` once after install. Frequently used by Claude Code for PR review and issue triage.
  - **tmux** *(full)*: Persistent terminal sessions. Essential for SSH workflows: sessions survive disconnects, and it doubles as a workspace manager for running multiple agent sessions side by side.
- **Python CLIs** (pypi-distributed — install via `uv tool install <name>`):
  - **[glances](https://github.com/nicolargo/glances)** *(full)*: System-wide monitoring (CPU, RAM, disk, network, GPU). Use this for a full overview.
  - **[gpustat](https://github.com/wookayin/gpustat)** *(full)*: Quick GPU-only utilization checks. Use this when you just need a fast `nvidia-smi` replacement.

### Keeping tools fresh

Run periodically to update all three global toolchains in one go:

```bash
uv self update && uv tool upgrade --all \
  && npm update -g \
  && pixi self-update && pixi global update \
  && cargo install-update -a
```

## Package Management

Prefer isolated/virtualized environments over installing into system runtimes.

- **Python** *(minimal)*: Install [uv](https://github.com/astral-sh/uv). Fast (Rust-based) and all-in-one; replaces pip, venv, and pipx in a single tool. Use `uv venv`/`uv pip`/`uv run` for projects. (For its global-CLI side `uv tool install`, see Tool Management above.)
- **Node.js** *(minimal)*: Install [nvm](https://github.com/nvm-sh/nvm). fnm/volta are faster alternatives, but nvm works fine and there's no compelling reason to switch. Brings npm with it (see Tool Management above) and is needed for Claude Code's MCP servers that ship as npx packages.
- **JVM** *(as-needed)*: Install [sdkman](https://sdkman.io/) when a JVM project comes up.
- **Python project envs** *(as-needed)*: Install [Miniforge](https://github.com/conda-forge/miniforge) (conda-forge) when a project requires conda. Anaconda is too bloated, and Miniconda has commercial license restrictions. Miniforge is community-maintained and uses conda-forge by default.

## Editor *(minimal)*

Use VS Code. Apply settings and keybindings from: [settings.json](../configs/settings.json), [keybindings.json](../configs/keybindings.json).

## Agentic Coding Tools

Layered stack: a base agentic CLI per provider, an orchestration layer on top, and shared utilities.

- **Claude Code stack** (primary):
  - **[Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview)** *(minimal)*: Currently the strongest coding model, and Claude Code is its first-party CLI with the deepest integration. Run it in the VS Code integrated terminal over SSH.
  - **[oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) (`omc`)** *(minimal)*: Multi-agent orchestration layer on top of Claude Code. Provides autopilot, ralph, ultrawork, and team workflows.
  - **Configs** *(minimal)* — apply after Claude Code is installed; all three configure Claude Code itself:
    - [`claude-plugins.json`](../configs/claude-plugins.json) — Plugin marketplace enablement. Turns on `oh-my-claudecode` (omc), [`skill-creator`](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/skill-creator), [`make-bib`](https://github.com/MilkClouds/make-bib), and the [`codex` plugin](https://github.com/openai/codex-plugin-cc) (lets you call Codex from within Claude Code as a subagent for second opinions — only takes effect when the Codex stack below is also installed).
    - [`mcp-servers.json`](../configs/mcp-servers.json) — MCP servers wired into Claude Code (context7, perplexity, github, arxiv, semantic-scholar, pdf-reader, sequential-thinking, etc.).
    - [`CLAUDE.md`](../configs/CLAUDE.md) — User-level Claude Code memory file. Global instructions, language preference, environment constraints.
- **Codex stack** (secondary):
  - **[Codex](https://github.com/openai/codex)** *(as-needed)*: OpenAI's CLI as a secondary agentic coding tool when you want a second-opinion model.
  - **[oh-my-codex](https://github.com/Yeachan-Heo/oh-my-codex) (`omx`)** *(as-needed)*: Orchestration layer on top of Codex. Mirrors what `omc` does for Claude Code. Requires Codex.
- **Cross-cutting**:
  - **[agf](https://github.com/subinium/agf)** *(full)*: AI Agent Session Finder — locates and manages running agent sessions across both CLIs.
