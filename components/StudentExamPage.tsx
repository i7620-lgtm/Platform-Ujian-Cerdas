
import React, { useState, useEffect } from 'react';
import type { Exam, Student, Result } from '../types';
import { ClockIcon, CheckCircleIcon } from './Icons';

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
                if (prev <= 1) { clearInterval(timer); handleSubmit(true); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleSubmit = async (auto = false) => {
        if (!auto && !confirm("Kumpulkan jawaban Anda sekarang?")) return;
        setIsSubmitting(true);
        await onSubmit(answers, timeLeft);
    };

    const handleAnswer = (qId: string, val: string) => {
        const newAnswers = { ...answers, [qId]: val };
        setAnswers(newAnswers);
        onUpdate?.(newAnswers, timeLeft);
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const answeredCount = Object.keys(answers).length;
    const totalQ = exam.questions.length;
    const progress = (answeredCount / totalQ) * 100;

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-32 font-sans selection:bg-indigo-100 selection:text-indigo-900">
            {/* Elegant Header with Progress */}
            <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-sm">
                <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                             <span className="font-bold text-sm uppercase">{exam.config.subject.charAt(0)}</span>
                        </div>
                        <div className="hidden sm:block">
                            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{exam.config.subject}</h2>
                            <p className="text-sm font-bold text-slate-800 line-clamp-1">{student.fullName}</p>
                        </div>
                    </div>
                    
                    <div className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border transition-all duration-500 ${timeLeft < 300 ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                        <ClockIcon className="w-4 h-4" />
                        <span className="font-mono font-bold text-sm tracking-wider">{formatTime(timeLeft)}</span>
                    </div>
                </div>
                
                {/* Visual Progress Bar */}
                <div className="absolute bottom-0 left-0 w-full h-[3px] bg-slate-100">
                    <div 
                        className="h-full bg-indigo-500 transition-all duration-1000 ease-out" 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 pt-12 space-y-12">
                {exam.questions.map((q, idx) => (
                    <section key={q.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/20 p-8 md:p-10 animate-fade-in transition-all hover:shadow-2xl">
                        <div className="space-y-8">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Pertanyaan {idx + 1} dari {totalQ}</span>
                                {answers[q.id] && (
                                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-lg">
                                        <CheckCircleIcon className="w-3.5 h-3.5"/> Dijawab
                                    </span>
                                )}
                            </div>

                            <div className="space-y-10">
                                <div className="text-lg font-medium text-slate-800 leading-relaxed prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: q.questionText }}></div>
                                
                                <div className="grid grid-cols-1 gap-3">
                                    {q.options?.map((opt, i) => {
                                        const isSelected = answers[q.id] === opt;
                                        return (
                                            <button 
                                                key={i} 
                                                onClick={() => handleAnswer(q.id, opt)}
                                                className={`group w-full flex items-center gap-5 p-5 rounded-2xl border transition-all duration-300 text-left
                                                    ${isSelected 
                                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' 
                                                        : 'bg-slate-50/50 border-slate-100 text-slate-600 hover:bg-white hover:border-indigo-200 hover:shadow-md'}`}
                                            >
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                                                    ${isSelected ? 'border-white bg-white/20' : 'border-slate-200 bg-white group-hover:border-indigo-300'}`}>
                                                    {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                                </div>
                                                <span className="text-sm font-semibold">{opt}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </section>
                ))}
            </main>

            {/* Floating Action Navigation */}
            <div className="fixed bottom-8 left-0 w-full px-6 flex justify-center pointer-events-none">
                <nav className="bg-slate-900/90 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] rounded-[2.5rem] px-8 py-4 flex items-center gap-10 border border-white/10 pointer-events-auto">
                    <div className="hidden sm:block text-left">
                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Progress</p>
                        <p className="text-lg font-black text-white">{answeredCount} <span className="text-white/20">/ {totalQ}</span></p>
                    </div>
                    
                    <button 
                        onClick={() => handleSubmit(false)}
                        disabled={isSubmitting}
                        className="bg-indigo-500 text-white px-10 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-[0.15em] hover:bg-indigo-400 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-indigo-900/20 flex items-center gap-3 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Mengirim...' : 'Kumpulkan Jawaban'}
                        {!isSubmitting && <CheckCircleIcon className="w-4 h-4"/>}
                    </button>
                </nav>
            </div>
        </div>
    );
};
