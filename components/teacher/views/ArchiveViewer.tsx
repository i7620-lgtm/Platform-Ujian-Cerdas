
import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Exam, Result, Question } from '../../../types';
import { storageService } from '../../../services/storage';
import { calculateAggregateStats, analyzeStudentPerformance, compressImage, parseList, analyzeQuestionTypePerformance, analyzeClassPerformance } from '../examUtils';
import { 
    CloudArrowUpIcon, DocumentDuplicateIcon, TrashIcon, ExclamationTriangleIcon, ChartBarIcon, PrinterIcon,
    CheckCircleIcon, XMarkIcon, UserIcon, ListBulletIcon, TableCellsIcon, ChevronDownIcon, ChevronUpIcon, PencilIcon 
} from '../../Icons';
import { StatWidget, QuestionAnalysisItem } from './SharedComponents';
import * as XLSX from 'xlsx';
import { EXAM_TYPES } from '../constants';

interface ArchiveViewerProps {
    onReuseExam: (exam: Exam) => void;
}

type ArchiveData = {
    exam: Exam;
    results: Result[];
};

type ArchiveTab = 'DETAIL' | 'STUDENTS' | 'ANALYSIS' | 'CLASS_ANALYSIS';

const EditMetadataModal = ({ exam, onClose, onSave }: { exam: Exam, onClose: () => void, onSave: (updated: Partial<Exam>) => void }) => {
    const [formData, setFormData] = useState({
        authorSchool: exam.authorSchool || '',
        authorName: exam.authorName || '',
        subject: exam.config.subject || '',
        classLevel: exam.config.classLevel || '',
        examType: exam.config.examType || '',
        date: exam.config.date || '',
        manualParticipantCount: exam.config.manualParticipantCount || ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = () => {
        onSave({
            authorSchool: formData.authorSchool,
            authorName: formData.authorName,
            config: {
                ...exam.config,
                subject: formData.subject,
                classLevel: formData.classLevel,
                examType: formData.examType,
                date: formData.date,
                manualParticipantCount: formData.manualParticipantCount ? Number(formData.manualParticipantCount) : undefined
            }
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-700">
                <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <PencilIcon className="w-5 h-5 text-indigo-600"/> Edit Metadata Arsip
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <XMarkIcon className="w-5 h-5 text-slate-500"/>
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Sekolah</label>
                            <input name="authorSchool" value={formData.authorSchool} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Guru</label>
                            <input name="authorName" value={formData.authorName} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mata Pelajaran</label>
                            <input name="subject" value={formData.subject} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tingkat Kelas</label>
                            <input name="classLevel" value={formData.classLevel} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Jenis Evaluasi</label>
                            <select name="examType" value={formData.examType} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white">
                                <option value="">Pilih...</option>
                                {EXAM_TYPES.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tanggal Ujian</label>
                            <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Jumlah Partisipan (Manual)</label>
                            <input type="number" name="manualParticipantCount" value={formData.manualParticipantCount} onChange={handleChange} placeholder="Otomatis (dari hasil)" className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"/>
                        </div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100 dark:border-amber-800 flex gap-3 items-start">
                        <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"/>
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                            Perubahan ini hanya berlaku pada sesi ini. Untuk menyimpan permanen, silakan "Download JSON" atau "Simpan ke Cloud" setelah mengedit.
                        </p>
                    </div>
                </div>
                <div className="p-6 border-t dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-bold transition-colors">Batal</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all">Simpan Perubahan</button>
                </div>
            </div>
        </div>
    );
};

const normalize = (str: string, qType: string) => {
    const s = String(str || '');
    if (qType === 'FILL_IN_THE_BLANK') {
        return s.replace(/<[^>]*>?/gm, '').trim().toLowerCase().replace(/\s+/g, ' ');
    }
    try {
        const div = document.createElement('div');
        div.innerHTML = s;
        
        // Remove math-visual wrappers to compare actual content
        div.querySelectorAll('.math-visual').forEach(el => {
            while (el.firstChild) {
                el.parentNode?.insertBefore(el.firstChild, el);
            }
            el.parentNode?.removeChild(el);
        });

        // Standardize HTML by removing whitespace between tags and trimming
        return div.innerHTML.replace(/>\s+</g, '><').trim().replace(/\s+/g, ' ');
    } catch {
        return s.trim().replace(/\s+/g, ' ');
    }
};

const checkAnswerStatus = (q: Question, studentAnswers: Record<string, string>) => {
    // 1. Check for manual grade override first
    const manualGradeKey = `_grade_${q.id}`;
    if (studentAnswers[manualGradeKey]) {
        return studentAnswers[manualGradeKey]; // 'CORRECT' or 'WRONG'
    }

    const ans = studentAnswers[q.id];
    if (!ans) return 'EMPTY';

    const studentAns = normalize(String(ans), q.questionType);
    const correctAns = normalize(String(q.correctAnswer || ''), q.questionType);

    if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
        return studentAns === correctAns ? 'CORRECT' : 'WRONG';
    } 
    else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
        const sSet = new Set(parseList(String(ans)).map(a => normalize(a, q.questionType)));
        const cSet = new Set(parseList(String(q.correctAnswer || '')).map(a => normalize(a, q.questionType)));
        if (sSet.size === cSet.size && [...sSet].every(x => cSet.has(x))) return 'CORRECT';
        return 'WRONG';
    }
    else if (q.questionType === 'TRUE_FALSE') {
         try {
            const ansObj = JSON.parse(ans);
            const allCorrect = q.trueFalseRows?.every((row, idx) => {
                if (ansObj[idx] === undefined) return false;
                return ansObj[idx] === row.answer;
            });
            return allCorrect ? 'CORRECT' : 'WRONG';
        } catch { return 'WRONG'; }
    }
    else if (q.questionType === 'MATCHING') {
        try {
            const ansObj = JSON.parse(ans);
            const allCorrect = q.matchingPairs?.every((pair, idx) => {
                if (ansObj[idx] === undefined) return false;
                return normalize(ansObj[idx], q.questionType) === normalize(pair.right, q.questionType);
            });
            return allCorrect ? 'CORRECT' : 'WRONG';
        } catch { return 'WRONG'; }
    }

    return 'WRONG'; 
};

const getCalculatedStats = (r: Result, exam: Exam) => {
    let correct = 0;
    let empty = 0;
    let totalScore = 0;
    let maxPossibleScore = 0;
    const scorableQuestions = exam.questions.filter(q => q.questionType !== 'INFO');
    
    scorableQuestions.forEach(q => {
        const weight = q.scoreWeight || 1;
        maxPossibleScore += weight;

        const status = checkAnswerStatus(q, r.answers);
        if (status === 'CORRECT') {
            correct++;
            totalScore += weight;
        }
        else if (status === 'EMPTY') {
            empty++;
        }
    });

    const total = scorableQuestions.length;
    const wrong = total - correct - empty;
    const score = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
    
    return { correct, wrong, empty, score };
};

interface ArchiveMetadata {
    school?: string;
    subject?: string;
    classLevel?: string;
    examType?: string;
    targetClasses?: string[];
    date?: string | number;
    participantCount?: number;
}

export const ArchiveViewer: React.FC<ArchiveViewerProps> = ({ onReuseExam }) => {
    const [archiveData, setArchiveData] = useState<ArchiveData | null>(null);
    const [error, setError] = useState<string>('');
    const [fixMessage, setFixMessage] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState<ArchiveTab>('DETAIL');
    const [selectedClass, setSelectedClass] = useState<string>('ALL');
    const [selectedSchool, setSelectedSchool] = useState<string>('ALL');
    const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
    const [cloudArchives, setCloudArchives] = useState<{name: string, created_at: string, size: number, metadata?: ArchiveMetadata}[]>([]);
    const [isLoadingCloud, setIsLoadingCloud] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('Mengunduh dari Cloud...');
    const [sourceType, setSourceType] = useState<'LOCAL' | 'CLOUD' | null>(null);
    const [isRegisteringStats, setIsRegisteringStats] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [showEditMetadata, setShowEditMetadata] = useState(false);

    useEffect(() => {
        const loadCloudList = async () => {
            try {
                const list = await storageService.getArchivedList();
                setCloudArchives(list as {name: string, created_at: string, size: number, metadata?: ArchiveMetadata}[]);
            } catch {
                console.warn("Cloud archives list unavailable");
            }
        };
        loadCloudList();
        storageService.getCurrentUser().then(u => setUserRole(u?.accountType || null));
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

    const fixArchiveDataSorting = (data: ArchiveData): ArchiveData => {
        const fixedResults = data.results.map(r => {
            const newAnswers = { ...r.answers };
            let changed = false;
            
            Object.keys(newAnswers).forEach(qId => {
                const q = data.exam.questions.find(q => q.id === qId);
                if (q) {
                    if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
                        try {
                            const parsed = JSON.parse(newAnswers[qId]);
                            if (Array.isArray(parsed)) {
                                const originalStr = newAnswers[qId];
                                parsed.sort((a, b) => (q.options || []).indexOf(a) - (q.options || []).indexOf(b));
                                const newStr = JSON.stringify(parsed);
                                if (originalStr !== newStr) {
                                    newAnswers[qId] = newStr;
                                    changed = true;
                                }
                            }
                        } catch { /* ignore */ }
                    } else if (q.questionType === 'TRUE_FALSE' || q.questionType === 'MATCHING') {
                        try {
                            const parsed = JSON.parse(newAnswers[qId]);
                            if (typeof parsed === 'object' && !Array.isArray(parsed)) {
                                const originalStr = newAnswers[qId];
                                const sortedObj: Record<number, any> = {};
                                Object.keys(parsed).map(Number).sort((a, b) => a - b).forEach(k => sortedObj[k] = parsed[k]);
                                const newStr = JSON.stringify(sortedObj);
                                if (originalStr !== newStr) {
                                    newAnswers[qId] = newStr;
                                    changed = true;
                                }
                            }
                        } catch { /* ignore */ }
                    }
                }
            });
            
            if (changed) {
                return { ...r, answers: newAnswers };
            }
            return r;
        });
        
        return { ...data, results: fixedResults };
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
                        setArchiveData(fixArchiveDataSorting(data));
                        setActiveTab('DETAIL');
                        setSourceType('LOCAL');
                        setSelectedClass('ALL');
                    } else {
                        setError('File JSON tidak valid atau bukan format arsip lengkap.');
                    }
                }
            } catch {
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
            const data = await storageService.downloadArchive(filename) as ArchiveData | null;
            if (data && data.exam && data.exam.questions) {
                setArchiveData(fixArchiveDataSorting(data));
                setActiveTab('DETAIL');
                setSourceType('CLOUD');
                setSelectedClass('ALL');
            } else {
                setError("Data arsip cloud rusak.");
            }
        } catch {
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
            setCloudArchives(list as {name: string, created_at: string, size: number, metadata?: ArchiveMetadata}[]);
            
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

    const handleUploadToCloud = async (dataToUpload?: ArchiveData) => {
        const currentData = dataToUpload || archiveData;
        if (!currentData) return;
        
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
            const optimizedExam = JSON.parse(JSON.stringify(currentData.exam)) as Exam;
            
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
            const finalPayload = { ...currentData, exam: optimizedExam };
            const jsonString = JSON.stringify(finalPayload, null, 2);
            await storageService.uploadArchive(optimizedExam.code, jsonString, {
                school: optimizedExam.authorSchool,
                subject: optimizedExam.config.subject,
                classLevel: optimizedExam.config.classLevel,
                examType: optimizedExam.config.examType,
                targetClasses: optimizedExam.config.targetClasses,
                date: optimizedExam.config.date,
                participantCount: currentData.results.length
            });
            
            // Refresh list
            const list = await storageService.getArchivedList();
            setCloudArchives(list as {name: string, created_at: string, size: number, metadata?: ArchiveMetadata}[]);
            
            setSourceType('CLOUD'); // Switch mode to cloud
            setArchiveData(fixArchiveDataSorting(finalPayload)); // Update view with optimized data
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
        } catch (e) {
            console.error(e);
            alert(e instanceof Error ? e.message : "Gagal mencatat statistik.");
        } finally {
            setIsRegisteringStats(false);
        }
    };

    const resetView = () => {
        setArchiveData(null); setError(''); setFixMessage(''); setSourceType(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        storageService.getArchivedList().then(setCloudArchives).catch(()=>{});
    };

    const handleDownloadExcel = () => {
        if (!archiveData) return;
        const { exam, results } = archiveData;

        // 1. Detail Ujian Sheet
        const detailData = [
            ["DETAIL UJIAN"],
            ["Kode Ujian", exam.code],
            ["Mata Pelajaran", exam.config.subject],
            ["Tingkat Kelas", exam.config.classLevel],
            ["Tipe Ujian", exam.config.examType],
            ["Tanggal", exam.config.date],
            ["Durasi", exam.config.examMode === 'PR' ? 'Tanpa Batas' : (exam.config.timeLimit > 0 ? `${exam.config.timeLimit} Menit` : 'Tanpa Batas')],
            ["Pembuat", exam.authorName],
            ["Sekolah", exam.authorSchool],
            ["Status", exam.status],
            [""],
            ["DAFTAR SOAL"],
            ["No", "Tipe", "Pertanyaan", "Opsi Jawaban", "Kunci Jawaban", "Bobot", "Kategori", "Level"]
        ];

        exam.questions.forEach((q, idx) => {
            if (q.questionType === 'INFO') return;
            
            let optionsStr = "-";
            if (q.options) {
                optionsStr = q.options.map((o, i) => `${String.fromCharCode(65+i)}. ${o.replace(/<[^>]*>/g, '')}`).join("\n");
            } else if (q.trueFalseRows) {
                optionsStr = q.trueFalseRows.map(r => `${r.text.replace(/<[^>]*>/g, '')} (${r.answer ? 'Benar' : 'Salah'})`).join("\n");
            } else if (q.matchingPairs) {
                optionsStr = q.matchingPairs.map(p => `${p.left} -> ${p.right}`).join("\n");
            }

            let answerStr = "-";
            if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
                answerStr = parseList(q.correctAnswer || '').map(s => s.replace(/<[^>]*>/g, '')).join(", ");
            } else if (q.correctAnswer) {
                if (Array.isArray(q.correctAnswer)) {
                    answerStr = q.correctAnswer.join(", ");
                } else {
                    answerStr = String(q.correctAnswer).replace(/<[^>]*>/g, '');
                }
            }

            detailData.push([
                String(idx + 1),
                q.questionType,
                q.questionText.replace(/<[^>]*>/g, ''),
                optionsStr,
                answerStr,
                String(q.scoreWeight || 1),
                q.category || "-",
                q.level || "-"
            ]);
        });

        // 2. Rekap Siswa Sheet
        const rekapHeader = ["No", "Nama Siswa", "NISN/ID", "Kelas", "Asal Sekolah", "Nilai Akhir", "Benar", "Salah", "Kosong", "Status", "Waktu Mulai", "Waktu Selesai", "Durasi (Detik)"];
        
        // Add question columns
        const scorableQuestions = exam.questions.filter(q => q.questionType !== 'INFO');
        scorableQuestions.forEach((_, i) => rekapHeader.push(`Q${i+1}`));

        const rekapData = [rekapHeader];
        
        // Sort results same as UI
        const sorted = [...results].sort((a, b) => {
            const classA = a.student.class || '';
            const classB = b.student.class || '';
            const c = classA.localeCompare(classB, undefined, { numeric: true, sensitivity: 'base' });
            if (c !== 0) return c;
            const getAbs = (id: string) => {
                const parts = id.split('-');
                return parseInt(parts[parts.length-1]) || 0;
            }
            return getAbs(a.student.studentId) - getAbs(b.student.studentId);
        });

        sorted.forEach((r, idx) => {
            const stats = getCalculatedStats(r, exam);
            
            // Logic for Start/End Time
            let startTimeStr = "-";
            let endTimeStr = "-";
            
            // Construct Scheduled Times
            const dateStr = exam.config.startDate || exam.config.date;
            const scheduledStart = dateStr.includes('T') && dateStr.length > 10 ? new Date(dateStr) : new Date(`${dateStr}T${exam.config.startTime || '00:00'}`);
            let scheduledEnd: Date;
            const endDateStr = exam.config.endDate;
            
            if (exam.config.examMode === 'PR') {
                if (endDateStr) {
                    scheduledEnd = new Date(`${endDateStr}T23:59:59`);
                } else {
                    const fallbackDate = new Date(exam.config.date || new Date());
                    const localDateStr = fallbackDate.toLocaleDateString('en-CA');
                    scheduledEnd = new Date(`${localDateStr}T23:59:59`);
                }
            } else {
                if (endDateStr) {
                    scheduledEnd = new Date(`${endDateStr}T23:59:59`);
                } else {
                    if (exam.config.timeLimit > 0) {
                        scheduledEnd = new Date(scheduledStart.getTime() + exam.config.timeLimit * 60000);
                    } else {
                        const localDateStr = scheduledStart.toLocaleDateString('en-CA');
                        scheduledEnd = new Date(`${localDateStr}T23:59:59`);
                    }
                }
            }

            if (r.status === 'force_closed') {
                // Lupa Absen / Force Closed -> Use Scheduled Times
                startTimeStr = scheduledStart.toLocaleString('id-ID');
                endTimeStr = scheduledEnd.toLocaleString('id-ID');
            } else {
                // Normal -> Use Actual Times with Clamping
                if (r.timestamp) {
                    let finalEndTime = r.timestamp;
                    // Clamp End Time (Max = Scheduled End + 10 mins grace)
                    const maxEndTime = scheduledEnd.getTime() + 10 * 60000;
                    if (finalEndTime > maxEndTime) finalEndTime = scheduledEnd.getTime();

                    const endTime = new Date(finalEndTime);
                    endTimeStr = endTime.toLocaleString('id-ID');
                    
                    // Infer Start Time from Duration
                    if (r.completionTime) {
                        let finalStartTime = finalEndTime - (r.completionTime * 1000);
                        // Clamp Start Time (Min = Scheduled Start - 30 mins early allowed)
                        const minStartTime = scheduledStart.getTime() - 30 * 60000;
                        if (finalStartTime < minStartTime) finalStartTime = scheduledStart.getTime();

                        const startTime = new Date(finalStartTime);
                        startTimeStr = startTime.toLocaleString('id-ID');
                    } else {
                        // Fallback if no duration: Use Scheduled Start
                        startTimeStr = scheduledStart.toLocaleString('id-ID');
                    }
                }
            }

            const row = [
                String(idx + 1),
                r.student.fullName,
                r.student.studentId,
                r.student.class,
                r.student.schoolName || "-",
                String(stats.score),
                String(stats.correct),
                String(stats.wrong),
                String(stats.empty),
                r.status || "-",
                startTimeStr,
                endTimeStr,
                r.completionTime ? String(r.completionTime) : "-"
            ];

            // Add answers
            scorableQuestions.forEach(q => {
                const ans = r.answers[q.id];
                let ansStr = "-";
                if (ans) {
                    ansStr = String(ans).replace(/<[^>]*>/g, '');
                }
                row.push(ansStr);
            });

            rekapData.push(row);
        });

        // 3. Analisis Soal Sheet
        const analisisSoalHeader = ["No", "Pertanyaan", "Tipe", "Tingkat Kesulitan (%)", "Jml Benar", "Jml Salah/Kosong", "Distribusi Jawaban"];
        const analisisSoalData = [analisisSoalHeader];

        scorableQuestions.forEach((q, idx) => {
            let correctCount = 0;
            const answerCounts: Record<string, number> = {};
            
            results.forEach(r => {
                const ans = r.answers[q.id];
                const status = checkAnswerStatus(q, r.answers);
                if (status === 'CORRECT') correctCount++;
                if (ans) {
                    const val = String(ans).replace(/<[^>]*>/g, '');
                    answerCounts[val] = (answerCounts[val] || 0) + 1;
                }
            });

            const total = results.length;
            const correctRate = total > 0 ? Math.round((correctCount / total) * 100) : 0;
            
            let distStr = "";
            if (q.questionType === 'MULTIPLE_CHOICE' && q.options) {
                distStr = q.options.map(opt => {
                    const cleanOpt = opt.replace(/<[^>]*>/g, '');
                    const count = answerCounts[cleanOpt] || 0;
                    return `${cleanOpt}: ${count}`;
                }).join(", ");
            } else {
                distStr = JSON.stringify(answerCounts);
            }

            analisisSoalData.push([
                String(idx + 1),
                q.questionText.replace(/<[^>]*>/g, ''),
                q.questionType,
                String(correctRate),
                String(correctCount),
                String(total - correctCount),
                distStr
            ]);
        });

        // 4. Analisis Kelas Sheet
        const analisisKelasHeader = ["Kelas", "Jumlah Siswa", "Rata-rata Nilai", "Nilai Tertinggi", "Nilai Terendah", "Lulus (>=75)", "Tidak Lulus (<75)"];
        const analisisKelasData = [analisisKelasHeader];

        const classes = Array.from(new Set(results.map(r => r.student.class))).sort();
        classes.forEach(cls => {
            const classResults = results.filter(r => r.student.class === cls);
            const count = classResults.length;
            const scores = classResults.map(r => getCalculatedStats(r, exam).score);
            const avg = count > 0 ? Math.round(scores.reduce((a,b) => a+b, 0) / count) : 0;
            const max = count > 0 ? Math.max(...scores) : 0;
            const min = count > 0 ? Math.min(...scores) : 0;
            const pass = scores.filter(s => s >= 75).length;
            const fail = count - pass;

            analisisKelasData.push([
                cls,
                String(count),
                String(avg),
                String(max),
                String(min),
                String(pass),
                String(fail)
            ]);
        });

        // Create Workbook
        const wb = XLSX.utils.book_new();
        
        const wsDetail = XLSX.utils.aoa_to_sheet(detailData);
        XLSX.utils.book_append_sheet(wb, wsDetail, "Detail Ujian");

        const wsRekap = XLSX.utils.aoa_to_sheet(rekapData);
        XLSX.utils.book_append_sheet(wb, wsRekap, "Rekap Siswa");

        const wsAnalisisSoal = XLSX.utils.aoa_to_sheet(analisisSoalData);
        XLSX.utils.book_append_sheet(wb, wsAnalisisSoal, "Analisis Soal");

        const wsAnalisisKelas = XLSX.utils.aoa_to_sheet(analisisKelasData);
        XLSX.utils.book_append_sheet(wb, wsAnalisisKelas, "Analisis Kelas");

        // Download
        XLSX.writeFile(wb, `Data_Mentah_${exam.config.subject}_${exam.code}.xlsx`);
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
            
            // ENRICHMENT: Ensure data matches latest Cloud JSON format
            const enrichedExam: Exam = {
                ...archiveData.exam,
                authorName: archiveData.exam.authorName || 'Unknown',
                authorSchool: archiveData.exam.authorSchool || 'Unknown School',
                createdAt: archiveData.exam.createdAt || new Date().toISOString(),
                status: archiveData.exam.status || 'PUBLISHED',
                config: {
                    ...archiveData.exam.config,
                    disableRealtime: archiveData.exam.config.disableRealtime ?? false,
                    trackLocation: archiveData.exam.config.trackLocation ?? false,
                    collaborators: archiveData.exam.config.collaborators || []
                }
            };

            const enrichedResults: Result[] = fixedResults.map(r => ({
                ...r,
                examCode: r.examCode || enrichedExam.code,
                timestamp: r.timestamp || Date.now(),
                status: r.status || 'completed',
                isSynced: r.isSynced ?? true
            }));

            const fixedArchive = { 
                ...archiveData, 
                exam: enrichedExam, 
                results: enrichedResults,
                version: "2.0",
                repairedAt: new Date().toISOString()
            };

            setArchiveData(fixArchiveDataSorting(fixedArchive));

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
    }, [archiveData]);

    // SORTING LOGIC: Sort by School, then Class, then by Absent Number (from ID)
    const sortedResults = useMemo(() => {
        if (!archiveData) return [];
        return [...archiveData.results].sort((a, b) => {
            // 1. Nama Sekolah
            const schoolA = a.student.schoolName || '';
            const schoolB = b.student.schoolName || '';
            const schoolCompare = schoolA.localeCompare(schoolB, undefined, { sensitivity: 'base' });
            if (schoolCompare !== 0) return schoolCompare;

            // 2. Kelas
            const classA = a.student.class || '';
            const classB = b.student.class || '';
            const c = classA.localeCompare(classB, undefined, { numeric: true, sensitivity: 'base' });
            if (c !== 0) return c;

            // 3. Nomor Absen
            const absA = parseInt(a.student.absentNumber) || 0;
            const absB = parseInt(b.student.absentNumber) || 0;
            return absA - absB;
        });
    }, [archiveData]);

    const uniqueSchools = useMemo(() => {
        if (!archiveData) return [];
        const schools = new Set(archiveData.results.map(r => r.student.schoolName || 'Tanpa Sekolah'));
        return Array.from(schools).sort();
    }, [archiveData]);

    const uniqueClasses = useMemo(() => {
        if (!archiveData) return [];
        let results = archiveData.results;
        if (selectedSchool !== 'ALL') {
            results = results.filter(r => (r.student.schoolName || 'Tanpa Sekolah') === selectedSchool);
        }
        const classes = new Set(results.map(r => r.student.class));
        return Array.from(classes).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    }, [archiveData, selectedSchool]);

    const filteredResults = useMemo(() => {
        let results = sortedResults;
        if (selectedSchool !== 'ALL') {
            results = results.filter(r => (r.student.schoolName || 'Tanpa Sekolah') === selectedSchool);
        }
        if (selectedClass !== 'ALL') {
            results = results.filter(r => r.student.class === selectedClass);
        }
        return results;
    }, [sortedResults, selectedSchool, selectedClass]);

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

    const classAnalysisData = useMemo(() => {
        if (!archiveData) return [];
        let results = archiveData.results;
        if (selectedSchool !== 'ALL') {
            results = results.filter(r => (r.student.schoolName || 'Tanpa Sekolah') === selectedSchool);
        }
        return analyzeClassPerformance(archiveData.exam, results);
    }, [archiveData, selectedSchool]);

    const questionTypeStats = useMemo(() => {
        if (!archiveData) return [];
        return analyzeQuestionTypePerformance(archiveData.exam, archiveData.results);
    }, [archiveData]);

    const generalRecommendation = useMemo(() => {
        if (!archiveData) return '';
        
        // Prioritaskan rekomendasi berdasarkan kategori yang lemah (Merah < 50%, Oranye < 80%)
        const redCats = categoryStats.filter(c => c.percentage < 50).map(c => c.name);
        const orangeCats = categoryStats.filter(c => c.percentage >= 50 && c.percentage < 80).map(c => c.name);

        if (redCats.length > 0) {
            return `PERLU INTERVENSI KHUSUS: Ditemukan penguasaan rendah (<50%) pada materi "${redCats.join(', ')}". Disarankan REMEDIAL KLASIKAL atau pengajaran ulang konsep dasar pada topik tersebut sebelum melanjutkan pembelajaran.`;
        }

        if (orangeCats.length > 0) {
            return `PERLU PENGUATAN: Materi "${orangeCats.join(', ')}" belum tuntas sepenuhnya (50-79%). Disarankan memberikan latihan tambahan, review singkat, atau diskusi kelompok agar pemahaman siswa meningkat menjadi kategori Hijau.`;
        }

        // Jika semua kategori Hijau (>= 80%)
        const { results } = archiveData;
        const totalStudents = results.length;
        const averageScore = totalStudents > 0 ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / totalStudents) : 0;

        return `HASIL ISTIMEWA (Rata-rata ${averageScore}%). Seluruh kompetensi dasar telah dikuasai dengan baik. Siswa siap diberikan materi PENGAYAAN atau tantangan soal tingkat lanjut (HOTS).`;
    }, [archiveData, categoryStats]);

    if (!archiveData) {
        return (
            <div className="w-full max-w-full mx-auto space-y-8 animate-fade-in">
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
                                            
                                            {file.metadata ? (() => {
                                                const meta = file.metadata as ArchiveMetadata;
                                                return (
                                                <div className="mt-2 space-y-1 text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-2">
                                                    {userRole === 'super_admin' && (
                                                        <div className="grid grid-cols-3 gap-1">
                                                            <span className="font-bold text-slate-400">Sekolah</span>
                                                            <span className="col-span-2 font-medium text-slate-700 dark:text-slate-300 truncate">: {meta.school || '-'}</span>
                                                        </div>
                                                    )}
                                                    <div className="grid grid-cols-3 gap-1">
                                                        <span className="font-bold text-slate-400">Mapel/Kelas</span>
                                                        <span className="col-span-2 font-medium text-slate-700 dark:text-slate-300 truncate">: {meta.subject} ({meta.classLevel})</span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-1">
                                                        <span className="font-bold text-slate-400">Evaluasi</span>
                                                        <span className="col-span-2 font-medium text-slate-700 dark:text-slate-300 truncate">: {meta.examType}</span>
                                                    </div>
                                                    {meta.targetClasses && meta.targetClasses.length > 0 && (
                                                        <div className="grid grid-cols-3 gap-1">
                                                            <span className="font-bold text-slate-400">Target</span>
                                                            <span className="col-span-2 font-medium text-slate-700 dark:text-slate-300 truncate">: {meta.targetClasses.join(', ')}</span>
                                                        </div>
                                                    )}
                                                    <div className="grid grid-cols-3 gap-1">
                                                        <span className="font-bold text-slate-400">Tanggal</span>
                                                        <span className="col-span-2 font-medium text-slate-700 dark:text-slate-300 truncate">: {meta.date ? new Date(meta.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-1">
                                                        <span className="font-bold text-slate-400">Partisipan</span>
                                                        <span className="col-span-2 font-medium text-slate-700 dark:text-slate-300 truncate">: {meta.participantCount ? `${meta.participantCount} Siswa` : '-'}</span>
                                                    </div>
                                                    <div className="text-[9px] text-right text-slate-300 mt-1">
                                                        {(file.size / 1024).toFixed(1)} KB
                                                    </div>
                                                </div>
                                                );
                                            })() : (
                                                <div className="mt-2 space-y-1 text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-2">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border border-slate-200 dark:border-slate-600">Arsip Lama</span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-1">
                                                        <span className="font-bold text-slate-400">Tanggal</span>
                                                        <span className="col-span-2 font-medium text-slate-700 dark:text-slate-300 truncate">: {new Date(file.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-1">
                                                        <span className="font-bold text-slate-400">Ukuran</span>
                                                        <span className="col-span-2 font-medium text-slate-700 dark:text-slate-300 truncate">: {(file.size / 1024).toFixed(1)} KB</span>
                                                    </div>
                                                    <div className="text-[9px] text-slate-400 italic mt-1">
                                                        Detail lengkap tidak tersedia di pratinjau.
                                                    </div>
                                                </div>
                                            )}
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
    const totalStudents = exam.config.manualParticipantCount || results.length;
    const realStudentCount = results.length;
    const averageScore = realStudentCount > 0 ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / realStudentCount) : 0;
    const highestScore = realStudentCount > 0 ? Math.max(...results.map(r => r.score)) : 0;
    const lowestScore = realStudentCount > 0 ? Math.min(...results.map(r => r.score)) : 0;

    return (
        <div className="w-full max-w-full mx-auto space-y-6">
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
                    table { width: 100% !important; border-collapse: collapse !important; font-size: 9pt !important; }
                    th, td { border: 1px solid #94a3b8 !important; padding: 3px 5px !important; color: #0f172a !important; }
                    thead th { background-color: #f8fafc !important; font-weight: bold !important; -webkit-print-color-adjust: exact !important; }
                    .print-question-text, .print-question-text * { font-size: 9pt !important; line-height: 1.4 !important; color: #0f172a !important; background-color: transparent !important; }
                    .print-question-text img { max-width: 100% !important; height: auto !important; }
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
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                Pratinjau Arsip: <span className="text-indigo-600 dark:text-indigo-400">{exam.config.subject}</span>
                                <button onClick={() => setShowEditMetadata(true)} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors" title="Edit Info">
                                    <PencilIcon className="w-5 h-5"/>
                                </button>
                            </h2>
                            {sourceType === 'LOCAL' && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-bold uppercase border border-gray-200">Local File</span>}
                            {sourceType === 'CLOUD' && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase border border-blue-100">Cloud Storage</span>}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-mono">{exam.code} • {exam.createdAt ? `Diarsipkan pada ${exam.createdAt}` : 'Tanggal tidak diketahui'}{exam.authorSchool ? ` • ${exam.authorSchool}` : ''}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto xl:justify-end">
                        <button onClick={resetView} className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all">Muat Lain</button>
                        
                        {sourceType === 'LOCAL' && (
                            <>
                                <button onClick={handleRegisterStats} disabled={isRegisteringStats} className="flex-1 sm:flex-none px-4 py-2 bg-amber-500 text-white text-xs font-bold uppercase rounded-lg hover:bg-amber-600 transition-all shadow-md shadow-amber-100 dark:shadow-amber-900/30 flex items-center justify-center gap-2">
                                    {isRegisteringStats ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <ChartBarIcon className="w-4 h-4"/>}
                                    <span>Catat Statistik</span>
                                </button>

                                <button onClick={() => handleUploadToCloud()} disabled={isLoadingCloud} className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 text-white text-xs font-bold uppercase rounded-lg hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 dark:shadow-emerald-900/30 flex items-center justify-center gap-2">
                                    {isLoadingCloud ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <CloudArrowUpIcon className="w-4 h-4"/>}
                                    <span>Simpan ke Cloud</span>
                                </button>
                            </>
                        )}

                        <button onClick={handlePrint} className="flex-1 sm:flex-none px-4 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white transition-all border border-slate-200 dark:border-slate-600 flex items-center justify-center gap-2 shadow-sm"><PrinterIcon className="w-4 h-4"/> Print Arsip</button>
                        <button onClick={handleDownloadExcel} className="flex-1 sm:flex-none px-4 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white transition-all border border-slate-200 dark:border-slate-600 flex items-center justify-center gap-2 shadow-sm"><TableCellsIcon className="w-4 h-4"/> Excel Data</button>
                        <button onClick={() => onReuseExam(exam)} className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 dark:bg-indigo-600 text-white text-xs font-bold uppercase rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 dark:shadow-indigo-900/30 flex items-center gap-2"><DocumentDuplicateIcon className="w-4 h-4"/> Gunakan Ulang</button>
                    </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex gap-4">
                    {(['DETAIL', 'STUDENTS', 'ANALYSIS', 'CLASS_ANALYSIS'] as ArchiveTab[]).map(tab => {
                        const label = tab === 'DETAIL' ? 'Detail Ujian' : tab === 'STUDENTS' ? `Rekap Siswa (${totalStudents})` : tab === 'ANALYSIS' ? 'Analisis Soal' : 'Analisis Kelas';
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
                                            {/* Metadata Badge */}
                                            {(q.category || q.level || q.scoreWeight) && (
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {q.category && <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 uppercase tracking-wide">Kategori: {q.category}</span>}
                                                    {q.level && <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800 uppercase tracking-wide">Level: {q.level}</span>}
                                                    <span className="text-[10px] font-bold bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded border border-purple-100 dark:border-purple-800 uppercase tracking-wide">Bobot: {q.scoreWeight || 1}</span>
                                                </div>
                                            )}
                                            
                                            <div className="prose prose-sm max-w-none text-slate-700 dark:text-slate-200" dangerouslySetInnerHTML={{ __html: q.questionText }}></div>
                                            {q.questionType === 'MULTIPLE_CHOICE' && q.options && q.options.map((opt, i) => <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${normalize(q.correctAnswer || '', q.questionType) === normalize(opt, q.questionType) ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 font-bold text-emerald-800 dark:text-emerald-300' : 'bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}><span className="font-bold">{String.fromCharCode(65 + i)}.</span><div className="flex-1" dangerouslySetInnerHTML={{ __html: opt }}></div>{normalize(q.correctAnswer || '', q.questionType) === normalize(opt, q.questionType) && <CheckCircleIcon className="w-5 h-5 text-emerald-500 ml-auto shrink-0"/>}</div>)}
                                            {q.questionType === 'COMPLEX_MULTIPLE_CHOICE' && q.options && q.options.map((opt, i) => {
                                                const isSelected = parseList(q.correctAnswer || '').map(a => normalize(a, q.questionType)).includes(normalize(opt, q.questionType));
                                                return <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${isSelected ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 font-bold text-emerald-800 dark:text-emerald-300' : 'bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}><span className="font-bold">{String.fromCharCode(65 + i)}.</span><div className="flex-1" dangerouslySetInnerHTML={{ __html: opt }}></div>{isSelected && <CheckCircleIcon className="w-5 h-5 text-emerald-500 ml-auto shrink-0"/>}</div>
                                            })}
                                            {q.questionType === 'TRUE_FALSE' && q.trueFalseRows && <div className="border border-slate-200 dark:border-slate-600 rounded-lg overflow-x-auto custom-scrollbar"><table className="w-full text-sm min-w-[500px]"><thead className="bg-slate-50 dark:bg-slate-700"><tr><th className="p-2 font-bold text-slate-600 dark:text-slate-300 text-left">Pernyataan</th><th className="p-2 font-bold text-slate-600 dark:text-slate-300 text-center w-32">Jawaban</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700">{q.trueFalseRows.map((r, i) => <tr key={i} className="border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800"><td className="p-2 dark:text-slate-200"><div className="[&_*]:!bg-transparent [&_*]:!text-inherit [&_*]:!p-0 [&_*]:!m-0" dangerouslySetInnerHTML={{ __html: r.text }}></div></td><td className={`p-2 text-center font-bold ${r.answer ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20':'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20'}`}>{r.answer ? 'Benar':'Salah'}</td></tr>)}</tbody></table></div>}
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
                        {(uniqueSchools.length > 1 || uniqueClasses.length > 1) && (
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 dark:bg-slate-700/30">
                                <div className="flex flex-wrap items-center gap-4">
                                    {uniqueSchools.length > 1 && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-500 uppercase">Sekolah:</span>
                                            <select 
                                                value={selectedSchool} 
                                                onChange={(e) => { setSelectedSchool(e.target.value); setSelectedClass('ALL'); }}
                                                className="text-xs font-bold p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                            >
                                                <option value="ALL">Semua Sekolah ({archiveData.results.length})</option>
                                                {uniqueSchools.map(s => (
                                                    <option key={s} value={s}>{s} ({archiveData.results.filter(r => (r.student.schoolName || 'Tanpa Sekolah') === s).length})</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    {uniqueClasses.length > 1 && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-500 uppercase">Kelas:</span>
                                            <select 
                                                value={selectedClass} 
                                                onChange={(e) => setSelectedClass(e.target.value)}
                                                className="text-xs font-bold p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                            >
                                                <option value="ALL">Semua Kelas ({sortedResults.filter(r => selectedSchool === 'ALL' || (r.student.schoolName || 'Tanpa Sekolah') === selectedSchool).length})</option>
                                                {uniqueClasses.map(c => (
                                                    <option key={c} value={c}>{c} ({sortedResults.filter(r => r.student.class === c && (selectedSchool === 'ALL' || (r.student.schoolName || 'Tanpa Sekolah') === selectedSchool)).length})</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                                <div className="text-xs font-bold text-slate-400">
                                    Menampilkan {filteredResults.length} Siswa
                                </div>
                            </div>
                        )}
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left min-w-[800px]">
                                <thead className="bg-slate-50/50 dark:bg-slate-700/50">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Siswa</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Sekolah / Kelas</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Nilai</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">B/S/K</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Aktivitas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                {uniqueSchools.map(school => {
                                    const schoolResults = filteredResults.filter(r => (r.student.schoolName || 'Tanpa Sekolah') === school);
                                    if (schoolResults.length === 0) return null;
                                    
                                    return (
                                        <React.Fragment key={school}>
                                            {selectedSchool === 'ALL' && (
                                                <tr className="bg-slate-50/80 dark:bg-slate-700/50">
                                                    <td colSpan={5} className="px-6 py-2 text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest border-y border-slate-100 dark:border-slate-700">
                                                        Sekolah: {school} ({schoolResults.length} Siswa)
                                                    </td>
                                                </tr>
                                            )}
                                            {schoolResults.map(r => {
                                                const { correct, wrong, empty, score } = getCalculatedStats(r, exam);
                                                return (
                                                <React.Fragment key={r.student.studentId}>
                                                    <tr onClick={() => toggleStudent(r.student.studentId)} className="hover:bg-slate-50/30 dark:hover:bg-slate-700/30 cursor-pointer group transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`transition-transform duration-300 text-slate-400 ${expandedStudent === r.student.studentId ? 'rotate-180 text-indigo-500' : ''}`}>
                                                                    {expandedStudent === r.student.studentId ? <ChevronUpIcon className="w-4 h-4"/> : <ChevronDownIcon className="w-4 h-4"/>}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <div className="font-bold text-slate-800 dark:text-slate-200 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{r.student.fullName}</div>
                                                                    {r.student.schoolName && <div className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">{r.student.schoolName}</div>}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{r.student.schoolName || 'Tanpa Sekolah'}</span>
                                                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Kelas {r.student.class}</span>
                                                            </div>
                                                        </td>
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
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                         </table>
                        </div>
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
                        {(categoryStats.length > 0 || levelStats.length > 0 || questionTypeStats.length > 0) && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><ListBulletIcon className="w-4 h-4"/> Penguasaan Materi (Kategori)</h3>
                                    <div className="space-y-3">
                                        {categoryStats.length > 0 ? categoryStats.map(stat => (
                                            <div key={stat.name}>
                                                <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                                                    <span>{stat.name}</span><span className={stat.percentage < 50 ? 'text-rose-500' : stat.percentage < 80 ? 'text-amber-500' : 'text-emerald-600'}>{stat.percentage}%</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"><div className={`h-full transition-all duration-1000 ${stat.percentage >= 80 ? 'bg-emerald-500' : stat.percentage >= 50 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{width: `${stat.percentage}%`}}></div></div>
                                            </div>
                                        )) : <p className="text-xs text-slate-400 italic">Tidak ada data.</p>}
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><ChartBarIcon className="w-4 h-4"/> Tingkat Kesulitan (Level)</h3>
                                    <div className="space-y-3">
                                        {levelStats.length > 0 ? levelStats.map(stat => (
                                            <div key={stat.name}>
                                                <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                                                    <span>{stat.name}</span><span className={stat.percentage < 50 ? 'text-rose-500' : stat.percentage < 80 ? 'text-amber-500' : 'text-emerald-600'}>{stat.percentage}%</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"><div className={`h-full transition-all duration-1000 ${stat.percentage >= 80 ? 'bg-emerald-500' : stat.percentage >= 50 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{width: `${stat.percentage}%`}}></div></div>
                                            </div>
                                        )) : <p className="text-xs text-slate-400 italic">Tidak ada data.</p>}
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><TableCellsIcon className="w-4 h-4"/> Jenis Soal</h3>
                                    <div className="space-y-3">
                                        {questionTypeStats.length > 0 ? questionTypeStats.map(stat => (
                                            <div key={stat.type}>
                                                <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                                                    <span>{stat.typeName}</span><span className={stat.percentage < 50 ? 'text-rose-500' : stat.percentage < 80 ? 'text-amber-500' : 'text-emerald-600'}>{stat.percentage}%</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"><div className={`h-full transition-all duration-1000 ${stat.percentage >= 80 ? 'bg-emerald-500' : stat.percentage >= 50 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{width: `${stat.percentage}%`}}></div></div>
                                            </div>
                                        )) : <p className="text-xs text-slate-400 italic">Tidak ada data.</p>}
                                    </div>
                                </div>
                            </div>
                        )}
                        <div><h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><TableCellsIcon className="w-5 h-5 text-slate-400 dark:text-slate-500"/> Analisis Butir Soal</h3><div className="grid grid-cols-1 gap-4">{exam.questions.filter(q => q.questionType !== 'INFO').map((q, idx) => { const stats = questionStats.find(s => s.id === q.id) || { correctRate: 0 }; return <QuestionAnalysisItem key={q.id} q={q} index={idx} stats={stats} examResults={results} />; })}</div></div>
                    </div>
                )}
                {activeTab === 'CLASS_ANALYSIS' && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                                <ChartBarIcon className="w-5 h-5 text-indigo-500"/> Analisis Umum Per Kelas
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Ringkasan performa dan ketuntasan belajar siswa dikelompokkan berdasarkan kelas.
                            </p>
                        </div>
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left min-w-[800px]">
                                <thead className="bg-slate-50 dark:bg-slate-700">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase">Sekolah</th>
                                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase">Kelas</th>
                                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase text-center">Partisipan</th>
                                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase text-center">Rerata</th>
                                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase text-center">Min / Max</th>
                                        {archiveData.exam.config.kkm && <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase text-center">Ketuntasan (KKM {archiveData.exam.config.kkm})</th>}
                                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase">Detail Performa Soal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                    {uniqueSchools.map(school => {
                                        const schoolAnalysis = classAnalysisData.filter(c => c.schoolName === school);
                                        if (schoolAnalysis.length === 0) return null;
                                        
                                        return (
                                            <React.Fragment key={school}>
                                                {selectedSchool === 'ALL' && (
                                                    <tr className="bg-slate-50/80 dark:bg-slate-700/50">
                                                        <td colSpan={7} className="px-6 py-2 text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest border-y border-slate-100 dark:border-slate-700">
                                                            Sekolah: {school}
                                                        </td>
                                                    </tr>
                                                )}
                                                {schoolAnalysis.map((c, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{c.schoolName}</td>
                                                        <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{c.className}</td>
                                                        <td className="px-6 py-4 text-center text-sm text-slate-600 dark:text-slate-300">{c.studentCount} Siswa</td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`px-2 py-1 rounded font-bold text-xs ${c.averageScore >= 75 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                                                                {c.averageScore}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center text-xs font-mono text-slate-500 dark:text-slate-400">
                                                            {c.lowestScore} - {c.highestScore}
                                                        </td>
                                                        {archiveData.exam.config.kkm && (
                                                            <td className="px-6 py-4 text-center">
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <span className={`font-bold text-sm ${c.passRate >= 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                                        {c.passRate}%
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400">({c.passCount} Tuntas)</span>
                                                                </div>
                                                            </td>
                                                        )}
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-wrap gap-2">
                                                                {c.questionTypeStats.slice(0, 3).map((qt, i) => (
                                                                    <div key={i} className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 flex items-center gap-1" title={`${qt.typeName}: ${qt.percentage}% Benar`}>
                                                                        <span className="text-slate-500 dark:text-slate-400 uppercase font-bold">{qt.type.substring(0, 3)}</span>
                                                                        <span className={`font-bold ${qt.percentage >= 70 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{qt.percentage}%</span>
                                                                    </div>
                                                                ))}
                                                                {c.questionTypeStats.length > 3 && <span className="text-[10px] text-slate-400 self-center">+{c.questionTypeStats.length - 3} lainnya</span>}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
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

                    {/* School Summary Table */}
                    {uniqueSchools.length > 1 && (
                        <div className="mb-4">
                            <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">Ringkasan Per Sekolah</p>
                            <table className="w-full border-collapse border border-slate-300 text-[10px]">
                                <thead className="bg-slate-100">
                                    <tr>
                                        <th className="border border-slate-300 p-1 text-left">Nama Sekolah</th>
                                        <th className="border border-slate-300 p-1 text-center w-16">Siswa</th>
                                        <th className="border border-slate-300 p-1 text-center w-16">Rerata</th>
                                        <th className="border border-slate-300 p-1 text-center w-16">Max</th>
                                        <th className="border border-slate-300 p-1 text-center w-16">Min</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {uniqueSchools.map(school => {
                                        const schoolResults = archiveData.results.filter(r => (r.student.schoolName || 'Tanpa Sekolah') === school);
                                        if (schoolResults.length === 0) return null;
                                        const scores = schoolResults.map(r => getCalculatedStats(r, exam).score);
                                        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / schoolResults.length);
                                        const max = Math.max(...scores);
                                        const min = Math.min(...scores);
                                        return (
                                            <tr key={school}>
                                                <td className="border border-slate-300 p-1 font-bold">{school}</td>
                                                <td className="border border-slate-300 p-1 text-center">{schoolResults.length}</td>
                                                <td className="border border-slate-300 p-1 text-center font-bold">{avg}</td>
                                                <td className="border border-slate-300 p-1 text-center text-emerald-700">{max}</td>
                                                <td className="border border-slate-300 p-1 text-center text-rose-700">{min}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-4 mb-4">
                        {/* Kategori */}
                        <div>
                            <p className="text-[10px] font-bold uppercase mb-2 text-slate-500">Persentase Penguasaan Materi</p>
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
                        {/* Jenis Soal */}
                        <div>
                            <p className="text-[10px] font-bold uppercase mb-2 text-slate-500">Persentase Jenis Soal</p>
                            <table className="w-full border-collapse border border-slate-300 text-[10px]">
                                <thead className="bg-slate-100"><tr><th className="border p-1 text-left">Jenis</th><th className="border p-1 text-right w-16">Ketuntasan</th></tr></thead>
                                <tbody>
                                    {questionTypeStats.length > 0 ? questionTypeStats.map(s => {
                                        let bgClass = '';
                                        if (s.percentage >= 80) bgClass = 'print-bg-green';
                                        else if (s.percentage >= 50) bgClass = 'print-bg-orange';
                                        else bgClass = 'print-bg-red';

                                        return (
                                            <tr key={s.type}>
                                                <td className="border p-1">{s.typeName}</td>
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

                {/* 2. LAPORAN PER SEKOLAH & KELAS */}
                {uniqueSchools.map((schoolName, schoolIdx) => {
                    const schoolClasses = Array.from(new Set(
                        sortedResults
                            .filter(r => (r.student.schoolName || 'Tanpa Sekolah') === schoolName)
                            .map(r => r.student.class)
                    )).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

                    return (
                        <div key={schoolName}>
                            <div className="page-break"></div>
                            <div className="bg-slate-900 text-white p-4 mb-6 rounded-lg flex justify-between items-center">
                                <h2 className="text-xl font-black uppercase tracking-widest">SEKOLAH: {schoolName}</h2>
                                <span className="text-xs font-bold opacity-70">Bagian {schoolIdx + 2}</span>
                            </div>

                            {schoolClasses.map((className, classIdx) => {
                                const classResults = sortedResults.filter(r => 
                                    (r.student.schoolName || 'Tanpa Sekolah') === schoolName && 
                                    r.student.class === className
                                );
                                const classTotal = classResults.length;
                                const classScores = classResults.map(r => getCalculatedStats(r, exam).score);
                                const classAvg = classTotal > 0 ? Math.round(classScores.reduce((a, b) => a + b, 0) / classTotal) : 0;
                                const classMax = classTotal > 0 ? Math.max(...classScores) : 0;
                                const classMin = classTotal > 0 ? Math.min(...classScores) : 0;

                                return (
                                    <div key={`${schoolName}-${className}`} className="mb-12">
                                        <div className="mb-8 avoid-break">
                                            <h3 className="font-bold text-sm uppercase tracking-wider mb-3 border-l-4 border-slate-800 pl-2">
                                                {schoolIdx + 2}.{classIdx + 1}. Laporan Kelas {className}
                                            </h3>
                                            
                                            {/* A. ANALISIS KELAS */}
                                            <div className="mb-4 bg-white border border-slate-300 rounded p-4">
                                                <h4 className="font-bold text-xs uppercase mb-2 text-slate-600">A. Analisis Kelas {className} ({schoolName})</h4>
                                                
                                                {/* Stat Grid */}
                                                <div className="grid grid-cols-4 gap-4 text-center mb-6">
                                                    <div className="p-2 bg-slate-50 rounded border border-slate-200">
                                                        <span className="block text-slate-500 uppercase text-[9px] font-bold">Rata-rata</span>
                                                        <span className="font-black text-lg text-slate-800">{classAvg}</span>
                                                    </div>
                                                    <div className="p-2 bg-emerald-50 rounded border border-emerald-100">
                                                        <span className="block text-emerald-600 uppercase text-[9px] font-bold">Tertinggi</span>
                                                        <span className="font-black text-lg text-emerald-700">{classMax}</span>
                                                    </div>
                                                    <div className="p-2 bg-rose-50 rounded border border-rose-100">
                                                        <span className="block text-rose-600 uppercase text-[9px] font-bold">Terendah</span>
                                                        <span className="font-black text-lg text-rose-700">{classMin}</span>
                                                    </div>
                                                    <div className="p-2 bg-blue-50 rounded border border-blue-100">
                                                        <span className="block text-blue-600 uppercase text-[9px] font-bold">Partisipan</span>
                                                        <span className="font-black text-lg text-blue-700">{classTotal}</span>
                                                    </div>
                                                </div>

                                                {/* Detailed Stats Grid (Category, Level, Type) */}
                                                {(() => {
                                                    // Calculate stats specific to this class
                                                    const { categoryStats: classCatStats, levelStats: classLevelStats } = calculateAggregateStats(exam, classResults);
                                                    const classTypeStats = analyzeQuestionTypePerformance(exam, classResults);

                                                    return (
                                                        <div className="grid grid-cols-3 gap-4">
                                                            {/* Kategori */}
                                                            <div>
                                                                <p className="text-[10px] font-bold uppercase mb-2 text-slate-500">Persentase Penguasaan Materi</p>
                                                                <table className="w-full border-collapse border border-slate-300 text-[10px]">
                                                                    <thead className="bg-slate-100"><tr><th className="border p-1 text-left">Kategori</th><th className="border p-1 text-right w-16">Penguasaan</th></tr></thead>
                                                                    <tbody>
                                                                        {classCatStats.length > 0 ? classCatStats.map(s => {
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
                                                                        {classLevelStats.length > 0 ? classLevelStats.map(s => {
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
                                                            {/* Jenis Soal */}
                                                            <div>
                                                                <p className="text-[10px] font-bold uppercase mb-2 text-slate-500">Persentase Jenis Soal</p>
                                                                <table className="w-full border-collapse border border-slate-300 text-[10px]">
                                                                    <thead className="bg-slate-100"><tr><th className="border p-1 text-left">Jenis</th><th className="border p-1 text-right w-16">Ketuntasan</th></tr></thead>
                                                                    <tbody>
                                                                        {classTypeStats.length > 0 ? classTypeStats.map(s => {
                                                                            let bgClass = '';
                                                                            if (s.percentage >= 80) bgClass = 'print-bg-green';
                                                                            else if (s.percentage >= 50) bgClass = 'print-bg-orange';
                                                                            else bgClass = 'print-bg-red';

                                                                            return (
                                                                                <tr key={s.type}>
                                                                                    <td className="border p-1">{s.typeName}</td>
                                                                                    <td className={`border p-1 text-right font-bold ${bgClass}`}>{s.percentage}%</td>
                                                                                </tr>
                                                                            )
                                                                        }) : <tr><td colSpan={2} className="border p-1 italic text-center">Data tidak tersedia</td></tr>}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            {/* B. REKAPITULASI HASIL KELAS */}
                                            <div className="mb-4">
                                                <h4 className="font-bold text-xs uppercase mb-2 text-slate-600">B. Rekapitulasi Hasil Kelas {className}</h4>
                                                <div className="overflow-x-auto custom-scrollbar">
                                                    <table className="w-full border-collapse border border-slate-300 text-[9px] min-w-[600px]">
                                                        <thead>
                                                            <tr className="bg-slate-100">
                                                                <th className="border border-slate-300 p-1 text-center w-8">No</th>
                                                                <th className="border border-slate-300 p-1 text-left w-40 whitespace-nowrap">Nama Siswa</th>
                                                                <th className="border border-slate-300 p-1 text-left w-32 whitespace-nowrap">Asal Sekolah</th>
                                                                <th className="border border-slate-300 p-1 text-center w-10">Nilai</th>
                                                                <th className="border border-slate-300 p-1 text-left">Rincian Jawaban (Hijau: Benar, Merah: Salah, Abu: Kosong)</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {classResults.map((r, index) => {
                                                                const { score } = getCalculatedStats(r, exam);
                                                                return (
                                                                    <tr key={r.student.studentId} className="avoid-break">
                                                                        <td className="border border-slate-300 p-1 text-center">{index + 1}</td>
                                                                        <td className="border border-slate-300 p-1 font-bold whitespace-nowrap">{r.student.fullName}</td>
                                                                        <td className="border border-slate-300 p-1 whitespace-nowrap">{r.student.schoolName || '-'}</td>
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
                                            </div>

                                            {/* C. ANALISIS INDIVIDU KELAS */}
                                            <div className="mb-4">
                                                <h4 className="font-bold text-xs uppercase mb-2 text-slate-600">C. Analisis Individu Kelas {className}</h4>
                                                <div className="overflow-x-auto custom-scrollbar">
                                                    <table className="w-full border-collapse border border-slate-300 text-[9px] min-w-[600px]">
                                                        <thead>
                                                            <tr className="bg-slate-100">
                                                                <th className="border border-slate-300 p-1 text-center w-8">No</th>
                                                                <th className="border border-slate-300 p-1 text-left w-32 whitespace-nowrap">Nama Siswa</th>
                                                                <th className="border border-slate-300 p-1 text-left w-32 whitespace-nowrap">Asal Sekolah</th>
                                                                <th className="border border-slate-300 p-1 text-left">Analisis Kategori (Penguasaan)</th>
                                                                <th className="border border-slate-300 p-1 text-left w-48">Rekomendasi Tindakan</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {classResults.map((r, index) => {
                                                                const analysis = analyzeStudentPerformance(exam, r);
                                                                return (
                                                                    <tr key={r.student.studentId} className="avoid-break">
                                                                        <td className="border border-slate-300 p-1 text-center">{index + 1}</td>
                                                                        <td className="border border-slate-300 p-1 font-bold whitespace-nowrap">{r.student.fullName}</td>
                                                                        <td className="border border-slate-300 p-1 whitespace-nowrap">{r.student.schoolName || '-'}</td>
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
                                            </div>
                                        </div>
                                        <div className="page-break"></div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}

                {/* 3. ANALISIS BUTIR SOAL */}
                <div className="mb-4">
                    <h3 className="font-bold text-sm uppercase tracking-wider mb-2 border-l-4 border-slate-800 pl-2">3. Analisis Butir Soal</h3>
                    
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
                                                    // FIX: Sum counts of all answers that match this option (normalized)
                                                    const count = Object.entries(data.distribution).reduce((acc, [ans, c]) => {
                                                        if (originalQ?.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
                                                            const sSet = new Set(parseList(ans).map(a => normalize(a, originalQ.questionType)));
                                                            return sSet.has(normalize(opt, originalQ.questionType)) ? acc + (c as number) : acc;
                                                        }
                                                        return normalize(ans, originalQ?.questionType || '') === normalize(opt, originalQ?.questionType || '') ? acc + (c as number) : acc;
                                                    }, 0);
                                                    
                                                    const pct = totalStudents > 0 ? Math.round((count/totalStudents)*100) : 0;
                                                    
                                                    const isCorrect = 
                                                        (originalQ?.questionType === 'MULTIPLE_CHOICE' && opt === originalQ.correctAnswer) ||
                                                        (originalQ?.questionType === 'COMPLEX_MULTIPLE_CHOICE' && originalQ.correctAnswer?.includes(opt));
                                                    
                                                    return (
                                                        <div key={i} className={`flex items-center justify-between px-2 py-1 rounded border ${isCorrect ? 'print-bg-green font-bold' : 'border-slate-100 text-slate-600'}`}>
                                                            <div className="flex gap-2 items-start w-full overflow-hidden">
                                                                <span className="w-4 font-bold shrink-0">{label}.</span>
                                                                {/* FIX: Removed truncate, added image styling */}
                                                                <div className="min-w-0 [&_p]:inline [&_br]:hidden [&_img]:max-h-20 [&_img]:w-auto [&_img]:inline-block" dangerouslySetInnerHTML={{__html: opt}}></div>
                                                            </div>
                                                            <span className="shrink-0 ml-2"><b>{count}</b> ({pct}%)</span>
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
                                                                    // FIX: Use parseList to match print logic with digital view
                                                                    const parsed = parseList(ans);
                                                                    parsed.sort((a, b) => (originalQ.options || []).indexOf(a) - (originalQ.options || []).indexOf(b));
                                                                    displayAns = parsed.join(', ');
                                                                    const sSet = new Set(parsed.map(a => normalize(a, originalQ.questionType)));
                                                                    const cSet = new Set(parseList(originalQ.correctAnswer || '').map(a => normalize(a, originalQ.questionType)));
                                                                    isCorrect = sSet.size === cSet.size && [...sSet].every(x => cSet.has(x));
                                                                } else {
                                                                    const normAns = normalize(ans, originalQ?.questionType || '');
                                                                    const normKey = normalize(originalQ?.correctAnswer || '', originalQ?.questionType || '');
                                                                    isCorrect = normAns === normKey;
                                                                }
                                                            } catch { /* ignore */ }

                                                            return (
                                                                <div key={i} className={`flex items-start justify-between px-2 py-1 rounded border ${isCorrect ? 'print-bg-green font-bold' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                                                                    {/* FIX: Removed truncate, added image styling */}
                                                                    <div className="flex-1 mr-2 min-w-0 [&_p]:inline [&_br]:hidden [&_img]:max-h-10 [&_img]:w-auto [&_img]:inline-block" dangerouslySetInnerHTML={{__html: displayAns}}></div>
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

                {/* 4. BANK SOAL & KUNCI JAWABAN */}
                <div className="mb-4">
                    <h3 className="font-bold text-sm uppercase tracking-wider mb-3 border-l-4 border-slate-800 pl-2">4. Bank Soal & Kunci Jawaban</h3>
                    <div className="space-y-4">
                        {exam.questions.map((q, index) => {
                            const questionNumber = exam.questions.slice(0, index).filter(i => i.questionType !== 'INFO').length + 1;
                            return (
                                <div key={q.id} className="avoid-break bg-white p-4 rounded-xl border border-slate-300 shadow-none mb-4">
                                    <div className="flex items-start gap-4">
                                        <span className="flex-shrink-0 mt-1 text-sm font-bold w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 border border-slate-200">{q.questionType === 'INFO' ? 'i' : questionNumber}</span>
                                        <div className="flex-1 space-y-3 min-w-0">
                                            {/* Metadata Badge */}
                                            {(q.category || q.level || q.scoreWeight) && (
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {q.category && <span className="text-[9px] font-bold bg-slate-50 text-slate-600 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wide">Kategori: {q.category}</span>}
                                                    {q.level && <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-wide">Level: {q.level}</span>}
                                                    <span className="text-[9px] font-bold bg-purple-50 text-purple-600 px-2 py-0.5 rounded border border-purple-100 uppercase tracking-wide">Bobot: {q.scoreWeight || 1}</span>
                                                </div>
                                            )}
                                            
                                            <div className="prose prose-sm max-w-none text-slate-800 print-question-text" dangerouslySetInnerHTML={{ __html: q.questionText }}></div>
                                            
                                            {q.questionType === 'MULTIPLE_CHOICE' && q.options && q.options.map((opt, i) => (
                                                <div key={i} className={`flex items-start gap-3 p-2 rounded-lg border text-xs ${normalize(q.correctAnswer || '', q.questionType) === normalize(opt, q.questionType) ? 'bg-emerald-50 border-emerald-200 font-bold text-emerald-800 print-bg-green' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                                    <span className="font-bold">{String.fromCharCode(65 + i)}.</span>
                                                    <div className="flex-1" dangerouslySetInnerHTML={{ __html: opt }}></div>
                                                    {normalize(q.correctAnswer || '', q.questionType) === normalize(opt, q.questionType) && <CheckCircleIcon className="w-4 h-4 text-emerald-600 ml-auto shrink-0"/>}
                                                </div>
                                            ))}
                                            
                                            {q.questionType === 'COMPLEX_MULTIPLE_CHOICE' && q.options && q.options.map((opt, i) => {
                                                const isSelected = parseList(q.correctAnswer || '').map(a => normalize(a, q.questionType)).includes(normalize(opt, q.questionType));
                                                return (
                                                    <div key={i} className={`flex items-start gap-3 p-2 rounded-lg border text-xs ${isSelected ? 'bg-emerald-50 border-emerald-200 font-bold text-emerald-800 print-bg-green' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                                        <span className="font-bold">{String.fromCharCode(65 + i)}.</span>
                                                        <div className="flex-1" dangerouslySetInnerHTML={{ __html: opt }}></div>
                                                        {isSelected && <CheckCircleIcon className="w-4 h-4 text-emerald-600 ml-auto shrink-0"/>}
                                                    </div>
                                                );
                                            })}
                                            
                                            {q.questionType === 'TRUE_FALSE' && q.trueFalseRows && (
                                                <div className="border border-slate-200 rounded-lg overflow-x-auto custom-scrollbar">
                                                    <table className="w-full text-xs min-w-[500px]">
                                                        <thead className="bg-slate-50">
                                                            <tr>
                                                                <th className="p-2 font-bold text-slate-600 text-left border-b border-slate-200">Pernyataan</th>
                                                                <th className="p-2 font-bold text-slate-600 text-center w-24 border-b border-slate-200">Jawaban</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {q.trueFalseRows.map((r, i) => (
                                                                <tr key={i} className="bg-white">
                                                                    <td className="p-2"><div className="[&_*]:!bg-transparent [&_*]:!text-inherit [&_*]:!p-0 [&_*]:!m-0" dangerouslySetInnerHTML={{ __html: r.text }}></div></td>
                                                                    <td className={`p-2 text-center font-bold ${r.answer ? 'text-emerald-700 bg-emerald-50 print-bg-green':'text-rose-700 bg-rose-50 print-bg-red'}`}>{r.answer ? 'Benar':'Salah'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                            
                                            {q.questionType === 'MATCHING' && q.matchingPairs && (
                                                <div className="space-y-1">
                                                    {q.matchingPairs.map((p,i) => (
                                                        <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                                                            <div className="flex-1 font-medium">{p.left}</div>
                                                            <div className="text-slate-400">→</div>
                                                            <div className="flex-1 font-bold text-emerald-700">{p.right}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            {(q.questionType === 'ESSAY' || q.questionType === 'FILL_IN_THE_BLANK') && q.correctAnswer && (
                                                <div className="mt-2 pt-2 border-t border-slate-200">
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Kunci Jawaban</p>
                                                    <div className="mt-1 p-2 rounded-lg bg-slate-50 text-xs prose prose-sm max-w-none text-emerald-800 font-medium border border-slate-200" dangerouslySetInnerHTML={{__html: q.correctAnswer}}></div>
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

            {showEditMetadata && archiveData && (
                <EditMetadataModal 
                    exam={archiveData.exam} 
                    onClose={() => setShowEditMetadata(false)} 
                    onSave={(updated) => {
                        const updatedData = {
                            ...archiveData,
                            exam: { ...archiveData.exam, ...updated }
                        };
                        setArchiveData(fixArchiveDataSorting(updatedData));
                        setShowEditMetadata(false);
                        handleUploadToCloud(updatedData);
                    }} 
                />
            )}
        </div>
    );
};
