 
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
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [newAdminRole, setNewAdminRole] = useState('admin');
    const [newAdminSchool, setNewAdminSchool] = useState('');

    // --- LAZY FETCHING LOGIC ---
    useEffect(() => {
        if (view === 'ONGOING' || view === 'UPCOMING_EXAMS' || view === 'FINISHED_EXAMS' || view === 'DRAFTS') {
            onRefreshExams();
        }
        if (view === 'ONGOING' || view === 'FINISHED_EXAMS') {
            onRefreshResults();
        }
        if (view === 'ADMIN_USERS') {
            fetchAdminUsers();
        }
    }, [view, onRefreshExams, onRefreshResults]);

    const fetchAdminUsers = async () => {
        try {
            // FIX: Sertakan headers identitas untuk validasi RBAC backend
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': teacherProfile.id,
                    'x-role': teacherProfile.accountType,
                    'x-school': teacherProfile.school
                },
                body: JSON.stringify({ action: 'get-users' })
            });
            const data = await res.json();
            if (res.ok && Array.isArray(data)) {
                setAdminUsers(data);
            } else {
                console.error("Failed to fetch users:", data.error);
            }
        } catch(e) { console.error(e); }
    };

    const handleUpdateRole = async (email: string, role: string, school: string) => {
        try {
            // FIX: Sertakan headers identitas
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': teacherProfile.id,
                    'x-role': teacherProfile.accountType,
                    'x-school': teacherProfile.school
                },
                body: JSON.stringify({ action: 'update-role', email, role, school })
            });
            
            if (res.ok) {
                alert("Role berhasil diperbarui!");
                fetchAdminUsers();
                setNewAdminEmail('');
            } else {
                const data = await res.json();
                alert(data.error || "Gagal update role.");
            }
        } catch(e) { alert("Kesalahan koneksi."); }
    };

    // ... (Existing handlers like handleQuestionsGenerated, handleSaveExam, etc. - kept identical)
    const handleQuestionsGenerated = (newQuestions: Question[]) => { setQuestions(newQuestions); setManualMode(true); };
    const handleSaveExam = (status: 'PUBLISHED' | 'DRAFT') => {
        if (status === 'PUBLISHED' && questions.length === 0) { alert("Tidak ada soal."); return; }
        const code = editingExam ? editingExam.code : generateExamCode();
        const now = new Date();
        const readableDate = now.toLocaleString('id-ID').replace(/\//g, '-');
        const examData: Exam = {
            code, authorId: teacherProfile.id, authorSchool: teacherProfile.school, questions, config,
            createdAt: editingExam?.createdAt || String(readableDate), status
        };
        if (editingExam) { updateExam(examData); setIsEditModalOpen(false); setEditingExam(null); alert('Berhasil diperbarui!'); } 
        else { addExam(examData); setEditingExam(examData); status === 'PUBLISHED' ? setGeneratedCode(code) : alert("Disimpan ke Draf."); }
    };
    const handleDeleteExam = (exam: Exam) => { if(confirm("Hapus ujian?")) deleteExam(exam.code); };
    const handleDuplicateExam = (exam: Exam) => { if (!confirm(`Duplicate?`)) return; setQuestions(exam.questions); setConfig({ ...exam.config, date: new Date().toISOString().split('T')[0] }); setManualMode(true); setEditingExam(null); setGeneratedCode(''); setView('UPLOAD'); setResetKey(prev => prev + 1); };
    const resetForm = () => { setQuestions([]); setGeneratedCode(''); setManualMode(false); setEditingExam(null); setView('UPLOAD'); setResetKey(prev => prev + 1); };
    const openEditModal = (exam: Exam) => { setEditingExam(exam); setQuestions(exam.questions); setConfig(exam.config); setIsEditModalOpen(true); };
    const continueDraft = (exam: Exam) => { setEditingExam(exam); setQuestions(exam.questions); setConfig(exam.config); setManualMode(true); setView('UPLOAD'); };
    const handleExamUpdate = (updatedExam: Exam) => { updateExam(updatedExam); };

    // -- Computed Data --
    const allExams: Exam[] = Object.values(exams);
    const publishedExams = allExams.filter(e => e.status !== 'DRAFT');
    const draftExams = allExams.filter(e => e.status === 'DRAFT');
    const now = new Date();
    const ongoingExams = publishedExams.filter((exam) => {
        const start = new Date(`${exam.config.date.split('T')[0]}T${exam.config.startTime}`);
        const end = new Date(start.getTime() + exam.config.timeLimit * 60 * 1000);
        return now >= start && now <= end;
    });
    const upcomingExams = publishedExams.filter((exam) => new Date(`${exam.config.date.split('T')[0]}T${exam.config.startTime}`) > now).sort((a,b)=>a.config.date.localeCompare(b.config.date));
    const finishedExams = publishedExams.filter((exam) => new Date(`${exam.config.date.split('T')[0]}T${exam.config.startTime}`).getTime() + exam.config.timeLimit * 60000 < now.getTime()).sort((a,b)=>b.config.date.localeCompare(a.config.date));

    return (
        <div className="min-h-screen bg-base-200">
            <header className="bg-base-100 shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-neutral">Dashboard Guru</h1>
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border bg-indigo-100 text-indigo-700 border-indigo-200">
                                    {teacherProfile.accountType.replace('_', ' ')}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm font-medium text-gray-500">{teacherProfile.fullName}</span>
                                {teacherProfile.school && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{teacherProfile.school}</span>}
                            </div>
                        </div>
                        <div className="flex items-center gap-4 self-end md:self-auto">
                            <button onClick={onLogout} className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary font-semibold"><LogoutIcon className="w-5 h-5"/> Logout</button>
                        </div>
                    </div>
                    <nav className="flex border-b -mb-px overflow-x-auto whitespace-nowrap mt-2">
                         <button onClick={() => setView('UPLOAD')} className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 ${view === 'UPLOAD' ? 'border-primary text-primary' : 'text-gray-500 border-transparent'}`}><CheckCircleIcon className="w-5 h-5"/> Buat Ujian</button>
                         <button onClick={() => setView('DRAFTS')} className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 ${view === 'DRAFTS' ? 'border-primary text-primary' : 'text-gray-500 border-transparent'}`}><PencilIcon className="w-5 h-5"/> Draf</button>
                         <button onClick={() => setView('ONGOING')} className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 ${view === 'ONGOING' ? 'border-primary text-primary' : 'text-gray-500 border-transparent'}`}><ClockIcon className="w-5 h-5"/> Berlangsung</button>
                         <button onClick={() => setView('UPCOMING_EXAMS')} className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 ${view === 'UPCOMING_EXAMS' ? 'border-primary text-primary' : 'text-gray-500 border-transparent'}`}><CalendarDaysIcon className="w-5 h-5"/> Akan Datang</button>
                         <button onClick={() => setView('FINISHED_EXAMS')} className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 ${view === 'FINISHED_EXAMS' ? 'border-primary text-primary' : 'text-gray-500 border-transparent'}`}><ChartBarIcon className="w-5 h-5"/> Selesai</button>
                         {teacherProfile.accountType === 'super_admin' && (
                             <button onClick={() => setView('ADMIN_USERS')} className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 ${view === 'ADMIN_USERS' ? 'border-purple-600 text-purple-600' : 'text-gray-500 border-transparent'}`}><CheckCircleIcon className="w-5 h-5"/> Manage Users</button>
                         )}
                    </nav>
                </div>
            </header>
            <main className="max-w-[95%] mx-auto p-4 md:p-8">
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
                {view === 'FINISHED_EXAMS' && <FinishedExamsView exams={finishedExams} onSelectExam={setSelectedFinishedExam} onDuplicateExam={handleDuplicateExam} onDeleteExam={handleDeleteExam} />}
                
                {/* ADMIN USER MANAGEMENT */}
                {view === 'ADMIN_USERS' && (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100">
                            <h2 className="text-xl font-bold text-purple-900 mb-4">Tambah / Update Admin</h2>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <input placeholder="Email User" value={newAdminEmail} onChange={e=>setNewAdminEmail(e.target.value)} className="p-3 border rounded-xl" />
                                <select value={newAdminRole} onChange={e=>setNewAdminRole(e.target.value)} className="p-3 border rounded-xl bg-white">
                                    <option value="guru">Guru</option>
                                    <option value="admin">School Admin</option>
                                    <option value="super_admin">Super Admin</option>
                                </select>
                                <input placeholder="Nama Sekolah" value={newAdminSchool} onChange={e=>setNewAdminSchool(e.target.value)} className="p-3 border rounded-xl" />
                                <button onClick={() => handleUpdateRole(newAdminEmail, newAdminRole, newAdminSchool)} className="bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700">Simpan Role</button>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-700 mb-4">Daftar Admin & Role</h3>
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500">
                                    <tr><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">School</th><th className="p-3">Action</th></tr>
                                </thead>
                                <tbody>
                                    {adminUsers.map((u, i) => (
                                        <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                                            <td className="p-3 font-medium">{u.email}</td>
                                            <td className="p-3"><span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold uppercase">{u.role}</span></td>
                                            <td className="p-3">{u.school}</td>
                                            <td className="p-3">
                                                <button onClick={() => handleUpdateRole(u.email, 'guru', u.school)} className="text-red-500 hover:underline text-xs">Demote to Guru</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            <OngoingExamModal exam={selectedOngoingExam} results={results} onClose={() => setSelectedOngoingExam(null)} onAllowContinuation={onAllowContinuation} onUpdateExam={handleExamUpdate} />
            <FinishedExamModal exam={selectedFinishedExam} results={results} onClose={() => setSelectedFinishedExam(null)} />
            {isEditModalOpen && editingExam && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
                    <div className="bg-base-200 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="p-4 bg-base-100 border-b flex justify-between items-center"><h2 className="font-bold">Edit</h2><button onClick={()=>setIsEditModalOpen(false)}><XMarkIcon className="w-6 h-6"/></button></div>
                        <div className="p-6 overflow-y-auto"><ExamEditor questions={questions} setQuestions={setQuestions} config={config} setConfig={setConfig} isEditing={true} onSave={() => handleSaveExam('PUBLISHED')} onSaveDraft={() => handleSaveExam('DRAFT')} onCancel={() => setIsEditModalOpen(false)} generatedCode={''} onReset={()=>{}} /></div>
                    </div>
                </div>
            )}
        </div>
    );
};
