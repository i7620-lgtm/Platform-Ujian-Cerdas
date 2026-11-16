import type { Question, QuestionType } from "../../../types";
import { sanitizeQuestionFormatting } from "../formattingCleaner";

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
 * Isolates embedded SVG/img visual elements into their own centered block paragraph
 * so they never split or squeeze text inline horizontally.
 */
export const isolateVisualElementsToCenterBlock = (text: string): string => {
  if (!text) return "";
  let result = text;

  // Isolate <svg ...>...</svg>
  result = result.replace(
    /(?:<p[^>]*>)?\s*(<svg[\s\S]*?<\/svg>)\s*(?:<\/p>)?/gi,
    (_match, svgContent) => {
      return `\n\n<p style="text-align: center; margin: 12px auto; display: block;">${svgContent}</p>\n\n`;
    }
  );

  // Clean up excessive consecutive newlines
  result = result.replace(/\n{3,}/g, "\n\n").trim();
  return result;
};

/**
 * Strips duplicate multiple-choice options (A. ... B. ...) that AI erroneously appended
 * to the end of the questionText when options are already present.
 */
export const stripDuplicateOptionsFromQuestionText = (
  qText: string,
  options?: string[]
): string => {
  if (!qText || !options || options.length < 2) return qText;
  const text = qText.trim();

  // Find where option list starts (e.g., "A." or "A)" or "[A]")
  const matchA = text.search(/(?:^|[\n\s])(?:A\.|A\)|\[A\]|\(A\))\s+/i);
  if (matchA !== -1) {
    const substringFromA = text.substring(matchA);
    // Confirm presence of "B." / "B)" as well
    const hasB = /(?:^|[\n\s])(?:B\.|B\)|\[B\]|\(B\))\s+/i.test(substringFromA);
    if (hasB) {
      const firstOptClean = options[0].replace(/^(?:[A-E]\.|\([A-E]\)|[A-E]\))\s*/i, "").trim().toLowerCase();
      const firstWord = firstOptClean.split(/\s+/)[0] || "";
      if (firstWord.length > 1 && substringFromA.toLowerCase().includes(firstWord)) {
        return text.substring(0, matchA).trim();
      } else if (firstOptClean.length <= 12) {
        return text.substring(0, matchA).trim();
      }
    }
  }

  return text;
};

/**
 * Strips numbered statement lists (1. ... 2. ...) that AI erroneously appended
 * to the end of true/false questionText when statements are already in trueFalseRows.
 */
export const stripDuplicateStatementsFromQuestionText = (
  qText: string,
  tfRows?: { text: string }[]
): string => {
  if (!qText || !tfRows || tfRows.length < 2) return qText;
  const text = qText.trim();

  // Find where numbered statements start (e.g., "1." or "1)" or "[1]")
  const match1 = text.search(/(?:^|[\n\s])(?:1\.|1\)|\[1\]|\(1\))\s+/);
  if (match1 !== -1) {
    const substringFrom1 = text.substring(match1);
    // Confirm presence of "2." as well
    const has2 = /(?:^|[\n\s])(?:2\.|2\)|\[2\]|\(2\))\s+/.test(substringFrom1);
    if (has2) {
      const firstRowClean = (tfRows[0].text || "").trim().toLowerCase();
      const firstWord = firstRowClean.split(/\s+/)[0] || "";
      if (firstWord.length > 1 && substringFrom1.toLowerCase().includes(firstWord)) {
        return text.substring(0, match1).trim();
      }
    }
  }

  return text;
};

/**
 * Detects dialog transcripts accidentally included in questionText (e.g. "Speaker A: ... Speaker B: ..."
 * or "Man: ... Woman: ..."), extracts them into listeningScript, and strips them from questionText
 * so students never see the listening script text.
 */
