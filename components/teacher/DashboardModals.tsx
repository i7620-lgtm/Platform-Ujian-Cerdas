

import React, { useState, useEffect, useMemo } from 'react';
import type { Exam, Result, ResultStatus } from '../../types';
import { XMarkIcon, WifiIcon, ClockIcon, ChartBarIcon, DocumentArrowUpIcon } from '../Icons';
import { storageService } from '../../services/storage';

interface OngoingExamModalProps {
    exam: Exam | null;
    results: Result[];
    onClose: () => void;
    onAllowContinuation: (studentId: string, examCode: string) => void;
}

export const OngoingExamModal: React.FC<OngoingExamModalProps> = ({ exam, results: initialResults, onClose, onAllowContinuation }) => {
    const [activeTab, setActiveTab] = useState<'MONITOR' | 'INFO'>('MONITOR');
    const [filterClass, setFilterClass] = useState<string>('ALL');
    const [localResults, setLocalResults] = useState<Result[]>(initialResults);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

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
    const activeStudents = localResults.filter(r => (r.status as ResultStatus) === 'in_progress').length;
    const finishedStudents = localResults.filter(r => (r.status as ResultStatus) === 'completed').length;
    const suspendedStudents = localResults.filter(r => (r.status as ResultStatus) === 'force_submitted').length;
    
    // Livestream Link
    const streamLink = `${window.location.origin}?stream=${exam.code}`;

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
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                            <XMarkIcon className="w-6 h-6 text-gray-600" />
                        </button>
                    </div>

                    {/* TABS & STATS */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button 
                                onClick={() => setActiveTab('MONITOR')}
                                className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${activeTab === 'MONITOR' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <ChartBarIcon className="w-4 h-4 inline mr-1" />
                                Monitor
                            </button>
                            <button 
                                onClick={() => setActiveTab('INFO')}
                                className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${activeTab === 'INFO' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <DocumentArrowUpIcon className="w-4 h-4 inline mr-1" />
                                Info & Stream
                            </button>
                        </div>

                        {activeTab === 'MONITOR' && (
                            <div className="flex gap-2 text-xs font-semibold">
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">Total: {totalStudents}</span>
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded">Aktif: {activeStudents}</span>
                                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">Selesai: {finishedStudents}</span>
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">Suspended: {suspendedStudents}</span>
                            </div>
                        )}
                    </div>

                    {activeTab === 'MONITOR' && (
                        <div className="flex items-center gap-2 mt-2">
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
                    )}
                </div>

                {/* CONTENT */}
                <div className="overflow-auto flex-1 bg-gray-50 p-4">
                    {activeTab === 'MONITOR' ? (
                        filteredResults.length > 0 ? (
                            <div className="inline-block min-w-full align-middle bg-white rounded-lg shadow-sm border overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 sticky top-0 shadow-sm z-10">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-20">No.</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-40">Nama Siswa</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Kelas</th>
                                            <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Status</th>
                                            <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Nilai</th>
                                            {exam.config.trackLocation && (
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Lokasi</th>
                                            )}
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[300px]">Aktivitas Terkini</th>
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
                                                        {result.status === 'completed' || result.status === 'force_submitted' ? (
                                                             <div className="flex flex-col items-center">
                                                                <span className="text-lg font-bold text-neutral">{result.score}</span>
                                                                <span className="text-xs text-gray-500">B: {result.correctAnswers} | S: {incorrectCount}</span>
                                                             </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center opacity-50">
                                                                 <span className="text-sm font-bold text-gray-400">Live: {result.score}</span>
                                                                 <span className="text-[10px] text-gray-400">Prog: {Object.keys(result.answers).length}/{exam.questions.length}</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    {exam.config.trackLocation && (
                                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                                                            {result.location ? (
                                                                <a 
                                                                    href={`https://www.google.com/maps/search/?api=1&query=${result.location}`} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="text-blue-600 hover:underline flex items-center gap-1"
                                                                >
                                                                    📍 {result.location}
                                                                </a>
                                                            ) : <span className="text-gray-400">-</span>}
                                                        </td>
                                                    )}
                                                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-normal min-w-[300px]">
                                                        <span title={lastActivity} className="flex items-start gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 shrink-0"></div>
                                                            <span className="leading-relaxed break-words">{lastActivity}</span>
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {result.status === 'force_submitted' && (
                                                            <button 
                                                                onClick={() => onAllowContinuation(result.student.studentId, result.examCode)} 
                                                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 text-xs rounded-md shadow font-bold transition-all hover:shadow-md flex items-center justify-center gap-1 mx-auto w-full"
                                                            >
                                                                <span>Izinkan Lanjut</span>
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full py-20 text-gray-500">
                                <WifiIcon className="w-16 h-16 text-gray-300 mb-4" />
                                <p className="text-lg font-medium">Menunggu data peserta...</p>
                                <p className="text-sm">Data akan muncul secara otomatis saat siswa mulai mengerjakan.</p>
                            </div>
                        )
                    ) : (
                        // INFO & STREAM TAB
                        <div className="bg-white p-8 rounded-xl shadow-sm border max-w-2xl mx-auto mt-8">
                            <h3 className="text-xl font-bold text-neutral mb-6 text-center">Informasi Livestream Publik</h3>
                            
                            {exam.config.enablePublicStream ? (
                                <div className="flex flex-col items-center space-y-6">
                                    <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300">
                                        {/* Using QR Server API for simplicity */}
                                        <img 
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(streamLink)}`} 
                                            alt="QR Code Livestream" 
                                            className="w-48 h-48"
                                        />
                                    </div>
                                    <p className="text-gray-500 text-sm text-center">
                                        Scan QR Code ini atau gunakan link di bawah untuk memantau ujian secara real-time tanpa login.
                                    </p>
                                    <div className="w-full flex items-center gap-2">
                                        <input 
                                            type="text" 
                                            readOnly 
                                            value={streamLink} 
                                            className="w-full p-3 bg-gray-50 border rounded-lg text-sm text-gray-600 font-mono"
                                        />
                                        <button 
                                            onClick={() => navigator.clipboard.writeText(streamLink)} 
                                            className="bg-primary text-white px-4 py-3 rounded-lg font-bold hover:bg-primary-focus whitespace-nowrap"
                                        >
                                            Salin
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg inline-block mb-4">
                                        ⚠ Fitur Livestream tidak diaktifkan untuk ujian ini.
                                    </div>
                                    <p className="text-gray-600">
                                        Anda dapat mengaktifkan "Livestream Publik" pada menu edit konfigurasi ujian.
                                    </p>
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
