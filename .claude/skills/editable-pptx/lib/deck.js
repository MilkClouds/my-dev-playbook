// editable-pptx · reusable pptxgenjs helper library
// Original work (MIT). Builds native-editable PowerPoint slides: every text is a
// textbox, every box/divider is a shape, tables/charts are native objects.
// Pair with scripts/add_equations.py to turn chosen text into native PPT equations.
"use strict";
const pptxgen = require("pptxgenjs");

const DEFAULT_COLORS = {
  ink: "1a1a1a", mut: "666666", soft: "999999", acc: "0f62fe",
  accSoft: "e5efff", warn: "a52121", rule: "e6e6e6", ruleS: "cfcfcf", soft2: "fafafa",
  kw: "0f62fe", fn: "005ea0", str: "7e4a2a", num: "5a5a5a", com: "6a6a6a",
};
const DEFAULT_FONTS = { sans: "IBM Plex Sans", serif: "IBM Plex Serif", mono: "IBM Plex Mono" };

// --- minimal Python syntax highlighter -> pptxgenjs rich-text runs ---
const PY_KW = new Set(("import from as for in def return lambda if elif else while and or " +
  "not with class True False None yield try except finally raise pass break continue " +
  "global nonlocal assert del is await async").split(" "));
function findHash(line) {
  let q = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === q) q = null; }
    else if (c === '"' || c === "'") q = c;
    else if (c === "#") return i;
  }
  return -1;
}
function highlight(code, C) {
  const out = [];
  String(code).split("\n").forEach((line) => {
    if (line.trim() === "") { out.push({ text: " ", options: { breakLine: true } }); return; }
    const hi = findHash(line);
    let cp = line, cm = null;
    if (hi >= 0) { cp = line.slice(0, hi); cm = line.slice(hi); }
    const toks = cp.match(/("[^"]*"|'[^']*'|\b\d+\.?\d*\b|[A-Za-z_]\w*|\s+|[^\sA-Za-z_0-9]+)/g) || [];
    const runs = [];
    toks.forEach((t, i) => {
      let color = C.ink, bold = false;
      if (/^["']/.test(t)) color = C.str;
      else if (/^\d/.test(t)) color = C.num;
      else if (/^[A-Za-z_]/.test(t)) {
        if (PY_KW.has(t)) { color = C.kw; bold = true; }
        else { let j = i + 1; while (j < toks.length && /^\s+$/.test(toks[j])) j++; if (j < toks.length && toks[j].startsWith("(")) color = C.fn; }
      }
      runs.push({ text: t, options: { color, bold } });
    });
    if (cm) runs.push({ text: cm, options: { color: C.com, italic: true } });
    if (runs.length === 0) runs.push({ text: " ", options: {} });
    runs[runs.length - 1].options.breakLine = true;
    out.push(...runs);
  });
  return out;
}

/**
 * Create a deck with bound helpers.
 * opts: { title, author, runningHead, colors, fonts, width, height, margin, h2Size }
 * Default canvas is 13.333 x 7.5 in (16:9 widescreen).
 */
function makeDeck(opts = {}) {
  const C = Object.assign({}, DEFAULT_COLORS, opts.colors);
  const F = Object.assign({}, DEFAULT_FONTS, opts.fonts);
  const W = opts.width || 13.333, H = opts.height || 7.5, MX = opts.margin || 0.7;
  const pres = new pptxgen();
  pres.defineLayout({ name: "DECK", width: W, height: H });
  pres.layout = "DECK";
  if (opts.author) pres.author = opts.author;
  if (opts.title) pres.title = opts.title;

  const slide = (bg) => { const s = pres.addSlide(); s.background = { color: bg || "FFFFFF" }; return s; };

  function chrome(s, page, total, src) {
    if (opts.runningHead)
      s.addText(opts.runningHead, { x: MX, y: 0.26, w: 8, h: 0.3, fontFace: F.mono, fontSize: 10, color: C.mut, valign: "middle", margin: 0 });
    if (page != null)
      s.addText(`${page} / ${total != null ? total : "?"}`, { x: W - MX - 2, y: 0.26, w: 2, h: 0.3, fontFace: F.mono, fontSize: 10, color: C.mut, align: "right", valign: "middle", margin: 0 });
    s.addShape(pres.shapes.LINE, { x: MX, y: 0.6, w: W - 2 * MX, h: 0, line: { color: C.rule, width: 1 } });
    if (src)
      s.addText(src, { x: MX, y: H - 0.46, w: 9, h: 0.3, fontFace: F.mono, fontSize: 9.5, color: C.mut, valign: "middle", margin: 0 });
  }
  function secLabel(s, y, txt) {
    s.addShape(pres.shapes.LINE, { x: MX, y: y + 0.13, w: 0.35, h: 0, line: { color: C.acc, width: 2 } });
    s.addText(String(txt).toUpperCase(), { x: MX + 0.5, y, w: 11, h: 0.3, fontFace: F.mono, fontSize: 11, color: C.acc, charSpacing: 2, valign: "middle", margin: 0 });
  }
  // runs: string | [{text, options:{color,italic,bold}}]
  function h2(s, y, runs, w) {
    const arr = Array.isArray(runs) ? runs.map((r) => ({ text: r.text, options: Object.assign({}, r.options) })) : [{ text: String(runs), options: {} }];
    s.addText(arr, { x: MX, y, w: w || W - 2 * MX, h: 0.95, fontFace: F.serif, fontSize: opts.h2Size || 28, color: C.ink, valign: "top", lineSpacingMultiple: 1.05, margin: 0 });
  }
  // items: array of (string | run-array). Rendered as accent em-dash bullets in one textbox.
  function bullets(s, x, y, w, h, items, fs) {
    fs = fs || 12.5;
    const runs = [];
    items.forEach((it, idx) => {
      const itRuns = (typeof it === "string") ? [{ text: it, options: {} }] : it;
      runs.push({ text: "—  ", options: { color: C.acc, bold: true } });
      itRuns.forEach((r) => runs.push({ text: r.text, options: Object.assign({}, r.options) }));
      runs.push({ text: "", options: { breakLine: true } });
      if (idx < items.length - 1) runs.push({ text: "", options: { breakLine: true } });
    });
    s.addText(runs, { x, y, w, h, fontFace: F.sans, fontSize: fs, color: C.ink, valign: "top", lineSpacingMultiple: 1.12, margin: 0 });
  }
  function mathBox(s, x, y, w, h, eq, label) {
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: C.soft2 }, line: { type: "none" } });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.05, h, fill: { color: C.acc }, line: { type: "none" } });
    s.addText(eq, { x: x + 0.2, y: y + 0.1, w: w - 0.4, h: h - (label ? 0.55 : 0.2), fontFace: F.serif, italic: true, fontSize: 18, color: C.ink, align: "center", valign: "middle", margin: 0 });
    if (label) s.addText(label, { x: x + 0.2, y: y + h - 0.45, w: w - 0.4, h: 0.35, fontFace: F.mono, fontSize: 9.5, color: C.mut, align: "center", valign: "middle", margin: 0 });
  }
  function callout(s, x, y, w, h, text, src, o) {
    o = o || {};
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: o.bg || C.accSoft }, line: { type: "none" } });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.05, h, fill: { color: o.bar || C.acc }, line: { type: "none" } });
    s.addText(text, { x: x + 0.22, y: y + 0.12, w: w - 0.45, h: h - (src ? 0.5 : 0.24), fontFace: F.serif, italic: true, fontSize: o.fs || 14, color: C.ink, valign: "top", lineSpacingMultiple: 1.15, margin: 0 });
    if (src) s.addText(String(src).toUpperCase(), { x: x + 0.22, y: y + h - 0.42, w: w - 0.45, h: 0.32, fontFace: F.mono, fontSize: 9, color: C.mut, charSpacing: 1, valign: "middle", margin: 0 });
  }
  function card(s, x, y, w, h, tag, title, body, o) {
    o = o || {};
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: "FFFFFF" }, line: { color: o.border || C.rule, width: o.border ? 1.5 : 1 } });
    s.addText(String(tag).toUpperCase(), { x: x + 0.18, y: y + 0.14, w: w - 0.36, h: 0.25, fontFace: F.mono, fontSize: 9.5, color: o.tagColor || C.acc, charSpacing: 1, margin: 0 });
    s.addText(title, { x: x + 0.18, y: y + 0.42, w: w - 0.36, h: 0.42, fontFace: F.sans, bold: true, fontSize: 15, color: C.ink, valign: "top", margin: 0 });
    s.addText(body, { x: x + 0.18, y: y + 0.9, w: w - 0.36, h: h - 1.05, fontFace: F.sans, fontSize: 10.5, color: C.mut, valign: "top", lineSpacingMultiple: 1.1, margin: 0 });
  }
  function codeBox(s, x, y, w, h, code, fs) {
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: C.soft2 }, line: { color: C.rule, width: 1 } });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.05, h, fill: { color: C.acc }, line: { type: "none" } });
    s.addText(highlight(code, C), { x: x + 0.18, y: y + 0.1, w: w - 0.32, h: h - 0.2, fontFace: F.mono, fontSize: fs || 9, valign: "top", lineSpacingMultiple: 1.05, margin: 0 });
  }
  // rows: [[header...],[row...]]. hi=[rowIndex,colIndex] highlights one cell in warn color.
  function table(s, x, y, w, rows, hi) {
    const head = rows[0].map((t) => ({ text: t, options: { color: C.acc, bold: true, fontFace: F.mono, fontSize: 10, fill: { color: "FFFFFF" }, align: "left" } }));
    const body = rows.slice(1).map((r, ri) => r.map((t, ci) => ({ text: t, options: { color: (hi && hi[0] === ri + 1 && hi[1] === ci) ? C.warn : C.ink, fontFace: F.mono, fontSize: 10, align: ci === 0 ? "left" : "right", fill: { color: "FFFFFF" } } })));
    const n = rows[0].length;
    const colW = Array.from({ length: n }, (_, i) => (i === 0 ? w * 0.34 : (w * 0.66) / (n - 1)));
    s.addTable([head, ...body], { x, y, w, colW, border: [{ position: "bottom", pt: 0.5, color: C.rule }], rowH: 0.32, valign: "middle", margin: [2, 4, 2, 4] });
  }
  const save = (file) => pres.writeFile({ fileName: file });

  return { pres, shapes: pres.shapes, charts: pres.charts, C, F, W, H, MX,
           slide, chrome, secLabel, h2, bullets, mathBox, callout, card, codeBox, table, save,
           highlight: (c) => highlight(c, C) };
}

module.exports = { makeDeck, DEFAULT_COLORS, DEFAULT_FONTS, highlight };
