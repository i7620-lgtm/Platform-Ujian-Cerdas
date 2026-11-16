import { useState } from "react";
import type { Exam, TeacherProfile } from "../../types";
import { storageService } from "../../services/storage";
import { showAlertModal, showConfirmModal, showToast } from "../../stores/feedbackStore";

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
      await showAlertModal({
        title: "Akses Ditolak",
        message: "Hanya guru pembuat soal asli atau kolaborator yang dapat melakukan finalisasi dan arsip ke penyimpanan cloud.",
        tone: "danger",
      });
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
          await showAlertModal({
            title: "Koreksi Esai Belum Selesai",
            message: `Ditemukan ${ungradedCount} jawaban esai yang belum diperiksa.\n\nSilakan buka menu 'Lihat Hasil' dan berikan penilaian manual (Benar/Salah) untuk setiap jawaban esai siswa terlebih dahulu.`,
            tone: "warning",
          });
          setIsLoadingArchive(false);
          return;
        }
      }

      const confirmed = await showConfirmModal({
        title: "Konfirmasi Finalisasi & Arsip?",
        message: `Sistem akan:\n1. Menghitung & menyimpan statistik ke Database Pusat (Untuk Analisis).\n2. Memindahkan data detail ke Cloud Storage (Cold Data).\n3. Menghapus data detail dari Database SQL (Optimasi).\n\nPastikan proses selesai 100%.`,
        tone: "warning",
        confirmLabel: "Finalisasi & Arsip",
      });
      if (!confirmed) {
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
        await showAlertModal({
          title: "Arsip Cloud Gagal (Backup Lokal Tersimpan)",
          message: "Arsip Cloud gagal, namun Statistik telah tersimpan dan Backup Lokal telah diunduh.",
          tone: "warning",
        });
      } else {
        showToast("Ujian berhasil diarsipkan dan statistik tersimpan.", "success");
      }
    } catch (e: unknown) {
      console.error(e);
      await showAlertModal({
        title: "Gagal Memproses Arsip",
        message: "Gagal memproses arsip: " + (e instanceof Error ? e.message : String(e)),
        tone: "danger",
      });
    } finally {
      setIsLoadingArchive(false);
    }
  };

  return { handleArchiveExam };
};
