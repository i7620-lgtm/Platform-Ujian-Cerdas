import { Question, ChartData } from "../types";

export const CHART_PLACEHOLDER_HTML = `<br/><span class="chart-placeholder" contenteditable="false" data-chart="true" style="display: block; width: 100%; max-width: 600px; min-height: 100px; padding: 10px; background: #f8fafc; border: 2px dashed #cbd5e1; text-align: center; border-radius: 8px; margin: 10px auto; color: #475569; font-weight: bold; cursor: pointer;"><span class="chart-placeholder-text" style="display: block; padding: 40px 0;">📊 Diagram (Klik untuk mengedit)</span></span><br/>`;

export const CHART_PLACEHOLDER_INLINE = `<span class="chart-placeholder" contenteditable="false" data-chart="true" style="display: block; width: 100%; max-width: 600px; min-height: 100px; padding: 10px; background: #f8fafc; border: 2px dashed #cbd5e1; text-align: center; border-radius: 8px; margin: 10px auto; color: #475569; font-weight: bold; cursor: pointer;"><span class="chart-placeholder-text" style="display: block; padding: 40px 0;">📊 Diagram (Klik untuk mengedit)</span></span>`;

/**
 * Normalizes any raw [CHART], [DIAGRAM], [GRAFIK] tags in HTML to standard data-chart elements.
 */
export function normalizeChartPlaceholdersInHtml(html: string): string {
  if (!html) return "";
  return html.replace(/(?:<p>)?\s*\\?\[(CHART|DIAGRAM|GRAFIK).*?\\?\]\s*(?:<\/p>)?/gi, CHART_PLACEHOLDER_HTML);
}

/**
 * Inspects questions and repairs any missing chartData or unresolved [CHART] tags.
 * If a question references a chart or contains [CHART], this ensures chartData is fully populated
 * and the placeholder is rendered cleanly.
 */
export function repairQuestionCharts(questions: Question[]): Question[] {
  return questions.map((q) => {
    const rawText = q.questionText || "";
    const hasChartTag = /\\?\[(CHART|DIAGRAM|GRAFIK).*?\\?\]/i.test(rawText) || rawText.includes('data-chart="true"');
    const mentionsChartNarrative = /(diagram\s+(batang|garis|lingkaran|venn)|grafik\s+berikut|tabel\s+frekuensi)/i.test(rawText);

    // If question has a chart tag or refers to a chart
    if (hasChartTag || mentionsChartNarrative) {
      // 1. Ensure chartData is valid and not empty
      let validChartData = q.chartData;
      const isChartDataEmpty = !validChartData ||
        !validChartData.labels ||
        validChartData.labels.length === 0 ||
        !validChartData.datasets ||
        validChartData.datasets.length === 0 ||
        !validChartData.datasets[0].data ||
        validChartData.datasets[0].data.length === 0;

      if (isChartDataEmpty) {
        validChartData = synthesizeContextualChartData(rawText, q.category, q.kisiKisi);
      }

      // 2. Replace any raw [CHART] tags with interactive placeholder
      let cleanedText = normalizeChartPlaceholdersInHtml(rawText);

      // If narrative mentions chart but neither tag nor placeholder exists, inject at appropriate position
      if (!cleanedText.includes('data-chart="true"')) {
        const colonIndex = cleanedText.indexOf(":");
        if (colonIndex !== -1 && colonIndex < 250) {
          cleanedText = cleanedText.slice(0, colonIndex + 1) + CHART_PLACEHOLDER_HTML + cleanedText.slice(colonIndex + 1);
        } else {
          cleanedText += CHART_PLACEHOLDER_HTML;
        }
      }

      return {
        ...q,
        chartData: validChartData,
        questionText: cleanedText,
      };
    }

    return q;
  });
}

/**
 * Synthesizes a realistic, contextual chart structure when AI outputs [CHART] but omits chartData.
 */
export function synthesizeContextualChartData(text: string, category?: string, kisiKisi?: string): ChartData {
  const lower = (text + " " + (category || "") + " " + (kisiKisi || "")).toLowerCase();

  // Scenario 1: Days of week / penjualan harian (e.g., Pak Bondan beras)
  if (lower.includes("hari") || lower.includes("senin") || lower.includes("rabu") || lower.includes("penjualan")) {
    return {
      type: "bar",
      title: "Diagram Batang Penjualan Harian",
      labels: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      datasets: [
        {
          label: "Jumlah Penjualan",
          data: ["16", "20", "28", "22", "30"]
        }
      ]
    };
  }

  // Scenario 2: Pie / Persentase / Ekstrakurikuler / Hobi / Pekerjaan
  if (lower.includes("lingkaran") || lower.includes("pie") || lower.includes("persen") || lower.includes("ekstrakurikuler")) {
    return {
      type: "pie",
      title: "Diagram Lingkaran Distribusi Data",
      labels: ["Kategori A", "Kategori B", "Kategori C", "Kategori D"],
      datasets: [
        {
          label: "Persentase (%)",
          data: ["35", "25", "20", "20"]
        }
      ]
    };
  }

  // Scenario 3: Line / Pertumbuhan / Suhu / Waktu
  if (lower.includes("garis") || lower.includes("suhu") || lower.includes("pertumbuhan") || lower.includes("waktu")) {
    return {
      type: "line",
      title: "Diagram Garis Perkembangan Data",
      labels: ["06.00", "08.00", "10.00", "12.00", "14.00"],
      datasets: [
        {
          label: "Nilai Pengukuran",
          data: ["36.5", "37.0", "38.2", "37.8", "36.8"]
        }
      ]
    };
  }

  // Default clean bar chart
  return {
    type: "bar",
    title: "Diagram Batang Data Analisis",
    labels: ["Kelompok 1", "Kelompok 2", "Kelompok 3", "Kelompok 4"],
    datasets: [
      {
        label: "Frekuensi Data",
        data: ["15", "25", "20", "30"]
      }
    ]
  };
}
