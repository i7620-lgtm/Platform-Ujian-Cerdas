
import React, { useMemo, useState } from 'react';
import type { Result, Exam, Question } from '../types';
import { CheckCircleIcon, LockClosedIcon, ChevronDownIcon, ChevronUpIcon, ExclamationTriangleIcon } from './Icons';
import { storageService } from '../services/storage';

interface StudentResultPageProps {
  result: Result;
  exam: Exam; 
  onFinish: () => void;
  onResume?: () => void;
}

const normalize = (str: string) => (str || '').trim().toLowerCase();

export const StudentResultPage: React.FC<StudentResultPageProps> = ({ result, exam, onFinish, onResume }) => {
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
                const sSet = new Set(studentAns.split(',').map(s=>s.trim()));
                const cSet = new Set(correctAns.split(',').map(s=>s.trim()));
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

    if (result.status === 'force_closed') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-rose-50 p-6">
                <div className="w-full max-w-sm text-center bg-white p-8 rounded-3xl shadow-xl border border-rose-100 animate-fade-in">
                    <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-rose-50/50">
                        <LockClosedIcon className="w-8 h-8" />
                    </div>
                    <h1 className="text-xl font-black text-slate-900 mb-2">Akses Terkunci</h1>
                    <p className="text-sm text-slate-500 mb-6 leading-relaxed">
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
                            className="w-full text-center text-xl font-mono font-bold tracking-[0.5em] py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-rose-400 focus:bg-white outline-none transition-all uppercase placeholder:tracking-normal placeholder:font-sans"
                            placeholder="4 ANGKA TOKEN"
                            maxLength={4}
                        />
                        {unlockError && <p className="text-xs font-bold text-rose-500 animate-pulse">{unlockError}</p>}
                        <button 
                            type="submit" 
                            disabled={isUnlocking || unlockToken.length !== 4}
                            className="w-full bg-rose-500 text-white font-bold py-3 rounded-xl hover:bg-rose-600 transition-all text-sm shadow-lg shadow-rose-200 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isUnlocking ? 'Membuka Akses...' : 'Buka Kunci'}
                        </button>
                    </form>

                    <button onClick={onFinish} className="text-xs font-bold text-slate-400 hover:text-slate-600">Kembali ke Beranda</button>
                </div>
            </div>
        );
    }

    const showResult = config.showResultToStudent;

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-6 font-sans relative overflow-hidden">
            {/* Elegant Discrepancy Notification */}
            {calculatedStats.hasDiscrepancy && (
                <div className="absolute top-6 inset-x-0 flex justify-center z-50 pointer-events-none">
                    <div className="bg-amber-50/90 backdrop-blur-md border border-amber-200 text-amber-700 px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3 max-w-md pointer-events-auto animate-gentle-slide">
                        <ExclamationTriangleIcon className="w-5 h-5 shrink-0" />
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider mb-0.5">Pembaruan Nilai</p>
                            <p className="text-xs opacity-90">Nilai disesuaikan otomatis dengan kunci jawaban terbaru.</p>
                        </div>
                    </div>
                </div>
            )}

            <div className={`w-full ${expandedReview ? 'max-w-3xl' : 'max-w-sm'} text-center animate-gentle-slide transition-all duration-500 relative z-10`}>
                <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white relative overflow-hidden">
                    
                    {/* Background decoration */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
                    
                    <div className="mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 text-emerald-500 mb-6 shadow-sm ring-4 ring-emerald-50/50">
                            <CheckCircleIcon className="w-10 h-10" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Ujian Selesai</h1>
                        <p className="text-sm text-slate-500 font-medium">Jawaban Anda telah berhasil disimpan.</p>
                    </div>
                    
                    {showResult ? (
                        <div className="space-y-8">
                            <div className="py-6 relative">
                                <span className="text-7xl font-black text-slate-800 tracking-tighter block scale-100 transition-transform">{calculatedStats.score}</span>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 block">Nilai Akhir</span>
                                {calculatedStats.hasDiscrepancy && (
                                    <span className="absolute top-2 right-1/2 translate-x-12 flex h-3 w-3">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                                    </span>
                                )}
                            </div>

                            <div className="flex justify-around border-t border-slate-50 pt-8">
                                <div className="text-center group cursor-default">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-emerald-500 transition-colors">Benar</p>
                                    <p className="text-3xl font-black text-slate-800 group-hover:text-emerald-600 transition-colors">{calculatedStats.correctAnswers}</p>
                                </div>
                                <div className="text-center group cursor-default">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-indigo-500 transition-colors">Total Soal</p>
                                    <p className="text-3xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{calculatedStats.totalQuestions}</p>
                                </div>
                            </div>
                            
                            {config.showCorrectAnswer && (
                                <div className="pt-8">
                                    <button 
                                        onClick={() => setExpandedReview(!expandedReview)}
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-6 py-3 rounded-xl transition-all inline-flex items-center gap-2 border border-transparent hover:border-indigo-100"
                                    >
                                        {expandedReview ? 'Tutup Pembahasan' : 'Lihat Pembahasan'}
                                        {expandedReview ? <ChevronUpIcon className="w-3 h-3"/> : <ChevronDownIcon className="w-3 h-3"/>}
                                    </button>

                                    {expandedReview && (
                                        <div className="mt-8 space-y-4 text-left border-t border-slate-50 pt-8 animate-fade-in">
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
                                                    <div key={q.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                                                        <div className="flex justify-between mb-3">
                                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Soal {idx + 1}</span>
                                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide ${isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{isCorrect ? 'Benar' : 'Salah'}</span>
                                                        </div>
                                                        <div className="text-sm font-medium text-slate-800 mb-4 leading-relaxed" dangerouslySetInnerHTML={{__html: q.questionText}}></div>
                                                        <div className="text-xs space-y-2 bg-white p-3 rounded-xl border border-slate-100">
                                                            <p className="flex justify-between"><span className="text-slate-400 font-bold">Jawaban Kamu:</span> <span className={isCorrect ? 'text-emerald-600 font-black' : 'text-rose-600 font-black'}>{studentAns}</span></p>
                                                            {!isCorrect && <p className="flex justify-between border-t border-slate-50 pt-2 mt-2"><span className="text-slate-400 font-bold">Kunci Jawaban:</span> <span className="font-black text-slate-700">{correctAns}</span></p>}
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
                        <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                            <p className="text-sm font-bold text-slate-600">Menunggu pengumuman nilai dari pengajar.</p>
                        </div>
                    )}

                    <button 
                        onClick={onFinish} 
                        className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-black transition-all shadow-lg shadow-slate-200 active:scale-[0.98] mt-10 text-xs uppercase tracking-widest"
                    >
                        Tutup Halaman
                    </button>
                </div>
            </div>
        </div>
    );
};
