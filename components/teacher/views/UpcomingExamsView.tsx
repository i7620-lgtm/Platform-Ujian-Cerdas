import React, { useState } from "react";
import type { Exam, TeacherProfile } from "../../../types";
import { CalendarDaysIcon, ArrowPathIcon } from "../../Icons";
import { InvitationModal } from "../InvitationModal";
import { CollaboratorModal } from "../CollaboratorModal";
import { useUpcomingExamsView } from "../useUpcomingExamsView";
import { UpcomingExamCard } from "./UpcomingExamCard";

interface UpcomingExamsViewProps {
  exams: Exam[];
  teacherProfile: TeacherProfile;
  onDeleteExam: (exam: Exam) => void;
  onRefresh?: () => Promise<void> | void;
  onEditExam: (exam: Exam) => void;
  onDuplicateExam: (exam: Exam) => void;
}

export const UpcomingExamsView: React.FC<UpcomingExamsViewProps> = ({
  exams,
  teacherProfile,
  onDeleteExam,
  onRefresh,
  onEditExam,
  onDuplicateExam,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const {
    selectedInviteExam,
    selectedCollaboratorExam,
    setSelectedInviteExam,
    setSelectedCollaboratorExam,
    teacherName,
    schoolName,
  } = useUpcomingExamsView({ teacherProfile });

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
    <div
      id="upcoming-exams-view-container"
      className="space-y-6 animate-fade-in"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <CalendarDaysIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-neutral dark:text-white">
              Ujian Akan Datang
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Daftar semua ujian yang telah dijadwalkan.
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
            <ArrowPathIcon
              className={`w-4 h-4 ${isRefreshing ? "animate-spin text-blue-600" : ""}`}
            />
            <span className="hidden sm:inline">Perbarui</span>
          </button>
        )}
      </div>

      {exams.length > 0 ? (
        <div
          id="upcoming-exams-list"
          className="flex flex-col gap-4 md:gap-0 md:bg-white md:dark:bg-slate-800 md:rounded-2xl md:border md:border-slate-200 md:dark:border-slate-700 md:divide-y md:divide-slate-100 md:dark:divide-slate-700/80 md:shadow-xs md:overflow-hidden"
        >
          {exams.map((exam) => (
            <UpcomingExamCard
              key={exam.code}
              exam={exam}
              onInvite={() => setSelectedInviteExam(exam)}
              onCollab={() => setSelectedCollaboratorExam(exam)}
              onEdit={() => onEditExam(exam)}
              onDuplicate={() => onDuplicateExam(exam)}
              onDelete={() => onDeleteExam(exam)}
            />
          ))}
        </div>
      ) : (
        <div
          id="no-upcoming-exams"
          className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700"
        >
          <div className="bg-gray-50 dark:bg-slate-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarDaysIcon className="h-8 w-8 text-gray-300 dark:text-slate-500" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Tidak Ada Ujian Terjadwal
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Buat ujian baru untuk memulai.
          </p>
        </div>
      )}

      {/* Modal Undangan Spesifik */}
      <InvitationModal
        isOpen={!!selectedInviteExam}
        onClose={() => setSelectedInviteExam(null)}
        exam={selectedInviteExam}
        teacherName={teacherName}
        schoolName={schoolName}
      />

      {/* Modal Kolaborator */}
      {selectedCollaboratorExam && (
        <CollaboratorModal
          exam={
            exams.find((e) => e.code === selectedCollaboratorExam.code) ||
            selectedCollaboratorExam
          }
          onClose={() => setSelectedCollaboratorExam(null)}
          onUpdate={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
};
