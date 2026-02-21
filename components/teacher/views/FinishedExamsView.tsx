import React from 'react';
import type { Exam } from '../../../types';
import { ChartBarIcon, TrashIcon, CheckCircleIcon, CloudArrowUpIcon, DocumentDuplicateIcon } from '../../Icons';
import { MetaBadge } from './SharedComponents';

interface FinishedExamsProps {
    exams: Exam[];
    onSelectExam: (exam: Exam) => void;
    onDuplicateExam: (exam: Exam) => void;
    onDeleteExam: (exam: Exam) => void;
    onArchiveExam: (exam: Exam) => void; 
}

export const FinishedExamsView: React.FC<FinishedExamsProps> = ({ exams, onSelectExam, onDuplicateExam, onDeleteExam, onArchiveExam }) => {
    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex items-center gap-2"><div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg"><ChartBarIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" /></div><div><h2 className="text-2xl font-bold text-neutral dark:text-white">Ujian Selesai</h2><p className="text-sm text-gray-500 dark:text-slate-400">Riwayat dan hasil ujian yang telah berakhir.</p></div></div>
            {exams.length > 0 ? (
                <div className="space-y-4">
                    {exams.map(exam => (
                        <div key={exam.code} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-md hover:border-gray-300 dark:hover:border-slate-500 group relative">
                            {/* Delete Button */}
                            <button type="button" onClick={(e) => { e.stopPropagation(); onDeleteExam(exam); }} className="absolute top-3 right-3 p-2 bg-white dark:bg-slate-700 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 border border-gray-100 dark:border-slate-600 hover:border-red-100 dark:hover:border-red-900 rounded-full transition-all shadow-sm z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100" title="Hapus Data Ujian & Hasil"><TrashIcon className="w-4 h-4" /></button>

                            <div className="flex items-start gap-4">
                                <div className="bg-gray-50 dark:bg-slate-700 p-3 rounded-xl border border-gray-100 dark:border-slate-600"><CheckCircleIcon className="w-6 h-6 text-gray-400 dark:text-slate-500 group-hover:text-green-500 dark:group-hover:text-green-400 transition-colors" /></div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1"><h3 className="font-bold text-lg text-neutral dark:text-white">{exam.config.subject || exam.code}</h3><span className="text-xs font-mono text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-700 px-1.5 py-0.5 rounded">{exam.code}</span></div>
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <MetaBadge text={exam.config.classLevel} colorClass="bg-gray-100 text-gray-600" />
                                        <MetaBadge text={exam.config.examType} colorClass="bg-gray-100 text-gray-600" />
                                        {exam.config.targetClasses && exam.config.targetClasses.length > 0 && (
                                            <MetaBadge text={exam.config.targetClasses.join(', ')} colorClass="bg-orange-50 text-orange-700 border-orange-100" />
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-400 dark:text-slate-500">Berakhir pada: {new Date(exam.config.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 self-end md:self-center w-full md:w-auto">
                                <button onClick={() => onArchiveExam(exam)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-4 py-2.5 text-sm rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors font-bold shadow-sm border border-indigo-100 dark:border-indigo-800" title="Simpan ke Cloud & Hapus SQL"><CloudArrowUpIcon className="w-4 h-4" /><span className="md:hidden lg:inline">Finalisasi & Arsip</span></button>
                                <button onClick={() => onDuplicateExam(exam)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-4 py-2.5 text-sm rounded-xl hover:bg-gray-100 dark:hover:bg-slate-600 hover:text-gray-900 dark:hover:text-white transition-colors font-bold shadow-sm border border-gray-200 dark:border-slate-600" title="Gunakan Kembali Soal"><DocumentDuplicateIcon className="w-4 h-4" /><span className="md:hidden lg:inline">Reuse</span></button>
                                <button onClick={() => onSelectExam(exam)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900 dark:bg-indigo-600 text-white px-5 py-2.5 text-sm rounded-xl hover:bg-black dark:hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-gray-200 dark:shadow-indigo-900/30 transform active:scale-95"><ChartBarIcon className="w-4 h-4" /> Lihat Hasil</button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700"><div className="bg-gray-50 dark:bg-slate-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><ChartBarIcon className="h-8 w-8 text-gray-300 dark:text-slate-500" /></div><h3 className="text-base font-bold text-gray-900 dark:text-white">Belum Ada Riwayat</h3><p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Hasil ujian yang telah selesai akan muncul di sini.</p></div>
            )}
        </div>
    );
};
