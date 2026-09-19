import { GoogleGenAI, Type } from "@google/genai";
import { Question, QuizConfig, QuestionType, ChartData } from "../types";
import { markdownToHtml, normalize, parseList, isAnswerMatch } from "../components/teacher/examUtils";
import { generateGeometrySVG, extractNum, parseGeometryLabels } from "../components/teacher/geometryUtils";
import { generateEducationalSvg, svgToDataUrl } from "./svgGeneratorService";
import { generateContextualEducationalSvg } from "./smartSvgTemplates";
import { generateSmartFallbackQuestions } from "./smartFallbackGenerator";
import { repairQuestionCharts, normalizeChartPlaceholdersInHtml } from "./chartRepairService";

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
    Anda adalah Penulis Soal Ahli Asesmen Nasional (Master Item Writer) dan Asisten Pembuat Soal Ujian Profesional yang berpengalaman dalam menyusun soal terstandar nasional, termasuk Kerangka Asesmen Tes Kemampuan Akademik (TKA) sesuai regulasi resmi Badan Standar, Kurikulum, dan Asesmen Pendidikan (BSKAP) Kementerian Pendidikan Dasar dan Menengah RI No. 047/H/AN/2025 (Jenjang SD/MI dan SMP/MTs) serta No. 045/H/AN/2025 (Jenjang SMA/MA/Sederajat dan SMK/MAK).
    
    Tugas Anda adalah membuat soal berkualitas tinggi, akurat secara konsep, serta memiliki daya beda yang valid berdasarkan parameter yang diberikan.
    
    PRINSIP UTAMA PENULISAN SOAL TKA (KEMENDIKDASMEN NO. 047/H/AN/2025 & NO. 045/H/AN/2025):
    1. BERMAKNA & BERBASIS PENALARAN TINGGI (HOTS/MOTS):
       - Soal BUKAN hafalan rumus singkat semata, melainkan menguji pemahaman fakta, konsep, prosedur, serta penalaran konteks nyata (problem-solving).
       - Tiga Level Kognitif Resmi:
         * Level 1 (Knowing & Understanding / Pemahaman): Menghitung prosedur aritmatika/aljabar, membaca informasi grafik/tabel, mengidentifikasi konsep/istilah.
         * Level 2 (Applying / Penerapan): Memodelkan masalah kontekstual ke formulasi matematis/ilmiah, mengaplikasikan konsep/rumus terstruktur, menganalisis situasi fisis/sosial.
         * Level 3 (Reasoning / Penalaran): Menganalisis hubungan sebab-akibat & relasi multikonsep, memecahkan masalah non-rutin bertingkat (multi-step), mengevaluasi alternatif solusi, menyimpulkan data secara valid dan kritis.
    2. CAKUPAN DOMAIN TKA SMA/MA & SMK/MAK (BSKAP NO. 045/H/AN/2025):
       - Matematika Wajib SMA/SMK: Aljabar (SPLTV, Program Linear, Fungsi Komposisi & Invers, Barisan/Deret & Bunga Majemuk), Geometri & Pengukuran (Transformasi Geometri, Dimensi Tiga/Jarak Titik-Garis-Bidang), Trigonometri (Perbandingan & Grafik Trigonometri), Data & Peluang (Statistika Deskriptif, Kombinatorika/Permutasi/Kombinasi, Peluang Majemuk).
       - Matematika Tingkat Lanjut: Aljabar (Matriks 2x2/3x3 determinan & invers, Polinomial suku banyak), Geometri & Vektor (Vektor 2D/3D, Persamaan Lingkaran & Garis Singgung), Kalkulus (Limit aljabar & trigonometri, Turunan, Integral).
       - Fisika SMA: Kinematika, Dinamika (Hukum Newton, Momentum, Dinamika Rotasi), Fluida (Statis & Dinamis Pascal/Archimedes/Bernoulli), Gelombang & Optik, Kalor & Termodinamika (Mesin Carnot, Gas Ideal), Kelistrikan (Hukum Coulomb, Rangkaian Kirchhoff), Keterampilan Proses Sains.
       - Kimia SMA: Struktur Atom & Ikatan Kimia (VSEPR), Stoikiometri, Kimia Organik (Hidrokarbon), Larutan Asam Basa, Buffer, Titrasi, Termokimia (Hukum Hess), Laju Reaksi & Kesetimbangan, Elektrokimia (Sel Volta & Elektrolisis).
       - Biologi SMA: Keanekaragaman Hayati & Ekosistem, Sel & Metabolisme/Enzim, Sistem Organ Tubuh Manusia (Sirkulasi, Respirasi, Ekskresi, Imun, Koordinasi Saraf/Hormon, Reproduksi), Penyelidikan Sains Ilmiah.
       - Ekonomi SMA: Kelangkaan & Biaya Peluang, Permintaan/Penawaran, Pendapatan Nasional, Inflasi, Kebijakan Moneter & Fiskal, Manajemen/Koperasi/BUMN, Perdagangan Internasional & Akuntansi Keuangan Dasar.
       - Sosiologi SMA: Hubungan & Gejala Sosial, Penelitian Sosial, Kelompok Sosial/Stratifikasi, Konflik & Integrasi, Perubahan Sosial & Globalisasi.
       - Geografi SMA: Dinamika Lingkungan Fisik & Sosial, Potensi Sumber Daya Nasional, Mitigasi & Adaptasi Bencana (Geologis & Hidrometeorologis), Analisis Peta & Penginderaan Jauh / SIG.
       - Sejarah SMA: Kronologi Sejarah Indonesia (Kerajaan Kuno, Kolonialisme, Pergerakan Nasional, Kemerdekaan, Demokrasi Liberal/Terpimpin, Orde Baru & Reformasi 1998).
       - Pendidikan Pancasila: Sila-sila Pancasila, UUD NRI 1945 & Sistem Ketatanegaraan, Bhinneka Tunggal Ika, NKRI & Wawasan Kebangsaan.
       - Produk/Projek Kreatif & Kewirausahaan (PKK SMK): Desain & Prototipe Produk, Perencanaan & Pengendalian Mutu (QA), Pemasaran Digital & Distribusi, Analisis Biaya Produksi & Laporan Keuangan, HaKI.
       - Bahasa Indonesia SMA: Literasi Membaca teks informasi ilmiah/sosial tunggal/jamak & teks fiksi bermuatan nilai luhur (Pemahaman Tekstual, Inferensial, dan Evaluasi/Apresiasi).
       - Bahasa Inggris SMA: Teks Fungsional & Esai (Descriptive, Recount, Narrative, Procedure, Analytical Exposition; Situasi Sehari-hari, Vokasional, Akademik).
    3. KONTEKSTUALITAS INDONESIA:
       - Gunakan nama-nama tokoh lokal yang santun dan wajar di Indonesia (contoh: Pak Bondan, Bu Anita, Danu, Antok, Caca, Mae, Doni, Dina, Mira, Tika, dsb.).
       - Gunakan konteks kehidupan nyata (literasi membaca teks fiksi fabel/puisi/cerita, teks informasi sains/lingkungan/kesehatan gizi, denah taman kota, resep/pasar, pembagian sembako, perbandingan harga, waktu perjalanan).
    4. STANDAR TIPOGRAFI & NOTASI INDONESIA:
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
    - Bangun Datar & Ruang: JIKA SOAL MEMINTA MENGHITUNG TERHADAP SEBUAH "GAMBAR BANGUN RUANG" ATAU "GAMBAR BANGUN DATAR", Anda WAJIB MENAMPILKAN GAMBAR tersebut menggunakan tag [GEOMETRY:shape_name:{"label_key":"label_value"}].
      SETIAP KALI MENAMPILKAN BANGUN RUANG ATAU BANGUN GABUNGAN, Anda WAJIB MENGISI SELURUH PARAMETER UKURAN PADA TAG GEOMETRY SECARA LENGKAP agar semua dimensi (panjang, lebar, tinggi, jari-jari, dll) terlihat jelas pada gambar!
      Jika Anda juga mendeskripsikan ukurannya dalam teks narasi, Anda WAJIB menuliskan kalimatnya secara UTUH dan LENGKAP tanpa terpotong (misal: "Bagian balok memiliki ukuran panjang 10 cm, lebar 6 cm, dan tinggi 8 cm, serta tinggi limas 6 cm."). DILARANG KERAS menghasilkan teks narasi yang terpotong di tengah kalimat!
      Daftar \`shape_name\` yang valid:
      * Bangun Datar 2D: "triangle", "square", "rectangle", "parallelogram", "rhombus", "trapezoid", "kite", "circle", "polygon"
      * Bangun Ruang 3D: "cube" (kubus), "cuboid" (balok), "cylinder" (tabung), "cone" (kerucut), "pyramid" (limas segiempat), "triangular_pyramid" (limas segitiga), "prism" (prisma segitiga), "sphere" (bola), "hemisphere" (setengah bola)
      * Bangun Gabungan: "combined_cuboid_pyramid" (balok+limas), "combined_cuboid_prism" (balok+atap prisma), "combined_cuboid_cube" (balok+kubus), "combined_cylinder_cone" (tabung+kerucut), "combined_cylinder_hemisphere" (tabung+kubah bola), "combined_cone_hemisphere" (kerucut+bola es krim), "combined_rect_triangle" (rumah 2D), "combined_l_shape" (bentuk L), "combined_rect_semicircle" (persegi panjang+setengah lingkaran).
      
      PENTING - KEBERAGAMAN BENTUK BANGUN RUANG (DILARANG MONOTON):
      * DILARANG KERAS selalu membuat soal volume bangun ruang yang hanya berupa gabungan balok dan limas!
      * Bangun ruang memiliki banyak variasi. Anda BISA dan WAJIB menggunakan bangun ruang lain sesuai permintaan materi/kisi-kisi, atau gunakan secara bervariasi jika topik bersifat umum:
        1. Bangun Ruang Tunggal:
           - Kubus (cube): panjang rusuk [GEOMETRY:cube:{"side":"10 cm"}]
           - Balok (cuboid): panjang, lebar, tinggi [GEOMETRY:cuboid:{"width":"15 cm","depth":"8 cm","height":"10 cm"}]
           - Tabung/Silinder (cylinder): jari-jari, tinggi [GEOMETRY:cylinder:{"radius":"7 cm","height":"20 cm"}]
           - Kerucut (cone): jari-jari, tinggi [GEOMETRY:cone:{"radius":"7 cm","height":"24 cm"}]
           - Prisma Segitiga (prism): alas segitiga, tinggi segitiga, tinggi prisma [GEOMETRY:prism:{"width":"6 cm","height":"8 cm","depth":"15 cm"}]
           - Limas Segiempat (pyramid): sisi alas, tinggi limas [GEOMETRY:pyramid:{"side":"10 cm","height":"12 cm"}]
           - Bola (sphere): jari-jari [GEOMETRY:sphere:{"radius":"14 cm"}]
        2. Aneka Bangun Gabungan (Konteks Kontekstual Nyata):
           - Tabung + Kerucut (ujung pensil / tangki roket): [GEOMETRY:combined_cylinder_cone:{"radius":"7 cm","cylinderHeight":"15 cm","coneHeight":"6 cm"}]
           - Tabung + Setengah Bola (kapsul obat / tangki silo peternakan): [GEOMETRY:combined_cylinder_hemisphere:{"radius":"7 cm","height":"14 cm"}]
           - Balok + Atap Prisma Segitiga (tenda perkemahan / rumah): [GEOMETRY:combined_cuboid_prism:{"width":"12 cm","depth":"8 cm","bottom_height":"10 cm","roof_height":"6 cm"}]
           - Balok + Kubus (podium juara / meja bertingkat): [GEOMETRY:combined_cuboid_cube:{"cuboid_width":"16 cm","cuboid_depth":"10 cm","cuboid_height":"8 cm","cube_side":"6 cm"}]
           - Kerucut + Setengah Bola (es krim cone): [GEOMETRY:combined_cone_hemisphere:{"radius":"7 cm","height":"12 cm"}]
           - Balok + Limas (tugu monumen): [GEOMETRY:combined_cuboid_pyramid:{"bottom_width":"12 cm","bottom_depth":"8 cm","bottom_height":"10 cm","top_height":"6 cm"}]
      * JIKA pengguna meminta materi bangun tertentu (misal: "Tabung", "Kubus", "Prisma Segitiga", "Kerucut", atau "Bola"), AI WAJIB membuat soal mengenai bangun tersebut dan DILARANG MENGGANTINYA menjadi balok dan limas!
      Contoh penggunaan tag GEOMETRY yang BENAR dengan seluruh ukuran lengkap:
      * Balok: [GEOMETRY:cuboid:{"width":"12 cm","height":"6 cm","depth":"8 cm"}]
      * Kubus: [GEOMETRY:cube:{"side":"8 cm"}]
      * Tabung: [GEOMETRY:cylinder:{"radius":"7 cm","height":"14 cm"}]
      * Kerucut: [GEOMETRY:cone:{"radius":"7 cm","height":"24 cm"}]
      * Prisma Segitiga: [GEOMETRY:prism:{"width":"6 cm","height":"8 cm","depth":"15 cm"}]
      * Limas Segiempat: [GEOMETRY:pyramid:{"side":"10 cm","height":"12 cm"}]
      * Bangun Gabungan Balok + Limas: [GEOMETRY:combined_cuboid_pyramid:{"bottom_width":"12 cm","bottom_depth":"8 cm","bottom_height":"10 cm","top_height":"6 cm"}]
      * Bangun Gabungan Tabung + Kerucut: [GEOMETRY:combined_cylinder_cone:{"radius":"7 cm","cylinderHeight":"10 cm","coneHeight":"6 cm"}]
      * Bangun Gabungan Balok + Atap Prisma: [GEOMETRY:combined_cuboid_prism:{"width":"12 cm","depth":"8 cm","bottom_height":"10 cm","roof_height":"6 cm"}]
    - Diagram (Charts): JIKA SOAL ATAU OPSI MEMINTA DIAGRAM (diagram batang/garis/lingkaran/venn/relasi/kartesius), Anda WAJIB mengisi field 'chartData'. UNTUK MENEMPATKAN DIAGRAM DI POSISI TERTENTU dalam teks (\`questionText\` atau opsi), Anda WAJIB menggunakan tag [CHART]. Jika Anda tidak menggunakan tag [CHART], diagram akan otomatis dirender di bagian paling bawah teks. Khusus untuk diagram venn himpunan, gunakan 'labels' untuk nama-nama himpunan (contoh: ["A", "B"] atau ["A", "B", "C"]) dan 'datasets.data' untuk nilainya. Untuk 2 himpunan, urutan nilai adalah: [Hanya A, Hanya B, Irisan A & B, Di Luar Himpunan, Semesta]. Untuk 3 himpunan, urutan nilai adalah: [Hanya A, Hanya B, Hanya C, Irisan A&B, Irisan A&C, Irisan B&C, Irisan A&B&C, Di Luar Himpunan, Semesta]. Khusus untuk relasi/fungsi (relation), gunakan 'labels' untuk nama himpunan (contoh: ["A", "B"]). 'datasets' ke-0 berisi data anggota domain (e.g. data: ["1", "2"]). 'datasets' ke-1 berisi data anggota kodomain. 'datasets' ke-2 berisi relasi dengan format "indexDomain-indexKodomain" (contoh: ["0-1", "1-2"]). Khusus diagram kartesius (cartesian), Anda WAJIB menyertakan field 'cartesianConfig' yang berisi 'xMin', 'xMax', 'yMin', 'yMax', 'xStep', dan 'yStep'. Dan 'datasets' berisi array of object dengan 'label' (UNTUK NAMA GARIS JIKA ADA), 'showLine' (boolean), serta titiknya ATAU fungsi matematikanya. JIKA fungsi matematika, beri property 'isFunction': true and 'functionStr' (misal "x^2 - 2x + 1" atau "2x" dalam sintaks JS/Matematika dasar). JIKA titik manual, beri property 'data' berupa array of object {x: number, y: number}.
    - INSTRUKSI KHUSUS DALAM KURUNG: Jika dalam referensi materi / kisi-kisi terdapat instruksi yang diapit dengan tanda kurung biasa '()' atau kurung siku '[]' (misal: "(sertakan diagram lingkaran)", "(sertakan tabel frekuensi)", atau "[sertakan gambar...]"), Anda WAJIB mematuhinya!
      * Jika diminta tabel: Buatlah tabel menggunakan format tabel Markdown murni.
      * Jika diminta diagram/grafik: Anda WAJIB mengisi property 'chartData' sesuai jenis diagram (bar/line/pie/venn/relation).
      ${config.includeImages ? `* STRATEGI MEMILIH CARA TERBAIK STIMULUS SOAL (FITUR GAMBAR & REPRESENTATIF AKTIF):
        Anda WAJIB memilih satu cara representasi TERBAIK untuk stimulus setiap butir soal sesuai materi yang diuji:
        1. Cara 'geometry' (Bangun Geometri Matematis): Gunakan tag [GEOMETRY:shape_name:{...}] jika butir soal menguji bangun datar/ruang/gabungan dengan dimensi angka spesifik (cm, m). Set 'visualStimulusType': "geometry".
        2. Cara 'chart' (Diagram Statistik & Hubungan): Gunakan tag [CHART] dan isi 'chartData' jika butir soal menguji data statistik (batang/garis/lingkaran), relasi/fungsi, diagram venn, atau kurva/titik koordinat kartesius. Set 'visualStimulusType': "chart".
        3. Cara 'table' (Tabel Markdown): Gunakan tabel data terstruktur Markdown untuk daftar frekuensi nilai, jadwal, atau perbandingan tekstual. Set 'visualStimulusType': "table".
        4. Cara 'wikimedia_photo' (Foto Otentik Nyata): Gunakan jika soal membutuhkan foto riil sejarah/tokoh pahlawan (Soekarno, Cut Nyak Dien), candi/monumen nyata (Borobudur, Prambanan, Monas), atau flora/fauna endemik nyata (Komodo, Rafflesia). Tuliskan 1-2 kata kunci bahasa Inggris pada 'imageSearchKeyword'. Set 'visualStimulusType': "wikimedia_photo".
        5. Cara 'ai_svg' (GENERATOR GAMBAR VEKTOR SVG AI OTOMATIS): TERBAIK dan SANGAT DIREKOMENDASIKAN untuk seluruh konsep IPA/Sains, biologi (organ tubuh, fotosintesis, rantai makanan, metamorfosis, daur hidup), fisika/bumi (siklus air, tata surya, gerhana, magnet, gaya), peta/denah konseptual, bagan alur proses (flowchart), infografis materi, atau ilustrasi kontekstual. Tuliskan deskripsi gambar ilmiah yang detail pada 'svgPrompt' dan pilih 'svgStyle' ("infographic", "diagram", "flowchart", "geometry", atau "flat_art"). Anda juga dapat menyisipkan tag [ai_svg: Deskripsi gambar ilmiah] di dalam 'questionText' pada letak stimulus yang diinginkan. Sistem akan OTOMATIS memanggil Generator Gambar AI untuk menggambar vektor SVG tajam langsung pada soal ini! Set 'visualStimulusType': "ai_svg".` : `* Jika diminta gambar/ilustrasi/foto: FITUR GAMBAR SEDANG DINONAKTIFKAN. ABAIKAN permintaan gambar/foto dan JANGAN menyisipkan placeholder gambar, instruksi gambar, maupun \`imageSearchKeyword\`. Sesuaikan narasinya agar tidak memerlukan gambar (misal dengan mendeskripsikan secara tekstual atau menggunakan tabel).`}
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
    
    ATURAN MUTLAK PENEMPATAN PILIHAN JAWABAN & DAFTAR PERNYATAAN (DILARANG SALAH TEMPAT & DILARANG TERPOTONG):
    - DILARANG KERAS MENULISKAN OPSI (A, B, C, D) ATAU NOMOR PERNYATAAN (1, 2, 3) DI DALAM 'questionText'!
    - Teks pertanyaan ('questionText') HANYA boleh berisi stimulus masalah (narasi/konteks/geometri) dan kalimat pertanyaan/instruksi.
    - PENTING PENEMPATAN TAG GAMBAR & GEOMETRI: Tempatkan tag [GEOMETRY:...] atau [ai_svg:...] pada baris tersendiri di antara narasi pengantar dan kalimat tanya. Jika ada kalimat pengantar sebelum gambar, selesaikan kalimatnya secara utuh (contoh: "Perhatikan miniatur rumah pada gambar berikut:"). JANGAN memutus kalimat di tengah jalan seperti "Bagian balok memiliki ukuran panjang [GEOMETRY...]".
    - Penempatan resmi sesuai jenis soal:
      1. Pilihan Ganda (PG):
         * 'questionText': Hanya stimulus & kalimat tanya (contoh: "Berdasarkan stimulus di atas, berapakah volume total bangun tersebut?"). DILARANG menuliskan "A. ...", "B. ...", "C. ...", "D. ..." di dalam 'questionText'!
         * 'options': WAJIB berisi 4-5 pilihan jawaban LENGKAP dengan nilai numerik dan satuan pasti tanpa awalan label "A. " atau "B. ". (Contoh: ["$1.152\\text{ cm}^3$", "$1.200\\text{ cm}^3$", "$1.440\\text{ cm}^3$", "$1.600\\text{ cm}^3$"]). DILARANG KERAS membuat opsi gantung atau terpotong tanpa angka!
         * 'correctAnswer': WAJIB berisi 1 jawaban benar yang teksnya persis sama dengan salah satu teks di 'options'. Acak letak jawaban benar agar variatif.
      2. Pilihan Ganda Kompleks (PGK MCMA):
         * 'questionText': Hanya stimulus & instruksi (contoh: "Berdasarkan stimulus di atas, pilihlah semua pernyataan yang benar!"). DILARANG menulis daftar butir (1), (2), (3) di dalam 'questionText'!
         * 'options': WAJIB berisi 3-5 butir opsi pernyataan LENGKAP dengan nilai/angka dan satuan matematis. DILARANG KERAS membuat opsi gantung yang tidak selesai (contoh SALAH: "Volume tabung tangki tersebut adalah "). Contoh opsi BENAR: "Volume tabung bagian bawah adalah $1.540\\text{ cm}^3$", "Volume kerucut bagian atas adalah $308\\text{ cm}^3$", "Volume total seluruh tangki adalah $1.848\\text{ cm}^3$".
         * 'correctAnswer': WAJIB berisi semua opsi yang benar, dipisahkan dengan tanda "|||" (contoh: "Opsi 1|||Opsi 3").
      3. Benar/Salah (PGK Kategori - WAJIB memuat angka dan satuan lengkap pada setiap baris):
         * 'questionText': Hanya narasi stimulus masalah dan pengantar (contoh: "Perhatikan stimulus gambar bangun ruang berikut! Tentukan nilai kebenaran dari setiap pernyataan berikut.").
         * DILARANG KERAS menuliskan daftar butir "1. ...", "2. ...", "3. ..." di dalam 'questionText'!
         * 'trueFalseRows': WAJIB berisi array 3 baris pernyataan matematis/faktual lengkap dan spesifik dengan klaim angka dan satuan utuh.
           Contoh format yang WAJIB dipatuhi:
           [
             { "text": "Volume tabung bagian bawah adalah $1.540\\text{ cm}^3$.", "answer": true },
             { "text": "Volume kerucut bagian atas adalah $308\\text{ cm}^3$.", "answer": true },
             { "text": "Volume total seluruh bangun adalah $2.400\\text{ cm}^3$.", "answer": false }
           ]
         * DILARANG KERAS hanya menuliskan nama besaran atau kalimat gantung seperti "Volume bangun adalah " atau "Tinggi bangun adalah "! Seluruh pernyataan harus berupa kalimat proposisi utuh yang dapat dinilai Benar atau Salah.
         * Setiap pernyataan WAJIB memiliki nilai kebenaran pasti (boolean 'answer': true atau false).
         * 'correctAnswer': WAJIB berisi ringkasan nilai kebenaran pasti (contoh: "Pernyataan 1: Benar, Pernyataan 2: Benar, Pernyataan 3: Salah").
      4. Menjodohkan:
         * 'questionText': Hanya stimulus dan kalimat instruksi menjodohkan. DILARANG membuat tabel daftar jodoh di dalam 'questionText'!
         * 'matchingPairs': WAJIB berisi array 3-5 pasangan { "left": "item kiri", "right": "pasangan kanan yang cocok dengan nilai/deskripsi lengkap" }.
         * 'correctAnswer': WAJIB berisi daftar pasangan yang benar.
      5. Uraian Singkat / Isian:
         * 'correctAnswer': WAJIB berisi jawaban pasti / angka hasil perhitungan yang presisi (contoh: "$1.152\\text{ cm}^3$"). DILARANG KOSONG!
      6. Esai:
         * 'correctAnswer': WAJIB berisi rubrik atau poin-poin uraian jawaban lengkap yang pasti.
      7. KEPASTIAN KUNCI JAWABAN (100% PASTI & DETERMINISTIK):
         * SEMUA butir soal WAJIB memiliki kunci jawaban pasti yang dibuktikan pada 'explanation'. DILARANG KOSONG dan DILARANG AMBIGU.
    
    STIMULUS VISUAL & GAMBAR REPRESENTATIF (TKA KEMENDIKDASMEN):
    - Soal asesmen TKA mengedepankan stimulus kontekstual yang kaya visual (grafik, denah, diagram, foto/ilustrasi benda nyata).
    - Pilih cara terbaik: 'geometry' (bangun geometri [GEOMETRY:...]), 'chart' (grafik data statistik [CHART]), 'table' (tabel data), 'wikimedia_photo' (foto nyata sejarah/tokoh), atau 'ai_svg' (gambar vektor SVG otomatis untuk sains/siklus/organ/proses/infografis).
    - ${config.includeImages ? `Fitur gambar aktif! Untuk konsep sains, proses, siklus, biologi, atau infografis, WAJIB isi 'svgPrompt' dan pilih 'svgStyle' (ai_svg). Untuk foto nyata tokoh/candi, isi 'imageSearchKeyword'.` : `Fitur gambar dinonaktifkan.`}
    
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
    questionText: { 
      type: Type.STRING, 
      description: "Teks pertanyaan dalam format Markdown. HANYA berisi stimulus narasi konteks masalah, gambar [GEOMETRY:...]/[ai_svg:...], dan kalimat tanya/instruksi. DILARANG KERAS memuat daftar opsi A/B/C/D atau nomor pernyataan 1/2/3 di sini!" 
    },
    options: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Array pilihan jawaban (WAJIB diisi 4-5 opsi untuk Pilihan Ganda dan 3-5 opsi pernyataan untuk Pilihan Ganda Kompleks). SETIAP OPSI HARUS LENGKAP dengan nilai numerik, satuan, dan kalimat utuh. DILARANG KERAS membuat opsi gantung tanpa angka (contoh SALAH: 'Volume balok adalah ')!"
    },
    optionCharts: {
      type: Type.ARRAY,
      items: chartDataSchema,
      description: "Data diagram untuk setiap opsi jawaban (opsional, urutan harus sesuai dengan options)"
    },
    explanation: { type: Type.STRING, description: "Penjelasan matematis langkah demi langkah atau penalaran logis untuk memastikan jawaban akurat. WAJIB diisi untuk soal hitungan, geometri, fisika, kimia, matematika, dll agar hasil perhitungan benar." },
    correctAnswer: { type: Type.STRING, description: "Kunci jawaban pasti yang 100% akurat. Untuk PG: sama persis dengan salah satu opsi. Untuk PGK: opsi-opsi benar dipisah tanda '|||'. Untuk Benar/Salah: ringkasan nilai kebenaran. Untuk Isian/Esai: jawaban pasti." },
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
          text: { type: Type.STRING, description: "Teks butir pernyataan lengkap dengan klaim nilai angka/satuan dan bermakna matematis/faktual untuk dinilai benar atau salah. DILARANG KERAS hanya menuliskan nama besaran seperti 'Volume balok adalah '!" },
          answer: { type: Type.BOOLEAN, description: "Nilai kebenaran pasti: true jika Benar/Sesuai, false jika Salah/Tidak Sesuai" },
          chartData: chartDataSchema
        },
        required: ["text", "answer"]
      },
      description: "Array 3 baris butir pernyataan matematis/faktual lengkap berangka dan bersatuan untuk soal Benar/Salah. WAJIB diisi jika bentuk soal adalah Benar/Salah! DILARANG ditulis di questionText dan DILARANG diisi placeholder!"
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
    visualStimulusType: {
      type: Type.STRING,
      enum: ["none", "geometry", "chart", "table", "wikimedia_photo", "ai_svg"],
      description: "Cara stimulus visual terbaik untuk butir soal ini: 'geometry' (bangun ruang/datar), 'chart' (grafik data), 'table' (tabel data), 'wikimedia_photo' (foto pahlawan/tempat bersejarah nyata), atau 'ai_svg' (diagram sains, siklus, organ, infografis konsep, ilustrasi materi)."
    },
    svgPrompt: {
      type: Type.STRING,
      description: "Deskripsi detail visual jika visualStimulusType = 'ai_svg' untuk digambar oleh Generator Gambar AI secara otomatis (contoh: 'Bagan daur siklus air lengkap dengan proses evaporasi, kondensasi, presipitasi, dan infiltrasi')."
    },
    svgStyle: {
      type: Type.STRING,
      enum: ["infographic", "diagram", "flowchart", "geometry", "flat_art"],
      description: "Gaya diagram SVG yang diinginkan: 'infographic', 'diagram', 'flowchart', 'geometry', atau 'flat_art'."
    },
    imageSearchKeyword: { 
      type: Type.STRING, 
      description: config.includeImages 
        ? "1-2 kata kunci bahasa Inggris spesifik untuk pencarian foto referensi di Wikimedia jika visualStimulusType = 'wikimedia_photo' (contoh: 'borobudur temple', 'komodo dragon', 'soekarno')." 
        : "FITUR GAMBAR NONAKTIF. Abaikan field ini." 
    }
  };

  const combinedDiff = selectedDifficulties.join(' ').toUpperCase();
  const combinedTypes = selectedTypes.join(' ').toUpperCase();
  const combinedText = `${combinedDiff} ${combinedTypes} ${config.subject || ''} ${config.blueprint || ''}`.toUpperCase();
  
  const isLevel6 = combinedText.includes('C6') || combinedText.includes('LEVEL 6');
  
  let modelsToTry: string[] = ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  if (isLevel6) {
      modelsToTry = ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  }

  const replaceGeometryPlaceholders = (text: string) => {
      if (!text) return text;
      return text.replace(/\[GEOMETRY:([a-zA-Z0-9_-]+)(?:[:|]([\s\S]*?))?\]/gi, (match, shape, labelsStr) => {
          try {
              const labels = parseGeometryLabels(labelsStr || "{}");
              const svgContent = generateGeometrySVG(shape, labels, "#e2e8f0", "#0f172a", false, true, true);
              return `<span class="geometry-shape" contenteditable="false" data-shape="${shape}" data-labels="${encodeURIComponent(JSON.stringify(labels))}" style="display: block; max-width: 250px; margin: 0.35rem auto; text-align: center; line-height: 1;">${svgContent}</span>`;
          } catch (e) {
              console.error("Failed to parse geometry labels:", e);
              return match;
          }
      });
  };

  const replaceChartPlaceholders = (text: string, _hasChart?: boolean) => {
      if (!text) return text;
      const CHART_PLACEHOLDER_HTML = `<br/><span class="chart-placeholder" contenteditable="false" data-chart="true" style="display: block; width: 100%; max-width: 600px; min-height: 100px; padding: 10px; background: #f8fafc; border: 2px dashed #cbd5e1; text-align: center; border-radius: 8px; margin: 10px auto; color: #475569; font-weight: bold; cursor: pointer;"><span class="chart-placeholder-text" style="display: block; padding: 40px 0;">📊 Diagram (Klik untuk mengedit)</span></span><br/>`;
      
      if (/\\?\[(CHART|DIAGRAM|GRAFIK).*?\\?\]/i.test(text)) {
          return text.replace(/\\?\[(CHART|DIAGRAM|GRAFIK).*?\\?\]/gi, CHART_PLACEHOLDER_HTML);
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

    const userCategoryConstraint = config.category?.trim();
    const userKisiKisiConstraint = config.kisiKisi?.trim();
    const userBlueprintConstraint = config.blueprint?.trim();

    const batchPrompt = `
      ======================================================================
      PERINGATAN PRIORITAS TERTINGGI (HARD CONSTRAINT - MUTLAK DIIKUTI):
      Pengguna telah menetapkan mata pelajaran, kategori materi, tingkat kognitif (level), dan kisi-kisi soal secara spesifik.
      Anda DILARANG KERAS membuat soal di luar data yang telah ditetapkan ini!
      DILARANG membuat soal tentang topik/materi/konteks acak lain yang tidak diminta!
      
      TARGET PARAMETER WAJIB DARI PENGGUNA:
      - MATA PELAJARAN / MATERI: "${config.subject}"
      ${userCategoryConstraint ? `- KATEGORI MATERI (MUTLAK WAJIB): "${userCategoryConstraint}"` : ''}
      - TINGKAT KOGNITIF (MUTLAK WAJIB SESUAI DISTRIBUSI): Lihat TABEL DISTRIBUSI di bawah.
      ${userKisiKisiConstraint ? `- KISI-KISI / INDIKATOR SOAL (MUTLAK WAJIB): "${userKisiKisiConstraint}"` : ''}
      ${userBlueprintConstraint ? `- PANDUAN KISI-KISI & DESKRIPSI RINCI PENGGUNA:\n${userBlueprintConstraint}` : ''}
      ======================================================================

      Buatlah tepat ${batchCount} butir soal yang 100% BERFOKUS PENUH dan SELARAS dengan target materi di atas.
      
      TABEL DISTRIBUSI WAJIB PER BUTIR SOAL (${batchCount} Butir):
      ${slotDistribution.join('\n')}
      
      ATURAN KELENGKAPAN & PENEMPATAN WAJIB (DILARANG SALAH TEMPAT, DILARANG KOSONG):
      - PERINGATAN KERAS: DILARANG menuliskan opsi A, B, C, D atau daftar nomor pernyataan (1, 2, 3) di dalam 'questionText'!
      - 'questionText' HANYA untuk stimulus narasi, konteks masalah/geometri, dan kalimat pertanyaan.
      - Tempatkan seluruh pilihan/pernyataan HANYA pada field yang sudah disediakan:
      1. Untuk soal berjenis "Pilihan Ganda":
         - 'questionType': "Pilihan Ganda"
         - 'questionText': Hanya stimulus masalah & kalimat tanya. DILARANG memuat A. ..., B. ... di sini!
         - 'options': WAJIB berisi 4 opsi jawaban lengkap (atau 5 opsi jika SMA) berupa teks pilihan murni. DILARANG KOSONG!
         - 'correctAnswer': WAJIB berisi 1 jawaban benar yang teksnya persis sama dengan salah satu opsi.
         - PENTING: Acak letak jawaban benar agar variatif (tidak selalu opsi pertama/A).
      2. Untuk soal berjenis "Pilihan Ganda Kompleks":
         - 'questionType': "Pilihan Ganda Kompleks"
         - 'questionText': Hanya stimulus & kalimat instruksi memilih jawaban yang benar.
         - 'options': WAJIB berisi 3-5 opsi pernyataan. DILARANG KOSONG!
         - 'correctAnswer': WAJIB berisi semua opsi yang benar, dipisahkan dengan tanda "|||" (contoh: "Opsi 1|||Opsi 3").
      3. Untuk soal berjenis "Benar/Salah":
         - 'questionType': "Benar/Salah"
         - 'questionText': Hanya stimulus konteks/pengantar. DILARANG menulis daftar pernyataan di questionText!
         - 'trueFalseRows': WAJIB berisi array 3 baris pernyataan matematis/faktual lengkap dan bermakna:
           [
             { "text": "Pernyataan proposisi faktual/rumus spesifik 1", "answer": true/false },
             { "text": "Pernyataan proposisi faktual/rumus spesifik 2", "answer": true/false },
             { "text": "Pernyataan proposisi faktual/rumus spesifik 3", "answer": true/false }
           ]
           DILARANG KOSONG dan DILARANG MENGGUNAKAN TEKS PLACEHOLDER UMUM!
         - 'correctAnswer': WAJIB berisi ringkasan nilai kebenaran pasti (contoh: "Pernyataan 1: Benar, Pernyataan 2: Salah, Pernyataan 3: Benar").
      4. Untuk soal berjenis "Menjodohkan":
         - 'questionType': "Menjodohkan"
         - 'questionText': Hanya stimulus dan kalimat perintah menjodohkan.
         - 'matchingPairs': WAJIB berisi array 3-5 pasangan { "left": "item/pernyataan kiri", "right": "pasangan kanan yang cocok" }. DILARANG KOSONG!
         - 'correctAnswer': WAJIB berisi daftar pasangan yang benar.
      5. Untuk soal berjenis "Uraian Singkat":
         - 'questionType': "Uraian Singkat"
         - 'correctAnswer': WAJIB berisi jawaban singkat / kata kunci / angka hasil perhitungan yang presisi dan pasti. DILARANG KOSONG!
      6. Untuk soal berjenis "Esai":
         - 'questionType': "Esai"
         - 'correctAnswer': WAJIB berisi rubrik atau poin-poin uraian penyelesaian lengkap yang pasti.
      7. KEPASTIAN KUNCI JAWABAN:
         - SETIAP soal WAJIB memiliki jawaban yang pasti, terbukti, dan diverifikasi melalui 'explanation'.

      PENGATURAN KISI-KISI, KATEGORI, DAN TINGKAT KESULITAN:
      1. KEPATUHAN MATERI: Seluruh butir soal WAJIB menguji materi yang tercantum pada TARGET PARAMETER di atas.
      2. FIELD 'category': ${userCategoryConstraint ? `WAJIB diisi persis "${userCategoryConstraint}".` : 'WAJIB diisi dengan sub-topik materi spesifik butir soal tersebut.'}
      3. FIELD 'level': WAJIB diisi persis sesuai dengan tingkat kognitif yang ditugaskan pada tabel distribusi di atas untuk butir soal tersebut.
      4. FIELD 'kisiKisi': ${userKisiKisiConstraint ? `WAJIB menggunakan indikator: "${userKisiKisiConstraint}".` : 'WAJIB menuliskan KISI-KISI SPESIFIK / INDIKATOR SOAL OPERASIONAL pada field kisiKisi untuk butir soal ini (format operasional: "Disajikan stimulus [konteks/gambar], peserta didik dapat [tindakan kognitif] dengan tepat").'}
      5. Pastikan kunci jawaban ('correctAnswer') 100% akurat dan dibuktikan melalui 'explanation'.
      ${config.includeImages ? `
      6. STIMULUS REPRESENTATIF TERBAIK (includeImages=true):
         - Fitur 'Sertakan Gambar, Geometri Bangun & Diagram Representatif' AKTIF.
         - Analisis materi soal dan tentukan CARA TERBAIK:
           * Geometri bangun datar/ruang/gabungan berdimensi angka? Pilih 'geometry' dan sertakan tag [GEOMETRY:...].
           * Data statistik / diagram frekuensi / kartesius / venn / relasi? Pilih 'chart' dan sertakan tag [CHART] & 'chartData'.
           * Tabel data terstruktur / daftar frekuensi? Pilih 'table' (tabel Markdown murni).
           * Foto pahlawan/tempat/monumen/spesies otentik nyata? Pilih 'wikimedia_photo' dan isi 'imageSearchKeyword'.
           * Konsep sains/IPA, biologi, siklus/daur proses, organ tubuh, rantai makanan, tata surya, infografis materi, atau ilustrasi konsep? Pilih 'ai_svg', isi 'svgPrompt' dan 'svgStyle'. Generator Gambar AI akan langsung menggambar vektor SVG tajam stimulus tersebut secara otomatis!
      ` : ''}
    `;

    let questions: {
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
    }[] = [];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const res = await fetch("/api/generate-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: batchPrompt, systemInstruction, modelsToTry, properties }),
          signal: controller.signal
      });
      clearTimeout(timeoutId);

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
          const rawHtml = await res.text();
          console.error("Non-JSON response from server:", rawHtml.slice(0, 300));
          throw new Error("Server mengembalikan respons non-JSON. Safe Fallback diaktifkan.");
      }
      const data = await res.json();
      if (!data.success) {
          throw new Error(data.error || "Failed to generate questions");
      }
      questions = JSON.parse(data.text || "[]");
    } catch (batchErr: any) {
      console.warn(`[Safe Fallback] Batch offset ${startIndex} dialihkan ke Fallback Cerdas kurikulum:`, batchErr?.message);
      return generateSmartFallbackQuestions({
        ...config,
        count: batchCount,
      }, batchErr?.message || "Safe Fallback Aktif");
    }

    // Helper: Cek apakah baris pernyataan Benar/Salah berupa placeholder/dummy
    const isDummyStatement = (text: string): boolean => {
      const raw = (text || "").replace(/<[^>]*>/g, "").trim().toLowerCase();
      if (!raw || raw.length < 5) return true;
      if (/^(pernyataan\s*[1-5](\s*terkait\s*(konsep|fakta|hasil)?)?|statement\s*[1-5])$/i.test(raw)) return true;
      if (/^(opsi\s*[a-e1-5]|pilihan\s*[a-e1-5])$/i.test(raw)) return true;
      return false;
    };

    // Helper: Ekstrak parameter bentuk geometri dari teks soal atau penjelasan untuk auto-repair jika opsi/pernyataan terpotong
    const extractContextShapeFromText = (text: string, explanation?: string): { shape: string; labels: Record<string, string> } | null => {
      const combined = `${text || ''} ${explanation || ''}`;
      const match = combined.match(/\[GEOMETRY:([a-zA-Z0-9_]+):(\{.*?\})\]/i);
      if (match) {
        try {
          const shape = match[1].toLowerCase();
          const labels = parseGeometryLabels(match[2]);
          return { shape, labels };
        } catch {
          return null;
        }
      }
      return null;
    };

    // Helper: Memperbaiki secara cerdas teks stimulus, opsi pilihan, atau baris pernyataan yang terpotong di tengah jalan
    const autoRepairIncompleteContent = (
      rawText: string,
      contextShape?: { shape: string; labels: Record<string, string> } | null,
      fallbackField?: string,
      answerBool?: boolean
    ): string => {
      if (!rawText) return rawText || "";
      let text = rawText.trim();

      // 1. Perbaiki jika narasi stimulus terpotong tepat sebelum tag geometry atau akhir baris
      text = text.replace(/(?:memiliki|dengan)\s+ukuran\s+panjang\s*$/i, "memiliki ukuran sebagaimana tampak pada gambar berikut:");
      text = text.replace(/(?:memiliki|dengan)\s+dimensi\s*$/i, "memiliki dimensi sebagaimana tampak pada gambar berikut:");
      text = text.replace(/(?:sebagai\s+berikut|adalah|yaitu)\s*:\s*$/i, "adalah sebagai berikut:");

      // 2. Cek apakah teks opsi / pernyataan berakhiran menggantung (tanpa angka/predikat lengkap)
      const isDangling = /(?:adalah|sebesar|yaitu|sebanyak|berukuran|sama\s*dengan|=|:)\s*$/i.test(text) ||
                         /^(?:volume|luas|keliling|tinggi|panjang|lebar|jari-jari|diameter)\s+(?:balok|kubus|limas|prisma|tabung|kerucut|bangun|atap|alas|badan|total|gabungan)?\s*(?:adalah|sebesar|yaitu|=|:)?\s*$/i.test(text);

      if (isDangling) {
        // Hilangkan kata sambung menggantung di akhir
        const cleanStem = text.replace(/(?:\s*(?:adalah|sebesar|yaitu|sebanyak|berukuran|sama\s*dengan|=|:))+\s*$/i, '').trim();

        if (contextShape) {
          const { shape, labels } = contextShape;
          const w = extractNum(labels.width || labels.bottom_width || labels.side || "12");
          const d = extractNum(labels.depth || labels.bottom_depth || labels.side || "8");
          const h1 = extractNum(labels.bottom_height || labels.height || labels.cylinderHeight || "10");
          const h2 = extractNum(labels.roof_height || labels.top_height || labels.coneHeight || labels.height || "6");
          const r = extractNum(labels.radius || "7");

          const volBalok = w * d * h1; // e.g. 12 * 8 * 10 = 960
          const volLimas = Math.round((1 / 3) * w * d * h2); // e.g. 1/3 * 12 * 8 * 6 = 192
          const volPrisma = Math.round(0.5 * w * h2 * d); // e.g. 0.5 * 12 * 6 * 8 = 288
          const volTabung = Math.round((22 / 7) * r * r * h1);
          const volKerucut = Math.round((1 / 3) * (22 / 7) * r * r * h2);

          const isLimas = shape.includes('pyramid') || shape.includes('limas');
          const isPrism = shape.includes('prism') || shape.includes('prisma');
          const isCone = shape.includes('cone') || shape.includes('kerucut');

          const volTop = isLimas ? volLimas : isPrism ? volPrisma : isCone ? volKerucut : volLimas;
          const volTotal = volBalok + volTop;
          const luasAlas = w * d;

          const lowerStem = cleanStem.toLowerCase();

          if (lowerStem.includes('total') || lowerStem.includes('gabungan') || lowerStem.includes('seluruh')) {
            const val = answerBool === false ? Math.round(volTotal * 1.25) : volTotal;
            return `${cleanStem || 'Volume total seluruh bangun gabungan'} adalah $${val.toLocaleString('id-ID')}\\text{ cm}^3$.`;
          }
          if (lowerStem.includes('limas') || lowerStem.includes('atap') || lowerStem.includes('kerucut') || lowerStem.includes('prisma') || lowerStem.includes('atas')) {
            const val = answerBool === false ? Math.round(volTop * 1.5) : volTop;
            return `${cleanStem || 'Volume bagian atap'} adalah $${val.toLocaleString('id-ID')}\\text{ cm}^3$.`;
          }
          if (lowerStem.includes('balok') || lowerStem.includes('tabung') || lowerStem.includes('bawah') || lowerStem.includes('badan')) {
            const val = answerBool === false ? Math.round(volBalok * 0.75) : volBalok;
            return `${cleanStem || 'Volume balok bagian bawah'} adalah $${val.toLocaleString('id-ID')}\\text{ cm}^3$.`;
          }
          if (lowerStem.includes('alas') || lowerStem.includes('luas')) {
            const val = answerBool === false ? Math.round(luasAlas * 1.2) : luasAlas;
            return `${cleanStem || 'Luas alas balok'} adalah $${val.toLocaleString('id-ID')}\\text{ cm}^2$.`;
          }
          if (lowerStem.includes('tinggi')) {
            const val = answerBool === false ? h2 + 4 : h2;
            return `${cleanStem || 'Tinggi atap limas'} adalah $${val}\\text{ cm}$.`;
          }

          // Default fallback dengan geometri
          const val = answerBool === false ? Math.round(volBalok * 1.2) : volBalok;
          return `${cleanStem || 'Volume bangun tersebut'} adalah $${val.toLocaleString('id-ID')}\\text{ cm}^3$.`;
        }

        // Jika tanpa geometri tapi ada fallback string
        if (fallbackField) {
          return `${cleanStem} ${fallbackField}`;
        }

        return `${cleanStem} bernilai tepat sesuai hasil analisis pada stimulus.`;
      }

      return text;
    };

    // Helper: Ekstrak nomor butir pernyataan dari questionText jika AI salah menaruhnya di dalam teks soal
    const extractStatementsFromText = (text: string): { cleanText: string; statements: string[] } | null => {
      if (!text) return null;
      const lines = text.split('\n');
      const statementIndices: number[] = [];
      const extracted: string[] = [];

      const numberedRegex = /^\s*(?:\((\d+)\)|\[(\d+)\]|(\d+)[.)])\s+(.+)$/;
      lines.forEach((line, idx) => {
        const m = line.match(numberedRegex);
        if (m && m[4].trim().length > 3) {
          statementIndices.push(idx);
          extracted.push(m[4].trim());
        }
      });

      if (extracted.length >= 2 && statementIndices.length >= 2) {
        const cleanLines = lines.filter((_, idx) => !statementIndices.includes(idx));
        return {
          cleanText: cleanLines.join('\n').trim(),
          statements: extracted
        };
      }
      return null;
    };

    // Helper: Ekstrak opsi pilihan (A, B, C, D) dari questionText jika AI menaruh pilihan di dalam teks soal
    const extractOptionsFromText = (text: string): { cleanText: string; options: string[] } | null => {
      if (!text) return null;
      const lines = text.split('\n');
      const optionIndices: number[] = [];
      const extracted: string[] = [];

      const optionRegex = /^\s*(?:[A-Ea-e][.)]|\([A-Ea-e]\))\s+(.+)$/;
      lines.forEach((line, idx) => {
        const m = line.match(optionRegex);
        if (m && m[1].trim().length > 0) {
          optionIndices.push(idx);
          extracted.push(m[1].trim());
        }
      });

      if (extracted.length >= 3) {
        const cleanLines = lines.filter((_, idx) => !optionIndices.includes(idx));
        return {
          cleanText: cleanLines.join('\n').trim(),
          options: extracted
        };
      }
      return null;
    };

    // Helper: Parse urutan nilai kebenaran Benar/Salah dari string kunci jawaban
    const parseBooleanSequence = (answerStr: string, count: number): (boolean | null)[] => {
      const res: (boolean | null)[] = Array(count).fill(null);
      if (!answerStr) return res;

      const explicitRegex = /(?:pernyataan\s*|butir\s*|#\s*)?([1-5])\s*[:.)-]?\s*(benar|salah|true|false|sesuai|tidak\s*sesuai|ya|tidak|b|s)/gi;
      let match;
      let matchedAny = false;
      while ((match = explicitRegex.exec(answerStr)) !== null) {
        matchedAny = true;
        const idx = parseInt(match[1], 10) - 1;
        if (idx >= 0 && idx < count) {
          const val = match[2].toLowerCase();
          res[idx] = (val.startsWith('b') || val === 'true' || val === 'sesuai' || val === 'ya');
        }
      }

      if (!matchedAny) {
        const tokens = answerStr.split(/[,;/|\n]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
        if (tokens.length >= 2) {
          tokens.forEach((token, idx) => {
            if (idx < count) {
              if (token.startsWith('b') || token === 'true' || token === 'sesuai' || token === 'ya') {
                res[idx] = true;
              } else if (token.startsWith('s') || token === 'false' || token.includes('tidak')) {
                res[idx] = false;
              }
            }
          });
        }
      }
      return res;
    };

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

        // --- DETEKSI KONTEKS GEOMETRI / STIMULUS ---
        let workingQuestionText = q.questionText || '';
        const contextShape = extractContextShapeFromText(workingQuestionText, q.explanation);

        // Auto-repair stimulus text jika terpotong di pengantar
        workingQuestionText = autoRepairIncompleteContent(workingQuestionText, contextShape);

        // --- FILTER ANTI-SALAH TEMPAT PILIHAN / PERNYATAAN ---
        if (currentQuestionType === 'TRUE_FALSE') {
            const extracted = extractStatementsFromText(workingQuestionText);
            const hasRows = q.trueFalseRows && q.trueFalseRows.length > 0;
            const rowsAreDummy = hasRows && q.trueFalseRows.every(r => isDummyStatement(r.text));

            if (extracted && (!hasRows || rowsAreDummy)) {
                q.trueFalseRows = extracted.statements.map((stmt, sIdx) => ({
                    text: stmt,
                    answer: sIdx % 2 === 0
                }));
                workingQuestionText = extracted.cleanText;
            } else if (extracted && hasRows) {
                workingQuestionText = extracted.cleanText;
            }
        } else if (currentQuestionType === 'MULTIPLE_CHOICE' || currentQuestionType === 'COMPLEX_MULTIPLE_CHOICE') {
            const extracted = extractOptionsFromText(workingQuestionText);
            if (extracted) {
                if (!q.options || q.options.length < 2) {
                    q.options = extracted.options;
                }
                workingQuestionText = extracted.cleanText;
            }
        }

        // Bersihkan prefix label 'A. ', 'B. ', dll dari array options dan perbaiki jika ada opsi menggantung
        if (q.options && q.options.length > 0) {
            q.options = q.options.map((opt, optIdx) => {
                let cleanOpt = (opt || '').replace(/^\s*(?:[A-Ea-e][.)]|\([A-Ea-e]\))\s+/, '').trim();
                cleanOpt = autoRepairIncompleteContent(cleanOpt, contextShape, `sebesar nilai alternatif ${optIdx + 1}`);
                return cleanOpt;
            });
        }

        const stripOuterSingleParagraph = (htmlStr: string) => {
            let str = (htmlStr || '').trim();
            if (str.startsWith('<p>') && str.endsWith('</p>') && (str.match(/<p>/g) || []).length === 1) {
                str = str.slice(3, -4).trim();
            }
            return str;
        };

        const formatContent = (text: string, hasChart?: boolean) => {
            return replaceGeometryPlaceholders(replaceChartPlaceholders(markdownToHtml(text || ''), hasChart));
        };

        const hasMainChart = !!q.chartData;
        const questionText = formatContent(workingQuestionText, hasMainChart);

        let options = q.options && q.options.length > 0
            ? q.options.map((opt: string, i: number) => stripOuterSingleParagraph(formatContent(opt, !!q.optionCharts?.[i])))
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
                    stripOuterSingleParagraph(formatContent(baseAns, false)),
                    stripOuterSingleParagraph(formatContent("Pilihan alternatif B", false)),
                    stripOuterSingleParagraph(formatContent("Pilihan alternatif C", false)),
                    stripOuterSingleParagraph(formatContent("Pilihan alternatif D", false)),
                ];
            }

            const htmlCorrectAnswer = stripOuterSingleParagraph(formatContent(String(correctAnswer), !!q.correctAnswerChart));
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
                    formatContent("Pernyataan 1", false),
                    formatContent("Pernyataan 2", false),
                    formatContent("Pernyataan 3", false),
                    formatContent("Pernyataan 4", false),
                ];
            }

            const splitAnswers = parseList(correctAnswer);
            const mappedAnswers = splitAnswers.map(ans => {
                const htmlAns = formatContent(ans, !!q.correctAnswerChart);
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
        } else if (currentQuestionType === 'MATCHING') {
            options = undefined;
            const rawPairs = q.matchingPairs || [];
            if (rawPairs.length > 0) {
                correctAnswer = rawPairs.map((p: any) => `${p.left} -> ${p.right}`).join(', ');
            } else if (!correctAnswer || correctAnswer === '""') {
                correctAnswer = "Pasangan konsep dan deskripsi yang sesuai.";
            }
        } else if (currentQuestionType === 'FILL_IN_THE_BLANK') {
            options = undefined;
            if (!correctAnswer || String(correctAnswer).trim() === '' || correctAnswer === '""') {
                const numMatch = (q.explanation || '').match(/=\s*([0-9.,]+(?:\s*[a-zA-Z^°]+)?)/);
                correctAnswer = numMatch ? numMatch[1].trim() : (q.explanation?.trim() || "Jawaban Benar");
            }
        } else if (currentQuestionType === 'ESSAY') {
            options = undefined;
            if (!correctAnswer || String(correctAnswer).trim() === '' || correctAnswer === '""') {
                correctAnswer = q.explanation?.trim() || "Rubrik penyelesaian lengkap sesuai tahapan konsep yang diuji.";
            }
        } else {
            correctAnswer = formatContent(String(correctAnswer), !!q.correctAnswerChart);
        }

        let specificKisiKisi = config.kisiKisi?.trim() || q.kisiKisi?.trim() || "";
        const isGeneralBlueprint = !specificKisiKisi || 
            (specificKisiKisi.includes("Standar TKA") && specificKisiKisi.includes("\n") && specificKisiKisi.length > 150);

        if (isGeneralBlueprint) {
            const topic = config.category?.trim() || q.category?.trim() || config.subject || "materi pokok";
            const kognitif = expectedDiff || q.level?.trim() || "Penalaran";
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
            kisiKisi: config.kisiKisi?.trim() || specificKisiKisi,
            level: expectedDiff || q.level?.trim() || "Level 3 - Penalaran (Reasoning / HOTS)",
            category: config.category?.trim() || q.category?.trim() || config.subject || "Umum",
            chartData: q.chartData,
            imagePrompt: q.imagePrompt,
            imageSearchKeyword: (q as any).imageSearchKeyword
        };
        
        if (currentQuestionType === 'TRUE_FALSE') {
            const rawRows = (q.trueFalseRows && q.trueFalseRows.length > 0)
                ? q.trueFalseRows
                : [
                    { text: `Hasil perhitungan besaran pada stimulus memenuhi persamaan dan rumus yang berlaku.`, answer: true },
                    { text: `Nilai variabel berbanding terbalik terhadap parameter utama dalam pengujian.`, answer: false },
                    { text: `Kesimpulan matematis yang diperoleh konsisten dengan data pada stimulus.`, answer: true }
                ];

            const boolSeq = parseBooleanSequence(String(q.correctAnswer || ''), rawRows.length);

            mappedQ.trueFalseRows = rawRows.map((r: { text: string; answer: string | boolean | number; chartData?: ChartData }, rIdx: number) => {
                let boolAnswer = !!r.answer;
                if (boolSeq[rIdx] !== null) {
                    boolAnswer = boolSeq[rIdx]!;
                } else if (typeof r.answer === 'string') {
                    const lower = r.answer.toLowerCase();
                    if (lower === 'false' || lower === 'salah' || lower === '0' || lower === 'tidak' || lower.includes('tidak')) {
                        boolAnswer = false;
                    } else if (lower === 'true' || lower === 'benar' || lower === '1' || lower === 'ya' || lower === 'sesuai') {
                        boolAnswer = true;
                    }
                }

                let rowText = r.text || '';
                // Auto-repair dangling / incomplete sentence stems
                rowText = autoRepairIncompleteContent(rowText, contextShape, `memiliki nilai yang ${boolAnswer ? 'tepat' : 'berbeda'} berdasarkan stimulus.`, boolAnswer);

                if (isDummyStatement(rowText)) {
                    rowText = `Pernyataan ${rIdx + 1} terkait ${mappedQ.category}: nilai yang diperoleh dari stimulus adalah ${boolAnswer ? 'benar' : 'tidak sesuai fakta'}.`;
                }

                return {
                    text: formatContent(rowText, !!r.chartData),
                    answer: boolAnswer,
                    chartData: r.chartData
                };
            });

            // Kunci jawaban pasti untuk Benar/Salah selalu terstruktur ringkas dan pasti
            mappedQ.correctAnswer = mappedQ.trueFalseRows
                .map((r, i) => `Pernyataan ${i + 1}: ${r.answer ? 'Benar' : 'Salah'}`)
                .join(', ');
        }

        if (currentQuestionType === 'MATCHING') {
            if (q.matchingPairs && q.matchingPairs.length > 0) {
                mappedQ.matchingPairs = q.matchingPairs.map((p: { left: string; right: string; leftChart?: ChartData; rightChart?: ChartData }) => ({
                    left: formatContent(p.left || '', !!p.leftChart),
                    right: formatContent(p.right || '', !!p.rightChart),
                    leftChart: p.leftChart,
                    rightChart: p.rightChart
                }));
                mappedQ.correctAnswer = mappedQ.matchingPairs.map(p => `${p.left} -> ${p.right}`).join(', ');
            } else {
                mappedQ.matchingPairs = [
                    { left: markdownToHtml('Konsep/Istilah 1'), right: markdownToHtml('Deskripsi/Pasangan 1') },
                    { left: markdownToHtml('Konsep/Istilah 2'), right: markdownToHtml('Deskripsi/Pasangan 2') },
                    { left: markdownToHtml('Konsep/Istilah 3'), right: markdownToHtml('Deskripsi/Pasangan 3') }
                ];
                mappedQ.correctAnswer = "Konsep/Istilah 1 -> Deskripsi/Pasangan 1, Konsep/Istilah 2 -> Deskripsi/Pasangan 2, Konsep/Istilah 3 -> Deskripsi/Pasangan 3";
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
        console.warn("[Safe Fallback] Batch error at offset", offset, ":", err?.message);
        results.push(generateSmartFallbackQuestions({ ...config, count: batchCount }, err?.message));
      }
    }

    let finalQuestions: Question[] = results.flat();
    if (finalQuestions.length === 0) {
      finalQuestions = generateSmartFallbackQuestions(config, "Inisialisasi Safe Fallback");
    }

    // Process AI Educational Images, Geometry, Charts & Automatic SVG Generator
    if (config.includeImages) {
      // Phase 1: Collect questions needing automatic AI SVG generation
      const svgTasks: Array<{ q: Question; prompt: string; style: string; hasInlineTag: boolean }> = [];

      for (const q of finalQuestions) {
        const text = q.questionText || '';
        const hasGeometry = text.includes('[GEOMETRY:') || text.includes('class="geometry-shape"');
        const hasChart = !!q.chartData || text.includes('[CHART]') || text.includes('chart-placeholder');
        const hasExistingImg = text.includes('<img') || !!q.imageUrl;

        const aiSvgMatch = /\\?\[\s*ai_svg(?::\s*([^\]]*))?\s*\\?\]/i.exec(text);
        const hasInlineTag = !!aiSvgMatch;

        if (hasGeometry || hasChart) {
          continue;
        }

        const tagPrompt = aiSvgMatch ? aiSvgMatch[1]?.trim() : '';
        const explicitSvgPrompt = (q as any).svgPrompt?.trim();
        const svgStyle = (q as any).svgStyle || "diagram";

        let finalPrompt = tagPrompt || explicitSvgPrompt;

        if (!finalPrompt) {
          const textRefersToVisual = /(perhatikan|berdasarkan|pada|amati)\s+(gambar|diagram|bagan|ilustrasi|grafik|skema|infografis)/i.test(text);
          if (hasInlineTag || (q as any).visualStimulusType === "ai_svg" || (textRefersToVisual && !(q as any).imageSearchKeyword && !hasExistingImg)) {
            finalPrompt = `Diagram ilmiah materi ${q.category || config.subject}: ${q.kisiKisi || text.replace(/<[^>]+>/g, '').replace(/\[ai_svg[^\]]*\]/gi, '').slice(0, 100)}`;
          }
        }

        if (finalPrompt) {
          svgTasks.push({ q, prompt: finalPrompt, style: svgStyle, hasInlineTag });
        }
      }

      // Execute SVG generation for all detected tasks with guaranteed fallback
      if (svgTasks.length > 0) {
        for (const { q, prompt, style, hasInlineTag } of svgTasks) {
          try {
            let svgCode = "";
            try {
              svgCode = await generateEducationalSvg(prompt, style);
            } catch (apiErr) {
              console.warn("Gagal membuat SVG via API, beralih ke template edukatif terverifikasi:", apiErr);
            }

            if (!svgCode || !svgCode.includes('<svg')) {
              svgCode = generateContextualEducationalSvg(prompt, style);
            }

            if (svgCode && svgCode.includes('<svg')) {
              const dataUrl = svgToDataUrl(svgCode);
              const cleanCaption = prompt.length > 60 ? prompt.slice(0, 57) + "..." : prompt;
              const imgHtml = `
<p style="text-align: center; margin-bottom: 16px;">
  <img src="${dataUrl}" alt="${cleanCaption}" loading="lazy" style="max-width: 100%; max-height: 420px; width: auto; height: auto; object-fit: contain; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); display: inline-block; margin: 0 auto; border: 1px solid #e2e8f0;" /><br/>
  <span style="font-size: 11px; color: #64748b; margin-top: 4px; display: inline-block;">
    📐 Stimulus Vektor AI: ${cleanCaption}
  </span>
</p>`;
              if (hasInlineTag && q.questionText) {
                q.questionText = q.questionText.replace(/\\?\[\s*ai_svg(?::\s*[^\]]*)?\s*\\?\]/gi, imgHtml);
              } else {
                q.questionText = imgHtml + (q.questionText || '');
              }
              q.imageUrl = dataUrl;
              q.imagePrompt = prompt;
            }
          } catch (svgErr) {
            console.error("Catatan stimulus gambar SVG:", svgErr);
          }
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      // Phase 2: Wikimedia image search for remaining questions with imageSearchKeyword
      for (const q of finalQuestions) {
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

      // Bersihkan seluruh sisa tag [ai_svg] jika masih tertinggal
      for (const q of finalQuestions) {
        if (q.questionText) {
          q.questionText = q.questionText.replace(/\\?\[\s*ai_svg(?::\s*[^\]]*)?\s*\\?\]/gi, '').trim();
        }
        if (q.options) {
          q.options = q.options.map(opt => (opt || '').replace(/\\?\[\s*ai_svg(?::\s*[^\]]*)?\s*\\?\]/gi, '').trim());
        }
      }
    } else {
      // Jika fitur gambar dimatikan, hapus seluruh tag [ai_svg] yang dihasilkan AI
      for (const q of finalQuestions) {
        if (q.questionText) {
          q.questionText = q.questionText.replace(/\\?\[\s*ai_svg(?::\s*[^\]]*)?\s*\\?\]/gi, '').trim();
        }
        if (q.options) {
          q.options = q.options.map(opt => (opt || '').replace(/\\?\[\s*ai_svg(?::\s*[^\]]*)?\s*\\?\]/gi, '').trim());
        }
      }
    }

    return repairQuestionCharts(finalQuestions);
  } catch (error) {
    console.warn("[Safe Fallback] Mengaktifkan kurikulum fallback darurat:", error);
    const fallbackQuestions = generateSmartFallbackQuestions(config, (error as Error)?.message || "Safe Fallback Aktif");
    return repairQuestionCharts(fallbackQuestions);
  }
}
