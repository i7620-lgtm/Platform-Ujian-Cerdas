
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Exam, Student, Result, Question, ResultStatus } from '../types';
import { 
    ClockIcon, 
    ListBulletIcon, 
    CheckCircleIcon, 
    ArrowLeftIcon,
    ExclamationTriangleIcon,
    NoWifiIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    EyeIcon
} from './Icons';
import { supabase } from '../lib/supabase';

interface StudentExamPageProps {
  exam: Exam;
  student: Student;
  initialData: Result | null;
  onSubmit: (answers: Record<string, string>, timeLeft: number, status: ResultStatus, activityLog: string[], location?: string, grading?: any) => Promise<void>;
}

// Helper: Calculate Grade Locally
const calculateGrade = (exam: Exam, answers: Record<string, string>) => {
    let correct = 0;
    const scorableQuestions = exam.questions.filter(q => q.questionType !== 'INFO');
    
    scorableQuestions.forEach(q => {
        const ans = answers[q.id];
        if (!ans) return;
        
        const normalize = (s: string) => s.trim().toLowerCase();
        
        if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
            if (normalize(ans) === normalize(q.correctAnswer || '')) correct++;
        } else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
            const sSet = new Set(normalize(ans).split(',').map(s=>s.trim()));
            const cSet = new Set(normalize(q.correctAnswer || '').split(',').map(s=>s.trim()));
            if (sSet.size === cSet.size && [...sSet].every(x => cSet.has(x))) correct++;
        } else if (q.questionType === 'TRUE_FALSE') {
            try {
                const ansObj = JSON.parse(ans);
                if (q.trueFalseRows?.every((row, idx) => ansObj[idx] === row.answer)) correct++;
            } catch(e) {}
        } else if (q.questionType === 'MATCHING') {
            try {
                const ansObj = JSON.parse(ans);
                if (q.matchingPairs?.every((pair, idx) => ansObj[idx] === pair.right)) correct++;
            } catch(e) {}
        }
    });
    
    return {
        score: scorableQuestions.length > 0 ? Math.round((correct / scorableQuestions.length) * 100) : 0,
        correctAnswers: correct,
        totalQuestions: scorableQuestions.length
    };
};

const isAnswered = (q: Question, answers: Record<string, string>) => {
    const ans = answers[q.id];
    if (ans === undefined || ans === null || ans === '') return false;
    if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') return ans.length > 0;
    if (q.questionType === 'TRUE_FALSE' || q.questionType === 'MATCHING') {
        try { return Object.keys(JSON.parse(ans)).length > 0; } catch(e) { return false; }
    }
    return true;
};

