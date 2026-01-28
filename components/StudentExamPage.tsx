 
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Exam, Student, Question, Result } from '../types';
import { ClockIcon, CheckCircleIcon, ArrowPathIcon } from './Icons';
import { storageService } from '../services/storage';

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

// --- KOMPONEN GAMBAR HEMAT DATA (Click to Load) ---
const DataSaverImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [view, setView] = useState(false);

    // Jika src adalah base64 (dari PDF crop), kita anggap sudah terload karena ada di memori
    // Tapi jika URL eksternal, kita bisa lazy load
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
    // Simple render untuk performa
    return <div className="whitespace-pre-wrap font-serif text-slate-800 text-lg leading-relaxed">{content}</div>;
});

const QuestionCard: React.FC<{
    question: Question;
    index: number;
    answer: string;
    onAnswerChange: (id: string, val: string) => void;
}> = React.memo(({ question, index, answer, onAnswerChange }) => {
    
    // Simple Shuffle Effect (Hanya render, tidak state berat)
    const options = useMemo(() => {
        if (!question.options) return [];
        return question.options.map((text, i) => ({ text, originalIndex: i }));
    }, [question.options]);

    return (
        <div id={`q-${question.id}`} className="mb-8 scroll-mt-24">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 relative">
                {/* Nomor Soal Badge */}
                <div className="absolute -top-3 -left-2 bg-slate-800 text-white text-sm font-bold px-3 py-1 rounded shadow-md border-2 border-white">
                    No. {index + 1}
                </div>

                <div className="mt-2 mb-4">
                    <RenderContent content={question.questionText} />
                    {question.imageUrl && <DataSaverImage src={question.imageUrl} alt="Gambar Soal" />}
                </div>

                {/* Input Area */}
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
                    
                    {/* Simplified Support for other types to save code size */}
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
    
    // Floating Save Indicator
    const [saveStatus, setSaveStatus] = useState<'SAVED' | 'SAVING' | 'PENDING'>('SAVED');

    const endTimeRef = useRef<number>(0);
    
    useEffect(() => {
        const dateStr = exam.config.date.includes('T') ? exam.config.date.split('T')[0] : exam.config.date;
        const startObj = new Date(`${dateStr}T${exam.config.startTime}`);
        endTimeRef.current = startObj.getTime() + (exam.config.timeLimit * 60 * 1000);

        const tick = setInterval(() => {
            const diff = Math.floor((endTimeRef.current - Date.now()) / 1000);
            if (diff <= 0) {
                clearInterval(tick);
                handleSubmit(true);
            } else {
                setTimeLeft(diff);
            }
        }, 1000);

        const netHandler = () => setIsOnline(navigator.onLine);
        window.addEventListener('online', netHandler);
        window.addEventListener('offline', netHandler);

        return () => {
            clearInterval(tick);
            window.removeEventListener('online', netHandler);
            window.removeEventListener('offline', netHandler);
        };
    }, []);

    // Auto Save Logic (Debounced)
    useEffect(() => {
        if(Object.keys(answers).length === 0) return;
        setSaveStatus('PENDING');
        const timer = setTimeout(() => {
            if(onUpdate) {
                setSaveStatus('SAVING');
                onUpdate(answers, timeLeft, undefined, []); // Simple update
                setTimeout(() => setSaveStatus('SAVED'), 800);
            }
        }, 2000);
        return () => clearTimeout(timer);
    }, [answers]);

    const handleAnswer = useCallback((id: string, val: string) => {
        setAnswers(prev => ({ ...prev, [id]: val }));
    }, []);

    const handleSubmit = (auto = false) => {
        if (!auto && !confirm("Kirim jawaban sekarang? Anda tidak bisa mengubahnya lagi.")) return;
        setIsSubmitting(true);
        onSubmit(answers, timeLeft, undefined, []);
    };

    const answeredCount = Object.keys(answers).filter(k => answers[k]).length;
    const totalQ = exam.questions.filter(q => q.questionType !== 'INFO').length;

    return (
        <div className="min-h-screen bg-[#F0F2F5] pb-24 font-sans text-slate-800">
            {/* Header Minimalis */}
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 py-3 shadow-sm flex justify-between items-center">
                <div className="flex flex-col">
                    <h1 className="text-sm font-bold text-slate-800 truncate max-w-[200px]">{exam.config.subject}</h1>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{answeredCount}/{totalQ} Terjawab</span>
                        {saveStatus === 'SAVING' && <span className="text-amber-500 font-medium">Menyimpan...</span>}
                        {saveStatus === 'SAVED' && <span className="text-emerald-500 font-medium">Tersimpan</span>}
                    </div>
                </div>
                
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${timeLeft < 300 ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                    <ClockIcon className="w-4 h-4" />
                    <span className="font-mono font-bold text-sm">{formatTime(timeLeft)}</span>
                </div>
            </div>

            {/* Offline Banner */}
            {!isOnline && (
                <div className="bg-rose-500 text-white text-xs font-bold text-center py-1">
                    Koneksi Terputus - Jawaban Disimpan di Perangkat
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

            {/* Floating Action Bar */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-3 px-6 flex items-center justify-between z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                    {isOnline ? 'Online' : 'Offline Mode'}
                </div>
                <button 
                    onClick={() => handleSubmit(false)}
                    disabled={isSubmitting}
                    className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                    {isSubmitting ? <ArrowPathIcon className="w-4 h-4 animate-spin"/> : <CheckCircleIcon className="w-4 h-4"/>}
                    {isSubmitting ? 'Mengirim...' : 'Selesai'}
                </button>
            </div>
        </div>
    );
};
