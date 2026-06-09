#!/usr/bin/env python3
"""Convert a LaTeX math string to an OOXML <m:oMathPara> fragment via pandoc.

pptxgenjs cannot emit native PowerPoint equations; this produces the OMML that
scripts/add_equations.py injects into a generated .pptx so the formula opens as
a real, editable equation object in PowerPoint.

Usage (CLI):  python latex2omml.py 'E = mc^2'
Usage (lib):  from latex2omml import latex_to_omathpara
Requires:     pandoc (https://pandoc.org)
"""
import subprocess, sys, tempfile, zipfile, os, shutil


def latex_to_omathpara(latex: str) -> str:
    """Return the <m:oMathPara>...</m:oMathPara> OMML fragment for a LaTeX string."""
    if shutil.which("pandoc") is None:
        raise RuntimeError("pandoc not found — install it for native equations (https://pandoc.org)")
    with tempfile.TemporaryDirectory() as d:
        md = os.path.join(d, "eq.md")
        docx = os.path.join(d, "eq.docx")
        with open(md, "w", encoding="utf-8") as f:
            f.write("$$" + latex + "$$\n")
        subprocess.run(["pandoc", "-f", "markdown", "-t", "docx", "-o", docx, md],
                       check=True, capture_output=True)
        xml = zipfile.ZipFile(docx).read("word/document.xml").decode("utf-8")
    i = xml.find("<m:oMathPara")
    j = xml.find("</m:oMathPara>") + len("</m:oMathPara>")
    if i < 0:
        raise RuntimeError(f"pandoc produced no OMML for: {latex!r}")
    return xml[i:j]


# Wrap an OMML paragraph for a DrawingML (PowerPoint) text body.
A14_NS = "http://schemas.microsoft.com/office/drawing/2010/main"
MATH_NS = "http://schemas.openxmlformats.org/officeDocument/2006/math"

def omml_drawingml_paragraph(omathpara: str, align: str = "ctr") -> str:
    """Wrap an <m:oMathPara> as an <a:p> usable inside a pptx text body."""
    return (f'<a:p><a:pPr algn="{align}"/>'
            f'<a14:m xmlns:a14="{A14_NS}" xmlns:m="{MATH_NS}">{omathpara}</a14:m></a:p>')


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("usage: latex2omml.py '<latex>'")
    print(latex_to_omathpara(sys.argv[1]))
