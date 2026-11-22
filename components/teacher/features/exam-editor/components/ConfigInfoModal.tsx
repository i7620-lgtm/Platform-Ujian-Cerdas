import React, { useEffect } from "react";
import { InformationCircleIcon, XMarkIcon } from "../../../../Icons";
import {
  useExamEditorUIStore,
  type ConfigInfoTopic,
} from "../../../../../stores/examEditorUIStore";

interface InfoEntry {
  title: string;
  summary: string;
  points: { label?: string; text: string }[];
}

const INFO_CONTENT: Record<Exclude<ConfigInfoTopic, null>, InfoEntry> = {
  target_classes: {
    title: "Format Target Kelas & Data Siswa",
    summary:
      "Atur batasan kelas atau jumlah siswa per kelas. Biarkan kosong jika siswa bebas mengetik kelas secara mandiri.",
    points: [
      {
        label: "Hanya Nama Kelas",
        text: 'Ketik misalnya "6A" lalu tekan Enter untuk membatasi peserta dari kelas 6A.',
      },
      {
        label: "Kelas & Batas Kuota",
        text: 'Ketik "6A 40" lalu Enter (otomatis menjadi "6A(40)") untuk membatasi maksimal 40 siswa.',
      },
      {
        label: "Sekolah + Kelas + Kuota",
        text: 'Ketik "SD Negeri 2-6A(40)" untuk mengunci asal sekolah, kelas, sekaligus kuota.',
      },
      {
        label: "Impor Excel",
        text: "Gunakan tombol Download Format lalu Upload Data Siswa agar daftar kelas dan nama siswa terisi otomatis.",
      },
    ],
  },
  exam_mode: {
    title: "Mode Ujian vs Mode PR / Latihan",
    summary:
      "Pilih mekanisme pelaksanaan evaluasi sesuai kebutuhan pengawasan dan fleksibilitas waktu pengerjaan.",
    points: [
      {
        label: "Mode Ujian",
        text: "Berjalan pada rentang tanggal & jam mulai–selesai yang ketat. Mendukung durasi menit, Multi-Sesi Harian, Deteksi Kecurangan, Kunci Pelanggaran, dan GPS.",
      },
      {
        label: "Mode PR / Latihan",
        text: "Siswa bebas mengerjakan kapan saja sebelum tenggat tanggal & jam pengumpulan berakhir. Fitur pengawasan ketat otomatis dinonaktifkan.",
      },
    ],
  },
  daily_sessions: {
    title: "Pembatasan Sesi Harian & Isolasi Kelas",
    summary:
      "Atur satu atau beberapa jadwal jam operasional harian. Berguna untuk pembagian shift/gelombang kelas.",
    points: [
      {
        label: "Kartu Undangan Otomatis",
        text: "Siswa yang masuk di luar jadwal sesinya hanya melihat Kartu Undangan dan tidak dapat mengakses naskah soal hingga jam sesinya tiba.",
      },
      {
        label: "Berulang vs Tanggal Tertentu",
        text: "Pilih 'Berlaku Setiap Hari' untuk jadwal rutin selama rentang ujian, atau 'Pilih Tanggal Tertentu' untuk jadwal khusus per hari.",
      },
      {
        label: "Isolasi Kelas",
        text: "Tautkan sesi ke kelas tertentu (dari Target Kelas) atau pilih 'Kelas Umum' agar berlaku untuk semua peserta.",
      },
    ],
  },
  allow_overtime: {
    title: "Izinkan Kerja Lewat Waktu",
    summary:
      "Menjaga hak durasi pengerjaan penuh bagi siswa yang mulai mendekati jam tutup ujian atau jam akhir sesi.",
    points: [
      {
        label: "Syarat Aktif",
        text: "Hanya tersedia pada Mode Ujian dengan Durasi Pengerjaan lebih dari 0 menit.",
      },
      {
        label: "Cara Kerja",
        text: "Jika jam selesai ujian tiba tetapi sisa durasi menit siswa masih ada, siswa tetap diperbolehkan menuntaskan sisa durasinya.",
      },
    ],
  },
  detect_behavior: {
    title: "Deteksi Kecurangan",
    summary:
      "Mencatat setiap aktivitas keluar aplikasi, berpindah tab browser, atau membuka jendela lain saat ujian berlangsung.",
    points: [
      {
        label: "Laporan Pengawas",
        text: "Jumlah pelanggaran tercatat otomatis pada dasbor monitoring guru untuk bahan pertimbangan integritas ujian.",
      },
      {
        label: "Mode PR",
        text: "Otomatis tidak tersedia saat Mode PR / Latihan dipilih.",
      },
    ],
  },
  lock_violation: {
    title: "Kunci Akses Jika Melanggar",
    summary:
      "Pengamanan tingkat lanjut yang langsung menghentikan sesi siswa ketika terdeteksi meninggalkan halaman ujian.",
    points: [
      {
        label: "Syarat Aktif",
        text: "Memerlukan fitur 'Deteksi Kecurangan' dalam keadaan aktif.",
      },
      {
        label: "Mekanisme Buka Kunci",
        text: "Siswa tidak dapat melanjutkan pengerjaan hingga guru/pengawas menekan tombol buka kunci pada halaman Monitor.",
      },
    ],
  },
  bank_soal: {
    title: "Sistem Bank Soal & Panduan Level",
    summary:
      "Mengacak dan memilih sebagian soal secara otomatis untuk setiap siswa berdasarkan proporsi tingkat kesulitan.",
    points: [
      {
        label: "Kata Kunci Level Mudah",
        text: 'Gunakan salah satu pada editor soal: "mudah", "lots", "1", "easy", atau "rendah".',
      },
      {
        label: "Kata Kunci Level Sedang",
        text: 'Gunakan salah satu pada editor soal: "sedang", "mots", "2", "medium", atau "menengah".',
      },
      {
        label: "Kata Kunci Level Sulit",
        text: 'Gunakan salah satu pada editor soal: "sulit", "hots", "3", "hard", atau "tinggi".',
      },
      {
        label: "Pastikan Ketersediaan",
        text: "Pastikan jumlah soal di editor mencukupi target 'Jumlah Soal Ditampilkan' beserta komposisi persentasenya.",
      },
    ],
  },
  olympiad: {
    title: "Mode Olimpiade (Skor Penalti)",
    summary:
      "Sistem penilaian kompetisi (seperti OSN / KSM) menggunakan pengali poin kustom untuk jawaban benar, salah, dan kosong.",
    points: [
      {
        label: "Perhitungan Skor Mentah",
        text: "Skor akhir dihitung dari total poin pengali dikalikan bobot masing-masing soal dan dapat bernilai negatif.",
      },
      {
        label: "Preset Cepat",
        text: "Tersedia preset Standar OSN (+4 / -1 / 0), Kompetisi Ketat (+3 / -2 / -1), atau Tanpa Minus (+2 / 0 / 0) yang masih bisa diubah manual.",
      },
    ],
  },
  certificate: {
    title: "Sertifikat Kelulusan Otomatis",
    summary:
      "Menerbitkan e-Certificate digital otomatis bagi peserta ujian setelah hasil selesai diproses.",
    points: [
      {
        label: "Kustomisasi Tata Letak",
        text: "Guru dapat mengatur latar sertifikat, posisi nama siswa, serta posisi nilai akhir melalui Editor Sertifikat.",
      },
      {
        label: "Unduh Massal",
        text: "Seluruh sertifikat peserta dapat diunduh secara kolektif dari menu hasil di Dasbor Guru.",
      },
    ],
  },
  operation_mode: {
    title: "Mode Operasi (Stabil vs Realtime)",
    summary:
      "Menentukan frekuensi pengiriman data jawaban siswa ke server selama ujian berlangsung.",
    points: [
      {
        label: "Mode Stabil (Rekomendasi)",
        text: "Menyimpan jawaban lokal di perangkat dan mengirim ke server pada interval aman / saat selesai / tab ditutup. Sangat hemat kuota dan tahan ratusan peserta bersamaan.",
      },
      {
        label: "Mode Realtime",
        text: "Mengirim pembaruan jawaban ke server secara langsung. Membutuhkan koneksi internet siswa yang kuat dan stabil.",
      },
    ],
  },
};

