
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
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md flex-1 print:border-slate-300 print:shadow-none print:rounded-lg group">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-${color.split('-')[1]}-600 group-hover:scale-110 transition-transform duration-300`}>
            {Icon ? <Icon className="w-6 h-6" /> : <ChartBarIcon className="w-6 h-6" />}
        </div>
        <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
            <p className="text-2xl font-black text-slate-800 leading-none">{value}</p>
        </div>
    </div>
);

export const QuestionAnalysisItem: React.FC<{ q: Question; index: number; stats: any; examResults: Result[] }> = ({ q, index, stats, examResults }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const difficultyColor = stats.correctRate >= 80 
        ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
        : stats.correctRate >= 50 
            ? 'bg-amber-100 text-amber-700 border-amber-200' 
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

    const normalize = (str: string) => str.trim().toLowerCase();

    const isCorrectAnswer = (ans: string) => {
        const correctAnswerString = q.correctAnswer;
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
        <div className={`border rounded-2xl bg-white transition-all duration-300 overflow-hidden ${isExpanded ? 'shadow-lg ring-1 ring-indigo-50 border-indigo-100' : 'border-slate-100 hover:border-indigo-100 hover:shadow-sm'}`}>
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
                        className={`h-full transition-all duration-1000 ${stats.correctRate >= 80 ? 'bg-emerald-500' : stats.correctRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} 
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
                            <div className="max-h-40 overflow-y-auto custom-scrollbar bg-slate-50 p-3 rounded-xl border border-slate-100">
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
                                <ul className="space-y-1">
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
                                            <li key={idx} className={`text-xs flex justify-between border-b border-slate-50 p-2 rounded last:border-0 items-center ${isCorrect ? 'bg-emerald-50 border border-emerald-100 text-emerald-800' : 'hover:bg-slate-50 text-slate-600'}`}>
                                                <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                                                    {isCorrect && <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0"/>}
                                                    <div className={`truncate italic ${isCorrect ? 'font-medium' : ''} [&_p]:inline [&_br]:hidden`} dangerouslySetInnerHTML={{__html: displayAns}}></div>
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
    
    if (timeState.status === 'FINISHED') return (<span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200`}>Selesai</span>);
    if (timeState.status === 'UPCOMING') return (<span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100`}>Belum Dimulai</span>);
    
    const hours = Math.floor(timeState.diff / (1000 * 60 * 60)); 
    const minutes = Math.floor((timeState.diff % (1000 * 60 * 60)) / (1000 * 60)); 
    const seconds = Math.floor((timeState.diff % (1000 * 60)) / 1000); 
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const totalMinutesLeft = timeState.diff / (1000 * 60); 
    let colorClass = "bg-emerald-50 text-emerald-700 border-emerald-100"; 
    let dotClass = "bg-emerald-500"; 
    
    if (totalMinutesLeft < 5) { colorClass = "bg-rose-50 text-rose-600 border-rose-100 animate-pulse"; dotClass = "bg-rose-500"; } 
    else if (totalMinutesLeft < 15) { colorClass = "bg-amber-50 text-amber-600 border-amber-100"; dotClass = "bg-amber-500"; }
    
    if (minimal) { return <span className="font-mono font-bold tracking-tight">{timeString}</span>; }
    
    return (<div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colorClass} transition-colors duration-500`}><span className="relative flex h-2 w-2"><span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotClass}`}></span><span className={`relative inline-flex rounded-full h-2 w-2 ${dotClass}`}></span></span><span className="font-mono text-sm font-bold tracking-widest tabular-nums">{timeString}</span></div>);
};

export const MetaBadge: React.FC<{ text: string; colorClass?: string }> = ({ text, colorClass = "bg-slate-100 text-slate-600" }) => { if (!text || text === 'Lainnya') return null; return (<span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border border-opacity-50 uppercase tracking-wider ${colorClass}`}>{text}</span>); };

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
        <div className="max-w-4xl mx-auto animate-fade-in space-y-10">
            <div className="space-y-6">
                <div className="text-center space-y-3">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Buat Ujian Baru</h2>
                    <p className="text-slate-500 max-w-xl mx-auto text-sm font-medium">Pilih metode pembuatan soal yang paling sesuai dengan dokumen Anda.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <button 
                        onClick={handleManualCreateClick} 
                        className="group flex flex-col items-center text-center p-6 bg-white border-2 border-slate-100 rounded-[2rem] hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-50 transition-all duration-300 active:scale-95"
                    >
                        <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                            <PencilIcon className="w-8 h-8" />
                        </div>
                        <h3 className="font-bold text-lg text-slate-800">Buat Manual</h3>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">Ketik soal satu per satu dari awal.</p>
                    </button>

                    <button 
                        onClick={() => setInputMethod('upload')} 
                        className={`group flex flex-col items-center text-center p-6 border-2 rounded-[2rem] transition-all duration-300 active:scale-95 ${inputMethod === 'upload' ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-200' : 'bg-white border-slate-100 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-50'}`}
                    >
                        <div className={`p-4 rounded-2xl mb-4 transition-transform group-hover:scale-110 ${inputMethod === 'upload' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                            <CloudArrowUpIcon className="w-8 h-8" />
                        </div>
                        <h3 className={`font-bold text-lg ${inputMethod === 'upload' ? 'text-white' : 'text-slate-800'}`}>Unggah PDF</h3>
                        <p className={`text-xs mt-2 leading-relaxed ${inputMethod === 'upload' ? 'text-indigo-100' : 'text-slate-400'}`}>AI memotong soal otomatis dari file PDF.</p>
                    </button>

                    <button 
                        onClick={() => setInputMethod('paste')} 
                        className={`group flex flex-col items-center text-center p-6 border-2 rounded-[2rem] transition-all duration-300 active:scale-95 ${inputMethod === 'paste' ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-200' : 'bg-white border-slate-100 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-50'}`}
                    >
                        <div className={`p-4 rounded-2xl mb-4 transition-transform group-hover:scale-110 ${inputMethod === 'paste' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                            <ListBulletIcon className="w-8 h-8" />
                        </div>
                        <h3 className={`font-bold text-lg ${inputMethod === 'paste' ? 'text-white' : 'text-slate-800'}`}>Salin Teks</h3>
                        <p className={`text-xs mt-2 leading-relaxed ${inputMethod === 'paste' ? 'text-indigo-100' : 'text-slate-400'}`}>Tempel teks soal dari Word atau sumber lain.</p>
                    </button>
                </div>

                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-all duration-300">
                    <div className="mb-6 flex justify-between items-end">
                        <div>
                            <h3 className="text-lg font-black text-slate-800 mb-1">{inputMethod === 'upload' ? 'Unggah File PDF' : 'Tempel Teks Soal'}</h3>
                            <p className="text-sm text-slate-500">{inputMethod === 'upload' ? 'Pilih file PDF dari perangkat Anda.' : 'Pastikan format soal jelas (nomor dan opsi).'}</p>
                        </div>
                        {inputMethod === 'upload' && uploadedFile && <button onClick={() => setUploadedFile(null)} className="text-xs font-bold text-rose-500 hover:text-rose-600">Hapus File</button>}
                    </div>

                    {inputMethod === 'upload' ? (
                        <div className="space-y-6">
                            {!uploadedFile ? (
                                <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center hover:bg-slate-50/50 hover:border-indigo-300 transition-all cursor-pointer relative group" onClick={() => document.getElementById('file-upload')?.click()}>
                                    <input 
                                        id="file-upload"
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
                                        className="hidden" 
                                    />
                                    <div className="space-y-3 pointer-events-none">
                                        <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                                            <CloudArrowUpIcon className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-700">Klik untuk memilih file PDF</p>
                                            <p className="text-xs text-slate-400 mt-1">atau seret file ke area ini (Maks. 10MB)</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="border border-slate-200 rounded-3xl p-6 flex items-center gap-4 bg-slate-50/50">
                                    <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                                        <FileTextIcon className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-800 truncate">{uploadedFile.name}</p>
                                        <p className="text-xs text-slate-500">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                    <div className="text-emerald-500 bg-emerald-50 p-2 rounded-full">
                                        <CheckCircleIcon className="w-5 h-5" />
                                    </div>
                                </div>
                            )}

                            {previewImages.length > 0 && (
                                <div className="space-y-3 pt-4 border-t border-slate-100">
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Pratinjau</p>
                                        <button onClick={handleExtractText} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors" disabled={isLoading}>
                                            <FileTextIcon className="w-3 h-3" /> Ekstrak Teks Manual
                                        </button>
                                    </div>
                                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-100 p-4 text-center max-h-[400px] overflow-y-auto">
                                        <img src={previewImages[0]} alt="Preview PDF" className="max-w-full h-auto mx-auto shadow-lg rounded-xl" />
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <textarea 
                                value={inputText} 
                                onChange={(e) => setInputText(e.target.value)} 
                                className="w-full h-80 p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 font-mono text-sm resize-y outline-none transition-all" 
                                placeholder={`Contoh Format:\n\n1. Apa ibukota Indonesia?\nA. Bandung\nB. Jakarta\nC. Surabaya\nD. Medan\n\nKunci Jawaban: B`} 
                            />
                            {inputText && (
                                <div className="flex justify-end">
                                    <button onClick={handleDirectManualTransfer} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl flex items-center gap-2 transition-colors">
                                        <PencilIcon className="w-4 h-4" /> Mode Manual (Tanpa Parsing)
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="mt-6 p-4 bg-rose-50 text-rose-700 text-sm rounded-xl flex items-start gap-3 border border-rose-100 animate-shake">
                            <ExclamationTriangleIcon className="w-5 h-5 shrink-0 mt-0.5" />
                            <div><span className="font-bold">Gagal:</span> {error}</div>
                        </div>
                    )}

                    <div className="mt-8 flex justify-end">
                        <button 
                            onClick={handleStartAnalysis} 
                            disabled={isLoading || (!inputText && !uploadedFile)} 
                            className={`px-10 py-4 rounded-2xl font-bold text-white shadow-lg flex items-center justify-center gap-3 transition-all ${isLoading || (!inputText && !uploadedFile) ? 'bg-slate-300 cursor-not-allowed shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200 active:scale-95'}`}
                        >
                            {isLoading ? (
                                <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div> Memproses...</>
                            ) : (
                                <><CogIcon className="w-5 h-5" />{inputMethod === 'upload' ? 'Analisis & Crop PDF' : 'Analisis Teks'}</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const DraftsView: React.FC<{ exams: Exam[]; onContinueDraft: (exam: Exam) => void; onDeleteDraft: (exam: Exam) => void; }> = ({ exams, onContinueDraft, onDeleteDraft }) => {
    const [previewExam, setPreviewExam] = useState<Exam | null>(null);
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-slate-100 rounded-2xl"><PencilIcon className="w-6 h-6 text-slate-600" /></div>
                <div><h2 className="text-2xl font-black text-slate-900 tracking-tight">Draf Soal</h2><p className="text-sm text-slate-500 font-medium">Lanjutkan pekerjaan yang belum selesai.</p></div>
            </div>
            
            {exams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {exams.map(exam => (
                        <div key={exam.code} className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:border-indigo-100 transition-all duration-300 relative group flex flex-col h-full">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-lg uppercase tracking-wider">Draft</span>
                                <button type="button" onClick={(e) => { e.stopPropagation(); onDeleteDraft(exam); }} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all" title="Hapus"><TrashIcon className="w-4 h-4" /></button>
                            </div>
                            
                            <h3 className="font-bold text-lg text-slate-800 mb-1 line-clamp-2">{exam.config.subject || "Tanpa Judul"}</h3>
                            <p className="text-xs font-mono text-slate-400 mb-4">{exam.code}</p>
                            
                            <div className="flex flex-wrap gap-2 mb-6">
                                <MetaBadge text={exam.config.classLevel} colorClass="bg-blue-50 text-blue-700 border-blue-100" />
                                <MetaBadge text={exam.config.examType} colorClass="bg-purple-50 text-purple-700 border-purple-100" />
                            </div>
                            
                            <div className="mt-auto flex flex-col gap-3">
                                <div className="flex items-center justify-between text-xs text-slate-400 font-medium pb-4 border-b border-slate-50">
                                    <span className="flex items-center gap-1.5"><CalendarDaysIcon className="w-3.5 h-3.5"/> {new Date(exam.config.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}</span>
                                    <span className="flex items-center gap-1.5"><ListBulletIcon className="w-3.5 h-3.5"/> {exam.questions.length} Soal</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setPreviewExam(exam)} className="flex-1 py-2.5 px-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-colors flex items-center justify-center gap-2 text-sm">
                                        <EyeIcon className="w-4 h-4" /> Preview
                                    </button>
                                    <button onClick={() => onContinueDraft(exam)} className="flex-[1.5] py-2.5 px-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition-colors flex items-center justify-center gap-2 text-sm shadow-lg shadow-slate-200">
                                        <PencilIcon className="w-4 h-4" /> Edit
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-200">
                    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><PencilIcon className="h-10 w-10 text-slate-300" /></div>
                    <h3 className="text-lg font-bold text-slate-900">Belum Ada Draf</h3>
                    <p className="mt-2 text-sm text-slate-500">Mulai buat ujian baru untuk menyimpannya di sini.</p>
                </div>
            )}

            {previewExam && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[60] animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-in-up flex flex-col max-h-[80vh]">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <h3 className="font-bold text-lg text-slate-800">Preview Soal</h3>
                            <button onClick={() => setPreviewExam(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><XMarkIcon className="w-5 h-5 text-slate-500" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto bg-slate-50/50 space-y-4">
                            {previewExam.questions.length > 0 ? previewExam.questions.map((q, i) => (
                                <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Soal {i+1}</span>
                                        <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">{q.questionType.replace(/_/g, ' ')}</span>
                                    </div>
                                    <div className="text-sm text-slate-800 leading-relaxed font-medium" dangerouslySetInnerHTML={{__html: q.questionText}}></div>
                                </div>
                            )) : (
                                <p className="text-center text-slate-400 py-10 text-sm">Belum ada soal.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const OngoingExamsView: React.FC<{ exams: Exam[]; results: Result[]; onSelectExam: (e: Exam) => void; onDuplicateExam: (e: Exam) => void }> = ({ exams, results, onSelectExam, onDuplicateExam }) => {
    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-indigo-100 rounded-2xl"><ClockIcon className="w-6 h-6 text-indigo-600" /></div>
                <div><h2 className="text-2xl font-black text-slate-900 tracking-tight">Ujian Berlangsung</h2><p className="text-sm text-slate-500 font-medium">Pantau aktivitas dan progres siswa secara realtime.</p></div>
            </div>
            
            {exams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {exams.map(exam => {
                        const participantCount = new Set(results.filter(r => r.examCode === exam.code).map(r => r.student.studentId)).size;
                        const liveUrl = `${window.location.origin}/?live=${exam.code}`;
                        
                        return (
                            <div key={exam.code} className="bg-white p-6 rounded-[1.5rem] border border-indigo-100 shadow-sm hover:shadow-xl hover:shadow-indigo-100/50 hover:border-indigo-200 transition-all duration-300 relative group overflow-hidden cursor-pointer" onClick={() => onSelectExam(exam)}>
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                                
                                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10 translate-x-2 group-hover:translate-x-0">
                                    {exam.config.enablePublicStream && (
                                        <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(liveUrl); alert("Link Pantauan disalin!"); }} className="p-2 bg-white text-indigo-500 hover:bg-indigo-50 rounded-lg shadow-sm border border-indigo-50" title="Salin Link Pantauan"><ShareIcon className="w-4 h-4"/></button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); onDuplicateExam(exam); }} className="p-2 bg-white text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg shadow-sm border border-slate-100" title="Duplikat"><DocumentDuplicateIcon className="w-4 h-4"/></button>
                                </div>

                                <div className="flex items-center gap-3 mb-4">
                                    <span className="relative flex h-3 w-3">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                    </span>
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Live Active</span>
                                </div>

                                <h3 className="font-bold text-xl text-slate-900 mb-1 tracking-tight">{exam.config.subject}</h3>
                                
                                <div className="flex flex-wrap gap-2 mb-6">
                                    <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">{exam.code}</span>
                                    <MetaBadge text={exam.config.classLevel} />
                                </div>

                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between mb-6">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Partisipan</p>
                                        <div className="flex items-center gap-2">
                                            <UserIcon className="w-4 h-4 text-indigo-500" />
                                            <span className="text-lg font-black text-slate-800">{participantCount}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sisa Waktu</p>
                                        <RemainingTime exam={exam} minimal />
                                    </div>
                                </div>

                                <button className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 active:scale-95 group-hover:scale-[1.02]">
                                    <PlayIcon className="w-4 h-4" /> Buka Live Monitor
                                </button>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-200">
                    <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><ClockIcon className="h-10 w-10 text-indigo-300" /></div>
                    <h3 className="text-lg font-bold text-slate-900">Tidak Ada Ujian Berlangsung</h3>
                    <p className="mt-2 text-sm text-slate-500">Jadwal ujian aktif akan muncul di sini.</p>
                </div>
            )}
        </div>
    );
}

export const UpcomingExamsView: React.FC<{ exams: Exam[]; onEditExam: (e: Exam) => void }> = ({ exams, onEditExam }) => {
     return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-blue-100 rounded-2xl"><CalendarDaysIcon className="w-6 h-6 text-blue-600" /></div>
                <div><h2 className="text-2xl font-black text-slate-900 tracking-tight">Ujian Terjadwal</h2><p className="text-sm text-slate-500 font-medium">Agenda ujian yang akan datang.</p></div>
            </div>
             {exams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {exams.map(exam => (
                         <div key={exam.code} className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-50 hover:border-blue-100 transition-all group flex flex-col h-full">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2 text-blue-600 font-bold text-sm mb-1">
                                        <CalendarDaysIcon className="w-4 h-4" />
                                        <span>{new Date(exam.config.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}</span>
                                    </div>
                                    <span className="text-xs font-medium text-slate-400">{exam.config.startTime} WIB</span>
                                </div>
                                <button onClick={() => onEditExam(exam)} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors bg-slate-50 border border-slate-100"><PencilIcon className="w-4 h-4"/></button>
                            </div>
                            
                            <h3 className="font-bold text-lg text-slate-800 mb-2">{exam.config.subject}</h3>
                            <p className="text-sm text-slate-500 mb-6 line-clamp-2 leading-relaxed">{exam.config.description || "Tidak ada deskripsi tambahan."}</p>
                            
                            <div className="mt-auto pt-4 border-t border-slate-50 flex flex-wrap gap-2">
                                <MetaBadge text={exam.config.classLevel} colorClass="bg-slate-50 text-slate-600 border-slate-100" />
                                <MetaBadge text={exam.config.examType} colorClass="bg-slate-50 text-slate-600 border-slate-100" />
                            </div>
                         </div>
                    ))}
                </div>
             ) : (
                <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-200">
                    <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><CalendarDaysIcon className="h-10 w-10 text-blue-300" /></div>
                    <h3 className="text-lg font-bold text-slate-900">Belum Ada Jadwal</h3>
                    <p className="mt-2 text-sm text-slate-500">Buat ujian baru dengan tanggal mendatang.</p>
                </div>
            )}
        </div>
     );
}

export const FinishedExamsView: React.FC<{ exams: Exam[]; onSelectExam: (e: Exam) => void; onDuplicateExam: (e: Exam) => void; onDeleteExam: (e: Exam) => void; onArchiveExam: (e: Exam) => void; }> = ({ exams, onSelectExam, onDuplicateExam, onDeleteExam, onArchiveExam }) => {
    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-emerald-100 rounded-2xl"><CheckCircleIcon className="w-6 h-6 text-emerald-600" /></div>
                <div><h2 className="text-2xl font-black text-slate-900 tracking-tight">Ujian Selesai</h2><p className="text-sm text-slate-500 font-medium">Riwayat, hasil, dan analisis.</p></div>
            </div>
            {exams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {exams.map(exam => (
                         <div key={exam.code} className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-emerald-50 hover:border-emerald-100 transition-all flex flex-col h-full group relative">
                            <div className="flex justify-between items-start mb-4">
                                <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">Selesai</span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => onDuplicateExam(exam)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Reuse"><DocumentDuplicateIcon className="w-4 h-4"/></button>
                                    <button onClick={() => onArchiveExam(exam)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Arsip"><DocumentArrowUpIcon className="w-4 h-4"/></button>
                                    <button onClick={() => onDeleteExam(exam)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Hapus"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                            </div>
                            
                            <h3 className="font-bold text-lg text-slate-800 mb-1">{exam.config.subject}</h3>
                            <p className="text-xs text-slate-400 font-mono mb-4">{new Date(exam.config.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            
                            <div className="mt-auto pt-4 border-t border-slate-50">
                                <button onClick={() => onSelectExam(exam)} className="w-full py-3 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 group/btn">
                                    <ChartBarIcon className="w-4 h-4 text-slate-400 group-hover/btn:text-indigo-500" /> Lihat Hasil
                                </button>
                            </div>
                         </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-200">
                    <div className="bg-emerald-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircleIcon className="h-10 w-10 text-emerald-300" /></div>
                    <h3 className="text-lg font-bold text-slate-900">Belum Ada Riwayat</h3>
                    <p className="mt-2 text-sm text-slate-500">Ujian yang telah berakhir akan muncul di sini.</p>
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
        <div className="max-w-3xl mx-auto animate-fade-in py-10 text-center">
            <div className="bg-white p-12 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
                <div className="w-24 h-24 bg-indigo-50 text-indigo-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <DocumentArrowUpIcon className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Buka Arsip Ujian</h2>
                <p className="text-slate-500 mb-10 max-w-md mx-auto leading-relaxed">Unggah file JSON arsip ujian yang pernah Anda unduh sebelumnya untuk menggunakan kembali soal atau melihat konfigurasi lama.</p>
                
                <input type="file" ref={fileInputRef} accept=".json" onChange={handleFileUpload} className="hidden" />
                
                <button 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={isLoading}
                    className="px-10 py-5 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 mx-auto"
                >
                    {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <CloudArrowUpIcon className="w-6 h-6" />}
                    <span>Pilih File Arsip (.json)</span>
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
             <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-slate-800 text-white rounded-2xl"><UserIcon className="w-6 h-6" /></div>
                <div><h2 className="text-2xl font-black text-slate-900 tracking-tight">Manajemen Pengguna</h2><p className="text-sm text-slate-500 font-medium">Kelola akses dan akun pengajar di platform.</p></div>
            </div>
            
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th className="p-6 font-black text-slate-400 uppercase tracking-widest text-[10px]">Nama Pengguna</th>
                                <th className="p-6 font-black text-slate-400 uppercase tracking-widest text-[10px]">Email</th>
                                <th className="p-6 font-black text-slate-400 uppercase tracking-widest text-[10px]">Sekolah</th>
                                <th className="p-6 font-black text-slate-400 uppercase tracking-widest text-[10px]">Peran</th>
                                <th className="p-6 font-black text-slate-400 uppercase tracking-widest text-[10px] text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={5} className="p-12 text-center text-slate-400 font-medium">Memuat data...</td></tr>
                            ) : users.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-6 font-bold text-slate-700">{user.fullName}</td>
                                    <td className="p-6 text-slate-500 font-medium">{user.email}</td>
                                    <td className="p-6">
                                        {editingUser === user.id ? (
                                            <input value={editSchool} onChange={e => setEditSchool(e.target.value)} className="p-2 bg-white border border-indigo-200 rounded-lg w-full text-xs focus:ring-2 focus:ring-indigo-100 outline-none" />
                                        ) : <span className="text-slate-600 bg-slate-100 px-2 py-1 rounded text-xs font-bold">{user.school}</span>}
                                    </td>
                                    <td className="p-6">
                                        {editingUser === user.id ? (
                                            <select value={editRole} onChange={(e) => setEditRole(e.target.value as AccountType)} className="p-2 bg-white border border-indigo-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-100 outline-none cursor-pointer">
                                                <option value="guru">Guru</option>
                                                <option value="admin_sekolah">Admin Sekolah</option>
                                                <option value="super_admin">Super Admin</option>
                                            </select>
                                        ) : (
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${user.accountType === 'super_admin' ? 'bg-slate-800 text-white' : user.accountType === 'admin_sekolah' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                                {user.accountType.replace('_', ' ')}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-6 text-right">
                                        {editingUser === user.id ? (
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleSave(user.id)} className="text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm transition-all">Simpan</button>
                                                <button onClick={() => setEditingUser(null)} className="text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-lg font-bold text-xs transition-all">Batal</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => handleEdit(user)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors"><PencilIcon className="w-4 h-4"/></button>
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
