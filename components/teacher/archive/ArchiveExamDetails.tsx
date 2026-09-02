import React from "react";
import type { Exam, Result, Question } from "../../../types";
import { checkAnswerStatus, getCalculatedStats } from "./archiveUtils";
import { isAnswerMatch, parseList } from "../examUtils";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "../../Icons";

interface ArchiveDetailUjianViewProps {
  exam: Exam;
}

export const ArchiveDetailUjianView: React.FC<ArchiveDetailUjianViewProps> = ({
  exam,
}) => {
  return (
    <div className="space-y-4">
      {exam.questions.map((q, index) => {
        const questionNumber =
          exam.questions
            .slice(0, index)
            .filter((i) => i.questionType !== "INFO").length + 1;
        return (
          <div
            key={q.id}
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <span className="flex-shrink-0 mt-1 text-sm font-bold w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                {q.questionType === "INFO" ? "i" : questionNumber}
              </span>
              <div className="flex-1 space-y-4 min-w-0">
                {/* Metadata Badge */}
                {(q.category || q.level || q.scoreWeight) && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {q.category && (
                      <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 uppercase tracking-wide">
                        Kategori: {q.category}
                      </span>
                    )}
                    {q.level && (
                      <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800 uppercase tracking-wide">
                        Level: {q.level}
                      </span>
                    )}
                    <span className="text-[10px] font-bold bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded border border-purple-100 dark:border-purple-800 uppercase tracking-wide">
                      Bobot: {q.scoreWeight || 1}
                    </span>
                  </div>
                )}

                <div
                  className="prose prose-sm max-w-none text-slate-700 dark:text-slate-200"
                  dangerouslySetInnerHTML={{ __html: q.questionText }}
                ></div>

                {q.questionType === "MULTIPLE_CHOICE" &&
                  q.options &&
                  q.options.map((opt, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${isAnswerMatch(q.correctAnswer, opt, q.questionType) ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 font-bold text-emerald-800 dark:text-emerald-300" : "bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-600 text-slate-600 dark:text-slate-300"}`}
                    >
                      <span className="font-bold">
                        {String.fromCharCode(65 + i)}.
                      </span>
                      <div
                        className="flex-1 min-w-0 option-content"
                        dangerouslySetInnerHTML={{ __html: opt }}
                      ></div>
                      {isAnswerMatch(q.correctAnswer, opt, q.questionType) && (
                        <CheckCircleIcon className="w-5 h-5 text-emerald-500 ml-auto shrink-0" />
                      )}
                    </div>
                  ))}

                {q.questionType === "COMPLEX_MULTIPLE_CHOICE" &&
                  q.options &&
                  q.options.map((opt, i) => {
                    const isSelected = parseList(q.correctAnswer || "").some(
                      (a) => isAnswerMatch(a, opt, q.questionType),
                    );
                    return (
                      <div
                        key={i}
                        className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${isSelected ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 font-bold text-emerald-800 dark:text-emerald-300" : "bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-600 text-slate-600 dark:text-slate-300"}`}
                      >
                        <span className="font-bold">
                          {String.fromCharCode(65 + i)}.
                        </span>
                        <div
                          className="flex-1 min-w-0 option-content"
                          dangerouslySetInnerHTML={{ __html: opt }}
                        ></div>
                        {isSelected && (
                          <CheckCircleIcon className="w-5 h-5 text-emerald-500 ml-auto shrink-0" />
                        )}
                      </div>
                    );
                  })}

                {q.questionType === "TRUE_FALSE" && q.trueFalseRows && (
                  <div className="border border-slate-200 dark:border-slate-600 rounded-lg overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm min-w-[500px]">
                      <thead className="bg-slate-50 dark:bg-slate-700">
                        <tr>
                          <th className="p-2 font-bold text-slate-600 dark:text-slate-300 text-left">
                            Pernyataan
                          </th>
                          <th className="p-2 font-bold text-slate-600 dark:text-slate-300 text-center w-32">
                            Jawaban
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {q.trueFalseRows.map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            className="border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800"
                          >
                            <td className="p-2 dark:text-slate-200">
                              <div
                                className="[&_*]:!bg-transparent [&_*]:!text-inherit [&_*]:!p-0 [&_*]:!m-0 option-content"
                                dangerouslySetInnerHTML={{ __html: row.text }}
                              ></div>
                            </td>
                            <td
                              className={`p-2 text-center font-bold ${row.answer ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20" : "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20"}`}
                            >
                              {row.answer ? "Benar" : "Salah"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {q.questionType === "MATCHING" && q.matchingPairs && (
                  <div className="space-y-2">
                    {q.matchingPairs.map((pair, pIdx) => (
                      <div
                        key={pIdx}
                        className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 text-sm"
                      >
                        <div
                          className="flex-1 min-w-0 font-medium dark:text-slate-200 option-content"
                          dangerouslySetInnerHTML={{ __html: pair.left }}
                        ></div>
                        <div className="text-slate-300 dark:text-slate-500">
                          →
                        </div>
                        <div
                          className="flex-1 min-w-0 font-bold dark:text-slate-200 option-content"
                          dangerouslySetInnerHTML={{ __html: pair.right }}
                        ></div>
                      </div>
                    ))}
                  </div>
                )}

                {(q.questionType === "ESSAY" ||
                  q.questionType === "FILL_IN_THE_BLANK") &&
                  q.correctAnswer && (
                    <div className="mt-4 pt-3 border-t dark:border-slate-700">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                        Kunci Jawaban
                      </p>
                      <div
                        className="mt-1 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-sm prose prose-sm max-w-none dark:text-slate-200"
                        dangerouslySetInnerHTML={{ __html: q.correctAnswer }}
                      ></div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface ArchiveStudentsRecapViewProps {
  exam: Exam;
  filteredResults: Result[];
  uniqueSchools: string[];
  selectedSchool: string;
  expandedStudent: string | null;
  toggleStudent: (id: string) => void;
}

export const ArchiveStudentsRecapView: React.FC<
  ArchiveStudentsRecapViewProps
> = ({
  exam,
  filteredResults,
  uniqueSchools,
  selectedSchool,
  expandedStudent,
  toggleStudent,
}) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-slate-50/50 dark:bg-slate-700/50">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Siswa
              </th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Sekolah / Kelas
              </th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">
                Nilai
              </th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">
                B/S/K
              </th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">
                Waktu
              </th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">
                Aktivitas
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
            {uniqueSchools.map((school) => {
              const schoolResults = filteredResults.filter(
                (r) => (r.student.schoolName || "Tanpa Sekolah") === school,
              );
              if (schoolResults.length === 0) return null;

              return (
                <React.Fragment key={school}>
                  {selectedSchool === "ALL" && (
                    <tr className="bg-slate-50/80 dark:bg-slate-700/50">
                      <td
                        colSpan={6}
                        className="px-6 py-2 text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest border-y border-slate-100 dark:border-slate-700"
                      >
                        Sekolah: {school} ({schoolResults.length} Siswa)
                      </td>
                    </tr>
                  )}
                  {schoolResults.map((r) => {
                    const { correct, wrong, empty, score } = getCalculatedStats(
                      r,
                      exam,
                    );
                    return (
                      <React.Fragment key={r.student.studentId}>
                        <tr
                          onClick={() => toggleStudent(r.student.studentId)}
                          className="hover:bg-slate-50/30 dark:hover:bg-slate-700/30 cursor-pointer group transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div
                                className={`transition-transform duration-300 text-slate-400 ${expandedStudent === r.student.studentId ? "rotate-180 text-indigo-500" : ""}`}
                              >
                                {expandedStudent === r.student.studentId ? (
                                  <ChevronUpIcon className="w-4 h-4" />
                                ) : (
                                  <ChevronDownIcon className="w-4 h-4" />
                                )}
                              </div>
                              <div className="flex flex-col">
                                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                  {r.student.fullName}
                                </div>
                                {r.student.schoolName && (
                                  <div className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">
                                    {r.student.schoolName}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                {r.student.schoolName || "Tanpa Sekolah"}
                              </span>
                              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                Kelas {r.student.class}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`text-sm font-black px-2 py-1 rounded ${score >= 75 ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30" : score >= 50 ? "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30" : "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30"}`}
                            >
                              {score}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-xs font-bold text-slate-600 dark:text-slate-400">
                            <span
                              className="text-emerald-600 dark:text-emerald-400"
                              title="Benar"
                            >
                              {correct}
                            </span>{" "}
                            /{" "}
                            <span
                              className="text-rose-600 dark:text-rose-400"
                              title="Salah"
                            >
                              {wrong}
                            </span>{" "}
                            /{" "}
                            <span
                              className="text-slate-400 dark:text-slate-500"
                              title="Kosong"
                            >
                              {empty}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-xs font-bold text-slate-600 dark:text-slate-400">
                            {r.completionTime
                              ? `${Math.floor(r.completionTime / 60)}m ${r.completionTime % 60}s`
                              : "-"}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {r.activityLog && r.activityLog.length > 0 ? (
                              <span className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded font-bold text-[10px] border border-amber-100 dark:border-amber-800">
                                {r.activityLog.length} Log
                              </span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded font-bold text-[10px] border border-emerald-100 dark:border-emerald-800">
                                Aman
                              </span>
                            )}
                          </td>
                        </tr>
                        {expandedStudent === r.student.studentId && (
                          <tr className="animate-fade-in bg-slate-50/50 dark:bg-slate-900/50 shadow-inner">
                            <td colSpan={6} className="p-6">
                              <div className="flex items-center gap-4 mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                <span className="flex items-center gap-1">
                                  <div className="w-3 h-3 bg-emerald-300 dark:bg-emerald-600 rounded"></div>{" "}
                                  Benar
                                </span>
                                <span className="flex items-center gap-1">
                                  <div className="w-3 h-3 bg-rose-300 dark:bg-rose-600 rounded"></div>{" "}
                                  Salah
                                </span>
                                <span className="flex items-center gap-1">
                                  <div className="w-3 h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>{" "}
                                  Kosong
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {exam.questions
                                  .filter((qi) => qi.questionType !== "INFO")
                                  .map((qi, qIdx) => {
                                    const status = checkAnswerStatus(
                                      qi,
                                      r.answers,
                                    );
                                    let bgClass =
                                      "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-200";
                                    if (status === "CORRECT")
                                      bgClass =
                                        "bg-emerald-300 dark:bg-emerald-600 text-slate-900 dark:text-white";
                                    else if (status === "WRONG")
                                      bgClass =
                                        "bg-rose-300 dark:bg-rose-600 text-slate-900 dark:text-white";
                                    return (
                                      <div
                                        key={qi.id}
                                        title={`Soal ${qIdx + 1}: ${status === "CORRECT" ? "Benar" : status === "EMPTY" ? "Kosong" : "Salah"}`}
                                        className={`w-6 h-6 flex items-center justify-center rounded text-[10px] font-bold ${bgClass} cursor-help transition-transform hover:scale-110`}
                                      >
                                        {qIdx + 1}
                                      </div>
                                    );
                                  })}
                              </div>

                              {r.activityLog && r.activityLog.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                  <h4 className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-500 mb-2 flex items-center gap-2">
                                    <ExclamationTriangleIcon className="w-3 h-3" />{" "}
                                    Riwayat Aktivitas & Kecurangan
                                  </h4>
                                  <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc pl-4 font-mono bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                                    {r.activityLog.map((log, lIdx) => (
                                      <li key={lIdx}>{log}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
