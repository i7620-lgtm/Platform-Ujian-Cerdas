import React from "react";
import type { ExamConfig } from "../../../../../types";
import { SparklesIcon } from "../../../../Icons";
import {
  CompactSegmentedControl,
  CompactSwitchRow,
  InfoIconButton,
} from "./ConfigSharedControls";

interface ConfigSecurityResultsPanelProps {
  config: ExamConfig;
  store: any;
  handleConfigChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => void;
  hasManualGrading: boolean;
  isPremium?: boolean;
}

export const ConfigSecurityResultsPanel: React.FC<
  ConfigSecurityResultsPanelProps
> = ({ config, store, handleConfigChange, hasManualGrading, isPremium }) => {
  const isPRMode = (config.examMode || "").trim().toUpperCase() === "PR";
  const isOvertimeDisabled = isPRMode || !(Number(config.timeLimit) > 0);
  const isLockViolationDisabled = isPRMode || !config.detectBehavior;

  const operationModeValue: "STABIL" | "REALTIME" = config.disableRealtime
    ? "STABIL"
    : "REALTIME";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 overflow-hidden">
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200/80 dark:border-slate-700">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Perilaku & Keamanan
            </h4>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/70">
            <CompactSwitchRow
              name="shuffleQuestions"
              label="Acak Soal"
              checked={config.shuffleQuestions || false}
              onChange={handleConfigChange}
            />
            <CompactSwitchRow
              name="shuffleAnswers"
              label="Acak Opsi"
              checked={config.shuffleAnswers || false}
              onChange={handleConfigChange}
            />
            <CompactSwitchRow
              name="allowRetakes"
              label="Izinkan Kerjakan Ulang"
              checked={config.allowRetakes || false}
              onChange={handleConfigChange}
            />
            <CompactSwitchRow
              name="allowOvertime"
              label="Izinkan Kerja Lewat Waktu"
              checked={!isOvertimeDisabled && (config.allowOvertime || false)}
              disabled={isOvertimeDisabled}
              onChange={handleConfigChange}
              infoTopic="allow_overtime"
              hint={
                isOvertimeDisabled
                  ? "Aktif pada Mode Ujian dengan durasi > 0 menit"
                  : undefined
              }
            />
            <CompactSwitchRow
              name="detectBehavior"
              label="Deteksi Kecurangan"
              checked={!isPRMode && (config.detectBehavior || false)}
              disabled={isPRMode}
              onChange={handleConfigChange}
              infoTopic="detect_behavior"
              hint={isPRMode ? "Tidak tersedia pada Mode PR" : undefined}
            />
            <CompactSwitchRow
              name="continueWithPermission"
              label="Kunci Akses Jika Melanggar"
              checked={
                !isLockViolationDisabled &&
                (config.continueWithPermission || false)
              }
              disabled={isLockViolationDisabled}
              onChange={handleConfigChange}
              infoTopic="lock_violation"
              tone="rose"
              hint={
                isPRMode
                  ? "Tidak tersedia pada Mode PR"
                  : !config.detectBehavior
                    ? "Aktifkan Deteksi Kecurangan terlebih dahulu"
                    : "Sesi siswa dikunci otomatis saat pelanggaran"
              }
            />
            {!isPRMode && (
              <CompactSwitchRow
                name="trackLocation"
                label="Lacak Lokasi (GPS)"
                checked={config.trackLocation || false}
                onChange={handleConfigChange}
              />
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200/80 dark:border-slate-700">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Hasil & Review Siswa
              </h4>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700/70">
              <CompactSwitchRow
                name="showResultToStudent"
                label="Umumkan Nilai Otomatis"
                checked={config.showResultToStudent || false}
                disabled={hasManualGrading}
                onChange={handleConfigChange}
                hint={
                  hasManualGrading
                    ? "Dinonaktifkan otomatis (terdapat Esai / Isian Singkat)"
                    : undefined
                }
              />
              <CompactSwitchRow
                name="showCorrectAnswer"
                label="Tampilkan Kunci (Review)"
                checked={config.showCorrectAnswer || false}
                onChange={handleConfigChange}
              />
              <CompactSwitchRow
                name="showHints"
                label="Tampilkan Petunjuk Pengerjaan"
                checked={config.showHints || false}
                onChange={handleConfigChange}
              />
              <CompactSwitchRow
                name="showSolutionSteps"
                label="Tampilkan Pembahasan Jawaban"
                checked={config.showSolutionSteps || false}
                onChange={handleConfigChange}
              />
              <CompactSwitchRow
                name="enableCertificate"
                label="Berikan Akses Sertifikat"
                checked={config.enableCertificate || false}
                onChange={handleConfigChange}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40">
          <div className="flex items-center gap-2 min-w-0">
            <SparklesIcon className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                  Desain e-Certificate
                </span>
                <InfoIconButton
                  topic="certificate"
                  label="Informasi Sertifikat Kelulusan Otomatis"
                />
              </div>
              {!isPremium && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                  Khusus Akun Premium
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => isPremium && store.setCertificateModalOpen(true)}
            disabled={!isPremium}
            className={`py-1.5 px-2.5 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap shrink-0 shadow-2xs ${
              isPremium
                ? "bg-white hover:bg-amber-50 dark:bg-slate-700 dark:hover:bg-slate-600 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/60 cursor-pointer"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed"
            }`}
          >
            {config.certificateSettings?.enabled
              ? "Ubah Desain"
              : "Buat Sertifikat"}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
              Mode Operasi
            </span>
            <InfoIconButton
              topic="operation_mode"
              label="Perbedaan Mode Stabil dan Mode Realtime"
            />
          </div>

          <CompactSegmentedControl
            value={operationModeValue}
            onChange={(val) =>
              store.handleConfigChangeManual((prev: ExamConfig) => ({
                ...prev,
                disableRealtime: val === "STABIL",
              }))
            }
            fullWidthOnMobile
            options={[
              {
                value: "STABIL",
                label: "Stabil (Rekomendasi)",
                activeClass:
                  "bg-emerald-600 text-white border-emerald-600 shadow-2xs",
              },
              {
                value: "REALTIME",
                label: "Realtime",
                activeClass:
                  "bg-indigo-600 text-white border-indigo-600 shadow-2xs",
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
};
