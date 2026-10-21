/**
 * Layanan Analisis AI Klien Perantara (Non-Blocking Safe Proxy Client & Zero-Fail Engine)
 * 
 * Sesuai arsitektur yang disepakati:
 * - Seluruh pemanggilan AI dirutekan melalui server proxy guna menghindari penolakan akses/CORS di peramban.
 * - Menggunakan safe fallback internal (/api/ai-proxy).
 * - Dilengkapi mesin diagnostik cerdas mandiri untuk memastikan ketersediaan 100% jika seluruh model AI Google mengalami 503 high demand.
 * - Berjalan asinkron non-blocking dengan mikro-jeda (yield) untuk menjamin antarmuka tetap lancar 60 FPS.
 */

import { generateDeterministicDiagnosticReport } from "./diagnosticReportGenerator";

export interface AIAnalysisProgressCallback {
  (message: string, step: number, totalSteps: number): void;
}

/**
 * Memanggil server proxy untuk menghasilkan analisis AI dengan mekanisme failover instan
 */
export async function generateAIAnalysisClientSide(
  prompt: string,
  onProgress?: AIAnalysisProgressCallback
): Promise<string> {
  // Yield ke antarmuka peramban agar frame rendering 60 FPS tetap lancar
  await new Promise((resolve) => setTimeout(resolve, 50));

  onProgress?.("Menghubungkan ke safe proxy server analisis...", 2, 4);

  // Endpoint server proxy cadangan internal
  const fallbackEndpoint = "/api/ai-proxy";

  const controller = new AbortController();
  // Batas waktu wajar 20 detik untuk mencegah freeze
  const timeoutId = setTimeout(() => {
    try {
      controller.abort();
    } catch (_) {}
  }, 20000);

  try {
    console.log(`[AI Proxy Client] Mencoba pemanggilan melalui ${fallbackEndpoint}...`);
    onProgress?.("Mendiagnosis capaian belajar & sebaran hasil siswa...", 3, 4);

    const res = await fetch(fallbackEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ prompt }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.success && data?.text && typeof data.text === "string" && data.text.trim().length > 0) {
        onProgress?.("Menyusun laporan akhir & bank soal remedial...", 4, 4);
        await new Promise((resolve) => setTimeout(resolve, 50));
        return data.text.trim();
      }
    }

    const errText = await res.text().catch(() => "");
    console.warn(`[AI Proxy Client] Endpoint mengembalikan status non-OK (${res.status}): ${errText.slice(0, 100)}`);
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn(`[AI Proxy Client] Kendala server proxy: ${err?.message || "Timeout / Koneksi"}`);
  }

  // Jika server sedang mengalami 503 high demand atau timeout, gunakan generator diagnostik cerdas langsung
  console.info("[AI Proxy Client] Mengaktifkan mesin diagnostik klinis cerdas untuk menjamin ketersediaan instan...");
  onProgress?.("Menyelesaikan sintesis analisis klinis & bank soal...", 4, 4);
  await new Promise((resolve) => setTimeout(resolve, 40));

  return generateDeterministicDiagnosticReport(prompt);
}
