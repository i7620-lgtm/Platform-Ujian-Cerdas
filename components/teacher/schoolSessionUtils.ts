import type { Exam, DailyExamSession } from "../../types";

export interface SchoolSessionInfo {
  schoolName: string;
  isHost: boolean;
  totalStudents: number;
  classes: string[];
  sessions: DailyExamSession[];
}

/**
 * Extracts and aggregates participating schools, their sessions, registered students,
 * and target classes from an Exam object.
 */
export const getParticipatingSchoolsWithSessions = (
  exam?: Exam | null,
  fallbackSchoolName?: string
): SchoolSessionInfo[] => {
  if (!exam) return [];

  const hostSchool = (
    exam.authorSchool ||
    exam.config?.schoolName ||
    fallbackSchoolName ||
    exam.authorName ||
    "Penyelenggara Ujian"
  ).trim();

  const schoolsMap = new Map<string, SchoolSessionInfo>();

  // 1. Ensure host school is initialized
  schoolsMap.set(hostSchool, {
    schoolName: hostSchool,
    isHost: true,
    totalStudents: 0,
    classes: [],
    sessions: [],
  });

  // 2. Parse registered students
  const registeredStudents = exam.config?.registeredStudents || [];
  registeredStudents.forEach((student) => {
    const sName = (
      student.schoolName ||
      student.school_name ||
      hostSchool
    ).trim();

    if (!schoolsMap.has(sName)) {
      schoolsMap.set(sName, {
        schoolName: sName,
        isHost: sName.toLowerCase() === hostSchool.toLowerCase(),
        totalStudents: 0,
        classes: [],
        sessions: [],
      });
    }

    const schoolObj = schoolsMap.get(sName)!;
    schoolObj.totalStudents += 1;

    const className = (student.className || student.class_name || "").trim();
    if (className && !schoolObj.classes.includes(className)) {
      schoolObj.classes.push(className);
    }
  });

  // 3. Parse target classes in config
  const targetClasses = exam.config?.targetClasses || [];
  targetClasses.forEach((cls) => {
    if (cls.includes(" - ")) {
      const parts = cls.split(" - ");
      const className = parts[0].trim();
      const schoolName = parts.slice(1).join(" - ").trim();
      if (schoolName) {
        if (!schoolsMap.has(schoolName)) {
          schoolsMap.set(schoolName, {
            schoolName,
            isHost: schoolName.toLowerCase() === hostSchool.toLowerCase(),
            totalStudents: 0,
            classes: [],
            sessions: [],
          });
        }
        const schoolObj = schoolsMap.get(schoolName)!;
        if (!schoolObj.classes.includes(className)) {
          schoolObj.classes.push(className);
        }
      }
    } else {
      // General class assigned to host school
      const hostObj = schoolsMap.get(hostSchool)!;
      if (!hostObj.classes.includes(cls)) {
        hostObj.classes.push(cls);
      }
    }
  });

  // 4. Parse daily sessions
  const dailySessions = exam.config?.dailySessions || [];
  dailySessions.forEach((session) => {
    let assignedSchool = hostSchool;

    // Check session name or targetClasses for embedded school name
    if (session.name && session.name.includes(" - ")) {
      const parts = session.name.split(" - ");
      const possibleSchool = parts[0].trim();
      if (possibleSchool) {
        assignedSchool = possibleSchool;
      }
    }

    // Check targetClasses in session
    if (session.targetClasses && session.targetClasses.length > 0) {
      session.targetClasses.forEach((cls) => {
        if (cls.includes(" - ")) {
          const parts = cls.split(" - ");
          const possibleSchool = parts.slice(1).join(" - ").trim();
          if (possibleSchool) {
            assignedSchool = possibleSchool;
          }
        }
      });
    }

    if (!schoolsMap.has(assignedSchool)) {
      schoolsMap.set(assignedSchool, {
        schoolName: assignedSchool,
        isHost: assignedSchool.toLowerCase() === hostSchool.toLowerCase(),
        totalStudents: 0,
        classes: [],
        sessions: [],
      });
    }

    const schoolObj = schoolsMap.get(assignedSchool)!;
    // Add session if not already added
    if (!schoolObj.sessions.some((s) => s.id === session.id)) {
      schoolObj.sessions.push(session);
    }
  });

  const result = Array.from(schoolsMap.values());
  // Sort: Host school first, then alphabetical
  result.sort((a, b) => {
    if (a.isHost) return -1;
    if (b.isHost) return 1;
    return a.schoolName.localeCompare(b.schoolName);
  });

  return result;
};
