import React from 'react';
import type { Result, ExamConfig } from '../types';
import { CheckCircleIcon, WifiIcon, ClockIcon } from './Icons';

interface StudentResultPageProps {
  result: Result;
  config?: ExamConfig;
  onFinish: () => void;
}

export const StudentResultPage: React.FC<StudentResultPageProps> = ({ result, config, onFinish }) => {
    
    const showResult = config ? config.showResultToStudent : true;

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-6 font-sans">
            <div className="w-full max-w-sm text-center animate-gentle-slide">
                <div className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
                    {/* Minimal Top Decoration */}
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-500"></div>
                    
                    <div className="mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 mb-6">
                            <CheckCircleIcon className="w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">Hasil Ujian</h1>
                        <p className="text-xs text-slate-500 font-medium">Terima kasih telah mengikuti evaluasi hari ini.</p>
                    </div>
                    
                    {showResult ? (
                        <div className="space-y-8">
                            <div className="bg-brand-50/50 rounded-3xl p-8 border border-brand-100">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600 mb-2">Nilai Akhir</p>
                                <p className="text-7xl font-black text-brand-600 tracking-tighter">{result.score}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                    <p className="text-xl font-bold text-slate-800">{result.correctAnswers}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Benar</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                    <p className="text-xl font-bold text-slate-800">{result.totalQuestions}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Soal</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-50 p-6 rounded-2xl mb-8">
                            <p className="text-sm font-medium text-slate-600">Jawaban Anda berhasil disimpan. Hasil akan diumumkan oleh guru.</p>
                        </div>
                    )}

                    <button 
                        onClick={onFinish} 
                        className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-black transition-all shadow-lg active:scale-[0.98] mt-8"
                    >
                        Tutup & Selesai
                    </button>
                    
                    <p className="text-[10px] text-slate-300 mt-8 font-medium">
                        Disimpan pada: {new Date(result.timestamp || Date.now()).toLocaleTimeString()}
                    </p>
                </div>
            </div>
        </div>
    );
};
