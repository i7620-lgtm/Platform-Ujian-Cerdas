
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Exam, Result } from '../../types';
import { XMarkIcon, WifiIcon, LockClosedIcon, CheckCircleIcon, ChartBarIcon, ChevronDownIcon, PlusCircleIcon } from '../Icons';
import { storageService } from '../../services/storage';
import { RemainingTime } from './DashboardViews';

// --- STATISTIK WIDGET COMPONENTS ---
const StatWidget: React.FC<{ label: string; value: string | number; color: string; icon?: React.FC<any> }> = ({ label, value, color, icon: Icon }) => (
    <div className={`bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4`}>
        <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-${color.split('-')[1]}-600`}>
            {Icon ? <Icon className={`w-6 h-6 text-${color.split('-')[1]}-600`} /> : <ChartBarIcon className="w-6 h-6" />}
        </div>
        <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-black text-slate-800">{value}</p>
        </div>
    </div>
);

const QuestionAnalysisItem: React.FC<{ q: any; index: number; stats: any }> = ({ q, index, stats }) => {
    const difficultyColor = stats.correctRate > 80 ? 'bg-emerald-100 text-emerald-700' : stats.correctRate > 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';
    return (
        <div className="p-4 border border-slate-100 rounded-xl bg-white hover:shadow-md transition-shadow">
            <div className="flex justify-between mb-2">
                <span className="font-bold text-slate-700">Soal No. {index + 1}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${difficultyColor}`}>
                    {stats.correctRate}% Benar
                </span>
            </div>
            <p className="text-xs text-slate-500 line-clamp-2 mb-3 font-serif">{q.questionText}</p>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full" style={{ width: `${stats.correctRate}%` }}></div>
            </div>
        </div>
    );
};

// --- MAIN MODALS ---
interface OngoingExamModalProps {
    exam: Exam | null;
    results: Result[]; 
    onClose: () => void;
    onAllowContinuation: (studentId: string, examCode: string) => void;
    onUpdateExam?: (exam: Exam) => void;
    isReadOnly?: boolean; 
}

