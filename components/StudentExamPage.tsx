
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
        if (!auto && !confirm("Kumpulkan jawaban?")) return;
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
        <div className="min-h-screen bg-white pb-32 font-sans">
            <header className="sticky top-0 z-[60] bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-sm h-16 flex items-center px-4 sm:px-6 justify-between">
                <div className="flex items-center gap-3 w-1/3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">{exam.config.subject.charAt(0)}</div>
                    <div className="hidden sm:block overflow-hidden"><h1 className="text-xs font-bold text-slate-900 truncate">{exam.config.subject}</h1><p className="text-[10px] text-slate-500 truncate">{student.fullName}</p></div>
                </div>
                
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
                    <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all ${timeLeft < 300 ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                        <ClockIcon className="w-4 h-4" />
                        <span className="font-mono font-bold text-sm tracking-widest">{formatTime(timeLeft)}</span>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 w-1/3">
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider border ${
                        saveStatus === 'saving' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                        saveStatus === 'pending' ? 'bg-slate-50 text-slate-400 border-slate-100' :
                        'bg-emerald-50 text-emerald-600 border-emerald-100'
                    }`}>
                        {saveStatus === 'saving' ? 'Menyimpan...' : saveStatus === 'pending' ? 'Belum Disimpan' : 'Tersimpan'}
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 h-0.5 bg-indigo-500 transition-all duration-500" style={{width: `${progress}%`}}></div>
            </header>

            {warningMsg && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[80] bg-rose-600 text-white px-6 py-3 rounded-full shadow-xl text-xs font-bold animate-bounce">{warningMsg}</div>}

            <main className="max-w-2xl mx-auto px-6 pt-10 space-y-12">
                {exam.questions.map((q, idx) => {
                    const num = exam.questions.slice(0, idx).filter(i => i.questionType !== 'INFO').length + 1;
                    return (
                        <div key={q.id} className="scroll-mt-24">
                            <div className="flex gap-3 mb-4">
                                <span className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold shrink-0 ${q.questionType === 'INFO' ? 'bg-blue-100 text-blue-700' : isAnswered(q) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{q.questionType === 'INFO' ? 'i' : num}</span>
                                <div className="prose prose-sm max-w-none text-slate-800" dangerouslySetInnerHTML={{ __html: q.questionText }}></div>
                            </div>

                            {q.questionType === 'MULTIPLE_CHOICE' && q.options && (
                                <div className="space-y-3 pl-10">
                                    {q.options.map((opt, i) => (
                                        <button key={i} onClick={() => handleAnswer(q.id, opt)} className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${answers[q.id] === opt ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 hover:border-indigo-200'}`}>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${answers[q.id] === opt ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>{answers[q.id] === opt && <div className="w-2 h-2 bg-white rounded-full"></div>}</div>
                                            <div className="text-sm font-medium" dangerouslySetInnerHTML={{ __html: opt }}></div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            
                            {/* ... (Other types) ... */}
                            {q.questionType === 'ESSAY' && (
                                <textarea value={answers[q.id] || ''} onChange={e => handleAnswer(q.id, e.target.value)} className="w-full p-4 border-2 border-slate-100 rounded-xl focus:border-indigo-300 outline-none min-h-[150px] text-sm ml-10 block w-[calc(100%-2.5rem)]" placeholder="Jawaban Anda..." />
                            )}
                        </div>
                    );
                })}
            </main>

            <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t border-slate-100 flex justify-center">
                <button onClick={() => handleSubmit(false)} disabled={isSubmitting} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-black transition-all flex items-center gap-2 shadow-lg disabled:opacity-50">
                    {isSubmitting ? 'Mengirim...' : 'Kumpulkan Ujian'} <CheckCircleIcon className="w-5 h-5"/>
                </button>
            </div>
        </div>
    );
};
