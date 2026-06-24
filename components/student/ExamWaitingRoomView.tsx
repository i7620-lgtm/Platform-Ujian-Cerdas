import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeftIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  BookOpenIcon,
} from "../Icons";
import type { Exam, Student } from "../../types";
import { storageService } from "../../services/storage";

interface ExamWaitingRoomProps {
  exam: Exam;
  student: Student;
  onBack: () => void;
  onStartExam: (examCode: string, student: Student) => void;
  isDarkMode?: boolean;
}

export const ExamWaitingRoomView: React.FC<ExamWaitingRoomProps> = ({
  exam,
  student,
  onBack,
  onStartExam,
  isDarkMode,
}) => {
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(0);
  const [isExamReady, setIsExamReady] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate start date time of the exam
  const startDateTime = React.useMemo(() => {
    const dateStr = exam.config.startDate || exam.config.date;
    if (!dateStr) return null;
    if (dateStr.includes("T") && dateStr.length > 10) {
      return new Date(dateStr);
    }
    return new Date(`${dateStr}T${exam.config.startTime || "00:00"}`);
  }, [exam.config.startDate, exam.config.date, exam.config.startTime]);

  // Format remaining time nicely
  const formatTimeLeft = (secondsSum: number) => {
    if (secondsSum <= 0) return "00:00:00";
    const h = Math.floor(secondsSum / 3600);
    const m = Math.floor((secondsSum % 3600) / 60);
    const s = secondsSum % 60;
    return [
      h.toString().padStart(2, "0"),
      m.toString().padStart(2, "0"),
      s.toString().padStart(2, "0"),
    ].join(":");
  };

  // Auto tick countdown and check if exam is ready
  useEffect(() => {
    const tick = () => {
      if (!startDateTime) {
        setIsExamReady(true);
        return;
      }
      const diffMs = startDateTime.getTime() - Date.now();
      if (diffMs <= 0) {
        setIsExamReady(true);
        setTimeLeftSeconds(0);

        // Clear countdown but keep check interval active if any
        return;
      }
      setTimeLeftSeconds(Math.ceil(diffMs / 1000));
      setIsExamReady(false);
    };

    tick();
    const timerId = setInterval(tick, 1000);
    return () => clearInterval(timerId);
  }, [startDateTime]);

  // Check if exam is actually started/active by polling configuration state
  const performStatusCheck = useCallback(async () => {
    if (isChecking) return;
    setIsChecking(true);
    try {
      const freshConfig = await storageService.getExamConfig(exam.code);
      if (freshConfig) {
        // If it can be started or isFinished is false, check schedule
        const dateStr = freshConfig.startDate || freshConfig.date;
        let startTime: Date;
        if (dateStr.includes("T") && dateStr.length > 10) {
          startTime = new Date(dateStr);
        } else {
          startTime = new Date(
            `${dateStr}T${freshConfig.startTime || "00:00"}`,
          );
        }

        if (Date.now() >= startTime.getTime() && !freshConfig.isFinished) {
          // Fully launched!
          onStartExam(exam.code, student);
        }
      }
    } catch (err) {
      console.error("Gagal memeriksa status ujian:", err);
    } finally {
      setIsChecking(false);
    }
  }, [isChecking, exam.code, student, onStartExam]);

  // Periodic safety check to auto-transition when countdown finishes or config changes
  useEffect(() => {
    checkIntervalRef.current = setInterval(() => {
      if (isExamReady || Date.now() >= (startDateTime?.getTime() || 0)) {
        performStatusCheck();
      }
    }, 3000);

    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [isExamReady, startDateTime, performStatusCheck]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#FAFAFA] dark:bg-slate-950 relative font-sans selection:bg-indigo-100 selection:text-indigo-800 transition-colors duration-300">
      {/* Ambient Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-gradient-to-br from-indigo-50/40 to-purple-50/40 dark:from-indigo-950/20 dark:to-purple-950/20 rounded-full blur-[120px] animate-pulse"
          style={{ animationDuration: "8s" }}
        ></div>
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-gradient-to-tl from-blue-50/40 to-emerald-50/40 dark:from-blue-950/20 dark:to-emerald-950/20 rounded-full blur-[120px] animate-pulse"
          style={{ animationDuration: "10s" }}
        ></div>
      </div>

      <div className="w-full max-w-[480px] px-4 relative z-10 flex flex-col py-10 my-auto">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="group self-start flex items-center gap-2 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 mb-6 text-[10px] font-bold uppercase tracking-widest transition-all pl-2 py-2"
        >
          <div className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
            <ArrowLeftIcon className="w-3 h-3" />
          </div>
          <span>Keluar Ruangan</span>
        </button>

        {/* Main Glassmorphic Card */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 rounded-[2.5rem] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.03)] dark:shadow-black/40 border border-white dark:border-slate-800 ring-1 ring-slate-50 dark:ring-slate-800 text-center relative overflow-hidden">
          {/* Glowing Top bar accent */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-indigo-500 to-emerald-500 animate-[gradient_6s_ease_infinite]"></div>

          {/* Stage Header / Loading Animation */}
          <div className="mb-6 relative">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-500 dark:text-amber-400 border border-amber-100 dark:border-amber-900 mb-4 relative z-10">
              <ClockIcon className="w-8 h-8 animate-pulse" />
            </div>
            {/* Orbiting ring effect */}
            <div
              className="absolute top-3 left-1/2 -ml-8 w-16 h-16 rounded-full border-2 border-dashed border-amber-500/30 dark:border-amber-500/20 animate-spin"
              style={{ animationDuration: "15s" }}
            ></div>

            <div className="inline-block px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100/50 dark:border-amber-900/30 mb-2">
              Mode Standby
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              Ruang Tunggu Ujian
            </h2>
            <p className="text-slate-400 dark:text-slate-500 text-xs font-medium max-w-[280px] mx-auto mt-1 leading-relaxed">
              Mohon bersiap, ujian Anda akan segera aktif secara otomatis.
            </p>
          </div>

          {/* Countdown / Status Box */}
          <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 mb-6">
            {isExamReady ? (
              <div className="space-y-1">
                <div className="text-xs font-bold text-emerald-500 dark:text-emerald-400 flex items-center justify-center gap-1.5 uppercase tracking-wider">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>Ujian Siap Diikuti</span>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  Beralih ke halaman pengerjaan soal...
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Dimulai Dalam
                </p>
                <p className="text-3xl font-mono font-black tracking-wider text-indigo-600 dark:text-indigo-400">
                  {formatTimeLeft(timeLeftSeconds)}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  Jadwal:{" "}
                  {startDateTime
                    ? startDateTime.toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}{" "}
                  WIB
                </p>
              </div>
            )}
          </div>

          {/* Exam Meta Card */}
          <div className="text-left bg-gradient-to-br from-indigo-50/30 to-purple-50/30 dark:from-indigo-950/10 dark:to-purple-950/10 rounded-2xl p-4 border border-indigo-100/40 dark:border-slate-800/60 mb-6 space-y-3">
            <div className="flex items-start gap-3">
              <BookOpenIcon className="w-5 h-5 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Mata Pelajaran & Kelas
                </h4>
                <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                  {exam.config.subject || "Ujian Terbuka"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                  Jenjang {exam.config.classLevel || "-"} •{" "}
                  {exam.questions.length || 0} Soal •{" "}
                  {exam.config.timeLimit || 0} Menit
                </p>
              </div>
            </div>

            {exam.config.description && (
              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Keterangan
                </h4>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-3">
                  {exam.config.description}
                </p>
              </div>
            )}
          </div>

          {/* Student Identity Badge */}
          <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-805 rounded-xl text-left">
            <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
              <UserIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">
                Identitas Peserta
              </p>
              <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                {student.fullName}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                No. Absen / NIS:{" "}
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {student.absentNumber}
                </span>{" "}
                • {student.class}
              </p>
            </div>
          </div>

          {/* Refresh status button */}
          <button
            onClick={performStatusCheck}
            disabled={isChecking}
            className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs py-3 rounded-xl transition-all active:scale-[0.98] mt-6 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{isChecking ? "Menghubungkan..." : "Segarkan Status"}</span>
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em]">
            Platform Ujian Cerdas
          </p>
        </div>
      </div>
    </div>
  );
};
