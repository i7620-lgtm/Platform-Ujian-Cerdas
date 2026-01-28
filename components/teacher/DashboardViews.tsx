
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
    XMarkIcon,
    PlusCircleIcon
} from '../Icons';

// --- INTERFACES ---

// Fix for: Cannot find name 'CreationViewProps'
interface CreationViewProps {
    onQuestionsGenerated: (questions: Question[], mode: 'auto' | 'manual') => void;
}

// Fix for: Cannot find name 'DraftsViewProps'
interface DraftsViewProps {
    exams: Exam[];
    onContinueDraft: (exam: Exam) => void;
    onDeleteDraft: (exam: Exam) => void;
}

// Fix for: Cannot find name 'OngoingExamsProps'
interface OngoingExamsProps {
    exams: Exam[];
    results: Result[];
    onSelectExam: (exam: Exam) => void;
    onDuplicateExam: (exam: Exam) => void;
}

// Fix for: Cannot find name 'UpcomingExamsProps'
interface UpcomingExamsProps {
    exams: Exam[];
    onEditExam: (exam: Exam) => void;
}

// Fix for: Cannot find name 'FinishedExamsViewProps'
interface FinishedExamsViewProps {
    exams: Exam[];
    onSelectExam: (exam: Exam) => void;
    onDuplicateExam: (exam: Exam) => void;
    onDeleteExam: (exam: Exam) => void;
}

// Helper untuk parsing waktu yang konsisten
const parseExamTimes = (exam: Exam) => {
    const dateStr = exam.config.date.includes('T') ? exam.config.date.split('T')[0] : exam.config.date;
    const start = new Date(`${dateStr}T${exam.config.startTime}:00`);
    const end = new Date(start.getTime() + (exam.config.timeLimit * 60 * 1000));
    return { start, end };
};

export const RemainingTime: React.FC<{ exam: Exam; minimal?: boolean }> = ({ exam, minimal = false }) => {
    const calculateTimeLeft = () => {
        const { start, end } = parseExamTimes(exam);
        const now = Date.now();
        
        if (now < start.getTime()) return { status: 'UPCOMING', diff: start.getTime() - now };
        if (now > end.getTime()) return { status: 'FINISHED', diff: 0 };
        return { status: 'ONGOING', diff: end.getTime() - now };
    };

    const [timeState, setTimeState] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setInterval(() => setTimeState(calculateTimeLeft()), 1000);
        return () => clearInterval(timer);
    }, [exam]);

    if (timeState.status === 'FINISHED') {
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">SELESAI</span>;
    }

    if (timeState.status === 'UPCOMING') {
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">DIJADWALKAN</span>;
    }

    const h = Math.floor(timeState.diff / 3600000);
    const m = Math.floor((timeState.diff % 3600000) / 60000);
    const s = Math.floor((timeState.diff % 60000) / 1000);
    const timeStr = `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    const isCritical = timeState.diff < 300000; // < 5 menit

    if (minimal) return <span className={`font-mono font-bold ${isCritical ? 'text-rose-600' : 'text-emerald-600'}`}>{timeStr}</span>;

    return (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold tabular-nums ${isCritical ? 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isCritical ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
            {timeStr}
        </div>
    );
};

const MetaBadge: React.FC<{ text: string; color?: string }> = ({ text, color = "bg-slate-100 text-slate-600 border-slate-200" }) => {
    if (!text || text === 'Lainnya') return null;
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${color}`}>{text}</span>;
};

