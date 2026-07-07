import { useState, useRef, useMemo, useEffect } from "react";
import { Student } from "../../types";
import { storageService } from "../../services/storage";
import { supabase } from "../../lib/supabase";


// Helper to parse "SchoolName-ClassName(Limit)" format
export const parseClassConfig = (classString: string) => {
  const match = classString.match(/^(.+?)(?:\((\d+)\))?$/);
  if (match) {
    const fullString = match[1].trim();
    const limit = match[2] ? parseInt(match[2], 10) : null;
    let schoolName = "";
    let className = fullString;

    const dashIndex = fullString.indexOf("-");
    if (dashIndex !== -1) {
      schoolName = fullString.substring(0, dashIndex).trim();
      className = fullString.substring(dashIndex + 1).trim();
    }
    return { schoolName, name: className, limit };
  }
  return { schoolName: "", name: classString, limit: null };
};
interface UseStudentEntryFormProps {
  initialCode?: string;
  onLoginSuccess: (student: Student, examCode: string) => void;
}

export const useStudentEntryForm = ({ initialCode, onLoginSuccess }: UseStudentEntryFormProps) => {
  // Logic State
  const [isLoading, setIsLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [registeredData, setRegisteredData] = useState<any[]>([]);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [pendingStudentData, setPendingStudentData] = useState<{
    cleanExamCode: string;
    studentData: Student;
  } | null>(null);

  // UI State
  const [examCode, setExamCode] = useState(initialCode || "");
  const [fullName, setFullName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [absentNumber, setAbsentNumber] = useState("");
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [error, setError] = useState("");
  const [isFocused, setIsFocused] = useState<string | null>(null);
  
  const examCodeInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Derived state for absent/NIS limit
  const { limit: absentLimit } = parseClassConfig(studentClass);

  const availableSchools = useMemo(() => {
    if (registeredData.length > 0) {
      return Array.from(
        new Set(registeredData.map((r) => r.school_name).filter(Boolean)),
      );
    }
    const schools = new Set<string>();
    availableClasses.forEach((c) => {
      const parsed = parseClassConfig(c);
      if (parsed.schoolName) schools.add(parsed.schoolName);
    });
    return Array.from(schools);
  }, [availableClasses, registeredData]);

  const filteredClasses = useMemo(() => {
    if (registeredData.length > 0) {
      if (!schoolName) return [];
      return Array.from(
        new Set(
          registeredData
            .filter((r) => r.school_name === schoolName)
            .map((r) => r.class_name)
            .filter(Boolean),
        ),
      );
    }
    if (!schoolName) return availableClasses;
    return availableClasses.filter((c) => {
      const parsed = parseClassConfig(c);
      return !parsed.schoolName || parsed.schoolName === schoolName;
    });
  }, [availableClasses, schoolName, registeredData]);

  const filteredStudents = useMemo(() => {
    if (registeredData.length > 0 && schoolName && studentClass) {
      return registeredData.filter(
        (r) =>
          r.school_name === schoolName &&
          r.class_name === studentClass &&
          r.student_name,
      );
    }
    return [];
  }, [registeredData, schoolName, studentClass]);

  // Auto-fetch config and load scoped student data when code changes
  useEffect(() => {
    let isMounted = true;
    const checkConfig = async () => {
      const cleanCode = examCode.toUpperCase().trim();
      if (cleanCode.length === 6) {
        setIsCheckingCode(true);
        // Load scoped student data for this specific exam code
        try {
          const scopedData = localStorage.getItem(`student_pref_${cleanCode}`);
          if (scopedData && isMounted) {
            const parsed = JSON.parse(scopedData);
            if (parsed.fullName) setFullName(parsed.fullName);
            if (parsed.schoolName) setSchoolName(parsed.schoolName);
            if (parsed.studentClass) setStudentClass(parsed.studentClass);
            if (parsed.absentNumber) setAbsentNumber(parsed.absentNumber);
          }
        } catch {
          /* ignore */
        }

        try {
          const config = await storageService.getExamConfig(cleanCode);
          const { data: regData } = await supabase
            .from("registered_students")
            .select("*")
            .eq("exam_code", cleanCode);

          if (!isMounted) return;

          if (regData && regData.length > 0) {
            setRegisteredData(regData);
            const schools = Array.from(
              new Set(regData.map((r) => r.school_name).filter(Boolean)),
            );
            if (schools.length === 1) {
              setSchoolName(schools[0]);
            } else if (schools.length > 1) {
              setSchoolName((prev) => (schools.includes(prev) ? prev : ""));
            }
          } else {
            setRegisteredData([]);
          }

          if (
            config &&
            config.targetClasses &&
            config.targetClasses.length > 0
          ) {
            setAvailableClasses(config.targetClasses);
            setStudentClass((prev) => {
              if (prev && !config.targetClasses?.includes(prev)) return "";
              return prev;
            });

            if (!regData || regData.length === 0) {
              const schools = new Set<string>();
              config.targetClasses.forEach((c) => {
                const parsed = parseClassConfig(c);
                if (parsed.schoolName) schools.add(parsed.schoolName);
              });
              if (schools.size === 1) {
                setSchoolName(Array.from(schools)[0]);
              } else if (schools.size > 1) {
                setSchoolName((prev) => (schools.has(prev) ? prev : ""));
              }
            }
          } else {
            setAvailableClasses([]);
          }
        } catch (err) {
          console.error("Error fetching config", err);
        } finally {
          if (isMounted) setIsCheckingCode(false);
        }
      } else {
        if (isMounted) {
          setAvailableClasses([]);
          setRegisteredData([]);
          setIsCheckingCode(false);
        }
      }
    };
    checkConfig();
    return () => {
      isMounted = false;
    };
  }, [examCode]);

  useEffect(() => {
    // Logic fokus kursor cerdas
    if (initialCode) {
      const t = setTimeout(() => nameInputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => examCodeInputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [initialCode]);

  const handleQrScan = (data: string) => {
    if (data && data.length >= 6) {
      let code = data;
      try {
        if (data.startsWith("http")) {
          const url = new URL(data);
          const params = new URLSearchParams(url.search);
          if (params.has("c")) {
            code = params.get("c") || data;
          } else {
            const parts = url.pathname.split("/");
            code = parts[parts.length - 1];
          }
        }
      } catch {
        // ignore
      }
      setExamCode(code.substring(0, 6).toUpperCase());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examCode || !fullName || !studentClass || !absentNumber || !schoolName) {
      setError("Mohon lengkapi semua data");
      return;
    }

    const cleanExamCode = examCode.toUpperCase().trim();
    if (cleanExamCode.length !== 6) {
      setError("Kode ujian tidak valid (harus 6 karakter)");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const exists = await storageService.checkExamExists(cleanExamCode);
      if (!exists) {
        setError("Kode ujian tidak ditemukan atau tidak aktif");
        setIsLoading(false);
        return;
      }

      const config = await storageService.getExamConfig(cleanExamCode);

      if (
        config.targetClasses &&
        config.targetClasses.length > 0 &&
        !config.targetClasses.includes(studentClass)
      ) {
        setError(
          `Ujian ini tidak diperuntukkan bagi kelas ${studentClass}. Harap periksa kembali.`,
        );
        setIsLoading(false);
        return;
      }

      const studentId = `${cleanExamCode}_${schoolName}_${studentClass}_${absentNumber}`.replace(
        /\\s+/g,
        "_",
      );
      const studentData: Student = {
        studentId,
        fullName: fullName.trim(),
        className: studentClass,
        absentNumber,
        schoolName: schoolName.trim(),
      };

      const result = await storageService.getStudentResult(
        cleanExamCode,
        studentId,
      );
      if (result) {
        if (
          result.status === "force_closed" ||
          result.status === "completed"
        ) {
          setError(
            `Akun ini (Kelas ${studentClass}, No ${absentNumber}) sudah berstatus: ${result.status === "completed" ? "Selesai" : "Dihentikan Paksa"}. Hubungi pengawas untuk mereset sesi Anda.`,
          );
          setPendingStudentData({ cleanExamCode, studentData });
          setIsLocked(true);
          setIsLoading(false);
          return;
        }

        const currentAnswers =
          localStorage.getItem(
            `exam_local_${cleanExamCode}_${studentData.studentId}`,
          ) || "{}";
        const parsedAnswers = JSON.parse(currentAnswers);
        const hasStarted = Object.keys(parsedAnswers).length > 0;
        const savedDuration = parsedAnswers._duration;

        if (
          hasStarted &&
          !savedDuration &&
          config.detectBehavior &&
          !config.continueWithPermission
        ) {
          const deviceId =
            localStorage.getItem("deviceId") ||
            Math.random().toString(36).substring(2);
          localStorage.setItem("deviceId", deviceId);
          if (result.deviceId && result.deviceId !== deviceId) {
            setError(
              `Sesi ini sedang aktif di perangkat lain. Hubungi pengawas jika Anda ingin berpindah perangkat.`,
            );
            setPendingStudentData({ cleanExamCode, studentData });
            setIsLocked(true);
            setIsLoading(false);
            return;
          }
        }

        if (config.detectBehavior && config.continueWithPermission) {
          setError(
            `Sesi ini terkunci. Hubungi pengawas untuk meminta izin melanjutkan ujian.`,
          );
          setPendingStudentData({ cleanExamCode, studentData });
          setIsLocked(true);
          setIsLoading(false);
          return;
        }

        const deviceId =
          localStorage.getItem("deviceId") ||
          Math.random().toString(36).substring(2);
        localStorage.setItem("deviceId", deviceId);
        await supabase
          .from("results")
          .update({ device_id: deviceId })
          .eq("exam_code", cleanExamCode)
          .eq("student_id", studentId);
      } else {
        const { data: allResults } = await supabase
          .from("results")
          .select("student_name, absent_number")
          .eq("exam_code", cleanExamCode)
          .eq("class_name", studentClass);

        if (allResults) {
          const existing = allResults.find(
            (r) => r.absent_number === absentNumber,
          );
          if (existing && existing.student_name !== fullName.trim()) {
            setError(
              `Nomor urut ${absentNumber} di kelas ${studentClass} sudah terdaftar atas nama ${existing.student_name}. Hubungi pengawas.`,
            );
            setIsLoading(false);
            return;
          }
        }

        const deviceId =
          localStorage.getItem("deviceId") ||
          Math.random().toString(36).substring(2);
        localStorage.setItem("deviceId", deviceId);

        const newResult = {
          exam_code: cleanExamCode,
          student_id: studentId,
          student_name: fullName.trim(),
          class_name: studentClass,
          absent_number: absentNumber,
          school_name: schoolName.trim(),
          answers: {},
          score: 0,
          status: "in_progress",
          device_id: deviceId,
          start_time: new Date().toISOString(),
        };

        const { error: insertError } = await supabase
          .from("results")
          .insert(newResult);

        if (insertError) {
          console.error("Error creating result:", insertError);
          if (insertError.code === "23505") {
             const { error: updateError } = await supabase
              .from("results")
              .update(newResult)
              .eq("exam_code", cleanExamCode)
              .eq("student_id", studentId);
             if (updateError) {
                setError("Gagal membuat sesi ujian baru. Hubungi pengawas.");
                setIsLoading(false);
                return;
             }
          } else {
             setError("Gagal membuat sesi ujian baru. Hubungi pengawas.");
             setIsLoading(false);
             return;
          }
        }
      }

      // Save scoped preferences
      const scopedPref = {
        fullName: fullName.trim(),
        schoolName: schoolName.trim(),
        studentClass,
        absentNumber,
      };
      localStorage.setItem(`student_pref_${cleanExamCode}`, JSON.stringify(scopedPref));

      // Clear pending locks
      const lockKey = `exam_lock_${cleanExamCode}_${studentId}`;
      localStorage.removeItem(lockKey);

      onLoginSuccess(studentData, cleanExamCode);
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan. Pastikan koneksi internet stabil.");
      setIsLoading(false);
    }
  };

  const handleUnlockAndResume = async (token: string) => {
    if (!pendingStudentData) return;
    try {
      const isValid = await storageService.verifyResetToken(
        pendingStudentData.cleanExamCode,
        token,
      );
      if (isValid) {
        setIsLocked(false);
        const lockKey = `exam_lock_${pendingStudentData.cleanExamCode}_${pendingStudentData.studentData.studentId}`;
        localStorage.removeItem(lockKey);

        const deviceId =
          localStorage.getItem("deviceId") ||
          Math.random().toString(36).substring(2);
        localStorage.setItem("deviceId", deviceId);

        await supabase
          .from("results")
          .update({ device_id: deviceId })
          .eq("exam_code", pendingStudentData.cleanExamCode)
          .eq("student_id", pendingStudentData.studentData.studentId);

        onLoginSuccess(
          pendingStudentData.studentData,
          pendingStudentData.cleanExamCode,
        );
      } else {
        alert("Token tidak valid atau sudah kadaluarsa!");
      }
    } catch {
      alert("Gagal verifikasi token.");
    }
  };

  return {
    isLoading,
    isLocked,
    availableClasses,
    registeredData,
    isQrScannerOpen,
    setIsQrScannerOpen,
    examCode,
    setExamCode,
    fullName,
    setFullName,
    schoolName,
    setSchoolName,
    studentClass,
    setStudentClass,
    absentNumber,
    setAbsentNumber,
    isCheckingCode,
    error,
    isFocused,
    setIsFocused,
    examCodeInputRef,
    nameInputRef,
    absentLimit,
    availableSchools,
    filteredClasses,
    filteredStudents,
    handleQrScan,
    handleSubmit,
    handleUnlockAndResume,
    setIsLocked,
    setIsLoading
  };
};
