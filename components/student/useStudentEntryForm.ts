import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import type { Student, ExamConfig, Result } from "../../types";
import { storageService } from "../../services/storage";
import { offlineService, type SubmissionSyncState } from "../../services/offline";
import { supabase } from "../../lib/supabase";
import { normalizeDateString } from "../../utils/timezoneUtils";
import {
  isClassMatch,
  canStudentResumeInOvertime,
  getGlobalExamEndTimestamp,
} from "../../utils/scheduleUtils";
import {
  buildCanonicalStudentId,
  buildStudentInputSignature,
  findLocalCompletedStudent,
  normalizeAbsentNumber,
  normalizeClassToken,
  normalizeTextToken,
  saveLocalCompletedStudent,
  stripClassCapacity,
} from "../../utils/studentIdentity";

// Helper to parse "SchoolName-ClassName(Limit)" format
export const parseClassConfig = (classString: string) => {
  const { schoolName, className, limit } = stripClassCapacity(classString);
  return { schoolName, name: className || classString, limit };
};

export type MatchedSessionKind =
  | "completed"
  | "queued_completed"
  | "failed_sync"
  | "force_closed"
  | "queued_force_closed";

export interface MatchedStudentSession {
  inputSignature: string;
  examCode: string;
  student: Student;
  config?: ExamConfig;
  kind: MatchedSessionKind;
  result?: Result;
  syncState?: SubmissionSyncState;
  isExamClosed: boolean;
  closureReason?: string;
  allowRetakes: boolean;
  isPR: boolean;
  canResumeOvertime: boolean;
}

export interface RetakeChoiceState {
  examCode: string;
  student: Student;
  config: ExamConfig;
  result?: Result;
  isExamClosed: boolean;
  closureReason?: string;
  isQueuedOnly?: boolean;
}

interface UseStudentEntryFormProps {
  initialCode?: string;
  onLoginSuccess: (examCode: string, student: Student) => void;
  onViewResult?: (
    examCode: string,
    student: Student,
    existingResult?: Result | null,
    fallbackConfig?: ExamConfig | null,
  ) => void | Promise<void>;
}

const buildClosedStatus = (
  config?: ExamConfig,
  existingStatus?: string,
  existingStartMs?: number | null,
): { isExamClosed: boolean; closureReason?: string; canResumeOvertime: boolean; isPR: boolean } => {
  if (!config) {
    return { isExamClosed: false, canResumeOvertime: false, isPR: false };
  }
  const mode = (config.examMode || "UJIAN").trim().toUpperCase();
  const isPR = mode === "PR";
  const canResumeOvertime =
    !config.isFinished &&
    canStudentResumeInOvertime(config, existingStatus, existingStartMs, Date.now());

  if (config.isFinished) {
    return {
      isExamClosed: true,
      closureReason:
        "Ujian ini telah ditutup oleh guru dan tidak lagi menerima pengerjaan baru maupun lanjutan.",
      canResumeOvertime: false,
      isPR,
    };
  }

  const absEnd = getGlobalExamEndTimestamp(config);
  if (Date.now() > absEnd && !canResumeOvertime) {
    const examTz = config.timezone || "WIB";
    const rawEndDate = config.endDate || config.date;
    const endDateStr = rawEndDate ? normalizeDateString(rawEndDate) : "";
    const endTimeStr = config.endTime || "23:59";
    return {
      isExamClosed: true,
      closureReason: `Masa pengerjaan ujian telah berakhir (${endDateStr || "-"} ${endTimeStr} ${examTz}).`,
      canResumeOvertime: false,
      isPR,
    };
  }

  return { isExamClosed: false, canResumeOvertime, isPR };
};

