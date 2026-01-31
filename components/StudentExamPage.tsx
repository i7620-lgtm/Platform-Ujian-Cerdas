
import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Exam, Student, Result, Question, ResultStatus } from '../types';
import { ClockIcon, CheckCircleIcon, ExclamationTriangleIcon, PencilIcon, ChevronDownIcon } from './Icons';
import { storageService } from '../services/storage';

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
    // Hitung hanya untuk tipe soal yang bisa dinilai otomatis
    const scorableQuestions = exam.questions.filter(q => q.questionType !== 'INFO' && q.questionType !== 'ESSAY');
    
    scorableQuestions.forEach((q: any) => {
        const studentAnswer = answers[q.id];
        if (!studentAnswer) return;

        if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
             if (q.correctAnswer && normalize(studentAnswer) === normalize(q.correctAnswer)) correctCount++;
        } 
        else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
             // Jawaban siswa: "A,C" -> set("a", "c")
             // Kunci: "A,C" -> set("a", "c")
             const studentSet = new Set(normalize(studentAnswer).split(',').map(s => s.trim()));
             const correctSet = new Set(normalize(q.correctAnswer).split(',').map(s => s.trim()));
             if (studentSet.size === correctSet.size && [...studentSet].every(val => correctSet.has(val))) {
                 correctCount++;
             }
        }
        else if (q.questionType === 'TRUE_FALSE') {
            try {
                // Jawaban siswa: {"0": true, "1": false}
                const ansObj = JSON.parse(studentAnswer);
                const allCorrect = q.trueFalseRows?.every((row: any, idx: number) => {
                    return ansObj[idx] === row.answer;
                });
                if (allCorrect) correctCount++;
            } catch (e) {}
        }
        else if (q.questionType === 'MATCHING') {
            try {
                // Jawaban siswa: {"0": "Text Kanan", "1": "Text Kanan Lain"}
                const ansObj = JSON.parse(studentAnswer);
                const allCorrect = q.matchingPairs?.every((pair: any, idx: number) => {
                    // Cek apakah jawaban untuk baris ke-idx (kiri) sama dengan pasangan kanannya (right)
                    return ansObj[idx] === pair.right;
                });
                if (allCorrect) correctCount++;
            } catch (e) {}
        }
    });

    const score = scorableQuestions.length > 0 ? Math.round((correctCount / scorableQuestions.length) * 100) : 0;
    return { score, correctCount, totalQuestions: scorableQuestions.length };
};

