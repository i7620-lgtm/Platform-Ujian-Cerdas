import { useEffect, useMemo, useCallback, useRef, useState } from "react";
import type { Exam, Result, Question, TeacherProfile } from "../../../../types";
import { storageService } from "../../../../services/storage";
import { supabase } from "../../../../lib/supabase";
import {
  calculateAggregateStats,
  analyzeQuestionTypePerformance,
  parseList,
  calculateExamScore,
  isAnswerMatch,
  normalize,
} from "../../examUtils";
import { showAlertModal, showConfirmModal, showToast } from "../../../../stores/feedbackStore";

interface UseFinishedExamModalProps {
  exam: Exam;
  teacherProfile: TeacherProfile;
  isOpen: boolean;
}

export const useFinishedExamModal = ({
  exam,
  isOpen,
}: UseFinishedExamModalProps) => {
  const [displayExam, setDisplayExam] = useState<Exam | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ANALYSIS" | "STUDENTS">(
    "ANALYSIS",
  );
  const [selectedClass, setSelectedClass] = useState("ALL");
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  const resetStore = useCallback(() => {
    setDisplayExam(null);
    setResults([]);
    setIsLoading(true);
    setActiveTab("ANALYSIS");
    setSelectedClass("ALL");
    setExpandedStudent(null);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setDisplayExam(exam);
      setActiveTab("ANALYSIS");
      setSelectedClass("ALL");
      setExpandedStudent(null);
    } else {
      resetStore();
    }
  }, [exam, isOpen, resetStore]);

  const activeDisplayExam = displayExam || exam;

  const ungradedCount = useMemo(() => {
    if (!activeDisplayExam) return 0;
    const essayQuestions = activeDisplayExam.questions.filter(
      (q) =>
        q.questionType === "ESSAY" || q.questionType === "FILL_IN_THE_BLANK",
    );
    if (essayQuestions.length === 0) return 0;
    return results.filter((r) =>
      essayQuestions.some((q) => !r.answers[`_grade_${q.id}`]),
    ).length;
  }, [results, activeDisplayExam]);

  const activeDisplayExamCodeRef = useRef<string>(exam?.code || "");
  activeDisplayExamCodeRef.current = activeDisplayExam?.code || "";

  const fetchData = useCallback(async (examCodeOverride?: string) => {
    const targetCode = examCodeOverride || activeDisplayExamCodeRef.current;
    if (!targetCode) return;
    setIsLoading(true);
    try {
      const data = await storageService.getResults(
        targetCode,
        undefined,
      );

      // SORTING LOGIC: Sort by School, then Class, then by Absent Number (from ID)
      const sortedData = data.sort((a, b) => {
        const schoolA = a.student.schoolName || "";
        const schoolB = b.student.schoolName || "";
        const schoolCompare = schoolA.localeCompare(schoolB, undefined, {
          sensitivity: "base",
        });
        if (schoolCompare !== 0) return schoolCompare;

        const classA = a.student.class || "";
        const classB = b.student.class || "";
        const c = classA.localeCompare(classB, undefined, {
          numeric: true,
          sensitivity: "base",
        });
        if (c !== 0) return c;

        const absA = parseInt(a.student.absentNumber) || 0;
        const absB = parseInt(b.student.absentNumber) || 0;
        return absA - absB;
      });

      setResults(sortedData);
    } catch (error) {
      console.error("Failed to fetch results", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && exam?.code) {
      fetchData(exam.code);
    }
  }, [fetchData, isOpen, exam?.code]);

  const handleUpdateKey = async (qId: string, newKey: string) => {
    const confirmed = await showConfirmModal({
      title: "Ubah Kunci Jawaban?",
      message: "Apakah Anda yakin ingin mengubah kunci jawaban? Nilai semua siswa akan dihitung ulang.",
      tone: "warning",
      confirmLabel: "Ubah Kunci",
    });
    if (!confirmed) return;
    try {
      await storageService.updateExamAnswerKey(
        activeDisplayExam.code,
        qId,
        newKey,
      );

      // Update local state for questions
      setDisplayExam((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          questions: prev.questions.map((q) => {
            if (q.id === qId) {
              if (q.questionType === "TRUE_FALSE") {
                try {
                  return { ...q, trueFalseRows: JSON.parse(newKey) };
                } catch {
                  return q;
                }
              } else if (q.questionType === "MATCHING") {
                try {
                  return { ...q, matchingPairs: JSON.parse(newKey) };
                } catch {
                  return q;
                }
              } else {
                return { ...q, correctAnswer: newKey };
              }
            }
            return q;
          }),
        };
      });

      // Refresh results to get new scores
      await fetchData();

      showToast("Kunci jawaban berhasil diperbarui.", "success");
    } catch (e) {
      console.error(e);
      await showAlertModal({
        title: "Gagal Memperbarui Kunci",
        message: "Gagal memperbarui kunci jawaban: " + (e as Error).message,
        tone: "danger",
      });
    }
  };

  const handleDeleteResult = async (studentId: string, studentName: string) => {
    const confirmed = await showConfirmModal({
      title: "Hapus Hasil Ujian Siswa?",
      message: `Hapus hasil ujian siswa "${studentName}"? Data yang dihapus tidak dapat dikembalikan.`,
      tone: "danger",
      confirmLabel: "Hapus Siswa",
    });
    if (!confirmed) return;

    try {
      await storageService.deleteStudentResult(
        activeDisplayExam.code,
        studentId,
      );
      setResults(results.filter((r) => r.student.studentId !== studentId));
      showToast(`Hasil ujian "${studentName}" berhasil dihapus.`, "success");
    } catch (e) {
      console.error("Gagal menghapus data:", e);
      await showAlertModal({
        title: "Gagal Menghapus Data",
        message: "Gagal menghapus data siswa.",
        tone: "danger",
      });
    }
  };

  const checkAnswerStatus = useCallback(
    (q: Question, studentAnswers: Record<string, string>) => {
      const manualGradeKey = `_grade_${q.id}`;
      if (studentAnswers[manualGradeKey]) {
        return studentAnswers[manualGradeKey]; // 'CORRECT' or 'WRONG'
      }

      const ans = studentAnswers[q.id];
      if (ans === undefined || ans === null || String(ans).trim() === "") return "EMPTY";

      if (
        q.questionType === "MULTIPLE_CHOICE" ||
        q.questionType === "FILL_IN_THE_BLANK"
      ) {
        return isAnswerMatch(q.correctAnswer, ans, q.questionType, q.options) ? "CORRECT" : "WRONG";
      } else if (q.questionType === "COMPLEX_MULTIPLE_CHOICE") {
        const studentList = parseList(String(ans), q.options);
        const correctList = parseList(String(q.correctAnswer || ""), q.options);
        const sSet = new Set(studentList.map((a) => normalize(a, q.questionType)));
        const cSet = new Set(correctList.map((a) => normalize(a, q.questionType)));
        if (sSet.size === cSet.size && [...sSet].every((x) => cSet.has(x)))
          return "CORRECT";
        return "WRONG";
      } else if (q.questionType === "TRUE_FALSE") {
        try {
          const ansObj = JSON.parse(ans);
          const allCorrect = q.trueFalseRows?.every(
            (row, idx) => ansObj[idx] === row.answer,
          );
          return allCorrect ? "CORRECT" : "WRONG";
        } catch {
          return "WRONG";
        }
      } else if (q.questionType === "MATCHING") {
        try {
          const ansObj = JSON.parse(ans);
          const allCorrect = q.matchingPairs?.every(
            (pair, idx) => isAnswerMatch(pair.right, ansObj[idx], q.questionType),
          );
          return allCorrect ? "CORRECT" : "WRONG";
        } catch {
          return "WRONG";
        }
      }

      return "WRONG";
    },
    [],
  );

  const computeStudentStats = useCallback(
    (r: Result) => {
      const grading = calculateExamScore(activeDisplayExam, r.answers || {});
      const duration = r.completionTime || 0;
      return {
        correct: grading.correctAnswers,
        wrong: grading.wrongAnswers ?? (grading.totalQuestions - grading.correctAnswers - (grading.unansweredQuestions || 0)),
        empty: grading.unansweredQuestions ?? 0,
        score: grading.score,
        duration,
        olympiadTier: grading.olympiadTier,
        maxScore: grading.maxScore,
        minScore: grading.minScore,
        correctScore: grading.correctScore,
        wrongPenalty: grading.wrongPenalty,
        emptyScore: grading.emptyScore,
      };
    },
    [activeDisplayExam],
  );

  const studentStatsMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeStudentStats>>();
    for (const r of results) {
      map.set(r.student.studentId, computeStudentStats(r));
    }
    return map;
  }, [results, computeStudentStats]);

  const getCalculatedStats = useCallback(
    (r: Result) =>
      studentStatsMap.get(r.student.studentId) ?? computeStudentStats(r),
    [studentStatsMap, computeStudentStats],
  );

  const totalStudents = results.length;

  const calculatedResults = useMemo(() => {
    return results.map((r) => getCalculatedStats(r).score);
  }, [results, getCalculatedStats]);

  const averageScore = useMemo(() => {
    return totalStudents > 0
      ? Math.round(
          calculatedResults.reduce((acc, s) => acc + s, 0) / totalStudents,
        )
      : 0;
  }, [calculatedResults, totalStudents]);

  const highestScore = useMemo(() => {
    return totalStudents > 0 ? Math.max(...calculatedResults) : 0;
  }, [calculatedResults, totalStudents]);

  const lowestScore = useMemo(() => {
    return totalStudents > 0 ? Math.min(...calculatedResults) : 0;
  }, [calculatedResults, totalStudents]);

  const validCompletionTimes = useMemo(() => {
    return results
      .filter(
        (r) => r.completionTime !== undefined && r.completionTime !== null,
      )
      .map((r) => r.completionTime as number);
  }, [results]);

  const averageCompletionTime = useMemo(() => {
    return validCompletionTimes.length > 0
      ? Math.round(
          validCompletionTimes.reduce((acc, val) => acc + val, 0) /
            validCompletionTimes.length,
        )
      : 0;
  }, [validCompletionTimes]);

  const formatDuration = useCallback((seconds: number | undefined | null) => {
    if (seconds === undefined || seconds === null) return "-";
    const s = Math.round(seconds);
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  }, []);

  const uniqueClasses = useMemo(() => {
    const classes = new Set(results.map((r) => r.student.class));
    return Array.from(classes).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
    );
  }, [results]);

  const filteredResults = useMemo(() => {
    if (selectedClass === "ALL") return results;
    return results.filter((r) => r.student.class === selectedClass);
  }, [results, selectedClass]);

  const { categoryStats, levelStats } = useMemo(() => {
    return calculateAggregateStats(activeDisplayExam, results);
  }, [activeDisplayExam, results]);

  const questionTypeStats = useMemo(() => {
    return analyzeQuestionTypePerformance(activeDisplayExam, results);
  }, [activeDisplayExam, results]);

  const questionStats = useMemo(() => {
    return activeDisplayExam.questions
      .filter((q) => q.questionType !== "INFO")
      .map((q) => {
        let correctCount = 0;
        results.forEach((r) => {
          if (checkAnswerStatus(q, r.answers) === "CORRECT") {
            correctCount++;
          }
        });
        return {
          id: q.id,
          correctRate:
            totalStudents > 0
              ? Math.round((correctCount / totalStudents) * 100)
              : 0,
        };
      });
  }, [results, activeDisplayExam, totalStudents, checkAnswerStatus]);

  const toggleStudent = useCallback(
    (id: string) => {
      if (expandedStudent === id) setExpandedStudent(null);
      else setExpandedStudent(id);
    },
    [expandedStudent],
  );

  const rateQuestion = async (
    studentResult: Result,
    qId: string,
    isCorrect: boolean,
  ) => {
    const newAnswers = {
      ...studentResult.answers,
      [`_grade_${qId}`]: isCorrect ? "CORRECT" : "WRONG",
    };

    const regrading = calculateExamScore(activeDisplayExam, newAnswers);
    const newScore = regrading.score;
    const correct = regrading.correctAnswers;

    setResults(
      results.map((r) =>
        r.student.studentId === studentResult.student.studentId
          ? {
              ...r,
              answers: newAnswers,
              score: newScore,
              correctAnswers: correct,
            }
          : r,
      ),
    );

    try {
      await supabase
        .from("results")
        .update({
          answers: newAnswers,
          score: newScore,
          correct_answers: correct,
        })
        .eq("exam_code", activeDisplayExam.code)
        .eq("student_id", studentResult.student.studentId);
    } catch (e) {
      console.error("Grading failed", e);
      await showAlertModal({
        title: "Gagal Menyimpan Nilai",
        message: "Gagal menyimpan nilai koreksi manual siswa.",
        tone: "danger",
      });
      fetchData();
    }
  };

  const isOlympiad = !!activeDisplayExam?.config?.isOlympiadMode;
  const olympiadMedalDistribution = useMemo(() => {
    if (!isOlympiad || results.length === 0) return null;
    let gold = 0, silver = 0, bronze = 0, participant = 0;
    const statsList = results.map((r) => getCalculatedStats(r));
    statsList.forEach((st) => {
      if (st.olympiadTier?.tier === "GOLD") gold++;
      else if (st.olympiadTier?.tier === "SILVER") silver++;
      else if (st.olympiadTier?.tier === "BRONZE") bronze++;
      else participant++;
    });
    const total = results.length;
    return {
      gold: { count: gold, pct: Math.round((gold / total) * 100) },
      silver: { count: silver, pct: Math.round((silver / total) * 100) },
      bronze: { count: bronze, pct: Math.round((bronze / total) * 100) },
      participant: { count: participant, pct: Math.round((participant / total) * 100) },
      maxPossibleScore: statsList[0]?.maxScore || 100,
      minPossibleScore: statsList[0]?.minScore || 0,
    };
  }, [isOlympiad, results, getCalculatedStats]);

  return {
    displayExam: activeDisplayExam,
    results,
    isLoading,
    activeTab,
    selectedClass,
    expandedStudent,
    ungradedCount,
    totalStudents,
    averageScore,
    highestScore,
    lowestScore,
    averageCompletionTime,
    uniqueClasses,
    filteredResults,
    categoryStats,
    levelStats,
    questionTypeStats,
    questionStats,
    olympiadMedalDistribution,
    setActiveTab,
    setSelectedClass,
    fetchData,
    handleUpdateKey,
    handleDeleteResult,
    normalize,
    checkAnswerStatus,
    getCalculatedStats,
    formatDuration,
    toggleStudent,
    rateQuestion,
  };
};
