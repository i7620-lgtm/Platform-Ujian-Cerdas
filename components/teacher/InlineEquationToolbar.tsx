import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDownIcon, CheckIcon } from "../Icons";
import { renderLatexToString, normalizeLatex } from "../../utils/mathRenderer";

export type EquationCategoryKey =
  | "PECAHAN_DASAR"
  | "PANGKAT_AKAR"
  | "YUNANI"
  | "ALJABAR_KALKULUS"
  | "GEOMETRI_HIMPUNAN"
  | "MATRIKS_VEKTOR"
  | "TURUS_SATUAN";

export interface MathItem {
  id: string;
  label: string;
  code: string;
  name: string;
  category: EquationCategoryKey;
  isTemplate?: boolean;
}

interface InlineEquationToolbarProps {
  onInsert: (latex: string) => void;
  selectedMathLatex?: string | null;
  onUpdateSelectedMath?: (newLatex: string) => void;
  onDeleteSelectedMath?: () => void;
  onCancelEditSelectedMath?: () => void;
  onStartInlineLatex?: () => void;
  isInlineEditingActive?: boolean;
  activeLatex?: string | null;
}

const CATEGORY_DEFINITIONS: Record<
  EquationCategoryKey,
  { label: string; shortLabel: string; icon: string }
> = {
  PECAHAN_DASAR: {
    label: "Pecahan & Operasi Dasar",
    shortLabel: "Pecahan & Dasar",
    icon: "½",
  },
  PANGKAT_AKAR: {
    label: "Pangkat, Akar & Logaritma",
    shortLabel: "Pangkat & Akar",
    icon: "x²",
  },
  YUNANI: {
    label: "Huruf Yunani",
    shortLabel: "Yunani",
    icon: "αβ",
  },
  ALJABAR_KALKULUS: {
    label: "Aljabar & Kalkulus",
    shortLabel: "Aljabar & Kalkulus",
    icon: "∫∑",
  },
  GEOMETRI_HIMPUNAN: {
    label: "Geometri, Logika & Himpunan",
    shortLabel: "Geometri & Himpunan",
    icon: "∠∩",
  },
  MATRIKS_VEKTOR: {
    label: "Matriks & Vektor",
    shortLabel: "Matriks & Vektor",
    icon: "▦",
  },
  TURUS_SATUAN: {
    label: "Turus & Satuan Khusus",
    shortLabel: "Turus & Satuan",
    icon: "卌",
  },
};

