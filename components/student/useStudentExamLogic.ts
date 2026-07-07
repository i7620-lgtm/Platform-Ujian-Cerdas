import { useState, useEffect, useRef, useCallback } from "react";
import type { Exam, Student, Result, Question, ResultStatus } from "../../types";
import { storageService } from "../../services/storage";
import { supabase } from "../../lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { calculateExamScore, sanitizeHtml, parseList } from "../teacher/examUtils";
import { useExamAntiCheat } from "../../hooks/useExamAntiCheat";

interface UseStudentExamLogicProps {
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
}

export const useStudentExamLogic = ({
  exam,
  student,
  initialData,
  onSubmit,
  onUpdate,
}: UseStudentExamLogicProps) => {
  const STORAGE_KEY = `exam_local_${exam.code}_${student.studentId}`;
  const CACHED_EXAM_KEY = `exam_def_${exam.code}`;

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userLocation, setUserLocation] = useState<string>("");

  const [isNavOpen, setIsNavOpen] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [showConfigIntro, setShowConfigIntro] = useState(true);

  const [activeExam, setActiveExam] = useState<Exam>(exam);

  const answersRef = useRef<Record<string, string>>({});
  const logRef = useRef<string[]>(initialData?.activityLog || []);
  const isSubmittingRef = useRef(false);
  const timeLeftRef = useRef(0);
  const lastBroadcastTimeRef = useRef<number>(0);
  const examRoomChannelRef = useRef<RealtimeChannel | null>(null);

  const [matchingOptionsMap] = useState<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {};
    activeExam?.questions.forEach((q) => {
      if (q.questionType === "MATCHING" && q.matchingPairs) {
        const opts = q.matchingPairs.map((p) => p.right);
        for (let i = opts.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [opts[i], opts[j]] = [opts[j], opts[i]];
        }
        map[q.id] = opts;
      }
    });
    return map;
  });

  // Monitoring Status
  const isMonitoring =
    activeExam.config.detectBehavior && activeExam.config.examMode !== "PR";
  const monitoringLabel = activeExam.config.continueWithPermission
    ? "Diawasi & Terkunci"
    : "Diawasi Sistem";

  const isAnswered = (q: Question, currentAnswers: Record<string, string>) => {
    const ans = currentAnswers[q.id];
    if (!ans) return false;
    if (q.questionType === "COMPLEX_MULTIPLE_CHOICE") {
      try {
        const parsed = JSON.parse(ans);
        return Array.isArray(parsed) && parsed.length > 0;
      } catch {
        return false;
      }
    }
    if (q.questionType === "TRUE_FALSE") {
      try {
        const parsed = JSON.parse(ans);
        const rowCount = q.trueFalseRows?.length || 0;
        return Object.keys(parsed).length >= rowCount && rowCount > 0;
      } catch {
        return false;
      }
    }
    if (q.questionType === "MATCHING") {
      try {
        const parsed = JSON.parse(ans);
        const pairCount = q.matchingPairs?.length || 0;
        return Object.keys(parsed).length >= pairCount && pairCount > 0;
      } catch {
        return false;
      }
    }
    return ans.trim().length > 0;
  };

  const handleSubmit = useCallback(
    async (isAuto = false, status: ResultStatus = "completed") => {
      if (isSubmittingRef.current) return;

      if (!isAuto) {
        setHasAttemptedSubmit(true);
        const unansweredCount = activeExam.questions.filter(
          (q) =>
            q.questionType !== "INFO" && !isAnswered(q, answersRef.current),
        ).length;

        let confirmMsg = "Yakin ingin mengumpulkan jawaban sekarang?";
        if (unansweredCount > 0) {
          confirmMsg = `Masih ada ${unansweredCount} soal yang belum dijawab atau belum lengkap. Yakin ingin mengumpulkan sekarang?`;
        }

        if (!window.confirm(confirmMsg)) return;
      }

      setIsSubmitting(true);
      isSubmittingRef.current = true;

      try {
        if (status === "completed" || status === "force_closed") {
          const startTimeStr = answersRef.current["_startTime"];
          if (startTimeStr) {
            const startTime = parseInt(startTimeStr);
            const durationInSeconds = Math.floor(
              (Date.now() - startTime) / 1000,
            );
            answersRef.current["_duration"] = durationInSeconds.toString();
          }
        }

        const grading = calculateExamScore(activeExam, answersRef.current);
        await onSubmit(
          answersRef.current,
          timeLeftRef.current,
          status,
          logRef.current,
          userLocation,
          grading,
        );

        if (examRoomChannelRef.current) {
          examRoomChannelRef.current
            .send({
              type: "broadcast",
              event: "student_submitted",
              payload: { studentId: student.studentId, status },
            })
            .catch(() => {});
        }

        await storageService.clearLocalProgress(STORAGE_KEY);
      } catch (error) {
        console.error("Submit error:", error);
        alert("Gagal mengirim jawaban. Silakan coba lagi.");
        setIsSubmitting(false);
        isSubmittingRef.current = false;
      }
    },
    [activeExam, onSubmit, userLocation, STORAGE_KEY, student.studentId],
  );

  const { timeLeft } = useExamAntiCheat({
    student,
    exam: activeExam,
    initialData,
    storageKey: STORAGE_KEY,
    answersRef,
    logRef,
    timeLeftRef,
    onForceSubmit: handleSubmit,
    isSubmitting,
  });

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let resultChannel: ReturnType<typeof supabase.channel> | null = null;
    // HARD BLOCK: Ensure Realtime is ONLY enabled if disableRealtime is explicitly false.
    // This prevents students in "Normal Mode" from consuming Realtime Concurrent Peak Connections.
    const isRealtimeEnabled = exam.config.disableRealtime === false;

    if (isRealtimeEnabled) {
      const channelName = `exam-room-${exam.code}`;
      channel = supabase
        .channel(channelName, {
          config: { presence: { key: student.studentId } },
        })
        .on("broadcast", { event: "force_submit_exam" }, (payload) => {
          // If studentId is provided in payload, only submit if it matches current student
          if (
            payload.payload?.studentId &&
            payload.payload.studentId !== student.studentId
          )
            return;

          if (student.class !== "PREVIEW" && !isSubmittingRef.current) {
            alert(
              "Ujian telah dihentikan oleh Guru. Jawaban Anda akan dikumpulkan otomatis.",
            );
            handleSubmit(true, "completed");
          }
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel
              ?.track({
                studentId: student.studentId,
                onlineAt: new Date().toISOString(),
              })
              .catch(() => {});
          }
        });

      examRoomChannelRef.current = channel;

      if (student.resultId) {
        resultChannel = supabase
          .channel(`student-result-${student.resultId}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "results",
              filter: `id=eq.${student.resultId}`,
            },
            (payload) => {
              const newStatus = payload.new.status;
              if (
                (newStatus === "completed" || newStatus === "force_closed") &&
                !isSubmittingRef.current &&
                student.class !== "PREVIEW"
              ) {
                alert(
                  "Ujian telah dihentikan oleh Guru. Jawaban Anda akan dikumpulkan otomatis.",
                );
                handleSubmit(true, newStatus);
              }
            },
          )
          .subscribe();
      }
    }
    return () => {
      if (channel) supabase.removeChannel(channel);
      if (resultChannel) supabase.removeChannel(resultChannel);
    };
  }, [
    exam.code,
    exam.config.disableRealtime,
    student.studentId,
    student.class,
    student.resultId,
    handleSubmit,
  ]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    // HARD BLOCK: Ensure Realtime is ONLY enabled if disableRealtime is explicitly false.
    const isRealtimeEnabled = exam.config.disableRealtime === false;

    if (isRealtimeEnabled) {
      channel = supabase
        .channel(`exam-config-${exam.code}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "exams",
            filter: `code=eq.${exam.code}`,
          },
          (payload) => {
            const newConfig = payload.new.config;
            if (newConfig) {
              setActiveExam((prev) => {
                return { ...prev, config: newConfig };
              });
            }
          },
        )
        .subscribe();
    }

    let pollTimeout: NodeJS.Timeout;
    let isPolling = true;

    const pollData = async () => {
      if (!isPolling) return;
      if (typeof navigator !== "undefined" && navigator.onLine !== false) {
        try {
          // Select extreme for exams
          const { data } = await supabase
            .from("exams")
            .select("status, config, unlock_token")
            .eq("code", exam.code)
            .single();
          if (data) {
            if (data.status === "closed" && !isSubmittingRef.current) {
              alert("Ujian telah ditutup oleh Guru.");
              handleSubmit(true, "force_closed");
              return;
            }
            if (data.config) {
              setActiveExam((prev) => {
                if (prev.config.timeLimit !== data.config.timeLimit) {
                  return { ...prev, config: data.config };
                }
                return { ...prev, config: data.config };
              });
            }
          }

          // Select extreme for results
          if (student.resultId && student.class !== "PREVIEW") {
            const { data: resultData } = await supabase
              .from("results")
              .select("status, student_id")
              .eq("id", student.resultId)
              .single();
            if (
              resultData &&
              (resultData.status === "completed" ||
                resultData.status === "force_closed") &&
              !isSubmittingRef.current
            ) {
              alert(
                "Ujian telah dihentikan oleh Guru. Jawaban Anda akan dikumpulkan otomatis.",
              );
              handleSubmit(true, resultData.status);
              return;
            }
          }
        } catch {
          /* ignore */
        }
      }

      // Calculate next interval based on time left
      let nextInterval = 60000; // 1 minute default
      if (timeLeftRef.current !== undefined && timeLeftRef.current <= 300) {
        // 5 minutes = 300 seconds
        nextInterval = 15000; // 15 seconds
      }

      if (isPolling) {
        pollTimeout = setTimeout(pollData, nextInterval);
      }
    };

    // Start polling
    pollTimeout = setTimeout(pollData, 60000);

    return () => {
      isPolling = false;
      if (channel) supabase.removeChannel(channel);
      clearTimeout(pollTimeout);
    };
  }, [
    exam.code,
    exam.config.disableRealtime,
    student.resultId,
    student.class,
    handleSubmit,
  ]);

  const isLoadedRef = useRef(false);
  const prevStorageKeyRef = useRef(STORAGE_KEY);
  const loadPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (prevStorageKeyRef.current !== STORAGE_KEY) {
      const oldKey = prevStorageKeyRef.current;
      const newKey = STORAGE_KEY;
      prevStorageKeyRef.current = STORAGE_KEY;

      const copyData = async () => {
        if (loadPromiseRef.current) {
          await loadPromiseRef.current;
        }
        storageService.saveLocalProgress(newKey, {
          answers: answersRef.current,
          logs: logRef.current,
          lastUpdated: Date.now(),
        });
        storageService.clearLocalProgress(oldKey);
      };
      copyData();
    }
  }, [STORAGE_KEY]);

  useEffect(() => {
    const loadState = async () => {
      if (isLoadedRef.current) return;
      isLoadedRef.current = true;

      loadPromiseRef.current = (async () => {
        try {
          localStorage.setItem(CACHED_EXAM_KEY, JSON.stringify(exam));
        } catch {
          /* ignore */
        }
        const localData = (await storageService.getLocalProgress(
          STORAGE_KEY,
        )) as { answers?: Record<string, string>; logs?: string[] } | null;
        if (localData) {
          const loadedAnswers = localData.answers || {};
          // Fix sorting for old data
          Object.keys(loadedAnswers).forEach((qId) => {
            const q = activeExam.questions.find((q) => q.id === qId);
            if (q) {
              if (q.questionType === "COMPLEX_MULTIPLE_CHOICE") {
                try {
                  const parsed = JSON.parse(loadedAnswers[qId]);
                  if (Array.isArray(parsed)) {
                    parsed.sort(
                      (a, b) =>
                        (q.options || []).indexOf(a) -
                        (q.options || []).indexOf(b),
                    );
                    loadedAnswers[qId] = JSON.stringify(parsed);
                  }
                } catch {
                  /* ignore */
                }
              } else if (
                q.questionType === "TRUE_FALSE" ||
                q.questionType === "MATCHING"
              ) {
                try {
                  const parsed = JSON.parse(loadedAnswers[qId]);
                  if (typeof parsed === "object" && !Array.isArray(parsed)) {
                    const sortedObj: Record<number, string | boolean | number> =
                      {};
                    Object.keys(parsed)
                      .map(Number)
                      .sort((a, b) => a - b)
                      .forEach(
                        (k) =>
                          (sortedObj[k] = (
                            parsed as Record<number, string | boolean | number>
                          )[k]),
                      );
                    loadedAnswers[qId] = JSON.stringify(sortedObj);
                  }
                } catch {
                  /* ignore */
                }
              }
            }
          });
          if (!loadedAnswers["_startTime"]) {
            loadedAnswers["_startTime"] = Date.now().toString();
          }
          setAnswers(loadedAnswers);
          answersRef.current = loadedAnswers;
          if (localData.logs) logRef.current = localData.logs;
          return;
        }
        if (initialData?.answers) {
          const loadedAnswers = { ...initialData.answers };
          // Fix sorting for old data
          Object.keys(loadedAnswers).forEach((qId) => {
            const q = activeExam.questions.find((q) => q.id === qId);
            if (q) {
              if (q.questionType === "COMPLEX_MULTIPLE_CHOICE") {
                try {
                  const parsed = JSON.parse(loadedAnswers[qId]);
                  if (Array.isArray(parsed)) {
                    parsed.sort(
                      (a, b) =>
                        (q.options || []).indexOf(a) -
                        (q.options || []).indexOf(b),
                    );
                    loadedAnswers[qId] = JSON.stringify(parsed);
                  }
                } catch {
                  /* ignore */
                }
              } else if (
                q.questionType === "TRUE_FALSE" ||
                q.questionType === "MATCHING"
              ) {
                try {
                  const parsed = JSON.parse(loadedAnswers[qId]);
                  if (typeof parsed === "object" && !Array.isArray(parsed)) {
                    const sortedObj: Record<number, string | boolean | number> =
                      {};
                    Object.keys(parsed)
                      .map(Number)
                      .sort((a, b) => a - b)
                      .forEach(
                        (k) =>
                          (sortedObj[k] = (
                            parsed as Record<number, string | boolean | number>
                          )[k]),
                      );
                    loadedAnswers[qId] = JSON.stringify(sortedObj);
                  }
                } catch {
                  /* ignore */
                }
              }
            }
          });
          if (!loadedAnswers["_startTime"]) {
            loadedAnswers["_startTime"] = Date.now().toString();
          }
          setAnswers(loadedAnswers);
          answersRef.current = loadedAnswers;
        } else {
          const loadedAnswers = { _startTime: Date.now().toString() };
          setAnswers(loadedAnswers);
          answersRef.current = loadedAnswers;
        }
      })();
      await loadPromiseRef.current;
    };
    loadState();
  }, [STORAGE_KEY, CACHED_EXAM_KEY, initialData, exam, activeExam.questions]);

  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  useEffect(() => {
    if (
      activeExam.config.trackLocation &&
      activeExam.config.examMode !== "PR" &&
      student.class !== "PREVIEW" &&
      "geolocation" in navigator
    ) {
      navigator.geolocation.getCurrentPosition((pos) =>
        setUserLocation(`${pos.coords.latitude}, ${pos.coords.longitude}`),
      );
    }
  }, [
    activeExam.config.trackLocation,
    activeExam.config.examMode,
    student.class,
  ]);

  const broadcastProgress = useCallback(() => {
    // HARD BLOCK: If realtime is disabled, we don't even attempt to call the service.
    if (activeExam.config.disableRealtime) return;

    const totalQ = activeExam.questions.filter(
      (q) => q.questionType !== "INFO",
    ).length;
    const answeredQ = activeExam.questions.filter(
      (q) => q.questionType !== "INFO" && isAnswered(q, answersRef.current),
    ).length;
    storageService
      .sendProgressUpdate(
        activeExam.code,
        student.studentId,
        answeredQ,
        totalQ,
        examRoomChannelRef.current,
      )
      .catch(() => {});
  }, [activeExam, student.studentId]);

  const handleAnswerChange = useCallback(
    (qId: string, val: string) => {
      setAnswers((prev) => {
        const next = { ...prev, [qId]: val };
        answersRef.current = next;
        if (student.class !== "PREVIEW") {
          storageService.saveLocalProgress(STORAGE_KEY, {
            answers: next,
            logs: logRef.current,
            lastUpdated: Date.now(),
          });
        }
        return next;
      });
      if (student.class !== "PREVIEW" && !activeExam.config.disableRealtime) {
        const now = Date.now();
        if (now - lastBroadcastTimeRef.current > 2000) {
          broadcastProgress();
          lastBroadcastTimeRef.current = now;
        }
      }
    },
    [
      STORAGE_KEY,
      activeExam.config.disableRealtime,
      broadcastProgress,
      student.class,
    ],
  );

  const scrollToQuestion = (id: string) => {
    setIsNavOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const formatTime = (s: number) => {
    if (s === Infinity) return "Tanpa Batas Waktu";
    const h = Math.floor(s / 3600),
      m = Math.floor((s % 3600) / 60),
      sec = s % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
      : `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const totalQuestions = activeExam.questions.filter(
    (q) => q.questionType !== "INFO",
  ).length;
  const answeredCount = activeExam.questions.filter(
    (q) => q.questionType !== "INFO" && isAnswered(q, answers),
  ).length;
  const progress =
    totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
  const optimizeHtml = (html: string) =>
    sanitizeHtml(html).replace(
      /<img /g,
      '<img loading="lazy" class="rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 max-w-full max-h-[50vh] object-contain h-auto" ',
    );

  return { formatTime, totalQuestions, answeredCount, progress, optimizeHtml, answers, isSubmitting, userLocation, isNavOpen, setIsNavOpen, hasAttemptedSubmit, showConfigIntro, setShowConfigIntro, activeExam, matchingOptionsMap, isMonitoring, monitoringLabel, isAnswered, handleSubmit, timeLeft, isCheatingLocked, cheatWarning, requestUnlock, handleAnswerChange, scrollToQuestion, answersRef };
};
