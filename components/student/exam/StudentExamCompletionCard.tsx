import React from "react";
import { CheckCircleIcon, ExclamationTriangleIcon } from "../../Icons";

interface StudentExamCompletionCardProps {
  isOlympiadMode?: boolean;
  unansweredItems: { id: string; num: number }[];
  answeredCount: number;
  totalQuestions: number;
  progress: number;
  isSubmitting: boolean;
  scrollToQuestion: (qId: string) => void;
  onSubmit: () => void;
}

export const StudentExamCompletionCard: React.FC<StudentExamCompletionCardProps> = React.memo(({
  isOlympiadMode,
  unansweredItems,
  answeredCount,
  totalQuestions,
  progress,
  isSubmitting,
  scrollToQuestion,
  onSubmit,
}) => {
  return (
    <div
      data-math-ignore="true"
      className="mt-6 sm:mt-10 mb-24 sm:mb-28 p-4 sm:p-10 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl"
    >
      <div className="max-w-2xl mx-auto flex flex-col items-center text-center">
        {answeredCount === totalQuestions ? (
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center mb-4 shadow-xs">
            <CheckCircleIcon className="w-8 h-8" />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center mb-4 shadow-xs">
            <ExclamationTriangleIcon className="w-8 h-8" />
          </div>
        )}

        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
          {answeredCount === totalQuestions
            ? "Semua Soal Telah Dijawab!"
            : "Lembar Akhir Pengerjaan Ujian"}
        </h3>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-lg mb-5">
          {answeredCount === totalQuestions
            ? "Hebat! Anda telah menjawab seluruh soal ujian. Silakan periksa kembali jawaban Anda jika masih memiliki sisa waktu, atau kumpulkan ujian sekarang."
            : isOlympiadMode
              ? `Anda menjawab ${answeredCount} dari ${totalQuestions} soal (${Math.round(progress)}%). Terdapat ${totalQuestions - answeredCount} soal yang dikosongkan. Dalam Mode Olimpiade, membiarkan soal kosong tidak akan mengurangi poin Anda.`
              : `Anda telah menjawab ${answeredCount} dari total ${totalQuestions} soal (${Math.round(progress)}%). Masih ada ${totalQuestions - answeredCount} soal yang belum dijawab.`}
        </p>

        {unansweredItems.length > 0 && (
          <div className="w-full mb-6 p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 text-left">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block mb-2.5">
              {isOlympiadMode
                ? "Nomor soal yang dikosongkan (tanpa penalti, ketuk jika ingin mengisi):"
                : "Nomor soal yang belum dijawab (ketuk untuk memeriksa):"}
            </span>
            <div className="flex flex-wrap gap-2">
              {unansweredItems.map(({ id, num }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => scrollToQuestion(id)}
                  className="min-h-[40px] px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors cursor-pointer shadow-xs active:scale-95"
                  title={`Loncat ke soal nomor ${num}`}
                >
                  Soal #{num}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="w-full sm:w-auto min-w-[260px] min-h-[48px] px-8 py-4 bg-slate-900 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-2xl font-black text-sm sm:text-base transition-colors flex items-center justify-center gap-3 shadow-xl hover:shadow-indigo-500/25 active:scale-[0.98] disabled:opacity-70 cursor-pointer"
        >
          <CheckCircleIcon className="w-5 h-5 shrink-0" />
          <span>{isSubmitting ? "Mengirim Jawaban..." : "Selesai & Kumpulkan Jawaban"}</span>
        </button>
      </div>
    </div>
  );
});
