
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
    CogIcon
} from './Icons';
import { generateExamCode } from './teacher/examUtils';
import { ExamEditor } from './teacher/ExamEditor';
import { CreationView, OngoingExamsView, UpcomingExamsView, FinishedExamsView, DraftsView } from './teacher/DashboardViews';
import { OngoingExamModal, FinishedExamModal } from './teacher/DashboardModals';

interface TeacherDashboardProps {
    teacherProfile: TeacherProfile; // Updated from teacherId string
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

    // School Profile State
    const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
    const [schoolNameInput, setSchoolNameInput] = useState(teacherProfile.school || '');

    // Force School Modal on first login if empty
    useEffect(() => {
        if (!teacherProfile.school) {
            setIsSchoolModalOpen(true);
        }
    }, [teacherProfile.school]);

    // --- LAZY FETCHING LOGIC ---
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
            alert("Tidak ada soal. Silakan buat atau unggah soal terlebih dahulu.");
            return;
        }
        
        // Ensure School is set before saving
        if (!teacherProfile.school) {
            setIsSchoolModalOpen(true);
            return;
        }

        const code = editingExam ? editingExam.code : generateExamCode();
        
        const now = new Date();
        const readableDate = now.toLocaleString('id-ID', { 
            year: 'numeric', month: '2-digit', day: '2-digit', 
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }).replace(/\//g, '-');

        const examData: Exam = {
            code,
            authorId: teacherProfile.id || 'ANONYMOUS_TEACHER',
            authorSchool: teacherProfile.school, // Save School Context
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
            setEditingExam(examData); 
            if (status === 'DRAFT') {
                alert("Disimpan ke Draf.");
            } else {
                setGeneratedCode(code);
            }
        }
    };

    const handleDeleteExam = (exam: Exam) => {
        const isDraft = exam.status === 'DRAFT';
        const confirmMsg = isDraft 
            ? `Apakah Anda yakin ingin menghapus draf "${exam.code}"?`
            : `Apakah Anda yakin ingin menghapus ujian "${exam.code}"? Seluruh data hasil pengerjaan siswa untuk ujian ini juga akan terhapus secara permanen.`;

        if(confirm(confirmMsg)) {
            deleteExam(exam.code);
        }
    };

    const handleDuplicateExam = (exam: Exam) => {
        if (!confirm(`Gunakan kembali soal dari ujian "${exam.code}" untuk sesi baru?`)) return;
        setQuestions(exam.questions);
        setConfig({
            ...exam.config,
            date: new Date().toISOString().split('T')[0],
            startTime: '08:00',
        });
        setManualMode(true);
        setEditingExam(null);
        setGeneratedCode('');
        setView('UPLOAD');
        setResetKey(prev => prev + 1);
        alert('Soal berhasil disalin ke editor!');
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
            trackLocation: false,
            subject: 'Lainnya',
            classLevel: 'Lainnya',
            examType: 'Lainnya',
            description: ''
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
        setManualMode(true); 
        setView('UPLOAD');
    };

    const handleExamUpdate = (updatedExam: Exam) => {
        updateExam(updatedExam);
    };

    const handleSaveSchool = async () => {
        if (!schoolNameInput.trim()) return alert("Nama sekolah tidak boleh kosong");
        
        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    action: 'update-profile',
                    username: teacherProfile.id,
                    school: schoolNameInput
                })
            });
            if (res.ok) {
                // Force page reload or update context (simplest is reload to refetch context)
                // Ideally update parent state, but a reload ensures strict consistency
                window.location.reload(); 
            } else {
                alert("Gagal menyimpan profil.");
            }
        } catch(e) {
            alert("Terjadi kesalahan koneksi.");
        }
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
                    <div className="py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-neutral">Dashboard Guru</h1>
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                                    teacherProfile.accountType === 'super_admin' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                    teacherProfile.accountType === 'admin' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                                    'bg-slate-100 text-slate-600 border-slate-200'
                                }`}>
                                    {teacherProfile.accountType.replace('_', ' ')}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm font-medium text-gray-500">{teacherProfile.fullName}</span>
                                {teacherProfile.school && (
                                    <>
                                        <span className="text-gray-300">•</span>
                                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                            {teacherProfile.school}
                                        </span>
                                    </>
                                )}
                                <button onClick={() => setIsSchoolModalOpen(true)} className="text-gray-400 hover:text-indigo-600" title="Edit Sekolah">
                                    <PencilIcon className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 self-end md:self-auto">
                            <button onClick={onLogout} className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary font-semibold">
                                <LogoutIcon className="w-5 h-5"/>
                                Logout
                            </button>
                        </div>
                    </div>
                    <nav className="flex border-b -mb-px overflow-x-auto whitespace-nowrap mt-2">
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
                                isEditing={!!editingExam && editingExam.status !== 'DRAFT'} 
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
                        onDuplicateExam={handleDuplicateExam}
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
                        onDuplicateExam={handleDuplicateExam}
                        onDeleteExam={handleDeleteExam}
                    />
                )}
            </main>

            {/* MODALS */}
            <OngoingExamModal 
                exam={selectedOngoingExam} 
                results={results} 
                onClose={() => setSelectedOngoingExam(null)} 
                onAllowContinuation={onAllowContinuation}
                onUpdateExam={handleExamUpdate}
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

            {/* SCHOOL PROFILE MODAL (FORCED IF EMPTY) */}
            {isSchoolModalOpen && (
                 <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in">
                     <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <PencilIcon className="w-8 h-8 text-indigo-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800">Lengkapi Profil</h2>
                            <p className="text-sm text-slate-500 mt-2">
                                Masukkan nama sekolah Anda untuk memulai. Data ini digunakan untuk mengelola akses ujian.
                            </p>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Nama Sekolah</label>
                                <input 
                                    type="text" 
                                    value={schoolNameInput}
                                    onChange={(e) => setSchoolNameInput(e.target.value)}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 placeholder-slate-300"
                                    placeholder="Contoh: SMA Negeri 1 Jakarta"
                                    autoFocus
                                />
                            </div>
                            <button 
                                onClick={handleSaveSchool}
                                className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all shadow-lg active:scale-95"
                            >
                                Simpan & Lanjutkan
                            </button>
                            {/* Only allow close if profile already has school (editing mode) */}
                            {teacherProfile.school && (
                                <button onClick={() => setIsSchoolModalOpen(false)} className="w-full text-slate-400 font-bold text-xs hover:text-slate-600 py-2">
                                    Batal
                                </button>
                            )}
                        </div>
                     </div>
                 </div>
            )}
        </div>
    );
};
