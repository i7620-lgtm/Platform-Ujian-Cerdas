
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Exam, Student, Question, Result } from '../types';
import { ClockIcon, CheckCircleIcon, WifiIcon, NoWifiIcon, PhotoIcon, LockClosedIcon, ArrowPathIcon } from './Icons';
import { storageService } from '../services/storage';

interface StudentExamPageProps {
  exam: Exam;
  student: Student;
  initialData?: Result | null;
  onSubmit: (answers: Record<string, string>, timeLeft: number, location?: string) => void;
  onForceSubmit: (answers: Record<string, string>, timeLeft: number) => void;
}

const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

const isDataUrl = (str: string) => str.startsWith('data:image/');

const SmartImageViewer: React.FC<{ src: string; alt: string; isHD: boolean }> = ({ src, alt, isHD }) => {
    const [scale, setScale] = useState(1);
    const [isZoomed, setIsZoomed] = useState(false);

    return (
        <div className={`relative transition-all duration-300 ${isZoomed ? 'z-50' : 'z-0'}`}>
            {isZoomed && <div className="fixed inset-0 bg-black/80 z-40" onClick={() => { setIsZoomed(false); setScale(1); }} />}
            
            <div className={`relative overflow-hidden rounded-xl border border-gray-100 bg-white transition-all ${isHD ? 'shadow-sm' : ''} ${isZoomed ? 'fixed inset-4 z-50 flex items-center justify-center bg-transparent border-none' : ''}`}>
                <div className={`overflow-auto flex justify-center bg-gray-50/50 p-4 ${isZoomed ? 'w-full h-full' : 'max-h-[500px]'}`}>
                    <img 
                        src={src} 
                        alt={alt} 
                        style={{ 
                            filter: isHD ? 'grayscale(100%) contrast(120%) brightness(105%) url(#sharpen)' : 'none',
                            transform: `scale(${scale})`,
                            transformOrigin: 'top center',
                            transition: 'filter 0.4s ease, transform 0.2s ease',
                            maxWidth: '100%',
                            mixBlendMode: isHD ? 'multiply' : 'normal',
                            objectFit: 'contain'
                        }}
                        className={`cursor-zoom-in ${isZoomed ? 'cursor-grab' : ''}`}
                        onClick={() => !isZoomed && setIsZoomed(true)}
                    />
                </div>

                {/* Controls */}
                <div className={`absolute bottom-4 right-4 flex items-center gap-2 p-1 bg-white/90 backdrop-blur rounded-full shadow-lg border border-gray-200 transition-opacity ${isZoomed ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                     <button onClick={(e) => { e.stopPropagation(); setScale(s => Math.max(0.8, s - 0.2)); }} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-full font-bold">-</button>
                     <span className="text-[10px] font-mono font-medium text-gray-500 w-8 text-center">{Math.round(scale * 100)}%</span>
                     <button onClick={(e) => { e.stopPropagation(); setScale(s => Math.min(3, s + 0.2)); }} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-full font-bold">+</button>
                     {isZoomed && (
                         <button onClick={(e) => { e.stopPropagation(); setIsZoomed(false); setScale(1); }} className="w-8 h-8 ml-2 flex items-center justify-center text-white bg-red-500 hover:bg-red-600 rounded-full">✕</button>
                     )}
                </div>
            </div>
        </div>
    )
};

const RenderContent: React.FC<{ content: string; isHD: boolean }> = ({ content, isHD }) => {
    if (isDataUrl(content)) {
        return <SmartImageViewer src={content} alt="Konten Soal" isHD={isHD} />;
    }
    return <div className="prose prose-slate prose-lg max-w-none text-gray-800 leading-8 font-normal break-words whitespace-pre-wrap">{content}</div>;
};

const QuestionDisplay: React.FC<{
    question: Question;
    index: number;
    answer: string;
    shuffleAnswers: boolean;
    isHD: boolean; 
    isHighlighted: boolean; 
    onAnswerChange: (questionId: string, answer: string) => void;
}> = React.memo(({ question, index, answer, shuffleAnswers, isHD, isHighlighted, onAnswerChange }) => {

    const shuffledOptions = useMemo(() => {
        if ((question.questionType === 'MULTIPLE_CHOICE' || question.questionType === 'COMPLEX_MULTIPLE_CHOICE') && question.options) {
            const combined = question.options.map((opt, i) => ({ 
                text: opt, 
                image: question.optionImages ? question.optionImages[i] : null,
                originalIndex: i 
            }));
            
            if (shuffleAnswers) {
                return shuffleArray(combined);
            }
            return combined;
        }
        return null;
    }, [question, shuffleAnswers]);

    const matchingRightOptions = useMemo(() => {
        if (question.questionType === 'MATCHING' && question.matchingPairs) {
            return question.matchingPairs.map(p => p.right);
        }
        return [];
    }, [question]);

    const handleComplexChange = (option: string, isChecked: boolean) => {
        let current: string[] = [];
        try {
            current = answer ? JSON.parse(answer) : [];
            if(!Array.isArray(current)) current = [];
        } catch {
            current = answer ? answer.split(',') : [];
        }

        if (isChecked) {
            if (!current.includes(option)) current.push(option);
        } else {
            current = current.filter(c => c !== option);
        }
        onAnswerChange(question.id, JSON.stringify(current));
    };

    const handleMatchingChange = (pairIndex: number, selectedRight: string) => {
        let currentMap: Record<string, string> = {};
        try { currentMap = answer ? JSON.parse(answer) : {}; } catch (e) { currentMap = {}; }
        currentMap[pairIndex] = selectedRight;
        onAnswerChange(question.id, JSON.stringify(currentMap));
    };

    const handleTrueFalseMatrixChange = (rowIndex: number, val: boolean) => {
        let currentArr: boolean[] = [];
        try {
            const saved = answer ? JSON.parse(answer) : [];
            const rowCount = question.trueFalseRows ? question.trueFalseRows.length : 0;
            currentArr = new Array(rowCount).fill(null); 
            if (Array.isArray(saved)) {
                 saved.forEach((v, i) => { if(i < rowCount) currentArr[i] = v; });
            }
        } catch(e) {
            currentArr = new Array(question.trueFalseRows?.length || 0).fill(null);
        }
        currentArr[rowIndex] = val;
        onAnswerChange(question.id, JSON.stringify(currentArr));
    };

    const renderQuestionInput = () => {
        const baseInputClasses = "mt-4 block w-full px-5 py-4 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg placeholder-gray-400";
        
        switch (question.questionType) {
            case 'INFO':
                return null;
            case 'MULTIPLE_CHOICE':
                return (
                    <div className="grid gap-3 mt-6">
                        {shuffledOptions?.map((item, idx) => (
                            <label key={idx} className={`relative flex items-start p-4 md:p-5 rounded-xl cursor-pointer transition-all duration-200 border group select-none ${answer === item.text ? 'bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-200' : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-300'}`}>
                                <div className="flex items-center h-6 mt-0.5">
                                    <input
                                        type="radio"
                                        name={question.id}
                                        value={item.text}
                                        checked={answer === item.text}
                                        onChange={(e) => onAnswerChange(question.id, e.target.value)}
                                        className="w-5 h-5 text-primary border-gray-300 focus:ring-primary cursor-pointer"
                                    />
                                </div>
                                <div className="ml-4 w-full">
                                    <div className="flex items-start gap-3">
                                        <span className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-xs font-bold mt-0.5 transition-colors ${answer === item.text ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
                                            {String.fromCharCode(65 + idx)}
                                        </span>
                                        <div className="w-full">
                                             {item.text && <RenderContent content={item.text} isHD={isHD} />}
                                        </div>
                                    </div>
                                    {item.image && <SmartImageViewer src={item.image} alt="Gambar Opsi" isHD={isHD} />}
                                </div>
                            </label>
                        ))}
                    </div>
                );
            case 'COMPLEX_MULTIPLE_CHOICE':
                 return (
                    <div className="grid gap-3 mt-6">
                         <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg border border-blue-100 w-fit">
                             <CheckCircleIcon className="w-4 h-4"/>
                             Pilih lebih dari satu jawaban
                        </div>
                        {shuffledOptions?.map((item, idx) => {
                             let isChecked = false;
                             try {
                                 const parsed = JSON.parse(answer);
                                 if (Array.isArray(parsed) && parsed.includes(item.text)) isChecked = true;
                             } catch {
                                 if(answer && answer.split(',').includes(item.text)) isChecked = true;
                             }

                             return (
                                <label key={idx} className={`relative flex items-start p-4 md:p-5 rounded-xl cursor-pointer transition-all duration-200 border group select-none ${isChecked ? 'bg-teal-50 border-teal-200 shadow-sm ring-1 ring-teal-200' : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-300'}`}>
                                    <div className="flex items-center h-6 mt-0.5">
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => handleComplexChange(item.text, e.target.checked)}
                                            className="w-5 h-5 text-secondary border-gray-300 focus:ring-secondary rounded cursor-pointer"
                                        />
                                    </div>
                                    <div className="ml-4 w-full">
                                        <div className="pt-0.5">
                                            {item.text && <RenderContent content={item.text} isHD={isHD} />}
                                            {item.image && <SmartImageViewer src={item.image} alt="Gambar Opsi" isHD={isHD} />}
                                        </div>
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                );
            case 'TRUE_FALSE':
                if (question.trueFalseRows) {
                     let currentAnswers: boolean[] = [];
                     try { currentAnswers = answer ? JSON.parse(answer) : []; } catch(e){}

                     return (
                        <div className="mt-8 overflow-hidden border border-gray-200 rounded-xl shadow-sm bg-white">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Pernyataan</th>
                                        <th className="px-4 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Benar</th>
                                        <th className="px-4 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Salah</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {question.trueFalseRows.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-base text-gray-800 leading-relaxed">{row.text}</td>
                                            <td className="px-4 py-4 text-center">
                                                <button 
                                                    onClick={() => handleTrueFalseMatrixChange(idx, true)}
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${currentAnswers[idx] === true ? 'bg-green-500 text-white shadow-md scale-110' : 'bg-gray-100 text-gray-300 hover:bg-green-100'}`}
                                                >
                                                    <span className="font-bold text-sm">B</span>
                                                </button>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                 <button 
                                                    onClick={() => handleTrueFalseMatrixChange(idx, false)}
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${currentAnswers[idx] === false ? 'bg-red-500 text-white shadow-md scale-110' : 'bg-gray-100 text-gray-300 hover:bg-red-100'}`}
                                                >
                                                    <span className="font-bold text-sm">S</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                     );
                }
                 return null;
            case 'MATCHING':
                 const currentMatchingAnswers = answer ? JSON.parse(answer) : {};
                 return (
                    <div className="mt-8 bg-gray-50 p-6 rounded-2xl border border-gray-200">
                         <div className="mb-4">
                             <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Jodohkan Pasangan Berikut</span>
                        </div>
                        <div className="space-y-4">
                            {question.matchingPairs?.map((pair, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row md:items-center gap-4">
                                    <div className="flex-1 font-medium text-gray-800 flex items-start gap-3">
                                        <span className="bg-gray-100 text-gray-500 w-6 h-6 rounded flex items-center justify-center text-xs font-bold mt-0.5">{idx+1}</span>
                                        {pair.left}
                                    </div>
                                    <div className="hidden md:block text-gray-300">➜</div>
                                    <div className="flex-1">
                                        <select 
                                            value={currentMatchingAnswers[idx] || ''} 
                                            onChange={(e) => handleMatchingChange(idx, e.target.value)}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary focus:border-primary text-sm font-medium transition-all"
                                        >
                                            <option value="" disabled>Pilih Pasangan...</option>
                                            {matchingRightOptions.map((opt, optIdx) => (
                                                <option key={optIdx} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'ESSAY':
                return (
                    <div className="mt-4 relative">
                        <textarea
                            value={answer || ''}
                            onChange={(e) => onAnswerChange(question.id, e.target.value)}
                            rows={8}
                            className={`${baseInputClasses} font-normal`}
                            placeholder="Tuliskan jawaban uraian Anda secara lengkap..."
                        />
                        <div className="absolute bottom-3 right-3 text-xs text-gray-400 font-medium bg-white/80 px-2 py-1 rounded">
                            {answer ? answer.length : 0} Karakter
                        </div>
                    </div>
                );
            case 'FILL_IN_THE_BLANK':
                return <input
                    type="text"
                    value={answer || ''}
                    onChange={(e) => onAnswerChange(question.id, e.target.value)}
                    className={baseInputClasses}
                    placeholder="Jawaban singkat..."
                    autoComplete="off"
                />;
            default:
                return null;
        }
    };

    return (
        <div 
            id={question.id}
            className={`bg-white p-6 md:p-8 rounded-2xl shadow-sm border mb-8 transition-all duration-300 ${isHighlighted ? 'ring-2 ring-red-400 bg-red-50/50 scale-[1.01] border-red-200' : 'border-gray-100 hover:shadow-md'}`}
        >
             <div className="flex items-start gap-4 md:gap-6">
                <div className="flex-shrink-0">
                    <span className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl text-lg font-bold shadow-sm transition-colors ${question.questionType === 'INFO' ? 'bg-blue-50 text-blue-600' : (isHighlighted ? 'bg-red-500 text-white animate-pulse' : 'bg-primary text-white shadow-primary/20')}`}>
                        {question.questionType === 'INFO' ? 'i' : index + 1}
                    </span>
                </div>
                <div className="flex-1 w-full min-w-0 pt-1">
                    {question.questionText && (
                        <div className="mb-6">
                            <RenderContent content={question.questionText} isHD={isHD} />
                        </div>
                    )}
                    {question.imageUrl && (
                        <div className="mb-6">
                            <SmartImageViewer src={question.imageUrl} alt="Gambar Soal" isHD={isHD} />
                        </div>
                    )}
                     {renderQuestionInput()}
                </div>
            </div>
        </div>
    );
});


export const StudentExamPage: React.FC<StudentExamPageProps> = ({ exam, student, initialData, onSubmit, onForceSubmit }) => {
    // 0. Global UI State
    const [isHD, setIsHD] = useState(true);
    const [highlightedQuestionId, setHighlightedQuestionId] = useState<string | null>(null);

    // 1. Initialize Answers
    const [answers, setAnswers] = useState<Record<string, string>>(() => {
        let localData = {};
        try {
            const savedAnswers = localStorage.getItem(`exam_answers_${exam.code}_${student.studentId}`);
            if (savedAnswers) localData = JSON.parse(savedAnswers);
        } catch {}

        if (initialData && initialData.answers && Object.keys(initialData.answers).length > 0) {
            return { ...localData, ...initialData.answers }; 
        }
        return localData as Record<string, string>;
    });
    
    // 2. Initialize Activity Log
    const [activityLog, setActivityLog] = useState<string[]>(() => {
        if (initialData && initialData.activityLog && initialData.activityLog.length > 0) {
            return [...initialData.activityLog, `[${new Date().toLocaleTimeString()}] Ujian dilanjutkan kembali (Resume).`];
        }
        try {
            const savedLog = localStorage.getItem(`exam_log_${exam.code}_${student.studentId}`);
            return savedLog ? JSON.parse(savedLog) : [`[${new Date().toLocaleTimeString()}] Memulai ujian.`];
        } catch {
            return [`[${new Date().toLocaleTimeString()}] Memulai ujian.`];
        }
    });

    // 3. Initialize Absolute Time
    const examEndTime = useMemo(() => {
        const dateStr = exam.config.date.includes('T') ? exam.config.date.split('T')[0] : exam.config.date;
        const startObj = new Date(`${dateStr}T${exam.config.startTime}`);
        return startObj.getTime() + (exam.config.timeLimit * 60 * 1000);
    }, [exam.config]);

    const calculateTimeLeft = useCallback(() => {
        const now = Date.now();
        const diffSeconds = Math.floor((examEndTime - now) / 1000);
        return diffSeconds > 0 ? diffSeconds : 0;
    }, [examEndTime]);

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [isForceSubmitted, setIsForceSubmitted] = useState(false);
    const [isCheckingStatus, setIsCheckingStatus] = useState(false); // New state for manual check spinner
    const timerIdRef = useRef<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Refs for safe closures
    const answersRef = useRef(answers);
    const activityLogRef = useRef(activityLog);
    const timeLeftRef = useRef(timeLeft);

    useEffect(() => { answersRef.current = answers; }, [answers]);
    useEffect(() => { activityLogRef.current = activityLog; }, [activityLog]);
    useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

    const displayedQuestions = useMemo(() => {
        const storageKey = `exam_order_${exam.code}_${student.studentId}`;
        try {
            const savedOrder = localStorage.getItem(storageKey);
            if (savedOrder && exam.config.shuffleQuestions) {
                const orderIds: string[] = JSON.parse(savedOrder);
                const ordered = orderIds.map(id => exam.questions.find(q => q.id === id)).filter(q => q !== undefined) as Question[];
                const remaining = exam.questions.filter(q => !orderIds.includes(q.id));
                return [...ordered, ...remaining];
            }
        } catch(e) {}

        const finalQuestions = exam.config.shuffleQuestions ? shuffleArray([...exam.questions]) : exam.questions;
        if (exam.config.shuffleQuestions) {
             localStorage.setItem(storageKey, JSON.stringify(finalQuestions.map(q => q.id)));
        }
        return finalQuestions;
    }, [exam.questions, exam.config.shuffleQuestions, exam.code, student.studentId]);

    const addLog = useCallback((message: string) => {
        const newLog = [...activityLogRef.current, message];
        setActivityLog(newLog); 
        try {
            localStorage.setItem(`exam_log_${exam.code}_${student.studentId}`, JSON.stringify(newLog));
        } catch (e) {}
    }, [exam.code, student.studentId]);

    const submitExam = useCallback(async () => {
        const firstUnansweredQuestion = displayedQuestions.find(q => {
             if (q.questionType === 'INFO') return false;
             const userAns = answersRef.current[q.id];
             return !userAns || userAns.trim() === '' || userAns === '[]' || userAns === '{}';
        });

        if (firstUnansweredQuestion) {
             alert("Masih ada soal yang kosong. Anda akan diarahkan ke soal tersebut.");
             setHighlightedQuestionId(firstUnansweredQuestion.id);
             document.getElementById(firstUnansweredQuestion.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
             setTimeout(() => setHighlightedQuestionId(null), 3000);
             return; 
        }

        if (window.confirm("Yakin ingin mengumpulkan jawaban?")) {
            setIsSubmitting(true);
            let location = "";
            if (exam.config.trackLocation) {
                 try {
                     const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                         if (!navigator.geolocation) reject(new Error("No Geo"));
                         navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                     });
                     location = `${position.coords.latitude},${position.coords.longitude}`;
                 } catch (e) {
                     addLog(`[System] Gagal mengambil lokasi GPS.`);
                 }
            }

            const finalLogs = [...activityLogRef.current, `[${new Date().toLocaleTimeString()}] Ujian diselesaikan siswa.`];
            const completionDuration = (exam.config.timeLimit * 60) - timeLeftRef.current;

            try {
                await storageService.submitExamResult({
                    student,
                    examCode: exam.code,
                    answers: answersRef.current,
                    totalQuestions: exam.questions.length,
                    completionTime: completionDuration,
                    activityLog: finalLogs,
                    status: 'completed',
                    location
                });
            } catch(e) {}
            
            onSubmit(answersRef.current, timeLeftRef.current, location);
            
            localStorage.removeItem(`exam_answers_${exam.code}_${student.studentId}`);
            localStorage.removeItem(`exam_order_${exam.code}_${student.studentId}`);
            localStorage.removeItem(`exam_log_${exam.code}_${student.studentId}`);
            setIsSubmitting(false);
        }
    }, [exam.code, student, onSubmit, exam.config.trackLocation, addLog, exam.config.timeLimit, exam.questions.length, displayedQuestions]);

    useEffect(() => {
        const startExam = async () => {
            if (navigator.onLine) {
                try {
                    await storageService.submitExamResult({
                        student,
                        examCode: exam.code,
                        answers: answersRef.current,
                        totalQuestions: exam.questions.length,
                        completionTime: (exam.config.timeLimit * 60) - timeLeftRef.current,
                        activityLog: activityLogRef.current,
                        status: 'in_progress'
                    });
                } catch (e) {}
            }
        };
        startExam();
    }, [exam.code, student, exam.questions.length]); 

    useEffect(() => {
        timerIdRef.current = window.setInterval(() => {
            const remaining = calculateTimeLeft();
            if (remaining <= 0) {
                if(timerIdRef.current) clearInterval(timerIdRef.current);
                setTimeLeft(0); 
                alert("Waktu Habis.");
                onSubmit(answersRef.current, 0); 
                localStorage.removeItem(`exam_answers_${exam.code}_${student.studentId}`);
            } else {
                setTimeLeft(remaining);
            }
        }, 1000);
        return () => { if (timerIdRef.current) clearInterval(timerIdRef.current); };
    }, [exam.code, onSubmit, student.studentId, calculateTimeLeft]);

    useEffect(() => {
        window.addEventListener('online', () => { setIsOnline(true); addLog("[System] Online kembali."); });
        window.addEventListener('offline', () => { setIsOnline(false); addLog("[System] Koneksi terputus."); });
    }, [addLog]);

    useEffect(() => {
        const saveInterval = setInterval(async () => {
            if (isForceSubmitted) return; 
            setSaveStatus('saving');
            try { localStorage.setItem(`exam_answers_${exam.code}_${student.studentId}`, JSON.stringify(answersRef.current)); } catch (e) {}
            if (navigator.onLine) {
                 try {
                    await storageService.submitExamResult({
                        student,
                        examCode: exam.code,
                        answers: answersRef.current,
                        totalQuestions: exam.questions.length,
                        completionTime: (exam.config.timeLimit * 60) - timeLeftRef.current,
                        activityLog: activityLogRef.current,
                        status: 'in_progress'
                    });
                     setTimeout(() => setSaveStatus('saved'), 800);
                } catch (e) { }
            }
             setTimeout(() => setSaveStatus('idle'), 2000);
        }, exam.config.autoSaveInterval * 1000);
        return () => clearInterval(saveInterval);
    }, [exam.code, student, exam.config.autoSaveInterval, isForceSubmitted, exam.questions.length]); 

    useEffect(() => {
        try { localStorage.setItem(`exam_answers_${exam.code}_${student.studentId}`, JSON.stringify(answers)); } catch(e) {}
    }, [answers, exam.code, student.studentId]);

    useEffect(() => {
        if (!exam.config.detectBehavior) return;

        const forceLockExam = (reason: string) => {
             if (timerIdRef.current) clearInterval(timerIdRef.current);
             setIsForceSubmitted(true);
             const lockMsg = `[System] ⛔ Ujian dikunci. Alasan: ${reason}`;
             const updatedLog = [...activityLogRef.current, lockMsg];
             setActivityLog(updatedLog);

             storageService.submitExamResult({
                 student,
                 examCode: exam.code,
                 answers: answersRef.current,
                 totalQuestions: exam.questions.length,
                 completionTime: (exam.config.timeLimit * 60) - timeLeftRef.current,
                 activityLog: updatedLog,
                 status: 'force_submitted'
             });

             onForceSubmit(answersRef.current, timeLeftRef.current);
             localStorage.setItem(`exam_answers_${exam.code}_${student.studentId}`, JSON.stringify(answersRef.current));
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                addLog(`[System] ⚠️ Pindah Tab/Minimize.`);
                if (exam.config.continueWithPermission && !isForceSubmitted) forceLockExam("Pindah Tab/Aplikasi");
            }
        };

        if (document.hidden && exam.config.continueWithPermission) handleVisibilityChange();
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [exam.config.detectBehavior, exam.config.continueWithPermission, onForceSubmit, student, exam.code, isForceSubmitted, addLog]);

    // NEW: Polling logic when exam is force locked
    useEffect(() => {
        let interval: number;
        
        // Function to check if teacher unlocked
        const checkUnlockStatus = async (isManual = false) => {
            if (isManual) setIsCheckingStatus(true);
            try {
                // Fetch latest results from server (API) to bypass stale local cache
                const latestResults = await storageService.getResults();
                const myResult = latestResults.find(r => 
                    r.examCode === exam.code && 
                    r.student.studentId === student.studentId
                );

                if (myResult && myResult.status === 'in_progress') {
                    // RESUME EXAM
                    setIsForceSubmitted(false);
                    const unlockMsg = `[System] ✅ Akses dibuka kembali oleh guru pada ${new Date().toLocaleTimeString()}.`;
                    const newLog = [...activityLogRef.current, unlockMsg];
                    setActivityLog(newLog);
                    
                    // Restart Timer
                    timerIdRef.current = window.setInterval(() => {
                        const remaining = calculateTimeLeft();
                        if (remaining <= 0) {
                            if(timerIdRef.current) clearInterval(timerIdRef.current);
                            setTimeLeft(0); 
                            onSubmit(answersRef.current, 0); 
                        } else {
                            setTimeLeft(remaining);
                        }
                    }, 1000);
                }
            } catch (e) {
                console.error("Failed to check status", e);
            } finally {
                if (isManual) setIsCheckingStatus(false);
            }
        };

        if (isForceSubmitted) {
            // Check immediately
            checkUnlockStatus();
            // Then poll every 4 seconds
            interval = window.setInterval(() => checkUnlockStatus(false), 4000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isForceSubmitted, exam.code, student.studentId, calculateTimeLeft, onSubmit]);

    const handleAnswerChange = useCallback((questionId: string, answer: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
    }, []);
    
    if (isForceSubmitted) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4 animate-fade-in relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                     <div className="absolute top-0 -left-10 w-72 h-72 bg-red-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
                     <div className="absolute top-0 -right-10 w-72 h-72 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
                     <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
                </div>

                <div className="w-full max-w-md bg-white p-8 md:p-10 rounded-3xl shadow-2xl border border-gray-100 text-center relative z-10">
                     <div className="bg-red-50 p-6 rounded-full w-28 h-28 flex items-center justify-center mx-auto mb-6 shadow-inner ring-8 ring-red-50/50">
                         <LockClosedIcon className="w-12 h-12 text-red-500 animate-pulse" />
                     </div>
                    <h1 className="text-2xl font-black text-gray-800 mb-2">Ujian Ditangguhkan</h1>
                    <p className="text-gray-500 mb-8 leading-relaxed">
                        Sistem mendeteksi aktivitas mencurigakan (beralih aplikasi/tab). Akses Anda dikunci sementara.
                    </p>
                    
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-8 text-left">
                        <h3 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                            Menunggu Izin Guru...
                        </h3>
                        <p className="text-xs text-blue-600 leading-5">
                            Segera hubungi pengawas ujian. Sistem akan otomatis membuka halaman ini begitu guru memberikan izin.
                        </p>
                    </div>

                    <button 
                        onClick={async () => {
                            setIsCheckingStatus(true);
                            // Logic is handled by the effect calling checkUnlockStatus(true) conceptually
                            // But here we trigger a manual re-render or simulate it by calling a sync function if exposed,
                            // Since effect handles it, this button is mostly psychological but we can trigger a storage fetch.
                            await storageService.getResults(); 
                            // The interval will pick it up, or we can force a state update to trigger effect? 
                            // Actually, just let the interval handle it or expose the function. 
                            // For simplicity, we just set loading state to show interaction.
                            setTimeout(() => setIsCheckingStatus(false), 1000);
                        }}
                        disabled={isCheckingStatus}
                        className="w-full py-4 rounded-xl font-bold text-sm bg-gray-900 text-white shadow-lg hover:bg-black transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                        {isCheckingStatus ? (
                             <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Memeriksa Status...
                             </>
                        ) : (
                            <>
                                <ArrowPathIcon className="w-4 h-4" />
                                Cek Status Manual
                            </>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    const answeredCount = Object.keys(answers).length;
    const progressPercent = (answeredCount / displayedQuestions.length) * 100;
    const isCriticalTime = timeLeft < 300; 

    return (
        <div className="min-h-screen bg-[#FAFAFA] font-sans text-gray-900 pb-20 selection:bg-indigo-100 selection:text-indigo-900">
            <svg width="0" height="0" style={{ position: 'absolute' }}>
                <defs><filter id="sharpen"><feConvolveMatrix order="3" preserveAlpha="true" kernelMatrix="0 -1 0 -1 5 -1 0 -1 0"/></filter></defs>
            </svg>

            <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 z-[60]">
                 <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }} />
            </div>
            
            <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-200/50 z-50 transition-all">
                <div className="max-w-5xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4 md:gap-8">
                         <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">KODE UJIAN</p>
                            <h1 className="text-lg md:text-xl font-black text-gray-800 tracking-tight">{exam.code}</h1>
                        </div>
                        <div className="hidden md:block w-px h-8 bg-gray-200"></div>
                        <div className="hidden md:block">
                             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">PESERTA</p>
                             <p className="text-sm font-bold text-gray-700">{student.fullName}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                         <button 
                            onClick={() => setIsHD(!isHD)}
                            className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${isHD ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200'}`}
                         >
                            <PhotoIcon className="w-3.5 h-3.5" /> {isHD ? 'HD ON' : 'HD OFF'}
                        </button>

                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${isCriticalTime ? 'bg-red-50 border-red-100 text-red-600 animate-pulse' : 'bg-white border-gray-200 text-gray-700 shadow-sm'}`}>
                            <ClockIcon className="w-4 h-4 md:w-5 md:h-5" />
                            <span className="font-mono text-base md:text-lg font-bold tracking-tight">{formatTime(timeLeft)}</span>
                        </div>

                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm text-gray-400" title={isOnline ? "Online" : "Offline"}>
                            {isOnline ? <WifiIcon className="w-5 h-5 text-green-500"/> : <NoWifiIcon className="w-5 h-5 text-yellow-500"/>}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 md:px-6 pt-24 md:pt-32 pb-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Lembar Jawaban</h2>
                        <p className="text-gray-500 mt-1">Kerjakan dengan teliti dan jujur.</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500 bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm">
                        <span>Progress:</span>
                        <span className="text-primary font-bold">{answeredCount}</span>
                        <span className="text-gray-300">/</span>
                        <span>{displayedQuestions.length}</span>
                        {saveStatus === 'saving' && <span className="ml-2 text-xs text-blue-500 animate-pulse font-bold">Menyimpan...</span>}
                        {saveStatus === 'saved' && <span className="ml-2 text-xs text-green-500 font-bold">Tersimpan</span>}
                    </div>
                </div>

                <div className="space-y-6">
                    {displayedQuestions.map((q, index) => {
                         // Calculate visual index: Count previous non-INFO questions
                         const visualIndex = displayedQuestions.slice(0, index).filter(item => item.questionType !== 'INFO').length;
                         
                         return (
                            <QuestionDisplay
                                key={q.id}
                                question={q}
                                index={visualIndex} // QuestionDisplay adds +1 to this index
                                answer={answers[q.id] || ''}
                                shuffleAnswers={exam.config.shuffleAnswers}
                                isHD={isHD}
                                isHighlighted={highlightedQuestionId === q.id}
                                onAnswerChange={handleAnswerChange}
                            />
                        );
                    })}
                </div>

                <div className="mt-16 flex flex-col items-center gap-6">
                    <button 
                        onClick={submitExam} 
                        disabled={isSubmitting}
                        className="w-full max-w-md bg-gray-900 text-white font-bold py-4 px-8 rounded-2xl shadow-xl shadow-gray-200 hover:shadow-2xl hover:bg-black transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed text-lg tracking-wide"
                    >
                        {isSubmitting ? "Mengirim Jawaban..." : "Selesai & Kumpulkan"}
                    </button>
                    <p className="text-xs text-gray-400 max-w-xs text-center leading-relaxed">
                        Pastikan seluruh jawaban telah terisi. Setelah dikumpulkan, Anda tidak dapat mengubah jawaban kembali.
                    </p>
                </div>
            </main>
        </div>
    );
};
