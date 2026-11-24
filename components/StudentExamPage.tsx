import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Exam, Student, Result, ResultStatus } from "../types";
import { ClockIcon, CheckIcon } from "./Icons";
import { useStudentExamLogic } from "./student/useStudentExamLogic";
import { StudentExamIntroModal } from "./student/exam/StudentExamIntroModal";
import { StudentExamHeader, type FontStepConfig } from "./student/exam/StudentExamHeader";
import { StudentExamNavDrawer } from "./student/exam/StudentExamNavDrawer";
import { StudentExamQuestionCard } from "./student/exam/StudentExamQuestionCard";
import { StudentExamCompletionCard } from "./student/exam/StudentExamCompletionCard";
import { StudentDialogModal } from "./student/StudentDialogModal";

const FONT_STEP_CONFIGS: FontStepConfig[] = [
  { step: -2, percentage: 80, qSizeRem: 0.825, optSizeRem: 0.775, inputSizeRem: 1.0, lineHeight: 1.55, label: "Sangat Kecil" },
  { step: -1, percentage: 90, qSizeRem: 0.9125, optSizeRem: 0.85, inputSizeRem: 1.0, lineHeight: 1.58, label: "Kecil" },
  { step: 0, percentage: 100, qSizeRem: 1.0, optSizeRem: 0.9375, inputSizeRem: 1.0, lineHeight: 1.625, label: "Normal" },
  { step: 1, percentage: 112, qSizeRem: 1.125, optSizeRem: 1.05, inputSizeRem: 1.05, lineHeight: 1.625, label: "Besar (+1)" },
  { step: 2, percentage: 125, qSizeRem: 1.25, optSizeRem: 1.15, inputSizeRem: 1.15, lineHeight: 1.65, label: "Besar (+2)" },
  { step: 3, percentage: 140, qSizeRem: 1.375, optSizeRem: 1.25, inputSizeRem: 1.25, lineHeight: 1.68, label: "Besar (+3)" },
  { step: 4, percentage: 155, qSizeRem: 1.525, optSizeRem: 1.375, inputSizeRem: 1.375, lineHeight: 1.7, label: "Besar (+4)" },
  { step: 5, percentage: 170, qSizeRem: 1.68, optSizeRem: 1.5, inputSizeRem: 1.5, lineHeight: 1.72, label: "Maksimal (+5)" },
];

const MIN_FONT_STEP = -2;
const MAX_FONT_STEP = 5;
const NORMAL_FONT_STEP = 0;

interface StudentExamPageProps {
  exam: Exam;
  student: Student;
  initialData?: Result | null;
  onSubmit: (
    answers: Record<string, string>,
    timeLeft: number,
    status?: ResultStatus,
    logs?: string[],
    location?: string,
    grading?: Record<string, unknown>,
  ) => void;
  onUpdate?: (answers: Record<string, string>, timeLeft: number) => void;
  onBack?: () => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
}

