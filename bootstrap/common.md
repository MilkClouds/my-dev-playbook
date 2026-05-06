# Common Setup

Setup playbook for new machines. Linux and macOS focused.

## Installation tiers

Each installable item below is tagged with one of (cumulative — `full` is a superset of `minimal`):

- **minimal** — the smallest set needed to be productive on this machine
- **full** — `minimal` plus all standard extras; the default for a new dev machine
- **as-needed** — outside both presets; install only when a specific project or task calls for it

Tags appear inline next to each item, or on a section heading (e.g., `## Shell *(minimal)*`) when the entire section sits at one tier.

**For agents reading this doc**: First, use `AskUserQuestion` to ask the user which baseline preset to install — `minimal` or `full`. Then install everything tagged at or below the chosen preset without further prompting. For each `as-needed` item, use a separate `AskUserQuestion` to confirm whether to install it on this particular machine. Never install `as-needed` items silently.

## Shell *(minimal)*

Install [zsh](https://github.com/zsh-users/zsh) with [oh-my-zsh](https://github.com/ohmyzsh/ohmyzsh). Set the theme to `random`. Enable these plugins:

- **[git](https://github.com/ohmyzsh/ohmyzsh/tree/master/plugins/git)**: well-known aliases (`gst`, `gco`, `gl`, etc.).
- **[zsh-syntax-highlighting](https://github.com/zsh-users/zsh-syntax-highlighting)**: catches typos before hitting enter.
- **[zsh-autosuggestions](https://github.com/zsh-users/zsh-autosuggestions)**: fish-like history suggestions.
- **[progress-utils](https://github.com/MilkClouds/my-dev-playbook/tree/main/progress-utils)**: custom plugin (included in this repo) that wraps cp/mv/rm/tar/wget with progress bars via tqdm and rsync.

Run this one-liner to install oh-my-zsh, the additional plugins, and configure the theme. (`sed -i.bak` form works on both GNU and BSD `sed`, so the same command runs on Linux and macOS.)

```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended \
  && git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting \
  && git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions \
  && tmp=$(mktemp -d) \
  && git clone --depth=1 https://github.com/MilkClouds/my-dev-playbook "$tmp" \
  && mkdir -p ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/progress-utils \
  && cp "$tmp/progress-utils/progress-utils.plugin.zsh" ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/progress-utils/ \
  && rm -rf "$tmp" \
  && sed -i.bak 's/^plugins=(.*/plugins=(git zsh-syntax-highlighting zsh-autosuggestions progress-utils)/' ~/.zshrc \
  && sed -i.bak 's/^ZSH_THEME=".*/ZSH_THEME="random"/' ~/.zshrc \
  && rm ~/.zshrc.bak
```

## Tool Management

Install once, use system-wide. **On shared clusters, never touch system packages (`sudo apt`/`yum`/`brew`) — always prefer user-space installers (`pixi global`, `uv tool`) so you don't disturb other users.**

- **Installers** (meta layer — tools whose job is to install other tools):
  - **[uv](https://github.com/astral-sh/uv) (`uv tool install`)** *(minimal)*: For pypi-distributed CLIs. Installs each tool in its own isolated env. Same `uv` binary covered in [Package Management](#package-management) below — this is its global-tool side.
  - **[npm](https://github.com/npm/cli) (`npm install -g`)** *(minimal)*: Comes bundled with Node.js (installed via nvm — see [Package Management](#package-management)). Used to install Node-distributed CLIs globally.
  - **[pixi](https://github.com/prefix-dev/pixi) (`pixi global install`)** *(minimal)*: Conda-forge backed cross-language installer. Default choice for non-pypi global CLIs (e.g., `pixi global install gh` for the GitHub CLI).
  - **[cargo](https://github.com/rust-lang/cargo) (`cargo install`)** *(full)*: Rust's package installer. Install when you need a Rust-distributed CLI; requires the Rust toolchain ([`rustup`](https://github.com/rust-lang/rustup)). Pair with [`cargo-update`](https://github.com/nabijaczleweli/cargo-update) for `cargo install-update -a` to bulk-upgrade everything cargo installed.
- **System CLIs** (non-pypi — install via `pixi global install <name>`):
  - **minimal**: [`git`](https://git-scm.com/) (usually pre-installed; install via pixi if the OS-bundled version is too old; configure user/email/default branch `main` after install; **note:** pixi's git package omits `git-subtree` (a contrib script) — if a project needs it and the system git has it, symlink: `ln -s /usr/lib/git-core/git-subtree ~/.local/bin/git-subtree`), [`gh`](https://cli.github.com/) (run `gh auth login` once after install).
  - **full**: [`tmux`](https://github.com/tmux/tmux) (terminal multiplexer for SSH workflows; doubles as multi-agent workspace), [`ncdu`](https://dev.yorhel.nl/ncdu) (interactive disk usage analyzer), [`git-lfs`](https://github.com/git-lfs/git-lfs) (Git Large File Storage; Ubuntu apt's 3.0.2 is stale and has smudge bugs — run `git lfs install` once after pixi install to register git filters).
  - **as-needed**: [`cmake`](https://cmake.org/) (C/C++ build system), [`hyperfine`](https://github.com/sharkdp/hyperfine) (CLI benchmarking), [`ffmpeg`](https://ffmpeg.org/) (audio/video processing), [`typst`](https://typst.app/) (modern typesetting system, LaTeX alternative), [`git-subrepo`](https://github.com/ingydotnet/git-subrepo) (vendored subtree workflow for external repos; because it's a git subcommand, run `pixi global expose add --environment git-subrepo git-subrepo` after install).
- **Python CLIs** (pypi-distributed — install via `uv tool install <name>`):
  - **minimal**: [`ruff`](https://github.com/astral-sh/ruff) (linter + formatter, wired into `settings.json`), [`ty`](https://github.com/astral-sh/ty) (Astral's Python type checker), [`tqdm`](https://github.com/tqdm/tqdm) (required by the `progress-utils` zsh plugin).
  - **full**: [`glances`](https://github.com/nicolargo/glances) (CPU/RAM/disk/network/GPU monitor), [`gpustat`](https://github.com/wookayin/gpustat) (fast `nvidia-smi` replacement).
  - **as-needed**: [`git-filter-repo`](https://github.com/newren/git-filter-repo) (git history rewriter), [`gsutil`](https://cloud.google.com/storage/docs/gsutil) (Google Cloud Storage CLI), [`grip`](https://github.com/joeyespo/grip) (local GitHub-flavored Markdown previewer).

### Keeping tools fresh

```bash
uv self update && uv tool upgrade --all \
  && npm update -g \
  && pixi self-update && pixi global update \
  && cargo install-update -a
```

## Package Management

- **Python** *(minimal)*: Install [uv](https://github.com/astral-sh/uv). Use `uv venv`/`uv pip`/`uv run` for projects. (For its global-CLI side `uv tool install`, see [Tool Management](#tool-management) above.)
- **Node.js** *(minimal)*: Install [nvm](https://github.com/nvm-sh/nvm). Brings npm with it (see [Tool Management](#tool-management) above) and is needed for Claude Code's MCP servers that ship as npx packages.
- **JVM** *(as-needed)*: Install [sdkman](https://sdkman.io/).
- **Conda** *(as-needed)*: Install [Miniforge](https://github.com/conda-forge/miniforge) when a project depends on the conda ecosystem (most common in Python, but conda-forge serves many languages — R, C/C++, Julia, etc.).

## Editor *(minimal)*

Use [VS Code](https://github.com/microsoft/vscode). Apply settings and keybindings from: [settings.json](../configs/settings.json), [keybindings.json](../configs/keybindings.json).

## Agentic Coding Tools

Layered stack: a base agentic CLI per provider, an orchestration layer on top, and shared utilities.

- <a id="claude-code-stack"></a>**Claude Code stack** (primary):
  - **[Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview)** *(minimal)*: Anthropic's first-party agentic coding CLI.
  - **[oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) (`omc`)** *(minimal)*: Multi-agent orchestration layer on top of Claude Code. Provides autopilot, ralph, ultrawork, and team workflows.
  - **Configs** *(minimal)* — apply after Claude Code is installed; all three configure Claude Code itself:
    - [`claude-plugins.json`](../configs/claude-plugins.json) — Plugin marketplace enablement. Turns on `oh-my-claudecode` (`omc`), [`skill-creator`](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/skill-creator), [`make-bib`](https://github.com/MilkClouds/make-bib), and the [`codex` plugin](https://github.com/openai/codex-plugin-cc) (lets you call Codex from within Claude Code as a subagent for second opinions — only takes effect when the [Codex stack](#codex-stack) below is also installed).
    - [`mcp-servers.json`](../configs/mcp-servers.json) — MCP servers wired into Claude Code: [`context7`](https://github.com/upstash/context7), [`perplexity`](https://github.com/perplexityai/modelcontextprotocol), [`github`](https://github.com/github/github-mcp-server), [`arxiv-mcp-server`](https://github.com/blazickjp/arxiv-mcp-server), [`semantic-scholar-mcp`](https://github.com/MilkClouds/semantic-scholar-mcp), [`pdf-reader`](https://github.com/SylphxAI/pdf-reader-mcp), [`sequential-thinking`](https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking), [`notion-mcp-server`](https://github.com/makenotion/notion-mcp-server).
    - [`CLAUDE.md`](../configs/CLAUDE.md) — User-level Claude Code memory file. Global instructions, language preference, environment constraints.
- <a id="codex-stack"></a>**Codex stack** (secondary):
  - **[Codex](https://github.com/openai/codex)** *(as-needed)*: OpenAI's first-party agentic coding CLI; secondary tool for second-opinion runs.
  - **[oh-my-codex](https://github.com/Yeachan-Heo/oh-my-codex) (`omx`)** *(as-needed)*: Orchestration layer on top of Codex. Mirrors what `omc` does for Claude Code. Requires Codex.
- **Cross-cutting**:
  - **[agf](https://github.com/subinium/agf)** *(full)*: AI Agent Session Finder — locates and manages running agent sessions across both CLIs.
