import * as XLSX from "xlsx";
import type { Exam, Result } from "../../../types";
import {
  checkAnswerStatus,
  getCalculatedStats,
  formatDuration,
} from "./archiveUtils";
import { isAnswerMatch, parseList } from "../examUtils";

export const downloadArchiveExcel = (exam: Exam, results: Result[]) => {
  // 1. Detail Ujian Sheet
  const detailData = [
    ["DETIL EVALUASI / ARSIP UJIAN"],
    ["Subject / Mata Pelajaran", exam.config.subject],
    ["Kode Ujian", exam.code],
    [
      "Waktu Pengerjaan (Menit)",
      exam.config.examMode === "PR"
        ? "Tanpa Batas"
        : exam.config.timeLimit > 0
          ? `${exam.config.timeLimit} Menit`
          : "Tanpa Batas",
    ],
    ["Format Kelulusan (KKM)", exam.config.kkm ? String(exam.config.kkm) : "-"],
    ["Instansi / Sekolah", exam.authorSchool || "-"],
    [
      "Tanggal Pelaksanaan",
      exam.config.date
        ? new Date(exam.config.date).toLocaleString("id-ID")
        : "-",
    ],
    ["Total Pertanyaan", String(exam.questions.length)],
    ["Total Peserta Terdaftar", String(results.length)],
    ["Tanggal Diunduh", new Date().toLocaleString("id-ID")],
  ];

  // 2. Rekap Siswa Sheet
  const scorableQuestions = exam.questions.filter(
    (q) => q.questionType !== "INFO",
  );
  const dynamicHeaders = scorableQuestions.map((_, i) => `Soal ${i + 1}`);
  const rekapHeader = [
    "No",
    "Nama Siswa",
    "NISN/ID",
    "Kelas",
    "Instansi/Sekolah",
    "Nilai Akhir",
    "Benar",
    "Salah",
    "Kosong",
    "Status",
    "Waktu Mulai",
    "Waktu Selesai",
    "Durasi",
    ...dynamicHeaders,
  ];
  const rekapData: string[][] = [rekapHeader];

  results.forEach((r, idx) => {
    const stats = getCalculatedStats(r, exam);
    let startTimeStr = "-";
    let endTimeStr = "-";

    const scheduledStart = new Date(exam.config.date || Date.now());
    const scheduledEnd = new Date(
      scheduledStart.getTime() + (exam.config.timeLimit || 60) * 60000,
    );

    if (r.status === "force_closed") {
      startTimeStr = scheduledStart.toLocaleString("id-ID");
      endTimeStr = scheduledEnd.toLocaleString("id-ID");
    } else {
      if (r.timestamp) {
        let finalEndTime = r.timestamp;
        const maxEndTime = scheduledEnd.getTime() + 10 * 60000;
        if (finalEndTime > maxEndTime) finalEndTime = scheduledEnd.getTime();

        const endTime = new Date(finalEndTime);
        endTimeStr = endTime.toLocaleString("id-ID");

        if (r.completionTime) {
          let finalStartTime = finalEndTime - r.completionTime * 1000;
          const minStartTime = scheduledStart.getTime() - 30 * 60000;
          if (finalStartTime < minStartTime)
            finalStartTime = scheduledStart.getTime();

          const startTime = new Date(finalStartTime);
          startTimeStr = startTime.toLocaleString("id-ID");
        } else {
          startTimeStr = scheduledStart.toLocaleString("id-ID");
        }
      }
    }

    const row = [
      String(idx + 1),
      r.student.fullName,
      r.student.studentId,
      r.student.class,
      r.student.schoolName || "-",
      String(stats.score),
      String(stats.correct),
      String(stats.wrong),
      String(stats.empty),
      r.status || "-",
      startTimeStr,
      endTimeStr,
      r.completionTime
        ? `${Math.floor(r.completionTime / 60)}m ${r.completionTime % 60}s`
        : "-",
    ];

    // Add user answers
    scorableQuestions.forEach((q) => {
      const ans = r.answers[q.id];
      let ansStr = "-";
      if (ans) {
        ansStr = String(ans).replace(/<[^>]*>/g, "");
      }
      row.push(ansStr);
    });

    rekapData.push(row);
  });

  // 3. Analisis Soal Sheet
  const analisisSoalHeader = [
    "No",
    "Pertanyaan",
    "Tipe",
    "Tingkat Kesulitan (%)",
    "Jml Benar",
    "Jml Salah/Kosong",
    "Distribusi Jawaban",
  ];
  const analisisSoalData = [analisisSoalHeader];

  scorableQuestions.forEach((q, idx) => {
    let correctCount = 0;
    const answerCounts: Record<string, number> = {};

    results.forEach((r) => {
      const ans = r.answers[q.id];
      const status = checkAnswerStatus(q, r.answers);
      if (status === "CORRECT") correctCount++;
      if (ans) {
        const val = String(ans).replace(/<[^>]*>/g, "");
        answerCounts[val] = (answerCounts[val] || 0) + 1;
      }
    });

    const total = results.length;
    const correctRate =
      total > 0 ? Math.round((correctCount / total) * 100) : 0;

    let distStr = "";
    if (q.questionType === "MULTIPLE_CHOICE" && q.options) {
      distStr = q.options
        .map((opt) => {
          const cleanOpt = opt.replace(/<[^>]*>/g, "");
          const count = answerCounts[cleanOpt] || 0;
          return `${cleanOpt}: ${count}`;
        })
        .join(", ");
    } else {
      distStr = JSON.stringify(answerCounts);
    }

    analisisSoalData.push([
      String(idx + 1),
      q.questionText.replace(/<[^>]*>/g, ""),
      q.questionType,
      String(correctRate),
      String(correctCount),
      String(total - correctCount),
      distStr,
    ]);
  });

  // 4. Analisis Kelas Sheet
  const analisisKelasHeader = [
    "Kelas",
    "Jumlah Siswa",
    "Rata-rata Nilai",
    "Rata-rata Waktu",
    "Nilai Tertinggi",
    "Nilai Terendah",
    "Lulus (>=75)",
    "Tidak Lulus (<75)",
  ];
  const analisisKelasData = [analisisKelasHeader];

  const classes = Array.from(
    new Set(results.map((r) => r.student.class)),
  ).sort();
  classes.forEach((cls) => {
    const classResults = results.filter((r) => r.student.class === cls);
    const count = classResults.length;
    const scores = classResults.map((r) => getCalculatedStats(r, exam).score);
    const times = classResults
      .map((r) => getCalculatedStats(r, exam).duration)
      .filter((t) => t > 0);
    const avg =
      count > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / count) : 0;
    const avgTime =
      times.length > 0
        ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
        : 0;
    const max = count > 0 ? Math.max(...scores) : 0;
    const min = count > 0 ? Math.min(...scores) : 0;
    const pass = scores.filter((s) => s >= 75).length;
    const fail = count - pass;

    analisisKelasData.push([
      cls,
      String(count),
      String(avg),
      formatDuration(avgTime),
      String(max),
      String(min),
      String(pass),
      String(fail),
    ]);
  });

  // Create Workbook
  const wb = XLSX.utils.book_new();

  const wsDetail = XLSX.utils.aoa_to_sheet(detailData);
  XLSX.utils.book_append_sheet(wb, wsDetail, "Detail Ujian");

  const wsRekap = XLSX.utils.aoa_to_sheet(rekapData);
  XLSX.utils.book_append_sheet(wb, wsRekap, "Rekap Siswa");

  const wsAnalisisSoal = XLSX.utils.aoa_to_sheet(analisisSoalData);
  XLSX.utils.book_append_sheet(wb, wsAnalisisSoal, "Analisis Soal");

  const wsAnalisisKelas = XLSX.utils.aoa_to_sheet(analisisKelasData);
  XLSX.utils.book_append_sheet(wb, wsAnalisisKelas, "Analisis Kelas");

  // Download
  XLSX.writeFile(wb, `Data_Mentah_${exam.config.subject}_${exam.code}.xlsx`);
};
