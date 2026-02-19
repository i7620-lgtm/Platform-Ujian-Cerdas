
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeftIcon, UserIcon, QrCodeIcon, CheckCircleIcon, LockClosedIcon, SunIcon, MoonIcon, ChevronDownIcon } from './Icons';
import type { Student } from '../types';
import { storageService } from '../services/storage';

interface StudentLoginProps {
  onLoginSuccess: (examCode: string, student: Student) => void;
  onBack: () => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  initialCode?: string;
}

export const StudentLogin: React.FC<StudentLoginProps> = ({ onLoginSuccess, onBack, isDarkMode, toggleTheme, initialCode }) => {
  // Logic State
  const [isLoading, setIsLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);

  // UI State
  const [examCode, setExamCode] = useState(initialCode || '');
  const [fullName, setFullName] = useState(() => localStorage.getItem('saved_student_fullname') || '');
  const [studentClass, setStudentClass] = useState(() => localStorage.getItem('saved_student_class') || '');
  const [absentNumber, setAbsentNumber] = useState(() => localStorage.getItem('saved_student_absent') || '');
  
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState<string | null>(null);
  const examCodeInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Auto-fetch config when code changes to determine if dropdown should be used
  useEffect(() => {
    const checkConfig = async () => {
        if (examCode.length === 6) {
            const config = await storageService.getExamConfig(examCode.toUpperCase().trim());
            if (config && config.targetClasses && config.targetClasses.length > 0) {
                setAvailableClasses(config.targetClasses);
                // FIX: Reset kelas jika nilai saat ini tidak ada dalam daftar target
                setStudentClass(prev => {
                    if (prev && !config.targetClasses?.includes(prev)) return '';
                    return prev;
                });
            } else {
                setAvailableClasses([]);
            }
        } else {
            setAvailableClasses([]);
        }
    };
    checkConfig();
  }, [examCode]);

  useEffect(() => {
    // Logic fokus kursor cerdas
    if (initialCode) {
        setTimeout(() => nameInputRef.current?.focus(), 100);
    } else if (fullName && studentClass && absentNumber && examCodeInputRef.current) {
        examCodeInputRef.current.focus();
    }
  }, [initialCode, fullName, studentClass, absentNumber]);

  // STRICTOR NORMALIZATION HELPER
  const normalizeId = (text: string) => {
      return text.trim().toLowerCase().replace(/\s+/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!examCode || !fullName || !studentClass || !absentNumber) {
      setError('Mohon lengkapi semua data identitas.');
      return;
    }

    const cleanExamCode = examCode.toUpperCase().trim();

    // FIX: Validasi ketat kelas target sebelum submit
    if (cleanExamCode.length === 6) {
        try {
            const config = await storageService.getExamConfig(cleanExamCode);
            if (config && config.targetClasses && config.targetClasses.length > 0) {
                if (!config.targetClasses.includes(studentClass.trim())) {
                    setError('Kelas tidak valid. Harap pilih dari daftar kelas yang tersedia.');
                    setAvailableClasses(config.targetClasses);
                    setStudentClass(''); 
                    return;
                }
            }
        } catch (err) {
            // Ignore error here to allow offline/fallback behavior in onLoginSuccess logic
        }
    }

    setError('');

    // Save preference (original text for display)
    localStorage.setItem('saved_student_fullname', fullName.trim());
    localStorage.setItem('saved_student_class', studentClass.trim());
    localStorage.setItem('saved_student_absent', absentNumber.trim());
    
    // COMPOSITE ID NORMALIZATION (THE CORE FIX)
    // We normalize all components to ensure "I Made" and "imade" produce the same ID segment.
    const normName = normalizeId(fullName);
    const normClass = normalizeId(studentClass);
    const normAbsent = normalizeId(absentNumber);
    const compositeId = `${normName}-${normClass}-${normAbsent}`;
    
    const studentData: Student = {
        fullName: fullName.trim(), // Keep original for result sheet
        class: studentClass.trim(),
        absentNumber: absentNumber.trim(),
        studentId: compositeId // This is the PK-safe ID
    };

    setIsLoading(true);

    try {
        const localKey = `exam_local_${cleanExamCode}_${compositeId}`;
        
        // Use IndexedDB helper instead of localStorage directly
        const hasLocalData = await storageService.getLocalProgress(localKey);
        
        // Check session if no local data
        if (!hasLocalData) {
            const remoteResult = await storageService.getStudentResult(cleanExamCode, compositeId);
            if (remoteResult && (remoteResult.status === 'in_progress' || remoteResult.status === 'force_closed')) {
                setIsLocked(true);
                setIsLoading(false);
                return;
            }
        }

        onLoginSuccess(cleanExamCode, studentData);

    } catch (e) {
        console.error("Session check error", e);
        setError("Gagal memeriksa sesi ujian. Periksa koneksi internet.");
        setIsLoading(false);
    }
  };

  const handleUnlockAndResume = async (token: string) => {
      const cleanExamCode = examCode.toUpperCase().trim();
      const normName = normalizeId(fullName);
      const normClass = normalizeId(studentClass);
      const normAbsent = normalizeId(absentNumber);
      const compositeId = `${normName}-${normClass}-${normAbsent}`;
      
      try {
          const verified = await storageService.verifyUnlockToken(cleanExamCode, compositeId, token);
          if (verified) {
             const studentData: Student = {
                fullName: fullName.trim(),
                class: studentClass.trim(),
                absentNumber: absentNumber.trim(),
                studentId: compositeId
             };
             setIsLocked(false);
             onLoginSuccess(cleanExamCode, studentData);
          } else {
             alert("Token salah.");
          }
      } catch(e) {
          alert("Gagal verifikasi token.");
      }
  };

  if (isLocked) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-slate-950 relative overflow-hidden font-sans transition-colors duration-300">
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-gradient-to-br from-rose-50/60 to-orange-50/60 dark:from-rose-900/20 dark:to-orange-900/20 rounded-full blur-[100px] animate-pulse"></div>
            </div>
            <div className="w-full max-w-[420px] px-6 relative z-10">
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.03)] dark:shadow-none border border-white dark:border-slate-800 ring-1 ring-slate-50 dark:ring-slate-800 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-rose-50 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400 rounded-full mb-6 ring-8 ring-rose-50/50 dark:ring-rose-900/20">
                        <LockClosedIcon className="w-10 h-10"/>
                    </div>
                    <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">Sesi Terkunci</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                        Akun Anda ("{fullName}") sedang aktif atau dihentikan paksa.<br/>
                        Masukkan <strong>Token Reset</strong> dari pengawas.
                    </p>
                    <UnlockForm onUnlock={handleUnlockAndResume} onCancel={() => { setIsLocked(false); setIsLoading(false); }} />
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-slate-950 relative overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-800 transition-colors duration-300">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-gradient-to-br from-indigo-50/60 to-purple-50/60 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-full blur-[100px] animate-pulse" style={{animationDuration: '8s'}}></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-gradient-to-tl from-blue-50/60 to-emerald-50/60 dark:from-blue-900/20 dark:to-emerald-900/20 rounded-full blur-[100px] animate-pulse" style={{animationDuration: '10s'}}></div>
        </div>

        {toggleTheme && (
            <div className="absolute top-6 right-6 z-50">
                <button 
                    onClick={toggleTheme} 
                    className="p-2.5 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-md text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm border border-white/20 dark:border-slate-700"
                >
                    {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                </button>
            </div>
        )}

        <div className="w-full max-w-[420px] px-6 relative z-10 flex flex-col h-full sm:h-auto justify-center">
            <button 
                onClick={onBack} 
                className="group self-start flex items-center gap-2 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 mb-6 text-[10px] font-bold uppercase tracking-widest transition-all pl-2 py-2"
            >
                <div className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                     <ArrowLeftIcon className="w-3 h-3" />
                </div>
                <span>Kembali</span>
            </button>
            
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 sm:p-10 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.03)] dark:shadow-black/20 border border-white dark:border-slate-800 ring-1 ring-slate-50 dark:ring-slate-800 animate-gentle-slide">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-white dark:bg-slate-800 shadow-[0_10px_20px_-5px_rgba(79,70,229,0.15)] dark:shadow-none mb-5 text-indigo-600 dark:text-indigo-400 border border-indigo-50 dark:border-slate-700 relative overflow-hidden">
                        <div className="absolute inset-0 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-3xl transform rotate-45 translate-y-8 translate-x-8"></div>
                        <UserIcon className="w-7 h-7 relative z-10" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Selamat Datang</h2>
                    <p className="text-slate-400 dark:text-slate-500 text-sm font-medium mt-2">
                        Siapkan diri untuk ujian hari ini.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    
                    <div className="space-y-4">
                        <div className={`transition-all duration-300 rounded-2xl bg-slate-50 dark:bg-slate-950 border ${isFocused === 'name' ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-500 shadow-[0_4px_20px_-4px_rgba(79,70,229,0.1)] ring-4 ring-indigo-500/5 dark:ring-indigo-500/20' : 'border-transparent dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900'}`}>
                            <div className="px-5 pt-3">
                                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">Nama Lengkap</label>
                                <input
                                    ref={nameInputRef}
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    onFocus={() => setIsFocused('name')}
                                    onBlur={() => setIsFocused(null)}
                                    className="block w-full bg-transparent border-none p-0 pb-3 text-sm font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:ring-0 outline-none"
                                    placeholder="Ketik nama anda..."
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div className={`transition-all duration-300 rounded-2xl bg-slate-50 dark:bg-slate-950 border ${isFocused === 'class' ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-500 shadow-[0_4px_20px_-4px_rgba(79,70,229,0.1)] ring-4 ring-indigo-500/5 dark:ring-indigo-500/20' : 'border-transparent dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900'}`}>
                                <div className="px-5 pt-3">
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">Kelas</label>
                                    
                                    {availableClasses.length > 0 ? (
                                        <div className="relative group">
                                            <select 
                                                value={studentClass} 
                                                onChange={(e) => setStudentClass(e.target.value)}
                                                onFocus={() => setIsFocused('class')}
                                                onBlur={() => setIsFocused(null)}
                                                className="block w-full bg-transparent border-none p-0 pb-3 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-0 outline-none appearance-none cursor-pointer"
                                                required
                                            >
                                                <option value="" disabled className="dark:bg-slate-900">Pilih...</option>
                                                {availableClasses.map(c => <option key={c} value={c} className="dark:bg-slate-900">{c}</option>)}
                                            </select>
                                            <div className="absolute right-0 top-0 text-slate-400 pointer-events-none">
                                                <ChevronDownIcon className="w-4 h-4"/>
                                            </div>
                                        </div>
                                    ) : (
                                        <input
                                            type="text"
                                            value={studentClass}
                                            onChange={(e) => setStudentClass(e.target.value)}
                                            onFocus={() => setIsFocused('class')}
                                            onBlur={() => setIsFocused(null)}
                                            className="block w-full bg-transparent border-none p-0 pb-3 text-sm font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:ring-0 outline-none"
                                            placeholder="Contoh: 9A"
                                            required
                                        />
                                    )}
                                </div>
                            </div>

                             <div className={`transition-all duration-300 rounded-2xl bg-slate-50 dark:bg-slate-950 border ${isFocused === 'absent' ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-500 shadow-[0_4px_20px_-4px_rgba(79,70,229,0.1)] ring-4 ring-indigo-500/5 dark:ring-indigo-500/20' : 'border-transparent dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900'}`}>
                                <div className="px-5 pt-3">
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">No. Absen</label>
                                    <input
                                        type="text"
                                        value={absentNumber}
                                        onChange={(e) => setAbsentNumber(e.target.value)}
                                        onFocus={() => setIsFocused('absent')}
                                        onBlur={() => setIsFocused(null)}
                                        className="block w-full bg-transparent border-none p-0 pb-3 text-sm font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:ring-0 outline-none text-center"
                                        placeholder="00"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 py-2">
                        <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1"></div>
                        <div className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">Akses Ujian</div>
                        <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1"></div>
                    </div>

                    <div className={`relative group transition-all duration-300 ${isFocused === 'code' ? 'scale-[1.02]' : ''}`}>
                        <div className={`absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl opacity-0 group-hover:opacity-20 transition duration-500 blur ${isFocused === 'code' ? 'opacity-30' : ''}`}></div>
                        <div className={`relative bg-white dark:bg-slate-900 rounded-2xl p-1.5 flex items-center shadow-sm border transition-colors ${isFocused === 'code' ? 'border-indigo-100 dark:border-indigo-500' : 'border-slate-100 dark:border-slate-800'}`}>
                           <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-indigo-500 dark:text-indigo-400 shrink-0">
                              <QrCodeIcon className="w-6 h-6" />
                           </div>
                           <div className="h-8 w-px bg-slate-100 dark:bg-slate-800 mx-2"></div>
                           <input
                                ref={examCodeInputRef}
                                type="text"
                                value={examCode}
                                onChange={(e) => setExamCode(e.target.value)}
                                onFocus={() => setIsFocused('code')}
                                onBlur={() => setIsFocused(null)}
                                className="w-full bg-transparent py-3 text-center font-code text-xl font-bold tracking-[0.25em] text-slate-800 dark:text-slate-100 placeholder:text-slate-200 dark:placeholder:text-slate-700 outline-none uppercase"
                                placeholder="KODE"
                                autoComplete="off"
                                maxLength={6}
                                required
                           />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-medium animate-fast-fade">
                            <div className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-rose-100 dark:bg-rose-800 flex items-center justify-center text-rose-500 dark:text-rose-300 font-bold">!</div>
                            <p>{error}</p>
                        </div>
                    )}
                    
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-bold text-sm h-[56px] rounded-2xl hover:bg-black dark:hover:bg-indigo-700 hover:shadow-xl hover:shadow-slate-200 dark:hover:shadow-indigo-900/30 transition-all active:scale-[0.98] mt-6 flex items-center justify-center gap-3 group relative overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <span className="relative z-10">Memproses...</span>
                                <div className="absolute inset-0 bg-slate-800 dark:bg-indigo-700"></div>
                            </>
                        ) : (
                            <>
                                <span className="relative z-10">Mulai Mengerjakan</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-600 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                                <CheckCircleIcon className="w-4 h-4 text-emerald-400 dark:text-emerald-200 group-hover:text-emerald-300 transition-colors relative z-10" />
                            </>
                        )}
                    </button>
                </form>
            </div>
            
            <div className="mt-8 text-center">
                <p className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em]">Platform Ujian Cerdas</p>
            </div>
        </div>
    </div>
  );
};

const UnlockForm: React.FC<{ onUnlock: (token: string) => void; onCancel: () => void }> = ({ onUnlock, onCancel }) => {
    const [token, setToken] = useState('');
    return (
        <form onSubmit={(e) => { e.preventDefault(); onUnlock(token); }} className="space-y-4">
            <input 
                type="text" 
                value={token} 
                onChange={e => setToken(e.target.value)} 
                className="w-full text-center text-2xl font-mono font-black tracking-[0.3em] py-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl focus:border-rose-400 dark:focus:border-rose-500 focus:bg-white dark:focus:bg-slate-900 outline-none uppercase transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-700" 
                placeholder="TOKEN" 
                maxLength={6} 
            />
            <div className="flex gap-3">
                <button type="button" onClick={onCancel} className="flex-1 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors uppercase tracking-wide">Batal</button>
                <button type="submit" className="flex-[2] py-3.5 text-xs font-bold text-white bg-rose-500 rounded-xl hover:bg-rose-600 shadow-lg shadow-rose-200 dark:shadow-rose-900/30 transition-all uppercase tracking-wide">Buka Akses</button>
            </div>
        </form>
    );
};
