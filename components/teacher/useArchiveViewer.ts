import { useState } from "react";
import { storageService } from "../../services/storage";
import { generateQuestionsPDF, compressImage } from "./examUtils";
import {
  fixArchiveDataSorting,
  getCalculatedStats,
} from "./archive/archiveUtils";
import type {
  ArchiveData,
  ArchiveMetadata,
  Exam,
  Result,
  TeacherProfile,
  ArchiveTab,
} from "../../types";

interface UseArchiveViewerParams {
  teacherProfile: TeacherProfile;
}

export const useArchiveViewer = ({
  teacherProfile,
}: UseArchiveViewerParams) => {
  const [cloudArchives, setCloudArchives] = useState<
    {
      name: string;
      created_at: string;
      size: number;
      metadata?: ArchiveMetadata;
    }[]
  >([]);
  const [archiveData, setArchiveData] = useState<ArchiveData | null>(null);
  const [sourceType, setSourceType] = useState<"LOCAL" | "CLOUD" | null>(null);
  const [currentCloudFilename, setCurrentCloudFilename] = useState<
    string | null
  >(null);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<ArchiveTab>("DETAIL");
  const [error, setError] = useState("");
  const [fixMessage, setFixMessage] = useState("");

  const [selectedSchool, setSelectedSchool] = useState<string>("ALL");
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showEditMetadata, setShowEditMetadata] = useState(false);

  const loadCloudList = async () => {
    try {
      const list = await storageService.getArchivedList();
      setCloudArchives(
        list as {
          name: string;
          created_at: string;
          size: number;
          metadata?: ArchiveMetadata;
        }[],
      );
    } catch {
      console.warn("Cloud archives list unavailable");
    }
  };

  const loadFromCloud = async (filename: string) => {
    setIsLoadingCloud(true);
    setLoadingMessage("Mengunduh dari Cloud...");
    setError("");
    try {
      const data = (await storageService.downloadArchive(
        filename,
      )) as unknown as ArchiveData | null;
      if (data && data.exam && data.exam.questions) {
        setArchiveData(fixArchiveDataSorting(data, teacherProfile));
        setActiveTab("DETAIL");
        setSourceType("CLOUD");
        setCurrentCloudFilename(filename);
        setSelectedClass("ALL");
      } else {
        setError("Data arsip cloud rusak.");
      }
    } catch {
      setError("Gagal mengunduh arsip dari cloud.");
    } finally {
      setIsLoadingCloud(false);
    }
  };

  const handleDeleteArchive = async (filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus arsip "${filename}" secara permanen dari Cloud Storage?`,
      )
    )
      return;

    setIsLoadingCloud(true);
    setLoadingMessage("Menghapus arsip...");

    try {
      await storageService.deleteArchive(filename);
      const list = await storageService.getArchivedList();
      setCloudArchives(
        list as {
          name: string;
          created_at: string;
          size: number;
          metadata?: ArchiveMetadata;
        }[],
      );

      if (
        archiveData &&
        sourceType === "CLOUD" &&
        archiveData.exam.code === filename.split("_")[0]
      ) {
        resetView();
      }
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus arsip.");
    } finally {
      setIsLoadingCloud(false);
    }
  };

  const handleUploadToCloud = async (dataToUpload?: ArchiveData) => {
    const currentData = dataToUpload || archiveData;
    if (!currentData) return;

    if (
      !confirm(
        "Arsip ini akan diunggah ke Cloud Storage. Sistem akan mengoptimalkan ukuran gambar secara otomatis (Resize + WebP) agar hemat kuota.\n\nLanjutkan?",
      )
    )
      return;

    setIsLoadingCloud(true);
    setLoadingMessage("Mengoptimalkan gambar...");

    try {
      const processHtmlString = async (html: string) => {
        if (!html || !html.includes("data:image")) return html;
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const images = doc.getElementsByTagName("img");

        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          const src = img.getAttribute("src");

          if (src && src.startsWith("data:image")) {
            try {
              const final = await compressImage(src, 0.7, 800);
              img.setAttribute("src", final);
            } catch (e) {
              console.warn("Image opt failed, using original", e);
            }
          }
        }
        return doc.body.innerHTML;
      };

      const optimizedExam = JSON.parse(
        JSON.stringify(currentData.exam),
      ) as Exam;
      for (let i = 0; i < optimizedExam.questions.length; i++) {
        const q = optimizedExam.questions[i];
        q.questionText = await processHtmlString(q.questionText);
        if (q.options) {
          for (let j = 0; j < q.options.length; j++) {
            q.options[j] = await processHtmlString(q.options[j]);
          }
        }
      }

      setLoadingMessage("Mengunggah ke Cloud...");
      const finalPayload = { ...currentData, exam: optimizedExam };
      const jsonString = JSON.stringify(finalPayload);
      const newFilename = await storageService.uploadArchive(
        optimizedExam.code,
        jsonString,
        {
          school: optimizedExam.authorSchool,
          subject: optimizedExam.config.subject,
          classLevel: optimizedExam.config.classLevel,
          examType: optimizedExam.config.examType,
          targetClasses: optimizedExam.config.targetClasses,
          date: optimizedExam.config.date,
          participantCount: currentData.results.length,
          authorId: optimizedExam.authorId,
        },
      );

      if (
        sourceType === "CLOUD" &&
        currentCloudFilename &&
        currentCloudFilename !== newFilename
      ) {
        try {
          await storageService.deleteArchive(currentCloudFilename);
        } catch (delErr) {
          console.warn("Failed to delete legacy archive on update", delErr);
        }
      }

      const list = await storageService.getArchivedList();
      setCloudArchives(
        list as {
          name: string;
          created_at: string;
          size: number;
          metadata?: ArchiveMetadata;
        }[],
      );

      setSourceType("CLOUD");
      setArchiveData(fixArchiveDataSorting(finalPayload, teacherProfile));
      setCurrentCloudFilename(newFilename);
      alert(
        "Berhasil! Arsip lokal telah dioptimalkan dan disimpan ke Cloud Storage.",
      );
    } catch (e) {
      console.error(e);
      alert("Gagal mengunggah ke Cloud.");
    } finally {
      setIsLoadingCloud(false);
    }
  };

  const handleReclaimArchive = async () => {
    if (!archiveData) return;
    if (
      !confirm(
        "Ambil alih arsip ini? Anda akan ditetapkan sebagai pemilik arsip ini dan statistik akan dicatat atas nama Anda.",
      )
    )
      return;

    setIsLoadingCloud(true);
    setLoadingMessage("Menyimpan ulang arsip...");

    try {
      const updatedExam: Exam = {
        ...archiveData.exam,
        authorId: teacherProfile.id,
        authorName: teacherProfile.fullName,
        authorSchool: teacherProfile.school || archiveData.exam.authorSchool,
      };

      const finalPayload = { ...archiveData, exam: updatedExam };
      const jsonString = JSON.stringify(finalPayload);

      const newFilename = await storageService.uploadArchive(
        updatedExam.code,
        jsonString,
        {
          school: updatedExam.authorSchool,
          subject: updatedExam.config.subject,
          classLevel: updatedExam.config.classLevel,
          examType: updatedExam.config.examType,
          targetClasses: updatedExam.config.targetClasses,
          date: updatedExam.config.date,
          participantCount: finalPayload.results.length,
          authorId: updatedExam.authorId,
        },
      );

      if (currentCloudFilename && currentCloudFilename !== newFilename) {
        try {
          await storageService.deleteArchive(currentCloudFilename);
        } catch (delErr) {
          console.warn(
            "Failed to delete legacy archive during reclaim",
            delErr,
          );
        }
      }

      try {
        await storageService.registerLegacyArchive(
          updatedExam,
          finalPayload.results,
        );
      } catch (err) {
        console.warn("Gagal mencatat statistik ulang:", err);
      }

      const list = await storageService.getArchivedList();
      setCloudArchives(
        list as {
          name: string;
          created_at: string;
          size: number;
          metadata?: ArchiveMetadata;
        }[],
      );

      setSourceType("CLOUD");
      setArchiveData(fixArchiveDataSorting(finalPayload, teacherProfile));
      setCurrentCloudFilename(newFilename);
      alert("Berhasil! Arsip telah diperbarui dan kini menjadi milik Anda.");
    } catch (e) {
      console.error(e);
      alert("Gagal mengambil alih arsip.");
    } finally {
      setIsLoadingCloud(false);
    }
  };

  const resetView = () => {
    setArchiveData(null);
    setError("");
    setFixMessage("");
    setSourceType(null);
    storageService
      .getArchivedList()
      .then(setCloudArchives)
      .catch(() => {});
  };

  const handlePrint = () => {
    const isDark = document.documentElement.classList.contains("dark");
    if (isDark) {
      document.documentElement.classList.remove("dark");
    }
    setTimeout(() => {
      window.print();
      if (isDark) {
        document.documentElement.classList.add("dark");
      }
    }, 100);
  };

  const handleDownloadQuestionsPDF = async () => {
    if (!archiveData) return;
    await generateQuestionsPDF(archiveData.exam);
  };

  const handleDownloadExcel = async () => {
    if (!archiveData) return;
    const { downloadArchiveExcel } = await import("./archive/archiveExcelExporter");
    downloadArchiveExcel(archiveData.exam, archiveData.results);
  };

  const handleUpdateKey = async (qId: string, newKey: string) => {
    if (!archiveData) return;

    const confirmMsg =
      "Apakah Anda yakin ingin mengganti kunci jawaban soal ini?\n\nSemua jawaban siswa akan diperiksa ulang dan nilai rapor rapor siswa akan di-recalculasi secara real-time.";
    if (!confirm(confirmMsg)) return;

    const updatedQuestions = archiveData.exam.questions.map((q) => {
      if (q.id === qId) {
        return { ...q, correctAnswer: newKey };
      }
      return q;
    });

    const updatedExam: Exam = {
      ...archiveData.exam,
      questions: updatedQuestions,
    };

    const updatedResults = archiveData.results.map((r) => {
      const stats = getCalculatedStats(r, updatedExam);
      return {
        ...r,
        score: stats.score,
        correctAnswers: stats.correct,
        totalQuestions:
          (stats.empty || 0) + (stats.wrong || 0) + (stats.correct || 0),
      };
    });

    const finalArchiveData: ArchiveData = {
      ...archiveData,
      exam: updatedExam,
      results: updatedResults,
    };

    setArchiveData(finalArchiveData);
    alert(
      "Kunci jawaban berhasil diubah. Nilai siswa otomatis terkalibrasi ulang.",
    );

    if (sourceType === "CLOUD" && currentCloudFilename) {
      setIsLoadingCloud(true);
      setLoadingMessage("Menyinkronkan perbaikan kunci ke Cloud...");
      try {
        const jsonString = JSON.stringify(finalArchiveData);
        await storageService.uploadArchive(updatedExam.code, jsonString, {
          school: updatedExam.authorSchool,
          subject: updatedExam.config.subject,
          classLevel: updatedExam.config.classLevel,
          examType: updatedExam.config.examType,
          targetClasses: updatedExam.config.targetClasses,
          date: updatedExam.config.date,
          participantCount: updatedResults.length,
          authorId: updatedExam.authorId,
        });
      } catch (err) {
        console.warn("Cloud sync error during key modification", err);
      } finally {
        setIsLoadingCloud(false);
      }
    }
  };

  const checkIsNoAuthor = () => {
    if (!archiveData) return false;
    const fileHasNoAuthor =
      !archiveData.exam.authorId ||
      String(archiveData.exam.authorId).trim() === "" ||
      String(archiveData.exam.authorId) === "undefined" ||
      String(archiveData.exam.authorId) === "null";
    if (fileHasNoAuthor) return true;

    if (sourceType === "CLOUD" && currentCloudFilename) {
      const match = cloudArchives.find((f) => f.name === currentCloudFilename);
      if (match && match.metadata) {
        const mdId = match.metadata.authorId;
        const metadataHasNoAuthor =
          !mdId ||
          String(mdId).trim() === "" ||
          String(mdId) === "undefined" ||
          String(mdId) === "null";
        if (metadataHasNoAuthor) return true;
      }
    }
    return false;
  };

  return {
    cloudArchives,
    archiveData,
    sourceType,
    currentCloudFilename,
    isLoadingCloud,
    loadingMessage,
    selectedClass,
    activeTab,
    error,
    fixMessage,
    selectedSchool,
    expandedStudent,
    userRole,
    showEditMetadata,
    setCloudArchives,
    setArchiveData,
    setSourceType,
    setCurrentCloudFilename,
    setIsLoadingCloud,
    setLoadingMessage,
    setSelectedClass,
    setActiveTab,
    setError,
    setFixMessage,
    setSelectedSchool,
    setExpandedStudent,
    setUserRole,
    setShowEditMetadata,
    loadCloudList,
    loadFromCloud,
    handleDeleteArchive,
    handleUploadToCloud,
    handleReclaimArchive,
    resetView,
    handlePrint,
    handleDownloadQuestionsPDF,
    handleDownloadExcel,
    handleUpdateKey,
    checkIsNoAuthor,
  };
};