export const ConfigInfoModal: React.FC = () => {
  const topic = useExamEditorUIStore((state) => state.configInfoTopic);
  const setConfigInfoTopic = useExamEditorUIStore(
    (state) => state.setConfigInfoTopic,
  );

  useEffect(() => {
    if (!topic) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setConfigInfoTopic(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [topic, setConfigInfoTopic]);

  if (!topic) return null;
  const info = INFO_CONTENT[topic];
  if (!info) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px] animate-fade-in"
      onClick={() => setConfigInfoTopic(null)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="config-info-modal-title"
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 min-w-0">
            <InformationCircleIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <h3
              id="config-info-modal-title"
              className="text-sm font-bold text-slate-800 dark:text-white truncate"
            >
              {info.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setConfigInfoTopic(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            aria-label="Tutup informasi"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {info.summary}
          </p>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/70 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40">
            {info.points.map((pt, idx) => (
              <div key={idx} className="px-3 py-2.5 text-xs leading-relaxed">
                {pt.label && (
                  <span className="font-bold text-slate-800 dark:text-slate-100 block mb-0.5">
                    {pt.label}
                  </span>
                )}
                <span className="text-slate-600 dark:text-slate-300">
                  {pt.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 flex justify-end bg-slate-50/50 dark:bg-slate-900/30">
          <button
            type="button"
            onClick={() => setConfigInfoTopic(null)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
};
