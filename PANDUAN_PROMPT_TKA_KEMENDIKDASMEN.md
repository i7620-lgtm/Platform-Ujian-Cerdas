# PANDUAN STANDAR PROMPT AI: PENYUSUNAN SOAL TES KEMAMPUAN AKADEMIK (TKA)
**Berdasarkan Peraturan Kepala BSKAP Kemendikdasmen RI No. 047/H/AN/2025**  
*Untuk Jenjang SD/MI/Sederajat dan SMP/MTs/Sederajat*

---

## DAFTAR ISI
1. [Dasar Hukum & Filosofi TKA](#1-dasar-hukum--filosofi-tka)
2. [Struktur Mata Uji & Bentuk Soal Resmi](#2-struktur-mata-uji--bentuk-soal-resmi)
3. [Matriks Muatan & Kompetensi](#3-matriks-muatan--kompetensi)
   - [A. Bahasa Indonesia SD/MI](#a-bahasa-indonesia-sdmi)
   - [B. Matematika SD/MI](#b-matematika-sdmi)
   - [C. Bahasa Indonesia SMP/MTs](#c-bahasa-indonesia-smpmts)
   - [D. Matematika SMP/MTs](#d-matematika-smpmts)
4. [Kaidah Penulisan & Desain Soal Berkualitas](#4-kaidah-penulisan--desain-soal-berkualitas)
5. [Bank Contoh Soal Standar Pusmendik (Few-Shot Examples)](#5-bank-contoh-soal-standar-pusmendik-few-shot-examples)
6. [Master System Prompt untuk AI Generator](#6-master-system-prompt-untuk-ai-generator)
7. [Skema Output Data JSON / Markdown](#7-skema-output-data-json--markdown)

---

## 1. DASAR HUKUM & FILOSOFI TKA

### A. Landasan Kebijakan
* **Regulasi:** Peraturan Kepala Badan Standar, Kurikulum, dan Asesmen Pendidikan (BSKAP) Kementerian Pendidikan Dasar dan Menengah RI No. 047/H/AN/2025.
* **Peruntukan:** Jenjang SD/MI/Sederajat dan SMP/MTs/Sederajat.

### B. Tujuan & Fungsi TKA
1. **Standarisasi Capaian Akademik:** Menghadirkan alat ukur yang adil dan objektif untuk membandingkan capaian akademik murid lintas satuan pendidikan (khususnya untuk keperluan seleksi akademik).
2. **Penjaminan Mutu & Acuan Pembelajaran:** Menjadi model asesmen yang menguji penalaran tingkat tinggi (*Higher Order Thinking Skills* / HOTS), pemahaman konseptual, dan pemecahan masalah.
3. **Penyetaraan Jalur Pendidikan:** Memberikan pengakuan kesetaraan hasil belajar murid dari jalur nonformal dan informal.
4. **Batasan:** TKA **bukan penentu kelulusan** (kelulusan tetap menjadi kewenangan penuh satuan pendidikan).

---

## 2. STRUKTUR MATA UJI & BENTUK SOAL RESMI

TKA terdiri dari 2 Mata Uji Wajib: **Bahasa Indonesia** dan **Matematika**.

### A. Jenis Soal
* **Soal Tunggal:** Soal mandiri dengan satu stimulus khusus untuk satu butir pertanyaan.
* **Soal Grup:** Rangkaian 2 s.d. 3 butir soal berbeda yang mengacu pada satu stimulus bersama (teks panjang, infografis ganda, denah, atau grafik).

### B. 3 Bentuk Soal Baku
| Bentuk Soal | Kode | Karakteristik Format | Mekanisme Respons |
| :--- | :--- | :--- | :--- |
| **Pilihan Ganda Sederhana** | `PG` | 4 pilihan jawaban ($A, B, C, D$). | Tepat **1 jawaban benar**. |
| **Pilihan Ganda Kompleks MCMA** | `PGK_MCMA` | *Multiple Choice Multiple Answers* berbentuk kotak centang (*checkbox*). | **$\ge 2$ jawaban benar**. Instruksi baku: *"Pilihlah jawaban yang benar! Jawaban benar lebih dari satu."* |
| **Pilihan Ganda Kompleks Kategori** | `PGK_KATEGORI` | Format tabel pernyataan (umumnya 3 baris). | Memilih opsi biner per baris: <br>• `Benar` / `Salah`<br>• `Sesuai` / `Tidak Sesuai`<br>• `Setuju` / `Tidak Setuju` |

---

## 3. MATRIKS MUATAN & KOMPETENSI

### A. Bahasa Indonesia SD/MI
* **Fokus:** Keterampilan Membaca.
* **Karakteristik Teks:**
  * **Teks Informasi:** Fakta sederhana lingkup lokal/nasional (150–200 kata).
  * **Teks Fiksi:** Fantasi/faktual, latar konkret, tokoh datar, konflik tunggal penyelesaian tertutup, alur maju, sudut pandang orang pertama (150–200 kata).
  * **Struktur Bahasa:** Kalimat SPOK (3–7 kata per kalimat), makna denotatif dominan.
* **Tiga Domain Kompetensi:**
  1. **Pemahaman Tekstual:** Mengidentifikasi informasi tersurat, kosakata teknis/umum, menyusun kembali informasi ke dalam bagan/ikhtisar alur.
  2. **Pemahaman Inferensial:** Menyimpulkan ide pokok, gagasan pendukung, amanat, karakter tokoh, makna ungkapan/bahasa kias.
  3. **Evaluasi dan Apresiasi:** Menilai relevansi peristiwa dengan kehidupan nyata, menilai kesesuaian antarunsur teks, merefleksikan respons emosional.

---

### B. Matematika SD/MI
* **Level Kognitif:**
  * **Level 1 (Knowing & Understanding):** Menghitung aritmatika prosedur, membaca informasi grafik/diagram, mengelompokkan objek, mengidentifikasi sifat geometri.
  * **Level 2 (Applying):** Memodelkan masalah kontekstual ke kalimat matematika, mengaplikasikan rumus rutin, menafsirkan arti fisis nilai.
  * **Level 3 (Reasoning):** Menganalisis relasi beberapa konsep, memecahkan masalah multi-langkah (*multi-step non-routine*), mengevaluasi strategi optimal, menarik kesimpulan valid dari data.
* **Elemen & Sub-Elemen Materi:**
  1. **Bilangan Rasional:**
     * Pecahan senilai (gambar & simbol).
     * Perbandingan & pengurutan pecahan.
     * Relasi pecahan, desimal ($0{,}75$), dan persen ($120\%$, $10\%$).
     * Operasi hitung bilangan cacah & pecahan campuran ($4\frac{3}{4}$).
     * Kelipatan, faktor, KPK, dan FPB bilangan asli.
  2. **Geometri dan Pengukuran:**
     * Bangun Datar: Sifat segitiga, segiempat (persegi, persegipanjang, belah ketupat, layang-layang), segi banyak.
     * Bangun Ruang: Kubus, balok, gabungannya, visualisasi spasial (tampak depan/atas/samping, sisi berlawanan dadu).
     * Pengukuran Satuan Baku:
       * Panjang ($mm, cm, dm, m, dam, hm, km$).
       * Berat/Massa ($mg, cg, dg, g, dag, hg, kg$).
       * Volume ($ml, cl, dl, l, dal, hl, kl$).
       * Waktu (detik, menit, jam, hari, pekan, bulan, tahun, jadwal perjalanan berantai).
       * Laju perubahan (kecepatan $km/\text{jam}$).
       * Keliling & Luas bangun gabungan tidak beraturan.
       * Penaksiran ukuran & sisa potongan bahan.
  3. **Data:**
     * Penyajian data: Piktogram (simbol dengan nilai skala), diagram batang tunggal/ganda, tabel frekuensi.
     * Pengambilan informasi dan penalaran data (asupan gizi, pengunjung, dsb.).

---

### C. Bahasa Indonesia SMP/MTs
* **Karakteristik Teks:**
  * **Teks Informasi:** Teks tunggal maupun teks jamak komparatif (200–250 kata), istilah teknis, fakta-opini.
  * **Teks Fiksi & Puisi:** Cerita rekaan realisme/sejarah, tokoh bulat, konflik jamak, alur campuran, sudut pandang orang ketiga, teks puisi bermakna konotatif/citraan.
  * **Struktur Bahasa:** Kalimat majemuk (5–9 kata per kalimat), kohesi penyulihan, konjungsi antarkalimat.
* **Kompetensi Tambahan:**
  * Menjelaskan kelogisan hubungan antarperistiwa/antargagasan antar dua teks berbeda (*Teks Ulasan 1 vs Teks Ulasan 2*).
  * Menjelaskan bahasa kias, citraan, dan suasana haru/empati pada puisi.
  * Menilai keakuratan dan gaya bahasa (formal vs santai/nonformal).

---

### D. Matematika SMP/MTs
* **Elemen & Sub-Elemen Materi:**
  1. **Bilangan Real:** Sifat bilangan, faktorisasi prima bentuk aljabar, bilangan berpangkat bulat, bentuk akar, notasi ilmiah, rasio skala, perbandingan senilai & berbalik nilai.
  2. **Aljabar:** Persamaan & Pertidaksamaan Linear Satu Variabel, SPLDV ($2x + ay = 4$), sifat operasi aljabar, relasi & fungsi ($domain, kodomain, range$), barisan & deret berhingga.
  3. **Geometri dan Pengukuran:** Sudut sehadap/berseberangan/berpelurus pada garis sejajar dipotong transversal, Teorema Pythagoras, kekongruenan & kesebangunan, transformasi geometri (refleksi, translasi, rotasi, dilatasi), luas gabungan lingkaran & segi banyak, volume prisma/limas/bola.
  4. **Data dan Peluang:** Ukuran pemusatan (*mean, median, modus*) & penyebaran (*jangkauan/range*), interpretasi diagram lingkaran/garis, peluang & frekuensi relatif kejadian tunggal.

---

## 4. KAIDAH PENULISAN & DESAIN SOAL BERKUALITAS

Ketika AI merancang soal TKA, wajib mengikuti standar berikut:

1. **Kontekstual & Realistis (Bukan Rumus Kering):**
   * Gunakan skenario kehidupan nyata Indonesia (pasar tradisional, bazar amal Ramadan, denah fasilitas publik taman kota, pekan literasi, resep makanan, jadwal transportasi, kemasan produk).
   * Gunakan nama tokoh lokal yang wajar (Pak Bondan, Bu Anita, Mae, Doni, Nisa, Danu, Caca, Antok, Dina, Mira, Tika).

2. **Kaidah Pengecoh (Distractor) yang Bermakna:**
   * Opsi yang salah **BUKAN** angka acak, melainkan hasil dari kesalahan konsep umum siswa (*common misconception*), seperti lupa menambahkan waktu istirahat, salah mengalikan pecahan, atau lupa mengurangkan diskon.

3. **Format Tipografi & Notasi Standar Indonesia:**
   * Format Desimal: Menggunakan tanda koma (contoh: `0,75`, `3,5`, `1,25`).
   * Format Ribuan: Menggunakan tanda titik (contoh: `Rp24.000,00`, `1.500 cm`).
   * Format Pecahan: Tuliskan dalam KaTeX rapi (`\frac{a}{b}` atau pecahan campuran `4\frac{3}{4}`).
   * Format Satuan: Tuliskan simbol resmi ($km, m, cm, mm, kg, hg, g, l, dl, hl, m^3, cm^3$).

---

## 5. BANK CONTOH SOAL STANDAR PUSMENDIK (FEW-SHOT EXAMPLES)

### Contoh 1: Matematika SD - Pilihan Ganda (Level 2 - Operasi Campuran Kontekstual)
* **Elemen:** Bilangan Rasional
* **Stimulus:**
  > Menjelang tahun ajaran baru, Toko Buku ABC memberikan diskon $10\%$ untuk semua jenis buku. Diketahui harga buku X adalah $\frac{1}{2}$ dari harga buku Y dan harga buku Z adalah $0{,}75$ kali harga buku Y. Apabila harga buku Y adalah $\text{Rp}24.000{,}00$, harga buku $\text{X} + \text{Z}$ setelah dikenakan diskon adalah ....
* **Pilihan Jawaban:**
  * A. $\text{Rp}18.000{,}00$
  * B. $\text{Rp}24.000{,}00$
  * C. $\text{Rp}27.000{,}00$
  * D. $\text{Rp}30.000{,}00$
* **Kunci Jawaban:** `C`
* **Pembahasan Singkat:**
  * Harga buku $\text{X} = \frac{1}{2} \times 24.000 = \text{Rp}12.000{,}00$.
  * Harga buku $\text{Z} = 0{,}75 \times 24.000 = \text{Rp}18.000{,}00$.
  * Total sebelum diskon $= 12.000 + 18.000 = \text{Rp}30.000{,}00$.
  * Diskon $10\% = \text{Rp}3.000{,}00 \implies \text{Harga Akhir} = 30.000 - 3.000 = \text{Rp}27.000{,}00$.

---

### Contoh 2: Matematika SD - PGK Kategori Benar/Salah (Level 3 - Penalaran Pecahan)
* **Elemen:** Bilangan Rasional
* **Stimulus:**
  > Pak Bondan seorang penjual susu kedelai. Suatu hari, Pak Bondan memproduksi susu kedelai sebanyak 9 wadah yang masing-masing berisi $4\frac{3}{4}$ liter susu kedelai. Seluruh hasil produksi tersebut akan dituangkan ke dalam 47 botol besar dengan isi yang sama banyak dan ke dalam 17 botol kecil dengan isi setiap botolnya adalah setengah botol besar.
  > Tentukan **Benar** atau **Salah** untuk setiap pernyataan berikut tentang hasil produksi susu kedelai Pak Bondan!
* **Tabel Pernyataan:**
  | # | Pernyataan | Pilihan Kunci |
  | :--- | :--- | :---: |
  | A | Pada hari itu Pak Bondan memproduksi $42\frac{3}{4}$ liter susu kedelai. | **Benar** |
  | B | Setiap botol besar diisi susu kedelai sebanyak $\frac{57}{74}$ liter. | **Benar** |
  | C | Total susu kedelai yang dikemas dalam botol kecil adalah $\frac{969}{74}$ liter. | **Salah** |

---

### Contoh 3: Matematika SD - PGK MCMA (Level 2 - Konversi Satuan Baku)
* **Elemen:** Geometri dan Pengukuran (Berat)
* **Stimulus:**
  > Setiap bulan Ramadan, SD Harapan mengadakan bakti sosial. Mereka membagi sembako yang berisi $3\text{ kg}$ beras, dua bungkus gula pasir dengan berat masing-masing kemasan $5\text{ hg}$, dan lima bungkus mi instan dengan berat per bungkus $85\text{ g}$.
  > Seberapa berat paket sembako tersebut?
  > *Pilihlah jawaban yang benar! Jawaban benar lebih dari satu.*
* **Opsi Checkbox:**
  - [x] Total berat semua isi paket adalah $4.425\text{ gram}$. *(Benar: $3000 + 1000 + 425 = 4425\text{ g}$)*
  - [ ] Berat mi instan dalam paket tersebut lebih dari $0{,}5\text{ kilogram}$. *(Salah: $425\text{ g} = 0{,}425\text{ kg} < 0{,}5\text{ kg}$)*
  - [x] Satu kemasan gula pasir lebih berat dibandingkan seluruh mi instan. *(Benar: $1\text{ gula} = 500\text{ g} > 425\text{ g}$)*
* **Kunci Jawaban:** `Pernyataan 1 dan Pernyataan 3`

---

### Contoh 4: Bahasa Indonesia SD - Soal Grup Teks Fiksi (3 Butir)
* **Teks Stimulus:** Fabel "Danau untuk Semua" (tentang Rino badak yang berendam di danau, Bani kelinci yang cemas, Hari harimau yang mengusulkan meminta bantuan Ucil kancil yang cerdik).
* **Butir 1 (PG - Pemahaman Tekstual):**
  * *Pertanyaan:* Siapa yang memiliki usul untuk meminta bantuan hewan yang cerdik?
  * *Kunci:* `D. Hari.`
* **Butir 2 (PG - Pemahaman Inferensial):**
  * *Pertanyaan:* Apa arti ungkapan "diam seribu bahasa" pada teks fabel tersebut?
  * *Kunci:* `B. Semua binatang di hutan menahan untuk tidak berkomentar.`
* **Butir 3 (PGK Kategori - Evaluasi dan Apresiasi):**
  * *Pertanyaan:* Tentukan **Sesuai** atau **Tidak Sesuai** contoh peristiwa kehidupan sehari-hari berdasarkan tindakan tokoh Ucil!
  * *Kunci:* `Tidak Sesuai, Sesuai, Sesuai`.

---

## 6. MASTER SYSTEM PROMPT UNTUK AI GENERATOR

Gunakan blok instruksi di bawah ini sebagai **System Prompt** saat meminta AI (Gemini/ChatGPT/Claude) untuk membuat soal baru:

```markdown
Anda adalah Penulis Soal Ahli Asesmen Nasional (Master Item Writer) dari Kementerian Pendidikan Dasar dan Menengah RI, yang bertugas menyusun soal Tes Kemampuan Akademik (TKA) sesuai Keputusan Kepala BSKAP No. 047/H/AN/2025.

PRINSIP WAJIB:
1. Soal menguji penalaran bermakna (HOTS/MOTS kontekstual), BUKAN hafalan rumus singkat.
2. Gunakan nama tokoh lokal Indonesia, konteks kehidupan sehari-hari yang realistis, santun, dan inklusif.
3. Notasi: gunakan koma untuk desimal (0,5), titik untuk ribuan (Rp10.000,00), dan KaTeX rapi untuk rumus/pecahan.
4. Dukung 3 Bentuk Soal Resmi:
   - PG: Pilihan Ganda 4 opsi (A, B, C, D) dengan 1 kunci benar.
   - PGK_MCMA: Pilihan Ganda Kompleks Multiple Choice Multiple Answers (centang >= 2 jawaban benar dari 3-4 opsi).
   - PGK_KATEGORI: Pilihan Ganda Kompleks Kategori (Tabel 3 pernyataan dengan opsi Benar/Salah, Sesuai/Tidak Sesuai, atau Setuju/Tidak Setuju).
5. Kunci jawaban dan pembahasan WAJIB diverifikasi keakuratan matematis dan kelogisannya secara mutlak.
```

---

## 7. SKEMA OUTPUT DATA JSON / MARKDOWN

Berikut adalah struktur representasi data terstandar jika soal diintegrasikan ke dalam aplikasi kuis/ujian:

```json
{
  "id": "tka-mat-sd-001",
  "jenjang": "SD",
  "mataPelajaran": "Matematika",
  "elemen": "Bilangan",
  "subElemen": "Bilangan Rasional",
  "levelKognitif": "Penalaran",
  "bentukSoal": "PGK_KATEGORI",
  "jenisSoal": "Tunggal",
  "stimulus": "Pak Bondan seorang penjual susu kedelai. Suatu hari, Pak Bondan memproduksi susu kedelai sebanyak 9 wadah yang masing-masing berisi 4 3/4 liter...",
  "pertanyaan": "Tentukan Benar atau Salah untuk setiap pernyataan berikut terkait hasil produksi susu kedelai Pak Bondan!",
  "tipeKategori": "BENAR_SALAH",
  "pernyataanKategori": [
    {
      "id": "A",
      "teks": "Pada hari itu Pak Bondan memproduksi 42 3/4 liter susu kedelai.",
      "kunci": "Benar"
    },
    {
      "id": "B",
      "teks": "Setiap botol besar diisi susu kedelai sebanyak 57/74 liter.",
      "kunci": "Benar"
    },
    {
      "id": "C",
      "teks": "Total susu kedelai yang dikemas dalam botol kecil adalah 969/74 liter.",
      "kunci": "Salah"
    }
  ],
  "pembahasan": "Total produksi = 9 x (19/4) = 171/4 = 42 3/4 liter (Pernyataan A Benar). Kapasitas 47 botol besar + 17 botol kecil (masing-masing 1/2 botol besar) = 47 + 8,5 = 55,5 = 111/2 botol besar. Isi 1 botol besar = (171/4) / (111/2) = (171/4) x (2/111) = 57/74 liter (Pernyataan B Benar). Total botol kecil = 17 x (1/2 x 57/74) = 17 x 57/148 = 969/148 liter != 969/74 (Pernyataan C Salah)."
}
```
