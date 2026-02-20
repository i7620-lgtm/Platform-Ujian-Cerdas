
import { supabase } from '../lib/supabase';
import type { Exam, Result, Question, TeacherProfile, AccountType, UserProfile, ExamSummary, ExamConfig } from '../types';
import { compressImage } from '../components/teacher/examUtils';
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper: Convert Base64 to Blob for Upload
const base64ToBlob = (base64: string): Blob => {
    const arr = base64.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
};

// Helper: Convert URL to Base64 for Archiving
const urlToBase64 = async (url: string): Promise<string> => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.warn("Failed to convert image for archive:", url);
        return url; // Fallback keep URL
    }
};

// Helper shuffle array (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
}

// --- INDEXED DB HELPER ---
const DB_NAME = 'UjianCerdasDB';
const DB_VERSION = 1;
const STORE_PROGRESS = 'exam_progress';

const initDB = (): Promise<IDBDatabase> => {
    if (typeof window === 'undefined' || !window.indexedDB) return Promise.reject("IndexedDB not supported");
    
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_PROGRESS)) {
                db.createObjectStore(STORE_PROGRESS, { keyPath: 'key' });
            }
        };
    });
};

const sanitizeExamForStudent = (exam: Exam, studentId?: string): Exam => {
    if (!studentId || studentId === 'monitor' || studentId === 'check_schedule') {
        let questionsToProcess = [...exam.questions];
        if (exam.config.shuffleQuestions) {
            questionsToProcess = shuffleArray(questionsToProcess);
        }
        const sanitizedQuestions = questionsToProcess.map(q => {
            const sanitizedQ = { ...q, options: q.options ? [...q.options] : undefined } as Question;
            if (exam.config.shuffleAnswers) {
                if ((sanitizedQ.questionType === 'MULTIPLE_CHOICE' || sanitizedQ.questionType === 'COMPLEX_MULTIPLE_CHOICE') && sanitizedQ.options) {
                    sanitizedQ.options = shuffleArray(sanitizedQ.options);
                }
            }
            return sanitizedQ;
        });
        return { ...exam, questions: sanitizedQuestions };
    }

    const STORAGE_KEY_ORDER = `exam_order_${exam.code}_${studentId}`;
    let orderMap: { qOrder: string[]; optOrders: Record<string, string[]> } | null = null;
    
    try {
        const stored = localStorage.getItem(STORAGE_KEY_ORDER);
        if (stored) orderMap = JSON.parse(stored);
    } catch(e) {}

    if (!orderMap) {
        let questionsToProcess = [...exam.questions];
        if (exam.config.shuffleQuestions) {
            questionsToProcess = shuffleArray(questionsToProcess);
        }
        const qOrder = questionsToProcess.map(q => q.id);
        const optOrders: Record<string, string[]> = {};

        questionsToProcess.forEach(q => {
             if (exam.config.shuffleAnswers && q.options && 
                (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'COMPLEX_MULTIPLE_CHOICE')) {
                 const shuffledOpts = shuffleArray([...q.options]);
                 optOrders[q.id] = shuffledOpts;
             }
        });

        orderMap = { qOrder, optOrders };
        try { localStorage.setItem(STORAGE_KEY_ORDER, JSON.stringify(orderMap)); } catch(e) {}
    }

    const questionMap = new Map(exam.questions.map(q => [q.id, q]));
    const orderedQuestions: Question[] = [];
    
    orderMap.qOrder.forEach(qid => {
        const q = questionMap.get(qid);
        if (q) {
            orderedQuestions.push(q);
            questionMap.delete(qid);
        }
    });

    questionMap.forEach(q => orderedQuestions.push(q));

    const finalQuestions = orderedQuestions.map(q => {
        const sanitizedQ = { ...q, options: q.options ? [...q.options] : undefined } as Question;
        
        if (orderMap?.optOrders[q.id] && sanitizedQ.options) {
             const storedOpts = orderMap.optOrders[q.id];
             const currentOptSet = new Set(sanitizedQ.options);
             const validStoredOpts = storedOpts.filter(o => currentOptSet.has(o));
             
             if (validStoredOpts.length === sanitizedQ.options.length) {
                 sanitizedQ.options = validStoredOpts;
             }
        }
        return sanitizedQ;
    });

    return { ...exam, questions: finalQuestions };
};

class StorageService {
    private syncQueue: any[] = [];
    private isProcessingQueue = false;

