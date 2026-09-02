import React from "react";
import type { Question } from "../../../types";
import { CheckCircleIcon } from "../../Icons";

interface TrueFalseViewProps {
  question: Question;
  answers: Record<string, string>;
  onAnswerChange: (qId: string, value: string) => void;
  optimizeHtml: (html: string) => string;
}

export const TrueFalseView: React.FC<TrueFalseViewProps> = ({
  question,
  answers,
  onAnswerChange,
  optimizeHtml,
}) => {
  const { id: qId, trueFalseRows } = question;

  if (!trueFalseRows) return null;

  return (
    <div className="space-y-3">
      {trueFalseRows.map((row, i) => {
        const currentAnsObj = answers[qId] ? JSON.parse(answers[qId]) : {};
        const isTrue = currentAnsObj[i] === true;
        const isFalse = currentAnsObj[i] === false;

        return (
          <div
            key={i}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
          >
            <div className="mb-4 font-medium text-slate-700 dark:text-slate-300 option-content min-w-0">
              <div
                className="option-content"
                dangerouslySetInnerHTML={{ __html: optimizeHtml(row.text) }}
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  const newAnsObj = { ...currentAnsObj, [i]: true };
                  const sortedAnsObj: Record<number, boolean> = {};
                  Object.keys(newAnsObj)
                    .map(Number)
                    .sort((a, b) => a - b)
                    .forEach((k) => {
                      sortedAnsObj[k] = newAnsObj[k];
                    });
                  onAnswerChange(qId, JSON.stringify(sortedAnsObj));
                }}
                className={`flex-1 py-2.5 px-4 rounded-lg border font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  isTrue
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                {isTrue && <CheckCircleIcon className="w-4 h-4" />}
                Benar
              </button>
              <button
                type="button"
                onClick={() => {
                  const newAnsObj = { ...currentAnsObj, [i]: false };
                  const sortedAnsObj: Record<number, boolean> = {};
                  Object.keys(newAnsObj)
                    .map(Number)
                    .sort((a, b) => a - b)
                    .forEach((k) => {
                      sortedAnsObj[k] = newAnsObj[k];
                    });
                  onAnswerChange(qId, JSON.stringify(sortedAnsObj));
                }}
                className={`flex-1 py-2.5 px-4 rounded-lg border font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  isFalse
                    ? "bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-200 dark:shadow-none"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                {isFalse && <CheckCircleIcon className="w-4 h-4" />}
                Salah
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
