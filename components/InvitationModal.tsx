
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
                        display: flex !important;
                        flex-direction: column !important;
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
                    }
                    .no-print { 
                        display: none !important; 
                    }
                    .print-pane-visual {
                        width: 100% !important;
                        border-right: none !important;
                        border-bottom: 1px solid #e2e8f0 !important;
                        background-color: white !important;
                    }
                    .print-pane-info {
                        width: 100% !important;
                    }
                    .print-gradient {
                        width: 100% !important;
                        height: 12px !important;
                    }
                    /* Force colors for print */
                    .print-bg-indigo-50 { background-color: #eef2ff !important; }
                    .print-text-indigo-600 { color: #4f46e5 !important; }
                    .print-text-slate-900 { color: #0f172a !important; }
                    .print-text-slate-500 { color: #64748b !important; }
                    .print-gradient-bg { background: linear-gradient(to right, #6366f1, #a855f7, #ec4899) !important; }
                }
            `}</style>

            {/* Wrapper div for print targeting */}
            <div className="print-container w-full h-full flex items-center justify-center">
                <div id="invitation-card" className="bg-white dark:bg-slate-800 w-full rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 relative animate-slide-in-up flex flex-col landscape:flex-row landscape:max-w-4xl max-w-md landscape:max-h-[90vh] max-h-[90vh] landscape:items-stretch">
                    
                    {/* Header Decoration: Horizontal on Portrait, Vertical on Landscape */}
                    <div className="h-3 w-full landscape:w-3 landscape:h-auto bg-gradient-to-r landscape:bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500 print-gradient-bg shrink-0 print-gradient"></div>
                    
                    <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-slate-50 dark:bg-slate-700 hover:bg-rose-50 hover:text-rose-500 text-slate-400 rounded-full transition-colors no-print shadow-sm border border-slate-100 dark:border-slate-600">
                        <XMarkIcon className="w-5 h-5"/>
                    </button>

                    {/* Left Pane: Visuals (QR & Logo) */}
                    <div className="p-6 md:p-8 flex flex-col items-center justify-center landscape:w-5/12 landscape:bg-slate-50/50 landscape:dark:bg-slate-800/50 landscape:border-r border-slate-100 dark:border-slate-700 print-pane-visual">
                         {/* Logo */}
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl mb-6 print-bg-indigo-50 shadow-sm">
                            <LogoIcon className="w-10 h-10 text-indigo-600 dark:text-indigo-400 print-text-indigo-600" />
                        </div>
                        
                        {/* QR Code */}
                        <div className="relative inline-block group cursor-pointer">
                            <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500 to-pink-500 rounded-2xl opacity-20 blur group-hover:opacity-40 transition-opacity no-print"></div>
                            <div className="relative bg-white p-2 rounded-xl border border-slate-100 shadow-sm print:border-0 print:shadow-none">
                                <img src={qrUrl} alt="QR Code" className="w-40 h-40 object-contain rounded-lg" />
                            </div>
                        </div>
                    </div>

                    {/* Right Pane: Info & Actions */}
                    <div className="p-6 md:p-8 flex flex-col justify-center text-center landscape:w-7/12 print-pane-info">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight print-text-slate-900">
                            {teacherName ? 'Undangan Akses' : 'Akses Ujian'}
                        </h2>
                        
                        {teacherName ? (
                            <div className="mb-4 space-y-0.5">
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 print-text-slate-500">Dikirim oleh</p>
                                <p className="text-base font-bold text-indigo-600 dark:text-indigo-400 print-text-indigo-600">{teacherName}</p>
                                {schoolName && <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 print-text-slate-500">{schoolName}</p>}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 print-text-slate-500 max-w-xs mx-auto">
                                Pindai kode di samping untuk mengakses ujian dengan cepat dan hemat kuota.
                            </p>
                        )}

                        <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 mb-5 print-bg-indigo-50 print:border-0">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 print-text-slate-500">Link Akses</p>
                            <p className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 break-all print-text-indigo-600 line-clamp-1">
                                {currentUrl.replace(/^https?:\/\//, '')}
                            </p>
                        </div>

                        <button 
                            onClick={handlePrint}
                            className="w-full py-3 bg-slate-900 dark:bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 no-print active:scale-[0.98] text-sm"
                        >
                            <PrinterIcon className="w-4 h-4" />
                            Cetak Kartu
                        </button>
                        
                        <div className="hidden print:block mt-4 text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                            Dicetak dari UjianCerdas
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
