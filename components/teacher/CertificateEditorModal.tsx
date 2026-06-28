import React from "react";
import { createPortal } from "react-dom";
import { XMarkIcon, PhotoIcon, SparklesIcon, AcademicCapIcon, DocumentArrowUpIcon } from "../Icons";
import { QRCodeSVG } from "qrcode.react";
import {
  useCertificateEditorModal,
  CertificateSettings,
} from "./useCertificateEditorModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings?: CertificateSettings;
  onSave: (settings: CertificateSettings) => void;
  subjectPlaceholder?: string;
  examTypePlaceholder?: string;
  classLevelPlaceholder?: string;
  datePlaceholder?: string;
  schoolNamePlaceholder?: string;
}

export const CertificateEditorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  subjectPlaceholder = "Matematika",
  examTypePlaceholder = "Ujian Akhir Semester",
  classLevelPlaceholder = "Semester 1",
  datePlaceholder = new Date().toISOString(),
  schoolNamePlaceholder = "Nama Instansi / Sekolah",
}) => {
  const {
    current,
    processedSignatureUrl,
    activeItem,
    scale,
    updateCurrent,
    containerRef,
    wrapperRef,
    handleImageUpload,
    handleSignatureUpload,
    handleDragStart,
    handleDrag,
    handleDragEnd,
    updatePosition,
  } = useCertificateEditorModal({ isOpen, settings });

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-[95vw] xl:max-w-[1400px] max-h-[95vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-amber-500" /> Pengaturan
              Sertifikat Ujian
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Atur template dan teks otomatis pada sertifikat
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col xl:flex-row gap-6">
          {/* Controls Sidebar */}
          <div className="w-full xl:w-80 space-y-6 shrink-0">
            <label className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={current.enabled}
                onChange={(e) =>
                  updateCurrent((prev) => prev ? {
                    ...prev,
                    enabled: e.target.checked,
                  } : prev)
                }
                className="rounded border-indigo-300 dark:border-indigo-600 bg-white dark:bg-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-bold text-sm">
                Aktifkan Sertifikat Otomatis
              </span>
            </label>

            {current.enabled && (
              <>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2">
                    Background Sertifikat
                  </h3>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-200 dark:border-slate-600 border-dashed rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <PhotoIcon className="w-8 h-8 text-slate-400 mb-2" />
                      <p className="text-sm text-center text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                          Klik untuk unggah
                        </span>{" "}
                        atau drag
                      </p>
                      <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-1 px-2">
                        JPEG, PNG (Maks 2MB). Landscape direkomendasikan.
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg, image/png"
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Tanda Tangan Guru
                  </label>
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors relative overflow-hidden group">
                    {current.signatureUrl ? (
                      <>
                        <div className="absolute inset-0 z-0 flex items-center justify-center p-2 bg-white">
                          <img
                            src={current.signatureTransparent && processedSignatureUrl ? processedSignatureUrl : current.signatureUrl}
                            alt="Signature Preview"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex flex-col items-center justify-center pt-3 pb-4 z-10 relative px-4 bg-white/80 dark:bg-slate-900/80 w-full h-full backdrop-blur-sm transition-opacity opacity-0 group-hover:opacity-100">
                          <DocumentArrowUpIcon className="w-6 h-6 mb-2 text-slate-600 dark:text-slate-300" />
                          <p className="text-xs text-center text-slate-600 dark:text-slate-300 font-medium">
                            Klik untuk ubah gambar
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-3 pb-4 z-10 relative px-4 w-full h-full">
                        <DocumentArrowUpIcon className="w-6 h-6 mb-2 text-slate-400 dark:text-slate-500" />
                        <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                            Klik untuk unggah
                          </span>{" "}
                          tanda tangan
                        </p>
                      </div>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/png, image/jpeg"
                      onChange={handleSignatureUpload}
                    />
                  </label>
                  {current.signatureUrl && (
                    <label className="flex items-center space-x-2 mt-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={current.signatureTransparent || false}
                        onChange={(e) => updateCurrent(prev => prev ? { ...prev, signatureTransparent: e.target.checked } : prev)}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-300">Buat background transparan (Blend)</span>
                    </label>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">
                    Elemen Cetak
                  </h3>
                  {(["studentName", "score", "signature"] as const).map((key) => {
                    const lables = {
                      studentName: "Nama Siswa",
                      score: "Nilai/Skor",
                      signature: "Tanda Tangan Guru",
                    };
                    return (
                      <div
                        key={key}
                        className="p-3 border border-slate-100 dark:border-slate-700 rounded-xl space-y-2"
                      >
                        <label className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {lables[key]}
                          </span>
                          <input
                            type="checkbox"
                            checked={current.positions[key].visible}
                            onChange={(e) =>
                              updateCurrent((prev) => ({
                                ...prev,
                                positions: {
                                  ...prev.positions,
                                  [key]: {
                                    ...prev.positions[key],
                                    visible: e.target.checked,
                                  },
                                },
                              }))
                            }
                            className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                          />
                        </label>
                        {current.positions[key].visible && (
                          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                            <div className="flex items-center justify-between gap-3">
                              <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 w-16">
                                Ukuran
                              </label>
                              <input
                                type="number"
                                value={current.positions[key].fontSize}
                                onChange={(e) =>
                                  updateCurrent((prev) => ({
                                    ...prev,
                                    positions: {
                                      ...prev.positions,
                                      [key]: {
                                        ...prev.positions[key],
                                        fontSize: Number(e.target.value),
                                      },
                                    },
                                  }))
                                }
                                className="flex-1 min-w-0 text-sm p-1.5 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg dark:text-white focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 w-16">
                                Warna
                              </label>
                              <div className="flex-1 flex min-w-0 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                                <input
                                  type="color"
                                  value={current.positions[key].color}
                                  onChange={(e) =>
                                    updateCurrent((prev) => ({
                                      ...prev,
                                      positions: {
                                        ...prev.positions,
                                        [key]: {
                                          ...prev.positions[key],
                                          color: e.target.value,
                                        },
                                      },
                                    }))
                                  }
                                  className="w-10 h-8 p-0 border-0 cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={current.positions[key].color}
                                  onChange={(e) =>
                                    updateCurrent((prev) => ({
                                      ...prev,
                                      positions: {
                                        ...prev.positions,
                                        [key]: {
                                          ...prev.positions[key],
                                          color: e.target.value,
                                        },
                                      },
                                    }))
                                  }
                                  className="flex-1 w-full text-xs p-1.5 px-2 bg-transparent border-0 focus:ring-0 dark:text-white font-mono uppercase"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Preview Canvas */}
          <div className="flex-1 w-full bg-slate-100 dark:bg-slate-900 rounded-xl relative overflow-hidden ring-1 ring-inset ring-slate-200 dark:ring-slate-700 flex flex-col min-h-[400px]">
            {current.enabled ? (
              <div
                ref={wrapperRef}
                className="flex-1 border-t dark:border-slate-800 overflow-hidden flex items-center justify-center p-4 lg:p-6"
              >
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: "center center",
                    width: "1000px",
                    height: "707px",
                  }}
                >
                  <div
                    ref={containerRef}
                    className={`@container relative w-full h-full shrink-0 shadow-2xl bg-white select-none ${!current.backgroundUrl ? "border-[16px] border-double border-slate-200 dark:border-slate-600" : ""}`}
                    onMouseMove={activeItem ? handleDrag : undefined}
                    onMouseUp={handleDragEnd}
                    onMouseLeave={handleDragEnd}
                    onTouchMove={activeItem ? handleDrag : undefined}
                    onTouchEnd={handleDragEnd}
                    style={{
                      containerType: "inline-size",
                      backgroundImage: current.backgroundUrl
                        ? `url(${current.backgroundUrl})`
                        : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    {!current.backgroundUrl && (
                      <div className="absolute inset-0 bg-white overflow-hidden pointer-events-none p-4">
                        <div className="w-full h-full border-[6px] border-indigo-900 relative bg-slate-50">
                          <div className="absolute inset-[4px] border-[1px] border-indigo-300"></div>

                          {/* Modern Decorative elements */}
                          <div
                            className="absolute top-0 left-0 w-[30%] h-[8%] bg-indigo-600 rounded-br-full opacity-80"
                            style={{
                              clipPath:
                                "polygon(0 0, 100% 0, 70% 100%, 0 100%)",
                            }}
                          ></div>
                          <div
                            className="absolute bottom-0 right-0 w-[40%] h-[12%] bg-indigo-900 rounded-tl-full opacity-90"
                            style={{
                              clipPath:
                                "polygon(30% 0, 100% 0, 100% 100%, 0 100%)",
                            }}
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
                              telah menyelesaikan evaluasi {examTypePlaceholder}{" "}
                              untuk mata pelajaran {subjectPlaceholder} kelas{" "}
                              {classLevelPlaceholder} pada{" "}
                              {(() => {
                                const d = new Date(datePlaceholder);
                                const day = d.toLocaleDateString("id-ID", {
                                  weekday: "long",
                                });
                                const date = d.toLocaleDateString("id-ID", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                });
                                return `${day}, ${date}`;
                              })()}{" "}
                              dan mendapatkan nilai akhir:
                            </p>
                          </div>

                          {/* Motivation Text */}
                          <div className="absolute top-[66%] w-full px-[15%] text-center z-10">
                            <p className="text-[11px] italic text-slate-600 leading-relaxed font-serif">
                              "Telah menunjukkan dedikasi, ketekunan, dan
                              semangat pantang menyerah dalam menyelesaikan
                              evaluasi. Semoga pencapaian ini menjadi langkah
                              awal menuju kesuksesan yang lebih gemilang di masa
                              depan."
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
                                {schoolNamePlaceholder}
                              </p>
                            </div>

                            <div className="w-[100px] h-[100px] bg-white border border-slate-200 xl:mt-0 shadow-sm p-[8px] rounded-lg flex flex-col items-center justify-center">
                              <QRCodeSVG
                                value={"https://exam.app/verify"}
                                size={70}
                                className="w-full h-full opacity-90"
                              />
                              <span className="text-[9px] font-mono text-slate-400 mt-1">
                                VERIFY-0X98A
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Draggable items */}
                    {(["studentName", "score", "signature"] as const).map((key) => {
                      const item = current.positions[key];
                      if (!item.visible) return null;
                      
                      const labels = {
                        studentName: "Budi Santoso",
                        score: "100",
                        signature: "Tanda Tangan",
                      };

                      if (key === "signature") {
                        return (
                          <div
                            key={key}
                            onMouseDown={() => handleDragStart(key)}
                            onTouchStart={() => handleDragStart(key)}
                            className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-move select-none p-1 border-2 border-dashed touch-none ${activeItem === key ? "border-sky-500 bg-sky-500/10" : "border-transparent hover:border-slate-300 dark:hover:border-slate-600"}`}
                            style={{
                              left: `${item.x}%`,
                              top: `${item.y}%`,
                              zIndex: 10,
                            }}
                          >
                            {current.signatureUrl ? (
                              <img
                                src={current.signatureTransparent && processedSignatureUrl ? processedSignatureUrl : current.signatureUrl}
                                alt="Signature"
                                style={{
                                  height: `${item.fontSize * 4}px`, // Arbitrary scaling based on font size for control
                                  objectFit: "contain",
                                }}
                                draggable={false}
                              />
                            ) : (
                              <div style={{ fontSize: `${item.fontSize}px`, color: item.color }}>
                                [ {labels[key]} ]
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div
                          key={key}
                          onMouseDown={() => handleDragStart(key)}
                          onTouchStart={() => handleDragStart(key)}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-move select-none whitespace-nowrap p-2 border-2 border-dashed touch-none ${activeItem === key ? "border-sky-500 bg-sky-500/10" : "border-transparent hover:border-slate-300 dark:hover:border-slate-600"}`}
                          style={{
                            left: `${item.x}%`,
                            top: `${item.y}%`,
                            fontSize: `${item.fontSize * 1.188}px`, // scaling using container query roughly
                            color: item.color,
                            fontWeight: "bold",
                            fontFamily:
                              key === "studentName"
                                ? '"Playfair Display", "Times New Roman", serif'
                                : '"JetBrains Mono", "Courier New", monospace',
                            letterSpacing:
                              key === "studentName" ? "0.02em" : "0.05em",
                            zIndex: 10,
                          }}
                        >
                          {labels[key]}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-400 dark:text-slate-500 m-auto">
                <SparklesIcon className="w-12 h-12 mx-auto mb-2 opacity-50 text-indigo-400" />
                <p>Opsi Sertifikat Otomatis Tidak Aktif</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/80">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => {
              onSave(current);
              onClose();
            }}
            className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm"
          >
            Simpan Pengaturan
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
