/**
 * Telemetry Utilities:
 * Mengukur transfer data riil via browser Performance API,
 * mendeteksi OS/perangkat siswa, dan menganalisis metrik integritas ujian.
 */

export interface ClientDeviceInfo {
  os: 'Android' | 'iOS' | 'Windows' | 'macOS' | 'Chrome OS' | 'Linux' | 'Lainnya';
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browser: string;
}

/**
 * Mengukur konsumsi transfer data riil (kuota) siswa menggunakan Performance API.
 * Menjumlahkan transferSize (atau decodedBodySize) seluruh resource jaringan
 * (API requests, gambar, audio, CSS, font, script bundel).
 */
export function measureClientBandwidthBytes(): number {
  if (typeof window === 'undefined' || !window.performance) {
    return 120000; // Fallback ~120 KB
  }

  try {
    let totalBytes = 0;

    // 1. Ambil data resource timing
    if (typeof window.performance.getEntriesByType === 'function') {
      const resourceEntries = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      for (const entry of resourceEntries) {
        if (typeof entry.transferSize === 'number' && entry.transferSize > 0) {
          totalBytes += entry.transferSize;
        } else if (typeof entry.encodedBodySize === 'number' && entry.encodedBodySize > 0) {
          totalBytes += entry.encodedBodySize;
        } else if (typeof entry.decodedBodySize === 'number' && entry.decodedBodySize > 0) {
          totalBytes += entry.decodedBodySize;
        }
      }

      // 2. Tambahkan dokumen halaman (navigation entry)
      const navEntries = window.performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navEntries.length > 0) {
        const nav = navEntries[0];
        if (typeof nav.transferSize === 'number' && nav.transferSize > 0) {
          totalBytes += nav.transferSize;
        } else if (typeof nav.encodedBodySize === 'number' && nav.encodedBodySize > 0) {
          totalBytes += nav.encodedBodySize;
        }
      }
    }

    // Base minimum transfer untuk paket ujian dasar ~45 KB
    return Math.max(totalBytes, 45000);
  } catch (err) {
    console.warn("Gagal membaca Performance API, menggunakan estimasi dasar:", err);
    return 120000;
  }
}

/**
 * Mendeteksi sistem operasi, kategori perangkat, dan browser siswa.
 */
export function detectClientDevice(): ClientDeviceInfo {
  if (typeof navigator === 'undefined') {
    return { os: 'Lainnya', deviceType: 'desktop', browser: 'Browser' };
  }

  const ua = navigator.userAgent || '';

  // 1. Deteksi OS
  let os: ClientDeviceInfo['os'] = 'Lainnya';
  if (/android/i.test(ua)) {
    os = 'Android';
  } else if (/ipad|iphone|ipod/i.test(ua)) {
    os = 'iOS';
  } else if (/windows/i.test(ua)) {
    os = 'Windows';
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = 'macOS';
  } else if (/cros/i.test(ua)) {
    os = 'Chrome OS';
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
  }

  // 2. Deteksi Jenis Perangkat
  let deviceType: ClientDeviceInfo['deviceType'] = 'desktop';
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/mobile|iphone|android|blackberry|opera mini|iemobile/i.test(ua)) {
    deviceType = 'mobile';
  }

  // 3. Deteksi Browser
  let browser = 'Lainnya';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/opera|opr/i.test(ua)) browser = 'Opera';

  return { os, deviceType, browser };
}

/**
 * Menghitung frekuensi pelanggaran integritas (pindah tab, keluar jendela, layar belah)
 * dari riwayat log aktivitas siswa.
 */
export function countIntegrityViolations(activityLog?: string[]): number {
  if (!activityLog || !Array.isArray(activityLog)) return 0;
  let count = 0;
  for (const log of activityLog) {
    const l = String(log).toLowerCase();
    if (
      l.includes('pindah tab') ||
      l.includes('keluar jendela') ||
      l.includes('blur') ||
      l.includes('layar terbagi') ||
      l.includes('peringatan') ||
      l.includes('meninggalkan ujian')
    ) {
      count++;
    }
  }
  return count;
}

/**
 * Format bytes menjadi string kuota yang mudah dibaca (B, KB, MB, GB).
 */
export function formatBandwidth(bytes: number): string {
  if (isNaN(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Format durasi detik menjadi format waktu humanis (e.g., "15m 30d", "1j 20m").
 */
export function formatDurationHuman(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '0 detik';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}j ${mins}m`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}d`;
  }
  return `${secs} detik`;
}
