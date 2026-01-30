import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Exam, Student, Result, Question, ResultStatus } from '../types';
import { ClockIcon, CheckCircleIcon, ExclamationTriangleIcon, PencilIcon } from './Icons';
import { storageService } from '../services/storage';

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

export const StudentExamPage: React.FC<StudentExamPageProps> = ({ exam, student, initialData, onSubmit }) => {
    // LOCAL STORAGE KEY
    const STORAGE_KEY = `exam_local_${exam.code}_${student.studentId}`;

    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [warningMsg, setWarningMsg] = useState('');
    const [userLocation, setUserLocation] = useState<string>('');
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'pending'>('saved');
    
    const answersRef = useRef<Record<string, string>>({});
    const logRef = useRef<string[]>(initialData?.activityLog || []);
    const isSubmittingRef = useRef(false);
    const timeLeftRef = useRef(0);
    const lastBroadcastTimeRef = useRef<number>(0);
    
    // --- INITIALIZE STATE FROM LOCAL STORAGE OR DB ---
    useEffect(() => {
        const loadState = () => {
            const localData = localStorage.getItem(STORAGE_KEY);
            if (localData) {
                try {
                    const parsed = JSON.parse(localData);
                    // Gunakan data lokal jika ada
                    setAnswers(parsed.answers || {});
                    answersRef.current = parsed.answers || {};
                    if (parsed.logs) logRef.current = parsed.logs;
                    return;
                } catch(e) { console.error("Error parsing local exam data", e); }
            }
            
            // Fallback ke data DB jika tidak ada di lokal
            if (initialData?.answers) {
                setAnswers(initialData.answers);
                answersRef.current = initialData.answers;
            }
        };
        loadState();
    }, [STORAGE_KEY, initialData]);

    useEffect(() => { isSubmittingRef.current = isSubmitting; }, [isSubmitting]);

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

    // --- SAVE TO LOCAL STORAGE & BROADCAST PROGRESS ---
    // Menggantikan fungsi save ke database yang lama
    const handleAnswerChange = (qId: string, val: string) => {
        setAnswers(prev => {
            const next = { ...prev, [qId]: val };
            answersRef.current = next;
            
            // 1. Simpan ke Local Storage (Instant & Offline)
            if (student.class !== 'PREVIEW') {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({
                    answers: next,
                    logs: logRef.current,
                    lastUpdated: Date.now()
                }));
                setSaveStatus('saved'); // Dianggap tersimpan karena sudah di lokal
            }
            
            return next;
        });
        
        // 2. Broadcast Progress ke Guru (Throttled per 5 detik)
        if (student.class !== 'PREVIEW') {
            const now = Date.now();
            if (now - lastBroadcastTimeRef.current > 5000) {
                broadcastProgress();
                lastBroadcastTimeRef.current = now;
            }
        }
    };

    const broadcastProgress = () => {
        const totalQ = exam.questions.filter(q => q.questionType !== 'INFO').length;
        const answeredQ = Object.keys(answersRef.current).length;
        
        // Kirim sinyal ringan ke guru (TIDAK MASUK DB)
        storageService.sendProgressUpdate(exam.code, student.studentId, answeredQ, totalQ)
            .catch(err => console.error("Broadcast failed", err));
    };

    useEffect(() => {
        if (student.class === 'PREVIEW') return;
        const handleVisChange = () => {
            if (document.hidden && exam.config.detectBehavior && !isSubmittingRef.current) {
                logRef.current.push(`[${new Date().toLocaleTimeString()}] Tab background`);
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers: answersRef.current, logs: logRef.current })); // Sync logs to local
                
                if (exam.config.continueWithPermission) {
                    setIsSubmitting(true);
                    alert("PELANGGARAN: Anda meninggalkan halaman ujian. Akses dikunci.");
                    const grading = calculateGrade(exam, answersRef.current);
                    // Force Close: Kirim ke DB
                    onSubmit(answersRef.current, timeLeftRef.current, 'force_closed', logRef.current, userLocation, grading);
                } else {
                    setWarningMsg("PERINGATAN: Jangan tinggalkan halaman ujian!");
                    setTimeout(() => setWarningMsg(''), 5000);
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisChange);
        return () => document.removeEventListener('visibilitychange', handleVisChange);
    }, [exam]);

    const handleSubmit = async (auto = false, status: ResultStatus = 'completed') => {
        if (!auto && !confirm("Kumpulkan jawaban dan selesaikan ujian?")) return;
        setIsSubmitting(true);
        setSaveStatus('saving');
        
        // Final Sync: Hitung nilai dan kirim ke DB Supabase
        const grading = calculateGrade(exam, answersRef.current);
        await onSubmit(answersRef.current, timeLeftRef.current, status, logRef.current, userLocation, grading);
        
        // Hapus data lokal setelah sukses submit
        if (status === 'completed' || status === 'force_closed') {
            localStorage.removeItem(STORAGE_KEY);
        }
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

    const totalQuestions = exam.questions.filter(q => q.questionType !== 'INFO').length;
    const answeredCount = exam.questions.filter(q => q.questionType !== 'INFO' && isAnswered(q)).length;
    const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

    const optimizeHtml = (html: string) => {
        return html.replace(/<img /g, '<img loading="lazy" class="rounded-lg shadow-sm border border-slate-100 max-w-full h-auto" ');
    };

    return (
        <div className="min-h-screen bg-[#FAFAFA] font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-32">
            <header className="fixed top-0 inset-x-0 z-[60] bg-white/80 backdrop-blur-md border-b border-slate-100 h-12 flex flex-col justify-end transition-all">
                <div className="absolute top-0 left-0 h-0.5 bg-indigo-500 transition-all duration-500" style={{width: `${progress}%`}}></div>
                <div className="flex items-center justify-between px-4 sm:px-6 h-full max-w-4xl mx-auto w-full">
                    <div className="flex items-center gap-3">
                         <span className="text-xs font-bold text-slate-800 truncate max-w-[150px]">{exam.config.subject}</span>
                         {/* Indikator Penyimpanan Lokal */}
                         <span className="text-[9px] text-slate-400 font-medium tracking-wide flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> 
                            Tersimpan di Perangkat
                         </span>
                    </div>
                    
                    <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold tracking-tight transition-colors ${timeLeft < 300 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-600'}`}>
                        <ClockIcon className="w-3 h-3" />
                        {formatTime(timeLeft)}
                    </div>
                </div>
            </header>

            {warningMsg && (
                <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[80] bg-rose-600 text-white px-6 py-2 rounded-full shadow-lg text-xs font-bold animate-bounce flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-4 h-4" /> {warningMsg}
                </div>
            )}

            <main className="max-w-3xl mx-auto px-5 sm:px-8 pt-24 space-y-12">
                {exam.questions.map((q, idx) => {
                    const num = exam.questions.slice(0, idx).filter(i => i.questionType !== 'INFO').length + 1;
                    const answered = isAnswered(q);
                    
                    return (
                        <div key={q.id} id={q.id} className="scroll-mt-28 group">
                            <div className="flex gap-4 mb-4">
                                <div className="shrink-0 pt-0.5">
                                    <span className={`text-sm font-black w-6 h-6 flex items-center justify-center rounded-lg transition-colors ${answered ? 'text-white bg-indigo-500' : 'text-slate-300 bg-slate-50'}`}>
                                        {q.questionType === 'INFO' ? 'i' : num}
                                    </span>
                                </div>
                                <div className="flex-1 space-y-5">
                                    <div className="prose prose-slate prose-sm max-w-none text-slate-700 font-medium leading-relaxed">
                                        <div dangerouslySetInnerHTML={{ __html: optimizeHtml(q.questionText) }}></div>
                                    </div>

                                    <div>
                                        {q.questionType === 'MULTIPLE_CHOICE' && q.options && (
                                            <div className="flex flex-col gap-2">
                                                {q.options.map((opt, i) => {
                                                    const isSelected = answers[q.id] === opt;
                                                    return (
                                                        <button 
                                                            key={i} 
                                                            onClick={() => handleAnswerChange(q.id, opt)} 
                                                            className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex items-start gap-3 group/opt active:scale-[0.99] ${
                                                                isSelected 
                                                                ? 'border-indigo-500 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-500' 
                                                                : 'border-slate-100 bg-white hover:border-indigo-200 hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            <span className={`flex items-center justify-center w-5 h-5 rounded border text-[10px] font-bold mt-0.5 transition-colors shrink-0 ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 text-slate-400 group-hover/opt:border-indigo-300'}`}>
                                                                {String.fromCharCode(65 + i)}
                                                            </span>
                                                            <div className="text-sm text-slate-600 leading-snug" dangerouslySetInnerHTML={{ __html: optimizeHtml(opt) }}></div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {q.questionType === 'ESSAY' && (
                                            <textarea 
                                                value={answers[q.id] || ''} 
                                                onChange={e => handleAnswerChange(q.id, e.target.value)} 
                                                className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none min-h-[120px] text-sm text-slate-700 placeholder:text-slate-300 shadow-sm transition-all" 
                                                placeholder="Tulis jawaban..." 
                                            />
                                        )}

                                        {q.questionType === 'FILL_IN_THE_BLANK' && (
                                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-3 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 shadow-sm transition-all">
                                                <PencilIcon className="w-4 h-4 text-slate-400" />
                                                <input 
                                                    type="text" 
                                                    value={answers[q.id] || ''} 
                                                    onChange={e => handleAnswerChange(q.id, e.target.value)} 
                                                    className="w-full outline-none text-sm text-slate-700 bg-transparent placeholder:text-slate-300 font-medium" 
                                                    placeholder="Ketik jawaban singkat..." 
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {idx < exam.questions.length - 1 && <div className="h-px bg-slate-50 w-full my-8"></div>}
                        </div>
                    );
                })}
            </main>

            <div className="fixed bottom-6 inset-x-0 flex justify-center z-50 px-4 pointer-events-none">
                <div className="bg-white/90 backdrop-blur-xl p-1.5 rounded-full shadow-2xl shadow-indigo-500/10 border border-white/50 pointer-events-auto flex items-center gap-2 pr-2">
                    <div className="pl-4 pr-2 flex flex-col justify-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Terjawab</span>
                        <span className="text-sm font-black text-slate-800 leading-none">{answeredCount}<span className="text-slate-300 font-light mx-0.5">/</span>{totalQuestions}</span>
                    </div>
                    <button 
                        onClick={() => handleSubmit(false)} 
                        disabled={isSubmitting} 
                        className="bg-indigo-600 text-white px-5 py-2.5 rounded-full font-bold text-xs hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? '...' : 'Selesai'} <CheckCircleIcon className="w-3.5 h-3.5"/>
                    </button>
                </div>
            </div>
        </div>
    );
};
