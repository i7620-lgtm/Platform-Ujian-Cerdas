import React, { useState, useEffect, Suspense } from 'react';
import { createPortal } from 'react-dom';
import type { Exam, Question, ExamConfig, Result, TeacherProfile } from '../types';
import { 
    CheckCircleIcon, 
    ChartBarIcon, 
    LogoutIcon, 
    CalendarDaysIcon,
    XMarkIcon,
    PencilIcon,
    MoonIcon,
    SunIcon,
    QuestionMarkCircleIcon,
    FileTextIcon,
    PlayIcon,
    BookOpenIcon,
    UserIcon
} from './Icons';
import { generateExamCode, sanitizeHtml, parseList } from './teacher/examUtils';
import { ExamEditor } from './teacher/ExamEditor';
import { CreationView, OngoingExamsView, UpcomingExamsView, FinishedExamsView, DraftsView, ArchiveViewer } from './teacher/DashboardViews';
import { OngoingExamModal, FinishedExamModal } from './teacher/DashboardModals';
import { TutorialPage } from './TutorialPage';
import { storageService } from '../services/storage';
import { InvitationModal } from './teacher/InvitationModal';

// Lazy Load Admin Views for Super Admin
const AnalyticsView = React.lazy(() => import('./teacher/AnalyticsView'));
const UserManagementView = React.lazy(() => import('./teacher/DashboardViews').then(module => ({ default: module.UserManagementView })));

interface TeacherDashboardProps {
    teacherProfile: TeacherProfile;
    addExam: (newExam: Exam) => void;
    updateExam: (updatedExam: Exam) => void;
    deleteExam: (code: string) => Promise<void>;
    exams: Record<string, Exam>;
    results: Result[];
    onLogout: () => void;
    onRefreshExams: () => Promise<void>;
    onRefreshResults: () => Promise<void>;
    isDarkMode: boolean;
    toggleTheme: () => void;
}

type TeacherView = 'UPLOAD' | 'ONGOING' | 'UPCOMING_EXAMS' | 'FINISHED_EXAMS' | 'DRAFTS' | 'ADMIN_USERS' | 'ARCHIVE_VIEWER' | 'ANALYTICS';

