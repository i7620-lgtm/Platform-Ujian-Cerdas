import React, { useState, useEffect, Suspense } from 'react';
import type { Exam, Question, ExamConfig, Result, TeacherProfile } from '../types';
import { 
    CheckCircleIcon, 
    ChartBarIcon, 
    LogoutIcon, 
    ClockIcon, 
    CalendarDaysIcon,
    XMarkIcon,
    PencilIcon,
    CloudArrowUpIcon,
    MoonIcon,
    SunIcon,
    TableCellsIcon,
    QrCodeIcon
} from './Icons';
import { generateExamCode } from './teacher/examUtils';
import { ExamEditor } from './teacher/ExamEditor';
import { CreationView, OngoingExamsView, UpcomingExamsView, FinishedExamsView, DraftsView, ArchiveViewer } from './teacher/DashboardViews';
import { OngoingExamModal, FinishedExamModal } from './teacher/DashboardModals';
import { storageService } from '../services/storage';
import { InvitationModal } from './InvitationModal';

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
    onAllowContinuation: (studentId: string, examCode: string) => void;
    onRefreshExams: () => Promise<void>;
    onRefreshResults: () => Promise<void>;
    isDarkMode: boolean;
    toggleTheme: () => void;
}

type TeacherView = 'UPLOAD' | 'ONGOING' | 'UPCOMING_EXAMS' | 'FINISHED_EXAMS' | 'DRAFTS' | 'ADMIN_USERS' | 'ARCHIVE_VIEWER' | 'ANALYTICS';

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ 
    teacherProfile, addExam, updateExam, deleteExam, exams, results, onLogout, onAllowContinuation, onRefreshExams, onRefreshResults, isDarkMode, toggleTheme
}) => {
    const [view, setView] = useState<TeacherView>('UPLOAD');
    const [isLoadingArchive, setIsLoadingArchive] = useState(false);
    
    // Editor State
    const [questions, setQuestions] = useState<Question[]>([]);
    const [config, setConfig] = useState<ExamConfig>({
        timeLimit: 60,
        date: new Date().toISOString().split('T')[0],
        startTime: '08:00',
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
        disableRealtime: true, // Default true: Normal Mode as basic mode
        trackLocation: false,
        subject: 'Lainnya',
        classLevel: 'Lainnya',
        targetClasses: [],
        examType: 'Lainnya',
        description: ''
    });
    
    const [generatedCode, setGeneratedCode] = useState('');
    const [manualMode, setManualMode] = useState(false);
    const [resetKey, setResetKey] = useState(0);

    // Modal & Selection States
    const [selectedOngoingExam, setSelectedOngoingExam] = useState<Exam | null>(null);
    const [selectedFinishedExam, setSelectedFinishedExam] = useState<Exam | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingExam, setEditingExam] = useState<Exam | null>(null);
    const [isInviteOpen, setIsInviteOpen] = useState(false);

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

    const handleQuestionsGenerated = (newQuestions: Question[]) => { setQuestions(newQuestions); setManualMode(true); };
    
    const resetForm = () => { 
        setQuestions([]); 
        setGeneratedCode(''); 
        setManualMode(false); 
        setEditingExam(null); 
        setResetKey(prev => prev + 1); 
    };

    const handleSaveExam = (status: 'PUBLISHED' | 'DRAFT') => {
        if (status === 'PUBLISHED' && questions.length === 0) { alert("Tidak ada soal."); return; }
        const code = editingExam ? editingExam.code : generateExamCode();
        const now = new Date();
        const readableDate = now.toLocaleString('id-ID').replace(/\//g, '-');
        const examData: Exam = {
            code, authorId: teacherProfile.id, authorSchool: teacherProfile.school, questions, config,
            createdAt: editingExam?.createdAt || String(readableDate), status
        };
        
        if (editingExam) { 
            updateExam(examData); 
            setIsEditModalOpen(false); 
            setEditingExam(null); 
        } else { 
            addExam(examData); 
            if(status === 'PUBLISHED') setGeneratedCode(code); 
        }

        if (status === 'DRAFT') {
            setView('DRAFTS');
            resetForm();
        } else {
            const dateStr = config.date.includes('T') ? config.date.split('T')[0] : config.date;
            const start = new Date(`${dateStr}T${config.startTime}`);
            const end = new Date(start.getTime() + config.timeLimit * 60 * 1000);
            
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
        setConfig({ ...exam.config, date: new Date().toISOString().split('T')[0] }); 
        setManualMode(true); 
        setEditingExam(null); 
        setGeneratedCode(''); 
        setView('UPLOAD'); 
        setResetKey(prev => prev + 1); 
    };

    const handleReuseExam = (examToReuse: Exam) => {
        setQuestions(examToReuse.questions);
        const newConfig = { ...examToReuse.config, date: new Date().toISOString().split('T')[0] };
        setConfig(newConfig);
        setManualMode(true);
        setEditingExam(null);
        setGeneratedCode('');
        setView('UPLOAD');
        setResetKey(prev => prev + 1);
    };

    // ARCHIVE & EXCEL LOGIC (Refactored to use Transaction Safe Service)
    const handleArchiveExam = async (exam: Exam) => {
        if (exam.authorId !== teacherProfile.id) {
            alert("Akses Ditolak: Hanya guru pembuat soal asli yang dapat melakukan finalisasi dan arsip ke penyimpanan cloud.");
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

        } catch (e: any) {
            console.error(e);
            alert("Gagal memproses arsip: " + e.message);
        } finally {
            setIsLoadingArchive(false);
        }
    };

    const openEditModal = (exam: Exam) => { setEditingExam(exam); setQuestions(exam.questions); setConfig(exam.config); setIsEditModalOpen(true); };
    const continueDraft = (exam: Exam) => { setEditingExam(exam); setQuestions(exam.questions); setConfig(exam.config); setManualMode(true); setView('UPLOAD'); };
    const handleExamUpdate = (updatedExam: Exam) => { updateExam(updatedExam); };

    const allExams: Exam[] = Object.values(exams);
    const publishedExams = allExams.filter(e => e.status !== 'DRAFT');
    const draftExams = allExams.filter(e => e.status === 'DRAFT');
    
    const now = new Date();
    
    const ongoingExams = publishedExams.filter((exam) => {
        const dateStr = exam.config.date.includes('T') ? exam.config.date.split('T')[0] : exam.config.date;
        const start = new Date(`${dateStr}T${exam.config.startTime}`);
        const end = new Date(start.getTime() + exam.config.timeLimit * 60 * 1000);
        return now >= start && now <= end;
    });

    const upcomingExams = publishedExams.filter((exam) => {
        const dateStr = exam.config.date.includes('T') ? exam.config.date.split('T')[0] : exam.config.date;
        return new Date(`${dateStr}T${exam.config.startTime}`) > now;
    }).sort((a,b)=>a.config.date.localeCompare(b.config.date));

    const finishedExams = publishedExams.filter((exam) => {
        const dateStr = exam.config.date.includes('T') ? exam.config.date.split('T')[0] : exam.config.date;
        return new Date(`${dateStr}T${exam.config.startTime}`).getTime() + exam.config.timeLimit * 60000 < now.getTime();
    }).sort((a,b)=>b.config.date.localeCompare(a.config.date));

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
                <div className="max-w-7xl mx-auto px-6">
                    <div className="py-5 flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Dashboard Guru</h1>
                                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border ${
                                    accountType === 'super_admin' ? 'bg-slate-800 text-white border-slate-900' :
                                    accountType === 'admin_sekolah' ? 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-800' :
                                    'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800'
                                }`}>
                                    {accountType.replace('_', ' ')}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{teacherProfile.fullName}</span>
                                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800">{teacherProfile.school}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={toggleTheme} 
                                className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm"
                                title={isDarkMode ? 'Mode Terang' : 'Mode Gelap'}
                            >
                                {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                            </button>
                            <button onClick={onLogout} className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors uppercase tracking-widest">
                                <LogoutIcon className="w-5 h-5"/> Keluar
                            </button>
                        </div>
                    </div>
                    <nav className="flex gap-8 overflow-x-auto whitespace-nowrap custom-scrollbar pb-1">
                         <button onClick={() => setView('UPLOAD')} className={`pb-4 text-[10px] font-black uppercase tracking-[0.15em] transition-all border-b-2 ${view === 'UPLOAD' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'text-slate-300 dark:text-slate-600 border-transparent hover:text-slate-50 dark:hover:text-slate-400'}`}>Buat Ujian</button>
                         <button onClick={() => setView('DRAFTS')} className={`pb-4 text-[10px] font-black uppercase tracking-[0.15em] transition-all border-b-2 ${view === 'DRAFTS' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'text-slate-300 dark:text-slate-600 border-transparent hover:text-slate-50 dark:hover:text-slate-400'}`}>Draf</button>
                         <button onClick={() => setView('ONGOING')} className={`pb-4 text-[10px] font-black uppercase tracking-[0.15em] transition-all border-b-2 ${view === 'ONGOING' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'text-slate-300 dark:text-slate-600 border-transparent hover:text-slate-50 dark:hover:text-slate-400'}`}>Berlangsung</button>
                         <button onClick={() => setView('UPCOMING_EXAMS')} className={`pb-4 text-[10px] font-black uppercase tracking-[0.15em] transition-all border-b-2 ${view === 'UPCOMING_EXAMS' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'text-slate-300 dark:text-slate-600 border-transparent hover:text-slate-50 dark:hover:text-slate-400'}`}>Terjadwal</button>
                         <button onClick={() => setView('FINISHED_EXAMS')} className={`pb-4 text-[10px] font-black uppercase tracking-[0.15em] transition-all border-b-2 ${view === 'FINISHED_EXAMS' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'text-slate-300 dark:text-slate-600 border-transparent hover:text-slate-50 dark:hover:text-slate-400'}`}>Selesai</button>
                         <button onClick={() => setView('ARCHIVE_VIEWER')} className={`pb-4 text-[10px] font-black uppercase tracking-[0.15em] transition-all border-b-2 ${view === 'ARCHIVE_VIEWER' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'text-slate-300 dark:text-slate-600 border-transparent hover:text-slate-50 dark:hover:text-slate-400'}`}>Buka Arsip</button>
                         {accountType === 'super_admin' && (
                            <>
                                <button onClick={() => setView('ADMIN_USERS')} className={`pb-4 text-[10px] font-black uppercase tracking-[0.15em] transition-all border-b-2 ${view === 'ADMIN_USERS' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'text-slate-300 dark:text-slate-600 border-transparent hover:text-slate-50 dark:hover:text-slate-400'}`}>Kelola Pengguna</button>
                                <button onClick={() => setView('ANALYTICS')} className={`pb-4 text-[10px] font-black uppercase tracking-[0.15em] transition-all border-b-2 ${view === 'ANALYTICS' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'text-slate-300 dark:text-slate-600 border-transparent hover:text-slate-50 dark:hover:text-slate-400'}`}>Analisis Daerah</button>
                            </>
                         )}
                    </nav>
                </div>
            </header>
            
            <main className="max-w-7xl mx-auto p-6 md:p-10">
                {view === 'UPLOAD' && (
                    <>
                        <CreationView key={resetKey} onQuestionsGenerated={handleQuestionsGenerated} />
                        {(questions.length > 0 || manualMode || editingExam) && (
                            <ExamEditor questions={questions} setQuestions={setQuestions} config={config} setConfig={setConfig} isEditing={!!editingExam && editingExam.status !== 'DRAFT'} onSave={() => handleSaveExam('PUBLISHED')} onSaveDraft={() => handleSaveExam('DRAFT')} onCancel={() => { setEditingExam(null); setManualMode(false); setQuestions([]); setResetKey(k => k+1); }} generatedCode={generatedCode} onReset={resetForm} />
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
                    onAllowContinuation={onAllowContinuation} 
                    onUpdateExam={handleExamUpdate} 
                />
            )}
            
            {selectedFinishedExam && (
                <FinishedExamModal 
                    exam={selectedFinishedExam} 
                    teacherProfile={teacherProfile}
                    onClose={() => setSelectedFinishedExam(null)} 
                />
            )}
            
            {isEditModalOpen && editingExam && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col border border-white dark:border-slate-700">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 rounded-t-3xl">
                            <h2 className="font-black text-slate-800 dark:text-white">Edit Detail Ujian</h2>
                            <button onClick={()=>setIsEditModalOpen(false)} className="p-2 bg-slate-50 dark:bg-slate-700 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30 transition-colors"><XMarkIcon className="w-6 h-6"/></button>
                        </div>
                        <div className="p-8 overflow-y-auto flex-1 bg-slate-50/30 dark:bg-slate-900/50">
                            <ExamEditor questions={questions} setQuestions={setQuestions} config={config} setConfig={setConfig} isEditing={true} onSave={() => handleSaveExam('PUBLISHED')} onSaveDraft={() => handleSaveExam('DRAFT')} onCancel={() => setIsEditModalOpen(false)} generatedCode={''} onReset={()=>{}} />
                        </div>
                    </div>
                </div>
            )}

            {/* Personal Invitation Modal */}
            <InvitationModal 
                isOpen={isInviteOpen} 
                onClose={() => setIsInviteOpen(false)}
                teacherName={organizerName}
                schoolName={teacherProfile.school}
            />
        </div>
    );
};
 
