import React, { useState } from "react";
import type { Question } from "../../../types";

interface QuestionnaireViewProps {
  question: Question;
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, answer: string) => void;
  optimizeHtml?: (html: string) => string;
}

export const QuestionnaireView: React.FC<QuestionnaireViewProps> = ({
  question,
  answers,
  onAnswerChange,
}) => {
  const currentAnswer = answers[question.id] || "";
  const format = question.questionnaireFormat || "scale";
  const scaleMin = question.scaleMin ?? 1;
  const scaleMax = question.scaleMax ?? 5;
  const scaleLabels = question.scaleLabels || ["Sangat Tidak Setuju", "Sangat Setuju"];
  const options =
    question.options && question.options.length > 0
      ? question.options
      : ["Sangat Tidak Setuju", "Tidak Setuju", "Netral", "Setuju", "Sangat Setuju"];

  const [hoveredStar, setHoveredStar] = useState<number | null>(null);

  const scaleValues = Array.from(
    { length: scaleMax - scaleMin + 1 },
    (_, i) => scaleMin + i
  );

  return (
    <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 space-y-4">
      {/* Badge Penjelasan Non-Skor untuk Siswa */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-indigo-100/70 dark:border-indigo-900/40 text-xs">
        <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-bold">
          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
            ✓
          </span>
          <span>Angket / Refleksi (Tidak Ada Jawaban Salah)</span>
        </div>
        <span className="text-[11px] font-semibold text-indigo-700/80 dark:text-indigo-300/80 hidden sm:inline">
          Pilih sesuai pendapat atau perasaan Anda
        </span>
      </div>

      {/* 1. Format Skala Likert */}
      {format === "scale" && (
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-600 dark:text-slate-400 px-1">
            <span className="text-left max-w-[45%]">{scaleLabels[0] || `Nilai ${scaleMin}`}</span>
            <span className="text-right max-w-[45%]">{scaleLabels[1] || `Nilai ${scaleMax}`}</span>
          </div>

          <div className="flex gap-2 sm:gap-3 justify-between items-center">
            {scaleValues.map((val) => {
              const isSelected = currentAnswer === String(val);
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => onAnswerChange(question.id, String(val))}
                  className={`flex-1 py-3 sm:py-3.5 rounded-xl font-bold text-sm sm:text-base transition-all transform active:scale-95 cursor-pointer shadow-xs flex flex-col items-center justify-center ${
                    isSelected
                      ? "bg-indigo-600 text-white ring-2 ring-indigo-400 dark:ring-indigo-500 shadow-md shadow-indigo-600/30 scale-105"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>{val}</span>
                </button>
              );
            })}
          </div>

          {currentAnswer && (
            <p className="text-center text-xs font-bold text-indigo-600 dark:text-indigo-400 pt-1">
              Pilihan Anda: Nilai {currentAnswer}
            </p>
          )}
        </div>
      )}

      {/* 2. Format Rating Bintang */}
      {format === "rating" && (
        <div className="py-2 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            {[1, 2, 3, 4, 5].map((star) => {
              const currentVal = parseInt(currentAnswer, 10) || 0;
              const isFilled = hoveredStar !== null ? star <= hoveredStar : star <= currentVal;

              return (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(null)}
                  onClick={() => onAnswerChange(question.id, String(star))}
                  className="p-2 sm:p-2.5 transition-transform hover:scale-115 active:scale-95 cursor-pointer focus:outline-hidden"
                  title={`Beri rating ${star} bintang`}
                >
                  <svg
                    className={`w-9 h-9 sm:w-11 sm:h-11 transition-colors ${
                      isFilled
                        ? "text-amber-400 fill-amber-400 drop-shadow-sm"
                        : "text-slate-300 dark:text-slate-600 fill-transparent stroke-current"
                    }`}
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
              );
            })}
          </div>

          <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
            {currentAnswer ? (
              <span className="text-amber-600 dark:text-amber-400">
                ★ Anda memilih {currentAnswer} dari 5 Bintang
              </span>
            ) : (
              <span>Ketuk bintang untuk memberikan penilaian Anda</span>
            )}
          </p>
        </div>
      )}

      {/* 3. Format Pilihan Opini (Radio) */}
      {format === "choice" && (
        <div className="space-y-2.5">
          {options.map((opt, i) => {
            const isSelected = currentAnswer === opt;
            return (
              <label
                key={i}
                onClick={() => onAnswerChange(question.id, opt)}
                className={`flex items-center gap-3.5 p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 ring-1 ring-indigo-500 text-indigo-950 dark:text-indigo-100 shadow-xs"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-600"
                      : "border-slate-300 dark:border-slate-600"
                  }`}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                </div>
                <div
                  className="flex-1 text-xs sm:text-sm font-medium leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: opt }}
                ></div>
              </label>
            );
          })}
        </div>
      )}

      {/* 4. Format Respon Teks Bebas */}
      {format === "text" && (
        <div>
          <textarea
            value={currentAnswer}
            onChange={(e) => onAnswerChange(question.id, e.target.value)}
            rows={4}
            className="w-full p-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-indigo-500 dark:focus:border-indigo-500 outline-none text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all resize-y leading-relaxed"
            placeholder="Tuliskan refleksi, opini, kritik, atau saran Anda secara leluasa di sini..."
          />
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 text-right">
            {currentAnswer.trim().length} karakter
          </p>
        </div>
      )}
    </div>
  );
};
