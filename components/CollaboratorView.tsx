import React, { useState } from 'react';
import { Exam, Question, ExamConfig } from '../types';
import { ExamEditor } from './teacher/ExamEditor';
import { OngoingExamModal } from './teacher/DashboardModals';
import { storageService } from '../services/storage';
import { LogoIcon, MoonIcon, SunIcon, LogoutIcon } from './Icons';
import { sanitizeHtml } from './teacher/examUtils';

interface CollaboratorViewProps {
    exam: Exam;
    role: 'editor' | 'viewer';
    token: string;
    onExit: () => void;
    isDarkMode: boolean;
    toggleTheme: () => void;
}

export const CollaboratorView: React.FC<CollaboratorViewProps> = ({ exam, role, token, onExit, isDarkMode, toggleTheme }) => {
    const [questions, setQuestions] = useState<Question[]>(exam.questions);
    const [config, setConfig] = useState<ExamConfig>(exam.config);

    const handleSave = async () => {
        try {
            if (token) {
                const sanitizedQuestions = questions.map(q => {
                    let sanitizedCorrectAnswer = q.correctAnswer;
                    if (q.correctAnswer) {
                        if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
                            try {
                                const parsed = JSON.parse(q.correctAnswer);
                                if (Array.isArray(parsed)) {
                                    sanitizedCorrectAnswer = JSON.stringify(parsed.map(opt => sanitizeHtml(opt)));
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

                // Use specialized collaborator save
                await storageService.saveCollaboratorExam({ ...exam, questions: sanitizedQuestions, config }, token);
            } else {
                 throw new Error("Token kolaborator hilang. Silakan refresh halaman.");
            }
            alert('Perubahan berhasil disimpan!');
        } catch (e: unknown) {
            console.error(e);
            const errorMessage = e instanceof Error ? e.message : 'Gagal menyimpan perubahan.';
            alert(errorMessage);
        }
    };

    if (role === 'viewer') {
        return (
            <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-900 transition-colors duration-300">
                <OngoingExamModal 
                    exam={exam}
                    onClose={onExit}
                    isReadOnly={true}
                    teacherProfile={{ fullName: 'Collaborator', school: exam.authorSchool || '-', id: 'collab', accountType: 'collaborator' }}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-900 flex flex-col transition-colors duration-300">
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40">
                <div className="w-full max-w-full mx-auto px-6 py-4 flex justify-between items-center">
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
            
            <main className="flex-1 p-6 w-full max-w-full mx-auto">
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
