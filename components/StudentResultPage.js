import React, { useEffect } from 'react';
import { CheckCircleIcon } from './Icons';

export const StudentResultPage = ({ result, onFinish }) => {
    
    useEffect(() => {
        // Prevent going back to the exam page
        window.history.pushState(null, "", window.location.href);
        const onPopState = () => {
            window.history.pushState(null, "", window.location.href);
        };
        window.addEventListener("popstate", onPopState);

        return () => window.removeEventListener("popstate", onPopState);
    }, []);

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
