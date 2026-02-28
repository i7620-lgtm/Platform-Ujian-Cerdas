
import React, { useState } from 'react';
import { UserIcon, ArrowLeftIcon, EyeIcon, EyeSlashIcon, SunIcon, MoonIcon } from './Icons';
import type { TeacherProfile } from '../types';
import { storageService } from '../services/storage';
import { supabase } from '../lib/supabase';

interface TeacherLoginProps {
  onLoginSuccess: (profile: TeacherProfile) => void;
  onBack: () => void;
  onViewTerms?: () => void;
  onViewPrivacy?: () => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
}

export const TeacherLogin: React.FC<TeacherLoginProps> = ({ onLoginSuccess, onBack, onViewTerms, onViewPrivacy, isDarkMode, toggleTheme }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [school, setSchool] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); 
    
    if (isRegistering) {
        if (!fullName || !school) {
            setError("Nama Lengkap dan Sekolah wajib diisi.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Konfirmasi password tidak cocok.");
            return;
        }
        if (!agreedToTerms) {
            setError("Anda harus menyetujui Syarat & Ketentuan serta Kebijakan Privasi.");
            return;
        }
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

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setPassword('');
    setConfirmPassword('');
    if (!isRegistering) {
        setAgreedToTerms(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#EEF2FF] dark:bg-slate-950 font-sans selection:bg-indigo-100 selection:text-indigo-900 transition-colors duration-300 relative overflow-y-auto">
        {/* Theme Toggle Top Right */}
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

        <div className="w-full max-w-[440px] animate-fade-in flex flex-col p-6 my-auto">
            <button onClick={onBack} className="group flex items-center gap-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4 font-bold transition-all self-start text-xs uppercase tracking-widest">
                <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> 
                Kembali
            </button>
            
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-[0_15px_50px_-15px_rgba(79,70,229,0.1)] dark:shadow-black/30 border border-white dark:border-slate-800 text-center relative overflow-hidden transition-colors duration-300">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-600 to-blue-500"></div>
                
                <div className="flex justify-center mb-6">
                    <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                        <UserIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                    </div>
                </div>

                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                    {isRegistering ? 'Daftar Pengajar' : 'Area Pengajar'}
                </h2>
                <p className="text-slate-400 dark:text-slate-500 text-xs mb-6 font-medium">
                    {isRegistering ? 'Daftar untuk mengelola ujian Anda.' : 'Masuk untuk mengelola ujian dan data siswa.'}
                </p>
                
                <form onSubmit={handleAuthAction} className="space-y-3 text-left mt-4">
                    {isRegistering && (
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nama Lengkap</label>
                                <input 
                                    type="text" 
                                    value={fullName} 
                                    onChange={(e) => setFullName(e.target.value)} 
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-200 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl outline-none mt-1 text-sm font-bold text-slate-700 dark:text-slate-200 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600" 
                                    placeholder="Contoh: Budi Santoso, S.Pd"
                                    required 
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nama Sekolah</label>
                                <input 
                                    type="text" 
                                    value={school} 
                                    onChange={(e) => setSchool(e.target.value)} 
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-200 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl outline-none mt-1 text-sm font-bold text-slate-700 dark:text-slate-200 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600" 
                                    placeholder="Contoh: SMA Negeri 1 Jakarta"
                                    required 
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Email</label>
                        <input 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-200 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl outline-none mt-1 text-sm font-bold text-slate-700 dark:text-slate-200 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600" 
                            required 
                            disabled={isLoading} 
                            placeholder="email@sekolah.id"
                        />
                    </div>
                    
                    <div className="relative">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Password</label>
                        <div className="relative mt-1">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-200 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl outline-none text-sm font-bold text-slate-700 dark:text-slate-200 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 pr-12" 
                                required 
                                disabled={isLoading} 
                                placeholder="••••••••"
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowPassword(!showPassword)} 
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {isRegistering && (
                        <div>
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Konfirmasi Password</label>
                            <input 
                                type="password" 
                                value={confirmPassword} 
                                onChange={(e) => setConfirmPassword(e.target.value)} 
                                className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 ${confirmPassword && password !== confirmPassword ? 'border-rose-200 bg-rose-50 dark:bg-rose-900/10 dark:border-rose-800' : 'border-transparent'} focus:border-indigo-200 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl outline-none mt-1 text-sm font-bold text-slate-700 dark:text-slate-200 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600`}
                                required 
                                disabled={isLoading} 
                                placeholder="••••••••"
                            />
                            {confirmPassword && password !== confirmPassword && (
                                <p className="text-[10px] font-bold text-rose-500 mt-1 ml-1">Password tidak cocok.</p>
                            )}
                        </div>
                    )}

                    {isRegistering && (
                        <div className="flex items-start gap-3 mt-4 px-1">
                            <div className="relative flex items-center mt-0.5">
                                <input 
                                    type="checkbox" 
                                    id="terms" 
                                    checked={agreedToTerms} 
                                    onChange={(e) => setAgreedToTerms(e.target.checked)} 
                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-slate-300 transition-all checked:border-indigo-600 checked:bg-indigo-600 dark:border-slate-600 dark:checked:border-indigo-500 dark:checked:bg-indigo-500"
                                />
                                <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                </div>
                            </div>
                            <label htmlFor="terms" className="text-xs text-slate-500 dark:text-slate-400 leading-tight select-none">
                                Saya setuju dengan <button type="button" onClick={onViewTerms} className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">Syarat & Ketentuan</button> dan <button type="button" onClick={onViewPrivacy} className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">Kebijakan Privasi</button> layanan ini.
                            </label>
                        </div>
                    )}
                    
                    {error && (
                        <div className="text-rose-500 text-xs bg-rose-50 dark:bg-rose-900/20 p-3 rounded-xl text-center font-bold border border-rose-100 dark:border-rose-800 animate-shake">
                            {error}
                        </div>
                    )}
                    
                    <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 dark:bg-indigo-500 text-white font-black text-sm uppercase tracking-widest py-3 rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-200 dark:shadow-indigo-900/30 active:scale-[0.98] disabled:opacity-50 mt-4 h-[48px] flex items-center justify-center">
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        ) : (isRegistering ? 'Daftar Sekarang' : 'Masuk Akun')}
                    </button>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white dark:bg-slate-900 px-2 text-slate-400 font-bold tracking-widest">Atau</span>
                        </div>
                    </div>

                    <button 
                        type="button"
                        onClick={async () => {
                            setIsLoading(true);
                            try {
                                const { error } = await supabase.auth.signInWithOAuth({
                                    provider: 'google',
                                    options: {
                                        redirectTo: `${window.location.origin}/`
                                    }
                                });
                                if (error) throw error;
                            } catch (e: any) {
                                setError(e.message);
                                setIsLoading(false);
                            }
                        }}
                        disabled={isLoading}
                        className="w-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 font-bold text-sm py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Masuk dengan Google
                    </button>
                </form>

                <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-800">
                    <button 
                        type="button"
                        onClick={toggleMode}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 tracking-wide uppercase transition-colors"
                    >
                        {isRegistering ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar Baru'}
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};
