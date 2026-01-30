import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Exam, Student, Result, Question, ResultStatus } from '../types';
import { ClockIcon, CheckCircleIcon, ArrowPathIcon, PencilIcon, CheckIcon, ExclamationTriangleIcon, CloudArrowUpIcon } from './Icons';

interface StudentExamPageProps {
  exam: Exam;
  student: Student;
  initialData?: Result | null;
  onSubmit: (answers: Record<string, string>, timeLeft: number, status?: ResultStatus, logs?: string[], location?: string, grading?: any) => void;
  onUpdate?: (answers: Record<string, string>, timeLeft: number) => void;
}

const normalize = (str: any) => String(str || '').trim().toLowerCase().replace(/\s+/g, ' ');

const calculateGrade = (exam: Exam, answers: Record<string, string>) => {
    let correctCount = 0;
    const questions = exam.questions || [];
    
    questions.forEach((q: any) => {
        const studentAnswer = answers[q.id];
        if (!studentAnswer) return;

        if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
             if (q.correctAnswer && normalize(studentAnswer) === normalize(q.correctAnswer)) correctCount++;
        } 
        else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
             const tArr = String(q.correctAnswer).split(',');
             if (studentAnswer.length === tArr.length) correctCount++; 
        }
    });

    const scorable = questions.filter((q: any) => q.questionType !== 'INFO' && q.questionType !== 'ESSAY').length;
    const score = scorable > 0 ? Math.round((correctCount / scorable) * 100) : 0;
    return { score, correctCount, totalQuestions: scorable };
};

