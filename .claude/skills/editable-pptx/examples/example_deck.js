// Minimal example: build an editable deck with the helper library.
//   node examples/example_deck.js                 -> example.pptx
//   python scripts/add_equations.py example.pptx example_eq.pptx examples/equations.json
//   <venv>/bin/python scripts/render.py example_eq.pptx --montage
const { makeDeck } = require("../lib/deck");

const D = makeDeck({
  title: "Editable PPTX demo",
  author: "me",
  runningHead: "my-dev-playbook · editable-pptx",
});

// --- title slide ---
const s1 = D.slide();
s1.addText(
  [{ text: "Editable PowerPoint ", options: {} },
   { text: "from code", options: { color: D.C.acc, italic: true } }],
  { x: 0.7, y: 2.4, w: 12, h: 1.4, fontFace: D.F.serif, fontSize: 46, valign: "top", margin: 0 }
);
s1.addText("native textboxes · shapes · tables · charts · equations",
  { x: 0.7, y: 3.9, w: 12, h: 0.5, fontFace: D.F.mono, fontSize: 13, color: D.C.mut, margin: 0 });

// --- content slide: card + code + math box + table ---
const s2 = D.slide();
D.chrome(s2, 2, 2, "example · editable-pptx");
D.secLabel(s2, 1.3, "§ 1  ·  building blocks");
D.h2(s2, 1.7, [{ text: "Cards, code, a ", options: {} },
               { text: "math box", options: { color: D.C.acc, italic: true } },
               { text: ", and a table", options: {} }]);

D.card(s2, 0.7, 2.8, 3.8, 1.9, "shape", "Native card", "A real rectangle plus editable textboxes — restyle it in PowerPoint.");
D.codeBox(s2, 4.7, 2.8, 4.0, 1.9, "def energy(m):\n    c = 299792458       # m/s\n    return m * c**2     # E = mc^2", 11);
D.mathBox(s2, 8.9, 2.8, 3.7, 1.9, "E = m c²", "placeholder — run add_equations.py for a native equation");

D.table(s2, 0.7, 5.1, 6.0, [["quantity", "symbol", "value"],
                            ["speed of light", "c", "2.998×10⁸"],
                            ["Planck", "h", "6.626×10⁻³⁴"]], [1, 2]);
D.callout(s2, 7.0, 5.1, 5.6, 1.3,
  "Everything here is a native object: select any piece in PowerPoint and edit it directly.",
  "no images, no flattening", { fs: 13 });

D.save("example.pptx").then((f) => console.log("WROTE", f));
