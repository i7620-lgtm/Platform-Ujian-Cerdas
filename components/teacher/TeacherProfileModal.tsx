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
} from "../Icons";
import type { TeacherProfile, NipType } from "../../types";
import { storageService } from "../../services/storage";

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
  const [fullName, setFullName] = useState("");
  const [nip, setNip] = useState("");
  const [nipType, setNipType] = useState<NipType>("NIP");
  const [headmasterName, setHeadmasterName] = useState("");
  const [headmasterNip, setHeadmasterNip] = useState("");
  const [headmasterNipType, setHeadmasterNipType] = useState<NipType>("NIP");
  const [school, setSchool] = useState("");
  const [regency, setRegency] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
      setRegency(profile.regency === "-" ? "" : profile.regency || "");
      setEmail(profile.email || "");
      setNewPassword("");
      setError("");
      setSuccessMsg("");
      setIsLoading(false);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !school.trim()) {
      setError("Nama Lengkap dan Nama Sekolah wajib diisi.");
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
        regency: regency.trim(),
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
      setSuccessMsg("Profil berhasil diperbarui!");
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

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[92vh] rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col animate-gentle-slide">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Pengaturan Profil & Pejabat Sekolah
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kelola identitas guru, kepala sekolah untuk pengesahan kisi-kisi, dan akun.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            title="Tutup Modal"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar">
          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
              <CheckCircleIcon className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 1: Guru / Pendidik */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-3.5">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <AcademicCapIcon className="w-4 h-4" />
              <h3 className="text-xs font-black uppercase tracking-wider">
                1. Identitas Guru / Pengampu
              </h3>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 ml-1">
                Nama Lengkap & Gelar <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl outline-none mt-1 text-xs font-bold text-slate-800 dark:text-slate-200 transition-all placeholder:text-slate-400"
                placeholder="Masukkan nama lengkap & gelar"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 ml-1">
                  Jenis Identitas
                </label>
                <div className="flex items-center gap-1.5 mt-1 p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setNipType("NIP")}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      nipType === "NIP"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    NIP (PNS)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNipType("NIPPPK")}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      nipType === "NIPPPK"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    NIPPPK
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 ml-1">
                  Nomor {nipType} Guru
                </label>
                <input
                  type="text"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl outline-none mt-1 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 transition-all placeholder:text-slate-400"
                  placeholder={`Masukkan nomor ${nipType} Anda (opsional)`}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Kepala Sekolah */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/40 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <ShieldCheckIcon className="w-4 h-4" />
                <h3 className="text-xs font-black uppercase tracking-wider">
                  2. Kepala Sekolah (Pengesahan Kisi-Kisi & Laporan)
                </h3>
              </div>
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-900/40 px-2 py-0.5 rounded-md">
                Otomatis di Kisi-Kisi
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Data ini akan otomatis dicetak pada kolom pengesahan &quot;Mengetahui Kepala Sekolah&quot; di naskah Kisi-Kisi Soal dan lembar laporan resmi.
            </p>

            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 ml-1">
                Nama Kepala Sekolah & Gelar
              </label>
              <input
                type="text"
                value={headmasterName}
                onChange={(e) => setHeadmasterName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl outline-none mt-1 text-xs font-bold text-slate-800 dark:text-slate-200 transition-all placeholder:text-slate-400"
                placeholder="Masukkan nama Kepala Sekolah"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 ml-1">
                  Jenis Identitas Kasek
                </label>
                <div className="flex items-center gap-1.5 mt-1 p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setHeadmasterNipType("NIP")}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      headmasterNipType === "NIP"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    NIP (PNS)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeadmasterNipType("NIPPPK")}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      headmasterNipType === "NIPPPK"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    NIPPPK
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 ml-1">
                  Nomor {headmasterNipType} Kepala Sekolah
                </label>
                <input
                  type="text"
                  value={headmasterNip}
                  onChange={(e) => setHeadmasterNip(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl outline-none mt-1 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 transition-all placeholder:text-slate-400"
                  placeholder={`Masukkan nomor ${headmasterNipType} Kepala Sekolah`}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Instansi Pendidikan */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-3.5">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <MapPinIcon className="w-4 h-4" />
              <h3 className="text-xs font-black uppercase tracking-wider">
                3. Instansi Pendidikan
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 ml-1">
                  Nama Asal Sekolah <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl outline-none mt-1 text-xs font-bold text-slate-800 dark:text-slate-200 transition-all placeholder:text-slate-400"
                  placeholder="Masukkan nama sekolah"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 ml-1">
                  Kabupaten / Kota
                </label>
                <input
                  type="text"
                  value={regency}
                  onChange={(e) => setRegency(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl outline-none mt-1 text-xs font-bold text-slate-800 dark:text-slate-200 transition-all placeholder:text-slate-400"
                  placeholder="Masukkan kabupaten/kota"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Kredensial Akun */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-3.5">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <LockClosedIcon className="w-4 h-4" />
              <h3 className="text-xs font-black uppercase tracking-wider">
                4. Kredensial Akun (Email & Password)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 ml-1">
                  Email Akun
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl outline-none mt-1 text-xs font-bold text-slate-800 dark:text-slate-200 transition-all placeholder:text-slate-400"
                  placeholder="nama@guru.sd.belajar.id"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 ml-1">
                  Password Baru (Opsional)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl outline-none mt-1 text-xs font-bold text-slate-800 dark:text-slate-200 transition-all placeholder:text-slate-400"
                  placeholder="Kosongkan jika tidak diubah"
                />
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="pt-2 flex items-center justify-end gap-3 sticky bottom-0 bg-white dark:bg-slate-900 pb-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
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
      </div>
    </div>,
    document.body
  );
};
