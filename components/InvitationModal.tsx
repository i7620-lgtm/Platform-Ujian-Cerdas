
import React, { useState, useEffect } from 'react';
import { XMarkIcon, PrinterIcon, LogoIcon, ClockIcon, UserIcon, QrCodeIcon } from './Icons';
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

    const handlePrint = () => { window.print(); };

    const getExamTypeBadge = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes('pas') || t.includes('akhir')) return 'bg-indigo-600 text-white';
        if (t.includes('harian') || t.includes('pts')) return 'bg-amber-500 text-white';
        return 'bg-blue-600 text-white';
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in font-sans">
            <style>{`
                @media print {
                    @page { margin: 0; size: auto; }
                    body * { visibility: hidden; }
                    .print-container, .print-container * { visibility: visible !important; }
                    .print-container { position: fixed; left: 0; top: 0; width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; background: white; z-index: 9999; }
                    #invitation-card { width: 650px !important; border: 1px solid #e2e8f0 !important; box-shadow: none !important; border-radius: 24px !important; overflow: hidden; background: white !important; color: black !important; }
                    .no-print { display: none !important; }
                }
            `}</style>

            <div className="print-container w-full h-full flex items-center justify-center pointer-events-none">
                <div id="invitation-card" className="bg-white dark:bg-slate-900 w-full max-w-md landscape:max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 dark:border-slate-800 relative animate-slide-in-up flex flex-col landscape:flex-row pointer-events-auto transition-all duration-300">
                    
                    {/* Decorative Vertical Gradient */}
                    <div className="h-2 w-full landscape:w-2 landscape:h-auto bg-gradient-to-r landscape:bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500 shrink-0"></div>
                    
                    {/* Close Button - repositioned for better safety */}
                    <button onClick={onClose} className="absolute top-6 right-6 z-30 p-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-400 rounded-full transition-all no-print border border-transparent shadow-sm">
                        <XMarkIcon className="w-5 h-5"/>
                    </button>

                    {/* Left Panel: QR Section */}
                    <div className="p-10 flex flex-col items-center justify-center landscape:w-5/12 bg-slate-50/50 dark:bg-slate-800/30 border-b landscape:border-b-0 landscape:border-r border-slate-100 dark:border-slate-800">
                        <div className="p-4 bg-white dark:bg-slate-800 rounded-3xl shadow-sm mb-10 ring-1 ring-slate-100 dark:ring-slate-700">
                            <LogoIcon className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        
                        <div className="relative group">
                            <div className="absolute -inset-3 bg-gradient-to-tr from-indigo-500 to-pink-500 rounded-[2rem] opacity-10 blur group-hover:opacity-20 transition-opacity no-print"></div>
                            <div className="relative bg-white p-4 rounded-[1.5rem] shadow-xl border border-slate-100">
                                <img src={qrUrl} alt="Join QR" className="w-36 h-36 landscape:w-44 landscape:h-44 object-contain" />
                            </div>
                            <div className="mt-5 text-center">
                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 block">Scan to Join</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Content Section */}
                    <div className="p-10 flex flex-col landscape:w-7/12 relative">
                        
                        {/* Header: Teacher Identity */}
                        <div className="mb-6 pr-12"> {/* pr-12 to avoid 'X' button overlap */}
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1.5 block">Diselenggarakan Oleh</span>
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <UserIcon className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{teacherName || 'Pengajar Terdaftar'}</span>
                            </div>
                        </div>

                        {/* Title Row: Subject & Badge (Sejajar) */}
                        <div className="mb-10 flex flex-wrap items-center gap-3 pr-12">
                            <h2 className="text-3xl landscape:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                                {exam ? exam.config.subject : 'Evaluasi Belajar'}
                            </h2>
                            {exam && (
                                <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg ${getExamTypeBadge(exam.config.examType)} ring-2 ring-white dark:ring-slate-800`}>
                                    {exam.config.examType}
                                </span>
                            )}
                        </div>

                        {/* Middle: Target Classes if any */}
                        {exam?.config.targetClasses && exam.config.targetClasses.length > 0 && (
                            <div className="mb-8">
                                <div className="flex flex-wrap gap-2">
                                    {exam.config.targetClasses.map(c => (
                                        <span key={c} className="px-3 py-1 bg-slate-50 dark:bg-indigo-900/20 text-slate-500 dark:text-indigo-300 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-indigo-800 uppercase tracking-tighter">
                                            {c}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Body: Countdown Widget */}
                        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-700 mb-10 flex flex-col items-center text-center shadow-inner">
                            {isStarted ? (
                                <div className="animate-pulse flex flex-col items-center py-2">
                                    <div className="w-4 h-4 bg-emerald-500 rounded-full mb-3 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-[0.2em] text-sm">Ujian Telah Dimulai!</span>
                                    <p className="text-[10px] text-slate-400 mt-2 font-medium">Silakan masuk ke ruang ujian sekarang.</p>
                                </div>
                            ) : timeLeft ? (
                                <>
                                    <div className="flex items-center gap-2 mb-5">
                                        <ClockIcon className="w-4 h-4 text-indigo-500" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Hitung Mundur Mulai</span>
                                    </div>
                                    <div className="flex items-center gap-4 font-code text-3xl landscape:text-4xl font-bold text-slate-800 dark:text-white">
                                        <div className="flex flex-col items-center">
                                            <span className="tabular-nums">{timeLeft.d.toString().padStart(2,'0')}</span>
                                            <span className="text-[8px] uppercase tracking-widest text-slate-400 mt-1">Hari</span>
                                        </div>
                                        <span className="mb-5 opacity-20">:</span>
                                        <div className="flex flex-col items-center">
                                            <span className="tabular-nums">{timeLeft.h.toString().padStart(2,'0')}</span>
                                            <span className="text-[8px] uppercase tracking-widest text-slate-400 mt-1">Jam</span>
                                        </div>
                                        <span className="mb-5 opacity-20">:</span>
                                        <div className="flex flex-col items-center">
                                            <span className="tabular-nums">{timeLeft.m.toString().padStart(2,'0')}</span>
                                            <span className="text-[8px] uppercase tracking-widest text-slate-400 mt-1">Menit</span>
                                        </div>
                                        <span className="mb-5 opacity-20 text-indigo-500">:</span>
                                        <div className="flex flex-col items-center text-indigo-600 dark:text-indigo-400">
                                            <span className="tabular-nums">{timeLeft.s.toString().padStart(2,'0')}</span>
                                            <span className="text-[8px] uppercase tracking-widest opacity-60 mt-1">Detik</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="py-4 text-xs font-bold text-slate-400 animate-pulse tracking-widest uppercase">Menyiapkan Waktu...</div>
                            )}
                        </div>

                        {/* Footer: Action Buttons */}
                        <div className="mt-auto space-y-4">
                            <div className="flex items-center gap-3 bg-white dark:bg-slate-950 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                <div className="flex-1 px-4 py-1.5 overflow-hidden">
                                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Direct Access URL</p>
                                    <p className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 truncate">{joinUrl.replace(/^https?:\/\//, '')}</p>
                                </div>
                                <button 
                                    onClick={() => { navigator.clipboard.writeText(joinUrl); alert("Link pengerjaan berhasil disalin!"); }} 
                                    className="p-3.5 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 transition-all no-print shadow-sm active:scale-95"
                                    title="Copy Link"
                                >
                                    <QrCodeIcon className="w-5 h-5"/>
                                </button>
                            </div>

                            <button 
                                onClick={handlePrint}
                                className="w-full py-4.5 bg-slate-900 dark:bg-indigo-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-2xl hover:shadow-indigo-500/20 hover:-translate-y-0.5 transition-all no-print flex items-center justify-center gap-3 active:scale-[0.98]"
                            >
                                <PrinterIcon className="w-5 h-5 opacity-80" />
                                Cetak Kartu Undangan
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
