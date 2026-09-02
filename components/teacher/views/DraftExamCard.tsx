import React from "react";
import { Exam } from "../../../types";
import {
  TrashIcon,
  CalendarDaysIcon,
  ListBulletIcon,
  EyeIcon,
  PencilIcon,
} from "../../Icons";
import { MetaBadge } from "./SharedComponents";

interface DraftExamCardProps {
  exam: Exam;
  onDelete: () => void;
  onPreview: () => void;
  onContinue: () => void;
}

export const DraftExamCard: React.FC<DraftExamCardProps> = ({
  exam,
  onDelete,
  onPreview,
  onContinue,
}) => {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all duration-300 relative group flex flex-col h-full">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute top-3 right-3 p-2 bg-white dark:bg-slate-700 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 border border-gray-100 dark:border-slate-600 hover:border-red-100 rounded-full transition-all shadow-sm z-10"
        title="Hapus Draf"
      >
        <TrashIcon className="w-4 h-4" />
      </button>

      <div className="flex-1">
        <div className="flex items-start justify-between mb-2">
          <span className="text-[10px] font-bold bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300 px-2 py-1 rounded-md uppercase tracking-wider border border-gray-200 dark:border-slate-600">
            Draft
          </span>
        </div>
        <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-1">
          {exam.config.subject || "Tanpa Judul"}
        </h3>
        <p className="text-sm text-gray-400 dark:text-slate-500 font-code slashed-zero font-medium mb-3">
          {exam.code}
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          <MetaBadge
            text={exam.config.classLevel}
            colorClass="bg-blue-50 text-blue-700 border-blue-100"
          />
          <MetaBadge
            text={exam.config.examType}
            colorClass="bg-purple-50 text-purple-700 border-purple-100"
          />
          {exam.config.targetClasses &&
            exam.config.targetClasses.length > 0 && (
              <MetaBadge
                text={exam.config.targetClasses.join(", ")}
                colorClass="bg-orange-50 text-orange-700 border-orange-100"
              />
            )}
        </div>

        <div className="h-px bg-gray-50 dark:bg-slate-700 w-full mb-4"></div>
        <div className="text-xs text-gray-500 dark:text-slate-400 space-y-2 mb-6">
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="w-4 h-4 text-gray-400 dark:text-slate-500" />
            <span>
              {new Date(exam.config.date).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ListBulletIcon className="w-4 h-4 text-gray-400 dark:text-slate-500" />
            <span>
              {exam.questions.filter((q) => q.questionType !== "INFO").length}{" "}
              Soal Tersimpan
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onPreview}
          className="flex-1 py-2.5 px-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-slate-600 hover:text-primary dark:hover:text-white transition-colors flex items-center justify-center gap-2 shadow-sm"
          title="Preview Soal"
        >
          <EyeIcon className="w-4 h-4" /> Preview
        </button>
        <button
          onClick={onContinue}
          className="flex-[2] py-2.5 px-4 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-white font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-slate-600 hover:border-gray-300 transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <PencilIcon className="w-4 h-4" /> Edit
        </button>
      </div>
    </div>
  );
};
