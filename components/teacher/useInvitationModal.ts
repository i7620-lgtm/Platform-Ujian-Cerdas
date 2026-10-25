import { useEffect, useCallback, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Exam, DailyExamSession, ExamConfig } from "../../types";
import { calculateStudentAccess, parseTimeMinutes } from "../../utils/scheduleUtils";
import {
  toAbsoluteUtcTimestamp,
  normalizeDateString,
  detectUserIndonesianTimezone,
  getStudentTimezoneNotice,
} from "../../utils/timezoneUtils";
import {
  downloadStudentDataTemplate,
  parseStudentDataExcel,
  type StudentExcelRecord as Student,
} from "./studentDataUtils";

export interface TimeLeft {
  d: number;
  h: number;
  m: number;
  s: number;
}

export interface ClassSessionAssignment {
  mode: "existing" | "new";
  existingSessionId?: string;
  newSessionDate?: string;
  newSessionStartTime?: string;
  newSessionEndTime?: string;
}

export type { Student };

interface UseInvitationModalProps {
  isOpen: boolean;
  exam?: Exam | null;
  onClose: () => void;
}

export const useInvitationModal = ({
  isOpen,
  exam,
  onClose,
}: UseInvitationModalProps) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [showKisiKisi, setShowKisiKisi] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [parsedSchoolName, setParsedSchoolName] = useState("");
  const [parsedClasses, setParsedClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [classSessionAssignments, setClassSessionAssignments] = useState<
    Record<string, ClassSessionAssignment>
  >({});

  const updateClassSessionAssignment = useCallback(
    (className: string, update: Partial<ClassSessionAssignment>) => {
      setClassSessionAssignments((prev) => ({
        ...prev,
        [className]: {
          ...(prev[className] || { mode: "existing" }),
          ...update,
        },
      }));
    },
    [],
  );

  const resetStore = useCallback(() => {
    setTimeLeft(null);
    setIsStarted(false);
    setShowKisiKisi(false);
    setShowRegisterModal(false);
    setStudents([]);
    setParsedSchoolName("");
    setParsedClasses([]);
    setSelectedClass("");
    setIsSubmitting(false);
    setClassSessionAssignments({});
  }, []);

  // Effect: Countdown logic and reset
  useEffect(() => {
    if (!isOpen) {
      resetStore();
      return;
    }

    if (!exam) return;

    const tick = () => {
      let targetDate: number;

      const mode = exam.config.examMode || "UJIAN";
      if (mode === "PR") {
        setIsStarted(true);
        setTimeLeft(null);
        return;
      }

      if (exam.config.enableDailyWindow) {
        const access = calculateStudentAccess(exam.config, undefined, new Date());
        if (access.canAccess) {
          setIsStarted(true);
          setTimeLeft(null);
          return;
        } else if (access.nextSessionDate) {
          targetDate = access.nextSessionDate.getTime();
        } else {
          targetDate = Date.now() + 3600000;
        }
      } else {
        const dateStr = normalizeDateString(exam.config.startDate || exam.config.date);
        const startTimeStr = exam.config.startTime || "00:00";
        targetDate = toAbsoluteUtcTimestamp(dateStr, startTimeStr, exam.config.timezone || "WIB", false);
      }

      const now = new Date().getTime();
      const diff = targetDate - now;

      if (diff <= 0) {
        setIsStarted(true);
        setTimeLeft(null);
      } else {
        setIsStarted(false);
        setTimeLeft({
          d: Math.floor(diff / (1000 * 60 * 60 * 24)),
          h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((diff % (1000 * 60)) / 1000),
        });
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [isOpen, exam, resetStore]);

  // Format Start Date Text
  const getFormattedStartDate = useCallback(() => {
    if (!exam) return "";

    const mode = exam.config.examMode || "UJIAN";
    if (mode === "PR") {
      return "Dapat dikerjakan kapan saja";
    }

    try {
      const examTz = exam.config.timezone || "WIB";
      const studentTz = detectUserIndonesianTimezone();
      const rawDate = normalizeDateString(exam.config.startDate || exam.config.date);
      const startTime = exam.config.startTime || "00:00";
      const endTime = exam.config.endTime ? ` - ${exam.config.endTime}` : "";

      const [y, m, d] = rawDate.split("-").map((v) => parseInt(v, 10));
      const fakeLocalDate = new Date(y, (m || 1) - 1, d || 1);

      const datePart = fakeLocalDate.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const primaryText = `${datePart} pukul ${startTime}${endTime} ${examTz}`;
      const tzNotice = getStudentTimezoneNotice(startTime, exam.config.endTime || startTime, examTz, studentTz);

      if (tzNotice) {
        return `${primaryText} (${tzNotice})`;
      }
      return primaryText;
    } catch {
      const dateStr = exam.config.startDate || exam.config.date;
      return `${dateStr} ${exam.config.startTime || "00:00"}`;
    }
  }, [exam]);

  // Download format excel
  const handleDownloadFormat = useCallback(() => {
    downloadStudentDataTemplate("Format_Data_Siswa.xlsx");
  }, []);

  // Upload spreadsheet data
  const handleUploadData = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const parsed = await parseStudentDataExcel(file);
        setStudents(parsed.students);
        setParsedSchoolName(parsed.schoolName);
        setParsedClasses(parsed.classes);

        const classes =
          parsed.classes.length > 0
            ? parsed.classes
            : Array.from(
                new Set(
                  parsed.students.map((s) => s.className).filter(Boolean),
                ),
              );

        if (classes.length > 0) {
          setSelectedClass(classes[0]);
        }

        // Initialize session assignment for each detected class
        const initialAssignments: Record<string, ClassSessionAssignment> = {};
        const availableSessions = exam?.config?.dailySessions || [];
        const hasExistingSessions = availableSessions.length > 0;
        const defaultDate = normalizeDateString(
          exam?.config?.startDate || exam?.config?.date || "",
        );
        const defaultStart = exam?.config?.startTime || "08:00";
        const defaultEnd = exam?.config?.endTime || "10:00";

        classes.forEach((c) => {
          if (hasExistingSessions) {
            initialAssignments[c] = {
              mode: "existing",
              existingSessionId: availableSessions[0].id,
            };
          } else {
            initialAssignments[c] = {
              mode: "new",
              newSessionDate: defaultDate,
              newSessionStartTime: defaultStart,
              newSessionEndTime: defaultEnd,
            };
          }
        });
        setClassSessionAssignments(initialAssignments);
      } catch (err) {
        console.error("Gagal memproses file Excel:", err);
      }
    },
    [exam, setSelectedClass, setParsedClasses, setParsedSchoolName, setStudents],
  );

  // Handle register with Supabase backend
  const handleRegister = useCallback(async () => {
    if (!exam || !parsedSchoolName) return;

    const classesToProcess =
      parsedClasses.length > 0
        ? parsedClasses
        : Array.from(
            new Set(students.map((s) => s.className).filter(Boolean)),
          );

    // Date bounds for new sessions
    const examStartDate = normalizeDateString(
      exam.config.startDate || exam.config.date || "",
    );
    const examEndDate = normalizeDateString(
      exam.config.endDate || exam.config.date || examStartDate,
    );

    // Validate class session assignments if classes are detected
    if (classesToProcess.length > 0) {
      for (const className of classesToProcess) {
        const assignment = classSessionAssignments[className] || {
          mode:
            exam.config.dailySessions && exam.config.dailySessions.length > 0
              ? "existing"
              : "new",
          existingSessionId: exam.config.dailySessions?.[0]?.id,
          newSessionDate: examStartDate,
          newSessionStartTime: exam.config.startTime || "08:00",
          newSessionEndTime: exam.config.endTime || "10:00",
        };

        if (assignment.mode === "existing") {
          if (!assignment.existingSessionId) {
            alert(`Silakan pilih sesi untuk kelas ${className}`);
            return;
          }
        } else {
          // Mode: new session
          const sessionDate = assignment.newSessionDate || examStartDate;
          const startTime =
            assignment.newSessionStartTime || exam.config.startTime || "08:00";
          const endTime =
            assignment.newSessionEndTime || exam.config.endTime || "10:00";

          if (examStartDate && examEndDate && sessionDate) {
            if (sessionDate < examStartDate || sessionDate > examEndDate) {
              alert(
                `Tanggal sesi untuk kelas ${className} (${sessionDate}) harus berada dalam rentang ujian (${examStartDate} s.d. ${examEndDate}).`,
              );
              return;
            }
          }

          if (parseTimeMinutes(endTime) <= parseTimeMinutes(startTime)) {
            alert(
              `Jam selesai (${endTime}) harus setelah jam mulai (${startTime}) untuk kelas ${className}.`,
            );
            return;
          }
        }
      }
    }

    setIsSubmitting(true);

    try {
      let dataToInsert = [];

      if (students.length > 0) {
        dataToInsert = students.map((s) => ({
          exam_code: exam.code,
          school_name: s.schoolName || parsedSchoolName,
          class_name: s.className,
          student_name: s.fullName,
          absent_number: s.absentNumber || null,
          is_active: false,
        }));
      } else if (parsedClasses.length > 0) {
        dataToInsert = parsedClasses.map((c) => ({
          exam_code: exam.code,
          school_name: parsedSchoolName,
          class_name: c,
          student_name: null,
          absent_number: null,
          is_active: false,
        }));
      } else {
        dataToInsert = [
          {
            exam_code: exam.code,
            school_name: parsedSchoolName,
            class_name: null,
            student_name: null,
            absent_number: null,
            is_active: false,
          },
        ];
      }

      const { error: insertError } = await supabase
        .from("registered_students")
        .insert(dataToInsert);

      if (insertError) throw insertError;

      // 1. Fetch fresh config from database to ensure no race conditions and avoid stale state
      const { data: freshExam, error: fetchError } = await supabase
        .from("exams")
        .select("config")
        .eq("code", exam.code)
        .single();

      if (fetchError) {
        console.warn("Could not fetch fresh exam config, using local state:", fetchError);
      }

      const currentConfig: ExamConfig =
        (freshExam?.config as ExamConfig) || exam.config;

      // 2. Prepare merged targetClasses
      const currentTargetClasses = currentConfig.targetClasses || [];
      const newClassesWithSchool = classesToProcess.map(
        (c) => `${parsedSchoolName} - ${c}`,
      );
      const updatedClasses = Array.from(
        new Set([...currentTargetClasses, ...newClassesWithSchool]),
      );

      // 3. Prepare merged registeredStudents
      const currentRegistered = currentConfig.registeredStudents || [];
      const formattedStudents = students.map((s) => ({
        student_name: s.fullName,
        fullName: s.fullName,
        absent_number: s.absentNumber,
        absentNumber: s.absentNumber,
        class_name: s.className,
        className: s.className,
        school_name: s.schoolName || parsedSchoolName,
        schoolName: s.schoolName || parsedSchoolName,
      }));
      const updatedRegistered = [...currentRegistered, ...formattedStudents];

      // 4. Prepare merged dailySessions based on per-class assignment
      let updatedDailySessions: DailyExamSession[] = [
        ...(currentConfig.dailySessions || []),
      ];

      for (const className of classesToProcess) {
        const fullClassName = `${parsedSchoolName} - ${className}`;
        const assignment = classSessionAssignments[className] || {
          mode: updatedDailySessions.length > 0 ? "existing" : "new",
          existingSessionId: updatedDailySessions[0]?.id,
          newSessionDate: examStartDate,
          newSessionStartTime: exam.config.startTime || "08:00",
          newSessionEndTime: exam.config.endTime || "10:00",
        };

        if (assignment.mode === "existing" && assignment.existingSessionId) {
          // Add this class to the chosen existing session's targetClasses
          updatedDailySessions = updatedDailySessions.map((session) => {
            if (session.id === assignment.existingSessionId) {
              const sessionClasses = session.targetClasses || [];
              if (!sessionClasses.includes(fullClassName)) {
                return {
                  ...session,
                  targetClasses: [...sessionClasses, fullClassName],
                };
              }
            }
            return session;
          });
        } else if (assignment.mode === "new") {
          const sDate = assignment.newSessionDate || examStartDate;
          const sStart =
            assignment.newSessionStartTime || exam.config.startTime || "08:00";
          const sEnd =
            assignment.newSessionEndTime || exam.config.endTime || "10:00";
          const sessionName = `${parsedSchoolName} - ${sStart}-${sEnd}`;

          const newSession: DailyExamSession = {
            id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: sessionName,
            dateMode: sDate ? "SPECIFIC_DATE" : "ALL_DAYS",
            date: sDate,
            startTime: sStart,
            endTime: sEnd,
            targetClasses: [fullClassName],
            isGeneral: false,
          };
          updatedDailySessions.push(newSession);
        }
      }

      // 5. Update ONLY `config` column in `exams` table
      // GUARANTEE: author_id, author_school, author_name, questions, and code are NEVER included in payload,
      // guaranteeing ownership immutability and zero corruption of questions.
      const updatedConfig: ExamConfig = {
        ...currentConfig,
        targetClasses: updatedClasses,
        registeredStudents: updatedRegistered,
        dailySessions: updatedDailySessions,
        enableDailyWindow:
          updatedDailySessions.length > 0
            ? true
            : currentConfig.enableDailyWindow,
      };

      const { error: updateError } = await supabase
        .from("exams")
        .update({ config: updatedConfig })
        .eq("code", exam.code);

      if (updateError) throw updateError;

      alert("Pendaftaran sekolah dan pengaturan sesi berhasil disimpan!");
      setShowRegisterModal(false);
    } catch (error: any) {
      console.error("Error registering school:", error);
      alert(`Gagal mendaftar: ${error.message || "Terjadi kesalahan"}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    exam,
    parsedSchoolName,
    students,
    parsedClasses,
    classSessionAssignments,
    setIsSubmitting,
    setShowRegisterModal,
  ]);

  return {
    timeLeft,
    isStarted,
    showKisiKisi,
    showRegisterModal,
    students,
    parsedSchoolName,
    parsedClasses,
    selectedClass,
    isSubmitting,
    classSessionAssignments,
    updateClassSessionAssignment,
    setTimeLeft,
    setIsStarted,
    setShowKisiKisi,
    setShowRegisterModal,
    setStudents,
    setParsedSchoolName,
    setParsedClasses,
    setSelectedClass,
    setIsSubmitting,
    resetStore,
    getFormattedStartDate,
    handleDownloadFormat,
    handleUploadData,
    handleRegister,
  };
};