export const StudentExamPage: React.FC<StudentExamPageProps> = ({ exam, student, initialData, onSubmit, onUpdate }) => {
    const [answers, setAnswers] = useState<Record<string, string>>(initialData?.answers || {});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [warningMsg, setWarningMsg] = useState('');
    const [userLocation, setUserLocation] = useState<string>('');
    
    // Auto-Save States
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'pending'>('saved');
    
    // Refs
    const answersRef = useRef(answers);
    const logRef = useRef<string[]>(initialData?.activityLog || []);
    const isSubmittingRef = useRef(false);
    const timeLeftRef = useRef(0);
    
    // Throttling Refs
    const lastSentTimeRef = useRef<number>(0);
    const pendingUpdateRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync Ref
    useEffect(() => { answersRef.current = answers; }, [answers]);
    useEffect(() => { isSubmittingRef.current = isSubmitting; }, [isSubmitting]);

    // Track Location
    useEffect(() => {
        if (exam.config.trackLocation && student.class !== 'PREVIEW') {
            if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => setUserLocation(`${position.coords.latitude}, ${position.coords.longitude}`),
                    (error) => logRef.current.push(`[System] Gagal lokasi: ${error.message}`)
                );
            }
        }
    }, []);

    // Timer Logic
    const deadline = useMemo(() => {
        if (student.class === 'PREVIEW') return Date.now() + (exam.config.timeLimit * 60 * 1000);
        const dateStr = exam.config.date.includes('T') ? exam.config.date.split('T')[0] : exam.config.date;
        const start = new Date(`${dateStr}T${exam.config.startTime}`);
        return start.getTime() + (exam.config.timeLimit * 60 * 1000);
    }, [exam]);

    const [timeLeft, setTimeLeft] = useState(0);
    
    useEffect(() => {
        const tick = () => {
            const now = Date.now();
            const diff = Math.max(0, Math.floor((deadline - now) / 1000));
            setTimeLeft(diff);
            timeLeftRef.current = diff;
            if (diff <= 0 && student.class !== 'PREVIEW' && !isSubmittingRef.current) {
                handleSubmit(true, 'completed');
            }
        };
        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [deadline]);

    // --- SMART THROTTLE SAVE LOGIC ---
    const triggerSmartSave = () => {
        if (student.class === 'PREVIEW') return;
        
        const now = Date.now();
        const intervalMs = (exam.config.autoSaveInterval || 10) * 1000;
        const timeSinceLast = now - lastSentTimeRef.current;

        setSaveStatus('pending');

        if (timeSinceLast >= intervalMs) {
            performSave();
        } else {
            if (pendingUpdateRef.current) clearTimeout(pendingUpdateRef.current);
            pendingUpdateRef.current = setTimeout(() => {
                performSave();
            }, intervalMs - timeSinceLast);
        }
    };

    const performSave = () => {
        if (isSubmittingRef.current) return;
        
        setSaveStatus('saving');
        lastSentTimeRef.current = Date.now();
        
        // Calculate basic grading even for auto-save
        const grading = calculateGrade(exam, answersRef.current);
        
        // Use onSubmit but with 'in_progress' status
        onSubmit(answersRef.current, timeLeftRef.current, 'in_progress', logRef.current, userLocation, grading);

        setTimeout(() => setSaveStatus('saved'), 800);
    };

    // Clean up pending save on unmount
    useEffect(() => {
        return () => { if (pendingUpdateRef.current) clearTimeout(pendingUpdateRef.current); };
    }, []);

    // --- BEHAVIOR DETECTION ---
    useEffect(() => {
        if (student.class === 'PREVIEW') return;
        const handleVisChange = () => {
            if (document.hidden && exam.config.detectBehavior && !isSubmittingRef.current) {
                logRef.current.push(`[${new Date().toLocaleTimeString()}] Tab background/minimized`);
                if (exam.config.continueWithPermission) {
                    setIsSubmitting(true);
                    alert("PELANGGARAN: Anda meninggalkan halaman ujian. Akses dikunci.");
                    const grading = calculateGrade(exam, answersRef.current);
                    onSubmit(answersRef.current, timeLeftRef.current, 'force_closed', logRef.current, userLocation, grading);
                } else {
                    setWarningMsg("PERINGATAN: Jangan tinggalkan halaman ujian!");
                    setTimeout(() => setWarningMsg(''), 5000);
                    triggerSmartSave(); 
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisChange);
        return () => document.removeEventListener('visibilitychange', handleVisChange);
    }, [exam]);

    const handleAnswer = (qId: string, val: string) => {
        setAnswers(prev => {
            const next = { ...prev, [qId]: val };
            answersRef.current = next; 
            return next;
        });
        triggerSmartSave();
    };

    const handleSubmit = async (auto = false, status: ResultStatus = 'completed') => {
        if (!auto && !confirm("Kumpulkan jawaban dan selesaikan ujian?")) return;
        setIsSubmitting(true);
        if (pendingUpdateRef.current) clearTimeout(pendingUpdateRef.current);
        const grading = calculateGrade(exam, answersRef.current);
        await onSubmit(answersRef.current, timeLeftRef.current, status, logRef.current, userLocation, grading);
    };

    const formatTime = (s: number) => {
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
        return h > 0 ? `${h}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}` : `${m}:${sec.toString().padStart(2,'0')}`;
    };

    const isAnswered = (q: Question) => {
        const v = answers[q.id];
        if (!v) return false;
        if (q.questionType === 'TRUE_FALSE' || q.questionType === 'MATCHING') {
            try { return Object.keys(JSON.parse(v)).length > 0; } catch(e) { return false; }
        }
        return v !== "";
    };

    const answeredCount = exam.questions.filter(q => q.questionType !== 'INFO' && isAnswered(q)).length;
    const totalQuestions = exam.questions.filter(q => q.questionType !== 'INFO').length;
    const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

    return (
        <div className="min-h-screen bg-slate-50 pb-40 font-sans selection:bg-orange-100 selection:text-orange-900">
            {/* Elegant Sticky Header with Glassmorphism */}
            <header className="sticky top-0 z-[60] bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all duration-300">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between relative">
                    {/* Left: Subject & Student */}
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md shadow-orange-100">
                            {exam.config.subject.charAt(0)}
                        </div>
                        <div className="hidden sm:block leading-tight">
                            <h1 className="text-sm font-bold text-slate-800 truncate max-w-[150px]">{exam.config.subject}</h1>
                            <p className="text-[10px] font-medium text-slate-500 truncate max-w-[150px]">{student.fullName}</p>
                        </div>
                    </div>
                    
                    {/* Center: Timer */}
                    <div className="absolute left-1/2 -translate-x-1/2">
                        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all shadow-sm ${timeLeft < 300 ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' : 'bg-white border-slate-200 text-slate-700'}`}>
                            <ClockIcon className="w-4 h-4" />
                            <span className="font-mono font-bold text-sm tracking-wider">{formatTime(timeLeft)}</span>
                        </div>
                    </div>

                    {/* Right: Status */}
                    <div className="flex items-center gap-2">
                        <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                            saveStatus === 'saving' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                            saveStatus === 'pending' ? 'bg-slate-50 text-slate-400 border-slate-100' :
                            'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}>
                            {saveStatus === 'saving' ? 'Menyimpan...' : saveStatus === 'pending' ? 'Unsaved' : 'Tersimpan'}
                        </div>
                        <div className="sm:hidden text-xs font-bold text-slate-400">
                            {answeredCount}/{totalQuestions}
                        </div>
                    </div>
                </div>
                
                {/* Slim Progress Bar */}
                <div className="h-0.5 w-full bg-slate-100 relative">
                    <div className="absolute top-0 left-0 h-full bg-orange-500 transition-all duration-500 ease-out" style={{width: `${progress}%`}}></div>
                </div>
            </header>

            {warningMsg && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[80] bg-rose-600 text-white px-8 py-3 rounded-full shadow-xl shadow-rose-200 text-xs font-bold animate-bounce flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-4 h-4" /> {warningMsg}
                </div>
            )}

            <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
                {exam.questions.map((q, idx) => {
                    const num = exam.questions.slice(0, idx).filter(i => i.questionType !== 'INFO').length + 1;
                    const answered = isAnswered(q);
                    
                    return (
                        <div 
                            key={q.id} 
                            id={q.id}
                            className={`scroll-mt-28 bg-white rounded-2xl p-6 md:p-8 border shadow-sm transition-all duration-300 ${answered ? 'border-orange-100 shadow-md' : 'border-slate-100'}`}
                        >
                            {/* Question Header */}
                            <div className="flex gap-4 mb-6">
                                <div className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold shrink-0 transition-colors ${
                                    q.questionType === 'INFO' ? 'bg-blue-50 text-blue-600' : 
                                    answered ? 'bg-orange-500 text-white shadow-md shadow-orange-200' : 'bg-slate-100 text-slate-500'
                                }`}>
                                    {q.questionType === 'INFO' ? 'i' : num}
                                </div>
                                <div className="prose prose-slate prose-lg max-w-none text-slate-800 font-medium leading-relaxed">
                                    <div dangerouslySetInnerHTML={{ __html: q.questionText }}></div>
                                </div>
                            </div>

                            {/* Options / Inputs */}
                            <div className="pl-0 md:pl-12">
                                {q.questionType === 'MULTIPLE_CHOICE' && q.options && (
                                    <div className="grid grid-cols-1 gap-3">
                                        {q.options.map((opt, i) => {
                                            const isSelected = answers[q.id] === opt;
                                            return (
                                                <button 
                                                    key={i} 
                                                    onClick={() => handleAnswer(q.id, opt)} 
                                                    className={`w-full text-left p-4 md:p-5 rounded-xl border-2 transition-all duration-200 flex items-start gap-4 group ${
                                                        isSelected 
                                                        ? 'border-orange-500 bg-orange-50 shadow-sm ring-1 ring-orange-500' 
                                                        : 'border-slate-100 hover:border-orange-200 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <div className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                                        isSelected ? 'border-orange-500 bg-orange-500' : 'border-slate-300 group-hover:border-orange-300'
                                                    }`}>
                                                        {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full shadow-sm"></div>}
                                                    </div>
                                                    <div className={`text-base ${isSelected ? 'font-bold text-orange-900' : 'font-normal text-slate-700'}`} dangerouslySetInnerHTML={{ __html: opt }}></div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {q.questionType === 'ESSAY' && (
                                    <div className="relative">
                                        <textarea 
                                            value={answers[q.id] || ''} 
                                            onChange={e => handleAnswer(q.id, e.target.value)} 
                                            className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-orange-500 focus:bg-white focus:ring-0 outline-none min-h-[180px] text-base text-slate-800 transition-all placeholder:text-slate-400" 
                                            placeholder="Tulis jawaban Anda di sini secara lengkap..." 
                                        />
                                        <div className="absolute bottom-4 right-4 text-xs font-bold text-slate-300 pointer-events-none uppercase">Esai</div>
                                    </div>
                                )}
                                
                                {q.questionType === 'FILL_IN_THE_BLANK' && (
                                    <div className="flex items-center gap-3">
                                        <PencilIcon className="w-5 h-5 text-slate-400" />
                                        <input 
                                            type="text" 
                                            value={answers[q.id] || ''} 
                                            onChange={e => handleAnswer(q.id, e.target.value)} 
                                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-orange-500 focus:bg-white focus:ring-0 outline-none text-base font-medium text-slate-800 transition-all" 
                                            placeholder="Ketik jawaban singkat..." 
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Bottom Spacer for Floating Button */}
                <div className="h-24"></div>
            </main>

            {/* Floating Action Bar */}
            <div className="fixed bottom-6 inset-x-0 px-4 flex justify-center z-50 pointer-events-none">
                <div className="bg-white/90 backdrop-blur-xl p-2 rounded-2xl shadow-2xl shadow-slate-300/50 border border-white pointer-events-auto flex items-center gap-3 max-w-sm w-full mx-auto transform transition-transform hover:scale-[1.02]">
                    <div className="flex-1 px-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progres</p>
                        <p className="text-xs font-bold text-slate-700">{answeredCount} dari {totalQuestions} Soal</p>
                    </div>
                    <button 
                        onClick={() => handleSubmit(false)} 
                        disabled={isSubmitting} 
                        className="bg-slate-900 text-white px-6 py-3.5 rounded-xl font-bold text-sm hover:bg-black transition-all flex items-center gap-2 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        {isSubmitting ? 'Mengirim...' : 'Selesai'} <CheckCircleIcon className="w-5 h-5"/>
                    </button>
                </div>
            </div>
        </div>
    );
};
