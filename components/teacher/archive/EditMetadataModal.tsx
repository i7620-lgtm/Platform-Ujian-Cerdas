import React, { useState } from "react";
import { createPortal } from "react-dom";
import { PencilIcon, XMarkIcon, ExclamationTriangleIcon } from "../../Icons";
import type { Exam } from "../../../types";
import { EXAM_TYPES } from "../constants";

interface EditMetadataModalProps {
  exam: Exam;
  onClose: () => void;
  onSave: (updated: Partial<Exam>) => void;
  teacherProfile?: any;
}

export const EditMetadataModal: React.FC<EditMetadataModalProps> = ({
  exam,
  onClose,
  onSave,
  teacherProfile,
}) => {
  // Auto-resolve author details based on ID relationship
  const isOwner = teacherProfile && exam.authorId === teacherProfile.id;
  const defaultName = isOwner ? teacherProfile.fullName : exam.authorName || "";
  const defaultSchool = isOwner
    ? teacherProfile.school
    : exam.authorSchool || "";

  const [formData, setFormData] = useState({
    authorSchool: defaultSchool,
    authorName: defaultName,
    subject: exam.config.subject || "",
    classLevel: exam.config.classLevel || "",
    examType: exam.config.examType || "",
    date: exam.config.date || "",
    manualParticipantCount: exam.config.manualParticipantCount || "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    onSave({
      authorSchool: formData.authorSchool,
      authorName: formData.authorName,
      config: {
        ...exam.config,
        subject: formData.subject,
        classLevel: formData.classLevel,
        examType: formData.examType,
        date: formData.date,
        manualParticipantCount: formData.manualParticipantCount
          ? Number(formData.manualParticipantCount)
          : undefined,
      },
    });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-700">
        <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <PencilIcon className="w-5 h-5 text-indigo-600" /> Edit Metadata
            Arsip
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Nama Sekolah
              </label>
              <input
                name="authorSchool"
                value={formData.authorSchool}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Nama Guru
              </label>
              <input
                name="authorName"
                value={formData.authorName}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Mata Pelajaran
              </label>
              <input
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Tingkat Kelas
              </label>
              <input
                name="classLevel"
                value={formData.classLevel}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Jenis Evaluasi
              </label>
              <select
                name="examType"
                value={formData.examType}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
              >
                <option value="">Pilih...</option>
                {EXAM_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Tanggal Ujian
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Jumlah Partisipan (Manual)
              </label>
              <input
                type="number"
                name="manualParticipantCount"
                value={formData.manualParticipantCount}
                onChange={handleChange}
                placeholder="Otomatis (dari hasil)"
                className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
              />
            </div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100 dark:border-amber-800 flex gap-3 items-start">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Perubahan ini hanya berlaku pada sesi ini. Untuk menyimpan
              permanen, silakan "Download JSON" atau "Simpan ke Cloud" setelah
              mengedit.
            </p>
          </div>
        </div>
        <div className="p-6 border-t dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-bold transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all"
          >
            Simpan Perubahan
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
