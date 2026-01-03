
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
    <div className={`p-4 rounded-2xl border bg-white shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.02] ${color}`}>
        {Icon && <div className={`p-2 rounded-xl bg-white/50 backdrop-blur-sm shadow-sm`}><Icon className="w-6 h-6 opacity-80" /></div>}
        <div>
            <p className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</p>
            <p className="text-2xl font-black">{value}</p>
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
    // Force re-render saat processingIds berubah (opsional, untuk UI feedback instan)
    const [, setTick] = useState(0);

    // Sync initial props
    useEffect(() => {
        if(exam) {
            // Hanya inisialisasi jika localResults kosong atau berbeda drastis, 
            // untuk menghindari overwrite state internal saat parent re-render.
            if (localResults.length === 0) {
                 setLocalResults(initialResults.filter(r => r.examCode === exam.code));
            }
        }
    }, [initialResults, exam]);

    // INTELLIGENT POLLING
    useEffect(() => {
        if (!exam) return;
        
        const fetchLatest = async () => {
            setIsRefreshing(true);
            try {
                const latest = await storageService.getResults(); 
                const updatedForThisExam = latest.filter(r => r.examCode === exam.code);
                
                setLocalResults(currentResults => {
                    // Buat Map untuk akses cepat ke data saat ini
                    const currentMap = new Map(currentResults.map(r => [r.student.studentId, r]));
                    
                    return updatedForThisExam.map(newItem => {
                        const sId = newItem.student.studentId;
                        
                        // CRITICAL FIX: ANTI-BLINK LOGIC
                        // Jika siswa ini sedang dalam proses unlock (ada di processingIds),
                        // JANGAN timpa data lokal dengan data server (karena data server mungkin masih 'locked'/stale).
                        // Pertahankan state optimistik kita.
                        if (processingIdsRef.current.has(sId)) {
                             const currentItem = currentMap.get(sId);
                             // Pastikan kita mengembalikan item yang statusnya 'in_progress' jika memang itu yg kita set
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

        // Polling setiap 3 detik agar responsif
        const intervalId = setInterval(fetchLatest, 3000);
        return () => clearInterval(intervalId);
    }, [exam]); // Dependencies seminimal mungkin

    const handleUnlockClick = async (studentId: string, examCode: string) => {
        // 1. Tandai sedang diproses (agar polling tidak menimpa)
        processingIdsRef.current.add(studentId);
        setTick(t => t + 1); // Trigger render untuk spinner
        
        // 2. Optimistic Update (Langsung ubah jadi hijau di UI)
        setLocalResults(prev => prev.map(r => 
            r.student.studentId === studentId 
            ? { ...r, status: 'in_progress', activityLog: [...(r.activityLog || []), `[Guru] Membuka kunci akses ujian.`] } 
            : r
        ));

        try {
            // 3. Kirim ke Server
            await storageService.unlockStudentExam(examCode, studentId);
            onAllowContinuation(studentId, examCode);
        } catch (error) {
            alert("Gagal koneksi. Coba lagi.");
            // Revert jika gagal (opsional)
            processingIdsRef.current.delete(studentId);
            setTick(t => t + 1);
        } finally {
            // 4. Hapus dari processing list setelah delay aman
            // Delay ini penting! Kita tunggu sebentar agar polling berikutnya (4s)
            // punya kemungkinan besar sudah mendapatkan data 'Unlocked' dari server.
            setTimeout(() => {
                processingIdsRef.current.delete(studentId);
                setTick(t => t + 1);
            }, 5000); 
        }
    };

    // Derived Data
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
            // Sort: Force Submitted (Locked) paling atas, lalu In Progress, lalu Completed
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

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-[#F8FAFC] rounded-2xl shadow-2xl w-full max-w-[95vw] h-[92vh] flex flex-col overflow-hidden border border-white/20">
                
                {/* HEADER AREA */}
                <div className="bg-white border-b border-gray-200 px-6 py-5 flex-shrink-0">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                             <div className="flex items-center gap-3">
                                <div className="bg-red-50 text-red-600 p-2 rounded-lg">
                                    <div className="relative flex h-3 w-3">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Live Monitoring</h2>
                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">{exam.code}</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <ClockIcon className="w-3 h-3"/> {lastUpdated.toLocaleTimeString()}
                                        </span>
                                        {isRefreshing && <span className="text-blue-600 animate-pulse">Syncing...</span>}
                                    </div>
                                </div>
                             </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-100 p-1 rounded-xl flex">
                                <button onClick={() => setActiveTab('MONITOR')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'MONITOR' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Monitor</button>
                                {exam.config.enablePublicStream && !isReadOnly && (
                                    <button onClick={() => setActiveTab('STREAM_INFO')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'STREAM_INFO' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Stream</button>
                                )}
                            </div>
                            <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors border border-transparent hover:border-slate-200">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {activeTab === 'MONITOR' && (
                        <div className="flex flex-col md:flex-row gap-4 items-stretch justify-between">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
                                <StatWidget label="Total" value={totalStudents} color="bg-blue-50/50 border-blue-100 text-blue-700" icon={ChartBarIcon} />
                                <StatWidget label="Aktif" value={activeStudents} color="bg-emerald-50/50 border-emerald-100 text-emerald-700" icon={WifiIcon} />
                                <StatWidget label="Selesai" value={finishedStudents} color="bg-purple-50/50 border-purple-100 text-purple-700" icon={CheckCircleIcon} />
                                <StatWidget label="Terkunci" value={suspendedStudents} color="bg-rose-50/50 border-rose-100 text-rose-700" icon={LockClosedIcon} />
                            </div>
                            
                            {/* Filter */}
                            <div className="flex flex-col justify-end min-w-[150px]">
                                <label className="text-xs font-bold text-slate-400 mb-1.5 uppercase ml-1">Filter Kelas</label>
                                <select 
                                    value={filterClass} 
                                    onChange={(e) => setFilterClass(e.target.value)} 
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer hover:border-blue-300"
                                >
                                    <option value="ALL">Semua Kelas</option>
                                    {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 overflow-hidden relative bg-[#F8FAFC]">
                    {activeTab === 'STREAM_INFO' && !isReadOnly ? (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
                            <div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-100 max-w-lg w-full">
                                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                    <WifiIcon className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800 mb-2">Public Livestream</h3>
                                <p className="text-slate-500 mb-6">Bagikan link ini agar orang tua atau pengawas lain dapat memantau ujian secara real-time tanpa login.</p>
                                
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 font-mono text-sm text-slate-600 break-all select-all">
                                    {streamUrl}
                                </div>
                                
                                <div className="flex gap-3 justify-center">
                                    <button onClick={() => navigator.clipboard.writeText(streamUrl)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-colors shadow-lg shadow-slate-200">
                                        Salin Link
                                    </button>
                                    <a href={streamUrl} target="_blank" rel="noreferrer" className="bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 transition-colors">
                                        Buka Link
                                    </a>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full overflow-auto p-4 sm:p-6 custom-scrollbar">
                             {filteredResults.length > 0 ? (
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                    <table className="min-w-full divide-y divide-slate-100">
                                        <thead className="bg-slate-50/80 backdrop-blur sticky top-0 z-10">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-16">#</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Siswa</th>
                                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider w-32">Status</th>
                                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider w-40">Progress</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider min-w-[250px]">Log Terakhir</th>
                                                {!isReadOnly && <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider w-32">Kontrol</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {filteredResults.map(result => {
                                                const isProcessing = processingIdsRef.current.has(result.student.studentId);
                                                const isLocked = result.status === 'force_submitted';
                                                const questionsAnswered = Object.keys(result.answers).length;
                                                const totalQuestions = exam.questions.filter(q => q.questionType !== 'INFO').length;
                                                const progressPercent = Math.round((questionsAnswered / totalQuestions) * 100) || 0;

                                                return (
                                                    <tr key={result.student.studentId} className={`group transition-colors ${isLocked ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-slate-50'}`}>
                                                        <td className="px-6 py-4 text-sm font-mono text-slate-400">
                                                            {result.student.studentId}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-slate-700 text-sm">{result.student.fullName}</span>
                                                                <span className="text-xs text-slate-400 font-medium">{result.student.class}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            {result.status === 'in_progress' ? 
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/> Aktif
                                                                </span> :
                                                             result.status === 'completed' ? 
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                                    Selesai
                                                                </span> :
                                                             result.status === 'force_submitted' ? 
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                                                                    <LockClosedIcon className="w-3 h-3"/> Terkunci
                                                                </span> :
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500">
                                                                    Offline
                                                                </span>
                                                            }
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {result.status === 'completed' || result.status === 'force_submitted' ? (
                                                                 <div className="text-center">
                                                                     <span className="text-lg font-black text-slate-800">{result.score}</span>
                                                                     <span className="text-[10px] text-slate-400 block uppercase font-bold">Nilai Akhir</span>
                                                                 </div>
                                                            ) : (
                                                                <div className="w-full max-w-[120px] mx-auto">
                                                                     <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                                                                        <span>{progressPercent}%</span>
                                                                        <span>{questionsAnswered}/{totalQuestions}</span>
                                                                     </div>
                                                                     <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                                         <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                                                                     </div>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                                                            <div className="truncate max-w-[250px] opacity-80" title={result.activityLog && result.activityLog.length > 0 ? result.activityLog[result.activityLog.length - 1] : ''}>
                                                                {result.activityLog && result.activityLog.length > 0 ? result.activityLog[result.activityLog.length - 1].replace(/\[.*?\]/, '') : '-'}
                                                            </div>
                                                        </td>
                                                        {!isReadOnly && (
                                                            <td className="px-6 py-4 text-center">
                                                                {(isLocked || isProcessing) && (
                                                                    <button 
                                                                        onClick={() => handleUnlockClick(result.student.studentId, result.examCode)} 
                                                                        disabled={isProcessing}
                                                                        className={`w-full py-2 px-3 rounded-lg text-xs font-bold text-white shadow-md shadow-emerald-200 transition-all transform active:scale-95 flex items-center justify-center gap-2
                                                                            ${isProcessing 
                                                                                ? 'bg-emerald-400 cursor-wait opacity-80' 
                                                                                : 'bg-emerald-500 hover:bg-emerald-600 hover:-translate-y-0.5'
                                                                            }`}
                                                                    >
                                                                        {isProcessing ? (
                                                                            <>
                                                                                <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                                                                                Memproses
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <LockClosedIcon className="w-3.5 h-3.5" />
                                                                                BUKA KUNCI
                                                                            </>
                                                                        )}
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
                             ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 min-h-[400px]">
                                    <div className="bg-slate-100 p-6 rounded-full mb-4">
                                        <WifiIcon className="w-12 h-12 text-slate-300" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-600">Menunggu Peserta...</h3>
                                    <p className="text-sm">Belum ada siswa yang bergabung dalam ujian ini.</p>
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Hasil Ujian: <span className="text-blue-600 font-mono">{exam.code}</span></h2>
                        <p className="text-sm text-slate-500">Total Peserta: {examResults.length}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><XMarkIcon className="w-6 h-6 text-slate-500"/></button>
                </div>
                <div className="p-0 overflow-y-auto bg-slate-50">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-white sticky top-0 shadow-sm">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Peringkat</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Siswa</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Nilai</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Benar / Total</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                            {examResults.map((r, idx) => (
                                <tr key={r.student.studentId} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {idx === 0 ? <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded font-bold text-xs">🥇 Ke-1</span> :
                                         idx === 1 ? <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded font-bold text-xs">🥈 Ke-2</span> :
                                         idx === 2 ? <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded font-bold text-xs">🥉 Ke-3</span> :
                                         <span className="text-slate-500 font-mono text-sm ml-2">#{idx + 1}</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-700">{r.student.fullName}</span>
                                            <span className="text-xs text-slate-400">{r.student.class} ({r.student.studentId})</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`text-lg font-black ${r.score >= 75 ? 'text-emerald-600' : r.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                            {r.score}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm text-slate-600 font-medium">
                                        {r.correctAnswers} / {r.totalQuestions}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold uppercase">{r.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
 
