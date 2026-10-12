import React, { useMemo } from "react";
import type { ExamConfig, DailyExamSession } from "../../../../../types";
import {
  ClockIcon,
  TrashIcon,
  PlusCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
} from "../../../../Icons";
import {
  findSessionConflicts,
  validateSessionAgainstGlobal,
} from "../../../../../utils/scheduleUtils";
import {
  normalizeDateString,
  getTimezoneLabel,
  detectUserIndonesianTimezone,
} from "../../../../../utils/timezoneUtils";

interface DailySessionsSettingsProps {
  config: ExamConfig;
  store: {
    addDailySession?: (session?: Partial<DailyExamSession>) => void;
    updateDailySession?: (id: string, updates: Partial<DailyExamSession>) => void;
    removeDailySession?: (id: string) => void;
    handleConfigChangeManual: (updater: (prev: ExamConfig) => ExamConfig) => void;
  };
}

export const DailySessionsSettings: React.FC<DailySessionsSettingsProps> = ({
  config,
  store,
}) => {
  const isEnabled = !!config.enableDailyWindow;
  const sessions = useMemo(() => config.dailySessions || [], [config.dailySessions]);
  const examTz = config.timezone || detectUserIndonesianTimezone();

  // Ambil daftar kelas target yang didaftarkan guru
  const availableTargetClasses = useMemo(() => {
    if (!config.targetClasses || !Array.isArray(config.targetClasses)) return [];
    return config.targetClasses
      .map((c) => {
        // Handle format seperti "8A" atau "8A: 32"
        const clean = c.split(":")[0].trim();
        return clean;
      })
      .filter(Boolean);
  }, [config.targetClasses]);

  // Cek potensi tumpang tindih waktu antar sesi (memperhitungkan tanggal)
  const conflictInfo = useMemo(() => {
    if (!isEnabled) return { hasConflict: false, conflicts: [] };
    return findSessionConflicts(sessions);
  }, [isEnabled, sessions]);

  const defaultExamDate = normalizeDateString(config.startDate || config.date);

  const handleToggleEnable = () => {
    const nextVal = !isEnabled;
    store.handleConfigChangeManual((prev) => {
      const next = { ...prev, enableDailyWindow: nextVal };
      // Jika baru diaktifkan dan belum ada sesi, inisialisasi sesi pertama
      if (nextVal && (!next.dailySessions || next.dailySessions.length === 0)) {
        next.dailySessions = [
          {
            id: `session-${Date.now()}-1`,
            name: "Sesi 1",
            dateMode: "ALL_DAYS",
            startTime: prev.dailyStartTime || prev.startTime || "08:00",
            endTime: prev.dailyEndTime || prev.endTime || "10:00",
            isGeneral: true,
            targetClasses: [],
          },
        ];
      }
      return next;
    });
  };

  const handleAddSession = () => {
    const count = sessions.length + 1;
    // Tentukan jam mulai default berdasarkan sesi terakhir (misal jeda 30 menit)
    let nextStart = "10:30";
    let nextEnd = "12:30";

    if (sessions.length > 0) {
      const last = sessions[sessions.length - 1];
      const lastEndParts = (last.endTime || "10:00").split(":");
      const endH = parseInt(lastEndParts[0] || "10", 10);
      const endM = parseInt(lastEndParts[1] || "00", 10);
      const nextH = (endH + 1) % 24;
      nextStart = `${nextH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
      const nextEndH = (nextH + 2) % 24;
      nextEnd = `${nextEndH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
    }

    if (typeof store.addDailySession === "function") {
      store.addDailySession({
        name: `Sesi ${count}`,
        dateMode: "ALL_DAYS",
        startTime: nextStart,
        endTime: nextEnd,
        isGeneral: true,
        targetClasses: [],
      });
    } else {
      store.handleConfigChangeManual((prev) => {
        const nextList = [...(prev.dailySessions || [])];
        nextList.push({
          id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: `Sesi ${count}`,
          dateMode: "ALL_DAYS",
          startTime: nextStart,
          endTime: nextEnd,
          isGeneral: true,
          targetClasses: [],
        });
        return { ...prev, dailySessions: nextList };
      });
    }
  };

  const handleUpdateSession = (id: string, updates: Partial<DailyExamSession>) => {
    if (typeof store.updateDailySession === "function") {
      store.updateDailySession(id, updates);
    } else {
      store.handleConfigChangeManual((prev) => {
        const nextList = (prev.dailySessions || []).map((s) =>
          s.id === id ? { ...s, ...updates } : s
        );
        return { ...prev, dailySessions: nextList };
      });
    }
  };

  const handleRemoveSession = (id: string) => {
    if (sessions.length <= 1) {
      const confirmRemove = window.confirm(
        "Menghapus sesi terakhir akan menonaktifkan pembatasan jam pengerjaan harian. Lanjutkan?"
      );
      if (!confirmRemove) return;
      store.handleConfigChangeManual((prev) => ({
        ...prev,
        enableDailyWindow: false,
        dailySessions: [],
      }));
      return;
    }

    if (typeof store.removeDailySession === "function") {
      store.removeDailySession(id);
    } else {
      store.handleConfigChangeManual((prev) => {
        const nextList = (prev.dailySessions || []).filter((s) => s.id !== id);
        return { ...prev, dailySessions: nextList };
      });
    }
  };

  const handleToggleClass = (session: DailyExamSession, className: string) => {
    const current = session.targetClasses || [];
    let updated: string[];
    if (current.includes(className)) {
      updated = current.filter((c) => c !== className);
    } else {
      updated = [...current, className];
    }

    handleUpdateSession(session.id, {
      targetClasses: updated,
      // Jika tidak ada kelas yang dipilih, otomatis jadikan umum
      isGeneral: updated.length === 0,
    });
  };

  return (
    <div className="md:col-span-2 pt-6 pb-2 border-t border-gray-100 dark:border-slate-700/80">
      {/* Header & Toggle Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 transition-all">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mt-0.5">
            <ClockIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Batasi Jam Pengerjaan Harian (Multi-Sesi & Isolasi Kelas)
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                Opsional
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed max-w-2xl">
              Atur satu atau beberapa rentang sesi jam harian. Siswa di luar jam sesinya diarahkan ke Kartu Undangan dan <strong>tidak dapat mengakses naskah soal</strong> hingga jam sesinya tiba.
            </p>
          </div>
        </div>

        {/* Toggle Switch Button */}
        <label className="relative inline-flex items-center cursor-pointer select-none self-start sm:self-center">
          <input
            id="toggle-daily-sessions-window"
            type="checkbox"
            checked={isEnabled}
            onChange={handleToggleEnable}
            className="sr-only peer"
          />
          <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
          <span className="ml-3 text-xs font-bold text-slate-700 dark:text-slate-300">
            {isEnabled ? "Aktif" : "Nonaktif"}
          </span>
        </label>
      </div>

      {/* Sesi List & Konfigurasi */}
      {isEnabled && (
        <div className="mt-5 space-y-4">
          {/* Warning Conflict */}
          {conflictInfo.hasConflict && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs space-y-1.5 flex items-start gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Peringatan Bentrok Jadwal Sesi:</strong>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  {conflictInfo.conflicts.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Sesi Cards */}
          <div className="space-y-3.5">
            {sessions.map((session, index) => {
              const isSessionGeneral =
                session.isGeneral ||
                !session.targetClasses ||
                session.targetClasses.length === 0;

              const sessionIssues = validateSessionAgainstGlobal(session, config);

              return (
                <div
                  key={session.id || `session-${index}`}
                  className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center gap-2.5 flex-1">
                      <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                        Sesi {index + 1}
                      </span>
                      <input
                        type="text"
                        value={session.name || ""}
                        placeholder={`Nama Sesi (misal: Sesi ${index + 1}: Kelas 8A)`}
                        onChange={(e) =>
                          handleUpdateSession(session.id, { name: e.target.value })
                        }
                        className="p-1.5 px-3 text-xs font-bold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 flex-1 max-w-sm"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveSession(session.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 self-end sm:self-center transition-colors p-1"
                      title="Hapus Sesi"
                    >
                      <TrashIcon className="w-4 h-4" />
                      <span>Hapus</span>
                    </button>
                  </div>

                  {/* Mode Jadwal Tanggal: Berlaku Setiap Hari vs Tanggal Kalender Tertentu */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Keberlakuan Hari / Tanggal Sesi:
                    </span>
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateSession(session.id, {
                            dateMode: "ALL_DAYS",
                            date: undefined,
                          })
                        }
                        className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          session.dateMode !== "SPECIFIC_DATE"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        Berlaku Setiap Hari
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateSession(session.id, {
                            dateMode: "SPECIFIC_DATE",
                            date: session.date ? normalizeDateString(session.date) : defaultExamDate,
                          })
                        }
                        className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          session.dateMode === "SPECIFIC_DATE"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        Pilih Tanggal Tertentu
                      </button>
                    </div>
                  </div>

                  {/* Input Tanggal & Jam Sesi */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Tanggal Pelaksanaan Kalender jika mode SPECIFIC_DATE */}
                    {session.dateMode === "SPECIFIC_DATE" ? (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                            Tanggal Pelaksanaan
                          </label>
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                            Kalender
                          </span>
                        </div>
                        <input
                          type="date"
                          min={normalizeDateString(config.startDate) || undefined}
                          max={normalizeDateString(config.endDate) || undefined}
                          value={session.date ? normalizeDateString(session.date) : defaultExamDate}
                          onChange={(e) =>
                            handleUpdateSession(session.id, {
                              dateMode: "SPECIFIC_DATE",
                              date: e.target.value,
                            })
                          }
                          className="w-full p-2.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          {config.startDate && config.endDate
                            ? `Batas: ${normalizeDateString(config.startDate)} s/d ${normalizeDateString(config.endDate)}`
                            : "Tanggal spesifik sesi"}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col justify-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                          <CalendarDaysIcon className="w-4 h-4 text-indigo-500" />
                          <span>Berulang Setiap Hari</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Sesi ini aktif setiap hari selama rentang ujian.
                        </p>
                      </div>
                    )}

                    {/* Jam Mulai */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                        Jam Mulai ({examTz})
                      </label>
                      <input
                        type="time"
                        value={session.startTime || "08:00"}
                        onChange={(e) =>
                          handleUpdateSession(session.id, {
                            startTime: e.target.value,
                          })
                        }
                        className="w-full p-2.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Waktu mulai ({examTz})
                      </p>
                    </div>

                    {/* Jam Selesai */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                        Jam Selesai ({examTz})
                      </label>
                      <input
                        type="time"
                        value={session.endTime || "10:00"}
                        onChange={(e) =>
                          handleUpdateSession(session.id, {
                            endTime: e.target.value,
                          })
                        }
                        className="w-full p-2.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Waktu selesai ({examTz})
                      </p>
                    </div>
                  </div>

                  {/* Warning Validasi Batasan Jadwal Global & Waktu Sesi */}
                  {sessionIssues.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2.5">
                      <ExclamationTriangleIcon className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <strong className="block font-bold">Perhatian Batasan Jadwal Sesi:</strong>
                        <ul className="list-disc list-inside space-y-0.5">
                          {sessionIssues.map((issue, idx) => (
                            <li key={idx}>{issue.message}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Penautan Kelas (Umum vs Tertentu) */}
                  <div className="pt-1">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                      Target Penautan Kelas
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateSession(session.id, {
                            isGeneral: true,
                            targetClasses: [],
                          })
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isSessionGeneral
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        Kelas Umum (Semua Siswa)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          // Default pilih kelas pertama jika ada
                          const defaultClass =
                            availableTargetClasses.length > 0
                              ? [availableTargetClasses[0]]
                              : [];
                          handleUpdateSession(session.id, {
                            isGeneral: false,
                            targetClasses: defaultClass,
                          });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          !isSessionGeneral
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        Kelas Tertentu
                      </button>
                    </div>
                  </div>

                  {/* Jika Kelas Tertentu dipilih: Chip daftar kelas target */}
                  {!isSessionGeneral && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          Pilih kelas yang berhak mengikuti sesi ini:
                        </span>
                        {availableTargetClasses.length > 0 && (
                          <span className="text-[10px] text-slate-400">
                            Terpilih: {(session.targetClasses || []).length} kelas
                          </span>
                        )}
                      </div>

                      {availableTargetClasses.length > 0 ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {availableTargetClasses.map((cls) => {
                            const isSelected = (session.targetClasses || []).includes(cls);
                            return (
                              <button
                                key={cls}
                                type="button"
                                onClick={() => handleToggleClass(session, cls)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                                  isSelected
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-700 shadow-xs"
                                    : "bg-white text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:border-slate-300"
                                }`}
                              >
                                {isSelected ? (
                                  <CheckCircleIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                ) : (
                                  <span className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600 inline-block" />
                                )}
                                <span>{cls}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 py-1">
                          <em>Belum ada Target Kelas yang didaftarkan pada pengaturan ujian di atas. Silakan isi "Target Kelas" di atas terlebih dahulu agar Anda dapat memilih kelas di sini.</em>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tombol Tambah Sesi */}
          <div className="flex justify-end pt-1">
            <button
              id="btn-tambah-sesi-harian"
              type="button"
              onClick={handleAddSession}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-colors shadow-2xs"
            >
              <PlusCircleIcon className="w-4 h-4" />
              <span>+ Tambah Sesi Jam Baru</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
