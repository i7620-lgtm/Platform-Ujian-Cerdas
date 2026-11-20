import type { ResultStatus, Student } from "../types";

export const normalizeTextToken = (raw?: string | number | null): string => {
  if (raw === null || raw === undefined) return "";
  return String(raw)
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
};

export const normalizeAbsentNumber = (raw?: string | number | null): string => {
  if (raw === null || raw === undefined) return "";
  const cleaned = String(raw).trim().replace(/\s+/g, "");
  if (!cleaned) return "";
  if (/^\d+$/.test(cleaned)) {
    const stripped = cleaned.replace(/^0+/, "");
    return stripped === "" ? "0" : stripped;
  }
  return cleaned.toLowerCase();
};

export const stripClassCapacity = (
  rawClass?: string | null,
): { schoolName: string; className: string; limit: number | null } => {
  const input = String(rawClass || "").trim();
  if (!input) return { schoolName: "", className: "", limit: null };

  let working = input;
  let schoolName = "";

  if (working.includes("::")) {
    const parts = working.split("::");
    schoolName = parts[0].trim();
    working = parts.slice(1).join("::").trim();
  }

  const limitMatch = working.match(/^(.+?)(?:\((\d+)\))?$/);
  const fullString = (limitMatch ? limitMatch[1] : working).trim();
  const limit = limitMatch && limitMatch[2] ? parseInt(limitMatch[2], 10) : null;

  let className = fullString;
  const dashIndex = fullString.indexOf("-");
  if (dashIndex !== -1) {
    if (!schoolName) {
      schoolName = fullString.substring(0, dashIndex).trim();
    }
    className = fullString.substring(dashIndex + 1).trim();
  }

  return { schoolName, className, limit };
};

export const normalizeClassToken = (rawClass?: string | null): string => {
  if (!rawClass) return "";
  const { className } = stripClassCapacity(rawClass);
  return normalizeTextToken(className || rawClass)
    .replace(/^kelas\s+/i, "")
    .replace(/[^a-z0-9]/g, "");
};

export const buildCanonicalStudentId = (
  examCode: string,
  schoolName: string,
  className: string,
  absentNumber: string,
): string => {
  const cleanCode = String(examCode || "").trim().toUpperCase();
  const parsed = stripClassCapacity(className);
  const cleanClass = (parsed.className || className || "").trim();
  const cleanSchool = (schoolName || parsed.schoolName || "").trim();
  const cleanAbsent = String(absentNumber || "").trim();

  return `${cleanCode}_${cleanSchool}_${cleanClass}_${cleanAbsent}`.replace(/\s+/g, "_");
};

export interface StudentIdentityCandidate {
  studentId?: string;
  fullName?: string;
  class?: string;
  absentNumber?: string | number;
  schoolName?: string;
}

export const isSameStudentIdentity = (
  a?: StudentIdentityCandidate | null,
  b?: StudentIdentityCandidate | null,
): boolean => {
  if (!a || !b) return false;

  const aName = normalizeTextToken(a.fullName);
  const bName = normalizeTextToken(b.fullName);
  const aClass = normalizeClassToken(a.class);
  const bClass = normalizeClassToken(b.class);
  const aAbsent = normalizeAbsentNumber(a.absentNumber);
  const bAbsent = normalizeAbsentNumber(b.absentNumber);
  const aSchool = normalizeTextToken(a.schoolName);
  const bSchool = normalizeTextToken(b.schoolName);

  // Exact canonical studentId match (verify no conflicting fullName if both present)
  if (a.studentId && b.studentId && a.studentId === b.studentId) {
    if (!aName || !bName || aName === bName) {
      return true;
    }
  }

  // Tolerant 4-field identity check
  if (!aName || !bName || aName !== bName) return false;
  if (!aClass || !bClass || aClass !== bClass) return false;
  if (!aAbsent || !bAbsent || aAbsent !== bAbsent) return false;

  if (aSchool && bSchool && aSchool !== bSchool) return false;

  return true;
};

export const buildStudentInputSignature = (
  examCode: string,
  schoolName: string,
  fullName: string,
  studentClass: string,
  absentNumber: string,
): string => {
  return [
    String(examCode || "").trim().toUpperCase(),
    normalizeTextToken(schoolName),
    normalizeTextToken(fullName),
    normalizeClassToken(studentClass),
    normalizeAbsentNumber(absentNumber),
  ].join("|");
};

export interface LocalCompletedEntry {
  student: Student;
  status: ResultStatus;
  resultId?: number;
  score?: number;
  correctAnswers?: number;
  totalQuestions?: number;
  completionTime?: number;
  answers?: Record<string, string>;
  isSynced?: boolean;
  timestamp: number;
  updatedAt: number;
}

const COMPLETED_STUDENTS_PREFIX = "completed_students_";
const MAX_LOCAL_COMPLETED_PER_EXAM = 50;

export const getLocalCompletedStudents = (examCode: string): LocalCompletedEntry[] => {
  const cleanCode = String(examCode || "").trim().toUpperCase();
  if (!cleanCode || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(`${COMPLETED_STUDENTS_PREFIX}${cleanCode}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocalCompletedEntry[]) : [];
  } catch {
    return [];
  }
};

export const saveLocalCompletedStudent = (
  examCode: string,
  student: Student,
  status: ResultStatus,
  extras?: {
    resultId?: number;
    score?: number;
    correctAnswers?: number;
    totalQuestions?: number;
    completionTime?: number;
    answers?: Record<string, string>;
    isSynced?: boolean;
    timestamp?: number;
  },
): void => {
  const cleanCode = String(examCode || "").trim().toUpperCase();
  if (!cleanCode || !student?.studentId || typeof window === "undefined") return;
  if (student.class === "PREVIEW") return;

  try {
    const existing = getLocalCompletedStudents(cleanCode);
    const filtered = existing.filter(
      (entry) =>
        entry?.student?.studentId !== student.studentId &&
        !isSameStudentIdentity(entry?.student, student),
    );

    const newEntry: LocalCompletedEntry = {
      student: {
        ...student,
        resultId: extras?.resultId ?? student.resultId,
      },
      status,
      resultId: extras?.resultId ?? student.resultId,
      score: extras?.score,
      correctAnswers: extras?.correctAnswers,
      totalQuestions: extras?.totalQuestions,
      completionTime: extras?.completionTime,
      answers: extras?.answers,
      isSynced: extras?.isSynced,
      timestamp: extras?.timestamp ?? Date.now(),
      updatedAt: Date.now(),
    };

    const next = [newEntry, ...filtered].slice(0, MAX_LOCAL_COMPLETED_PER_EXAM);
    window.localStorage.setItem(
      `${COMPLETED_STUDENTS_PREFIX}${cleanCode}`,
      JSON.stringify(next),
    );
  } catch {
    // Ignore storage quota or private-browsing exceptions
  }
};

export const findLocalCompletedStudent = (
  examCode: string,
  candidate: StudentIdentityCandidate,
): LocalCompletedEntry | null => {
  const entries = getLocalCompletedStudents(examCode);
  if (entries.length === 0) return null;
  return entries.find((entry) => isSameStudentIdentity(entry.student, candidate)) || null;
};
