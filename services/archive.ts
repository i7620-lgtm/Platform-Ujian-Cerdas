import { supabase } from '../lib/supabase';
import { authService } from './auth';
import { examService } from './exam';
import { resultService } from './result';
import type { Exam, Result, Question, ExamSummary, TeacherProfile, AccountType, ExamConfig } from '../types';
import { normalize, parseList } from '../components/teacher/examUtils';

export class ArchiveService {

  // New method to handle the complete archive process with safety checks
  async performFullArchive(exam: Exam): Promise<{ backupUrl?: string }> {
      // 1. Get Fat Exam Object (Base64 Images)
      const fatExam = await examService.getExamForArchive(exam.code);
      if (!fatExam) throw new Error("Gagal mengambil data ujian.");

      // 2. Get All Results for this exam
      const examResults = await resultService.getResults(exam.code, undefined);

      // 3. Create comprehensive archive object (JSON)
      const archivePayload = {
          exam: fatExam,
          results: examResults
      };
      const jsonString = JSON.stringify(archivePayload);

      // 4. Calculate Statistics for SQL Analytics (Transaction Step 1)
      const summaries = this.calculateExamStatistics(fatExam, examResults);
      
      // FETCH AUTHOR REGION (Default if not manually edited)
      let authorRegion = '';
      if (exam.authorId) {
          const { data: profile } = await supabase
              .from('profiles')
              .select('regency')
              .eq('id', exam.authorId)
              .maybeSingle();
          if (profile?.regency) {
              authorRegion = profile.regency;
          }
      }

      // PRESERVE MANUAL EDITS: Fetch existing summaries first
      let existingList: any[] = [];
      try {
          const result = await supabase
              .from('exam_summaries')
              .select('region, exam_type, class_level, school_name')
              .eq('exam_code', exam.code);
          existingList = result.data || [];
      } catch (e) {
          console.warn("Failed to fetch existing summary:", e);
      }

      summaries.forEach(summary => {
          if (authorRegion) summary.region = authorRegion;
          const existing = existingList.find(e => e.school_name === summary.school_name) || existingList[0];
          if (existing) {
              if (existing.region) summary.region = existing.region;
              if (existing.exam_type) summary.exam_type = existing.exam_type;
          }
      });

      // Delete old summaries for this exam to avoid duplicates
      await supabase.from('exam_summaries').delete().eq('exam_code', exam.code);

      // 5. Insert Summaries into SQL (Transaction Step 2)
      // If this fails, we abort.
      let summaryError = null;
      const { error: initialError } = await supabase.from('exam_summaries').insert(summaries);
      
      if (initialError) {
          const status = (initialError as { status?: number }).status;
          if (initialError.code === 'PGRST204' || initialError.message?.includes('Could not find') || initialError.message?.includes('column') || status === 400) {
              console.warn("Schema cache error or missing columns, retrying without new columns...");
              const fallbackSummaries = summaries.map(s => {
                  const fallback = { ...s };
                  delete fallback.region;
                  delete fallback.exam_type;
                  delete fallback.class_level;
                  delete fallback.author_id;
                  return fallback;
              });
              const { error: fallbackError } = await supabase.from('exam_summaries').insert(fallbackSummaries);
              summaryError = fallbackError;
          } else {
              summaryError = initialError;
          }
      }

      if (summaryError) {
          console.error("Summary Insert Failed:", summaryError);
          throw new Error("Gagal menyimpan ringkasan statistik. Arsip dibatalkan. Detail: " + JSON.stringify(summaryError));
      }

      let backupUrl: string | undefined;

      // 6. ATTEMPT CLOUD UPLOAD (Transaction Step 3)
      try {
          await this.uploadArchive(exam.code, jsonString, {
              school: exam.authorSchool,
              subject: exam.config.subject,
              classLevel: exam.config.classLevel,
              examType: exam.config.examType,
              targetClasses: exam.config.targetClasses,
              date: exam.config.date,
              participantCount: examResults.length,
              authorId: exam.authorId
          });
          // 7. CLEANUP (Transaction Step 4 - Only if upload success)
          await examService.cleanupExamAssets(exam.code);
          await examService.deleteExam(exam.code);
      } catch (cloudError) {
          console.error("Cloud upload failed:", cloudError);
          // FALLBACK: Generate Blob URL for local download
          const blob = new Blob([jsonString], { type: "application/json" });
          backupUrl = URL.createObjectURL(blob);
      }

      return { backupUrl };
  }

  async registerLegacyArchive(exam: Exam, results: Result[]): Promise<void> {
      const summaries = this.calculateExamStatistics(exam, results);

      // FETCH AUTHOR REGION (Default if not manually edited)
      let authorRegion = '';
      if (exam.authorId) {
          const { data: profile } = await supabase
              .from('profiles')
              .select('regency')
              .eq('id', exam.authorId)
              .maybeSingle();
          if (profile?.regency) {
              authorRegion = profile.regency;
          }
      }

      // PRESERVE MANUAL EDITS: Fetch existing summaries first
      let existingList: any[] = [];
      try {
          const result = await supabase
              .from('exam_summaries')
              .select('region, exam_type, class_level, school_name')
              .eq('exam_code', exam.code);
          existingList = result.data || [];
      } catch (e) {
          console.warn("Failed to fetch existing summary in legacy archive:", e);
      }

      // Restore manual edits if available
      summaries.forEach(summary => {
          if (authorRegion) summary.region = authorRegion;
          const existing = existingList.find(e => e.school_name === summary.school_name) || existingList[0];
          if (existing) {
              if (existing.region) summary.region = existing.region;
              if (existing.exam_type) summary.exam_type = existing.exam_type;
          }
      });

      // Clear old data
      await supabase.from('exam_summaries').delete().eq('exam_code', exam.code);

      // Insert summaries
      let summaryError = null;
      const { error: initialError } = await supabase.from('exam_summaries').insert(summaries);
      
      if (initialError) {
          const status = (initialError as { status?: number }).status;
          if (initialError.code === 'PGRST204' || initialError.message?.includes('Could not find') || initialError.message?.includes('column') || status === 400) {
              console.warn("Schema cache error in legacy archive, retrying without new columns...");
              const fallbackSummaries = summaries.map(s => {
                  const fallback = { ...s };
                  delete fallback.region;
                  delete fallback.exam_type;
                  delete fallback.class_level;
                  delete fallback.author_id;
                  return fallback;
              });
              const { error: fallbackError } = await supabase.from('exam_summaries').insert(fallbackSummaries);
              summaryError = fallbackError;
          } else {
              summaryError = initialError;
          }
      }

      if (summaryError) {
          console.error("Legacy Stats Insert Failed:", summaryError);
          throw new Error("Gagal menyimpan statistik ke database: " + JSON.stringify(summaryError));
      }
  }

