import { Question, ChartData, CartesianConfig, ChartDataset } from "../types";

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
 * Ensures cartesian chart data is strictly valid and has complete config & datasets
 */
export function sanitizeCartesianChartData(chart: ChartData, contextText?: string): ChartData {
  const safeConfig: CartesianConfig = {
    xMin: -6,
    xMax: 6,
    yMin: -6,
    yMax: 10,
    xStep: 1,
    yStep: 1,
    showGrid: true,
    showAxisNumbers: true,
    ...(chart.cartesianConfig || {}),
  };

  const safeDatasets: ChartDataset[] = (chart.datasets || []).map((ds, idx) => {
    const rawKind = ds.kind || (ds.isFunction ? "function" : ds.isPolygon ? "polygon" : ds.isCircle ? "circle" : ds.showLine ? "line" : "point");
    let kind: "function" | "point" | "line" | "polygon" | "circle" = "point";
    if (rawKind === "function" || ds.functionStr || ds.isFunction) kind = "function";
    else if (rawKind === "polygon" || ds.isPolygon) kind = "polygon";
    else if (rawKind === "circle" || ds.isCircle) kind = "circle";
    else if (rawKind === "line" || ds.showLine) kind = "line";

    let rawData = ds.data || [];
    if (!Array.isArray(rawData) && typeof rawData === "object") {
      rawData = Object.values(rawData);
    }

    const safePoints = (rawData || []).map((pt: any) => {
      if (pt && typeof pt === "object" && ("x" in pt || "y" in pt)) {
        return {
          x: typeof pt.x === "number" ? pt.x : parseFloat(pt.x) || 0,
          y: typeof pt.y === "number" ? pt.y : parseFloat(pt.y) || 0,
          label: pt.label || undefined,
          pointStyle: pt.pointStyle || "solid",
          color: pt.color || undefined,
        };
      }
      return { x: 0, y: 0, label: String(pt) };
    });

    const isFunc = kind === "function" || !!ds.functionStr;
    const isPoly = kind === "polygon";
    const isCirc = kind === "circle";

    const defaultColors = ["#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed"];
    const themeColor = ds.backgroundColor?.[0] || ds.borderColor?.[0] || defaultColors[idx % defaultColors.length];

    return {
      label: ds.label || (isFunc ? `f(x) = ${ds.functionStr || "x^2"}` : isPoly ? "Poligon" : isCirc ? "Lingkaran" : `Elemen ${idx + 1}`),
      kind,
      isFunction: isFunc,
      functionStr: ds.functionStr || (isFunc ? "x^2 - 2*x - 3" : undefined),
      domainMin: typeof ds.domainMin === "number" ? ds.domainMin : undefined,
      domainMax: typeof ds.domainMax === "number" ? ds.domainMax : undefined,
      isPolygon: isPoly,
      isCircle: isCirc,
      circleRadius: typeof ds.circleRadius === "number" ? ds.circleRadius : isCirc ? 4 : undefined,
      fillColor: ds.fillColor || (isPoly ? `${themeColor}33` : isCirc ? `${themeColor}22` : undefined),
      lineStyle: ds.lineStyle || "solid",
      lineWidth: typeof ds.lineWidth === "number" ? ds.lineWidth : 2.5,
      showLine: isFunc || kind === "line" || ds.showLine === true,
      showArrows: ds.showArrows ?? (kind === "line"),
      backgroundColor: ds.backgroundColor || [themeColor],
      borderColor: ds.borderColor || [themeColor],
      data: safePoints,
    };
  });

  return {
    type: "cartesian",
    title: chart.title || "Bidang Koordinat Kartesius",
    labels: chart.labels && chart.labels.length > 0 ? chart.labels : ["X", "Y"],
    cartesianConfig: safeConfig,
    datasets: safeDatasets.length > 0 ? safeDatasets : [
      {
        label: "f(x) = x^2 - 2*x - 3",
        kind: "function",
        isFunction: true,
        functionStr: "x^2 - 2*x - 3",
        backgroundColor: ["#2563eb"],
        borderColor: ["#2563eb"],
        lineWidth: 2.5,
        showLine: true,
        data: [],
      },
    ],
  };
}

/**
 * Inspects questions and repairs any missing chartData or unresolved [CHART] tags.
 * If a question references a chart or contains [CHART], this ensures chartData is fully populated
 * and the placeholder is rendered cleanly.
 */
