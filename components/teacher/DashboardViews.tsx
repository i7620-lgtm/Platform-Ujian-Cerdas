
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
                                                <div className="flex-1 truncate [&_p]:inline [&_br]:hidden" dangerouslySetInnerHTML={{ __html: opt }}></div>
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
                                            <span dangerouslySetInnerHTML={{__html: q.correctAnswer || ''}}></span>
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
                                                <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                                                    {isCorrect && <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0"/>}
                                                    <div className={`truncate italic ${isCorrect ? 'text-emerald-700 font-medium' : ''} [&_p]:inline [&_br]:hidden`} dangerouslySetInnerHTML={{__html: displayAns}}></div>
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

export const MetaBadge: React.FC<{ text: string; colorClass?: string }> = ({ text, colorClass = "bg-gray-100 text-gray-600" }) => { if (!text || text === 'Lainnya') return null; return (<span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border border-opacity-50 ${colorClass}`}>{text}</span>); };

// --- CREATION VIEW ---
interface CreationViewProps { onQuestionsGenerated: (questions: Question[], mode: 'manual' | 'auto') => void; }
type InputMethod = 'paste' | 'upload';
export const CreationView: React.FC<CreationViewProps> = ({ onQuestionsGenerated }) => {
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
            <div className="space-y-8"><div className="text-center space-y-4"><h2 className="text-3xl font-bold text-neutral">Buat Ujian Baru</h2><p className="text-gray-500 max-w-2xl mx-auto">Mulai dengan mengunggah soal dalam format PDF, menempelkan teks soal, atau membuat soal secara manual. Sistem kami akan membantu Anda menyusun ujian dengan mudah.</p></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className={`p-6 border-2 rounded-2xl cursor-pointer transition-all duration-300 group border-gray-100 hover:border-primary/50 hover:shadow-lg bg-white`} onClick={handleManualCreateClick}><div className="flex flex-col items-center text-center space-y-3"><div className={`p-4 rounded-2xl transition-colors bg-gray-50 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary`}><PencilIcon className="w-8 h-8" /></div><h3 className="font-bold text-lg text-neutral">Buat Manual</h3><p className="text-sm text-gray-500">Buat soal dari awal secara manual tanpa impor file atau teks.</p></div></div><div className={`p-6 border-2 rounded-2xl cursor-pointer transition-all duration-300 group ${inputMethod === 'upload' ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-100 bg-white hover:border-primary/50 hover:shadow-lg'}`} onClick={() => setInputMethod('upload')}><div className="flex flex-col items-center text-center space-y-3"><div className={`p-4 rounded-2xl transition-colors ${inputMethod === 'upload' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary'}`}><CloudArrowUpIcon className="w-8 h-8" /></div><h3 className="font-bold text-lg text-neutral">Unggah PDF Soal</h3><p className="text-sm text-gray-500">Sistem akan otomatis mendeteksi dan memotong soal dari file PDF Anda.</p></div></div><div className={`p-6 border-2 rounded-2xl cursor-pointer transition-all duration-300 group ${inputMethod === 'paste' ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-100 bg-white hover:border-primary/50 hover:shadow-lg'}`} onClick={() => setInputMethod('paste')}><div className="flex flex-col items-center text-center space-y-3"><div className={`p-4 rounded-2xl transition-colors ${inputMethod === 'paste' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary'}`}><ListBulletIcon className="w-8 h-8" /></div><h3 className="font-bold text-lg text-neutral">Tempel Teks Soal</h3><p className="text-sm text-gray-500">Salin dan tempel teks soal langsung dari dokumen Word atau sumber lain.</p></div></div></div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all duration-300"><div className="mb-4"><h3 className="text-lg font-bold text-neutral mb-1">{inputMethod === 'upload' ? 'Unggah File PDF' : 'Tempel Teks Soal'}</h3><p className="text-sm text-gray-500">{inputMethod === 'upload' ? 'Pilih file PDF dari perangkat Anda.' : 'Pastikan format soal jelas (nomor dan opsi).'}</p></div>
                    {inputMethod === 'upload' ? (
                        <div className="space-y-4">
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors relative">
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
                                    <CloudArrowUpIcon className="w-10 h-10 text-gray-400 mx-auto" />
                                    {uploadedFile ? (<p className="font-semibold text-primary">{uploadedFile.name}</p>) : (<><p className="text-gray-600 font-medium">Klik atau seret file PDF ke sini</p><p className="text-xs text-gray-400">Maksimal ukuran file 10MB</p></>)}
                                </div>
                            </div>
                            {previewImages.length > 0 && (<div className="space-y-2"><p className="text-sm font-semibold text-gray-700">Pratinjau Halaman Pertama:</p><div className="border rounded-xl overflow-hidden max-h-[300px] overflow-y-auto bg-gray-50 p-2 text-center"><img src={previewImages[0]} alt="Preview PDF" className="max-w-full h-auto mx-auto shadow-sm rounded-lg" /></div><div className="flex justify-end"><button onClick={handleExtractText} className="text-sm text-primary hover:underline flex items-center gap-1" disabled={isLoading}><FileTextIcon className="w-4 h-4" /> Ekstrak Teks dari PDF (Jika Auto-Crop Gagal)</button></div></div>)}
                        </div>
                    ) : (<div className="space-y-4"><textarea value={inputText} onChange={(e) => setInputText(e.target.value)} className="w-full h-64 p-4 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary font-mono text-sm resize-y" placeholder={`Contoh Format:\n\n1. Apa ibukota Indonesia?\nA. Bandung\nB. Jakarta\nC. Surabaya\nD. Medan\n\nKunci Jawaban: B`} />{inputText && (<div className="flex justify-end"><button onClick={handleDirectManualTransfer} className="text-sm text-secondary hover:underline flex items-center gap-1"><PencilIcon className="w-4 h-4" /> Gunakan sebagai Soal Manual (Tanpa Parsing Otomatis)</button></div>)}</div>)}
                    {error && (<div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl flex items-start gap-2 border border-red-100"><span className="font-bold">Error:</span> {error}</div>)}
                    <div className="mt-6 flex justify-end"><button onClick={handleStartAnalysis} disabled={isLoading || (!inputText && !uploadedFile)} className={`w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all ${isLoading || (!inputText && !uploadedFile) ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-focus hover:shadow-lg transform hover:-translate-y-0.5'}`}>{isLoading ? (<><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> Memproses...</>) : (<><CogIcon className="w-5 h-5" />{inputMethod === 'upload' ? 'Analisis & Crop PDF' : 'Analisis Teks'}</>)}</button></div>
                </div>
            </div>
        </div>
    );
};

export const DraftsView: React.FC<{ exams: Exam[]; onContinueDraft: (exam: Exam) => void; onDeleteDraft: (exam: Exam) => void; }> = ({ exams, onContinueDraft, onDeleteDraft }) => {
    const [previewExam, setPreviewExam] = useState<Exam | null>(null);
    return (
        <div className="space-y-6 animate-fade-in"><div className="flex items-center gap-2"><div className="p-2 bg-gray-100 rounded-lg"><PencilIcon className="w-6 h-6 text-gray-600" /></div><div><h2 className="text-2xl font-bold text-neutral">Draf Soal</h2><p className="text-sm text-gray-500">Lanjutkan pembuatan soal yang belum selesai.</p></div></div>
            {exams.length > 0 ? (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{exams.map(exam => (<div key={exam.code} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 relative group flex flex-col h-full"><button type="button" onClick={(e) => { e.stopPropagation(); onDeleteDraft(exam); }} className="absolute top-3 right-3 p-2 bg-white text-gray-400 hover:text-red-600 hover:bg-red-50 border border-gray-100 hover:border-red-100 rounded-full transition-all shadow-sm z-10" title="Hapus Draf"><TrashIcon className="w-4 h-4" /></button><div className="flex-1"><div className="flex items-start justify-between mb-2"><span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-md uppercase tracking-wider border border-gray-200">Draft</span></div><h3 className="font-bold text-lg text-gray-800 mb-1">{exam.config.subject || "Tanpa Judul"}</h3><p className="text-sm text-gray-400 font-mono font-medium mb-3">{exam.code}</p><div className="flex flex-wrap gap-2 mb-4"><MetaBadge text={exam.config.classLevel} colorClass="bg-blue-50 text-blue-700 border-blue-100" /><MetaBadge text={exam.config.examType} colorClass="bg-purple-50 text-purple-700 border-purple-100" /></div><div className="h-px bg-gray-50 w-full mb-4"></div><div className="text-xs text-gray-500 space-y-2 mb-6"><div className="flex items-center gap-2"><CalendarDaysIcon className="w-4 h-4 text-gray-400" /><span>{new Date(exam.config.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div><div className="flex items-center gap-2"><ListBulletIcon className="w-4 h-4 text-gray-400" /><span>{exam.questions.filter(q => q.questionType !== 'INFO').length} Soal Tersimpan</span></div></div></div><div className="flex gap-2"><button onClick={() => setPreviewExam(exam)} className="flex-1 py-2.5 px-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 hover:text-primary transition-colors flex items-center justify-center gap-2 shadow-sm" title="Preview Soal"><EyeIcon className="w-4 h-4" /> Preview</button><button onClick={() => onContinueDraft(exam)} className="flex-[2] py-2.5 px-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 transition-colors flex items-center justify-center gap-2 shadow-sm"><PencilIcon className="w-4 h-4" /> Edit</button></div></div>))}</div>) : (<div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200"><div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><PencilIcon className="h-8 w-8 text-gray-300" /></div><h3 className="text-base font-bold text-gray-900">Belum Ada Draf</h3><p className="mt-1 text-sm text-gray-500">Anda belum menyimpan draf soal apapun.</p></div>)}
            {previewExam && (<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-in-up"><div className="p-4 border-b bg-gray-50 flex justify-between items-center"><h3 className="font-bold text-lg text-gray-800">Preview Ujian</h3><button onClick={() => setPreviewExam(null)} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><XMarkIcon className="w-5 h-5" /></button></div><div className="p-6 max-h-[60vh] overflow-y-auto"><div className="space-y-4">{previewExam.questions.map((q, i) => (<div key={i} className="bg-slate-50 p-3 rounded-lg"><p className="text-xs font-bold text-slate-500 mb-1">Soal {i+1}</p><div className="text-sm text-slate-700" dangerouslySetInnerHTML={{__html: q.questionText}}></div></div>))}</div></div><div className="p-4 border-t bg-gray-50 text-right"><button onClick={() => setPreviewExam(null)} className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-900">Tutup</button></div></div></div>)}
        </div>
    );
};

export const OngoingExamsView: React.FC<{ exams: Exam[]; results: Result[]; onSelectExam: (e: Exam) => void; onDuplicateExam: (e: Exam) => void }> = ({ exams, results, onSelectExam, onDuplicateExam }) => {
    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-indigo-100 rounded-lg"><ClockIcon className="w-6 h-6 text-indigo-600" /></div>
                <div><h2 className="text-2xl font-bold text-neutral">Ujian Berlangsung</h2><p className="text-sm text-gray-500">Pantau aktivitas siswa secara realtime.</p></div>
            </div>
            {exams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {exams.map(exam => {
                        const participantCount = new Set(results.filter(r => r.examCode === exam.code).map(r => r.student.studentId)).size;
                         return (
                            <div key={exam.code} className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm hover:shadow-lg transition-all relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => {e.stopPropagation(); onDuplicateExam(exam)}} className="p-2 bg-white text-slate-400 hover:text-indigo-600 rounded-full shadow-sm border border-slate-100" title="Duplikat Ujian"><DocumentDuplicateIcon className="w-4 h-4"/></button>
                                </div>
                                <div className="flex justify-between items-start mb-4">
                                    <RemainingTime exam={exam} />
                                </div>
                                <h3 className="font-bold text-lg text-slate-800 mb-1">{exam.config.subject}</h3>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">{exam.code}</span>
                                    <MetaBadge text={exam.config.classLevel} />
                                </div>
                                <div className="flex items-center gap-4 text-xs text-slate-500 font-medium mb-6">
                                     <div className="flex items-center gap-1"><UserIcon className="w-4 h-4" /> {participantCount} Peserta</div>
                                     <div className="flex items-center gap-1"><ListBulletIcon className="w-4 h-4" /> {exam.questions.length} Soal</div>
                                </div>
                                <button onClick={() => onSelectExam(exam)} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                                    <PlayIcon className="w-4 h-4" /> Buka Live Monitor
                                </button>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><ClockIcon className="h-8 w-8 text-indigo-300" /></div>
                    <h3 className="text-base font-bold text-gray-900">Tidak Ada Ujian Berlangsung</h3>
                    <p className="mt-1 text-sm text-gray-500">Jadwal ujian aktif akan muncul di sini.</p>
                </div>
            )}
        </div>
    );
}

export const UpcomingExamsView: React.FC<{ exams: Exam[]; onEditExam: (e: Exam) => void }> = ({ exams, onEditExam }) => {
     return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg"><CalendarDaysIcon className="w-6 h-6 text-blue-600" /></div>
                <div><h2 className="text-2xl font-bold text-neutral">Ujian Terjadwal</h2><p className="text-sm text-gray-500">Ujian yang akan datang.</p></div>
            </div>
             {exams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {exams.map(exam => (
                         <div key={exam.code} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold border border-blue-100">
                                    <CalendarDaysIcon className="w-3.5 h-3.5" />
                                    <span>{new Date(exam.config.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • {exam.config.startTime}</span>
                                </div>
                                <button onClick={() => onEditExam(exam)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><PencilIcon className="w-4 h-4"/></button>
                            </div>
                            <h3 className="font-bold text-lg text-slate-800 mb-1">{exam.config.subject}</h3>
                            <p className="text-sm text-slate-500 mb-4 line-clamp-2">{exam.config.description || "Tidak ada deskripsi."}</p>
                            <div className="flex flex-wrap gap-2 mt-auto">
                                <MetaBadge text={exam.config.classLevel} colorClass="bg-slate-100 text-slate-600" />
                                <MetaBadge text={exam.config.examType} colorClass="bg-slate-100 text-slate-600" />
                            </div>
                         </div>
                    ))}
                </div>
             ) : (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <p className="text-sm text-gray-500">Tidak ada ujian terjadwal.</p>
                </div>
            )}
        </div>
     );
}

export const FinishedExamsView: React.FC<{ exams: Exam[]; onSelectExam: (e: Exam) => void; onDuplicateExam: (e: Exam) => void; onDeleteExam: (e: Exam) => void; onArchiveExam: (e: Exam) => void; }> = ({ exams, onSelectExam, onDuplicateExam, onDeleteExam, onArchiveExam }) => {
    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-emerald-100 rounded-lg"><CheckCircleIcon className="w-6 h-6 text-emerald-600" /></div>
                <div><h2 className="text-2xl font-bold text-neutral">Ujian Selesai</h2><p className="text-sm text-gray-500">Riwayat dan hasil ujian.</p></div>
            </div>
            {exams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {exams.map(exam => (
                         <div key={exam.code} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all flex flex-col h-full">
                            <div className="flex justify-between items-start mb-4">
                                <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">Selesai</span>
                                <div className="flex gap-1">
                                    <button onClick={() => onDuplicateExam(exam)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Gunakan Kembali"><DocumentDuplicateIcon className="w-4 h-4"/></button>
                                    <button onClick={() => onArchiveExam(exam)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Arsipkan & Download"><DocumentArrowUpIcon className="w-4 h-4"/></button>
                                    <button onClick={() => onDeleteExam(exam)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Hapus"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                            </div>
                            <h3 className="font-bold text-lg text-slate-800 mb-1">{exam.config.subject}</h3>
                            <p className="text-xs text-slate-400 font-mono mb-4">{new Date(exam.config.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            
                            <div className="mt-auto pt-4 border-t border-slate-50">
                                <button onClick={() => onSelectExam(exam)} className="w-full py-2.5 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
                                    <ChartBarIcon className="w-4 h-4" /> Lihat Hasil & Analisis
                                </button>
                            </div>
                         </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <p className="text-sm text-gray-500">Belum ada ujian yang selesai.</p>
                </div>
            )}
        </div>
    );
}

export const ArchiveViewer: React.FC<{ onReuseExam: (exam: Exam) => void }> = ({ onReuseExam }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const json = JSON.parse(ev.target?.result as string);
                if (json.exam) {
                    onReuseExam(json.exam);
                } else {
                    alert("Format arsip tidak valid.");
                }
            } catch (err) {
                alert("Gagal membaca file arsip.");
            } finally {
                setIsLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="max-w-2xl mx-auto animate-fade-in py-10 text-center">
            <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-xl">
                <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <DocumentArrowUpIcon className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-3">Buka Arsip Ujian</h2>
                <p className="text-slate-500 mb-8 max-w-md mx-auto">Unggah file JSON arsip ujian (.json) untuk menggunakan kembali soal atau melihat konfigurasi lama.</p>
                
                <input type="file" ref={fileInputRef} accept=".json" onChange={handleFileUpload} className="hidden" />
                
                <button 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={isLoading}
                    className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 mx-auto"
                >
                    {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <CloudArrowUpIcon className="w-5 h-5" />}
                    <span>Pilih File Arsip</span>
                </button>
            </div>
        </div>
    );
}

export const UserManagementView: React.FC = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<string | null>(null);
    const [editRole, setEditRole] = useState<AccountType>('guru');
    const [editSchool, setEditSchool] = useState('');

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await storageService.getAllUsers();
            setUsers(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleEdit = (user: UserProfile) => {
        setEditingUser(user.id);
        setEditRole(user.accountType);
        setEditSchool(user.school);
    };

    const handleSave = async (userId: string) => {
        try {
            await storageService.updateUserRole(userId, editRole, editSchool);
            setEditingUser(null);
            fetchUsers();
        } catch (e) {
            alert("Gagal update user.");
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-slate-800 text-white rounded-lg"><UserIcon className="w-6 h-6" /></div>
                <div><h2 className="text-2xl font-bold text-neutral">Manajemen Pengguna</h2><p className="text-sm text-gray-500">Kelola akses dan akun pengajar.</p></div>
            </div>
            
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="p-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Nama</th>
                                <th className="p-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Email</th>
                                <th className="p-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Sekolah</th>
                                <th className="p-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Role</th>
                                <th className="p-4 font-black text-slate-400 uppercase tracking-widest text-[10px] text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Memuat data...</td></tr>
                            ) : users.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50">
                                    <td className="p-4 font-bold text-slate-700">{user.fullName}</td>
                                    <td className="p-4 text-slate-500">{user.email}</td>
                                    <td className="p-4">
                                        {editingUser === user.id ? (
                                            <input value={editSchool} onChange={e => setEditSchool(e.target.value)} className="p-1 border rounded w-full text-xs" />
                                        ) : <span className="text-slate-600">{user.school}</span>}
                                    </td>
                                    <td className="p-4">
                                        {editingUser === user.id ? (
                                            <select value={editRole} onChange={(e) => setEditRole(e.target.value as AccountType)} className="p-1 border rounded text-xs">
                                                <option value="guru">Guru</option>
                                                <option value="admin_sekolah">Admin Sekolah</option>
                                                <option value="super_admin">Super Admin</option>
                                            </select>
                                        ) : (
                                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${user.accountType === 'super_admin' ? 'bg-slate-800 text-white' : user.accountType === 'admin_sekolah' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-50 text-emerald-600'}`}>
                                                {user.accountType.replace('_', ' ')}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        {editingUser === user.id ? (
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleSave(user.id)} className="text-emerald-600 hover:text-emerald-700 font-bold text-xs">Simpan</button>
                                                <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600 text-xs">Batal</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => handleEdit(user)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"><PencilIcon className="w-4 h-4"/></button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
