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
          
          const avg = total > 0 ? scores.reduce((a, b) => a + b, 0) / total : 0;
          const max = total > 0 ? Math.max(...scores) : 0;
          const min = total > 0 ? Math.min(...scores) : 0;
          const passing = scores.filter(s => s >= 75).length;
          const passingRate = total > 0 ? (passing / total) * 100 : 0;

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

                  return {
                      id: q.id,
                      number: idx + 1,
                      type: q.questionType,
                      correct_rate: total > 0 ? Math.round((correctCount / total) * 100) : 0,
                      top_wrong_answer: topWrongAns,
                      top_wrong_rate: topWrongRate
                  };
              });

          const uniqueClasses = Array.from(new Set(schoolResults.map(r => r.student.class).filter(Boolean)));
          const classLevelStr = uniqueClasses.length > 0 
              ? uniqueClasses.join(', ') 
              : [exam.config.classLevel, ...(exam.config.targetClasses || [])].filter(Boolean).join(', ');

          summaries.push({
              school_name: schoolName,
              exam_subject: exam.config.subject,
              exam_code: exam.code,
              exam_type: exam.config.examType, 
              class_level: classLevelStr, 
              exam_date: exam.config.date || exam.config.startDate || new Date().toISOString().split('T')[0],
              total_participants: total,
              average_score: parseFloat(avg.toFixed(2)),
              highest_score: max,
              lowest_score: min,
              passing_rate: parseFloat(passingRate.toFixed(2)),
              question_stats: questionStats,
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
  generateAnalysisPrompt(summaries: ExamSummary[], customPrompt?: string, examQuestions?: Question[]): string {
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
          participants: s.total_participants,
          weakness_count: s.question_stats.filter((qs: Record<string, unknown>) => (qs.correct_rate as number) < 50).length,
          top_difficulty_questions: s.question_stats
              .filter((qs: Record<string, unknown>) => (qs.correct_rate as number) < 40)
              .map((qs: Record<string, unknown>) => `Soal nomor ${qs.number || 1}: ${qs.correct_rate}%`)
              .slice(0, 3)
      }));

      // Map examQuestions to a structured list for the AI to understand the exam content and formulate exact remedial/enrichment questions
      const questionDetails = examQuestions
          ? examQuestions
              .filter(q => q.questionType !== 'INFO')
              .map((q, idx) => {
                  let correctRate: number | undefined;
                  let topWrongAnswer: string | null = null;
                  let topWrongRate: number | undefined;

                  for (const s of summaries) {
                      const qs = s.question_stats?.find((item: any) => item.id === q.id || item.number === idx + 1);
                      if (qs) {
                          correctRate = qs.correct_rate as number;
                          topWrongAnswer = qs.top_wrong_answer as string | null;
                          topWrongRate = qs.top_wrong_rate as number;
                          break;
                      }
                  }

                  return {
                      number: idx + 1,
                      text: stripBase64(q.questionText || ""),
                      type: q.questionType,
                      options: (q.options || []).map(o => stripBase64(o || "")),
                      correctAnswer: q.correctAnswer || "",
                      correct_rate: correctRate,
                      top_wrong_answer: topWrongAnswer,
                      top_wrong_rate: topWrongRate
                  };
              })
          : [];

      const defaultTask = `Buatlah laporan "Analisis Karakteristik dan Ketuntasan Hasil Ujian" yang komprehensif. Jika data input berisi beberapa sekolah yang berbeda, Anda WAJIB menganalisis dan membuat penjabaran performa untuk MASING-MASING sekolah secara terpisah.`;

      return `
        You are a Senior Education Data Consultant specializing in Competency-Based Curriculum Analysis.
        
        INPUT DATA (JSON):
        ${JSON.stringify(simpleData)}

        EXAM QUESTIONS LIST WITH PERFORMANCE STATS (Use correct_rate, top_wrong_answer, and top_wrong_rate to diagnose understanding levels and check for potential answer key errors):
        ${JSON.stringify(questionDetails)}

        TASK:
        ${customPrompt || defaultTask}
        
        OUTPUT FORMAT:
        - Use standard Markdown (MD).
        - DO NOT use HTML tags.
        - Jika terdapat lebih dari 1 sekolah, buat sub-bagian terpisah (Heading 2) untuk SETIAP sekolah.
        
        CRITICAL RULES:
        1. JANGAN PERNAH menyebutkan atau menampilkan ID soal internal mentah seperti "Soal Q1770787225501", "Q1770787225501", atau "id-soal". Anda WAJIB langsung menyebutnya dengan format "soal nomor [nomor]" (misalnya: "soal nomor 1", "soal nomor 2", "soal nomor 3") sesuai dengan urutan 'number' di daftar soal. Hindari penggunaan kata "Soal [nomor]" tanpa kata "nomor".
        2. JANGAN menggunakan progress bar tekstual atau diagram ASCII (seperti "[||||||||||] 53%") untuk visualisasi performa kelas. Cukup sebutkan persentase angka rata-rata performanya saja dalam bentuk teks, karena visualisasi diagram garis interaktif yang indah sudah disediakan langsung secara dinamis di antarmuka web.
        3. Rekomendasi Remedial: Anda WAJIB membuat minimal 5 (lima) contoh soal latihan remedial konkret, baru, dan mirip (setara indikator pencapaian kompetensi) dengan soal-soal tersulit di ujian (soal dengan 'correct_rate' rendah). Tuliskan kelima soal tersebut secara lengkap dengan teks soal baru, pilihan jawaban (jika pilihan ganda), dan kunci jawaban yang benar agar guru dapat langsung menggunakannya atau menyalinnya secara utuh.
        4. Rekomendasi Pengayaan: Anda WAJIB membuat minimal 5 (lima) contoh soal tantangan pengayaan konkret, baru, dan lebih menantang (HOTS - Higher Order Thinking Skills) berdasarkan topik utama ujian ini. Tuliskan kelima soal tersebut secara lengkap dengan teks soal baru, pilihan jawaban (jika pilihan ganda), dan kunci jawaban yang benar agar guru dapat langsung menggunakannya.
        5. PERSAMAAN MATEMATIKA TANPA LATEX: JANGAN PERNAH menggunakan sintaks matematika LaTeX seperti \\frac, \\div, \\times, $ atau $$ pada teks laporan maupun pada contoh soal remedial/pengayaan. Selalu gunakan penulisan teks biasa atau simbol Unicode standar yang bersih dan mudah dibaca (contoh: '1/5' atau '1 per 5', '240 : 6 + 15 = 55', simbol '÷' or ':' untuk pembagian, '×' atau '*' untuk perkalian, dsb.). Hal ini penting agar seluruh formula matematika tampak rapi dan dapat dibaca dengan mudah tanpa rendering MathJax/KaTeX.
        6. STANDAR EVALUASI NILAI RATA-RATA: Pada bagian RINGKASAN EKSEKUTIF, evaluasi nilai rata-rata harus ditulis dalam sub-bagian khusus dengan judul "Evaluasi Nilai Rata-Rata Berdasarkan Standar Nasional". Evaluasi ini harus mengacu pada standar berikut:
           - Untuk Ujian Biasa/Umum: Nilai rata-rata ideal mengacu pada rentang 70-75. Bandingkan rata-rata kelas dengan rentang tersebut secara deskriptif.
           - Khusus untuk Ujian TKA (Tes Kemampuan Akademik / UTBK TKA): Bandingkan nilai rata-rata siswa secara spesifik dengan rerata skor TKA nasional di Indonesia yang terbaru (sekitar 500-550 poin atau setara dengan 50%-55% ketuntasan pada skala penilaian nasional terbaru) agar analisis ringkasan eksekutif terlihat lebih faktual, realistis, dan berbobot akademis tinggi.
           - ATURAN KEPADATAN INFORMASI TKA: JANGAN PERNAH menulis penjelasan yang bertele-tele atau tidak penting seperti "Berbeda dengan ujian sekolah biasa yang menargetkan Kriteria Ketuntasan Minimal (KKM) di rentang 70-75, ujian berjenis TKA (Tes Kemampuan Akademik) memiliki karakteristik soal selektif dengan tingkat kesulitan tinggi (HOTS)." jika Anda sudah tahu bahwa yang dibahas adalah ujian TKA. Hindari penjelasan teori HOTS yang tidak bernilai guna praktis bagi guru. Tulis analisis yang langsung, faktual, padat, penting, dan mudah dipahami saja.
        7. DETEKSI KESALAHAN KUNCI JAWABAN (CRITICAL BIAS ANALYSIS):
           - Anda WAJIB secara aktif mendeteksi potensi kesalahan kunci jawaban ujian (guru salah input kunci).
           - Skenario utama deteksi: Jika persentase siswa menjawab benar ('correct_rate') sangat rendah (< 35%) DAN ada satu jawaban salah terpopuler ('top_wrong_answer') yang dipilih oleh mayoritas siswa ('top_wrong_rate' > 45%).
           - Lakukan analisis terhadap teks soal, pilihan jawaban ('options'), kunci jawaban saat ini ('correctAnswer'), dan opsi terpopuler tersebut.
           - Jika secara logis/akademis opsi terpopuler tersebut sebenarnya adalah jawaban yang benar, atau jika soal tersebut membingungkan/memiliki beberapa opsi yang sama-sama benar, laporkan ini dengan sangat jelas dan berani sebagai "Indikasi Kesalahan Kunci Jawaban" dalam evaluasi butir soal Anda. Jelaskan penalaran logisnya dan berikan saran kunci koreksi agar guru mengetahuinya.

        STRUCTURE:

        1. RINGKASAN EKSEKUTIF:
           - Berikan ringkasan performa secara keseluruhan.
           - Sub-bagian "### Evaluasi Nilai Rata-Rata Berdasarkan Standar Nasional": Berisi evaluasi nilai rata-rata kelas sesuai standar di atas. JANGAN gunakan pengantar panjang lebar, langsung ke poin evaluasinya saja.
           - Highlight temuan utama (misalnya materi mana yang sudah tuntas secara agregat dan materi mana yang perlu perhatian khusus).

        2. ANALISIS PER SEKOLAH (Wajib dipisah per sekolah jika > 1 sekolah):
           - Untuk SETIAP sekolah, sebutkan nama sekolahnya, lalu berikan:
             * Rata-rata nilai dan tingkat ketuntasan.
             * Analisis topik/materi yang belum dikuasai (lihat dari weakness_count atau top_difficulty_questions, dan rujuk sebagai "soal nomor [nomor]").
             * Karakteristik kelas atau pola jawaban.
            
        3. PERBANDINGAN DAN REKOMENDASI:
           - Jika ada >1 sekolah, bandingkan secara singkat perbedaan/kesenjangan performa.
           - Evaluasi Butir Soal & Analisis Validitas: Berikan evaluasi singkat mengenai tingkat kesulitan, pengecoh (distractor) yang terlalu kuat, dan validitas butir soal berdasarkan pola jawaban siswa (gunakan penomoran "soal nomor [nomor]"). Masukkan bagian khusus analisis potensi kesalahan kunci jawaban jika terdeteksi di langkah kritis nomor 7 di atas.
           - Rekomendasi Remedial & CONTOH SOAL: Berikan rekomendasi konkrit untuk remedial, dilanjutkan dengan minimal 5 contoh soal remedial baru lengkap dengan pilihan jawaban dan kunci jawaban.
           - Rekomendasi Pengayaan & CONTOH SOAL: Berikan rekomendasi pengayaan untuk siswa nilai tinggi, dilanjutkan dengan minimal 5 contoh soal pengayaan HOTS baru lengkap dengan pilihan jawaban dan kunci jawaban.

        TONE:
        - Professional, analytical, yet accessible to teachers and policymakers.
        - Use Indonesian language (Bahasa Indonesia).
      `.trim();
  }

  // --- GEMINI AI ANALYTICS (GENERATIVE VISUALIZATION) ---
  async generateAIAnalysis(summaries: ExamSummary[], customPrompt?: string, examQuestions?: Question[]): Promise<string> {
      try {
          const prompt = this.generateAnalysisPrompt(summaries, customPrompt, examQuestions);
          
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
      let filename = `${examCode}_${Date.now()}.json`;
      
      if (metadata) {
          try {
              let safeAuthorId = metadata.authorId;
              if (!safeAuthorId || String(safeAuthorId).trim() === '' || String(safeAuthorId) === 'undefined' || String(safeAuthorId) === 'null') {
                  safeAuthorId = '';
              }
              
              const tc = Array.isArray(metadata.targetClasses) ? metadata.targetClasses.join(',').substring(0, 20) : String(metadata.targetClasses || '').substring(0, 20);
              
              const minMeta = {
                  s: String(metadata.school || '').substring(0, 30),
                  su: String(metadata.subject || '').substring(0, 30),
                  c: String(metadata.classLevel || '').substring(0, 15),
                  t: String(metadata.examType || '').substring(0, 15),
                  tc: [tc],
                  d: String(metadata.date || '').substring(0, 15),
                  p: metadata.participantCount,
                  a: String(safeAuthorId).substring(0, 40)
              };

              const jsonStr = JSON.stringify(minMeta);
              const encodedStr = encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g,
                  (match, p1) => String.fromCharCode(Number('0x' + p1))
              );
              const b64 = btoa(encodedStr)
                  .replace(/\+/g, '-')
                  .replace(/\//g, '_')
                  .replace(/=+$/, '');
              
              const potentialFileName = `${String(examCode).substring(0, 30)}_meta_${b64}_${Date.now()}.json`;
              
              if (potentialFileName.length > 200) {
                  filename = `${String(examCode).substring(0, 30)}_${Date.now()}.json`;
              } else {
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
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' },
      });
      
      if (error) {
          console.warn("Failed to list archives:", error);
          return [];
      }
      
      return data.map((f: {name: string, created_at: string, metadata?: Record<string, unknown>}) => {
          let metadata = null;
          if (typeof f.name === 'string' && f.name.includes('_meta_')) {
              try {
                  const parts = f.name.split('_meta_');
                  if (parts.length > 1) {
                      let b64 = parts[1].split('_')[0];
                      b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
                      while (b64.length % 4) b64 += '=';
                      
                      const byteString = atob(b64);
                      const decodedStr = decodeURIComponent(
                          Array.prototype.map.call(byteString, (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
                      );
                      const parsed = JSON.parse(decodedStr);
                      let parsedAuthorId = parsed.a;
                      if (!parsedAuthorId || String(parsedAuthorId).trim() === '' || String(parsedAuthorId) === 'undefined' || String(parsedAuthorId) === 'null') {
                          parsedAuthorId = '';
                      }
                      
                      metadata = {
                          school: parsed.s,
                          subject: parsed.su,
                          classLevel: parsed.c,
                          examType: parsed.t,
                          targetClasses: parsed.tc,
                          date: parsed.d,
                          participantCount: parsed.p,
                          authorId: parsedAuthorId
                      };
                  }
              } catch {
                  console.warn("Failed to parse metadata from filename:", f.name);
              }
          }
          
          return {
              name: f.name as string,
              created_at: f.created_at as string,
              size: (f.metadata as {size?: number})?.size || 0,
              metadata
          };
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
