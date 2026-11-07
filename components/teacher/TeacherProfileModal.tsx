import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  UserIcon,
  XMarkIcon,
  CheckCircleIcon,
  AcademicCapIcon,
  ShieldCheckIcon,
  MapPinIcon,
  LockClosedIcon,
  PhotoIcon,
  SparklesIcon,
  PrinterIcon,
} from "../Icons";
import type { TeacherProfile, NipType } from "../../types";
import { storageService } from "../../services/storage";
import { uploadToCloudinary } from "../../services/cloudinary";
import { processImageOuterTransparency } from "../../utils/imageTransparency";
import { SchoolLetterheadDesignerModal } from "./modals/SchoolLetterheadDesignerModal";

function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

interface TeacherProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: TeacherProfile;
  onComplete: (updatedProfile: TeacherProfile) => void;
}

export const TeacherProfileModal: React.FC<TeacherProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onComplete,
}) => {
  // 1. Identitas Guru
  const [fullName, setFullName] = useState("");
  const [nip, setNip] = useState("");
  const [nipType, setNipType] = useState<NipType>("NIP");

  // 2. Kepala Sekolah
  const [headmasterName, setHeadmasterName] = useState("");
  const [headmasterNip, setHeadmasterNip] = useState("");
  const [headmasterNipType, setHeadmasterNipType] = useState<NipType>("NIP");

  // 3. Instansi Pendidikan & Kop Sekolah
  const [school, setSchool] = useState("");
  const [npsn, setNpsn] = useState("");
  const [dinasPendidikan, setDinasPendidikan] = useState("");
  const [alamatSekolah, setAlamatSekolah] = useState("");
  const [desaKelurahan, setDesaKelurahan] = useState("");
  const [kecamatan, setKecamatan] = useState("");
  const [regency, setRegency] = useState("");
  const [provinsi, setProvinsi] = useState("");
  const [kodePos, setKodePos] = useState("");
  const [emailSekolah, setEmailSekolah] = useState("");
  const [teleponSekolah, setTeleponSekolah] = useState("");
  const [websiteSekolah, setWebsiteSekolah] = useState("");
  const [faksimile, setFaksimile] = useState("");
  const [logoSekolahUrl, setLogoSekolahUrl] = useState("");
  const [logoDinasUrl, setLogoDinasUrl] = useState("");
  const [isAksaraBaliActive, setIsAksaraBaliActive] = useState<boolean>(true);
  const [aksaraBaliPemda, setAksaraBaliPemda] = useState("");
  const [aksaraBaliDinas, setAksaraBaliDinas] = useState("");
  const [aksaraBaliSekolah, setAksaraBaliSekolah] = useState("");
  const [aksaraBaliAlamat, setAksaraBaliAlamat] = useState("");
  const [kopDividerStyle, setKopDividerStyle] = useState<"double" | "single" | "bold">("double");

  // 4. Kredensial Akun
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState<"sekolah" | "dinas" | null>(null);
  const [isDesignerModalOpen, setIsDesignerModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (isOpen && profile) {
      setFullName(profile.fullName === "Pengguna" ? "" : profile.fullName || "");
      setNip(profile.nip || "");
      setNipType(profile.nipType || "NIP");

      setHeadmasterName(profile.headmasterName || "");
      setHeadmasterNip(profile.headmasterNip || "");
      setHeadmasterNipType(profile.headmasterNipType || "NIP");

      setSchool(profile.school === "-" ? "" : profile.school || "");
      setNpsn(profile.npsn || "");
      setDinasPendidikan(profile.dinasPendidikan || "DINAS PENDIDIKAN KEPEMUDAAN DAN OLAHRAGA");
      setAlamatSekolah(profile.alamatSekolah || "");
      setDesaKelurahan(profile.desaKelurahan || "");
      setKecamatan(profile.kecamatan || "");
      setRegency(profile.regency === "-" ? "" : profile.regency || "");
      setProvinsi(profile.provinsi || "Bali");
      setKodePos(profile.kodePos || "");
      setEmailSekolah(profile.emailSekolah || "");
      setTeleponSekolah(profile.teleponSekolah || "");
      setWebsiteSekolah(profile.websiteSekolah || "");
      setFaksimile(profile.faksimile || "");
      setLogoSekolahUrl(profile.logoSekolahUrl || "");
      setLogoDinasUrl(profile.logoDinasUrl || "");
      setIsAksaraBaliActive(profile.isAksaraBaliActive ?? true);
      setAksaraBaliPemda(profile.aksaraBaliPemda || "");
      setAksaraBaliDinas(profile.aksaraBaliDinas || "");
      setAksaraBaliSekolah(profile.aksaraBaliSekolah || "");
      setAksaraBaliAlamat(profile.aksaraBaliAlamat || "");
      setKopDividerStyle(profile.kopDividerStyle || "double");

      setEmail(profile.email || "");
      setNewPassword("");
      setError("");
      setSuccessMsg("");
      setIsLoading(false);
      setUploadingLogo(null);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  // Handle Cloudinary upload for logos with outer background transparency
  const handleUploadLogo = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "sekolah" | "dinas",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(type);
    try {
      const transparentDataUrl = await processImageOuterTransparency(file);
      const transparentFile = dataURLtoFile(transparentDataUrl, `${type}_logo_${Date.now()}.png`);

      const secureUrl = await uploadToCloudinary(transparentFile, `${type}_logo_${Date.now()}`);
      if (secureUrl) {
        if (type === "sekolah") setLogoSekolahUrl(secureUrl);
        else setLogoDinasUrl(secureUrl);
      } else {
        if (type === "sekolah") setLogoSekolahUrl(transparentDataUrl);
        else setLogoDinasUrl(transparentDataUrl);
      }
    } catch (err) {
      console.error("Gagal mengunggah logo:", err);
    } finally {
      setUploadingLogo(null);
    }
  };

  // Callback from SchoolLetterheadDesignerModal
  const handleDesignerSave = (updatedKopData: Partial<TeacherProfile>) => {
    if (updatedKopData.isAksaraBaliActive !== undefined)
      setIsAksaraBaliActive(updatedKopData.isAksaraBaliActive);
    if (updatedKopData.dinasPendidikan !== undefined)
      setDinasPendidikan(updatedKopData.dinasPendidikan);
    if (updatedKopData.school !== undefined) setSchool(updatedKopData.school);
    if (updatedKopData.regency !== undefined) setRegency(updatedKopData.regency);
    if (updatedKopData.alamatSekolah !== undefined)
      setAlamatSekolah(updatedKopData.alamatSekolah);
    if (updatedKopData.teleponSekolah !== undefined)
      setTeleponSekolah(updatedKopData.teleponSekolah);
    if (updatedKopData.npsn !== undefined) setNpsn(updatedKopData.npsn);
    if (updatedKopData.emailSekolah !== undefined)
      setEmailSekolah(updatedKopData.emailSekolah);
    if (updatedKopData.websiteSekolah !== undefined)
      setWebsiteSekolah(updatedKopData.websiteSekolah);
    if (updatedKopData.aksaraBaliPemda !== undefined)
      setAksaraBaliPemda(updatedKopData.aksaraBaliPemda);
    if (updatedKopData.aksaraBaliDinas !== undefined)
      setAksaraBaliDinas(updatedKopData.aksaraBaliDinas);
    if (updatedKopData.aksaraBaliSekolah !== undefined)
      setAksaraBaliSekolah(updatedKopData.aksaraBaliSekolah);
    if (updatedKopData.aksaraBaliAlamat !== undefined)
      setAksaraBaliAlamat(updatedKopData.aksaraBaliAlamat);
    if (updatedKopData.logoDinasUrl !== undefined)
      setLogoDinasUrl(updatedKopData.logoDinasUrl);
    if (updatedKopData.logoSekolahUrl !== undefined)
      setLogoSekolahUrl(updatedKopData.logoSekolahUrl);
    if (updatedKopData.kopDividerStyle !== undefined)
      setKopDividerStyle(updatedKopData.kopDividerStyle);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !school.trim()) {
      setError("Nama Lengkap Guru dan Nama Sekolah wajib diisi.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const updates: Partial<TeacherProfile> & { password?: string } = {
        fullName: fullName.trim(),
        nip: nip.trim(),
        nipType,
        headmasterName: headmasterName.trim(),
        headmasterNip: headmasterNip.trim(),
        headmasterNipType,
        school: school.trim(),
        npsn: npsn.trim(),
        dinasPendidikan: dinasPendidikan.trim(),
        alamatSekolah: alamatSekolah.trim(),
        desaKelurahan: desaKelurahan.trim(),
        kecamatan: kecamatan.trim(),
        regency: regency.trim(),
        provinsi: provinsi.trim(),
        kodePos: kodePos.trim(),
        emailSekolah: emailSekolah.trim(),
        teleponSekolah: teleponSekolah.trim(),
        websiteSekolah: websiteSekolah.trim(),
        faksimile: faksimile.trim(),
        logoSekolahUrl,
        logoDinasUrl,
        isAksaraBaliActive,
        aksaraBaliPemda: aksaraBaliPemda.trim(),
        aksaraBaliDinas: aksaraBaliDinas.trim(),
        aksaraBaliSekolah: aksaraBaliSekolah.trim(),
        aksaraBaliAlamat: aksaraBaliAlamat.trim(),
        kopDividerStyle,
        accountType: profile.accountType,
      };

      if (email.trim() && email.trim() !== profile.email) {
        updates.email = email.trim();
      }

      if (newPassword.trim().length > 0) {
        if (newPassword.trim().length < 6) {
          throw new Error("Password baru minimal harus terdiri dari 6 karakter.");
        }
        updates.password = newPassword.trim();
      }

      await storageService.updateTeacherProfile(profile.id, updates);

      const updatedProfile: TeacherProfile = {
        ...profile,
        ...updates,
      };

      onComplete(updatedProfile);
      setSuccessMsg("Profil dan pengaturan kop sekolah berhasil disimpan!");
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || "Gagal memperbarui profil.");
    } finally {
      setIsLoading(false);
    }
  };

  const currentProfileData: TeacherProfile = {
    ...profile,
    school,
    regency,
    dinasPendidikan,
    npsn,
    alamatSekolah,
    desaKelurahan,
    kecamatan,
    provinsi,
    kodePos,
    emailSekolah,
    teleponSekolah,
    websiteSekolah,
    faksimile,
    logoSekolahUrl,
    logoDinasUrl,
    isAksaraBaliActive,
    aksaraBaliPemda,
    aksaraBaliDinas,
    aksaraBaliSekolah,
    aksaraBaliAlamat,
    kopDividerStyle,
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[94vh] rounded-2xl sm:rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col animate-gentle-slide">
        {/* Header Modal - Compact */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
              <UserIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                Profil Guru, Pejabat & Instansi Pendidikan
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                Kelola identitas pendidik, kepala sekolah, dan data resmi kop surat sekolah.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            title="Tutup Modal"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body - Vertically Compact */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3.5 custom-scrollbar"
        >
          {error && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
              <CheckCircleIcon className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 1: Identitas Guru / Pengampu */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
              <AcademicCapIcon className="w-4 h-4" />
              <h3 className="text-xs font-black uppercase tracking-wider">
                1. Identitas Guru / Pengampu
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-6">
                <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300 ml-0.5">
                  Nama Lengkap & Gelar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 rounded-lg outline-none mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-200"
                  placeholder="Masukkan nama lengkap & gelar"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300 ml-0.5">
                  Identitas
                </label>
                <div className="flex items-center gap-1 mt-0.5 p-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setNipType("NIP")}
                    className={`flex-1 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                      nipType === "NIP"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    NIP
                  </button>
                  <button
                    type="button"
                    onClick={() => setNipType("NIPPPK")}
                    className={`flex-1 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                      nipType === "NIPPPK"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    NIPPPK
                  </button>
                </div>
              </div>

              <div className="sm:col-span-4">
                <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300 ml-0.5">
                  Nomor {nipType} Guru
                </label>
                <input
                  type="text"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 rounded-lg outline-none mt-0.5 text-xs font-mono font-bold text-slate-800 dark:text-slate-200"
                  placeholder={`Masukkan nomor ${nipType} Anda (opsional)`}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Kepala Sekolah */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-amber-50/40 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                <ShieldCheckIcon className="w-4 h-4" />
                <h3 className="text-xs font-black uppercase tracking-wider">
                  2. Kepala Sekolah (Pengesahan Dokumen)
                </h3>
              </div>
              <span className="text-[9.5px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-900/40 px-2 py-0.5 rounded">
                Otomatis di Kisi-Kisi
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-6">
                <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300 ml-0.5">
                  Nama Kepala Sekolah & Gelar
                </label>
                <input
                  type="text"
                  value={headmasterName}
                  onChange={(e) => setHeadmasterName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-amber-500 rounded-lg outline-none mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-200"
                  placeholder="Masukkan nama Kepala Sekolah"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300 ml-0.5">
                  Identitas Kasek
                </label>
                <div className="flex items-center gap-1 mt-0.5 p-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setHeadmasterNipType("NIP")}
                    className={`flex-1 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                      headmasterNipType === "NIP"
                        ? "bg-amber-600 text-white"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    NIP
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeadmasterNipType("NIPPPK")}
                    className={`flex-1 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                      headmasterNipType === "NIPPPK"
                        ? "bg-amber-600 text-white"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    NIPPPK
                  </button>
                </div>
              </div>

              <div className="sm:col-span-4">
                <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300 ml-0.5">
                  Nomor {headmasterNipType} Kepala Sekolah
                </label>
                <input
                  type="text"
                  value={headmasterNip}
                  onChange={(e) => setHeadmasterNip(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-amber-500 rounded-lg outline-none mt-0.5 text-xs font-mono font-bold text-slate-800 dark:text-slate-200"
                  placeholder={`Masukkan nomor ${headmasterNipType} Kepala Sekolah`}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Instansi Pendidikan & Kop Sekolah (Compact Grid) */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <MapPinIcon className="w-4 h-4" />
                <h3 className="text-xs font-black uppercase tracking-wider">
                  3. Instansi Pendidikan & Kop Sekolah
                </h3>
              </div>

              {/* Action Buttons for Kop */}
              <div className="flex items-center gap-2">
                {/* Switch Aksara Bali */}
                <button
                  type="button"
                  onClick={() => setIsAksaraBaliActive(!isAksaraBaliActive)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                    isAksaraBaliActive
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/50 dark:border-indigo-800 dark:text-indigo-300"
                      : "bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                  }`}
                  title="Aktifkan atau nonaktifkan tampilan Aksara Bali pada Kop Sekolah"
                >
                  <SparklesIcon className="w-3 h-3" />
                  <span>Aksara Bali: {isAksaraBaliActive ? "Aktif" : "Nonaktif"}</span>
                </button>

                {/* Tombol Desain Kop Sekolah */}
                <button
                  type="button"
                  onClick={() => setIsDesignerModalOpen(true)}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Buka perancang interaktif dan pratinjau live kop sekolah"
                >
                  <PrinterIcon className="w-3 h-3" />
                  <span>Desain Kop Sekolah</span>
                </button>
              </div>
            </div>

            {/* Grid 1: Nama Sekolah & NPSN */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-8">
                <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300 ml-0.5">
                  Nama Asal Sekolah <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 rounded-lg outline-none mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-200"
                  placeholder="Masukkan nama sekolah"
                  required
                />
              </div>

              <div className="sm:col-span-4">
                <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300 ml-0.5">
                  NPSN
                </label>
                <input
                  type="text"
                  value={npsn}
                  onChange={(e) => setNpsn(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 rounded-lg outline-none mt-0.5 text-xs font-mono font-bold text-slate-800 dark:text-slate-200"
                  placeholder="Contoh: 50103123"
                />
              </div>
            </div>

            {/* Grid 2: Nama Dinas Pendidikan & Alamat */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-6">
                <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300 ml-0.5">
                  Nama Dinas Pendidikan
                </label>
                <input
                  type="text"
                  value={dinasPendidikan}
                  onChange={(e) => setDinasPendidikan(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 rounded-lg outline-none mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-200"
                  placeholder="DINAS PENDIDIKAN KEPEMUDAAN DAN OLAHRAGA"
                />
              </div>

              <div className="sm:col-span-6">
                <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300 ml-0.5">
                  Alamat Sekolah (Jalan / Banjar)
                </label>
                <input
                  type="text"
                  value={alamatSekolah}
                  onChange={(e) => setAlamatSekolah(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 rounded-lg outline-none mt-0.5 text-xs text-slate-800 dark:text-slate-200"
                  placeholder="Contoh: Jalan Kebo Iwa Banjar Batuparas"
                />
              </div>
            </div>

            {/* Grid 3: Desa/Kel, Kecamatan, Kab/Kota, Provinsi, Kode Pos */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 ml-0.5">
                  Desa / Kelurahan
                </label>
                <input
                  type="text"
                  value={desaKelurahan}
                  onChange={(e) => setDesaKelurahan(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs mt-0.5 outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-200"
                  placeholder="Padangsambian"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 ml-0.5">
                  Kecamatan
                </label>
                <input
                  type="text"
                  value={kecamatan}
                  onChange={(e) => setKecamatan(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs mt-0.5 outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-200"
                  placeholder="Denpasar Barat"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 ml-0.5">
                  Kabupaten / Kota
                </label>
                <input
                  type="text"
                  value={regency}
                  onChange={(e) => setRegency(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold mt-0.5 outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-200"
                  placeholder="Masukkan kabupaten/kota"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 ml-0.5">
                  Provinsi
                </label>
                <input
                  type="text"
                  value={provinsi}
                  onChange={(e) => setProvinsi(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs mt-0.5 outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-200"
                  placeholder="Bali"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 ml-0.5">
                  Kode Pos
                </label>
                <input
                  type="text"
                  value={kodePos}
                  onChange={(e) => setKodePos(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono mt-0.5 outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-200"
                  placeholder="80118"
                />
              </div>
            </div>

            {/* Grid 4: Kontak (Email Sekolah, Telepon, Website, Faksimile) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 ml-0.5">
                  Email Sekolah
                </label>
                <input
                  type="email"
                  value={emailSekolah}
                  onChange={(e) => setEmailSekolah(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs mt-0.5 outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-200"
                  placeholder="sdn2padangsambian@gmail.com"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 ml-0.5">
                  Telepon Sekolah
                </label>
                <input
                  type="text"
                  value={teleponSekolah}
                  onChange={(e) => setTeleponSekolah(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs mt-0.5 outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-200"
                  placeholder="(0361) 9093558"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 ml-0.5">
                  Website Sekolah
                </label>
                <input
                  type="text"
                  value={websiteSekolah}
                  onChange={(e) => setWebsiteSekolah(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs mt-0.5 outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-200"
                  placeholder="https://sdn2padangsambian.sch.id"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 ml-0.5">
                  Faksimile (Opsional)
                </label>
                <input
                  type="text"
                  value={faksimile}
                  onChange={(e) => setFaksimile(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs mt-0.5 outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-200"
                  placeholder="Nomor Fax"
                />
              </div>
            </div>

            {/* Grid 5: Upload Logo Dinas & Logo Sekolah */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              {/* Logo Dinas */}
              <div className="flex items-center gap-2.5 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                <label
                  className="relative w-10 h-10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/70 dark:hover:bg-slate-700 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer group transition-colors"
                  title="Klik untuk memilih logo Dinas / Pemda"
                >
                  {logoDinasUrl ? (
                    <img src={logoDinasUrl} alt="Logo Dinas" className="w-full h-full object-contain p-0.5 group-hover:opacity-75 transition-opacity" />
                  ) : (
                    <PhotoIcon className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUploadLogo(e, "dinas")}
                    className="hidden"
                    disabled={uploadingLogo !== null}
                  />
                </label>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <label
                      className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300 truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
                      title="Klik untuk memilih logo"
                    >
                      Logo Dinas Pendidikan / Pemda
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleUploadLogo(e, "dinas")}
                        className="hidden"
                        disabled={uploadingLogo !== null}
                      />
                    </label>
                    {logoDinasUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoDinasUrl("")}
                        className="text-[9.5px] text-rose-500 hover:underline cursor-pointer ml-1 shrink-0"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                  {uploadingLogo === "dinas" ? (
                    <span className="inline-block mt-0.5 text-[9.5px] font-bold text-indigo-600 dark:text-indigo-400 animate-pulse">
                      Mengunggah...
                    </span>
                  ) : (
                    <p className="text-[9.5px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {logoDinasUrl ? "Klik logo untuk mengganti" : "Klik untuk memilih gambar"}
                    </p>
                  )}
                </div>
              </div>

              {/* Logo Sekolah */}
              <div className="flex items-center gap-2.5 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                <label
                  className="relative w-10 h-10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/70 dark:hover:bg-slate-700 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer group transition-colors"
                  title="Klik untuk memilih logo Sekolah / Tut Wuri"
                >
                  {logoSekolahUrl ? (
                    <img src={logoSekolahUrl} alt="Logo Sekolah" className="w-full h-full object-contain p-0.5 group-hover:opacity-75 transition-opacity" />
                  ) : (
                    <PhotoIcon className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUploadLogo(e, "sekolah")}
                    className="hidden"
                    disabled={uploadingLogo !== null}
                  />
                </label>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <label
                      className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300 truncate cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400"
                      title="Klik untuk memilih logo"
                    >
                      Logo Sekolah / Tut Wuri
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleUploadLogo(e, "sekolah")}
                        className="hidden"
                        disabled={uploadingLogo !== null}
                      />
                    </label>
                    {logoSekolahUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoSekolahUrl("")}
                        className="text-[9.5px] text-rose-500 hover:underline cursor-pointer ml-1 shrink-0"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                  {uploadingLogo === "sekolah" ? (
                    <span className="inline-block mt-0.5 text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 animate-pulse">
                      Mengunggah...
                    </span>
                  ) : (
                    <p className="text-[9.5px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {logoSekolahUrl ? "Klik logo untuk mengganti" : "Klik untuk memilih gambar"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Kredensial Akun */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
              <LockClosedIcon className="w-4 h-4" />
              <h3 className="text-xs font-black uppercase tracking-wider">
                4. Kredensial Akun (Email & Password)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300 ml-0.5">
                  Email Akun
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-purple-500 rounded-lg outline-none mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-200"
                  placeholder="nama@guru.sd.belajar.id"
                />
              </div>

              <div>
                <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300 ml-0.5">
                  Password Baru (Opsional)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-purple-500 rounded-lg outline-none mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-200"
                  placeholder="Kosongkan jika tidak diubah"
                />
              </div>
            </div>
          </div>

          {/* Form Actions Footer - Sticky */}
          <div className="pt-2 flex items-center justify-end gap-2.5 sticky bottom-0 bg-white dark:bg-slate-900 pb-1 z-10 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Modal Desainer Kop Sekolah Terintegrasi */}
        {isDesignerModalOpen && (
          <SchoolLetterheadDesignerModal
            isOpen={isDesignerModalOpen}
            onClose={() => setIsDesignerModalOpen(false)}
            profile={currentProfileData}
            onSave={handleDesignerSave}
          />
        )}
      </div>
    </div>,
    document.body,
  );
};
