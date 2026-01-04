
import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Exam, Result } from '../../types';
import { XMarkIcon, WifiIcon, ClockIcon, LockClosedIcon, ArrowPathIcon, CheckCircleIcon, ChartBarIcon } from '../Icons';
import { storageService } from '../../services/storage';

interface OngoingExamModalProps {
    exam: Exam | null;
    results: Result[];
    onClose: () => void;
    onAllowContinuation: (studentId: string, examCode: string) => void;
    isReadOnly?: boolean; 
}

// Komponen Widget Statistik Sederhana
const StatWidget: React.FC<{ label: string; value: number; color: string; icon?: React.FC<any> }> = ({ label, value, color, icon: Icon }) => (
    <div className={`p-4 rounded-xl border bg-white shadow-sm flex items-center gap-4 transition-all duration-300 hover:shadow-md ${color}`}>
        {Icon && <div className={`p-2.5 rounded-xl bg-white/60 backdrop-blur-md shadow-sm`}><Icon className="w-6 h-6 opacity-90" /></div>}
        <div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-0.5">{label}</p>
            <p className="text-2xl font-black tracking-tight">{value}</p>
        </div>
    </div>
);

export const OngoingExamModal: React.FC<OngoingExamModalProps> = ({ exam, results: initialResults, onClose, onAllowContinuation, isReadOnly = false }) => {
    const [filterClass, setFilterClass] = useState<string>('ALL');
    const [localResults, setLocalResults] = useState<Result[]>(initialResults);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [activeTab, setActiveTab] = useState<'MONITOR' | 'STREAM_INFO'>('MONITOR');
    
    // Set untuk melacak ID siswa yang sedang diproses (sedang di-unlock)
    const processingIdsRef = useRef<Set<string>>(new Set());
    const [, setTick] = useState(0);

    useEffect(() => {
        if(exam) {
            if (localResults.length === 0) {
                 setLocalResults(initialResults.filter(r => r.examCode === exam.code));
            }
        }
    }, [initialResults, exam]);

    useEffect(() => {
        if (!exam) return;
        
        const fetchLatest = async () => {
            setIsRefreshing(true);
            try {
                const latest = await storageService.getResults(); 
                const updatedForThisExam = latest.filter(r => r.examCode === exam.code);
                
                setLocalResults(currentResults => {
                    const currentMap = new Map(currentResults.map(r => [r.student.studentId, r]));
                    
                    return updatedForThisExam.map(newItem => {
                        const sId = newItem.student.studentId;
                        if (processingIdsRef.current.has(sId)) {
                             const currentItem = currentMap.get(sId);
                             return currentItem || newItem;
                        }
                        return newItem;
                    });
                });
                
                setLastUpdated(new Date());
            } catch (e) {
                console.error("Auto-refresh failed", e);
            } finally {
                setIsRefreshing(false);
            }
        };

        const intervalId = setInterval(fetchLatest, 3000);
        return () => clearInterval(intervalId);
    }, [exam]);

    const handleUnlockClick = async (studentId: string, examCode: string) => {
        processingIdsRef.current.add(studentId);
        setTick(t => t + 1);
        
        setLocalResults(prev => prev.map(r => 
            r.student.studentId === studentId 
            ? { ...r, status: 'in_progress', activityLog: [...(r.activityLog || []), `[Guru] Membuka kunci akses ujian.`] } 
            : r
        ));

        try {
            await storageService.unlockStudentExam(examCode, studentId);
            onAllowContinuation(studentId, examCode);
        } catch (error) {
            alert("Gagal koneksi. Coba lagi.");
            processingIdsRef.current.delete(studentId);
            setTick(t => t + 1);
        } finally {
            setTimeout(() => {
                processingIdsRef.current.delete(studentId);
                setTick(t => t + 1);
            }, 5000); 
        }
    };

    const uniqueClasses = useMemo(() => {
        const classes = new Set(localResults.map(r => r.student.class));
        return Array.from(classes).sort();
    }, [localResults]);

    const filteredResults = useMemo(() => {
        let res = localResults;
        if (filterClass !== 'ALL') {
            res = res.filter(r => r.student.class === filterClass);
        }
        return res.sort((a, b) => {
            const scoreA = a.status === 'force_submitted' ? 0 : a.status === 'in_progress' ? 1 : 2;
            const scoreB = b.status === 'force_submitted' ? 0 : b.status === 'in_progress' ? 1 : 2;
            if (scoreA !== scoreB) return scoreA - scoreB;
            
            if (a.student.class !== b.student.class) return a.student.class.localeCompare(b.student.class);
            return a.student.fullName.localeCompare(b.student.fullName);
        });
    }, [localResults, filterClass]);

    if (!exam) return null;

    const totalStudents = localResults.length;
    const activeStudents = localResults.filter(r => r.status === 'in_progress').length;
    const finishedStudents = localResults.filter(r => r.status === 'completed').length;
    const suspendedStudents = localResults.filter(r => r.status === 'force_submitted').length;
    const streamUrl = `${window.location.origin}/?stream=${exam.code}`;

    // --- HELPER UNTUK RENDER STATUS ---
    const renderStatusBadge = (status: string) => {
        if (status === 'in_progress') {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Sedang Mengerjakan
                </span>
            );
        }
        if (status === 'completed') {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    <CheckCircleIcon className="w-3.5 h-3.5 text-slate-400"/> Selesai
                </span>
            );
        }
        if (status === 'force_submitted') {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200 shadow-sm animate-pulse">
                    <LockClosedIcon className="w-3.5 h-3.5"/> TERKUNCI
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-gray-100 text-gray-400 border border-gray-200">
                <WifiIcon className="w-3.5 h-3.5"/> Offline
            </span>
        );
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 z-50 animate-fade-in">
            <div className="bg-[#F8FAFC] sm:rounded-2xl shadow-2xl w-full max-w-[95vw] h-full sm:h-[92vh] flex flex-col overflow-hidden border-0 sm:border border-white/20">
                
                {/* HEADER AREA */}
                <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex-shrink-0 z-20 shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-6">
                        <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-3">
                                <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-2.5 rounded-xl shadow-lg shadow-slate-200">
                                   <WifiIcon className="w-6 h-6"/>
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight truncate">Live Monitor</h2>
                                    <div className="flex items-center flex-wrap gap-2 text-xs font-medium text-slate-500 mt-0.5">
                                        <span className="font-mono text-slate-400">Kode:</span>
                                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 border border-slate-200 font-bold font-mono tracking-wide">{exam.code}</span>
                                        <span className="hidden sm:inline text-slate-300">•</span>
                                        <span className="flex items-center gap-1">
                                            <ClockIcon className="w-3.5 h-3.5 text-slate-400"/> {lastUpdated.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})}
                                        </span>
                                        {isRefreshing && <span className="text-blue-600 animate-pulse font-bold ml-1 text-[10px] bg-blue-50 px-2 py-0.5 rounded-full">Syncing...</span>}
                                    </div>
                                </div>
                             </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto w-full sm:w-auto justify-end">
                            <div className="bg-slate-100 p-1 rounded-xl flex shadow-inner">
                                <button onClick={() => setActiveTab('MONITOR')} className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${activeTab === 'MONITOR' ? 'bg-white text-slate-800 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}>Monitor</button>
                                {exam.config.enablePublicStream && !isReadOnly && (
                                    <button onClick={() => setActiveTab('STREAM_INFO')} className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${activeTab === 'STREAM_INFO' ? 'bg-white text-slate-800 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}>Stream</button>
                                )}
                            </div>
                            <button onClick={onClose} className="p-2.5 rounded-xl bg-white border border-gray-200 hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors shadow-sm">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {activeTab === 'MONITOR' && (
                        <div className="flex flex-col gap-4">
                            {/* Stats Grid - Responsif Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                                <StatWidget label="Total Siswa" value={totalStudents} color="bg-blue-50/50 border-blue-100 text-blue-700" icon={ChartBarIcon} />
                                <StatWidget label="Sedang Aktif" value={activeStudents} color="bg-emerald-50/50 border-emerald-100 text-emerald-700" icon={WifiIcon} />
                                <StatWidget label="Selesai" value={finishedStudents} color="bg-purple-50/50 border-purple-100 text-purple-700" icon={CheckCircleIcon} />
                                <StatWidget label="Terkunci" value={suspendedStudents} color="bg-rose-50/50 border-rose-100 text-rose-700" icon={LockClosedIcon} />
                            </div>
                            
                            {/* Filter & Toolbar */}
                            <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
                                <div className="text-sm font-bold text-slate-500 hidden sm:block">
                                    Daftar Peserta
                                </div>
                                <div className="w-full sm:w-auto">
                                    <select 
                                        value={filterClass} 
                                        onChange={(e) => setFilterClass(e.target.value)} 
                                        className="w-full sm:w-48 p-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-slate-800 focus:border-slate-800 outline-none transition-all cursor-pointer shadow-sm"
                                    >
                                        <option value="ALL">Semua Kelas</option>
                                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 overflow-hidden relative bg-[#F8FAFC]">
                    {activeTab === 'STREAM_INFO' && !isReadOnly ? (
                        <div className="flex flex-col items-center justify-center h-full p-6 sm:p-8 text-center animate-fade-in overflow-y-auto">
                            <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-xl border border-slate-100 max-w-lg w-full my-auto">
                                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                    <WifiIcon className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">Public Livestream</h3>
                                <p className="text-sm text-slate-500 mb-6">Bagikan link atau scan QR code di bawah ini agar orang tua atau pengawas lain dapat memantau ujian.</p>
                                
                                <div className="flex justify-center mb-6">
                                    <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                                        <img 
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(streamUrl)}&margin=10`} 
                                            alt="QR Code Stream" 
                                            className="w-40 h-40 object-contain mix-blend-multiply"
                                            loading="lazy"
                                        />
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 font-mono text-xs sm:text-sm text-slate-600 break-all select-all">
                                    {streamUrl}
                                </div>
                                
                                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                    <button onClick={() => navigator.clipboard.writeText(streamUrl)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-colors shadow-lg shadow-slate-200 text-sm">
                                        Salin Link
                                    </button>
                                    <a href={streamUrl} target="_blank" rel="noreferrer" className="bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 transition-colors text-sm">
                                        Buka Link
                                    </a>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full overflow-auto p-4 sm:p-6 custom-scrollbar bg-slate-50/50">
                             {filteredResults.length > 0 ? (
                                <>
                                    {/* DESKTOP TABLE VIEW (> lg / 1024px) */}
                                    {/* Tablet 11 inch usually < 1200px portrait, so this hides on portrait tablet */}
                                    <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                        <table className="min-w-full divide-y divide-slate-100">
                                            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-16">No</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Identitas Siswa</th>
                                                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider w-32">Status</th>
                                                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider w-48">Progress</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider min-w-[250px]">Log Aktivitas Terakhir</th>
                                                    {!isReadOnly && <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider w-32">Aksi</th>}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 bg-white">
                                                {filteredResults.map((result, idx) => {
                                                    const isProcessing = processingIdsRef.current.has(result.student.studentId);
                                                    const isLocked = result.status === 'force_submitted';
                                                    const questionsAnswered = Object.keys(result.answers).length;
                                                    const totalQuestions = exam.questions.filter(q => q.questionType !== 'INFO').length;
                                                    const progressPercent = Math.round((questionsAnswered / totalQuestions) * 100) || 0;

                                                    return (
                                                        <tr key={result.student.studentId} className={`group transition-colors ${isLocked ? 'bg-red-50/30 hover:bg-red-50/60' : 'hover:bg-slate-50'}`}>
                                                            <td className="px-6 py-4 text-sm font-mono text-slate-400 font-bold">{idx + 1}</td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-slate-800 text-sm">{result.student.fullName}</span>
                                                                    <span className="text-xs text-slate-500 font-medium mt-0.5 inline-flex items-center gap-1.5">
                                                                        <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{result.student.class}</span> 
                                                                        <span className="text-slate-300">|</span> 
                                                                        <span className="font-mono text-slate-400">{result.student.studentId}</span>
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                {renderStatusBadge(result.status || '')}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                {result.status === 'completed' || result.status === 'force_submitted' ? (
                                                                     <div className="flex flex-col items-center">
                                                                         <span className={`text-xl font-black ${result.score >= 75 ? 'text-emerald-600' : result.score >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>{result.score}</span>
                                                                         <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Nilai Akhir</span>
                                                                     </div>
                                                                ) : (
                                                                    <div className="w-full max-w-[140px] mx-auto">
                                                                         <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1.5">
                                                                            <span>{progressPercent}%</span>
                                                                            <span>{questionsAnswered} / {totalQuestions} Soal</span>
                                                                         </div>
                                                                         <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden shadow-inner">
                                                                             <div className={`h-2.5 rounded-full transition-all duration-500 ${isLocked ? 'bg-rose-400' : 'bg-blue-500'}`} style={{ width: `${progressPercent}%` }}></div>
                                                                         </div>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                                                                <div className="truncate max-w-[280px] opacity-90 p-1.5 bg-slate-50 rounded border border-slate-100" title={result.activityLog && result.activityLog.length > 0 ? result.activityLog[result.activityLog.length - 1] : ''}>
                                                                    {result.activityLog && result.activityLog.length > 0 ? result.activityLog[result.activityLog.length - 1].replace(/\[.*?\]/, '') : '-'}
                                                                </div>
                                                            </td>
                                                            {!isReadOnly && (
                                                                <td className="px-6 py-4 text-center">
                                                                    {(isLocked || isProcessing) && (
                                                                        <button 
                                                                            onClick={() => handleUnlockClick(result.student.studentId, result.examCode)} 
                                                                            disabled={isProcessing}
                                                                            className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold text-white shadow-md shadow-emerald-200 transition-all transform active:scale-95 flex items-center justify-center gap-2
                                                                                ${isProcessing 
                                                                                    ? 'bg-emerald-400 cursor-wait opacity-80' 
                                                                                    : 'bg-emerald-500 hover:bg-emerald-600 hover:-translate-y-0.5'
                                                                                }`}
                                                                        >
                                                                            {isProcessing ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" /> : <LockClosedIcon className="w-3.5 h-3.5" />}
                                                                            {isProcessing ? 'Memproses...' : 'BUKA KUNCI'}
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            )}
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* CARD GRID VIEW (< lg / 1024px) */}
                                    {/* Responsive Grid: 1 col on mobile, 2 cols on Tablet */}
                                    <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
                                        {filteredResults.map((result) => {
                                            const isProcessing = processingIdsRef.current.has(result.student.studentId);
                                            const isLocked = result.status === 'force_submitted';
                                            const questionsAnswered = Object.keys(result.answers).length;
                                            const totalQuestions = exam.questions.filter(q => q.questionType !== 'INFO').length;
                                            const progressPercent = Math.round((questionsAnswered / totalQuestions) * 100) || 0;
                                            
                                            return (
                                                <div key={result.student.studentId} className={`bg-white p-5 rounded-2xl border shadow-sm transition-all hover:shadow-md ${isLocked ? 'border-rose-200 bg-rose-50/30' : 'border-slate-100'}`}>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <h4 className="font-bold text-slate-800 text-base">{result.student.fullName}</h4>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{result.student.class}</span>
                                                                <span className="text-xs text-slate-400 font-mono">{result.student.studentId}</span>
                                                            </div>
                                                        </div>
                                                        <div>{renderStatusBadge(result.status || '')}</div>
                                                    </div>
                                                    
                                                    {/* Progress Section */}
                                                    <div className="mb-5 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                         {result.status === 'completed' || result.status === 'force_submitted' ? (
                                                             <div className="flex items-center justify-between">
                                                                 <span className="text-xs font-bold text-slate-400 uppercase">Nilai Akhir</span>
                                                                 <div className="bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">
                                                                    <span className={`text-xl font-black leading-none ${result.score >= 75 ? 'text-emerald-600' : result.score >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>{result.score}</span>
                                                                 </div>
                                                             </div>
                                                         ) : (
                                                             <div>
                                                                 <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                                                                     <span>Progress</span>
                                                                     <span>{Math.round(progressPercent)}%</span>
                                                                 </div>
                                                                 <div className="w-full bg-white rounded-full h-3 overflow-hidden border border-slate-200">
                                                                     <div className={`h-3 rounded-full transition-all duration-500 ${isLocked ? 'bg-rose-400' : 'bg-blue-500'}`} style={{ width: `${progressPercent}%` }}></div>
                                                                 </div>
                                                                 <div className="text-right mt-1.5 text-[10px] text-slate-400 font-medium">{questionsAnswered} dari {totalQuestions} soal terjawab</div>
                                                             </div>
                                                         )}
                                                    </div>

                                                    {/* Footer: Log & Action */}
                                                    <div className="flex items-center gap-3 pt-2">
                                                        <div className="flex-1 min-w-0 bg-slate-50 rounded-lg p-2 border border-slate-100">
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Aktivitas Terakhir</p>
                                                            <p className="text-xs text-slate-600 font-mono truncate">
                                                                {result.activityLog && result.activityLog.length > 0 ? result.activityLog[result.activityLog.length - 1].replace(/\[.*?\]/, '') : '-'}
                                                            </p>
                                                        </div>
                                                        {!isReadOnly && (isLocked || isProcessing) && (
                                                            <button 
                                                                onClick={() => handleUnlockClick(result.student.studentId, result.examCode)} 
                                                                disabled={isProcessing}
                                                                className={`h-full px-4 rounded-xl text-xs font-bold text-white shadow-md transition-all active:scale-95 flex flex-col items-center justify-center gap-1 min-w-[80px]
                                                                    ${isProcessing 
                                                                        ? 'bg-emerald-400 cursor-wait' 
                                                                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                                                                    }`}
                                                            >
                                                                {isProcessing ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <LockClosedIcon className="w-5 h-5" />}
                                                                <span>{isProcessing ? '...' : 'BUKA'}</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                             ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 min-h-[400px]">
                                    <div className="bg-slate-100 p-8 rounded-full mb-6 ring-8 ring-slate-50">
                                        <WifiIcon className="w-16 h-16 text-slate-300" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-700">Menunggu Peserta...</h3>
                                    <p className="text-sm text-center px-4 max-w-xs mt-2 text-slate-500 leading-relaxed">Belum ada siswa yang bergabung dalam sesi ujian ini. Data akan muncul otomatis.</p>
                                </div>
                             )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface FinishedExamModalProps { exam: Exam | null; results: Result[]; onClose: () => void; }
export const FinishedExamModal: React.FC<FinishedExamModalProps> = ({ exam, results, onClose }) => {
    if (!exam) return null;
    const examResults = results.filter(r => r.examCode === exam.code).sort((a,b) => b.score - a.score);
    
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 z-50 animate-fade-in">
            <div className="bg-white sm:rounded-2xl shadow-2xl w-full max-w-5xl h-full sm:max-h-[90vh] flex flex-col overflow-hidden border-0 sm:border border-white/20">
                <div className="p-5 sm:p-6 border-b flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Hasil Ujian</h2>
                        <div className="flex items-center gap-2 mt-1">
                             <span className="bg-blue-100 text-blue-700 font-mono px-2 py-0.5 rounded text-sm font-bold">{exam.code}</span>
                             <span className="text-slate-400 text-sm">•</span>
                             <span className="text-sm text-slate-500 font-medium">Total Peserta: {examResults.length}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 hover:bg-slate-200 rounded-xl transition-colors bg-white border border-slate-200 shadow-sm"><XMarkIcon className="w-5 h-5 text-slate-500"/></button>
                </div>
                <div className="flex-1 overflow-y-auto bg-slate-50 p-0 sm:p-0">
                    <div className="min-w-full inline-block align-middle">
                        <div className="border-b border-gray-200 shadow-sm">
                             <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-white sticky top-0 shadow-sm z-10">
                                    <tr>
                                        <th className="px-3 sm:px-6 py-4 text-left text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Peringkat</th>
                                        <th className="px-3 sm:px-6 py-4 text-left text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Siswa</th>
                                        <th className="px-3 sm:px-6 py-4 text-center text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Nilai</th>
                                        <th className="hidden sm:table-cell px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Detail</th>
                                        <th className="hidden sm:table-cell px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {examResults.map((r, idx) => (
                                        <tr key={r.student.studentId} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                                {idx === 0 ? <span className="bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-lg font-bold text-[10px] sm:text-xs border border-yellow-200 shadow-sm">🥇 1st</span> :
                                                idx === 1 ? <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-bold text-[10px] sm:text-xs border border-slate-200 shadow-sm">🥈 2nd</span> :
                                                idx === 2 ? <span className="bg-orange-100 text-orange-800 px-2.5 py-1 rounded-lg font-bold text-[10px] sm:text-xs border border-orange-200 shadow-sm">🥉 3rd</span> :
                                                <span className="text-slate-400 font-mono text-xs sm:text-sm ml-2 font-bold">#{idx + 1}</span>}
                                            </td>
                                            <td className="px-3 sm:px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-800 text-xs sm:text-sm">{r.student.fullName}</span>
                                                    <span className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5">{r.student.class}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 sm:px-6 py-4 text-center">
                                                <span className={`text-sm sm:text-lg font-black ${r.score >= 75 ? 'text-emerald-600' : r.score >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                                                    {r.score}
                                                </span>
                                            </td>
                                            <td className="hidden sm:table-cell px-6 py-4 text-center">
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-lg border border-slate-200">
                                                    <span className="text-xs font-bold text-slate-700">{r.correctAnswers}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium">/ {r.totalQuestions} Benar</span>
                                                </div>
                                            </td>
                                            <td className="hidden sm:table-cell px-6 py-4 text-center">
                                                <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold uppercase border border-slate-200">{r.status}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
