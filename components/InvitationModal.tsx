
import React from 'react';
import { XMarkIcon, PrinterIcon, LogoIcon } from './Icons';

interface InvitationModalProps {
    isOpen: boolean;
    onClose: () => void;
    teacherName?: string;
    schoolName?: string;
}

export const InvitationModal: React.FC<InvitationModalProps> = ({ isOpen, onClose, teacherName, schoolName }) => {
    if (!isOpen) return null;

    const currentUrl = window.location.origin;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(currentUrl)}&margin=10`;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
            <style>{`
                @media print {
                    @page { 
                        margin: 0; 
                        size: auto; 
                    }
                    body {
                        background-color: white !important;
                    }
                    body * { 
                        visibility: hidden; 
                    }
                    .print-container, .print-container * { 
                        visibility: visible !important; 
                    }
                    .print-container {
                        position: fixed;
                        left: 0;
                        top: 0;
                        width: 100vw;
                        height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background-color: white;
                        z-index: 9999;
                    }
                    #invitation-card {
                        width: 400px !important;
                        max-width: 90% !important;
                        border: 2px solid #e2e8f0 !important;
                        box-shadow: none !important;
                        border-radius: 24px !important;
                        overflow: hidden;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        background-color: white !important;
                        color: black !important;
                        display: block !important;
                        height: auto !important;
                    }
                    .no-print { 
                        display: none !important; 
                    }
                    /* Force colors for print */
                    .print-bg-indigo-50 { background-color: #eef2ff !important; }
                    .print-text-indigo-600 { color: #4f46e5 !important; }
                    .print-text-slate-900 { color: #0f172a !important; }
                    .print-text-slate-500 { color: #64748b !important; }
                    .print-gradient { background: linear-gradient(to right, #6366f1, #a855f7, #ec4899) !important; }
                }
            `}</style>

            {/* Wrapper div for print targeting */}
            <div className="print-container w-full flex justify-center max-h-full">
                <div id="invitation-card" className="bg-white dark:bg-slate-800 w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 relative animate-slide-in-up">
                    {/* Header Decoration */}
                    <div className="h-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 print-gradient shrink-0"></div>
                    
                    <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-slate-50 dark:bg-slate-700 hover:bg-rose-50 hover:text-rose-500 text-slate-400 rounded-full transition-colors no-print">
                        <XMarkIcon className="w-5 h-5"/>
                    </button>

                    <div className="p-8 text-center overflow-y-auto custom-scrollbar">
                        {/* Logo Area */}
                        <div className="flex justify-center mb-6">
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl print-bg-indigo-50">
                                <LogoIcon className="w-12 h-12 text-indigo-600 dark:text-indigo-400 print-text-indigo-600" />
                            </div>
                        </div>

                        {/* Titles */}
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight print-text-slate-900">
                            {teacherName ? 'Undangan Akses Ujian' : 'Akses UjianCerdas'}
                        </h2>
                        
                        {teacherName ? (
                            <div className="mb-6 space-y-1">
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 print-text-slate-500">Dikirim oleh:</p>
                                <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 print-text-indigo-600">{teacherName}</p>
                                {schoolName && <p className="text-xs font-bold uppercase tracking-widest text-slate-400 print-text-slate-500">{schoolName}</p>}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 print-text-slate-500">
                                Pindai kode di bawah untuk mengakses platform ujian online kami yang modern dan hemat kuota.
                            </p>
                        )}

                        {/* QR Code Container */}
                        <div className="relative inline-block group cursor-pointer mb-6">
                            <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500 to-pink-500 rounded-2xl opacity-20 blur group-hover:opacity-40 transition-opacity no-print"></div>
                            <div className="relative bg-white p-2 rounded-xl border border-slate-100 shadow-sm print:border-0 print:shadow-none">
                                <img src={qrUrl} alt="QR Code Undangan" className="w-48 h-48 object-contain rounded-lg" />
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 mb-6 print-bg-indigo-50 print:border-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 print-text-slate-500">Alamat Website</p>
                            <p className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400 break-all print-text-indigo-600">
                                {currentUrl.replace(/^https?:\/\//, '')}
                            </p>
                        </div>

                        <button 
                            onClick={handlePrint}
                            className="w-full py-3.5 bg-slate-900 dark:bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 no-print active:scale-[0.98]"
                        >
                            <PrinterIcon className="w-5 h-5" />
                            Cetak Kartu Undangan
                        </button>
                        
                        {/* Footer for print only */}
                        <div className="hidden print:block mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            Dicetak dari UjianCerdas
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
