import { useEffect, useRef, useCallback, useState } from "react";
import type { Question, QuizConfig } from "../../types";
import { parsePdfAndAutoCrop, convertPdfToImages } from "./examUtils";
import { generateQuestions } from "../../services/geminiService";

interface UseCreationViewParams {
  onQuestionsGenerated: (
    questions: Question[],
    mode: "manual" | "auto",
  ) => void;
}

export type InputMethod = "ai" | "upload";

const DEFAULT_AI_CONFIG: QuizConfig = {
  count: 5,
  type: "Pilihan Ganda",
  subject: "",
  difficulty: "C3 - Mengaplikasikan",
  blueprint: "",
  includeImages: false,
};

export const useCreationView = ({
  onQuestionsGenerated,
}: UseCreationViewParams) => {
  const [inputMethod, setInputMethod] = useState<InputMethod>("upload");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiConfig, setAiConfig] = useState<QuizConfig>(DEFAULT_AI_CONFIG);

  const resetCreationView = useCallback(() => {
    setInputMethod("upload");
    setUploadedFile(null);
    setPreviewImages([]);
    setIsLoading(false);
    setError("");
    setAiConfig(DEFAULT_AI_CONFIG);
  }, []);

  const aiSectionRef = useRef<HTMLDivElement>(null);

  // Load PDF Preview conversion as effect
  useEffect(() => {
    const loadPreview = async () => {
      if (uploadedFile && uploadedFile.type === "application/pdf") {
        try {
          const images = await convertPdfToImages(uploadedFile, 1.5);
          setPreviewImages(images);
        } catch (e) {
          console.error("Gagal memuat pratinjau PDF:", e);
          setPreviewImages([]);
        }
      } else {
        setPreviewImages([]);
      }
    };
    loadPreview();
  }, [uploadedFile, setPreviewImages]);

  useEffect(() => {
    return () => resetCreationView();
  }, [resetCreationView]);

  // Handle Start Analysis/Generation Trigger
  const handleStartAnalysis = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      if (inputMethod === "ai") {
        if (!aiConfig.subject.trim()) {
          throw new Error("Silakan isi mata pelajaran/materi terlebih dahulu.");
        }
        const generatedQuestions = await generateQuestions(aiConfig);
        if (generatedQuestions.length === 0) {
          throw new Error("Gagal menghasilkan soal dari AI.");
        }
        onQuestionsGenerated(generatedQuestions, "auto");
      } else if (inputMethod === "upload" && uploadedFile) {
        if (uploadedFile.type !== "application/pdf") {
          throw new Error("Fitur ini hanya mendukung file PDF.");
        }
        const parsedQuestions = await parsePdfAndAutoCrop(uploadedFile);
        if (parsedQuestions.length === 0) {
          throw new Error(
            "Tidak dapat menemukan soal yang valid dari PDF. Pastikan format soal jelas.",
          );
        }
        onQuestionsGenerated(parsedQuestions, "manual");
      } else {
        throw new Error("Silakan pilih file untuk diunggah.");
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Gagal memproses permintaan.";
      if (errorMessage === "QUOTA_EXCEEDED_MINUTE") {
        setError(
          "⚠️ Peringatan Tipe 1: Batas 15 penggunaan (request) per menit telah tercapai pada akun gratis Gemini Flash (atau 10 API request/menit untuk model terpisah). Silakan tunggu 1 menit lalu coba lagi.",
        );
      } else if (errorMessage === "QUOTA_EXCEEDED_DAY") {
        setError(
          "⛔ Peringatan Tipe 2: Batas penggunaan harian gratis (1500 request/hari) dari Gemini Flash telah habis. Silakan coba kembali besok hari atau gunakan model dengan akun berbayar (Jika dikonfigurasi).",
        );
      } else if (errorMessage === "QUOTA_EXCEEDED_TOKENS") {
        setError(
          "⚠️ Peringatan Tipe 3: Teks/Konteks materi yang dimasukkan terlalu panjang dan melebihi batas (Maksimum 1 juta token/menit). Kurangi panjang kisi-kisi atau tunggu 1 menit sebelum mencoba lagi.",
        );
      } else if (
        errorMessage === "QUOTA_EXCEEDED_GENERAL" ||
        errorMessage === "QUOTA_EXCEEDED"
      ) {
        setError(
          "⛔ Peringatan: Batas kuota gratis pemakaian AI / Gemini API telah tercapai (15 req/menit atau 1500 req/hari). Silakan tunggu beberapa saat atau coba lagi besok hari.",
        );
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    inputMethod,
    aiConfig,
    uploadedFile,
    onQuestionsGenerated,
    setIsLoading,
    setError,
  ]);

  const handleManualCreateClick = useCallback(() => {
    setUploadedFile(null);
    setError("");
    onQuestionsGenerated([], "manual");
  }, [onQuestionsGenerated, setUploadedFile, setError]);

  const handleAiClick = useCallback(() => {
    setInputMethod("ai");
    setTimeout(() => {
      aiSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }, [setInputMethod]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        if (file.size > 10 * 1024 * 1024) {
          // 10MB Check
          setError(
            "Ukuran file terlalu besar (Max 10MB). Harap kompres PDF Anda.",
          );
          e.target.value = "";
          setUploadedFile(null);
          return;
        }
        setError("");
        setUploadedFile(file);
      }
    },
    [setUploadedFile, setError],
  );

  return {
    inputMethod,
    setInputMethod,
    uploadedFile,
    previewImages,
    isLoading,
    error,
    setError,
    aiConfig,
    setAiConfig,
    aiSectionRef,
    handleStartAnalysis,
    handleManualCreateClick,
    handleAiClick,
    handleFileChange,
    resetCreationView,
  };
};