export function repairQuestionCharts(questions: Question[]): Question[] {
  return questions.map((q) => {
    const rawText = q.questionText || "";
    const lowerContext = (rawText + " " + (q.category || "") + " " + (q.kisiKisi || "") + " " + (q.explanation || "")).toLowerCase();

    const isCartesianTopic = /(fungsi\s+kuadrat|titik\s+puncak|sumbu\s+simetri|parabola|persamaan\s+kuadrat|persamaan\s+garis|garis\s+lurus|gradien|koordinat\s+kartesius|bidang\s+kartesius|diagram\s+kartesius|kuadran)/i.test(
      lowerContext
    );
    const mentionsGrafik = /(grafik|kurva|gambar\s+berikut|diagram|koordinat)/i.test(lowerContext);
    const hasChartTag = /\\?\[(CHART|DIAGRAM|GRAFIK).*?\\?\]/i.test(rawText) || rawText.includes('data-chart="true"');
    const mentionsChartNarrative = /(diagram\s+(batang|garis|lingkaran|venn|kartesius)|grafik\s+berikut|tabel\s+frekuensi)/i.test(rawText);

    // If it's a cartesian topic with graphic stimulus, or question has chart
    if (hasChartTag || mentionsChartNarrative || (isCartesianTopic && mentionsGrafik) || (q.chartData && q.chartData.type !== "cartesian" && isCartesianTopic)) {
      let validChartData = q.chartData;
      
      const isInvalidCartesian = isCartesianTopic && (!validChartData || validChartData.type !== "cartesian" || !validChartData.datasets || validChartData.datasets.length === 0);
      const isChartDataEmpty = !validChartData || !validChartData.type || (validChartData.type !== "cartesian" && (!validChartData.labels || validChartData.labels.length === 0 || !validChartData.datasets || validChartData.datasets.length === 0));

      if (isInvalidCartesian || isChartDataEmpty) {
        validChartData = synthesizeContextualChartData(rawText, q.category, q.kisiKisi, q.explanation, q.options);
      } else if (validChartData && validChartData.type === "cartesian") {
        validChartData = sanitizeCartesianChartData(validChartData, rawText);
      }

      // Ensure [CHART] placeholder exists in questionText
      let cleanedText = normalizeChartPlaceholdersInHtml(rawText);
      if (!cleanedText.includes('data-chart="true"')) {
        const colonIndex = cleanedText.indexOf(":");
        if (colonIndex !== -1 && colonIndex < 250) {
          cleanedText = cleanedText.slice(0, colonIndex + 1) + CHART_PLACEHOLDER_HTML + cleanedText.slice(colonIndex + 1);
        } else {
          cleanedText = CHART_PLACEHOLDER_HTML + cleanedText;
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
export function synthesizeContextualChartData(
  text: string,
  category?: string,
  kisiKisi?: string,
  explanation?: string,
  options?: string[]
): ChartData {
  const combined = `${text || ""} ${category || ""} ${kisiKisi || ""} ${explanation || ""} ${(options || []).join(" ")}`;
  const lower = combined.toLowerCase();

  // Scenario 0: Fungsi Kuadrat / Parabola / Titik Puncak / Sumbu Simetri
  if (
    lower.includes("fungsi kuadrat") ||
    lower.includes("titik puncak") ||
    lower.includes("sumbu simetri") ||
    lower.includes("parabola") ||
    lower.includes("persamaan kuadrat")
  ) {
    // Coba ekstrak formula persamaan kuadrat dari teks jika ada
    let functionStr = "x^2 - 2*x - 3";
    let label = "f(x) = x² - 2x - 3";
    let peakX = 1;
    let peakY = -4;
    let xMin = -6;
    let xMax = 6;
    let yMin = -6;
    let yMax = 10;

    // Pattern A: f(x) = ax^2 + bx + c or y = ax^2 + bx + c
    const quadMatch = combined.match(/(?:f\(x\)|y)\s*=\s*([+-]?\s*\d*(?:\.\d+)?)\s*\*?\s*x\^?2\s*([+-]\s*\d*(?:\.\d+)?\s*\*?\s*x)?\s*([+-]\s*\d+(?:\.\d+)?)?/i);
    if (quadMatch) {
      let rawA = (quadMatch[1] || "1").replace(/\s+/g, "");
      if (rawA === "" || rawA === "+") rawA = "1";
      if (rawA === "-") rawA = "-1";
      const a = parseFloat(rawA) || 1;

      let rawB = (quadMatch[2] || "").replace(/[*x\s+]/gi, "");
      if (quadMatch[2] && quadMatch[2].includes("-") && !rawB.startsWith("-")) rawB = `-${rawB}`;
      if (quadMatch[2] && (rawB === "" || rawB === "+")) rawB = "1";
      if (quadMatch[2] && rawB === "-") rawB = "-1";
      const b = rawB ? parseFloat(rawB) || 0 : 0;

      const rawC = (quadMatch[3] || "").replace(/\s+/g, "");
      const c = rawC ? parseFloat(rawC) || 0 : 0;

      if (!isNaN(a) && a !== 0) {
        peakX = -b / (2 * a);
        peakY = a * peakX * peakX + b * peakX + c;
        
        const bStr = b > 0 ? ` + ${b === 1 ? '' : b}*x` : b < 0 ? ` - ${Math.abs(b) === 1 ? '' : Math.abs(b)}*x` : "";
        const cStr = c > 0 ? ` + ${c}` : c < 0 ? ` - ${Math.abs(c)}` : "";
        functionStr = `${a === 1 ? '' : a === -1 ? '-' : `${a}*`}x^2${bStr}${cStr}`;
        label = `f(x) = ${a === 1 ? '' : a === -1 ? '-' : a}x²${b > 0 ? ` + ${b === 1 ? '' : b}x` : b < 0 ? ` - ${Math.abs(b) === 1 ? '' : Math.abs(b)}x` : ''}${c > 0 ? ` + ${c}` : c < 0 ? ` - ${Math.abs(c)}` : ''}`;

        xMin = Math.min(-6, Math.floor(peakX - 5));
        xMax = Math.max(6, Math.ceil(peakX + 5));
        yMin = Math.min(-6, Math.floor(peakY - 4));
        yMax = Math.max(10, Math.ceil(peakY + 6));
      }
    }

    // Pattern B: Titik Puncak eksplisit dalam teks P(xp, yp)
    const peakMatch = combined.match(/(?:titik\s+puncak|koordinat\s+puncak|vertex)\s*(?:adalah|yaitu|=|:)?\s*\(?([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)\)?/i) ||
                      combined.match(/P\s*\(\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)\s*\)/i);
    if (peakMatch && (!quadMatch || !quadMatch[1])) {
      peakX = parseFloat(peakMatch[1]) || 1;
      peakY = parseFloat(peakMatch[2]) || -4;
      // Synthesize quadratic from vertex: f(x) = (x - peakX)^2 + peakY
      functionStr = `(x - ${peakX})^2 + (${peakY})`;
      label = `f(x) = (x - ${peakX})² + (${peakY})`;
      xMin = Math.min(-6, Math.floor(peakX - 5));
      xMax = Math.max(6, Math.ceil(peakX + 5));
      yMin = Math.min(-6, Math.floor(peakY - 4));
      yMax = Math.max(10, Math.ceil(peakY + 6));
    }

    return {
      type: "cartesian",
      title: "Grafik Fungsi Kuadrat f(x)",
      labels: ["X", "Y"],
      cartesianConfig: {
        xMin,
        xMax,
        yMin,
        yMax,
        xStep: 1,
        yStep: 1,
        showGrid: true,
        showAxisNumbers: true,
      },
      datasets: [
        {
          label,
          kind: "function",
          isFunction: true,
          functionStr,
          backgroundColor: ["#2563eb"],
          borderColor: ["#2563eb"],
          lineWidth: 2.5,
          showLine: true,
          data: [],
        },
        {
          label: `Titik Puncak P(${peakX}, ${peakY})`,
          kind: "point",
          backgroundColor: ["#dc2626"],
          borderColor: ["#dc2626"],
          showLine: false,
          data: [
            { x: peakX, y: peakY, label: `P(${peakX}, ${peakY})`, pointStyle: "solid" },
          ],
        },
      ],
    };
  }

  // Scenario 0.5: Fungsi Linear / Persamaan Garis / Koordinat Titik / Poligon Kartesius
  if (
    lower.includes("fungsi linear") ||
    lower.includes("persamaan garis") ||
    lower.includes("gradien") ||
    lower.includes("kartesius") ||
    lower.includes("koordinat") ||
    lower.includes("kuadran")
  ) {
    return {
      type: "cartesian",
      title: "Bidang Koordinat Kartesius",
      labels: ["X", "Y"],
      cartesianConfig: {
        xMin: -6,
        xMax: 8,
        yMin: -6,
        yMax: 8,
        xStep: 1,
        yStep: 1,
        showGrid: true,
        showAxisNumbers: true,
      },
      datasets: [
        {
          label: "Garis g: 2x - y = 4",
          kind: "function",
          isFunction: true,
          functionStr: "2*x - 4",
          backgroundColor: ["#2563eb"],
          borderColor: ["#2563eb"],
          lineWidth: 2.5,
          showLine: true,
          data: [],
        },
        {
          label: "Titik Potong",
          kind: "point",
          backgroundColor: ["#dc2626"],
          borderColor: ["#dc2626"],
          showLine: false,
          data: [
            { x: 2, y: 0, label: "(2,0)", pointStyle: "solid" },
            { x: 0, y: -4, label: "(0,-4)", pointStyle: "solid" },
          ],
        },
      ],
    };
  }

  // Scenario 1: Days of week / penjualan harian (e.g., Pak Bondan beras)
  if (lower.includes("hari") || lower.includes("senin") || lower.includes("rabu") || lower.includes("penjualan")) {
    return {
      type: "bar",
      title: "Diagram Batang Penjualan Harian",
      labels: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      datasets: [
        {
          label: "Jumlah Penjualan",
          data: ["16", "20", "28", "22", "30"],
        },
      ],
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
          data: ["35", "25", "20", "20"],
        },
      ],
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
          data: ["36.5", "37.0", "38.2", "37.8", "36.8"],
        },
      ],
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
        data: ["15", "25", "20", "30"],
      },
    ],
  };
}

