import { useEffect, useMemo, useCallback, useState } from "react";
import { storageService } from "../../services/storage";
import type { TeacherProfile, Exam } from "../../types";
import { normalizeQuestion, generateBookHtml } from "./bookHelpers";

export type FontSize = "small" | "normal" | "large";
export type LineSpacing = "tight" | "normal" | "relaxed";
export type PaperMargin = "thin" | "normal" | "thick";
export type KeepTogether = "always" | "never" | "auto";
export type PrintStatus = "idle" | "generating" | "success" | "error";

export interface BookGeneratorExamItem {
  exam: Exam;
  subject: string;
  examType: string;
  school: string;
  count: number;
  code: string;
}

interface UseBookGeneratorParams {
  profile: TeacherProfile;
}

export const useBookGenerator = ({ profile }: UseBookGeneratorParams) => {
  const [exams, setExams] = useState<BookGeneratorExamItem[]>([]);
  const [selectedExams, setSelectedExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [printStatus, setPrintStatus] = useState<PrintStatus>("idle");
  const [printErrorMsg, setPrintErrorMsg] = useState("");

  const [bookTitle, setBookTitle] = useState("Buku Kumpulan Soal Resmi");
  const [bookSubtitle, setBookSubtitle] = useState("Disusun oleh Super Admin");
  const [fontSize, setFontSize] = useState<FontSize>("normal");
  const [lineSpacing, setLineSpacing] = useState<LineSpacing>("normal");
  const [paperMargin, setPaperMargin] = useState<PaperMargin>("normal");
  const [keepTogether, setKeepTogether] = useState<KeepTogether>("auto");

  useEffect(() => {
    const fetchExams = async () => {
      setIsLoading(true);
      try {
        const examMap = await storageService.getExams(profile);
        const activeSQL: BookGeneratorExamItem[] = Object.values(examMap).map(
          (e) => ({
            exam: e,
            subject: e.config.subject,
            examType: e.config.examType || "",
            school: e.authorSchool || "",
            count: e.questions.length,
            code: e.code,
          }),
        );
        setExams(activeSQL);
      } catch (e) {
        console.error("Gagal memuat ujian:", e);
      }
      setIsLoading(false);
    };
    fetchExams();
  }, [profile]);

  const filteredExams = useMemo(() => {
    return exams.filter(
      (e) =>
        e.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.examType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.school.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.code.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [exams, searchTerm]);

  const handleSelect = useCallback(
    (item: BookGeneratorExamItem) => {
      if (selectedExams.find((e) => e.code === item.code)) return;

      const loadedExam = { ...item.exam } as Exam;
      if (loadedExam.questions) {
        loadedExam.questions = loadedExam.questions.map((q) =>
          normalizeQuestion(q),
        );
      }
      setSelectedExams((prev) => [...prev, loadedExam]);
    },
    [selectedExams],
  );

  const handleDeselect = useCallback((examCode: string) => {
    setSelectedExams((prev) => prev.filter((e) => e.code !== examCode));
  }, []);

  const handleDownload = useCallback(() => {
    setIsPrinting(true);
    setPrintStatus("generating");

    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        throw new Error(
          "Pop-up blocker mencegah pembukaan tab baru. Mohon izinkan pop-up untuk situs ini.",
        );
      }

      const styleTags = Array.from(
        document.querySelectorAll('style, link[rel="stylesheet"]'),
      )
        .map((el) => {
          if (el.tagName === "LINK") {
            const href = (el as HTMLLinkElement).href;
            return `<link rel="stylesheet" href="${href}">`;
          }
          let cssText = el.innerHTML || "";
          if (
            cssText.includes("visibility: hidden") ||
            cssText.includes("visibility:hidden")
          ) {
            cssText = cssText.replace(
              /body\s*\*\s*\{\s*visibility:\s*hidden\s*(!important)?\s*;?\s*\}/g,
              "/* stripped hiding rule */",
            );
          }
          return `<style>${cssText}</style>`;
        })
        .join("\n");

      const fullHtmlContent = generateBookHtml({
        selectedExams,
        bookTitle,
        bookSubtitle,
        fontSize,
        lineSpacing,
        paperMargin,
        keepTogether,
        styleTags,
      });

      printWindow.document.open();
      printWindow.document.write(fullHtmlContent);
      printWindow.document.close();

      setPrintStatus("success");
    } catch (e) {
      console.error("Gagal memproses dokumen cetak buku:", e);
      setPrintStatus("error");
      setPrintErrorMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setIsPrinting(false);
    }
  }, [
    selectedExams,
    bookTitle,
    bookSubtitle,
    fontSize,
    lineSpacing,
    paperMargin,
    keepTogether,
  ]);

  return {
    exams,
    selectedExams,
    isLoading,
    isPrinting,
    searchTerm,
    printStatus,
    printErrorMsg,
    bookTitle,
    bookSubtitle,
    fontSize,
    lineSpacing,
    paperMargin,
    keepTogether,
    setSearchTerm,
    setBookTitle,
    setBookSubtitle,
    setFontSize,
    setLineSpacing,
    setPaperMargin,
    setKeepTogether,
    filteredExams,
    handleSelect,
    handleDeselect,
    handleDownload,
  };
};
