import React from "react";
import type { Student } from "../types";
import { StudentEntryForm } from "./student/StudentEntryForm";

interface StudentLoginProps {
  onLoginSuccess: (examCode: string, student: Student) => void;
  onBack: () => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  initialCode?: string;
}

export const StudentLogin: React.FC<StudentLoginProps> = (props) => {
  return <StudentEntryForm {...props} />;
};
