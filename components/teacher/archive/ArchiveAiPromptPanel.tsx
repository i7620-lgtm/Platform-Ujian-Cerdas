import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Sparkles,
  ClipboardPaste,
  FileText,
  ArrowRight,
  Code2,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  CheckSquare,
  FileDown,
  Check,
  CheckCircle,
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

export const ArchiveAiPromptPanel: React.FC<ArchiveAiPromptPanelProps> = ({
  isOpen,
  onClose,
  exam,
  results,
  targets,
  onSaveAnalysisBatch,
}) => {
  const [activeStep, setActiveStep] = useState<"builder" | "importer">("builder");
  const [selectedPromptMode, setSelectedPromptMode] = useState<string>("ALL_TARGETS");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadedFilename, setDownloadedFilename] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [manualTargetKey, setManualTargetKey] = useState<string>(() => targets[0]?.key || "OVERALL");
  const [errorMsg, setErrorMsg] = useState("");

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
  const handleDownloadPdfPrompt = async () => {
    if (!exam || !results || promptTargetsToInclude.length === 0) return;
    setIsGeneratingPdf(true);
    try {
      const fileName = await generateArchivePromptPdf(exam, results, promptTargetsToInclude);
      setDownloadedFilename(fileName);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } catch (err) {
      console.error("Gagal mengunduh berkas PDF prompt:", err);
      setErrorMsg("Gagal membuat berkas PDF. Silakan coba kembali.");
    } finally {
      setIsGeneratingPdf(false);
    }
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

    // 1. Extract JSON block if enclosed in ```json ``` markdown code block
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

    // 2. Try parsing JSON object
    if ((jsonCandidate.startsWith("{") && jsonCandidate.endsWith("}")) || (raw.startsWith("{") && raw.endsWith("}"))) {
      try {
        const parsed = JSON.parse(jsonCandidate.startsWith("{") ? jsonCandidate : raw);

        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          // Iterate over keys in JSON object and map to actual target keys
          Object.entries(parsed).forEach(([key, val]) => {
            const contentStr = typeof val === "string" ? val : JSON.stringify(val, null, 2);
            if (!contentStr || contentStr.trim().length < 15) return;

            // Clean and sanitize HTML tags & array wrappers from content
            let cleanContent = sanitizeAiReportContent(contentStr);

            // Check if key matches an exact target key
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

            // Fuzzy match friendly names (e.g., "OVERALL", "6A", "Kelas 6A", "Analisis Umum")
            const lowerKey = key.toLowerCase();
            if (lowerKey.includes("overall") || lowerKey.includes("umum")) {
              const overallTarget = targets.find((t) => t.isOverall || t.key === "OVERALL");
              if (overallTarget) detectedAnalyses[overallTarget.key] = cleanContent;
              return;
            }

            // Match class names
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
              // Store under raw key
              detectedAnalyses[key] = cleanContent;
            }
          });
        }
      } catch (e) {
        console.warn("JSON Parse warning during import:", e);
      }
    }

    // 3. Fallback: If no multi-key JSON was detected, treat entire pasted text as Markdown for the selected manual target
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
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 p-5 sm:p-6 text-white shrink-0 relative">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-white/20 backdrop-blur-md px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase flex items-center gap-1.5 text-white">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                  Prompt & Impor Analisis AI
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Analisis Hasil Ujian dari AI Luar
              </h3>
              <p className="text-xs text-indigo-100 max-w-xl leading-relaxed">
                Unduh berkas PDF prompt lengkap dan lampirkan ke Gemini, ChatGPT, Claude, atau DeepSeek, lalu tempelkan balasan JSON-nya ke sini.
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors shrink-0"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Toggle Steps */}
          <div className="flex items-center bg-black/20 p-1 rounded-2xl border border-white/10 mt-5 w-fit">
            <button
              onClick={() => setActiveStep("builder")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeStep === "builder"
                  ? "bg-white text-indigo-700 shadow-md"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <FileDown className="w-4 h-4" />
              1. Unduh Berkas PDF Prompt
            </button>

            <button
              onClick={() => setActiveStep("importer")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeStep === "importer"
                  ? "bg-white text-indigo-700 shadow-md"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <Code2 className="w-4 h-4" />
              2. Tempel & Impor JSON
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {activeStep === "builder" ? (
            /* STEP 1: PDF PROMPT DOWNLOADER */
            <div className="space-y-5">
              {/* Target Scope Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Pilih Cakupan Target Analisis:
                </label>
                <div className="flex flex-wrap gap-2">
                  {/* Option ALL TARGETS */}
                  <button
                    type="button"
                    onClick={() => setSelectedPromptMode("ALL_TARGETS")}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                      selectedPromptMode === "ALL_TARGETS"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                    <span>Semua Target (Umum &amp; Seluruh Kelas)</span>
                    <span className="text-[10px] opacity-90 bg-white/20 px-1.5 py-0.5 rounded-full font-mono">
                      {targets.length} Target
                    </span>
                  </button>

                  {/* Individual Target Options */}
                  {targets.map((target) => (
                    <button
                      key={target.key}
                      type="button"
                      onClick={() => setSelectedPromptMode(target.key)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                        selectedPromptMode === target.key
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{target.label}</span>
                      <span className="text-[10px] opacity-80 bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-full">
                        {target.studentCount} Siswa
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* PDF Document Download Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-purple-50/70 to-slate-50 dark:from-slate-800/80 dark:via-slate-800/60 dark:to-slate-800/40 border border-indigo-100 dark:border-indigo-900/40 shadow-xs space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20 shrink-0">
                    <FileDown className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-900 font-mono">
                        DOKUMEN PDF LENGKAP
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {promptTargetsToInclude.length > 1
                          ? `${promptTargetsToInclude.length} Target Analisis Sekaligus`
                          : promptTargetsToInclude[0]?.label}
                      </span>
                    </div>
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Berkas PDF Prompt Analisis Siap Pakai
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Dokumen PDF ini telah memuat data statistik lengkap, pemetaan 4 tier kompetensi nama siswa per kelas secara terisolasi, butir soal kritis, dan panduan format output JSON mutlak.
                    </p>
                  </div>
                </div>

                {/* Metrics Summary Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80">
                    <span className="text-[11px] text-slate-400 block font-medium">Cakupan Target</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedPromptMode === "ALL_TARGETS" ? "Semua Target (Umum & Kelas)" : promptTargetsToInclude[0]?.label}
                    </span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80">
                    <span className="text-[11px] text-slate-400 block font-medium">Total Peserta Terkait</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {totalStudentsSelected} Siswa
                    </span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80">
                    <span className="text-[11px] text-slate-400 block font-medium">Format Dokumen</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      PDF (Teks Vektor UTF-8)
                    </span>
                  </div>
                </div>

                {/* Download Button Action */}
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadPdfPrompt}
                    disabled={isGeneratingPdf}
                    className="px-6 py-3 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-75 cursor-pointer"
                  >
                    {isGeneratingPdf ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
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
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-fade-in">
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span>{downloadedFilename ? `"${downloadedFilename}" Terunduh!` : "Berkas PDF Berhasil Diunduh!"}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Step-by-Step Guidance Box */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Langkah-Langkah Pemrosesan:
                </span>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-400 leading-relaxed">
                  <li>Klik tombol <strong>"Unduh Berkas PDF Prompt Analisis"</strong> di atas.</li>
                  <li>Buka <strong>Gemini</strong>, <strong>ChatGPT</strong>, <strong>Claude</strong>, atau <strong>DeepSeek</strong> di peramban Anda.</li>
                  <li>Unggah (lampirkan / <em>attach</em>) berkas PDF yang telah diunduh tersebut ke kolom obrolan AI.</li>
                  <li>Salin seluruh blok kode balasan <strong>JSON</strong> yang dihasilkan oleh AI luar.</li>
                  <li>Klik tombol <strong>"Lanjut ke Langkah 2"</strong> di bawah untuk menempelkan hasil JSON dan menyimpan laporan ke aplikasi.</li>
                </ol>
              </div>

              {/* Next Step Nav Action */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Sudah mengunduh PDF &amp; mendapatkan jawaban AI?
                </span>
                <button
                  type="button"
                  onClick={() => setActiveStep("importer")}
                  className="bg-indigo-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-indigo-700 text-xs transition-all flex items-center gap-2 shadow-md active:scale-95"
                >
                  <span>Lanjut ke Langkah 2: Tempel &amp; Impor JSON</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* STEP 2: IMPORTER */
            <div className="space-y-5">
              {/* Optional Manual Target Selector Fallback */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Target Penyimpanan Manual (Jika Menempelkan Teks Tunggal):
                </label>
                <div className="flex flex-wrap gap-2">
                  {targets.map((target) => (
                    <button
                      key={target.key}
                      type="button"
                      onClick={() => setManualTargetKey(target.key)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                        manualTargetKey === target.key
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400"
                      }`}
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>{target.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea Receiver */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Kotak Penerima Balasan AI (Format JSON / Markdown):
                  </label>
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    Tempel dari Clipboard
                  </button>
                </div>

                <textarea
                  rows={10}
                  placeholder={`Tempelkan balasan hasil dari ChatGPT / Claude / Gemini / DeepSeek di sini...

Sistem otomatis mendeteksi objek JSON banyak target (OVERALL, Kelas 6A, Kelas 6B) maupun laporan teks Markdown biasa!`}
                  value={pastedText}
                  onChange={(e) => {
                    setPastedText(e.target.value);
                    setErrorMsg("");
                  }}
                  className="w-full bg-slate-900 text-slate-100 text-xs font-mono p-4 rounded-2xl border border-slate-700 placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                />
              </div>

              {/* Error & Validation Feedback */}
              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {parsedBatch && parsedBatch.isValid && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs space-y-2">
                  <div className="flex items-center justify-between font-bold">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>
                        {parsedBatch.count > 1
                          ? `Terdeteksi ${parsedBatch.count} Laporan Analisis Sekaligus dalam Objek JSON!`
                          : `1 Laporan Analisis Siap Diimpor`}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {parsedBatch.targetLabels.map((lbl, idx) => (
                      <span
                        key={idx}
                        className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-md text-[11px] font-semibold"
                      >
                        ✓ {lbl}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndDeploy}
                  disabled={!parsedBatch || !parsedBatch.isValid}
                  className={`px-6 py-2.5 rounded-xl font-bold text-xs text-white shadow-md flex items-center gap-2 transition-all active:scale-95 ${
                    !parsedBatch || !parsedBatch.isValid
                      ? "bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-80"
                      : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {parsedBatch && parsedBatch.count > 1
                      ? `Simpan ${parsedBatch.count} Laporan Analisis`
                      : "Simpan & Tampilkan Laporan"}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
