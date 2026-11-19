import React from "react";
import { Exam } from "../../../types";
import {
  TrashIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  DocumentDuplicateIcon,
  ChartBarIcon,
} from "../../Icons";
import { MetaBadge } from "./SharedComponents";

interface FinishedExamCardProps {
  exam: Exam;
  onDelete: (exam: Exam) => void;
  onArchive: (exam: Exam) => void;
  onDuplicate: (exam: Exam) => void;
  onViewResults: (exam: Exam) => void;
}

export const FinishedExamCard: React.FC<FinishedExamCardProps> = ({
  exam,
  onDelete,
  onArchive,
  onDuplicate,
  onViewResults,
}) => {
  const formattedEndDate = new Date(exam.config.date).toLocaleDateString(
    "id-ID",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col gap-4 md:bg-transparent md:dark:bg-transparent md:px-5 md:py-4 md:rounded-none md:border-0 md:shadow-none md:hover:bg-slate-50/70 md:dark:hover:bg-slate-700/30 md:flex-row md:items-center md:justify-between md:gap-4 transition-colors group">
      <div className="flex items-start gap-3.5 md:gap-4 flex-1 min-w-0">
        <div className="bg-slate-50 dark:bg-slate-700/70 p-2.5 rounded-xl border border-slate-100 dark:border-slate-600 shrink-0">
          <CheckCircleIcon className="w-5 h-5 text-slate-400 dark:text-slate-400 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center flex-wrap gap-2 mb-1">
            <h3 className="font-bold text-base sm:text-lg md:text-base text-neutral dark:text-white truncate max-w-full">
              {exam.config.subject || exam.code}
            </h3>
            <span className="text-xs font-code slashed-zero text-slate-400 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/80 px-1.5 py-0.5 rounded shrink-0">
              {exam.code}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
            <MetaBadge
              text={exam.config.classLevel}
              colorClass="bg-gray-100 text-gray-600"
            />
            <MetaBadge
              text={exam.config.examType}
              colorClass="bg-gray-100 text-gray-600"
            />
            {exam.config.isOlympiadMode && (
              <MetaBadge
                text={`Olimpiade (+${exam.config.olympiadScoring?.correctMultiplier ?? 4} / ${exam.config.olympiadScoring?.wrongMultiplier ?? -1} / ${exam.config.olympiadScoring?.emptyMultiplier ?? 0})`}
                colorClass="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
              />
            )}
            {exam.config.targetClasses &&
              exam.config.targetClasses.length > 0 && (
                <MetaBadge
                  text={exam.config.targetClasses.join(", ")}
                  colorClass="bg-orange-50 text-orange-700 border-orange-100"
                />
              )}
            <span className="w-full md:w-auto text-xs text-slate-500 dark:text-slate-400 mt-1 md:mt-0 md:ml-1 tabular-nums whitespace-nowrap">
              Selesai: {formattedEndDate}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 md:flex md:items-center md:gap-1.5 md:flex-nowrap shrink-0">
        <button
          type="button"
          onClick={() => onViewResults(exam)}
          className="col-span-1 py-2.5 px-2.5 md:py-1.5 md:px-3 bg-slate-900 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-700 text-white rounded-xl md:rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer whitespace-nowrap shrink-0"
          title="Lihat Hasil Ujian"
        >
          <ChartBarIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Hasil</span>
        </button>
        <button
          type="button"
          onClick={() => onDuplicate(exam)}
          className="col-span-1 py-2.5 px-2.5 md:py-1.5 md:px-2.5 bg-slate-50 dark:bg-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl md:rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
          title="Duplikasi Soal"
        >
          <DocumentDuplicateIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Salin</span>
        </button>
        <button
          type="button"
          onClick={() => onArchive(exam)}
          className="col-span-1 py-2.5 px-2.5 md:py-1.5 md:px-2.5 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 rounded-xl md:rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
          title="Simpan ke Cloud & Hapus SQL"
        >
          <CloudArrowUpIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Arsip</span>
        </button>
        <button
          type="button"
          onClick={() => onDelete(exam)}
          className="col-span-3 py-2.5 px-3 md:py-1.5 md:px-2.5 bg-rose-50/70 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60 rounded-xl md:rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          title="Hapus Data Ujian & Hasil"
        >
          <TrashIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Hapus</span>
        </button>
      </div>
    </div>
  );
};
