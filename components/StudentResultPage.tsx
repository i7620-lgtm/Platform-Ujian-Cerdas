import React, { useMemo, useState, useEffect, useCallback } from "react";
import type { Result, Exam, Question } from "../types";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SunIcon,
  MoonIcon,
  ArrowPathIcon,
  SparklesIcon,
} from "./Icons";
import { storageService } from "../services/storage";
import {
  analyzeStudentPerformance,
  analyzeQuestionTypePerformance,
  calculateExamScore,
} from "./teacher/examUtils";
import { QRCodeCanvas } from "qrcode.react";
import { UnlockScreen } from "./student/result/UnlockScreen";
import { CompletedClosedScreen } from "./student/result/CompletedClosedScreen";
import { AnalysisCards } from "./student/result/AnalysisCards";
import { ReviewSection } from "./student/result/ReviewSection";
import { StudentFeedbackModal } from "./student/result/StudentFeedbackModal";
import { StudentDialogModal } from "./student/StudentDialogModal";
import { checkAnswerStatus } from "./teacher/archive/archiveUtils";
import { QuestionResultDetailPopover } from "./QuestionResultDetailPopover";
import { examService } from "../services/exam";

interface StudentResultPageProps {
  result: Result;
  exam: Exam;
  onFinish: () => void;
  onResume?: () => void;
  onResultUpdated?: (updated: Result) => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
}

