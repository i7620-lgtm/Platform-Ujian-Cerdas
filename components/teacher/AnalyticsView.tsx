 
import React, { useState, useEffect, useCallback } from 'react';
import { ChartBarIcon, ArrowPathIcon, TrashIcon, PencilIcon } from '../Icons';
import { storageService } from '../../services/storage';
import type { ExamSummary } from '../../types';
import { EXAM_TYPES } from './constants';

// Simple Icon for AI Button
const SparklesIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
);

const AnalyticsView: React.FC = () => {
    const [summaries, setSummaries] = useState<ExamSummary[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [filterRegion, setFilterRegion] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [aiResult, setAiResult] = useState<string | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    const [editingSummary, setEditingSummary] = useState<ExamSummary | null>(null);
    const [editForm, setEditForm] = useState<Partial<ExamSummary>>({});

    const fetchData = useCallback(async (region: string, subject: string) => {
        setIsLoading(true);
        const data = await storageService.getAnalyticsData({ region, subject });
        setSummaries(data);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchData('', '');
    }, [fetchData]);

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === summaries.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(summaries.map(s => s.id)));
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Apakah Anda yakin ingin menghapus data statistik ini? Tindakan ini tidak dapat dibatalkan.")) return;
        
        try {
            await storageService.deleteAnalyticsData(id);
            setSummaries(prev => prev.filter(s => s.id !== id));
            // Also remove from selection if selected
            if (selectedIds.has(id)) {
                const newSet = new Set(selectedIds);
                newSet.delete(id);
                setSelectedIds(newSet);
            }
        } catch (error: any) {
            alert("Gagal menghapus data: " + error.message);
        }
    };

    const handleEdit = (summary: ExamSummary) => {
        setEditingSummary(summary);
        setEditForm({
            school_name: summary.school_name,
            region: summary.region,
            exam_subject: summary.exam_subject,
            exam_type: summary.exam_type,
            total_participants: summary.total_participants,
            average_score: summary.average_score
        });
    };

    const handleSaveEdit = async () => {
        if (!editingSummary) return;
        
        try {
            await storageService.updateAnalyticsData(editingSummary.exam_code, editForm);
            setSummaries(prev => prev.map(s => s.id === editingSummary.id ? { ...s, ...editForm } : s));
            setEditingSummary(null);
        } catch (error: any) {
            alert("Gagal menyimpan perubahan: " + error.message);
        }
    };

    const handleGenerateAI = async () => {
        const selectedData = summaries.filter(s => selectedIds.has(s.id));
        if (selectedData.length === 0) return;
        
        setIsAiLoading(true);
        const report = await storageService.generateAIAnalysis(selectedData);
        setAiResult(report);
        setIsAiLoading(false);
    };

    return (
        <div className="space-y-6 animate-fade-in relative">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <ChartBarIcon className="w-6 h-6 text-indigo-600"/> Analisis Daerah (Super Admin)
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Analisis performa sekolah dan generate laporan berbasis AI.</p>
                </div>
                <div className="flex gap-2">
                    <input 
                        placeholder="Filter Wilayah/Sekolah..." 
                        value={filterRegion} 
                        onChange={e => setFilterRegion(e.target.value)}
                        className="px-4 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    />
                    <button onClick={() => fetchData(filterRegion, filterSubject)} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200"><ArrowPathIcon className="w-5 h-5 text-slate-600"/></button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                        <tr>
                            <th className="px-6 py-4 w-10">
                                <input type="checkbox" checked={summaries.length > 0 && selectedIds.size === summaries.length} onChange={toggleSelectAll} className="rounded text-indigo-600 focus:ring-indigo-500"/>
                            </th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase">Sekolah</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase">Daerah</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase">Mapel</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase">Kode Soal</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase">Jenis Evaluasi</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase text-center">Rerata</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase text-center">Partisipan</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase text-center">Tanggal</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                        {isLoading ? <tr><td colSpan={9} className="p-8 text-center">Loading...</td></tr> : summaries.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td className="px-6 py-4"><input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSelect(s.id)} className="rounded text-indigo-600 focus:ring-indigo-500"/></td>
                                <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{s.school_name}</td>
                                <td className="px-6 py-4 text-sm">{s.region || '-'}</td>
                                <td className="px-6 py-4 text-sm">{s.exam_subject}</td>
                                <td className="px-6 py-4 text-sm font-mono text-slate-500">{s.exam_code}</td>
                                <td className="px-6 py-4 text-sm">
                                    <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-medium">
                                        {s.exam_type || '-'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center font-bold">{s.average_score}</td>
                                <td className="px-6 py-4 text-center text-sm">{s.total_participants}</td>
                                <td className="px-6 py-4 text-center text-xs text-slate-500">{new Date(s.exam_date).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button 
                                            onClick={() => handleEdit(s)}
                                            className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                            title="Edit Data"
                                        >
                                            <PencilIcon className="w-4 h-4"/>
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(s.id)}
                                            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                            title="Hapus Data"
                                        >
                                            <TrashIcon className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="sticky bottom-6 flex justify-center">
                <button 
                    onClick={handleGenerateAI} 
                    disabled={selectedIds.size === 0 || isAiLoading}
                    className={`px-8 py-4 rounded-2xl font-bold shadow-xl flex items-center gap-3 transition-all transform active:scale-95 ${selectedIds.size > 0 ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-indigo-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                >
                    {isAiLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <SparklesIcon className="w-5 h-5"/>}
                    <span>{isAiLoading ? 'Sedang Menganalisis...' : `Analisis ${selectedIds.size} Sekolah dengan AI`}</span>
                </button>
            </div>

            {aiResult && (
                <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col border border-white dark:border-slate-700 animate-slide-in-up">
                        <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-indigo-50 dark:bg-slate-900 rounded-t-2xl">
                            <h3 className="font-bold text-lg text-indigo-900 dark:text-indigo-300 flex items-center gap-2"><SparklesIcon className="w-5 h-5"/> Laporan Analisis AI</h3>
                            <button onClick={() => setAiResult(null)} className="p-2 bg-white dark:bg-slate-800 rounded-full text-slate-400 hover:text-rose-500 transition-colors">Tutup</button>
                        </div>
                        {/* Modified Container for Generative Visuals */}
                        <div className="p-8 overflow-y-auto bg-slate-50 dark:bg-slate-900/50 flex-1">
                            {/* Prose max-w-none ensures tables and charts take full width */}
                            <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-indigo-600" dangerouslySetInnerHTML={{ __html: aiResult.replace(/\n/g, '<br/>') }} /> 
                        </div>
                    </div>
                </div>
            )}

            {editingSummary && (
                <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6 animate-scale-in border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">Edit Data Statistik</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nama Sekolah</label>
                                <input 
                                    className="w-full p-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    value={editForm.school_name || ''}
                                    onChange={e => setEditForm({...editForm, school_name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Daerah</label>
                                <input 
                                    className="w-full p-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    value={editForm.region || ''}
                                    onChange={e => setEditForm({...editForm, region: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Mata Pelajaran</label>
                                <input 
                                    className="w-full p-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    value={editForm.exam_subject || ''}
                                    onChange={e => setEditForm({...editForm, exam_subject: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Jenis Evaluasi</label>
                                <select 
                                    className="w-full p-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    value={editForm.exam_type || ''}
                                    onChange={e => setEditForm({...editForm, exam_type: e.target.value})}
                                >
                                    <option value="">Pilih Jenis</option>
                                    {EXAM_TYPES.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Partisipan</label>
                                    <input 
                                        type="number"
                                        className="w-full p-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                        value={editForm.total_participants || 0}
                                        onChange={e => setEditForm({...editForm, total_participants: Number(e.target.value)})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Rerata Nilai</label>
                                    <input 
                                        type="number"
                                        step="0.01"
                                        className="w-full p-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                        value={editForm.average_score || 0}
                                        onChange={e => setEditForm({...editForm, average_score: Number(e.target.value)})}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setEditingSummary(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm font-bold">Batal</button>
                            <button onClick={handleSaveEdit} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none">Simpan Perubahan</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsView;
