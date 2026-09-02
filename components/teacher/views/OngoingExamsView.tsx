import React from "react";
import { createPortal } from "react-dom";
import type { Exam, Result } from "../../../types";
import {
  ClockIcon,
  QrCodeIcon,
  ShareIcon,
  DocumentDuplicateIcon,
  XMarkIcon,
  UserIcon,
} from "../../Icons";
import { RemainingTime, MetaBadge } from "./SharedComponents";
import { CollaboratorModal } from "../CollaboratorModal";
import { JoinQrModal } from "./JoinQrModal";
import { OngoingExamCard } from "./OngoingExamCard";
import { useOngoingExamsView } from "../useOngoingExamsView";
export const OngoingExamsView: React.FC<{
  exams: Exam[];
  results: Result[];
  onDuplicateExam: (exam: Exam) => void;
  onRefresh?: () => void;
  setSelectedOngoingExam: (exam: Exam | null) => void;
}> = ({
  exams,
  results,
  onDuplicateExam,
  onRefresh,
  setSelectedOngoingExam,
}) => {
  const {
    joinQrExam,
    collabExam,
    setJoinQrExam,
    setCollabExam,
    handleCopyLiveLink,
    handleCopyJoinLink,
    handleDuplicate,
  } = useOngoingExamsView({ onDuplicateExam, setSelectedOngoingExam });

  return (
    <div className="space-y-6 animate-fade-in">
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

      {exams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exams.map((exam) => {
            const activeCount = results.filter(
              (r) => r.examCode === exam.code,
            ).length;
            return (
              <OngoingExamCard
                key={exam.code}
                exam={exam}
                activeCount={activeCount}
                onClick={() => setSelectedOngoingExam(exam)}
                onQrClick={() => setJoinQrExam(exam)}
                onCollabClick={() => setCollabExam(exam)}
                onShareClick={() => handleCopyLiveLink(exam)}
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
