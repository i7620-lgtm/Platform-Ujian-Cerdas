
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
    <div className="min-h-screen flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-sm animate-gentle-slide">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 mb-8 text-[10px] font-black uppercase tracking-[0.2em] transition-all group">
                <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Kembali
            </button>
            
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl shadow-slate-100 border border-slate-100">
                <div className="text-center mb-10">
                    <div className="inline-flex p-4 bg-slate-50 rounded-2xl text-slate-900 mb-6">
                        <LogoIcon className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Login Siswa</h2>
                    <p className="text-xs text-slate-400 font-medium mt-2">Gunakan kode akses dari guru Anda.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Kode Akses</label>
                        <input
                            ref={examCodeInputRef}
                            type="text"
                            value={examCode}
                            onChange={(e) => setExamCode(e.target.value)}
                            className="block w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-slate-100 rounded-2xl focus:outline-none transition-all text-center text-2xl font-black tracking-[0.4em] text-slate-900 uppercase placeholder:text-slate-200"
                            placeholder="CODE"
                            autoComplete="off"
                        />
                    </div>

                    <div className="space-y-4">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Identitas Siswa</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="block w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-slate-100 rounded-2xl focus:outline-none transition-all text-sm font-bold text-slate-800 placeholder:text-slate-300"
                                placeholder="Nama Lengkap"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <input
                                type="text"
                                value={studentClass}
                                onChange={(e) => setStudentClass(e.target.value)}
                                className="block w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-slate-100 rounded-2xl focus:outline-none transition-all text-sm font-bold text-slate-800 placeholder:text-slate-300"
                                placeholder="Kelas"
                            />
                            <input
                                type="text"
                                value={absentNumber}
                                onChange={(e) => setAbsentNumber(e.target.value)}
                                className="block w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-slate-100 rounded-2xl focus:outline-none transition-all text-sm font-bold text-slate-800 text-center placeholder:text-slate-300"
                                placeholder="Absen"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black uppercase text-center animate-fast-fade">
                            {error}
                        </div>
                    )}
                    
                    <button 
                        type="submit" 
                        className="w-full bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl hover:bg-black shadow-xl shadow-slate-100 transition-all active:scale-95 mt-4 flex items-center justify-center gap-3 group/btn"
                    >
                        Masuk Ujian
                        <ArrowLeftIcon className="w-5 h-5 rotate-180 group-hover:translate-x-1 transition-transform" />
                    </button>
                </form>
            </div>
            
            <p className="text-center mt-12 text-[10px] font-black text-slate-200 uppercase tracking-[0.5em]">
                UjianCerdas • v2.5
            </p>
        </div>
    </div>
  );
};
