# Migrate from oh-my-claudecode to claude-pace statusline

Remove [oh-my-claudecode](https://github.com/oh-my-claudecode/oh-my-claudecode) (OMC) and install [Astro-Han/claude-pace](https://github.com/Astro-Han/claude-pace) as the Claude Code statusline. Idempotent — safe to re-run on partially-cleaned hosts.

## Prerequisites — confirm before running

1. **OS**: Linux / macOS / Windows (git-bash). Windows users should run `python` (the `python3` on `PATH` is often the Microsoft Store stub).
2. **`jq`**: claude-pace requires it. `which jq` — if missing, see [Step 8](#8-install-jq-if-missing).
3. **Scattered `.omc/` scope**: run `find ~ -maxdepth 7 -type d -name ".omc"` first and decide whether to wipe everything or only your workspace. Sync folders (OneDrive, iCloud, Dropbox) may hold per-project notepads/research you want to keep.
4. **Plugin-installed OMC?**: `grep -E "enabledPlugins|oh-my-claudecode" ~/.claude/settings.json`. If OMC is registered in `enabledPlugins`, [Step 5](#5-update-settingsjson--plugin-metadata) is mandatory — otherwise Claude Code re-installs it on next plugin reload.

## Pitfalls

- **`enabledPlugins` desired state**: deleting plugin files alone is not enough. The marketplace entry in `settings.json` must be removed.
- **`.omc-managed` skill directories**: `~/.claude/skills/<name>/.omc-managed` marks an OMC-owned skill. Removing only the marker leaves the skill orphaned; remove the whole directory.
- **`find -exec rm -rf {} +` returns exit 0 even on partial failure**: synced or non-ASCII paths sometimes fail. Re-scan in [Step 7](#7-verify) and retry individual paths.
- **Windows `cp949` stdout**: Python `print` of non-ASCII characters (em-dash, etc.) crashes on Windows shells. Use `PYTHONIOENCODING=utf-8` and ASCII-only.
- **Windows statusLine command**: `~/.claude/statusline.sh` in `settings.json` may not work — Windows Claude Code may not expand `~` or execute `.sh` directly. [Step 5](#5-update-settingsjson--plugin-metadata) writes an absolute `bash <path>` wrapper on Windows.

## 1. Survey (read-only)

```bash
find ~/.claude ~/.local/state ~/.bun -maxdepth 5 \( -iname "*omc*" -o -iname "*oh-my-claude*" -o -iname "*sisyphus*" \) 2>/dev/null
find ~ -maxdepth 7 -type d -name ".omc" 2>/dev/null
ls ~/.bun/bin/ 2>/dev/null | grep -iE "omc|oh-my-claude"
grep -c "OMC" ~/.claude/CLAUDE.md 2>/dev/null
find ~/.claude/skills -maxdepth 3 -name ".omc-managed" -type f 2>/dev/null
python -c "import json,os; s=json.load(open(os.path.expanduser('~/.claude/settings.json'))); print('enabled:', list(s.get('enabledPlugins',{}).keys()))"
which jq
```

Review the output and decide the `.omc/` scope before continuing.

## 2. Cancel active OMC modes (optional)

If `/oh-my-claudecode:cancel` is still callable, run `/oh-my-claudecode:cancel --force`. Otherwise skip.

## 3. Remove OMC files

```bash
# Plugin tree + state
rm -rf ~/.claude/plugins/cache/omc \
       ~/.claude/plugins/marketplaces/omc \
       ~/.claude/plugins/data/oh-my-claudecode-omc \
       ~/.claude/plugins/oh-my-claudecode \
       ~/.claude/hud \
       ~/.claude/.omc \
       ~/.omc ~/.nvm/.omc ~/.local/state/omc \
       ~/.claude/.omc-version.json ~/.claude/.omc-config.json

# OMC-managed skill dirs
find ~/.claude/skills -maxdepth 3 -name ".omc-managed" -type f 2>/dev/null | while read marker; do
  rm -rf "$(dirname "$marker")"
done

# Scattered .omc/ — adjust the search root to the scope chosen in Step 1
find "$HOME" -maxdepth 7 -type d -name ".omc" -exec rm -rf {} + 2>/dev/null

# Bun globals
rm -f ~/.bun/bin/{omc,oh-my-claudecode,omc-cli,omc-analytics} 2>/dev/null
rm -f ~/.bun/install/global/node_modules/.bin/{omc,oh-my-claudecode,omc-cli,omc-analytics} 2>/dev/null
rm -rf ~/.bun/install/global/node_modules/oh-my-claude-sisyphus 2>/dev/null
rm -rf ~/.bun/install/cache/oh-my-claude-sisyphus* 2>/dev/null

# Auto-memory remnants
find ~/.claude/projects -path '*/memory/*omc*' -delete 2>/dev/null
```

## 4. Strip OMC block from global CLAUDE.md

```bash
sed -i.bak '/<!-- OMC:START -->/,/<!-- OMC:END -->/d' ~/.claude/CLAUDE.md
sed -i 's|<!-- User customizations -->||; s|, including OMC directives||g' ~/.claude/CLAUDE.md
awk 'NF || p {print; p=1}' ~/.claude/CLAUDE.md > /tmp/cm && mv /tmp/cm ~/.claude/CLAUDE.md
rm -f ~/.claude/CLAUDE.md.bak
```

## 5. Update settings.json + plugin metadata

```bash
PYTHONIOENCODING=utf-8 python <<'PY'
import json, os, platform
from datetime import datetime, timezone
home = os.path.expanduser("~/.claude")
now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")

# Windows: ~/.sh exec is not guaranteed in statusLine command
if platform.system() == "Windows":
    sl_cmd = f"bash {home.replace(chr(92), '/')}/statusline.sh"
else:
    sl_cmd = "~/.claude/statusline.sh"

sp = f"{home}/settings.json"
with open(sp, encoding="utf-8") as f: s = json.load(f)
s.setdefault("enabledPlugins", {}).pop("oh-my-claudecode@omc", None)
s["enabledPlugins"]["claude-pace@claude-pace"] = True
s.setdefault("extraKnownMarketplaces", {}).pop("omc", None)
s["extraKnownMarketplaces"]["claude-pace"] = {
    "source": {"source": "github", "repo": "Astro-Han/claude-pace"},
    "autoUpdate": True,
}
s["statusLine"] = {"type": "command", "command": sl_cmd}
with open(sp, "w", encoding="utf-8") as f: json.dump(s, f, indent=2)
print("A) settings.json updated")

ip = f"{home}/plugins/installed_plugins.json"
if os.path.exists(ip):
    with open(ip, encoding="utf-8") as f: d = json.load(f)
    d.setdefault("plugins", {}).pop("oh-my-claudecode@omc", None)
    d["plugins"]["claude-pace@claude-pace"] = [{
        "scope": "user",
        "installPath": f"{home}/plugins/cache/claude-pace/claude-pace/0.6.0",
        "version": "0.6.0", "installedAt": now, "lastUpdated": now,
    }]
    with open(ip, "w", encoding="utf-8") as f: json.dump(d, f, indent=2)
    print("B) installed_plugins.json updated")
else:
    print("B) installed_plugins.json not present - skipped")

km = f"{home}/plugins/known_marketplaces.json"
if os.path.exists(km):
    with open(km, encoding="utf-8") as f: d = json.load(f)
    d.pop("omc", None)
    d["claude-pace"] = {
        "source": {"source": "github", "repo": "Astro-Han/claude-pace"},
        "installLocation": f"{home}/plugins/marketplaces/claude-pace",
        "lastUpdated": now, "autoUpdate": True,
    }
    with open(km, "w", encoding="utf-8") as f: json.dump(d, f, indent=2)
    print("C) known_marketplaces.json updated")
else:
    print("C) known_marketplaces.json not present - skipped")
PY
```

## 6. Install claude-pace

```bash
mkdir -p ~/.claude/plugins/marketplaces
git clone --depth=1 https://github.com/Astro-Han/claude-pace.git ~/.claude/plugins/marketplaces/claude-pace

DEST=~/.claude/plugins/cache/claude-pace/claude-pace/0.6.0
mkdir -p "$DEST"
cp -r ~/.claude/plugins/marketplaces/claude-pace/. "$DEST/"
rm -rf "$DEST/.git"

curl -fsSL -o ~/.claude/statusline.sh https://raw.githubusercontent.com/Astro-Han/claude-pace/main/claude-pace.sh
chmod +x ~/.claude/statusline.sh
```

## 7. Verify

```bash
echo "--- claude-pace test ---"
echo '{"model":{"display_name":"Opus"},"workspace":{"current_dir":"'"$PWD"'"},"session_id":"test"}' | bash ~/.claude/statusline.sh

echo "--- OMC remnant scan (should be empty) ---"
find ~/.claude ~/.local/state ~/.bun -maxdepth 5 \( -iname "*oh-my-claude*" -o -iname "*sisyphus*" \) 2>/dev/null | grep -v node_modules
find ~ -maxdepth 7 -type d -name ".omc" 2>/dev/null

echo "--- enabled plugins ---"
PYTHONIOENCODING=utf-8 python -c "import json,os; s=json.load(open(os.path.expanduser('~/.claude/settings.json'),encoding='utf-8')); print('plugins:', list(s['enabledPlugins'].keys())); print('marketplaces:', list(s['extraKnownMarketplaces'].keys())); print('statusLine:', s['statusLine'])"
```

Expected: claude-pace prints `<model> <effort> | <project> (<branch>)` and a progress bar. `5h --`/`7d --` placeholders are normal until Claude Code starts logging usage. Both remnant scans return nothing. `enabledPlugins` contains `claude-pace@claude-pace` only; `extraKnownMarketplaces` contains `claude-pace` only.

If a leftover `.omc/` appears (often inside non-ASCII or synced paths), remove it explicitly with `rm -rf "<full path>"`.

## 8. Install jq (if missing)

If verification prints `Claude [needs jq]`, install jq.

- **pixi + conda-forge** (best when it works): `pixi global install -c conda-forge jq`. May fail on hosts where pixi can't reach conda-forge; fall through to the next option.
- **Windows package managers**: `winget install jqlang.jq` or `choco install jq`.
- **macOS**: `brew install jq`.
- **Linux**: `sudo apt install jq` / `sudo dnf install jq`.
- **Static binary fallback** (works everywhere):

  ```bash
  mkdir -p ~/.local/bin
  # Windows
  curl -fsSL -o ~/.local/bin/jq.exe https://github.com/jqlang/jq/releases/download/jq-1.7.1/jq-windows-amd64.exe
  # macOS Apple Silicon
  # curl -fsSL -o ~/.local/bin/jq https://github.com/jqlang/jq/releases/download/jq-1.7.1/jq-macos-arm64
  # Linux x64
  # curl -fsSL -o ~/.local/bin/jq https://github.com/jqlang/jq/releases/download/jq-1.7.1/jq-linux-amd64
  chmod +x ~/.local/bin/jq*
  ```

  Ensure `~/.local/bin` is on `PATH` (`echo $PATH | tr ':' '\n' | grep -F ~/.local/bin`).

## 9. Restart Claude Code

Restart the Claude Code client so the new `statusLine` is picked up.

If the statusline appears blank on Windows after restart, edit `~/.claude/settings.json` and replace `~/.claude/statusline.sh` with the absolute `bash <full path>/statusline.sh` form.

## Notes

- `~/.codex/prompts/sisyphus-lite.md`, if present, may have been installed by OMC. Confirm with the user before removing — it might be in use by an unrelated tool (e.g. `omx`).
- The `find $HOME -maxdepth 7` depth may miss deeply nested workspaces. Increase it if the survey output looks incomplete.
- pixi global install can fail with `No candidates were found for jq *` even when conda-forge is the configured channel; the static binary fallback is the most reliable route.
