import type { Exam, Result, Question } from "../../../types";
import { isAnswerMatch, parseList, compressImage } from "../examUtils";
import { storageService } from "../../../services/storage";

export type ArchiveData = {
  exam: Exam;
  results: Result[];
};

export type ArchiveMetadata = {
  school?: string;
  subject?: string;
  classLevel?: string;
  examType?: string;
  targetClasses?: string[];
  date?: string | number;
  participantCount?: number;
  authorId?: string;
    hasAiAnalysis?: boolean;
};

export const checkAnswerStatus = (
  q: Question,
  studentAnswers: Record<string, string>,
): string => {
  // 1. Check for manual grade override first
  const manualGradeKey = `_grade_${q.id}`;
  if (studentAnswers[manualGradeKey]) {
    return studentAnswers[manualGradeKey]; // 'CORRECT' or 'WRONG'
  }

  const ans = studentAnswers[q.id];
  if (!ans) return "EMPTY";

  if (
    q.questionType === "MULTIPLE_CHOICE" ||
    q.questionType === "FILL_IN_THE_BLANK"
  ) {
    return isAnswerMatch(
      String(ans),
      String(q.correctAnswer || ""),
      q.questionType,
    )
      ? "CORRECT"
      : "WRONG";
  } else if (q.questionType === "COMPLEX_MULTIPLE_CHOICE") {
    const sList = parseList(String(ans));
    const cList = parseList(String(q.correctAnswer || ""));
    if (
      sList.length === cList.length &&
      sList.every((s) => cList.some((c) => isAnswerMatch(s, c, q.questionType)))
    )
      return "CORRECT";
    return "WRONG";
  } else if (q.questionType === "TRUE_FALSE") {
    try {
      const ansObj = JSON.parse(ans);
      const allCorrect = q.trueFalseRows?.every((row, idx) => {
        if (ansObj[idx] === undefined) return false;
        return ansObj[idx] === row.answer;
      });
      return allCorrect ? "CORRECT" : "WRONG";
    } catch {
      return "WRONG";
    }
  } else if (q.questionType === "MATCHING") {
    try {
      const ansObj = JSON.parse(ans);
      const allCorrect = q.matchingPairs?.every((pair, idx) => {
        if (ansObj[idx] === undefined) return false;
        return isAnswerMatch(ansObj[idx], pair.right, q.questionType);
      });
      return allCorrect ? "CORRECT" : "WRONG";
    } catch {
      return "WRONG";
    }
  }

  return "WRONG";
};

export const getCalculatedStats = (r: Result, exam: Exam) => {
  let correct = 0;
  let empty = 0;
  let totalScore = 0;
  let maxPossibleScore = 0;
  const scorableQuestions = exam.questions.filter(
    (q) => q.questionType !== "INFO",
  );

  scorableQuestions.forEach((q) => {
    const weight = q.scoreWeight || 1;
    maxPossibleScore += weight;

    const status = checkAnswerStatus(q, r.answers);
    if (status === "CORRECT") {
      correct++;
      totalScore += weight;
    } else if (status === "EMPTY") {
      empty++;
    }
  });

  const total = scorableQuestions.length;
  const wrong = total - correct - empty;
  const score =
    maxPossibleScore > 0
      ? Math.round((totalScore / maxPossibleScore) * 100)
      : 0;
  const duration = r.completionTime || 0;

  return { correct, wrong, empty, score, duration };
};

