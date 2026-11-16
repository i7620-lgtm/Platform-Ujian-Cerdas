import { useCallback, useState } from "react";
import type { Exam } from "../../types";
import { showToast } from "../../stores/feedbackStore";

export const useDraftsView = () => {
  const [previewExam, setPreviewExam] = useState<Exam | null>(null);

  const handleCopyPreviewLink = useCallback((exam: Exam) => {
    const url = `${window.location.origin}/?preview=${exam.code}`;
    navigator.clipboard.writeText(url);
    showToast("Link Preview berhasil disalin!", "success");
  }, []);

  const resetStore = () => {
    setPreviewExam(null);
  };

  return {
    previewExam,
    setPreviewExam,
    handleCopyPreviewLink,
    resetStore,
  };
};
