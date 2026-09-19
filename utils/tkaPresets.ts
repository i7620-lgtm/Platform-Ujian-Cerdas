export interface TKAPreset {
  id: string;
  name: string;
  shortLabel: string;
  jenjang: 'SD' | 'SMP' | 'SMA' | 'SMK';
  category: 'MIPA' | 'SOSHUM' | 'BAHASA' | 'VOKASI' | 'UMUM';
  regulation: string;
  subject: string;
  difficulties: string[];
  types: string[];
  blueprint: string;
  description: string;
}

export const TKA_PRESETS: TKAPreset[] = [
  // --- SD (BSKAP No. 047/H/AN/2025) ---
  {
    id: 'tka-sd-matematika',
    name: '+ Preset TKA SD Matematika',
    shortLabel: 'SD Matematika',
    jenjang: 'SD',
    category: 'MIPA',
    regulation: 'BSKAP No. 047/H/AN/2025',
    subject: 'Matematika SD (TKA)',
    difficulties: [
      'Level 3 - Penalaran (Reasoning / HOTS)',
      'Level 2 - Penerapan (Applying / MOTS)',
    ],
    types: ['Pilihan Ganda', 'Pilihan Ganda Kompleks', 'Benar/Salah'],
    description: 'Bilangan cacah/pecahan, Geometri keliling/luas/volume, Pola aljabar, Piktogram & data.',
    blueprint: `Standar TKA Matematika SD Kemendikdasmen No. 047/H/AN/2025:
- Domain Bilangan: Operasi hitung bilangan cacah, pecahan biasa/campuran/desimal/persen, KPK dan FPB kontekstual, estimasi dan perbandingan.
- Domain Geometri & Pengukuran: Keliling dan luas bangun datar (persegi, persegipanjang, segitiga, lingkaran), volume kubus dan balok, konversi satuan baku waktu, panjang, berat, dan debit.
- Domain Aljabar: Pola bilangan aritmetika bertingkat, kalimat matematika berpangkat/variabel sederhana.
- Domain Data & Ketidakpastian: Membaca dan menafsirkan data piktogram, tabel frekuensi, diagram batang, serta diagram lingkaran.
- Level Kognitif: Penalaran L3 (Reasoning/HOTS) & Penerapan L2 (Applying/MOTS).
- Karakteristik: Stimulus cerita kontekstual anak Indonesia nyata, multi-langkah penalaran, opsi pengecoh logis, dan kunci jawaban terhitung 100% akurat.`,
  },
  {
    id: 'tka-sd-bahasa-indonesia',
    name: '+ Preset TKA SD Bahasa Indonesia',
    shortLabel: 'SD Bahasa Indonesia',
    jenjang: 'SD',
    category: 'BAHASA',
    regulation: 'BSKAP No. 047/H/AN/2025',
    subject: 'Bahasa Indonesia SD (TKA)',
    difficulties: [
      'Level 3 - Penalaran (Reasoning / HOTS)',
      'Level 2 - Penerapan (Applying / MOTS)',
    ],
    types: ['Pilihan Ganda', 'Pilihan Ganda Kompleks', 'Benar/Salah'],
    description: 'Literasi membaca fiksi/fabel budi pekerti & teks informasi sains/lingkungan.',
    blueprint: `Standar TKA Bahasa Indonesia SD Kemendikdasmen No. 047/H/AN/2025:
- Domain Teks Sastra/Fiksi: Cerita anak, fabel, dan puisi bermuatan budi pekerti, kearifan lokal, dan nilai persahabatan.
- Domain Teks Informasi: Artikel sains populer anak, kesehatan gizi, kelestarian lingkungan hidup, dan kebersihan diri.
- Kompetensi yang Diuji:
  1. Menemukan informasi tersurat & tersirat dalam teks.
  2. Menyimpulkan watak tokoh, latar, alur, dan amanat cerita.
  3. Menentukan gagasan utama / ide pokok paragraf dan simpulan teks.
  4. Menilai kesesuaian ilustrasi/gambar dengan isi teks bacaan.`,
  },

  // --- SMP (BSKAP No. 047/H/AN/2025) ---
  {
    id: 'tka-smp-matematika',
    name: '+ Preset TKA SMP Matematika',
    shortLabel: 'SMP Matematika',
    jenjang: 'SMP',
    category: 'MIPA',
    regulation: 'BSKAP No. 047/H/AN/2025',
    subject: 'Matematika SMP (TKA)',
    difficulties: [
      'Level 3 - Penalaran (Reasoning / HOTS)',
      'Level 2 - Penerapan (Applying / MOTS)',
    ],
    types: ['Pilihan Ganda', 'Pilihan Ganda Kompleks', 'Benar/Salah'],
    description: 'Bilangan berpangkat/akar, SPLDV, Teorema Pythagoras, Transformasi, Bangun Ruang, Peluang.',
    blueprint: `Standar TKA Matematika SMP Kemendikdasmen No. 047/H/AN/2025:
- Domain Bilangan: Bilangan real, operasi bilangan berpangkat dan bentuk akar, aritmetika sosial (diskon, pajak, bunga tunggal).
- Domain Aljabar: Relasi dan fungsi, persamaan linear dua variabel (SPLDV), persamaan kuadrat, pola barisan dan deret.
- Domain Geometri & Pengukuran: Teorema Pythagoras, kesebangunan & kekongruenan, transformasi geometri (translasi/refleksi/rotasi/dilatasi), luas permukaan dan volume bangun ruang sisi datar (kubus, balok, prisma, limas) dan sisi lengkung (tabung, kerucut, bola).
- Domain Data & Peluang: Statistika deskriptif (mean, median, modus, jangkauan kuartil data tunggal/tabel), peluang empirik dan teoretik kejadian tunggal.
- Notasi: Sintaks LaTeX baku ($...$) dan penalaran model fisis non-rutin.`,
  },
  {
    id: 'tka-smp-bahasa-indonesia',
    name: '+ Preset TKA SMP Bahasa Indonesia',
    shortLabel: 'SMP Bahasa Indonesia',
    jenjang: 'SMP',
    category: 'BAHASA',
    regulation: 'BSKAP No. 047/H/AN/2025',
    subject: 'Bahasa Indonesia SMP (TKA)',
    difficulties: [
      'Level 3 - Penalaran (Reasoning / HOTS)',
      'Level 2 - Penerapan (Applying / MOTS)',
    ],
    types: ['Pilihan Ganda', 'Pilihan Ganda Kompleks', 'Benar/Salah'],
    description: 'Teks LHO, Eksplanasi, Cerpen, Diskusi/Persuasi, Analisis Argumen & Kritis.',
    blueprint: `Standar TKA Bahasa Indonesia SMP Kemendikdasmen No. 047/H/AN/2025:
- Domain Teks Informasi: Teks Laporan Hasil Observasi (LHO), Teks Eksplanasi fenomena alam/sosial, Teks Berita, dan Teks Diskusi/Persuasi.
- Domain Teks Fiksi: Cerita pendek (cerpen) remaja, fabel kontemporer, dan puisi reflektif.
- Kompetensi: Menganalisis struktur teks & kaidah kebahasaan, membedakan fakta vs opini/asumsi, menyimpulkan pesan tersirat dan tujuan komunikatif penulis, mengevaluasi validitas argumen.`,
  },
  {
    id: 'tka-smp-bahasa-inggris',
    name: '+ Preset TKA SMP Bahasa Inggris',
    shortLabel: 'SMP Bahasa Inggris',
    jenjang: 'SMP',
    category: 'BAHASA',
    regulation: 'BSKAP No. 047/H/AN/2025',
    subject: 'Bahasa Inggris SMP (TKA)',
    difficulties: [
      'Level 3 - Penalaran (Reasoning / HOTS)',
      'Level 2 - Penerapan (Applying / MOTS)',
    ],
    types: ['Pilihan Ganda', 'Pilihan Ganda Kompleks', 'Benar/Salah'],
    description: 'Functional texts, Descriptive, Recount, Narrative, Procedure Texts (CEFR A2).',
    blueprint: `Standar TKA Bahasa Inggris SMP Kemendikdasmen No. 047/H/AN/2025:
- Text Types: Short functional texts (notices, greeting cards, announcements, messages), Descriptive texts, Recount texts, Narrative tales, Procedure recipes/manuals.
- Proficiency Level: CEFR A2 (Waystage / Independent elementary).
- Tested Skills: Identifying main ideas, finding explicit & implicit specific details, guessing meaning from context, predicting story endings, determining the author's purpose.`,
  },

  // --- SMA / MA / SMK (BSKAP No. 045/H/AN/2025) ---
  {
    id: 'tka-sma-matematika',
    name: '+ Preset TKA SMA Matematika',
    shortLabel: 'SMA Matematika',
    jenjang: 'SMA',
    category: 'MIPA',
    regulation: 'BSKAP No. 045/H/AN/2025',
    subject: 'Matematika SMA (TKA)',
    difficulties: [
      'Level 3 - Penalaran (Reasoning / HOTS)',
      'Level 2 - Penerapan (Applying / MOTS)',
    ],
    types: ['Pilihan Ganda', 'Pilihan Ganda Kompleks', 'Benar/Salah'],
    description: 'SPLTV, Program Linear, Fungsi Komposisi/Invers, Dimensi Tiga, Vektor, Trigonometri, Kombinatorika.',
    blueprint: `Standar TKA Matematika SMA/SMK Kemendikdasmen No. 045/H/AN/2025:
- Domain Aljabar: Sistem Persamaan & Pertidaksamaan Linear (SPLTV), Program Linear & Nilai Optimum, Fungsi Linear/Kuadrat/Rasional, Fungsi Komposisi & Invers, Barisan & Deret Aritmetika/Geometri, Bunga Majemuk, Anuitas & Peluruhan.
- Domain Geometri & Pengukuran: Transformasi Geometri (Translasi, Refleksi, Rotasi, Dilatasi), Dimensi Tiga (Jarak Titik ke Titik, Titik ke Garis, dan Titik ke Bidang), Vektor 2D/3D.
- Domain Trigonometri: Perbandingan Trigonometri pada Segitiga Siku-siku & Sudut Berelasi Kuadran I-IV, Aturan Sinus & Cosinus, Grafik Fungsi Trigonometri.
- Domain Data & Peluang: Statistika Ukuran Pemusatan & Penyebaran Data Kelompok (Mean, Median, Modus, Kuartil, Ragam/Simpangan Baku), Aturan Pencacahan (Kaidah Perkalian, Permutasi, Kombinasi), Peluang Kejadian Majemuk (Saling Lepas, Saling Bebas, Bersyarat).
- Karakteristik: Soal penalaran bertingkat (multi-step reasoning), stimulus kontekstual aplikatif, sintaks LaTeX baku ($...$), dan opsi pengecoh logis.`,
  },
  {
    id: 'tka-sma-fisika',
    name: '+ Preset TKA SMA Fisika',
    shortLabel: 'SMA Fisika',
    jenjang: 'SMA',
    category: 'MIPA',
    regulation: 'BSKAP No. 045/H/AN/2025',
    subject: 'Fisika SMA (TKA)',
    difficulties: [
      'Level 3 - Penalaran (Reasoning / HOTS)',
      'Level 2 - Penerapan (Applying / MOTS)',
    ],
    types: ['Pilihan Ganda', 'Pilihan Ganda Kompleks', 'Benar/Salah'],
    description: 'Kinematika, Dinamika Gerak & Rotasi, Fluida Pascal/Bernoulli, Gelombang, Termodinamika, Kelistrikan.',
    blueprint: `Standar TKA Fisika SMA Kemendikdasmen No. 045/H/AN/2025:
- Domain Kinematika: Pengukuran & angka penting, GLB, GLBB, Gerak Vertikal, Gerak Parabola, Gerak Melingkar Beraturan (GMB/GMBB).
- Domain Dinamika: Hukum Newton I, II, III, Gaya Gesek, Usaha & Energi, Hukum Kekekalan Energi Mekanik, Momentum & Impuls, Tumbukan, Dinamika Rotasi & Kesetimbangan Benda Tegar (Momen Gaya, Momen Inersia).
- Domain Fluida: Fluida Statis (Tekanan Hidrostatis, Hukum Pascal, Hukum Archimedes, Tegangan Permukaan), Fluida Dinamis (Persamaan Kontinuitas, Azas Bernoulli, Venturimeter).
- Domain Gelombang & Optik: Gelombang Mekanik/Bunyi (Efek Doppler, Cepat Rambat, Intensitas Bunyi), Gelombang Cahaya & Alat Optik (Cermin/Lensa, Pembiasan, Interferensi/Difraksi).
- Domain Termodinamika & Kalor: Perpindahan Kalor, Asas Black, Teori Kinetik Gas Ideal (Persamaan Boyle-Gay Lussac), Hukum I & II Termodinamika, Mesin Carnot / Efisiensi Termal.
- Domain Kelistrikan & Kemagnetan: Listrik Statis (Hukum Coulomb, Kuat Medan & Potensial Listrik, Kapasitor), Listrik Dinamis Arus Searah DC (Hukum Ohm & Hukum Kirchhoff I-II), Kemagnetan & Induksi Elektromagnetik (Hukum Faraday/Lenz).
- Keterampilan Proses Sains & Pemecahan Masalah Fisis Nyata.`,
  },
  {
    id: 'tka-sma-kimia',
    name: '+ Preset TKA SMA Kimia',
    shortLabel: 'SMA Kimia',
    jenjang: 'SMA',
    category: 'MIPA',
    regulation: 'BSKAP No. 045/H/AN/2025',
    subject: 'Kimia SMA (TKA)',
    difficulties: [
      'Level 3 - Penalaran (Reasoning / HOTS)',
      'Level 2 - Penerapan (Applying / MOTS)',
    ],
    types: ['Pilihan Ganda', 'Pilihan Ganda Kompleks', 'Benar/Salah'],
    description: 'Struktur Atom, Stoikiometri, Hidrokarbon, Larutan Asam Basa, Termokimia Hess, Elektrokimia Volta.',
    blueprint: `Standar TKA Kimia SMA Kemendikdasmen No. 045/H/AN/2025:
- Domain Kimia Dasar: Struktur atom, bilangan kuantum, sistem periodik unsur, ikatan kimia (ionik, kovalen polar/nonpolar, ikatan hidrogen), bentuk molekul teori VSEPR/domain elektron, hukum dasar kimia (Lavoisier, Proust, Dalton, Gay-Lussac, Avogadro), dan stoikiometri reaksi (konsep mol, pereaksi pembatas, rumus empiris/molekul).
- Domain Kimia Organik: Tata nama & sifat senyawa hidrokarbon (alkana, alkena, alkuna), isomeri, reaksi substitusi/adisi/eliminasi, polimer dan makromolekul.
- Domain Kimia Analitik: Larutan asam basa (teori Arrhenius, Bronsted-Lowry, Lewis, perhitungan pH), titrasi asam-basa, larutan penyangga (buffer), hidrolisis garam, kelarutan & hasil kali kelarutan (Ksp), sistem koloid, dan sifat koligatif larutan.
- Domain Kimia Fisik: Termokimia (perubahan entalpi standar, Hukum Hess, energi ikatan), laju reaksi & orde reaksi, faktor yang mempengaruhi pergeseran kesetimbangan (Azas Le Chatelier, tetapan Kc & Kp), reaksi redoks, dan elektrokimia (Sel Volta, deret volta, potensial sel standar, elektrolisis & Hukum Faraday).`,
  },
  {
    id: 'tka-sma-biologi',
    name: '+ Preset TKA SMA Biologi',
    shortLabel: 'SMA Biologi',
    jenjang: 'SMA',
    category: 'MIPA',
    regulation: 'BSKAP No. 045/H/AN/2025',
    subject: 'Biologi SMA (TKA)',
    difficulties: [
      'Level 3 - Penalaran (Reasoning / HOTS)',
      'Level 2 - Penerapan (Applying / MOTS)',
    ],
    types: ['Pilihan Ganda', 'Pilihan Ganda Kompleks', 'Benar/Salah'],
    description: 'Keanekaragaman Hayati, Sel & Metabolisme Enzimatis, Sistem Fisiologi Organ Manusia, Genetika Mendel.',
    blueprint: `Standar TKA Biologi SMA Kemendikdasmen No. 045/H/AN/2025:
- Domain Keanekaragaman Hayati & Ekosistem: Tingkat keanekaragaman gen/spesies/ekosistem di Indonesia, virus, bakteri, jamur, interaksi ekologi (rantai makanan, piramida ekologi, jaring-jaring), daur biogeokimia, perubahan lingkungan & upaya pelestarian.
- Domain Sel & Bioproses: Struktur organel sel eukariotik/prokariotik, transpor membran (difusi, osmosis, transpor aktif), metabolisme enzimatis (cara kerja enzim, katabolisme respirasi aerob glikolisis/siklus krebs/transpor elektron, respirasi anaerob fermentasi, anabolisme fotosintesis reaksi terang/gelap).
- Domain Sistem Organ Tubuh Manusia: Sistem peredaran darah, pencernaan makanan & nutrisi, sistem pernapasan, sistem ekskresi (ginjal/nefron), sistem koordinasi regulasi (saraf, endokrin/hormon, indra), sistem imunitas tubuh, dan sistem reproduksi.
- Domain Pewarisan Sifat & Bioteknologi: Pola pewarisan sifat hukum Mendel I-II, sintesis protein (transkripsi/translasi), mutasi gen & kromosom, serta bioteknologi konvensional dan modern.`,
  },
  {
    id: 'tka-sma-ekonomi',
    name: '+ Preset TKA SMA Ekonomi',
    shortLabel: 'SMA Ekonomi',
    jenjang: 'SOSHUM',
    regulation: 'BSKAP No. 045/H/AN/2025',
    subject: 'Ekonomi SMA (TKA)',
    difficulties: [
      'Level 3 - Penalaran (Reasoning / HOTS)',
      'Level 2 - Penerapan (Applying / MOTS)',
    ],
    types: ['Pilihan Ganda', 'Pilihan Ganda Kompleks', 'Benar/Salah'],
    description: 'Kelangkaan & Biaya Peluang, Pasar Mikro-Makro, Kebijakan Moneter/Fiskal, Perdagangan Global, Akuntansi.',
    blueprint: `Standar TKA Ekonomi SMA Kemendikdasmen No. 045/H/AN/2025:
- Domain Konsep Dasar Ekonomi: Kelangkaan sumber daya, skala prioritas, pilihan rasional, dan biaya peluang (opportunity cost).
- Domain Ekonomi Mikro: Mekanisme pasar (permintaan, penawaran, kurva ekuilibrium, elastisitas harga/pendapatan), perilaku produsen & konsumen, struktur pasar (persaingan sempurna vs tidak sempurna/monopoli/oligopoli).
- Domain Ekonomi Makro: Pendapatan nasional (PDB, PNB, Pendapatan Perkapita, Metode Perhitungan), ketenagakerjaan & pengangguran, inflasi & indeks harga (IHK), uang & perbankan, kebijakan moneter Bank Indonesia, APBN/APBD & kebijakan fiskal, badan usaha (BUMN, BUMS, Koperasi).
- Domain Ekonomi Internasional: Teori perdagangan internasional (keunggulan komparatif/absolut), valuta asing & kurs valas, neraca pembayaran, tarif/kuota/kebijakan ekspor-impor.
- Domain Akuntansi Keuangan Dasar: Persamaan dasar akuntansi, analisis bukti transaksi, jurnal umum, buku besar, neraca saldo, jurnal penyesuaian, dan laporan keuangan (laporan laba rugi, perubahan modal, neraca).`,
  },
  {
    id: 'tka-sma-sosiologi',
    name: '+ Preset TKA SMA Sosiologi',
    shortLabel: 'SMA Sosiologi',
    jenjang: 'SOSHUM',
    regulation: 'BSKAP No. 045/H/AN/2025',
    subject: 'Sosiologi SMA (TKA)',
    difficulties: [
      'Level 3 - Penalaran (Reasoning / HOTS)',
      'Level 2 - Penerapan (Applying / MOTS)',
    ],
    types: ['Pilihan Ganda', 'Pilihan Ganda Kompleks', 'Benar/Salah'],
    description: 'Interaksi & Norma, Penelitian Sosial, Diferensiasi & Stratifikasi, Konflik, Perubahan Sosial Global.',
    blueprint: `Standar TKA Sosiologi SMA Kemendikdasmen No. 045/H/AN/2025:
- Domain Sosiologi sebagai Ilmu: Ciri-ciri sosiologi (empiris, teoretis, kumulatif, non-etis), objek kajian, dan fungsi sosiologi dalam pemecahan masalah sosial masyarakat.
- Domain Hubungan & Gejala Sosial: Interaksi sosial asosiatif/disosiatif, nilai dan norma sosial, proses sosialisasi dan pembentukan kepribadian, penyimpangan sosial dan pengendalian sosial.
- Domain Penelitian Sosial: Metode penelitian sosiologis kualitatif dan kuantitatif, teknik pengumpulan data (observasi, wawancara, kuesioner), pengolahan data dan penarikan kesimpulan.
- Domain Kelompok Sosial & Struktur Sosial: Pembentukan kelompok sosial (in-group/out-group, paguyuban/patembayan), partikularisme, stratifikasi sosial terbuka/tertutup, diferensiasi sosial, masyarakat multikultural.
- Domain Konflik & Integrasi: Faktor penyebab konflik sosial, kekerasan sosial, akomodasi dan resolusi konflik, reintegrasi dan integrasi sosial.
- Domain Perubahan Sosial & Globalisasi: Bentuk-bentuk perubahan sosial, teori perubahan sosial (siklus, linier), dampak modernisasi & globalisasi, pelestarian kearifan lokal, dan pemberdayaan komunitas masyarakat lokal.`,
  },
  {
    id: 'tka-sma-geografi',
    name: '+ Preset TKA SMA Geografi',
    shortLabel: 'SMA Geografi',
    jenjang: 'SOSHUM',
    regulation: 'BSKAP No. 045/H/AN/2025',
    subject: 'Geografi SMA (TKA)',
    difficulties: [
      'Level 3 - Penalaran (Reasoning / HOTS)',
      'Level 2 - Penerapan (Applying / MOTS)',
    ],
    types: ['Pilihan Ganda', 'Pilihan Ganda Kompleks', 'Benar/Salah'],
    description: 'Prinsip/Pendekatan Geografi, Litosfer, Atmosfer, Hidrosfer, SDA Nasional, Mitigasi Bencana, Peta & SIG.',
    blueprint: `Standar TKA Geografi SMA Kemendikdasmen No. 045/H/AN/2025:
- Domain Pengetahuan Dasar Geografi: 10 konsep esensial geografi, 4 prinsip geografi (persebaran, interelasi, deskripsi, korologi), 3 pendekatan geografi (keruangan, kelingkungan, kompleks wilayah).
- Domain Dinamika Lingkungan Fisik (Geosfer):
  * Litosfer: Tektonisme lempeng, vulkanisme, gempa bumi (seisme), pelapukan, erosi, pedosfer (jenis tanah & konservasi).
  * Atmosfer: Lapisan atmosfer, unsur cuaca (suhu, kelembapan, tekanan, angin, curah hujan), klasifikasi iklim (Koppen, Junghuhn, Schmidt-Ferguson), dan perubahan iklim global.
  * Hidrosfer: Siklus hidrologi, perairan darat (sungai, danau, air tanah, DAS), dan perairan laut (zona kedalaman laut, arus, salinitas).
- Domain Sumber Daya Alam & Kependudukan: Persebaran SDA strategis Indonesia (pertanian, maritim, tambang, energi terbarukan), dinamika demografi (kelahiran, kematian, migrasi, piramida penduduk, bonus demografi).
- Domain Mitigasi & Adaptasi Kebencanaan: Bencana geologis (gempa, tsunami, erupsi gunungapi) dan bencana hidrometeorologis (banjir, kekeringan, longsor), langkah mitigasi pra-saat-pasca bencana.
- Domain Peta, Penginderaan Jauh (PJ) & Sistem Informasi Geografis (SIG): Komponen peta & perhitungan skala, interpretasi citra foto/non-foto (rona, warna, bentuk, pola, asosiasi), analisis spasial SIG (overlay, buffering).`,
  },
  {
    id: 'tka-sma-sejarah',
    name: '+ Preset TKA SMA Sejarah',
    shortLabel: 'SMA Sejarah',
    jenjang: 'SMA',
    category: 'SOSHUM',
    regulation: 'BSKAP No. 045/H/AN/2025',
    subject: 'Sejarah SMA (TKA)',
    difficulties: [
      'Level 3 - Penalaran (Reasoning / HOTS)',
      'Level 2 - Penerapan (Applying / MOTS)',
    ],
    types: ['Pilihan Ganda', 'Pilihan Ganda Kompleks', 'Benar/Salah'],
    description: 'Konsep Berpikir Sejarah, Kerajaan Kuno, Kolonialisme & Pergerakan, Proklamasi, Orde Baru & Reformasi.',
    blueprint: `Standar TKA Sejarah SMA Kemendikdasmen No. 045/H/AN/2025:
- Domain Konsep Dasar Sejarah: Cara berpikir kronologis, diakronik, sinkronik, kausalitas sebab-akibat, keberlanjutan & perubahan, kritik sumber sejarah (primer vs sekunder), dan historiografi.
- Domain Kerajaan Hindu-Buddha & Islam: Masuknya kebudayaan maritim & jalur rempah nusantara (Sriwijaya, Majapahit, Samudera Pasai, Demak, Mataram Islam, Gowa-Tallo), akulturasi budaya dan tata kelola pemerintahan kuno.
- Domain Kolonialisme & Perlawanan Nusantara: Kedatangan bangsa Eropa (VOC, Belanda, Inggris), sistem tanam paksa (Cultuurstelsel), politik etis, dan perjuangan perlawanan kedaerahan (Pattimura, Diponegoro, Imam Bonjol, dsb.).
- Domain Pergerakan Nasional & Kemerdekaan: Lahirnya organisasi modern (Budi Utomo, Sarekat Islam, Indische Partij), Sumpah Pemuda 1928, masa pendudukan Jepang, BPUPK/PPKI, detik-detik Proklamasi 17 Agustus 1945.
- Domain Dinamika Indonesia Pasca-Kemerdekaan: Perjuangan mempertahankan kemerdekaan (perang fisik & jalur diplomasi Renville/Linggarjati/KMB), Demokrasi Liberal & Terpimpin, masa Orde Baru (Pembangunan Lima Tahun), hingga krisis moneter dan lahirnya Gerakan Reformasi 1998.`,
  },
  {
    id: 'tka-sma-bahasa-indonesia',
    name: '+ Preset TKA SMA Bahasa Indonesia',
    shortLabel: 'SMA Bahasa Indonesia',
    jenjang: 'SMA',
    category: 'BAHASA',
    regulation: 'BSKAP No. 045/H/AN/2025',
    subject: 'Bahasa Indonesia SMA (TKA)',
    difficulties: [
      'Level 3 - Penalaran (Reasoning / HOTS)',
      'Level 2 - Penerapan (Applying / MOTS)',
    ],
    types: ['Pilihan Ganda', 'Pilihan Ganda Kompleks', 'Benar/Salah'],
    description: 'Teks Informasi Kompleks & Karya Sastra. Kompetensi Pemahaman Tekstual, Inferensial, Evaluasi & Apresiasi.',
    blueprint: `Standar TKA Bahasa Indonesia SMA/SMK Kemendikdasmen No. 045/H/AN/2025:
- Domain Teks Informasi: Artikel ilmiah populer, teks eksplanasi kompleks, teks editorial/tajuk rencana, teks opini/esai, dan infografis lintas disiplin (sains, ekonomi, sosial budaya, teknologi digital).
- Domain Teks Sastra: Cerpen kontemporer, kutipan novel Indonesia, puisi modern, dan kutipan drama.
- Tiga Tingkat Kompetensi Resmi:
  1. Pemahaman Tekstual: Mengidentifikasi fakta eksplisit, definisi konsep, dan istilah teknis.
  2. Pemahaman Inferensial: Menyimpulkan ide pokok, hubungan kausalitas antarparagraf, memprediksi kelanjutan peristiwa, serta menafsirkan makna kiasan/majas dan amanat karya sastra.
  3. Evaluasi & Apresiasi: Menilai keabsahan fakta dan penalaran argumen penulis, membandingkan pola penyajian dari dua teks berbeda, menilai keberpihakan/bias redaksi, dan merefleksikan relevansi pesan terhadap kehidupan nyata.`,
  },
  {
    id: 'tka-sma-bahasa-inggris',
    name: '+ Preset TKA SMA Bahasa Inggris',
    shortLabel: 'SMA Bahasa Inggris',
    jenjang: 'SMA',
    category: 'BAHASA',
    regulation: 'BSKAP No. 045/H/AN/2025',
    subject: 'Bahasa Inggris SMA (TKA)',
    difficulties: [
      'Level 3 - Penalaran (Reasoning / HOTS)',
      'Level 2 - Penerapan (Applying / MOTS)',
    ],
    types: ['Pilihan Ganda', 'Pilihan Ganda Kompleks', 'Benar/Salah'],
    description: 'Analytical/Hortatory Exposition, Discussion, Narrative, News Item, Technical Texts (CEFR B1).',
    blueprint: `Standar TKA Bahasa Inggris SMA/SMK Kemendikdasmen No. 045/H/AN/2025:
- Domain Teks: Analytical Exposition, Hortatory Exposition, Discussion texts, News Item, Explanation, Report, Narrative literature, dan Business/Academic correspondence.
- Standar Kemahiran: CEFR B1 (Threshold / Independent User) hingga A2+.
- Kompetensi yang Diuji:
  1. Identifying topic, thesis statement, arguments, and main ideas of complex paragraphs.
  2. Deducing the meaning of unfamiliar words and idiomatic expressions from contextual clues.
  3. Analyzing text cohesion, coherence, rhetorical devices, and logical connections.
  4. Evaluating the author's tone, attitude, point of view, and implicit intended purpose.`,
  },
  {
    id: 'tka-sma-ppkn',
    name: '+ Preset TKA SMA Pendidikan Pancasila',
    shortLabel: 'SMA PPKn',
    jenjang: 'SMA',
    category: 'UMUM',
    regulation: 'BSKAP No. 045/H/AN/2025',
    subject: 'Pendidikan Pancasila SMA (TKA)',
    difficulties: [
      'Level 3 - Penalaran (Reasoning / HOTS)',
      'Level 2 - Penerapan (Applying / MOTS)',
    ],
    types: ['Pilihan Ganda', 'Pilihan Ganda Kompleks', 'Benar/Salah'],
    description: 'Pancasila, UUD NRI 1945 & Ketatanegaraan, Bhinneka Tunggal Ika, NKRI & Wawasan Kebangsaan.',
    blueprint: `Standar TKA Pendidikan Pancasila SMA/SMK Kemendikdasmen No. 045/H/AN/2025:
- Elemen Pancasila: Nilai-nilai dasar, instrumental, dan praksis sila-sila Pancasila, sejarah perumusan Pancasila, Pancasila sebagai ideologi terbuka dan meja statis/leitstar dinamis, penerapan nilai gotong royong dalam kehidupan bermasyarakat.
- Elemen UUD NRI Tahun 1945: Sistem ketatanegaraan Indonesia, hierarki peraturan perundang-undangan, pembagian kewenangan lembaga negara (MK, MA, KY, DPR, DPD, MPR, Presiden, BPK), penegakan HAM dan supremasi hukum.
- Elemen Bhinneka Tunggal Ika: Harmonisasi keberagaman suku, agama, ras, dan antargolongan, pencegahan diskriminasi dan intoleransi, integrasi nasional.
- Elemen NKRI: Wawasan Nusantara, hakikat bela negara, pertahanan dan keamanan nasional, partisipasi aktif Indonesia dalam perdamaian dunia.`,
  },

  // --- SMK (BSKAP No. 045/H/AN/2025) ---
  {
    id: 'tka-smk-pkk',
    name: '+ Preset TKA SMK Kewirausahaan (PKK)',
    shortLabel: 'SMK Produk Kreatif & Kewirausahaan',
    jenjang: 'SMK',
    category: 'VOKASI',
    regulation: 'BSKAP No. 045/H/AN/2025',
    subject: 'Produk Kreatif dan Kewirausahaan SMK (TKA)',
    difficulties: [
      'Level 3 - Penalaran (Reasoning / HOTS)',
      'Level 2 - Penerapan (Applying / MOTS)',
    ],
    types: ['Pilihan Ganda', 'Pilihan Ganda Kompleks', 'Benar/Salah'],
    description: 'Desain & Prototipe, Perencanaan Produksi & QA Mutu, Pemasaran Digital, Analisis BEP/Keuangan, HaKI.',
    blueprint: `Standar TKA Produk Kreatif & Kewirausahaan SMK Kemendikdasmen No. 045/H/AN/2025:
- Domain Peluang Usaha & Riset Pasar: Analisis peluang usaha (SWOT, Business Model Canvas / BMC, Value Proposition), segmentasi pasar dan identifikasi target konsumen.
- Domain Desain Produk & Prototipe: Pembuatan gambar kerja (blueprint/CAD), pemilihan material/kemasan, tahapan pembuatan prototipe fisik/sampel kerja produk barang/jasa.
- Domain Perencanaan Produksi & Kontrol Mutu: Alur proses produksi massal, estimasi kebutuhan bahan baku dan tenaga kerja, pengendalian mutu produk (Quality Assurance / Quality Control sesuai standar SNI/ISO).
- Domain Strategi Pemasaran Digital & Distribusi: Saluran pemasaran langsung dan online/e-commerce, promosi digital marketing (SEO, media sosial, marketplace), strategi penetapan harga (cost-plus pricing, penetration pricing).
- Domain Analisis Biaya & Laporan Keuangan: Perhitungan Harga Pokok Produksi (HPP), Titik Impas (Break Even Point / BEP unit & rupiah), laporan laba-rugi sederhana, dan pengelolaan arus kas (cash flow).
- Domain Hak Kekayaan Intelektual (HaKI): Prosedur pendaftaran dan perlindungan hak cipta, paten, merek dagang, desain industri, dan rahasia dagang.`,
  },
];
