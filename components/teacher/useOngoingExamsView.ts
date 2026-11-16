import { useCallback, useState } from "react";
import type { Exam } from "../../types";
import { showToast } from "../../stores/feedbackStore";

interface UseOngoingExamsViewParams {
  onDuplicateExam: (exam: Exam) => void;
  setSelectedOngoingExam: (exam: Exam | null) => void;
}

export const useOngoingExamsView = ({
  onDuplicateExam,
  setSelectedOngoingExam,
}: UseOngoingExamsViewParams) => {
  const [joinQrExam, setJoinQrExam] = useState<Exam | null>(null);
  const [collabExam, setCollabExam] = useState<Exam | null>(null);

  const handleCopyJoinLink = useCallback((exam: Exam) => {
    const url = `${window.location.origin}/?join=${exam.code}`;
    navigator.clipboard.writeText(url);
    showToast("Link ujian berhasil disalin!", "success");
  }, []);

  const handleDuplicate = useCallback(
    (exam: Exam) => {
      onDuplicateExam(exam);
    },
    [onDuplicateExam],
  );

  return {
    joinQrExam,
    collabExam,
    setJoinQrExam,
    setCollabExam,
    setSelectedOngoingExam,
    handleCopyJoinLink,
    handleDuplicate,
  };
};
