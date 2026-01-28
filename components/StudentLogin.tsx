
import React, { useState, useEffect, useRef } from 'react';
import type { Student } from '../types';
import { LogoIcon, ArrowLeftIcon, TrashIcon, ClockIcon } from './Icons';

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
  const [isLoading, setIsLoading] = useState(false);
  
  const examCodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (fullName && studentClass && absentNumber && examCodeInputRef.current) {
          examCodeInputRef.current.focus();
      }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examCode || !fullName || !studentClass || !absentNumber) {
      setError('Lengkapi semua data diri dan kode ujian.');
      return;
    }
    setError('');
    setIsLoading(true);

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
    
    // Memberikan sedikit jeda untuk sensasi UX yang lebih halus
    setTimeout(() => {
        onLoginSuccess(examCode.toUpperCase(), student);
        setIsLoading(false);
    }, 600);
  };

  const handleClearData = () => {
      if(confirm("Hapus data identitas tersimpan?")) {
          setFullName(''); setStudentClass(''); setAbsentNumber('');
          localStorage.removeItem(STORAGE_KEYS.NAME);
          localStorage.removeItem(STORAGE_KEYS.CLASS);
          localStorage.removeItem(STORAGE_KEYS.ABSENT);
      }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] flex items-center justify-center p-6 relative overflow-hidden font-sans">
        {/* Background Gradients */}
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-50/50 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-50/50 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="w-full max-w-[440px] z-10 animate-fade-in">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 mb-8 text-xs font-black uppercase tracking-widest transition-all">
                <ArrowLeftIcon className="w-4 h-4" />
                Kembali
            </button>
            
            <div className="bg-white/80 backdrop-blur-2xl p-10 sm:p-12 rounded-[3.5rem] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.06)] border border-white relative">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-[2rem] text-white shadow-xl shadow-indigo-200 mb-6 transform rotate-3 hover:rotate-0 transition-transform duration-500">
                        <ClockIcon className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Portal Ujian</h2>
                    <p className="text-sm text-slate-400 mt-2 font-medium">Gunakan identitas resmi Anda.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="relative group">
                         <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-[2rem] opacity-0 group-focus-within:opacity-10 transition duration-500 blur-xl"></div>
                         <div className="relative">
                            <input
                                ref={examCodeInputRef}
                                type="text"
                                value={examCode}
                                onChange={(e) => setExamCode(e.target.value)}
                                className="w-full px-6 py-5 bg-slate-50 rounded-3xl text-center text-3xl font-black tracking-[0.2em] text-indigo-600 placeholder:text-slate-200 focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none uppercase transition-all"
                                placeholder="KODE"
                                autoComplete="off"
                            />
                            <div className="text-[10px] font-black text-center text-slate-300 uppercase tracking-[0.3em] mt-3">Kode Akses Ujian</div>
                         </div>
                    </div>

                    <div className="pt-4 space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identitas Siswa</span>
                            {(fullName || studentClass) && (
                                <button type="button" onClick={handleClearData} className="text-[10px] font-bold text-rose-500 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors">
                                    Reset
                                </button>
                            )}
                        </div>
                        
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-100 rounded-2xl outline-none transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300"
                            placeholder="Nama Lengkap Sesuai Absen"
                        />
                        <div className="grid grid-cols-5 gap-4">
                            <div className="col-span-3">
                                <input
                                    type="text"
                                    value={studentClass}
                                    onChange={(e) => setStudentClass(e.target.value)}
                                    className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-100 rounded-2xl outline-none transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300"
                                    placeholder="Kelas"
                                />
                            </div>
                             <div className="col-span-2">
                                <input
                                    type="text"
                                    value={absentNumber}
                                    onChange={(e) => setAbsentNumber(e.target.value)}
                                    className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-100 rounded-2xl outline-none transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300 text-center"
                                    placeholder="No. Absen"
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 rounded-2xl bg-rose-50 text-rose-500 text-[11px] font-bold text-center animate-shake border border-rose-100">
                            {error}
                        </div>
                    )}
                    
                    <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white font-black py-5 rounded-[2rem] hover:bg-black hover:shadow-2xl hover:shadow-indigo-200 transition-all duration-300 mt-4 flex items-center justify-center gap-3 active:scale-[0.98]">
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                Mulai Kerjakan
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                            </>
                        )}
                    </button>
                </form>
            </div>
            
            <p className="text-center mt-12 text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">Terpantau Sistem Keamanan Ujian</p>
        </div>
    </div>
  );
};
