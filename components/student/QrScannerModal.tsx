import React, { useRef, useEffect, useState } from "react";
import { XMarkIcon, ExclamationTriangleIcon } from "../Icons";
import { detectInAppBrowser, isIOSWebKit } from "../../utils/platformUtils";

const HTML5_QRCODE_CDN_URLS = [
  "https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js",
  "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js",
];

const loadScript = (src: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      reject(new Error(`Failed to load ${src}`));
    };
    document.body.appendChild(script);
  });

const ensureHtml5QrcodeLoaded = async (): Promise<void> => {
  if ((window as any).Html5Qrcode) return;
  let lastError: unknown;
  for (const url of HTML5_QRCODE_CDN_URLS) {
    try {
      await loadScript(url);
      if ((window as any).Html5Qrcode) return;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Failed to load QR scanner script");
};

export const QrScannerModal: React.FC<{
  onScanSuccess: (text: string) => void;
  onClose: () => void;
}> = ({ onScanSuccess, onClose }) => {
  const scannerRef = useRef<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initScanner = async () => {
      try {
        await ensureHtml5QrcodeLoaded();
        if (!isMounted) return;

        // Access global variable
        const Html5Qrcode = (window as any).Html5Qrcode as new (
          id: string,
          verbose: boolean,
        ) => {
          start: (
            config: any,
            options: any,
            onSuccess: (text: string) => void,
            onError: (error: any) => void,
          ) => Promise<void>;
          stop: () => Promise<void>;
          clear: () => void;
        };

        if (!Html5Qrcode) throw new Error("Html5Qrcode not found");

        const html5QrCode = new Html5Qrcode("reader-entry", false);
        scannerRef.current = html5QrCode;
        const config = { fps: 10 };

        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText: string) => {
            if (isMounted) onScanSuccess(decodedText);
          },
          () => {
            // ignore parse errors
          },
        );
      } catch (err) {
        console.error("Error starting scanner", err);
        if (isMounted) {
          const inApp = detectInAppBrowser();
          if (inApp.isInApp) {
            setScanError(
              `Kamera diblokir oleh browser bawaan ${inApp.appName || "aplikasi"}. Buka tautan ujian langsung di ${
                isIOSWebKit() ? "Safari" : "Chrome / Safari"
              }, atau ketik kode ujian secara manual.`,
            );
          } else if (isIOSWebKit()) {
            setScanError(
              "Kamera tidak dapat diakses. Pastikan Anda membuka halaman ini di Safari (bukan browser dalam aplikasi), aktifkan izin Kamera di Pengaturan Safari, lalu coba lagi atau masukkan kode manual.",
            );
          } else {
            setScanError(
              "Gagal memuat pemindai kamera. Pastikan izin kamera aktif dan koneksi internet stabil, atau ketik kode ujian secara manual.",
            );
          }
        }
      }
    };

    const timer = setTimeout(initScanner, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        const scanner = scannerRef.current as {
          stop: () => Promise<void>;
          clear: () => void;
        };
        scanner
          .stop()
          .then(() => {
            try {
              scanner.clear();
            } catch {
              /* ignore */
            }
          })
          .catch((e: any) => console.log("Stop failed", e));
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 z-[100] safe-pt safe-pb bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-2xl w-full max-w-sm relative animate-slide-in-up border border-white dark:border-slate-700">
        <h3 className="text-center font-black text-slate-800 dark:text-white mb-4 text-lg">
          Pindai QR Code Ujian
        </h3>
        {scanError ? (
          <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-center space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 flex items-center justify-center mx-auto">
              <ExclamationTriangleIcon className="w-6 h-6" />
            </div>
            <p className="text-xs font-medium text-rose-700 dark:text-rose-300 leading-relaxed">
              {scanError}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[44px] py-2.5 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white text-xs font-bold hover:bg-black dark:hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              Tutup & Masukkan Kode Manual
            </button>
          </div>
        ) : (
          <>
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-square shadow-inner">
              <div id="reader-entry" className="w-full h-full"></div>
              {/* Scanning Line Animation */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="w-full h-0.5 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,1)] animate-[scan_2s_ease-in-out_infinite]"></div>
                <style>{`
                             @keyframes scan {
                                 0% { transform: translateY(0); opacity: 0; }
                                 10% { opacity: 1; }
                                 90% { opacity: 1; }
                                 100% { transform: translateY(100%); opacity: 0; }
                             }
                         `}</style>
              </div>
            </div>
            <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-4 font-medium">
              Arahkan kamera ke QR Code ujian.
              <br />
              Pastikan cahaya cukup terang.
            </p>
          </>
        )}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors cursor-pointer"
          aria-label="Tutup pemindai QR"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
