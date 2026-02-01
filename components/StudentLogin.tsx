
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
        {/* Zen Background Elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-gradient-to-br from-indigo-50/60 to-purple-50/60 rounded-full blur-[100px] animate-pulse" style={{animationDuration: '8s'}}></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-gradient-to-tl from-blue-50/60 to-emerald-50/60 rounded-full blur-[100px] animate-pulse" style={{animationDuration: '10s'}}></div>
        </div>

        <div className="w-full max-w-[420px] px-6 relative z-10 flex flex-col h-full sm:h-auto justify-center">
            {/* Header Navigation */}
            <button 
                onClick={onBack} 
                className="group self-start flex items-center gap-2 text-slate-400 hover:text-slate-800 mb-6 text-[10px] font-bold uppercase tracking-widest transition-all pl-2 py-2"
            >
                <div className="w-6 h-6 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                     <ArrowLeftIcon className="w-3 h-3" />
                </div>
                <span>Kembali</span>
            </button>
            
            <div className="bg-white/80 backdrop-blur-xl p-8 sm:p-10 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.03)] border border-white ring-1 ring-slate-50 animate-gentle-slide">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-white shadow-[0_10px_20px_-5px_rgba(79,70,229,0.15)] mb-5 text-indigo-600 border border-indigo-50 relative overflow-hidden">
                        <div className="absolute inset-0 bg-indigo-50/50 rounded-3xl transform rotate-45 translate-y-8 translate-x-8"></div>
                        <UserIcon className="w-7 h-7 relative z-10" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Selamat Datang</h2>
                    <p className="text-slate-400 text-sm font-medium mt-2">
                        Siapkan diri untuk ujian hari ini.
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    
                    {/* Input Group: Identity */}
                    <div className="space-y-4">
                        {/* Nama Lengkap */}
                        <div className={`transition-all duration-300 rounded-2xl bg-slate-50 border ${isFocused === 'name' ? 'bg-white border-indigo-200 shadow-[0_4px_20px_-4px_rgba(79,70,229,0.1)] ring-4 ring-indigo-500/5' : 'border-transparent hover:bg-slate-100'}`}>
                            <div className="px-5 pt-3">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Nama Lengkap</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    onFocus={() => setIsFocused('name')}
                                    onBlur={() => setIsFocused(null)}
                                    className="block w-full bg-transparent border-none p-0 pb-3 text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:ring-0 outline-none"
                                    placeholder="Ketik nama anda..."
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             {/* Kelas */}
                             <div className={`transition-all duration-300 rounded-2xl bg-slate-50 border ${isFocused === 'class' ? 'bg-white border-indigo-200 shadow-[0_4px_20px_-4px_rgba(79,70,229,0.1)] ring-4 ring-indigo-500/5' : 'border-transparent hover:bg-slate-100'}`}>
                                <div className="px-5 pt-3">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Kelas</label>
                                    <input
                                        type="text"
                                        value={studentClass}
                                        onChange={(e) => setStudentClass(e.target.value)}
                                        onFocus={() => setIsFocused('class')}
                                        onBlur={() => setIsFocused(null)}
                                        className="block w-full bg-transparent border-none p-0 pb-3 text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:ring-0 outline-none"
                                        placeholder="X-IPA-1"
                                    />
                                </div>
                            </div>

                             {/* Absen */}
                             <div className={`transition-all duration-300 rounded-2xl bg-slate-50 border ${isFocused === 'absent' ? 'bg-white border-indigo-200 shadow-[0_4px_20px_-4px_rgba(79,70,229,0.1)] ring-4 ring-indigo-500/5' : 'border-transparent hover:bg-slate-100'}`}>
                                <div className="px-5 pt-3">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">No. Absen</label>
                                    <input
                                        type="text"
                                        value={absentNumber}
                                        onChange={(e) => setAbsentNumber(e.target.value)}
                                        onFocus={() => setIsFocused('absent')}
                                        onBlur={() => setIsFocused(null)}
                                        className="block w-full bg-transparent border-none p-0 pb-3 text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:ring-0 outline-none text-center"
                                        placeholder="00"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Divider Visual */}
                    <div className="flex items-center gap-4 py-2">
                        <div className="h-px bg-slate-100 flex-1"></div>
                        <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Akses Ujian</div>
                        <div className="h-px bg-slate-100 flex-1"></div>
                    </div>

                    {/* Exam Code Input - Distinct Style */}
                    <div className={`relative group transition-all duration-300 ${isFocused === 'code' ? 'scale-[1.02]' : ''}`}>
                        <div className={`absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl opacity-0 group-hover:opacity-20 transition duration-500 blur ${isFocused === 'code' ? 'opacity-30' : ''}`}></div>
                        <div className={`relative bg-white rounded-2xl p-1.5 flex items-center shadow-sm border transition-colors ${isFocused === 'code' ? 'border-indigo-100' : 'border-slate-100'}`}>
                           <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-50 text-indigo-500 shrink-0">
                              <QrCodeIcon className="w-6 h-6" />
                           </div>
                           <div className="h-8 w-px bg-slate-100 mx-2"></div>
                           <input
                                ref={examCodeInputRef}
                                type="text"
                                value={examCode}
                                onChange={(e) => setExamCode(e.target.value)}
                                onFocus={() => setIsFocused('code')}
                                onBlur={() => setIsFocused(null)}
                                className="w-full bg-transparent py-3 text-center font-code text-xl font-bold tracking-[0.25em] text-slate-800 placeholder:text-slate-200 outline-none uppercase"
                                placeholder="KODE"
                                autoComplete="off"
                                maxLength={6}
                           />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-medium animate-fast-fade">
                            <div className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 font-bold">!</div>
                            <p>{error}</p>
                        </div>
                    )}
                    
                    <button 
                        type="submit" 
                        className="w-full bg-slate-900 text-white font-bold text-sm h-[56px] rounded-2xl hover:bg-black hover:shadow-xl hover:shadow-slate-200 transition-all active:scale-[0.98] mt-6 flex items-center justify-center gap-3 group relative overflow-hidden"
                    >
                        <span className="relative z-10">Mulai Mengerjakan</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-600 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                        <CheckCircleIcon className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300 transition-colors relative z-10" />
                    </button>
                </form>
            </div>
            
            <div className="mt-8 text-center">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">Platform Ujian Cerdas</p>
            </div>
        </div>
    </div>
  );
};
