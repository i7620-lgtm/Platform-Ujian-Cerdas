
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
        if (!auto && !confirm("Yakin ingin menyelesaikan ujian?")) return;
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
        <div className="min-h-screen bg-[#FDFEFF]">
            {/* Elegant Fixed Header */}
            <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100 px-6 py-5 shadow-sm">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div>
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{exam.config.subject}</h2>
                        <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                             <p className="text-sm font-bold text-slate-800">{student.fullName}</p>
                        </div>
                    </div>
                    
                    <div className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border transition-all duration-500 ${timeLeft < 300 ? 'bg-rose-50 border-rose-100 text-rose-600 animate-pulse' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                        <ClockIcon className="w-4 h-4" />
                        <span className="font-mono font-black text-sm">{formatTime(timeLeft)}</span>
                    </div>
                </div>
                
                {/* Visual Progress Bar */}
                <div className="absolute bottom-0 left-0 w-full h-[3px] bg-slate-50">
                    <div className="h-full bg-indigo-500 transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto p-8 pt-12 pb-32 space-y-12">
                {exam.questions.map((q, idx) => (
                    <div key={q.id} className="animate-fade-in">
                        <div className="flex items-start gap-8">
                            <span className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0 shadow-sm border border-indigo-100/50">{idx + 1}</span>
                            <div className="flex-1">
                                <div className="text-lg font-medium text-slate-800 leading-relaxed mb-10 prose-slate" dangerouslySetInnerHTML={{ __html: q.questionText }}></div>
                                
                                <div className="space-y-3.5">
                                    {q.options?.map((opt, i) => {
                                        const isSelected = answers[q.id] === opt;
                                        return (
                                            <button 
                                                key={i} 
                                                onClick={() => handleAnswer(q.id, opt)}
                                                className={`w-full flex items-center gap-5 p-5 rounded-2xl border transition-all duration-300 text-left group
                                                    ${isSelected 
                                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-200' 
                                                        : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/30'}`}
                                            >
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                                                    ${isSelected ? 'border-white bg-white/20' : 'border-slate-200 bg-white group-hover:border-indigo-300'}`}>
                                                    {isSelected && <div className="w-2 h-2 bg-white rounded-full animate-scale-in"></div>}
                                                </div>
                                                <span className="text-sm font-semibold">{opt}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom Sticky Action Bar */}
            <div className="fixed bottom-0 left-0 w-full p-8 flex justify-center z-40 pointer-events-none">
                <div className="bg-slate-900/95 backdrop-blur-2xl shadow-2xl rounded-[2.2rem] px-10 py-5 flex items-center gap-14 pointer-events-auto ring-1 ring-white/10">
                    <div className="text-center">
                        <span className="block text-[9px] font-black text-white/30 uppercase tracking-widest mb-0.5">Progress</span>
                        <span className="text-lg font-black text-white">{answeredCount} <span className="text-white/20 font-medium">/ {totalQ}</span></span>
                    </div>
                    
                    <button 
                        onClick={() => handleSubmit(false)}
                        disabled={isSubmitting}
                        className="bg-indigo-500 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.15em] hover:bg-indigo-600 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-900/20 flex items-center gap-3 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>Selesai <CheckCircleIcon className="w-5 h-5"/></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
