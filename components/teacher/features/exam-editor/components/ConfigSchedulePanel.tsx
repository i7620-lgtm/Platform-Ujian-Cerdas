import React from "react";
import type { ExamConfig } from "../../../../../types";
import {
  detectUserIndonesianTimezone,
  formatForDateInput,
} from "../../../../../utils/timezoneUtils";
import { DailySessionsSettings } from "./DailySessionsSettings";
import {
  CompactSegmentedControl,
  InfoIconButton,
} from "./ConfigSharedControls";

interface ConfigSchedulePanelProps {
  config: ExamConfig;
  store: any;
  handleConfigChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => void;
}

export const ConfigSchedulePanel: React.FC<ConfigSchedulePanelProps> = ({
  config,
  store,
  handleConfigChange,
}) => {
  const isPRMode = (config.examMode || "").trim().toUpperCase() === "PR";
  const currentMode: "UJIAN" | "PR" = isPRMode ? "PR" : "UJIAN";
  const activeTz = config.timezone || detectUserIndonesianTimezone();

  const handleModeSwitch = (mode: "UJIAN" | "PR") => {
    if (mode === "UJIAN") {
      store.handleConfigChangeManual((prev: ExamConfig) => ({
        ...prev,
        examMode: "UJIAN",
        endTime:
          prev.endTime === "23:59" ? "10:00" : prev.endTime || "10:00",
      }));
    } else {
      store.handleConfigChangeManual((prev: ExamConfig) => ({
        ...prev,
        examMode: "PR",
        detectBehavior: false,
        continueWithPermission: false,
        trackLocation: false,
        allowOvertime: false,
        endTime:
          prev.endTime && prev.endTime !== "10:00" ? prev.endTime : "23:59",
      }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-700/80">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            Mode Pelaksanaan
          </span>
          <InfoIconButton
            topic="exam_mode"
            label="Perbedaan Mode Ujian dan Mode PR"
          />
          <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
            ·{" "}
            {isPRMode
              ? "Fleksibel sebelum tenggat"
              : "Rentang jam ketat & pengawasan"}
          </span>
        </div>

        <CompactSegmentedControl
          value={currentMode}
          onChange={handleModeSwitch}
          fullWidthOnMobile
          options={[
            {
              value: "UJIAN",
              label: "Mode Ujian",
              activeClass:
                "bg-indigo-600 text-white border-indigo-600 shadow-2xs",
            },
            {
              value: "PR",
              label: "Mode PR / Latihan",
              activeClass:
                "bg-amber-500 text-white border-amber-500 shadow-2xs",
            },
          ]}
        />
      </div>

      {isPRMode ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Tenggat Tanggal
            </label>
            <input
              id="input-pr-end-date"
              type="date"
              name="endDate"
              value={formatForDateInput(config.endDate || config.date)}
              onChange={handleConfigChange}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/30 text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Batas Jam ({activeTz})
            </label>
            <input
              id="input-pr-end-time"
              type="time"
              name="endTime"
              value={config.endTime || "23:59"}
              onChange={handleConfigChange}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/30 text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Zona Waktu Acuan
            </label>
            <select
              id="input-pr-timezone"
              name="timezone"
              value={activeTz}
              onChange={handleConfigChange}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/30 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
            >
              <option value="WIB">WIB (UTC+7)</option>
              <option value="WITA">WITA (UTC+8)</option>
              <option value="WIT">WIT (UTC+9)</option>
            </select>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Tanggal Mulai
            </label>
            <input
              id="input-exam-start-date"
              type="date"
              name="startDate"
              value={formatForDateInput(config.startDate || config.date)}
              onChange={handleConfigChange}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/30 text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Jam Mulai{" "}
              <span className="text-indigo-600 dark:text-indigo-400">
                ({activeTz})
              </span>
            </label>
            <input
              id="input-exam-start-time"
              type="time"
              name="startTime"
              value={config.startTime || "08:00"}
              onChange={handleConfigChange}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/30 text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Durasi (Menit)
            </label>
            <input
              id="input-exam-time-limit"
              type="number"
              name="timeLimit"
              value={config.timeLimit || ""}
              placeholder="0 = tanpa batas"
              onChange={handleConfigChange}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/30 text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Tanggal Selesai
            </label>
            <input
              id="input-exam-end-date"
              type="date"
              name="endDate"
              value={formatForDateInput(config.endDate || config.date)}
              onChange={handleConfigChange}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/30 text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Jam Selesai{" "}
              <span className="text-indigo-600 dark:text-indigo-400">
                ({activeTz})
              </span>
            </label>
            <input
              id="input-exam-end-time"
              type="time"
              name="endTime"
              value={config.endTime || "10:00"}
              onChange={handleConfigChange}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/30 text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Zona Waktu Acuan
            </label>
            <select
              id="input-exam-timezone"
              name="timezone"
              value={activeTz}
              onChange={handleConfigChange}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/30 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
            >
              <option value="WIB">WIB (UTC+7)</option>
              <option value="WITA">WITA (UTC+8)</option>
              <option value="WIT">WIT (UTC+9)</option>
            </select>
          </div>
        </div>
      )}

      {!isPRMode && <DailySessionsSettings config={config} store={store} />}
    </div>
  );
};