export const extractAndPurgeListeningScriptFromQuestionText = (
  qText: string,
  existingScript?: string
): { cleanedText: string; listeningScript?: string } => {
  if (!qText) return { cleanedText: qText, listeningScript: existingScript };

  let text = qText;
  let extracted = existingScript ? existingScript.trim() : "";

  // 1. Check for explicit wrapper tags like <div class="listening-script">...</div>
  const scriptTagMatch = text.match(/<(?:div|p|blockquote)[^>]*(?:listening|audio|dialog|percakapan)[^>]*>([\s\S]*?)<\/(?:div|p|blockquote)>/i);
  if (scriptTagMatch && scriptTagMatch[1]) {
    if (!extracted) {
      extracted = scriptTagMatch[1].replace(/<[^>]+>/g, "").trim();
    }
    text = text.replace(scriptTagMatch[0], "").trim();
  }

  // 2. Check for explicit headers like "Naskah Listening:" or "Conversation:" or "Dialog:"
  const headerMatch = text.match(/(?:Naskah\s*(?:Listening|Menyimak|Audio)|Listening\s*Script|Conversation|Dialog(?:ue)?)\s*:\s*\n?([\s\S]*?)(?=\n\s*(?:Pertanyaan|Question|Soal|Pilihlah|\d+\.|$))/i);
  if (headerMatch && headerMatch[1]) {
    if (!extracted) {
      extracted = headerMatch[1].trim();
    }
    text = text.replace(headerMatch[0], "").trim();
  }

  // 3. Check for speaker dialog patterns (e.g., lines starting with Speaker A:, Man:, Woman:, Pria:, Wanita:)
  const speakerRegex = /(?:^|\n)(?:(?:Speaker\s*[A-Z]|Man|Woman|Boy|Girl|Pria|Wanita|Guru|Siswa|A|B)\s*:\s*.+(?:\n(?:Speaker\s*[A-Z]|Man|Woman|Boy|Girl|Pria|Wanita|Guru|Siswa|A|B)\s*:\s*.+)+)/i;
  const speakerMatch = text.match(speakerRegex);
  if (speakerMatch && speakerMatch[0]) {
    if (!extracted) {
      extracted = speakerMatch[0].trim();
    }
    text = text.replace(speakerMatch[0], "").trim();
  }

  // Clean excessive empty newlines
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return {
    cleanedText: text,
    listeningScript: extracted || undefined,
  };
};

/**
 * Normalizes question types into internal QuestionType enum with smart auto-correction.
 * If user requested only single Pilihan Ganda but AI returned PG Kompleks with a single answer key,
 * this automatically converts it into MULTIPLE_CHOICE.
 */
