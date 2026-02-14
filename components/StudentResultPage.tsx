
import React, { useMemo, useState } from 'react';
import type { Result, Exam } from '../types';
import { CheckCircleIcon, LockClosedIcon, ChevronDownIcon, ChevronUpIcon, ExclamationTriangleIcon, SunIcon, MoonIcon, LightBulbIcon, ChartBarIcon } from './Icons';
import { storageService } from '../services/storage';
import { analyzeExamResult, DiagnosticResult } from './teacher/AnalyticsView';

interface StudentResultPageProps {
  result: Result;
  exam: Exam; 
  onFinish: () => void;
  onResume?: () => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
}

const normalize = (str: string) => (str || '').trim().toLowerCase();

export const StudentResultPage: React.FC<StudentResultPageProps> = ({ result, exam, onFinish, onResume, isDarkMode, toggleTheme }) => {
    const config = exam.config;
    const [expandedReview, setExpandedReview] = useState(false);
    
    // Unlock State
    const [unlockToken, setUnlockToken] = useState('');
    const [unlockError, setUnlockError] = useState('');
    const [isUnlocking, setIsUnlocking] = useState(false);

    // --- INTEGRASI MESIN DIAGNOSTIK ---
    const diagnostic: DiagnosticResult = useMemo(() => {
        return analyzeExamResult(exam, result);
    }, [exam, result]);

    const handleUnlockSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanToken = unlockToken.trim();
        if (!cleanToken || cleanToken.length !== 4) {
            setUnlockError("Token harus 4 angka.");
            return;
        }
        setIsUnlocking(true);
        setUnlockError('');
        try {
            const success = await storageService.verifyUnlockToken(exam.code, result.student.studentId, cleanToken);
            if (success) {
                if (onResume) onResume();
                else window.location.reload();
            } else {
                setUnlockError("Token salah atau kadaluarsa.");
                setIsUnlocking(false);
            }
        } catch (err) {
            setUnlockError("Gagal verifikasi. Cek koneksi.");
            setIsUnlocking(false);
        }
    };

    if (result.status === 'force_closed') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-rose-50 dark:bg-rose-950 p-6 transition-colors duration-300">
                <div className="w-full max-w-sm text-center bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-rose-100 dark:border-rose-900 animate-fade-in">
                    <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-rose-50/50 dark:ring-rose-900/20">
                        <LockClosedIcon className="w-8 h-8" />
                    </div>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white mb-2">Akses Terkunci</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                        Sesi Anda dihentikan. <br/>
                        Masukkan <strong>Token Guru</strong> untuk membuka kembali akses ujian ini.
                    </p>
                    <form onSubmit={handleUnlockSubmit} className="mb-6 space-y-3">
                        <input type="text" inputMode="numeric" value={unlockToken} onChange={(e) => { const val = e.target.value.replace(/\D/g, '').slice(0, 4); setUnlockToken(val); }} className="w-full text-center text-xl font-mono font-bold tracking-[0.5em] py-3 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl focus:border-rose-400 dark:focus:border-rose-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all uppercase placeholder:tracking-normal placeholder:font-sans text-slate-900 dark:text-slate-100 placeholder:text-slate-400" placeholder="4 ANGKA TOKEN" maxLength={4} />
                        {unlockError && <p className="text-xs font-bold text-rose-500 animate-pulse">{unlockError}</p>}
                        <button type="submit" disabled={isUnlocking || unlockToken.length !== 4} className="w-full bg-rose-500 text-white font-bold py-3 rounded-xl hover:bg-rose-600 transition-all text-sm shadow-lg shadow-rose-200 dark:shadow-rose-900/30 disabled:opacity-70 disabled:cursor-not-allowed">{isUnlocking ? 'Membuka Akses...' : 'Buka Kunci'}</button>
                    </form>
                    <button onClick={onFinish} className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">Kembali ke Beranda</button>
                </div>
            </div>
        );
    }

    const showResult = config.showResultToStudent;

    return (
        <div className="min-h-screen flex flex-col items-center bg-[#F8FAFC] dark:bg-slate-950 p-6 font-sans relative overflow-x-hidden transition-colors duration-300">
            {toggleTheme && (
                <div className="absolute top-6 right-6 z-50">
                    <button onClick={toggleTheme} className="p-2.5 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-md text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm border border-white/20 dark:border-slate-700">{isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}</button>
                </div>
            )}

            <div className="w-full max-w-2xl animate-gentle-slide relative z-10 pt-10 pb-20">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 dark:text-emerald-400 mb-4 shadow-sm ring-4 ring-emerald-50/50 dark:ring-emerald-900/10">
                        <CheckCircleIcon className="w-10 h-10" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Ujian Selesai</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Jawaban Anda telah berhasil disimpan.</p>
                </div>

                {showResult ? (
                    <div className="space-y-6">
                        {/* 1. HERO SCORE CARD */}
                        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Nilai Akhir</span>
                            <span className="text-8xl font-black text-slate-800 dark:text-slate-100 tracking-tighter block mb-2">{diagnostic.score}</span>
                            
                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide border ${diagnostic.recommendation.color}`}>
                                <LightBulbIcon className="w-4 h-4" />
                                {diagnostic.recommendation.status}
                            </div>
                        </div>

                        {/* 2. REKOMENDASI TINDAKAN */}
                        <div className={`bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border-l-4 ${diagnostic.score <= 45 ? 'border-l-rose-500' : diagnostic.score <= 75 ? 'border-l-orange-500' : 'border-l-emerald-500'} border-y border-r border-slate-100 dark:border-slate-800`}>
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-2">
                                <LightBulbIcon className={`w-5 h-5 ${diagnostic.score <= 45 ? 'text-rose-500' : diagnostic.score <= 75 ? 'text-orange-500' : 'text-emerald-500'}`}/>
                                {diagnostic.recommendation.title}
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                                {diagnostic.recommendation.description}
                            </p>
                            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Rekomendasi:</p>
                                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{diagnostic.recommendation.actionItem}</p>
                            </div>
                        </div>

                        {/* 3. BREAKDOWN KATEGORI */}
                        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
                                <ChartBarIcon className="w-5 h-5 text-indigo-500"/>
                                Penguasaan Materi
                            </h3>
                            <div className="space-y-5">
                                {diagnostic.categories.map((cat, idx) => (
                                    <div key={idx}>
                                        <div className="flex justify-between text-xs font-bold mb-2">
                                            <span className="text-slate-600 dark:text-slate-300">{cat.name}</span>
                                            <span className={cat.score >= 75 ? 'text-emerald-600' : cat.score >= 45 ? 'text-orange-500' : 'text-rose-500'}>{cat.score}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-1000 ${cat.score >= 75 ? 'bg-emerald-500' : cat.score >= 45 ? 'bg-orange-400' : 'bg-rose-500'}`} 
                                                style={{ width: `${cat.score}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                                {diagnostic.categories.length === 0 && <p className="text-xs text-slate-400 italic text-center">Tidak ada data kategori.</p>}
                            </div>
                        </div>

                        {/* 4. BUTTONS */}
                        <div className="flex flex-col gap-3 pt-4">
                            {config.showCorrectAnswer && (
                                <button 
                                    onClick={() => setExpandedReview(!expandedReview)}
                                    className="w-full py-4 rounded-xl font-bold text-sm bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors flex items-center justify-center gap-2"
                                >
                                    {expandedReview ? 'Tutup Pembahasan' : 'Lihat Pembahasan'}
                                    {expandedReview ? <ChevronUpIcon className="w-4 h-4"/> : <ChevronDownIcon className="w-4 h-4"/>}
                                </button>
                            )}
                            
                            <button onClick={onFinish} className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-black dark:hover:bg-indigo-700 transition-all shadow-lg active:scale-[0.98] text-xs uppercase tracking-widest">
                                Kembali ke Halaman Utama
                            </button>
                        </div>

                        {/* REVIEW SECTION */}
                        {expandedReview && (
                            <div className="mt-8 space-y-4 text-left animate-fade-in">
                                {exam.questions.filter(q => q.questionType !== 'INFO').map((q, idx) => {
                                    const studentAns = result.answers[q.id] || '-';
                                    const correctAns = q.correctAnswer || '-';
                                    
                                    let isCorrect = false;
                                    const normalizedStudent = normalize(studentAns);
                                    const normalizedCorrect = normalize(correctAns);

                                    if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
                                        isCorrect = normalizedStudent === normalizedCorrect;
                                    } else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
                                        const sSet = new Set(normalizedStudent.split(',').map(s=>s.trim()));
                                        const cSet = new Set(normalizedCorrect.split(',').map(s=>s.trim()));
                                        isCorrect = sSet.size === cSet.size && [...sSet].every(x => cSet.has(x));
                                    } else {
                                        // Simplified check for other types in student view
                                        isCorrect = studentAns === correctAns; 
                                    }

                                    if (!['MULTIPLE_CHOICE', 'FILL_IN_THE_BLANK'].includes(q.questionType)) return null; 

                                    return (
                                        <div key={q.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                            <div className="flex justify-between mb-3">
                                                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Soal {idx + 1}</span>
                                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide ${isCorrect ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'}`}>{isCorrect ? 'Benar' : 'Salah'}</span>
                                            </div>
                                            <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-4 leading-relaxed" dangerouslySetInnerHTML={{__html: q.questionText}}></div>
                                            <div className="text-xs space-y-2 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                                                <p className="flex justify-between"><span className="text-slate-400 dark:text-slate-500 font-bold">Jawaban Kamu:</span> <span className={isCorrect ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-rose-600 dark:text-rose-400 font-black'}>{studentAns}</span></p>
                                                {!isCorrect && <p className="flex justify-between border-t border-slate-100 dark:border-slate-700 pt-2 mt-2"><span className="text-slate-400 dark:text-slate-500 font-bold">Kunci Jawaban:</span> <span className="font-black text-slate-700 dark:text-slate-300">{correctAns}</span></p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 text-center">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <LockClosedIcon className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-white mb-2">Menunggu Hasil</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Guru belum mengumumkan nilai untuk ujian ini. Silakan cek kembali nanti.</p>
                        <button onClick={onFinish} className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-black dark:hover:bg-indigo-700 transition-all text-xs uppercase tracking-widest">
                            Kembali ke Beranda
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
