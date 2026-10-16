import React, { useState } from "react";
import type { Question } from "../../../types";
import {
  PencilIcon,
  CloudArrowUpIcon,
  SparklesIcon,
  CogIcon,
} from "../../Icons";
import {
  Check,
  Plus,
  Minus,
  Sparkles,
  BrainCircuit,
  ListChecks,
  FileCheck2,
  BookOpen,
  Filter,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  X,
  ChevronDown,
} from "lucide-react";
import { useCreationView } from "../useCreationView";
import { TKA_PRESETS, type TKAPreset } from "../../../utils/tkaPresets";
import { WysiwygEditor } from "../WysiwygEditor";

interface CreationViewProps {
  onQuestionsGenerated: (
    questions: Question[],
    mode: "manual" | "auto",
  ) => void;
  isPremium?: boolean;
}

const QUESTION_TYPE_OPTIONS = [
  {
    id: "Pilihan Ganda",
    label: "Pilihan Ganda (PG)",
    desc: "1 jawaban benar dari pilihan A-D/E",
    badge: "Objektif Tunggal",
  },
  {
    id: "Pilihan Ganda Kompleks",
    label: "Pilihan Ganda Kompleks (PGK)",
    desc: "Multi-jawaban benar (MCMA)",
    badge: "Standar TKA",
  },
  {
    id: "Benar/Salah",
    label: "Benar / Salah (Kategori)",
    desc: "Tabel baris pernyataan Benar/Salah",
    badge: "Standar TKA",
  },
  {
    id: "Menjodohkan",
    label: "Menjodohkan (Matching)",
    desc: "Mencocokkan pasangan stimulus kiri & kanan",
    badge: "Interaktif",
  },
  {
    id: "Uraian Singkat",
    label: "Isian Singkat",
    desc: "Jawaban singkat, angka eksak, atau kata kunci",
    badge: "Isian Presisi",
  },
  {
    id: "Esai",
    label: "Esai / Uraian",
    desc: "Penalaran terbuka & rubrik penilaian mendalam",
    badge: "Subjektif / Analisis",
  },
];

const TKA_DIFFICULTY_OPTIONS = [
  {
    id: "Level 1 - Pemahaman",
    label: "Level 1 - Pemahaman",
    desc: "Menghitung prosedur, membaca tabel/grafik/diagram & fakta materi",
  },
  {
    id: "Level 2 - Penerapan",
    label: "Level 2 - Penerapan",
    desc: "Memodelkan kalimat matematika & mengaplikasikan konsep rutin",
  },
  {
    id: "Level 3 - Penalaran",
    label: "Level 3 - Penalaran",
    desc: "Menganalisis relasi, pemecahan masalah non-rutin & penalaran kasus",
    recommended: true,
  },
];

const BLOOM_DIFFICULTY_OPTIONS = [
  { id: "C1 - Mengingat", label: "C1 Mengingat" },
  { id: "C2 - Memahami", label: "C2 Memahami" },
  { id: "C3 - Mengaplikasikan", label: "C3 Mengaplikasikan" },
  { id: "C4 - Menganalisis", label: "C4 Menganalisis" },
  { id: "C5 - Mengevaluasi", label: "C5 Mengevaluasi" },
  { id: "C6 - Mencipta", label: "C6 Mencipta" },
];

const QUICK_COUNT_OPTIONS = [3, 5, 8, 10];

