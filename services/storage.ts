
import { supabase } from '../lib/supabase';
import type { Exam, Result, TeacherProfile, Student, UserProfile, AccountType, ResultStatus } from '../types';

class StorageService {
  async getCurrentUser(): Promise<TeacherProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
    
    if (profile) {
        return {
            id: profile.id,
            fullName: profile.full_name,
            accountType: profile.account_type || 'guru',
            school: profile.school,
            email: user.email
        };
    }
    return null;
  }

  async getExamForStudent(examCode: string, studentId: string, isPreview: boolean): Promise<Exam | null> {
    if (isPreview) {
        // Mock fetch for preview if needed, or just fetch the exam strictly
        const { data } = await supabase.from('exams').select('*').eq('code', examCode).single();
        return data as Exam;
    }
    
    const { data } = await supabase.from('exams').select('*').eq('code', examCode).eq('status', 'PUBLISHED').single();
    if (!data) return null;
    return data as Exam;
  }

  async getStudentResult(examCode: string, studentId: string): Promise<Result | null> {
      const { data } = await supabase.from('results').select('*').eq('exam_code', examCode).eq('student_id', studentId).single();
      if (!data) return null;
      
      return {
          student: {
              studentId: data.student_id,
              fullName: data.student_name,
              class: data.student_class,
              absentNumber: data.student_absent_number || '00'
          },
          examCode: data.exam_code,
          answers: data.answers || {},
          score: data.score || 0,
          totalQuestions: data.total_questions || 0,
          correctAnswers: data.correct_answers || 0,
          status: data.status,
          activityLog: data.activity_log || [],
          location: data.location,
          timestamp: new Date(data.created_at).getTime()
      } as Result;
  }

  async submitExamResult(payload: any): Promise<Result> {
      const { student, examCode, answers, status, activityLog, location, grading } = payload;
      
      const dbPayload = {
          student_id: student.studentId,
          student_name: student.fullName,
          student_class: student.class,
          student_absent_number: student.absentNumber,
          exam_code: examCode,
          answers,
          status,
          activity_log: activityLog,
          location,
          score: grading?.score || 0,
          correct_answers: grading?.correctAnswers || 0,
          total_questions: grading?.totalQuestions || 0,
          updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
          .from('results')
          .upsert(dbPayload, { onConflict: 'exam_code,student_id' })
          .select()
          .single();
      
      if (error) throw error;

      return {
          student,
          examCode,
          answers: data.answers,
          score: data.score,
          totalQuestions: data.total_questions,
          correctAnswers: data.correct_answers,
          status: data.status,
          activityLog: data.activity_log,
          timestamp: new Date(data.updated_at).getTime()
      };
  }

  async syncData() {
      // Placeholder for offline sync logic
      console.log('Syncing data...');
  }

  async getExams(profile: TeacherProfile): Promise<Record<string, Exam>> {
      let query = supabase.from('exams').select('*');
      if (profile.accountType !== 'super_admin') {
          // Typically handled by RLS policies on the server side
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      const examMap: Record<string, Exam> = {};
      data?.forEach((e: any) => {
          examMap[e.code] = e as Exam;
      });
      return examMap;
  }

  async getResults(examCode?: string, classFilter?: string): Promise<Result[]> {
      let query = supabase.from('results').select('*');
      if (examCode) query = query.eq('exam_code', examCode);
      if (classFilter) query = query.eq('student_class', classFilter);
      
      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((d: any) => ({
          student: {
              studentId: d.student_id,
              fullName: d.student_name,
              class: d.student_class,
              absentNumber: d.student_absent_number
          },
          examCode: d.exam_code,
          answers: d.answers,
          score: d.score,
          totalQuestions: d.total_questions,
          correctAnswers: d.correct_answers,
          status: d.status,
          activityLog: d.activity_log,
          location: d.location,
          timestamp: new Date(d.updated_at).getTime()
      }));
  }

  async saveExam(exam: Exam): Promise<void> {
      const { error } = await supabase.from('exams').upsert({
          code: exam.code,
          questions: exam.questions,
          config: exam.config,
          author_id: exam.authorId,
          author_school: exam.authorSchool,
          status: exam.status,
          created_at: exam.createdAt || new Date().toISOString()
      });
      if (error) throw error;
  }

  async deleteExam(code: string): Promise<void> {
      await supabase.from('exams').delete().eq('code', code);
  }

  async unlockStudentExam(examCode: string, studentId: string): Promise<void> {
      await supabase.from('results').update({ status: 'in_progress', unlock_token: null }).eq('exam_code', examCode).eq('student_id', studentId);
  }

  async signOut(): Promise<void> {
      await supabase.auth.signOut();
  }

  async signInWithEmail(email: string, password: string): Promise<TeacherProfile> {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error("Login failed");
      
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
      return {
          id: profile.id,
          fullName: profile.full_name,
          accountType: profile.account_type || 'guru',
          school: profile.school,
          email: data.user.email
      };
  }

  async signUpWithEmail(email: string, password: string, fullName: string, school: string): Promise<TeacherProfile> {
      const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
              data: {
                  full_name: fullName,
                  school: school,
                  account_type: 'guru'
              }
          }
      });
      if (error) throw error;
      if (!data.user) throw new Error("Signup failed");

      return {
          id: data.user.id,
          fullName,
          accountType: 'guru',
          school,
          email
      };
  }

  async generateUnlockToken(examCode: string, studentId: string): Promise<string> {
      const token = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit
      await supabase.from('results').update({ unlock_token: token }).eq('exam_code', examCode).eq('student_id', studentId);
      return token;
  }

  async verifyUnlockToken(examCode: string, studentId: string, token: string): Promise<boolean> {
      const { data, error } = await supabase
          .from('results')
          .select('unlock_token, activity_log')
          .eq('exam_code', examCode)
          .eq('student_id', studentId)
          .single();

      if (error || !data) return false;
      
      if (data.unlock_token === token) {
          const currentLog = (data.activity_log as string[]) || [];
          await supabase
              .from('results')
              .update({ 
                  unlock_token: null, 
                  status: 'in_progress',
                  activity_log: [...currentLog, `[${new Date().toLocaleTimeString()}] Akses dibuka siswa dengan token`]
              })
              .eq('exam_code', examCode)
              .eq('student_id', studentId);
          return true;
      }
      return false;
  }

  async extendExamTime(examCode: string, minutes: number): Promise<void> {
      const { data } = await supabase.from('exams').select('config').eq('code', examCode).single();
      if (data && data.config) {
          const newConfig = { ...data.config, timeLimit: data.config.timeLimit + minutes };
          await supabase.from('exams').update({ config: newConfig }).eq('code', examCode);
      }
  }

  async sendProgressUpdate(examCode: string, studentId: string, answered: number, total: number): Promise<void> {
      await supabase.channel(`exam-room-${examCode}`).send({
          type: 'broadcast',
          event: 'student_progress',
          payload: { studentId, answeredCount: answered, totalQuestions: total, timestamp: Date.now() }
      });
  }

  async getExamForArchive(examCode: string): Promise<Exam | null> {
      const { data } = await supabase.from('exams').select('*').eq('code', examCode).single();
      return data as Exam;
  }

  async cleanupExamAssets(examCode: string): Promise<void> {
      // Placeholder
  }

  async getAllUsers(): Promise<UserProfile[]> {
      const { data } = await supabase.from('profiles').select('*');
      return (data || []).map((p: any) => ({
          id: p.id,
          fullName: p.full_name,
          accountType: p.account_type || 'guru',
          school: p.school,
          email: p.email
      }));
  }

  async updateUserRole(userId: string, role: AccountType, school: string): Promise<void> {
      await supabase.from('profiles').update({ account_type: role, school }).eq('id', userId);
  }
}

export const storageService = new StorageService();
