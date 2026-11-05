import type { Exam, Result } from "../../../types";
import { buildArchiveAnalysisPrompt, type AnalysisTargetOption } from "./archivePromptBuilder";

/**
 * Menghasilkan dan mengunduh berkas PDF dokumen prompt analisis AI
 * berformat rapi, multi-halaman, dan siap diunggah sebagai lampiran ke AI luar
 * (ChatGPT, Claude, Gemini, DeepSeek).
 */
export async function generateArchivePromptPdf(
  exam: Exam,
  results: Result[],
  targetsToInclude: AnalysisTargetOption[]
): Promise<string> {
  const { jsPDF } = await import("jspdf");

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const isBatch = targetsToInclude.length > 1;
  const targetLabel = isBatch
    ? "Semua Target (Umum & Seluruh Kelas)"
    : targetsToInclude[0]?.label || "Target Analisis";

  const renderRunningHeader = () => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);
    pdf.text(
      `DOKUMEN PROMPT ANALISIS HASIL BELAJAR • KODE UJIAN: ${exam.code} • ${targetLabel}`,
      margin,
      y
    );
    y += 3.5;
    pdf.setDrawColor(215, 215, 215);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 5.5;
  };

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin - 8) {
      pdf.addPage();
      y = margin;
      renderRunningHeader();
    }
  };

  // Header Banner Dokumen Halaman 1
  pdf.setFillColor(79, 70, 229); // Indigo-600
  pdf.roundedRect(margin, y, contentWidth, 26, 3, 3, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12.5);
  pdf.setTextColor(255, 255, 255);
  pdf.text("DOKUMEN INSTRUKSI & DATA PROMPT ANALISIS HASIL BELAJAR", margin + 5, y + 8);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(230, 230, 255);
  pdf.text(
    `Mata Pelajaran: ${exam.config.subject || "Umum"} (${exam.config.jenjang || "SD/MI"}) • Sekolah: ${exam.authorSchool || "-"}`,
    margin + 5,
    y + 14
  );
  pdf.text(
    `Target: ${targetLabel} (${targetsToInclude.reduce((sum, t) => sum + (t.studentCount || 0), 0)} Peserta) • Tanggal: ${exam.config.date || new Date().toLocaleDateString("id-ID")}`,
    margin + 5,
    y + 19
  );
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(7.5);
  pdf.text(
    "PETUNJUK: Lampirkan (upload) berkas PDF ini langsung ke Gemini / ChatGPT / Claude / DeepSeek.",
    margin + 5,
    y + 23.5
  );

  y += 32;

  // Build prompt text with complete stats and 4-tier rosters
  const promptText = buildArchiveAnalysisPrompt(exam, results, targetsToInclude);
  const lines = promptText.split("\n");

  pdf.setFont("courier", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(30, 30, 30);

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];

    // Divider baris
    if (rawLine.startsWith("===") || rawLine.startsWith("---")) {
      checkPageBreak(5);
      pdf.setDrawColor(210, 210, 210);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 4;
      continue;
    }

    // Judul Bagian Utama
    if (
      rawLine.startsWith("TARGET KEY:") ||
      rawLine.startsWith("INFORMASI UJIAN") ||
      rawLine.startsWith("DATA STATISTIK PER TARGET") ||
      rawLine.startsWith("STRUKTUR ISI LAPORAN") ||
      rawLine.startsWith("INSTRUKSI FORMATTING KETAT")
    ) {
      checkPageBreak(11);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9.5);
      pdf.setTextColor(67, 56, 202); // Indigo-700
      pdf.text(rawLine, margin, y);
      y += 5.5;
      pdf.setFont("courier", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(30, 30, 30);
      continue;
    }

    // Peringatan Roster & Instruksi Kritis
    if (
      rawLine.startsWith("PERINGATAN KETAT") ||
      rawLine.startsWith("PENTING:") ||
      rawLine.includes("DILARANG KERAS")
    ) {
      checkPageBreak(8);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.2);
      pdf.setTextColor(190, 24, 24); // Red
      pdf.text(rawLine, margin, y);
      y += 4.5;
      pdf.setFont("courier", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(30, 30, 30);
      continue;
    }

    const wrappedSublines = pdf.splitTextToSize(rawLine || " ", contentWidth);
    for (const subline of wrappedSublines) {
      checkPageBreak(4);
      pdf.text(subline, margin, y);
      y += 3.8;
    }
  }

  // Footer Nomor Halaman
  const totalPages = (pdf as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      `Halaman ${p} dari ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: "center" }
    );
  }

  const safeExamCode = (exam.code || "EXAM").replace(/[^a-zA-Z0-9_-]/g, "");
  const safeTargetName = targetLabel.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 35);
  const fileName = `Prompt_Analisis_AI_${safeExamCode}_${safeTargetName}.pdf`;

  pdf.save(fileName);
  return fileName;
}
