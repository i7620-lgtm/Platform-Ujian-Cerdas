import React, { useState } from 'react';
import type { Exam, Result } from '../../../types';
import { ClockIcon, QrCodeIcon, ShareIcon, DocumentDuplicateIcon, XMarkIcon } from '../../Icons';
import { RemainingTime, MetaBadge } from './SharedComponents';

export const OngoingExamsView: React.FC<{ exams: Exam[]; results: Result[]; onSelectExam: (exam: Exam) => void; onDuplicateExam: (exam: Exam) => void; }> = ({ exams, results, onSelectExam, onDuplicateExam }) => {
    const [joinQrExam, setJoinQrExam] = useState<Exam | null>(null);

    return (
        <div className="space-y-6 animate-fade-in"><div className="flex items-center gap-2"><div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg"><ClockIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /></div><div><h2 className="text-2xl font-bold text-neutral dark:text-white">Ujian Sedang Berlangsung</h2><p className="text-sm text-gray-500 dark:text-slate-400">Pantau kemajuan ujian yang sedang berjalan secara real-time.</p></div></div>
            {exams.length > 0 ? (<div className="grid grid-cols-1 md:grid-cols-2 gap-6">{exams.map(exam => { const activeCount = results.filter(r => r.examCode === exam.code).length; return (<div key={exam.code} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-900 shadow-sm hover:shadow-xl hover:shadow-emerald-50 dark:hover:shadow-emerald-900/10 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-300 relative group cursor-pointer" onClick={() => onSelectExam(exam)}>
            
            {/* ACTION BUTTONS */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setJoinQrExam(exam); }}
                    className="p-2 bg-white dark:bg-slate-700 text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg border border-slate-100 dark:border-slate-600 hover:border-emerald-100 dark:hover:border-emerald-800 transition-all shadow-sm"
                    title="QR Code Gabung Siswa"
                >
                    <QrCodeIcon className="w-4 h-4" />
                </button>
                {exam.config.enablePublicStream && (
                    <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); const url = `${window.location.origin}/?live=${exam.code}`; navigator.clipboard.writeText(url); alert("Link Pantauan Orang Tua disalin!"); }} 
                        className="p-2 bg-white dark:bg-slate-700 text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg border border-slate-100 dark:border-slate-600 hover:border-indigo-100 dark:hover:border-indigo-800 transition-all shadow-sm" 
                        title="Bagikan Link Pantauan"
                    >
                        <ShareIcon className="w-4 h-4" />
                    </button>
                )}
                <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); onDuplicateExam(exam); }} 
                    className="p-2 bg-white dark:bg-slate-700 text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-600 hover:text-primary dark:hover:text-white rounded-lg border border-slate-100 dark:border-slate-600 hover:border-gray-200 dark:hover:border-slate-500 transition-all shadow-sm" 
                    title="Gunakan Kembali Soal"
                >
                    <DocumentDuplicateIcon className="w-4 h-4" />
                </button>
            </div>

            <div className="flex justify-between items-start mb-2"><div className="flex flex-col"><span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md w-fit mb-2 flex items-center gap-1.5"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>Sedang Berlangsung</span><h3 className="font-bold text-xl text-neutral dark:text-white">{exam.config.subject || exam.code}</h3><p className="text-sm font-mono text-gray-400 dark:text-slate-500 mt-0.5">{exam.code}</p></div></div><div className="flex flex-wrap gap-2 mt-3 mb-5"><MetaBadge text={exam.config.classLevel} colorClass="bg-gray-100 text-gray-600" /><MetaBadge text={exam.config.examType} colorClass="bg-gray-100 text-gray-600" />{exam.config.targetClasses && exam.config.targetClasses.length > 0 && <MetaBadge text={exam.config.targetClasses.join(', ')} colorClass="bg-orange-50 text-orange-700 border-orange-100" />}</div><div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 border border-gray-100 dark:border-slate-700 flex items-center justify-between"><div className="flex flex-col"><span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider">Partisipan</span><div className="flex items-center gap-2 mt-1"><div className="flex -space-x-2">{[...Array(Math.min(3, activeCount))].map((_, i) => (<div key={i} className="w-6 h-6 rounded-full bg-emerald-200 dark:bg-emerald-800 border-2 border-white dark:border-slate-700"></div>))}</div><span className="text-sm font-bold text-gray-700 dark:text-slate-300">{activeCount} Siswa</span></div></div><div className="text-right"><span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider">Sisa Waktu</span><div className="mt-1"><RemainingTime exam={exam} /></div></div></div></div>)})}</div>) : (<div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700"><div className="bg-gray-50 dark:bg-slate-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><ClockIcon className="h-8 w-8 text-gray-300 dark:text-slate-500" /></div><h3 className="text-base font-bold text-gray-900 dark:text-white">Tidak Ada Ujian Aktif</h3><p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Saat ini tidak ada ujian yang sedang berlangsung.</p></div>)}
            
            {/* Modal QR Code Join */}
            {joinQrExam && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[70] animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-8 text-center animate-slide-in-up border border-white dark:border-slate-700 relative">
                        <button onClick={() => setJoinQrExam(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full transition-colors"><XMarkIcon className="w-5 h-5"/></button>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white tracking-tight">Gabung Ujian</h3>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-lg mb-6 inline-block mx-auto relative group">
                            <div className="absolute -inset-1 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-3xl opacity-20 blur group-hover:opacity-30 transition-opacity"></div>
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/?join=${joinQrExam.code}`)}&margin=10`} alt="QR Join" className="w-48 h-48 object-contain relative bg-white rounded-xl"/>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-6 leading-relaxed px-2">
                            Minta siswa memindai kode ini untuk langsung masuk ke halaman login dengan kode ujian terisi.
                        </p>
                        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Kode Ujian</p>
                            <p className="text-xl font-mono font-black text-slate-800 dark:text-white tracking-widest">{joinQrExam.code}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
