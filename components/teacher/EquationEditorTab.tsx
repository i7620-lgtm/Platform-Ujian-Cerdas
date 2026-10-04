import React, { useState, useRef, useEffect } from "react";
import { XMarkIcon } from "../Icons";
import { renderLatexToString, normalizeLatex } from "../../utils/mathRenderer";

interface EquationEditorTabProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (latex: string) => void;
}

type SymbolCategoryKey = "Semua" | "Dasar" | "Huruf Yunani" | "Kalkulus & Aljabar" | "Himpunan & Geometri" | "Turus & Khusus";

export const EquationEditorTab: React.FC<EquationEditorTabProps> = ({
  isOpen,
  onClose,
  onInsert,
}) => {
  const [rightPanelTab, setRightPanelTab] = useState<"TEMPLATES" | "SYMBOLS">("TEMPLATES");
  const [symbolCat, setSymbolCat] = useState<SymbolCategoryKey>("Semua");
  const [symbolSearch, setSymbolSearch] = useState("");
  const [latexInput, setLatexInput] = useState("");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const lastSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const symbolCategories: Record<Exclude<SymbolCategoryKey, "Semua">, Array<{ l: string; v: string; name?: string }>> = {
    Dasar: [
      { l: "+", v: " + ", name: "tambah" },
      { l: "-", v: " - ", name: "kurang" },
      { l: "×", v: "\\times ", name: "kali" },
      { l: "÷", v: "\\div ", name: "bagi" },
      { l: "=", v: " = ", name: "sama dengan" },
      { l: "≠", v: "\\neq ", name: "tidak sama dengan" },
      { l: "±", v: "\\pm ", name: "plus minus" },
      { l: "∓", v: "\\mp ", name: "minus plus" },
      { l: "≤", v: "\\leq ", name: "kurang dari sama dengan" },
      { l: "≥", v: "\\geq ", name: "lebih dari sama dengan" },
      { l: "<", v: " < ", name: "kurang dari" },
      { l: ">", v: " > ", name: "lebih dari" },
      { l: "≈", v: "\\approx ", name: "mendekati" },
      { l: "≡", v: "\\equiv ", name: "identik" },
      { l: "∝", v: "\\propto ", name: "sebanding" },
      { l: "∞", v: "\\infty ", name: "tak terhingga" },
      { l: "√x", v: "\\sqrt{x} ", name: "akar kuadrat" },
      { l: "·", v: "\\cdot ", name: "titik kali" },
      { l: "…", v: "\\dots ", name: "titik-titik" },
    ],
    "Huruf Yunani": [
      { l: "α", v: "\\alpha ", name: "alpha" },
      { l: "β", v: "\\beta ", name: "beta" },
      { l: "γ", v: "\\gamma ", name: "gamma" },
      { l: "θ", v: "\\theta ", name: "theta" },
      { l: "π", v: "\\pi ", name: "pi" },
      { l: "Δ", v: "\\Delta ", name: "delta besar" },
      { l: "δ", v: "\\delta ", name: "delta kecil" },
      { l: "λ", v: "\\lambda ", name: "lambda" },
      { l: "μ", v: "\\mu ", name: "mu" },
      { l: "σ", v: "\\sigma ", name: "sigma kecil" },
      { l: "Σ", v: "\\Sigma ", name: "sigma besar" },
      { l: "Ω", v: "\\Omega ", name: "omega besar" },
      { l: "ω", v: "\\omega ", name: "omega kecil" },
      { l: "ϕ", v: "\\phi ", name: "phi" },
      { l: "ρ", v: "\\rho ", name: "rho" },
      { l: "τ", v: "\\tau ", name: "tau" },
      { l: "ε", v: "\\varepsilon ", name: "epsilon" },
    ],
    "Kalkulus & Aljabar": [
      { l: "∫", v: "\\int ", name: "integral" },
      { l: "∬", v: "\\iint ", name: "integral ganda" },
      { l: "∮", v: "\\oint ", name: "integral lintasan" },
      { l: "∂", v: "\\partial ", name: "turunan parsial" },
      { l: "∇", v: "\\nabla ", name: "gradien nabla" },
      { l: "lim x→a", v: "\\lim_{x \\to a} ", name: "limit x mendekati a" },
      { l: "lim x→∞", v: "\\lim_{x \\to \\infty} ", name: "limit x mendekati tak hingga" },
      { l: "dx", v: "\\,dx", name: "diferensial dx" },
      { l: "dt", v: "\\,dt", name: "diferensial dt" },
      { l: "dy/dx", v: "\\frac{dy}{dx}", name: "turunan dy dx" },
      { l: "d²y/dx²", v: "\\frac{d^2y}{dx^2}", name: "turunan kedua" },
      { l: "f'(x)", v: "f'(x)", name: "f aksen x" },
      { l: "∑ i=1..n", v: "\\sum_{i=1}^{n} ", name: "notasi sigma" },
      { l: "∏ i=1..n", v: "\\prod_{i=1}^{n} ", name: "notasi perkalian" },
    ],
    "Himpunan & Geometri": [
      { l: "∠", v: "\\angle ", name: "sudut" },
      { l: "°", v: "^{\\circ}", name: "derajat" },
      { l: "∈", v: "\\in ", name: "anggota himpunan" },
      { l: "∉", v: "\\notin ", name: "bukan anggota" },
      { l: "⊂", v: "\\subset ", name: "subset bagian" },
      { l: "⊆", v: "\\subseteq ", name: "subset sama" },
      { l: "∩", v: "\\cap ", name: "irisan himpunan" },
      { l: "∪", v: "\\cup ", name: "gabungan himpunan" },
      { l: "∅", v: "\\emptyset ", name: "himpunan kosong" },
      { l: "→", v: "\\rightarrow ", name: "panah kanan" },
      { l: "⇒", v: "\\Rightarrow ", name: "maka implikasi" },
      { l: "⇔", v: "\\Leftrightarrow ", name: "jika dan hanya jika" },
      { l: "∀", v: "\\forall ", name: "untuk semua" },
      { l: "∃", v: "\\exists ", name: "terdapat ada" },
      { l: "∥", v: "\\parallel ", name: "sejajar" },
      { l: "⊥", v: "\\perp ", name: "tegak lurus" },
      { l: "△", v: "\\triangle ", name: "segitiga" },
      { l: "□", v: "\\square ", name: "persegi" },
      { l: "v⃗", v: "\\vec{v}", name: "vektor v" },
      { l: "AB̅", v: "\\overline{AB}", name: "ruas garis AB" },
    ],
    "Turus & Khusus": [
      { l: "卌 (5)", v: "卌", name: "turus lima" },
      { l: "I (1)", v: "I", name: "turus satu" },
      { l: "II (2)", v: "II", name: "turus dua" },
      { l: "III (3)", v: "III", name: "turus tiga" },
      { l: "IIII (4)", v: "IIII", name: "turus empat" },
      { l: "ℝ", v: "\\mathbb{R}", name: "bilangan real" },
      { l: "ℕ", v: "\\mathbb{N}", name: "bilangan asli" },
      { l: "ℤ", v: "\\mathbb{Z}", name: "bilangan bulat" },
      { l: "cm²", v: "\\text{ cm}^2", name: "sentimeter persegi" },
      { l: "cm³", v: "\\text{ cm}^3", name: "sentimeter kubik" },
      { l: "m²", v: "\\text{ m}^2", name: "meter persegi" },
      { l: "m³", v: "\\text{ m}^3", name: "meter kubik" },
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

  const updateSelectionRange = () => {
    if (inputRef.current) {
      lastSelectionRef.current = {
        start: inputRef.current.selectionStart ?? 0,
        end: inputRef.current.selectionEnd ?? 0,
      };
    }
  };

  const insertAtCursor = (code: string) => {
    let start = lastSelectionRef.current.start;
    let end = lastSelectionRef.current.end;

    if (inputRef.current) {
      start = inputRef.current.selectionStart ?? start;
      end = inputRef.current.selectionEnd ?? end;
    }

    const safeStart = Math.max(0, Math.min(start, latexInput.length));
    const safeEnd = Math.max(0, Math.min(end, latexInput.length));

    const before = latexInput.substring(0, safeStart);
    const after = latexInput.substring(safeEnd, latexInput.length);
    const newValue = before + code + after;
    setLatexInput(newValue);

    const newCursorPos = safeStart + code.length;
    lastSelectionRef.current = { start: newCursorPos, end: newCursorPos };

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
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
          '<div class="text-slate-400 text-sm flex flex-col items-center justify-center gap-1.5"><span class="text-2xl opacity-60">📐</span><span>Pratinjau rumus akan muncul di sini secara real-time.</span><span class="text-xs text-slate-400/80">Ketik rumus atau klik simbol/template di sebelah kanan.</span></div>';
      }
    }
  }, [latexInput]);

  if (!isOpen) return null;

  // Filtered symbols
  const allSymbolsList: Array<{ l: string; v: string; name?: string; cat: string }> = [];
  Object.entries(symbolCategories).forEach(([cat, syms]) => {
    syms.forEach((s) => allSymbolsList.push({ ...s, cat }));
  });

  const displayedSymbols = allSymbolsList.filter((s) => {
    const matchCat = symbolCat === "Semua" || s.cat === symbolCat;
    if (!matchCat) return false;
    if (!symbolSearch.trim()) return true;
    const q = symbolSearch.toLowerCase();
    return s.l.toLowerCase().includes(q) || s.v.toLowerCase().includes(q) || (s.name && s.name.toLowerCase().includes(q));
  });

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[94vh]">
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
                Buat rumus matematika visual, simbol lengkap, dan dukungan baris baru bertingkat
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

        {/* Modal Body - 2 Columns Layout Desktop */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 relative z-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* KOLOM KIRI (DESKTOP): Preview KaTeX (Always Visible) */}
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
                className="w-full min-h-[220px] lg:min-h-[300px] max-h-[420px] p-5 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-slate-100 overflow-auto shadow-inner flex items-center justify-center text-center select-text"
              />

              {/* Tips Card */}
              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 rounded-xl text-slate-600 dark:text-slate-300 text-xs space-y-1.5 shadow-sm">
                <div className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                  <span>💡</span> Tips Editing Rumus:
                </div>
                <ul className="text-[11px] leading-relaxed space-y-1 list-disc pl-4 text-slate-600 dark:text-slate-300">
                  <li>
                    <strong>Tekan Enter</strong> langsung di kotak teks untuk membuat baris baru bertingkat.
                  </li>
                  <li>
                    Gunakan simbol <strong>&amp;</strong> untuk menyejajarkan posisi tanda sama dengan (<code className="font-mono bg-white dark:bg-slate-800 px-1 rounded">=</code>).
                  </li>
                  <li>
                    Klik simbol pada <strong>Daftar Simbol</strong> untuk langsung menyisipkan simbol di posisi kursor.
                  </li>
                  <li>
                    Gunakan <kbd className="font-mono bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[10px]">Ctrl</kbd>+<kbd className="font-mono bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[10px]">Enter</kbd> untuk langsung menyisipkan rumus.
                  </li>
                </ul>
              </div>
            </div>

            {/* KOLOM KANAN (DESKTOP): Sub-panel Switcher + Templates/Symbols + Input LaTeX */}
            <div className="lg:col-span-7 flex flex-col gap-4 order-1 lg:order-2">
              
              {/* Mode Switcher: Template Cepat vs Daftar Simbol Lengkap */}
              <div className="flex bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setRightPanelTab("TEMPLATES")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    rightPanelTab === "TEMPLATES"
                      ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <span>⚡</span> Template Cepat
                </button>
                <button
                  type="button"
                  onClick={() => setRightPanelTab("SYMBOLS")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    rightPanelTab === "SYMBOLS"
                      ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <span>🔣</span> Daftar Simbol Lengkap ({allSymbolsList.length})
                </button>
              </div>

              {/* PANEL 1: TEMPLATES & QUICK SYMBOLS */}
              {rightPanelTab === "TEMPLATES" && (
                <div className="space-y-3">
                  {/* Template Cepat */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <span>⚡</span> Template Formula
                      </label>
                      <span className="text-[11px] text-slate-400">
                        Klik untuk menyisipkan ke kursor
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto p-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/80">
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

                  {/* Quick Math Symbols Row */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase mr-1 shrink-0">
                      Simbol Cepat:
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
                </div>
              )}

              {/* PANEL 2: DAFTAR SIMBOL LENGKAP */}
              {rightPanelTab === "SYMBOLS" && (
                <div className="space-y-2.5 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  {/* Category Filter Pills & Search */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                      {(["Semua", "Dasar", "Huruf Yunani", "Kalkulus & Aljabar", "Himpunan & Geometri", "Turus & Khusus"] as SymbolCategoryKey[]).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSymbolCat(cat)}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition shrink-0 ${
                            symbolCat === cat
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      value={symbolSearch}
                      onChange={(e) => setSymbolSearch(e.target.value)}
                      placeholder="Cari simbol..."
                      className="px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 dark:text-slate-200 w-full sm:w-32 shrink-0"
                    />
                  </div>

                  {/* Symbols Grid */}
                  <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5 max-h-[160px] overflow-y-auto p-1">
                    {displayedSymbols.map((s, idx) => (
                      <button
                        key={`${s.l}-${idx}`}
                        type="button"
                        title={`${s.name || s.l} (${s.v.trim()})`}
                        onClick={() => insertAtCursor(s.v)}
                        className="h-10 flex flex-col items-center justify-center text-sm font-serif bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 transition shadow-sm hover:scale-105 active:scale-95"
                      >
                        <span className="font-bold leading-none">{s.l}</span>
                      </button>
                    ))}
                    {displayedSymbols.length === 0 && (
                      <div className="col-span-full py-4 text-center text-xs text-slate-400">
                        Tidak ada simbol yang sesuai dengan pencarian.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. Input LaTeX - ALWAYS Visible on the right */}
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
                      onClick={() => {
                        setLatexInput("");
                        lastSelectionRef.current = { start: 0, end: 0 };
                        if (inputRef.current) inputRef.current.focus();
                      }}
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
                  onChange={(e) => {
                    setLatexInput(e.target.value);
                    updateSelectionRange();
                  }}
                  onSelect={updateSelectionRange}
                  onClick={updateSelectionRange}
                  onKeyUp={updateSelectionRange}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ketik kode LaTeX di sini. Tekan Enter untuk baris baru. Contoh:\n2x + 3y = 12\n4x - y = 5\n\natau pecahan: \\frac{3}{4} + \\sqrt{16}`}
                  rows={6}
                  className="w-full p-3.5 font-mono text-xs sm:text-sm leading-relaxed bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:text-slate-100 resize-y shadow-inner"
                />
              </div>
            </div>
          </div>
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
