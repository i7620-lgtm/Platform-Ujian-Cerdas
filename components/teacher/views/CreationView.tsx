import React from "react";
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
} from "lucide-react";
import { useCreationView } from "../useCreationView";

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
    id: "Level 3 - Penalaran (Reasoning / HOTS)",
    label: "Level 3 - Penalaran (HOTS)",
    desc: "Menganalisis relasi, pemecahan masalah non-rutin & penalaran kasus",
    recommended: true,
  },
  {
    id: "Level 2 - Penerapan (Applying / MOTS)",
    label: "Level 2 - Penerapan (MOTS)",
    desc: "Memodelkan kalimat matematika & mengaplikasikan konsep rutin",
  },
  {
    id: "Level 1 - Pemahaman (Knowing & Understanding / LOTS)",
    label: "Level 1 - Pemahaman (LOTS)",
    desc: "Menghitung prosedur, membaca tabel/grafik/diagram & fakta materi",
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

const QUICK_COUNT_OPTIONS = [3, 5, 10, 15, 20, 25, 30, 40, 50];

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
    aiSectionRef,
    handleStartAnalysis,
    handleManualCreateClick,
    handleAiClick,
    handleFileChange,
  } = useCreationView({ onQuestionsGenerated });

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
        : ["Level 3 - Penalaran (Reasoning / HOTS)"];

  const toggleDifficulty = (diffId: string) => {
    if (selectedDifficulties.includes(diffId)) {
      if (selectedDifficulties.length > 1) {
        const updated = selectedDifficulties.filter((d) => d !== diffId);
        setAiConfig({
          ...aiConfig,
          difficulties: updated,
          difficulty: updated[0],
        });
      }
    } else {
      const updated = [...selectedDifficulties, diffId];
      setAiConfig({
        ...aiConfig,
        difficulties: updated,
        difficulty: updated[0],
      });
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

  const selectHotsOnly = () => {
    const hotsList = [
      "Level 3 - Penalaran (Reasoning / HOTS)",
      "C4 - Menganalisis",
      "C5 - Mengevaluasi",
      "C6 - Mencipta",
    ];
    setAiConfig({
      ...aiConfig,
      difficulties: hotsList,
      difficulty: hotsList[0],
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

  const handleCountChange = (value: number) => {
    const clamped = Math.max(1, Math.min(50, value));
    setAiConfig({ ...aiConfig, count: clamped });
  };

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
          {isLoading && (
            <div className="absolute inset-0 bg-white/95 dark:bg-slate-800/98 z-10 flex flex-col items-center justify-center p-8 animate-fade-in backdrop-blur-sm">
              <style>{`
                @keyframes local-progress {
                  0% { width: 0%; }
                  50% { width: 70%; }
                  100% { width: 100%; }
                }
                .animate-local-progress {
                  animation: local-progress 12s cubic-bezier(0.1, 0.8, 0.2, 1) infinite;
                }
              `}</style>
              <div className="w-full max-w-md space-y-6 text-center">
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping"></div>
                  <div className="absolute inset-2 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                  <div className="absolute inset-4 rounded-full bg-primary/10 flex items-center justify-center">
                    {inputMethod === "upload" ? (
                      <CloudArrowUpIcon className="w-6 h-6 text-primary" />
                    ) : (
                      <SparklesIcon className="w-6 h-6 text-primary animate-pulse" />
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-lg font-bold text-neutral dark:text-white">
                    {inputMethod === "upload" ? "Mengekstrak PDF Soal" : "Merumuskan Soal AI"}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {inputMethod === "upload"
                      ? "Sedang membaca file PDF, mendeteksi struktur tata letak soal, dan memotong bagian visual secara otomatis..."
                      : "Menghubungi engine Gemini AI untuk merancang butir soal sesuai dengan tingkat kognitif dan kisi-kisi..."}
                  </p>
                </div>

                <div className="space-y-3 pt-2 text-left bg-gray-50 dark:bg-slate-900/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-primary animate-ping"></div>
                    <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                      {inputMethod === "upload" ? "Menyiapkan lembar kerja digital & menganalisis layout..." : "Menyusun opsi distractor & menentukan bobot..."}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full animate-local-progress"></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 dark:text-slate-500">
                    <span>Proses Asinkron</span>
                    <span>Harap tunggu...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="mb-4">
            <h3 className="text-lg font-bold text-neutral dark:text-white mb-1">
              {inputMethod === "upload"
                ? "Unggah File PDF"
                : "Pembuatan Soal Berbantuan AI"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {inputMethod === "upload"
                ? "Pilih file PDF dari perangkat Anda."
                : "Isi konfigurasi di bawah ini untuk menghasilkan soal."}
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
                    placeholder="Contoh: Matematika SD - Operasi Hitung Pecahan Campuran & Perbandingan"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[11px] text-gray-500 dark:text-slate-400 self-center mr-1">
                      Saran:
                    </span>
                    {[
                      "Matematika SD (TKA)",
                      "Matematika SMP (TKA)",
                      "IPA SD - Rantai Makanan & Adaptasi",
                      "Bahasa Indonesia - Literasi Membaca",
                      "Numerasi Data & Statistika",
                    ].map((topic) => (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => setAiConfig({ ...aiConfig, subject: topic })}
                        className="text-[11px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-md transition-colors"
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Enhanced Question Count Field */}
                <div className="lg:col-span-5 bg-slate-50/80 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span>Jumlah Butir Soal</span>
                        <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">
                          1 - 50 Butir
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
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="50"
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
                        disabled={aiConfig.count >= 50}
                        className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Count Shortcut Pills */}
                  <div className="flex flex-wrap gap-1 mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                    <span className="text-[11px] text-gray-500 dark:text-slate-400 self-center mr-1">
                      Pintas:
                    </span>
                    {QUICK_COUNT_OPTIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleCountChange(c)}
                        className={`text-xs px-2 py-0.5 rounded font-medium transition-all ${
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

              {/* Section 2: Multi-Select Question Types */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-primary" />
                    <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Jenis Soal yang Dihasilkan (Bisa Pilih Beberapa Sekaligus)
                    </label>
                    <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                      {selectedTypes.length} Jenis Terpilih
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={selectAllTypes}
                      className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors text-[11px]"
                    >
                      Pilih Semua (6)
                    </button>
                    <button
                      type="button"
                      onClick={selectTkaTypes}
                      className="px-2 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary font-semibold transition-colors text-[11px]"
                    >
                      Standar TKA (PG, PGK, B/S)
                    </button>
                    <button
                      type="button"
                      onClick={() => selectSingleType("Pilihan Ganda")}
                      className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors text-[11px]"
                    >
                      PG Saja
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {QUESTION_TYPE_OPTIONS.map((item) => {
                    const isSelected = selectedTypes.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleType(item.id)}
                        className={`cursor-pointer p-3.5 rounded-xl border-2 transition-all flex items-start justify-between gap-2.5 ${
                          isSelected
                            ? "border-primary bg-primary/[0.04] dark:bg-primary/10 shadow-sm"
                            : "border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                              {item.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                            {item.desc}
                          </p>
                          <span
                            className={`inline-block text-[10px] px-1.5 py-0.2 rounded font-semibold mt-0.5 ${
                              isSelected
                                ? "bg-primary/15 text-primary"
                                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            {item.badge}
                          </span>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isSelected
                              ? "bg-primary text-white"
                              : "border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-transparent"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Multi-Select Cognitive Levels */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-primary" />
                    <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Tingkat Kognitif & Kesulitan (Bisa Pilih Beberapa Sekaligus)
                    </label>
                    <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                      {selectedDifficulties.length} Level Terpilih
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={selectAllTkaDifficulties}
                      className="px-2 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary font-semibold transition-colors text-[11px]"
                    >
                      Semua Level TKA (L1, L2, L3)
                    </button>
                    <button
                      type="button"
                      onClick={selectHotsOnly}
                      className="px-2 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-semibold transition-colors text-[11px]"
                    >
                      HOTS Saja (L3 & C4-C6)
                    </button>
                    <button
                      type="button"
                      onClick={selectAllBloom}
                      className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors text-[11px]"
                    >
                      Lengkap Bloom (C1-C6)
                    </button>
                  </div>
                </div>

                {/* Sub-Group 1: Standar TKA Kemendikdasmen No. 047/H/AN/2025 */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Standar TKA Kemendikdasmen No. 047/H/AN/2025
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

                {/* Sub-Group 2: Taksonomi Bloom Revisi */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Taksonomi Bloom Revisi
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    {BLOOM_DIFFICULTY_OPTIONS.map((item) => {
                      const isSelected = selectedDifficulties.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleDifficulty(item.id)}
                          className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all ${
                            isSelected
                              ? "border-primary bg-primary text-white shadow-sm"
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
              </div>

              {/* Section 4: Blueprint & Specific Kisi-kisi Guidance */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-primary" />
                    <span>Panduan Kisi-kisi & Konteks Tambahan</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setAiConfig({
                          ...aiConfig,
                          subject: aiConfig.subject || "Matematika SD (TKA)",
                          difficulties: [
                            "Level 3 - Penalaran (Reasoning / HOTS)",
                            "Level 2 - Penerapan (Applying / MOTS)",
                          ],
                          types: ["Pilihan Ganda", "Pilihan Ganda Kompleks", "Benar/Salah"],
                          blueprint:
                            "Standar TKA Matematika SD Kemendikdasmen No. 047/H/AN/2025:\n- Domain Bilangan, Geometri & Pengukuran, Aljabar, Data & Ketidakpastian\n- Menggunakan stimulus kontekstual nyata & multi-langkah penalaran\n- Pengecoh (distraktor) logis & hitungan akurat 100%",
                        });
                      }}
                      className="text-primary hover:underline text-[11px] font-semibold bg-primary/10 px-2 py-0.5 rounded"
                    >
                      + Preset TKA SD
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAiConfig({
                          ...aiConfig,
                          subject: aiConfig.subject || "Matematika SMP (TKA)",
                          difficulties: ["Level 3 - Penalaran (Reasoning / HOTS)"],
                          types: ["Pilihan Ganda", "Pilihan Ganda Kompleks", "Benar/Salah"],
                          blueprint:
                            "Standar TKA Matematika SMP Kemendikdasmen No. 047/H/AN/2025:\n- Aljabar, Bilangan Real & Berpangkat, Geometri Ruang/Datar, Peluang & Statistika\n- Menguji penalaran model fisis, perbandingan, dan pemecahan masalah non-rutin\n- Notasi matematika baku LaTeX",
                        });
                      }}
                      className="text-primary hover:underline text-[11px] font-semibold bg-primary/10 px-2 py-0.5 rounded"
                    >
                      + Preset TKA SMP
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAiConfig({
                          ...aiConfig,
                          subject: aiConfig.subject || "Bahasa Indonesia - Literasi Membaca",
                          types: ["Pilihan Ganda", "Pilihan Ganda Kompleks", "Benar/Salah"],
                          difficulties: [
                            "Level 3 - Penalaran (Reasoning / HOTS)",
                            "Level 2 - Penerapan (Applying / MOTS)",
                          ],
                          blueprint:
                            "Asesmen Literasi Membaca TKA:\n- Teks fiksi/fabel bermuatan budi pekerti atau teks informasi sains/lingkungan hidup\n- Menemukan informasi tersirat, menganalisis watak tokoh, dan menyimpulkan ide pokok",
                        });
                      }}
                      className="text-primary hover:underline text-[11px] font-semibold bg-primary/10 px-2 py-0.5 rounded"
                    >
                      + Literasi Membaca
                    </button>
                  </div>
                </div>

                <textarea
                  value={aiConfig.blueprint}
                  onChange={(e) =>
                    setAiConfig({ ...aiConfig, blueprint: e.target.value })
                  }
                  className="w-full h-24 p-3 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm resize-y text-slate-800 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 transition-all font-mono text-xs leading-relaxed"
                  placeholder="Contoh: Standar TKA Kemendikdasmen - Operasi hitung pecahan campuran, stimulus fabel/kegiatan sosial, penalaran bertingkat..."
                />

                {/* Specific Kisi-kisi Feature Note Banner */}
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Penulisan Kisi-kisi Spesifik Otomatis:</span>{" "}
                    AI akan secara otomatis merumuskan indikator capaian kompetensi operasional (kisi-kisi spesifik per butir soal) yang lengkap dengan stimulus, kondisi, dan performa yang diuji untuk setiap soal yang dibuat.
                  </div>
                </div>
              </div>

              {/* Visual Stimulus Toggle */}
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
                  Wikimedia & Visual SVG
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
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>{" "}
                  <span>Sedang Menyusun {aiConfig.count} Soal & Kisi-Kisi...</span>
                </>
              ) : (
                <>
                  <CogIcon className="w-5 h-5 shrink-0" />
                  <span className="truncate">
                    {inputMethod === "upload"
                      ? "Analisis & Crop PDF"
                      : `Buat ${aiConfig.count} Soal dengan AI`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
