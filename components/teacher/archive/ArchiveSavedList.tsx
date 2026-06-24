import React from "react";
import { CloudArrowUpIcon, TrashIcon } from "../../Icons";
import type { ArchiveMetadata } from "./archiveUtils";

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
  userRole,
}) => {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
      <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
        <CloudArrowUpIcon className="w-5 h-5 text-indigo-500" /> Arsip Tersimpan
        (Cloud)
      </h3>
      <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-2 pr-1">
        {cloudArchives.length > 0 ? (
          cloudArchives.map((file, idx) => (
            <div key={idx} className="relative group">
              <button
                onClick={() => onLoadFromCloud(file.name)}
                className="w-full text-left p-3 rounded-xl border border-slate-100 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-700 hover:border-indigo-100 transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-300 pr-10">
                    {file.name}
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
                </div>

                {file.metadata ? (
                  <div className="mt-2 space-y-1 text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-2">
                    {userRole === "super_admin" && (
                      <div className="grid grid-cols-3 gap-1">
                        <span className="font-bold text-slate-400">
                          Sekolah
                        </span>
                        <span className="col-span-2 font-medium text-slate-700 dark:text-slate-300 truncate">
                          : {file.metadata.school || "-"}
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-1">
                      <span className="font-bold text-slate-400">
                        Mapel/Kelas
                      </span>
                      <span className="col-span-2 font-medium text-slate-700 dark:text-slate-300 truncate">
                        : {file.metadata.subject} ({file.metadata.classLevel})
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="font-bold text-slate-400">Evaluasi</span>
                      <span className="col-span-2 font-medium text-slate-700 dark:text-slate-300 truncate">
                        : {file.metadata.examType}
                      </span>
                    </div>
                    {file.metadata.targetClasses &&
                      file.metadata.targetClasses.length > 0 && (
                        <div className="grid grid-cols-3 gap-1">
                          <span className="font-bold text-slate-400">
                            Target
                          </span>
                          <span className="col-span-2 font-medium text-slate-700 dark:text-slate-300 truncate">
                            : {file.metadata.targetClasses.join(", ")}
                          </span>
                        </div>
                      )}
                    <div className="grid grid-cols-3 gap-1">
                      <span className="font-bold text-slate-400">Tanggal</span>
                      <span className="col-span-2 font-medium text-slate-700 dark:text-slate-300 truncate">
                        :{" "}
                        {file.metadata.date
                          ? new Date(file.metadata.date).toLocaleDateString(
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
                        {new Date(file.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
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
        ) : (
          <div className="text-center py-10 text-slate-400 text-xs">
            Tidak ada arsip di cloud.
          </div>
        )}
      </div>
    </div>
  );
};