  calculateExamStatistics(exam: Exam, results: Result[]): Partial<ExamSummary>[] {
      // Group results by school
      const schoolGroups: Record<string, Result[]> = {};
      
      results.forEach(r => {
          const school = r.student.schoolName || exam.authorSchool || 'Unknown School';
          if (!schoolGroups[school]) {
              schoolGroups[school] = [];
          }
          schoolGroups[school].push(r);
      });

      if (results.length === 0) {
          const defaultSchool = exam.authorSchool || 'Unknown School';
          schoolGroups[defaultSchool] = [];
      }

      const summaries: Partial<ExamSummary>[] = [];

      for (const [schoolName, schoolResults] of Object.entries(schoolGroups)) {
          const scores = schoolResults.map(r => Number(r.score));
          const total = scores.length;
          const kkmThreshold = Number(exam.config.kkm) || 75;
          
          const avg = total > 0 ? scores.reduce((a, b) => a + b, 0) / total : 0;
          const max = total > 0 ? Math.max(...scores) : 0;
          const min = total > 0 ? Math.min(...scores) : 0;
          const passing = scores.filter(s => s >= kkmThreshold).length;
          const passingRate = total > 0 ? (passing / total) * 100 : 0;

          // Segmentasi 4 Jenjang Kompetensi Standar Asesmen Nasional / Kurikulum Merdeka
          const perluBimbinganStudents = schoolResults.filter(r => Number(r.score) < 55).map(r => r.student.fullName || (r.student as any).name || 'Siswa');
          const dasarStudents = schoolResults.filter(r => Number(r.score) >= 55 && Number(r.score) < 70).map(r => r.student.fullName || (r.student as any).name || 'Siswa');
          const cakapStudents = schoolResults.filter(r => Number(r.score) >= 70 && Number(r.score) < 85).map(r => r.student.fullName || (r.student as any).name || 'Siswa');
          const mahirStudents = schoolResults.filter(r => Number(r.score) >= 85).map(r => r.student.fullName || (r.student as any).name || 'Siswa');

          const tierStats = {
              kkm: kkmThreshold,
              perlu_bimbingan: {
                  tier: "Perlu Bimbingan",
                  range: "0 - 54",
                  count: perluBimbinganStudents.length,
                  percentage: total > 0 ? Math.round((perluBimbinganStudents.length / total) * 100) : 0,
                  students: perluBimbinganStudents
              },
              dasar: {
                  tier: "Dasar",
                  range: "55 - 69",
                  count: dasarStudents.length,
                  percentage: total > 0 ? Math.round((dasarStudents.length / total) * 100) : 0,
                  students: dasarStudents
              },
              cakap: {
                  tier: "Cakap",
                  range: "70 - 84",
                  count: cakapStudents.length,
                  percentage: total > 0 ? Math.round((cakapStudents.length / total) * 100) : 0,
                  students: cakapStudents
              },
              mahir: {
                  tier: "Mahir",
                  range: "85 - 100",
                  count: mahirStudents.length,
                  percentage: total > 0 ? Math.round((mahirStudents.length / total) * 100) : 0,
                  students: mahirStudents
              }
          };

          const questionStats: Record<string, unknown>[] = exam.questions
              .filter(q => q.questionType !== 'INFO')
              .map((q, idx) => {
                  let correctCount = 0;
                  const answerDist: Record<string, number> = {};
                  
                  schoolResults.forEach(r => {
                      const ans = r.answers[q.id];
                      const manualGradeKey = `_grade_${q.id}`;
                      
                      if (r.answers[manualGradeKey]) {
                          if (r.answers[manualGradeKey] === 'CORRECT') correctCount++;
                      } else if (this.isAnswerCorrect(q, ans)) {
                          correctCount++;
                      }
                      
                      if (ans) {
                          const strAns = typeof ans === 'string' ? ans : JSON.stringify(ans);
                          answerDist[strAns] = (answerDist[strAns] || 0) + 1;
                      }
                  });

                  const topWrongAns = this.getTopWrongAnswer(answerDist, q);
                  let topWrongCount = 0;
                  if (topWrongAns && answerDist[topWrongAns]) {
                      topWrongCount = answerDist[topWrongAns];
                  }
                  const topWrongRate = total > 0 ? Math.round((topWrongCount / total) * 100) : 0;
                  const correctRate = total > 0 ? Math.round((correctCount / total) * 100) : 0;

                  return {
                      id: q.id,
                      number: idx + 1,
                      type: q.questionType,
                      kisiKisi: q.kisiKisi || "",
                      level: q.level || "",
                      category: q.category || "",
                      scoreWeight: q.scoreWeight || 1,
                      correct_rate: correctRate,
                      top_wrong_answer: topWrongAns,
                      top_wrong_rate: topWrongRate,
                      answer_distribution: answerDist
                  };
              });

          const uniqueClasses = Array.from(new Set(schoolResults.map(r => r.student.class).filter(Boolean)));
          const classLevelStr = uniqueClasses.length > 0 
              ? uniqueClasses.join(', ') 
              : [exam.config.classLevel, ...(exam.config.targetClasses || [])].filter(Boolean).join(', ');

          summaries.push({
              school_name: String(schoolName || '').substring(0, 255),
              exam_subject: String(exam.config.subject || '').substring(0, 255),
              exam_code: String(exam.code || '').substring(0, 50),
              exam_type: String(exam.config.examType || '').substring(0, 50), 
              class_level: String(classLevelStr || '').substring(0, 255), 
              exam_date: exam.config.date || exam.config.startDate || new Date().toISOString().split('T')[0],
              total_participants: total,
              average_score: parseFloat(avg.toFixed(2)),
              highest_score: max,
              lowest_score: min,
              passing_rate: parseFloat(passingRate.toFixed(2)),
              question_stats: questionStats,
              tier_stats: tierStats,
              region: '',
              author_id: exam.authorId 
          });
      }

      return summaries;
  }

