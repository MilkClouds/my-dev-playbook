#!/usr/bin/env bash
# Install the editable-pptx toolchain locally (no sudo). Idempotent.
#   - pptxgenjs (npm, local)             : build the deck
#   - python-pptx / pymupdf / pillow (uv): QA scripts
#   - pandoc                             : LaTeX -> native equations (must be on PATH)
#   - LibreOffice (system, else AppImage): render pptx -> pdf -> png for QA
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOLS="$HERE/.tools"
mkdir -p "$TOOLS"

echo "[1/4] node deps (pptxgenjs, from package.json)"
( cd "$HERE" && npm install --no-fund --no-audit )

echo "[2/4] python QA deps (uv venv at .tools/venv)"
if command -v uv >/dev/null 2>&1; then
  uv venv "$TOOLS/venv" >/dev/null 2>&1 || true
  uv pip install --python "$TOOLS/venv/bin/python" python-pptx pymupdf pillow >/dev/null
  echo "      venv: $TOOLS/venv  (use: $TOOLS/venv/bin/python scripts/render.py ...)"
else
  echo "      WARN: uv not found — install uv, or pip-install python-pptx pymupdf pillow yourself"
fi

echo "[3/4] pandoc (native equations)"
if command -v pandoc >/dev/null 2>&1; then echo "      $(pandoc --version | head -1)"
else echo "      WARN: pandoc not found — equations (add_equations.py) need it: https://pandoc.org"; fi

echo "[4/4] LibreOffice (pptx -> pdf for QA)"
if command -v soffice >/dev/null 2>&1 || command -v libreoffice >/dev/null 2>&1; then
  echo "      using system LibreOffice"
elif ls "$TOOLS"/squashfs-root/opt/*/program/soffice >/dev/null 2>&1; then
  echo "      AppImage already extracted at $TOOLS/squashfs-root"
else
  # NOTE: third-party AppImage mirror; override with LO_APPIMAGE_URL or install LO via your distro.
  URL="${LO_APPIMAGE_URL:-https://appimages.libreitalia.org/LibreOffice-fresh.standard-x86_64.AppImage}"
  echo "      downloading LibreOffice AppImage (~350 MB) from: $URL"
  wget -q -O "$TOOLS/lo.AppImage" "$URL"
  chmod +x "$TOOLS/lo.AppImage"
  ( cd "$TOOLS" && ./lo.AppImage --appimage-extract >/dev/null )   # no FUSE/sudo needed
  echo "      extracted to $TOOLS/squashfs-root"
fi

echo "done. Try:  node examples/example_deck.js  (see README.md)"
