import React from "react";
import type { Question } from "../../../types";
import {
  PencilIcon,
  CloudArrowUpIcon,
  CogIcon,
} from "../../Icons";
import { Code2 } from "lucide-react";
import { useCreationView } from "../useCreationView";
import { ExternalAiPromptPanel } from "./ExternalAiPromptPanel";

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
    aiSectionRef,
    handleStartAnalysis,
    handleManualCreateClick,
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
            Mulai dengan membuat soal secara manual, mengunggah soal dalam format PDF,
            atau menggunakan generator prompt dan impor.
          </p>
        </div>

        {/* Grid 3 Pilihan Pembuatan Ujian */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. Buat Manual */}
          <div
            className="p-6 border-2 rounded-2xl cursor-pointer transition-all duration-300 group border-gray-100 dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-lg bg-white dark:bg-slate-800"
            onClick={handleManualCreateClick}
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-4 rounded-2xl transition-colors bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-slate-300 group-hover:bg-primary/10 group-hover:text-primary">
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

          {/* 2. Unggah PDF Soal */}
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
                Sistem akan otomatis mendeteksi dan memotong soal dari file PDF Anda.
              </p>
            </div>
          </div>

          {/* 3. Prompt & Impor */}
          <div
            className={`p-6 border-2 rounded-2xl cursor-pointer transition-all duration-300 group ${inputMethod === "external_ai" ? "border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-md" : "border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-500/50 hover:shadow-lg"}`}
            onClick={() => {
              setInputMethod("external_ai");
              if (aiSectionRef.current) {
                setTimeout(() => {
                  aiSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 100);
              }
            }}
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div
                className={`p-4 rounded-2xl transition-colors ${inputMethod === "external_ai" ? "bg-indigo-600 text-white" : "bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:group-hover:bg-indigo-950/40"}`}
              >
                <Code2 className="w-8 h-8" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <h3 className="font-bold text-lg text-neutral dark:text-white">
                  Prompt & Impor
                </h3>
              </div>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Buat prompt TKA Kemendikdasmen dan tempelkan hasil dari AI.
              </p>
            </div>
          </div>
        </div>

        {/* Panel Konten Berdasarkan Pilihan */}
        <div ref={aiSectionRef}>
          {inputMethod === "external_ai" ? (
            <ExternalAiPromptPanel onQuestionsGenerated={onQuestionsGenerated} />
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
            /* Panel Unggah PDF Soal */
            <>
              <div className="mb-4">
                <h3 className="text-lg font-bold text-neutral dark:text-white mb-1">
                  Unggah File PDF
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Pilih file PDF dari perangkat Anda untuk dianalisis dan dipotong per butir soal.
                </p>
              </div>

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

              {error && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-xl flex items-start gap-2 border border-red-100 dark:border-red-900">
                  <span className="font-bold">Error:</span> {error}
                </div>
              )}

              <div className="mt-6 flex flex-col sm:flex-row sm:justify-end">
                <button
                  onClick={handleStartAnalysis}
                  disabled={isLoading || !uploadedFile}
                  className={`w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base text-white shadow-md flex items-center justify-center gap-2.5 transition-all focus:outline-none focus:ring-4 focus:ring-primary/30 active:scale-[0.98] ${
                    isLoading || !uploadedFile
                      ? "bg-gray-400 dark:bg-slate-600 cursor-not-allowed opacity-80"
                      : "bg-primary hover:bg-primary-focus hover:shadow-lg transform hover:-translate-y-0.5"
                  }`}
                >
                  <CogIcon className="w-5 h-5 shrink-0" />
                  <span className="truncate">Analisis & Crop PDF</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
