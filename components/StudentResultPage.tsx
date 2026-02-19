
import React, { useMemo, useState } from 'react';
import type { Result, Exam, Question } from '../types';
import { CheckCircleIcon, LockClosedIcon, ChevronDownIcon, ChevronUpIcon, ExclamationTriangleIcon, SunIcon, MoonIcon, ChartBarIcon } from './Icons';
import { storageService } from '../services/storage';
import { analyzeStudentPerformance, parseList } from './teacher/examUtils';

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
    
    // Unlock State for Force Closed View
    const [unlockToken, setUnlockToken] = useState('');
    const [unlockError, setUnlockError] = useState('');
    const [isUnlocking, setIsUnlocking] = useState(false);

    const handleUnlockSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanToken = unlockToken.trim();
        
        // Validasi 4 Digit
        if (!cleanToken || cleanToken.length !== 4) {
            setUnlockError("Token harus 4 angka.");
            return;
        }
        
        setIsUnlocking(true);
        setUnlockError('');
        
        try {
            const success = await storageService.verifyUnlockToken(exam.code, result.student.studentId, cleanToken);
            if (success) {
                if (onResume) {
                    onResume();
                } else {
                    // Fallback if no resume handler provided
                    window.location.reload();
                }
            } else {
                setUnlockError("Token salah atau kadaluarsa.");
                setIsUnlocking(false); // Stop loading only if failed
            }
        } catch (err) {
            setUnlockError("Gagal verifikasi. Cek koneksi.");
            setIsUnlocking(false);
        }
    };

    // REAL-TIME CALCULATION LOGIC
    const calculatedStats = useMemo(() => {
        const scorableQuestions = exam.questions.filter(q => q.questionType !== 'INFO');
        let correct = 0;
        let empty = 0;

        scorableQuestions.forEach(q => {
            const ans = result.answers[q.id];
            if (!ans) {
                empty++;
                return;
            }

            const studentAns = normalize(String(ans));
            const correctAns = normalize(String(q.correctAnswer || ''));
            let isCorrect = false;

            if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
                isCorrect = studentAns === correctAns;
            } 
            else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
                const sSet = new Set(parseList(studentAns).map(normalize));
                const cSet = new Set(parseList(correctAns).map(normalize));
                isCorrect = sSet.size === cSet.size && [...sSet].every(x => cSet.has(x));
            }
            else if (q.questionType === 'TRUE_FALSE') {
                try {
                    const ansObj = JSON.parse(ans);
                    isCorrect = q.trueFalseRows?.every((row, idx) => ansObj[idx] === row.answer) ?? false;
                } catch(e) {}
            }
            else if (q.questionType === 'MATCHING') {
                try {
                    const ansObj = JSON.parse(ans);
                    isCorrect = q.matchingPairs?.every((pair, idx) => ansObj[idx] === pair.right) ?? false;
                } catch(e) {}
            } else if (q.questionType === 'ESSAY') {
                isCorrect = false; // Default until graded
            }

            if (isCorrect) correct++;
        });

        const total = scorableQuestions.length;
        const score = total > 0 ? Math.round((correct / total) * 100) : 0;
        
        return {
            score,
            correctAnswers: correct,
            totalQuestions: total,
            wrongAnswers: total - correct - empty,
            hasDiscrepancy: score !== result.score // Check logic
        };
    }, [exam.questions, result.answers, result.score]);

    // NEW: Analytical Data for Diagnostic Card
    const analysisData = useMemo(() => analyzeStudentPerformance(exam, result), [exam, result]);

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
                        <input 
                            type="text" 
                            inputMode="numeric"
                            value={unlockToken}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                setUnlockToken(val);
                            }}
                            className="w-full text-center text-xl font-mono font-bold tracking-[0.5em] py-3 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl focus:border-rose-400 dark:focus:border-rose-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all uppercase placeholder:tracking-normal placeholder:font-sans text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                            placeholder="4 ANGKA TOKEN"
                            maxLength={4}
                        />
                        {unlockError && <p className="text-xs font-bold text-rose-500 animate-pulse">{unlockError}</p>}
                        <button 
                            type="submit" 
                            disabled={isUnlocking || unlockToken.length !== 4}
                            className="w-full bg-rose-500 text-white font-bold py-3 rounded-xl hover:bg-rose-600 transition-all text-sm shadow-lg shadow-rose-200 dark:shadow-rose-900/30 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isUnlocking ? 'Membuka Akses...' : 'Buka Kunci'}
                        </button>
                    </form>

                    <button onClick={onFinish} className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">Kembali ke Beranda</button>
                </div>
            </div>
        );
    }

    const showResult = config.showResultToStudent;

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-slate-950 p-6 font-sans relative overflow-hidden transition-colors duration-300">
            {/* Theme Toggle Top Right */}
            {toggleTheme && (
                <div className="absolute top-6 right-6 z-50">
                    <button 
                        onClick={toggleTheme} 
                        className="p-2.5 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-md text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm border border-white/20 dark:border-slate-700"
                    >
                        {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                    </button>
                </div>
            )}

            {/* Elegant Discrepancy Notification */}
            {calculatedStats.hasDiscrepancy && (
                <div className="absolute top-6 inset-x-0 flex justify-center z-50 pointer-events-none">
                    <div className="bg-amber-50/90 dark:bg-amber-900/90 backdrop-blur-md border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-200 px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3 max-w-md pointer-events-auto animate-gentle-slide">
                        <ExclamationTriangleIcon className="w-5 h-5 shrink-0" />
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider mb-0.5">Pembaruan Nilai</p>
                            <p className="text-xs opacity-90">Nilai disesuaikan otomatis dengan kunci jawaban terbaru.</p>
                        </div>
                    </div>
                </div>
            )}

            <div className={`w-full ${expandedReview ? 'max-w-3xl' : 'max-w-sm'} text-center animate-gentle-slide transition-all duration-500 relative z-10`}>
                <div className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] dark:shadow-black/30 border border-white dark:border-slate-800 relative overflow-hidden">
                    
                    {/* Background decoration */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
                    
                    <div className="mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 dark:text-emerald-400 mb-6 shadow-sm ring-4 ring-emerald-50/50 dark:ring-emerald-900/10">
                            <CheckCircleIcon className="w-10 h-10" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Ujian Selesai</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Jawaban Anda telah berhasil disimpan.</p>
                    </div>
                    
                    {showResult ? (
                        <div className="space-y-8">
                            <div className="py-6 relative">
                                <span className="text-7xl font-black text-slate-800 dark:text-slate-100 tracking-tighter block scale-100 transition-transform">{calculatedStats.score}</span>
                                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2 block">Nilai Akhir</span>
                                {calculatedStats.hasDiscrepancy && (
                                    <span className="absolute top-2 right-1/2 translate-x-12 flex h-3 w-3">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                                    </span>
                                )}
                            </div>

                            {/* NEW: DIAGNOSTIC CARD */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 text-left space-y-4">
                                <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <ChartBarIcon className="w-4 h-4"/> Analisis Kemampuan
                                </h3>
                                
                                {analysisData.stats.length > 0 ? (
                                    <div className="space-y-3">
                                        {analysisData.stats.map((stat) => {
                                            const colorClass = stat.percentage >= 80 ? 'bg-emerald-500' : stat.percentage >= 50 ? 'bg-amber-400' : 'bg-rose-500';
                                            return (
                                                <div key={stat.name}>
                                                    <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                                                        <span>{stat.name}</span>
                                                        <span>{stat.percentage}%</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                        <div className={`h-full ${colorClass} transition-all duration-1000`} style={{width: `${stat.percentage}%`}}></div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 mt-2">
                                            <p className="text-xs italic text-slate-600 dark:text-slate-300 font-medium">
                                                "{analysisData.recommendation}"
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 italic">Tidak ada data kategori.</p>
                                )}
                            </div>

                            <div className="flex justify-around border-t border-slate-50 dark:border-slate-800 pt-8">
                                <div className="text-center group cursor-default">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-emerald-500 transition-colors">Benar</p>
                                    <p className="text-3xl font-black text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 transition-colors">{calculatedStats.correctAnswers}</p>
                                </div>
                                <div className="text-center group cursor-default">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-indigo-500 transition-colors">Total Soal</p>
                                    <p className="text-3xl font-black text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">{calculatedStats.totalQuestions}</p>
                                </div>
                            </div>
                            
                            {config.showCorrectAnswer && (
                                <div className="pt-8">
                                    <button 
                                        onClick={() => setExpandedReview(!expandedReview)}
                                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-800 px-6 py-3 rounded-xl transition-all inline-flex items-center gap-2 border border-transparent hover:border-indigo-100 dark:hover:border-slate-700"
                                    >
                                        {expandedReview ? 'Tutup Pembahasan' : 'Lihat Pembahasan'}
                                        {expandedReview ? <ChevronUpIcon className="w-3 h-3"/> : <ChevronDownIcon className="w-3 h-3"/>}
                                    </button>

                                    {expandedReview && (
                                        <div className="mt-8 space-y-4 text-left border-t border-slate-50 dark:border-slate-800 pt-8 animate-fade-in">
                                            {exam.questions.filter(q => q.questionType !== 'INFO').map((q, idx) => {
                                                const studentAns = result.answers[q.id] || '-';
                                                const correctAns = q.correctAnswer || '-';
                                                
                                                let isCorrect = false;
                                                const normalizedStudent = normalize(studentAns);
                                                const normalizedCorrect = normalize(correctAns);

                                                if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
                                                    isCorrect = normalizedStudent === normalizedCorrect;
                                                } else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
                                                    const sSet = new Set(parseList(normalizedStudent).map(normalize));
                                                    const cSet = new Set(parseList(normalizedCorrect).map(normalize));
                                                    isCorrect = sSet.size === cSet.size && [...sSet].every(x => cSet.has(x));
                                                } else if (q.questionType === 'TRUE_FALSE' || q.questionType === 'MATCHING') {
                                                     isCorrect = JSON.stringify(studentAns) === JSON.stringify(correctAns); 
                                                     try {
                                                         if (q.questionType === 'TRUE_FALSE') {
                                                             const ansObj = JSON.parse(studentAns);
                                                             isCorrect = q.trueFalseRows?.every((row, i) => ansObj[i] === row.answer) ?? false;
                                                         } else {
                                                             const ansObj = JSON.parse(studentAns);
                                                             isCorrect = q.matchingPairs?.every((pair, i) => ansObj[i] === pair.right) ?? false;
                                                         }
                                                     } catch(e) {}
                                                }

                                                if (!['MULTIPLE_CHOICE', 'FILL_IN_THE_BLANK'].includes(q.questionType)) return null; 

                                                return (
                                                    <div key={q.id} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors">
                                                        <div className="flex justify-between mb-3">
                                                            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Soal {idx + 1}</span>
                                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide ${isCorrect ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'}`}>{isCorrect ? 'Benar' : 'Salah'}</span>
                                                        </div>
                                                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-4 leading-relaxed prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{__html: q.questionText}}></div>
                                                        <div className="text-xs space-y-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                                                            <div className="flex justify-between items-start gap-2">
                                                                <span className="text-slate-400 dark:text-slate-500 font-bold shrink-0">Jawaban Kamu:</span> 
                                                                <div className={`text-right font-black option-content ${isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`} dangerouslySetInnerHTML={{__html: studentAns}}></div>
                                                            </div>
                                                            {!isCorrect && (
                                                                <div className="flex justify-between items-start border-t border-slate-50 dark:border-slate-800 pt-2 mt-2 gap-2">
                                                                    <span className="text-slate-400 dark:text-slate-500 font-bold shrink-0">Kunci Jawaban:</span> 
                                                                    <div className="text-right font-black text-slate-700 dark:text-slate-300 option-content" dangerouslySetInnerHTML={{__html: correctAns}}></div>
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
                        <div className="bg-slate-50 dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700">
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Menunggu pengumuman nilai dari pengajar.</p>
                        </div>
                    )}

                    <button 
                        onClick={onFinish} 
                        className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-black dark:hover:bg-indigo-700 transition-all shadow-lg shadow-slate-200 dark:shadow-indigo-900/30 active:scale-[0.98] mt-10 text-xs uppercase tracking-widest"
                    >
                        Tutup Halaman
                    </button>
                </div>
            </div>
        </div>
    );
};
