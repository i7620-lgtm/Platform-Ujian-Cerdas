
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Exam, Question, Result, UserProfile, AccountType } from '../../types';
import { extractTextFromPdf, parsePdfAndAutoCrop, convertPdfToImages, parseQuestionsFromPlainText, compressImage, analyzeStudentPerformance, calculateAggregateStats } from './examUtils';
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
    QrCodeIcon 
} from '../Icons';

// --- SHARED COMPONENTS (Moved from Modals for Reusability) ---

export const StatWidget: React.FC<{ label: string; value: string | number; color: string; icon?: React.FC<any> }> = ({ label, value, color, icon: Icon }) => {
    const colorName = color.split('-')[1] || 'gray';
    return (
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4 transition-all hover:shadow-md flex-1 print:border-slate-300 print:shadow-none print:rounded-lg">
            <div className={`p-3 rounded-xl ${color} dark:bg-${colorName}-900/20 bg-opacity-10 text-${colorName}-600 dark:text-${colorName}-400 print:bg-transparent print:p-0`}>
                {Icon ? <Icon className="w-6 h-6 print:w-4 print:h-4" /> : <ChartBarIcon className="w-6 h-6 print:w-4 print:h-4" />}
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest print:text-slate-600">{label}</p>
                <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-none mt-1 print:text-lg">{value}</p>
            </div>
        </div>
    );
};

export const QuestionAnalysisItem: React.FC<{ q: Question; index: number; stats: any; examResults: Result[] }> = ({ q, index, stats, examResults }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const difficultyColor = stats.correctRate >= 80 
        ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' 
        : stats.correctRate >= 50 
            ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800' 
            : 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800';

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

    // Determine correct answer string for comparison in generic list
    const correctAnswerString = useMemo(() => {
        if (q.questionType === 'MULTIPLE_CHOICE') return q.correctAnswer;
        if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') return q.correctAnswer;
        if (q.questionType === 'FILL_IN_THE_BLANK') return q.correctAnswer;
        if (q.questionType === 'TRUE_FALSE' && q.trueFalseRows) {
            const obj: Record<number, boolean> = {};
            q.trueFalseRows.forEach((r, i) => obj[i] = r.answer);
            return JSON.stringify(obj);
        }
        if (q.questionType === 'MATCHING') {
            const obj: Record<number, string> = {};
            q.matchingPairs.forEach((p, i) => obj[i] = p.right);
            return JSON.stringify(obj);
        }
        return null;
    }, [q]);

    const normalize = (str: string) => str.trim().toLowerCase();

    const isCorrectAnswer = (ans: string) => {
        if (!correctAnswerString) return false;
        // Simple comparison for exact matches (JSON strings or simple text)
        if (ans === correctAnswerString) return true;
        // Case insensitive for text
        if (q.questionType === 'FILL_IN_THE_BLANK' || q.questionType === 'MULTIPLE_CHOICE') {
            return normalize(ans) === normalize(correctAnswerString);
        }
        // Set comparison for Complex MC
        if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
            const sSet = new Set(normalize(ans).split(','));
            const cSet = new Set(normalize(correctAnswerString).split(','));
            return sSet.size === cSet.size && [...sSet].every(x => cSet.has(x));
        }
        return false;
    };

    return (
        <div className={`border rounded-2xl bg-white dark:bg-slate-800 transition-all duration-300 overflow-hidden ${isExpanded ? 'shadow-md ring-1 ring-indigo-50 border-indigo-100 dark:border-indigo-900 dark:ring-indigo-900' : 'border-slate-100 dark:border-slate-700 hover:border-indigo-100 dark:hover:border-indigo-900'}`}>
            <div 
                className="p-5 cursor-pointer flex flex-col gap-3"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex justify-between items-start">
                    <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Soal {index + 1}</span>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase border ${difficultyColor}`}>
                        {stats.correctRate}% Benar • {difficultyLabel}
                    </span>
                </div>
                
                <div className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 font-medium" dangerouslySetInnerHTML={{ __html: q.questionText }}></div>
                
                {/* NEW: Category & Level Badges */}
                {(q.category || q.level) && (
                    <div className="flex gap-2">
                        {q.category && <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">{q.category}</span>}
                        {q.level && <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800">{q.level}</span>}
                    </div>
                )}

                <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
                    <div 
                        className={`h-full transition-all duration-1000 ${stats.correctRate >= 80 ? 'bg-emerald-500' : stats.correctRate >= 50 ? 'bg-orange-500' : 'bg-rose-500'}`} 
                        style={{ width: `${stats.correctRate}%` }}
                    ></div>
                </div>
                
                {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-700 animate-fade-in">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Distribusi Jawaban Siswa</p>
                        
                        {q.questionType === 'MULTIPLE_CHOICE' && q.options ? (
                            <div className="space-y-2">
                                {q.options.map((opt, i) => {
                                    const count = distribution.counts[opt] || 0;
                                    const percentage = distribution.totalAnswered > 0 ? Math.round((count / distribution.totalAnswered) * 100) : 0;
                                    const isCorrect = opt === q.correctAnswer;
                                    
                                    return (
                                        <div key={i} className={`relative flex items-center justify-between p-2 rounded-lg text-xs ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800' : count > 0 ? 'bg-slate-50 dark:bg-slate-700/50' : ''}`}>
                                            <div className="flex items-center gap-2 z-10 w-full">
                                                <span className={`w-5 h-5 flex items-center justify-center rounded font-bold ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300'}`}>
                                                    {String.fromCharCode(65+i)}
                                                </span>
                                                <div className="flex-1 truncate [&_p]:inline [&_br]:hidden dark:text-slate-300" dangerouslySetInnerHTML={{ __html: opt }}></div>
                                                <span className="font-bold text-slate-600 dark:text-slate-300">{count} Siswa ({percentage}%)</span>
                                            </div>
                                            <div className={`absolute top-0 left-0 h-full rounded-lg opacity-10 ${isCorrect ? 'bg-emerald-500' : 'bg-slate-500'}`} style={{ width: `${percentage}%` }}></div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="max-h-40 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-700/30 p-3 rounded-xl">
                                {q.correctAnswer || (q.questionType === 'TRUE_FALSE' || q.questionType === 'MATCHING') ? (
                                    <div className="mb-2 p-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded text-xs text-indigo-700 dark:text-indigo-300">
                                        <span className="font-bold">Kunci Jawaban: </span> 
                                        {q.questionType === 'TRUE_FALSE' && q.trueFalseRows ? 
                                            q.trueFalseRows.map(r => `${r.text} (${r.answer?'Benar':'Salah'})`).join(', ') :
                                        q.questionType === 'MATCHING' && q.matchingPairs ?
                                            q.matchingPairs.map(p => `${p.left}→${p.right}`).join(', ') :
                                            <span dangerouslySetInnerHTML={{__html: q.correctAnswer || ''}}></span>
                                        }
                                    </div>
                                ) : null}
                                <ul className="space-y-2">
                                    {Object.entries(distribution.counts).map(([ans, count], idx) => {
                                        const isCorrect = isCorrectAnswer(ans);
                                        // Formatter for ugly JSON strings
                                        let displayAns = ans;
                                        try {
                                            if (ans.startsWith('{')) {
                                                const parsed = JSON.parse(ans);
                                                displayAns = Object.entries(parsed).map(([k,v]) => `${v}`).join(', ');
                                            }
                                        } catch(e){}

                                        return (
                                            <li key={idx} className={`text-xs flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1 last:border-0 items-center ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20 p-1 rounded -mx-1 border-emerald-100 dark:border-emerald-800' : 'text-slate-600 dark:text-slate-300'}`}>
                                                <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                                                    {isCorrect && <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0"/>}
                                                    <div className={`truncate italic ${isCorrect ? 'text-emerald-700 dark:text-emerald-400 font-medium' : ''} [&_p]:inline [&_br]:hidden`} dangerouslySetInnerHTML={{__html: displayAns}}></div>
                                                </div>
                                                <span className={`font-bold ml-2 ${isCorrect ? 'text-emerald-700 dark:text-emerald-400' : ''}`}>{count} Siswa</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
                
                <div className="flex justify-center mt-1">
                     {isExpanded ? <ChevronUpIcon className="w-4 h-4 text-slate-300 dark:text-slate-600"/> : <ChevronDownIcon className="w-4 h-4 text-slate-300 dark:text-slate-600"/>}
                </div>
            </div>
        </div>
    );
};

// --- REMAINING TIME COMPONENT ---
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
    if (timeState.status === 'FINISHED') return (<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300 border border-gray-200 dark:border-slate-600`}>Selesai</span>);
    if (timeState.status === 'UPCOMING') return (<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800`}>Belum Dimulai</span>);
    const hours = Math.floor(timeState.diff / (1000 * 60 * 60)); const minutes = Math.floor((timeState.diff % (1000 * 60 * 60)) / (1000 * 60)); const seconds = Math.floor((timeState.diff % (1000 * 60)) / 1000); const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    const totalMinutesLeft = timeState.diff / (1000 * 60); 
    let colorClass = "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800"; 
    let dotClass = "bg-emerald-500"; 
    if (totalMinutesLeft < 5) { colorClass = "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800 animate-pulse"; dotClass = "bg-rose-500"; } 
    else if (totalMinutesLeft < 15) { colorClass = "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800"; dotClass = "bg-amber-500"; }
    if (minimal) { return <span className="font-mono font-bold tracking-tight">{timeString}</span>; }
    return (<div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colorClass} transition-colors duration-500`}><span className="relative flex h-2 w-2"><span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotClass}`}></span><span className={`relative inline-flex rounded-full h-2 w-2 ${dotClass}`}></span></span><span className="font-mono text-sm font-bold tracking-widest tabular-nums">{timeString}</span></div>);
};

