import React, { useState, useRef, useEffect } from "react";
import { XMarkIcon, FunctionIcon } from "../Icons";

interface EquationEditorTabProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (latex: string) => void;
}

export const EquationEditorTab: React.FC<EquationEditorTabProps> = ({
  isOpen,
  onClose,
  onInsert,
}) => {
  const [tab, setTab] = useState<"EDITOR" | "SYMBOLS">("EDITOR");
  const [latexInput, setLatexInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const symbolCategories = {
    Basic: [
      { l: "×", v: "\\times " },
      { l: "÷", v: "\\div " },
      { l: "≠", v: "\\neq " },
      { l: "±", v: "\\pm " },
      { l: "≤", v: "\\leq " },
      { l: "≥", v: "\\geq " },
      { l: "≈", v: "\\approx " },
      { l: "∞", v: "\\infty " },
    ],
    Greek: [
      { l: "α", v: "\\alpha " },
      { l: "β", v: "\\beta " },
      { l: "θ", v: "\\theta " },
      { l: "π", v: "\\pi " },
      { l: "Δ", v: "\\Delta " },
      { l: "Ω", v: "\\Omega " },
      { l: "∑", v: "\\Sigma " },
    ],
    Calculus: [
      { l: "∫", v: "\\int " },
      { l: "∂", v: "\\partial " },
      { l: "∇", v: "\\nabla " },
      { l: "lim", v: "\\lim\\limits_{x \\to \\infty} " },
    ],
    Symbols: [
      { l: "∠", v: "\\angle " },
      { l: "°", v: "^\\circ " },
      { l: "∈", v: "\\in " },
      { l: "→", v: "\\rightarrow " },
      { l: "Turus", v: "卌" },
    ],
  };

  const templates = [
    { label: "Pecahan", code: "\\frac{x}{y}" },
    { label: "Akar", code: "\\sqrt{x}" },
    { label: "Akar n", code: "\\sqrt[n]{x}" },
    { label: "Pangkat", code: "x^{2}" },
    { label: "Subskrip", code: "x_{i}" },
    { label: "Integral", code: "\\int_{a}^{b} x \\,dx" },
    { label: "Sigma", code: "\\sum_{i=1}^{n} x_i" },
    {
      label: "Matriks 2x2",
      code: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}",
    },
    {
      label: "Matriks nxn",
      code: "\\begin{pmatrix} a_{11} & \\cdots & a_{1n} \\\\ \\vdots & \\ddots & \\vdots \\\\ a_{n1} & \\cdots & a_{nn} \\end{pmatrix}",
    },
    {
      label: "Matriks nx1",
      code: "\\begin{pmatrix} a_{1} \\\\ a_{2} \\\\ \\vdots \\\\ a_{n} \\end{pmatrix}",
    },
    {
      label: "Matriks 1xn",
      code: "\\begin{pmatrix} a_{1} & a_{2} & \\cdots & a_{n} \\end{pmatrix}",
    },
    { label: "Limit", code: "\\lim_{x \\to a} f(x)" },
    { label: "Logaritma", code: "\\log_{a} x" },
    { label: "Kurung Kurawal", code: "\\left\\{ x \\right\\}" },
    { label: "Kurung Biasa", code: "\\left( x \\right)" },
    { label: "Kurung Siku", code: "\\left[ x \\right]" },
    { label: "Permutasi", code: "_{n}P_{r}" },
    { label: "Kombinasi", code: "_{n}C_{r}" },
    { label: "Vektor", code: "\\vec{v}" },
    {
      label: "Vektor Kolom",
      code: "\\begin{pmatrix} x \\\\ y \\\\ z \\end{pmatrix}",
    },
    { label: "Nilai Mutlak", code: "\\left| x \\right|" },
    {
      label: "Fungsi Piecewise",
      code: "\\begin{cases} x, & \\text{jika } x > 0 \\\\ -x, & \\text{jika } x \\leq 0 \\end{cases}",
    },
    { label: "Irisan Himpunan", code: "A \\cap B" },
    { label: "Gabungan Himpunan", code: "A \\cup B" },
    { label: "Turunan (dy/dx)", code: "\\frac{dy}{dx}" },
  ];

  const insertAtCursor = (code: string) => {
    if (!inputRef.current) return;
    const textarea = inputRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const newValue = before + code + after;
    setLatexInput(newValue);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(
          start + code.length,
          start + code.length,
        );
      }
    }, 0);
  };

  useEffect(() => {
    if (previewContainerRef.current) {
      const w = window as any;
      if (w.katex && latexInput.trim()) {
        try {
          w.katex.render(latexInput, previewContainerRef.current, {
            throwOnError: false,
            displayMode: true,
          });
        } catch (e) {
          previewContainerRef.current.innerText = "Format tidak valid";
        }
      } else {
        previewContainerRef.current.innerHTML =
          '<span class="text-gray-400 text-sm">Preview (Ketik untuk melihat hasil)</span>';
      }
    }
  }, [latexInput, tab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-slate-700 flex flex-col max-h-[90vh]">
        <div className="bg-gray-50 dark:bg-slate-900 p-4 border-b dark:border-slate-700 flex justify-between items-center">
          <h3 className="text-md font-bold text-gray-700 dark:text-slate-200">
            Math Pro Editor
          </h3>
          <button type="button" onClick={onClose}>
            <XMarkIcon className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300" />
          </button>
        </div>

        <div className="flex bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700 relative z-10 shrink-0">
          {["EDITOR", "SYMBOLS"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t as any)}
              className={`px-4 py-3 text-xs font-bold tracking-wider ${tab === t ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 bg-white dark:bg-slate-800" : "text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"}`}
            >
              {t === "EDITOR" ? "KODE LATEX" : "DAFTAR SIMBOL"}
            </button>
          ))}
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto p-4 relative z-0">
          {tab === "EDITOR" && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">
                  Template Cepat
                </label>
                <div className="flex flex-wrap gap-2">
                  {templates.map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() => insertAtCursor(t.code)}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-indigo-100 dark:hover:bg-slate-600 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors shadow-sm"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  Input LaTeX
                </label>
                <textarea
                  ref={inputRef}
                  value={latexInput}
                  onChange={(e) => setLatexInput(e.target.value)}
                  placeholder="Ketik kode LaTeX di sini (contoh: \sqrt{x^2 + y^2})"
                  className="w-full p-4 font-mono text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 dark:text-slate-200 min-h-[140px] resize-y shadow-inner"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  Preview KaTeX
                </label>
                <div
                  ref={previewContainerRef}
                  className="w-full min-h-[120px] max-h-[250px] p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 overflow-auto shadow-sm text-center"
                />
              </div>
            </div>
          )}

          {tab === "SYMBOLS" && (
            <div className="space-y-6">
              {Object.entries(symbolCategories).map(([cat, syms]) => (
                <div key={cat}>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-3 border-b border-gray-100 dark:border-slate-700 pb-2">
                    {cat}
                  </h4>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                    {syms.map((s) => (
                      <button
                        key={s.l}
                        type="button"
                        onClick={() => {
                          setTab("EDITOR");
                          insertAtCursor(s.v);
                        }}
                        className="aspect-square flex items-center justify-center text-lg font-serif bg-gray-50 dark:bg-slate-700/50 border border-gray-100 dark:border-slate-600 rounded-xl hover:bg-indigo-50 dark:hover:bg-slate-600 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors shadow-sm"
                      >
                        {s.l}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 font-bold text-xs text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => {
              onInsert(latexInput);
              onClose();
            }}
            disabled={!latexInput.trim()}
            className="px-5 py-2.5 font-bold text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sisipkan Formula
          </button>
        </div>
      </div>
    </div>
  );
};

export const VisualMathModal = EquationEditorTab;
