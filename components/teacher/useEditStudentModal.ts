import { useEffect, useCallback, useState } from "react";
import type { Result } from "../../types";

interface UseEditStudentModalParams {
  result: Result;
  onSave: (
    id: number,
    oldId: string,
    newData: {
      fullName: string;
      schoolName?: string;
      class: string;
      absentNumber: string;
    },
  ) => void;
}

export const useEditStudentModal = ({
  result,
  onSave,
}: UseEditStudentModalParams) => {
  const [formData, setFormData] = useState({
    fullName: result.student.fullName,
    schoolName: result.student.schoolName || "",
    class: result.student.class,
    absentNumber: result.student.absentNumber,
  });

  const handleChange = useCallback(
    (field: keyof typeof formData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSave(result.id!, result.student.studentId, formData);
    },
    [result, onSave, formData],
  );

  return {
    formData,
    handleChange,
    handleSubmit,
  };
};
