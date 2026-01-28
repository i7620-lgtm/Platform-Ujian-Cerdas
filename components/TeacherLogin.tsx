
import React, { useState, useEffect, useRef } from 'react';
import { LogoIcon, ArrowLeftIcon } from './Icons';
import type { TeacherProfile } from '../types';

declare global {
    interface Window {
        google: any;
    }
}

interface TeacherLoginProps {
  onLoginSuccess: (profile: TeacherProfile) => void;
  onBack: () => void;
}

const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || "";

export const TeacherLogin: React.FC<TeacherLoginProps> = ({ onLoginSuccess, onBack }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isGoogleRegister, setIsGoogleRegister] = useState(false);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [school, setSchool] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const initGoogle = () => {
        if (window.google?.accounts?.id && !isInitialized.current) {
            try {
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleGoogleCallback,
                    auto_select: false,
                });
                isInitialized.current = true;
                renderButton();
            } catch (e) { console.error("Google Init Error:", e); }
        } else if (isInitialized.current) {
            renderButton();
        }
    };

    const renderButton = () => {
        const btnDiv = document.getElementById("googleSignInBtn");
        if (btnDiv && window.google?.accounts?.id) {
            window.google.accounts.id.renderButton(btnDiv, { 
                theme: "outline", size: "large", text: "signin_with", 
                shape: "pill", width: btnDiv.offsetWidth || 350 
            });
        }
    };

    const timer = setInterval(() => { 
        if (window.google) { 
            initGoogle(); 
            clearInterval(timer); 
        } 
    }, 300);

    return () => clearInterval(timer);
  }, [isRegistering, isGoogleRegister]); 

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); 
    
    if ((isRegistering || isGoogleRegister) && (!fullName || !school)) {
        setError("Nama Lengkap dan Sekolah wajib diisi.");
        return;
    }

    setIsLoading(true);
    const action = (isRegistering || isGoogleRegister) ? 'register' : 'login';
    
    try {
        const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, username, password: isGoogleRegister ? '' : password, fullName, school })
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
            // FIX: Gunakan data.id atau data.username sebagai ID profil
            onLoginSuccess({ 
                id: data.id || data.username || username, 
                fullName: data.fullName || fullName, 
                accountType: data.accountType || 'guru', 
                school: data.school || school, 
                avatarUrl: avatarUrl || data.avatar 
            });
        } else { 
            setError(data.error || 'Autentikasi gagal.'); 
        }
    } catch (e) { 
        setError('Kesalahan koneksi ke server.'); 
    } finally { 
        setIsLoading(false); 
    }
  };

  const handleGoogleCallback = (response: any) => {
      setIsLoading(true);
      fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'google-login', token: response.credential })
      }).then(res => res.json()).then(data => {
          if (data.success) {
              onLoginSuccess({ 
                  id: data.id || data.username, 
                  fullName: data.fullName, 
                  accountType: data.accountType, 
                  school: data.school, 
                  avatarUrl: data.avatar 
              });
          } else if (data.requireRegistration) {
              setIsGoogleRegister(true);
              setIsRegistering(true);
              setUsername(data.googleData.email);
              setFullName(data.googleData.name);
              setAvatarUrl(data.googleData.picture);
              setError('Silakan lengkapi nama sekolah untuk melanjutkan.');
          } else {
              setError(data.error || "Gagal login Google");
          }
      }).catch(() => setError("Error koneksi")).finally(() => setIsLoading(false));
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-[#F9FAFB] font-sans selection:bg-indigo-100 selection:text-indigo-900">
        <div className="w-full max-w-[440px] animate-fade-in flex flex-col">
            <button onClick={onBack} className="group flex items-center gap-2 text-slate-400 hover:text-indigo-600 mb-8 font-bold transition-all self-start">
                <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> 
                Kembali
            </button>
            
            <div className="bg-white p-10 rounded-[2.5rem] shadow-[0_15px_50px_-15px_rgba(0,0,0,0.05)] border border-slate-100 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                
                <div className="flex justify-center mb-8">
                    <div className="bg-indigo-50 p-4 rounded-3xl">
                        <LogoIcon className="w-10 h-10 text-indigo-600" />
                    </div>
                </div>

                <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">
                    {isGoogleRegister ? 'Lengkapi Data' : (isRegistering ? 'Daftar Akun' : 'Selamat Datang')}
                </h2>
                <p className="text-slate-400 text-sm mb-10 font-medium">
                    {isGoogleRegister 
                        ? 'Satu langkah lagi untuk bergabung.' 
                        : (isRegistering ? 'Daftar untuk mengelola ujian Anda.' : 'Masuk untuk mengelola ujian dan data siswa.')}
                </p>
                
                {!isRegistering && !isGoogleRegister && (
                    <div className="space-y-6">
                        <div id="googleSignInBtn" className="min-h-[48px] w-full flex justify-center"></div>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="px-3 bg-white text-slate-300 font-bold tracking-widest">Atau Manual</span></div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleAuthAction} className="space-y-5 text-left mt-6">
                    {(isRegistering || isGoogleRegister) && (
                        <div className="space-y-5">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                                <input 
                                    type="text" 
                                    value={fullName} 
                                    onChange={(e) => setFullName(e.target.value)} 
                                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white rounded-2xl outline-none mt-1.5 text-sm font-bold text-slate-700 transition-all" 
                                    placeholder="Contoh: Budi Santoso, S.Pd"
                                    required 
                                    disabled={isGoogleRegister}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Sekolah</label>
                                <input 
                                    type="text" 
                                    value={school} 
                                    onChange={(e) => setSchool(e.target.value)} 
                                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white rounded-2xl outline-none mt-1.5 text-sm font-bold text-slate-700 transition-all" 
                                    placeholder="Contoh: SMA Negeri 1 Jakarta"
                                    required 
                                    autoFocus={isGoogleRegister}
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email / Username</label>
                        <input 
                            type="text" 
                            value={username} 
                            onChange={(e) => setUsername(e.target.value)} 
                            className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white rounded-2xl outline-none mt-1.5 text-sm font-bold text-slate-700 transition-all" 
                            required 
                            disabled={isLoading || isGoogleRegister} 
                            placeholder="nama@email.com"
                        />
                    </div>
                    
                    {!isGoogleRegister && (
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                            <input 
                                type="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white rounded-2xl outline-none mt-1.5 text-sm font-bold text-slate-700 transition-all" 
                                required 
                                disabled={isLoading} 
                                placeholder="••••••••"
                            />
                        </div>
                    )}
                    
                    {error && (
                        <div className="text-rose-500 text-xs bg-rose-50 p-4 rounded-2xl text-center font-bold border border-rose-100 animate-shake">
                            {error}
                        </div>
                    )}
                    
                    <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white font-black text-sm uppercase tracking-widest py-4.5 rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-[0.98] disabled:opacity-50 mt-4 h-[56px] flex items-center justify-center">
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        ) : (isGoogleRegister ? 'Selesaikan' : (isRegistering ? 'Daftar' : 'Masuk'))}
                    </button>
                </form>

                {!isGoogleRegister && (
                    <div className="mt-10 pt-6 border-t border-slate-50">
                        <button 
                            type="button"
                            onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 tracking-wide uppercase transition-colors"
                        >
                            {isRegistering ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar Baru'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
