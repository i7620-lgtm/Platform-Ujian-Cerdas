 
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Exam, Question, Result, UserProfile, AccountType } from '../../types';
import { extractTextFromPdf, parsePdfAndAutoCrop, convertPdfToImages, parseQuestionsFromPlainText } from './examUtils';
import { storageService } from '../../services/storage';
import { 
    CloudArrowUpIcon, 
    ListBulletIcon, 
    PencilIcon,
    FileTextIcon,
    CogIcon,
    ClockIcon,
    CalendarDaysIcon,
    ChartBarIcon,
    CheckCircleIcon,
    TrashIcon,
    DocumentDuplicateIcon,
    EyeIcon,
    XMarkIcon,
    ShareIcon,
    DocumentArrowUpIcon,
    TableCellsIcon,
    UserIcon,
    LockClosedIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    PrinterIcon,
    ExclamationTriangleIcon,
    PlayIcon
} from '../Icons';

// --- SHARED COMPONENTS ---

export const StatWidget: React.FC<{ label: string; value: string | number; color: string; icon?: React.FC<any> }> = ({ label, value, color, icon: Icon }) => (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md flex-1 print:border-slate-300 print:shadow-none print:rounded-lg">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-${color.split('-')[1]}-600 print:bg-transparent print:p-0`}>
            {Icon ? <Icon className="w-6 h-6 print:w-4 print:h-4" /> : <ChartBarIcon className="w-6 h-6 print:w-4 print:h-4" />}
        </div>
        <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-slate-600">{label}</p>
            <p className="text-xl sm:text-2xl font-black text-slate-800 leading-none mt-1 print:text-lg">{value}</p>
        </div>
    </div>
);

