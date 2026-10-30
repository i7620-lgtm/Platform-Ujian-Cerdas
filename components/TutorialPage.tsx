import React, { useState } from "react";
import {
  ArrowLeftIcon,
  AcademicCapIcon,
  PresentationChartLineIcon,
  CloudArrowUpIcon,
  ShareIcon,
  CheckCircleIcon,
  SparklesIcon,
  QrCodeIcon,
  ChartBarIcon,
  LightBulbIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
} from "./Icons";
import {
  BrainCircuit,
  BarChart3,
  Server,
  Award,
  Zap,
  CheckCircle2,
  BookOpen,
} from "lucide-react";

interface TutorialPageProps {
  onBack: () => void;
}

export const TutorialPage: React.FC<TutorialPageProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<"TEACHER" | "STUDENT">("TEACHER");

  // ==========================================
  // PANDUAN LANGKAH UNTUK GURU
  // ==========================================
  const teacherSteps = [
    {
      title: "1. Registrasi & Identitas Satuan Pendidikan",
      desc: "Masuk dengan mudah menggunakan akun Google (termasuk akun resmi guru.sd.belajar.id atau email instansi). Lengkapi identitas profil sekolah, jenjang kelas, dan daerah/kabupaten Anda agar integrasi analitik, sertifikat otomatis, dan rekapitulasi data akademik sekolah berjalan tepat sasaran.",
      teacherTip: "Tips Guru: Gunakan email resmi belajar.id agar nama sekolah dan jenjang otomatis tersinkronisasi pada kop laporan dan sertifikat digital siswa.",
      icon: PresentationChartLineIcon,
      color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
      mockup: (
        <div className="bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 mt-4 overflow-hidden select-none shadow-sm flex flex-col p-3.5 gap-2.5">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-sm">
                UC
              </div>
              <div>
                <div className="h-2.5 w-24 bg-slate-800 dark:bg-slate-200 rounded font-bold"></div>
                <div className="h-2 w-32 bg-slate-400 dark:bg-slate-500 rounded mt-1"></div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Profil Aktif
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="text-[9px] text-slate-400">Akun Pengajar</div>
              <div className="font-bold text-slate-700 dark:text-slate-200 truncate">guru@belajar.id</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="text-[9px] text-slate-400">Instansi / Wilayah</div>
              <div className="font-bold text-slate-700 dark:text-slate-200 truncate">SD / SMP / SMA Negeri</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "2. Generator Soal Canggih (Manual & AI Persona-AIM)",
      desc: "Susun instrumen ujian dengan editor WYSIWYG lengkap (dukungan KaTeX/LaTeX murni, audio, gambar, dan tabel). Anda juga dapat memanfaatkan AI Generator Soal yang otomatis menyesuaikan Persona Pakar Asesmen sesuai Fase Kurikulum Merdeka (Fase A s.d. F) dan standar BSKAP Kemendikdasmen No. 047/H/AN/2025 & No. 045/H/AN/2025. Dilengkapi diagram geometri 2D/3D isometrik, SVG konsep sains, tabel frekuensi, serta petunjuk bimbingan (hint).",
      teacherTip: "Tips Guru: Aktifkan fitur 'hint' (petunjuk) untuk melatih daya nalar siswa pada soal tingkat tinggi (HOTS) tanpa membocorkan kunci jawaban.",
      icon: SparklesIcon,
      color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
      mockup: (
        <div className="bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 mt-4 p-3.5 select-none shadow-sm flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex gap-1">
              <span className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-bold">Pilihan Ganda</span>
              <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-semibold">Benar/Salah</span>
              <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-semibold">Menjodohkan</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
              <BrainCircuit className="w-3 h-3" />
              <span>Persona-AIM Aktif</span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 space-y-1.5 text-xs">
            <div className="text-slate-800 dark:text-slate-100 font-medium">
              Sebuah prisma segitiga memiliki luas alas 24 cm² dan tinggi 15 cm. Berapakah volume prisma tersebut?
            </div>
            <div className="p-1.5 bg-slate-50 dark:bg-slate-900 rounded text-[11px] text-slate-500 font-mono">
              [GEOMETRY:prism:&#123;&quot;base&quot;:&quot;6 cm&quot;,&quot;height&quot;:&quot;8 cm&quot;,&quot;depth&quot;:&quot;15 cm&quot;&#125;]
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
              <LightBulbIcon className="w-3 h-3" />
              <span>Hint: Gunakan rumus V = Luas Alas × Tinggi</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "3. Konfigurasi Mode Ujian (Pipa Ringan Edge CDN vs Realtime) & Olimpiade",
      desc: "Pilih mode pelaksanaan yang tepat: Mode Normal (Pipa Ringan Vercel Edge CDN) untuk kelancaran massal hingga 30.000 siswa serentak tanpa beban database dan anti-kebocoran paket; atau Mode Realtime untuk pengawasan live proctoring kelas kecil (150-200 siswa). Tersedia pengaturan acak soal/opsi, token ujian, serta Mode Olimpiade dengan sistem penalti nilai.",
      teacherTip: "Tips Guru: Untuk asesmen sumatif serentak atau ujian sekolah lintas kelas, selalu pilih 'Mode Normal' agar kapasitas server gratisan melayani puluhan ribu siswa tanpa hambatan.",
      icon: CloudArrowUpIcon,
      color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
      mockup: (
        <div className="bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 mt-4 p-3.5 select-none shadow-sm flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-indigo-50 dark:bg-indigo-950/40 border-2 border-indigo-500 rounded-xl p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-indigo-700 dark:text-indigo-300">Mode Normal</span>
                <span className="text-[9px] bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded">Rekomendasi</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                Pipa Ringan Edge CDN. Tangguh hingga 30.000 siswa serentak, sangat hemat kuota, anti-bocor link.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-700 dark:text-slate-200">Mode Realtime</span>
                <span className="text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold px-1.5 py-0.5 rounded">150-200 Siswa</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                Live Proctoring interaktif. Pantau perpindahan tab dan status siswa detik demi detik via WebSocket.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Mode Olimpiade (Medali Emas/Perak/Perunggu)</span>
            <div className="w-8 h-4 bg-emerald-500 rounded-full relative">
              <div className="w-3 h-3 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "4. Distribusi Soal, Keamanan Anti-Curang, & QR Orang Tua",
      desc: "Bagikan 6 huruf kode unik, tautan langsung, atau kartu QR Code bergabung ke siswa. Tersedia fitur inovatif QR Code Orang Tua/Wali Siswa untuk transparansi informasi pelaksanaan ujian. Sistem secara otomatis mengunci browser siswa, mendeteksi perpindahan tab, dan menyimpan jawaban setiap detik.",
      teacherTip: "Tips Guru: Cetak atau proyeksikan Kartu Undangan QR di layar depan kelas agar siswa langsung mulai ujian tanpa perlu mengetik URL panjang.",
      icon: ShareIcon,
      color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
      mockup: (
        <div className="bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 mt-4 p-3.5 select-none shadow-sm flex flex-col gap-2.5">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center justify-between shadow-sm">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Kode Akses Ujian</div>
              <div className="text-xl font-mono font-black tracking-widest text-indigo-600 dark:text-indigo-400">
                MAT7F2
              </div>
            </div>
            <div className="flex gap-2">
              <div className="text-center">
                <div className="w-10 h-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center p-1.5 shadow-sm">
                  <QrCodeIcon className="w-full h-full text-slate-700 dark:text-slate-200" />
                </div>
                <span className="text-[9px] text-slate-400 font-bold">QR Siswa</span>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-lg flex items-center justify-center p-1.5 shadow-sm">
                  <QrCodeIcon className="w-full h-full text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-[9px] text-purple-600 dark:text-purple-400 font-bold">QR Wali</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-2 rounded-lg text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
            <span className="flex items-center gap-1.5">
              <ShieldCheckIcon className="w-4 h-4 text-emerald-600" /> Deteksi Perpindahan Layar Aktif
            </span>
            <span className="text-[10px] bg-emerald-200 dark:bg-emerald-900 px-1.5 py-0.5 rounded font-bold">Aman</span>
          </div>
        </div>
      ),
    },
    {
      title: "5. Penilaian Cepat & AI Analisis Diagnostik (Psychometric Engine)",
      desc: "Koreksi otomatis instan untuk soal pilihan ganda, benar/salah, dan menjodohkan; serta antarmuka periksa cepat untuk soal uraian/esai. Aktifkan AI Analisis Diagnostik Belajar untuk membedah sebaran 4 jenjang kompetensi (Perlu Bimbingan, Dasar, Cakap, Mahir), mendeteksi miskonsepsi pada butir soal kritis (<60%), analisis daya tarik pengecoh, serta unduh paket soal remedial siap pakai dan sertifikat otomatis.",
      teacherTip: "Tips Guru: Terapkan rekomendasi diferensiasi pembelajaran dari AI di kelas keesokan harinya menggunakan bank soal remedial yang otomatis disiapkan sistem.",
      icon: ChartBarIcon,
      color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
      mockup: (
        <div className="bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 mt-4 p-3.5 select-none shadow-sm flex flex-col gap-2.5">
          <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center text-xs font-bold mb-1.5">
              <span className="text-slate-700 dark:text-slate-200">Sebaran Kompetensi Kelas</span>
              <span className="text-indigo-600 dark:text-indigo-400">Rata-rata: 78,5</span>
            </div>
            <div className="grid grid-cols-4 gap-1 text-[10px] text-center font-bold">
              <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-600 p-1 rounded">Bimbingan (2)</div>
              <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-600 p-1 rounded">Dasar (6)</div>
              <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 p-1 rounded">Cakap (18)</div>
              <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 p-1 rounded">Mahir (8)</div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-center text-[10px] font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1 shadow-sm">
              <Award className="w-3.5 h-3.5 text-amber-500" /> Sertifikat Digital
            </div>
            <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1 shadow-sm">
              <BookOpen className="w-3.5 h-3.5" /> Buku Soal & Remedial
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "6. Dasbor Statistik & Telemetri Penggunaan Komprehensif",
      desc: "Pantau penggunaan aplikasi secara terukur: pengukuran konsumsi kuota data siswa riil melalui browser Performance API, sebaran kelas, asal wilayah/sekolah, jenis perangkat (Android, iOS, Windows, macOS), frekuensi pelanggaran keluar layar, serta jam puncak aktivitas pengerjaan. Hak akses berjenjang: Guru melihat kelasnya sendiri, sedangkan Admin/Super Admin memantau statistik makro.",
      teacherTip: "Tips Guru: Ekspor data telemetri ke format CSV untuk lampiran laporan pertanggungjawaban penggunaan TIK dan evaluasi efisiensi kuota sekolah.",
      icon: BarChart3,
      color: "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400",
      mockup: (
        <div className="bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 mt-4 p-3.5 select-none shadow-sm flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
              <div className="text-[9px] text-slate-400 font-medium">Total Transfer</div>
              <div className="text-xs font-black text-indigo-600 dark:text-indigo-400">12,4 MB</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
              <div className="text-[9px] text-slate-400 font-medium">Rata-rata/Siswa</div>
              <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">~24 KB</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
              <div className="text-[9px] text-slate-400 font-medium">Perangkat Utama</div>
              <div className="text-xs font-black text-slate-700 dark:text-slate-200">Android (84%)</div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 flex justify-between items-center text-[10px]">
            <span className="font-semibold text-slate-600 dark:text-slate-300">Peta Sebaran: 4 Kelas • 120 Siswa Terdata</span>
            <span className="font-bold text-indigo-600 hover:underline">Ekspor CSV</span>
          </div>
        </div>
      ),
    },
  ];

  // ==========================================
  // PANDUAN LANGKAH UNTUK SISWA
  // ==========================================
  const studentSteps = [
    {
      title: "1. Akses Super Cepat Tanpa Akun",
      desc: "Siswa tidak perlu repot mendaftar email atau menghafal kata sandi. Cukup masukkan 6 huruf KODE UJIAN atau scan QR Code yang dibagikan guru, lalu isi Nama Lengkap dan Nomor Absen.",
      teacherTip: "Tips Siswa: Pastikan nama dan nomor absen sesuai dengan data di presensi kelas agar nilai Anda langsung tercatat rapi oleh guru.",
      icon: QrCodeIcon,
      color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
      mockup: (
        <div className="bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 mt-4 p-4 max-w-[260px] mx-auto shadow-sm select-none flex flex-col items-center">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xs mb-2.5 shadow-md">
            UC
          </div>
          <div className="h-2.5 w-24 bg-slate-800 dark:bg-slate-200 rounded mb-3"></div>
          <div className="w-full space-y-2 text-xs">
            <div className="h-8 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 flex items-center px-2.5 font-mono text-indigo-600 font-bold">
              MAT7F2
            </div>
            <div className="h-8 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 flex items-center px-2.5 text-slate-400">
              Ahmad Fauzi (Absen 04)
            </div>
            <div className="h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold text-xs shadow-sm">
              Mulai Mengerjakan
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "2. Pengerjaan Ramah Kuota & Offline-Ready",
      desc: "UjianCerdas dirancang sangat hemat kuota (~20 KB per ujian). Paket soal dimuat sekali di awal, dan seluruh jawaban tersimpan secara otomatis setiap detik di memori perangkat Anda. Jika sinyal mendadak terputus atau HP mati lampu, pengerjaan tetap aman dan dapat dilanjutkan tanpa kehilangan data.",
      teacherTip: "Tips Siswa: Jangan panik jika koneksi internet terputus di tengah jalan. Anda tetap bisa menjawab soal hingga selesai, dan jawaban akan terkirim begitu ada sinyal kembali.",
      icon: AcademicCapIcon,
      color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
      mockup: (
        <div className="bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 mt-4 p-3.5 select-none shadow-sm flex flex-col gap-2">
          <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-200">Soal No. 12 dari 30</span>
            <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Auto-Save Aktif
            </span>
          </div>
          <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
            <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="h-2 w-3/4 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
              <span>Sisa Waktu: 42:15</span>
              <span className="text-indigo-600 font-bold">24 Soal Terjawab</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "3. Navigasi Fleksibel, Ragu-ragu, & Petunjuk (Hint)",
      desc: "Gunakan panel Daftar Soal untuk melompat ke butir soal mana pun. Tandai soal dengan opsi Ragu-ragu jika masih ingin meninjaunya kembali. Jika guru mengaktifkan fitur petunjuk, tekan tombol Hint untuk membaca arahan berpikir konsep dasar.",
      teacherTip: "Tips Siswa: Cek kembali panel daftar soal sebelum selesai; soal yang belum terjawab akan berwarna abu-abu sehingga mudah terlihat.",
      icon: CheckCircleIcon,
      color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
      mockup: (
        <div className="bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 mt-4 p-3.5 select-none shadow-sm flex flex-col gap-2">
          <div className="grid grid-cols-6 gap-1.5 text-center text-xs font-bold">
            <div className="aspect-square bg-emerald-500 text-white rounded flex items-center justify-center">1</div>
            <div className="aspect-square bg-emerald-500 text-white rounded flex items-center justify-center">2</div>
            <div className="aspect-square bg-amber-400 text-white rounded flex items-center justify-center">3?</div>
            <div className="aspect-square bg-indigo-600 text-white rounded ring-2 ring-indigo-300 flex items-center justify-center">4</div>
            <div className="aspect-square bg-white dark:bg-slate-800 border text-slate-400 rounded flex items-center justify-center">5</div>
            <div className="aspect-square bg-white dark:bg-slate-800 border text-slate-400 rounded flex items-center justify-center">6</div>
          </div>
          <div className="flex justify-between items-center pt-1 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-sm"></span> Yakin</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-400 rounded-sm"></span> Ragu</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 border rounded-sm"></span> Kosong</span>
          </div>
        </div>
      ),
    },
    {
      title: "4. Keamanan Jujur & Pengiriman Otomatis",
      desc: "Sistem Anti-Curang akan memberikan peringatan jika Anda berpindah ke aplikasi lain atau mematikan jendela ujian. Tetaplah fokus mengerjakan! Saat batas waktu habis, sistem akan secara otomatis mengumpulkan seluruh lembar jawaban Anda ke server.",
      teacherTip: "Tips Siswa: Kerjakan dengan jujur dan hindari membuka aplikasi pesan atau browsing agar lembar ujian Anda tidak terkunci otomatis oleh sistem pengawas.",
      icon: ShieldCheckIcon,
      color: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
      mockup: (
        <div className="bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 mt-4 p-3.5 select-none shadow-sm flex flex-col gap-2">
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg p-2.5 flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
              !
            </div>
            <div className="text-[11px] text-rose-700 dark:text-rose-300 leading-snug">
              <span className="font-bold block">Peringatan Integritas</span>
              Terdeteksi 1x keluar jendela ujian. Pelanggaran tercatat otomatis pada dasbor pengawas.
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
            <span className="text-slate-500">Auto-Submit Waktu:</span>
            <span className="font-mono font-bold text-rose-600">00:15 detik tersisa</span>
          </div>
        </div>
      ),
    },
    {
      title: "5. Nilai Instan, Pembahasan, & Unduh Sertifikat",
      desc: "Setelah pengumpulan selesai, Anda dapat langsung melihat perolehan skor, ringkasan jawaban benar/salah, serta pembahasan butir soal (jika guru mengaktifkan pembahasan). Anda juga dapat langsung mengunduh Sertifikat Digital Penghargaan kelulusan ujian.",
      teacherTip: "Tips Siswa: Pelajari kembali pembahasan soal pada nomor-nomor yang salah agar pemahaman materi Anda semakin mendalam.",
      icon: Award,
      color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
      mockup: (
        <div className="bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 mt-4 p-3.5 select-none shadow-sm flex flex-col gap-2">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-3 rounded-lg text-center shadow-sm">
            <div className="text-[10px] uppercase tracking-wider font-semibold opacity-90">Skor Akhir Ujian</div>
            <div className="text-2xl font-black font-sans">92 / 100</div>
            <div className="text-[10px] opacity-90">Predikat: Sangat Baik (Capaian Mahir)</div>
          </div>
          <div className="h-7 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>Unduh Sertifikat Kelulusan (PDF)</span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 transition-colors duration-300">
      <div className="w-full max-w-full mx-auto p-4 sm:p-6 md:p-12 animate-fade-in">
        {/* Top Navigation */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <button
            onClick={onBack}
            className="group flex items-center gap-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 font-bold transition-all text-xs uppercase tracking-widest"
          >
            <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
              <ArrowLeftIcon className="w-4 h-4" />
            </div>
            Kembali ke Beranda
          </button>
          <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab("TEACHER")}
              className={`px-5 sm:px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === "TEACHER" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
            >
              <PresentationChartLineIcon className="w-4 h-4" /> Untuk Guru
            </button>
            <button
              onClick={() => setActiveTab("STUDENT")}
              className={`px-5 sm:px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === "STUDENT" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
            >
              <AcademicCapIcon className="w-4 h-4" /> Untuk Siswa
            </button>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider mb-4">
            <SparklesIcon className="w-3.5 h-3.5" /> Panduan & Dokumentasi Resmi UjianCerdas
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
            Pelajari Cara Menggunakan{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
              UjianCerdas
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            Platform evaluasi dan asesmen pembelajaran modern Indonesia berstandar Kurikulum Merdeka.
            Didesain untuk kecepatan tinggi, tanpa beban kuota, dan tangguh hingga 30.000 siswa serentak.
          </p>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12 items-start">
          {/* Steps Timeline (2 Kolom Lebar) */}
          <div className="lg:col-span-2 space-y-6">
            {(activeTab === "TEACHER" ? teacherSteps : studentSteps).map((step, index) => (
              <div
                key={index}
                className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group hover:border-indigo-200 dark:hover:border-indigo-900"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 flex items-center justify-center rounded-2xl ${step.color} shrink-0 shadow-sm mt-0.5`}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                      {step.desc}
                    </p>
                    {step.teacherTip && (
                      <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 font-medium mb-3 flex items-start gap-2">
                        <LightBulbIcon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>{step.teacherTip}</span>
                      </div>
                    )}
                    {step.mockup}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Cards (1 Kolom Kanan) */}
          <div className="space-y-6 sticky top-6">
            {/* Card 1: Fitur Unggulan Terbaru */}
            <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-purple-500 opacity-20 rounded-full blur-3xl"></div>

              <h3 className="text-xl font-black mb-5 relative z-10 flex items-center gap-2.5">
                <Zap className="w-6 h-6 text-yellow-300" /> Fitur Unggulan Utama
              </h3>

              <ul className="space-y-4 relative z-10 text-xs sm:text-sm">
                <li className="flex items-start gap-3">
                  <div className="bg-white/20 p-1.5 rounded-lg mt-0.5 shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  </div>
                  <div>
                    <span className="font-bold block text-white">AI Persona-AIM Kurikulum Merdeka</span>
                    <span className="text-xs text-indigo-100">
                      Adaptif Fase A-F (SD/SMP/SMA/SMK) sesuai BSKAP No. 047 & 045/H/AN/2025 dengan kunci valid 100%.
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-white/20 p-1.5 rounded-lg mt-0.5 shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  </div>
                  <div>
                    <span className="font-bold block text-white">Mode Normal Pipa Ringan (30.000 Siswa)</span>
                    <span className="text-xs text-indigo-100">
                      Didukung Vercel Edge CDN Cache untuk ujian serentak massal tanpa membebani kuota database.
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-white/20 p-1.5 rounded-lg mt-0.5 shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  </div>
                  <div>
                    <span className="font-bold block text-white">Dasbor Telemetri Kuota Data Riil</span>
                    <span className="text-xs text-indigo-100">
                      Mengukur konsumsi transfer data riil siswa per ujian via browser Performance API.
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-white/20 p-1.5 rounded-lg mt-0.5 shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  </div>
                  <div>
                    <span className="font-bold block text-white">AI Psikometri & Bank Soal Remedial</span>
                    <span className="text-xs text-indigo-100">
                      Bedah butir soal kritis &lt;60% dan sajikan paket remedial siap pakai untuk perbaikan kelas.
                    </span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Card 2: Kapasitas Penggunaan Riil (Free Tier) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-2 mb-3">
                <Server className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-slate-800 dark:text-white">
                  Kapasitas Sumber Daya Riil
                </h3>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                UjianCerdas 100% gratis untuk seluruh guru Indonesia dengan batas kapasitas terukur:
              </p>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-700 dark:text-slate-200">Mode Normal (Edge CDN)</span>
                    <span className="font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full text-[10px]">
                      Hingga 30.000 Siswa
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Pengunduhan paket soal dialihkan ke CDN Cache global. Sangat ringan dan anti-macet.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-700 dark:text-slate-200">Mode Realtime (WebSocket)</span>
                    <span className="font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full text-[10px]">
                      150 – 200 Siswa
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Pengawasan langsung live proctoring kelas paralel (batas koneksi realtime gratis).
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-700 dark:text-slate-200">Penyimpanan Hasil Ujian</span>
                    <span className="font-black text-purple-600 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-full text-[10px]">
                      ~100.000 Data
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Database PostgreSQL Supabase muat menampung riwayat ujian ratusan rombel.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 3: Tips Praktis Guru di Sekolah */}
            <div className="bg-amber-50/60 dark:bg-amber-950/20 rounded-3xl p-6 sm:p-7 border border-amber-200/80 dark:border-amber-900/40">
              <h4 className="font-black text-amber-900 dark:text-amber-200 mb-3 text-sm flex items-center gap-2">
                <LightBulbIcon className="w-5 h-5 text-amber-600" /> Tips Praktis Guru di Sekolah
              </h4>
              <ul className="space-y-2.5 text-xs text-amber-950/80 dark:text-amber-300/90 leading-relaxed">
                <li>
                  <strong>Ujian Satu Sekolah:</strong> Selalu pilih <em>Mode Normal</em> agar ratusan siswa dapat mengakses soal bersamaan tanpa membebani router WiFi sekolah.
                </li>
                <li>
                  <strong>Ujian Tanpa Kuota Besar:</strong> Siswa hanya membutuhkan kuota sekitar 20 KB untuk satu sesi ujian penuh berkat kompresi paket instan.
                </li>
                <li>
                  <strong>Tindak Lanjut Remedial:</strong> Gunakan tabel 4 jenjang kompetensi untuk membagi kelas ke stasiun belajar dalam 20 menit pelajaran berikutnya.
                </li>
              </ul>
            </div>

            {/* Card 4: Kontak & Dukungan */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <h4 className="font-bold text-slate-800 dark:text-white mb-2 text-sm uppercase tracking-wider">
                Butuh Bantuan Teknis?
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                Ada kendala atau masukan seputar fitur UjianCerdas? Hubungi pengembang langsung melalui email:
              </p>
              <a
                href="mailto:i7620@guru.sd.belajar.id?subject=Konsultasi%20UjianCerdas"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-xs flex items-center justify-center gap-2 shadow-sm"
              >
                <EnvelopeIcon className="w-4 h-4" /> i7620@guru.sd.belajar.id
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
