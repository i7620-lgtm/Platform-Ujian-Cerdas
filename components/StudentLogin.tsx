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
      setError('Mohon lengkapi semua data pendaftaran.');
      return;
    }
    setError('');

    localStorage.setItem('saved_student_fullname', fullName.trim());
    localStorage.setItem('saved_student_class', studentClass.trim());
    localStorage.setItem('saved_student_absent', absentNumber.trim());

    const compositeId = `${fullName}-${studentClass}-${absentNumber}`.toLowerCase().replace(/[^a-z0-9-]/g, '_'); 

    onLoginSuccess(examCode.toUpperCase(), {
      fullName: fullName.trim(),
      class: studentClass.trim(),
      absentNumber: absentNumber.trim(),
      studentId: compositeId, 
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F8FAFC]">
        <div className="w-full max-w-sm animate-gentle-slide">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-brand-600 mb-6 text-[10px] font-black uppercase tracking-widest transition-all group">
                <ArrowLeftIcon className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                Kembali
            </button>
            
            <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100">
                <div className="text-center mb-8">
                    <div className="inline-flex p-3 bg-brand-50 rounded-2xl text-brand-600 mb-4">
                        <LogoIcon className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Login Siswa</h2>
                    <p className="text-[11px] text-slate-400 font-medium mt-1">Masukkan data diri untuk mulai ujian.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Kode Akses</label>
                        <input
                            ref={examCodeInputRef}
                            type="text"
                            value={examCode}
                            onChange={(e) => setExamCode(e.target.value)}
                            className="block w-full px-4 py-3.5 bg-slate-50 border border-slate-100 focus:bg-white focus:border-brand-200 rounded-xl focus:outline-none transition-all text-center text-xl font-black tracking-[0.2em] text-brand-600 uppercase placeholder:text-slate-200"
                            placeholder="KODE"
                            autoComplete="off"
                        />
                    </div>

                    <div className="space-y-3">
                         <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Identitas</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="block w-full px-4 py-3 bg-slate-50 border border-slate-100 focus:bg-white focus:border-brand-300 rounded-xl focus:outline-none transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300"
                                placeholder="Nama Lengkap"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="text"
                                value={studentClass}
                                onChange={(e) => setStudentClass(e.target.value)}
                                className="block w-full px-4 py-3 bg-slate-50 border border-slate-100 focus:bg-white focus:border-brand-300 rounded-xl focus:outline-none transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300"
                                placeholder="Kelas"
                            />
                            <input
                                type="text"
                                value={absentNumber}
                                onChange={(e) => setAbsentNumber(e.target.value)}
                                className="block w-full px-4 py-3 bg-slate-50 border border-slate-100 focus:bg-white focus:border-brand-300 rounded-xl focus:outline-none transition-all text-sm font-bold text-slate-700 text-center placeholder:text-slate-300"
                                placeholder="No. Absen"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-bold text-center animate-fast-fade">
                            {error}
                        </div>
                    )}
                    
                    <button 
                        type="submit" 
                        className="w-full bg-slate-900 text-white font-black text-sm py-4 rounded-xl hover:bg-black shadow-lg shadow-slate-200 transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-2 group/btn"
                    >
                        Masuk Sekarang
                        <ArrowLeftIcon className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                    </button>
                </form>
            </div>
            
            <p className="text-center mt-8 text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em]">
                UjianCerdas • v2.0
            </p>
        </div>
    </div>
  );
};
