import type { Question, QuestionType } from "../../../types";

export interface ParseResult {
  success: boolean;
  questions: Question[];
  error?: string;
  totalParsed: number;
}

/**
 * Extracts and cleans JSON string from raw text that may contain markdown code blocks or conversational filler.
 */
export const extractJsonFromRawText = (rawText: string): string => {
  if (!rawText || !rawText.trim()) return "";

  let cleaned = rawText.trim();

  // Look for markdown json code block ```json ... ```
  const jsonCodeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonCodeBlockMatch && jsonCodeBlockMatch[1]) {
    cleaned = jsonCodeBlockMatch[1].trim();
  } else {
    // If no explicit code block, look for array bounds [ ... ] or object bounds { ... }
    const firstBracket = cleaned.indexOf("[");
    const lastBracket = cleaned.lastIndexOf("]");

    if (firstBracket !== -1 && lastBracket > firstBracket) {
      cleaned = cleaned.substring(firstBracket, lastBracket + 1);
    } else {
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }
    }
  }

  // Remove trailing commas before closing brackets or braces (common AI JSON mistake)
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");

  return cleaned;
};

/**
 * Normalizes question types into internal QuestionType enum.
 */
const normalizeQuestionType = (typeStr?: string, item?: any): QuestionType => {
  if (!typeStr && item) {
    if (Array.isArray(item.trueFalseRows) || item.pernyataanKategori) return "TRUE_FALSE";
    if (Array.isArray(item.matchingPairs) || item.pasangan) return "MATCHING";
    if (item.options && item.options.length > 0) {
      if (item.correctAnswer && (item.correctAnswer.includes(",") || item.correctAnswer.length > 1)) {
        return "COMPLEX_MULTIPLE_CHOICE";
      }
      return "MULTIPLE_CHOICE";
    }
    if (item.correctAnswer) return "FILL_IN_THE_BLANK";
    return "ESSAY";
  }

  const upper = (typeStr || "").toUpperCase().trim();

  if (upper.includes("COMPLEX") || upper.includes("PGK") || upper.includes("MULTI")) {
    return "COMPLEX_MULTIPLE_CHOICE";
  }
  if (upper.includes("TRUE") || upper.includes("BENAR") || upper.includes("SALAH") || upper.includes("KATEGORI")) {
    return "TRUE_FALSE";
  }
  if (upper.includes("MATCH") || upper.includes("JODOH")) {
    return "MATCHING";
  }
  if (upper.includes("FILL") || upper.includes("ISIAN") || upper.includes("SINGKAT")) {
    return "FILL_IN_THE_BLANK";
  }
  if (upper.includes("ESSAY") || upper.includes("URAIAN") || upper.includes("ESAI")) {
    return "ESSAY";
  }
  if (upper.includes("INFO") || upper.includes("STIMULUS")) {
    return "INFO";
  }

  return "MULTIPLE_CHOICE";
};

/**
 * Parses raw AI text output into validated Question[] array.
 */