export const CreationView: React.FC<CreationViewProps> = ({ onQuestionsGenerated }) => {
    const [inputMethod, setInputMethod] = useState<'paste' | 'upload'>('upload');
    const [inputText, setInputText] = useState('');
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleStartAnalysis = async () => {
        setIsLoading(true);
        setError('');
        try {
            if (inputMethod === 'paste') {
                if (!inputText.trim()) throw new Error("Tempel teks soal terlebih dahulu.");
                const parsed = parseQuestionsFromPlainText(inputText);
                if (parsed.length === 0) throw new Error("Format soal tidak dikenali.");
                onQuestionsGenerated(parsed, 'auto');
            } else if (uploadedFile) {
                const parsed = await parsePdfAndAutoCrop(uploadedFile);
                onQuestionsGenerated(parsed, 'manual');
            }
        } catch (err: any) { setError(err.message); }
        finally { setIsLoading(false); }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-fade-in">
            <div className="text-center space-y-3">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Mulai Ujian Baru</h2>
                <p className="text-slate-500 text-sm max-w-lg mx-auto">Pilih metode pembuatan soal yang paling efisien untuk Anda.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button onClick={() => onQuestionsGenerated([], 'manual')} className="p-8 bg-white border-2 border-slate-50 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-50/50 rounded-[2rem] transition-all group flex flex-col items-center text-center">
                    <div className="p-4 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors mb-4"><PencilIcon className="w-8 h-8"/></div>
                    <h3 className="font-bold text-slate-800">Manual</h3>
                    <p className="text-xs text-slate-400 mt-1">Ketik soal satu per satu</p>
                </button>
                <button onClick={() => setInputMethod('upload')} className={`p-8 border-2 rounded-[2rem] transition-all flex flex-col items-center text-center ${inputMethod === 'upload' ? 'bg-white border-indigo-600 shadow-xl shadow-indigo-50' : 'bg-white border-slate-50 hover:border-indigo-100'}`}>
                    <div className={`p-4 rounded-2xl mb-4 ${inputMethod === 'upload' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}><CloudArrowUpIcon className="w-8 h-8"/></div>
                    <h3 className="font-bold text-slate-800">Upload PDF</h3>
                    <p className="text-xs text-slate-400 mt-1">Deteksi & potong otomatis</p>
                </button>
                <button onClick={() => setInputMethod('paste')} className={`p-8 border-2 rounded-[2rem] transition-all flex flex-col items-center text-center ${inputMethod === 'paste' ? 'bg-white border-indigo-600 shadow-xl shadow-indigo-50' : 'bg-white border-slate-50 hover:border-indigo-100'}`}>
                    <div className={`p-4 rounded-2xl mb-4 ${inputMethod === 'paste' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}><ListBulletIcon className="w-8 h-8"/></div>
                    <h3 className="font-bold text-slate-800">Paste Teks</h3>
                    <p className="text-xs text-slate-400 mt-1">Salin dari Word/Dokumen</p>
                </button>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                {inputMethod === 'upload' ? (
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center hover:bg-slate-50 transition-colors relative">
                        <input type="file" accept=".pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setUploadedFile(e.target.files?.[0] || null)} />
                        <CloudArrowUpIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600 font-bold">{uploadedFile ? uploadedFile.name : 'Pilih file PDF soal'}</p>
                    </div>
                ) : (
                    <textarea value={inputText} onChange={e => setInputText(e.target.value)} className="w-full h-64 p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-serif" placeholder="Tempel soal di sini..." />
                )}
                {error && <p className="mt-4 text-xs font-bold text-rose-500 bg-rose-50 p-3 rounded-xl">{error}</p>}
                <div className="mt-8 flex justify-center">
                    <button onClick={handleStartAnalysis} disabled={isLoading || (!uploadedFile && !inputText)} className="bg-slate-900 text-white px-12 py-3.5 rounded-xl font-bold hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50">
                        {isLoading ? 'Memproses...' : 'Proses Soal Sekarang'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const DraftsView: React.FC<DraftsViewProps> = ({ exams, onContinueDraft, onDeleteDraft }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
        {exams.length > 0 ? exams.map(exam => (
            <div key={exam.code} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 py-0.5 border border-slate-100 rounded">Draf</span>
                    <button onClick={() => onDeleteDraft(exam)} className="text-slate-300 hover:text-rose-500 transition-colors"><TrashIcon className="w-5 h-5"/></button>
                </div>
                <h3 className="font-bold text-slate-800 line-clamp-1">{exam.config.subject || 'Tanpa Judul'}</h3>
                <p className="text-xs font-mono text-slate-400 mt-1">{exam.code}</p>
                <div className="flex gap-2 mt-4">
                    <MetaBadge text={exam.config.classLevel} color="bg-blue-50 text-blue-600 border-blue-100" />
                    <MetaBadge text={exam.config.examType} color="bg-indigo-50 text-indigo-600 border-indigo-100" />
                </div>
                <button onClick={() => onContinueDraft(exam)} className="w-full mt-6 py-3 bg-slate-50 group-hover:bg-indigo-600 group-hover:text-white transition-all rounded-xl font-bold text-slate-600 text-sm">Lanjutkan Edit</button>
            </div>
        )) : <div className="col-span-full py-20 text-center text-slate-400">Tidak ada draf.</div>}
    </div>
);

export const OngoingExamsView: React.FC<OngoingExamsProps> = ({ exams, results, onSelectExam, onDuplicateExam }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
        {exams.length > 0 ? exams.map(exam => {
            const count = results.filter(r => r.examCode === exam.code).length;
            return (
                <div key={exam.code} onClick={() => onSelectExam(exam)} className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all cursor-pointer group relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                    <div className="flex justify-between items-start mb-3">
                        <RemainingTime exam={exam} />
                        <button onClick={e => { e.stopPropagation(); onDuplicateExam(exam); }} className="text-slate-300 hover:text-indigo-600"><DocumentDuplicateIcon className="w-5 h-5"/></button>
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mt-2">{exam.config.subject}</h3>
                    <div className="flex items-center gap-3 mt-4">
                        <div className="flex -space-x-2">
                            {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white"></div>)}
                        </div>
                        <span className="text-xs font-bold text-slate-400">{count} Siswa Aktif</span>
                    </div>
                </div>
            );
        }) : <div className="col-span-full py-20 text-center text-slate-400 italic">Tidak ada ujian yang sedang berlangsung.</div>}
    </div>
);

export const UpcomingExamsView: React.FC<UpcomingExamsProps> = ({ exams, onEditExam }) => (
    <div className="space-y-4 animate-fade-in">
        {exams.length > 0 ? exams.map(exam => (
            <div key={exam.code} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between group hover:shadow-lg transition-all">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex flex-col items-center justify-center text-indigo-600 shrink-0">
                        <span className="text-[10px] font-bold uppercase">{new Date(exam.config.date).toLocaleDateString('id-ID', { month: 'short' })}</span>
                        <span className="text-lg font-black leading-none">{new Date(exam.config.date).getDate()}</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">{exam.config.subject}</h3>
                        <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <span>{exam.config.startTime} WIB</span>
                            <span>•</span>
                            <span>{exam.config.timeLimit} Menit</span>
                            <span>•</span>
                            <span className="text-indigo-500">{exam.code}</span>
                        </div>
                    </div>
                </div>
                <button onClick={() => onEditExam(exam)} className="p-3 bg-slate-50 text-slate-400 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all"><PencilIcon className="w-5 h-5"/></button>
            </div>
        )) : <div className="py-20 text-center text-slate-400">Belum ada jadwal ujian.</div>}
    </div>
);

export const FinishedExamsView: React.FC<FinishedExamsViewProps> = ({ exams, onSelectExam, onDuplicateExam, onDeleteExam }) => (
    <div className="space-y-4 animate-fade-in">
        {exams.length > 0 ? exams.map(exam => (
            <div key={exam.code} onClick={() => onSelectExam(exam)} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between cursor-pointer hover:shadow-md transition-all group">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-50 rounded-2xl text-slate-300 group-hover:text-emerald-500 transition-colors"><CheckCircleIcon className="w-6 h-6"/></div>
                    <div>
                        <h3 className="font-bold text-slate-800">{exam.config.subject}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{new Date(exam.config.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={e => { e.stopPropagation(); onDuplicateExam(exam); }} className="p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all"><DocumentDuplicateIcon className="w-5 h-5"/></button>
                    <button onClick={e => { e.stopPropagation(); onDeleteExam(exam); }} className="p-2.5 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-xl transition-all"><TrashIcon className="w-5 h-5"/></button>
                </div>
            </div>
        )) : <div className="py-20 text-center text-slate-400 italic">Riwayat kosong.</div>}
    </div>
);
