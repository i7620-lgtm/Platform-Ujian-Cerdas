interface FinishedExamsProps {
  exams: Exam[];
  onDeleteExam: (exam: Exam) => void;
  onArchiveExam: (exam: Exam) => void;
  onDuplicateExam: (exam: Exam) => void;
  onViewResults: (exam: Exam) => void;
  onRefresh?: () => Promise<void> | void;
}
import React, { useState } from "react";
import type { Exam } from "../../../types";
import {
  ChartBarIcon,
  ArrowPathIcon,
} from "../../Icons";
import { FinishedExamCard } from "./FinishedExamCard";
export const FinishedExamsView: React.FC<FinishedExamsProps> = ({
  exams,
  onDeleteExam,
  onArchiveExam,
  onDuplicateExam,
  onViewResults,
  onRefresh,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <ChartBarIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-neutral dark:text-white">
              Ujian Selesai
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Riwayat dan hasil ujian yang telah berakhir.
            </p>
          </div>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-xs transition-all shrink-0 cursor-pointer disabled:opacity-60"
            title="Perbarui Daftar Ujian"
          >
            <ArrowPathIcon className={`w-4 h-4 ${isRefreshing ? "animate-spin text-purple-600" : ""}`} />
            <span className="hidden sm:inline">Perbarui</span>
          </button>
        )}
      </div>

      {exams.length > 0 ? (
        <div className="space-y-4">
          {exams.map((exam) => (
            <FinishedExamCard
              key={exam.code}
              exam={exam}
              onDelete={onDeleteExam}
              onArchive={onArchiveExam}
              onDuplicate={onDuplicateExam}
              onViewResults={onViewResults}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
          <div className="bg-gray-50 dark:bg-slate-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <ChartBarIcon className="h-8 w-8 text-gray-300 dark:text-slate-500" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Belum Ada Riwayat
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Hasil ujian yang telah selesai akan muncul di sini.
          </p>
        </div>
      )}
    </div>
  );
};
