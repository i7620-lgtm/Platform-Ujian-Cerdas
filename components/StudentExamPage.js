import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Exam, Student, Question } from '../types';
import { ClockIcon, CheckCircleIcon, WifiIcon, NoWifiIcon } from './Icons';

interface StudentExamPageProps {
  exam: Exam;
  student: Student;
  onSubmit: (answers: Record<string, string>, timeLeft: number) => void;
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

const RenderContent: React.FC<{ content: string }> = ({ content }) => {
    if (isDataUrl(content)) {
        return <img src={content} alt="Konten Soal" className="max-w-full h-auto rounded-md border" />;
    }
    return <span className="break-words whitespace-pre-wrap">{content}</span>;
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

    // Handle Matrix True/False logic
    const handleTrueFalseMatrixChange = (rowIndex: number, val: boolean) => {
        let currentArr: boolean[] = [];
        try {
            // Initialize array if empty
            const saved = answer ? JSON.parse(answer) : [];
            // Ensure array has correct length based on question rows
            const rowCount = question.trueFalseRows ? question.trueFalseRows.length : 0;
            currentArr = new Array(rowCount).fill(null); // Use null for unanswered, though JSON might not like undefined
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
        const baseInputClasses = "mt-2 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary";
        
        switch (question.questionType) {
            case 'INFO':
                return null;
            case 'MULTIPLE_CHOICE':
                return (
                    <div className="space-y-3 mt-4">
                        {shuffledOptions?.map((item, idx) => (
                            <label key={idx} className={`flex items-start p-4 border rounded-lg hover:bg-secondary/10 cursor-pointer transition-colors ${answer === item.text ? 'bg-secondary/10 border-secondary ring-2 ring-secondary' : 'bg-white'}`}>
                                <input
                                    type="radio"
                                    name={question.id}
                                    value={item.text}
                                    checked={answer === item.text}
                                    onChange={(e) => onAnswerChange(question.id, e.target.value)}
                                    className="h-4 w-4 mt-1 text-secondary focus:ring-secondary border-gray-300 flex-shrink-0"
                                />
                                <div className="ml-3 text-gray-700 w-full">
                                    {item.text && <div className="mb-1 font-medium"><RenderContent content={item.text} /></div>}
                                    {item.image && <img src={item.image} alt="Gambar Opsi" className="max-w-full h-auto rounded-md border max-h-[200px]" />}
                                </div>
                            </label>
                        ))}
                    </div>
                );
            case 'TRUE_FALSE':
                // Check if it's the new matrix format
                if (question.trueFalseRows) {
                     let currentAnswers: boolean[] = [];
                     try { currentAnswers = answer ? JSON.parse(answer) : []; } catch(e){}

                     return (
                        <div className="mt-4 overflow-x-auto border rounded-lg shadow-sm">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Pernyataan</th>
                                        <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-24 border-l">Benar</th>
                                        <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-24 border-l">Salah</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {question.trueFalseRows.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm text-gray-900 font-medium">{row.text}</td>
                                            <td className="px-6 py-4 text-center border-l bg-gray-50/50">
                                                <div className="flex justify-center">
                                                    <input 
                                                        type="radio" 
                                                        name={`${question.id}_row_${idx}`}
                                                        checked={currentAnswers[idx] === true}
                                                        onChange={() => handleTrueFalseMatrixChange(idx, true)}
                                                        className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 cursor-pointer"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center border-l bg-gray-50/50">
                                                 <div className="flex justify-center">
                                                    <input 
                                                        type="radio" 
                                                        name={`${question.id}_row_${idx}`}
                                                        checked={currentAnswers[idx] === false}
                                                        onChange={() => handleTrueFalseMatrixChange(idx, false)}
                                                        className="h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300 cursor-pointer"
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                     );
                }
                // Fallback for legacy (shouldn't happen with new creates)
                 return (
                    <div className="space-y-3 mt-4">
                        {question.options?.map((opt, idx) => (
                            <label key={idx} className={`flex items-start p-4 border rounded-lg hover:bg-secondary/10 cursor-pointer transition-colors ${answer === opt ? 'bg-secondary/10 border-secondary ring-2 ring-secondary' : 'bg-white'}`}>
                                <input
                                    type="radio"
                                    name={question.id}
                                    value={opt}
                                    checked={answer === opt}
                                    onChange={(e) => onAnswerChange(question.id, e.target.value)}
                                    className="h-4 w-4 mt-1 text-secondary focus:ring-secondary border-gray-300 flex-shrink-0"
                                />
                                <div className="ml-3 text-gray-700 w-full font-medium">{opt}</div>
                            </label>
                        ))}
                    </div>
                );
            case 'COMPLEX_MULTIPLE_CHOICE':
                 return (
                    <div className="space-y-3 mt-4">
                        <p className="text-sm text-gray-500 italic mb-2">Pilih semua jawaban yang benar.</p>
                        {shuffledOptions?.map((item, idx) => {
                             const isChecked = answer ? answer.split(',').includes(item.text) : false;
                             return (
                                <label key={idx} className={`flex items-start p-4 border rounded-lg hover:bg-secondary/10 cursor-pointer transition-colors ${isChecked ? 'bg-secondary/10 border-secondary ring-2 ring-secondary' : 'bg-white'}`}>
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => handleComplexChange(item.text, e.target.checked)}
                                        className="h-4 w-4 mt-1 text-secondary focus:ring-secondary border-gray-300 flex-shrink-0 rounded"
                                    />
                                    <div className="ml-3 text-gray-700 w-full">
                                        {item.text && <div className="mb-1 font-medium"><RenderContent content={item.text} /></div>}
                                        {item.image && <img src={item.image} alt="Gambar Opsi" className="max-w-full h-auto rounded-md border max-h-[200px]" />}
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                );
            case 'MATCHING':
                 const currentMatchingAnswers = answer ? JSON.parse(answer) : {};
                 return (
                    <div className="space-y-4 mt-4">
                        <p className="text-sm text-gray-500 italic mb-2">Pasangkan pernyataan kiri dengan jawaban kanan yang sesuai.</p>
                        <div className="grid gap-4">
                            {question.matchingPairs?.map((pair, idx) => (
                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 border rounded bg-white">
                                    <div className="flex-1 font-medium text-gray-700">
                                        {pair.left}
                                    </div>
                                    <div className="hidden sm:block text-gray-400">→</div>
                                    <div className="flex-1">
                                        <select 
                                            value={currentMatchingAnswers[idx] || ''} 
                                            onChange={(e) => handleMatchingChange(idx, e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded focus:ring-secondary focus:border-secondary bg-gray-50 text-sm"
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
                return <textarea
                    value={answer || ''}
                    onChange={(e) => onAnswerChange(question.id, e.target.value)}
                    rows={5}
                    className={baseInputClasses}
                    placeholder="Ketik jawaban esai Anda di sini..."
                />;
            case 'FILL_IN_THE_BLANK':
                return <input
                    type="text"
                    value={answer || ''}
                    onChange={(e) => onAnswerChange(question.id, e.target.value)}
                    className={baseInputClasses}
                    placeholder="Isi bagian yang kosong..."
                />;
            default:
                return null;
        }
    };

    return (
        <div className="bg-base-100 p-6 rounded-2xl shadow-sm">
             <div className="font-semibold text-neutral leading-relaxed text-lg flex items-start gap-2">
                <span className="text-secondary font-bold">{question.questionType === 'INFO' ? 'Info' : `${index + 1}.`}</span>
                <div className="flex-1 w-full">
                    {question.questionText && <div className="mb-3"><RenderContent content={question.questionText} /></div>}
                    {question.imageUrl && (
                        <div className="mb-4">
                            <img src={question.imageUrl} alt="Gambar Soal" className="max-w-full h-auto rounded-md border" />
                        </div>
                    )}
                </div>
            </div>
            {renderQuestionInput()}
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

    const answersRef = useRef(answers);
    answersRef.current = answers;

    const displayedQuestions = useMemo(() => {
        // Only shuffle questions that are not INFO type to allow instructions to stay at top if needed? 
        // For simplicity, shuffle everything if config enabled, but generally INFO blocks should probably stay with their context.
        // Current logic: simple shuffle.
        return exam.config.shuffleQuestions ? shuffleArray(exam.questions) : exam.questions;
    }, [exam.questions, exam.config.shuffleQuestions]);

    const submitExam = useCallback(() => {
        if (window.confirm("Apakah Anda yakin ingin menyelesaikan ujian?")) {
            onSubmit(answers, timeLeft);
            localStorage.removeItem(`exam_answers_${exam.code}_${student.studentId}`);
        }
    }, [answers, timeLeft, exam.code, student.studentId, onSubmit]);

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
        const saveInterval = setInterval(() => {
            if (isForceSubmitted) return; // Don't save if exam is locked
            setSaveStatus('saving');
            try {
                localStorage.setItem(`exam_answers_${exam.code}_${student.studentId}`, JSON.stringify(answersRef.current));
                setTimeout(() => setSaveStatus('saved'), 500);
                setTimeout(() => setSaveStatus('idle'), 2000);
            } catch (error) {
                console.error("Failed to save answers to localStorage", error);
                setSaveStatus('idle'); // Or an error state
            }
        }, exam.config.autoSaveInterval * 1000);

        return () => clearInterval(saveInterval);
    }, [exam.code, student.studentId, exam.config.autoSaveInterval, isForceSubmitted]);

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
            <div className="flex items-center justify-center min-h-screen bg-red-50 p-4">
                <div className="w-full max-w-lg text-center bg-white p-8 rounded-2xl shadow-lg">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Ujian Ditangguhkan</h1>
                    <p className="text-gray-600">
                        Sistem mendeteksi Anda meninggalkan halaman ujian. Jawaban terakhir Anda telah disimpan.
                        Silakan hubungi guru untuk meminta izin melanjutkan ujian.
                    </p>
                </div>
            </div>
        );
    }


    return (
        <div className="min-h-screen bg-base-200">
            <header className="bg-base-100 shadow-md sticky top-0 z-10 p-4">
                <div className="max-w-4xl mx-auto flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-neutral">Ujian {exam.code}</h1>
                        <p className="text-sm text-gray-500">{student.fullName} - {student.class}</p>
                    </div>
                    <div className="w-full flex justify-between items-center gap-2 sm:w-auto sm:justify-start sm:gap-4 text-sm font-semibold">
                        <div title="Sisa Waktu" className="flex items-center gap-2 px-3 py-2 bg-red-100 rounded-lg">
                            <ClockIcon className="w-5 h-5 text-red-600" />
                            <span className="text-red-600 font-mono text-base">{formatTime(timeLeft)}</span>
                        </div>
                         <div title={isOnline ? "Terhubung" : "Mode Offline Aktif"} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isOnline ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {isOnline ? <WifiIcon className="w-5 h-5"/> : <NoWifiIcon className="w-5 h-5"/>}
                            <span>{isOnline ? "Online" : "Offline"}</span>
                        </div>
                        <div title="Status Penyimpanan" className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-gray-600">
                           {saveStatus === 'saved' ? <CheckCircleIcon className="w-5 h-5 text-secondary"/> : <div className={`w-3 h-3 rounded-full ${saveStatus === 'saving' ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'}`}></div> }
                           <span className="capitalize text-xs">{saveStatus === 'idle' ? 'Disimpan' : (saveStatus === 'saving' ? 'Menyimpan...' : 'Tersimpan')}</span>
                        </div>
                    </div>
                </div>
            </header>
            <main className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in">
                <div className="space-y-6">
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
                <div className="mt-8 text-center">
                    <button onClick={submitExam} className="bg-primary text-primary-content font-bold py-3 px-12 rounded-lg hover:bg-primary-focus transition-colors duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                        Selesaikan Ujian
                    </button>
                </div>
            </main>
        </div>
    );
};
