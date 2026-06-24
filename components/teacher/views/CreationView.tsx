import React from "react";
import type { Question } from "../../../types";
import {
  PencilIcon,
  CloudArrowUpIcon,
  SparklesIcon,
  CogIcon,
} from "../../Icons";
import { useCreationView } from "../useCreationView";

interface CreationViewProps {
  onQuestionsGenerated: (
    questions: Question[],
    mode: "manual" | "auto",
  ) => void;
  isPremium?: boolean;
}

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
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Mata Pelajaran / Materi
                  </label>
                  <input
                    type="text"
                    value={aiConfig.subject}
                    onChange={(e) =>
                      setAiConfig({ ...aiConfig, subject: e.target.value })
                    }
                    className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm text-slate-800 dark:text-slate-200"
                    placeholder="Contoh: Biologi - Sel"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Jumlah Soal
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={aiConfig.count}
                    onChange={(e) =>
                      setAiConfig({
                        ...aiConfig,
                        count: parseInt(e.target.value) || 5,
                      })
                    }
                    className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Jenis Soal
                  </label>
                  <select
                    value={aiConfig.type}
                    onChange={(e) =>
                      setAiConfig({ ...aiConfig, type: e.target.value })
                    }
                    className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm text-slate-800 dark:text-slate-200"
                  >
                    <option value="Pilihan Ganda">Pilihan Ganda</option>
                    <option value="Pilihan Ganda Kompleks">
                      Pilihan Ganda Kompleks
                    </option>
                    <option value="Benar/Salah">Benar/Salah</option>
                    <option value="Menjodohkan">Menjodohkan</option>
                    <option value="Uraian Singkat">Uraian Singkat</option>
                    <option value="Esai">Esai</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Tingkat Kognitif
                  </label>
                  <select
                    value={aiConfig.difficulty}
                    onChange={(e) =>
                      setAiConfig({ ...aiConfig, difficulty: e.target.value })
                    }
                    className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm text-slate-800 dark:text-slate-200"
                  >
                    <option value="C1 - Mengingat">C1 - Mengingat</option>
                    <option value="C2 - Memahami">C2 - Memahami</option>
                    <option value="C3 - Mengaplikasikan">
                      C3 - Mengaplikasikan
                    </option>
                    <option value="C4 - Menganalisis">C4 - Menganalisis</option>
                    <option value="C5 - Mengevaluasi">C5 - Mengevaluasi</option>
                    <option value="C6 - Mencipta">C6 - Mencipta</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Kisi-kisi / Konteks Tambahan (Opsional)
                </label>
                <textarea
                  value={aiConfig.blueprint}
                  onChange={(e) =>
                    setAiConfig({ ...aiConfig, blueprint: e.target.value })
                  }
                  className="w-full h-24 p-3 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm resize-y text-slate-800 dark:text-slate-200"
                  placeholder="Contoh: Fokus pada perbedaan sel hewan dan sel tumbuhan..."
                />
              </div>
              <div className="flex items-center gap-2">
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
                  className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary dark:focus:ring-primary dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label
                  htmlFor="includeImages"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Sertakan Gambar Referensi (dari Wikimedia Commons)
                </label>
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
                (inputMethod === "ai" && !aiConfig.subject)
              }
              className={`w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base text-white shadow-md flex items-center justify-center gap-2.5 transition-all focus:outline-none focus:ring-4 focus:ring-primary/30 active:scale-[0.98] ${isLoading || (inputMethod === "upload" && !uploadedFile) || (inputMethod === "ai" && !aiConfig.subject) ? "bg-gray-400 dark:bg-slate-600 cursor-not-allowed opacity-80" : "bg-primary hover:bg-primary-focus hover:shadow-lg transform hover:-translate-y-0.5"}`}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>{" "}
                  Memproses...
                </>
              ) : (
                <>
                  <CogIcon className="w-5 h-5 shrink-0" />
                  <span className="truncate">
                    {inputMethod === "upload"
                      ? "Analisis & Crop PDF"
                      : "Buat Soal dengan AI"}
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
