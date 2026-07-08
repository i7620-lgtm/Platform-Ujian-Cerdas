import { GoogleGenAI, Type } from "@google/genai";
import { Question, QuizConfig, QuestionType, ChartData } from "../types";
import { markdownToHtml, normalize, parseList, isAnswerMatch } from "../components/teacher/examUtils";
import { generateGeometrySVG, extractNum } from "../components/teacher/geometryUtils";

export async function generateQuestions(config: QuizConfig): Promise<Question[]> {
    const systemInstruction = `
    Anda adalah asisten pembuat soal ujian profesional.
    Tugas Anda adalah membuat soal berkualitas tinggi berdasarkan parameter yang diberikan.
    
    ATURAN FORMAT:
    - Gunakan format Markdown secara maksimal pada teks pertanyaan.
    - Gunakan tabel Markdown jika diperlukan untuk menyajikan data. WAJIB tambahkan baris kosong (\\n\\n) sebelum dan sesudah tabel.
    - Gunakan bullet points atau numbering untuk daftar.
    - Gunakan LaTeX untuk rumus matematika (gunakan $...$ untuk inline dan $$...$$ untuk block equation). PENTING: Karena ini adalah string JSON, Anda WAJIB menggunakan double-backslash ganda untuk escape command LaTeX, contoh: $\\\\frac{1}{2}$ atau $\\\\sqrt{x}$. KHUSUS untuk akar (square root/roots), Anda WAJIB menggunakan perintah $\\\\sqrt{...}$ atau $\\\\sqrt[n]{...}$ dan DILARANG menggunakan karakter unicode akar (√) secara langsung. DILARANG menggunakan karakter pangkat (seperti x^2) atau simbol matematika lainnya tanpa dibungkus LaTeX. Anda WAJIB menggunakan format LaTeX ($...$) secara KONSISTEN pada SELURUH opsi jawaban ('options'), pernyataan, maupun narasi jika memuat persamaan, polinomial, pecahan, akar, atau pangkat! Jika relevan, Anda juga WAJIB menggunakan standar LaTeX untuk matriks (nxn, nx1, 1xn), limit ($\\\\lim$), logaritma ($\\\\log$), permutasi (contoh: $_{n}P_{r}$), kombinasi ($_{n}C_{r}$), jenis kurung berbatas (\\\\left( \\\\right), dll), vektor kolom, nilai mutlak (\\\\left| \\\\right|), fungsi piecewise (\\\\begin{cases} \\\\end{cases}), irisan (\\\\cap), turunan (\\\\frac{dy}{dx}) dan gabungan himpunan (\\\\cup). Contoh opsi jawaban yang benar: "$x^2 + 2x + 1$" atau "$\\\\sqrt{x^2 + y^2}$".
    - Turus & Tabel Frekuensi (Tally Marks): WAJIB menggunakan huruf kapital 'I' (bukan simbol pipe '|') untuk turus satuan agar tabel Markdown tidak pecah. Gunakan 'I' (1), 'II' (2), 'III' (3), 'IIII' (4), dan '卌' (5). Untuk angka lebih dari 5, gabungkan kelipatan 5 dengan sisa satuan (pisahkan dengan spasi). Contoh: 6 = '卌 I', 7 = '卌 II', 10 = '卌 卌', 13 = '卌 卌 III'. Jika instruksi meminta "tabel turus saja" ATAU "tabel frekuensi saja", Anda WAJIB mematuhi permintaan tersebut dengan hanya membuat kolom yang spesifik diminta (misal hanya kolom data dan kolom turus, ATAU hanya kolom data dan kolom frekuensi). JANGAN secara otomatis menggabungkan kolom Turus dan Frekuensi menjadi satu tabel jika tidak diminta secara eksplisit. JANGAN menggunakan gambar untuk turus, gunakan teks ini saja.
    - Piktogram (Simbol/Emoji): Untuk soal yang membutuhkan data piktogram (diagram gambar), Anda BISA dan DISARANKAN untuk menggunakan emoji langsung (misalnya: 🍎, 🚗, ⭐️, 👦) dalam tabel atau teks soal untuk mewakili unit data.
    - Bangun Datar & Ruang: JIKA SOAL MEMINTA MENGHITUNG TEHADAP SEBUAH "GAMBAR BANGUN RUANG" ATAU "GAMBAR BANGUN DATAR", Anda WAJIB MENAMPILKAN GAMBAR tersebut menggunakan tag [GEOMETRY:shape_name:{"label_key":"label_value"}]. JANGAN hanya mendeskripsikan ukurannya dalam bentuk teks (misal: "Sebuah balok memiliki ukuran panjang 12 cm..."). Anda WAJIB langsung menyisipkan tag geometri ke dalam teks soal (\`questionText\`), lalu diikuti pertanyaannya. DILARANG menggunakan emoji, unicode, atau \`imageSearchKeyword\` untuk bangun ruang/datar. 
      Jika Anda diminta membuat soal "menghitung volume dari gambar bangun ruang", Anda HARUS SANGAT HARFIAH menampilkan gambar bangun ruang tersebut dan JANGAN menambahkan teks skenario yang rumit (seperti "dipotong menjadi dua bagian" atau "prisma segitiga siku-siku") kecuali secara eksplisit diminta!
      Daftar \`shape_name\` yang valid: "triangle", "square", "rectangle", "parallelogram", "kite", "rhombus", "trapezoid", "polygon", "circle", "cube", "cuboid", "cylinder", "cone", "sphere", "pyramid", "prism".
      Contoh penggunaan label JSON yang BENAR (pastikan valid JSON):
      [GEOMETRY:rectangle:{"bottom":"10 cm","right":"5 cm"}]
      [GEOMETRY:triangle:{"bottom":"8","height":"6","left":"5"}]
      [GEOMETRY:circle:{"radius":"7 cm"}]
      [GEOMETRY:cube:{"width":"5"}]
      [GEOMETRY:cuboid:{"width":"10","height":"5","depth":"4"}]
      [GEOMETRY:pyramid:{"side":"6","height":"8"}]
      Contoh Soal yang DILARANG: "Sebuah balok memiliki ukuran panjang 12 cm, lebar 5 cm, dan tinggi 8 cm. Berapakah volume bangun tersebut?"
      Contoh Soal yang BENAR: "Perhatikan gambar letak balok berikut: [GEOMETRY:cuboid:{"width":"12 cm","depth":"5 cm","height":"8 cm"}] Berapakah volume bangun ruang di atas?"
    - Diagram (Charts): JIKA SOAL ATAU OPSI MEMINTA DIAGRAM (diagram batang/garis/lingkaran/venn/relasi/kartesius), Anda WAJIB mengisi field 'chartData'. UNTUK MENEMPATKAN DIAGRAM DI POSISI TERTENTU dalam teks (\`questionText\` atau opsi), Anda WAJIB menggunakan tag [CHART]. Jika Anda tidak menggunakan tag [CHART], diagram akan otomatis dirender di bagian paling bawah teks. Khusus untuk diagram venn himpunan, gunakan 'labels' untuk nama-nama himpunan (contoh: ["A", "B"] atau ["A", "B", "C"]) dan 'datasets.data' untuk nilainya. Untuk 2 himpunan, urutan nilai adalah: [Hanya A, Hanya B, Irisan A & B, Di Luar Himpunan, Semesta]. Untuk 3 himpunan, urutan nilai adalah: [Hanya A, Hanya B, Hanya C, Irisan A&B, Irisan A&C, Irisan B&C, Irisan A&B&C, Di Luar Himpunan, Semesta]. Khusus untuk relasi/fungsi (relation), gunakan 'labels' untuk nama himpunan (contoh: ["A", "B"]). 'datasets' ke-0 berisi data anggota domain (e.g. data: ["1", "2"]). 'datasets' ke-1 berisi data anggota kodomain. 'datasets' ke-2 berisi relasi dengan format "indexDomain-indexKodomain" (contoh: ["0-1", "1-2"]). Khusus diagram kartesius (cartesian), Anda WAJIB menyertakan field 'cartesianConfig' yang berisi 'xMin', 'xMax', 'yMin', 'yMax', 'xStep', dan 'yStep'. Dan 'datasets' berisi array of object dengan 'label' (UNTUK NAMA GARIS JIKA ADA), 'showLine' (boolean), serta titiknya ATAU fungsi matematikanya. JIKA fungsi matematika, beri property 'isFunction': true and 'functionStr' (misal "x^2 - 2x + 1" atau "2x" dalam sintaks JS/Matematika dasar). JIKA titik manual, beri property 'data' berupa array of object {x: number, y: number}. Contoh 'datasets' dengan fungsi: [{"label": "Garis A", "isFunction": true, "functionStr": "x^2 + 2x"}]. Contoh 'datasets' dengan titik: [{"label": "Garis A", "showLine": true, "data": [{"x": 0, "y": 0}, {"x": 2, "y": 4}]}].
    - INSTRUKSI KHUSUS DALAM KURUNG: Jika dalam referensi materi / kisi-kisi terdapat instruksi yang diapit dengan tanda kurung biasa '()' atau kurung siku '[]' (misal: "(sertakan diagram lingkaran)", "(sertakan tabel frekuensi)", atau "[sertakan gambar...]"), Anda WAJIB mematuhinya!
      * Jika diminta tabel: Buatlah tabel menggunakan format tabel Markdown murni.
      * Jika diminta diagram/grafik: Anda WAJIB mengisi property 'chartData' sesuai jenis diagram (bar/line/pie/venn/relation).
      ${config.includeImages ? `* Jika diminta gambar/ilustrasi/foto: Karena Anda dilarang menggunakan tag <img>, Anda WAJIB mengisi property 'imageSearchKeyword' menggunakan SATU ATAU DUA KATA KUNCI BENDA SPESIFIK DALAM BAHASA INGGRIS (contoh: "cuboid", "elephant", "microscope") untuk pencarian di Wikimedia Commons. JANGAN menuliskan kalimat pengantar gambar seperti "Perhatikan gambar berikut" or "Gambar balok" ke dalam \`questionText\`. Langsung saja tulis inti pertanyaannya, karena gambar akan secara otomatis dirender di atas soal oleh sistem. JANGAN menyisipkan placeholder HTML untuk gambar.` : `* Jika diminta gambar/ilustrasi/foto: FITUR GAMBAR SEDANG DINONAKTIFKAN. ABAIKAN permintaan gambar/foto dan JANGAN menyisipkan placeholder gambar, instruksi gambar, maupun \`imageSearchKeyword\`. Sesuaikan narasinya agar tidak memerlukan gambar (misal dengan mendeskripsikan secara tekstual atau menggunakan tabel).`}
    - LARANGAN KERAS: DILARANG KERAS menyisipkan tag HTML, tag <img>, atau tag semacam <span class="chart-placeholder"> untuk tabel, gambar raster, atau ilustrasi umum. Gunakan tabel Markdown murni untuk tabel. Karena Anda AI berbasis teks, hindari membuat teks yang mutlak mengharuskan gambar raster; gunakan tabel, diagram (chartData), atau teks deskriptif sebagai gantinya, KECUALI jika diminta khusus dalam kurung.
    - PENTING (AKSARA BALI): Jika materi atau konteks soal berkaitan dengan mata pelajaran "Bahasa Bali", Anda WAJIB berinisiatif dan memutuskan secara mandiri untuk menggunakan teks Aksara Bali pada narasi soal dan/atau opsi jawaban jika dirasa relevan atau menguji kemampuan baca/tulis Aksara Bali siswa (meskipun perintah pengguna tidak memintanya secara eksplisit). Anda memiliki kemampuan native untuk menulis dan menerjemahkan teks ke Aksara Bali. Setiap kali Anda menggunakan teks Aksara Bali, WAJIB bungkus teks tersebut dengan tag HTML <span class="aksara-bali" style="font-family: 'Noto Sans Balinese', sans-serif;">teks aksara bali</span>.
    - Hindari konten dewasa, kekerasan, atau hal-hal yang tidak pantas untuk lingkungan pendidikan.
    - DILARANG KERAS memberikan penjelasan, cara penyelesaian, atau kunci jawaban di dalam teks pertanyaan (questionText). Teks pertanyaan hanya boleh berisi soal yang harus dijawab oleh siswa.
    
    ATURAN JENIS SOAL:
    - Pilihan Ganda: Wajib isi 'options' (4-5 opsi) dan 'correctAnswer' (1 jawaban benar yang sama persis dengan salah satu opsi). PENTING: Acak posisi jawaban yang benar agar tidak selalu berada di opsi pertama (A).
    - Pilihan Ganda Kompleks: Wajib isi 'options' (4-5 opsi) dan 'correctAnswer' (semua jawaban benar dipisahkan dengan "|||", contoh: "Opsi 1|||Opsi 2", harus sama persis dengan opsi). Acak posisi jawaban yang benar.
    - Uraian Singkat: Wajib isi 'correctAnswer' dengan jawaban padat dan jelas.
    - Esai: Wajib isi 'correctAnswer' dengan jawaban yang diharapkan.
    - Benar/Salah: Wajib isi 'trueFalseRows' berupa array of objects { "text": "pernyataan", "answer": true/false }. Buat 3-5 pernyataan.
    - Menjodohkan: Wajib isi 'matchingPairs' berupa array of objects { "left": "item kiri", "right": "pasangan kanan" }. Buat 3-5 pasangan.
    
    RESPON:
    - Berikan respon dalam format JSON array.
    - Pastikan JSON valid dan sesuai dengan schema yang diminta.
    - WAJIB mengisi field 'correctAnswer' untuk semua jenis soal kecuali INFO.
  `;

  const prompt = `
    Buatlah ${config.count} soal ${config.type} untuk mata pelajaran/materi: ${config.subject}.
    Tingkat kognitif (Bloom Revisi) secara umum: ${config.difficulty}.
    Kisi-kisi / Indikator Soal: ${config.blueprint}.
    
    PENGATURAN TINGKAT KESULITAN & INDIKATOR:
    Anda WAJIB membaca dan menerapkan deskripsi spesifik mengenai tingkat kesulitan, konteks, dan indikator soal yang dijabarkan dalam "Kisi-kisi / Indikator Soal" di atas.
    JANGAN hanya mengandalkan label "Tingkat kognitif", melainkan jadikan "Kisi-kisi / Indikator Soal" sebagai panduan UTAMA tingkat kesulitan teknis ujian ini. Jika kisi-kisi meminta soal yang panjang, mengecoh, analisis mendalam, penalaran matematis, atau HOTS berbasis kasus, pastikan soal yang dibuat benar-benar mencerminkan tingkat kerumitan tersebut.

    PENTING: Pastikan urutan dan jenis soal yang dihasilkan sesuai dengan urutan materi/kisi-kisi yang diberikan. Jangan mengacak urutan soal secara sembarangan.
  `;

  const chartDataSchema = {
    type: Type.OBJECT,
    properties: {
      type: { type: Type.STRING, enum: ["bar", "line", "pie", "venn", "relation"] },
      title: { type: Type.STRING },
      labels: { type: Type.ARRAY, items: { type: Type.STRING } },
      datasets: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            label: { type: Type.STRING },
            data: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["label", "data"]
        }
      }
    },
    required: ["type", "labels", "datasets"],
    description: "Data untuk membuat diagram (batang, garis, lingkaran, venn, atau relasi)"
  };

  const properties = {
    id: { type: Type.STRING, description: "ID unik untuk soal" },
    questionText: { type: Type.STRING, description: "Teks pertanyaan dalam format Markdown" },
    options: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Opsi jawaban (hanya untuk PG/PG Kompleks)"
    },
    optionCharts: {
      type: Type.ARRAY,
      items: chartDataSchema,
      description: "Data diagram untuk setiap opsi jawaban (opsional, urutan harus sesuai dengan options)"
    },
    correctAnswer: { type: Type.STRING, description: "Jawaban benar. WAJIB diisi untuk semua jenis soal kecuali INFO. Untuk PG/PG Kompleks, harus sama persis dengan teks di options." },
    correctAnswerChart: {
      ...chartDataSchema,
      description: "Data diagram untuk jawaban benar (opsional, berguna untuk soal isian/esai)"
    },
    scoreWeight: { type: Type.NUMBER, description: "Bobot nilai soal" },
    trueFalseRows: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          answer: { type: Type.BOOLEAN },
          chartData: chartDataSchema
        },
        required: ["text", "answer"]
      },
      description: "Baris pernyataan untuk soal Benar/Salah"
    },
    matchingPairs: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          left: { type: Type.STRING },
          right: { type: Type.STRING },
          leftChart: chartDataSchema,
          rightChart: chartDataSchema
        },
        required: ["left", "right"]
      },
      description: "Pasangan untuk soal Menjodohkan"
    },
    chartData: chartDataSchema,
    imageSearchKeyword: { 
      type: Type.STRING, 
      description: config.includeImages 
        ? "WAJIB diisi jika instruksi meminta gambar/foto ilustrasi. Berisi 1-2 kata kunci bahasa Inggris spesifik (contoh: 'cuboid rectangle') untuk mencari gambar dari Wikimedia Commons." 
        : "FITUR GAMBAR NONAKTIF. Abaikan field ini." 
    }
  };

  const combinedText = `${config.difficulty || ''} ${config.subject || ''} ${config.blueprint || ''}`.toUpperCase();
  
  // Deteksi Level untuk prioritas model
  const diffText = (config.difficulty || '').trim().toUpperCase();
  const isLevel6 = combinedText.includes('C6') || combinedText.includes('LEVEL 6') || diffText === '6';
  const isLevel3To5 = combinedText.includes('C3') || combinedText.includes('C4') || combinedText.includes('C5') || 
                      combinedText.includes('LEVEL 3') || combinedText.includes('LEVEL 4') || combinedText.includes('LEVEL 5') ||
                      combinedText.includes('HOTS') || combinedText.includes('SULIT') ||
                      /^(3|4|5)$/.test(diffText);
                      
  const hasSpecificInstructions = (config.blueprint || '').includes('(') || (config.blueprint || '').includes('[');
  
  let modelsToTry: string[] = [];
  if (isLevel6) {
      modelsToTry = ['gemini-3.1-pro-preview', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];
  } else if (isLevel3To5) {
      modelsToTry = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview'];
  } else if (hasSpecificInstructions) {
      modelsToTry = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview'];
  } else {
      modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.1-pro-preview'];
  }

  let responseText: string | null = null;
  let lastError: unknown = null;

  try {
      const res = await fetch("/api/generate-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, systemInstruction, modelsToTry, properties })
      });
      const data = await res.json();
      if (!data.success) {
          throw new Error(data.error || "Failed to generate questions");
      }
      responseText = data.text;
  } catch (error) {
      console.error("API call failed:", error);
      lastError = error;
  }

  if (lastError && !responseText) {
      console.error("Semua opsi model gagal. Error terakhir:", lastError);
      const err = lastError as Error & { status?: number };
      const errorMessage = err?.message?.toLowerCase() || "";
      if (err?.status === 429 || errorMessage.includes('quota') || errorMessage.includes('exhausted') || errorMessage.includes('429')) {
        if (errorMessage.includes('per minute') && errorMessage.includes('requests')) {
            throw new Error("QUOTA_EXCEEDED_MINUTE");
        }
        if (errorMessage.includes('per day')) {
            throw new Error("QUOTA_EXCEEDED_DAY");
        }
        if (errorMessage.includes('tokens')) {
            throw new Error("QUOTA_EXCEEDED_TOKENS");
        }
        throw new Error("QUOTA_EXCEEDED_GENERAL");
      }
      throw new Error(`API Error: ${err?.message || "Terjadi kesalahan jaringan/server."}`);
  }

  if (!responseText) {
      throw new Error("Gagal mendapatkan respons dari AI setelah mencoba berbagai model.");
  }

  try {
    const questions: {
      id: string;
      questionText: string;
      options?: string[];
      optionCharts?: (ChartData | null)[];
      correctAnswer?: string;
      correctAnswerChart?: ChartData;
      trueFalseRows?: { text: string; answer: boolean; chartData?: ChartData }[];
      matchingPairs?: { left: string; right: string; leftChart?: ChartData; rightChart?: ChartData }[];
      chartData?: ChartData;
      scoreWeight?: number;
      imageSearchKeyword?: string;
    }[] = JSON.parse(responseText || "[]");

    // Map questionType based on config.type
    let mappedQuestionType: QuestionType = 'ESSAY';
    if (config.type.toLowerCase().includes('pilihan ganda kompleks')) {
        mappedQuestionType = 'COMPLEX_MULTIPLE_CHOICE';
    } else if (config.type.toLowerCase().includes('pilihan ganda')) {
        mappedQuestionType = 'MULTIPLE_CHOICE';
    } else if (config.type.toLowerCase().includes('benar/salah') || config.type.toLowerCase().includes('benar salah')) {
        mappedQuestionType = 'TRUE_FALSE';
    } else if (config.type.toLowerCase().includes('menjodohkan')) {
        mappedQuestionType = 'MATCHING';
    } else if (config.type.toLowerCase().includes('uraian singkat') || config.type.toLowerCase().includes('isian')) {
        mappedQuestionType = 'FILL_IN_THE_BLANK';
    }

    const replaceGeometryPlaceholders = (text: string) => {
        if (!text) return text;
        return text.replace(/\[GEOMETRY:([a-zA-Z0-9_-]+):(\{.*?\})\]/g, (match, shape, labelsJson) => {
            try {
                const labels = JSON.parse(labelsJson);
                const svgContent = generateGeometrySVG(shape, labels, "#e2e8f0", "#0f172a", false, true, true);
                return `<span class="geometry-shape" contenteditable="false" style="display: inline-block; vertical-align: middle; margin: 0 0.5rem; text-align: center; line-height: 1;">${svgContent}</span>`;
            } catch (e) {
                console.error("Failed to parse geometry labels:", e);
                return match;
            }
        });
    };

    const replaceChartPlaceholders = (text: string, hasChart: boolean) => {
        if (!text || !hasChart) return text;
        const CHART_PLACEHOLDER_HTML = `<br/><span class="chart-placeholder" contenteditable="false" data-chart="true" style="display: block; width: 100%; max-width: 600px; min-height: 100px; padding: 10px; background: #f8fafc; border: 2px dashed #cbd5e1; text-align: center; border-radius: 8px; margin: 10px auto; color: #475569; font-weight: bold; cursor: pointer;"><span class="chart-placeholder-text" style="display: block; padding: 40px 0;">📊 Diagram (Klik untuk mengedit)</span></span><br/>`;
        
        // Match [CHART], [DIAGRAM ...], etc. even if escaped
        if (/\\?\[(CHART|DIAGRAM|GAMBAR).*?\\?\]/i.test(text)) {
            return text.replace(/\\?\[(CHART|DIAGRAM|GAMBAR).*?\\?\]/gi, CHART_PLACEHOLDER_HTML);
        }
        return text;
    };

    const finalQuestions: Question[] = questions.map(q => {
        const rawQuestionText = replaceGeometryPlaceholders(q.questionText || '');
        const hasMainChart = !!q.chartData;
        const questionText = replaceChartPlaceholders(markdownToHtml(rawQuestionText), hasMainChart);
        const options = q.options ? q.options.map((opt: string, i: number) => replaceChartPlaceholders(markdownToHtml(replaceGeometryPlaceholders(opt || '')), !!q.optionCharts?.[i])) : undefined;
        
        let correctAnswer: string | string[] | number | boolean = q.correctAnswer || '';
        if (Array.isArray(correctAnswer)) {
            correctAnswer = JSON.stringify(correctAnswer);
        } else if (typeof correctAnswer !== 'string') {
            correctAnswer = String(correctAnswer);
        }
        
        if (mappedQuestionType === 'MULTIPLE_CHOICE') {
            // Find the option that matches the correct answer most closely
            const htmlCorrectAnswer = replaceChartPlaceholders(markdownToHtml(replaceGeometryPlaceholders(String(correctAnswer))), !!q.correctAnswerChart);
            
            const matchingOption = options?.find(opt => isAnswerMatch(htmlCorrectAnswer, opt, mappedQuestionType));

            if (matchingOption) {
                correctAnswer = matchingOption;
            } else {
                // Check if correctAnswer is just a letter A, B, C, D, E or "Jawaban A" or numbers 1-5
                const letterMatch = String(correctAnswer).trim().toUpperCase().match(/^(?:JAWABAN\s+|OPSI\s+|PILIHAN\s+)?([A-E1-5])[.)]?$/);
                if (letterMatch && options) {
                    const char = letterMatch[1];
                    let index = -1;
                    if (char >= 'A' && char <= 'E') {
                        index = char.charCodeAt(0) - 65;
                    } else if (char >= '1' && char <= '5') {
                        index = parseInt(char) - 1;
                    }
                    if (index >= 0 && index < options.length) {
                        correctAnswer = options[index];
                    } else {
                        correctAnswer = htmlCorrectAnswer;
                    }
                } else {
                    // Fallback: if no exact match, try to find an option that contains the correct answer or vice versa
                    const fallbackOption = options?.find(opt => {
                        const normOpt = normalize(opt, mappedQuestionType);
                        const normAns = normalize(htmlCorrectAnswer, mappedQuestionType);
                        return (normOpt.length > 3 && normAns.includes(normOpt)) || 
                               (normAns.length > 3 && normOpt.includes(normAns));
                    });
                    correctAnswer = fallbackOption || htmlCorrectAnswer;
                }
            }
        } else if (mappedQuestionType === 'COMPLEX_MULTIPLE_CHOICE') {
            // Split by comma, trim, map to html, then JSON stringify
            const splitAnswers = parseList(correctAnswer);
            
            // Map each answer to the closest matching option
            const mappedAnswers = splitAnswers.map(ans => {
                const htmlAns = replaceChartPlaceholders(markdownToHtml(replaceGeometryPlaceholders(ans)), !!q.correctAnswerChart);

                const matchingOption = options?.find(opt => isAnswerMatch(htmlAns, opt, mappedQuestionType));
                if (matchingOption) return matchingOption;

                const letterMatch = String(ans).trim().toUpperCase().match(/^(?:JAWABAN\s+|OPSI\s+|PILIHAN\s+)?([A-E1-5])[.)]?$/);
                if (letterMatch && options) {
                    const char = letterMatch[1];
                    let index = -1;
                    if (char >= 'A' && char <= 'E') {
                        index = char.charCodeAt(0) - 65;
                    } else if (char >= '1' && char <= '5') {
                        index = parseInt(char) - 1;
                    }
                    if (index >= 0 && index < options.length) {
                        return options[index];
                    }
                }

                // Fallback for complex answers
                const fallbackOption = options?.find(opt => {
                    const normOpt = normalize(opt, mappedQuestionType);
                    const normAns = normalize(htmlAns, mappedQuestionType);
                    return (normOpt.length > 3 && normAns.includes(normOpt)) || 
                           (normAns.length > 3 && normOpt.includes(normAns));
                });
                
                return fallbackOption || htmlAns;
            });
            
            // Ensure we only have unique answers and they are valid options if possible
            const uniqueAnswers = Array.from(new Set(mappedAnswers));
            correctAnswer = JSON.stringify(uniqueAnswers);
        } else if (mappedQuestionType === 'FILL_IN_THE_BLANK' || mappedQuestionType === 'ESSAY') {
            // Do not convert to HTML for fill in the blank or essay to preserve the raw text answer
            correctAnswer = String(correctAnswer).trim();
        } else {
            correctAnswer = replaceChartPlaceholders(markdownToHtml(replaceGeometryPlaceholders(String(correctAnswer))), !!q.correctAnswerChart);
        }

        const mappedQ: Question = {
            id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            questionText: questionText,
            questionType: mappedQuestionType,
            options: options,
            optionCharts: q.optionCharts,
            correctAnswer: correctAnswer,
            correctAnswerChart: q.correctAnswerChart,
            scoreWeight: q.scoreWeight || 1,
            kisiKisi: config.blueprint,
            level: config.difficulty,
            category: config.subject,
            chartData: q.chartData
        };
        
        // Handle true false rows if needed
        if (mappedQuestionType === 'TRUE_FALSE') {
            if (q.trueFalseRows && q.trueFalseRows.length > 0) {
                mappedQ.trueFalseRows = q.trueFalseRows.map((r: { text: string; answer: string | boolean | number; chartData?: ChartData }) => {
                    // Ensure answer is a boolean even if AI returns string "true"/"false" or "Benar"/"Salah"
                    let boolAnswer = !!r.answer;
                    if (typeof r.answer === 'string') {
                        const lower = r.answer.toLowerCase();
                        if (lower === 'false' || lower === 'salah' || lower === '0' || lower === 'tidak') {
                            boolAnswer = false;
                        } else if (lower === 'true' || lower === 'benar' || lower === '1' || lower === 'ya') {
                            boolAnswer = true;
                        }
                    }
                    return {
                        text: replaceChartPlaceholders(markdownToHtml(replaceGeometryPlaceholders(r.text || '')), !!r.chartData),
                        answer: boolAnswer,
                        chartData: r.chartData
                    };
                });
            } else if (q.options) {
                mappedQ.trueFalseRows = [
                    { text: markdownToHtml('Pernyataan 1'), answer: q.correctAnswer?.toLowerCase().includes('benar') || false }
                ];
            }
        }

        // Handle matching pairs if needed
        if (mappedQuestionType === 'MATCHING') {
            if (q.matchingPairs && q.matchingPairs.length > 0) {
                mappedQ.matchingPairs = q.matchingPairs.map((p: { left: string; right: string; leftChart?: ChartData; rightChart?: ChartData }) => ({
                    left: replaceChartPlaceholders(markdownToHtml(replaceGeometryPlaceholders(p.left || '')), !!p.leftChart),
                    right: replaceChartPlaceholders(markdownToHtml(replaceGeometryPlaceholders(p.right || '')), !!p.rightChart),
                    leftChart: p.leftChart,
                    rightChart: p.rightChart
                }));
            } else {
                mappedQ.matchingPairs = [
                    { left: markdownToHtml('Item 1'), right: markdownToHtml('Pasangan 1') }
                ];
            }
        }
        
        return mappedQ;
    });

    // Jika pengguna meminta gambar, cari referensi gambar asli dari Wikimedia Commons
    // Fetch images if keyword is provided
    for (let i = 0; i < finalQuestions.length; i++) {
      const q = finalQuestions[i];
      const originalQ = questions[i];
      if (originalQ.imageSearchKeyword) {
        try {
          const keyword = encodeURIComponent(originalQ.imageSearchKeyword);
          const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${keyword}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json&origin=*`;
          
          const res = await fetch(url);
          const data = await res.json();
          
          const pages = data.query?.pages;
          if (pages) {
            const pageId = Object.keys(pages)[0];
            const pageData = pages[pageId];
            const imageInfo = pageData?.imageinfo?.[0];
            
            if (imageInfo) {
              const imgUrl = imageInfo.thumburl || imageInfo.url;
              const sourceUrl = imageInfo.descriptionurl || `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(pageData.title)}`;
              
              if (imgUrl) {
                const imgHtml = `
<p style="text-align: center; margin-bottom: 16px;">
  <img src="${imgUrl}" alt="${originalQ.imageSearchKeyword}" style="max-width: 100%; max-height: 400px; width: auto; height: auto; object-fit: contain; border-radius: 4px; display: inline-block; margin: 0 auto;" /><br/>
  <span style="font-size: 12px; color: #64748b;">
    Sumber gambar: <a href="${sourceUrl}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline;">Wikimedia Commons ("${originalQ.imageSearchKeyword}")</a>
  </span>
</p>`;
                q.questionText = imgHtml + q.questionText;
              }
            }
          }
        } catch (imgError) {
          console.error("Failed to fetch image for keyword:", originalQ.imageSearchKeyword, imgError);
        }
      }
    }

    return finalQuestions;
  } catch (error) {
    console.error("Failed to parse questions:", error);
    throw new Error("Gagal memproses format respons dari AI. Silakan coba lagi.");
  }
}
