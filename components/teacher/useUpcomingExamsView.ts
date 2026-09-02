import { useState } from "react";
import type { Exam, TeacherProfile } from "../../types";

interface UseUpcomingExamsViewParams {
  teacherProfile: TeacherProfile;
}

export const useUpcomingExamsView = ({
  teacherProfile,
}: UseUpcomingExamsViewParams) => {
  const [selectedInviteExam, setSelectedInviteExam] = useState<Exam | null>(
    null,
  );
  const [selectedCollaboratorExam, setSelectedCollaboratorExam] =
    useState<Exam | null>(null);

  const teacherName =
    teacherProfile.accountType === "super_admin"
      ? "Developer"
      : teacherProfile.accountType === "admin_sekolah"
        ? teacherProfile.school
        : teacherProfile.fullName;
  const schoolName = teacherProfile.school;

  const resetStore = () => {
    setSelectedInviteExam(null);
    setSelectedCollaboratorExam(null);
  };

  return {
    selectedInviteExam,
    selectedCollaboratorExam,
    setSelectedInviteExam,
    setSelectedCollaboratorExam,
    teacherName,
    schoolName,
    resetStore,
  };
};
