import React, { useState, useEffect, useRef } from 'react';
import type { Student } from '../types';
import { LogoIcon, ArrowLeftIcon } from './Icons';

interface StudentLoginProps {
  onLoginSuccess: (examCode: string, student: Student) => void;
  onBack: () => void;
}

export const StudentLogin: React.FC<StudentLoginProps> = ({ onLoginSuccess, onBack }) => {
  const [examCode, setExamCode] = useState('');
  const [fullName, setFullName] = useState(() => localStorage.getItem('saved_student_fullname') || '');
  const [studentClass, setStudentClass] = useState(() => localStorage.getItem('saved_student_class') || '');
  const [absentNumber, setAbsentNumber] = useState(() => localStorage.getItem('saved_student_absent') || '');
  const [error, setError] = useState('');
  const examCodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (fullName && studentClass && absentNumber && examCodeInputRef.current) {
        examCodeInputRef.current.focus();
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examCode || !fullName || !studentClass || !absentNumber) {
      setError('Mohon lengkapi semua data.');
      return;
    }
    setError('');

    localStorage.setItem('saved_student_fullname', fullName.trim());
    localStorage.setItem('saved_student_class', studentClass.trim());
    localStorage.setItem('saved_student_absent', absentNumber.trim());

    // PERUBAHAN: Format Student ID sekarang persis: "Nama Lengkap"-"Kelas"-"Nomor Absen"
    // Ini memudahkan pembacaan manual di database Supabase.
    // Contoh: "Budi Santoso-XII IPA 1-05"
    const compositeId = `${fullName.trim()}-${studentClass.trim()}-${absentNumber.trim()}`;

    onLoginSuccess(examCode.toUpperCase(), {
      fullName: fullName.trim(),
      class: studentClass.trim(),
      absentNumber: absentNumber.trim(),
      studentId: compositeId, 
    });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#FAFAFA]">
        <div className="w-full max-w-[360px] animate-gentle-slide">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 mb-8 text-[10px] font-bold uppercase tracking-widest transition-all group pl-1">
                <ArrowLeftIcon className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                Kembali
            </button>
            
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                <div className="text-center mb-8">
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Selamat Datang</h2>
                    <p className="text-slate-400 text-xs font-medium mt-1">Masukkan kode ujian dari guru Anda.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="group">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Kode Ujian</label>
                        <input
                            ref={examCodeInputRef}
                            type="text"
                            value={examCode}
                            onChange={(e) => setExamCode(e.target.value)}
                            className="block w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-0 rounded-2xl outline-none transition-all text-center text-2xl font-code font-bold tracking-[0.2em] text-slate-900 uppercase placeholder:text-slate-200"
                            placeholder="KODE"
                            autoComplete="off"
                        />
                    </div>

                    <div className="space-y-4 pt-2">
                         <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nama Lengkap</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="block w-full px-4 py-3 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none transition-all text-sm font-semibold text-slate-800 placeholder:text-slate-300"
                                placeholder="Nama Anda"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                             <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Kelas</label>
                                <input
                                    type="text"
                                    value={studentClass}
                                    onChange={(e) => setStudentClass(e.target.value)}
                                    className="block w-full px-4 py-3 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none transition-all text-sm font-semibold text-slate-800 placeholder:text-slate-300"
                                    placeholder="Kelas"
                                />
                            </div>
                             <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">No. Absen</label>
                                <input
                                    type="text"
                                    value={absentNumber}
                                    onChange={(e) => setAbsentNumber(e.target.value)}
                                    className="block w-full px-4 py-3 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none transition-all text-sm font-semibold text-slate-800 text-center placeholder:text-slate-300"
                                    placeholder="00"
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-bold text-center animate-fast-fade">
                            {error}
                        </div>
                    )}
                    
                    <button 
                        type="submit" 
                        className="w-full bg-slate-900 text-white font-bold text-sm py-4 rounded-xl hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200 active:scale-[0.98] mt-2 flex items-center justify-center gap-2 group"
                    >
                        Mulai Mengerjakan
                        <ArrowLeftIcon className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform opacity-60" />
                    </button>
                </form>
            </div>
        </div>
    </div>
  );
};
