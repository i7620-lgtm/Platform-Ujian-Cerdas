import React, { useState, useEffect } from "react";
import { XMarkIcon } from "../../../Icons";

interface EditingStudentData {
  id: number;
  studentId: string;
  fullName: string;
  schoolName?: string;
  class: string;
  absentNumber: string;
}

interface ManualEditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: EditingStudentData | null;
  onSave: (updated: EditingStudentData) => Promise<void>;
}

export const ManualEditStudentModal: React.FC<ManualEditStudentModalProps> = ({
  isOpen,
  onClose,
  student,
  onSave,
}) => {
  const [localStudent, setLocalStudent] = useState<EditingStudentData | null>(
    student,
  );

  useEffect(() => {
    if (student && student.id !== localStudent?.id) {
      setLocalStudent({ ...student });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student]);

  if (!isOpen || !localStudent) return null;

  const handleSubmit = async () => {
    await onSave(localStudent);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 max-w-sm w-full border border-white dark:border-slate-700 relative animate-slide-in-up">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">
            Edit Data Siswa
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Nama Lengkap
            </label>
            <input
              type="text"
              value={localStudent.fullName}
              onChange={(e) =>
                setLocalStudent({ ...localStudent, fullName: e.target.value })
              }
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Nama Sekolah
            </label>
            <input
              type="text"
              value={localStudent.schoolName || ""}
              onChange={(e) =>
                setLocalStudent({ ...localStudent, schoolName: e.target.value })
              }
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-bold"
              placeholder="Opsional"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Kelas
              </label>
              <input
                type="text"
                value={localStudent.class}
                onChange={(e) =>
                  setLocalStudent({ ...localStudent, class: e.target.value })
                }
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                No. Absen
              </label>
              <input
                type="text"
                value={localStudent.absentNumber}
                onChange={(e) =>
                  setLocalStudent({
                    ...localStudent,
                    absentNumber: e.target.value,
                  })
                }
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-bold"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
};
