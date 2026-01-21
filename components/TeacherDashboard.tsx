 
import React, { useState, useEffect } from 'react';
import type { Exam, Question, ExamConfig, Result } from '../types';
import { 
    CheckCircleIcon, 
    ChartBarIcon, 
    LogoutIcon, 
    ClockIcon,
    CalendarDaysIcon,
    XMarkIcon,
    PencilIcon
} from './Icons';
import { generateExamCode } from './teacher/examUtils';
import { ExamEditor } from './teacher/ExamEditor';
import { CreationView, OngoingExamsView, UpcomingExamsView, FinishedExamsView, DraftsView } from './teacher/DashboardViews';
import { OngoingExamModal, FinishedExamModal } from './teacher/DashboardModals';

interface TeacherDashboardProps {
    teacherId: string;
    addExam: (newExam: Exam) => void;
    updateExam: (updatedExam: Exam) => void;
    deleteExam: (code: string) => Promise<void>;
    exams: Record<string, Exam>;
    results: Result[];
    onLogout: () => void;
    onAllowContinuation: (studentId: string, examCode: string) => void;
    onRefreshExams: () => Promise<void>;
    onRefreshResults: () => Promise<void>;
}

type TeacherView = 'UPLOAD' | 'ONGOING' | 'UPCOMING_EXAMS' | 'FINISHED_EXAMS' | 'DRAFTS';

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ 
    teacherId, addExam, updateExam, deleteExam, exams, results, onLogout, onAllowContinuation, onRefreshExams, onRefreshResults 
}) => {
    const [view, setView] = useState<TeacherView>('UPLOAD');
    
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
        trackLocation: false
    });
    
    const [generatedCode, setGeneratedCode] = useState('');
    const [manualMode, setManualMode] = useState(false);
    const [resetKey, setResetKey] = useState(0);

    // Modal & Selection States
    const [selectedOngoingExam, setSelectedOngoingExam] = useState<Exam | null>(null);
    const [selectedFinishedExam, setSelectedFinishedExam] = useState<Exam | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingExam, setEditingExam] = useState<Exam | null>(null);

    // --- LAZY FETCHING LOGIC ---
    useEffect(() => {
        // Always fetch exams when dashboard mounts or view changes to a list view
        if (view === 'ONGOING' || view === 'UPCOMING_EXAMS' || view === 'FINISHED_EXAMS' || view === 'DRAFTS') {
            onRefreshExams();
        }
        
        if (view === 'ONGOING' || view === 'FINISHED_EXAMS') {
            onRefreshResults();
        }
    }, [view, onRefreshExams, onRefreshResults]);


    const handleQuestionsGenerated = (newQuestions: Question[]) => {
        setQuestions(newQuestions);
        setManualMode(true);
    };

    const handleSaveExam = (status: 'PUBLISHED' | 'DRAFT') => {
        // Validasi hanya jika PUBLISH. Kalau Draft, boleh longgar.
        if (status === 'PUBLISHED' && questions.length === 0) {
            alert("Tidak ada soal. Silakan buat atau unggah soal terlebih dahulu sebelum mempublikasikan.");
            return;
        }
        
        // LOGIC REVISI: Kode hanya digenerate saat KLIK SIMPAN pertama kali
        const code = editingExam ? editingExam.code : generateExamCode();
        
        const now = new Date();
        const readableDate = now.toLocaleString('id-ID', { 
            year: 'numeric', month: '2-digit', day: '2-digit', 
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }).replace(/\//g, '-');

        const examData: Exam = {
            code,
            authorId: teacherId || 'ANONYMOUS_TEACHER',
            questions, 
            config,
            createdAt: editingExam?.createdAt || String(readableDate),
            status: status
        };

        if (editingExam) {
            updateExam(examData);
            if (status === 'DRAFT') {
                alert('Draf berhasil diperbarui!');
            } else {
                setIsEditModalOpen(false);
                setEditingExam(null);
                alert('Ujian berhasil diperbarui!');
            }
        } else {
            addExam(examData); 
            // PENTING: Set editingExam ke data baru agar jika user klik simpan lagi,
            // dia tidak membuat draf baru dengan kode berbeda, tapi mengupdate yang ini.
            setEditingExam(examData); 
            
            if (status === 'DRAFT') {
                alert("Disimpan ke Draf.");
            } else {
                setGeneratedCode(code);
            }
        }
    };

    const handleDeleteExam = async (exam: Exam) => {
        if(confirm(`Apakah Anda yakin ingin menghapus draf "${exam.code}"? Tindakan ini tidak dapat dibatalkan.`)) {
            await deleteExam(exam.code);
            // Refresh local state visually immediately 
            // (Note: `deleteExam` implementation usually updates parent state, triggering re-render)
        }
    };

    const resetForm = () => {
        setQuestions([]);
        setGeneratedCode('');
        setManualMode(false);
        setEditingExam(null);
        setConfig({
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
            trackLocation: false
        });
        setView('UPLOAD');
        setResetKey(prev => prev + 1);
    };

    const openEditModal = (exam: Exam) => {
        setEditingExam(exam);
        setQuestions(exam.questions);
        setConfig(exam.config);
        setIsEditModalOpen(true);
    };

    const continueDraft = (exam: Exam) => {
        setEditingExam(exam);
        setQuestions(exam.questions);
        setConfig(exam.config);
        // Switch to Upload/Editor view but in "editing" mode (essentially manual mode populated)
        setManualMode(true); 
        setView('UPLOAD');
    };

    // -- Computed Data for Views --
    const now = new Date();
    const allExams: Exam[] = Object.values(exams);

    // Filter by Status first
    const publishedExams = allExams.filter(e => e.status !== 'DRAFT');
    const draftExams = allExams.filter(e => e.status === 'DRAFT');

    const ongoingExams = publishedExams.filter((exam) => {
        const examStartDateTime = new Date(`${exam.config.date.split('T')[0]}T${exam.config.startTime}`);
        const examEndDateTime = new Date(examStartDateTime.getTime() + exam.config.timeLimit * 60 * 1000);
        return now >= examStartDateTime && now <= examEndDateTime;
    });

    const upcomingExams = publishedExams.filter((exam) => {
        const examStartDateTime = new Date(`${exam.config.date.split('T')[0]}T${exam.config.startTime}`);
        return examStartDateTime > now;
    }).sort((a, b) => {
         const aDate = new Date(`${a.config.date.split('T')[0]}T${a.config.startTime}`);
         const bDate = new Date(`${b.config.date.split('T')[0]}T${b.config.startTime}`);
         return aDate.getTime() - bDate.getTime();
    });

    const finishedExams = publishedExams.filter((exam) => {
        const examStartDateTime = new Date(`${exam.config.date.split('T')[0]}T${exam.config.startTime}`);
        const examEndDateTime = new Date(examStartDateTime.getTime() + exam.config.timeLimit * 60 * 1000);
        return examEndDateTime < now;
    }).sort((a, b) => {
        const aDate = new Date(`${b.config.date.split('T')[0]}T${b.config.startTime}`);
        const bDate = new Date(`${a.config.date.split('T')[0]}T${a.config.startTime}`);
        return aDate.getTime() - bDate.getTime();
    });

    return (
        <div className="min-h-screen bg-base-200">
            <header className="bg-base-100 shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="py-4 flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-neutral">Dashboard Guru <span className="text-sm font-normal text-gray-500 ml-2">({teacherId})</span></h1>
                        <div className="flex items-center gap-4">
                            <button onClick={onLogout} className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary font-semibold">
                                <LogoutIcon className="w-5 h-5"/>
                                Logout
                            </button>
                        </div>
                    </div>
                    <nav className="flex border-b -mb-px overflow-x-auto whitespace-nowrap">
                         <button onClick={() => setView('UPLOAD')} className={`px-4 sm:px-6 py-3 text-sm font-medium flex items-center gap-2 transition-colors border-b-2 flex-shrink-0 ${view === 'UPLOAD' ? 'border-primary text-primary' : 'text-gray-500 hover:text-gray-700 border-transparent'}`}>
                            <CheckCircleIcon className="w-5 h-5"/> Buat Ujian
                        </button>
                        <button onClick={() => setView('DRAFTS')} className={`px-4 sm:px-6 py-3 text-sm font-medium flex items-center gap-2 transition-colors border-b-2 flex-shrink-0 ${view === 'DRAFTS' ? 'border-primary text-primary' : 'text-gray-500 hover:text-gray-700 border-transparent'}`}>
                            <PencilIcon className="w-5 h-5"/> Draf Soal <span className="ml-1 bg-gray-100 px-2 py-0.5 rounded-full text-xs text-gray-600">{draftExams.length}</span>
                        </button>
                        <button onClick={() => setView('ONGOING')} className={`px-4 sm:px-6 py-3 text-sm font-medium flex items-center gap-2 transition-colors border-b-2 flex-shrink-0 ${view === 'ONGOING' ? 'border-primary text-primary' : 'text-gray-500 hover:text-gray-700 border-transparent'}`}>
                            <ClockIcon className="w-5 h-5"/> Berlangsung
                        </button>
                        <button onClick={() => setView('UPCOMING_EXAMS')} className={`px-4 sm:px-6 py-3 text-sm font-medium flex items-center gap-2 transition-colors border-b-2 flex-shrink-0 ${view === 'UPCOMING_EXAMS' ? 'border-primary text-primary' : 'text-gray-500 hover:text-gray-700 border-transparent'}`}>
                            <CalendarDaysIcon className="w-5 h-5"/> Akan Datang
                        </button>
                        <button onClick={() => setView('FINISHED_EXAMS')} className={`px-4 sm:px-6 py-3 text-sm font-medium flex items-center gap-2 transition-colors border-b-2 flex-shrink-0 ${view === 'FINISHED_EXAMS' ? 'border-primary text-primary' : 'text-gray-500 hover:text-gray-700 border-transparent'}`}>
                            <ChartBarIcon className="w-5 h-5"/> Selesai
                        </button>
                    </nav>
                </div>
            </header>
            <main className="max-w-[95%] mx-auto p-4 md:p-8">
                {view === 'UPLOAD' && (
                    <>
                        <CreationView key={resetKey} onQuestionsGenerated={handleQuestionsGenerated} />
                        {(questions.length > 0 || manualMode || editingExam) && (
                            <ExamEditor 
                                questions={questions}
                                setQuestions={setQuestions}
                                config={config}
                                setConfig={setConfig}
                                isEditing={!!editingExam && editingExam.status !== 'DRAFT'} // Jika draft, anggap seperti buat baru tapi pre-filled
                                onSave={() => handleSaveExam('PUBLISHED')}
                                onSaveDraft={() => handleSaveExam('DRAFT')}
                                onCancel={() => {
                                    setEditingExam(null); 
                                    setManualMode(false); 
                                    setQuestions([]); 
                                    setResetKey(k => k+1);
                                }} 
                                generatedCode={generatedCode}
                                onReset={resetForm}
                            />
                        )}
                    </>
                )}

                {view === 'DRAFTS' && (
                    <DraftsView 
                        exams={draftExams}
                        onContinueDraft={continueDraft}
                        onDeleteDraft={handleDeleteExam}
                    />
                )}

                {view === 'ONGOING' && (
                    <OngoingExamsView 
                        exams={ongoingExams} 
                        results={results} 
                        onSelectExam={setSelectedOngoingExam} 
                    />
                )}

                {view === 'UPCOMING_EXAMS' && (
                    <UpcomingExamsView 
                        exams={upcomingExams} 
                        onEditExam={openEditModal} 
                    />
                )}

                {view === 'FINISHED_EXAMS' && (
                    <FinishedExamsView 
                        exams={finishedExams} 
                        onSelectExam={setSelectedFinishedExam} 
                    />
                )}
            </main>

            {/* MODALS */}
            <OngoingExamModal 
                exam={selectedOngoingExam} 
                results={results} 
                onClose={() => setSelectedOngoingExam(null)} 
                onAllowContinuation={onAllowContinuation}
            />

            <FinishedExamModal 
                exam={selectedFinishedExam} 
                results={results} 
                onClose={() => setSelectedFinishedExam(null)}
            />

            {/* EDIT EXAM MODAL (FOR PUBLISHED EXAMS) */}
            {isEditModalOpen && editingExam && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-base-200 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="p-4 bg-base-100 border-b flex justify-between items-center sticky top-0">
                            <h2 className="text-lg font-bold text-neutral">Edit Ujian: <span className="text-primary font-mono">{editingExam.code}</span></h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-1 rounded-full hover:bg-gray-200">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <ExamEditor 
                                questions={questions}
                                setQuestions={setQuestions}
                                config={config}
                                setConfig={setConfig}
                                isEditing={true}
                                onSave={() => handleSaveExam('PUBLISHED')}
                                onSaveDraft={() => handleSaveExam('DRAFT')}
                                onCancel={() => setIsEditModalOpen(false)}
                                generatedCode={''}
                                onReset={() => {}}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
