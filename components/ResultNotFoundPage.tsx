
import React from 'react';
import { ArrowLeftIcon, BookOpenIcon, UserIcon } from './Icons';

interface ResultNotFoundPageProps {
  onBack: () => void;
}

export const ResultNotFoundPage: React.FC<ResultNotFoundPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-300">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 text-center animate-fade-in">
        <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-indigo-50/50 dark:ring-indigo-900/10">
          <BookOpenIcon className="w-10 h-10" />
        </div>
        
        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
          Halaman Tidak Ditemukan
        </h1>
        
        <div className="space-y-4 text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-8">
          <p>
            Halo, Siswa Hebat! Sepertinya link atau QR Code yang kamu akses saat ini sudah tidak aktif lagi di sistem utama.
          </p>
          
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-left">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
              Mengapa hal ini terjadi?
            </h3>
            <ul className="list-disc list-inside space-y-1 ml-1">
              <li>Data ujian mungkin telah diarsipkan oleh Bapak/Ibu Guru.</li>
              <li>Ada pembaruan data identitas (nama/kelas) di sistem.</li>
              <li>Ujian telah dihapus untuk persiapan sesi baru.</li>
            </ul>
          </div>

          <p className="font-medium text-indigo-600 dark:text-indigo-400">
            Jangan khawatir! Hasil perjuanganmu tidak hilang.
          </p>
          
          <p>
            Seluruh rekapan nilai dan jawabanmu kini telah disimpan dengan aman oleh <strong>Bapak/Ibu Guru</strong> atau <strong>Pihak Sekolah</strong> dalam bentuk arsip laporan resmi.
          </p>
          
          <div className="flex items-start gap-3 text-left bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
            <div className="mt-0.5 text-emerald-500">
              <UserIcon className="w-5 h-5" />
            </div>
            <p className="text-emerald-700 dark:text-emerald-400 font-medium">
              Silakan hubungi Bapak/Ibu Guru pengampu mata pelajaran untuk mendapatkan salinan nilai atau sertifikat hasil ujianmu.
            </p>
          </div>
        </div>

        <button 
          onClick={onBack}
          className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-black dark:hover:bg-indigo-700 transition-all shadow-lg shadow-slate-200 dark:shadow-indigo-900/30 flex items-center justify-center gap-2 group"
        >
          <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Kembali ke Beranda
        </button>
        
        <p className="mt-6 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          Teruslah Belajar & Berprestasi!
        </p>
      </div>
    </div>
  );
};
