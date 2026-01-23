
import React, { useState, useEffect } from 'react';
import type { Exam, Question, Result } from '../../types';
import { extractTextFromPdf, parsePdfAndAutoCrop, convertPdfToImages, parseQuestionsFromPlainText } from './examUtils';
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
    XMarkIcon
} from '../Icons';

// --- REMAINING TIME COMPONENT ---
export const RemainingTime: React.FC<{ exam: Exam }> = ({ exam }) => {
    const calculateTimeLeft = () => {
        const examStartDateTime = new Date(`${exam.config.date.split('T')[0]}T${exam.config.startTime}`);
        const examEndTime = examStartDateTime.getTime() + exam.config.timeLimit * 60 * 1000;
        const timeLeft = Math.max(0, examEndTime - Date.now());
        return timeLeft;
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [exam]);

    if (timeLeft === 0) {
        return <span className="text-rose-600 font-bold">Waktu Habis</span>;
    }

    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    return (
        <span className="font-mono tracking-wider tabular-nums">
            {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </span>
    );
};

// --- HELPER FOR METADATA BADGES ---
const MetaBadge: React.FC<{ text: string; colorClass?: string }> = ({ text, colorClass = "bg-gray-100 text-gray-600" }) => {
    if (!text || text === 'Lainnya') return null;
    return (
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border border-opacity-50 ${colorClass}`}>
            {text}
        </span>
    );
};

// --- CREATION VIEW ---
interface CreationViewProps {
    onQuestionsGenerated: (questions: Question[], mode: 'manual' | 'auto') => void;
}

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
                try {
                    const images = await convertPdfToImages(uploadedFile, 1.5);
                    setPreviewImages(images);
                } catch (e) {
                    setPreviewImages([]);
                }
            } else {
                setPreviewImages([]);
            }
        };
        loadPreview();
    }, [uploadedFile]);

    const handleExtractText = async () => {
        if (!uploadedFile) return;
        setIsLoading(true);
        try {
            const text = await extractTextFromPdf(uploadedFile);
            setInputText(text);
            setInputMethod('paste'); 
        } catch (e) {
            setError("Gagal mengekstrak teks dari PDF.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDirectManualTransfer = () => {
        if (!inputText.trim()) {
            setError("Tidak ada teks untuk ditransfer.");
            return;
        }
        const blocks = inputText.split(/\n\s*\n/);
        const newQuestions: Question[] = blocks.filter(b => b.trim().length > 0).map((block, index) => ({
            id: `manual-q-${Date.now()}-${index}`,
            questionText: block.trim(),
            questionType: 'ESSAY', 
            options: [],
            correctAnswer: '',
            imageUrl: undefined,
            optionImages: undefined
        }));
        
        onQuestionsGenerated(newQuestions, 'manual');
    };

    const handleStartAnalysis = async () => {
        setIsLoading(true);
        setError('');
        
        try {
            if (inputMethod === 'paste') {
                if (!inputText.trim()) throw new Error("Silakan tempel konten soal terlebih dahulu.");
                const parsedQuestions = parseQuestionsFromPlainText(inputText);
                if (parsedQuestions.length === 0) throw new Error("Tidak dapat menemukan soal yang valid.");
                onQuestionsGenerated(parsedQuestions, 'auto');
            } else if (inputMethod === 'upload' && uploadedFile) {
                if (uploadedFile.type !== 'application/pdf') throw new Error("Hanya mendukung file PDF.");
                const parsedQuestions = await parsePdfAndAutoCrop(uploadedFile);
                if (parsedQuestions.length === 0) throw new Error("Tidak dapat menemukan soal yang valid.");
                onQuestionsGenerated(parsedQuestions, 'manual');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal memproses file.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-12">
            <div className="space-y-8">
                <div className="text-center space-y-4">
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">Buat Ujian Baru</h2>
                    <p className="text-slate-500 max-w-2xl mx-auto font-medium">
                        Pilih metode pembuatan soal yang paling nyaman bagi Anda.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div 
                        className={`p-6 border-2 rounded-3xl cursor-pointer transition-all duration-500 group border-slate-100 hover:border-primary/40 hover:shadow-2xl hover:shadow-slate-100 bg-white`}
                        onClick={() => onQuestionsGenerated([], 'manual')}
                    >
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className={`p-5 rounded-2xl transition-colors bg-slate-50 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary`}>
                                <PencilIcon className="w-8 h-8" />
                            </div>
                            <h3 className="font-bold text-lg text-slate-800">Manual</h3>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">Buat butir soal satu per satu dengan editor.</p>
                        </div>
                    </div>

                    <div 
                        className={`p-6 border-2 rounded-3xl cursor-pointer transition-all duration-500 group ${inputMethod === 'upload' ? 'border-primary bg-primary/5 shadow-xl shadow-primary/5' : 'border-slate-100 bg-white hover:border-primary/40 hover:shadow-2xl hover:shadow-slate-100'}`}
                        onClick={() => setInputMethod('upload')}
                    >
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className={`p-5 rounded-2xl transition-colors ${inputMethod === 'upload' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-slate-50 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary'}`}>
                                <CloudArrowUpIcon className="w-8 h-8" />
                            </div>
                            <h3 className="font-bold text-lg text-slate-800">Impor PDF</h3>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">Deteksi dan potong soal otomatis dari PDF.</p>
                        </div>
                    </div>

                    <div 
                        className={`p-6 border-2 rounded-3xl cursor-pointer transition-all duration-500 group ${inputMethod === 'paste' ? 'border-primary bg-primary/5 shadow-xl shadow-primary/5' : 'border-slate-100 bg-white hover:border-primary/40 hover:shadow-2xl hover:shadow-slate-100'}`}
                        onClick={() => setInputMethod('paste')}
                    >
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className={`p-5 rounded-2xl transition-colors ${inputMethod === 'paste' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-slate-50 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary'}`}>
                                <ListBulletIcon className="w-8 h-8" />
                            </div>
                            <h3 className="font-bold text-lg text-slate-800">Tempel Teks</h3>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">Ekstrak soal dari teks yang Anda tempel.</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/50">
                    {inputMethod === 'upload' ? (
                        <div className="space-y-6">
                            <div className="relative border-2 border-dashed border-slate-200 rounded-[2rem] p-12 text-center hover:bg-slate-50 transition-colors group">
                                <input 
                                    type="file" 
                                    accept=".pdf" 
                                    onChange={(e) => e.target.files?.[0] && setUploadedFile(e.target.files[0])}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="space-y-3 pointer-events-none">
                                    <CloudArrowUpIcon className="w-12 h-12 text-slate-300 mx-auto group-hover:text-primary transition-colors" />
                                    {uploadedFile ? (
                                        <p className="font-bold text-primary text-lg">{uploadedFile.name}</p>
                                    ) : (
                                        <>
                                            <p className="text-slate-700 font-bold text-lg">Seret file PDF ke sini</p>
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Atau klik untuk memilih file</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {previewImages.length > 0 && (
                                <div className="space-y-3">
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Preview PDF:</p>
                                    <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-[240px] overflow-y-auto bg-slate-50 p-4">
                                        <img src={previewImages[0]} alt="Preview" className="max-w-full h-auto mx-auto shadow-sm rounded-lg" />
                                    </div>
                                    <button onClick={handleExtractText} className="text-xs font-bold text-primary hover:text-primary-focus transition-colors flex items-center gap-2">
                                        <FileTextIcon className="w-4 h-4" /> Ekstrak Teks saja?
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                className="w-full h-72 p-6 bg-slate-50 border border-slate-200 rounded-[2rem] focus:ring-4 focus:ring-primary/5 focus:border-primary font-mono text-sm resize-none outline-none transition-all"
                                placeholder={`Tulis atau tempel soal di sini...\n\nContoh:\n1. Siapa penemu lampu?\nA. Tesla\nB. Edison\nC. Newton\nD. Galileo\nKunci: B`}
                            />
                            {inputText && (
                                <button onClick={handleDirectManualTransfer} className="text-xs font-bold text-slate-400 hover:text-primary flex items-center gap-2 transition-colors ml-2">
                                    <PencilIcon className="w-4 h-4" /> Transfer sebagai soal manual
                                </button>
                            )}
                        </div>
                    )}
                    
                    {error && <div className="mt-6 p-4 bg-rose-50 text-rose-700 text-xs font-bold rounded-2xl border border-rose-100 animate-fade-in">{error}</div>}

                    <div className="mt-10 flex justify-center">
                        <button 
                            onClick={handleStartAnalysis} 
                            disabled={isLoading || (!inputText && !uploadedFile)}
                            className={`px-12 py-4 rounded-2xl font-black text-white shadow-xl flex items-center justify-center gap-3 transition-all transform active:scale-95 ${isLoading || (!inputText && !uploadedFile) ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-900 hover:bg-black hover:shadow-slate-200'}`}
                        >
                            {isLoading ? <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white"></div> Memproses...</> : <><CogIcon className="w-5 h-5" /> Analisis Sekarang</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- DRAFTS VIEW ---
interface DraftsViewProps {
    exams: Exam[];
    onContinueDraft: (exam: Exam) => void;
    onDeleteDraft: (exam: Exam) => void;
}

export const DraftsView: React.FC<DraftsViewProps> = ({ exams, onContinueDraft, onDeleteDraft }) => {
    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-100 rounded-2xl"><PencilIcon className="w-6 h-6 text-slate-600" /></div>
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Draf Soal</h2>
                    <p className="text-sm text-slate-500 font-medium">Lanjutkan penyusunan soal Anda.</p>
                </div>
            </div>

            {exams.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {exams.map(exam => (
                        <div key={exam.code} className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100/50 hover:shadow-2xl transition-all duration-500 flex flex-col group relative">
                            <button onClick={() => onDeleteDraft(exam)} className="absolute top-5 right-5 p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><TrashIcon className="w-4 h-4"/></button>
                            <div className="mb-6">
                                <span className="text-[10px] font-black bg-slate-100 text-slate-400 px-2.5 py-1 rounded-lg uppercase tracking-widest border border-slate-200">Draft</span>
                                <h3 className="font-black text-xl text-slate-800 mt-4 mb-1 line-clamp-1">{exam.config.subject || "Tanpa Judul"}</h3>
                                <p className="text-xs font-mono font-bold text-slate-400 tracking-wider">{exam.code}</p>
                            </div>
                            <div className="flex-1 space-y-3 mb-8">
                                <div className="flex flex-wrap gap-2">
                                    <MetaBadge text={exam.config.classLevel} colorClass="bg-blue-50 text-blue-700" />
                                    <MetaBadge text={exam.config.examType} colorClass="bg-purple-50 text-purple-700" />
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
                                    <ListBulletIcon className="w-4 h-4" /> {exam.questions.length} Butir Soal
                                </div>
                            </div>
                            <button onClick={() => onContinueDraft(exam)} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-black transition-all shadow-lg shadow-slate-200 text-sm">Lanjutkan Edit</button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-24 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                    <PencilIcon className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-400">Belum ada draf soal</h3>
                </div>
            )}
        </div>
    );
};

// --- ONGOING EXAMS VIEW ---
interface OngoingExamsProps {
    exams: Exam[];
    results: Result[];
    onSelectExam: (exam: Exam) => void;
    onDuplicateExam: (exam: Exam) => void;
}

export const OngoingExamsView: React.FC<OngoingExamsProps> = ({ exams, results, onSelectExam, onDuplicateExam }) => {
    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-50 rounded-2xl"><ClockIcon className="w-6 h-6 text-emerald-600" /></div>
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Sedang Berlangsung</h2>
                    <p className="text-sm text-slate-500 font-medium">Pantau aktivitas ujian secara real-time.</p>
                </div>
            </div>

            {exams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {exams.map(exam => {
                        const count = results.filter(r => r.examCode === exam.code).length;
                        return (
                            <div key={exam.code} className="bg-white p-8 rounded-[2.5rem] border border-emerald-100 shadow-xl shadow-emerald-100/20 hover:shadow-2xl transition-all duration-500 cursor-pointer group" onClick={() => onSelectExam(exam)}>
                                <div className="flex justify-between items-start mb-6">
                                     <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-2">
                                        <span className="relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative rounded-full h-2 w-2 bg-emerald-500"></span></span> LIVE
                                     </span>
                                     <button onClick={(e) => { e.stopPropagation(); onDuplicateExam(exam); }} className="p-2 text-slate-300 hover:text-primary transition-colors"><DocumentDuplicateIcon className="w-5 h-5"/></button>
                                </div>
                                <h3 className="font-black text-2xl text-slate-800 mb-2">{exam.config.subject || exam.code}</h3>
                                <p className="text-sm font-mono font-bold text-slate-400 mb-6">{exam.code}</p>
                                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Peserta</p>
                                        <p className="text-xl font-black text-slate-800">{count} Siswa</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sisa Waktu</p>
                                        <p className="text-xl font-black text-rose-500"><RemainingTime exam={exam} /></p>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="text-center py-24 bg-white rounded-[2.5rem] border border-slate-100">
                    <ClockIcon className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-400">Tidak ada ujian aktif</h3>
                </div>
            )}
        </div>
    );
};

// --- UPCOMING EXAMS VIEW ---
interface UpcomingExamsProps {
    exams: Exam[];
    onEditExam: (exam: Exam) => void;
}

export const UpcomingExamsView: React.FC<UpcomingExamsProps> = ({ exams, onEditExam }) => {
    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-2xl"><CalendarDaysIcon className="w-6 h-6 text-blue-600" /></div>
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Akan Datang</h2>
                    <p className="text-sm text-slate-500 font-medium">Jadwal ujian yang sudah dipublikasikan.</p>
                </div>
            </div>

            {exams.length > 0 ? (
                <div className="grid gap-4">
                    {exams.map(exam => (
                        <div key={exam.code} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between group hover:shadow-xl transition-all">
                            <div className="flex items-center gap-6">
                                <div className="bg-blue-50 w-16 h-16 rounded-2xl flex flex-col items-center justify-center text-blue-700 border border-blue-100 shrink-0">
                                    <span className="text-[10px] font-black uppercase">{new Date(exam.config.date).toLocaleDateString('id-ID', { month: 'short' })}</span>
                                    <span className="text-2xl font-black">{new Date(exam.config.date).getDate()}</span>
                                </div>
                                <div>
                                    <h3 className="font-black text-lg text-slate-800">{exam.config.subject || "Ujian"}</h3>
                                    <div className="flex gap-3 items-center mt-1">
                                        <span className="text-xs font-mono font-bold text-slate-400">{exam.code}</span>
                                        <span className="text-slate-200">•</span>
                                        <span className="text-xs font-bold text-slate-500">{exam.config.startTime} WIB</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => onEditExam(exam)} className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all text-sm">Edit</button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-24 bg-white rounded-[2.5rem] border border-slate-100">
                    <CalendarDaysIcon className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-400">Belum ada jadwal</h3>
                </div>
            )}
        </div>
    );
};

// --- FINISHED EXAMS VIEW ---
interface FinishedExamsProps {
    exams: Exam[];
    onSelectExam: (exam: Exam) => void;
    onDuplicateExam: (exam: Exam) => void;
    onDeleteExam: (code: string) => Promise<void>;
}

export const FinishedExamsView: React.FC<FinishedExamsProps> = ({ exams, onSelectExam, onDuplicateExam, onDeleteExam }) => {
    return (
        <div className="space-y-8 animate-fade-in">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-50 rounded-2xl"><ChartBarIcon className="w-6 h-6 text-purple-600" /></div>
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Riwayat Ujian</h2>
                    <p className="text-sm text-slate-500 font-medium">Data dan hasil ujian yang telah selesai.</p>
                </div>
            </div>

            {exams.length > 0 ? (
                <div className="grid gap-4">
                    {exams.map(exam => (
                        <div key={exam.code} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between group hover:shadow-xl transition-all">
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100"><CheckCircleIcon className="w-6 h-6 text-slate-300" /></div>
                                <div>
                                    <h3 className="font-black text-lg text-slate-800">{exam.config.subject || exam.code}</h3>
                                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{new Date(exam.config.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => onDuplicateExam(exam)} 
                                    className="p-3 text-slate-400 hover:text-primary transition-colors"
                                    title="Reuse"
                                ><DocumentDuplicateIcon className="w-5 h-5"/></button>
                                <button 
                                    onClick={() => {
                                        if(confirm(`Hapus seluruh data ujian "${exam.code}"? Tindakan ini permanen.`)) {
                                            onDeleteExam(exam.code);
                                        }
                                    }}
                                    className="p-3 text-slate-400 hover:text-rose-600 transition-colors"
                                    title="Hapus"
                                ><TrashIcon className="w-5 h-5"/></button>
                                <button onClick={() => onSelectExam(exam)} className="px-8 py-3 bg-slate-900 text-white font-black rounded-xl hover:bg-black transition-all shadow-lg shadow-slate-200 text-sm">Lihat Hasil</button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-24 bg-white rounded-[2.5rem] border border-slate-100">
                    <ChartBarIcon className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-400">Belum ada riwayat</h3>
                </div>
            )}
        </div>
    );
};
