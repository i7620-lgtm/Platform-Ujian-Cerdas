
import React, { useState, useEffect } from 'react';
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
  const [isGoogleRegister, setIsGoogleRegister] = useState(false); // Mode khusus registrasi google
  
  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [school, setSchool] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const initGoogle = () => {
        if (window.google && window.google.accounts) {
            try {
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleGoogleCallback,
                    auto_select: false,
                    cancel_on_tap_outside: true
                });
                const btnDiv = document.getElementById("googleSignInBtn");
                if (btnDiv) {
                    window.google.accounts.id.renderButton(btnDiv, { 
                        theme: "outline", size: "large", text: "continue_with", 
                        shape: "pill", width: "350" 
                    });
                }
            } catch (e) { console.error("Google Sign-In Error:", e); }
        }
    };
    const timer = setInterval(() => { if (window.google) { initGoogle(); clearInterval(timer); } }, 500);
    return () => clearInterval(timer);
  }, [isRegistering, isGoogleRegister]); 

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); 
    
    // Validasi untuk register manual atau google register
    if ((isRegistering || isGoogleRegister) && (!fullName || !school)) {
        setError("Nama Lengkap dan Sekolah wajib diisi.");
        return;
    }

    setIsLoading(true);
    
    const action = (isRegistering || isGoogleRegister) ? 'register' : 'login';
    const payload = { 
        action, 
        username, 
        password: isGoogleRegister ? '' : password, // Password kosong untuk google register
        fullName, 
        school 
    };

    try {
        const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
            onLoginSuccess({ 
                id: data.username, 
                fullName: data.fullName, 
                accountType: data.accountType, 
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
      const performGoogleCheck = async () => {
          setIsLoading(true);
          try {
              const res = await fetch('/api/auth', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'google-login', token: response.credential })
              });
              const data = await res.json();
              
              if (res.ok && data.success) {
                  // User sudah ada, langsung login
                  onLoginSuccess({ 
                      id: data.username, 
                      fullName: data.fullName, 
                      accountType: data.accountType, 
                      school: data.school, 
                      avatarUrl: data.avatar 
                  });
              } else if (res.ok && data.requireRegistration) {
                  // User belum ada, tampilkan form kelengkapan data
                  setIsGoogleRegister(true);
                  setIsRegistering(true); // Supaya UI switch ke mode register
                  setUsername(data.googleData.email);
                  setFullName(data.googleData.name);
                  setAvatarUrl(data.googleData.picture);
                  setPassword(''); // Password kosong
                  setError('Silakan lengkapi nama sekolah untuk melanjutkan.');
              } else {
                  setError(data.error || "Gagal login Google");
              }
          } catch(e) { setError("Error koneksi"); }
          finally { setIsLoading(false); }
      };
      performGoogleCheck();
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-50 to-gray-200">
        <div className="w-full max-w-md animate-fade-in flex flex-col">
            <button onClick={onBack} className="flex items-center gap-2 text-base-content hover:text-primary mb-6 font-semibold transition-colors self-start"><ArrowLeftIcon className="w-5 h-5" /> Kembali</button>
            
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 text-center relative z-10">
                <div className="flex justify-center mb-6"><div className="bg-primary/10 p-3 rounded-full"><LogoIcon className="w-12 h-12 text-primary" /></div></div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    {isGoogleRegister ? 'Lengkapi Pendaftaran' : (isRegistering ? 'Daftar Akun Guru' : 'Login Guru')}
                </h2>
                <p className="text-gray-500 text-sm mb-8">
                    {isGoogleRegister 
                        ? 'Satu langkah lagi! Masukkan nama sekolah Anda.' 
                        : (isRegistering ? 'Lengkapi data diri dan sekolah Anda.' : 'Masuk untuk mengelola ujian dan data siswa.')}
                </p>
                
                {/* Google Button - Only show on initial Login screen */}
                {!isRegistering && !isGoogleRegister && (
                    <>
                        <div className="flex justify-center w-full mb-6">
                            <div id="googleSignInBtn" className="min-h-[44px]"></div>
                        </div>
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="px-2 bg-white text-gray-400 font-bold">Atau Manual</span></div>
                        </div>
                    </>
                )}

                <form onSubmit={handleAuthAction} className="space-y-4 text-left">
                    {(isRegistering || isGoogleRegister) && (
                        <>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Nama Lengkap</label>
                                <input 
                                    type="text" 
                                    value={fullName} 
                                    onChange={(e) => setFullName(e.target.value)} 
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none mt-1" 
                                    placeholder="Contoh: Budi Santoso, S.Pd"
                                    required 
                                    disabled={isGoogleRegister} // Nama dari Google
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Nama Sekolah</label>
                                <input 
                                    type="text" 
                                    value={school} 
                                    onChange={(e) => setSchool(e.target.value)} 
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none mt-1" 
                                    placeholder="Contoh: SMA Negeri 1 Jakarta"
                                    required 
                                    autoFocus={isGoogleRegister}
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Username / ID (Email)</label>
                        <input 
                            type="text" 
                            value={username} 
                            onChange={(e) => setUsername(e.target.value)} 
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none mt-1" 
                            required 
                            disabled={isLoading || isGoogleRegister} 
                        />
                    </div>
                    
                    {!isGoogleRegister && (
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Password</label>
                            <input 
                                type="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none mt-1" 
                                required 
                                disabled={isLoading} 
                            />
                        </div>
                    )}
                    
                    {error && (
                        <div className="text-rose-500 text-sm bg-rose-50 p-3 rounded-lg text-center font-bold animate-pulse">
                            {error}
                        </div>
                    )}
                    
                    <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-black transition-all shadow-lg mt-2">
                        {isLoading ? 'Memproses...' : (isGoogleRegister ? 'Selesaikan Pendaftaran' : (isRegistering ? 'Daftar Sekarang' : 'Masuk'))}
                    </button>
                </form>

                {!isGoogleRegister && (
                    <div className="mt-6 pt-4 border-t border-gray-100">
                        <button 
                            type="button"
                            onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                            className="text-sm font-medium text-primary hover:underline"
                        >
                            {isRegistering ? 'Sudah punya akun? Login di sini' : 'Belum punya akun? Daftar Guru Baru'}
                        </button>
                    </div>
                )}
                
                {isGoogleRegister && (
                     <div className="mt-6 pt-4 border-t border-gray-100">
                        <button 
                            type="button"
                            onClick={() => { 
                                setIsGoogleRegister(false); 
                                setIsRegistering(false); 
                                setUsername(''); 
                                setFullName(''); 
                                setSchool('');
                                setError(''); 
                            }}
                            className="text-sm font-medium text-slate-400 hover:text-slate-600"
                        >
                            Batal Pendaftaran Google
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
