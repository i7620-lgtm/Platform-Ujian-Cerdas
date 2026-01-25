
import React, { useState, useEffect } from 'react';
import { LogoIcon, ArrowLeftIcon } from './Icons';

declare global {
    interface Window {
        google: any;
    }
}

interface TeacherLoginProps {
  onLoginSuccess: (teacherId: string) => void;
  onBack: () => void;
}

// Placeholder Client ID - Replace with your actual Google Cloud Console Client ID
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID_HERE"; 

export const TeacherLogin: React.FC<TeacherLoginProps> = ({ onLoginSuccess, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize Google Sign-In
  useEffect(() => {
    // Check if Google script is loaded
    const initGoogle = () => {
        if (window.google && window.google.accounts) {
            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleCallback,
                auto_select: false,
                cancel_on_tap_outside: true
            });
            
            // Render the button
            const btnDiv = document.getElementById("googleSignInBtn");
            if (btnDiv) {
                window.google.accounts.id.renderButton(btnDiv, {
                    theme: "outline",
                    size: "large",
                    text: "continue_with",
                    shape: "pill",
                    width: "100%"
                });
            }
        }
    };

    // Retry initialization if script loads slowly
    const timer = setInterval(() => {
        if (window.google) {
            initGoogle();
            clearInterval(timer);
        }
    }, 500);

    return () => clearInterval(timer);
  }, []);

  const handleGoogleCallback = async (response: any) => {
      setIsLoading(true);
      setError('');
      try {
          const res = await fetch('/api/auth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  action: 'google-login', 
                  token: response.credential 
              })
          });

          const data = await res.json();
          if (res.ok && data.success) {
              onLoginSuccess(data.username);
          } else {
              setError(data.error || 'Gagal login dengan Google.');
          }
      } catch (e) {
          setError('Terjadi kesalahan koneksi saat login Google.');
      } finally {
          setIsLoading(false);
      }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
        const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'login', 
                username, 
                password 
            })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            onLoginSuccess(data.username);
        } else {
            setError(data.error || 'ID Guru atau Password salah.');
        }
    } catch (e) {
        setError('Terjadi kesalahan koneksi.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-50 to-gray-200">
        <div className="w-full max-w-md animate-fade-in">
            <button onClick={onBack} className="flex items-center gap-2 text-base-content hover:text-primary mb-6 font-semibold transition-colors">
                <ArrowLeftIcon className="w-5 h-5" />
                Kembali ke Pilihan Peran
            </button>
            <div className="bg-base-100 p-8 rounded-2xl shadow-lg border border-gray-100">
                <div className="flex justify-center mb-6">
                    <div className="bg-primary/10 p-3 rounded-full">
                        <LogoIcon className="w-12 h-12 text-primary" />
                    </div>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-center text-neutral mb-2">Login Guru</h2>
                <p className="text-center text-base-content mb-6 text-sm">Masuk untuk mengelola ujian.</p>
                
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Username / ID</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                            placeholder="e.g., guru"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                            placeholder="Password"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    {error && <p className="text-rose-500 text-sm text-center font-medium bg-rose-50 p-2 rounded-lg">{error}</p>}
                    
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-primary text-primary-content font-bold py-3 px-4 rounded-lg hover:bg-primary-focus transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 mt-2 flex justify-center items-center gap-2"
                    >
                        {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Masuk'}
                    </button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">Atau masuk dengan</span>
                    </div>
                </div>

                <div className="flex justify-center">
                     {/* Google Button Container */}
                     <div id="googleSignInBtn" className="w-full"></div>
                </div>
                
                {GOOGLE_CLIENT_ID === "YOUR_GOOGLE_CLIENT_ID_HERE" && (
                     <p className="text-[10px] text-center text-gray-400 mt-4">
                        *Fitur Google Login memerlukan konfigurasi Client ID pada kode.
                     </p>
                )}
            </div>
        </div>
    </div>
  );
};
