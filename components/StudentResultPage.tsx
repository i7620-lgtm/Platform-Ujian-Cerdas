import React, { useState } from 'react';
import type { Result, Exam, Question } from '../types';
import { CheckCircleIcon, LockClosedIcon, ExclamationTriangleIcon, ChevronDownIcon, ChevronUpIcon } from './Icons';

interface StudentResultPageProps {
  result: Result;
  exam: Exam; // Need full exam object for correct answers
  onFinish: () => void;
}

const normalize = (str: string) => (str || '').trim().toLowerCase();

export const StudentResultPage: React.FC<StudentResultPageProps> = ({ result, exam, onFinish }) => {
    const config = exam.config;
    const [expandedReview, setExpandedReview] = useState(false);

    // TAMPILAN KHUSUS: FORCE CLOSED (KECURANGAN/PELANGGARAN)
    if (result.status === 'force_closed') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FFF1F2] p-6 font-sans">
                <div className="w-full max-w-sm text-center animate-gentle-slide">
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-rose-200/50 border border-white relative overflow-hidden">
                        {/* Red Accent Bar */}
                        <div className="absolute top-0 left-0 w-full h-2 bg-rose-500"></div>

                        <div className="mb-8 mt-2">
                            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-rose-50 text-rose-500 mb-6 shadow-sm ring-4 ring-rose-50/50">
                                <LockClosedIcon className="w-12 h-12" />
                            </div>
                            <h1 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Akses Terkunci</h1>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed px-2">
                                Sistem mendeteksi aktivitas yang melanggar aturan ujian (seperti berpindah tab atau keluar aplikasi).
                            </p>
                        </div>

                        <div className="bg-rose-50 p-5 rounded-2xl mb-8 border border-rose-100 text-left relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 text-rose-100/50 transform rotate-12">
                                <ExclamationTriangleIcon className="w-24 h-24" />
                            </div>
                            <div className="relative z-10 flex items-start gap-3">
                                <ExclamationTriangleIcon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[10px] font-black text-rose-700 uppercase tracking-widest mb-1">Status: Ditangguhkan</p>
                                    <p className="text-xs text-rose-600/80 leading-relaxed font-medium">
                                        Jawaban Anda sejauh ini telah diamankan, namun Anda tidak dapat melanjutkan pengerjaan sendiri.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                             <p className="text-xs text-slate-400 font-medium border-t border-slate-50 pt-6">
                                Silakan lapor ke <span className="text-slate-700 font-bold">Guru / Pengawas</span> untuk membuka kembali akses ujian Anda.
                            </p>
                            
                            <button
                                onClick={onFinish}
                                className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-black transition-all shadow-lg hover:shadow-xl active:scale-[0.98] text-xs uppercase tracking-widest"
                            >
                                Kembali ke Halaman Utama
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 5. FITUR: UMUMKAN NILAI OTOMATIS (Show Result to Student)
    const showResult = config.showResultToStudent;

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-6 font-sans">
            <div className={`w-full ${expandedReview ? 'max-w-3xl' : 'max-w-sm'} text-center animate-gentle-slide transition-all duration-500`}>
                <div className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
                    {/* Minimal Top Decoration */}
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-orange-500"></div>
                    
                    <div className="mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 mb-6">
                            <CheckCircleIcon className="w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">Hasil Ujian</h1>
                        <p className="text-xs text-slate-500 font-medium">Terima kasih telah mengikuti evaluasi hari ini.</p>
                    </div>
                    
                    {showResult ? (
                        <div className="space-y-8">
                            <div className="bg-orange-50/50 rounded-3xl p-8 border border-orange-100">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-600 mb-2">Nilai Akhir</p>
                                <p className="text-7xl font-black text-orange-600 tracking-tighter">{result.score}</p>
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
                            
                            {/* 4. FITUR: TAMPILKAN KUNCI JAWABAN (Review Mode) */}
                            {config.showCorrectAnswer && (
                                <div className="pt-6 border-t border-slate-100">
                                    <button 
                                        onClick={() => setExpandedReview(!expandedReview)}
                                        className="text-sm font-bold text-slate-600 hover:text-orange-600 flex items-center justify-center gap-2 mx-auto py-2 px-4 rounded-xl hover:bg-slate-50 transition-all"
                                    >
                                        {expandedReview ? 'Tutup Pembahasan' : 'Lihat Pembahasan Soal'}
                                        {expandedReview ? <ChevronUpIcon className="w-4 h-4"/> : <ChevronDownIcon className="w-4 h-4"/>}
                                    </button>

                                    {expandedReview && (
                                        <div className="mt-6 space-y-4 text-left">
                                            {exam.questions.filter(q => q.questionType !== 'INFO').map((q, idx) => {
                                                const studentAns = result.answers[q.id] || '(Kosong)';
                                                const correctAns = q.correctAnswer || '-';
                                                const isCorrect = normalize(studentAns) === normalize(correctAns);

                                                // Simplifikasi hanya untuk Multiple Choice & Isian Singkat dulu untuk UI ini
                                                const isReviewable = ['MULTIPLE_CHOICE', 'FILL_IN_THE_BLANK'].includes(q.questionType);

                                                if (!isReviewable) return null; 

                                                return (
                                                    <div key={q.id} className={`p-4 rounded-2xl border ${isCorrect ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                                                        <div className="flex justify-between mb-2">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Soal {idx + 1}</span>
                                                            {isCorrect 
                                                                ? <span className="text-[10px] font-black uppercase text-emerald-600 bg-white px-2 py-0.5 rounded">Benar</span>
                                                                : <span className="text-[10px] font-black uppercase text-rose-600 bg-white px-2 py-0.5 rounded">Salah</span>
                                                            }
                                                        </div>
                                                        <div className="text-sm font-medium text-slate-800 mb-3" dangerouslySetInnerHTML={{__html: q.questionText}}></div>
                                                        
                                                        <div className="grid grid-cols-1 gap-2 text-xs">
                                                            <div className="flex flex-col">
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Jawaban Kamu:</span>
                                                                <span className={`font-bold ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`} dangerouslySetInnerHTML={{__html: studentAns}}></span>
                                                            </div>
                                                            {!isCorrect && (
                                                                <div className="flex flex-col mt-1">
                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Kunci Jawaban:</span>
                                                                    <span className="font-bold text-slate-700" dangerouslySetInnerHTML={{__html: correctAns}}></span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
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
