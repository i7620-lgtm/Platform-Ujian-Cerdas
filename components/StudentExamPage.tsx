
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Exam, Student, Question, Result } from '../types';
import { ClockIcon, CheckCircleIcon, ArrowPathIcon } from './Icons';

interface StudentExamPageProps {
  exam: Exam;
  student: Student;
  initialData?: Result | null;
  onSubmit: (answers: Record<string, string>, timeLeft: number, location?: string, activityLog?: string[]) => void;
  onForceSubmit: (answers: Record<string, string>, timeLeft: number, activityLog?: string[]) => void;
  onUpdate?: (answers: Record<string, string>, timeLeft: number, location?: string, activityLog?: string[]) => void;
}

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const DataSaverImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [view, setView] = useState(false);
    const isBase64 = src.startsWith('data:');

    if (!view && !isBase64) {
        return (
            <button 
                onClick={() => setView(true)}
                className="w-full h-32 bg-slate-50 border border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 gap-2 hover:bg-slate-100 transition-colors my-2"
            >
                <span className="text-xs font-bold">Klik untuk memuat gambar</span>
                <span className="text-[10px]">(Hemat Data)</span>
            </button>
        )
    }

    return (
        <div className="relative my-3 rounded-lg overflow-hidden border border-slate-100 bg-white">
            <img 
                src={src} 
                alt={alt} 
                className={`max-w-full h-auto object-contain mx-auto transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setIsLoaded(true)}
                loading="lazy"
            />
            {!isLoaded && <div className="absolute inset-0 bg-slate-50 animate-pulse"></div>}
        </div>
    );
};

const RenderContent: React.FC<{ content: string }> = React.memo(({ content }) => {
    if (content.startsWith('data:image/') || content.startsWith('http')) {
        return <DataSaverImage src={content} alt="Soal" />;
    }
    return <div className="whitespace-pre-wrap font-serif text-slate-800 text-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: content }}></div>;
});

const QuestionCard: React.FC<{
    question: Question;
    index: number;
    answer: string;
    onAnswerChange: (id: string, val: string) => void;
}> = React.memo(({ question, index, answer, onAnswerChange }) => {
    const options = useMemo(() => {
        if (!question.options) return [];
        return question.options.map((text, i) => ({ text, originalIndex: i }));
    }, [question.options]);

    return (
        <div id={`q-${question.id}`} className="mb-8 scroll-mt-32">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 relative">
                <div className="absolute -top-3 -left-2 bg-slate-800 text-white text-sm font-bold px-3 py-1 rounded shadow-md border-2 border-white">
                    No. {index + 1}
                </div>

                <div className="mt-2 mb-4">
                    <RenderContent content={question.questionText} />
                    {question.imageUrl && <DataSaverImage src={question.imageUrl} alt="Gambar Soal" />}
                </div>

                <div className="space-y-3">
                    {question.questionType === 'MULTIPLE_CHOICE' && options.map((opt, i) => (
                        <label key={i} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${answer === opt.text ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                            <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${answer === opt.text ? 'border-indigo-600 bg-indigo-600' : 'border-slate-400 bg-white'}`}>
                                {answer === opt.text && <div className="w-2 h-2 bg-white rounded-full"></div>}
                            </div>
                            <input 
                                type="radio" 
                                name={`q-${question.id}`} 
                                className="hidden" 
                                checked={answer === opt.text} 
                                onChange={() => onAnswerChange(question.id, opt.text)} 
                            />
                            <div className="text-sm md:text-base text-slate-700 leading-snug">{opt.text}</div>
                        </label>
                    ))}

                    {question.questionType === 'ESSAY' && (
                        <textarea
                            value={answer}
                            onChange={(e) => onAnswerChange(question.id, e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm min-h-[120px]"
                            placeholder="Tulis jawaban Anda di sini..."
                        />
                    )}
                    
                    {['FILL_IN_THE_BLANK'].includes(question.questionType) && (
                         <input
                            type="text"
                            value={answer}
                            onChange={(e) => onAnswerChange(question.id, e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Jawaban singkat..."
                        />
                    )}
                </div>
            </div>
        </div>
    );
});

export const StudentExamPage: React.FC<StudentExamPageProps> = ({ exam, student, initialData, onSubmit, onForceSubmit, onUpdate }) => {
    const [answers, setAnswers] = useState<Record<string, string>>({ ...initialData?.answers });
    const [timeLeft, setTimeLeft] = useState(0);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'SAVED' | 'SAVING' | 'PENDING'>('SAVED');
    const [logs, setLogs] = useState<string[]>(initialData?.activityLog || []);

    const endTimeRef = useRef<number>(0);
    const violationOccurred = useRef(false);
    
    const addLog = (msg: string) => {
        const time = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, `[${time}] ${msg}`]);
    };

    useEffect(() => {
        const dateStr = exam.config.date.includes('T') ? exam.config.date.split('T')[0] : exam.config.date;
        const startObj = new Date(`${dateStr}T${exam.config.startTime}`);
        endTimeRef.current = startObj.getTime() + (exam.config.timeLimit * 60 * 1000);

        const tick = setInterval(() => {
            const diff = Math.floor((endTimeRef.current - Date.now()) / 1000);
            if (diff <= 0) {
                clearInterval(tick);
                if (!violationOccurred.current) handleSubmit(true);
            } else {
                setTimeLeft(diff);
            }
        }, 1000);

        // --- ANTI-CHEAT LOGIC ---
        const handleViolation = (reason: string) => {
            if (violationOccurred.current || !exam.config.detectBehavior) return;
            
            const detailedMsg = `PELANGGARAN: ${reason}`;
            addLog(detailedMsg);
            
            if (exam.config.continueWithPermission) {
                violationOccurred.current = true;
                clearInterval(tick);
                onForceSubmit(answers, timeLeft, [...logs, detailedMsg]);
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                handleViolation("Siswa meninggalkan tab ujian/pindah tab.");
            }
        };

        const handleBlur = () => {
            handleViolation("Siswa membuka aplikasi lain atau kehilangan fokus pada layar ujian.");
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);

        const netHandler = () => setIsOnline(navigator.onLine);
        window.addEventListener('online', netHandler);
        window.addEventListener('offline', netHandler);

        return () => {
            clearInterval(tick);
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('online', netHandler);
            window.removeEventListener('offline', netHandler);
        };
    }, [exam.config, answers, timeLeft, logs]);

    useEffect(() => {
        if(Object.keys(answers).length === 0 || violationOccurred.current) return;
        setSaveStatus('PENDING');
        const timer = setTimeout(() => {
            if(onUpdate) {
                setSaveStatus('SAVING');
                onUpdate(answers, timeLeft, undefined, logs); 
                setTimeout(() => setSaveStatus('SAVED'), 800);
            }
        }, 2000);
        return () => clearTimeout(timer);
    }, [answers]);

    const handleAnswer = useCallback((id: string, val: string) => {
        if (violationOccurred.current) return;
        setAnswers(prev => ({ ...prev, [id]: val }));
    }, []);

    const handleSubmit = (auto = false) => {
        if (violationOccurred.current) return;
        if (!auto && !confirm("Kirim jawaban sekarang? Anda tidak bisa mengubahnya lagi.")) return;
        setIsSubmitting(true);
        onSubmit(answers, timeLeft, undefined, logs);
    };

    const answeredCount = Object.keys(answers).filter(k => answers[k]).length;
    const totalQ = exam.questions.filter(q => q.questionType !== 'INFO').length;
    const progress = totalQ > 0 ? (answeredCount / totalQ) * 100 : 0;

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans text-slate-800">
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm transition-all">
                <div className="px-4 py-3 flex justify-between items-center relative">
                    <div className="flex flex-col">
                        <h1 className="text-sm font-bold text-slate-800 truncate max-w-[200px] sm:max-w-xs">{exam.config.subject}</h1>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>{answeredCount}/{totalQ} Terjawab</span>
                            <span className="text-slate-300">•</span>
                            {saveStatus === 'SAVING' && <span className="text-amber-500 font-medium animate-pulse">Menyimpan...</span>}
                            {saveStatus === 'SAVED' && <span className="text-emerald-500 font-medium">Tersimpan</span>}
                            {saveStatus === 'PENDING' && <span className="text-slate-400">...</span>}
                        </div>
                    </div>
                    
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${timeLeft < 300 ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                        <ClockIcon className="w-4 h-4" />
                        <span className="font-mono font-bold text-sm">{formatTime(timeLeft)}</span>
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-100">
                    <div 
                        className="h-full bg-indigo-600 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(79,70,229,0.5)]" 
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {!isOnline && (
                <div className="bg-rose-500 text-white text-xs font-bold text-center py-2 shadow-inner flex items-center justify-center gap-2 animate-pulse">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" /></svg>
                    Koneksi Terputus - Jawaban Disimpan Lokal
                </div>
            )}

            <div className="max-w-2xl mx-auto p-4 pt-6">
                {exam.questions.map((q, idx) => (
                    <QuestionCard 
                        key={q.id} 
                        question={q} 
                        index={idx} 
                        answer={answers[q.id] || ''} 
                        onAnswerChange={handleAnswer} 
                    />
                ))}
            </div>

            <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-slate-200 p-3 px-6 flex items-center justify-between z-40 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-rose-500'}`}></div>
                    {isOnline ? 'Online' : 'Offline Mode'}
                </div>
                <button 
                    onClick={() => handleSubmit(false)}
                    disabled={isSubmitting || violationOccurred.current}
                    className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-black transition-all shadow-lg shadow-slate-200 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                    {isSubmitting ? <ArrowPathIcon className="w-4 h-4 animate-spin"/> : <CheckCircleIcon className="w-4 h-4"/>}
                    {isSubmitting ? 'Mengirim...' : 'Selesai & Kumpulkan'}
                </button>
            </div>
        </div>
    );
};
 
