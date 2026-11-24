import { useEffect, useRef, useMemo, useCallback, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type {
  Exam,
  RegisteredStudentConfig,
  Result,
  TeacherProfile,
} from "../../../../types";
import { supabase } from "../../../../lib/supabase";
import { storageService } from "../../../../services/storage";
import {
  isSameStudentIdentity,
  normalizeAbsentNumber,
  normalizeClassToken,
  normalizeTextToken,
  stripClassCapacity,
  type StudentIdentityCandidate,
} from "../../../../utils/studentIdentity";

interface UseOngoingExamModalProps {
  exam: Exam | null;
  teacherProfile?: TeacherProfile;
  onClose: () => void;
  onExamFinished?: (finishedExam: Exam) => void;
  proctorToken?: string;
  isPremium?: boolean;
}

interface EditingStudentData {
  id: number;
  studentId: string;
  fullName: string;
  schoolName?: string;
  class: string;
  absentNumber: string;
}

const PAGE_SIZE = 50;

const compareAbsentSafe = (aRaw?: string, bRaw?: string): number => {
  const a = normalizeAbsentNumber(aRaw);
  const b = normalizeAbsentNumber(bRaw);
  if (!a && !b) return 0;
  if (!a || a === "-") return 1;
  if (!b || b === "-") return -1;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
};

const isResultRowEqual = (a: Result, b: Result): boolean =>
  a.id === b.id &&
  a.status === b.status &&
  (a.score ?? 0) === (b.score ?? 0) &&
  (a.correctAnswers ?? 0) === (b.correctAnswers ?? 0) &&
  (a.totalQuestions ?? 0) === (b.totalQuestions ?? 0) &&
  (a.timestamp ?? 0) === (b.timestamp ?? 0) &&
  a.student.studentId === b.student.studentId &&
  a.student.fullName === b.student.fullName &&
  a.student.class === b.student.class &&
  (a.student.schoolName || "") === (b.student.schoolName || "") &&
  (a.student.absentNumber || "") === (b.student.absentNumber || "");

export const useOngoingExamModal = ({
  exam,
  onClose,
  onExamFinished,
  proctorToken,
  isPremium,
}: UseOngoingExamModalProps) => {
  const [displayExam, setDisplayExam] = useState<Exam | null>(exam);
  const [selectedClass, setSelectedClass] = useState("ALL");
  const [selectedSchool, setSelectedSchool] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "LOCKED" | "ONLINE" | "COMPLETED"
  >("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [localResults, setLocalResults] = useState<Result[]>([]);
  const [fallbackRegisteredStudents, setFallbackRegisteredStudents] = useState<
    RegisteredStudentConfig[]
  >([]);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(
    Boolean(exam?.code),
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddTimeOpen, setIsAddTimeOpen] = useState(false);
  const [addTimeValue, setAddTimeValue] = useState<number | "">("");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isJoinQrModalOpen, setIsJoinQrModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isKisiKisiModalOpen, setIsKisiKisiModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, message: "", onConfirm: () => {} });
  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    message: string;
  }>({ isOpen: false, message: "" });

  const [generatedTokenData, setGeneratedTokenData] = useState<{
    name: string;
    token: string;
  } | null>(null);
  const [editingStudent, setEditingStudent] =
    useState<EditingStudentData | null>(null);
  const [onlineStudents, setOnlineStudents] = useState<Record<string, boolean>>(
    {},
  );
  const [broadcastCounts, setBroadcastCounts] = useState<
    Record<string, { answered: number; total: number }>
  >({});

  const processingIdsRef = useRef<Set<string>>(new Set());
  const broadcastProgressRef = useRef<
    Record<string, { answered: number; total: number; timestamp: number }>
  >({});
  const resultChannelRef = useRef<RealtimeChannel | null>(null);
  const localResultsRef = useRef<Result[]>(localResults);
  useEffect(() => {
    localResultsRef.current = localResults;
  }, [localResults]);
  const lastPollCursorRef = useRef<string | null>(null);
  const hydratedCodeRef = useRef<string | null>(null);
  const fetchedRosterCodeRef = useRef<string | null>(null);
  const lastConfigJsonRef = useRef<string>(
    exam?.config ? JSON.stringify(exam.config) : "",
  );
  const hasCompletedInitialLoadRef = useRef<boolean>(false);

  const advanceCursorFromResults = useCallback((items: Result[]) => {
    let maxTs = 0;
    for (const item of items) {
      if (typeof item.timestamp === "number" && item.timestamp > maxTs) {
        maxTs = item.timestamp;
      }
    }
    const baseTs = maxTs > 0 ? maxTs : Date.now();
    lastPollCursorRef.current = new Date(
      Math.max(0, baseTs - 2000),
    ).toISOString();
  }, []);

  useEffect(() => {
    setDisplayExam(exam);
    lastConfigJsonRef.current = exam?.config ? JSON.stringify(exam.config) : "";
    lastPollCursorRef.current = null;
    setLoadError(null);
    setFallbackRegisteredStudents([]);
    setBroadcastCounts({});
    hasCompletedInitialLoadRef.current = false;

    if (!exam?.code) {
      hydratedCodeRef.current = null;
      fetchedRosterCodeRef.current = null;
      setIsInitialLoading(false);
      return;
    }

    setIsInitialLoading(true);
    if (!exam.questionsDeferred) {
      hydratedCodeRef.current = exam.code;
    } else if (hydratedCodeRef.current !== exam.code) {
      hydratedCodeRef.current = null;
    }

    const configRoster = exam.config?.registeredStudents;
    if (
      (!configRoster || configRoster.length === 0) &&
      fetchedRosterCodeRef.current !== exam.code
    ) {
      const targetCode = exam.code;
      fetchedRosterCodeRef.current = targetCode;
      let cancelled = false;

      (async () => {
        try {
          const allRoster: RegisteredStudentConfig[] = [];
          const ROSTER_PAGE = 1000;
          let from = 0;
          while (!cancelled) {
            const { data, error } = await supabase
              .from("registered_students")
              .select("id, school_name, class_name, student_name, absent_number")
              .eq("exam_code", targetCode)
              .range(from, from + ROSTER_PAGE - 1);

            if (error || !data || data.length === 0) break;
            allRoster.push(...(data as RegisteredStudentConfig[]));
            if (data.length < ROSTER_PAGE) break;
            from += ROSTER_PAGE;
          }
          if (!cancelled && allRoster.length > 0) {
            setFallbackRegisteredStudents(allRoster);
          }
        } catch (err) {
          console.warn("Gagal memuat daftar siswa terdaftar:", err);
        }
      })();

      return () => {
        cancelled = true;
      };
    } else if (configRoster && configRoster.length > 0) {
      fetchedRosterCodeRef.current = exam.code;
    }
  }, [exam]);

  // Lazy question hydration ONLY when teacher opens Soal PDF or Kisi-Kisi preview
  useEffect(() => {
    if (!displayExam?.code) return;
    if (!isPrintModalOpen && !isKisiKisiModalOpen) return;
    if (!displayExam.questionsDeferred || hydratedCodeRef.current === displayExam.code) {
      return;
    }

    let cancelled = false;
    hydratedCodeRef.current = displayExam.code;
    storageService
      .ensureExamQuestions(displayExam)
      .then((hydrated) => {
        if (cancelled) return;
        setDisplayExam((prev) =>
          prev && prev.code === hydrated.code
            ? { ...hydrated, config: prev.config || hydrated.config }
            : prev,
        );
      })
      .catch(() => {
        if (!cancelled) {
          hydratedCodeRef.current = null;
        }
      });

    return () => {
      cancelled = true;
    };
  }, [displayExam, isPrintModalOpen, isKisiKisiModalOpen]);

  const fetchLatest = useCallback(
    async (silent = false) => {
      if (!displayExam?.code) return;
      if (!silent) setIsRefreshing(true);
      setLoadError(null);
      try {
        const includeAnswers = !displayExam.config?.disableRealtime;
        const data = await storageService.getOngoingExamResults(
          displayExam.code,
          {
            includeAnswers,
          },
        );
        setLocalResults((prev) => {
          if (
            prev.length === data.length &&
            prev.every((row, idx) => isResultRowEqual(row, data[idx]))
          ) {
            return prev;
          }
          return data;
        });
        advanceCursorFromResults(data);

        const { data: examData } = await supabase
          .from("exams")
          .select("config")
          .eq("code", displayExam.code)
          .maybeSingle();
        if (examData && examData.config) {
          const nextJson = JSON.stringify(examData.config);
          if (nextJson !== lastConfigJsonRef.current) {
            lastConfigJsonRef.current = nextJson;
            setDisplayExam((prev) =>
              prev ? { ...prev, config: examData.config } : null,
            );
          }
        }
      } catch (e) {
        console.error("Fetch failed", e);
        if (!hasCompletedInitialLoadRef.current || !silent) {
          setLoadError(
            "Gagal memuat data pemantauan. Periksa koneksi internet lalu tekan Muat Ulang.",
          );
        }
      } finally {
        hasCompletedInitialLoadRef.current = true;
        setIsInitialLoading(false);
        if (!silent) setIsRefreshing(false);
      }
    },
    [
      displayExam?.code,
      displayExam?.config?.disableRealtime,
      advanceCursorFromResults,
    ],
  );

  useEffect(() => {
    fetchLatest();

    let isDisposed = false;
    const runLightweightPoll = async () => {
      if (!displayExam?.code || isDisposed) return;
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const cursor = lastPollCursorRef.current;
        const isLargeScaleMode = Boolean(displayExam.config?.disableRealtime);

        if (!cursor) {
          const full = await storageService.getOngoingExamResults(
            displayExam.code,
            {
              includeAnswers: !isLargeScaleMode,
            },
          );
          if (!isDisposed) {
            setLocalResults((prev) => {
              if (
                prev.length === full.length &&
                prev.every((row, idx) => isResultRowEqual(row, full[idx]))
              ) {
                return prev;
              }
              return full;
            });
            advanceCursorFromResults(full);
          }
          return;
        }

        if (isLargeScaleMode) {
          // Normal Mode (disableRealtime): delta fetch lightweight columns only, zero answers & location
          const changedRows = await storageService.getOngoingExamResults(
            displayExam.code,
            {
              includeAnswers: false,
              updatedAfterIso: cursor,
            },
          );
          if (changedRows.length === 0 || isDisposed) return;

          advanceCursorFromResults(changedRows);
          setLocalResults((prev) => {
            const indexById = new Map<number, number>();
            prev.forEach((r, idx) => {
              if (typeof r.id === "number") indexById.set(r.id, idx);
            });

            let hasAnyChange = false;
            let next: Result[] | null = null;

            for (const changed of changedRows) {
              if (typeof changed.id === "number" && indexById.has(changed.id)) {
                const idx = indexById.get(changed.id)!;
                const currentItem = (next || prev)[idx];
                if (!isResultRowEqual(currentItem, changed)) {
                  if (!next) next = [...prev];
                  next[idx] = changed;
                  hasAnyChange = true;
                }
              } else {
                if (!next) next = [...prev];
                indexById.set(changed.id ?? -next.length - 1, next.length);
                next.push(changed);
                hasAnyChange = true;
              }
            }
            return hasAnyChange && next ? next : prev;
          });
          return;
        }

        // Realtime Mode Backup: delta query changed status/score since cursor
        const POLL_PAGE_SIZE = 1000;
        const changedServerRows: {
          id: number;
          status: string;
          score: number | null;
          correct_answers: number | null;
          updated_at: string;
        }[] = [];
        let from = 0;
        while (true) {
          const { data, error } = await supabase
            .from("results")
            .select("id, status, score, correct_answers, updated_at")
            .eq("exam_code", displayExam.code)
            .gt("updated_at", cursor)
            .range(from, from + POLL_PAGE_SIZE - 1);

          if (error || !data || data.length === 0) break;
          changedServerRows.push(...(data as any[]));
          if (data.length < POLL_PAGE_SIZE) break;
          from += POLL_PAGE_SIZE;
        }

        if (changedServerRows.length === 0 || isDisposed) return;

        let maxTs = 0;
        for (const r of changedServerRows) {
          if (r.updated_at) {
            const ts = new Date(r.updated_at).getTime();
            if (ts > maxTs) maxTs = ts;
          }
        }
        if (maxTs > 0) {
          lastPollCursorRef.current = new Date(
            Math.max(0, maxTs - 2000),
          ).toISOString();
        }

        const currentSnapshot = localResultsRef.current;
        const localMap = new Map<number, Result>();
        for (const r of currentSnapshot) {
          if (typeof r.id === "number") {
            localMap.set(r.id, r);
          }
        }
        const idsToFetch: number[] = [];
        const serverMap = new Map(
          changedServerRows.map((row) => [row.id, row]),
        );

        for (const serverRec of changedServerRows) {
          const localRec = localMap.get(serverRec.id);
          if (localRec) {
            if (
              localRec.status !== serverRec.status &&
              (serverRec.status === "completed" ||
                serverRec.status === "force_closed")
            ) {
              idsToFetch.push(serverRec.id);
            }
          } else {
            idsToFetch.push(serverRec.id);
          }
        }

        setLocalResults((prev) => {
          let hasAnyChange = false;
          const next = prev.map((localRec) => {
            if (typeof localRec.id !== "number") return localRec;
            const serverRec = serverMap.get(localRec.id);
            if (!serverRec) return localRec;
            const nextStatus = serverRec.status as
              | "in_progress"
              | "completed"
              | "force_closed";
            const nextScore = serverRec.score ?? 0;
            const nextCorrect = serverRec.correct_answers ?? 0;
            const nextTimestamp = serverRec.updated_at
              ? new Date(serverRec.updated_at).getTime()
              : localRec.timestamp;

            if (
              localRec.status === nextStatus &&
              (localRec.score ?? 0) === nextScore &&
              (localRec.correctAnswers ?? 0) === nextCorrect &&
              localRec.timestamp === nextTimestamp
            ) {
              return localRec;
            }
            hasAnyChange = true;
            return {
              ...localRec,
              status: nextStatus,
              score: nextScore,
              correctAnswers: nextCorrect,
              timestamp: nextTimestamp,
            };
          });
          return hasAnyChange ? next : prev;
        });

        if (idsToFetch.length > 0 && !isDisposed) {
          const DETAIL_BATCH = 200;
          const fetchedRows: Record<string, unknown>[] = [];
          for (let i = 0; i < idsToFetch.length; i += DETAIL_BATCH) {
            const { data: specificData } = await supabase
              .from("results")
              .select(
                "id, exam_code, student_id, student_name, class_name, status, score, correct_answers, total_questions, answers, updated_at",
              )
              .in("id", idsToFetch.slice(i, i + DETAIL_BATCH));
            if (specificData) {
              fetchedRows.push(
                ...(specificData as Record<string, unknown>[]),
              );
            }
          }

          if (fetchedRows.length > 0 && !isDisposed) {
            setLocalResults((current) => {
              const updated = [...current];
              fetchedRows.forEach((row) => {
                const mapped = storageService.mapRowToResult(row);
                const idx = updated.findIndex((r) => r.id === mapped.id);
                if (idx >= 0) updated[idx] = mapped;
                else updated.push(mapped);
              });
              return updated;
            });
          }
        }
      } catch (e) {
        console.error("Lightweight polling error", e);
      }
    };

    const pollInterval = setInterval(runLightweightPoll, 30000);
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        runLightweightPoll();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isDisposed = true;
      clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    displayExam?.code,
    displayExam?.config?.disableRealtime,
    fetchLatest,
    advanceCursorFromResults,
  ]);

  useEffect(() => {
    if (!displayExam?.code) return;

    const examCode = displayExam.code;

    if (displayExam.config?.disableRealtime) {
      console.log("Realtime disabled (Normal Mode). Relying on polling.");
      return;
    }

    const monitorChannel = supabase
      .channel(`exam-room-${examCode}`)
      .on("presence", { event: "sync" }, () => {
        const newState = monitorChannel.presenceState();
        const onlineMap: Record<string, boolean> = {};
        for (const key of Object.keys(newState)) {
          onlineMap[key] = true;
        }
        setOnlineStudents(onlineMap);
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "results",
          filter: `exam_code=eq.${examCode}`,
        },
        (payload) => {
          const newData = payload.new as Record<string, unknown>;
          if (newData && newData.id) {
            setLocalResults((current) => {
              const mapped = storageService.mapRowToResult(newData);
              if (current.some((r) => r.id === mapped.id)) return current;
              return [...current, mapped];
            });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "results",
          filter: `exam_code=eq.${examCode}`,
        },
        (payload) => {
          const oldData = payload.old as Record<string, unknown>;
          if (oldData && oldData.id) {
            setLocalResults((current) =>
              current.filter((r) => r.id !== oldData.id),
            );
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "results",
          filter: `exam_code=eq.${examCode}`,
        },
        (payload) => {
          const newData = payload.new as Record<string, unknown>;
          if (newData && newData.id) {
            setLocalResults((current) => {
              const updated = [...current];
              const i = updated.findIndex((r) => r.id === newData.id);
              if (i >= 0) {
                const old = updated[i];
                updated[i] = {
                  ...old,
                  status:
                    newData.status !== undefined
                      ? (newData.status as any)
                      : old.status,
                  score:
                    newData.score !== undefined
                      ? (newData.score as number)
                      : old.score,
                  correctAnswers:
                    newData.correct_answers !== undefined
                      ? (newData.correct_answers as number)
                      : old.correctAnswers,
                  totalQuestions:
                    newData.total_questions !== undefined
                      ? (newData.total_questions as number)
                      : old.totalQuestions,
                  answers:
                    newData.answers !== undefined
                      ? (newData.answers as Record<string, string>)
                      : old.answers,
                  activityLog:
                    newData.activity_log !== undefined
                      ? (newData.activity_log as string[])
                      : old.activityLog,
                  timestamp:
                    newData.updated_at !== undefined
                      ? new Date(newData.updated_at as string).getTime()
                      : old.timestamp,
                  location:
                    newData.location !== undefined
                      ? (newData.location as any)
                      : old.location,
                };
                return updated;
              }
              setTimeout(() => fetchLatest(true), 100);
              return current;
            });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "exams",
          filter: `code=eq.${examCode}`,
        },
        (payload) => {
          const newConfig = (
            payload.new as { config?: Record<string, unknown> }
          ).config;
          if (newConfig) {
            const nextJson = JSON.stringify(newConfig);
            if (nextJson !== lastConfigJsonRef.current) {
              lastConfigJsonRef.current = nextJson;
              setDisplayExam((prev) =>
                prev
                  ? { ...prev, config: newConfig as unknown as Exam["config"] }
                  : null,
              );
            }
          }
        },
      )
      .on("broadcast", { event: "student_progress" }, (payload) => {
        const { studentId, answeredCount, totalQuestions, timestamp } =
          payload.payload;
        broadcastProgressRef.current[studentId] = {
          answered: answeredCount,
          total: totalQuestions,
          timestamp,
        };
        setBroadcastCounts((prev) => {
          const existing = prev[studentId];
          if (
            existing &&
            existing.answered === answeredCount &&
            existing.total === totalQuestions
          ) {
            return prev;
          }
          return {
            ...prev,
            [studentId]: { answered: answeredCount, total: totalQuestions },
          };
        });
        setOnlineStudents((prev) =>
          prev[studentId] ? prev : { ...prev, [studentId]: true },
        );
        setLocalResults((prev) => {
          const idx = prev.findIndex((r) => r.student.studentId === studentId);
          if (
            idx >= 0 &&
            prev[idx].status === "in_progress" &&
            prev[idx].timestamp !== timestamp
          ) {
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              timestamp,
            };
            return updated;
          }
          return prev;
        });
      })
      .on("broadcast", { event: "student_submitted" }, (payload) => {
        console.log("Realtime broadcast: student_submitted");
        const studentId = payload.payload?.studentId;
        if (studentId) {
          supabase
            .from("results")
            .select(
              "id, exam_code, student_id, student_name, class_name, status, score, correct_answers, total_questions, answers, updated_at",
            )
            .eq("exam_code", examCode)
            .eq("student_id", studentId)
            .order("updated_at", { ascending: false })
            .limit(1)
            .then(({ data: specificData }) => {
              if (specificData && specificData.length > 0) {
                setLocalResults((current) => {
                  const updated = [...current];
                  const mapped = storageService.mapRowToResult(specificData[0]);
                  const i = updated.findIndex((r) => r.id === mapped.id);
                  if (i >= 0) updated[i] = mapped;
                  else updated.push(mapped);
                  return updated;
                });
              }
            });
        }
      })
      .subscribe((status) => {
        console.log(`Realtime channel status for ${examCode}:`, status);
      });

    resultChannelRef.current = monitorChannel;

    return () => {
      console.log(`Cleaning up realtime channel for ${examCode}`);
      supabase.removeChannel(monitorChannel);
    };
  }, [
    displayExam?.code,
    displayExam?.config?.disableRealtime,
    fetchLatest,
    isPremium,
  ]);

  const effectiveRegisteredStudents = useMemo(() => {
    const fromConfig = displayExam?.config?.registeredStudents;
    if (fromConfig && fromConfig.length > 0) return fromConfig;
    return fallbackRegisteredStudents;
  }, [displayExam?.config?.registeredStudents, fallbackRegisteredStudents]);

  // O(N) merge of active/completed participants + unjoined registered students ONLY (zero synthetic 1..maxAbsent rows)
  const mergedResults = useMemo(() => {
    if (!effectiveRegisteredStudents || effectiveRegisteredStudents.length === 0) {
      return localResults;
    }

    const joinedFullBuckets = new Map<string, Result[]>();
    const joinedNoAbsBuckets = new Map<string, Result[]>();

    for (const r of localResults) {
      const nameTok = normalizeTextToken(r.student.fullName);
      const classTok = normalizeClassToken(r.student.class);
      const absTok = normalizeAbsentNumber(r.student.absentNumber);
      if (nameTok && classTok) {
        const noAbsKey = `${nameTok}::${classTok}`;
        const listNoAbs = joinedNoAbsBuckets.get(noAbsKey);
        if (listNoAbs) listNoAbs.push(r);
        else joinedNoAbsBuckets.set(noAbsKey, [r]);

        if (absTok) {
          const fullKey = `${noAbsKey}::${absTok}`;
          const listFull = joinedFullBuckets.get(fullKey);
          if (listFull) listFull.push(r);
          else joinedFullBuckets.set(fullKey, [r]);
        }
      }
    }

    const seenRegisteredKeys = new Set<string>();
    const unjoinedRegistered: Result[] = [];
    const examCode = displayExam?.code || "";
    const defaultAuthorSchool = displayExam?.authorSchool || "";

    effectiveRegisteredStudents.forEach((reg, idx) => {
      const rawName = (reg.student_name || reg.fullName || "").trim();
      if (!rawName) return;

      const rawClass = reg.class_name || reg.className || "";
      const parsedClass = stripClassCapacity(rawClass);
      const cleanClass = (parsedClass.className || rawClass || "").trim() || "Lainnya";
      const cleanSchool = (
        reg.school_name ||
        reg.schoolName ||
        parsedClass.schoolName ||
        defaultAuthorSchool ||
        ""
      ).trim();
      const rawAbsent = String(reg.absent_number ?? reg.absentNumber ?? "").trim();

      const nameTok = normalizeTextToken(rawName);
      const classTok = normalizeClassToken(cleanClass);
      const absTok = normalizeAbsentNumber(rawAbsent);
      const schoolTok = normalizeTextToken(cleanSchool);

      const dedupKey = `${schoolTok}::${nameTok}::${classTok}::${absTok}`;
      if (seenRegisteredKeys.has(dedupKey)) return;
      seenRegisteredKeys.add(dedupKey);

      const candidate: StudentIdentityCandidate = {
        fullName: rawName,
        class: cleanClass,
        absentNumber: rawAbsent,
        schoolName: cleanSchool,
      };

      const noAbsKey = `${nameTok}::${classTok}`;
      let alreadyJoined = false;

      if (absTok) {
        const bucket = joinedFullBuckets.get(`${noAbsKey}::${absTok}`);
        if (bucket && bucket.some((r) => isSameStudentIdentity(r.student, candidate))) {
          alreadyJoined = true;
        }
      } else {
        const bucket = joinedNoAbsBuckets.get(noAbsKey);
        if (
          bucket &&
          bucket.some((r) => {
            const rSchool = normalizeTextToken(r.student.schoolName);
            return !schoolTok || !rSchool || rSchool === schoolTok;
          })
        ) {
          alreadyJoined = true;
        }
      }

      if (alreadyJoined) return;

      unjoinedRegistered.push({
        id: undefined,
        isPlaceholder: true,
        student: {
          studentId: `registered-${examCode}-${idx}-${classTok}-${absTok || "na"}`,
          fullName: rawName,
          schoolName: cleanSchool,
          class: cleanClass,
          absentNumber: rawAbsent || "-",
        },
        examCode,
        answers: {},
        score: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        status: undefined,
      });
    });

    if (unjoinedRegistered.length === 0) return localResults;
    return [...localResults, ...unjoinedRegistered];
  }, [
    localResults,
    effectiveRegisteredStudents,
    displayExam?.code,
    displayExam?.authorSchool,
  ]);

  const schoolScopedResults = useMemo(() => {
    if (!selectedSchool || selectedSchool === "ALL") return mergedResults;
    return mergedResults.filter((r) => r.student.schoolName === selectedSchool);
  }, [mergedResults, selectedSchool]);

  const uniqueClassesInResults = useMemo(() => {
    const classes = new Set(
      schoolScopedResults.map((r) => r.student.class || "Lainnya"),
    );
    if (displayExam?.config?.targetClasses) {
      displayExam.config.targetClasses.forEach((tc) => {
        const match = String(tc).match(/^(.+?)(?:\s*\(\s*(\d+)\s*\))?$/);
        const raw = match ? match[1].trim() : String(tc).trim();
        let cls = raw;
        let sch = "";
        const dashIdx = raw.indexOf("-");
        if (dashIdx !== -1) {
          sch = raw.substring(0, dashIdx).trim();
          cls = raw.substring(dashIdx + 1).trim();
        }
        if (
          !selectedSchool ||
          selectedSchool === "ALL" ||
          !sch ||
          sch.toLowerCase() === selectedSchool.toLowerCase()
        ) {
          if (cls) classes.add(cls);
        }
      });
    }
    return Array.from(classes).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );
  }, [schoolScopedResults, displayExam?.config?.targetClasses, selectedSchool]);

  const uniqueSchoolsInResults = useMemo(() => {
    const schools = new Set(
      mergedResults.map((r) => r.student.schoolName || "Lainnya"),
    );
    return Array.from(schools).sort((a, b) => a.localeCompare(b));
  }, [mergedResults]);

  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    schoolScopedResults.forEach((r) => {
      const cl = r.student.class || "Lainnya";
      counts[cl] = (counts[cl] || 0) + 1;
    });
    return counts;
  }, [schoolScopedResults]);

  const scopedResults = useMemo(() => {
    if (!selectedClass || selectedClass === "ALL") return schoolScopedResults;
    return schoolScopedResults.filter((r) => r.student.class === selectedClass);
  }, [schoolScopedResults, selectedClass]);

  const totalScopedCount = scopedResults.length;

  const sortedResults = useMemo(() => {
    let filtered = scopedResults;
    if (statusFilter === "LOCKED") {
      filtered = scopedResults.filter((r) => r.status === "force_closed");
    } else if (statusFilter === "ONLINE") {
      filtered = scopedResults.filter((r) => r.status === "in_progress");
    } else if (statusFilter === "COMPLETED") {
      filtered = scopedResults.filter((r) => r.status === "completed");
    }

    return [...filtered].sort((a, b) => {
      const schoolA = a.student.schoolName || "";
      const schoolB = b.student.schoolName || "";
      const schoolCompare = schoolA.localeCompare(schoolB, undefined, {
        sensitivity: "base",
      });
      if (schoolCompare !== 0) return schoolCompare;

      const classA = a.student.class || "";
      const classB = b.student.class || "";
      const classCompare = classA.localeCompare(classB, undefined, {
        numeric: true,
        sensitivity: "base",
      });
      if (classCompare !== 0) return classCompare;

      const absCompare = compareAbsentSafe(
        a.student.absentNumber,
        b.student.absentNumber,
      );
      if (absCompare !== 0) return absCompare;

      return (a.student.fullName || "").localeCompare(
        b.student.fullName || "",
        undefined,
        { sensitivity: "base" },
      );
    });
  }, [scopedResults, statusFilter]);

  const handleGenerateToken = async (
    studentId: string,
    studentName: string,
  ) => {
    if (processingIdsRef.current.has(studentId)) return;
    processingIdsRef.current.add(studentId);
    try {
      const token = await storageService.generateUnlockToken(
        displayExam?.code || "",
        studentId,
        proctorToken,
      );
      setGeneratedTokenData({ name: studentName, token });
    } catch (err) {
      const msg = err instanceof Error && err.message ? err.message : "Gagal membuat token akses.";
      setAlertDialog({ isOpen: true, message: msg });
    } finally {
      setTimeout(() => processingIdsRef.current.delete(studentId), 1000);
    }
  };

  const handleUpdateStudentSubmit = async (updated: EditingStudentData) => {
    try {
      await storageService.updateStudentData(updated.id, updated.studentId, {
        fullName: updated.fullName,
        schoolName: updated.schoolName,
        class: updated.class,
        absentNumber: updated.absentNumber,
      });
      fetchLatest(true);
      setEditingStudent(null);
      setAlertDialog({ isOpen: true, message: "Data siswa berhasil diperbarui." });
    } catch (e) {
      console.error(e);
      setAlertDialog({ isOpen: true, message: "Gagal memperbarui data siswa." });
    }
  };

  const handleDeleteStudent = (
    studentId: string,
    studentName: string,
  ) => {
    setConfirmDialog({
      isOpen: true,
      message: `Apakah Anda yakin ingin menghapus data siswa "${studentName}"? Data yang dihapus tidak dapat dikembalikan.`,
      onConfirm: async () => {
        try {
          await storageService.deleteStudentResult(
            displayExam?.code || "",
            studentId,
          );
          setLocalResults((prev) =>
            prev.filter((r) => r.student.studentId !== studentId),
          );
          fetchLatest(true);
          setAlertDialog({ isOpen: true, message: "Data siswa berhasil dihapus." });
        } catch (e) {
          console.error(e);
          setAlertDialog({ isOpen: true, message: "Gagal menghapus data siswa." });
        }
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleFinishStudentExam = async (
    studentId: string,
    studentName: string,
  ) => {
    setConfirmDialog({
      isOpen: true,
      message: `Apakah Anda yakin ingin menghentikan ujian untuk "${studentName}"? Siswa tidak akan bisa melanjutkan lagi.`,
      onConfirm: async () => {
        try {
          await storageService.finishStudentExam(
            displayExam?.code || "",
            studentId,
            proctorToken,
          );
          fetchLatest(true);
          setAlertDialog({ isOpen: true, message: "Ujian siswa berhasil dihentikan." });
        } catch (e) {
          console.error(e);
          setAlertDialog({ isOpen: true, message: "Gagal menghentikan ujian." });
        }
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleFinishAllExams = () => {
    if (!displayExam?.code) return;

    const activeCount = localResults.filter(
      (r) => r.status === "in_progress" || r.status === "force_closed",
    ).length;

    let confirmMsg = `Apakah Anda yakin ingin menghentikan ujian secara keseluruhan? SEMUA (${activeCount}) siswa akan dipaksa selesai dan ujian ini akan dipindahkan ke tab 'Ujian Selesai'.`;
    
    if (activeCount === 0) {
      confirmMsg =
        "Semua siswa telah selesai. Apakah Anda yakin ingin menutup ujian ini dan memindahkannya ke tab 'Ujian Selesai'?";
    } else {
      confirmMsg = `PERHATIAN: Masih ada ${activeCount} siswa yang sedang mengerjakan atau sesi terkunci. Menghentikan ujian akan memaksa pengumpulan jawaban mereka secara otomatis. Lanjutkan?`;
    }

    setConfirmDialog({
      isOpen: true,
      message: confirmMsg,
      onConfirm: async () => {
        setIsRefreshing(true);
        const now = new Date();
        const isoNow = now.toISOString();
        const timeNow = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

        const finishedExam: Exam = {
          ...displayExam,
          config: {
            ...displayExam.config,
            isFinished: true,
            endDate: isoNow,
            endTime: timeNow,
          },
        };

        // 1. Optimistically mark all in-progress / force-closed results as completed locally
        setLocalResults((prev) =>
          prev.map((r) =>
            r.status === "in_progress" || r.status === "force_closed"
              ? { ...r, status: "completed" as const }
              : r,
          ),
        );

        // 2. Dismiss confirm dialog immediately
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));

        // 3. Stop exam overall in backend & local cache
        try {
          await storageService.stopExamOverall(displayExam.code, finishedExam);
        } catch (e) {
          console.error("Non-fatal storage error stopping exam:", e);
        } finally {
          setIsRefreshing(false);
        }

        // 4. Notify parent dashboard to update state, close modal, and switch to Selesai tab immediately
        if (onExamFinished) {
          onExamFinished(finishedExam);
        } else {
          onClose();
        }
      },
    });
  };

  const handleAddTimeSubmit = async () => {
    if (!displayExam?.code) return;
    if (!addTimeValue || typeof addTimeValue !== "number") return;
    try {
      await storageService.extendExamTime(displayExam.code, addTimeValue);
      fetchLatest(true);
      setIsAddTimeOpen(false);
      setAddTimeValue("");
    } catch {
      setAlertDialog({ isOpen: true, message: "Gagal." });
    }
  };

  const getRelativeTime = useCallback((timestamp?: number) => {
    if (!timestamp) return "-";
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return "Baru saja";
    if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
    return `${Math.floor(diff / 3600)}j lalu`;
  }, []);

  const proctorCollab = useMemo(() => {
    const collabs = displayExam?.config?.collaborators || [];
    return collabs.find((c) => c.role === "viewer");
  }, [displayExam?.config?.collaborators]);

  const publicCollab = useMemo(() => {
    const collabs = displayExam?.config?.collaborators || [];
    return collabs.find((c) => c.role === "public");
  }, [displayExam?.config?.collaborators]);

  const proctorUrl = useMemo(() => {
    if (
      typeof window !== "undefined" &&
      displayExam?.code &&
      proctorCollab?.token
    ) {
      return `${window.location.origin}/?collab_code=${displayExam.code}&collab_token=${proctorCollab.token}`;
    }
    return "";
  }, [displayExam?.code, proctorCollab?.token]);

  const liveUrl = useMemo(() => {
    if (
      typeof window !== "undefined" &&
      displayExam?.code &&
      publicCollab?.token
    ) {
      return `${window.location.origin}/?collab_code=${displayExam.code}&collab_token=${publicCollab.token}`;
    }
    return "";
  }, [displayExam?.code, publicCollab?.token]);

  const joinUrl = useMemo(() => {
    if (typeof window !== "undefined" && displayExam?.code) {
      return `${window.location.origin}/?join=${displayExam.code}`;
    }
    return "";
  }, [displayExam?.code]);

  const isLargeScale = !!displayExam?.config?.disableRealtime;

  const lockedCount = useMemo(
    () => scopedResults.filter((r) => r.status === "force_closed").length,
    [scopedResults],
  );
  const onlineCount = useMemo(
    () => scopedResults.filter((r) => r.status === "in_progress").length,
    [scopedResults],
  );
  const completedCount = useMemo(
    () => scopedResults.filter((r) => r.status === "completed").length,
    [scopedResults],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClass, selectedSchool, statusFilter, searchQuery, displayExam?.code]);

  const filteredSortedResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedResults;
    return sortedResults.filter((r) => {
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
  }, [sortedResults, searchQuery]);

  const totalFilteredCount = filteredSortedResults.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedResults = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredSortedResults.slice(start, start + PAGE_SIZE);
  }, [filteredSortedResults, safeCurrentPage]);

  return {
    // State
    displayExam,
    selectedClass,
    selectedSchool,
    statusFilter,
    searchQuery,
    currentPage: safeCurrentPage,
    pageSize: PAGE_SIZE,
    totalPages,
    totalFilteredCount,
    paginatedResults,
    localResults,
    schoolScopedResults,
    scopedResults,
    totalScopedCount,
    classCounts,
    isInitialLoading,
    loadError,
    isRefreshing,
    isAddTimeOpen,
    addTimeValue,
    isShareModalOpen,
    isJoinQrModalOpen,
    isGuideModalOpen,
    generatedTokenData,
    editingStudent,
    onlineStudents,
    broadcastCounts,

    // Setter / UI helper methods
    setSelectedClass,
    setSelectedSchool,
    setStatusFilter,
    setSearchQuery,
    setCurrentPage,
    setIsAddTimeOpen,
    setAddTimeValue,
    setIsShareModalOpen,
    setIsJoinQrModalOpen,
    setIsGuideModalOpen,
    setEditingStudent,
    setGeneratedTokenData,

    isPrintModalOpen,
    setIsPrintModalOpen,
    isKisiKisiModalOpen,
    setIsKisiKisiModalOpen,
    confirmDialog,
    setConfirmDialog,
    alertDialog,
    setAlertDialog,
    // Async / Actions functions
    fetchLatest,
    handleGenerateToken,
    handleUpdateStudentSubmit,
    handleDeleteStudent,
    handleFinishStudentExam,
    handleFinishAllExams,
    handleAddTimeSubmit,
    getRelativeTime,

    // Cached / Computed
    proctorUrl,
    liveUrl,
    joinUrl,
    isLargeScale,
    lockedCount,
    onlineCount,
    completedCount,
    sortedResults,
    uniqueClassesInResults,
    uniqueSchoolsInResults,
  };
};
