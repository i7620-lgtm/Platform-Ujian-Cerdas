import React from "react";
import { Exam } from "../../../types";
import {
  TrashIcon,
  CalendarDaysIcon,
  ListBulletIcon,
  EyeIcon,
  PencilIcon,
  FilePdfIcon,
  TableCellsIcon,
  CheckCircleIcon,
} from "../../Icons";
import { MetaBadge } from "./SharedComponents";

interface DraftExamCardProps {
  exam: Exam;
  onDelete: () => void;
  onPreview: () => void;
  onContinue: () => void;
  onPrintSoal: () => void;
  onPrintKisiKisi: () => void;
  onPrintKunci: () => void;
}

export const DraftExamCard: React.FC<DraftExamCardProps> = ({
  exam,
  onDelete,
  onPreview,
  onContinue,
  onPrintSoal,
  onPrintKisiKisi,
  onPrintKunci,
}) => {
  const scorableCount =
    exam.questions.length > 0
      ? exam.questions.filter((q) => q.questionType !== "INFO").length
      : exam.config?.scorableQuestionCount ?? exam.config?.totalQuestionCount;
  const formattedDate = new Date(exam.config.date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col gap-4 md:bg-transparent md:dark:bg-transparent md:px-5 md:py-4 md:rounded-none md:border-0 md:shadow-none md:hover:bg-slate-50/70 md:dark:hover:bg-slate-700/30 lg:flex-row lg:items-center lg:justify-between lg:gap-4 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center flex-wrap gap-2 mb-1.5">
          <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md uppercase tracking-wider border border-slate-200 dark:border-slate-600 shrink-0">
            Draft
          </span>
          <h3 className="font-bold text-base text-slate-800 dark:text-white truncate max-w-full">
            {exam.config.subject || "Tanpa Judul"}
          </h3>
          <span className="text-xs text-slate-400 dark:text-slate-400 font-code slashed-zero font-medium bg-slate-50 dark:bg-slate-700/80 px-1.5 py-0.5 rounded shrink-0">
            {exam.code}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
          <MetaBadge
            text={exam.config.classLevel}
            colorClass="bg-blue-50 text-blue-700 border-blue-100"
          />
          <MetaBadge
            text={exam.config.examType}
            colorClass="bg-purple-50 text-purple-700 border-purple-100"
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
          <div className="w-full md:w-auto flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 md:mt-0 md:ml-1">
            <span className="inline-flex items-center gap-1.5 tabular-nums whitespace-nowrap">
              <CalendarDaysIcon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
              <span>{formattedDate}</span>
            </span>
            {typeof scorableCount === "number" && (
              <>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="inline-flex items-center gap-1.5 tabular-nums whitespace-nowrap">
                  <ListBulletIcon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span>{scorableCount} Soal</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-2 md:flex md:items-center md:gap-1.5 md:flex-nowrap shrink-0">
        <button
          type="button"
          onClick={onPrintSoal}
          className="col-span-4 py-2 px-2 md:py-1.5 md:px-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl md:rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
          title="Pratinjau & Cetak Naskah Soal PDF"
        >
          <FilePdfIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span>Soal PDF</span>
        </button>
        <button
          type="button"
          onClick={onPrintKisiKisi}
          className="col-span-4 py-2 px-2 md:py-1.5 md:px-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl md:rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
          title="Pratinjau & Cetak Kisi-Kisi Soal"
        >
          <TableCellsIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>Kisi-Kisi</span>
        </button>
        <button
          type="button"
          onClick={onPrintKunci}
          className="col-span-4 py-2 px-2 md:py-1.5 md:px-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl md:rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
          title="Pratinjau & Cetak Kunci Jawaban & Pembahasan"
        >
          <CheckCircleIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>Kunci</span>
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              if (!exam.questionsDeferred && exam.questions.length > 0) {
                localStorage.setItem(
                  `ujiancerdas_preview_exam_${exam.code}`,
                  JSON.stringify(exam),
                );
              }
            } catch {
              // ignore
            }
            onPreview();
          }}
          className="col-span-5 py-2.5 px-3 md:py-1.5 md:px-2.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 text-xs font-bold rounded-xl md:rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 hover:text-primary dark:hover:text-white transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
          title="Preview Pengerjaan Siswa"
        >
          <EyeIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Preview</span>
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="col-span-7 py-2.5 px-3 md:py-1.5 md:px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl md:rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap shrink-0"
          title="Lanjutkan Edit Draf"
        >
          <PencilIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Edit</span>
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="col-span-12 py-2.5 px-3 md:py-1.5 md:px-2.5 bg-rose-50/70 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60 text-xs font-bold rounded-xl md:rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          title="Hapus Draf"
        >
          <TrashIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Hapus</span>
        </button>
      </div>
    </div>
  );
};