  private isAnswerCorrect(q: Question, ans: unknown): boolean {
      if (!ans) return false;
      
      if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
          return normalize(ans as string, q.questionType) === normalize(q.correctAnswer || '', q.questionType);
      }
      
      if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
          const sSet = new Set(parseList(String(ans)).map(a => normalize(a, q.questionType)));
          const cSet = new Set(parseList(q.correctAnswer).map(a => normalize(a, q.questionType)));
          return sSet.size === cSet.size && [...sSet].every(x => cSet.has(x));
      }
      return false;
  }

  private getTopWrongAnswer(dist: Record<string, number>, q: Question): string | null {
      let max = 0;
      let topAns = null;
      for (const [ans, count] of Object.entries(dist)) {
          if (!this.isAnswerCorrect(q, ans) && count > max) {
              max = count;
              topAns = ans;
          }
      }
      return topAns;
  }

  async getAnalyticsData(filters?: { region?: string, subject?: string, school?: string, classLevel?: string, examType?: string, date?: string }): Promise<ExamSummary[]> {
      await authService._verifyRole(['super_admin', 'admin_sekolah']);

      let query = supabase.from('exam_summaries').select('*');
      if (filters?.region) query = query.ilike('region', `%${filters.region}%`);
      if (filters?.school) query = query.or(`school_name.ilike.%${filters.school}%,class_level.ilike.%${filters.school}%`);
      if (filters?.subject) query = query.ilike('exam_subject', `%${filters.subject}%`);
      if (filters?.classLevel) query = query.ilike('class_level', `%${filters.classLevel}%`);
      if (filters?.examType) query = query.ilike('exam_type', `%${filters.examType}%`);
      if (filters?.date) query = query.ilike('exam_date', `%${filters.date}%`);
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) return [];
      return data as ExamSummary[];
  }

  async deleteAnalyticsData(id: string): Promise<void> {
      await authService._verifyRole(['super_admin']);

      const { error } = await supabase.from('exam_summaries').delete().eq('id', id);
      if (error) throw error;
  }

  // --- PROMPT GENERATOR (NO AI CALL) ---
  generateAnalysisPrompt(summaries: ExamSummary[], customPrompt?: string, examQuestions?: Question[], existingAnalyses?: Record<string, string>): string {
      const stripBase64 = (str: string): string => {
          if (typeof str !== 'string') return str;
          return str.replace(/data:image\/[a-zA-Z+-]+;base64,[^\s"']+/g, '[Gambar]');
      };

      const simpleData = summaries.map(s => ({
          school: s.school_name,
          region: s.region,
          class: s.class_level,
          subject: s.exam_subject,
          exam_type: s.exam_type,
          avg: s.average_score,
          highest_score: s.highest_score,
          lowest_score: s.lowest_score,
          participants: s.total_participants,
          passing_rate: s.passing_rate,
          tier_distribution: s.tier_stats || null,
          weakness_count: s.question_stats.filter((qs: Record<string, unknown>) => (qs.correct_rate as number) < 60).length,
          critical_questions_summary: s.question_stats
              .filter((qs: Record<string, unknown>) => (qs.correct_rate as number) < 60)
              .map((qs: Record<string, unknown>) => ({
                  soal: `soal nomor ${qs.number || 1}`,
                  kebenaran: `${qs.correct_rate}%`,
                  pengecoh_terpopuler: qs.top_wrong_answer ? `${qs.top_wrong_answer} (${qs.top_wrong_rate}%)` : 'Tersebar merata',
                  kisi_kisi: qs.kisiKisi || qs.category || 'Materi Inti'
              }))
      }));

      // Map examQuestions to a structured list for the AI to understand the exam content and formulate exact remedial/enrichment questions
      const questionDetails = examQuestions
          ? examQuestions
              .filter(q => q.questionType !== 'INFO')
              .map((q, idx) => {
                  let correctRate: number | undefined;
                  let topWrongAnswer: string | null = null;
                  let topWrongRate: number | undefined;
                  let answerDist: Record<string, number> | undefined;

                  for (const s of summaries) {
                      const qs = s.question_stats?.find((item: any) => item.id === q.id || item.number === idx + 1);
                      if (qs) {
                          correctRate = qs.correct_rate as number;
                          topWrongAnswer = qs.top_wrong_answer as string | null;
                          topWrongRate = qs.top_wrong_rate as number;
                          answerDist = qs.answer_distribution as Record<string, number>;
                          break;
                      }
                  }

                  return {
                      number: idx + 1,
                      text: stripBase64(q.questionText || ""),
                      type: q.questionType,
                      options: (q.options || []).map(o => stripBase64(o || "")),
                      correctAnswer: q.correctAnswer || "",
                      kisiKisi: q.kisiKisi || "",
                      level: q.level || "",
                      category: q.category || "",
                      scoreWeight: q.scoreWeight || 1,
                      correct_rate: correctRate,
                      top_wrong_answer: topWrongAnswer,
                      top_wrong_rate: topWrongRate,
                      answer_distribution: answerDist,
                      is_critical: typeof correctRate === 'number' && correctRate < 60
                  };
              })
          : [];

      const defaultTask = `Buatlah laporan "Analisis Karakteristik, Diagnostik Butir Soal, dan Matriks Intervensi Berjenjang Hasil Ujian" yang sangat komprehensif, tajam, dan siap dieksekusi langsung oleh guru di kelas. Jika data input berisi beberapa sekolah yang berbeda, Anda WAJIB menganalisis dan membuat penjabaran performa untuk MASING-MASING sekolah secara terpisah.`;

      const isTKA = summaries.some(s => {
          const t = (s.exam_type || '').toLowerCase().trim();
          return t === 'tka' || t.includes('tka');
      });

      const rule6 = isTKA
          ? `6. STANDAR EVALUASI NILAI RATA-RATA TKA (WAJIB UNTUK UJIAN TKA): Pada bagian RINGKASAN EKSEKUTIF, Anda WAJIB membuat sub-bagian khusus dengan judul "Evaluasi Nilai Rata-Rata Berdasarkan Standar Nasional". Bandingkan nilai rata-rata siswa secara spesifik dengan rerata skor TKA nasional di Indonesia yang terbaru (sekitar 500-550 poin atau setara dengan 50%-55% ketuntasan pada skala penilaian nasional terbaru) agar analisis ringkasan eksekutif terlihat lebih faktual, realistis, dan berbobot akademis tinggi.
           - ATURAN KEPADATAN INFORMASI TKA: JANGAN PERNAH menulis penjelasan yang bertele-tele atau tidak penting. Tulis analisis yang langsung, faktual, padat, penting, dan mudah dipahami guru.`
          : `6. STANDAR EVALUASI RINGKASAN (BUKAN UJIAN TKA): Karena ini BUKAN ujian berjenis TKA, DILARANG membuat sub-bagian atau mencantumkan judul "Evaluasi Nilai Rata-Rata Berdasarkan Standar Nasional" dan DILARANG membandingkannya dengan standar nilai nasional TKA. Cukup berikan analisis ringkasan pencapaian dan rata-rata performa kelas secara deskriptif langsung di dalam Ringkasan Eksekutif.`;

      const ringkasanEksekutifStructure = isTKA
          ? `1. RINGKASAN EKSEKUTIF & DATA MAKRO HASIL BELAJAR:
           - Tampilkan sintesis data makro: Rerata nilai kelas, nilai tertinggi & terendah, persentase kelulusan terhadap batas KKM, dan jumlah total peserta.
           - Sub-bagian "### Evaluasi Nilai Rata-Rata Berdasarkan Standar Nasional": Berisi evaluasi nilai rata-rata kelas sesuai standar TKA di atas. JANGAN gunakan pengantar panjang lebar, langsung ke poin evaluasinya saja.
           - Pemetaan Sebaran 4 Jenjang Kompetensi (Perlu Bimbingan 0-54, Dasar 55-69, Cakap 70-84, Mahir 85-100) secara deskriptif dan padat.
           - Identifikasi kekuatan materi yang sudah tuntas secara agregat vs topik materi kritis yang mengalami anjlok pemahaman.`
          : `1. RINGKASAN EKSEKUTIF & DATA MAKRO HASIL BELAJAR:
           - Tampilkan sintesis data makro: Rerata nilai kelas, nilai tertinggi & terendah, persentase kelulusan terhadap batas KKM, dan jumlah total peserta (DILARANG membuat sub-bagian "Evaluasi Nilai Rata-Rata Berdasarkan Standar Nasional").
           - Pemetaan Sebaran 4 Jenjang Kompetensi (Perlu Bimbingan 0-54, Dasar 55-69, Cakap 70-84, Mahir 85-100) secara deskriptif dan padat.
           - Identifikasi kekuatan materi yang sudah tuntas secara agregat vs topik materi kritis yang mengalami anjlok pemahaman.`;

      let existingAnalysesText = "";
      if (existingAnalyses && Object.keys(existingAnalyses).length > 0) {
          const relevantAnalyses = Object.entries(existingAnalyses).filter(([key]) => key !== "OVERALL");
          if (relevantAnalyses.length > 0) {
              existingAnalysesText = "\n\nBERIKUT ADALAH ANALISIS PER KELAS YANG SUDAH DILAKUKAN SEBELUMNYA. Gunakan ini sebagai referensi penting dan JANGAN melakukan analisis ulang terpisah untuk kelas-kelas ini. Cukup buat analisis kelas yang belum ada (bila ada), lalu sintesiskan menjadi laporan analisis keseluruhan:\n" + 
                  relevantAnalyses.map(([key, content]) => {
                      let title = "Kelas";
                      const match = key.match(/school_(.*)_class_(.*)/);
                      if (match) {
                          title = `Kelas: ${match[2]} (${match[1]})`;
                      }
                      return `--- ${title} ---\n${content}\n`;
                  }).join("\n");
          }
      }

      return `
        Anda adalah Konsultan Ahli Data Pendidikan & Diagnostik Pembelajaran Berbasis Kompetensi (Kurikulum Merdeka & Asesmen Nasional).
        Tugas Anda adalah membedah hasil ujian ini menjadi laporan diagnostik klinis pendidikan yang tajam, sangat detail, mendalam, dan langsung membimbing guru untuk terjun melakukan intervensi kelas secara presisi.
        
        INPUT DATA MAKRO & SEBARAN JENJANG (JSON):
        ${JSON.stringify(simpleData)}

        EXAM QUESTIONS LIST WITH ITEM PERFORMANCE & DISTRACTORS (JSON):
        ${JSON.stringify(questionDetails)}

        ${existingAnalysesText}

        TASK:
        ${customPrompt || defaultTask}
        
        OUTPUT FORMAT & STYLING RULES:
        - Gunakan Bahasa Indonesia akademis, profesional, dan instruksional yang jelas dan solutif.
        - Gunakan format Markdown standar (Heading 1-3, bullet points, dan Tabel Markdown).
        - DILARANG menggunakan tag HTML mentah (misal: <table>, <div>, <span>).
        - Jika terdapat lebih dari 1 sekolah, buat sub-bagian terpisah (Heading 2) untuk SETIAP sekolah.
        
        ATURAN KRITIS (CRITICAL RULES):
        1. IDENTIFIKASI SOAL: JANGAN PERNAH menyebutkan atau menampilkan ID soal internal mentah (seperti "Q1770787225501", "id-soal"). Anda WAJIB selalu menyebutnya dengan format "soal nomor [nomor]" (misalnya: "soal nomor 1", "soal nomor 2", "soal nomor 3") sesuai dengan urutan nomor di daftar soal.
        2. BEBAS PROGRESS BAR ASCII: JANGAN menggunakan diagram garis ASCII tekstual (seperti "[||||||||||] 53%") karena visualisasi diagram interaktif sudah disediakan langsung di web. Cukup sebutkan angka persentase numerik langsung dalam kalimat atau tabel.
        3. BEDAH MIKRO BUTIR SOAL KRITIS: Lakukan bedah diagnostik mendalam untuk SEMUA butir soal yang memiliki tingkat kebenaran rendah (< 60% benar). Laporkan teks soal, indikator/kisi-kisi materi, persentase benar, opsi salah terpopuler (pengecoh dominan), akar miskonsepsi mengapa siswa salah berpikir, dan cara mengobati kesalahan tersebut sampai tuntas.
        4. CARA MENGOBATI KESALAHAN SAMPAI TUNTAS (TERAPI PEDAGOGIS): Sebelum memberikan latihan soal remedial, guru WAJIB diberikan petunjuk pedagogis konkret bagaimana mengajarkan ulang konsep tersebut di kelas (misal: penggunaan model visual, analogi konkret, dekonstruksi struktur kalimat soal, atau pembongkaran jebakan opsi).
        5. MATRIKS INTERVENSI BERJENJANG (TABEL KOMPREHENSIF): Anda WAJIB menyajikan Tabel Markdown 5 Kolom yang memetakan 4 jenjang kompetensi (Perlu Bimbingan 0-54, Dasar 55-69, Cakap 70-84, Mahir 85-100), mencantumkan nama siswa terkait dari data input, akar masalah belajar, tindakan guru, dan indikator target ketuntasan.
        6. PERSAMAAN MATEMATIKA TANPA LATEX: JANGAN PERNAH menggunakan sintaks matematika LaTeX seperti \\frac, \\div, \\times, $ atau $$ pada teks laporan maupun pada contoh soal remedial/pengayaan. Selalu gunakan penulisan teks biasa atau simbol Unicode standar yang bersih dan mudah dibaca (contoh: '1/5' atau '1 per 5', '240 : 6 + 15 = 55', simbol '÷' atau ':' untuk pembagian, '×' atau '*' untuk perkalian, '²', '³', '√', dsb.).
        ${rule6}
        7. DETEKSI KESALAHAN KUNCI JAWABAN (CRITICAL BIAS ANALYSIS):
           - Secara aktif periksa potensi salah kunci: Jika tingkat kebenaran 'correct_rate' sangat rendah (< 35%) DAN ada satu jawaban salah terpopuler ('top_wrong_answer') yang dipilih mayoritas siswa (> 45%).
           - Jika secara logis/akademis opsi terpopuler tersebut sebenarnya adalah jawaban yang benar, atau jika soal memiliki ambiguitas fatal, laporkan dengan tegas sebagai "Indikasi Kesalahan Kunci Jawaban", jelaskan alasannya, dan berikan saran kunci koreksi.

        STRUKTUR LAPORAN ANALISIS AI:

        # Laporan Diagnostik & Analisis Hasil Belajar AI: [Mata Pelajaran]

        ${ringkasanEksekutifStructure}

        2. BEDAH MIKRO BUTIR SOAL KRITIS & TERAPI PENUNTASAN KONSEP:
           Bedah secara tuntas setiap butir soal yang memiliki tingkat kebenaran < 60% (atau soal-soal tersulit di ujian jika semua soal > 60%). Susun dengan format seragam per butir soal:
           - ### Soal Nomor [X] – [Topik / Kisi-Kisi Materi]
             * **Karakteristik Butir**: Tingkat Kebenaran ([correct_rate]%), Tingkat Kesulitan, dan Bobot Soal.
             * **Pola Jawaban & Pengecoh Terkuat**: Kunci benar vs jawaban salah terpopuler (dipilih oleh [top_wrong_rate]% siswa). Cantumkan deteksi kesalahan kunci jawaban jika terindikasi.
             * **Akar Miskonsepsi Siswa**: Jelaskan secara tajam proses berpikir semu siswa, jebakan kognitif, atau konsep prasyarat apa yang tertukar sehingga siswa memilih jawaban pengecoh tersebut.
             * **Terapi Pedagogis Guru ("Cara Mengobati Sampai Tuntas")**: Berikan panduan langkah-demi-langkah konkret bagaimana guru mengajarkan ulang konsep ini di kelas secara tuntas (analog, visualisasi konkret, dekonstruksi jebakan, verifikasi konsep dasar) SEBELUM siswa diberikan latihan remedial.

        3. MATRIKS INTERVENSI BERJENJANG (TABEL KOMPREHENSIF 4 JENJANG):
           Sajikan tabel komprehensif berikut secara utuh dan lengkap:
           | Jenjang Kompetensi | Daftar Siswa Terkait | Diagnosis Akar Hambatan Belajar | Aksi Pedagogis Nyata Guru di Kelas | Target Capaian & Verifikasi Ketuntasan |
           | :--- | :--- | :--- | :--- | :--- |
           | **Perlu Bimbingan (0 - 54)** | [Cantumkan nama-nama siswa pada tier perlu_bimbingan dari input data] | Kesulitan memahami konsep dasar prasyarat, hambatan literasi pemahaman kalimat soal panjang | Bimbingan klinis 1-on-1 atau kelompok kecil (3-4 siswa), pembedahan konsep dari nol dengan visualisasi/konkret | Memahami 100% konsep dasar inti; verifikasi lewat tanya-jawab konsep lisan dan contoh sederhana |
           | **Dasar (55 - 69)** | [Cantumkan nama-nama siswa pada tier dasar dari input data] | Memahami konsep dasar terpisah, tetapi bingung pada prosedur bertahap dan mudah terkecoh opsi jebakan | Scaffolding terbimbing bertahap, demonstrasi model pemecahan terstruktur, latihan kelompok kecil | Tuntas KKM secara mandiri; verifikasi lewat lembar kerja bertahap (worked examples) |
           | **Cakap (70 - 84)** | [Cantumkan nama-nama siswa pada tier cakap dari input data] | Tuntas KKM dan konsep matang, namun kurang cermat pada soal analisis bertingkat atau variasi kontekstual | Penguatan metakognisi (strategi cek ulang, analisis pengecoh), latihan variasi soal cerita multi-langkah | Stabilitas akurasi > 85%; verifikasi lewat soal variasi kontekstual |
           | **Mahir (85 - 100)** | [Cantumkan nama-nama siswa pada tier mahir dari input data] | Daya tangkap dan nalar sangat kuat, membutuhkan stimulasi intelektual lanjutan agar tidak pasif | Pemberian proyek analitis terbuka, peran sebagai tutor sebaya (peer tutor) yang mendampingi kelompok belajar | Penguasaan transfer konsep tingkat tinggi (HOTS lanjut) dan kepemimpinan belajar |

        4. REKOMENDASI MANAJEMEN KELAS & PEMBELAJARAN TERDIFERENSIASI:
           - Berikan 3-4 strategi konkret bagi guru untuk mengelola kelas diferensiasi (misal: pembagian jam remedial mandiri vs tutor sebaya, rotasi stasiun belajar).

        5. BANK SOAL REMEDIAL & PENGAYAAN HOTS SIAP PAKAI (TANPA LATEX):
           - ### Paket Soal Remedial (Minimal 5 Soal Baru)
             Buat minimal 5 contoh soal latihan remedial konkret, baru, dan setara indikator pencapaian kompetensi dengan butir-butir soal yang dibedah di Bagian 2. Tuliskan kelima soal tersebut secara lengkap dengan teks soal baru, pilihan jawaban (A-E jika pilihan ganda), kunci jawaban, dan pembahasan tuntas.
           - ### Paket Soal Pengayaan HOTS (Minimal 5 Soal Baru)
             Buat minimal 5 contoh soal tantangan pengayaan konkret, baru, dan lebih menantang (HOTS) berdasarkan topik utama ujian ini untuk memfasilitasi siswa kelompok Cakap & Mahir. Tuliskan kelima soal tersebut secara lengkap dengan teks soal baru, pilihan jawaban (A-E jika pilihan ganda), kunci jawaban, dan pembahasan analitis.
      `.trim();
  }

  // --- GEMINI AI ANALYTICS (GENERATIVE VISUALIZATION) ---
  async generateAIAnalysis(summaries: ExamSummary[], customPrompt?: string, examQuestions?: Question[], existingAnalyses?: Record<string, string>): Promise<string> {
      try {
          const prompt = this.generateAnalysisPrompt(summaries, customPrompt, examQuestions, existingAnalyses);
          
          const res = await fetch("/api/generate-analysis", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt })
          });

          if (!res.ok) {
              const text = await res.text().catch(() => "");
              let serverError = "Gagal menghubungi server analisis AI.";
              try {
                  const parsed = JSON.parse(text);
                  serverError = parsed.error || serverError;
              } catch {
                  if (text.includes("API key is missing") || text.includes("api key is missing")) {
                      serverError = "API Key Gemini belum dikonfigurasi di server.";
                  } else if (text.length > 0 && text.length < 200) {
                      serverError = `Error Server (${res.status}): ${text}`;
                  }
              }
              throw new Error(serverError);
          }

          const contentType = res.headers.get("Content-Type") || "";
          if (!contentType.includes("application/json")) {
              throw new Error("Respon server tidak valid (bukan JSON).");
          }

          const data = await res.json();
          if (!data.success) {
              throw new Error(data.error || "Gagal menghasilkan analisis.");
          }

          return data.text || "Gagal menghasilkan analisis.";
      } catch (e) {
          console.error("Gemini Error:", e);
          
          const errorMsg = e instanceof Error ? e.message.toLowerCase() : String(e).toLowerCase();
          
          let title = "Layanan Sedang Sibuk";
          let message = "Kuota analisis AI harian/menit tercapai. Mohon tunggu beberapa saat sebelum mencoba lagi.";

          if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('exhausted') || (e && typeof e === 'object' && 'status' in e && e.status === 429)) {
              if (errorMsg.includes('per minute') && errorMsg.includes('requests')) {
                  title = "Peringatan Tipe 1: Batas Per Menit";
                  message = "Batas 15 penggunaan per menit telah tercapai pada akun gratis Gemini Flash. Silakan tunggu 1 menit lalu coba lagi.";
              } else if (errorMsg.includes('per day')) {
                  title = "Peringatan Tipe 2: Batas Harian";
                  message = "Batas penggunaan harian gratis (1500 request/hari) dari Gemini Flash telah habis. Silakan coba kembali besok hari.";
              } else if (errorMsg.includes('tokens')) {
                  title = "Peringatan Tipe 3: Batas Token Teks";
                  message = "Data analisis terlalu panjang dan melebihi batas (Maks 1 juta token/menit). Kurangi data atau tunggu 1 menit sebelum mencoba lagi.";
              } else {
                 title = "Batas Kuota Pemakaian Tercapai";
                 message = "Batas pemakaian wajar (kuota gratis) Gemini AI (per menit/harian) telah habis. Silahkan mencobanya kembali nanti.";
              }

             return `
                <div class="p-6 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl flex flex-col items-center text-center gap-3">
                    <div class="w-12 h-12 bg-rose-100 dark:bg-rose-800 text-rose-500 rounded-full flex items-center justify-center text-xl">⏳</div>
                    <h3 class="text-lg font-bold text-rose-700 dark:text-rose-300">${title}</h3>
                    <p class="text-sm text-rose-600 dark:text-rose-400">${message}</p>
                </div>
             `;
          }

          return "Maaf, layanan analisis AI sedang mengalami gangguan. Silakan coba lagi nanti.";
      }
  }

  // --- COLD DATA (CLOUD ARCHIVE) METHODS ---

  async uploadArchive(examCode: string, jsonString: string, metadata?: Record<string, unknown>): Promise<string> {
      const blob = new Blob([jsonString], { type: "application/json" });
      const cleanExamCode = String(examCode || 'EXAM').substring(0, 10).replace(/[^a-zA-Z0-9_-]/g, '');
      let filename = `${cleanExamCode}_${Date.now()}.json`;
      
      if (metadata) {
          try {
              let safeAuthorId = metadata.authorId;
              if (!safeAuthorId || String(safeAuthorId).trim() === '' || String(safeAuthorId) === 'undefined' || String(safeAuthorId) === 'null') {
                  safeAuthorId = '';
              } else {
                  // Remove hyphens to compress UUID from 36 to 32 chars
                  safeAuthorId = String(safeAuthorId).replace(/-/g, '');
              }
              
              const rawTc = Array.isArray(metadata.targetClasses) 
                  ? metadata.targetClasses.filter(Boolean).join(',') 
                  : String(metadata.targetClasses || '').trim();
              
              // Helper to generate base64 metadata filename with dynamic string lengths
              const createFilenameWithLimits = (maxSchoolLen: number, maxSubjLen: number, maxClassLen: number) => {
                  const minMeta = {
                      s: String(metadata.school || '').substring(0, maxSchoolLen),
                      su: String(metadata.subject || '').substring(0, maxSubjLen),
                      c: String(metadata.classLevel || '').substring(0, maxClassLen),
                      t: String(metadata.examType || '').substring(0, 12),
                      tc: rawTc ? [rawTc.substring(0, 15)] : [],
                      d: String(metadata.date || '').substring(0, 10),
                      p: typeof metadata.participantCount === 'number' ? metadata.participantCount : 0,
                      a: safeAuthorId,
                      ai: metadata.hasAiAnalysis ? 1 : 0
                  };

                  const jsonStr = JSON.stringify(minMeta);
                  const encodedStr = encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g,
                      (match, p1) => String.fromCharCode(Number('0x' + p1))
                  );
                  const b64 = btoa(encodedStr)
                      .replace(/\+/g, '-')
                      .replace(/\//g, '_')
                      .replace(/=+$/, '');
                  
                  return `${cleanExamCode}_meta_${b64}.${Date.now()}.json`;
              };

              // Try full length first (40, 30, 20), then gracefully scale down if filename approaches limits
              let potentialFileName = createFilenameWithLimits(40, 30, 20);
              if (potentialFileName.length > 350) {
                  potentialFileName = createFilenameWithLimits(20, 20, 10);
              }
              if (potentialFileName.length > 350) {
                  potentialFileName = createFilenameWithLimits(10, 10, 6);
              }
              if (potentialFileName.length > 350) {
                  potentialFileName = createFilenameWithLimits(5, 5, 4);
              }
              
              if (potentialFileName.length <= 400) {
                  filename = potentialFileName;
              }
          } catch (e) {
              console.warn("Failed to encode metadata into filename, using simple name", e);
          }
      }
      
      const { data, error } = await supabase.storage
          .from('archives')
          .upload(filename, blob, { upsert: true, cacheControl: '31536000' });
          
      if (error) throw error;
      return data?.path || filename;
  }

   async getArchivedList(): Promise<{name: string, created_at: string, size: number, metadata?: Record<string, unknown>}[]> {
      const { data, error } = await supabase.storage.from('archives').list('', {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'desc' },
      });
      
      if (error) {
          console.warn("Failed to list archives:", error);
          return [];
      }
      
      if (!data || !Array.isArray(data)) {
          return [];
      }

      const fileExamCodes = data.map(f => {
          const fileName = f && typeof f.name === 'string' ? f.name : "";
          return fileName.includes('_meta_')
              ? fileName.split('_meta_')[0].toUpperCase().trim()
              : fileName.split('_')[0].replace(/\.json$/i, '').toUpperCase().trim();
      }).filter(Boolean);

      // Pre-fetch all summaries to enrich legacy or plain archives (e.g. BO3PDS_1788312182598.json)
      const summaryMap = new Map<string, any>();
      if (fileExamCodes.length > 0) {
          const uniqueCodes = Array.from(new Set(fileExamCodes));
          const chunkSize = 100;
          for (let i = 0; i < uniqueCodes.length; i += chunkSize) {
              const chunk = uniqueCodes.slice(i, i + chunkSize);
              try {
                  const { data: summaries } = await supabase
                      .from('exam_summaries')
                      .select('exam_code, school_name, exam_subject, exam_type, class_level, exam_date, total_participants, author_id')
                      .in('exam_code', chunk);
                  
                  if (summaries && Array.isArray(summaries)) {
                      summaries.forEach((s) => {
                          if (s && s.exam_code) {
                              const code = String(s.exam_code).toUpperCase().trim();
                              if (!summaryMap.has(code)) {
                                  summaryMap.set(code, s);
                              }
                          }
                      });
                  }
              } catch (err) {
                  console.warn("Could not fetch exam_summaries chunk for archive metadata lookup:", err);
              }
          }
      }
      
      return data.map((f: {name: string, created_at: string, metadata?: Record<string, unknown>}) => {
          let metadata: Record<string, unknown> | null = null;
          const fileName = f && typeof f.name === 'string' ? f.name : "";

          // Extract exam code from filename (e.g. "BO3PDS" from "BO3PDS_1788312182598.json" or "BO3PDS_meta_....json")
          const examCode = fileName.includes('_meta_')
              ? fileName.split('_meta_')[0].toUpperCase().trim()
              : fileName.split('_')[0].replace(/\.json$/i, '').toUpperCase().trim();

          if (fileName.includes('_meta_')) {
              try {
                  const parts = fileName.split('_meta_');
                  if (parts.length > 1) {
                      const cleanStr = parts[1].replace(/\.json$/i, '');
                      let b64 = "";
                      
                      // Check if it's the new format (where timestamp is separated by a dot, e.g. base64.timestamp)
                      if (cleanStr.includes('.')) {
                          const lastDotIdx = cleanStr.lastIndexOf('.');
                          b64 = cleanStr.substring(0, lastDotIdx);
                      } else {
                          // Old format (separated by underscore, e.g. base64_timestamp)
                          // The timestamp is always the last segment, so we split at the last underscore.
                          const lastUnderscoreIndex = cleanStr.lastIndexOf('_');
                          b64 = lastUnderscoreIndex !== -1 ? cleanStr.substring(0, lastUnderscoreIndex) : cleanStr;
                      }
                      
                      b64 = b64.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
                      b64 = b64.replace(/[^A-Za-z0-9+/=]/g, '').replace(/=+$/, '');
                      const rem = b64.length % 4;
                      if (rem === 2) b64 += '==';
                      else if (rem === 3) b64 += '=';
                      else if (rem === 1) b64 = b64.slice(0, -1);
                      
                      const byteString = atob(b64);
                      const decodedStr = decodeURIComponent(
                          Array.prototype.map.call(byteString, (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
                      );
                      const parsed = JSON.parse(decodedStr);
                      let parsedAuthorId = parsed.a;
                      if (!parsedAuthorId || String(parsedAuthorId).trim() === '' || String(parsedAuthorId) === 'undefined' || String(parsedAuthorId) === 'null') {
                          parsedAuthorId = '';
                      } else {
                          // Restore hyphens if author UUID was compressed
                          const raw = String(parsedAuthorId).trim();
                          if (raw.length === 32 && !raw.includes('-')) {
                              parsedAuthorId = `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
                          } else {
                              parsedAuthorId = raw;
                          }
                      }
                      
                      let parsedTc: string[] = [];
                      if (parsed.tc) {
                          if (Array.isArray(parsed.tc)) {
                              parsedTc = parsed.tc.filter(Boolean);
                          } else {
                              parsedTc = String(parsed.tc).split(',').map((item: string) => item.trim()).filter(Boolean);
                          }
                      }
                      
                      const hasAiAnalysis = !!(
                          parsed.ai === 1 || 
                          parsed.ai === true || 
                          parsed.hasAiAnalysis === true || 
                          String(parsed.ai) === '1' || 
                          parsed.has_ai_analysis === true
                      );
                      
                      metadata = {
                          school: parsed.s,
                          subject: parsed.su,
                          classLevel: parsed.c,
                          examType: parsed.t,
                          targetClasses: parsedTc,
                          date: parsed.d,
                          participantCount: parsed.p,
                          authorId: parsedAuthorId,
                          hasAiAnalysis
                      };
                  }
              } catch {
                  console.warn("Failed to parse metadata from filename:", fileName);
              }
          }

          // Merge & enrich with exam_summaries to always show complete, untruncated metadata
          if (examCode && summaryMap.has(examCode)) {
              const s = summaryMap.get(examCode);
              if (!metadata) {
                  metadata = {
                      school: s.school_name || "-",
                      subject: s.exam_subject || "-",
                      classLevel: s.class_level || "-",
                      examType: s.exam_type || "Umum",
                      targetClasses: [],
                      date: s.exam_date || f.created_at,
                      participantCount: typeof s.total_participants === 'number' ? s.total_participants : 0,
                      authorId: s.author_id || "",
                      hasAiAnalysis: false
                  };
              } else {
                  // Prefer the full, untruncated strings from SQL exam_summaries
                  if (s.school_name && (!metadata.school || s.school_name.length > String(metadata.school).length)) {
                      metadata.school = s.school_name;
                  }
                  if (s.exam_subject && (!metadata.subject || s.exam_subject.length > String(metadata.subject).length)) {
                      metadata.subject = s.exam_subject;
                  }
                  if (s.class_level && (!metadata.classLevel || s.class_level.length > String(metadata.classLevel).length)) {
                      metadata.classLevel = s.class_level;
                  }
                  if (s.exam_type && (!metadata.examType || s.exam_type.length > String(metadata.examType).length)) {
                      metadata.examType = s.exam_type;
                  }
                  if (!metadata.date && s.exam_date) metadata.date = s.exam_date;
                  if ((metadata.participantCount === undefined || metadata.participantCount === 0) && s.total_participants !== undefined) {
                      metadata.participantCount = s.total_participants;
                  }
                  if (!metadata.authorId && s.author_id) metadata.authorId = s.author_id;
              }
          }

          // Clean up targetClasses to remove accidental school name or classLevel duplicates
          if (metadata && Array.isArray(metadata.targetClasses)) {
              metadata.targetClasses = metadata.targetClasses.filter((tc: string) => {
                  if (!tc || typeof tc !== 'string') return false;
                  const cleanTc = tc.trim();
                  if (!cleanTc) return false;
                  if (metadata?.school && (String(metadata.school).toLowerCase().includes(cleanTc.toLowerCase()) || cleanTc.toLowerCase().includes(String(metadata.school).toLowerCase()))) {
                      return false;
                  }
                  if (metadata?.classLevel && cleanTc.toLowerCase() === String(metadata.classLevel).toLowerCase()) {
                      return false;
                  }
                  return true;
              });
          }
          
          return {
              name: fileName,
              created_at: f ? f.created_at as string : "",
              size: f ? ((f.metadata as {size?: number})?.size || 0) : 0,
              metadata
          };
      });

      // Always sort archives from newest date to oldest
      return mapped.sort((a, b) => {
          const parseTime = (val: unknown): number => {
              if (!val) return 0;
              const str = String(val).trim();
              if (!str || str === "-") return 0;
              const ymd = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
              if (ymd) {
                  const d = new Date(parseInt(ymd[1], 10), parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10));
                  return isNaN(d.getTime()) ? 0 : d.getTime();
              }
              const dmy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
              if (dmy) {
                  const d = new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10));
                  return isNaN(d.getTime()) ? 0 : d.getTime();
              }
              const t = Date.parse(str);
              return isNaN(t) ? 0 : t;
          };

          const getTimestamp = (item: typeof a) => {
              if (item.metadata?.date) {
                  const t = parseTime(item.metadata.date);
                  if (t > 0) return t;
              }
              if (item.created_at) {
                  const t = parseTime(item.created_at);
                  if (t > 0) return t;
              }
              if (item.name) {
                  const match = item.name.match(/[._](\d{10,13})/);
                  if (match) {
                      const num = parseInt(match[1], 10);
                      const ts = num < 10000000000 ? num * 1000 : num;
                      if (!isNaN(ts) && ts > 0) return ts;
                  }
              }
              return 0;
          };
          return getTimestamp(b) - getTimestamp(a);
      });
   }

  async downloadArchive(path: string): Promise<Record<string, unknown>> {
      const { data, error } = await supabase.storage.from('archives').download(path);
      if (error) throw error;
      
      const text = await data.text();
      return JSON.parse(text);
  }

  async deleteArchive(filename: string): Promise<void> {
      const { error } = await supabase.storage.from('archives').remove([filename]);
      if (error) throw error;
  }

  async updateAnalyticsData(examCode: string, updates: Partial<ExamSummary>): Promise<void> {
      await authService._verifyRole(['super_admin']);

      let updateError = null;
      let updateData = null;
      
      const { data, error } = await supabase
          .from('exam_summaries')
          .update(updates)
          .eq('exam_code', examCode)
          .select();
          
      if (error) {
          if (error.code === 'PGRST204' || error.message?.includes('Could not find')) {
              console.warn("Schema cache error in updateAnalyticsData, retrying without new columns...");
              const fallbackUpdates = { ...updates };
              delete fallbackUpdates.region;
              delete fallbackUpdates.exam_type;
              delete fallbackUpdates.class_level;
              delete fallbackUpdates.author_id;
              
              const { data: fallbackData, error: fallbackError } = await supabase
                  .from('exam_summaries')
                  .update(fallbackUpdates)
                  .eq('exam_code', examCode)
                  .select();
                  
              updateData = fallbackData;
              updateError = fallbackError;
          } else {
              updateError = error;
          }
      } else {
          updateData = data;
      }

      if (updateError) throw updateError;
      
      if (!updateData || updateData.length === 0) {
           throw new Error("Gagal memperbarui data. Data tidak ditemukan atau akun Super Admin Anda tidak memiliki izin RLS (Row Level Security) untuk mengedit data milik pengguna lain. Silakan hubungi teknisi untuk menambahkan kebijakan RLS.");
      }
  }
}

export const archiveService = new ArchiveService();
