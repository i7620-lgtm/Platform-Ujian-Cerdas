import React from "react";
import type { Exam, Student } from "../../types";
import {
  ClockIcon,
  UserIcon,
  LockClosedIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  ArrowLeftIcon,
} from "../Icons";
import type { StudentAccessCheckResult } from "../../utils/scheduleUtils";

interface StudentInvitationCardProps {
  exam: Exam;
  student: Student;
  accessResult: StudentAccessCheckResult;
  onEnterExam: () => void;
  onBack: () => void;
  isEntering?: boolean;
}

export const StudentInvitationCard: React.FC<StudentInvitationCardProps> = ({
  exam,
  student,
  accessResult,
  onEnterExam,
  onBack,
  isEntering = false,
}) => {
  const { status, canAccess, countdownSeconds, nextSession, nextSessionDate, applicableSessions } =
    accessResult;

  // Format hitung mundur
  const days = Math.floor(countdownSeconds / (24 * 3600));
  const hours = Math.floor((countdownSeconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((countdownSeconds % 3600) / 60);
  const seconds = countdownSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");

  const formattedDate = nextSessionDate
    ? nextSessionDate.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#FAFAFA] dark:bg-slate-950 p-4 font-sans relative selection:bg-indigo-100 selection:text-indigo-800 transition-colors duration-300">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-gradient-to-br from-indigo-100/40 to-purple-100/40 dark:from-indigo-900/15 dark:to-purple-900/15 rounded-full blur-[100px] animate-pulse"
          style={{ animationDuration: "8s" }}
        />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-gradient-to-tl from-blue-100/40 to-emerald-100/40 dark:from-blue-900/15 dark:to-emerald-900/15 rounded-full blur-[100px] animate-pulse"
          style={{ animationDuration: "10s" }}
        />
      </div>

      <div className="w-full max-w-lg relative z-10 my-auto py-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 p-6 text-white text-center relative">
            <button
              type="button"
              onClick={onBack}
              className="absolute left-4 top-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Kembali ke formulir"
            >
              <ArrowLeftIcon className="w-4 h-4" />
            </button>

            <span className="inline-block text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full bg-white/20 backdrop-blur-md mb-2">
              Kartu Undangan Ujian
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              {exam.config.subject || "Ujian Sekolah"}
            </h2>
            <p className="text-xs text-indigo-100 mt-1 max-w-sm mx-auto font-medium">
              {exam.config.description || exam.authorSchool || "Pelaksanaan Ujian Resmi Berbasis Komputer"}
            </p>
          </div>

          <div className="p-6 sm:p-7 space-y-6">
            {/* Student Identity Badge */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <UserIcon className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                    {student.fullName}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 shrink-0">
                    Kelas {student.class}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  No. Absen: <strong>{student.absentNumber || "-"}</strong> • {student.schoolName || "-"}
                </p>
              </div>
            </div>

            {/* Countdown / Status Box */}
            {canAccess ? (
              <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-center space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 mb-1">
                  <CheckCircleIcon className="w-6 h-6" />
                </div>
                <h4 className="text-base font-black text-emerald-800 dark:text-emerald-200">
                  Sesi Ujian Telah Dibuka!
                </h4>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 max-w-sm mx-auto">
                  Sesi pengerjaan untuk kelas Anda saat ini aktif. Silakan klik tombol di bawah untuk mulai mengerjakan.
                </p>
              </div>
            ) : status === "FINISHED_GLOBAL" ? (
              <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-center space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 mb-1">
                  <LockClosedIcon className="w-6 h-6" />
                </div>
                <h4 className="text-base font-black text-rose-800 dark:text-rose-200">
                  Ujian Telah Selesai
                </h4>
                <p className="text-xs text-rose-600 dark:text-rose-400 max-w-sm mx-auto">
                  Batas waktu pelaksanaan ujian ini telah berakhir. Hubungi guru atau pengawas ujian Anda.
                </p>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-center space-y-3.5">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                  <ClockIcon className="w-4 h-4" />
                  <span>
                    {status === "NOT_STARTED_GLOBAL"
                      ? "Menunggu Jadwal Mulai Ujian"
                      : "Menunggu Jam Sesi Kelas Anda Dibuka"}
                  </span>
                </div>

                {/* Real-time Countdown Digits or Informative Status */}
                {countdownSeconds > 0 ? (
                  <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
                    {days > 0 && (
                      <>
                        <div className="flex flex-col items-center">
                          <span className="w-12 sm:w-14 h-12 sm:h-14 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-mono font-black text-xl sm:text-2xl shadow-xs border border-indigo-100 dark:border-slate-700">
                            {pad(days)}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Hari</span>
                        </div>
                        <span className="text-indigo-300 font-bold text-xl self-center pb-4">:</span>
                      </>
                    )}
                    <div className="flex flex-col items-center">
                      <span className="w-12 sm:w-14 h-12 sm:h-14 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-mono font-black text-xl sm:text-2xl shadow-xs border border-indigo-100 dark:border-slate-700">
                        {pad(hours)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Jam</span>
                    </div>
                    <span className="text-indigo-300 font-bold text-xl self-center pb-4">:</span>
                    <div className="flex flex-col items-center">
                      <span className="w-12 sm:w-14 h-12 sm:h-14 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-mono font-black text-xl sm:text-2xl shadow-xs border border-indigo-100 dark:border-slate-700">
                        {pad(minutes)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Menit</span>
                    </div>
                    <span className="text-indigo-300 font-bold text-xl self-center pb-4">:</span>
                    <div className="flex flex-col items-center">
                      <span className="w-12 sm:w-14 h-12 sm:h-14 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-mono font-black text-xl sm:text-2xl shadow-xs border border-indigo-100 dark:border-slate-700">
                        {pad(seconds)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Detik</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-2 px-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200 text-xs font-semibold">
                    {accessResult.message || "Belum ada sesi aktif saat ini."}
                  </div>
                )}

                <div className="text-xs text-slate-600 dark:text-slate-300 pt-1 space-y-1.5">
                  {nextSession ? (
                    <>
                      <div>
                        Jadwal sesi kelas Anda (<strong>{nextSession.name || "Sesi Pengerjaan"}</strong>):{" "}
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {nextSession.startTime} - {nextSession.endTime} {accessResult.timezone || "WIB"}
                        </span>
                      </div>
                      {formattedDate && <span className="block text-[11px] text-slate-400 mt-0.5">{formattedDate}</span>}
                    </>
                  ) : status === "NOT_STARTED_GLOBAL" ? (
                    <div>
                      Jadwal pelaksanaan ujian:{" "}
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {accessResult.targetTimeLabel || `${exam.config.startTime || "08:00"} - ${exam.config.endTime || "10:00"} ${accessResult.timezone || "WIB"}`}
                      </span>
                    </div>
                  ) : null}

                  {accessResult.studentTimezoneNotice && (
                    <div className="text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold bg-indigo-50/80 dark:bg-indigo-900/40 p-2 rounded-xl border border-indigo-100 dark:border-indigo-800">
                      {accessResult.studentTimezoneNotice}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timetable of Applicable Sessions for this student */}
            {applicableSessions.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Jadwal Sesi Terdaftar untuk Kelas {student.class}:
                </span>
                <div className="space-y-1.5">
                  {applicableSessions.map((s, idx) => (
                    <div
                      key={s.id || idx}
                      className="p-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {s.name || `Sesi ${idx + 1}`}
                        </span>
                        {s.dateMode === "SPECIFIC_DATE" || s.date ? (
                          <span className="block text-[10px] text-slate-400 font-medium">
                            Tanggal: {s.date}
                          </span>
                        ) : (
                          <span className="block text-[10px] text-slate-400 font-medium">
                            Berlaku: Setiap Hari
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {s.startTime} - {s.endTime} {accessResult.timezone || "WIB"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                id="btn-masuk-ujian-invitasi"
                type="button"
                onClick={onEnterExam}
                disabled={!canAccess || isEntering}
                className={`w-full py-3.5 px-6 rounded-2xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg ${
                  canAccess && !isEntering
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-indigo-950/40 cursor-pointer"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none"
                }`}
              >
                {isEntering ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Mempersiapkan Lembar Soal...</span>
                  </>
                ) : canAccess ? (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    <span>Masuk Ujian Sekarang</span>
                  </>
                ) : (
                  <>
                    <LockClosedIcon className="w-4 h-4" />
                    <span>Masuk Ujian (Terkunci)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onBack}
                className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                Ganti Nama / Kelas
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
