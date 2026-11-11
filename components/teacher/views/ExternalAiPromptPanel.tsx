import React, { useState, useMemo } from "react";
import {
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  ClipboardPaste,
  FileText,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  GraduationCap,
  BookOpen,
  Eye,
  CheckSquare,
  Sliders,
} from "lucide-react";
import type { Question } from "../../../types";
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

const GRADE_OPTIONS = [
  "Kelas 1 SD (Fase A)",
  "Kelas 2 SD (Fase A)",
  "Kelas 3 SD (Fase B)",
  "Kelas 4 SD (Fase B)",
  "Kelas 5 SD (Fase C)",
  "Kelas 6 SD (Fase C)",
  "Kelas 7 SMP (Fase D)",
  "Kelas 8 SMP (Fase D)",
  "Kelas 9 SMP (Fase D)",
  "Kelas 10 SMA/SMK (Fase E)",
  "Kelas 11 SMA/SMK (Fase F)",
  "Kelas 12 SMA/SMK (Fase F)",
];

const QUESTION_TYPES_LIST = [
  { id: "Pilihan Ganda", label: "PG (Pilihan Ganda)" },
  { id: "Pilihan Ganda Kompleks", label: "PGK (MCMA)" },
  { id: "Benar/Salah", label: "PGK (Kategori / Benar-Salah)" },
  { id: "Menjodohkan", label: "Matching (Menjodohkan)" },
  { id: "Isian Singkat", label: "Isian Singkat" },
  { id: "Esai", label: "Esai / Uraian" },
  { id: "Kuisioner", label: "Kuisioner / Angket (Non-Skor)" },
];

const TKA_LEVELS = [
  { id: "Level 1 - Pemahaman", label: "L1 Pemahaman", desc: "LOTS" },
  { id: "Level 2 - Penerapan", label: "L2 Penerapan", desc: "MOTS" },
  { id: "Level 3 - Penalaran", label: "L3 Penalaran", desc: "HOTS" },
];

const BLOOM_LEVELS = [
  { id: "C1 - Mengingat", label: "C1 Mengingat", desc: "Fakta" },
  { id: "C2 - Memahami", label: "C2 Memahami", desc: "Konsep" },
  { id: "C3 - Mengaplikasikan", label: "C3 Aplikasi", desc: "Penerapan" },
  { id: "C4 - Menganalisis", label: "C4 Analisis", desc: "Struktur" },
  { id: "C5 - Mengevaluasi", label: "C5 Evaluasi", desc: "Penilaian" },
  { id: "C6 - Mencipta", label: "C6 Kreasi", desc: "Solusi" },
];

const AI_LAUNCHERS = [
  {
    name: "Gemini",
    url: "https://gemini.google.com",
    bg: "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600",
  },
  {
    name: "ChatGPT",
    url: "https://chatgpt.com",
    bg: "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600",
  },
  {
    name: "Claude",
    url: "https://claude.ai",
    bg: "bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600",
  },
  {
    name: "DeepSeek",
    url: "https://chat.deepseek.com",
    bg: "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600",
  },
];

