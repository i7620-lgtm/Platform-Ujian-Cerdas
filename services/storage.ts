 
import { supabase } from '../lib/supabase';
import type { Exam, Result, Question, TeacherProfile } from '../types';

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
const shuffleArray = <T>(array: T[]): T[] => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
};

const sanitizeExamForStudent = (exam: Exam): Exam => {
    let questionsToProcess = [...exam.questions];

    if (exam.config.shuffleQuestions) {
        questionsToProcess = shuffleArray(questionsToProcess);
    }

    const sanitizedQuestions = questionsToProcess.map(q => {
        const { correctAnswer, trueFalseRows, matchingPairs, options, ...rest } = q;
        const sanitizedQ = { ...rest, options: options ? [...options] : undefined } as Question;

        if (exam.config.shuffleAnswers) {
            if (sanitizedQ.questionType === 'MULTIPLE_CHOICE' || sanitizedQ.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
                if (sanitizedQ.options && sanitizedQ.options.length > 0) {
                    sanitizedQ.options = shuffleArray(sanitizedQ.options);
                }
            }
        }

        if (trueFalseRows) sanitizedQ.trueFalseRows = trueFalseRows.map(r => ({ text: r.text, answer: false })) as any;
        
        if (matchingPairs && Array.isArray(matchingPairs)) {
            const rights = matchingPairs.map(p => p.right).sort(() => Math.random() - 0.5);
            sanitizedQ.matchingPairs = matchingPairs.map((p, i) => ({ left: p.left, right: rights[i] }));
        }
        
        return sanitizedQ;
    });

    return { ...exam, questions: sanitizedQuestions };
};

class StorageService {
    private syncQueue: any[] = [];
    private isProcessingQueue = false;

