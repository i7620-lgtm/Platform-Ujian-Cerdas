import { useEffect, useCallback, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../../lib/supabase";
import type { Exam } from "../../types";

export interface TimeLeft {
  d: number;
  h: number;
  m: number;
  s: number;
}

export interface Student {
  absentNumber: string;
  fullName: string;
  className: string;
  schoolName: string;
}

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
    const wsData = [
      ["cara penggunaan :", "1. Isi semua data pada halaman ini dengan benar."],
      ["", "2. Tambahkan Sheet Baru jika sekolah memiliki lebih dari 1 kelas."],
      [],
      ["Nama sekolah", ""],
      ["Nama kelas", "6A"],
      [],
      ["nomor absen", "nama siswa"],
      [1, "Siswa Contoh 1"],
      [2, "Siswa Contoh 2"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kelas 6A");
    XLSX.writeFile(wb, "Format_Data_Siswa.xlsx");
  }, []);

  // Upload spreadsheet data
  const handleUploadData = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });

        const allStudents: Student[] = [];
        let globalSchoolName = "";
        const allClasses: string[] = [];

        wb.SheetNames.forEach((wsname) => {
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

          let className = wsname;
          let schoolNameFromSheet = "";
          let startRow = -1;

          for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (!row) continue;

            const colA = String(row[0] || "")
              .trim()
              .toLowerCase();

            if (colA === "nama kelas") {
              className = String(row[1] || "").trim() || className;
            }
            if (colA === "nama sekolah") {
              schoolNameFromSheet =
                String(row[1] || "").trim() || schoolNameFromSheet;
            }
            if (colA === "nomor absen") {
              startRow = i + 1;
            }
          }

          if (schoolNameFromSheet) globalSchoolName = schoolNameFromSheet;
          if (
            className &&
            className !== "Sheet1" &&
            !allClasses.includes(className)
          ) {
            allClasses.push(className);
          }

          if (startRow !== -1) {
            for (let i = startRow; i < data.length; i++) {
              const row = data[i];
              if (!row) continue;
              const absentNumber = String(row[0] || "").trim();
              const fullName = String(row[1] || "").trim();

              if (fullName) {
                allStudents.push({
                  absentNumber,
                  fullName,
                  className,
                  schoolName: schoolNameFromSheet || globalSchoolName,
                });
              }
            }
          }
        });

        setStudents(allStudents);
        setParsedSchoolName(globalSchoolName);
        setParsedClasses(allClasses);

        if (allClasses.length > 0) {
          setSelectedClass(allClasses[0]);
        } else if (allStudents.length > 0) {
          const uniqueClasses = Array.from(
            new Set(allStudents.map((s) => s.className)),
          );
          if (uniqueClasses.length > 0)
            setSelectedClass(uniqueClasses[0] as string);
        }
      };
      reader.readAsBinaryString(file);
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

      if (parsedClasses.length > 0) {
        const currentTargetClasses = exam.config.targetClasses || [];
        const newClasses = parsedClasses.map(
          (c) => `${parsedSchoolName} - ${c}`,
        );

        const updatedClasses = Array.from(
          new Set([...currentTargetClasses, ...newClasses]),
        );

        if (updatedClasses.length !== currentTargetClasses.length) {
          await supabase
            .from("exams")
            .update({
              config: {
                ...exam.config,
                targetClasses: updatedClasses,
              },
            })
            .eq("code", exam.code);
        }
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