const getSubjectsForStandardAndGrade = (standard: AssessmentStandard, grade: string): string[] => {
  if (standard === "tka_bskap") {
    if (grade.includes("SMA") || grade.includes("SMK") || grade.includes("Fase E") || grade.includes("Fase F")) {
      return ["Bahasa Indonesia", "Bahasa Inggris", "Matematika", "Umum / Lainnya"];
    }
    return ["Bahasa Indonesia", "Matematika", "Umum / Lainnya"];
  }

  let subjects: string[] = [];

  if (grade.includes("Fase A")) {
    subjects = [
      "Bahasa Indonesia",
      "Bahasa Inggris",
      "Matematika",
      "Muatan Lokal",
      "Pendidikan Agama dan Budi Pekerti",
      "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)",
      "Pendidikan Pancasila",
      "Seni Budaya",
    ];
  } else if (grade.includes("Fase B") || grade.includes("Fase C")) {
    subjects = [
      "Bahasa Indonesia",
      "Bahasa Inggris",
      "Ilmu Pengetahuan Alam dan Sosial (IPAS)",
      "Matematika",
      "Muatan Lokal",
      "Pendidikan Agama dan Budi Pekerti",
      "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)",
      "Pendidikan Pancasila",
      "Seni Budaya",
    ];
  } else if (grade.includes("Fase D")) {
    subjects = [
      "Bahasa Indonesia",
      "Bahasa Inggris",
      "Ilmu Pengetahuan Alam (IPA)",
      "Ilmu Pengetahuan Sosial (IPS)",
      "Informatika",
      "Matematika",
      "Muatan Lokal",
      "Pendidikan Agama dan Budi Pekerti",
      "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)",
      "Pendidikan Pancasila",
      "Seni Budaya",
    ];
  } else if (grade.includes("Fase E")) {
    subjects = [
      "Bahasa Indonesia",
      "Bahasa Inggris",
      "Biologi",
      "Ekonomi",
      "Fisika",
      "Geografi",
      "Informatika",
      "Kimia",
      "Matematika",
      "Muatan Lokal",
      "Pendidikan Agama dan Budi Pekerti",
      "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)",
      "Pendidikan Pancasila",
      "Sejarah",
      "Seni Budaya",
      "Sosiologi",
    ];
  } else {
    subjects = [
      "Antropologi",
      "Bahasa Indonesia",
      "Bahasa Indonesia Tingkat Lanjut",
      "Bahasa Inggris",
      "Bahasa Inggris Tingkat Lanjut",
      "Biologi",
      "Ekonomi",
      "Fisika",
      "Geografi",
      "Informatika",
      "Kimia",
      "Matematika",
      "Matematika Tingkat Lanjut",
      "Muatan Lokal",
      "Pendidikan Agama dan Budi Pekerti",
      "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)",
      "Pendidikan Pancasila",
      "Sejarah",
      "Sejarah Tingkat Lanjut",
      "Seni Budaya",
      "Sosiologi",
    ];
  }

  const sorted = [...subjects].sort((a, b) => a.localeCompare(b, "id"));
  return [...sorted, "Umum / Lainnya"];
};