export const OngoingExamModal: React.FC<OngoingExamModalProps> = ({ exam, onClose, onAllowContinuation, onUpdateExam, isReadOnly = false }) => {
    const [displayExam, setDisplayExam] = useState<Exam | null>(exam);
    const [selectedClass, setSelectedClass] = useState<string>('ALL'); // Default ALL untuk Global View
    const [localResults, setLocalResults] = useState<Result[]>([]);
    const [activeTab, setActiveTab] = useState<'MONITOR' | 'ANALYSIS'>('MONITOR');
    
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    
    // Time Extension
    const [isAddTimeOpen, setIsAddTimeOpen] = useState(false);
    const [addTimeValue, setAddTimeValue] = useState<number | ''>('');
    const [isSubmittingTime, setIsSubmittingTime] = useState(false);
    const processingIdsRef = useRef<Set<string>>(new Set());

    useEffect(() => { setDisplayExam(exam); }, [exam]);

    // FETCHING LOGIC
    useEffect(() => {
        if (!displayExam) return;

        let isMounted = true;
        const fetchLatest = async () => {
            if(!isMounted) return;
            setIsRefreshing(true);
            try {
                // Fetch data (Support global merge di backend jika class='ALL')
                const data = await storageService.getResults(displayExam.code, selectedClass === 'ALL' ? '' : selectedClass);
                
                if (isMounted) {
                    setLocalResults(data);
                    setLastUpdated(new Date());
                }
            } catch (e) { console.error("Refresh failed", e); }
            finally { if(isMounted) setIsRefreshing(false); }
        };

        fetchLatest(); 
        const intervalId = setInterval(fetchLatest, 10000); // 10s interval is safer for global fetch
        return () => { isMounted = false; clearInterval(intervalId); };
    }, [displayExam, selectedClass]);

    // --- ANALYTICS CALCULATION ---
    const analytics = useMemo(() => {
        if (!localResults.length || !displayExam) return null;
        const completed = localResults.filter(r => ['completed', 'force_submitted'].includes(r.status || ''));
        if (completed.length === 0) return null;

        const scores = completed.map(r => r.score);
        const sum = scores.reduce((a, b) => a + b, 0);
        const avg = Math.round(sum / scores.length);
        const max = Math.max(...scores);
        const min = Math.min(...scores);

        // Question Analysis
        const questionStats = displayExam.questions.map(q => {
            let correct = 0;
            let totalAnswered = 0;
            completed.forEach(r => {
                if (r.answers[q.id]) {
                    totalAnswered++;
                    // Basic check logic (simplified for stats view)
                    if (q.questionType === 'MULTIPLE_CHOICE' && r.answers[q.id] === q.correctAnswer) correct++;
                }
            });
            return {
                id: q.id,
                correctRate: totalAnswered > 0 ? Math.round((correct / totalAnswered) * 100) : 0
            };
        });

        return { avg, max, min, completedCount: completed.length, questionStats };
    }, [localResults, displayExam]);

    const COMMON_CLASSES = ["ALL", "X-IPA-1", "X-IPA-2", "X-IPS-1", "X-IPS-2", "XI-IPA-1", "XI-IPS-1", "XII-IPA-1", "XII-IPS-1"];

    if (!displayExam) return null;

    const handleUnlockClick = async (studentId: string, examCode: string) => {
        processingIdsRef.current.add(studentId);
        setLocalResults(prev => prev.map(r => r.student.studentId === studentId ? { ...r, status: 'in_progress' } : r));
        try {
            await storageService.unlockStudentExam(examCode, studentId);
            onAllowContinuation(studentId, examCode);
        } catch (error) { alert("Gagal koneksi."); } 
        finally { setTimeout(() => processingIdsRef.current.delete(studentId), 3000); }
    };

    const handleAddTimeSubmit = async () => {
        if (!addTimeValue || typeof addTimeValue !== 'number' || !displayExam) return;
        if (!confirm(`Tambahkan ${addTimeValue} menit?`)) return;
        setIsSubmittingTime(true);
        try {
            await storageService.extendExamTime(displayExam.code, addTimeValue);
            const newLimit = displayExam.config.timeLimit + addTimeValue;
            setDisplayExam({...displayExam, config: {...displayExam.config, timeLimit: newLimit}});
            if(onUpdateExam) onUpdateExam({...displayExam, config: {...displayExam.config, timeLimit: newLimit}});
            alert("Waktu ditambahkan.");
            setIsAddTimeOpen(false);
        } catch(e) { alert("Gagal."); } finally { setIsSubmittingTime(false); }
    };

    const renderStatusBadge = (status: string) => {
        if (status === 'in_progress') return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200"><span className="animate-ping w-2 h-2 rounded-full bg-emerald-500 opacity-75"></span>Kerja</span>;
        if (status === 'completed') return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200"><CheckCircleIcon className="w-3 h-3"/>Selesai</span>;
        if (status === 'force_submitted') return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 animate-pulse"><LockClosedIcon className="w-3 h-3"/>Kunci</span>;
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-400"><WifiIcon className="w-3 h-3"/>Offline</span>;
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 z-50 animate-fade-in">
            <div className="bg-[#F8FAFC] sm:rounded-2xl shadow-2xl w-full max-w-[95vw] h-full sm:h-[92vh] flex flex-col overflow-hidden border-0 sm:border border-white/20 relative">
                
                {isAddTimeOpen && (
                    <div className="absolute top-20 right-4 sm:right-20 z-[60] bg-white rounded-xl shadow-2xl border border-indigo-100 p-4 w-72 animate-fade-in">
                        <div className="flex justify-between items-center mb-3"><h4 className="text-sm font-bold text-slate-800">Tambah Waktu</h4><button onClick={()=>setIsAddTimeOpen(false)}><XMarkIcon className="w-4 h-4"/></button></div>
                        <input type="number" placeholder="Menit" value={addTimeValue} onChange={e=>setAddTimeValue(parseInt(e.target.value))} className="w-full p-2 border rounded mb-2"/>
                        <button onClick={handleAddTimeSubmit} disabled={isSubmittingTime} className="w-full bg-slate-900 text-white font-bold py-2 rounded">Simpan</button>
                    </div>
                )}

                <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex-shrink-0 z-20 shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                        <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-3">
                                <div className="bg-slate-800 text-white p-2.5 rounded-xl shadow-lg"><WifiIcon className="w-6 h-6"/></div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight truncate">Live Monitor & Analisis</h2>
                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mt-0.5">
                                        <span className="bg-slate-100 px-2 py-0.5 rounded border font-mono font-bold">{displayExam.code}</span>
                                        <span>•</span>
                                        <RemainingTime exam={displayExam} />
                                        <span>•</span>
                                        {isRefreshing ? <span className="text-blue-600 animate-pulse">Syncing...</span> : <span>Updated: {lastUpdated.toLocaleTimeString()}</span>}
                                    </div>
                                </div>
                             </div>
                        </div>
                        <div className="flex items-center gap-2">
                             {!isReadOnly && <button onClick={()=>setIsAddTimeOpen(!isAddTimeOpen)} className="p-2 bg-indigo-50 text-indigo-700 rounded-xl"><PlusCircleIcon className="w-5 h-5"/></button>}
                             <button onClick={onClose} className="p-2 bg-white border rounded-xl"><XMarkIcon className="w-5 h-5 text-slate-400"/></button>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-end sm:items-center">
                        {/* TABS SWITCHER */}
                        <div className="flex p-1 bg-slate-100 rounded-xl">
                            <button onClick={() => setActiveTab('MONITOR')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab==='MONITOR' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Live Monitor</button>
                            <button onClick={() => setActiveTab('ANALYSIS')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab==='ANALYSIS' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Analisis Statistik</button>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <label className="text-xs font-bold text-indigo-900 uppercase tracking-wide whitespace-nowrap">Kelas:</label>
                            <div className="relative w-full sm:w-48">
                                    <select 
                                        value={selectedClass} 
                                        onChange={(e) => setSelectedClass(e.target.value)} 
                                        className="w-full p-2 pl-3 pr-8 text-sm font-bold text-slate-700 bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm appearance-none"
                                    >
                                        <option value="ALL">SEMUA KELAS</option>
                                        {COMMON_CLASSES.filter(c => c !== 'ALL').map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <div className="absolute right-3 top-2.5 pointer-events-none text-gray-400"><ChevronDownIcon className="w-4 h-4"/></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative bg-[#F8FAFC]">
                    <div className="h-full overflow-auto p-4 bg-slate-50/50">
                        {activeTab === 'MONITOR' ? (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                {localResults.length > 0 ? (
                                    <table className="min-w-full divide-y divide-slate-100">
                                        <thead className="bg-slate-50 sticky top-0 z-10">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase w-10">No</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Siswa</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Kelas</th>
                                                <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase">Status</th>
                                                <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase">Nilai/Progres</th>
                                                <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {localResults.sort((a,b) => a.student.fullName.localeCompare(b.student.fullName)).map((r, i) => (
                                                <tr key={r.student.studentId} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 text-xs font-mono text-slate-400">{i+1}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-sm text-slate-800">{r.student.fullName}</div>
                                                        <div className="text-[10px] text-slate-400 font-mono">ID: {r.student.studentId}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs font-bold text-slate-600">{r.student.class}</td>
                                                    <td className="px-4 py-3 text-center">{renderStatusBadge(r.status||'')}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        {['completed','force_submitted'].includes(r.status||'') ? (
                                                            <span className={`font-black text-lg ${r.score >= 70 ? 'text-emerald-600' : 'text-slate-800'}`}>{r.score}</span>
                                                        ) : (
                                                            <div className="w-24 h-1.5 bg-slate-100 rounded-full mx-auto overflow-hidden">
                                                                <div className="h-full bg-blue-500" style={{width: `${Math.round((Object.keys(r.answers).length / displayExam.questions.filter(q=>q.questionType!=='INFO').length)*100)}%`}}></div>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {(r.status === 'force_submitted' || processingIdsRef.current.has(r.student.studentId)) && !isReadOnly && (
                                                            <button onClick={() => handleUnlockClick(r.student.studentId, r.examCode)} disabled={processingIdsRef.current.has(r.student.studentId)} className="text-[10px] font-bold bg-emerald-500 text-white px-3 py-1.5 rounded hover:bg-emerald-600 shadow-sm">
                                                                {processingIdsRef.current.has(r.student.studentId) ? '...' : 'BUKA'}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="text-center py-20 text-slate-400 italic">Belum ada data siswa.</div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {analytics ? (
                                    <>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <StatWidget label="Rata-Rata" value={analytics.avg} color="bg-blue-100" />
                                            <StatWidget label="Tertinggi" value={analytics.max} color="bg-emerald-100" />
                                            <StatWidget label="Terendah" value={analytics.min} color="bg-rose-100" />
                                            <StatWidget label="Selesai" value={`${analytics.completedCount} Siswa`} color="bg-purple-100" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-800 mb-4">Analisis Butir Soal</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {analytics.questionStats.map((s, i) => {
                                                    const q = displayExam.questions.find(qu => qu.id === s.id);
                                                    if (!q || q.questionType === 'INFO') return null;
                                                    return <QuestionAnalysisItem key={s.id} q={q} index={i} stats={s} />;
                                                })}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                                        <p className="text-gray-500 font-medium">Belum ada data nilai yang cukup untuk analisis.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const FinishedExamModal: React.FC<any> = () => {
    return <div className="p-4 bg-white">Laporan Selesai (Gunakan dashboard utama)</div>;
};
