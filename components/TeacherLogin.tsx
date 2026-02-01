import React, { useState } from 'react';
import { UserIcon, ArrowLeftIcon } from './Icons';
import type { TeacherProfile } from '../types';
import { storageService } from '../services/storage';

interface TeacherLoginProps {
  onLoginSuccess: (profile: TeacherProfile) => void;
  onBack: () => void;
}

export const TeacherLogin: React.FC<TeacherLoginProps> = ({ onLoginSuccess, onBack }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [school, setSchool] = useState('');
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); 
    
    if (isRegistering && (!fullName || !school)) {
        setError("Nama Lengkap dan Sekolah wajib diisi.");
        return;
    }

    setIsLoading(true);
    
    try {
        let profile: TeacherProfile;
        if (isRegistering) {
            profile = await storageService.signUpWithEmail(email, password, fullName, school);
        } else {
            profile = await storageService.signInWithEmail(email, password);
        }
        onLoginSuccess(profile);
    } catch (e: any) { 
        setError(e.message || 'Terjadi kesalahan sistem.'); 
    } finally { 
        setIsLoading(false); 
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-[#EEF2FF] font-sans selection:bg-indigo-100 selection:text-indigo-900">
        <div className="w-full max-w-[440px] animate-fade-in flex flex-col">
            <button onClick={onBack} className="group flex items-center gap-2 text-slate-400 hover:text-indigo-600 mb-8 font-bold transition-all self-start text-xs uppercase tracking-widest">
                <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> 
                Kembali
            </button>
            
            <div className="bg-white p-10 rounded-[2.5rem] shadow-[0_15px_50px_-15px_rgba(79,70,229,0.1)] border border-white text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-600 to-blue-500"></div>
                
                <div className="flex justify-center mb-8">
                    <div className="bg-indigo-50 p-4 rounded-3xl border border-indigo-100">
                        <UserIcon className="w-10 h-10 text-indigo-600" />
                    </div>
                </div>

                <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">
                    {isRegistering ? 'Daftar Pengajar' : 'Area Pengajar'}
                </h2>
                <p className="text-slate-400 text-sm mb-10 font-medium">
                    {isRegistering ? 'Daftar untuk mengelola ujian Anda.' : 'Masuk untuk mengelola ujian dan data siswa.'}
                </p>
                
                <form onSubmit={handleAuthAction} className="space-y-5 text-left mt-6">
                    {isRegistering && (
                        <div className="space-y-5">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                                <input 
                                    type="text" 
                                    value={fullName} 
                                    onChange={(e) => setFullName(e.target.value)} 
                                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-200 focus:bg-white rounded-2xl outline-none mt-1.5 text-sm font-bold text-slate-700 transition-all placeholder:text-slate-300" 
                                    placeholder="Contoh: Budi Santoso, S.Pd"
                                    required 
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Sekolah</label>
                                <input 
                                    type="text" 
                                    value={school} 
                                    onChange={(e) => setSchool(e.target.value)} 
                                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-200 focus:bg-white rounded-2xl outline-none mt-1.5 text-sm font-bold text-slate-700 transition-all placeholder:text-slate-300" 
                                    placeholder="Contoh: SMA Negeri 1 Jakarta"
                                    required 
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                        <input 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-200 focus:bg-white rounded-2xl outline-none mt-1.5 text-sm font-bold text-slate-700 transition-all placeholder:text-slate-300" 
                            required 
                            disabled={isLoading} 
                            placeholder="email@sekolah.id"
                        />
                    </div>
                    
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-200 focus:bg-white rounded-2xl outline-none mt-1.5 text-sm font-bold text-slate-700 transition-all placeholder:text-slate-300" 
                            required 
                            disabled={isLoading} 
                            placeholder="••••••••"
                        />
                    </div>
                    
                    {error && (
                        <div className="text-rose-500 text-xs bg-rose-50 p-4 rounded-2xl text-center font-bold border border-rose-100 animate-shake">
                            {error}
                        </div>
                    )}
                    
                    <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 text-white font-black text-sm uppercase tracking-widest py-4.5 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-[0.98] disabled:opacity-50 mt-4 h-[56px] flex items-center justify-center">
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        ) : (isRegistering ? 'Daftar' : 'Masuk')}
                    </button>
                </form>

                <div className="mt-10 pt-6 border-t border-slate-50">
                    <button 
                        type="button"
                        onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 tracking-wide uppercase transition-colors"
                    >
                        {isRegistering ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar Baru'}
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};
 
