
import React, { useState, useEffect } from 'react';
import type { Exam, Question, ExamConfig, Result } from '../types';
import { 
    CheckCircleIcon, 
    ChartBarIcon, 
    LogoutIcon, 
    ClockIcon, 
    CalendarDaysIcon,
    XMarkIcon
} from './Icons';
import { generateExamCode } from './teacher/examUtils';
import { ExamEditor } from './teacher/ExamEditor';
import { CreationView, OngoingExamsView, UpcomingExamsView, FinishedExamsView } from './teacher/DashboardViews';
import { OngoingExamModal, FinishedExamModal } from './teacher/DashboardModals';

interface TeacherDashboardProps {
    addExam: (newExam: Exam) => void;
    updateExam: (updatedExam: Exam) => void;
    exams: Record<string, Exam>;
    results: Result[];
    onLogout: () => void;
    onAllowContinuation: (studentId: string, examCode: string) => void;
    onRefreshExams: () => Promise<void>;
    onRefreshResults: () => Promise<void>;
    currentTeacherId: string;
}

type TeacherView = 'UPLOAD' | 'ONGOING' | 'UPCOMING_EXAMS' | 'FINISHED_EXAMS';

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ 
    addExam, updateExam, exams, results, onLogout, onAllowContinuation, onRefreshExams, onRefreshResults, currentTeacherId
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
        // Only fetch what is needed for the current view
        if (view === 'ONGOING') {
            onRefreshExams();
            onRefreshResults();
        } else if (view === 'UPCOMING_EXAMS') {
            onRefreshExams();
        } else if (view === 'FINISHED_EXAMS') {
            onRefreshExams();
            onRefreshResults();
        }
        // 'UPLOAD' view does NOT trigger fetch to prevent errors on mount
    }, [view, onRefreshExams, onRefreshResults]);


    const handleQuestionsGenerated = (newQuestions: Question[]) => {
        setQuestions(newQuestions);
        setManualMode(true);
    };

    const handleCreateExam = () => {
        if (questions.length === 0) {
            alert("Tidak ada soal. Silakan buat atau unggah soal terlebih dahulu.");
            return;
        }

        const code = generateExamCode();
        const newExam: Exam = {
            code,
            questions,
            config,
            authorId: currentTeacherId,
            // Perubahan: Simpan sebagai ISO String agar mudah dibaca di DB
            createdAt: new Date().toISOString()
        };
        addExam(newExam); // App.tsx handles the refresh after adding
        setGeneratedCode(code);
    };

    const handleUpdateExam = () => {
        if (!editingExam) return;

        if (questions.length === 0) {
            alert("Ujian tidak boleh kosong. Harap tambahkan setidaknya satu soal.");
            return;
        }
        
        const updatedExam: Exam = {
            code: editingExam.code,
            questions,
            config,
            authorId: editingExam.authorId,
            createdAt: editingExam.createdAt
        };
        updateExam(updatedExam);
        alert('Ujian berhasil diperbarui!');
        setIsEditModalOpen(false);
        setEditingExam(null);
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

    // -- Computed Data for Views --
    const now = new Date();
    const allExams: Exam[] = Object.values(exams);

    const ongoingExams = allExams.filter((exam) => {
        const examStartDateTime = new Date(`${exam.config.date.split('T')[0]}T${exam.config.startTime}`);
        const examEndDateTime = new Date(examStartDateTime.getTime() + exam.config.timeLimit * 60 * 1000);
        return now >= examStartDateTime && now <= examEndDateTime;
    });

    const upcomingExams = allExams.filter((exam) => {
        const examStartDateTime = new Date(`${exam.config.date.split('T')[0]}T${exam.config.startTime}`);
        return examStartDateTime > now;
    }).sort((a, b) => {
         const aDate = new Date(`${a.config.date.split('T')[0]}T${a.config.startTime}`);
         const bDate = new Date(`${b.config.date.split('T')[0]}T${b.config.startTime}`);
         return aDate.getTime() - bDate.getTime();
    });

    const finishedExams = allExams.filter((exam) => {
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
                        <h1 className="text-2xl font-bold text-neutral">Dashboard Guru</h1>
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium px-3 py-1 bg-gray-100 rounded-full text-gray-600">
                                ID: {currentTeacherId}
                            </span>
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
                        <button onClick={() => setView('ONGOING')} className={`px-4 sm:px-6 py-3 text-sm font-medium flex items-center gap-2 transition-colors border-b-2 flex-shrink-0 ${view === 'ONGOING' ? 'border-primary text-primary' : 'text-gray-500 hover:text-gray-700 border-transparent'}`}>
                            <ClockIcon className="w-5 h-5"/> Ujian Berlangsung
                        </button>
                        <button onClick={() => setView('UPCOMING_EXAMS')} className={`px-4 sm:px-6 py-3 text-sm font-medium flex items-center gap-2 transition-colors border-b-2 flex-shrink-0 ${view === 'UPCOMING_EXAMS' ? 'border-primary text-primary' : 'text-gray-500 hover:text-gray-700 border-transparent'}`}>
                            <CalendarDaysIcon className="w-5 h-5"/> Ujian Akan Datang
                        </button>
                        <button onClick={() => setView('FINISHED_EXAMS')} className={`px-4 sm:px-6 py-3 text-sm font-medium flex items-center gap-2 transition-colors border-b-2 flex-shrink-0 ${view === 'FINISHED_EXAMS' ? 'border-primary text-primary' : 'text-gray-500 hover:text-gray-700 border-transparent'}`}>
                            <ChartBarIcon className="w-5 h-5"/> Ujian Selesai
                        </button>
                    </nav>
                </div>
            </header>
            <main className="max-w-[95%] mx-auto p-4 md:p-8">
                {view === 'UPLOAD' && (
                    <>
                        <CreationView key={resetKey} onQuestionsGenerated={handleQuestionsGenerated} />
                        {(questions.length > 0 || manualMode) && (
                            <ExamEditor 
                                questions={questions}
                                setQuestions={setQuestions}
                                config={config}
                                setConfig={setConfig}
                                isEditing={false}
                                onSave={handleCreateExam}
                                onCancel={() => {}} 
                                generatedCode={generatedCode}
                                onReset={resetForm}
                            />
                        )}
                    </>
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

            {/* EDIT EXAM MODAL */}
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
                                onSave={handleUpdateExam}
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