export const QuestionAnalysisItem: React.FC<{ q: Question; index: number; stats: any; examResults: Result[] }> = ({ q, index, stats, examResults }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const difficultyColor = stats.correctRate >= 80 
        ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
        : stats.correctRate >= 50 
            ? 'bg-orange-100 text-orange-700 border-orange-200' 
            : 'bg-rose-100 text-rose-700 border-rose-200';

    const difficultyLabel = stats.correctRate >= 80 ? 'Mudah' : stats.correctRate >= 50 ? 'Sedang' : 'Sulit';

    const distribution = useMemo(() => {
        const counts: Record<string, number> = {};
        let totalAnswered = 0;
        
        examResults.forEach(r => {
            const ans = r.answers[q.id];
            if (ans) {
                const normalizedAns = String(ans).trim(); 
                counts[normalizedAns] = (counts[normalizedAns] || 0) + 1;
                totalAnswered++;
            }
        });
        return { counts, totalAnswered };
    }, [examResults, q.id]);

    const correctAnswerString = useMemo(() => {
        if (q.questionType === 'MULTIPLE_CHOICE') return q.correctAnswer;
        if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') return q.correctAnswer;
        if (q.questionType === 'FILL_IN_THE_BLANK') return q.correctAnswer;
        if (q.questionType === 'TRUE_FALSE' && q.trueFalseRows) {
            const obj: Record<number, boolean> = {};
            q.trueFalseRows.forEach((r, i) => obj[i] = r.answer);
            return JSON.stringify(obj);
        }
        if (q.questionType === 'MATCHING' && q.matchingPairs) {
            const obj: Record<number, string> = {};
            q.matchingPairs.forEach((p, i) => obj[i] = p.right);
            return JSON.stringify(obj);
        }
        return null;
    }, [q]);

    const normalize = (str: string) => str.trim().toLowerCase();

    const isCorrectAnswer = (ans: string) => {
        if (!correctAnswerString) return false;
        if (ans === correctAnswerString) return true;
        if (q.questionType === 'FILL_IN_THE_BLANK' || q.questionType === 'MULTIPLE_CHOICE') {
            return normalize(ans) === normalize(correctAnswerString);
        }
        if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
            const sSet = new Set(normalize(ans).split(','));
            const cSet = new Set(normalize(correctAnswerString).split(','));
            return sSet.size === cSet.size && [...sSet].every(x => cSet.has(x));
        }
        return false;
    };

    return (
        <div className={`border rounded-2xl bg-white transition-all duration-300 overflow-hidden ${isExpanded ? 'shadow-md ring-1 ring-indigo-50 border-indigo-100' : 'border-slate-100 hover:border-indigo-100'}`}>
            <div 
                className="p-5 cursor-pointer flex flex-col gap-3"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex justify-between items-start">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Soal {index + 1}</span>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase border ${difficultyColor}`}>
                        {stats.correctRate}% Benar • {difficultyLabel}
                    </span>
                </div>
                
                <div className="text-sm text-slate-700 line-clamp-2 font-medium" dangerouslySetInnerHTML={{ __html: q.questionText }}></div>
                
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                    <div 
                        className={`h-full transition-all duration-1000 ${stats.correctRate >= 80 ? 'bg-emerald-500' : stats.correctRate >= 50 ? 'bg-orange-500' : 'bg-rose-500'}`} 
                        style={{ width: `${stats.correctRate}%` }}
                    ></div>
                </div>
                
                {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-50 animate-fade-in">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Distribusi Jawaban Siswa</p>
                        
                        {q.questionType === 'MULTIPLE_CHOICE' && q.options ? (
                            <div className="space-y-2">
                                {q.options.map((opt, i) => {
                                    const count = distribution.counts[opt] || 0;
                                    const percentage = distribution.totalAnswered > 0 ? Math.round((count / distribution.totalAnswered) * 100) : 0;
                                    const isCorrect = opt === q.correctAnswer;
                                    
                                    return (
                                        <div key={i} className={`relative flex items-center justify-between p-2 rounded-lg text-xs ${isCorrect ? 'bg-emerald-50 border border-emerald-100' : count > 0 ? 'bg-slate-50' : ''}`}>
                                            <div className="flex items-center gap-2 z-10 w-full">
                                                <span className={`w-5 h-5 flex items-center justify-center rounded font-bold ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                    {String.fromCharCode(65+i)}
                                                </span>
                                                <div className="flex-1 truncate" dangerouslySetInnerHTML={{ __html: opt }}></div>
                                                <span className="font-bold text-slate-600">{count} Siswa ({percentage}%)</span>
                                            </div>
                                            <div className={`absolute top-0 left-0 h-full rounded-lg opacity-10 ${isCorrect ? 'bg-emerald-500' : 'bg-slate-500'}`} style={{ width: `${percentage}%` }}></div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="max-h-40 overflow-y-auto custom-scrollbar bg-slate-50 p-3 rounded-xl">
                                {q.correctAnswer || (q.questionType === 'TRUE_FALSE' || q.questionType === 'MATCHING') ? (
                                    <div className="mb-2 p-2 bg-indigo-50 border border-indigo-100 rounded text-xs text-indigo-700">
                                        <span className="font-bold">Kunci Jawaban: </span> 
                                        {q.questionType === 'TRUE_FALSE' && q.trueFalseRows ? 
                                            q.trueFalseRows.map(r => `${r.text} (${r.answer?'Benar':'Salah'})`).join(', ') :
                                        q.questionType === 'MATCHING' && q.matchingPairs ?
                                            q.matchingPairs.map(p => `${p.left}→${p.right}`).join(', ') :
                                            q.correctAnswer
                                        }
                                    </div>
                                ) : null}
                                <ul className="space-y-2">
                                    {Object.entries(distribution.counts).map(([ans, count], idx) => {
                                        const isCorrect = isCorrectAnswer(ans);
                                        let displayAns = ans;
                                        try {
                                            if (ans.startsWith('{')) {
                                                const parsed = JSON.parse(ans);
                                                displayAns = Object.entries(parsed).map(([k,v]) => `${v}`).join(', ');
                                            }
                                        } catch(e){}

                                        return (
                                            <li key={idx} className={`text-xs flex justify-between border-b border-slate-100 pb-1 last:border-0 items-center ${isCorrect ? 'bg-emerald-50 p-1 rounded -mx-1 border-emerald-100' : 'text-slate-600'}`}>
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    {isCorrect && <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0"/>}
                                                    <span className={`truncate italic ${isCorrect ? 'text-emerald-700 font-medium' : ''}`}>"{displayAns}"</span>
                                                </div>
                                                <span className={`font-bold ml-2 ${isCorrect ? 'text-emerald-700' : ''}`}>{count} Siswa</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
                
                <div className="flex justify-center mt-1">
                     {isExpanded ? <ChevronUpIcon className="w-4 h-4 text-slate-300"/> : <ChevronDownIcon className="w-4 h-4 text-slate-300"/>}
                </div>
            </div>
        </div>
    );
};

export const RemainingTime: React.FC<{ exam: Exam; minimal?: boolean }> = ({ exam, minimal = false }) => {
    const calculateTimeLeft = () => {
        const dateStr = exam.config.date.includes('T') ? exam.config.date.split('T')[0] : exam.config.date;
        const examStartDateTime = new Date(`${dateStr}T${exam.config.startTime}`);
        const examEndTime = examStartDateTime.getTime() + exam.config.timeLimit * 60 * 1000;
        const now = Date.now();
        if (now < examStartDateTime.getTime()) { return { status: 'UPCOMING', diff: examStartDateTime.getTime() - now }; }
        const timeLeft = Math.max(0, examEndTime - now);
        return { status: timeLeft === 0 ? 'FINISHED' : 'ONGOING', diff: timeLeft };
    };
    const [timeState, setTimeState] = useState(calculateTimeLeft());
    useEffect(() => { const timer = setInterval(() => { setTimeState(calculateTimeLeft()); }, 1000); return () => clearInterval(timer); }, [exam]);
    if (timeState.status === 'FINISHED') return (<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200`}>Selesai</span>);
    if (timeState.status === 'UPCOMING') return (<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100`}>Belum Dimulai</span>);
    const hours = Math.floor(timeState.diff / (1000 * 60 * 60)); const minutes = Math.floor((timeState.diff % (1000 * 60 * 60)) / (1000 * 60)); const seconds = Math.floor((timeState.diff % (1000 * 60)) / 1000); const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    const totalMinutesLeft = timeState.diff / (1000 * 60); let colorClass = "bg-emerald-50 text-emerald-700 border-emerald-100"; let dotClass = "bg-emerald-500"; if (totalMinutesLeft < 5) { colorClass = "bg-rose-50 text-rose-600 border-rose-100 animate-pulse"; dotClass = "bg-rose-500"; } else if (totalMinutesLeft < 15) { colorClass = "bg-amber-50 text-amber-600 border-amber-100"; dotClass = "bg-amber-500"; }
    if (minimal) { return <span className="font-mono font-bold tracking-tight">{timeString}</span>; }
    return (<div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colorClass} transition-colors duration-500`}><span className="relative flex h-2 w-2"><span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotClass}`}></span><span className={`relative inline-flex rounded-full h-2 w-2 ${dotClass}`}></span></span><span className="font-mono text-sm font-bold tracking-widest tabular-nums">{timeString}</span></div>);
};

const MetaBadge: React.FC<{ text: string; colorClass?: string }> = ({ text, colorClass = "bg-gray-100 text-gray-600" }) => { if (!text || text === 'Lainnya') return null; return (<span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border border-opacity-50 ${colorClass}`}>{text}</span>); };

// --- 1. CREATION VIEW ---
export const CreationView: React.FC<{ onQuestionsGenerated: (questions: Question[]) => void }> = ({ onQuestionsGenerated }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [textInput, setTextInput] = useState('');
    const [activeTab, setActiveTab] = useState<'AUTO' | 'MANUAL'>('AUTO');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsProcessing(true);
            try {
                const file = e.target.files[0];
                const questions = await parsePdfAndAutoCrop(file); // Default to Auto Crop (AI Mode)
                onQuestionsGenerated(questions);
            } catch (error) {
                console.error(error);
                alert("Gagal memproses file. Pastikan format PDF valid.");
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const handleTextSubmit = () => {
        if (!textInput.trim()) return;
        setIsProcessing(true);
        try {
            const questions = parseQuestionsFromPlainText(textInput);
            onQuestionsGenerated(questions);
        } catch (e) {
            alert("Gagal memproses teks.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="text-center space-y-4">
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Buat Ujian Baru</h2>
                <p className="text-slate-500 font-medium max-w-xl mx-auto">Pilih metode pembuatan soal. Gunakan AI untuk memindai PDF secara otomatis atau tempel teks soal secara manual.</p>
            </div>

            <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 inline-flex mx-auto relative left-1/2 -translate-x-1/2">
                <button onClick={() => setActiveTab('AUTO')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'AUTO' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Upload PDF (AI)</button>
                <button onClick={() => setActiveTab('MANUAL')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'MANUAL' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Teks Manual</button>
            </div>

            {activeTab === 'AUTO' ? (
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-3 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/30 rounded-[2.5rem] p-12 text-center cursor-pointer transition-all group relative overflow-hidden"
                >
                    <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileChange} />
                    <div className="relative z-10 space-y-4">
                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-sm group-hover:scale-110 transition-transform duration-300">
                            {isProcessing ? <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div> : <CloudArrowUpIcon className="w-10 h-10 text-indigo-500" />}
                        </div>
                        <div>
                            <p className="text-lg font-bold text-slate-700 group-hover:text-indigo-700 transition-colors">Klik untuk Upload Soal (PDF)</p>
                            <p className="text-sm text-slate-400 mt-1">Sistem akan otomatis mendeteksi dan memotong soal bergambar.</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                    <textarea 
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder={`Contoh Format:\n1. Apa ibukota Indonesia?\nA. Bandung\nB. Jakarta\nC. Surabaya\nKunci: B`}
                        className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-200 focus:bg-white outline-none text-sm font-mono leading-relaxed resize-none"
                    />
                    <button 
                        onClick={handleTextSubmit}
                        disabled={!textInput.trim() || isProcessing}
                        className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50"
                    >
                        {isProcessing ? 'Memproses...' : 'Proses Teks'}
                    </button>
                </div>
            )}
        </div>
    );
};

// --- 2. DRAFTS VIEW ---
export const DraftsView: React.FC<{ exams: Exam[]; onContinueDraft: (exam: Exam) => void; onDeleteDraft: (exam: Exam) => void }> = ({ exams, onContinueDraft, onDeleteDraft }) => {
    if (exams.length === 0) return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300"><FileTextIcon className="w-10 h-10" /></div>
            <h3 className="text-lg font-bold text-slate-700">Belum ada draf</h3>
            <p className="text-slate-400 text-sm max-w-xs mx-auto mt-2">Mulai buat ujian baru dan simpan sebagai draf untuk menyelesaikannya nanti.</p>
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {exams.map(exam => (
                <div key={exam.code} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase rounded-full tracking-wider border border-amber-100">Draf</span>
                        <button onClick={() => onDeleteDraft(exam)} className="text-slate-300 hover:text-rose-500 transition-colors"><TrashIcon className="w-5 h-5" /></button>
                    </div>
                    <h3 className="font-bold text-lg text-slate-800 mb-2 line-clamp-1 group-hover:text-indigo-600 transition-colors">{exam.config.subject || 'Tanpa Judul'}</h3>
                    <p className="text-xs text-slate-500 mb-6 line-clamp-2">{exam.config.description || 'Tidak ada deskripsi.'}</p>
                    <div className="flex gap-2">
                        <button onClick={() => onContinueDraft(exam)} className="flex-1 py-2.5 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 text-xs font-bold rounded-xl border border-slate-200 hover:border-indigo-200 transition-all flex items-center justify-center gap-2">
                            <PencilIcon className="w-3.5 h-3.5" /> Lanjut Edit
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- 3. ONGOING EXAMS VIEW ---
export const OngoingExamsView: React.FC<{ exams: Exam[]; results: Result[]; onSelectExam: (exam: Exam) => void; onDuplicateExam: (exam: Exam) => void }> = ({ exams, results, onSelectExam, onDuplicateExam }) => {
    if (exams.length === 0) return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4 text-indigo-200"><PlayIcon className="w-10 h-10" /></div>
            <h3 className="text-lg font-bold text-slate-700">Tidak ada ujian aktif</h3>
            <p className="text-slate-400 text-sm mt-2">Ujian yang sedang berlangsung akan muncul di sini.</p>
        </div>
    );

    return (
        <div className="space-y-4 animate-fade-in">
            {exams.map(exam => {
                const examResults = results.filter(r => r.examCode === exam.code);
                const participants = examResults.length;
                const avgScore = participants > 0 ? Math.round(examResults.reduce((a, b) => a + b.score, 0) / participants) : 0;

                return (
                    <div key={exam.code} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-center gap-6">
                        <div className="flex-1 w-full">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <h3 className="font-bold text-lg text-slate-800">{exam.config.subject}</h3>
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-black font-mono rounded">{exam.code}</span>
                            </div>
                            <div className="flex flex-wrap gap-4 text-xs text-slate-500 font-medium">
                                <span className="flex items-center gap-1"><UserIcon className="w-3.5 h-3.5"/> {participants} Peserta</span>
                                <span className="flex items-center gap-1"><ChartBarIcon className="w-3.5 h-3.5"/> Rata-rata: {avgScore}</span>
                                <span className="flex items-center gap-1"><ClockIcon className="w-3.5 h-3.5"/> Berakhir: {new Date(`${exam.config.date.split('T')[0]}T${exam.config.startTime}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                            <button onClick={() => onDuplicateExam(exam)} className="px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold text-xs transition-all" title="Duplikat"><DocumentDuplicateIcon className="w-4 h-4"/></button>
                            <button onClick={() => onSelectExam(exam)} className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 font-bold text-xs transition-all flex items-center gap-2">
                                <EyeIcon className="w-4 h-4"/> Pantau Live
                            </button>
                        </div>
                    </div>
                )
            })}
        </div>
    );
};

// --- 4. UPCOMING EXAMS VIEW ---
export const UpcomingExamsView: React.FC<{ exams: Exam[]; onEditExam: (exam: Exam) => void }> = ({ exams, onEditExam }) => {
    if (exams.length === 0) return <div className="text-center py-20 text-slate-400 italic text-sm">Tidak ada ujian terjadwal.</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            {exams.map(exam => (
                <div key={exam.code} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-100 transition-all group">
                    <div className="flex gap-4 items-start">
                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex flex-col items-center justify-center text-indigo-600 shrink-0">
                            <span className="text-lg font-black leading-none">{new Date(exam.config.date).getDate()}</span>
                            <span className="text-[10px] font-bold uppercase">{new Date(exam.config.date).toLocaleString('default', { month: 'short' })}</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">{exam.config.subject}</h3>
                            <p className="text-xs text-slate-500 mb-3 flex items-center gap-2"><ClockIcon className="w-3 h-3"/> Mulai {exam.config.startTime} • {exam.config.timeLimit} Menit</p>
                            <button onClick={() => onEditExam(exam)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">Edit Detail</button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- 5. FINISHED EXAMS VIEW ---
export const FinishedExamsView: React.FC<{ exams: Exam[]; onSelectExam: (exam: Exam) => void; onDuplicateExam: (exam: Exam) => void; onDeleteExam: (exam: Exam) => void; onArchiveExam: (exam: Exam) => void }> = ({ exams, onSelectExam, onDuplicateExam, onDeleteExam, onArchiveExam }) => {
    if (exams.length === 0) return <div className="text-center py-20 text-slate-400 italic text-sm">Belum ada ujian yang selesai.</div>;

    return (
        <div className="space-y-4 animate-fade-in">
            {exams.map(exam => (
                <div key={exam.code} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-center gap-6 group">
                    <div className="flex-1 w-full">
                        <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                            {exam.config.subject}
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded border border-emerald-100">Selesai</span>
                        </h3>
                        <p className="text-xs text-slate-500">{new Date(exam.config.date).toLocaleDateString('id-ID', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})}</p>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <button onClick={() => onSelectExam(exam)} className="flex-1 md:flex-none px-4 py-2 bg-indigo-50 text-indigo-600 font-bold text-xs rounded-xl hover:bg-indigo-100 transition-colors">Lihat Hasil</button>
                        <button onClick={() => onDuplicateExam(exam)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors" title="Gunakan Ulang"><DocumentDuplicateIcon className="w-5 h-5"/></button>
                        <button onClick={() => onArchiveExam(exam)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Arsipkan & Hapus"><DocumentArrowUpIcon className="w-5 h-5"/></button>
                        <button onClick={() => onDeleteExam(exam)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Hapus Permanen"><TrashIcon className="w-5 h-5"/></button>
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- 6. USER MANAGEMENT VIEW (Super Admin) ---
export const UserManagementView: React.FC = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const data = await storageService.getAllUsers();
                setUsers(data);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    const handleRoleChange = async (userId: string, newRole: AccountType, newSchool: string) => {
        if (!confirm("Ubah hak akses pengguna ini?")) return;
        try {
            await storageService.updateUserRole(userId, newRole, newSchool);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, accountType: newRole, school: newSchool } : u));
        } catch (e) {
            alert("Gagal mengubah role.");
        }
    };

    if (isLoading) return <div className="text-center py-20 text-slate-400 font-bold">Memuat pengguna...</div>;

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-slate-50">
                <h3 className="font-bold text-lg text-slate-800">Manajemen Pengguna</h3>
                <p className="text-xs text-slate-500">Kelola akses guru dan admin sekolah.</p>
            </div>
            <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <tr>
                        <th className="px-6 py-4">Nama</th>
                        <th className="px-6 py-4">Sekolah</th>
                        <th className="px-6 py-4">Role Saat Ini</th>
                        <th className="px-6 py-4 text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                    {users.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/50">
                            <td className="px-6 py-4 font-bold text-slate-700">{u.fullName}</td>
                            <td className="px-6 py-4 text-slate-600">{u.school}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${u.accountType === 'guru' ? 'bg-slate-100 text-slate-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                    {u.accountType.replace('_', ' ')}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <select 
                                    value={u.accountType} 
                                    onChange={(e) => handleRoleChange(u.id, e.target.value as AccountType, u.school)}
                                    className="bg-white border border-slate-200 text-xs font-bold rounded-lg px-2 py-1 outline-none focus:border-indigo-300"
                                >
                                    <option value="guru">Guru</option>
                                    <option value="admin_sekolah">Admin Sekolah</option>
                                </select>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


// --- ARCHIVE VIEWER (ENHANCED) ---
interface ArchiveViewerProps {
    onReuseExam: (exam: Exam) => void;
}

type ArchiveData = {
    exam: Exam;
    results: Result[];
};

type ArchiveTab = 'DETAIL' | 'STUDENTS' | 'ANALYSIS';

export const ArchiveViewer: React.FC<ArchiveViewerProps> = ({ onReuseExam }) => {
    const [archiveData, setArchiveData] = useState<ArchiveData | null>(null);
    const [error, setError] = useState<string>('');
    const [fixMessage, setFixMessage] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState<ArchiveTab>('DETAIL');
    const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

    const normalize = (str: string) => str.trim().toLowerCase();

    const checkAnswerStatus = (q: Question, studentAnswers: Record<string, string>) => {
        const ans = studentAnswers[q.id];
        if (!ans) return 'EMPTY';

        const studentAns = normalize(String(ans));
        const correctAns = normalize(String(q.correctAnswer || ''));

        if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
            return studentAns === correctAns ? 'CORRECT' : 'WRONG';
        } 
        else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
            const sSet = new Set(studentAns.split(',').map(s=>s.trim()));
            const cSet = new Set(correctAns.split(',').map(s=>s.trim()));
            if (sSet.size === cSet.size && [...sSet].every(x => cSet.has(x))) return 'CORRECT';
            return 'WRONG';
        }
        else if (q.questionType === 'TRUE_FALSE') {
             try {
                const ansObj = JSON.parse(ans);
                const allCorrect = q.trueFalseRows?.every((row, idx) => ansObj[idx] === row.answer);
                return allCorrect ? 'CORRECT' : 'WRONG';
            } catch(e) { return 'WRONG'; }
        }
        else if (q.questionType === 'MATCHING') {
            try {
                const ansObj = JSON.parse(ans);
                const allCorrect = q.matchingPairs?.every((pair, idx) => ansObj[idx] === pair.right);
                return allCorrect ? 'CORRECT' : 'WRONG';
            } catch(e) { return 'WRONG'; }
        }

        return 'WRONG'; 
    };

    // Strict recalculation for Archive
    const getCalculatedStats = (r: Result, exam: Exam) => {
        let correct = 0;
        let empty = 0;
        const scorableQuestions = exam.questions.filter(q => q.questionType !== 'INFO');
        
        scorableQuestions.forEach(q => {
            const status = checkAnswerStatus(q, r.answers);
            if (status === 'CORRECT') correct++;
            else if (status === 'EMPTY') empty++;
        });

        const total = scorableQuestions.length;
        const wrong = total - correct - empty;
        const score = total > 0 ? Math.round((correct / total) * 100) : 0;
        
        return { correct, wrong, empty, score };
    };

    // AUTO FIX & DOWNLOAD LOGIC
    useEffect(() => {
        if (!archiveData) return;
        
        let mismatchCount = 0;
        const fixedResults = archiveData.results.map(r => {
            const stats = getCalculatedStats(r, archiveData.exam);
            
            // Periksa apakah nilai tersimpan berbeda dengan hasil hitung ulang
            if (stats.score !== r.score || stats.correct !== r.correctAnswers) {
                mismatchCount++;
                return {
                    ...r,
                    score: stats.score,
                    correctAnswers: stats.correct,
                    totalQuestions: stats.empty + stats.wrong + stats.correct // Refresh total
                };
            }
            return r;
        });

        if (mismatchCount > 0) {
            setFixMessage(`Ditemukan ${mismatchCount} data nilai tidak sinkron. File perbaikan telah diunduh otomatis.`);
            
            // Update state visual dengan data yang sudah diperbaiki
            setArchiveData(prev => prev ? ({ ...prev, results: fixedResults }) : null);

            // Auto Trigger Download
            const fixedArchive = { ...archiveData, results: fixedResults };
            const jsonString = JSON.stringify(fixedArchive, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `CORRECTED_ARSIP_${archiveData.exam.code}_${Date.now()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    }, [archiveData?.exam.code]); // Run once when exam code loads (new file loaded)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
    };
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation();
    };

    const processFile = (file: File) => {
        setError('');
        setFixMessage('');
        if (file.type !== 'application/json') {
            setError('File harus berformat .json');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const result = event.target?.result;
                if (typeof result === 'string') {
                    const data: ArchiveData = JSON.parse(result);
                    if (data && data.exam && data.exam.questions && data.exam.config && Array.isArray(data.results)) {
                        setArchiveData(data);
                        setActiveTab('DETAIL');
                    } else {
                        setError('File JSON tidak valid atau bukan format arsip lengkap.');
                    }
                }
            } catch (e) {
                setError('Gagal membaca file. Pastikan file berformat JSON yang benar.');
            }
        };
        reader.onerror = () => setError('Terjadi kesalahan saat membaca file.');
        reader.readAsText(file);
    };

    const resetView = () => {
        setArchiveData(null); setError(''); setFixMessage('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handlePrint = () => {
        window.print();
    };

    const toggleStudent = (id: string) => {
        if (expandedStudent === id) setExpandedStudent(null);
        else setExpandedStudent(id);
    };

    // Calculate Question Stats for Analysis Tab (Detailed)
    const questionAnalysisData = useMemo(() => {
        if (!archiveData) return [];
        const { exam, results } = archiveData;
        const totalStudents = results.length;

        return exam.questions.filter(q => q.questionType !== 'INFO').map(q => {
            let correctCount = 0;
            const answerCounts: Record<string, number> = {};
            
            results.forEach(r => {
                const ans = r.answers[q.id];
                if (checkAnswerStatus(q, r.answers) === 'CORRECT') correctCount++;
                if (ans) {
                    // Normalize for distribution counting
                    const cleanAns = String(ans).trim();
                    answerCounts[cleanAns] = (answerCounts[cleanAns] || 0) + 1;
                }
            });

            return {
                id: q.id,
                qText: q.questionText,
                correctRate: totalStudents > 0 ? Math.round((correctCount / totalStudents) * 100) : 0,
                distribution: answerCounts,
                totalStudents,
                options: q.options
            };
        });
    }, [archiveData]);

    // Calculate Question Stats for Visual Analysis Tab (Legacy)
    const questionStats = useMemo(() => {
        if (!archiveData) return [];
        const { exam, results } = archiveData;
        const totalStudents = results.length;

        return exam.questions.filter(q => q.questionType !== 'INFO').map(q => {
            let correctCount = 0;
            results.forEach(r => {
                if (checkAnswerStatus(q, r.answers) === 'CORRECT') correctCount++;
            });
            return {
                id: q.id,
                correctRate: totalStudents > 0 ? Math.round((correctCount / totalStudents) * 100) : 0
            };
        });
    }, [archiveData]);

    // --- UPLOAD VIEW ---
    if (!archiveData) {
        return (
            <div className="max-w-4xl mx-auto text-center animate-fade-in p-8 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="mb-8"><div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4"><DocumentArrowUpIcon className="w-8 h-8" /></div><h2 className="text-2xl font-bold text-slate-800">Buka Arsip Ujian</h2><p className="text-sm text-slate-500 mt-2">Pilih file arsip ujian (.json) untuk melihat detail soal, hasil siswa, dan analisisnya.</p></div>
                <div onDrop={handleDrop} onDragOver={handleDragOver} className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:bg-slate-50 transition-colors relative cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    <div className="space-y-2 pointer-events-none"><CloudArrowUpIcon className="w-12 h-12 text-slate-400 mx-auto" /><p className="text-slate-600 font-medium">Seret file ke sini atau klik untuk memilih</p><p className="text-xs text-slate-400">Hanya file .json yang berisi data ujian dan hasil siswa.</p></div>
                </div>
                {error && <div className="mt-6 p-4 bg-rose-50 text-rose-700 text-sm rounded-xl border border-rose-100"><strong>Error:</strong> {error}</div>}
            </div>
        );
    }
    
    // --- DISPLAY VIEW ---
    const { exam, results } = archiveData;
    const totalStudents = results.length;
    const averageScore = totalStudents > 0 ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / totalStudents) : 0;
    const highestScore = totalStudents > 0 ? Math.max(...results.map(r => r.score)) : 0;
    const lowestScore = totalStudents > 0 ? Math.min(...results.map(r => r.score)) : 0;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <style>{`
                @media print {
                    @page { margin: 1cm; size: portrait; }
                    body { -webkit-print-color-adjust: exact; background: white !important; }
                    .no-print { display: none !important; }
                    .print-only { display: block !important; }
                    .max-w-5xl { max-width: none !important; margin: 0 !important; }
                    table { border-collapse: collapse; width: 100%; font-size: 10px; }
                    th, td { border: 1px solid #cbd5e1; padding: 4px; }
                    .page-break { page-break-before: always; }
                    .avoid-break { break-inside: avoid; page-break-inside: avoid; }
                }
            `}</style>

            {fixMessage && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-center gap-3 animate-fade-in shadow-sm">
                    <ExclamationTriangleIcon className="w-6 h-6 shrink-0 text-amber-600" />
                    <div className="flex-1">
                        <p className="text-sm font-bold">Auto-Correction Active</p>
                        <p className="text-xs">{fixMessage}</p>
                    </div>
                </div>
            )}

            {/* INTERACTIVE HEADER (HIDDEN ON PRINT) */}
            <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm print:hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Pratinjau Arsip: <span className="text-indigo-600">{exam.config.subject}</span></h2>
                        <p className="text-sm text-slate-500 mt-1 font-mono">{exam.code} • {exam.createdAt ? `Diarsipkan pada ${exam.createdAt}` : 'Tanggal tidak diketahui'}</p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button onClick={resetView} className="flex-1 md:flex-none px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold uppercase rounded-lg hover:bg-slate-200 transition-all">Muat Lain</button>
                         <button onClick={handlePrint} className="flex-1 md:flex-none px-4 py-2 bg-white text-slate-600 text-xs font-bold uppercase rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-all border border-slate-200 flex items-center justify-center gap-2 shadow-sm"><PrinterIcon className="w-4 h-4"/> Print Arsip</button>
                        <button onClick={() => onReuseExam(exam)} className="flex-1 md:flex-none px-4 py-2 bg-indigo-600 text-white text-xs font-bold uppercase rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 flex items-center gap-2"><DocumentDuplicateIcon className="w-4 h-4"/> Gunakan Ulang</button>
                    </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex gap-4">
                    {(['DETAIL', 'STUDENTS', 'ANALYSIS'] as ArchiveTab[]).map(tab => {
                        const label = tab === 'DETAIL' ? 'Detail Ujian' : tab === 'STUDENTS' ? `Rekap Siswa (${totalStudents})` : 'Analisis Soal';
                        return <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === tab ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>{label}</button>
                    })}
                </div>
            </div>

            {/* INTERACTIVE CONTENT (HIDDEN ON PRINT) */}
            <div className="animate-fade-in print:hidden">
                {activeTab === 'DETAIL' && (
                    <div className="space-y-4">
                        {exam.questions.map((q, index) => {
                            const questionNumber = exam.questions.slice(0, index).filter(i => i.questionType !== 'INFO').length + 1;
                            return (
                                <div key={q.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="flex items-start gap-4">
                                        <span className="flex-shrink-0 mt-1 text-sm font-bold w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500">{q.questionType === 'INFO' ? 'i' : questionNumber}</span>
                                        <div className="flex-1 space-y-4 min-w-0">
                                            <div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: q.questionText }}></div>
                                            {q.questionType === 'MULTIPLE_CHOICE' && q.options && q.options.map((opt, i) => <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${q.correctAnswer === opt ? 'bg-emerald-50 border-emerald-200 font-bold text-emerald-800' : 'bg-slate-50 border-slate-100 text-slate-600'}`}><span className="font-bold">{String.fromCharCode(65 + i)}.</span><div className="flex-1" dangerouslySetInnerHTML={{ __html: opt }}></div>{q.correctAnswer === opt && <CheckCircleIcon className="w-5 h-5 text-emerald-500 ml-auto shrink-0"/>}</div>)}
                                            {q.questionType === 'COMPLEX_MULTIPLE_CHOICE' && q.options && q.options.map((opt, i) => <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${q.correctAnswer?.includes(opt) ? 'bg-emerald-50 border-emerald-200 font-bold text-emerald-800' : 'bg-slate-50 border-slate-100 text-slate-600'}`}><span className="font-bold">{String.fromCharCode(65 + i)}.</span><div className="flex-1" dangerouslySetInnerHTML={{ __html: opt }}></div>{q.correctAnswer?.includes(opt) && <CheckCircleIcon className="w-5 h-5 text-emerald-500 ml-auto shrink-0"/>}</div>)}
                                            {q.questionType === 'TRUE_FALSE' && q.trueFalseRows && <div className="border border-slate-200 rounded-lg overflow-hidden"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="p-2 font-bold text-slate-600 text-left">Pernyataan</th><th className="p-2 font-bold text-slate-600 text-center w-32">Jawaban</th></tr></thead><tbody>{q.trueFalseRows.map((r, i) => <tr key={i} className="border-t border-slate-100"><td className="p-2">{r.text}</td><td className={`p-2 text-center font-bold ${r.answer ? 'text-emerald-700 bg-emerald-50':'text-rose-700 bg-rose-50'}`}>{r.answer ? 'Benar':'Salah'}</td></tr>)}</tbody></table></div>}
                                            {q.questionType === 'MATCHING' && q.matchingPairs && <div className="space-y-2">{q.matchingPairs.map((p,i) => <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 text-sm"><div className="flex-1 font-medium">{p.left}</div><div className="text-slate-300">→</div><div className="flex-1 font-bold">{p.right}</div></div>)}</div>}
                                            {(q.questionType === 'ESSAY' || q.questionType === 'FILL_IN_THE_BLANK') && q.correctAnswer && <div className="mt-4 pt-3 border-t"><p className="text-[10px] font-bold text-slate-400 uppercase">Kunci Jawaban</p><div className="mt-1 p-3 rounded-lg bg-slate-50 text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{__html: q.correctAnswer}}></div></div>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                {activeTab === 'STUDENTS' && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                         <table className="w-full text-left">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Siswa</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kelas</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Nilai</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">B/S/K</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Aktivitas</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Lokasi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {results.map(r => {
                                    const { correct, wrong, empty, score } = getCalculatedStats(r, exam);
                                    return (
                                    <React.Fragment key={r.student.studentId}>
                                        <tr onClick={() => toggleStudent(r.student.studentId)} className="hover:bg-slate-50/30 cursor-pointer group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={`transition-transform duration-300 ${expandedStudent === r.student.studentId ? 'rotate-180' : ''}`}>
                                                        <ChevronDownIcon className="w-4 h-4 text-slate-300 group-hover:text-indigo-500" />
                                                    </div>
                                                    <div className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{r.student.fullName}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{r.student.class}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-sm font-black px-2 py-1 rounded ${score >= 75 ? 'text-emerald-600 bg-emerald-50' : score >= 50 ? 'text-orange-600 bg-orange-50' : 'text-rose-600 bg-rose-50'}`}>
                                                    {score}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center text-xs font-bold text-slate-600">
                                                <span className="text-emerald-600" title="Benar">{correct}</span> / <span className="text-rose-600" title="Salah">{wrong}</span> / <span className="text-slate-400" title="Kosong">{empty}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {r.activityLog && r.activityLog.length > 0 ? (
                                                    <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded font-bold text-[10px] border border-amber-100">{r.activityLog.length} Log</span>
                                                ) : (
                                                    <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded font-bold text-[10px] border border-emerald-100">Aman</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center text-xs text-slate-500 font-mono">
                                                {exam.config.trackLocation && r.location ? (
                                                    <a href={`https://www.google.com/maps?q=${r.location}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:underline flex items-center justify-center gap-1">Maps ↗</a>
                                                ) : '-'}
                                            </td>
                                        </tr>
                                        {expandedStudent === r.student.studentId && (
                                            <tr className="animate-fade-in bg-slate-50/50 shadow-inner">
                                                <td colSpan={6} className="p-6">
                                                    <div className="flex items-center gap-4 mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                                        <span className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-300 rounded"></div> Benar</span>
                                                        <span className="flex items-center gap-1"><div className="w-3 h-3 bg-rose-300 rounded"></div> Salah</span>
                                                        <span className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-200 rounded"></div> Kosong</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {exam.questions.filter(q => q.questionType !== 'INFO').map((q, idx) => {
                                                            const status = checkAnswerStatus(q, r.answers);
                                                            let bgClass = 'bg-slate-200'; 
                                                            if (status === 'CORRECT') bgClass = 'bg-emerald-300';
                                                            else if (status === 'WRONG') bgClass = 'bg-rose-300';
                                                            return <div key={q.id} title={`Soal ${idx+1}: ${status === 'CORRECT' ? 'Benar' : status === 'EMPTY' ? 'Kosong' : 'Salah'}`} className={`w-6 h-6 flex items-center justify-center rounded text-[10px] font-bold text-slate-900 ${bgClass} cursor-help transition-transform hover:scale-110`}>{idx + 1}</div>;
                                                        })}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                )})}
                            </tbody>
                         </table>
                    </div>
                )}
                {activeTab === 'ANALYSIS' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                             <StatWidget label="Rata-rata" value={averageScore} color="bg-indigo-50" icon={ChartBarIcon} />
                             <StatWidget label="Tertinggi" value={highestScore} color="bg-emerald-50" icon={CheckCircleIcon} />
                             <StatWidget label="Terendah" value={lowestScore} color="bg-rose-50" icon={XMarkIcon} />
                             <StatWidget label="Partisipan" value={totalStudents} color="bg-blue-50" icon={UserIcon} />
                        </div>
                        <div><h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><TableCellsIcon className="w-5 h-5 text-slate-400"/> Analisis Butir Soal</h3><div className="grid grid-cols-1 gap-4">{exam.questions.filter(q => q.questionType !== 'INFO').map((q, idx) => { const stats = questionStats.find(s => s.id === q.id) || { correctRate: 0 }; return <QuestionAnalysisItem key={q.id} q={q} index={idx} stats={stats} examResults={results} />; })}</div></div>
                    </div>
                )}
            </div>
            
            {/* PRINT VIEW (Clean & Sequential) */}
            <div className="hidden print:block text-slate-900">
                {/* Global Header for First Page */}
                <div className="border-b-2 border-slate-900 pb-2 mb-6">
                    <h1 className="text-xl font-black uppercase tracking-tight">{exam.config.subject}</h1>
                    <div className="flex justify-between items-end mt-1">
                        <div>
                            <p className="text-xs font-bold text-slate-600">Kode: <span className="font-mono text-slate-900">{exam.code}</span> | {new Date(exam.config.date).toLocaleDateString('id-ID')} | {exam.authorSchool || '-'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-slate-500">Arsip Lengkap Ujian</p>
                        </div>
                    </div>
                </div>

                {/* 1. REKAPITULASI SISWA */}
                <div className="mb-4">
                    <h3 className="font-bold text-sm uppercase tracking-wider mb-2 border-l-4 border-slate-800 pl-2">1. Rekapitulasi Hasil Siswa</h3>
                    <table className="w-full border-collapse border border-slate-300 text-[10px]">
                        <thead>
                            <tr className="bg-slate-100">
                                <th className="border border-slate-300 p-2 text-left w-8">No</th>
                                <th className="border border-slate-300 p-2 text-left w-32">Nama Siswa</th>
                                <th className="border border-slate-300 p-2 text-left w-16">Kelas</th>
                                <th className="border border-slate-300 p-2 text-center w-12">Nilai</th>
                                <th className="border border-slate-300 p-2 text-left">Rincian Jawaban (Grid)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((r, index) => {
                                const { score } = getCalculatedStats(r, exam);
                                return (
                                    <tr key={r.student.studentId} className="avoid-break">
                                        <td className="border border-slate-300 p-2 text-center">{index + 1}</td>
                                        <td className="border border-slate-300 p-2 font-bold">{r.student.fullName}</td>
                                        <td className="border border-slate-300 p-2 uppercase">{r.student.class}</td>
                                        <td className="border border-slate-300 p-2 text-center font-bold text-sm">{score}</td>
                                        <td className="border border-slate-300 p-1">
                                            <div className="flex flex-wrap gap-0.5">
                                                {exam.questions.filter(q => q.questionType !== 'INFO').map((q, idx) => {
                                                    const status = checkAnswerStatus(q, r.answers);
                                                    let bgClass = 'bg-slate-200'; 
                                                    if (status === 'CORRECT') bgClass = 'bg-emerald-300';
                                                    else if (status === 'WRONG') bgClass = 'bg-rose-300';
                                                    
                                                    return (
                                                        <div 
                                                            key={q.id} 
                                                            className={`w-4 h-4 flex items-center justify-center text-[8px] font-bold text-black border border-black/10 ${bgClass}`}
                                                        >
                                                            {idx + 1}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <div className="mt-2 flex gap-4 text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                        <span className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-300 border border-black/10"></div> Benar</span>
                        <span className="flex items-center gap-1"><div className="w-3 h-3 bg-rose-300 border border-black/10"></div> Salah</span>
                        <span className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-200 border border-black/10"></div> Kosong</span>
                    </div>
                </div>

                <div className="page-break"></div>

                {/* 2. ANALISIS STATISTIK & BUTIR SOAL */}
                <div className="mb-4">
                    <div className="border-b-2 border-slate-900 pb-2 mb-4">
                        <h1 className="text-lg font-black uppercase tracking-tight">2. Analisis Statistik & Butir Soal</h1>
                    </div>
                    
                    {/* Kotak Statistik Utama */}
                    <div className="mb-6 grid grid-cols-4 gap-4 border border-slate-300 rounded p-4 text-center avoid-break">
                        <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase">Rata-rata</p>
                            <p className="text-xl font-black">{averageScore}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase">Tertinggi</p>
                            <p className="text-xl font-black text-emerald-600">{highestScore}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase">Terendah</p>
                            <p className="text-xl font-black text-rose-600">{lowestScore}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase">Partisipan</p>
                            <p className="text-xl font-black text-blue-600">{totalStudents}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {questionAnalysisData.map((data, idx) => (
                            <div key={data.id} className="avoid-break border border-slate-300 rounded p-3 text-xs flex flex-col gap-2">
                                <div>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-slate-600">Soal {idx + 1}</span>
                                        <span className="font-bold text-slate-800">{data.correctRate}% Benar</span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 line-clamp-1 italic mb-1" dangerouslySetInnerHTML={{ __html: data.qText.replace(/<[^>]+>/g, '') }}></div>
                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                                        <div className={`h-full ${data.correctRate > 75 ? 'bg-emerald-500' : data.correctRate > 40 ? 'bg-orange-400' : 'bg-rose-500'}`} style={{ width: `${data.correctRate}%` }}></div>
                                    </div>
                                </div>
                                <div className="border-t border-slate-100 pt-2">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Distribusi Jawaban:</p>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-slate-600">
                                        {data.options && data.options.map((opt, i) => {
                                            const label = String.fromCharCode(65+i);
                                            const count = data.distribution[opt] || 0;
                                            const pct = totalStudents > 0 ? Math.round((count/totalStudents)*100) : 0;
                                            const isCorrect = opt === exam.questions.find(q=>q.id===data.id)?.correctAnswer;
                                            
                                            return (
                                                <span key={i} className={`${isCorrect ? 'font-bold text-emerald-700' : ''}`}>
                                                    {label}: <b>{count}</b> ({pct}%)
                                                </span>
                                            )
                                        })}
                                        {/* Fallback for non-multiple choice */}
                                        {!data.options && Object.entries(data.distribution).slice(0, 3).map(([ans, count], i) => (
                                            <span key={i} className="truncate max-w-[100px]">{ans}: <b>{count}</b></span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="page-break"></div>

                {/* 3. DETAIL UJIAN & KUNCI */}
                <div>
                    <div className="border-b-2 border-slate-900 pb-2 mb-4">
                        <h1 className="text-lg font-black uppercase tracking-tight">3. Bank Soal & Kunci Jawaban</h1>
                    </div>
                    
                    <div className="space-y-4">
                        {exam.questions.map((q, index) => {
                            const questionNumber = exam.questions.slice(0, index).filter(i => i.questionType !== 'INFO').length + 1;
                            return (
                                <div key={q.id} className="avoid-break border-b border-slate-200 pb-4 last:border-0">
                                    <div className="flex gap-3">
                                        <span className="font-bold text-sm w-6">{q.questionType === 'INFO' ? 'i' : questionNumber}.</span>
                                        <div className="flex-1">
                                            <div className="text-xs text-slate-800 mb-2 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: q.questionText }}></div>
                                            
                                            {/* MULTIPLE CHOICE & COMPLEX */}
                                            {q.options && (
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                                                    {q.options.map((opt, i) => {
                                                        const isCorrect = 
                                                            (q.questionType === 'MULTIPLE_CHOICE' && opt === q.correctAnswer) ||
                                                            (q.questionType === 'COMPLEX_MULTIPLE_CHOICE' && q.correctAnswer?.includes(opt));
                                                        
                                                        return (
                                                            <div 
                                                                key={i} 
                                                                className={`flex gap-1 p-1 rounded border ${isCorrect ? 'bg-emerald-100 border-emerald-300 font-bold text-emerald-900' : 'border-transparent'}`}
                                                            >
                                                                <span>{String.fromCharCode(65+i)}.</span>
                                                                <div dangerouslySetInnerHTML={{__html: opt}}></div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}

                                            {/* TRUE FALSE - Explicit Table */}
                                            {q.questionType === 'TRUE_FALSE' && q.trueFalseRows && (
                                                <div className="mt-2 border border-slate-200 rounded overflow-hidden">
                                                    <table className="w-full text-[10px]">
                                                        <thead className="bg-slate-50">
                                                            <tr>
                                                                <th className="p-1.5 text-left font-bold text-slate-600">Pernyataan</th>
                                                                <th className="p-1.5 text-center w-20 font-bold text-slate-600">Kunci</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {q.trueFalseRows.map((row, rIdx) => (
                                                                <tr key={rIdx}>
                                                                    <td className="p-1.5">{row.text}</td>
                                                                    <td className={`p-1.5 text-center font-bold ${row.answer ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                        {row.answer ? 'BENAR' : 'SALAH'}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}

                                            {/* MATCHING - Explicit Pairs */}
                                            {q.questionType === 'MATCHING' && q.matchingPairs && (
                                                <div className="mt-2 text-[10px] bg-slate-50 p-2 rounded border border-slate-200">
                                                    <p className="font-bold text-slate-500 text-[9px] uppercase mb-1">Kunci Pasangan:</p>
                                                    <div className="grid grid-cols-1 gap-1">
                                                        {q.matchingPairs.map((pair, pIdx) => (
                                                            <div key={pIdx} className="flex items-center gap-2">
                                                                <span className="font-medium bg-white px-1.5 py-0.5 rounded border border-slate-200">{pair.left}</span>
                                                                <span className="text-slate-400 text-[9px]">●──●</span>
                                                                <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">{pair.right}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* ESSAY / ISIAN - Explicit Text */}
                                            {(q.questionType === 'ESSAY' || q.questionType === 'FILL_IN_THE_BLANK') && q.correctAnswer && (
                                                <div className="mt-2 text-[10px] bg-emerald-50 p-2 border border-emerald-200 rounded">
                                                    <p className="font-bold text-emerald-700 text-[9px] uppercase mb-1">
                                                        {q.questionType === 'ESSAY' ? 'Rubrik / Poin Jawaban:' : 'Kunci Jawaban:'}
                                                    </p>
                                                    <div className="text-emerald-900 prose prose-sm max-w-none" dangerouslySetInnerHTML={{__html: q.correctAnswer}}></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
