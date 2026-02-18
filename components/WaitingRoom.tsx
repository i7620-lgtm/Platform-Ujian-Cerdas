import React, { useState, useEffect } from 'react';
import { CalendarDaysIcon, ClockIcon, UserIcon, ArrowLeftIcon, LogoIcon, CheckCircleIcon, QrCodeIcon, DocumentDuplicateIcon } from './Icons';
import type { Exam } from '../types';

interface WaitingRoomProps {
    exam: Exam;
    onEnter: () => void;
    onBack: () => void;
}

const parseSchedule = (dateStr: string, timeStr: string): Date => {
    try {
        const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        const [year, month, day] = cleanDate.split('-').map(Number);
        const [hours, minutes] = timeStr.split(':').map(Number);
        return new Date(year, month - 1, day, hours, minutes, 0);
    } catch (e) {
        return new Date(NaN);
    }
};

export const WaitingRoom: React.FC<WaitingRoomProps> = ({ exam, onEnter, onBack }) => {
    const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null);
    const [isStarted, setIsStarted] = useState(false);

    // URL Logic for QR mirroring
    const currentUrl = window.location.origin;
    const joinUrl = `${currentUrl}/?join=${exam.code}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}&margin=10`;

    useEffect(() => {
        const calculateTime = () => {
            const targetDate = parseSchedule(exam.config.date, exam.config.startTime).getTime();
            const now = new Date().getTime();
            const diff = targetDate - now;

            if (!isNaN(targetDate) && diff <= 0) {
                // Time passed
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

        calculateTime();
        const timer = setInterval(calculateTime, 1000);

        return () => clearInterval(timer);
    }, [exam]);

    const getExamTypeBadge = (type: string) => {
        const t = (type || '').toLowerCase();
        if (t.includes('pas') || t.includes('akhir')) return 'bg-indigo-600 text-white';
        if (t.includes('harian') || t.includes('pts')) return 'bg-amber-500 text-white';
        return 'bg-blue-600 text-white';
    };

    return (
        <div className="min-h-screen bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 font-sans overflow-y-auto">
            {/* Same structure as InvitationModal */}
            <div className="bg-white dark:bg-slate-900 w-full max-w-md landscape:max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden border border-white/20 dark:border-slate-800 relative animate-slide-in-up flex flex-col landscape:flex-row transition-all duration-300">
                
                {/* Decorative Vertical Gradient */}
                <div className="h-2 w-full landscape:w-2 landscape:h-auto bg-gradient-to-r landscape:bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500 shrink-0"></div>
                
                {/* Close Button (Back) */}
                <button onClick={onBack} className="absolute top-4 right-4 z-30 p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 rounded-full transition-all border border-transparent shadow-sm">
                    <ArrowLeftIcon className="w-5 h-5"/>
                </button>

                {/* Left Panel: QR Section */}
                <div className="p-6 md:p-8 flex flex-col items-center justify-center landscape:w-5/12 bg-slate-50/50 dark:bg-slate-800/30 border-b landscape:border-b-0 landscape:border-r border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-6 opacity-80">
                        <LogoIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        <span className="font-bold text-slate-700 dark:text-slate-300 tracking-tight">UjianCerdas</span>
                    </div>
                    
                    <div className="relative group">
                        <div className="absolute -inset-3 bg-gradient-to-tr from-indigo-500 to-pink-500 rounded-[2rem] opacity-10 blur group-hover:opacity-20 transition-opacity"></div>
                        <div className="relative bg-white p-3 rounded-[1.5rem] shadow-xl border border-slate-100">
                            <img src={qrUrl} alt="Join QR" className="w-32 h-32 landscape:w-40 landscape:h-40 object-contain" />
                        </div>
                        <div className="mt-4 text-center">
                            <div className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700 shadow-sm">
                                <QrCodeIcon className="w-3 h-3 text-slate-400"/>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Entry Ticket</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 w-full max-w-[240px] space-y-3">
                        <div className="relative group/link">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl opacity-20 blur group-hover/link:opacity-40 transition-opacity"></div>
                            <div className="relative bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center shadow-sm">
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
                    </div>
                </div>

                {/* Right Panel: Content Section */}
                <div className="p-6 md:p-8 flex flex-col landscape:w-7/12 relative bg-white dark:bg-slate-900">
                    
                    {/* Header: Teacher Identity */}
                    <div className="mb-4 pr-10"> 
                        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1 block">Penyelenggara</span>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                <UserIcon className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{exam.authorName || 'Pengajar'}</span>
                        </div>
                    </div>

                    {/* Title Row */}
                    <div className="mb-6 flex flex-col gap-2">
                        <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none line-clamp-2">
                            {exam.config.subject || 'Evaluasi Belajar'}
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm ${getExamTypeBadge(exam.config.examType)}`}>
                                {exam.config.examType}
                            </span>
                            {exam.config.targetClasses && exam.config.targetClasses.map(c => (
                                <span key={c} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9px] font-black rounded-lg border border-slate-200 dark:border-slate-700 uppercase tracking-tight">
                                    {c}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Body: Countdown or Action Button */}
                    <div className="mt-auto pt-4 border-t border-slate-50 dark:border-slate-800">
                        
                        {isStarted ? (
                            <div className="space-y-4 animate-fade-in">
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 border border-emerald-100 dark:border-emerald-800 flex items-center gap-3">
                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-800 rounded-full text-emerald-600 dark:text-emerald-300 animate-pulse">
                                        <ClockIcon className="w-5 h-5"/>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest">Status Ujian</p>
                                        <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Sedang Berlangsung</p>
                                    </div>
                                </div>

                                <button 
                                    onClick={onEnter}
                                    className="group w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-3 active:scale-[0.98] active:translate-y-0"
                                >
                                    <CheckCircleIcon className="w-5 h-5 opacity-90 group-hover:scale-110 transition-transform" />
                                    <span className="tracking-wide">MASUK KE HALAMAN LOGIN</span>
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-fade-in">
                                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-inner">
                                    <div className="flex items-center justify-center gap-1.5 mb-3 opacity-60">
                                        <ClockIcon className="w-3.5 h-3.5" />
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">Dimulai Dalam</span>
                                    </div>
                                    
                                    {timeLeft ? (
                                        <div className="grid grid-cols-4 gap-2 text-slate-800 dark:text-white">
                                            {[
                                                { val: timeLeft.d, label: 'Hari' },
                                                { val: timeLeft.h, label: 'Jam' },
                                                { val: timeLeft.m, label: 'Menit' },
                                                { val: timeLeft.s, label: 'Detik' }
                                            ].map((t, i) => (
                                                <div key={i} className="flex flex-col items-center bg-white dark:bg-slate-800 rounded-xl p-2 border border-slate-100 dark:border-slate-700 shadow-sm">
                                                    <span className="font-code text-xl font-bold tabular-nums leading-none mb-1">{String(t.val).padStart(2,'0')}</span>
                                                    <span className="text-[7px] uppercase font-black text-slate-400">{t.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-2 text-xs font-bold text-slate-400 animate-pulse tracking-widest uppercase text-center">Menyiapkan Waktu...</div>
                                    )}
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                        Halaman login akan terbuka otomatis saat waktu habis.
                                    </p>
                                </div>
                            </div>
                        )}
                        
                        <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-50 dark:border-slate-800">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kode Akses</span>
                            <span className="font-mono text-sm font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded tracking-widest border border-slate-200 dark:border-slate-700 select-all">
                                {exam.code}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
