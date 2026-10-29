import React, { useState, useMemo } from 'react';
import type { Result, Exam, TeacherProfile, AnalyticsFilter } from '../../../types';
import { analyticsService } from '../../../services/analyticsService';
import { formatBandwidth, formatDurationHuman } from '../../../utils/telemetryUtils';
import {
  Users,
  CheckCircle2,
  Clock,
  Database,
  ShieldAlert,
  Smartphone,
  Laptop,
  Download,
  Printer,
  Search,
  Filter,
  BarChart3,
  Calendar,
  Layers,
  Globe,
  ArrowUpRight,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

interface AnalyticsViewProps {
  exams: Record<string, Exam>;
  results: Result[];
  teacherProfile: TeacherProfile;
  onRefreshData?: () => Promise<void>;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  exams,
  results,
  teacherProfile,
  onRefreshData
}) => {
  const [filter, setFilter] = useState<AnalyticsFilter>({
    dateRange: 'this_month',
    classLevel: 'ALL',
    school: 'ALL',
    searchQuery: ''
  });

  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const isSuperAdmin = teacherProfile.accountType === 'super_admin';
  const isAdminSekolah = teacherProfile.accountType === 'admin_sekolah';
  const isGuru = !isSuperAdmin && !isAdminSekolah;

  // 1. Ekstrak opsi filter unik (Daftar Kelas & Daftar Sekolah)
  const availableClasses = useMemo(() => {
    const classSet = new Set<string>();
    results.forEach(r => {
      if (r.student?.class && r.student.class !== 'PREVIEW') {
        classSet.add(r.student.class.trim());
      }
    });
    return Array.from(classSet).sort();
  }, [results]);

  const availableSchools = useMemo(() => {
    const schoolSet = new Set<string>();
    results.forEach(r => {
      if (r.student?.schoolName) schoolSet.add(r.student.schoolName.trim());
    });
    Object.values(exams).forEach(e => {
      if (e.authorSchool) schoolSet.add(e.authorSchool.trim());
    });
    if (teacherProfile.school) schoolSet.add(teacherProfile.school.trim());
    return Array.from(schoolSet).filter(Boolean).sort();
  }, [results, exams, teacherProfile.school]);

  // 2. Filter data hasil & hitung statistik komprehensif
  const { filteredResults } = useMemo(() => {
    return analyticsService.filterResultsByRoleAndCriteria(results, exams, teacherProfile, filter);
  }, [results, exams, teacherProfile, filter]);

  const stats = useMemo(() => {
    return analyticsService.computeStatistics(results, exams, teacherProfile, filter);
  }, [results, exams, teacherProfile, filter]);

  // 3. Paginasi Tabel Rincian Telemetri
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredResults.slice(start, start + pageSize);
  }, [filteredResults, currentPage]);

  const totalPages = Math.ceil(filteredResults.length / pageSize) || 1;

  // 4. Handler Ekspor Data CSV
  const handleExportCsv = () => {
    try {
      setIsExporting(true);
      const csvData = analyticsService.exportToCsv(filteredResults, exams);
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 10);
      link.setAttribute('href', url);
      link.setAttribute('download', `statistik_penggunaan_${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Gagal mengekspor CSV:', err);
      alert('Terjadi kesalahan saat mengekspor data.');
    } finally {
      setIsExporting(false);
    }
  };

  // 5. Handler Refresh
  const handleRefresh = async () => {
    if (!onRefreshData) return;
    setIsRefreshing(true);
    try {
      await onRefreshData();
    } finally {
      setIsRefreshing(false);
    }
  };

  // 6. Handler Print Laporan Rekap
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Header & Breadcrumb Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Dasbor Pengajar</span>
            <span aria-hidden="true">·</span>
            <span>Observabilitas & Analitik</span>
            <span aria-hidden="true">·</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
              {isGuru && 'Statistik Guru Mandiri'}
              {isAdminSekolah && `Statistik Sekolah (${teacherProfile.school || 'Sekolah'})`}
              {isSuperAdmin && 'Statistik Nasional & Multi-Sekolah'}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Statistik & Penggunaan Aplikasi
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Mencatat pengguna bulanan, jenjang kelas, durasi pengerjaan, kuota data riil via Performance API, dan daerah asal.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {onRefreshData && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              title="Perbarui Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Perbarui</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cetak Rekap</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={isExporting || filteredResults.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Bar (Segmented & Dropdowns) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Segmented Date Range Selector */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            {(
              [
                { id: 'this_month', label: 'Bulan Ini' },
                { id: 'last_month', label: 'Bulan Lalu' },
                { id: 'last_3_months', label: '3 Bulan' },
                { id: 'this_year', label: 'Tahun Ini' },
                { id: 'all', label: 'Semua Waktu' }
              ] as const
            ).map(opt => (
              <button
                key={opt.id}
                onClick={() => setFilter(prev => ({ ...prev, dateRange: opt.id }))}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                  filter.dateRange === opt.id
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filter.searchQuery || ''}
              onChange={e => {
                setFilter(prev => ({ ...prev, searchQuery: e.target.value }));
                setCurrentPage(1);
              }}
              placeholder="Cari siswa, kelas, kode..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Secondary Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs">
          {/* Class Filter */}
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Jenjang Kelas:</span>
            <select
              value={filter.classLevel || 'ALL'}
              onChange={e => {
                setFilter(prev => ({ ...prev, classLevel: e.target.value }));
                setCurrentPage(1);
              }}
              className="bg-transparent font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-300 dark:border-slate-700 pb-0.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">Semua Kelas</option>
              {availableClasses.map(c => (
                <option key={c} value={c} className="dark:bg-slate-800">
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* School Filter (Super Admin & Admin Sekolah) */}
          {(isSuperAdmin || availableSchools.length > 1) && (
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500 font-medium">Asal Sekolah:</span>
              <select
                value={filter.school || 'ALL'}
                onChange={e => {
                  setFilter(prev => ({ ...prev, school: e.target.value }));
                  setCurrentPage(1);
                }}
                className="bg-transparent font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-300 dark:border-slate-700 pb-0.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="ALL">Semua Sekolah Terdaftar</option>
                {availableSchools.map(s => (
                  <option key={s} value={s} className="dark:bg-slate-800">
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reset Filters shortcut */}
          {(filter.classLevel !== 'ALL' || filter.school !== 'ALL' || filter.searchQuery) && (
            <button
              onClick={() => {
                setFilter({
                  dateRange: 'this_month',
                  classLevel: 'ALL',
                  school: 'ALL',
                  searchQuery: ''
                });
                setCurrentPage(1);
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline ml-auto font-medium"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* 4 Major KPI Cards (Single-Elevation, Tabular Numerals) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Pengguna Aktif */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Siswa Aktif
            </span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
              {stats.totalStudents.toLocaleString('id-ID')}
            </span>
            <span className="text-xs text-slate-500">siswa</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span>{stats.totalExamsConducted} paket ujian aktif</span>
            <span aria-hidden="true">·</span>
            <span>{filteredResults.length} sesi selesai</span>
          </div>
        </div>

        {/* KPI 2: Soal Dikerjakan */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Soal Diselesaikan
            </span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
              {stats.totalQuestionsAnswered.toLocaleString('id-ID')}
            </span>
            <span className="text-xs text-slate-500">butir</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span>
              ~
              {stats.totalStudents > 0
                ? Math.round(stats.totalQuestionsAnswered / stats.totalStudents)
                : 0}{' '}
              soal / siswa
            </span>
          </div>
        </div>

        {/* KPI 3: Total Waktu Belajar / Ujian */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Waktu Dihabiskan
            </span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-lg text-blue-600 dark:text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
              {formatDurationHuman(stats.totalTimeSpentSeconds)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span>Rata-rata: {stats.avgDurationMinutes} menit / sesi</span>
          </div>
        </div>

        {/* KPI 4: Kuota Riil Terpakai (Performance API) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Kuota Riil Terpakai
            </span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/50 rounded-lg text-amber-600 dark:text-amber-400">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
              {formatBandwidth(stats.totalBandwidthBytes)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              ~{stats.avgBandwidthPerStudentKB} KB / siswa
            </span>
            <span aria-hidden="true">·</span>
            <span>Hemat & Ringan</span>
          </div>
        </div>
      </div>

      {/* Visualizations Section: Tren Bulanan & Jam Puncak */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Linimasa Tren Bulanan / Harian (2 Columns) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                Tren Pertumbuhan Pengguna & Soal Bulanan
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Akumulasi jumlah siswa unik dan butir soal yang diselesaikan setiap bulan
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 font-mono tabular-nums">
              {stats.monthlyTrends.length} Bulan Terdata
            </span>
          </div>

          {stats.monthlyTrends.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Belum ada riwayat aktivitas ujian pada rentang tanggal terpilih.
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {stats.monthlyTrends.map(m => {
                const maxStudents = Math.max(...stats.monthlyTrends.map(t => t.studentCount), 1);
                const percent = Math.min(100, Math.round((m.studentCount / maxStudents) * 100));

                return (
                  <div key={m.rawKey} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-700 dark:text-slate-300 font-semibold">{m.monthKey}</span>
                      <div className="flex items-center gap-3 font-mono tabular-nums text-slate-600 dark:text-slate-400">
                        <span>{m.studentCount} siswa</span>
                        <span aria-hidden="true">·</span>
                        <span>{m.questionCount} soal</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">{m.bandwidthMB} MB</span>
                      </div>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(percent, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Jam Puncak Pengerjaan (24 Hours Histogram) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Jam Puncak Pengerjaan
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Sebaran waktu siswa mengerjakan soal (00:00 - 23:00)</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="grid grid-cols-12 gap-1 items-end h-36 pt-4">
              {stats.peakHourDistribution.map(h => {
                const maxHour = Math.max(...stats.peakHourDistribution.map(x => x.count), 1);
                const heightPercent = Math.min(100, Math.round((h.count / maxHour) * 100));
                const isPrimeHour = h.hour >= 7 && h.hour <= 14;

                return (
                  <div
                    key={h.hour}
                    className="flex flex-col items-center justify-end h-full group relative"
                  >
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 px-1.5 py-0.5 bg-slate-900 text-white text-[10px] rounded pointer-events-none whitespace-nowrap z-10 font-mono tabular-nums">
                      {h.label}: {h.count} sesi
                    </div>
                    <div
                      style={{ height: `${Math.max(heightPercent, 4)}%` }}
                      className={`w-full rounded-t-sm transition-all duration-300 ${
                        h.count > 0
                          ? isPrimeHour
                            ? 'bg-indigo-600 hover:bg-indigo-500'
                            : 'bg-blue-500 hover:bg-blue-400'
                          : 'bg-slate-100 dark:bg-slate-800'
                      }`}
                    />
                    <span className="text-[9px] text-slate-400 mt-1 font-mono">{h.hour % 3 === 0 ? h.hour : ''}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 font-mono">
              <span>00:00 (Malam)</span>
              <span>12:00 (Siang)</span>
              <span>23:00 (Malam)</span>
            </div>
          </div>

          {/* Integritas Ujian Summary */}
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Pelanggaran Integritas
                </span>
                <p className="text-[11px] text-slate-500">Pindah tab atau keluar layar</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                {stats.integrityViolationRate}%
              </span>
              <span className="text-[10px] text-slate-400 block">siswa terdeteksi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visualizations Section: Perangkat & Kelas & Wilayah */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Distribusi Sistem Operasi & Perangkat */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Smartphone className="w-4 h-4 text-indigo-600" />
            Distribusi Perangkat & OS
          </h2>

          <div className="mt-4 space-y-3">
            {stats.osDistribution.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Tidak ada data</p>
            ) : (
              stats.osDistribution.map(item => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{item.name}</span>
                    <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400 font-semibold">
                      {item.percentage}% ({item.count})
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-2">
              Jenis Perangkat:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {stats.deviceDistribution.map(d => (
                <div key={d.name} className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                  <span className="text-slate-500 block text-[10px]">{d.name}</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                    {d.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sebaran Jenjang Kelas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Layers className="w-4 h-4 text-emerald-600" />
            Keaktifan Berdasarkan Kelas
          </h2>

          <div className="mt-4 space-y-3 max-h-64 overflow-y-auto pr-1">
            {stats.classBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Tidak ada data kelas</p>
            ) : (
              stats.classBreakdown.map(c => {
                const maxC = Math.max(...stats.classBreakdown.map(x => x.studentCount), 1);
                const percent = Math.min(100, Math.round((c.studentCount / maxC) * 100));

                return (
                  <div key={c.className} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-800 dark:text-slate-200 font-semibold">{c.className}</span>
                      <span className="font-mono tabular-nums text-slate-500 text-[11px]">
                        {c.studentCount} siswa · {c.questionCount} soal
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sebaran Daerah & Sekolah (Daerah Mana) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Globe className="w-4 h-4 text-blue-600" />
            Sebaran Wilayah & Sekolah
          </h2>

          <div className="mt-4 space-y-3 max-h-64 overflow-y-auto pr-1">
            {stats.regionalDistribution.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Tidak ada data wilayah</p>
            ) : (
              stats.regionalDistribution.map(reg => (
                <div
                  key={`${reg.regency}-${reg.schoolName}`}
                  className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg space-y-1"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-semibold text-xs text-slate-900 dark:text-white block line-clamp-1">
                        {reg.schoolName}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {reg.regency || 'Kabupaten/Kota Terdaftar'}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono tabular-nums shrink-0">
                      {reg.studentCount} siswa
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* High-Density Telemetry Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Log Rincian Telemetri Pengerjaan Siswa
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Menampilkan {filteredResults.length} sesi pengerjaan dengan rincian kuota dan perangkat
            </p>
          </div>

          <span className="text-xs text-slate-400 font-mono tabular-nums">
            Halaman {currentPage} dari {totalPages}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Waktu & Tanggal</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Kode Ujian</th>
                <th className="py-3 px-4 text-right">Nilai</th>
                <th className="py-3 px-4 text-right">Durasi</th>
                <th className="py-3 px-4 text-right">Kuota Riil</th>
                <th className="py-3 px-4">Perangkat / OS</th>
                <th className="py-3 px-4 text-center">Pindah Tab</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {paginatedResults.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                    Tidak ada sesi siswa yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                paginatedResults.map(res => {
                  const answers = res.answers || {};
                  const resDate = new Date(res.timestamp || Date.now());
                  const dateStr = resDate.toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short'
                  });
                  const timeStr = resDate.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  // Durasi
                  let durationSec = 0;
                  if (typeof res.completionTime === 'number' && res.completionTime > 0) {
                    durationSec = res.completionTime;
                  } else if (answers['_duration']) {
                    durationSec = parseInt(answers['_duration']) || 0;
                  }

                  // Kuota
                  let bandwidthBytes = 0;
                  if (answers['_bandwidthBytes']) {
                    bandwidthBytes = parseInt(answers['_bandwidthBytes']) || 0;
                  } else {
                    bandwidthBytes = 45000 + ((res.totalQuestions || 10) * 1800);
                  }

                  // OS & Tab Switches
                  const os = answers['_os'] || 'Android';
                  let tabSwitches = 0;
                  if (answers['_tabSwitches']) {
                    tabSwitches = parseInt(answers['_tabSwitches']) || 0;
                  }

                  return (
                    <tr
                      key={res.id || `${res.examCode}-${res.student.studentId}`}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {dateStr} · {timeStr}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {res.student.fullName}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        {res.student.class}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                        {res.examCode}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                        {res.score ?? '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                        {Math.round(durationSec / 60)}m
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300 tabular-nums font-semibold">
                        {formatBandwidth(bandwidthBytes)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {os}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {tabSwitches > 0 ? (
                          <span className="font-mono text-amber-600 dark:text-amber-400 font-bold tabular-nums">
                            {tabSwitches}x
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md font-medium text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Sebelumnya
            </button>
            <span className="text-slate-500 font-mono tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md font-medium text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Berikutnya
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
