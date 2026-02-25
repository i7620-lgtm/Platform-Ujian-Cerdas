
import React, { useState } from 'react';
import type { Exam } from '../../../types';
import { CalendarDaysIcon, ClockIcon, PencilIcon, EnvelopeIcon, UserIcon } from '../../Icons';
import { MetaBadge } from './SharedComponents';
import { InvitationModal } from '../../InvitationModal';
import { CollaboratorModal } from '../CollaboratorModal';

interface UpcomingExamsViewProps {
    exams: Exam[];
    onEditExam: (exam: Exam) => void;
    teacherName?: string;
    schoolName?: string;
    onRefresh?: () => void;
}

export const UpcomingExamsView: React.FC<UpcomingExamsViewProps> = ({ exams, onEditExam, teacherName, schoolName, onRefresh }) => {
    const [selectedInviteExam, setSelectedInviteExam] = useState<Exam | null>(null);
    const [selectedCollaboratorExam, setSelectedCollaboratorExam] = useState<Exam | null>(null);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <CalendarDaysIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-neutral dark:text-white">Ujian Akan Datang</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Daftar semua ujian yang telah dijadwalkan.</p>
                </div>
            </div>
            
            {exams.length > 0 ? (
                <div className="space-y-4">
                    {exams.map(exam => (
                        <div key={exam.code} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 group">
                            <div className="flex items-start gap-5">
                                <div className="bg-blue-50 dark:bg-blue-900/20 w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800 shrink-0">
                                    <span className="text-[10px] font-bold uppercase">{new Date(exam.config.date).toLocaleDateString('id-ID', { month: 'short' })}</span>
                                    <span className="text-xl font-black leading-none">{new Date(exam.config.date).getDate()}</span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-lg text-neutral dark:text-white">{exam.config.subject || "Tanpa Judul"}</h3>
                                        <span className="text-xs font-mono text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-700 px-1.5 py-0.5 rounded">{exam.code}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <MetaBadge text={exam.config.classLevel} colorClass="bg-gray-100 text-gray-600" />
                                        <MetaBadge text={exam.config.examType} colorClass="bg-gray-100 text-gray-600" />
                                        {exam.config.targetClasses && exam.config.targetClasses.length > 0 && (
                                            <MetaBadge text={exam.config.targetClasses.join(', ')} colorClass="bg-orange-50 text-orange-700 border-orange-100" />
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-3 font-medium">
                                        <span className="flex items-center gap-1.5"><ClockIcon className="w-3.5 h-3.5"/> {exam.config.startTime} Waktu Setempat</span>
                                        <span className="text-gray-300 dark:text-slate-600">•</span>
                                        <span>{exam.config.timeLimit} Menit</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex gap-2 self-end md:self-center w-full md:w-auto flex-wrap">
                                <button 
                                    onClick={() => setSelectedCollaboratorExam(exam)}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-5 py-2.5 text-sm rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all font-bold shadow-sm border border-emerald-100 dark:border-emerald-800"
                                    title="Kelola Kolaborator"
                                >
                                    <UserIcon className="w-4 h-4" /> 
                                    <span className="hidden lg:inline">Tim</span>
                                </button>
                                <button 
                                    onClick={() => setSelectedInviteExam(exam)}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-5 py-2.5 text-sm rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all font-bold shadow-sm border border-indigo-100 dark:border-indigo-800"
                                >
                                    <EnvelopeIcon className="w-4 h-4" /> 
                                    Undangan
                                </button>
                                <button 
                                    onClick={() => onEditExam(exam)} 
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white dark:bg-slate-700 border-2 border-gray-100 dark:border-slate-600 text-gray-600 dark:text-slate-300 px-5 py-2.5 text-sm rounded-xl hover:border-primary dark:hover:border-primary hover:text-primary dark:hover:text-white transition-all font-bold shadow-sm"
                                >
                                    <PencilIcon className="w-4 h-4" /> 
                                    Edit
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
                    <div className="bg-gray-50 dark:bg-slate-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CalendarDaysIcon className="h-8 w-8 text-gray-300 dark:text-slate-500" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Tidak Ada Ujian Terjadwal</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Buat ujian baru untuk memulai.</p>
                </div>
            )}

            {/* Modal Undangan Spesifik */}
            <InvitationModal 
                isOpen={!!selectedInviteExam}
                onClose={() => setSelectedInviteExam(null)}
                exam={selectedInviteExam}
                teacherName={teacherName}
                schoolName={schoolName}
            />

            {/* Modal Kolaborator */}
            {selectedCollaboratorExam && (
                <CollaboratorModal
                    exam={exams.find(e => e.code === selectedCollaboratorExam.code) || selectedCollaboratorExam}
                    onClose={() => setSelectedCollaboratorExam(null)}
                    onUpdate={() => {
                        if (onRefresh) onRefresh();
                    }}
                />
            )}
        </div>
    );
};
