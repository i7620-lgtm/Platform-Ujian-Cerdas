import React from "react";
import { createPortal } from "react-dom";
import type { Exam } from "../../../types";
import {
  PencilIcon,
  TrashIcon,
  CalendarDaysIcon,
  ListBulletIcon,
  XMarkIcon,
  EyeIcon,
} from "../../Icons";
import { MetaBadge } from "./SharedComponents";
import { useDraftsView } from "../useDraftsView";
import { PreviewModal } from "./PreviewModal";
import { DraftExamCard } from "./DraftExamCard";

export const DraftsView: React.FC<DraftsViewProps> = ({
  exams,
  onDeleteDraft,
  onContinueDraft,
}) => {
  const { previewExam, setPreviewExam, handleCopyPreviewLink } =
    useDraftsView();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-gray-100 dark:bg-slate-800 rounded-lg">
          <PencilIcon className="w-6 h-6 text-gray-600 dark:text-slate-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-neutral dark:text-white">
            Draf Soal
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Lanjutkan pembuatan soal yang belum selesai.
          </p>
        </div>
      </div>

      {exams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => (
            <DraftExamCard
              key={exam.code}
              exam={exam}
              onDelete={() => onDeleteDraft(exam)}
              onPreview={() => setPreviewExam(exam)}
              onContinue={() => onContinueDraft(exam)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
          <div className="bg-gray-50 dark:bg-slate-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <PencilIcon className="h-8 w-8 text-gray-300 dark:text-slate-500" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Belum Ada Draf
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Anda belum menyimpan draf soal apapun.
          </p>
        </div>
      )}

      {previewExam && (
        <PreviewModal
          exam={previewExam}
          onClose={() => setPreviewExam(null)}
          onCopyLink={handleCopyPreviewLink}
        />
      )}
    </div>
  );
};
