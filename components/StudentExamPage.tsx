
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Exam, Student, Question, Result } from '../types';
import { ClockIcon, CheckCircleIcon, WifiIcon, NoWifiIcon, ListBulletIcon, ArrowLeftIcon, ArrowPathIcon } from './Icons';

interface StudentExamPageProps {
  exam: Exam;
  student: Student;
  initialData?: Result | null;
  onSubmit: (answers: Record<string, string>, timeLeft: number, location?: string, activityLog?: string[]) => void;
  onForceSubmit: (answers: Record<string, string>, timeLeft: number, activityLog?: string[]) => void;
  onUpdate?: (answers: Record<string, string>, timeLeft: number, location?: string, activityLog?: string[]) => void;
}

// Helper: Format Waktu (MM:SS atau HH:MM:SS)
const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// Helper: Get Current Time String
const getCurrentTimeStr = () => `[${new Date().toLocaleTimeString('id-ID')}]`;

// Helper: Shuffle Array
const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

// --- KOMPONEN GAMBAR PINTAR ---
const SmartImageViewer: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <div 
                className="relative group cursor-zoom-in overflow-hidden rounded-lg border border-gray-100 bg-gray-50 max-w-full md:max-w-md"
                onClick={() => setIsOpen(true)}
            >
                <img 
                    src={src} 
                    alt={alt} 
                    className="w-full h-auto object-contain transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="bg-white/90 px-3 py-1 rounded-full text-xs font-bold text-gray-700 shadow-sm">Perbesar</span>
                </div>
            </div>

            {/* Lightbox Modal */}
            {isOpen && (
                <div 
                    className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setIsOpen(false)}
                >
                    <img 
                        src={src} 
                        alt={alt} 
                        className="max-w-full max-h-full object-contain rounded shadow-2xl"
                    />
                    <button className="absolute top-4 right-4 text-white p-2 bg-gray-800/50 rounded-full hover:bg-gray-700">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}
        </>
    );
};

const RenderContent: React.FC<{ content: string }> = ({ content }) => {
    if (content.startsWith('data:image/')) {
        return <SmartImageViewer src={content} alt="Konten Visual" />;
    }
    return <div className="prose prose-slate prose-lg max-w-none text-gray-800 leading-relaxed font-normal break-words whitespace-pre-wrap">{content}</div>;
};

