
import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Exam, Student, Result, Question, ResultStatus } from '../types';
import { ClockIcon, CheckCircleIcon, ExclamationTriangleIcon, PencilIcon, ChevronDownIcon, CheckIcon, WifiIcon, SignalIcon } from './Icons';
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
    const scorableQuestions = exam.questions.filter(q => q.questionType !== 'INFO' && q.questionType !== 'ESSAY');
    
    scorableQuestions.forEach((q: any) => {
        const studentAnswer = answers[q.id];
        if (!studentAnswer) return;

        if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
             if (q.correctAnswer && normalize(studentAnswer) === normalize(q.correctAnswer)) correctCount++;
        } 
        else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
             const studentSet = new Set(normalize(studentAnswer).split(',').map(s => s.trim()));
             const correctSet = new Set(normalize(q.correctAnswer).split(',').map(s => s.trim()));
             if (studentSet.size === correctSet.size && [...studentSet].every(val => correctSet.has(val))) {
                 correctCount++;
             }
        }
        else if (q.questionType === 'TRUE_FALSE') {
            try {
                const ansObj = JSON.parse(studentAnswer);
                const allCorrect = q.trueFalseRows?.every((row: any, idx: number) => {
                    return ansObj[idx] === row.answer;
                });
                if (allCorrect) correctCount++;
            } catch (e) {}
        }
        else if (q.questionType === 'MATCHING') {
            try {
                const ansObj = JSON.parse(studentAnswer);
                const allCorrect = q.matchingPairs?.every((pair: any, idx: number) => {
                    return ansObj[idx] === pair.right;
                });
                if (allCorrect) correctCount++;
            } catch (e) {}
        }
    });

    const score = scorableQuestions.length > 0 ? Math.round((correctCount / scorableQuestions.length) * 100) : 0;
    return { score, correctAnswers: correctCount, totalQuestions: scorableQuestions.length };
};