    constructor() {
        // Load Queue from LocalStorage on init
        const savedQueue = localStorage.getItem('exam_sync_queue');
        if (savedQueue) {
            try { this.syncQueue = JSON.parse(savedQueue); } catch(e) {}
        }
        
        // Listen to online status to process queue
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.processQueue());
            // Try processing every 30 seconds if queue exists
            setInterval(() => {
                if (this.syncQueue.length > 0) this.processQueue();
            }, 30000);
        }
    }
  
  // --- AUTH METHODS ---
  async loginUser(username: string, password: string): Promise<TeacherProfile | null> {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (error || !data) return null;

      return {
          id: data.username,
          fullName: data.full_name,
          accountType: data.role as any,
          school: data.school
      };
  }

  async registerUser(userData: any): Promise<TeacherProfile | null> {
      const { data, error } = await supabase
        .from('users')
        .insert([{
            username: userData.username,
            password: userData.password,
            full_name: userData.fullName,
            school: userData.school,
            role: 'guru'
        }])
        .select()
        .single();

      if (error) throw new Error(error.message);
      
      return {
          id: data.username,
          fullName: data.full_name,
          accountType: data.role as any,
          school: data.school
      };
  }

  // --- EXAM METHODS ---

  async getExams(headers: Record<string, string> = {}): Promise<Record<string, Exam>> {
    const requesterId = headers['x-user-id'];
    
    const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('author_id', requesterId);

    if (error) {
        console.error("Error fetching exams:", error);
        return {};
    }

    const examMap: Record<string, Exam> = {};
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
    return examMap;
  }

  async getExamForStudent(code: string, isPreview = false): Promise<Exam | null> {
      const { data, error } = await supabase
          .from('exams')
          .select('*')
          .eq('code', code)
          .single();

      if (error || !data) throw new Error("EXAM_NOT_FOUND");
      
      if (data.status === 'DRAFT' && !isPreview) throw new Error("EXAM_IS_DRAFT");

      const exam: Exam = {
          code: data.code,
          authorId: data.author_id,
          authorSchool: data.school,
          config: data.config,
          questions: data.questions,
          status: data.status
      };

      return sanitizeExamForStudent(exam);
  }

  // LOGIKA BARU: Save Exam dengan Upload Gambar ke Bucket
  async saveExam(exam: Exam, headers: Record<string, string> = {}): Promise<void> {
    const userId = headers['x-user-id'];
    const school = headers['x-school'];
    
    // Deep clone questions agar tidak memutasi state UI langsung
    let processedQuestions = JSON.parse(JSON.stringify(exam.questions));
    const BUCKET_NAME = 'soal'; // Pastikan bucket ini ada di Supabase
    const examCode = exam.code;

    // Helper untuk memproses string HTML yang mengandung gambar Base64
    const processHtmlString = async (html: string, contextId: string): Promise<string> => {
        if (!html.includes('data:image')) return html;

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const images = doc.getElementsByTagName('img');
        
        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            const src = img.getAttribute('src');
            
            if (src && src.startsWith('data:image')) {
                // Upload ke Bucket
                try {
                    const blob = base64ToBlob(src);
                    const ext = src.substring(src.indexOf('/') + 1, src.indexOf(';'));
                    const filename = `${examCode}/${contextId}_${Date.now()}_${i}.${ext}`;
                    
                    const { data, error } = await supabase.storage
                        .from(BUCKET_NAME)
                        .upload(filename, blob, { upsert: true });

                    if (!error && data) {
                        const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filename);
                        img.setAttribute('src', publicUrlData.publicUrl);
                        // Tambahkan atribut agar mudah dilacak saat arsip
                        img.setAttribute('data-bucket-path', filename); 
                    }
                } catch (e) {
                    console.error("Gagal upload gambar", e);
                }
            }
        }
        return doc.body.innerHTML;
    };

    // Iterasi semua pertanyaan untuk upload gambar
    for (const q of processedQuestions) {
        // Proses Question Text
        q.questionText = await processHtmlString(q.questionText, q.id);

        // Proses Options (jika ada)
        if (q.options) {
            for (let i = 0; i < q.options.length; i++) {
                q.options[i] = await processHtmlString(q.options[i], `${q.id}_opt_${i}`);
            }
        }
    }

    const { error } = await supabase
        .from('exams')
        .upsert({
            code: exam.code,
            author_id: userId || exam.authorId,
            school: school || exam.authorSchool,
            config: exam.config,
            questions: processedQuestions,
            status: exam.status || 'PUBLISHED'
        });

    if (error) throw error;
  }

  async deleteExam(code: string, headers: Record<string, string> = {}): Promise<void> {
      // 1. Hapus Results
      await supabase.from('results').delete().eq('exam_code', code);
      // 2. Hapus Exam
      await supabase.from('exams').delete().eq('code', code);
      // 3. (Opsional) Hapus folder gambar di bucket
      // Supabase storage JS client tidak support delete folder recursive secara native mudah, 
      // tapi kita bisa list file di folder itu lalu delete.
      const { data: files } = await supabase.storage.from('soal').list(code);
      if (files && files.length > 0) {
          const paths = files.map(f => `${code}/${f.name}`);
          await supabase.storage.from('soal').remove(paths);
      }
  }

  // --- ARCHIVE & CLEANUP METHODS ---

  // Mengubah Exam menjadi JSON lengkap dengan gambar Base64 (Self-contained)
  async getExamForArchive(code: string): Promise<Exam | null> {
      const { data, error } = await supabase
          .from('exams')
          .select('*')
          .eq('code', code)
          .single();

      if (error || !data) return null;

      let examData: Exam = {
          code: data.code,
          authorId: data.author_id,
          authorSchool: data.school,
          config: data.config,
          questions: data.questions,
          status: data.status,
          createdAt: data.created_at
      };

      // Helper Revert URL to Base64
      const revertHtmlImages = async (html: string): Promise<string> => {
          if (!html.includes('<img')) return html;
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const images = doc.getElementsByTagName('img');

          for (let i = 0; i < images.length; i++) {
              const img = images[i];
              const src = img.getAttribute('src');
              if (src && src.startsWith('http')) {
                  const base64 = await urlToBase64(src);
                  img.setAttribute('src', base64);
                  img.removeAttribute('data-bucket-path'); // Clean metadata
              }
          }
          return doc.body.innerHTML;
      };

      // Convert semua gambar kembali ke Base64
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

  // Menghapus gambar fisik di bucket setelah arsip sukses
  async cleanupExamAssets(code: string): Promise<void> {
       const { data: files } = await supabase.storage.from('soal').list(code);
       if (files && files.length > 0) {
            const paths = files.map(f => `${code}/${f.name}`);
            await supabase.storage.from('soal').remove(paths);
       }
       // Note: Kita tidak menghapus record exam di DB di sini, 
       // user harus klik "Hapus" manual di dashboard jika ingin, 
       // atau panggil deleteExam terpisah.
  }

  // --- RESULT METHODS ---

  async getResults(examCode?: string, className?: string, headers: Record<string, string> = {}): Promise<Result[]> {
    let query = supabase.from('results').select('*');

    if (examCode) query = query.eq('exam_code', examCode);
    if (className && className !== 'ALL') query = query.eq('class_name', className);

    const { data, error } = await query;
    
    if (error) return [];

    return data.map((row: any) => ({
        student: {
            studentId: row.student_id,
            fullName: row.student_name,
            class: row.class_name,
            absentNumber: '00' 
        },
        examCode: row.exam_code,
        answers: row.answers,
        score: row.score,
        correctAnswers: row.correct_answers,
        totalQuestions: row.total_questions,
        status: row.status,
        activityLog: row.activity_log,
        timestamp: new Date(row.updated_at).getTime(),
        location: row.location
    }));
  }

  // UPDATED: Submit with Background Sync (Queue)
  async submitExamResult(resultPayload: any): Promise<any> {
    const { examCode, student } = resultPayload;
    
    // Check koneksi internet
    if (!navigator.onLine) {
        this.addToQueue(resultPayload);
        return { ...resultPayload, isSynced: false, status: resultPayload.status || 'in_progress' };
    }

    try {
        const { data, error } = await supabase
            .from('results')
            .upsert({
                exam_code: examCode,
                student_id: student.studentId,
                student_name: student.fullName,
                class_name: student.class,
                answers: resultPayload.answers,
                status: resultPayload.status,
                activity_log: resultPayload.activityLog,
                score: resultPayload.score || 0,
                correct_answers: resultPayload.correctAnswers || 0,
                total_questions: resultPayload.totalQuestions || 0,
                location: resultPayload.location,
                updated_at: new Date().toISOString()
            }, { onConflict: 'exam_code,student_id' })
            .select()
            .single();

        if (error) throw error;
        return { ...resultPayload, isSynced: true };

    } catch (error) {
        // Jika error (misal server busy 429 atau 500), masuk antrean
        console.warn("Submit failed, adding to queue:", error);
        this.addToQueue(resultPayload);
        return { ...resultPayload, isSynced: false };
    }
  }

  // --- QUEUE SYSTEM ---
  private addToQueue(payload: any) {
      // Hapus payload lama untuk siswa & exam yang sama agar tidak duplikat
      this.syncQueue = this.syncQueue.filter(
          item => !(item.examCode === payload.examCode && item.student.studentId === payload.student.studentId)
      );
      this.syncQueue.push({ ...payload, queuedAt: Date.now() });
      this.saveQueue();
      // Coba proses segera jika mungkin
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

      // Proses batch
      for (const payload of queueCopy) {
          try {
             const { examCode, student } = payload;
             const { error } = await supabase
                .from('results')
                .upsert({
                    exam_code: examCode,
                    student_id: student.studentId,
                    student_name: student.fullName,
                    class_name: student.class,
                    answers: payload.answers,
                    status: payload.status,
                    activity_log: payload.activityLog,
                    score: payload.score || 0,
                    correct_answers: payload.correctAnswers || 0,
                    total_questions: payload.totalQuestions || 0,
                    location: payload.location,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'exam_code,student_id' });

             if (error) throw error;
          } catch (e) {
              console.error("Queue retry failed", e);
              remainingQueue.push(payload); // Keep in queue if failed
          }
      }

      this.syncQueue = remainingQueue;
      this.saveQueue();
      this.isProcessingQueue = false;
      
      // Jika masih ada sisa dan online, coba lagi nanti (interval akan handle)
  }

  async getStudentResult(examCode: string, studentId: string): Promise<Result | null> {
      const { data, error } = await supabase
          .from('results')
          .select('*')
          .eq('exam_code', examCode)
          .eq('student_id', studentId)
          .single();

      if (error || !data) return null;

      return {
        student: {
            studentId: data.student_id,
            fullName: data.student_name,
            class: data.class_name,
            absentNumber: '00'
        },
        examCode: data.exam_code,
        answers: data.answers,
        score: data.score,
        correctAnswers: data.correct_answers,
        totalQuestions: data.total_questions,
        status: data.status,
        activityLog: data.activity_log,
        timestamp: new Date(data.updated_at).getTime(),
        location: data.location
      };
  }

  async unlockStudentExam(examCode: string, studentId: string): Promise<void> {
      const { data } = await supabase
        .from('results')
        .select('activity_log')
        .eq('exam_code', examCode)
        .eq('student_id', studentId)
        .single();

      const currentLog = (data?.activity_log as string[]) || [];

      await supabase
        .from('results')
        .update({ 
            status: 'in_progress', 
            activity_log: [...currentLog, "Guru membuka kunci"] 
        })
        .eq('exam_code', examCode)
        .eq('student_id', studentId);
  }

  async extendExamTime(examCode: string, additionalMinutes: number): Promise<void> {
      const { data } = await supabase.from('exams').select('config').eq('code', examCode).single();
      if (data && data.config) {
          const newConfig = { ...data.config, timeLimit: (data.config.timeLimit || 0) + additionalMinutes };
          await supabase.from('exams').update({ config: newConfig }).eq('code', examCode);
      }
  }

  // --- REALTIME BROADCAST METHODS (Hemat Bandwidth) ---
  
  async sendProgressUpdate(examCode: string, studentId: string, answeredCount: number, totalQuestions: number) {
      const channel = supabase.channel(`exam-room-${examCode}`);
      await channel.send({
          type: 'broadcast',
          event: 'student_progress',
          payload: {
              studentId,
              answeredCount,
              totalQuestions,
              timestamp: Date.now()
          }
      });
  }
  
  async syncData() { this.processQueue(); }
}

export const storageService = new StorageService();
