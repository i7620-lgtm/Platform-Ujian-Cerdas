import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../../lib/supabase";
import {
  StarIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  CheckCircleIcon,
} from "../../Icons";

export interface AppFeedbackItem {
  id: number | string;
  exam_code: string;
  student_id: string;
  student_name: string;
  school_name?: string;
  rating: number;
  feedback?: string;
  tags?: string[] | null;
  created_at: string;
}

export const StudentFeedbackView: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<AppFeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [starFilter, setStarFilter] = useState<number | "ALL">("ALL");
  const [selectedSchool, setSelectedSchool] = useState<string>("ALL");
  const [isDeletingId, setIsDeletingId] = useState<string | number | null>(null);

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    setIsLoading(true);
    try {
      // 1. Ambil dari Supabase
      const { data, error } = await supabase
        .from("app_feedbacks")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        setFeedbacks(data);
      } else {
        // Fallback: jika Supabase kosong atau offline, ambil dari LocalStorage
        try {
          const localData = JSON.parse(
            localStorage.getItem("app_user_feedbacks") || "[]"
          );
          if (Array.isArray(localData) && localData.length > 0) {
            const mapped = localData.map((item: any, idx: number) => ({
              id: item.id || `local-${idx}`,
              exam_code: item.examCode || item.exam_code || "-",
              student_id: item.studentId || item.student_id || "-",
              student_name: item.studentName || item.student_name || "Siswa",
              school_name: item.schoolName || item.school_name || "-",
              rating: Number(item.rating) || 5,
              feedback: item.comment || item.feedback || "",
              tags: item.tags || [],
              created_at: item.createdAt || item.created_at || new Date().toISOString(),
            }));
            setFeedbacks(mapped);
          } else {
            setFeedbacks([]);
          }
        } catch {
          setFeedbacks([]);
        }
      }
    } catch (err) {
      console.error("Gagal memuat feedback:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFeedback = async (id: number | string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus data ulasan ini?")) {
      return;
    }

    setIsDeletingId(id);
    try {
      if (typeof id === "number" || !String(id).startsWith("local-")) {
        await supabase.from("app_feedbacks").delete().eq("id", id);
      }
      setFeedbacks((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Gagal menghapus feedback:", err);
    } finally {
      setIsDeletingId(null);
    }
  };

  // List unik sekolah
  const uniqueSchools = useMemo(() => {
    const set = new Set<string>();
    feedbacks.forEach((f) => {
      if (f.school_name && f.school_name !== "-") set.add(f.school_name);
    });
    return Array.from(set);
  }, [feedbacks]);

  // Statistik Rating
  const stats = useMemo(() => {
    const total = feedbacks.length;
    if (total === 0) {
      return {
        averageRating: 0,
        satisfactionPct: 0,
        starCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        tagCounts: {} as Record<string, number>,
      };
    }

    const starCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sumRating = 0;
    let satisfiedCount = 0;
    const tagCounts: Record<string, number> = {};

    feedbacks.forEach((item) => {
      const r = Math.min(5, Math.max(1, Math.round(Number(item.rating) || 5)));
      starCounts[r] = (starCounts[r] || 0) + 1;
      sumRating += r;
      if (r >= 4) satisfiedCount++;

      if (Array.isArray(item.tags)) {
        item.tags.forEach((t) => {
          tagCounts[t] = (tagCounts[t] || 0) + 1;
        });
      }
    });

    return {
      averageRating: Number((sumRating / total).toFixed(1)),
      satisfactionPct: Math.round((satisfiedCount / total) * 100),
      starCounts,
      tagCounts,
    };
  }, [feedbacks]);

  // Filtered Data
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((item) => {
      // Filter Bintang
      if (starFilter !== "ALL" && Math.round(item.rating) !== starFilter) {
        return false;
      }

      // Filter Sekolah
      if (selectedSchool !== "ALL" && item.school_name !== selectedSchool) {
        return false;
      }

      // Search Query
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const nameMatch = item.student_name?.toLowerCase().includes(q);
        const schoolMatch = item.school_name?.toLowerCase().includes(q);
        const codeMatch = item.exam_code?.toLowerCase().includes(q);
        const feedbackMatch = item.feedback?.toLowerCase().includes(q);
        const tagMatch = item.tags?.some((t) => t.toLowerCase().includes(q));

        if (!nameMatch && !schoolMatch && !codeMatch && !feedbackMatch && !tagMatch) {
          return false;
        }
      }

      return true;
    });
  }, [feedbacks, starFilter, selectedSchool, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2.5">
            <span>Rekapan Penilaian & Kritik Saran Siswa</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
              {`${feedbacks.length} Masukan`}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Hasil evaluasi pengalaman pengguna dan umpan balik langsung dari siswa setelah menyelesaikan ujian.
          </p>
        </div>

        <button
          onClick={fetchFeedbacks}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm transition-all disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Rata-Rata Rating */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Rerata Penilaian
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
              Skala 1 - 5
            </span>
          </div>
          <div className="my-3 flex items-baseline gap-3">
            <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {stats.averageRating}
            </span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <StarIcon
                  key={s}
                  className={`w-5 h-5 ${
                    s <= Math.round(stats.averageRating)
                      ? "fill-amber-400 text-amber-400"
                      : "fill-transparent text-slate-200 dark:text-slate-700"
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Tingkat Kepuasan:{" "}
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {stats.satisfactionPct}% Positif
            </span>{" "}
            (★4 & ★5)
          </div>
        </div>

        {/* Card 2: Distribusi Bintang */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Distribusi Bintang
          </span>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((s) => {
              const count = (stats.starCounts as any)[s] || 0;
              const pct = feedbacks.length > 0 ? Math.round((count / feedbacks.length) * 100) : 0;
              return (
                <div key={s} className="flex items-center gap-2 text-xs">
                  <span className="w-6 font-bold text-slate-600 dark:text-slate-300 flex items-center gap-0.5">
                    {s} <StarIcon className="w-3 h-3 fill-amber-400 text-amber-400" />
                  </span>
                  <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        s >= 4 ? "bg-amber-400" : s === 3 ? "bg-yellow-500" : "bg-rose-400"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-[11px] text-slate-400 font-semibold">
                    {count} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 3: Tag / Kesan Terbanyak */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Kesan & Fitur Favorit
          </span>
          <div className="flex flex-wrap gap-1.5 overflow-y-auto max-h-[110px] custom-scrollbar">
            {Object.keys(stats.tagCounts).length > 0 ? (
              Object.entries(stats.tagCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([tag, count]) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-700/60 border border-slate-200/70 dark:border-slate-600 text-[11px] font-semibold text-slate-700 dark:text-slate-200"
                  >
                    <span>{tag}</span>
                    <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-black">
                      {count}
                    </span>
                  </span>
                ))
            ) : (
              <p className="text-xs text-slate-400 italic py-2">
                Belum ada tag yang dipilih siswa.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama siswa, sekolah, kode ujian, kritik/saran..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* Filter Bintang */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setStarFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              starFilter === "ALL"
                ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900"
                : "bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Semua Bintang
          </button>
          {[5, 4, 3, 2, 1].map((s) => (
            <button
              key={s}
              onClick={() => setStarFilter(s)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
                starFilter === s
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              <span>{s}</span>
              <StarIcon className="w-3.5 h-3.5 fill-current" />
            </button>
          ))}
        </div>

        {/* Filter Sekolah */}
        {uniqueSchools.length > 0 && (
          <select
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            className="w-full md:w-auto px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="ALL">Semua Sekolah ({uniqueSchools.length})</option>
            {uniqueSchools.map((sch) => (
              <option key={sch} value={sch}>
                {sch}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Feedbacks Table / List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left min-w-[900px]">
            <thead className="bg-slate-50/50 dark:bg-slate-700/50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Siswa & Sekolah
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Penilaian (Rating)
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Kesan & Tag
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Kritik & Saran
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Waktu
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Memuat data masukan siswa...
                  </td>
                </tr>
              ) : filteredFeedbacks.length > 0 ? (
                filteredFeedbacks.map((item) => {
                  const dateStr = item.created_at
                    ? new Date(item.created_at).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-";

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/40 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      {/* Siswa & Sekolah */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                          {item.student_name}
                        </div>
                        {item.exam_code && (
                          <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                            Kode Ujian: {item.exam_code}
                          </div>
                        )}
                      </td>

                      {/* Rating */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <StarIcon
                              key={s}
                              className={`w-4 h-4 ${
                                s <= item.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "fill-transparent text-slate-200 dark:text-slate-700"
                              }`}
                            />
                          ))}
                          <span className="text-xs font-black text-slate-700 dark:text-slate-300 ml-1">
                            {item.rating}/5
                          </span>
                        </div>
                      </td>

                      {/* Tags */}
                      <td className="px-6 py-4">
                        {Array.isArray(item.tags) && item.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {item.tags.map((t) => (
                              <span
                                key={t}
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">-</span>
                        )}
                      </td>

                      {/* Kritik & Saran */}
                      <td className="px-6 py-4 max-w-xs">
                        {item.feedback ? (
                          <p className="text-xs text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 leading-relaxed break-words">
                            "{item.feedback}"
                          </p>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Tidak ada saran tertulis
                          </span>
                        )}
                      </td>

                      {/* Waktu */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {dateStr}
                      </td>

                      {/* Aksi */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteFeedback(item.id)}
                          disabled={isDeletingId === item.id}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Hapus masukan ini"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <p className="font-bold text-sm">Tidak ada penilaian / kritik saran ditemukan.</p>
                    <p className="text-xs mt-1">
                      {searchQuery || starFilter !== "ALL" || selectedSchool !== "ALL"
                        ? "Coba sesuaikan filter atau kata kunci pencarian."
                        : "Masukan dari siswa akan otomatis tampil di sini setelah dikirim."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
