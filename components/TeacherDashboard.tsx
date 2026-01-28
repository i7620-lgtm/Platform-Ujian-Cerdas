
import React, { useState, useEffect } from 'react';
import type { Exam, Question, ExamConfig, Result, TeacherProfile } from '../types';
import { 
    CheckCircleIcon, 
    ChartBarIcon, 
    LogoutIcon, 
    ClockIcon,
    CalendarDaysIcon,
    XMarkIcon,
    PencilIcon,
    PlusCircleIcon
} from './Icons';
import { generateExamCode } from './teacher/examUtils';
import { ExamEditor } from './teacher/ExamEditor';
import { CreationView, OngoingExamsView, UpcomingExamsView, FinishedExamsView, DraftsView } from './teacher/DashboardViews';
import { OngoingExamModal, FinishedExamModal } from './teacher/DashboardModals';

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
}

type TeacherView = 'UPLOAD' | 'ONGOING' | 'UPCOMING_EXAMS' | 'FINISHED_EXAMS' | 'DRAFTS' | 'ADMIN_USERS';

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ 
    teacherProfile, addExam, updateExam, deleteExam, exams, results, onLogout, onAllowContinuation, onRefreshExams, onRefreshResults 
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
        if (['ONGOING', 'UPCOMING_EXAMS', 'FINISHED_EXAMS', 'DRAFTS'].includes(view)) onRefreshExams();
        if (['ONGOING', 'FINISHED_EXAMS'].includes(view)) onRefreshResults();
    }, [view, onRefreshExams, onRefreshResults]);

    const handleQuestionsGenerated = (newQuestions: Question[]) => { setQuestions(newQuestions); setManualMode(true); };
    
    const handleSaveExam = (status: 'PUBLISHED' | 'DRAFT') => {
        if (status === 'PUBLISHED' && questions.length === 0) { alert("Tambahkan minimal satu soal."); return; }
        const code = editingExam ? editingExam.code : generateExamCode();
        const examData: Exam = {
            code, authorId: teacherProfile.id, authorSchool: teacherProfile.school, questions, config,
            createdAt: editingExam?.createdAt || new Date().toISOString(), status
        };
        if (editingExam) { updateExam(examData); setIsEditModalOpen(false); setEditingExam(null); } 
        else { addExam(examData); if (status === 'PUBLISHED') setGeneratedCode(code); else alert("Tersimpan di draf."); }
    };

    const handleDeleteExam = (exam: Exam) => { if(confirm("Hapus ujian?")) deleteExam(exam.code); };
    const handleDuplicateExam = (exam: Exam) => { 
        setQuestions(exam.questions); 
        setConfig({ ...exam.config, date: new Date().toISOString().split('T')[0] }); 
        setManualMode(true); setView('UPLOAD'); setResetKey(k => k + 1); 
    };
    const resetForm = () => { setQuestions([]); setGeneratedCode(''); setManualMode(false); setEditingExam(null); setView('UPLOAD'); setResetKey(k => k + 1); };
    const openEditModal = (exam: Exam) => { setEditingExam(exam); setQuestions(exam.questions); setConfig(exam.config); setIsEditModalOpen(true); };
    const continueDraft = (exam: Exam) => { setEditingExam(exam); setQuestions(exam.questions); setConfig(exam.config); setManualMode(true); setView('UPLOAD'); };

    // Logika Filter yang Diperbaiki
    const allExams: Exam[] = Object.values(exams);
    const now = new Date();
    
    const publishedExams = allExams.filter(e => e.status === 'PUBLISHED');
    const draftExams = allExams.filter(e => e.status === 'DRAFT');

    const ongoingExams = publishedExams.filter(exam => {
        const dateStr = exam.config.date.includes('T') ? exam.config.date.split('T')[0] : exam.config.date;
        const start = new Date(`${dateStr}T${exam.config.startTime}:00`);
        const end = new Date(start.getTime() + exam.config.timeLimit * 60 * 1000);
        return now >= start && now <= end;
    });

    const upcomingExams = publishedExams.filter(exam => {
        const dateStr = exam.config.date.includes('T') ? exam.config.date.split('T')[0] : exam.config.date;
        const start = new Date(`${dateStr}T${exam.config.startTime}:00`);
        return now < start;
    }).sort((a,b) => a.config.date.localeCompare(b.config.date));

    const finishedExams = publishedExams.filter(exam => {
        const dateStr = exam.config.date.includes('T') ? exam.config.date.split('T')[0] : exam.config.date;
        const start = new Date(`${dateStr}T${exam.config.startTime}:00`);
        const end = new Date(start.getTime() + exam.config.timeLimit * 60 * 1000);
        return now > end;
    }).sort((a,b) => b.config.date.localeCompare(a.config.date));

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="py-6 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100"><ClockIcon className="w-7 h-7"/></div>
                            <div>
                                <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">UjianCerdas</h1>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{teacherProfile.school}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="hidden md:block text-right">
                                <p className="text-sm font-bold text-slate-800">{teacherProfile.fullName}</p>
                                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Guru Pengajar</p>
                            </div>
                            <button onClick={onLogout} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-2xl transition-all"><LogoutIcon className="w-5 h-5"/></button>
                        </div>
                    </div>
                    <nav className="flex gap-8">
                        {[
                            { id: 'UPLOAD', label: 'Buat Baru', icon: PlusCircleIcon },
                            { id: 'DRAFTS', label: 'Draf', icon: PencilIcon },
                            { id: 'ONGOING', label: 'Berlangsung', icon: ClockIcon },
                            { id: 'UPCOMING_EXAMS', label: 'Jadwal', icon: CalendarDaysIcon },
                            { id: 'FINISHED_EXAMS', label: 'Selesai', icon: ChartBarIcon },
                        ].map((t) => (
                            <button key={t.id} onClick={() => setView(t.id as any)} className={`pb-4 text-xs font-bold uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all ${view === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                                <t.icon className="w-4 h-4"/>
                                {t.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-8">
                {view === 'UPLOAD' && (
                    <div className="animate-slide-in-up">
                        <CreationView key={resetKey} onQuestionsGenerated={handleQuestionsGenerated} />
                        {(questions.length > 0 || manualMode || editingExam) && (
                            <div className="mt-12">
                                <ExamEditor 
                                    questions={questions} setQuestions={setQuestions} 
                                    config={config} setConfig={setConfig} 
                                    isEditing={!!editingExam && editingExam.status !== 'DRAFT'} 
                                    onSave={() => handleSaveExam('PUBLISHED')} 
                                    onSaveDraft={() => handleSaveExam('DRAFT')} 
                                    onCancel={() => { setEditingExam(null); setManualMode(false); setQuestions([]); setResetKey(k => k+1); }} 
                                    generatedCode={generatedCode} onReset={resetForm} 
                                />
                            </div>
                        )}
                    </div>
                )}
                {view === 'DRAFTS' && <DraftsView exams={draftExams} onContinueDraft={continueDraft} onDeleteDraft={handleDeleteExam} />}
                {view === 'ONGOING' && <OngoingExamsView exams={ongoingExams} results={results} onSelectExam={setSelectedOngoingExam} onDuplicateExam={handleDuplicateExam} />}
                {view === 'UPCOMING_EXAMS' && <UpcomingExamsView exams={upcomingExams} onEditExam={openEditModal} />}
                {view === 'FINISHED_EXAMS' && <FinishedExamsView exams={finishedExams} onSelectExam={setSelectedFinishedExam} onDuplicateExam={handleDuplicateExam} onDeleteExam={handleDeleteExam} />}
            </main>

            <OngoingExamModal exam={selectedOngoingExam} results={results} onClose={() => setSelectedOngoingExam(null)} onAllowContinuation={onAllowContinuation} onUpdateExam={updateExam} />
            <FinishedExamModal exam={selectedFinishedExam} results={results} onClose={() => setSelectedFinishedExam(null)} />
            
            {isEditModalOpen && editingExam && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 z-50 animate-fade-in">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-slate-800">Edit Ujian</h2>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{editingExam.code}</p>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-all"><XMarkIcon className="w-6 h-6"/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 bg-[#F8FAFC]">
                            <ExamEditor 
                                questions={questions} setQuestions={setQuestions} 
                                config={config} setConfig={setConfig} 
                                isEditing={true} onSave={() => handleSaveExam('PUBLISHED')} 
                                onSaveDraft={() => handleSaveExam('DRAFT')} 
                                onCancel={() => setIsEditModalOpen(false)} 
                                generatedCode={''} onReset={()=>{}} 
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
