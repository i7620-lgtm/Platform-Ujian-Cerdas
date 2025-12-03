
import React, { useState } from 'react';
import type { Student } from '../types';
import { LogoIcon, ArrowLeftIcon } from './Icons';

interface StudentLoginProps {
  onLoginSuccess: (examCode: string, student: Student) => void;
  onBack: () => void;
}

export const StudentLogin: React.FC<StudentLoginProps> = ({ onLoginSuccess, onBack }) => {
  const [examCode, setExamCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examCode || !fullName || !studentClass || !studentId) {
      setError('Semua field harus diisi.');
      return;
    }
    setError('');
    const student: Student = {
      fullName,
      class: studentClass,
      studentId,
    };
    onLoginSuccess(examCode.toUpperCase(), student);
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-50 to-gray-200">
        <div className="w-full max-w-md animate-fade-in">
             <button onClick={onBack} className="flex items-center gap-2 text-base-content hover:text-secondary mb-6 font-semibold transition-colors">
                <ArrowLeftIcon className="w-5 h-5" />
                Kembali ke Pilihan Peran
            </button>
            <div className="bg-base-100 p-8 rounded-2xl shadow-lg">
                <div className="flex justify-center mb-6">
                    <div className="bg-secondary/10 p-3 rounded-full">
                        <LogoIcon className="w-12 h-12 text-secondary" />
                    </div>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-center text-neutral mb-2">Masuk Ujian</h2>
                <p className="text-center text-base-content mb-6">Masukkan kode ujian dan data diri Anda.</p>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Kode Soal</label>
                        <input
                            type="text"
                            value={examCode}
                            onChange={(e) => setExamCode(e.target.value)}
                            className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                            placeholder="e.g., XYZ123"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                            placeholder="Nama Anda"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Kelas</label>
                        <input
                            type="text"
                            value={studentClass}
                            onChange={(e) => setStudentClass(e.target.value)}
                            className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                            placeholder="e.g., 12 IPA 1"
                            required
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Nomor Absen</label>
                        <input
                            type="text"
                            value={studentId}
                            onChange={(e) => setStudentId(e.target.value)}
                            className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                            placeholder="e.g., 25"
                            required
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <button type="submit" className="w-full bg-secondary text-white font-bold py-3 px-4 rounded-lg hover:bg-secondary-focus transition-colors duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 mt-2">
                        Mulai Ujian
                    </button>
                </form>
            </div>
        </div>
    </div>
  );
};
