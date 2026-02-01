
import React, { useState, useEffect, useRef } from 'react';
import type { Student } from '../types';
import { ArrowLeftIcon, UserIcon, QrCodeIcon, CheckCircleIcon } from './Icons';

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
  const [isFocused, setIsFocused] = useState<string | null>(null);
  const examCodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (fullName && studentClass && absentNumber && examCodeInputRef.current) {
        examCodeInputRef.current.focus();
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examCode || !fullName || !studentClass || !absentNumber) {
      setError('Mohon lengkapi semua data identitas.');
      return;
    }
    setError('');

    localStorage.setItem('saved_student_fullname', fullName.trim());
    localStorage.setItem('saved_student_class', studentClass.trim());
    localStorage.setItem('saved_student_absent', absentNumber.trim());

    const compositeId = `${fullName.trim()}-${studentClass.trim()}-${absentNumber.trim()}`;

    onLoginSuccess(examCode.toUpperCase(), {
      fullName: fullName.trim(),
      class: studentClass.trim(),
      absentNumber: absentNumber.trim(),
      studentId: compositeId, 
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] relative overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-800">
        <div className="w-full max-w-[400px] px-6 relative z-10 flex flex-col justify-center">
            
            <button 
                onClick={onBack} 
                className="group absolute top-6 left-6 flex items-center gap-2 text-slate-400 hover:text-slate-800 text-[10px] font-bold uppercase tracking-widest transition-all"
            >
                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                     <ArrowLeftIcon className="w-3 h-3" />
                </div>
            </button>
            
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white animate-gentle-slide">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 mb-4">
                        <UserIcon className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Identitas Siswa</h2>
                    <p className="text-slate-400 text-xs font-medium mt-1">
                        Isi data diri untuk memulai ujian.
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    
                    <div className="group">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-3 mb-1.5 block">Nama Lengkap</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            onFocus={() => setIsFocused('name')}
                            onBlur={() => setIsFocused(null)}
                            className="block w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
                            placeholder="Nama Lengkap"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-3 mb-1.5 block">Kelas</label>
                            <input
                                type="text"
                                value={studentClass}
                                onChange={(e) => setStudentClass(e.target.value)}
                                className="block w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
                                placeholder="X-IPA"
                            />
                        </div>
                         <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-3 mb-1.5 block">No. Absen</label>
                            <input
                                type="text"
                                value={absentNumber}
                                onChange={(e) => setAbsentNumber(e.target.value)}
                                className="block w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all text-center"
                                placeholder="00"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                         <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-3 mb-1.5 block">Kode Ujian</label>
                        <div className={`relative flex items-center bg-white rounded-2xl border-2 transition-all overflow-hidden ${isFocused === 'code' ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-slate-100'}`}>
                           <div className="pl-4 text-slate-300"><QrCodeIcon className="w-5 h-5" /></div>
                           <input
                                ref={examCodeInputRef}
                                type="text"
                                value={examCode}
                                onChange={(e) => setExamCode(e.target.value)}
                                onFocus={() => setIsFocused('code')}
                                onBlur={() => setIsFocused(null)}
                                className="w-full bg-transparent py-4 px-4 text-center font-code text-lg font-black tracking-[0.2em] text-slate-800 placeholder:text-slate-200 outline-none uppercase"
                                placeholder="KODE"
                                autoComplete="off"
                                maxLength={6}
                           />
                        </div>
                    </div>

                    {error && (
                        <div className="text-center p-3 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold border border-rose-100 animate-fast-fade">
                            {error}
                        </div>
                    )}
                    
                    <button 
                        type="submit" 
                        className="w-full bg-slate-900 text-white font-bold text-sm h-[56px] rounded-2xl hover:bg-black hover:shadow-xl hover:shadow-slate-200 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-3"
                    >
                        <span>Mulai Mengerjakan</span>
                        <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                    </button>
                </form>
            </div>
            
            <p className="mt-8 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">Platform Ujian Cerdas</p>
        </div>
    </div>
  );
};
