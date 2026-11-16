import React, { useState, useMemo, useEffect } from "react";
import type { Exam, Result, Question } from "../../../../types";
import {
  ChevronDownIcon,
  TrashIcon,
  CheckCircleIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  FileExcelIcon,
  MagnifyingGlassIcon,
} from "../../../Icons";
import { QuestionResultDetailPopover } from "../../../QuestionResultDetailPopover";
import { showAlertModal } from "../../../../stores/feedbackStore";

interface FinishedStudentsTabProps {
  displayExam: Exam;
  results: Result[];
  filteredResults: Result[];
  uniqueClasses: string[];
  selectedClass: string;
  setSelectedClass: (cls: string) => void;
  expandedStudent: string | null;
  toggleStudent: (studentId: string) => void;
  rateQuestion: (
    studentResult: Result,
    qId: string,
    isCorrect: boolean,
  ) => Promise<void>;
  handleDeleteResult: (studentId: string, studentName: string) => Promise<void>;
  getCalculatedStats: (r: Result) => {
    correct: number;
    wrong: number;
    empty: number;
    score: number;
    duration: number;
    olympiadTier?: {
      tier: "GOLD" | "SILVER" | "BRONZE" | "PARTICIPANT";
      label: string;
      medal: string;
      badgeClass: string;
    };
    maxScore?: number;
    minScore?: number;
  };
  formatDuration: (seconds: number | undefined | null) => string;
  checkAnswerStatus: (
    q: Question,
    studentAnswers: Record<string, string>,
  ) => string;
}

