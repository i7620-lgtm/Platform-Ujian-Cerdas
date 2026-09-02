import React, { useState, useEffect } from "react";
import type { Question } from "../../../types";
import { ChevronDownIcon } from "../../Icons";

interface MatchingViewProps {
  question: Question;
  answers: Record<string, string>;
  onAnswerChange: (qId: string, value: string) => void;
  optimizeHtml: (html: string) => string;
  rightOptions: string[];
}

export const MatchingView: React.FC<MatchingViewProps> = ({
  question,
  answers,
  onAnswerChange,
  optimizeHtml,
  rightOptions = [],
}) => {
  const { id: qId, matchingPairs } = question;
  const [openDropdownIdx, setOpenDropdownIdx] = useState<number | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        openDropdownIdx !== null &&
        !(e.target as Element).closest(".custom-dropdown-container")
      ) {
        setOpenDropdownIdx(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdownIdx]);

  if (!matchingPairs) return null;

  return (
    <div className="space-y-3">
      {matchingPairs.map((pair, i) => {
        const currentAnsObj = answers[qId] ? JSON.parse(answers[qId]) : {};
        const selectedValue = currentAnsObj[i] || "";
        const isOpen = openDropdownIdx === i;

        return (
          <div
            key={i}
            className="flex flex-col sm:flex-row sm:items-stretch gap-3 sm:gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
          >
            <div className="flex-1 min-w-0 font-bold text-slate-700 dark:text-slate-300 text-sm flex items-center option-content">
              <div
                className="option-content w-full"
                dangerouslySetInnerHTML={{ __html: optimizeHtml(pair.left) }}
              />
            </div>

            {/* Mobile Connector */}
            <div className="sm:hidden flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">
              <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1" />
              <span>Pasangkan Dengan</span>
              <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1" />
            </div>

            <div className="hidden sm:flex text-slate-300 dark:text-slate-600 items-center justify-center">
              →
            </div>

            <div className="flex-1 relative custom-dropdown-container">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenDropdownIdx(isOpen ? null : i);
                }}
                className={`w-full text-left bg-white dark:bg-slate-900 border ${
                  isOpen
                    ? "border-indigo-500 ring-1 ring-indigo-500"
                    : "border-slate-200 dark:border-slate-700"
                } text-slate-700 dark:text-slate-200 py-3 px-4 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center justify-between min-h-[46px]`}
              >
                <div className="truncate flex-1">
                  {selectedValue ? (
                    <div
                      className="line-clamp-1 option-content"
                      dangerouslySetInnerHTML={{
                        __html: optimizeHtml(selectedValue),
                      }}
                    />
                  ) : (
                    <span className="text-slate-400 dark:text-slate-600 font-medium font-sans">
                      Pilih Jawaban...
                    </span>
                  )}
                </div>
                <ChevronDownIcon
                  className={`w-4 h-4 ml-2 transition-transform text-slate-400 ${isOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar animate-fade-in">
                  {rightOptions.map((opt, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        const newAnsObj = { ...currentAnsObj, [i]: opt };
                        const sortedAnsObj: Record<number, string> = {};
                        Object.keys(newAnsObj)
                          .map(Number)
                          .sort((a, b) => a - b)
                          .forEach((k) => {
                            sortedAnsObj[k] = newAnsObj[k];
                          });
                        onAnswerChange(qId, JSON.stringify(sortedAnsObj));
                        setOpenDropdownIdx(null);
                      }}
                      className={`p-3 text-sm cursor-pointer border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors ${
                        selectedValue === opt
                          ? "bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-400"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div
                        className="option-content"
                        dangerouslySetInnerHTML={{ __html: optimizeHtml(opt) }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
