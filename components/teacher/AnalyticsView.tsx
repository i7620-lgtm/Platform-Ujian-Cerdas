 
import React, { useState, useEffect } from 'react';
import { ChartBarIcon, TableCellsIcon, CheckCircleIcon, ArrowPathIcon } from '../Icons';
import { storageService } from '../../services/storage';
import type { ExamSummary } from '../../types';

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

    const fetchData = async () => {
        setIsLoading(true);
        const data = await storageService.getAnalyticsData({ region: filterRegion, subject: filterSubject });
        setSummaries(data);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

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
                    <button onClick={fetchData} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200"><ArrowPathIcon className="w-5 h-5 text-slate-600"/></button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                        <tr>
                            <th className="px-6 py-4 w-10">
                                <input type="checkbox" checked={summaries.length > 0 && selectedIds.size === summaries.length} onChange={toggleSelectAll} className="rounded text-indigo-600 focus:ring-indigo-500"/>
                            </th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase">Sekolah</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase">Mapel</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase text-center">Rerata</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase text-center">Partisipan</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase text-center">Tanggal</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                        {isLoading ? <tr><td colSpan={6} className="p-8 text-center">Loading...</td></tr> : summaries.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td className="px-6 py-4"><input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSelect(s.id)} className="rounded text-indigo-600 focus:ring-indigo-500"/></td>
                                <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{s.school_name}</td>
                                <td className="px-6 py-4 text-sm">{s.exam_subject}</td>
                                <td className="px-6 py-4 text-center font-bold">{s.average_score}</td>
                                <td className="px-6 py-4 text-center text-sm">{s.total_participants}</td>
                                <td className="px-6 py-4 text-center text-xs text-slate-500">{new Date(s.exam_date).toLocaleDateString()}</td>
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
        </div>
    );
};

export default AnalyticsView;