export const ExternalAiPromptPanel: React.FC<ExternalAiPromptPanelProps> = ({
  onQuestionsGenerated,
}) => {
  const [activeStep, setActiveStep] = useState<"builder" | "importer">("builder");

  const [standard, setStandard] = useState<AssessmentStandard>("kurikulum_merdeka");
  const [gradeClass, setGradeClass] = useState("Kelas 6 SD (Fase C)");

  const availableSubjects = useMemo(() => {
    return getSubjectsForStandardAndGrade(standard, gradeClass);
  }, [standard, gradeClass]);

  const [subjectState, setSubjectState] = useState("");
  const [customSubject, setCustomSubject] = useState("");

  const activeSubject = availableSubjects.includes(subjectState)
    ? subjectState
    : availableSubjects[0] || "Matematika";

  const [cognitiveFramework, setCognitiveFramework] = useState<CognitiveFramework>("TKA");
  const [selectedTkaLevels, setSelectedTkaLevels] = useState<string[]>([
    "Level 2 - Penerapan",
    "Level 3 - Penalaran",
  ]);
  const [selectedBloomLevels, setSelectedBloomLevels] = useState<string[]>([
    "C3 - Mengaplikasikan",
    "C4 - Menganalisis",
  ]);

  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [enableScoreWeighting, setEnableScoreWeighting] = useState<boolean>(true);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([
    "Pilihan Ganda",
    "Pilihan Ganda Kompleks",
    "Benar/Salah",
  ]);
  const [kisiKisi, setKisiKisi] = useState("");
  const [includeVisuals, setIncludeVisuals] = useState(true);

  const [copied, setCopied] = useState(false);
  const [launchNotice, setLaunchNotice] = useState<string | null>(null);

  const [pastedText, setPastedText] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  const activeCognitiveLevels =
    cognitiveFramework === "TKA" ? selectedTkaLevels : selectedBloomLevels;

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

  const effectiveSubjectName =
    activeSubject === "Umum / Lainnya"
      ? customSubject.trim() || "Mata Pelajaran Umum"
      : activeSubject;

  const generatedPrompt = buildExternalAiPrompt({
    standard,
    subject: effectiveSubjectName,
    gradeClass,
    topic: topic.trim() || "Topik Utama Pembelajaran",
    count,
    questionTypes: selectedTypes.length > 0 ? selectedTypes : ["Pilihan Ganda"],
    cognitiveFramework,
    cognitiveLevels: activeCognitiveLevels,
    kisiKisi,
    includeVisuals,
    enableScoreWeighting,
    defaultScoreWeight: 1,
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

  const handleLaunchAi = async (aiName: string, url: string) => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setLaunchNotice(`Prompt disalin! Membuka ${aiName}...`);
      setTimeout(() => setLaunchNotice(null), 3000);
    } catch (e) {
      console.error("Gagal menyalin prompt:", e);
    }
    window.open(url, "_blank");
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
      const result = parseExternalAiOutput(text, selectedTypes);
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
    <div className="bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-300 max-w-7xl mx-auto">
      {/* Header Banner Ultra-Kompak */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-4 py-3 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase flex items-center gap-1 shrink-0">
              <Sparkles className="w-3 h-3 text-yellow-300 fill-yellow-300" />
              Prompt & Impor Soal
            </span>
            <h3 className="text-base font-black text-white tracking-tight truncate">
              Rancang & Impor Soal AI
            </h3>
          </div>

          {/* Step Nav Toggle */}
          <div className="flex items-center bg-black/20 p-0.5 rounded-xl border border-white/10 shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setActiveStep("builder")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeStep === "builder"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-white/80 hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              1. Rancang Prompt
            </button>
            <button
              onClick={() => setActiveStep("importer")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeStep === "importer"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-white/80 hover:text-white"
              }`}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              2. Impor & Deploy
              {parseResult?.success && (
                <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-extrabold">
                  {parseResult.questions.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Body - Ultra Kompak */}
      <div className="p-3.5 sm:p-4 md:p-5">
        {activeStep === "builder" ? (
          /* STEP 1: ULTRA-KOMPAK 1-VIEWPORT LAYOUT */
          <div className="space-y-3">
            
            {/* GRID 2-KOLOM ATAS (DESKTOP & TABLET) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              
              {/* KIRI ATAS: PARAMETER DASAR */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                {/* 1. Standar Acuan Soal */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Standar Acuan Soal
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setStandard("kurikulum_merdeka")}
                      className={`py-1.5 px-3 rounded-lg border text-center transition-all flex items-center justify-center gap-1.5 font-bold text-xs ${
                        standard === "kurikulum_merdeka"
                          ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-sm"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Kurikulum Merdeka</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStandard("tka_bskap")}
                      className={`py-1.5 px-3 rounded-lg border text-center transition-all flex items-center justify-center gap-1.5 font-bold text-xs ${
                        standard === "tka_bskap"
                          ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-sm"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                      }`}
                    >
                      <GraduationCap className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>TKA Kemendikdasmen</span>
                    </button>
                  </div>
                </div>

                {/* 2. Jenjang & Mata Pelajaran (Inline Grid 2 Kolom) */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Jenjang / Kelas
                    </label>
                    <select
                      value={gradeClass}
                      onChange={(e) => setGradeClass(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                    >
                      {GRADE_OPTIONS.map((grd) => (
                        <option key={grd} value={grd}>
                          {grd}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Mata Pelajaran
                    </label>
                    <select
                      value={activeSubject}
                      onChange={(e) => setSubjectState(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                    >
                      {availableSubjects.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </div>

                  {activeSubject === "Umum / Lainnya" && (
                    <div className="col-span-2 pt-0.5">
                      <input
                        type="text"
                        placeholder="Tuliskan nama mata pelajaran..."
                        value={customSubject}
                        onChange={(e) => setCustomSubject(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-lg px-3 py-1 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                      />
                    </div>
                  )}
                </div>

                {/* 3. Materi Pokok / Topik Utama */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Materi Pokok / Topik Utama
                  </label>
                  <input
                    type="text"
                    placeholder="Misal: Luas & Keliling Bangun Gabungan, Cerita Fabel..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                  />
                </div>

                {/* 4. Jumlah Butir Soal & Sakelar Visual (Gabungan Baris Kompak) */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 border-t border-slate-200 dark:border-slate-700/60">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Jumlah Soal:
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={count}
                      onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-14 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-1.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 text-center outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    />
                    <div className="flex gap-1">
                      {[3, 5, 10, 15].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setCount(n)}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                            count === n
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sakelar Bobot Per Opsi Kompak (Mirip Visual SVG) */}
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    <Sliders className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 shrink-0">
                      Bobot Per Opsi
                    </span>
                    <button
                      type="button"
                      onClick={() => setEnableScoreWeighting(!enableScoreWeighting)}
                      className={`w-8 h-4.5 rounded-full transition-colors relative p-0.5 shrink-0 ${
                        enableScoreWeighting ? "bg-amber-600" : "bg-slate-300 dark:bg-slate-700"
                      }`}
                      title={enableScoreWeighting ? "Pembobotan kustom per opsi aktif (A=4, B=3, C=2, D=1, dll.)" : "Pembobotan per opsi nonaktif"}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                          enableScoreWeighting ? "translate-x-3.5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Sakelar Visual SVG Kompak */}
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 shrink-0">
                      Visual SVG
                    </span>
                    <button
                      type="button"
                      onClick={() => setIncludeVisuals(!includeVisuals)}
                      className={`w-8 h-4.5 rounded-full transition-colors relative p-0.5 shrink-0 ${
                        includeVisuals ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                          includeVisuals ? "translate-x-3.5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* KANAN ATAS: KOGNITIF & BENTUK SOAL (CHIP TOMBOL RAPAT) */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3 flex flex-col justify-between">
                
                {/* 1. Tingkat Kognitif (Tabs + Chips Rapat) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Tingkat Kognitif
                    </label>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950 px-2 py-0.2 rounded-full border border-indigo-200 dark:border-indigo-800">
                      {activeCognitiveLevels.length} dipilih
                    </span>
                  </div>

                  {/* Mini Tab Switcher */}
                  <div className="flex rounded-lg bg-slate-200 dark:bg-slate-700/60 p-0.5 border border-slate-300 dark:border-slate-600">
                    <button
                      type="button"
                      onClick={() => setCognitiveFramework("TKA")}
                      className={`flex-1 py-1 rounded-md text-[11px] font-bold transition-all ${
                        cognitiveFramework === "TKA"
                          ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                      }`}
                    >
                      TKA (Level 1-3)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCognitiveFramework("BLOOM")}
                      className={`flex-1 py-1 rounded-md text-[11px] font-bold transition-all ${
                        cognitiveFramework === "BLOOM"
                          ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                      }`}
                    >
                      Bloom (C1-C6)
                    </button>
                  </div>

                  {/* Chip Tombol Rapat Flex Wrap */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(cognitiveFramework === "TKA" ? TKA_LEVELS : BLOOM_LEVELS).map((lvl) => {
                      const isChecked = activeCognitiveLevels.includes(lvl.id);
                      return (
                        <button
                          key={lvl.id}
                          type="button"
                          onClick={() => toggleCognitiveLevel(lvl.id)}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5 ${
                            isChecked
                              ? "border-indigo-500 bg-indigo-600 text-white font-bold shadow-sm"
                              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                          }`}
                        >
                          <span>{lvl.label}</span>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Bentuk Soal yang Dihasilkan (Chips Rapat) */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Bentuk Soal yang Dihasilkan
                    </label>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950 px-2 py-0.2 rounded-full border border-indigo-200 dark:border-indigo-800">
                      {selectedTypes.length} tipe
                    </span>
                  </div>

                  {/* Chip Tombol Rapat Flex Wrap */}
                  <div className="flex flex-wrap gap-1.5">
                    {QUESTION_TYPES_LIST.map((qt) => {
                      const isChecked = selectedTypes.includes(qt.id);
                      return (
                        <button
                          key={qt.id}
                          type="button"
                          onClick={() => toggleType(qt.id)}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5 ${
                            isChecked
                              ? "border-indigo-500 bg-indigo-600 text-white font-bold shadow-sm"
                              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                          }`}
                        >
                          <span>{qt.label}</span>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>

            {/* GRID 2-KOLOM BAWAH */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              
              {/* KIRI BAWAH: INDIKATOR SPESIFIK */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kisi-kisi / Indikator Spesifik (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Diberikan stimulus cerita kontekstual, siswa dapat menentukan keliling bangun..."
                  value={kisiKisi}
                  onChange={(e) => setKisiKisi(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                />
              </div>

              {/* KANAN BAWAH: TOMBOL LANJUTKAN & JAMINAN PEMBAHASAN */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between space-y-2">
                <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
                  <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-[11px] leading-tight">
                    Prompt mewajibkan AI menyertakan kunci & pembahasan jawaban lengkap untuk tiap soal.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveStep("importer")}
                  className="w-full bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-xl hover:bg-indigo-700 text-xs transition-all flex items-center justify-center gap-2 shadow-md active:scale-95"
                >
                  <span>Lanjut ke Langkah 2: Salin Prompt & Impor Soal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>
        ) : (
          /* STEP 2: ULTRA-KOMPAK 3-KOLOM WORKFLOW & IMPOR AI */
          <div className="space-y-3">
            
            {/* Notification Toast */}
            {launchNotice && (
              <div className="p-2.5 rounded-lg bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 animate-fade-in shadow-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>{launchNotice}</span>
              </div>
            )}

            {/* 3-COLUMN WORKFLOW GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              
              {/* KOLOM 1: SALIN PROMPT */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between space-y-2">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-indigo-600 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0">
                      1
                    </span>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                      Salin Prompt Aplikasi
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Aplikasi membantu pembuatan soal otomatis sesuai standar.
                  </p>

                  <div className="relative group">
                    <pre className="w-full h-[200px] bg-slate-900 text-slate-200 text-[10px] font-mono p-3 rounded-lg overflow-y-auto whitespace-pre-wrap leading-relaxed border border-slate-800 shadow-inner">
                      {generatedPrompt}
                    </pre>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                    copied
                      ? "bg-emerald-600 text-white"
                      : "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Prompt Tersalin!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Klik untuk Salin Prompt
                    </>
                  )}
                </button>
              </div>

              {/* KOLOM 2: PILIH AI */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between space-y-2">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-purple-600 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0">
                      2
                    </span>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                      Pilih AI yang Diinginkan
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Klik tombol untuk menyalin prompt & membuka web AI:
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {AI_LAUNCHERS.map((ai) => (
                      <button
                        key={ai.name}
                        type="button"
                        onClick={() => handleLaunchAi(ai.name, ai.url)}
                        className={`${ai.bg} text-white p-2.5 rounded-lg transition-all shadow-sm flex flex-col items-center justify-center gap-0.5 group active:scale-95`}
                      >
                        <div className="flex items-center gap-1 font-bold text-xs">
                          <span>{ai.name}</span>
                          <ExternalLink className="w-3 h-3 opacity-80 group-hover:opacity-100" />
                        </div>
                        <span className="text-[9px] text-white/80 font-normal">
                          Copas & Buka
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg border border-indigo-200 dark:border-indigo-800 text-[10px] text-indigo-700 dark:text-indigo-300 leading-tight">
                  💡 <strong>Petunjuk:</strong> Tekan <code>Ctrl+V</code> di web AI setelah tab terbuka.
                </div>
              </div>

              {/* KOLOM 3: TEMPEL HASIL */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between space-y-2">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-emerald-600 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0">
                      3
                    </span>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                      Tempel Hasil ke Aplikasi
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Tempelkan balasan teks JSON dari AI di kotak ini:
                  </p>

                  <textarea
                    rows={6}
                    placeholder="Tempelkan balasan teks JSON dari AI di sini... Format terdeteksi otomatis!"
                    value={pastedText}
                    onChange={(e) => handleTextChange(e.target.value)}
                    className="w-full bg-slate-900 text-slate-100 text-[10px] font-mono p-2.5 rounded-lg border border-slate-700 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed h-[130px]"
                  />

                  {parseResult?.success ? (
                    <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold flex flex-col gap-0.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Terdeteksi:
                        </span>
                        <span>{parseResult.totalParsed} Butir Soal</span>
                      </div>
                      {parseResult.questions.some(q =>
                        q.useCustomWeights ||
                        (q.optionWeights && q.optionWeights.length > 0) ||
                        (q.trueFalseRows && q.trueFalseRows.some(r => r.trueWeight !== undefined)) ||
                        (q.matchingPairs && q.matchingPairs.some(p => p.weight !== undefined))
                      ) && (
                        <div className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1 pt-0.5 border-t border-emerald-200 dark:border-emerald-900/50">
                          <Sliders className="w-3 h-3 text-amber-600" />
                          <span>Bobot Per Opsi / Baris Aktif</span>
                        </div>
                      )}
                    </div>
                  ) : parseResult && !parseResult.success ? (
                    <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-[10px] flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="truncate">{parseResult.error}</span>
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm active:scale-95"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  Tempel dari Clipboard
                </button>
              </div>

            </div>

            {/* FULL-WIDTH BOTTOM BAR: DEPLOY BUTTON */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <button
                type="button"
                disabled={!parseResult?.success || parseResult.questions.length === 0}
                onClick={handleDeployQuestions}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:dark:bg-slate-800 disabled:text-slate-400 text-white font-black py-3 px-5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 text-sm"
              >
                <PlusCircle className="w-5 h-5" />
                <span>
                  {parseResult?.success && parseResult.questions.length > 0
                    ? `Deploy ${parseResult.questions.length} Soal ke Editor (+Nomor Akhir)`
                    : "Deploy Soal ke Editor"}
                </span>
              </button>

              <div className="flex justify-between items-center px-1">
                <button
                  type="button"
                  onClick={() => setActiveStep("builder")}
                  className="text-xs text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 font-semibold transition-colors"
                >
                  ← Kembali Edit Parameter Prompt (Langkah 1)
                </button>
                <span className="text-[10px] text-slate-400">
                  Aplikasi Ujian Cerdas • Generator Prompt AI
                </span>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default ExternalAiPromptPanel;
