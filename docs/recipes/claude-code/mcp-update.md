# MCP cache refresh

How to force MCP servers to re-fetch upstream. Most installs already use `@latest` or git URL HEAD, so just restarting the Claude Code session pulls the newest version. The methods below additionally force the local cache to be rebuilt.

Effect timing: running MCP processes are reused for the current session. New caches take effect from the next session start.

## npx packages

Cache at `~/.npm/_npx/<hash>/`. Each hash dir has a `package.json` naming the package.

```bash
# Map hashes → packages
for d in ~/.npm/_npx/*/; do
  pkg=$(jq -r '.dependencies | keys[0]' "$d/package.json" 2>/dev/null)
  echo "$(basename "$d") → $pkg"
done

# Force fresh fetch on next launch
rm -rf ~/.npm/_npx/<hash>
```

NFS caveat: native libs (e.g. `@napi-rs/canvas` in `pdf-reader-mcp`) are mmap-loaded by every running MCP. On NFS, open files become `.nfs*` locks and the dir won't fully delete until *every* Claude Code session sharing the cache exits.

## uv git packages (`uv tool run --with git+URL ...`)

Two complementary layers:

```bash
# 1) wheels / archive / environments — keyed by package name
uv cache clean --force <pkg>...

# 2) git clone mirror — only if you want a fresh clone instead of `git fetch` on the existing mirror
for d in ~/.cache/uv/git-v0/db/*/; do
  echo "$(basename "$d") → $(head -1 "$d/.git/FETCH_HEAD")"
done
rm -rf ~/.cache/uv/git-v0/{db,checkouts}/<hash>
```

`--force` bypasses the cache lock when another uv process is active; it doesn't kill anything. For most "update" intents, layer 1 alone is enough.

## Docker-based MCPs

```bash
docker pull ghcr.io/github/github-mcp-server:latest
```

Superseded layers stay as `<none>` tags. Don't `docker image prune` blindly — other images may share layers.
