# Common Setup

Setup playbook for new machines. Linux and macOS focused.

## Installation tiers

Each installable item has one tier. `full` includes everything in `minimal`.

- **minimal**: the smallest set needed to be productive on this machine
- **full**: `minimal` plus all standard extras; the default for a new dev machine
- **as-needed**: outside both presets; install only when a specific project or task calls for it

Tags appear on each item or on a section heading when the whole section has one tier.

> [!IMPORTANT]
> Agents must first ask whether to install the `minimal` or `full` baseline. Install that baseline without further
> prompts. Ask separately before installing each `as-needed` item; never install one silently.

## Shell *(minimal)*

Install [zsh](https://github.com/zsh-users/zsh) with [oh-my-zsh](https://github.com/ohmyzsh/ohmyzsh). Set the theme
to `random` and enable these plugins:

- **[git](https://github.com/ohmyzsh/ohmyzsh/tree/master/plugins/git)**: well-known aliases (`gst`, `gco`, `gl`, etc.).
- **[zsh-syntax-highlighting](https://github.com/zsh-users/zsh-syntax-highlighting)**: catches typos before hitting enter.
- **[zsh-autosuggestions](https://github.com/zsh-users/zsh-autosuggestions)**: fish-like history suggestions.
- **[progress-utils](https://github.com/MilkClouds/my-dev-playbook/tree/main/progress-utils)**: adds progress bars to
  `cp`, `mv`, `rm`, `tar`, and `wget` through tqdm and rsync.

The following installs oh-my-zsh and its plugins, then configures the theme. The `sed -i.bak` form works on both GNU
and BSD `sed`.

```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended \
  && git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting \
  && git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions \
  && tmp=$(mktemp -d) \
  && git clone --depth=1 https://github.com/MilkClouds/my-dev-playbook "$tmp" \
  && mkdir -p ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/progress-utils \
  && cp "$tmp/tools/progress-utils/progress-utils.plugin.zsh" ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/progress-utils/ \
  && rm -rf "$tmp" \
  && sed -i.bak 's/^plugins=(.*/plugins=(git zsh-syntax-highlighting zsh-autosuggestions progress-utils)/' ~/.zshrc \
  && sed -i.bak 's/^ZSH_THEME=".*/ZSH_THEME="random"/' ~/.zshrc \
  && rm ~/.zshrc.bak
```

## Tool Management

Install these once for system-wide use. On shared clusters, use user-space installers such as `pixi global` and
`uv tool`; never modify system packages with `sudo`, `apt`, `yum`, or `brew`.

### Installers

- **[uv](https://github.com/astral-sh/uv)** *(minimal)*: Installs each Python CLI in an isolated environment with
  `uv tool install`.
- **[pnpm](https://github.com/pnpm/pnpm)** *(minimal)*: Installs Node CLIs from a shared store. Install it with
  `npm install -g pnpm`, then run `pnpm setup` once.
  - Reinstall pnpm after switching Node versions because npm globals are version-specific.
  - Avoid pnpm's `curl | sh` installer; it can break global updates ([pnpm#11473](https://github.com/pnpm/pnpm/issues/11473)).
- **[pixi](https://github.com/prefix-dev/pixi)** *(minimal)*: Default installer for non-PyPI CLIs. Use
  `pixi global install`, for example `pixi global install gh`.
- **[cargo](https://github.com/rust-lang/cargo)** *(full)*: Installs Rust CLIs and requires
  [`rustup`](https://github.com/rust-lang/rustup). Add [`cargo-update`](https://github.com/nabijaczleweli/cargo-update)
  to upgrade installed tools with `cargo install-update -a`.
- **[whalebin](https://github.com/MilkClouds/my-dev-playbook/tree/main/tools/whalebin)** *(as-needed)*: Creates
  rootless `ch-run` wrappers in `~/.local/bin/` for tools distributed as container images. Requires Charliecloud.
  Install from GitHub:

  ```bash
  uv tool install --from "git+https://github.com/MilkClouds/my-dev-playbook.git#subdirectory=tools/whalebin" whalebin
  ```

  For local development, use `uv tool install --from ~/GitHub/my-dev-playbook/tools/whalebin whalebin`.

### System CLIs

Use an existing system binary when it is sufficiently current; otherwise install with `pixi global install <name>`.

- **[git](https://git-scm.com/)** *(minimal)*: Keep the system Git unless it is too old. Configure user, email, and
  the default `main` branch. Pixi omits `git-subtree`; link the system copy when needed:
  `ln -s /usr/lib/git-core/git-subtree ~/.local/bin/git-subtree`.
- **[gh](https://cli.github.com/)** *(minimal)*: Run `gh auth login` after installation.
- **[tmux](https://github.com/tmux/tmux)** *(full)*: Terminal multiplexer and multi-agent workspace.
- **[ncdu](https://dev.yorhel.nl/ncdu)** *(full)*: Interactive disk usage analyzer.
- **[git-lfs](https://github.com/git-lfs/git-lfs)** *(full)*: Run `git lfs install` after installation. Avoid Ubuntu's
  stale 3.0.2 package.
- **[jq](https://github.com/jqlang/jq)** *(full)*: JSON processor.
- **[go-yq](https://github.com/mikefarah/yq)** *(full)*: YAML, XML, and TOML processor; the binary is `yq`.
- **[cmake](https://cmake.org/)** *(as-needed)*: C and C++ build system.
- **[hyperfine](https://github.com/sharkdp/hyperfine)** *(as-needed)*: CLI benchmark runner.
- **[ffmpeg](https://ffmpeg.org/)** *(as-needed)*: Audio and video processing.
- **[typst](https://typst.app/)** *(as-needed)*: Modern typesetting system.
- **[git-subrepo](https://github.com/ingydotnet/git-subrepo)** *(as-needed)*: Expose its Git subcommand after install:
  `pixi global expose add --environment git-subrepo git-subrepo`.
- **[charliecloud](https://charliecloud.io/latest/index.html)** *(as-needed)*: Rootless HPC container runtime required
  by whalebin.

### Python CLIs

Install these with `uv tool install <name>`.

- **[ruff](https://github.com/astral-sh/ruff)** *(minimal)*: Python linter and formatter.
- **[ty](https://github.com/astral-sh/ty)** *(minimal)*: Python type checker.
- **[tqdm](https://github.com/tqdm/tqdm)** *(minimal)*: Required by the `progress-utils` zsh plugin.
- **[glances](https://github.com/nicolargo/glances)** *(full)*: System monitor.
- **[gpustat](https://github.com/wookayin/gpustat)** *(full)*: Fast `nvidia-smi` replacement.
- **[paperstack](https://github.com/MilkClouds/paperstack)** *(as-needed)*: Research corpus and source-backed paper CLI.
  Install with `uv tool install paperstack-cli`.
- **[git-filter-repo](https://github.com/newren/git-filter-repo)** *(as-needed)*: Git history rewriter.
- **[gsutil](https://cloud.google.com/storage/docs/gsutil)** *(as-needed)*: Google Cloud Storage CLI.
- **[grip](https://github.com/joeyespo/grip)** *(as-needed)*: Local GitHub-flavored Markdown previewer.

### Containerized CLIs

- **[TeX Live](https://hub.docker.com/r/texlive/texlive)** *(as-needed)*: Install the full toolchain through whalebin.
  On HPC clusters, mount the shared filesystem containing the repositories:

  ```bash
  whalebin install texlive --image texlive/texlive:latest-full \
    --bin latexmk,pdflatex,xelatex,lualatex,latexindent,chktex,bibtex,biber,makeindex,latexpand \
    --mount /mnt:/mnt
  ```

### Keeping tools fresh

```bash
uv self update && uv tool upgrade --all \
  && npm install -g pnpm@latest && pnpm update -g --latest --ignore-scripts \
  && pixi self-update && pixi global update \
  && cargo install-update -a
```

`--latest` allows pnpm to cross semver ranges. The 24-hour
[`minimumReleaseAge`](https://pnpm.io/settings#minimumreleaseage) cooldown still applies. `--ignore-scripts` keeps
updates non-interactive; approve a required postinstall explicitly with `pnpm add -g --allow-build=<pkg> <pkg>`.

## Package Management

- **Python** *(minimal)*: Install [uv](https://github.com/astral-sh/uv). Use `uv venv`, `uv pip`, and `uv run` for
  projects; use `uv tool install` for global Python CLIs.
- **Node.js** *(minimal)*: Install [nvm](https://github.com/nvm-sh/nvm) for Node.js and npm. Use pnpm for global CLIs;
  sequential-thinking remains an unpinned `npx` command.
- **JVM** *(as-needed)*: Install [sdkman](https://sdkman.io/).
- **Conda** *(as-needed)*: Install [Miniforge](https://github.com/conda-forge/miniforge) when a project depends on
  Conda packages.

## Editor *(minimal)*

Use [VS Code](https://github.com/microsoft/vscode). Apply [settings.json](../../configs/settings.json) and
[keybindings.json](../../configs/keybindings.json).

## Agentic Coding Tools

Agent CLIs, their configuration, and shared utilities.

### <a id="claude-code-stack"></a>Claude Code stack

- **[Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview)** *(minimal)*: Anthropic's first-party
  agentic coding CLI.
- **[claude-pace](https://github.com/Astro-Han/claude-pace)** *(minimal)*: Status line for quota pace, context use,
  and Git changes.
- **Configs** *(minimal)*:
  - [`claude-plugins.json`](../../configs/claude-plugins.json): enables claude-pace, skill-creator, fetch-bib, and the
    Codex plugin.
  - [`mcp-servers.json`](../../configs/mcp-servers.json): MCP servers. Replace credential placeholders before use.
  - [`claude-settings.json`](../../configs/claude-settings.json): merge into `~/.claude/settings.json`.
  - [`CLAUDE.md`](../../configs/CLAUDE.md): global instructions and environment constraints.
- **[/sf](../../commands/sf.md)** *(as-needed)*: Legacy three-agent simplify-and-fix workflow. Install under
  `~/.claude/commands/`. See its [history](../recipes/claude-code/simplify-history/).

### <a id="codex-stack"></a>Codex stack

- **[Codex](https://github.com/openai/codex)** *(as-needed)*: OpenAI's CLI for second-opinion runs. Use the standalone
  installer instead of pnpm; update it with `codex update`.
  - Linux/macOS: `curl -fsSL https://chatgpt.com/codex/install.sh | sh`
  - Windows: `powershell -ExecutionPolicy ByPass -c "irm https://chatgpt.com/codex/install.ps1 | iex"`
  - A pnpm-managed copy can be shadowed when the self-updater reinstalls Codex under npm
    ([openai/codex#24035](https://github.com/openai/codex/issues/24035)).
- **Configs** *(as-needed)*:
  - [`codex-config.toml`](../../configs/codex-config.toml): user config and MCP servers. Preserve machine-local trust
    entries when applying it.
  - [`AGENTS.md`](../../configs/AGENTS.md): global instructions and environment constraints.

### Shared agent tools

- **[Paperstack skill](https://github.com/MilkClouds/paperstack/tree/main/skills/paperstack)** *(as-needed)*: After
  installing the CLI, run `npx skills add MilkClouds/paperstack --skill paperstack -g` for Claude Code and Codex.
- **[agf](https://github.com/subinium/agf)** *(full)*: Finds and manages sessions across both CLIs.
