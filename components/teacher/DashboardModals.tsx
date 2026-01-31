
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Exam, Result, TeacherProfile, Question } from '../../types';
import { XMarkIcon, WifiIcon, LockClosedIcon, CheckCircleIcon, ChartBarIcon, ChevronDownIcon, PlusCircleIcon, ShareIcon, ArrowPathIcon, QrCodeIcon, DocumentDuplicateIcon, ChevronUpIcon, EyeIcon, UserIcon, TableCellsIcon } from '../Icons';
import { storageService } from '../../services/storage';
import { supabase } from '../../lib/supabase';
import { RemainingTime } from './DashboardViews';
import { StudentResultPage } from '../StudentResultPage';

const StatWidget: React.FC<{ label: string; value: string | number; color: string; icon?: React.FC<any> }> = ({ label, value, color, icon: Icon }) => (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md flex-1">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-${color.split('-')[1]}-600`}>
            {Icon ? <Icon className="w-6 h-6" /> : <ChartBarIcon className="w-6 h-6" />}
        </div>
        <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
            <p className="text-xl sm:text-2xl font-black text-slate-800 leading-none mt-1">{value}</p>
        </div>
    </div>
);

// --- COMPONENT: ANALISIS BUTIR SOAL ---
const QuestionAnalysisItem: React.FC<{ q: Question; index: number; stats: any; examResults: Result[] }> = ({ q, index, stats, examResults }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const difficultyColor = stats.correctRate >= 80 
        ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
        : stats.correctRate >= 50 
            ? 'bg-orange-100 text-orange-700 border-orange-200' 
            : 'bg-rose-100 text-rose-700 border-rose-200';

    const difficultyLabel = stats.correctRate >= 80 ? 'Mudah' : stats.correctRate >= 50 ? 'Sedang' : 'Sulit';

    const distribution = useMemo(() => {
        const counts: Record<string, number> = {};
        let totalAnswered = 0;
        
        examResults.forEach(r => {
            const ans = r.answers[q.id];
            if (ans) {
                const normalizedAns = String(ans).trim(); 
                counts[normalizedAns] = (counts[normalizedAns] || 0) + 1;
                totalAnswered++;
            }
        });
        return { counts, totalAnswered };
    }, [examResults, q.id]);

    return (
        <div className={`border rounded-2xl bg-white transition-all duration-300 overflow-hidden ${isExpanded ? 'shadow-md ring-1 ring-indigo-50 border-indigo-100' : 'border-slate-100 hover:border-indigo-100'}`}>
            <div 
                className="p-5 cursor-pointer flex flex-col gap-3"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex justify-between items-start">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Soal {index + 1}</span>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase border ${difficultyColor}`}>
                        {stats.correctRate}% Benar • {difficultyLabel}
                    </span>
                </div>
                
                <div className="text-sm text-slate-700 line-clamp-2 font-medium" dangerouslySetInnerHTML={{ __html: q.questionText }}></div>
                
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                    <div 
                        className={`h-full transition-all duration-1000 ${stats.correctRate >= 80 ? 'bg-emerald-500' : stats.correctRate >= 50 ? 'bg-orange-500' : 'bg-rose-500'}`} 
                        style={{ width: `${stats.correctRate}%` }}
                    ></div>
                </div>
                
                {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-50 animate-fade-in">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Distribusi Jawaban Siswa</p>
                        
                        {q.questionType === 'MULTIPLE_CHOICE' && q.options ? (
                            <div className="space-y-2">
                                {q.options.map((opt, i) => {
                                    const count = distribution.counts[opt] || 0;
                                    const percentage = distribution.totalAnswered > 0 ? Math.round((count / distribution.totalAnswered) * 100) : 0;
                                    const isCorrect = opt === q.correctAnswer;
                                    
                                    return (
                                        <div key={i} className={`relative flex items-center justify-between p-2 rounded-lg text-xs ${isCorrect ? 'bg-emerald-50 border border-emerald-100' : count > 0 ? 'bg-slate-50' : ''}`}>
                                            <div className="flex items-center gap-2 z-10 w-full">
                                                <span className={`w-5 h-5 flex items-center justify-center rounded font-bold ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                    {String.fromCharCode(65+i)}
                                                </span>
                                                <div className="flex-1 truncate" dangerouslySetInnerHTML={{ __html: opt }}></div>
                                                <span className="font-bold text-slate-600">{count} Siswa ({percentage}%)</span>
                                            </div>
                                            <div className={`absolute top-0 left-0 h-full rounded-lg opacity-10 ${isCorrect ? 'bg-emerald-500' : 'bg-slate-500'}`} style={{ width: `${percentage}%` }}></div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="max-h-40 overflow-y-auto custom-scrollbar bg-slate-50 p-3 rounded-xl">
                                <ul className="space-y-2">
                                    {Object.entries(distribution.counts).map(([ans, count], idx) => (
                                        <li key={idx} className="text-xs text-slate-600 flex justify-between border-b border-slate-100 pb-1 last:border-0">
                                            <span className="truncate flex-1 pr-4 italic">"{ans}"</span>
                                            <span className="font-bold">{count} Siswa</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
                
                <div className="flex justify-center mt-1">
                     {isExpanded ? <ChevronUpIcon className="w-4 h-4 text-slate-300"/> : <ChevronDownIcon className="w-4 h-4 text-slate-300"/>}
                </div>
            </div>
        </div>
    );
};

interface OngoingExamModalProps {
    exam: Exam | null;
    teacherProfile?: TeacherProfile;
    onClose: () => void;
    onAllowContinuation: (studentId: string, examCode: string) => void;
    onUpdateExam?: (exam: Exam) => void;
    isReadOnly?: boolean;
}

export const OngoingExamModal: React.FC<OngoingExamModalProps> = ({ exam, onClose, teacherProfile, onAllowContinuation, onUpdateExam, isReadOnly }) => {
    const [displayExam, setDisplayExam] = useState<Exam | null>(exam);
    const [selectedClass, setSelectedClass] = useState<string>('ALL'); 
    const [localResults, setLocalResults] = useState<Result[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isAddTimeOpen, setIsAddTimeOpen] = useState(false);
    const [addTimeValue, setAddTimeValue] = useState<number | ''>('');
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const processingIdsRef = useRef<Set<string>>(new Set());
    
    // Untuk tracking progress broadcast yang belum tersimpan di DB
    const broadcastProgressRef = useRef<Record<string, { answered: number, total: number, timestamp: number }>>({});

    useEffect(() => { setDisplayExam(exam); }, [exam]);

    const fetchLatest = async () => {
        if (!displayExam) return;
        setIsRefreshing(true);
        try {
            const headers: Record<string, string> = teacherProfile ? {
                'x-role': teacherProfile.accountType,
                'x-user-id': teacherProfile.id,
                'x-school': teacherProfile.school
            } : {};
            const data = await storageService.getResults(
                displayExam.code, 
                selectedClass === 'ALL' ? '' : selectedClass,
                headers
            );
            setLocalResults(data);
        } catch (e) { console.error("Fetch failed", e); }
        finally { setIsRefreshing(false); }
    };

    useEffect(() => {
        fetchLatest();
    }, [displayExam, selectedClass, teacherProfile]);

    // HYBRID REALTIME: DB CHANGES (Status) + BROADCAST (Progress)
    useEffect(() => {
        if (!displayExam) return;

        const channel = supabase
            .channel(`exam-room-${displayExam.code}`)
            // 1. Listen DB Changes (Hanya untuk Status Akhir: Selesai/Force Closed)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'results', filter: `exam_code=eq.${displayExam.code}` },
                (payload) => {
                    const newResult = payload.new as any;
                    // Jika status berubah menjadi final, update tabel
                    if (['completed', 'force_closed'].includes(newResult.status)) {
                        setLocalResults(prev => {
                            const idx = prev.findIndex(r => r.student.studentId === newResult.student_id);
                             const convertedResult: Result = {
                                student: { studentId: newResult.student_id, fullName: newResult.student_name, class: newResult.class_name, absentNumber: '00' },
                                examCode: newResult.exam_code,
                                answers: newResult.answers as Record<string, string>,
                                score: newResult.score,
                                correctAnswers: newResult.correct_answers,
                                totalQuestions: newResult.total_questions,
                                status: newResult.status,
                                activityLog: newResult.activity_log,
                                timestamp: new Date(newResult.updated_at).getTime(),
                                location: newResult.location
                            };
                            
                            if (idx >= 0) {
                                const updated = [...prev];
                                updated[idx] = convertedResult;
                                return updated;
                            } else {
                                return [...prev, convertedResult];
                            }
                        });
                    }
                }
            )
            // 2. Listen Broadcast (Untuk Progress Bar Realtime - Hemat DB)
            .on('broadcast', { event: 'student_progress' }, (payload) => {
                const { studentId, answeredCount, totalQuestions, timestamp } = payload.payload;
                
                // Simpan state progress di ref agar persist saat re-render
                broadcastProgressRef.current[studentId] = { answered: answeredCount, total: totalQuestions, timestamp };
                
                // Update state untuk re-render UI
                setLocalResults(prev => {
                    const idx = prev.findIndex(r => r.student.studentId === studentId);
                    if (idx >= 0 && prev[idx].status === 'in_progress') {
                        // Kita hack sedikit objek result di memory dengan data terbaru dari broadcast
                        // Tanpa mengubah struktur asli Result secara permanen di DB
                        const updated = [...prev];
                        updated[idx] = {
                            ...updated[idx],
                            answers: Array(answeredCount).fill('placeholder') as any, // Fake answers length untuk visualisasi progress bar
                            timestamp: timestamp
                        };
                        return updated;
                    }
                    return prev;
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [displayExam]);

    if (!displayExam) return null;

    const handleUnlockClick = async (studentId: string, examCode: string) => {
        processingIdsRef.current.add(studentId);
        try {
            await storageService.unlockStudentExam(examCode, studentId);
            // Fix #3: Optimistic UI Update - Immediately show as unlocked locally
            setLocalResults(prev => prev.map(r => 
                r.student.studentId === studentId 
                ? { ...r, status: 'in_progress' } 
                : r
            ));
            onAllowContinuation(studentId, examCode);
        } catch (error) { alert("Gagal."); } 
        finally { setTimeout(() => processingIdsRef.current.delete(studentId), 3000); }
    };

    const handleAddTimeSubmit = async () => {
        if (!addTimeValue || typeof addTimeValue !== 'number') return;
        try {
            await storageService.extendExamTime(displayExam.code, addTimeValue);
            const newLimit = displayExam.config.timeLimit + addTimeValue;
            setDisplayExam({...displayExam, config: {...displayExam.config, timeLimit: newLimit}});
            if(onUpdateExam) onUpdateExam({...displayExam, config: {...displayExam.config, timeLimit: newLimit}});
            setIsAddTimeOpen(false);
            setAddTimeValue('');
        } catch(e) { alert("Gagal."); }
    };

    const getRelativeTime = (timestamp?: number) => {
        if (!timestamp) return 'Offline';
        const diff = Math.floor((Date.now() - timestamp) / 1000);
        if (diff < 60) return `${diff}dt lalu`;
        return `${Math.floor(diff/60)}mnt lalu`;
    };

    const liveUrl = `${window.location.origin}/?live=${displayExam.code}`;
    
    // Check if large scale mode is enabled
    const isLargeScale = displayExam.config.disableRealtime;

    return (
        <>
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 z-50 animate-fade-in">
                <div className="bg-white sm:rounded-[2rem] shadow-2xl w-full max-w-6xl h-full sm:h-[85vh] flex flex-col overflow-hidden relative border border-white">
                    
                    <div className="px-8 py-6 border-b border-slate-100 flex flex-col gap-6 bg-white sticky top-0 z-20">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                                    <WifiIcon className="w-6 h-6"/>
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Live Monitoring</h2>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200 tracking-widest uppercase">{displayExam.code}</span>
                                        <RemainingTime exam={displayExam} />
                                        {isRefreshing && <span className="text-[10px] font-bold text-indigo-500 animate-pulse">Memuat...</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {!isReadOnly && displayExam.config.enablePublicStream && !isLargeScale && (
                                    <button 
                                        onClick={() => setIsShareModalOpen(true)}
                                        className="px-4 py-2.5 bg-indigo-50 text-indigo-600 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-indigo-100 transition-all flex items-center gap-2 shadow-sm border border-indigo-100"
                                    >
                                        <ShareIcon className="w-4 h-4"/> Akses Orang Tua
                                    </button>
                                )}
                                {!isReadOnly && !isLargeScale && (
                                    <button 
                                        onClick={() => setIsAddTimeOpen(!isAddTimeOpen)} 
                                        className="px-4 py-2.5 bg-indigo-50 text-indigo-600 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-indigo-100 transition-all flex items-center gap-2 shadow-sm border border-indigo-100"
                                    >
                                        <PlusCircleIcon className="w-4 h-4"/> Tambah Waktu
                                    </button>
                                )}
                                <button onClick={onClose} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all"><XMarkIcon className="w-6 h-6"/></button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                <div className={`w-2 h-2 rounded-full ${isLargeScale ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></div>
                                {isLargeScale ? 'Database Sync Active' : 'Broadcast Realtime Active'}
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter:</span>
                                <select 
                                    value={selectedClass} 
                                    onChange={(e) => setSelectedClass(e.target.value)} 
                                    className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer hover:bg-white"
                                >
                                    <option value="ALL">SEMUA KELAS</option>
                                    {Array.from(new Set(localResults.map(r => r.student.class))).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto p-6 bg-slate-50/30">
                        {isAddTimeOpen && !isReadOnly && (
                            <div className="mb-6 p-6 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-100 text-white animate-slide-in-up flex items-center justify-between">
                                <div>
                                    <h4 className="font-black text-lg">Tambah Durasi Ujian</h4>
                                    <p className="text-white/70 text-sm">Waktu tambahan akan berlaku untuk semua siswa.</p>
                                </div>
                                <div className="flex gap-2">
                                    <input type="number" placeholder="Menit" value={addTimeValue} onChange={e=>setAddTimeValue(parseInt(e.target.value))} className="w-24 px-4 py-3 bg-white/20 border border-white/30 rounded-2xl outline-none text-white font-bold placeholder:text-white/50 text-center"/>
                                    <button onClick={handleAddTimeSubmit} className="px-6 bg-white text-indigo-600 font-black text-sm uppercase rounded-2xl hover:bg-indigo-50 transition-colors">Tambah</button>
                                    <button onClick={()=>setIsAddTimeOpen(false)} className="p-3 bg-white/10 rounded-2xl hover:bg-white/20"><XMarkIcon className="w-5 h-5"/></button>
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Siswa</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kelas</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Progres</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Terakhir Aktif</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {localResults.length > 0 ? localResults.map((r) => {
                                        const totalQ = displayExam.questions.filter(q=>q.questionType!=='INFO').length;
                                        
                                        // Prioritaskan data dari Broadcast Ref untuk progress
                                        const broadcastData = broadcastProgressRef.current[r.student.studentId];
                                        const answered = r.status === 'in_progress' && broadcastData 
                                            ? broadcastData.answered 
                                            : Object.keys(r.answers).length;
                                            
                                        const lastActive = r.status === 'in_progress' && broadcastData
                                            ? broadcastData.timestamp
                                            : r.timestamp;

                                        const progress = totalQ > 0 ? Math.round((answered/totalQ)*100) : 0;
                                        
                                        return (
                                            <tr key={r.student.studentId} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800 text-sm">{r.student.fullName}</div>
                                                    <div className="text-[10px] text-slate-300 font-mono mt-0.5">#{r.student.studentId.split('-').pop()}</div>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{r.student.class}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-center">
                                                        {r.status === 'force_closed' ? (
                                                            <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 ring-1 ring-rose-100" title={r.activityLog?.slice(-1)[0]}>
                                                                <LockClosedIcon className="w-3 h-3"/> Dihentikan
                                                            </span>
                                                        ) : r.status === 'completed' ? (
                                                            <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5">
                                                                <CheckCircleIcon className="w-3 h-3"/> Selesai
                                                            </span>
                                                        ) : (
                                                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 ring-1 ring-emerald-100">
                                                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Mengerjakan
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{width: `${progress}%`}}></div>
                                                        </div>
                                                        <span className="text-[10px] font-black text-slate-400">{answered}/{totalQ} Soal</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center text-[10px] font-mono font-bold text-slate-400">
                                                    {getRelativeTime(lastActive)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {r.status === 'force_closed' && !isReadOnly && (
                                                        <button onClick={() => handleUnlockClick(r.student.studentId, r.examCode)} className="px-4 py-2 bg-emerald-500 text-white text-[10px] font-black uppercase rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all active:scale-95">Buka Kunci</button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-300 font-medium italic">Belum ada aktivitas siswa...</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL QR CODE AKSES ORANG TUA */}
            {isShareModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-8 text-center animate-slide-in-up border border-white">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-slate-800 tracking-tight">Akses Pantauan</h3>
                            <button 
                                onClick={() => setIsShareModalOpen(false)}
                                className="p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-lg mb-6 inline-block mx-auto relative group">
                            <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-3xl opacity-20 blur group-hover:opacity-30 transition-opacity"></div>
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(liveUrl)}&margin=10`} 
                                alt="QR Code Live" 
                                className="w-48 h-48 object-contain relative bg-white rounded-xl"
                            />
                        </div>

                        <p className="text-xs text-slate-500 font-medium mb-6 leading-relaxed px-2">
                            Minta orang tua siswa untuk memindai QR Code di atas atau bagikan link di bawah ini.
                        </p>

                        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                            <div className="flex-1 px-3 py-1 overflow-hidden">
                                <p className="text-xs font-mono text-slate-600 truncate text-left">{liveUrl}</p>
                            </div>
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(liveUrl);
                                    alert("Link berhasil disalin!");
                                }}
                                className="p-2 bg-white text-indigo-600 rounded-lg shadow-sm border border-slate-100 hover:bg-indigo-50 transition-colors"
                                title="Salin Link"
                            >
                                <DocumentDuplicateIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

interface FinishedExamModalProps {
    exam: Exam;
    teacherProfile: TeacherProfile;
    onClose: () => void;
}

export const FinishedExamModal: React.FC<FinishedExamModalProps> = ({ exam, teacherProfile, onClose }) => {
    const [results, setResults] = useState<Result[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchResults = async () => {
            setIsLoading(true);
            try {
                const data = await storageService.getResults(exam.code, undefined, {
                    'x-role': teacherProfile.accountType,
                    'x-user-id': teacherProfile.id,
                    'x-school': teacherProfile.school
                });
                setResults(data);
            } catch (error) {
                console.error("Failed to fetch results", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchResults();
    }, [exam, teacherProfile]);

    // Calculate Stats
    const totalStudents = results.length;
    const averageScore = totalStudents > 0 ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / totalStudents) : 0;
    const highestScore = totalStudents > 0 ? Math.max(...results.map(r => r.score)) : 0;
    const lowestScore = totalStudents > 0 ? Math.min(...results.map(r => r.score)) : 0;

    // Calculate Question Stats
    const questionStats = useMemo(() => {
        return exam.questions.filter(q => q.questionType !== 'INFO').map(q => {
            let correctCount = 0;
            results.forEach(r => {
                const ans = r.answers[q.id];
                const studentAns = String(ans || '').trim().toLowerCase();
                const correctAns = String(q.correctAnswer || '').trim().toLowerCase();
                
                if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
                    if (studentAns === correctAns) correctCount++;
                } else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
                     // Check if sets match (order doesn't matter usually, but simple string compare might fail if sorted differently)
                     // Assuming comma separated sorted for simple check or exact match
                     const sSet = new Set(studentAns.split(',').map(s=>s.trim()));
                     const cSet = new Set(correctAns.split(',').map(s=>s.trim()));
                     if (sSet.size === cSet.size && [...sSet].every(x => cSet.has(x))) correctCount++;
                }
            });
            return {
                id: q.id,
                correctRate: totalStudents > 0 ? Math.round((correctCount / totalStudents) * 100) : 0
            };
        });
    }, [results, exam.questions, totalStudents]);

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-white relative">
                 <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Analisis Hasil Ujian</h2>
                        <p className="text-sm text-slate-500">{exam.config.subject} • {exam.code}</p>
                    </div>
                    <button onClick={onClose} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all">
                        <XMarkIcon className="w-6 h-6"/>
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full text-slate-400 font-bold">Memuat data...</div>
                    ) : (
                        <div className="space-y-8">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <StatWidget label="Rata-rata" value={averageScore} color="bg-indigo-50" icon={ChartBarIcon} />
                                <StatWidget label="Tertinggi" value={highestScore} color="bg-emerald-50" icon={CheckCircleIcon} />
                                <StatWidget label="Terendah" value={lowestScore} color="bg-rose-50" icon={XMarkIcon} />
                                <StatWidget label="Partisipan" value={totalStudents} color="bg-blue-50" icon={UserIcon} />
                            </div>

                            {/* Question Analysis */}
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
                    )}
                </div>
            </div>
        </div>
    );
};
