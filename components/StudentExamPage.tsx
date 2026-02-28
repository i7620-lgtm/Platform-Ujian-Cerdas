
import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Exam, Student, Result, Question, ResultStatus } from '../types';
import { ClockIcon, CheckCircleIcon, ExclamationTriangleIcon, PencilIcon, ChevronDownIcon, CheckIcon, ChevronUpIcon, EyeIcon, LockClosedIcon, SunIcon, MoonIcon, SignalIcon, ShieldCheckIcon, MapPinIcon, ArrowsRightLeftIcon } from './Icons';
import { storageService } from '../services/storage';
import { supabase } from '../lib/supabase';
import { parseList } from './teacher/examUtils';
import { AudioPlayer } from './AudioPlayer';

interface StudentExamPageProps {
  exam: Exam;
  student: Student;
  initialData?: Result | null;
  onSubmit: (answers: Record<string, string>, timeLeft: number, status?: ResultStatus, logs?: string[], location?: string, grading?: any) => void;
  onUpdate?: (answers: Record<string, string>, timeLeft: number) => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
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
             const studentSet = new Set(parseList(studentAnswer).map(normalize));
             const correctSet = new Set(parseList(q.correctAnswer).map(normalize));
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

export const StudentExamPage: React.FC<StudentExamPageProps> = ({ exam, student, initialData, onSubmit, isDarkMode, toggleTheme }) => {
    const STORAGE_KEY = `exam_local_${exam.code}_${student.studentId}`;
    const CACHED_EXAM_KEY = `exam_def_${exam.code}`;

    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userLocation, setUserLocation] = useState<string>('');
    
    const [isNavOpen, setIsNavOpen] = useState(false);
    const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
    const [showConfigIntro, setShowConfigIntro] = useState(true);

    const [activeExam, setActiveExam] = useState<Exam>(exam);
    const [timeExtensionNotif, setTimeExtensionNotif] = useState<string | null>(null);

    // State untuk Custom Dropdown Menjodohkan
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

    const answersRef = useRef<Record<string, string>>({});
    const logRef = useRef<string[]>(initialData?.activityLog || []);
    const isSubmittingRef = useRef(false);
    const timeLeftRef = useRef(0);
    const lastBroadcastTimeRef = useRef<number>(0);
    
    const violationsRef = useRef(0);
    const blurTimestampRef = useRef<number | null>(null);
    const [cheatingWarning, setCheatingWarning] = useState<string>('');

    // Monitoring Status
    const isMonitoring = activeExam.config.detectBehavior;
    const monitoringLabel = activeExam.config.continueWithPermission ? 'Diawasi & Terkunci' : 'Diawasi Sistem';

