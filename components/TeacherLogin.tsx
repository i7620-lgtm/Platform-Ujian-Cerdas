
import React, { useState } from 'react';
import { LogoIcon, ArrowLeftIcon } from './Icons';

interface TeacherLoginProps {
  onLoginSuccess: (teacherId: string) => void;
  onBack: () => void;
}

export const TeacherLogin: React.FC<TeacherLoginProps> = ({ onLoginSuccess, onBack }) => {
  const [teacherId, setTeacherId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // Simple mock authentication
    if (teacherId.trim() !== '' && password === 'guru123') {
      onLoginSuccess(teacherId);
    } else {
      setError('ID Guru atau Password salah.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-50 to-gray-200">
        <div className="w-full max-w-md animate-fade-in">
            <button onClick={onBack} className="flex items-center gap-2 text-base-content hover:text-primary mb-6 font-semibold transition-colors">
                <ArrowLeftIcon className="w-5 h-5" />
                Kembali ke Pilihan Peran
            </button>
            <div className="bg-base-100 p-8 rounded-2xl shadow-lg">
                <div className="flex justify-center mb-6">
                    <div className="bg-primary/10 p-3 rounded-full">
                        <LogoIcon className="w-12 h-12 text-primary" />
                    </div>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-center text-neutral mb-2">Login Guru</h2>
                <p className="text-center text-base-content mb-6">Masukkan kredensial Anda untuk mengelola ujian.</p>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">ID Guru</label>
                        <input
                            type="text"
                            value={teacherId}
                            onChange={(e) => setTeacherId(e.target.value)}
                            className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                            placeholder="e.g., GURU001"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                            placeholder="Password: guru123"
                            required
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <button type="submit" className="w-full bg-primary text-primary-content font-bold py-3 px-4 rounded-lg hover:bg-primary-focus transition-colors duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 mt-2">
                        Login
                    </button>
                </form>
            </div>
        </div>
    </div>
  );
};
