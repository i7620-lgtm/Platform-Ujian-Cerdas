import React, { useState } from 'react';
import { ArrowLeftIcon, AcademicCapIcon, PresentationChartLineIcon, CloudArrowUpIcon, ShareIcon, ClockIcon, CheckCircleIcon, SparklesIcon, QrCodeIcon, ChartBarIcon, LightBulbIcon, EnvelopeIcon, ShieldCheckIcon } from './Icons';

interface TutorialPageProps {
    onBack: () => void;
}

export const TutorialPage: React.FC<TutorialPageProps> = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState<'TEACHER' | 'STUDENT'>('TEACHER');

    const teacherSteps = [
        {
            title: "1. Buat Akun & Masuk",
            desc: "Daftar sebagai pengajar menggunakan email aktif Anda. Akses dashboard guru yang intuitif untuk mulai mengelola kelas, bank soal, dan sesi ujian Anda.",
            icon: PresentationChartLineIcon,
            color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
        },
        {
            title: "2. Buat Soal Otomatis (AI)",
            desc: "Unggah file PDF soal lama Anda atau ketik topik materi. Sistem AI kami akan otomatis memotong gambar, mengekstrak teks, dan mengubahnya menjadi format ujian digital siap pakai dalam hitungan detik.",
            icon: CloudArrowUpIcon,
            color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        },
        {
            title: "3. Konfigurasi Ujian",
            desc: "Atur durasi waktu, acak urutan soal/jawaban, bobot nilai, dan mode keamanan (Anti-Curang). Anda juga bisa mengatur apakah nilai langsung ditampilkan ke siswa atau tidak.",
            icon: SparklesIcon,
            color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
        },
        {
            title: "4. Bagikan Kode Akses",
            desc: "Dapatkan KODE UNIK 6 digit atau QR Code untuk dibagikan ke siswa. Siswa tidak perlu mendaftar akun, cukup masukkan kode dan nama untuk mulai mengerjakan.",
            icon: ShareIcon,
            color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        },
        {
            title: "5. Monitor & Analisis",
            desc: "Pantau pengerjaan siswa secara Real-time. Lihat siapa yang sedang online, selesai, atau terkunci karena kecurangan. Setelah selesai, unduh analisis butir soal lengkap (daya beda, tingkat kesulitan) dalam format Excel/PDF.",
            icon: ChartBarIcon,
            color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        }
    ];

    const studentSteps = [
        {
            title: "1. Masuk Ujian",
            desc: "Buka aplikasi, lalu pindai QR Code dari guru atau masukkan KODE UJIAN 6 digit pada halaman depan. Pastikan koneksi internet stabil.",
            icon: QrCodeIcon,
            color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
        },
        {
            title: "2. Isi Identitas",
            desc: "Lengkapi Nama Lengkap, Kelas, dan Nomor Absen dengan benar. Data ini akan digunakan guru untuk rekap nilai.",
            icon: AcademicCapIcon,
            color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        },
        {
            title: "3. Kerjakan Soal",
            desc: "Jawab soal Pilihan Ganda, Isian Singkat, Benar/Salah, atau Menjodohkan. Waktu berjalan mundur otomatis. Jawaban tersimpan otomatis setiap kali Anda memilih.",
            icon: CheckCircleIcon,
            color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        },
        {
            title: "4. Mode Aman (Anti-Curang)",
            desc: "PENTING: Jangan keluar aplikasi, membuka tab lain, atau mematikan layar! Sistem akan mendeteksi aktivitas mencurigakan dan dapat mengunci ujian Anda secara otomatis.",
            icon: ShieldCheckIcon,
            color: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
        }
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 transition-colors duration-300">
            <div className="max-w-4xl mx-auto p-6 md:p-12 animate-fade-in">
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
