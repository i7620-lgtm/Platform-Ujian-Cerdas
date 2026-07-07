import React from "react";
import type { Exam } from "../../../../types";
import { checkAnswerStatus } from "../archiveUtils";

interface PrintItemDifficultyProps {
  exam: Exam;
  questionAnalysisData: {
    id: string;
    correctRate: number;
    options?: string[];
    distribution: Record<string, number>;
  }[];
}

export const PrintItemDifficulty: React.FC<PrintItemDifficultyProps> = ({
  exam,
  questionAnalysisData,
}) => {
  return (
      <div className="mb-4 break-before-page pt-4">
        <h3 className="font-bold text-sm uppercase tracking-wider mb-2 border-l-4 border-slate-800 pl-2 break-after-avoid">
          3. Analisis Butir Soal
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {questionAnalysisData.map((data, idx) => {
            const difficultyLabel =
              data.correctRate >= 80
                ? "Mudah"
                : data.correctRate >= 50
                  ? "Sedang"
                  : "Sulit";

            let diffColorClass = "print-bg-green";
            let barColorClass = "print-bar-green";

            if (data.correctRate < 50) {
              diffColorClass = "print-bg-red";
              barColorClass = "print-bar-red";
            } else if (data.correctRate < 80) {
              diffColorClass = "print-bg-orange";
              barColorClass = "print-bar-orange";
            }

            const originalQ = exam.questions.find((q) => q.id === data.id);

            return (
              <div
                key={data.id}
                className="avoid-break border border-slate-300 rounded p-2 text-xs flex flex-col gap-2 bg-white"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10px] border border-slate-200">
                    Soal {idx + 1}
                  </span>
                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${diffColorClass}`}
                  >
                    {difficultyLabel}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className={`h-full ${barColorClass}`}
                      style={{ width: `${data.correctRate}%` }}
                    ></div>
                  </div>
                  <span className="font-bold text-[10px] w-14 text-right">
                    {data.correctRate}% Benar
                  </span>
                </div>

                <div className="pt-1 border-t border-slate-100">
                  {data.options ? (
                    <div className="grid grid-cols-1 gap-1 text-[9px]">
                      {data.options.map((opt, i) => {
                        const label = String.fromCharCode(65 + i);
                        const count = Object.entries(data.distribution).reduce(
                          (acc, [ans, c]) => {
                            if (
                              originalQ?.questionType ===
                              "COMPLEX_MULTIPLE_CHOICE"
                            ) {
                              const sList = parseList(ans);
                              return sList.some((a) =>
                                isAnswerMatch(a, opt, originalQ.questionType),
                              )
                                ? acc + (c as number)
                                : acc;
                            }
                            return isAnswerMatch(
                              ans,
                              opt,
                              originalQ?.questionType || "MULTIPLE_CHOICE",
                            )
                              ? acc + (c as number)
                              : acc;
                          },
                          0,
                        );

                        const pct =
                          results.length > 0
                            ? Math.round((count / results.length) * 100)
                            : 0;

                        const isCorrect =
                          (originalQ?.questionType === "MULTIPLE_CHOICE" &&
                            isAnswerMatch(
                              originalQ.correctAnswer,
                              opt,
                              originalQ.questionType,
                            )) ||
                          (originalQ?.questionType ===
                            "COMPLEX_MULTIPLE_CHOICE" &&
                            parseList(originalQ.correctAnswer).some((ans) =>
                              isAnswerMatch(ans, opt, originalQ.questionType),
                            ));

                        return (
                          <div
                            key={i}
                            className={`flex items-center justify-between px-2 py-1 rounded border ${isCorrect ? "print-bg-green font-bold" : "border-slate-100 text-slate-600"}`}
                          >
                            <div className="flex gap-2 items-start w-full overflow-hidden">
                              <span className="w-4 font-bold shrink-0">
                                {label}.
                              </span>
                              <div
                                className="min-w-0 option-content [&_p]:inline [&_br]:hidden [&_img]:max-h-20 [&_img]:w-auto [&_img]:inline-block"
                                dangerouslySetInnerHTML={{ __html: opt }}
                              ></div>
                            </div>
                            <span className="shrink-0 ml-2">
                              <b>{count}</b> ({pct}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 text-[9px]">
                      {Object.entries(data.distribution).length > 0 ? (
                        Object.entries(data.distribution)
                          .sort(([, a], [, b]) => (b as number) - (a as number))
                          .slice(0, 10)
                          .map(([ans, count], i) => {
                            const numCount = count as number;
                            const pct =
                              results.length > 0
                                ? Math.round((numCount / results.length) * 100)
                                : 0;

                            let displayAns = ans;
                            let isCorrect = false;

                            try {
                              if (originalQ?.questionType === "MATCHING") {
                                const parsed = JSON.parse(ans);
                                const orderedValues = (
                                  originalQ.matchingPairs || []
                                ).map((_, pIdx) => parsed[pIdx] || "—");
                                displayAns = orderedValues.join(", ");
                                isCorrect =
                                  originalQ.matchingPairs?.every(
                                    (pair, pIdx) => parsed[pIdx] === pair.right,
                                  ) ?? false;
                              } else if (
                                originalQ?.questionType === "TRUE_FALSE"
                              ) {
                                const parsed = JSON.parse(ans);
                                const orderedValues = (
                                  originalQ.trueFalseRows || []
                                ).map((_, rIdx) => {
                                  const val = parsed[rIdx];
                                  return val === true
                                    ? "Benar"
                                    : val === false
                                      ? "Salah"
                                      : "—";
                                });
                                displayAns = orderedValues.join(", ");
                                isCorrect =
                                  originalQ.trueFalseRows?.every(
                                    (row, rIdx) => parsed[rIdx] === row.answer,
                                  ) ?? false;
                              } else if (
                                originalQ?.questionType ===
                                "COMPLEX_MULTIPLE_CHOICE"
                              ) {
                                const parsed = parseList(ans);
                                parsed.sort(
                                  (a, b) =>
                                    (originalQ.options || []).indexOf(a) -
                                    (originalQ.options || []).indexOf(b),
                                );
                                displayAns = parsed.join(", ");
                                const cList = parseList(
                                  originalQ.correctAnswer || "",
                                );
                                isCorrect =
                                  parsed.length === cList.length &&
                                  parsed.every((s) =>
                                    cList.some((c) =>
                                      isAnswerMatch(
                                        s,
                                        c,
                                        originalQ.questionType,
                                      ),
                                    ),
                                  );
                              } else {
                                isCorrect = isAnswerMatch(
                                  ans,
                                  originalQ?.correctAnswer || "",
                                  originalQ?.questionType || "MULTIPLE_CHOICE",
                                );
                              }
                            } catch {
                              /* ignore */
                            }

                            return (
                              <div
                                key={i}
                                className={`flex items-start justify-between px-2 py-1 rounded border ${isCorrect ? "print-bg-green font-bold" : "bg-slate-50 border-slate-100 text-slate-600"}`}
                              >
                                <div
                                  className="flex-1 mr-2 min-w-0 option-content [&_p]:inline [&_br]:hidden [&_img]:max-h-10 [&_img]:w-auto [&_img]:inline-block"
                                  dangerouslySetInnerHTML={{
                                    __html: displayAns,
                                  }}
                                ></div>
                                <span className="shrink-0 font-bold">
                                  {count} ({pct}%)
                                </span>
                              </div>
                            );
                          })
                      ) : (
                        <span className="text-slate-400 italic text-center py-1">
                          Belum ada jawaban.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

  );
};
