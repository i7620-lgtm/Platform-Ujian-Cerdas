import React, { useState } from "react";
import type { Exam, Result, ChartData } from "../../../types";
import { isAnswerMatch, parseList, normalize, sanitizeHtml } from "../../teacher/examUtils";
import { ChartRenderer } from "../../ChartRenderer";
import {
  LightBulbIcon,
  AcademicCapIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "../../Icons";

const renderQuestionTextWithChart = (
  html: string,
  chartData: ChartData | undefined,
) => {
  let sanitized = sanitizeHtml(html);
  if (/\\?\[(CHART|DIAGRAM|GRAFIK).*?\\?\]/i.test(sanitized)) {
    sanitized = sanitized.replace(
      /(?:<p>)?\s*\\?\[(CHART|DIAGRAM|GRAFIK).*?\\?\]\s*(?:<\/p>)?/gi,
      '<span data-chart="true"></span>',
    );
  }
  if (!chartData) {
    return (
      <div
        className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-4 leading-relaxed prose prose-sm max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      ></div>
    );
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitized, "text/html");
  const chartNode = doc.querySelector('[data-chart="true"]');

  if (!chartNode) {
    return (
      <>
        <div
          className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-4 leading-relaxed prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: sanitized }}
        ></div>
        <div className="mb-4 w-full max-w-3xl mx-auto">
          <ChartRenderer data={chartData} />
        </div>
      </>
    );
  }

  const marker = "___CHART_MARKER___";
  chartNode.insertAdjacentText("beforebegin", marker);
  chartNode.remove();

  const newHtml = doc.body.innerHTML;
  const parts = newHtml.split(marker);

  return (
    <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-4 leading-relaxed prose prose-sm max-w-none dark:prose-invert">
      {parts.map((part, index) => (
        <React.Fragment key={index}>
          <div dangerouslySetInnerHTML={{ __html: part }}></div>
          {index < parts.length - 1 && (
            <div className="my-4 w-full max-w-3xl mx-auto">
              <ChartRenderer data={chartData} />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

interface ReviewSectionProps {
  exam: Exam;
  result: Result;
}

export const ReviewSection: React.FC<ReviewSectionProps> = ({
  exam,
  result,
}) => {
  const [openHints, setOpenHints] = useState<Record<string, boolean>>({});
  const [openSteps, setOpenSteps] = useState<Record<string, boolean>>({});

  const toggleHint = (qId: string) => {
    setOpenHints((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  const toggleSteps = (qId: string) => {
    setOpenSteps((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  return (
    <div className="mt-8 space-y-4 text-left border-t border-slate-50 dark:border-slate-800 pt-8 animate-fade-in">
      {exam.questions
        .filter((q) => q.questionType !== "INFO")
        .map((q, idx) => {
          const studentAns = result.answers[q.id] || "-";
          const correctAns = q.correctAnswer || "-";

          let isCorrect = false;

          let displayStudentAns = studentAns;
          let displayCorrectAns = correctAns;

          if (
            q.questionType === "MULTIPLE_CHOICE" ||
            q.questionType === "FILL_IN_THE_BLANK"
          ) {
            isCorrect = isAnswerMatch(correctAns, studentAns, q.questionType);
          } else if (q.questionType === "COMPLEX_MULTIPLE_CHOICE") {
            const sSet = new Set(
              parseList(studentAns).map((a) => normalize(a, q.questionType)),
            );
            const cSet = new Set(
              parseList(correctAns).map((a) => normalize(a, q.questionType)),
            );
            isCorrect =
              sSet.size === cSet.size && [...sSet].every((x) => cSet.has(x));
            try {
              const parsedStudent = parseList(studentAns);
              parsedStudent.sort(
                (a, b) =>
                  (q.options || []).indexOf(a) - (q.options || []).indexOf(b),
              );
              if (parsedStudent.length > 0)
                displayStudentAns = parsedStudent
                  .map((p) => `• ${p}`)
                  .join("<br/>");
              const parsedCorrect = parseList(correctAns);
              parsedCorrect.sort(
                (a, b) =>
                  (q.options || []).indexOf(a) - (q.options || []).indexOf(b),
              );
              if (parsedCorrect.length > 0)
                displayCorrectAns = parsedCorrect
                  .map((p) => `• ${p}`)
                  .join("<br/>");
            } catch {
              /* ignore */
            }
          } else if (
            q.questionType === "TRUE_FALSE" ||
            q.questionType === "MATCHING"
          ) {
            isCorrect = false;
            try {
              if (q.questionType === "TRUE_FALSE") {
                const ansObj = JSON.parse(studentAns);
                const trueLabel = (q.categoryLabels && q.categoryLabels[0]) || "Benar";
                const falseLabel = (q.categoryLabels && q.categoryLabels[1]) || "Salah";
                isCorrect =
                  q.trueFalseRows?.every(
                    (row, i) => ansObj[i] === row.answer,
                  ) ?? false;
                displayStudentAns =
                  q.trueFalseRows
                    ?.map(
                      (r, i) =>
                        `• ${r.text.replace(/<[^>]*>/g, "")}: <strong>${ansObj[i] ? trueLabel : falseLabel}</strong>`,
                    )
                    .join("<br/>") || studentAns;
                displayCorrectAns =
                  q.trueFalseRows
                    ?.map(
                      (r) =>
                        `• ${r.text.replace(/<[^>]*>/g, "")}: <strong>${r.answer ? trueLabel : falseLabel}</strong>`,
                    )
                    .join("<br/>") || correctAns;
              } else {
                const ansObj = JSON.parse(studentAns);
                isCorrect =
                  q.matchingPairs?.every((pair, i) =>
                    isAnswerMatch(pair.right, ansObj[i], q.questionType),
                  ) ?? false;
                displayStudentAns =
                  q.matchingPairs
                    ?.map(
                      (p, i) =>
                        `• ${p.left} → <strong>${ansObj[i] || "-"}</strong>`,
                    )
                    .join("<br/>") || studentAns;
                displayCorrectAns =
                  q.matchingPairs
                    ?.map((p) => `• ${p.left} → <strong>${p.right}</strong>`)
                    .join("<br/>") || correctAns;
              }
            } catch {
              if (q.questionType === "TRUE_FALSE") {
                const trueLabel = (q.categoryLabels && q.categoryLabels[0]) || "Benar";
                const falseLabel = (q.categoryLabels && q.categoryLabels[1]) || "Salah";
                displayCorrectAns =
                  q.trueFalseRows
                    ?.map(
                      (r) =>
                        `• ${r.text.replace(/<[^>]*>/g, "")}: <strong>${r.answer ? trueLabel : falseLabel}</strong>`,
                    )
                    .join("<br/>") || correctAns;
              } else if (q.questionType === "MATCHING") {
                displayCorrectAns =
                  q.matchingPairs
                    ?.map((p) => `• ${p.left} → <strong>${p.right}</strong>`)
                    .join("<br/>") || correctAns;
              }
            }
          }

          return (
            <div
              key={q.id}
              className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors"
            >
              <div className="flex justify-between mb-3">
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">
                  Soal {idx + 1}
                </span>
                <span
                  className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide ${isCorrect ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"}`}
                >
                  {isCorrect ? "Benar" : "Salah"}
                </span>
              </div>
              {renderQuestionTextWithChart(q.questionText, q.chartData)}

              <div className="text-xs space-y-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-slate-400 dark:text-slate-500 font-bold shrink-0">
                    Jawaban Kamu:
                  </span>
                  <div
                    className={`text-right font-black option-content flex-1 min-w-0 [&_p]:inline ${isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(displayStudentAns),
                    }}
                  ></div>
                </div>
                {exam.config?.showCorrectAnswer && (
                  <div className="flex justify-between items-start border-t border-slate-50 dark:border-slate-800 pt-2 mt-2 gap-2">
                    <span className="text-slate-400 dark:text-slate-500 font-bold shrink-0">
                      Kunci Jawaban:
                    </span>
                    <div
                      className="text-right font-black text-slate-700 dark:text-slate-300 option-content flex-1 min-w-0 [&_p]:inline"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(displayCorrectAns),
                      }}
                    ></div>
                  </div>
                )}
              </div>

              {/* Petunjuk Pengerjaan & Langkah Pengerjaan (Hanya jika diizinkan oleh guru) */}
              {((exam.config?.showHints && q.hint && q.hint.trim() !== "") ||
                (exam.config?.showSolutionSteps && q.solutionSteps && q.solutionSteps.trim() !== "")) && (
                <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-col gap-2">
                  {/* Accordion Petunjuk Pengerjaan */}
                  {exam.config?.showHints && q.hint && q.hint.trim() !== "" && (
                    <div className="rounded-xl border border-amber-200/80 dark:border-amber-800/60 overflow-hidden bg-amber-50/40 dark:bg-amber-950/20">
                      <button
                        type="button"
                        onClick={() => toggleHint(q.id)}
                        className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <LightBulbIcon className="w-4 h-4 text-amber-500 shrink-0" />
                          <span className="text-xs font-bold text-amber-800 dark:text-amber-300 truncate">
                            Petunjuk Pengerjaan
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 text-amber-600 dark:text-amber-400 text-[11px] font-semibold">
                          <span>{openHints[q.id] ? "Tutup" : "Buka"}</span>
                          {openHints[q.id] ? (
                            <ChevronUpIcon className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDownIcon className="w-3.5 h-3.5" />
                          )}
                        </div>
                      </button>

                      {openHints[q.id] && (
                        <div className="px-3.5 pb-3.5 pt-1 text-xs text-slate-700 dark:text-slate-200 border-t border-amber-100 dark:border-amber-900/40 leading-relaxed">
                          <div
                            className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-200 [&_p]:my-1"
                            dangerouslySetInnerHTML={{
                              __html: sanitizeHtml(q.hint),
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Accordion Langkah Pengerjaan */}
                  {exam.config?.showSolutionSteps && q.solutionSteps && q.solutionSteps.trim() !== "" && (
                    <div className="rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 overflow-hidden bg-indigo-50/40 dark:bg-indigo-950/20">
                      <button
                        type="button"
                        onClick={() => toggleSteps(q.id)}
                        className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <AcademicCapIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                          <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 truncate">
                            Pembahasan Jawaban & Langkah Penyelesaian
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 text-indigo-600 dark:text-indigo-400 text-[11px] font-semibold">
                          <span>{openSteps[q.id] ? "Tutup" : "Buka"}</span>
                          {openSteps[q.id] ? (
                            <ChevronUpIcon className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDownIcon className="w-3.5 h-3.5" />
                          )}
                        </div>
                      </button>

                      {openSteps[q.id] && (
                        <div className="px-3.5 pb-3.5 pt-1 text-xs text-slate-700 dark:text-slate-200 border-t border-indigo-100 dark:border-indigo-900/40 leading-relaxed">
                          <div
                            className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-200 [&_p]:my-1"
                            dangerouslySetInnerHTML={{
                              __html: sanitizeHtml(q.solutionSteps),
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
};
