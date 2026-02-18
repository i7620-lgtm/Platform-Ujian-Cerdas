
import React, { useState, useEffect, useMemo } from 'react';
import { XMarkIcon, PrinterIcon, LogoIcon, ClockIcon, UserIcon, AcademicCapIcon, QrCodeIcon } from './Icons';
import type { Exam } from '../types';

interface InvitationModalProps {
    isOpen: boolean;
    onClose: () => void;
    teacherName?: string;
    schoolName?: string;
    exam?: Exam | null; // Tambahan prop untuk data ujian spesifik
}

export const InvitationModal: React.FC<InvitationModalProps> = ({ isOpen, onClose, teacherName, schoolName, exam }) => {
    const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null);
    const [isStarted, setIsStarted] = useState(false);

    // Link Join (Dinamis jika ada exam code)
    const currentUrl = window.location.origin;
    const joinUrl = exam ? `${currentUrl}/?join=${exam.code}` : currentUrl;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}&margin=10`;

    // Logika Hitung Mundur
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

    // Badge Warna berdasarkan Jenis Evaluasi
    const getExamTypeBadge = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes('pas') || t.includes('akhir')) return 'bg-indigo-600 text-white';
        if (t.includes('harian') || t.includes('pts')) return 'bg-amber-500 text-white';
        return 'bg-blue-500 text-white';
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
            <style>{`
                @media print {
                    @page { margin: 0; size: auto; }
                    body * { visibility: hidden; }
                    .print-container, .print-container * { visibility: visible !important; }
                    .print-container { position: fixed; left: 0; top: 0; width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; background: white; z-index: 9999; }
                    #invitation-card { width: 600px !important; border: 1px solid #e2e8f0 !important; box-shadow: none !important; border-radius: 24px !important; overflow: hidden; background: white !important; color: black !important; }
                    .no-print { display: none !important; }
                }
            `}</style>

            <div className="print-container w-full h-full flex items-center justify-center pointer-events-none">
                <div id="invitation-card" className="bg-white dark:bg-slate-900 w-full max-w-md landscape:max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 dark:border-slate-800 relative animate-slide-in-up flex flex-col landscape:flex-row pointer-events-auto">
                    
                    {/* Decorative Gradient Bar */}
                    <div className="h-2.5 w-full landscape:w-2.5 landscape:h-auto bg-gradient-to-r landscape:bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500 shrink-0"></div>
                    
                    <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-400 rounded-full transition-all no-print border border-transparent shadow-sm">
                        <XMarkIcon className="w-5 h-5"/>
                    </button>

                    {/* Left/Top Section: QR & Logo */}
                    <div className="p-8 flex flex-col items-center justify-center landscape:w-5/12 bg-slate-50/50 dark:bg-slate-800/30 border-b landscape:border-b-0 landscape:border-r border-slate-100 dark:border-slate-800">
                        <div className="p-4 bg-white dark:bg-slate-800 rounded-3xl shadow-sm mb-8">
                            <LogoIcon className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        
                        <div className="relative group">
                            <div className="absolute -inset-2 bg-gradient-to-tr from-indigo-500 to-pink-500 rounded-3xl opacity-10 blur group-hover:opacity-20 transition-opacity no-print"></div>
                            <div className="relative bg-white p-3 rounded-2xl shadow-lg border border-slate-100">
                                <img src={qrUrl} alt="Join QR" className="w-40 h-40 landscape:w-48 landscape:h-48 object-contain" />
                            </div>
                            <div className="mt-4 text-center">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Scan untuk Gabung</span>
                            </div>
                        </div>
                    </div>

                    {/* Right/Bottom Section: Info */}
                    <div className="p-8 flex flex-col landscape:w-7/12">
                        {/* Header Info */}
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Penyelenggara</span>
                                <div className="flex items-center gap-2">
                                    <UserIcon className="w-3.5 h-3.5 text-indigo-500" />
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{teacherName || 'Pengajar Terdaftar'}</span>
                                </div>
                            </div>
                            {exam && (
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide shadow-sm ${getExamTypeBadge(exam.config.examType)}`}>
                                    {exam.config.examType}
                                </span>
                            )}
                        </div>

                        {/* Title & Target */}
                        <div className="mb-8">
                            <h2 className="text-2xl landscape:text-3xl font-black text-slate-900 dark:text-white leading-tight mb-2">
                                {exam ? exam.config.subject : 'Evaluasi Belajar'}
                            </h2>
                            {exam?.config.targetClasses && exam.config.targetClasses.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                    {exam.config.targetClasses.map(c => (
                                        <span key={c} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-md border border-indigo-100 dark:border-indigo-800">
                                            {c}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Countdown Widget */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 mb-8 flex flex-col items-center text-center">
                            {isStarted ? (
                                <div className="animate-pulse flex flex-col items-center">
                                    <div className="w-3 h-3 bg-emerald-500 rounded-full mb-2"></div>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest text-xs">Ujian Telah Dimulai!</span>
                                    <p className="text-[10px] text-slate-400 mt-1">Silakan masuk ke ruang ujian sekarang.</p>
                                </div>
                            ) : timeLeft ? (
                                <>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-2">
                                        <ClockIcon className="w-3.5 h-3.5" /> Hitung Mundur Mulai
                                    </span>
                                    <div className="flex items-center gap-3 font-code text-2xl landscape:text-3xl font-bold text-slate-800 dark:text-white">
                                        <div className="flex flex-col items-center">
                                            <span>{timeLeft.d.toString().padStart(2,'0')}</span>
                                            <span className="text-[8px] uppercase tracking-tighter text-slate-400">Hari</span>
                                        </div>
                                        <span className="mb-4 opacity-30">:</span>
                                        <div className="flex flex-col items-center">
                                            <span>{timeLeft.h.toString().padStart(2,'0')}</span>
                                            <span className="text-[8px] uppercase tracking-tighter text-slate-400">Jam</span>
                                        </div>
                                        <span className="mb-4 opacity-30">:</span>
                                        <div className="flex flex-col items-center">
                                            <span>{timeLeft.m.toString().padStart(2,'0')}</span>
                                            <span className="text-[8px] uppercase tracking-tighter text-slate-400">Menit</span>
                                        </div>
                                        <span className="mb-4 opacity-30 text-indigo-500">:</span>
                                        <div className="flex flex-col items-center text-indigo-500">
                                            <span>{timeLeft.s.toString().padStart(2,'0')}</span>
                                            <span className="text-[8px] uppercase tracking-tighter opacity-70">Detik</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <span className="text-xs font-bold text-slate-400">Menyiapkan waktu...</span>
                            )}
                        </div>

                        {/* Link & Actions */}
                        <div className="mt-auto space-y-4">
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-950 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
                                <div className="flex-1 px-3 py-1 overflow-hidden">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Link Pengerjaan</p>
                                    <p className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 truncate">{joinUrl.replace(/^https?:\/\//, '')}</p>
                                </div>
                                <button onClick={() => { navigator.clipboard.writeText(joinUrl); alert("Link disalin!"); }} className="p-3 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 transition-colors no-print">
                                    <QrCodeIcon className="w-5 h-5"/>
                                </button>
                            </div>

                            <button 
                                onClick={handlePrint}
                                className="w-full py-4 bg-slate-900 dark:bg-indigo-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl hover:shadow-indigo-500/20 hover:-translate-y-0.5 transition-all no-print flex items-center justify-center gap-3 active:scale-[0.98]"
                            >
                                <PrinterIcon className="w-5 h-5" />
                                Cetak Kartu Undangan
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
