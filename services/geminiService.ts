import { GoogleGenAI, Type } from "@google/genai";
import { Question, QuizConfig, QuestionType, ChartData } from "../types";
import { markdownToHtml, normalize, parseList, isAnswerMatch } from "../components/teacher/examUtils";
import { generateGeometrySVG, extractNum } from "../components/teacher/geometryUtils";

export async function generateQuestions(config: QuizConfig): Promise<Question[]> {
    const selectedTypes: string[] = (config.types && config.types.length > 0)
        ? config.types
        : [config.type || "Pilihan Ganda"];
    
    const selectedDifficulties: string[] = (config.difficulties && config.difficulties.length > 0)
        ? config.difficulties
        : [config.difficulty || "Level 3 - Penalaran (Reasoning / HOTS)"];

    const isTKA = config.subject.toUpperCase().includes('TKA') || 
                  config.blueprint.toUpperCase().includes('TKA') || 
                  selectedDifficulties.some(d => d.toUpperCase().includes('PENALARAN') || d.toUpperCase().includes('LEVEL 3')) ||
                  selectedTypes.some(t => t.toUpperCase().includes('TKA'));

    const systemInstruction = `
    Anda adalah Penulis Soal Ahli Asesmen Nasional (Master Item Writer) dan Asisten Pembuat Soal Ujian Profesional yang berpengalaman dalam menyusun soal terstandar nasional, termasuk Kerangka Asesmen Tes Kemampuan Akademik (TKA) sesuai regulasi resmi Badan Standar, Kurikulum, dan Asesmen Pendidikan (BSKAP) Kementerian Pendidikan Dasar dan Menengah RI No. 047/H/AN/2025 (Jenjang SD/MI dan SMP/MTs).
    
    Tugas Anda adalah membuat soal berkualitas tinggi, akurat secara konsep, serta memiliki daya beda yang valid berdasarkan parameter yang diberikan.
    
    PRINSIP UTAMA PENULISAN SOAL TKA (KEMENDIKDASMEN NO. 047/H/AN/2025):
    1. BERMAKNA & BERBASIS PENALARAN TINGGI (HOTS/MOTS):
       - Soal BUKAN hafalan rumus singkat semata, melainkan menguji pemahaman fakta, konsep, prosedur, serta penalaran konteks nyata (problem-solving).
       - Tiga Level Kognitif Resmi:
         * Level 1 (Knowing & Understanding): Menghitung prosedur aritmatika, membaca informasi tabel/grafik/diagram, mengelompokkan & mengidentifikasi objek.
         * Level 2 (Applying): Memodelkan masalah kontekstual ke kalimat matematika, mengaplikasikan konsep/rumus rutin, menafsirkan situasi fisis.
         * Level 3 (Reasoning): Menganalisis relasi antar-konsep, memecahkan masalah non-rutin bertingkat (multi-step), mengevaluasi alternatif solusi, menyimpulkan data valid.
    2. KONTEKSTUALITAS INDONESIA:
       - Gunakan nama-nama tokoh lokal yang santun dan wajar di Indonesia (contoh: Pak Bondan, Bu Anita, Danu, Antok, Caca, Mae, Doni, Dina, Mira, Tika, dsb.).
       - Gunakan konteks kehidupan nyata (literasi membaca teks fiksi fabel/puisi/cerita, teks informasi sains/lingkungan/kesehatan gizi, denah taman kota, resep/pasar, pembagian sembako, perbandingan harga, waktu perjalanan).
    3. STANDAR TIPOGRAFI & NOTASI INDONESIA:
       - Tanda Desimal: Menggunakan koma, contoh: 0,75 atau 2,5 atau 3,14 (bukan 0.75).
       - Pemisah Ribuan / Mata Uang: Menggunakan titik dan format rupiah baku, contoh: Rp24.000,00 atau Rp157.500,00 atau 4.425 gram.
       - Satuan Baku: Tuliskan sesuai standar metrik (mm, cm, dm, m, dam, hm, km; mg, cg, dg, g, dag, hg, kg; ml, cl, dl, l, dal, hl, kl; detik, menit, jam, hari).
       - Format Pecahan: Gunakan sintaks LaTeX rapi $\\frac{a}{b}$ atau pecahan campuran $4\\frac{3}{4}$.

    ATURAN FORMAT UMUM:
    - Gunakan format Markdown secara maksimal pada teks pertanyaan.
    - Gunakan tabel Markdown jika diperlukan untuk menyajikan data. WAJIB tambahkan baris kosong (\\n\\n) sebelum dan sesudah tabel.
    - Gunakan bullet points atau numbering untuk daftar.
    - Gunakan LaTeX untuk rumus matematika (gunakan $...$ untuk inline dan $$...$$ untuk block equation). PENTING: Karena ini adalah string JSON, Anda WAJIB menggunakan double-backslash ganda untuk escape command LaTeX, contoh: $\\\\frac{1}{2}$ atau $\\\\sqrt{x}$ atau $4\\\\frac{3}{4}$. KHUSUS untuk akar (square root/roots), Anda WAJIB menggunakan perintah $\\\\sqrt{...}$ atau $\\\\sqrt[n]{...}$ dan DILARANG menggunakan karakter unicode akar (√) secara langsung. DILARANG menggunakan karakter pangkat (seperti x^2) atau simbol matematika lainnya tanpa dibungkus LaTeX. Anda WAJIB menggunakan format LaTeX ($...$) secara KONSISTEN pada SELURUH opsi jawaban ('options'), pernyataan, maupun narasi jika memuat persamaan, polinomial, pecahan, akar, atau pangkat! Jika relevan, Anda juga WAJIB menggunakan standar LaTeX untuk matriks (nxn, nx1, 1xn), limit ($\\\\lim$), logaritma ($\\\\log$), permutasi (contoh: $_{n}P_{r}$), kombinasi ($_{n}C_{r}$), jenis kurung berbatas (\\\\left( \\\\right), dll), vektor kolom, nilai mutlak (\\\\left| \\\\right|), fungsi piecewise (\\\\begin{cases} \\\\end{cases}), irisan (\\\\cap), turunan (\\\\frac{dy}{dx}) dan gabungan himpunan (\\\\cup). Contoh opsi jawaban yang benar: "$x^2 + 2x + 1$" atau "$\\\\sqrt{x^2 + y^2}$" atau "$\\\\frac{11}{30}$".
    - Turus & Tabel Frekuensi (Tally Marks): WAJIB menggunakan huruf kapital 'I' (bukan simbol pipe '|') untuk turus satuan agar tabel Markdown tidak pecah. Gunakan 'I' (1), 'II' (2), 'III' (3), 'IIII' (4), dan '卌' (5). Untuk angka lebih dari 5, gabungkan kelipatan 5 dengan sisa satuan (pisahkan dengan spasi). Contoh: 6 = '卌 I', 7 = '卌 II', 10 = '卌 卌', 13 = '卌 卌 III'. Jika instruksi meminta "tabel turus saja" ATAU "tabel frekuensi saja", Anda WAJIB mematuhi permintaan tersebut dengan hanya membuat kolom yang spesifik diminta (misal hanya kolom data dan kolom turus, ATAU hanya kolom data dan kolom frekuensi). JANGAN secara otomatis menggabungkan kolom Turus dan Frekuensi menjadi satu tabel jika tidak diminta secara eksplisit. JANGAN menggunakan gambar untuk turus, gunakan teks ini saja.
    - Piktogram (Simbol/Emoji): Untuk soal yang membutuhkan data piktogram (diagram gambar), Anda BISA dan DISARANKAN untuk menggunakan emoji langsung (misalnya: 🍎, 🚗, ⭐️, 👦) dalam tabel atau teks soal untuk mewakili unit data.
    - Bangun Datar & Ruang: JIKA SOAL MEMINTA MENGHITUNG TEHADAP SEBUAH "GAMBAR BANGUN RUANG" ATAU "GAMBAR BANGUN DATAR", Anda WAJIB MENAMPILKAN GAMBAR tersebut menggunakan tag [GEOMETRY:shape_name:{"label_key":"label_value"}]. JANGAN hanya mendeskripsikan ukurannya dalam bentuk teks (misal: "Sebuah balok memiliki ukuran panjang 12 cm..."). Anda WAJIB langsung menyisipkan tag geometri ke dalam teks soal (\`questionText\`), lalu diikuti pertanyaannya. DILARANG menggunakan emoji, unicode, atau \`imageSearchKeyword\` untuk bangun ruang/datar. 
      Jika Anda diminta membuat soal "menghitung volume/luas dari gambar bangun ruang/datar gabungan", Anda HARUS menampilkan gambar gabungan menggunakan tag [GEOMETRY:shape_name:...] dan JANGAN menambahkan teks skenario yang rumit kecuali secara eksplisit diminta!
      Daftar \`shape_name\` yang valid HANYALAH: "triangle", "square", "rectangle", "parallelogram", "kite", "rhombus", "trapezoid", "polygon", "circle", "cube", "cuboid", "cylinder", "cone", "sphere", "pyramid", "prism", "combined_cuboid_pyramid", "combined_cuboid_cube", "combined_cylinder_cone", "combined_rect_triangle", "combined_l_shape", "combined_rect_semicircle", "combined_rect_rect".
      PENTING UNTUK BANGUN GABUNGAN: Jika diminta soal tentang "BANGUN GABUNGAN", Anda WAJIB menggunakan salah satu shape_name gabungan di atas (contoh: [GEOMETRY:combined_cuboid_cube:{"bottom_width":"10","bottom_height":"5","bottom_depth":"4","top_side":"4"}]). DILARANG KERAS membuat nama shape_name sendiri (seperti 'Shape Tbd', 'gabungan', 'combined'). Jika bentuk gabungan yang diinginkan tidak ada di daftar, gunakan dua tag geometri standar secara berdampingan.
      KHUSUS untuk "combined_rect_semicircle", Anda dapat mengatur posisi setengah lingkaran dengan properti "position" ("top", "bottom", "left", "right") dan ukuran setengah lingkaran relatif terhadap sisi menggunakan "ratio" (misal "0.5" untuk setengah sisi, "1" untuk seluruh sisi). Contoh: [GEOMETRY:combined_rect_semicircle:{"width":"20 cm","height":"14 cm","position":"bottom","ratio":"0.5","diameter":"14 cm"}]
      Contoh penggunaan label JSON yang BENAR (pastikan valid JSON):
      [GEOMETRY:rectangle:{"bottom":"10 cm","right":"5 cm"}]
      [GEOMETRY:triangle:{"bottom":"8","height":"6","left":"5"}]
      [GEOMETRY:circle:{"radius":"7 cm"}]
      [GEOMETRY:cube:{"width":"5"}]
      [GEOMETRY:cuboid:{"width":"10","height":"5","depth":"4"}]
      [GEOMETRY:pyramid:{"side":"6","height":"8"}]
    - Diagram (Charts): JIKA SOAL ATAU OPSI MEMINTA DIAGRAM (diagram batang/garis/lingkaran/venn/relasi/kartesius), Anda WAJIB mengisi field 'chartData'. UNTUK MENEMPATKAN DIAGRAM DI POSISI TERTENTU dalam teks (\`questionText\` atau opsi), Anda WAJIB menggunakan tag [CHART]. Jika Anda tidak menggunakan tag [CHART], diagram akan otomatis dirender di bagian paling bawah teks. Khusus untuk diagram venn himpunan, gunakan 'labels' untuk nama-nama himpunan (contoh: ["A", "B"] atau ["A", "B", "C"]) dan 'datasets.data' untuk nilainya. Untuk 2 himpunan, urutan nilai adalah: [Hanya A, Hanya B, Irisan A & B, Di Luar Himpunan, Semesta]. Untuk 3 himpunan, urutan nilai adalah: [Hanya A, Hanya B, Hanya C, Irisan A&B, Irisan A&C, Irisan B&C, Irisan A&B&C, Di Luar Himpunan, Semesta]. Khusus untuk relasi/fungsi (relation), gunakan 'labels' untuk nama himpunan (contoh: ["A", "B"]). 'datasets' ke-0 berisi data anggota domain (e.g. data: ["1", "2"]). 'datasets' ke-1 berisi data anggota kodomain. 'datasets' ke-2 berisi relasi dengan format "indexDomain-indexKodomain" (contoh: ["0-1", "1-2"]). Khusus diagram kartesius (cartesian), Anda WAJIB menyertakan field 'cartesianConfig' yang berisi 'xMin', 'xMax', 'yMin', 'yMax', 'xStep', dan 'yStep'. Dan 'datasets' berisi array of object dengan 'label' (UNTUK NAMA GARIS JIKA ADA), 'showLine' (boolean), serta titiknya ATAU fungsi matematikanya. JIKA fungsi matematika, beri property 'isFunction': true and 'functionStr' (misal "x^2 - 2x + 1" atau "2x" dalam sintaks JS/Matematika dasar). JIKA titik manual, beri property 'data' berupa array of object {x: number, y: number}.
    - INSTRUKSI KHUSUS DALAM KURUNG: Jika dalam referensi materi / kisi-kisi terdapat instruksi yang diapit dengan tanda kurung biasa '()' atau kurung siku '[]' (misal: "(sertakan diagram lingkaran)", "(sertakan tabel frekuensi)", atau "[sertakan gambar...]"), Anda WAJIB mematuhinya!
      * Jika diminta tabel: Buatlah tabel menggunakan format tabel Markdown murni.
      * Jika diminta diagram/grafik: Anda WAJIB mengisi property 'chartData' sesuai jenis diagram (bar/line/pie/venn/relation).
      ${config.includeImages ? `* STIMULUS GAMBAR / ILUSTRASI (FITUR AKTIF): Karena fitur gambar aktif, Anda WAJIB mengisi property 'imageSearchKeyword' untuk butir soal yang membutuhkan stimulus visual, ilustrasi materi, foto benda nyata, peta/lingkungan, atau tokoh sejarah. Tuliskan 1-2 kata kunci pencarian dalam BAHASA INGGRIS (contoh: "borobudur temple" atau "rafflesia arnoldii"). JANGAN menuliskan tag <img> ke dalam questionText karena sistem akan otomatis mencari gambar dari Wikimedia berdasarkan 'imageSearchKeyword' di atas soal.` : `* Jika diminta gambar/ilustrasi/foto: FITUR GAMBAR SEDANG DINONAKTIFKAN. ABAIKAN permintaan gambar/foto dan JANGAN menyisipkan placeholder gambar, instruksi gambar, maupun \`imageSearchKeyword\`. Sesuaikan narasinya agar tidak memerlukan gambar (misal dengan mendeskripsikan secara tekstual atau menggunakan tabel).`}
    - LARANGAN KERAS: DILARANG KERAS menyisipkan tag HTML, tag <img>, atau tag semacam <span class="chart-placeholder"> untuk tabel, gambar raster, atau ilustrasi umum. Gunakan tabel Markdown murni untuk tabel.
    - PENTING (AKSARA BALI): Jika materi atau konteks soal berkaitan dengan mata pelajaran "Bahasa Bali", Anda WAJIB berinisiatif dan memutuskan secara mandiri untuk menggunakan teks Aksara Bali pada narasi soal dan/atau opsi jawaban jika dirasa relevan. Bungkus teks tersebut dengan tag HTML <span class="aksara-bali" style="font-family: 'Noto Sans Balinese', sans-serif;">teks aksara bali</span>.
    - PENTING (SINTAKS MATEMATIKA & LATEX): Jika Anda menyisipkan sintaks LaTeX atau matematika, Anda WAJIB MENG-ESCAPE KODE BACKSLASH TERSEBUT KARENA INI ADALAH FORMAT JSON! Contoh: Tuliskan \\\\frac{3}{4} BUKAN \\frac{3}{4}. Tuliskan \\\\text{cm}^3 BUKAN \\text{cm}^3.
    - Hindari konten dewasa, kekerasan, atau hal-hal yang tidak pantas untuk lingkungan pendidikan.
    - DILARANG KERAS memberikan penjelasan, cara penyelesaian, atau kunci jawaban di dalam teks pertanyaan (questionText). Teks pertanyaan hanya boleh berisi stimulus dan soal yang harus dijawab oleh siswa.
    - PENTING (KUNCI JAWABAN WAJIB & PRESISI TINGGI):
      * Anda WAJIB mengisi field 'correctAnswer' pada SETIAP soal tanpa terkecuali. DILARANG KERAS mengosongkan 'correctAnswer'.
      * Anda WAJIB menghitung kunci jawaban secara matematis step-by-step dan memastikannya 100% akurat.
      * Gunakan field 'explanation' untuk menjabarkan langkah-langkah penyelesaiannya secara detail SEBELUM mengisi 'correctAnswer' dan 'options'.
      * Pengecoh (distraktor) pada opsi salah harus masuk akal (mencerminkan miskonsepsi siswa yang umum).

    PENTING (KISI-KISI DAN INDIKATOR SPESIFIK WAJIB PER BUTIR SOAL):
    - Anda WAJIB mengisi field 'kisiKisi' pada SETIAP butir soal yang dibuat dengan rumusan INDIKATOR BUTIR SOAL yang KHUSUS dan SPESIFIK hanya untuk soal itu saja.
    - DILARANG KERAS mengisi 'kisiKisi' dengan blueprint umum, silabus global, atau sekadar menyalin judul materi!
    - Format indikator soal WAJIB berformat operasional (KKO / Format Indikator Asesmen Nasional):
      "Disajikan stimulus [konteks spesifik/grafik/tabel/narasi], peserta didik dapat [kompetensi/tindakan kognitif yang diuji pada butir soal ini] dengan tepat/benar."
    - Contoh yang BENAR:
      * Soal Matematika: "Disajikan stimulus tabel harga bahan pokok, peserta didik dapat menghitung selisih total belanja dan uang kembalian pecahan ratusan ribu dengan tepat."
      * Soal Geometri: "Disajikan gambar bangun datar gabungan persegi panjang dan segitiga, peserta didik dapat menentukan luas daerah yang diarsir secara akurat."
      * Soal IPA: "Disajikan diagram jaring-jaring makanan ekosistem sawah, peserta didik dapat memprediksi dampak kepunahan populasi katak terhadap populasi belalang dengan benar."
      * Soal Bahasa Indonesia: "Disajikan kutipan teks fabel tiga paragraf, peserta didik dapat menyimpulkan watak tokoh kancil dan amanat cerita dengan tepat."
    - Wajib juga mengisi 'level' dengan tingkat kognitif spesifik butir soal tersebut (misal: "Level 3 - Penalaran (HOTS)", "Level 2 - Penerapan (MOTS)", "C4 - Menganalisis", dll).
    - Wajib mengisi 'category' dengan sub-topik / domain materi spesifik (misal: "Operasi Pecahan Campuran", "Ekosistem & Rantai Makanan", "Teks Eksplanasi").
    
    ATURAN BENTUK SOAL RESMI:
    - Pilihan Ganda (PG): Wajib isi 'options' (4-5 opsi untuk SD/SMP) dan 'correctAnswer' (1 jawaban benar yang sama persis dengan salah satu opsi). PENTING: Acak posisi jawaban yang benar agar tidak selalu berada di opsi pertama (A).
    - Pilihan Ganda Kompleks (PGK MCMA): Wajib isi 'options' (3-5 opsi pernyataan) dan 'correctAnswer' (semua jawaban benar dipisahkan dengan "|||", contoh: "Opsi 1|||Opsi 2", harus sama persis dengan teks opsi). Sertakan instruksi baku di teks soal: "Pilihlah jawaban yang benar! Jawaban benar lebih dari satu."
    - Pilihan Ganda Kompleks Kategori (Benar/Salah, Sesuai/Tidak Sesuai, Setuju/Tidak Setuju): Wajib isi 'trueFalseRows' berupa array of objects { "text": "pernyataan lengkap", "answer": true/false }. Buat 3 pernyataan terstruktur dengan nilai kebenaran yang valid.
    - Menjodohkan: Wajib isi 'matchingPairs' berupa array of objects { "left": "item kiri", "right": "pasangan kanan" }. Buat 3-5 pasangan dengan kunci yang tepat.
    - Uraian Singkat / Isian: Wajib isi 'correctAnswer' dengan jawaban padat, presisi, dan jelas.
    - Esai: Wajib isi 'correctAnswer' dengan rubrik/poin jawaban lengkap yang diharapkan.
    
    STIMULUS VISUAL & GAMBAR REPRESENTATIF (TKA KEMENDIKDASMEN):
    - Soal asesmen TKA mengedepankan stimulus kontekstual yang kaya visual (grafik, denah, diagram, foto/ilustrasi benda nyata).
    - Geometri & Bangun: Gunakan tag [GEOMETRY:shape_name:{...}] dengan label dimensi presisi untuk menampilkan bangun datar/ruang.
    - Data & Statistik: Gunakan 'chartData' dan tag [CHART] untuk menampilkan diagram batang/garis/lingkaran/venn.
    - Sains / IPA / IPS / Tematik / Kehidupan Sehari-hari / Literasi: ${config.includeImages ? `Fitur gambar aktif! Anda WAJIB mengisi property 'imageSearchKeyword' dengan 1-2 kata kunci bahasa Inggris yang spesifik (contoh: "food web").` : `Fitur gambar dinonaktifkan.`}
    
    RESPON:
    - Berikan respon dalam format JSON array.
    - Pastikan JSON valid dan sesuai dengan schema yang diminta.
    - WAJIB mengisi field 'questionType', 'correctAnswer', 'kisiKisi', 'level', dan 'category' untuk SETIAP butir soal.
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
    questionType: {
      type: Type.STRING,
      enum: ["Pilihan Ganda", "Pilihan Ganda Kompleks", "Benar/Salah", "Menjodohkan", "Uraian Singkat", "Esai"],
      description: "Bentuk/jenis soal sesuai tabel distribusi wajib"
    },
    questionText: { type: Type.STRING, description: "Teks pertanyaan dalam format Markdown" },
    options: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Opsi jawaban (WAJIB diisi 4-5 opsi untuk Pilihan Ganda dan 3-5 opsi untuk Pilihan Ganda Kompleks)"
    },
    optionCharts: {
      type: Type.ARRAY,
      items: chartDataSchema,
      description: "Data diagram untuk setiap opsi jawaban (opsional, urutan harus sesuai dengan options)"
    },
    explanation: { type: Type.STRING, description: "Penjelasan matematis langkah demi langkah atau penalaran logis untuk memastikan jawaban akurat. WAJIB diisi untuk soal hitungan, geometri, fisika, kimia, matematika, dll agar hasil perhitungan benar." },
    correctAnswer: { type: Type.STRING, description: "Jawaban benar. WAJIB diisi untuk semua jenis soal kecuali INFO. Untuk PG/PG Kompleks, harus sama persis dengan teks di options. Hasilnya harus sesuai dengan yang dihitung di explanation." },
    correctAnswerChart: {
      ...chartDataSchema,
      description: "Data diagram untuk jawaban benar (opsional, berguna untuk soal isian/esai)"
    },
    scoreWeight: { type: Type.NUMBER, description: "Bobot nilai soal (default 1)" },
    kisiKisi: { 
      type: Type.STRING, 
      description: "Kisi-kisi materi dan rumusan indikator capaian kompetensi SPESIFIK dan OPERASIONAL untuk butir soal ini (Contoh: 'Disajikan stimulus narasi fabel, peserta didik dapat menganalisis watak dan amanat tokoh utama dengan tepat'). WAJIB diisi spesifik per butir soal, BUKAN kisi-kisi umum!" 
    },
    level: { 
      type: Type.STRING, 
      description: "Tingkat kognitif spesifik butir soal ini (Contoh: 'Level 3 - Penalaran (HOTS)', 'Level 2 - Penerapan (MOTS)', 'Level 1 - Pemahaman (LOTS)', atau 'C4 - Menganalisis')" 
    },
    category: { 
      type: Type.STRING, 
      description: "Sub-kategori atau domain materi spesifik untuk soal ini (Contoh: 'Operasi Pecahan', 'Geometri & Pengukuran', 'Ekosistem')" 
    },
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
        ? "1-2 kata kunci bahasa Inggris spesifik untuk pencarian foto referensi di Wikimedia (contoh: 'solar eclipse', 'borobudur temple', 'mitochondria')." 
        : "FITUR GAMBAR NONAKTIF. Abaikan field ini." 
    }
  };

  const combinedDiff = selectedDifficulties.join(' ').toUpperCase();
  const combinedTypes = selectedTypes.join(' ').toUpperCase();
  const combinedText = `${combinedDiff} ${combinedTypes} ${config.subject || ''} ${config.blueprint || ''}`.toUpperCase();
  
  const isLevel6 = combinedText.includes('C6') || combinedText.includes('LEVEL 6');
  
  let modelsToTry: string[] = ['gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview'];
  if (isLevel6) {
      modelsToTry = ['gemini-3.7-flash', 'gemini-3.1-pro-preview', 'gemini-3.1-flash-lite'];
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
      
      if (/\\?\[(CHART|DIAGRAM|GAMBAR).*?\\?\]/i.test(text)) {
          return text.replace(/\\?\[(CHART|DIAGRAM|GAMBAR).*?\\?\]/gi, CHART_PLACEHOLDER_HTML);
      }
      return text;
  };

  async function generateSingleBatch(startIndex: number, batchCount: number): Promise<Question[]> {
    const slotDistribution: string[] = [];
    for (let i = 0; i < batchCount; i++) {
      const globalIndex = startIndex + i;
      const assignedType = selectedTypes[globalIndex % selectedTypes.length];
      const assignedDiff = selectedDifficulties[globalIndex % selectedDifficulties.length];
      slotDistribution.push(`- Soal #${globalIndex + 1}: Bentuk Soal = "${assignedType}", Tingkat Kognitif = "${assignedDiff}"`);
    }

    const batchPrompt = `
      Buatlah tepat ${batchCount} butir soal untuk mata pelajaran/materi: ${config.subject}.
      
      TABEL DISTRIBUSI WAJIB PER BUTIR SOAL (${batchCount} Butir):
      ${slotDistribution.join('\n')}
      
      ATURAN KELENGKAPAN WAJIB SESUAI BENTUK SOAL (DILARANG KOSONG / HILANG OPSI / HILANG KUNCI):
      1. Untuk soal berjenis "Pilihan Ganda":
         - 'questionType': "Pilihan Ganda"
         - 'options': WAJIB berisi 4 opsi jawaban lengkap (atau 5 opsi jika SMA). DILARANG KOSONG!
         - 'correctAnswer': WAJIB berisi 1 jawaban benar yang teksnya persis sama dengan salah satu opsi.
         - PENTING: Acak letak jawaban benar agar variatif (tidak selalu opsi pertama/A).
      2. Untuk soal berjenis "Pilihan Ganda Kompleks":
         - 'questionType': "Pilihan Ganda Kompleks"
         - 'options': WAJIB berisi 3-5 opsi pernyataan. DILARANG KOSONG!
         - 'correctAnswer': WAJIB berisi semua opsi yang benar, dipisahkan dengan tanda "|||" (contoh: "Opsi 1|||Opsi 3").
      3. Untuk soal berjenis "Benar/Salah":
         - 'questionType': "Benar/Salah"
         - 'trueFalseRows': WAJIB berisi array 3 baris pernyataan { "text": "pernyataan lengkap", "answer": true/false }. DILARANG KOSONG!
         - 'correctAnswer': WAJIB berisi ringkasan nilai kebenaran (contoh: "1. Benar, 2. Salah, 3. Benar").
      4. Untuk soal berjenis "Menjodohkan":
         - 'questionType': "Menjodohkan"
         - 'matchingPairs': WAJIB berisi array 3-5 pasangan { "left": "item/pernyataan kiri", "right": "pasangan kanan yang cocok" }. DILARANG KOSONG!
         - 'correctAnswer': WAJIB berisi daftar pasangan yang benar.
      5. Untuk soal berjenis "Uraian Singkat":
         - 'questionType': "Uraian Singkat"
         - 'correctAnswer': WAJIB berisi jawaban singkat / kata kunci / angka hasil perhitungan yang presisi.
      6. Untuk soal berjenis "Esai":
         - 'questionType': "Esai"
         - 'correctAnswer': WAJIB berisi rubrik atau poin-poin uraian jawaban lengkap.

      PANDUAN KISI-KISI / INDIKATOR SOAL:
      ${config.blueprint || 'Sesuai kurikulum & standar asesmen nasional'}
      
      PENGATURAN TINGKAT KESULITAN & INDIKATOR SPESIFIK:
      1. Anda WAJIB membaca dan menerapkan deskripsi spesifik mengenai konteks, dan materi yang dijabarkan dalam "PANDUAN KISI-KISI" di atas.
      2. WAJIB menuliskan KISI-KISI SPESIFIK / INDIKATOR SOAL OPERASIONAL pada field 'kisiKisi' untuk SETIAP butir soal yang Anda buat (format operasional: "Disajikan stimulus [konteks/tabel/grafik], peserta didik dapat [tindakan kognitif] dengan tepat").
      3. WAJIB mengisi 'level' sesuai dengan tingkat kognitif yang ditugaskan pada tabel distribusi di atas.
      4. WAJIB mengisi 'category' dengan sub-topik / domain materi spesifik butir soal tersebut.
      5. Pastikan kunci jawaban ('correctAnswer') 100% akurat dan dibuktikan melalui 'explanation'.
      ${config.includeImages ? `
      6. WAJIB STIMULUS GAMBAR:
         - Fitur 'Sertakan Gambar' AKTIF (includeImages=true).
         - Untuk butir soal yang TIDAK menggunakan geometri [GEOMETRY:...] atau grafik data 'chartData', Anda WAJIB MENGISI field 'imageSearchKeyword' dengan kata kunci bahasa Inggris (contoh: "volcano eruption").
         - Gambar referensi asli akan otomatis dicarikan dari Wikimedia dan disisipkan di atas soal oleh sistem.
      ` : ''}
    `;

    const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: batchPrompt, systemInstruction, modelsToTry, properties })
    });
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
        const rawHtml = await res.text();
        console.error("Non-JSON response from server:", rawHtml.slice(0, 300));
        throw new Error("Server mengembalikan respons non-JSON. Silakan coba sesaat lagi.");
    }
    const data = await res.json();
    if (!data.success) {
        throw new Error(data.error || "Failed to generate questions");
    }

    const questions: {
      id: string;
      questionType?: string;
      questionText: string;
      options?: string[];
      optionCharts?: (ChartData | null)[];
      correctAnswer?: string;
      correctAnswerChart?: ChartData;
      trueFalseRows?: { text: string; answer: boolean; chartData?: ChartData }[];
      matchingPairs?: { left: string; right: string; leftChart?: ChartData; rightChart?: ChartData }[];
      chartData?: ChartData;
      scoreWeight?: number;
      explanation?: string;
      kisiKisi?: string;
      level?: string;
      category?: string;
      imagePrompt?: string;
      imageSearchKeyword?: string;
    }[] = JSON.parse(data.text || "[]");

    const batchQuestions: Question[] = questions.map((q, index) => {
        const globalIndex = startIndex + index;
        const expectedType = selectedTypes[globalIndex % selectedTypes.length] || 'Pilihan Ganda';
        const expectedDiff = selectedDifficulties[globalIndex % selectedDifficulties.length] || 'Level 3 - Penalaran (Reasoning / HOTS)';

        const rawType = (q.questionType || '').toLowerCase();
        let currentQuestionType: QuestionType = 'MULTIPLE_CHOICE';

        if (rawType.includes('kompleks') || rawType.includes('mcma')) {
            currentQuestionType = 'COMPLEX_MULTIPLE_CHOICE';
        } else if (rawType.includes('benar') || rawType.includes('salah') || (q.trueFalseRows && q.trueFalseRows.length > 0)) {
            currentQuestionType = 'TRUE_FALSE';
        } else if (rawType.includes('jodoh') || rawType.includes('matching') || (q.matchingPairs && q.matchingPairs.length > 0)) {
            currentQuestionType = 'MATCHING';
        } else if (rawType.includes('isian') || rawType.includes('singkat') || rawType.includes('blank')) {
            currentQuestionType = 'FILL_IN_THE_BLANK';
        } else if (rawType.includes('esai') || rawType.includes('essay') || rawType.includes('uraian')) {
            currentQuestionType = 'ESSAY';
        } else if (q.options && q.options.length > 0) {
            currentQuestionType = 'MULTIPLE_CHOICE';
        } else {
            if (expectedType.toLowerCase().includes('kompleks')) currentQuestionType = 'COMPLEX_MULTIPLE_CHOICE';
            else if (expectedType.toLowerCase().includes('benar')) currentQuestionType = 'TRUE_FALSE';
            else if (expectedType.toLowerCase().includes('menjodohkan')) currentQuestionType = 'MATCHING';
            else if (expectedType.toLowerCase().includes('singkat') || expectedType.toLowerCase().includes('isian')) currentQuestionType = 'FILL_IN_THE_BLANK';
            else if (expectedType.toLowerCase().includes('esai') || expectedType.toLowerCase().includes('uraian')) currentQuestionType = 'ESSAY';
            else currentQuestionType = 'MULTIPLE_CHOICE';
        }

        const rawQuestionText = replaceGeometryPlaceholders(q.questionText || '');
        const hasMainChart = !!q.chartData;
        const questionText = replaceChartPlaceholders(markdownToHtml(rawQuestionText), hasMainChart);

        let options = q.options && q.options.length > 0
            ? q.options.map((opt: string, i: number) => replaceChartPlaceholders(markdownToHtml(replaceGeometryPlaceholders(opt || '')), !!q.optionCharts?.[i]))
            : undefined;

        let correctAnswer: string | string[] | number | boolean = q.correctAnswer || '';
        if (Array.isArray(correctAnswer)) {
            correctAnswer = JSON.stringify(correctAnswer);
        } else if (typeof correctAnswer !== 'string') {
            correctAnswer = String(correctAnswer);
        }

        if (currentQuestionType === 'MULTIPLE_CHOICE') {
            if (!options || options.length < 2) {
                const baseAns = String(correctAnswer).trim() || "Pilihan A";
                options = [
                    replaceChartPlaceholders(markdownToHtml(replaceGeometryPlaceholders(baseAns)), false),
                    replaceChartPlaceholders(markdownToHtml(replaceGeometryPlaceholders("Pilihan alternatif B")), false),
                    replaceChartPlaceholders(markdownToHtml(replaceGeometryPlaceholders("Pilihan alternatif C")), false),
                    replaceChartPlaceholders(markdownToHtml(replaceGeometryPlaceholders("Pilihan alternatif D")), false),
                ];
            }

            const htmlCorrectAnswer = replaceChartPlaceholders(markdownToHtml(replaceGeometryPlaceholders(String(correctAnswer))), !!q.correctAnswerChart);
            const matchingOption = options.find(opt => isAnswerMatch(htmlCorrectAnswer, opt, currentQuestionType));

            if (matchingOption) {
                correctAnswer = matchingOption;
            } else {
                const letterMatch = String(correctAnswer).trim().toUpperCase().match(/^(?:JAWABAN\s+|OPSI\s+|PILIHAN\s+)?([A-E1-5])[.)]?$/);
                if (letterMatch) {
                    const char = letterMatch[1];
                    let matchIndex = -1;
                    if (char >= 'A' && char <= 'E') matchIndex = char.charCodeAt(0) - 65;
                    else if (char >= '1' && char <= '5') matchIndex = parseInt(char) - 1;

                    if (matchIndex >= 0 && matchIndex < options.length) {
                        correctAnswer = options[matchIndex];
                    } else {
                        correctAnswer = options[0];
                    }
                } else {
                    const fallbackOption = options.find(opt => {
                        const normOpt = normalize(opt, currentQuestionType);
                        const normAns = normalize(htmlCorrectAnswer, currentQuestionType);
                        return (normOpt.length > 2 && normAns.includes(normOpt)) || 
                               (normAns.length > 2 && normOpt.includes(normAns));
                    });
                    correctAnswer = fallbackOption || options[0];
                }
            }
        } else if (currentQuestionType === 'COMPLEX_MULTIPLE_CHOICE') {
            if (!options || options.length < 2) {
                options = [
                    replaceChartPlaceholders(markdownToHtml(replaceGeometryPlaceholders("Pernyataan 1")), false),
                    replaceChartPlaceholders(markdownToHtml(replaceGeometryPlaceholders("Pernyataan 2")), false),
                    replaceChartPlaceholders(markdownToHtml(replaceGeometryPlaceholders("Pernyataan 3")), false),
                    replaceChartPlaceholders(markdownToHtml(replaceGeometryPlaceholders("Pernyataan 4")), false),
                ];
            }

            const splitAnswers = parseList(correctAnswer);
            const mappedAnswers = splitAnswers.map(ans => {
                const htmlAns = replaceChartPlaceholders(markdownToHtml(replaceGeometryPlaceholders(ans)), !!q.correctAnswerChart);
                const matchingOption = options!.find(opt => isAnswerMatch(htmlAns, opt, currentQuestionType));
                if (matchingOption) return matchingOption;

                const letterMatch = String(ans).trim().toUpperCase().match(/^(?:JAWABAN\s+|OPSI\s+|PILIHAN\s+)?([A-E1-5])[.)]?$/);
                if (letterMatch) {
                    const char = letterMatch[1];
                    let matchIndex = -1;
                    if (char >= 'A' && char <= 'E') matchIndex = char.charCodeAt(0) - 65;
                    else if (char >= '1' && char <= '5') matchIndex = parseInt(char) - 1;

                    if (matchIndex >= 0 && matchIndex < options!.length) return options![matchIndex];
                }

                const fallbackOption = options!.find(opt => {
                    const normOpt = normalize(opt, currentQuestionType);
                    const normAns = normalize(htmlAns, currentQuestionType);
                    return (normOpt.length > 2 && normAns.includes(normOpt)) || 
                           (normAns.length > 2 && normOpt.includes(normAns));
                });
                return fallbackOption || htmlAns;
            });

            let uniqueAnswers = Array.from(new Set(mappedAnswers)).filter(Boolean);
            if (uniqueAnswers.length === 0 && options && options.length > 0) {
                uniqueAnswers = [options[0]];
            }
            correctAnswer = JSON.stringify(uniqueAnswers);
        } else if (currentQuestionType === 'TRUE_FALSE') {
            options = undefined;
            if (!correctAnswer || correctAnswer === '""') {
                correctAnswer = "Pernyataan benar sesuai stimulus dan pembahasan.";
            }
        } else if (currentQuestionType === 'MATCHING') {
            options = undefined;
            if (!correctAnswer || correctAnswer === '""') {
                correctAnswer = "Pasangan item dan deskripsi yang sesuai.";
            }
        } else if (currentQuestionType === 'FILL_IN_THE_BLANK' || currentQuestionType === 'ESSAY') {
            options = undefined;
            correctAnswer = String(correctAnswer || q.explanation || "Jawaban lengkap sesuai pembahasan.").trim();
        } else {
            correctAnswer = replaceChartPlaceholders(markdownToHtml(replaceGeometryPlaceholders(String(correctAnswer))), !!q.correctAnswerChart);
        }

        let specificKisiKisi = q.kisiKisi?.trim() || "";
        const isGeneralBlueprint = !specificKisiKisi || 
            specificKisiKisi === config.blueprint?.trim() ||
            (config.blueprint && specificKisiKisi.includes("Standar TKA") && specificKisiKisi.includes("\n")) ||
            specificKisiKisi.length > 200;

        if (isGeneralBlueprint) {
            const topic = q.category?.trim() || config.subject || "materi pokok";
            const kognitif = q.level?.trim() || expectedDiff || "Penalaran";
            specificKisiKisi = `Disajikan stimulus terkait ${topic} (${kognitif}), peserta didik dapat menganalisis dan menyelesaikan masalah dengan tepat.`;
        }

        const mappedQ: Question = {
            id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            questionText: questionText,
            questionType: currentQuestionType,
            options: options,
            optionCharts: q.optionCharts,
            correctAnswer: String(correctAnswer),
            correctAnswerChart: q.correctAnswerChart,
            scoreWeight: q.scoreWeight || 1,
            kisiKisi: specificKisiKisi,
            level: q.level?.trim() || expectedDiff,
            category: q.category?.trim() || config.subject || "Umum",
            chartData: q.chartData,
            imagePrompt: q.imagePrompt,
            imageSearchKeyword: (q as any).imageSearchKeyword
        };
        
        if (currentQuestionType === 'TRUE_FALSE') {
            if (q.trueFalseRows && q.trueFalseRows.length > 0) {
                mappedQ.trueFalseRows = q.trueFalseRows.map((r: { text: string; answer: string | boolean | number; chartData?: ChartData }) => {
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
            } else {
                mappedQ.trueFalseRows = [
                    { text: markdownToHtml(`Pernyataan 1 terkait konsep ${mappedQ.category}`), answer: true },
                    { text: markdownToHtml(`Pernyataan 2 terkait fakta stimulus`), answer: false },
                    { text: markdownToHtml(`Pernyataan 3 terkait hasil analisis`), answer: true }
                ];
            }
        }

        if (currentQuestionType === 'MATCHING') {
            if (q.matchingPairs && q.matchingPairs.length > 0) {
                mappedQ.matchingPairs = q.matchingPairs.map((p: { left: string; right: string; leftChart?: ChartData; rightChart?: ChartData }) => ({
                    left: replaceChartPlaceholders(markdownToHtml(replaceGeometryPlaceholders(p.left || '')), !!p.leftChart),
                    right: replaceChartPlaceholders(markdownToHtml(replaceGeometryPlaceholders(p.right || '')), !!p.rightChart),
                    leftChart: p.leftChart,
                    rightChart: p.rightChart
                }));
            } else {
                mappedQ.matchingPairs = [
                    { left: markdownToHtml('Konsep/Istilah 1'), right: markdownToHtml('Deskripsi/Pasangan 1') },
                    { left: markdownToHtml('Konsep/Istilah 2'), right: markdownToHtml('Deskripsi/Pasangan 2') },
                    { left: markdownToHtml('Konsep/Istilah 3'), right: markdownToHtml('Deskripsi/Pasangan 3') }
                ];
            }
        }
        
        return mappedQ;
    });

    return batchQuestions;
  }

  // Execution: Split into concurrent batches of max 5 questions each to avoid 504 Deadline Exceeded
  try {
    const totalCount = config.count || 1;
    const CHUNK_SIZE = 5;
    const results: Question[][] = [];

    for (let offset = 0; offset < totalCount; offset += CHUNK_SIZE) {
      const batchCount = Math.min(CHUNK_SIZE, totalCount - offset);
      try {
        const batchResults = await generateSingleBatch(offset, batchCount);
        results.push(batchResults);
      } catch (err: any) {
        console.error("Batch error at offset", offset, ":", err);
        throw err;
      }
    }

    const finalQuestions: Question[] = results.flat();

    // Process AI Educational Images and fallback
    for (const q of finalQuestions) {
      if (config.includeImages) {
        const hasGeometry = q.questionText?.includes('[GEOMETRY:') || q.questionText?.includes('class="geometry-shape"');
        const hasChart = !!q.chartData || q.questionText?.includes('[CHART]') || q.questionText?.includes('chart-placeholder');
        const hasExistingImg = q.questionText?.includes('<img') || !!q.imageUrl;

        if ((q as any).imageSearchKeyword && !hasExistingImg && !hasGeometry && !hasChart) {
          try {
            const keyword = encodeURIComponent((q as any).imageSearchKeyword);
            const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${keyword}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiurlwidth=800&format=json&origin=*`;
            
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
  <img src="${imgUrl}" alt="${(q as any).imageSearchKeyword}" loading="lazy" style="max-width: 100%; max-height: 400px; width: auto; height: auto; object-fit: contain; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); display: inline-block; margin: 0 auto; border: 1px solid #e2e8f0;" /><br/>
  <span style="font-size: 11px; color: #64748b; margin-top: 4px; display: inline-block;">
    Sumber gambar: <a href="${sourceUrl}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline;">Wikimedia Commons ("${(q as any).imageSearchKeyword}")</a>
  </span>
</p>`;
                  q.questionText = imgHtml + q.questionText;
                  q.imageUrl = imgUrl;
                }
              }
            }
          } catch (imgError) {
            console.error("Failed to fetch image for keyword:", (q as any).imageSearchKeyword, imgError);
          }
        }
      }
    }

    return finalQuestions;
  } catch (error) {
    console.error("Failed to generate questions:", error);
    const err = error as Error;
    const msg = err?.message || "";
    if (msg.includes("QUOTA_EXCEEDED") || msg.includes("Deadline Exceeded") || msg.includes("504") || msg.includes("timeout")) {
      throw err;
    }
    throw new Error(msg || "Gagal memproses pembuatan soal dari AI. Silakan coba lagi.");
  }
}
