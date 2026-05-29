# pretty-git-diffs

Syntax-highlighted git diffs three places: the plain `git` CLI, the lazygit TUI,
and inside Claude Code's `!` bash prompt. [delta](https://github.com/dandavison/delta)
is the renderer; [lazygit](https://github.com/jesseduffield/lazygit) is the
interactive client.

## Install (no sudo)

```bash
pixi global install git-delta lazygit   # delta binary is `delta`
```

## The three layers

Each surface needs its own config — they don't share one setting.

| Surface | Controlled by | Notes |
|---|---|---|
| CLI `git diff` / `show` / `log -p` | `~/.gitconfig` `core.pager` | git auto-disables it on non-TTY pipes, so it's safe |
| lazygit diff panel | `~/.config/lazygit/config.yml` | lazygit **ignores** `core.pager`; needs its own pager |
| Claude Code `!` bash | `gdd` shell function | see the TTY gotcha below |

### 1. CLI — `~/.gitconfig`

The block recommended by delta's README:

```ini
[core]
    pager = delta
[interactive]
    diffFilter = delta --color-only
[delta]
    navigate = true   # n / N to jump between files
    dark = true       # or light = true
[merge]
    conflictStyle = zdiff3
```

### 2. lazygit — `~/.config/lazygit/config.yml`

```yaml
git:
  paging:
    colorArg: always
    pager: delta --dark --paging=never
```

`--paging=never` is required — otherwise delta launches its own pager inside the
TUI and the panel breaks.

Bonus, run lazygit in a tmux popup (`~/.tmux.conf`):

```tmux
# prefix + g: lazygit in a popup, in the current pane's dir (q to close)
bind g display-popup -E -d "#{pane_current_path}" -w 90% -h 90% "lazygit"
```

`-d "#{pane_current_path}"` is needed — without it the popup opens in tmux's
default dir (often `$HOME`), so lazygit reports "not in a git repository".

### 3. Claude Code `!` — `~/.zshrc`

```zsh
# git diff inside Claude Code's ! (non-TTY): force 256-color so ANSI survives.
gdd() { git diff "$@" | delta --true-color=never --paging=never; }
```

Use as `gdd`, `gdd --staged`, `gdd HEAD~1`.

## The Claude Code `!` gotcha

Full-screen TUIs (lazygit, tig, vim) **cannot** run under `!` — it has no
controlling TTY (`open /dev/tty: no such device`). Run those in a real terminal
or the tmux popup instead.

For plain diffs, the catch is git's own behavior, not Claude Code: git disables
color when stdout isn't a TTY (the `!` capture pipe), so `git diff` shows plain
text. Force color and it renders fine. delta defaults to 24-bit truecolor, which
Claude Code still strips ([claude-code#16790](https://github.com/anthropics/claude-code/issues/16790)),
so drop to 256-color with `--true-color=never` — that's what `gdd` does.
