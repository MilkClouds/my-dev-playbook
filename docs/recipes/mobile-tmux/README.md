# Mobile tmux over Web

This setup exposes an existing `tmux` session to a mobile browser on a private 10.50 network. It is intended for shared cluster nodes where system packages must not be changed.

The shape is:

```text
mobile browser -> 10.50.x.x:7681 auth proxy -> 127.0.0.1:7682 ttyd -> tmux session 0
```

Do not expose `ttyd` itself directly. In practice, `ttyd -c user:pass` can let the page login succeed while the WebSocket connection fails with `User code denied connection`, leaving the browser at "Press Enter to reconnect". The proxy in this directory handles Basic auth for the first page load, sets an HTTP-only cookie, and allows WebSocket upgrades only when that cookie is present.

## Install

Install `ttyd` in the user `pixi` environment:

```bash
pixi global install -c conda-forge ttyd
```

Install the cookie auth proxy:

```bash
mkdir -p ~/.local/bin
cp docs/recipes/mobile-tmux/ttyd-cookie-auth-proxy.mjs ~/.local/bin/
chmod 700 ~/.local/bin/ttyd-cookie-auth-proxy.mjs
```

## Start

This example binds the public side to the first `10.50.*` IPv4 address, keeps the raw `ttyd` server on localhost, and attaches the browser to tmux session `0`.

```bash
state_dir="$HOME/.local/state/ttyd-mobile"
mkdir -p "$state_dir"
chmod 700 "$state_dir"

host_ip="$(ip -o -4 addr show | awk '$4 ~ /^10[.]50[.]/ { split($4, a, "/"); print a[1]; exit }')"
auth_user="$USER"
auth_pass="tmux1234"
auth_secret="$(openssl rand -hex 32)"

printf 'url=http://%s:7681\nusername=%s\npassword=%s\n' \
  "$host_ip" "$auth_user" "$auth_pass" > "$state_dir/credentials"
printf '%s\n' "$auth_secret" > "$state_dir/proxy.secret"
chmod 600 "$state_dir/credentials" "$state_dir/proxy.secret"

env -u TMUX setsid ttyd \
  -i 127.0.0.1 \
  -p 7682 \
  -W \
  /usr/bin/env -u TMUX tmux new -A -s 0 \
  > "$state_dir/ttyd.log" 2>&1 < /dev/null &
echo $! > "$state_dir/ttyd.pid"

AUTH_USER="$auth_user" \
AUTH_PASS="$auth_pass" \
AUTH_SECRET="$auth_secret" \
LISTEN_HOST="$host_ip" \
LISTEN_PORT=7681 \
TARGET_HOST=127.0.0.1 \
TARGET_PORT=7682 \
setsid node ~/.local/bin/ttyd-cookie-auth-proxy.mjs \
  > "$state_dir/proxy.log" 2>&1 < /dev/null &
echo $! > "$state_dir/proxy.pid"

cat "$state_dir/credentials"
```

Open the printed URL from the mobile browser and login with the printed credentials.

## Stop

```bash
state_dir="$HOME/.local/state/ttyd-mobile"
kill "$(cat "$state_dir/proxy.pid")"
kill "$(cat "$state_dir/ttyd.pid")"
```

## Verify

Confirm the raw `ttyd` server is local-only and only the proxy is on the 10.50 address:

```bash
ss -ltnp '( sport = :7681 or sport = :7682 )'
```

Expected shape:

```text
10.50.x.x:7681    node ttyd-cookie-auth-proxy.mjs
127.0.0.1:7682    ttyd
```

Unauthenticated requests should fail:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' "http://$host_ip:7681/"
# 401
```

Authenticated requests should succeed and set the `ttyd_auth` cookie:

```bash
curl -i -u "$USER:tmux1234" "http://$host_ip:7681/token"
```

## Notes

- Use `env -u TMUX` for both `ttyd` and the child `tmux` command. Otherwise, if the launcher shell is already inside tmux, the web terminal can inherit a stale `TMUX` environment and behave like a nested tmux client.
- Use `tmux new -A -s 0` to attach to session `0` when it exists, or create it if it does not.
- Keep the raw `ttyd` process on `127.0.0.1`; the proxy is the only process that should bind to the private network address.
- If a browser still shows "Press Enter to reconnect", open a fresh tab or private tab to clear stale WebSocket/token state, then check `$state_dir/proxy.log` and `$state_dir/ttyd.log`.
