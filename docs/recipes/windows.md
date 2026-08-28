# Windows Setup

> **⚠ Experimental: do not rely on this document yet.** Contents are still being validated and may change without notice.

Windows package guide. Apply [common.md](common.md) first; this layers Windows-specific install method choices on top. Targets Windows 11.

Each Windows package falls into one of three buckets:

- **(1) Official installer**: drivers, vendor ecosystems, environment-bundle tools
- **(2) pixi global**: cross-platform CLIs (with a conda-forge win-64 build)
- **(3) choco**: Windows-only / no win-64 conda build / system services / bulk-install convenience for GUI apps

Decision signals:

| Signal | Bucket |
|---|---|
| Driver / HW version coupling / kernel module | (1) |
| Vendor runs its own installer ecosystem (Office, VS, Docker) | (1) |
| Tool ships an environment, not just a binary (Git for Windows, full TeX Live) | (1) |
| Cross-platform CLI with a conda-forge win-64 build | (2) |
| Windows-only / no win-64 conda build / system service | (3) |
| GUI app with a strong built-in updater | (3), for initial install convenience; the app updates itself afterward |

Tiebreaker: pixi > choco > official (for CLIs); official > choco > pixi (for drivers and vendor ecosystems).

**For agents reading this doc**: install everything tagged at or below the preset chosen in common.md without further prompting. Ask separately before installing each *as-needed* item based on the machine's intended use.

## (1) Official installer

| Package | Notes |
|---|---|
| [Git for Windows](https://gitforwindows.org/) *(minimal)* | Bundles Git Bash, MinTTY, OpenSSH, and the POSIX-ish utility belt. **`git` on Windows uses this instead of common.md's pixi line.** |
| [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/) (`vctools` workload) *(as-needed)* | MSVC + Windows SDK. Required by some Python wheels, native Node modules, and most C/C++ Windows projects. |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) *(as-needed)* | Manages WSL/hypervisor integration and certs; anything outside the official installer is unreliable. |
| [NVIDIA driver](https://www.nvidia.com/Download/index.aspx) + [CUDA Toolkit](https://developer.nvidia.com/cuda-downloads) *(as-needed)* | Driver and toolkit versions are coupled. NVIDIA App handles driver updates afterward. |
| [Microsoft 365](https://www.microsoft.com/en-us/microsoft-365) *(as-needed)* | M365 Click-to-Run is canonical. |
| [TeX Live](https://tug.org/texlive/) *(as-needed)* | TUG installer; conda's `texlive-core` is a subset and not enough. |
| Vendor HW utilities (Samsung Magician, etc.) *(as-needed)* | Pair with firmware updates; vendor tooling is the safe path. |

VS Code's built-in updater is strong; [official](https://code.visualstudio.com/) or choco both work.

## (2) pixi global

common.md's pixi line carries over to Windows unchanged. Windows-eligible additions:

- **full**: `7zip` (CLI `7z`), `rclone`, `yt-dlp`
- **as-needed**: `hugo` (0.121+ ships extended), `go`, `openjdk`

`gh`, `cmake`, `ffmpeg`, `pandoc` are already in common.md, same on Windows (pixi).

When considering moving a CLI from choco to pixi, **verify a win-64 build exists with `pixi search <pkg> --platform win-64` first**. Plain `pixi search` surfaces Linux/macOS-only builds and is misleading. Common CLIs with no win-64 build: `rsync`, `aria2`, `autohotkey`, `scrcpy`.

## (3) choco

[Chocolatey](https://github.com/chocolatey/choco) is the fifth tool manager added on Windows (in addition to common.md's `uv` / `pnpm` / `pixi` / `cargo`). Requires an admin shell.

### Windows-only CLIs and system services

- **minimal**: `nvm` ([nvm-windows](https://github.com/coreybutler/nvm-windows); the bash-based `nvm-sh/nvm` does not run on Windows native), `powertoys`
- **as-needed**: `rsync` (Cygwin build), `aria2`, `autohotkey`, `mingw` (alternative: MSYS2), `winfsp` (kernel-mode driver), `openvpn`, `scrcpy` (Android screen mirror)

### Windows utility GUIs (weak built-in updaters)

choco is the cleanest option here:

- Disk / hardware monitors: `everything`, `treesizefree`, `crystaldiskinfo` / `crystaldiskmark`, `hwinfo` / `hwmonitor`, `procexp`, `rufus`
- Other: `bandizip` (KR), `fiddler`

### GUI apps with strong built-in updaters

Once installed, each app updates itself. Official installers work equally well; choco only buys you bulk-install convenience for bootstrap. **Curate this list to what you actually use; drop the rest.**

- Messaging / conferencing: `slack`, `discord`, `telegram`, `kakaotalk`, `zoom`, `teamviewer`
- Knowledge / notes: `notion`, `obsidian`, `logseq`, `zotero`
- Media: `vlc`, `gimp`
- Browsers: `brave`
- Games / entertainment: `steam`
- Mobile dev: `androidstudio` (`scrcpy` is in the CLI section above)

## WSL 2 resource tuning

WSL 2 defaults can crowd Windows RAM and let distro disks grow far beyond their typical workload. Configure both memory and disk limits per machine instead of leaving the defaults or copying fixed values.

Keep WSL up to date. Current releases improve resource-management defaults, including automatic reclamation of idle Linux cache.

- **RAM:** Tune `memory` and `swap` in `.wslconfig`. Preserve headroom for Windows and treat swap as a short pressure buffer.
- **Disk:** Set `defaultVhdSize` to a reasonable ceiling before creating distros. VHDs grow dynamically rather than preallocating the ceiling, and this setting does not shrink existing disks. Keep logical capacity separate from physical VHDX reclamation; avoid unsafe sparse conversion.
- **Validation:** Check Task Manager, `free -h`, and `df -h` under real workloads. Revisit the limits after hardware, workload, container use, or WSL changes, and back up before disk operations.

## Shell *(minimal)*

[PowerShell 7](https://github.com/PowerShell/PowerShell) is the Windows-native shell; install if not already (replaces stock Windows PowerShell 5.1). Run inside [Windows Terminal](https://github.com/microsoft/terminal), bundled on Win 11.

common.md's zsh + oh-my-zsh setup applies only inside WSL.

## Editor *(minimal)*

[VS Code](https://github.com/microsoft/vscode) per common.md. Windows settings paths: `%APPDATA%\Code\User\settings.json` and `keybindings.json`.

## Keeping tools fresh: Windows addition

After common.md's update one-liner, also run:

```powershell
choco upgrade all -y  # admin shell required
```

## Operational notes

- **Admin shell**: `choco install`/`uninstall`, MSI removals (`msiexec /X`), and driver installs need an elevated PowerShell. Elevate from a non-admin session with `Start-Process powershell -Verb RunAs -Wait`.
- **Choco extraction NULL-byte failure**: occasionally `choco install` fails with `0x00 char at line 1 col 1`; files extract with the correct sizes but content zeroed out (AV interference is the usual suspect). Fix: `Remove-Item -Recurse -Force C:\ProgramData\chocolatey\lib\<pkg>`, then `choco install <pkg> -y --force`. If it recurs, add `C:\ProgramData\chocolatey` to Windows Defender exclusions.
