import React, { useState, useEffect } from 'react';
import { CalendarDaysIcon, ClockIcon, UserIcon, ArrowLeftIcon, LogoIcon, CheckCircleIcon } from './Icons';
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
    const [isChecking, setIsChecking] = useState(true);
    const [isStarted, setIsStarted] = useState(false);

    useEffect(() => {
        const calculateTime = () => {
            const targetDate = parseSchedule(exam.config.date, exam.config.startTime).getTime();
            const now = new Date().getTime();
            const diff = targetDate - now;

            if (!isNaN(targetDate) && diff <= 0) {
                // Time passed, show enter button
                setIsStarted(true);
                setIsChecking(false);
            } else {
                setIsStarted(false);
                setTimeLeft({
                    d: Math.floor(diff / (1000 * 60 * 60 * 24)),
                    h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                    m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                    s: Math.floor((diff % (1000 * 60)) / 1000)
                });
                setIsChecking(false);
            }
        };

        calculateTime();
        const timer = setInterval(calculateTime, 1000);

        return () => clearInterval(timer);
    }, [exam]);

    if (isChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-slate-950">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans text-slate-800 dark:text-slate-200">
            {/* Background Decoration */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-100 dark:bg-indigo-900/20 rounded-full blur-[100px] opacity-60"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-100 dark:bg-blue-900/20 rounded-full blur-[100px] opacity-60"></div>
            </div>

            <div className="max-w-md w-full relative z-10 animate-fade-in">
                <button 
                    onClick={onBack}
                    className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold mb-8 transition-colors group"
                >
                    <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Kembali
                </button>

                <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                    {/* Header Image / Gradient */}
                    <div className="h-32 bg-gradient-to-br from-indigo-600 to-purple-600 relative flex items-center justify-center">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/20 shadow-lg">
                            <ClockIcon className="w-10 h-10 text-white" />
                        </div>
                    </div>

                    <div className="p-8 text-center -mt-6 relative z-10">
                        <div className="inline-block px-4 py-1.5 bg-white dark:bg-slate-800 rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-100 dark:border-slate-700 mb-4">
                            Ujian Terjadwal
                        </div>

                        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2 leading-tight">
                            {exam.config.subject || 'Ujian Tanpa Judul'}
                        </h1>
                        
                        <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-medium mb-8">
                            <UserIcon className="w-4 h-4" />
                            <span>{exam.authorName || 'Pengajar'}</span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full mx-1"></span>
                            <span>{exam.authorSchool || 'Sekolah'}</span>
                        </div>

                        {/* Dynamic Content based on State */}
                        {isStarted ? (
                            <div className="animate-fade-in">
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800 mb-6 flex flex-col items-center">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="relative flex h-3 w-3">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                        </span>
                                        <span className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Sedang Berlangsung</span>
                                    </div>
                                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Waktu ujian telah dimulai.</p>
                                </div>

                                <button 
                                    onClick={onEnter}
                                    className="w-full py-4 bg-slate-900 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl hover:shadow-indigo-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
                                >
                                    <span>Masuk Ruang Ujian</span>
                                    <CheckCircleIcon className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                                </button>
                            </div>
                        ) : (
                            <div className="animate-fade-in">
                                <div className="grid grid-cols-4 gap-3 mb-8">
                                    {[
                                        { val: timeLeft?.d, label: 'Hari' },
                                        { val: timeLeft?.h, label: 'Jam' },
                                        { val: timeLeft?.m, label: 'Menit' },
                                        { val: timeLeft?.s, label: 'Detik' }
                                    ].map((item, idx) => (
                                        <div key={idx} className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 rounded-2xl flex flex-col items-center justify-center">
                                            <span className="text-2xl font-black text-slate-800 dark:text-white tabular-nums leading-none mb-1">
                                                {String(item.val || 0).padStart(2, '0')}
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                {item.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-4">
                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800 flex items-center gap-4 text-left">
                                        <div className="bg-white dark:bg-slate-800 p-2 rounded-xl text-indigo-600 dark:text-indigo-400 shadow-sm">
                                            <CalendarDaysIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-indigo-400 dark:text-indigo-300 uppercase tracking-widest">Jadwal Dimulai</p>
                                            <p className="font-bold text-slate-800 dark:text-white">
                                                {new Date(exam.config.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                            </p>
                                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                                Pukul {exam.config.startTime}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-xs text-slate-400 dark:text-slate-500 text-center leading-relaxed px-4">
                                        Halaman ini akan otomatis memuat formulir login saat waktu hitung mundur selesai.
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="mt-8 text-center opacity-60">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <LogoIcon className="w-5 h-5 text-slate-400" />
                        <span className="font-bold text-slate-500 tracking-tight">UjianCerdas</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
