# MCP cache refresh

Force MCP servers to pull latest upstream. Takes effect on next Claude Code restart.

```bash
rm -rf ~/.npm/_npx/*/                                # npx (busy dirs skipped on NFS)
rm -rf ~/.cache/uv/git-v0                            # uv git packages (not the whole cache)
docker pull ghcr.io/github/github-mcp-server:latest  # docker
```

## Troubleshooting

- **npx dir won't delete**: another session holds the mmap lock. Exit all Claude Code sessions first.
- **Specific npx package**: `jq -r '.dependencies|keys[0]' ~/.npm/_npx/*/package.json` to map hash → package.
- **Specific uv git repo**: `rm -rf ~/.cache/uv/git-v0/{db,checkouts}/<hash>` to force re-clone.
