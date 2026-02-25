import React, { useState } from 'react';
import { Exam, Question, ExamConfig } from '../types';
import { ExamEditor } from './teacher/ExamEditor';
import { OngoingExamModal } from './teacher/DashboardModals';
import { storageService } from '../services/storage';
import { LogoIcon, MoonIcon, SunIcon, LogoutIcon } from './Icons';

interface CollaboratorViewProps {
    exam: Exam;
    role: 'editor' | 'viewer';
    onExit: () => void;
    isDarkMode: boolean;
    toggleTheme: () => void;
}

export const CollaboratorView: React.FC<CollaboratorViewProps> = ({ exam, role, onExit, isDarkMode, toggleTheme }) => {
    const [questions, setQuestions] = useState<Question[]>(exam.questions);
    const [config, setConfig] = useState<ExamConfig>(exam.config);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updatedExam = { ...exam, questions, config };
            await storageService.saveExam(updatedExam);
            alert('Perubahan berhasil disimpan!');
        } catch (e) {
            alert('Gagal menyimpan perubahan.');
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    if (role === 'viewer') {
        return (
            <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-900 transition-colors duration-300">
                <OngoingExamModal 
                    exam={exam}
                    onClose={onExit}
                    onAllowContinuation={() => {}}
                    isReadOnly={true}
                    teacherProfile={{ fullName: 'Collaborator', school: exam.authorSchool || '-', id: 'collab', accountType: 'collaborator' }}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-900 flex flex-col transition-colors duration-300">
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                            <LogoIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="font-bold text-slate-900 dark:text-white">Mode Kolaborator</h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Mengedit: <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">{exam.code}</span></p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                         <button 
                            onClick={toggleTheme} 
                            className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                        >
                            {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                        </button>
                        <button onClick={onExit} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 uppercase tracking-wider transition-colors">
                            <LogoutIcon className="w-4 h-4" /> Keluar
                        </button>
                    </div>
                </div>
            </header>
            
            <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
                <ExamEditor 
                    questions={questions} 
                    setQuestions={setQuestions} 
                    config={config} 
                    setConfig={setConfig} 
                    isEditing={true} 
                    onSave={handleSave} 
                    onSaveDraft={() => {}} 
                    onCancel={onExit} 
                    generatedCode={exam.code} 
                    onReset={() => {}}
                />
            </main>
        </div>
    );
};
