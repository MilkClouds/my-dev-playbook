---
name: editable-pptx
description: Build fully editable PowerPoint (.pptx) decks from code — native textboxes, shapes, tables, charts, and real PowerPoint equations (LaTeX→OMML) — so the result stays editable in PowerPoint instead of being flat images. Use this whenever the user wants to make, generate, build, or rebuild a slide deck, presentation, or .pptx, including turning notes, a paper, a markdown outline, or an HTML deck into slides, adding editable equations to slides, or producing a deck programmatically — even if they don't say "pptx" explicitly. Prefer it over exporting images or hand-placing text boxes. Triggers on "make/build slides", "presentation", "slide deck", "pptx", "editable slides", "PowerPoint equations", "turn this into slides".
---

# editable-pptx

Generate decks where **every element is a native, editable PowerPoint object** —
text is a textbox, boxes/dividers are shapes, tables/charts are native — plus
**real PowerPoint equations** (not pictures). Reproducible from a build script.

This is an original toolkit (MIT). It does **not** copy or derive from Anthropic's
source-available `pptx` skill; it reimplements a build-then-QA workflow and adds
native-equation injection independently, on open tools (pptxgenjs, pandoc,
LibreOffice).

```
lib/deck.js            reusable pptxgenjs helpers: chrome, secLabel, h2, bullets,
                       card, codeBox (+Python syntax highlight), mathBox, callout, table
scripts/setup.sh       install toolchain locally (no sudo)
scripts/latex2omml.py  LaTeX → OMML fragment (pandoc)
scripts/add_equations.py  inject native equations into a built .pptx
scripts/render.py      pptx → pdf → png (+montage) visual QA via LibreOffice
scripts/check.py       structural QA: shape/text inventory + overlap / off-canvas finder
examples/              runnable example_deck.js + equations.json
```

## When invoked

1. **Set up once** (if `node_modules/` or `.tools/` are missing): `bash scripts/setup.sh`.
2. **Author** the deck in JS using `lib/deck.js` (one slide builder per slide).
3. **Build**: `node <deck>.js` → `.pptx`.
4. **Add native equations** (optional): `python scripts/add_equations.py in.pptx out.pptx equations.json`.
5. **QA**: `scripts/render.py` (preview montage) and `scripts/check.py` (overlap/overflow).
6. **Hand the .pptx to the user to confirm in real PowerPoint** — the QA renderer
   is LibreOffice, which is not pixel-truth for fonts or equations.

## Setup

```bash
bash scripts/setup.sh
```

Installs `pptxgenjs` (npm, from `package.json`), a uv venv at `.tools/venv` with
`python-pptx`/`pymupdf`/`pillow`, checks `pandoc`, and uses system LibreOffice or
extracts a LibreOffice AppImage into `.tools/`. Needs **node**, **uv** (or pip),
and **pandoc** (only for equations) on PATH.

## Build a deck

```js
const { makeDeck } = require("./lib/deck");
const D = makeDeck({ title: "My Talk", author: "me", runningHead: "My Talk · 2026" });

const s = D.slide();
D.chrome(s, 1, 10, "source · citation");      // top bar + page no. + footer
D.secLabel(s, 1.3, "§ 1  ·  intro");
D.h2(s, 1.7, [{ text: "A title with an ", options: {} },
              { text: "accent", options: { color: D.C.acc, italic: true } }]);
D.card(s, 0.7, 2.8, 3.8, 1.9, "tag", "Card title", "body text");
D.codeBox(s, 4.7, 2.8, 4.0, 1.9, "def f(x):\n    return x  # comment");
D.mathBox(s, 8.9, 2.8, 3.7, 1.9, "E = m c²", "caption");
D.table(s, 0.7, 5.0, 6, [["a","b","c"],["1","2","3"]]);
D.save("deck.pptx");
```

Coordinates are inches on a 13.333 × 7.5 (16:9) canvas; colors are hex without `#`
(`D.C` palette, `D.F` fonts). Override `colors`/`fonts`/size via `makeDeck(opts)`.
See `lib/deck.js` for every helper and `examples/example_deck.js` for a full deck.

## Native equations

`pptxgenjs` can't emit PowerPoint equations, so:

1. Put each display formula as a **unicode placeholder** (e.g. via `mathBox`).
2. Build, then run `add_equations.py` with an `equations.json` list of
   `{ "slide": <1-based>, "latex": "...", "anchor": "<unique substring on that slide>" }`.
   It converts LaTeX→OMML (pandoc) and replaces the placeholder paragraph with an
   `a14:m`/`m:oMath` block PowerPoint opens as an editable equation.

Inline math inside running text stays unicode (already editable); converting it to
inline OMML means splitting runs and is rarely worth it.

## Limitations

- **LibreOffice QA ≠ PowerPoint.** It substitutes missing fonts and renders OMML
  approximately — always confirm the final file in real PowerPoint.
- **Fonts:** decks default to IBM Plex; PowerPoint substitutes if absent. Pass your
  own `fonts`, or embed fonts on save when sharing.
- **Absolute layout** (inches): content changes can overflow — `check.py` catches it.
- **LibreOffice AppImage** comes from a third-party mirror by default; override
  `LO_APPIMAGE_URL` or install LibreOffice from your distro for trust.
