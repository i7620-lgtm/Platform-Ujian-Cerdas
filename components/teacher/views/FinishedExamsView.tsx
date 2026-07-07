interface FinishedExamsProps {
  exams: Exam[];
  onDeleteExam: (exam: Exam) => void;
  onArchiveExam: (exam: Exam) => void;
  onDuplicateExam: (exam: Exam) => void;
  onViewResults: (exam: Exam) => void;
}
import React from "react";
import type { Exam } from "../../../types";
import {
  ChartBarIcon,
  TrashIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  DocumentDuplicateIcon,
} from "../../Icons";
import { MetaBadge } from "./SharedComponents";
import { FinishedExamCard } from "./FinishedExamCard";
export const FinishedExamsView: React.FC<FinishedExamsProps> = ({
  exams,
  onDeleteExam,
  onArchiveExam,
  onDuplicateExam,
  onViewResults,
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
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
