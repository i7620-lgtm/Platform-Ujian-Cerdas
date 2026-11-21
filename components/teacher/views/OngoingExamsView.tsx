import React, { useState } from "react";
import type { Exam, Result } from "../../../types";
import {
  ClockIcon,
  ArrowPathIcon,
} from "../../Icons";
import { CollaboratorModal } from "../CollaboratorModal";
import { JoinQrModal } from "./JoinQrModal";
import { OngoingExamCard } from "./OngoingExamCard";
import { useOngoingExamsView } from "../useOngoingExamsView";
export const OngoingExamsView: React.FC<{
  exams: Exam[];
  results: Result[];
  ongoingExamCounts?: Record<string, number>;
  onDuplicateExam: (exam: Exam) => void;
  onRefresh?: () => Promise<void> | void;
  setSelectedOngoingExam: (exam: Exam | null) => void;
}> = ({
  exams,
  results,
  ongoingExamCounts,
  onDuplicateExam,
  onRefresh,
  setSelectedOngoingExam,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const {
    joinQrExam,
    collabExam,
    setJoinQrExam,
    setCollabExam,
    handleCopyJoinLink,
    handleDuplicate,
  } = useOngoingExamsView({ onDuplicateExam, setSelectedOngoingExam });

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
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
            <ClockIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-neutral dark:text-white">
              Ujian Sedang Berlangsung
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Pantau kemajuan ujian yang sedang berjalan secara real-time.
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
            <ArrowPathIcon className={`w-4 h-4 ${isRefreshing ? "animate-spin text-emerald-600" : ""}`} />
            <span className="hidden sm:inline">Perbarui</span>
          </button>
        )}
      </div>

      {exams.length > 0 ? (
        <div className="flex flex-col gap-4 md:gap-0 md:bg-white md:dark:bg-slate-800 md:rounded-2xl md:border md:border-emerald-200/80 md:dark:border-emerald-900/60 md:divide-y md:divide-slate-100 md:dark:divide-slate-700/80 md:shadow-xs md:overflow-hidden">
          {exams.map((exam) => {
            const activeCount =
              ongoingExamCounts && Object.prototype.hasOwnProperty.call(ongoingExamCounts, exam.code)
                ? ongoingExamCounts[exam.code]
                : results.filter((r) => r.examCode === exam.code).length;
            return (
              <OngoingExamCard
                key={exam.code}
                exam={exam}
                activeCount={activeCount}
                onClick={() => setSelectedOngoingExam(exam)}
                onQrClick={() => setJoinQrExam(exam)}
                onCollabClick={() => setCollabExam(exam)}
                onDuplicateClick={() => handleDuplicate(exam)}
              />
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
          <div className="bg-gray-50 dark:bg-slate-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClockIcon className="h-8 w-8 text-gray-300 dark:text-slate-500" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Tidak Ada Ujian Aktif
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Saat ini tidak ada ujian yang sedang berlangsung.
          </p>
        </div>
      )}

      {joinQrExam && (
        <JoinQrModal
          exam={joinQrExam}
          onClose={() => setJoinQrExam(null)}
          onCopyLink={handleCopyJoinLink}
        />
      )}

      {collabExam && (
        <CollaboratorModal
          exam={exams.find((e) => e.code === collabExam.code) || collabExam}
          onClose={() => setCollabExam(null)}
          onUpdate={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
};
