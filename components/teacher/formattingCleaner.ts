/**
 * formattingCleaner.ts
 * 
 * Modul pembersih dan penstandar format tipografi soal (Single Responsibility Principle).
 * Bertugas mengubah simbol-simbol markdown (*, **, _, __) menjadi tag HTML baku (<b>, <i>, <u>)
 * dengan tetap melindungi rumus matematika KaTeX/LaTeX dan elemen visual SVG/HTML secara aman.
 */

import { convertLlmFormattingToHtml } from "../../utils/llmTextFormatter";

/**
 * Mengonversi format markdown menjadi tag HTML baku (<b>, <i>, <u>)
 * dengan proteksi penuh terhadap sintaks matematika KaTeX ($...$, $$...$$) dan tag SVG/HTML.
 * - **...** -> <b>...</b>
 * - *...* -> <i>...</i>
 * - _..._ -> <u>...</u>
 * - Mempertahankan garis isian panjang (misalnya "_____")
 */
export function convertMarkdownToCompliantHtml(text: string | null | undefined): string {
  if (!text || typeof text !== "string") return "";
  return convertLlmFormattingToHtml(text);
}

/**
 * Membersihkan objek butir soal lengkap agar seluruh teks di dalamnya
 * mematuhi format HTML baku (<b>, <i>, <u>).
 */
export function sanitizeQuestionFormatting<T extends Record<string, any>>(question: T): T {
  if (!question || typeof question !== "object") return question;

  const sanitized = { ...question };

  // questionText
  if (typeof sanitized.questionText === "string") {
    sanitized.questionText = convertMarkdownToCompliantHtml(sanitized.questionText);
  }

  // options
  if (Array.isArray(sanitized.options)) {
    sanitized.options = sanitized.options.map((opt: any) =>
      typeof opt === "string" ? convertMarkdownToCompliantHtml(opt) : opt
    );
  }

  // explanation
  if (typeof sanitized.explanation === "string") {
    sanitized.explanation = convertMarkdownToCompliantHtml(sanitized.explanation);
  }

  // solutionSteps
  if (typeof sanitized.solutionSteps === "string") {
    sanitized.solutionSteps = convertMarkdownToCompliantHtml(sanitized.solutionSteps);
  }

  // hint
  if (typeof sanitized.hint === "string") {
    sanitized.hint = convertMarkdownToCompliantHtml(sanitized.hint);
  }

  // trueFalseRows
  if (Array.isArray(sanitized.trueFalseRows)) {
    sanitized.trueFalseRows = sanitized.trueFalseRows.map((row: any) => ({
      ...row,
      text: typeof row?.text === "string" ? convertMarkdownToCompliantHtml(row.text) : row?.text,
    }));
  }

  // matchingPairs
  if (Array.isArray(sanitized.matchingPairs)) {
    sanitized.matchingPairs = sanitized.matchingPairs.map((pair: any) => ({
      ...pair,
      left: typeof pair?.left === "string" ? convertMarkdownToCompliantHtml(pair.left) : pair?.left,
      right: typeof pair?.right === "string" ? convertMarkdownToCompliantHtml(pair.right) : pair?.right,
    }));
  }

  return sanitized;
}
