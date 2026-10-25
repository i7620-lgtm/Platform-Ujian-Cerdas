import { Exam, Question, ChartData } from "../../types";
import { renderMathInHtml } from "../../utils/mathRenderer";
import { sanitizeHtml } from "./examUtils";

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
    const trueLabel = (q.categoryLabels && q.categoryLabels[0]) || "Benar";
    const falseLabel = (q.categoryLabels && q.categoryLabels[1]) || "Salah";
    const trueChar = trueLabel.charAt(0).toUpperCase();
    const falseChar = falseLabel.charAt(0).toUpperCase();
    const answers = rows.map((r: any) => {
      const isTrue =
        r.answer === true ||
        String(r.answer).toLowerCase().trim() === "true" ||
        String(r.answer).trim() === "1" ||
        String(r.answer).toLowerCase().trim() === trueLabel.toLowerCase() ||
        String(r.answer).trim() === "Benar" ||
        String(r.answer).trim() === "BENAR";
      return isTrue ? trueChar : falseChar;
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

  const injectChart = (
    chartData: ChartData | undefined | null,
    html: string,
  ): string => {
    let processedHtml = html || "";
    if (/\\?\[(CHART|DIAGRAM|GRAFIK).*?\\?\]/i.test(processedHtml)) {
      processedHtml = processedHtml.replace(
        /(?:<p>)?\s*\\?\[(CHART|DIAGRAM|GRAFIK).*?\\?\]\s*(?:<\/p>)?/gi,
        '<span class="chart-placeholder" data-chart="true"></span>'
      );
    }
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
          
        if (processedHtml.includes("chart-placeholder")) {
            processedHtml = processedHtml.replace(
              /<span[^>]*class="[^"]*chart-placeholder[^"]*"[^>]*>.*?<\/span>/g,
              canvasHtml,
            );
        } else if (processedHtml.includes("data-chart=\"true\"") || processedHtml.includes("data-chart='true'")) {
            processedHtml = processedHtml.replace(
              /<[^>]+data-chart=['"]true['"][^>]*>.*?<\/[a-zA-Z0-9]+>/g,
              canvasHtml,
            );
        } else {
            processedHtml = processedHtml + canvasHtml;
        }

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

  const shouldRenderTwoColumns = (options?: string[]): boolean => {
    if (!options || options.length <= 1) return false;
    return options.every((opt) => {
      if (!opt) return true;
      const plain = opt.replace(/<[^>]*>/g, "").trim();
      return plain.length <= 32;
    });
  };

  const isInfoItem = (q: any): boolean => {
    if (!q) return false;
    const t = (q.questionType || q.type || "").toString().trim().toUpperCase();
    return t === "INFO" || t === "KETERANGAN" || t === "INFORMASI";
  };

  const formatQuestionHtml = (rawHtml: string): string => {
    if (!rawHtml) return "";
    const sanitized = sanitizeHtml(rawHtml);
    return renderMathInHtml(sanitized);
  };

  let questionsHtmlStr = "";
  selectedExams.forEach((exam, examIndex) => {
    const actualExamQuestionsCount = exam.questions.filter(
      (item) => !isInfoItem(item),
    ).length;
    questionsHtmlStr += '<div class="page-container-flow">';
    questionsHtmlStr += `
            <div class="printable-item exam-header" style="page-break-after: avoid; break-after: avoid; margin-top: 6px; margin-bottom: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 12px;">
                    <div>
                        <p style="font-size: 8.5pt; font-weight: bold; text-transform: uppercase; color: #475569; letter-spacing: 0.1em; margin: 0 0 2px 0;">
                            MODUL ${examIndex + 1} &bull; ${exam.authorSchool || "UJIAN SEKOLAH / ASESMEN"}
                        </p>
                        <h2 style="margin: 0; font-size: 13pt; font-weight: 900; text-transform: uppercase; color: #000;">
                            ${exam.config?.examType ? `${exam.config.examType} - ` : ""}${exam.config?.subject || "Mata Pelajaran"}
                        </h2>
                    </div>
                    <div style="text-align: right; font-size: 8.5pt; color: #334155; line-height: 1.35;">
                        <div><span style="font-weight: bold;">Kelas:</span> ${exam.config?.classLevel || "-"} &bull; <span style="font-weight: bold;">Waktu:</span> ${exam.config?.timeLimit ? `${exam.config.timeLimit} Menit` : "-"}</div>
                        <div><span style="font-weight: bold;">Jumlah Soal:</span> ${actualExamQuestionsCount} Butir (${exam.code})</div>
                    </div>
                </div>
            </div>
        `;

    exam.questions.forEach((q, qIdx) => {
      const isInfo = isInfoItem(q);
      const questionNumber =
        exam.questions
          .slice(0, qIdx)
          .filter((item) => !isInfoItem(item)).length + 1;

      let cleanedText = formatQuestionHtml(q.questionText || "");
      cleanedText = injectChart(q.chartData, cleanedText);

      const qFontSize =
        fontSize === "small"
          ? "10pt"
          : fontSize === "large"
            ? "12pt"
            : "11pt";
      const qLineHeight =
        lineSpacing === "tight"
          ? "1.35"
          : lineSpacing === "relaxed"
            ? "1.75"
            : "1.5";
      const optFontSize =
        fontSize === "small"
          ? "9.5pt"
          : fontSize === "large"
            ? "11.5pt"
            : "10.5pt";

      if (isInfo) {
        questionsHtmlStr += `
            <div class="printable-item info-part avoid-break" style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-left: 4px solid #2563eb; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px;">
                <div class="html-content" style="font-size: ${qFontSize}; line-height: ${qLineHeight}; color: #0f172a; text-align: justify;">
                    ${cleanedText}
                </div>
                ${
                  q.imageUrl
                    ? `
                    <div style="margin-top: 8px; margin-bottom: 8px; max-width: 80%;">
                        <img src="${q.imageUrl}" style="max-height: 180px; object-fit: contain; display: block; border-radius: 4px; border: 1px solid #cbd5e1;" referrerPolicy="no-referrer" />
                    </div>
                `
                    : ""
                }
                ${
                  q.audioUrl
                    ? `
                    <div style="margin-top: 6px; font-size: 8.5pt; color: #475569;">
                        <strong>[Audio Stimulus]:</strong> ${q.audioUrl}
                    </div>
                `
                    : ""
                }
            </div>
        `;
        return;
      }

      questionsHtmlStr += `
            <div class="printable-item question-part avoid-break" style="margin-bottom: 14px;">
                <div class="question-container bg-white text-black">
                    <div style="display: flex; gap: 8px; align-items: flex-start;">
                        <span style="font-weight: bold; font-size: ${qFontSize}; min-width: 22px; text-align: right; flex-shrink: 0; color: #000; margin-top: 1px; line-height: ${qLineHeight}; select-none;">${questionNumber}.</span>
                        <div style="flex: 1; font-size: ${qFontSize}; line-height: ${qLineHeight}; color: #0f172a;">
                            <div class="html-content" style="text-align: justify; margin-bottom: 4px;">${cleanedText}</div>
                            
                            ${
                              q.imageUrl
                                ? `
                                <div style="margin-top: 8px; margin-bottom: 8px; max-width: 80%;">
                                    <img src="${q.imageUrl}" style="max-height: 180px; object-fit: contain; display: block; border-radius: 4px; border: 1px solid #cbd5e1;" referrerPolicy="no-referrer" />
                                </div>
                            `
                                : ""
                            }

                            ${
                              q.audioUrl
                                ? `
                                <div style="margin-top: 6px; font-size: 8.5pt; color: #475569;">
                                    <strong>[Audio]:</strong> ${q.audioUrl}
                                </div>
                            `
                                : ""
                            }
                        </div>
                    </div>
                </div>
      `;

      if (
        q.questionType === "MULTIPLE_CHOICE" ||
        q.questionType === "COMPLEX_MULTIPLE_CHOICE"
      ) {
        const isComplex = q.questionType === "COMPLEX_MULTIPLE_CHOICE";
        const isTwoCol = shouldRenderTwoColumns(q.options);
        const containerStyle = isTwoCol
          ? "display: grid; grid-template-columns: 1fr 1fr; column-gap: 20px; row-gap: 5px; margin-top: 6px; padding-left: 30px; margin-bottom: 12px;"
          : "display: flex; flex-direction: column; gap: 5px; margin-top: 6px; padding-left: 30px; margin-bottom: 12px;";

        questionsHtmlStr += `<div class="printable-item options-wrapper" style="${containerStyle}">`;
        q.options?.forEach((opt, oIndex) => {
          let optText = formatQuestionHtml(opt || "");
          if (q.optionCharts && q.optionCharts[oIndex]) {
            optText = injectChart(q.optionCharts[oIndex], optText);
          }
          const optionBadge = isComplex
            ? `<span style="font-weight: bold; border: 1.5px solid #000; border-radius: 3px; min-width: 20px; height: 18px; display: inline-flex; align-items: center; justify-content: center; font-size: 8.5pt; background: #fff; margin-top: 1px; flex-shrink: 0; box-sizing: border-box;">${String.fromCharCode(65 + oIndex)}</span>`
            : `<span style="font-weight: bold; color: #000; flex-shrink: 0; min-width: 16px;">${String.fromCharCode(65 + oIndex)}.</span>`;

          questionsHtmlStr += `
                <div class="printable-item option-item avoid-break" style="display: flex; gap: 8px; align-items: flex-start; font-size: ${optFontSize}; line-height: 1.45;">
                    ${optionBadge}
                    <div class="html-content" style="flex: 1; word-wrap: break-word; overflow-wrap: break-word; color: #000;">
                        ${optText}
                        ${
                          q.optionImages && q.optionImages[oIndex]
                            ? `
                            <div style="margin-top: 4px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px; display: inline-block; background-color: white;">
                                <img src="${q.optionImages[oIndex]}" style="max-height: 75px; object-fit: contain;" referrerPolicy="no-referrer" />
                            </div>
                        `
                            : ""
                        }
                    </div>
                </div>
          `;
        });
        questionsHtmlStr += `</div>`;
      } else if (q.questionType === "TRUE_FALSE") {
        const tfTrueLabel =
          (q.categoryLabels && q.categoryLabels[0]) || "Benar";
        const tfFalseLabel =
          (q.categoryLabels && q.categoryLabels[1]) || "Salah";
        questionsHtmlStr += `
            <div class="printable-item tf-part avoid-break" style="margin-top: 6px; margin-left: 30px; margin-bottom: 14px; width: calc(100% - 30px);">
                <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 9.5pt;">
                    <thead>
                        <tr style="background-color: #f1f5f9;">
                            <th style="border: 1px solid #000; padding: 6px 10px; text-align: left; font-weight: bold;">Pernyataan</th>
                            <th style="border: 1px solid #000; padding: 6px 8px; width: 80px; text-align: center; font-weight: bold;">${tfTrueLabel}</th>
                            <th style="border: 1px solid #000; padding: 6px 8px; width: 80px; text-align: center; font-weight: bold;">${tfFalseLabel}</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        q.trueFalseRows?.forEach((row) => {
          let rText = formatQuestionHtml(row.text || "");
          if (row.chartData) {
            rText = injectChart(row.chartData, rText);
          }
          questionsHtmlStr += `
            <tr style="border-bottom: 1px solid #000;">
                <td class="html-content" style="border: 1px solid #000; padding: 6px 10px; font-weight: 500;">${rText}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">
                    <div style="width: 15px; height: 15px; border: 1.5px solid #000; border-radius: 50%; margin: 0 auto;"></div>
                </td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">
                    <div style="width: 15px; height: 15px; border: 1.5px solid #000; border-radius: 50%; margin: 0 auto;"></div>
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
        questionsHtmlStr += `
            <div class="printable-item match-part avoid-break" style="margin-top: 6px; margin-left: 30px; margin-bottom: 14px; width: calc(100% - 30px);">
                <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 9.5pt;">
                    <thead>
                        <tr style="background-color: #f1f5f9;">
                            <th style="border: 1px solid #000; padding: 6px 10px; text-align: left; font-weight: bold; width: 50%;">Pernyataan / Soal</th>
                            <th style="border: 1px solid #000; padding: 6px 10px; text-align: left; font-weight: bold; width: 50%;">Pasangan Jawaban</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        q.matchingPairs?.forEach((pair, pIdx) => {
          let leftItem = formatQuestionHtml(pair.left || "");
          if (pair.leftChart) {
            leftItem = injectChart(pair.leftChart, leftItem);
          }
          let rightItem = formatQuestionHtml(pair.right || "");
          if (pair.rightChart) {
            rightItem = injectChart(pair.rightChart, rightItem);
          }
          questionsHtmlStr += `
            <tr style="border-bottom: 1px solid #000;">
                <td class="html-content" style="border: 1px solid #000; padding: 6px 10px;">
                    <span style="font-weight: bold; margin-right: 4px;">(${pIdx + 1})</span>
                    ${leftItem}
                </td>
                <td class="html-content" style="border: 1px solid #000; padding: 6px 10px;">
                    <span style="font-weight: bold; margin-right: 4px;">(${String.fromCharCode(65 + pIdx)})</span>
                    ${rightItem}
                </td>
            </tr>
          `;
        });
        questionsHtmlStr += `
                    </tbody>
                </table>
            </div>
        `;
      } else if (q.questionType === "FILL_IN_THE_BLANK") {
        questionsHtmlStr += `
            <div style="margin-top: 6px; margin-left: 30px; margin-bottom: 12px; font-size: 10pt; font-style: italic; color: #334155;">
                Jawaban: ..........................................................................................................................................
            </div>
        `;
      } else if (q.questionType === "ESSAY") {
        questionsHtmlStr += `
            <div class="printable-item essay-part avoid-break" style="margin-top: 6px; margin-left: 30px; margin-bottom: 14px; border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; background-color: #fafafa; width: calc(100% - 30px);">
                <p style="font-size: 8.5pt; font-weight: bold; color: #475569; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 8px 0;">Lembar Jawaban / Uraian:</p>
                <div style="border-bottom: 1px dashed #94a3b8; height: 20px; margin-bottom: 8px;"></div>
                <div style="border-bottom: 1px dashed #94a3b8; height: 20px; margin-bottom: 8px;"></div>
                <div style="border-bottom: 1px dashed #94a3b8; height: 20px; margin-bottom: 8px;"></div>
                <div style="border-bottom: 1px dashed #94a3b8; height: 20px;"></div>
            </div>
        `;
      }

      questionsHtmlStr += `</div>`;
    });
    questionsHtmlStr += `</div>`;
  });

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

  let kisiKisiHtmlStr = "";
  selectedExams.forEach((exam, index) => {
    let rowsHtml = "";
    exam.questions.forEach((q, qIndex) => {
      rowsHtml += `
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${qIndex + 1}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px;">${q.kisiKisi || "-"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px;">${q.category || "-"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${q.level || "-"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; text-transform: capitalize;">${q.questionType.replace(/_/g, ' ').toLowerCase()}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${q.scoreWeight || 1}</td>
        </tr>
      `;
    });

    kisiKisiHtmlStr += `
      <div class="page-container-flow" style="page-break-after: always; break-after: page; display: flex; flex-direction: column; min-height: calc(296.5mm - (${paperMargin === "thin" ? "15mm" : paperMargin === "thick" ? "25mm" : "20mm"} * 2));">
        <div style="flex: 1; display: flex; flex-direction: column; justify-content: flex-start; width: 100%; box-sizing: border-box;">
            <div style="text-align: center; padding-bottom: 8px; margin-bottom: 16px; border-bottom: 4px solid black;">
                <p style="font-weight: 900; letter-spacing: 0.2em; font-size: 10px; color: #475569; text-transform: uppercase; margin: 0 0 4px 0;">LAMPIRAN DOKUMEN</p>
                <h1 style="font-family: serif; font-size: 20px; font-weight: 900; text-transform: uppercase; margin: 0;">KISI-KISI MATERI SOAL</h1>
                <p style="font-size: 10px; text-transform: uppercase; font-weight: bold; margin: 4px 0 0 0; color: #64748b;">MODUL ${index + 1}: ${exam.config.subject || "UMUM"}</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; font-size: 10px; font-family: 'Inter', sans-serif; margin-bottom: 24px;">
                <thead>
                    <tr style="background-color: #f1f5f9; color: #0f172a;">
                        <th style="border: 1px solid #cbd5e1; padding: 8px; width: 5%;">No</th>
                        <th style="border: 1px solid #cbd5e1; padding: 8px; width: 40%;">Materi / Kisi-Kisi</th>
                        <th style="border: 1px solid #cbd5e1; padding: 8px; width: 20%;">Kategori</th>
                        <th style="border: 1px solid #cbd5e1; padding: 8px; width: 10%;">Level</th>
                        <th style="border: 1px solid #cbd5e1; padding: 8px; width: 15%;">Jenis Soal</th>
                        <th style="border: 1px solid #cbd5e1; padding: 8px; width: 10%;">Bobot</th>
                    </tr>
                </thead>
                <tbody style="color: #334155;">
                    ${rowsHtml}
                </tbody>
            </table>
        </div>
        <div style="border-top: 1px solid #cbd5e1; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #64748b; font-family: sans-serif; margin-top: auto; width: 100%;">
            <div style="font-weight: bold; text-transform: uppercase;">KISI-KISI MATERI SOAL</div>
            <div style="font-weight: 900; letter-spacing: 0.1em;">PLATFORM UJIAN CERDAS</div>
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
                margin: ${computedPadding} !important;
            }
            @media print {
                body {
                    background: white !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
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
                    width: 100% !important;
                    max-width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    box-shadow: none !important;
                    background: white !important;
                }
                .page-container {
                    width: 100% !important;
                    height: calc(297mm - (${computedPadding} * 2)) !important;
                    min-height: calc(297mm - (${computedPadding} * 2)) !important;
                    max-height: calc(297mm - (${computedPadding} * 2)) !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    border: none !important;
                    box-sizing: border-box !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: space-between !important;
                    page-break-after: always !important;
                    break-after: page !important;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                }
                .page-cover {
                    width: 100% !important;
                    height: calc(297mm - (${computedPadding} * 2)) !important;
                    min-height: calc(297mm - (${computedPadding} * 2)) !important;
                    max-height: calc(297mm - (${computedPadding} * 2)) !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    box-sizing: border-box !important;
                    border: none !important;
                    display: flex !important;
                    flex-direction: column !important;
                    page-break-after: always !important;
                    break-after: page !important;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                    overflow: hidden !important;
                }
                .page-frame-box {
                    border: 6px double #000000 !important;
                    padding: 8mm !important;
                    box-sizing: border-box !important;
                    width: 100% !important;
                    height: 100% !important;
                    min-height: 100% !important;
                    max-height: 100% !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: space-between !important;
                }
                .page-container-flow {
                    width: 100% !important;
                    min-height: 0 !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    box-shadow: none !important;
                    border: none !important;
                    box-sizing: border-box !important;
                    page-break-after: always !important;
                    break-after: page !important;
                }
                .keys-grid {
                    grid-template-columns: repeat(5, 1fr) !important;
                }
            }
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background-color: #f1f5f9;
                color: #0f172a;
                margin: 0;
                padding: 30px 0;
                orphans: 3;
                widows: 3;
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
                min-height: 297mm;
                padding: ${computedPadding};
                box-sizing: border-box;
                background: white;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                page-break-after: always;
                break-after: page;
            }
            .page-cover {
                position: relative;
                width: 210mm;
                height: 297mm;
                min-height: 297mm;
                max-height: 297mm;
                padding: ${computedPadding};
                box-sizing: border-box;
                background: white;
                display: flex;
                flex-direction: column;
                page-break-after: always;
                break-after: page;
                overflow: hidden;
            }
            .page-frame-box {
                border: 6px double #000000;
                padding: 8mm;
                box-sizing: border-box;
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
            }
            .page-container-flow {
                position: relative;
                width: 210mm;
                min-height: 297mm;
                padding: ${computedPadding};
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
        <div class="book-canvas">
            <!-- Cover Page -->
            <div class="page-container page-cover" style="page-break-after: always; break-after: page;">
                <div class="page-frame-box">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid black; padding-bottom: 10px;">
                        <div style="border: 2px solid black; padding: 5px 12px; font-size: 11px; font-weight: 800; display: inline-block; background-color: white; line-height: 1; text-transform: uppercase;">DOKUMEN NEGARA</div>
                        <div style="text-align: center;">
                            <p style="font-family: serif; font-weight: bold; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 2px 0;">REPUBLIK INDONESIA</p>
                            <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; margin: 0; color: #0f172a; letter-spacing: 0.06em;">PLATFORM UJIAN CERDAS</p>
                        </div>
                        <div style="border: 2px solid black; padding: 5px 12px; font-size: 11px; font-weight: 800; font-style: italic; display: inline-block; background-color: white; line-height: 1; text-transform: uppercase;">SANGAT RAHASIA</div>
                    </div>

                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; margin: auto 0; padding: 16px 0;">
                        <div style="display: flex; justify-content: center; margin-bottom: 20px; width: 100%;">
                            <div style="width: 88px; height: 88px; padding: 10px; border: 3px solid black; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; background-color: white;">
                                <div style="box-sizing: border-box; width: 62px; height: 62px; border: 2px dashed black; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                                    <span style="font-family: serif; font-size: 22px; font-weight: 900; letter-spacing: -0.05em; line-height: 1.1; margin: 0;">BSR</span>
                                    <span style="font-size: 6.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; line-height: 1.1; margin: 2px 0 0 0;">SOAL RESMI</span>
                                </div>
                            </div>
                        </div>

                        <h1 style="font-family: serif; font-size: 26px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.03em; line-height: 1.25; max-width: 580px; margin: 0 0 10px 0; color: black; text-align: center;">
                            ${bookTitle}
                        </h1>
                        <p style="font-size: 12.5px; font-weight: bold; color: #475569; letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 20px 0; text-align: center;">
                            ${bookSubtitle}
                        </p>

                        <div style="width: 100%; max-width: 480px; border: 3px double black; padding: 14px 18px; background-color: white; text-align: left; box-sizing: border-box;">
                            <p style="text-align: center; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; font-size: 10.5px; border-bottom: 2px solid black; padding-bottom: 6px; margin: 0 0 10px 0;">IDENTITAS KUMPULAN SOAL</p>
                            <table style="width: 100%; font-size: 11.5px; border: none; border-collapse: collapse;">
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
                                    <td style="border: none; padding: 4px 0; text-transform: uppercase; color: #64748b; font-weight: bold;">Tahun Pelajaran</td>
                                    <td style="border: none; padding: 4px;">:</td>
                                    <td style="border: none; padding: 4px 0; font-weight: bold;">${new Date().getFullYear()} / ${new Date().getFullYear() + 1}</td>
                                </tr>
                                <tr style="border: none; border-top: 1px solid #e2e8f0;">
                                    <td style="border: none; padding: 5px 0; text-transform: uppercase; color: #64748b; font-weight: bold;">Hak Akses</td>
                                    <td style="border: none; padding: 5px;">:</td>
                                    <td style="border: none; padding: 5px 0;"><span style="font-weight: 800; font-size: 9.5px; padding: 3px 8px; border: 1px solid black; background-color: #f8fafc; display: inline-block;">GURU / PENGAWAS</span></td>
                                </tr>
                            </table>
                        </div>
                    </div>

                    <div style="border-top: 1px solid #000; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 8.5pt;">
                        <p style="font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin: 0; color: #334155;">PLATFORM UJIAN CERDAS INDONESIA</p>
                        <p style="font-weight: 600; margin: 0; color: #64748b;">Dicetak: ${new Date().toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })}</p>
                    </div>
                </div>
            </div>

            <!-- Petunjuk Umum Page -->
            <div class="page-container page-cover" style="page-break-after: always; break-after: page;">
                <div class="page-frame-box">
                    <div style="flex: 1; display: flex; flex-direction: column; justify-content: flex-start;">
                        <div style="border-bottom: 3px solid black; padding-bottom: 10px; margin-bottom: 16px; text-align: center;">
                            <h2 style="font-family: serif; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; margin: 0;">PETUNJUK UMUM</h2>
                            <p style="font-size: 9.5px; color: #64748b; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; margin: 3px 0 0 0;">PEDOMAN PELAKSANAAN UJIAN & EVALUASI BELAJAR</p>
                        </div>
                        <div style="font-size: 11.5px; line-height: 1.55; text-align: justify; color: #1e293b;">
                            <p style="font-weight: bold; color: #0f172a; margin-bottom: 10px;">Sebelum menguji atau membagikan naskah soal di dalam buku ini, mohon perhatikan pedoman penting berikut:</p>
                            <ol style="padding-left: 18px; display: flex; flex-direction: column; gap: 8px; margin: 0;">
                                <li><strong>Pembacaan Doa:</strong> Awali pelaksanaan kegiatan belajar, evaluasi, ataupun pengujian dengan berdoa bersama demi kelancaran dan kesuksesan bersama.</li>
                                <li><strong>Verifikasi Modul:</strong> Periksa kesesuaian dan kelengkapan butir soal seluruh modul materi (${selectedExams.length} Modul) sebelum didistribusikan kepada peserta didik.</li>
                                <li><strong>Pilihan Ganda:</strong> Pilihlah satu jawaban yang paling tepat dengan menyilang atau menghitamkan huruf A, B, C, D, atau E. Opsi berkarakter pendek telah disusun rapi dalam 2 kolom untuk efisiensi ruang dan keterbacaan optimal.</li>
                                <li><strong>Pilihan Ganda Kompleks:</strong> Pilihan ganda kompleks mengizinkan siswa memilih lebih dari satu jawaban yang benar dengan memberi tanda centang/silang pada kotak opsi [A], [B], [C], [D] yang sesuai.</li>
                                <li><strong>Soal Benar-Salah:</strong> Untuk soal berpola Benar atau Salah, berikan tanda silang atau centang pada lingkaran pilihan tabel pernyataan yang tersedia.</li>
                                <li><strong>Soal Menjodohkan:</strong> Pasangkan nomor pernyataan di kolom sebelah kiri dengan huruf pilihan jawaban di kolom sebelah kanan yang merupakan pasangan tepat.</li>
                                <li><strong>Soal Isian Singkat:</strong> Tuliskan jawaban singkat, lugas, dan terarah pada baris titik-titik yang disediakan.</li>
                                <li><strong>Soal Uraian / Esai:</strong> Gunakan lembar garis pengerjaan di bawah butir soal esai untuk menjabarkan rincian rumus, hitungan, atau argumen tulisan tangan secara rapi.</li>
                                <li><strong>Kunci Jawaban Resmi:</strong> Kunci jawaban resmi terlampir pada halaman penutup dokumen ini. Pisahkan lembar kunci jawaban sebelum naskah dibagikan kepada peserta ujian.</li>
                                <li><strong>Kisi-Kisi Materi:</strong> Lampiran kisi-kisi dan level kognitif terlampir di lembar akhir untuk keperluan arsip penilaian dan rekapitulasi guru.</li>
                            </ol>
                        </div>
                    </div>
                    
                    <div style="margin-top: 16px;">
                        <div style="border-top: 2px solid #000; padding-top: 8px; text-align: center; font-size: 10px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase;">PRESTASI PENTING &bull; JUJUR YANG UTAMA</div>
                    </div>
                </div>
            </div>

            <!-- Materi Soal Ujian -->
            ${questionsHtmlStr}

            <!-- Kunci Jawaban Page -->
            ${answerKeyHtmlStr}

            <!-- Kisi Kisi Page -->
            ${kisiKisiHtmlStr}
        </div>

        <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
        <script>
            ${chartScripts}
        </script>
        <script>
            const checkAndRun = () => {
                const images = Array.from(document.images);
                const isLoaded = images.every(img => img.complete);
                if (!isLoaded) {
                    setTimeout(checkAndRun, 100);
                    return;
                }
                
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
                
                setTimeout(() => {
                    window.print();
                }, 500);
            };
            setTimeout(checkAndRun, 500);
        </script>
    </body>
    </html>
    `;
};
