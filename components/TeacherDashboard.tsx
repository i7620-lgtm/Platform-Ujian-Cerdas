
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
        trackLocation: false,
        subject: 'Lainnya',
        classLevel: 'Lainnya',
        examType: 'Lainnya',
        description: ''
    });
    
    const [generatedCode, setGeneratedCode] = useState('');
    const [manualMode, setManualMode] = useState(false);
    const [resetKey, setResetKey] = useState(0);

    const [selectedOngoingExam, setSelectedOngoingExam] = useState<Exam | null>(null);
    const [selectedFinishedExam, setSelectedFinishedExam] = useState<Exam | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingExam, setEditingExam] = useState<Exam | null>(null);

    useEffect(() => {
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
        if (status === 'PUBLISHED' && questions.length === 0) {
            alert("Tidak ada soal.");
            return;
        }
        
        const code = editingExam ? editingExam.code : generateExamCode();
        const examData: Exam = {
            code,
            authorId: teacherId || 'ANONYMOUS',
            questions, 
            config,
            createdAt: editingExam?.createdAt || new Date().toLocaleString(),
            status: status
        };

        if (editingExam) {
            updateExam(examData);
            setIsEditModalOpen(false);
            setEditingExam(null);
            alert('Ujian diperbarui!');
        } else {
            addExam(examData); 
            setGeneratedCode(code);
            setEditingExam(examData);
        }
    };

    const handleDeleteExam = async (code: string) => {
        await deleteExam(code);
    };

    const handleDuplicateExam = (exam: Exam) => {
        setQuestions(exam.questions);
        setConfig({ ...exam.config, date: new Date().toISOString().split('T')[0], startTime: '08:00' });
        setManualMode(true);
        setEditingExam(null);
        setGeneratedCode('');
        setView('UPLOAD');
    };

    const resetForm = () => {
        setQuestions([]);
        setGeneratedCode('');
        setManualMode(false);
        setEditingExam(null);
        setView('UPLOAD');
        setResetKey(prev => prev + 1);
    };

    const openEditModal = (exam: Exam) => {
        setEditingExam(exam);
        setQuestions(exam.questions);
        setConfig(exam.config);
        setIsEditModalOpen(true);
    };

    const now = new Date();
    const allExams: Exam[] = Object.values(exams);
    const publishedExams = allExams.filter(e => e.status !== 'DRAFT');
    const draftExams = allExams.filter(e => e.status === 'DRAFT');

    const ongoingExams = publishedExams.filter((exam) => {
        const start = new Date(`${exam.config.date.split('T')[0]}T${exam.config.startTime}`);
        const end = new Date(start.getTime() + exam.config.timeLimit * 60 * 1000);
        return now >= start && now <= end;
    });

    const upcomingExams = publishedExams.filter((exam) => {
        const start = new Date(`${exam.config.date.split('T')[0]}T${exam.config.startTime}`);
        return start > now;
    });

    const finishedExams = publishedExams.filter((exam) => {
        const start = new Date(`${exam.config.date.split('T')[0]}T${exam.config.startTime}`);
        const end = new Date(start.getTime() + exam.config.timeLimit * 60 * 1000);
        return end < now;
    });

    return (
        <div className="min-h-screen bg-slate-50/50">
            <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-30 border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="py-5 flex justify-between items-center">
                        <div className="flex flex-col">
                            <h1 className="text-xl font-black text-slate-800 tracking-tight">Panel Guru</h1>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{teacherId}</p>
                        </div>
                        <button onClick={onLogout} className="flex items-center gap-2 text-sm text-slate-500 hover:text-rose-600 font-bold transition-colors bg-slate-50 px-4 py-2 rounded-xl">
                            <LogoutIcon className="w-5 h-5"/> Logout
                        </button>
                    </div>
                    <nav className="flex gap-2 pb-0 overflow-x-auto no-scrollbar">
                         {[
                             { id: 'UPLOAD', label: 'Buat Baru', icon: CheckCircleIcon },
                             { id: 'DRAFTS', label: 'Draf', icon: PencilIcon, count: draftExams.length },
                             { id: 'ONGOING', label: 'Aktif', icon: ClockIcon, count: ongoingExams.length },
                             { id: 'UPCOMING_EXAMS', label: 'Jadwal', icon: CalendarDaysIcon, count: upcomingExams.length },
                             { id: 'FINISHED_EXAMS', label: 'Riwayat', icon: ChartBarIcon, count: finishedExams.length }
                         ].map(tab => (
                             <button 
                                key={tab.id}
                                onClick={() => setView(tab.id as TeacherView)} 
                                className={`px-6 py-4 text-sm font-black flex items-center gap-2 transition-all border-b-4 shrink-0 ${view === tab.id ? 'border-primary text-primary bg-primary/5' : 'text-slate-400 hover:text-slate-600 border-transparent hover:bg-slate-50'}`}
                             >
                                <tab.icon className="w-5 h-5"/>
                                {tab.label}
                                {tab.count !== undefined && tab.count > 0 && <span className="ml-1 bg-white border border-current px-2 py-0.5 rounded-full text-[10px]">{tab.count}</span>}
                            </button>
                         ))}
                    </nav>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-6 sm:p-10">
                {view === 'UPLOAD' && (
                    <>
                        <CreationView key={resetKey} onQuestionsGenerated={handleQuestionsGenerated} />
                        {(questions.length > 0 || manualMode || editingExam) && (
                            <ExamEditor 
                                questions={questions}
                                setQuestions={setQuestions}
                                config={config}
                                setConfig={setConfig}
                                isEditing={!!editingExam}
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

                {view === 'DRAFTS' && <DraftsView exams={draftExams} onContinueDraft={(e) => { setEditingExam(e); setQuestions(e.questions); setConfig(e.config); setManualMode(true); setView('UPLOAD'); }} onDeleteDraft={(e) => handleDeleteExam(e.code)} />}
                {view === 'ONGOING' && <OngoingExamsView exams={ongoingExams} results={results} onSelectExam={setSelectedOngoingExam} onDuplicateExam={handleDuplicateExam} />}
                {view === 'UPCOMING_EXAMS' && <UpcomingExamsView exams={upcomingExams} onEditExam={openEditModal} />}
                {view === 'FINISHED_EXAMS' && <FinishedExamsView exams={finishedExams} onSelectExam={setSelectedFinishedExam} onDuplicateExam={handleDuplicateExam} onDeleteExam={handleDeleteExam} />}
            </main>

            <OngoingExamModal exam={selectedOngoingExam} results={results} onClose={() => setSelectedOngoingExam(null)} onAllowContinuation={onAllowContinuation} />
            <FinishedExamModal exam={selectedFinishedExam} results={results} onClose={() => setSelectedFinishedExam(null)} />

            {isEditModalOpen && editingExam && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                            <h2 className="text-xl font-black text-slate-800">Edit Ujian</h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2.5 rounded-xl hover:bg-slate-200 bg-white border border-slate-200"><XMarkIcon className="w-6 h-6" /></button>
                        </div>
                        <div className="p-10 overflow-y-auto">
                            <ExamEditor questions={questions} setQuestions={setQuestions} config={config} setConfig={setConfig} isEditing={true} onSave={() => handleSaveExam('PUBLISHED')} onCancel={() => setIsEditModalOpen(false)} generatedCode={''} onReset={() => {}} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
