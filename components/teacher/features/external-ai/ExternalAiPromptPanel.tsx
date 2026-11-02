import React, { useState } from "react";
import {
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  ClipboardPaste,
  FileText,
  ArrowRight,
  Code2,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  GraduationCap,
  BookOpen,
  Eye,
  CheckSquare,
} from "lucide-react";
import type { Question } from "../../../../types";
import {
  buildExternalAiPrompt,
  type AssessmentStandard,
  type CognitiveFramework,
} from "./externalAiPromptBuilder";
import { parseExternalAiOutput, type ParseResult } from "./externalAiParser";

interface ExternalAiPromptPanelProps {
  onQuestionsGenerated: (questions: Question[], mode: "manual" | "auto") => void;
  onCancel?: () => void;
}

const SUBJECT_OPTIONS = [
  "Matematika",
  "Bahasa Indonesia",
  "Ilmu Pengetahuan Alam (IPA)",
  "Ilmu Pengetahuan Sosial (IPS)",
  "Ilmu Pengetahuan Alam dan Sosial (IPAS)",
  "Pendidikan Pancasila",
  "Bahasa Inggris",
  "Pendidikan Jasmani, Olahraga & Kesehatan (PJOK)",
  "Informatika / TIK",
  "Seni Budaya",
  "Agama Islam",
  "Koding dan AI (KKA)",
  "Umum / Lainnya",
];

const GRADE_OPTIONS = [
  "Kelas 1 SD",
  "Kelas 2 SD",
  "Kelas 3 SD",
  "Kelas 4 SD",
  "Kelas 5 SD",
  "Kelas 6 SD",
  "Kelas 7 SMP",
  "Kelas 8 SMP",
  "Kelas 9 SMP",
  "Kelas 10 SMA/SMK",
  "Kelas 11 SMA/SMK",
  "Kelas 12 SMA/SMK",
];

const QUESTION_TYPES_LIST = [
  { id: "Pilihan Ganda", label: "Pilihan Ganda (PG)" },
  { id: "Pilihan Ganda Kompleks", label: "Pilihan Ganda Kompleks (PGK MCMA)" },
  { id: "Benar/Salah", label: "Benar / Salah (PGK Kategori)" },
  { id: "Menjodohkan", label: "Menjodohkan (Matching)" },
  { id: "Isian Singkat", label: "Isian Singkat" },
  { id: "Esai", label: "Esai / Uraian" },
];

const TKA_LEVELS = [
  { id: "Level 1 - Pemahaman", label: "Level 1 - Pemahaman & Prosedur", desc: "LOTS: Membaca data, menghitung rumus dasar, mengingat fakta" },
  { id: "Level 2 - Penerapan", label: "Level 2 - Penerapan & Aplikasi", desc: "MOTS: Memodelkan kalimat matematika, menerapkan konsep rutin" },
  { id: "Level 3 - Penalaran", label: "Level 3 - Penalaran & Analisis", desc: "HOTS: Memecahkan masalah non-rutin, analisis multi-konsep" },
];

const BLOOM_LEVELS = [
  { id: "C1 - Mengingat", label: "C1 Mengingat", desc: "Mengenali atau mengingat kembali fakta dan definisi" },
  { id: "C2 - Memahami", label: "C2 Memahami", desc: "Menjelaskan ide, konsep, dan menerjemahkan informasi" },
  { id: "C3 - Mengaplikasikan", label: "C3 Mengaplikasikan", desc: "Menggunakan konsep dalam situasi atau persoalan baru" },
  { id: "C4 - Menganalisis", label: "C4 Menganalisis", desc: "Membedakan bagian, menstrukturkan hubungan dan sebab-akibat" },
  { id: "C5 - Mengevaluasi", label: "C5 Mengevaluasi", desc: "Menilai kelayakan, strategi optimal, dan validitas kesimpulan" },
  { id: "C6 - Mencipta", label: "C6 Mencipta", desc: "Merancang solusi atau memadukan elemen menjadi bentuk baru" },
];

