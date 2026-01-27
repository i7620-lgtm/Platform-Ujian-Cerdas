
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

const ConfigurationErrorGuide: React.FC<{ errorMessage: string; onRetry: () => void; }> = ({ errorMessage, onRetry }) => {
    const isTemplateError = errorMessage.includes('TEMPLATE_DB_GURU');
    
    const sheetIdMatch = errorMessage.match(/ID: '([a-zA-Z0-9-_]+)'/);
    const sheetId = sheetIdMatch ? sheetIdMatch[1] : null;

    const emailMatch = errorMessage.match(/EMAIL AKUN: '([^']+)'/);
    const serviceAccountEmail = emailMatch ? emailMatch[1] : null;

    const sheetName = isTemplateError ? "Template Ujian Guru" : "Database Master Ujian";
    const sheetUrl = sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit` : null;

    return (
        <div className="text-left text-sm bg-rose-50 p-4 rounded-xl border-2 border-dashed border-rose-200 mt-4 space-y-4 animate-fade-in">
            <h3 className="font-bold text-rose-700 flex items-center gap-2"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> Kesalahan Konfigurasi Google</h3>
            <p className="text-xs text-rose-600 bg-rose-100 p-2 rounded-lg font-mono">
                {errorMessage.split('\n')[0]}
            </p>
            
            <div className="space-y-4 text-xs">
                <p className="font-bold text-rose-800">CHECKLIST PERBAIKAN WAJIB:</p>
                
                <div className="flex gap-3 items-start">
                    <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-rose-600 text-white font-bold text-[10px] mt-0.5">1</span>
                    <div>
                        <p className="font-semibold text-rose-800">Aktifkan Google Drive API</p>
                        <p className="text-rose-600/90 leading-relaxed">Pastikan API ini <strong className="font-bold">AKTIF</strong> di Google Cloud. Aplikasi perlu izin untuk menyalin file.</p>
                        <a href="https://console.cloud.google.com/apis/library/drive.googleapis.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium text-[11px]">
                            Buka Laman Google Drive API ↗
                        </a>
                    </div>
                </div>

                <div className="flex gap-3 items-start">
                    <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-rose-600 text-white font-bold text-[10px] mt-0.5">2</span>
                    <div>
                        <p className="font-semibold text-rose-800">Verifikasi Email Service Account</p>
                        <p className="text-rose-600/90 leading-relaxed">Aplikasi ini mencoba login menggunakan email di bawah ini. Salin dan pastikan ini adalah email yang benar.</p>
                        <div className="bg-rose-100 p-2 rounded-lg my-2 flex items-center justify-between gap-2 border border-rose-200">
                           <code className="text-[10px] text-rose-800 font-semibold break-all">{serviceAccountEmail || "Gagal mendeteksi email..."}</code>
                           {serviceAccountEmail && (
                               <button 
                                  onClick={() => navigator.clipboard.writeText(serviceAccountEmail)}
                                  className="text-rose-600 hover:text-rose-900 bg-white px-2 py-1 text-[9px] font-bold rounded shadow-sm border border-rose-200"
                                >
                                  SALIN
                               </button>
                           )}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 items-start">
                    <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-rose-600 text-white font-bold text-[10px] mt-0.5">3</span>
                    <div>
                        <p className="font-semibold text-rose-800">Bagikan File Google Sheet ({sheetName})</p>
                        <p className="text-rose-600/90 leading-relaxed">
                            Buka file sheet yang bermasalah dan bagikan ke email dari <strong className="font-bold">langkah 2</strong> dengan akses sebagai <strong className="bg-rose-100 px-1 rounded font-bold">Editor</strong>.
                        </p>
                        {sheetUrl && (
                            <a href={sheetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium break-all block my-1 text-[11px]">
                                Buka File {sheetName} di Google Sheets ↗
                            </a>
                        )}
                    </div>
                </div>
            </div>

            <button onClick={onRetry} className="w-full bg-rose-600 text-white font-bold text-xs py-2.5 rounded-lg hover:bg-rose-700 transition-all mt-2 shadow-lg shadow-rose-200">
                Saya Sudah Memperbaiki, Coba Login Lagi
            </button>
        </div>
    );
};


export const TeacherLogin: React.FC<TeacherLoginProps> = ({ onLoginSuccess, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

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
  }, []);

  const handleLoginAttempt = async (body: any) => {
    setError(''); 
    setIsLoading(true);
    try {
        const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            onLoginSuccess({ id: data.username, fullName: data.fullName, accountType: data.accountType, school: data.school, avatarUrl: data.avatar });
        } else { 
            setError(data.error || 'Gagal login.'); 
        }
    } catch (e) { 
        setError('Kesalahan koneksi.'); 
    } finally { 
        setIsLoading(false); 
    }
  };

  const handleGoogleCallback = (response: any) => {
      handleLoginAttempt({ action: 'google-login', token: response.credential });
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    handleLoginAttempt({ action: 'login', username, password });
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-50 to-gray-200">
        <div className="w-full max-w-md animate-fade-in flex flex-col">
            <button onClick={onBack} className="flex items-center gap-2 text-base-content hover:text-primary mb-6 font-semibold transition-colors self-start"><ArrowLeftIcon className="w-5 h-5" /> Kembali</button>
            
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 text-center relative z-10">
                <div className="flex justify-center mb-6"><div className="bg-primary/10 p-3 rounded-full"><LogoIcon className="w-12 h-12 text-primary" /></div></div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Login Guru</h2>
                <p className="text-gray-500 text-sm mb-8">Masuk untuk mengelola ujian dan data siswa.</p>
                
                <div className="flex justify-center w-full mb-6">
                    <div id="googleSignInBtn" className="min-h-[44px]"></div>
                </div>
                
                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="px-2 bg-white text-gray-400 font-bold">Atau Manual</span></div>
                </div>

                <form onSubmit={handleManualLogin} className="space-y-4 text-left">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Username / ID</label>
                        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none mt-1" required disabled={isLoading} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none mt-1" required disabled={isLoading} />
                    </div>
                    {error && (
                        error.includes('IZIN DITOLAK') ? (
                            <ConfigurationErrorGuide errorMessage={error} onRetry={() => setError('')} />
                        ) : (
                            <div className="text-rose-500 text-sm bg-rose-50 p-3 rounded-lg text-center">
                                <p className="font-bold">{error}</p>
                                {error.includes('Key') && <p className="text-[10px] mt-1 text-rose-400">Cek format Private Key di Vercel.</p>}
                            </div>
                        )
                    )}
                    <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-black transition-all shadow-lg">
                        {isLoading ? 'Memproses...' : 'Masuk Manual'}
                    </button>
                </form>
            </div>

            <div className="mt-8 text-center opacity-80 hover:opacity-100 transition-opacity">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">
                    Debug Info: Origin URL
                </p>
                <div 
                    className="bg-white/50 border-2 border-dashed border-gray-400/30 rounded-lg p-3 text-xs font-mono text-gray-600 break-all cursor-pointer hover:bg-white hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-2 group"
                    onClick={() => {
                        navigator.clipboard.writeText(currentOrigin);
                        alert(`URL disalin:\n${currentOrigin}\n\nMasukkan ini ke Google Cloud Console > Authorized JavaScript origins`);
                    }}
                    title="Klik untuk menyalin URL ini"
                >
                    <span>{currentOrigin}</span>
                    <svg className="w-3 h-3 opacity-50 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 max-w-xs mx-auto leading-relaxed">
                    Jika muncul <strong>Error 400: origin_mismatch</strong>, salin URL di atas dan tambahkan ke 
                    <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline ml-1">Google Cloud Console</a>.
                </p>
            </div>
        </div>
    </div>
  );
};
