import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Exam, Student, Result, Question, ResultStatus } from "../../types";
import { storageService } from "../../services/storage";
import { examService } from "../../services/exam";
import { supabase } from "../../lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { sanitizeHtml } from "../teacher/examUtils";
import { useExamAntiCheat } from "../../hooks/useExamAntiCheat";
import { getOvertimeGraceStatus, isOvertimeAllowedForExam } from "../../utils/scheduleUtils";
import { measureClientBandwidthBytes, detectClientDevice, countIntegrityViolations } from "../../utils/telemetryUtils";

export interface ExamDialogState {
  isOpen: boolean;
  variant: "confirm" | "info" | "warning" | "error";
  title: string;
  message: string;
  unansweredItems?: { id: string; num: number }[];
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  closeOnBackdrop?: boolean;
}

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

const getQuestionAnswersSignature = (ans?: Record<string, string> | null): string => {
  if (!ans) return "{}";
  const keys = Object.keys(ans)
    .filter((k) => !k.startsWith("_"))
    .sort();
  const clean: Record<string, string> = {};
  for (const k of keys) {
    clean[k] = ans[k];
  }
  return JSON.stringify(clean);
};

export const useStudentExamLogic = ({
  exam,
  student,
  initialData,
  onSubmit,
  onUpdate: _onUpdate,
}: UseStudentExamLogicProps) => {
  const STORAGE_KEY = `exam_local_${exam.code}_${student.studentId}`;
  const CACHED_EXAM_KEY = `exam_def_${exam.code}`;

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userLocation, setUserLocation] = useState<string>("");
  const [examDialog, setExamDialog] = useState<ExamDialogState>({
    isOpen: false,
    variant: "info",
    title: "",
    message: "",
  });

  const [isNavOpen, setIsNavOpen] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [showConfigIntro, setShowConfigIntro] = useState(true);

  const [activeExam, setActiveExam] = useState<Exam>(exam);
  const lastConfigJsonRef = useRef<string>(JSON.stringify(exam.config));
  const latestVersionRef = useRef<number>(
    typeof exam.version === "number"
      ? exam.version
      : (typeof exam.config?.version === "number" ? exam.config.version : 1)
  );

  // Grace Period Banner State (ketika jam sesi berakhir tetapi siswa masih dalam ujian dengan sisa waktu)
  const [isSessionGracePeriodActive, setIsSessionGracePeriodActive] = useState(false);
  const [sessionEndTime, setSessionEndTime] = useState<string>("");
  const hasTriggeredTeacherStopRef = useRef(false);

  const answersRef = useRef<Record<string, string>>({});
  const logRef = useRef<string[]>(initialData?.activityLog || []);
  const isSubmittingRef = useRef(false);
  const timeLeftRef = useRef(0);
  const lastBroadcastTimeRef = useRef<number>(0);
  const examRoomChannelRef = useRef<RealtimeChannel | null>(null);
  const lastSyncedSignatureRef = useRef<string>(
    getQuestionAnswersSignature(initialData?.answers)
  );
  const lastServerSyncAtRef = useRef<number>(Date.now());
  const isStateLoadedRef = useRef<boolean>(false);
  const studentResultIdRef = useRef<number | undefined>(student.resultId ?? initialData?.id);
  const isAutoSavingRef = useRef(false);

  useEffect(() => {
    const nextId = student.resultId ?? initialData?.id;
    if (typeof nextId === "number" && nextId > 0) {
      studentResultIdRef.current = nextId;
    }
  }, [student.resultId, initialData?.id]);

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
  const isPR = (activeExam.config.examMode || "").trim().toUpperCase() === "PR";
  const isMonitoring = activeExam.config.detectBehavior && !isPR;
  const monitoringLabel = activeExam.config.continueWithPermission
    ? "Diawasi & Terkunci"
    : "Diawasi Sistem";

  const isAnswered = useCallback((q: Question, currentAnswers: Record<string, string>) => {
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
  }, []);

  const executeSubmit = useCallback(
    async (status: ResultStatus = "completed") => {
      if (isSubmittingRef.current) return;

      setIsSubmitting(true);
      isSubmittingRef.current = true;

      // PADA MODE PR: Status tidak boleh force_closed (selalu completed jika selesai/ditutup)
      const currentIsPR = (activeExam.config.examMode || "").trim().toUpperCase() === "PR";
      const resolvedStatus = (currentIsPR && status === "force_closed") ? "completed" : status;

      try {
        if (resolvedStatus === "completed" || resolvedStatus === "force_closed") {
          const startTimeStr = answersRef.current["_startTime"];
          if (startTimeStr) {
            const startTime = parseInt(startTimeStr);
            const durationInSeconds = Math.floor(
              (Date.now() - startTime) / 1000,
            );
            answersRef.current["_duration"] = durationInSeconds.toString();
          }

          // Catat telemetri transfer kuota riil, perangkat/OS siswa, dan pelanggaran integritas
          try {
            const measuredBytes = measureClientBandwidthBytes();
            const device = detectClientDevice();
            const violations = countIntegrityViolations(logRef.current);
            const submissionHour = new Date().getHours();

            answersRef.current["_bandwidthBytes"] = measuredBytes.toString();
            answersRef.current["_os"] = device.os;
            answersRef.current["_device"] = device.deviceType;
            answersRef.current["_browser"] = device.browser;
            answersRef.current["_tabSwitches"] = violations.toString();
            answersRef.current["_submissionHour"] = submissionHour.toString();
          } catch (telemetryErr) {
            console.warn("Gagal merekam telemetri:", telemetryErr);
          }
        }

        const scorableCount = activeExam.questions.filter(
          (q) => q.questionType !== "INFO" && q.questionType !== "QUESTIONNAIRE",
        ).length;
        await onSubmit(
          answersRef.current,
          timeLeftRef.current,
          resolvedStatus,
          logRef.current,
          userLocation,
          { totalQuestions: scorableCount },
        );

        if (examRoomChannelRef.current) {
          examRoomChannelRef.current
            .send({
              type: "broadcast",
              event: "student_submitted",
              payload: { studentId: student.studentId, status: resolvedStatus },
            })
            .catch(() => {});
        }

        await storageService.waitForQueueSaved();

        if (
          resolvedStatus === "force_closed" &&
          !currentIsPR &&
          activeExam.config.detectBehavior &&
          activeExam.config.continueWithPermission
        ) {
          try {
            localStorage.setItem(`exam_lock_${activeExam.code}_${student.studentId}`, "1");
          } catch {
            // ignore
          }
          await storageService.saveLocalProgress(STORAGE_KEY, {
            answers: answersRef.current,
            logs: logRef.current,
            status: "force_closed",
            resultId: studentResultIdRef.current,
            lastUpdated: Date.now(),
          });
        } else {
          await storageService.clearLocalProgress(STORAGE_KEY);
        }

        try {
          localStorage.removeItem(`exam_last_q_${activeExam.code}_${student.studentId}`);
        } catch {
          // ignore
        }

        setExamDialog((prev) => ({ ...prev, isOpen: false }));
      } catch (error) {
        console.error("Submit error:", error);
        hasTriggeredTeacherStopRef.current = false;
        setIsSubmitting(false);
        isSubmittingRef.current = false;
        setExamDialog({
          isOpen: true,
          variant: "error",
          title: "Gagal Mengirim Jawaban",
          message:
            "Terjadi kendala saat mengirim jawaban ke server. Jawaban Anda masih tersimpan aman di perangkat. Pastikan internet stabil lalu coba lagi.",
          confirmLabel: "Mengerti",
          closeOnBackdrop: true,
        });
      }
    },
    [activeExam, onSubmit, userLocation, STORAGE_KEY, student.studentId],
  );

  const handleSubmit = useCallback(
    async (isAuto = false, status: ResultStatus = "completed") => {
      if (isSubmittingRef.current) return;

      if (!isAuto) {
        setHasAttemptedSubmit(true);
        const unansweredItems: { id: string; num: number }[] = [];
        let displayNum = 0;
        activeExam.questions.forEach((q) => {
          if (q.questionType === "INFO") return;
          displayNum++;
          if (!isAnswered(q, answersRef.current)) {
            unansweredItems.push({ id: q.id, num: displayNum });
          }
        });

        const unansweredCount = unansweredItems.length;
        const isOlympiadMode = Boolean(activeExam.config?.isOlympiadMode);

        setExamDialog({
          isOpen: true,
          variant: unansweredCount > 0 ? "warning" : "confirm",
          title:
            unansweredCount > 0
              ? `${unansweredCount} Soal Belum Dijawab`
              : "Kumpulkan Jawaban Ujian?",
          message:
            unansweredCount > 0
              ? isOlympiadMode
                ? `Masih ada ${unansweredCount} soal yang kosong (tanpa penalti poin). Yakin ingin mengumpulkan jawaban sekarang?`
                : `Masih ada ${unansweredCount} soal yang belum dijawab atau belum lengkap. Yakin ingin mengumpulkan sekarang?`
              : "Pastikan seluruh jawaban sudah sesuai sebelum dikumpulkan. Anda tidak dapat mengubah jawaban setelah ujian dikumpulkan.",
          unansweredItems: unansweredCount > 0 ? unansweredItems : undefined,
          confirmLabel: "Ya, Kumpulkan",
          cancelLabel: "Periksa Kembali",
          closeOnBackdrop: true,
        });
        return;
      }

      await executeSubmit(status);
    },
    [activeExam.questions, activeExam.config?.isOlympiadMode, executeSubmit, isAnswered],
  );

  const triggerTeacherForceStop = useCallback(
    (message: string, status: ResultStatus = "completed") => {
      if (
        hasTriggeredTeacherStopRef.current ||
        isSubmittingRef.current ||
        student.class === "PREVIEW"
      ) {
        return;
      }
      hasTriggeredTeacherStopRef.current = true;
      setExamDialog({
        isOpen: true,
        variant: "warning",
        title: "Ujian Dihentikan oleh Guru",
        message,
        confirmLabel: "Mengumpulkan Jawaban...",
        isLoading: true,
        closeOnBackdrop: false,
      });
      executeSubmit(status);
    },
    [executeSubmit, student.class],
  );

  const closeExamDialog = useCallback(() => {
    setExamDialog((prev) => (prev.isLoading ? prev : { ...prev, isOpen: false }));
  }, []);

  const confirmExamDialog = useCallback(() => {
    setExamDialog((prev) => ({
      ...prev,
      isOpen: false,
    }));
    executeSubmit("completed");
  }, [executeSubmit]);

  const { timeLeft } = useExamAntiCheat({
    student,
    exam: activeExam,
    initialData,
    storageKey: STORAGE_KEY,
    answersRef,
    logRef,
    timeLeftRef,
    onForceSubmit: handleSubmit,
    onTeacherForceStop: triggerTeacherForceStop,
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

          triggerTeacherForceStop(
            "Ujian telah dihentikan oleh Guru. Jawaban Anda sedang dikumpulkan otomatis.",
            "completed",
          );
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
              const newStatus = payload.new.status as ResultStatus;
              if (
                (newStatus === "completed" || newStatus === "force_closed") &&
                !isSubmittingRef.current &&
                student.class !== "PREVIEW"
              ) {
                triggerTeacherForceStop(
                  "Ujian telah dihentikan oleh Guru. Jawaban Anda sedang dikumpulkan otomatis.",
                  newStatus,
                );
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
    triggerTeacherForceStop,
  ]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    // HARD BLOCK: Ensure Realtime is ONLY enabled if disableRealtime is explicitly false.
    const isRealtimeEnabled = exam.config.disableRealtime === false;

    const applyVersionBundleUpdate = (newVersion?: number) => {
      if (typeof newVersion !== "number" || newVersion <= latestVersionRef.current) {
        return;
      }
      latestVersionRef.current = newVersion;
      examService
        .fetchLatestQuestionsBundleForStudent(exam.code, newVersion)
        .then((questions) => {
          if (questions && Array.isArray(questions)) {
            setActiveExam((current) => {
              const qMap = new Map(questions.map((q: Question) => [q.id, q]));
              const updated = current.questions.map((q) => (qMap.get(q.id) as Question) || q);
              storageService.saveLocalProgress(`edge_bundle_${exam.code}`, {
                version: newVersion,
                questions: updated,
                savedAt: Date.now(),
              }).catch(() => {});
              return {
                ...current,
                questions: updated,
                version: newVersion,
                config: { ...current.config, version: newVersion },
              };
            });
          }
        })
        .catch(() => {});
    };

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
              const nextConfigJson = JSON.stringify(newConfig);
              if (nextConfigJson !== lastConfigJsonRef.current) {
                lastConfigJsonRef.current = nextConfigJson;
                setActiveExam((prev) => ({ ...prev, config: newConfig }));
              }
            }
            const newVersion = typeof newConfig?.version === "number"
              ? newConfig.version
              : (typeof payload.new.version === "number" ? payload.new.version : undefined);
            applyVersionBundleUpdate(newVersion);
          },
        )
        .subscribe();
    }

    let pollTimeout: NodeJS.Timeout;
    let isPolling = true;

    const pollData = async () => {
      if (!isPolling) return;
      if (
        student.class !== "PREVIEW" &&
        typeof navigator !== "undefined" &&
        navigator.onLine !== false
      ) {
        try {
          // Check live exam status & config via Vercel Edge CDN meta first (fallback Supabase)
          const liveExamMeta = await storageService.checkLiveExamStatusForStudent(exam.code);
          if (liveExamMeta) {
            if (liveExamMeta.status === "closed" && !isSubmittingRef.current) {
              const currentIsPR = (activeExam.config.examMode || "").trim().toUpperCase() === "PR";
              triggerTeacherForceStop(
                "Ujian telah ditutup oleh Guru. Jawaban Anda sedang dikumpulkan otomatis.",
                currentIsPR ? "completed" : "force_closed",
              );
              return;
            }
            if (liveExamMeta.config) {
              const nextConfigJson = JSON.stringify(liveExamMeta.config);
              if (nextConfigJson !== lastConfigJsonRef.current) {
                lastConfigJsonRef.current = nextConfigJson;
                setActiveExam((prev) => ({ ...prev, config: liveExamMeta.config as Exam["config"] }));
              }
              const nextVersion = typeof liveExamMeta.config.version === "number"
                ? liveExamMeta.config.version
                : undefined;
              applyVersionBundleUpdate(nextVersion);
            }
          }

          // Lightweight status-only check on student result row
          if (student.resultId) {
            const { data: resultData } = await supabase
              .from("results")
              .select("status")
              .eq("id", student.resultId)
              .maybeSingle();
            const currentIsPR = (activeExam.config.examMode || "").trim().toUpperCase() === "PR";
            const shouldStop = resultData && (
              resultData.status === "completed" ||
              (!currentIsPR && resultData.status === "force_closed")
            );
            if (shouldStop && !isSubmittingRef.current) {
              triggerTeacherForceStop(
                "Ujian telah dihentikan oleh Guru. Jawaban Anda sedang dikumpulkan otomatis.",
                resultData.status,
              );
              return;
            }
          }
        } catch {
          /* ignore */
        }
      }

      // Calculate next interval based on time left + jitter to avoid thundering herd
      const jitterMs = Math.floor(Math.random() * 8000);
      let nextInterval = 60000 + jitterMs; // ~1 minute default
      if (timeLeftRef.current !== undefined && timeLeftRef.current <= 300) {
        nextInterval = 15000 + Math.floor(Math.random() * 4000); // ~15 seconds near finish
      }

      if (isPolling) {
        pollTimeout = setTimeout(pollData, nextInterval);
      }
    };

    // Start polling with jitter
    pollTimeout = setTimeout(pollData, 60000 + Math.floor(Math.random() * 8000));

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
    triggerTeacherForceStop,
    activeExam.config.examMode,
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
          resultId: studentResultIdRef.current,
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
        )) as { answers?: Record<string, string>; logs?: string[]; resultId?: number } | null;
        if (localData) {
          if (typeof localData.resultId === "number" && localData.resultId > 0 && !studentResultIdRef.current) {
            studentResultIdRef.current = localData.resultId;
          }
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
          let deviceId = localStorage.getItem("deviceId");
          if (!deviceId) {
            deviceId = `${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
            try { localStorage.setItem("deviceId", deviceId); } catch { /* ignore */ }
          }
          if (!loadedAnswers["_startTime"]) {
            loadedAnswers["_startTime"] = Date.now().toString();
          }
          if (!loadedAnswers["_deviceId"]) {
            loadedAnswers["_deviceId"] = deviceId;
          }
          setAnswers(loadedAnswers);
          answersRef.current = loadedAnswers;
          if (localData.logs) logRef.current = localData.logs;
          lastSyncedSignatureRef.current = initialData?.id
            ? getQuestionAnswersSignature(initialData.answers)
            : "{}";
          isStateLoadedRef.current = true;
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
          let deviceId = localStorage.getItem("deviceId");
          if (!deviceId) {
            deviceId = `${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
            try { localStorage.setItem("deviceId", deviceId); } catch { /* ignore */ }
          }
          if (!loadedAnswers["_startTime"]) {
            loadedAnswers["_startTime"] = Date.now().toString();
          }
          if (!loadedAnswers["_deviceId"]) {
            loadedAnswers["_deviceId"] = deviceId;
          }
          setAnswers(loadedAnswers);
          answersRef.current = loadedAnswers;
          lastSyncedSignatureRef.current = getQuestionAnswersSignature(loadedAnswers);
        } else {
          let deviceId = localStorage.getItem("deviceId");
          if (!deviceId) {
            deviceId = `${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
            try { localStorage.setItem("deviceId", deviceId); } catch { /* ignore */ }
          }
          const loadedAnswers = { _startTime: Date.now().toString(), _deviceId: deviceId };
          setAnswers(loadedAnswers);
          answersRef.current = loadedAnswers;
          lastSyncedSignatureRef.current = "{}";
        }
        isStateLoadedRef.current = true;
      })();
      await loadPromiseRef.current;
    };
    loadState();
  }, [STORAGE_KEY, CACHED_EXAM_KEY, initialData, exam, activeExam.questions]);

  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  // Adaptive Dirty-Checked Server Auto-Save:
  // - Normal phase: min 60s wait since session start / last server sync AND only sends if question answers changed
  // - Critical phase (remaining time <= 5% of total exam duration): reduces wait to 20s with identical dirty-check rules
  useEffect(() => {
    if (student.class === "PREVIEW") return;

    const baseCooldownMs = Math.max(
      60000,
      (Number(activeExam.config.autoSaveInterval) || 60) * 1000,
    );

    const runAutoSave = async () => {
      if (!isStateLoadedRef.current || isSubmittingRef.current || isAutoSavingRef.current) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;

      const currentAnswers = answersRef.current;
      const currentSignature = getQuestionAnswersSignature(currentAnswers);
      // Strict dirty check: no change -> zero requests sent
      if (currentSignature === lastSyncedSignatureRef.current) {
        return;
      }

      const mode = (activeExam.config.examMode || "UJIAN").trim().toUpperCase();
      const currentIsPR = mode === "PR";
      const timeLimitMin = Number(activeExam.config.timeLimit) || 0;
      const totalDurationSec = !currentIsPR && timeLimitMin > 0 ? timeLimitMin * 60 : 0;
      const currentLeft = timeLeftRef.current;
      const isLastFivePercent =
        totalDurationSec > 0 &&
        typeof currentLeft === "number" &&
        currentLeft > 0 &&
        currentLeft !== Infinity &&
        currentLeft <= Math.ceil(totalDurationSec * 0.05);

      const cooldownMs = isLastFivePercent ? 20000 : baseCooldownMs;

      // Strict minimum cooldown wait (60s normal / 20s last 5%) before sending changes
      if (Date.now() - lastServerSyncAtRef.current < cooldownMs) {
        return;
      }

      isAutoSavingRef.current = true;
      const payloadSnapshot = { ...currentAnswers };
      try {
        const res = await storageService.autoSaveStudentAnswers({
          resultId: studentResultIdRef.current,
          examCode: activeExam.code,
          studentId: student.studentId,
          studentName: student.fullName,
          className: student.class,
          schoolName: student.schoolName || "",
          answers: payloadSnapshot,
        });

        if (res.lockedStatus && !isSubmittingRef.current) {
          handleSubmit(true, res.lockedStatus);
          return;
        }

        if (res.ok) {
          lastSyncedSignatureRef.current = currentSignature;
          lastServerSyncAtRef.current = Date.now();
          if (typeof res.resultId === "number" && res.resultId > 0) {
            studentResultIdRef.current = res.resultId;
            storageService.saveLocalProgress(STORAGE_KEY, {
              answers: answersRef.current,
              logs: logRef.current,
              resultId: res.resultId,
              lastUpdated: Date.now(),
            }).catch(() => {});
            try {
              const rawSession = localStorage.getItem("ujiancerdas_active_exam_session");
              if (rawSession) {
                const parsed = JSON.parse(rawSession);
                if (parsed?.student) {
                  parsed.student.resultId = res.resultId;
                  localStorage.setItem("ujiancerdas_active_exam_session", JSON.stringify(parsed));
                }
              }
            } catch {
              // ignore
            }
          }
        }
      } finally {
        isAutoSavingRef.current = false;
      }
    };

    const timer = setInterval(runAutoSave, 2000);
    return () => clearInterval(timer);
  }, [
    STORAGE_KEY,
    activeExam.code,
    activeExam.config.autoSaveInterval,
    activeExam.config.examMode,
    activeExam.config.timeLimit,
    handleSubmit,
    student.class,
    student.fullName,
    student.schoolName,
    student.studentId,
  ]);

  useEffect(() => {
    if (
      activeExam.config.trackLocation &&
      !isPR &&
      student.class !== "PREVIEW" &&
      "geolocation" in navigator
    ) {
      navigator.geolocation.getCurrentPosition((pos) =>
        setUserLocation(`${pos.coords.latitude}, ${pos.coords.longitude}`),
      );
    }
  }, [
    activeExam.config.trackLocation,
    isPR,
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
  }, [activeExam, student.studentId, isAnswered]);

  const handleAnswerChange = useCallback(
    (qId: string, val: string) => {
      setAnswers((prev) => {
        const next = { ...prev, [qId]: val };
        answersRef.current = next;
        if (student.class !== "PREVIEW") {
          storageService.saveLocalProgress(STORAGE_KEY, {
            answers: next,
            logs: logRef.current,
            resultId: studentResultIdRef.current,
            lastUpdated: Date.now(),
          });
          try {
            localStorage.setItem(`exam_last_q_${activeExam.code}_${student.studentId}`, qId);
          } catch {
            // ignore
          }
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
      activeExam.code,
      activeExam.config.disableRealtime,
      broadcastProgress,
      student.class,
      student.studentId,
    ],
  );

  const scrollToQuestion = useCallback((id: string) => {
    setIsNavOpen(false);
    try {
      localStorage.setItem(`exam_last_q_${activeExam.code}_${student.studentId}`, id);
    } catch {
      // ignore
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeExam.code, student.studentId]);

  const formatTime = (s: number) => {
    if (s === Infinity) return "Tanpa Batas Waktu";
    const h = Math.floor(s / 3600),
      m = Math.floor((s % 3600) / 60),
      sec = s % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
      : `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const totalQuestions = useMemo(
    () => activeExam.questions.filter((q) => q.questionType !== "INFO").length,
    [activeExam.questions],
  );
  const answeredCount = useMemo(
    () =>
      activeExam.questions.filter(
        (q) => q.questionType !== "INFO" && isAnswered(q, answers),
      ).length,
    [activeExam.questions, answers, isAnswered],
  );
  const progress =
    totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const optimizeHtmlCacheRef = useRef<Map<string, string>>(new Map());
  const optimizeHtml = useCallback((html: string) => {
    if (!html) return "";
    const cached = optimizeHtmlCacheRef.current.get(html);
    if (cached !== undefined) return cached;

    let cleaned = sanitizeHtml(html);
    cleaned = cleaned.replace(
      /(?:<p[^>]*>)?\s*\\?\[\s*ai_svg(?::\s*[^\]]*)?\s*\\?\]\s*(?:<\/p>)?/gi,
      "",
    );
    // Remove leading and trailing empty paragraphs, whitespace, or linebreaks
    cleaned = cleaned.replace(
      /^(?:<p[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>\s*|<br\s*\/?>\s*)+/gi,
      "",
    );
    cleaned = cleaned.replace(
      /(?:<p[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>\s*|<br\s*\/?>\s*)+$/gi,
      "",
    );
    cleaned = cleaned.replace(
      /<img /g,
      '<img loading="lazy" class="rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 max-w-full max-h-[50vh] object-contain h-auto" ',
    );
    cleaned = cleaned.replace(
      /<video(?![^>]*\bpreload=)/gi,
      '<video preload="metadata"',
    );
    cleaned = cleaned.replace(
      /<video(?![^>]*\bplaysinline\b)/gi,
      '<video playsinline webkit-playsinline',
    );
    if (optimizeHtmlCacheRef.current.size >= 600) {
      const oldestKey = optimizeHtmlCacheRef.current.keys().next().value;
      if (oldestKey !== undefined) optimizeHtmlCacheRef.current.delete(oldestKey);
    }
    optimizeHtmlCacheRef.current.set(html, cleaned);
    return cleaned;
  }, []);

  // Activate Grace Period info banner ONLY when teacher enabled "Izinkan Kerja Lewat Waktu"
  // AND current time has passed either the daily session end time or global exam end time
  useEffect(() => {
    const mode = (activeExam.config.examMode || "UJIAN").trim().toUpperCase();
    if (
      mode === "PR" ||
      student.class === "PREVIEW" ||
      !isOvertimeAllowedForExam(activeExam.config)
    ) {
      setIsSessionGracePeriodActive(false);
      setSessionEndTime("");
      return;
    }

    const checkOvertimeGrace = () => {
      if (isSubmittingRef.current) return;
      const startTimeStr = answersRef.current["_startTime"];
      const parsedStart = startTimeStr ? parseInt(startTimeStr, 10) : NaN;
      const actualStartTimeMs =
        (!isNaN(parsedStart) && parsedStart > 0 ? parsedStart : null) ||
        initialData?.timestamp ||
        Date.now();

      const { isGraceActive, boundaryEndTimeLabel } = getOvertimeGraceStatus(
        activeExam.config,
        student.class,
        actualStartTimeMs,
        Date.now(),
      );

      if (
        isGraceActive &&
        timeLeftRef.current > 0 &&
        timeLeftRef.current !== Infinity
      ) {
        setIsSessionGracePeriodActive(true);
        setSessionEndTime(boundaryEndTimeLabel);
      } else {
        setIsSessionGracePeriodActive(false);
      }
    };

    checkOvertimeGrace();
    const interval = setInterval(checkOvertimeGrace, 3000);
    return () => clearInterval(interval);
  }, [activeExam.config, student.class, initialData?.timestamp]);

  return {
    formatTime,
    totalQuestions,
    answeredCount,
    progress,
    optimizeHtml,
    answers,
    isSubmitting,
    userLocation,
    isNavOpen,
    setIsNavOpen,
    hasAttemptedSubmit,
    showConfigIntro,
    setShowConfigIntro,
    activeExam,
    matchingOptionsMap,
    isMonitoring,
    monitoringLabel,
    isAnswered,
    handleSubmit,
    timeLeft,
    handleAnswerChange,
    scrollToQuestion,
    answersRef,
    isSessionGracePeriodActive,
    sessionEndTime,
    examDialog,
    closeExamDialog,
    confirmExamDialog,
  };
};
