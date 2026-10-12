import React, { useState } from "react";
import { XMarkIcon, DocumentDuplicateIcon, ShieldCheckIcon, UserIcon } from "../../../Icons";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  liveUrl: string;
  proctorUrl?: string;
  examCode?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  liveUrl,
  proctorUrl,
  examCode,
}) => {
  const [activeTab, setActiveTab] = useState<"proctor" | "public">(
    proctorUrl ? "proctor" : "public"
  );
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl = activeTab === "proctor" && proctorUrl ? proctorUrl : liveUrl;
  const isProctorTab = activeTab === "proctor";

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in font-sans">
      <div
        id="share-parent-modal-container"
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-6 sm:p-7 text-center animate-slide-in-up border border-white dark:border-slate-700 relative"
      >
        <button
          id="close-share-parent-modal-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full transition-colors"
          title="Tutup"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        <h3 className="font-black text-lg text-slate-800 dark:text-white tracking-tight mb-4">
          Bagikan Akses Pantauan Live
        </h3>

        {/* Tab Selection: Pengawas vs Orang Tua */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl mb-5">
          <button
            type="button"
            onClick={() => setActiveTab("proctor")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              isProctorTab
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <ShieldCheckIcon className="w-4 h-4" />
            <span>Pengawas Ujian</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("public")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              !isProctorTab
                ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Orang Tua / Publik</span>
          </button>
        </div>

        {/* Role Permissions Badge */}
        <div
          className={`p-3 rounded-2xl text-xs font-medium mb-4 text-left border ${
            isProctorTab
              ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-900/50 text-indigo-900 dark:text-indigo-200"
              : "bg-teal-50/70 dark:bg-teal-950/40 border-teal-100 dark:border-teal-900/50 text-teal-900 dark:text-teal-200"
          }`}
        >
          {isProctorTab ? (
            <div>
              <span className="block font-bold text-indigo-700 dark:text-indigo-300 mb-0.5">
                Hak Akses Pengawas:
              </span>
              <span>
                Dapat memantau ujian siswa, <strong>Buka Kunci</strong> dan <strong>Buat Token</strong> untuk siswa terkunci, serta <strong>Edit Data Siswa</strong>.
              </span>
            </div>
          ) : (
            <div>
              <span className="block font-bold text-teal-700 dark:text-teal-300 mb-0.5">
                Hak Akses Orang Tua / Tamu:
              </span>
              <span>
                Murni tampilan pantauan progres dan kehadiran secara langsung <strong>tanpa tombol aksi</strong> atau hak modifikasi data.
              </span>
            </div>
          )}
        </div>

        {/* QR Code Container */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-md mb-4 inline-block mx-auto relative group">
          <div
            className={`absolute -inset-1 bg-gradient-to-tr rounded-3xl opacity-20 blur transition-opacity ${
              isProctorTab
                ? "from-indigo-500 to-purple-500 group-hover:opacity-30"
                : "from-teal-500 to-emerald-500 group-hover:opacity-30"
            }`}
          />
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
              currentUrl
            )}&margin=10`}
            alt={isProctorTab ? "QR Code Pengawas" : "QR Code Orang Tua"}
            referrerPolicy="no-referrer"
            className="w-40 h-40 object-contain relative bg-white rounded-xl"
          />
        </div>

        {examCode && (
          <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 mb-4">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">
              Kode Ujian
            </p>
            <p className="text-lg font-code slashed-zero font-black text-slate-800 dark:text-white tracking-widest">
              {examCode}
            </p>
          </div>
        )}

        <button
          id="copy-stream-link-btn"
          type="button"
          onClick={handleCopy}
          className={`w-full py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-xs sm:text-sm shadow-sm ${
            isProctorTab
              ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-none"
              : "bg-teal-600 hover:bg-teal-700 text-white shadow-teal-200 dark:shadow-none"
          }`}
        >
          <DocumentDuplicateIcon className="w-4 h-4" />
          <span>
            {copied
              ? "Link Berhasil Disalin!"
              : isProctorTab
              ? "Salin Link Pengawas"
              : "Salin Link Orang Tua"}
          </span>
        </button>
      </div>
    </div>
  );
};
