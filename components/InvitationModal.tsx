
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
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in print:p-0 print:bg-white print:static">
            <style>{`
                @media print {
                    @page { margin: 0; size: auto; }
                    body * { visibility: hidden; }
                    #invitation-card, #invitation-card * { visibility: visible; }
                    #invitation-card {
                        position: absolute;
                        left: 50%;
                        top: 50%;
                        transform: translate(-50%, -50%);
                        width: 100%;
                        max-width: 500px;
                        border: none;
                        box-shadow: none;
                    }
                    .no-print { display: none !important; }
                }
            `}</style>

            <div id="invitation-card" className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 relative animate-slide-in-up print:dark:bg-white print:dark:border-slate-200">
                {/* Header Decoration */}
                <div className="h-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-50 dark:bg-slate-700 hover:bg-rose-50 hover:text-rose-500 text-slate-400 rounded-full transition-colors no-print">
                    <XMarkIcon className="w-5 h-5"/>
                </button>

                <div className="p-8 text-center">
                    {/* Logo Area */}
                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl print:bg-indigo-50">
                            <LogoIcon className="w-12 h-12 text-indigo-600 dark:text-indigo-400 print:text-indigo-600" />
                        </div>
                    </div>

                    {/* Titles */}
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight print:text-slate-900">
                        {teacherName ? 'Undangan Akses Ujian' : 'Akses UjianCerdas'}
                    </h2>
                    
                    {teacherName ? (
                        <div className="mb-6 space-y-1">
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 print:text-slate-600">Dikirim oleh:</p>
                            <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 print:text-indigo-700">{teacherName}</p>
                            {schoolName && <p className="text-xs font-bold uppercase tracking-widest text-slate-400 print:text-slate-500">{schoolName}</p>}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 print:text-slate-600">
                            Pindai kode di bawah untuk mengakses platform ujian online kami yang modern dan hemat kuota.
                        </p>
                    )}

                    {/* QR Code Container */}
                    <div className="relative inline-block group cursor-pointer mb-6">
                        <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500 to-pink-500 rounded-2xl opacity-20 blur group-hover:opacity-40 transition-opacity"></div>
                        <div className="relative bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                            <img src={qrUrl} alt="QR Code Undangan" className="w-48 h-48 object-contain rounded-lg" />
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 mb-6 print:bg-slate-50 print:border-slate-200">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Alamat Website</p>
                        <p className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400 break-all print:text-indigo-700">
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
                </div>
            </div>
        </div>
    );
};
