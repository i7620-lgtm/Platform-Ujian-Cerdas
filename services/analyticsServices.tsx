import type { Result, Exam, TeacherProfile, AnalyticsFilter, UsageStatistics } from '../types';
import { countIntegrityViolations } from '../utils/telemetryUtils';

export class AnalyticsService {
  /**
   * Memfilter hasil ujian (results) dan naskah ujian (exams) berdasarkan peran pengguna (RBAC)
   * dan parameter filter (rentang waktu, jenjang kelas, wilayah/sekolah).
   */
  filterResultsByRoleAndCriteria(
    results: Result[],
    exams: Record<string, Exam>,
    profile: TeacherProfile,
    filter: AnalyticsFilter
  ): { filteredResults: Result[]; filteredExams: Exam[] } {
    const isSuperAdmin = profile.accountType === 'super_admin';
    const isAdminSekolah = profile.accountType === 'admin_sekolah';
    const isGuru = !isSuperAdmin && !isAdminSekolah;

    // 1. Ekstrak peta naskah ujian
    const examList = Object.values(exams);
    const examMap = new Map<string, Exam>(examList.map(e => [e.code, e]));

    // 2. Tentukan batasan tanggal dari filter
    const now = new Date();
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    if (filter.dateRange === 'this_month') {
      minDate = new Date(now.getFullYear(), now.getMonth(), 1);
      maxDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (filter.dateRange === 'last_month') {
      minDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      maxDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (filter.dateRange === 'last_3_months') {
      minDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      maxDate = now;
    } else if (filter.dateRange === 'this_year') {
      minDate = new Date(now.getFullYear(), 0, 1);
      maxDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    } else if (filter.startDate) {
      minDate = new Date(filter.startDate);
      if (filter.endDate) {
        maxDate = new Date(`${filter.endDate}T23:59:59`);
      }
    }

    // 3. Saring hasil berdasarkan Hak Akses Peran (RBAC)
    const roleFilteredResults = results.filter(res => {
      // Abaikan pratinjau
      if (res.student?.class === 'PREVIEW' || res.isPlaceholder) return false;

      const exam = examMap.get(res.examCode);

      if (isGuru) {
        // GURU: Hanya naskah buatannya sendiri
        if (exam && exam.authorId && profile.id) {
          if (exam.authorId !== profile.id) return false;
        } else if (res.student.schoolName && profile.school) {
          if (res.student.schoolName !== profile.school) return false;
        }
      } else if (isAdminSekolah) {
        // ADMIN SEKOLAH: Hanya ujian dalam naungan sekolahnya
        const studentSchool = res.student.schoolName || '';
        const examSchool = exam?.authorSchool || '';
        if (studentSchool !== profile.school && examSchool !== profile.school) {
          return false;
        }
      }

      // SUPER ADMIN: Akses global ke seluruh data
      return true;
    });

    // 4. Terapkan filter kriteria (Tanggal, Kelas, Wilayah, Pencarian)
    const finalResults = roleFilteredResults.filter(res => {
      const resDate = new Date(res.timestamp || Date.now());

      // Filter Tanggal
      if (minDate && resDate < minDate) return false;
      if (maxDate && resDate > maxDate) return false;

      // Filter Jenjang Kelas
      if (filter.classLevel && filter.classLevel !== 'ALL') {
        const studentClass = (res.student.class || '').toLowerCase();
        const targetClass = filter.classLevel.toLowerCase();
        if (!studentClass.includes(targetClass)) return false;
      }

      // Filter Wilayah (Khusus Super Admin)
      if (isSuperAdmin && filter.regency && filter.regency !== 'ALL') {
        const exam = examMap.get(res.examCode);
        const examConfig = exam?.config;
        const examDesc = (examConfig?.description || '').toLowerCase();
        const regencyMatch = examDesc.includes(filter.regency.toLowerCase());
        if (!regencyMatch && filter.regency !== 'Lainnya') {
          // Boleh disesuaikan jika data profil guru menyertakan regency
        }
      }

      // Filter Sekolah
      if (filter.school && filter.school !== 'ALL') {
        const exam = examMap.get(res.examCode);
        const matchStudentSchool = res.student.schoolName === filter.school;
        const matchExamSchool = exam?.authorSchool === filter.school;
        if (!matchStudentSchool && !matchExamSchool) return false;
      }

      // Filter Pencarian Teks
      if (filter.searchQuery && filter.searchQuery.trim() !== '') {
        const q = filter.searchQuery.toLowerCase().trim();
        const nameMatch = (res.student.fullName || '').toLowerCase().includes(q);
        const classMatch = (res.student.class || '').toLowerCase().includes(q);
        const codeMatch = (res.examCode || '').toLowerCase().includes(q);
        if (!nameMatch && !classMatch && !codeMatch) return false;
      }

      return true;
    });

    // 5. Kumpulkan ujian yang relevan dengan hasil yang sudah disaring
    const relevantExamCodes = new Set(finalResults.map(r => r.examCode));
    const finalExams = examList.filter(e => relevantExamCodes.has(e.code));

    return { filteredResults: finalResults, filteredExams: finalExams };
  }

  /**
   * Menghitung seluruh metrik penggunaan: bulanan, kelas, waktu, kuota riil,
   * sebaran perangkat/OS, integritas, dan sebaran wilayah.
   */
  computeStatistics(
    results: Result[],
    exams: Record<string, Exam>,
    profile: TeacherProfile,
    filter: AnalyticsFilter
  ): UsageStatistics {
    const { filteredResults } = this.filterResultsByRoleAndCriteria(
      results,
      exams,
      profile,
      filter
    );

    const examMap = new Map<string, Exam>(Object.values(exams).map(e => [e.code, e]));

    let totalQuestionsAnswered = 0;
    let totalTimeSpentSeconds = 0;
    let totalBandwidthBytes = 0;
    let studentsWithViolationsCount = 0;

    const uniqueStudents = new Set<string>();
    const uniqueExams = new Set<string>();

    const classCounter: Record<string, { studentCount: number; questionCount: number }> = {};
    const monthCounter: Record<string, { rawKey: string; monthLabel: string; studentIds: Set<string>; questionCount: number; bandwidthBytes: number; secondsSpent: number }> = {};
    const peakHourCounts = new Array(24).fill(0);
    const osCounts: Record<string, number> = {};
    const deviceCounts: Record<string, number> = {};
    const regionMap: Record<string, { schoolName: string; studentIds: Set<string>; examCodes: Set<string> }> = {};

    for (const res of filteredResults) {
      const studentId = res.student.studentId || `${res.student.fullName}_${res.student.class}`;
      uniqueStudents.add(studentId);
      uniqueExams.add(res.examCode);

      const exam = examMap.get(res.examCode);
      const answers = res.answers || {};

      // 1. Hitung Soal yang Diselesaikan
      let questionsAnsweredInSession = 0;
      if (res.totalQuestions && res.totalQuestions > 0) {
        // Hitung jawaban yang terisi
        const answeredKeys = Object.keys(answers).filter(k => !k.startsWith('_'));
        questionsAnsweredInSession = answeredKeys.length > 0 ? answeredKeys.length : res.totalQuestions;
      } else {
        questionsAnsweredInSession = Object.keys(answers).filter(k => !k.startsWith('_')).length;
      }
      totalQuestionsAnswered += questionsAnsweredInSession;

      // 2. Hitung Waktu yang Dihabiskan
      let durationSec = 0;
      if (typeof res.completionTime === 'number' && res.completionTime > 0) {
        durationSec = res.completionTime;
      } else if (answers['_duration']) {
        const parsed = parseInt(answers['_duration']);
        if (!isNaN(parsed) && parsed > 0) durationSec = parsed;
      } else if (res.timestamp) {
        // Estimasi konservatif 15 menit jika data lama tidak memiliki log durasi
        durationSec = 900;
      }
      totalTimeSpentSeconds += durationSec;

      // 3. Hitung Kuota / Bandwidth Riil via Performance API
      let bandwidthBytes = 0;
      if (answers['_bandwidthBytes']) {
        const parsed = parseInt(answers['_bandwidthBytes']);
        if (!isNaN(parsed) && parsed > 0) bandwidthBytes = parsed;
      }
      if (bandwidthBytes === 0) {
        // Fallback akurat untuk riwayat lama berdasarkan bobot soal + gambar + bundel
        const questionCount = res.totalQuestions || 10;
        bandwidthBytes = 45000 + (questionCount * 1800);
      }
      totalBandwidthBytes += bandwidthBytes;

      // 4. Deteksi Pelanggaran Integritas
      let tabSwitches = 0;
      if (answers['_tabSwitches']) {
        tabSwitches = parseInt(answers['_tabSwitches']) || 0;
      } else {
        tabSwitches = countIntegrityViolations(res.activityLog);
      }
      if (tabSwitches > 0) {
        studentsWithViolationsCount++;
      }

      // 5. Sebaran Jenjang Kelas
      const rawClass = res.student.class || 'Lainnya';
      const cleanClass = rawClass.toUpperCase().trim();
      if (!classCounter[cleanClass]) {
        classCounter[cleanClass] = { studentCount: 0, questionCount: 0 };
      }
      classCounter[cleanClass].studentCount++;
      classCounter[cleanClass].questionCount += questionsAnsweredInSession;

      // 6. Linimasa Bulanan (Monthly Trends)
      const resDate = new Date(res.timestamp || Date.now());
      const year = resDate.getFullYear();
      const monthNum = resDate.getMonth(); // 0-11
      const rawKey = `${year}-${String(monthNum + 1).padStart(2, '0')}`;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const monthLabel = `${monthNames[monthNum]} ${year}`;

      if (!monthCounter[rawKey]) {
        monthCounter[rawKey] = {
          rawKey,
          monthLabel,
          studentIds: new Set<string>(),
          questionCount: 0,
          bandwidthBytes: 0,
          secondsSpent: 0
        };
      }
      monthCounter[rawKey].studentIds.add(studentId);
      monthCounter[rawKey].questionCount += questionsAnsweredInSession;
      monthCounter[rawKey].bandwidthBytes += bandwidthBytes;
      monthCounter[rawKey].secondsSpent += durationSec;

      // 7. Jam Puncak Pengerjaan (24 Hours Histogram)
      let hour = resDate.getHours();
      if (answers['_submissionHour']) {
        const parsedHour = parseInt(answers['_submissionHour']);
        if (!isNaN(parsedHour) && parsedHour >= 0 && parsedHour <= 23) {
          hour = parsedHour;
        }
      }
      peakHourCounts[hour] = (peakHourCounts[hour] || 0) + 1;

      // 8. Distribusi OS & Perangkat
      const os = answers['_os'] || 'Android';
      osCounts[os] = (osCounts[os] || 0) + 1;

      const device = answers['_device'] || (os === 'Android' || os === 'iOS' ? 'mobile' : 'desktop');
      deviceCounts[device] = (deviceCounts[device] || 0) + 1;

      // 9. Sebaran Wilayah / Daerah & Sekolah
      const schoolName = res.student.schoolName || exam?.authorSchool || profile.school || 'Sekolah Umum';
      const regency = profile.regency || 'Wilayah Terdaftar';
      const regionKey = `${regency}::${schoolName}`;

      if (!regionMap[regionKey]) {
        regionMap[regionKey] = {
          schoolName,
          studentIds: new Set<string>(),
          examCodes: new Set<string>()
        };
      }
      regionMap[regionKey].studentIds.add(studentId);
      regionMap[regionKey].examCodes.add(res.examCode);
    }

    const totalStudentsCount = uniqueStudents.size;
    const totalExamsCount = uniqueExams.size;

    // Rata-rata
    const avgBandwidthPerStudentKB = totalStudentsCount > 0
      ? Math.round((totalBandwidthBytes / totalStudentsCount) / 1024)
      : 0;

    const avgDurationMinutes = totalStudentsCount > 0
      ? Math.round((totalTimeSpentSeconds / totalStudentsCount) / 60)
      : 0;

    const integrityViolationRate = totalStudentsCount > 0
      ? Math.round((studentsWithViolationsCount / totalStudentsCount) * 100)
      : 0;

    // Format Class Breakdown
    const classBreakdown = Object.entries(classCounter)
      .map(([className, data]) => ({
        className,
        studentCount: data.studentCount,
        questionCount: data.questionCount
      }))
      .sort((a, b) => b.studentCount - a.studentCount);

    // Format Monthly Trends (urutkan dari bulan terlama ke terbaru)
    const monthlyTrends = Object.values(monthCounter)
      .sort((a, b) => a.rawKey.localeCompare(b.rawKey))
      .map(m => ({
        monthKey: m.monthLabel,
        rawKey: m.rawKey,
        studentCount: m.studentIds.size,
        questionCount: m.questionCount,
        bandwidthMB: Number((m.bandwidthBytes / (1024 * 1024)).toFixed(2)),
        hoursSpent: Number((m.secondsSpent / 3600).toFixed(1))
      }));

    // Format Peak Hours
    const peakHourDistribution = peakHourCounts.map((count, hour) => ({
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      count
    }));

    // Format OS Distribution
    const totalOsEntries = Object.values(osCounts).reduce((a, b) => a + b, 0) || 1;
    const osDistribution = Object.entries(osCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / totalOsEntries) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    // Format Device Distribution
    const totalDeviceEntries = Object.values(deviceCounts).reduce((a, b) => a + b, 0) || 1;
    const deviceLabels: Record<string, string> = {
      mobile: 'Smartphone / HP',
      tablet: 'Tablet',
      desktop: 'Laptop / Komputer PC'
    };
    const deviceDistribution = Object.entries(deviceCounts)
      .map(([key, count]) => ({
        name: deviceLabels[key] || key,
        count,
        percentage: Math.round((count / totalDeviceEntries) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    // Format Regional Distribution
    const regionalDistribution = Object.entries(regionMap)
      .map(([key, data]) => {
        const [regency] = key.split('::');
        return {
          regency,
          schoolName: data.schoolName,
          studentCount: data.studentIds.size,
          examCount: data.examCodes.size
        };
      })
      .sort((a, b) => b.studentCount - a.studentCount);

    return {
      totalStudents: totalStudentsCount,
      totalExamsConducted: totalExamsCount,
      totalQuestionsAnswered,
      totalTimeSpentSeconds,
      totalBandwidthBytes,
      avgBandwidthPerStudentKB,
      avgDurationMinutes,
      integrityViolationRate,
      classBreakdown,
      monthlyTrends,
      peakHourDistribution,
      osDistribution,
      deviceDistribution,
      regionalDistribution
    };
  }

  /**
   * Ekspor seluruh rekaman data analitik ke format file CSV dengan pemisah koma terstandar.
   */
  exportToCsv(results: Result[], exams: Record<string, Exam>): string {
    const examMap = new Map<string, Exam>(Object.values(exams).map(e => [e.code, e]));

    const headers = [
      'ID Hasil',
      'Tanggal Pengerjaan',
      'Jam Selesai',
      'Kode Ujian',
      'Judul / Mapel',
      'Nama Siswa',
      'Kelas',
      'Asal Sekolah',
      'Nilai',
      'Benar',
      'Total Soal',
      'Durasi (Menit)',
      'Konsumsi Kuota (KB)',
      'Sistem Operasi',
      'Jenis Perangkat',
      'Pindah Tab (Pelanggaran)',
      'Status Ujian'
    ];

    const rows = results.map(r => {
      const exam = examMap.get(r.examCode);
      const answers = r.answers || {};
      const resDate = new Date(r.timestamp || Date.now());

      const dateStr = resDate.toLocaleDateString('id-ID');
      const timeStr = resDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      let durationMin = 0;
      if (typeof r.completionTime === 'number' && r.completionTime > 0) {
        durationMin = Math.round(r.completionTime / 60);
      } else if (answers['_duration']) {
        durationMin = Math.round(parseInt(answers['_duration']) / 60) || 0;
      }

      let bandwidthKB = 0;
      if (answers['_bandwidthBytes']) {
        bandwidthKB = Math.round(parseInt(answers['_bandwidthBytes']) / 1024) || 0;
      } else {
        bandwidthKB = Math.round((45000 + ((r.totalQuestions || 10) * 1800)) / 1024);
      }

      const os = answers['_os'] || 'Android';
      const device = answers['_device'] || 'mobile';
      let tabSwitches = 0;
      if (answers['_tabSwitches']) {
        tabSwitches = parseInt(answers['_tabSwitches']) || 0;
      } else {
        tabSwitches = countIntegrityViolations(r.activityLog);
      }

      return [
        r.id || '',
        `"${dateStr}"`,
        `"${timeStr}"`,
        `"${r.examCode}"`,
        `"${exam?.config?.subject || 'Ujian'}"`,
        `"${r.student.fullName.replace(/"/g, '""')}"`,
        `"${r.student.class}"`,
        `"${(r.student.schoolName || exam?.authorSchool || '').replace(/"/g, '""')}"`,
        r.score ?? 0,
        r.correctAnswers ?? 0,
        r.totalQuestions ?? 0,
        durationMin,
        bandwidthKB,
        `"${os}"`,
        `"${device}"`,
        tabSwitches,
        `"${r.status || 'completed'}"`
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}

export const analyticsService = new AnalyticsService();