export const FinishedStudentsTab: React.FC<FinishedStudentsTabProps> = ({
  displayExam,
  results,
  filteredResults,
  uniqueClasses,
  selectedClass,
  setSelectedClass,
  expandedStudent,
  toggleStudent,
  rateQuestion,
  handleDeleteResult,
  getCalculatedStats,
  formatDuration,
  checkAnswerStatus,
}) => {
  const PAGE_SIZE = 50;
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClass, searchQuery]);

  const searchFilteredResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filteredResults;
    return filteredResults.filter((r) => {
      const name = (r.student.fullName || "").toLowerCase();
      const sid = (r.student.studentId || "").toLowerCase();
      const abs = (r.student.absentNumber || "").toLowerCase();
      const cls = (r.student.class || "").toLowerCase();
      const sch = (r.student.schoolName || "").toLowerCase();
      return (
        name.includes(q) ||
        sid.includes(q) ||
        abs.includes(q) ||
        cls.includes(q) ||
        sch.includes(q)
      );
    });
  }, [filteredResults, searchQuery]);

  const totalFilteredCount = searchFilteredResults.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedResults = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return searchFilteredResults.slice(start, start + PAGE_SIZE);
  }, [searchFilteredResults, safeCurrentPage]);

  const handleExportExcel = async () => {
    try {
      const { downloadArchiveExcel } = await import("../../archive/archiveExcelExporter");
      downloadArchiveExcel(displayExam, searchFilteredResults);
    } catch (e) {
      console.error("Gagal mengekspor Excel", e);
      await showAlertModal({
        title: "Gagal Mengunduh Excel",
        message: "Gagal mengunduh file Excel. Silakan coba beberapa saat lagi.",
        tone: "danger",
      });
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col font-sans">
      <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 bg-slate-50/50 dark:bg-slate-700/30">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {uniqueClasses.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase">
                Filter Kelas:
              </span>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="text-xs font-bold p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ALL">Semua Kelas ({results.length})</option>
                {uniqueClasses.map((c) => (
                  <option key={c} value={c}>
                    {c} ({results.filter((r) => r.student.class === c).length})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama siswa, absen, kelas..."
              className="w-full pl-9 pr-8 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Hapus pencarian"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="text-xs font-bold text-slate-400">
            {totalFilteredCount > 0 ? (
              <>
                Menampilkan {(safeCurrentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(safeCurrentPage * PAGE_SIZE, totalFilteredCount)} dari{" "}
                {totalFilteredCount} Siswa
              </>
            ) : (
              "Menampilkan 0 Siswa"
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleExportExcel}
          className="flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all transform active:scale-95 shrink-0 cursor-pointer"
          title="Unduh data rekap ke format Excel (.xlsx)"
        >
          <FileExcelIcon className="w-4 h-4" />
          <span>Unduh Excel (.xlsx)</span>
        </button>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[800px] text-left">
          <thead className="bg-slate-50/50 dark:bg-slate-700/50">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Siswa
              </th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Kelas
              </th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">
                {displayExam?.config?.isOlympiadMode ? "Skor Olimpiade" : "Nilai"}
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
              {displayExam.config.trackLocation &&
                displayExam.config.examMode !== "PR" && (
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">
                    Lokasi
                  </th>
                )}
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {paginatedResults.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    displayExam.config.trackLocation &&
                    displayExam.config.examMode !== "PR"
                      ? 8
                      : 7
                  }
                  className="px-6 py-14 text-center text-sm font-medium text-slate-400 dark:text-slate-500 italic"
                >
                  {searchQuery.trim()
                    ? `Tidak ada siswa yang cocok dengan "${searchQuery.trim()}".`
                    : "Belum ada data siswa."}
                </td>
              </tr>
            ) : (
            paginatedResults.map((r) => {
              const stats = getCalculatedStats(r);
              const { correct, wrong, empty, score } = stats;
              return (
                <React.Fragment key={r.student.studentId}>
                  <tr
                    onClick={() => toggleStudent(r.student.studentId)}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={`transition-transform duration-300 ${expandedStudent === r.student.studentId ? "rotate-180" : ""}`}
                        >
                          <ChevronDownIcon className="w-4 h-4 text-slate-300 dark:text-slate-500 group-hover:text-indigo-500" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-200 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {r.student.fullName}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                            #{r.student.absentNumber}
                          </div>
                          {r.student.schoolName && (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
                              {r.student.schoolName}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                      {r.student.class}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {displayExam?.config?.isOlympiadMode ? (
                        <div className="inline-flex flex-col items-center gap-1">
                          <span
                            className={`text-sm font-black px-2 py-0.5 rounded ${
                              score > 0
                                ? "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30"
                                : score < 0
                                  ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30"
                                  : "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700"
                            }`}
                          >
                            {score} pt
                          </span>
                          {stats.olympiadTier && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${stats.olympiadTier.badgeClass}`}
                            >
                              <span>{stats.olympiadTier.medal}</span>
                              <span>{stats.olympiadTier.label}</span>
                            </span>
                          )}
                        </div>
                      ) : (
                        <span
                          className={`text-sm font-black px-2 py-1 rounded ${
                            score >= 75
                              ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30"
                              : score >= 50
                                ? "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30"
                                : "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30"
                          }`}
                        >
                          {score}
                        </span>
                      )}
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
                      {formatDuration(r.completionTime)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {r.activityLog && r.activityLog.length > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded font-bold text-[10px] border border-amber-100 dark:border-amber-800">
                          {r.activityLog.length} Log
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded border border-emerald-100 dark:border-emerald-800">
                          Aman
                        </span>
                      )}
                    </td>
                    {displayExam.config.trackLocation &&
                      displayExam.config.examMode !== "PR" && (
                        <td className="px-6 py-4 text-center text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {r.location ? (
                            <a
                              href={`https://www.google.com/maps?q=${r.location}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center gap-1"
                            >
                              Maps ↗
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                      )}
                    <td className="px-6 py-4 text-right animate-fade-in whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteResult(
                            r.student.studentId,
                            r.student.fullName,
                          );
                        }}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                        title="Hapus Data Siswa"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  {expandedStudent === r.student.studentId && (
                    <tr className="animate-fade-in bg-slate-50/50 dark:bg-slate-900/50 shadow-inner">
                      <td
                        colSpan={
                          displayExam.config.trackLocation &&
                          displayExam.config.examMode !== "PR"
                            ? 8
                            : 7
                        }
                        className="p-6"
                      >
                        <div className="flex flex-wrap items-center gap-4 mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
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
                          {displayExam.questions.some((q) => q.questionType === "QUESTIONNAIRE") && (
                            <span className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-indigo-500 dark:bg-indigo-600 rounded"></div>{" "}
                              Kuisioner (Non-Skor)
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
                          {displayExam.questions
                            .filter((q) => q.questionType !== "INFO")
                            .map((q, idx) => {
                              const status = checkAnswerStatus(q, r.answers);
                              const isManual =
                                q.questionType === "ESSAY" ||
                                q.questionType === "FILL_IN_THE_BLANK";
                              const isGraded = r.answers[`_grade_${q.id}`];

                              return (
                                <QuestionResultDetailPopover
                                  key={q.id}
                                  question={q}
                                  questionIndex={idx}
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
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 italic mb-4">
                          * Klik nomor soal untuk melihat soal, opsi, kunci jawaban, jawaban siswa, dan pembahasan.
                        </p>

                        {/* MANUAL GRADING UI (ONLY ESSAY & FILL_IN_THE_BLANK) */}
                        {displayExam.questions.some(
                          (q) =>
                            q.questionType === "ESSAY" ||
                            q.questionType === "FILL_IN_THE_BLANK",
                        ) && (
                          <div className="mb-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                            <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
                              Detail Jawaban & Koreksi Manual
                            </h4>
                            <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                              {displayExam.questions
                                .filter((q) => q.questionType !== "INFO")
                                .map((q, idx) => {
                                  if (
                                    q.questionType !== "ESSAY" &&
                                    q.questionType !== "FILL_IN_THE_BLANK"
                                  )
                                    return null;

                                  const ans = r.answers[q.id];
                                  const manualStatus =
                                    r.answers[`_grade_${q.id}`];
                                  const systemStatus = checkAnswerStatus(
                                    q,
                                    r.answers,
                                  );

                                  return (
                                    <div
                                      key={q.id}
                                      className="text-sm border-b border-slate-100 dark:border-slate-700 pb-3 last:border-0"
                                    >
                                      <div className="flex justify-between items-start mb-1">
                                        <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-700 text-slate-500 rounded px-1.5 py-0.5">
                                          #{idx + 1}
                                        </span>
                                        <span
                                          className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${systemStatus === "CORRECT" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : systemStatus === "WRONG" ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"}`}
                                        >
                                          {systemStatus === "CORRECT"
                                            ? "Benar"
                                            : systemStatus === "WRONG"
                                              ? "Salah"
                                              : "Kosong"}
                                        </span>
                                      </div>
                                      <div
                                        className="font-bold text-slate-700 dark:text-slate-200 mb-1 line-clamp-2 prose prose-sm dark:prose-invert max-w-none"
                                        dangerouslySetInnerHTML={{
                                          __html: q.questionText,
                                        }}
                                      ></div>
                                      <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded text-slate-600 dark:text-slate-300 italic mb-2 break-words text-xs">
                                        {ans || (
                                          <span className="text-slate-400">
                                            Tidak menjawab
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex gap-2 justify-end">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            rateQuestion(r, q.id, true);
                                          }}
                                          className={`px-3 py-1 text-xs font-bold rounded border flex items-center gap-1 ${manualStatus === "CORRECT" ? "bg-emerald-100 border-emerald-500 text-emerald-700" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
                                        >
                                          <CheckCircleIcon className="w-3 h-3" />{" "}
                                          Benar
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            rateQuestion(r, q.id, false);
                                          }}
                                          className={`px-3 py-1 text-xs font-bold rounded border flex items-center gap-1 ${manualStatus === "WRONG" ? "bg-rose-100 border-rose-500 text-rose-700" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
                                        >
                                          <XMarkIcon className="w-3 h-3" />{" "}
                                          Salah
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}

                        {r.activityLog && r.activityLog.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <h4 className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-500 mb-2 flex items-center gap-2">
                              <ExclamationTriangleIcon className="w-3 h-3" />{" "}
                              Riwayat Aktivitas & Kecurangan
                            </h4>
                            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc pl-4 font-mono bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                              {r.activityLog.map((log, i) => (
                                <li key={i}>{log}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/70 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold text-slate-400">
            Halaman {safeCurrentPage} dari {totalPages} ({totalFilteredCount} siswa)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
              disabled={safeCurrentPage <= 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Sebelumnya
            </button>
            <button
              type="button"
              onClick={() =>
                setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))
              }
              disabled={safeCurrentPage >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
