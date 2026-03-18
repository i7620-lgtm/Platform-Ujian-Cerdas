import React, { useState } from 'react';
import { ArrowLeftIcon, AcademicCapIcon, PresentationChartLineIcon, CloudArrowUpIcon, ShareIcon, CheckCircleIcon, SparklesIcon, QrCodeIcon, ChartBarIcon, LightBulbIcon, EnvelopeIcon, ShieldCheckIcon } from './Icons';

interface TutorialPageProps {
    onBack: () => void;
}

export const TutorialPage: React.FC<TutorialPageProps> = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState<'TEACHER' | 'STUDENT'>('TEACHER');

    const teacherSteps = [
        {
            title: "1. Buat Akun & Masuk",
            desc: "Daftar sebagai pengajar menggunakan email aktif Anda. Akses dashboard guru yang intuitif untuk mulai mengelola kelas, bank soal, dan sesi ujian Anda. Mendukung Light/Dark mode untuk kenyamanan mata Anda.",
            icon: PresentationChartLineIcon,
            color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
            mockup: (
                <div className="bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 mt-4 overflow-hidden select-none shadow-sm flex h-40">
                    {/* Sidebar */}
                    <div className="w-12 md:w-16 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col items-center py-3 gap-3 shrink-0">
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded bg-indigo-600 flex items-center justify-center mb-2"><div className="w-3 h-3 md:w-4 md:h-4 bg-white rounded-sm"></div></div>
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex flex-col items-center justify-center gap-0.5"><div className="w-3 h-2.5 md:w-4 md:h-3 bg-indigo-500 rounded-sm"></div></div>
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded text-slate-400 flex flex-col items-center justify-center gap-0.5"><div className="w-3 h-2.5 md:w-4 md:h-3 bg-slate-300 dark:bg-slate-600 rounded-sm"></div></div>
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded text-slate-400 flex flex-col items-center justify-center gap-0.5"><div className="w-3 h-2.5 md:w-4 md:h-3 bg-slate-300 dark:bg-slate-600 rounded-sm"></div></div>
                    </div>
                    {/* Main Content */}
                    <div className="flex-1 p-3 flex flex-col gap-3 overflow-hidden">
                        {/* Topbar */}
                        <div className="flex justify-between items-center">
                            <div className="h-3 w-20 md:w-24 bg-slate-300 dark:bg-slate-600 rounded"></div>
                            <div className="flex items-center gap-2">
                                <div className="h-5 md:h-6 w-16 md:w-20 bg-indigo-600 rounded flex items-center justify-center"><div className="h-1.5 w-8 md:w-10 bg-white/80 rounded"></div></div>
                                <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                            </div>
                        </div>
                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-2 shadow-sm">
                                <div className="h-1.5 w-8 md:w-12 bg-slate-300 dark:bg-slate-600 rounded mb-1.5"></div>
                                <div className="h-2.5 md:h-3 w-4 md:w-6 bg-slate-800 dark:bg-slate-200 rounded"></div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-2 shadow-sm">
                                <div className="h-1.5 w-8 md:w-12 bg-slate-300 dark:bg-slate-600 rounded mb-1.5"></div>
                                <div className="h-2.5 md:h-3 w-4 md:w-6 bg-slate-800 dark:bg-slate-200 rounded"></div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-2 shadow-sm">
                                <div className="h-1.5 w-8 md:w-12 bg-slate-300 dark:bg-slate-600 rounded mb-1.5"></div>
                                <div className="h-2.5 md:h-3 w-4 md:w-6 bg-slate-800 dark:bg-slate-200 rounded"></div>
                            </div>
                        </div>
                        {/* List */}
                        <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-2 flex-1 shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                                <div className="h-2 w-16 md:w-20 bg-slate-700 dark:bg-slate-300 rounded"></div>
                                <div className="h-1.5 w-8 md:w-10 bg-slate-300 dark:bg-slate-600 rounded"></div>
                            </div>
                            <div className="h-5 md:h-6 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-700 flex items-center px-2 justify-between">
                                <div className="h-1.5 w-16 md:w-24 bg-slate-400 dark:bg-slate-500 rounded"></div>
                                <div className="h-2.5 md:h-3 w-8 md:w-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "2. Editor Soal Canggih & Lengkap",
            desc: "Buat soal dengan mudah menggunakan editor WYSIWYG yang mendukung penyematan Audio, Gambar, dan Rumus Matematika (Equation). Tersedia berbagai jenis soal: Pilihan Ganda, Pilihan Ganda Kompleks, Benar/Salah, Menjodohkan, Isian Singkat, dan Uraian/Esai.",
            icon: CloudArrowUpIcon,
            color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
            mockup: (
                <div className="bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 mt-4 overflow-hidden select-none shadow-sm p-3 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <div className="h-6 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded flex items-center px-2 justify-between">
                            <div className="h-1.5 w-16 bg-slate-400 dark:bg-slate-500 rounded"></div>
                            <div className="w-2 h-2 border-b-2 border-r-2 border-slate-400 transform rotate-45 mb-1"></div>
                        </div>
                        <div className="h-6 w-28 bg-gradient-to-r from-indigo-500 to-purple-500 rounded flex items-center justify-center gap-1 shadow-sm">
                            <SparklesIcon className="w-3 h-3 text-white" />
                            <div className="h-1.5 w-12 bg-white/90 rounded"></div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded flex flex-col">
                        <div className="border-b border-slate-200 dark:border-slate-700 p-1.5 flex gap-1.5 bg-slate-50 dark:bg-slate-800/50">
                            <div className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center"><div className="w-2 h-2 bg-slate-400 rounded-sm"></div></div>
                            <div className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center"><div className="w-2 h-2 bg-slate-400 rounded-sm"></div></div>
                            <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-0.5"></div>
                            <div className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center"><div className="w-2 h-2 bg-slate-400 rounded-sm"></div></div>
                        </div>
                        <div className="p-2 h-12">
                            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded mb-1.5"></div>
                            <div className="h-1.5 w-3/4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full border border-slate-300 dark:border-slate-600"></div>
                            <div className="flex-1 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded flex items-center px-2"><div className="h-1.5 w-1/3 bg-slate-300 dark:bg-slate-600 rounded"></div></div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full border-4 border-emerald-500 bg-white dark:bg-slate-800"></div>
                            <div className="flex-1 h-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded flex items-center px-2"><div className="h-1.5 w-1/2 bg-emerald-400 dark:bg-emerald-600 rounded"></div></div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "3. Konfigurasi & Keamanan Ekstra",
            desc: "Atur durasi, acak soal/opsi, dan aktifkan fitur GPS Location Tracking untuk memantau posisi siswa. Gunakan fitur Kartu Undangan untuk membagikan info ujian secara profesional. Tersedia juga fitur Preview Soal untuk mengecek tampilan sebelum dipublikasikan.",
            icon: SparklesIcon,
            color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
            mockup: (
                <div className="bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 mt-4 p-3 select-none shadow-sm flex flex-col gap-2">
                    <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-2 flex justify-between items-center shadow-sm">
                        <div className="flex flex-col gap-1">
                            <div className="h-2 w-24 bg-slate-700 dark:bg-slate-300 rounded"></div>
                            <div className="h-1.5 w-32 bg-slate-400 dark:bg-slate-500 rounded"></div>
                        </div>
                        <div className="w-8 h-4 bg-indigo-500 rounded-full relative shadow-inner"><div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm"></div></div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-2 flex justify-between items-center shadow-sm">
                        <div className="flex flex-col gap-1">
                            <div className="h-2 w-28 bg-slate-700 dark:bg-slate-300 rounded"></div>
                            <div className="h-1.5 w-36 bg-slate-400 dark:bg-slate-500 rounded"></div>
                        </div>
                        <div className="w-8 h-4 bg-slate-200 dark:bg-slate-600 rounded-full relative shadow-inner"><div className="absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm"></div></div>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-2 shadow-sm">
                            <div className="h-1.5 w-16 bg-slate-400 dark:bg-slate-500 rounded mb-1.5"></div>
                            <div className="h-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded flex items-center px-2"><div className="h-1.5 w-8 bg-slate-700 dark:bg-slate-300 rounded"></div></div>
                        </div>
                        <div className="flex-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-2 shadow-sm">
                            <div className="h-1.5 w-16 bg-slate-400 dark:bg-slate-500 rounded mb-1.5"></div>
                            <div className="h-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded flex items-center px-2"><div className="h-1.5 w-12 bg-slate-700 dark:bg-slate-300 rounded"></div></div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "4. Bagikan & Monitor Real-time",
            desc: "Bagikan KODE UNIK atau QR Code. Pantau progres siswa secara Real-time. Sistem otomatis menyimpan jawaban siswa ke Cloud (Penyimpanan Aman). Jika waktu habis, jawaban siswa otomatis terkirim.",
            icon: ShareIcon,
            color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
            mockup: (
                <div className="bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 mt-4 p-3 select-none shadow-sm flex flex-col gap-3">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 flex items-center justify-between shadow-sm">
                        <div className="flex flex-col gap-1">
                            <div className="h-1.5 w-16 bg-slate-400 dark:bg-slate-500 rounded"></div>
                            <div className="text-lg font-mono font-black tracking-widest text-indigo-600 dark:text-indigo-400">X7Y9Z</div>
                        </div>
                        <div className="w-10 h-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded flex items-center justify-center p-1">
                            <div className="w-full h-full bg-slate-800 dark:bg-slate-200 rounded-sm" style={{backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)'}}></div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 shadow-sm flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-400 text-[10px] font-bold">B</div>
                                <div className="flex flex-col gap-0.5">
                                    <div className="h-2 w-16 bg-slate-700 dark:bg-slate-300 rounded"></div>
                                    <div className="h-1.5 w-10 bg-emerald-500 rounded"></div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <div className="h-1.5 w-8 bg-slate-400 dark:bg-slate-500 rounded"></div>
                                <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"><div className="w-3/4 h-full bg-emerald-500"></div></div>
                            </div>
                        </div>
                        <div className="w-full h-px bg-slate-100 dark:bg-slate-700"></div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-400 text-[10px] font-bold">S</div>
                                <div className="flex flex-col gap-0.5">
                                    <div className="h-2 w-16 bg-slate-700 dark:bg-slate-300 rounded"></div>
                                    <div className="h-1.5 w-12 bg-amber-500 rounded"></div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <div className="h-1.5 w-8 bg-slate-400 dark:bg-slate-500 rounded"></div>
                                <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"><div className="w-2/5 h-full bg-amber-500"></div></div>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "5. Analisis, Penilaian & Arsip",
            desc: "Analisis butir soal (tingkat kesulitan, daya beda) tersedia otomatis. Lakukan penilaian manual untuk soal Esai secara personal. Finalisasi data nilai, lalu unduh rekap nilai atau Cetak Arsip Soal & Jawaban dalam format PDF rapi.",
            icon: ChartBarIcon,
            color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
            mockup: (
                <div className="bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 mt-4 p-3 select-none shadow-sm flex flex-col gap-3">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-sm">
                        <div className="h-2 w-24 bg-slate-700 dark:bg-slate-300 rounded mb-3"></div>
                        <div className="flex items-end gap-1.5 h-16 border-b border-slate-100 dark:border-slate-700 pb-1">
                            <div className="flex-1 bg-emerald-400 rounded-t" style={{height: '85%'}}></div>
                            <div className="flex-1 bg-emerald-400 rounded-t" style={{height: '65%'}}></div>
                            <div className="flex-1 bg-amber-400 rounded-t" style={{height: '45%'}}></div>
                            <div className="flex-1 bg-rose-400 rounded-t" style={{height: '25%'}}></div>
                            <div className="flex-1 bg-emerald-400 rounded-t" style={{height: '95%'}}></div>
                            <div className="flex-1 bg-amber-400 rounded-t" style={{height: '55%'}}></div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1 h-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-sm flex items-center justify-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-sm"></div></div>
                            <div className="h-1.5 w-12 bg-slate-600 dark:bg-slate-300 rounded"></div>
                        </div>
                        <div className="flex-1 h-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-sm flex items-center justify-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-sm"></div></div>
                            <div className="h-1.5 w-12 bg-slate-600 dark:bg-slate-300 rounded"></div>
                        </div>
                    </div>
                </div>
            )
        }
    ];

    const studentSteps = [
        {
            title: "1. Akses Mudah Tanpa Akun",
            desc: "Cukup masukkan KODE UJIAN dan Nama untuk mulai mengerjakan. Tidak perlu repot mendaftar akun. Mendukung mode Light/Dark sesuai preferensi perangkat Anda.",
            icon: QrCodeIcon,
            color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
            mockup: (
                <div className="bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 mt-4 p-4 max-w-[240px] mx-auto shadow-sm select-none flex flex-col items-center">
                    <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-3 shadow-md">
                        <div className="w-6 h-6 bg-white rounded-sm"></div>
                    </div>
                    <div className="h-3 w-32 bg-slate-800 dark:bg-slate-200 rounded mb-4"></div>
                    <div className="w-full space-y-2">
                        <div className="h-10 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 flex items-center px-3 shadow-sm">
                            <div className="h-2 w-20 bg-slate-400 dark:bg-slate-500 rounded"></div>
                        </div>
                        <div className="h-10 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 flex items-center px-3 shadow-sm">
                            <div className="h-2 w-24 bg-slate-400 dark:bg-slate-500 rounded"></div>
                        </div>
                        <div className="h-10 bg-indigo-600 rounded flex items-center justify-center shadow-md mt-2">
                            <div className="h-2 w-16 bg-white/90 rounded"></div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "2. Pengerjaan Fleksibel (Online/Offline)",
            desc: "Aplikasi dirancang ringan dan hemat kuota. Jawaban tersimpan aman di perangkat dan otomatis disinkronkan ke server. Jika koneksi terputus, Anda tetap bisa melanjutkan pengerjaan.",
            icon: AcademicCapIcon,
            color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
            mockup: (
                <div className="bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 mt-4 p-3 select-none shadow-sm flex flex-col gap-2">
                    <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-2 flex justify-between items-center shadow-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center"><div className="w-3 h-3 bg-indigo-500 rounded-sm"></div></div>
                            <div className="h-2 w-20 bg-slate-700 dark:bg-slate-300 rounded"></div>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-full border border-emerald-100 dark:border-emerald-800">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <div className="h-1.5 w-10 bg-emerald-600 dark:bg-emerald-400 rounded"></div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-3 shadow-sm space-y-2">
                        <div className="flex justify-between items-center mb-1">
                            <div className="h-2 w-12 bg-slate-400 dark:bg-slate-500 rounded"></div>
                            <div className="h-2 w-16 bg-rose-500 rounded"></div>
                        </div>
                        <div className="h-2 w-full bg-slate-700 dark:bg-slate-300 rounded"></div>
                        <div className="h-2 w-5/6 bg-slate-700 dark:bg-slate-300 rounded"></div>
                        <div className="h-2 w-4/6 bg-slate-700 dark:bg-slate-300 rounded"></div>
                    </div>
                </div>
            )
        },
        {
            title: "3. Navigasi & Fitur Lengkap",
            desc: "Gunakan menu Daftar Soal untuk melompat ke nomor tertentu. Sistem akan mengingatkan jika ada soal yang masih kosong sebelum Anda mengumpulkan.",
            icon: CheckCircleIcon,
            color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
            mockup: (
                <div className="bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 mt-4 p-3 select-none shadow-sm flex flex-col gap-3">
                    <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-2 shadow-sm">
                        <div className="h-1.5 w-24 bg-slate-400 dark:bg-slate-500 rounded mb-2"></div>
                        <div className="grid grid-cols-5 gap-2">
                            <div className="aspect-square rounded bg-emerald-500 flex items-center justify-center shadow-sm"><div className="h-2 w-1.5 bg-white rounded-sm"></div></div>
                            <div className="aspect-square rounded bg-emerald-500 flex items-center justify-center shadow-sm"><div className="h-2 w-1.5 bg-white rounded-sm"></div></div>
                            <div className="aspect-square rounded bg-indigo-600 flex items-center justify-center ring-2 ring-indigo-200 dark:ring-indigo-900 shadow-sm"><div className="h-2 w-1.5 bg-white rounded-sm"></div></div>
                            <div className="aspect-square rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center"><div className="h-2 w-1.5 bg-slate-400 dark:bg-slate-500 rounded-sm"></div></div>
                            <div className="aspect-square rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center"><div className="h-2 w-1.5 bg-slate-400 dark:bg-slate-500 rounded-sm"></div></div>
                        </div>
                    </div>
                    <div className="flex justify-between gap-2">
                        <div className="flex-1 h-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-sm flex items-center justify-center"><div className="h-1.5 w-12 bg-slate-600 dark:bg-slate-300 rounded"></div></div>
                        <div className="flex-1 h-8 bg-indigo-600 rounded shadow-sm flex items-center justify-center"><div className="h-1.5 w-12 bg-white/90 rounded"></div></div>
                    </div>
                </div>
            )
        },
        {
            title: "4. Keamanan & Pengumpulan Otomatis",
            desc: "Sistem Anti-Curang mendeteksi perpindahan aplikasi. Fokuslah mengerjakan! Jika waktu habis, jawaban Anda akan otomatis dikirim ke server, jadi tidak perlu khawatir jawaban hilang.",
            icon: ShieldCheckIcon,
            color: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
            mockup: (
                <div className="bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 mt-4 p-3 select-none shadow-sm flex flex-col gap-2">
                    <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded p-2 flex items-start gap-2 shadow-sm">
                        <div className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800">
                            <div className="w-2 h-2 bg-rose-500 rounded-sm rotate-45"></div>
                        </div>
                        <div className="space-y-1.5 pt-0.5 w-full">
                            <div className="h-2 w-20 bg-rose-600 dark:bg-rose-400 rounded"></div>
                            <div className="h-1.5 w-full bg-rose-400 dark:bg-rose-500/70 rounded"></div>
                            <div className="h-1.5 w-4/5 bg-rose-400 dark:bg-rose-500/70 rounded"></div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><div className="w-2 h-2 bg-emerald-500 rounded-sm"></div></div>
                            <div className="h-1.5 w-24 bg-slate-600 dark:bg-slate-300 rounded"></div>
                        </div>
                        <div className="h-5 w-16 bg-emerald-500 rounded flex items-center justify-center"><div className="h-1.5 w-8 bg-white/90 rounded"></div></div>
                    </div>
                </div>
            )
        }
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 transition-colors duration-300">
            <div className="w-full max-w-full mx-auto p-6 md:p-12 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <button onClick={onBack} className="group flex items-center gap-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold transition-all text-xs uppercase tracking-widest">
                        <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                            <ArrowLeftIcon className="w-4 h-4" />
                        </div>
                        Kembali ke Beranda
                    </button>
                    <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                        <button 
                            onClick={() => setActiveTab('TEACHER')}
                            className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'TEACHER' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                            <PresentationChartLineIcon className="w-4 h-4"/> Untuk Guru
                        </button>
                        <button 
                            onClick={() => setActiveTab('STUDENT')}
                            className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'STUDENT' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                            <AcademicCapIcon className="w-4 h-4"/> Untuk Siswa
                        </button>
                    </div>
                </div>

                {/* Hero Content */}
                <div className="text-center mb-16 max-w-2xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">
                        Panduan <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">UjianCerdas</span>
                    </h1>
                    <p className="text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                        Platform evaluasi modern yang dirancang untuk kecepatan, kemudahan, dan hemat kuota. Pelajari cara menggunakannya dalam hitungan menit.
                    </p>
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                    {/* Steps Timeline */}
                    <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent dark:before:via-slate-700">
                        {(activeTab === 'TEACHER' ? teacherSteps : studentSteps).map((step, index) => (
                            <div key={index} className="relative flex items-start group animate-slide-in-up" style={{animationDelay: `${index * 100}ms`}}>
                                <div className={`absolute left-0 h-10 w-10 flex items-center justify-center rounded-full border-4 border-[#F8FAFC] dark:border-slate-950 shadow-md ${step.color} z-10 transition-transform group-hover:scale-110`}>
                                    <step.icon className="w-5 h-5" />
                                </div>
                                <div className="ml-16 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all w-full group-hover:border-indigo-100 dark:group-hover:border-indigo-900">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{step.title}</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{step.desc}</p>
                                    {step.mockup}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Features & Tips Card */}
                    <div className="sticky top-8 space-y-6">
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
                            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-purple-500 opacity-20 rounded-full blur-3xl"></div>
                            
                            <h3 className="text-2xl font-black mb-6 relative z-10 flex items-center gap-3">
                                <LightBulbIcon className="w-8 h-8 text-yellow-300"/> Fitur Unggulan
                            </h3>
                            
                            <ul className="space-y-4 relative z-10">
                                <li className="flex items-start gap-3">
                                    <div className="bg-white/20 p-1.5 rounded-lg mt-0.5"><CheckCircleIcon className="w-4 h-4"/></div>
                                    <div>
                                        <span className="font-bold block text-sm">Mode Hemat Kuota</span>
                                        <span className="text-xs opacity-80">Tidak perlu download aplikasi berat. Bekerja lancar di sinyal 3G/4G.</span>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="bg-white/20 p-1.5 rounded-lg mt-0.5"><CheckCircleIcon className="w-4 h-4"/></div>
                                    <div>
                                        <span className="font-bold block text-sm">Anti Curang (Secure Mode)</span>
                                        <span className="text-xs opacity-80">Otomatis mendeteksi jika siswa berpindah aplikasi atau mematikan layar.</span>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="bg-white/20 p-1.5 rounded-lg mt-0.5"><CheckCircleIcon className="w-4 h-4"/></div>
                                    <div>
                                        <span className="font-bold block text-sm">Analisis Butir Soal</span>
                                        <span className="text-xs opacity-80">Ketahui soal mana yang terlalu sulit atau terlalu mudah bagi siswa secara otomatis.</span>
                                    </div>
                                </li>
                            </ul>
                        </div>

                        {/* Free & Limits Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-bl-full -mr-4 -mt-4"></div>
                            
                            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2 relative z-10">
                                <SparklesIcon className="w-5 h-5 text-emerald-500"/> Komitmen Gratis
                            </h3>
                            
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed relative z-10">
                                Aplikasi ini diusahakan untuk tetap gratis bagi seluruh guru di Indonesia. Saat ini tidak ada biaya langganan, namun terdapat batasan penggunaan server untuk menjaga stabilitas:
                            </p>

                            <div className="space-y-3 relative z-10">
                                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Mode Normal</span>
                                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-lg">Max 1000 Siswa</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Mode Realtime</span>
                                    <span className="text-xs font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 px-2 py-1 rounded-lg">Max 200 Siswa</span>
                                </div>
                            </div>
                            
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-4 italic text-center">
                                *Batasan berlaku untuk penggunaan bersamaan (concurrent users).
                            </p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
                            <h4 className="font-bold text-slate-800 dark:text-white mb-4 text-sm uppercase tracking-widest">Butuh Bantuan?</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                                Jika Anda mengalami kendala teknis atau memiliki pertanyaan, silakan hubungi pengembang aplikasi langsung melalui email di bawah ini.
                            </p>
                            <a href="mailto:i7620@guru.sd.belajar.id?subject=UjianCerdas" className="w-full mb-3 py-3 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl transition-colors text-xs uppercase tracking-wide flex items-center justify-center gap-2">
                                <EnvelopeIcon className="w-4 h-4"/> Kirim Email ke Pengembang
                            </a>
                            <button onClick={onBack} className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition-colors text-xs uppercase tracking-wide">
                                Tutup Panduan
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
