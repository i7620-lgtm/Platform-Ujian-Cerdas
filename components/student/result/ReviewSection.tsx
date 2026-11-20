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
  const questionProseClass =
    "text-sm font-medium text-slate-800 dark:text-slate-200 mb-4 leading-relaxed prose prose-sm max-w-full min-w-0 break-words dark:prose-invert [&_img]:max-w-full [&_img]:h-auto [&_svg]:max-w-full [&_.katex-display]:max-w-full [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:py-1 [&_table]:text-xs";

  if (!chartData) {
    return (
      <div
        className={questionProseClass}
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
          className={questionProseClass}
          dangerouslySetInnerHTML={{ __html: sanitized }}
        ></div>
        <div className="mb-4 w-full max-w-3xl mx-auto min-w-0 overflow-hidden">
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
    <div className={questionProseClass}>
      {parts.map((part, index) => (
        <React.Fragment key={index}>
          <div dangerouslySetInnerHTML={{ __html: part }}></div>
          {index < parts.length - 1 && (
            <div className="my-4 w-full max-w-3xl mx-auto min-w-0 overflow-hidden">
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

  const showKeys = Boolean(exam.config?.showCorrectAnswer);

  const toggleHint = (qId: string) => {
    setOpenHints((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  const toggleSteps = (qId: string) => {
    setOpenSteps((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  return (
    <div className="mt-8 space-y-4 text-left border-t border-slate-50 dark:border-slate-800 pt-6 sm:pt-8 animate-fade-in min-w-0 max-w-full">
      {exam.questions
        .filter((q) => q.questionType !== "INFO")
        .map((q, idx) => {
          const rawStudentAns = result.answers?.[q.id] || "";
          const studentAns = rawStudentAns.trim().length > 0 ? rawStudentAns : "-";
          const correctAns = q.correctAnswer || "-";
          const manualGrade = result.answers?.[`_grade_${q.id}`];

          let isAnsweredByStudent = rawStudentAns.trim().length > 0;
          let isCorrect = false;

          let displayStudentAns = studentAns;
          let displayCorrectAns = correctAns;

          if (
            q.questionType === "MULTIPLE_CHOICE" ||
            q.questionType === "FILL_IN_THE_BLANK"
          ) {
            isCorrect = showKeys && isAnswerMatch(correctAns, rawStudentAns, q.questionType, q.options);
          } else if (q.questionType === "COMPLEX_MULTIPLE_CHOICE") {
            const parsedStudent = parseList(rawStudentAns, q.options);
            isAnsweredByStudent = parsedStudent.length > 0;
            const sSet = new Set(
              parsedStudent.map((a) => normalize(a, q.questionType)),
            );
            const cSet = new Set(
              parseList(correctAns, q.options).map((a) => normalize(a, q.questionType)),
            );
            isCorrect =
              showKeys &&
              sSet.size === cSet.size &&
              sSet.size > 0 &&
              [...sSet].every((x) => cSet.has(x));
            try {
              parsedStudent.sort(
                (a, b) =>
                  (q.options || []).indexOf(a) - (q.options || []).indexOf(b),
              );
              if (parsedStudent.length > 0) {
                displayStudentAns = parsedStudent
                  .map((p) => `• ${p}`)
                  .join("<br/>");
              } else {
                displayStudentAns = "-";
              }
              const parsedCorrect = parseList(correctAns, q.options);
              parsedCorrect.sort(
                (a, b) =>
                  (q.options || []).indexOf(a) - (q.options || []).indexOf(b),
              );
              if (parsedCorrect.length > 0) {
                displayCorrectAns = parsedCorrect
                  .map((p) => `• ${p}`)
                  .join("<br/>");
              }
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
                const ansObj = rawStudentAns ? JSON.parse(rawStudentAns) : {};
                isAnsweredByStudent = Boolean(ansObj && typeof ansObj === "object" && Object.keys(ansObj).length > 0);
                const trueLabel = (q.categoryLabels && q.categoryLabels[0]) || "Benar";
                const falseLabel = (q.categoryLabels && q.categoryLabels[1]) || "Salah";
                isCorrect =
                  showKeys &&
                  (q.trueFalseRows?.every(
                    (row, i) => ansObj[i] !== undefined && ansObj[i] === row.answer,
                  ) ?? false);
                displayStudentAns =
                  q.trueFalseRows
                    ?.map((r, i) => {
                      const valLabel =
                        ansObj[i] === true
                          ? trueLabel
                          : ansObj[i] === false
                            ? falseLabel
                            : "-";
                      return `• ${r.text.replace(/<[^>]*>/g, "")}: <strong>${valLabel}</strong>`;
                    })
                    .join("<br/>") || studentAns;
                displayCorrectAns =
                  q.trueFalseRows
                    ?.map(
                      (r) =>
                        `• ${r.text.replace(/<[^>]*>/g, "")}: <strong>${r.answer ? trueLabel : falseLabel}</strong>`,
                    )
                    .join("<br/>") || correctAns;
              } else {
                const ansObj = rawStudentAns ? JSON.parse(rawStudentAns) : {};
                isAnsweredByStudent = Boolean(ansObj && typeof ansObj === "object" && Object.keys(ansObj).length > 0);
                isCorrect =
                  showKeys &&
                  (q.matchingPairs?.every((pair, i) =>
                    isAnswerMatch(pair.right, ansObj[i], q.questionType),
                  ) ?? false);
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

          if (manualGrade) {
            isCorrect = showKeys && manualGrade === "CORRECT";
          }

          const isPendingManualEssay =
            showKeys && q.questionType === "ESSAY" && !manualGrade;

          const solutionContent = q.solutionSteps || q.explanation || "";

          return (
            <div
              key={q.id}
              className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors min-w-0 max-w-full overflow-hidden"
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest shrink-0">
                  Soal {idx + 1}
                </span>
                {q.questionType === "QUESTIONNAIRE" ? (
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                    Respon Tercatat
                  </span>
                ) : !showKeys ? (
                  <span
                    className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide ${
                      isAnsweredByStudent
                        ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                        : "bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {isAnsweredByStudent ? "Sudah Dijawab" : "Kosong"}
                  </span>
                ) : isPendingManualEssay ? (
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
                    Menunggu Penilaian
                  </span>
                ) : (
                  <span
                    className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide ${isCorrect ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"}`}
                  >
                    {isCorrect ? "Benar" : "Salah"}
                  </span>
                )}
              </div>
              {renderQuestionTextWithChart(q.questionText, q.chartData)}

              <div className="text-xs space-y-2.5 sm:space-y-2 bg-white dark:bg-slate-900 p-3 sm:p-3.5 rounded-xl border border-slate-100 dark:border-slate-700 min-w-0 max-w-full overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1.5 sm:gap-3 min-w-0">
                  <span className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-bold shrink-0">
                    Jawaban Kamu:
                  </span>
                  <div
                    className={`text-left sm:text-right font-black option-content w-full sm:w-auto sm:flex-1 min-w-0 max-w-full break-words leading-relaxed [&_p]:inline [&_.katex-display]:max-w-full [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_img]:max-w-full [&_img]:h-auto [&_svg]:max-w-full [&_table]:text-[11px] ${
                      q.questionType === "QUESTIONNAIRE"
                        ? "text-indigo-600 dark:text-indigo-400"
                        : !showKeys || isPendingManualEssay
                          ? isAnsweredByStudent
                            ? "text-slate-800 dark:text-slate-100"
                            : "text-slate-400 dark:text-slate-500 italic font-medium"
                          : isCorrect
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                    }`}
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(displayStudentAns),
                    }}
                  ></div>
                </div>
                {showKeys && q.questionType !== "QUESTIONNAIRE" && (
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start border-t border-slate-100 dark:border-slate-800 pt-2.5 sm:pt-2 mt-2 gap-1.5 sm:gap-3 min-w-0">
                    <span className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-bold shrink-0">
                      Kunci Jawaban:
                    </span>
                    <div
                      className="text-left sm:text-right font-black text-slate-700 dark:text-slate-300 option-content w-full sm:w-auto sm:flex-1 min-w-0 max-w-full break-words leading-relaxed [&_p]:inline [&_.katex-display]:max-w-full [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_img]:max-w-full [&_img]:h-auto [&_svg]:max-w-full [&_table]:text-[11px]"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(displayCorrectAns),
                      }}
                    ></div>
                  </div>
                )}
              </div>

              {/* Petunjuk Pengerjaan & Langkah Pengerjaan (Hanya jika diizinkan oleh guru) */}
              {((exam.config?.showHints && q.hint && q.hint.trim() !== "") ||
                (exam.config?.showSolutionSteps && solutionContent.trim() !== "")) && (
                <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-col gap-2">
                  {/* Accordion Petunjuk Pengerjaan */}
                  {exam.config?.showHints && q.hint && q.hint.trim() !== "" && (
                    <div className="rounded-xl border border-amber-200/80 dark:border-amber-800/60 overflow-hidden bg-amber-50/40 dark:bg-amber-950/20">
                      <button
                        type="button"
                        onClick={() => toggleHint(q.id)}
                        className="w-full min-h-[44px] px-3.5 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
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
                        <div className="px-3.5 pb-3.5 pt-1 text-xs text-slate-700 dark:text-slate-200 border-t border-amber-100 dark:border-amber-900/40 leading-relaxed min-w-0 max-w-full overflow-hidden">
                          <div
                            className="prose prose-sm dark:prose-invert max-w-full min-w-0 break-words text-slate-700 dark:text-slate-200 [&_p]:my-1 [&_img]:max-w-full [&_img]:h-auto [&_svg]:max-w-full [&_.katex-display]:max-w-full [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_table]:text-xs"
                            dangerouslySetInnerHTML={{
                              __html: sanitizeHtml(q.hint),
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Accordion Langkah Pengerjaan */}
                  {exam.config?.showSolutionSteps && solutionContent.trim() !== "" && (
                    <div className="rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 overflow-hidden bg-indigo-50/40 dark:bg-indigo-950/20">
                      <button
                        type="button"
                        onClick={() => toggleSteps(q.id)}
                        className="w-full min-h-[44px] px-3.5 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
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
                        <div className="px-3.5 pb-3.5 pt-1 text-xs text-slate-700 dark:text-slate-200 border-t border-indigo-100 dark:border-indigo-900/40 leading-relaxed min-w-0 max-w-full overflow-hidden">
                          <div
                            className="prose prose-sm dark:prose-invert max-w-full min-w-0 break-words text-slate-700 dark:text-slate-200 [&_p]:my-1 [&_img]:max-w-full [&_img]:h-auto [&_svg]:max-w-full [&_.katex-display]:max-w-full [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_table]:text-xs"
                            dangerouslySetInnerHTML={{
                              __html: sanitizeHtml(solutionContent),
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
