#!/usr/bin/env python3
"""Render a .pptx to per-slide PNGs (+ optional montage) for visual QA.

Pipeline:  pptx --(LibreOffice headless)--> pdf --(PyMuPDF)--> png [--> montage]

LibreOffice substitutes fonts it does not have (e.g. IBM Plex, CJK) and its OMML
rendering is approximate, so this is a *preview*, not pixel-truth for PowerPoint.

Usage:  python render.py deck.pptx [--out DIR] [--montage] [--zoom 1.4]
Finds soffice on PATH, else the AppImage under ../.tools/squashfs-root.
Requires (in your QA venv):  pymupdf, pillow
"""
import argparse, glob, os, shutil, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
TOOLS = os.path.join(HERE, "..", ".tools")


def find_soffice():
    p = shutil.which("soffice") or shutil.which("libreoffice")
    if p:
        return p
    hits = glob.glob(os.path.join(TOOLS, "squashfs-root", "opt", "*", "program", "soffice"))
    if hits:
        return hits[0]
    sys.exit("soffice not found — run scripts/setup.sh (installs the LibreOffice AppImage)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pptx")
    ap.add_argument("--out", default=None, help="output dir (default: alongside pptx)")
    ap.add_argument("--montage", action="store_true")
    ap.add_argument("--zoom", type=float, default=1.4)
    a = ap.parse_args()

    pptx = os.path.abspath(a.pptx)
    out = os.path.abspath(a.out) if a.out else os.path.dirname(pptx)
    os.makedirs(out, exist_ok=True)
    soffice = find_soffice()

    with tempfile.TemporaryDirectory() as prof:
        subprocess.run([soffice, "--headless", f"-env:UserInstallation=file://{prof}",
                        "--convert-to", "pdf", "--outdir", out, pptx],
                       check=True, capture_output=True, env={**os.environ, "HOME": prof})
    pdf = os.path.join(out, os.path.splitext(os.path.basename(pptx))[0] + ".pdf")

    import fitz  # PyMuPDF
    doc = fitz.open(pdf)
    pngs = []
    for i in range(doc.page_count):
        png = os.path.join(out, f"slide{i+1:02d}.png")
        doc[i].get_pixmap(matrix=fitz.Matrix(a.zoom, a.zoom)).save(png)
        pngs.append(png)
    print(f"rendered {len(pngs)} slides -> {out}")

    if a.montage and pngs:
        from PIL import Image
        ims = [Image.open(p) for p in pngs]
        w, h = ims[0].size
        cols = 3
        rows = (len(ims) + cols - 1) // cols
        pad = 8
        sheet = Image.new("RGB", (cols * w + (cols + 1) * pad, rows * h + (rows + 1) * pad), "white")
        for i, im in enumerate(ims):
            r, c = divmod(i, cols)
            sheet.paste(im, (pad + c * (w + pad), pad + r * (h + pad)))
        mpath = os.path.join(out, "montage.png")
        sheet.save(mpath)
        print(f"montage -> {mpath}")


if __name__ == "__main__":
    main()
