import type { Exam, IndonesianTimezone } from "../../types";
import {
  normalizeDateString,
  toAbsoluteUtcTimestamp,
} from "../../utils/timezoneUtils";

export interface ExamTimeState {
  status: "UPCOMING" | "FINISHED" | "ONGOING";
  diff: number;
  isUnlimited?: boolean;
}

export const getExamDates = (exam: Exam): { start: Date; end: Date } => {
  const mode = (exam.config?.examMode || "UJIAN").trim().toUpperCase();
  const examTz: IndonesianTimezone = exam.config?.timezone || "WIB";
  const startDateRaw = exam.config?.startDate || exam.config?.date || "";
  const endDateRaw = exam.config?.endDate;

  let start: Date;
  if (startDateRaw.includes("T")) {
    start = new Date(startDateRaw);
  } else {
    const startTimeStr = exam.config?.startTime || "00:00";
    start = new Date(
      toAbsoluteUtcTimestamp(
        normalizeDateString(startDateRaw),
        startTimeStr,
        examTz,
        false,
      ),
    );
  }

  if (isNaN(start.getTime())) start = new Date();

  let end: Date;
  const endTimeStr = exam.config?.endTime || "23:59";
  const cleanStartDateStr = normalizeDateString(startDateRaw);
  const cleanEndDateStr = endDateRaw
    ? normalizeDateString(endDateRaw)
    : cleanStartDateStr;

  if (mode === "PR") {
    // Mode PR is available anytime before the deadline end time (default 23:59)
    start = new Date(0);
    if (endDateRaw && endDateRaw.includes("T")) {
      end = new Date(endDateRaw);
    } else {
      end = new Date(
        toAbsoluteUtcTimestamp(cleanEndDateStr, endTimeStr, examTz, true),
      );
    }
  } else {
    if (endDateRaw || exam.config?.endTime) {
      if (endDateRaw && endDateRaw.includes("T")) {
        end = new Date(endDateRaw);
      } else {
        end = new Date(
          toAbsoluteUtcTimestamp(cleanEndDateStr, endTimeStr, examTz, true),
        );
      }
    } else if (exam.config && exam.config.timeLimit > 0) {
      end = new Date(start.getTime() + (exam.config.timeLimit || 0) * 60000);
    } else {
      end = new Date(
        toAbsoluteUtcTimestamp(cleanStartDateStr, "23:59", examTz, true),
      );
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
