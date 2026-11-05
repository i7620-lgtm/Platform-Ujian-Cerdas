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
import { QuestionResultDetailPopover } from "../../QuestionResultDetailPopover";

interface ArchiveDetailUjianViewProps {
  exam: Exam;
}

export const ArchiveDetailUjianView: React.FC<ArchiveDetailUjianViewProps> = ({
  exam,
}) => {
  const isCorrectMCOption = (q: Question, opt: string, index: number): boolean => {
    const ans = String(q.correctAnswer || "").trim();
    if (!ans) return false;
    const letter = String.fromCharCode(65 + index);
    if (ans.toUpperCase() === letter) return true;
    if (ans.toUpperCase().startsWith(`${letter}.`) || ans.toUpperCase().startsWith(`${letter})`)) return true;
    if (ans === String(index)) return true;
    if (isAnswerMatch(ans, opt, q.questionType, q.options)) return true;
    const strip = (s: string) => s.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
    const cleanAns = strip(ans);
    const cleanOpt = strip(opt);
    if (cleanAns.length > 0 && cleanAns === cleanOpt) return true;
    if (cleanOpt.startsWith(`${letter.toLowerCase()}.`) || cleanOpt.startsWith(`${letter.toLowerCase()})`)) {
      const strippedOptText = cleanOpt.substring(2).trim();
      if (strippedOptText === cleanAns) return true;
    }
    return false;
  };

  const isCorrectCMCOption = (q: Question, opt: string, index: number): boolean => {
    if (!q.correctAnswer) return false;
    const letter = String.fromCharCode(65 + index);
    const answers = parseList(q.correctAnswer, q.options);
    if (answers.length === 0) {
      const rawAns = String(q.correctAnswer).trim();
      if (rawAns.toUpperCase().includes(letter)) return true;
    }
    return answers.some((a) => {
      const cleanA = String(a).trim();
      if (cleanA.toUpperCase() === letter) return true;
      if (cleanA === String(index)) return true;
      if (cleanA.toUpperCase().startsWith(`${letter}.`) || cleanA.toUpperCase().startsWith(`${letter})`)) return true;
      if (isAnswerMatch(cleanA, opt, q.questionType, q.options)) return true;
      const strip = (s: string) => s.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
      if (strip(cleanA).length > 0 && strip(cleanA) === strip(opt)) return true;
      return false;
    });
  };

  const getTrueFalseRows = (q: Question) => {
    let rows = q.trueFalseRows || (q as any).true_false_rows;
    if ((!rows || rows.length === 0) && q.correctAnswer) {
      try {
        const parsed = typeof q.correctAnswer === "string" ? JSON.parse(q.correctAnswer) : q.correctAnswer;
        if (Array.isArray(parsed)) rows = parsed;
      } catch {
        /* ignore */
      }
    }
    const categoryLabels = q.categoryLabels || (q as any).category_labels;
    const firstLabel = categoryLabels && categoryLabels[0] ? String(categoryLabels[0]).toLowerCase() : "benar";
    return (rows || []).map((row: any) => {
      const rawAns = row.answer;
      const strAns = String(rawAns).toLowerCase().trim();
      const isTrue =
        rawAns === true ||
        strAns === "true" ||
        strAns === "1" ||
        strAns === "benar" ||
        strAns === "ya" ||
        strAns === "sesuai" ||
        strAns === "fakta" ||
        strAns === "setuju" ||
        strAns === firstLabel;
      return {
        text: row.text || "",
        answer: isTrue,
      };
    });
  };

  const getMatchingPairs = (q: Question) => {
    let pairs = q.matchingPairs || (q as any).matching_pairs;
    if ((!pairs || pairs.length === 0) && q.correctAnswer) {
      try {
        const parsed = typeof q.correctAnswer === "string" ? JSON.parse(q.correctAnswer) : q.correctAnswer;
        if (Array.isArray(parsed)) pairs = parsed;
      } catch {
        /* ignore */
      }
    }
    return pairs || [];
  };

  const getExplanation = (q: Question): string => {
    return (
      q.explanation ||
      (q as any).solution ||
      (q as any).pembahasan ||
      q.solutionSteps ||
      (q as any).solution_steps ||
      ""
    );
  };

  return (
    <div className="space-y-4">
      {exam.questions.map((q, index) => {
        const isInfo = q.questionType === "INFO" || (q as any).type === "INFO";
        const questionNumber =
          exam.questions
            .slice(0, index)
            .filter((i) => i.questionType !== "INFO" && (i as any).type !== "INFO").length + 1;

        const tfRows = q.questionType === "TRUE_FALSE" ? getTrueFalseRows(q) : [];
        const matchingPairs = q.questionType === "MATCHING" ? getMatchingPairs(q) : [];
        const explanation = getExplanation(q);

        return (
          <div
            key={q.id}
            className={`p-6 rounded-2xl border shadow-sm ${
              isInfo
                ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40 border-l-4 border-l-blue-500"
                : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700"
            }`}
          >
            <div className="flex items-start gap-4">
              {isInfo ? (
                <span className="flex-shrink-0 mt-1 text-[10px] font-black px-2 py-1 flex items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  INFO
                </span>
              ) : (
                <span className="flex-shrink-0 mt-1 text-sm font-bold w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                  {questionNumber}
                </span>
              )}
              <div className="flex-1 space-y-4 min-w-0">
                {/* Metadata Badge */}
                {!isInfo && (q.category || q.level || q.scoreWeight) && (
                  <div className="flex flex-wrap items-center gap-2 mb-3 text-[11px] text-slate-500 dark:text-slate-400">
                    {q.category && (
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Kategori: {q.category}
                      </span>
                    )}
                    {q.category && (q.level || q.scoreWeight) && <span aria-hidden="true">&bull;</span>}
                    {q.level && (
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        Level: {q.level}
                      </span>
                    )}
                    {q.level && q.scoreWeight && <span aria-hidden="true">&bull;</span>}
                    <span className="font-semibold text-purple-600 dark:text-purple-400">
                      Bobot: {q.scoreWeight || 1}
                    </span>
                  </div>
                )}

                <div
                  className="prose prose-sm max-w-none text-slate-700 dark:text-slate-200"
                  dangerouslySetInnerHTML={{ __html: q.questionText }}
                ></div>

                {/* Pilihan Ganda (MC) */}
                {q.questionType === "MULTIPLE_CHOICE" &&
                  q.options &&
                  q.options.map((opt, i) => {
                    const isCorrect = isCorrectMCOption(q, opt, i);
                    return (
                      <div
                        key={i}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border text-sm transition-colors ${
                          isCorrect
                            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 font-bold text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-400/30"
                            : "bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-600 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        <span
                          className={`font-extrabold w-6 text-center ${
                            isCorrect
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {String.fromCharCode(65 + i)}.
                        </span>
                        <div
                          className="flex-1 min-w-0 option-content"
                          dangerouslySetInnerHTML={{ __html: opt }}
                        ></div>
                      </div>
                    );
                  })}

                {/* Pilihan Ganda Kompleks (CMC) */}
                {q.questionType === "COMPLEX_MULTIPLE_CHOICE" &&
                  q.options &&
                  q.options.map((opt, i) => {
                    const isSelected = isCorrectCMCOption(q, opt, i);
                    return (
                      <div
                        key={i}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border text-sm transition-colors ${
                          isSelected
                            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 font-bold text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-400/30"
                            : "bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-600 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        <span
                          className={`font-extrabold w-6 text-center ${
                            isSelected
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {String.fromCharCode(65 + i)}.
                        </span>
                        <div
                          className="flex-1 min-w-0 option-content"
                          dangerouslySetInnerHTML={{ __html: opt }}
                        ></div>
                      </div>
                    );
                  })}

                {/* Benar / Salah (TF) */}
                {q.questionType === "TRUE_FALSE" && tfRows.length > 0 && (
                  <div className="border border-slate-200 dark:border-slate-600 rounded-xl overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm min-w-[500px]">
                      <thead className="bg-slate-50 dark:bg-slate-700">
                        <tr>
                          <th className="p-3 font-bold text-slate-600 dark:text-slate-300 text-left">
                            Pernyataan
                          </th>
                          <th className="p-3 font-bold text-slate-600 dark:text-slate-300 text-center w-36">
                            Kunci Jawaban
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {tfRows.map((row, rIdx) => {
                          const trueText = (q.categoryLabels && q.categoryLabels[0]) || "Benar";
                          const falseText = (q.categoryLabels && q.categoryLabels[1]) || "Salah";
                          return (
                            <tr
                              key={rIdx}
                              className="border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800"
                            >
                              <td className="p-3 dark:text-slate-200">
                                <div
                                  className="[&_*]:!bg-transparent [&_*]:!text-inherit [&_*]:!p-0 [&_*]:!m-0 option-content"
                                  dangerouslySetInnerHTML={{ __html: row.text }}
                                ></div>
                              </td>
                              <td className="p-3 text-center">
                                <span
                                  className={`inline-block px-3 py-1 rounded-md text-xs font-bold ${
                                    row.answer
                                      ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800"
                                      : "text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800"
                                  }`}
                                >
                                  {row.answer ? trueText : falseText}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Menjodohkan (Matching) */}
                {q.questionType === "MATCHING" && matchingPairs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                      Pasangan Kunci Jawaban:
                    </p>
                    {matchingPairs.map((pair, pIdx) => (
                      <div
                        key={pIdx}
                        className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-sm"
                      >
                        <div
                          className="flex-1 min-w-0 font-medium dark:text-slate-200 option-content"
                          dangerouslySetInnerHTML={{ __html: pair.left }}
                        ></div>
                        <div className="text-slate-400 dark:text-slate-500 font-bold px-1">
                          &rarr;
                        </div>
                        <div
                          className="flex-1 min-w-0 font-bold text-emerald-700 dark:text-emerald-300 option-content bg-emerald-50/60 dark:bg-emerald-950/30 px-3 py-1 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60"
                          dangerouslySetInnerHTML={{ __html: pair.right }}
                        ></div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Esai & Isian Singkat */}
                {(q.questionType === "ESSAY" ||
                  q.questionType === "FILL_IN_THE_BLANK") &&
                  (q.correctAnswer || (q as any).correct_answer) && (
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                        Kunci Jawaban:
                      </p>
                      <div
                        className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 text-sm text-emerald-900 dark:text-emerald-200 font-medium prose prose-sm max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{
                          __html: q.correctAnswer || (q as any).correct_answer,
                        }}
                      ></div>
                    </div>
                  )}

                {/* Seksi Pembahasan / Solusi Soal */}
                {explanation && (
                  <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-700">
                    <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                      <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 text-sm font-bold mb-2">
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span>Pembahasan Soal:</span>
                      </div>
                      <div
                        className="prose prose-sm max-w-none text-slate-700 dark:text-slate-200"
                        dangerouslySetInnerHTML={{ __html: explanation }}
                      />
                    </div>
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
  studentStatsMap?: Map<
    string,
    { correct: number; wrong: number; empty: number; score: number; duration: number }
  >;
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
  studentStatsMap,
}) => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState<number | "ALL">(15);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedSchool, filteredResults.length]);

  const totalStudents = filteredResults.length;
  const effectivePageSize = pageSize === "ALL" ? totalStudents : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(totalStudents / (effectivePageSize || 1)));

  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * effectivePageSize;
  const endIndex = Math.min(startIndex + effectivePageSize, totalStudents);

  const displayedResults = React.useMemo(() => {
    return filteredResults.slice(startIndex, endIndex);
  }, [filteredResults, startIndex, endIndex]);

  const displayedSchools = React.useMemo(() => {
    const schools = new Set(displayedResults.map((r) => r.student.schoolName || "Tanpa Sekolah"));
    return uniqueSchools.filter((s) => schools.has(s));
  }, [displayedResults, uniqueSchools]);

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
            {displayedSchools.map((school) => {
              const schoolResults = displayedResults.filter(
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
                    const stats = studentStatsMap?.get(r.student.studentId) || getCalculatedStats(
                      r,
                      exam,
                    );
                    const { correct, wrong, empty, score } = stats;
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
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {exam.questions
                                  .filter((qi) => qi.questionType !== "INFO")
                                  .map((qi, qIdx) => {
                                    const status = checkAnswerStatus(
                                      qi,
                                      r.answers,
                                    );
                                    const isManual =
                                      qi.questionType === "ESSAY" ||
                                      qi.questionType === "FILL_IN_THE_BLANK";
                                    const isGraded = r.answers[`_grade_${qi.id}`];
                                    return (
                                      <QuestionResultDetailPopover
                                        key={qi.id}
                                        question={qi}
                                        questionIndex={qIdx}
                                        answers={r.answers}
                                        status={status}
                                        isManual={isManual}
                                        isGraded={isGraded}
                                        showCorrectAnswer={true}
                                        showSolutionSteps={true}
                                      />
                                    );
                                  })}
                              </div>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-2">
                                * Klik nomor soal untuk melihat soal, opsi, kunci jawaban, jawaban siswa, dan pembahasan.
                              </p>

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

      {totalStudents > 0 && (
        <div className="px-6 py-3.5 bg-slate-50/70 dark:bg-slate-700/30 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>
              Menampilkan <span className="font-bold text-slate-800 dark:text-slate-200">{totalStudents > 0 ? startIndex + 1 : 0}</span> -{" "}
              <span className="font-bold text-slate-800 dark:text-slate-200">{endIndex}</span> dari{" "}
              <span className="font-bold text-slate-800 dark:text-slate-200">{totalStudents}</span> Siswa
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px]">Per Halaman:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(e.target.value === "ALL" ? "ALL" : Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-lg px-2 py-1 outline-none font-bold"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value="ALL">Semua</option>
              </select>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={activePage <= 1}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-colors"
                >
                  Sebelumnya
                </button>
                <span className="px-2 py-1 font-bold text-slate-700 dark:text-slate-200">
                  {activePage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={activePage >= totalPages}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-colors"
                >
                  Selanjutnya
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
