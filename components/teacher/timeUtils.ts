import type { Exam } from "../../types";

export interface ExamTimeState {
  status: "UPCOMING" | "FINISHED" | "ONGOING";
  diff: number;
  isUnlimited?: boolean;
}

export const getExamDates = (exam: Exam): { start: Date; end: Date } => {
  const mode = exam.config?.examMode || "UJIAN";
  const startDateRaw = exam.config?.startDate || exam.config?.date || "";
  const endDateRaw = exam.config?.endDate;

  let start: Date;
  if (startDateRaw.includes("T")) {
    start = new Date(startDateRaw);
  } else {
    const startTimeStr = exam.config?.startTime || "00:00";
    start = new Date(`${startDateRaw}T${startTimeStr}`);
  }

  if (isNaN(start.getTime())) start = new Date();

  let end: Date;
  const endTimeStr = exam.config?.endTime || "23:59";

  const getLocalDateStr = (raw: string | undefined) => {
    if (!raw) return "";
    if (raw.includes("T")) {
      const d = new Date(raw);
      return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-CA");
    }
    return raw;
  };

  const localStartDateStr = getLocalDateStr(startDateRaw);
  const localEndDateStr = getLocalDateStr(endDateRaw) || localStartDateStr;

  if (mode === "PR") {
    // Mode PR ignores time selection and goes until midnight of the deadline
    start = new Date(0); // Available anytime before deadline
    end = new Date(`${localEndDateStr}T23:59:59`);
  } else {
    if (endDateRaw || exam.config?.endTime) {
      if (endDateRaw && endDateRaw.includes("T")) {
        end = new Date(endDateRaw);
      } else {
        end = new Date(`${localEndDateStr}T${endTimeStr}:59`);
      }
    } else if (exam.config && exam.config.timeLimit > 0) {
      end = new Date(start.getTime() + (exam.config.timeLimit || 0) * 60000);
    } else {
      end = new Date(`${localStartDateStr}T23:59:59`);
    }
  }

  if (isNaN(end.getTime())) {
    end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  }

  return { start, end };
};

export const calculateTimeLeft = (exam: Exam): ExamTimeState => {
  const now = Date.now();
  const { start, end } = getExamDates(exam);
  const mode = exam.config?.examMode || "UJIAN";

  if (now < start.getTime()) {
    return {
      status: "UPCOMING",
      diff: Math.max(0, start.getTime() - now),
      isUnlimited: false,
    };
  }

  const timeLeft = Math.max(0, end.getTime() - now);
  return {
    status: timeLeft === 0 ? "FINISHED" : "ONGOING",
    diff: timeLeft,
    isUnlimited: mode === "PR" || (exam.config && exam.config.timeLimit === 0),
  };
};
