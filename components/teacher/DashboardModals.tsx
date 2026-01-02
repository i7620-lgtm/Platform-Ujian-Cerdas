
import React, { useState, useEffect, useMemo } from 'react';
import type { Exam, Result } from '../../types';
import { XMarkIcon, WifiIcon, ClockIcon, LockClosedIcon } from '../Icons';
import { storageService } from '../../services/storage';

interface OngoingExamModalProps {
    exam: Exam | null;
    results: Result[];
    onClose: () => void;
    onAllowContinuation: (studentId: string, examCode: string) => void;
}

export const OngoingExamModal: React.FC<OngoingExamModalProps> = ({ exam, results: initialResults, onClose, onAllowContinuation }) => {
    const [filterClass, setFilterClass] = useState<string>('ALL');
    const [localResults, setLocalResults] = useState<Result[]>(initialResults);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [activeTab, setActiveTab] = useState<'MONITOR' | 'STREAM_INFO'>('MONITOR');

    // Sync local state when props change
    useEffect(() => {
        if(exam) {
            setLocalResults(initialResults.filter(r => r.examCode === exam.code));
        }
    }, [initialResults, exam]);

    // Live Stream Effect (Auto Refresh)
    useEffect(() => {
        if (!exam) return;
        
        const fetchLatest = async () => {
            setIsRefreshing(true);
            try {
                const latest = await storageService.getResults(); // This should trigger a fetch if implemented in storage
                // Filter only for this exam
                const updatedForThisExam = latest.filter(r => r.examCode === exam.code);
                setLocalResults(updatedForThisExam);
                setLastUpdated(new Date());
            } catch (e) {
                console.error("Auto-refresh failed", e);
            } finally {
                setIsRefreshing(false);
            }
        };

        // Initial fetch
        fetchLatest();

        // Polling interval (5 seconds for "Livestream" feel)
        const intervalId = setInterval(fetchLatest, 5000);
        return () => clearInterval(intervalId);
    }, [exam]);

    // Derived Data (HOOKS MUST BE CALLED BEFORE EARLY RETURN)
    const uniqueClasses = useMemo(() => {
        const classes = new Set(localResults.map(r => r.student.class));
        return Array.from(classes).sort();
    }, [localResults]);

    const filteredResults = useMemo(() => {
        let res = localResults;
        if (filterClass !== 'ALL') {
            res = res.filter(r => r.student.class === filterClass);
        }
        // Sort by Class then Student ID (Absen)
        return res.sort((a, b) => {
            if (a.student.class !== b.student.class) return a.student.class.localeCompare(b.student.class);
            // Assuming studentId is numeric string for Absen
            return parseInt(a.student.studentId) - parseInt(b.student.studentId);
        });
    }, [localResults, filterClass]);

    // --- EARLY RETURN CHECK ---
    if (!exam) return null;

    const scorableQuestionsCount = exam.questions.filter(q => q.questionType !== 'ESSAY' && q.questionType !== 'INFO').length;

    // Statistics
    const totalStudents = localResults.length;
    // Safe Comparison: Explicitly checking against string literals
    const activeStudents = localResults.filter(r => r.status === 'in_progress').length;
    const finishedStudents = localResults.filter(r => r.status === 'completed').length;
    const suspendedStudents = localResults.filter(r => r.status === 'force_submitted').length;

    const streamUrl = `${window.location.origin}/?stream=${exam.code}`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-base-100 rounded-xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col">
                
                {/* HEADER */}
                <div className="p-5 border-b bg-base-100 sticky top-0 z-10 rounded-t-xl flex flex-col gap-4 shadow-sm shrink-0">
                    <div className="flex justify-between items-start">
                        <div>
                             <div className="flex items-center gap-2">
                                <span className="relative flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                </span>
                                <h2 className="text-xl font-bold text-neutral">Live Monitoring: {exam.code}</h2>
                             </div>
                             <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                                <ClockIcon className="w-4 h-4"/> Terakhir diperbarui: {lastUpdated.toLocaleTimeString()}
                                {isRefreshing && <span className="text-primary text-xs animate-pulse font-semibold">(Menyegarkan...)</span>}
                             </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* TAB BUTTONS */}
                            <button 
                                onClick={() => setActiveTab('MONITOR')}
                                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'MONITOR' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                Monitor
                            </button>
                            {exam.config.enablePublicStream && (
                                <button 
                                    onClick={() => setActiveTab('STREAM_INFO')}
                                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'STREAM_INFO' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    Info Stream
                                </button>
                            )}
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors ml-2">
                                <XMarkIcon className="w-6 h-6 text-gray-600" />
                            </button>
                        </div>
                    </div>

                    {activeTab === 'MONITOR' && (
                        <>
                            {/* DASHBOARD STATS */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                    <p className="text-xs text-blue-600 font-semibold uppercase">Total Peserta</p>
                                    <p className="text-2xl font-bold text-blue-800">{totalStudents}</p>
                                </div>
                                <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                                    <p className="text-xs text-green-600 font-semibold uppercase">Sedang Mengerjakan</p>
                                    <p className="text-2xl font-bold text-green-800">{activeStudents}</p>
                                </div>
                                <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                                    <p className="text-xs text-purple-600 font-semibold uppercase">Selesai</p>
                                    <p className="text-2xl font-bold text-purple-800">{finishedStudents}</p>
                                </div>
                                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                                    <p className="text-xs text-yellow-600 font-semibold uppercase">Ditangguhkan</p>
                                    <p className="text-2xl font-bold text-yellow-800">{suspendedStudents}</p>
                                </div>
                            </div>

                            {/* FILTERS */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-600">Filter Kelas:</span>
                                <select 
                                    value={filterClass} 
                                    onChange={(e) => setFilterClass(e.target.value)}
                                    className="p-2 border rounded-md text-sm bg-white focus:ring-primary focus:border-primary"
                                >
                                    <option value="ALL">Semua Kelas</option>
                                    {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </>
                    )}
                </div>

                {/* CONTENT AREA */}
                <div className="overflow-auto flex-1 bg-gray-50 p-4">
                    {activeTab === 'STREAM_INFO' ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-6">
                            <div className="bg-white p-8 rounded-xl shadow-md border text-center max-w-lg w-full">
                                <h3 className="text-2xl font-bold text-gray-800 mb-4">Livestream Publik Aktif</h3>
                                <p className="text-gray-600 mb-6">
                                    Orang tua atau pengawas dapat memantau ujian ini secara real-time melalui tautan berikut tanpa perlu login.
                                </p>
                                
                                <div className="bg-gray-100 p-4 rounded-lg mb-4 break-all font-mono text-sm border border-gray-300">
                                    {streamUrl}
                                </div>
                                
                                <button 
                                    onClick={() => navigator.clipboard.writeText(streamUrl)}
                                    className="bg-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-primary-focus transition-colors"
                                >
                                    Salin Link
                                </button>
                                
                                <div className="mt-8 pt-6 border-t w-full">
                                    <p className="text-sm text-gray-500 font-semibold uppercase tracking-wide mb-2">QR Code</p>
                                    <div className="bg-white p-2 inline-block rounded-lg">
                                        {/* Simple QR Code placeholder - in a real app use a library like qrcode.react */}
                                        <img 
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(streamUrl)}`} 
                                            alt="QR Code Stream" 
                                            className="w-32 h-32"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* TABLE CONTENT */
                        <div className="overflow-auto bg-white rounded-lg shadow border">
                             {filteredResults.length > 0 ? (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 sticky top-0 shadow-sm z-10">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-20">No. Absen</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-40">Nama Siswa</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Kelas</th>
                                            <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Status</th>
                                            <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-36">Nilai / Progress</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[300px]">Aktivitas Terkini</th>
                                            {exam.config.trackLocation && (
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-40">Lokasi (GPS)</th>
                                            )}
                                            <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredResults.map(result => {
                                            const incorrectCount = scorableQuestionsCount - result.correctAnswers;
                                            const lastActivity = result.activityLog && result.activityLog.length > 0 
                                                ? result.activityLog[result.activityLog.length - 1] 
                                                : "Memulai sesi...";
                                            
                                            let statusBadge;
                                            if (result.status === 'in_progress') statusBadge = <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold animate-pulse">● Mengerjakan</span>;
                                            else if (result.status === 'completed') statusBadge = <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-bold">✓ Selesai</span>;
                                            else if (result.status === 'force_submitted') statusBadge = <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-bold">! Ditangguhkan</span>;
                                            else statusBadge = <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-bold">Menunggu</span>;

                                            // PROGRESS LOGIC
                                            const questionsAnswered = Object.keys(result.answers).length;
                                            // FIX: Filter out INFO types for denominator
                                            const totalQuestions = exam.questions.filter(q => q.questionType !== 'INFO').length;

                                            return (
                                                <tr key={result.student.studentId} className={`transition-colors hover:bg-blue-50/50 ${result.status === 'force_submitted' ? 'bg-red-50' : ''}`}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-semibold text-gray-600">
                                                        #{result.student.studentId.padStart(2, '0')}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                                        {result.student.fullName}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {result.student.class}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        {statusBadge}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        {/* LOGIKA PENYEMBUNYIAN NILAI */}
                                                        {result.status === 'completed' || result.status === 'force_submitted' ? (
                                                             <div className="flex flex-col items-center">
                                                                <span className="text-lg font-bold text-neutral">{result.score}</span>
                                                                <span className="text-xs text-gray-500">B: {result.correctAnswers} | S: {incorrectCount}</span>
                                                             </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center">
                                                                 <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Terisi</span>
                                                                 <div className="flex items-center gap-1 mt-1">
                                                                    <div className="w-20 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                                                        <div className="bg-primary h-2.5 rounded-full" style={{ width: `${(questionsAnswered / totalQuestions) * 100}%` }}></div>
                                                                    </div>
                                                                    <span className="text-[10px] font-bold text-gray-600">{questionsAnswered}/{totalQuestions}</span>
                                                                 </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-normal">
                                                        <span title={lastActivity} className="flex items-start gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 shrink-0"></div>
                                                            <span className="leading-relaxed break-words">{lastActivity}</span>
                                                        </span>
                                                    </td>
                                                    {exam.config.trackLocation && (
                                                        <td className="px-6 py-4 text-xs text-gray-500 font-mono whitespace-nowrap">
                                                            {result.location ? (
                                                                <a 
                                                                    href={`https://www.google.com/maps/search/?api=1&query=${result.location}`} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="text-blue-600 hover:underline flex items-center gap-1"
                                                                >
                                                                    📍 {result.location.substring(0, 15)}...
                                                                </a>
                                                            ) : (
                                                                <span className="text-gray-400">-</span>
                                                            )}
                                                        </td>
                                                    )}
                                                    <td className="px-6 py-4 text-center">
                                                        {result.status === 'force_submitted' && (
                                                            <button 
                                                                onClick={() => onAllowContinuation(result.student.studentId, result.examCode)} 
                                                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 text-xs rounded-md shadow font-bold transition-all hover:shadow-md flex items-center justify-center gap-1 mx-auto w-full"
                                                            >
                                                                <span>Izinkan Lanjut</span>
                                                            </button>
                                                        )}
                                                        {result.status === 'in_progress' && (
                                                            <div className="flex justify-center text-gray-300">
                                                                <LockClosedIcon className="w-4 h-4" />
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                             ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                                    <WifiIcon className="w-12 h-12 text-gray-300 mb-2" />
                                    <p className="font-medium">Menunggu data peserta...</p>
                                </div>
                             )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface FinishedExamModalProps {
    exam: Exam | null;
    results: Result[];
    onClose: () => void;
}

export const FinishedExamModal: React.FC<FinishedExamModalProps> = ({ exam, results, onClose }) => {
    if (!exam) return null;

    const examResults = results.filter(r => r.examCode === exam.code);
    const scorableQuestionsCount = exam.questions.filter(q => q.questionType !== 'ESSAY' && q.questionType !== 'INFO').length;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-bold text-neutral">Hasil Ujian: {exam.code}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {examResults.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Siswa</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Benar</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Salah</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Hasil</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aktivitas</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {examResults.map((result, index) => {
                                        const incorrectCount = scorableQuestionsCount - result.correctAnswers;
                                        return (
                                            <tr key={result.student.studentId} className="transition-colors hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.student.fullName}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold text-center">{result.correctAnswers}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold text-center">{incorrectCount < 0 ? 0 : incorrectCount}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-center">{result.score}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500 align-top">
                                                    {result.activityLog && result.activityLog.length > 0 ? (
                                                        <ul className="list-disc list-outside pl-5 space-y-1">
                                                            {result.activityLog.map((log, logIndex) => (
                                                                <li key={logIndex}>{log}</li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <span>-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500 align-top">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${result.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {result.status === 'completed' ? 'Selesai' : 'Dibatalkan'}
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : <p className="text-center text-gray-500 py-8">Belum ada hasil untuk ujian ini.</p>}
                </div>
            </div>
        </div>
    );
};
