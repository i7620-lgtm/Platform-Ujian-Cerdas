
import { supabase } from '../lib/supabase';
import type { Exam, Result, TeacherProfile, Student, UserProfile, AccountType, ResultStatus } from '../types';

class StorageService {
  async getCurrentUser(): Promise<TeacherProfile | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (!profile) return null;

    return {
      id: profile.id,
      fullName: profile.full_name,
      school: profile.school,
      accountType: profile.account_type || 'guru',
      email: session.user.email
    };
  }

  async signOut() {
    await supabase.auth.signOut();
  }

  async signInWithEmail(email: string, password: string): Promise<TeacherProfile> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.session) throw new Error("No session");
    
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.session.user.id).single();
    if (!profile) throw new Error("Profile not found");

    return {
      id: profile.id,
      fullName: profile.full_name,
      school: profile.school,
      accountType: profile.account_type || 'guru',
      email: data.session.user.email
    };
  }

  async signUpWithEmail(email: string, password: string, fullName: string, school: string): Promise<TeacherProfile> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, school }
      }
    });

    if (error) throw error;
    if (!data.session) throw new Error("Registration successful but no session. Check email confirmation settings.");

    return {
      id: data.session.user.id,
      fullName,
      school,
      accountType: 'guru', 
      email
    };
  }

  async getExamForStudent(examCode: string, studentId: string, isPreview: boolean = false): Promise<Exam | null> {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('code', examCode)
      .single();
    
    if (error || !data) return null;
    if (!isPreview && data.status !== 'PUBLISHED') throw new Error('EXAM_IS_DRAFT');

    return {
        ...data,
        questions: typeof data.questions === 'string' ? JSON.parse(data.questions) : data.questions,
        config: typeof data.config === 'string' ? JSON.parse(data.config) : data.config
    };
  }

  async getStudentResult(examCode: string, studentId: string): Promise<Result | null> {
    const { data, error } = await supabase
      .from('results')
      .select('*')
      .eq('exam_code', examCode)
      .eq('student_id', studentId)
      .maybeSingle();

    if (error || !data) return null;
    
    return {
        student: {
            fullName: data.student_name,
            class: data.student_class,
            absentNumber: data.student_number,
            studentId: data.student_id
        },
        examCode: data.exam_code,
        answers: typeof data.answers === 'string' ? JSON.parse(data.answers) : data.answers,
        score: data.score,
        totalQuestions: data.total_questions,
        correctAnswers: data.correct_answers,
        status: data.status,
        activityLog: typeof data.activity_log === 'string' ? JSON.parse(data.activity_log) : data.activity_log,
        timestamp: new Date(data.created_at).getTime(),
        location: data.location
    };
  }

  // Recursive helper to handle schema mismatches dynamically
  private async safeUpsertResult(payload: any, retries = 5): Promise<any> {
      try {
          const { data, error } = await supabase
              .from('results')
              .upsert(payload, { onConflict: 'exam_code,student_id' })
              .select()
              .single();
          
          if (error) throw error;
          return data;
      } catch (err: any) {
          // Check for "Column not found" error (PGRST204)
          // Message format usually: "Could not find the 'column_name' column of 'table' in the schema cache"
          if (retries > 0 && err.code === 'PGRST204') {
              const match = err.message?.match(/'([^']+)' column/);
              const missingColumn = match ? match[1] : null;
              
              if (missingColumn && payload[missingColumn] !== undefined) {
                  console.warn(`Schema mismatch: Removing missing column '${missingColumn}' and retrying...`);
                  const newPayload = { ...payload };
                  delete newPayload[missingColumn];
                  return this.safeUpsertResult(newPayload, retries - 1);
              }
          }
          throw err;
      }
  }

  async submitExamResult(params: {
    student: Student,
    examCode: string,
    answers: Record<string, string>,
    status: ResultStatus,
    activityLog?: string[],
    location?: string,
    timestamp: number,
    score?: number,
    correctAnswers?: number,
    totalQuestions?: number
  }): Promise<Result> {
    const payload = {
        student_id: params.student.studentId,
        exam_code: params.examCode,
        student_name: params.student.fullName,
        student_class: params.student.class,
        student_number: params.student.absentNumber,
        answers: params.answers,
        status: params.status,
        activity_log: params.activityLog || [],
        location: params.location,
        score: params.score || 0,
        correct_answers: params.correctAnswers || 0,
        total_questions: params.totalQuestions || 0,
        updated_at: new Date().toISOString()
    };

    try {
        await this.safeUpsertResult(payload);
        
        return {
            student: params.student,
            examCode: params.examCode,
            answers: params.answers,
            status: params.status,
            activityLog: params.activityLog,
            location: params.location,
            score: params.score || 0,
            correctAnswers: params.correctAnswers || 0,
            totalQuestions: params.totalQuestions || 0,
            timestamp: params.timestamp
        };
    } catch (err: any) {
        console.error("Final submit error after retries:", err);
        throw err;
    }
  }

  async getExams(teacher: TeacherProfile): Promise<Record<string, Exam>> {
    const { data, error } = await supabase
        .from('exams')
        .select('*');
        
    if (error) throw error;
    
    const examMap: Record<string, Exam> = {};
    data.forEach((e: any) => {
        examMap[e.code] = {
            code: e.code,
            authorId: e.author_id,
            authorSchool: e.author_school,
            questions: typeof e.questions === 'string' ? JSON.parse(e.questions) : e.questions,
            config: typeof e.config === 'string' ? JSON.parse(e.config) : e.config,
            status: e.status,
            createdAt: e.created_at
        };
    });
    return examMap;
  }

  async saveExam(exam: Exam): Promise<void> {
    const payload = {
        code: exam.code,
        author_id: exam.authorId,
        author_school: exam.authorSchool,
        questions: exam.questions,
        config: exam.config,
        status: exam.status,
        updated_at: new Date().toISOString()
    };
    
    const { error } = await supabase
        .from('exams')
        .upsert(payload, { onConflict: 'code' });
        
    if (error) throw error;
  }

  async deleteExam(code: string): Promise<void> {
      const { error } = await supabase.from('exams').delete().eq('code', code);
      if (error) throw error;
  }

  async getResults(examCode?: string, classFilter?: string): Promise<Result[]> {
      let query = supabase.from('results').select('*');
      
      if (examCode) query = query.eq('exam_code', examCode);
      if (classFilter) query = query.eq('student_class', classFilter);
      
      const { data, error } = await query;
      if (error) throw error;

      return data.map((d: any) => ({
        student: {
            fullName: d.student_name,
            class: d.student_class,
            absentNumber: d.student_number,
            studentId: d.student_id
        },
        examCode: d.exam_code,
        answers: typeof d.answers === 'string' ? JSON.parse(d.answers) : d.answers,
        score: d.score,
        totalQuestions: d.total_questions,
        correctAnswers: d.correct_answers,
        status: d.status,
        activityLog: typeof d.activity_log === 'string' ? JSON.parse(d.activity_log) : d.activity_log,
        timestamp: new Date(d.created_at).getTime(),
        location: d.location
      }));
  }

  async unlockStudentExam(examCode: string, studentId: string): Promise<void> {
      const { error } = await supabase
          .from('results')
          .update({ status: 'in_progress', unlock_token: null })
          .eq('exam_code', examCode)
          .eq('student_id', studentId);
      if (error) throw error;
  }

  // Not used directly anymore by StudentExamPage, but kept for compatibility
  async sendProgressUpdate(examCode: string, studentId: string, answeredCount: number, totalQuestions: number): Promise<void> {
    await supabase.channel(`exam-room-${examCode}`).send({
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

  async extendExamTime(examCode: string, minutes: number): Promise<void> {
      const { data, error } = await supabase.from('exams').select('config').eq('code', examCode).single();
      if (error || !data) throw new Error("Exam not found");
      
      const config = typeof data.config === 'string' ? JSON.parse(data.config) : data.config;
      config.timeLimit += minutes;
      
      await supabase.from('exams').update({ config }).eq('code', examCode);
  }

  async getAllUsers(): Promise<UserProfile[]> {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      
      return data.map((p: any) => ({
          id: p.id,
          fullName: p.full_name,
          email: p.email,
          school: p.school,
          accountType: p.account_type || 'guru',
          createdAt: p.created_at
      }));
  }

  async updateUserRole(userId: string, role: AccountType, school: string): Promise<void> {
      const { error } = await supabase.from('profiles').update({ account_type: role, school }).eq('id', userId);
      if (error) throw error;
  }

  async getExamForArchive(code: string): Promise<Exam | null> {
      const exam = await this.getExamForStudent(code, 'archive', true);
      return exam;
  }

  async cleanupExamAssets(code: string): Promise<void> {
      const { data: list } = await supabase.storage.from('exam-assets').list(code);
      if (list && list.length > 0) {
          const filesToRemove = list.map(x => `${code}/${x.name}`);
          await supabase.storage.from('exam-assets').remove(filesToRemove);
      }
  }

  async syncData() {
      // Placeholder for offline sync logic if PWA
  }

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
}

export const storageService = new StorageService();
