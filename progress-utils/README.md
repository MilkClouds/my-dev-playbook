# progress-utils

Oh-my-zsh plugin that adds progress bars to common file operations.

| Command | What it wraps | Backend |
|---------|--------------|---------|
| `cp_` | cp | rsync |
| `mv_` | mv | rsync (cleans up empty dirs after) |
| `rm_` | rm | find + tqdm |
| `tar_` | tar + gzip | tar + gzip + tqdm (dual progress bars) |
| `untar_` | tar extract | tqdm + tar (auto-detects gz/bz2/xz/zst) |
| `wget_` | wget | aria2c (16 parallel connections) |

## Install

```bash
git clone https://github.com/MilkClouds/my-dev-playbook ~/.my-dev-playbook
ln -s ~/.my-dev-playbook/progress-utils ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/progress-utils
```

Add `progress-utils` to `plugins=(...)` in `~/.zshrc`.

## Dependencies

tqdm (`uv tool install tqdm` or `pip install tqdm`), aria2c, rsync.

## PU_COUNT

By default, commands start immediately without scanning total size/count. Set `PU_COUNT=1` to pre-scan first, enabling percentage and ETA display. Works with `rm_` and `tar_`.

```bash
PU_COUNT=1 rm_ huge_dir/           # count files first, then delete with %/ETA
PU_COUNT=1 tar_ big_project/       # scan size first, then compress with %/ETA
export PU_COUNT=1                   # enable for entire session
```
