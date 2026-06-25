import { useEffect, useMemo, useCallback, useState } from "react";
import type { Exam, Result, Question, TeacherProfile } from "../../../../types";
import { storageService } from "../../../../services/storage";
import { supabase } from "../../../../lib/supabase";
import {
  calculateAggregateStats,
  analyzeQuestionTypePerformance,
  parseList,
} from "../../examUtils";

interface UseFinishedExamModalProps {
  exam: Exam;
  teacherProfile: TeacherProfile;
  isOpen: boolean;
}

export const useFinishedExamModal = ({
  exam,
  teacherProfile,
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

  const fetchData = useCallback(async () => {
    if (!activeDisplayExam) return;
    setIsLoading(true);
    try {
      const data = await storageService.getResults(
        activeDisplayExam.code,
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
  }, [activeDisplayExam]);

  useEffect(() => {
    if (isOpen && activeDisplayExam) {
      fetchData();
    }
  }, [fetchData, teacherProfile, isOpen, activeDisplayExam]);

  const handleUpdateKey = async (qId: string, newKey: string) => {
    if (
      !confirm(
        "Apakah Anda yakin ingin mengubah kunci jawaban? Nilai semua siswa akan dihitung ulang.",
      )
    )
      return;
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

      alert("Kunci jawaban berhasil diperbarui.");
    } catch (e) {
      console.error(e);
      alert("Gagal memperbarui kunci jawaban: " + (e as Error).message);
    }
  };

  const handleDeleteResult = async (studentId: string, studentName: string) => {
    if (
      !confirm(
        `Hapus hasil ujian siswa "${studentName}"? Data yang dihapus tidak dapat dikembalikan.`,
      )
    )
      return;

    try {
      await storageService.deleteStudentResult(
        activeDisplayExam.code,
        studentId,
      );
      setResults(results.filter((r) => r.student.studentId !== studentId));
    } catch (e) {
      console.error("Gagal menghapus data:", e);
      alert("Gagal menghapus data siswa.");
    }
  };

  const normalize = useCallback((str: string, qType: string) => {
    const s = String(str || "");
    if (qType === "FILL_IN_THE_BLANK") {
      return s
        .replace(/<[^>]*>?/gm, "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
    }
    try {
      const div = document.createElement("div");
      div.innerHTML = s;

      div.querySelectorAll(".math-visual").forEach((el) => {
        const latex = el.getAttribute("data-latex");
        if (latex) {
          el.replaceWith(document.createTextNode(`$${latex}$`));
        } else {
          while (el.firstChild) {
            el.parentNode?.insertBefore(el.firstChild, el);
          }
          el.parentNode?.removeChild(el);
        }
      });

      return div.innerHTML.replace(/>\s+</g, "><").trim().replace(/\s+/g, " ");
    } catch {
      return s.trim().replace(/\s+/g, " ");
    }
  }, []);

  const checkAnswerStatus = useCallback(
    (q: Question, studentAnswers: Record<string, string>) => {
      const manualGradeKey = `_grade_${q.id}`;
      if (studentAnswers[manualGradeKey]) {
        return studentAnswers[manualGradeKey]; // 'CORRECT' or 'WRONG'
      }

      const ans = studentAnswers[q.id];
      if (!ans) return "EMPTY";

      const studentAns = normalize(String(ans), q.questionType);
      const correctAns = normalize(
        String(q.correctAnswer || ""),
        q.questionType,
      );

      if (
        q.questionType === "MULTIPLE_CHOICE" ||
        q.questionType === "FILL_IN_THE_BLANK"
      ) {
        return studentAns === correctAns ? "CORRECT" : "WRONG";
      } else if (q.questionType === "COMPLEX_MULTIPLE_CHOICE") {
        const sSet = new Set(
          parseList(String(ans)).map((a) => normalize(a, q.questionType)),
        );
        const cSet = new Set(
          parseList(String(q.correctAnswer || "")).map((a) =>
            normalize(a, q.questionType),
          ),
        );
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
            (pair, idx) => ansObj[idx] === pair.right,
          );
          return allCorrect ? "CORRECT" : "WRONG";
        } catch {
          return "WRONG";
        }
      }

      return "WRONG";
    },
    [normalize],
  );

  const getCalculatedStats = useCallback(
    (r: Result) => {
      let correct = 0;
      let empty = 0;
      let totalScore = 0;
      let maxPossibleScore = 0;
      const scorableQuestions = activeDisplayExam.questions.filter(
        (q) => q.questionType !== "INFO",
      );

      scorableQuestions.forEach((q) => {
        const weight = q.scoreWeight || 1;
        maxPossibleScore += weight;

        const status = checkAnswerStatus(q, r.answers);
        if (status === "CORRECT") {
          correct++;
          totalScore += weight;
        } else if (status === "EMPTY") {
          empty++;
        }
      });

      const total = scorableQuestions.length;
      const wrong = total - correct - empty;
      const score =
        maxPossibleScore > 0
          ? Math.round((totalScore / maxPossibleScore) * 100)
          : 0;
      const duration = r.completionTime || 0;

      return { correct, wrong, empty, score, duration };
    },
    [activeDisplayExam, checkAnswerStatus],
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

    let correct = 0;
    let totalScore = 0;
    let maxPossibleScore = 0;
    const scorableQuestions = activeDisplayExam.questions.filter(
      (q) => q.questionType !== "INFO",
    );
    scorableQuestions.forEach((q) => {
      const weight = q.scoreWeight || 1;
      maxPossibleScore += weight;

      const status = checkAnswerStatus(q, newAnswers);
      if (status === "CORRECT") {
        correct++;
        totalScore += weight;
      }
    });
    const newScore =
      maxPossibleScore > 0
        ? Math.round((totalScore / maxPossibleScore) * 100)
        : 0;

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
      alert("Gagal menyimpan nilai.");
      fetchData();
    }
  };

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
