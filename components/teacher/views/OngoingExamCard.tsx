import React from "react";
import { Exam } from "../../../types";
import {
  QrCodeIcon,
  UserIcon,
  ShareIcon,
  DocumentDuplicateIcon,
} from "../../Icons";
import { MetaBadge, RemainingTime } from "./SharedComponents";

interface OngoingExamCardProps {
  exam: Exam;
  activeCount: number;
  onClick: () => void;
  onQrClick: () => void;
  onCollabClick: () => void;
  onShareClick: () => void;
  onDuplicateClick: () => void;
}

export const OngoingExamCard: React.FC<OngoingExamCardProps> = ({
  exam,
  activeCount,
  onClick,
  onQrClick,
  onCollabClick,
  onShareClick,
  onDuplicateClick,
}) => {
  return (
    <div
      className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-900 shadow-sm hover:shadow-xl hover:shadow-emerald-50 dark:hover:shadow-emerald-900/10 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-300 relative group cursor-pointer"
      onClick={onClick}
    >
      {/* ACTION BUTTONS */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onQrClick();
          }}
          className="p-2 bg-white dark:bg-slate-700 text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg border border-slate-100 dark:border-slate-600 hover:border-emerald-100 dark:hover:border-emerald-800 transition-all shadow-sm"
          title="QR Code Gabung Siswa"
        >
          <QrCodeIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCollabClick();
          }}
          className="p-2 bg-white dark:bg-slate-700 text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg border border-slate-100 dark:border-slate-600 hover:border-blue-100 dark:hover:border-blue-800 transition-all shadow-sm"
          title="Akses Kolaborasi"
        >
          <UserIcon className="w-4 h-4" />
        </button>
        {exam.config.enablePublicStream && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onShareClick();
            }}
            className="p-2 bg-white dark:bg-slate-700 text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg border border-slate-100 dark:border-slate-600 hover:border-indigo-100 dark:hover:border-indigo-800 transition-all shadow-sm"
            title="Bagikan Link Pantauan"
          >
            <ShareIcon className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicateClick();
          }}
          className="p-2 bg-white dark:bg-slate-700 text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-600 hover:text-primary dark:hover:text-white rounded-lg border border-slate-100 dark:border-slate-600 hover:border-gray-200 dark:hover:border-slate-500 transition-all shadow-sm"
          title="Gunakan Kembali Soal"
        >
          <DocumentDuplicateIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md w-fit mb-2 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Sedang Berlangsung
          </span>
          <h3 className="font-bold text-xl text-neutral dark:text-white">
            {exam.config.subject || exam.code}
          </h3>
          <p className="text-sm font-code slashed-zero text-gray-400 dark:text-slate-500 mt-0.5">
            {exam.code}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-3 mb-5">
        <MetaBadge
          text={exam.config.classLevel}
          colorClass="bg-gray-100 text-gray-600"
        />
        <MetaBadge
          text={exam.config.examType}
          colorClass="bg-gray-100 text-gray-600"
        />
        {exam.config.targetClasses && exam.config.targetClasses.length > 0 && (
          <MetaBadge
            text={exam.config.targetClasses.join(", ")}
            colorClass="bg-orange-50 text-orange-700 border-orange-100"
          />
        )}
      </div>

      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 border border-gray-100 dark:border-slate-700 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider">
            Partisipan
          </span>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex -space-x-2">
              {[...Array(Math.min(3, activeCount))].map((_, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full bg-emerald-200 dark:bg-emerald-800 border-2 border-white dark:border-slate-700"
                ></div>
              ))}
            </div>
            <span className="text-sm font-bold text-gray-700 dark:text-slate-300">
              {activeCount} Siswa
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider">
            Sisa Waktu
          </span>
          <div className="mt-1">
            <RemainingTime exam={exam} />
          </div>
        </div>
      </div>
    </div>
  );
};