export const StudentExamPage: React.FC<StudentExamPageProps> = ({ exam, student, initialData, onSubmit }) => {
    const STORAGE_KEY = `exam_local_${exam.code}_${student.studentId}`;
    const CACHED_EXAM_KEY = `exam_def_${exam.code}`;

    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userLocation, setUserLocation] = useState<string>('');
    const [activeExam, setActiveExam] = useState<Exam>(exam);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const answersRef = useRef<Record<string, string>>({});
    const logRef = useRef<string[]>(initialData?.activityLog || []);
    const isSubmittingRef = useRef(false);
    const timeLeftRef = useRef(0);
    const lastBroadcastTimeRef = useRef<number>(0);
    
    // Anti-cheat refs and state
    const violationsRef = useRef(0);
    const blurTimestampRef = useRef<number | null>(null);
    const [cheatingWarning, setCheatingWarning] = useState<string>('');

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        const loadState = () => {
            try { localStorage.setItem(CACHED_EXAM_KEY, JSON.stringify(exam)); } catch (e) { console.warn("Quota exceeded"); }
            const localData = localStorage.getItem(STORAGE_KEY);
            if (localData) {
                try {
                    const parsed = JSON.parse(localData);
                    setAnswers(parsed.answers || {});
                    answersRef.current = parsed.answers || {};
                    if (parsed.logs) logRef.current = parsed.logs;
                    return;
                } catch(e) { }
            }
            if (initialData?.answers) {
                setAnswers(initialData.answers);
                answersRef.current = initialData.answers;
            }
        };
        loadState();
    }, [STORAGE_KEY, initialData, exam]);

    useEffect(() => { isSubmittingRef.current = isSubmitting; }, [isSubmitting]);
    
    const handleSubmit = useMemo(() => async (auto = false, status: ResultStatus = 'completed') => {
        if (!auto && !confirm("Apakah Anda yakin ingin mengumpulkan jawaban?")) return;
        if (isSubmittingRef.current) return;
        
        setIsSubmitting(true);
        
        const grading = calculateGrade(exam, answersRef.current);
        await onSubmit(answersRef.current, timeLeftRef.current, status, logRef.current, userLocation, grading);
        
        if (status === 'completed' || status === 'force_closed') {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, [exam, userLocation, onSubmit]);

    // Anti-cheat useEffect (Condensed for readability)
    useEffect(() => {
        if (student.class === 'PREVIEW' || !exam.config.detectBehavior) return;

        const showWarning = (message: string) => {
            setCheatingWarning(message);
            setTimeout(() => setCheatingWarning(''), 5000);
        };

        const handleViolation = (type: 'soft' | 'hard', reason: string) => {
            if (isSubmittingRef.current) return;
            logRef.current.push(`[${new Date().toLocaleTimeString()}] Pelanggaran: ${reason}`);
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers: answersRef.current, logs: logRef.current }));

            if (exam.config.continueWithPermission) {
                alert("PELANGGARAN: Akses dikunci.");
                handleSubmit(true, 'force_closed');
                return;
            }
            
            if (type === 'hard') {
                violationsRef.current += 1;
                if (violationsRef.current > 3) {
                    alert("PELANGGARAN MAKSIMUM! Ujian dihentikan.");
                    handleSubmit(true, 'force_closed');
                } else {
                    showWarning(`PELANGGARAN! Sisa: ${3 - violationsRef.current}`);
                }
            } else { 
                showWarning("PERINGATAN: Tetap di halaman.");
            }
        };

        const handleVisibilityChange = () => { if (document.hidden && !isSubmittingRef.current) handleViolation('hard', 'Ganti Tab'); };
        const handleBlur = () => { if (!isSubmittingRef.current) blurTimestampRef.current = Date.now(); };
        const handleFocus = () => {
            if (blurTimestampRef.current && !isSubmittingRef.current) {
                const duration = (Date.now() - blurTimestampRef.current) / 1000;
                blurTimestampRef.current = null;
                if (duration > 5) handleViolation('hard', `Fokus hilang ${duration.toFixed(0)}s`);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
        };
    }, [exam, student, handleSubmit]);

    useEffect(() => {
        if (exam.config.trackLocation && student.class !== 'PREVIEW' && 'geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserLocation(`${pos.coords.latitude}, ${pos.coords.longitude}`),
                (err) => console.log(err)
            );
        }
    }, [exam.config.trackLocation]);

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
    }, [deadline, handleSubmit]);

    const handleAnswerChange = (qId: string, val: string) => {
        setAnswers(prev => {
            const next = { ...prev, [qId]: val };
            answersRef.current = next;
            if (student.class !== 'PREVIEW') {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers: next, logs: logRef.current, lastUpdated: Date.now() }));
            }
            return next;
        });

        if (student.class !== 'PREVIEW' && !exam.config.disableRealtime) {
            const now = Date.now();
            if (now - lastBroadcastTimeRef.current > 5000) { // Throttle broadcast 5s
                const totalQ = exam.questions.filter(q => q.questionType !== 'INFO').length;
                const answeredQ = exam.questions.filter(q => q.questionType !== 'INFO' && isAnswered(q, answersRef.current)).length;
                storageService.sendProgressUpdate(exam.code, student.studentId, answeredQ, totalQ).catch(()=>{});
                lastBroadcastTimeRef.current = now;
            }
        }
    };

    const isAnswered = (q: Question, ansMap: Record<string, string>) => {
        const v = ansMap[q.id];
        if (!v) return false;
        if (q.questionType === 'TRUE_FALSE' || q.questionType === 'MATCHING') {
            try { return Object.keys(JSON.parse(v)).length > 0; } catch(e) { return false; }
        }
        return v.trim() !== "";
    };

    const formatTime = (s: number) => {
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
        return h > 0 ? `${h}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}` : `${m}:${sec.toString().padStart(2,'0')}`;
    };

    const totalQuestions = exam.questions.filter(q => q.questionType !== 'INFO').length;
    const answeredCount = exam.questions.filter(q => q.questionType !== 'INFO' && isAnswered(q, answers)).length;
    const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
    const optimizeHtml = (html: string) => html.replace(/<img /g, '<img loading="lazy" class="rounded-2xl shadow-sm border border-slate-100 max-w-full h-auto my-3" ');

    return (
        <div className="min-h-screen bg-[#FAFAFA] font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-32">
            
            {/* Minimal Sticky Header with Blur */}
            <header className="fixed top-0 inset-x-0 z-[60] bg-white/80 backdrop-blur-md border-b border-slate-200/50 shadow-sm transition-all h-16 sm:h-20 flex items-center">
                 {/* Progress Line */}
                 <div className="absolute top-0 left-0 h-[3px] bg-slate-100 w-full z-0">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{width: `${progress}%`}}></div>
                 </div>

                 <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 flex items-center justify-between relative z-10">
                     <div className="flex items-center gap-4">
                         <div className="hidden sm:block">
                             <h1 className="text-base font-black text-slate-800 tracking-tight truncate max-w-[200px]">{exam.config.subject}</h1>
                             <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 tracking-wider">{exam.code}</span>
                                {!isOnline && <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1"><SignalIcon className="w-3 h-3"/> Offline</span>}
                             </div>
                         </div>
                         <div className="sm:hidden">
                            <h1 className="text-sm font-black text-slate-800">{answeredCount}<span className="text-slate-400 text-xs font-medium">/{totalQuestions}</span></h1>
                         </div>
                     </div>

                     <div className="flex items-center gap-3">
                         {/* Timer Pill */}
                         <div className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border transition-all shadow-sm ${timeLeft < 300 ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse ring-2 ring-rose-100' : 'bg-white text-slate-600 border-slate-200'}`}>
                             <ClockIcon className="w-4 h-4" />
                             <span className="text-sm font-black font-mono tracking-tight">{formatTime(timeLeft)}</span>
                         </div>
                     </div>
                 </div>
            </header>

            {cheatingWarning && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[80] bg-rose-600 text-white px-6 py-3 rounded-full shadow-xl shadow-rose-200 text-xs font-bold animate-bounce flex items-center gap-3 ring-4 ring-white">
                    <ExclamationTriangleIcon className="w-5 h-5" /> 
                    <span>{cheatingWarning}</span>
                </div>
            )}

            <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32 space-y-8 sm:space-y-12">
                {activeExam.questions.map((q, idx) => {
                    const num = activeExam.questions.slice(0, idx).filter(i => i.questionType !== 'INFO').length + 1;
                    const answered = isAnswered(q, answers);
                    
                    return (
                        <div key={q.id} id={q.id} className="scroll-mt-32 animate-fade-in group">
                            <div className={`relative bg-white rounded-[2rem] border transition-all duration-300 p-6 sm:p-8 ${answered ? 'border-indigo-100 shadow-lg shadow-indigo-100/50' : 'border-slate-100 shadow-sm hover:shadow-md'}`}>
                                
                                {/* Question Number Badge */}
                                <div className="absolute -top-3 -left-2 sm:-left-4">
                                     <span className={`h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-2xl text-sm sm:text-base font-black shadow-sm transition-all border-4 border-[#FAFAFA] ${answered ? 'bg-indigo-600 text-white' : 'bg-white text-slate-300 border-[#FAFAFA]'}`}>
                                        {q.questionType === 'INFO' ? 'i' : num}
                                    </span>
                                </div>

                                <div className="mt-2 sm:mt-0 sm:ml-6">
                                    <div className="prose prose-slate prose-p:text-slate-700 prose-headings:text-slate-800 prose-strong:text-slate-900 max-w-none font-medium leading-relaxed text-[15px] sm:text-base mb-8">
                                        <div dangerouslySetInnerHTML={{ __html: optimizeHtml(q.questionText) }}></div>
                                    </div>

                                    <div className="space-y-3 sm:space-y-4">
                                        {/* PILIHAN GANDA & KOMPLEKS */}
                                        {(q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'COMPLEX_MULTIPLE_CHOICE') && q.options && (
                                            <div className="grid grid-cols-1 gap-3">
                                                {q.options.map((opt, i) => {
                                                    const isComplex = q.questionType === 'COMPLEX_MULTIPLE_CHOICE';
                                                    const currentAns = answers[q.id];
                                                    const isSelected = isComplex 
                                                        ? (currentAns ? currentAns.split(',').includes(opt) : false)
                                                        : currentAns === opt;

                                                    return (
                                                        <label 
                                                            key={i} 
                                                            className={`relative w-full cursor-pointer p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 flex items-start gap-4 group/opt select-none ${isSelected ? 'border-indigo-500 bg-indigo-50/50 shadow-inner' : 'border-slate-100 bg-white hover:border-indigo-200 hover:bg-slate-50'}`}
                                                        >
                                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all mt-0.5 shrink-0 ${isSelected ? 'bg-indigo-500 border-indigo-500 scale-110' : 'border-slate-200 bg-slate-50 group-hover/opt:border-indigo-300'}`}>
                                                                {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
                                                            </div>
                                                            <input 
                                                                type={isComplex ? "checkbox" : "radio"}
                                                                name={`q-${q.id}`}
                                                                className="hidden"
                                                                checked={isSelected}
                                                                onChange={() => {
                                                                    if (isComplex) {
                                                                        const curr = currentAns ? currentAns.split(',') : [];
                                                                        const next = isSelected ? curr.filter(x => x !== opt) : [...curr, opt];
                                                                        handleAnswerChange(q.id, next.join(','));
                                                                    } else {
                                                                        handleAnswerChange(q.id, opt);
                                                                    }
                                                                }}
                                                            />
                                                            <div className={`text-[15px] leading-relaxed transition-colors ${isSelected ? 'text-indigo-900 font-medium' : 'text-slate-600 font-medium'}`} dangerouslySetInnerHTML={{ __html: optimizeHtml(opt) }}></div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* TRUE FALSE */}
                                        {q.questionType === 'TRUE_FALSE' && q.trueFalseRows && (
                                            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                                {q.trueFalseRows.map((row, i) => {
                                                    const currentAnsObj = answers[q.id] ? JSON.parse(answers[q.id]) : {};
                                                    return (
                                                        <div key={i} className="p-4 bg-white border-b border-slate-100 last:border-0 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-slate-50 transition-colors">
                                                            <div className="flex-1 font-medium text-slate-700 text-sm">{row.text}</div>
                                                            <div className="flex gap-2 shrink-0">
                                                                <button onClick={() => handleAnswerChange(q.id, JSON.stringify({ ...currentAnsObj, [i]: true }))} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${currentAnsObj[i] === true ? 'bg-emerald-500 text-white border-emerald-500 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:border-emerald-300'}`}>Benar</button>
                                                                <button onClick={() => handleAnswerChange(q.id, JSON.stringify({ ...currentAnsObj, [i]: false }))} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${currentAnsObj[i] === false ? 'bg-rose-500 text-white border-rose-500 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:border-rose-300'}`}>Salah</button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* MATCHING */}
                                        {q.questionType === 'MATCHING' && q.matchingPairs && (
                                            <div className="space-y-3">
                                                {(() => {
                                                    const rightOptions = useMemo(() => {
                                                        const opts = q.matchingPairs!.map(p => p.right);
                                                        // Shuffle visual only
                                                        for (let i = opts.length - 1; i > 0; i--) { 
                                                            const j = Math.floor(Math.random() * (i + 1)); 
                                                            [opts[i], opts[j]] = [opts[j], opts[i]]; 
                                                        }
                                                        return opts;
                                                    }, [q.id]);

                                                    return q.matchingPairs.map((pair, i) => {
                                                        const currentAnsObj = answers[q.id] ? JSON.parse(answers[q.id]) : {};
                                                        return (
                                                            <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                                                                <div className="flex-1 font-bold text-slate-700 text-sm">{pair.left}</div>
                                                                <div className="hidden sm:block text-slate-300">➜</div>
                                                                <div className="flex-1 relative">
                                                                    <select 
                                                                        value={currentAnsObj[i] || ''} 
                                                                        onChange={(e) => handleAnswerChange(q.id, JSON.stringify({ ...currentAnsObj, [i]: e.target.value }))} 
                                                                        className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-3 px-4 pr-10 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer shadow-sm"
                                                                    >
                                                                        <option value="" disabled>Pilih Pasangan...</option>
                                                                        {rightOptions.map((opt, idx) => (
                                                                            <option key={idx} value={opt}>{opt}</option>
                                                                        ))}
                                                                    </select>
                                                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500"><ChevronDownIcon className="w-4 h-4"/></div>
                                                                </div>
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        )}

                                        {/* ESSAY & ISIAN */}
                                        {(q.questionType === 'ESSAY' || q.questionType === 'FILL_IN_THE_BLANK') && (
                                             <div className="relative group/input">
                                                {q.questionType === 'FILL_IN_THE_BLANK' && (
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                        <PencilIcon className="w-5 h-5 text-slate-400 group-focus-within/input:text-indigo-500 transition-colors" />
                                                    </div>
                                                )}
                                                {q.questionType === 'ESSAY' ? (
                                                    <textarea 
                                                        value={answers[q.id] || ''} 
                                                        onChange={e => handleAnswerChange(q.id, e.target.value)} 
                                                        className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none min-h-[180px] text-sm text-slate-700 placeholder:text-slate-400 transition-all resize-y leading-relaxed" 
                                                        placeholder="Tuliskan jawaban uraian Anda di sini..." 
                                                    />
                                                ) : (
                                                    <input 
                                                        type="text" 
                                                        value={answers[q.id] || ''} 
                                                        onChange={e => handleAnswerChange(q.id, e.target.value)} 
                                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-bold text-slate-800 placeholder:text-slate-400 transition-all" 
                                                        placeholder="Ketik jawaban singkat..." 
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </main>

            {/* Floating Action Bar (Mobile Friendly) */}
            <div className="fixed bottom-6 inset-x-0 flex justify-center z-50 px-6 pointer-events-none">
                <div className="bg-white/90 backdrop-blur-xl p-2 pr-3 rounded-[20px] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] border border-white/50 ring-1 ring-slate-200/50 pointer-events-auto flex items-center gap-4 transition-transform hover:scale-105">
                    <div className="pl-4 flex flex-col justify-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-lg font-black text-slate-800">{answeredCount}</span>
                            <span className="text-xs font-bold text-slate-400">/ {totalQuestions}</span>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-slate-200"></div>
                    <button 
                        onClick={() => handleSubmit(false)} 
                        disabled={isSubmitting} 
                        className="bg-slate-900 text-white pl-6 pr-6 py-3.5 rounded-2xl font-bold text-xs hover:bg-indigo-600 transition-all flex items-center gap-2 shadow-lg shadow-slate-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed group"
                    >
                        <span>{isSubmitting ? 'Mengirim...' : 'Selesai'}</span>
                        <CheckCircleIcon className="w-4 h-4 group-hover:text-emerald-300 transition-colors"/>
                    </button>
                </div>
            </div>
        </div>
    );
};
