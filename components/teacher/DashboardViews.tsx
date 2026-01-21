
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
    TrashIcon
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
        return <span className="text-red-600 font-bold">Waktu Habis</span>;
    }

    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    return (
        <span className="font-mono tracking-wider">
            {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
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
                        className={`p-6 border-2 rounded-xl cursor-pointer transition-all duration-300 group border-gray-200 hover:border-primary/50 hover:shadow-md`}
                        onClick={handleManualCreateClick}
                    >
                        <div className="flex flex-col items-center text-center space-y-3">
                            <div className={`p-4 rounded-full transition-colors bg-gray-100 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary`}>
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
                        className={`p-6 border-2 rounded-xl cursor-pointer transition-all duration-300 group ${inputMethod === 'upload' ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-200 hover:border-primary/50 hover:shadow-md'}`}
                        onClick={() => setInputMethod('upload')}
                    >
                        <div className="flex flex-col items-center text-center space-y-3">
                            <div className={`p-4 rounded-full transition-colors ${inputMethod === 'upload' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary'}`}>
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
                        className={`p-6 border-2 rounded-xl cursor-pointer transition-all duration-300 group ${inputMethod === 'paste' ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-200 hover:border-primary/50 hover:shadow-md'}`}
                        onClick={() => setInputMethod('paste')}
                    >
                        <div className="flex flex-col items-center text-center space-y-3">
                            <div className={`p-4 rounded-full transition-colors ${inputMethod === 'paste' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary'}`}>
                                <ListBulletIcon className="w-8 h-8" />
                            </div>
                            <h3 className="font-bold text-lg text-neutral">Tempel Teks Soal</h3>
                            <p className="text-sm text-gray-500">
                                Salin dan tempel teks soal langsung dari dokumen Word atau sumber lain.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border shadow-sm transition-all duration-300">
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
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors relative">
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
                                    <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto bg-gray-100 p-2 text-center">
                                        <img src={previewImages[0]} alt="Preview PDF" className="max-w-full h-auto mx-auto shadow-sm" />
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
                                className="w-full h-64 p-4 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary font-mono text-sm resize-y"
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
                        <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2">
                            <span className="font-bold">Error:</span> {error}
                        </div>
                    )}

                    <div className="mt-6 flex justify-end">
                        <button 
                            onClick={handleStartAnalysis} 
                            disabled={isLoading || (!inputText && !uploadedFile)}
                            className={`w-full sm:w-auto px-8 py-3 rounded-lg font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all ${isLoading || (!inputText && !uploadedFile) ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-focus hover:shadow-lg transform hover:-translate-y-0.5'}`}
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
    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h2 className="text-2xl font-bold text-neutral">Draf Soal</h2>
                <p className="text-base-content mt-1">Lanjutkan pembuatan soal yang belum selesai.</p>
            </div>
            {exams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {exams.map(exam => (
                        <div key={exam.code} className="bg-white p-5 rounded-lg border border-dashed border-gray-300 shadow-sm hover:shadow-md hover:border-primary transition-all duration-200 relative group">
                            {/* Delete Button */}
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteDraft(exam);
                                }}
                                className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title="Hapus Draf"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>

                            <div className="flex justify-between items-start mb-3 pr-8">
                                <h3 className="font-bold text-lg text-gray-700">{exam.code}</h3>
                                <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded uppercase tracking-wider">
                                    DRAFT
                                </span>
                            </div>
                            <div className="text-sm text-gray-500 space-y-1 mb-4">
                                <p className="flex items-center gap-2">
                                    <CalendarDaysIcon className="w-4 h-4" />
                                    {new Date(exam.config.date).toLocaleDateString('id-ID')}
                                </p>
                                <p className="flex items-center gap-2">
                                    <ListBulletIcon className="w-4 h-4" />
                                    {exam.questions.length} Soal Tersimpan
                                </p>
                            </div>
                            <button 
                                onClick={() => onContinueDraft(exam)}
                                className="w-full py-2 px-4 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900 transition-colors flex items-center justify-center gap-2"
                            >
                                <PencilIcon className="w-4 h-4" />
                                Lanjutkan Edit
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
                    <PencilIcon className="mx-auto h-12 w-12 text-gray-300" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Belum Ada Draf</h3>
                    <p className="mt-1 text-sm text-gray-500">Anda belum menyimpan draf soal apapun.</p>
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
}

export const OngoingExamsView: React.FC<OngoingExamsProps> = ({ exams, results, onSelectExam }) => {
    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h2 className="text-2xl font-bold text-neutral">Ujian Sedang Berlangsung</h2>
                <p className="text-base-content mt-1">Pantau kemajuan ujian yang sedang berjalan secara real-time.</p>
            </div>
            {exams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {exams.map(exam => (
                        <div key={exam.code} className="bg-white p-5 rounded-lg border shadow-sm hover:shadow-lg hover:border-primary transition-all duration-200 cursor-pointer" onClick={() => onSelectExam(exam)}>
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-lg text-primary">{exam.code}</h3>
                                <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                    {results.filter(r => r.examCode === exam.code).length} Siswa
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                                {new Date(exam.config.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                            <div className="mt-4 pt-4 border-t flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-600">Sisa Waktu:</span>
                                <div className="text-lg text-red-500">
                                    <RemainingTime exam={exam} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-white rounded-lg border">
                    <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak Ada Ujian Aktif</h3>
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
        <div className="space-y-3">
            <div>
                <h2 className="text-2xl font-bold text-neutral">Ujian Akan Datang</h2>
                <p className="text-base-content mt-1">Daftar semua ujian yang telah dijadwalkan untuk masa depan.</p>
            </div>
            {exams.length > 0 ? (
                <div className="space-y-3">
                    {exams.map(exam => (
                        <div key={exam.code} className="bg-white p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all hover:shadow-md hover:border-secondary">
                            <div className="flex items-center gap-4">
                                <div className="bg-secondary/10 p-3 rounded-lg">
                                    <CalendarDaysIcon className="w-6 h-6 text-secondary" />
                                </div>
                                <div>
                                    <p className="font-bold text-lg text-neutral">{exam.code}</p>
                                    <p className="text-sm text-gray-500">
                                        {new Date(exam.config.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                                        {` - ${exam.config.startTime}`}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => onEditExam(exam)} className="flex items-center gap-2 bg-accent text-white px-4 py-2 text-sm rounded-md hover:bg-accent-focus transition-colors font-semibold shadow-sm self-end sm:self-auto">
                                <PencilIcon className="w-4 h-4" />
                                Edit
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-white rounded-lg border mt-4">
                    <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak Ada Ujian Terjadwal</h3>
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
}

export const FinishedExamsView: React.FC<FinishedExamsProps> = ({ exams, onSelectExam }) => {
    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h2 className="text-2xl font-bold text-neutral">Ujian Selesai</h2>
                <p className="text-base-content mt-1">Lihat kembali hasil dari ujian yang telah selesai.</p>
            </div>
            {exams.length > 0 ? (
                <div className="space-y-3">
                    {exams.map(exam => (
                        <div key={exam.code} className="bg-white p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all hover:shadow-md hover:border-gray-400">
                            <div className="flex items-center gap-4">
                                <div className="bg-gray-100 p-3 rounded-lg">
                                    <CheckCircleIcon className="w-6 h-6 text-gray-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-lg text-neutral">{exam.code}</p>
                                    <p className="text-sm text-gray-500">{new Date(exam.config.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                </div>
                            </div>
                            <button onClick={() => onSelectExam(exam)} className="flex items-center gap-2 bg-primary text-primary-content px-4 py-2 text-sm rounded-md hover:bg-primary-focus transition-colors font-semibold shadow-sm self-end sm:self-auto">
                                <ChartBarIcon className="w-4 h-4" />
                                Lihat Hasil
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                    <div className="text-center py-12 bg-white rounded-lg border mt-4">
                    <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Belum Ada Ujian Selesai</h3>
                    <p className="mt-1 text-sm text-gray-500">Hasil ujian yang telah selesai akan muncul di sini.</p>
                </div>
            )}
        </div>
    );
};
