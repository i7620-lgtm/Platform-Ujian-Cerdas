
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
        <div className="min-h-screen bg-[#FAFBFC] pb-40 selection:bg-indigo-100">
            {/* Elegant Fixed Header */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-5 shadow-sm">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                             <span className="font-black text-sm">{exam.config.subject.charAt(0)}</span>
                        </div>
                        <div>
                            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{exam.config.subject}</h2>
                            <p className="text-sm font-bold text-slate-800">{student.fullName}</p>
                        </div>
                    </div>
                    
                    <div className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border transition-all duration-700 ${timeLeft < 300 ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                        <ClockIcon className="w-4 h-4" />
                        <span className="font-mono font-black text-sm tracking-widest">{formatTime(timeLeft)}</span>
                    </div>
                </div>
                
                {/* Slim Progres Bar */}
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-slate-50">
                    <div className="h-full bg-indigo-500 transition-all duration-1000 ease-out" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto p-6 pt-16 space-y-16">
                {exam.questions.map((q, idx) => (
                    <div key={q.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20 p-8 md:p-12 animate-fade-in transition-all hover:shadow-2xl">
                        <div className="flex flex-col gap-8">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Pertanyaan {idx + 1} / {totalQ}</span>
                                {answers[q.id] && <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5"><CheckCircleIcon className="w-3.5 h-3.5"/> Dijawab</span>}
                            </div>

                            <div className="flex-1 w-full">
                                <div className="text-xl font-medium text-slate-800 leading-relaxed mb-12 prose prose-slate max-w-none prose-img:rounded-2xl" dangerouslySetInnerHTML={{ __html: q.questionText }}></div>
                                
                                <div className="grid grid-cols-1 gap-3.5">
                                    {q.options?.map((opt, i) => {
                                        const isSelected = answers[q.id] === opt;
                                        return (
                                            <button 
                                                key={i} 
                                                onClick={() => handleAnswer(q.id, opt)}
                                                className={`w-full flex items-center gap-6 p-6 rounded-3xl border transition-all duration-300 text-left group
                                                    ${isSelected 
                                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' 
                                                        : 'bg-slate-50/50 border-transparent text-slate-600 hover:bg-white hover:border-indigo-100'}`}
                                            >
                                                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                                                    ${isSelected ? 'border-white bg-white/20' : 'border-slate-300 bg-white group-hover:border-indigo-300'}`}>
                                                    {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                                                </div>
                                                <span className="text-base font-semibold leading-relaxed">{opt}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Float Action Bar */}
            <div className="fixed bottom-10 left-0 w-full px-6 flex justify-center z-40 pointer-events-none">
                <div className="bg-slate-900/95 backdrop-blur-2xl shadow-2xl rounded-[3rem] px-10 py-5 flex items-center gap-16 border border-white/10 pointer-events-auto">
                    <div className="text-center hidden sm:block">
                        <span className="block text-[9px] font-black text-white/30 uppercase tracking-widest mb-0.5">Sudah Dijawab</span>
                        <span className="text-xl font-black text-white">{answeredCount} <span className="text-white/20">/ {totalQ}</span></span>
                    </div>
                    
                    <button 
                        onClick={() => handleSubmit(false)}
                        disabled={isSubmitting}
                        className="bg-indigo-500 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-400 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-900/40 flex items-center gap-4 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Mengirim...' : 'Kumpulkan'}
                        {!isSubmitting && <CheckCircleIcon className="w-5 h-5"/>}
                    </button>
                </div>
            </div>
        </div>
    );
};
