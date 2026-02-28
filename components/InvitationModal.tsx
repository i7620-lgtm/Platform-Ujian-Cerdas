import React, { useState, useEffect } from 'react';
import { XMarkIcon, PrinterIcon, LogoIcon, ClockIcon, UserIcon, QrCodeIcon, DocumentDuplicateIcon, ShareIcon } from './Icons';
import type { Exam } from '../types';

interface InvitationModalProps {
    isOpen: boolean;
    onClose: () => void;
    teacherName?: string;
    schoolName?: string;
    exam?: Exam | null;
}

export const InvitationModal: React.FC<InvitationModalProps> = ({ isOpen, onClose, teacherName, schoolName, exam }) => {
    const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null);
    const [isStarted, setIsStarted] = useState(false);

    const currentUrl = window.location.origin;
    const joinUrl = exam ? `${currentUrl}/?join=${exam.code}` : currentUrl;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}&margin=10`;

    useEffect(() => {
        if (!exam || !isOpen) return;

        const tick = () => {
            const dateStr = exam.config.date.includes('T') ? exam.config.date.split('T')[0] : exam.config.date;
            const targetDate = new Date(`${dateStr}T${exam.config.startTime}`).getTime();
            const now = new Date().getTime();
            const diff = targetDate - now;

            if (diff <= 0) {
                setIsStarted(true);
                setTimeLeft(null);
            } else {
                setIsStarted(false);
                setTimeLeft({
                    d: Math.floor(diff / (1000 * 60 * 60 * 24)),
                    h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                    m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                    s: Math.floor((diff % (1000 * 60)) / 1000)
                });
            }
        };

        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [exam, isOpen]);

    if (!isOpen) return null;

    // --- MODE 1: BAGIKAN APP (COMPACT CARD) ---
    if (!exam) {
        return (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in font-sans">
                <div className="relative bg-white dark:bg-slate-900 w-full max-w-[320px] rounded-3xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700 animate-slide-in-up flex flex-col max-h-[90vh]">
                    {/* Compact Decorative Header */}
                    <div className="h-20 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 relative shrink-0">
                        <div className="absolute top-0 left-0 w-full h-full opacity-30 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-sm">
                            <XMarkIcon className="w-4 h-4"/>
                        </button>
                    </div>

                    <div className="px-6 pb-6 -mt-10 relative flex flex-col items-center text-center flex-1 overflow-y-auto custom-scrollbar">
                        <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-2xl shadow-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 ring-4 ring-white dark:ring-slate-900">
                            <LogoIcon className="w-10 h-10" />
                        </div>

                        <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none">UjianCerdas</h2>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Platform Evaluasi</p>

                        <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm mb-4 relative group shrink-0">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl opacity-0 group-hover:opacity-30 blur transition-opacity"></div>
                            <img src={qrUrl} alt="App QR" className="w-32 h-32 object-contain relative z-10 mix-blend-multiply dark:mix-blend-normal" />
                        </div>

                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-4 leading-relaxed px-1">
                            Pindai atau bagikan tautan ini untuk mengajak orang lain menggunakan aplikasi.
                        </p>

                        <div className="w-full flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex-1 px-2 overflow-hidden text-left">
                                <p className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 truncate">{joinUrl}</p>
                            </div>
                            <button 
                                onClick={() => { navigator.clipboard.writeText(joinUrl); alert('Tautan berhasil disalin!'); }}
                                className="p-1.5 bg-white dark:bg-slate-700 text-slate-500 hover:text-indigo-600 dark:text-slate-300 rounded-md shadow-sm border border-slate-100 dark:border-slate-600 hover:border-indigo-100 transition-all"
                                title="Salin"
                            >
                                <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                            </button>
                            {navigator.share && (
                                <button 
                                    onClick={() => navigator.share({ title: 'UjianCerdas', text: 'Coba aplikasi ujian online modern ini!', url: joinUrl })}
                                    className="p-1.5 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 transition-all"
                                    title="Share"
                                >
                                    <ShareIcon className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- MODE 2: UNDANGAN UJIAN (FULL DETAIL) ---
    const handlePrint = () => { window.print(); };

    const getExamTypeBadge = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes('pas') || t.includes('akhir')) return 'bg-indigo-600 text-white';
        if (t.includes('harian') || t.includes('pts')) return 'bg-amber-500 text-white';
        return 'bg-blue-600 text-white';
    };

    const getFormattedStartDate = () => {
        if (!exam) return '';
        const dateStr = exam.config.date.includes('T') ? exam.config.date.split('T')[0] : exam.config.date;
        try {
            const date = new Date(`${dateStr}T${exam.config.startTime}`);
            if (isNaN(date.getTime())) return `${dateStr} ${exam.config.startTime}`;
            
            const datePart = date.toLocaleDateString('id-ID', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric'
            });
            const timePart = date.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            
            return `${datePart} pukul ${timePart} waktu setempat`;
        } catch (e) {
            return `${dateStr} ${exam.config.startTime}`;
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-6 bg-slate-900/70 backdrop-blur-md animate-fade-in font-sans overflow-hidden">
            <style>{`
                @media print {
                    @page { margin: 0; size: auto; }
                    body * { visibility: hidden; }
                    .print-container, .print-container * { visibility: visible !important; }
                    .print-container { position: fixed; left: 0; top: 0; width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; background: white; z-index: 9999; }
                    #invitation-card { width: 700px !important; border: 1px solid #e2e8f0 !important; box-shadow: none !important; border-radius: 24px !important; overflow: hidden; background: white !important; color: black !important; transform: scale(1) !important; }
                    .no-print { display: none !important; }
                }
            `}</style>

            <div className="print-container w-full h-full flex items-center justify-center pointer-events-none p-0 sm:p-4">
                <div id="invitation-card" className="bg-white dark:bg-slate-900 w-full max-w-md landscape:max-w-4xl rounded-2xl sm:rounded-[2rem] shadow-2xl overflow-hidden border border-white/20 dark:border-slate-800 relative animate-slide-in-up flex flex-col landscape:flex-row pointer-events-auto transition-all duration-300 max-h-[95vh] sm:max-h-none">
                    
                    {/* Decorative Vertical Gradient */}
                    <div className="h-1.5 sm:h-2 w-full landscape:w-2 landscape:h-auto bg-gradient-to-r landscape:bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500 shrink-0"></div>
                    
                    {/* Close Button */}
                    <button onClick={onClose} className="absolute top-2 right-2 sm:top-4 sm:right-4 z-30 p-1.5 sm:p-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-400 rounded-full transition-all no-print border border-transparent shadow-sm">
                        <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5"/>
                    </button>

                    {/* Left Panel: QR Section */}
                    <div className="p-4 sm:p-6 md:p-8 flex flex-col items-center justify-center landscape:w-5/12 bg-slate-50/50 dark:bg-slate-800/30 border-b landscape:border-b-0 landscape:border-r border-slate-100 dark:border-slate-800 shrink-0">
                        <div className="flex items-center gap-2 mb-2 sm:mb-6 opacity-80">
                            <LogoIcon className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400" />
                            <span className="font-bold text-sm sm:text-base text-slate-700 dark:text-slate-300 tracking-tight">UjianCerdas</span>
                        </div>
                        
                        <div className="relative group scale-90 sm:scale-100 origin-center">
                            <div className="absolute -inset-3 bg-gradient-to-tr from-indigo-500 to-pink-500 rounded-[2rem] opacity-10 blur group-hover:opacity-20 transition-opacity no-print"></div>
                            <div className="relative bg-white p-2 sm:p-3 rounded-2xl sm:rounded-[1.5rem] shadow-xl border border-slate-100">
                                <img src={qrUrl} alt="Join QR" className="w-24 h-24 sm:w-32 sm:h-32 landscape:w-40 landscape:h-40 object-contain" />
                            </div>
                            <div className="mt-2 sm:mt-4 text-center">
                                <div className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <QrCodeIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400"/>
                                    <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Scan to Join</span>
                                </div>
                            </div>
                        </div>

                        {/* Link & Button Section (Visible on Screen, Hidden on Print) */}
                        <div className="mt-3 sm:mt-6 w-full max-w-[240px] space-y-2 sm:space-y-3 no-print">
                            <div className="relative group/link">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl opacity-20 blur group-hover/link:opacity-40 transition-opacity"></div>
                                <div className="relative bg-white dark:bg-slate-800 p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 flex items-center shadow-sm">
                                    <input 
                                        readOnly 
                                        value={joinUrl} 
                                        className="w-full bg-transparent text-[10px] text-slate-600 dark:text-slate-300 font-mono outline-none px-2 truncate"
                                        onClick={(e) => e.currentTarget.select()}
                                    />
                                    <button 
                                        onClick={() => { navigator.clipboard.writeText(joinUrl); alert('Tautan disalin!'); }}
                                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
                                        title="Salin Link"
                                    >
                                        <DocumentDuplicateIcon className="w-3.5 h-3.5"/>
                                    </button>
                                </div>
                            </div>
                            
                            <a 
                                href={joinUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="block w-full py-2 sm:py-2.5 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-lg sm:rounded-xl text-center shadow-md transition-all active:scale-95"
                            >
                                Click to Join
                            </a>
                        </div>
                    </div>

                    {/* Right Panel: Content Section */}
                    <div className="p-4 sm:p-6 md:p-8 flex flex-col landscape:w-7/12 relative bg-white dark:bg-slate-900 overflow-y-auto sm:overflow-visible">
                        
                        {/* Header: Teacher Identity */}
                        <div className="mb-2 sm:mb-4 pr-10"> 
                            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-0.5 sm:mb-1 block">Penyelenggara</span>
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-indigo-50 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                    <UserIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                </div>
                                <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{schoolName || teacherName || 'Sekolah'}</span>
                            </div>
                        </div>

                        {/* Title Row */}
                        <div className="mb-3 sm:mb-6 flex flex-col gap-1 sm:gap-2">
                            <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none line-clamp-2">
                                {exam ? exam.config.subject : 'Evaluasi Belajar'}
                            </h2>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                {exam && (
                                    <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-widest shadow-sm ${getExamTypeBadge(exam.config.examType)}`}>
                                        {exam.config.examType}
                                    </span>
                                )}
                                {exam?.config.targetClasses && exam.config.targetClasses.map(c => (
                                    <span key={c} className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[8px] sm:text-[9px] font-black rounded-md sm:rounded-lg border border-slate-200 dark:border-slate-700 uppercase tracking-tight">
                                        {c}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Body: Countdown Widget - Compact */}
                        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-100 dark:border-slate-700 mb-3 sm:mb-6 flex flex-col items-center text-center shadow-inner">
                            {isStarted ? (
                                <div className="animate-pulse flex items-center gap-2 py-1">
                                    <span className="relative flex h-3 w-3">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                    </span>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-wider text-xs">Ujian Sedang Berlangsung</span>
                                </div>
                            ) : timeLeft ? (
                                <div className="w-full">
                                    <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700/50">
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Jadwal Pelaksanaan</p>
                                        <p className="text-sm sm:text-base font-black text-slate-700 dark:text-slate-200 capitalize">
                                            {getFormattedStartDate()}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-center gap-1.5 mb-2 sm:mb-3 opacity-60">
                                        <ClockIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                        <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em]">Waktu Tersisa</span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-slate-800 dark:text-white">
                                        {[
                                            { val: timeLeft.d, label: 'Hari' },
                                            { val: timeLeft.h, label: 'Jam' },
                                            { val: timeLeft.m, label: 'Menit' },
                                            { val: timeLeft.s, label: 'Detik' }
                                        ].map((t, i) => (
                                            <div key={i} className="flex flex-col items-center bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl p-1.5 sm:p-2 border border-slate-100 dark:border-slate-700 shadow-sm">
                                                <span className="font-code text-base sm:text-xl font-bold tabular-nums leading-none mb-0.5 sm:mb-1">{t.val.toString().padStart(2,'0')}</span>
                                                <span className="text-[6px] sm:text-[7px] uppercase font-black text-slate-400">{t.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="py-2 text-xs font-bold text-slate-400 animate-pulse tracking-widest uppercase">Menyiapkan Waktu...</div>
                            )}
                        </div>

                        {/* Footer: Access Code & Print Button */}
                        <div className="mt-auto pt-2 sm:pt-4 border-t border-slate-50 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-2 sm:mb-4">
                                <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">Kode Akses</span>
                                <span className="font-mono text-base sm:text-lg font-black text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg tracking-widest border border-slate-200 dark:border-slate-700 select-all">
                                    {exam?.code || '------'}
                                </span>
                            </div>

                            <button 
                                onClick={handlePrint}
                                className="group w-full py-2.5 sm:py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 no-print flex items-center justify-center gap-2 sm:gap-3 active:scale-[0.98] active:translate-y-0"
                            >
                                <PrinterIcon className="w-4 h-4 sm:w-5 sm:h-5 opacity-90 group-hover:scale-110 transition-transform" />
                                <span className="tracking-wide">Cetak Kartu Undangan</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
