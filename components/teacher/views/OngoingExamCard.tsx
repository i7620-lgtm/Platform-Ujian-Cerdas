import React from "react";
import { Monitor } from "lucide-react";
import { Exam } from "../../../types";
import {
  QrCodeIcon,
  UserIcon,
  DocumentDuplicateIcon,
} from "../../Icons";
import { MetaBadge, RemainingTime } from "./SharedComponents";

interface OngoingExamCardProps {
  exam: Exam;
  activeCount: number;
  onClick: () => void;
  onQrClick: () => void;
  onCollabClick: () => void;
  onDuplicateClick: () => void;
}

export const OngoingExamCard: React.FC<OngoingExamCardProps> = ({
  exam,
  activeCount,
  onClick,
  onQrClick,
  onCollabClick,
  onDuplicateClick,
}) => {
  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/70 shadow-sm flex flex-col gap-4 md:bg-transparent md:dark:bg-transparent md:px-5 md:py-4 md:rounded-none md:border-0 md:shadow-none md:hover:bg-emerald-50/30 md:dark:hover:bg-emerald-950/20 lg:flex-row lg:items-center lg:justify-between lg:gap-4 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center flex-wrap gap-2 mb-1.5">
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md border border-emerald-200/70 dark:border-emerald-800/60 inline-flex items-center gap-1.5 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Sedang Berlangsung
          </span>
          <h3 className="font-bold text-base sm:text-lg md:text-base text-slate-900 dark:text-white truncate max-w-full">
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
          {exam.config.examMode === "PR" && (
            <MetaBadge
              text={`Mode PR (s.d. ${exam.config.endTime || "23:59"})`}
              colorClass="bg-amber-50 text-amber-700 border-amber-200"
            />
          )}
          {exam.config.isOlympiadMode && (
            <MetaBadge
              text={`Olimpiade (+${exam.config.olympiadScoring?.correctMultiplier ?? 4} / ${exam.config.olympiadScoring?.wrongMultiplier ?? -1} / ${exam.config.olympiadScoring?.emptyMultiplier ?? 0})`}
              colorClass="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
            />
          )}
          {exam.config.targetClasses && exam.config.targetClasses.length > 0 && (
            <MetaBadge
              text={exam.config.targetClasses.join(", ")}
              colorClass="bg-orange-50 text-orange-700 border-orange-100"
            />
          )}

          <div className="w-full md:w-auto flex items-center justify-between pt-2.5 mt-1 border-t border-slate-100 dark:border-slate-700/80 md:pt-0 md:mt-0 md:border-0 md:justify-start md:gap-2.5 md:ml-1">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
              <span className="text-slate-400 dark:text-slate-500 font-medium md:hidden">
                Partisipan:{" "}
              </span>
              {activeCount} Siswa
            </span>
            <RemainingTime exam={exam} size="sm" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:flex md:items-center md:gap-1.5 md:flex-nowrap shrink-0">
        <button
          type="button"
          onClick={onClick}
          className="py-2.5 px-3 md:py-1.5 md:px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl md:rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer whitespace-nowrap shrink-0"
          title="Pantau Ujian Berlangsung"
        >
          <Monitor className="w-3.5 h-3.5 shrink-0" />
          <span>Monitor</span>
        </button>
        <button
          type="button"
          onClick={onQrClick}
          className="py-2.5 px-3 md:py-1.5 md:px-2.5 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 rounded-xl md:rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
          title="QR Code & Link Gabung Siswa"
        >
          <QrCodeIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Link Siswa</span>
        </button>
        <button
          type="button"
          onClick={onCollabClick}
          className="py-2.5 px-3 md:py-1.5 md:px-2.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 rounded-xl md:rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
          title="Akses Kolaborasi"
        >
          <UserIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Tim</span>
        </button>
        <button
          type="button"
          onClick={onDuplicateClick}
          className="py-2.5 px-3 md:py-1.5 md:px-2.5 bg-slate-50 dark:bg-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl md:rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
          title="Duplikasi Soal"
        >
          <DocumentDuplicateIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Salin</span>
        </button>
      </div>
    </div>
  );
};
