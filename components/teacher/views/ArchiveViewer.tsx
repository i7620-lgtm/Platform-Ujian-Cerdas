
import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Exam, Result, Question } from '../../../types';
import { storageService } from '../../../services/storage';
import { calculateAggregateStats, analyzeStudentPerformance, compressImage } from '../examUtils';
import { 
    CloudArrowUpIcon, DocumentDuplicateIcon, TrashIcon, ExclamationTriangleIcon, ChartBarIcon, PrinterIcon,
    CheckCircleIcon, XMarkIcon, UserIcon, ListBulletIcon, TableCellsIcon, ChevronDownIcon, ChevronUpIcon 
} from '../../Icons';
import { StatWidget, QuestionAnalysisItem } from './SharedComponents';

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
        storageService.getArchivedList().then(setCloudArchives).catch(()=>{});
    };

    const handlePrint = () => {
        const isDark = document.documentElement.classList.contains('dark');
        if (isDark) {
            document.documentElement.classList.remove('dark');
        }
        setTimeout(() => {
            window.print();
            if (isDark) {
                document.documentElement.classList.add('dark');
            }
        }, 100);
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

    useEffect(() => {
        if (!archiveData) return;
        
        let mismatchCount = 0;
        const fixedResults = archiveData.results.map(r => {
            const stats = getCalculatedStats(r, archiveData.exam);
            
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
            setArchiveData(prev => prev ? ({ ...prev, results: fixedResults }) : null);

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
    }, [archiveData?.exam.code]);

    const toggleStudent = (id: string) => {
        if (expandedStudent === id) setExpandedStudent(null);
        else setExpandedStudent(id);
    };

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
                options: q.questionType === 'MULTIPLE_CHOICE' ? q.options : undefined
            };
        });
    }, [archiveData]);

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

    const { categoryStats, levelStats } = useMemo(() => {
        if (!archiveData) return { categoryStats: [], levelStats: [] };
        return calculateAggregateStats(archiveData.exam, archiveData.results);
    }, [archiveData]);

    const generalRecommendation = useMemo(() => {
        if (!archiveData) return '';
        const { results } = archiveData;
        const totalStudents = results.length;
        const averageScore = totalStudents > 0 ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / totalStudents) : 0;
        
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
                    :root, html, body { color-scheme: light !important; background-color: #ffffff !important; color: #0f172a !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .dark { color-scheme: light !important; }
                    *, *:before, *:after { background-color: transparent; border-color: #cbd5e1; }
                    .print-bg-green { background-color: #dcfce7 !important; border-color: #86efac !important; color: #14532d !important; -webkit-print-color-adjust: exact !important; }
                    .print-bg-red { background-color: #fee2e2 !important; border-color: #fda4af !important; color: #881337 !important; -webkit-print-color-adjust: exact !important; }
                    .print-bg-orange { background-color: #ffedd5 !important; border-color: #fdba74 !important; color: #7c2d12 !important; -webkit-print-color-adjust: exact !important; }
                    .print-bg-gray { background-color: #f1f5f9 !important; border-color: #cbd5e1 !important; color: #475569 !important; -webkit-print-color-adjust: exact !important; }
                    .print-bar-green { background-color: #10b981 !important; -webkit-print-color-adjust: exact !important; }
                    .print-bar-orange { background-color: #f97316 !important; -webkit-print-color-adjust: exact !important; }
                    .print-bar-red { background-color: #ef4444 !important; -webkit-print-color-adjust: exact !important; }
                    table { width: 100% !important; border-collapse: collapse !important; font-size: 8pt !important; }
                    th, td { border: 1px solid #94a3b8 !important; padding: 3px 5px !important; color: #0f172a !important; }
                    thead th { background-color: #f8fafc !important; font-weight: bold !important; -webkit-print-color-adjust: exact !important; }
                    .no-print, .print\\:hidden { display: none !important; }
                    .page-break { page-break-before: always; }
                    .avoid-break { break-inside: avoid; page-break-inside: avoid; }
                    .shadow-sm, .shadow-md, .shadow-lg { box-shadow: none !important; }
                }
            `}</style>

            {fixMessage && (
                <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 p-4 rounded-xl flex items-center gap-3 animate-fade-in shadow-sm">
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
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Pratinjau Arsip: <span className="text-indigo-600 dark:text-indigo-400">{exam.config.subject}</span></h2>
                            {sourceType === 'LOCAL' && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-bold uppercase border border-gray-200">Local File</span>}
                            {sourceType === 'CLOUD' && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase border border-blue-100">Cloud Storage</span>}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-mono">{exam.code} • {exam.createdAt ? `Diarsipkan pada ${exam.createdAt}` : 'Tanggal tidak diketahui'}</p>
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
                        <button onClick={() => onReuseExam(exam)} className="flex-1 md:flex-none px-4 py-2 bg-indigo-600 dark:bg-indigo-600 text-white text-xs font-bold uppercase rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 dark:shadow-indigo-900/30 flex items-center gap-2"><DocumentDuplicateIcon className="w-4 h-4"/> Gunakan Ulang</button>
                    </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex gap-4">
                    {(['DETAIL', 'STUDENTS', 'ANALYSIS'] as ArchiveTab[]).map(tab => {
                        const label = tab === 'DETAIL' ? 'Detail Ujian' : tab === 'STUDENTS' ? `Rekap Siswa (${totalStudents})` : 'Analisis Soal';
                        return <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === tab ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>{label}</button>
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
                                {results.map(r => {
                                    const { correct, wrong, empty, score } = getCalculatedStats(r, exam);
                                    return (
                                    <React.Fragment key={r.student.studentId}>
                                        <tr onClick={() => toggleStudent(r.student.studentId)} className="hover:bg-slate-50/30 dark:hover:bg-slate-700/30 cursor-pointer group transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={`transition-transform duration-300 text-slate-400 ${expandedStudent === r.student.studentId ? 'rotate-180 text-indigo-500' : ''}`}>
                                                        {expandedStudent === r.student.studentId ? <ChevronUpIcon className="w-4 h-4"/> : <ChevronDownIcon className="w-4 h-4"/>}
                                                    </div>
                                                    <div className="font-bold text-slate-800 dark:text-slate-200 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{r.student.fullName}</div>
                                                </div>
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
                                        {expandedStudent === r.student.studentId && (
                                            <tr className="animate-fade-in bg-slate-50/50 dark:bg-slate-900/50 shadow-inner">
                                                <td colSpan={5} className="p-6">
                                                    <div className="flex items-center gap-4 mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                                        <span className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-300 dark:bg-emerald-600 rounded"></div> Benar</span>
                                                        <span className="flex items-center gap-1"><div className="w-3 h-3 bg-rose-300 dark:bg-rose-600 rounded"></div> Salah</span>
                                                        <span className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-200 dark:bg-slate-700 rounded"></div> Kosong</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {exam.questions.filter(q => q.questionType !== 'INFO').map((q, idx) => {
                                                            const status = checkAnswerStatus(q, r.answers);
                                                            let bgClass = 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-200'; 
                                                            if (status === 'CORRECT') bgClass = 'bg-emerald-300 dark:bg-emerald-600 text-slate-900 dark:text-white';
                                                            else if (status === 'WRONG') bgClass = 'bg-rose-300 dark:bg-rose-600 text-slate-900 dark:text-white';
                                                            return <div key={q.id} title={`Soal ${idx+1}: ${status === 'CORRECT' ? 'Benar' : status === 'EMPTY' ? 'Kosong' : 'Salah'}`} className={`w-6 h-6 flex items-center justify-center rounded text-[10px] font-bold ${bgClass} cursor-help transition-transform hover:scale-110`}>{idx + 1}</div>;
                                                        })}
                                                    </div>
                                                    
                                                    {r.activityLog && r.activityLog.length > 0 && (
                                                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                                            <h4 className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-500 mb-2 flex items-center gap-2">
                                                                <ExclamationTriangleIcon className="w-3 h-3"/> Riwayat Aktivitas & Kecurangan
                                                            </h4>
                                                            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc pl-4 font-mono bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                                                                {r.activityLog.map((log, i) => <li key={i}>{log}</li>)}
                                                            </ul>
                                                        </div>
                                                    )}
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
                        <div><h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><TableCellsIcon className="w-5 h-5 text-slate-400 dark:text-slate-500"/> Analisis Butir Soal</h3><div className="grid grid-cols-1 gap-4">{exam.questions.filter(q => q.questionType !== 'INFO').map((q, idx) => { const stats = questionStats.find(s => s.id === q.id) || { correctRate: 0 }; return <QuestionAnalysisItem key={q.id} q={q} index={idx} stats={stats} examResults={results} />; })}</div></div>
                    </div>
                )}
            </div>
            
            {/* PRINT VIEW (Clean & Sequential 5 Points) */}
            <div className="hidden print:block text-slate-900">
                {/* Header Global */}
                <div className="border-b-2 border-slate-900 pb-2 mb-6">
                    <h1 className="text-2xl font-black uppercase tracking-tight">{exam.config.subject}</h1>
                    <div className="flex justify-between items-end mt-2">
                        <div className="text-xs font-bold text-slate-600">
                            <p>KODE UJIAN: <span className="font-mono text-slate-900 text-sm bg-slate-100 px-1">{exam.code}</span></p>
                            <p>TANGGAL: {new Date(exam.config.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p>SEKOLAH: {exam.authorSchool || '-'}</p>
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
                            <p className="text-lg font-black">{averageScore}</p>
                        </div>
                        <div className="border border-slate-300 p-3 rounded text-center bg-slate-50">
                            <p className="text-[9px] font-bold text-slate-500 uppercase">Tertinggi</p>
                            <p className="text-lg font-black text-emerald-700">{highestScore}</p>
                        </div>
                        <div className="border border-slate-300 p-3 rounded text-center bg-slate-50">
                            <p className="text-[9px] font-bold text-slate-500 uppercase">Terendah</p>
                            <p className="text-lg font-black text-rose-700">{lowestScore}</p>
                        </div>
                        <div className="border border-slate-300 p-3 rounded text-center bg-slate-50">
                            <p className="text-[9px] font-bold text-slate-500 uppercase">Partisipan</p>
                            <p className="text-lg font-black text-blue-700">{totalStudents}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-4">
                        {/* Kategori */}
                        <div>
                            <p className="text-[10px] font-bold uppercase mb-2 text-slate-500">Persentase Penguasaan Materi (Kategori)</p>
                            <table className="w-full border-collapse border border-slate-300 text-[10px]">
                                <thead className="bg-slate-100"><tr><th className="border p-1 text-left">Kategori</th><th className="border p-1 text-right w-16">Penguasaan</th></tr></thead>
                                <tbody>
                                    {categoryStats.length > 0 ? categoryStats.map(s => {
                                        let bgClass = '';
                                        if (s.percentage >= 80) bgClass = 'print-bg-green';
                                        else if (s.percentage >= 50) bgClass = 'print-bg-orange';
                                        else bgClass = 'print-bg-red';
                                        
                                        return (
                                            <tr key={s.name}>
                                                <td className="border p-1">{s.name}</td>
                                                <td className={`border p-1 text-right font-bold ${bgClass}`}>{s.percentage}%</td>
                                            </tr>
                                        )
                                    }) : <tr><td colSpan={2} className="border p-1 italic text-center">Data tidak tersedia</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        {/* Level */}
                        <div>
                            <p className="text-[10px] font-bold uppercase mb-2 text-slate-500">Persentase Tingkat Kesulitan</p>
                            <table className="w-full border-collapse border border-slate-300 text-[10px]">
                                <thead className="bg-slate-100"><tr><th className="border p-1 text-left">Level</th><th className="border p-1 text-right w-16">Ketuntasan</th></tr></thead>
                                <tbody>
                                    {levelStats.length > 0 ? levelStats.map(s => {
                                        let bgClass = '';
                                        if (s.percentage >= 80) bgClass = 'print-bg-green';
                                        else if (s.percentage >= 50) bgClass = 'print-bg-orange';
                                        else bgClass = 'print-bg-red';

                                        return (
                                            <tr key={s.name}>
                                                <td className="border p-1">{s.name}</td>
                                                <td className={`border p-1 text-right font-bold ${bgClass}`}>{s.percentage}%</td>
                                            </tr>
                                        )
                                    }) : <tr><td colSpan={2} className="border p-1 italic text-center">Data tidak tersedia</td></tr>}
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
                    <table className="w-full border-collapse border border-slate-300 text-[9px]">
                        <thead>
                            <tr className="bg-slate-100">
                                <th className="border border-slate-300 p-1 text-center w-8">No</th>
                                <th className="border border-slate-300 p-1 text-left w-40 whitespace-nowrap">Nama Siswa</th>
                                <th className="border border-slate-300 p-1 text-left w-16">Kelas</th>
                                <th className="border border-slate-300 p-1 text-center w-10">Nilai</th>
                                <th className="border border-slate-300 p-1 text-left">Rincian Jawaban (Hijau: Benar, Merah: Salah, Abu: Kosong)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((r, index) => {
                                const { score } = getCalculatedStats(r, exam);
                                return (
                                    <tr key={r.student.studentId} className="avoid-break">
                                        <td className="border border-slate-300 p-1 text-center">{index + 1}</td>
                                        <td className="border border-slate-300 p-1 font-bold whitespace-nowrap">{r.student.fullName}</td>
                                        <td className="border border-slate-300 p-1 uppercase">{r.student.class}</td>
                                        <td className="border border-slate-300 p-1 text-center font-bold text-sm">{score}</td>
                                        <td className="border border-slate-300 p-1">
                                            <div className="flex flex-wrap gap-0.5">
                                                {exam.questions.filter(q => q.questionType !== 'INFO').map((q, idx) => {
                                                    const status = checkAnswerStatus(q, r.answers);
                                                    let bgClass = 'print-bg-gray'; 
                                                    if (status === 'CORRECT') bgClass = 'print-bg-green';
                                                    else if (status === 'WRONG') bgClass = 'print-bg-red';
                                                    
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
                    <table className="w-full border-collapse border border-slate-300 text-[9px]">
                        <thead>
                            <tr className="bg-slate-100">
                                <th className="border border-slate-300 p-1 text-center w-8">No</th>
                                <th className="border border-slate-300 p-1 text-left w-32 whitespace-nowrap">Nama Siswa</th>
                                <th className="border border-slate-300 p-1 text-left">Analisis Kategori (Penguasaan)</th>
                                <th className="border border-slate-300 p-1 text-left w-48">Rekomendasi Tindakan</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((r, index) => {
                                const analysis = analyzeStudentPerformance(exam, r);
                                return (
                                    <tr key={r.student.studentId} className="avoid-break">
                                        <td className="border border-slate-300 p-1 text-center">{index + 1}</td>
                                        <td className="border border-slate-300 p-1 font-bold whitespace-nowrap">{r.student.fullName}</td>
                                        <td className="border border-slate-300 p-1">
                                            <div className="flex flex-wrap gap-2">
                                                {analysis.stats.map(stat => {
                                                    let textClass = 'text-emerald-700';
                                                    if (stat.percentage < 50) textClass = 'text-rose-700';
                                                    else if (stat.percentage < 80) textClass = 'text-amber-700';

                                                    return (
                                                        <span key={stat.name} className="inline-flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                                            <span className="font-semibold">{stat.name}:</span>
                                                            <span className={`font-bold ${textClass}`}>
                                                                {stat.percentage}%
                                                            </span>
                                                        </span>
                                                    );
                                                })}
                                                {analysis.stats.length === 0 && <span className="text-slate-400 italic">-</span>}
                                            </div>
                                        </td>
                                        <td className="border border-slate-300 p-1 font-medium italic text-slate-700">
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
                            
                            let diffColorClass = 'print-bg-green';
                            let barColorClass = 'print-bar-green';
                            
                            if (data.correctRate < 50) { 
                                diffColorClass = 'print-bg-red'; 
                                barColorClass = 'print-bar-red'; 
                            } else if (data.correctRate < 80) { 
                                diffColorClass = 'print-bg-orange'; 
                                barColorClass = 'print-bar-orange'; 
                            }
                            
                            // Get original question to check correct answer
                            const originalQ = exam.questions.find(q => q.id === data.id);

                            return (
                                <div key={data.id} className="avoid-break border border-slate-300 rounded p-2 text-xs flex flex-col gap-2 bg-white">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10px] border border-slate-200">Soal {idx + 1}</span>
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${diffColorClass}`}>{difficultyLabel}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                                            <div className={`h-full ${barColorClass}`} style={{ width: `${data.correctRate}%` }}></div>
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
                                                    const pct = totalStudents > 0 ? Math.round((count/totalStudents)*100) : 0;
                                                    
                                                    const isCorrect = 
                                                        (originalQ?.questionType === 'MULTIPLE_CHOICE' && opt === originalQ.correctAnswer) ||
                                                        (originalQ?.questionType === 'COMPLEX_MULTIPLE_CHOICE' && originalQ.correctAnswer?.includes(opt));
                                                    
                                                    return (
                                                        <div key={i} className={`flex items-center justify-between px-2 py-1 rounded border ${isCorrect ? 'print-bg-green font-bold' : 'border-slate-100 text-slate-600'}`}>
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
                                                            const pct = totalStudents > 0 ? Math.round((numCount/totalStudents)*100) : 0;
                                                            
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
                                                                <div key={i} className={`flex items-start justify-between px-2 py-1 rounded border ${isCorrect ? 'print-bg-green font-bold' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
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
                        {exam.questions.map((q, index) => {
                            const questionNumber = exam.questions.slice(0, index).filter(i => i.questionType !== 'INFO').length + 1;
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
                                                                className={`flex gap-1 p-1 rounded border ${isCorrect ? 'print-bg-green font-bold' : 'border-transparent'}`}
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
