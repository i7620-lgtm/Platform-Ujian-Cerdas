import React, { useState, useRef, useEffect } from "react";
import { XMarkIcon, FunctionIcon } from "../Icons";
import { renderLatexToString, normalizeLatex } from "../../utils/mathRenderer";

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
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const symbolCategories = {
    Dasar: [
      { l: "×", v: "\\times " },
      { l: "÷", v: "\\div " },
      { l: "≠", v: "\\neq " },
      { l: "±", v: "\\pm " },
      { l: "≤", v: "\\leq " },
      { l: "≥", v: "\\geq " },
      { l: "≈", v: "\\approx " },
      { l: "∞", v: "\\infty " },
      { l: "≡", v: "\\equiv " },
      { l: "∝", v: "\\propto " },
      { l: "√", v: "\\sqrt{} " },
    ],
    "Huruf Yunani": [
      { l: "α", v: "\\alpha " },
      { l: "β", v: "\\beta " },
      { l: "γ", v: "\\gamma " },
      { l: "θ", v: "\\theta " },
      { l: "π", v: "\\pi " },
      { l: "Δ", v: "\\Delta " },
      { l: "λ", v: "\\lambda " },
      { l: "μ", v: "\\mu " },
      { l: "σ", v: "\\sigma " },
      { l: "Ω", v: "\\Omega " },
      { l: "∑", v: "\\sum " },
      { l: "ϕ", v: "\\phi " },
      { l: "ω", v: "\\omega " },
    ],
    "Kalkulus & Aljabar": [
      { l: "∫", v: "\\int " },
      { l: "∬", v: "\\iint " },
      { l: "∂", v: "\\partial " },
      { l: "∇", v: "\\nabla " },
      { l: "lim", v: "\\lim\\limits_{x \\to \\infty} " },
      { l: "dx", v: "\\,dx" },
      { l: "dt", v: "\\,dt" },
      { l: "dy/dx", v: "\\frac{dy}{dx}" },
    ],
    "Himpunan & Geometri": [
      { l: "∠", v: "\\angle " },
      { l: "°", v: "^{\\circ}" },
      { l: "∈", v: "\\in " },
      { l: "∉", v: "\\notin " },
      { l: "⊂", v: "\\subset " },
      { l: "∩", v: "\\cap " },
      { l: "∪", v: "\\cup " },
      { l: "→", v: "\\rightarrow " },
      { l: "⇒", v: "\\Rightarrow " },
      { l: "⇔", v: "\\Leftrightarrow " },
      { l: "∀", v: "\\forall " },
      { l: "∃", v: "\\exists " },
      { l: "Turus (卌)", v: "卌" },
    ],
  };

  const templates = [
    { label: "Pecahan", code: "\\frac{a}{b}" },
    { label: "Akar Kuadrat", code: "\\sqrt{x}" },
    { label: "Akar Pangkat n", code: "\\sqrt[n]{x}" },
    { label: "Pangkat", code: "x^{2}" },
    { label: "Subskrip", code: "x_{i}" },
    { label: "+ Baris Baru (↵)", code: "\n" },
    {
      label: "Sistem Persamaan",
      code: "\\begin{cases} 2x + y = 10 \\\\ x - 3y = -2 \\end{cases}",
    },
    {
      label: "Persamaan Bertingkat (&)",
      code: "f(x) &= 2x + 1 \\\\\n&= 2(3) + 1 \\\\\n&= 7",
    },
    { label: "Integral Tentu", code: "\\int_{a}^{b} f(x) \\,dx" },
    { label: "Sigma Deret", code: "\\sum_{i=1}^{n} x_i" },
    {
      label: "Matriks 2x2",
      code: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}",
    },
    {
      label: "Matriks 3x3",
      code: "\\begin{pmatrix} a_{11} & a_{12} & a_{13} \\\\ a_{21} & a_{22} & a_{23} \\\\ a_{31} & a_{32} & a_{33} \\end{pmatrix}",
    },
    {
      label: "Vektor Kolom",
      code: "\\begin{pmatrix} x \\\\ y \\\\ z \\end{pmatrix}",
    },
    { label: "Limit Fungsi", code: "\\lim_{x \\to a} f(x)" },
    { label: "Logaritma", code: "\\log_{a} x" },
    { label: "Nilai Mutlak", code: "\\left| x \\right|" },
    { label: "Kurung Biasa", code: "\\left( x \\right)" },
    { label: "Kurung Kurawal", code: "\\left\\{ x \\right\\}" },
    { label: "Kurung Siku", code: "\\left[ x \\right]" },
    { label: "Permutasi (nPr)", code: "_{n}P_{r}" },
    { label: "Kombinasi (nCr)", code: "_{n}C_{r}" },
    { label: "Vektor", code: "\\vec{v}" },
    { label: "Irisan Himpunan", code: "A \\cap B" },
    { label: "Gabungan Himpunan", code: "A \\cup B" },
  ];

  const quickSymbols = [
    { label: "+", code: " + " },
    { label: "-", code: " - " },
    { label: "×", code: "\\times " },
    { label: "÷", code: "\\div " },
    { label: "=", code: " = " },
    { label: "≠", code: "\\neq " },
    { label: "±", code: "\\pm " },
    { label: "≤", code: "\\leq " },
    { label: "≥", code: "\\geq " },
    { label: "x", code: "x" },
    { label: "y", code: "y" },
    { label: "& (Align)", code: "&" },
    { label: "\\\\ (Break)", code: "\\\\\n" },
    { label: "\\pi", code: "\\pi " },
    { label: "\\theta", code: "\\theta " },
    { label: "\\alpha", code: "\\alpha " },
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
        const cursorPosition = start + code.length;
        inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, 0);
  };

  const handleCopyCode = () => {
    if (!latexInput) return;
    navigator.clipboard.writeText(latexInput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (latexInput.trim()) {
        onInsert(normalizeLatex(latexInput));
        onClose();
      }
    }
  };

  useEffect(() => {
    if (previewContainerRef.current) {
      if (latexInput.trim()) {
        try {
          const rendered = renderLatexToString(latexInput, true);
          previewContainerRef.current.innerHTML = rendered;
        } catch {
          previewContainerRef.current.innerText = "Format LaTeX belum valid";
        }
      } else {
        previewContainerRef.current.innerHTML =
          '<div class="text-slate-400 text-sm flex flex-col items-center justify-center gap-1.5"><span class="text-2xl opacity-60">📐</span><span>Pratinjau rumus akan muncul di sini secara real-time.</span><span class="text-xs text-slate-400/80">Ketik rumus atau klik template di sebelah kanan.</span></div>';
      }
    }
  }, [latexInput, tab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-900 px-5 py-3.5 border-b dark:border-slate-700 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-base shadow-sm">
              ∑
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Editor Rumus Matematika (KaTeX / LaTeX)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Buat dan sesuaikan rumus matematika secara visual dengan dukungan multi-baris
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-100 dark:bg-slate-900/80 border-b dark:border-slate-700 px-5 gap-2 relative z-10 shrink-0">
          {[
            { id: "EDITOR", label: "KODE & EDITOR LATEX" },
            { id: "SYMBOLS", label: "DAFTAR SIMBOL LENGKAP" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as any)}
              className={`px-4 py-2.5 text-xs font-bold tracking-wide transition-all border-b-2 ${
                tab === t.id
                  ? "text-indigo-600 dark:text-indigo-400 border-indigo-600 bg-white dark:bg-slate-800 rounded-t-lg shadow-sm"
                  : "text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 relative z-0">
          {tab === "EDITOR" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* KOLOM KIRI (DESKTOP): Preview KaTeX */}
              <div className="lg:col-span-5 flex flex-col gap-3 order-2 lg:order-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Preview KaTeX
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Real-time visual rendering
                  </span>
                </div>

                {/* Preview Box Container */}
                <div
                  ref={previewContainerRef}
                  className="w-full min-h-[200px] lg:min-h-[290px] max-h-[420px] p-5 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-slate-100 overflow-auto shadow-inner flex items-center justify-center text-center select-text"
                />

                {/* Tips Card */}
                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 rounded-xl text-slate-600 dark:text-slate-300 text-xs space-y-1.5 shadow-sm">
                  <div className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                    <span>💡</span> Tips Editing Multi-Baris:
                  </div>
                  <ul className="text-[11px] leading-relaxed space-y-1 list-disc pl-4 text-slate-600 dark:text-slate-300">
                    <li>
                      <strong>Tekan Enter</strong> langsung di kotak teks untuk membuat baris baru bertingkat.
                    </li>
                    <li>
                      Gunakan simbol <strong>&amp;</strong> untuk menyejajarkan posisi tanda sama dengan (<code className="font-mono bg-white dark:bg-slate-800 px-1 rounded">=</code>).
                    </li>
                    <li>
                      Gunakan <kbd className="font-mono bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[10px]">Ctrl</kbd>+<kbd className="font-mono bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[10px]">Enter</kbd> untuk langsung menyisipkan rumus.
                    </li>
                  </ul>
                </div>
              </div>

              {/* KOLOM KANAN (DESKTOP): Template Cepat & Input LaTeX */}
              <div className="lg:col-span-7 flex flex-col gap-4 order-1 lg:order-2">
                {/* 1. Template Cepat */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span>⚡</span> Template Cepat
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Klik untuk menyisipkan formula
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-[145px] overflow-y-auto p-1 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/80">
                    {templates.map((t) => (
                      <button
                        key={t.label}
                        type="button"
                        onClick={() => insertAtCursor(t.code)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 ${
                          t.label.includes("Baris Baru")
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Quick Math Symbols Row */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase mr-1 shrink-0">
                    Simbol:
                  </span>
                  {quickSymbols.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => insertAtCursor(s.code)}
                      className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-xs font-mono font-bold transition shrink-0 border border-slate-200 dark:border-slate-700"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* 3. Input LaTeX */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span>✍️</span> Input LaTeX
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        disabled={!latexInput.trim()}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-40"
                      >
                        {copied ? "✓ Tersalin" : "Salin Kode"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLatexInput("")}
                        disabled={!latexInput.trim()}
                        className="text-[11px] font-bold text-red-500 hover:underline disabled:opacity-40"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>

                  <textarea
                    ref={inputRef}
                    value={latexInput}
                    onChange={(e) => setLatexInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Ketik kode LaTeX di sini. Tekan Enter untuk baris baru. Contoh:\n2x + 3y = 12\n4x - y = 5\n\natau pecahan: \\frac{3}{4} + \\sqrt{16}`}
                    rows={7}
                    className="w-full p-3.5 font-mono text-xs sm:text-sm leading-relaxed bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:text-slate-100 resize-y shadow-inner"
                  />
                </div>
              </div>
            </div>
          )}

          {tab === "SYMBOLS" && (
            <div className="space-y-6">
              {Object.entries(symbolCategories).map(([cat, syms]) => (
                <div key={cat} className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 pb-1.5">
                    {cat}
                  </h4>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                    {syms.map((s) => (
                      <button
                        key={s.l}
                        type="button"
                        onClick={() => {
                          setTab("EDITOR");
                          insertAtCursor(s.v);
                        }}
                        className="aspect-square flex flex-col items-center justify-center p-2 text-lg font-serif bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-indigo-50 dark:hover:bg-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm hover:scale-105"
                      >
                        <span>{s.l}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
            {latexInput.trim() ? (
              <span>
                Karakter: <strong>{latexInput.length}</strong> | Baris:{" "}
                <strong>{latexInput.split("\n").length}</strong>
              </span>
            ) : (
              <span>Siap mengetik formula</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => {
                onInsert(normalizeLatex(latexInput));
                onClose();
              }}
              disabled={!latexInput.trim()}
              className="px-5 py-2.5 font-bold text-xs bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200 dark:shadow-indigo-950 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <span>✓</span> Sisipkan Formula
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const VisualMathModal = EquationEditorTab;
