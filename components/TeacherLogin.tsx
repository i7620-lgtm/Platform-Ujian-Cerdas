 
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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
                    window.google.accounts.id.renderButton(btnDiv, { theme: "outline", size: "large", text: "continue_with", shape: "pill", width: "100%" });
                }
            } catch (e) { console.error("Google Sign-In Error:", e); }
        }
    };
    const timer = setInterval(() => { if (window.google) { initGoogle(); clearInterval(timer); } }, 500);
    return () => clearInterval(timer);
  }, []);

  const handleGoogleCallback = async (response: any) => {
      setIsLoading(true); setError('');
      try {
          const res = await fetch('/api/auth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'google-login', token: response.credential })
          });
          const data = await res.json();
          if (res.ok && data.success) {
              onLoginSuccess({ id: data.username, fullName: data.fullName, accountType: data.accountType, school: data.school, avatarUrl: data.avatar });
          } else { setError(data.error || 'Gagal login.'); }
      } catch (e) { setError('Kesalahan koneksi.'); } finally { setIsLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setIsLoading(true);
    try {
        const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'login', username, password })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            onLoginSuccess({ id: data.username, fullName: data.fullName, accountType: data.accountType, school: data.school });
        } else { setError(data.error || 'Login gagal.'); }
    } catch (e) { setError('Kesalahan koneksi.'); } finally { setIsLoading(false); }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-50 to-gray-200">
        <div className="w-full max-w-md animate-fade-in">
            <button onClick={onBack} className="flex items-center gap-2 text-base-content hover:text-primary mb-6 font-semibold transition-colors"><ArrowLeftIcon className="w-5 h-5" /> Kembali</button>
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 text-center">
                <div className="flex justify-center mb-6"><div className="bg-primary/10 p-3 rounded-full"><LogoIcon className="w-12 h-12 text-primary" /></div></div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Login Guru</h2>
                <p className="text-gray-500 text-sm mb-8">Masuk untuk mengelola ujian dan data siswa.</p>
                
                <div id="googleSignInBtn" className="w-full flex justify-center mb-6 min-h-[44px]"></div>
                
                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="px-2 bg-white text-gray-400 font-bold">Atau Manual</span></div>
                </div>

                <form onSubmit={handleLogin} className="space-y-4 text-left">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Username / ID</label>
                        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none mt-1" required disabled={isLoading} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none mt-1" required disabled={isLoading} />
                    </div>
                    {error && <p className="text-rose-500 text-sm font-bold bg-rose-50 p-2 rounded-lg text-center">{error}</p>}
                    <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-black transition-all shadow-lg">
                        {isLoading ? 'Memproses...' : 'Masuk Manual'}
                    </button>
                </form>
            </div>
        </div>
    </div>
  );
};
