import React from "react";
import type { ExamConfig } from "../../../../../types";
import { CompactSwitchRow } from "./ConfigSharedControls";

interface ConfigBankOlympiadPanelProps {
  config: ExamConfig;
  store: any;
  handleConfigChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => void;
}

export const ConfigBankOlympiadPanel: React.FC<
  ConfigBankOlympiadPanelProps
> = ({ config, store, handleConfigChange }) => {
  const mudahPct = config.bankSoalProportions?.mudah ?? 30;
  const sedangPct = config.bankSoalProportions?.sedang ?? 50;
  const sulitPct = config.bankSoalProportions?.sulit ?? 20;
  const totalPct = mudahPct + sedangPct + sulitPct;

  const qCount = store?.questions
    ? store.questions.filter((q: any) => q.questionType !== "INFO").length
    : 0;
  const countToUse = qCount > 0 ? qCount : 10;
  const cMul = config.olympiadScoring?.correctMultiplier ?? 4;
  const wMul = config.olympiadScoring?.wrongMultiplier ?? -1;
  const eMul = config.olympiadScoring?.emptyMultiplier ?? 0;
  const maxPt = countToUse * cMul;
  const minPt = countToUse * wMul;

  const setOlympiadPreset = (
    correctMultiplier: number,
    wrongMultiplier: number,
    emptyMultiplier: number,
  ) => {
    if (typeof store.handleConfigChangeManual === "function") {
      store.handleConfigChangeManual((prev: ExamConfig) => ({
        ...prev,
        isOlympiadMode: true,
        olympiadScoring: {
          correctMultiplier,
          wrongMultiplier,
          emptyMultiplier,
        },
      }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 overflow-hidden">
        <CompactSwitchRow
          name="useBankSoal"
          label="Gunakan Sistem Bank Soal"
          checked={config.useBankSoal || false}
          onChange={handleConfigChange}
          infoTopic="bank_soal"
          hint="Acak & pilih soal otomatis sesuai komposisi tingkat kesulitan"
        />

        {config.useBankSoal && (
          <div className="p-3.5 border-t border-slate-100 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-900/40 space-y-3 animate-fade-in">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Jumlah Soal Siswa
                </label>
                <input
                  type="number"
                  name="bankSoalCount"
                  value={config.bankSoalCount || 10}
                  onChange={handleConfigChange}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/30 text-xs font-bold tabular-nums text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                  Mudah (%)
                </label>
                <input
                  type="number"
                  value={mudahPct}
                  onChange={(e) =>
                    store.handleConfigChangeManual((prev: ExamConfig) => ({
                      ...prev,
                      bankSoalProportions: {
                        mudah: parseInt(e.target.value, 10) || 0,
                        sedang: prev.bankSoalProportions?.sedang ?? 50,
                        sulit: prev.bankSoalProportions?.sulit ?? 20,
                      },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500/30 text-xs font-bold tabular-nums text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-1">
                  Sedang (%)
                </label>
                <input
                  type="number"
                  value={sedangPct}
                  onChange={(e) =>
                    store.handleConfigChangeManual((prev: ExamConfig) => ({
                      ...prev,
                      bankSoalProportions: {
                        mudah: prev.bankSoalProportions?.mudah ?? 30,
                        sedang: parseInt(e.target.value, 10) || 0,
                        sulit: prev.bankSoalProportions?.sulit ?? 20,
                      },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500/30 text-xs font-bold tabular-nums text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-rose-600 dark:text-rose-400 mb-1">
                  Sulit (%)
                </label>
                <input
                  type="number"
                  value={sulitPct}
                  onChange={(e) =>
                    store.handleConfigChangeManual((prev: ExamConfig) => ({
                      ...prev,
                      bankSoalProportions: {
                        mudah: prev.bankSoalProportions?.mudah ?? 30,
                        sedang: prev.bankSoalProportions?.sedang ?? 50,
                        sulit: parseInt(e.target.value, 10) || 0,
                      },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-rose-500/30 text-xs font-bold tabular-nums text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Pastikan level soal sudah diisi di editor.</span>
              <span
                className={`font-bold tabular-nums ${
                  totalPct === 100
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                Total Proporsi: {totalPct}%
              </span>
            </div>
          </div>
        )}
      </div>

      <div
        className={`rounded-xl border overflow-hidden transition-colors ${
          config.isOlympiadMode
            ? "border-amber-300 dark:border-amber-700/80 bg-white dark:bg-slate-800/60"
            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60"
        }`}
      >
        <CompactSwitchRow
          name="isOlympiadMode"
          label="Mode Olimpiade · OSN / KSM"
          checked={config.isOlympiadMode || false}
          onChange={(e) => {
            const isChecked = e.target.checked;
            if (typeof store.handleConfigChangeManual === "function") {
              store.handleConfigChangeManual((prev: ExamConfig) => ({
                ...prev,
                isOlympiadMode: isChecked,
                olympiadScoring: prev.olympiadScoring || {
                  correctMultiplier: 4,
                  wrongMultiplier: -1,
                  emptyMultiplier: 0,
                },
              }));
            }
          }}
          infoTopic="olympiad"
          tone="amber"
          hint="Penilaian poin pengali kustom benar / salah (minus) / kosong"
        />

        {config.isOlympiadMode && (
          <div className="p-3.5 border-t border-amber-200/70 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-950/10 space-y-3 animate-fade-in">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mr-1">
                Preset:
              </span>
              <button
                type="button"
                onClick={() => setOlympiadPreset(4, -1, 0)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  cMul === 4 && wMul === -1 && eMul === 0
                    ? "bg-amber-500 text-white border-amber-600 shadow-2xs"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                Standar OSN (+4 / -1 / 0)
              </button>
              <button
                type="button"
                onClick={() => setOlympiadPreset(3, -2, -1)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  cMul === 3 && wMul === -2 && eMul === -1
                    ? "bg-amber-500 text-white border-amber-600 shadow-2xs"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                Ketat (+3 / -2 / -1)
              </button>
              <button
                type="button"
                onClick={() => setOlympiadPreset(2, 0, 0)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  cMul === 2 && wMul === 0 && eMul === 0
                    ? "bg-amber-500 text-white border-amber-600 shadow-2xs"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                Tanpa Minus (+2 / 0 / 0)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                  Poin Benar (+)
                </label>
                <input
                  type="number"
                  value={cMul}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    store.handleConfigChangeManual((prev: ExamConfig) => ({
                      ...prev,
                      olympiadScoring: {
                        correctMultiplier: val,
                        wrongMultiplier:
                          prev.olympiadScoring?.wrongMultiplier ?? -1,
                        emptyMultiplier:
                          prev.olympiadScoring?.emptyMultiplier ?? 0,
                      },
                    }));
                  }}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 tabular-nums focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-rose-700 dark:text-rose-400 mb-1">
                  Poin Salah (−)
                </label>
                <input
                  type="number"
                  value={wMul}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    store.handleConfigChangeManual((prev: ExamConfig) => ({
                      ...prev,
                      olympiadScoring: {
                        correctMultiplier:
                          prev.olympiadScoring?.correctMultiplier ?? 4,
                        wrongMultiplier: val,
                        emptyMultiplier:
                          prev.olympiadScoring?.emptyMultiplier ?? 0,
                      },
                    }));
                  }}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 rounded-lg text-xs font-bold text-rose-700 dark:text-rose-300 tabular-nums focus:ring-2 focus:ring-rose-500/30"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Poin Kosong (○)
                </label>
                <input
                  type="number"
                  value={eMul}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    store.handleConfigChangeManual((prev: ExamConfig) => ({
                      ...prev,
                      olympiadScoring: {
                        correctMultiplier:
                          prev.olympiadScoring?.correctMultiplier ?? 4,
                        wrongMultiplier:
                          prev.olympiadScoring?.wrongMultiplier ?? -1,
                        emptyMultiplier: val,
                      },
                    }));
                  }}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-amber-500/10 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200">
              <span className="font-semibold">
                Simulasi {countToUse} soal:
              </span>
              <span className="font-mono font-bold tabular-nums">
                Min {minPt} · Maks {maxPt >= 0 ? `+${maxPt}` : maxPt} Poin
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
