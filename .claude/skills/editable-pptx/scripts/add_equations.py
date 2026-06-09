#!/usr/bin/env python3
"""Inject native PowerPoint equations (OMML) into a .pptx.

The pptxgenjs deck is authored with plain unicode placeholders for each display
equation (e.g. inside a `mathBox`). This script replaces the chosen placeholder
paragraphs with real, editable PowerPoint equation objects.

Usage:
    python add_equations.py in.pptx out.pptx equations.json

equations.json is a list of objects:
    [
      { "slide": 6, "latex": "\\ell_\\theta(\\rho,O)=\\langle\\rho,O(\\theta)\\rangle",
        "anchor": "= ⟨ρ, O(θ)⟩" }
    ]
  - slide  : 1-based slide number (-> ppt/slides/slideN.xml)
  - latex  : the formula (pandoc LaTeX math syntax)
  - anchor : a substring of the placeholder text that is UNIQUE within that slide
             (the whole <a:p> containing it is replaced by the equation)

Requires: pandoc.  Verify the result in real PowerPoint (LibreOffice renders OMML
but is not the authoritative target).
"""
import json, sys, zipfile, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from latex2omml import latex_to_omathpara, omml_drawingml_paragraph


def inject(in_pptx: str, out_pptx: str, eqs: list) -> None:
    zin = zipfile.ZipFile(in_pptx)
    # decode only the slides we touch (other parts may be binary)
    targets = {f"ppt/slides/slide{e['slide']}.xml" for e in eqs}
    sx = {name: zin.read(name).decode("utf-8") for name in targets}

    for e in eqs:
        name = f"ppt/slides/slide{e['slide']}.xml"
        xml, anchor = sx[name], e["anchor"]
        cnt = xml.count(anchor)
        if cnt != 1:
            raise SystemExit(f"anchor {anchor!r} appears {cnt}x in {name} "
                             f"(must be exactly 1 — make it more specific)")
        para = omml_drawingml_paragraph(latex_to_omathpara(e["latex"]), e.get("align", "ctr"))
        k = xml.find(anchor)
        ps = xml.rfind("<a:p>", 0, k)
        pe = xml.find("</a:p>", k) + len("</a:p>")
        sx[name] = xml[:ps] + para + xml[pe:]
        print(f"  injected equation into slide {e['slide']}  (anchor {anchor!r})")

    with zipfile.ZipFile(in_pptx) as zs, zipfile.ZipFile(out_pptx, "w", zipfile.ZIP_DEFLATED) as zd:
        for item in zs.infolist():
            data = sx[item.filename].encode("utf-8") if item.filename in sx else zs.read(item.filename)
            zd.writestr(item, data)
    print(f"wrote {out_pptx}")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit("usage: add_equations.py in.pptx out.pptx equations.json")
    with open(sys.argv[3], encoding="utf-8") as f:
        spec = json.load(f)
    inject(sys.argv[1], sys.argv[2], spec)
