
import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Exam, Student, Result, Question, ResultStatus } from '../types';
import { ClockIcon, CheckCircleIcon, ExclamationTriangleIcon, PencilIcon, ChevronDownIcon, CheckIcon, ChevronUpIcon, EyeIcon, LockClosedIcon } from './Icons';
import { storageService } from '../services/storage';
import { supabase } from '../lib/supabase';

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
             const studentSet = new Set(normalize(studentAnswer).split(',').map((s: string) => s.trim()));
             const correctSet = new Set(normalize(q.correctAnswer).split(',').map((s: string) => s.trim()));
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
    
    // NAVIGATION & VALIDATION STATES
    const [isNavOpen, setIsNavOpen] = useState(false);
    const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

    const [activeExam, setActiveExam] = useState<Exam>(exam);
    const [timeExtensionNotif, setTimeExtensionNotif] = useState<string | null>(null);

    const answersRef = useRef<Record<string, string>>({});
    const logRef = useRef<string[]>(initialData?.activityLog || []);
    const isSubmittingRef = useRef(false);
    const timeLeftRef = useRef(0);
    const lastBroadcastTimeRef = useRef<number>(0);
    
    const violationsRef = useRef(0);
    const blurTimestampRef = useRef<number | null>(null);
    const [cheatingWarning, setCheatingWarning] = useState<string>('');

    // --- REALTIME & POLLING LOGIC (Robust Time Sync) ---
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
                                setTimeExtensionNotif(`Waktu diperpanjang +${diff} menit!`);
                                setTimeout(() => setTimeExtensionNotif(null), 5000);
                            }
                            return { ...prev, config: newConfig };
                        });
                    }
                }
            )
            .subscribe();

        const pollInterval = setInterval(async () => {
            if (!navigator.onLine) return;
            try {
                const { data } = await supabase.from('exams').select('config').eq('code', exam.code).single();
                if (data && data.config) {
                    setActiveExam(prev => {
                        if (prev.config.timeLimit !== data.config.timeLimit) {
                            const diff = data.config.timeLimit - prev.config.timeLimit;
                            if (diff > 0) {
                                setTimeExtensionNotif(`Sinkronisasi: Waktu +${diff} menit!`);
                                setTimeout(() => setTimeExtensionNotif(null), 5000);
                            }
                            return { ...prev, config: data.config };
                        }
                        return { ...prev, config: data.config };
                    });
                }
            } catch (e) {}
        }, 15000);

        return () => { supabase.removeChannel(channel); clearInterval(pollInterval); };
    }, [exam.code]);

    // LOAD STATE FROM INDEXED DB (Async)
    useEffect(() => {
        const loadState = async () => {
            try { localStorage.setItem(CACHED_EXAM_KEY, JSON.stringify(exam)); } catch (e) { console.warn("Quota exceeded"); }
            
            // Try load from IndexedDB first (Point 7.1)
            const localData = await storageService.getLocalProgress(STORAGE_KEY);
            if (localData) {
                setAnswers(localData.answers || {});
                answersRef.current = localData.answers || {};
                if (localData.logs) logRef.current = localData.logs;
                return;
            }
            
            // Fallback to props (resume from server)
            if (initialData?.answers) {
                setAnswers(initialData.answers);
                answersRef.current = initialData.answers;
            }
        };
        loadState();
    }, [STORAGE_KEY, initialData, exam]);

    useEffect(() => { isSubmittingRef.current = isSubmitting; }, [isSubmitting]);

    const isAnswered = (q: Question, ansMap: Record<string, string>) => {
        const v = ansMap[q.id];
        if (!v) return false;
        if (q.questionType === 'TRUE_FALSE' || q.questionType === 'MATCHING') {
            try { return Object.keys(JSON.parse(v)).length > 0; } catch(e) { return false; }
        }
        return v.trim() !== "";
    };

    const handleSubmit = async (auto = false, status: ResultStatus = 'completed') => {
        if (!auto) {
            // Manual submission validation
            const scorableQuestions = activeExam.questions.filter(q => q.questionType !== 'INFO');
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
        
        setIsSubmitting(true);
        
        const grading = calculateGrade(activeExam, answersRef.current);
        await onSubmit(answersRef.current, timeLeftRef.current, status, logRef.current, userLocation, grading);
        
        if (status === 'completed' || status === 'force_closed') {
            storageService.clearLocalProgress(STORAGE_KEY);
        }
    };

    // --- ANTI CHEAT & UTILS ---
    useEffect(() => {
        if (student.class === 'PREVIEW' || !activeExam.config.detectBehavior) return;

        const showWarning = (message: string) => { setCheatingWarning(message); setTimeout(() => setCheatingWarning(''), 5000); };

        const handleViolation = (type: 'soft' | 'hard', reason: string) => {
            if (isSubmittingRef.current) return;
            logRef.current.push(`[${new Date().toLocaleTimeString()}] Pelanggaran: ${reason}`);
            
            // Save log update to IDB
            storageService.saveLocalProgress(STORAGE_KEY, { answers: answersRef.current, logs: logRef.current });

            if (activeExam.config.continueWithPermission) {
                alert("PELANGGARAN TERDETEKSI: Anda meninggalkan halaman ujian. Akses dikunci.");
                handleSubmit(true, 'force_closed');
                return;
            }
            
            if (type === 'hard') {
                violationsRef.current += 1;
                const remaining = 3 - violationsRef.current;
                if (remaining > 0) showWarning(`PELANGGARAN! Sisa peringatan: ${remaining}.`);
                else { alert("PELANGGARAN BATAS MAKSIMUM! Ujian dihentikan oleh sistem."); handleSubmit(true, 'force_closed'); }
            } else { showWarning("PERINGATAN: Tetap fokus pada halaman ini."); }
        };

        const handleVisibilityChange = () => { if (document.hidden && !isSubmittingRef.current) handleViolation('hard', 'Meninggalkan halaman ujian'); };
        const handleBlur = () => { if (!isSubmittingRef.current) blurTimestampRef.current = Date.now(); };
        const handleFocus = () => { if (blurTimestampRef.current && !isSubmittingRef.current) { const duration = (Date.now() - blurTimestampRef.current) / 1000; blurTimestampRef.current = null; if (duration >= 2 && duration <= 5) handleViolation('soft', `Fokus hilang ${duration.toFixed(1)}s`); else if (duration > 5) handleViolation('hard', `Fokus hilang ${duration.toFixed(1)}s`); } };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);
        return () => { document.removeEventListener('visibilitychange', handleVisibilityChange); window.removeEventListener('blur', handleBlur); window.removeEventListener('focus', handleFocus); };
    }, [activeExam, student, handleSubmit]);

    useEffect(() => {
        if (activeExam.config.trackLocation && student.class !== 'PREVIEW' && 'geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition((pos) => setUserLocation(`${pos.coords.latitude}, ${pos.coords.longitude}`), (err) => logRef.current.push(`[System] Gagal lokasi: ${err.message}`));
        }
    }, [activeExam.config.trackLocation, student.class]);

    // --- DEADLINE CALCULATION (Syncs with DB timeLimit) ---
    const deadline = useMemo(() => {
        if (student.class === 'PREVIEW') return Date.now() + (activeExam.config.timeLimit * 60 * 1000);
        const dateStr = activeExam.config.date.includes('T') ? activeExam.config.date.split('T')[0] : activeExam.config.date;
        const start = new Date(`${dateStr}T${activeExam.config.startTime}`);
        return start.getTime() + (activeExam.config.timeLimit * 60 * 1000);
    }, [activeExam.config.date, activeExam.config.startTime, activeExam.config.timeLimit, student.class]);

    const [timeLeft, setTimeLeft] = useState(0);
    useEffect(() => {
        const tick = () => {
            const now = Date.now();
            const diff = Math.max(0, Math.floor((deadline - now) / 1000));
            setTimeLeft(diff);
            timeLeftRef.current = diff;
            if (diff <= 0 && student.class !== 'PREVIEW' && !isSubmittingRef.current) handleSubmit(true, 'completed');
        };
        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [deadline, handleSubmit, student.class]);

    const broadcastProgress = useMemo(() => () => {
        const totalQ = activeExam.questions.filter(q => q.questionType !== 'INFO').length;
        const answeredQ = activeExam.questions.filter(q => q.questionType !== 'INFO' && isAnswered(q, answersRef.current)).length;
        storageService.sendProgressUpdate(activeExam.code, student.studentId, answeredQ, totalQ).catch(()=>{});
    }, [activeExam]);

    const handleAnswerChange = (qId: string, val: string) => {
        setAnswers(prev => {
            const next = { ...prev, [qId]: val };
            answersRef.current = next;
            
            // SAVE TO INDEXED DB (Async, Non-blocking)
            if (student.class !== 'PREVIEW') {
                storageService.saveLocalProgress(STORAGE_KEY, { answers: next, logs: logRef.current, lastUpdated: Date.now() });
            }
            return next;
        });

        if (student.class !== 'PREVIEW' && !activeExam.config.disableRealtime) {
            const now = Date.now();
            if (now - lastBroadcastTimeRef.current > 2000) { broadcastProgress(); lastBroadcastTimeRef.current = now; } 
            else { if ((window as any).broadcastTimeout) clearTimeout((window as any).broadcastTimeout); (window as any).broadcastTimeout = setTimeout(() => { broadcastProgress(); lastBroadcastTimeRef.current = Date.now(); }, 2000); }
        }
    };

    const scrollToQuestion = (id: string) => {
        setIsNavOpen(false);
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-indigo-400');
            setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-400'), 2000);
        }
    };

    const formatTime = (s: number) => {
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
        return h > 0 ? `${h}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}` : `${m}:${sec.toString().padStart(2,'0')}`;
    };

    const totalQuestions = activeExam.questions.filter(q => q.questionType !== 'INFO').length;
    const answeredCount = activeExam.questions.filter(q => q.questionType !== 'INFO' && isAnswered(q, answers)).length;
    const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
    const optimizeHtml = (html: string) => html.replace(/<img /g, '<img loading="lazy" class="rounded-lg shadow-sm border border-slate-100 max-w-full h-auto" ');

    // Indikator Pengawasan
    const isMonitored = activeExam.config.detectBehavior;

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-40">
            {/* Header Ergonomis (Click-to-Expand) */}
            <header 
                onClick={() => setIsNavOpen(!isNavOpen)}
                className={`fixed top-0 inset-x-0 z-[60] border-b shadow-sm transition-all duration-300 h-16 flex items-center cursor-pointer select-none ${isNavOpen ? 'bg-white border-slate-200' : 'bg-white/90 backdrop-blur-md border-slate-200/60'}`}
            >
                 {/* Progress Bar Line */}
                 <div className="absolute top-0 left-0 h-[2px] bg-indigo-600 transition-all duration-700 ease-out z-10" style={{width: `${progress}%`}}></div>
                 
                 <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 flex items-center justify-between">
                     <div className="flex items-center gap-3 overflow-hidden">
                         {/* Toggle Indicator */}
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${isNavOpen ? 'bg-slate-100 text-slate-600' : 'bg-transparent text-slate-400'}`}>
                             {isNavOpen ? <ChevronUpIcon className="w-5 h-5"/> : <ChevronDownIcon className="w-5 h-5"/>}
                         </div>
                         <div className="min-w-0 flex flex-col justify-center">
                             <div className="flex items-center gap-2">
                                <h1 className="text-sm font-black text-slate-800 tracking-tight truncate max-w-[150px] sm:max-w-xs">{activeExam.config.subject}</h1>
                                {/* Monitoring Badge */}
                                {isMonitored && (
                                    <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-lg text-[9px] font-black uppercase text-indigo-600 tracking-wider animate-pulse" title="Sistem pengawas otomatis aktif">
                                        <EyeIcon className="w-3 h-3" />
                                        <span>Diawasi</span>
                                    </div>
                                )}
                             </div>
                             <p className="text-[10px] font-medium text-slate-400 font-mono tracking-wide truncate">{isNavOpen ? 'Ketuk untuk tutup menu' : 'Ketuk header untuk navigasi'}</p>
                         </div>
                     </div>
                     <div className="flex items-center gap-3">
                        {/* Mobile Monitored Icon */}
                        {isMonitored && (
                            <div className="sm:hidden text-indigo-600 animate-pulse" title="Diawasi">
                                <EyeIcon className="w-5 h-5" />
                            </div>
                        )}
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono font-bold tracking-tight transition-all shadow-sm shrink-0 ${timeLeft < 300 ? 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse' : 'bg-white text-slate-600 border-slate-200'}`}>
                            <ClockIcon className="w-4 h-4" />
                            <span className="text-sm">{formatTime(timeLeft)}</span>
                        </div>
                     </div>
                 </div>
            </header>

            {/* Notification for Time Extension (Centered below header) */}
            {timeExtensionNotif && (
                <div className="fixed top-20 inset-x-0 flex justify-center z-[80] pointer-events-none">
                    <div className="bg-emerald-600/90 backdrop-blur-md text-white px-6 py-2 rounded-full shadow-lg border border-emerald-500/50 text-xs font-bold animate-gentle-slide flex items-center gap-2 pointer-events-auto ring-2 ring-emerald-500/20">
                        <ClockIcon className="w-4 h-4 shrink-0" /> 
                        <span>{timeExtensionNotif}</span>
                    </div>
                </div>
            )}

            {/* Navigation Panel (Slide Down) */}
            <div className={`fixed top-16 left-0 w-full bg-white/95 backdrop-blur-xl z-50 border-b border-slate-200 shadow-xl transition-all duration-300 ease-in-out origin-top ${isNavOpen ? 'translate-y-0 opacity-100 visible' : '-translate-y-full opacity-0 invisible'}`}>
                <div className="max-w-4xl mx-auto p-4 sm:p-6 max-h-[70vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Peta Soal</h3>
                        <div className="flex gap-3 text-[10px] font-bold">
                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-indigo-600"></div> Terjawab</div>
                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-white border border-slate-300"></div> Kosong</div>
                        </div>
                    </div>
                    
                    {/* Compact Grid - Flex Wrap */}
                    <div className="flex flex-wrap gap-2 justify-center content-start">
                        {activeExam.questions.map((q, idx) => {
                            if (q.questionType === 'INFO') return null;
                            const num = activeExam.questions.slice(0, idx).filter(i => i.questionType !== 'INFO').length + 1;
                            const answered = isAnswered(q, answers);
                            
                            // Determine Color Logic
                            let btnClass = "bg-white border-slate-200 text-slate-600 hover:border-indigo-300";
                            if (answered) {
                                btnClass = "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200";
                            } else if (hasAttemptedSubmit) {
                                btnClass = "bg-rose-50 border-rose-300 text-rose-600 animate-pulse";
                            }

                            return (
                                <button
                                    key={q.id}
                                    onClick={() => scrollToQuestion(q.id)}
                                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg border flex items-center justify-center text-xs font-bold transition-all duration-200 active:scale-90 ${btnClass}`}
                                >
                                    {num}
                                </button>
                            );
                        })}
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-slate-100 text-center flex flex-col gap-1">
                        <p className="text-[10px] text-slate-400">Total {answeredCount} dari {totalQuestions} soal terjawab</p>
                        {isMonitored && (
                            <p className="text-[10px] font-bold text-indigo-600 flex items-center justify-center gap-1">
                                <LockClosedIcon className="w-3 h-3" /> Mode Pengawasan Ketat Aktif
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Backdrop Blur Overlay when Nav Open */}
            <div 
                className={`fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${isNavOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onClick={() => setIsNavOpen(false)}
            ></div>

            {cheatingWarning && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[80] bg-rose-600 text-white px-6 py-3 rounded-2xl shadow-xl shadow-rose-200 text-xs font-bold animate-bounce flex items-center gap-3 ring-4 ring-rose-100 w-max max-w-[90vw]">
                    <ExclamationTriangleIcon className="w-5 h-5 shrink-0" /> 
                    <span>{cheatingWarning}</span>
                </div>
            )}

            <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 space-y-8">
                {activeExam.questions.map((q, idx) => {
                    const num = activeExam.questions.slice(0, idx).filter(i => i.questionType !== 'INFO').length + 1;
                    const answered = isAnswered(q, answers);
                    const isMissing = hasAttemptedSubmit && !answered && q.questionType !== 'INFO';
                    
                    return (
                        <div key={q.id} id={q.id} className={`scroll-mt-32 group animate-fade-in transition-all duration-500 ${isMissing ? 'ring-2 ring-rose-400 rounded-[1.5rem]' : ''}`}>
                            <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm p-6 sm:p-8 hover:shadow-md transition-shadow">
                                <div className="flex gap-5">
                                    <div className="shrink-0">
                                        <span className={`text-sm font-black w-8 h-8 flex items-center justify-center rounded-xl transition-all shadow-sm ${isMissing ? 'bg-rose-100 text-rose-600' : answered ? 'text-white bg-indigo-600 shadow-indigo-200' : 'text-slate-400 bg-slate-100'}`}>
                                            {q.questionType === 'INFO' ? 'i' : num}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="prose prose-slate prose-p:text-slate-700 prose-headings:text-slate-800 prose-strong:text-slate-900 prose-img:rounded-xl prose-img:shadow-sm max-w-none font-medium leading-relaxed mb-6">
                                            <div dangerouslySetInnerHTML={{ __html: optimizeHtml(q.questionText) }}></div>
                                        </div>

                                        <div className="space-y-4">
                                            {/* PILIHAN GANDA */}
                                            {q.questionType === 'MULTIPLE_CHOICE' && q.options && (
                                                <div className="grid grid-cols-1 gap-3">
                                                    {q.options.map((opt, i) => {
                                                        const isSelected = answers[q.id] === opt;
                                                        return (
                                                            <button 
                                                                key={i} 
                                                                onClick={() => handleAnswerChange(q.id, opt)} 
                                                                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-start gap-4 group/opt ${isSelected ? 'border-indigo-600 bg-indigo-50/30 shadow-sm' : 'border-slate-100 bg-white hover:border-indigo-200 hover:bg-slate-50'}`}
                                                            >
                                                                <span className={`flex items-center justify-center w-6 h-6 rounded-full border text-xs font-bold transition-all shrink-0 mt-0.5 ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'border-slate-200 text-slate-400 bg-slate-50 group-hover/opt:border-indigo-300'}`}>
                                                                    {String.fromCharCode(65 + i)}
                                                                </span>
                                                                <div className="text-sm text-slate-600 leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: optimizeHtml(opt) }}></div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* PG KOMPLEKS */}
                                            {q.questionType === 'COMPLEX_MULTIPLE_CHOICE' && q.options && (
                                                <div className="grid grid-cols-1 gap-3">
                                                    {q.options.map((opt, i) => {
                                                        const currentAns = answers[q.id] ? answers[q.id].split(',') : [];
                                                        const isSelected = currentAns.includes(opt);
                                                        return (
                                                            <button 
                                                                key={i} 
                                                                onClick={() => {
                                                                    const newAns = isSelected ? currentAns.filter(a => a !== opt) : [...currentAns, opt];
                                                                    handleAnswerChange(q.id, newAns.join(','));
                                                                }} 
                                                                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-start gap-4 group/opt ${isSelected ? 'border-indigo-600 bg-indigo-50/30 shadow-sm' : 'border-slate-100 bg-white hover:border-indigo-200 hover:bg-slate-50'}`}
                                                            >
                                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all mt-0.5 shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-600 shadow-sm' : 'border-slate-200 bg-slate-50 group-hover/opt:border-indigo-300'}`}>
                                                                    {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
                                                                </div>
                                                                <div className="text-sm text-slate-600 leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: optimizeHtml(opt) }}></div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* BENAR SALAH */}
                                            {q.questionType === 'TRUE_FALSE' && q.trueFalseRows && (
                                                <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                                            <tr>
                                                                <th className="p-4 text-left">Pernyataan</th>
                                                                <th className="p-4 text-center w-20">Benar</th>
                                                                <th className="p-4 text-center w-20">Salah</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 bg-white">
                                                            {q.trueFalseRows.map((row, i) => {
                                                                const currentAnsObj = answers[q.id] ? JSON.parse(answers[q.id]) : {};
                                                                return (
                                                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                                        <td className="p-4 font-medium text-slate-700">{row.text}</td>
                                                                        <td className="p-4 text-center"><input type="radio" name={`tf-${q.id}-${i}`} checked={currentAnsObj[i] === true} onChange={() => handleAnswerChange(q.id, JSON.stringify({ ...currentAnsObj, [i]: true }))} className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 cursor-pointer" /></td>
                                                                        <td className="p-4 text-center"><input type="radio" name={`tf-${q.id}-${i}`} checked={currentAnsObj[i] === false} onChange={() => handleAnswerChange(q.id, JSON.stringify({ ...currentAnsObj, [i]: false }))} className="w-5 h-5 text-rose-600 focus:ring-rose-500 cursor-pointer" /></td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}

                                            {/* MENJODOHKAN */}
                                            {q.questionType === 'MATCHING' && q.matchingPairs && (
                                                <div className="space-y-3">
                                                    {(() => {
                                                        const rightOptions = useMemo(() => {
                                                            const opts = q.matchingPairs!.map(p => p.right);
                                                            for (let i = opts.length - 1; i > 0; i--) { 
                                                                const j = Math.floor(Math.random() * (i + 1)); 
                                                                [opts[i], opts[j]] = [opts[j], opts[i]]; 
                                                            }
                                                            return opts;
                                                        }, [q.id]);

                                                        return q.matchingPairs.map((pair, i) => {
                                                            const currentAnsObj = answers[q.id] ? JSON.parse(answers[q.id]) : {};
                                                            return (
                                                                <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                                                    <div className="flex-1 font-bold text-slate-700 text-sm">{pair.left}</div>
                                                                    <div className="hidden sm:block text-slate-300">→</div>
                                                                    <div className="flex-1 relative">
                                                                        <select value={currentAnsObj[i] || ''} onChange={(e) => handleAnswerChange(q.id, JSON.stringify({ ...currentAnsObj, [i]: e.target.value }))} className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-3 px-4 pr-10 rounded-lg text-sm font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer shadow-sm">
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

                                            {/* ESSAY */}
                                            {q.questionType === 'ESSAY' && (
                                                <div className="relative">
                                                    <textarea 
                                                        value={answers[q.id] || ''} 
                                                        onChange={e => handleAnswerChange(q.id, e.target.value)} 
                                                        className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none min-h-[160px] text-sm text-slate-700 placeholder:text-slate-400 transition-all resize-y" 
                                                        placeholder="Tulis jawaban lengkap Anda di sini..." 
                                                    />
                                                </div>
                                            )}

                                            {/* ISIAN SINGKAT */}
                                            {q.questionType === 'FILL_IN_THE_BLANK' && (
                                                <div className="relative group/input">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                        <PencilIcon className="w-5 h-5 text-slate-400 group-focus-within/input:text-indigo-500 transition-colors" />
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        value={answers[q.id] || ''} 
                                                        onChange={e => handleAnswerChange(q.id, e.target.value)} 
                                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-bold text-slate-800 placeholder:text-slate-400 transition-all" 
                                                        placeholder="Ketik jawaban singkat..." 
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </main>

            <div className="fixed bottom-8 inset-x-0 flex justify-center z-50 px-4 pointer-events-none">
                <div className="bg-white p-2 rounded-[1.2rem] shadow-2xl shadow-slate-300/50 border border-white ring-1 ring-slate-100 pointer-events-auto flex items-center gap-4 transition-transform hover:scale-105">
                    <div className="pl-4 flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Progress</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-lg font-black text-slate-800">{answeredCount}</span>
                            <span className="text-xs font-bold text-slate-400">/ {totalQuestions}</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => handleSubmit(false)} 
                        disabled={isSubmitting} 
                        className="bg-slate-900 text-white pl-6 pr-6 py-3 rounded-xl font-bold text-xs hover:bg-indigo-600 transition-all flex items-center gap-2 shadow-lg active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed group"
                    >
                        <span>{isSubmitting ? 'Mengirim...' : 'Selesai'}</span>
                        <CheckCircleIcon className="w-4 h-4 group-hover:text-emerald-300 transition-colors"/>
                    </button>
                </div>
            </div>
        </div>
    );
};
