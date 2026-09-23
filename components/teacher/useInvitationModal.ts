import { useEffect, useCallback, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Exam } from "../../types";
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

      const dateStr = exam.config.startDate || exam.config.date;

      if (dateStr.includes("T") && dateStr.length > 10) {
        targetDate = new Date(dateStr).getTime();
      } else {
        targetDate = new Date(
          `${dateStr}T${exam.config.startTime || "00:00"}`,
        ).getTime();
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
      let date: Date;
      const dateStr = exam.config.startDate || exam.config.date;
      if (dateStr.includes("T") && dateStr.length > 10) {
        date = new Date(dateStr);
      } else {
        date = new Date(`${dateStr}T${exam.config.startTime || "00:00"}`);
      }

      if (isNaN(date.getTime()))
        return `${dateStr} ${exam.config.startTime || "00:00"}`;

      const datePart = date.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const timePart = date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      let timeZoneName = "";
      try {
        const match = date
          .toLocaleTimeString("id-ID", { timeZoneName: "short" })
          .split(" ");
        if (match && match.length > 0) {
          const lastPart = match[match.length - 1];
          if (lastPart.length >= 3) {
            timeZoneName = lastPart;
          }
        }
      } catch {
        /* ignore */
      }

      if (!timeZoneName || timeZoneName.includes("GMT")) {
        const offset = -date.getTimezoneOffset() / 60;
        if (offset === 7) timeZoneName = "WIB";
        else if (offset === 8) timeZoneName = "WITA";
        else if (offset === 9) timeZoneName = "WIT";
        else timeZoneName = `GMT${offset >= 0 ? "+" : ""}${offset}`;
      }

      return `${datePart} pukul ${timePart} ${timeZoneName}`;
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

        if (parsed.classes.length > 0) {
          setSelectedClass(parsed.classes[0]);
        } else if (parsed.students.length > 0) {
          const uniqueClasses = Array.from(
            new Set(parsed.students.map((s) => s.className)),
          );
          if (uniqueClasses.length > 0)
            setSelectedClass(uniqueClasses[0] as string);
        }
      } catch (err) {
        console.error("Gagal memproses file Excel:", err);
      }
    },
    [setSelectedClass, setParsedClasses, setParsedSchoolName, setStudents],
  );

  // Handle register with Supabase backend
  const handleRegister = useCallback(async () => {
    if (!exam || !parsedSchoolName) return;
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

      const { error } = await supabase
        .from("registered_students")
        .insert(dataToInsert);

      if (error) throw error;

      if (parsedClasses.length > 0 || students.length > 0) {
        const currentTargetClasses = exam.config.targetClasses || [];
        const newClasses = parsedClasses.map(
          (c) => `${parsedSchoolName} - ${c}`,
        );

        const updatedClasses = Array.from(
          new Set([...currentTargetClasses, ...newClasses]),
        );

        const currentRegistered = exam.config.registeredStudents || [];
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

        await supabase
          .from("exams")
          .update({
            config: {
              ...exam.config,
              targetClasses: updatedClasses,
              registeredStudents: [...currentRegistered, ...formattedStudents],
            },
          })
          .eq("code", exam.code);
      }

      alert("Pendaftaran sekolah berhasil!");
      setShowRegisterModal(false);
    } catch (error: any) {
      console.error("Error registering school:", error);
      alert(`Gagal mendaftar: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    exam,
    parsedSchoolName,
    students,
    parsedClasses,
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
