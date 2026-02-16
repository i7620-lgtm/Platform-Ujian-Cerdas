
import React from 'react';
import { ArrowLeftIcon, FileTextIcon, LockClosedIcon } from './Icons';

interface LegalPageProps {
    onBack: () => void;
}

export const TermsPage: React.FC<LegalPageProps> = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-[#FAFAFA] dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 p-6 md:p-12 transition-colors duration-300">
            <div className="max-w-3xl mx-auto animate-fade-in">
                <button onClick={onBack} className="group flex items-center gap-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-8 font-bold transition-all text-xs uppercase tracking-widest">
                    <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    Kembali
                </button>
                
                <div className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                    
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400">
                        <FileTextIcon className="w-8 h-8" />
                    </div>
                    
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-8 tracking-tight">Syarat & Ketentuan</h1>
                    
                    <div className="prose prose-slate dark:prose-invert prose-sm max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-indigo-600 dark:prose-a:text-indigo-400">
                        <p>Selamat datang di <strong>UjianCerdas</strong>. Dengan mengakses atau menggunakan layanan kami, Anda menyetujui untuk terikat oleh syarat dan ketentuan berikut:</p>
                        
                        <h3>1. Penggunaan Layanan</h3>
                        <p>Platform ini dirancang untuk tujuan pendidikan dan evaluasi. Pengguna dilarang menyalahgunakan sistem untuk tindakan curang, ilegal, atau merugikan pihak lain. Anda setuju untuk menggunakan layanan ini sesuai dengan hukum yang berlaku.</p>
                        
                        <h3>2. Akun Pengguna</h3>
                        <p>Anda bertanggung jawab untuk menjaga kerahasiaan kredensial akun Anda (email dan password). Segala aktivitas yang terjadi di bawah akun Anda adalah tanggung jawab Anda sepenuhnya. Harap segera laporkan jika ada penggunaan akun tanpa izin.</p>
                        
                        <h3>3. Konten & Hak Cipta</h3>
                        <p>Soal, materi, dan data yang diunggah oleh guru tetap menjadi hak milik pembuatnya. Namun, dengan mengunggahnya, Anda memberikan lisensi kepada UjianCerdas untuk memproses, menyimpan, dan menampilkannya demi keperluan penyelenggaraan ujian.</p>
                        
                        <h3>4. Batasan Tanggung Jawab</h3>
                        <p>UjianCerdas berupaya menyediakan layanan yang andal, namun kami tidak bertanggung jawab atas kerugian langsung maupun tidak langsung akibat penggunaan layanan, termasuk namun tidak terbatas pada kehilangan data, gangguan koneksi, atau kesalahan teknis saat ujian berlangsung.</p>
                        
                        <h3>5. Perubahan Syarat</h3>
                        <p>Kami berhak mengubah syarat dan ketentuan ini sewaktu-waktu tanpa pemberitahuan sebelumnya. Pengguna disarankan untuk memeriksa halaman ini secara berkala untuk mengetahui perubahan terbaru.</p>
                    </div>
                    
                    <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
                        <p className="text-xs text-slate-400 font-medium">Terakhir diperbarui: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const PrivacyPage: React.FC<LegalPageProps> = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-[#FAFAFA] dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 p-6 md:p-12 transition-colors duration-300">
            <div className="max-w-3xl mx-auto animate-fade-in">
                <button onClick={onBack} className="group flex items-center gap-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-8 font-bold transition-all text-xs uppercase tracking-widest">
                    <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    Kembali
                </button>
                
                <div className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500"></div>

                    <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400">
                        <LockClosedIcon className="w-8 h-8" />
                    </div>
                    
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-8 tracking-tight">Kebijakan Privasi</h1>
                    
                    <div className="prose prose-slate dark:prose-invert prose-sm max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-emerald-600 dark:prose-a:text-emerald-400">
                        <p>Privasi Anda sangat penting bagi kami. Kebijakan ini menjelaskan bagaimana <strong>UjianCerdas</strong> mengumpulkan, menggunakan, dan melindungi informasi pribadi Anda.</p>
                        
                        <h3>1. Informasi yang Kami Kumpulkan</h3>
                        <p>Kami mengumpulkan informasi yang Anda berikan secara langsung saat mendaftar, seperti nama lengkap, alamat email, nama sekolah, dan kata sandi. Kami juga mengumpulkan data aktivitas penggunaan aplikasi, seperti log ujian, jawaban, dan nilai siswa.</p>
                        
                        <h3>2. Penggunaan Data</h3>
                        <p>Data yang kami kumpulkan digunakan untuk:</p>
                        <ul>
                            <li>Menyediakan dan mengelola layanan ujian online.</li>
                            <li>Melakukan penilaian dan analisis statistik hasil belajar.</li>
                            <li>Meningkatkan kualitas fitur dan keamanan aplikasi.</li>
                            <li>Mengirimkan informasi penting terkait akun atau layanan.</li>
                        </ul>
                        
                        <h3>3. Keamanan Data</h3>
                        <p>Kami menerapkan langkah-langkah keamanan teknis yang wajar untuk melindungi data Anda dari akses, penggunaan, atau pengungkapan yang tidak sah. Data sensitif seperti kata sandi disimpan menggunakan enkripsi.</p>
                        
                        <h3>4. Berbagi Data</h3>
                        <p>Kami <strong>tidak menjual</strong> data pribadi Anda kepada pihak ketiga. Data Anda mungkin dibagikan hanya jika diwajibkan oleh hukum yang berlaku atau untuk keperluan operasional sekolah yang Anda otorisasi.</p>
                        
                        <h3>5. Cookie & Penyimpanan Lokal</h3>
                        <p>Aplikasi ini menggunakan teknologi penyimpanan lokal (LocalStorage dan IndexedDB) pada perangkat Anda untuk memastikan fungsionalitas offline berjalan dengan baik dan untuk menyimpan preferensi pengguna.</p>
                    </div>

                    <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
                        <p className="text-xs text-slate-400 font-medium">Terakhir diperbarui: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