const normalizeQuestionType = (
  typeStr?: string,
  item?: any,
  requestedTypes?: string[]
): QuestionType => {
  // Check if answer key is multiple or single
  const rawKey = String(item?.correctAnswer || item?.kunciJawaban || item?.kunci || "").trim();
  const isMultiKey = rawKey.includes(",") || (rawKey.length > 1 && !rawKey.startsWith("{") && !rawKey.includes(" "));

  const onlySingleChoiceRequested =
    requestedTypes &&
    requestedTypes.includes("Pilihan Ganda") &&
    !requestedTypes.includes("Pilihan Ganda Kompleks");

  if (!typeStr && item) {
    if (item.questionnaireFormat || item.scaleMin !== undefined || item.scaleLabels || item.isReflective) return "QUESTIONNAIRE";
    if (Array.isArray(item.trueFalseRows) || item.pernyataanKategori) return "TRUE_FALSE";
    if (Array.isArray(item.matchingPairs) || item.pasangan) return "MATCHING";
    if (item.options && item.options.length > 0) {
      if (isMultiKey && !onlySingleChoiceRequested) {
        return "COMPLEX_MULTIPLE_CHOICE";
      }
      return "MULTIPLE_CHOICE";
    }
    if (item.correctAnswer) return "FILL_IN_THE_BLANK";
    return "ESSAY";
  }

  const upper = (typeStr || "").toUpperCase().trim();

  // If questionnaire / angket / survei
  if (
    upper.includes("KUISIONER") ||
    upper.includes("ANGKET") ||
    upper.includes("SURVEI") ||
    upper.includes("SURVEY") ||
    upper.includes("QUESTIONNAIRE") ||
    upper.includes("LIKERT") ||
    upper.includes("REFLEKSI")
  ) {
    return "QUESTIONNAIRE";
  }

  // If AI labeled as COMPLEX or PGK:
  if (upper.includes("COMPLEX") || upper.includes("PGK") || upper.includes("MULTI")) {
    // Auto-correct: If only single key exists (e.g. "A") or if only single choice was requested by the teacher:
    if (!isMultiKey || onlySingleChoiceRequested) {
      return "MULTIPLE_CHOICE";
    }
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

  // If labeled MULTIPLE_CHOICE but has multi-key (and user asked for PGK)
  if (isMultiKey && requestedTypes?.includes("Pilihan Ganda Kompleks") && !onlySingleChoiceRequested) {
    return "COMPLEX_MULTIPLE_CHOICE";
  }

  return "MULTIPLE_CHOICE";
};

/**
 * Parses raw AI text output into validated Question[] array.
 */
export const parseExternalAiOutput = (
  rawText: string,
  requestedTypes?: string[]
): ParseResult => {
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
      const qType = normalizeQuestionType(
        item.questionType || item.bentukSoal || item.tipe,
        item,
        requestedTypes
      );
      const uniqueId = `q_ext_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`;

      // Clean up question text
      const qText = item.questionText || item.soal || item.pertanyaan || item.stimulus || `Soal Nomor ${index + 1}`;

      // Options (clean any leading A., B., etc.)
      let opts: string[] | undefined = undefined;
      if (Array.isArray(item.options)) {
        opts = item.options.map((o: any) =>
          String(o || "")
            .replace(/^(?:[A-E]\.|\([A-E]\)|[A-E]\))\s*/i, "")
            .trim()
        );
      } else if (Array.isArray(item.pilihan)) {
        opts = item.pilihan.map((o: any) =>
          String(o || "")
            .replace(/^(?:[A-E]\.|\([A-E]\)|[A-E]\))\s*/i, "")
            .trim()
        );
      }

      // Check inline weights in options if item.optionWeights is not directly provided
      let extractedOptionWeights: number[] | undefined = undefined;
      if (opts && opts.length > 0) {
        const tempWeights: number[] = [];
        let foundInlineWeight = false;

        const cleanedOpts = opts.map((opt) => {
          let clean = opt;
          const match = clean.match(/(?:\[(?:bobot|skor|weight):\s*(\d+(?:\.\d+)?)\]|\((?:bobot|skor|weight):\s*(\d+(?:\.\d+)?)\)|\[(\d+)\])$/i);
          if (match) {
            foundInlineWeight = true;
            tempWeights.push(parseFloat(match[1] || match[2] || match[3]));
            clean = clean.substring(0, match.index).trim();
          } else {
            const leadMatch = clean.match(/^\[(\d+)\]\s*/);
            if (leadMatch) {
              foundInlineWeight = true;
              tempWeights.push(parseFloat(leadMatch[1]));
              clean = clean.substring(leadMatch[0].length).trim();
            } else {
              tempWeights.push(0);
            }
          }
          return clean;
        });

        if (foundInlineWeight) {
          opts = cleanedOpts;
          extractedOptionWeights = tempWeights;
        }
      }

      // Kategori / True-False rows (clean any leading 1., 2., etc.)
      let tfRows: { text: string; answer: boolean; trueWeight?: number; falseWeight?: number }[] | undefined = undefined;
      if (Array.isArray(item.trueFalseRows)) {
        tfRows = item.trueFalseRows.map((r: any) => {
          let text = String(r.text || r.pernyataan || "")
            .replace(/^(?:\d+\.|\(\d+\)|\d+\))\s*/, "")
            .trim();
          let tw = r.trueWeight !== undefined ? Number(r.trueWeight) : (r.bobotBenar !== undefined ? Number(r.bobotBenar) : undefined);
          let fw = r.falseWeight !== undefined ? Number(r.falseWeight) : (r.bobotSalah !== undefined ? Number(r.bobotSalah) : undefined);

          const wMatch = text.match(/\[(?:bobot|skor|weight):\s*(\d+(?:\.\d+)?)\]|\((?:bobot|skor|weight):\s*(\d+(?:\.\d+)?)\)/i);
          if (wMatch && tw === undefined) {
            const w = parseFloat(wMatch[1] || wMatch[2]);
            tw = w;
            fw = 0;
            text = text.replace(wMatch[0], "").trim();
          }

          return {
            text,
            answer: r.answer !== undefined ? Boolean(r.answer) : (r.kunci === "Benar" || r.kunci === true),
            trueWeight: tw,
            falseWeight: fw,
          };
        });
      } else if (Array.isArray(item.pernyataanKategori)) {
        tfRows = item.pernyataanKategori.map((r: any) => {
          let text = String(r.teks || r.text || r.pernyataan || "")
            .replace(/^(?:\d+\.|\(\d+\)|\d+\))\s*/, "")
            .trim();
          let tw = r.trueWeight !== undefined ? Number(r.trueWeight) : (r.bobotBenar !== undefined ? Number(r.bobotBenar) : undefined);
          let fw = r.falseWeight !== undefined ? Number(r.falseWeight) : (r.bobotSalah !== undefined ? Number(r.bobotSalah) : undefined);

          const wMatch = text.match(/\[(?:bobot|skor|weight):\s*(\d+(?:\.\d+)?)\]|\((?:bobot|skor|weight):\s*(\d+(?:\.\d+)?)\)/i);
          if (wMatch && tw === undefined) {
            const w = parseFloat(wMatch[1] || wMatch[2]);
            tw = w;
            fw = 0;
            text = text.replace(wMatch[0], "").trim();
          }

          return {
            text,
            answer: String(r.kunci || "").toLowerCase().includes("benar") || String(r.kunci || "").toLowerCase().includes("sesuai") || r.kunci === true,
            trueWeight: tw,
            falseWeight: fw,
          };
        });
      }

      // Matching pairs
      let mPairs: { left: string; right: string; weight?: number }[] | undefined = undefined;
      if (Array.isArray(item.matchingPairs)) {
        mPairs = item.matchingPairs.map((p: any) => ({
          left: String(p.left || p.kiri || "").trim(),
          right: String(p.right || p.kanan || "").trim(),
          weight: p.weight !== undefined ? Number(p.weight) : (p.bobot !== undefined ? Number(p.bobot) : 1),
        }));
      } else if (Array.isArray(item.pasangan)) {
        mPairs = item.pasangan.map((p: any) => ({
          left: String(p.kiri || p.left || "").trim(),
          right: String(p.kanan || p.right || "").trim(),
          weight: p.weight !== undefined ? Number(p.weight) : (p.bobot !== undefined ? Number(p.bobot) : 1),
        }));
      }

      // Correct answer string formatting
      let cAnswer = item.correctAnswer || item.kunciJawaban || item.kunci || "";
      if (typeof cAnswer === "object") cAnswer = JSON.stringify(cAnswer);
      cAnswer = String(cAnswer).trim();

      // If MULTIPLE_CHOICE, ensure answer is normalized to single letter if in format "A. ..."
      if (qType === "MULTIPLE_CHOICE" && cAnswer.length > 1 && !cAnswer.includes(",")) {
        const letterMatch = cAnswer.match(/^([A-E])(?:\.|:|\s|$)/i);
        if (letterMatch && letterMatch[1]) {
          cAnswer = letterMatch[1].toUpperCase();
        }
      }

      // SVG / Visual handling
      let finalQuestionText = String(qText);
      const rawSvg = item.svgContent || item.svg || item.diagramSvg || "";
      if (rawSvg && typeof rawSvg === "string" && !finalQuestionText.includes("<svg")) {
        const cleanedSvg = rawSvg.trim();
        if (cleanedSvg.startsWith("<svg") || cleanedSvg.includes("</svg>")) {
          finalQuestionText = `${finalQuestionText}\n\n<p style="text-align: center; margin: 12px auto; display: block;">${cleanedSvg}</p>\n\n`;
        }
      }

      // Ensure all embedded SVG and image elements are isolated into centered block paragraphs
      finalQuestionText = isolateVisualElementsToCenterBlock(finalQuestionText);

      // Strip redundant options or statements mistakenly included in questionText
      finalQuestionText = stripDuplicateOptionsFromQuestionText(finalQuestionText, opts);
      finalQuestionText = stripDuplicateStatementsFromQuestionText(finalQuestionText, tfRows);

      // Questionnaire defaults
      const isQuestionnaire = qType === "QUESTIONNAIRE";
      const qFormat = item.questionnaireFormat || (isQuestionnaire ? "scale" : undefined);
      const sMin = item.scaleMin !== undefined ? Number(item.scaleMin) : (isQuestionnaire ? 1 : undefined);
      const sMax = item.scaleMax !== undefined ? Number(item.scaleMax) : (isQuestionnaire ? 5 : undefined);
      const sLabels = Array.isArray(item.scaleLabels) && item.scaleLabels.length >= 2
        ? [String(item.scaleLabels[0]), String(item.scaleLabels[1])] as [string, string]
        : (isQuestionnaire ? ["Sangat Tidak Setuju", "Sangat Setuju"] as [string, string] : undefined);

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

      const rawOptWeights = Array.isArray(item.optionWeights)
        ? item.optionWeights.map((w: any) => Number(w) || 0)
        : extractedOptionWeights;

      const tfHasExplicitWeights = Array.isArray(tfRows) && tfRows.some(r => r.trueWeight !== undefined || r.falseWeight !== undefined);
      const mPairsHasExplicitWeights = Array.isArray(mPairs) && mPairs.some(p => p.weight !== undefined);
      const optsHasExplicitWeights = Array.isArray(rawOptWeights) && rawOptWeights.length > 0;

      const hasCustomWeights =
        item.useCustomWeights !== undefined
          ? Boolean(item.useCustomWeights)
          : (optsHasExplicitWeights || tfHasExplicitWeights || mPairsHasExplicitWeights);

      // Pastikan baris Benar/Salah memiliki trueWeight & falseWeight jika status bobot aktif
      if (qType === "TRUE_FALSE" && hasCustomWeights && Array.isArray(tfRows)) {
        tfRows = tfRows.map(r => ({
          ...r,
          trueWeight: r.trueWeight !== undefined ? Number(r.trueWeight) : (r.answer ? 1 : 0),
          falseWeight: r.falseWeight !== undefined ? Number(r.falseWeight) : (r.answer ? 0 : 1),
        }));
      }

      // Pastikan pasangan Menjodohkan memiliki weight jika status bobot aktif
      if (qType === "MATCHING" && hasCustomWeights && Array.isArray(mPairs)) {
        mPairs = mPairs.map(p => ({
          ...p,
          weight: p.weight !== undefined ? Number(p.weight) : 1,
        }));
      }

      // Base question score weight should default to 1 so option weights drive the scoring
      const finalScoreWeight =
        item.scoreWeight !== undefined
          ? Number(item.scoreWeight)
          : (item.bobot !== undefined ? Number(item.bobot) : 1);

      // Media handling: Audio, Video, Listening Script, Image
      const rawListening =
        item.listeningScript ||
        item.listening_script ||
        item.naskahAudio ||
        item.naskah_audio ||
        item.audioScript ||
        item.transcript ||
        item.dialogueScript ||
        "";
      const finalListeningScript = typeof rawListening === "string" ? rawListening.trim() : "";

      let rawAudioUrl =
        item.audioUrl ||
        item.audio_url ||
        item.audioLink ||
        item.audio ||
        "";
      if (!rawAudioUrl && typeof finalQuestionText === "string") {
        const audioTagMatch = finalQuestionText.match(/<audio[^>]*src=["']([^"']+)["']/i);
        if (audioTagMatch && audioTagMatch[1]) {
          rawAudioUrl = audioTagMatch[1];
        }
      }
      const finalAudioUrl = typeof rawAudioUrl === "string" ? rawAudioUrl.trim() : "";
      if (typeof finalQuestionText === "string" && (finalAudioUrl || finalListeningScript)) {
        if (/<audio[\s\S]*?<\/audio>|<audio[^>]*>/gi.test(finalQuestionText)) {
          finalQuestionText = finalQuestionText.replace(/<audio[\s\S]*?<\/audio>|<audio[^>]*>/gi, "\n\n[AUDIO_STIMULUS]\n\n").trim();
        }
      }

      let rawVideoUrl =
        item.videoUrl ||
        item.video_url ||
        item.videoLink ||
        item.video ||
        "";
      if (!rawVideoUrl && typeof finalQuestionText === "string") {
        const videoTagMatch = finalQuestionText.match(/<(?:video|iframe)[^>]*src=["']([^"']+)["']/i);
        if (videoTagMatch && videoTagMatch[1]) {
          rawVideoUrl = videoTagMatch[1];
        }
      }
      const finalVideoUrl = typeof rawVideoUrl === "string" ? rawVideoUrl.trim() : "";
      if (finalVideoUrl && typeof finalQuestionText === "string") {
        finalQuestionText = finalQuestionText.replace(/<(?:video|iframe)[\s\S]*?<\/(?:video|iframe)>|<(?:video|iframe)[^>]*>/gi, "").trim();
      }
      // Extract dialog from questionText if AI accidentally placed it there, and purge it so students don't see it
      const listeningPurge = extractAndPurgeListeningScriptFromQuestionText(finalQuestionText, finalListeningScript);
      finalQuestionText = listeningPurge.cleanedText;
      const safeListeningScript = listeningPurge.listeningScript || finalListeningScript || undefined;

      const rawImgUrl = item.imageUrl || item.image_url || item.gambar || "";
      const finalImageUrl = typeof rawImgUrl === "string" ? rawImgUrl.trim() : "";

      return sanitizeQuestionFormatting({
        id: uniqueId,
        questionText: finalQuestionText,
        questionType: qType,
        options: opts,
        correctAnswer: isQuestionnaire ? (cAnswer || "") : cAnswer,
        trueFalseRows: tfRows,
        matchingPairs: mPairs,
        imageUrl: finalImageUrl || undefined,
        audioUrl: finalAudioUrl || undefined,
        listeningScript: safeListeningScript,
        videoUrl: finalVideoUrl || undefined,
        categoryLabels: item.categoryLabels || ["Benar", "Salah"],
        category: item.category || item.elemen || item.topik || "",
        level: item.level || item.levelKognitif || "",
        kisiKisi: item.kisiKisi || item.indikator || "",
        hint: item.hint || item.petunjuk || "",
        explanation: String(fullExplanation).trim(),
        solutionSteps: String(fullSteps).trim(),
        scoreWeight: finalScoreWeight,
        useCustomWeights: hasCustomWeights,
        optionWeights: rawOptWeights,
        questionnaireFormat: qFormat,
        scaleMin: sMin,
        scaleMax: sMax,
        scaleLabels: sLabels,
        isReflective: isQuestionnaire ? true : Boolean(item.isReflective),
        ratingIcon: item.ratingIcon || "star",
      });
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
