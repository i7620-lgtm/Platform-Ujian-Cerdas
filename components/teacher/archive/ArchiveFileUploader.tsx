import React, { useRef } from "react";
import { CloudArrowUpIcon, DocumentDuplicateIcon } from "../../Icons";
import { fixArchiveDataSorting, type ArchiveData } from "./archiveUtils";

interface ArchiveFileUploaderProps {
  onFileProcessed: (data: ArchiveData) => void;
  error: string;
  setError: (err: string) => void;
  teacherProfile: any;
}

export const ArchiveFileUploader: React.FC<ArchiveFileUploaderProps> = ({
  onFileProcessed,
  error,
  setError,
  teacherProfile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setError("");
    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
      setError("File harus berformat .json");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (typeof result === "string") {
          const data: ArchiveData = JSON.parse(result);
          if (
            data &&
            data.exam &&
            data.exam.questions &&
            data.exam.config &&
            Array.isArray(data.results)
          ) {
            const normalized = fixArchiveDataSorting(data, teacherProfile);
            onFileProcessed(normalized);
          } else {
            setError("File JSON tidak valid atau bukan format arsip lengkap.");
          }
        }
      } catch {
        setError(
          "Gagal membaca file. Pastikan file berformat JSON yang benar.",
        );
      }
    };
    reader.onerror = () => setError("Terjadi kesalahan saat membaca file.");
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
      <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
        <DocumentDuplicateIcon className="w-5 h-5 text-emerald-500" /> Upload
        File Lokal
      </h3>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
        className="flex-1 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors relative cursor-pointer flex flex-col items-center justify-center min-h-[180px]"
      >
        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <CloudArrowUpIcon className="w-10 h-10 text-slate-300 dark:text-slate-500 mb-3" />
        <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">
          Pilih file .json
        </p>
        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
          atau seret file ke sini
        </p>
      </div>
      {error && (
        <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-xs rounded-lg border border-rose-100 dark:border-rose-900">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
};
