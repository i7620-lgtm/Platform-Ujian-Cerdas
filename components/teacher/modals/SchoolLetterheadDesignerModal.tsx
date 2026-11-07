import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  XMarkIcon,
  CheckCircleIcon,
  PrinterIcon,
  SparklesIcon,
  PhotoIcon,
  ArrowPathIcon,
} from "../../Icons";
import type { TeacherProfile } from "../../../types";
import { SchoolLetterhead } from "../SchoolLetterhead";
import { uploadToCloudinary } from "../../../services/cloudinary";
import { generateDefaultKopAksaraBali } from "../../../utils/aksaraBali";

interface SchoolLetterheadDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: TeacherProfile;
  onSave: (updatedData: Partial<TeacherProfile>) => void;
}

export const SchoolLetterheadDesignerModal: React.FC<
  SchoolLetterheadDesignerModalProps
> = ({ isOpen, onClose, profile, onSave }) => {
  // Form states initialized from profile
  const [isAksaraBaliActive, setIsAksaraBaliActive] = useState<boolean>(
    profile.isAksaraBaliActive ?? true,
  );
  const [dinasPendidikan, setDinasPendidikan] = useState(
    profile.dinasPendidikan || "DINAS PENDIDIKAN KEPEMUDAAN DAN OLAHRAGA",
  );
  const [school, setSchool] = useState(
    profile.school === "-" ? "" : profile.school || "SEKOLAH DASAR NEGERI 2 PADANGSAMBIAN",
  );
  const [regency, setRegency] = useState(
    profile.regency === "-" ? "" : profile.regency || "Kota Denpasar",
  );
  const [alamatSekolah, setAlamatSekolah] = useState(
    profile.alamatSekolah || "Jalan Kebo Iwa Banjar Batuparas",
  );
  const [teleponSekolah, setTeleponSekolah] = useState(
    profile.teleponSekolah || "(0361) 9093558",
  );
  const [npsn, setNpsn] = useState(profile.npsn || "");
  const [emailSekolah, setEmailSekolah] = useState(profile.emailSekolah || "");
  const [websiteSekolah, setWebsiteSekolah] = useState(profile.websiteSekolah || "");

  // Aksara Bali text lines
  const [aksaraBaliPemda, setAksaraBaliPemda] = useState(
    profile.aksaraBaliPemda || "ᬧᭂᬫᭂᬭᬶᬦ᭄ᬢᬄ ᬓᭀᬢ ᬤᬾᬦ᭄ᬧᬲᬃ",
  );
  const [aksaraBaliDinas, setAksaraBaliDinas] = useState(
    profile.aksaraBaliDinas ||
      "ᬤᬶᬦᬲ᭄ ᬧᭂᬦ᭄ᬤᬶᬤᬶᬓᬦ᭄ ᬓᭂᬧᭂᬫᬸᬤᬵᬦ᭄ ᤤᬦ᭄ ᬑᬮᬄᬭᬕ",
  );
  const [aksaraBaliSekolah, setAksaraBaliSekolah] = useState(
    profile.aksaraBaliSekolah ||
      "ᬲᭂᬓᭀᬮᬄ ᬤᬲᬃ ᬦᭂᬕᭂᬭᬶ ᭒ ᬧᬤᬂᬲᬫ᭄ᬩᬶᬬᬦ᭄",
  );
  const [aksaraBaliAlamat, setAksaraBaliAlamat] = useState(
    profile.aksaraBaliAlamat || "ᬚᬮᬦ᭄ ᬓᭂᬩᭀ ᬇᬯ ...",
  );

  // Logo URLs
  const [logoDinasUrl, setLogoDinasUrl] = useState(profile.logoDinasUrl || "");
  const [logoSekolahUrl, setLogoSekolahUrl] = useState(profile.logoSekolahUrl || "");
  const [kopDividerStyle, setKopDividerStyle] = useState<"double" | "single" | "bold">(
    profile.kopDividerStyle || "double",
  );

  // Upload status
  const [uploadingLogo, setUploadingLogo] = useState<"dinas" | "sekolah" | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  // Handle uploading logo directly to Cloudinary
  const handleUploadLogo = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "dinas" | "sekolah",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(type);
    try {
      const secureUrl = await uploadToCloudinary(file, `${type}_logo_${Date.now()}`);
      if (secureUrl) {
        if (type === "dinas") setLogoDinasUrl(secureUrl);
        else setLogoSekolahUrl(secureUrl);
      } else {
        // Fallback to local Data URL if Cloudinary is offline
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          if (type === "dinas") setLogoDinasUrl(result);
          else setLogoSekolahUrl(result);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error("Gagal mengunggah logo:", err);
    } finally {
      setUploadingLogo(null);
    }
  };

  // Re-transliterate from current Latin texts
  const handleAutoTransliterate = () => {
    const generated = generateDefaultKopAksaraBali({
      regency,
      dinasPendidikan,
      school,
      alamatSekolah,
      teleponSekolah,
    });
    setAksaraBaliPemda(generated.aksaraBaliPemda);
    setAksaraBaliDinas(generated.aksaraBaliDinas);
    setAksaraBaliSekolah(generated.aksaraBaliSekolah);
    setAksaraBaliAlamat(generated.aksaraBaliAlamat);
  };

  // Save changes
  const handleSave = () => {
    const updatedData: Partial<TeacherProfile> = {
      isAksaraBaliActive,
      dinasPendidikan: dinasPendidikan.trim(),
      school: school.trim(),
      regency: regency.trim(),
      alamatSekolah: alamatSekolah.trim(),
      teleponSekolah: teleponSekolah.trim(),
      npsn: npsn.trim(),
      emailSekolah: emailSekolah.trim(),
      websiteSekolah: websiteSekolah.trim(),
      aksaraBaliPemda: aksaraBaliPemda.trim(),
      aksaraBaliDinas: aksaraBaliDinas.trim(),
      aksaraBaliSekolah: aksaraBaliSekolah.trim(),
      aksaraBaliAlamat: aksaraBaliAlamat.trim(),
      logoDinasUrl,
      logoSekolahUrl,
      kopDividerStyle,
    };

    onSave(updatedData);
    setSaveSuccess(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const previewOverride: Partial<TeacherProfile> = {
    isAksaraBaliActive,
    dinasPendidikan,
    school,
    regency,
    alamatSekolah,
    teleponSekolah,
    npsn,
    emailSekolah,
    websiteSekolah,
    aksaraBaliPemda,
    aksaraBaliDinas,
    aksaraBaliSekolah,
    aksaraBaliAlamat,
    logoDinasUrl,
    logoSekolahUrl,
    kopDividerStyle,
  };

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[94vh] rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col animate-gentle-slide">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <PrinterIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Desain & Pratinjau Kop Surat Sekolah
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Atur tampilan kop resmi, logo instansi, serta tata letak teks Latin & Aksara Bali.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            title="Tutup Modal"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
          {/* 1. LIVE PREVIEW CARD (Sesuai Screenshot User) */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Pratinjau Kop Surat
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ini adalah tampilan yang akan digunakan saat mencetak naskah soal, kisi-kisi, dan kunci jawaban.
                </p>
              </div>

              {/* Toggle Aksara Bali Button */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Aksara Bali:
                </span>
                <button
                  type="button"
                  onClick={() => setIsAksaraBaliActive(!isAksaraBaliActive)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isAksaraBaliActive
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <SparklesIcon className="w-3.5 h-3.5" />
                  <span>{isAksaraBaliActive ? "Aktif (Dwibahasa)" : "Nonaktif (Latin Saja)"}</span>
                </button>
              </div>
            </div>

            {/* Visual Sheet Preview Box */}
            <div className="p-4 sm:p-6 bg-white border border-slate-200 rounded-xl shadow-xs overflow-x-auto">
              <SchoolLetterhead
                profile={profile}
                overrideData={previewOverride}
                forceAksaraBali={isAksaraBaliActive}
              />
            </div>
          </div>

          {/* 2. UPLOAD LOGO DINAS & SEKOLAH */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Logo Dinas (Kiri) */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <PhotoIcon className="w-4 h-4 text-indigo-500" />
                  <span>Logo Dinas Pendidikan / Pemda (Kiri)</span>
                </label>
                {logoDinasUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoDinasUrl("")}
                    className="text-[10px] text-rose-500 hover:underline cursor-pointer font-semibold"
                  >
                    Hapus Logo
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center overflow-hidden shrink-0">
                  {logoDinasUrl ? (
                    <img src={logoDinasUrl} alt="Logo Dinas" className="w-full h-full object-contain p-1" />
                  ) : (
                    <span className="text-[10px] text-slate-400 text-center font-bold">Kosong</span>
                  )}
                </div>
                <div className="flex-1">
                  <label className="inline-block px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold cursor-pointer transition-colors border border-slate-300 dark:border-slate-600">
                    <span>
                      {uploadingLogo === "dinas" ? "Mengunggah..." : "Pilih Logo Dinas..."}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadLogo(e, "dinas")}
                      className="hidden"
                      disabled={uploadingLogo !== null}
                    />
                  </label>
                  <p className="text-[10px] text-slate-400 mt-1">PNG, JPG, atau WebP (Transparan disarankan)</p>
                </div>
              </div>
            </div>

            {/* Logo Sekolah (Kanan) */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <PhotoIcon className="w-4 h-4 text-emerald-500" />
                  <span>Logo Sekolah / Tut Wuri (Kanan)</span>
                </label>
                {logoSekolahUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoSekolahUrl("")}
                    className="text-[10px] text-rose-500 hover:underline cursor-pointer font-semibold"
                  >
                    Hapus Logo
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center overflow-hidden shrink-0">
                  {logoSekolahUrl ? (
                    <img src={logoSekolahUrl} alt="Logo Sekolah" className="w-full h-full object-contain p-1" />
                  ) : (
                    <span className="text-[10px] text-slate-400 text-center font-bold">Kosong</span>
                  )}
                </div>
                <div className="flex-1">
                  <label className="inline-block px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold cursor-pointer transition-colors border border-slate-300 dark:border-slate-600">
                    <span>
                      {uploadingLogo === "sekolah" ? "Mengunggah..." : "Pilih Logo Sekolah..."}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadLogo(e, "sekolah")}
                      className="hidden"
                      disabled={uploadingLogo !== null}
                    />
                  </label>
                  <p className="text-[10px] text-slate-400 mt-1">PNG, JPG, atau WebP (Transparan disarankan)</p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. EDITOR BARIS TEKS LATIN & AKSARA BALI */}
          <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                  Pengaturan Teks Tiap Baris Kop Surat
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Sunting teks Latin dan Aksara Bali secara langsung untuk hasil cetak yang akurat.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAutoTransliterate}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer"
                title="Transliterasi ulang seluruh baris aksara Bali dari teks Latin di bawah ini"
              >
                <ArrowPathIcon className="w-3.5 h-3.5" />
                <span>Otomatiskan Aksara Bali</span>
              </button>
            </div>

            {/* Baris 1: Pemerintah Daerah */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Baris 1: Wilayah / Pemda (Latin)
                </label>
                <input
                  type="text"
                  value={regency}
                  onChange={(e) => setRegency(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 outline-none focus:border-indigo-500"
                  placeholder="Contoh: Kota Denpasar"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Baris 1: Aksara Bali Pemda
                </label>
                <input
                  type="text"
                  value={aksaraBaliPemda}
                  onChange={(e) => setAksaraBaliPemda(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 outline-none focus:border-indigo-500"
                  style={{ fontFamily: "'Noto Sans Balinese', sans-serif" }}
                  placeholder="ᬧᭂᬫᭂᬭᬶᬦ᭄ᬢᬄ ᬓᭀᬢ ᬤᬾᬦ᭄ᬧᬲᬃ"
                />
              </div>
            </div>

            {/* Baris 2: Dinas Pendidikan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Baris 2: Dinas Pendidikan (Latin)
                </label>
                <input
                  type="text"
                  value={dinasPendidikan}
                  onChange={(e) => setDinasPendidikan(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 outline-none focus:border-indigo-500"
                  placeholder="DINAS PENDIDIKAN KEPEMUDAAN DAN OLAHRAGA"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Baris 2: Aksara Bali Dinas
                </label>
                <input
                  type="text"
                  value={aksaraBaliDinas}
                  onChange={(e) => setAksaraBaliDinas(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 outline-none focus:border-indigo-500"
                  style={{ fontFamily: "'Noto Sans Balinese', sans-serif" }}
                  placeholder="ᬤᬶᬦᬲ᭄ ᬧᭂᬦ᭄ᬤᬶᬤᬶᬓᬦ᭄ ..."
                />
              </div>
            </div>

            {/* Baris 3: Nama Sekolah */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Baris 3: Nama Satuan Pendidikan / Sekolah (Latin)
                </label>
                <input
                  type="text"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 outline-none focus:border-indigo-500"
                  placeholder="SEKOLAH DASAR NEGERI 2 PADANGSAMBIAN"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Baris 3: Aksara Bali Nama Sekolah
                </label>
                <input
                  type="text"
                  value={aksaraBaliSekolah}
                  onChange={(e) => setAksaraBaliSekolah(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 outline-none focus:border-indigo-500"
                  style={{ fontFamily: "'Noto Sans Balinese', sans-serif" }}
                  placeholder="ᬲᭂᬓᭀᬮᬄ ᬤᬲᬃ ᬦᭂᬕᭂᬭᬶ ..."
                />
              </div>
            </div>

            {/* Baris 4: Alamat & Kontak */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Baris 4: Alamat & Kontak (Latin)
                </label>
                <input
                  type="text"
                  value={alamatSekolah}
                  onChange={(e) => setAlamatSekolah(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 mt-1 outline-none focus:border-indigo-500"
                  placeholder="Jalan Kebo Iwa Banjar Batuparas"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Baris 4: Aksara Bali Alamat & Kontak
                </label>
                <input
                  type="text"
                  value={aksaraBaliAlamat}
                  onChange={(e) => setAksaraBaliAlamat(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 outline-none focus:border-indigo-500"
                  style={{ fontFamily: "'Noto Sans Balinese', sans-serif" }}
                  placeholder="ᬚᬮᬦ᭄ ᬓᭂᬩᭀ ᬇᬯ ..."
                />
              </div>
            </div>

            {/* Divider Style Picker */}
            <div className="pt-2">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Gaya Garis Pembatas Kop Surat:
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setKopDividerStyle("double")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    kopDividerStyle === "double"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                  }`}
                >
                  Resmi Ganda (Tebal-Tipis Standar Kedinasan)
                </button>
                <button
                  type="button"
                  onClick={() => setKopDividerStyle("single")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    kopDividerStyle === "single"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                  }`}
                >
                  Garis Tunggal Halus
                </button>
                <button
                  type="button"
                  onClick={() => setKopDividerStyle("bold")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    kopDividerStyle === "bold"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                  }`}
                >
                  Garis Tebal Tunggal
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {saveSuccess ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircleIcon className="w-4 h-4" /> Desain kop sekolah berhasil disimpan!
              </span>
            ) : (
              <span>Pengaturan kop surat akan langsung diterapkan ke dokumen cetak.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircleIcon className="w-4 h-4" />
              <span>Simpan Desain Kop</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
