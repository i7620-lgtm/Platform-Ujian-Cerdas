import React, { useRef, useState } from "react";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  DocumentArrowUpIcon,
  XMarkIcon,
} from "../../../../Icons";
import type { ExamConfig, RegisteredStudentConfig } from "../../../../../types";
import { useExamEditorStore } from "../../../../../stores/examEditorStore";
import { supabase } from "../../../../../lib/supabase";
import {
  downloadStudentDataTemplate,
  parseStudentDataExcel,
} from "../../../studentDataUtils";
import { showAlertModal } from "../../../../../stores/feedbackStore";
import { EXAM_TYPES } from "../../../constants";
import { InfoIconButton } from "./ConfigSharedControls";

interface ConfigGeneralPanelProps {
  config: ExamConfig;
  store: any;
  handleConfigChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => void;
  handleAddClassTag: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  examCode?: string;
}

export const ConfigGeneralPanel: React.FC<ConfigGeneralPanelProps> = ({
  config,
  store,
  handleConfigChange,
  handleAddClassTag,
  examCode,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(
    null,
  );

  const handleDownloadExcelFormat = () => {
    downloadStudentDataTemplate("Format_Data_Siswa.xlsx");
  };

  const handleExcelFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadSuccessMessage(null);

    try {
      const parsed = await parseStudentDataExcel(file);
      if (
        parsed.targetClassTags.length > 0 ||
        (parsed.students && parsed.students.length > 0)
      ) {
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

        if (parsed.students && parsed.students.length > 0) {
          const formatted: RegisteredStudentConfig[] = parsed.students.map(
            (s, idx) => ({
              id: `excel-${Date.now()}-${idx}`,
              student_name: s.fullName,
              fullName: s.fullName,
              absent_number: s.absentNumber,
              absentNumber: s.absentNumber,
              class_name: s.className,
              className: s.className,
              school_name: s.schoolName || parsed.schoolName || "",
              schoolName: s.schoolName || parsed.schoolName || "",
            }),
          );

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
              console.warn(
                "Gagal sinkron data siswa ke Supabase langsung:",
                err,
              );
            }
          }
        }

        const schoolMsg = parsed.schoolName
          ? `Sekolah: ${parsed.schoolName}. `
          : "";
        setUploadSuccessMessage(
          `Berhasil! ${schoolMsg}${parsed.classes.length} kelas & ${parsed.students.length} siswa terdaftar.`,
        );
      } else {
        await showAlertModal({
          title: "Data Excel Kosong",
          message:
            "File Excel dibaca, namun tidak ditemukan data kelas atau siswa.",
          tone: "warning",
        });
      }
    } catch (err) {
      console.error("Gagal membaca file Excel:", err);
      await showAlertModal({
        title: "Format Excel Tidak Sesuai",
        message:
          "Format file Excel tidak sesuai. Silakan gunakan template yang telah disediakan.",
        tone: "danger",
      });
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Mata Pelajaran
          </label>
          <button
            type="button"
            onClick={() => store.setSubjectModalOpen(true)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/30 transition-colors text-xs font-semibold flex items-center justify-between gap-2 cursor-pointer hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 text-left"
          >
            <span
              className={`truncate ${
                config.subject
                  ? "text-slate-800 dark:text-slate-100"
                  : "text-slate-400"
              }`}
            >
              {config.subject || "Pilih Mapel..."}
            </span>
            <ArrowPathIcon className="w-3.5 h-3.5 text-slate-400 rotate-90 shrink-0" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Kelas
          </label>
          <button
            type="button"
            onClick={() => store.setClassModalOpen(true)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/30 transition-colors text-xs font-semibold flex items-center justify-between gap-2 cursor-pointer hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 text-left"
          >
            <span
              className={`truncate ${
                config.classLevel && config.classLevel !== "Lainnya"
                  ? "text-slate-800 dark:text-slate-100"
                  : "text-slate-400"
              }`}
            >
              {config.classLevel === "Lainnya" || !config.classLevel
                ? "Pilih Kelas..."
                : config.classLevel}
            </span>
            <ArrowPathIcon className="w-3.5 h-3.5 text-slate-400 rotate-90 shrink-0" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Jenis Evaluasi
          </label>
          <button
            type="button"
            onClick={() => store.setExamTypeModalOpen(true)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/30 transition-colors text-xs font-semibold flex items-center justify-between gap-2 cursor-pointer hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 text-left"
          >
            <span
              className={`truncate ${
                config.examType && config.examType !== "Lainnya"
                  ? "text-slate-800 dark:text-slate-100"
                  : "text-slate-400"
              }`}
            >
              {config.examType === "Lainnya"
                ? "Lainnya (Kustom)"
                : !config.examType
                  ? "Pilih Jenis..."
                  : config.examType}
            </span>
            <ArrowPathIcon className="w-3.5 h-3.5 text-slate-400 rotate-90 shrink-0" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            KKM (Opsional)
          </label>
          <input
            type="number"
            name="kkm"
            value={config.kkm || ""}
            onChange={handleConfigChange}
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/30 text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100"
            placeholder="Contoh: 75"
          />
        </div>
      </div>

      {config.examType &&
        (config.examType === "Lainnya" ||
          !EXAM_TYPES.filter((t) => t !== "Lainnya").includes(
            config.examType,
          )) && (
          <div>
            <input
              type="text"
              value={config.examType === "Lainnya" ? "" : config.examType}
              onChange={(e) => {
                const nextVal = e.target.value;
                store.handleConfigChangeManual((prev: ExamConfig) => ({
                  ...prev,
                  examType: nextVal === "" ? "Lainnya" : nextVal,
                }));
              }}
              placeholder="Tulis nama jenis evaluasi kustom (misal: Sumatif Tengah Semester Ganjil)"
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700 rounded-lg focus:ring-2 focus:ring-indigo-500/30 text-xs font-medium text-slate-800 dark:text-slate-200"
            />
          </div>
        )}

      <div className="pt-3 border-t border-slate-100 dark:border-slate-700/80">
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Target Kelas (Opsional)
            </label>
            <InfoIconButton
              topic="target_classes"
              label="Panduan format Target Kelas & impor Excel"
            />
          </div>
          <div className="flex items-center gap-1.5">
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
              className="py-1.5 px-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
              title="Download template Excel untuk format data sekolah, kelas, dan nama siswa"
            >
              <DocumentArrowUpIcon className="w-3.5 h-3.5 text-indigo-500 rotate-180 shrink-0" />
              <span>Format Excel</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
              title="Upload file Excel data sekolah, kelas, dan siswa"
            >
              {isUploading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                  <span>Mengunggah...</span>
                </>
              ) : (
                <>
                  <DocumentArrowUpIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>Upload Siswa</span>
                </>
              )}
            </button>
          </div>
        </div>

        {uploadSuccessMessage && (
          <div className="mb-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2 text-xs font-medium text-emerald-800 dark:text-emerald-300 animate-fadeIn">
            <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{uploadSuccessMessage}</span>
          </div>
        )}

        <div className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg min-h-[42px] flex flex-wrap gap-1.5 items-center">
          {config.targetClasses?.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-md border border-indigo-200 dark:border-indigo-800"
            >
              {tag}
              <button
                type="button"
                onClick={() => store.removeClassTag(tag)}
                className="p-0.5 hover:bg-indigo-200/70 dark:hover:bg-indigo-800 rounded transition-colors cursor-pointer"
                aria-label={`Hapus target kelas ${tag}`}
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
            className="flex-1 bg-transparent border-none outline-none text-xs font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 min-w-[180px] py-0.5"
            placeholder='Ketik kelas (misal: 6A atau 6A 40) lalu tekan Enter...'
          />
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-slate-700/80">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
          Instruksi Pengerjaan
        </label>
        <textarea
          name="description"
          value={config.description || ""}
          onChange={handleConfigChange}
          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/30 transition-all text-xs min-h-[72px] text-slate-800 dark:text-slate-200 leading-relaxed"
          placeholder="Contoh: Baca doa sebelum mengerjakan, kerjakan dengan jujur..."
        />
      </div>
    </div>
  );
};
