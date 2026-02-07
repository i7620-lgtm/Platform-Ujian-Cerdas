
import React, { useState } from 'react';
import { LogoIcon, UserIcon, ArrowLeftIcon, LockClosedIcon } from './Icons';
import type { Student } from '../types';
import { storageService } from '../services/storage';

interface StudentLoginProps {
  onLoginSuccess: (examCode: string, student: Student) => void;
  onBack: () => void;
}

export const StudentLogin: React.FC<StudentLoginProps> = ({ onLoginSuccess, onBack }) => {
  const [examCode, setExamCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [className, setClassName] = useState('');
  const [absentNumber, setAbsentNumber] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoadingCheck, setIsLoadingCheck] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const cleanExamCode = examCode.toUpperCase().trim();
    if (!cleanExamCode || !fullName || !className || !absentNumber) {
        alert("Mohon lengkapi semua data.");
        return;
    }

    // Standardized ID construction
    const compositeId = `${fullName.trim()}-${className.trim()}-${absentNumber.trim()}`;
    const studentData: Student = {
        fullName: fullName.trim(),
        class: className.trim(),
        absentNumber: absentNumber.trim(),
        studentId: compositeId
    };

    setIsLoading(true);
    setIsLoadingCheck(true);

    // Session Check Logic
    try {
        const localKey = `exam_local_${cleanExamCode}_${compositeId}`;
        const hasLocalData = localStorage.getItem(localKey);
        
        // Security Check: If no local data found (New Device/Incognito), check Server Status
        if (!hasLocalData) {
            const remoteResult = await storageService.getStudentResult(cleanExamCode, compositeId);
            // Check for both 'in_progress' AND 'force_closed' to allow token unlock in login screen
            if (remoteResult && (remoteResult.status === 'in_progress' || remoteResult.status === 'force_closed')) {
                // Session exists on another device OR was locked -> Lock it
                setIsLocked(true);
                setIsLoadingCheck(false);
                setIsLoading(false);
                return;
            }
        }

        // If not locked or clean session
        onLoginSuccess(cleanExamCode, studentData);

    } catch (e) {
        console.error("Session check error", e);
        alert("Gagal memeriksa sesi ujian. Periksa koneksi internet.");
        setIsLoading(false);
    } finally {
        setIsLoadingCheck(false);
    }
  };

  const handleUnlockAndResume = async (token: string) => {
      const cleanExamCode = examCode.toUpperCase().trim();
      const compositeId = `${fullName.trim()}-${className.trim()}-${absentNumber.trim()}`;
      
      // Return promise to allow button loading state
      return storageService.verifyUnlockToken(cleanExamCode, compositeId, token)
        .then((verified) => {
            if (verified) {
                // Construct data again
                const studentData: Student = {
                    fullName: fullName.trim(),
                    class: className.trim(),
                    absentNumber: absentNumber.trim(),
                    studentId: compositeId
                };
                
                // DIRECT RESUME: Bypass login form
                // Panggil onLoginSuccess langsung karena status di DB sudah 'in_progress'
                onLoginSuccess(cleanExamCode, studentData);
            } else {
                alert("Token salah.");
                throw new Error("Invalid token");
            }
        })
        .catch((e) => {
            if (e.message !== "Invalid token") alert("Gagal verifikasi token.");
            throw e;
        });
  };

  if (isLocked) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-rose-50 p-6 font-sans">
              <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm text-center border border-rose-100 animate-fade-in">
                  <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <LockClosedIcon className="w-8 h-8"/>
                  </div>
                  <h2 className="text-xl font-black text-slate-800 mb-2">Sesi Aktif Terdeteksi</h2>
                  <p className="text-sm text-slate-500 mb-6">
                      Akun ini sedang mengerjakan ujian di perangkat lain atau terkunci.
                      <br/>Minta <strong>Token Reset</strong> ke pengawas untuk melanjutkan di sini.
                  </p>
                  <UnlockForm onUnlock={handleUnlockAndResume} onCancel={() => { setIsLocked(false); setIsLoading(false); }} />
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md animate-fade-in">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 mb-8 font-bold transition-colors text-xs uppercase tracking-widest">
                <ArrowLeftIcon className="w-4 h-4" /> Kembali
            </button>
            
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white">
                <div className="text-center mb-8">
                    <div className="inline-flex p-3 bg-indigo-50 rounded-2xl mb-4 text-indigo-600">
                        <UserIcon className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Login Siswa</h2>
                    <p className="text-slate-400 text-sm font-medium">Masukkan data diri untuk memulai ujian.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kode Ujian</label>
                        <input 
                            type="text" 
                            value={examCode}
                            onChange={(e) => setExamCode(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-200 focus:bg-white rounded-2xl outline-none mt-1.5 text-lg font-black text-indigo-600 tracking-widest placeholder:text-slate-300 uppercase text-center transition-all"
                            placeholder="XXXXXX"
                            maxLength={6}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                            <input 
                                type="text" 
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-200 focus:bg-white rounded-2xl outline-none mt-1.5 text-sm font-bold text-slate-700 placeholder:text-slate-300 transition-all"
                                placeholder="Nama sesuai absen"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kelas</label>
                            <select 
                                value={className}
                                onChange={(e) => setClassName(e.target.value)}
                                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-200 focus:bg-white rounded-2xl outline-none mt-1.5 text-sm font-bold text-slate-700 transition-all cursor-pointer appearance-none"
                                required
                            >
                                <option value="" disabled>Pilih...</option>
                                <option value="X-A">X-A</option>
                                <option value="X-B">X-B</option>
                                <option value="XI-A">XI-A</option>
                                <option value="XI-B">XI-B</option>
                                <option value="XII-A">XII-A</option>
                                <option value="XII-B">XII-B</option>
                                <option value="UMUM">UMUM</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">No. Absen</label>
                            <input 
                                type="text" 
                                value={absentNumber}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    if(val.length <= 3) setAbsentNumber(val);
                                }}
                                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-200 focus:bg-white rounded-2xl outline-none mt-1.5 text-sm font-bold text-slate-700 placeholder:text-slate-300 transition-all text-center"
                                placeholder="00"
                                required
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-indigo-600 text-white font-black text-sm uppercase tracking-widest py-4.5 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-[0.98] disabled:opacity-70 mt-4"
                    >
                        {isLoading ? 'Memproses...' : 'Masuk Ujian'}
                    </button>
                </form>
            </div>
            
            <p className="text-center mt-8 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                UjianCerdas • Secure Exam Browser
            </p>
        </div>
    </div>
  );
};

// Updated UnlockForm with Loading State
const UnlockForm: React.FC<{ onUnlock: (token: string) => Promise<void>; onCancel: () => void }> = ({ onUnlock, onCancel }) => {
    const [token, setToken] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onUnlock(token);
        } catch (error) {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleUnlock} className="space-y-3">
            <input 
                type="text" 
                value={token} 
                onChange={e => setToken(e.target.value)} 
                className="w-full text-center text-lg font-mono font-bold tracking-[0.2em] py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-rose-400 focus:bg-white outline-none uppercase transition-all" 
                placeholder="TOKEN" 
                maxLength={6} 
                disabled={isSubmitting}
            />
            <div className="flex gap-2">
                <button type="button" onClick={onCancel} disabled={isSubmitting} className="flex-1 py-3 text-xs font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 disabled:opacity-50">Batal</button>
                <button type="submit" disabled={isSubmitting || token.length < 4} className="flex-1 py-3 text-xs font-bold text-white bg-rose-500 rounded-xl hover:bg-rose-600 shadow-lg shadow-rose-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
                    {isSubmitting ? 'Memproses...' : 'Buka'}
                </button>
            </div>
        </form>
    );
};
