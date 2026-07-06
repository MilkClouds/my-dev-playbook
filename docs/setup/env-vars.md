# User-Level Environment Variables

Use `~/.config/environment.d/*.conf` for shell-agnostic variables (XDG, paths, tokens). systemd-logind loads them at session start, so they reach interactive shells, scripts, and any non-shell process started from the session: no `export` keyword, no shell-specific file. On modern Linux (including most shared clusters), SSH logins go through logind, so this works out of the box.

## Format

`NAME=VALUE`, one per line, no `export`. A numeric prefix on the filename controls load order.

```ini
# ~/.config/environment.d/50-xdg.conf
XDG_CACHE_HOME=/mnt/fast-storage/cache
XDG_CONFIG_HOME=/mnt/fast-storage/config
```

The [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir-spec/latest/) defines `XDG_CACHE_HOME`, `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `XDG_STATE_HOME`. Most modern CLIs (`uv`, `pip`, `huggingface_hub`, etc.) respect them, so setting these once relocates all compliant tool data.

## Exceptions

- **MANPATH** → set in `~/.zshenv`. `man` is interactive-only, so shell scope is fine, and the trailing-empty-component trick (`export MANPATH="...:${MANPATH}"`) is needed so `man` still searches system defaults. Example: `export MANPATH="$HOME/.pixi/envs/git-subrepo/share/man:${MANPATH}"`.
- **SLURM (`sbatch`/`srun`)** → compute nodes run under `slurmd`, not logind, so `environment.d` is **not** loaded there directly. `sbatch` defaults to `--export=ALL`, which copies the submitter's environment, so vars propagate as long as you submit from a session that already has them (e.g., an SSH login). Watch for `--export=NONE` or CI submitters with stripped environments.
