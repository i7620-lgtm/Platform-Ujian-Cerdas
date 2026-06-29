import { useEffect, useState } from "react";
import type { UserProfile, AccountType } from "../../types";
import { storageService } from "../../services/storage";
import { supabase } from "../../lib/supabase";

export const useUserManagementView = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [newRole, setNewRole] = useState<AccountType>("guru");
  const [newSchool, setNewSchool] = useState("");
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Users
      const data = await storageService.getAllUsers();

      // 2. Fetch Exams (we need to know author_id, config)
      const { data: examsData } = await supabase
        .from("exams")
        .select("code, author_id, questions, config");

      // 3. Fetch Results
      const { data: resultsData } = await supabase
        .from("results")
        .select("exam_code, student_id, updated_at");

      // 4. Summaries
      const { data: summariesData } = await supabase
        .from("exam_summaries")
        .select("*");

      // 5. Cloud Archives (to cover any files missing from exam_summaries)
      const cloudArchives = await storageService.getArchivedList();

      // Calculate stats for each user
      const usersWithStats = data.map((user) => {
        const userExams = (examsData || []).filter(
          (e: any) => e.author_id === user.id,
        );
        const userExamCodes = userExams.map((e: any) => e.code);

        const questionsCount = userExams.reduce(
          (sum: number, e: any) =>
            sum + (Array.isArray(e.questions) ? e.questions.length : 0),
          0,
        );

        // Fetch results FOR exams authored by this user
        const userResults = (resultsData || []).filter((r: any) =>
          userExamCodes.includes(r.exam_code),
        );

        // Get summaries ONLY for exams authored by this user
        const userSummaries = (summariesData || []).filter((s: any) => {
          if (s.author_id) {
            return s.author_id === user.id;
          }
          // Fallback for legacy items without author_id
          const isOwnActiveExam = userExamCodes.includes(s.exam_code);
          return isOwnActiveExam;
        });

        // Cloud Archives authored by this user
        const userCloudArchives = cloudArchives.filter(
          (f: any) => f.metadata && f.metadata.authorId === user.id,
        );

        // Track max students & time per exam code
        const examMaxStudents: Record<string, number> = {};
        const examTimeMins: Record<string, number> = {};

        // 1. Accumulate from Summaries (can have multiple per exam)
        userSummaries.forEach((s: any) => {
          const code = s.exam_code;
          const count = Number(s.total_participants) || 0;

          if (!examMaxStudents[code]) {
            examMaxStudents[code] = 0;
            examTimeMins[code] = 0;
          }
          examMaxStudents[code] += count;

          const dbTime =
            s.total_student_time ||
            s.total_time ||
            s.access_time ||
            s.waktu_akses;
          if (dbTime) {
            examTimeMins[code] += Number(dbTime);
          } else {
            const exam = userExams.find((e: any) => e.code === code);
            const timeLimit = exam?.config?.timeLimit || 60;
            examTimeMins[code] += count * timeLimit;
          }
        });

        // 2. Fallback to Cloud Archives if summary is wiped or has fewer participants
        userCloudArchives.forEach((arch: any) => {
          const matchMeta = arch.name.match(/^(.*?)_meta_/);
          const matchSimple = arch.name.match(/^(.*?)_\d+\\.json$/);
          // the code was previously truncated to 30 chars during upload
          const code = matchMeta
            ? matchMeta[1]
            : matchSimple
              ? matchSimple[1]
              : arch.name.split("_")[0];

          // Since upload truncated it to 30, we must find the original code from userExamCodes if it was truncated
          const originalCode =
            userExamCodes.find((c: string) => c.substring(0, 30) === code) ||
            code;

          const count = Number(arch.metadata?.participantCount) || 0;

          if (
            !examMaxStudents[originalCode] ||
            examMaxStudents[originalCode] < count
          ) {
            examMaxStudents[originalCode] = count;
          }

          const archiveTime = count * 60; // fallback est for older archives without time data
          if (
            !examTimeMins[originalCode] ||
            examTimeMins[originalCode] < archiveTime
          ) {
            examTimeMins[originalCode] = archiveTime;
          }
        });

        // 3. Sum up all combined values
        const combinedStudentsCount = Object.values(examMaxStudents).reduce(
          (a, b) => a + b,
          0,
        );
        const combinedTimeMins = Object.values(examTimeMins).reduce(
          (a, b) => a + b,
          0,
        );

        // 4. Add Active Results (for exams not yet archived/summarized)
        const studentsFromResults = new Set(
          userResults
            .filter((r: any) => !examMaxStudents[r.exam_code])
            .map((r: any) => r.student_id),
        ).size;

        const uniqueStudents = studentsFromResults + combinedStudentsCount;

        let activeStudentTimeMins = 0;
        userResults.forEach((r: any) => {
          if (!examMaxStudents[r.exam_code]) {
            const exam = userExams.find((e: any) => e.code === r.exam_code);
            activeStudentTimeMins += exam?.config?.timeLimit || 60;
          }
        });

        const totalStudentTimeMins = activeStudentTimeMins + combinedTimeMins;

        // Estimate teacher access time (45 menit per ujian + waktu view hasil)
        // For exams created count we also include cloud archives, taking the max of distinct codes
        const totalExamsCreated = Math.max(
          userExams.length,
          userSummaries.length,
          userCloudArchives.length,
        );
        let teacherAccess = 0;
        if (totalExamsCreated > 0) {
          teacherAccess =
            totalExamsCreated * 45 + Math.round(uniqueStudents * 1.5);
        }
        const teacherAccessMins =
          teacherAccess > 0 ? teacherAccess : "Tidak Tercatat";

        return {
          ...user,
          stats: {
            questionsCount,
            uniqueStudents,
            totalStudentTimeMins,
            examsCount: totalExamsCreated,
            teacherAccessMins,
          },
        };
      });

      setUsers(usersWithStats);
    } catch (e) {
      console.error("Gagal memuat pengguna:", e);
      alert("Gagal memuat daftar pengguna.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (user: UserProfile) => {
    setEditingUser(user);
    setNewRole(user.accountType);
    setNewSchool(user.school || "");
    setIsPremium(user.isPremium === true || (user.isPremium as any) === "true");
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    try {
      await storageService.updateUserRole(
        editingUser.id,
        newRole,
        newSchool,
        isPremium,
      );
      setEditingUser(null);
      fetchUsers();
      alert("Pengguna berhasil diperbarui.");
    } catch (e) {
      console.error(e);
      alert("Gagal memperbarui pengguna.");
    }
  };

  return {
    users,
    isLoading,
    editingUser,
    newRole,
    newSchool,
    isPremium,
    setNewRole,
    setNewSchool,
    setIsPremium,
    setEditingUser,
    handleEditClick,
    handleSaveUser,
  };
};