// --- KOMPONEN CARD SOAL ---
const QuestionCard: React.FC<{
    question: Question;
    index: number;
    answer: string;
    shuffleAnswers: boolean;
    onAnswerChange: (id: string, val: string) => void;
    isError?: boolean;
}> = React.memo(({ question, index, answer, shuffleAnswers, onAnswerChange, isError }) => {
    
    // Memoize options shuffling
    const displayedOptions = useMemo(() => {
        if (!question.options) return [];
        const opts = question.options.map((text, i) => ({
            text,
            image: question.optionImages?.[i] || null,
            originalIndex: i
        }));
        return shuffleAnswers ? shuffleArray(opts) : opts;
    }, [question, shuffleAnswers]);

    // Handlers
    const handleComplexChange = (optText: string, checked: boolean) => {
        let current: string[] = [];
        try { current = JSON.parse(answer || '[]'); } catch { current = answer ? answer.split(',') : []; }
        
        if (checked) {
            if (!current.includes(optText)) current.push(optText);
        } else {
            current = current.filter(c => c !== optText);
        }
        onAnswerChange(question.id, JSON.stringify(current));
    };

    const handleTrueFalseChange = (idx: number, val: boolean) => {
        let current: boolean[] = [];
        try { current = JSON.parse(answer || '[]'); } catch { current = []; }
        // Ensure array size matches
        const size = question.trueFalseRows?.length || 0;
        if (current.length !== size) current = new Array(size).fill(null);
        
        current[idx] = val;
        onAnswerChange(question.id, JSON.stringify(current));
    };

    const handleMatchingChange = (idx: number, val: string) => {
        let current: Record<string, string> = {};
        try { current = JSON.parse(answer || '{}'); } catch { current = {}; }
        current[idx] = val;
        onAnswerChange(question.id, JSON.stringify(current));
    };

    // Render Input Area based on Type
    const renderInput = () => {
        switch (question.questionType) {
            case 'MULTIPLE_CHOICE':
                return (
                    <div className="grid grid-cols-1 gap-3 mt-4">
                        {displayedOptions.map((opt, i) => {
                            const isSelected = answer === opt.text;
                            return (
                                <div 
                                    key={i}
                                    onClick={() => onAnswerChange(question.id, opt.text)}
                                    className={`relative flex items-center p-4 cursor-pointer rounded-xl border transition-all duration-200 group
                                        ${isSelected 
                                            ? 'bg-indigo-50 border-indigo-500 shadow-sm ring-1 ring-indigo-500' 
                                            : isError 
                                                ? 'bg-white border-red-200 hover:border-red-300 hover:bg-red-50' 
                                                : 'bg-white border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className={`flex items-center justify-center w-6 h-6 rounded-full border mr-4 transition-colors ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300 bg-white'}`}>
                                        {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                                    </div>
                                    <div className="flex-1">
                                        {opt.text && <RenderContent content={opt.text} />}
                                        {opt.image && <SmartImageViewer src={opt.image} alt="Opsi" />}
                                    </div>
                                    <span className={`absolute top-3 right-3 text-xs font-bold px-2 py-0.5 rounded ${isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {String.fromCharCode(65 + i)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                );

            case 'COMPLEX_MULTIPLE_CHOICE':
                return (
                    <div className="grid grid-cols-1 gap-3 mt-4">
                        <div className="bg-blue-50 text-blue-800 text-sm px-4 py-2 rounded-lg mb-2 inline-block font-medium w-fit">
                            Pilih satu atau lebih jawaban benar
                        </div>
                        {displayedOptions.map((opt, i) => {
                            let isChecked = false;
                            try { isChecked = (JSON.parse(answer || '[]') as string[]).includes(opt.text); } catch {}
                            
                            return (
                                <div 
                                    key={i}
                                    onClick={() => handleComplexChange(opt.text, !isChecked)}
                                    className={`relative flex items-center p-4 cursor-pointer rounded-xl border transition-all duration-200 select-none
                                        ${isChecked 
                                            ? 'bg-emerald-50 border-emerald-500 shadow-sm ring-1 ring-emerald-500' 
                                            : 'bg-white border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className={`flex items-center justify-center w-6 h-6 rounded border mr-4 transition-colors ${isChecked ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300 bg-white'}`}>
                                        {isChecked && <CheckCircleIcon className="w-4 h-4"/>}
                                    </div>
                                    <div className="flex-1">
                                        {opt.text && <RenderContent content={opt.text} />}
                                        {opt.image && <SmartImageViewer src={opt.image} alt="Opsi" />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );

            case 'TRUE_FALSE':
                if (!question.trueFalseRows) return null;
                const tfAnswers = (() => { try { return JSON.parse(answer || '[]'); } catch { return []; } })();
                return (
                    <div className="mt-4 space-y-3">
                        {question.trueFalseRows.map((row, i) => (
                            <div key={i} className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-gray-800 font-medium text-sm flex-1">{row.text}</div>
                                <div className="flex gap-2 shrink-0">
                                    <button 
                                        onClick={() => handleTrueFalseChange(i, true)}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${tfAnswers[i] === true ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-green-50'}`}
                                    >
                                        BENAR
                                    </button>
                                    <button 
                                        onClick={() => handleTrueFalseChange(i, false)}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${tfAnswers[i] === false ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-red-50'}`}
                                    >
                                        SALAH
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                );

            case 'MATCHING':
                if (!question.matchingPairs) return null;
                const matchAnswers = (() => { try { return JSON.parse(answer || '{}'); } catch { return {}; } })();
                // Extract JUST the right side options for dropdown
                const rightOptions = question.matchingPairs.map(p => p.right);
                
                return (
                    <div className="mt-6 space-y-4">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Pasangkan Kiri dengan Kanan</div>
                        {question.matchingPairs.map((pair, i) => (
                            <div key={i} className="flex flex-col md:flex-row gap-3 items-stretch md:items-center bg-gray-50 p-3 rounded-xl border border-gray-200">
                                <div className="flex-1 font-medium text-gray-800 text-sm bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                    {pair.left}
                                </div>
                                <div className="hidden md:block text-gray-400">➜</div>
                                <div className="flex-1">
                                    <select 
                                        value={matchAnswers[i] || ''}
                                        onChange={(e) => handleMatchingChange(i, e.target.value)}
                                        className={`w-full p-3 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer shadow-sm hover:border-gray-300 transition-colors ${isError && !matchAnswers[i] ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                                    >
                                        <option value="" disabled>Pilih Pasangan...</option>
                                        {rightOptions.map((opt, idx) => (
                                            <option key={idx} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                );

            case 'ESSAY':
                return (
                    <div className="mt-4">
                        <textarea
                            value={answer || ''}
                            onChange={(e) => onAnswerChange(question.id, e.target.value)}
                            rows={6}
                            className={`w-full p-4 bg-white border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-gray-800 placeholder-gray-400 shadow-sm transition-all text-base leading-relaxed ${isError ? 'border-red-400 ring-1 ring-red-100' : 'border-gray-200'}`}
                            placeholder="Ketik jawaban uraian Anda di sini..."
                        />
                        <div className="text-right mt-1 text-xs text-gray-400">{(answer || '').length} karakter</div>
                    </div>
                );

            case 'FILL_IN_THE_BLANK':
                return (
                    <div className="mt-4">
                        <input
                            type="text"
                            value={answer || ''}
                            onChange={(e) => onAnswerChange(question.id, e.target.value)}
                            className={`w-full p-4 bg-white border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-gray-800 placeholder-gray-400 shadow-sm transition-all font-medium ${isError ? 'border-red-400 ring-1 ring-red-100' : 'border-gray-200'}`}
                            placeholder="Jawaban singkat..."
                            autoComplete="off"
                        />
                    </div>
                );
                
            default: return null;
        }
    };

    return (
        <div id={`question-${question.id}`} className="scroll-mt-32 mb-8 animate-fade-in">
            <div className={`bg-white rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border overflow-hidden transition-all duration-300 ${isError ? 'border-red-500 ring-2 ring-red-100 shadow-red-100' : 'border-gray-100'}`}>
                {/* Header Card: Nomor & Teks */}
                <div className={`p-6 md:p-8 ${isError ? 'bg-red-50/30' : ''}`}>
                    <div className="flex gap-4 md:gap-6">
                        <div className="shrink-0 flex flex-col items-center gap-2">
                            {question.questionType === 'INFO' ? (
                                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">i</div>
                            ) : (
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg shadow-lg ${isError ? 'bg-red-500 text-white shadow-red-300' : 'bg-neutral text-white shadow-neutral/20'}`}>
                                    {index + 1}
                                </div>
                            )}
                            {isError && (
                                <div className="text-red-500 animate-bounce">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            {isError && <p className="text-xs font-bold text-red-500 mb-1 uppercase tracking-wider animate-pulse">Pertanyaan ini wajib diisi</p>}
                            <div className="text-base md:text-lg text-gray-800 font-medium">
                                {question.questionText && <RenderContent content={question.questionText} />}
                            </div>
                            {question.imageUrl && (
                                <div className="mt-4">
                                    <SmartImageViewer src={question.imageUrl} alt="Gambar Soal" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="mt-2 md:pl-16">
                        {renderInput()}
                    </div>
                </div>
            </div>
        </div>
    );
});

// --- HALAMAN UTAMA ---
export const StudentExamPage: React.FC<StudentExamPageProps> = ({ exam, student, initialData, onSubmit, onForceSubmit, onUpdate }) => {
    // 1. Initial State & Setup
    const [answers, setAnswers] = useState<Record<string, string>>(() => {
        try {
            const saved = localStorage.getItem(`exam_answers_${exam.code}_${student.studentId}`);
            if (saved) return { ...JSON.parse(saved), ...initialData?.answers };
        } catch {}
        return (initialData?.answers as Record<string, string>) || {};
    });

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // VALIDATION STATE
    const [unansweredIds, setUnansweredIds] = useState<Set<string>>(new Set());

    // Time Management
    const endTimeRef = useRef<number>(0);
    const [timeLeft, setTimeLeft] = useState(0);

    // Refs untuk akses state terbaru
    const answersRef = useRef(answers);
    const timeLeftRef = useRef(timeLeft);

    // Activity Logging Queue
    const activityQueueRef = useRef<string[]>([]);
    const lastLoggedQuestionIdRef = useRef<string | null>(null);

    // Helper to add log
    const logActivity = (message: string) => {
        const entry = `${getCurrentTimeStr()} ${message}`;
        activityQueueRef.current.push(entry);
    };

    useEffect(() => { answersRef.current = answers; }, [answers]);
    useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

    // Auto-save Logic
    useEffect(() => {
        if (!onUpdate || exam.config.autoSaveInterval <= 0) return;

        const intervalId = setInterval(() => {
            if (!isSubmitting) {
                const logsToSend = [...activityQueueRef.current];
                activityQueueRef.current = []; // Clear local queue
                onUpdate(answersRef.current, timeLeftRef.current, undefined, logsToSend);
            }
        }, exam.config.autoSaveInterval * 1000);

        return () => clearInterval(intervalId);
    }, [exam.config.autoSaveInterval, isSubmitting, onUpdate]);


    // Anti-Cheat (Visibility Check Only)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                if (exam.config.detectBehavior && !isSubmitting) {
                    logActivity("Meninggalkan halaman ujian (Tab/Aplikasi disembunyikan).");
                    
                    const logsToSend = [...activityQueueRef.current];
                    activityQueueRef.current = []; 

                    if (exam.config.continueWithPermission) {
                        setIsSubmitting(true);
                        // Trigger Force Submit SEKALI. Backend akan menangani apakah ini diterima atau ditolak (jika sudah di-unlock).
                        onForceSubmit(answersRef.current, timeLeftRef.current, logsToSend);
                    } else {
                        // Log Only
                        if (onUpdate) {
                            onUpdate(answersRef.current, timeLeftRef.current, undefined, logsToSend);
                        }
                    }
                }
            } else {
                if (exam.config.detectBehavior && !isSubmitting) {
                    logActivity("Kembali ke halaman ujian.");
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [exam.config.detectBehavior, exam.config.continueWithPermission, onForceSubmit, onUpdate, isSubmitting]);

    // Initial Setup Effect
    useEffect(() => {
        const dateStr = exam.config.date.includes('T') ? exam.config.date.split('T')[0] : exam.config.date;
        const startObj = new Date(`${dateStr}T${exam.config.startTime}`);
        const endObj = new Date(startObj.getTime() + (exam.config.timeLimit * 60 * 1000));
        endTimeRef.current = endObj.getTime();

        const tick = () => {
            if (isSubmitting) return;

            const now = Date.now();
            const diff = Math.floor((endTimeRef.current - now) / 1000);
            if (diff <= 0) {
                setTimeLeft(0);
                handleSubmit(true); 
            } else {
                setTimeLeft(diff);
                requestAnimationFrame(tick);
            }
        };
        const timer = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(timer);
    }, [exam, isSubmitting]);

    // Network Listeners
    useEffect(() => {
        const setOn = () => { setIsOnline(true); logActivity("Koneksi internet pulih."); };
        const setOff = () => { setIsOnline(false); logActivity("Koneksi internet terputus."); };
        window.addEventListener('online', setOn);
        window.addEventListener('offline', setOff);
        return () => {
            window.removeEventListener('online', setOn);
            window.removeEventListener('offline', setOff);
        }
    }, []);

    // Questions Logic (Shuffle)
    const questions = useMemo(() => {
        const key = `exam_order_${exam.code}_${student.studentId}`;
        const storedOrder = localStorage.getItem(key);
        
        let qList = [...exam.questions];
        if (exam.config.shuffleQuestions) {
            if (storedOrder) {
                try {
                    const ids = JSON.parse(storedOrder) as string[];
                    qList.sort((a, b) => {
                        const idxA = ids.indexOf(a.id);
                        const idxB = ids.indexOf(b.id);
                        if (idxA === -1) return 1;
                        if (idxB === -1) return -1;
                        return idxA - idxB;
                    });
                } catch {
                    qList = shuffleArray(qList);
                    localStorage.setItem(key, JSON.stringify(qList.map(q => q.id)));
                }
            } else {
                qList = shuffleArray(qList);
                localStorage.setItem(key, JSON.stringify(qList.map(q => q.id)));
            }
        }
        return qList;
    }, [exam]);

    // Handlers
    const handleAnswerChange = useCallback((id: string, val: string) => {
        if (isSubmitting) return;

        // Clear error state if answered
        setUnansweredIds(prev => {
            if (prev.has(id)) {
                const next = new Set(prev);
                next.delete(id);
                return next;
            }
            return prev;
        });

        if (lastLoggedQuestionIdRef.current !== id) {
            const qIndex = questions.findIndex(q => q.id === id);
            if (qIndex !== -1 && questions[qIndex].questionType !== 'INFO') {
                const visualNum = questions.slice(0, qIndex).filter(x => x.questionType !== 'INFO').length + 1;
                logActivity(`Mulai mengerjakan soal No. ${visualNum}`);
            }
            lastLoggedQuestionIdRef.current = id;
        }

        setAnswers(prev => {
            const next = { ...prev, [id]: val };
            localStorage.setItem(`exam_answers_${exam.code}_${student.studentId}`, JSON.stringify(next));
            return next;
        });
    }, [exam.code, student.studentId, questions, isSubmitting]);

    const scrollToQuestion = (id: string) => {
        const el = document.getElementById(`question-${id}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setIsSidebarOpen(false);
        }
    };

    const validateAnswers = () => {
        const missing = new Set<string>();
        questions.forEach(q => {
            if (q.questionType === 'INFO') return;
            const val = answers[q.id];
            // Check if undefined, null, or empty string/array/object representation
            if (!val || val === '[]' || val === '{}' || (typeof val === 'string' && val.trim() === '')) {
                missing.add(q.id);
            }
        });
        return missing;
    };

    const handleSubmit = async (isAuto = false) => {
        // Validation Logic (Only for manual submit)
        if (!isAuto) {
            const missing = validateAnswers();
            if (missing.size > 0) {
                setUnansweredIds(missing);
                const firstMissingId = Array.from(missing)[0];
                scrollToQuestion(firstMissingId);
                alert(`Mohon maaf, Anda belum menjawab ${missing.size} soal. Silakan lengkapi jawaban pada soal yang berwarna merah.`);
                return; // STOP SUBMISSION
            }

            if (!confirm("Apakah Anda yakin ingin menyelesaikan ujian ini?")) return;
        }
        
        setIsSubmitting(true);

        logActivity(isAuto ? "Waktu habis, sistem mengumpulkan jawaban otomatis." : "Siswa menekan tombol Selesai.");
        
        let location = "";
        if (exam.config.trackLocation) {
             try {
                 const pos = await new Promise<GeolocationPosition>((res, rej) => 
                     navigator.geolocation.getCurrentPosition(res, rej, {timeout: 5000}));
                 location = `${pos.coords.latitude},${pos.coords.longitude}`;
             } catch {}
        }

        localStorage.removeItem(`exam_answers_${exam.code}_${student.studentId}`);
        const logsToSend = [...activityQueueRef.current];
        onSubmit(answers, timeLeft, location, logsToSend);
    };

    // Derived States for UI
    const answeredCount = questions.filter(q => q.questionType !== 'INFO' && answers[q.id]).length;
    const totalQuestions = questions.filter(q => q.questionType !== 'INFO').length;
    const progress = Math.round((answeredCount / totalQuestions) * 100) || 0;
    const isCritical = timeLeft < 300; // 5 mins

    // --- RENDER ---
    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pb-24">
            {/* Top Bar (Sticky) */}
            <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm transition-all">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg lg:hidden text-gray-600 relative">
                             <ListBulletIcon className="w-6 h-6" />
                             {unansweredIds.size > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border border-white"></span>}
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">{exam.code}</h1>
                            <p className="text-xs text-slate-500 font-medium hidden sm:block">Siswa: {student.fullName}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Timer Badge */}
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono font-bold text-sm shadow-sm transition-colors ${isCritical ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 'bg-white border-gray-200 text-slate-700'}`}>
                            <ClockIcon className="w-4 h-4" />
                            <span>{formatTime(timeLeft)}</span>
                        </div>
                        
                        {/* Network Status */}
                        <div className={`w-8 h-8 flex items-center justify-center rounded-full ${isOnline ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                            {isOnline ? <WifiIcon className="w-4 h-4" /> : <NoWifiIcon className="w-4 h-4" />}
                        </div>
                    </div>
                </div>
                {/* Progress Line */}
                <div className="h-1 w-full bg-gray-100">
                    <div className="h-full bg-indigo-600 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-3xl mx-auto px-4 pt-8">
                {/* Intro/Header Content */}
                <div className="mb-8 flex items-end justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Lembar Jawaban</h2>
                        <p className="text-slate-500 text-sm mt-1">Kerjakan dengan jujur dan teliti.</p>
                        {unansweredIds.size > 0 && (
                             <p className="text-red-600 text-xs font-bold mt-2 animate-pulse">
                                 ⚠ Terdapat {unansweredIds.size} soal yang belum dijawab.
                             </p>
                        )}
                    </div>
                    <div className="text-right hidden sm:block">
                        <div className="text-3xl font-bold text-indigo-600 leading-none">{progress}%</div>
                        <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Selesai</div>
                    </div>
                </div>

                {/* Question List */}
                <div className={isSubmitting ? 'pointer-events-none opacity-50 filter blur-sm transition-all' : ''}>
                    {questions.map((q, idx) => {
                         // Hitung nomor urut visual (skip INFO)
                         const visualNum = questions.slice(0, idx).filter(x => x.questionType !== 'INFO').length;
                         return (
                            <QuestionCard 
                                key={q.id}
                                question={q}
                                index={visualNum}
                                answer={answers[q.id] || ''}
                                shuffleAnswers={exam.config.shuffleAnswers}
                                onAnswerChange={handleAnswerChange}
                                isError={unansweredIds.has(q.id)}
                            />
                         );
                    })}
                </div>

                {/* Submit Area */}
                <div className="mt-12 mb-20">
                    <button 
                        onClick={() => handleSubmit(false)}
                        disabled={isSubmitting}
                        className="w-full bg-slate-900 hover:bg-black text-white font-bold text-lg py-4 rounded-xl shadow-xl shadow-slate-200 hover:shadow-2xl transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-3"
                    >
                        {isSubmitting ? (
                            <>
                                <ArrowPathIcon className="w-5 h-5 animate-spin" /> Mengumpulkan...
                            </>
                        ) : (
                            <>
                                <CheckCircleIcon className="w-6 h-6" /> Selesai & Kumpulkan
                            </>
                        )}
                    </button>
                    <p className="text-center text-xs text-slate-400 mt-4 max-w-sm mx-auto">
                        Pastikan koneksi internet stabil saat mengumpulkan. Jawaban akan otomatis tersimpan di perangkat jika offline.
                    </p>
                </div>
            </div>

            {/* Navigation Drawer (Sidebar) */}
            <div className={`fixed inset-0 z-50 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
                <div className="relative w-80 max-w-[80vw] h-full bg-white shadow-2xl flex flex-col">
                    <div className="p-4 border-b flex items-center justify-between bg-slate-50">
                        <h3 className="font-bold text-slate-800">Navigasi Soal</h3>
                        <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-slate-200 rounded-full">
                            <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="grid grid-cols-4 gap-3">
                            {questions.map((q, idx) => {
                                if (q.questionType === 'INFO') return null; // Skip numbering for INFO
                                const visualNum = questions.slice(0, idx).filter(x => x.questionType !== 'INFO').length + 1;
                                const isAnswered = !!answers[q.id];
                                const isError = unansweredIds.has(q.id);
                                
                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => scrollToQuestion(q.id)}
                                        className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-bold border-2 transition-all relative
                                            ${isError 
                                                ? 'bg-red-500 border-red-600 text-white shadow-md animate-pulse'
                                                : isAnswered 
                                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                                                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-400'
                                            }`}
                                    >
                                        <span>{visualNum}</span>
                                        {isAnswered && !isError && <span className="text-[8px] leading-none mt-0.5">OK</span>}
                                        {isError && <span className="text-[8px] leading-none mt-0.5 text-white">!</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-4 border-t bg-slate-50 text-xs text-slate-500 text-center">
                        <p>Total {answeredCount} dari {totalQuestions} soal terjawab</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