    // Click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (openDropdownId && !(e.target as Element).closest('.custom-dropdown-container')) {
                setOpenDropdownId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openDropdownId]);

    useEffect(() => {
        let channel: any = null;
        if (!exam.config.disableRealtime) {
            channel = supabase.channel(`exam-config-${exam.code}`)
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'exams', filter: `code=eq.${exam.code}` }, (payload) => {
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
                ).subscribe();
        }

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

        return () => { if (channel) supabase.removeChannel(channel); clearInterval(pollInterval); };
    }, [exam.code, exam.config.disableRealtime]);

    useEffect(() => {
        const loadState = async () => {
            try { localStorage.setItem(CACHED_EXAM_KEY, JSON.stringify(exam)); } catch (e) {}
            const localData = await storageService.getLocalProgress(STORAGE_KEY);
            if (localData) {
                setAnswers(localData.answers || {});
                answersRef.current = localData.answers || {};
                if (localData.logs) logRef.current = localData.logs;
                return;
            }
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
            const scorableQuestions = activeExam.questions.filter(q => q.questionType !== 'INFO');
            const unansweredCount = scorableQuestions.filter(q => !isAnswered(q, answersRef.current)).length;
            if (unansweredCount > 0) {
                setHasAttemptedSubmit(true);
                setIsNavOpen(true);
                if (!confirm(`Masih ada ${unansweredCount} soal yang belum diisi. Yakin ingin mengumpulkan?`)) return;
            } else {
                 if (!confirm("Apakah Anda yakin ingin mengumpulkan jawaban?")) return;
            }
        }
        if (isSubmittingRef.current) return;
        setIsSubmitting(true);
        const grading = calculateGrade(activeExam, answersRef.current);
        await onSubmit(answersRef.current, timeLeftRef.current, status, logRef.current, userLocation, grading);
        if (status === 'completed' || status === 'force_closed') { storageService.clearLocalProgress(STORAGE_KEY); }
    };

    useEffect(() => {
        if (student.class === 'PREVIEW' || !activeExam.config.detectBehavior) return;
        const handleViolation = (type: 'soft' | 'hard', reason: string) => {
            if (isSubmittingRef.current) return;
            
            logRef.current.push(`[${new Date().toLocaleTimeString()}] Pelanggaran: ${reason}`);
            storageService.saveLocalProgress(STORAGE_KEY, { answers: answersRef.current, logs: logRef.current });
            
            if (activeExam.config.continueWithPermission) {
                alert("PELANGGARAN TERDETEKSI: Sesi dikunci.");
                handleSubmit(true, 'force_closed');
                return;
            }
            
            if (type === 'hard') {
                violationsRef.current += 1;
                // FIX: Jika mode 'Kunci Akses' tidak aktif, jangan pernah kunci ujian (hapus 3 strikes rule).
                // Hanya tampilkan peringatan visual bahwa aktivitas tercatat.
                setCheatingWarning(`PELANGGARAN TERDETEKSI! Aktivitas dicatat.`); 
                setTimeout(() => setCheatingWarning(''), 5000); 
            }
        };
        const handleVisibilityChange = () => { if (document.hidden && !isSubmittingRef.current) handleViolation('hard', 'Meninggalkan halaman'); };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => { document.removeEventListener('visibilitychange', handleVisibilityChange); };
    }, [activeExam, student, handleSubmit]);

    useEffect(() => {
        if (activeExam.config.trackLocation && student.class !== 'PREVIEW' && 'geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition((pos) => setUserLocation(`${pos.coords.latitude}, ${pos.coords.longitude}`));
        }
    }, [activeExam.config.trackLocation, student.class]);

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
            if (student.class !== 'PREVIEW') {
                storageService.saveLocalProgress(STORAGE_KEY, { answers: next, logs: logRef.current, lastUpdated: Date.now() });
            }
            return next;
        });
        if (student.class !== 'PREVIEW' && !activeExam.config.disableRealtime) {
            const now = Date.now();
            if (now - lastBroadcastTimeRef.current > 2000) { broadcastProgress(); lastBroadcastTimeRef.current = now; } 
        }
    };

    const scrollToQuestion = (id: string) => {
        setIsNavOpen(false);
        const el = document.getElementById(id);
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    };

    const formatTime = (s: number) => {
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
        return h > 0 ? `${h}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}` : `${m}:${sec.toString().padStart(2,'0')}`;
    };

    const totalQuestions = activeExam.questions.filter(q => q.questionType !== 'INFO').length;
    const answeredCount = activeExam.questions.filter(q => q.questionType !== 'INFO' && isAnswered(q, answers)).length;
    const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
    const optimizeHtml = (html: string) => html.replace(/<img /g, '<img loading="lazy" class="rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 max-w-full h-auto" ');

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-40 transition-colors duration-300">
            {/* Modal Informasi Aturan Ujian */}
            {showConfigIntro && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-white dark:border-slate-800 animate-gentle-slide">
                        <div className="p-8 sm:p-10">
                            <div className="flex justify-center mb-8">
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl text-indigo-600 dark:text-indigo-400">
                                    <ShieldCheckIcon className="w-10 h-10" />
                                </div>
                            </div>

                            <h2 className="text-2xl font-black text-slate-800 dark:text-white text-center mb-2 tracking-tight">Aturan Ujian</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-8 font-medium">Mohon perhatikan konfigurasi ujian berikut:</p>

                            <div className="space-y-4 mb-10">
                                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <ClockIcon className="w-5 h-5 text-indigo-500 shrink-0" />
                                    <div>
                                        <p className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Batas Waktu</p>
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{activeExam.config.timeLimit} Menit</p>
                                    </div>
                                </div>

                                {activeExam.config.kkm && (
                                    <div className="flex items-center gap-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                                        <CheckCircleIcon className="w-5 h-5 text-emerald-500 shrink-0" />
                                        <div>
                                            <p className="text-xs font-black uppercase text-emerald-400 dark:text-emerald-500 tracking-widest">Target Nilai</p>
                                            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">KKM Minimal {activeExam.config.kkm}</p>
                                        </div>
                                    </div>
                                )}

                                {activeExam.config.detectBehavior && (
                                    <div className="flex items-center gap-4 p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                                        <LockClosedIcon className="w-5 h-5 text-rose-500 shrink-0" />
                                        <div>
                                            <p className="text-xs font-black uppercase text-rose-400 dark:text-rose-500 tracking-widest">Pengawasan Aktif</p>
                                            <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
                                                {activeExam.config.continueWithPermission ? "Akses Terkunci Otomatis Jika Curang" : "Aktivitas Tercatat Sistem"}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {(activeExam.config.shuffleQuestions || activeExam.config.shuffleAnswers) && (
                                    <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                                        <ArrowsRightLeftIcon className="w-5 h-5 text-blue-500 shrink-0" />
                                        <div>
                                            <p className="text-xs font-black uppercase text-blue-400 dark:text-blue-500 tracking-widest">Mode Acak</p>
                                            <p className="text-sm font-bold text-blue-700 dark:text-blue-300">Soal & Jawaban Diacak</p>
                                        </div>
                                    </div>
                                )}

                                {activeExam.config.trackLocation && (
                                    <div className="flex items-center gap-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                                        <MapPinIcon className="w-5 h-5 text-emerald-500 shrink-0" />
                                        <div>
                                            <p className="text-xs font-black uppercase text-emerald-400 dark:text-emerald-500 tracking-widest">Pelacakan Lokasi</p>
                                            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Koordinat GPS Dicatat</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={() => setShowConfigIntro(false)}
                                className="w-full py-4 bg-slate-900 dark:bg-indigo-600 text-white font-bold rounded-2xl shadow-xl hover:shadow-indigo-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
                            >
                                <span>Mulai Mengerjakan</span>
                                <CheckCircleIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <header 
                className={`fixed top-0 inset-x-0 z-[60] border-b shadow-sm transition-all duration-300 h-16 flex items-center ${isNavOpen ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800' : 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-slate-200/60 dark:border-slate-800/60'}`}
            >
                 <div className="absolute top-0 left-0 h-[2px] bg-indigo-600 dark:bg-indigo-500 transition-all duration-700 ease-out z-10" style={{width: `${progress}%`}}></div>
                 <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 flex items-center justify-between">
                     <div 
                        className="flex items-center gap-3 overflow-hidden cursor-pointer flex-1"
                        onClick={() => setIsNavOpen(!isNavOpen)}
                     >
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${isNavOpen ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' : 'bg-transparent text-slate-400 dark:text-slate-500'}`}>
                             {isNavOpen ? <ChevronUpIcon className="w-5 h-5"/> : <ChevronDownIcon className="w-5 h-5"/>}
                         </div>
                         <div className="min-w-0 flex flex-col justify-center">
                             <h1 className="text-sm font-black text-slate-800 dark:text-white tracking-tight truncate max-w-[150px] sm:max-w-xs">{activeExam.config.subject}</h1>
                             <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 font-mono tracking-wide truncate">{isNavOpen ? 'Ketuk untuk tutup' : 'Ketuk untuk navigasi'}</p>
                         </div>
                     </div>
                     
                     <div className="flex items-center gap-2">
                        {/* Compact Monitoring Badge - Visible ONLY when Nav is Closed */}
                        {isMonitoring && !isNavOpen && (
                            <div className="flex items-center gap-1.5 px-2 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-lg mr-1 animate-fade-in">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                </span>
                                <span className="hidden sm:inline text-[10px] font-black uppercase tracking-wide text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                                    {monitoringLabel}
                                </span>
                            </div>
                        )}

                        {toggleTheme && (
                            <button 
                                onClick={toggleTheme} 
                                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm border border-slate-200 dark:border-slate-700"
                                aria-label="Toggle Theme"
                            >
                                {isDarkMode ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
                            </button>
                        )}
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border font-mono font-bold tracking-tight transition-all shadow-sm ${timeLeft < 300 ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900 animate-pulse' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
                            <ClockIcon className="w-4 h-4" />
                            <span className="text-sm">{formatTime(timeLeft)}</span>
                        </div>
                     </div>
                 </div>
            </header>

            <div className={`fixed top-16 left-0 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl z-50 border-b border-slate-200 dark:border-slate-800 shadow-xl transition-all duration-300 ease-in-out origin-top ${isNavOpen ? 'translate-y-0 opacity-100 visible' : '-translate-y-full opacity-0 invisible'}`}>
                <div className="max-w-4xl mx-auto p-4 sm:p-6 max-h-[70vh] overflow-y-auto">
                    <div className="flex flex-wrap gap-2 justify-center">
                        {activeExam.questions.map((q, idx) => {
                            if (q.questionType === 'INFO') return null;
                            const num = activeExam.questions.slice(0, idx).filter(i => i.questionType !== 'INFO').length + 1;
                            const answered = isAnswered(q, answers);
                            return (
                                <button key={q.id} onClick={() => scrollToQuestion(q.id)} className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg border flex items-center justify-center text-xs font-bold transition-all ${answered ? 'bg-indigo-600 border-indigo-600 text-white' : hasAttemptedSubmit ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                    {num}
                                </button>
                            );
                        })}
                    </div>

                    {/* Monitoring Explanation in Dropdown (Visible when Nav Open) */}
                    {isMonitoring && (
                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center text-center animate-fade-in">
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-full border border-indigo-100 dark:border-indigo-800 flex items-center gap-2 mb-2">
                                <span className="relative flex h-2.5 w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                                </span>
                                <span className="text-xs font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300">
                                    {monitoringLabel}
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-md font-medium leading-relaxed">
                                {activeExam.config.continueWithPermission 
                                    ? "Sistem memantau aktivitas Anda. Jika Anda keluar dari aplikasi atau mencoba melakukan kecurangan, ujian akan otomatis terkunci dan memerlukan token guru untuk melanjutkan." 
                                    : "Sistem memantau aktivitas Anda selama pengerjaan ujian. Setiap upaya meninggalkan halaman akan tercatat dalam log aktivitas yang dapat dilihat oleh pengawas."}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 space-y-8">
                {activeExam.questions.map((q, idx) => {
                    const num = activeExam.questions.slice(0, idx).filter(i => i.questionType !== 'INFO').length + 1;
                    const answered = isAnswered(q, answers);
                    const isMissing = hasAttemptedSubmit && !answered && q.questionType !== 'INFO';
                    
                    return (
                        <div key={q.id} id={q.id} className={`scroll-mt-32 animate-fade-in transition-all duration-500 ${isMissing ? 'ring-2 ring-rose-400 rounded-[1.5rem]' : ''}`}>
                            <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-8">
                                <div className="flex gap-5">
                                    <div className="shrink-0">
                                        <span className={`text-sm font-black w-8 h-8 flex items-center justify-center rounded-xl transition-all shadow-sm ${isMissing ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : answered ? 'text-white bg-indigo-600 dark:bg-indigo-500 shadow-indigo-200 dark:shadow-none' : 'text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800'}`}>
                                            {q.questionType === 'INFO' ? 'i' : num}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {q.audioUrl && (
                                            <div className="mb-4">
                                                <AudioPlayer src={q.audioUrl} />
                                            </div>
                                        )}
                                        <div className="prose prose-slate dark:prose-invert max-w-none font-medium leading-relaxed mb-6">
                                            <div dangerouslySetInnerHTML={{ __html: optimizeHtml(q.questionText) }}></div>
                                        </div>

                                        <div className="space-y-4">
                                            {q.questionType === 'MULTIPLE_CHOICE' && q.options && (
                                                <div className="grid grid-cols-1 gap-3">
                                                    {q.options.map((opt, i) => {
                                                        const isSelected = answers[q.id] === opt;
                                                        return (
                                                            <button key={i} onClick={() => handleAnswerChange(q.id, opt)} className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-4 ${isSelected ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                                                <span className={`flex items-center justify-center w-6 h-6 rounded-full border text-xs font-bold shrink-0 mt-0.5 ${isSelected ? 'bg-indigo-600 dark:bg-indigo-500 border-indigo-600 dark:border-indigo-500 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800'}`}>{String.fromCharCode(65 + i)}</span>
                                                                <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium option-content" dangerouslySetInnerHTML={{ __html: optimizeHtml(opt) }}></div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {q.questionType === 'COMPLEX_MULTIPLE_CHOICE' && q.options && (
                                                <div className="grid grid-cols-1 gap-3">
                                                    {q.options.map((opt, i) => {
                                                        const currentAns = parseList(answers[q.id]);
                                                        const isSelected = currentAns.includes(opt);
                                                        return (
                                                            <button key={i} onClick={() => { 
                                                                const newAns = isSelected ? currentAns.filter(a => a !== opt) : [...currentAns, opt]; 
                                                                handleAnswerChange(q.id, JSON.stringify(newAns)); 
                                                            }} className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-4 ${isSelected ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center border mt-0.5 shrink-0 ${isSelected ? 'bg-indigo-600 dark:bg-indigo-500 border-indigo-600 dark:border-indigo-500 shadow-sm' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'}`}>{isSelected && <CheckIcon className="w-4 h-4 text-white" />}</div>
                                                                <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium option-content" dangerouslySetInnerHTML={{ __html: optimizeHtml(opt) }}></div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {q.questionType === 'TRUE_FALSE' && q.trueFalseRows && (
                                                <div className="space-y-3">
                                                    {q.trueFalseRows.map((row, i) => {
                                                        const currentAnsObj = answers[q.id] ? JSON.parse(answers[q.id]) : {};
                                                        const isTrue = currentAnsObj[i] === true;
                                                        const isFalse = currentAnsObj[i] === false;
                                                        
                                                        return (
                                                            <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                                                <div className="mb-4 font-medium text-slate-700 dark:text-slate-300 option-content">
                                                                    <div dangerouslySetInnerHTML={{ __html: optimizeHtml(row.text) }}></div>
                                                                </div>
                                                                <div className="flex gap-3">
                                                                    <button 
                                                                        onClick={() => handleAnswerChange(q.id, JSON.stringify({ ...currentAnsObj, [i]: true }))}
                                                                        className={`flex-1 py-2.5 px-4 rounded-lg border font-bold text-sm transition-all flex items-center justify-center gap-2 ${isTrue ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                                                    >
                                                                        {isTrue && <CheckCircleIcon className="w-4 h-4" />}
                                                                        Benar
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleAnswerChange(q.id, JSON.stringify({ ...currentAnsObj, [i]: false }))}
                                                                        className={`flex-1 py-2.5 px-4 rounded-lg border font-bold text-sm transition-all flex items-center justify-center gap-2 ${isFalse ? 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-200 dark:shadow-none' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                                                    >
                                                                        {isFalse && <CheckCircleIcon className="w-4 h-4" />}
                                                                        Salah
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {q.questionType === 'MATCHING' && q.matchingPairs && (
                                                <div className="space-y-3">
                                                    {(() => {
                                                        const rightOptions = useMemo(() => {
                                                            const opts = q.matchingPairs!.map(p => p.right);
                                                            for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
                                                            return opts;
                                                        }, [q.id]);
                                                        return q.matchingPairs.map((pair, i) => {
                                                            const currentAnsObj = answers[q.id] ? JSON.parse(answers[q.id]) : {};
                                                            const selectedValue = currentAnsObj[i] || '';
                                                            const isOpen = openDropdownId === `${q.id}-${i}`;

                                                            return (
                                                                <div key={i} className="flex flex-col sm:flex-row sm:items-stretch gap-3 sm:gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                                                    <div className="flex-1 font-bold text-slate-700 dark:text-slate-300 text-sm flex items-center option-content">
                                                                        <div dangerouslySetInnerHTML={{ __html: optimizeHtml(pair.left) }}></div>
                                                                    </div>
                                                                    
                                                                    {/* Mobile Connector */}
                                                                    <div className="sm:hidden flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">
                                                                        <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                                                                        <span>Pasangkan Dengan</span>
                                                                        <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                                                                    </div>

                                                                    <div className="hidden sm:flex text-slate-300 dark:text-slate-600 items-center justify-center">→</div>
                                                                    
                                                                    <div className="flex-1 relative custom-dropdown-container">
                                                                        <button 
                                                                            type="button"
                                                                            onClick={(e) => { e.stopPropagation(); setOpenDropdownId(isOpen ? null : `${q.id}-${i}`); }}
                                                                            className={`w-full text-left bg-white dark:bg-slate-900 border ${isOpen ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200 dark:border-slate-700'} text-slate-700 dark:text-slate-200 py-3 px-4 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center justify-between min-h-[46px]`}
                                                                        >
                                                                            <div className="truncate flex-1">
                                                                                {selectedValue ? (
                                                                                    <div className="line-clamp-1 option-content" dangerouslySetInnerHTML={{__html: optimizeHtml(selectedValue)}}></div>
                                                                                ) : (
                                                                                    <span className="text-slate-400 dark:text-slate-600 font-medium">Pilih Jawaban...</span>
                                                                                )}
                                                                            </div>
                                                                            <ChevronDownIcon className={`w-4 h-4 ml-2 transition-transform text-slate-400 ${isOpen ? 'rotate-180' : ''}`}/>
                                                                        </button>
                                                                        
                                                                        {isOpen && (
                                                                            <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar animate-fade-in">
                                                                                {rightOptions.map((opt, idx) => (
                                                                                    <div 
                                                                                        key={idx} 
                                                                                        onClick={() => {
                                                                                            handleAnswerChange(q.id, JSON.stringify({ ...currentAnsObj, [i]: opt }));
                                                                                            setOpenDropdownId(null);
                                                                                        }}
                                                                                        className={`p-3 text-sm cursor-pointer border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors ${selectedValue === opt ? 'bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}
                                                                                    >
                                                                                        <div className="option-content" dangerouslySetInnerHTML={{__html: optimizeHtml(opt)}}></div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        });
                                                    })()}
                                                </div>
                                            )}

                                            {q.questionType === 'ESSAY' && (
                                                <textarea value={answers[q.id] || ''} onChange={e => handleAnswerChange(q.id, e.target.value)} className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none min-h-[160px] text-sm text-slate-700 dark:text-slate-200 transition-all resize-y placeholder:text-slate-400 dark:placeholder:text-slate-600" placeholder="Tulis jawaban lengkap Anda..." />
                                            )}

                                            {q.questionType === 'FILL_IN_THE_BLANK' && (
                                                <div className="relative"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><PencilIcon className="w-5 h-5 text-slate-400" /></div><input type="text" value={answers[q.id] || ''} onChange={e => handleAnswerChange(q.id, e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none text-sm font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all" placeholder="Ketik jawaban singkat..." /></div>
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
                <div className="bg-white dark:bg-slate-900 p-2 rounded-[1.2rem] shadow-2xl border border-white dark:border-slate-800 ring-1 ring-slate-100 dark:ring-slate-800 pointer-events-auto flex items-center gap-4 transition-transform hover:scale-105">
                    <div className="pl-4 flex flex-col justify-center">
                        <span className="hidden sm:inline text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Progres</span>
                        <div className="flex items-baseline gap-1"><span className="text-lg font-black text-slate-800 dark:text-white">{answeredCount}</span><span className="text-xs font-bold text-slate-400 dark:text-slate-500">/ {totalQuestions}</span></div>
                    </div>
                    <button onClick={() => handleSubmit(false)} disabled={isSubmitting} className="bg-slate-900 dark:bg-indigo-600 text-white pl-6 pr-6 py-3 rounded-xl font-bold text-xs hover:bg-indigo-600 dark:hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg active:scale-95 disabled:opacity-70">
                        <span>{isSubmitting ? 'Mengirim...' : 'Selesai'}</span>
                        <CheckCircleIcon className="w-4 h-4"/>
                    </button>
                </div>
            </div>
        </div>
    );
};
