import { useState, useMemo, useEffect, useCallback } from "react";
import type { Question, Result } from "../../../types";
import { parseList, normalize, isAnswerMatch } from "../examUtils";

interface UseQuestionAnalysisItemLogicProps {
  q: Question;
  stats: { correctRate: number };
  examResults: Result[];
  onUpdateKey?: (qId: string, newKey: string) => Promise<void>;
}

export const useQuestionAnalysisItemLogic = ({
  q,
  stats,
  examResults,
  onUpdateKey,
}: UseQuestionAnalysisItemLogicProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingKey, setIsEditingKey] = useState(false);

  // Initialize tempKey based on question type
  const getInitialKey = useCallback(() => {
    if (q.questionType === "TRUE_FALSE") {
      if (q.trueFalseRows && q.trueFalseRows.length > 0)
        return JSON.stringify(q.trueFalseRows);
      // Fallback: try to parse correctAnswer if it looks like JSON array
      if (q.correctAnswer && q.correctAnswer.startsWith("["))
        return q.correctAnswer;
      return "[]";
    }
    if (q.questionType === "MATCHING") {
      if (q.matchingPairs && q.matchingPairs.length > 0)
        return JSON.stringify(q.matchingPairs);
      // Fallback: try to parse correctAnswer if it looks like JSON array
      if (q.correctAnswer && q.correctAnswer.startsWith("["))
        return q.correctAnswer;
      return "[]";
    }
    return q.correctAnswer || "";
  }, [q]);

  const [tempKey, setTempKey] = useState(getInitialKey());
  const [isSaving, setIsSaving] = useState(false);

  // Update tempKey when q changes (e.g. after save)
  useEffect(() => {
    setTempKey(getInitialKey());
  }, [getInitialKey]);

  const handleSaveKey = async () => {
    if (onUpdateKey) {
      setIsSaving(true);
      try {
        await onUpdateKey(q.id, tempKey);
        setIsEditingKey(false);
      } catch (e) {
        alert("Gagal memperbarui kunci jawaban");
        console.error(e);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const difficultyColor =
    stats.correctRate >= 80
      ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
      : stats.correctRate >= 50
        ? "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800"
        : "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800";

  const difficultyLabel =
    stats.correctRate >= 80
      ? "Mudah"
      : stats.correctRate >= 50
        ? "Sedang"
        : "Sulit";

  const distribution = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalAnswered = 0;

    examResults.forEach((r) => {
      const ans = r.answers[q.id];
      if (ans) {
        const normalizedAns = String(ans).trim();
        counts[normalizedAns] = (counts[normalizedAns] || 0) + 1;
        totalAnswered++;
      }
    });
    return { counts, totalAnswered, totalStudents: examResults.length };
  }, [examResults, q.id]);

  const correctAnswerString = useMemo(() => {
    if (q.questionType === "MULTIPLE_CHOICE") return q.correctAnswer;
    if (q.questionType === "COMPLEX_MULTIPLE_CHOICE") return q.correctAnswer;
    if (q.questionType === "FILL_IN_THE_BLANK") return q.correctAnswer;
    if (q.questionType === "TRUE_FALSE" && q.trueFalseRows) {
      const obj: Record<number, boolean> = {};
      q.trueFalseRows.forEach((r, i) => (obj[i] = r.answer));
      return JSON.stringify(obj);
    }
    if (q.questionType === "MATCHING") {
      const obj: Record<number, string> = {};
      q.matchingPairs.forEach((p, i) => (obj[i] = p.right));
      return JSON.stringify(obj);
    }
    return null;
  }, [q]);

  const isCorrectAnswer = (ans: string) => {
    if (!correctAnswerString) return false;

    if (q.questionType === "COMPLEX_MULTIPLE_CHOICE") {
      // FIX: Use parseList to safely handle JSON array comparison independent of order
      const sSet = new Set(
        parseList(ans).map((a) => normalize(a, q.questionType)),
      );
      const cSet = new Set(
        parseList(correctAnswerString).map((a) => normalize(a, q.questionType)),
      );
      return sSet.size === cSet.size && [...sSet].every((x) => cSet.has(x));
    }

    if (q.questionType === "TRUE_FALSE") {
      try {
        const ansObj = JSON.parse(ans);
        return (
          q.trueFalseRows?.every((row, idx) => {
            if (ansObj[idx] === undefined) return false;
            return ansObj[idx] === row.answer;
          }) ?? false
        );
      } catch {
        return false;
      }
    }

    if (q.questionType === "MATCHING") {
      try {
        const ansObj = JSON.parse(ans);
        return (
          q.matchingPairs?.every((pair, idx) => {
            if (ansObj[idx] === undefined) return false;
            return (
              normalize(ansObj[idx], q.questionType) ===
              normalize(pair.right, q.questionType)
            );
          }) ?? false
        );
      } catch {
        return false;
      }
    }

    if (ans === correctAnswerString) return true;
    if (
      q.questionType === "FILL_IN_THE_BLANK" ||
      q.questionType === "MULTIPLE_CHOICE"
    ) {
      return (
        normalize(ans, q.questionType) ===
        normalize(correctAnswerString, q.questionType)
      );
    }

    return false;
  };

  return { isExpanded, setIsExpanded, isEditingKey, setIsEditingKey, tempKey, setTempKey, isSaving, handleSaveKey, difficultyColor, difficultyLabel, distribution, isCorrectAnswer };
};