export const StudentExamPage: React.FC<StudentExamPageProps> = ({
  exam,
  student,
  initialData,
  onSubmit,
  onUpdate,
  onBack,
  isDarkMode,
  toggleTheme,
}) => {
  const {
    formatTime,
    totalQuestions,
    answeredCount,
    progress,
    optimizeHtml,
    answers,
    isSubmitting,
    isNavOpen,
    setIsNavOpen,
    hasAttemptedSubmit,
    showConfigIntro,
    setShowConfigIntro,
    activeExam,
    matchingOptionsMap,
    isMonitoring,
    monitoringLabel,
    answeredMap,
    handleSubmit,
    getTimeLeft,
    subscribeTimeLeft,
    flushLocalProgress,
    handleAnswerChange,
    scrollToQuestion,
    isSessionGracePeriodActive,
    sessionEndTime,
    examDialog,
    closeExamDialog,
    confirmExamDialog,
  } = useStudentExamLogic({ exam, student, initialData, onSubmit, onUpdate });

  const [isSessionBannerDismissed, setIsSessionBannerDismissed] = useState(false);
  const [expandedHints, setExpandedHints] = useState<Record<string, boolean>>({});
  const isSubmittingRef = useRef(isSubmitting);
  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  const toggleHint = useCallback((questionId: string) => {
    setExpandedHints((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  }, []);

  const numberedQuestions = useMemo(() => {
    const list: { q: Exam["questions"][number]; num: number }[] = [];
    let counter = 0;
    for (const q of activeExam.questions) {
      if (q.questionType !== "INFO") {
        counter += 1;
        list.push({ q, num: counter });
      } else {
        list.push({ q, num: counter + 1 });
      }
    }
    return list;
  }, [activeExam.questions]);

  const scorableNumberedQuestions = useMemo(
    () =>
      numberedQuestions
        .filter(({ q }) => q.questionType !== "INFO")
        .map(({ q, num }) => ({ id: q.id, num })),
    [numberedQuestions],
  );

  const unansweredItems = useMemo(
    () => scorableNumberedQuestions.filter(({ id }) => !answeredMap[id]),
    [scorableNumberedQuestions, answeredMap],
  );

  const handleToggleNav = useCallback(() => {
    setIsNavOpen((prev) => !prev);
  }, [setIsNavOpen]);

  const handleCloseNav = useCallback(() => {
    setIsNavOpen(false);
  }, [setIsNavOpen]);

  const handleRequestSubmitFromDrawer = useCallback(() => {
    setIsNavOpen(false);
    handleSubmit(false);
  }, [setIsNavOpen, handleSubmit]);

  const handleSubmitCard = useCallback(() => {
    handleSubmit(false);
  }, [handleSubmit]);

  const handleStartIntro = useCallback(() => {
    setShowConfigIntro(false);
  }, [setShowConfigIntro]);

  const [fontStep, setFontStep] = useState<number>(() => {
    try {
      const savedStep = localStorage.getItem("student_font_step");
      if (savedStep !== null) {
        const parsed = parseInt(savedStep, 10);
        if (!isNaN(parsed) && parsed >= MIN_FONT_STEP && parsed <= MAX_FONT_STEP) {
          return parsed;
        }
      }
      const oldSaved = localStorage.getItem("student_font_size");
      if (oldSaved === "small") return -1;
      if (oldSaved === "large") return 2;
    } catch {
      // fallback
    }
    return NORMAL_FONT_STEP;
  });

  const currentFontConfig =
    FONT_STEP_CONFIGS.find((c) => c.step === fontStep) || FONT_STEP_CONFIGS[2];

  const handleDecreaseFontSize = useCallback(() => {
    setFontStep((prev) => {
      const next = Math.max(MIN_FONT_STEP, prev - 1);
      try {
        localStorage.setItem("student_font_step", String(next));
        localStorage.setItem(
          "student_font_size",
          next < 0 ? "small" : next > 0 ? "large" : "normal",
        );
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const handleResetFontSize = useCallback(() => {
    setFontStep(() => {
      try {
        localStorage.setItem("student_font_step", "0");
        localStorage.setItem("student_font_size", "normal");
      } catch {
        // ignore
      }
      return NORMAL_FONT_STEP;
    });
  }, []);

  const handleIncreaseFontSize = useCallback(() => {
    setFontStep((prev) => {
      const next = Math.min(MAX_FONT_STEP, prev + 1);
      try {
        localStorage.setItem("student_font_step", String(next));
        localStorage.setItem(
          "student_font_size",
          next < 0 ? "small" : next > 0 ? "large" : "normal",
        );
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const headerRef = useRef<HTMLElement>(null);
  const navMenuRef = useRef<HTMLDivElement>(null);

  // Auto-dismiss question palette menu when clicking outside header & nav menu
  useEffect(() => {
    if (!isNavOpen) return;

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      const isInsideHeader = headerRef.current?.contains(target);
      const isInsideNavMenu = navMenuRef.current?.contains(target);

      if (!isInsideHeader && !isInsideNavMenu) {
        setIsNavOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDownOutside);
    document.addEventListener("touchstart", handlePointerDownOutside, {
      passive: true,
    });

    return () => {
      document.removeEventListener("mousedown", handlePointerDownOutside);
      document.removeEventListener("touchstart", handlePointerDownOutside);
    };
  }, [isNavOpen, setIsNavOpen]);

  // Mobile Protection: Trap history back / edge-swipe, prevent pull-to-refresh, and confirm beforeunload
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePopState);

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      flushLocalProgress();
      if (!isSubmittingRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    let startY = 0;
    let startedInScrollable = false;

    const findScrollableParent = (target: EventTarget | null): HTMLElement | null => {
      if (!(target instanceof HTMLElement)) return null;
      return target.closest(
        '[data-scrollable="true"], .overflow-y-auto, .overflow-auto, textarea, [role="dialog"]',
      ) as HTMLElement | null;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        startY = e.touches[0].clientY;
        const scrollableEl = findScrollableParent(e.target);
        startedInScrollable = Boolean(
          scrollableEl &&
            (scrollableEl.scrollHeight > scrollableEl.clientHeight ||
              scrollableEl.hasAttribute("data-scrollable") ||
              scrollableEl.getAttribute("role") === "dialog"),
        );
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        // Jangan blokir gestur sentuhan di dalam laci navigasi soal, modal, lightbox, dropdown, atau textarea
        if (startedInScrollable) return;

        const currentY = e.touches[0].clientY;
        const scrollTop = window.scrollY || document.documentElement.scrollTop;

        if (startY <= 50 && scrollTop <= 0 && currentY > startY) {
          if (e.cancelable) {
            e.preventDefault();
            e.stopPropagation();
          }
          return;
        }

        if (scrollTop <= 0 && currentY > startY + 8) {
          if (e.cancelable) {
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true, capture: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false, capture: true });

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("touchstart", handleTouchStart, true);
      window.removeEventListener("touchmove", handleTouchMove, true);
    };
  }, [flushLocalProgress]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  // Proteksi keamanan ujian: Cegah tekan lama, seleksi teks, klik kanan, drag, dan copy-paste
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
    };
    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
    };
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (
        e.key === "F12" ||
        (isCtrlOrCmd && e.shiftKey && ["i", "j", "c"].includes(key)) ||
        (isCtrlOrCmd && key === "u")
      ) {
        e.preventDefault();
        return;
      }

      if (isCtrlOrCmd && ["c", "v", "x"].includes(key)) {
        e.preventDefault();
        return;
      }

      if (isCtrlOrCmd && key === "a" && !isInput) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu, { capture: true });
    document.addEventListener("selectstart", handleSelectStart, { capture: true });
    document.addEventListener("dragstart", handleDragStart, { capture: true });
    document.addEventListener("copy", handleCopy, { capture: true });
    document.addEventListener("cut", handleCut, { capture: true });
    document.addEventListener("paste", handlePaste, { capture: true });
    document.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      document.removeEventListener("selectstart", handleSelectStart, { capture: true });
      document.removeEventListener("dragstart", handleDragStart, { capture: true });
      document.removeEventListener("copy", handleCopy, { capture: true });
      document.removeEventListener("cut", handleCut, { capture: true });
      document.removeEventListener("paste", handlePaste, { capture: true });
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] dark:bg-slate-950 font-sans exam-secure-shield select-none pb-[calc(10rem+env(safe-area-inset-bottom,0px))] safe-px transition-colors duration-300">
      {showConfigIntro && (
        <StudentExamIntroModal
          exam={activeExam}
          onStart={handleStartIntro}
        />
      )}

      <StudentExamHeader
        headerRef={headerRef}
        activeExam={activeExam}
        student={student}
        progress={progress}
        isNavOpen={isNavOpen}
        onToggleNav={handleToggleNav}
        isMonitoring={isMonitoring}
        monitoringLabel={monitoringLabel}
        fontStep={fontStep}
        minFontStep={MIN_FONT_STEP}
        maxFontStep={MAX_FONT_STEP}
        currentFontConfig={currentFontConfig}
        onDecreaseFontSize={handleDecreaseFontSize}
        onResetFontSize={handleResetFontSize}
        onIncreaseFontSize={handleIncreaseFontSize}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        getTimeLeft={getTimeLeft}
        subscribeTimeLeft={subscribeTimeLeft}
        formatTime={formatTime}
        onBack={onBack}
      />

      <StudentExamNavDrawer
        navMenuRef={navMenuRef}
        isNavOpen={isNavOpen}
        onCloseNav={handleCloseNav}
        onToggleNav={handleToggleNav}
        activeExam={activeExam}
        scorableNumberedQuestions={scorableNumberedQuestions}
        answeredMap={answeredMap}
        answeredCount={answeredCount}
        totalQuestions={totalQuestions}
        progress={progress}
        hasAttemptedSubmit={hasAttemptedSubmit}
        isSubmitting={isSubmitting}
        isMonitoring={isMonitoring}
        monitoringLabel={monitoringLabel}
        isSessionGracePeriodActive={isSessionGracePeriodActive}
        sessionEndTime={sessionEndTime}
        scrollToQuestion={scrollToQuestion}
        onRequestSubmit={handleRequestSubmitFromDrawer}
      />

      <main
        className={`w-full max-w-full mx-auto px-2.5 sm:px-6 exam-main-safe space-y-4 sm:space-y-8 exam-content-scalable exam-font-step-${fontStep}`}
        style={
          {
            "--exam-prose-size": `${currentFontConfig.qSizeRem}rem`,
            "--exam-option-size": `${currentFontConfig.optSizeRem}rem`,
            "--exam-input-size": `${Math.max(1, currentFontConfig.inputSizeRem)}rem`,
            "--exam-line-height": currentFontConfig.lineHeight,
          } as React.CSSProperties
        }
      >
        {/* Banner Mode Pratinjau Guru */}
        {(student.class === "PREVIEW" || student.studentId.includes("PREVIEW")) && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block"></span>
              </div>
              <div>
                <strong className="block font-bold text-sm text-amber-900 dark:text-amber-100">
                  Mode Pratinjau Guru {activeExam.status === "DRAFT" ? "(Draf Soal)" : "(Jadwal Mendatang)"}
                </strong>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  Anda sedang mencoba tampilan soal dari perspektif siswa. Jawaban atau skor dalam mode ini tidak dicatat ke database resmi.
                </p>
              </div>
            </div>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 self-end sm:self-center transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                Kembali ke Dashboard
              </button>
            )}
          </div>
        )}

        {/* Banner Grace Period */}
        {isSessionGracePeriodActive && !isSessionBannerDismissed && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
                <ClockIcon className="w-5 h-5" />
              </div>
              <div>
                <strong className="block font-bold text-sm text-amber-900 dark:text-amber-100">
                  Masa Perpanjangan Waktu Pengerjaan ({sessionEndTime || "Jadwal Berakhir"})
                </strong>
                <p className="text-amber-700 dark:text-amber-300 mt-0.5">
                  Jam selesai sesi atau ujian telah berakhir, namun guru mengizinkan Anda menuntaskan sisa durasi pengerjaan hingga waktu habis atau ujian ditutup secara manual.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsSessionBannerDismissed(true)}
              className="text-[11px] font-black uppercase px-4 py-2 rounded-xl bg-amber-200 hover:bg-amber-300 dark:bg-amber-900/80 dark:hover:bg-amber-800 text-amber-950 dark:text-amber-100 shrink-0 self-end sm:self-center transition-all active:scale-95 shadow-xs cursor-pointer flex items-center gap-1.5 focus:outline-hidden"
              title="Tutup banner peringatan agar pandangan soal lebih leluasa"
              aria-label="Lanjut Mengerjakan"
            >
              <span>Lanjut Mengerjakan</span>
              <CheckIcon className="w-3.5 h-3.5 text-amber-950 dark:text-amber-100" />
            </button>
          </div>
        )}

        {/* Banner Mode Olimpiade */}
        {activeExam.config?.isOlympiadMode && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 shadow-xs flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs font-black text-xs">
              OSN
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-amber-950 dark:text-amber-100">
                  Ujian Berjalan dalam Mode Olimpiade
                </h3>
                <span className="text-[11px] font-mono font-bold text-amber-800 dark:text-amber-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-700/60">
                  Benar +{activeExam.config.olympiadScoring?.correctMultiplier ?? 4} · Salah {activeExam.config.olympiadScoring?.wrongMultiplier ?? -1} · Kosong {activeExam.config.olympiadScoring?.emptyMultiplier ?? 0}
                </span>
              </div>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-1 leading-relaxed">
                Ujian ini menerapkan sistem penalti poin. Jawaban yang salah akan mengurangi nilai akhir. Jika ragu, Anda dapat mengosongkan jawaban agar terhindar dari penalti.
              </p>
            </div>
          </div>
        )}

        {numberedQuestions.map(({ q, num }) => {
          const answered = !!answeredMap[q.id];
          const isMissing =
            hasAttemptedSubmit && !answered && q.questionType !== "INFO";

          return (
            <StudentExamQuestionCard
              key={q.id}
              question={q}
              questionNumber={num}
              answered={answered}
              isMissing={isMissing}
              answerValue={answers[q.id] || ""}
              rightOptions={matchingOptionsMap[q.id] || []}
              showHints={activeExam.config?.showHints}
              isHintExpanded={!!expandedHints[q.id]}
              onToggleHint={toggleHint}
              onAnswerChange={handleAnswerChange}
              optimizeHtml={optimizeHtml}
            />
          );
        })}

        <StudentExamCompletionCard
          isOlympiadMode={activeExam.config?.isOlympiadMode}
          unansweredItems={unansweredItems}
          answeredCount={answeredCount}
          totalQuestions={totalQuestions}
          progress={progress}
          isSubmitting={isSubmitting}
          scrollToQuestion={scrollToQuestion}
          onSubmit={handleSubmitCard}
        />
      </main>

      <StudentDialogModal
        isOpen={examDialog.isOpen}
        variant={examDialog.variant}
        title={examDialog.title}
        message={examDialog.message}
        unansweredItems={examDialog.unansweredItems}
        onJumpToQuestion={scrollToQuestion}
        confirmLabel={examDialog.confirmLabel}
        cancelLabel={examDialog.cancelLabel}
        isLoading={examDialog.isLoading}
        closeOnBackdrop={examDialog.closeOnBackdrop}
        onConfirm={
          examDialog.variant === "confirm" || examDialog.unansweredItems
            ? confirmExamDialog
            : closeExamDialog
        }
        onClose={closeExamDialog}
      />
    </div>
  );
};
