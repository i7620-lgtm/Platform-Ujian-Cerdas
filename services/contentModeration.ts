import type { Exam } from "../types";

/**
 * Custom error class for content moderation failures.
 */
export class ModerationError extends Error {
  public issues: string[];
  constructor(issues: string[]) {
    super(`Konten tidak pantas terdeteksi: ${issues.join(", ")}`);
    this.name = "ModerationError";
    this.issues = issues;
  }
}

/**
 * ContentModerator provides multi-layer content validation:
 * 1. Fast local keyword-based filtering.
 * 2. Context-aware AI-based moderation via server proxy.
 */
export class ContentModerator {
  // Local dictionary for fast blocking of common bad words (Indonesian/English)
  private static readonly BAD_WORDS_REGEX = new RegExp(
    "\\b(" +
    [
      // Indonesian profanity/slurs
      "anjing", "babi", "bangsat", "tolol", "goblok", "asu", "kontol", "memek", "jembut", "pelacur", "lonte",
      "perek", "bejad", "biadab", "pukimak", "ngewe", "entot", "ngocok", "coli", "itil", "ngentot", "crot", "sange",
      // Hate speech / SARA related (slurs)
      "cina", "kafir", "murtad", "sesat", "kadrun", "cebong", "kampret", "bencong", "banci", "idiot", "autis",
      // English common profanity
      "fuck", "shit", "bitch", "asshole", "pussy", "dick", "cock", "porn", "xxx", "sex",
    ].join("|") +
    ")\\b",
    "gi"
  );

  /**
   * Aggregates all text fields from an exam into a single object for validation.
   */
  private static aggregateTexts(exam: Exam): string {
    const texts: string[] = [];

    // Exam metadata
    if (exam.config.subject) texts.push(`Judul: ${exam.config.subject}`);
    if (exam.config.description) texts.push(`Deskripsi: ${exam.config.description}`);
    if (exam.config.examType) texts.push(`Jenis: ${exam.config.examType}`);
    if (exam.config.classLevel) texts.push(`Level: ${exam.config.classLevel}`);

    // Questions
    exam.questions.forEach((q, i) => {
      if (q.questionText) texts.push(`Soal ${i + 1}: ${q.questionText}`);
      if (q.options) q.options.forEach((opt, j) => texts.push(`Opsi ${j + 1}: ${opt}`));
      if (q.explanation) texts.push(`Pembahasan: ${q.explanation}`);
      if (q.solutionSteps) texts.push(`Langkah: ${q.solutionSteps}`);
      if (q.category) texts.push(`Materi: ${q.category}`);
      if (q.level) texts.push(`Level Soal: ${q.level}`);
      if (q.kisiKisi) texts.push(`Kisi-kisi: ${q.kisiKisi}`);
      if (q.trueFalseRows) q.trueFalseRows.forEach(row => texts.push(`Pernyataan: ${row.text}`));
      if (q.matchingPairs) q.matchingPairs.forEach(p => texts.push(`Pasangan: ${p.left} - ${p.right}`));
    });

    return texts.join("\n\n");
  }

  /**
   * Performs quick local validation.
   */
  public static validateLocally(content: string): string[] {
    const issues: string[] = [];
    const matches = content.match(this.BAD_WORDS_REGEX);
    if (matches && matches.length > 0) {
      const uniqueMatches = Array.from(new Set(matches.map(m => m.toLowerCase())));
      issues.push(`Kata-kata kasar/tidak pantas terdeteksi: ${uniqueMatches.join(", ")}`);
    }
    return issues;
  }

  /**
   * Performs deep AI validation for complex categories (SARA, Pornography, Bullying).
   * Calls the server-side API to keep Gemini API key secure.
   */
  private static async validateWithAI(content: string): Promise<string[]> {
    try {
      const response = await fetch("/api/moderate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const result = await response.json();
      return result.isSafe ? [] : result.issues;
    } catch (err) {
      console.error("Content Moderation API Error:", err);
      return []; // Fallback: allow save if API is down
    }
  }

  /**
   * Main entry point for exam content moderation.
   */
  public static async validateExamContent(exam: Exam): Promise<{ isValid: boolean; issues: string[] }> {
    const fullContent = this.aggregateTexts(exam);
    
    // 1. Local check (Fast)
    const localIssues = this.validateLocally(fullContent);
    if (localIssues.length > 0) {
      return { isValid: false, issues: localIssues };
    }

    // 2. AI check (Deep)
    const aiIssues = await this.validateWithAI(fullContent);
    if (aiIssues.length > 0) {
      return { isValid: false, issues: aiIssues };
    }

    return { isValid: true, issues: [] };
  }
}

/** 
 * Compatibility export for svgGeneratorService and others.
 * Validates whether a text prompt is safe for K-12 educational context.
 */
export function validateEducationalSafety(text: string): { isSafe: boolean; reason?: string } {
  const issues = ContentModerator.validateLocally(text);
  if (issues.length > 0) {
    return { isSafe: false, reason: issues[0] };
  }
  return { isSafe: true };
}


