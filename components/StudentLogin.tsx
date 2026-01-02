
import React, { useState, useEffect, useRef } from 'react';
import type { Student } from '../types';
import { LogoIcon, ArrowLeftIcon, TrashIcon } from './Icons';

interface StudentLoginProps {
  onLoginSuccess: (examCode: string, student: Student) => void;
  onBack: () => void;
}

export const StudentLogin: React.FC<StudentLoginProps> = ({ onLoginSuccess, onBack }) => {
  // Keys untuk LocalStorage
  const STORAGE_KEYS = {
      NAME: 'saved_student_fullname',
      CLASS: 'saved_student_class',
      ID: 'saved_student_id'
  };

  const [examCode, setExamCode] = useState('');
  
  // Inisialisasi state langsung dari LocalStorage (Lazy Initialization)
  const [fullName, setFullName] = useState(() => localStorage.getItem(STORAGE_KEYS.NAME) || '');
  const [studentClass, setStudentClass] = useState(() => localStorage.getItem(STORAGE_KEYS.CLASS) || '');
  const [studentId, setStudentId] = useState(() => localStorage.getItem(STORAGE_KEYS.ID) || '');
  
  const [error, setError] = useState('');
  const examCodeInputRef = useRef<HTMLInputElement>(null);

  // Efek untuk Autofokus
  useEffect(() => {
      // Jika data diri sudah terisi lengkap dari cache, langsung fokus ke Kode Soal
      if (fullName && studentClass && studentId && examCodeInputRef.current) {
          examCodeInputRef.current.focus();
      }
  }, []); // Hanya jalan sekali saat mount

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examCode || !fullName || !studentClass || !studentId) {
      setError('Semua field harus diisi.');
      return;
    }
    setError('');

    // SIMPAN DATA KE STORAGE
    localStorage.setItem(STORAGE_KEYS.NAME, fullName);
    localStorage.setItem(STORAGE_KEYS.CLASS, studentClass);
    localStorage.setItem(STORAGE_KEYS.ID, studentId);

    const student: Student = {
      fullName,
      class: studentClass,
      studentId,
    };
    onLoginSuccess(examCode.toUpperCase(), student);
  };

  const handleClearData = () => {
      if(confirm("Apakah Anda ingin menghapus data tersimpan?")) {
          setFullName('');
          setStudentClass('');
          setStudentId('');
          localStorage.removeItem(STORAGE_KEYS.NAME);
          localStorage.removeItem(STORAGE_KEYS.CLASS);
          localStorage.removeItem(STORAGE_KEYS.ID);
      }
  };

  const hasSavedData = localStorage.getItem(STORAGE_KEYS.NAME);

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-50 to-gray-200">
        <div className="w-full max-w-md animate-fade-in">
             <button onClick={onBack} className="flex items-center gap-2 text-base-content hover:text-secondary mb-6 font-semibold transition-colors">
                <ArrowLeftIcon className="w-5 h-5" />
                Kembali ke Pilihan Peran
            </button>
            <div className="bg-base-100 p-8 rounded-2xl shadow-lg relative overflow-hidden">
                {/* Hiasan background tipis */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary/5 rounded-full blur-2xl pointer-events-none"></div>

                <div className="flex justify-center mb-6">
                    <div className="bg-secondary/10 p-3 rounded-full">
                        <LogoIcon className="w-12 h-12 text-secondary" />
                    </div>
                </div>
                
                <div className="text-center mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-neutral mb-2">Masuk Ujian</h2>
                    <p className="text-sm text-base-content">
                        {hasSavedData ? "Selamat datang kembali! Silakan masukkan kode soal." : "Masukkan kode ujian dan data diri Anda."}
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Kode Soal</label>
                        <input
                            ref={examCodeInputRef}
                            type="text"
                            value={examCode}
                            onChange={(e) => setExamCode(e.target.value)}
                            className="mt-1 block w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-0 focus:border-secondary text-lg tracking-wider font-bold text-center uppercase placeholder:normal-case placeholder:font-normal placeholder:text-gray-400 placeholder:text-base transition-colors"
                            placeholder="Contoh: XYZ123"
                            autoComplete="off"
                            required
                        />
                    </div>

                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Data Identitas</label>
                            {hasSavedData && (
                                <button type="button" onClick={handleClearData} className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-1">
                                    <TrashIcon className="w-3 h-3" /> Reset Data
                                </button>
                            )}
                        </div>
                        
                        <div>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all text-sm"
                                placeholder="Nama Lengkap"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <input
                                    type="text"
                                    value={studentClass}
                                    onChange={(e) => setStudentClass(e.target.value)}
                                    className="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all text-sm"
                                    placeholder="Kelas (Ex: 12 IPA 1)"
                                    required
                                />
                            </div>
                             <div>
                                <input
                                    type="text"
                                    value={studentId}
                                    onChange={(e) => setStudentId(e.target.value)}
                                    className="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all text-sm"
                                    placeholder="No. Absen"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg">{error}</p>}
                    
                    <button type="submit" className="w-full bg-secondary text-white font-bold py-3.5 px-4 rounded-xl hover:bg-secondary-focus hover:shadow-lg hover:shadow-secondary/30 transition-all duration-300 transform active:scale-95 mt-4">
                        Mulai Ujian
                    </button>
                </form>
            </div>
        </div>
    </div>
  );
};