const ALL_MATH_ITEMS: MathItem[] = [
  // 1. PECAHAN & OPERASI DASAR
  { id: "frac", label: "a/b", code: "\\frac{a}{b}", name: "Pecahan biasa a per b", category: "PECAHAN_DASAR", isTemplate: true },
  { id: "mixed_frac", label: "c a/b", code: "c\\frac{a}{b}", name: "Pecahan campuran", category: "PECAHAN_DASAR", isTemplate: true },
  { id: "plus", label: "+", code: " + ", name: "tambah plus", category: "PECAHAN_DASAR" },
  { id: "minus", label: "−", code: " - ", name: "kurang minus", category: "PECAHAN_DASAR" },
  { id: "times", label: "×", code: "\\times ", name: "kali silang", category: "PECAHAN_DASAR" },
  { id: "div", label: "÷", code: "\\div ", name: "bagi", category: "PECAHAN_DASAR" },
  { id: "cdot", label: "·", code: "\\cdot ", name: "titik kali", category: "PECAHAN_DASAR" },
  { id: "equal", label: "=", code: " = ", name: "sama dengan", category: "PECAHAN_DASAR" },
  { id: "neq", label: "≠", code: "\\neq ", name: "tidak sama dengan", category: "PECAHAN_DASAR" },
  { id: "pm", label: "±", code: "\\pm ", name: "plus minus", category: "PECAHAN_DASAR" },
  { id: "mp", label: "∓", code: "\\mp ", name: "minus plus", category: "PECAHAN_DASAR" },
  { id: "approx", label: "≈", code: "\\approx ", name: "mendekati kira-kira", category: "PECAHAN_DASAR" },
  { id: "equiv", label: "≡", code: "\\equiv ", name: "identik ekuivalen", category: "PECAHAN_DASAR" },
  { id: "prop", label: "∝", code: "\\propto ", name: "sebanding proporsional", category: "PECAHAN_DASAR" },
  { id: "leq", label: "≤", code: "\\leq ", name: "kurang dari atau sama dengan", category: "PECAHAN_DASAR" },
  { id: "geq", label: "≥", code: "\\geq ", name: "lebih dari atau sama dengan", category: "PECAHAN_DASAR" },
  { id: "lt", label: "<", code: " < ", name: "kurang dari", category: "PECAHAN_DASAR" },
  { id: "gt", label: ">", code: " > ", name: "lebih dari", category: "PECAHAN_DASAR" },
  { id: "dots", label: "…", code: "\\dots ", name: "titik-titik elipsis", category: "PECAHAN_DASAR" },

  // 2. PANGKAT, AKAR & LOGARITMA
  { id: "power_sq", label: "x²", code: "x^{2}", name: "Pangkat kuadrat x kuadrat", category: "PANGKAT_AKAR", isTemplate: true },
  { id: "power_n", label: "xⁿ", code: "x^{n}", name: "Pangkat n sembarang", category: "PANGKAT_AKAR", isTemplate: true },
  { id: "subscript", label: "xᵢ", code: "x_{i}", name: "Subskrip indeks bawah", category: "PANGKAT_AKAR", isTemplate: true },
  { id: "power_sub", label: "xᵢⁿ", code: "x_{i}^{n}", name: "Pangkat dan subskrip sekaligus", category: "PANGKAT_AKAR", isTemplate: true },
  { id: "sqrt", label: "√x", code: "\\sqrt{x}", name: "Akar kuadrat x", category: "PANGKAT_AKAR", isTemplate: true },
  { id: "root_n", label: "ⁿ√x", code: "\\sqrt[n]{x}", name: "Akar pangkat n dari x", category: "PANGKAT_AKAR", isTemplate: true },
  { id: "log", label: "log x", code: "\\log(x)", name: "Logaritma basis 10", category: "PANGKAT_AKAR", isTemplate: true },
  { id: "log_base", label: "ᵃlog x", code: "\\log_{a}(x)", name: "Logaritma basis a", category: "PANGKAT_AKAR", isTemplate: true },
  { id: "ln", label: "ln x", code: "\\ln(x)", name: "Logaritma natural ln", category: "PANGKAT_AKAR", isTemplate: true },
  { id: "abs", label: "|x|", code: "\\left| x \\right|", name: "Nilai mutlak absolut", category: "PANGKAT_AKAR", isTemplate: true },
  { id: "paren", label: "(x)", code: "\\left( x \\right)", name: "Tanda kurung biasa", category: "PANGKAT_AKAR", isTemplate: true },
  { id: "bracket", label: "[x]", code: "\\left[ x \\right]", name: "Kurung siku", category: "PANGKAT_AKAR", isTemplate: true },
  { id: "brace", label: "{x}", code: "\\left\\{ x \\right\\}", name: "Kurung kurawal", category: "PANGKAT_AKAR", isTemplate: true },

  // 3. HURUF YUNANI
  { id: "alpha", label: "α", code: "\\alpha ", name: "alpha sudut", category: "YUNANI" },
  { id: "beta", label: "β", code: "\\beta ", name: "beta sudut", category: "YUNANI" },
  { id: "gamma", label: "γ", code: "\\gamma ", name: "gamma kecil", category: "YUNANI" },
  { id: "theta", label: "θ", code: "\\theta ", name: "theta sudut", category: "YUNANI" },
  { id: "pi", label: "π", code: "\\pi ", name: "pi lingkaran 3.14", category: "YUNANI" },
  { id: "delta_cap", label: "Δ", code: "\\Delta ", name: "delta besar diskriminan selisih", category: "YUNANI" },
  { id: "delta_sm", label: "δ", code: "\\delta ", name: "delta kecil", category: "YUNANI" },
  { id: "lambda", label: "λ", code: "\\lambda ", name: "lambda panjang gelombang", category: "YUNANI" },
  { id: "mu", label: "μ", code: "\\mu ", name: "mu rata-rata mikro", category: "YUNANI" },
  { id: "sigma_sm", label: "σ", code: "\\sigma ", name: "sigma kecil standar deviasi", category: "YUNANI" },
  { id: "sigma_cap", label: "Σ", code: "\\Sigma ", name: "sigma besar penjumlahan", category: "YUNANI" },
  { id: "omega_cap", label: "Ω", code: "\\Omega ", name: "omega besar ohm", category: "YUNANI" },
  { id: "omega_sm", label: "ω", code: "\\omega ", name: "omega kecil kecepatan sudut", category: "YUNANI" },
  { id: "phi", label: "ϕ", code: "\\phi ", name: "phi", category: "YUNANI" },
  { id: "rho", label: "ρ", code: "\\rho ", name: "rho massa jenis", category: "YUNANI" },
  { id: "tau", label: "τ", code: "\\tau ", name: "tau waktu torsi", category: "YUNANI" },
  { id: "epsilon", label: "ε", code: "\\varepsilon ", name: "epsilon permitivitas", category: "YUNANI" },

  // 4. ALJABAR & KALKULUS
  {
    id: "system_cases",
    label: "Sistem Pers.",
    code: "\\begin{cases} 2x + y = 10 \\\\ x - 3y = -2 \\end{cases}",
    name: "Sistem persamaan linear kasus",
    category: "ALJABAR_KALKULUS",
    isTemplate: true,
  },
  {
    id: "aligned_eq",
    label: "Langkah (&)",
    code: "\\begin{aligned} f(x) &= 2x + 1 \\\\ &= 2(3) + 1 \\\\ &= 7 \\end{aligned}",
    name: "Persamaan bertingkat rapi tanda sama dengan sejajar",
    category: "ALJABAR_KALKULUS",
    isTemplate: true,
  },
  { id: "sigma_sum", label: "∑ xᵢ", code: "\\sum_{i=1}^{n} x_i", name: "Sigma deret penjumlahan", category: "ALJABAR_KALKULUS", isTemplate: true },
  { id: "prod_series", label: "∏ xᵢ", code: "\\prod_{i=1}^{n} x_i", name: "Produk deret perkalian", category: "ALJABAR_KALKULUS", isTemplate: true },
  { id: "integral_def", label: "∫ₐᵇ", code: "\\int_{a}^{b} f(x) \\,dx", name: "Integral tentu", category: "ALJABAR_KALKULUS", isTemplate: true },
  { id: "integral_indef", label: "∫ f(x)", code: "\\int f(x) \\,dx", name: "Integral tak tentu", category: "ALJABAR_KALKULUS", isTemplate: true },
  { id: "iint", label: "∬", code: "\\iint f(x, y) \\,dx\\,dy", name: "Integral lipat dua ganda", category: "ALJABAR_KALKULUS", isTemplate: true },
  { id: "lim_a", label: "lim x→a", code: "\\lim_{x \\to a} f(x)", name: "Limit fungsi mendekati a", category: "ALJABAR_KALKULUS", isTemplate: true },
  { id: "lim_inf", label: "lim x→∞", code: "\\lim_{x \\to \\infty} f(x)", name: "Limit mendekati tak hingga", category: "ALJABAR_KALKULUS", isTemplate: true },
  { id: "deriv_dy_dx", label: "dy/dx", code: "\\frac{dy}{dx}", name: "Turunan pertama dy dx", category: "ALJABAR_KALKULUS", isTemplate: true },
  { id: "deriv_d2y_dx2", label: "d²y/dx²", code: "\\frac{d^2y}{dx^2}", name: "Turunan kedua d2y dx2", category: "ALJABAR_KALKULUS", isTemplate: true },
  { id: "deriv_prime", label: "f'(x)", code: "f'(x)", name: "f aksen turunan fungsi", category: "ALJABAR_KALKULUS" },
  { id: "partial", label: "∂", code: "\\partial ", name: "turunan parsial d bulat", category: "ALJABAR_KALKULUS" },
  { id: "nabla", label: "∇", code: "\\nabla ", name: "nabla gradien divergen", category: "ALJABAR_KALKULUS" },
  { id: "infinity", label: "∞", code: "\\infty ", name: "tak hingga infinity", category: "ALJABAR_KALKULUS" },

  // 5. GEOMETRI, LOGIKA & HIMPUNAN
  { id: "angle", label: "∠", code: "\\angle ", name: "sudut", category: "GEOMETRI_HIMPUNAN" },
  { id: "degree", label: "°", code: "^{\\circ}", name: "derajat", category: "GEOMETRI_HIMPUNAN" },
  { id: "parallel", label: "∥", code: "\\parallel ", name: "sejajar garisan", category: "GEOMETRI_HIMPUNAN" },
  { id: "perp", label: "⊥", code: "\\perp ", name: "tegak lurus siku-siku", category: "GEOMETRI_HIMPUNAN" },
  { id: "triangle", label: "△", code: "\\triangle ", name: "segitiga", category: "GEOMETRI_HIMPUNAN" },
  { id: "square", label: "□", code: "\\square ", name: "persegi kotak", category: "GEOMETRI_HIMPUNAN" },
  { id: "vector_arrow", label: "v⃗", code: "\\vec{v}", name: "vektor panah atas", category: "GEOMETRI_HIMPUNAN", isTemplate: true },
  { id: "overline", label: "AB̅", code: "\\overline{AB}", name: "ruas garis AB garis atas", category: "GEOMETRI_HIMPUNAN", isTemplate: true },
  { id: "in_set", label: "∈", code: "\\in ", name: "anggota himpunan elemen", category: "GEOMETRI_HIMPUNAN" },
  { id: "notin_set", label: "∉", code: "\\notin ", name: "bukan anggota himpunan", category: "GEOMETRI_HIMPUNAN" },
  { id: "subset", label: "⊂", code: "\\subset ", name: "himpunan bagian subset", category: "GEOMETRI_HIMPUNAN" },
  { id: "subseteq", label: "⊆", code: "\\subseteq ", name: "subset bagian atau sama", category: "GEOMETRI_HIMPUNAN" },
  { id: "cap", label: "∩", code: "\\cap ", name: "irisan himpunan", category: "GEOMETRI_HIMPUNAN" },
  { id: "cup", label: "∪", code: "\\cup ", name: "gabungan himpunan union", category: "GEOMETRI_HIMPUNAN" },
  { id: "emptyset", label: "∅", code: "\\emptyset ", name: "himpunan kosong", category: "GEOMETRI_HIMPUNAN" },
  { id: "arrow_r", label: "→", code: "\\rightarrow ", name: "panah kanan", category: "GEOMETRI_HIMPUNAN" },
  { id: "implies", label: "⇒", code: "\\Rightarrow ", name: "maka implikasi jika", category: "GEOMETRI_HIMPUNAN" },
  { id: "iff", label: "⇔", code: "\\Leftrightarrow ", name: "jika dan hanya jika ekuivalensi", category: "GEOMETRI_HIMPUNAN" },
  { id: "forall", label: "∀", code: "\\forall ", name: "untuk semua untuk setiap", category: "GEOMETRI_HIMPUNAN" },
  { id: "exists", label: "∃", code: "\\exists ", name: "terdapat ada sekurang-kurangnya", category: "GEOMETRI_HIMPUNAN" },

  // 6. MATRIKS & VEKTOR
  {
    id: "mat_2x2",
    label: "[2×2]",
    code: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}",
    name: "Matriks 2x2 ordo 2 kali 2",
    category: "MATRIKS_VEKTOR",
    isTemplate: true,
  },
  {
    id: "mat_3x3",
    label: "[3×3]",
    code: "\\begin{pmatrix} a_{11} & a_{12} & a_{13} \\\\ a_{21} & a_{22} & a_{23} \\\\ a_{31} & a_{32} & a_{33} \\end{pmatrix}",
    name: "Matriks 3x3 ordo 3 kali 3",
    category: "MATRIKS_VEKTOR",
    isTemplate: true,
  },
  {
    id: "vec_col",
    label: "[Kolom]",
    code: "\\begin{pmatrix} x \\\\ y \\\\ z \\end{pmatrix}",
    name: "Vektor kolom 3 dimensi",
    category: "MATRIKS_VEKTOR",
    isTemplate: true,
  },
  {
    id: "mat_det",
    label: "|Det|",
    code: "\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}",
    name: "Determinan matriks garis lurus vertikal",
    category: "MATRIKS_VEKTOR",
    isTemplate: true,
  },
  { id: "npr", label: "ₙPᵣ", code: "_{n}P_{r}", name: "Permutasi nPr", category: "MATRIKS_VEKTOR", isTemplate: true },
  { id: "ncr", label: "ₙCᵣ", code: "_{n}C_{r}", name: "Kombinasi nCr", category: "MATRIKS_VEKTOR", isTemplate: true },

  // 7. TURUS & SATUAN KHUSUS
  { id: "tally_5", label: "卌 (5)", code: "卌", name: "turus lima garis cacah data", category: "TURUS_SATUAN" },
  { id: "tally_1", label: "I (1)", code: "I", name: "turus satu garis cacah", category: "TURUS_SATUAN" },
  { id: "tally_2", label: "II (2)", code: "II", name: "turus dua", category: "TURUS_SATUAN" },
  { id: "tally_3", label: "III (3)", code: "III", name: "turus tiga", category: "TURUS_SATUAN" },
  { id: "tally_4", label: "IIII (4)", code: "IIII", name: "turus empat", category: "TURUS_SATUAN" },
  { id: "set_real", label: "ℝ", code: "\\mathbb{R}", name: "himpunan bilangan real", category: "TURUS_SATUAN" },
  { id: "set_natural", label: "ℕ", code: "\\mathbb{N}", name: "himpunan bilangan asli", category: "TURUS_SATUAN" },
  { id: "set_integer", label: "ℤ", code: "\\mathbb{Z}", name: "himpunan bilangan bulat", category: "TURUS_SATUAN" },
  { id: "unit_cm2", label: "cm²", code: "\\text{ cm}^2", name: "sentimeter persegi luas", category: "TURUS_SATUAN" },
  { id: "unit_cm3", label: "cm³", code: "\\text{ cm}^3", name: "sentimeter kubik volume", category: "TURUS_SATUAN" },
  { id: "unit_m2", label: "m²", code: "\\text{ m}^2", name: "meter persegi luas", category: "TURUS_SATUAN" },
  { id: "unit_m3", label: "m³", code: "\\text{ m}^3", name: "meter kubik volume", category: "TURUS_SATUAN" },
];

