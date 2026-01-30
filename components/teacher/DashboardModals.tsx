 
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Exam, Result, TeacherProfile, Question } from '../../types';
import { XMarkIcon, WifiIcon, LockClosedIcon, CheckCircleIcon, ChartBarIcon, ChevronDownIcon, PlusCircleIcon, ShareIcon, ArrowPathIcon, QrCodeIcon, DocumentDuplicateIcon, ChevronUpIcon, EyeIcon, UserIcon, TableCellsIcon } from '../Icons';
import { storageService } from '../../services/storage';
import { supabase } from '../../lib/supabase'; // IMPORT SUPABASE
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

    // Logic Warna: <50 Merah (Sulit), 50-79 Oranye (Sedang), >=80 Hijau (Mudah)
    const difficultyColor = stats.correctRate >= 80 
        ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
        : stats.correctRate >= 50 
            ? 'bg-orange-100 text-orange-700 border-orange-200' 
            : 'bg-rose-100 text-rose-700 border-rose-200';

    const difficultyLabel = stats.correctRate >= 80 ? 'Mudah' : stats.correctRate >= 50 ? 'Sedang' : 'Sulit';

    // Menghitung Distribusi Jawaban (Distractor Analysis)
    const distribution = useMemo(() => {
        const counts: Record<string, number> = {};
        let totalAnswered = 0;
        
        examResults.forEach(r => {
            const ans = r.answers[q.id];
            if (ans) {
                const normalizedAns = String(ans).trim(); // Simplifikasi, idealnya normalisasi huruf opsi
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
                                            {/* Bar Background untuk visualisasi proporsi */}
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
    const [isShareModalOpen, setIsShareModalOpen] = useState(false); // State untuk Modal Share
    const processingIdsRef = useRef<Set<string>>(new Set());

    useEffect(() => { setDisplayExam(exam); }, [exam]);

    // FETCH INITIAL DATA
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

    // REALTIME SUBSCRIPTION
    useEffect(() => {
        if (!displayExam) return;

        const channel = supabase
            .channel('public:results')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to INSERT, UPDATE
                    schema: 'public',
                    table: 'results',
                    filter: `exam_code=eq.${displayExam.code}`
                },
                (payload) => {
                    const newResult = payload.new as any;
                    
                    // Filter based on class if selected
                    if (selectedClass !== 'ALL' && newResult.class_name !== selectedClass) return;

                    // Convert raw DB format to App Result format
                    const convertedResult: Result = {
                        student: {
                            studentId: newResult.student_id,
                            fullName: newResult.student_name,
                            class: newResult.class_name,
                            absentNumber: '00'
                        },
                        examCode: newResult.exam_code,
                        answers: newResult.answers,
                        score: newResult.score,
                        correctAnswers: newResult.correct_answers,
                        totalQuestions: newResult.total_questions,
                        status: newResult.status,
                        activityLog: newResult.activity_log,
                        timestamp: new Date(newResult.updated_at).getTime(),
                        location: newResult.location
                    };

                    setLocalResults(prev => {
                        const idx = prev.findIndex(r => r.student.studentId === convertedResult.student.studentId);
                        if (idx >= 0) {
                            const updated = [...prev];
                            updated[idx] = convertedResult;
                            return updated;
                        } else {
                            return [...prev, convertedResult];
                        }
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [displayExam, selectedClass]);

    if (!displayExam) return null;

    const handleUnlockClick = async (studentId: string, examCode: string) => {
        processingIdsRef.current.add(studentId);
        try {
            await storageService.unlockStudentExam(examCode, studentId);
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
                                {!isReadOnly && displayExam.config.enablePublicStream && (
                                    <button 
                                        onClick={() => setIsShareModalOpen(true)}
                                        className="px-4 py-2.5 bg-indigo-50 text-indigo-600 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-indigo-100 transition-all flex items-center gap-2 shadow-sm border border-indigo-100"
                                    >
                                        <ShareIcon className="w-4 h-4"/> Akses Orang Tua
                                    </button>
                                )}
                                {!isReadOnly && (
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
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                Supabase Realtime Connected
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
                                        const answered = Object.keys(r.answers).length;
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
                                                    {getRelativeTime(r.timestamp)}
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
    exam: Exam | null;
    teacherProfile: TeacherProfile;
    onClose: () => void;
}

type TabView = 'ANALYSIS' | 'STUDENTS';

export const FinishedExamModal: React.FC<FinishedExamModalProps> = ({ exam, teacherProfile, onClose }) => {
    const [results, setResults] = useState<Result[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedClass, setSelectedClass] = useState<string>('ALL'); // Filter Kelas
    const [activeTab, setActiveTab] = useState<TabView>('ANALYSIS'); // Tabs
    const [inspectingResult, setInspectingResult] = useState<Result | null>(null); // Detail Siswa

    useEffect(() => {
        if (exam) {
            const fetchResults = async () => {
                setIsLoading(true);
                try {
                    const data = await storageService.getResults(exam.code, undefined, {
                        'x-role': teacherProfile.accountType,
                        'x-user-id': teacherProfile.id,
                        'x-school': teacherProfile.school
                    } as any);
                    setResults(data);
                } catch(e) {} finally { setIsLoading(false); }
            };
            fetchResults();
        }
    }, [exam, teacherProfile]);

    // Derived State berdasarkan Filter Kelas
    const filteredResults = useMemo(() => {
        if (selectedClass === 'ALL') return results;
        return results.filter(r => r.student.class === selectedClass);
    }, [results, selectedClass]);

    const analytics = useMemo(() => {
        if (!filteredResults.length || !exam) return null;
        const validResults = filteredResults.filter(r => r.status !== 'in_progress');
        if (validResults.length === 0) return null;

        const scores = validResults.map(r => r.score);
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        const max = Math.max(...scores);
        const min = Math.min(...scores);

        const questionStats = exam.questions
            .filter(q => q.questionType !== 'INFO' && q.questionType !== 'ESSAY')
            .map(q => {
                let correct = 0;
                let total = 0;
                validResults.forEach(r => {
                    if (r.answers[q.id]) {
                        total++;
                        if (String(r.answers[q.id]).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()) correct++;
                    }
                });
                return { id: q.id, correctRate: total > 0 ? Math.round((correct / total) * 100) : 0 };
            });

        return { avg, max, min, completedCount: validResults.length, questionStats };
    }, [filteredResults, exam]);

    if (!exam) return null;

    // View Detail Siswa (Overlay di atas Modal)
    if (inspectingResult) {
        return (
            <div className="fixed inset-0 bg-slate-900 z-[100] overflow-y-auto">
                 <div className="max-w-4xl mx-auto min-h-screen bg-white shadow-2xl relative">
                    <div className="sticky top-0 z-50 bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
                        <div>
                            <h3 className="font-bold text-lg">{inspectingResult.student.fullName}</h3>
                            <p className="text-xs text-slate-500">{inspectingResult.student.class} • Skor: {inspectingResult.score}</p>
                        </div>
                        <button onClick={() => setInspectingResult(null)} className="px-4 py-2 bg-slate-100 rounded-lg text-xs font-bold hover:bg-slate-200">Tutup Detail</button>
                    </div>
                    {/* Reuse StudentResultPage tapi dimodifikasi propnya jika perlu, 
                        di sini kita gunakan apa adanya karena cukup representatif */}
                    <div className="pointer-events-none select-none opacity-100 scale-90 origin-top">
                        <StudentResultPage result={inspectingResult} exam={exam} onFinish={() => {}} />
                    </div>
                 </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 z-50 animate-fade-in">
             <div className="bg-white sm:rounded-[2.5rem] shadow-2xl w-full max-w-6xl h-full sm:h-[90vh] flex flex-col overflow-hidden border border-white">
                
                <div className="p-8 border-b border-slate-100 flex flex-col gap-6 bg-white sticky top-0 z-10">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm">
                                <ChartBarIcon className="w-8 h-8"/>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Analisis Hasil Ujian</h2>
                                <p className="text-sm text-slate-400 font-medium mt-0.5">{exam.config.subject} • {exam.code}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                             <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kelas:</span>
                                <select 
                                    value={selectedClass} 
                                    onChange={(e) => setSelectedClass(e.target.value)} 
                                    className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer hover:text-indigo-600 transition-colors"
                                >
                                    <option value="ALL">SEMUA KELAS</option>
                                    {Array.from(new Set(results.map(r => r.student.class))).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <button onClick={onClose} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all"><XMarkIcon className="w-6 h-6"/></button>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex gap-1 border-b border-slate-100">
                        <button 
                            onClick={() => setActiveTab('ANALYSIS')} 
                            className={`px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'ANALYSIS' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            Analisis Soal
                        </button>
                        <button 
                            onClick={() => setActiveTab('STUDENTS')} 
                            className={`px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'STUDENTS' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            Daftar Siswa
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-8 bg-slate-50/30">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Menganalisis Data...</p>
                        </div>
                    ) : analytics ? (
                        activeTab === 'ANALYSIS' ? (
                            <div className="space-y-10 animate-fade-in">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                                    <StatWidget label="Rata-Rata" value={analytics.avg} color="bg-indigo-100" />
                                    <StatWidget label="Tertinggi" value={analytics.max} color="bg-emerald-100" />
                                    <StatWidget label="Terendah" value={analytics.min} color="bg-rose-100" />
                                    <StatWidget label="Partisipan" value={analytics.completedCount} color="bg-purple-100" icon={UserIcon} />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-black text-slate-800 tracking-tight">Analisis Butir Soal</h3>
                                        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            <div className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div>Mudah (&gt;80%)</div>
                                            <div className="flex items-center gap-2"><div className="w-2 h-2 bg-orange-500 rounded-full"></div>Sedang (50-80%)</div>
                                            <div className="flex items-center gap-2"><div className="w-2 h-2 bg-rose-500 rounded-full"></div>Sulit (&lt;50%)</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                        {analytics.questionStats.map((s, i) => {
                                            const q = exam.questions.find(qu => qu.id === s.id);
                                            if (!q) return null;
                                            return <QuestionAnalysisItem key={s.id} q={q} index={i} stats={s} examResults={filteredResults} />;
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/50">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Peringkat</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Siswa</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kelas</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Benar / Salah</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Nilai Akhir</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Detail</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredResults.sort((a,b) => b.score - a.score).map((r, idx) => (
                                            <tr key={r.student.studentId} className="hover:bg-indigo-50/30 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex w-8 h-8 items-center justify-center rounded-full font-bold text-xs ${idx < 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                                        {idx + 1}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800 text-sm">{r.student.fullName}</div>
                                                    <div className="text-[10px] text-slate-300 font-mono mt-0.5">#{r.student.studentId.split('-').pop()}</div>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-bold text-slate-500">{r.student.class}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-xs font-medium text-slate-600">
                                                        <span className="text-emerald-600 font-bold">{r.correctAnswers}</span> / <span className="text-rose-600 font-bold">{r.totalQuestions - r.correctAnswers}</span>
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`text-lg font-black ${r.score >= 75 ? 'text-emerald-600' : r.score >= 50 ? 'text-orange-500' : 'text-rose-600'}`}>
                                                        {r.score}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button 
                                                        onClick={() => setInspectingResult(r)}
                                                        className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase rounded-xl hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm flex items-center gap-2 ml-auto"
                                                    >
                                                        <EyeIcon className="w-3 h-3" /> Lihat Detail
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    ) : (
                        <div className="text-center py-20">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                <ChartBarIcon className="w-10 h-10 text-slate-200" />
                            </div>
                            <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Data Tidak Cukup</h3>
                            <p className="text-sm text-slate-300 mt-2">Belum ada siswa yang menyelesaikan ujian ini.</p>
                        </div>
                    )}
                </div>
             </div>
        </div>
    );
};
