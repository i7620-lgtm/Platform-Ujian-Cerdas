import React from "react";
import { Exam } from "../../../types";
import {
  ClockIcon,
  PencilIcon,
  EnvelopeIcon,
  UserIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  TrashIcon,
} from "../../Icons";
import { MetaBadge } from "./SharedComponents";

interface UpcomingExamCardProps {
  exam: Exam;
  onInvite: () => void;
  onCollab: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export const UpcomingExamCard: React.FC<UpcomingExamCardProps> = ({
  exam,
  onInvite,
  onCollab,
  onEdit,
  onDuplicate,
  onDelete,
}) => {
  const startDate = exam.config.startDate || exam.config.date || "";
  const startObj = startDate.includes("T")
    ? new Date(startDate)
    : new Date(`${startDate}T${exam.config.startTime || "00:00"}`);

  const formattedTimeOrDue = (() => {
    if (exam.config.examMode === "PR") {
      const endDate = exam.config.endDate || exam.config.date || "";
      const endTime = exam.config.endTime || "23:59";
      let dateStr = endDate;
      if (endDate.includes("T")) {
        const dEnd = new Date(endDate);
        if (!isNaN(dEnd.getTime())) {
          dateStr = dEnd.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
          });
        }
      }
      return `Tenggat: ${dateStr} ${endTime}`;
    }

    return (
      startObj.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }) +
      " " +
      (startObj
        .toLocaleTimeString("id-ID", {
          timeZoneName: "short",
        })
        .split(" ")
        .pop() || "")
    );
  })();

  const durationText =
    exam.config.examMode === "PR"
      ? "Mode PR"
      : exam.config.timeLimit > 0
        ? `${exam.config.timeLimit} Menit`
        : "Tanpa Batas";

  return (
    <div
      id={`upcoming-exam-card-${exam.code}`}
      className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col gap-4 md:bg-transparent md:dark:bg-transparent md:px-5 md:py-4 md:rounded-none md:border-0 md:shadow-none md:hover:bg-slate-50/70 md:dark:hover:bg-slate-700/30 lg:flex-row lg:items-center lg:justify-between lg:gap-4 transition-colors"
    >
      <div className="flex items-start gap-3.5 md:gap-4 min-w-0 flex-1">
        <div className="bg-blue-50 dark:bg-blue-900/20 w-12 h-12 rounded-xl flex flex-col items-center justify-center text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800 shrink-0 tabular-nums">
          <span className="text-[10px] font-bold uppercase leading-tight">
            {startObj.toLocaleDateString("id-ID", { month: "short" })}
          </span>
          <span className="text-lg font-black leading-none mt-0.5">
            {startObj.getDate()}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center flex-wrap gap-2 mb-1">
            <h3 className="font-bold text-base sm:text-lg md:text-base text-neutral dark:text-white truncate max-w-full">
              {exam.config.subject || "Tanpa Judul"}
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
            {exam.config.targetClasses && exam.config.targetClasses.length > 0 && (
              <MetaBadge
                text={exam.config.targetClasses.join(", ")}
                colorClass="bg-orange-50 text-orange-700 border-orange-100"
              />
            )}
            <div className="w-full md:w-auto flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 md:mt-0 md:ml-1 tabular-nums">
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                <ClockIcon className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                <span>{formattedTimeOrDue}</span>
              </span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="whitespace-nowrap">{durationText}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-2 md:flex md:items-center md:gap-1.5 md:flex-nowrap shrink-0">
        <button
          type="button"
          id={`btn-invite-${exam.code}`}
          onClick={onInvite}
          className="col-span-3 py-2.5 px-3 md:py-1.5 md:px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl md:rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer whitespace-nowrap shrink-0"
          title="Undangan Peserta"
        >
          <EnvelopeIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Undangan</span>
        </button>
        <button
          type="button"
          id={`btn-preview-${exam.code}`}
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
            window.open(`/?preview=${exam.code}`, "_blank");
          }}
          className="col-span-3 py-2.5 px-3 md:py-1.5 md:px-2.5 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800 rounded-xl md:rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
          title="Preview Soal"
        >
          <EyeIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Preview</span>
        </button>
        <button
          type="button"
          id={`btn-collab-${exam.code}`}
          onClick={onCollab}
          className="col-span-2 py-2 px-2 md:py-1.5 md:px-2.5 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 rounded-xl md:rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
          title="Kelola Kolaborator"
        >
          <UserIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Tim</span>
        </button>
        <button
          type="button"
          id={`btn-edit-${exam.code}`}
          onClick={onEdit}
          className="col-span-2 py-2 px-2 md:py-1.5 md:px-2.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-white rounded-xl md:rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
          title="Edit Ujian"
        >
          <PencilIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Edit</span>
        </button>
        <button
          type="button"
          id={`btn-duplicate-${exam.code}`}
          onClick={onDuplicate}
          className="col-span-2 py-2 px-2 md:py-1.5 md:px-2.5 bg-slate-50 dark:bg-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl md:rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
          title="Duplikasi Soal"
        >
          <DocumentDuplicateIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Salin</span>
        </button>
        <button
          type="button"
          id={`btn-delete-${exam.code}`}
          onClick={onDelete}
          className="col-span-6 py-2.5 px-3 md:py-1.5 md:px-2.5 bg-rose-50/70 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60 rounded-xl md:rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          title="Hapus Ujian"
        >
          <TrashIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Hapus</span>
        </button>
      </div>
    </div>
  );
};