const MetaBadge: React.FC<{ text: string; colorClass?: string }> = ({ text, colorClass = "bg-gray-100 text-gray-600" }) => { 
    if (!text || text === 'Lainnya') return null; 
    let darkClass = "";
    if (colorClass.includes("blue")) darkClass = "dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
    else if (colorClass.includes("purple")) darkClass = "dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800";
    else if (colorClass.includes("gray")) darkClass = "dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600";
    else darkClass = "dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600";

    return (<span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border border-opacity-50 ${colorClass} ${darkClass}`}>{text}</span>); 
};

type InputMethod = 'upload' | 'paste';

interface CreationViewProps {
    onQuestionsGenerated: (questions: Question[], source: 'manual' | 'auto') => void;
}

export const CreationView: React.FC<CreationViewProps> = ({ onQuestionsGenerated }) => {
    // ... implementation same as before ...
    const [inputMethod, setInputMethod] = useState<InputMethod>('upload');
    const [inputText, setInputText] = useState('');
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [previewImages, setPreviewImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadPreview = async () => {
            if (uploadedFile && uploadedFile.type === 'application/pdf') {
                try { const images = await convertPdfToImages(uploadedFile, 1.5); setPreviewImages(images); } catch (e) { console.error("Gagal memuat pratinjau PDF:", e); setPreviewImages([]); }
            } else { setPreviewImages([]); }
        };
        loadPreview();
    }, [uploadedFile]);

    const handleExtractText = async () => { if (!uploadedFile) return; setIsLoading(true); try { const text = await extractTextFromPdf(uploadedFile); setInputText(text); setInputMethod('paste'); } catch (e) { setError("Gagal mengekstrak teks dari PDF."); } finally { setIsLoading(false); } };
    const handleDirectManualTransfer = () => { if (!inputText.trim()) { setError("Tidak ada teks untuk ditransfer."); return; } const blocks = inputText.split(/\n\s*\n/); const newQuestions: Question[] = blocks.filter(b => b.trim().length > 0).map((block, index) => ({ id: `manual-q-${Date.now()}-${index}`, questionText: block.trim(), questionType: 'ESSAY', options: [], correctAnswer: '', imageUrl: undefined, optionImages: undefined })); onQuestionsGenerated(newQuestions, 'manual'); };
    const handleStartAnalysis = async () => { setIsLoading(true); setError(''); try { if (inputMethod === 'paste') { if (!inputText.trim()) throw new Error("Silakan tempel konten soal terlebih dahulu."); const parsedQuestions = parseQuestionsFromPlainText(inputText); if (parsedQuestions.length === 0) throw new Error("Tidak dapat menemukan soal yang valid. Pastikan format soal menggunakan penomoran (1. Soal) dan opsi (A. Opsi)."); onQuestionsGenerated(parsedQuestions, 'auto'); } else if (inputMethod === 'upload' && uploadedFile) { if (uploadedFile.type !== 'application/pdf') throw new Error("Fitur ini hanya mendukung file PDF."); const parsedQuestions = await parsePdfAndAutoCrop(uploadedFile); if (parsedQuestions.length === 0) throw new Error("Tidak dapat menemukan soal yang valid dari PDF. Pastikan format soal jelas."); onQuestionsGenerated(parsedQuestions, 'manual'); } else { throw new Error("Silakan pilih file untuk diunggah."); } } catch (err) { setError(err instanceof Error ? err.message : 'Gagal memproses file.'); } finally { setIsLoading(false); } };
    const handleManualCreateClick = () => { setInputText(''); setUploadedFile(null); setError(''); onQuestionsGenerated([], 'manual'); };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-12">
            <div className="space-y-8"><div className="text-center space-y-4"><h2 className="text-3xl font-bold text-neutral dark:text-white">Buat Ujian Baru</h2><p className="text-gray-500 dark:text-slate-400 max-w-2xl mx-auto">Mulai dengan mengunggah soal dalam format PDF, menempelkan teks soal, atau membuat soal secara manual. Sistem kami akan membantu Anda menyusun ujian dengan mudah.</p></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className={`p-6 border-2 rounded-2xl cursor-pointer transition-all duration-300 group border-gray-100 dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-lg bg-white dark:bg-slate-800`} onClick={handleManualCreateClick}><div className="flex flex-col items-center text-center space-y-3"><div className={`p-4 rounded-2xl transition-colors bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-slate-300 group-hover:bg-primary/10 group-hover:text-primary`}><PencilIcon className="w-8 h-8" /></div><h3 className="font-bold text-lg text-neutral dark:text-white">Buat Manual</h3><p className="text-sm text-gray-500 dark:text-slate-400">Buat soal dari awal secara manual tanpa impor file atau teks.</p></div></div><div className={`p-6 border-2 rounded-2xl cursor-pointer transition-all duration-300 group ${inputMethod === 'upload' ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-md' : 'border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary/50 hover:shadow-lg'}`} onClick={() => setInputMethod('upload')}><div className="flex flex-col items-center text-center space-y-3"><div className={`p-4 rounded-2xl transition-colors ${inputMethod === 'upload' ? 'bg-primary text-white' : 'bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-slate-300 group-hover:bg-primary/10 group-hover:text-primary'}`}><CloudArrowUpIcon className="w-8 h-8" /></div><h3 className="font-bold text-lg text-neutral dark:text-white">Unggah PDF Soal</h3><p className="text-sm text-gray-500 dark:text-slate-400">Sistem akan otomatis mendeteksi dan memotong soal dari file PDF Anda.</p></div></div><div className={`p-6 border-2 rounded-2xl cursor-pointer transition-all duration-300 group ${inputMethod === 'paste' ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-md' : 'border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary/50 hover:shadow-lg'}`} onClick={() => setInputMethod('paste')}><div className="flex flex-col items-center text-center space-y-3"><div className={`p-4 rounded-2xl transition-colors ${inputMethod === 'paste' ? 'bg-primary text-white' : 'bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-slate-300 group-hover:bg-primary/10 group-hover:text-primary'}`}><ListBulletIcon className="w-8 h-8" /></div><h3 className="font-bold text-lg text-neutral dark:text-white">Tempel Teks Soal</h3><p className="text-sm text-gray-500 dark:text-slate-400">Salin dan tempel teks soal langsung dari dokumen Word atau sumber lain.</p></div></div></div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm transition-all duration-300"><div className="mb-4"><h3 className="text-lg font-bold text-neutral dark:text-white mb-1">{inputMethod === 'upload' ? 'Unggah File PDF' : 'Tempel Teks Soal'}</h3><p className="text-sm text-gray-500 dark:text-slate-400">{inputMethod === 'upload' ? 'Pilih file PDF dari perangkat Anda.' : 'Pastikan format soal jelas (nomor dan opsi).'}</p></div>
                    {inputMethod === 'upload' ? (
                        <div className="space-y-4">
                            <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors relative">
                                <input 
                                    type="file" 
                                    accept=".pdf" 
                                    onChange={(e) => { 
                                        if (e.target.files && e.target.files[0]) { 
                                            const file = e.target.files[0];
                                            if (file.size > 10 * 1024 * 1024) { 
                                                setError("Ukuran file terlalu besar (Max 10MB). Harap kompres PDF Anda.");
                                                e.target.value = '';
                                                setUploadedFile(null);
                                                return;
                                            }
                                            setError('');
                                            setUploadedFile(file); 
                                            setInputText(''); 
                                        } 
                                    }} 
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                />
                                <div className="space-y-2 pointer-events-none">
                                    <CloudArrowUpIcon className="w-10 h-10 text-gray-400 dark:text-slate-500 mx-auto" />
                                    {uploadedFile ? (<p className="font-semibold text-primary">{uploadedFile.name}</p>) : (<><p className="text-gray-600 dark:text-slate-300 font-medium">Klik atau seret file PDF ke sini</p><p className="text-xs text-gray-400 dark:text-slate-500">Maksimal ukuran file 10MB</p></>)}
                                </div>
                            </div>
                            {previewImages.length > 0 && (<div className="space-y-2"><p className="text-sm font-semibold text-gray-700 dark:text-slate-300">Pratinjau Halaman Pertama:</p><div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto bg-gray-50 dark:bg-slate-900 p-2 text-center"><img src={previewImages[0]} alt="Preview PDF" className="max-w-full h-auto mx-auto shadow-sm rounded-lg" /></div><div className="flex justify-end"><button onClick={handleExtractText} className="text-sm text-primary hover:underline flex items-center gap-1" disabled={isLoading}><FileTextIcon className="w-4 h-4" /> Ekstrak Teks dari PDF (Jika Auto-Crop Gagal)</button></div></div>)}
                        </div>
                    ) : (<div className="space-y-4"><textarea value={inputText} onChange={(e) => setInputText(e.target.value)} className="w-full h-64 p-4 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary font-mono text-sm resize-y text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600" placeholder={`Contoh Format:\n\n1. Apa ibukota Indonesia?\nA. Bandung\nB. Jakarta\nC. Surabaya\nD. Medan\n\nKunci Jawaban: B`} />{inputText && (<div className="flex justify-end"><button onClick={handleDirectManualTransfer} className="text-sm text-secondary hover:underline flex items-center gap-1"><PencilIcon className="w-4 h-4" /> Gunakan sebagai Soal Manual (Tanpa Parsing Otomatis)</button></div>)}</div>)}
                    {error && (<div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-xl flex items-start gap-2 border border-red-100 dark:border-red-900"><span className="font-bold">Error:</span> {error}</div>)}
                    <div className="mt-6 flex justify-end"><button onClick={handleStartAnalysis} disabled={isLoading || (!inputText && !uploadedFile)} className={`w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all ${isLoading || (!inputText && !uploadedFile) ? 'bg-gray-400 dark:bg-slate-600 cursor-not-allowed' : 'bg-primary hover:bg-primary-focus hover:shadow-lg transform hover:-translate-y-0.5'}`}>{isLoading ? (<><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> Memproses...</>) : (<><CogIcon className="w-5 h-5" />{inputMethod === 'upload' ? 'Analisis & Crop PDF' : 'Analisis Teks'}</>)}</button></div>
                </div>
            </div>
        </div>
    );
};

export const DraftsView: React.FC<{ exams: Exam[]; onContinueDraft: (exam: Exam) => void; onDeleteDraft: (exam: Exam) => void; }> = ({ exams, onContinueDraft, onDeleteDraft }) => {
    const [previewExam, setPreviewExam] = useState<Exam | null>(null);
    return (
        <div className="space-y-6 animate-fade-in"><div className="flex items-center gap-2"><div className="p-2 bg-gray-100 dark:bg-slate-800 rounded-lg"><PencilIcon className="w-6 h-6 text-gray-600 dark:text-slate-400" /></div><div><h2 className="text-2xl font-bold text-neutral dark:text-white">Draf Soal</h2><p className="text-sm text-gray-500 dark:text-slate-400">Lanjutkan pembuatan soal yang belum selesai.</p></div></div>
            {exams.length > 0 ? (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{exams.map(exam => (<div key={exam.code} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all duration-300 relative group flex flex-col h-full"><button type="button" onClick={(e) => { e.stopPropagation(); onDeleteDraft(exam); }} className="absolute top-3 right-3 p-2 bg-white dark:bg-slate-700 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 border border-gray-100 dark:border-slate-600 hover:border-red-100 rounded-full transition-all shadow-sm z-10" title="Hapus Draf"><TrashIcon className="w-4 h-4" /></button><div className="flex-1"><div className="flex items-start justify-between mb-2"><span className="text-[10px] font-bold bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300 px-2 py-1 rounded-md uppercase tracking-wider border border-gray-200 dark:border-slate-600">Draft</span></div><h3 className="font-bold text-lg text-gray-800 dark:text-white mb-1">{exam.config.subject || "Tanpa Judul"}</h3><p className="text-sm text-gray-400 dark:text-slate-500 font-mono font-medium mb-3">{exam.code}</p><div className="flex flex-wrap gap-2 mb-4"><MetaBadge text={exam.config.classLevel} colorClass="bg-blue-50 text-blue-700 border-blue-100" /><MetaBadge text={exam.config.examType} colorClass="bg-purple-50 text-purple-700 border-purple-100" /></div><div className="h-px bg-gray-50 dark:bg-slate-700 w-full mb-4"></div><div className="text-xs text-gray-500 dark:text-slate-400 space-y-2 mb-6"><div className="flex items-center gap-2"><CalendarDaysIcon className="w-4 h-4 text-gray-400 dark:text-slate-500" /><span>{new Date(exam.config.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div><div className="flex items-center gap-2"><ListBulletIcon className="w-4 h-4 text-gray-400 dark:text-slate-500" /><span>{exam.questions.filter(q => q.questionType !== 'INFO').length} Soal Tersimpan</span></div></div></div><div className="flex gap-2"><button onClick={() => setPreviewExam(exam)} className="flex-1 py-2.5 px-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-slate-600 hover:text-primary dark:hover:text-white transition-colors flex items-center justify-center gap-2 shadow-sm" title="Preview Soal"><EyeIcon className="w-4 h-4" /> Preview</button><button onClick={() => onContinueDraft(exam)} className="flex-[2] py-2.5 px-4 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-white font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-slate-600 hover:border-gray-300 transition-colors flex items-center justify-center gap-2 shadow-sm"><PencilIcon className="w-4 h-4" /> Edit</button></div></div>))}</div>) : (<div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700"><div className="bg-gray-50 dark:bg-slate-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><PencilIcon className="h-8 w-8 text-gray-300 dark:text-slate-500" /></div><h3 className="text-base font-bold text-gray-900 dark:text-white">Belum Ada Draf</h3><p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Anda belum menyimpan draf soal apapun.</p></div>)}
            {previewExam && (<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in"><div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-in-up border border-white dark:border-slate-700"><div className="p-4 border-b bg-gray-50 dark:bg-slate-900 border-gray-100 dark:border-slate-700 flex justify-between items-center"><h3 className="font-bold text-lg text-gray-800 dark:text-white">Preview Ujian</h3><button onClick={() => setPreviewExam(null)} className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors"><XMarkIcon className="w-6 h-6 text-gray-500 dark:text-slate-400" /></button></div><div className="p-8 flex flex-col items-center text-center"><div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-4 shadow-inner"><EyeIcon className="w-8 h-8" /></div><h4 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{previewExam.config.subject || "Draf Ujian"}</h4><p className="text-sm text-gray-500 dark:text-slate-400 mb-6 font-mono bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded border border-gray-200 dark:border-slate-600">{previewExam.code}</p><div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${window.location.origin}/?preview=${previewExam.code}`)}&margin=10`} alt="QR Preview" className="w-40 h-40 object-contain" /></div><p className="text-xs text-gray-400 dark:text-slate-500 mb-4 max-w-xs">Pindai QR Code atau gunakan link di bawah untuk mencoba mengerjakan soal ini (Mode Preview).</p><div className="flex gap-3 w-full"><button onClick={() => { const url = `${window.location.origin}/?preview=${previewExam.code}`; navigator.clipboard.writeText(url); alert("Link Preview berhasil disalin!"); }} className="flex-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 font-bold py-3 px-4 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-sm">Salin Link</button><a href={`/?preview=${previewExam.code}`} target="_blank" rel="noreferrer" className="flex-1 bg-blue-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none">Coba Sekarang</a></div></div></div></div>)}
        </div>
    );
};

export const OngoingExamsView: React.FC<{ exams: Exam[]; results: Result[]; onSelectExam: (exam: Exam) => void; onDuplicateExam: (exam: Exam) => void; }> = ({ exams, results, onSelectExam, onDuplicateExam }) => {
    const [joinQrExam, setJoinQrExam] = useState<Exam | null>(null);

    return (
        <div className="space-y-6 animate-fade-in"><div className="flex items-center gap-2"><div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg"><ClockIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /></div><div><h2 className="text-2xl font-bold text-neutral dark:text-white">Ujian Sedang Berlangsung</h2><p className="text-sm text-gray-500 dark:text-slate-400">Pantau kemajuan ujian yang sedang berjalan secara real-time.</p></div></div>
            {exams.length > 0 ? (<div className="grid grid-cols-1 md:grid-cols-2 gap-6">{exams.map(exam => { const activeCount = results.filter(r => r.examCode === exam.code).length; return (<div key={exam.code} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-900 shadow-sm hover:shadow-xl hover:shadow-emerald-50 dark:hover:shadow-emerald-900/10 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-300 relative group cursor-pointer" onClick={() => onSelectExam(exam)}>
            
            <div className="absolute top-4 right-4 z-10 flex gap-2">
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setJoinQrExam(exam); }}
                    className="p-2 bg-white dark:bg-slate-700 text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg border border-slate-100 dark:border-slate-600 hover:border-emerald-100 dark:hover:border-emerald-800 transition-all shadow-sm"
                    title="QR Code Gabung Siswa"
                >
                    <QrCodeIcon className="w-4 h-4" />
                </button>
                {exam.config.enablePublicStream && (
                    <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); const url = `${window.location.origin}/?live=${exam.code}`; navigator.clipboard.writeText(url); alert("Link Pantauan Orang Tua disalin!"); }} 
                        className="p-2 bg-white dark:bg-slate-700 text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg border border-slate-100 dark:border-slate-600 hover:border-indigo-100 dark:hover:border-indigo-800 transition-all shadow-sm" 
                        title="Bagikan Link Pantauan"
                    >
                        <ShareIcon className="w-4 h-4" />
                    </button>
                )}
                <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); onDuplicateExam(exam); }} 
                    className="p-2 bg-white dark:bg-slate-700 text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-600 hover:text-primary dark:hover:text-white rounded-lg border border-slate-100 dark:border-slate-600 hover:border-gray-200 dark:hover:border-slate-500 transition-all shadow-sm" 
                    title="Gunakan Kembali Soal"
                >
                    <DocumentDuplicateIcon className="w-4 h-4" />
                </button>
            </div>

            <div className="flex justify-between items-start mb-2"><div className="flex flex-col"><span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md w-fit mb-2 flex items-center gap-1.5"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>Sedang Berlangsung</span><h3 className="font-bold text-xl text-neutral dark:text-white">{exam.config.subject || exam.code}</h3><p className="text-sm font-mono text-gray-400 dark:text-slate-500 mt-0.5">{exam.code}</p></div></div><div className="flex flex-wrap gap-2 mt-3 mb-5"><MetaBadge text={exam.config.classLevel} colorClass="bg-gray-100 text-gray-600" /><MetaBadge text={exam.config.examType} colorClass="bg-gray-100 text-gray-600" /></div><div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 border border-gray-100 dark:border-slate-700 flex items-center justify-between"><div className="flex flex-col"><span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider">Partisipan</span><div className="flex items-center gap-2 mt-1"><div className="flex -space-x-2">{[...Array(Math.min(3, activeCount))].map((_, i) => (<div key={i} className="w-6 h-6 rounded-full bg-emerald-200 dark:bg-emerald-800 border-2 border-white dark:border-slate-700"></div>))}</div><span className="text-sm font-bold text-gray-700 dark:text-slate-300">{activeCount} Siswa</span></div></div><div className="text-right"><span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider">Sisa Waktu</span><div className="mt-1"><RemainingTime exam={exam} /></div></div></div></div>)})}</div>) : (<div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700"><div className="bg-gray-50 dark:bg-slate-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><ClockIcon className="h-8 w-8 text-gray-300 dark:text-slate-500" /></div><h3 className="text-base font-bold text-gray-900 dark:text-white">Tidak Ada Ujian Aktif</h3><p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Saat ini tidak ada ujian yang sedang berlangsung.</p></div>)}
            
            {/* Modal QR Code Join */}
            {joinQrExam && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[70] animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-8 text-center animate-slide-in-up border border-white dark:border-slate-700 relative">
                        <button onClick={() => setJoinQrExam(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full transition-colors"><XMarkIcon className="w-5 h-5"/></button>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white tracking-tight">Gabung Ujian</h3>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-lg mb-6 inline-block mx-auto relative group">
                            <div className="absolute -inset-1 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-3xl opacity-20 blur group-hover:opacity-30 transition-opacity"></div>
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/?join=${joinQrExam.code}`)}&margin=10`} alt="QR Join" className="w-48 h-48 object-contain relative bg-white rounded-xl"/>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-6 leading-relaxed px-2">
                            Minta siswa memindai kode ini untuk langsung masuk ke halaman login dengan kode ujian terisi.
                        </p>
                        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Kode Ujian</p>
                            <p className="text-xl font-mono font-black text-slate-800 dark:text-white tracking-widest">{joinQrExam.code}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const UpcomingExamsView: React.FC<{ exams: Exam[]; onEditExam: (exam: Exam) => void; }> = ({ exams, onEditExam }) => {
    return (
        <div className="space-y-6 animate-fade-in"><div className="flex items-center gap-2"><div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><CalendarDaysIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" /></div><div><h2 className="text-2xl font-bold text-neutral dark:text-white">Ujian Akan Datang</h2><p className="text-sm text-gray-500 dark:text-slate-400">Daftar semua ujian yang telah dijadwalkan.</p></div></div>
            {exams.length > 0 ? (<div className="space-y-4">{exams.map(exam => (<div key={exam.code} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 group"><div className="flex items-start gap-5"><div className="bg-blue-50 dark:bg-blue-900/20 w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800 shrink-0"><span className="text-[10px] font-bold uppercase">{new Date(exam.config.date).toLocaleDateString('id-ID', { month: 'short' })}</span><span className="text-xl font-black leading-none">{new Date(exam.config.date).getDate()}</span></div><div><div className="flex items-center gap-2 mb-1"><h3 className="font-bold text-lg text-neutral dark:text-white">{exam.config.subject || "Tanpa Judul"}</h3><span className="text-xs font-mono text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-700 px-1.5 py-0.5 rounded">{exam.code}</span></div><div className="flex flex-wrap items-center gap-2 mb-2"><MetaBadge text={exam.config.classLevel} colorClass="bg-gray-100 text-gray-600" /><MetaBadge text={exam.config.examType} colorClass="bg-gray-100 text-gray-600" /></div><div className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-3 font-medium"><span className="flex items-center gap-1.5"><ClockIcon className="w-3.5 h-3.5"/> {exam.config.startTime} WIB</span><span className="text-gray-300 dark:text-slate-600">•</span><span>{exam.config.timeLimit} Menit</span></div></div></div><button onClick={() => onEditExam(exam)} className="flex items-center justify-center gap-2 bg-white dark:bg-slate-700 border-2 border-gray-100 dark:border-slate-600 text-gray-600 dark:text-slate-300 px-5 py-2.5 text-sm rounded-xl hover:border-primary dark:hover:border-primary hover:text-primary dark:hover:text-white transition-all font-bold shadow-sm self-end md:self-center w-full md:w-auto"><PencilIcon className="w-4 h-4" /> Edit Detail</button></div>))}</div>) : (<div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700"><div className="bg-gray-50 dark:bg-slate-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><CalendarDaysIcon className="h-8 w-8 text-gray-300 dark:text-slate-500" /></div><h3 className="text-base font-bold text-gray-900 dark:text-white">Tidak Ada Ujian Terjadwal</h3><p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Buat ujian baru untuk memulai.</p></div>)}
        </div>
    );
};

interface FinishedExamsProps {
    exams: Exam[];
    onSelectExam: (exam: Exam) => void;
    onDuplicateExam: (exam: Exam) => void;
    onDeleteExam: (exam: Exam) => void;
    onArchiveExam: (exam: Exam) => void;
}

export const FinishedExamsView: React.FC<FinishedExamsProps> = ({ exams, onSelectExam, onDuplicateExam, onDeleteExam, onArchiveExam }) => {
    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex items-center gap-2"><div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg"><ChartBarIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" /></div><div><h2 className="text-2xl font-bold text-neutral dark:text-white">Ujian Selesai</h2><p className="text-sm text-gray-500 dark:text-slate-400">Riwayat dan hasil ujian yang telah berakhir.</p></div></div>
            {exams.length > 0 ? (
                <div className="space-y-4">
                    {exams.map(exam => (
                        <div key={exam.code} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-md hover:border-gray-300 dark:hover:border-slate-500 group relative">
                            {/* Delete Button */}
                            <button type="button" onClick={(e) => { e.stopPropagation(); onDeleteExam(exam); }} className="absolute top-3 right-3 p-2 bg-white dark:bg-slate-700 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 border border-gray-100 dark:border-slate-600 hover:border-red-100 dark:hover:border-red-900 rounded-full transition-all shadow-sm z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100" title="Hapus Data Ujian & Hasil"><TrashIcon className="w-4 h-4" /></button>

                            <div className="flex items-start gap-4">
                                <div className="bg-gray-50 dark:bg-slate-700 p-3 rounded-xl border border-gray-100 dark:border-slate-600"><CheckCircleIcon className="w-6 h-6 text-gray-400 dark:text-slate-500 group-hover:text-green-500 dark:group-hover:text-green-400 transition-colors" /></div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1"><h3 className="font-bold text-lg text-neutral dark:text-white">{exam.config.subject || exam.code}</h3><span className="text-xs font-mono text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-700 px-1.5 py-0.5 rounded">{exam.code}</span></div>
                                    <div className="flex flex-wrap items-center gap-2 mb-2"><MetaBadge text={exam.config.classLevel} colorClass="bg-gray-100 text-gray-600" /><MetaBadge text={exam.config.examType} colorClass="bg-gray-100 text-gray-600" /></div>
                                    <div className="text-xs text-gray-400 dark:text-slate-500">Berakhir pada: {new Date(exam.config.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 self-end md:self-center w-full md:w-auto">
                                <button onClick={() => onArchiveExam(exam)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-4 py-2.5 text-sm rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors font-bold shadow-sm border border-indigo-100 dark:border-indigo-800" title="Simpan ke Cloud & Hapus SQL"><CloudArrowUpIcon className="w-4 h-4" /><span className="md:hidden lg:inline">Finalisasi & Arsip</span></button>
                                <button onClick={() => onDuplicateExam(exam)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-4 py-2.5 text-sm rounded-xl hover:bg-gray-100 dark:hover:bg-slate-600 hover:text-gray-900 dark:hover:text-white transition-colors font-bold shadow-sm border border-gray-200 dark:border-slate-600" title="Gunakan Kembali Soal"><DocumentDuplicateIcon className="w-4 h-4" /><span className="md:hidden lg:inline">Reuse</span></button>
                                <button onClick={() => onSelectExam(exam)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900 dark:bg-indigo-600 text-white px-5 py-2.5 text-sm rounded-xl hover:bg-black dark:hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-gray-200 dark:shadow-indigo-900/30 transform active:scale-95"><ChartBarIcon className="w-4 h-4" /> Lihat Hasil</button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700"><div className="bg-gray-50 dark:bg-slate-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><ChartBarIcon className="h-8 w-8 text-gray-300 dark:text-slate-500" /></div><h3 className="text-base font-bold text-gray-900 dark:text-white">Belum Ada Riwayat</h3><p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Hasil ujian yang telah selesai akan muncul di sini.</p></div>
            )}
        </div>
    );
};

export const UserManagementView: React.FC = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [newRole, setNewRole] = useState<AccountType>('guru');
    const [newSchool, setNewSchool] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const data = await storageService.getAllUsers();
            setUsers(data);
        } catch (e) {
            console.error("Gagal memuat pengguna:", e);
            alert("Gagal memuat daftar pengguna.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditClick = (user: UserProfile) => {
        setEditingUser(user);
        setNewRole(user.accountType);
        setNewSchool(user.school);
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;
        try {
            await storageService.updateUserRole(editingUser.id, newRole, newSchool);
            setEditingUser(null);
            fetchUsers();
            alert("Pengguna berhasil diperbarui.");
        } catch (e) {
            console.error(e);
            alert("Gagal memperbarui pengguna.");
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-800 rounded-lg text-white"><UserIcon className="w-6 h-6" /></div>
                <div><h2 className="text-2xl font-bold text-neutral dark:text-white">Kelola Pengguna</h2><p className="text-sm text-gray-500 dark:text-slate-400">Manajemen akses dan penempatan sekolah.</p></div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50/50 dark:bg-slate-700/50">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Nama / Email</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Sekolah</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Role</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                        {isLoading ? (
                             <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-400 dark:text-slate-500">Memuat data pengguna...</td></tr>
                        ) : users.length > 0 ? (
                            users.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-700/30">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{user.fullName}</div>
                                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{user.email || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-medium text-slate-600 dark:text-slate-400">{user.school}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                            user.accountType === 'super_admin' ? 'bg-slate-800 text-white' : 
                                            user.accountType === 'admin_sekolah' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                                        }`}>
                                            {user.accountType.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleEditClick(user)} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline">Edit</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-400 dark:text-slate-500">Tidak ada pengguna ditemukan.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {editingUser && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6 border border-white dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Edit Pengguna</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Nama</label>
                                <input type="text" value={editingUser.fullName} disabled className="w-full p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-400 dark:text-slate-500 cursor-not-allowed" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Role</label>
                                <select value={newRole} onChange={(e) => setNewRole(e.target.value as AccountType)} className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none text-slate-800 dark:text-slate-200">
                                    <option value="guru">Guru</option>
                                    <option value="admin_sekolah">Admin Sekolah</option>
                                    <option value="super_admin">Super Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Sekolah</label>
                                <input type="text" value={newSchool} onChange={(e) => setNewSchool(e.target.value)} className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none text-slate-800 dark:text-slate-200" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6 justify-end">
                            <button onClick={() => setEditingUser(null)} className="px-4 py-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg">Batal</button>
                            <button onClick={handleSaveUser} className="px-4 py-2 text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-100 dark:shadow-indigo-900/30">Simpan</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- ARCHIVE VIEWER (NEW & ENHANCED) ---
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
    const [cloudArchives, setCloudArchives] = useState<{name: string, created_at: string, size: number}[]>([]);
    const [isLoadingCloud, setIsLoadingCloud] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('Mengunduh dari Cloud...');
    const [sourceType, setSourceType] = useState<'LOCAL' | 'CLOUD' | null>(null);
    const [isRegisteringStats, setIsRegisteringStats] = useState(false);

    useEffect(() => {
        // Load cloud archives list on mount
        const loadCloudList = async () => {
            try {
                const list = await storageService.getArchivedList();
                setCloudArchives(list);
            } catch (e) {
                console.warn("Cloud archives list unavailable");
            }
        };
        loadCloudList();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
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
                        setSourceType('LOCAL');
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

    const loadFromCloud = async (filename: string) => {
        setIsLoadingCloud(true);
        setLoadingMessage('Mengunduh dari Cloud...');
        setError('');
        try {
            const data = await storageService.downloadArchive(filename);
            if (data && data.exam && data.exam.questions) {
                setArchiveData(data);
                setActiveTab('DETAIL');
                setSourceType('CLOUD');
            } else {
                setError("Data arsip cloud rusak.");
            }
        } catch (e) {
            setError("Gagal mengunduh arsip dari cloud.");
        } finally {
            setIsLoadingCloud(false);
        }
    };

    const handleDeleteArchive = async (filename: string, e: React.MouseEvent) => {
        e.stopPropagation(); 
        if (!confirm(`Apakah Anda yakin ingin menghapus arsip "${filename}" secara permanen dari Cloud Storage?`)) return;

        setIsLoadingCloud(true);
        setLoadingMessage('Menghapus arsip...');
        
        try {
            await storageService.deleteArchive(filename);
            const list = await storageService.getArchivedList();
            setCloudArchives(list);
            
            // If the deleted file is currently open, close it
            if (archiveData && sourceType === 'CLOUD' && archiveData.exam.code === filename.split('_')[0]) {
               resetView();
            }
        } catch(err) {
            console.error(err);
            alert("Gagal menghapus arsip.");
        } finally {
            setIsLoadingCloud(false);
        }
    };

    const handleUploadToCloud = async () => {
        if (!archiveData) return;
        
        if (!confirm("Arsip ini akan diunggah ke Cloud Storage. Sistem akan mengoptimalkan ukuran gambar secara otomatis (Resize + WebP) agar hemat kuota.\n\nLanjutkan?")) return;

        setIsLoadingCloud(true);
        setLoadingMessage('Mengoptimalkan gambar...');
        
        try {
            // Helper to process HTML string
            const processHtmlString = async (html: string) => {
                if (!html || !html.includes('data:image')) return html;
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const images = doc.getElementsByTagName('img');
                
                for (let i = 0; i < images.length; i++) {
                    const img = images[i];
                    const src = img.getAttribute('src');
                    
                    if (src && src.startsWith('data:image')) {
                        try {
                            // OPTIMIZATION PIPELINE:
                            // Resize to max 800px & Compress (WebP q=0.7) - improved from 0.6
                            // Refine step removed to prevent unwanted cropping
                            const final = await compressImage(src, 0.7, 800);
                            img.setAttribute('src', final);
                        } catch (e) { console.warn("Image opt failed, using original", e); }
                    }
                }
                return doc.body.innerHTML;
            };

            // Deep clone to avoid mutating state directly during process
            const optimizedExam = JSON.parse(JSON.stringify(archiveData.exam)) as Exam;
            
            // Loop through questions and optimize images
            for (let i = 0; i < optimizedExam.questions.length; i++) {
                const q = optimizedExam.questions[i];
                q.questionText = await processHtmlString(q.questionText);
                if (q.options) {
                    for (let j = 0; j < q.options.length; j++) {
                        q.options[j] = await processHtmlString(q.options[j]);
                    }
                }
            }

            setLoadingMessage('Mengunggah ke Cloud...');
            const finalPayload = { ...archiveData, exam: optimizedExam };
            const jsonString = JSON.stringify(finalPayload, null, 2);
            await storageService.uploadArchive(optimizedExam.code, jsonString);
            
            // Refresh list
            const list = await storageService.getArchivedList();
            setCloudArchives(list);
            
            setSourceType('CLOUD'); // Switch mode to cloud
            setArchiveData(finalPayload); // Update view with optimized data
            alert("Berhasil! Arsip lokal telah dioptimalkan dan disimpan ke Cloud Storage.");
        } catch(e) {
            console.error(e);
            alert("Gagal mengunggah ke Cloud.");
        } finally {
            setIsLoadingCloud(false);
        }
    };

    const handleRegisterStats = async () => {
        if (!archiveData) return;
        if (!confirm("Konfirmasi Pencatatan Statistik?\n\nSistem akan menghitung ulang data dari arsip ini dan menyimpannya ke Database Analisis Daerah.\n\nPERINGATAN: Pastikan data ini belum pernah tercatat sebelumnya agar tidak terjadi duplikasi data statistik.")) return;

        setIsRegisteringStats(true);
        try {
            await storageService.registerLegacyArchive(archiveData.exam, archiveData.results);
            alert("Berhasil! Statistik ujian telah dicatat dan kini tersedia di menu Analisis Daerah.");
        } catch (e: any) {
            console.error(e);
            alert(e.message || "Gagal mencatat statistik.");
        } finally {
            setIsRegisteringStats(false);
        }
    };

    const resetView = () => {
        setArchiveData(null); setError(''); setFixMessage(''); setSourceType(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        // Refresh list
        storageService.getArchivedList().then(setCloudArchives).catch(()=>{});
    };

    const handlePrint = () => {
        window.print();
    };

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
            const cSet = new Set(normalize(correctAns).split(',').map(s=>s.trim()));
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
                    totalQuestions: (stats.empty || 0) + (stats.wrong || 0) + (stats.correct || 0)
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

    const toggleStudent = (id: string) => {
        if (expandedStudent === id) setExpandedStudent(null);
        else setExpandedStudent(id);
    };

    // Calculate Question Stats for Analysis Tab
    const questionAnalysisData = useMemo(() => {
        if (!archiveData) return [];
        const { exam, results } = archiveData;
        const totalStudents = results.length;

        return exam.questions.filter(q => q.questionType !== 'INFO').map(q => {
            let correctCount: number = 0;
            const answerCounts: Record<string, number> = {};
            
            results.forEach(r => {
                const ans = r.answers[q.id];
                const status = checkAnswerStatus(q, r.answers);

                if (status === 'CORRECT') {
                    correctCount = correctCount + 1;
                }

                if (ans) {
                    // Keep original raw answer for parsing later in render
                    const current = answerCounts[ans] || 0;
                    answerCounts[ans] = current + 1;
                }
            });

            return {
                id: q.id,
                qText: q.questionText,
                correctRate: totalStudents > 0 ? Math.round((correctCount / totalStudents) * 100) : 0,
                distribution: answerCounts,
                totalStudents,
                // Pass options only for SIMPLE MULTIPLE CHOICE to trigger Bar Chart View.
                // COMPLEX MC, MATCHING, etc will fallback to List View.
                options: q.questionType === 'MULTIPLE_CHOICE' ? q.options : undefined
            };
        });
    }, [archiveData]);

    // Calculate Question Stats for Visual Analysis Tab (Legacy for compatibility)
    const questionStats = useMemo(() => {
        if (!archiveData) return [];
        const { exam, results } = archiveData;
        const totalStudents = results.length;

        return exam.questions.filter(q => q.questionType !== 'INFO').map(q => {
            let correctCount = 0;
            results.forEach(r => {
                if (checkAnswerStatus(q, r.answers) === 'CORRECT') {
                    correctCount = correctCount + 1;
                }
            });
            return {
                id: q.id,
                correctRate: totalStudents > 0 ? Math.round((correctCount / totalStudents) * 100) : 0
            };
        });
    }, [archiveData]);

    // --- NEW: Category & Level Aggregation for Archive ---
    const { categoryStats, levelStats } = useMemo(() => {
        if (!archiveData) return { categoryStats: [], levelStats: [] };
        return calculateAggregateStats(archiveData.exam, archiveData.results);
    }, [archiveData]);

    // --- GENERAL RECOMMENDATION LOGIC ---
    const generalRecommendation = useMemo(() => {
        if (!archiveData) return '';
        const { results } = archiveData;
        const totalStudents = results.length;
        const averageScore = totalStudents > 0 ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / totalStudents) : 0;
        
        // Find weakest category
        const weakest = [...categoryStats].sort((a,b) => a.percentage - b.percentage)[0];

        if (averageScore < 60) {
            return `Tingkat kelulusan rendah (${averageScore}%). Disarankan remedial klasikal dengan fokus pada dasar materi "${weakest?.name || 'Umum'}".`;
        } else if (averageScore < 75) {
            return `Hasil cukup baik, namun perlu penguatan pada kategori "${weakest?.name || 'tertentu'}". Adakan sesi review sebelum lanjut ke materi baru.`;
        } else if (averageScore < 85) {
            return `Hasil memuaskan. Sebagian besar siswa menguasai kompetensi dasar. Pertahankan metode pengajaran saat ini.`;
        } else {
            return `Hasil istimewa (${averageScore}%). Siswa siap untuk pengayaan atau materi tingkat lanjut (HOTS).`;
        }
    }, [archiveData, categoryStats]);

    // --- UPLOAD VIEW ---
    if (!archiveData) {
        return (
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                {isLoadingCloud && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl flex flex-col items-center">
                            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                            <p className="text-sm font-bold text-slate-700 dark:text-white">{loadingMessage}</p>
                        </div>
                    </div>
                )}

                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Buka Arsip Ujian</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Akses data ujian lama dari Cloud Storage atau file lokal.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Cloud Archives */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                            <CloudArrowUpIcon className="w-5 h-5 text-indigo-500"/> Arsip Tersimpan (Cloud)
                        </h3>
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-2">
                            {cloudArchives.length > 0 ? (
                                cloudArchives.map((file, idx) => (
                                    <div key={idx} className="relative group">
                                        <button 
                                            onClick={() => loadFromCloud(file.name)}
                                            className="w-full text-left p-3 rounded-xl border border-slate-100 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-700 hover:border-indigo-100 transition-all group"
                                        >
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-300 pr-10">{file.name}</p>
                                            <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                                                <span>{new Date(file.created_at).toLocaleDateString()}</span>
                                                <span>{(file.size / 1024).toFixed(1)} KB</span>
                                            </div>
                                        </button>
                                        <button 
                                            onClick={(e) => handleDeleteArchive(file.name, e)}
                                            className="absolute top-2 right-2 p-1.5 bg-white dark:bg-slate-700 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-all shadow-sm border border-slate-200 dark:border-slate-600 z-10"
                                            title="Hapus Arsip"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 text-slate-400 text-xs">Tidak ada arsip di cloud.</div>
                            )}
                        </div>
                    </div>

                    {/* Local File */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col">
                        <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                            <DocumentDuplicateIcon className="w-5 h-5 text-emerald-500"/> Upload File Lokal
                        </h3>
                        <div onDrop={handleDrop} onDragOver={handleDragOver} className="flex-1 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors relative cursor-pointer flex flex-col items-center justify-center" onClick={() => fileInputRef.current?.click()}>
                            <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                            <CloudArrowUpIcon className="w-10 h-10 text-slate-300 dark:text-slate-500 mb-3" />
                            <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">Pilih file .json</p>
                        </div>
                        {error && <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-xs rounded-lg border border-rose-100 dark:border-rose-900"><strong>Error:</strong> {error}</div>}
                    </div>
                </div>
            </div>
        );
    }
    
    // --- DISPLAY VIEW ---
    const { exam: displayExam, results: displayResults } = archiveData;
    const currentTotalStudents = displayResults.length;
    const currentAverageScore = currentTotalStudents > 0 ? Math.round(displayResults.reduce((acc, r) => acc + r.score, 0) / currentTotalStudents) : 0;
    const currentHighestScore = currentTotalStudents > 0 ? Math.max(...displayResults.map(r => r.score)) : 0;
    const currentLowestScore = currentTotalStudents > 0 ? Math.min(...displayResults.map(r => r.score)) : 0;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <style>{`
                @media print {
                    /* FORCE LIGHT THEME PREFERENCE */
                    :root {
                        color-scheme: light !important;
                    }
                    
                    /* RESET GLOBAL STYLES */
                    body, html, .dark, .bg-slate-900, .dark\:bg-slate-900, .bg-slate-950, .dark\:bg-slate-950 {
                        background-color: #ffffff !important;
                        color: #0f172a !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    /* OVERRIDE DARK MODE TEXT COLORS */
                    .text-white, .dark\:text-white, 
                    .text-slate-200, .dark\:text-slate-200,
                    .text-slate-300, .dark\:text-slate-300,
                    .text-slate-400, .dark\:text-slate-400 {
                        color: #0f172a !important;
                    }

                    /* OVERRIDE DARK MODE BACKGROUNDS */
                    .dark\:bg-slate-800, .bg-slate-800,
                    .dark\:bg-slate-700, .bg-slate-700,
                    .dark\:bg-slate-900\/30, .dark\:bg-indigo-900\/30 {
                        background-color: transparent !important;
                    }

                    /* FIX BORDERS */
                    .border-slate-700, .dark\:border-slate-700,
                    .border-slate-600, .dark\:border-slate-600 {
                        border-color: #cbd5e1 !important; /* slate-300 */
                        border-width: 1px !important;
                        border-style: solid !important;
                    }

                    /* FIX SEMANTIC COLORS (Ensure light background for readability) */
                    .bg-emerald-50, .dark\:bg-emerald-900\/30 { background-color: #ecfdf5 !important; color: #065f46 !important; }
                    .bg-rose-50, .dark\:bg-rose-900\/30 { background-color: #fff1f2 !important; color: #9f1239 !important; }
                    .bg-amber-50, .dark\:bg-amber-900\/30 { background-color: #fffbeb !important; color: #92400e !important; }
                    .bg-blue-50, .dark\:bg-blue-900\/30 { background-color: #eff6ff !important; color: #1e40af !important; }
                    
                    /* HIDE INTERACTIVE ELEMENTS */
                    .print\:hidden {
                        display: none !important;
                    }

                    /* SHOW PRINT BLOCK */
                    .print\:block {
                        display: block !important;
                    }

                    /* LAYOUT FIXES */
                    @page { margin: 1.5cm; size: A4; }
                    .page-break { page-break-before: always; }
                    .avoid-break { break-inside: avoid; page-break-inside: avoid; }
                    
                    /* ENSURE TABLES ARE READABLE */
                    table { width: 100% !important; border-collapse: collapse !important; font-size: 10pt !important; }
                    th, td { border: 1px solid #94a3b8 !important; padding: 4px 8px !important; color: #0f172a !important; }
                    thead th { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact !important; }
                }
            `}</style>

            {fixMessage && (
                <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 p-4 rounded-xl flex items-center gap-3 animate-fade-in shadow-sm print:hidden">
                    <ExclamationTriangleIcon className="w-6 h-6 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="flex-1">
                        <p className="text-sm font-bold">Auto-Correction Active</p>
                        <p className="text-xs">{fixMessage}</p>
                    </div>
                </div>
            )}

            {/* INTERACTIVE HEADER (HIDDEN ON PRINT) */}
            <div className="p-6 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm print:hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Pratinjau Arsip: <span className="text-indigo-600 dark:text-indigo-400">{displayExam.config.subject}</span></h2>
                            {sourceType === 'LOCAL' && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-bold uppercase border border-gray-200">Local File</span>}
                            {sourceType === 'CLOUD' && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase border border-blue-100">Cloud Storage</span>}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-mono">{displayExam.code} • {displayExam.createdAt ? `Diarsipkan pada ${displayExam.createdAt}` : 'Tanggal tidak diketahui'}</p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button onClick={resetView} className="flex-1 md:flex-none px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all">Muat Lain</button>
                        
                        {sourceType === 'LOCAL' && (
                            <>
                                <button onClick={handleRegisterStats} disabled={isRegisteringStats} className="flex-1 md:flex-none px-4 py-2 bg-amber-500 text-white text-xs font-bold uppercase rounded-lg hover:bg-amber-600 transition-all shadow-md shadow-amber-100 dark:shadow-amber-900/30 flex items-center justify-center gap-2">
                                    {isRegisteringStats ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <ChartBarIcon className="w-4 h-4"/>}
                                    <span>Catat Statistik</span>
                                </button>

                                <button onClick={handleUploadToCloud} disabled={isLoadingCloud} className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 text-white text-xs font-bold uppercase rounded-lg hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 dark:shadow-emerald-900/30 flex items-center justify-center gap-2">
                                    {isLoadingCloud ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <CloudArrowUpIcon className="w-4 h-4"/>}
                                    <span>Simpan ke Cloud</span>
                                </button>
                            </>
                        )}

                        <button onClick={handlePrint} className="flex-1 md:flex-none px-4 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white transition-all border border-slate-200 dark:border-slate-600 flex items-center justify-center gap-2 shadow-sm"><PrinterIcon className="w-4 h-4"/> Print Arsip</button>
                        <button onClick={() => onReuseExam(displayExam)} className="flex-1 md:flex-none px-4 py-2 bg-indigo-600 dark:bg-indigo-600 text-white text-xs font-bold uppercase rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 dark:shadow-indigo-900/30 flex items-center gap-2"><DocumentDuplicateIcon className="w-4 h-4"/> Gunakan Ulang</button>
                    </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex gap-4">
                    {(['DETAIL', 'STUDENTS', 'ANALYSIS'] as ArchiveTab[]).map(tab => {
                        const label = tab === 'DETAIL' ? 'Detail Ujian' : tab === 'STUDENTS' ? `Rekap Siswa (${currentTotalStudents})` : 'Analisis Soal';
                        return <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === tab ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>{label}</button>
                    })}
                </div>
            </div>

            {/* INTERACTIVE CONTENT (HIDDEN ON PRINT) */}
            <div className="animate-fade-in print:hidden">
                {activeTab === 'DETAIL' && (
                    <div className="space-y-4">
                        {displayExam.questions.map((q, index) => {
                            const questionNumber = displayExam.questions.slice(0, index).filter(i => i.questionType !== 'INFO').length + 1;
                            return (
                                <div key={q.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <div className="flex items-start gap-4">
                                        <span className="flex-shrink-0 mt-1 text-sm font-bold w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">{q.questionType === 'INFO' ? 'i' : questionNumber}</span>
                                        <div className="flex-1 space-y-4 min-w-0">
                                            <div className="prose prose-sm max-w-none text-slate-700 dark:text-slate-200" dangerouslySetInnerHTML={{ __html: q.questionText }}></div>
                                            {q.questionType === 'MULTIPLE_CHOICE' && q.options && q.options.map((opt, i) => <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${q.correctAnswer === opt ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 font-bold text-emerald-800 dark:text-emerald-300' : 'bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}><span className="font-bold">{String.fromCharCode(65 + i)}.</span><div className="flex-1" dangerouslySetInnerHTML={{ __html: opt }}></div>{q.correctAnswer === opt && <CheckCircleIcon className="w-5 h-5 text-emerald-500 ml-auto shrink-0"/>}</div>)}
                                            {q.questionType === 'COMPLEX_MULTIPLE_CHOICE' && q.options && q.options.map((opt, i) => <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${q.correctAnswer?.includes(opt) ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 font-bold text-emerald-800 dark:text-emerald-300' : 'bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}><span className="font-bold">{String.fromCharCode(65 + i)}.</span><div className="flex-1" dangerouslySetInnerHTML={{ __html: opt }}></div>{q.correctAnswer?.includes(opt) && <CheckCircleIcon className="w-5 h-5 text-emerald-500 ml-auto shrink-0"/>}</div>)}
                                            {q.questionType === 'TRUE_FALSE' && q.trueFalseRows && <div className="border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden"><table className="w-full text-sm"><thead className="bg-slate-50 dark:bg-slate-700"><tr><th className="p-2 font-bold text-slate-600 dark:text-slate-300 text-left">Pernyataan</th><th className="p-2 font-bold text-slate-600 dark:text-slate-300 text-center w-32">Jawaban</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700">{q.trueFalseRows.map((r, i) => <tr key={i} className="border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800"><td className="p-2 dark:text-slate-200">{r.text}</td><td className={`p-2 text-center font-bold ${r.answer ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20':'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20'}`}>{r.answer ? 'Benar':'Salah'}</td></tr>)}</tbody></table></div>}
                                            {q.questionType === 'MATCHING' && q.matchingPairs && <div className="space-y-2">{q.matchingPairs.map((p,i) => <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 text-sm"><div className="flex-1 font-medium dark:text-slate-200">{p.left}</div><div className="text-slate-300 dark:text-slate-500">→</div><div className="flex-1 font-bold dark:text-slate-200">{p.right}</div></div>)}</div>}
                                            {(q.questionType === 'ESSAY' || q.questionType === 'FILL_IN_THE_BLANK') && q.correctAnswer && <div className="mt-4 pt-3 border-t dark:border-slate-700"><p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Kunci Jawaban</p><div className="mt-1 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-sm prose prose-sm max-w-none dark:text-slate-200" dangerouslySetInnerHTML={{__html: q.correctAnswer}}></div></div>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                {activeTab === 'STUDENTS' && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                         <table className="w-full text-left">
                            <thead className="bg-slate-50/50 dark:bg-slate-700/50">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Siswa</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Kelas</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Nilai</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">B/S/K</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Aktivitas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                {displayResults.map(r => {
                                    const { correct, wrong, empty, score } = getCalculatedStats(r, displayExam);
                                    return (
                                    <React.Fragment key={r.student.studentId}>
                                        <tr onClick={() => toggleStudent(r.student.studentId)} className="hover:bg-slate-50/30 dark:hover:bg-slate-700/30 cursor-pointer group">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{r.student.fullName}</div>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{r.student.class}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-sm font-black px-2 py-1 rounded ${score >= 75 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30' : score >= 50 ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30' : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30'}`}>
                                                    {score}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center text-xs font-bold text-slate-600 dark:text-slate-400">
                                                <span className="text-emerald-600 dark:text-emerald-400" title="Benar">{correct}</span> / <span className="text-rose-600 dark:text-rose-400" title="Salah">{wrong}</span> / <span className="text-slate-400 dark:text-slate-500" title="Kosong">{empty}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {r.activityLog && r.activityLog.length > 0 ? (
                                                    <span className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded font-bold text-[10px] border border-amber-100 dark:border-amber-800">{r.activityLog.length} Log</span>
                                                ) : (
                                                    <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded font-bold text-[10px] border border-emerald-100 dark:border-emerald-800">Aman</span>
                                                )}
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                )})}
                            </tbody>
                         </table>
                    </div>
                )}
                {activeTab === 'ANALYSIS' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                             <StatWidget label="Rata-rata" value={currentAverageScore} color="bg-indigo-50" icon={ChartBarIcon} />
                             <StatWidget label="Tertinggi" value={currentHighestScore} color="bg-emerald-50" icon={CheckCircleIcon} />
                             <StatWidget label="Terendah" value={currentLowestScore} color="bg-rose-50" icon={XMarkIcon} />
                             <StatWidget label="Partisipan" value={currentTotalStudents} color="bg-blue-50" icon={UserIcon} />
                        </div>
                        {(categoryStats.length > 0 || levelStats.length > 0) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><ListBulletIcon className="w-4 h-4"/> Penguasaan Materi (Kategori)</h3>
                                    <div className="space-y-3">
                                        {categoryStats.map(stat => (
                                            <div key={stat.name}>
                                                <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                                                    <span>{stat.name}</span><span className={stat.percentage < 50 ? 'text-rose-500' : stat.percentage < 80 ? 'text-amber-500' : 'text-emerald-600'}>{stat.percentage}%</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"><div className={`h-full transition-all duration-1000 ${stat.percentage >= 80 ? 'bg-emerald-500' : stat.percentage >= 50 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{width: `${stat.percentage}%`}}></div></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><ChartBarIcon className="w-4 h-4"/> Tingkat Kesulitan (Level)</h3>
                                    <div className="space-y-3">
                                        {levelStats.map(stat => (
                                            <div key={stat.name}>
                                                <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                                                    <span>{stat.name}</span><span className={stat.percentage < 50 ? 'text-rose-500' : stat.percentage < 80 ? 'text-amber-500' : 'text-emerald-600'}>{stat.percentage}%</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"><div className={`h-full transition-all duration-1000 ${stat.percentage >= 80 ? 'bg-emerald-500' : stat.percentage >= 50 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{width: `${stat.percentage}%`}}></div></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        <div><h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><TableCellsIcon className="w-5 h-5 text-slate-400 dark:text-slate-500"/> Analisis Butir Soal</h3><div className="grid grid-cols-1 gap-4">{displayExam.questions.filter(q => q.questionType !== 'INFO').map((q, idx) => { const stats = questionStats.find(s => s.id === q.id) || { correctRate: 0 }; return <QuestionAnalysisItem key={q.id} q={q} index={idx} stats={stats} examResults={displayResults} />; })}</div></div>
                    </div>
                )}
            </div>
            
            {/* PRINT VIEW (Clean & Sequential 5 Points) - FORCE LIGHT MODE */}
            <div className="hidden print:block text-slate-900 bg-white">
                {/* Header Global */}
                <div className="border-b-2 border-slate-900 pb-2 mb-6">
                    <h1 className="text-2xl font-black uppercase tracking-tight">{displayExam.config.subject}</h1>
                    <div className="flex justify-between items-end mt-2">
                        <div className="text-xs font-bold text-slate-600">
                            <p>KODE UJIAN: <span className="font-mono text-slate-900 text-sm bg-slate-100 px-1">{displayExam.code}</span></p>
                            <p>TANGGAL: {new Date(displayExam.config.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p>SEKOLAH: {displayExam.authorSchool || '-'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-slate-500 uppercase">Arsip Lengkap Ujian</p>
                        </div>
                    </div>
                </div>

                {/* 1. LAPORAN UMUM */}
                <div className="mb-8 avoid-break">
                    <h3 className="font-bold text-sm uppercase tracking-wider mb-3 border-l-4 border-slate-800 pl-2">1. Laporan Umum</h3>
                    
                    {/* Stat Grid */}
                    <div className="grid grid-cols-4 gap-4 mb-4">
                        <div className="border border-slate-300 p-3 rounded text-center bg-slate-50">
                            <p className="text-[9px] font-bold text-slate-500 uppercase">Rata-rata</p>
                            <p className="text-lg font-black">{currentAverageScore}</p>
                        </div>
                        <div className="border border-slate-300 p-3 rounded text-center bg-slate-50">
                            <p className="text-[9px] font-bold text-slate-500 uppercase">Tertinggi</p>
                            <p className="text-lg font-black text-emerald-700">{currentHighestScore}</p>
                        </div>
                        <div className="border border-slate-300 p-3 rounded text-center bg-slate-50">
                            <p className="text-[9px] font-bold text-slate-500 uppercase">Terendah</p>
                            <p className="text-lg font-black text-rose-700">{currentLowestScore}</p>
                        </div>
                        <div className="border border-slate-300 p-3 rounded text-center bg-slate-50">
                            <p className="text-[9px] font-bold text-slate-500 uppercase">Partisipan</p>
                            <p className="text-lg font-black text-blue-700">{currentTotalStudents}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-4">
                        {/* Kategori */}
                        <div>
                            <p className="text-[10px] font-bold uppercase mb-2 text-slate-500">Persentase Penguasaan Materi (Kategori)</p>
                            <table className="w-full border-collapse border border-slate-300 text-[10px]">
                                <thead className="bg-slate-100"><tr><th className="border p-1 text-left">Kategori</th><th className="border p-1 text-right w-16">Penguasaan</th></tr></thead>
                                <tbody>
                                    {categoryStats.length > 0 ? categoryStats.map(s => (
                                        <tr key={s.name}><td className="border p-1">{s.name}</td><td className="border p-1 text-right font-bold">{s.percentage}%</td></tr>
                                    )) : <tr><td colSpan={2} className="border p-1 italic text-center">Data tidak tersedia</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        {/* Level */}
                        <div>
                            <p className="text-[10px] font-bold uppercase mb-2 text-slate-500">Persentase Tingkat Kesulitan</p>
                            <table className="w-full border-collapse border border-slate-300 text-[10px]">
                                <thead className="bg-slate-100"><tr><th className="border p-1 text-left">Level</th><th className="border p-1 text-right w-16">Ketuntasan</th></tr></thead>
                                <tbody>
                                    {levelStats.length > 0 ? levelStats.map(s => (
                                        <tr key={s.name}><td className="border p-1">{s.name}</td><td className="border p-1 text-right font-bold">{s.percentage}%</td></tr>
                                    )) : <tr><td colSpan={2} className="border p-1 italic text-center">Data tidak tersedia</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* General Recommendation Box */}
                    <div className="border border-slate-300 bg-slate-50 p-3 rounded">
                        <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Rekomendasi Tindakan Umum</p>
                        <p className="text-xs font-medium italic text-slate-800">"{generalRecommendation}"</p>
                    </div>
                </div>

                <div className="page-break"></div>

                {/* 2. REKAPITULASI HASIL */}
                <div className="mb-4">
                    <h3 className="font-bold text-sm uppercase tracking-wider mb-3 border-l-4 border-slate-800 pl-2">2. Rekapitulasi Hasil</h3>
                    <table className="w-full border-collapse border border-slate-300 text-[10px]">
                        <thead>
                            <tr className="bg-slate-100">
                                <th className="border border-slate-300 p-2 text-center w-8">No</th>
                                <th className="border border-slate-300 p-2 text-left w-40">Nama Siswa</th>
                                <th className="border border-slate-300 p-2 text-left w-20">Kelas</th>
                                <th className="border border-slate-300 p-2 text-center w-12">Nilai</th>
                                <th className="border border-slate-300 p-2 text-left">Rincian Jawaban (Hijau: Benar, Merah: Salah, Abu: Kosong)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayResults.map((r, index) => {
                                const { score } = getCalculatedStats(r, displayExam);
                                return (
                                    <tr key={r.student.studentId} className="avoid-break">
                                        <td className="border border-slate-300 p-2 text-center">{index + 1}</td>
                                        <td className="border border-slate-300 p-2 font-bold">{r.student.fullName}</td>
                                        <td className="border border-slate-300 p-2 uppercase">{r.student.class}</td>
                                        <td className="border border-slate-300 p-2 text-center font-bold text-sm">{score}</td>
                                        <td className="border border-slate-300 p-1">
                                            <div className="flex flex-wrap gap-0.5">
                                                {displayExam.questions.filter(q => q.questionType !== 'INFO').map((q, idx) => {
                                                    const status = checkAnswerStatus(q, r.answers);
                                                    let bgClass = 'bg-slate-200 text-slate-500'; 
                                                    if (status === 'CORRECT') bgClass = 'bg-emerald-300 text-emerald-900 border-emerald-400';
                                                    else if (status === 'WRONG') bgClass = 'bg-rose-300 text-rose-900 border-rose-400';
                                                    
                                                    return (
                                                        <div key={q.id} className={`w-4 h-4 flex items-center justify-center text-[8px] font-bold border border-transparent ${bgClass}`}>
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
                </div>

                <div className="page-break"></div>

                {/* 3. ANALISIS INDIVIDU (NEW) */}
                <div className="mb-4">
                    <h3 className="font-bold text-sm uppercase tracking-wider mb-3 border-l-4 border-slate-800 pl-2">3. Analisis Individu</h3>
                    <table className="w-full border-collapse border border-slate-300 text-[10px]">
                        <thead>
                            <tr className="bg-slate-100">
                                <th className="border border-slate-300 p-2 text-center w-8">No</th>
                                <th className="border border-slate-300 p-2 text-left w-32">Nama Siswa</th>
                                <th className="border border-slate-300 p-2 text-left">Analisis Kategori (Penguasaan)</th>
                                <th className="border border-slate-300 p-2 text-left w-48">Rekomendasi Tindakan</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayResults.map((r, index) => {
                                const analysis = analyzeStudentPerformance(displayExam, r);
                                return (
                                    <tr key={r.student.studentId} className="avoid-break">
                                        <td className="border border-slate-300 p-2 text-center">{index + 1}</td>
                                        <td className="border border-slate-300 p-2 font-bold">{r.student.fullName}</td>
                                        <td className="border border-slate-300 p-2">
                                            <div className="flex flex-wrap gap-2">
                                                {analysis.stats.map(stat => (
                                                    <span key={stat.name} className="inline-flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                                        <span className="font-semibold">{stat.name}:</span>
                                                        <span className={stat.percentage < 50 ? 'text-rose-700 font-bold' : stat.percentage < 80 ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
                                                            {stat.percentage}%
                                                        </span>
                                                    </span>
                                                ))}
                                                {analysis.stats.length === 0 && <span className="text-slate-400 italic">-</span>}
                                            </div>
                                        </td>
                                        <td className="border border-slate-300 p-2 font-medium italic text-slate-700">
                                            "{analysis.recommendation}"
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="page-break"></div>

                {/* 4. ANALISIS BUTIR SOAL */}
                <div className="mb-4">
                    <h3 className="font-bold text-sm uppercase tracking-wider mb-2 border-l-4 border-slate-800 pl-2">4. Analisis Butir Soal</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                        {questionAnalysisData.map((data, idx) => {
                            const difficultyLabel = data.correctRate >= 80 ? 'Mudah' : data.correctRate >= 50 ? 'Sedang' : 'Sulit';
                            const difficultyColor = data.correctRate >= 80 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                : data.correctRate >= 50 
                                    ? 'bg-orange-50 text-orange-700 border-orange-100' 
                                    : 'bg-rose-50 text-rose-700 border-rose-100';
                            
                            // Get original question to check correct answer
                            const originalQ = displayExam.questions.find(q => q.id === data.id);

                            return (
                                <div key={data.id} className="avoid-break border border-slate-300 rounded p-2 text-xs flex flex-col gap-2 bg-white">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10px] border border-slate-200">Soal {idx + 1}</span>
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${difficultyColor}`}>{difficultyLabel}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                                            <div className={`h-full ${data.correctRate >= 80 ? 'bg-emerald-500' : data.correctRate >= 50 ? 'bg-orange-400' : 'bg-rose-500'}`} style={{ width: `${data.correctRate}%` }}></div>
                                        </div>
                                        <span className="font-bold text-[10px] w-14 text-right">{data.correctRate}% Benar</span>
                                    </div>

                                    <div className="pt-1 border-t border-slate-100">
                                        {/* Updated Distribution Rendering - Handles ALL TYPES Correctly */}
                                        {data.options ? (
                                            /* Multiple Choice & Complex Grid */
                                            <div className="grid grid-cols-1 gap-1 text-[9px]">
                                                {data.options.map((opt, i) => {
                                                    const label = String.fromCharCode(65+i);
                                                    const count = data.distribution[opt] || 0;
                                                    const pct = currentTotalStudents > 0 ? Math.round((count/currentTotalStudents)*100) : 0;
                                                    
                                                    const isCorrect = 
                                                        (originalQ?.questionType === 'MULTIPLE_CHOICE' && opt === originalQ.correctAnswer) ||
                                                        (originalQ?.questionType === 'COMPLEX_MULTIPLE_CHOICE' && originalQ.correctAnswer?.includes(opt));
                                                    
                                                    return (
                                                        <div key={i} className={`flex items-center justify-between px-2 py-1 rounded border ${isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' : 'border-slate-100 text-slate-600'}`}>
                                                            <div className="flex gap-2 truncate max-w-[70%]">
                                                                <span className="w-4 font-bold">{label}.</span>
                                                                <div className="truncate [&_p]:inline [&_br]:hidden" dangerouslySetInnerHTML={{__html: opt}}></div>
                                                            </div>
                                                            <span className="shrink-0"><b>{count}</b> ({pct}%)</span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            /* Generic List for other types (MATCHING, TRUE_FALSE, ESSAY) */
                                            <div className="flex flex-col gap-1 text-[9px]">
                                                {Object.entries(data.distribution).length > 0 ? (
                                                    Object.entries(data.distribution)
                                                        .sort(([,a], [,b]) => (b as number) - (a as number)) 
                                                        .slice(0, 10) // Show top 10 unique answers
                                                        .map(([ans, count], i) => {
                                                            const numCount = count as number;
                                                            const pct = currentTotalStudents > 0 ? Math.round((numCount/currentTotalStudents)*100) : 0;
                                                            
                                                            // LOGIC UNTUK FORMAT JAWABAN YANG LEBIH BAIK
                                                            let displayAns = ans; // Use raw answer by default (may contain HTML)
                                                            let isCorrect = false;

                                                            try {
                                                                if (originalQ?.questionType === 'MATCHING') {
                                                                    const parsed = JSON.parse(ans);
                                                                    const orderedValues = (originalQ.matchingPairs || []).map((_, idx) => parsed[idx] || '—');
                                                                    displayAns = orderedValues.join(', ');
                                                                    isCorrect = originalQ.matchingPairs?.every((pair, idx) => parsed[idx] === pair.right) ?? false;
                                                                } else if (originalQ?.questionType === 'TRUE_FALSE') {
                                                                    const parsed = JSON.parse(ans);
                                                                    const orderedValues = (originalQ.trueFalseRows || []).map((_, idx) => {
                                                                        const val = parsed[idx];
                                                                        return val === true ? 'Benar' : (val === false ? 'Salah' : '—');
                                                                    });
                                                                    displayAns = orderedValues.join(', ');
                                                                    isCorrect = originalQ.trueFalseRows?.every((row, idx) => parsed[idx] === row.answer) ?? false;
                                                                } else if (originalQ?.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
                                                                    const sSet = new Set(normalize(ans).split(',').map(s=>s.trim()));
                                                                    const cSet = new Set(normalize(originalQ.correctAnswer || '').split(',').map(s=>s.trim()));
                                                                    isCorrect = sSet.size === cSet.size && [...sSet].every(x => cSet.has(x));
                                                                } else {
                                                                    const normAns = normalize(ans);
                                                                    const normKey = normalize(originalQ?.correctAnswer || '');
                                                                    isCorrect = normAns === normKey;
                                                                }
                                                            } catch(e) {}

                                                            return (
                                                                <div key={i} className={`flex items-start justify-between px-2 py-1 rounded border ${isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                                                                    <div className="truncate flex-1 mr-2 [&_p]:inline [&_br]:hidden" dangerouslySetInnerHTML={{__html: displayAns}}></div>
                                                                    <span className="shrink-0 font-bold">{count} ({pct}%)</span>
                                                                </div>
                                                            )
                                                        })
                                                ) : (
                                                    <span className="text-slate-400 italic text-center py-1">Belum ada jawaban.</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="page-break"></div>

                {/* 5. BANK SOAL & KUNCI JAWABAN */}
                <div>
                    <div className="border-b-2 border-slate-900 pb-2 mb-4">
                        <h1 className="text-lg font-black uppercase tracking-tight">5. Bank Soal & Kunci Jawaban</h1>
                    </div>
                    
                    <div className="space-y-4">
                        {displayExam.questions.map((q, index) => {
                            const questionNumber = displayExam.questions.slice(0, index).filter(i => i.questionType !== 'INFO').length + 1;
                            return (
                                <div key={q.id} className="avoid-break border-b border-slate-200 pb-4 last:border-0">
                                    <div className="flex gap-3">
                                        <span className="font-bold text-sm w-6">{q.questionType === 'INFO' ? 'i' : questionNumber}.</span>
                                        <div className="flex-1">
                                            <div className="text-xs text-slate-800 mb-2 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: q.questionText }}></div>
                                            
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

                                            {(q.questionType === 'ESSAY' || q.questionType === 'FILL_IN_THE_BLANK') && q.correctAnswer && (
                                                <div className="mt-2 text-[10px] bg-emerald-50 p-2 border border-emerald-200 rounded">
                                                    <p className="font-bold text-emerald-700 text-[9px] uppercase mb-1">
                                                        {q.questionType === 'ESSAY' ? 'Rubrik / Poin Jawaban:' : 'Kunci Jawaban Singkat:'}
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