export const InlineEquationToolbar: React.FC<InlineEquationToolbarProps> = ({
  onInsert,
  onStartInlineLatex,
  isInlineEditingActive,
  activeLatex,
}) => {
  const [selectedCategory, setSelectedCategory] =
    useState<EquationCategoryKey>("PECAHAN_DASAR");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Compute live KaTeX preview for the full-width preview ribbon
  const { previewHtml, isError } = useMemo(() => {
    const raw = (activeLatex ?? "").trim();
    if (!raw) {
      return { previewHtml: null, isError: false };
    }
    try {
      const html = renderLatexToString(normalizeLatex(raw), false);
      return { previewHtml: html, isError: false };
    } catch {
      return { previewHtml: null, isError: true };
    }
  }, [activeLatex]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter items based on selected category
  const displayedItems = useMemo(() => {
    return ALL_MATH_ITEMS.filter(
      (item) => item.category === selectedCategory
    );
  }, [selectedCategory]);

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 260;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const handleInsertClick = (code: string) => {
    onInsert(normalizeLatex(code));
  };

  return (
    <div className="w-full flex flex-col gap-2 py-2 px-1.5 bg-slate-50/90 dark:bg-slate-900/90 rounded-xl border border-indigo-100/80 dark:border-indigo-950/60 shadow-sm transition-all">
      {/* TOP ROW: Category Dropdown & Cursor Inline Formula Trigger */}
      <div className="flex items-center justify-between gap-2 w-full px-1">
        {/* Left: Category Dropdown Button */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-xs font-bold transition shadow-xs hover:shadow-sm cursor-pointer"
          >
            <span className="text-indigo-600 dark:text-indigo-400 font-serif">
              {CATEGORY_DEFINITIONS[selectedCategory].icon}
            </span>
            <span className="whitespace-nowrap">
              {CATEGORY_DEFINITIONS[selectedCategory].shortLabel}
            </span>
            <ChevronDownIcon
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                isCategoryDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {isCategoryDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/60">
                Pilih Kategori Rumus
              </div>
              {(Object.keys(CATEGORY_DEFINITIONS) as EquationCategoryKey[]).map(
                (catKey) => {
                  const cat = CATEGORY_DEFINITIONS[catKey];
                  const isSelected = selectedCategory === catKey;
                  return (
                    <button
                      key={catKey}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedCategory(catKey);
                        setIsCategoryDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition text-left cursor-pointer ${
                        isSelected
                          ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-center text-sm font-serif text-indigo-500 dark:text-indigo-400">
                          {cat.icon}
                        </span>
                        <span>{cat.label}</span>
                      </div>
                      {isSelected && (
                        <CheckIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </button>
                  );
                }
              )}
            </div>
          )}
        </div>

        {/* Right: Prominent Button to open inline LaTeX chip directly at cursor */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            if (onStartInlineLatex) {
              onStartInlineLatex();
            }
          }}
          className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs hover:shadow-sm ml-auto whitespace-nowrap cursor-pointer active:scale-95 ${
            isInlineEditingActive
              ? "bg-indigo-700 text-white ring-2 ring-indigo-400/50"
              : "bg-indigo-600 hover:bg-indigo-700 text-white"
          }`}
          title="Buka kontainer ketik LaTeX kustom interaktif langsung pada posisi kursor"
        >
          <span className="font-serif italic font-bold">fx</span>
          <span className="hidden sm:inline">
            {isInlineEditingActive ? "Mode Ketik Aktif di Kursor" : "+ Ketik Rumus di Kursor"}
          </span>
          <span className="sm:hidden font-bold">
            +
          </span>
        </button>
      </div>

      {/* BOTTOM ROW: Horizontal Scrollable Strip for Formulas & Symbols */}
      <div className="relative flex items-center w-full group/strip">
        {/* Left Scroll Button */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleScroll("left");
          }}
          className="hidden sm:flex items-center justify-center w-7 h-full absolute left-0 top-0 bottom-0 z-10 bg-gradient-to-r from-slate-50 via-slate-50/90 dark:from-slate-900 dark:via-slate-900/90 to-transparent text-slate-500 hover:text-indigo-600 transition cursor-pointer"
          title="Geser ke kiri"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {/* Scrollable Container with adaptive height & loose padding */}
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2 overflow-x-auto py-2.5 px-2 sm:px-8 w-full custom-scrollbar scroll-smooth min-h-[48px]"
        >
          {displayedItems.map((item) => {
            return (
              <button
                key={item.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleInsertClick(item.code);
                }}
                className={`group shrink-0 flex items-center justify-center min-w-[36px] min-h-[38px] h-auto py-1.5 px-3 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-slate-200 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-600 rounded-lg text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 text-xs font-serif font-bold shadow-xs hover:shadow transition-all active:scale-95 cursor-pointer ${
                  item.isTemplate
                    ? "bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200/60 dark:border-indigo-900/50"
                    : ""
                }`}
                title={`${item.name} (${item.code.trim()})`}
              >
                <RenderedSymbol label={item.label} code={item.code} />
              </button>
            );
          })}
        </div>

        {/* Right Scroll Button */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleScroll("right");
          }}
          className="hidden sm:flex items-center justify-center w-7 h-full absolute right-0 top-0 bottom-0 z-10 bg-gradient-to-l from-slate-50 via-slate-50/90 dark:from-slate-900 dark:via-slate-900/90 to-transparent text-slate-500 hover:text-indigo-600 transition cursor-pointer"
          title="Geser ke kanan"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {/* FULL-WIDTH LIVE KATEX PREVIEW RIBBON (DOCKED DIRECTLY UNDER TOOLBAR) */}
      {(isInlineEditingActive || (activeLatex && activeLatex.trim().length > 0)) && (
        <div className="w-full mt-1 bg-slate-900/95 dark:bg-slate-950/95 text-white rounded-xl p-3 shadow-md border border-slate-700/80 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Pratinjau Rumus (KaTeX Ukuran Nyata)
            </span>
            <span className="font-mono text-[9px] text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/80">
              {activeLatex && activeLatex.trim() ? "Ukuran Nyata · Siap Disisipkan" : "Ketik Pada Kursor..."}
            </span>
          </div>

          <div className="py-2.5 px-3 bg-slate-800/90 dark:bg-slate-900/90 rounded-lg overflow-x-auto text-center flex items-center justify-center min-h-[52px] border border-slate-700/60 custom-scrollbar">
            {previewHtml ? (
              <span
                className="inline-block text-base sm:text-lg text-white font-serif tracking-normal leading-normal select-none"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : isError ? (
              <span className="text-xs text-amber-300 font-sans italic">
                Melengkapi penulisan rumus LaTeX...
              </span>
            ) : (
              <span className="text-xs text-slate-400 font-sans italic">
                Ketik kode LaTeX pada kursor atau klik simbol matematika di atas
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Helper component that renders formula KaTeX preview or styled text label
 */
const RenderedSymbol: React.FC<{ label: string; code: string }> = ({
  label,
  code,
}) => {
  const renderedHtml = useMemo(() => {
    // For single plain symbols or simple text labels, fallback directly
    if (label.length <= 2 && !label.includes("/") && !label.includes("²")) {
      return null;
    }
    try {
      // Attempt KaTeX inline rendering for crisp math display
      return renderLatexToString(code.trim(), false);
    } catch {
      return null;
    }
  }, [label, code]);

  if (renderedHtml) {
    return (
      <span
        className="pointer-events-none select-none inline-flex items-center justify-center max-w-full overflow-visible py-0.5 text-xs leading-none"
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
    );
  }

  return (
    <span className="pointer-events-none select-none tracking-normal py-0.5">
      {label}
    </span>
  );
};
