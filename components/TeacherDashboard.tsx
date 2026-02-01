import React, { useState, useEffect } from 'react';
import type { Exam, Question, ExamConfig, Result, TeacherProfile } from '../types';
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

    // Admin State
    const [adminUsers, setAdminUsers] = useState<any[]>([]);

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

        // Navigasi Otomatis berdasarkan status dan waktu
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
            
            // Berikan sedikit delay agar jika user baru membuat exam, 
            // mereka bisa melihat notifikasi sukses (jika ada) atau transisinya halus
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

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="py-5 flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-xl font-black text-slate-900 tracking-tight">Dashboard Guru</h1>
                                <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                                    {teacherProfile.accountType.replace('_', ' ')}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-bold text-slate-400">{teacherProfile.fullName}</span>
                                <span className="text-[10px] font-black text-emerald-600 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-100">{teacherProfile.school}</span>
                            </div>
                        </div>
                        <button onClick={onLogout} className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-rose-600 transition-colors uppercase tracking-widest"><LogoutIcon className="w-5 h-5"/> Keluar</button>
                    </div>
                    <nav className="flex gap-8 overflow-x-auto whitespace-nowrap">
                         <button onClick={() => setView('UPLOAD')} className={`pb-4 text-[10px] font-black uppercase tracking-[0.15em] transition-all border-b-2 ${view === 'UPLOAD' ? 'border-indigo-600 text-indigo-600' : 'text-slate-300 border-transparent hover:text-slate-500'}`}>Buat Ujian</button>
                         <button onClick={() => setView('DRAFTS')} className={`pb-4 text-[10px] font-black uppercase tracking-[0.15em] transition-all border-b-2 ${view === 'DRAFTS' ? 'border-indigo-600 text-indigo-600' : 'text-slate-300 border-transparent hover:text-slate-500'}`}>Draf</button>
                         <button onClick={() => setView('ONGOING')} className={`pb-4 text-[10px] font-black uppercase tracking-[0.15em] transition-all border-b-2 ${view === 'ONGOING' ? 'border-indigo-600 text-indigo-600' : 'text-slate-300 border-transparent hover:text-slate-500'}`}>Berlangsung</button>
                         <button onClick={() => setView('UPCOMING_EXAMS')} className={`pb-4 text-[10px] font-black uppercase tracking-[0.15em] transition-all border-b-2 ${view === 'UPCOMING_EXAMS' ? 'border-indigo-600 text-indigo-600' : 'text-slate-300 border-transparent hover:text-slate-500'}`}>Terjadwal</button>
                         <button onClick={() => setView('FINISHED_EXAMS')} className={`pb-4 text-[10px] font-black uppercase tracking-[0.15em] transition-all border-b-2 ${view === 'FINISHED_EXAMS' ? 'border-indigo-600 text-indigo-600' : 'text-slate-300 border-transparent hover:text-slate-500'}`}>Selesai</button>
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
                {view === 'ONGOING' && <OngoingExamsView exams={ongoingExams} results={results} onSelectExam={setSelectedOngoingExam} onDuplicateExam={handleDuplicateExam} />}
                {view === 'UPCOMING_EXAMS' && <UpcomingExamsView exams={upcomingExams} onEditExam={openEditModal} />}
                {view === 'FINISHED_EXAMS' && <FinishedExamsView exams={finishedExams} results={results} onSelectExam={setSelectedFinishedExam} onDuplicateExam={handleDuplicateExam} onDeleteExam={handleDeleteExam} />}
            </main>

            {/* Modal Live Monitor (Khusus Ujian Berlangsung) */}
            {selectedOngoingExam && (
                <OngoingExamModal 
                    exam={selectedOngoingExam} 
                    teacherProfile={teacherProfile}
                    onClose={() => setSelectedOngoingExam(null)} 
                    onAllowContinuation={onAllowContinuation} 
                    onUpdateExam={handleExamUpdate} 
                />
            )}
            
            {/* Modal Analisis Statistik (Khusus Ujian Selesai) */}
            {selectedFinishedExam && (
                <FinishedExamModal 
                    exam={selectedFinishedExam} 
                    teacherProfile={teacherProfile}
                    onClose={() => setSelectedFinishedExam(null)} 
                />
            )}
            
            {isEditModalOpen && editingExam && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col border border-white">
                        <div className="p-6 border-b flex justify-between items-center bg-white rounded-t-3xl">
                            <h2 className="font-black text-slate-800">Edit Detail Ujian</h2>
                            <button onClick={()=>setIsEditModalOpen(false)} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-600"><XMarkIcon className="w-6 h-6"/></button>
                        </div>
                        <div className="p-8 overflow-y-auto flex-1 bg-slate-50/30">
                            <ExamEditor questions={questions} setQuestions={setQuestions} config={config} setConfig={setConfig} isEditing={true} onSave={() => handleSaveExam('PUBLISHED')} onSaveDraft={() => handleSaveExam('DRAFT')} onCancel={() => setIsEditModalOpen(false)} generatedCode={''} onReset={()=>{}} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
