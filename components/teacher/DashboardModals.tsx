import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Exam, Result, TeacherProfile, Question } from '../../types';
import { XMarkIcon, LockClosedIcon, CheckCircleIcon, ChartBarIcon, ChevronDownIcon, PlusCircleIcon, ShareIcon, ArrowPathIcon, QrCodeIcon, DocumentDuplicateIcon, UserIcon, TableCellsIcon, ListBulletIcon, ExclamationTriangleIcon, ClockIcon, SignalIcon, TrashIcon, PencilIcon, BookOpenIcon, SparklesIcon } from '../Icons';
import { storageService } from '../../services/storage';
import { supabase } from '../../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { RemainingTime, QuestionAnalysisItem, StatWidget } from './DashboardViews';
import { calculateAggregateStats, parseList, analyzeQuestionTypePerformance, normalize } from './examUtils';

// --- OngoingExamModal ---
interface OngoingExamModalProps { exam: Exam | null; teacherProfile?: TeacherProfile; onClose: () => void; isReadOnly?: boolean; isPremium?: boolean; }
export const OngoingExamModal: React.FC<OngoingExamModalProps> = (props) => { 
    const { exam, onClose, teacherProfile, isReadOnly, isPremium } = props;
    
    const [displayExam, setDisplayExam] = useState<Exam | null>(exam);
    const [selectedClass, setSelectedClass] = useState<string>('ALL'); 
    const [selectedSchool, setSelectedSchool] = useState<string>('ALL');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOCKED' | 'ONLINE' | 'COMPLETED'>('ALL');
    const [localResults, setLocalResults] = useState<Result[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isAddTimeOpen, setIsAddTimeOpen] = useState(false);
    const [addTimeValue, setAddTimeValue] = useState<number | ''>('');
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isJoinQrModalOpen, setIsJoinQrModalOpen] = useState(false);
    const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
    const [generatedTokenData, setGeneratedTokenData] = useState<{name: string, token: string} | null>(null);
    const [editingStudent, setEditingStudent] = useState<{ id: number, studentId: string, fullName: string, schoolName?: string, class: string, absentNumber: string } | null>(null);
    const [onlineStudents, setOnlineStudents] = useState<Record<string, boolean>>({});

    const processingIdsRef = useRef<Set<string>>(new Set());
    const broadcastProgressRef = useRef<Record<string, { answered: number, total: number, timestamp: number }>>({});
    const resultChannelRef = useRef<RealtimeChannel | null>(null);

    useEffect(() => { setDisplayExam(exam); }, [exam]);

    const fetchLatest = useCallback(async (silent = false) => {
        if (!displayExam?.code) return;
        if (!silent) setIsRefreshing(true);
        try {
            const data = await storageService.getResults(displayExam.code, selectedClass === 'ALL' ? '' : selectedClass, selectedSchool === 'ALL' ? '' : selectedSchool);
            setLocalResults(data);

            const { data: examData } = await supabase.from('exams').select('config').eq('code', displayExam.code).single();
            if (examData && examData.config) {
                setDisplayExam(prev => prev ? ({ ...prev, config: examData.config }) : null);
            }
        } catch (e) { console.error("Fetch failed", e); }
        finally { if (!silent) setIsRefreshing(false); }
    }, [displayExam?.code, selectedClass, selectedSchool]);

    useEffect(() => {
        fetchLatest();
        
        // Polling fallback every 15 seconds (Extreme Select / Lightweight)
        // Only fetches essential columns to save Egress bandwidth.
        const pollInterval = setInterval(async () => {
            if (!displayExam?.code) return;
            try {
                const { data, error } = await supabase
                    .from('results')
                    .select('id, status, score, correct_answers, updated_at')
                    .eq('exam_code', displayExam.code);
                
                if (error || !data) return;

                setLocalResults(prev => {
                    const idsToFetch: number[] = [];
                    const next = [...prev];
                    
                    data.forEach(serverRec => {
                        const idx = next.findIndex(r => r.id === serverRec.id);
                        if (idx >= 0) {
                            const localRec = next[idx];
                            // If status changed to completed/force_closed, we need full data (answers, etc)
                            if (localRec.status !== serverRec.status && (serverRec.status === 'completed' || serverRec.status === 'force_closed')) {
                                idsToFetch.push(serverRec.id);
                            }
                            
                            next[idx] = {
                                ...localRec,
                                status: serverRec.status as any,
                                score: serverRec.score || 0,
                                correctAnswers: serverRec.correct_answers || 0,
                                timestamp: new Date(serverRec.updated_at).getTime(),
                                // Preserve existing answers and completion time if they exist
                                answers: localRec.answers || {},
                                completionTime: localRec.completionTime
                            };
                        } else {
                            // New student joined, need full data
                            idsToFetch.push(serverRec.id);
                        }
                    });
                    
                    if (idsToFetch.length > 0) {
                        supabase.from('results')
                            .select('id, exam_code, student_id, student_name, class_name, status, score, correct_answers, total_questions, answers, updated_at, location')
                            .in('id', idsToFetch)
                            .then(({ data: specificData }) => {
                                if (specificData) {
                                    setLocalResults(current => {
                                        const updated = [...current];
                                        specificData.forEach(row => {
                                            const mapped = storageService.mapRowToResult(row);
                                            const i = updated.findIndex(r => r.id === mapped.id);
                                            if (i >= 0) updated[i] = mapped;
                                            else updated.push(mapped);
                                        });
                                        return updated;
                                    });
                                }
                            });
                    }
                    
                    return next;
                });
            } catch (e) {
                console.error("Lightweight polling error", e);
            }
        }, 15000);

        return () => clearInterval(pollInterval);
    }, [displayExam?.code, selectedClass, selectedSchool, teacherProfile, fetchLatest]);

    useEffect(() => {
        if (!displayExam?.code) return;
        
        const examCode = displayExam.code;
        
        // If not premium or if exam is in Normal Mode (disableRealtime = true), disable realtime and rely only on polling
        if (!isPremium || displayExam.config.disableRealtime) {
            console.log("Realtime disabled (freemium user or Normal Mode). Relying on polling.");
            return;
        }

        // The teacher MUST connect to Realtime to receive updates without polling (if Realtime is enabled).
        // We use a single channel for all monitoring needs to minimize connections.
        const monitorChannel = supabase.channel(`exam-room-${examCode}`)
            .on('presence', { event: 'sync' }, () => {
                const newState = monitorChannel.presenceState();
                const onlineMap: Record<string, boolean> = {};
                for (const key of Object.keys(newState)) {
                    onlineMap[key] = true;
                }
                setOnlineStudents(onlineMap);
            })
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'results'
            }, (payload) => { 
                // Filter manually in JS to avoid issues with REPLICA IDENTITY and server-side filters
                const newData = payload.new as { exam_code?: string; id?: number };
                const oldData = payload.old as { exam_code?: string; id?: number };
                
                const isRelevant = (newData && newData.exam_code === examCode) || 
                                  (oldData && oldData.exam_code === examCode);
                
                if (!isRelevant) return;

                console.log("Realtime result change (filtered):", payload.eventType, newData?.id || oldData?.id);
                if (payload.eventType === 'DELETE') {
                    setLocalResults(prev => prev.filter(r => r.id !== oldData?.id));
                } else if (newData?.id) {
                    supabase.from('results')
                        .select('id, exam_code, student_id, student_name, class_name, status, score, correct_answers, total_questions, answers, updated_at, location')
                        .eq('id', newData.id)
                        .single()
                        .then(({ data: specificData }) => {
                            if (specificData) {
                                setLocalResults(current => {
                                    const updated = [...current];
                                    const mapped = storageService.mapRowToResult(specificData);
                                    const i = updated.findIndex(r => r.id === mapped.id);
                                    if (i >= 0) updated[i] = mapped;
                                    else updated.push(mapped);
                                    return updated;
                                });
                            }
                        });
                }
            })
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'exams', 
                filter: `code=eq.${examCode}` 
            }, (payload) => {
                const newConfig = (payload.new as { config?: Record<string, unknown> }).config;
                if (newConfig) {
                    setDisplayExam(prev => prev ? ({ ...prev, config: newConfig as unknown as Exam['config'] }) : null);
                }
            })
            .on('broadcast', { event: 'student_progress' }, (payload) => { 
                const { studentId, answeredCount, totalQuestions, timestamp } = payload.payload; 
                broadcastProgressRef.current[studentId] = { answered: answeredCount, total: totalQuestions, timestamp }; 
                setLocalResults(prev => { 
                    const idx = prev.findIndex(r => r.student.studentId === studentId); 
                    if (idx >= 0 && prev[idx].status === 'in_progress') { 
                        const updated = [...prev]; 
                        updated[idx] = { ...updated[idx], answers: Object.fromEntries(Array(answeredCount).fill('placeholder').map((_, i) => [i.toString(), 'placeholder'])), timestamp: timestamp }; 
                        return updated; 
                    } 
                    return prev; 
                }); 
            })
            .on('broadcast', { event: 'student_submitted' }, (payload) => {
                console.log("Realtime broadcast: student_submitted");
                const studentId = payload.payload?.studentId;
                if (studentId) {
                    supabase.from('results')
                        .select('id, exam_code, student_id, student_name, class_name, status, score, correct_answers, total_questions, answers, updated_at, location')
                        .eq('exam_code', examCode)
                        .eq('student_id', studentId)
                        .order('updated_at', { ascending: false })
                        .limit(1)
                        .then(({ data: specificData }) => {
                            if (specificData && specificData.length > 0) {
                                setLocalResults(current => {
                                    const updated = [...current];
                                    const mapped = storageService.mapRowToResult(specificData[0]);
                                    const i = updated.findIndex(r => r.id === mapped.id);
                                    if (i >= 0) updated[i] = mapped;
                                    else updated.push(mapped);
                                    return updated;
                                });
                            }
                        });
                } else {
                    fetchLatest(true);
                }
            })
            .subscribe((status) => {
                console.log(`Realtime channel status for ${examCode}:`, status);
            });
        
        resultChannelRef.current = monitorChannel;

        return () => { 
            console.log(`Cleaning up realtime channel for ${examCode}`);
            supabase.removeChannel(monitorChannel);
        };
    }, [displayExam?.code, fetchLatest]);

    // Lógica pengurutan: Sekolah -> Kelas -> Absen (Kecil ke Besar)
    const sortedResults = useMemo(() => {
        let filtered = [...localResults];
        if (statusFilter === 'LOCKED') {
            filtered = filtered.filter(r => r.status === 'force_closed');
        } else if (statusFilter === 'ONLINE') {
            filtered = filtered.filter(r => r.status === 'in_progress');
        } else if (statusFilter === 'COMPLETED') {
            filtered = filtered.filter(r => r.status === 'completed');
        }

        return filtered.sort((a, b) => {
            // 1. Nama Sekolah
            const schoolA = a.student.schoolName || '';
            const schoolB = b.student.schoolName || '';
            const schoolCompare = schoolA.localeCompare(schoolB, undefined, { sensitivity: 'base' });
            if (schoolCompare !== 0) return schoolCompare;

            // 2. Kelas
            const classA = a.student.class || '';
            const classB = b.student.class || '';
            const classCompare = classA.localeCompare(classB, undefined, { numeric: true, sensitivity: 'base' });
            if (classCompare !== 0) return classCompare;

            // 3. Nomor Absen
            const absA = parseInt(a.student.absentNumber) || 0;
            const absB = parseInt(b.student.absentNumber) || 0;
            return absA - absB;
        });
    }, [localResults, statusFilter]);

    if (!displayExam) return null;

    const handleGenerateToken = async (studentId: string, studentName: string) => {
        if (processingIdsRef.current.has(studentId)) return;
        processingIdsRef.current.add(studentId);
        try {
            const token = await storageService.generateUnlockToken(displayExam.code, studentId);
            setGeneratedTokenData({ name: studentName, token });
        } catch {
            alert("Gagal membuat token akses.");
        } finally {
            setTimeout(() => processingIdsRef.current.delete(studentId), 1000);
        }
    };

    const handleUpdateStudentSubmit = async () => {
        if (!editingStudent) return;
        try {
            await storageService.updateStudentData(editingStudent.id, editingStudent.studentId, {
                fullName: editingStudent.fullName,
                schoolName: editingStudent.schoolName,
                class: editingStudent.class,
                absentNumber: editingStudent.absentNumber
            });
            fetchLatest(true);
            setEditingStudent(null);
            alert("Data siswa berhasil diperbarui.");
        } catch (e) {
            console.error(e);
            alert("Gagal memperbarui data siswa.");
        }
    };

    const handleDeleteStudent = async (studentId: string, studentName: string) => {
        if (!window.confirm(`Apakah Anda yakin ingin menghapus data siswa "${studentName}"? Data yang dihapus tidak dapat dikembalikan.`)) return;
        
        try {
            await storageService.deleteStudentResult(displayExam.code, studentId);
            fetchLatest(true);
            alert("Data siswa berhasil dihapus.");
        } catch (e) {
            console.error(e);
            alert("Gagal menghapus data siswa.");
        }
    };

    const handleFinishStudentExam = async (studentId: string, studentName: string) => {
        if (!window.confirm(`Apakah Anda yakin ingin menghentikan ujian untuk "${studentName}"? Siswa tidak akan bisa melanjutkan lagi.`)) return;
        try {
            await storageService.finishStudentExam(displayExam.code, studentId);
            fetchLatest(true);
            alert("Ujian siswa berhasil dihentikan.");
        } catch (e) {
            console.error(e);
            alert("Gagal menghentikan ujian.");
        }
    };

    const handleFinishAllExams = async () => {
        const activeCount = localResults.filter(r => r.status === 'in_progress' || r.status === 'force_closed').length;
        
        let confirmMsg = `Apakah Anda yakin ingin menghentikan ujian secara keseluruhan? SEMUA (${activeCount}) siswa akan dipaksa selesai dan ujian ini akan dipindahkan ke tab 'Ujian Selesai'.`;
        if (activeCount === 0) {
            confirmMsg = "Semua siswa telah selesai. Apakah Anda yakin ingin menutup ujian ini dan memindahkannya ke tab 'Ujian Selesai'?";
        } else {
            confirmMsg = `PERHATIAN: Masih ada ${activeCount} siswa yang sedang mengerjakan atau sesi terkunci. Menghentikan ujian akan memaksa pengumpulan jawaban mereka secara otomatis. Lanjutkan?`;
        }

        if (!window.confirm(confirmMsg)) return;
        
        try {
            setIsRefreshing(true);
            await storageService.stopExamOverall(displayExam.code);
            alert("Ujian berhasil dihentikan secara keseluruhan.");
            onClose(); // Close modal so user sees it moved to Finished tab
        } catch (e) {
            console.error(e);
            alert("Gagal menghentikan ujian.");
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleAddTimeSubmit = async () => { if (!addTimeValue || typeof addTimeValue !== 'number') return; try { await storageService.extendExamTime(displayExam.code, addTimeValue); fetchLatest(true); setIsAddTimeOpen(false); setAddTimeValue(''); } catch { alert("Gagal."); } };
    
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

    const lockedCount = localResults.filter(r => r.status === 'force_closed').length;
    const onlineCount = localResults.filter(r => r.status === 'in_progress').length;
    const completedCount = localResults.filter(r => r.status === 'completed').length;

    const calculateScore = (r: Result) => {
        if (!displayExam) return 0;
        let correctCount = 0;
        const scorableQuestions = displayExam.questions.filter(q => q.questionType !== 'INFO' && q.questionType !== 'ESSAY');
        
        scorableQuestions.forEach((q) => {
            const studentAnswer = r.answers[q.id];
            if (!studentAnswer) return;

            if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
                 if (q.correctAnswer && normalize(studentAnswer, q.questionType) === normalize(q.correctAnswer, q.questionType)) correctCount++;
            } 
            else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
                 const studentSet = new Set(parseList(studentAnswer as string).map(a => normalize(a, q.questionType)));
                 const correctSet = new Set(parseList(q.correctAnswer).map(a => normalize(a, q.questionType)));
                 if (studentSet.size === correctSet.size && [...studentSet].every(val => correctSet.has(val))) {
                     correctCount++;
                 }
            }
            else if (q.questionType === 'TRUE_FALSE') {
                try {
                    const ansObj = JSON.parse(studentAnswer);
                    const allCorrect = q.trueFalseRows?.every((row: { answer: boolean }, idx: number) => {
                        if (ansObj[idx] === undefined) return false;
                        return ansObj[idx] === row.answer;
                    });
                    if (allCorrect) correctCount++;
                } catch { /* ignore */ }
            }
            else if (q.questionType === 'MATCHING') {
                try {
                    const ansObj = JSON.parse(studentAnswer);
                    const allCorrect = q.matchingPairs?.every((pair: { right: string }, idx: number) => {
                        if (ansObj[idx] === undefined) return false;
                        return normalize(ansObj[idx], q.questionType) === normalize(pair.right, q.questionType);
                    });
                    if (allCorrect) correctCount++;
                } catch { /* ignore */ }
            }
        });

        return scorableQuestions.length > 0 ? Math.round((correctCount / scorableQuestions.length) * 100) : 0;
    };

    return createPortal(
        <>
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 z-50 animate-fade-in">
                <div className="bg-white dark:bg-slate-800 sm:rounded-[2rem] shadow-2xl w-full max-w-full h-full sm:h-[90vh] flex flex-col overflow-hidden relative border border-white dark:border-slate-700">
                    {/* Header Modal */}
                    <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 dark:border-slate-700 flex flex-col gap-3 bg-white dark:bg-slate-800 sticky top-0 z-20 shadow-sm">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                            <div className="flex items-center gap-3 w-full lg:w-auto">
                                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none shrink-0">
                                    <SignalIcon className="w-5 h-5"/>
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-white tracking-tight leading-tight flex items-center gap-2">Live Monitoring</h2>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[9px] sm:text-[10px] font-code slashed-zero font-black px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-600 tracking-widest uppercase">{displayExam.code}</span>
                                        <RemainingTime exam={displayExam} />
                                        {isRefreshing && <span className="text-[9px] sm:text-[10px] font-bold text-indigo-500 dark:text-indigo-400 animate-pulse">Sync...</span>}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full lg:w-auto justify-start lg:justify-end">
                                {/* Filter Locked */}
                                {displayExam.config.examMode !== 'PR' && (
                                    <button 
                                        onClick={() => setStatusFilter(statusFilter === 'LOCKED' ? 'ALL' : 'LOCKED')}
                                        className={`p-1.5 sm:px-3 sm:py-1.5 flex items-center gap-1.5 sm:gap-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all border shadow-sm ${statusFilter === 'LOCKED' ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                                        title="Siswa Terkunci"
                                    >
                                        <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold border ${statusFilter === 'LOCKED' ? 'bg-rose-200 dark:bg-rose-800 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-600' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'}`}>
                                            {lockedCount}
                                        </div>
                                        <span className="hidden sm:inline">Terkunci</span>
                                    </button>
                                )}
                                
                                {/* Filter Online */}
                                <button 
                                    onClick={() => setStatusFilter(statusFilter === 'ONLINE' ? 'ALL' : 'ONLINE')}
                                    className={`p-1.5 sm:px-3 sm:py-1.5 flex items-center gap-1.5 sm:gap-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all border shadow-sm ${statusFilter === 'ONLINE' ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                                    title="Siswa Online"
                                >
                                    <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold border ${statusFilter === 'ONLINE' ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-600' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'}`}>
                                        {onlineCount}
                                    </div>
                                    <span className="hidden sm:inline">Online</span>
                                </button>
                                
                                {/* Filter Finished */}
                                <button 
                                    onClick={() => setStatusFilter(statusFilter === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
                                    className={`p-1.5 sm:px-3 sm:py-1.5 flex items-center gap-1.5 sm:gap-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all border shadow-sm ${statusFilter === 'COMPLETED' ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-400 dark:border-slate-500' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                                    title="Siswa Selesai"
                                >
                                    <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold border ${statusFilter === 'COMPLETED' ? 'bg-slate-300 dark:bg-slate-600 text-slate-800 dark:text-slate-200 border-slate-400 dark:border-slate-500' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600'}`}>
                                        {completedCount}
                                    </div>
                                    <span className="hidden sm:inline">Selesai</span>
                                </button>

                                {/* Hentikan Ujian */}
                                {!isReadOnly && (
                                    <button 
                                        onClick={handleFinishAllExams} 
                                        className={`p-1.5 sm:px-3 sm:py-1.5 flex items-center gap-1.5 sm:gap-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all border shadow-sm active:scale-95 ${
                                            onlineCount + lockedCount > 0 
                                                ? "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/50"
                                                : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                                        }`}
                                        title={onlineCount + lockedCount > 0 ? "Hentikan Ujian" : "Selesaikan Ujian"}
                                    >
                                        {onlineCount + lockedCount > 0 ? (
                                            <>
                                                <XMarkIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Hentikan Ujian</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircleIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Selesaikan Ujian</span>
                                            </>
                                        )}
                                    </button>
                                )}

                                {/* Sertifikat */}
                                {displayExam.config.certificateSettings?.enabled && (
                                    <button 
                                        onClick={async () => {
                                            if (!isPremium) {
                                                alert("Mencetak sertifikat adalah fitur Premium. Hubungi Super Admin untuk meningkatkan akun Anda.");
                                                return;
                                            }
                                            const completedStudents = localResults.filter(r => r.status === 'completed' || r.status === 'force_closed');
                                            if (completedStudents.length === 0) {
                                                alert("Belum ada siswa yang selesai.");
                                                return;
                                            }
                                            
                                            // Provide an indication this might take a bit
                                            alert(`Mempersiapkan ${completedStudents.length} sertifikat. Harap tunggu...`);

                                            try {
                                                const { jsPDF } = await import('jspdf');
                                                const pdf = new jsPDF({
                                                    orientation: 'landscape',
                                                    unit: 'mm',
                                                    format: 'a4'
                                                });

                                                const config = displayExam.config.certificateSettings!;
                                                const cw = 297, ch = 210; // A4 landscape dimensions in mm

                                                for (let i = 0; i < completedStudents.length; i++) {
                                                    const r = completedStudents[i];
                                                    if (i > 0) pdf.addPage();
                                                    
                                                    // Add Background if given
                                                    if (config.backgroundUrl) {
                                                        // if URL is base64
                                                        try {
                                                            pdf.addImage(config.backgroundUrl, 'JPEG', 0, 0, cw, ch);
                                                        } catch (e) {
                                                            console.error("Failed to load background image to pdf", e);
                                                        }
                                                    } else {
                                                        // Modern Certificate Default Template
                                                        
                                                        // Background
                                                        pdf.setFillColor(248, 250, 252); // slate-50
                                                        pdf.rect(0, 0, cw, ch, 'F');
                                                        
                                                        // Outer Border
                                                        pdf.setDrawColor(49, 46, 129); // indigo-900
                                                        pdf.setLineWidth(4);
                                                        pdf.rect(10, 10, cw - 20, ch - 20);

                                                        // Inner Border
                                                        pdf.setDrawColor(165, 180, 252); // indigo-300
                                                        pdf.setLineWidth(1);
                                                        pdf.rect(14, 14, cw - 28, ch - 28);

                                                        // Top Left Geometry
                                                        pdf.setFillColor(79, 70, 229); // indigo-600
                                                        pdf.triangle(10, 10, 90, 10, 10, 30, 'F');
                                                        
                                                        // Bottom Right Geometry
                                                        pdf.setFillColor(49, 46, 129); // indigo-900
                                                        pdf.triangle(cw - 10, ch - 10, cw - 120, ch - 10, cw - 10, ch - 35, 'F');
                                                        
                                                        // Header text
                                                        pdf.setTextColor(49, 46, 129); // indigo-900
                                                        pdf.setFont("helvetica", "bold");
                                                        pdf.setFontSize(16);
                                                        pdf.text("PLATFORM UJIAN CERDAS", cw / 2, 40, { align: 'center', charSpace: 2 });
                                                        
                                                        pdf.setTextColor(100, 116, 139); // slate-500
                                                        pdf.setFont("helvetica", "normal");
                                                        pdf.setFontSize(10);
                                                        pdf.text("LAPORAN HASIL EVALUASI PEMBELAJARAN", cw / 2, 47, { align: 'center', charSpace: 1 });
                                                        
                                                        // Line separator
                                                        pdf.setDrawColor(199, 210, 254); // indigo-200
                                                        pdf.setLineWidth(0.5);
                                                        pdf.line(cw * 0.25, 55, cw * 0.75, 55);

                                                        pdf.setTextColor(55, 48, 163); // indigo-800
                                                        pdf.setFontSize(32);
                                                        pdf.setFont("helvetica", "bold");
                                                        pdf.text("SERTIFIKAT HASIL UJIAN", cw / 2, 65, { align: 'center', charSpace: 1 });

                                                        pdf.setTextColor(71, 85, 105); // slate-600
                                                        pdf.setFont("helvetica", "normal");
                                                        pdf.setFontSize(12);
                                                        pdf.text("Dokumen ini mengkonfirmasi bahwa siswa berikut:", cw / 2, 88, { align: 'center' });
                                                        
                                                        pdf.text("telah menyelesaikan evaluasi dan mendapatkan nilai akhir:", cw / 2, 118, { align: 'center' });

                                                        // Motivation/Context Text
                                                        const docDate = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'});
                                                        const promoText = `"Telah menunjukkan dedikasi, ketekunan, dan semangat pantang menyerah\ndalam menyelesaikan evaluasi pada ${docDate}.\nSemoga pencapaian ini menjadi langkah awal menuju kesuksesan yang lebih gemilang di masa depan."`;
                                                        
                                                        pdf.setFont("times", "italic");
                                                        pdf.setFontSize(10);
                                                        pdf.text(promoText, cw / 2, 148, { align: 'center', lineHeightFactor: 1.5 });

                                                        // Signature Line (Centered)
                                                        pdf.setTextColor(51, 65, 85); // slate-700
                                                        pdf.setFont("helvetica", "normal");
                                                        pdf.setFontSize(11);
                                                        pdf.text("Instansi Penyelenggara", cw / 2 - 20, ch - 38, { align: 'center' });
                                                        
                                                        pdf.setDrawColor(203, 213, 225); // slate-300
                                                        pdf.setLineWidth(1);
                                                        pdf.line(cw / 2 - 50, ch - 24, cw / 2 + 10, ch - 24);
                                                        
                                                        pdf.setTextColor(30, 41, 59); // slate-800
                                                        pdf.setFont("helvetica", "bold");
                                                        pdf.setFontSize(10);
                                                        pdf.text("Administrator / Guru", cw / 2 - 20, ch - 18, { align: 'center' });
                                                        
                                                        pdf.setTextColor(100, 116, 139); // slate-500
                                                        pdf.setFont("helvetica", "normal");
                                                        pdf.setFontSize(8);
                                                        pdf.text("Platform Ujian Cerdas", cw / 2 - 20, ch - 13, { align: 'center' });

                                                        // Fake Barcode (Right Side)
                                                        const bcx = cw / 2 + 40;
                                                        pdf.setFillColor(255, 255, 255);
                                                        pdf.setDrawColor(203, 213, 225); // slate-300
                                                        pdf.setLineWidth(0.5);
                                                        pdf.roundedRect(bcx, ch - 48, 28, 28, 2, 2, 'FD');
                                                        
                                                        pdf.setFillColor(15, 23, 42); // slate-900
                                                        // draw a pseudo QR code pattern
                                                        pdf.rect(bcx + 4, ch - 48 + 4, 20, 20, 'F');
                                                        pdf.setFillColor(255, 255, 255);
                                                        pdf.rect(bcx + 6, ch - 48 + 6, 16, 16, 'F');
                                                        pdf.setFillColor(15, 23, 42);
                                                        pdf.rect(bcx + 9, ch - 48 + 9, 10, 10, 'F');
                                                        pdf.setFontSize(6);
                                                        pdf.setFont("courier", "normal");
                                                        pdf.setTextColor(148, 163, 184); // slate-400
                                                        pdf.text("VERIFY-0X98A", bcx + 14, ch - 48 + 27, { align: 'center' });
                                                    }

                                                    // student name
                                                    if (config.positions.studentName.visible) {
                                                        const p = config.positions.studentName;
                                                        pdf.setTextColor(p.color);
                                                        pdf.setFont("helvetica", "bold");
                                                        pdf.setFontSize(p.fontSize); 
                                                        pdf.text(r.student.fullName, (p.x / 100) * cw, (p.y / 100) * ch, { align: 'center' });
                                                    }

                                                    // score
                                                    if (config.positions.score.visible) {
                                                        const p = config.positions.score;
                                                        pdf.setTextColor(p.color);
                                                        pdf.setFont("helvetica", "bold");
                                                        pdf.setFontSize(p.fontSize); 
                                                        pdf.text(`${r.score}`, (p.x / 100) * cw, (p.y / 100) * ch, { align: 'center' });
                                                    }

                                                    // exam
                                                    if (config.positions.examName.visible) {
                                                        const p = config.positions.examName;
                                                        pdf.setTextColor(p.color);
                                                        pdf.setFont("helvetica", "bold");
                                                        pdf.setFontSize(p.fontSize); 
                                                        pdf.text(displayExam.config.subject || displayExam.code, (p.x / 100) * cw, (p.y / 100) * ch, { align: 'center' });
                                                    }
                                                }

                                                pdf.save(`Sertifikat_${displayExam.code}.pdf`);
                                            } catch (e) {
                                                console.error("Gagal mencetak PDF", e);
                                                alert("Terjadi kesalahan saat memproses PDF.");
                                            }
                                        }}
                                        className={`p-1.5 sm:px-3 sm:py-1.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 sm:gap-2 shadow-sm border ${isPremium ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 border-amber-100 dark:border-amber-800' : 'bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 text-gray-400 opacity-70 cursor-not-allowed'}`}
                                        title={isPremium ? "Unduh Sertifikat" : "Fitur Premium"}
                                        disabled={!isPremium}
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4"/> <span className="hidden sm:inline">Sertifikat</span> {!isPremium && <span className="hidden sm:inline bg-gradient-to-r from-amber-200 to-amber-400 text-amber-900 px-1 py-0.5 rounded-[4px] text-[8px] leading-none">PREMIUM</span>}
                                    </button>
                                )}

                                {/* Cara Pakai */}
                                <button onClick={() => setIsGuideModalOpen(true)} className="p-1.5 sm:px-3 sm:py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all flex items-center gap-1.5 sm:gap-2 shadow-sm border border-blue-100 dark:border-blue-800" title="Cara Pakai">
                                    <BookOpenIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4"/> <span className="hidden sm:inline">Cara Pakai</span>
                                </button>

                                {/* Akses Siswa */}
                                <button onClick={() => setIsJoinQrModalOpen(true)} className="p-1.5 sm:px-3 sm:py-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all flex items-center gap-1.5 sm:gap-2 shadow-sm border border-emerald-100 dark:border-emerald-800" title="Akses Siswa">
                                    <QrCodeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4"/> <span className="hidden sm:inline">Akses Siswa</span>
                                </button>

                                {/* Stream */}
                                {displayExam.config.enablePublicStream && !isLargeScale && (
                                    <button onClick={() => setIsShareModalOpen(true)} className="p-1.5 sm:px-3 sm:py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all flex items-center gap-1.5 sm:gap-2 shadow-sm border border-indigo-100 dark:border-indigo-800" title="Stream">
                                        <ShareIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4"/> <span className="hidden sm:inline">Stream</span>
                                    </button>
                                )}

                                {/* Tambah Waktu */}
                                {displayExam.config.examMode !== 'PR' && (
                                    <button onClick={() => setIsAddTimeOpen(!isAddTimeOpen)} className="p-1.5 sm:px-3 sm:py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all flex items-center gap-1.5 sm:gap-2 shadow-sm border border-indigo-100 dark:border-indigo-800" title="Tambah Waktu">
                                        <PlusCircleIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4"/> <span className="hidden sm:inline">Waktu</span>
                                    </button>
                                )}

                                {/* Tutup */}
                                <button onClick={onClose} className="p-1.5 sm:p-2 bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-300 rounded-xl hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30 dark:hover:text-rose-400 transition-all border border-transparent hover:border-rose-100 dark:hover:border-rose-800" title="Tutup">
                                    <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5"/>
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-50 dark:border-slate-700/50">
                            <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-600">
                                <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isLargeScale ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></div>
                                {isLargeScale ? 'Normal Mode' : 'Realtime Mode'}
                            </div>
                            <div className="flex items-center gap-2 sm:gap-4">
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                    <span className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hidden sm:inline">Sekolah:</span>
                                    <select value={selectedSchool} onChange={(e) => setSelectedSchool(e.target.value)} className="px-2 py-1 sm:px-3 sm:py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all cursor-pointer shadow-sm">
                                        <option value="ALL">SEMUA SEKOLAH</option>
                                        {Array.from(new Set(localResults.map(r => r.student.schoolName).filter(Boolean))).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                    <span className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hidden sm:inline">Kelas:</span>
                                    <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="px-2 py-1 sm:px-3 sm:py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all cursor-pointer shadow-sm">
                                        <option value="ALL">SEMUA KELAS</option>
                                        {Array.from(new Set(localResults.map(r => r.student.class))).map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-900/50 p-4 sm:p-6 relative">
                        {isAddTimeOpen && (
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
                                            {displayExam.config.showResultToStudent && (
                                                <th className="px-5 py-4 text-center w-24">
                                                    <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                                        <span className="hidden sm:inline">Nilai</span>
                                                    </div>
                                                </th>
                                            )}
                                            <th className="px-5 py-4 text-center w-32">
                                                <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                                    <ClockIcon className="w-3.5 h-3.5 sm:hidden" />
                                                    <span className="hidden sm:inline">Waktu</span>
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
                                            {displayExam.config.trackLocation && displayExam.config.examMode !== 'PR' && (
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
                                                                <div className="flex items-center gap-2">
                                                                    <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{r.student.fullName}</div>
                                                                    {r.status === 'in_progress' && !displayExam?.config.disableRealtime && (
                                                                        <div 
                                                                            className={`w-2 h-2 rounded-full ${onlineStudents[r.student.studentId] ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-slate-300 dark:bg-slate-600'}`} 
                                                                            title={onlineStudents[r.student.studentId] ? "Online" : "Offline / Terputus"}
                                                                        />
                                                                    )}
                                                                </div>
                                                                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-wide">#{r.student.absentNumber}</div>
                                                                {r.student.schoolName && (
                                                                    <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">{r.student.schoolName}</div>
                                                                )}
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
                                                    {displayExam.config.showResultToStudent && (
                                                        <td className="px-5 py-3 text-center">
                                                            <span className="text-xs font-black text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded border border-slate-200 dark:border-slate-600">
                                                                {(!isLargeScale || r.status === 'completed') ? calculateScore(r) : '-'}
                                                            </span>
                                                        </td>
                                                    )}
                                                    <td className="px-5 py-3 text-center">
                                                        <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-600">
                                                            {r.status === 'completed' && r.completionTime !== undefined && r.completionTime !== null 
                                                                ? `${Math.floor(r.completionTime / 60)}m ${r.completionTime % 60}s` 
                                                                : '-'}
                                                        </span>
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
                                                    {displayExam.config.trackLocation && displayExam.config.examMode !== 'PR' && (
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
                                                        <div className="flex justify-end gap-2">
                                                                <button 
                                                                    onClick={() => {
                                                                        const parts = r.student.studentId.split('-');
                                                                        // Format is typically "Class-Absent" (e.g., "6a-40") or "Name-Class-Absent-Timestamp"
                                                                        // We take the last part if it's numeric, otherwise fallback to the part before timestamp
                                                                        let derivedAbsent = r.student.absentNumber;
                                                                        
                                                                        if (parts.length >= 2) {
                                                                            const lastPart = parts[parts.length - 1];
                                                                            // Check if last part is numeric (simple check)
                                                                            if (!isNaN(parseInt(lastPart))) {
                                                                                derivedAbsent = lastPart;
                                                                            } else if (parts.length > 2) {
                                                                                // Fallback for timestamped IDs: take 2nd to last
                                                                                derivedAbsent = parts[parts.length - 2];
                                                                            }
                                                                        }

                                                                        setEditingStudent({ 
                                                                            id: r.id!, // Pass the primary key ID
                                                                            studentId: r.student.studentId, // Keep original studentId for reference if needed
                                                                            fullName: r.student.fullName, 
                                                                            schoolName: r.student.schoolName || '',
                                                                            class: r.student.class, 
                                                                            absentNumber: derivedAbsent 
                                                                        });
                                                                    }}
                                                                    className="p-1.5 bg-white dark:bg-slate-700 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors border border-slate-200 dark:border-slate-600 shadow-sm"
                                                                    title="Edit Data Siswa"
                                                                >
                                                                    <PencilIcon className="w-4 h-4" />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteStudent(r.student.studentId, r.student.fullName)}
                                                                    className="p-1.5 bg-white dark:bg-slate-700 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors border border-slate-200 dark:border-slate-600 shadow-sm"
                                                                    title="Hapus Data Siswa"
                                                                >
                                                                    <TrashIcon className="w-4 h-4" />
                                                                </button>
                                                                {(r.status === 'in_progress' || r.status === 'force_closed') && displayExam.config.examMode !== 'PR' && (
                                                                    <div className="flex gap-2">
                                                                        {(r.status === 'force_closed' || displayExam.config.continueWithPermission) && (
                                                                            <button 
                                                                                onClick={() => handleGenerateToken(r.student.studentId, r.student.fullName)} 
                                                                                className="px-3 py-1.5 bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all border border-indigo-200 dark:border-indigo-800 shadow-sm active:scale-95 whitespace-nowrap"
                                                                            >
                                                                                Buat Token
                                                                            </button>
                                                                        )}
                                                                        <button 
                                                                            onClick={() => handleFinishStudentExam(r.student.studentId, r.student.fullName)} 
                                                                            className="px-3 py-1.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all border border-rose-200 dark:border-rose-800 shadow-sm active:scale-95 whitespace-nowrap"
                                                                        >
                                                                            Hentikan
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                </tr>
                                            ); 
                                        }) : (
                                            <tr>
                                                <td colSpan={4 + (!isLargeScale ? 2 : 0) + ((displayExam.config.trackLocation && displayExam.config.examMode !== 'PR') ? 1 : 0)} className="px-6 py-20 text-center">
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
            
            {/* Edit Student Modal */}
            {editingStudent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 max-w-sm w-full border border-white dark:border-slate-700 relative animate-slide-in-up">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Edit Data Siswa</h3>
                            <button onClick={() => setEditingStudent(null)} className="p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full transition-colors"><XMarkIcon className="w-5 h-5"/></button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nama Lengkap</label>
                                <input 
                                    type="text" 
                                    value={editingStudent.fullName} 
                                    onChange={e => setEditingStudent({...editingStudent, fullName: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nama Sekolah</label>
                                <input 
                                    type="text" 
                                    value={editingStudent.schoolName || ''} 
                                    onChange={e => setEditingStudent({...editingStudent, schoolName: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-bold"
                                    placeholder="Opsional"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Kelas</label>
                                    <input 
                                        type="text" 
                                        value={editingStudent.class} 
                                        onChange={e => setEditingStudent({...editingStudent, class: e.target.value})}
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">No. Absen</label>
                                    <input 
                                        type="text" 
                                        value={editingStudent.absentNumber} 
                                        onChange={e => setEditingStudent({...editingStudent, absentNumber: e.target.value})}
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-bold"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button onClick={() => setEditingStudent(null)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors">Batal</button>
                            <button onClick={handleUpdateStudentSubmit} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30">Simpan</button>
                        </div>
                    </div>
                </div>
            )}

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
                            <span className="text-4xl font-code slashed-zero font-black tracking-[0.25em] text-slate-800 dark:text-white">{generatedTokenData.token}</span>
                        </div>
                        
                        <button onClick={() => setGeneratedTokenData(null)} className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-black dark:hover:bg-indigo-700 transition-all shadow-lg active:scale-[0.98] text-sm uppercase tracking-wider">Tutup</button>
                    </div>
                </div>
            )}

            {isShareModalOpen && (<div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in"><div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-8 text-center animate-slide-in-up border border-white dark:border-slate-700"><div className="flex justify-between items-center mb-6"><h3 className="font-bold text-lg text-slate-800 dark:text-white tracking-tight">Akses Pantauan</h3><button onClick={() => setIsShareModalOpen(false)} className="p-2 bg-slate-50 dark:bg-slate-700 text-slate-400 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"><XMarkIcon className="w-5 h-5" /></button></div><div className="bg-white p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-lg mb-6 inline-block mx-auto relative group"><div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-3xl opacity-20 blur group-hover:opacity-30 transition-opacity"></div><img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(liveUrl)}&margin=10`} alt="QR Code Live" className="w-48 h-48 object-contain relative bg-white rounded-xl"/></div><p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-6 leading-relaxed px-2">Minta orang tua siswa untuk memindai QR Code di atas atau bagikan link di bawah ini.</p><div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-700"><div className="flex-1 px-3 py-1 overflow-hidden"><p className="text-xs font-code slashed-zero text-slate-600 dark:text-slate-300 truncate text-left">{liveUrl}</p></div><button onClick={() => { navigator.clipboard.writeText(liveUrl); alert("Link berhasil disalin!"); }} className="p-2 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors" title="Salin Link"><DocumentDuplicateIcon className="w-4 h-4" /></button></div></div></div>)}
            
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
                        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 mb-4">
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Kode Ujian</p>
                            <p className="text-xl font-code slashed-zero font-black text-slate-800 dark:text-white tracking-widest">{displayExam.code}</p>
                        </div>

                        <button 
                            onClick={() => {
                                const url = `${window.location.origin}/?join=${displayExam.code}`;
                                navigator.clipboard.writeText(url);
                                alert("Link ujian berhasil disalin!");
                            }}
                            className="w-full py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all flex items-center justify-center gap-2 text-sm border border-indigo-100 dark:border-indigo-800"
                        >
                            <DocumentDuplicateIcon className="w-4 h-4" />
                            Salin Link Ujian
                        </button>
                    </div>
                </div>
            )}
            {/* MODAL PANDUAN LIVE MONITORING */}
            {isGuideModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-in-up border border-white dark:border-slate-700 relative">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-blue-50 dark:bg-slate-900 sticky top-0 z-10">
                            <h3 className="font-bold text-lg text-blue-900 dark:text-blue-300 flex items-center gap-2">
                                <BookOpenIcon className="w-5 h-5"/> Panduan Live Monitoring
                            </h3>
                            <button onClick={() => setIsGuideModalOpen(false)} className="p-2 bg-white dark:bg-slate-800 rounded-full text-slate-400 hover:text-rose-500 transition-colors shadow-sm">
                                <XMarkIcon className="w-5 h-5"/>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-8 text-slate-700 dark:text-slate-300 text-sm">
                            {/* Step 1 */}
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">1</div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-base">Akses Siswa</h4>
                                    <p className="mb-3">Untuk memulai ujian, siswa harus masuk menggunakan <strong>Kode Ujian</strong> atau memindai <strong>QR Code</strong>. Klik tombol <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded font-bold text-xs"><QrCodeIcon className="w-3 h-3"/> Akses Siswa</span> di pojok kanan atas untuk menampilkan QR Code dan Kode Ujian di layar proyektor kelas.</p>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">2</div>
                                <div className="w-full">
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-base">Memantau Status Siswa</h4>
                                    <p className="mb-3">Di layar utama Live Monitoring, Anda akan melihat daftar siswa yang sedang mengerjakan ujian. Status siswa ditandai dengan label berikut:</p>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 mb-4">
                                        <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                            <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-md text-[10px] font-black uppercase flex items-center gap-1.5 border border-emerald-100 dark:border-emerald-900 shadow-sm">
                                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Online
                                            </span>
                                            <div>
                                                <p className="text-[10px] text-slate-500">Siswa sedang mengerjakan.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                            <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-md text-[10px] font-black uppercase flex items-center gap-1.5 border border-rose-100 dark:border-rose-900">
                                                <LockClosedIcon className="w-3 h-3"/> Locked
                                            </span>
                                            <div>
                                                <p className="text-[10px] text-slate-500">Ujian terblokir otomatis.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-md text-[10px] font-black uppercase flex items-center gap-1.5 border border-slate-200 dark:border-slate-600">
                                                <CheckCircleIcon className="w-3 h-3"/> Selesai
                                            </span>
                                            <div>
                                                <p className="text-[10px] text-slate-500">Ujian telah dikumpulkan.</p>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">Pada mode <strong>Realtime</strong>, Anda juga dapat melihat <strong>Progres</strong> (jumlah soal yang dijawab) dan waktu terakhir <strong>Aktif</strong>.</p>
                                </div>
                            </div>

                            {/* Step 3 */}
                            {displayExam.config.examMode !== 'PR' && (
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">3</div>
                                    <div className="w-full">
                                        <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-base">Tindakan Khusus (Membuka Blokir)</h4>
                                        <p className="mb-3">Jika siswa dihentikan paksa oleh pengawas atau terdeteksi melakukan kecurangan (jika fitur <strong>Kunci Akses</strong> aktif), sistem akan memblokir ujian mereka dan statusnya menjadi <strong>Locked</strong>.</p>
                                        
                                        <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-4 flex flex-col sm:flex-row items-center gap-4 justify-center">
                                            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                                                <div>
                                                    <p className="font-bold text-sm text-slate-800 dark:text-white">Andi Wijaya</p>
                                                    <span className="px-2 py-0.5 mt-1 inline-block bg-rose-50 text-rose-600 rounded text-[9px] font-black uppercase border border-rose-100">Locked</span>
                                                </div>
                                                <button className="px-3 py-1.5 bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase rounded-lg border border-indigo-200 dark:border-indigo-800 shadow-sm">
                                                    Buat Token
                                                </button>
                                            </div>
                                            <div className="hidden sm:block text-slate-400">
                                                <ArrowPathIcon className="w-5 h-5 animate-spin-slow" />
                                            </div>
                                            <div className="bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 shadow-inner text-center">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Token Akses</p>
                                                <span className="text-xl font-code slashed-zero font-black tracking-widest text-slate-800 dark:text-white">A1B2C</span>
                                            </div>
                                        </div>

                                        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl p-4 mb-3">
                                            <p className="text-xs text-indigo-800 dark:text-indigo-300 font-medium">Untuk membuka blokir, klik tombol <strong>Buat Token</strong> di kolom Aksi pada baris siswa tersebut. Berikan token yang muncul kepada siswa agar mereka dapat melanjutkan ujian.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 4 */}
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">{displayExam.config.examMode === 'PR' ? '3' : '4'}</div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-base">Membagikan Link Pantauan (Opsional)</h4>
                                    <p className="mb-3">Jika Anda ingin orang tua atau pengawas lain ikut memantau jalannya ujian secara *real-time* (tanpa bisa mengubah pengaturan), klik tombol <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded font-bold text-xs"><ShareIcon className="w-3 h-3"/> Stream</span>. Bagikan link atau QR Code yang muncul kepada mereka.</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-center">
                            <button onClick={() => setIsGuideModalOpen(false)} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-200 dark:shadow-none">
                                Mengerti
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>,
        document.body
    );
};

// --- FinishedExamModal ---
interface FinishedExamModalProps {
    exam: Exam;
    teacherProfile: TeacherProfile;
    onClose: () => void;
}

export const FinishedExamModal: React.FC<FinishedExamModalProps> = ({ exam, teacherProfile, onClose }) => {
    const [displayExam, setDisplayExam] = useState<Exam>(exam);
    const [results, setResults] = useState<Result[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'ANALYSIS' | 'STUDENTS'>('ANALYSIS');
    const [selectedClass, setSelectedClass] = useState<string>('ALL');
    const [expandedStudent, setExpandedStudent] = useState<string | null>(null);


    const ungradedCount = useMemo(() => {
        const essayQuestions = displayExam.questions.filter(q => q.questionType === 'ESSAY' || q.questionType === 'FILL_IN_THE_BLANK');
        if (essayQuestions.length === 0) return 0;
        return results.filter(r => essayQuestions.some(q => !r.answers[`_grade_${q.id}`])).length;
    }, [results, displayExam.questions]);

    useEffect(() => {
        setDisplayExam(exam);
    }, [exam]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await storageService.getResults(displayExam.code, undefined);
            
            // SORTING LOGIC: Sort by School, then Class, then by Absent Number (from ID)
            const sortedData = data.sort((a, b) => {
                // 1. Nama Sekolah
                const schoolA = a.student.schoolName || '';
                const schoolB = b.student.schoolName || '';
                const schoolCompare = schoolA.localeCompare(schoolB, undefined, { sensitivity: 'base' });
                if (schoolCompare !== 0) return schoolCompare;

                // 2. Kelas
                const classA = a.student.class || '';
                const classB = b.student.class || '';
                // Compare class alphanumerically (e.g. 1A, 1B, 2, 10)
                const c = classA.localeCompare(classB, undefined, { numeric: true, sensitivity: 'base' });
                if (c !== 0) return c;

                // 3. Nomor Absen
                const absA = parseInt(a.student.absentNumber) || 0;
                const absB = parseInt(b.student.absentNumber) || 0;
                return absA - absB;
            });

            setResults(sortedData);
        } catch (error) {
            console.error("Failed to fetch results", error);
        } finally {
            setIsLoading(false);
        }
    }, [displayExam.code]);

    useEffect(() => {
        fetchData();
        setSelectedClass('ALL');
    }, [fetchData, teacherProfile]);

    const handleUpdateKey = async (qId: string, newKey: string) => {
        if (!confirm('Apakah Anda yakin ingin mengubah kunci jawaban? Nilai semua siswa akan dihitung ulang.')) return;
        try {
            await storageService.updateExamAnswerKey(displayExam.code, qId, newKey);
            
            // Update local state for questions
            setDisplayExam(prev => ({
                ...prev,
                questions: prev.questions.map(q => {
                    if (q.id === qId) {
                        if (q.questionType === 'TRUE_FALSE') {
                            try { return { ...q, trueFalseRows: JSON.parse(newKey) }; } catch { return q; }
                        } else if (q.questionType === 'MATCHING') {
                            try { return { ...q, matchingPairs: JSON.parse(newKey) }; } catch { return q; }
                        } else {
                            return { ...q, correctAnswer: newKey };
                        }
                    }
                    return q;
                })
            }));

            // Refresh results to get new scores
            await fetchData();
            
            alert('Kunci jawaban berhasil diperbarui.');
        } catch (e) {
            console.error(e);
            alert('Gagal memperbarui kunci jawaban: ' + (e as Error).message);
        }
    };

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



    const normalize = useCallback((str: string, qType: string) => {
        const s = String(str || '');
        if (qType === 'FILL_IN_THE_BLANK') {
            return s.replace(/<[^>]*>?/gm, '').trim().toLowerCase().replace(/\s+/g, ' ');
        }
        try {
            const div = document.createElement('div');
            div.innerHTML = s;
            
            // Remove math-visual wrappers to compare actual content
            // Better: replace with LaTeX content to be more robust
            div.querySelectorAll('.math-visual').forEach(el => {
                const latex = el.getAttribute('data-latex');
                if (latex) {
                    el.replaceWith(document.createTextNode(`$${latex}$`));
                } else {
                    while (el.firstChild) {
                        el.parentNode?.insertBefore(el.firstChild, el);
                    }
                    el.parentNode?.removeChild(el);
                }
            });

            // Standardize HTML by removing whitespace between tags and trimming
            return div.innerHTML.replace(/>\s+</g, '><').trim().replace(/\s+/g, ' ');
        } catch {
            return s.trim().replace(/\s+/g, ' ');
        }
    }, []);

    // Enhanced checkAnswerStatus supporting Manual Grading Override
    const checkAnswerStatus = useCallback((q: Question, studentAnswers: Record<string, string>) => {
        // 1. Check for manual grade override first
        const manualGradeKey = `_grade_${q.id}`;
        if (studentAnswers[manualGradeKey]) {
            return studentAnswers[manualGradeKey]; // 'CORRECT' or 'WRONG'
        }

        const ans = studentAnswers[q.id];
        if (!ans) return 'EMPTY';

        const studentAns = normalize(String(ans), q.questionType);
        const correctAns = normalize(String(q.correctAnswer || ''), q.questionType);

        if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
            return studentAns === correctAns ? 'CORRECT' : 'WRONG';
        } 
        else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
            const sSet = new Set(parseList(String(ans)).map(a => normalize(a, q.questionType)));
            const cSet = new Set(parseList(String(q.correctAnswer || '')).map(a => normalize(a, q.questionType)));
            if (sSet.size === cSet.size && [...sSet].every(x => cSet.has(x))) return 'CORRECT';
            return 'WRONG';
        }
        else if (q.questionType === 'TRUE_FALSE') {
             try {
                const ansObj = JSON.parse(ans);
                const allCorrect = q.trueFalseRows?.every((row, idx) => ansObj[idx] === row.answer);
                return allCorrect ? 'CORRECT' : 'WRONG';
            } catch { return 'WRONG'; }
        }
        else if (q.questionType === 'MATCHING') {
            try {
                const ansObj = JSON.parse(ans);
                const allCorrect = q.matchingPairs?.every((pair, idx) => ansObj[idx] === pair.right);
                return allCorrect ? 'CORRECT' : 'WRONG';
            } catch { return 'WRONG'; }
        }

        // For Essay, if no manual grade, default to wrong (needs grading) or just unverified.
        // We return 'WRONG' to indicate it doesn't add points yet.
        return 'WRONG'; 
    }, [normalize]);

    const getCalculatedStats = (r: Result) => {
        let correct = 0;
        let empty = 0;
        let totalScore = 0;
        let maxPossibleScore = 0;
        const scorableQuestions = displayExam.questions.filter(q => q.questionType !== 'INFO');
        
        scorableQuestions.forEach(q => {
            const weight = q.scoreWeight || 1;
            maxPossibleScore += weight;

            const status = checkAnswerStatus(q, r.answers);
            if (status === 'CORRECT') {
                correct++;
                totalScore += weight;
            }
            else if (status === 'EMPTY') {
                empty++;
            }
        });

        const total = scorableQuestions.length;
        const wrong = total - correct - empty;
        const score = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
        const duration = r.completionTime || 0;
        
        return { correct, wrong, empty, score, duration };
    };

    // Calculate Global Stats
    const totalStudents = results.length;
    const calculatedResults = results.map(r => getCalculatedStats(r).score);
    const averageScore = totalStudents > 0 ? Math.round(calculatedResults.reduce((acc, s) => acc + s, 0) / totalStudents) : 0;
    const highestScore = totalStudents > 0 ? Math.max(...calculatedResults) : 0;
    const lowestScore = totalStudents > 0 ? Math.min(...calculatedResults) : 0;
    const validCompletionTimes = results.filter(r => r.completionTime !== undefined && r.completionTime !== null).map(r => r.completionTime as number);
    const averageCompletionTime = validCompletionTimes.length > 0 ? Math.round(validCompletionTimes.reduce((acc, val) => acc + val, 0) / validCompletionTimes.length) : 0;
    const formatDuration = (seconds: number | undefined | null) => {
        if (seconds === undefined || seconds === null) return '-';
        const s = Math.round(seconds);
        return `${Math.floor(s / 60)}m ${s % 60}s`;
    };

    const uniqueClasses = useMemo(() => {
        const classes = new Set(results.map(r => r.student.class));
        return Array.from(classes).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    }, [results]);

    const filteredResults = useMemo(() => {
        if (selectedClass === 'ALL') return results;
        return results.filter(r => r.student.class === selectedClass);
    }, [results, selectedClass]);

    // --- NEW: CATEGORY & LEVEL ANALYSIS ---
    const { categoryStats, levelStats } = useMemo(() => calculateAggregateStats(displayExam, results), [displayExam, results]);
    const questionTypeStats = useMemo(() => analyzeQuestionTypePerformance(displayExam, results), [displayExam, results]);

    const questionStats = useMemo(() => {
        return displayExam.questions.filter(q => q.questionType !== 'INFO').map(q => {
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
    }, [results, displayExam.questions, totalStudents, checkAnswerStatus]);

    const toggleStudent = (id: string) => {
        if (expandedStudent === id) setExpandedStudent(null);
        else setExpandedStudent(id);
    };

    // MANUAL GRADING LOGIC
    const rateQuestion = async (studentResult: Result, qId: string, isCorrect: boolean) => {
        const newAnswers = { ...studentResult.answers, [`_grade_${qId}`]: isCorrect ? 'CORRECT' : 'WRONG' };
        
        // Recalculate Score locally
        let correct = 0;
        let totalScore = 0;
        let maxPossibleScore = 0;
        const scorableQuestions = displayExam.questions.filter(q => q.questionType !== 'INFO');
        scorableQuestions.forEach(q => {
            const weight = q.scoreWeight || 1;
            maxPossibleScore += weight;

            // Using newAnswers which contains the override
            const status = checkAnswerStatus(q, newAnswers);
            if (status === 'CORRECT') {
                correct++;
                totalScore += weight;
            }
        });
        const newScore = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;

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
            }).eq('exam_code', displayExam.code).eq('student_id', studentResult.student.studentId);
        } catch (e) {
            console.error("Grading failed", e);
            alert("Gagal menyimpan nilai.");
            fetchData(); // Revert
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-full h-[85vh] flex flex-col overflow-hidden border border-white dark:border-slate-700 relative">
                 <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-800 sticky top-0 z-10 gap-4">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Analisis Hasil Ujian</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{displayExam.config.subject} • <span className="font-code slashed-zero">{displayExam.code}</span>{displayExam.authorSchool ? ` • ${displayExam.authorSchool}` : ''}</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="bg-slate-100 dark:bg-slate-700 p-1 rounded-xl flex">
                            <button onClick={() => setActiveTab('ANALYSIS')} className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'ANALYSIS' ? 'bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                                <ChartBarIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">Analisis Soal</span>
                            </button>
                            <button onClick={() => setActiveTab('STUDENTS')} className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'STUDENTS' ? 'bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                                <ListBulletIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">Rekap Siswa</span>
                            </button>
                        </div>
                        <button onClick={onClose} className="p-2.5 bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-300 rounded-xl hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30 dark:hover:text-rose-400 transition-all">
                            <XMarkIcon className="w-6 h-6"/>
                        </button>
                    </div>
                </div>

                {ungradedCount > 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/30 px-6 py-3 border-b border-yellow-100 dark:border-yellow-800 flex items-center gap-4 animate-slide-in-up">
                        <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
                        <p className="text-xs font-bold text-yellow-800 dark:text-yellow-200">
                            Peringatan: Terdapat {ungradedCount} siswa dengan jawaban Esai / Isian Singkat yang belum dinilai manual. Mohon periksa dan beri nilai sebelum finalisasi.
                        </p>
                    </div>
                )}



                <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-900/50">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500 font-bold">Memuat data...</div>
                    ) : (
                        activeTab === 'ANALYSIS' ? (
                            <div className="space-y-8">
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    <StatWidget label="Rata-rata" value={averageScore} color="bg-indigo-50" icon={ChartBarIcon} />
                                    <StatWidget label="Tertinggi" value={highestScore} color="bg-emerald-50" icon={CheckCircleIcon} />
                                    <StatWidget label="Terendah" value={lowestScore} color="bg-rose-50" icon={XMarkIcon} />
                                    <StatWidget label="Partisipan" value={totalStudents} color="bg-blue-50" icon={UserIcon} />
                                    <StatWidget label="Rata-rata Waktu" value={formatDuration(averageCompletionTime)} color="bg-purple-50" icon={ClockIcon} />
                                </div>

                                {/* NEW: Category & Level Statistics */}
                                {(categoryStats.length > 0 || levelStats.length > 0 || questionTypeStats.length > 0) && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                            <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <ListBulletIcon className="w-4 h-4"/> Penguasaan Materi (Kategori)
                                            </h3>
                                            <div className="space-y-3">
                                                {categoryStats.length > 0 ? categoryStats.map(stat => (
                                                    <div key={stat.name}>
                                                        <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                                                            <span>{stat.name}</span>
                                                            <span className={stat.percentage < 50 ? 'text-rose-500' : stat.percentage < 80 ? 'text-amber-500' : 'text-emerald-600'}>{stat.percentage}%</span>
                                                        </div>
                                                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                            <div className={`h-full transition-all duration-1000 ${stat.percentage >= 80 ? 'bg-emerald-500' : stat.percentage >= 50 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{width: `${stat.percentage}%`}}></div>
                                                        </div>
                                                    </div>
                                                )) : <p className="text-xs text-slate-400 italic">Tidak ada data.</p>}
                                            </div>
                                        </div>

                                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                            <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <ChartBarIcon className="w-4 h-4"/> Tingkat Kesulitan (Level)
                                            </h3>
                                            <div className="space-y-3">
                                                {levelStats.length > 0 ? levelStats.map(stat => (
                                                    <div key={stat.name}>
                                                        <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                                                            <span>{stat.name}</span>
                                                            <span className={stat.percentage < 50 ? 'text-rose-500' : stat.percentage < 80 ? 'text-amber-500' : 'text-emerald-600'}>{stat.percentage}%</span>
                                                        </div>
                                                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                            <div className={`h-full transition-all duration-1000 ${stat.percentage >= 80 ? 'bg-emerald-500' : stat.percentage >= 50 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{width: `${stat.percentage}%`}}></div>
                                                        </div>
                                                    </div>
                                                )) : <p className="text-xs text-slate-400 italic">Tidak ada data.</p>}
                                            </div>
                                        </div>

                                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                            <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <TableCellsIcon className="w-4 h-4"/> Jenis Soal
                                            </h3>
                                            <div className="space-y-3">
                                                {questionTypeStats.length > 0 ? questionTypeStats.map(stat => (
                                                    <div key={stat.type}>
                                                        <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                                                            <span>{stat.typeName}</span>
                                                            <span className={stat.percentage < 50 ? 'text-rose-500' : stat.percentage < 80 ? 'text-amber-500' : 'text-emerald-600'}>{stat.percentage}%</span>
                                                        </div>
                                                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                            <div className={`h-full transition-all duration-1000 ${stat.percentage >= 80 ? 'bg-emerald-500' : stat.percentage >= 50 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{width: `${stat.percentage}%`}}></div>
                                                        </div>
                                                    </div>
                                                )) : <p className="text-xs text-slate-400 italic">Tidak ada data.</p>}
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
                                        {displayExam.questions.filter(q => q.questionType !== 'INFO').map((q, idx) => {
                                            const stats = questionStats.find(s => s.id === q.id) || { correctRate: 0 };
                                            return (
                                                <QuestionAnalysisItem 
                                                    key={q.id} 
                                                    q={q} 
                                                    index={idx} 
                                                    stats={stats} 
                                                    examResults={results}
                                                    onUpdateKey={handleUpdateKey}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
                                {uniqueClasses.length > 1 && (
                                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 dark:bg-slate-700/30">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-500 uppercase">Filter Kelas:</span>
                                            <select 
                                                value={selectedClass} 
                                                onChange={(e) => setSelectedClass(e.target.value)}
                                                className="text-xs font-bold p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                            >
                                                <option value="ALL">Semua Kelas ({results.length})</option>
                                                {uniqueClasses.map(c => (
                                                    <option key={c} value={c}>{c} ({results.filter(r => r.student.class === c).length})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="text-xs font-bold text-slate-400">
                                            Menampilkan {filteredResults.length} Siswa
                                        </div>
                                    </div>
                                )}
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full min-w-[800px] text-left">
                                        <thead className="bg-slate-50/50 dark:bg-slate-700/50">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Siswa</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Kelas</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Nilai</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">B/S/K</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Waktu</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Aktivitas</th>
                                            {displayExam.config.trackLocation && displayExam.config.examMode !== 'PR' && (
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Lokasi</th>
                                            )}
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                        {filteredResults.map(r => {
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
                                                                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">#{r.student.absentNumber}</div>
                                                                    {r.student.schoolName && (
                                                                        <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">{r.student.schoolName}</div>
                                                                    )}
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
                                                        <td className="px-6 py-4 text-center text-xs font-bold text-slate-600 dark:text-slate-400">
                                                            {formatDuration(r.completionTime)}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            {r.activityLog && r.activityLog.length > 0 ? (
                                                                <span className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded font-bold text-[10px] border border-amber-100 dark:border-amber-800">{r.activityLog.length} Log</span>
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded border border-emerald-100 dark:border-emerald-800">Aman</span>
                                                            )}
                                                        </td>
                                                        {displayExam.config.trackLocation && displayExam.config.examMode !== 'PR' && (
                                                            <td className="px-6 py-4 text-center text-xs text-slate-500 dark:text-slate-400 font-mono">
                                                                {r.location ? (
                                                                    <a href={`https://www.google.com/maps?q=${r.location}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center gap-1">Maps ↗</a>
                                                                ) : '-'}
                                                            </td>
                                                        )}
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
                                                                    {displayExam.questions.filter(q => q.questionType !== 'INFO').map((q, idx) => {
                                                                        const status = checkAnswerStatus(q, r.answers);
                                                                        const isManual = (q.questionType === 'ESSAY' || q.questionType === 'FILL_IN_THE_BLANK');
                                                                        const isGraded = r.answers[`_grade_${q.id}`];
                                                                        
                                                                        let bgClass = 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-200'; 
                                                                        
                                                                        if (isManual && !isGraded) {
                                                                            bgClass = 'bg-yellow-300 dark:bg-yellow-600 text-slate-900 dark:text-white';
                                                                        } else if (status === 'CORRECT') {
                                                                            bgClass = 'bg-emerald-300 dark:bg-emerald-600 text-slate-900 dark:text-white';
                                                                        } else if (status === 'WRONG') {
                                                                            bgClass = 'bg-rose-300 dark:bg-rose-600 text-slate-900 dark:text-white';
                                                                        }
                                                                        
                                                                        return <div key={q.id} title={`Soal ${idx+1}: ${isManual && !isGraded ? 'Belum Dinilai' : status === 'CORRECT' ? 'Benar' : status === 'EMPTY' ? 'Kosong' : 'Salah'}`} className={`w-6 h-6 flex items-center justify-center rounded text-[10px] font-bold ${bgClass} cursor-help transition-transform hover:scale-110`}>{idx + 1}</div>;
                                                                    })}
                                                                </div>

                                                                {/* MANUAL GRADING UI (ONLY ESSAY & FILL_IN_THE_BLANK) */}
                                                                {displayExam.questions.some(q => q.questionType === 'ESSAY' || q.questionType === 'FILL_IN_THE_BLANK') && (
                                                                    <div className="mb-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                                                                        <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Detail Jawaban & Koreksi Manual</h4>
                                                                        <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                                                                            {displayExam.questions.filter(q => q.questionType !== 'INFO').map((q, idx) => {
                                                                                if (q.questionType !== 'ESSAY' && q.questionType !== 'FILL_IN_THE_BLANK') return null;

                                                                                const ans = r.answers[q.id];
                                                                                const manualStatus = r.answers[`_grade_${q.id}`];
                                                                                const systemStatus = checkAnswerStatus(q, r.answers);
                                                                                
                                                                                return (
                                                                                    <div key={q.id} className="text-sm border-b border-slate-100 dark:border-slate-700 pb-3 last:border-0">
                                                                                        <div className="flex justify-between items-start mb-1">
                                                                                            <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-700 text-slate-500 rounded px-1.5 py-0.5">#{idx + 1}</span>
                                                                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${systemStatus === 'CORRECT' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : systemStatus === 'WRONG' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                                                                                                {systemStatus === 'CORRECT' ? 'Benar' : systemStatus === 'WRONG' ? 'Salah' : 'Kosong'}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="font-bold text-slate-700 dark:text-slate-200 mb-1 line-clamp-2 prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{__html: q.questionText}}></div>
                                                                                        <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded text-slate-600 dark:text-slate-300 italic mb-2 break-words text-xs">
                                                                                            {ans || <span className="text-slate-400">Tidak menjawab</span>}
                                                                                        </div>
                                                                                        <div className="flex gap-2 justify-end">
                                                                                            <button 
                                                                                                onClick={(e) => { e.stopPropagation(); rateQuestion(r, q.id, true); }}
                                                                                                className={`px-3 py-1 text-xs font-bold rounded border flex items-center gap-1 ${manualStatus === 'CORRECT' ? 'bg-emerald-100 border-emerald-500 text-emerald-700' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                                                                            >
                                                                                                <CheckCircleIcon className="w-3 h-3"/> Benar
                                                                                            </button>
                                                                                            <button 
                                                                                                onClick={(e) => { e.stopPropagation(); rateQuestion(r, q.id, false); }}
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
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

