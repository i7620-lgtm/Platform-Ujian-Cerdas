
import React, { useEffect } from 'react';
import type { Result, ExamConfig } from '../types';
import { CheckCircleIcon, WifiIcon, ClockIcon, LockClosedIcon, ArrowPathIcon } from './Icons';

interface StudentResultPageProps {
  result: Result;
  config?: ExamConfig;
  onFinish: () => void;
  onCheckStatus?: () => void; 
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

    if (result.status === 'force_closed') {
        return (
             <div className="flex items-center justify-center min-h-screen bg-slate-50 p-6 animate-fade-in font-sans">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/60 overflow-hidden border border-slate-100 relative">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-red-50 rounded-full blur-3xl -z-10 opacity-60 pointer-events-none"></div>

                        <div className="p-8 text-center flex flex-col items-center">
                            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 shadow-inner ring-8 ring-red-50/50">
                                <LockClosedIcon className="w-8 h-8 text-red-500" />
                            </div>
                            
                            <h1 className="text-2xl font-bold text-slate-800 mb-2 tracking-tight">Akses Ujian Dihentikan</h1>
                            <p className="text-slate-500 text-sm leading-relaxed mb-8 px-2">
                                Sistem mendeteksi aktivitas yang tidak diizinkan. Demi menjaga integritas, sesi pengerjaan Anda telah dihentikan otomatis.
                            </p>
                            
                            <div className="w-full bg-slate-50 rounded-xl p-5 mb-8 text-left border border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Langkah Pemulihan</p>
                                <ol className="space-y-3 text-sm text-slate-600">
                                    <li className="flex gap-3 items-start">
                                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-500 shrink-0 shadow-sm">1</span>
                                        <span>Lapor ke Pengawas Ujian / Guru.</span>
                                    </li>
                                    <li className="flex gap-3 items-start">
                                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-500 shrink-0 shadow-sm">2</span>
                                        <span>Minta izin pembukaan kunci (Unlock).</span>
                                    </li>
                                    <li className="flex gap-3 items-start">
                                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-500 shrink-0 shadow-sm">3</span>
                                        <span>Klik tombol cek status di bawah.</span>
                                    </li>
                                </ol>
                            </div>

                            {onCheckStatus && (
                                <button 
                                    onClick={onCheckStatus} 
                                    className="w-full bg-slate-900 text-white font-bold py-4 px-6 rounded-xl hover:bg-black transition-all duration-300 shadow-lg shadow-slate-200 hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 mb-4 group"
                                >
                                    <ArrowPathIcon className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                                    Cek Status Izin
                                </button>
                            )}
                            
                            <button 
                                onClick={onFinish} 
                                className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors py-2"
                            >
                                Kembali ke Halaman Utama
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (result.status === 'in_progress') {
        return (
             <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4 animate-fade-in">
                <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl text-center border border-slate-100">
                    <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <h2 className="text-lg font-bold text-slate-800">Menyinkronkan Status</h2>
                    <p className="text-slate-500 mt-2 text-sm">Mohon tunggu sebentar...</p>
                    {onCheckStatus && (
                         <button onClick={onCheckStatus} className="mt-6 text-blue-600 font-bold hover:underline text-xs border border-blue-50 px-4 py-2 rounded-lg bg-blue-50/50">
                            Klik jika tidak berubah
                         </button>
                    )}
                </div>
            </div>
        );
    }

    if (result.status === 'pending_grading') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 animate-fade-in">
                <div className="w-full max-w-lg text-center">
                    <div className="bg-white p-10 rounded-3xl shadow-xl transform transition-all duration-500 animate-slide-in-up border border-slate-100">
                        <div className="flex justify-center mb-6">
                            <div className="bg-amber-50 p-4 rounded-2xl ring-1 ring-amber-100">
                                <ClockIcon className="w-12 h-12 text-amber-500" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 mb-2">Jawaban Tersimpan (Offline)</h1>
                        <p className="text-slate-500 mb-8 leading-relaxed">
                            Ujian selesai, namun nilai belum muncul karena Anda sedang offline.
                        </p>
                        
                        <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl text-sm text-blue-800 mb-8 text-left flex gap-4 items-start">
                            <WifiIcon className="w-5 h-5 shrink-0 mt-0.5"/> 
                            <div>
                                <span className="font-bold block mb-1">Sinkronisasi Diperlukan</span>
                                Segera hubungkan perangkat ke internet. Data akan terkirim otomatis dan nilai akan muncul.
                            </div>
                        </div>
                         <button 
                            onClick={onFinish} 
                            className="w-full bg-slate-900 text-white font-bold py-4 px-6 rounded-xl hover:bg-black transition-colors duration-300 shadow-lg"
                        >
                            Kembali ke Halaman Utama
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const showResult = config ? config.showResultToStudent : true;

    if (!showResult) {
        return (
             <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4 animate-fade-in">
                <div className="w-full max-w-lg text-center">
                    <div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-100">
                         <div className="flex justify-center mb-6">
                             <div className="bg-emerald-50 p-4 rounded-full ring-1 ring-emerald-100">
                                <CheckCircleIcon className="w-16 h-16 text-emerald-500" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-800 mb-2">Ujian Selesai!</h1>
                        <p className="text-slate-500 mb-8">Terima kasih, {result.student.fullName}. Jawaban Anda telah berhasil dikirim.</p>
                        
                        <div className="bg-slate-50 p-4 rounded-xl mb-8 border border-slate-100">
                            <p className="text-sm text-slate-500 font-medium">Hasil ujian akan diumumkan oleh guru Anda.</p>
                        </div>

                        <button 
                            onClick={onFinish} 
                            className="w-full bg-slate-900 text-white font-bold py-4 px-6 rounded-xl hover:bg-black transition-colors duration-300 shadow-lg"
                        >
                            Selesai & Keluar
                        </button>
                    </div>
                </div>
             </div>
        )
    }

    const scoreColorClass = result.score >= 75 ? 'text-emerald-500' : result.score >= 50 ? 'text-amber-500' : 'text-rose-500';
    const bgScoreClass = result.score >= 75 ? 'bg-emerald-50' : result.score >= 50 ? 'bg-amber-50' : 'bg-rose-50';

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4 animate-fade-in font-sans">
            <div className="w-full max-w-lg text-center">
                <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                    
                    <div className="mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-50 mb-4 shadow-sm border border-slate-100">
                            <CheckCircleIcon className="w-10 h-10 text-slate-800" />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Hasil Ujian</h1>
                        <p className="text-slate-500">Hi {result.student.fullName}, berikut adalah pencapaian Anda.</p>
                    </div>
                    
                    <div className={`${bgScoreClass} rounded-3xl p-8 mb-8 transition-colors duration-500`}>
                        <p className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-2">Nilai Akhir</p>
                        <p className={`text-7xl sm:text-8xl font-black ${scoreColorClass} tracking-tighter`}>{result.score}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <p className="text-2xl font-bold text-slate-800">{result.correctAnswers}</p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Benar</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <p className="text-2xl font-bold text-slate-800">{result.totalQuestions}</p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Soal</p>
                        </div>
                    </div>

                    <button 
                        onClick={onFinish} 
                        className="w-full bg-slate-900 text-white font-bold py-4 px-6 rounded-2xl hover:bg-black transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                        Selesai & Kembali
                    </button>
                    
                    <p className="text-[10px] text-slate-300 mt-6">
                        Hasil ini hanya dapat dilihat sekali.
                    </p>
                </div>
            </div>
        </div>
    );
};
