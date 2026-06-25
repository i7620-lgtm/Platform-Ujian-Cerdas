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
