
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeftIcon, UserIcon, QrCodeIcon, CheckCircleIcon, LockClosedIcon, SunIcon, MoonIcon, ChevronDownIcon, XMarkIcon } from './Icons';
import type { Student } from '../types';
import { storageService } from '../services/storage';

interface StudentLoginProps {
  onLoginSuccess: (examCode: string, student: Student) => void;
  onBack: () => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  initialCode?: string;
}

// Helper to parse "ClassName(Limit)" format
const parseClassConfig = (classString: string) => {
    const match = classString.match(/^(.+?)(?:\((\d+)\))?$/);
    if (match) {
        return {
            name: match[1].trim(),
            limit: match[2] ? parseInt(match[2], 10) : null
        };
    }
    return { name: classString, limit: null };
};

const QrScannerModal: React.FC<{ onScanSuccess: (text: string) => void; onClose: () => void }> = ({ onScanSuccess, onClose }) => {
    const scannerRef = useRef<any>(null);

    useEffect(() => {
        let isMounted = true;
        
        const initScanner = async () => {
            try {
                // Load from CDN to avoid build-time resolution issues with the package
                if (!(window as any).Html5Qrcode) {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement("script");
                        script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
                        script.async = true;
                        script.onload = resolve;
                        script.onerror = () => reject(new Error("Failed to load QR scanner script"));
                        document.body.appendChild(script);
                    });
                }
                
                if (!isMounted) return;

                // Access global variable
                const Html5Qrcode = (window as any).Html5Qrcode;
                if (!Html5Qrcode) throw new Error("Html5Qrcode not found");

                const html5QrCode = new Html5Qrcode("reader", false);
                scannerRef.current = html5QrCode;
                
                // Remove qrbox to prevent the library from rendering the white bracket overlay
                const config = { fps: 10 };
                
                await html5QrCode.start(
                    { facingMode: "environment" }, 
                    config, 
                    (decodedText: string) => {
                        if (isMounted) onScanSuccess(decodedText);
                    },
                    (errorMessage: any) => {
                        // ignore parse errors
                    }
                );
            } catch (err) {
                console.error("Error starting scanner", err);
                if (isMounted) {
                    alert("Gagal memuat pemindai kamera. Pastikan koneksi internet stabil.");
                    onClose();
                }
            }
        };

        // Small delay to ensure DOM is ready
        const timer = setTimeout(initScanner, 100);

        return () => {
            isMounted = false;
            clearTimeout(timer);
            if (scannerRef.current) {
                // Use catch to ignore errors during stop if it wasn't fully started
                scannerRef.current.stop().then(() => {
                    try { scannerRef.current?.clear(); } catch(e) {}
                }).catch((e: any) => console.log("Stop failed", e));
            }
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-fade-in">
             <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-2xl w-full max-w-sm relative animate-slide-in-up border border-white dark:border-slate-700">
                 <h3 className="text-center font-black text-slate-800 dark:text-white mb-4 text-lg">Pindai QR Code</h3>
                 <div className="relative rounded-2xl overflow-hidden bg-black aspect-square shadow-inner">
                    <div id="reader" className="w-full h-full"></div>
                    {/* Scanning Line Animation */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="w-full h-0.5 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,1)] animate-[scan_2s_ease-in-out_infinite]"></div>
                        <style>{`
                            @keyframes scan {
                                0% { transform: translateY(0); opacity: 0; }
                                10% { opacity: 1; }
                                90% { opacity: 1; }
                                100% { transform: translateY(100%); opacity: 0; }
                            }
                        `}</style>
                    </div>
                 </div>
                 <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-4 font-medium">
                    Arahkan kamera ke QR Code ujian.<br/>
                    Pastikan cahaya cukup terang.
                 </p>
                 <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                    <XMarkIcon className="w-5 h-5" />
                 </button>
             </div>
        </div>
    );
};

export const StudentLogin: React.FC<StudentLoginProps> = ({ onLoginSuccess, onBack, isDarkMode, toggleTheme, initialCode }) => {
  // Logic State
  const [isLoading, setIsLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);

  // UI State
  const [examCode, setExamCode] = useState(initialCode || '');
  const [fullName, setFullName] = useState(() => localStorage.getItem('saved_student_fullname') || '');
  const [studentClass, setStudentClass] = useState(() => localStorage.getItem('saved_student_class') || '');
  const [absentNumber, setAbsentNumber] = useState(() => localStorage.getItem('saved_student_absent') || '');
  
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState<string | null>(null);
  const examCodeInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Derived state for absent limit
  const { limit: absentLimit } = parseClassConfig(studentClass);

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
    } else {
        // Cek localStorage langsung untuk menghindari dependency cycle
        const savedName = localStorage.getItem('saved_student_fullname');
        const savedClass = localStorage.getItem('saved_student_class');
        const savedAbsent = localStorage.getItem('saved_student_absent');
        
        if (savedName && savedClass && savedAbsent && examCodeInputRef.current) {
            examCodeInputRef.current.focus();
        }
    }
  }, [initialCode]);

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
    
    // Parse class name (remove limit if present) for ID and Data
    const { name: cleanClassName } = parseClassConfig(studentClass);

    // COMPOSITE ID NORMALIZATION (FIXED: Removing Name from ID)
    // ID hanya bergantung pada Kelas dan No Absen agar unik per kursi
    const normClass = normalizeId(cleanClassName);
    const normAbsent = normalizeId(absentNumber);
    const compositeId = `${normClass}-${normAbsent}`;
    
    const studentData: Student = {
        fullName: fullName.trim(), // Keep original for result sheet
        class: cleanClassName,
        absentNumber: absentNumber.trim(),
        studentId: compositeId // This is the PK-safe ID
    };

    setIsLoading(true);

    try {
        const localKey = `exam_local_${cleanExamCode}_${compositeId}`;
        
        // Use IndexedDB helper instead of localStorage directly
        const hasLocalData = await storageService.getLocalProgress(localKey);
        
        // VALIDASI UTAMA: Cek data remote (server) terlebih dahulu untuk memastikan kepemilikan kursi
        const remoteResult = await storageService.getStudentResult(cleanExamCode, compositeId);
        
        if (remoteResult) {
            // Jika data server ada, validasi apakah nama yang dimasukkan cocok dengan yang tersimpan
            const storedName = normalizeId(remoteResult.student.fullName);
            const inputName = normalizeId(fullName);
            
            // Logika cek: Toleransi kesamaan nama (case insensitive & ignore spaces)
            // Mengizinkan jika nama input mengandung nama tersimpan atau sebaliknya (untuk typo/singkatan)
            const isNameMatch = storedName === inputName || storedName.includes(inputName) || inputName.includes(storedName);
            
            if (!isNameMatch) {
                // BUG FIX: Pesan error spesifik sesuai permintaan
                setError(`Sudah ada orang lain yang menggunakan kelas dan absen tersebut (dengan nama: ${remoteResult.student.fullName}, kelas: ${remoteResult.student.class}, dan absen: ${absentNumber}).`);
                setIsLoading(false);
                return;
            }

            // Jika nama cocok tapi statusnya sedang berlangsung atau terkunci
            if (!hasLocalData && (remoteResult.status === 'in_progress' || remoteResult.status === 'force_closed')) {
                setIsLocked(true);
                setIsLoading(false);
                return;
            }
        }

        // Jika lolos validasi atau data baru, lanjutkan login
        onLoginSuccess(cleanExamCode, studentData);

    } catch (e) {
        console.error("Session check error", e);
        setError("Gagal memeriksa sesi ujian. Periksa koneksi internet.");
        setIsLoading(false);
    }
  };

  const handleUnlockAndResume = async (token: string) => {
      const cleanExamCode = examCode.toUpperCase().trim();
      
      // Parse class name (remove limit if present)
      const { name: cleanClassName } = parseClassConfig(studentClass);

      // ID Fix: Konsisten dengan handleSubmit, tanpa nama
      const normClass = normalizeId(cleanClassName);
      const normAbsent = normalizeId(absentNumber);
      const compositeId = `${normClass}-${normAbsent}`;
      
      try {
          const verified = await storageService.verifyUnlockToken(cleanExamCode, compositeId, token);
          if (verified) {
             const studentData: Student = {
                fullName: fullName.trim(),
                class: cleanClassName,
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
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#FAFAFA] dark:bg-slate-950 relative font-sans transition-colors duration-300">
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-gradient-to-br from-rose-50/60 to-orange-50/60 dark:from-rose-900/20 dark:to-orange-900/20 rounded-full blur-[100px] animate-pulse"></div>
            </div>
            <div className="w-full max-w-[420px] px-4 relative z-10 py-10 my-auto">
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.03)] dark:shadow-none border border-white dark:border-slate-800 ring-1 ring-slate-50 dark:ring-slate-800 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-50 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400 rounded-full mb-4 ring-8 ring-rose-50/50 dark:ring-rose-900/20">
                        <LockClosedIcon className="w-8 h-8"/>
                    </div>
                    <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">Sesi Terkunci</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                        Akun "{fullName}" (Kelas {studentClass}, No {absentNumber}) sedang aktif atau dihentikan paksa.<br/>
                        Masukkan <strong>Token Reset</strong> dari pengawas.
                    </p>
                    <UnlockForm onUnlock={handleUnlockAndResume} onCancel={() => { setIsLocked(false); setIsLoading(false); }} />
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#FAFAFA] dark:bg-slate-950 relative font-sans selection:bg-indigo-100 selection:text-indigo-800 transition-colors duration-300">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
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

        <div className="w-full max-w-[420px] px-4 relative z-10 flex flex-col sm:h-auto justify-center py-10 my-auto">
            <button 
                onClick={onBack} 
                className="group self-start flex items-center gap-2 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 mb-4 text-[10px] font-bold uppercase tracking-widest transition-all pl-2 py-2"
            >
                <div className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                     <ArrowLeftIcon className="w-3 h-3" />
                </div>
                <span>Kembali</span>
            </button>
            
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.03)] dark:shadow-black/20 border border-white dark:border-slate-800 ring-1 ring-slate-50 dark:ring-slate-800 animate-gentle-slide">
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-[0_10px_20px_-5px_rgba(79,70,229,0.15)] dark:shadow-none mb-3 text-indigo-600 dark:text-indigo-400 border border-indigo-50 dark:border-slate-700 relative overflow-hidden">
                        <div className="absolute inset-0 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-2xl transform rotate-45 translate-y-6 translate-x-6"></div>
                        <UserIcon className="w-6 h-6 relative z-10" />
                    </div>
                    <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Selamat Datang</h2>
                    <p className="text-slate-400 dark:text-slate-500 text-xs font-medium mt-1">
                        Siapkan diri untuk ujian hari ini.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    
                    <div className="space-y-3">
                        <div className={`transition-all duration-300 rounded-xl bg-slate-50 dark:bg-slate-950 border ${isFocused === 'name' ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-500 shadow-[0_4px_20px_-4px_rgba(79,70,229,0.1)] ring-4 ring-indigo-500/5 dark:ring-indigo-500/20' : 'border-transparent dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900'}`}>
                            <div className="px-4 pt-2">
                                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">Nama Lengkap</label>
                                <input
                                    ref={nameInputRef}
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    onFocus={() => setIsFocused('name')}
                                    onBlur={() => setIsFocused(null)}
                                    className="block w-full bg-transparent border-none p-0 pb-2 text-sm font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:ring-0 outline-none"
                                    placeholder="Ketik nama anda..."
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                             <div className={`transition-all duration-300 rounded-xl bg-slate-50 dark:bg-slate-950 border ${isFocused === 'class' ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-500 shadow-[0_4px_20px_-4px_rgba(79,70,229,0.1)] ring-4 ring-indigo-500/5 dark:ring-indigo-500/20' : 'border-transparent dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900'}`}>
                                <div className="px-4 pt-2">
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">Kelas</label>
                                    
                                    {availableClasses.length > 0 ? (
                                        <div className="relative group">
                                            <select 
                                                value={studentClass} 
                                                onChange={(e) => setStudentClass(e.target.value)}
                                                onFocus={() => setIsFocused('class')}
                                                onBlur={() => setIsFocused(null)}
                                                className="block w-full bg-transparent border-none p-0 pb-2 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-0 outline-none appearance-none cursor-pointer"
                                                required
                                            >
                                                <option value="" disabled className="dark:bg-slate-900">Pilih...</option>
                                                {availableClasses.map(c => {
                                                    const { name } = parseClassConfig(c);
                                                    return <option key={c} value={c} className="dark:bg-slate-900">{name}</option>;
                                                })}
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
                                            className="block w-full bg-transparent border-none p-0 pb-2 text-sm font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:ring-0 outline-none"
                                            placeholder="Contoh: 9A"
                                            required
                                        />
                                    )}
                                </div>
                            </div>

                             <div className={`transition-all duration-300 rounded-xl bg-slate-50 dark:bg-slate-950 border ${isFocused === 'absent' ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-500 shadow-[0_4px_20px_-4px_rgba(79,70,229,0.1)] ring-4 ring-indigo-500/5 dark:ring-indigo-500/20' : 'border-transparent dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900'}`}>
                                <div className="px-4 pt-2">
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">No. Absen</label>
                                    {absentLimit && absentLimit > 0 ? (
                                        <div className="relative group">
                                            <select
                                                value={absentNumber}
                                                onChange={(e) => setAbsentNumber(e.target.value)}
                                                onFocus={() => setIsFocused('absent')}
                                                onBlur={() => setIsFocused(null)}
                                                className="block w-full bg-transparent border-none p-0 pb-2 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-0 outline-none appearance-none cursor-pointer text-center"
                                                required
                                            >
                                                <option value="" disabled className="dark:bg-slate-900">No...</option>
                                                {Array.from({ length: absentLimit }, (_, i) => i + 1).map(num => (
                                                    <option key={num} value={num.toString()} className="dark:bg-slate-900">{num}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-0 top-0 text-slate-400 pointer-events-none">
                                                <ChevronDownIcon className="w-4 h-4"/>
                                            </div>
                                        </div>
                                    ) : (
                                        <input
                                            type="text"
                                            value={absentNumber}
                                            onChange={(e) => setAbsentNumber(e.target.value)}
                                            onFocus={() => setIsFocused('absent')}
                                            onBlur={() => setIsFocused(null)}
                                            className="block w-full bg-transparent border-none p-0 pb-2 text-sm font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:ring-0 outline-none text-center"
                                            placeholder="00"
                                            required
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 py-1">
                        <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1"></div>
                        <div className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">Akses Ujian</div>
                        <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1"></div>
                    </div>

                    <div className={`relative group transition-all duration-300 ${isFocused === 'code' ? 'scale-[1.02]' : ''}`}>
                        <div className={`absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl opacity-0 group-hover:opacity-20 transition duration-500 blur ${isFocused === 'code' ? 'opacity-30' : ''}`}></div>
                        <div className={`relative bg-white dark:bg-slate-900 rounded-xl p-1 flex items-center shadow-sm border transition-colors ${isFocused === 'code' ? 'border-indigo-100 dark:border-indigo-500' : 'border-slate-100 dark:border-slate-800'}`}>
                           <button 
                                type="button"
                                onClick={() => setIsQrScannerOpen(true)}
                                className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800 text-indigo-500 dark:text-indigo-400 shrink-0 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors cursor-pointer active:scale-95"
                                title="Pindai QR Code"
                           >
                              <QrCodeIcon className="w-5 h-5" />
                           </button>
                           <div className="h-6 w-px bg-slate-100 dark:bg-slate-800 mx-2"></div>
                           <input
                                ref={examCodeInputRef}
                                type="text"
                                value={examCode}
                                onChange={(e) => setExamCode(e.target.value)}
                                onFocus={() => setIsFocused('code')}
                                onBlur={() => setIsFocused(null)}
                                className="w-full bg-transparent py-2 text-center font-code text-lg font-bold tracking-[0.25em] text-slate-800 dark:text-slate-100 placeholder:text-slate-200 dark:placeholder:text-slate-700 outline-none uppercase"
                                placeholder="KODE"
                                autoComplete="off"
                                maxLength={6}
                                required
                           />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-medium animate-fast-fade">
                            <div className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-rose-100 dark:bg-rose-800 flex items-center justify-center text-rose-500 dark:text-rose-300 font-bold">!</div>
                            <p>{error}</p>
                        </div>
                    )}
                    
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-bold text-sm h-[48px] rounded-xl hover:bg-black dark:hover:bg-indigo-700 hover:shadow-xl hover:shadow-slate-200 dark:hover:shadow-indigo-900/30 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-3 group relative overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed"
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
            
            <div className="mt-4 text-center">
                <p className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em]">Platform Ujian Cerdas</p>
            </div>
        </div>

        {isQrScannerOpen && (
            <QrScannerModal 
                onScanSuccess={(text) => {
                    let code = text;
                    try {
                        const url = new URL(text);
                        const joinCode = url.searchParams.get('join');
                        if (joinCode) code = joinCode;
                    } catch (e) {}
                    setExamCode(code);
                    setIsQrScannerOpen(false);
                }} 
                onClose={() => setIsQrScannerOpen(false)} 
            />
        )}
    </div>
  );
};

const UnlockForm: React.FC<{ onUnlock: (token: string) => void; onCancel: () => void }> = ({ onUnlock, onCancel }) => {
    const [token, setToken] = useState('');
    return (
        <form onSubmit={(e) => { e.preventDefault(); onUnlock(token); }} className="space-y-3">
            <input 
                type="text" 
                value={token} 
                onChange={e => setToken(e.target.value)} 
                className="w-full text-center text-xl font-mono font-black tracking-[0.3em] py-3 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl focus:border-rose-400 dark:focus:border-rose-500 focus:bg-white dark:focus:bg-slate-900 outline-none uppercase transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-700" 
                placeholder="TOKEN" 
                maxLength={6} 
            />
            <div className="flex gap-3">
                <button type="button" onClick={onCancel} className="flex-1 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors uppercase tracking-wide">Batal</button>
                <button type="submit" className="flex-[2] py-3 text-xs font-bold text-white bg-rose-500 rounded-xl hover:bg-rose-600 shadow-lg shadow-rose-200 dark:shadow-rose-900/30 transition-all uppercase tracking-wide">Buka Akses</button>
            </div>
        </form>
    );
};
