
import React, { useEffect } from 'react';
import type { Result, ExamConfig } from '../types';
import { CheckCircleIcon, WifiIcon, ClockIcon, LockClosedIcon, ArrowPathIcon } from './Icons';

interface StudentResultPageProps {
  result: Result;
  config?: ExamConfig;
  onFinish: () => void;
  onCheckStatus?: () => void; // New prop to allow re-checking status
}

export const StudentResultPage: React.FC<StudentResultPageProps> = ({ result, config, onFinish, onCheckStatus }) => {
    
    useEffect(() => {
        window.history.pushState(null, "", window.location.href);
        const onPopState = () => {
            window.history.pushState(null, "", window.location.href);
        };
        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, []);

    // --- HANDLING FORCE SUBMITTED (LOCKED) STATE ---
    if (result.status === 'force_submitted') {
        return (
             <div className="flex items-center justify-center min-h-screen bg-red-50 p-4 animate-fade-in">
                <div className="w-full max-w-lg text-center">
                    <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-red-100 transform transition-all">
                        <div className="flex justify-center mb-6">
                            <div className="bg-red-100 p-6 rounded-full animate-bounce">
                                <LockClosedIcon className="w-16 h-16 text-red-600" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-red-800 mb-2">Ujian Ditangguhkan</h1>
                        <p className="text-gray-600 mb-6">
                            Sistem mendeteksi aktivitas mencurigakan (pindah tab/aplikasi). Akses Anda ke ujian ini telah dikunci sementara.
                        </p>
                        
                        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 text-left mb-6 text-sm text-orange-800">
                            <p className="font-bold mb-1">Apa yang harus saya lakukan?</p>
                            <ul className="list-disc pl-4 space-y-1">
                                <li>Hubungi pengawas ujian atau guru Anda.</li>
                                <li>Minta izin untuk membuka kembali akses ujian.</li>
                                <li>Setelah diizinkan, klik tombol di bawah ini.</li>
                            </ul>
                        </div>

                        {onCheckStatus && (
                            <button 
                                onClick={onCheckStatus} 
                                className="w-full bg-red-600 text-white font-bold py-3.5 px-4 rounded-xl hover:bg-red-700 transition-colors duration-300 shadow-lg hover:shadow-red-200 flex items-center justify-center gap-2 mb-3"
                            >
                                <ArrowPathIcon className="w-5 h-5" />
                                Cek Izin / Lanjutkan Ujian
                            </button>
                        )}
                        
                        <button 
                            onClick={onFinish} 
                            className="text-sm text-gray-500 hover:text-gray-800 underline mt-2"
                        >
                            Kembali ke Halaman Utama
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Handling Pending Grading (Offline Mode)
    if (result.status === 'pending_grading') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 p-4 animate-fade-in">
                <div className="w-full max-w-lg text-center">
                    <div className="bg-base-100 p-8 rounded-2xl shadow-lg transform transition-all duration-500 animate-slide-in-up">
                        <div className="flex justify-center mb-4">
                            <div className="bg-yellow-100 p-4 rounded-full">
                                <ClockIcon className="w-16 h-16 text-yellow-600" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-neutral mb-2">Jawaban Tersimpan (Offline)</h1>
                        <p className="text-base-content mb-6">
                            Anda telah menyelesaikan ujian, namun nilai belum dapat ditampilkan karena Anda sedang offline.
                        </p>
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm text-blue-800 mb-6">
                            <div className="flex items-center gap-2 justify-center mb-1 font-bold">
                                <WifiIcon className="w-4 h-4"/> Sinkronisasi Diperlukan
                            </div>
                            Segera hubungkan perangkat ke internet agar jawaban Anda dapat dikirim ke server dan dinilai. Nilai akan muncul otomatis setelah sinkronisasi.
                        </div>
                         <button 
                            onClick={onFinish} 
                            className="w-full bg-primary text-primary-content font-bold py-3 px-4 rounded-lg hover:bg-primary-focus transition-colors duration-300 shadow-md"
                        >
                            Kembali ke Halaman Utama
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Hide result logic if configured
    const showResult = config ? config.showResultToStudent : true;

    if (!showResult) {
        return (
             <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 p-4 animate-fade-in">
                <div className="w-full max-w-lg text-center">
                    <div className="bg-base-100 p-8 rounded-2xl shadow-lg transform transition-all duration-500 animate-slide-in-up">
                         <div className="flex justify-center mb-4">
                            <CheckCircleIcon className="w-20 h-20 text-secondary" />
                        </div>
                        <h1 className="text-3xl font-bold text-neutral mb-2">Ujian Selesai!</h1>
                        <p className="text-base-content mb-6">Terima kasih, {result.student.fullName}. Jawaban Anda telah berhasil dikirim.</p>
                        
                        <div className="bg-gray-50 p-4 rounded-lg mb-6">
                            <p className="text-sm text-gray-500">Hasil ujian akan diumumkan oleh guru Anda.</p>
                        </div>

                        <button 
                            onClick={onFinish} 
                            className="w-full bg-primary text-primary-content font-bold py-3 px-4 rounded-lg hover:bg-primary-focus transition-colors duration-300 shadow-md hover:shadow-lg"
                        >
                            Selesai & Kembali ke Halaman Utama
                        </button>
                    </div>
                </div>
             </div>
        )
    }

    const scoreColorClass = result.score >= 75 ? 'text-green-500' : result.score >= 50 ? 'text-yellow-500' : 'text-red-500';

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 p-4 animate-fade-in">
            <div className="w-full max-w-lg text-center">
                <div className="bg-base-100 p-8 rounded-2xl shadow-lg transform transition-all duration-500 animate-slide-in-up">
                    <div className="flex justify-center mb-4">
                        <CheckCircleIcon className="w-20 h-20 text-secondary" />
                    </div>
                    <h1 className="text-3xl font-bold text-neutral mb-2">Ujian Selesai!</h1>
                    <p className="text-base-content mb-6">Berikut adalah hasil ujian Anda, {result.student.fullName}.</p>
                    
                    <div className="bg-gray-50 rounded-xl p-6 my-8 border">
                        <p className="text-lg text-gray-600">Nilai Akhir Anda</p>
                        <p className={`text-6xl sm:text-7xl font-extrabold my-2 ${scoreColorClass}`}>{result.score}</p>
                        <div className="flex justify-center divide-x mt-4 text-gray-600">
                            <div className="px-4 text-center">
                                <p className="font-bold text-lg">{result.correctAnswers}</p>
                                <p className="text-sm">Jawaban Benar</p>
                            </div>
                            <div className="px-4 text-center">
                                <p className="font-bold text-lg">{result.totalQuestions}</p>
                                <p className="text-sm">Total Soal</p>
                            </div>
                        </div>
                    </div>

                    <p className="text-xs text-gray-400 mb-6">
                        Catatan: Halaman ini hanya dapat dilihat satu kali. Setelah Anda keluar, Anda tidak dapat melihat hasil ini lagi.
                    </p>

                    <button 
                        onClick={onFinish} 
                        className="w-full bg-primary text-primary-content font-bold py-3 px-4 rounded-lg hover:bg-primary-focus transition-colors duration-300 shadow-md hover:shadow-lg"
                    >
                        Selesai & Kembali ke Halaman Utama
                    </button>
                </div>
            </div>
        </div>
    );
};
