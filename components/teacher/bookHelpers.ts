import { Exam, Question, ChartData } from "../../types";

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

export const isLongQuestion = (q: any): boolean => {
  if (!q) return false;
  let score = 0;
  const text = q.questionText || q.question_text || "";
  if (text.length > 250) score += 3;
  if (q.imageUrl || q.image_url) score += 3;
  if (q.options) {
    score += q.options.length * 0.5;
    if (q.optionImages && q.optionImages.some((img: any) => !!img)) {
      score += q.options.length * 2.0;
    }
  }
  if (q.questionType === "TRUE_FALSE" || q.questionType === "TRUE-FALSE") {
    const rows = q.trueFalseRows || q.true_false_rows || [];
    score += rows.length * 2.5;
  }
  if (q.questionType === "MATCHING") {
    const pairs = q.matchingPairs || q.matching_pairs || [];
    score += pairs.length * 2.5;
  }
  return score > 7;
};

export const getFormattedAnswerText = (q: any): string => {
  const questionType = String(q.questionType || q.question_type || "")
    .toUpperCase()
    .trim();
  const rawOptions = q.options || q.choices || [];
  const rawAns = (q.correctAnswer || q.correct_answer || "").trim();

  if (questionType === "MULTIPLE_CHOICE") {
    const idxFromRaw = parseInt(rawAns, 10);
    if (
      !isNaN(idxFromRaw) &&
      rawOptions &&
      idxFromRaw >= 0 &&
      idxFromRaw < rawOptions.length
    ) {
      return String.fromCharCode(65 + idxFromRaw);
    }
    if (rawOptions && rawOptions.length > 0) {
      const idx = rawOptions.findIndex(
        (opt: string) => opt && opt.trim() === rawAns,
      );
      if (idx !== -1) {
        return String.fromCharCode(65 + idx);
      }
    }
    const clean = rawAns.toUpperCase();
    if (clean.length === 1 && clean >= "A" && clean <= "Z") {
      return clean;
    }
    return rawAns.replace(/<[^>]*>/g, "").trim() || "-";
  }

  if (
    questionType === "COMPLEX_MULTIPLE_CHOICE" ||
    questionType === "COMPLEX-MULTIPLE-CHOICE"
  ) {
    let answers: string[] = [];

    if (rawAns.startsWith("[") && rawAns.endsWith("]")) {
      try {
        const parsed = JSON.parse(rawAns);
        if (Array.isArray(parsed)) {
          answers = parsed.map((s) => String(s).trim());
        } else {
          answers = [rawAns];
        }
      } catch (e) {
        answers = [rawAns];
      }
    } else {
      answers = rawAns ? rawAns.split(/,\s*/) : [];
    }

    const letters: string[] = [];
    answers.forEach((ans) => {
      const trimmedAns = ans.trim();
      const idxFromAns = parseInt(trimmedAns, 10);
      if (
        !isNaN(idxFromAns) &&
        rawOptions &&
        idxFromAns >= 0 &&
        idxFromAns < rawOptions.length
      ) {
        letters.push(String.fromCharCode(65 + idxFromAns));
        return;
      }
      if (rawOptions && rawOptions.length > 0) {
        const idx = rawOptions.findIndex(
          (opt: string) => opt && opt.trim() === trimmedAns,
        );
        if (idx !== -1) {
          letters.push(String.fromCharCode(65 + idx));
          return;
        }
      }
      const clean = trimmedAns.toUpperCase();
      if (clean.length === 1 && clean >= "A" && clean <= "Z") {
        letters.push(clean);
        return;
      }
      if (trimmedAns) {
        letters.push(trimmedAns.replace(/<[^>]*>/g, "").trim());
      }
    });

    if (letters.length > 0) {
      const uniqueSorted = Array.from(new Set(letters)).sort();
      return uniqueSorted.join(", ");
    }
    return rawAns.replace(/<[^>]*>/g, "").trim() || "-";
  }

  if (questionType === "TRUE_FALSE" || questionType === "TRUE-FALSE") {
    const rows = q.trueFalseRows || q.true_false_rows || [];
    const answers = rows.map((r: any) => {
      const isTrue =
        r.answer === true ||
        String(r.answer).toLowerCase().trim() === "true" ||
        String(r.answer).trim() === "1" ||
        String(r.answer).trim() === "Benar" ||
        String(r.answer).trim() === "BENAR";
      return isTrue ? "B" : "S";
    });
    if (answers.length > 0) {
      return answers.join(", ");
    }
    return "-";
  }

  if (questionType === "MATCHING") {
    const pairs = q.matchingPairs || q.matching_pairs || [];
    const matches = pairs
      .map((p: any) => {
        const cleanLeft = (p.left || "").replace(/<[^>]*>/g, "").trim();
        const cleanRight = (p.right || "").replace(/<[^>]*>/g, "").trim();
        return `${cleanLeft} ➔ ${cleanRight}`;
      })
      .join(", ");
    return matches || "-";
  }

  return rawAns.replace(/<[^>]*>/g, "").trim() || "-";
};

