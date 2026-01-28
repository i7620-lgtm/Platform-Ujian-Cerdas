
import React, { useState, useEffect, useCallback } from 'react';
import type { Exam, Student, Result, Question } from '../types';
import { ClockIcon, CheckCircleIcon, ListBulletIcon, ArrowLeftIcon, ArrowPathIcon } from './Icons';

interface StudentExamPageProps {
  exam: Exam;
  student: Student;
  initialData?: Result | null;
  onSubmit: (answers: Record<string, string>, timeLeft: number) => void;
  onUpdate?: (answers: Record<string, string>, timeLeft: number) => void;
}

export const StudentExamPage: React.FC<StudentExamPageProps> = ({ exam, student, initialData, onSubmit, onUpdate }) => {
    const [answers, setAnswers] = useState<Record<string, string>>(initialData?.answers || {});
    const [timeLeft, setTimeLeft] = useState(exam.config.timeLimit * 60);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastSaved, setLastSaved] = useState<number | null>(null);

    // Timer Logic
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleAnswer = (qId: string, val: string) => {
        const newAnswers = { ...answers, [qId]: val };
        setAnswers(newAnswers);
        setLastSaved(Date.now());
        onUpdate?.(newAnswers, timeLeft);
    };

    const handleSubmit = async (auto = false) => {
        if (!auto && !confirm("Apakah Anda yakin ingin mengumpulkan semua jawaban sekarang?")) return;
        setIsSubmitting(true);
        await onSubmit(answers, timeLeft);
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const answeredCount = Object.keys(answers).filter(key => answers[key] && answers[key] !== "").length;
    const totalQuestions = exam.questions.filter(q => q.questionType !== 'INFO').length;
    const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

    // --- RENDERER PER JENIS SOAL ---

    const renderQuestionContent = (q: Question) => {
        const currentAnswer = answers[q.id] || "";

        switch (q.questionType) {
            case 'MULTIPLE_CHOICE':
                return (
                    <div className="grid grid-cols-1 gap-3 mt-6">
                        {q.options?.map((opt, i) => {
                            const isSelected = currentAnswer === opt;
                            return (
                                <button
                                    key={i}
                                    onClick={() => handleAnswer(q.id, opt)}
                                    className={`group flex items-center gap-4 p-5 rounded-2xl border transition-all duration-300 text-left
                                        ${isSelected 
                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                                            : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-indigo-200 hover:bg-white'}`}
                                >
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                                        ${isSelected ? 'border-white bg-white/20' : 'border-slate-200 bg-white'}`}>
                                        {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                    </div>
                                    <div className="text-sm font-semibold prose-sm prose-slate" dangerouslySetInnerHTML={{ __html: opt }}></div>
                                </button>
                            );
                        })}
                    </div>
                );

            case 'COMPLEX_MULTIPLE_CHOICE':
                const selectedOptions = currentAnswer ? currentAnswer.split('|||') : [];
                const toggleOption = (opt: string) => {
                    let next;
                    if (selectedOptions.includes(opt)) {
                        next = selectedOptions.filter(o => o !== opt);
                    } else {
                        next = [...selectedOptions, opt];
                    }
                    handleAnswer(q.id, next.join('|||'));
                };
                return (
                    <div className="grid grid-cols-1 gap-3 mt-6">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Pilih satu atau lebih jawaban:</p>
                        {q.options?.map((opt, i) => {
                            const isSelected = selectedOptions.includes(opt);
                            return (
                                <button
                                    key={i}
                                    onClick={() => toggleOption(opt)}
                                    className={`group flex items-center gap-4 p-5 rounded-2xl border transition-all duration-300 text-left
                                        ${isSelected 
                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                                            : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-indigo-200 hover:bg-white'}`}
                                >
                                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 transition-all
                                        ${isSelected ? 'border-white bg-white/20' : 'border-slate-200 bg-white'}`}>
                                        {isSelected && <CheckCircleIcon className="w-4 h-4 text-white" />}
                                    </div>
                                    <div className="text-sm font-semibold prose-sm prose-slate" dangerouslySetInnerHTML={{ __html: opt }}></div>
                                </button>
                            );
                        })}
                    </div>
                );

            case 'TRUE_FALSE':
                const tfAnswers = currentAnswer ? JSON.parse(currentAnswer) : {};
                const setTF = (rowIdx: number, val: boolean) => {
                    const next = { ...tfAnswers, [rowIdx]: val };
                    handleAnswer(q.id, JSON.stringify(next));
                };
                return (
                    <div className="mt-6 space-y-3">
                        {q.trueFalseRows?.map((row, i) => (
                            <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <span className="text-sm font-medium text-slate-700">{row.text}</span>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setTF(i, true)}
                                        className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-xs font-bold transition-all border ${tfAnswers[i] === true ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-200'}`}
                                    >
                                        Benar
                                    </button>
                                    <button 
                                        onClick={() => setTF(i, false)}
                                        className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-xs font-bold transition-all border ${tfAnswers[i] === false ? 'bg-rose-500 border-rose-500 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-rose-200'}`}
                                    >
                                        Salah
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                );

            case 'MATCHING':
                const matchAnswers = currentAnswer ? JSON.parse(currentAnswer) : {};
                const setMatch = (leftItem: string, rightValue: string) => {
                    const next = { ...matchAnswers, [leftItem]: rightValue };
                    handleAnswer(q.id, JSON.stringify(next));
                };
                // Get all right side options for the dropdown
                const rightOptions = q.matchingPairs?.map(p => p.right) || [];
                return (
                    <div className="mt-6 space-y-3">
                        {q.matchingPairs?.map((pair, i) => (
                            <div key={i} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                <div className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700">
                                    {pair.left}
                                </div>
                                <div className="hidden sm:block text-slate-300">➜</div>
                                <div className="flex-1 relative">
                                    <select 
                                        value={matchAnswers[pair.left] || ""}
                                        onChange={(e) => setMatch(pair.left, e.target.value)}
                                        className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl text-sm font-semibold text-indigo-600 focus:border-indigo-300 outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="">Pilih Pasangan...</option>
                                        {rightOptions.map((opt, idx) => (
                                            <option key={idx} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <ArrowPathIcon className="w-4 h-4 rotate-90" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                );

            case 'FILL_IN_THE_BLANK':
                return (
                    <div className="mt-6">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Ketik Jawaban Anda:</label>
                        <input 
                            type="text"
                            value={currentAnswer}
                            onChange={(e) => handleAnswer(q.id, e.target.value)}
                            placeholder="Jawaban singkat..."
                            className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-300 outline-none transition-all font-bold text-indigo-600"
                        />
                    </div>
                );

            case 'ESSAY':
                return (
                    <div className="mt-6">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Tulis Jawaban Lengkap:</label>
                        <textarea 
                            value={currentAnswer}
                            onChange={(e) => handleAnswer(q.id, e.target.value)}
                            placeholder="Ketik uraian jawaban Anda di sini..."
                            className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:bg-white focus:border-indigo-300 outline-none transition-all font-medium text-slate-700 min-h-[200px] leading-relaxed"
                        />
                    </div>
                );

            case 'INFO':
                return (
                    <div className="mt-4 p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-indigo-800 text-sm leading-relaxed italic">
                        Bagian ini adalah informasi atau teks bacaan pendukung. Silakan baca dengan seksama sebelum melanjutkan ke soal berikutnya.
                    </div>
                );

            default:
                return <div className="text-rose-500 font-bold p-4">Tipe soal tidak didukung.</div>;
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFEFF] pb-40 font-sans selection:bg-indigo-100 selection:text-indigo-900">
            {/* Elegant Header with Sticky Progress */}
            <header className="sticky top-0 z-[60] bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm">
                <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                             <span className="font-black text-lg">{exam.config.subject.charAt(0)}</span>
                        </div>
                        <div>
                            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">{exam.config.subject}</h2>
                            <p className="text-sm font-extrabold text-slate-800 truncate max-w-[150px] sm:max-w-xs">{student.fullName}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl border transition-all duration-500 ${timeLeft < 300 ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse shadow-lg shadow-rose-100' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                            <ClockIcon className="w-4 h-4" />
                            <span className="font-mono font-black text-base tracking-widest tabular-nums">{formatTime(timeLeft)}</span>
                        </div>
                    </div>
                </div>
                
                {/* Visual Progress Bar */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-50">
                    <div 
                        className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.5)] transition-all duration-1000 ease-out" 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 pt-12 space-y-12">
                {exam.questions.map((q, idx) => {
                    const isAnswered = answers[q.id] && answers[q.id] !== "";
                    const questionNumber = exam.questions.slice(0, idx).filter(prevQ => prevQ.questionType !== 'INFO').length + 1;

                    return (
                        <section 
                            key={q.id} 
                            id={q.id}
                            className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.03)] p-8 md:p-12 animate-fade-in relative transition-all hover:shadow-xl hover:shadow-slate-200/20"
                        >
                            <div className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center text-xs font-black">
                                            {q.questionType === 'INFO' ? 'i' : String(questionNumber).padStart(2, '0')}
                                        </span>
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
                                            {q.questionType === 'INFO' ? 'Informasi Penting' : 'Pertanyaan'}
                                        </span>
                                    </div>
                                    {isAnswered && (
                                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-100/50">
                                            <CheckCircleIcon className="w-3.5 h-3.5"/> Tersimpan
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-6">
                                    <div 
                                        className="text-lg font-medium text-slate-800 leading-relaxed prose prose-slate max-w-none" 
                                        dangerouslySetInnerHTML={{ __html: q.questionText }}
                                    ></div>
                                    
                                    {renderQuestionContent(q)}
                                </div>
                            </div>
                        </section>
                    );
                })}

                <div className="pt-10 pb-20 text-center">
                    <div className="inline-flex p-2 bg-indigo-50 rounded-full mb-4">
                         <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
                    </div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Akhir dari lembar soal</p>
                </div>
            </main>

            {/* Floating Modern Action Navigation */}
            <div className="fixed bottom-8 left-0 w-full px-6 flex justify-center pointer-events-none z-[70]">
                <nav className="bg-slate-900/95 backdrop-blur-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] rounded-[2.5rem] px-8 py-5 flex items-center gap-12 border border-white/10 pointer-events-auto transition-all hover:-translate-y-1">
                    <div className="hidden sm:flex flex-col text-left">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Kemajuan</p>
                        <p className="text-xl font-black text-white leading-none">
                            {answeredCount} <span className="text-white/20 mx-1">/</span> {totalQuestions}
                        </p>
                    </div>

                    <div className="h-10 w-px bg-white/10 hidden sm:block"></div>
                    
                    <button 
                        onClick={() => handleSubmit(false)}
                        disabled={isSubmitting}
                        className="bg-indigo-500 text-white px-10 py-4 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-indigo-400 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-3 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>Selesaikan Ujian <CheckCircleIcon className="w-4 h-4"/></>
                        )}
                    </button>
                </nav>
            </div>
        </div>
    );
};
