import { supabase } from '../lib/supabase';
import type { Exam, Result, Question, TeacherProfile, AccountType } from '../types';

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
 
const sanitizeExamForStudent = (exam: Exam, studentId?: string): Exam => {
    if (!studentId || studentId === 'monitor') {
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
  
  // --- AUTH METHODS (NEW) ---
  async getCurrentUser(): Promise<TeacherProfile | null> {
      const { data: { session } } = await supabase.auth.getSession();
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
          school: profile.school
      };
  }

  async signUpWithEmail(email: string, password: string, fullName: string, school: string): Promise<TeacherProfile> {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError || !authData.user) {
          throw new Error(authError?.message || 'Gagal mendaftar. Email mungkin sudah terdaftar.');
      }

      const { error: profileError } = await supabase
          .from('profiles')
          .insert({ id: authData.user.id, full_name: fullName, school: school, role: 'guru' });
      
      if (profileError) {
          // This is a tricky state. User is created in auth, but profile failed.
          throw new Error('Gagal membuat profil pengguna setelah pendaftaran.');
      }

      return {
          id: authData.user.id,
          fullName: fullName,
          accountType: 'guru',
          school: school
      };
  }

  async signInWithEmail(email: string, password: string): Promise<TeacherProfile> {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error('Email atau password salah.');
      
      const profile = await this.getCurrentUser();
      if (!profile) throw new Error('Gagal memuat profil pengguna setelah masuk.');
      
      return profile;
  }

  async signOut() {
      await supabase.auth.signOut();
  }

  // --- EXAM METHODS ---

  async getExams(): Promise<Record<string, Exam>> {
    // RLS will enforce author_id = auth.uid()
    const { data, error } = await supabase.from('exams').select('*');

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

  async getExamForStudent(code: string, studentId?: string, isPreview = false): Promise<Exam | null> {
      const { data, error } = await supabase.from('exams').select('*').eq('code', code).single();
      if (error || !data) throw new Error("EXAM_NOT_FOUND");
      if (data.status === 'DRAFT' && !isPreview) throw new Error("EXAM_IS_DRAFT");
      const exam: Exam = {
          code: data.code, authorId: data.author_id, authorSchool: data.school,
          config: data.config, questions: data.questions, status: data.status
      };
      return sanitizeExamForStudent(exam, studentId);
  }

  async saveExam(exam: Exam): Promise<void> {
    let processedQuestions = JSON.parse(JSON.stringify(exam.questions));
    const BUCKET_NAME = 'soal';
    const examCode = exam.code;

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

  async deleteExam(code: string): Promise<void> {
      await supabase.from('results').delete().eq('exam_code', code);
      await supabase.from('exams').delete().eq('code', code);
      const { data: files } = await supabase.storage.from('soal').list(code);
      if (files && files.length > 0) {
          const paths = files.map(f => `${code}/${f.name}`);
          await supabase.storage.from('soal').remove(paths);
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
              if (src && src.startsWith('http')) {
                  img.setAttribute('src', await urlToBase64(src));
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
    // RLS will filter results based on the teacher's school.
    let query = supabase.from('results').select('*');
    if (examCode) query = query.eq('exam_code', examCode);
    if (className && className !== 'ALL') query = query.eq('class_name', className);
    const { data, error } = await query;
    if (error) return [];
    return data.map((row: any) => ({
        student: { studentId: row.student_id, fullName: row.student_name, class: row.class_name, absentNumber: '00' },
        examCode: row.exam_code, answers: row.answers, score: row.score, correctAnswers: row.correct_answers,
        totalQuestions: row.total_questions, status: row.status, activityLog: row.activity_log,
        timestamp: new Date(row.updated_at).getTime(), location: row.location
    }));
  }

  async submitExamResult(resultPayload: any): Promise<any> {
    if (!navigator.onLine) {
        this.addToQueue(resultPayload);
        return { ...resultPayload, isSynced: false, status: resultPayload.status || 'in_progress' };
    }
    try {
        const { error } = await supabase.from('results').upsert({
            exam_code: resultPayload.examCode, student_id: resultPayload.student.studentId, student_name: resultPayload.student.fullName,
            class_name: resultPayload.student.class, answers: resultPayload.answers, status: resultPayload.status,
            activity_log: resultPayload.activityLog, score: resultPayload.score || 0, correct_answers: resultPayload.correctAnswers || 0,
            total_questions: resultPayload.totalQuestions || 0, location: resultPayload.location, updated_at: new Date().toISOString()
        }, { onConflict: 'exam_code,student_id' });
        if (error) throw error;
        return { ...resultPayload, isSynced: true };
    } catch (error) {
        console.warn("Submit failed, adding to queue:", error);
        this.addToQueue(resultPayload);
        return { ...resultPayload, isSynced: false };
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
                class_name: payload.student.class, answers: payload.answers, status: payload.status,
                activity_log: payload.activityLog, score: payload.score || 0, correct_answers: payload.correctAnswers || 0,
                total_questions: payload.totalQuestions || 0, location: payload.location, updated_at: new Date().toISOString()
             }, { onConflict: 'exam_code,student_id' });
             if (error) throw error;
          } catch (e) {
              console.error("Queue retry failed", e);
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
        examCode: data.exam_code, answers: data.answers, score: data.score, correctAnswers: data.correct_answers,
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
}

export const storageService = new StorageService();
