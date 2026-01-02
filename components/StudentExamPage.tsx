
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Exam, Student, Question, Result } from '../types';
import { ClockIcon, CheckCircleIcon, WifiIcon, NoWifiIcon, PhotoIcon } from './Icons';
import { storageService } from '../services/storage';

interface StudentExamPageProps {
  exam: Exam;
  student: Student;
  initialData?: Result | null; // Data untuk resume ujian
  onSubmit: (answers: Record<string, string>, timeLeft: number, location?: string) => void;
  onForceSubmit: (answers: Record<string, string>, timeLeft: number) => void;
}

const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')} : ${minutes.toString().padStart(2, '0')} : ${secs.toString().padStart(2, '0')}`;
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
// isHD sekarang diterima sebagai props dari parent
const SmartImageViewer: React.FC<{ src: string; alt: string; isHD: boolean }> = ({ src, alt, isHD }) => {
    const [scale, setScale] = useState(1);

    return (
        <div className="space-y-3 mt-3">
            <div className={`relative overflow-hidden rounded-xl border border-gray-100 bg-white transition-all ${isHD ? 'shadow-sm' : ''}`}>
                <div className="overflow-auto flex justify-center bg-gray-50/30 p-2" style={{ maxHeight: '600px' }}>
                    <img 
                        src={src} 
                        alt={alt} 
                        style={{ 
                            // Magic Filter: 
                            // 1. Grayscale: menghilangkan noise warna (chroma subsampling artifacts)
                            // 2. Contrast & Brightness: membuat teks hitam lebih pekat, background putih lebih bersih
                            // 3. url(#sharpen): Memakai SVG filter global untuk menajamkan tepi huruf
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
                
                {/* Minimalist Floating Controls for Zoom Only */}
                <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-white/90 backdrop-blur shadow-sm p-1.5 rounded-full border border-gray-200 opacity-0 hover:opacity-100 transition-opacity z-10">
                     <button onClick={() => setScale(s => Math.max(0.8, s - 0.2))} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-primary hover:bg-gray-50 rounded-full font-bold text-lg" title="Zoom Out">-</button>
                     <span className="text-[10px] font-mono w-8 text-center text-gray-500">{Math.round(scale * 100)}%</span>
                     <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-primary hover:bg-gray-50 rounded-full font-bold text-lg" title="Zoom In">+</button>
                </div>
            </div>
        </div>
    )
};

const RenderContent: React.FC<{ content: string; isHD: boolean }> = ({ content, isHD }) => {
    if (isDataUrl(content)) {
        return <SmartImageViewer src={content} alt="Konten Soal" isHD={isHD} />;
    }
    return <div className="prose prose-lg max-w-none text-gray-800 leading-relaxed break-words whitespace-pre-wrap font-sans">{content}</div>;
};

const QuestionDisplay: React.FC<{
    question: Question;
    index: number;
    answer: string;
    shuffleAnswers: boolean;
    isHD: boolean; // Receive Global HD State
    isHighlighted: boolean; // Receive Highlight State
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
                                             {item.text && <RenderContent content={item.text} isHD={isHD} />}
                                        </div>
                                    </div>
                                    {item.image && <SmartImageViewer src={item.image} alt="Gambar Opsi" isHD={isHD} />}
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
                                            {item.text && <RenderContent content={item.text} isHD={isHD} />}
                                            {item.image && <SmartImageViewer src={item.image} alt="Gambar Opsi" isHD={isHD} />}
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
        <div 
            id={question.id}
            className={`bg-white p-6 md:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 mb-10 transition-all duration-500 ease-out ${isHighlighted ? 'ring-2 ring-red-400 bg-red-50/50 shadow-xl scale-[1.01]' : 'hover:translate-y-[-2px]'}`}
        >
             <div className="flex items-start gap-5">
                <div className="flex-shrink-0 mt-1">
                    <span className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-2xl text-lg md:text-xl font-bold shadow-sm ${question.questionType === 'INFO' ? 'bg-blue-50 text-blue-600' : (isHighlighted ? 'bg-red-500 text-white animate-pulse' : 'bg-primary text-white shadow-primary/30 shadow-lg')}`}>
                        {question.questionType === 'INFO' ? 'i' : index + 1}
                    </span>
                </div>
                <div className="flex-1 w-full min-w-0 pt-2">
                    {question.questionText && (
                        <div className="mb-6">
                            <RenderContent content={question.questionText} isHD={isHD} />
                        </div>
                    )}
                    {question.imageUrl && (
                        <div className="mb-8">
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
    // Priority: initialData (Resume from Cloud) -> localStorage (Resume from local cache) -> Empty
    const [answers, setAnswers] = useState<Record<string, string>>(() => {
        if (initialData && initialData.answers) return initialData.answers;
        try {
            const savedAnswers = localStorage.getItem(`exam_answers_${exam.code}_${student.studentId}`);
            return savedAnswers ? JSON.parse(savedAnswers) : {};
        } catch {
            return {};
        }
    });
    
    // 2. Initialize Activity Log
    const [activityLog, setActivityLog] = useState<string[]>(() => {
        if (initialData && initialData.activityLog && initialData.activityLog.length > 0) {
            // Append resumption log
            return [...initialData.activityLog, `[${new Date().toLocaleTimeString()}] Ujian dilanjutkan kembali (Resume).`];
        }
        try {
            const savedLog = localStorage.getItem(`exam_log_${exam.code}_${student.studentId}`);
            return savedLog ? JSON.parse(savedLog) : [`[${new Date().toLocaleTimeString()}] Memulai ujian.`];
        } catch {
            return [`[${new Date().toLocaleTimeString()}] Memulai ujian.`];
        }
    });

    // 3. Initialize Absolute Time (Wall-Clock Sync)
    // Menghitung waktu selesai berdasarkan JADWAL, bukan durasi relatif login.
    const examEndTime = useMemo(() => {
        // Parsing tanggal yang aman (YYYY-MM-DD atau ISO)
        const dateStr = exam.config.date.includes('T') ? exam.config.date.split('T')[0] : exam.config.date;
        const startObj = new Date(`${dateStr}T${exam.config.startTime}`);
        // Tambahkan durasi dalam milidetik
        return startObj.getTime() + (exam.config.timeLimit * 60 * 1000);
    }, [exam.config]);

    // 4. Initialize Time Left with Real-time diff
    const calculateTimeLeft = useCallback(() => {
        const now = Date.now();
        const diffSeconds = Math.floor((examEndTime - now) / 1000);
        return diffSeconds > 0 ? diffSeconds : 0;
    }, [examEndTime]);

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [isForceSubmitted, setIsForceSubmitted] = useState(false);
    const timerIdRef = useRef<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const answersRef = useRef(answers);
    answersRef.current = answers;
    
    const activityLogRef = useRef(activityLog);
    activityLogRef.current = activityLog;

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

    // Helper to add log
    const addLog = useCallback((message: string) => {
        const newLog = [...activityLogRef.current, message];
        setActivityLog(newLog);
        activityLogRef.current = newLog;
        try {
            localStorage.setItem(`exam_log_${exam.code}_${student.studentId}`, JSON.stringify(newLog));
        } catch (e) {}
    }, [exam.code, student.studentId]);

    const submitExam = useCallback(async () => {
        // --- LOGIC VALIDASI JAWABAN KOSONG ---
        // Cari pertanyaan pertama (bukan tipe INFO) yang belum memiliki jawaban
        const firstUnansweredQuestion = displayedQuestions.find(q => {
             if (q.questionType === 'INFO') return false;
             const userAns = answersRef.current[q.id];
             return !userAns || userAns.trim() === '';
        });

        if (firstUnansweredQuestion) {
             alert("Terdapat soal yang belum dijawab. Anda akan diarahkan otomatis ke soal tersebut.");
             
             // Set Visual Highlight
             setHighlightedQuestionId(firstUnansweredQuestion.id);

             // Auto Scroll Logic
             const element = document.getElementById(firstUnansweredQuestion.id);
             if (element) {
                 element.scrollIntoView({ behavior: 'smooth', block: 'center' });
             }

             // Remove highlight after 3 seconds
             setTimeout(() => {
                 setHighlightedQuestionId(null);
             }, 3000);
             
             return; // Batalkan proses submit
        }
        // --- END VALIDASI ---

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
                     addLog(`[${new Date().toLocaleTimeString()}] Gagal mendapatkan lokasi GPS.`);
                 }
            }

            // Add final log
            const finalLogs = [...activityLogRef.current, `[${new Date().toLocaleTimeString()}] Ujian diselesaikan oleh siswa.`];
            
            // Calculate completion time: Total Duration - Time Left
            // This represents "Time taken relative to the full window", not necessarily active minutes if late.
            const completionDuration = (exam.config.timeLimit * 60) - timeLeft;

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
            
            onSubmit(answers, timeLeft, location);
            
            localStorage.removeItem(`exam_answers_${exam.code}_${student.studentId}`);
            localStorage.removeItem(`exam_order_${exam.code}_${student.studentId}`);
            localStorage.removeItem(`exam_log_${exam.code}_${student.studentId}`);
            setIsSubmitting(false);
        }
    }, [answers, timeLeft, exam.code, student, onSubmit, exam.config.trackLocation, addLog, exam.config.timeLimit, exam.questions.length, displayedQuestions]);

    // Initial Start Ping (Only if not resuming)
    useEffect(() => {
        const startExam = async () => {
            if (navigator.onLine) {
                try {
                    await storageService.submitExamResult({
                        student,
                        examCode: exam.code,
                        answers: answersRef.current,
                        totalQuestions: exam.questions.length,
                        completionTime: (exam.config.timeLimit * 60) - timeLeft,
                        activityLog: activityLogRef.current,
                        status: 'in_progress'
                    });
                } catch (e) { console.error("Failed to send start/resume ping", e); }
            }
        };
        startExam();
    }, [exam.code, student, exam.questions.length]); // Dependencies adjusted

    // DRIFT-PROOF TIMER EFFECT
    useEffect(() => {
        // Set interval untuk mengecek waktu setiap detik
        timerIdRef.current = window.setInterval(() => {
            // Hitung ulang berdasarkan Date.now() setiap tick
            // Ini mencegah drift jika thread utama sibuk atau tab di-background
            const remaining = calculateTimeLeft();
            
            if (remaining <= 0) {
                if(timerIdRef.current) clearInterval(timerIdRef.current);
                setTimeLeft(0); // Ensure 0 display
                alert("Waktu ujian telah berakhir sesuai jadwal.");
                onSubmit(answersRef.current, 0); 
                localStorage.removeItem(`exam_answers_${exam.code}_${student.studentId}`);
            } else {
                setTimeLeft(remaining);
            }
        }, 1000);

        return () => {
            if (timerIdRef.current) clearInterval(timerIdRef.current);
        };
    }, [exam.code, onSubmit, student.studentId, calculateTimeLeft]);

    // Online/Offline status effect
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            addLog(`[${new Date().toLocaleTimeString()}] Koneksi internet terhubung kembali.`);
        };
        const handleOffline = () => {
            setIsOnline(false);
            addLog(`[${new Date().toLocaleTimeString()}] Koneksi internet terputus.`);
        };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [addLog]);

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
                        completionTime: (exam.config.timeLimit * 60) - timeLeft,
                        activityLog: activityLogRef.current,
                        status: 'in_progress'
                    });
                } catch (e) { }
            }

            setTimeout(() => setSaveStatus('saved'), 500);
            setTimeout(() => setSaveStatus('idle'), 2000);

        }, exam.config.autoSaveInterval * 1000);

        return () => clearInterval(saveInterval);
    }, [exam.code, student, exam.config.autoSaveInterval, isForceSubmitted, exam.questions.length, timeLeft]); // Added timeLeft dependency to sync correct completion time

    // Behavior detection effect
    const timeLeftRef = useRef(timeLeft);
    timeLeftRef.current = timeLeft;

    useEffect(() => {
        // Hanya aktif jika fitur deteksi dinyalakan
        if (!exam.config.detectBehavior) return;

        const forceLockExam = (reason: string) => {
             if (timerIdRef.current) clearInterval(timerIdRef.current);
             setIsForceSubmitted(true);
             
             // Tambah log final sebelum force submit
             const lockMsg = `[${new Date().toLocaleTimeString('id-ID')}] ⛔ Ujian dikunci otomatis. Alasan: ${reason}`;
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
            const timestamp = new Date().toLocaleTimeString('id-ID');
            
            if (document.hidden) {
                // Log ketika siswa meninggalkan tab (minimize atau ganti tab)
                const msg = `[${timestamp}] ⚠️ Terdeteksi beralih ke Tab Lain/Aplikasi Lain (Browser diminimalkan).`;
                addLog(msg);

                // Jika mode "Hentikan Ujian" aktif
                if (exam.config.continueWithPermission && !isForceSubmitted) {
                    forceLockExam("Pindah Tab/Aplikasi");
                }
            } else {
                // Log ketika siswa kembali
                if (!isForceSubmitted) {
                    const msg = `[${timestamp}] 🔙 Kembali ke tampilan ujian.`;
                    addLog(msg);
                }
            }
        };

        const handleResize = () => {
             if (isForceSubmitted) return;
             
             // 1. Validasi Mobile Keyboard: Jangan trigger jika user sedang mengetik
             const activeEl = document.activeElement;
             const isInputFocused = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';
             if (isInputFocused) return;

             // 2. Kalkulasi Rasio Layar
             const widthRatio = window.innerWidth / window.screen.availWidth;
             const heightRatio = window.innerHeight / window.screen.availHeight;

             // 3. Thresholds (Toleransi)
             // Lebar < 90% (Split screen kiri/kanan)
             // Tinggi < 75% (Split screen atas/bawah atau floating)
             const isSuspiciousWidth = widthRatio < 0.90; 
             const isSuspiciousHeight = heightRatio < 0.75;

             if (isSuspiciousWidth || isSuspiciousHeight) {
                 const timestamp = new Date().toLocaleTimeString('id-ID');
                 const msg = `[${timestamp}] ⚠️ Terdeteksi Mode Layar Terpisah/Floating Window (W:${Math.round(widthRatio*100)}% H:${Math.round(heightRatio*100)}%).`;
                 addLog(msg);

                 if (exam.config.continueWithPermission) {
                     forceLockExam("Split Screen / Resize Window");
                 }
             }
        };

        // Instant Check on Mount (Strict Resume Logic)
        if (document.hidden && exam.config.detectBehavior && exam.config.continueWithPermission) {
            handleVisibilityChange();
        }

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("resize", handleResize);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("resize", handleResize);
        };
    }, [exam.config.detectBehavior, exam.config.continueWithPermission, onForceSubmit, student, exam.code, isForceSubmitted, addLog, exam.questions.length, exam.config.timeLimit]);


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
                        Sistem mendeteksi aktivitas mencurigakan (Pindah Aplikasi / Split Screen). Demi integritas, ujian dikunci sementara.
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
            {/* Global SVG Filter Definition for Sharpening */}
            <svg width="0" height="0" style={{ position: 'absolute' }}>
                <defs>
                    <filter id="sharpen">
                        <feConvolveMatrix 
                            order="3" 
                            preserveAlpha="true" 
                            kernelMatrix="0 -1 0 -1 5 -1 0 -1 0"
                        />
                    </filter>
                </defs>
            </svg>

            {/* PROGRESS BAR (Top) */}
            <div className="fixed top-0 left-0 w-full h-1.5 bg-gray-100 z-50">
                 <div 
                    className="h-full bg-gradient-to-r from-primary to-indigo-400 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(79,70,229,0.3)]" 
                    style={{ width: `${progressPercent}%` }}
                 />
            </div>
            
            {/* GLASS HEADER (Responsive Adjusted) */}
            <header className="fixed top-0 left-0 right-0 bg-white/70 backdrop-blur-xl shadow-sm z-40 border-b border-white/50 transition-all">
                {/* 
                   RESPONSIVE CHANGES:
                   - Reduced px/py on mobile: px-3 py-2 (mobile) vs px-8 py-3 (desktop)
                   - Flex justify-between handles spacing
                */}
                <div className="max-w-6xl mx-auto px-3 md:px-8 py-2 md:py-3 flex items-center justify-between">
                    
                    {/* LEFT SECTION */}
                    <div className="flex items-center gap-3 md:gap-6">
                         <div className="flex flex-col">
                            {/* Smaller Label for mobile */}
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-0.5">SOAL</span>
                            {/* Smaller Code Font for mobile */}
                            <h1 className="text-base md:text-xl font-black text-gray-800 tracking-tight leading-none">{exam.code}</h1>
                        </div>
                        {/* Divider hidden on mobile */}
                        <div className="hidden md:block w-px h-8 bg-gray-200"></div>
                        {/* Student Name hidden on mobile to save space */}
                        <div className="hidden md:flex flex-col">
                             <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">SISWA</span>
                             <p className="text-sm font-semibold text-gray-600">{student.fullName}</p>
                        </div>
                    </div>

                    {/* RIGHT SECTION (CONTROLS) */}
                    <div className="flex items-center gap-2 md:gap-5">
                         {/* GLOBAL HD TOGGLE - Compact on mobile */}
                         <button 
                            onClick={() => setIsHD(!isHD)}
                            className={`flex items-center gap-1 px-2 py-1.5 md:px-3 md:py-2 rounded-xl transition-all border shadow-sm ${isHD ? 'bg-neutral text-white border-neutral' : 'bg-white text-gray-500 border-gray-200'}`}
                            title={isHD ? "Matikan Mode HD" : "Hidupkan Mode HD (Teks Tajam)"}
                         >
                            <PhotoIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            {/* Text hidden on very small screens, shown on small-ish */}
                            <span className="text-[10px] font-bold hidden sm:inline">{isHD ? 'HD ON' : 'HD OFF'}</span>
                            {isHD && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse ml-0.5"></span>}
                        </button>

                        {/* TIMER - Compact on mobile */}
                        <div className={`flex items-center gap-1.5 md:gap-2 px-2.5 py-1.5 md:px-4 md:py-2 rounded-xl transition-all ${isCriticalTime ? 'bg-red-50 border border-red-100 animate-pulse' : 'bg-gray-50 border border-gray-100'}`}>
                            <ClockIcon className={`w-3.5 h-3.5 md:w-5 md:h-5 ${isCriticalTime ? 'text-red-500' : 'text-gray-400'}`} />
                            {/* Smaller font on mobile */}
                            <span className={`font-mono text-sm md:text-lg font-bold tracking-tight ${isCriticalTime ? 'text-red-600' : 'text-gray-700'}`}>{formatTime(timeLeft)}</span>
                        </div>

                        {/* STATUS ICONS - Smaller on mobile */}
                        <div className="flex items-center gap-1 md:gap-2">
                             <div title={isOnline ? "Tersambung" : "Offline Mode"} className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full transition-all shadow-sm ${isOnline ? 'bg-white text-green-500 border border-green-100' : 'bg-yellow-50 text-yellow-600 border border-yellow-200'}`}>
                                {isOnline ? <WifiIcon className="w-4 h-4 md:w-5 md:h-5"/> : <NoWifiIcon className="w-4 h-4 md:w-5 md:h-5"/>}
                             </div>
                             {/* Save Icon hidden on very small screens if needed, but flex handles it */}
                             <div title={saveStatus === 'saved' ? 'Tersimpan' : 'Menyimpan...'} className={`hidden sm:flex w-8 h-8 md:w-10 md:h-10 items-center justify-center rounded-full transition-all shadow-sm ${saveStatus === 'saved' ? 'bg-white text-blue-500 border border-blue-100' : 'bg-gray-100 text-gray-400'}`}>
                                <CheckCircleIcon className="w-4 h-4 md:w-5 md:h-5"/>
                             </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT - Adjusted Top Padding for Mobile */}
            <main className="max-w-5xl mx-auto px-4 md:px-6 pt-20 md:pt-28 pb-10">
                
                {/* WELCOME / INFO CARD */}
                <div className="mb-6 md:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-2 md:gap-4">
                    <div>
                        <h2 className="text-xl md:text-3xl font-black text-gray-800 mb-1 md:mb-2 tracking-tight">Lembar Jawaban</h2>
                        <p className="text-xs md:text-base text-gray-500 font-medium">
                            Jawablah dengan teliti. Pastikan koneksi internet stabil.
                        </p>
                    </div>
                    <div className="text-right hidden md:block">
                        <p className="text-4xl font-black text-gray-200">{answeredCount}<span className="text-2xl text-gray-300">/{displayedQuestions.length}</span></p>
                    </div>
                     {/* Mobile Progress Counter */}
                    <div className="md:hidden flex items-center gap-2 text-sm font-bold text-gray-400">
                        <span>Progress: {answeredCount} / {displayedQuestions.length}</span>
                    </div>
                </div>

                <div className="space-y-6 md:space-y-8">
                    {displayedQuestions.map((q, index) => (
                        <QuestionDisplay
                            key={q.id}
                            question={q}
                            index={index}
                            answer={answers[q.id] || ''}
                            shuffleAnswers={exam.config.shuffleAnswers}
                            isHD={isHD}
                            isHighlighted={highlightedQuestionId === q.id}
                            onAnswerChange={handleAnswerChange}
                        />
                    ))}
                </div>

                {/* FOOTER ACTION */}
                <div className="mt-12 md:mt-16 mb-8 md:mb-12 flex flex-col items-center justify-center gap-4 md:gap-6">
                     <p className="text-xs md:text-sm font-medium text-gray-400 uppercase tracking-widest">
                        {answeredCount} dari {displayedQuestions.length} soal terjawab
                     </p>

                    <button 
                        onClick={submitExam} 
                        disabled={isSubmitting}
                        className="group relative w-full max-w-lg bg-neutral text-white font-bold py-4 md:py-5 px-6 md:px-8 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.4)] transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
                    >
                        <span className="relative z-10 text-sm md:text-lg tracking-widest flex items-center justify-center gap-3">
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
