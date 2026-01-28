import React, { useState, useEffect } from 'react';
import type { Exam, Student, Result, Question } from '../types';
import { ClockIcon, CheckCircleIcon, ArrowPathIcon, PencilIcon, CheckIcon } from './Icons';

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
        onUpdate?.(newAnswers, timeLeft);
    };

    // Handler untuk Pilihan Ganda Kompleks (Multi-Select)
    const handleComplexChoice = (qId: string, option: string) => {
        const current = answers[qId] ? answers[qId].split(',') : [];
        let updated;
        if (current.includes(option)) {
            updated = current.filter(o => o !== option);
        } else {
            updated = [...current, option];
        }
        handleAnswer(qId, updated.join(','));
    };

    // Handler untuk Benar / Salah
    const handleTrueFalse = (qId: string, rowIndex: number, value: boolean) => {
        let current: Record<string, boolean> = {};
        try { 
            current = JSON.parse(answers[qId] || '{}'); 
        } catch(e) { current = {}; }
        current[rowIndex] = value;
        handleAnswer(qId, JSON.stringify(current));
    };

    // Handler untuk Menjodohkan
    const handleMatching = (qId: string, leftItem: string, rightValue: string) => {
        let current: Record<string, string> = {};
        try { 
            current = JSON.parse(answers[qId] || '{}'); 
        } catch(e) { current = {}; }
        current[leftItem] = rightValue;
        handleAnswer(qId, JSON.stringify(current));
    };

    const handleSubmit = async (auto = false) => {
        if (!auto && !confirm("Kumpulkan semua jawaban sekarang?")) return;
        setIsSubmitting(true);
        await onSubmit(answers, timeLeft);
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const isAnswered = (q: Question) => {
        const val = answers[q.id];
        if (!val) return false;
        if (q.questionType === 'TRUE_FALSE' || q.questionType === 'MATCHING') {
            try {
                const parsed = JSON.parse(val);
                return Object.keys(parsed).length > 0;
            } catch(e) { return false; }
        }
        return val !== "";
    };

    const answeredCount = exam.questions.filter(q => q.questionType !== 'INFO' && isAnswered(q)).length;
    const totalQuestions = exam.questions.filter(q => q.questionType !== 'INFO').length;
    const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

    return (
        <div className="min-h-screen bg-white pb-32 font-sans selection:bg-brand-100">
            {/* Header Modern dengan Progress */}
            <header className="sticky top-0 z-[60] bg-white/90 backdrop-blur-xl border-b border-slate-100">
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-brand-100">
                             {exam.config.subject.charAt(0)}
                        </div>
                        <div className="hidden sm:block">
                            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{exam.config.subject}</h2>
                            <p className="text-sm font-bold text-slate-800 truncate max-w-[180px]">{student.fullName}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-500 shadow-sm ${timeLeft < 300 ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                            <ClockIcon className="w-4 h-4" />
                            <span className="font-mono font-black text-sm tracking-widest tabular-nums">{formatTime(timeLeft)}</span>
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-[3px] bg-slate-50">
                    <div className="h-full bg-brand-500 transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-6 pt-12 space-y-16">
                {exam.questions.map((q, idx) => {
                    const answered = isAnswered(q);
                    const questionNumber = exam.questions.slice(0, idx).filter(prevQ => prevQ.questionType !== 'INFO').length + 1;

                    return (
                        <section key={q.id} className="animate-fast-fade scroll-mt-24">
                            <div className="flex items-center gap-3 mb-6">
                                <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shadow-sm ${q.questionType === 'INFO' ? 'bg-blue-600 text-white' : answered ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                    {q.questionType === 'INFO' ? 'i' : questionNumber}
                                </span>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-0.5">
                                        {q.questionType === 'INFO' ? 'Informasi / Bacaan' : 'Soal Ujian'}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                        {q.questionType.replace(/_/g, ' ')}
                                    </span>
                                </div>
                            </div>

                            <div className={`prose prose-slate prose-sm max-w-none mb-8 p-6 rounded-3xl transition-all ${q.questionType === 'INFO' ? 'bg-blue-50/50 border border-blue-100' : 'bg-white'}`}>
                                <div className="text-lg font-medium text-slate-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: q.questionText }}></div>
                            </div>

                            {/* --- RENDERER BERDASARKAN TIPE SOAL --- */}

                            {/* 1. Pilihan Ganda */}
                            {q.questionType === 'MULTIPLE_CHOICE' && q.options && (
                                <div className="grid grid-cols-1 gap-3.5">
                                    {q.options.map((opt, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleAnswer(q.id, opt)}
                                            className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left group
                                                ${answers[q.id] === opt 
                                                    ? 'bg-brand-600 border-brand-600 text-white shadow-xl shadow-brand-100' 
                                                    : 'bg-white border-slate-100 text-slate-600 hover:border-brand-200 hover:bg-brand-50/20'}`}
                                        >
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                                                ${answers[q.id] === opt ? 'border-white bg-white/20' : 'border-slate-200 bg-slate-50 group-hover:border-brand-300'}`}>
                                                {answers[q.id] === opt && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                                            </div>
                                            <div className="text-sm font-bold" dangerouslySetInnerHTML={{ __html: opt }}></div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* 2. Pilihan Ganda Kompleks */}
                            {q.questionType === 'COMPLEX_MULTIPLE_CHOICE' && q.options && (
                                <div className="grid grid-cols-1 gap-3.5">
                                    {q.options.map((opt, i) => {
                                        const isSelected = (answers[q.id] || "").split(',').includes(opt);
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => handleComplexChoice(q.id, opt)}
                                                className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left group
                                                    ${isSelected 
                                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' 
                                                        : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/20'}`}
                                            >
                                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all
                                                    ${isSelected ? 'border-white bg-white/20' : 'border-slate-200 bg-slate-50 group-hover:border-indigo-300'}`}>
                                                    {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
                                                </div>
                                                <div className="text-sm font-bold" dangerouslySetInnerHTML={{ __html: opt }}></div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* 3. Benar / Salah */}
                            {q.questionType === 'TRUE_FALSE' && q.trueFalseRows && (
                                <div className="space-y-4">
                                    {q.trueFalseRows.map((row, i) => {
                                        let current: Record<string, boolean> = {};
                                        try { current = JSON.parse(answers[q.id] || '{}'); } catch(e) {}
                                        const val = current[i];
                                        return (
                                            <div key={i} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <p className="text-sm font-bold text-slate-700">{row.text}</p>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleTrueFalse(q.id, i, true)} className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${val === true ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-200 hover:text-emerald-500'}`}>Benar</button>
                                                    <button onClick={() => handleTrueFalse(q.id, i, false)} className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${val === false ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-rose-200 hover:text-rose-500'}`}>Salah</button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* 4. Menjodohkan */}
                            {q.questionType === 'MATCHING' && q.matchingPairs && (
                                <div className="space-y-3">
                                    {q.matchingPairs.map((pair, i) => {
                                        let current: Record<string, string> = {};
                                        try { current = JSON.parse(answers[q.id] || '{}'); } catch(e) {}
                                        const selected = current[pair.left] || "";
                                        const rightOptions = Array.from(new Set(q.matchingPairs!.map(p => p.right)));
                                        return (
                                            <div key={i} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                                <div className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 shadow-sm">{pair.left}</div>
                                                <div className="hidden sm:block text-slate-300 font-black">➜</div>
                                                <div className="flex-1 relative">
                                                    <select 
                                                        value={selected}
                                                        onChange={(e) => handleMatching(q.id, pair.left, e.target.value)}
                                                        className={`w-full p-4 appearance-none rounded-xl border-2 text-sm font-bold focus:outline-none transition-all cursor-pointer
                                                            ${selected ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-slate-100 text-slate-400 hover:border-brand-100'}`}
                                                    >
                                                        <option value="">Pilih Pasangan...</option>
                                                        {rightOptions.map((opt, idx) => <option key={idx} value={opt}>{opt}</option>)}
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300"><ArrowPathIcon className="w-4 h-4 rotate-90" /></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* 5. Isian Singkat */}
                            {q.questionType === 'FILL_IN_THE_BLANK' && (
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={answers[q.id] || ''}
                                        onChange={(e) => handleAnswer(q.id, e.target.value)}
                                        placeholder="Ketik jawaban singkat di sini..."
                                        className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl focus:bg-white focus:border-brand-300 outline-none transition-all text-lg font-black text-slate-700 shadow-inner"
                                    />
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-200"><PencilIcon className="w-6 h-6"/></div>
                                </div>
                            )}

                            {/* 6. Esai */}
                            {q.questionType === 'ESSAY' && (
                                <textarea
                                    value={answers[q.id] || ''}
                                    onChange={(e) => handleAnswer(q.id, e.target.value)}
                                    placeholder="Tulis jawaban lengkap Anda di sini..."
                                    className="w-full p-8 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] focus:bg-white focus:border-brand-300 outline-none transition-all text-sm font-medium min-h-[200px] leading-relaxed shadow-inner"
                                />
                            )}

                            {/* Divider halus */}
                            <div className="h-px bg-slate-100 w-full mt-16"></div>
                        </section>
                    );
                })}

                <div className="py-24 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-200">Akhir Lembar Ujian</p>
                </div>
            </main>

            {/* Floating Footer Control */}
            <div className="fixed bottom-8 left-0 w-full px-6 flex justify-center pointer-events-none z-[70]">
                <nav className="glass-card shadow-2xl rounded-full px-8 py-5 flex items-center gap-10 pointer-events-auto transition-all hover:scale-[1.02]">
                    <div className="flex flex-col">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Status</p>
                        <p className="text-sm font-black text-slate-800 tabular-nums">
                            {answeredCount} <span className="text-slate-200">/</span> {totalQuestions}
                        </p>
                    </div>

                    <div className="h-8 w-px bg-slate-200/50"></div>
                    
                    <button 
                        onClick={() => handleSubmit(false)}
                        disabled={isSubmitting}
                        className="bg-slate-900 text-white px-10 py-3.5 rounded-full font-black text-xs uppercase tracking-widest hover:bg-black hover:shadow-2xl transition-all flex items-center gap-3 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Mengirim...' : 'Kumpulkan'}
                        <CheckCircleIcon className="w-5 h-5"/>
                    </button>
                </nav>
            </div>
        </div>
    );
};
