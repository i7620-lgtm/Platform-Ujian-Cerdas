import React from "react";
import type { Exam, Result, ChartData } from "../../../types";
import { isAnswerMatch, parseList, normalize, sanitizeHtml } from "../../teacher/examUtils";
import { ChartRenderer } from "../../ChartRenderer";

const renderQuestionTextWithChart = (
  html: string,
  chartData: ChartData | undefined,
) => {
  const sanitized = sanitizeHtml(html);
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
                isCorrect =
                  q.trueFalseRows?.every(
                    (row, i) => ansObj[i] === row.answer,
                  ) ?? false;
                displayStudentAns =
                  q.trueFalseRows
                    ?.map(
                      (r, i) =>
                        `• ${r.text.replace(/<[^>]*>/g, "")}: <strong>${ansObj[i] ? "Benar" : "Salah"}</strong>`,
                    )
                    .join("<br/>") || studentAns;
                displayCorrectAns =
                  q.trueFalseRows
                    ?.map(
                      (r) =>
                        `• ${r.text.replace(/<[^>]*>/g, "")}: <strong>${r.answer ? "Benar" : "Salah"}</strong>`,
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
                displayCorrectAns =
                  q.trueFalseRows
                    ?.map(
                      (r) =>
                        `• ${r.text.replace(/<[^>]*>/g, "")}: <strong>${r.answer ? "Benar" : "Salah"}</strong>`,
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
                {!isCorrect && (
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
            </div>
          );
        })}
    </div>
  );
};
