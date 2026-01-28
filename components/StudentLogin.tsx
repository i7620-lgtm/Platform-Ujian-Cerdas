
import React, { useState, useEffect, useRef } from 'react';
import type { Student } from '../types';
import { LogoIcon, ArrowLeftIcon } from './Icons';

interface StudentLoginProps {
  onLoginSuccess: (examCode: string, student: Student) => void;
  onBack: () => void;
}

export const StudentLogin: React.FC<StudentLoginProps> = ({ onLoginSuccess, onBack }) => {
  const STORAGE_KEYS = {
      NAME: 'saved_student_fullname',
      CLASS: 'saved_student_class',
      ABSENT: 'saved_student_absent'
  };

  const [examCode, setExamCode] = useState('');
  const [fullName, setFullName] = useState(() => localStorage.getItem(STORAGE_KEYS.NAME) || '');
  const [studentClass, setStudentClass] = useState(() => localStorage.getItem(STORAGE_KEYS.CLASS) || '');
  const [absentNumber, setAbsentNumber] = useState(() => localStorage.getItem(STORAGE_KEYS.ABSENT) || '');
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

    const cleanName = fullName.trim();
    const cleanClass = studentClass.trim();
    const cleanAbsent = absentNumber.trim();

    localStorage.setItem(STORAGE_KEYS.NAME, cleanName);
    localStorage.setItem(STORAGE_KEYS.CLASS, cleanClass);
    localStorage.setItem(STORAGE_KEYS.ABSENT, cleanAbsent);

    const compositeId = `${cleanName}-${cleanClass}-${cleanAbsent}`.toLowerCase().replace(/[^a-z0-9-]/g, '_'); 

    const student: Student = {
      fullName: cleanName,
      class: cleanClass,
      absentNumber: cleanAbsent,
      studentId: compositeId, 
    };
    onLoginSuccess(examCode.toUpperCase(), student);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC] p-6 font-sans">
        <div className="w-full max-w-[420px] animate-fade-in">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 mb-10 text-[11px] font-black uppercase tracking-widest transition-colors pl-1">
                <ArrowLeftIcon className="w-4 h-4" />
                Beranda
            </button>
            
            <div className="bg-white p-10 rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100">
                <div className="text-center mb-10">
                    <div className="inline-block p-4 bg-indigo-50 rounded-3xl text-indigo-600 mb-6 shadow-sm">
                        <LogoIcon className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Login Siswa</h2>
                    <p className="text-sm text-slate-400 font-medium mt-2">Gunakan data identitas yang benar.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-5">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Kode Ujian</label>
                            <input
                                ref={examCodeInputRef}
                                type="text"
                                value={examCode}
                                onChange={(e) => setExamCode(e.target.value)}
                                className="block w-full px-6 py-5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-100 rounded-2xl focus:outline-none transition-all text-center text-3xl font-black tracking-[0.2em] text-indigo-600 uppercase placeholder:text-slate-200"
                                placeholder="XXXXXX"
                                autoComplete="off"
                            />
                        </div>

                        <div className="flex items-center gap-4 py-2">
                            <div className="h-px bg-slate-100 flex-1"></div>
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Identitas</span>
                            <div className="h-px bg-slate-100 flex-1"></div>
                        </div>
                        
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="block w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-100 rounded-2xl focus:outline-none transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300 shadow-inner"
                            placeholder="Nama Lengkap"
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <input
                                type="text"
                                value={studentClass}
                                onChange={(e) => setStudentClass(e.target.value)}
                                className="block w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-100 rounded-2xl focus:outline-none transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300 shadow-inner"
                                placeholder="Kelas"
                            />
                            <input
                                type="text"
                                value={absentNumber}
                                onChange={(e) => setAbsentNumber(e.target.value)}
                                className="block w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-100 rounded-2xl focus:outline-none transition-all text-sm font-bold text-slate-700 text-center placeholder:text-slate-300 shadow-inner"
                                placeholder="No. Absen"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-bold text-center animate-shake">
                            {error}
                        </div>
                    )}
                    
                    <button type="submit" className="w-full bg-slate-900 text-white font-black text-xs uppercase tracking-widest py-5 rounded-2xl hover:bg-black hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 shadow-xl shadow-slate-200 mt-4 active:scale-95">
                        Mulai Mengerjakan
                    </button>
                </form>
            </div>
            
            <p className="text-center mt-10 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
                Powered by Platform Ujian Cerdas
            </p>
        </div>
    </div>
  );
};
