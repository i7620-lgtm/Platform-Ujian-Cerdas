import { useEffect, useRef, useCallback, useState } from "react";
import type { Question, QuizConfig } from "../../types";
import { parsePdfAndAutoCrop, convertPdfToImages, extractSmartCategory } from "./examUtils";
import { generateQuestions, PartialGenerationError } from "../../services/geminiService";

interface UseCreationViewParams {
  onQuestionsGenerated: (
    questions: Question[],
    mode: "manual" | "auto",
  ) => void;
}

export type InputMethod = "ai" | "upload";

export interface FailSafeModalState {
  isOpen: boolean;
  errorMessage: string;
  partialQuestions: Question[] | null;
  remainingCount: number;
}

export interface GenerationProgress {
  completed: number;
  total: number;
  stageMessage: string;
}

const DEFAULT_AI_CONFIG: QuizConfig = {
  count: 5,
  type: "Pilihan Ganda",
  types: ["Pilihan Ganda"],
  subject: "",
  difficulty: "",
  difficulties: [],
  blueprint: "",
  includeImages: true,
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
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress>({
    completed: 0,
    total: 5,
    stageMessage: "",
  });
  const [failSafeState, setFailSafeState] = useState<FailSafeModalState>({
    isOpen: false,
    errorMessage: "",
    partialQuestions: null,
    remainingCount: 0,
  });

  const resetCreationView = useCallback(() => {
    setInputMethod("upload");
    setUploadedFile(null);
    setPreviewImages([]);
    setIsLoading(false);
    setError("");
    setAiConfig(DEFAULT_AI_CONFIG);
    setGenerationProgress({
      completed: 0,
      total: 5,
      stageMessage: "",
    });
    setFailSafeState({
      isOpen: false,
      errorMessage: "",
      partialQuestions: null,
      remainingCount: 0,
    });
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
    const targetCount = Math.max(1, Math.min(10, aiConfig.count || 5));
    const extractedCat = extractSmartCategory(aiConfig.category, aiConfig.subject);
    const effectiveAiConfig = { ...aiConfig, count: targetCount, category: extractedCat };

    if (inputMethod === "ai") {
      setGenerationProgress({
        completed: 0,
        total: targetCount,
        stageMessage: "Menghubungi AI dan menyiapkan butir soal...",
      });
      setTimeout(() => {
        aiSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    }

    try {
      if (inputMethod === "ai") {
        if (!effectiveAiConfig.subject.trim()) {
          throw new Error("Silakan isi mata pelajaran/materi terlebih dahulu.");
        }
        if (!effectiveAiConfig.types || effectiveAiConfig.types.length === 0) {
          throw new Error("Silakan pilih minimal 1 (satu) jenis soal.");
        }
        if (!effectiveAiConfig.difficulties || effectiveAiConfig.difficulties.length === 0) {
          throw new Error("Silakan pilih minimal 1 (satu) tingkat kognitif.");
        }
        if (!effectiveAiConfig.count || effectiveAiConfig.count < 1) {
          throw new Error("Jumlah soal minimal adalah 1 butir.");
        }
        const generatedQuestions = await generateQuestions(
          effectiveAiConfig,
          (completed, total, message) => {
            setGenerationProgress({
              completed,
              total,
              stageMessage: message,
            });
          }
        );
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
      if (err instanceof PartialGenerationError) {
        setFailSafeState({
          isOpen: true,
          errorMessage: err.message,
          partialQuestions: err.partialQuestions,
          remainingCount: Math.max(0, targetCount - err.partialQuestions.length),
        });
        return;
      }

      const errorMessage =
        err instanceof Error ? err.message : "Gagal memproses permintaan.";

      let cleanError = errorMessage;
      if (errorMessage === "QUOTA_EXCEEDED_MINUTE") {
        cleanError =
          "Batas penggunaan per menit telah tercapai pada akun AI. Silakan tunggu 1 menit lalu coba lagi.";
      } else if (errorMessage === "QUOTA_EXCEEDED_DAY") {
        cleanError =
          "Batas penggunaan harian AI telah habis. Silakan coba kembali besok hari.";
      } else if (errorMessage === "QUOTA_EXCEEDED_TOKENS") {
        cleanError =
          "Teks atau konteks materi yang dimasukkan terlalu panjang. Silakan ringkas kisi-kisi Anda dan coba lagi.";
      } else if (
        errorMessage === "QUOTA_EXCEEDED_GENERAL" ||
        errorMessage === "QUOTA_EXCEEDED"
      ) {
        cleanError =
          "Batas kuota gratis pemakaian AI telah tercapai. Harap tunggu beberapa saat lalu coba kembali.";
      }

      if (inputMethod === "ai") {
        setFailSafeState({
          isOpen: true,
          errorMessage: cleanError,
          partialQuestions: null,
          remainingCount: targetCount,
        });
      } else {
        setError(cleanError);
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

  const handleAcceptPartialQuestions = useCallback(() => {
    if (failSafeState.partialQuestions && failSafeState.partialQuestions.length > 0) {
      onQuestionsGenerated(failSafeState.partialQuestions, "auto");
      setFailSafeState({ isOpen: false, errorMessage: "", partialQuestions: null, remainingCount: 0 });
    }
  }, [failSafeState.partialQuestions, onQuestionsGenerated]);

  const handleRetryGeneration = useCallback(async (onlyRemaining: boolean = false) => {
    setFailSafeState((prev) => ({ ...prev, isOpen: false }));

    if (onlyRemaining && failSafeState.remainingCount > 0 && failSafeState.partialQuestions) {
      setIsLoading(true);
      setError("");
      try {
        const remainingCount = Math.min(10, failSafeState.remainingCount);
        setGenerationProgress({
          completed: 0,
          total: remainingCount,
          stageMessage: `Menyiapkan pembuatan sisa ${remainingCount} butir soal...`,
        });
        const remainingQuestions = await generateQuestions(
          {
            ...aiConfig,
            count: remainingCount,
          },
          (completed, total, message) => {
            setGenerationProgress({
              completed,
              total,
              stageMessage: message,
            });
          }
        );
        const combined = [...failSafeState.partialQuestions, ...remainingQuestions];
        onQuestionsGenerated(combined, "auto");
      } catch (retryErr: any) {
        if (retryErr instanceof PartialGenerationError) {
          const combined = [...failSafeState.partialQuestions, ...retryErr.partialQuestions];
          setFailSafeState({
            isOpen: true,
            errorMessage: retryErr.message,
            partialQuestions: combined,
            remainingCount: Math.max(0, (aiConfig.count || 5) - combined.length),
          });
        } else {
          setFailSafeState({
            isOpen: true,
            errorMessage: retryErr?.message || "Percobaan ulang masih mengalami kendala.",
            partialQuestions: failSafeState.partialQuestions,
            remainingCount: failSafeState.remainingCount,
          });
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      // Retry dari awal
      handleStartAnalysis();
    }
  }, [failSafeState, aiConfig, onQuestionsGenerated, handleStartAnalysis]);

  const handleDismissFailSafe = useCallback(() => {
    setFailSafeState({ isOpen: false, errorMessage: "", partialQuestions: null, remainingCount: 0 });
  }, []);

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
    generationProgress,
    aiSectionRef,
    failSafeState,
    handleStartAnalysis,
    handleRetryGeneration,
    handleAcceptPartialQuestions,
    handleDismissFailSafe,
    handleManualCreateClick,
    handleAiClick,
    handleFileChange,
    resetCreationView,
  };
};