export const formatDuration = (seconds: number | undefined | null): string => {
  if (seconds === undefined || seconds === null) return "-";
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}m ${s % 60}s`;
};

export const normalizeQuestion = (q: any): any => {
  if (!q) {
    return {
      id: String(Math.random()),
      questionText: "",
      questionType: "MULTIPLE_CHOICE",
    };
  }

  const questionText = q.questionText || q.question_text || "";

  const questionTypeRaw =
    q.questionType || q.question_type || "MULTIPLE_CHOICE";
  let questionType: any = String(questionTypeRaw).toUpperCase().trim();
  if (questionType === "MULTIPLE-CHOICE") questionType = "MULTIPLE_CHOICE";
  if (questionType === "COMPLEX-MULTIPLE-CHOICE")
    questionType = "COMPLEX_MULTIPLE_CHOICE";
  if (questionType === "TRUE-FALSE") questionType = "TRUE_FALSE";
  if (questionType === "FILL-IN-THE-BLANK") questionType = "FILL_IN_THE_BLANK";

  const correctAnswer = q.correctAnswer || q.correct_answer || "";
  const options = q.options || q.choices || [];
  const optionImages = q.optionImages || q.option_images || [];
  const optionCharts = q.optionCharts || q.option_charts || [];
  const imageUrl = q.imageUrl || q.image_url || "";
  const audioUrl = q.audioUrl || q.audio_url || "";

  const category = q.category || "";
  const level = q.level || "";
  const scoreWeight =
    typeof q.scoreWeight === "number"
      ? q.scoreWeight
      : typeof q.score_weight === "number"
        ? q.score_weight
        : 1;
  const kisiKisi = q.kisiKisi || q.kisi_kisi || "";

  let matchingPairs = q.matchingPairs || q.matching_pairs || [];
  matchingPairs = matchingPairs.map((pair: any) => ({
    left: pair.left || "",
    right: pair.right || "",
    leftChart: pair.leftChart || pair.left_chart,
    rightChart: pair.rightChart || pair.right_chart,
  }));

  let trueFalseRows = q.trueFalseRows || q.true_false_rows || [];
  trueFalseRows = trueFalseRows.map((row: any) => ({
    text: row.text || "",
    answer:
      row.answer === true ||
      row.answer === "true" ||
      row.answer === "Benar" ||
      row.answer === "BENAR",
    chartData: row.chartData || row.chart_data,
  }));

  return {
    id: String(q.id || Math.random()),
    questionText,
    questionType,
    options,
    correctAnswer,
    imageUrl,
    audioUrl,
    optionImages,
    chartData: q.chartData || q.chart_data,
    optionCharts,
    correctAnswerChart: q.correctAnswerChart || q.correct_answer_chart,
    category,
    level,
    scoreWeight,
    kisiKisi,
    matchingPairs,
    trueFalseRows,
  };
};

export const fixArchiveDataSorting = (
  data: ArchiveData,
  profile?: any,
): ArchiveData => {
  // ENRICHMENT: Normalize authorId and author_id to prevent legacy data issues
  const rawExam: any = data.exam;
  const normalizedAuthorId = rawExam.authorId || rawExam.author_id || "";
  if (normalizedAuthorId === "undefined" || normalizedAuthorId === "null") {
    rawExam.authorId = "";
  } else {
    rawExam.authorId = normalizedAuthorId;
  }

  // Normalize authorName and authorSchool
  let normalizedAuthorName = rawExam.authorName || rawExam.author_name || "";
  if (
    normalizedAuthorName === "Unknown" ||
    normalizedAuthorName === "undefined" ||
    normalizedAuthorName === "null" ||
    normalizedAuthorName === "Pengajar Utama"
  ) {
    normalizedAuthorName = "";
  }

  let normalizedAuthorSchool =
    rawExam.authorSchool || rawExam.author_school || "";
  if (
    normalizedAuthorSchool === "Unknown School" ||
    normalizedAuthorSchool === "undefined" ||
    normalizedAuthorSchool === "null" ||
    normalizedAuthorSchool === "-"
  ) {
    normalizedAuthorSchool = "";
  }

  // Auto-fix if the current user is the owner
  if (profile && rawExam.authorId === profile.id) {
    normalizedAuthorName = profile.fullName;
    normalizedAuthorSchool = profile.school;
  }

  rawExam.authorName = normalizedAuthorName;
  rawExam.authorSchool = normalizedAuthorSchool;

  // Standardize list of questions in the exam to standard casing and structures
  if (rawExam && Array.isArray(rawExam.questions)) {
    rawExam.questions = rawExam.questions.map((q: any) => normalizeQuestion(q));
  }

  const fixedResults = data.results.map((r) => {
    const newAnswers = { ...r.answers };
    let changed = false;

    Object.keys(newAnswers).forEach((qId) => {
      const q = data.exam.questions.find((item) => item.id === qId);
      if (q) {
        if (q.questionType === "COMPLEX_MULTIPLE_CHOICE") {
          try {
            const parsed = JSON.parse(newAnswers[qId]);
            if (Array.isArray(parsed)) {
              const originalStr = newAnswers[qId];
              parsed.sort(
                (a, b) =>
                  (q.options || []).indexOf(a) - (q.options || []).indexOf(b),
              );
              const newStr = JSON.stringify(parsed);
              if (originalStr !== newStr) {
                newAnswers[qId] = newStr;
                changed = true;
              }
            }
          } catch {
            /* ignore */
          }
        } else if (
          q.questionType === "TRUE_FALSE" ||
          q.questionType === "MATCHING"
        ) {
          try {
            const parsed = JSON.parse(newAnswers[qId]);
            if (typeof parsed === "object" && !Array.isArray(parsed)) {
              const originalStr = newAnswers[qId];
              const sortedObj: Record<number, string | boolean | number> = {};
              Object.keys(parsed)
                .map(Number)
                .sort((a, b) => a - b)
                .forEach(
                  (k) =>
                    (sortedObj[k] = (
                      parsed as Record<number, string | boolean | number>
                    )[k]),
                );
              const newStr = JSON.stringify(sortedObj);
              if (originalStr !== newStr) {
                newAnswers[qId] = newStr;
                changed = true;
              }
            }
          } catch {
            /* ignore */
          }
        }
      }
    });

    if (changed) {
      return { ...r, answers: newAnswers };
    }
    return r;
  });

  return { ...data, results: fixedResults };
};

export const optimizeExamImagesBeforeUpload = async (
  exam: Exam,
): Promise<Exam> => {
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

  // Deep clone to avoid mutating state directly
  const optimized = JSON.parse(JSON.stringify(exam)) as Exam;
  for (let i = 0; i < optimized.questions.length; i++) {
    const q = optimized.questions[i];
    q.questionText = await processHtmlString(q.questionText);
    if (q.options) {
      for (let j = 0; j < q.options.length; j++) {
        q.options[j] = await processHtmlString(q.options[j]);
      }
    }
  }
  return optimized;
};

export const filterEvaluationSection = (
  content: string,
  isTKA: boolean,
): string => {
  if (isTKA || !content) return content;

  // Regex to find start of "Evaluasi Nilai Rata-Rata Berdasarkan Standar Nasional"
  const startRegex =
    /(?:^|\n)(#{1,6}\s+.*Evaluasi Nilai Rata-Rata Berdasarkan Standar Nasional.*|\*\*(?:Evaluasi Nilai Rata-Rata Berdasarkan Standar Nasional|Evaluasi Nilai Rata-Rata)\*\*:?)/i;
  const match = content.match(startRegex);
  if (!match || match.index === undefined) return content;

  const startIndex = match.index;
  const rest = content.substring(startIndex + match[0].length);

  // Find where the next major section or heading starts
  const nextSectionRegex = /\n(?=#{1,6}\s+|\d+\.\s+[A-Z]|\*\*[A-Z])/;
  const nextMatch = rest.match(nextSectionRegex);

  if (nextMatch && nextMatch.index !== undefined) {
    const afterSection = rest.substring(nextMatch.index);
    return (
      content.substring(0, startIndex).trimEnd() +
      "\n\n" +
      afterSection.trimStart()
    );
  } else {
    return content.substring(0, startIndex).trimEnd();
  }
};

const INDONESIAN_MONTHS = [
  { full: "januari", short: "jan", num: "1", num2: "01", en: "january" },
  { full: "februari", short: "feb", num: "2", num2: "02", en: "february" },
  { full: "maret", short: "mar", num: "3", num2: "03", en: "march" },
  { full: "april", short: "apr", num: "4", num2: "04", en: "april" },
  { full: "mei", short: "mei", num: "5", num2: "05", en: "may" },
  { full: "juni", short: "jun", num: "6", num2: "06", en: "june" },
  { full: "juli", short: "jul", num: "7", num2: "07", en: "july" },
  { full: "agustus", short: "ags", num: "8", num2: "08", alt: "agu", en: "august" },
  { full: "september", short: "sep", num: "9", num2: "09", en: "september" },
  { full: "oktober", short: "okt", num: "10", num2: "10", en: "october" },
  { full: "november", short: "nov", num: "11", num2: "11", en: "november" },
  { full: "desember", short: "des", num: "12", num2: "12", en: "december" },
];

/**
 * Extracts the effective timestamp (in ms) of an archive for sorting and date matching.
 * Prioritizes metadata exam date, followed by created_at, and filename timestamp.
 */
export const getArchiveEffectiveTimestamp = (file: {
  name: string;
  created_at?: string;
  metadata?: ArchiveMetadata;
}): number => {
  if (file.metadata?.date) {
    const parsed = Date.parse(String(file.metadata.date));
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (file.created_at) {
    const parsed = Date.parse(String(file.created_at));
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (file.name) {
    const match = file.name.match(/[._](\d{10,13})/);
    if (match) {
      const num = parseInt(match[1], 10);
      const ts = num < 10000000000 ? num * 1000 : num;
      if (!isNaN(ts) && ts > 0) return ts;
    }
  }
  return 0;
};

/**
 * Sorts cloud archives strictly from newest date to oldest date.
 */
export const sortArchivesNewestFirst = <
  T extends { name: string; created_at?: string; metadata?: ArchiveMetadata }
>(
  archives: T[]
): T[] => {
  return [...archives].sort((a, b) => {
    const timeA = getArchiveEffectiveTimestamp(a);
    const timeB = getArchiveEffectiveTimestamp(b);
    return timeB - timeA;
  });
};

/**
 * Builds a search corpus for an archive entry including:
 * - Nama Sekolah
 * - Mapel & Kelas & Target Kelas
 * - Jenis Evaluasi
 * - Tanggal, Bulan (nama & angka), Tahun
 * - Kode Soal & Nama Berkas
 */
export const buildArchiveSearchCorpus = (file: {
  name: string;
  created_at?: string;
  metadata?: ArchiveMetadata;
}): string => {
  const tokens: string[] = [];

  // 1. Kode soal & nama file
  const examCode = file.name.includes("_meta_")
    ? file.name.split("_meta_")[0].trim()
    : file.name.split("_")[0].replace(/\.json$/i, "").trim();
  tokens.push(examCode);
  tokens.push(file.name);

  // 2. Nama Sekolah
  if (file.metadata?.school && file.metadata.school !== "-") {
    tokens.push(file.metadata.school);
  }

  // 3. Mapel & Kelas & Target Kelas
  if (file.metadata?.subject && file.metadata.subject !== "-") {
    tokens.push(file.metadata.subject);
  }
  if (file.metadata?.classLevel && file.metadata.classLevel !== "-") {
    tokens.push(file.metadata.classLevel);
    tokens.push(`kelas ${file.metadata.classLevel}`);
    tokens.push(`kls ${file.metadata.classLevel}`);
  }
  if (file.metadata?.targetClasses) {
    if (Array.isArray(file.metadata.targetClasses)) {
      tokens.push(...file.metadata.targetClasses.filter(Boolean));
    } else {
      tokens.push(String(file.metadata.targetClasses));
    }
  }

  // 4. Jenis Evaluasi
  if (file.metadata?.examType && file.metadata.examType !== "-") {
    tokens.push(file.metadata.examType);
    tokens.push(`evaluasi ${file.metadata.examType}`);
    tokens.push(`ujian ${file.metadata.examType}`);
  }

  // 5. Tanggal / Bulan / Tahun
  const dateSources = [file.metadata?.date, file.created_at].filter(Boolean);
  for (const rawDate of dateSources) {
    const d = new Date(String(rawDate));
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear().toString();
      const monthIdx = d.getMonth();
      const dateNum = d.getDate().toString();
      const datePad = dateNum.padStart(2, "0");
      const monthInfo = INDONESIAN_MONTHS[monthIdx];

      tokens.push(year);
      tokens.push(dateNum);
      tokens.push(datePad);

      if (monthInfo) {
        tokens.push(monthInfo.full);
        tokens.push(monthInfo.short);
        if (monthInfo.alt) tokens.push(monthInfo.alt);
        if (monthInfo.en) tokens.push(monthInfo.en);
        tokens.push(monthInfo.num);
        tokens.push(monthInfo.num2);

        // Formatted date representations
        tokens.push(`${dateNum} ${monthInfo.full} ${year}`);
        tokens.push(`${datePad} ${monthInfo.full} ${year}`);
        tokens.push(`${dateNum} ${monthInfo.short} ${year}`);
        tokens.push(`${datePad}/${monthInfo.num2}/${year}`);
        tokens.push(`${datePad}-${monthInfo.num2}-${year}`);
        tokens.push(`${year}-${monthInfo.num2}-${datePad}`);
        tokens.push(`${monthInfo.full} ${year}`);
        tokens.push(`${monthInfo.short} ${year}`);
      }
    } else if (typeof rawDate === "string") {
      tokens.push(rawDate);
    }
  }

  return tokens.join(" ").toLowerCase();
};

/**
 * Checks if an archive matches a search query across school, subject, class, evaluation type, date, or exam code.
 */
export const matchesArchiveSearch = (
  file: {
    name: string;
    created_at?: string;
    metadata?: ArchiveMetadata;
  },
  query: string
): boolean => {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return true;

  const corpus = buildArchiveSearchCorpus(file);
  const searchTerms = cleanQuery.split(/\s+/).filter(Boolean);

  // All typed terms must match somewhere in the corpus
  return searchTerms.every((term) => corpus.includes(term));
};
