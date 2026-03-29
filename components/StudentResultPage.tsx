
import React, { useMemo, useState, useEffect } from 'react';
import type { Result, Exam } from '../types';
import { CheckCircleIcon, LockClosedIcon, ChevronDownIcon, ChevronUpIcon, SunIcon, MoonIcon, ChartBarIcon, ArrowPathIcon } from './Icons';
import { storageService } from '../services/storage';
import { analyzeStudentPerformance, parseList, analyzeQuestionTypePerformance, sanitizeHtml, normalize } from './teacher/examUtils';
import { QRCodeCanvas } from 'qrcode.react';

interface StudentResultPageProps {
  result: Result;
  exam: Exam; 
  onFinish: () => void;
  onResume?: () => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
}

export const StudentResultPage: React.FC<StudentResultPageProps> = ({ result, exam, onFinish, onResume, isDarkMode, toggleTheme }) => {
    const config = exam.config;
    const [expandedReview, setExpandedReview] = useState(false);

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);
    
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
        } catch {
            setUnlockError("Gagal verifikasi. Cek koneksi.");
            setIsUnlocking(false);
        }
    };

    // REAL-TIME CALCULATION LOGIC
    const calculatedStats = useMemo(() => {
        const scorableQuestions = exam.questions.filter(q => q.questionType !== 'INFO');
        let totalScore = 0;
        let maxPossibleScore = 0;
        let correctCount = 0;
        let emptyCount = 0;

        scorableQuestions.forEach(q => {
            const weight = q.scoreWeight || 1;
            maxPossibleScore += weight;

            const ans = result.answers[q.id];
            if (!ans) {
                emptyCount++;
                return;
            }

            const studentAns = normalize(String(ans), q.questionType);
            const correctAns = normalize(String(q.correctAnswer || ''), q.questionType);
            let isCorrect = false;

            // Check if teacher has manually graded this question
            const manualGradeKey = `_grade_${q.id}`;
            if (result.answers[manualGradeKey]) {
                isCorrect = result.answers[manualGradeKey] === 'CORRECT';
            } else if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
                isCorrect = studentAns === correctAns;
            } 
            else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
                const sSet = new Set(parseList(String(ans)).map(a => normalize(a, q.questionType)));
                const cSet = new Set(parseList(String(q.correctAnswer || '')).map(a => normalize(a, q.questionType)));
                isCorrect = sSet.size === cSet.size && [...sSet].every(x => cSet.has(x));
            }
            else if (q.questionType === 'TRUE_FALSE') {
                try {
                    const ansObj = JSON.parse(ans);
                    isCorrect = q.trueFalseRows?.every((row, idx) => ansObj[idx] === row.answer) ?? false;
                } catch { /* ignore */ }
            }
            else if (q.questionType === 'MATCHING') {
                try {
                    const ansObj = JSON.parse(ans);
                    isCorrect = q.matchingPairs?.every((pair, idx) => ansObj[idx] === pair.right) ?? false;
                } catch { /* ignore */ }
            }

            if (isCorrect) {
                correctCount++;
                totalScore += weight;
            }
        });

        const finalScore = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
        
        return {
            score: result.score, // Use the score from the database
            calculatedScore: finalScore, // Keep calculated score for discrepancy check
            correctAnswers: result.correctAnswers ?? correctCount,
            totalQuestions: result.totalQuestions ?? scorableQuestions.length,
            wrongAnswers: scorableQuestions.length - correctCount - emptyCount,
            hasDiscrepancy: finalScore !== result.score // Check logic
        };
    }, [exam.questions, result.answers, result.score, result.correctAnswers, result.totalQuestions]);

    // NEW: Analytical Data for Diagnostic Card
    const analysisData = useMemo(() => analyzeStudentPerformance(exam, result), [exam, result]);
    const questionTypeStats = useMemo(() => analyzeQuestionTypePerformance(exam, result), [exam, result]);

    // Check if we are waiting for server-side score calculation
    const hasAutoGradable = useMemo(() => exam.questions.some(q => q.questionType !== 'INFO' && q.questionType !== 'ESSAY'), [exam.questions]);
    const isWaitingForServer = useMemo(() => {
        // 1. If status is not completed/force_closed, we are definitely waiting
        if (result.status === 'in_progress') return true;
        
        // 2. If score is 0 but we have auto-gradable questions and calculated score is > 0, we are definitely waiting for the server to update the score field.
        if (result.score === 0 && hasAutoGradable && (calculatedStats?.calculatedScore || 0) > 0) return true;
        
        // 3. If totalQuestions is 0 but exam has scorable questions, it means the server hasn't processed the result yet.
        const scorableCount = exam.questions.filter(q => q.questionType !== 'INFO').length;
        if (result.totalQuestions === 0 && scorableCount > 0) return true;

        return false;
    }, [result.score, result.status, result.totalQuestions, hasAutoGradable, calculatedStats?.calculatedScore, exam.questions]);

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

    if (!exam || !result) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-300">
                <div className="w-full max-w-md text-center bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 animate-fade-in">
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-indigo-50/50 dark:ring-indigo-900/20">
                        <CheckCircleIcon className="w-8 h-8" />
                    </div>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white mb-2">Kerja Bagus! Ujian Telah Selesai</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                        Tautan ini sudah tidak dapat diakses lagi karena ujian telah ditutup atau data telah diarsipkan oleh guru Anda untuk keperluan rekapitulasi nilai.
                        <br/><br/>
                        Jangan khawatir! Seluruh hasil ujian Anda telah tersimpan dengan aman dan rekapannya sekarang berada di tangan guru Anda.
                        <br/><br/>
                        Jika Anda ingin melihat kembali hasil ujian Anda, silakan hubungi guru mata pelajaran yang bersangkutan. Terus semangat belajarnya!
                    </p>
                    <button onClick={onFinish} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-all text-sm shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30">
                        Kembali ke Beranda
                    </button>
                </div>
            </div>
        );
    }

    const showResult = config.showResultToStudent;
    
    // REAL-TIME FALLBACK: If server score is 0 but client calculated > 0, use client score for display if we are waiting
    const displayScore = isWaitingForServer ? (calculatedStats?.calculatedScore || 0) : result.score;

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

            {/* Elegant Discrepancy Notification - REMOVED AS REQUESTED */}

            <div className={`w-full ${expandedReview ? 'max-w-full' : 'max-w-5xl'} text-center animate-gentle-slide transition-all duration-500 relative z-10`}>
                <div className="bg-white dark:bg-slate-900 p-5 md:p-8 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] dark:shadow-black/30 border border-white dark:border-slate-800 relative overflow-hidden">
                    
                    {/* Background decoration */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
                    
                    <div className="mb-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 dark:text-emerald-400 mb-4 shadow-sm ring-4 ring-emerald-50/50 dark:ring-emerald-900/10">
                            <CheckCircleIcon className="w-8 h-8" />
                        </div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">Ujian Selesai</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Jawaban Anda telah berhasil disimpan.</p>
                    </div>
                    
                    {showResult ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                                {/* SCORE CARD */}
                                <div className="lg:col-span-3 py-6 relative bg-emerald-50/30 dark:bg-emerald-900/10 rounded-3xl border border-emerald-100/50 dark:border-emerald-800/30 flex flex-col items-center justify-center">
                                    {isWaitingForServer ? (
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="relative">
                                                <ArrowPathIcon className="w-10 h-10 text-emerald-500 animate-spin" />
                                                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-emerald-600">...</span>
                                            </div>
                                            <p className="text-[10px] font-bold text-emerald-600 animate-pulse">Menghitung...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-5xl font-black text-slate-800 dark:text-slate-100 tracking-tighter block">{displayScore}</span>
                                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 block">Nilai Akhir</span>
                                            {calculatedStats.hasDiscrepancy && !isWaitingForServer && (
                                                <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
                                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                                                </span>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* STUDENT & EXAM DETAILS CARD */}
                                <div className="lg:col-span-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 text-left flex flex-col justify-center">
                                    <h3 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 pb-2 mb-3">
                                        Informasi Peserta
                                    </h3>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[11px]">
                                        <div className="col-span-2">
                                            <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase tracking-tighter">Nama Sekolah</p>
                                            <p className="font-bold text-slate-700 dark:text-slate-200 uppercase truncate leading-tight">{exam.authorSchool || result.student.schoolName || '-'}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase tracking-tighter">Nama Siswa</p>
                                            <p className="font-bold text-slate-700 dark:text-slate-200 uppercase truncate leading-tight">{result.student.fullName}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase tracking-tighter">Kelas / No</p>
                                            <p className="font-bold text-slate-700 dark:text-slate-200 uppercase leading-tight">{result.student.class} / {result.student.absentNumber}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase tracking-tighter">Mata Pelajaran</p>
                                            <p className="font-bold text-slate-700 dark:text-slate-200 uppercase truncate leading-tight">{exam.config.subject}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase tracking-tighter">Jenis Evaluasi</p>
                                            <p className="font-bold text-slate-700 dark:text-slate-200 uppercase truncate leading-tight">{exam.config.examType}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* QR CODE SECTION */}
                                <div className="lg:col-span-3 flex flex-col items-center justify-center p-5 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800">
                                    <div className="p-2.5 bg-white rounded-2xl shadow-sm border border-slate-100 mb-3">
                                        <QRCodeCanvas 
                                            value={`${window.location.origin}/result/${exam.code}/${encodeURIComponent(result.student.studentId)}`}
                                            size={160}
                                            level="H"
                                            includeMargin={false}
                                        />
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-bold text-center leading-tight uppercase tracking-tighter">Pindai Hasil</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* DIAGNOSTIC CARD */}
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 text-left space-y-4">
                                    <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <ChartBarIcon className="w-3.5 h-3.5"/> Analisis Kemampuan
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
                                                        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                            <div className={`h-full ${colorClass} transition-all duration-1000`} style={{width: `${stat.percentage}%`}}></div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 mt-2">
                                                <p className="text-[10px] italic text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                                                    "{analysisData.recommendation}"
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic">Tidak ada data kategori.</p>
                                    )}
                                </div>

                                {/* QUESTION TYPE ANALYSIS CARD */}
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 text-left space-y-4">
                                    <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <ChartBarIcon className="w-3.5 h-3.5"/> Analisis Jenis Soal
                                    </h3>
                                    
                                    {questionTypeStats.length > 0 ? (
                                        <div className="space-y-3">
                                            {questionTypeStats.map((stat) => {
                                                const colorClass = stat.percentage >= 80 ? 'bg-emerald-500' : stat.percentage >= 50 ? 'bg-amber-400' : 'bg-rose-500';
                                                return (
                                                    <div key={stat.type}>
                                                        <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                                                            <span>{stat.typeName}</span>
                                                            <span>{stat.percentage}%</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                            <div className={`h-full ${colorClass} transition-all duration-1000`} style={{width: `${stat.percentage}%`}}></div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic">Tidak ada data jenis soal.</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row items-center justify-end gap-6 border-t border-slate-50 dark:border-slate-800 pt-6">
                                
                                {config.showCorrectAnswer && (
                                    <button 
                                        onClick={() => setExpandedReview(!expandedReview)}
                                        className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 px-6 py-3 rounded-2xl transition-all inline-flex items-center gap-2 border-2 border-indigo-100 dark:border-indigo-900/30"
                                    >
                                        {expandedReview ? 'Tutup Pembahasan' : 'Lihat Pembahasan'}
                                        {expandedReview ? <ChevronUpIcon className="w-3 h-3"/> : <ChevronDownIcon className="w-3 h-3"/>}
                                    </button>
                                )}
                            </div>

                                    {expandedReview && (
                                        <div className="mt-8 space-y-4 text-left border-t border-slate-50 dark:border-slate-800 pt-8 animate-fade-in">
                                            {exam.questions.filter(q => q.questionType !== 'INFO').map((q, idx) => {
                                                const studentAns = result.answers[q.id] || '-';
                                                const correctAns = q.correctAnswer || '-';
                                                
                                                let isCorrect = false;
                                                const normalizedStudent = normalize(studentAns, q.questionType);
                                                const normalizedCorrect = normalize(correctAns, q.questionType);

                                                let displayStudentAns = studentAns;
                                                let displayCorrectAns = correctAns;

                                                if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
                                                    isCorrect = normalizedStudent === normalizedCorrect;
                                                } else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
                                                    const sSet = new Set(parseList(studentAns).map(a => normalize(a, q.questionType)));
                                                    const cSet = new Set(parseList(correctAns).map(a => normalize(a, q.questionType)));
                                                    isCorrect = sSet.size === cSet.size && [...sSet].every(x => cSet.has(x));
                                                    try {
                                                        const parsedStudent = parseList(studentAns);
                                                        if (parsedStudent.length > 0) displayStudentAns = parsedStudent.map(p => `• ${p}`).join('<br/>');
                                                        const parsedCorrect = parseList(correctAns);
                                                        if (parsedCorrect.length > 0) displayCorrectAns = parsedCorrect.map(p => `• ${p}`).join('<br/>');
                                                    } catch { /* ignore */ }
                                                } else if (q.questionType === 'TRUE_FALSE' || q.questionType === 'MATCHING') {
                                                     isCorrect = false;
                                                     try {
                                                         if (q.questionType === 'TRUE_FALSE') {
                                                             const ansObj = JSON.parse(studentAns);
                                                             isCorrect = q.trueFalseRows?.every((row, i) => ansObj[i] === row.answer) ?? false;
                                                             displayStudentAns = q.trueFalseRows?.map((r, i) => `• ${r.text.replace(/<[^>]*>/g, '')}: <strong>${ansObj[i] ? 'Benar' : 'Salah'}</strong>`).join('<br/>') || studentAns;
                                                             displayCorrectAns = q.trueFalseRows?.map((r) => `• ${r.text.replace(/<[^>]*>/g, '')}: <strong>${r.answer ? 'Benar' : 'Salah'}</strong>`).join('<br/>') || correctAns;
                                                         } else {
                                                             const ansObj = JSON.parse(studentAns);
                                                             isCorrect = q.matchingPairs?.every((pair, i) => ansObj[i] === pair.right) ?? false;
                                                             displayStudentAns = q.matchingPairs?.map((p, i) => `• ${p.left} → <strong>${ansObj[i] || '-'}</strong>`).join('<br/>') || studentAns;
                                                             displayCorrectAns = q.matchingPairs?.map((p) => `• ${p.left} → <strong>${p.right}</strong>`).join('<br/>') || correctAns;
                                                         }
                                                     } catch {
                                                         if (q.questionType === 'TRUE_FALSE') {
                                                             displayCorrectAns = q.trueFalseRows?.map((r) => `• ${r.text.replace(/<[^>]*>/g, '')}: <strong>${r.answer ? 'Benar' : 'Salah'}</strong>`).join('<br/>') || correctAns;
                                                         } else if (q.questionType === 'MATCHING') {
                                                             displayCorrectAns = q.matchingPairs?.map((p) => `• ${p.left} → <strong>${p.right}</strong>`).join('<br/>') || correctAns;
                                                         }
                                                     }
                                                }

                                                return (
                                                    <div key={q.id} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors">
                                                        <div className="flex justify-between mb-3">
                                                            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Soal {idx + 1}</span>
                                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide ${isCorrect ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'}`}>{isCorrect ? 'Benar' : 'Salah'}</span>
                                                        </div>
                                                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-4 leading-relaxed prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{__html: sanitizeHtml(q.questionText)}}></div>
                                                        <div className="text-xs space-y-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                                                            <div className="flex justify-between items-start gap-2">
                                                                <span className="text-slate-400 dark:text-slate-500 font-bold shrink-0">Jawaban Kamu:</span> 
                                                                <div className={`text-right font-black option-content [&_p]:inline ${isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`} dangerouslySetInnerHTML={{__html: sanitizeHtml(displayStudentAns)}}></div>
                                                            </div>
                                                            {!isCorrect && (
                                                                <div className="flex justify-between items-start border-t border-slate-50 dark:border-slate-800 pt-2 mt-2 gap-2">
                                                                    <span className="text-slate-400 dark:text-slate-500 font-bold shrink-0">Kunci Jawaban:</span> 
                                                                    <div className="text-right font-black text-slate-700 dark:text-slate-300 option-content [&_p]:inline" dangerouslySetInnerHTML={{__html: sanitizeHtml(displayCorrectAns)}}></div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
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
