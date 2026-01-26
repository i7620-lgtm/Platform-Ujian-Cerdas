
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Exam, Student, Question, Result } from '../types';
import { ClockIcon, CheckCircleIcon, ListBulletIcon, ArrowLeftIcon, ArrowPathIcon } from './Icons';
import { storageService } from '../services/storage';

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
                className="relative group cursor-zoom-in overflow-hidden rounded-lg border border-gray-100 bg-gray-50 max-w-full md:max-w-md my-4"
                onClick={() => setIsOpen(true)}
            >
                <img 
                    src={src} 
                    alt={alt} 
                    className="w-full h-auto object-contain transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                />
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

// --- KOMPONEN RENDERING MATEMATIKA + RICH TEXT ---
const RenderContent: React.FC<{ content: string }> = ({ content }) => {
    if (content.startsWith('data:image/')) {
        return <SmartImageViewer src={content} alt="Konten Visual" />;
    }

    try {
        // 0. Fix Legacy Styles
        // Handles cases where editor injected explicit font sizes (1rem, 16px, 12pt) which conflict with prose-lg (1.125rem)
        // Uses a robust regex to catch variations in spacing and units
        let processedText = content.replace(/font-size:\s*(1rem|16px|12pt)/gi, 'font-size: 100%');

        // 1. Process Rich Text (Bold, Italic, Del, Underline)
        processedText = processedText
            .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([\s\S]+?)\*/g, '<em>$1</em>')
            .replace(/~~([\s\S]+?)~~/g, '<del>$1</del>')
            .replace(/<u>([\s\S]+?)<\/u>/g, '<u>$1</u>');

        // 2. Accurate List Parsing (Line by line)
        const lines = processedText.split('\n');
        let finalHtmlChunks = [];
        let inUl = false;
        let inOl = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const bulletMatch = line.match(/^\s*-\s+(.*)/);
            const numberedMatch = line.match(/^\s*\d+[\.\)]\s+(.*)/);

            if (bulletMatch) {
                if (inOl) { finalHtmlChunks.push('</ol>'); inOl = false; }
                if (!inUl) { finalHtmlChunks.push('<ul class="list-disc list-outside pl-6 space-y-1 my-2">'); inUl = true; }
                finalHtmlChunks.push(`<li>${bulletMatch[1]}</li>`);
            } else if (numberedMatch) {
                if (inUl) { finalHtmlChunks.push('</ul>'); inUl = false; }
                if (!inOl) { finalHtmlChunks.push('<ol class="list-decimal list-outside pl-6 space-y-1 my-2">'); inOl = true; }
                finalHtmlChunks.push(`<li>${numberedMatch[1]}</li>`);
            } else {
                if (inUl) { finalHtmlChunks.push('</ul>'); inUl = false; }
                if (inOl) { finalHtmlChunks.push('</ol>'); inOl = false; }
                finalHtmlChunks.push(line.trim() === '' ? '<div class="h-2"></div>' : line + '<br/>');
            }
        }
        if (inUl) finalHtmlChunks.push('</ul>');
        if (inOl) finalHtmlChunks.push('</ol>');

        let html = finalHtmlChunks.join('');

        // 3. KaTeX Rendering
        if (html.includes('$') && (window as any).katex) {
            html = html.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
                return (window as any).katex.renderToString(math, { displayMode: true, throwOnError: false });
            }).replace(/\$([\s\S]+?)\$/g, (_, math) => {
                return (window as any).katex.renderToString(math, { displayMode: false, throwOnError: false });
            });
        }
        
        return (
            <div 
                className="prose prose-slate prose-lg max-w-none text-slate-800 leading-relaxed font-normal break-words whitespace-pre-wrap selection:bg-indigo-100 selection:text-indigo-900"
                dangerouslySetInnerHTML={{ __html: html }}
            />
        );
    } catch (e) {
        console.error("Content rendering error", e);
        return <div className="prose prose-slate prose-lg max-w-none text-slate-800 leading-relaxed font-normal break-words whitespace-pre-wrap">{content}</div>;
    }
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

    const renderInput = () => {
        switch (question.questionType) {
            case 'MULTIPLE_CHOICE':
                return (
                    <div className="grid grid-cols-1 gap-3 mt-6">
                        {displayedOptions.map((opt, i) => {
                            const isSelected = answer === opt.text;
                            return (
                                <div 
                                    key={i}
                                    onClick={() => onAnswerChange(question.id, opt.text)}
                                    className={`relative flex items-start p-4 cursor-pointer rounded-xl border transition-all duration-200 group
                                        ${isSelected 
                                            ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                                            : isError 
                                                ? 'bg-white border-red-200 hover:border-red-300' 
                                                : 'bg-white border-slate-100 hover:border-indigo-200 hover:bg-slate-50'
                                        }`}
                                >
                                    <div className={`mt-0.5 flex items-center justify-center w-5 h-5 rounded-full border flex-shrink-0 mr-4 transition-colors ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-white'}`}>
                                        {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <div className="flex-1">
                                        {opt.text && <RenderContent content={opt.text} />}
                                        {opt.image && <SmartImageViewer src={opt.image} alt="Opsi" />}
                                    </div>
                                    <span className={`absolute top-4 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                                        {String.fromCharCode(65 + i)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                );

            case 'COMPLEX_MULTIPLE_CHOICE':
                return (
                    <div className="grid grid-cols-1 gap-3 mt-6">
                        <div className="bg-slate-50 text-slate-500 text-xs px-3 py-1.5 rounded-md mb-2 inline-block font-medium w-fit border border-slate-100">
                            Pilih satu atau lebih jawaban benar
                        </div>
                        {displayedOptions.map((opt, i) => {
                            let isChecked = false;
                            try { isChecked = (JSON.parse(answer || '[]') as string[]).includes(opt.text); } catch {}
                            
                            return (
                                <div 
                                    key={i}
                                    onClick={() => handleComplexChange(opt.text, !isChecked)}
                                    className={`relative flex items-start p-4 cursor-pointer rounded-xl border transition-all duration-200 select-none
                                        ${isChecked 
                                            ? 'bg-emerald-50 border-emerald-200 shadow-sm' 
                                            : 'bg-white border-slate-100 hover:border-emerald-200 hover:bg-slate-50'
                                        }`}
                                >
                                    <div className={`mt-0.5 flex items-center justify-center w-5 h-5 rounded flex-shrink-0 border mr-4 transition-colors ${isChecked ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white'}`}>
                                        {isChecked && <CheckCircleIcon className="w-3.5 h-3.5"/>}
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
                    <div className="mt-6 space-y-4">
                        {question.trueFalseRows.map((row, i) => (
                            <div key={i} className="p-4 bg-white rounded-xl border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-slate-700 font-medium text-base flex-1">{row.text}</div>
                                <div className="flex gap-2 shrink-0">
                                    <button 
                                        onClick={() => handleTrueFalseChange(i, true)}
                                        className={`px-6 py-2 rounded-full text-xs font-bold border transition-all ${tfAnswers[i] === true ? 'bg-emerald-500 text-white border-emerald-500 shadow-md transform scale-105' : 'bg-white text-slate-400 border-slate-200 hover:border-emerald-300'}`}
                                    >
                                        BENAR
                                    </button>
                                    <button 
                                        onClick={() => handleTrueFalseChange(i, false)}
                                        className={`px-6 py-2 rounded-full text-xs font-bold border transition-all ${tfAnswers[i] === false ? 'bg-rose-500 text-white border-rose-500 shadow-md transform scale-105' : 'bg-white text-slate-400 border-slate-200 hover:border-rose-300'}`}
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
                const rightOptions = useMemo(() => {
                    const opts = question.matchingPairs?.map(p => p.right).filter(Boolean) || [];
                    return opts.sort((a, b) => a.localeCompare(b));
                }, [question.matchingPairs]);
                
                return (
                    <div className="mt-8 space-y-6">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-2">Pasangkan Item</div>
                        {question.matchingPairs.map((pair, i) => (
                            <div key={i} className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                                <div className="flex-1 font-medium text-slate-700 text-base bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                    {pair.left}
                                </div>
                                <div className="hidden md:block text-slate-300">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                </div>
                                <div className="flex-1">
                                    <select 
                                        value={matchAnswers[i] || ''}
                                        onChange={(e) => handleMatchingChange(i, e.target.value)}
                                        className={`w-full p-4 bg-slate-50 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer transition-colors appearance-none ${isError && !matchAnswers[i] ? 'border-rose-300 bg-rose-50' : 'border-slate-100 hover:border-indigo-200'}`}
                                    >
                                        <option value="" disabled>Pilih Pasangan...</option>
                                        {rightOptions.map((opt, idx) => (
                                            <option key={`${idx}-${opt}`} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                );

            case 'ESSAY':
                return (
                    <div className="mt-6">
                        <textarea
                            value={answer || ''}
                            onChange={(e) => onAnswerChange(question.id, e.target.value)}
                            rows={8}
                            className={`w-full p-5 bg-white border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800 placeholder-slate-300 shadow-sm transition-all text-base leading-relaxed resize-none ${isError ? 'border-rose-300 ring-1 ring-rose-100' : 'border-slate-200 hover:border-slate-300'}`}
                            placeholder="Ketik jawaban uraian Anda di sini secara lengkap..."
                        />
                        <div className="text-right mt-2 text-xs text-slate-400 font-medium">{(answer || '').length} karakter</div>
                    </div>
                );

            case 'FILL_IN_THE_BLANK':
                return (
                    <div className="mt-6">
                        <input
                            type="text"
                            value={answer || ''}
                            onChange={(e) => onAnswerChange(question.id, e.target.value)}
                            className={`w-full p-4 bg-white border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800 placeholder-slate-300 shadow-sm transition-all font-medium ${isError ? 'border-rose-300 ring-1 ring-rose-100' : 'border-slate-200 hover:border-slate-300'}`}
                            placeholder="Jawaban singkat..."
                            autoComplete="off"
                        />
                    </div>
                );
                
            default: return null;
        }
    };

    return (
        <div id={`question-${question.id}`} className="scroll-mt-32 mb-12 animate-fade-in group">
            <div className={`bg-white rounded-[1.5rem] p-6 md:p-10 transition-all duration-300 ${isError ? 'ring-2 ring-rose-100 shadow-lg shadow-rose-50' : 'shadow-sm hover:shadow-md'}`}>
                <div className="flex gap-6">
                    <div className="shrink-0 hidden md:block">
                        {question.questionType === 'INFO' ? (
                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">i</div>
                        ) : (
                            <span className="text-slate-300 font-bold text-xl select-none">
                                {String(index + 1).padStart(2, '0')}
                            </span>
                        )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                         {/* Mobile Number Indicator */}
                         <div className="md:hidden mb-4 flex items-center gap-2">
                            {question.questionType !== 'INFO' && (
                                <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                    Soal {index + 1}
                                </span>
                            )}
                            {isError && <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider animate-pulse">Wajib Diisi</span>}
                         </div>

                        <div className="text-lg md:text-xl text-slate-800 font-medium leading-relaxed">
                            {question.questionText && <RenderContent content={question.questionText} />}
                        </div>
                        {question.imageUrl && (
                            <div className="mt-6">
                                <SmartImageViewer src={question.imageUrl} alt="Gambar Soal" />
                            </div>
                        )}
                        
                        <div className="mt-2">
                            {renderInput()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

// --- HALAMAN UTAMA ---
export const StudentExamPage: React.FC<StudentExamPageProps> = ({ exam, student, initialData, onSubmit, onForceSubmit, onUpdate }) => {
    const [answers, setAnswers] = useState<Record<string, string>>(() => {
        try {
            const saved = localStorage.getItem(`exam_answers_${exam.code}_${student.studentId}`);
            if (saved) return { ...JSON.parse(saved), ...initialData?.answers };
        } catch {}
        return (initialData?.answers as Record<string, string>) || {};
    });

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [unansweredIds, setUnansweredIds] = useState<Set<string>>(new Set());
    const [isTimeExtended, setIsTimeExtended] = useState(false); // New state for notification

    // Use state for config to allow dynamic updates
    const [currentConfig, setCurrentConfig] = useState(exam.config);

    const endTimeRef = useRef<number>(0);
    const [timeLeft, setTimeLeft] = useState(0);

    const answersRef = useRef(answers);
    const timeLeftRef = useRef(timeLeft);
    const activityQueueRef = useRef<string[]>([]);
    const lastLoggedQuestionIdRef = useRef<string | null>(null);

    const logActivity = (message: string) => {
        const entry = `${getCurrentTimeStr()} ${message}`;
        activityQueueRef.current.push(entry);
    };

    useEffect(() => { answersRef.current = answers; }, [answers]);
    useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

    useEffect(() => {
        if (!onUpdate || currentConfig.autoSaveInterval <= 0) return;

        const intervalId = setInterval(() => {
            if (!isSubmitting) {
                const logsToSend = [...activityQueueRef.current];
                activityQueueRef.current = [];
                onUpdate(answersRef.current, timeLeftRef.current, undefined, logsToSend);
            }
        }, currentConfig.autoSaveInterval * 1000);

        return () => clearInterval(intervalId);
    }, [currentConfig.autoSaveInterval, isSubmitting, onUpdate]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                if (currentConfig.detectBehavior && !isSubmitting) {
                    logActivity("Meninggalkan halaman ujian (Tab/Aplikasi disembunyikan).");
                    const logsToSend = [...activityQueueRef.current];
                    activityQueueRef.current = []; 
                    if (currentConfig.continueWithPermission) {
                        setIsSubmitting(true);
                        onForceSubmit(answersRef.current, timeLeftRef.current, logsToSend);
                    } else if (onUpdate) {
                        onUpdate(answersRef.current, timeLeftRef.current, undefined, logsToSend);
                    }
                }
            } else if (currentConfig.detectBehavior && !isSubmitting) {
                logActivity("Kembali ke halaman ujian.");
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [currentConfig.detectBehavior, currentConfig.continueWithPermission, onForceSubmit, onUpdate, isSubmitting]);

    // TIMER LOGIC & INITIAL CALC
    const calculateEndTime = useCallback((config: typeof currentConfig) => {
        const dateStr = config.date.includes('T') ? config.date.split('T')[0] : config.date;
        const startObj = new Date(`${dateStr}T${config.startTime}`);
        return startObj.getTime() + (config.timeLimit * 60 * 1000);
    }, []);

    useEffect(() => {
        endTimeRef.current = calculateEndTime(currentConfig);

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
    }, [isSubmitting, currentConfig, calculateEndTime]); // Re-run if config changes

    // --- POLLING FOR CONFIG UPDATES (TIME EXTENSION) ---
    useEffect(() => {
        // Poll every 30 seconds to check if config.timeLimit has changed
        const pollInterval = setInterval(async () => {
            if (isSubmitting || !isOnline) return;
            
            try {
                // Fetch public exam data to get potentially updated config
                const updatedExam = await storageService.getExamForStudent(exam.code, false);
                
                if (updatedExam && updatedExam.config.timeLimit !== currentConfig.timeLimit) {
                    // Time limit changed!
                    logActivity(`Waktu ujian diperbarui oleh guru menjadi ${updatedExam.config.timeLimit} menit.`);
                    setCurrentConfig(prev => ({ ...prev, timeLimit: updatedExam.config.timeLimit }));
                    setIsTimeExtended(true);
                    setTimeout(() => setIsTimeExtended(false), 5000); // Hide notification after 5s
                }
            } catch (e) {
                console.warn("Failed to check for time updates", e);
            }
        }, 30000); // 30 seconds

        return () => clearInterval(pollInterval);
    }, [exam.code, currentConfig.timeLimit, isSubmitting, isOnline]);


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

    const questions = useMemo(() => {
        const key = `exam_order_${exam.code}_${student.studentId}`;
        const storedOrder = localStorage.getItem(key);
        let qList = [...exam.questions];
        if (currentConfig.shuffleQuestions) {
            if (storedOrder) {
                try {
                    const ids = JSON.parse(storedOrder) as string[];
                    qList.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
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
    }, [exam, currentConfig.shuffleQuestions]);

    const handleAnswerChange = useCallback((id: string, val: string) => {
        if (isSubmitting) return;
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
            setIsDrawerOpen(false);
        }
    };

    const validateAnswers = () => {
        const missing = new Set<string>();
        questions.forEach(q => {
            if (q.questionType === 'INFO') return;
            const val = answers[q.id];
            if (!val || val === '[]' || val === '{}' || (typeof val === 'string' && val.trim() === '')) {
                missing.add(q.id);
            }
        });
        return missing;
    };

    const handleSubmit = async (isAuto = false) => {
        if (!isAuto) {
            const missing = validateAnswers();
            if (missing.size > 0) {
                setUnansweredIds(missing);
                scrollToQuestion(Array.from(missing)[0]);
                alert(`Masih ada ${missing.size} soal yang belum dijawab. Mohon lengkapi terlebih dahulu.`);
                return;
            }
            if (!confirm("Apakah Anda yakin ingin menyelesaikan ujian? Jawaban tidak dapat diubah setelah dikirim.")) return;
        }
        setIsSubmitting(true);
        logActivity(isAuto ? "Waktu habis, sistem mengumpulkan jawaban otomatis." : "Siswa menekan tombol Selesai.");
        let location = "";
        if (currentConfig.trackLocation) {
             try {
                 const pos = await new Promise<GeolocationPosition>((res, rej) => 
                     navigator.geolocation.getCurrentPosition(res, rej, {timeout: 5000}));
                 location = `${pos.coords.latitude},${pos.coords.longitude}`;
             } catch {}
        }
        localStorage.removeItem(`exam_answers_${exam.code}_${student.studentId}`);
        onSubmit(answers, timeLeft, location, [...activityQueueRef.current]);
    };

    const answeredCount = questions.filter(q => q.questionType !== 'INFO' && answers[q.id]).length;
    const totalQuestions = questions.filter(q => q.questionType !== 'INFO').length;
    const progress = Math.round((answeredCount / totalQuestions) * 100) || 0;
    const isCritical = timeLeft < 300;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-32">
            
            {/* Extended Time Notification Toast */}
            {isTimeExtended && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-slide-in-up">
                    <div className="bg-indigo-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3">
                        <ClockIcon className="w-5 h-5 animate-pulse" />
                        <span className="font-bold text-sm">Waktu Ujian Diperpanjang oleh Guru!</span>
                    </div>
                </div>
            )}

            {/* Minimalist Header */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 transition-all">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <button onClick={() => setIsDrawerOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 relative transition-colors">
                             <ListBulletIcon className="w-6 h-6" />
                             {unansweredIds.size > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>}
                        </button>
                        <div className="hidden sm:block">
                            <h1 className="text-sm font-bold text-slate-900 tracking-tight">{currentConfig.subject || exam.code}</h1>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-2 text-sm font-mono font-bold transition-colors ${isCritical ? 'text-rose-600 animate-pulse' : 'text-slate-600'}`}>
                            <ClockIcon className="w-4 h-4" />
                            <span>{formatTime(timeLeft)}</span>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} title={isOnline ? "Online" : "Offline"}></div>
                    </div>
                </div>
                {/* Slim Progress Bar */}
                <div className="h-[2px] w-full bg-slate-100">
                    <div className="h-full bg-indigo-600 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(79,70,229,0.3)]" style={{ width: `${progress}%` }} />
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
                <div className="mb-8 md:mb-12">
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Lembar Soal</h2>
                    <p className="text-slate-500 mt-2">Pastikan semua jawaban terisi sebelum waktu habis.</p>
                </div>

                <div className={isSubmitting ? 'pointer-events-none opacity-50 filter blur-sm transition-all' : ''}>
                    {questions.map((q, idx) => (
                        <QuestionCard 
                            key={q.id}
                            question={q}
                            index={questions.slice(0, idx).filter(x => x.questionType !== 'INFO').length}
                            answer={answers[q.id] || ''}
                            shuffleAnswers={currentConfig.shuffleAnswers}
                            onAnswerChange={handleAnswerChange}
                            isError={unansweredIds.has(q.id)}
                        />
                    ))}
                </div>

                <div className="mt-16 mb-20 flex justify-center">
                    <button 
                        onClick={() => handleSubmit(false)}
                        disabled={isSubmitting}
                        className="w-full max-w-sm bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-2xl shadow-xl shadow-slate-200 transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-sm tracking-wider uppercase"
                    >
                        {isSubmitting ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <CheckCircleIcon className="w-5 h-5" />}
                        {isSubmitting ? 'Mengirim Jawaban...' : 'Selesai & Kumpulkan'}
                    </button>
                </div>
            </div>

            {/* Navigation Drawer */}
            <div className={`fixed inset-0 z-50 transform transition-transform duration-300 ease-in-out ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)} />
                <div className="relative w-72 h-full bg-white shadow-2xl flex flex-col">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800">Navigasi Soal</h3>
                        <button onClick={() => setIsDrawerOpen(false)} className="text-slate-400 hover:text-slate-600"><ArrowLeftIcon className="w-5 h-5" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="grid grid-cols-4 gap-3">
                            {questions.map((q, idx) => {
                                if (q.questionType === 'INFO') return null;
                                const visualNum = questions.slice(0, idx).filter(x => x.questionType !== 'INFO').length + 1;
                                const isAnswered = !!answers[q.id];
                                const isError = unansweredIds.has(q.id);
                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => scrollToQuestion(q.id)}
                                        className={`aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all relative
                                            ${isError ? 'bg-rose-500 text-white shadow-md shadow-rose-200' : 
                                              isAnswered ? 'bg-slate-900 text-white' : 
                                              'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}
                                    >
                                        {visualNum}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="p-6 bg-slate-50 border-t border-slate-100">
                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                            <span>Progress</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                             <div className="h-full bg-indigo-600" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
