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

The plugin is a single file, so clone to a temp dir, copy it out, and discard the clone:

```bash
tmp=$(mktemp -d) && \
  git clone --depth=1 https://github.com/MilkClouds/my-dev-playbook "$tmp" && \
  dest="${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/plugins/progress-utils" && \
  mkdir -p "$dest" && \
  cp "$tmp/tools/progress-utils/progress-utils.plugin.zsh" "$dest/" && \
  rm -rf "$tmp"
```

Add `progress-utils` to `plugins=(...)` in `~/.zshrc`. To update later, re-run the same block.

## Dependencies

tqdm (`uv tool install tqdm` or `pip install tqdm`), aria2c, rsync.

## Caveats

`cp_` and `mv_` use rsync, which treats trailing slashes differently from GNU cp/mv:

```bash
cp_ abcd  dest/   # copies abcd into dest/abcd/ (same as cp)
cp_ abcd/ dest/   # copies CONTENTS of abcd into dest/ (not same as cp)
```

With GNU cp, `cp -r abcd/ dest/` and `cp -r abcd dest/` behave identically. With rsync, a trailing slash on the source means "contents of this directory" instead of "the directory itself". Watch out for this when using `cp_` and `mv_`.

## PU_COUNT

By default, commands start immediately without scanning total size/count. Set `PU_COUNT=1` to pre-scan first, enabling percentage and ETA display. Works with `rm_` and `tar_`.

```bash
PU_COUNT=1 rm_ huge_dir/           # count files first, then delete with %/ETA
PU_COUNT=1 tar_ big_project/       # scan size first, then compress with %/ETA
export PU_COUNT=1                   # enable for entire session
```
