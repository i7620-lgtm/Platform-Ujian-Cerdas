import React, { useState } from 'react';
import type { Result, Exam } from '../types';
import { CheckCircleIcon, LockClosedIcon, ChevronDownIcon, ChevronUpIcon } from './Icons';

interface StudentResultPageProps {
  result: Result;
  exam: Exam; 
  onFinish: () => void;
}

const normalize = (str: string) => (str || '').trim().toLowerCase();

export const StudentResultPage: React.FC<StudentResultPageProps> = ({ result, exam, onFinish }) => {
    const config = exam.config;
    const [expandedReview, setExpandedReview] = useState(false);

    if (result.status === 'force_closed') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-rose-50 p-6">
                <div className="w-full max-w-sm text-center bg-white p-8 rounded-3xl shadow-xl border border-rose-100">
                    <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <LockClosedIcon className="w-8 h-8" />
                    </div>
                    <h1 className="text-xl font-black text-slate-900 mb-2">Akses Terkunci</h1>
                    <p className="text-sm text-slate-500 mb-6">
                        Ujian dihentikan sistem karena terdeteksi aktivitas mencurigakan. Hubungi pengawas.
                    </p>
                    <button onClick={onFinish} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-black transition-all text-sm">Kembali</button>
                </div>
            </div>
        );
    }

    const showResult = config.showResultToStudent;

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-6 font-sans">
            <div className={`w-full ${expandedReview ? 'max-w-3xl' : 'max-w-sm'} text-center animate-gentle-slide transition-all duration-500`}>
                <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white">
                    
                    <div className="mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 text-emerald-500 mb-6">
                            <CheckCircleIcon className="w-10 h-10" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 mb-2">Ujian Selesai</h1>
                        <p className="text-sm text-slate-500 font-medium">Jawaban Anda telah berhasil disimpan.</p>
                    </div>
                    
                    {showResult ? (
                        <div className="space-y-8">
                            <div className="py-6">
                                <span className="text-6xl font-black text-slate-800 tracking-tighter block">{result.score}</span>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 block">Nilai Akhir</span>
                            </div>

                            <div className="flex justify-center gap-8 border-t border-slate-50 pt-6">
                                <div>
                                    <p className="text-xl font-bold text-slate-800">{result.correctAnswers}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Benar</p>
                                </div>
                                <div>
                                    <p className="text-xl font-bold text-slate-800">{result.totalQuestions}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Total Soal</p>
                                </div>
                            </div>
                            
                            {config.showCorrectAnswer && (
                                <div className="pt-6">
                                    <button 
                                        onClick={() => setExpandedReview(!expandedReview)}
                                        className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-full transition-all inline-flex items-center gap-2"
                                    >
                                        {expandedReview ? 'Tutup Pembahasan' : 'Lihat Pembahasan'}
                                        {expandedReview ? <ChevronUpIcon className="w-3 h-3"/> : <ChevronDownIcon className="w-3 h-3"/>}
                                    </button>

                                    {expandedReview && (
                                        <div className="mt-6 space-y-4 text-left border-t border-slate-50 pt-6">
                                            {exam.questions.filter(q => q.questionType !== 'INFO').map((q, idx) => {
                                                const studentAns = result.answers[q.id] || '-';
                                                const correctAns = q.correctAnswer || '-';
                                                const isCorrect = normalize(studentAns) === normalize(correctAns);
                                                if (!['MULTIPLE_CHOICE', 'FILL_IN_THE_BLANK'].includes(q.questionType)) return null; 

                                                return (
                                                    <div key={q.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                                        <div className="flex justify-between mb-2">
                                                            <span className="text-[10px] font-bold uppercase text-slate-400">Soal {idx + 1}</span>
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{isCorrect ? 'Benar' : 'Salah'}</span>
                                                        </div>
                                                        <div className="text-sm font-medium text-slate-800 mb-2" dangerouslySetInnerHTML={{__html: q.questionText}}></div>
                                                        <div className="text-xs space-y-1">
                                                            <p><span className="text-slate-400">Jawab:</span> <span className={isCorrect ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>{studentAns}</span></p>
                                                            {!isCorrect && <p><span className="text-slate-400">Kunci:</span> <span className="font-bold text-slate-700">{correctAns}</span></p>}
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
                        <div className="bg-slate-50 p-6 rounded-2xl">
                            <p className="text-sm font-medium text-slate-600">Menunggu pengumuman nilai dari pengajar.</p>
                        </div>
                    )}

                    <button 
                        onClick={onFinish} 
                        className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-black transition-all shadow-lg active:scale-[0.98] mt-8 text-sm uppercase tracking-widest"
                    >
                        Tutup Halaman
                    </button>
                </div>
            </div>
        </div>
    );
};
