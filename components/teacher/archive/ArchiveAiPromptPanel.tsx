import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Sparkles,
  ClipboardPaste,
  AlertCircle,
  X,
  Layers,
  CheckSquare,
  FileDown,
  Check,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import type { Exam, Result } from "../../../types";
import {
  sanitizeAiReportContent,
  cleanAlienStudentsFromClassReport,
  extractTargetStats,
  type AnalysisTargetOption,
} from "./archivePromptBuilder";
import { generateArchivePromptPdf } from "./archivePdfGenerator";

interface ArchiveAiPromptPanelProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam;
  results: Result[];
  targets: AnalysisTargetOption[];
  onSaveAnalysisBatch: (analysesMap: Record<string, string>, primaryTargetKey: string) => void;
}

const AI_LAUNCHERS = [
  {
    name: "Gemini",
    url: "https://gemini.google.com",
    bg: "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600",
  },
  {
    name: "ChatGPT",
    url: "https://chatgpt.com",
    bg: "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600",
  },
  {
    name: "Claude",
    url: "https://claude.ai",
    bg: "bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600",
  },
  {
    name: "DeepSeek",
    url: "https://chat.deepseek.com",
    bg: "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600",
  },
];

export const ArchiveAiPromptPanel: React.FC<ArchiveAiPromptPanelProps> = ({
  isOpen,
  onClose,
  exam,
  results,
  targets,
  onSaveAnalysisBatch,
}) => {
  const [selectedPromptMode, setSelectedPromptMode] = useState<string>("ALL_TARGETS");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadedFilename, setDownloadedFilename] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [manualTargetKey, setManualTargetKey] = useState<string>(() => targets[0]?.key || "OVERALL");
  const [errorMsg, setErrorMsg] = useState("");
  const [launchNotice, setLaunchNotice] = useState<string | null>(null);

  // Sync default target mode when targets list changes or modal opens
  React.useEffect(() => {
    if (isOpen && targets.length > 0) {
      if (selectedPromptMode !== "ALL_TARGETS" && !targets.some((t) => t.key === selectedPromptMode)) {
        setSelectedPromptMode("ALL_TARGETS");
      }
      if (!targets.some((t) => t.key === manualTargetKey)) {
        setManualTargetKey(targets[0].key);
      }
    }
  }, [isOpen, targets, selectedPromptMode, manualTargetKey]);

  // Determine which targets to include in the prompt
  const promptTargetsToInclude = useMemo(() => {
    if (selectedPromptMode === "ALL_TARGETS") {
      return targets;
    }
    const single = targets.find((t) => t.key === selectedPromptMode);
    return single ? [single] : targets;
  }, [targets, selectedPromptMode]);

  // Total student count across selected targets
  const totalStudentsSelected = useMemo(() => {
    if (selectedPromptMode === "ALL_TARGETS") {
      return results.filter((r) => r.student?.class !== "PREVIEW" && !r.isPlaceholder).length;
    }
    return promptTargetsToInclude[0]?.studentCount || 0;
  }, [results, selectedPromptMode, promptTargetsToInclude]);

  // Handle Download PDF Prompt
  const handleDownloadPdfPrompt = async (): Promise<boolean> => {
    if (!exam || !results || promptTargetsToInclude.length === 0) return false;
    setIsGeneratingPdf(true);
    try {
      const fileName = await generateArchivePromptPdf(exam, results, promptTargetsToInclude);
      setDownloadedFilename(fileName);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
      return true;
    } catch (err) {
      console.error("Gagal mengunduh berkas PDF prompt:", err);
      setErrorMsg("Gagal membuat berkas PDF. Silakan coba kembali.");
      return false;
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Handle Launch AI Web (Triggers PDF Download & Opens Tab)
  const handleLaunchAi = async (aiName: string, url: string) => {
    setLaunchNotice(`Mengunduh PDF & Membuka ${aiName}...`);
    await handleDownloadPdfPrompt();
    setTimeout(() => setLaunchNotice(null), 4000);
    window.open(url, "_blank");
  };

  // Handle Paste from Clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setPastedText(text);
        setErrorMsg("");
      }
    } catch (e) {
      console.error("Gagal membaca clipboard:", e);
    }
  };

  // Advanced Parser for Pasted Output (Handles Multiple Target JSON or Single Markdown)
  const parsedBatch = useMemo(() => {
    const raw = pastedText.trim();
    if (!raw) return null;

    let jsonCandidate = raw;

    if (raw.includes("```json")) {
      const match = raw.match(/```json\s*([\s\S]*?)\s*```/i);
      if (match) {
        jsonCandidate = match[1].trim();
      }
    } else if (raw.includes("```")) {
      const match = raw.match(/```\s*([\s\S]*?)\s*```/i);
      if (match) {
        jsonCandidate = match[1].trim();
      }
    }

    const detectedAnalyses: Record<string, string> = {};

    if ((jsonCandidate.startsWith("{") && jsonCandidate.endsWith("}")) || (raw.startsWith("{") && raw.endsWith("}"))) {
      try {
        const parsed = JSON.parse(jsonCandidate.startsWith("{") ? jsonCandidate : raw);

        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          Object.entries(parsed).forEach(([key, val]) => {
            const contentStr = typeof val === "string" ? val : JSON.stringify(val, null, 2);
            if (!contentStr || contentStr.trim().length < 15) return;

            let cleanContent = sanitizeAiReportContent(contentStr);

            const exactTarget = targets.find((t) => t.key === key);
            if (exactTarget) {
              if (!exactTarget.isOverall && exactTarget.key !== "OVERALL") {
                const targetStats = extractTargetStats(exam, results, exactTarget);
                const allowedNames = [
                  ...targetStats.tierPerluBimbingan,
                  ...targetStats.tierDasar,
                  ...targetStats.tierCakap,
                  ...targetStats.tierMahir,
                ];
                cleanContent = cleanAlienStudentsFromClassReport(cleanContent, allowedNames);
              }
              detectedAnalyses[exactTarget.key] = cleanContent;
              return;
            }

            const lowerKey = key.toLowerCase();
            if (lowerKey.includes("overall") || lowerKey.includes("umum")) {
              const overallTarget = targets.find((t) => t.isOverall || t.key === "OVERALL");
              if (overallTarget) detectedAnalyses[overallTarget.key] = cleanContent;
              return;
            }

            const matchedClassTarget = targets.find((t) => {
              if (!t.className) return false;
              const cName = t.className.toLowerCase();
              return lowerKey.includes(cName) || cName.includes(lowerKey);
            });

            if (matchedClassTarget) {
              if (!matchedClassTarget.isOverall && matchedClassTarget.key !== "OVERALL") {
                const targetStats = extractTargetStats(exam, results, matchedClassTarget);
                const allowedNames = [
                  ...targetStats.tierPerluBimbingan,
                  ...targetStats.tierDasar,
                  ...targetStats.tierCakap,
                  ...targetStats.tierMahir,
                ];
                cleanContent = cleanAlienStudentsFromClassReport(cleanContent, allowedNames);
              }
              detectedAnalyses[matchedClassTarget.key] = cleanContent;
            } else {
              detectedAnalyses[key] = cleanContent;
            }
          });
        }
      } catch (e) {
        console.warn("JSON Parse warning during import:", e);
      }
    }

    if (Object.keys(detectedAnalyses).length === 0) {
      if (raw.length > 20) {
        let singleClean = sanitizeAiReportContent(raw);
        const manualTarget = targets.find((t) => t.key === manualTargetKey);
        if (manualTarget && !manualTarget.isOverall && manualTarget.key !== "OVERALL") {
          const targetStats = extractTargetStats(exam, results, manualTarget);
          const allowedNames = [
            ...targetStats.tierPerluBimbingan,
            ...targetStats.tierDasar,
            ...targetStats.tierCakap,
            ...targetStats.tierMahir,
          ];
          singleClean = cleanAlienStudentsFromClassReport(singleClean, allowedNames);
        }
        detectedAnalyses[manualTargetKey] = singleClean;
      }
    }

    const count = Object.keys(detectedAnalyses).length;
    const isValid = count > 0;

    return {
      isValid,
      detectedAnalyses,
      count,
      targetLabels: Object.keys(detectedAnalyses).map((k) => {
        const targetObj = targets.find((t) => t.key === k);
        return targetObj ? targetObj.label : k;
      }),
    };
  }, [pastedText, targets, manualTargetKey, exam, results]);

  // Handle Save and Deploy Batch
  const handleSaveAndDeploy = () => {
    if (!parsedBatch || !parsedBatch.isValid || parsedBatch.count === 0) {
      setErrorMsg("Teks atau format JSON yang dimasukkan belum valid.");
      return;
    }

    const primaryKey = Object.keys(parsedBatch.detectedAnalyses)[0] || manualTargetKey;
    onSaveAnalysisBatch(parsedBatch.detectedAnalyses, primaryKey);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[170] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
        
        {/* Header Modal Kompak */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-5 py-3.5 text-white shrink-0 relative">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase flex items-center gap-1 text-white">
                  <Sparkles className="w-3 h-3 text-yellow-300 fill-yellow-300" />
                  Prompt & Impor Analisis AI
                </span>
                <span className="text-[11px] text-indigo-100 font-medium hidden sm:inline">
                  {exam.title || "Hasil Ujian"} ({totalStudentsSelected} Siswa)
                </span>
              </div>
              <h3 className="text-lg font-black text-white tracking-tight">
                Analisis Hasil Ujian dari AI Luar
              </h3>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors shrink-0"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: ALL-IN-ONE 2-COLUMN GRID (WITHOUT STEP TABS) */}
        <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 space-y-3">
          
          {/* Launch Toast Notification */}
          {launchNotice && (
            <div className="p-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 animate-fade-in shadow-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>{launchNotice}</span>
            </div>
          )}

          {/* ALL-IN-ONE 2-COLUMN GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* KOLOM KRI: UNDUH PDF & PELUNCUR AI */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3.5 flex flex-col justify-between">
              <div className="space-y-3">
                
                {/* 1. Target Scope Selection */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                    1. Pilih Cakupan Target Analisis:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedPromptMode("ALL_TARGETS")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                        selectedPromptMode === "ALL_TARGETS"
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                      }`}
                    >
                      <Sparkles className="w-3 h-3 text-yellow-300" />
                      <span>Semua Target ({targets.length})</span>
                    </button>

                    {targets.map((target) => (
                      <button
                        key={target.key}
                        type="button"
                        onClick={() => setSelectedPromptMode(target.key)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                          selectedPromptMode === target.key
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                        }`}
                      >
                        <Layers className="w-3 h-3" />
                        <span>{target.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. PDF Download Action Card */}
                <div className="p-3 bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <FileDown className="w-4 h-4 text-rose-500" />
                      Dokumen PDF Prompt Analisis
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {totalStudentsSelected} Siswa
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownloadPdfPrompt()}
                    disabled={isGeneratingPdf}
                    className="w-full py-2 px-3 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white font-extrabold rounded-lg text-xs shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-75"
                  >
                    {isGeneratingPdf ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Menyiapkan Berkas PDF...</span>
                      </>
                    ) : (
                      <>
                        <FileDown className="w-4 h-4" />
                        <span>Unduh Berkas PDF Prompt Analisis</span>
                      </>
                    )}
                  </button>

                  {downloadSuccess && (
                    <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{downloadedFilename ? `"${downloadedFilename}" Terunduh!` : "PDF Berhasil Diunduh!"}</span>
                    </div>
                  )}
                </div>

                {/* 3. AI Launchers Grid */}
                <div className="space-y-1.5 pt-1 border-t border-slate-200 dark:border-slate-700/60">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                    2. Pilih AI &amp; Langsung Buka Web:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {AI_LAUNCHERS.map((ai) => (
                      <button
                        key={ai.name}
                        type="button"
                        onClick={() => handleLaunchAi(ai.name, ai.url)}
                        className={`${ai.bg} text-white p-2.5 rounded-xl transition-all shadow-sm flex flex-col items-center justify-center gap-0.5 group active:scale-95`}
                      >
                        <div className="flex items-center gap-1 font-bold text-xs">
                          <span>{ai.name}</span>
                          <ExternalLink className="w-3 h-3 opacity-80 group-hover:opacity-100" />
                        </div>
                        <span className="text-[9px] text-white/80 font-normal">
                          Unduh PDF &amp; Buka
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Step Guidance Note */}
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 text-[11px] text-indigo-700 dark:text-indigo-300 leading-tight">
                💡 <strong>Petunjuk:</strong> Klik tombol AI di atas untuk mengunduh PDF lalu lampirkan (*attach*) berkas PDF tersebut di kolom chat AI.
              </div>
            </div>

            {/* KOLOM KANAN: TEMPEL & SIMPAN ANALISIS */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    3. Tempel Balasan Teks AI (JSON / Markdown):
                  </label>
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    Tempel dari Clipboard
                  </button>
                </div>

                {/* Textarea Input Receiver */}
                <textarea
                  rows={8}
                  placeholder={`Tempelkan balasan hasil dari Gemini / ChatGPT / Claude / DeepSeek di sini...

Format JSON multi-target (OVERALL, Kelas 6A, Kelas 6B) maupun teks Markdown biasa terdeteksi otomatis!`}
                  value={pastedText}
                  onChange={(e) => {
                    setPastedText(e.target.value);
                    setErrorMsg("");
                  }}
                  className="w-full bg-slate-900 text-slate-100 text-[11px] font-mono p-3 rounded-xl border border-slate-700 placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed h-[190px]"
                />

                {/* Optional Manual Target Selector Fallback (if single markdown text) */}
                {!parsedBatch?.count && targets.length > 1 && (
                  <div className="pt-1">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">
                      Target Simpan Manual (Jika Menempel Teks Terapkan 1 Target):
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {targets.map((target) => (
                        <button
                          key={target.key}
                          type="button"
                          onClick={() => setManualTargetKey(target.key)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all border ${
                            manualTargetKey === target.key
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {target.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Validation Feedback & Detected Badges */}
                {errorMsg && (
                  <div className="p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-lg flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {parsedBatch && parsedBatch.isValid && (
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>
                          {parsedBatch.count > 1
                            ? `Terdeteksi ${parsedBatch.count} Laporan Analisis Sekaligus!`
                            : `1 Laporan Analisis Siap Diimpor`}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {parsedBatch.targetLabels.map((lbl, idx) => (
                        <span
                          key={idx}
                          className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold"
                        >
                          ✓ {lbl}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons Footer */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndDeploy}
                  disabled={!parsedBatch || !parsedBatch.isValid}
                  className={`px-5 py-2 rounded-xl font-bold text-xs text-white shadow-md flex items-center gap-1.5 transition-all active:scale-95 ${
                    !parsedBatch || !parsedBatch.isValid
                      ? "bg-slate-300 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>
                    {parsedBatch && parsedBatch.count > 1
                      ? `Simpan ${parsedBatch.count} Laporan Analisis`
                      : "Simpan & Tampilkan Laporan"}
                  </span>
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default ArchiveAiPromptPanel;