export const CreationView: React.FC<CreationViewProps> = ({
  onQuestionsGenerated,
  isPremium,
}) => {
  const {
    inputMethod,
    setInputMethod,
    uploadedFile,
    previewImages,
    isLoading,
    error,
    aiConfig,
    setAiConfig,
    generationProgress,
    aiSectionRef,
    failSafeState,
    handleStartAnalysis,
    handleRetryGeneration,
    handleAcceptPartialQuestions,
    handleDismissFailSafe,
    handleManualCreateClick,
    handleAiClick,
    handleFileChange,
  } = useCreationView({ onQuestionsGenerated });

  const [cognitiveDrawer, setCognitiveDrawer] = useState<"TKA" | "BLOOM">("TKA");
  const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(false);

  // Selected types multi-select helpers
  const selectedTypes =
    aiConfig.types && aiConfig.types.length > 0
      ? aiConfig.types
      : aiConfig.type
        ? [aiConfig.type]
        : ["Pilihan Ganda"];

  const toggleType = (typeId: string) => {
    if (selectedTypes.includes(typeId)) {
      if (selectedTypes.length > 1) {
        const updated = selectedTypes.filter((t) => t !== typeId);
        setAiConfig({
          ...aiConfig,
          types: updated,
          type: updated[0],
        });
      }
    } else {
      const updated = [...selectedTypes, typeId];
      setAiConfig({
        ...aiConfig,
        types: updated,
        type: updated[0],
      });
    }
  };

  const selectAllTypes = () => {
    const all = QUESTION_TYPE_OPTIONS.map((t) => t.id);
    setAiConfig({
      ...aiConfig,
      types: all,
      type: all[0],
    });
  };

  const selectTkaTypes = () => {
    const tkaTypes = [
      "Pilihan Ganda",
      "Pilihan Ganda Kompleks",
      "Benar/Salah",
    ];
    setAiConfig({
      ...aiConfig,
      types: tkaTypes,
      type: tkaTypes[0],
    });
  };

  const selectSingleType = (typeId: string) => {
    setAiConfig({
      ...aiConfig,
      types: [typeId],
      type: typeId,
    });
  };

  // Selected difficulties multi-select helpers
  const selectedDifficulties =
    aiConfig.difficulties && aiConfig.difficulties.length > 0
      ? aiConfig.difficulties
      : aiConfig.difficulty
        ? [aiConfig.difficulty]
        : [];

  const toggleDifficulty = (diffId: string) => {
    if (selectedDifficulties.includes(diffId)) {
      const updated = selectedDifficulties.filter((d) => d !== diffId);
      setAiConfig({
        ...aiConfig,
        difficulties: updated,
        difficulty: updated.length > 0 ? updated[0] : "",
      });
    } else {
      const updated = [...selectedDifficulties, diffId];
      setAiConfig({
        ...aiConfig,
        difficulties: updated,
        difficulty: updated[0],
      });
    }
  };

  const handleSwitchCognitiveDrawer = (drawer: "TKA" | "BLOOM") => {
    setCognitiveDrawer(drawer);
    if (drawer === "TKA") {
      const hasTka = selectedDifficulties.some((d) => d.startsWith("Level"));
      if (!hasTka) {
        setAiConfig({
          ...aiConfig,
          difficulties: ["Level 3 - Penalaran"],
          difficulty: "Level 3 - Penalaran",
        });
      }
    } else {
      const hasBloom = selectedDifficulties.some((d) => d.startsWith("C"));
      if (!hasBloom) {
        setAiConfig({
          ...aiConfig,
          difficulties: ["C4 - Menganalisis", "C5 - Mengevaluasi", "C6 - Mencipta"],
          difficulty: "C4 - Menganalisis",
        });
      }
    }
  };

  const selectAllTkaDifficulties = () => {
    const allTka = TKA_DIFFICULTY_OPTIONS.map((d) => d.id);
    setAiConfig({
      ...aiConfig,
      difficulties: allTka,
      difficulty: allTka[0],
    });
  };

  const selectTkaLevel3Only = () => {
    setAiConfig({
      ...aiConfig,
      difficulties: ["Level 3 - Penalaran"],
      difficulty: "Level 3 - Penalaran",
    });
  };

  const selectAllBloom = () => {
    const bloomList = BLOOM_DIFFICULTY_OPTIONS.map((b) => b.id);
    setAiConfig({
      ...aiConfig,
      difficulties: bloomList,
      difficulty: bloomList[0],
    });
  };

  const selectHotsBloomOnly = () => {
    const hotsList = ["C4 - Menganalisis", "C5 - Mengevaluasi", "C6 - Mencipta"];
    setAiConfig({
      ...aiConfig,
      difficulties: hotsList,
      difficulty: hotsList[0],
    });
  };

  const handleCountChange = (value: number) => {
    const clamped = Math.max(1, Math.min(10, value));
    setAiConfig({ ...aiConfig, count: clamped });
  };

  const [selectedPresetFilter, setSelectedPresetFilter] = useState<string>("SEMUA");

  const applyTKAPreset = (preset: TKAPreset) => {
    const normalizedDifficulties = preset.difficulties.map((d) => {
      if (d.includes("Level 1")) return "Level 1 - Pemahaman";
      if (d.includes("Level 2")) return "Level 2 - Penerapan";
      if (d.includes("Level 3")) return "Level 3 - Penalaran";
      return d;
    });
    setCognitiveDrawer("TKA");
    setAiConfig({
      ...aiConfig,
      subject: preset.subject,
      difficulties: normalizedDifficulties,
      difficulty: normalizedDifficulties[0] || "Level 3 - Penalaran",
      types: [...preset.types],
      type: preset.types[0],
      blueprint: preset.blueprint,
    });
  };

  const filteredPresets = TKA_PRESETS.filter((p) => {
    if (selectedPresetFilter === "SEMUA") return true;
    if (selectedPresetFilter === "SD") return p.jenjang === "SD";
    if (selectedPresetFilter === "SMP") return p.jenjang === "SMP";
    if (selectedPresetFilter === "SMA_MIPA") return p.jenjang === "SMA" && p.category === "MIPA";
    if (selectedPresetFilter === "SMA_SOSHUM") return p.jenjang === "SMA" && p.category === "SOSHUM";
    if (selectedPresetFilter === "SMA_BAHASA_UMUM") return p.jenjang === "SMA" && (p.category === "BAHASA" || p.category === "UMUM");
    if (selectedPresetFilter === "SMK") return p.jenjang === "SMK";
    return true;
  });

  return (
    <div className="w-full max-w-full mx-auto animate-fade-in space-y-12">
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-neutral dark:text-white">
            Buat Ujian Baru
          </h2>
          <p className="text-gray-500 dark:text-slate-400 max-w-2xl mx-auto">
            Mulai dengan mengunggah soal dalam format PDF, membuat soal dengan
            bantuan AI, atau membuat soal secara manual. Sistem kami akan
            membantu Anda menyusun ujian dengan mudah.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            className={`p-6 border-2 rounded-2xl cursor-pointer transition-all duration-300 group border-gray-100 dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-lg bg-white dark:bg-slate-800`}
            onClick={handleManualCreateClick}
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div
                className={`p-4 rounded-2xl transition-colors bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-slate-300 group-hover:bg-primary/10 group-hover:text-primary`}
              >
                <PencilIcon className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg text-neutral dark:text-white">
                Buat Manual
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Buat soal dari awal secara manual tanpa impor file atau teks.
              </p>
            </div>
          </div>
          <div
            className={`p-6 border-2 rounded-2xl cursor-pointer transition-all duration-300 group ${inputMethod === "upload" ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-md" : "border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary/50 hover:shadow-lg"}`}
            onClick={() => setInputMethod("upload")}
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div
                className={`p-4 rounded-2xl transition-colors ${inputMethod === "upload" ? "bg-primary text-white" : "bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-slate-300 group-hover:bg-primary/10 group-hover:text-primary"}`}
              >
                <CloudArrowUpIcon className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg text-neutral dark:text-white">
                Unggah PDF Soal
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Sistem akan otomatis mendeteksi dan memotong soal dari file PDF
                Anda.
              </p>
            </div>
          </div>
          <div
            className={`p-6 border-2 rounded-2xl transition-all duration-300 group relative ${inputMethod === "ai" ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-md cursor-pointer" : "border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary/50 hover:shadow-lg cursor-pointer"}`}
            onClick={handleAiClick}
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div
                className={`p-4 rounded-2xl transition-colors ${inputMethod === "ai" ? "bg-primary text-white" : "bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-slate-300 group-hover:bg-primary/10 group-hover:text-primary"}`}
              >
                <SparklesIcon className="w-8 h-8" />
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <h3 className="font-bold text-lg text-neutral dark:text-white">
                  Buat dengan AI
                </h3>
              </div>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Hasilkan soal secara otomatis menggunakan bantuan AI dari materi
                Anda.
              </p>
            </div>
          </div>
        </div>
        <div
          ref={aiSectionRef}
          className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm transition-all duration-300 relative overflow-hidden"
        >
          {isLoading && inputMethod === "ai" ? (
            /* Kartu Progres Kerja AI Terfokus Ultra-Ringkas (Desktop & Mobile Friendly) */
            <div className="w-full max-w-md mx-auto py-8 px-6 sm:px-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl flex flex-col items-center text-center space-y-5 my-4 animate-scale-in">
              {/* Smooth Spinning Ring Indicator */}
              <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />

              {/* Short Title & Stage Message */}
              <div className="space-y-1">
                <h4 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
                  Menyusun Soal Ujian...
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {generationProgress.stageMessage || "Sedang memproses butir berikutnya..."}
                </p>
              </div>

              {/* Dynamic Progress Bar & Real-time Counter */}
              <div className="w-full space-y-2 pt-1">
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${Math.max(
                        8,
                        Math.min(
                          100,
                          ((generationProgress.completed || 0) /
                            (generationProgress.total || aiConfig.count || 1)) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
                  <span className="font-bold text-primary">
                    {generationProgress.completed} / {generationProgress.total || aiConfig.count} Soal Selesai
                  </span>
                  <span className="font-semibold">
                    {Math.round(
                      ((generationProgress.completed || 0) /
                        (generationProgress.total || aiConfig.count || 1)) *
                        100
                    )}%
                  </span>
                </div>
              </div>
            </div>
          ) : isLoading && inputMethod === "upload" ? (
            /* Kartu Progres Unggah & Ekstraksi PDF */
            <div className="w-full max-w-md mx-auto py-8 px-6 sm:px-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl flex flex-col items-center text-center space-y-5 my-4 animate-scale-in">
              <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <div className="space-y-1">
                <h4 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
                  Mengekstrak PDF Soal...
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sedang membaca layout dan memotong gambar dari lembar soal PDF Anda.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <h3 className="text-lg font-bold text-neutral dark:text-white mb-1">
                  {inputMethod === "upload"
                    ? "Unggah File PDF"
                    : "Pembuatan Soal Berbantuan AI"}
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {inputMethod === "upload"
                    ? "Pilih file PDF dari perangkat Anda."
                    : "Isi konfigurasi di bawah ini untuk menghasilkan soal terstandar."}
                </p>
              </div>

              {inputMethod === "upload" ? (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors relative">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="space-y-2 pointer-events-none">
                      <CloudArrowUpIcon className="w-10 h-10 text-gray-400 dark:text-slate-500 mx-auto" />
                      {uploadedFile ? (
                        <p className="font-semibold text-primary">
                          {uploadedFile.name}
                        </p>
                      ) : (
                        <>
                          <p className="text-gray-600 dark:text-slate-300 font-medium">
                            Klik atau seret file PDF ke sini
                          </p>
                          <p className="text-xs text-gray-400 dark:text-slate-500">
                            Maksimal ukuran file 10MB
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  {previewImages.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                        Pratinjau Halaman Pertama:
                      </p>
                      <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto bg-gray-50 dark:bg-slate-900 p-2 text-center">
                        <img
                          src={previewImages[0]}
                          alt="Preview PDF"
                          className="max-w-full h-auto mx-auto shadow-sm rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Row 1: Subject & Question Count */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Subject / Topic Field */}
                    <div className="lg:col-span-7">
                      <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                        Mata Pelajaran & Materi Pokok <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={aiConfig.subject}
                        onChange={(e) =>
                          setAiConfig({ ...aiConfig, subject: e.target.value })
                        }
                        className="w-full p-3 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm text-slate-800 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 transition-all"
                        placeholder="Contoh: Matematika SMA (TKA) - Polinomial (Suku Banyak) atau Dimensi Tiga"
                      />
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                        Ketik materi spesifik Anda di atas (misal: <strong>Polinomial</strong>, <strong>Matriks</strong>, dll), atau pilih dari <strong>Pengaturan Lanjutan (Preset TKA)</strong> di bawah.
                      </p>
                    </div>

                    {/* Question Count Field with accurate 1-10 Limit Badge & Shortcuts */}
                    <div className="lg:col-span-5 bg-slate-50/80 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <span>Jumlah Butir Soal</span>
                            <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">
                              1 - 10 Butir (Cepat & Stabil)
                            </span>
                          </label>
                          <span className="text-xs font-bold text-primary">
                            {aiConfig.count} Soal Dipilih
                          </span>
                        </div>

                        {/* Stepper & Direct Typing Input */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCountChange(aiConfig.count - 1)}
                            disabled={aiConfig.count <= 1}
                            className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                            aria-label="Kurangi jumlah soal"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={aiConfig.count}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val)) {
                                handleCountChange(val);
                              } else {
                                setAiConfig({ ...aiConfig, count: 1 });
                              }
                            }}
                            className="flex-1 text-center font-bold text-base h-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary text-slate-800 dark:text-slate-100 shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => handleCountChange(aiConfig.count + 1)}
                            disabled={aiConfig.count >= 10}
                            className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                            aria-label="Tambah jumlah soal"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 text-center">
                          Maksimal 10 butir sekaligus untuk menjaga akurasi materi dan mencegah timeout.
                        </p>
                      </div>

                      {/* Quick Count Shortcut Pills (3, 5, 8, 10) */}
                      <div className="flex flex-wrap gap-1 mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                        <span className="text-[11px] text-gray-500 dark:text-slate-400 self-center mr-1">
                          Pintas:
                        </span>
                        {QUICK_COUNT_OPTIONS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => handleCountChange(c)}
                            className={`text-xs px-2.5 py-0.5 rounded font-medium transition-all ${
                              aiConfig.count === c
                                ? "bg-primary text-white shadow-sm font-bold scale-105"
                                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Section 2: 6 Jenis Soal (Horizontal Chips Sejajar) */}
                  <div className="space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ListChecks className="w-4 h-4 text-primary" />
                        <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          Jenis Soal yang Dihasilkan (6 Jenis Lengkap)
                        </label>
                        <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                          {selectedTypes.length} Dipilih
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        <button
                          type="button"
                          onClick={selectAllTypes}
                          className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors text-[11px]"
                        >
                          Pilih Semua (6)
                        </button>
                        <button
                          type="button"
                          onClick={selectTkaTypes}
                          className="px-2.5 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary font-semibold transition-colors text-[11px]"
                        >
                          Standar TKA (PG, PGK, B/S)
                        </button>
                        <button
                          type="button"
                          onClick={() => selectSingleType("Pilihan Ganda")}
                          className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors text-[11px]"
                        >
                          PG Saja
                        </button>
                      </div>
                    </div>

                    {/* 6 Horizontal Chips Responsive Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                      {QUESTION_TYPE_OPTIONS.map((item) => {
                        const isSelected = selectedTypes.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleType(item.id)}
                            className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-1.5 ${
                              isSelected
                                ? "border-primary bg-primary/10 text-primary font-bold shadow-sm ring-1 ring-primary/40"
                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 font-medium"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-xs truncate">{item.label}</div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-normal">
                                {item.badge}
                              </div>
                            </div>
                            <div
                              className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? "bg-primary text-white"
                                  : "border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-transparent"
                              }`}
                            >
                              <Check className="w-3 h-3" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section 3: 2 Laci Tingkat Kognitif Mandiri (Tab Toggle Switch) */}
                  <div className="space-y-3 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <BrainCircuit className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          Tingkat Kognitif:
                        </span>

                        {/* Tab Switcher between Drawer 1 (TKA) and Drawer 2 (Bloom) */}
                        <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                          <button
                            type="button"
                            onClick={() => handleSwitchCognitiveDrawer("TKA")}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              cognitiveDrawer === "TKA"
                                ? "bg-primary text-white shadow-sm"
                                : "text-slate-600 dark:text-slate-300 hover:text-primary"
                            }`}
                          >
                            1. Laci Standar TKA
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSwitchCognitiveDrawer("BLOOM")}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              cognitiveDrawer === "BLOOM"
                                ? "bg-primary text-white shadow-sm"
                                : "text-slate-600 dark:text-slate-300 hover:text-primary"
                            }`}
                          >
                            2. Laci Taksonomi Bloom
                          </button>
                        </div>
                      </div>

                      {/* Drawer-Specific Quick Actions */}
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        {cognitiveDrawer === "TKA" ? (
                          <>
                            <button
                              type="button"
                              onClick={selectAllTkaDifficulties}
                              className="px-2.5 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary font-semibold transition-colors text-[11px]"
                            >
                              Pilih Semua Level TKA (L1, L2, L3)
                            </button>
                            <button
                              type="button"
                              onClick={selectTkaLevel3Only}
                              className="px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-semibold transition-colors text-[11px]"
                            >
                              Level 3 - Penalaran Saja (HOTS)
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={selectAllBloom}
                              className="px-2.5 py-1 rounded-md bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium transition-colors text-[11px]"
                            >
                              Pilih Semua Bloom (C1-C6)
                            </button>
                            <button
                              type="button"
                              onClick={selectHotsBloomOnly}
                              className="px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-semibold transition-colors text-[11px]"
                            >
                              HOTS Saja (C4-C6)
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Drawer Content */}
                    {cognitiveDrawer === "TKA" ? (
                      /* Laci Standar TKA Kemendikdasmen */
                      <div className="space-y-1.5 animate-fade-in">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Standar TKA Kemendikdasmen No. 047/H/AN/2025 & No. 045/H/AN/2025:
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                          {TKA_DIFFICULTY_OPTIONS.map((item) => {
                            const isSelected = selectedDifficulties.includes(item.id);
                            return (
                              <div
                                key={item.id}
                                onClick={() => toggleDifficulty(item.id)}
                                className={`cursor-pointer p-3 rounded-xl border-2 transition-all flex items-start justify-between gap-2 ${
                                  isSelected
                                    ? "border-primary bg-primary/[0.04] dark:bg-primary/10 shadow-sm"
                                    : "border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600"
                                }`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100">
                                      {item.label}
                                    </span>
                                    {item.recommended && (
                                      <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold px-1.5 py-0.2 rounded">
                                        HOTS
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight">
                                    {item.desc}
                                  </p>
                                </div>
                                <div
                                  className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                    isSelected
                                      ? "bg-primary text-white"
                                      : "border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-transparent"
                                  }`}
                                >
                                  <Check className="w-3 h-3" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      /* Laci Taksonomi Bloom Revisi */
                      <div className="space-y-1.5 animate-fade-in">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Taksonomi Bloom Revisi (C1 - C6):
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                          {BLOOM_DIFFICULTY_OPTIONS.map((item) => {
                            const isSelected = selectedDifficulties.includes(item.id);
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => toggleDifficulty(item.id)}
                                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                                  isSelected
                                    ? "border-primary bg-primary text-white shadow-sm font-bold"
                                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                                }`}
                              >
                                <span className="truncate">{item.label}</span>
                                {isSelected && <Check className="w-3 h-3 ml-1 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 4: Akordion Lipat Pengaturan Lanjutan (Preset TKA & Editor Blueprint) */}
                  <div className="border border-slate-200 dark:border-slate-700/80 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/30">
                    <button
                      type="button"
                      onClick={() => setIsAccordionOpen(!isAccordionOpen)}
                      className="w-full p-3.5 sm:p-4 flex items-center justify-between text-left hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileCheck2 className="w-4 h-4 text-primary shrink-0" />
                        <div>
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            Pengaturan Lanjutan: Preset Standar TKA & Editor Blueprint
                          </span>
                          <span className="ml-2 text-xs text-slate-500 dark:text-slate-400 font-normal">
                            (Opsional)
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {aiConfig.subject && filteredPresets.some((p) => p.subject === aiConfig.subject) && (
                          <span className="text-[11px] bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">
                            Preset Aktif
                          </span>
                        )}
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                            isAccordionOpen ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {isAccordionOpen && (
                      <div className="p-4 pt-1 border-t border-slate-200/60 dark:border-slate-800/60 space-y-4 animate-fade-in">
                        {/* Preset Filter Tabs */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1">
                            <Filter className="w-3 h-3 text-slate-400" />
                            Jenjang:
                          </span>
                          {[
                            { id: "SEMUA", label: "Semua Preset" },
                            { id: "SD", label: "SD / MI" },
                            { id: "SMP", label: "SMP / MTs" },
                            { id: "SMA_MIPA", label: "SMA MIPA" },
                            { id: "SMA_SOSHUM", label: "SMA IPS / Soshum" },
                            { id: "SMA_BAHASA_UMUM", label: "SMA Bahasa & Umum" },
                            { id: "SMK", label: "SMK Vokasi" },
                          ].map((tab) => {
                            const isActive = selectedPresetFilter === tab.id;
                            return (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => setSelectedPresetFilter(tab.id)}
                                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                                  isActive
                                    ? "bg-primary text-white shadow-sm shadow-primary/20"
                                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                                }`}
                              >
                                {tab.label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Preset Cards Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                          {filteredPresets.map((preset) => {
                            const isSelected = aiConfig.subject === preset.subject;
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => applyTKAPreset(preset)}
                                className={`text-left p-2.5 rounded-xl border transition-all flex flex-col justify-between group ${
                                  isSelected
                                    ? "border-primary bg-primary/10 dark:bg-primary/20 ring-1 ring-primary text-primary"
                                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-primary/50 text-slate-700 dark:text-slate-200 hover:shadow-sm"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-1.5 mb-1">
                                  <span className="font-bold text-xs leading-snug group-hover:text-primary transition-colors">
                                    {preset.name}
                                  </span>
                                  {isSelected ? (
                                    <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                                  ) : (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 shrink-0">
                                      {preset.jenjang}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                  {preset.description}
                                </p>
                              </button>
                            );
                          })}
                        </div>

                        {/* Blueprint Editor */}
                        <div className="pt-2">
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                              Detail Blueprint & Kisi-kisi yang Dikirim ke AI:
                            </label>
                          </div>
                          <WysiwygEditor
                            value={aiConfig.blueprint}
                            onChange={(val) =>
                              setAiConfig({ ...aiConfig, blueprint: val })
                            }
                            placeholder="Pilih salah satu preset di atas atau ketik kisi-kisi custom Anda di sini..."
                            minHeight="140px"
                          />
                        </div>

                        {/* Specific Kisi-kisi Feature Note Banner */}
                        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
                          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Penulisan Kisi-kisi Spesifik Otomatis:</span>{" "}
                            AI akan secara otomatis merumuskan indikator capaian kompetensi operasional (kisi-kisi spesifik per butir soal) yang lengkap dengan stimulus, kondisi, dan performa yang diuji untuk setiap butir soal.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 5: Visual Stimulus Toggle */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="includeImages"
                        checked={aiConfig.includeImages}
                        onChange={(e) =>
                          setAiConfig({
                            ...aiConfig,
                            includeImages: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-primary bg-white border-gray-300 rounded focus:ring-primary dark:focus:ring-primary dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                      />
                      <label
                        htmlFor="includeImages"
                        className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                      >
                        Sertakan Gambar, Geometri Bangun & Diagram Representatif
                      </label>
                    </div>
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">
                      Auto Vektor AI, Geometri & Diagram
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-xl flex items-start gap-2 border border-red-100 dark:border-red-900">
                  <span className="font-bold">Error:</span> {error}
                </div>
              )}

              <div className="mt-6 flex flex-col sm:flex-row sm:justify-end">
                <button
                  onClick={handleStartAnalysis}
                  disabled={
                    isLoading ||
                    (inputMethod === "upload" && !uploadedFile) ||
                    (inputMethod === "ai" && !aiConfig.subject?.trim())
                  }
                  className={`w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base text-white shadow-md flex items-center justify-center gap-2.5 transition-all focus:outline-none focus:ring-4 focus:ring-primary/30 active:scale-[0.98] ${
                    isLoading ||
                    (inputMethod === "upload" && !uploadedFile) ||
                    (inputMethod === "ai" && !aiConfig.subject?.trim())
                      ? "bg-gray-400 dark:bg-slate-600 cursor-not-allowed opacity-80"
                      : "bg-primary hover:bg-primary-focus hover:shadow-lg transform hover:-translate-y-0.5"
                  }`}
                >
                  <CogIcon className="w-5 h-5 shrink-0" />
                  <span className="truncate">
                    {inputMethod === "upload"
                      ? "Analisis & Crop PDF"
                      : `Buat ${aiConfig.count} Soal dengan AI`}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal Dialog Fail-Safe Pembuatan Soal AI */}
      {failSafeState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-7 space-y-5 animate-scale-in">
            {/* Header Modal */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    failSafeState.partialQuestions && failSafeState.partialQuestions.length > 0
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {failSafeState.partialQuestions && failSafeState.partialQuestions.length > 0 ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <AlertCircle className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    {failSafeState.partialQuestions && failSafeState.partialQuestions.length > 0
                      ? `${failSafeState.partialQuestions.length} Soal Berhasil Diamankan`
                      : "Pembuatan Soal AI Mengalami Kendala"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {failSafeState.partialQuestions && failSafeState.partialQuestions.length > 0
                      ? "Sebagian butir berhasil dibuat, sisa butir berikutnya dapat dicoba kembali"
                      : "Tidak ada soal acak yang dimuat agar materi Anda tetap 100% akurat"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismissFailSafe}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Detail Pesan Transparan */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2.5">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span className="text-slate-500 dark:text-slate-400 font-normal mr-1">Status Kendala:</span>
                <span className="text-rose-600 dark:text-rose-400 font-medium">
                  {failSafeState.errorMessage || "Koneksi terputus atau batas waktu (timeout) terlampaui."}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
                🛡️ <strong>Jaminan Kualitas:</strong> Sistem sengaja menghentikan proses pembuatan daripada memberikan soal dummy/acak yang tidak sesuai materi atau kisi-kisi yang Anda minta.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleDismissFailSafe}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
              >
                Batal
              </button>

              {failSafeState.partialQuestions && failSafeState.partialQuestions.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleRetryGeneration(true)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-sm text-sm active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Coba Buat Sisa {failSafeState.remainingCount} Soal</span>
                </button>
              )}

              {failSafeState.partialQuestions && failSafeState.partialQuestions.length > 0 ? (
                <button
                  type="button"
                  onClick={handleAcceptPartialQuestions}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-focus text-white font-bold flex items-center justify-center gap-2 transition-all shadow-md text-sm active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Gunakan {failSafeState.partialQuestions.length} Soal & Lanjut</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRetryGeneration(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-focus text-white font-bold flex items-center justify-center gap-2 transition-all shadow-md text-sm active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Coba Lagi Sekarang</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
