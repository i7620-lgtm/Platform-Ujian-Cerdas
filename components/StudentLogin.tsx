import React from "react";
import type { ExamConfig, Result, Student } from "../types";
import { StudentEntryForm } from "./student/StudentEntryForm";

interface StudentLoginProps {
  onLoginSuccess: (examCode: string, student: Student) => void;
  onViewResult?: (
    examCode: string,
    student: Student,
    existingResult?: Result | null,
    fallbackConfig?: ExamConfig | null,
  ) => void | Promise<void>;
  onBack: () => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  initialCode?: string;
}

export const StudentLogin: React.FC<StudentLoginProps> = (props) => {
  return <StudentEntryForm {...props} />;
};