interface GenerateBookHtmlParams {
  selectedExams: Exam[];
  bookTitle: string;
  bookSubtitle: string;
  fontSize: "small" | "normal" | "large";
  lineSpacing: "tight" | "normal" | "relaxed";
  paperMargin: "thin" | "normal" | "thick";
  keepTogether: "always" | "never" | "auto";
  styleTags: string;
}

export const generateBookHtml = ({
  selectedExams,
  bookTitle,
  bookSubtitle,
  fontSize,
  lineSpacing,
  paperMargin,
  keepTogether,
  styleTags,
}: GenerateBookHtmlParams): string => {
  let chartCounter = 0;
  let chartScripts = "";

  const injectChart = (chartData: ChartData | undefined | null, html: string): string => {
    let processedHtml = html || "";
    if (chartData) {
      chartCounter++;
      const canvasId = "pdf-chart-" + chartCounter;
      const typedData = chartData;

      if (
        typedData.type === "venn" ||
        typedData.type === "relation" ||
        typedData.type === "cartesian"
      ) {
        const newHtml =
          "<div class='chart-wrapper font-sans text-xs bg-slate-50 p-4 border rounded' style='text-align: center; margin: 15px 0;'>[Diagram Matematika/Fisika: " +
          (typedData.title || typedData.type.toUpperCase()) +
          "]</div>";
        processedHtml = processedHtml.includes("chart-placeholder")
          ? processedHtml.replace(
              /<span[^>]*class="[^"]*chart-placeholder[^"]*"[^>]*>.*?<\/span>/g,
              newHtml,
            )
          : processedHtml + newHtml;
      } else {
        const canvasHtml =
          "<div class='chart-wrapper' style='height: 280px; width: 100%; max-width: 550px; margin: 15px auto;'><canvas id='" +
          canvasId +
          "'></canvas></div>";
        processedHtml = processedHtml.includes("chart-placeholder")
          ? processedHtml.replace(
              /<span[^>]*class="[^"]*chart-placeholder[^"]*"[^>]*>.*?<\/span>/g,
              canvasHtml,
            )
          : processedHtml + canvasHtml;

        const labelsStr = JSON.stringify(typedData.labels || []);
        const datasetsStr = JSON.stringify(
          typedData.datasets?.map((ds: any) => ({
            label: ds.label,
            data: ds.data,
            backgroundColor: ds.backgroundColor || "#0088FE",
            borderColor: ds.borderColor || "#0088FE",
            borderWidth: 1,
          })) || [],
        );

        chartScripts +=
          "try { new Chart(document.getElementById('" +
          canvasId +
          "'), { type: '" +
          typedData.type +
          "', data: { labels: " +
          labelsStr +
          ", datasets: " +
          datasetsStr +
          " }, options: { responsive: true, maintainAspectRatio: false, animation: false } }); } catch(e) { console.error(e); }\n";
      }
    }
    return processedHtml.replace(
      /<span[^>]*class="[^"]*chart-placeholder[^"]*"[^>]*>.*?<\/span>/g,
      "",
    );
  };

  let questionsHtmlStr = '<div id="questions-source" style="display: none;">';
  selectedExams.forEach((exam, examIndex) => {
    questionsHtmlStr += `
            <div class="printable-item exam-header" style="page-break-after: avoid; break-after: avoid;">
                <div class="border-b-4 border-black pb-3 mb-6 flex justify-between items-end font-sans" style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 4px solid black; padding-bottom: 8px; margin-bottom: 16px; margin-top: 16px;">
                    <div>
                        <p style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #64748b; letter-spacing: 0.12em; margin: 0 0 3px 0;">MATA PELAJARAN - MODUL ${examIndex + 1}</p>
                        <h2 style="margin: 0; font-size: 20px; font-weight: 900; text-transform: uppercase;">${exam.config.subject || "Kisi-Kisi"}</h2>
                    </div>
                    <div style="background-color: black; color: white; padding: 4px 10px; font-size: 11px; font-weight: 800; text-transform: uppercase; display: inline-block; line-height: 1.2; box-sizing: border-box; vertical-align: middle; text-align: center;">Materi Soal</div>
                </div>
            </div>
        `;

    exam.questions.forEach((q, qIdx) => {
      const originalIndex = qIdx + 1;
      let cleanedText = q.questionText || "";
      cleanedText = injectChart(q.chartData, cleanedText);

      const qFontSize =
        fontSize === "small"
          ? "10.5pt"
          : fontSize === "large"
            ? "12.5pt"
            : "11.5pt";
      const qLineHeight =
        lineSpacing === "tight"
          ? "1.35"
          : lineSpacing === "relaxed"
            ? "1.8"
            : "1.55";

      questionsHtmlStr += `
                <div class="printable-item question-part" style="page-break-inside: avoid; break-inside: avoid; margin-bottom: 8px;">
                    <div class="question-container bg-white text-black">
                        <div style="display: flex; gap: 12px;">
                            <div style="font-weight: 955; font-size: 16px; min-width: 24px;">${originalIndex}.</div>
                            <div style="flex: 1; font-size: ${qFontSize}; line-height: ${qLineHeight}; color: #0f172a;">
                                <div style="text-align: justify; margin-bottom: 4px;">${cleanedText}</div>
                                
                                ${
                                  q.imageUrl
                                    ? `
                                    <div style="margin-top: 10px; margin-bottom: 10px; max-width: 80%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px; display: inline-block;">
                                        <img src="${q.imageUrl}" style="max-height: 180px; object-fit: contain; display: block;" referrerPolicy="no-referrer" />
                                    </div>
                                `
                                    : ""
                                }
                            </div>
                        </div>
                    </div>
                </div>
            `;

      if (
        q.questionType === "MULTIPLE_CHOICE" ||
        q.questionType === "COMPLEX_MULTIPLE_CHOICE"
      ) {
        const optFontSize =
          fontSize === "small"
            ? "10pt"
            : fontSize === "large"
              ? "12pt"
              : "11pt";
        const isComplex = q.questionType === "COMPLEX_MULTIPLE_CHOICE";
        const borderRadius = isComplex ? "4px" : "9999px";
        q.options?.forEach((opt, oIndex) => {
          let optText = opt || "";
          if (q.optionCharts && q.optionCharts[oIndex]) {
            optText = injectChart(q.optionCharts[oIndex], optText);
          }
          const isLastOption = oIndex === (q.options?.length || 0) - 1;
          const optionStyle = isLastOption
            ? "margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px dashed #e2e8f0;"
            : "margin-bottom: 8px;";
          questionsHtmlStr += `
                        <div class="printable-item option-part" style="page-break-inside: avoid; break-inside: avoid; margin-left: 36px; ${optionStyle} font-size: ${optFontSize};">
                            <div style="display: flex; gap: 12px; align-items: flex-start;">
                                <span style="font-weight: 955; border: 1.5px solid #0f172a; border-radius: ${borderRadius}; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 11px; background-color: #f8fafc; color: #0f172a; box-sizing: border-box; padding: 0 0 1px 0; margin-top: 4px; vertical-align: middle;">
                                    ${String.fromCharCode(65 + oIndex)}
                                </span>
                                <div style="padding-top: 2px; flex: 1; word-wrap: break-word; overflow-wrap: break-word;">
                                    <span style="display: inline-block; max-width: 100%; white-space: normal; line-height: 1.4;">${optText}</span>
                                    ${
                                      q.optionImages && q.optionImages[oIndex]
                                        ? `
                                        <div style="margin-top: 4px; border: 1px solid #e2e8f0; border-radius: 4px; padding: 2px; display: block; max-width: 120px; background-color: white;">
                                            <img src="${q.optionImages[oIndex]}" style="max-height: 75px; object-fit: contain;" referrerPolicy="no-referrer" />
                                        </div>
                                    `
                                        : ""
                                    }
                                </div>
                            </div>
                        </div>
                    `;
        });
      } else if (q.questionType === "TRUE_FALSE") {
        questionsHtmlStr += `
                    <div class="printable-item tf-part" style="margin-top: 8px; margin-left: 36px; margin-bottom: 24px; width: calc(100% - 36px); page-break-inside: avoid; break-inside: avoid;">
                        <table style="width: 100%; table-layout: fixed; word-wrap: break-word; border-collapse: collapse; border: 1.5px solid #0f172a; font-size: 10pt;">
                            <thead>
                                <tr style="background-color: #f1f5f9;">
                                    <th style="text-align: left; padding: 6px 10px; font-weight: bold; border-right: 1px solid #0f172a; border-bottom: 1.5px solid #0f172a;">Pernyataan</th>
                                    <th style="width: 80px; text-align: center; font-weight: bold; border-right: 1px solid #0f172a; border-bottom: 1.5px solid #0f172a; white-space: nowrap;">BENAR</th>
                                    <th style="width: 80px; text-align: center; font-weight: bold; border-bottom: 1.5px solid #0f172a; white-space: nowrap;">SALAH</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
        q.trueFalseRows?.forEach((row) => {
          let rText = row.text || "";
          if (row.chartData) {
            rText = injectChart(row.chartData, rText);
          }
          questionsHtmlStr += `
                        <tr style="border-bottom: 1px solid #cbd5e1;">
                            <td style="padding: 6px 10px; text-align: left; border-right: 1px solid #cbd5e1; font-weight: 500;">${rText}</td>
                            <td style="padding: 6px; text-align: center; border-right: 1px solid #cbd5e1;">
                                <div style="width: 16px; height: 16px; border: 1px solid #94a3b8; border-radius: 3px; margin: 0 auto; display: inline-flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; color: #94a3b8; background-color: #f8fafc; box-sizing: border-box; padding: 0 0 1px 0; vertical-align: middle;">B</div>
                            </td>
                            <td style="padding: 6px; text-align: center;">
                                <div style="width: 16px; height: 16px; border: 1px solid #94a3b8; border-radius: 3px; margin: 0 auto; display: inline-flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; color: #94a3b8; background-color: #f8fafc; box-sizing: border-box; padding: 0 0 1px 0; vertical-align: middle;">S</div>
                            </td>
                        </tr>
                    `;
        });
        questionsHtmlStr += `
                            </tbody>
                        </table>
                    </div>
                `;
      } else if (q.questionType === "MATCHING") {
        questionsHtmlStr += `<div class="printable-item match-part" style="margin-left: 36px; margin-top: 10px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px dashed #e2e8f0; width: calc(100% - 36px); display: flex; flex-direction: column; gap: 8px; page-break-inside: avoid; break-inside: avoid;">`;
        q.matchingPairs?.forEach((pair) => {
          let leftItem = pair.left || "";
          if (pair.leftChart) {
            leftItem = injectChart(pair.leftChart, leftItem);
          }
          questionsHtmlStr += `
                        <div style="display: flex; align-items: center; gap: 12px; page-break-inside: avoid; break-inside: avoid;">
                            <div style="flex: 1; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; background-color: #f8fafc; font-size: 10.5pt;">${leftItem}</div>
                            <div style="font-weight: bold; color: #475569;">......</div>
                            <div style="flex: 1; border-bottom: 1px solid #475569; height: 18px;"></div>
                        </div>
                    `;
        });
        questionsHtmlStr += `</div>`;
      } else if (
        q.questionType === "ESSAY" ||
        q.questionType === "FILL_IN_THE_BLANK"
      ) {
        questionsHtmlStr += `
                    <div class="printable-item essay-part" style="margin-left: 36px; margin-top: 10px; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px; background-color: #f8fafc; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px dashed #e2e8f0; width: calc(100% - 36px); page-break-inside: avoid; break-inside: avoid;">
                        <p style="font-size: 8.5pt; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 6px 0;">Jawaban Uraian:</p>
                        <div style="border-bottom: 1px dashed #cbd5e1; height: 18px; margin-bottom: 6px;"></div>
                        <div style="border-bottom: 1px dashed #cbd5e1; height: 18px; margin-bottom: 6px;"></div>
                        <div style="border-bottom: 1px dashed #cbd5e1; height: 18px;"></div>
                    </div>
                `;
      }
    });
  });
  questionsHtmlStr += `</div><div id="paginated-questions"></div>`;

  const examChunks: Exam[][] = [];
  const examsPerPage = 2;
  for (let i = 0; i < selectedExams.length; i += examsPerPage) {
    examChunks.push(selectedExams.slice(i, i + examsPerPage));
  }

  let answerKeyHtmlStr = "";
  examChunks.forEach((chunk, chunkIdx) => {
    let chunkKeysHtml = "";
    chunk.forEach((exam) => {
      const examIndex = selectedExams.findIndex((e) => e.code === exam.code);
      chunkKeysHtml += `
                <div style="margin-bottom: 20px; break-inside: avoid; page-break-inside: avoid;">
                    <div style="display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 12px;">
                        <div style="width: 24px; height: 24px; border-radius: 50%; background-color: #000; color: #fff; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; font-weight: 900; font-size: 12px;">${examIndex + 1}</div>
                        <h2 style="font-size: 14px; font-weight: 900; text-transform: uppercase; margin: 0;">${exam.config.subject || "Kisi-Kisi"}</h2>
                    </div>
                    
                    <div class="keys-grid" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; background-color: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; box-sizing: border-box; width: 100%;">
            `;

      exam.questions.forEach((q, qIndex) => {
        const ansText = getFormattedAnswerText(q);
        chunkKeysHtml += `
                    <div style="font-size: 11px; display: flex; align-items: flex-start; gap: 6px; box-sizing: border-box;">
                        <span style="font-weight: 800; color: #64748b; min-width: 18px; text-align: right;">${qIndex + 1}.</span>
                        <span style="font-weight: 950; color: #0f172a; text-transform: uppercase; background-color: white; border: 1px solid #e2e8f0; border-radius: 4px; padding: 2px 4px; flex: 1; text-align: center; display: inline-block; word-break: break-all; min-height: 18px;">${ansText}</span>
                    </div>
                `;
      });

      chunkKeysHtml += `
                    </div>
                </div>
            `;
    });

    answerKeyHtmlStr += `
            <div class="page-container">
                <div style="flex: 1; display: flex; flex-direction: column; justify-content: flex-start; width: 100%; box-sizing: border-box;">
                    <div style="text-align: center; padding-bottom: 8px; margin-bottom: 16px; border-bottom: 4px solid black;">
                        <p style="font-weight: 900; letter-spacing: 0.2em; font-size: 10px; color: #dc2626; text-transform: uppercase; margin: 0 0 4px 0;">DOKUMEN SANGAT RAHASIA</p>
                        <h1 style="font-family: serif; font-size: 20px; font-weight: 900; text-transform: uppercase; margin: 0;">KUNCI JAWABAN RESMI</h1>
                        <p style="font-size: 10px; text-transform: uppercase; font-weight: bold; margin: 4px 0 0 0; color: #64748b;">Halaman ${chunkIdx + 1} dari ${examChunks.length}</p>
                    </div>
                    ${chunkKeysHtml}
                </div>
                <div style="border-top: 1px solid #cbd5e1; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #64748b; font-family: sans-serif; margin-top: auto; width: 100%;">
                    <div style="font-weight: bold; text-transform: uppercase;">KUNCI JAWABAN RESMI</div>
                    <div style="font-weight: 900; letter-spacing: 0.1em;">DOKUMEN NEGARA - RAHASIA</div>
                </div>
            </div>
        `;
  });

  const computedPadding =
    paperMargin === "thin" ? "15mm" : paperMargin === "thick" ? "25mm" : "20mm";

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <title>${bookTitle} - Platform Ujian Cerdas</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
        ${styleTags}
        <style>
            @page {
                size: A4 portrait !important;
                margin: 0 !important;
            }
            @media print {
                body {
                    background: white !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                body, .book-canvas, .book-canvas * {
                    visibility: visible !important;
                }
                .no-print {
                    display: none !important;
                }
                .page-break {
                    display: none !important;
                }
                .avoid-break {
                    page-break-inside: ${keepTogether === "never" ? "auto" : "avoid"} !important;
                    break-inside: ${keepTogether === "never" ? "auto" : "avoid"} !important;
                }
                .book-canvas {
                    width: 210mm !important;
                    max-width: 210mm !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    box-shadow: none !important;
                    background: white !important;
                }
                .page-container {
                    width: 210mm !important;
                    height: auto !important;
                    min-height: 296.5mm !important;
                    padding: calc(${computedPadding} - 54px) ${computedPadding} calc(${computedPadding} + 54px) ${computedPadding} !important;
                    margin: 0 !important;
                    border: none !important;
                    box-sizing: border-box !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: space-between !important;
                    page-break-after: always !important;
                    break-after: page !important;
                }
                .page-container-flow {
                    width: 210mm !important;
                    min-height: 296.5mm !important;
                    padding: calc(${computedPadding} - 54px) ${computedPadding} calc(${computedPadding} + 54px) ${computedPadding} !important;
                    margin: 0 !important;
                    box-shadow: none !important;
                    border: none !important;
                    box-sizing: border-box !important;
                    page-break-after: always !important;
                    break-after: page !important;
                }
                .page-cover {
                    border: none !important;
                    padding: calc(${computedPadding} - 54px) ${computedPadding} calc(${computedPadding} + 54px) ${computedPadding} !important;
                    height: 296.5mm !important;
                }
                .keys-grid {
                    grid-template-columns: repeat(5, 1fr) !important;
                }
            }
            body {
                font-family: 'Inter', sans-serif;
                background-color: #f1f5f9;
                color: #0f172a;
                margin: 0;
                padding: 30px 0;
            }
            .book-canvas {
                background-color: white;
                width: 210mm;
                margin: 0 auto;
                box-sizing: border-box;
                box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                display: flex;
                flex-direction: column;
            }
            .page-container {
                position: relative;
                width: 210mm;
                height: auto;
                min-height: 296.5mm;
                padding: calc(${computedPadding} - 54px) ${computedPadding} calc(${computedPadding} + 54px) ${computedPadding};
                box-sizing: border-box;
                background: white;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                page-break-after: always;
                break-after: page;
            }
            .page-container-flow {
                position: relative;
                width: 210mm;
                min-height: 296.5mm;
                padding: calc(${computedPadding} - 54px) ${computedPadding} calc(${computedPadding} + 54px) ${computedPadding};
                box-sizing: border-box;
                background: white;
                page-break-after: always;
                break-after: page;
            }
            .page-break {
                display: none !important;
            }
            .avoid-break {
                page-break-inside: ${keepTogether === "never" ? "auto" : "avoid"};
                break-inside: ${keepTogether === "never" ? "auto" : "avoid"};
            }
            .chart-wrapper {
                width: 100%;
                max-width: 550px;
                margin: 15px auto;
                page-break-inside: avoid;
                text-align: center;
            }
            img {
                max-width: 100%;
                height: auto;
                object-fit: contain;
                border-radius: 4px;
            }
            table {
                border-collapse: collapse;
                width: 100%;
                margin: 10px 0;
            }
            table, th, td {
                border: 1px solid #cbd5e1;
                padding: 8px;
            }
            .katex, .katex * {
                line-height: normal !important;
                text-indent: 0 !important;
            }
        </style>
    </head>
    <body>
        <div class="no-print" style="position: fixed; top: 12px; left: 50%; transform: translateX(-50%); z-index: 9999; display: flex; gap: 12px; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(8px); padding: 8px 16px; border-radius: 9999px; box-shadow: 0 10px 20px rgba(0,0,0,0.25);">
            <button onclick="window.print()" style="background-color: #10b981; color: white; border: none; padding: 8px 18px; border-radius: 9999px; font-weight: bold; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px;"><span style="font-size: 15px;">🖨️</span> Cetak / Simpan PDF</button>
            <button onclick="window.close()" style="background-color: transparent; color: #cbd5e1; border: 1px solid #475569; padding: 8px 18px; border-radius: 9999px; font-weight: bold; font-size: 13px; cursor: pointer;">Tutup Halaman</button>
        </div>

        <div class="book-canvas">
            <!-- Cover Page -->
            <div class="page-container page-cover" style="page-break-after: always; break-after: page;">
                <div style="border: 12px double #000000; padding: 12mm; flex: 1; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; width: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid black; padding-bottom: 12px;">
                        <div style="border: 2px solid black; padding: 6px 14px 6px 14px; font-size: 12px; font-weight: 600; display: inline-block; background-color: white; line-height: 1;">Dokumen Negara</div>
                        <div style="text-align: center;">
                            <p style="font-family: serif; font-weight: bold; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 2px 0;">Republik Indonesia</p>
                            <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; margin: 0; color: #1e293b; letter-spacing: 0.05em;">Platform Ujian Cerdas</p>
                        </div>
                        <div style="border: 2px solid black; padding: 6px 14px 6px 14px; font-size: 12px; font-weight: 600; font-style: italic; display: inline-block; background-color: white; line-height: 1;">Sangat Rahasia</div>
                    </div>

                    <div style="display: block; text-align: center; margin: auto 0; padding: 24px 0;">
                        <div style="display: flex; justify-content: center; margin-bottom: 24px; width: 100%;">
                            <div style="width: 98px; height: 98px; padding: 12px; border: 4px solid black; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; background-color: white; margin: 0 auto; vertical-align: middle;">
                                <div style="box-sizing: border-box; width: 68px; height: 68px; border: 2px dashed black; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 0 auto;">
                                    <span style="font-family: serif; font-size: 24px; font-weight: 900; letter-spacing: -0.05em; line-height: 1.1; display: block; margin: 0; padding: 0;">BSR</span>
                                    <span style="font-size: 7px; font-weight: 955; text-transform: uppercase; letter-spacing: 0.15em; line-height: 1.1; display: block; margin: 2px 0 0 0; padding: 0;">SOAL RESMI</span>
                                </div>
                            </div>
                        </div>

                        <h1 style="font-family: serif; font-size: 32px; font-weight: 900; text-transform: uppercase; tracking-wider: 0.05em; line-height: 1.25; max-width: 600px; margin: 0 0 12px 0; color: black;">
                            ${bookTitle}
                        </h1>
                        <p style="font-size: 14px; font-weight: bold; color: #475569; letter-spacing: 0.12em; text-transform: uppercase; margin: 0 0 28px 0;">
                            ${bookSubtitle}
                        </p>

                        <div style="width: 100%; max-width: 480px; border: 4px double black; padding: 16px; background-color: white; text-align: left; margin: 0 auto;">
                            <p style="text-align: center; font-weight: 950; text-transform: uppercase; letter-spacing: 0.12em; font-size: 11px; border-bottom: 2px solid black; padding-bottom: 6px; margin: 0 0 12px 0;">IDENTITAS KUMPULAN SOAL</p>
                            <table style="width: 100%; font-size: 12px; border: none; border-collapse: collapse;">
                                <tr style="border: none;">
                                    <td style="border: none; padding: 4px 0; width: 130px; text-transform: uppercase; color: #64748b; font-weight: bold;">Jenis Dokumen</td>
                                    <td style="border: none; padding: 4px; width: 10px;">:</td>
                                    <td style="border: none; padding: 4px 0; font-weight: bold; text-transform: uppercase;">Buku Kumpulan Soal Resmi (BSR)</td>
                                </tr>
                                <tr style="border: none; border-top: 1px solid #e2e8f0;">
                                    <td style="border: none; padding: 4px 0; text-transform: uppercase; color: #64748b; font-weight: bold;">Total Modul</td>
                                    <td style="border: none; padding: 4px;">:</td>
                                    <td style="border: none; padding: 4px 0; font-weight: bold;">${selectedExams.length} Modul Kisi-Kisi</td>
                                </tr>
                                <tr style="border: none; border-top: 1px solid #e2e8f0;">
                                    <td style="border: none; padding: 4px 0; text-transform: uppercase; color: #64748b; font-weight: bold;">Total Soal</td>
                                    <td style="border: none; padding: 4px;">:</td>
                                    <td style="border: none; padding: 4px 0; font-weight: bold;">${selectedExams.reduce((acc, exam) => acc + exam.questions.length, 0)} Butir Soal</td>
                                </tr>
                                <tr style="border: none; border-top: 1px solid #e2e8f0;">
                                    <td style="border: none; padding: 4px 0; text-transform: uppercase; color: #64748b; font-weight: bold;">Tahun Terbit</td>
                                    <td style="border: none; padding: 4px;">:</td>
                                    <td style="border: none; padding: 4px 0; font-weight: bold;">${new Date().getFullYear()} / ${new Date().getFullYear() + 1}</td>
                                </tr>
                                <tr style="border: none; border-top: 1px solid #e2e8f0;">
                                    <td style="border: none; padding: 6px 0; text-transform: uppercase; color: #64748b; font-weight: bold;">Hak Akses</td>
                                    <td style="border: none; padding: 6px;">:</td>
                                    <td style="border: none; padding: 6px 0;"><span style="font-weight: 955; font-size: 10px; padding: 4px 10px; border: 1.5px solid black; background-color: #f8fafc; display: inline-block; line-height: 1.2 !important; box-sizing: border-box; vertical-align: middle; text-align: center;">GURU / PENGAWAS</span></td>
                                </tr>
                            </table>
                        </div>
                    </div>

                    <div style="border-top: 1px solid #cbd5e1; padding-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 9px;">
                        <p style="font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; margin: 0; color: #475569;">PLATFORM UJIAN CERDAS INDONESIA</p>
                        <p style="font-weight: 600; margin: 0; color: #64748b;">Dicetak: ${new Date().toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })}</p>
                    </div>
                </div>
            </div>

            <!-- Petunjuk Umum Page -->
            <div class="page-container" style="page-break-after: always; break-after: page;">
                <div style="border: 12px double #000000; padding: 12mm; flex: 1; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; width: 100%;">
                    <div>
                        <div style="border-bottom: 4px solid black; padding-bottom: 12px; margin-bottom: 20px; text-align: center;">
                            <h2 style="font-family: serif; font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">PETUNJUK UMUM</h2>
                            <p style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; margin: 4px 0 0 0;">ASESMEN KOMPETENSI MINIMUM & EVALUASI BELAJAR GURU</p>
                        </div>

                        <div style="font-size: 13px; line-height: 1.6; text-align: justify; color: #334155;">
                            <p style="font-weight: bold; color: #0f172a; margin-bottom: 14px;">Sebelum menguji atau membagikan soal-soal di dalam buku ini, mohon diperhatikan beberapa pedoman penting berikut:</p>
                            <ol style="padding-left: 20px; display: flex; flex-direction: column; gap: 12px; margin: 0;">
                                <li><strong>Pembacaan Doa:</strong> Awali pelaksanaan kegiatan mengkaji ataupun pengujian ujian evaluasi dengan berdoa setulus hati demi kesuksesan bersama.</li>
                                <li><strong>Verifikasi Modul:</strong> Periksa keselarasan semua modul materi (${selectedExams.length} Modul) dalam kumpulan soal ini sebelum didistribusikan secara cetak fisik atau digital.</li>
                                <li><strong>Pilihan Ganda Resmi:</strong> Pilihan ganda tunggal dan kompleks tersaji dengan visual huruf lingkaran tebal (A, B, C, D, E) untuk menjamin kerapihan tata letak halaman saat diprint.</li>
                                <li><strong>Soal Isian & Benar-Salah:</strong> Untuk soal berpola Benar/Salah (True-False), siswa dapat memberi tanda checklist atau lingkaran langsung pada kolom pilihan tabel yang tertera.</li>
                                <li><strong>Lembar Jawaban Esai:</strong> Buku printout ini melampirkan lembar garis putus-putus elegan di bawah soal esai agar memudahkan siswa menjabarkan rincian rumus atau argumen tulisan tangan secara rapi.</li>
                                <li><strong>Kunci Jawaban:</strong> Lembar Kunci Jawaban Resmi telah dilampirkan pada bagian halaman penutup buku. Pisahkan lembar penutup ini saat mendistribusikan soal kepada peserta didik Anda.</li>
                            </ol>
                        </div>
                    </div>
                    <div style="border-top: 2px solid #000000; padding-top: 10px; text-align: center; font-size: 11px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase;">SELAMAT BEKERJA • PRESTASI PENTING JUJUR UTAMA</div>
                </div>
            </div>

            <!-- Materi Soal Ujian -->
            ${questionsHtmlStr}

            <!-- Kunci Jawaban Page -->
            ${answerKeyHtmlStr}
        </div>

        <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
        <script>
            ${chartScripts}
        </script>
        <script>
            window.onload = () => {
                if (window.katex) {
                    document.querySelectorAll('.math-visual[data-latex]').forEach(el => {
                        try {
                            const latex = el.getAttribute('data-latex');
                            if (latex) {
                                const isBlock = el.style.display === 'block';
                                el.innerHTML = window.katex.renderToString(latex, {
                                    throwOnError: false,
                                    displayMode: isBlock
                                });
                            }
                        } catch (e) {
                            console.error('KaTeX error:', e);
                        }
                    });
                }
                
                const sourceDiv = document.getElementById('questions-source');
                const targetDiv = document.getElementById('paginated-questions');
                
                if (sourceDiv && targetDiv) {
                    sourceDiv.style.display = 'block';
                    sourceDiv.style.visibility = 'hidden';
                    sourceDiv.style.position = 'absolute';
                    
                    const items = Array.from(sourceDiv.children);
                    let pageIdx = 1;
                    
                    function createNewPage() {
                        const page = document.createElement('div');
                        page.className = 'page-container pdf-render-page';
                        page.style = 'width: 210mm; min-height: 296.5mm; height: 296.5mm; padding: calc(${computedPadding} - 54px) ${computedPadding} calc(${computedPadding} + 54px) ${computedPadding}; box-sizing: border-box; background: white; display: flex; flex-direction: column; position: relative; margin: 0 auto; overflow: hidden;';
                        
                        const content = document.createElement('div');
                        content.className = 'page-content';
                        content.style = 'flex: 1; display: flex; flex-direction: column; overflow: hidden; gap: 8px;';
                        page.appendChild(content);

                        const footer = document.createElement('div');
                        footer.className = 'page-footer';
                        footer.style = 'border-top: 1px solid #cbd5e1; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #64748b; font-family: sans-serif; position: absolute; bottom: ${computedPadding}; left: ${computedPadding}; right: ${computedPadding};';
                        footer.innerHTML = '<div style="font-weight: bold; text-transform: uppercase;">HALAMAN ' + pageIdx + '</div><div style="font-weight: 900; letter-spacing: 0.1em;">KUMPULAN SOAL RESMI</div>';
                        page.appendChild(footer);
                        
                        return page;
                    }
                    
                    let currentPage = createNewPage();
                    let pageContent = currentPage.querySelector('.page-content');
                    targetDiv.appendChild(currentPage);

                    for (let i = 0; i < items.length; i++) {
                        const item = items[i];
                        if (pageContent) {
                            pageContent.appendChild(item);
                            if (pageContent.scrollHeight > pageContent.clientHeight) {
                                if (pageContent.children.length === 1) {
                                    continue; 
                                }
                                pageContent.removeChild(item);
                                pageIdx++;
                                currentPage = createNewPage();
                                pageContent = currentPage.querySelector('.page-content');
                                targetDiv.appendChild(currentPage);
                                if (pageContent) pageContent.appendChild(item);
                            }
                        }
                    }
                    if (sourceDiv.parentNode) sourceDiv.parentNode.removeChild(sourceDiv);
                }

                const overlay = document.createElement('div');
                overlay.style = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#f8fafc;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;text-align:center;';
                overlay.innerHTML = '<div style="width:48px;height:48px;border:4px solid #e2e8f0;border-top:4px solid #4f46e5;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:24px;"></div><h2 style="color:#0f172a;margin:0 0 8px 0;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Memproses PDF Resmi</h2><p style="color:#64748b;margin:0;font-size:15px;max-width:300px;">Mohon tunggu, dokumen sedang disusun dan dirender dengan presisi tinggi...</p><style>@keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}</style>';
                document.body.appendChild(overlay);

                setTimeout(async () => {
                    try {
                        const { jsPDF } = window.jspdf;
                        const pdf = new jsPDF('p', 'mm', 'a4');
                        const pages = document.querySelectorAll('.page-container'); 
                        
                        for (let i = 0; i < pages.length; i++) {
                            const page = pages[i];
                            
                            overlay.innerHTML = '<div style="width:48px;height:48px;border:4px solid #e2e8f0;border-top:4px solid #4f46e5;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:24px;"></div><h2 style="color:#0f172a;margin:0 0 8px 0;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Memproses PDF Resmi</h2><p style="color:#64748b;margin:0;font-size:15px;max-width:300px;">Merender halaman ' + (i + 1) + ' dari ' + pages.length + '...</p><style>@keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}</style>';
                            await new Promise(r => setTimeout(r, 50));
                            
                            const canvas = await html2canvas(page as HTMLElement, {
                                scale: 2,
                                useCORS: true,
                                logging: false
                            });
                            
                            const imgData = canvas.toDataURL('image/jpeg', 0.98);
                            
                            if (i > 0) {
                                pdf.addPage();
                            }
                            
                            const imgProps = pdf.getImageProperties(imgData);
                            const pdfWidth = pdf.internal.pageSize.getWidth();
                            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                            
                            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
                        }
                        
                        (window as any).__pdf = pdf;
                        
                        overlay.innerHTML = '<div style="width:56px;height:56px;border-radius:50%;background:#10b981;color:white;display:flex;align-items:center;justify-content:center;margin-bottom:24px;"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div><h2 style="color:#0f172a;margin:0 0 8px 0;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Render Selesai!</h2><p style="color:#64748b;margin:0 0 24px 0;font-size:15px;max-width:350px;">Dokumen PDF Anda telah berhasil dibuat. Silakan klik tombol di bawah untuk mengunduhnya.</p><button id="auto-download-btn" onclick="window.__pdf.save(&quot;Buku_Soal_Resmi.pdf&quot;)" style="display:inline-block;padding:14px 28px;background-color:#4f46e5;color:white;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;border:none;cursor:pointer;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">⬇ Unduh Buku PDF Sekarang</button><p style="color:#94a3b8;font-size:13px;margin-top:24px;">Anda dapat menutup halaman ini setelah dokumen terunduh.</p>';
                        
                        setTimeout(() => {
                            const btn = document.getElementById('auto-download-btn');
                            if(btn) btn.click();
                        }, 500);
                    } catch (err) {
                        overlay.innerHTML = '<div style="color:#ef4444;margin-bottom:16px;"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg></div><h2 style="color:#0f172a;margin:0 0 8px 0;font-size:24px;font-weight:700;">Gagal Merender PDF</h2><p style="color:#64748b;margin:0;font-size:15px;">Terjadi kesalahan: ' + err + '</p><button onclick="window.close()" style="margin-top:24px;padding:8px 16px;background:#0f172a;color:white;border:none;border-radius:6px;cursor:pointer;">Tutup Halaman</button>';
                    }
                }, 1000);
            };
        </script>
    </body>
    </html>
    `;
};
