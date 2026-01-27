
import React, { useState, useEffect, useRef } from 'react';
import type { Exam, Result } from '../../types';
import { XMarkIcon, WifiIcon, LockClosedIcon, CheckCircleIcon, ChartBarIcon, ChevronDownIcon, PlusCircleIcon } from '../Icons';
import { storageService } from '../../services/storage';
import { RemainingTime } from './DashboardViews';

// --- MAIN MODALS ---
interface OngoingExamModalProps {
    exam: Exam | null;
    results: Result[]; // Only for initial render or passing down, but we load dynamically
    onClose: () => void;
    onAllowContinuation: (studentId: string, examCode: string) => void;
    onUpdateExam?: (exam: Exam) => void;
    isReadOnly?: boolean; 
}

export const OngoingExamModal: React.FC<OngoingExamModalProps> = ({ exam, onClose, onAllowContinuation, onUpdateExam, isReadOnly = false }) => {
    const [displayExam, setDisplayExam] = useState<Exam | null>(exam);
    const [selectedClass, setSelectedClass] = useState<string>(''); // Default empty
    const [localResults, setLocalResults] = useState<Result[]>([]);
    
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    
    // Time Extension
    const [isAddTimeOpen, setIsAddTimeOpen] = useState(false);
    const [addTimeValue, setAddTimeValue] = useState<number | ''>('');
    const [isSubmittingTime, setIsSubmittingTime] = useState(false);
    const processingIdsRef = useRef<Set<string>>(new Set());

    useEffect(() => { setDisplayExam(exam); }, [exam]);

    // FETCHING LOGIC: ONLY FETCH WHEN CLASS IS SELECTED
    useEffect(() => {
        if (!displayExam) return;
        if (!selectedClass) {
            setLocalResults([]); // Clear results if no class selected
            return;
        }

        let isMounted = true;
        const fetchLatest = async () => {
            if(!isMounted) return;
            setIsRefreshing(true);
            try {
                // Fetch specifically for this exam AND this class
                const data = await storageService.getResults(displayExam.code, selectedClass);
                
                if (isMounted) {
                    setLocalResults(data);
                    setLastUpdated(new Date());
                }
            } catch (e) { console.error("Refresh failed", e); }
            finally { if(isMounted) setIsRefreshing(false); }
        };

        fetchLatest(); // Initial fetch on selection
        const intervalId = setInterval(fetchLatest, 5000); // 5s interval for specific class is safer
        return () => { isMounted = false; clearInterval(intervalId); };
    }, [displayExam, selectedClass]);

    const COMMON_CLASSES = ["X-IPA-1", "X-IPA-2", "X-IPS-1", "X-IPS-2", "XI-IPA-1", "XI-IPS-1", "XII-IPA-1", "XII-IPS-1"];

    if (!displayExam) return null;

    const handleUnlockClick = async (studentId: string, examCode: string) => {
        processingIdsRef.current.add(studentId);
        // Optimistic update
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
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight truncate">Live Monitor</h2>
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

                    {/* CLASS SELECTOR - CRITICAL FOR SHARDING */}
                    <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <label className="text-xs font-bold text-indigo-900 uppercase tracking-wide whitespace-nowrap">Pilih Kelas:</label>
                            <div className="relative w-full sm:w-64">
                                    <input 
                                    list="classes" 
                                    type="text" 
                                    value={selectedClass} 
                                    onChange={(e) => setSelectedClass(e.target.value)} 
                                    placeholder="Ketik atau Pilih Kelas..."
                                    className="w-full p-2.5 pl-4 pr-10 text-sm font-bold text-slate-700 bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                    />
                                    <datalist id="classes">
                                        {COMMON_CLASSES.map(c => <option key={c} value={c} />)}
                                    </datalist>
                                    <div className="absolute right-3 top-2.5 pointer-events-none text-gray-400"><ChevronDownIcon className="w-4 h-4"/></div>
                            </div>
                        </div>
                        {selectedClass && (
                            <div className="flex gap-4 text-xs font-bold text-slate-600">
                                <span>Total: {localResults.length}</span>
                                <span className="text-emerald-600">Aktif: {localResults.filter(r=>r.status==='in_progress').length}</span>
                                <span className="text-rose-600">Terkunci: {localResults.filter(r=>r.status==='force_submitted').length}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative bg-[#F8FAFC]">
                    <div className="h-full overflow-auto p-4 bg-slate-50/50">
                            {!selectedClass ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-10">
                                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4"><ChartBarIcon className="w-10 h-10 text-indigo-300"/></div>
                                    <h3 className="text-lg font-bold text-slate-700">Pilih Kelas untuk Memantau</h3>
                                    <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">Untuk menjaga performa, silakan pilih kelas spesifik yang ingin Anda pantau secara real-time.</p>
                                </div>
                            ) : localResults.length > 0 ? (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <table className="min-w-full divide-y divide-slate-100">
                                    <thead className="bg-slate-50 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase w-10">No</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Siswa</th>
                                            <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase">Status</th>
                                            <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase">Progress</th>
                                            <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {localResults.sort((a,b) => a.student.fullName.localeCompare(b.student.fullName)).map((r, i) => (
                                            <tr key={r.student.studentId} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 text-xs font-mono text-slate-400">{i+1}</td>
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-sm text-slate-800">{r.student.fullName}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono">Absen: {r.student.absentNumber}</div>
                                                </td>
                                                <td className="px-4 py-3 text-center">{renderStatusBadge(r.status||'')}</td>
                                                <td className="px-4 py-3 text-center">
                                                    {['completed','force_submitted'].includes(r.status||'') ? (
                                                        <span className="font-black text-lg text-slate-800">{r.score}</span>
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
                            </div>
                            ) : (
                                <div className="text-center py-20 text-slate-400 italic">Belum ada siswa aktif di kelas {selectedClass}.</div>
                            )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// FinishedExamModal remains largely same but could benefit from class filter logic too if needed
export const FinishedExamModal: React.FC<any> = () => {
    return <div className="p-4 bg-white">Laporan Selesai (Gunakan dashboard utama)</div>;
};