export const StudentExamPage: React.FC<StudentExamPageProps> = ({ exam, student, initialData, onSubmit }) => {
    const STORAGE_KEY = `exam_progress_${exam.code}_${student.studentId}`;
    
    // --- STATE ---
    const [activeExam, setActiveExam] = useState<Exam>(exam);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>(initialData?.answers || {});
    const [isNavOpen, setIsNavOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [cheatWarningCount, setCheatWarningCount] = useState(0);
    const [timeExtensionNotif, setTimeExtensionNotif] = useState<string | null>(null);

    // --- REFS ---
    const answersRef = useRef<Record<string, string>>(answers);
    const logRef = useRef<string[]>(initialData?.activityLog || []);
    const userLocationRef = useRef<string | undefined>(undefined);
    const isSubmittingRef = useRef(false);
    const channelRef = useRef<any>(null);
    const lastBroadcastTimeRef = useRef<number>(0);

    // Sync Refs
    useEffect(() => { answersRef.current = answers; }, [answers]);

    // --- TIME SYNC LOGIC (CORRECTED) ---
    // Calculate deadline based on Absolute Start Time + Limit
    const deadline = useMemo(() => {
        // Handle "Preview" mode or dateless exams gracefully
        if (student.class === 'PREVIEW') return Date.now() + (activeExam.config.timeLimit * 60 * 1000);

        const dateStr = activeExam.config.date.includes('T') ? activeExam.config.date.split('T')[0] : activeExam.config.date;
        const start = new Date(`${dateStr}T${activeExam.config.startTime}`);
        return start.getTime() + (activeExam.config.timeLimit * 60 * 1000);
    }, [activeExam.config.date, activeExam.config.startTime, activeExam.config.timeLimit, student.class]);

    const [timeLeft, setTimeLeft] = useState<number>(0);

    useEffect(() => {
        const timer = setInterval(() => {
            const now = Date.now();
            const diff = Math.floor((deadline - now) / 1000);
            
            if (diff <= 0) {
                setTimeLeft(0);
                if (!isSubmittingRef.current && student.class !== 'PREVIEW') {
                    handleSubmit(true, 'completed');
                }
                clearInterval(timer);
            } else {
                setTimeLeft(diff);
            }
        }, 1000);
        
        // Initial tick
        const now = Date.now();
        setTimeLeft(Math.max(0, Math.floor((deadline - now) / 1000)));

        return () => clearInterval(timer);
    }, [deadline]);

    // --- REALTIME CONFIG LISTENER (ADD TIME FEATURE) ---
    useEffect(() => {
        const channel = supabase.channel(`exam-config-${exam.code}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'exams', filter: `code=eq.${exam.code}` },
                (payload) => {
                    const newConfig = payload.new.config;
                    if (newConfig) {
                        setActiveExam(prev => {
                            const oldLimit = prev.config.timeLimit;
                            const newLimit = newConfig.timeLimit;
                            if (newLimit > oldLimit) {
                                const diff = newLimit - oldLimit;
                                setTimeExtensionNotif(`Waktu diperpanjang ${diff} menit!`);
                                setTimeout(() => setTimeExtensionNotif(null), 5000);
                            }
                            return { ...prev, config: newConfig };
                        });
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [exam.code]);

    // --- SUBMISSION ---
    const handleSubmit = async (auto = false, status: ResultStatus = 'completed') => {
        if (!auto && status !== 'force_closed') {
            const scorableQuestions = activeExam.questions.filter(q => q.questionType !== 'INFO');
            const unansweredCount = scorableQuestions.filter(q => !isAnswered(q, answersRef.current)).length;

            if (unansweredCount > 0) {
                setIsNavOpen(true);
                if (!confirm(`Masih ada ${unansweredCount} soal belum diisi. Yakin kumpulkan?`)) return;
            } else {
                 if (!confirm("Kumpulkan jawaban sekarang?")) return;
            }
        }
        
        if (isSubmittingRef.current) return;
        
        // Save final state locally
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            answers: answersRef.current,
            timestamp: Date.now()
        }));

        isSubmittingRef.current = true;
        setIsSubmitting(true);
        
        try {
            // Force Close (Cheating) allows offline submit
            if (!navigator.onLine && status === 'completed' && !auto) {
                throw new Error("Offline");
            }

            const grading = calculateGrade(activeExam, answersRef.current);
            await onSubmit(answersRef.current, timeLeft, status, logRef.current, userLocationRef.current, grading);
            
            if (status === 'completed' || status === 'force_closed') {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch (error: any) {
            console.error("Submit failed:", error);
            let msg = "Gagal mengirim. Periksa koneksi.";
            if (error.message === "Offline") msg = "Koneksi terputus. Pastikan online untuk mengumpulkan.";
            alert(msg);
            isSubmittingRef.current = false;
            setIsSubmitting(false);
        }
    };

    // --- INITIALIZATION & EFFECTS ---
    useEffect(() => {
        // Load Local
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.answers) {
                    setAnswers(prev => ({ ...prev, ...parsed.answers }));
                    answersRef.current = { ...answers, ...parsed.answers };
                }
            } catch(e) {}
        }

        // Location
        if (activeExam.config.trackLocation && navigator.geolocation) {
             navigator.geolocation.getCurrentPosition(
                (pos) => { userLocationRef.current = `${pos.coords.latitude},${pos.coords.longitude}`; },
                (err) => { console.warn("Loc failed", err); }
             );
        }

        // --- ANTI CHEAT ---
        const handleViolation = () => {
             if (!activeExam.config.detectBehavior || student.class === 'PREVIEW') return;

             const timestamp = new Date().toLocaleTimeString();
             const msg = `[${timestamp}] Meninggalkan ujian (Tab Switch/Blur)`;
             logRef.current.push(msg);
             setCheatWarningCount(prev => prev + 1);

             if (activeExam.config.continueWithPermission) {
                 handleSubmit(true, 'force_closed');
             }
        };

        const handleVisibilityChange = () => { if (document.hidden) handleViolation(); };
        const handleBlur = () => { if (activeExam.config.detectBehavior) handleViolation(); };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur); 
        
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // --- AUTO SAVE ---
    useEffect(() => {
        const interval = setInterval(() => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                answers: answersRef.current,
                timestamp: Date.now()
            }));
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    // --- REALTIME PROGRESS BROADCAST ---
    useEffect(() => {
        if (activeExam.config.disableRealtime) return;
        const channel = supabase.channel(`exam-room-${activeExam.code}`, { config: { broadcast: { self: false } } });
        channel.subscribe(status => { if (status === 'SUBSCRIBED') channelRef.current = channel; });
        return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
    }, [activeExam.code]);

    const broadcastProgress = () => {
        if (activeExam.config.disableRealtime || !channelRef.current) return;
        const totalQ = activeExam.questions.filter(q => q.questionType !== 'INFO').length;
        const answeredQ = activeExam.questions.filter(q => q.questionType !== 'INFO' && isAnswered(q, answersRef.current)).length;
        channelRef.current.send({
            type: 'broadcast',
            event: 'student_progress',
            payload: { studentId: student.studentId, answeredCount: answeredQ, totalQuestions: totalQ, timestamp: Date.now() }
        }).catch(() => {});
    };

    const handleAnswerChange = (qId: string, value: string) => {
        setAnswers(prev => {
            const next = { ...prev, [qId]: value };
            answersRef.current = next;
            return next;
        });

        const now = Date.now();
        if (now - lastBroadcastTimeRef.current > 3000) {
            broadcastProgress();
            lastBroadcastTimeRef.current = now;
        }
    };

    const currentQuestion = activeExam.questions[currentQuestionIndex];
    const formatTime = (s: number) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
             {/* Header */}
             <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                           <span className="font-black text-xs">{currentQuestionIndex + 1}</span>
                        </div>
                        <div>
                             <h1 className="text-sm font-black text-slate-800 tracking-tight line-clamp-1">{activeExam.config.subject}</h1>
                             <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{student.fullName}</span>
                                {!isOnline && <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 flex items-center gap-1"><NoWifiIcon className="w-3 h-3"/> Offline</span>}
                             </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                         <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${timeLeft < 300 ? 'bg-rose-50 border-rose-100 text-rose-600 animate-pulse' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                             <ClockIcon className="w-4 h-4" />
                             <span className="font-mono font-bold text-sm tabular-nums">{formatTime(timeLeft)}</span>
                         </div>
                         <button onClick={() => setIsNavOpen(!isNavOpen)} className="p-2 bg-slate-100 rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                             <ListBulletIcon className="w-5 h-5" />
                         </button>
                    </div>
                </div>
                {/* Notifications Banner */}
                <div className="flex flex-col">
                    {activeExam.config.detectBehavior && (
                        <div className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest text-center py-1.5 flex items-center justify-center gap-2">
                            <EyeIcon className="w-3 h-3 text-rose-400" />
                            <span>Pengawasan Aktif</span>
                            {cheatWarningCount > 0 && !activeExam.config.continueWithPermission && (
                                <span className="bg-rose-500 text-white px-1.5 rounded ml-2 animate-pulse">{cheatWarningCount}x Pelanggaran</span>
                            )}
                        </div>
                    )}
                    {timeExtensionNotif && (
                        <div className="bg-emerald-500 text-white text-xs font-bold text-center py-2 animate-slide-in-up">
                            {timeExtensionNotif}
                        </div>
                    )}
                </div>
             </header>

             {/* Navigation Drawer */}
             {isNavOpen && (
                 <div className="fixed inset-0 z-40 flex justify-end">
                     <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsNavOpen(false)}></div>
                     <div className="relative w-80 bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
                         <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                             <h3 className="font-bold text-slate-800">Navigasi Soal</h3>
                             <button onClick={() => setIsNavOpen(false)} className="p-1 rounded-full hover:bg-slate-100"><ArrowLeftIcon className="w-5 h-5 rotate-180" /></button>
                         </div>
                         <div className="flex-1 overflow-y-auto p-5">
                             <div className="grid grid-cols-5 gap-3">
                                 {activeExam.questions.map((q, idx) => {
                                     const answered = isAnswered(q, answers);
                                     const current = idx === currentQuestionIndex;
                                     return (
                                         <button 
                                            key={q.id} 
                                            onClick={() => { setCurrentQuestionIndex(idx); setIsNavOpen(false); }}
                                            className={`
                                                aspect-square rounded-xl text-xs font-bold flex items-center justify-center transition-all border
                                                ${current ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200 scale-110' : 
                                                  answered ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                                                  'bg-slate-50 text-slate-500 border-slate-200 hover:bg-white hover:border-indigo-200'}
                                            `}
                                         >
                                             {idx + 1}
                                         </button>
                                     );
                                 })}
                             </div>
                         </div>
                         <div className="p-5 border-t border-slate-100">
                             <button onClick={() => handleSubmit(false)} disabled={isSubmitting} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-black transition-all disabled:opacity-50">
                                 {isSubmitting ? 'Mengirim...' : 'Kumpulkan Jawaban'}
                             </button>
                         </div>
                     </div>
                 </div>
             )}

             {/* Main Content */}
             <main className="flex-1 max-w-3xl mx-auto w-full p-4 md:p-6 pb-24">
                 <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden min-h-[50vh] flex flex-col">
                     <div className="p-6 md:p-8 flex-1">
                         <div className="flex justify-between items-start mb-6">
                            <span className="text-xs font-black text-slate-300 uppercase tracking-widest">Soal No. {currentQuestionIndex + 1}</span>
                            {currentQuestion.questionType !== 'INFO' && (
                                <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase tracking-wide ${isAnswered(currentQuestion, answers) ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                    {isAnswered(currentQuestion, answers) ? 'Sudah Diisi' : 'Belum Diisi'}
                                </span>
                            )}
                         </div>
                         
                         {/* Question Text */}
                         <div className="prose prose-slate prose-lg max-w-none mb-8">
                             <div dangerouslySetInnerHTML={{ __html: currentQuestion.questionText }} />
                             {currentQuestion.imageUrl && <img src={currentQuestion.imageUrl} alt="Soal" className="rounded-xl mt-4 max-h-96 object-contain" />}
                         </div>

                         {/* Answer Input Area */}
                         <div className="space-y-4">
                             {/* MULTIPLE CHOICE */}
                             {currentQuestion.questionType === 'MULTIPLE_CHOICE' && currentQuestion.options && (
                                 <div className="grid grid-cols-1 gap-3">
                                     {currentQuestion.options.map((opt, i) => {
                                         const isSelected = answers[currentQuestion.id] === opt;
                                         return (
                                             <button 
                                                key={i}
                                                onClick={() => handleAnswerChange(currentQuestion.id, opt)}
                                                className={`
                                                    text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3 group
                                                    ${isSelected ? 'border-indigo-500 bg-indigo-50/30 ring-1 ring-indigo-500' : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50'}
                                                `}
                                             >
                                                 <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${isSelected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300 group-hover:border-indigo-300'}`}>
                                                     <span className="text-xs font-bold">{String.fromCharCode(65 + i)}</span>
                                                 </div>
                                                 <div className="text-sm font-medium text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: opt }} />
                                             </button>
                                         )
                                     })}
                                 </div>
                             )}

                             {/* COMPLEX MULTIPLE CHOICE */}
                             {currentQuestion.questionType === 'COMPLEX_MULTIPLE_CHOICE' && currentQuestion.options && (
                                 <div className="grid grid-cols-1 gap-3">
                                     {currentQuestion.options.map((opt, i) => {
                                         const currentAns = answers[currentQuestion.id] ? answers[currentQuestion.id].split(',') : [];
                                         const isSelected = currentAns.includes(opt);
                                         
                                         const toggle = () => {
                                             let newAns;
                                             if (isSelected) newAns = currentAns.filter(a => a !== opt);
                                             else newAns = [...currentAns, opt];
                                             handleAnswerChange(currentQuestion.id, newAns.join(','));
                                         };

                                         return (
                                             <button 
                                                key={i}
                                                onClick={toggle}
                                                className={`
                                                    text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3 group
                                                    ${isSelected ? 'border-indigo-500 bg-indigo-50/30 ring-1 ring-indigo-500' : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50'}
                                                `}
                                             >
                                                 <div className={`w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${isSelected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300 group-hover:border-indigo-300'}`}>
                                                     {isSelected && <CheckCircleIcon className="w-4 h-4" />}
                                                 </div>
                                                 <div className="text-sm font-medium text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: opt }} />
                                             </button>
                                         )
                                     })}
                                 </div>
                             )}

                             {/* TRUE FALSE */}
                             {currentQuestion.questionType === 'TRUE_FALSE' && currentQuestion.trueFalseRows && (
                                 <div className="space-y-2">
                                     <div className="grid grid-cols-12 gap-2 mb-2 px-2">
                                         <div className="col-span-8 text-[10px] font-bold text-slate-400 uppercase">Pernyataan</div>
                                         <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase text-center">Benar</div>
                                         <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase text-center">Salah</div>
                                     </div>
                                     {currentQuestion.trueFalseRows.map((row, idx) => {
                                         const currentAns = answers[currentQuestion.id] ? JSON.parse(answers[currentQuestion.id]) : {};
                                         const setVal = (val: boolean) => {
                                             const newObj = { ...currentAns, [idx]: val };
                                             handleAnswerChange(currentQuestion.id, JSON.stringify(newObj));
                                         };

                                         return (
                                             <div key={idx} className="grid grid-cols-12 gap-2 items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                 <div className="col-span-8 text-sm font-medium text-slate-700">{row.text}</div>
                                                 <div className="col-span-2 flex justify-center">
                                                     <button onClick={() => setVal(true)} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${currentAns[idx] === true ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300'}`}>B</button>
                                                 </div>
                                                 <div className="col-span-2 flex justify-center">
                                                     <button onClick={() => setVal(false)} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${currentAns[idx] === false ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white border-slate-300'}`}>S</button>
                                                 </div>
                                             </div>
                                         )
                                     })}
                                 </div>
                             )}
                             
                             {/* ESSAY & FILL IN THE BLANK */}
                             {(currentQuestion.questionType === 'ESSAY' || currentQuestion.questionType === 'FILL_IN_THE_BLANK') && (
                                 <textarea
                                    value={answers[currentQuestion.id] || ''}
                                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                                    className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all min-h-[150px] text-sm font-medium text-slate-800 leading-relaxed resize-y"
                                    placeholder={currentQuestion.questionType === 'ESSAY' ? "Tulis jawaban uraian Anda di sini..." : "Tulis jawaban singkat di sini..."}
                                 />
                             )}
                             
                             {/* MATCHING */}
                             {currentQuestion.questionType === 'MATCHING' && currentQuestion.matchingPairs && (
                                 <div className="space-y-4">
                                     <p className="text-xs text-slate-500 italic">Pasangkan item kiri dengan item kanan yang sesuai.</p>
                                     {currentQuestion.matchingPairs.map((pair, idx) => {
                                          const currentAns = answers[currentQuestion.id] ? JSON.parse(answers[currentQuestion.id]) : {};
                                          const onChange = (val: string) => {
                                              const newObj = { ...currentAns, [idx]: val };
                                              handleAnswerChange(currentQuestion.id, JSON.stringify(newObj));
                                          };
                                          return (
                                              <div key={idx} className="flex flex-col md:flex-row gap-2 md:items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                  <div className="flex-1 text-sm font-bold text-slate-700 bg-white p-2 rounded border border-slate-200">{pair.left}</div>
                                                  <div className="text-slate-400 hidden md:block">→</div>
                                                  <input 
                                                    type="text" 
                                                    value={currentAns[idx] || ''} 
                                                    onChange={e => onChange(e.target.value)}
                                                    className="flex-1 p-2 text-sm border border-slate-200 rounded focus:border-indigo-500 outline-none"
                                                    placeholder="Tulis pasangan..."
                                                  />
                                              </div>
                                          )
                                     })}
                                 </div>
                             )}
                             
                             {currentQuestion.questionType === 'INFO' && (
                                 <div className="text-center p-8 bg-blue-50 rounded-xl text-blue-600 font-bold text-sm">
                                     Ini adalah informasi. Silakan baca dengan seksama dan lanjutkan ke soal berikutnya.
                                 </div>
                             )}
                         </div>
                     </div>
                     
                     {/* Footer Navigation */}
                     <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                         <button 
                            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentQuestionIndex === 0}
                            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm shadow-sm"
                         >
                             <ArrowLeftIcon className="w-4 h-4" /> Sebelumnya
                         </button>
                         
                         {currentQuestionIndex === activeExam.questions.length - 1 ? (
                             <button 
                                onClick={() => handleSubmit(false)}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all text-sm shadow-lg shadow-indigo-200 disabled:opacity-70"
                             >
                                 {isSubmitting ? 'Mengirim...' : 'Selesai & Kumpulkan'} <CheckCircleIcon className="w-4 h-4" />
                             </button>
                         ) : (
                             <button 
                                onClick={() => setCurrentQuestionIndex(prev => Math.min(activeExam.questions.length - 1, prev + 1))}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-slate-900 hover:bg-black transition-all text-sm shadow-lg shadow-slate-200"
                             >
                                 Selanjutnya <ArrowLeftIcon className="w-4 h-4 rotate-180" />
                             </button>
                         )}
                     </div>
                 </div>
                 
                 <div className="mt-8 text-center">
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">UjianCerdas • Secure Exam Environment</p>
                 </div>
             </main>
        </div>
    );
};
