import React, { useState, useEffect } from 'react';
import type { Exam, Student, Result, Question } from '../types';
import { ClockIcon, CheckCircleIcon, ArrowPathIcon } from './Icons';

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

    const answeredCount = Object.keys(answers).filter(key => answers[key] && answers[key] !== "").length;
    const totalQuestions = exam.questions.filter(q => q.questionType !== 'INFO').length;
    const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

    return (
        <div className="min-h-screen bg-white pb-32 font-sans selection:bg-brand-100">
            {/* Minimal Sticky Header */}
            <header className="sticky top-0 z-[60] bg-white/90 backdrop-blur-xl border-b border-slate-100">
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-black text-xs">
                             {exam.config.subject.charAt(0)}
                        </div>
                        <div className="hidden sm:block">
                            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">{exam.config.subject}</h2>
                            <p className="text-xs font-bold text-slate-800 truncate max-w-[120px]">{student.fullName}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-500 ${timeLeft < 300 ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                            <ClockIcon className="w-3.5 h-3.5" />
                            <span className="font-mono font-bold text-sm tracking-widest tabular-nums">{formatTime(timeLeft)}</span>
                        </div>
                    </div>
                </div>
                {/* Micro Progress Bar */}
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-slate-50">
                    <div className="h-full bg-brand-500 transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-6 pt-12 space-y-16">
                {exam.questions.map((q, idx) => {
                    const isAnswered = !!answers[q.id];
                    const questionNumber = exam.questions.slice(0, idx).filter(prevQ => prevQ.questionType !== 'INFO').length + 1;

                    return (
                        <section key={q.id} className="animate-fast-fade scroll-mt-24">
                            <div className="flex items-center gap-3 mb-6">
                                <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black tracking-tighter ${q.questionType === 'INFO' ? 'bg-blue-50 text-blue-500' : isAnswered ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                    {q.questionType === 'INFO' ? 'i' : questionNumber}
                                </span>
                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">
                                    {q.questionType === 'INFO' ? 'Informasi' : 'Pertanyaan'}
                                </span>
                            </div>

                            <div className="prose prose-slate prose-sm max-w-none mb-8">
                                <div className="text-lg font-medium text-slate-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: q.questionText }}></div>
                            </div>

                            {/* Render Choices based on Type */}
                            {q.questionType === 'MULTIPLE_CHOICE' && q.options && (
                                <div className="grid grid-cols-1 gap-3">
                                    {q.options.map((opt, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleAnswer(q.id, opt)}
                                            className={`flex items-center gap-4 p-5 rounded-2xl border transition-all text-left group
                                                ${answers[q.id] === opt 
                                                    ? 'bg-brand-600 border-brand-600 text-white shadow-md' 
                                                    : 'bg-white border-slate-200 text-slate-600 hover:border-brand-300 hover:bg-brand-50/20'}`}
                                        >
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                                                ${answers[q.id] === opt ? 'border-white bg-white/20' : 'border-slate-200 bg-white group-hover:border-brand-200'}`}>
                                                {answers[q.id] === opt && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                            </div>
                                            <div className="text-sm font-semibold" dangerouslySetInnerHTML={{ __html: opt }}></div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {q.questionType === 'ESSAY' && (
                                <textarea
                                    value={answers[q.id] || ''}
                                    onChange={(e) => handleAnswer(q.id, e.target.value)}
                                    placeholder="Tulis jawaban Anda di sini..."
                                    className="w-full p-6 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-brand-300 outline-none transition-all text-sm font-medium min-h-[160px] leading-relaxed shadow-inner"
                                />
                            )}

                            {/* Divider for next question */}
                            <div className="h-px bg-slate-100 w-1/4 mx-auto mt-16"></div>
                        </section>
                    );
                })}

                <div className="py-20 text-center opacity-30">
                    <p className="text-[10px] font-bold uppercase tracking-widest">Akhir Lembar Ujian</p>
                </div>
            </main>

            {/* Elegant Floating Action bar */}
            <div className="fixed bottom-6 left-0 w-full px-6 flex justify-center pointer-events-none z-[70]">
                <nav className="glass-card shadow-2xl rounded-full px-8 py-4 flex items-center gap-8 pointer-events-auto transition-all hover:scale-[1.01]">
                    <div className="flex flex-col">
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Progress</p>
                        <p className="text-sm font-black text-slate-800">
                            {answeredCount} <span className="text-slate-200">/</span> {totalQuestions}
                        </p>
                    </div>

                    <div className="h-6 w-px bg-slate-100"></div>
                    
                    <button 
                        onClick={() => handleSubmit(false)}
                        disabled={isSubmitting}
                        className="bg-slate-900 text-white px-8 py-3 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-black hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Mengirim...' : 'Selesai'}
                        <CheckCircleIcon className="w-4 h-4"/>
                    </button>
                </nav>
            </div>
        </div>
    );
};
