import React, { useState, useEffect, useRef } from 'react';
import type { Student } from '../types';
import { LogoIcon, ArrowLeftIcon, UserIcon, QrCodeIcon } from './Icons';

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
      setError('Mohon lengkapi semua data identitas.');
      return;
    }
    setError('');

    localStorage.setItem('saved_student_fullname', fullName.trim());
    localStorage.setItem('saved_student_class', studentClass.trim());
    localStorage.setItem('saved_student_absent', absentNumber.trim());

    // Membentuk ID unik siswa
    const compositeId = `${fullName.trim()}-${studentClass.trim()}-${absentNumber.trim()}`;

    onLoginSuccess(examCode.toUpperCase(), {
      fullName: fullName.trim(),
      class: studentClass.trim(),
      absentNumber: absentNumber.trim(),
      studentId: compositeId, 
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#FAFAFA] relative overflow-hidden font-sans">
        {/* Decorative Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-50/50 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-50/50 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="w-full max-w-[400px] z-10 animate-gentle-slide">
            <button 
                onClick={onBack} 
                className="group flex items-center gap-2 text-slate-400 hover:text-slate-800 mb-8 text-[10px] font-bold uppercase tracking-widest transition-all pl-1"
            >
                <ArrowLeftIcon className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                Kembali ke Menu
            </button>
            
            <div className="bg-white p-8 sm:p-10 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-white ring-1 ring-slate-100">
                <div className="text-center mb-10">
                    <div className="inline-flex p-3 bg-slate-50 rounded-2xl mb-4 text-indigo-600 shadow-sm border border-slate-100">
                        <UserIcon className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Login Siswa</h2>
                    <p className="text-slate-500 text-sm font-medium mt-2 leading-relaxed">
                        Silakan masukkan identitas dan kode ujian<br/>yang diberikan oleh pengawas.
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-4">
                         <div className="relative group">
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="block w-full px-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl outline-none transition-all text-sm font-bold text-slate-800 placeholder:text-slate-300 peer"
                                placeholder=" "
                            />
                            <label className="absolute left-5 top-4 text-slate-400 text-sm font-medium transition-all duration-200 transform -translate-y-0 scale-100 origin-left peer-focus:-translate-y-3 peer-focus:scale-75 peer-focus:text-indigo-500 peer-[:not(:placeholder-shown)]:-translate-y-3 peer-[:not(:placeholder-shown)]:scale-75 peer-[:not(:placeholder-shown)]:text-slate-400 pointer-events-none">
                                Nama Lengkap
                            </label>
                        </div>

                        <div className="grid grid-cols-5 gap-3">
                             <div className="col-span-3 relative group">
                                <input
                                    type="text"
                                    value={studentClass}
                                    onChange={(e) => setStudentClass(e.target.value)}
                                    className="block w-full px-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl outline-none transition-all text-sm font-bold text-slate-800 placeholder:text-slate-300 peer"
                                    placeholder=" "
                                />
                                <label className="absolute left-5 top-4 text-slate-400 text-sm font-medium transition-all duration-200 transform -translate-y-0 scale-100 origin-left peer-focus:-translate-y-3 peer-focus:scale-75 peer-focus:text-indigo-500 peer-[:not(:placeholder-shown)]:-translate-y-3 peer-[:not(:placeholder-shown)]:scale-75 peer-[:not(:placeholder-shown)]:text-slate-400 pointer-events-none">
                                    Kelas
                                </label>
                            </div>
                             <div className="col-span-2 relative group">
                                <input
                                    type="text"
                                    value={absentNumber}
                                    onChange={(e) => setAbsentNumber(e.target.value)}
                                    className="block w-full px-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl outline-none transition-all text-sm font-bold text-slate-800 placeholder:text-slate-300 text-center peer"
                                    placeholder=" "
                                />
                                <label className="absolute left-0 right-0 top-4 text-center text-slate-400 text-sm font-medium transition-all duration-200 transform -translate-y-0 scale-100 origin-center peer-focus:-translate-y-3 peer-focus:scale-75 peer-focus:text-indigo-500 peer-[:not(:placeholder-shown)]:-translate-y-3 peer-[:not(:placeholder-shown)]:scale-75 peer-[:not(:placeholder-shown)]:text-slate-400 pointer-events-none">
                                    Absen
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="pt-2">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                            <div className="relative bg-white rounded-2xl p-1 border border-slate-100 shadow-sm flex items-center">
                                <div className="pl-4 text-slate-400">
                                    <QrCodeIcon className="w-5 h-5" />
                                </div>
                                <input
                                    ref={examCodeInputRef}
                                    type="text"
                                    value={examCode}
                                    onChange={(e) => setExamCode(e.target.value)}
                                    className="block w-full px-4 py-4 bg-transparent border-none focus:ring-0 outline-none text-center text-xl font-code font-bold tracking-[0.3em] text-indigo-600 uppercase placeholder:text-slate-200"
                                    placeholder="KODE"
                                    autoComplete="off"
                                />
                            </div>
                            <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Kode Ujian</p>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold text-center animate-fast-fade shadow-sm">
                            {error}
                        </div>
                    )}
                    
                    <button 
                        type="submit" 
                        className="w-full bg-slate-900 text-white font-bold text-sm py-4.5 rounded-2xl hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-3 group shadow-md"
                    >
                        <span>Mulai Ujian</span>
                        <ArrowLeftIcon className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform opacity-60" />
                    </button>
                </form>
            </div>
            
            <p className="text-center text-slate-300 text-[10px] font-bold mt-8 uppercase tracking-widest">
                Platform Ujian Cerdas V3.0
            </p>
        </div>
    </div>
  );
};
