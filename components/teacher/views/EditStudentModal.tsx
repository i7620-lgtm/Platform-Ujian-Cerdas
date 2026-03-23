import React, { useState } from 'react';
import type { Result } from '../../../types';
import { XMarkIcon, CheckCircleIcon } from '../../Icons';

interface EditStudentModalProps {
    result: Result;
    onClose: () => void;
    onSave: (id: number, oldId: string, newData: { fullName: string; schoolName?: string; class: string; absentNumber: string }) => void;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({ result, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        fullName: result.student.fullName,
        schoolName: result.student.schoolName || '',
        class: result.student.class,
        absentNumber: result.student.absentNumber
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(result.id!, result.student.studentId, formData);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[80] animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-in-up border border-white dark:border-slate-700 relative">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full transition-colors"><XMarkIcon className="w-5 h-5"/></button>
                
                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white tracking-tight">Edit Data Siswa</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Perubahan akan langsung tersimpan.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Nama Lengkap</label>
                        <input 
                            type="text" 
                            value={formData.fullName} 
                            onChange={e => setFormData({...formData, fullName: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Nama Sekolah</label>
                        <input 
                            type="text" 
                            value={formData.schoolName} 
                            onChange={e => setFormData({...formData, schoolName: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Opsional"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Kelas</label>
                            <input 
                                type="text" 
                                value={formData.class} 
                                onChange={e => setFormData({...formData, class: e.target.value})}
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">No. Absen</label>
                            <input 
                                type="text" 
                                value={formData.absentNumber} 
                                onChange={e => setFormData({...formData, absentNumber: e.target.value})}
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                                required
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors uppercase tracking-wide">Batal</button>
                        <button type="submit" className="flex-[2] py-3 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-blue-900/30 transition-all uppercase tracking-wide flex items-center justify-center gap-2">
                            <CheckCircleIcon className="w-4 h-4" /> Simpan Perubahan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
