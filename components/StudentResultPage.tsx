import React, { useMemo, useState, useEffect } from "react";
import type { Result, Exam } from "../types";
import {
  CheckCircleIcon,
  LockClosedIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SunIcon,
  MoonIcon,
  ChartBarIcon,
  ArrowPathIcon,
  SparklesIcon,
} from "./Icons";
import { storageService } from "../services/storage";
import {
  analyzeStudentPerformance,
  parseList,
  analyzeQuestionTypePerformance,
  sanitizeHtml,
  normalize,
  isAnswerMatch,
  calculateExamScore,
} from "./teacher/examUtils";
import { QRCodeCanvas } from "qrcode.react";
import { ChartRenderer } from "./ChartRenderer";
import type { ChartData } from "../types";
import { UnlockScreen } from "./student/result/UnlockScreen";
import { CompletedClosedScreen } from "./student/result/CompletedClosedScreen";
import { AnalysisCards } from "./student/result/AnalysisCards";
import { ReviewSection } from "./student/result/ReviewSection";
import { StudentFeedbackModal } from "./student/result/StudentFeedbackModal";
import { checkAnswerStatus } from "./teacher/archive/archiveUtils";
import { QuestionResultDetailPopover } from "./QuestionResultDetailPopover";
import { examService } from "../services/exam";
import type { Question } from "../types";

interface StudentResultPageProps {
  result: Result;
  exam: Exam;
  onFinish: () => void;
  onResume?: () => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
}