export const useStudentEntryForm = ({
  initialCode,
  onLoginSuccess,
  onViewResult,
}: UseStudentEntryFormProps) => {
  // Logic State
  const [isLoading, setIsLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockReason, setLockReason] = useState<"force_closed" | "other_device" | "offline_lock" | null>(null);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [registeredData, setRegisteredData] = useState<any[]>([]);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [pendingStudentData, setPendingStudentData] = useState<{
    cleanExamCode: string;
    studentData: Student;
    config?: ExamConfig;
    canResumeOvertime?: boolean;
  } | null>(null);
  const [retakeChoiceData, setRetakeChoiceData] = useState<RetakeChoiceState | null>(null);
  const [matchedSessionState, setMatchedSessionState] = useState<MatchedStudentSession | null>(null);
  const [queueTick, setQueueTick] = useState(0);

  // UI State
  const [examCode, setExamCode] = useState(initialCode || "");
  const [fullName, setFullName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [absentNumber, setAbsentNumber] = useState("");
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [error, setError] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isFocused, setIsFocused] = useState<string | null>(null);

  const examCodeInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const prefetchedConfigRef = useRef<{ code: string; config: ExamConfig } | null>(null);

  useEffect(() => {
    if (initialCode) {
      setExamCode((prev) => (prev ? prev : initialCode));
    }
  }, [initialCode]);

  useEffect(() => {
    return storageService.subscribeQueueChange(() => {
      setQueueTick((t) => t + 1);
    });
  }, []);

  // Derived state for absent/NIS limit
  const { limit: absentLimit } = parseClassConfig(studentClass);

  const normalizeClassName = (raw: string) => normalizeClassToken(raw);
  const normalizeSchoolName = (raw: string) => normalizeTextToken(raw);

  const availableSchools = useMemo(() => {
    const schools = new Set<string>();
    if (registeredData.length > 0) {
      registeredData.forEach((r) => {
        if (r.school_name) schools.add(r.school_name);
      });
    }
    availableClasses.forEach((c) => {
      const parsed = parseClassConfig(c);
      if (parsed.schoolName) schools.add(parsed.schoolName);
    });
    return Array.from(schools);
  }, [availableClasses, registeredData]);

  const filteredClasses = useMemo(() => {
    const classSet = new Set<string>();
    const currentSchoolNorm = normalizeSchoolName(schoolName);

    availableClasses.forEach((c) => {
      const parsed = parseClassConfig(c);
      if (
        !currentSchoolNorm ||
        !parsed.schoolName ||
        normalizeSchoolName(parsed.schoolName) === currentSchoolNorm
      ) {
        classSet.add(c);
      }
    });

    if (registeredData.length > 0) {
      registeredData.forEach((r) => {
        if (
          !currentSchoolNorm ||
          !r.school_name ||
          normalizeSchoolName(r.school_name) === currentSchoolNorm
        ) {
          if (r.class_name) {
            const exists = Array.from(classSet).some(
              (c) => normalizeClassName(c) === normalizeClassName(r.class_name),
            );
            if (!exists) {
              classSet.add(r.class_name);
            }
          }
        }
      });
    }

    return Array.from(classSet);
  }, [availableClasses, schoolName, registeredData]);

  const filteredStudents = useMemo(() => {
    if (registeredData.length === 0 || !studentClass) {
      return [];
    }
    const currentClassNorm = normalizeClassName(studentClass);
    const currentSchoolNorm = normalizeSchoolName(schoolName);

    return registeredData.filter((r) => {
      if (!r.student_name) return false;

      if (currentSchoolNorm && r.school_name) {
        if (normalizeSchoolName(r.school_name) !== currentSchoolNorm) {
          return false;
        }
      }

      const rClassNorm = normalizeClassName(r.class_name);
      return rClassNorm === currentClassNorm;
    });
  }, [registeredData, schoolName, studentClass]);

  const nameSuggestions = useMemo(() => {
    if (registeredData.length === 0) return [];
    const currentSchoolNorm = normalizeSchoolName(schoolName);
    const currentClassNorm = studentClass ? normalizeClassName(studentClass) : null;

    const filtered = registeredData.filter((r) => {
      if (!r.student_name) return false;

      if (currentSchoolNorm && r.school_name) {
        if (normalizeSchoolName(r.school_name) !== currentSchoolNorm) {
          return false;
        }
      }

      if (currentClassNorm) {
        if (normalizeClassName(r.class_name) !== currentClassNorm) {
          return false;
        }
      }

      return true;
    });

    return filtered.sort((a, b) => {
      const classCmp = (a.class_name || "").localeCompare(b.class_name || "");
      if (classCmp !== 0) return classCmp;
      const numA = parseInt(a.absent_number || "0", 10);
      const numB = parseInt(b.absent_number || "0", 10);
      if (!isNaN(numA) && !isNaN(numB) && numA !== 0 && numB !== 0) {
        return numA - numB;
      }
      return (a.student_name || "").localeCompare(b.student_name || "");
    });
  }, [registeredData, schoolName, studentClass]);

  const findStudentByAbsent = (absentNum: string, targetClass = studentClass) => {
    if (!absentNum || !targetClass || registeredData.length === 0) return null;
    const cleanAbsentNorm = normalizeAbsentNumber(absentNum);
    const targetClassNorm = normalizeClassName(targetClass);
    const targetSchoolNorm = normalizeSchoolName(schoolName);

    return registeredData.find((r) => {
      if (!r.student_name) return false;

      if (targetSchoolNorm && r.school_name) {
        if (normalizeSchoolName(r.school_name) !== targetSchoolNorm) {
          return false;
        }
      }

      if (normalizeClassName(r.class_name) !== targetClassNorm) {
        return false;
      }

      const rAbsentNorm = normalizeAbsentNumber(r.absent_number);
      if (!rAbsentNorm) return false;

      return rAbsentNorm === cleanAbsentNorm;
    });
  };

  const findStudentByName = (name: string, targetClass = studentClass) => {
    if (!name || registeredData.length === 0) return null;
    const cleanName = normalizeTextToken(name);
    const targetClassNorm = targetClass ? normalizeClassName(targetClass) : null;
    const targetSchoolNorm = normalizeSchoolName(schoolName);

    return registeredData.find((r) => {
      if (!r.student_name) return false;

      if (targetSchoolNorm && r.school_name) {
        if (normalizeSchoolName(r.school_name) !== targetSchoolNorm) {
          return false;
        }
      }

      if (targetClassNorm && normalizeClassName(r.class_name) !== targetClassNorm) {
        return false;
      }

      return normalizeTextToken(r.student_name) === cleanName;
    });
  };

  const handleSelectStudent = (student: {
    student_name: string;
    class_name: string;
    absent_number?: string | number | null;
    school_name?: string;
  }) => {
    setFullName(student.student_name);
    if (student.school_name && !schoolName) {
      setSchoolName(student.school_name);
    }
    if (student.class_name) {
      const matchTag = availableClasses.find(
        (c) => normalizeClassName(c) === normalizeClassName(student.class_name),
      );
      setStudentClass(matchTag || student.class_name);
    }
    if (student.absent_number != null && student.absent_number !== "") {
      setAbsentNumber(String(student.absent_number));
    }
  };

  const handleAbsentNumberChange = (newAbsent: string) => {
    setAbsentNumber(newAbsent);
    if (newAbsent) {
      const student = findStudentByAbsent(newAbsent);
      if (student && student.student_name) {
        setFullName(student.student_name);
      }
    }
  };

  const handleClassChange = (newClass: string) => {
    setStudentClass(newClass);
    const parsed = parseClassConfig(newClass);
    if (parsed.schoolName && !schoolName) {
      setSchoolName(parsed.schoolName);
    }
    if (absentNumber) {
      const student = findStudentByAbsent(absentNumber, newClass);
      if (student && student.student_name) {
        setFullName(student.student_name);
      }
    }
  };

  const handleFullNameChange = (newName: string) => {
    setFullName(newName);
    if (newName) {
      const student = findStudentByName(newName);
      if (student) {
        if (student.absent_number != null && student.absent_number !== "") {
          setAbsentNumber(String(student.absent_number));
        }
        if (!studentClass && student.class_name) {
          const matchTag = availableClasses.find(
            (c) => normalizeClassName(c) === normalizeClassName(student.class_name),
          );
          setStudentClass(matchTag || student.class_name);
        }
        if (student.school_name && !schoolName) {
          setSchoolName(student.school_name);
        }
      }
    }
  };

  const absentOptions = useMemo(() => {
    if (filteredStudents.length > 0) {
      const sorted = [...filteredStudents].sort((a, b) => {
        const numA = parseInt(a.absent_number || "0", 10);
        const numB = parseInt(b.absent_number || "0", 10);
        if (!isNaN(numA) && !isNaN(numB) && numA !== 0 && numB !== 0) {
          return numA - numB;
        }
        return (a.absent_number || "").localeCompare(b.absent_number || "");
      });
      return sorted
        .filter((s) => s.absent_number != null && s.absent_number !== "")
        .map((s) => ({
          value: String(s.absent_number),
          label: String(s.absent_number),
          studentName: s.student_name,
        }));
    }
    if (absentLimit && absentLimit > 0) {
      return Array.from({ length: absentLimit }, (_, i) => ({
        value: String(i + 1),
        label: String(i + 1),
        studentName: "",
      }));
    }
    return [];
  }, [filteredStudents, absentLimit]);

  // Keep restored absentNumber synced with select options even if zero-padded ("05" vs "5")
  useEffect(() => {
    if (!absentNumber || absentOptions.length === 0) return;
    if (absentOptions.some((o) => o.value === absentNumber)) return;
    const norm = normalizeAbsentNumber(absentNumber);
    const matched = absentOptions.find((o) => normalizeAbsentNumber(o.value) === norm);
    if (matched) {
      setAbsentNumber(matched.value);
    }
  }, [absentNumber, absentOptions]);

  // Auto-fetch config and load scoped student data when code changes (debounced)
  useEffect(() => {
    let isMounted = true;
    const cleanCode = examCode.toUpperCase().trim();

    if (cleanCode.length !== 6) {
      prefetchedConfigRef.current = null;
      setAvailableClasses([]);
      setRegisteredData([]);
      setIsCheckingCode(false);
      return;
    }

    setIsCheckingCode(true);

    // Load scoped student data immediately without waiting for network debounce
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

    const debounceTimer = setTimeout(async () => {
      try {
        const [{ config }, { data: regData }] = await Promise.all([
          storageService.getExamConfigStatus(cleanCode),
          supabase
            .from("registered_students")
            .select("id, exam_code, school_name, class_name, student_name, absent_number, is_active")
            .eq("exam_code", cleanCode),
        ]);

        if (!isMounted) return;

        prefetchedConfigRef.current = config ? { code: cleanCode, config } : null;

        const combinedRegData = regData ? [...regData] : [];
        if (config && config.registeredStudents && config.registeredStudents.length > 0) {
          config.registeredStudents.forEach((cs: any, idx: number) => {
            const sName = cs.student_name || cs.fullName || "";
            const cName = cs.class_name || cs.className || "";
            const aNum = cs.absent_number || cs.absentNumber || "";
            const sSchool = cs.school_name || cs.schoolName || "";
            const already = combinedRegData.some(
              (r) =>
                normalizeTextToken(r.student_name) === normalizeTextToken(sName) &&
                normalizeClassName(r.class_name) === normalizeClassName(cName),
            );
            if (!already) {
              combinedRegData.push({
                id: cs.id || `cfg-${idx}`,
                exam_code: cleanCode,
                school_name: sSchool,
                class_name: cName,
                student_name: sName,
                absent_number: aNum,
                is_active: false,
              });
            }
          });
        }

        if (combinedRegData.length > 0) {
          setRegisteredData(combinedRegData);
          const schools = Array.from(
            new Set(combinedRegData.map((r) => r.school_name).filter(Boolean)),
          );
          if (schools.length === 1) {
            setSchoolName(schools[0]);
          } else if (schools.length > 1) {
            setSchoolName((prev) => {
              const matched = schools.find((s) => normalizeTextToken(s) === normalizeTextToken(prev));
              return matched || "";
            });
          }
        } else {
          setRegisteredData([]);
        }

        if (config && config.targetClasses && config.targetClasses.length > 0) {
          setAvailableClasses(config.targetClasses);
          setStudentClass((prev) => {
            if (!prev) return prev;
            if (config.targetClasses?.includes(prev)) return prev;
            const prevNorm = normalizeClassName(prev);
            const tolerant = config.targetClasses?.find((tc) => normalizeClassName(tc) === prevNorm);
            return tolerant || "";
          });

          if (combinedRegData.length === 0) {
            const schools = new Set<string>();
            config.targetClasses.forEach((c) => {
              const parsed = parseClassConfig(c);
              if (parsed.schoolName) schools.add(parsed.schoolName);
            });
            const schoolArr = Array.from(schools);
            if (schoolArr.length === 1) {
              setSchoolName(schoolArr[0]);
            } else if (schoolArr.length > 1) {
              setSchoolName((prev) => {
                const matched = schoolArr.find(
                  (s) => normalizeTextToken(s) === normalizeTextToken(prev),
                );
                return matched || "";
              });
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
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(debounceTimer);
    };
  }, [examCode]);

  // Compute current live input signature so stale async matches vanish immediately when user edits fields
  const currentInputSignature = useMemo(() => {
    const cleanCode = examCode.toUpperCase().trim();
    const parsed = parseClassConfig(studentClass);
    const cleanClass = parsed.name || studentClass;
    const cleanSchool = schoolName.trim() || parsed.schoolName || "";
    if (
      cleanCode.length !== 6 ||
      !fullName.trim() ||
      !cleanClass.trim() ||
      !absentNumber.trim() ||
      !cleanSchool.trim()
    ) {
      return "";
    }
    return buildStudentInputSignature(cleanCode, cleanSchool, fullName, cleanClass, absentNumber);
  }, [examCode, schoolName, fullName, studentClass, absentNumber]);

  const activeMatchedSession = useMemo(() => {
    if (!currentInputSignature || !matchedSessionState) return null;
    return matchedSessionState.inputSignature === currentInputSignature ? matchedSessionState : null;
  }, [currentInputSignature, matchedSessionState]);

  // Reactive detection of existing completed / queued / force_closed student sessions
  useEffect(() => {
    if (!currentInputSignature) {
      setMatchedSessionState(null);
      return;
    }

    let isCancelled = false;
    const cleanCode = examCode.toUpperCase().trim();
    const parsedClass = parseClassConfig(studentClass);
    const cleanClass = parsedClass.name || studentClass;
    const cleanSchool = schoolName.trim() || parsedClass.schoolName || "";
    const candidateId = buildCanonicalStudentId(cleanCode, cleanSchool, cleanClass, absentNumber);
    const candidateStudent: Student = {
      studentId: candidateId,
      fullName: fullName.trim(),
      class: cleanClass,
      absentNumber: absentNumber.trim(),
      schoolName: cleanSchool,
    };

    const prefetchedCfg =
      prefetchedConfigRef.current?.code === cleanCode ? prefetchedConfigRef.current.config : undefined;

    // Step 1: Immediate local & queue check (works offline and online at 0ms)
    const queuedImmediate = storageService.findQueuedSubmission(cleanCode, candidateStudent, {
      onlyFinal: true,
    });
    const localCompleted = findLocalCompletedStudent(cleanCode, candidateStudent);

    const buildSessionFromLocal = (cfg?: ExamConfig): MatchedStudentSession | null => {
      if (queuedImmediate) {
        const syncSt = storageService.getSubmissionSyncState(
          cleanCode,
          queuedImmediate.student.studentId,
          queuedImmediate.student,
        );
        const startStr = queuedImmediate.answers?._startTime;
        const startMs = startStr ? parseInt(startStr, 10) : queuedImmediate.timestamp;
        const closed = buildClosedStatus(
          cfg,
          queuedImmediate.status,
          !isNaN(startMs) ? startMs : null,
        );
        if (queuedImmediate.status === "completed") {
          return {
            inputSignature: currentInputSignature,
            examCode: cleanCode,
            student: queuedImmediate.student,
            config: cfg,
            kind: syncSt.status === "failed" ? "failed_sync" : "queued_completed",
            result: { ...queuedImmediate, isSynced: false },
            syncState: syncSt,
            isExamClosed: closed.isExamClosed,
            closureReason: closed.closureReason,
            allowRetakes: Boolean(cfg?.allowRetakes),
            isPR: closed.isPR,
            canResumeOvertime: closed.canResumeOvertime,
          };
        }
        if (queuedImmediate.status === "force_closed" && !closed.isPR) {
          return {
            inputSignature: currentInputSignature,
            examCode: cleanCode,
            student: queuedImmediate.student,
            config: cfg,
            kind: "queued_force_closed",
            result: { ...queuedImmediate, isSynced: false },
            syncState: syncSt,
            isExamClosed: closed.isExamClosed,
            closureReason: closed.closureReason,
            allowRetakes: Boolean(cfg?.allowRetakes),
            isPR: closed.isPR,
            canResumeOvertime: closed.canResumeOvertime,
          };
        }
      }

      if (localCompleted) {
        const closed = buildClosedStatus(cfg, localCompleted.status, localCompleted.timestamp);
        if (localCompleted.status === "completed") {
          const syntheticResult: Result | undefined =
            typeof localCompleted.score === "number"
              ? {
                  id: localCompleted.resultId,
                  student: localCompleted.student,
                  examCode: cleanCode,
                  answers: localCompleted.answers || {},
                  score: localCompleted.score,
                  correctAnswers: localCompleted.correctAnswers ?? 0,
                  totalQuestions: localCompleted.totalQuestions ?? 0,
                  completionTime: localCompleted.completionTime ?? 0,
                  status: "completed",
                  timestamp: localCompleted.timestamp,
                  isSynced: localCompleted.isSynced !== false,
                }
              : undefined;
          return {
            inputSignature: currentInputSignature,
            examCode: cleanCode,
            student: localCompleted.student,
            config: cfg,
            kind: "completed",
            result: syntheticResult,
            isExamClosed: closed.isExamClosed,
            closureReason: closed.closureReason,
            allowRetakes: Boolean(cfg?.allowRetakes),
            isPR: closed.isPR,
            canResumeOvertime: closed.canResumeOvertime,
          };
        }
        if (localCompleted.status === "force_closed" && !closed.isPR) {
          return {
            inputSignature: currentInputSignature,
            examCode: cleanCode,
            student: localCompleted.student,
            config: cfg,
            kind: "force_closed",
            isExamClosed: closed.isExamClosed,
            closureReason: closed.closureReason,
            allowRetakes: Boolean(cfg?.allowRetakes),
            isPR: closed.isPR,
            canResumeOvertime: closed.canResumeOvertime,
          };
        }
      }
      return null;
    };

    const immediateMatch = buildSessionFromLocal(prefetchedCfg);
    if (immediateMatch) {
      setMatchedSessionState(immediateMatch);
    } else {
      setMatchedSessionState(null);
    }

    // Step 2: Debounced server verification (also solves different-browser / in-app browser recovery!)
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        let cfg =
          prefetchedConfigRef.current?.code === cleanCode
            ? prefetchedConfigRef.current.config
            : undefined;
        if (!cfg) {
          const cfgStatus = await storageService.getExamConfigStatus(cleanCode);
          if (cfgStatus.config) {
            cfg = cfgStatus.config;
            prefetchedConfigRef.current = { code: cleanCode, config: cfg };
          }
        }
        if (isCancelled) return;

        const { result: serverRes, isNetworkError } = await storageService.getStudentResultStatus(
          cleanCode,
          candidateId,
          candidateStudent,
        );
        if (isCancelled) return;

        const queuedNow = storageService.findQueuedSubmission(
          cleanCode,
          serverRes?.student || candidateStudent,
          { onlyFinal: true },
        );

        // If pending or failed submission still exists locally in queue, prioritize clear sync status
        if (queuedNow && queuedNow.status === "completed") {
          const syncSt = storageService.getSubmissionSyncState(
            cleanCode,
            queuedNow.student.studentId,
            queuedNow.student,
          );
          const closed = buildClosedStatus(cfg, queuedNow.status, queuedNow.timestamp);
          setMatchedSessionState({
            inputSignature: currentInputSignature,
            examCode: cleanCode,
            student: queuedNow.student,
            config: cfg,
            kind: syncSt.status === "failed" ? "failed_sync" : "queued_completed",
            result: { ...queuedNow, isSynced: false },
            syncState: syncSt,
            isExamClosed: closed.isExamClosed,
            closureReason: closed.closureReason,
            allowRetakes: Boolean(cfg?.allowRetakes),
            isPR: closed.isPR,
            canResumeOvertime: closed.canResumeOvertime,
          });
          return;
        }

        if (serverRes) {
          const startStr = serverRes.answers?._startTime;
          const parsedStart = startStr ? parseInt(startStr, 10) : NaN;
          const startMs =
            (!isNaN(parsedStart) && parsedStart > 0 ? parsedStart : null) ||
            serverRes.timestamp ||
            null;
          const closed = buildClosedStatus(cfg, serverRes.status, startMs);

          if (serverRes.status === "completed") {
            saveLocalCompletedStudent(cleanCode, serverRes.student, "completed", {
              resultId: serverRes.id,
              score: serverRes.score,
              correctAnswers: serverRes.correctAnswers,
              totalQuestions: serverRes.totalQuestions,
              completionTime: serverRes.completionTime,
              answers: serverRes.answers,
              isSynced: true,
              timestamp: serverRes.timestamp,
            });
            setMatchedSessionState({
              inputSignature: currentInputSignature,
              examCode: cleanCode,
              student: serverRes.student,
              config: cfg,
              kind: "completed",
              result: { ...serverRes, isSynced: true },
              isExamClosed: closed.isExamClosed,
              closureReason: closed.closureReason,
              allowRetakes: Boolean(cfg?.allowRetakes),
              isPR: closed.isPR,
              canResumeOvertime: closed.canResumeOvertime,
            });
            return;
          }

          if (serverRes.status === "force_closed" && !closed.isPR) {
            setMatchedSessionState({
              inputSignature: currentInputSignature,
              examCode: cleanCode,
              student: serverRes.student,
              config: cfg,
              kind: "force_closed",
              result: serverRes,
              isExamClosed: closed.isExamClosed,
              closureReason: closed.closureReason,
              allowRetakes: Boolean(cfg?.allowRetakes),
              isPR: closed.isPR,
              canResumeOvertime: closed.canResumeOvertime,
            });
            return;
          }

          // Active in_progress on server -> no completed banner
          setMatchedSessionState(null);
          return;
        }

        // If server confirmed no record exists and not network error, refresh from queued if any, else clear
        if (!isNetworkError) {
          const fallbackQueued = buildSessionFromLocal(cfg);
          if (
            fallbackQueued &&
            (fallbackQueued.kind === "queued_completed" ||
              fallbackQueued.kind === "failed_sync" ||
              fallbackQueued.kind === "queued_force_closed")
          ) {
            setMatchedSessionState(fallbackQueued);
          } else {
            setMatchedSessionState(null);
          }
        } else {
          // Network error: update immediate match with config info if we just got config
          const refreshedLocal = buildSessionFromLocal(cfg);
          if (refreshedLocal) {
            setMatchedSessionState(refreshedLocal);
          }
        }
      } catch {
        // Keep immediate local match if any
      }
    }, 280);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [currentInputSignature, examCode, schoolName, fullName, studentClass, absentNumber, isCheckingCode, queueTick]);

  useEffect(() => {
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
          } else if (params.has("join")) {
            code = params.get("join") || data;
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

  const persistScopedPref = useCallback(
    (cleanExamCode: string, overrides?: { fullName?: string; schoolName?: string; studentClass?: string; absentNumber?: string }) => {
      try {
        const scopedPref = {
          fullName: (overrides?.fullName ?? fullName).trim(),
          schoolName: (overrides?.schoolName ?? schoolName).trim(),
          studentClass: overrides?.studentClass ?? studentClass,
          absentNumber: overrides?.absentNumber ?? absentNumber,
        };
        localStorage.setItem(`student_pref_${cleanExamCode}`, JSON.stringify(scopedPref));
      } catch {
        /* ignore */
      }
    },
    [fullName, schoolName, studentClass, absentNumber],
  );

  const openMatchedResult = useCallback(
    async (session?: MatchedStudentSession | null) => {
      const target = session || activeMatchedSession;
      if (!target) return;

      setIsLoading(true);
      setError("");
      try {
        persistScopedPref(target.examCode, {
          fullName: target.student.fullName || fullName,
          schoolName: target.student.schoolName || schoolName,
          studentClass: studentClass || target.student.class,
          absentNumber: target.student.absentNumber || absentNumber,
        });

        if (onViewResult) {
          await onViewResult(
            target.examCode,
            target.student,
            target.result || null,
            target.config || null,
          );
        } else {
          onLoginSuccess(target.examCode, target.student);
        }
      } catch {
        setError("Gagal membuka halaman hasil. Periksa koneksi internet Anda lalu coba lagi.");
      } finally {
        setIsLoading(false);
      }
    },
    [activeMatchedSession, persistScopedPref, fullName, schoolName, studentClass, absentNumber, onViewResult, onLoginSuccess],
  );

  const openForceClosedUnlock = useCallback(
    (session?: MatchedStudentSession | null) => {
      const target = session || activeMatchedSession;
      if (!target) return;
      setPendingStudentData({
        cleanExamCode: target.examCode,
        studentData: target.student,
        config: target.config,
        canResumeOvertime: target.canResumeOvertime,
      });
      setLockReason("force_closed");
      setError(
        target.isExamClosed
          ? "Sesi Anda dihentikan paksa dan jadwal ujian telah berakhir/ditutup. Masukkan Token Pengawas jika telah diberikan izin pembukaan sesi."
          : "Sesi Anda dihentikan paksa (force closed). Masukkan Token Buka Kunci 4 angka dari pengawas untuk melanjutkan ujian.",
      );
      setIsLocked(true);
    },
    [activeMatchedSession],
  );

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
      const isBrowserOffline = typeof navigator !== "undefined" && navigator.onLine === false;
      let config: ExamConfig | null = null;
      let isConfigNetErr = isBrowserOffline;

      if (!isBrowserOffline && prefetchedConfigRef.current?.code === cleanExamCode) {
        config = prefetchedConfigRef.current.config;
      } else {
        const cfgStatus = await storageService.getExamConfigStatus(cleanExamCode);
        config = cfgStatus.config;
        isConfigNetErr = cfgStatus.isNetworkError;
      }

      if (!config) {
        // Fallback: if student has a local completed or queued submission for this exam while offline, allow opening result/status
        const parsedClassFallback = parseClassConfig(studentClass);
        const fallbackStudent: Student = {
          studentId: buildCanonicalStudentId(
            cleanExamCode,
            schoolName.trim() || parsedClassFallback.schoolName || "",
            parsedClassFallback.name || studentClass,
            absentNumber.trim(),
          ),
          fullName: fullName.trim(),
          class: parsedClassFallback.name || studentClass,
          absentNumber: absentNumber.trim(),
          schoolName: schoolName.trim() || parsedClassFallback.schoolName || "",
        };
        const queuedOfflineOnly = storageService.findQueuedSubmission(cleanExamCode, fallbackStudent, {
          onlyFinal: true,
        });
        const localDoneOnly = findLocalCompletedStudent(cleanExamCode, fallbackStudent);

        if (queuedOfflineOnly?.status === "completed") {
          persistScopedPref(cleanExamCode);
          if (onViewResult) {
            await onViewResult(cleanExamCode, queuedOfflineOnly.student, { ...queuedOfflineOnly, isSynced: false }, null);
            setIsLoading(false);
            return;
          }
        }
        if (localDoneOnly?.status === "completed" && onViewResult) {
          persistScopedPref(cleanExamCode);
          await onViewResult(cleanExamCode, localDoneOnly.student, null, null);
          setIsLoading(false);
          return;
        }

        setError(
          isConfigNetErr
            ? "Perangkat sedang offline. Sambungkan ke internet untuk mengunduh soal dan mendaftarkan sesi ujian."
            : "Kode ujian tidak ditemukan atau tidak aktif",
        );
        setIsLoading(false);
        return;
      }

      const parsedClass = parseClassConfig(studentClass);
      const cleanClassName = parsedClass.name || studentClass;
      const cleanSchoolName = schoolName.trim() || parsedClass.schoolName || "";

      if (config.targetClasses && config.targetClasses.length > 0) {
        const matchesTarget = config.targetClasses.some((tc) => {
          const parsedTcName = parseClassConfig(tc).name || tc;
          return (
            tc === studentClass ||
            isClassMatch(parsedTcName, cleanClassName) ||
            isClassMatch(tc, cleanClassName)
          );
        });
        if (!matchesTarget) {
          setError(
            `Ujian ini tidak diperuntukkan bagi kelas ${cleanClassName}. Harap periksa kembali.`,
          );
          setIsLoading(false);
          return;
        }
      }

      const studentId = buildCanonicalStudentId(
        cleanExamCode,
        cleanSchoolName,
        cleanClassName,
        absentNumber,
      );
      const studentData: Student = {
        studentId,
        fullName: fullName.trim(),
        class: cleanClassName,
        absentNumber: absentNumber.trim(),
        schoolName: cleanSchoolName,
      };

      const { result, isNetworkError: isResultNetErr } =
        await storageService.getStudentResultStatus(cleanExamCode, studentId, studentData);
      const isOfflineFlow = isBrowserOffline || isConfigNetErr || isResultNetErr;

      // Always inspect offline/failed queues tolerantly regardless of navigator.onLine
      const queuedEarly = storageService.findQueuedSubmission(
        cleanExamCode,
        result?.student || studentData,
      );
      const localDoneEarly = findLocalCompletedStudent(cleanExamCode, result?.student || studentData);

      const resolvedStudent = result?.student || queuedEarly?.student || localDoneEarly?.student || studentData;
      const effectiveStudentId = resolvedStudent.studentId;

      const localProgressEarly =
        isOfflineFlow && !result
          ? ((await storageService.getLocalProgress(
              `exam_local_${cleanExamCode}_${effectiveStudentId}`,
            )) as {
              status?: string;
              answers?: Record<string, string>;
              lastUpdated?: number;
            } | null)
          : null;

      const existingStatus = result
        ? result.status
        : queuedEarly?.status ||
          localProgressEarly?.status ||
          localDoneEarly?.status ||
          (localProgressEarly ? "in_progress" : undefined);

      const existingStartStr = result
        ? result.answers?._startTime
        : localProgressEarly?.answers?._startTime || queuedEarly?.answers?._startTime;
      const parsedExistingStart = existingStartStr ? parseInt(existingStartStr, 10) : NaN;
      const existingStartMs =
        (!isNaN(parsedExistingStart) && parsedExistingStart > 0 ? parsedExistingStart : null) ||
        result?.timestamp ||
        queuedEarly?.timestamp ||
        localProgressEarly?.lastUpdated ||
        localDoneEarly?.timestamp ||
        null;

      const closedInfo = buildClosedStatus(config, existingStatus, existingStartMs);
      const mode = (config.examMode || "UJIAN").trim().toUpperCase();
      const isPR = mode === "PR";

      // 1. PRIORITY: Queued/Failed final submission ('completed')
      if (queuedEarly?.status === "completed") {
        persistScopedPref(cleanExamCode);
        const queuedResultObj: Result = { ...queuedEarly, isSynced: false };
        if (config.allowRetakes) {
          setRetakeChoiceData({
            examCode: cleanExamCode,
            student: resolvedStudent,
            config,
            result: queuedResultObj,
            isExamClosed: closedInfo.isExamClosed,
            closureReason: closedInfo.closureReason,
            isQueuedOnly: true,
          });
          setIsLoading(false);
          return;
        }
        if (onViewResult) {
          await onViewResult(cleanExamCode, resolvedStudent, queuedResultObj, config);
        } else {
          onLoginSuccess(cleanExamCode, resolvedStudent);
        }
        setIsLoading(false);
        return;
      }

      // 2. PRIORITY: Completed result on server (or verified local completed cache while offline)
      const isCompletedMatch =
        result?.status === "completed" ||
        (isOfflineFlow && !result && localDoneEarly?.status === "completed");

      if (isCompletedMatch) {
        persistScopedPref(cleanExamCode);
        if (result) {
          saveLocalCompletedStudent(cleanExamCode, result.student, "completed", {
            resultId: result.id,
            score: result.score,
            correctAnswers: result.correctAnswers,
            totalQuestions: result.totalQuestions,
            completionTime: result.completionTime,
            answers: result.answers,
            isSynced: true,
            timestamp: result.timestamp,
          });
        }

        if (config.allowRetakes) {
          setRetakeChoiceData({
            examCode: cleanExamCode,
            student: resolvedStudent,
            config,
            result: result || undefined,
            isExamClosed: closedInfo.isExamClosed,
            closureReason: closedInfo.closureReason,
          });
          setIsLoading(false);
          return;
        }

        // Redirect completed returning student straight to Result Page (even if exam closed)
        if (onViewResult) {
          await onViewResult(cleanExamCode, resolvedStudent, result || null, config);
        } else {
          onLoginSuccess(cleanExamCode, resolvedStudent);
        }
        setIsLoading(false);
        return;
      }

      // 3. PRIORITY: force_closed state (both during open exam and after closure!)
      const isForceClosed =
        !isPR &&
        (result?.status === "force_closed" ||
          queuedEarly?.status === "force_closed" ||
          localProgressEarly?.status === "force_closed" ||
          localDoneEarly?.status === "force_closed");

      if (isForceClosed) {
        persistScopedPref(cleanExamCode);
        if (config.detectBehavior && config.continueWithPermission) {
          if (closedInfo.isExamClosed) {
            setError(
              "Sesi Anda berstatus Dihentikan Paksa (Terkunci) dan jadwal ujian ini telah berakhir atau ditutup oleh guru. Anda tidak dapat melanjutkan pengerjaan otomatis. Hubungi pengawas/guru untuk pengecekan status sesi maupun pembukaan hasil.",
            );
            setIsLoading(false);
            return;
          }
          setError(
            isOfflineFlow
              ? "Sesi Anda dihentikan paksa (force closed) dan sedang menunggu Token Pengawas. Sambungkan ke internet dan masukkan 4 angka Token Pengawas untuk membuka kunci."
              : "Sesi Anda dihentikan paksa (force closed) dan menunggu Token Buka Kunci dari pengawas. Masukkan 4 angka Token Pengawas untuk melanjutkan ujian.",
          );
          setPendingStudentData({
            cleanExamCode,
            studentData: resolvedStudent,
            config,
            canResumeOvertime: closedInfo.canResumeOvertime,
          });
          setLockReason("force_closed");
          setIsLocked(true);
          setIsLoading(false);
          return;
        } else if (result && onViewResult) {
          // continueWithPermission = false -> open StudentResultPage (UnlockScreen / closed status)
          await onViewResult(cleanExamCode, resolvedStudent, result, config);
          setIsLoading(false);
          return;
        }
      }

      // --- DEADLINE & CLOSURE CHECK (for new/in_progress attempts) ---
      if (closedInfo.isExamClosed) {
        setError(
          closedInfo.closureReason ||
            "Ujian ini telah ditutup oleh guru dan tidak lagi menerima pengerjaan baru maupun lanjutan.",
        );
        setIsLoading(false);
        return;
      }

      const lockKey = `exam_lock_${cleanExamCode}_${effectiveStudentId}`;

      if (isOfflineFlow && !result) {
        const isNotPR = !isPR;
        const requiresLock = isNotPR && !!config.detectBehavior && !!config.continueWithPermission;
        let hasLocalLock = false;
        try {
          hasLocalLock = localStorage.getItem(lockKey) === "1";
        } catch {
          /* ignore */
        }

        const localProgress = localProgressEarly;

        if (requiresLock && hasLocalLock) {
          setError(
            "Sesi ini terkunci pada perangkat ini. Sambungkan ke internet dan hubungi pengawas untuk membuka kunci.",
          );
          setPendingStudentData({
            cleanExamCode,
            studentData: resolvedStudent,
            config,
            canResumeOvertime: closedInfo.canResumeOvertime,
          });
          setLockReason("offline_lock");
          setIsLocked(true);
          setIsLoading(false);
          return;
        }

        const [cachedOfflineExam, cachedEdgeBundle] = await Promise.all([
          storageService.getLocalProgress(`offline_exam_${cleanExamCode}`),
          storageService.getLocalProgress(`edge_bundle_${cleanExamCode}`),
        ]);

        if ((!cachedOfflineExam && !cachedEdgeBundle) || !localProgress) {
          setError(
            "Perangkat sedang offline dan belum ada sesi ujian aktif di perangkat ini. Sambungkan ke internet untuk masuk dan mengunduh soal.",
          );
          setIsLoading(false);
          return;
        }
      } else if (result) {
        const isNotPR = !isPR;
        if (isNotPR && result.status === "in_progress" && config.detectBehavior) {
          let deviceId = localStorage.getItem("deviceId");
          if (!deviceId) {
            deviceId = `${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
            localStorage.setItem("deviceId", deviceId);
          }
          const existingDeviceId = result.device_id || result.answers?._deviceId;
          if (existingDeviceId && existingDeviceId !== deviceId) {
            setError(
              "Sesi ini sedang aktif di perangkat lain. Masukkan Token Pengawas 4 angka untuk melanjutkan di perangkat ini.",
            );
            setPendingStudentData({
              cleanExamCode,
              studentData: resolvedStudent,
              config,
              canResumeOvertime: closedInfo.canResumeOvertime,
            });
            setLockReason("other_device");
            setIsLocked(true);
            setIsLoading(false);
            return;
          }
        }
      } else {
        // Validate duplicate absent number in same class if other results exist
        try {
          const classResults = await storageService.getResults(
            cleanExamCode,
            cleanClassName,
            cleanSchoolName,
          );
          if (classResults && classResults.length > 0) {
            const normInputAbsent = normalizeAbsentNumber(absentNumber);
            const existingSameAbsent = classResults.find((r) => {
              const rAbsentNorm = normalizeAbsentNumber(r.student.absentNumber);
              return (
                rAbsentNorm &&
                rAbsentNorm === normInputAbsent &&
                normalizeTextToken(r.student.fullName) !== normalizeTextToken(fullName)
              );
            });
            if (existingSameAbsent) {
              setError(
                `Nomor urut ${absentNumber.trim()} di kelas ${cleanClassName} sudah terdaftar atas nama ${existingSameAbsent.student.fullName}. Hubungi pengawas.`,
              );
              setIsLoading(false);
              return;
            }
          }
        } catch (checkErr) {
          console.warn("Could not check duplicate absent number:", checkErr);
        }
      }

      persistScopedPref(cleanExamCode);

      if (!isOfflineFlow) {
        try {
          localStorage.removeItem(lockKey);
        } catch {
          /* ignore */
        }
      }

      setPendingStudentData({
        cleanExamCode,
        studentData: resolvedStudent,
        config,
        canResumeOvertime: closedInfo.canResumeOvertime,
      });
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan. Pastikan koneksi internet stabil.");
      setIsLoading(false);
    }
  };

  const handleUnlockAndResume = async (token: string) => {
    if (!pendingStudentData) return;
    setUnlockError("");
    setIsUnlocking(true);
    try {
      let deviceId = localStorage.getItem("deviceId");
      if (!deviceId) {
        deviceId = `${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
        localStorage.setItem("deviceId", deviceId);
      }
      const isValid = await storageService.verifyUnlockToken(
        pendingStudentData.cleanExamCode,
        pendingStudentData.studentData.studentId,
        token,
        deviceId,
      );
      if (isValid) {
        setIsLocked(false);
        setLockReason(null);
        setUnlockError("");
        const lockKey = `exam_lock_${pendingStudentData.cleanExamCode}_${pendingStudentData.studentData.studentId}`;
        localStorage.removeItem(lockKey);

        onLoginSuccess(
          pendingStudentData.cleanExamCode,
          pendingStudentData.studentData,
        );
      } else {
        setUnlockError("Token tidak valid. Periksa kembali 4 angka token dari pengawas.");
      }
    } catch {
      setUnlockError("Gagal verifikasi token. Periksa koneksi internet Anda.");
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleRetakeChoiceViewResult = useCallback(async () => {
    if (!retakeChoiceData) return;
    const { examCode: code, student, result, config } = retakeChoiceData;
    setRetakeChoiceData(null);
    if (onViewResult) {
      await onViewResult(code, student, result || null, config);
    } else {
      onLoginSuccess(code, student);
    }
  }, [retakeChoiceData, onViewResult, onLoginSuccess]);

  const handleRetakeChoiceStartOver = useCallback(() => {
    if (!retakeChoiceData) return;
    const { examCode: code, student, config, isExamClosed } = retakeChoiceData;
    if (isExamClosed) return;
    setRetakeChoiceData(null);
    setPendingStudentData({
      cleanExamCode: code,
      studentData: student,
      config,
      canResumeOvertime: false,
    });
  }, [retakeChoiceData]);

  return {
    isLoading,
    isLocked,
    lockReason,
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
    unlockError,
    setUnlockError,
    isUnlocking,
    isFocused,
    setIsFocused,
    examCodeInputRef,
    nameInputRef,
    absentLimit,
    absentOptions,
    handleAbsentNumberChange,
    handleClassChange,
    handleFullNameChange,
    handleSelectStudent,
    nameSuggestions,
    availableSchools,
    filteredClasses,
    filteredStudents,
    handleQrScan,
    handleSubmit,
    handleUnlockAndResume,
    setIsLocked,
    setLockReason,
    pendingStudentData,
    setPendingStudentData,
    setIsLoading,
    activeMatchedSession,
    openMatchedResult,
    openForceClosedUnlock,
    retakeChoiceData,
    setRetakeChoiceData,
    handleRetakeChoiceViewResult,
    handleRetakeChoiceStartOver,
  };
};
