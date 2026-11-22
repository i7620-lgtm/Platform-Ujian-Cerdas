import React, { useEffect } from "react";
import type { ExamConfig } from "../../../../../types";
import {
  useExamEditorUIStore,
  type ConfigTabId,
} from "../../../../../stores/examEditorUIStore";
import { detectUserIndonesianTimezone } from "../../../../../utils/timezoneUtils";
import { ConfigGeneralPanel } from "./ConfigGeneralPanel";
import { ConfigSchedulePanel } from "./ConfigSchedulePanel";
import { ConfigSecurityResultsPanel } from "./ConfigSecurityResultsPanel";
import { ConfigBankOlympiadPanel } from "./ConfigBankOlympiadPanel";
import { ConfigInfoModal } from "./ConfigInfoModal";

interface ExamConfigSettingsProps {
  config: ExamConfig;
  store: any;
  handleConfigChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => void;
  handleAddClassTag: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  hasManualGrading: boolean;
  isPremium?: boolean;
  examCode?: string;
}

export const ExamConfigSettings: React.FC<ExamConfigSettingsProps> = ({
  config,
  store,
  handleConfigChange,
  handleAddClassTag,
  hasManualGrading,
  isPremium,
  examCode,
}) => {
  const activeConfigTab = useExamEditorUIStore(
    (state) => state.activeConfigTab,
  );
  const setActiveConfigTab = useExamEditorUIStore(
    (state) => state.setActiveConfigTab,
  );

  useEffect(() => {
    if (!config.timezone) {
      const detected = detectUserIndonesianTimezone();
      if (typeof store.handleConfigChangeManual === "function") {
        store.handleConfigChangeManual((prev: ExamConfig) => ({
          ...prev,
          timezone: prev.timezone || detected,
        }));
      }
    }
  }, [config.timezone, store]);

  const isPRMode = (config.examMode || "").trim().toUpperCase() === "PR";
  const generalHint =
    config.subject && config.classLevel
      ? `${config.subject.split(" ")[0]} · ${config.classLevel}`
      : "Wajib";
  const scheduleHint = isPRMode
    ? "PR"
    : Number(config.timeLimit) > 0
      ? `Ujian · ${config.timeLimit}m`
      : "Ujian";
  const securityHint = config.disableRealtime ? "Stabil" : "Realtime";
  const bankHint =
    config.useBankSoal && config.isOlympiadMode
      ? "Bank + OSN"
      : config.useBankSoal
        ? "Bank Soal"
        : config.isOlympiadMode
          ? "Olimpiade"
          : "Standar";

  const tabs: { id: ConfigTabId; label: string; hint: string }[] = [
    { id: "general", label: "1. Umum & Target", hint: generalHint },
    { id: "schedule", label: "2. Waktu & Sesi", hint: scheduleHint },
    { id: "security_results", label: "3. Keamanan & Hasil", hint: securityHint },
    { id: "bank_olympiad", label: "4. Bank & Penilaian", hint: bankHint },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-3 py-2.5 bg-slate-50/80 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeConfigTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveConfigTab(tab.id)}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                isActive
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-2xs"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-semibold tabular-nums ${
                  isActive
                    ? "text-indigo-100"
                    : "text-slate-400 dark:text-slate-400"
                }`}
              >
                · {tab.hint}
              </span>
            </button>
          );
        })}
      </div>

      <div className="p-4 sm:p-5">
        {activeConfigTab === "general" && (
          <ConfigGeneralPanel
            config={config}
            store={store}
            handleConfigChange={handleConfigChange}
            handleAddClassTag={handleAddClassTag}
            examCode={examCode}
          />
        )}

        {activeConfigTab === "schedule" && (
          <ConfigSchedulePanel
            config={config}
            store={store}
            handleConfigChange={handleConfigChange}
          />
        )}

        {activeConfigTab === "security_results" && (
          <ConfigSecurityResultsPanel
            config={config}
            store={store}
            handleConfigChange={handleConfigChange}
            hasManualGrading={hasManualGrading}
            isPremium={isPremium}
          />
        )}

        {activeConfigTab === "bank_olympiad" && (
          <ConfigBankOlympiadPanel
            config={config}
            store={store}
            handleConfigChange={handleConfigChange}
          />
        )}
      </div>

      <ConfigInfoModal />
    </div>
  );
};