export const StudentExamPage: React.FC<StudentExamPageProps> = ({ exam, student, initialData, onSubmit }) => {
    const STORAGE_KEY = `exam_local_${exam.code}_${student.studentId}`;
    const CACHED_EXAM_KEY = `exam_def_${exam.code}`;

    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [warningMsg, setWarningMsg] = useState('');
    const [userLocation, setUserLocation] = useState<string>('');
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'pending'>('saved');
    const [activeExam, setActiveExam] = useState<Exam>(exam);

    const answersRef = useRef<Record<string, string>>({});
    const logRef = useRef<string[]>(initialData?.activityLog || []);
    const isSubmittingRef = useRef(false);
    const timeLeftRef = useRef(0);
    const lastBroadcastTimeRef = useRef<number>(0);
    
    useEffect(() => {
        const loadState = () => {
            try { localStorage.setItem(CACHED_EXAM_KEY, JSON.stringify(exam)); } catch (e) { console.warn("Quota exceeded"); }
            const localData = localStorage.getItem(STORAGE_KEY);
            if (localData) {
                try {
                    const parsed = JSON.parse(localData);
                    setAnswers(parsed.answers || {});
                    answersRef.current = parsed.answers || {};
                    if (parsed.logs) logRef.current = parsed.logs;
                    return;
                } catch(e) { }
            }
            if (initialData?.answers) {
                setAnswers(initialData.answers);
                answersRef.current = initialData.answers;
            }
        };
        loadState();
    }, [STORAGE_KEY, initialData, exam]);

    useEffect(() => { isSubmittingRef.current = isSubmitting; }, [isSubmitting]);

    useEffect(() => {
        if (exam.config.trackLocation && student.class !== 'PREVIEW' && 'geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserLocation(`${pos.coords.latitude}, ${pos.coords.longitude}`),
                (err) => logRef.current.push(`[System] Gagal lokasi: ${err.message}`)
            );
        }
    }, []);

    const deadline = useMemo(() => {
        if (student.class === 'PREVIEW') return Date.now() + (exam.config.timeLimit * 60 * 1000);
        const dateStr = exam.config.date.includes('T') ? exam.config.date.split('T')[0] : exam.config.date;
        const start = new Date(`${dateStr}T${exam.config.startTime}`);
        return start.getTime() + (exam.config.timeLimit * 60 * 1000);
    }, [exam]);

    const [timeLeft, setTimeLeft] = useState(0);
    
    useEffect(() => {
        const tick = () => {
            const now = Date.now();
            const diff = Math.max(0, Math.floor((deadline - now) / 1000));
            setTimeLeft(diff);
            timeLeftRef.current = diff;
            if (diff <= 0 && student.class !== 'PREVIEW' && !isSubmittingRef.current) {
                handleSubmit(true, 'completed');
            }
        };
        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [deadline]);

    const handleAnswerChange = (qId: string, val: string) => {
        setAnswers(prev => {
            const next = { ...prev, [qId]: val };
            answersRef.current = next;
            if (student.class !== 'PREVIEW') {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers: next, logs: logRef.current, lastUpdated: Date.now() }));
                setSaveStatus('saved'); 
            }
            return next;
        });
        if (student.class !== 'PREVIEW' && !exam.config.disableRealtime) {
            const now = Date.now();
            if (now - lastBroadcastTimeRef.current > 5000) {
                broadcastProgress();
                lastBroadcastTimeRef.current = now;
            }
        }
    };

    const broadcastProgress = () => {
        const totalQ = exam.questions.filter(q => q.questionType !== 'INFO').length;
        const answeredQ = Object.keys(answersRef.current).length;
        storageService.sendProgressUpdate(exam.code, student.studentId, answeredQ, totalQ).catch(()=>{});
    };

    useEffect(() => {
        if (student.class === 'PREVIEW') return;
        const handleVisChange = () => {
            if (document.hidden && exam.config.detectBehavior && !isSubmittingRef.current) {
                logRef.current.push(`[${new Date().toLocaleTimeString()}] Tab background`);
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers: answersRef.current, logs: logRef.current })); 
                if (exam.config.continueWithPermission) {
                    setIsSubmitting(true);
                    alert("PELANGGARAN: Anda meninggalkan halaman ujian. Akses dikunci.");
                    const grading = calculateGrade(exam, answersRef.current);
                    onSubmit(answersRef.current, timeLeftRef.current, 'force_closed', logRef.current, userLocation, grading);
                } else {
                    setWarningMsg("PERINGATAN: Jangan tinggalkan halaman ujian!");
                    setTimeout(() => setWarningMsg(''), 5000);
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisChange);
        return () => document.removeEventListener('visibilitychange', handleVisChange);
    }, [exam]);

    const handleSubmit = async (auto = false, status: ResultStatus = 'completed') => {
        if (!auto && !confirm("Kumpulkan jawaban dan selesaikan ujian?")) return;
        setIsSubmitting(true);
        setSaveStatus('saving');
        const grading = calculateGrade(exam, answersRef.current);
        await onSubmit(answersRef.current, timeLeftRef.current, status, logRef.current, userLocation, grading);
        if (status === 'completed' || status === 'force_closed') localStorage.removeItem(STORAGE_KEY);
    };

    const formatTime = (s: number) => {
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
        return h > 0 ? `${h}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}` : `${m}:${sec.toString().padStart(2,'0')}`;
    };

    const isAnswered = (q: Question) => {
        const v = answers[q.id];
        if (!v) return false;
        if (q.questionType === 'TRUE_FALSE' || q.questionType === 'MATCHING') {
            try { return Object.keys(JSON.parse(v)).length > 0; } catch(e) { return false; }
        }
        return v !== "";
    };

    const totalQuestions = exam.questions.filter(q => q.questionType !== 'INFO').length;
    const answeredCount = exam.questions.filter(q => q.questionType !== 'INFO' && isAnswered(q)).length;
    const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
    const optimizeHtml = (html: string) => html.replace(/<img /g, '<img loading="lazy" class="rounded-lg shadow-sm border border-slate-100 max-w-full h-auto" ');

    return (
        <div className="min-h-screen bg-[#FAFAFA] font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-32">
            <header className="fixed top-0 inset-x-0 z-[60] bg-white/80 backdrop-blur-md border-b border-slate-100 h-12 flex flex-col justify-end transition-all">
                <div className="absolute top-0 left-0 h-0.5 bg-indigo-500 transition-all duration-500" style={{width: `${progress}%`}}></div>
                <div className="flex items-center justify-between px-4 sm:px-6 h-full max-w-4xl mx-auto w-full">
                    <div className="flex items-center gap-3">
                         <span className="text-xs font-bold text-slate-800 truncate max-w-[150px]">{exam.config.subject}</span>
                         <span className="text-[9px] text-slate-400 font-medium tracking-wide flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Tersimpan</span>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold tracking-tight transition-colors ${timeLeft < 300 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-600'}`}><ClockIcon className="w-3 h-3" />{formatTime(timeLeft)}</div>
                </div>
            </header>

            {warningMsg && <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[80] bg-rose-600 text-white px-6 py-2 rounded-full shadow-lg text-xs font-bold animate-bounce flex items-center gap-2"><ExclamationTriangleIcon className="w-4 h-4" /> {warningMsg}</div>}

            <main className="max-w-3xl mx-auto px-5 sm:px-8 pt-24 space-y-12">
                {activeExam.questions.map((q, idx) => {
                    const num = activeExam.questions.slice(0, idx).filter(i => i.questionType !== 'INFO').length + 1;
                    const answered = isAnswered(q);
                    
                    return (
                        <div key={q.id} id={q.id} className="scroll-mt-28 group">
                            <div className="flex gap-4 mb-4">
                                <div className="shrink-0 pt-0.5"><span className={`text-sm font-black w-6 h-6 flex items-center justify-center rounded-lg transition-colors ${answered ? 'text-white bg-indigo-500' : 'text-slate-300 bg-slate-50'}`}>{q.questionType === 'INFO' ? 'i' : num}</span></div>
                                <div className="flex-1 space-y-5">
                                    <div className="prose prose-slate prose-sm max-w-none text-slate-700 font-medium leading-relaxed"><div dangerouslySetInnerHTML={{ __html: optimizeHtml(q.questionText) }}></div></div>

                                    <div>
                                        {/* PILIHAN GANDA (SINGLE) */}
                                        {q.questionType === 'MULTIPLE_CHOICE' && q.options && (
                                            <div className="flex flex-col gap-2">
                                                {q.options.map((opt, i) => {
                                                    const isSelected = answers[q.id] === opt;
                                                    return (
                                                        <button key={i} onClick={() => handleAnswerChange(q.id, opt)} className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex items-start gap-3 active:scale-[0.99] ${isSelected ? 'border-indigo-500 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-500' : 'border-slate-100 bg-white hover:border-indigo-200 hover:bg-slate-50'}`}>
                                                            <span className={`flex items-center justify-center w-5 h-5 rounded border text-[10px] font-bold mt-0.5 transition-colors shrink-0 ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 text-slate-400'}`}>{String.fromCharCode(65 + i)}</span>
                                                            <div className="text-sm text-slate-600 leading-snug" dangerouslySetInnerHTML={{ __html: optimizeHtml(opt) }}></div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* PILIHAN GANDA KOMPLEKS (CHECKBOX) */}
                                        {q.questionType === 'COMPLEX_MULTIPLE_CHOICE' && q.options && (
                                            <div className="flex flex-col gap-2">
                                                {q.options.map((opt, i) => {
                                                    const currentAns = answers[q.id] ? answers[q.id].split(',') : [];
                                                    const isSelected = currentAns.includes(opt);
                                                    return (
                                                        <button key={i} onClick={() => {
                                                            const newAns = isSelected ? currentAns.filter(a => a !== opt) : [...currentAns, opt];
                                                            handleAnswerChange(q.id, newAns.join(','));
                                                        }} className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex items-start gap-3 active:scale-[0.99] ${isSelected ? 'border-indigo-500 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-500' : 'border-slate-100 bg-white hover:border-indigo-200 hover:bg-slate-50'}`}>
                                                            <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors mt-0.5 shrink-0 ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 bg-white'}`}>{isSelected && <CheckCircleIcon className="w-4 h-4 text-white" />}</div>
                                                            <div className="text-sm text-slate-600 leading-snug" dangerouslySetInnerHTML={{ __html: optimizeHtml(opt) }}></div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* BENAR / SALAH */}
                                        {q.questionType === 'TRUE_FALSE' && q.trueFalseRows && (
                                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                                <table className="w-full text-sm text-slate-700">
                                                    <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="p-3 text-left font-bold w-full">Pernyataan</th><th className="p-3 text-center w-20">Benar</th><th className="p-3 text-center w-20">Salah</th></tr></thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {q.trueFalseRows.map((row, i) => {
                                                            const currentAnsObj = answers[q.id] ? JSON.parse(answers[q.id]) : {};
                                                            return (
                                                                <tr key={i} className="hover:bg-slate-50/50">
                                                                    <td className="p-3 align-top font-medium">{row.text}</td>
                                                                    <td className="p-3 align-top text-center"><input type="radio" name={`tf-${q.id}-${i}`} checked={currentAnsObj[i] === true} onChange={() => handleAnswerChange(q.id, JSON.stringify({ ...currentAnsObj, [i]: true }))} className="w-5 h-5 text-indigo-600 accent-indigo-600 cursor-pointer" /></td>
                                                                    <td className="p-3 align-top text-center"><input type="radio" name={`tf-${q.id}-${i}`} checked={currentAnsObj[i] === false} onChange={() => handleAnswerChange(q.id, JSON.stringify({ ...currentAnsObj, [i]: false }))} className="w-5 h-5 text-rose-600 accent-rose-600 cursor-pointer" /></td>
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
                                                {/* Shuffle options ALWAYS for visual display (otherwise 1st option is 1st answer) */}
                                                {(() => {
                                                    const rightOptions = useMemo(() => {
                                                        const opts = q.matchingPairs!.map(p => p.right);
                                                        // Always shuffle for matching, otherwise answers align 1:1 with questions
                                                        for (let i = opts.length - 1; i > 0; i--) { 
                                                            const j = Math.floor(Math.random() * (i + 1)); 
                                                            [opts[i], opts[j]] = [opts[j], opts[i]]; 
                                                        }
                                                        return opts;
                                                    }, [q.id]); // Removed exam.config.shuffleAnswers dependency

                                                    return q.matchingPairs.map((pair, i) => {
                                                        const currentAnsObj = answers[q.id] ? JSON.parse(answers[q.id]) : {};
                                                        return (
                                                            <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                                                                <div className="flex-1 font-medium text-slate-700 text-sm">{pair.left}</div>
                                                                <div className="hidden sm:block text-slate-300">→</div>
                                                                <div className="flex-1 relative">
                                                                    <select value={currentAnsObj[i] || ''} onChange={(e) => handleAnswerChange(q.id, JSON.stringify({ ...currentAnsObj, [i]: e.target.value }))} className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-2.5 px-4 pr-8 rounded-lg text-sm font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer">
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
                                            <textarea value={answers[q.id] || ''} onChange={e => handleAnswerChange(q.id, e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none min-h-[120px] text-sm text-slate-700 placeholder:text-slate-300 shadow-sm transition-all" placeholder="Tulis jawaban Anda di sini..." />
                                        )}

                                        {/* ISIAN SINGKAT */}
                                        {q.questionType === 'FILL_IN_THE_BLANK' && (
                                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-3 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 shadow-sm transition-all">
                                                <PencilIcon className="w-4 h-4 text-slate-400" />
                                                <input type="text" value={answers[q.id] || ''} onChange={e => handleAnswerChange(q.id, e.target.value)} className="w-full outline-none text-sm text-slate-700 bg-transparent placeholder:text-slate-300 font-medium" placeholder="Ketik jawaban singkat..." />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {idx < activeExam.questions.length - 1 && <div className="h-px bg-slate-50 w-full my-8"></div>}
                        </div>
                    );
                })}
            </main>

            <div className="fixed bottom-6 inset-x-0 flex justify-center z-50 px-4 pointer-events-none">
                <div className="bg-white/90 backdrop-blur-xl p-1.5 rounded-full shadow-2xl shadow-indigo-500/10 border border-white/50 pointer-events-auto flex items-center gap-2 pr-2">
                    <div className="pl-4 pr-2 flex flex-col justify-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Terjawab</span>
                        <span className="text-sm font-black text-slate-800 leading-none">{answeredCount}<span className="text-slate-300 font-light mx-0.5">/</span>{totalQuestions}</span>
                    </div>
                    <button onClick={() => handleSubmit(false)} disabled={isSubmitting} className="bg-indigo-600 text-white px-5 py-2.5 rounded-full font-bold text-xs hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed">
                        {isSubmitting ? '...' : 'Selesai'} <CheckCircleIcon className="w-3.5 h-3.5"/>
                    </button>
                </div>
            </div>
        </div>
    );
};
