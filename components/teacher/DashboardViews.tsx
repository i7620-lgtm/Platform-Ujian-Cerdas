
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

// --- REMAINING TIME COMPONENT (MODERN & ELEGANT) ---
export const RemainingTime: React.FC<{ exam: Exam; minimal?: boolean }> = ({ exam, minimal = false }) => {
    const calculateTimeLeft = () => {
        // Gabungkan tanggal dan jam mulai dari config
        // Asumsi format date: YYYY-MM-DD, startTime: HH:mm
        const dateStr = exam.config.date.includes('T') ? exam.config.date.split('T')[0] : exam.config.date;
        const examStartDateTime = new Date(`${dateStr}T${exam.config.startTime}`);
        const examEndTime = examStartDateTime.getTime() + exam.config.timeLimit * 60 * 1000;
        const now = Date.now();
        
        // Jika belum mulai
        if (now < examStartDateTime.getTime()) {
             return { status: 'UPCOMING', diff: examStartDateTime.getTime() - now };
        }
        
        // Jika sedang berjalan
        const timeLeft = Math.max(0, examEndTime - now);
        return { status: timeLeft === 0 ? 'FINISHED' : 'ONGOING', diff: timeLeft };
    };

    const [timeState, setTimeState] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeState(calculateTimeLeft());
        }, 1000);
        return () => clearInterval(timer);
    }, [exam]);

    if (timeState.status === 'FINISHED') {
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200`}>
                Selesai
            </span>
        );
    }

    if (timeState.status === 'UPCOMING') {
         return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100`}>
                Belum Dimulai
            </span>
        );
    }

    // Format HH:MM:SS
    const hours = Math.floor(timeState.diff / (1000 * 60 * 60));
    const minutes = Math.floor((timeState.diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeState.diff % (1000 * 60)) / 1000);
    
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Color Logic
    const totalMinutesLeft = timeState.diff / (1000 * 60);
    let colorClass = "bg-emerald-50 text-emerald-700 border-emerald-100"; // Aman (> 10 menit)
    let dotClass = "bg-emerald-500";
    
    if (totalMinutesLeft < 5) {
        colorClass = "bg-rose-50 text-rose-600 border-rose-100 animate-pulse"; // Kritis (< 5 menit)
        dotClass = "bg-rose-500";
    } else if (totalMinutesLeft < 15) {
        colorClass = "bg-amber-50 text-amber-600 border-amber-100"; // Warning (< 15 menit)
        dotClass = "bg-amber-500";
    }

    if (minimal) {
        return <span className="font-mono font-bold tracking-tight">{timeString}</span>;
    }

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colorClass} transition-colors duration-500`}>
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotClass}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${dotClass}`}></span>
            </span>
            <span className="font-mono text-sm font-bold tracking-widest tabular-nums">
                {timeString}
            </span>
        </div>
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
                    console.error("Gagal memuat pratinjau PDF:", e);
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
                if (parsedQuestions.length === 0) throw new Error("Tidak dapat menemukan soal yang valid. Pastikan format soal menggunakan penomoran (1. Soal) dan opsi (A. Opsi).");
                onQuestionsGenerated(parsedQuestions, 'auto');
            } else if (inputMethod === 'upload' && uploadedFile) {
                if (uploadedFile.type !== 'application/pdf') throw new Error("Fitur ini hanya mendukung file PDF.");
                const parsedQuestions = await parsePdfAndAutoCrop(uploadedFile);
                if (parsedQuestions.length === 0) throw new Error("Tidak dapat menemukan soal yang valid dari PDF. Pastikan format soal jelas.");
                onQuestionsGenerated(parsedQuestions, 'manual');
            } else {
                 throw new Error("Silakan pilih file untuk diunggah.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal memproses file.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleManualCreateClick = () => {
        setInputText('');
        setUploadedFile(null);
        setError('');
        onQuestionsGenerated([], 'manual');
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-12">
            <div className="space-y-8">
                <div className="text-center space-y-4">
                    <h2 className="text-3xl font-bold text-neutral">Buat Ujian Baru</h2>
                    <p className="text-gray-500 max-w-2xl mx-auto">
                        Mulai dengan mengunggah soal dalam format PDF, menempelkan teks soal, atau membuat soal secara manual. 
                        Sistem kami akan membantu Anda menyusun ujian dengan mudah.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Method 3: Manual */}
                    <div 
                        className={`p-6 border-2 rounded-2xl cursor-pointer transition-all duration-300 group border-gray-100 hover:border-primary/50 hover:shadow-lg bg-white`}
                        onClick={handleManualCreateClick}
                    >
                        <div className="flex flex-col items-center text-center space-y-3">
                            <div className={`p-4 rounded-2xl transition-colors bg-gray-50 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary`}>
                                <PencilIcon className="w-8 h-8" />
                            </div>
                            <h3 className="font-bold text-lg text-neutral">Buat Manual</h3>
                            <p className="text-sm text-gray-500">
                                Buat soal dari awal secara manual tanpa impor file atau teks.
                            </p>
                        </div>
                    </div>

                    {/* Method 1: Upload PDF */}
                    <div 
                        className={`p-6 border-2 rounded-2xl cursor-pointer transition-all duration-300 group ${inputMethod === 'upload' ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-100 bg-white hover:border-primary/50 hover:shadow-lg'}`}
                        onClick={() => setInputMethod('upload')}
                    >
                        <div className="flex flex-col items-center text-center space-y-3">
                            <div className={`p-4 rounded-2xl transition-colors ${inputMethod === 'upload' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary'}`}>
                                <CloudArrowUpIcon className="w-8 h-8" />
                            </div>
                            <h3 className="font-bold text-lg text-neutral">Unggah PDF Soal</h3>
                            <p className="text-sm text-gray-500">
                                Sistem akan otomatis mendeteksi dan memotong soal dari file PDF Anda.
                            </p>
                        </div>
                    </div>

                    {/* Method 2: Paste Text */}
                    <div 
                        className={`p-6 border-2 rounded-2xl cursor-pointer transition-all duration-300 group ${inputMethod === 'paste' ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-100 bg-white hover:border-primary/50 hover:shadow-lg'}`}
                        onClick={() => setInputMethod('paste')}
                    >
                        <div className="flex flex-col items-center text-center space-y-3">
                            <div className={`p-4 rounded-2xl transition-colors ${inputMethod === 'paste' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary'}`}>
                                <ListBulletIcon className="w-8 h-8" />
                            </div>
                            <h3 className="font-bold text-lg text-neutral">Tempel Teks Soal</h3>
                            <p className="text-sm text-gray-500">
                                Salin dan tempel teks soal langsung dari dokumen Word atau sumber lain.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all duration-300">
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-neutral mb-1">
                            {inputMethod === 'upload' ? 'Unggah File PDF' : 'Tempel Teks Soal'}
                        </h3>
                        <p className="text-sm text-gray-500">
                            {inputMethod === 'upload' ? 'Pilih file PDF dari perangkat Anda.' : 'Pastikan format soal jelas (nomor dan opsi).'}
                        </p>
                    </div>

                    {inputMethod === 'upload' ? (
                        <div className="space-y-4">
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors relative">
                                <input 
                                    type="file" 
                                    accept=".pdf" 
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setUploadedFile(e.target.files[0]);
                                            setInputText('');
                                        }
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="space-y-2 pointer-events-none">
                                    <CloudArrowUpIcon className="w-10 h-10 text-gray-400 mx-auto" />
                                    {uploadedFile ? (
                                        <p className="font-semibold text-primary">{uploadedFile.name}</p>
                                    ) : (
                                        <>
                                            <p className="text-gray-600 font-medium">Klik atau seret file PDF ke sini</p>
                                            <p className="text-xs text-gray-400">Maksimal ukuran file 10MB</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {previewImages.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-sm font-semibold text-gray-700">Pratinjau Halaman Pertama:</p>
                                    <div className="border rounded-xl overflow-hidden max-h-[300px] overflow-y-auto bg-gray-50 p-2 text-center">
                                        <img src={previewImages[0]} alt="Preview PDF" className="max-w-full h-auto mx-auto shadow-sm rounded-lg" />
                                    </div>
                                    <div className="flex justify-end">
                                        <button 
                                            onClick={handleExtractText}
                                            className="text-sm text-primary hover:underline flex items-center gap-1"
                                            disabled={isLoading}
                                        >
                                            <FileTextIcon className="w-4 h-4" />
                                            Ekstrak Teks dari PDF (Jika Auto-Crop Gagal)
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                className="w-full h-64 p-4 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary font-mono text-sm resize-y"
                                placeholder={`Contoh Format:\n\n1. Apa ibukota Indonesia?\nA. Bandung\nB. Jakarta\nC. Surabaya\nD. Medan\n\nKunci Jawaban: B`}
                            />
                            {inputText && (
                                <div className="flex justify-end">
                                    <button 
                                        onClick={handleDirectManualTransfer}
                                        className="text-sm text-secondary hover:underline flex items-center gap-1"
                                    >
                                        <PencilIcon className="w-4 h-4" />
                                        Gunakan sebagai Soal Manual (Tanpa Parsing Otomatis)
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {error && (
                        <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl flex items-start gap-2 border border-red-100">
                            <span className="font-bold">Error:</span> {error}
                        </div>
                    )}

                    <div className="mt-6 flex justify-end">
                        <button 
                            onClick={handleStartAnalysis} 
                            disabled={isLoading || (!inputText && !uploadedFile)}
                            className={`w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all ${isLoading || (!inputText && !uploadedFile) ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-focus hover:shadow-lg transform hover:-translate-y-0.5'}`}
                        >
                            {isLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    Memproses...
                                </>
                            ) : (
                                <>
                                    <CogIcon className="w-5 h-5" />
                                    {inputMethod === 'upload' ? 'Analisis & Crop PDF' : 'Analisis Teks'}
                                </>
                            )}
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
    const [previewExam, setPreviewExam] = useState<Exam | null>(null);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-gray-100 rounded-lg">
                    <PencilIcon className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-neutral">Draf Soal</h2>
                    <p className="text-sm text-gray-500">Lanjutkan pembuatan soal yang belum selesai.</p>
                </div>
            </div>

            {exams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {exams.map(exam => (
                        <div key={exam.code} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 relative group flex flex-col h-full">
                            {/* Delete Button */}
                            <button 
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteDraft(exam);
                                }}
                                className="absolute top-3 right-3 p-2 bg-white text-gray-400 hover:text-red-600 hover:bg-red-50 border border-gray-100 hover:border-red-100 rounded-full transition-all shadow-sm z-10"
                                title="Hapus Draf"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>

                            <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                     <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-md uppercase tracking-wider border border-gray-200">
                                        Draft
                                    </span>
                                </div>
                                <h3 className="font-bold text-lg text-gray-800 mb-1">{exam.config.subject || "Tanpa Judul"}</h3>
                                <p className="text-sm text-gray-400 font-mono font-medium mb-3">{exam.code}</p>

                                {/* Metadata Tags */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <MetaBadge text={exam.config.classLevel} colorClass="bg-blue-50 text-blue-700 border-blue-100" />
                                    <MetaBadge text={exam.config.examType} colorClass="bg-purple-50 text-purple-700 border-purple-100" />
                                </div>

                                <div className="h-px bg-gray-50 w-full mb-4"></div>

                                <div className="text-xs text-gray-500 space-y-2 mb-6">
                                    <div className="flex items-center gap-2">
                                        <CalendarDaysIcon className="w-4 h-4 text-gray-400" />
                                        <span>{new Date(exam.config.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <ListBulletIcon className="w-4 h-4 text-gray-400" />
                                        <span>{exam.questions.filter(q => q.questionType !== 'INFO').length} Soal Tersimpan</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setPreviewExam(exam)}
                                    className="flex-1 py-2.5 px-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 hover:text-primary transition-colors flex items-center justify-center gap-2 shadow-sm"
                                    title="Preview Soal"
                                >
                                    <EyeIcon className="w-4 h-4" />
                                    Preview
                                </button>
                                <button 
                                    onClick={() => onContinueDraft(exam)}
                                    className="flex-[2] py-2.5 px-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 transition-colors flex items-center justify-center gap-2 shadow-sm"
                                >
                                    <PencilIcon className="w-4 h-4" />
                                    Edit
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <PencilIcon className="h-8 w-8 text-gray-300" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">Belum Ada Draf</h3>
                    <p className="mt-1 text-sm text-gray-500">Anda belum menyimpan draf soal apapun.</p>
                </div>
            )}

            {/* PREVIEW MODAL */}
            {previewExam && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-in-up">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800">Preview Ujian</h3>
                            <button onClick={() => setPreviewExam(null)} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                                <XMarkIcon className="w-6 h-6 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-8 flex flex-col items-center text-center">
                             <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                                <EyeIcon className="w-8 h-8" />
                            </div>
                            <h4 className="text-xl font-bold text-gray-900 mb-1">{previewExam.config.subject || "Draf Ujian"}</h4>
                            <p className="text-sm text-gray-500 mb-6 font-mono bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{previewExam.code}</p>
                            
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${window.location.origin}/?preview=${previewExam.code}`)}&margin=10`} 
                                    alt="QR Preview" 
                                    className="w-40 h-40 object-contain"
                                />
                            </div>
                            
                            <p className="text-xs text-gray-400 mb-4 max-w-xs">
                                Pindai QR Code atau gunakan link di bawah untuk mencoba mengerjakan soal ini (Mode Preview).
                            </p>

                            <div className="flex gap-3 w-full">
                                <button 
                                    onClick={() => {
                                        const url = `${window.location.origin}/?preview=${previewExam.code}`;
                                        navigator.clipboard.writeText(url);
                                        alert("Link Preview berhasil disalin!");
                                    }}
                                    className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors text-sm"
                                >
                                    Salin Link
                                </button>
                                <a 
                                    href={`/?preview=${previewExam.code}`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex-1 bg-blue-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                                >
                                    Coba Sekarang
                                </a>
                            </div>
                        </div>
                    </div>
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
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 rounded-lg">
                    <ClockIcon className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-neutral">Ujian Sedang Berlangsung</h2>
                    <p className="text-sm text-gray-500">Pantau kemajuan ujian yang sedang berjalan secara real-time.</p>
                </div>
            </div>

            {exams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {exams.map(exam => {
                        const activeCount = results.filter(r => r.examCode === exam.code).length;
                        return (
                        <div key={exam.code} className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm hover:shadow-xl hover:shadow-emerald-50 hover:border-emerald-300 transition-all duration-300 relative group cursor-pointer" onClick={() => onSelectExam(exam)}>
                            
                            <div className="absolute top-4 right-4 z-10">
                                <button 
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onDuplicateExam(exam); }}
                                    className="p-2 bg-white text-gray-400 hover:bg-gray-50 hover:text-primary rounded-lg border border-transparent hover:border-gray-100 transition-all shadow-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                    title="Gunakan Kembali Soal"
                                >
                                    <DocumentDuplicateIcon className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex justify-between items-start mb-2">
                                <div className="flex flex-col">
                                     <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md w-fit mb-2 flex items-center gap-1.5">
                                        <span className="relative flex h-2 w-2">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                        Sedang Berlangsung
                                     </span>
                                     <h3 className="font-bold text-xl text-neutral">{exam.config.subject || exam.code}</h3>
                                     <p className="text-sm font-mono text-gray-400 mt-0.5">{exam.code}</p>
                                </div>
                            </div>
                            
                            {/* Metadata */}
                            <div className="flex flex-wrap gap-2 mt-3 mb-5">
                                <MetaBadge text={exam.config.classLevel} colorClass="bg-gray-100 text-gray-600" />
                                <MetaBadge text={exam.config.examType} colorClass="bg-gray-100 text-gray-600" />
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Partisipan</span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex -space-x-2">
                                            {[...Array(Math.min(3, activeCount))].map((_, i) => (
                                                <div key={i} className="w-6 h-6 rounded-full bg-emerald-200 border-2 border-white"></div>
                                            ))}
                                        </div>
                                        <span className="text-sm font-bold text-gray-700">{activeCount} Siswa</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Sisa Waktu</span>
                                    <div className="mt-1">
                                        <RemainingTime exam={exam} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )})}
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                    <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ClockIcon className="h-8 w-8 text-gray-300" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">Tidak Ada Ujian Aktif</h3>
                    <p className="mt-1 text-sm text-gray-500">Saat ini tidak ada ujian yang sedang berlangsung.</p>
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
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                    <CalendarDaysIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-neutral">Ujian Akan Datang</h2>
                    <p className="text-sm text-gray-500">Daftar semua ujian yang telah dijadwalkan.</p>
                </div>
            </div>

            {exams.length > 0 ? (
                <div className="space-y-4">
                    {exams.map(exam => (
                        <div key={exam.code} className="bg-white p-5 rounded-2xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-md hover:border-blue-200 group">
                            <div className="flex items-start gap-5">
                                <div className="bg-blue-50 w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-blue-700 border border-blue-100 shrink-0">
                                    <span className="text-[10px] font-bold uppercase">{new Date(exam.config.date).toLocaleDateString('id-ID', { month: 'short' })}</span>
                                    <span className="text-xl font-black leading-none">{new Date(exam.config.date).getDate()}</span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-lg text-neutral">{exam.config.subject || "Tanpa Judul"}</h3>
                                        <span className="text-xs font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{exam.code}</span>
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <MetaBadge text={exam.config.classLevel} colorClass="bg-gray-100 text-gray-600" />
                                        <MetaBadge text={exam.config.examType} colorClass="bg-gray-100 text-gray-600" />
                                    </div>

                                    <div className="text-xs text-gray-500 flex items-center gap-3 font-medium">
                                        <span className="flex items-center gap-1.5">
                                            <ClockIcon className="w-3.5 h-3.5"/> 
                                            {exam.config.startTime} WIB
                                        </span>
                                        <span className="text-gray-300">•</span>
                                        <span>{exam.config.timeLimit} Menit</span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => onEditExam(exam)} 
                                className="flex items-center justify-center gap-2 bg-white border-2 border-gray-100 text-gray-600 px-5 py-2.5 text-sm rounded-xl hover:border-primary hover:text-primary transition-all font-bold shadow-sm self-end md:self-center w-full md:w-auto"
                            >
                                <PencilIcon className="w-4 h-4" />
                                Edit Detail
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                    <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CalendarDaysIcon className="h-8 w-8 text-gray-300" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">Tidak Ada Ujian Terjadwal</h3>
                    <p className="mt-1 text-sm text-gray-500">Buat ujian baru untuk memulai.</p>
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
    onDeleteExam: (exam: Exam) => void;
}

export const FinishedExamsView: React.FC<FinishedExamsProps> = ({ exams, onSelectExam, onDuplicateExam, onDeleteExam }) => {
    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                    <ChartBarIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-neutral">Ujian Selesai</h2>
                    <p className="text-sm text-gray-500">Riwayat dan hasil ujian yang telah berakhir.</p>
                </div>
            </div>

            {exams.length > 0 ? (
                <div className="space-y-4">
                    {exams.map(exam => (
                        <div key={exam.code} className="bg-white p-5 rounded-2xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-md hover:border-gray-300 group relative">
                            {/* Delete Button - Fixed top-right in finished view */}
                            <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onDeleteExam(exam); }}
                                className="absolute top-3 right-3 p-2 bg-white text-gray-400 hover:text-red-600 hover:bg-red-50 border border-gray-100 hover:border-red-100 rounded-full transition-all shadow-sm z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                title="Hapus Data Ujian & Hasil"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>

                            <div className="flex items-start gap-4">
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <CheckCircleIcon className="w-6 h-6 text-gray-400 group-hover:text-green-500 transition-colors" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                         <h3 className="font-bold text-lg text-neutral">{exam.config.subject || exam.code}</h3>
                                         <span className="text-xs font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{exam.code}</span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <MetaBadge text={exam.config.classLevel} colorClass="bg-gray-100 text-gray-600" />
                                        <MetaBadge text={exam.config.examType} colorClass="bg-gray-100 text-gray-600" />
                                    </div>

                                    <div className="text-xs text-gray-400">
                                        Berakhir pada: {new Date(exam.config.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 self-end md:self-center w-full md:w-auto">
                                <button 
                                    onClick={() => onDuplicateExam(exam)} 
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gray-50 text-gray-600 px-4 py-2.5 text-sm rounded-xl hover:bg-gray-100 hover:text-gray-900 transition-colors font-bold shadow-sm border border-gray-200"
                                    title="Gunakan Kembali Soal"
                                >
                                    <DocumentDuplicateIcon className="w-4 h-4" />
                                    <span className="md:hidden lg:inline">Reuse</span>
                                </button>
                                <button 
                                    onClick={() => onSelectExam(exam)} 
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-2.5 text-sm rounded-xl hover:bg-black transition-all font-bold shadow-lg shadow-gray-200 transform active:scale-95"
                                >
                                    <ChartBarIcon className="w-4 h-4" />
                                    Lihat Hasil
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                    <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ChartBarIcon className="h-8 w-8 text-gray-300" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">Belum Ada Riwayat</h3>
                    <p className="mt-1 text-sm text-gray-500">Hasil ujian yang telah selesai akan muncul di sini.</p>
                </div>
            )}
        </div>
    );
};
