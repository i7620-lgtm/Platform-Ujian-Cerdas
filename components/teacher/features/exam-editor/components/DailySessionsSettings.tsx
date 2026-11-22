import React, { useMemo } from "react";
import type { ExamConfig, DailyExamSession } from "../../../../../types";
import {
  ClockIcon,
  TrashIcon,
  PlusCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "../../../../Icons";
import {
  findSessionConflicts,
  validateSessionAgainstGlobal,
} from "../../../../../utils/scheduleUtils";
import {
  normalizeDateString,
  detectUserIndonesianTimezone,
} from "../../../../../utils/timezoneUtils";
import { showConfirmModal } from "../../../../../stores/feedbackStore";
import {
  CompactSegmentedControl,
  InfoIconButton,
} from "./ConfigSharedControls";

interface DailySessionsSettingsProps {
  config: ExamConfig;
  store: {
    addDailySession?: (session?: Partial<DailyExamSession>) => void;
    updateDailySession?: (
      id: string,
      updates: Partial<DailyExamSession>,
    ) => void;
    removeDailySession?: (id: string) => void;
    handleConfigChangeManual: (updater: (prev: ExamConfig) => ExamConfig) => void;
  };
}

export const DailySessionsSettings: React.FC<DailySessionsSettingsProps> = ({
  config,
  store,
}) => {
  const isEnabled = !!config.enableDailyWindow;
  const sessions = useMemo(
    () => config.dailySessions || [],
    [config.dailySessions],
  );
  const examTz = config.timezone || detectUserIndonesianTimezone();

  const availableTargetClasses = useMemo(() => {
    if (!config.targetClasses || !Array.isArray(config.targetClasses)) return [];
    return config.targetClasses
      .map((c) => c.split(":")[0].trim())
      .filter(Boolean);
  }, [config.targetClasses]);

  const conflictInfo = useMemo(() => {
    if (!isEnabled) return { hasConflict: false, conflicts: [] };
    return findSessionConflicts(sessions);
  }, [isEnabled, sessions]);

  const defaultExamDate = normalizeDateString(config.startDate || config.date);

  const handleToggleEnable = () => {
    const nextVal = !isEnabled;
    store.handleConfigChangeManual((prev) => {
      const next = { ...prev, enableDailyWindow: nextVal };
      if (
        nextVal &&
        (!next.dailySessions || next.dailySessions.length === 0)
      ) {
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

  const handleUpdateSession = (
    id: string,
    updates: Partial<DailyExamSession>,
  ) => {
    if (typeof store.updateDailySession === "function") {
      store.updateDailySession(id, updates);
    } else {
      store.handleConfigChangeManual((prev) => {
        const nextList = (prev.dailySessions || []).map((s) =>
          s.id === id ? { ...s, ...updates } : s,
        );
        return { ...prev, dailySessions: nextList };
      });
    }
  };

  const handleRemoveSession = async (id: string) => {
    if (sessions.length <= 1) {
      const confirmRemove = await showConfirmModal({
        title: "Nonaktifkan Pembatasan Sesi Harian?",
        message:
          "Menghapus sesi terakhir akan menonaktifkan pembatasan jam pengerjaan harian. Lanjutkan?",
        tone: "danger",
        confirmLabel: "Hapus & Nonaktifkan",
      });
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
    const updated = current.includes(className)
      ? current.filter((c) => c !== className)
      : [...current, className];

    handleUpdateSession(session.id, {
      targetClasses: updated,
      isGeneral: updated.length === 0,
    });
  };

  return (
    <div className="pt-3 border-t border-slate-100 dark:border-slate-700/80 space-y-3">
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 min-w-0">
          <ClockIcon className="w-4 h-4 text-indigo-500 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="toggle-daily-sessions-window"
                className="text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer truncate"
              >
                Pembatasan Sesi Harian & Isolasi Kelas
              </label>
              <InfoIconButton
                topic="daily_sessions"
                label="Informasi Sesi Harian & Isolasi Kelas"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {isEnabled
                ? `${sessions.length} sesi aktif · Zona ${examTz}`
                : "Opsional · Bagi jam ujian per gelombang atau kelas"}
            </p>
          </div>
        </div>

        <label
          htmlFor="toggle-daily-sessions-window"
          className="relative inline-flex items-center cursor-pointer select-none shrink-0"
        >
          <input
            id="toggle-daily-sessions-window"
            type="checkbox"
            checked={isEnabled}
            onChange={handleToggleEnable}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-slate-300 dark:after:border-slate-500 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4 peer-checked:after:border-white" />
        </label>
      </div>

      {isEnabled && (
        <div className="space-y-2.5">
          {conflictInfo.hasConflict && (
            <div className="px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block">Bentrok Jadwal Sesi:</strong>
                <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                  {conflictInfo.conflicts.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            {sessions.map((session, index) => {
              const isSessionGeneral =
                session.isGeneral ||
                !session.targetClasses ||
                session.targetClasses.length === 0;

              const sessionIssues = validateSessionAgainstGlobal(
                session,
                config,
              );

              return (
                <div
                  key={session.id || `session-${index}`}
                  className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shrink-0 tabular-nums">
                        Sesi {index + 1}
                      </span>
                      <input
                        type="text"
                        value={session.name || ""}
                        placeholder={`Nama Sesi (misal: Sesi ${index + 1})`}
                        onChange={(e) =>
                          handleUpdateSession(session.id, {
                            name: e.target.value,
                          })
                        }
                        className="px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/30 flex-1 max-w-xs"
                      />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <CompactSegmentedControl
                        value={
                          session.dateMode === "SPECIFIC_DATE"
                            ? "SPECIFIC_DATE"
                            : "ALL_DAYS"
                        }
                        onChange={(mode) =>
                          handleUpdateSession(session.id, {
                            dateMode: mode,
                            date:
                              mode === "SPECIFIC_DATE"
                                ? session.date
                                  ? normalizeDateString(session.date)
                                  : defaultExamDate
                                : undefined,
                          })
                        }
                        options={[
                          { value: "ALL_DAYS", label: "Setiap Hari" },
                          { value: "SPECIFIC_DATE", label: "Tanggal Khusus" },
                        ]}
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveSession(session.id)}
                        className="py-1.5 px-2 bg-rose-50/70 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        title="Hapus Sesi"
                      >
                        <TrashIcon className="w-3.5 h-3.5 shrink-0" />
                        <span className="hidden sm:inline">Hapus</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {session.dateMode === "SPECIFIC_DATE" ? (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Tanggal Sesi
                        </label>
                        <input
                          type="date"
                          min={normalizeDateString(config.startDate) || undefined}
                          max={normalizeDateString(config.endDate) || undefined}
                          value={
                            session.date
                              ? normalizeDateString(session.date)
                              : defaultExamDate
                          }
                          onChange={(e) =>
                            handleUpdateSession(session.id, {
                              dateMode: "SPECIFIC_DATE",
                              date: e.target.value,
                            })
                          }
                          className="w-full px-2.5 py-1.5 text-xs font-semibold tabular-nums bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        Aktif setiap hari selama rentang ujian
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
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
                        className="w-full px-2.5 py-1.5 text-xs font-semibold tabular-nums bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
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
                        className="w-full px-2.5 py-1.5 text-xs font-semibold tabular-nums bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  {sessionIssues.length > 0 && (
                    <div className="px-2.5 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-[11px] flex items-start gap-2">
                      <ExclamationTriangleIcon className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <ul className="list-disc list-inside space-y-0.5">
                        {sessionIssues.map((issue, idx) => (
                          <li key={idx}>{issue.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Target Kelas Sesi:
                    </span>
                    <CompactSegmentedControl
                      value={isSessionGeneral ? "GENERAL" : "SPECIFIC"}
                      onChange={(targetMode) => {
                        if (targetMode === "GENERAL") {
                          handleUpdateSession(session.id, {
                            isGeneral: true,
                            targetClasses: [],
                          });
                        } else {
                          const defaultClass =
                            availableTargetClasses.length > 0
                              ? [availableTargetClasses[0]]
                              : [];
                          handleUpdateSession(session.id, {
                            isGeneral: false,
                            targetClasses: defaultClass,
                          });
                        }
                      }}
                      options={[
                        { value: "GENERAL", label: "Kelas Umum" },
                        { value: "SPECIFIC", label: "Kelas Tertentu" },
                      ]}
                    />
                  </div>

                  {!isSessionGeneral && (
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/60">
                      {availableTargetClasses.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {availableTargetClasses.map((cls) => {
                            const isSelected = (
                              session.targetClasses || []
                            ).includes(cls);
                            return (
                              <button
                                key={cls}
                                type="button"
                                onClick={() => handleToggleClass(session, cls)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                                  isSelected
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-700"
                                    : "bg-white text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                <CheckCircleIcon
                                  className={`w-3.5 h-3.5 ${
                                    isSelected
                                      ? "text-indigo-600 dark:text-indigo-400"
                                      : "text-slate-300 dark:text-slate-600"
                                  }`}
                                />
                                <span>{cls}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Isi Target Kelas pada tab Umum terlebih dahulu untuk
                          memilih kelas di sini.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button
              id="btn-tambah-sesi-harian"
              type="button"
              onClick={handleAddSession}
              className="py-1.5 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-300 border border-slate-200 dark:border-slate-600 text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
            >
              <PlusCircleIcon className="w-3.5 h-3.5 shrink-0" />
              <span>Tambah Sesi Baru</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
