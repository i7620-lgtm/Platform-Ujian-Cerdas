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
  const [parentQrExam, setParentQrExam] = useState<Exam | null>(null);
  const [collabExam, setCollabExam] = useState<Exam | null>(null);

  const handleCopyLiveLink = useCallback((exam: Exam) => {
    const publicCollab = exam.config?.collaborators?.find((c) => c.role === "public");
    const viewerCollab = exam.config?.collaborators?.find((c) => c.role === "viewer");
    const activeCollab = publicCollab || viewerCollab;
    if (!activeCollab) {
      alert("Akses pantauan belum diaktifkan di Kelola Kolaborator.");
      return;
    }
    const url = `${window.location.origin}/?collab_code=${exam.code}&collab_token=${activeCollab.token}`;
    navigator.clipboard.writeText(url);
    alert("Link Pantauan berhasil disalin!");
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
    parentQrExam,
    collabExam,
    setJoinQrExam,
    setParentQrExam,
    setCollabExam,
    setSelectedOngoingExam,
    handleCopyLiveLink,
    handleCopyJoinLink,
    handleDuplicate,
  };
};