export const parseExternalAiOutput = (rawText: string): ParseResult => {
  try {
    const jsonStr = extractJsonFromRawText(rawText);

    if (!jsonStr) {
      return {
        success: false,
        questions: [],
        totalParsed: 0,
        error: "Tidak dapat menemukan data JSON pada teks yang di-paste. Pastikan hasil dari AI memuat struktur JSON.",
      };
    }

    let rawData: any;
    try {
      rawData = JSON.parse(jsonStr);
    } catch (e: any) {
      return {
        success: false,
        questions: [],
        totalParsed: 0,
        error: `Format JSON dari AI tidak valid: ${e?.message || "Syntax error"}. Mohon pastikan teks tidak terpotong.`,
      };
    }

    // Standardize to array
    let itemsArray: any[] = [];
    if (Array.isArray(rawData)) {
      itemsArray = rawData;
    } else if (typeof rawData === "object" && rawData !== null) {
      if (Array.isArray(rawData.questions)) itemsArray = rawData.questions;
      else if (Array.isArray(rawData.soal)) itemsArray = rawData.soal;
      else if (Array.isArray(rawData.data)) itemsArray = rawData.data;
      else itemsArray = [rawData];
    }

    if (itemsArray.length === 0) {
      return {
        success: false,
        questions: [],
        totalParsed: 0,
        error: "Data JSON ditemukan tetapi tidak berisi butir soal.",
      };
    }

    const parsedQuestions: Question[] = itemsArray.map((item, index) => {
      const qType = normalizeQuestionType(item.questionType || item.bentukSoal || item.tipe, item);
      const uniqueId = `q_ext_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`;

      // Clean up question text
      const qText = item.questionText || item.soal || item.pertanyaan || item.stimulus || `Soal Nomor ${index + 1}`;

      // Options
      let opts: string[] | undefined = undefined;
      if (Array.isArray(item.options)) {
        opts = item.options.map((o: any) => String(o || "").trim());
      } else if (Array.isArray(item.pilihan)) {
        opts = item.pilihan.map((o: any) => String(o || "").trim());
      }

      // Kategori / True-False rows
      let tfRows: { text: string; answer: boolean }[] | undefined = undefined;
      if (Array.isArray(item.trueFalseRows)) {
        tfRows = item.trueFalseRows.map((r: any) => ({
          text: String(r.text || r.pernyataan || "").trim(),
          answer: r.answer !== undefined ? Boolean(r.answer) : (r.kunci === "Benar" || r.kunci === true),
        }));
      } else if (Array.isArray(item.pernyataanKategori)) {
        tfRows = item.pernyataanKategori.map((r: any) => ({
          text: String(r.teks || r.text || r.pernyataan || "").trim(),
          answer: String(r.kunci || "").toLowerCase().includes("benar") || String(r.kunci || "").toLowerCase().includes("sesuai") || r.kunci === true,
        }));
      }

      // Matching pairs
      let mPairs: { left: string; right: string }[] | undefined = undefined;
      if (Array.isArray(item.matchingPairs)) {
        mPairs = item.matchingPairs.map((p: any) => ({
          left: String(p.left || p.kiri || "").trim(),
          right: String(p.right || p.kanan || "").trim(),
        }));
      } else if (Array.isArray(item.pasangan)) {
        mPairs = item.pasangan.map((p: any) => ({
          left: String(p.kiri || p.left || "").trim(),
          right: String(p.kanan || p.right || "").trim(),
        }));
      }

      // Correct answer string formatting
      let cAnswer = item.correctAnswer || item.kunciJawaban || item.kunci || "";
      if (typeof cAnswer === "object") cAnswer = JSON.stringify(cAnswer);

      // SVG / Visual handling
      let finalQuestionText = String(qText);
      const rawSvg = item.svgContent || item.svg || item.diagramSvg || "";
      if (rawSvg && typeof rawSvg === "string" && !finalQuestionText.includes("<svg")) {
        const cleanedSvg = rawSvg.trim();
        if (cleanedSvg.startsWith("<svg") || cleanedSvg.includes("</svg>")) {
          finalQuestionText = `${finalQuestionText}\n\n<div class="my-3 flex justify-center">${cleanedSvg}</div>`;
        }
      }

      // Comprehensive explanations & steps
      const fullExplanation =
        item.explanation ||
        item.pembahasan ||
        item.pembahasanSoal ||
        item.penjelasan ||
        "";

      const fullSteps =
        item.solutionSteps ||
        item.langkahPengerjaan ||
        item.langkah ||
        item.caraPengerjaan ||
        "";

      return {
        id: uniqueId,
        questionText: finalQuestionText,
        questionType: qType,
        options: opts,
        correctAnswer: String(cAnswer).trim(),
        trueFalseRows: tfRows,
        matchingPairs: mPairs,
        categoryLabels: item.categoryLabels || ["Benar", "Salah"],
        category: item.category || item.elemen || item.topik || "",
        level: item.level || item.levelKognitif || "",
        kisiKisi: item.kisiKisi || item.indikator || "",
        hint: item.hint || item.petunjuk || "",
        explanation: String(fullExplanation).trim(),
        solutionSteps: String(fullSteps).trim(),
        scoreWeight: item.scoreWeight || item.bobot || 1,
      };
    });

    return {
      success: true,
      questions: parsedQuestions,
      totalParsed: parsedQuestions.length,
    };
  } catch (err: any) {
    return {
      success: false,
      questions: [],
      totalParsed: 0,
      error: `Gagal memproses teks AI: ${err?.message || "Error tidak diketahui"}`,
    };
  }
};
