import React from "react";
import type { TeacherProfile } from "../../types";
import { transliterateToAksaraBali } from "../../utils/aksaraBali";

interface SchoolLetterheadProps {
  profile?: TeacherProfile | null;
  // Overrides if called from interactive designer or custom exam config
  overrideData?: Partial<TeacherProfile>;
  // Force active state of Balinese script
  forceAksaraBali?: boolean;
  className?: string;
}

export const SchoolLetterhead: React.FC<SchoolLetterheadProps> = ({
  profile,
  overrideData,
  forceAksaraBali,
  className = "",
}) => {
  const merged: Partial<TeacherProfile> = {
    ...profile,
    ...overrideData,
  };

  const isAksaraBali =
    forceAksaraBali !== undefined
      ? forceAksaraBali
      : merged.isAksaraBaliActive ?? true;

  // Determine line texts
  const regency = merged.regency || "Kota Denpasar";
  const pemdaText =
    regency.toUpperCase().startsWith("PEMERINTAH") ||
    regency.toUpperCase().startsWith("KABUPATEN") ||
    regency.toUpperCase().startsWith("KOTA")
      ? regency.toUpperCase().startsWith("PEMERINTAH")
        ? regency.toUpperCase()
        : `PEMERINTAH ${regency.toUpperCase()}`
      : `PEMERINTAH KABUPATEN ${regency.toUpperCase()}`;

  const dinasText =
    merged.dinasPendidikan || "DINAS PENDIDIKAN KEPEMUDAAN DAN OLAHRAGA";
  const schoolText =
    merged.school || "SEKOLAH DASAR NEGERI 2 PADANGSAMBIAN";

  // Address formatting (2nd line from bottom - WITH Aksara Bali)
  const addressParts: string[] = [];
  if (merged.alamatSekolah) addressParts.push(merged.alamatSekolah);
  if (merged.desaKelurahan) addressParts.push(`Desa/Kel. ${merged.desaKelurahan}`);
  if (merged.kecamatan) addressParts.push(`Kec. ${merged.kecamatan}`);
  if (merged.kodePos) addressParts.push(`Kode Pos: ${merged.kodePos}`);

  const alamatText =
    addressParts.length > 0
      ? addressParts.join(", ")
      : "Jalan Kebo Iwa Banjar Batuparas";

  // Contact formatting (Bottom-most line - WITHOUT Aksara Bali)
  const contactParts: string[] = [];
  if (merged.teleponSekolah) contactParts.push(`Telepon: ${merged.teleponSekolah}`);
  if (merged.faksimile) contactParts.push(`Faks: ${merged.faksimile}`);
  if (merged.emailSekolah) contactParts.push(`Email: ${merged.emailSekolah}`);
  if (merged.websiteSekolah) contactParts.push(`Website: ${merged.websiteSekolah}`);
  if (merged.npsn) contactParts.push(`NPSN: ${merged.npsn}`);

  const kontakText =
    contactParts.length > 0
      ? contactParts.join(" | ")
      : "Telepon: (0361) 9093558";

  // Aksara Bali texts (user customized or auto-transliterated ONLY for address line)
  const aksaraPemda =
    merged.aksaraBaliPemda || transliterateToAksaraBali(pemdaText);
  const aksaraDinas =
    merged.aksaraBaliDinas || transliterateToAksaraBali(dinasText);
  const aksaraSekolah =
    merged.aksaraBaliSekolah || transliterateToAksaraBali(schoolText);
  const aksaraAlamat =
    merged.aksaraBaliAlamat || transliterateToAksaraBali(alamatText);

  const dividerStyle = merged.kopDividerStyle || "double";

  return (
    <div
      className={`school-letterhead-root w-full bg-white text-black font-sans select-none ${className}`}
    >
      <div className="flex items-center justify-between gap-3 sm:gap-4 pb-2">
        {/* Left Logo (Logo Dinas Pendidikan / Pemda) */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 flex items-center justify-center">
          {merged.logoDinasUrl ? (
            <img
              src={merged.logoDinasUrl}
              alt="Logo Dinas"
              className="school-letterhead-logo max-h-14 sm:max-h-16 max-w-full object-contain"
              style={{ maxHeight: "60px", maxWidth: "65px", width: "auto", height: "auto", objectFit: "contain" }}
            />
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-100 border border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 text-[9px] sm:text-[10px] font-bold p-1 text-center print:border-none print:bg-transparent">
              <span className="hidden print:inline-block"></span>
              <span className="print:hidden">Logo Dinas</span>
            </div>
          )}
        </div>

        {/* Center Official Text Block */}
        <div className="flex-1 text-center leading-tight space-y-0.5">
          {/* Baris 1: Pemda */}
          {isAksaraBali && aksaraPemda && (
            <p
              className="aksara-bali text-xs sm:text-sm text-black leading-snug font-normal tracking-wide"
              style={{ fontFamily: "'Noto Sans Balinese', sans-serif" }}
            >
              {aksaraPemda}
            </p>
          )}
          <h3 className="text-xs sm:text-[13px] font-extrabold uppercase tracking-wide text-black">
            {pemdaText}
          </h3>

          {/* Baris 2: Dinas */}
          {isAksaraBali && aksaraDinas && (
            <p
              className="aksara-bali text-xs sm:text-sm text-black leading-snug font-normal tracking-wide pt-0.5"
              style={{ fontFamily: "'Noto Sans Balinese', sans-serif" }}
            >
              {aksaraDinas}
            </p>
          )}
          <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-normal text-black">
            {dinasText}
          </h2>

          {/* Baris 3: Nama Sekolah */}
          {isAksaraBali && aksaraSekolah && (
            <p
              className="aksara-bali text-sm sm:text-base text-black leading-snug font-normal tracking-wide pt-0.5"
              style={{ fontFamily: "'Noto Sans Balinese', sans-serif" }}
            >
              {aksaraSekolah}
            </p>
          )}
          <h1 className="text-sm sm:text-base font-black uppercase tracking-wider text-black">
            {schoolText}
          </h1>

          {/* Baris 4 (Kedua paling bawah): Alamat Sekolah (Dengan Aksara Bali) */}
          {isAksaraBali && aksaraAlamat && (
            <p
              className="aksara-bali text-[10px] sm:text-xs text-black leading-snug font-normal tracking-tight pt-0.5"
              style={{ fontFamily: "'Noto Sans Balinese', sans-serif" }}
            >
              {aksaraAlamat}
            </p>
          )}
          <p className="text-[10px] sm:text-[11px] text-slate-800 font-medium leading-tight pt-0.5">
            {alamatText}
          </p>

          {/* Baris 5 (Paling bawah): Kontak & Identitas Digital (TANPA Aksara Bali) */}
          {kontakText && (
            <p className="text-[9.5px] sm:text-[10.5px] text-slate-700 font-medium leading-tight pt-0.5">
              {kontakText}
            </p>
          )}
        </div>

        {/* Right Logo (Logo Sekolah) */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 flex items-center justify-center">
          {merged.logoSekolahUrl ? (
            <img
              src={merged.logoSekolahUrl}
              alt="Logo Sekolah"
              className="school-letterhead-logo max-h-14 sm:max-h-16 max-w-full object-contain"
              style={{ maxHeight: "60px", maxWidth: "65px", width: "auto", height: "auto", objectFit: "contain" }}
            />
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-100 border border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 text-[9px] sm:text-[10px] font-bold p-1 text-center print:border-none print:bg-transparent">
              <span className="hidden print:inline-block"></span>
              <span className="print:hidden">Logo Sekolah</span>
            </div>
          )}
        </div>
      </div>

      {/* Official Indonesian Government Double Line Divider */}
      {dividerStyle === "double" && (
        <div className="letterhead-divider w-full mt-1 mb-4 print:mb-3">
          <div className="border-t-[3px] border-black w-full" />
          <div className="h-[2px]" />
          <div className="border-t border-black w-full" />
        </div>
      )}

      {dividerStyle === "single" && (
        <div className="letterhead-divider w-full border-t border-black mt-1 mb-4 print:mb-3" />
      )}

      {dividerStyle === "bold" && (
        <div className="letterhead-divider w-full border-t-2 border-black mt-1 mb-4 print:mb-3" />
      )}
    </div>
  );
};
