import type { IndonesianTimezone } from "../types";

/**
 * Mendeteksi zona waktu Indonesia (WIB, WITA, atau WIT) dari browser/perangkat saat ini.
 */
export const detectUserIndonesianTimezone = (): IndonesianTimezone => {
  try {
    const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const lower = tzName.toLowerCase();

    // Deteksi berdasarkan nama region IANA
    if (
      lower.includes("makassar") ||
      lower.includes("ujung_pandang") ||
      lower.includes("bali") ||
      lower.includes("denpasar") ||
      lower.includes("manado") ||
      lower.includes("mataram") ||
      lower.includes("kupang")
    ) {
      return "WITA";
    }

    if (
      lower.includes("jayapura") ||
      lower.includes("ambon") ||
      lower.includes("papua") ||
      lower.includes("maluku")
    ) {
      return "WIT";
    }

    if (lower.includes("jakarta") || lower.includes("pontianak")) {
      return "WIB";
    }

    // Deteksi sekunder via offset menit UTC (getTimezoneOffset bernilai negatif untuk UTC+)
    const offsetMin = new Date().getTimezoneOffset();
    const utcHours = -offsetMin / 60;

    if (Math.round(utcHours) === 8) return "WITA";
    if (Math.round(utcHours) === 9) return "WIT";
    if (Math.round(utcHours) === 7) return "WIB";
  } catch {
    // Fallback aman jika browser tidak mendukung Intl
  }

  return "WIB";
};

/**
 * Mendapatkan offset jam UTC untuk zona waktu Indonesia (+7, +8, +9).
 */
export const getTimezoneOffsetHours = (tz: IndonesianTimezone = "WIB"): number => {
  switch (tz) {
    case "WIT":
      return 9;
    case "WITA":
      return 8;
    case "WIB":
    default:
      return 7;
  }
};

/**
 * Label ramah zona waktu beserta offset UTC.
 */
export const getTimezoneLabel = (tz: IndonesianTimezone = "WIB"): string => {
  switch (tz) {
    case "WIT":
      return "WIT (UTC+9)";
    case "WITA":
      return "WITA (UTC+8)";
    case "WIB":
    default:
      return "WIB (UTC+7)";
  }
};

/**
 * Normalisasi string tanggal apapun ke format bersih YYYY-MM-DD.
 * Menghindari bug perbandingan akibat timestamp ISO (misal '2026-10-12T07:30:00Z').
 */
export const normalizeDateString = (rawDate?: string): string => {
  if (!rawDate) {
    const d = new Date();
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const trimmed = rawDate.trim();
  if (trimmed.includes("T")) {
    const part = trimmed.split("T")[0];
    if (part && part.length === 10) return part;
  }

  // Jika sudah format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Fallback parsing date
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = (parsed.getMonth() + 1).toString().padStart(2, "0");
    const day = parsed.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  return trimmed;
};

/**
 * Mengonversi tanggal (YYYY-MM-DD), jam (HH:mm), dan zona waktu menjadi absolute epoch timestamp (ms).
 * Memastikan perhitungan waktu tidak terdistorsi oleh perbedaan zona waktu lokal perangkat klien.
 */
export const toAbsoluteUtcTimestamp = (
  dateStr: string,
  timeStr: string = "00:00",
  tz: IndonesianTimezone = "WIB",
  isEndOfMinute: boolean = false
): number => {
  const cleanDate = normalizeDateString(dateStr);
  const timeParts = timeStr.trim().split(":");
  const h = (parseInt(timeParts[0] || "0", 10) || 0).toString().padStart(2, "0");
  const m = (parseInt(timeParts[1] || "0", 10) || 0).toString().padStart(2, "0");
  const s = isEndOfMinute ? "59" : "00";

  const offsetHours = getTimezoneOffsetHours(tz);
  const offsetStr = `+${offsetHours.toString().padStart(2, "0")}:00`;

  const isoWithOffset = `${cleanDate}T${h}:${m}:${s}${offsetStr}`;
  const timestamp = Date.parse(isoWithOffset);

  if (isNaN(timestamp)) {
    // Fallback jika format gagal diparse
    return Date.now();
  }

  return timestamp;
};

/**
 * Mengonversi waktu "HH:mm" dari zona waktu sumber (fromTz) ke zona waktu target (toTz).
 */
export const convertTimeBetweenTimezones = (
  timeStr: string,
  fromTz: IndonesianTimezone = "WIB",
  toTz: IndonesianTimezone = "WIB"
): string => {
  if (fromTz === toTz || !timeStr) return timeStr;

  const parts = timeStr.trim().split(":");
  const h = parseInt(parts[0] || "0", 10) || 0;
  const m = parseInt(parts[1] || "0", 10) || 0;

  const diffHours = getTimezoneOffsetHours(toTz) - getTimezoneOffsetHours(fromTz);
  let convertedH = (h + diffHours) % 24;
  if (convertedH < 0) convertedH += 24;

  return `${convertedH.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

/**
 * Menghasilkan teks konversi waktu lokal siswa jika zona waktu siswa berbeda dengan zona waktu ujian guru.
 * Contoh: "Setara 07:00 - 09:00 WIB di perangkat Anda"
 */
export const getStudentTimezoneNotice = (
  startTime: string,
  endTime: string,
  examTz: IndonesianTimezone = "WIB",
  studentTz: IndonesianTimezone = detectUserIndonesianTimezone()
): string | null => {
  if (examTz === studentTz) return null;

  const localStart = convertTimeBetweenTimezones(startTime, examTz, studentTz);
  const localEnd = convertTimeBetweenTimezones(endTime, examTz, studentTz);

  return `Setara pukul ${localStart} - ${localEnd} ${studentTz} di perangkat Anda`;
};