    constructor() {
        const savedQueue = localStorage.getItem('exam_sync_queue');
        if (savedQueue) {
            try { this.syncQueue = JSON.parse(savedQueue); } catch(e) {}
        }
        
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.processQueue());
            setInterval(() => {
                if (this.syncQueue.length > 0) this.processQueue();
            }, 30000);
        }
    }

  // --- INDEXED DB METHODS (LOCAL PROGRESS) ---
  
  async saveLocalProgress(key: string, data: any): Promise<void> {
      try {
          const db = await initDB();
          return new Promise((resolve, reject) => {
              const tx = db.transaction(STORE_PROGRESS, 'readwrite');
              const store = tx.objectStore(STORE_PROGRESS);
              store.put({ key, data, updatedAt: Date.now() });
              tx.oncomplete = () => resolve();
              tx.onerror = () => reject(tx.error);
          });
      } catch(e) { 
          // Fallback to LocalStorage if IDB fails
          try { localStorage.setItem(key, JSON.stringify(data)); } catch(err) {}
      }
  }

  async getLocalProgress(key: string): Promise<any | null> {
      try {
          const db = await initDB();
          return new Promise((resolve, reject) => {
              const tx = db.transaction(STORE_PROGRESS, 'readonly');
              const store = tx.objectStore(STORE_PROGRESS);
              const req = store.get(key);
              req.onsuccess = () => resolve(req.result ? req.result.data : null);
              req.onerror = () => reject(req.error);
          });
      } catch(e) { 
          // Fallback to LocalStorage
          try { 
              const item = localStorage.getItem(key);
              return item ? JSON.parse(item) : null;
          } catch(err) { return null; }
      }
  }

  async clearLocalProgress(key: string): Promise<void> {
      try {
          const db = await initDB();
          const tx = db.transaction(STORE_PROGRESS, 'readwrite');
          tx.objectStore(STORE_PROGRESS).delete(key);
      } catch(e) {
          localStorage.removeItem(key);
      }
  }
  
  // --- AUTH METHODS ---
  async getCurrentUser(): Promise<TeacherProfile | null> {
      const auth = supabase.auth as any;
      const { data: { session } } = await auth.getSession();
      if (!session?.user) return null;

      const { data: profile, error } = await supabase
          .from('profiles')
          .select('full_name, school, role')
          .eq('id', session.user.id)
          .single();

      if (error || !profile) return null;

      return {
          id: session.user.id,
          fullName: profile.full_name,
          accountType: profile.role as AccountType,
          school: profile.school,
          email: session.user.email
      };
  }

  async signUpWithEmail(email: string, password: string, fullName: string, school: string): Promise<TeacherProfile> {
      const auth = supabase.auth as any;
      const { data: authData, error: authError } = await auth.signUp({ 
          email, 
          password,
          options: {
              data: {
                  full_name: fullName,
                  school: school,
                  role: 'guru'
              }
          }
      });

      if (authError || !authData.user) {
          throw new Error(authError?.message || 'Gagal mendaftar. Email mungkin sudah terdaftar.');
      }

      return {
          id: authData.user.id,
          fullName: fullName,
          accountType: 'guru',
          school: school,
          email: email
      };
  }

  async signInWithEmail(email: string, password: string): Promise<TeacherProfile> {
      const auth = supabase.auth as any;
      const { error } = await auth.signInWithPassword({ email, password });
      if (error) throw new Error('Email atau password salah.');
      
      // Tunggu sebentar untuk trigger
      await new Promise(r => setTimeout(r, 500));

      let profile = await this.getCurrentUser();
      
      if (!profile) {
          const { data: { user } } = await auth.getUser();
          if (user) {
              const meta = user.user_metadata || {};
              // Coba insert manual (policy RLS 'Users can insert their own profile' harus aktif)
              await supabase.from('profiles').insert({
                  id: user.id,
                  full_name: meta.full_name || 'Pengguna',
                  school: meta.school || '-',
                  role: meta.role || 'guru'
              }).select().single();
              
              profile = await this.getCurrentUser();
          }
      }

      if (!profile) throw new Error('Gagal memuat profil pengguna. Silakan hubungi admin.');
      return profile;
  }

  async signOut() {
      const auth = supabase.auth as any;
      await auth.signOut();
  }

  // --- USER MANAGEMENT (SUPER ADMIN) ---
  
  async getAllUsers(): Promise<UserProfile[]> {
      const { data: profiles, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      
      return profiles.map((p: any) => ({
          id: p.id,
          fullName: p.full_name,
          accountType: p.role as AccountType,
          school: p.school,
          email: '-' 
      }));
  }

  async updateUserRole(userId: string, newRole: AccountType, newSchool: string): Promise<void> {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, school: newSchool })
        .eq('id', userId);
      
      if (error) throw error;
  }

  // --- EXAM METHODS ---

  async getExams(profile?: TeacherProfile): Promise<Record<string, Exam>> {
    let query = supabase.from('exams').select('*');

    if (profile) {
        if (profile.accountType === 'super_admin') {
            // Super Admin: No Filter
        } else if (profile.accountType === 'admin_sekolah' && profile.school) {
            query = query.or(`school.eq."${profile.school}",author_id.eq.${profile.id}`);
        } else {
            // Guru: Filter by Author ID
            query = query.eq('author_id', profile.id);
        }
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching exams from Supabase:", error);
        return {};
    }

    const examMap: Record<string, Exam> = {};
    if (data) {
        data.forEach((row: any) => {
            examMap[row.code] = {
                code: row.code,
                authorId: row.author_id,
                authorSchool: row.school,
                config: row.config,
                questions: row.questions,
                status: row.status,
                createdAt: row.created_at
            };
        });
    }
    return examMap;
  }

  async getExamForStudent(code: string, studentId?: string, isPreview = false): Promise<Exam | null> {
      let data = null;
      let errorDetails = null;

      // ATTEMPT 1: Full data fetch (with author profile)
      // This is expected to FAIL for anonymous students if RLS on 'profiles' restricts access.
      try {
          const { data: fullData, error: fullError } = await supabase
              .from('exams')
              .select('*, profiles:author_id(full_name)')
              .eq('code', code)
              .maybeSingle(); // Use maybeSingle to avoid exception on 0 rows
          
          if (!fullError && fullData) {
              data = fullData;
          }
      } catch (e) {
          // Ignore failures here, we proceed to fallback
          console.warn("Attempt 1 (Full Fetch) failed, retrying with fallback...");
      }

      // ATTEMPT 2: Fallback (Exam data only)
      // If Attempt 1 returned null data (due to RLS or other error), we try this.
      // This query should succeed for anonymous users as 'exams' is public.
      if (!data) {
          const { data: simpleData, error: simpleError } = await supabase
              .from('exams')
              .select('*')
              .eq('code', code)
              .maybeSingle();
          
          if (simpleError) {
              console.error("Attempt 2 (Fallback) failed:", simpleError);
              errorDetails = simpleError;
          } else {
              data = simpleData;
          }
      }

      if (!data) {
          throw new Error("EXAM_NOT_FOUND");
      }

      if (data.status === 'DRAFT' && !isPreview) throw new Error("EXAM_IS_DRAFT");
      
      const exam: Exam = {
          code: data.code, 
          authorId: data.author_id, 
          authorName: data.profiles?.full_name || 'Pengajar', 
          authorSchool: data.school,
          config: data.config, 
          questions: data.questions, 
          status: data.status
      };
      return sanitizeExamForStudent(exam, studentId);
  }

  async getExamConfig(code: string): Promise<ExamConfig | null> {
      const { data, error } = await supabase.from('exams').select('config').eq('code', code).maybeSingle();
      if (error || !data) return null;
      return data.config;
  }

  async saveExam(exam: Exam): Promise<void> {
    let processedQuestions = JSON.parse(JSON.stringify(exam.questions));
    const BUCKET_NAME = 'soal';
    const examCode = exam.code;

    const { data: existing } = await supabase.from('exams').select('code').eq('code', examCode).maybeSingle();
    
    if (!existing) {
        const { error: initError } = await supabase.from('exams').insert({
            code: exam.code, 
            author_id: exam.authorId, 
            school: exam.authorSchool,
            config: exam.config, 
            questions: [], 
            status: 'DRAFT'
        });
        if (initError) throw initError;
    }

    const processHtmlString = async (html: string, contextId: string): Promise<string> => {
        if (!html || !html.includes('data:image')) return html;
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const images = doc.getElementsByTagName('img');
        
        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            const src = img.getAttribute('src');
            
            if (src && src.startsWith('data:image')) {
                try {
                    const blob = base64ToBlob(src);
                    const ext = src.substring(src.indexOf('/') + 1, src.indexOf(';'));
                    const filename = `${examCode}/${contextId}_${Date.now()}_${i}.${ext}`;
                    
                    const { data } = await supabase.storage.from(BUCKET_NAME).upload(filename, blob, { upsert: true });
                    if (data) {
                        const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filename);
                        img.setAttribute('src', publicUrlData.publicUrl);
                        img.setAttribute('data-bucket-path', filename); 
                    }
                } catch (e) { console.error("Gagal upload gambar", e); }
            }
        }
        return doc.body.innerHTML;
    };

    for (const q of processedQuestions) {
        q.questionText = await processHtmlString(q.questionText, q.id);
        if (q.options) {
            for (let i = 0; i < q.options.length; i++) {
                q.options[i] = await processHtmlString(q.options[i], `${q.id}_opt_${i}`);
            }
        }
    }

    const { error } = await supabase.from('exams').upsert({
        code: exam.code, author_id: exam.authorId, school: exam.authorSchool,
        config: exam.config, questions: processedQuestions, status: exam.status || 'PUBLISHED'
    });
    if (error) throw error;
  }

  async updateStudentData(examCode: string, studentId: string, newData: { fullName: string, class: string, absentNumber: string }): Promise<void> {
      const { data: currentResult, error: fetchError } = await supabase
          .from('results')
          .select('student')
          .eq('exam_code', examCode)
          .eq('student_id', studentId)
          .single();
      
      if (fetchError || !currentResult) throw new Error("Data siswa tidak ditemukan.");

      const updatedStudent = { ...currentResult.student, ...newData };

      const { error: updateError } = await supabase
          .from('results')
          .update({ student: updatedStudent })
          .eq('exam_code', examCode)
          .eq('student_id', studentId);

      if (updateError) throw updateError;
  }

  async deleteExam(code: string): Promise<void> {
      await supabase.from('results').delete().eq('exam_code', code);
      await supabase.from('exams').delete().eq('code', code);
      const { data: files } = await supabase.storage.from('soal').list(code);
      if (files && files.length > 0) {
          const paths = files.map(f => `${code}/${f.name}`);
          await supabase.storage.from('soal').remove(paths);
      }
  }

  // --- ARCHIVE & ANALYTICS METHODS (TRANSACTION SAFE) ---

  // New method to handle the complete archive process with safety checks
  async performFullArchive(exam: Exam): Promise<{ backupUrl?: string }> {
      // 1. Get Fat Exam Object (Base64 Images)
      const fatExam = await this.getExamForArchive(exam.code);
      if (!fatExam) throw new Error("Gagal mengambil data ujian.");

      // 2. Get All Results for this exam
      const examResults = await this.getResults(exam.code, undefined);

      // 3. Create comprehensive archive object (JSON)
      const archivePayload = {
          exam: fatExam,
          results: examResults
      };
      const jsonString = JSON.stringify(archivePayload, null, 2);

      // 4. Calculate Statistics for SQL Analytics (Transaction Step 1)
      const summary = this.calculateExamStatistics(fatExam, examResults);
      
      // 5. Insert Summary into SQL (Transaction Step 2)
      // If this fails, we abort.
      const { error: summaryError } = await supabase.from('exam_summaries').insert(summary);
      if (summaryError) {
          console.error("Summary Insert Failed:", summaryError);
          throw new Error("Gagal menyimpan ringkasan statistik. Arsip dibatalkan.");
      }

      let backupUrl: string | undefined;

      // 6. ATTEMPT CLOUD UPLOAD (Transaction Step 3)
      try {
          await this.uploadArchive(exam.code, jsonString);
          // 7. CLEANUP (Transaction Step 4 - Only if upload success)
          await this.cleanupExamAssets(exam.code);
          await this.deleteExam(exam.code);
      } catch (cloudError: any) {
          console.error("Cloud upload failed:", cloudError);
          // FALLBACK: Generate Blob URL for local download
          const blob = new Blob([jsonString], { type: "application/json" });
          backupUrl = URL.createObjectURL(blob);
          
          // Note: We do NOT delete the exam from SQL if cloud upload fails, 
          // unless the user manually confirms in the UI layer. 
          // But logically, we already inserted the summary. 
          // For now, we return the backupUrl so the UI can prompt the user.
      }

      return { backupUrl };
  }

  async registerLegacyArchive(exam: Exam, results: Result[]): Promise<void> {
      // Hitung statistik menggunakan logika yang sama dengan proses arsip otomatis
      const summary = this.calculateExamStatistics(exam, results);
      
      // Simpan ke tabel exam_summaries
      const { error } = await supabase.from('exam_summaries').insert(summary);
      
      if (error) {
          console.error("Legacy Stats Insert Failed:", error);
          throw new Error("Gagal menyimpan statistik ke database: " + error.message);
      }
  }

  private calculateExamStatistics(exam: Exam, results: Result[]): Partial<ExamSummary> {
      const scores = results.map(r => Number(r.score));
      const total = scores.length;
      
      // Basic Stats
      const avg = total > 0 ? scores.reduce((a, b) => a + b, 0) / total : 0;
      const max = total > 0 ? Math.max(...scores) : 0;
      const min = total > 0 ? Math.min(...scores) : 0;
      const passing = scores.filter(s => s >= 75).length; // Assuming KKM 75
      const passingRate = total > 0 ? (passing / total) * 100 : 0;

      // Question Stats Snapshot (JSONB)
      const questionStats: any[] = exam.questions
          .filter(q => q.questionType !== 'INFO')
          .map(q => {
              let correctCount = 0;
              const answerDist: Record<string, number> = {};
              
              results.forEach(r => {
                  const ans = r.answers[q.id];
                  // Normalize and Check (Simplified for stats)
                  if (this.isAnswerCorrect(q, ans)) correctCount++;
                  
                  // Track distraction
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

      return {
          school_name: exam.authorSchool || 'Unknown School',
          exam_subject: exam.config.subject,
          exam_code: exam.code,
          exam_date: exam.config.date,
          total_participants: total,
          average_score: parseFloat(avg.toFixed(2)),
          highest_score: max,
          lowest_score: min,
          passing_rate: parseFloat(passingRate.toFixed(2)),
          question_stats: questionStats,
          region: '' // Region usually comes from profile, handled in UI or DB default
      };
  }

  private isAnswerCorrect(q: Question, ans: any): boolean {
      if (!ans) return false;
      const normalize = (s: string) => String(s).trim().toLowerCase();
      
      if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
          return normalize(ans) === normalize(q.correctAnswer || '');
      }
      if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
          // Simplified check
          return normalize(ans).length === normalize(q.correctAnswer || '').length; 
      }
      return false; // Other types ignored for simple stats
  }

  private getTopWrongAnswer(dist: Record<string, number>, q: Question): string | null {
      // Very basic logic to find most common wrong answer
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

  async getAnalyticsData(filters?: { region?: string, subject?: string }): Promise<ExamSummary[]> {
      let query = supabase.from('exam_summaries').select('*');
      if (filters?.region) query = query.ilike('school_name', `%${filters.region}%`); // Simple proxy for region
      if (filters?.subject) query = query.eq('exam_subject', filters.subject);
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) return [];
      return data as ExamSummary[];
  }

  // --- GEMINI AI ANALYTICS (GENERATIVE VISUALIZATION) ---
  async generateAIAnalysis(summaries: ExamSummary[]): Promise<string> {
      try {
          // Pre-process data to save tokens
          const simpleData = summaries.map(s => ({
              school: s.school_name,
              avg: s.average_score,
              participants: s.total_participants,
              weakness_count: s.question_stats.filter((qs: any) => qs.correct_rate < 50).length,
              top_difficulty_questions: s.question_stats
                  .filter((qs: any) => qs.correct_rate < 40)
                  .map((qs: any) => `Q${qs.id.split('-')[1] || qs.id}: ${qs.correct_rate}%`)
                  .slice(0, 3)
          }));

          const prompt = `
            You are a Senior Education Data Consultant creating an Executive Dashboard.
            
            INPUT DATA (JSON):
            ${JSON.stringify(simpleData)}

            TASK:
            Generate a visual-heavy HTML/Markdown report.
            DO NOT output raw JSON.
            DO NOT wrap HTML in code blocks (no \`\`\`html). Embed raw HTML directly into the response so it renders immediately.
            
            STRUCTURE & VISUAL RULES:

            1. EXECUTIVE SUMMARY (Scorecard Style):
               - Create a flexbox container with 3 cards: "Rata-rata Wilayah", "Sekolah Tertinggi", "Perlu Intervensi".
               - Use Tailwind classes: \`bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm\`.
               - Use text colors like \`text-emerald-600\` for good stats and \`text-rose-600\` for bad stats.

            2. DISTRIBUTION ANALYSIS (Generative Bar Charts):
               - List top 5 and bottom 5 schools.
               - Instead of just text, render a Horizontal Bar Chart using HTML <div>.
               - Template: 
                 <div class="mb-2">
                   <div class="flex justify-between text-xs font-bold mb-1"><span>{SchoolName}</span><span>{Score}</span></div>
                   <div class="w-full bg-slate-100 rounded-full h-2.5 dark:bg-slate-700">
                     <div class="bg-indigo-600 h-2.5 rounded-full" style="width: {Score}%"></div>
                   </div>
                 </div>

            3. ITEM DIAGNOSIS (Heatmap Table):
               - Identify common difficult questions.
               - Render a small HTML table where the "Difficulty" cell background color depends on value (Red < 40, Yellow < 70, Green > 70).
               - Use classes: \`w-full text-sm border-collapse\`, \`p-2 border\`.

            4. RECOMMENDATIONS (Quadrant Matrix):
               - Present a 2x2 Matrix using a Markdown Table.
               - Columns: "Quick Wins (High Impact, Low Effort)" vs "Long Term Projects".
               - Use emojis for bullet points.

            Output must be in Bahasa Indonesia. Keep it professional, insightful, and visually modern.
          `;

          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview', // Switch to Flash Model for higher rate limits
              contents: prompt
          });

          return response.text || "Gagal menghasilkan analisis.";
      } catch (e: any) {
          console.error("Gemini Error:", e);
          
          // Friendly Error UI for Rate Limits (429)
          if (e.message?.includes('429') || e.status === 429) {
             return `
                <div class="p-6 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl flex flex-col items-center text-center gap-3">
                    <div class="w-12 h-12 bg-rose-100 dark:bg-rose-800 text-rose-500 rounded-full flex items-center justify-center text-xl">⏳</div>
                    <h3 class="text-lg font-bold text-rose-700 dark:text-rose-300">Layanan Sedang Sibuk</h3>
                    <p class="text-sm text-rose-600 dark:text-rose-400">Kuota analisis AI harian/menit tercapai. Mohon tunggu beberapa saat sebelum mencoba lagi.</p>
                </div>
             `;
          }

          return "Maaf, layanan analisis AI sedang mengalami gangguan. Silakan coba lagi nanti.";
      }
  }

  async getExamForArchive(code: string): Promise<Exam | null> {
      const { data, error } = await supabase.from('exams').select('*').eq('code', code).single();
      if (error || !data) return null;

      let examData: Exam = {
          code: data.code, authorId: data.author_id, authorSchool: data.school,
          config: data.config, questions: data.questions, status: data.status, createdAt: data.created_at
      };

      const revertHtmlImages = async (html: string): Promise<string> => {
          if (!html.includes('<img')) return html;
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const images = doc.getElementsByTagName('img');
          
          for (let i = 0; i < images.length; i++) {
              const img = images[i];
              const src = img.getAttribute('src');
              const bucketPath = img.getAttribute('data-bucket-path');
              let rawBase64 = '';

              if (bucketPath) {
                  try {
                      const { data, error } = await supabase.storage.from('soal').download(bucketPath);
                      if (!error && data) {
                          rawBase64 = await new Promise<string>((resolve) => {
                              const reader = new FileReader();
                              reader.onloadend = () => resolve(reader.result as string);
                              reader.readAsDataURL(data);
                          });
                      }
                  } catch (e) {
                      console.warn("Direct download failed for archive, falling back to fetch:", bucketPath);
                  }
              }

              if (!rawBase64 && src && src.startsWith('http')) {
                  rawBase64 = await urlToBase64(src);
              }

              if (rawBase64) {
                  try {
                      // OPTIMIZATION PIPELINE:
                      // Resize to max 800px & Compress (WebP q=0.7) - improved from 0.6
                      // Refine step removed to prevent unwanted cropping
                      const final = await compressImage(rawBase64, 0.7, 800);
                      
                      img.setAttribute('src', final);
                  } catch (e) {
                      console.error("Optimization error, using original", e);
                      img.setAttribute('src', rawBase64);
                  }
                  img.removeAttribute('data-bucket-path');
              }
          }
          return doc.body.innerHTML;
      };

      for (const q of examData.questions) {
          q.questionText = await revertHtmlImages(q.questionText);
          if (q.options) {
              for (let i = 0; i < q.options.length; i++) {
                  q.options[i] = await revertHtmlImages(q.options[i]);
              }
          }
      }
      return examData;
  }

  async cleanupExamAssets(code: string): Promise<void> {
       const { data: files } = await supabase.storage.from('soal').list(code);
       if (files && files.length > 0) {
            await supabase.storage.from('soal').remove(files.map(f => `${code}/${f.name}`));
       }
  }

  async getResults(examCode?: string, className?: string): Promise<Result[]> {
    let query = supabase.from('results').select('*');
    if (examCode) query = query.eq('exam_code', examCode);
    if (className && className !== 'ALL') query = query.eq('class_name', className);
    
    // SORTING IS CRITICAL FOR LIVE VIEW: Updated/Joined recently first
    query = query.order('updated_at', { ascending: false });
    
    const { data, error } = await query;
    if (error) return [];
    
    return data.map((row: any) => ({
        student: { studentId: row.student_id, fullName: row.student_name, class: row.class_name, absentNumber: '00' },
        examCode: row.exam_code, 
        answers: row.answers || {}, // CRITICAL FIX: Fallback to empty object if null
        score: row.score, 
        correctAnswers: row.correct_answers,
        totalQuestions: row.total_questions, 
        status: row.status, 
        activityLog: row.activity_log,
        timestamp: new Date(row.updated_at).getTime(), 
        location: row.location
    }));
  }

  async submitExamResult(resultPayload: any): Promise<any> {
    if (!navigator.onLine) {
        this.addToQueue(resultPayload);
        return { ...resultPayload, isSynced: false, status: resultPayload.status || 'in_progress' };
    }

    try {
        const { error } = await supabase.from('results').upsert({
            exam_code: resultPayload.examCode, 
            student_id: resultPayload.student.studentId, 
            student_name: resultPayload.student.fullName,
            class_name: resultPayload.student.class, 
            answers: resultPayload.answers || {}, // Ensure not null
            status: resultPayload.status,
            activity_log: resultPayload.activityLog || [], 
            score: resultPayload.score || 0, 
            correct_answers: resultPayload.correctAnswers || 0,
            total_questions: resultPayload.totalQuestions || 0, 
            location: resultPayload.location, 
            updated_at: new Date().toISOString()
        }, { onConflict: 'exam_code,student_id' });

        if (error) throw error;
        
        return { ...resultPayload, isSynced: true };
    } catch (error: any) {
        console.error("CRITICAL DB ERROR:", error);
        
        const isNetworkError = !error.code && error.message === 'Failed to fetch'; 
        
        if (isNetworkError) {
            console.warn("Network glitch, adding to queue...");
            this.addToQueue(resultPayload);
            return { ...resultPayload, isSynced: false };
        } else {
             throw new Error("Gagal menyimpan ke server: " + (error.message || "Izin database ditolak (RLS)."));
        }
    }
  }

  private addToQueue(payload: any) {
      this.syncQueue = this.syncQueue.filter(item => !(item.examCode === payload.examCode && item.student.studentId === payload.student.studentId));
      this.syncQueue.push({ ...payload, queuedAt: Date.now() });
      this.saveQueue();
      if(navigator.onLine) this.processQueue(); 
  }

  private saveQueue() {
      localStorage.setItem('exam_sync_queue', JSON.stringify(this.syncQueue));
  }

  async processQueue() {
      if (this.isProcessingQueue || this.syncQueue.length === 0 || !navigator.onLine) return;
      this.isProcessingQueue = true;
      const queueCopy = [...this.syncQueue];
      const remainingQueue: any[] = [];
      
      for (const payload of queueCopy) {
          try {
             const { error } = await supabase.from('results').upsert({
                exam_code: payload.examCode, student_id: payload.student.studentId, student_name: payload.student.fullName,
                class_name: payload.student.class, answers: payload.answers || {}, status: payload.status,
                activity_log: payload.activityLog, score: payload.score || 0, correct_answers: payload.correctAnswers || 0,
                total_questions: payload.totalQuestions || 0, location: payload.location, updated_at: new Date().toISOString()
             }, { onConflict: 'exam_code,student_id' });
             
             if (error) {
                 if (error.code === '42501' || error.code === 'PGRST301') { 
                     console.error("Queue item dropped due to permission error:", error);
                 } else {
                     throw error; 
                 }
             }
          } catch (e) {
              remainingQueue.push(payload);
          }
      }
      this.syncQueue = remainingQueue;
      this.saveQueue();
      this.isProcessingQueue = false;
  }

  async getStudentResult(examCode: string, studentId: string): Promise<Result | null> {
      const { data, error } = await supabase.from('results').select('*').eq('exam_code', examCode).eq('student_id', studentId).single();
      if (error || !data) return null;
      return {
        student: { studentId: data.student_id, fullName: data.student_name, class: data.class_name, absentNumber: '00' },
        examCode: data.exam_code, answers: data.answers || {}, score: data.score, correctAnswers: data.correct_answers,
        totalQuestions: data.total_questions, status: data.status, activityLog: data.activity_log,
        timestamp: new Date(data.updated_at).getTime(), location: data.location
      };
  }

  async unlockStudentExam(examCode: string, studentId: string): Promise<void> {
      const { data } = await supabase.from('results').select('activity_log').eq('exam_code', examCode).eq('student_id', studentId).single();
      const currentLog = (data?.activity_log as string[]) || [];
      await supabase.from('results').update({ status: 'in_progress', activity_log: [...currentLog, "Guru membuka kunci"] }).eq('exam_code', examCode).eq('student_id', studentId);
  }

  async extendExamTime(examCode: string, additionalMinutes: number): Promise<void> {
      const { data } = await supabase.from('exams').select('config').eq('code', examCode).single();
      if (data && data.config) {
          const newConfig = { ...data.config, timeLimit: (data.config.timeLimit || 0) + additionalMinutes };
          await supabase.from('exams').update({ config: newConfig }).eq('code', examCode);
      }
  }

  async sendProgressUpdate(examCode: string, studentId: string, answeredCount: number, totalQuestions: number) {
      const channel = supabase.channel(`exam-room-${examCode}`);
      await channel.send({ type: 'broadcast', event: 'student_progress', payload: { studentId, answeredCount, totalQuestions, timestamp: Date.now() } });
  }
  
  async syncData() { this.processQueue(); }

  // --- NEW FEATURES (LOCKING) ---
  async generateUnlockToken(examCode: string, studentId: string): Promise<string> {
      const token = Math.floor(1000 + Math.random() * 9000).toString();
      await supabase.from('results').update({ unlock_token: token }).eq('exam_code', examCode).eq('student_id', studentId);
      return token;
  }

  async verifyUnlockToken(examCode: string, studentId: string, token: string): Promise<boolean> {
      try {
          const { data, error } = await supabase
              .from('results')
              .select('unlock_token, activity_log')
              .eq('exam_code', examCode)
              .eq('student_id', studentId)
              .single();

          if (error || !data) return false;
          
          if (data.unlock_token && String(data.unlock_token).trim() === token.trim()) {
              const currentLog = (typeof data.activity_log === 'string' ? JSON.parse(data.activity_log) : data.activity_log) || [];
              
              const { error: updateError } = await supabase
                  .from('results')
                  .update({ 
                      unlock_token: null, 
                      status: 'in_progress',
                      activity_log: [...currentLog, `[${new Date().toLocaleTimeString()}] Akses dibuka siswa dengan token`]
                  })
                  .eq('exam_code', examCode)
                  .eq('student_id', studentId);
              
              if (updateError) throw updateError;
              return true;
          }
          return false;
      } catch (e) {
          console.error("Unlock verification failed:", e);
          return false;
      }
  }

  // --- DELETE SPECIFIC RESULT ---
  async deleteStudentResult(examCode: string, studentId: string): Promise<void> {
      const { error } = await supabase
          .from('results')
          .delete()
          .eq('exam_code', examCode)
          .eq('student_id', studentId);
      
      if (error) throw error;
  }

  // --- COLD DATA (CLOUD ARCHIVE) METHODS ---

  async uploadArchive(examCode: string, jsonString: string): Promise<string> {
      const blob = new Blob([jsonString], { type: "application/json" });
      const filename = `${examCode}_${Date.now()}.json`;
      
      const { data, error } = await supabase.storage
          .from('archives')
          .upload(filename, blob, { upsert: true });
          
      if (error) throw error;
      return data?.path || filename;
  }

  async getArchivedList(): Promise<{name: string, created_at: string, size: number}[]> {
      const { data, error } = await supabase.storage.from('archives').list('', {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
      });
      
      if (error) {
          // If bucket doesn't exist or generic error, return empty to fallback to local
          console.warn("Failed to list archives:", error);
          return [];
      }
      
      return data.map((f: any) => ({
          name: f.name,
          created_at: f.created_at,
          size: f.metadata?.size || 0
      }));
  }

  async downloadArchive(path: string): Promise<any> {
      const { data, error } = await supabase.storage.from('archives').download(path);
      if (error) throw error;
      
      const text = await data.text();
      return JSON.parse(text);
  }

  async deleteArchive(filename: string): Promise<void> {
      const { error } = await supabase.storage.from('archives').remove([filename]);
      if (error) throw error;
  }
}

export const storageService = new StorageService();
