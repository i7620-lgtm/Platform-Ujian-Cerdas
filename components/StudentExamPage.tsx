
import React, { useState, useEffect, useRef } from 'react';
import type { Exam, Student, Result, Question, ResultStatus } from '../types';
import { 
    ClockIcon, 
    ListBulletIcon, 
    CheckCircleIcon, 
    ArrowLeftIcon,
    ExclamationTriangleIcon,
    WifiIcon,
    NoWifiIcon,
    ChevronDownIcon,
    ChevronUpIcon
} from './Icons';
import { storageService } from '../services/storage';

interface StudentExamPageProps {
  exam: Exam;
  student: Student;
  initialData: Result | null;
  onSubmit: (answers: Record<string, string>, timeLeft: number, status: ResultStatus, activityLog: string[], location?: string, grading?: any) => Promise<void>;
}

// Helper to check if answered
const isAnswered = (q: Question, answers: Record<string, string>) => {
    const ans = answers[q.id];
    if (ans === undefined || ans === null || ans === '') return false;
    if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') return ans.length > 0;
    if (q.questionType === 'TRUE_FALSE') {
        try { return Object.keys(JSON.parse(ans)).length > 0; } catch(e) { return false; }
    }
    if (q.questionType === 'MATCHING') {
        try { return Object.keys(JSON.parse(ans)).length > 0; } catch(e) { return false; }
    }
    return true;
};

// Helper to calculate grade locally
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

