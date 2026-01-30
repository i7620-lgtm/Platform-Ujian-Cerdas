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

    const compositeId = `${fullName}-${studentClass}-${absentNumber}`.toLowerCase().replace(/[^a-z0-9-]/g, '_'); 

    onLoginSuccess(examCode.toUpperCase(), {
      fullName: fullName.trim(),
      class: studentClass.trim(),
      absentNumber: absentNumber.trim(),
      studentId: compositeId, 
    });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#F8FAFC]">
        <div className="w-full max-w-sm animate-gentle-slide">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 mb-8 text-xs font-bold uppercase tracking-widest transition-all group pl-2">
                <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Kembali
            </button>
            
            <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-xl shadow-slate-100 border border-white">
                <div className="text-center mb-8">
                    <div className="inline-flex p-3 bg-slate-50 rounded-xl text-slate-800 mb-4">
                        <LogoIcon className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800">Masuk Ujian</h2>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="group">
                        <input
                            ref={examCodeInputRef}
                            type="text"
                            value={examCode}
                            onChange={(e) => setExamCode(e.target.value)}
                            className="block w-full px-4 py-5 bg-slate-50 border-2 border-slate-100 focus:bg-white focus:border-indigo-500 focus:ring-0 rounded-xl outline-none transition-all text-center text-xl font-mono font-bold tracking-[0.2em] text-slate-900 uppercase placeholder:text-slate-300"
                            placeholder="KODE"
                            autoComplete="off"
                        />
                    </div>

                    <div className="space-y-3 pt-2">
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="block w-full px-5 py-4 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none transition-all text-sm font-semibold text-slate-800 placeholder:text-slate-400"
                            placeholder="Nama Lengkap Siswa"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="text"
                                value={studentClass}
                                onChange={(e) => setStudentClass(e.target.value)}
                                className="block w-full px-5 py-4 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none transition-all text-sm font-semibold text-slate-800 placeholder:text-slate-400"
                                placeholder="Kelas"
                            />
                            <input
                                type="text"
                                value={absentNumber}
                                onChange={(e) => setAbsentNumber(e.target.value)}
                                className="block w-full px-5 py-4 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none transition-all text-sm font-semibold text-slate-800 text-center placeholder:text-slate-400"
                                placeholder="No. Absen"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-bold text-center animate-fast-fade">
                            {error}
                        </div>
                    )}
                    
                    <button 
                        type="submit" 
                        className="w-full bg-slate-900 text-white font-bold text-sm py-4 rounded-xl hover:bg-black transition-all shadow-lg active:scale-[0.98] mt-4 flex items-center justify-center gap-2 group"
                    >
                        Mulai Mengerjakan
                        <ArrowLeftIcon className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform opacity-60" />
                    </button>
                </form>
            </div>
            
            <p className="text-center mt-8 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                Pastikan koneksi internet stabil
            </p>
        </div>
    </div>
  );
};
