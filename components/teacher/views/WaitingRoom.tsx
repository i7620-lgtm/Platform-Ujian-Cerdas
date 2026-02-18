
import React, { useState, useEffect } from 'react';
import type { Exam } from '../types';
import { ClockIcon, LogoIcon, UserIcon, CalendarDaysIcon, ArrowLeftIcon } from './Icons';

interface WaitingRoomProps {
    exam: Exam;
    onJoin: () => void;
    onBack: () => void;
}

export const WaitingRoom: React.FC<WaitingRoomProps> = ({ exam, onJoin, onBack }) => {
    const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null);
    const [status, setStatus] = useState<'WAITING' | 'READY'>('WAITING');

    useEffect(() => {
        const tick = () => {
            const dateStr = exam.config.date.includes('T') ? exam.config.date.split('T')[0] : exam.config.date;
            // Ensure time format HH:mm:ss for consistency
            const timeStr = exam.config.startTime.length === 5 ? `${exam.config.startTime}:00` : exam.config.startTime;
            
            const targetDate = new Date(`${dateStr}T${timeStr}`).getTime();
            const now = new Date().getTime();
            const diff = targetDate - now;

            if (diff <= 0) {
                setStatus('READY');
                setTimeLeft(null);
                // Auto redirect when time is up
                setTimeout(() => {
                    onJoin();
                }, 1500); 
            } else {
                setStatus('WAITING');
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
    }, [exam, onJoin]);

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans transition-colors duration-300">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-indigo-100/50 dark:bg-indigo-900/20 rounded-full blur-[80px]"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-100/50 dark:bg-blue-900/20 rounded-full blur-[80px]"></div>

            <button 
                onClick={onBack} 
                className="absolute top-6 left-6 z-20 flex items-center gap-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-bold uppercase tracking-widest transition-colors"
            >
                <ArrowLeftIcon className="w-4 h-4" /> Kembali
            </button>

            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none border border-white dark:border-slate-800 relative z-10 overflow-hidden animate-gentle-slide">
                {/* Header Gradient */}
                <div className={`h-2 w-full ${status === 'READY' ? 'bg-emerald-500' : 'bg-indigo-500'} transition-colors duration-500`}></div>

                <div className="p-8 sm:p-10 text-center">
                    {/* Icon */}
                    <div className="flex justify-center mb-8">
                        <div className={`p-5 rounded-3xl ${status === 'READY' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'} transition-colors duration-500 ring-4 ${status === 'READY' ? 'ring-emerald-50/50 dark:ring-emerald-900/20' : 'ring-indigo-50/50 dark:ring-indigo-900/20'}`}>
                            {status === 'READY' ? <ClockIcon className="w-10 h-10 animate-bounce" /> : <CalendarDaysIcon className="w-10 h-10" />}
                        </div>
                    </div>

                    {/* Content */}
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                        {status === 'READY' ? 'Ujian Dimulai!' : 'Ujian Terjadwal'}
                    </h1>
                    
                    <div className="flex items-center justify-center gap-2 mb-8 opacity-80">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{exam.authorName || 'Pengajar'} • {exam.authorSchool || 'Sekolah'}</span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 mb-8">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-1 line-clamp-2">{exam.config.subject}</h2>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-mono tracking-widest uppercase">{exam.code}</p>
                    </div>

                    {/* Countdown */}
                    {status === 'WAITING' && timeLeft ? (
                        <div className="grid grid-cols-4 gap-3 mb-8">
                            {[
                                { val: timeLeft.d, label: 'Hari' },
                                { val: timeLeft.h, label: 'Jam' },
                                { val: timeLeft.m, label: 'Menit' },
                                { val: timeLeft.s, label: 'Detik' }
                            ].map((t, i) => (
                                <div key={i} className="flex flex-col items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <span className="text-xl font-black text-slate-800 dark:text-white tabular-nums leading-none mb-1">
                                        {t.val.toString().padStart(2, '0')}
                                    </span>
                                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">{t.label}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-4 mb-4">
                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 animate-pulse">Mengalihkan ke halaman login...</p>
                        </div>
                    )}

                    {/* Action */}
                    {status === 'WAITING' ? (
                        <button disabled className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold rounded-2xl cursor-not-allowed text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                            <ClockIcon className="w-4 h-4"/> Belum Dimulai
                        </button>
                    ) : (
                        <button onClick={onJoin} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 transition-all active:scale-95 text-xs uppercase tracking-widest">
                            Masuk Sekarang
                        </button>
                    )}
                </div>
            </div>
            
            <div className="mt-8 text-center opacity-60">
                <div className="flex items-center gap-2 justify-center mb-1">
                    <LogoIcon className="w-5 h-5 text-slate-400" />
                    <span className="font-bold text-slate-500 dark:text-slate-400 text-sm">UjianCerdas</span>
                </div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Menunggu Jadwal Pelaksanaan</p>
            </div>
        </div>
    );
};
