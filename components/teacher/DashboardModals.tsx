import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Exam, Result, TeacherProfile, Question } from '../../types';
import { XMarkIcon, WifiIcon, LockClosedIcon, CheckCircleIcon, ChartBarIcon, ChevronDownIcon, PlusCircleIcon, ShareIcon, ArrowPathIcon, QrCodeIcon, DocumentDuplicateIcon, ChevronUpIcon, EyeIcon, UserIcon, TableCellsIcon, ListBulletIcon, ExclamationTriangleIcon, DocumentArrowUpIcon, ClockIcon, SignalIcon, TrashIcon } from '../Icons';
import { storageService } from '../../services/storage';
import { supabase } from '../../lib/supabase';
import { RemainingTime, QuestionAnalysisItem, StatWidget } from './DashboardViews';
import { StudentResultPage } from '../StudentResultPage';
import { calculateAggregateStats, parseList } from './examUtils';

// --- OngoingExamModal ---
interface OngoingExamModalProps { exam: Exam | null; teacherProfile?: TeacherProfile; onClose: () => void; onAllowContinuation: (studentId: string, examCode: string) => void; onUpdateExam?: (exam: Exam) => void; isReadOnly?: boolean; }
export const OngoingExamModal: React.FC<OngoingExamModalProps> = (props) => { 
    const { exam, onClose, teacherProfile, onAllowContinuation, onUpdateExam, isReadOnly } = props;
    
    const [displayExam, setDisplayExam] = useState<Exam | null>(exam);
    const [selectedClass, setSelectedClass] = useState<string>('ALL'); 
    const [localResults, setLocalResults] = useState<Result[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isAddTimeOpen, setIsAddTimeOpen] = useState(false);
    const [addTimeValue, setAddTimeValue] = useState<number | ''>('');
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isJoinQrModalOpen, setIsJoinQrModalOpen] = useState(false);
    const [generatedTokenData, setGeneratedTokenData] = useState<{name: string, token: string} | null>(null);

    const processingIdsRef = useRef<Set<string>>(new Set());
    const broadcastProgressRef = useRef<Record<string, { answered: number, total: number, timestamp: number }>>({});

    useEffect(() => { setDisplayExam(exam); }, [exam]);

    const fetchLatest = async (silent = false) => {
        if (!displayExam) return;
        if (!silent) setIsRefreshing(true);
        try {
            const data = await storageService.getResults(displayExam.code, selectedClass === 'ALL' ? '' : selectedClass);
            setLocalResults(data);

            const { data: examData } = await supabase.from('exams').select('config').eq('code', displayExam.code).single();
            if (examData && examData.config) {
                setDisplayExam(prev => prev ? ({ ...prev, config: examData.config }) : null);
            }
        } catch (e) { console.error("Fetch failed", e); }
        finally { if (!silent) setIsRefreshing(false); }
    };

    useEffect(() => {
        fetchLatest();
        const intervalId = setInterval(() => { fetchLatest(true); }, 5000);
        return () => clearInterval(intervalId);
    }, [displayExam?.code, selectedClass, teacherProfile]);

    useEffect(() => {
        if (!displayExam) return;
        
        const resultChannel = supabase.channel(`exam-room-${displayExam.code}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'results', filter: `exam_code=eq.${displayExam.code}` }, () => { fetchLatest(true); })
            .on('broadcast', { event: 'student_progress' }, (payload) => { 
                const { studentId, answeredCount, totalQuestions, timestamp } = payload.payload; 
                broadcastProgressRef.current[studentId] = { answered: answeredCount, total: totalQuestions, timestamp }; 
                setLocalResults(prev => { 
                    const idx = prev.findIndex(r => r.student.studentId === studentId); 
                    if (idx >= 0 && prev[idx].status === 'in_progress') { 
                        const updated = [...prev]; 
                        updated[idx] = { ...updated[idx], answers: Array(answeredCount).fill('placeholder') as any, timestamp: timestamp }; 
                        return updated; 
                    } 
                    return prev; 
                }); 
            })
            .subscribe();

        const configChannel = supabase.channel(`exam-config-monitor-${displayExam.code}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'exams', filter: `code=eq.${displayExam.code}` }, (payload) => {
                     const newConfig = payload.new.config;
                     if (newConfig) {
                         setDisplayExam(prev => prev ? ({ ...prev, config: newConfig }) : null);
                     }
                }
            )
            .subscribe();

        return () => { 
            supabase.removeChannel(resultChannel);
            supabase.removeChannel(configChannel);
        };
    }, [displayExam?.code, selectedClass]);

    // Lógica pengurutan: Locked -> Online -> Selesai. Kemudian Kelas & Absen.
    const sortedResults = useMemo(() => {
        const statusPriority: Record<string, number> = {
            'force_closed': 1, // Locked
            'in_progress': 2,  // Online
            'completed': 3     // Selesai
        };

        const getAbsentNum = (id: string) => {
            const parts = id.split('-');
            const last = parts[parts.length - 1];
            return parseInt(last) || 0;
        };

        return [...localResults].sort((a, b) => {
            const pA = statusPriority[a.status || ''] || 99;
            const pB = statusPriority[b.status || ''] || 99;

            if (pA !== pB) return pA - pB;
            
            // Urutan kedua: Kelas
            const classCompare = a.student.class.localeCompare(b.student.class, undefined, { numeric: true, sensitivity: 'base' });
            if (classCompare !== 0) return classCompare;

            // Urutan ketiga: No Absen (diambil dari studentId)
            return getAbsentNum(a.student.studentId) - getAbsentNum(b.student.studentId);
        });
    }, [localResults]);

    if (!displayExam) return null;

    const handleGenerateToken = async (studentId: string, studentName: string) => {
        if (processingIdsRef.current.has(studentId)) return;
        processingIdsRef.current.add(studentId);
        try {
            const token = await storageService.generateUnlockToken(displayExam.code, studentId);
            setGeneratedTokenData({ name: studentName, token });
        } catch (error) {
            alert("Gagal membuat token akses.");
        } finally {
            setTimeout(() => processingIdsRef.current.delete(studentId), 1000);
        }
    };

    const handleAddTimeSubmit = async () => { if (!addTimeValue || typeof addTimeValue !== 'number') return; try { await storageService.extendExamTime(displayExam.code, addTimeValue); fetchLatest(true); setIsAddTimeOpen(false); setAddTimeValue(''); } catch(e) { alert("Gagal."); } };
    
    const getRelativeTime = (timestamp?: number) => { 
        if (!timestamp) return '-'; 
        const diff = Math.floor((Date.now() - timestamp) / 1000); 
        if (diff < 60) return 'Baru saja';
        if (diff < 3600) return `${Math.floor(diff/60)}m lalu`; 
        return `${Math.floor(diff/3600)}j lalu`; 
    };
    
    const liveUrl = `${window.location.origin}/?live=${displayExam.code}`;
    const joinUrl = `${window.location.origin}/?join=${displayExam.code}`;
    const isLargeScale = displayExam.config.disableRealtime;

    return (
        <>
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 z-50 animate-fade-in">
                <div className="bg-white dark:bg-slate-800 sm:rounded-[2rem] shadow-2xl w-full max-w-6xl h-full sm:h-[90vh] flex flex-col overflow-hidden relative border border-white dark:border-slate-700">
                    {/* Header Modal */}
                    <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex flex-col gap-4 bg-white dark:bg-slate-800 sticky top-0 z-20 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                                    <SignalIcon className="w-5 h-5"/>
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">Live Monitoring</h2>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-600 tracking-widest uppercase">{displayExam.code}</span>
                                        <RemainingTime exam={displayExam} />
                                        {isRefreshing && <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 animate-pulse">Sync...</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {!isReadOnly && (
                                    <button onClick={() => setIsJoinQrModalOpen(true)} className="p-2 sm:px-4 sm:py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all flex items-center gap-2 shadow-sm border border-emerald-100 dark:border-emerald-800">
                                        <QrCodeIcon className="w-4 h-4"/> <span className="hidden sm:inline">Akses Siswa</span>
                                    </button>
                                )}
                                {!isReadOnly && displayExam.config.enablePublicStream && !isLargeScale && (
                                    <button onClick={() => setIsShareModalOpen(true)} className="p-2 sm:px-4 sm:py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all flex items-center gap-2 shadow-sm border border-indigo-100 dark:border-indigo-800">
                                        <ShareIcon className="w-4 h-4"/> <span className="hidden sm:inline">Stream</span>
                                    </button>
                                )}
                                {!isReadOnly && (
                                    <button onClick={() => setIsAddTimeOpen(!isAddTimeOpen)} className="p-2 sm:px-4 sm:py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all flex items-center gap-2 shadow-sm border border-indigo-100 dark:border-indigo-800">
                                        <PlusCircleIcon className="w-4 h-4"/> <span className="hidden sm:inline">Waktu</span>
                                    </button>
                                )}
                                <button onClick={onClose} className="p-2 bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-300 rounded-xl hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30 dark:hover:text-rose-400 transition-all border border-transparent hover:border-rose-100 dark:hover:border-rose-800">
                                    <XMarkIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-600">
                                <div className={`w-2 h-2 rounded-full ${isLargeScale ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></div>
                                {isLargeScale ? 'Normal Mode' : 'Realtime Mode'}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hidden sm:inline">Filter Kelas:</span>
                                <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all cursor-pointer shadow-sm">
                                    <option value="ALL">SEMUA KELAS</option>
                                    {Array.from(new Set(localResults.map(r => r.student.class))).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-900/50 p-4 sm:p-6 relative">
                        {isAddTimeOpen && !isReadOnly && (
                            <div className="mb-6 p-5 bg-indigo-600 dark:bg-indigo-700 rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-indigo-900/50 text-white animate-slide-in-up flex items-center justify-between sticky top-0 z-30 mx-1">
                                <div>
                                    <h4 className="font-black text-sm uppercase tracking-wide">Tambah Waktu</h4>
                                    <p className="text-white/70 text-xs">Berlaku untuk semua siswa.</p>
                                </div>
                                <div className="flex gap-2">
                                    <input type="number" placeholder="Menit" value={addTimeValue} onChange={e=>setAddTimeValue(parseInt(e.target.value))} className="w-20 px-3 py-2 bg-white/20 border border-white/30 rounded-xl outline-none text-white font-bold placeholder:text-white/50 text-center text-sm"/>
                                    <button onClick={handleAddTimeSubmit} className="px-4 py-2 bg-white text-indigo-600 font-black text-xs uppercase rounded-xl hover:bg-indigo-50 transition-colors shadow-lg">Simpan</button>
                                    <button onClick={()=>setIsAddTimeOpen(false)} className="p-2 bg-white/10 rounded-xl hover:bg-white/20"><XMarkIcon className="w-4 h-4"/></button>
                                </div>
                            </div>
                        )}

                        {/* TABEL LIVE MONITOR */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700 shadow-sm overflow-hidden min-h-[300px] flex flex-col">
                            <div className="overflow-x-auto custom-scrollbar flex-1">
                                <table className="w-full min-w-[900px] text-left border-collapse">
                                    <thead className="bg-slate-50/80 dark:bg-slate-700/80 backdrop-blur-md text-slate-500 dark:text-slate-400 sticky top-0 z-10 border-b border-slate-100 dark:border-slate-700">
                                        <tr>
                                            <th className="px-5 py-4 w-64">
                                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                                    <UserIcon className="w-3.5 h-3.5 sm:hidden" />
                                                    <span className="hidden sm:inline">Identitas Siswa</span>
                                                </div>
                                            </th>
                                            <th className="px-5 py-4 w-32">
                                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                                    <ListBulletIcon className="w-3.5 h-3.5 sm:hidden" />
                                                    <span className="hidden sm:inline">Kelas</span>
                                                </div>
                                            </th>
                                            <th className="px-5 py-4 text-center w-32">
                                                <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                                    <div className="w-3 h-3 rounded-full border-2 border-slate-300 dark:border-slate-600 sm:hidden"></div>
                                                    <span className="hidden sm:inline">Status</span>
                                                </div>
                                            </th>
                                            {!isLargeScale && (
                                                <th className="px-5 py-4 text-center w-40">
                                                    <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                                        <ChartBarIcon className="w-3.5 h-3.5 sm:hidden" />
                                                        <span className="hidden sm:inline">Progres</span>
                                                    </div>
                                                </th>
                                            )}
                                            {!isLargeScale && (
                                            <th className="px-5 py-4 text-center w-32">
                                                <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                                    <ClockIcon className="w-3.5 h-3.5 sm:hidden" />
                                                    <span className="hidden sm:inline">Aktif</span>
                                                </div>
                                            </th>
                                            )}
                                            {displayExam.config.trackLocation && (
                                            <th className="px-5 py-4 text-center w-32">
                                                <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                                    <SignalIcon className="w-3.5 h-3.5 sm:hidden" />
                                                    <span className="hidden sm:inline">Lokasi</span>
                                                </div>
                                            </th>
                                            )}
                                            <th className="px-5 py-4 text-right w-32">
                                                <div className="flex items-center justify-end gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                                    <LockClosedIcon className="w-3.5 h-3.5 sm:hidden" />
                                                    <span className="hidden sm:inline">Aksi</span>
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                        {sortedResults.length > 0 ? sortedResults.map((r) => { 
                                            const totalQ = displayExam.questions.filter(q=>q.questionType!=='INFO').length; 
                                            const broadcastData = broadcastProgressRef.current[r.student.studentId]; 
                                            
                                            // Logic Progress & Timestamp
                                            const answered = r.status === 'in_progress' && broadcastData ? broadcastData.answered : Object.keys(r.answers).length; 
                                            const lastActive = r.status === 'in_progress' && broadcastData ? broadcastData.timestamp : r.timestamp; 
                                            const progress = totalQ > 0 ? Math.round((answered/totalQ)*100) : 0; 
                                            
                                            return (
                                                <tr key={r.student.studentId} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors group">
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold border border-indigo-100 dark:border-indigo-800 shadow-sm">
                                                                {r.student.fullName.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{r.student.fullName}</div>
                                                                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-wide">#{r.student.studentId.split('-').pop()}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded border border-slate-200 dark:border-slate-600">{r.student.class}</span>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <div className="flex justify-center">
                                                            {r.status === 'force_closed' ? (
                                                                <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-md text-[10px] font-black uppercase flex items-center gap-1.5 border border-rose-100 dark:border-rose-900" title={r.activityLog?.slice(-1)[0]}>
                                                                    <LockClosedIcon className="w-3 h-3"/> Locked
                                                                </span>
                                                            ) : r.status === 'completed' ? (
                                                                <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-md text-[10px] font-black uppercase flex items-center gap-1.5 border border-slate-200 dark:border-slate-600">
                                                                    <CheckCircleIcon className="w-3 h-3"/> Selesai
                                                                </span>
                                                            ) : (
                                                                <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-md text-[10px] font-black uppercase flex items-center gap-1.5 border border-emerald-100 dark:border-emerald-900 shadow-sm">
                                                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Online
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    {!isLargeScale && (
                                                        <td className="px-5 py-3">
                                                            <div className="flex flex-col items-center gap-1.5 w-full max-w-[100px] mx-auto">
                                                                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden border border-slate-200 dark:border-slate-600">
                                                                    <div className={`h-full transition-all duration-700 ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{width: `${progress}%`}}></div>
                                                                </div>
                                                                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">{answered} / {totalQ} Soal ({progress}%)</span>
                                                            </div>
                                                        </td>
                                                    )}
                                                    {!isLargeScale && (
                                                    <td className="px-5 py-3 text-center">
                                                        <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-600">
                                                            {getRelativeTime(lastActive)}
                                                        </span>
                                                    </td>
                                                    )}
                                                    {displayExam.config.trackLocation && (
                                                    <td className="px-5 py-3 text-center">
                                                        {r.location ? (
                                                            <a href={`https://www.google.com/maps?q=${r.location}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-2 py-1 rounded transition-colors border border-blue-100 dark:border-blue-900">
                                                                Maps ↗
                                                            </a>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-300 dark:text-slate-600 italic">N/A</span>
                                                        )}
                                                    </td>
                                                    )}
                                                    <td className="px-5 py-3 text-right">
                                                        {(r.status === 'in_progress' || r.status === 'force_closed') && !isReadOnly && (
                                                            <button 
                                                                onClick={() => handleGenerateToken(r.student.studentId, r.student.fullName)} 
                                                                className="px-3 py-1.5 bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all border border-indigo-200 dark:border-indigo-800 shadow-sm active:scale-95 whitespace-nowrap"
                                                            >
                                                                Buat Token
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ); 
                                        }) : (
                                            <tr>
                                                <td colSpan={4 + (!isLargeScale ? 2 : 0) + (displayExam.config.trackLocation ? 1 : 0)} className="px-6 py-20 text-center">
                                                    <div className="flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-2">
                                                        <UserIcon className="w-8 h-8 opacity-20"/>
                                                        <span className="text-sm font-medium italic">Belum ada siswa yang bergabung...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500 font-medium flex justify-between items-center sticky bottom-0">
                                <span>Total: {localResults.length} Siswa</span>
                                <span>Updated: {new Date().toLocaleTimeString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Generated Token Modal */}
            {generatedTokenData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border border-white dark:border-slate-700 relative animate-slide-in-up">
                        <button onClick={() => setGeneratedTokenData(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full transition-colors"><XMarkIcon className="w-5 h-5"/></button>
                        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-emerald-50/50 dark:ring-emerald-900/20">
                            <LockClosedIcon className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white mb-1">Kode Akses Dibuat!</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 px-4">Berikan kode ini kepada <strong>{generatedTokenData.name}</strong> untuk membuka sesi ujian.</p>
                        
                        <div className="bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl py-5 mb-6 shadow-inner">
                            <span className="text-4xl font-mono font-black tracking-[0.25em] text-slate-800 dark:text-white">{generatedTokenData.token}</span>
                        </div>
                        
                        <button onClick={() => setGeneratedTokenData(null)} className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-black dark:hover:bg-indigo-700 transition-all shadow-lg active:scale-[0.98] text-sm uppercase tracking-wider">Tutup</button>
                    </div>
                </div>
            )}

            {isShareModalOpen && (<div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in"><div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-8 text-center animate-slide-in-up border border-white dark:border-slate-700"><div className="flex justify-between items-center mb-6"><h3 className="font-bold text-lg text-slate-800 dark:text-white tracking-tight">Akses Pantauan</h3><button onClick={() => setIsShareModalOpen(false)} className="p-2 bg-slate-50 dark:bg-slate-700 text-slate-400 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"><XMarkIcon className="w-5 h-5" /></button></div><div className="bg-white p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-lg mb-6 inline-block mx-auto relative group"><div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-3xl opacity-20 blur group-hover:opacity-30 transition-opacity"></div><img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(liveUrl)}&margin=10`} alt="QR Code Live" className="w-48 h-48 object-contain relative bg-white rounded-xl"/></div><p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-6 leading-relaxed px-2">Minta orang tua siswa untuk memindai QR Code di atas atau bagikan link di bawah ini.</p><div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-700"><div className="flex-1 px-3 py-1 overflow-hidden"><p className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate text-left">{liveUrl}</p></div><button onClick={() => { navigator.clipboard.writeText(liveUrl); alert("Link berhasil disalin!"); }} className="p-2 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors" title="Salin Link"><DocumentDuplicateIcon className="w-4 h-4" /></button></div></div></div>)}
            
            {/* MODAL QR CODE JOIN SISWA */}
            {isJoinQrModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-8 text-center animate-slide-in-up border border-white dark:border-slate-700 relative">
                        <button onClick={() => setIsJoinQrModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full transition-colors"><XMarkIcon className="w-5 h-5"/></button>
                        <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-lg text-slate-800 dark:text-white tracking-tight">Gabung Ujian</h3></div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-lg mb-6 inline-block mx-auto relative group">
                            <div className="absolute -inset-1 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-3xl opacity-20 blur group-hover:opacity-30 transition-opacity"></div>
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}&margin=10`} alt="QR Join" className="w-48 h-48 object-contain relative bg-white rounded-xl"/>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-6 leading-relaxed px-2">
                            Minta siswa untuk memindai kode ini agar langsung masuk ke halaman login ujian.
                        </p>
                        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Kode Ujian</p>
                            <p className="text-xl font-mono font-black text-slate-800 dark:text-white tracking-widest">{displayExam.code}</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// --- FinishedExamModal ---
interface FinishedExamModalProps {
    exam: Exam;
    teacherProfile: TeacherProfile;
    onClose: () => void;
}

export const FinishedExamModal: React.FC<FinishedExamModalProps> = ({ exam, teacherProfile, onClose }) => {
    const [results, setResults] = useState<Result[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'ANALYSIS' | 'STUDENTS'>('ANALYSIS');
    const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
    const [fixMessage, setFixMessage] = useState('');

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const data = await storageService.getResults(exam.code, undefined);
            
            // SORTING LOGIC: Sort by Class, then by Absent Number (from ID)
            const sortedData = data.sort((a, b) => {
                const classA = a.student.class || '';
                const classB = b.student.class || '';
                // Compare class alphanumerically (e.g. 1A, 1B, 2, 10)
                const c = classA.localeCompare(classB, undefined, { numeric: true, sensitivity: 'base' });
                if (c !== 0) return c;

                // Extract numeric absent number from ID (last part)
                const getAbs = (id: string) => {
                    const parts = id.split('-');
                    return parseInt(parts[parts.length-1]) || 0;
                }
                return getAbs(a.student.studentId) - getAbs(b.student.studentId);
            });

            setResults(sortedData);
        } catch (error) {
            console.error("Failed to fetch results", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [exam, teacherProfile]);

    const handleDeleteResult = async (studentId: string, studentName: string) => {
        if (!confirm(`Hapus hasil ujian siswa "${studentName}"? Data yang dihapus tidak dapat dikembalikan.`)) return;
        
        try {
            await storageService.deleteStudentResult(exam.code, studentId);
            setResults(prev => prev.filter(r => r.student.studentId !== studentId));
        } catch (e) {
            console.error("Gagal menghapus data:", e);
            alert("Gagal menghapus data siswa.");
        }
    };

    const handleDownloadCorrected = () => {
        const fixedArchive = { exam: exam, results: results };
        const jsonString = JSON.stringify(fixedArchive, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `REKAP_NILAI_TERBARU_${exam.code}_${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const normalize = (str: string) => str.trim().toLowerCase();

    // Enhanced checkAnswerStatus supporting Manual Grading Override
    const checkAnswerStatus = (q: Question, studentAnswers: Record<string, string>) => {
        // 1. Check for manual grade override first
        const manualGradeKey = `_grade_${q.id}`;
        if (studentAnswers[manualGradeKey]) {
            return studentAnswers[manualGradeKey]; // 'CORRECT' or 'WRONG'
        }

        const ans = studentAnswers[q.id];
        if (!ans) return 'EMPTY';

        const studentAns = normalize(String(ans));
        const correctAns = normalize(String(q.correctAnswer || ''));

        if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
            return studentAns === correctAns ? 'CORRECT' : 'WRONG';
        } 
        else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
            const sSet = new Set(parseList(studentAns).map(normalize));
            const cSet = new Set(parseList(correctAns).map(normalize));
            if (sSet.size === cSet.size && [...sSet].every(x => cSet.has(x))) return 'CORRECT';
            return 'WRONG';
        }
        else if (q.questionType === 'TRUE_FALSE') {
             try {
                const ansObj = JSON.parse(ans);
                const allCorrect = q.trueFalseRows?.every((row, idx) => ansObj[idx] === row.answer);
                return allCorrect ? 'CORRECT' : 'WRONG';
            } catch(e) { return 'WRONG'; }
        }
        else if (q.questionType === 'MATCHING') {
            try {
                const ansObj = JSON.parse(ans);
                const allCorrect = q.matchingPairs?.every((pair, idx) => ansObj[idx] === pair.right);
                return allCorrect ? 'CORRECT' : 'WRONG';
            } catch(e) { return 'WRONG'; }
        }

        // For Essay, if no manual grade, default to wrong (needs grading) or just unverified.
        // We return 'WRONG' to indicate it doesn't add points yet.
        return 'WRONG'; 
    };

    const getCalculatedStats = (r: Result) => {
        let correct = 0;
        let empty = 0;
        const scorableQuestions = exam.questions.filter(q => q.questionType !== 'INFO');
        
        scorableQuestions.forEach(q => {
            const status = checkAnswerStatus(q, r.answers);
            if (status === 'CORRECT') correct++;
            else if (status === 'EMPTY') empty++;
        });

        const total = scorableQuestions.length;
        const wrong = total - correct - empty;
        const score = total > 0 ? Math.round((correct / total) * 100) : 0;
        
        return { correct, wrong, empty, score };
    };

    // Calculate Global Stats
    const totalStudents = results.length;
    const calculatedResults = results.map(r => getCalculatedStats(r).score);
    const averageScore = totalStudents > 0 ? Math.round(calculatedResults.reduce((acc, s) => acc + s, 0) / totalStudents) : 0;
    const highestScore = totalStudents > 0 ? Math.max(...calculatedResults) : 0;
    const lowestScore = totalStudents > 0 ? Math.min(...calculatedResults) : 0;

    // --- NEW: CATEGORY & LEVEL ANALYSIS ---
    const { categoryStats, levelStats } = useMemo(() => calculateAggregateStats(exam, results), [exam, results]);

    const questionStats = useMemo(() => {
        return exam.questions.filter(q => q.questionType !== 'INFO').map(q => {
            let correctCount = 0;
            results.forEach(r => {
                if (checkAnswerStatus(q, r.answers) === 'CORRECT') {
                    correctCount++;
                }
            });
            return {
                id: q.id,
                correctRate: totalStudents > 0 ? Math.round((correctCount / totalStudents) * 100) : 0
            };
        });
    }, [results, exam.questions, totalStudents]);

    const toggleStudent = (id: string) => {
        if (expandedStudent === id) setExpandedStudent(null);
        else setExpandedStudent(id);
    };

    // MANUAL GRADING LOGIC
    const rateQuestion = async (studentResult: Result, qId: string, isCorrect: boolean) => {
        const newAnswers = { ...studentResult.answers, [`_grade_${qId}`]: isCorrect ? 'CORRECT' : 'WRONG' };
        
        // Recalculate Score locally
        let correct = 0;
        const scorableQuestions = exam.questions.filter(q => q.questionType !== 'INFO');
        scorableQuestions.forEach(q => {
            // Using newAnswers which contains the override
            const status = checkAnswerStatus(q, newAnswers);
            if (status === 'CORRECT') correct++;
        });
        const total = scorableQuestions.length;
        const newScore = total > 0 ? Math.round((correct / total) * 100) : 0;

        // Optimistic Update
        setResults(prev => prev.map(r => 
            r.student.studentId === studentResult.student.studentId 
            ? { ...r, answers: newAnswers, score: newScore, correctAnswers: correct } 
            : r
        ));

        // Save to DB
        try {
            await supabase.from('results').update({
                answers: newAnswers,
                score: newScore,
                correct_answers: correct
            }).eq('exam_code', exam.code).eq('student_id', studentResult.student.studentId);
        } catch (e) {
            console.error("Grading failed", e);
            alert("Gagal menyimpan nilai.");
            fetchData(); // Revert
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-white dark:border-slate-700 relative">
                 <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-800 sticky top-0 z-10 gap-4">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Analisis Hasil Ujian</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{exam.config.subject} • {exam.code}</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="bg-slate-100 dark:bg-slate-700 p-1 rounded-xl flex">
                            <button onClick={() => setActiveTab('ANALYSIS')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'ANALYSIS' ? 'bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Analisis Soal</button>
                            <button onClick={() => setActiveTab('STUDENTS')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'STUDENTS' ? 'bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Rekap Siswa</button>
                        </div>
                        <button onClick={onClose} className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-300 rounded-xl hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30 dark:hover:text-rose-400 transition-all">
                            <XMarkIcon className="w-6 h-6"/>
                        </button>
                    </div>
                </div>

                {fixMessage && (
                    <div className="bg-amber-50 dark:bg-amber-900/30 px-6 py-3 border-b border-amber-100 dark:border-amber-800 flex items-center justify-between gap-4 animate-slide-in-up">
                        <div className="flex items-center gap-3 text-amber-800 dark:text-amber-200">
                            <ExclamationTriangleIcon className="w-5 h-5 shrink-0" />
                            <p className="text-xs font-bold">{fixMessage}</p>
                        </div>
                        <button onClick={handleDownloadCorrected} className="px-3 py-1.5 bg-amber-200 dark:bg-amber-800 hover:bg-amber-300 dark:hover:bg-amber-700 text-amber-900 dark:text-amber-100 text-[10px] font-bold uppercase rounded-lg shadow-sm transition-colors flex items-center gap-2">
                             <DocumentArrowUpIcon className="w-3 h-3"/> Unduh Data Perbaikan
                        </button>
                    </div>
                )}

                <div className="flex-1 overflow-auto p-6 bg-slate-50/50 dark:bg-slate-900/50">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500 font-bold">Memuat data...</div>
                    ) : (
                        activeTab === 'ANALYSIS' ? (
                            <div className="space-y-8">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <StatWidget label="Rata-rata" value={averageScore} color="bg-indigo-50" icon={ChartBarIcon} />
                                    <StatWidget label="Tertinggi" value={highestScore} color="bg-emerald-50" icon={CheckCircleIcon} />
                                    <StatWidget label="Terendah" value={lowestScore} color="bg-rose-50" icon={XMarkIcon} />
                                    <StatWidget label="Partisipan" value={totalStudents} color="bg-blue-50" icon={UserIcon} />
                                </div>

                                {/* NEW: Category & Level Statistics */}
                                {(categoryStats.length > 0 || levelStats.length > 0) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                            <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <ListBulletIcon className="w-4 h-4"/> Penguasaan Materi (Kategori)
                                            </h3>
                                            <div className="space-y-3">
                                                {categoryStats.map(stat => (
                                                    <div key={stat.name}>
                                                        <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                                                            <span>{stat.name}</span>
                                                            <span className={stat.percentage < 50 ? 'text-rose-500' : stat.percentage < 80 ? 'text-amber-500' : 'text-emerald-600'}>{stat.percentage}%</span>
                                                        </div>
                                                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                            <div className={`h-full transition-all duration-1000 ${stat.percentage >= 80 ? 'bg-emerald-500' : stat.percentage >= 50 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{width: `${stat.percentage}%`}}></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                            <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <ChartBarIcon className="w-4 h-4"/> Tingkat Kesulitan (Level)
                                            </h3>
                                            <div className="space-y-3">
                                                {levelStats.map(stat => (
                                                    <div key={stat.name}>
                                                        <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                                                            <span>{stat.name}</span>
                                                            <span className={stat.percentage < 50 ? 'text-rose-500' : stat.percentage < 80 ? 'text-amber-500' : 'text-emerald-600'}>{stat.percentage}%</span>
                                                        </div>
                                                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                            <div className={`h-full transition-all duration-1000 ${stat.percentage >= 80 ? 'bg-emerald-500' : stat.percentage >= 50 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{width: `${stat.percentage}%`}}></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                        <TableCellsIcon className="w-5 h-5 text-slate-400 dark:text-slate-500"/>
                                        Analisis Butir Soal
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        {exam.questions.filter(q => q.questionType !== 'INFO').map((q, idx) => {
                                            const stats = questionStats.find(s => s.id === q.id) || { correctRate: 0 };
                                            return (
                                                <QuestionAnalysisItem 
                                                    key={q.id} 
                                                    q={q} 
                                                    index={idx} 
                                                    stats={stats} 
                                                    examResults={results}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/50 dark:bg-slate-700/50">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Siswa</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Kelas</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Nilai</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">B/S/K</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Aktivitas</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Lokasi</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                        {results.map(r => {
                                            const { correct, wrong, empty, score } = getCalculatedStats(r);
                                            return (
                                                <React.Fragment key={r.student.studentId}>
                                                    <tr onClick={() => toggleStudent(r.student.studentId)} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer group">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`transition-transform duration-300 ${expandedStudent === r.student.studentId ? 'rotate-180' : ''}`}>
                                                                    <ChevronDownIcon className="w-4 h-4 text-slate-300 dark:text-slate-500 group-hover:text-indigo-500" />
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-slate-800 dark:text-slate-200 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{r.student.fullName}</div>
                                                                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">#{r.student.studentId.split('-').pop()}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{r.student.class}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`text-sm font-black px-2 py-1 rounded ${score >= 75 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30' : score >= 50 ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30' : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30'}`}>
                                                                {score}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center text-xs font-bold text-slate-600 dark:text-slate-400">
                                                            <span className="text-emerald-600 dark:text-emerald-400" title="Benar">{correct}</span> / <span className="text-rose-600 dark:text-rose-400" title="Salah">{wrong}</span> / <span className="text-slate-400 dark:text-slate-500" title="Kosong">{empty}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            {r.activityLog && r.activityLog.length > 0 ? (
                                                                <span className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded font-bold text-[10px] border border-amber-100 dark:border-amber-800">{r.activityLog.length} Log</span>
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded border border-emerald-100 dark:border-emerald-800">Aman</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-center text-xs text-slate-500 dark:text-slate-400 font-mono">
                                                            {exam.config.trackLocation && r.location ? (
                                                                <a href={`https://www.google.com/maps?q=${r.location}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center gap-1">Maps ↗</a>
                                                            ) : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteResult(r.student.studentId, r.student.fullName); }} 
                                                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                                                                title="Hapus Data Siswa"
                                                            >
                                                                <TrashIcon className="w-4 h-4"/>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                    {expandedStudent === r.student.studentId && (
                                                        <tr className="animate-fade-in bg-slate-50/50 dark:bg-slate-900/50 shadow-inner">
                                                            <td colSpan={7} className="p-6">
                                                                <div className="flex items-center gap-4 mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                                                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-300 dark:bg-emerald-600 rounded"></div> Benar</span>
                                                                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-rose-300 dark:bg-rose-600 rounded"></div> Salah</span>
                                                                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-200 dark:bg-slate-700 rounded"></div> Kosong</span>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1 mt-2 mb-4">
                                                                    {exam.questions.filter(q => q.questionType !== 'INFO').map((q, idx) => {
                                                                        const status = checkAnswerStatus(q, r.answers);
                                                                        let bgClass = 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-200'; 
                                                                        if (status === 'CORRECT') bgClass = 'bg-emerald-300 dark:bg-emerald-600 text-slate-900 dark:text-white';
                                                                        else if (status === 'WRONG') bgClass = 'bg-rose-300 dark:bg-rose-600 text-slate-900 dark:text-white';
                                                                        return <div key={q.id} title={`Soal ${idx+1}: ${status === 'CORRECT' ? 'Benar' : status === 'EMPTY' ? 'Kosong' : 'Salah'}`} className={`w-6 h-6 flex items-center justify-center rounded text-[10px] font-bold ${bgClass} cursor-help transition-transform hover:scale-110`}>{idx + 1}</div>;
                                                                    })}
                                                                </div>

                                                                {/* MANUAL ESSAY GRADING UI */}
                                                                {exam.questions.some(q => q.questionType === 'ESSAY') && (
                                                                    <div className="mb-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                                                                        <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Penilaian Manual Soal Esai</h4>
                                                                        <div className="space-y-4">
                                                                            {exam.questions.filter(q => q.questionType === 'ESSAY').map((q) => {
                                                                                const ans = r.answers[q.id];
                                                                                const manualStatus = r.answers[`_grade_${q.id}`];
                                                                                
                                                                                return (
                                                                                    <div key={q.id} className="text-sm border-b border-slate-100 dark:border-slate-700 pb-3 last:border-0">
                                                                                        <p className="font-bold text-slate-700 dark:text-slate-200 mb-1" dangerouslySetInnerHTML={{__html: q.questionText}}></p>
                                                                                        <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded text-slate-600 dark:text-slate-300 italic mb-2">
                                                                                            {ans || <span className="text-slate-400">Tidak menjawab</span>}
                                                                                        </div>
                                                                                        <div className="flex gap-2">
                                                                                            <button 
                                                                                                onClick={() => rateQuestion(r, q.id, true)}
                                                                                                className={`px-3 py-1 text-xs font-bold rounded border flex items-center gap-1 ${manualStatus === 'CORRECT' ? 'bg-emerald-100 border-emerald-500 text-emerald-700' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                                                                            >
                                                                                                <CheckCircleIcon className="w-3 h-3"/> Benar
                                                                                            </button>
                                                                                            <button 
                                                                                                onClick={() => rateQuestion(r, q.id, false)}
                                                                                                className={`px-3 py-1 text-xs font-bold rounded border flex items-center gap-1 ${manualStatus === 'WRONG' ? 'bg-rose-100 border-rose-500 text-rose-700' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                                                                            >
                                                                                                <XMarkIcon className="w-3 h-3"/> Salah
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {r.activityLog && r.activityLog.length > 0 && (
                                                                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                                                        <h4 className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-500 mb-2 flex items-center gap-2">
                                                                            <ExclamationTriangleIcon className="w-3 h-3"/> Riwayat Aktivitas & Kecurangan
                                                                        </h4>
                                                                        <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc pl-4 font-mono bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                                                                            {r.activityLog.map((log, i) => <li key={i}>{log}</li>)}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};
