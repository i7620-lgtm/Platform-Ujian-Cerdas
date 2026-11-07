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

  // 1. Gather address items in order from left to right
  const rawAddressItems: string[] = [];
  if (merged.alamatSekolah) rawAddressItems.push(merged.alamatSekolah);
  if (merged.desaKelurahan) rawAddressItems.push(`Desa/Kel. ${merged.desaKelurahan}`);
  if (merged.kecamatan) rawAddressItems.push(`Kec. ${merged.kecamatan}`);
  if (merged.kodePos) rawAddressItems.push(`Kode Pos: ${merged.kodePos}`);

  // 2. Gather contact items
  const baseContactItems: string[] = [];
  if (merged.teleponSekolah) baseContactItems.push(`Telepon: ${merged.teleponSekolah}`);
  if (merged.faksimile) baseContactItems.push(`Faks: ${merged.faksimile}`);
  if (merged.emailSekolah) baseContactItems.push(`Email: ${merged.emailSekolah}`);
  if (merged.websiteSekolah) baseContactItems.push(`Website: ${merged.websiteSekolah}`);
  if (merged.npsn) baseContactItems.push(`NPSN: ${merged.npsn}`);

  // 3. Dynamic overflow split algorithm: Ensure Balinese script line fits in a single line (~62 chars)
  const currentAddressItems = [...rawAddressItems];
  const overflowAddressItems: string[] = [];

  const hasCustomAksaraAlamat = Boolean(merged.aksaraBaliAlamat);

  if (!hasCustomAksaraAlamat && isAksaraBali && currentAddressItems.length > 1) {
    while (currentAddressItems.length > 1) {
      const candidateAddress = currentAddressItems.join(", ");
      const candidateBalinese = transliterateToAksaraBali(candidateAddress);

      if (candidateBalinese.length <= 62) {
        break;
      }
      const popped = currentAddressItems.pop();
      if (popped) {
        overflowAddressItems.unshift(popped);
      }
    }
  }

  const alamatText =
    currentAddressItems.length > 0
      ? currentAddressItems.join(", ")
      : "Jalan Kebo Iwa Banjar Batuparas";

  const allContactItems = [...overflowAddressItems, ...baseContactItems];
  const kontakText =
    allContactItems.length > 0
      ? allContactItems.join(" | ")
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

  // Dynamic logo container & style based on isAksaraBali active status
  const logoContainerClass = isAksaraBali
    ? "w-16 h-16 sm:w-20 sm:h-20 shrink-0 self-center flex items-center justify-center"
    : "w-12 h-12 sm:w-14 sm:h-14 shrink-0 self-center flex items-center justify-center";

  const logoImgClass = isAksaraBali
    ? "school-letterhead-logo max-h-16 sm:max-h-20 max-w-full object-contain"
    : "school-letterhead-logo max-h-12 sm:max-h-14 max-w-full object-contain";

  const logoImageStyle: React.CSSProperties = isAksaraBali
    ? { maxHeight: "72px", maxWidth: "75px", width: "auto", height: "auto", objectFit: "contain", mixBlendMode: "multiply" }
    : { maxHeight: "54px", maxWidth: "58px", width: "auto", height: "auto", objectFit: "contain", mixBlendMode: "multiply" };

  return (
    <div
      className={`school-letterhead-root w-full bg-white text-black font-sans select-none ${className}`}
    >
      <div className="flex items-center justify-between gap-3 sm:gap-4 pb-2">
        {/* Left Logo (Logo Dinas Pendidikan / Pemda) */}
        <div className={logoContainerClass}>
          {merged.logoDinasUrl ? (
            <img
              src={merged.logoDinasUrl}
              alt="Logo Dinas"
              className={logoImgClass}
              style={logoImageStyle}
            />
          ) : (
            <div className={`${logoContainerClass} bg-slate-100 border border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 text-[9px] sm:text-[10px] font-bold p-1 text-center print:border-none print:bg-transparent`}>
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

          {/* Baris 4 (Kedua paling bawah): Alamat Utama Sekolah (Dengan Aksara Bali 1 baris) */}
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

          {/* Baris 5 (Paling bawah): Overflow Alamat + Kontak & Identitas Digital (TANPA Aksara Bali) */}
          {kontakText && (
            <p className="text-[9.5px] sm:text-[10.5px] text-slate-700 font-medium leading-tight pt-0.5">
              {kontakText}
            </p>
          )}
        </div>

        {/* Right Logo (Logo Sekolah) */}
        <div className={logoContainerClass}>
          {merged.logoSekolahUrl ? (
            <img
              src={merged.logoSekolahUrl}
              alt="Logo Sekolah"
              className={logoImgClass}
              style={logoImageStyle}
            />
          ) : (
            <div className={`${logoContainerClass} bg-slate-100 border border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 text-[9px] sm:text-[10px] font-bold p-1 text-center print:border-none print:bg-transparent`}>
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
