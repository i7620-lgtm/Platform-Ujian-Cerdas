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
          throw new Error("Gagal menyimpan ringkasan statistik. Arsip dibatalkan.");
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
          throw new Error("Gagal menyimpan statistik ke database: " + summaryError.message);
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
              .map(q => {
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

                  return {
                      id: q.id,
                      type: q.questionType,
                      correct_rate: total > 0 ? Math.round((correctCount / total) * 100) : 0,
                      top_wrong_answer: this.getTopWrongAnswer(answerDist, q)
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
              exam_date: exam.config.date,
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
  generateAnalysisPrompt(summaries: ExamSummary[], customPrompt?: string): string {
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
              .map((qs: Record<string, unknown>) => `Q${(qs.id as string).split('-')[1] || qs.id}: ${qs.correct_rate}%`)
              .slice(0, 3)
      }));

      const defaultTask = `Buatlah laporan "Analisis Karakteristik dan Ketuntasan Hasil Ujian" yang komprehensif. Jika data input berisi beberapa sekolah yang berbeda, Anda WAJIB menganalisis dan membuat penjabaran performa untuk MASING-MASING sekolah secara terpisah.`;

      return `
        You are a Senior Education Data Consultant specializing in Competency-Based Curriculum Analysis.
        
        INPUT DATA (JSON):
        ${JSON.stringify(simpleData)}

        TASK:
        ${customPrompt || defaultTask}
        
        OUTPUT FORMAT:
        - Use standard Markdown (MD).
        - DO NOT use HTML tags.
        - Jika terdapat lebih dari 1 sekolah, buat sub-bagian terpisah (Heading 2) untuk SETIAP sekolah.
        
        STRUCTURE:

        1. RINGKASAN EKSEKUTIF:
           - Berikan ringkasan performa secara keseluruhan.
           - Highlight temuan utama.

        2. ANALISIS PER SEKOLAH (Wajib dipisah per sekolah jika > 1 sekolah):
           - Untuk SETIAP sekolah, sebutkan nama sekolahnya, lalu berikan:
             * Rata-rata nilai dan tingkat ketuntasan.
             * Analisis topik/materi yang belum dikuasai (lihat dari weakness_count atau top_difficulty_questions).
             * Karakteristik kelas atau pola jawaban.
           - Gunakan ASCII diagram (contoh: [||||||||||] 80%) jika relevan.
            
        3. PERBANDINGAN DAN REKOMENDASI:
           - Jika ada >1 sekolah, bandingkan secara singkat perbedaan/kesenjangan performa.
           - Berikan rekomendasi konkrit dan spesifik untuk perbaikan pembelajaran untuk masing-masing masalah yang diidentifikasi.

        TONE:
        - Professional, analytical, yet accessible to teachers and policymakers.
        - Use Indonesian language (Bahasa Indonesia).
      `.trim();
  }

  // --- GEMINI AI ANALYTICS (GENERATIVE VISUALIZATION) ---
  async generateAIAnalysis(summaries: ExamSummary[], customPrompt?: string): Promise<string> {
      try {
          const prompt = this.generateAnalysisPrompt(summaries, customPrompt);
          
          const res = await fetch("/api/generate-analysis", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt })
          });
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

              const b64 = btoa(JSON.stringify(minMeta))
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
                      
                      const parsed = JSON.parse(atob(b64));
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
