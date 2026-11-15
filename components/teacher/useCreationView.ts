import { useEffect, useRef, useCallback, useState } from "react";
import type { Question } from "../../types";
import { parsePdfAndAutoCrop, convertPdfToImages } from "./examUtils";

interface UseCreationViewParams {
  onQuestionsGenerated: (
    questions: Question[],
    mode: "manual" | "auto",
  ) => void;
}

export type InputMethod = "upload" | "external_ai";

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

  const resetCreationView = useCallback(() => {
    setInputMethod("upload");
    setUploadedFile(null);
    setPreviewImages([]);
    setIsLoading(false);
    setError("");
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

  // Handle Start Upload Analysis Trigger
  const handleStartAnalysis = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      if (inputMethod === "upload" && uploadedFile) {
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
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [
    inputMethod,
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
    aiSectionRef,
    handleStartAnalysis,
    handleManualCreateClick,
    handleFileChange,
    resetCreationView,
  };
};
