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
  cp "$tmp/progress-utils/progress-utils.plugin.zsh" "$dest/" && \
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

### Symlinks

`rm_` and `mv_` match GNU `rm` / `mv` semantics and **never follow symlinks** into their target directories:

- `rm_ link` and `rm_ link/` both just unlink the symlink itself; the linked directory's contents are preserved.
- `mv_ link dest/` and `mv_ link/ dest/` both move the symlink itself (falls back to GNU `mv` internally).
- `rm_ dir` with symlinks inside deletes `dir` and unlinks the inner symlinks, but never touches the files they point to.

This is important because naive `find dir/ -delete` or `rsync -a link/` will dereference a trailing-slash'd symlink argument and recurse into the target — potentially wiping out files you did not intend to touch. `rm_` and `mv_` are explicitly hardened against this.

## PU_COUNT

By default, commands start immediately without scanning total size/count. Set `PU_COUNT=1` to pre-scan first, enabling percentage and ETA display. Works with `rm_` and `tar_`.

```bash
PU_COUNT=1 rm_ huge_dir/           # count files first, then delete with %/ETA
PU_COUNT=1 tar_ big_project/       # scan size first, then compress with %/ETA
export PU_COUNT=1                   # enable for entire session
```
