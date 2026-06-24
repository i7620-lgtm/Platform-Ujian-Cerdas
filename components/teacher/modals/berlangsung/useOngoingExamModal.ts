import { useEffect, useRef, useMemo, useCallback, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Exam, Result, TeacherProfile } from "../../../../types";
import { supabase } from "../../../../lib/supabase";
import { storageService } from "../../../../services/storage";
import { parseList, normalize } from "../../examUtils";

interface UseOngoingExamModalProps {
  exam: Exam | null;
  teacherProfile?: TeacherProfile;
  onClose: () => void;
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

export const useOngoingExamModal = ({
  exam,
  teacherProfile,
  onClose,
  isPremium,
}: UseOngoingExamModalProps) => {
  const [displayExam, setDisplayExam] = useState<Exam | null>(null);
  const [selectedClass, setSelectedClass] = useState("ALL");
  const [selectedSchool, setSelectedSchool] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "LOCKED" | "ONLINE" | "COMPLETED"
  >("ALL");
  const [localResults, setLocalResults] = useState<Result[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddTimeOpen, setIsAddTimeOpen] = useState(false);
  const [addTimeValue, setAddTimeValue] = useState<number | "">("");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isJoinQrModalOpen, setIsJoinQrModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [generatedTokenData, setGeneratedTokenData] = useState<{
    name: string;
    token: string;
  } | null>(null);
  const [editingStudent, setEditingStudent] =
    useState<EditingStudentData | null>(null);
  const [onlineStudents, setOnlineStudents] = useState<Record<string, boolean>>(
    {},
  );

  const processingIdsRef = useRef<Set<string>>(new Set());
  const broadcastProgressRef = useRef<
    Record<string, { answered: number; total: number; timestamp: number }>
  >({});
  const resultChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    setDisplayExam(exam);
  }, [exam]);

  const fetchLatest = useCallback(
    async (silent = false) => {
      if (!displayExam?.code) return;
      if (!silent) setIsRefreshing(true);
      try {
        const data = await storageService.getResults(
          displayExam.code,
          selectedClass === "ALL" ? "" : selectedClass,
          selectedSchool === "ALL" ? "" : selectedSchool,
        );
        setLocalResults(data);

        const { data: examData } = await supabase
          .from("exams")
          .select("config")
          .eq("code", displayExam.code)
          .single();
        if (examData && examData.config) {
          setDisplayExam((prev) =>
            prev ? { ...prev, config: examData.config } : null,
          );
        }
      } catch (e) {
        console.error("Fetch failed", e);
      } finally {
        if (!silent) setIsRefreshing(false);
      }
    },
    [displayExam?.code, selectedClass, selectedSchool],
  );

  useEffect(() => {
    fetchLatest();

    const pollInterval = setInterval(async () => {
      if (!displayExam?.code) return;
      try {
        const { data, error } = await supabase
          .from("results")
          .select("id, status, score, correct_answers, updated_at")
          .eq("exam_code", displayExam.code);

        if (error || !data) return;

        setLocalResults((prev) => {
          const idsToFetch: number[] = [];
          const next = [...prev];

          data.forEach((serverRec) => {
            const idx = next.findIndex((r) => r.id === serverRec.id);
            if (idx >= 0) {
              const localRec = next[idx];
              if (
                localRec.status !== serverRec.status &&
                (serverRec.status === "completed" ||
                  serverRec.status === "force_closed")
              ) {
                idsToFetch.push(serverRec.id);
              }

              next[idx] = {
                ...localRec,
                status: serverRec.status as
                  | "in_progress"
                  | "completed"
                  | "force_closed",
                score: serverRec.score || 0,
                correctAnswers: serverRec.correct_answers || 0,
                timestamp: new Date(serverRec.updated_at).getTime(),
                answers: localRec.answers || {},
                completionTime: localRec.completionTime,
              };
            } else {
              idsToFetch.push(serverRec.id);
            }
          });

          if (idsToFetch.length > 0) {
            supabase
              .from("results")
              .select(
                "id, exam_code, student_id, student_name, class_name, status, score, correct_answers, total_questions, answers, updated_at, location",
              )
              .in("id", idsToFetch)
              .then(({ data: specificData }) => {
                if (specificData) {
                  setLocalResults((current) => {
                    const updated = [...current];
                    specificData.forEach((row) => {
                      const mapped = storageService.mapRowToResult(row);
                      const i = updated.findIndex((r) => r.id === mapped.id);
                      if (i >= 0) updated[i] = mapped;
                      else updated.push(mapped);
                    });
                    return updated;
                  });
                }
              });
          }

          return next;
        });
      } catch (e) {
        console.error("Lightweight polling error", e);
      }
    }, 15000);

    return () => clearInterval(pollInterval);
  }, [
    displayExam?.code,
    selectedClass,
    selectedSchool,
    teacherProfile,
    fetchLatest,
  ]);

  useEffect(() => {
    if (!displayExam?.code) return;

    const examCode = displayExam.code;

    if (!isPremium || displayExam.config.disableRealtime) {
      console.log(
        "Realtime disabled (freemium user or Normal Mode). Relying on polling.",
      );
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
        () => {
          fetchLatest(true);
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
        () => {
          fetchLatest(true);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "results",
        },
        (payload) => {
          const newData = payload.new as { exam_code?: string; id?: number };
          const oldData = payload.old as { exam_code?: string; id?: number };

          const isRelevant =
            (newData && newData.exam_code === examCode) ||
            (oldData && oldData.exam_code === examCode);

          if (!isRelevant) return;

          console.log(
            "Realtime result change (filtered):",
            (payload as any).eventType,
            newData?.id || oldData?.id,
          );
          if (newData?.id) {
            supabase
              .from("results")
              .select(
                "id, exam_code, student_id, student_name, class_name, status, score, correct_answers, total_questions, answers, updated_at, location",
              )
              .eq("id", newData.id)
              .single()
              .then(({ data: specificData }) => {
                if (specificData) {
                  setLocalResults((current) => {
                    const updated = [...current];
                    const mapped = storageService.mapRowToResult(specificData);
                    const i = updated.findIndex((r) => r.id === mapped.id);
                    if (i >= 0) updated[i] = mapped;
                    else updated.push(mapped);
                    return updated;
                  });
                }
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
            setDisplayExam((prev) =>
              prev
                ? { ...prev, config: newConfig as unknown as Exam["config"] }
                : null,
            );
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
        setLocalResults((prev) => {
          const idx = prev.findIndex((r) => r.student.studentId === studentId);
          if (idx >= 0 && prev[idx].status === "in_progress") {
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              answers: Object.fromEntries(
                Array(answeredCount)
                  .fill("placeholder")
                  .map((_, i) => [i.toString(), "placeholder"]),
              ),
              timestamp: timestamp,
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
              "id, exam_code, student_id, student_name, class_name, status, score, correct_answers, total_questions, answers, updated_at, location",
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
        } else {
          fetchLatest(true);
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

  const sortedResults = useMemo(() => {
    let filtered = [...localResults];
    if (statusFilter === "LOCKED") {
      filtered = filtered.filter((r) => r.status === "force_closed");
    } else if (statusFilter === "ONLINE") {
      filtered = filtered.filter((r) => r.status === "in_progress");
    } else if (statusFilter === "COMPLETED") {
      filtered = filtered.filter((r) => r.status === "completed");
    }

    return filtered.sort((a, b) => {
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

      const absA = parseInt(a.student.absentNumber) || 0;
      const absB = parseInt(b.student.absentNumber) || 0;
      return absA - absB;
    });
  }, [localResults, statusFilter]);

  const uniqueClassesInResults = useMemo(() => {
    const classes = new Set(
      localResults.map((r) => r.student.class || "Lainnya"),
    );
    return Array.from(classes).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );
  }, [localResults]);

  const uniqueSchoolsInResults = useMemo(() => {
    const schools = new Set(
      localResults.map((r) => r.student.schoolName || "Lainnya"),
    );
    return Array.from(schools).sort((a, b) => a.localeCompare(b, undefined));
  }, [localResults]);

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
      );
      setGeneratedTokenData({ name: studentName, token });
    } catch {
      alert("Gagal membuat token akses.");
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
      alert("Data siswa berhasil diperbarui.");
    } catch (e) {
      console.error(e);
      alert("Gagal memperbarui data siswa.");
    }
  };

  const handleDeleteStudent = async (
    studentId: string,
    studentName: string,
  ) => {
    if (
      !window.confirm(
        `Apakah Anda yakin ingin menghapus data siswa "${studentName}"? Data yang dihapus tidak dapat dikembalikan.`,
      )
    )
      return;

    try {
      await storageService.deleteStudentResult(
        displayExam?.code || "",
        studentId,
      );
      fetchLatest(true);
      alert("Data siswa berhasil dihapus.");
    } catch (e) {
      console.error(e);
      alert("Gagal menghapus data siswa.");
    }
  };

  const handleFinishStudentExam = async (
    studentId: string,
    studentName: string,
  ) => {
    if (
      !window.confirm(
        `Apakah Anda yakin ingin menghentikan ujian untuk "${studentName}"? Siswa tidak akan bisa melanjutkan lagi.`,
      )
    )
      return;
    try {
      await storageService.finishStudentExam(
        displayExam?.code || "",
        studentId,
      );
      fetchLatest(true);
      alert("Ujian siswa berhasil dihentikan.");
    } catch (e) {
      console.error(e);
      alert("Gagal menghentikan ujian.");
    }
  };

  const handleFinishAllExams = async () => {
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

    if (!window.confirm(confirmMsg)) return;

    try {
      setIsRefreshing(true);
      await storageService.stopExamOverall(displayExam.code);
      alert("Ujian berhasil dihentikan secara keseluruhan.");
      onClose();
    } catch (e) {
      console.error(e);
      alert("Gagal menghentikan ujian.");
    } finally {
      setIsRefreshing(false);
    }
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
      alert("Gagal.");
    }
  };

  const getRelativeTime = useCallback((timestamp?: number) => {
    if (!timestamp) return "-";
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return "Baru saja";
    if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
    return `${Math.floor(diff / 3600)}j lalu`;
  }, []);

  const calculateScore = useCallback(
    (r: Result) => {
      if (!displayExam) return 0;
      let correctCount = 0;
      const scorableQuestions = displayExam.questions.filter(
        (q) => q.questionType !== "INFO" && q.questionType !== "ESSAY",
      );

      scorableQuestions.forEach((q) => {
        const studentAnswer = r.answers[q.id];
        if (!studentAnswer) return;

        if (
          q.questionType === "MULTIPLE_CHOICE" ||
          q.questionType === "FILL_IN_THE_BLANK"
        ) {
          if (
            q.correctAnswer &&
            normalize(studentAnswer, q.questionType) ===
              normalize(q.correctAnswer, q.questionType)
          )
            correctCount++;
        } else if (q.questionType === "COMPLEX_MULTIPLE_CHOICE") {
          const studentSet = new Set(
            parseList(studentAnswer as string).map((a) =>
              normalize(a, q.questionType),
            ),
          );
          const correctSet = new Set(
            parseList(q.correctAnswer).map((a) => normalize(a, q.questionType)),
          );
          if (
            studentSet.size === correctSet.size &&
            [...studentSet].every((val) => correctSet.has(val))
          ) {
            correctCount++;
          }
        } else if (q.questionType === "TRUE_FALSE") {
          try {
            const ansObj = JSON.parse(studentAnswer);
            const allCorrect = q.trueFalseRows?.every(
              (row: { answer: boolean }, idx: number) => {
                if (ansObj[idx] === undefined) return false;
                return ansObj[idx] === row.answer;
              },
            );
            if (allCorrect) correctCount++;
          } catch {
            /* ignore */
          }
        } else if (q.questionType === "MATCHING") {
          try {
            const ansObj = JSON.parse(studentAnswer);
            const allCorrect = q.matchingPairs?.every(
              (pair: { right: string }, idx: number) => {
                if (ansObj[idx] === undefined) return false;
                return (
                  normalize(ansObj[idx], q.questionType) ===
                  normalize(pair.right, q.questionType)
                );
              },
            );
            if (allCorrect) correctCount++;
          } catch {
            /* ignore */
          }
        }
      });

      return scorableQuestions.length > 0
        ? Math.round((correctCount / scorableQuestions.length) * 100)
        : 0;
    },
    [displayExam],
  );

  const liveUrl = useMemo(() => {
    if (typeof window !== "undefined" && displayExam?.code) {
      return `${window.location.origin}/?live=${displayExam.code}`;
    }
    return "";
  }, [displayExam?.code]);

  const joinUrl = useMemo(() => {
    if (typeof window !== "undefined" && displayExam?.code) {
      return `${window.location.origin}/?join=${displayExam.code}`;
    }
    return "";
  }, [displayExam?.code]);

  const isLargeScale = !!displayExam?.config?.disableRealtime;

  const lockedCount = useMemo(
    () => localResults.filter((r) => r.status === "force_closed").length,
    [localResults],
  );
  const onlineCount = useMemo(
    () => localResults.filter((r) => r.status === "in_progress").length,
    [localResults],
  );
  const completedCount = useMemo(
    () => localResults.filter((r) => r.status === "completed").length,
    [localResults],
  );

  return {
    // State
    displayExam,
    selectedClass,
    selectedSchool,
    statusFilter,
    localResults,
    isRefreshing,
    isAddTimeOpen,
    addTimeValue,
    isShareModalOpen,
    isJoinQrModalOpen,
    isGuideModalOpen,
    generatedTokenData,
    editingStudent,
    onlineStudents,

    // Setter / UI helper methods
    setSelectedClass,
    setSelectedSchool,
    setStatusFilter,
    setIsAddTimeOpen,
    setAddTimeValue,
    setIsShareModalOpen,
    setIsJoinQrModalOpen,
    setIsGuideModalOpen,
    setEditingStudent,
    setGeneratedTokenData,

    // Async / Actions functions
    fetchLatest,
    handleGenerateToken,
    handleUpdateStudentSubmit,
    handleDeleteStudent,
    handleFinishStudentExam,
    handleFinishAllExams,
    handleAddTimeSubmit,
    getRelativeTime,
    calculateScore,

    // Cached / Computed
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