const DEFAULT_CONFIG: ExamConfig = {
    examMode: 'UJIAN',
    startDate: new Date().toLocaleDateString('en-CA'),
    endDate: new Date(Date.now() + 86400000).toLocaleDateString('en-CA'),
    useBankSoal: false,
    bankSoalCount: 10,
    bankSoalProportions: { mudah: 30, sedang: 50, sulit: 20 },
    timeLimit: 60,
    date: new Date().toLocaleDateString('en-CA'),
    startTime: '08:00',
    endTime: '10:00',
    allowRetakes: false,
    detectBehavior: true,
    autoSubmitInactive: true,
    autoSaveInterval: 10,
    shuffleQuestions: false,
    shuffleAnswers: false,
    continueWithPermission: false,
    showResultToStudent: true,
    showCorrectAnswer: false,
    enablePublicStream: false,
    disableRealtime: true,
    trackLocation: false,
    subject: 'Lainnya',
    classLevel: 'Lainnya',
    targetClasses: [],
    examType: 'Lainnya',
    description: ''
};

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ 
    teacherProfile, addExam, updateExam, deleteExam, exams, results, onLogout, onRefreshExams, onRefreshResults, isDarkMode, toggleTheme
}) => {
    const [view, setView] = useState<TeacherView>('UPLOAD');
    const [isLoadingArchive, setIsLoadingArchive] = useState(false);
    
    // Editor State
    const [questions, setQuestions] = useState<Question[]>([]);
    const [config, setConfig] = useState<ExamConfig>(DEFAULT_CONFIG);
    
    const [generatedCode, setGeneratedCode] = useState('');
    const [manualMode, setManualMode] = useState(false);
    const [resetKey, setResetKey] = useState(0);

    // Modal & Selection States
    const [selectedOngoingExam, setSelectedOngoingExam] = useState<Exam | null>(null);
    const [selectedFinishedExam, setSelectedFinishedExam] = useState<Exam | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingExam, setEditingExam] = useState<Exam | null>(null);
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [isMainGuideModalOpen, setIsMainGuideModalOpen] = useState(false);

    // Logic for Organizer Name in Invitations
    const organizerName = teacherProfile.accountType === 'super_admin' ? 'Developer' :
                          teacherProfile.accountType === 'admin_sekolah' ? teacherProfile.school :
                          teacherProfile.fullName;

    useEffect(() => {
        if (view === 'ONGOING' || view === 'UPCOMING_EXAMS' || view === 'FINISHED_EXAMS' || view === 'DRAFTS') {
            onRefreshExams();
        }
        if (view === 'ONGOING' || view === 'FINISHED_EXAMS') {
            onRefreshResults();
        }
    }, [view, onRefreshExams, onRefreshResults]);

    if (isMainGuideModalOpen) {
        return <TutorialPage onBack={() => setIsMainGuideModalOpen(false)} />;
    }

    const handleQuestionsGenerated = (newQuestions: Question[], mode: 'manual' | 'auto') => { 
        if (newQuestions.length === 0 && mode === 'manual') {
            setManualMode(true);
        } else {
            setQuestions(prev => [...prev, ...newQuestions]); 
            setManualMode(true); 
            if (mode === 'auto' && newQuestions.length > 0) {
                setTimeout(() => {
                    const firstNewQuestionId = newQuestions[0].id;
                    const element = document.getElementById(firstNewQuestionId);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 300);
            }
        }
    };
    
    const resetForm = () => { 
        setQuestions([]); 
        setGeneratedCode(''); 
        setManualMode(false); 
        setEditingExam(null); 
        
        const now = new Date();
        const today = now.toLocaleDateString('en-CA');
        const tomorrowDate = new Date(now);
        tomorrowDate.setDate(now.getDate() + 1);
        const tomorrow = tomorrowDate.toLocaleDateString('en-CA');
        
        setConfig({
            ...DEFAULT_CONFIG,
            startDate: today,
            endDate: tomorrow,
            date: today,
        });
        setResetKey(prev => prev + 1); 
    };

    const handleSaveExam = (status: 'PUBLISHED' | 'DRAFT') => {
        if (status === 'PUBLISHED' && questions.length === 0) { alert("Tidak ada soal."); return; }
        
        // Sanitize all questions before saving to ensure no theme-specific styles are stored
        const sanitizedQuestions = questions.map(q => {
            let sanitizedCorrectAnswer = q.correctAnswer;
            if (q.correctAnswer) {
                if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
                    const parsed = parseList(q.correctAnswer);
                    if (parsed && parsed.length > 0) {
                        sanitizedCorrectAnswer = JSON.stringify(parsed.map(opt => sanitizeHtml(opt)));
                    } else {
                        sanitizedCorrectAnswer = sanitizeHtml(q.correctAnswer);
                    }
                } else if (q.questionType === 'MULTIPLE_CHOICE') {
                    try {
                        const parsed = JSON.parse(q.correctAnswer);
                        if (Array.isArray(parsed)) {
                            // If it's an array (e.g. changed from COMPLEX), take the first element
                            sanitizedCorrectAnswer = parsed.length > 0 ? sanitizeHtml(parsed[0]) : '';
                        } else {
                            sanitizedCorrectAnswer = sanitizeHtml(q.correctAnswer);
                        }
                    } catch {
                        sanitizedCorrectAnswer = sanitizeHtml(q.correctAnswer);
                    }
                } else {
                    sanitizedCorrectAnswer = sanitizeHtml(q.correctAnswer);
                }
            }
            
            return {
                ...q,
                questionText: sanitizeHtml(q.questionText),
                options: q.options ? q.options.map(opt => sanitizeHtml(opt)) : undefined,
                correctAnswer: sanitizedCorrectAnswer,
                trueFalseRows: q.trueFalseRows ? q.trueFalseRows.map(row => ({
                    ...row,
                    text: sanitizeHtml(row.text)
                })) : undefined,
                matchingPairs: q.matchingPairs ? q.matchingPairs.map(pair => ({
                    ...pair,
                    left: sanitizeHtml(pair.left),
                    right: sanitizeHtml(pair.right)
                })) : undefined
            };
        });

        const code = editingExam ? editingExam.code : generateExamCode();
        const now = new Date();
        const readableDate = now.toLocaleString('id-ID').replace(/\//g, '-');
        
        // Convert local time to UTC for storage
        const dateToUse = (config.startDate || config.date || '').split('T')[0];
        const localDateTime = new Date(`${dateToUse}T${config.startTime || '00:00'}`);
        
        // We store the ISO string which is always UTC
        const isoStart = !isNaN(localDateTime.getTime()) ? localDateTime.toISOString() : new Date().toISOString();
        
        const endDateToUse = (config.endDate || dateToUse).split('T')[0];
        const localEndDateTime = new Date(`${endDateToUse}T${config.endTime || '23:59'}:59`);
        const isoEnd = !isNaN(localEndDateTime.getTime()) ? localEndDateTime.toISOString() : isoStart;

        const examData: Exam = {
            code, authorId: teacherProfile.id, authorSchool: teacherProfile.school, 
            questions: sanitizedQuestions, 
            config: {
                ...config,
                date: isoStart,
                startDate: isoStart,
                endDate: isoEnd,
                startTime: config.startTime,
                endTime: config.endTime
            },
            createdAt: editingExam?.createdAt || String(readableDate), status
        };
        
        const finalExamData: Exam = {
             ...examData,
             config: {
                 ...examData.config,
                 isFinished: false // Reset on save/publish to ensure it's not stuck in finished state
             }
        };

        if (editingExam) { 
            updateExam(finalExamData); 
            setIsEditModalOpen(false); 
            setEditingExam(null); 
        } else { 
            addExam(finalExamData); 
            if(status === 'PUBLISHED') setGeneratedCode(code); 
        }

        if (status === 'DRAFT') {
            setView('DRAFTS');
            resetForm();
        } else {
            // Check status based on the ISO time
            const start = new Date(isoStart);
            const end = new Date(isoEnd);
            
            if (now >= start && now <= end) {
                setView('ONGOING');
            } else if (now < start) {
                setView('UPCOMING_EXAMS');
            } else {
                setView('FINISHED_EXAMS');
            }
            resetForm();
        }
    };
    
    const handleDeleteExam = (exam: Exam) => { if(confirm("Hapus ujian?")) deleteExam(exam.code); };
    
    const handleDuplicateExam = (exam: Exam) => { 
        setQuestions(exam.questions); 
        // When duplicating, reset date to today (local)
        const today = new Date();
        const tomorrow = new Date(today.getTime() + 86400000);
        const localDate = today.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
        const localTomorrow = tomorrow.toLocaleDateString('en-CA');
        setConfig({ 
            ...exam.config, 
            date: localDate, 
            startDate: localDate, 
            endDate: localTomorrow,
            isFinished: false // CRITICAL: Reset finished status
        }); 
        setManualMode(true); 
        setEditingExam(null); 
        setGeneratedCode(''); 
        setView('UPLOAD'); 
        setResetKey(prev => prev + 1); 
    };

    const handleReuseExam = (examToReuse: Exam) => {
        setQuestions(examToReuse.questions);
        const today = new Date();
        const tomorrow = new Date(today.getTime() + 86400000);
        const localDate = today.toLocaleDateString('en-CA');
        const localTomorrow = tomorrow.toLocaleDateString('en-CA');
        const newConfig = { 
            ...examToReuse.config, 
            date: localDate, 
            startDate: localDate, 
            endDate: localTomorrow,
            isFinished: false // CRITICAL: Reset finished status
        };
        setConfig(newConfig);
        setManualMode(true);
        setEditingExam(null);
        setGeneratedCode('');
        setView('UPLOAD');
        setResetKey(prev => prev + 1);
    };

    // ARCHIVE & EXCEL LOGIC (Refactored to use Transaction Safe Service)
    const handleArchiveExam = async (exam: Exam) => {
        // Allow author, collaborator, legacy exams (no authorId), or admins
        const isAuthor = !exam.authorId || exam.authorId === teacherProfile.id;
        const isCollaborator = exam.config.collaborators?.some(c => c.role === 'editor' || c.role === 'viewer') || false;
        const isAdmin = teacherProfile.accountType === 'super_admin' || teacherProfile.accountType === 'admin_sekolah';
        
        if (!isAuthor && !isCollaborator && !isAdmin) {
            alert("Akses Ditolak: Hanya guru pembuat soal asli atau kolaborator yang dapat melakukan finalisasi dan arsip ke penyimpanan cloud.");
            return;
        }

        setIsLoadingArchive(true);
        try {
            // --- VALIDATION FOR ESSAY GRADING ---
            const essayQuestions = exam.questions.filter(q => q.questionType === 'ESSAY');
            if (essayQuestions.length > 0) {
                // Fetch results first to check
                const currentResults = await storageService.getResults(exam.code, undefined);
                
                let ungradedCount = 0;
                for (const r of currentResults) {
                    for (const q of essayQuestions) {
                        const answer = r.answers[q.id];
                        // If answered but no grade key found
                        if (answer && !r.answers[`_grade_${q.id}`]) {
                            ungradedCount++;
                        }
                    }
                }

                if (ungradedCount > 0) {
                    alert(`Gagal Arsip: Ditemukan ${ungradedCount} jawaban esai yang belum diperiksa.\n\nSilakan buka menu 'Lihat Hasil' dan berikan penilaian manual (Benar/Salah) untuk setiap jawaban esai siswa terlebih dahulu.`);
                    setIsLoadingArchive(false);
                    return;
                }
            }
            // --- END VALIDATION ---

            const confirmMsg = `Konfirmasi Finalisasi & Arsip?\n\nSistem akan:\n1. Menghitung & menyimpan statistik ke Database Pusat (Untuk Analisis).\n2. Memindahkan data detail ke Cloud Storage (Cold Data).\n3. Menghapus data detail dari Database SQL (Optimasi).\n\nPastikan proses selesai 100%.`;
            if (!confirm(confirmMsg)) {
                setIsLoadingArchive(false);
                return;
            }
        
            // Using the new Transaction Safe method
            const { backupUrl } = await storageService.performFullArchive(exam);
            
            await deleteExam(exam.code); // Update local state/cache mainly
            onRefreshExams();
            
            if (backupUrl) {
                // If cloud upload failed but summary succeeded, allow download of local backup
                const link = document.createElement('a');
                link.href = backupUrl;
                link.download = `BACKUP_LOCAL_${exam.config.subject.replace(/[^a-zA-Z0-9]/g, '_')}_${exam.code}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(backupUrl);
                alert("Arsip Cloud gagal, namun Statistik telah tersimpan dan Backup Lokal telah diunduh.");
            } else {
                alert("Berhasil! Ujian telah diarsipkan dan statistik tersimpan.");
            }

        } catch (e: unknown) {
            console.error(e);
            alert("Gagal memproses arsip: " + (e instanceof Error ? e.message : String(e)));
        } finally {
            setIsLoadingArchive(false);
        }
    };

    const openEditModal = (exam: Exam) => { 
        setEditingExam(exam); 
        setQuestions(exam.questions); 
        
        // Parse the stored ISO date back to local date/time for inputs
        let localStartDate = exam.config.startDate || exam.config.date;
        let localEndDate = exam.config.endDate;
        let localStartTime = exam.config.startTime;
        let localEndTime = exam.config.endTime;
        
        if (localStartDate && localStartDate.includes('T')) {
            const d = new Date(localStartDate);
            if (!isNaN(d.getTime())) {
                localStartDate = d.toLocaleDateString('en-CA');
                localStartTime = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            }
        }

        if (localEndDate && localEndDate.includes('T')) {
            const d = new Date(localEndDate);
            if (!isNaN(d.getTime())) {
                localEndDate = d.toLocaleDateString('en-CA');
                localEndTime = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            }
        }
        
        setConfig({
            ...exam.config,
            date: localStartDate,
            startDate: localStartDate,
            endDate: localEndDate,
            startTime: localStartTime,
            endTime: localEndTime
        }); 
        setIsEditModalOpen(true); 
    };
    const continueDraft = (exam: Exam) => { 
        // Yield to main thread to allow UI feedback (INP fix)
        setTimeout(() => {
            setEditingExam(exam); 
            setQuestions(exam.questions); 
            
            let localStartDate = exam.config.startDate || exam.config.date;
            let localEndDate = exam.config.endDate;
            let localStartTime = exam.config.startTime;
            let localEndTime = exam.config.endTime;

            if (localStartDate && localStartDate.includes('T')) {
                const d = new Date(localStartDate);
                if (!isNaN(d.getTime())) {
                    localStartDate = d.toLocaleDateString('en-CA');
                    localStartTime = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                }
            }

            if (localEndDate && localEndDate.includes('T')) {
                const d = new Date(localEndDate);
                if (!isNaN(d.getTime())) {
                    localEndDate = d.toLocaleDateString('en-CA');
                    localEndTime = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                }
            }
            
            setConfig({
                ...exam.config,
                date: localStartDate,
                startDate: localStartDate,
                endDate: localEndDate,
                startTime: localStartTime,
                endTime: localEndTime
            }); 
            setManualMode(true); 
            setView('UPLOAD'); 
        }, 0);
    };


    const allExams: Exam[] = Object.values(exams);
    const publishedExams = allExams.filter(e => e.status !== 'DRAFT');
    const draftExams = allExams.filter(e => e.status === 'DRAFT');
    
    const now = new Date();
    
    const getExamDates = (exam: Exam) => {
        const mode = exam.config.examMode || 'UJIAN';
        const startDateRaw = exam.config.startDate || exam.config.date || '';
        const endDateRaw = exam.config.endDate;
        
        let start: Date;
        if (startDateRaw.includes('T')) {
            start = new Date(startDateRaw);
        } else {
            const startTimeStr = exam.config.startTime || '00:00';
            start = new Date(`${startDateRaw}T${startTimeStr}`);
        }

        if (isNaN(start.getTime())) start = new Date();

        let end: Date;
        const endTimeStr = exam.config.endTime || '23:59';
        
        const getLocalDateStr = (raw: string) => {
            if (!raw) return '';
            if (raw.includes('T')) {
                const d = new Date(raw);
                return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-CA');
            }
            return raw;
        };

        const localStartDateStr = getLocalDateStr(startDateRaw);
        const localEndDateStr = getLocalDateStr(endDateRaw) || localStartDateStr;

        if (mode === 'PR') {
            start = new Date(0); // PR is always available before end date
            end = new Date(`${localEndDateStr}T${endTimeStr}:59`);
        } else {
            if (endDateRaw || exam.config.endTime) {
                if (endDateRaw && endDateRaw.includes('T')) {
                    end = new Date(endDateRaw);
                } else {
                    end = new Date(`${localEndDateStr}T${endTimeStr}:59`);
                }
            } else if (exam.config.timeLimit > 0) {
                end = new Date(start.getTime() + exam.config.timeLimit * 60000);
            } else {
                end = new Date(`${localStartDateStr}T23:59:59`);
            }
        }

        // Final safety for end date
        if (isNaN(end.getTime())) {
            end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        }

        return { start, end };
    };

    const ongoingExams = publishedExams.filter((exam) => {
        const { start, end } = getExamDates(exam);
        return now >= start && now <= end && !exam.config.isFinished;
    });

    const upcomingExams = publishedExams.filter((exam) => {
        const { start } = getExamDates(exam);
        return start > now && !exam.config.isFinished;
    }).sort((a,b) => {
        return getExamDates(a).start.getTime() - getExamDates(b).start.getTime();
    });

    const finishedExams = publishedExams.filter((exam) => {
        const { end } = getExamDates(exam);
        return end < now || exam.config.isFinished;
    }).sort((a,b) => {
        return getExamDates(b).end.getTime() - getExamDates(a).end.getTime();
    });

    const accountType = teacherProfile.accountType || 'guru';

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-900 transition-colors duration-300">
            {isLoadingArchive && (
                <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 animate-bounce">
                        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Memproses Arsip & Statistik...</p>
                        <p className="text-xs text-slate-400">Mohon tunggu, jangan tutup halaman ini.</p>
                    </div>
                </div>
            )}

            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40 transition-colors duration-300">
                <div className="w-full max-w-full mx-auto px-4 md:px-6">
                    <div className="py-3 md:py-5 flex justify-between items-center">
                        <div className="min-w-0 flex-1 mr-4">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">Dashboard Guru</h1>
                                <span className={`shrink-0 text-[8px] sm:text-[10px] font-black uppercase px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border ${
                                    accountType === 'super_admin' ? 'bg-slate-800 text-white border-slate-900' :
                                    accountType === 'admin_sekolah' ? 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-800' :
                                    'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800'
                                }`}>
                                    {accountType.replace('_', ' ')}
                                </span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1">
                                <span className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 truncate max-w-[150px] sm:max-w-none">{teacherProfile.fullName}</span>
                                <span className="text-[9px] sm:text-[10px] font-black text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 break-words">{teacherProfile.school}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                            <button 
                                onClick={() => setIsMainGuideModalOpen(true)}
                                className="p-1.5 sm:p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm flex items-center gap-2 text-xs font-bold"
                                title="Cara Penggunaan"
                            >
                                <QuestionMarkCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span className="hidden sm:inline">Panduan</span>
                            </button>
                            <button 
                                onClick={toggleTheme} 
                                className="p-1.5 sm:p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm"
                                title={isDarkMode ? 'Mode Terang' : 'Mode Gelap'}
                            >
                                {isDarkMode ? <SunIcon className="w-4 h-4 sm:w-5 sm:h-5" /> : <MoonIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
                            </button>
                            <button onClick={onLogout} className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs font-black text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors uppercase tracking-widest" title="Keluar">
                                <LogoutIcon className="w-4 h-4 sm:w-5 sm:h-5"/> <span className="hidden sm:inline">Keluar</span>
                            </button>
                        </div>
                    </div>
                    <nav className="flex w-full items-center justify-between sm:justify-center gap-1 sm:gap-4 md:gap-6 overflow-x-auto custom-scrollbar pb-1 px-1">
                         <button onClick={() => setView('UPLOAD')} className={`pb-2 px-1 sm:px-2 flex flex-col items-center justify-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-b-2 min-w-[40px] sm:min-w-[80px] ${view === 'UPLOAD' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-600 dark:hover:text-slate-300'}`}>
                            <PencilIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                            <span className="hidden sm:inline">Buat</span>
                         </button>
                         <button onClick={() => setView('DRAFTS')} className={`pb-2 px-1 sm:px-2 flex flex-col items-center justify-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-b-2 min-w-[40px] sm:min-w-[80px] ${view === 'DRAFTS' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-600 dark:hover:text-slate-300'}`}>
                            <FileTextIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                            <span className="hidden sm:inline">Draf</span>
                         </button>
                         <button onClick={() => setView('ONGOING')} className={`pb-2 px-1 sm:px-2 flex flex-col items-center justify-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-b-2 min-w-[40px] sm:min-w-[80px] ${view === 'ONGOING' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-600 dark:hover:text-slate-300'}`}>
                            <PlayIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                            <span className="hidden sm:inline">Berlangsung</span>
                         </button>
                         <button onClick={() => setView('UPCOMING_EXAMS')} className={`pb-2 px-1 sm:px-2 flex flex-col items-center justify-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-b-2 min-w-[40px] sm:min-w-[80px] ${view === 'UPCOMING_EXAMS' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-600 dark:hover:text-slate-300'}`}>
                            <CalendarDaysIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                            <span className="hidden sm:inline">Mendatang</span>
                         </button>
                         <button onClick={() => setView('FINISHED_EXAMS')} className={`pb-2 px-1 sm:px-2 flex flex-col items-center justify-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-b-2 min-w-[40px] sm:min-w-[80px] ${view === 'FINISHED_EXAMS' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-600 dark:hover:text-slate-300'}`}>
                            <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                            <span className="hidden sm:inline">Selesai</span>
                         </button>
                         <button onClick={() => setView('ARCHIVE_VIEWER')} className={`pb-2 px-1 sm:px-2 flex flex-col items-center justify-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-b-2 min-w-[40px] sm:min-w-[80px] ${view === 'ARCHIVE_VIEWER' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-600 dark:hover:text-slate-300'}`}>
                            <BookOpenIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                            <span className="hidden sm:inline">Arsip</span>
                         </button>
                         {accountType === 'super_admin' && (
                            <>
                                <button onClick={() => setView('ADMIN_USERS')} className={`pb-2 px-1 sm:px-2 flex flex-col items-center justify-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-b-2 min-w-[40px] sm:min-w-[80px] ${view === 'ADMIN_USERS' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-600 dark:hover:text-slate-300'}`}>
                                    <UserIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                                    <span className="hidden sm:inline">Kelola</span>
                                </button>
                                <button onClick={() => setView('ANALYTICS')} className={`pb-2 px-1 sm:px-2 flex flex-col items-center justify-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-b-2 min-w-[40px] sm:min-w-[80px] ${view === 'ANALYTICS' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-600 dark:hover:text-slate-300'}`}>
                                    <ChartBarIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                                    <span className="hidden sm:inline">Analisis</span>
                                </button>
                            </>
                         )}
                    </nav>
                </div>
            </header>
            
            <main className="w-full max-w-full mx-auto p-4 md:p-10">
                {view === 'UPLOAD' && (
                    <>
                        <CreationView key={resetKey} onQuestionsGenerated={handleQuestionsGenerated} isPremium={teacherProfile.isPremium || false} />
                        {(questions.length > 0 || manualMode || editingExam) && (
                            <ExamEditor questions={questions} setQuestions={setQuestions} config={config} setConfig={setConfig} isEditing={!!editingExam && editingExam.status !== 'DRAFT'} onSave={() => handleSaveExam('PUBLISHED')} onSaveDraft={() => handleSaveExam('DRAFT')} onCancel={() => { setEditingExam(null); setManualMode(false); setQuestions([]); setResetKey(k => k+1); }} generatedCode={generatedCode} onReset={resetForm} isPremium={teacherProfile.isPremium || false} />
                        )}
                    </>
                )}
                {view === 'DRAFTS' && <DraftsView exams={draftExams} onContinueDraft={continueDraft} onDeleteDraft={handleDeleteExam} />}
                {view === 'ONGOING' && <OngoingExamsView exams={ongoingExams} results={results} onSelectExam={setSelectedOngoingExam} onDuplicateExam={handleDuplicateExam} onRefresh={onRefreshExams} />}
                {view === 'UPCOMING_EXAMS' && <UpcomingExamsView exams={upcomingExams} onEditExam={openEditModal} onDuplicateExam={handleDuplicateExam} teacherName={organizerName} schoolName={teacherProfile.school} onRefresh={onRefreshExams} />}
                {view === 'FINISHED_EXAMS' && (
                    <FinishedExamsView 
                        exams={finishedExams} 
                        onSelectExam={setSelectedFinishedExam} 
                        onDuplicateExam={handleDuplicateExam} 
                        onDeleteExam={handleDeleteExam}
                        onArchiveExam={handleArchiveExam}
                    />
                )}
                {view === 'ARCHIVE_VIEWER' && <ArchiveViewer onReuseExam={handleReuseExam} />}
                {view === 'ADMIN_USERS' && accountType === 'super_admin' && (
                    <Suspense fallback={<div className="text-center p-10 text-slate-400">Memuat Manajemen Pengguna...</div>}>
                        <UserManagementView />
                    </Suspense>
                )}
                {view === 'ANALYTICS' && accountType === 'super_admin' && (
                    <Suspense fallback={<div className="text-center p-10 text-slate-400">Memuat Modul Analisis...</div>}>
                        <AnalyticsView />
                    </Suspense>
                )}
            </main>

            {selectedOngoingExam && (
                <OngoingExamModal 
                    exam={selectedOngoingExam} 
                    teacherProfile={teacherProfile}
                    onClose={() => setSelectedOngoingExam(null)} 
                    isPremium={teacherProfile.isPremium || false}
                />
            )}
            
            {selectedFinishedExam && (
                <FinishedExamModal 
                    exam={selectedFinishedExam} 
                    teacherProfile={teacherProfile}
                    onClose={() => setSelectedFinishedExam(null)} 
                />
            )}
            
            {isEditModalOpen && editingExam && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col border border-white dark:border-slate-700">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 rounded-t-3xl">
                            <h2 className="font-black text-slate-800 dark:text-white">Edit Detail Ujian</h2>
                            <button onClick={()=>setIsEditModalOpen(false)} className="p-2 bg-slate-50 dark:bg-slate-700 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30 transition-colors"><XMarkIcon className="w-6 h-6"/></button>
                        </div>
                        <div className="p-4 md:p-8 overflow-y-auto overflow-x-hidden flex-1 bg-slate-50/30 dark:bg-slate-900/50">
                            <ExamEditor questions={questions} setQuestions={setQuestions} config={config} setConfig={setConfig} isEditing={true} onSave={() => handleSaveExam('PUBLISHED')} onSaveDraft={() => handleSaveExam('DRAFT')} onCancel={() => setIsEditModalOpen(false)} generatedCode={''} onReset={()=>{}} isPremium={teacherProfile.isPremium || false} />
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Personal Invitation Modal */}
            <InvitationModal 
                isOpen={isInviteOpen} 
                onClose={() => setIsInviteOpen(false)}
                teacherName={organizerName}
                schoolName={teacherProfile.school}
            />

            {/* Main Guide Modal */}

        </div>
    );
};
 
