import { useCallback, useState } from "react";
import type { Exam } from "../../types";

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

  const handleCopyLiveLink = useCallback((exam: Exam) => {
    const url = `${window.location.origin}/?live=${exam.code}`;
    navigator.clipboard.writeText(url);
    alert("Link Pantauan Orang Tua disalin!");
  }, []);

  const handleCopyJoinLink = useCallback((exam: Exam) => {
    const url = `${window.location.origin}/?join=${exam.code}`;
    navigator.clipboard.writeText(url);
    alert("Link ujian berhasil disalin!");
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
    handleCopyLiveLink,
    handleCopyJoinLink,
    handleDuplicate,
  };
};
