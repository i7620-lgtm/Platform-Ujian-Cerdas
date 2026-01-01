

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Exam, Student, Question } from '../types';
import { ClockIcon, CheckCircleIcon, WifiIcon, NoWifiIcon } from './Icons';
import { storageService } from '../services/storage';

interface StudentExamPageProps {
  exam: Exam;
  student: Student;
  onSubmit: (answers: Record<string, string>, timeLeft: number, location?: string) => void;
  onForceSubmit: (answers: Record<string, string>, timeLeft: number) => void;
}

const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Fisher-Yates shuffle algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

const isDataUrl = (str: string) => str.startsWith('data:image/');

// --- ADVANCED IMAGE ENHANCER COMPONENT ---
// Menggunakan teknik SVG Filter untuk menajamkan gambar yang terkompresi
const SmartImageViewer: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
    // Mode "HD" menggunakan kombinasi filter kontras tinggi dan unsharp masking (SVG)
    // untuk mensimulasikan restorasi resolusi.
    const [isHD, setIsHD] = useState(true); 
    const [scale, setScale] = useState(1);

    return (
        <div className="space-y-3 mt-3">
             {/* Hidden SVG Filter Definition for Sharpening */}
             <svg width="0" height="0" style={{ position: 'absolute' }}>
                <defs>
                    <filter id="sharpen">
                        {/* Convolve Matrix untuk deteksi tepi dan penajaman */}
                        <feConvolveMatrix 
                            order="3" 
                            preserveAlpha="true" 
                            kernelMatrix="0 -1 0 -1 5 -1 0 -1 0"
                        />
                    </filter>
                </defs>
            </svg>

            <div className={`relative overflow-hidden rounded-xl border border-gray-100 bg-white transition-all ${isHD ? 'shadow-sm' : ''}`}>
                <div className="overflow-auto flex justify-center bg-gray-50/30 p-2" style={{ maxHeight: '600px' }}>
                    <img 
                        src={src} 
                        alt={alt} 
                        style={{ 
                            // Magic Filter: 
                            // 1. Grayscale: menghilangkan noise warna (chroma subsampling artifacts)
                            // 2. Contrast & Brightness: membuat teks hitam lebih pekat, background putih lebih bersih
                            // 3. url(#sharpen): Memakai SVG filter untuk menajamkan tepi huruf
                            filter: isHD ? 'grayscale(100%) contrast(120%) brightness(105%) url(#sharpen)' : 'none',
                            transform: `scale(${scale})`,
                            transformOrigin: 'top center',
                            transition: 'filter 0.4s ease, transform 0.2s ease',
                            maxWidth: '100%',
                            mixBlendMode: isHD ? 'multiply' : 'normal' // Membuat background putih gambar menyatu
                        }}
                        className="object-contain" 
                    />
                </div>
                
                {/* Minimalist Floating Controls */}
                <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-white/90 backdrop-blur shadow-sm p-1.5 rounded-full border border-gray-200 opacity-0 hover:opacity-100 transition-opacity z-10">
                     <button onClick={() => setScale(s => Math.max(0.8, s - 0.2))} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-primary hover:bg-gray-50 rounded-full font-bold text-lg" title="Zoom Out">-</button>
                     <span className="text-[10px] font-mono w-8 text-center text-gray-500">{Math.round(scale * 100)}%</span>
                     <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-primary hover:bg-gray-50 rounded-full font-bold text-lg" title="Zoom In">+</button>
                </div>
            </div>

            <div className="flex justify-start">
                 <button 
                    onClick={() => setIsHD(!isHD)}
                    className={`text-xs px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${isHD ? 'bg-neutral text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                 >
                    {isHD ? (
                        <>
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                            <span>Mode Teks Tajam (HD)</span>
                        </>
                    ) : (
                        <>
                            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                            <span>Mode Asli</span>
                        </>
                    )}
                 </button>
            </div>
        </div>
    )
};


const RenderContent: React.FC<{ content: string }> = ({ content }) => {
    if (isDataUrl(content)) {
        return <SmartImageViewer src={content} alt="Konten Soal" />;
    }
    return <div className="prose prose-lg max-w-none text-gray-800 leading-relaxed break-words whitespace-pre-wrap font-sans">{content}</div>;
};

const QuestionDisplay: React.FC<{
    question: Question;
    index: number;
    answer: string;
    shuffleAnswers: boolean;
    onAnswerChange: (questionId: string, answer: string) => void;
}> = React.memo(({ question, index, answer, shuffleAnswers, onAnswerChange }) => {

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

    // Matching: Right side options should be shuffled
    const matchingRightOptions = useMemo(() => {
        if (question.questionType === 'MATCHING' && question.matchingPairs) {
            const rights = question.matchingPairs.map(p => p.right);
            return shuffleArray(rights);
        }
        return [];
    }, [question]);

    const handleComplexChange = (option: string, isChecked: boolean) => {
        let current = answer ? answer.split(',') : [];
        if (isChecked) {
            if (!current.includes(option)) current.push(option);
        } else {
            current = current.filter(c => c !== option);
        }
        onAnswerChange(question.id, current.join(','));
    };

    const handleMatchingChange = (pairIndex: number, selectedRight: string) => {
        let currentMap: Record<string, string> = {};
        try {
            currentMap = answer ? JSON.parse(answer) : {};
        } catch (e) { currentMap = {}; }
        
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
        const baseInputClasses = "mt-4 block w-full px-5 py-4 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg";
        
        switch (question.questionType) {
            case 'INFO':
                return null;
            case 'MULTIPLE_CHOICE':
                return (
                    <div className="grid gap-4 mt-8">
                        {shuffledOptions?.map((item, idx) => (
                            <label key={idx} className={`relative flex items-start p-5 border-2 rounded-2xl cursor-pointer transition-all duration-300 group ${answer === item.text ? 'bg-primary/5 border-primary shadow-md transform scale-[1.01]' : 'bg-white border-transparent hover:border-gray-200 hover:bg-gray-50 shadow-sm'}`}>
                                <div className="flex items-center h-6 mt-1">
                                    <input
                                        type="radio"
                                        name={question.id}
                                        value={item.text}
                                        checked={answer === item.text}
                                        onChange={(e) => onAnswerChange(question.id, e.target.value)}
                                        className="h-5 w-5 text-primary border-gray-300 focus:ring-primary cursor-pointer accent-primary"
                                    />
                                </div>
                                <div className="ml-5 text-gray-700 w-full select-none">
                                    <div className="flex items-start gap-4">
                                        <span className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold mt-0.5 transition-colors ${answer === item.text ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
                                            {String.fromCharCode(65 + idx)}
                                        </span>
                                        <div className="w-full pt-1">
                                             {item.text && <RenderContent content={item.text} />}
                                        </div>
                                    </div>
                                    {item.image && <SmartImageViewer src={item.image} alt="Gambar Opsi" />}
                                </div>
                            </label>
                        ))}
                    </div>
                );
            case 'TRUE_FALSE':
                if (question.trueFalseRows) {
                     let currentAnswers: boolean[] = [];
                     try { currentAnswers = answer ? JSON.parse(answer) : []; } catch(e){}

                     return (
                        <div className="mt-8 overflow-hidden border border-gray-100 rounded-2xl shadow-sm bg-white">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Pernyataan</th>
                                        <th className="px-4 py-5 text-center text-xs font-bold text-green-600 uppercase tracking-wider w-28 bg-green-50/50">Benar</th>
                                        <th className="px-4 py-5 text-center text-xs font-bold text-red-600 uppercase tracking-wider w-28 bg-red-50/50">Salah</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {question.trueFalseRows.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-5 text-base text-gray-800 font-medium leading-relaxed">{row.text}</td>
                                            <td className="px-4 py-5 text-center cursor-pointer hover:bg-green-50/30" onClick={() => handleTrueFalseMatrixChange(idx, true)}>
                                                <div className="flex justify-center">
                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${currentAnswers[idx] === true ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                                                        {currentAnswers[idx] === true && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-5 text-center cursor-pointer hover:bg-red-50/30" onClick={() => handleTrueFalseMatrixChange(idx, false)}>
                                                 <div className="flex justify-center">
                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${currentAnswers[idx] === false ? 'border-red-500 bg-red-500' : 'border-gray-300'}`}>
                                                        {currentAnswers[idx] === false && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                     );
                }
                 return null;
            case 'COMPLEX_MULTIPLE_CHOICE':
                 return (
                    <div className="grid gap-4 mt-8">
                        <div className="flex items-center gap-3 mb-2 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                             <div className="bg-blue-100 p-1.5 rounded-md"><CheckCircleIcon className="w-5 h-5 text-blue-600"/></div>
                             <span className="text-sm text-blue-800 font-medium">Pilih satu atau lebih jawaban yang menurut Anda benar.</span>
                        </div>
                        {shuffledOptions?.map((item, idx) => {
                             const isChecked = answer ? answer.split(',').includes(item.text) : false;
                             return (
                                <label key={idx} className={`relative flex items-start p-5 border-2 rounded-2xl cursor-pointer transition-all duration-300 group ${isChecked ? 'bg-secondary/5 border-secondary shadow-md transform scale-[1.01]' : 'bg-white border-transparent hover:border-gray-200 hover:bg-gray-50 shadow-sm'}`}>
                                    <div className="flex items-center h-6 mt-1">
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => handleComplexChange(item.text, e.target.checked)}
                                            className="h-5 w-5 text-secondary border-gray-300 focus:ring-secondary rounded accent-secondary cursor-pointer"
                                        />
                                    </div>
                                    <div className="ml-5 text-gray-700 w-full select-none">
                                        <div className="pt-1">
                                            {item.text && <RenderContent content={item.text} />}
                                            {item.image && <SmartImageViewer src={item.image} alt="Gambar Opsi" />}
                                        </div>
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                );
            case 'MATCHING':
                 const currentMatchingAnswers = answer ? JSON.parse(answer) : {};
                 return (
                    <div className="mt-8 bg-gray-50/80 p-6 md:p-8 rounded-2xl border border-gray-200/60 backdrop-blur-sm">
                         <div className="flex items-center gap-2 mb-6">
                             <span className="text-sm font-bold bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg">Soal Menjodohkan</span>
                        </div>
                        <div className="space-y-6">
                            {question.matchingPairs?.map((pair, idx) => (
                                <div key={idx} className="relative">
                                    <div className="flex flex-col md:flex-row md:items-stretch gap-0 rounded-xl overflow-hidden shadow-sm border border-gray-200">
                                        {/* Left Side */}
                                        <div className="flex-1 bg-white p-5 flex items-center">
                                             <div className="flex items-start gap-4 w-full">
                                                <span className="flex-shrink-0 w-6 h-6 bg-gray-100 text-gray-500 rounded flex items-center justify-center text-xs font-bold mt-0.5">{idx + 1}</span>
                                                <div className="text-gray-800 font-medium">{pair.left}</div>
                                             </div>
                                        </div>
                                        
                                        {/* Connector (Desktop) */}
                                        <div className="hidden md:flex items-center justify-center w-12 bg-gray-50 border-x border-gray-100">
                                            <div className="w-full h-px bg-gray-300"></div>
                                        </div>

                                        {/* Right Side (Select) */}
                                        <div className="flex-1 bg-gray-50 p-4 flex items-center">
                                            <select 
                                                value={currentMatchingAnswers[idx] || ''} 
                                                onChange={(e) => handleMatchingChange(idx, e.target.value)}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-base font-medium transition-shadow cursor-pointer hover:border-purple-300"
                                            >
                                                <option value="" disabled className="text-gray-400">-- Pilih Pasangan --</option>
                                                {matchingRightOptions.map((opt, optIdx) => (
                                                    <option key={optIdx} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'ESSAY':
                return <textarea
                    value={answer || ''}
                    onChange={(e) => onAnswerChange(question.id, e.target.value)}
                    rows={8}
                    className={baseInputClasses}
                    placeholder="Ketik jawaban uraian Anda di sini..."
                />;
            case 'FILL_IN_THE_BLANK':
                return <input
                    type="text"
                    value={answer || ''}
                    onChange={(e) => onAnswerChange(question.id, e.target.value)}
                    className={baseInputClasses}
                    placeholder="Ketik jawaban singkat..."
                    autoComplete="off"
                />;
            default:
                return null;
        }
    };

    return (
        <div className="bg-white p-6 md:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 mb-10 transition-transform hover:translate-y-[-2px] duration-500 ease-out">
             <div className="flex items-start gap-5">
                <div className="flex-shrink-0 mt-1">
                    <span className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-2xl text-lg md:text-xl font-bold shadow-sm ${question.questionType === 'INFO' ? 'bg-blue-50 text-blue-600' : 'bg-primary text-white shadow-primary/30 shadow-lg'}`}>
                        {question.questionType === 'INFO' ? 'i' : index + 1}
                    </span>
                </div>
                <div className="flex-1 w-full min-w-0 pt-2">
                    {question.questionText && (
                        <div className="mb-6">
                            <RenderContent content={question.questionText} />
                        </div>
                    )}
                    {question.imageUrl && (
                        <div className="mb-8">
                            <SmartImageViewer src={question.imageUrl} alt="Gambar Soal" />
                        </div>
                    )}
                     {renderQuestionInput()}
                </div>
            </div>
        </div>
    );
});


export const StudentExamPage: React.FC<StudentExamPageProps> = ({ exam, student, onSubmit, onForceSubmit }) => {
    const [answers, setAnswers] = useState<Record<string, string>>(() => {
        try {
            const savedAnswers = localStorage.getItem(`exam_answers_${exam.code}_${student.studentId}`);
            return savedAnswers ? JSON.parse(savedAnswers) : {};
        } catch {
            return {};
        }
    });
    
    const [timeLeft, setTimeLeft] = useState(exam.config.timeLimit * 60);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [isForceSubmitted, setIsForceSubmitted] = useState(false);
    const timerIdRef = useRef<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const answersRef = useRef(answers);
    answersRef.current = answers;

    // Use Memo to persist the order of shuffled questions for this session
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

    const submitExam = useCallback(async () => {
        if (window.confirm("Apakah Anda yakin ingin menyelesaikan ujian? Pastikan semua jawaban sudah terisi.")) {
            setIsSubmitting(true);
            let location = "";
            if (exam.config.trackLocation) {
                 try {
                     const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                         if (!navigator.geolocation) reject(new Error("Geolocation not supported"));
                         navigator.geolocation.getCurrentPosition(resolve, reject, {
                             timeout: 5000,
                             enableHighAccuracy: false
                         });
                     });
                     location = `${position.coords.latitude},${position.coords.longitude}`;
                 } catch (e) {
                     console.error("Gagal mendapatkan lokasi:", e);
                 }
            }

            onSubmit(answers, timeLeft, location);
            localStorage.removeItem(`exam_answers_${exam.code}_${student.studentId}`);
            localStorage.removeItem(`exam_order_${exam.code}_${student.studentId}`);
            setIsSubmitting(false);
        }
    }, [answers, timeLeft, exam.code, student.studentId, onSubmit, exam.config.trackLocation]);

    // Initial Start Ping
    useEffect(() => {
        const startExam = async () => {
            if (navigator.onLine) {
                try {
                    await storageService.submitExamResult({
                        student,
                        examCode: exam.code,
                        answers: answersRef.current,
                        totalQuestions: exam.questions.length,
                        completionTime: 0,
                        activityLog: ["Memulai Ujian"],
                        status: 'in_progress'
                    });
                } catch (e) { console.error("Failed to send start ping", e); }
            }
        };
        startExam();
    }, [exam.code, student]);

    // Timer effect
    useEffect(() => {
        timerIdRef.current = window.setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    if(timerIdRef.current) clearInterval(timerIdRef.current);
                    alert("Waktu habis! Ujian akan diselesaikan secara otomatis.");
                    onSubmit(answersRef.current, 0); 
                    localStorage.removeItem(`exam_answers_${exam.code}_${student.studentId}`);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => {
            if (timerIdRef.current) clearInterval(timerIdRef.current);
        };
    }, [exam.code, onSubmit, student.studentId]);

    // Online/Offline status effect
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

    // Auto-save effect
    useEffect(() => {
        const saveInterval = setInterval(async () => {
            if (isForceSubmitted) return; 
            setSaveStatus('saving');
            
            try {
                localStorage.setItem(`exam_answers_${exam.code}_${student.studentId}`, JSON.stringify(answersRef.current));
            } catch (error) {
                console.error("Failed to save answers to localStorage", error);
            }

            if (navigator.onLine) {
                 try {
                    await storageService.submitExamResult({
                        student,
                        examCode: exam.code,
                        answers: answersRef.current,
                        totalQuestions: exam.questions.length,
                        completionTime: 0,
                        activityLog: ["Sedang mengerjakan..."],
                        status: 'in_progress'
                    });
                } catch (e) { }
            }

            setTimeout(() => setSaveStatus('saved'), 500);
            setTimeout(() => setSaveStatus('idle'), 2000);

        }, exam.config.autoSaveInterval * 1000);

        return () => clearInterval(saveInterval);
    }, [exam.code, student, exam.config.autoSaveInterval, isForceSubmitted, exam.questions.length]);

    // Behavior detection effect
    const timeLeftRef = useRef(timeLeft);
    timeLeftRef.current = timeLeft;

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && exam.config.detectBehavior && exam.config.continueWithPermission) {
                if (!isForceSubmitted) {
                    if (timerIdRef.current) clearInterval(timerIdRef.current);
                    setIsForceSubmitted(true);
                    onForceSubmit(answersRef.current, timeLeftRef.current);
                    localStorage.setItem(`exam_answers_${exam.code}_${student.studentId}`, JSON.stringify(answersRef.current));
                }
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [exam.config.detectBehavior, exam.config.continueWithPermission, onForceSubmit, student.studentId, exam.code, isForceSubmitted]);


    const handleAnswerChange = useCallback((questionId: string, answer: string) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: answer
        }));
    }, []);
    
    if (isForceSubmitted) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-red-50 p-6">
                <div className="w-full max-w-lg text-center bg-white p-12 rounded-[2rem] shadow-2xl animate-fade-in border border-red-100">
                     <div className="bg-red-50 p-6 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-8 shadow-inner">
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-red-500">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                         </svg>
                     </div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-4 tracking-tight">Ujian Ditangguhkan</h1>
                    <p className="text-gray-500 text-lg leading-relaxed mb-8 font-light">
                        Sistem mendeteksi aktivitas mencurigakan (keluar dari aplikasi). Demi integritas, ujian dikunci sementara.
                    </p>
                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-5 text-orange-800 text-sm font-medium">
                        Silakan hubungi pengawas atau guru Anda untuk membuka kunci ujian ini.
                    </div>
                </div>
            </div>
        );
    }

    const answeredCount = Object.keys(answers).length;
    const progressPercent = (answeredCount / displayedQuestions.length) * 100;
    const isCriticalTime = timeLeft < 300; // less than 5 mins

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans text-gray-900 pb-20 selection:bg-primary/20">
            {/* PROGRESS BAR (Top) */}
            <div className="fixed top-0 left-0 w-full h-1.5 bg-gray-100 z-50">
                 <div 
                    className="h-full bg-gradient-to-r from-primary to-indigo-400 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(79,70,229,0.3)]" 
                    style={{ width: `${progressPercent}%` }}
                 />
            </div>
            
            {/* GLASS HEADER */}
            <header className="fixed top-0 left-0 right-0 bg-white/70 backdrop-blur-xl shadow-sm z-40 border-b border-white/50 transition-all">
                <div className="max-w-6xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                         <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">KODE SOAL</span>
                            <h1 className="text-xl font-black text-gray-800 tracking-tight">{exam.code}</h1>
                        </div>
                        <div className="hidden md:block w-px h-8 bg-gray-200"></div>
                        <div className="hidden md:flex flex-col">
                             <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">SISWA</span>
                             <p className="text-sm font-semibold text-gray-600">{student.fullName}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 md:gap-5">
                        {/* TIMER */}
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${isCriticalTime ? 'bg-red-50 border border-red-100 animate-pulse' : 'bg-gray-50 border border-gray-100'}`}>
                            <ClockIcon className={`w-5 h-5 ${isCriticalTime ? 'text-red-500' : 'text-gray-400'}`} />
                            <span className={`font-mono text-lg font-bold tracking-tight ${isCriticalTime ? 'text-red-600' : 'text-gray-700'}`}>{formatTime(timeLeft)}</span>
                        </div>

                        {/* STATUS ICONS */}
                        <div className="flex items-center gap-2">
                             <div title={isOnline ? "Tersambung" : "Offline Mode"} className={`w-10 h-10 flex items-center justify-center rounded-full transition-all shadow-sm ${isOnline ? 'bg-white text-green-500 border border-green-100' : 'bg-yellow-50 text-yellow-600 border border-yellow-200'}`}>
                                {isOnline ? <WifiIcon className="w-5 h-5"/> : <NoWifiIcon className="w-5 h-5"/>}
                             </div>
                             <div title={saveStatus === 'saved' ? 'Tersimpan' : 'Menyimpan...'} className={`hidden sm:flex w-10 h-10 items-center justify-center rounded-full transition-all shadow-sm ${saveStatus === 'saved' ? 'bg-white text-blue-500 border border-blue-100' : 'bg-gray-100 text-gray-400'}`}>
                                <CheckCircleIcon className="w-5 h-5"/>
                             </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className="max-w-5xl mx-auto px-4 md:px-6 pt-28 pb-10">
                
                {/* WELCOME / INFO CARD */}
                <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-gray-800 mb-2 tracking-tight">Lembar Jawaban</h2>
                        <p className="text-gray-500 font-medium">
                            Jawablah dengan teliti. Gunakan tombol <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-neutral text-white mx-1"><span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></span>HD</span> pada gambar jika buram.
                        </p>
                    </div>
                    <div className="text-right hidden md:block">
                        <p className="text-4xl font-black text-gray-200">{answeredCount}<span className="text-2xl text-gray-300">/{displayedQuestions.length}</span></p>
                    </div>
                </div>

                <div className="space-y-8">
                    {displayedQuestions.map((q, index) => (
                        <QuestionDisplay
                            key={q.id}
                            question={q}
                            index={index}
                            answer={answers[q.id] || ''}
                            shuffleAnswers={exam.config.shuffleAnswers}
                            onAnswerChange={handleAnswerChange}
                        />
                    ))}
                </div>

                {/* FOOTER ACTION */}
                <div className="mt-16 mb-12 flex flex-col items-center justify-center gap-6">
                     <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">
                        {answeredCount} dari {displayedQuestions.length} soal terjawab
                     </p>

                    <button 
                        onClick={submitExam} 
                        disabled={isSubmitting}
                        className="group relative w-full max-w-lg bg-neutral text-white font-bold py-5 px-8 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.4)] transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
                    >
                        <span className="relative z-10 text-lg tracking-widest flex items-center justify-center gap-3">
                            {isSubmitting ? "MENGIRIM..." : "KIRIM JAWABAN SAYA"}
                            {!isSubmitting && <span className="text-gray-400">→</span>}
                        </span>
                        <div className="absolute inset-0 bg-gray-800 group-hover:bg-gray-700 transition-colors"></div>
                    </button>
                    {exam.config.trackLocation && (
                        <p className="text-[10px] text-gray-400 flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full">
                           <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span> Lokasi GPS aktif
                        </p>
                    )}
                </div>
            </main>
        </div>
    );
};
