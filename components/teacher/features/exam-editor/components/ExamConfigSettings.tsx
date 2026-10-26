import React, { useRef, useState, useEffect } from "react";
import {
  ArrowPathIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ClockIcon,
} from "../../../../Icons";
import type { ExamConfig, RegisteredStudentConfig, IndonesianTimezone } from "../../../../../types";
import { useExamEditorStore } from "../../../../../stores/examEditorStore";
import { supabase } from "../../../../../lib/supabase";
import {
  downloadStudentDataTemplate,
  parseStudentDataExcel,
} from "../../../studentDataUtils";
import { DailySessionsSettings } from "./DailySessionsSettings";
import {
  detectUserIndonesianTimezone,
  getTimezoneLabel,
} from "../../../../../utils/timezoneUtils";

interface ExamConfigSettingsProps {
  config: ExamConfig;
  store: any;
  handleConfigChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);

  // Otomatis deteksi zona waktu perangkat guru jika belum terset
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

  const handleDownloadExcelFormat = () => {
    downloadStudentDataTemplate("Format_Data_Siswa.xlsx");
  };

  const handleExcelFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadSuccessMessage(null);

    try {
      const parsed = await parseStudentDataExcel(file);
      if (parsed.targetClassTags.length > 0 || (parsed.students && parsed.students.length > 0)) {
        if (parsed.targetClassTags.length > 0) {
          if (typeof store.handleAddClassTags === "function") {
            store.handleAddClassTags(parsed.targetClassTags);
          } else {
            parsed.targetClassTags.forEach((tag: string) => {
              if (typeof store.handleAddClassTagAction === "function") {
                store.handleAddClassTagAction(tag);
              } else if (typeof store.handleAddClassTag === "function") {
                store.handleAddClassTag(tag);
              }
            });
          }
        }

        // Save registered students list into exam configuration & Supabase
        if (parsed.students && parsed.students.length > 0) {
          const formatted: RegisteredStudentConfig[] = parsed.students.map((s, idx) => ({
            id: `excel-${Date.now()}-${idx}`,
            student_name: s.fullName,
            fullName: s.fullName,
            absent_number: s.absentNumber,
            absentNumber: s.absentNumber,
            class_name: s.className,
            className: s.className,
            school_name: s.schoolName || parsed.schoolName || "",
            schoolName: s.schoolName || parsed.schoolName || "",
          }));

          if (typeof store.addRegisteredStudents === "function") {
            store.addRegisteredStudents(formatted);
          } else {
            useExamEditorStore.getState().addRegisteredStudents(formatted);
          }

          const targetCode = examCode || store?.generatedCode;
          if (targetCode) {
            try {
              const records = formatted.map((s) => ({
                exam_code: targetCode,
                school_name: s.school_name || parsed.schoolName || "",
                class_name: s.class_name,
                student_name: s.student_name,
                absent_number: s.absent_number || null,
                is_active: false,
              }));
              await supabase.from("registered_students").insert(records);
            } catch (err) {
              console.warn("Gagal sinkron data siswa ke Supabase langsung:", err);
            }
          }
        }

        const schoolMsg = parsed.schoolName ? `Sekolah: ${parsed.schoolName}. ` : "";
        setUploadSuccessMessage(
          `Berhasil! ${schoolMsg}${parsed.classes.length} kelas & ${parsed.students.length} siswa berhasil dimuat dan terdaftar.`
        );
      } else {
        alert("File Excel dibaca, namun tidak ditemukan data kelas atau siswa.");
      }
    } catch (err) {
      console.error("Gagal membaca file Excel:", err);
      alert("Format file Excel tidak sesuai. Silakan gunakan template yang telah disediakan.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setTimeout(() => {
        setUploadSuccessMessage(null);
      }, 7000);
    }
  };
  return (
    <div className="bg-white dark:bg-slate-800 p-8 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-sm space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
        <div className="md:col-span-2 pb-2 border-b border-gray-100 dark:border-slate-700 mb-2">
          <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Informasi Umum
          </h4>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
            Mata Pelajaran
          </label>
          <div
            onClick={() => store.setSubjectModalOpen(true)}
            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all text-sm font-medium flex items-center justify-between cursor-pointer hover:bg-white dark:hover:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600"
          >
            <span
              className={
                config.subject
                  ? "text-slate-800 dark:text-slate-200"
                  : "text-gray-400"
              }
            >
              {config.subject || "Pilih Mata Pelajaran..."}
            </span>
            <ArrowPathIcon className="w-4 h-4 text-gray-400 rotate-90" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
            Kelas
          </label>
          <div
            onClick={() => store.setClassModalOpen(true)}
            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all text-sm font-medium flex items-center justify-between cursor-pointer hover:bg-white dark:hover:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600"
          >
            <span
              className={
                config.classLevel && config.classLevel !== "Lainnya"
                  ? "text-slate-800 dark:text-slate-200"
                  : "text-gray-400"
              }
            >
              {config.classLevel === "Lainnya" || !config.classLevel
                ? "Pilih Kelas..."
                : config.classLevel}
            </span>
            <ArrowPathIcon className="w-4 h-4 text-gray-400 rotate-90" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
            Jenis Evaluasi
          </label>
          <div
            onClick={() => store.setExamTypeModalOpen(true)}
            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all text-sm font-medium flex items-center justify-between cursor-pointer hover:bg-white dark:hover:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600"
          >
            <span
              className={
                config.examType && config.examType !== "Lainnya"
                  ? "text-slate-800 dark:text-slate-200"
                  : "text-gray-400"
              }
            >
              {config.examType === "Lainnya" || !config.examType
                ? "Pilih Jenis..."
                : config.examType}
            </span>
            <ArrowPathIcon className="w-4 h-4 text-gray-400 rotate-90" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
            KKM (Opsional)
          </label>
          <input
            type="number"
            name="kkm"
            value={config.kkm || ""}
            onChange={handleConfigChange}
            className="w-full p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm text-slate-800 dark:text-slate-200"
            placeholder="Contoh: 75"
          />
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <label className="text-sm font-bold text-gray-700 dark:text-slate-300">
              Target Kelas (Opsional)
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleExcelFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={handleDownloadExcelFormat}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors shadow-xs"
                title="Download template Excel untuk format data sekolah, kelas, dan nama siswa"
              >
                <DocumentArrowUpIcon className="w-3.5 h-3.5 rotate-180" />
                <span>Download Format</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all shadow-xs"
                title="Upload file Excel data sekolah, kelas, dan siswa"
              >
                {isUploading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Mengunggah...</span>
                  </>
                ) : (
                  <>
                    <DocumentArrowUpIcon className="w-3.5 h-3.5" />
                    <span>Upload Data Siswa</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {uploadSuccessMessage && (
            <div className="mb-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs font-medium text-emerald-800 dark:text-emerald-300 animate-fadeIn">
              <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{uploadSuccessMessage}</span>
            </div>
          )}

          <div className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl min-h-[56px] flex flex-wrap gap-2 items-center">
            {config.targetClasses?.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-lg border border-indigo-200 dark:border-indigo-800"
              >
                {tag}
                <button
                  onClick={() => store.removeClassTag(tag)}
                  className="p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-full transition-colors"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={store.classTagInput}
              onChange={(e) => store.setClassTagInput(e.target.value)}
              onKeyDown={handleAddClassTag}
              className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 min-w-[150px]"
              placeholder="Ketik kelas (contoh: 6A) atau kelas & jumlah (contoh: 6A 40)..."
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-2 italic font-medium">
            Biarkan kosong agar siswa bebas mengisi kelas. Ketik "6A" untuk membatasi kelas, "6A 40" untuk membatasi kelas dan jumlah siswa (otomatis menjadi "6A(40)"), atau "SD Negeri 2 Padangsambian-6A(40)" untuk membatasi sekolah, kelas, dan jumlah siswa. Tekan "Enter" untuk menyimpan target kelas.
          </p>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
            Instruksi Pengerjaan
          </label>
          <textarea
            name="description"
            value={config.description || ""}
            onChange={handleConfigChange}
            className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm min-h-[100px] shadow-inner text-slate-800 dark:text-slate-200"
            placeholder="Contoh: Baca doa sebelum mengerjakan, dilarang menoleh ke belakang..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 pt-8 border-t border-gray-100 dark:border-slate-700">
        <div className="md:col-span-2 pb-2 border-b border-gray-100 dark:border-slate-700 mb-2">
          <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Waktu & Keamanan
          </h4>
        </div>

        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() =>
              store.handleConfigChangeManual((prev: any) => ({
                ...prev,
                examMode: "UJIAN",
                endTime: prev.endTime === "23:59" ? "10:00" : (prev.endTime || "10:00"),
              }))
            }
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${config.examMode === "UJIAN" || !config.examMode ? "border-primary bg-primary/5" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary/30"}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${config.examMode === "UJIAN" || !config.examMode ? "border-primary" : "border-slate-400"}`}
              >
                {(config.examMode === "UJIAN" || !config.examMode) && (
                  <div className="w-2 h-2 bg-primary rounded-full" />
                )}
              </div>
              <span className="font-bold text-sm text-slate-800 dark:text-white">
                Mode Ujian
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed ml-6">
              Dikerjakan pada rentang tanggal dan waktu yang ketat.
            </p>
          </div>

          <div
            onClick={() =>
              store.handleConfigChangeManual((prev: any) => ({
                ...prev,
                examMode: "PR",
                detectBehavior: false,
                continueWithPermission: false,
                trackLocation: false,
                endTime: prev.endTime && prev.endTime !== "10:00" ? prev.endTime : "23:59",
              }))
            }
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${config.examMode === "PR" ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-200"}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${config.examMode === "PR" ? "border-amber-500" : "border-slate-400"}`}
              >
                {config.examMode === "PR" && (
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                )}
              </div>
              <span className="font-bold text-sm text-slate-800 dark:text-white">
                Mode PR / Latihan
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed ml-6">
              Dapat dikerjakan kapan saja sebelum batas waktu akhir.
            </p>
          </div>
        </div>

        {config.examMode === "PR" ? (
          <>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
                Tenggat Tanggal Pengumpulan
              </label>
              <input
                id="input-pr-end-date"
                type="date"
                name="endDate"
                value={
                  config.endDate ||
                  config.date ||
                  new Date().toLocaleDateString("en-CA")
                }
                onChange={handleConfigChange}
                className="w-full p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm text-slate-800 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
                Batas Jam Pengumpulan
              </label>
              <input
                id="input-pr-end-time"
                type="time"
                name="endTime"
                value={config.endTime || "23:59"}
                onChange={handleConfigChange}
                className="w-full p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm text-slate-800 dark:text-slate-200"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Default 23:59 waktu setempat. Siswa dapat mengumpulkan tugas hingga jam ini.
              </p>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
                Zona Waktu
              </label>
              <select
                id="input-pr-timezone"
                name="timezone"
                value={config.timezone || detectUserIndonesianTimezone()}
                onChange={handleConfigChange}
                className="w-full p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="WIB">WIB (UTC+7)</option>
                <option value="WITA">WITA (UTC+8)</option>
                <option value="WIT">WIT (UTC+9)</option>
              </select>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
                {getTimezoneLabel(config.timezone || detectUserIndonesianTimezone())}
              </p>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
                Tanggal Mulai
              </label>
              <input
                id="input-exam-start-date"
                type="date"
                name="startDate"
                value={
                  config.startDate ||
                  config.date ||
                  new Date().toLocaleDateString("en-CA")
                }
                onChange={handleConfigChange}
                className="w-full p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm text-slate-800 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
                Jam Mulai{" "}
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                  ({config.timezone || detectUserIndonesianTimezone()})
                </span>
              </label>
              <input
                id="input-exam-start-time"
                type="time"
                name="startTime"
                value={config.startTime || "08:00"}
                onChange={handleConfigChange}
                className="w-full p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm text-slate-800 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
                Tanggal Selesai
              </label>
              <input
                id="input-exam-end-date"
                type="date"
                name="endDate"
                value={
                  config.endDate ||
                  config.date ||
                  new Date().toLocaleDateString("en-CA")
                }
                onChange={handleConfigChange}
                className="w-full p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm text-slate-800 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
                Jam Selesai{" "}
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                  ({config.timezone || detectUserIndonesianTimezone()})
                </span>
              </label>
              <input
                id="input-exam-end-time"
                type="time"
                name="endTime"
                value={config.endTime || "10:00"}
                onChange={handleConfigChange}
                className="w-full p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm text-slate-800 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
                Zona Waktu Acuan
              </label>
              <select
                id="input-exam-timezone"
                name="timezone"
                value={config.timezone || detectUserIndonesianTimezone()}
                onChange={handleConfigChange}
                className="w-full p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="WIB">WIB (Waktu Indonesia Barat - UTC+7)</option>
                <option value="WITA">WITA (Waktu Indonesia Tengah - UTC+8)</option>
                <option value="WIT">WIT (Waktu Indonesia Timur - UTC+9)</option>
              </select>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
                Acuan: {getTimezoneLabel(config.timezone || detectUserIndonesianTimezone())}
              </p>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
                Durasi Pengerjaan (Menit)
              </label>
              <input
                id="input-exam-time-limit"
                type="number"
                name="timeLimit"
                value={config.timeLimit || ""}
                placeholder="0"
                onChange={handleConfigChange}
                className="w-full p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm text-slate-800 dark:text-slate-200"
              />
              <p className="text-xs text-slate-500 mt-1">
                Isi 0 untuk tanpa batas waktu.
              </p>
            </div>
          </>
        )}

        {/* Rentang Jam Pengerjaan Harian (Multi-Sesi & Isolasi Kelas) */}
        {(config.examMode || "").trim().toUpperCase() !== "PR" && (
          <DailySessionsSettings config={config} store={store} />
        )}

        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          <label className="flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group shadow-sm">
            <input
              type="checkbox"
              name="shuffleQuestions"
              checked={config.shuffleQuestions || false}
              onChange={handleConfigChange}
              className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300"
            />
            <span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-primary transition-colors">
              Acak Soal
            </span>
          </label>
          <label className="flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group shadow-sm">
            <input
              type="checkbox"
              name="shuffleAnswers"
              checked={config.shuffleAnswers || false}
              onChange={handleConfigChange}
              className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300"
            />
            <span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-primary transition-colors">
              Acak Opsi
            </span>
          </label>
          <label className="flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group shadow-sm">
            <input
              type="checkbox"
              name="allowRetakes"
              checked={config.allowRetakes || false}
              onChange={handleConfigChange}
              className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300"
            />
            <span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-primary transition-colors">
              Izinkan Kerjakan Ulang
            </span>
          </label>
          {(config.examMode || "").trim().toUpperCase() !== "PR" && (
            <>
              <label className="flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group shadow-sm">
                <input
                  type="checkbox"
                  name="detectBehavior"
                  checked={config.detectBehavior || false}
                  onChange={handleConfigChange}
                  className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300"
                />
                <span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-primary transition-colors">
                  Deteksi Kecurangan
                </span>
              </label>
              {config.detectBehavior && (
                <label className="flex items-center ml-6 p-2 rounded-lg transition-colors cursor-pointer group bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400">
                  <input
                    type="checkbox"
                    name="continueWithPermission"
                    checked={config.continueWithPermission || false}
                    onChange={handleConfigChange}
                    className="h-4 w-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span className="ml-2 text-xs font-bold uppercase tracking-tight">
                    Kunci Akses Jika Melanggar
                  </span>
                </label>
              )}
            </>
          )}
        </div>

        <div className="md:col-span-2 space-y-4 pt-6 mt-2 border-t border-gray-100 dark:border-slate-700">
          <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Pengaturan Bank Soal
          </h4>
          <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <label className="flex items-center cursor-pointer group mb-2">
              <input
                type="checkbox"
                name="useBankSoal"
                checked={config.useBankSoal || false}
                onChange={handleConfigChange}
                className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300"
              />
              <span className="ml-3 text-sm font-bold text-gray-800 dark:text-slate-200 group-hover:text-primary transition-colors">
                Gunakan Sistem Bank Soal
              </span>
            </label>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-4 pl-8 leading-relaxed">
              Fitur ini akan mengacak dan memilih soal secara otomatis dari
              total soal yang Anda buat, berdasarkan proporsi tingkat
              kesulitan.
              <div className="mt-2 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                <strong className="text-slate-700 dark:text-slate-300 block mb-1">
                  Panduan Level Soal:
                </strong>
                Sistem akan mengenali level soal yang Anda ketik di editor
                sebagai berikut:
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  <li>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      Mudah:
                    </span>{" "}
                    "mudah", "lots", "1", "easy", "rendah"
                  </li>
                  <li>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      Sedang:
                    </span>{" "}
                    "sedang", "mots", "2", "medium", "menengah"
                  </li>
                  <li>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      Sulit:
                    </span>{" "}
                    "sulit", "hots", "3", "hard", "tinggi"
                  </li>
                </ul>
              </div>
            </div>

            {config.useBankSoal && (
              <div className="space-y-4 pl-8 border-l-2 border-primary/20 ml-2 animate-fade-in">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Jumlah Soal yang Ditampilkan ke Siswa
                  </label>
                  <input
                    type="number"
                    name="bankSoalCount"
                    value={config.bankSoalCount || 10}
                    onChange={handleConfigChange}
                    className="w-full max-w-[200px] p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm text-slate-800 dark:text-slate-200"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Pastikan sesuai dengan soal yang tersedia di editor.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-2">
                    Proporsi Tingkat Kesulitan (%)
                  </label>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 w-12">
                        Mudah
                      </span>
                      <input
                        type="number"
                        value={config.bankSoalProportions?.mudah ?? 30}
                        onChange={(e) =>
                          store.handleConfigChangeManual((prev: any) => ({
                            ...prev,
                            bankSoalProportions: {
                              ...prev.bankSoalProportions,
                              mudah: parseInt(e.target.value) || 0,
                            } as any,
                          }))
                        }
                        className="w-16 p-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded focus:ring-1 focus:ring-primary text-xs text-center"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-400 w-12">
                        Sedang
                      </span>
                      <input
                        type="number"
                        value={config.bankSoalProportions?.sedang ?? 50}
                        onChange={(e) =>
                          store.handleConfigChangeManual((prev: any) => ({
                            ...prev,
                            bankSoalProportions: {
                              ...prev.bankSoalProportions,
                              sedang: parseInt(e.target.value) || 0,
                            } as any,
                          }))
                        }
                        className="w-16 p-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded focus:ring-1 focus:ring-primary text-xs text-center"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-rose-600 dark:text-rose-400 w-12">
                        Sulit
                      </span>
                      <input
                        type="number"
                        value={config.bankSoalProportions?.sulit ?? 20}
                        onChange={(e) =>
                          store.handleConfigChangeManual((prev: any) => ({
                            ...prev,
                            bankSoalProportions: {
                              ...prev.bankSoalProportions,
                              sulit: parseInt(e.target.value) || 0,
                            } as any,
                          }))
                        }
                        className="w-16 p-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded focus:ring-1 focus:ring-primary text-xs text-center"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 italic">
                    Pastikan Anda telah mengisi "Level Soal" pada
                    masing-masing soal di editor sesuai dengan panduan level
                    di atas.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PENGATURAN MODE OLIMPIADE & SISTEM PENALTI */}
        <div className="md:col-span-2 space-y-4 pt-6 mt-2 border-t border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Sistem Penilaian & Mode Olimpiade
            </h4>
            {config.isOlympiadMode && (
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                Mode Olimpiade Aktif
              </span>
            )}
          </div>
          
          <div className={`p-5 rounded-2xl border transition-all ${config.isOlympiadMode ? 'border-amber-300 dark:border-amber-700 bg-gradient-to-br from-amber-50/60 to-orange-50/30 dark:from-amber-950/20 dark:to-slate-900 shadow-sm' : 'border-gray-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50'}`}>
            <label className="flex items-start cursor-pointer group">
              <input
                type="checkbox"
                name="isOlympiadMode"
                checked={config.isOlympiadMode || false}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  if (typeof store.handleConfigChangeManual === 'function') {
                    store.handleConfigChangeManual((prev: ExamConfig) => ({
                      ...prev,
                      isOlympiadMode: isChecked,
                      olympiadScoring: prev.olympiadScoring || {
                        correctMultiplier: 4,
                        wrongMultiplier: -1,
                        emptyMultiplier: 0,
                      }
                    }));
                  }
                }}
                className="mt-0.5 h-5 w-5 rounded text-amber-600 focus:ring-amber-500 border-gray-300"
              />
              <div className="ml-3.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    Mode Olimpiade (Sistem Skor Penalti)
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500 text-white tracking-wider">
                    OSN / KSM
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Terapkan penilaian berbasis poin pengali kustom untuk jawaban benar, salah (penalti minus), dan tidak dijawab. Skor akhir siswa dihitung sebagai skor poin mentah dan dapat bernilai negatif.
                </p>
              </div>
            </label>

            {config.isOlympiadMode && (
              <div className="mt-5 pt-4 border-t border-amber-200/70 dark:border-amber-900/40 space-y-4">
                {/* Preset Cepat */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Preset Rekomendasi:</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof store.handleConfigChangeManual === 'function') {
                        store.handleConfigChangeManual((prev: ExamConfig) => ({
                          ...prev,
                          isOlympiadMode: true,
                          olympiadScoring: { correctMultiplier: 4, wrongMultiplier: -1, emptyMultiplier: 0 }
                        }));
                      }
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                      (config.olympiadScoring?.correctMultiplier === 4 && config.olympiadScoring?.wrongMultiplier === -1 && config.olympiadScoring?.emptyMultiplier === 0)
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                    }`}
                  >
                    Standar OSN (+4 / -1 / 0)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof store.handleConfigChangeManual === 'function') {
                        store.handleConfigChangeManual((prev: ExamConfig) => ({
                          ...prev,
                          isOlympiadMode: true,
                          olympiadScoring: { correctMultiplier: 3, wrongMultiplier: -2, emptyMultiplier: -1 }
                        }));
                      }
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                      (config.olympiadScoring?.correctMultiplier === 3 && config.olympiadScoring?.wrongMultiplier === -2 && config.olympiadScoring?.emptyMultiplier === -1)
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                    }`}
                  >
                    Kompetisi Ketat (+3 / -2 / -1)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof store.handleConfigChangeManual === 'function') {
                        store.handleConfigChangeManual((prev: ExamConfig) => ({
                          ...prev,
                          isOlympiadMode: true,
                          olympiadScoring: { correctMultiplier: 2, wrongMultiplier: 0, emptyMultiplier: 0 }
                        }));
                      }
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                      (config.olympiadScoring?.correctMultiplier === 2 && config.olympiadScoring?.wrongMultiplier === 0 && config.olympiadScoring?.emptyMultiplier === 0)
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                    }`}
                  >
                    Tanpa Minus (+2 / 0 / 0)
                  </button>
                </div>

                {/* 3 Input Kolom Multiplier */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-emerald-200 dark:border-emerald-900/50 shadow-xs">
                    <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                      Poin Jawaban Benar
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">+</span>
                      <input
                        type="number"
                        value={config.olympiadScoring?.correctMultiplier ?? 4}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (typeof store.handleConfigChangeManual === 'function') {
                            store.handleConfigChangeManual((prev: ExamConfig) => ({
                              ...prev,
                              olympiadScoring: {
                                correctMultiplier: val,
                                wrongMultiplier: prev.olympiadScoring?.wrongMultiplier ?? -1,
                                emptyMultiplier: prev.olympiadScoring?.emptyMultiplier ?? 0,
                              }
                            }));
                          }
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-lg text-sm font-bold text-emerald-700 dark:text-emerald-300 tabular-nums focus:ring-2 focus:ring-emerald-500"
                        placeholder="Contoh: 4"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">Dikalikan bobot soal</span>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-rose-200 dark:border-rose-900/50 shadow-xs">
                    <label className="block text-xs font-bold text-rose-700 dark:text-rose-400 mb-1">
                      Poin Jawaban Salah
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black text-rose-600 dark:text-rose-400">−</span>
                      <input
                        type="number"
                        value={config.olympiadScoring?.wrongMultiplier ?? -1}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (typeof store.handleConfigChangeManual === 'function') {
                            store.handleConfigChangeManual((prev: ExamConfig) => ({
                              ...prev,
                              olympiadScoring: {
                                correctMultiplier: prev.olympiadScoring?.correctMultiplier ?? 4,
                                wrongMultiplier: val,
                                emptyMultiplier: prev.olympiadScoring?.emptyMultiplier ?? 0,
                              }
                            }));
                          }
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-rose-300 dark:border-rose-700 rounded-lg text-sm font-bold text-rose-700 dark:text-rose-300 tabular-nums focus:ring-2 focus:ring-rose-500"
                        placeholder="Contoh: -1"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">Gunakan minus (-) untuk penalti</span>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Poin Tidak Dijawab (Kosong)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black text-slate-500">○</span>
                      <input
                        type="number"
                        value={config.olympiadScoring?.emptyMultiplier ?? 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (typeof store.handleConfigChangeManual === 'function') {
                            store.handleConfigChangeManual((prev: ExamConfig) => ({
                              ...prev,
                              olympiadScoring: {
                                correctMultiplier: prev.olympiadScoring?.correctMultiplier ?? 4,
                                wrongMultiplier: prev.olympiadScoring?.wrongMultiplier ?? -1,
                                emptyMultiplier: val,
                              }
                            }));
                          }
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300 tabular-nums focus:ring-2 focus:ring-primary"
                        placeholder="Contoh: 0"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">Biasanya 0 (tanpa penalti)</span>
                  </div>
                </div>

                {/* Simulasi Rentang Skor */}
                {(() => {
                  const qCount = store?.questions ? store.questions.filter((q: any) => q.questionType !== 'INFO').length : 0;
                  const countToUse = qCount > 0 ? qCount : 10;
                  const cMul = config.olympiadScoring?.correctMultiplier ?? 4;
                  const wMul = config.olympiadScoring?.wrongMultiplier ?? -1;
                  const maxPt = countToUse * cMul;
                  const minPt = countToUse * wMul;
                  return (
                    <div className="p-3.5 bg-amber-500/10 dark:bg-amber-950/30 rounded-xl border border-amber-300/60 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-200">
                      <div className="font-bold flex items-center justify-between mb-1.5">
                        <span>Simulasi Rentang Skor ({countToUse} butir soal):</span>
                        <span className="font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                          {minPt} s.d. {maxPt} Poin
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                        <div>• Skor Maksimal: <strong className="text-emerald-700 dark:text-emerald-400 font-mono">+{maxPt} Poin</strong> (Semua Benar)</div>
                        <div>• Skor Minimal: <strong className="text-rose-700 dark:text-rose-400 font-mono">{minPt} Poin</strong> (Semua Salah)</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2 space-y-4 pt-6 mt-2 border-t border-gray-100 dark:border-slate-700">
          <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Pengaturan Hasil & Monitor
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className={`flex flex-col p-3 rounded-xl border transition-colors shadow-sm ${hasManualGrading ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 opacity-80" : "border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer group"}`}
            >
              <label
                className={`flex items-center ${hasManualGrading ? "cursor-not-allowed" : "cursor-pointer"}`}
              >
                <input
                  type="checkbox"
                  name="showResultToStudent"
                  checked={config.showResultToStudent || false}
                  onChange={handleConfigChange}
                  disabled={hasManualGrading}
                  className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300 disabled:text-gray-400"
                />
                <span
                  className={`ml-3 text-sm font-medium ${hasManualGrading ? "text-gray-500 dark:text-slate-500" : "text-gray-700 dark:text-slate-300 group-hover:text-primary dark:group-hover:text-primary"}`}
                >
                  Umumkan Nilai Otomatis
                </span>
              </label>
              {hasManualGrading && (
                <div className="mt-2 text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <ExclamationTriangleIcon className="w-3 h-3" />{" "}
                  Dinonaktifkan otomatis karena terdapat soal Esai atau
                  Isian Singkat.
                </div>
              )}
            </div>
            <label className="flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group shadow-sm">
              <input
                type="checkbox"
                name="showCorrectAnswer"
                checked={config.showCorrectAnswer || false}
                onChange={handleConfigChange}
                className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300"
              />
              <span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-primary transition-colors">
                Tampilkan Kunci (Review)
              </span>
            </label>
            <label className="flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group shadow-sm">
              <input
                type="checkbox"
                name="showHints"
                checked={config.showHints || false}
                onChange={handleConfigChange}
                className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300"
              />
              <span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-primary transition-colors">
                Tampilkan Petunjuk Pengerjaan
              </span>
            </label>
            <label className="flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group shadow-sm">
              <input
                type="checkbox"
                name="showSolutionSteps"
                checked={config.showSolutionSteps || false}
                onChange={handleConfigChange}
                className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300"
              />
              <span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-primary transition-colors">
                Tampilkan Pembahasan Jawaban
              </span>
            </label>
            <label className="flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group shadow-sm">
              <input
                type="checkbox"
                name="enableCertificate"
                checked={config.enableCertificate || false}
                onChange={handleConfigChange}
                className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300"
              />
              <span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-primary transition-colors">
                Berikan Akses Sertifikat
              </span>
            </label>
            {config.examMode !== "PR" && (
              <label className="flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group shadow-sm">
                <input
                  type="checkbox"
                  name="trackLocation"
                  checked={config.trackLocation || false}
                  onChange={handleConfigChange}
                  className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300"
                />
                <span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-primary transition-colors">
                  Lacak Lokasi (GPS)
                </span>
              </label>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm relative overflow-hidden group gap-4">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-200/40 via-transparent to-transparent z-0 group-hover:from-amber-200/60 transition-colors"></div>
            <div className="flex items-start sm:items-center gap-3 z-10 flex-1 min-w-[200px]">
              <SparklesIcon className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <h5 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  Sertifikat Kelulusan Otomatis{" "}
                  {!isPremium && (
                    <span className="text-[9px] bg-gradient-to-r from-amber-200 to-amber-400 text-amber-900 px-2 py-0.5 rounded-full uppercase tracking-widest font-black shadow-sm flex items-center gap-1">
                      <SparklesIcon className="w-3 h-3" /> Premium
                    </span>
                  )}
                </h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-full sm:max-w-xs leading-relaxed mt-0.5">
                  Berikan e-Certificate otomatis untuk siswa. Bisa diunduh
                  secara massal di Dasbor Guru.
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                isPremium && store.setCertificateModalOpen(true)
              }
              disabled={!isPremium}
              className={`z-10 px-4 py-2 text-xs font-bold whitespace-nowrap rounded-xl transition-all shadow-sm ${isPremium ? "text-amber-600 bg-amber-50 border border-amber-200 dark:border-amber-800/30 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/30 active:scale-95" : "text-gray-400 bg-gray-50 border border-gray-200 dark:border-slate-700 dark:bg-slate-800/50 cursor-not-allowed"}`}
            >
              {config.certificateSettings?.enabled
                ? "Ubah Desain"
                : "Buat Sertifikat"}
            </button>
          </div>

          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
              Mode Operasi
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() =>
                  store.handleConfigChangeManual((prev: any) => ({
                    ...prev,
                    disableRealtime: true,
                  }))
                }
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${config.disableRealtime ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-200"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${config.disableRealtime ? "border-emerald-500" : "border-slate-400"}`}
                  >
                    {config.disableRealtime && (
                      <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-800 dark:text-white">
                      Mode Stabil
                    </span>
                    <span className="text-[9px] font-black bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-widest">
                      Rekomendasi
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed ml-6">
                  Menyimpan data hanya saat selesai atau tab ditutup. Aman untuk koneksi lambat.
                </p>
              </div>

              <div
                onClick={() =>
                  store.handleConfigChangeManual((prev: any) => ({
                    ...prev,
                    disableRealtime: false,
                  }))
                }
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${!config.disableRealtime ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-200"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${!config.disableRealtime ? "border-indigo-500" : "border-slate-400"}`}
                  >
                    {!config.disableRealtime && (
                      <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                    )}
                  </div>
                  <span className="font-bold text-sm text-slate-800 dark:text-white">
                    Mode Realtime
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed ml-6">
                  Menyimpan jawaban siswa setiap detik. Membutuhkan koneksi internet yang kuat dan stabil.
                </p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
               <label className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    name="enablePublicStream"
                    checked={config.enablePublicStream || false}
                    onChange={(e) => {
                       store.handleConfigChangeManual((prev: any) => ({
                         ...prev,
                         enablePublicStream: e.target.checked
                       }))
                    }}
                    className="h-5 w-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <div className="ml-3 flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">
                      Izinkan Penonton Publik
                    </span>
                    {!isPremium && (
                      <span className="text-[9px] bg-gradient-to-r from-amber-200 to-amber-400 text-amber-900 px-2 py-0.5 rounded-full uppercase tracking-widest font-black shadow-sm flex items-center gap-1">
                        <SparklesIcon className="w-3 h-3" /> Premium
                      </span>
                    )}
                  </div>
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 pl-8">
                  Menyediakan link streaming public sehingga penonton atau orang tua dapat melihat kemajuan/nilai siswa secara live selama ujian berlangsung.
                </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