export const StudentResultPage: React.FC<StudentResultPageProps> = ({
  result,
  exam,
  onFinish,
  onResume,
  onResultUpdated,
  isDarkMode,
  toggleTheme,
}) => {
  const [currentExam, setCurrentExam] = useState<Exam>(exam);
  const [currentResult, setCurrentResult] = useState<Result>(result);
  const config = currentExam.config;
  const [expandedReview, setExpandedReview] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [certErrorMsg, setCertErrorMsg] = useState<string | null>(null);
  const [enrichedQuestions, setEnrichedQuestions] = useState<Question[]>(exam.questions);

  const [hasQueuedPending, setHasQueuedPending] = useState<boolean>(() =>
    result.isSynced === false || storageService.hasPendingSubmission(exam.code, result.student.studentId),
  );
  const [isCheckingSync, setIsCheckingSync] = useState(false);
  const [syncCheckNotice, setSyncCheckNotice] = useState<{
    type: "info" | "success" | "warning";
    text: string;
  } | null>(null);

  useEffect(() => {
    setCurrentExam(exam);
  }, [exam]);

  useEffect(() => {
    setCurrentResult(result);
    setHasQueuedPending(
      result.isSynced === false || storageService.hasPendingSubmission(exam.code, result.student.studentId),
    );
  }, [result, exam.code]);

  // Fetch authorized solution package if teacher permitted review & server grading completed
  useEffect(() => {
    setEnrichedQuestions(currentExam.questions);
    const shouldFetchSolutions = Boolean(
      config.showCorrectAnswer || config.showHints || config.showSolutionSteps || config.showResultToStudent,
    );
    if (
      shouldFetchSolutions &&
      !hasQueuedPending &&
      (currentResult.status === "completed" || currentResult.status === "force_closed")
    ) {
      let localDeviceId = "";
      try {
        localDeviceId = localStorage.getItem("deviceId") || "";
      } catch {
        /* ignore */
      }
      const proof = {
        deviceId: currentResult.device_id || currentResult.answers?._deviceId || localDeviceId || undefined,
        resultId: currentResult.id ?? currentResult.student.resultId,
      };
      examService.getExamSolutions(currentExam.code, currentResult.student.studentId, undefined, proof).then((solutionsMap) => {
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
            }),
          );
        }
      });
    }
  }, [
    currentExam.code,
    currentExam.questions,
    currentResult.student.studentId,
    currentResult.status,
    currentResult.id,
    currentResult.student.resultId,
    currentResult.device_id,
    currentResult.answers,
    hasQueuedPending,
    config,
  ]);

  const enrichedExam = useMemo(
    () => ({ ...currentExam, questions: enrichedQuestions }),
    [currentExam, enrichedQuestions],
  );

  // Scroll to top on mount and trigger feedback modal once exam is synced/completed
  useEffect(() => {
    window.scrollTo(0, 0);

    if (!hasQueuedPending && (currentResult.status === "completed" || currentResult.status === "force_closed")) {
      try {
        const alreadySubmitted = localStorage.getItem(
          `feedback_submitted_${currentExam.code}_${currentResult.student.studentId}`,
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
  }, [currentExam.code, currentResult.student.studentId, currentResult.status, hasQueuedPending]);

  const handleCheckSyncAndReload = useCallback(async () => {
    if (isCheckingSync) return;
    setIsCheckingSync(true);
    setSyncCheckNotice(null);

    try {
      const flushed = await storageService.retryQueuedSubmission(
        currentExam.code,
        currentResult.student.studentId,
      );
      const { result: latest, isNetworkError } = await storageService.getStudentResultStatus(
        currentExam.code,
        currentResult.student.studentId,
      );
      const stillPending = storageService.hasPendingSubmission(
        currentExam.code,
        currentResult.student.studentId,
      );

      if (latest && (latest.status === "completed" || latest.status === "force_closed") && !stillPending) {
        try {
          const refreshedExam = await examService.getExamForStudent(
            currentExam.code,
            currentResult.student.studentId,
            false,
          );
          if (refreshedExam) setCurrentExam(refreshedExam);
        } catch {
          /* ignore */
        }
        const verifiedResult: Result = { ...latest, isSynced: true };
        setCurrentResult(verifiedResult);
        setHasQueuedPending(false);
        onResultUpdated?.(verifiedResult);
        setSyncCheckNotice({
          type: "success",
          text: "Submit berhasil terverifikasi dan dinilai oleh server.",
        });
      } else if (isNetworkError || (typeof navigator !== "undefined" && navigator.onLine === false)) {
        setHasQueuedPending(true);
        setSyncCheckNotice({
          type: "warning",
          text: "Koneksi ke server belum stabil. Jawaban mentah Anda tetap aman di antrean otomatis—coba muat ulang saat internet kembali lancar.",
        });
      } else if (!flushed || stillPending) {
        setHasQueuedPending(true);
        setSyncCheckNotice({
          type: "info",
          text: "Layanan penilaian server belum merespons. Jawaban mentah Anda tetap aman dan akan dicoba kirim ulang otomatis.",
        });
      } else if (latest) {
        setHasQueuedPending(true);
        setSyncCheckNotice({
          type: "info",
          text: "Jawaban mentah tercatat di server dan masih menunggu penyelesaian status penilaian. Tekan tombol ini lagi beberapa saat lagi.",
        });
      } else {
        setHasQueuedPending(true);
        setSyncCheckNotice({
          type: "warning",
          text: "Status submit belum terbaca di server. Sistem akan terus mencoba sinkronisasi ulang otomatis.",
        });
      }
    } catch {
      setSyncCheckNotice({
        type: "warning",
        text: "Gagal memeriksa status server. Periksa koneksi internet Anda lalu coba lagi.",
      });
    } finally {
      setIsCheckingSync(false);
    }
  }, [isCheckingSync, currentExam.code, currentResult.student.studentId, onResultUpdated]);

  // Auto-check server status as soon as browser returns online while pending sync
  useEffect(() => {
    if (!hasQueuedPending || typeof window === "undefined") return;
    const onOnline = () => {
      handleCheckSyncAndReload();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [hasQueuedPending, handleCheckSyncAndReload]);

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
      let deviceId = "";
      try {
        deviceId =
          localStorage.getItem("deviceId") ||
          `${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
        localStorage.setItem("deviceId", deviceId);
      } catch {
        /* ignore */
      }

      const success = await storageService.verifyUnlockToken(
        currentExam.code,
        currentResult.student.studentId,
        cleanToken,
        deviceId || undefined,
      );
      if (success) {
        if (onResume) {
          onResume();
        } else {
          window.location.reload();
        }
      } else {
        setUnlockError("Token tidak valid. Periksa kembali 4 angka token dari pengawas.");
        setIsUnlocking(false);
      }
    } catch {
      setUnlockError("Gagal verifikasi. Cek koneksi.");
      setIsUnlocking(false);
    }
  };

  // Diagnostics & metadata helper (scoring authority always comes from currentResult.score)
  const calculatedStats = useMemo(() => {
    const grading = calculateExamScore(enrichedExam, currentResult.answers || {});
    const isOlympiad = !!enrichedExam.config?.isOlympiadMode;
    return {
      score: currentResult.score,
      correctAnswers: currentResult.correctAnswers ?? grading.correctAnswers,
      wrongAnswers:
        currentResult.wrongAnswers ??
        grading.wrongAnswers ??
        grading.totalQuestions - grading.correctAnswers - (grading.unansweredQuestions || 0),
      unansweredQuestions: currentResult.unansweredQuestions ?? grading.unansweredQuestions ?? 0,
      totalQuestions: currentResult.totalQuestions || grading.totalQuestions,
      maxScore: currentResult.maxScore ?? grading.maxScore,
      minScore: currentResult.minScore ?? grading.minScore,
      isOlympiadMode: isOlympiad,
      correctScore: grading.correctScore,
      wrongPenalty: grading.wrongPenalty,
      emptyScore: grading.emptyScore,
      olympiadScoring: grading.olympiadScoring,
      olympiadTier: grading.olympiadTier,
    };
  }, [
    enrichedExam,
    currentResult.answers,
    currentResult.score,
    currentResult.correctAnswers,
    currentResult.wrongAnswers,
    currentResult.unansweredQuestions,
    currentResult.totalQuestions,
    currentResult.maxScore,
    currentResult.minScore,
  ]);

  const analysisData = useMemo(
    () => analyzeStudentPerformance(enrichedExam, currentResult),
    [enrichedExam, currentResult],
  );
  const questionTypeStats = useMemo(
    () => analyzeQuestionTypePerformance(enrichedExam, currentResult),
    [enrichedExam, currentResult],
  );

  // Zero-Trust: waiting if queued/unsynced OR DB status is not completed/force_closed
  const isWaitingForServer = useMemo(() => {
    if (hasQueuedPending || currentResult.isSynced === false) return true;
    if (currentResult.status === "in_progress" || currentResult.status === "pending_grading") return true;
    return false;
  }, [hasQueuedPending, currentResult.isSynced, currentResult.status]);

  const handleDownloadCertificate = async () => {
    if (isWaitingForServer) return;
    setIsUnlocking(true);
    try {
      const certConfig = currentExam.config.certificateSettings || {
        enabled: true,
        backgroundUrl: "",
      };
      const examDateStr =
        currentExam.config.startDate ||
        currentExam.config.date ||
        currentExam.createdAt ||
        new Date().toISOString();

      const { downloadCertificateAsPdf } = await import("../utils/certificateExport");

      const certScore =
        (currentResult.status === "completed" || currentResult.status === "force_closed") &&
        typeof currentResult.score === "number" &&
        !isNaN(currentResult.score) &&
        !isWaitingForServer
          ? currentResult.score
          : 0;

      const qrLink = `${window.location.origin}/result/${encodeURIComponent(currentExam.code)}/${encodeURIComponent(currentResult.student.studentId)}`;
      const verifyCode = currentResult.id
        ? currentResult.id.toString(16).toUpperCase().padStart(5, "0")
        : "0X98A";

      await downloadCertificateAsPdf(
        [
          {
            studentName: currentResult.student.fullName,
            score: certScore,
            qrLink,
            verifyCode,
          },
        ],
        currentExam.config.examType || "Ujian",
        currentExam.config.subject || "Mata Pelajaran",
        currentExam.config.classLevel || currentResult.student.class || "-",
        examDateStr,
        certConfig,
        `Sertifikat_${currentExam.code}_${currentResult.student.fullName}.pdf`,
        currentExam.authorSchool,
      );
    } catch (error) {
      console.error("Gagal mencetak PDF", error);
      setCertErrorMsg("Terjadi kesalahan saat mengunduh sertifikat PDF. Silakan coba beberapa saat lagi.");
    } finally {
      setIsUnlocking(false);
    }
  };

  const isPR = (config.examMode || "").trim().toUpperCase() === "PR";

  if (currentResult.status === "force_closed" && !isPR) {
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

  if (!currentExam || !currentResult) {
    return <CompletedClosedScreen onFinish={onFinish} />;
  }

  const showResult = config.showResultToStudent;
  const isOlympiad = !!config.isOlympiadMode;

  // Strict Zero-Trust: display ONLY authoritative score from server (never client-calculated fallback)
  const displayScore =
    !isWaitingForServer &&
    (currentResult.status === "completed" || currentResult.status === "force_closed") &&
    typeof currentResult.score === "number" &&
    !isNaN(currentResult.score)
      ? currentResult.score
      : 0;

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

      <div
        className={`w-full ${expandedReview ? "max-w-full" : "max-w-5xl"} text-center animate-gentle-slide transition-all duration-500 relative z-10`}
      >
        <div className="bg-white dark:bg-slate-900 p-5 md:p-8 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] dark:shadow-black/30 border border-white dark:border-slate-800 relative overflow-hidden">
          {/* Background decoration */}
          <div
            className={`absolute top-0 left-0 w-full h-2 ${
              isWaitingForServer
                ? "bg-gradient-to-r from-amber-400 to-orange-500"
                : isOlympiad
                  ? "bg-gradient-to-r from-amber-400 to-orange-500"
                  : "bg-gradient-to-r from-emerald-400 to-teal-500"
            }`}
          ></div>

          <div className="mb-6">
            <div
              className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 shadow-sm ${
                isWaitingForServer
                  ? "bg-amber-50 dark:bg-amber-900/20 text-amber-500 dark:text-amber-400 ring-4 ring-amber-50/50 dark:ring-amber-900/10"
                  : isOlympiad
                    ? "bg-amber-50 dark:bg-amber-900/20 text-amber-500 dark:text-amber-400 ring-4 ring-amber-50/50 dark:ring-amber-900/10"
                    : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 dark:text-emerald-400 ring-4 ring-emerald-50/50 dark:ring-emerald-900/10"
              }`}
            >
              {isWaitingForServer ? (
                <ArrowPathIcon className={`w-8 h-8 ${isCheckingSync ? "animate-spin" : ""}`} />
              ) : (
                <CheckCircleIcon className="w-8 h-8" />
              )}
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">
              {isWaitingForServer
                ? "Jawaban Disimpan — Menunggu Verifikasi Server"
                : isOlympiad
                  ? "Ujian Olimpiade Selesai"
                  : "Ujian Selesai"}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {isWaitingForServer
                ? "Jawaban mentah Anda telah diamankan di perangkat dan antrean sinkronisasi otomatis."
                : "Jawaban Anda telah berhasil disimpan dan dinilai oleh server."}
            </p>
          </div>

          {/* BANNER STATUS PENDAFTARAN & PENILAIAN TERTUNDA (KETIKA RPC GAGAL SEMENTARA / OFFLINE) */}
          {isWaitingForServer && (
            <div className="mb-6 rounded-3xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/30 p-5 text-left">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <p className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Submit Dalam Antrean Penilaian Server
                  </p>
                  <p className="text-xs text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
                    Sistem belum menerima konfirmasi penilaian akhir dari server. Jawaban mentah Anda aman tersimpan tanpa menghitung nilai di perangkat, dan sistem akan mencoba mengirim ulang secara otomatis. Tekan tombol di samping untuk memeriksa apakah submit sudah berhasil diproses server.
                  </p>
                  {syncCheckNotice && (
                    <p
                      className={`text-xs font-bold pt-1 ${
                        syncCheckNotice.type === "success"
                          ? "text-emerald-700 dark:text-emerald-300"
                          : syncCheckNotice.type === "warning"
                            ? "text-rose-700 dark:text-rose-300"
                            : "text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {syncCheckNotice.text}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCheckSyncAndReload}
                  disabled={isCheckingSync}
                  className="shrink-0 min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-amber-200/60 dark:shadow-none transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                >
                  <ArrowPathIcon className={`w-4 h-4 ${isCheckingSync ? "animate-spin" : ""}`} />
                  <span>{isCheckingSync ? "Memeriksa..." : "Cek Status & Muat Ulang"}</span>
                </button>
              </div>
            </div>
          )}

          {!isWaitingForServer && syncCheckNotice?.type === "success" && (
            <div className="mb-6 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              {syncCheckNotice.text}
            </div>
          )}

          {isWaitingForServer ? (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 text-left">
              <h3 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 pb-2 mb-3">
                Informasi Peserta
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5 text-[11px]">
                <div>
                  <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase tracking-tighter">
                    Nama Sekolah
                  </p>
                  <p className="font-bold text-slate-700 dark:text-slate-200 uppercase truncate leading-tight">
                    {currentResult.student.schoolName || currentExam.authorSchool || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase tracking-tighter">
                    Nama Siswa
                  </p>
                  <p className="font-bold text-slate-700 dark:text-slate-200 uppercase truncate leading-tight">
                    {currentResult.student.fullName}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase tracking-tighter">
                    Kelas / No
                  </p>
                  <p className="font-bold text-slate-700 dark:text-slate-200 uppercase leading-tight">
                    {currentResult.student.class} / {currentResult.student.absentNumber}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase tracking-tighter">
                    Mata Pelajaran
                  </p>
                  <p className="font-bold text-slate-700 dark:text-slate-200 uppercase truncate leading-tight">
                    {currentExam.config.subject}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase tracking-tighter">
                    Jenis Evaluasi
                  </p>
                  <p className="font-bold text-slate-700 dark:text-slate-200 uppercase truncate leading-tight">
                    {currentExam.config.examType}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase tracking-tighter">
                    Waktu Pengerjaan
                  </p>
                  <p className="font-bold text-slate-700 dark:text-slate-200 uppercase truncate leading-tight">
                    {currentResult.completionTime !== undefined && currentResult.completionTime !== null
                      ? `${Math.floor(currentResult.completionTime / 60)} menit ${currentResult.completionTime % 60} detik`
                      : "-"}
                  </p>
                </div>
              </div>
            </div>
          ) : showResult ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* SCORE CARD */}
                <div
                  className={`lg:col-span-3 py-6 relative rounded-3xl border flex flex-col items-center justify-center ${
                    isOlympiad
                      ? "bg-amber-50/30 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-800/30"
                      : "bg-emerald-50/30 dark:bg-emerald-900/10 border-emerald-100/50 dark:border-emerald-800/30"
                  }`}
                >
                  <div className="flex items-baseline justify-center gap-1">
                    <span
                      className={`font-black tracking-tighter ${
                        isOlympiad ? "text-4xl sm:text-5xl" : "text-5xl"
                      } text-slate-800 dark:text-slate-100`}
                    >
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
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border shadow-sm ${calculatedStats.olympiadTier.badgeClass}`}
                      >
                        <span>{calculatedStats.olympiadTier.medal}</span>
                        <span>{calculatedStats.olympiadTier.label}</span>
                      </span>
                    </div>
                  )}

                  {isOlympiad ? (
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-mono font-bold">
                      <span
                        className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800"
                        title="Benar"
                      >
                        B: {calculatedStats.correctAnswers} (+{calculatedStats.correctScore} pt)
                      </span>
                      <span
                        className="text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800"
                        title="Salah (Penalti)"
                      >
                        S: {calculatedStats.wrongAnswers} ({calculatedStats.wrongPenalty} pt)
                      </span>
                      <span
                        className="text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700"
                        title="Kosong"
                      >
                        K: {calculatedStats.unansweredQuestions} (0 pt)
                      </span>
                    </div>
                  ) : null}
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
                        {currentResult.student.schoolName || currentExam.authorSchool || "-"}
                      </p>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase tracking-tighter">
                        Nama Siswa
                      </p>
                      <p className="font-bold text-slate-700 dark:text-slate-200 uppercase truncate leading-tight">
                        {currentResult.student.fullName}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase tracking-tighter">
                        Kelas / No
                      </p>
                      <p className="font-bold text-slate-700 dark:text-slate-200 uppercase leading-tight">
                        {currentResult.student.class} / {currentResult.student.absentNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase tracking-tighter">
                        Mata Pelajaran
                      </p>
                      <p className="font-bold text-slate-700 dark:text-slate-200 uppercase truncate leading-tight">
                        {currentExam.config.subject}
                      </p>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase tracking-tighter">
                        Jenis Evaluasi
                      </p>
                      <p className="font-bold text-slate-700 dark:text-slate-200 uppercase truncate leading-tight">
                        {currentExam.config.examType}
                      </p>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase tracking-tighter">
                        Waktu Pengerjaan
                      </p>
                      <p className="font-bold text-slate-700 dark:text-slate-200 uppercase truncate leading-tight">
                        {currentResult.completionTime !== undefined && currentResult.completionTime !== null
                          ? `${Math.floor(currentResult.completionTime / 60)} menit ${currentResult.completionTime % 60} detik`
                          : "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* QR CODE SECTION */}
                <div className="lg:col-span-3 flex flex-col items-center justify-center p-5 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <div className="p-2.5 bg-white rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-3">
                    <QRCodeCanvas
                      value={`${window.location.origin}/result/${currentExam.code}/${encodeURIComponent(currentResult.student.studentId)}`}
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

              {/* PALET NOMOR SOAL & REKAPAN / DETAIL JAWABAN SISWA */}
              <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <SparklesIcon className="w-4 h-4 text-indigo-500" />
                      <span>
                        {config.showCorrectAnswer
                          ? "Rincian Hasil Pengerjaan Soal"
                          : "Rekapan Jawaban Siswa"}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {config.showCorrectAnswer
                        ? "Klik atau ketuk nomor soal untuk melihat pertanyaan, jawaban Anda, kunci yang benar, serta pembahasannya."
                        : "Ketuk nomor soal untuk melihat kembali pertanyaan dan jawaban yang sudah Anda pilih atau tulis."}
                    </p>
                  </div>
                  {/* Legend */}
                  {config.showCorrectAnswer ? (
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
                  ) : (
                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-600 dark:text-slate-400 shrink-0">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Sudah Dijawab
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600"></span> Kosong
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {enrichedQuestions
                    .filter((q) => q.questionType !== "INFO")
                    .map((q, idx) => {
                      const status = config.showCorrectAnswer
                        ? checkAnswerStatus(q, currentResult.answers || {})
                        : "EMPTY";
                      const isManual =
                        q.questionType === "ESSAY" || q.questionType === "FILL_IN_THE_BLANK";
                      const isGraded = currentResult.answers?.[`_grade_${q.id}`];
                      return (
                        <QuestionResultDetailPopover
                          key={q.id}
                          question={q}
                          questionIndex={idx}
                          answers={currentResult.answers || {}}
                          status={status}
                          isManual={isManual}
                          isGraded={isGraded}
                          showCorrectAnswer={Boolean(config.showCorrectAnswer)}
                          showHints={Boolean(config.showHints)}
                          showSolutionSteps={Boolean(config.showSolutionSteps)}
                          size="md"
                        />
                      );
                    })}
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-end gap-4 border-t border-slate-50 dark:border-slate-800 pt-6">
                {config.enableCertificate && (
                  <button
                    onClick={handleDownloadCertificate}
                    className="min-h-[44px] text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 hover:text-white hover:bg-emerald-600 dark:hover:bg-emerald-500 px-6 py-3 rounded-2xl transition-all inline-flex items-center gap-2 border-2 border-emerald-100 dark:border-emerald-900/30 cursor-pointer"
                  >
                    <SparklesIcon className="w-3.5 h-3.5" /> Unduh Sertifikat
                  </button>
                )}

                <button
                  onClick={() => setExpandedReview(!expandedReview)}
                  className="min-h-[44px] text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 px-6 py-3 rounded-2xl transition-all inline-flex items-center gap-2 border-2 border-indigo-100 dark:border-indigo-900/30 cursor-pointer"
                >
                  {config.showCorrectAnswer || config.showHints || config.showSolutionSteps
                    ? expandedReview
                      ? "Tutup Pembahasan"
                      : "Lihat Pembahasan"
                    : expandedReview
                      ? "Tutup Rekapan Jawaban"
                      : "Lihat Rekapan Jawaban"}
                  {expandedReview ? (
                    <ChevronUpIcon className="w-3 h-3" />
                  ) : (
                    <ChevronDownIcon className="w-3 h-3" />
                  )}
                </button>
              </div>

              {expandedReview && <ReviewSection exam={enrichedExam} result={currentResult} />}
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
          examCode={currentExam.code}
          studentName={currentResult.student.fullName}
          studentId={currentResult.student.studentId}
          schoolName={currentResult.student.schoolName || currentExam.authorSchool}
          onClose={() => setShowFeedbackModal(false)}
        />
      )}

      <StudentDialogModal
        isOpen={!!certErrorMsg}
        variant="error"
        title="Gagal Mengunduh Sertifikat"
        message={certErrorMsg || ""}
        confirmLabel="Mengerti"
        onClose={() => setCertErrorMsg(null)}
      />
    </div>
  );
};
