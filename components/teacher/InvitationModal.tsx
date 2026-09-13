import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  XMarkIcon,
  PrinterIcon,
  LogoIcon,
  ClockIcon,
  UserIcon,
  QrCodeIcon,
  DocumentDuplicateIcon,
  ShareIcon,
  BookOpenIcon,
  CheckCircleIcon,
} from "../Icons";
import type { Exam } from "../../types";
import { KisiKisiModal } from "./KisiKisiModal";
import { RegisterSchoolModal } from "./RegisterSchoolModal";
import { useInvitationModal } from "./useInvitationModal";

interface InvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherName?: string;
  schoolName?: string;
  exam?: Exam | null;
  onJoin?: (examCode: string) => void;
}

export const InvitationModal: React.FC<InvitationModalProps> = ({
  isOpen,
  onClose,
  teacherName,
  schoolName,
  exam,
  onJoin,
}) => {
  const hook = useInvitationModal({ isOpen, exam, onClose });
  const {
    timeLeft,
    isStarted,
    showKisiKisi,
    showRegisterModal,
    setShowKisiKisi,
    setShowRegisterModal,
    getFormattedStartDate,
  } = hook;

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const currentUrl =
    typeof window !== "undefined" ? window.location.origin : "";
  const joinUrl = exam ? `${currentUrl}/?join=${exam.code}` : currentUrl;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}&margin=10`;

  const displaySchoolName =
    schoolName ||
    exam?.authorSchool ||
    exam?.config?.schoolName ||
    teacherName ||
    exam?.authorName ||
    "Penyelenggara Ujian";

  const handleCopyCode = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!exam?.code) return;
    navigator.clipboard.writeText(exam.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(joinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleActionJoin = () => {
    if (isStarted) {
      if (onJoin && exam) {
        onJoin(exam.code);
      } else {
        window.location.href = joinUrl;
      }
    } else {
      alert(
        `Ujian belum dimulai.\nJadwal Pelaksanaan: ${getFormattedStartDate()}.\n\nSilakan bersiap dan masuk saat jadwal pelaksanaan tiba.`
      );
    }
  };

  if (!isOpen) return null;

  // --- MODE 1: BAGIKAN APP (COMPACT CARD) ---
  if (!exam) {
    return createPortal(
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in font-sans select-none">
        <div className="relative bg-white dark:bg-slate-900 w-full max-w-[320px] rounded-3xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700 animate-slide-in-up flex flex-col">
          {/* Compact Decorative Header */}
          <div className="h-16 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 relative shrink-0">
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-sm"
              title="Tutup"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 pb-5 -mt-8 relative flex flex-col items-center text-center flex-1">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl shadow-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2 ring-4 ring-white dark:ring-slate-900">
              <LogoIcon className="w-7 h-7" />
            </div>

            <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight leading-none">
              UjianCerdas
            </h2>
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
              Platform Evaluasi Belajar
            </p>

            <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm mb-3 relative group shrink-0">
              <img
                src={qrUrl}
                alt="App QR"
                className="w-28 h-28 object-contain relative z-10"
              />
            </div>

            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed px-1">
              Pindai atau bagikan tautan ini untuk mengajak orang lain menggunakan aplikasi.
            </p>

            <div className="w-full flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex-1 px-2 overflow-hidden text-left">
                <p className="text-[10px] font-code slashed-zero font-bold text-indigo-600 dark:text-indigo-400 truncate">
                  {joinUrl}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className="p-1.5 bg-white dark:bg-slate-700 text-slate-500 hover:text-indigo-600 dark:text-slate-300 rounded-md shadow-sm border border-slate-100 dark:border-slate-600 transition-all"
                title="Salin"
              >
                {copiedLink ? (
                  <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                )}
              </button>
              {navigator.share && (
                <button
                  type="button"
                  onClick={() =>
                    navigator.share({
                      title: "UjianCerdas",
                      text: "Coba aplikasi ujian online modern ini!",
                      url: joinUrl,
                    })
                  }
                  className="p-1.5 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 transition-all"
                  title="Bagikan"
                >
                  <ShareIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // --- MODE 2: UNDANGAN UJIAN (FULL DETAIL) ---
  const handlePrint = () => {
    window.print();
  };

  const getExamTypeBadge = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("pas") || t.includes("akhir"))
      return "bg-indigo-600 text-white";
    if (t.includes("harian") || t.includes("pts"))
      return "bg-amber-500 text-white";
    return "bg-blue-600 text-white";
  };

  return createPortal(
    <>
      <div className="invitation-modal-root fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-900/75 backdrop-blur-md animate-fade-in font-sans select-none">
        {!showKisiKisi && (
          <style>{`
            @media print {
              @page { margin: 0; size: auto; }
              body * { visibility: hidden; }
              .print-container, .print-container * { visibility: visible !important; }
              .print-container { position: fixed; left: 0; top: 0; width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; background: white; z-index: 9999; }
              #invitation-card { width: 680px !important; max-width: 680px !important; border: 1px solid #e2e8f0 !important; box-shadow: none !important; border-radius: 20px !important; overflow: hidden; background: white !important; color: black !important; }
              .no-print { display: none !important; }
              .print-show-flex { display: flex !important; }
            }
          `}</style>
        )}

        <div className="print-container w-full h-full flex items-center justify-center pointer-events-none">
          <div
            id="invitation-card"
            className="bg-white dark:bg-slate-900 w-full max-w-sm sm:max-w-md md:max-w-3xl lg:max-w-4xl rounded-2xl md:rounded-[1.75rem] shadow-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 relative animate-slide-in-up pointer-events-auto transition-all duration-300 max-h-[92vh] flex flex-col justify-center"
          >
            {/* Top Border Accent Gradient */}
            <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shrink-0"></div>

            {/* ========================================================================= */}
            {/* 1. MOBILE & COMPACT PORTRAIT LAYOUT (< md) - Zero scroll, all-in-one view */}
            {/* ========================================================================= */}
            <div className="md:hidden flex flex-col p-3.5 sm:p-4 text-slate-800 dark:text-slate-100 overflow-hidden no-print">
              {/* Header: School name & Close button */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    <UserIcon className="w-3 h-3" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">
                    {displaySchoolName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-full bg-slate-100 hover:bg-rose-500 hover:text-white dark:bg-slate-800 text-slate-400 transition-colors shrink-0"
                  title="Tutup"
                >
                  <XMarkIcon className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Title & Badges: Full Subject Name on Top, Exam Type & Target Classes on Next Row */}
              <div className="mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight leading-snug break-words">
                  {exam ? exam.config.subject : "Evaluasi Belajar"}
                </h2>
                {/* Baris Berikutnya: TKA / Jenis Ujian + Target Kelas / Sekolah */}
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  {exam && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shrink-0 ${getExamTypeBadge(exam.config.examType)}`}
                    >
                      {exam.config.examType}
                    </span>
                  )}
                  {exam?.config.targetClasses && exam.config.targetClasses.length > 0 ? (
                    exam.config.targetClasses.map((cls, idx) => {
                      const isVeryLong = cls.length > 18;
                      const isLong = cls.length > 12;
                      return (
                        <span
                          key={idx}
                          title={cls}
                          className={`px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded border border-slate-200 dark:border-slate-700 uppercase leading-none inline-flex items-center ${
                            isVeryLong
                              ? "text-[7px] max-w-[190px] truncate"
                              : isLong
                              ? "text-[7.5px]"
                              : "text-[8px]"
                          }`}
                        >
                          {cls}
                        </span>
                      );
                    })
                  ) : null}
                </div>
              </div>

              {/* Middle Section: Side-by-side 2 columns (Left: QR & Code, Right: Schedule & Timer) */}
              <div className="grid grid-cols-12 gap-2 mb-2.5 items-stretch">
                {/* Left: QR + Kode Akses */}
                <div className="col-span-5 flex flex-col items-center justify-between bg-slate-50 dark:bg-slate-800/40 rounded-xl p-2 border border-slate-100 dark:border-slate-700/60">
                  <div className="bg-white p-1 rounded-lg border border-slate-100 shadow-2xs">
                    <img
                      src={qrUrl}
                      alt="Join QR"
                      className="w-18 h-18 sm:w-20 sm:h-20 object-contain"
                    />
                  </div>
                  <div className="text-center mt-1 w-full">
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block">
                      Kode Akses
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="mt-0.5 w-full bg-white dark:bg-slate-900 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center justify-center gap-1 active:scale-95 transition-all"
                      title="Klik untuk salin kode"
                    >
                      <span className="font-code slashed-zero text-xs font-black tracking-widest text-slate-800 dark:text-white">
                        {exam?.code || "------"}
                      </span>
                      {copiedCode ? (
                        <CheckCircleIcon className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                      ) : (
                        <DocumentDuplicateIcon className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Right: Schedule & Countdown */}
                <div className="col-span-7 flex flex-col justify-between bg-slate-50 dark:bg-slate-800/40 rounded-xl p-2.5 border border-slate-100 dark:border-slate-700/60">
                  <div>
                    <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 mb-0.5">
                      <ClockIcon className="w-3 h-3" />
                      <span className="text-[8px] font-black uppercase tracking-wider">
                        Jadwal Pelaksanaan
                      </span>
                    </div>
                    <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 leading-snug">
                      {getFormattedStartDate()}
                    </p>
                  </div>

                  <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/50">
                    {isStarted ? (
                      <div className="py-1 flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase animate-pulse">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span>Ujian Dimulai</span>
                      </div>
                    ) : timeLeft ? (
                      <div>
                        <span className="text-[7px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                          Waktu Tersisa
                        </span>
                        <div className="grid grid-cols-4 gap-1 text-slate-800 dark:text-white">
                          {[
                            { val: timeLeft.d, label: "HARI" },
                            { val: timeLeft.h, label: "JAM" },
                            { val: timeLeft.m, label: "MENIT" },
                            { val: timeLeft.s, label: "DETIK" },
                          ].map((t, i) => (
                            <div
                              key={i}
                              className="bg-white dark:bg-slate-800 rounded p-1 text-center border border-slate-100 dark:border-slate-700 shadow-2xs"
                            >
                              <span className="font-code text-xs font-black block leading-none">
                                {t.val.toString().padStart(2, "0")}
                              </span>
                              <span className="text-[6px] font-black text-slate-400 leading-none">
                                {t.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[9px] font-bold text-slate-400 animate-pulse">
                        Menyiapkan waktu...
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Primary Action Button: Masuk Ujian / Click to Join */}
              <button
                type="button"
                onClick={handleActionJoin}
                className={`w-full py-2 rounded-xl text-white text-xs font-black uppercase tracking-wider text-center shadow-md transition-all active:scale-98 ${
                  isStarted
                    ? "bg-emerald-600 hover:bg-emerald-700 animate-pulse shadow-emerald-500/20"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {isStarted ? "Masuk Ujian Sekarang" : "Click to Join"}
              </button>

              {/* Secondary Action Row: 3 Compact Buttons */}
              <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="py-1.5 px-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px] rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1 active:scale-95 transition-colors"
                  title="Salin tautan ujian"
                >
                  {copiedLink ? (
                    <CheckCircleIcon className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <DocumentDuplicateIcon className="w-3 h-3 text-slate-400" />
                  )}
                  <span>{copiedLink ? "Disalin" : "Salin Link"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowKisiKisi(true)}
                  className="py-1.5 px-2 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] rounded-lg border border-indigo-200/80 dark:border-indigo-900/60 flex items-center justify-center gap-1 active:scale-95 transition-colors"
                >
                  <BookOpenIcon className="w-3 h-3" />
                  <span>Kisi-Kisi</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="py-1.5 px-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px] rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1 active:scale-95 transition-colors"
                >
                  <PrinterIcon className="w-3 h-3 text-slate-400" />
                  <span>Cetak</span>
                </button>
              </div>

              {/* Register School Link */}
              <button
                type="button"
                onClick={() => setShowRegisterModal(true)}
                className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline text-center pt-1 block"
              >
                Daftarkan Sekolah Saya
              </button>
            </div>

            {/* ========================================================================= */}
            {/* 2. DESKTOP & TABLET LAYOUT (>= md) - Professional 2-Panel Card            */}
            {/* ========================================================================= */}
            <div className="hidden md:flex flex-row relative bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 print-show-flex">
              {/* Absolute Close Button (Desktop) */}
              <button
                type="button"
                onClick={onClose}
                className="absolute top-3.5 right-3.5 z-30 p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-400 rounded-full transition-all no-print border border-transparent shadow-xs"
                title="Tutup"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>

              {/* Left Panel: QR Code & Access Details (~38% width) */}
              <div className="w-[38%] p-5 lg:p-6 flex flex-col items-center justify-between bg-slate-50/70 dark:bg-slate-800/30 border-r border-slate-100 dark:border-slate-800 shrink-0">
                {/* Brand Logo Header */}
                <div className="flex items-center gap-1.5 opacity-80 mb-2">
                  <LogoIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span className="font-black text-xs text-slate-700 dark:text-slate-300 tracking-tight">
                    UjianCerdas
                  </span>
                </div>

                {/* QR Box */}
                <div className="relative group">
                  <div className="relative bg-white p-2.5 rounded-2xl shadow-md border border-slate-100">
                    <img
                      src={qrUrl}
                      alt="Join QR"
                      className="w-28 h-28 lg:w-32 lg:h-32 object-contain"
                    />
                  </div>
                  <div className="mt-1.5 text-center">
                    <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-100 dark:border-slate-700 shadow-2xs">
                      <QrCodeIcon className="w-2.5 h-2.5 text-slate-400" />
                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Scan to Join
                      </span>
                    </div>
                  </div>
                </div>

                {/* Access Code Box with One-Click Copy */}
                <div className="w-full mt-2 text-center">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">
                    Kode Akses
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="w-full bg-white dark:bg-slate-900 py-1 px-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center justify-center gap-2 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all cursor-pointer group/code"
                    title="Klik untuk salin kode akses"
                  >
                    <span className="font-code slashed-zero text-lg lg:text-xl font-black tracking-[0.2em] text-slate-800 dark:text-white">
                      {exam?.code || "------"}
                    </span>
                    {copiedCode ? (
                      <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <DocumentDuplicateIcon className="w-3.5 h-3.5 text-slate-400 group-hover/code:text-indigo-600 transition-colors shrink-0" />
                    )}
                  </button>
                  {copiedCode && (
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5 animate-fade-in">
                      Kode disalin ke clipboard!
                    </span>
                  )}
                </div>

                {/* Link Bar & CTAs (Hidden on Print) */}
                <div className="w-full space-y-1.5 mt-2.5 no-print">
                  <div className="relative bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center shadow-2xs">
                    <input
                      readOnly
                      value={joinUrl}
                      className="w-full bg-transparent text-[10px] text-slate-600 dark:text-slate-300 font-code slashed-zero outline-none px-1.5 truncate"
                      onClick={(e) => e.currentTarget.select()}
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                      title="Salin Link"
                    >
                      {copiedLink ? (
                        <CheckCircleIcon className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <DocumentDuplicateIcon className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleActionJoin}
                    className={`w-full py-2 text-white text-[11px] font-bold uppercase tracking-wider rounded-xl text-center shadow-md transition-all active:scale-98 ${
                      isStarted
                        ? "bg-emerald-600 hover:bg-emerald-700 animate-pulse shadow-emerald-500/20"
                        : "bg-indigo-600 hover:bg-indigo-700"
                    }`}
                  >
                    {isStarted ? "Masuk Ujian Sekarang" : "Click to Join"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRegisterModal(true)}
                    className="w-full py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-xl border border-emerald-200 dark:border-emerald-800 text-center transition-colors"
                  >
                    Daftarkan Sekolah Saya
                  </button>
                </div>
              </div>

              {/* Right Panel: Content, Schedule & Auxiliary Actions (~62% width) */}
              <div className="w-[62%] p-5 lg:p-6 flex flex-col justify-between relative bg-white dark:bg-slate-900">
                {/* Header: Penyelenggara */}
                <div className="pr-8">
                  <span className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-0.5 block">
                    Penyelenggara
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <UserIcon className="w-3 h-3" />
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                      {displaySchoolName}
                    </span>
                  </div>
                </div>

                {/* Subject Title & Badges */}
                <div className="my-2.5">
                  <h2 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug line-clamp-2">
                    {exam ? exam.config.subject : "Evaluasi Belajar"}
                  </h2>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {exam && (
                      <span
                        className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest shadow-2xs ${getExamTypeBadge(exam.config.examType)}`}
                      >
                        {exam.config.examType}
                      </span>
                    )}
                    {exam?.config.targetClasses &&
                      exam.config.targetClasses.map((c) => (
                        <span
                          key={c}
                          className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[8px] font-black rounded border border-slate-200 dark:border-slate-700 uppercase"
                        >
                          {c}
                        </span>
                      ))}
                  </div>
                </div>

                {/* Schedule & Countdown Box */}
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3.5 border border-slate-100 dark:border-slate-700/60 my-auto shadow-inner">
                  {isStarted ? (
                    <div className="animate-pulse flex items-center justify-center gap-2 py-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-wider text-xs">
                        Ujian Sedang Berlangsung
                      </span>
                    </div>
                  ) : timeLeft ? (
                    <div>
                      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-200/70 dark:border-slate-700/50">
                        <div>
                          <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                            Jadwal Pelaksanaan
                          </p>
                          <p className="text-xs lg:text-sm font-black text-slate-800 dark:text-slate-200 capitalize mt-0.5">
                            {getFormattedStartDate()}
                          </p>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 mb-1">
                          <ClockIcon className="w-3 h-3" />
                          <span className="text-[8px] font-black uppercase tracking-[0.15em]">
                            Waktu Tersisa
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-slate-800 dark:text-white">
                          {[
                            { val: timeLeft.d, label: "HARI" },
                            { val: timeLeft.h, label: "JAM" },
                            { val: timeLeft.m, label: "MENIT" },
                            { val: timeLeft.s, label: "DETIK" },
                          ].map((t, i) => (
                            <div
                              key={i}
                              className="flex flex-col items-center bg-white dark:bg-slate-800 rounded-lg p-1.5 border border-slate-100 dark:border-slate-700 shadow-2xs"
                            >
                              <span className="font-code text-base lg:text-lg font-black tabular-nums leading-tight">
                                {t.val.toString().padStart(2, "0")}
                              </span>
                              <span className="text-[7px] uppercase font-black text-slate-400">
                                {t.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-2 text-center text-xs font-bold text-slate-400 animate-pulse tracking-widest uppercase">
                      Menyiapkan Waktu...
                    </div>
                  )}
                </div>

                {/* Footer Action Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 no-print">
                  <div className="flex flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => setShowKisiKisi(true)}
                      className="group flex-1 py-2 px-3 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl border border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all flex items-center justify-center gap-2 active:scale-98"
                    >
                      <BookOpenIcon className="w-4 h-4 opacity-90 group-hover:scale-110 transition-transform" />
                      <span>Baca Kisi-Kisi</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePrint}
                      className="group flex-1 py-2 px-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2 active:scale-98"
                    >
                      <PrinterIcon className="w-4 h-4 opacity-90 group-hover:scale-110 transition-transform" />
                      <span>Cetak Kartu Undangan</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <KisiKisiModal
        isOpen={showKisiKisi}
        onClose={() => setShowKisiKisi(false)}
        questions={exam?.questions || []}
        subject={exam?.config.subject || ""}
        schoolName={schoolName}
        teacherName={teacherName}
      />
      <RegisterSchoolModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        schoolName={schoolName}
        examType={exam?.config.examType}
        exam={exam}
        hook={hook}
      />
    </>,
    document.body
  );
};
