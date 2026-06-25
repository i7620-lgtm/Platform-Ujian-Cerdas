import { useState } from "react";
import type { Exam, TeacherProfile } from "../../types";
import { storageService } from "../../services/storage";

export const useArchiveExam = (
  teacherProfile: TeacherProfile,
  deleteExam: (code: string) => Promise<void>,
  onRefreshExams: () => Promise<void>,
  setIsLoadingArchive: (loading: boolean) => void,
) => {
  const handleArchiveExam = async (exam: Exam) => {
    const isAuthor = !exam.authorId || exam.authorId === teacherProfile.id;
    const isCollaborator =
      exam.config.collaborators?.some(
        (c) => c.role === "editor" || c.role === "viewer",
      ) || false;
    const isAdmin =
      teacherProfile.accountType === "super_admin" ||
      teacherProfile.accountType === "admin_sekolah";

    if (!isAuthor && !isCollaborator && !isAdmin) {
      alert(
        "Akses Ditolak: Hanya guru pembuat soal asli atau kolaborator yang dapat melakukan finalisasi dan arsip ke penyimpanan cloud.",
      );
      return;
    }

    setIsLoadingArchive(true);
    try {
      // --- VALIDATION FOR ESSAY GRADING ---
      const essayQuestions = exam.questions.filter(
        (q) => q.questionType === "ESSAY",
      );
      if (essayQuestions.length > 0) {
        const currentResults = await storageService.getResults(
          exam.code,
          undefined,
        );

        let ungradedCount = 0;
        for (const r of currentResults) {
          for (const q of essayQuestions) {
            const answer = r.answers[q.id];
            if (answer && !r.answers[`_grade_${q.id}`]) {
              ungradedCount++;
            }
          }
        }

        if (ungradedCount > 0) {
          alert(
            `Gagal Arsip: Ditemukan ${ungradedCount} jawaban esai yang belum diperiksa.\n\nSilakan buka menu 'Lihat Hasil' dan berikan penilaian manual (Benar/Salah) untuk setiap jawaban esai siswa terlebih dahulu.`,
          );
          setIsLoadingArchive(false);
          return;
        }
      }

      const confirmMsg = `Konfirmasi Finalisasi & Arsip?\n\nSistem akan:\n1. Menghitung & menyimpan statistik ke Database Pusat (Untuk Analisis).\n2. Memindahkan data detail ke Cloud Storage (Cold Data).\n3. Menghapus data detail dari Database SQL (Optimasi).\n\nPastikan proses selesai 100%.`;
      if (!confirm(confirmMsg)) {
        setIsLoadingArchive(false);
        return;
      }

      const { backupUrl } = await storageService.performFullArchive(exam);

      await deleteExam(exam.code);
      onRefreshExams();

      if (backupUrl) {
        const link = document.createElement("a");
        link.href = backupUrl;
        link.download = `BACKUP_LOCAL_${exam.config.subject.replace(/[^a-zA-Z0-9]/g, "_")}_${exam.code}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(backupUrl);
        alert(
          "Arsip Cloud gagal, namun Statistik telah tersimpan dan Backup Lokal telah diunduh.",
        );
      } else {
        alert("Berhasil! Ujian telah diarsipkan dan statistik tersimpan.");
      }
    } catch (e: unknown) {
      console.error(e);
      alert(
        "Gagal memproses arsip: " +
          (e instanceof Error ? e.message : String(e)),
      );
    } finally {
      setIsLoadingArchive(false);
    }
  };

  return { handleArchiveExam };
};
