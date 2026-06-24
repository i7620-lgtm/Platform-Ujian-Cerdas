import React from "react";
import {
  XMarkIcon,
  BookOpenIcon,
  QrCodeIcon,
  CheckCircleIcon,
  LockClosedIcon,
  ClockIcon,
  PencilIcon,
  LockOpenIcon,
  TrashIcon,
  ShareIcon,
} from "../../../Icons";

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  examMode?: string;
}

export const GuideModal: React.FC<GuideModalProps> = ({
  isOpen,
  onClose,
  examMode,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-in-up border border-white dark:border-slate-700 relative">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-blue-50 dark:bg-slate-900 sticky top-0 z-10">
          <h3 className="font-bold text-lg text-blue-900 dark:text-blue-300 flex items-center gap-2">
            <BookOpenIcon className="w-5 h-5" /> Panduan Lengkap Live Monitoring
          </h3>
          <button
            onClick={onClose}
            className="p-2 bg-white dark:bg-slate-800 rounded-full text-slate-400 hover:text-rose-500 transition-colors shadow-sm"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-10 text-slate-700 dark:text-slate-300 text-sm">
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg shrink-0">
              1
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-base">
                Akses Pengerjaan Siswa
              </h4>
              <p className="mb-3 leading-relaxed text-slate-600 dark:text-slate-400">
                Untuk memulai ujian, siswa membutuhkan{" "}
                <strong>Kode Ujian</strong> atau link URL ujian. Anda dapat
                memberikan akses ini dengan beberapa cara:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-slate-400 mb-2">
                <li>
                  Klik tombol{" "}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded font-bold text-xs">
                    <QrCodeIcon className="w-3 h-3" /> Akses Siswa
                  </span>{" "}
                  di bilah atas untuk menampilkan QR Code dan Kode Ujian
                  berukuran besar (cocok untuk ditampilkan di proyektor kelas).
                </li>
                <li>
                  Arahkan siswa untuk membuka tautan website aplikasi, lalu
                  meminta mereka untuk memasukkan <strong>Kode Ujian</strong>{" "}
                  yang tertera (contoh: PUS-ABCDE).
                </li>
                <li>Bagikan link langsung pengerjaan ujian kepada siswa.</li>
              </ul>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg shrink-0">
              2
            </div>
            <div className="w-full">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-base">
                Memantau Status & Progres Siswa
              </h4>
              <p className="mb-4 leading-relaxed text-slate-600 dark:text-slate-400">
                Anda dapat memantau aktivitas siswa secara <em>real-time</em>{" "}
                dari tabel utama. Status siswa ditandai dengan ikon dan label
                berikut:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 mb-4">
                <div className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <span className="shrink-0 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-md text-[10px] font-black uppercase flex items-center gap-1.5 border border-emerald-100 dark:border-emerald-950 shadow-sm mt-0.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>{" "}
                    Online
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-0.5">
                      Mengerjakan (Aktif)
                    </p>
                    <p className="text-xs text-slate-500">
                      Siswa sedang membuka aplikasi dan aktif mengerjakan ujian.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <span className="shrink-0 px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-md text-[10px] font-black uppercase flex items-center gap-1.5 border border-slate-200 dark:border-slate-600 mt-0.5">
                    <CheckCircleIcon className="w-3 h-3" /> Selesai
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-0.5">
                      Telah Dikumpulkan
                    </p>
                    <p className="text-xs text-slate-500">
                      Ujian siswa telah selesai dan diserahkan ke sistem ujian.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <span className="shrink-0 px-2.5 py-1 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-md text-[10px] font-black uppercase flex items-center gap-1.5 border border-rose-100 dark:border-rose-900 mt-0.5">
                    <LockClosedIcon className="w-3 h-3" /> Locked
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-0.5">
                      Terblokir Otomatis / Dihentikan
                    </p>
                    <p className="text-xs text-slate-500">
                      Sistem memblokir sementara siswa karena kehabisan waktu,
                      indikasi pelanggaran, atau dihentikan paksa.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <div className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-md mt-0.5">
                    <ClockIcon className="w-3 h-3" /> Aktif
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-0.5">
                      Waktu Interaksi / Progress Bar
                    </p>
                    <p className="text-xs text-slate-500">
                      Menunjukkan rasio seberapa banyak soal ujian yang telah
                      dikerjakan oleh siswa pada saat itu beserta status
                      aktivitas terkininya.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg shrink-0">
              3
            </div>
            <div className="w-full">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-base">
                Tindakan Khusus & Kendali Guru
              </h4>
              <p className="mb-4 leading-relaxed text-slate-600 dark:text-slate-400">
                Guru memiliki kendali penuh terhadap jalannya sesi pengerjaan
                ujian. Berikut adalah daftar operasi penting yang bisa
                dilakukan:
              </p>

              <ul className="space-y-4">
                <li className="flex gap-3">
                  <div className="p-1.5 shrink-0 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded">
                    <PencilIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Koreksi Data Siswa Secara Live
                    </p>
                    <p className="text-xs text-slate-500">
                      Siswa salah memasukkan nama atau nomor absen? Klik ikon
                      Edit (Pensil) pada kolom aksi siswa tersebut dan perbaiki
                      identitasnya langsung tanpa mereka perlu keluar halaman
                      sistem aplikasi.
                    </p>
                  </div>
                </li>
                {examMode !== "PR" && (
                  <li className="flex gap-3">
                    <div className="p-1.5 shrink-0 bg-rose-50 text-rose-600 rounded">
                      <XMarkIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Hentikan Paksa (Individu/Keseluruhan)
                      </p>
                      <p className="text-xs text-slate-500">
                        Klik "Hentikan" di baris siswa untuk memaksa pengumpulan
                        jawaban mereka saat itu juga. Atau klik "Hentikan Ujian"
                        di menu atas untuk memaksa pengumpulan seluruh ujian
                        siswa secara serentak.
                      </p>
                    </div>
                  </li>
                )}
                {examMode !== "PR" && (
                  <li className="flex gap-3 border-l-2 pl-3 border-indigo-200 dark:border-indigo-800 mt-2 ml-1">
                    <div className="p-1.5 shrink-0 bg-indigo-50 text-indigo-600 rounded">
                      <LockOpenIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Membuka Blokir (Generate Token)
                      </p>
                      <p className="text-xs text-slate-500">
                        Jika siswa mengalami masalah teknis atau sempat terkena
                        "Kunci Akses" akibat sistem anti kecurangan, Anda dapat
                        memberikan mereka akses kembali dengan mengklik tombol
                        "Buat Token". Token hanya berlaku 1 kali (OTP) yang
                        diberikan langsung secara khusus dari meja guru.
                      </p>
                    </div>
                  </li>
                )}
                <li className="flex gap-3">
                  <div className="p-1.5 shrink-0 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded">
                    <TrashIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Diskualifikasi / Hapus Ujian Siswa
                    </p>
                    <p className="text-xs text-slate-500">
                      Menghapus data sesi pengerjaan ujian siswa secara permanen
                      (menghapus progres pengerjaannya) agar misalnya ia bisa
                      mendaftar atau mencoba ujian kembali dengan lembar kerja
                      baru.
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg shrink-0">
              4
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-base">
                Membagikan Tampilan Monitor
              </h4>
              <p className="mb-3 leading-relaxed text-slate-600 dark:text-slate-400">
                Jika Anda perlu membagikan pantauan live-monitoring ke Kepala
                Sekolah/Orang Tua/Tamu tanpa memberikan akses administratif yang
                bisa mengubah konfigurasi ujian atau membongkar nilai. Cukup
                klik tombol{" "}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded font-bold text-xs">
                  <ShareIcon className="w-3 h-3" /> Bagikan Stream
                </span>{" "}
                di kanan atas dan sebarkan link pengawas kepada mereka.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-right">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none hover:shadow-xl hover:-translate-y-0.5"
          >
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
};
