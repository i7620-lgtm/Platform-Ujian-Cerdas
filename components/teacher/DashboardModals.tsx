
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Exam, Result, TeacherProfile, Question } from '../../types';
import { XMarkIcon, WifiIcon, LockClosedIcon, CheckCircleIcon, ChartBarIcon, ChevronDownIcon, PlusCircleIcon, ShareIcon, ArrowPathIcon, QrCodeIcon, DocumentDuplicateIcon, ChevronUpIcon, EyeIcon, UserIcon, TableCellsIcon, ListBulletIcon, ExclamationTriangleIcon, DocumentArrowUpIcon, ClockIcon, SignalIcon } from '../Icons';
import { storageService } from '../../services/storage';
import { supabase } from '../../lib/supabase';
import { RemainingTime, QuestionAnalysisItem, StatWidget } from './DashboardViews';
import { StudentResultPage } from '../StudentResultPage';

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
    const isLargeScale = displayExam.config.disableRealtime;

    return (
        <>
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 z-50 animate-fade-in">
                <div className="bg-white sm:rounded-[2rem] shadow-2xl w-full max-w-6xl h-full sm:h-[90vh] flex flex-col overflow-hidden relative border border-white">
                    {/* Header Modal */}
                    <div className="px-6 py-5 border-b border-slate-100 flex flex-col gap-4 bg-white sticky top-0 z-20 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                                    <SignalIcon className="w-5 h-5"/>
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-800 tracking-tight">Live Monitoring</h2>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200 tracking-widest uppercase">{displayExam.code}</span>
                                        <RemainingTime exam={displayExam} />
                                        {isRefreshing && <span className="text-[10px] font-bold text-indigo-500 animate-pulse">Sync...</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {!isReadOnly && displayExam.config.enablePublicStream && !isLargeScale && (
                                    <button onClick={() => setIsShareModalOpen(true)} className="p-2 sm:px-4 sm:py-2 bg-indigo-50 text-indigo-600 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-indigo-100 transition-all flex items-center gap-2 shadow-sm border border-indigo-100">
                                        <ShareIcon className="w-4 h-4"/> <span className="hidden sm:inline">Stream</span>
                                    </button>
                                )}
                                {!isReadOnly && !isLargeScale && (
                                    <button onClick={() => setIsAddTimeOpen(!isAddTimeOpen)} className="p-2 sm:px-4 sm:py-2 bg-indigo-50 text-indigo-600 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-indigo-100 transition-all flex items-center gap-2 shadow-sm border border-indigo-100">
                                        <PlusCircleIcon className="w-4 h-4"/> <span className="hidden sm:inline">Waktu</span>
                                    </button>
                                )}
                                <button onClick={onClose} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all border border-transparent hover:border-rose-100">
                                    <XMarkIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                <div className={`w-2 h-2 rounded-full ${isLargeScale ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></div>
                                {isLargeScale ? 'Sync Mode (Hemat Data)' : 'Realtime Mode'}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:inline">Filter Kelas:</span>
                                <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer shadow-sm">
                                    <option value="ALL">SEMUA KELAS</option>
                                    {Array.from(new Set(localResults.map(r => r.student.class))).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-auto bg-slate-50/50 p-4 sm:p-6 relative">
                        {isAddTimeOpen && !isReadOnly && (
                            <div className="mb-6 p-5 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-200 text-white animate-slide-in-up flex items-center justify-between sticky top-0 z-30 mx-1">
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

                        {/* TABEL LIVE MONITOR - DESAIN BARU */}
                        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden min-h-[300px] flex flex-col">
                            <div className="overflow-x-auto custom-scrollbar flex-1">
                                <table className="w-full min-w-[900px] text-left border-collapse">
                                    <thead className="bg-slate-50/80 backdrop-blur-md text-slate-500 sticky top-0 z-10 border-b border-slate-100">
                                        <tr>
                                            {/* Kolom 1: Siswa */}
                                            <th className="px-5 py-4 w-64">
                                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    <UserIcon className="w-3.5 h-3.5 sm:hidden" />
                                                    <span className="hidden sm:inline">Identitas Siswa</span>
                                                </div>
                                            </th>
                                            {/* Kolom 2: Kelas */}
                                            <th className="px-5 py-4 w-32">
                                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    <ListBulletIcon className="w-3.5 h-3.5 sm:hidden" />
                                                    <span className="hidden sm:inline">Kelas</span>
                                                </div>
                                            </th>
                                            {/* Kolom 3: Status */}
                                            <th className="px-5 py-4 text-center w-32">
                                                <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    <div className="w-3 h-3 rounded-full border-2 border-slate-300 sm:hidden"></div>
                                                    <span className="hidden sm:inline">Status</span>
                                                </div>
                                            </th>
                                            {/* Kolom 4: Progress */}
                                            <th className="px-5 py-4 text-center w-40">
                                                <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    <ChartBarIcon className="w-3.5 h-3.5 sm:hidden" />
                                                    <span className="hidden sm:inline">Progres</span>
                                                </div>
                                            </th>
                                            {/* Kolom 5: Terakhir Aktif */}
                                            <th className="px-5 py-4 text-center w-32">
                                                <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    <ClockIcon className="w-3.5 h-3.5 sm:hidden" />
                                                    <span className="hidden sm:inline">Aktif</span>
                                                </div>
                                            </th>
                                            {/* Kolom 6: Lokasi (BARU) */}
                                            <th className="px-5 py-4 text-center w-32">
                                                <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    <SignalIcon className="w-3.5 h-3.5 sm:hidden" />
                                                    <span className="hidden sm:inline">Lokasi</span>
                                                </div>
                                            </th>
                                            {/* Kolom 7: Aksi */}
                                            <th className="px-5 py-4 text-right w-32">
                                                <div className="flex items-center justify-end gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    <LockClosedIcon className="w-3.5 h-3.5 sm:hidden" />
                                                    <span className="hidden sm:inline">Aksi</span>
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {localResults.length > 0 ? localResults.map((r) => { 
                                            const totalQ = displayExam.questions.filter(q=>q.questionType!=='INFO').length; 
                                            const broadcastData = broadcastProgressRef.current[r.student.studentId]; 
                                            
                                            // Logic Progress & Timestamp
                                            const answered = r.status === 'in_progress' && broadcastData ? broadcastData.answered : Object.keys(r.answers).length; 
                                            const lastActive = r.status === 'in_progress' && broadcastData ? broadcastData.timestamp : r.timestamp; 
                                            const progress = totalQ > 0 ? Math.round((answered/totalQ)*100) : 0; 
                                            
                                            return (
                                                <tr key={r.student.studentId} className="hover:bg-slate-50/80 transition-colors group">
                                                    {/* 1. Siswa */}
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold border border-indigo-100 shadow-sm">
                                                                {r.student.fullName.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-slate-800 text-sm">{r.student.fullName}</div>
                                                                <div className="text-[10px] text-slate-400 font-mono tracking-wide">#{r.student.studentId.split('-').pop()}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {/* 2. Kelas */}
                                                    <td className="px-5 py-3">
                                                        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">{r.student.class}</span>
                                                    </td>
                                                    {/* 3. Status */}
                                                    <td className="px-5 py-3">
                                                        <div className="flex justify-center">
                                                            {r.status === 'force_closed' ? (
                                                                <span className="px-2.5 py-1 bg-rose-50 text-rose-600 rounded-md text-[10px] font-black uppercase flex items-center gap-1.5 border border-rose-100" title={r.activityLog?.slice(-1)[0]}>
                                                                    <LockClosedIcon className="w-3 h-3"/> Locked
                                                                </span>
                                                            ) : r.status === 'completed' ? (
                                                                <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-md text-[10px] font-black uppercase flex items-center gap-1.5 border border-slate-200">
                                                                    <CheckCircleIcon className="w-3 h-3"/> Selesai
                                                                </span>
                                                            ) : (
                                                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-black uppercase flex items-center gap-1.5 border border-emerald-100 shadow-sm">
                                                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Online
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    {/* 4. Progress */}
                                                    <td className="px-5 py-3">
                                                        {isLargeScale ? (
                                                            <div className="text-center text-[10px] text-slate-400 italic">Hidden</div>
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-1.5 w-full max-w-[100px] mx-auto">
                                                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                                                    <div className={`h-full transition-all duration-700 ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{width: `${progress}%`}}></div>
                                                                </div>
                                                                <span className="text-[9px] font-bold text-slate-500">{answered} / {totalQ} Soal ({progress}%)</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    {/* 5. Last Active */}
                                                    <td className="px-5 py-3 text-center">
                                                        {isLargeScale ? (
                                                            <span className="text-[10px] text-slate-300">-</span>
                                                        ) : (
                                                            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                                                {getRelativeTime(lastActive)}
                                                            </span>
                                                        )}
                                                    </td>
                                                    {/* 6. Lokasi (NEW) */}
                                                    <td className="px-5 py-3 text-center">
                                                        {r.location ? (
                                                            <a href={`https://www.google.com/maps?q=${r.location}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors border border-blue-100">
                                                                Maps ↗
                                                            </a>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-300 italic">N/A</span>
                                                        )}
                                                    </td>
                                                    {/* 7. Aksi */}
                                                    <td className="px-5 py-3 text-right">
                                                        {(r.status === 'in_progress' || r.status === 'force_closed') && !isReadOnly && (
                                                            <button 
                                                                onClick={() => handleGenerateToken(r.student.studentId, r.student.fullName)} 
                                                                className="px-3 py-1.5 bg-white text-indigo-600 text-[10px] font-black uppercase rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition-all border border-indigo-200 shadow-sm active:scale-95 whitespace-nowrap"
                                                            >
                                                                Buat Token
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ); 
                                        }) : (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-20 text-center">
                                                    <div className="flex flex-col items-center justify-center text-slate-300 gap-2">
                                                        <UserIcon className="w-8 h-8 opacity-20"/>
                                                        <span className="text-sm font-medium italic">Belum ada siswa yang bergabung...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 font-medium flex justify-between items-center sticky bottom-0">
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
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border border-white relative animate-slide-in-up">
                        <button onClick={() => setGeneratedTokenData(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-colors"><XMarkIcon className="w-5 h-5"/></button>
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-emerald-50/50">
                            <LockClosedIcon className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 mb-1">Kode Akses Dibuat!</h3>
                        <p className="text-xs text-slate-500 mb-6 px-4">Berikan kode ini kepada <strong>{generatedTokenData.name}</strong> untuk membuka sesi ujian.</p>
                        
                        <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl py-5 mb-6 shadow-inner">
                            <span className="text-4xl font-mono font-black tracking-[0.25em] text-slate-800">{generatedTokenData.token}</span>
                        </div>
                        
                        <button onClick={() => setGeneratedTokenData(null)} className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition-all shadow-lg active:scale-[0.98] text-sm uppercase tracking-wider">Tutup</button>
                    </div>
                </div>
            )}

            {isShareModalOpen && (<div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in"><div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-8 text-center animate-slide-in-up border border-white"><div className="flex justify-between items-center mb-6"><h3 className="font-bold text-lg text-slate-800 tracking-tight">Akses Pantauan</h3><button onClick={() => setIsShareModalOpen(false)} className="p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-rose-50 hover:text-rose-600 transition-colors"><XMarkIcon className="w-5 h-5" /></button></div><div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-lg mb-6 inline-block mx-auto relative group"><div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-3xl opacity-20 blur group-hover:opacity-30 transition-opacity"></div><img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(liveUrl)}&margin=10`} alt="QR Code Live" className="w-48 h-48 object-contain relative bg-white rounded-xl"/></div><p className="text-xs text-slate-500 font-medium mb-6 leading-relaxed px-2">Minta orang tua siswa untuk memindai QR Code di atas atau bagikan link di bawah ini.</p><div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100"><div className="flex-1 px-3 py-1 overflow-hidden"><p className="text-xs font-mono text-slate-600 truncate text-left">{liveUrl}</p></div><button onClick={() => { navigator.clipboard.writeText(liveUrl); alert("Link berhasil disalin!"); }} className="p-2 bg-white text-indigo-600 rounded-lg shadow-sm border border-slate-100 hover:bg-indigo-50 transition-colors" title="Salin Link"><DocumentDuplicateIcon className="w-4 h-4" /></button></div></div></div>)}
        </>
    );
};

// --- FinishedExamModal (Updated) ---
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

    useEffect(() => {
        const fetchResults = async () => {
            setIsLoading(true);
            try {
                const data = await storageService.getResults(exam.code, undefined);
                
                // --- AUTO RE-CALCULATION CHECK ---
                let discrepancyCount = 0;
                const recalculatedResults = data.map(r => {
                    const stats = getCalculatedStats(r);
                    if (stats.score !== r.score || stats.correct !== r.correctAnswers) {
                        discrepancyCount++;
                        return {
                            ...r,
                            score: stats.score,
                            correctAnswers: stats.correct,
                            totalQuestions: stats.correct + stats.wrong + stats.empty
                        };
                    }
                    return r;
                });

                if (discrepancyCount > 0) {
                    setFixMessage(`Terdeteksi ${discrepancyCount} nilai tidak sesuai (mungkin karena kunci jawaban berubah). Tampilan ini menggunakan hasil hitung ulang otomatis.`);
                    setResults(recalculatedResults);
                } else {
                    setResults(data);
                }
            } catch (error) {
                console.error("Failed to fetch results", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchResults();
    }, [exam, teacherProfile]);

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

    const checkAnswerStatus = (q: Question, studentAnswers: Record<string, string>) => {
        const ans = studentAnswers[q.id];
        if (!ans) return 'EMPTY';

        const studentAns = normalize(String(ans));
        const correctAns = normalize(String(q.correctAnswer || ''));

        if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
            return studentAns === correctAns ? 'CORRECT' : 'WRONG';
        } 
        else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
            const sSet = new Set(studentAns.split(',').map(s=>s.trim()));
            const cSet = new Set(correctAns.split(',').map(s=>s.trim()));
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

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-white relative">
                 <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white sticky top-0 z-10 gap-4">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Analisis Hasil Ujian</h2>
                        <p className="text-sm text-slate-500">{exam.config.subject} • {exam.code}</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="bg-slate-100 p-1 rounded-xl flex">
                            <button onClick={() => setActiveTab('ANALYSIS')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'ANALYSIS' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Analisis Soal</button>
                            <button onClick={() => setActiveTab('STUDENTS')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'STUDENTS' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Rekap Siswa</button>
                        </div>
                        <button onClick={onClose} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all">
                            <XMarkIcon className="w-6 h-6"/>
                        </button>
                    </div>
                </div>

                {fixMessage && (
                    <div className="bg-amber-50 px-6 py-3 border-b border-amber-100 flex items-center justify-between gap-4 animate-slide-in-up">
                        <div className="flex items-center gap-3 text-amber-800">
                            <ExclamationTriangleIcon className="w-5 h-5 shrink-0" />
                            <p className="text-xs font-bold">{fixMessage}</p>
                        </div>
                        <button onClick={handleDownloadCorrected} className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 text-[10px] font-bold uppercase rounded-lg shadow-sm transition-colors flex items-center gap-2">
                             <DocumentArrowUpIcon className="w-3 h-3"/> Unduh Data Perbaikan
                        </button>
                    </div>
                )}

                <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full text-slate-400 font-bold">Memuat data...</div>
                    ) : (
                        activeTab === 'ANALYSIS' ? (
                            <div className="space-y-8">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <StatWidget label="Rata-rata" value={averageScore} color="bg-indigo-50" icon={ChartBarIcon} />
                                    <StatWidget label="Tertinggi" value={highestScore} color="bg-emerald-50" icon={CheckCircleIcon} />
                                    <StatWidget label="Terendah" value={lowestScore} color="bg-rose-50" icon={XMarkIcon} />
                                    <StatWidget label="Partisipan" value={totalStudents} color="bg-blue-50" icon={UserIcon} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <TableCellsIcon className="w-5 h-5 text-slate-400"/>
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
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/50">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Siswa</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kelas</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Nilai</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">B/S/K</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Aktivitas</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Lokasi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {results.map(r => {
                                            const { correct, wrong, empty, score } = getCalculatedStats(r);
                                            return (
                                                <React.Fragment key={r.student.studentId}>
                                                    <tr onClick={() => toggleStudent(r.student.studentId)} className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`transition-transform duration-300 ${expandedStudent === r.student.studentId ? 'rotate-180' : ''}`}>
                                                                    <ChevronDownIcon className="w-4 h-4 text-slate-300 group-hover:text-indigo-500" />
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{r.student.fullName}</div>
                                                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">#{r.student.studentId.split('-').pop()}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{r.student.class}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`text-sm font-black px-2 py-1 rounded ${score >= 75 ? 'text-emerald-600 bg-emerald-50' : score >= 50 ? 'text-orange-600 bg-orange-50' : 'text-rose-600 bg-rose-50'}`}>
                                                                {score}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center text-xs font-bold text-slate-600">
                                                            <span className="text-emerald-600" title="Benar">{correct}</span> / <span className="text-rose-600" title="Salah">{wrong}</span> / <span className="text-slate-400" title="Kosong">{empty}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            {r.activityLog && r.activityLog.length > 0 ? (
                                                                <div className="group/log relative inline-block">
                                                                    <span className="cursor-help text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100 flex items-center justify-center gap-1 w-fit mx-auto">
                                                                        <ListBulletIcon className="w-3 h-3"/> {r.activityLog.length} Log
                                                                    </span>
                                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-[10px] p-2 rounded-lg opacity-0 invisible group-hover/log:opacity-100 group-hover/log:visible transition-all z-20 pointer-events-none">
                                                                        <ul className="list-disc pl-3 space-y-1">
                                                                            {r.activityLog.slice(0, 5).map((log, i) => <li key={i}>{log}</li>)}
                                                                            {r.activityLog.length > 5 && <li>...dan {r.activityLog.length - 5} lainnya</li>}
                                                                        </ul>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">Aman</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-center text-xs text-slate-500 font-mono">
                                                            {exam.config.trackLocation && r.location ? (
                                                                <a href={`https://www.google.com/maps?q=${r.location}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:underline flex items-center justify-center gap-1">Maps ↗</a>
                                                            ) : '-'}
                                                        </td>
                                                    </tr>
                                                    {expandedStudent === r.student.studentId && (
                                                        <tr className="animate-fade-in bg-slate-50/50 shadow-inner">
                                                            <td colSpan={6} className="p-6">
                                                                <div className="flex items-center gap-4 mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                                                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-300 rounded"></div> Benar</span>
                                                                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-rose-300 rounded"></div> Salah</span>
                                                                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-200 rounded"></div> Kosong</span>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1 mt-2">
                                                                    {exam.questions.filter(q => q.questionType !== 'INFO').map((q, idx) => {
                                                                        const status = checkAnswerStatus(q, r.answers);
                                                                        let bgClass = 'bg-slate-200'; 
                                                                        if (status === 'CORRECT') bgClass = 'bg-emerald-300';
                                                                        else if (status === 'WRONG') bgClass = 'bg-rose-300';
                                                                        return <div key={q.id} title={`Soal ${idx+1}: ${status === 'CORRECT' ? 'Benar' : status === 'EMPTY' ? 'Kosong' : 'Salah'}`} className={`w-6 h-6 flex items-center justify-center rounded text-[10px] font-bold text-slate-900 ${bgClass} cursor-help transition-transform hover:scale-110`}>{idx + 1}</div>;
                                                                    })}
                                                                </div>
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