export const StudentResultPage: React.FC<StudentResultPageProps> = ({
  result,
  exam,
  onFinish,
  onResume,
  isDarkMode,
  toggleTheme,
}) => {
  const config = exam.config;
  const [expandedReview, setExpandedReview] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [enrichedQuestions, setEnrichedQuestions] = useState<Question[]>(exam.questions);

  // Fetch authorized solution package if teacher permitted review
  useEffect(() => {
    setEnrichedQuestions(exam.questions);
    const shouldFetchSolutions = Boolean(
      config.showCorrectAnswer || config.showHints || config.showSolutionSteps || config.showResultToStudent
    );
    if (shouldFetchSolutions && (result.status === "completed" || result.status === "force_closed")) {
      examService.getExamSolutions(exam.code, result.student.studentId).then((solutionsMap) => {
        if (solutionsMap) {
          setEnrichedQuestions((prev) =>
            prev.map((q) => {
              const sol = solutionsMap[q.id];
              if (!sol) return q;
              return {
                ...q,
                correctAnswer: sol.correctAnswer ?? q.correctAnswer,
                explanation: sol.explanation ?? q.explanation,
                solutionSteps: sol.solutionSteps ?? q.solutionSteps,
                matchingPairs: sol.matchingPairs ?? q.matchingPairs,
                trueFalseRows: sol.trueFalseRows ?? q.trueFalseRows,
              };
            })
          );
        }
      });
    }
  }, [exam.code, exam.questions, result.student.studentId, result.status, config]);

  const enrichedExam = useMemo(() => ({ ...exam, questions: enrichedQuestions }), [exam, enrichedQuestions]);

  // Scroll to top on mount and trigger feedback modal for completed exam
  useEffect(() => {
    window.scrollTo(0, 0);

    if (result.status === "completed" || result.status === "force_closed") {
      try {
        const alreadySubmitted = localStorage.getItem(
          `feedback_submitted_${exam.code}_${result.student.studentId}`,
        );
        if (!alreadySubmitted) {
          const timer = setTimeout(() => {
            setShowFeedbackModal(true);
          }, 700);
          return () => clearTimeout(timer);
        }
      } catch {
        /* ignore */
      }
    }
  }, [exam.code, result.student.studentId, result.status]);

  // Unlock State for Force Closed View
  const [unlockToken, setUnlockToken] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = unlockToken.trim();

    // Validasi 4 Digit
    if (!cleanToken || cleanToken.length !== 4) {
      setUnlockError("Token harus 4 angka.");
      return;
    }

    setIsUnlocking(true);
    setUnlockError("");

    try {
      const success = await storageService.verifyUnlockToken(
        exam.code,
        result.student.studentId,
        cleanToken,
      );
      if (success) {
        if (onResume) {
          onResume();
        } else {
          // Fallback if no resume handler provided
          window.location.reload();
        }
      } else {
        setUnlockError("Token salah atau kadaluarsa.");
        setIsUnlocking(false); // Stop loading only if failed
      }
    } catch {
      setUnlockError("Gagal verifikasi. Cek koneksi.");
      setIsUnlocking(false);
    }
  };

  const handleDownloadCertificate = async () => {
    setIsUnlocking(true); // Reusing as loading indicator
    try {
      const certConfig = exam.config.certificateSettings || {
        enabled: true,
        backgroundUrl: "",
      };
      const examDateStr =
        exam.config.startDate ||
        exam.config.date ||
        exam.createdAt ||
        new Date().toISOString();

      // Wait for dynamic import inside the function to keep it clean
      const { downloadCertificateAsPdf } =
        await import("../utils/certificateExport");

      const displayScore =
        result.status === "completed" || result.status === "force_closed"
          ? result.score === 0 &&
            hasAutoGradable &&
            (calculatedStats?.calculatedScore || 0) > 0
            ? calculatedStats?.calculatedScore || 0
            : result.score
          : 0;

      const qrLink = `${window.location.origin}/result/${encodeURIComponent(exam.code)}/${encodeURIComponent(result.student.studentId)}`;
      const verifyCode = result.id
        ? result.id.toString(16).toUpperCase().padStart(5, "0")
        : "0X98A";

      await downloadCertificateAsPdf(
        [
          {
            studentName: result.student.fullName,
            score: displayScore,
            qrLink,
            verifyCode,
          },
        ],
        exam.config.examType || "Ujian",
        exam.config.subject || "Mata Pelajaran",
        exam.config.classLevel || result.student.class || "-",
        examDateStr,
        certConfig,
        `Sertifikat_${exam.code}_${result.student.fullName}.pdf`,
        exam.authorSchool
      );
    } catch (error) {
      console.error("Gagal mencetak PDF", error);
      alert("Terjadi kesalahan saat mengunduh sertifikat.");
    } finally {
      setIsUnlocking(false);
    }
  };

  // REAL-TIME CALCULATION LOGIC
  const calculatedStats = useMemo(() => {
    const grading = calculateExamScore(exam, result.answers || {});
    const isOlympiad = !!exam.config?.isOlympiadMode;
    return {
      score: result.score, // Use the score from the database
      calculatedScore: grading.score, // Keep calculated score for discrepancy check
      correctAnswers: result.correctAnswers ?? grading.correctAnswers,
      wrongAnswers: grading.wrongAnswers ?? (grading.totalQuestions - grading.correctAnswers - (grading.unansweredQuestions || 0)),
      unansweredQuestions: grading.unansweredQuestions ?? 0,
      totalQuestions: result.totalQuestions ?? grading.totalQuestions,
      maxScore: grading.maxScore,
      minScore: grading.minScore,
      isOlympiadMode: isOlympiad,
      correctScore: grading.correctScore,
      wrongPenalty: grading.wrongPenalty,
      emptyScore: grading.emptyScore,
      olympiadScoring: grading.olympiadScoring,
      olympiadTier: grading.olympiadTier,
      hasDiscrepancy: typeof result.score === "number" && grading.score !== result.score,
    };
  }, [
    exam,
    result.answers,
    result.score,
    result.correctAnswers,
    result.totalQuestions,
  ]);

  // NEW: Analytical Data for Diagnostic Card
  const analysisData = useMemo(
    () => analyzeStudentPerformance(exam, result),
    [exam, result],
  );
  const questionTypeStats = useMemo(
    () => analyzeQuestionTypePerformance(exam, result),
    [exam, result],
  );

  // Check if we are waiting for server-side score calculation
  const hasAutoGradable = useMemo(
    () =>
      exam.questions.some(
        (q) => q.questionType !== "INFO" && q.questionType !== "ESSAY",
      ),
    [exam.questions],
  );
  const isWaitingForServer = useMemo(() => {
    // 1. If status is not completed/force_closed, we are definitely waiting
    if (result.status === "in_progress") return true;

    // 2. If score is 0 but we have auto-gradable questions and calculated score is > 0, we are definitely waiting for the server to update the score field.
    // BUT ONLY if the status is NOT completed. If it's completed, the server has finished its job (even if it falsely evaluated to 0).
    if (
      result.status !== "completed" &&
      result.status !== "force_closed" &&
      result.score === 0 &&
      hasAutoGradable &&
      (calculatedStats?.calculatedScore || 0) > 0
    )
      return true;

    // 3. If totalQuestions is 0 but exam has scorable questions, it means the server hasn't processed the result yet.
    const scorableCount = exam.questions.filter(
      (q) => q.questionType !== "INFO",
    ).length;
    if (
      result.totalQuestions === 0 &&
      scorableCount > 0 &&
      result.status !== "completed" &&
      result.status !== "force_closed"
    )
      return true;

    return false;
  }, [
    result.score,
    result.status,
    result.totalQuestions,
    hasAutoGradable,
    calculatedStats?.calculatedScore,
    exam.questions,
  ]);

  const isPR = (config.examMode || "").trim().toUpperCase() === "PR";

  if (result.status === "force_closed" && !isPR) {
    return (
      <UnlockScreen
        unlockToken={unlockToken}
        setUnlockToken={setUnlockToken}
        unlockError={unlockError}
        isUnlocking={isUnlocking}
        handleUnlockSubmit={handleUnlockSubmit}
        onFinish={onFinish}
      />
    );
  }

  if (!exam || !result) {
    return <CompletedClosedScreen onFinish={onFinish} />;
  }

  const showResult = config.showResultToStudent;

  const isOlympiad = !!config.isOlympiadMode;

  // REAL-TIME FALLBACK & RPC BUGFIX:
  // If server score is 0 but client calculated > 0, use client score for display (happens on outdated RPCs when submitting MATCHING logic)
  const displayScore =
    typeof result.score === "number" && (isOlympiad ? !isNaN(result.score) : result.score > 0)
      ? result.score
      : calculatedStats.calculatedScore;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-slate-950 p-6 font-sans relative overflow-hidden transition-colors duration-300">
      {/* Theme Toggle Top Right */}
      {toggleTheme && (
        <div className="absolute top-6 right-6 z-50">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-md text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm border border-white/20 dark:border-slate-700"
          >
            {isDarkMode ? (
              <SunIcon className="w-5 h-5" />
            ) : (
              <MoonIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      )}

      {/* Elegant Discrepancy Notification - REMOVED AS REQUESTED */}

      <div
        className={`w-full ${expandedReview ? "max-w-full" : "max-w-5xl"} text-center animate-gentle-slide transition-all duration-500 relative z-10`}
      >
        <div className="bg-white dark:bg-slate-900 p-5 md:p-8 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] dark:shadow-black/30 border border-white dark:border-slate-800 relative overflow-hidden">
          {/* Background decoration */}
          <div className={`absolute top-0 left-0 w-full h-2 ${isOlympiad ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-emerald-400 to-teal-500'}`}></div>

          <div className="mb-6">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 shadow-sm ${
              isOlympiad
                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-500 dark:text-amber-400 ring-4 ring-amber-50/50 dark:ring-amber-900/10'
                : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 dark:text-emerald-400 ring-4 ring-emerald-50/50 dark:ring-emerald-900/10'
            }`}>
              <CheckCircleIcon className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">
              {isOlympiad ? "Ujian Olimpiade Selesai" : "Ujian Selesai"}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Jawaban Anda telah berhasil disimpan.
            </p>
          </div>

          {showResult ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* SCORE CARD */}
                <div className={`lg:col-span-3 py-6 relative rounded-3xl border flex flex-col items-center justify-center ${
                  isOlympiad
                    ? 'bg-amber-50/30 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-800/30'
                    : 'bg-emerald-50/30 dark:bg-emerald-900/10 border-emerald-100/50 dark:border-emerald-800/30'
                }`}>
                  {isWaitingForServer ? (
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="relative">
                        <ArrowPathIcon className="w-10 h-10 text-emerald-500 animate-spin" />
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-emerald-600">
                          ...
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-emerald-600 animate-pulse">
                        Menghitung...
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className={`font-black tracking-tighter ${isOlympiad ? "text-4xl sm:text-5xl" : "text-5xl"} text-slate-800 dark:text-slate-100`}>
                          {displayScore}
                        </span>
                        {isOlympiad && calculatedStats.maxScore !== undefined && (
                          <span className="text-sm sm:text-base font-bold text-slate-400 dark:text-slate-500">
                            / {calculatedStats.maxScore} pt
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 block">
                        {isOlympiad ? "Skor Olimpiade" : "Nilai Akhir"}
                      </span>

                      {/* OLYMPIAD MEDAL BADGE IN SCORE CARD */}
                      {isOlympiad && calculatedStats.olympiadTier && (
                        <div className="mt-2.5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border shadow-sm ${calculatedStats.olympiadTier.badgeClass}`}>
                            <span>{calculatedStats.olympiadTier.medal}</span>
                            <span>{calculatedStats.olympiadTier.label}</span>
                          </span>
                        </div>
                      )}

                      {isOlympiad ? (
                        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-mono font-bold">
                          <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800" title="Benar">
                            B: {calculatedStats.correctAnswers} (+{calculatedStats.correctScore} pt)
                          </span>
                          <span className="text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800" title="Salah (Penalti)">
                            S: {calculatedStats.wrongAnswers} ({calculatedStats.wrongPenalty} pt)
                          </span>
                          <span className="text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700" title="Kosong">
                            K: {calculatedStats.unansweredQuestions} (0 pt)
                          </span>
                        </div>
                      ) : null}
                      {calculatedStats.hasDiscrepancy &&
                        !isWaitingForServer && (
                          <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                          </span>
                        )}
                    </>
                  )}
                </div>

                {/* STUDENT & EXAM DETAILS CARD */}
                <div className="lg:col-span-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 text-left flex flex-col justify-center">
                  <h3 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 pb-2 mb-3">
                    Informasi Peserta
                  </h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[11px]">
                    <div className="col-span-2 md:col-span-1">
                      <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase tracking-tighter">
                        Nama Sekolah
                      </p>
                      <p className="font-bold text-slate-700 dark:text-slate-200 uppercase truncate leading-tight">
                        {result.student.schoolName || exam.authorSchool || "-"}
                      </p>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase tracking-tighter">
                        Nama Siswa
                      </p>
                      <p className="font-bold text-slate-700 dark:text-slate-200 uppercase truncate leading-tight">
                        {result.student.fullName}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase tracking-tighter">
                        Kelas / No
                      </p>
                      <p className="font-bold text-slate-700 dark:text-slate-200 uppercase leading-tight">
                        {result.student.class} / {result.student.absentNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase tracking-tighter">
                        Mata Pelajaran
                      </p>
                      <p className="font-bold text-slate-700 dark:text-slate-200 uppercase truncate leading-tight">
                        {exam.config.subject}
                      </p>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase tracking-tighter">
                        Jenis Evaluasi
                      </p>
                      <p className="font-bold text-slate-700 dark:text-slate-200 uppercase truncate leading-tight">
                        {exam.config.examType}
                      </p>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase tracking-tighter">
                        Waktu Pengerjaan
                      </p>
                      <p className="font-bold text-slate-700 dark:text-slate-200 uppercase truncate leading-tight">
                        {result.completionTime !== undefined &&
                        result.completionTime !== null
                          ? `${Math.floor(result.completionTime / 60)} menit ${result.completionTime % 60} detik`
                          : "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* QR CODE SECTION */}
                <div className="lg:col-span-3 flex flex-col items-center justify-center p-5 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <div className="p-2.5 bg-white rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-3">
                    <QRCodeCanvas
                      value={`${window.location.origin}/result/${exam.code}/${encodeURIComponent(result.student.studentId)}`}
                      size={160}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold text-center leading-tight uppercase tracking-tighter">
                    Pindai Hasil
                  </p>
                </div>
              </div>

              <AnalysisCards
                analysisData={analysisData}
                questionTypeStats={questionTypeStats}
                isOlympiadMode={isOlympiad}
                olympiadTier={calculatedStats.olympiadTier}
                score={displayScore}
                maxScore={calculatedStats.maxScore}
              />

              {/* PALET NOMOR SOAL & DETAIL HASIL SISWA (Hanya ditampilkan jika guru mengizinkan pembahasan/kunci) */}
              {(config.showCorrectAnswer || config.showHints || config.showSolutionSteps) && (
                <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
                    <div>
                      <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <SparklesIcon className="w-4 h-4 text-indigo-500" />
                        <span>Rincian Hasil Pengerjaan Soal</span>
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Arahkan kursor atau ketuk nomor soal untuk melihat pertanyaan, jawaban Anda, kunci yang benar, serta pembahasannya.
                      </p>
                    </div>
                    {/* Legend */}
                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-600 dark:text-slate-400 shrink-0">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Benar
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span> Salah
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600"></span> Kosong
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {enrichedQuestions
                      .filter((q) => q.questionType !== "INFO")
                      .map((q, idx) => {
                        const status = checkAnswerStatus(q, result.answers || {});
                        const isManual =
                          q.questionType === "ESSAY" ||
                          q.questionType === "FILL_IN_THE_BLANK";
                        const isGraded = result.answers?.[`_grade_${q.id}`];
                        return (
                          <QuestionResultDetailPopover
                            key={q.id}
                            question={q}
                            questionIndex={idx}
                            answers={result.answers || {}}
                            status={status}
                            isManual={isManual}
                            isGraded={isGraded}
                            showCorrectAnswer={Boolean(config.showCorrectAnswer)}
                            showSolutionSteps={Boolean(config.showSolutionSteps || config.showHints)}
                            size="md"
                          />
                        );
                      })}
                  </div>
                </div>
              )}

              <div className="flex flex-col md:flex-row items-center justify-end gap-6 border-t border-slate-50 dark:border-slate-800 pt-6">
                {config.enableCertificate && (
                  <button
                    onClick={handleDownloadCertificate}
                    className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 hover:text-white hover:bg-emerald-600 dark:hover:bg-emerald-500 px-6 py-3 rounded-2xl transition-all inline-flex items-center gap-2 border-2 border-emerald-100 dark:border-emerald-900/30"
                  >
                    <SparklesIcon className="w-3.5 h-3.5" /> Unduh Sertifikat
                  </button>
                )}

                {(config.showCorrectAnswer || config.showHints || config.showSolutionSteps) && (
                  <button
                    onClick={() => setExpandedReview(!expandedReview)}
                    className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 px-6 py-3 rounded-2xl transition-all inline-flex items-center gap-2 border-2 border-indigo-100 dark:border-indigo-900/30"
                  >
                    {expandedReview ? "Tutup Pembahasan" : "Lihat Pembahasan"}
                    {expandedReview ? (
                      <ChevronUpIcon className="w-3 h-3" />
                    ) : (
                      <ChevronDownIcon className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>

              {expandedReview && <ReviewSection exam={enrichedExam} result={result} />}
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700">
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                Menunggu pengumuman nilai dari pengajar.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3 mt-8">
            <button
              onClick={() => setShowFeedbackModal(true)}
              type="button"
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-xs font-bold transition-all inline-flex items-center justify-center gap-2"
            >
              <span>⭐</span>
              <span>Beri Penilaian & Saran</span>
            </button>

            <button
              onClick={onFinish}
              className="w-full flex-1 bg-slate-900 dark:bg-indigo-600 text-white font-bold py-3.5 px-6 rounded-2xl hover:bg-black dark:hover:bg-indigo-700 transition-all shadow-lg shadow-slate-200 dark:shadow-indigo-900/30 active:scale-[0.98] text-xs uppercase tracking-widest"
            >
              Tutup Halaman
            </button>
          </div>
        </div>
      </div>

      {/* FEEDBACK MODAL POPUP */}
      {showFeedbackModal && (
        <StudentFeedbackModal
          examCode={exam.code}
          studentName={result.student.fullName}
          studentId={result.student.studentId}
          schoolName={result.student.schoolName || exam.authorSchool}
          onClose={() => setShowFeedbackModal(false)}
        />
      )}
    </div>
  );
};
