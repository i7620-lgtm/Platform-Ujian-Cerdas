import React, { useState } from 'react';
import type { Result } from '../../../types';
import { ArrowPathIcon, TrashIcon, StopIcon, PencilIcon } from '../../Icons';

interface StudentListProps {
    results: Result[];
    onResetLogin: (resultId: number) => void;
    onForceStop: (resultId: number) => void;
    onEditStudent: (result: Result) => void;
    onDeleteResult: (resultId: number) => void;
    onGenerateToken?: (studentId: string, studentName: string) => void;
    isCollaborator?: boolean;
}

export const StudentList: React.FC<StudentListProps> = ({ results, onResetLogin, onForceStop, onEditStudent, onDeleteResult, isCollaborator = false }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterClass, setFilterClass] = useState('');

    const filteredResults = results
        .filter(r => {
            const matchName = r.student.fullName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchClass = filterClass ? r.student.class === filterClass : true;
            return matchName && matchClass;
        })
        .sort((a, b) => {
            // 1. Nama Sekolah
            const schoolA = a.student.schoolName || '';
            const schoolB = b.student.schoolName || '';
            const schoolCompare = schoolA.localeCompare(schoolB, undefined, { sensitivity: 'base' });
            if (schoolCompare !== 0) return schoolCompare;

            // 2. Kelas
            const classCompare = a.student.class.localeCompare(b.student.class, undefined, { numeric: true, sensitivity: 'base' });
            if (classCompare !== 0) return classCompare;

            // 3. Nomor Absen
            const absA = parseInt(a.student.absentNumber) || 0;
            const absB = parseInt(b.student.absentNumber) || 0;
            return absA - absB;
        });

    const uniqueClasses = Array.from(new Set(results.map(r => r.student.class))).sort();

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex gap-2 w-full sm:w-auto">
                    <input 
                        type="text" 
                        placeholder="Cari nama siswa..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                    />
                    <select 
                        value={filterClass} 
                        onChange={(e) => setFilterClass(e.target.value)}
                        className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Semua Kelas</option>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Total: {filteredResults.length} Siswa
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left min-w-[600px]">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Siswa</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Kelas</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Nilai</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                            {filteredResults.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400 italic">
                                        Tidak ada data siswa yang ditemukan.
                                    </td>
                                </tr>
                            ) : (
                                filteredResults.map((r) => (
                                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{r.student.fullName}</span>
                                                <span className="text-xs text-slate-400 font-mono mt-0.5">#{r.student.absentNumber}</span>
                                                {r.student.schoolName && <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider mt-1">{r.student.schoolName}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                                {r.student.class}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <StatusBadge status={r.status || 'in_progress'} />
                                        </td>
                                        <td className="px-6 py-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                                            {r.status === 'completed' ? r.score : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => onEditStudent(r)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                    title="Edit Data Siswa"
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                
                                                {(r.status === 'in_progress' || !r.status) && (
                                                    <button 
                                                        onClick={() => onForceStop(r.id!)}
                                                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                                                        title="Hentikan Paksa"
                                                    >
                                                        <StopIcon className="w-4 h-4" />
                                                    </button>
                                                )}

                                                <button 
                                                    onClick={() => onResetLogin(r.id!)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                                                    title="Reset Login"
                                                >
                                                    <ArrowPathIcon className="w-4 h-4" />
                                                </button>
                                                
                                                {!isCollaborator && (
                                                    <button 
                                                        onClick={() => onDeleteResult(r.id!)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                                                        title="Hapus Data"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    switch (status) {
        case 'completed':
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Selesai</span>;
        case 'force_closed':
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">Dihentikan</span>;
        case 'pending_grading':
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Menunggu Nilai</span>;
        default:
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse">Mengerjakan</span>;
    }
};
