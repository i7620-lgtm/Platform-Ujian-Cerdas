
import React, { useState, useEffect, useRef } from 'react';
import type { Student } from '../types';
import { LogoIcon, ArrowLeftIcon, TrashIcon } from './Icons';

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
      setError('Semua data wajib diisi.');
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

  const handleClearData = () => {
      if(confirm("Hapus data tersimpan?")) {
          setFullName(''); setStudentClass(''); setAbsentNumber('');
          localStorage.removeItem(STORAGE_KEYS.NAME);
          localStorage.removeItem(STORAGE_KEYS.CLASS);
          localStorage.removeItem(STORAGE_KEYS.ABSENT);
      }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC] p-4 font-sans relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-100/40 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-cyan-100/40 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="w-full max-w-[420px] relative z-10 animate-fade-in">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-8 text-sm font-bold transition-colors pl-1">
                <ArrowLeftIcon className="w-4 h-4" />
                Kembali
            </button>
            
            <div className="bg-white/80 backdrop-blur-xl p-8 sm:p-10 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white/50 ring-1 ring-slate-900/5">
                <div className="text-center mb-10">
                    <div className="inline-block p-3.5 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-200 mb-4 transform rotate-3">
                        <LogoIcon className="w-7 h-7" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Login Peserta</h2>
                    <p className="text-sm text-slate-400 font-medium mt-1">Siapkan diri untuk hasil terbaik.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    
                    {/* Kode Ujian Input */}
                    <div className="relative group">
                         <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl opacity-20 group-focus-within:opacity-100 transition duration-500 blur-sm"></div>
                         <div className="relative bg-white rounded-2xl p-1">
                            <input
                                ref={examCodeInputRef}
                                type="text"
                                value={examCode}
                                onChange={(e) => setExamCode(e.target.value)}
                                className="block w-full px-4 py-3.5 bg-white rounded-xl text-center text-xl font-black tracking-[0.25em] text-slate-800 placeholder:text-slate-200 placeholder:font-bold focus:outline-none uppercase"
                                placeholder="KODE"
                                autoComplete="off"
                            />
                            <div className="text-[10px] font-bold text-center text-slate-400 uppercase tracking-widest pb-1.5">Kode Ujian</div>
                         </div>
                    </div>

                    <div className="pt-2 space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Identitas</span>
                            {(fullName || studentClass) && (
                                <button type="button" onClick={handleClearData} className="text-[10px] font-bold text-rose-500 hover:bg-rose-50 px-2 py-0.5 rounded transition-colors flex items-center gap-1">
                                    <TrashIcon className="w-3 h-3" /> Reset
                                </button>
                            )}
                        </div>
                        
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="block w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-100 rounded-xl focus:outline-none focus:ring-0 transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300 placeholder:font-medium"
                            placeholder="Nama Lengkap"
                        />
                        <div className="grid grid-cols-5 gap-3">
                            <div className="col-span-3">
                                <input
                                    type="text"
                                    value={studentClass}
                                    onChange={(e) => setStudentClass(e.target.value)}
                                    className="block w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-100 rounded-xl focus:outline-none focus:ring-0 transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300 placeholder:font-medium"
                                    placeholder="Kelas"
                                />
                            </div>
                             <div className="col-span-2">
                                <input
                                    type="text"
                                    value={absentNumber}
                                    onChange={(e) => setAbsentNumber(e.target.value)}
                                    className="block w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-100 rounded-xl focus:outline-none focus:ring-0 transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300 placeholder:font-medium text-center"
                                    placeholder="Absen"
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold text-center animate-shake">
                            {error}
                        </div>
                    )}
                    
                    <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-black hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-lg shadow-slate-200/50 mt-6 flex items-center justify-center gap-2">
                        Mulai Mengerjakan
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </button>
                </form>
            </div>
        </div>
    </div>
  );
};
