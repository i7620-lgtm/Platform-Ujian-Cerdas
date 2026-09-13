import React, { useState, useMemo, useRef } from "react";
import {
  CloudArrowUpIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CalendarDaysIcon,
} from "../../Icons";
import {
  type ArchiveMetadata,
  sortArchivesNewestFirst,
  matchesArchiveSearch,
} from "./archiveUtils";

interface ArchiveSavedListProps {
  cloudArchives: {
    name: string;
    created_at: string;
    size: number;
    metadata?: ArchiveMetadata;
  }[];
  onLoadFromCloud: (filename: string) => void;
  onDeleteArchive: (filename: string, e: React.MouseEvent) => void;
  userRole: string | null;
}

export const ArchiveSavedList: React.FC<ArchiveSavedListProps> = ({
  cloudArchives,
  onLoadFromCloud,
  onDeleteArchive,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 1. Selalu mengurutkan arsip dari tanggal terbaru sampai terlama
  const sortedArchives = useMemo(() => {
    return sortArchivesNewestFirst(cloudArchives);
  }, [cloudArchives]);

  // 2. Filter arsip berdasarkan kriteria pencarian (sekolah, mapel/kelas, evaluasi, tanggal/bulan/tahun, kode soal)
  const filteredArchives = useMemo(() => {
    return sortedArchives.filter((file) =>
      matchesArchiveSearch(file, searchQuery)
    );
  }, [sortedArchives, searchQuery]);

  const handleClearSearch = () => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchInputRef.current?.blur();
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
      {/* Header section */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <CloudArrowUpIcon className="w-5 h-5 text-indigo-500 shrink-0" />
          <span>Arsip Tersimpan (Cloud)</span>
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
            {searchQuery.trim()
              ? `${filteredArchives.length} dari ${sortedArchives.length} Arsip`
              : `${sortedArchives.length} Arsip`}
          </span>
        </div>
      </div>

      {/* Search Bar & Dedicated Search Button */}
      <div className="mb-4 space-y-2">
        <form
          onSubmit={handleSearchSubmit}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <MagnifyingGlassIcon className="w-4 h-4" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari sekolah, mapel/kelas, evaluasi, tanggal, kode soal..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Hapus pencarian"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer"
            title="Cari arsip sekarang"
          >
            <MagnifyingGlassIcon className="w-3.5 h-3.5" />
            <span>Cari</span>
          </button>
        </form>

        {/* Sorting indicator & quick reset */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 px-1">
          <span className="flex items-center gap-1">
            <CalendarDaysIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span>Urutan:</span>
            <strong className="text-slate-600 dark:text-slate-300 font-semibold">
              Terbaru → Terlama
            </strong>
          </span>
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
            >
              Reset Pencarian
            </button>
          )}
        </div>
      </div>

      <div className="max-h-[320px] overflow-y-auto custom-scrollbar space-y-2 pr-1">
        {sortedArchives.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            Tidak ada arsip di cloud.
          </div>
        ) : filteredArchives.length === 0 ? (
          <div className="text-center py-8 px-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            <MagnifyingGlassIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Tidak ditemukan arsip yang cocok
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto truncate">
              Kata kunci: <span className="font-semibold text-slate-700 dark:text-slate-200">"{searchQuery}"</span>
            </p>
            <button
              type="button"
              onClick={handleClearSearch}
              className="mt-3 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
              <span>Reset Pencarian</span>
            </button>
          </div>
        ) : (
          filteredArchives.map((file, idx) => (
            <div key={idx} className="relative group">
              <button
                onClick={() => onLoadFromCloud(file.name)}
                className="w-full text-left p-3 rounded-xl border border-slate-100 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-700 hover:border-indigo-100 transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <p 
                    className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-300 pr-10"
                    title={file.name}
                  >
                    {file.name.includes("_meta_")
                      ? `${file.name.split("_meta_")[0]}.json`
                      : file.name}
                  </p>
                  {file.metadata &&
                    (!file.metadata.authorId ||
                      String(file.metadata.authorId).trim() === "" ||
                      String(file.metadata.authorId) === "undefined" ||
                      String(file.metadata.authorId) === "null") && (
                      <span
                        className="shrink-0 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 rounded-md border border-rose-200 dark:border-rose-800"
                        title="Arsip ini belum memiliki pemilik dan siap diklaim."
                      >
                        Tanpa Pemilik
                      </span>
                    )}
                  {file.metadata && file.metadata.hasAiAnalysis && (
                      <span
                        className="shrink-0 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-md border border-indigo-200 dark:border-indigo-800"
                        title="Arsip ini memiliki analisis AI."
                      >
                        AI
                      </span>
                  )}
                </div>

                {file.metadata ? (
                  <div className="mt-2 space-y-1 text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-2">
                    {file.metadata.school && file.metadata.school !== "-" && (
                      <div className="grid grid-cols-3 gap-1">
                        <span className="font-bold text-slate-400">
                          Sekolah
                        </span>
                        <span 
                          className="col-span-2 font-medium text-slate-700 dark:text-slate-300 truncate"
                          title={String(file.metadata.school)}
                        >
                          : {file.metadata.school}
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-1">
                      <span className="font-bold text-slate-400">
                        Mapel/Kelas
                      </span>
                      <span 
                        className="col-span-2 font-medium text-slate-700 dark:text-slate-300 truncate"
                        title={`${file.metadata.subject || "-"} (${file.metadata.classLevel || "-"})`}
                      >
                        : {file.metadata.subject || "-"} ({file.metadata.classLevel || "-"})
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="font-bold text-slate-400">Evaluasi</span>
                      <span className="col-span-2 font-medium text-slate-700 dark:text-slate-300 truncate">
                        : {file.metadata.examType || "-"}
                      </span>
                    </div>
                    {file.metadata.targetClasses &&
                      (Array.isArray(file.metadata.targetClasses)
                        ? file.metadata.targetClasses.filter((t) => t && String(t).trim() !== "").length > 0
                        : String(file.metadata.targetClasses).trim() !== "") && (
                        <div className="grid grid-cols-3 gap-1">
                          <span className="font-bold text-slate-400">
                            Target Kelas
                          </span>
                          <span className="col-span-2 font-medium text-slate-700 dark:text-slate-300 truncate">
                            : {Array.isArray(file.metadata.targetClasses)
                              ? file.metadata.targetClasses.filter(Boolean).join(", ")
                              : String(file.metadata.targetClasses)}
                          </span>
                        </div>
                      )}
                    <div className="grid grid-cols-3 gap-1">
                      <span className="font-bold text-slate-400">Tanggal</span>
                      <span className="col-span-2 font-medium text-slate-700 dark:text-slate-300 truncate">
                        :{" "}
                        {file.metadata.date && !isNaN(Date.parse(String(file.metadata.date)))
                          ? new Date(file.metadata.date).toLocaleDateString(
                              "id-ID",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              },
                            )
                          : file.created_at && !isNaN(Date.parse(String(file.created_at)))
                          ? new Date(file.created_at).toLocaleDateString(
                              "id-ID",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              },
                            )
                          : "-"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="font-bold text-slate-400">
                        Partisipan
                      </span>
                      <span className="col-span-2 font-medium text-slate-700 dark:text-slate-300 truncate">
                        :{" "}
                        {file.metadata.participantCount
                          ? `${file.metadata.participantCount} Siswa`
                          : "-"}
                      </span>
                    </div>
                    <div className="text-[9px] text-right text-slate-300 mt-1">
                      {(file.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 space-y-1 text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border border-slate-200 dark:border-slate-600">
                        Arsip Lama
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="font-bold text-slate-400">Tanggal</span>
                      <span className="col-span-2 font-medium text-slate-700 dark:text-slate-300 truncate">
                        :{" "}
                        {file.created_at && !isNaN(Date.parse(String(file.created_at)))
                          ? new Date(file.created_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="font-bold text-slate-400">Ukuran</span>
                      <span className="col-span-2 font-medium text-slate-700 dark:text-slate-300 truncate">
                        : {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-400 italic mt-1">
                      Detail lengkap tidak tersedia di pratinjau.
                    </div>
                  </div>
                )}
              </button>
              <button
                onClick={(e) => onDeleteArchive(file.name, e)}
                className="absolute top-2 right-2 p-1.5 bg-white dark:bg-slate-700 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-all shadow-sm border border-slate-200 dark:border-slate-600 z-10"
                title="Hapus Arsip"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
