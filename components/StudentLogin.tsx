
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
        {/* Decorative background elements */}
        <div className="absolute top-[-15%] left-[-5%] w-[500px] h-[500px] bg-indigo-100/30 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-15%] right-[-5%] w-[400px] h-[400px] bg-sky-100/30 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="w-full max-w-[420px] relative z-10 animate-fade-in">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 mb-8 text-[11px] font-black uppercase tracking-widest transition-colors pl-1">
                <ArrowLeftIcon className="w-4 h-4" />
                Kembali
            </button>
            
            <div className="bg-white/90 backdrop-blur-2xl p-8 sm:p-10 rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.06)] border border-white">
                <div className="text-center mb-10">
                    <div className="inline-block p-4 bg-indigo-50 rounded-3xl text-indigo-600 mb-5">
                        <LogoIcon className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Login Peserta</h2>
                    <p className="text-sm text-slate-400 font-medium mt-1">Gunakan identitas asli Anda.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-4">
                        <div className="relative">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Kode Akses</label>
                            <input
                                ref={examCodeInputRef}
                                type="text"
                                value={examCode}
                                onChange={(e) => setExamCode(e.target.value)}
                                className="block w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-100 rounded-2xl focus:outline-none transition-all text-center text-2xl font-black tracking-[0.3em] text-indigo-600 uppercase placeholder:text-slate-200"
                                placeholder="KODE"
                                autoComplete="off"
                            />
                        </div>

                        <div className="h-px bg-slate-50 w-full my-6"></div>

                        <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Diri</span>
                            {(fullName || studentClass) && (
                                <button type="button" onClick={handleClearData} className="text-[10px] font-bold text-rose-500 hover:underline">Reset Data</button>
                            )}
                        </div>
                        
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="block w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-100 rounded-2xl focus:outline-none transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300"
                            placeholder="Nama Lengkap"
                        />

                        <div className="grid grid-cols-5 gap-4">
                            <div className="col-span-3">
                                <input
                                    type="text"
                                    value={studentClass}
                                    onChange={(e) => setStudentClass(e.target.value)}
                                    className="block w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-100 rounded-2xl focus:outline-none transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300"
                                    placeholder="Kelas"
                                />
                            </div>
                             <div className="col-span-2">
                                <input
                                    type="text"
                                    value={absentNumber}
                                    onChange={(e) => setAbsentNumber(e.target.value)}
                                    className="block w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-100 rounded-2xl focus:outline-none transition-all text-sm font-bold text-slate-700 text-center placeholder:text-slate-300"
                                    placeholder="No.Absen"
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-bold text-center animate-shake">
                            {error}
                        </div>
                    )}
                    
                    <button type="submit" className="w-full bg-slate-900 text-white font-black text-xs uppercase tracking-widest py-5 rounded-2xl hover:bg-black hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 shadow-xl shadow-slate-200 mt-6">
                        Mulai Mengerjakan
                    </button>
                </form>
            </div>
        </div>
    </div>
  );
};
