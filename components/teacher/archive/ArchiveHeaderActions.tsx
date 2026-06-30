import React from "react";
import type { Exam, ArchiveTab } from "../../../types";
import {
  PencilIcon,
  CloudArrowUpIcon,
  PrinterIcon,
  FilePdfIcon,
  TableCellsIcon,
  DocumentDuplicateIcon,
  SparklesIcon,
} from "../../Icons";

interface ArchiveHeaderActionsProps {
  exam: Exam;
  sourceType: "LOCAL" | "CLOUD" | null;
  currentCloudFilename: string | null;
  isNoAuthor: boolean;
  isLoadingCloud: boolean;
  onReset: () => void;
  onEditMetadata: () => void;
  onPrint: () => void;
  onDownloadPDF: () => void;
  onDownloadExcel: () => void;
  onReuseExam: (exam: Exam) => void;
  onUploadToCloud?: () => Promise<void> | void;
  onReclaimArchive?: () => Promise<void> | void;
  activeTab: ArchiveTab;
  setActiveTab: (tab: ArchiveTab) => void;
  totalStudents: number;
  isGeneratingAI?: boolean;
  onGenerateAI?: () => void;
}

export const ArchiveHeaderActions: React.FC<ArchiveHeaderActionsProps> = ({
  exam,
  sourceType,
  currentCloudFilename,
  isNoAuthor,
  isLoadingCloud,
  onReset,
  onEditMetadata,
  onPrint,
  onDownloadPDF,
  onDownloadExcel,
  onReuseExam,
  onUploadToCloud,
  onReclaimArchive,
  activeTab,
  setActiveTab,
  totalStudents,
  isGeneratingAI,
  onGenerateAI,
}) => {
  return (
    <div className="p-6 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm print:hidden">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              Pratinjau Arsip:{" "}
              <span className="text-indigo-600 dark:text-indigo-400">
                {exam.config.subject}
              </span>
              <button
                onClick={onEditMetadata}
                className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                title="Edit Info"
              >
                <PencilIcon className="w-5 h-5" />
              </button>
            </h2>
            {sourceType === "LOCAL" && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-bold uppercase border border-gray-200">
                Local File
              </span>
            )}
            {sourceType === "CLOUD" && (
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase border border-blue-100">
                Cloud Storage
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-code slashed-zero">
            {exam.code} •{" "}
            {exam.createdAt
              ? `Diarsipkan pada ${new Date(exam.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
              : "Tanggal tidak diketahui"}
            {exam.authorSchool ? ` • ${exam.authorSchool}` : ""} • ID:{" "}
            {exam.authorId ? `"${exam.authorId}"` : "NONE"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto xl:justify-end">
          <button
            onClick={onReset}
            className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
          >
            Muat Lain
          </button>

          {sourceType === "LOCAL" && onUploadToCloud && (
            <button
              onClick={() => onUploadToCloud()}
              disabled={isLoadingCloud}
              className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 text-white text-xs font-bold uppercase rounded-lg hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 dark:shadow-emerald-900/30 flex items-center justify-center gap-2"
            >
              {isLoadingCloud ? (
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <CloudArrowUpIcon className="w-4 h-4" />
              )}
              <span>Simpan ke Cloud</span>
            </button>
          )}

          <button
            onClick={onPrint}
            className="flex-1 sm:flex-none px-4 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white transition-all border border-slate-200 dark:border-slate-600 flex items-center justify-center gap-2 shadow-sm"
          >
            <PrinterIcon className="w-4 h-4" /> Print Arsip
          </button>
          <button
            onClick={onDownloadPDF}
            className="flex-1 sm:flex-none px-4 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white transition-all border border-slate-200 dark:border-slate-600 flex items-center justify-center gap-2 shadow-sm"
          >
            <FilePdfIcon className="w-4 h-4" /> PDF Soal
          </button>
          <button
            onClick={onDownloadExcel}
            className="flex-1 sm:flex-none px-4 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white transition-all border border-slate-200 dark:border-slate-600 flex items-center justify-center gap-2 shadow-sm"
          >
            <TableCellsIcon className="w-4 h-4" /> Excel Data
          </button>
          <button
            onClick={() => onReuseExam(exam)}
            className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 dark:bg-indigo-600 text-white text-xs font-bold uppercase rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 dark:shadow-indigo-900/30 flex items-center gap-2"
          >
            <DocumentDuplicateIcon className="w-4 h-4" /> Gunakan Ulang
          </button>

          {isNoAuthor && onReclaimArchive && (
            <button
              onClick={onReclaimArchive}
              disabled={isLoadingCloud}
              className="flex-1 sm:flex-none px-4 py-2 bg-rose-500 text-white text-xs font-bold uppercase rounded-lg hover:bg-rose-600 transition-all shadow-md shadow-rose-100 dark:shadow-rose-900/30 flex items-center justify-center gap-2"
            >
              {isLoadingCloud ? (
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <CloudArrowUpIcon className="w-4 h-4" />
              )}
              <span>Klaim Arsip</span>
            </button>
          )}
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          {(
            ["DETAIL", "STUDENTS", "ANALYSIS", "CLASS_ANALYSIS"] as ArchiveTab[]
          ).map((tab) => {
            const label =
              tab === "DETAIL"
                ? "Detail Ujian"
                : tab === "STUDENTS"
                  ? `Rekap Siswa (${totalStudents})`
                  : tab === "ANALYSIS"
                    ? "Analisis Soal"
                    : "Analisis Kelas";
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === tab ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
              >
                {label}
              </button>
            );
          })}
        </div>
        {activeTab === "CLASS_ANALYSIS" && onGenerateAI && (
          <button
            onClick={onGenerateAI}
            disabled={isGeneratingAI}
            className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-bold rounded-lg shadow-md transition-all flex items-center gap-2 disabled:opacity-70"
          >
            {isGeneratingAI ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Menganalisis...
              </>
            ) : (
              <>
                <SparklesIcon className="w-4 h-4" />
                Buat Analisis AI
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
