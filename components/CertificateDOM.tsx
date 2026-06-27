import React, { useEffect, useState } from "react";
import { AcademicCapIcon } from "./Icons";

import { QRCodeSVG } from "qrcode.react";

export interface CertificateDOMProps {
  studentName: string;
  score: number | string;
  examType: string;
  subject: string;
  classLevel: string;
  date: string;
  qrLink: string;
  verifyCode: string;
  config: Record<string, any>;
  onRendered: () => void;
  schoolName?: string;
}

export const CertificateDOM: React.FC<CertificateDOMProps> = ({
  studentName,
  score,
  examType,
  subject,
  classLevel,
  date,
  qrLink,
  verifyCode,
  config,
  onRendered,
  schoolName = "Platform Ujian Cerdas",
}) => {
  const [imagesLoaded, setImagesLoaded] = useState(false);

  const [processedSignature, setProcessedSignature] = useState<string | null>(null);

  useEffect(() => {
    const loadImages = async () => {
      const promises: Promise<void>[] = [];

      // Process background image
      if (config.backgroundUrl) {
        promises.push(
          new Promise((resolve) => {
            const img = new window.Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve();
            img.onerror = () => {
              console.error("Failed to load background certificate image");
              resolve();
            };
            img.src = config.backgroundUrl;
          })
        );
      }

      // Process signature image
      if (config.signatureUrl) {
        if (config.signatureTransparent) {
          promises.push(
            new Promise((resolve) => {
              const img = new window.Image();
              img.crossOrigin = "anonymous";
              img.onload = () => {
                try {
                  const canvas = document.createElement("canvas");
                  canvas.width = img.width;
                  canvas.height = img.height;
                  const ctx = canvas.getContext("2d");
                  if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;
                    // Make white/light-grey pixels transparent
                    // Also use a luminance based alpha to make it look smoother
                    for (let i = 0; i < data.length; i += 4) {
                      const r = data[i];
                      const g = data[i + 1];
                      const b = data[i + 2];
                      
                      // Calculate luminance
                      const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
                      
                      if (luminance > 220) {
                        data[i + 3] = 0; // Transparent
                      } else {
                        // Smooth alpha for anti-aliased edges
                        const alpha = Math.min(255, (255 - luminance) * 1.5);
                        data[i + 3] = alpha;
                        // Darken the colors a bit to simulate ink multiplying
                        data[i] = Math.max(0, r - 50);
                        data[i + 1] = Math.max(0, g - 50);
                        data[i + 2] = Math.max(0, b - 50);
                      }
                    }
                    ctx.putImageData(imageData, 0, 0);
                    setProcessedSignature(canvas.toDataURL("image/png"));
                  } else {
                    setProcessedSignature(config.signatureUrl);
                  }
                } catch (err) {
                  console.error("Failed to process signature transparency", err);
                  setProcessedSignature(config.signatureUrl);
                }
                resolve();
              };
              img.onerror = () => {
                setProcessedSignature(config.signatureUrl);
                resolve();
              };
              img.src = config.signatureUrl;
            })
          );
        } else {
          setProcessedSignature(config.signatureUrl);
        }
      }

      await Promise.all(promises);
      
      setImagesLoaded(true);
      setTimeout(onRendered, 150);
    };

    loadImages();
  }, [config.backgroundUrl, config.signatureUrl, config.signatureTransparent, onRendered]);

  const examTypePlaceholder = examType || "Ujian Akhir Semester";
  const subjectPlaceholder = subject || "Matematika";
  const classLevelPlaceholder = classLevel || "Semester 1";
  const datePlaceholder = date || new Date().toISOString();

  const d = new Date(datePlaceholder);
  const day = d.toLocaleDateString("id-ID", { weekday: "long" });
  const dateStr = d.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Wait until images are loaded for html2canvas
  if (config.backgroundUrl && !imagesLoaded) {
    return (
      <div className="@container relative w-[1000px] h-[707px] shrink-0 shadow-2xl bg-white select-none opacity-0"></div>
    );
  }

  return (
    <div
      className={`@container relative w-[1000px] h-[707px] shrink-0 shadow-2xl bg-white select-none ${!config.backgroundUrl ? "border-[16px] border-double border-slate-200" : ""}`}
      style={{
        containerType: "inline-size",
        backgroundImage: config.backgroundUrl
          ? `url(${config.backgroundUrl})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        fontFamily: "sans-serif",
      }}
    >
      {!config.backgroundUrl && (
        <div className="absolute inset-0 bg-white overflow-hidden pointer-events-none p-4">
          <div className="w-full h-full border-[6px] border-indigo-900 relative bg-slate-50">
            <div className="absolute inset-[4px] border-[1px] border-indigo-300"></div>

            {/* Modern Decorative elements */}
            <div
              className="absolute top-0 left-0 w-[30%] h-[8%] bg-indigo-600 rounded-br-full opacity-80"
              style={{ clipPath: "polygon(0 0, 100% 0, 70% 100%, 0 100%)" }}
            ></div>
            <div
              className="absolute bottom-0 right-0 w-[40%] h-[12%] bg-indigo-900 rounded-tl-full opacity-90"
              style={{ clipPath: "polygon(30% 0, 100% 0, 100% 100%, 0 100%)" }}
            ></div>

            {/* Header */}
            <div className="mt-[3%] flex flex-col items-center relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <AcademicCapIcon className="w-[20px] h-[20px] text-indigo-600" />
                <h2 className="text-[18px] font-bold text-indigo-900 tracking-wider">
                  PLATFORM UJIAN CERDAS
                </h2>
              </div>
              <h3 className="text-[12px] font-medium text-slate-500 tracking-widest mt-1 opacity-80 uppercase">
                Laporan Hasil Evaluasi Pembelajaran
              </h3>
              <div className="w-[50%] h-[2px] bg-gradient-to-r from-transparent via-indigo-200 to-transparent mt-[1.5%]"></div>
              <h1 className="text-[35px] font-bold text-indigo-800 mt-[1.5%] tracking-wide uppercase drop-shadow-sm">
                Sertifikat Hasil Ujian
              </h1>
            </div>

            {/* Subtitles & Descriptions */}
            <div className="absolute top-[26%] w-full text-center z-10">
              <p className="text-[12px] font-medium text-slate-600">
                Dokumen ini mengkonfirmasi bahwa siswa berikut:
              </p>
            </div>

            <div className="absolute top-[46%] w-full px-[5%] text-center z-10">
              <p className="text-[12px] font-medium text-slate-600">
                telah menyelesaikan evaluasi {examTypePlaceholder} untuk mata
                pelajaran {subjectPlaceholder} kelas {classLevelPlaceholder}{" "}
                pada {day}, {dateStr} dan mendapatkan nilai akhir:
              </p>
            </div>

            {/* Motivation Text */}
            <div className="absolute top-[66%] w-full px-[15%] text-center z-10">
              <p className="text-[11px] italic text-slate-600 leading-relaxed font-serif">
                "Telah menunjukkan dedikasi, ketekunan, dan semangat pantang
                menyerah dalam menyelesaikan evaluasi. Semoga pencapaian ini menjadi langkah
                awal menuju kesuksesan yang lebih gemilang di masa depan."
              </p>
            </div>

            {/* Signatures & Barcode */}
            <div className="absolute bottom-[5%] w-full flex items-end justify-center px-[12%] gap-[20%]">
              <div className="text-center">
                <p className="text-[12px] font-medium text-slate-700">
                  Instansi Penyelenggara
                </p>
                <div className="mt-[65px] w-[200px] border-b-[2px] border-slate-500"></div>
                <p className="text-[12px] mt-1.5 font-bold text-slate-800">
                  Administrator / Guru
                </p>
                <p className="text-[10px] text-slate-500">
                  {schoolName}
                </p>
              </div>

              <div className="w-[100px] h-[100px] bg-white border border-slate-200 xl:mt-0 shadow-sm p-[8px] rounded-lg flex flex-col items-center justify-center">
                <QRCodeSVG
                  value={qrLink || window.location.origin}
                  size={70}
                  className="w-full h-full opacity-90"
                />
                <span className="text-[9px] font-mono text-slate-400 mt-1">
                  VERIFY-{verifyCode || "0X98A"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Draggable items */}
      {(() => {
        const positions = config?.positions || {
          studentName: {
            visible: true,
            x: 50,
            y: 36,
            fontSize: 50,
            color: "#1e3a8a",
          },
          score: {
            visible: true,
            x: 50,
            y: 57,
            fontSize: 40,
            color: "#ef4444",
          },
          signature: {
            visible: false,
            x: 70,
            y: 78,
            fontSize: 16,
            color: "#000000",
          }
        };

        return (
          <>
            {positions.studentName?.visible && (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap"
                style={{
                  left: `${positions.studentName.x}%`,
                  top: `${positions.studentName.y}%`,
                  fontSize: `${positions.studentName.fontSize * 1.188}px`,
                  color: positions.studentName.color,
                  fontWeight: "bold",
                  fontFamily: '"Playfair Display", "Times New Roman", serif',
                  letterSpacing: "0.02em",
                  zIndex: 10,
                }}
              >
                {studentName}
              </div>
            )}
            {positions.score?.visible && (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap"
                style={{
                  left: `${positions.score.x}%`,
                  top: `${positions.score.y}%`,
                  fontSize: `${positions.score.fontSize * 1.188}px`,
                  color: positions.score.color,
                  fontWeight: "bold",
                  fontFamily: '"JetBrains Mono", "Courier New", monospace',
                  letterSpacing: "0.05em",
                  zIndex: 10,
                }}
              >
                {score}
              </div>
            )}
            {positions.signature?.visible && (processedSignature || config?.signatureUrl) && (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${positions.signature.x}%`,
                  top: `${positions.signature.y}%`,
                  zIndex: 10,
                }}
              >
                <img
                  src={processedSignature || config?.signatureUrl}
                  alt="Signature"
                  style={{
                    height: `${positions.signature.fontSize * 4}px`, // match the scaling in editor
                    objectFit: "contain",
                    mixBlendMode: config.signatureTransparent ? "multiply" : "normal",
                  }}
                />
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
};
