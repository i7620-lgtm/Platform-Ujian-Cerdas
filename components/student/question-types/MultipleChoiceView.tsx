import React from "react";
import type { Question } from "../../../types";
import { parseList } from "../../teacher/examUtils";

interface MultipleChoiceViewProps {
  question: Question;
  answers: Record<string, string>;
  onAnswerChange: (qId: string, value: string) => void;
  optimizeHtml: (html: string) => string;
}

export const MultipleChoiceView: React.FC<MultipleChoiceViewProps> = ({
  question,
  answers,
  onAnswerChange,
  optimizeHtml,
}) => {
  const { id: qId, options, questionType } = question;

  if (!options) return null;

  if (questionType === "MULTIPLE_CHOICE") {
    return (
      <div className="grid grid-cols-1 gap-3">
        {options.map((opt, i) => {
          const isSelected = answers[qId] === opt;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onAnswerChange(qId, opt)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-4 ${
                isSelected
                  ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/20"
                  : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <span
                className={`flex items-center justify-center w-6 h-6 rounded-full border text-xs font-bold shrink-0 mt-0.5 ${
                  isSelected
                    ? "bg-indigo-600 dark:bg-indigo-500 border-indigo-600 dark:border-indigo-500 text-white"
                    : "border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800"
                }`}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <div
                className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium option-content flex-1 min-w-0"
                dangerouslySetInnerHTML={{ __html: optimizeHtml(opt) }}
              />
            </button>
          );
        })}
      </div>
    );
  }

  if (questionType === "COMPLEX_MULTIPLE_CHOICE") {
    return (
      <div className="grid grid-cols-1 gap-3">
        {options.map((opt, i) => {
          const currentAns = parseList(answers[qId]);
          const isSelected = currentAns.includes(opt);
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                const newAns = isSelected
                  ? currentAns.filter((o) => o !== opt)
                  : [...currentAns, opt];
                newAns.sort(
                  (a, b) =>
                    (options || []).indexOf(a) - (options || []).indexOf(b),
                );
                onAnswerChange(qId, JSON.stringify(newAns));
              }}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-4 ${
                isSelected
                  ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/20"
                  : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center border text-xs font-black mt-0.5 shrink-0 transition-colors ${
                  isSelected
                    ? "bg-indigo-600 dark:bg-indigo-500 border-indigo-600 dark:border-indigo-500 text-white shadow-sm"
                    : "border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800"
                }`}
              >
                {String.fromCharCode(65 + i)}
              </div>
              <div
                className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium option-content flex-1 min-w-0"
                dangerouslySetInnerHTML={{ __html: optimizeHtml(opt) }}
              />
            </button>
          );
        })}
      </div>
    );
  }

  return null;
};