export const ExternalAiPromptPanel: React.FC<ExternalAiPromptPanelProps> = ({
  onQuestionsGenerated,
  onCancel,
}) => {
  const [activeStep, setActiveStep] = useState<"builder" | "importer">("builder");

  // Standard: Kurikulum Merdeka or TKA BSKAP
  const [standard, setStandard] = useState<AssessmentStandard>("kurikulum_merdeka");

  // Cognitive framework tab & multi-select states
  const [cognitiveFramework, setCognitiveFramework] = useState<CognitiveFramework>("TKA");
  const [selectedTkaLevels, setSelectedTkaLevels] = useState<string[]>([
    "Level 2 - Penerapan",
    "Level 3 - Penalaran",
  ]);
  const [selectedBloomLevels, setSelectedBloomLevels] = useState<string[]>([
    "C3 - Mengaplikasikan",
    "C4 - Menganalisis",
  ]);

  // Generator Config State
  const [subject, setSubject] = useState("Matematika");
  const [gradeClass, setGradeClass] = useState("Kelas 6 SD");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([
    "Pilihan Ganda",
    "Pilihan Ganda Kompleks",
    "Benar/Salah",
  ]);
  const [kisiKisi, setKisiKisi] = useState("");
  const [includeVisuals, setIncludeVisuals] = useState(true);

  // Copy state
  const [copied, setCopied] = useState(false);

  // Importer State
  const [pastedText, setPastedText] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  // Active cognitive levels based on selected tab
  const activeCognitiveLevels =
    cognitiveFramework === "TKA" ? selectedTkaLevels : selectedBloomLevels;

  // Toggle multi-select cognitive level
  const toggleCognitiveLevel = (levelId: string) => {
    if (cognitiveFramework === "TKA") {
      if (selectedTkaLevels.includes(levelId)) {
        if (selectedTkaLevels.length > 1) {
          setSelectedTkaLevels(selectedTkaLevels.filter((l) => l !== levelId));
        }
      } else {
        setSelectedTkaLevels([...selectedTkaLevels, levelId]);
      }
    } else {
      if (selectedBloomLevels.includes(levelId)) {
        if (selectedBloomLevels.length > 1) {
          setSelectedBloomLevels(selectedBloomLevels.filter((l) => l !== levelId));
        }
      } else {
        setSelectedBloomLevels([...selectedBloomLevels, levelId]);
      }
    }
  };

  // Generate current prompt string live
  const generatedPrompt = buildExternalAiPrompt({
    standard,
    subject,
    gradeClass,
    topic: topic.trim() || "Topik Utama Pembelajaran",
    count,
    questionTypes: selectedTypes.length > 0 ? selectedTypes : ["Pilihan Ganda"],
    cognitiveFramework,
    cognitiveLevels: activeCognitiveLevels,
    kisiKisi,
    includeVisuals,
  });

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error("Gagal menyalin prompt:", e);
    }
  };

  const toggleType = (typeId: string) => {
    if (selectedTypes.includes(typeId)) {
      if (selectedTypes.length > 1) {
        setSelectedTypes(selectedTypes.filter((t) => t !== typeId));
      }
    } else {
      setSelectedTypes([...selectedTypes, typeId]);
    }
  };

  const handleTextChange = (text: string) => {
    setPastedText(text);
    if (text.trim()) {
      const result = parseExternalAiOutput(text);
      setParseResult(result);
    } else {
      setParseResult(null);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleTextChange(text);
      }
    } catch (e) {
      console.error("Gagal membaca clipboard:", e);
    }
  };

  const handleDeployQuestions = () => {
    if (parseResult && parseResult.success && parseResult.questions.length > 0) {
      onQuestionsGenerated(parseResult.questions, "auto");
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden transition-all duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 p-6 text-white relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                Generator Prompt AI Eksternal
              </span>
              <span className="text-xs text-indigo-200">
                ChatGPT • Gemini • Claude • DeepSeek
              </span>
            </div>
            <h3 className="text-xl md:text-2xl font-black text-white">
              Buat & Impor Soal dari AI Luar
            </h3>
            <p className="text-xs md:text-sm text-indigo-100 max-w-2xl">
              Pilih standar Kurikulum Merdeka atau TKA BSKAP, tentukan beberapa tingkat kognitif, salin prompt berstandar resmi, dan tempelkan balasan hasil AI luar langsung ke Editor Soal.
            </p>
          </div>

          {/* Step Nav Toggle */}
          <div className="flex items-center bg-black/20 p-1 rounded-2xl border border-white/10 shrink-0">
            <button
              onClick={() => setActiveStep("builder")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeStep === "builder"
                  ? "bg-white text-indigo-700 shadow-md"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <FileText className="w-4 h-4" />
              1. Rancang Prompt
            </button>
            <button
              onClick={() => setActiveStep("importer")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeStep === "importer"
                  ? "bg-white text-indigo-700 shadow-md"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <ClipboardPaste className="w-4 h-4" />
              2. Impor & Deploy
              {parseResult?.success && (
                <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-extrabold">
                  {parseResult.questions.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="p-6 md:p-8">
        {activeStep === "builder" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Form Settings (Left) */}
            <div className="lg:col-span-6 space-y-6">
              {/* Standar Acuan Kurikulum */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Standar Acuan Soal
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStandard("kurikulum_merdeka")}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                      standard === "kurikulum_merdeka"
                        ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-sm"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100">
                          Kurikulum Merdeka
                        </span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          standard === "kurikulum_merdeka"
                            ? "border-indigo-600 bg-indigo-600"
                            : "border-slate-300"
                        }`}
                      >
                        {standard === "kurikulum_merdeka" && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Berbasis Capaian Pembelajaran (CP/TP), kontekstual, autentik, & Profil Pelajar Pancasila.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStandard("tka_bskap")}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                      standard === "tka_bskap"
                        ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-sm"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100">
                          TKA BSKAP Kemendikdasmen
                        </span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          standard === "tka_bskap"
                            ? "border-indigo-600 bg-indigo-600"
                            : "border-slate-300"
                        }`}
                      >
                        {standard === "tka_bskap" && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Keputusan No. 047/H/AN/2025: Standarisasi akademik, penalaran MOTS/HOTS & format Pusmendik.
                    </span>
                  </button>
                </div>
              </div>

              {/* Subject & Grade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                    Mata Pelajaran
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {SUBJECT_OPTIONS.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                    Jenjang / Kelas
                  </label>
                  <select
                    value={gradeClass}
                    onChange={(e) => setGradeClass(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {GRADE_OPTIONS.map((grd) => (
                      <option key={grd} value={grd}>
                        {grd}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Topic */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Materi Pokok / Topik Utama
                </label>
                <input
                  type="text"
                  placeholder="Misal: Luas & Keliling Bangun Gabungan, Cerita Fabel, Sistem Pencernaan..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Count */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Jumlah Butir Soal
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={count}
                    onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-100 text-center outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex gap-1">
                    {[3, 5, 10, 15].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setCount(n)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          count === n
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tingkat Kognitif (Tab Switch & Multi-select) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                    Tingkat Kognitif (Bisa Pilih Beberapa)
                  </label>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                    {activeCognitiveLevels.length} level dipilih
                  </span>
                </div>

                {/* Tab Switcher */}
                <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setCognitiveFramework("TKA")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      cognitiveFramework === "TKA"
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-800"
                    }`}
                  >
                    Standar TKA (Level 1–3)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCognitiveFramework("BLOOM")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      cognitiveFramework === "BLOOM"
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-800"
                    }`}
                  >
                    Taksonomi Bloom (C1–C6)
                  </button>
                </div>

                {/* Multi-select Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {(cognitiveFramework === "TKA" ? TKA_LEVELS : BLOOM_LEVELS).map((lvl) => {
                    const isChecked = activeCognitiveLevels.includes(lvl.id);
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => toggleCognitiveLevel(lvl.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-start justify-between gap-2 text-xs ${
                          isChecked
                            ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-bold shadow-sm"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                        }`}
                      >
                        <div>
                          <span className="block font-bold">{lvl.label}</span>
                          <span className="text-[10px] opacity-75 font-normal block leading-tight mt-0.5">
                            {lvl.desc}
                          </span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                            isChecked ? "bg-indigo-600 text-white" : "border border-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question Types Checkboxes */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                  Bentuk Soal yang Dihasilkan
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {QUESTION_TYPES_LIST.map((qt) => {
                    const isChecked = selectedTypes.includes(qt.id);
                    return (
                      <button
                        key={qt.id}
                        type="button"
                        onClick={() => toggleType(qt.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between text-xs font-semibold ${
                          isChecked
                            ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                        }`}
                      >
                        <span>{qt.label}</span>
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                            isChecked ? "bg-indigo-600 text-white" : "border border-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Kisi-Kisi / Indikator */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Kisi-Kisi / Indikator Spesifik (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Misal: Diberikan stimulus cerita kontekstual, siswa dapat menentukan keliling bangun gabungan..."
                  value={kisiKisi}
                  onChange={(e) => setKisiKisi(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Visual Switch (Enhanced with SVG mandate description) */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      Stimulus Visual, Diagram & Geometri SVG
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIncludeVisuals(!includeVisuals)}
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                      includeVisuals ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        includeVisuals ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {includeVisuals
                    ? "✓ AI diwajibkan menyertakan kode <svg> mandiri atau tabel HTML terstruktur jika butir soal membutuhkan representasi visual/geometri."
                    : "Stimulus visual dinonaktifkan, soal akan menggunakan teks naratif biasa."}
                </p>
              </div>

              {/* Explanation Guarantee Notice */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">
                  Prompt mewajibkan AI menyertakan pembahasan jawaban lengkap dan langkah pengerjaan untuk setiap butir soal.
                </span>
              </div>
            </div>

            {/* Prompt Preview & Quick Actions (Right) */}
            <div className="lg:col-span-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-sm">
                      2
                    </div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100">
                      Hasil Prompt AI Siap Copas
                    </h4>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                    {standard === "kurikulum_merdeka" ? "Kurikulum Merdeka" : "TKA BSKAP 047"}
                  </span>
                </div>

                {/* Prompt Box */}
                <div className="relative group">
                  <pre className="w-full h-[360px] bg-slate-900 text-slate-200 text-xs font-mono p-4 rounded-2xl overflow-y-auto whitespace-pre-wrap leading-relaxed border border-slate-800 shadow-inner">
                    {generatedPrompt}
                  </pre>
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className={`absolute top-3 right-3 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg ${
                      copied
                        ? "bg-emerald-500 text-white"
                        : "bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95"
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Tersalin!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Salin Prompt
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Direct External AI Shortcuts & Next Step */}
              <div className="space-y-4 pt-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Buka AI Luar untuk Memproses Prompt Ini:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <a
                      href="https://chatgpt.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:shadow-md"
                    >
                      <span>ChatGPT</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                    <a
                      href="https://gemini.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:shadow-md"
                    >
                      <span>Gemini</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                    <a
                      href="https://claude.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-500 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:shadow-md"
                    >
                      <span>Claude</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                    <a
                      href="https://chat.deepseek.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-cyan-500 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:shadow-md"
                    >
                      <span>DeepSeek</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Sudah menyalin & mendapat balasan dari AI?
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveStep("importer")}
                    className="bg-indigo-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-indigo-700 text-xs transition-all flex items-center gap-2 shadow-md active:scale-95"
                  >
                    <span>Lanjut ke Langkah 2: Impor Soal</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* IMPORTER STEP */
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                  Kotak Penerima & Parser Soal Hasil AI Luar
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tempelkan (*paste*) seluruh jawaban atau blok kode JSON yang diberikan oleh ChatGPT, Gemini, Claude, atau DeepSeek.
                </p>
              </div>

              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto shadow-sm"
              >
                <ClipboardPaste className="w-4 h-4" />
                Tempel dari Clipboard
              </button>
            </div>

            {/* Input Textarea & Result Feedback */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-3">
                <textarea
                  rows={14}
                  placeholder={`Tempelkan hasil teks dari ChatGPT / Gemini / Claude di sini...

Contoh balasan dari AI:
\`\`\`json
[
  {
    "questionText": "Berapakah hasil dari 2 + 2?",
    "questionType": "MULTIPLE_CHOICE",
    "options": ["2", "3", "4", "5"],
    "correctAnswer": "C",
    "explanation": "2 + 2 = 4 sehingga pilihan C benar.",
    "solutionSteps": "Langkah 1: Jumlahkan kedua bilangan."
  }
]
\`\`\``}
                  value={pastedText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  className="w-full bg-slate-900 text-slate-100 text-xs font-mono p-4 rounded-2xl border border-slate-700 placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                />

                {parseResult && !parseResult.success && (
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-3 animate-fade-in">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block mb-0.5">Format belum dikenali:</span>
                      <p>{parseResult.error}</p>
                      <span className="text-[11px] opacity-80 mt-1 block">
                        Petunjuk: Pastikan Anda menyalin teks balasan AI secara utuh termasuk tanda kurung siku `[` dan `]`.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Parsed Questions Preview & Deploy Action */}
              <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Hasil Identifikasi Soal
                    </span>
                    {parseResult?.success && (
                      <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        {parseResult.totalParsed} Butir Soal Terdeteksi
                      </span>
                    )}
                  </div>

                  {parseResult?.success && parseResult.questions.length > 0 ? (
                    <div className="max-h-[350px] overflow-y-auto space-y-2.5 pr-1">
                      {parseResult.questions.map((q, idx) => (
                        <div
                          key={q.id || idx}
                          className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-2"
                        >
                          <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                            <span className="truncate max-w-[200px]">
                              {idx + 1}. {q.questionText.replace(/<[^>]*>?/gm, "").substring(0, 45)}...
                            </span>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 shrink-0">
                              {q.questionType}
                            </span>
                          </div>
                          {q.options && q.options.length > 0 && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              {q.options.length} Pilihan • Kunci: {q.correctAnswer || "Belum diatur"}
                            </div>
                          )}
                          <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex-wrap">
                            {q.explanation && (
                              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded font-bold">
                                ✓ Pembahasan Ada
                              </span>
                            )}
                            {q.questionText.includes("<svg") && (
                              <span className="text-[10px] bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded font-bold">
                                🖼️ Geometri SVG
                              </span>
                            )}
                            {q.level && (
                              <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">
                                {q.level}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-[280px] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-2">
                      <Code2 className="w-10 h-10 stroke-[1.5] text-slate-300 dark:text-slate-700" />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        Belum ada soal terdeteksi
                      </span>
                      <p className="text-[11px] text-slate-400 max-w-xs">
                        Tempelkan balasan teks JSON dari AI di kotak sebelah kiri untuk melihat pratinjau butir soal.
                      </p>
                    </div>
                  )}
                </div>

                {/* Deploy Action Button */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <button
                    type="button"
                    disabled={!parseResult?.success || parseResult.questions.length === 0}
                    onClick={handleDeployQuestions}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:dark:bg-slate-800 disabled:text-slate-400 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 text-sm"
                  >
                    <PlusCircle className="w-5 h-5" />
                    <span>
                      {parseResult?.success && parseResult.questions.length > 0
                        ? `Deploy ${parseResult.questions.length} Soal ke Editor (+Nomor Akhir)`
                        : "Deploy ke Editor Soal"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveStep("builder")}
                    className="w-full text-center text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 py-1 font-semibold"
                  >
                    ← Kembali Edit Parameter Prompt
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
