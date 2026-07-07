import React, { useMemo, useState, useEffect } from "react";
import type { Exam, Question, Result } from "../../../types";
import {
  ChartBarIcon,
  CheckCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "../../Icons";
import { QuestionAnalysisItem } from "./QuestionAnalysisItem";
export * from "./QuestionAnalysisItem";
import { parseList, normalize, isAnswerMatch } from "../examUtils";

// --- SHARED COMPONENTS ---

export const StatWidget: React.FC<{
  label: string;
  value: string | number;
  color: string;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
}> = ({ label, value, color, icon: Icon }) => {
  const colorName = color.split("-")[1] || "gray";
  return (
    <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4 transition-all hover:shadow-md flex-1 print:border-slate-300 print:shadow-none print:rounded-lg">
      <div
        className={`p-3 rounded-xl ${color} dark:bg-${colorName}-900/20 bg-opacity-10 text-${colorName}-600 dark:text-${colorName}-400 print:bg-transparent print:p-0`}
      >
        {Icon ? (
          <Icon className="w-6 h-6 print:w-4 print:h-4" />
        ) : (
          <ChartBarIcon className="w-6 h-6 print:w-4 print:h-4" />
        )}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest print:text-slate-600">
          {label}
        </p>
        <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-none mt-1 print:text-lg">
          {value}
        </p>
      </div>
    </div>
  );
};

export const RemainingTime: React.FC<{ exam: Exam; minimal?: boolean }> = ({
  exam,
  minimal = false,
}) => {
  const [timeState, setTimeState] = useState(() => calculateTimeLeft(exam));
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeState(calculateTimeLeft(exam));
    }, 1000);
    return () => clearInterval(timer);
  }, [exam]);
  if (timeState.status === "FINISHED")
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300 border border-gray-200 dark:border-slate-600`}
      >
        Selesai
      </span>
    );
  if (timeState.status === "UPCOMING")
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800`}
      >
        Belum Dimulai
      </span>
    );
  const hours = Math.floor(timeState.diff / (1000 * 60 * 60));
  const minutes = Math.floor((timeState.diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeState.diff % (1000 * 60)) / 1000);
  const timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  const totalMinutesLeft = timeState.diff / (1000 * 60);
  let colorClass =
    "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800";
  let dotClass = "bg-emerald-500";
  if (!timeState.isUnlimited) {
    if (totalMinutesLeft < 5) {
      colorClass =
        "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800 animate-pulse";
      dotClass = "bg-rose-500";
    } else if (totalMinutesLeft < 15) {
      colorClass =
        "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800";
      dotClass = "bg-amber-500";
    }
  }
  if (minimal) {
    return (
      <span className="font-mono font-bold tracking-tight">
        {timeState.isUnlimited ? "Tanpa Batas" : timeString}
      </span>
    );
  }
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colorClass} transition-colors duration-500`}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotClass}`}
        ></span>
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${dotClass}`}
        ></span>
      </span>
      <span className="font-mono text-sm font-bold tracking-widest tabular-nums">
        {timeState.isUnlimited ? "Tanpa Batas" : timeString}
      </span>
    </div>
  );
};

export const MetaBadge: React.FC<{ text: string; colorClass?: string }> = ({
  text,
  colorClass = "bg-gray-100 text-gray-600",
}) => {
  if (!text || text === "Lainnya") return null;
  let darkClass = "";
  if (colorClass.includes("blue"))
    darkClass = "dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
  else if (colorClass.includes("purple"))
    darkClass =
      "dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800";
  else if (colorClass.includes("gray"))
    darkClass = "dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600";
  else
    darkClass = "dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600";

  return (
    <span
      className={`text-[10px] font-bold px-2.5 py-1 rounded-md border border-opacity-50 whitespace-normal break-words ${colorClass} ${darkClass}`}
    >
      {text}
    </span>
  );
};