export const StudentExamPage: React.FC<StudentExamPageProps> = ({ exam, student, initialData, onSubmit }) => {
    const STORAGE_KEY = `exam_progress_${exam.code}_${student.studentId}`;
    
    // State
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>(initialData?.answers || {});
    const [timeLeft, setTimeLeft] = useState<number>(exam.config.timeLimit * 60); // seconds
    const [isNavOpen, setIsNavOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    
    // Refs
    const answersRef = useRef<Record<string, string>>(answers);
    const timeLeftRef = useRef<number>(timeLeft);
    const logRef = useRef<string[]>(initialData?.activityLog || []);
    const isSubmittingRef = useRef(false);
    const userLocationRef = useRef<string | undefined>(undefined);
    
    // Realtime Broadcast Refs
    const lastBroadcastTimeRef = useRef<number>(0);
    const broadcastTimeoutRef = useRef<any>(null);
    
    // Sync refs
    useEffect(() => { answersRef.current = answers; }, [answers]);
    useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

    // Initialize logic
    useEffect(() => {
        // Load from local storage if available and newer/valid
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.answers) {
                    setAnswers(prev => ({ ...prev, ...parsed.answers }));
                    answersRef.current = { ...answers, ...parsed.answers }; // Immediate sync
                }
                if (parsed.timeLeft) {
                    setTimeLeft(parsed.timeLeft);
                }
            } catch(e) { console.error("Error loading local progress", e); }
        }

        // Location tracking
        if (exam.config.trackLocation && navigator.geolocation) {
             navigator.geolocation.getCurrentPosition(
                (pos) => { userLocationRef.current = `${pos.coords.latitude},${pos.coords.longitude}`; },
                (err) => { console.warn("Location access denied", err); }
             );
        }

        // Behavior detection
        const handleVisibilityChange = () => {
             if (document.hidden && exam.config.detectBehavior) {
                 logRef.current.push(`[${new Date().toLocaleTimeString()}] Meninggalkan tab/browser`);
             }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Timer Logic
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit(true, 'completed'); // Auto submit
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Auto Save Logic
    useEffect(() => {
        const saveToLocal = () => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                answers: answersRef.current,
                timeLeft: timeLeftRef.current,
                timestamp: Date.now()
            }));
        };
        const interval = setInterval(saveToLocal, (exam.config.autoSaveInterval || 10) * 1000);
        return () => clearInterval(interval);
    }, []);

    // Broadcast Progress Logic
    const broadcastProgress = () => {
        if (exam.config.disableRealtime) return;
        
        const totalQ = exam.questions.filter(q => q.questionType !== 'INFO').length;
        const answeredQ = exam.questions.filter(q => q.questionType !== 'INFO' && isAnswered(q, answersRef.current)).length;
        
        storageService.sendProgressUpdate(exam.code, student.studentId, answeredQ, totalQ)
            .catch(e => { /* Ignore broadcast errors silently */ });
    };

    const handleAnswerChange = (qId: string, value: string) => {
        setAnswers(prev => {
            const next = { ...prev, [qId]: value };
            answersRef.current = next; // Sync immediate for reliability
            return next;
        });

        // Realtime Broadcast Throttle
        const now = Date.now();
        if (now - lastBroadcastTimeRef.current > 2000) {
            broadcastProgress();
            lastBroadcastTimeRef.current = now;
        } else {
            if (broadcastTimeoutRef.current) clearTimeout(broadcastTimeoutRef.current);
            broadcastTimeoutRef.current = setTimeout(() => {
                broadcastProgress();
                lastBroadcastTimeRef.current = Date.now();
            }, 2000);
        }
    };

    const handleSubmit = async (auto = false, status: ResultStatus = 'completed') => {
        if (!auto) {
            // Manual submission validation
            const scorableQuestions = exam.questions.filter(q => q.questionType !== 'INFO');
            const unansweredCount = scorableQuestions.filter(q => !isAnswered(q, answersRef.current)).length;

            if (unansweredCount > 0) {
                setHasAttemptedSubmit(true);
                setIsNavOpen(true); // Auto open nav to show red boxes
                
                if (!confirm(`Masih ada ${unansweredCount} soal yang belum diisi (ditandai warna merah). Yakin ingin mengumpulkan?`)) {
                    return;
                }
            } else {
                 if (!confirm("Apakah Anda yakin ingin mengumpulkan jawaban? Aksi ini tidak dapat dibatalkan.")) return;
            }
        }
        
        if (isSubmittingRef.current) return;
        
        // Final Save before submit
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            answers: answersRef.current,
            timeLeft: timeLeftRef.current,
            timestamp: Date.now()
        }));

        isSubmittingRef.current = true;
        setIsSubmitting(true);
        
        try {
            // Check online status explicitly before submit attempt
            if (!navigator.onLine) {
                throw new Error("Offline");
            }

            const grading = calculateGrade(exam, answersRef.current);
            await onSubmit(answersRef.current, timeLeftRef.current, status, logRef.current, userLocationRef.current, grading);
            
            if (status === 'completed' || status === 'force_closed') {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch (error) {
            console.error("Gagal mengirim jawaban:", error);
            const isOffline = error.message === "Offline" || !navigator.onLine;
            alert(isOffline 
                ? "Koneksi internet terputus. Pastikan Anda online, lalu coba tekan tombol kumpulkan lagi."
                : "Gagal mengirim jawaban. Pastikan koneksi internet Anda stabil, lalu coba lagi."
            );
            isSubmittingRef.current = false;
            setIsSubmitting(false);
        }
    };

    const currentQuestion = exam.questions[currentQuestionIndex];
    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
                             <h1 className="text-sm font-black text-slate-800 tracking-tight line-clamp-1">{exam.config.subject}</h1>
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
             </header>

             {/* Navigation Sidebar/Drawer */}
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
                                 {exam.questions.map((q, idx) => {
                                     const answered = isAnswered(q, answers);
                                     const current = idx === currentQuestionIndex;
                                     const isWarning = hasAttemptedSubmit && !answered && q.questionType !== 'INFO';
                                     
                                     return (
                                         <button 
                                            key={q.id} 
                                            onClick={() => { setCurrentQuestionIndex(idx); setIsNavOpen(false); }}
                                            className={`
                                                aspect-square rounded-xl text-xs font-bold flex items-center justify-center transition-all border
                                                ${current ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200 scale-110' : 
                                                  isWarning ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse' :
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
                             <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 justify-center">
                                 <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Diisi</div>
                                 <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-300"></div> Kosong</div>
                                 <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-600"></div> Aktif</div>
                             </div>
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
                         
                         {currentQuestionIndex === exam.questions.length - 1 ? (
                             <button 
                                onClick={() => handleSubmit(false)}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all text-sm shadow-lg shadow-indigo-200 disabled:opacity-70"
                             >
                                 {isSubmitting ? 'Mengirim...' : 'Selesai & Kumpulkan'} <CheckCircleIcon className="w-4 h-4" />
                             </button>
                         ) : (
                             <button 
                                onClick={() => setCurrentQuestionIndex(prev => Math.min(exam.questions.length - 1, prev + 1))}
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
