import { supabase } from '../lib/supabase';
import type { Exam, Result, Question, TeacherProfile } from '../types';

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

  async saveExam(exam: Exam, headers: Record<string, string> = {}): Promise<void> {
    const userId = headers['x-user-id'];
    const school = headers['x-school'];

    const { error } = await supabase
        .from('exams')
        .upsert({
            code: exam.code,
            author_id: userId || exam.authorId,
            school: school || exam.authorSchool,
            config: exam.config,
            questions: exam.questions,
            status: exam.status || 'PUBLISHED'
        });

    if (error) throw error;
  }

  async deleteExam(code: string, headers: Record<string, string> = {}): Promise<void> {
      await supabase.from('results').delete().eq('exam_code', code);
      await supabase.from('exams').delete().eq('code', code);
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

  async submitExamResult(resultPayload: any): Promise<any> {
    const { examCode, student, answers, status, activityLog, score, correctAnswers, totalQuestions, location } = resultPayload;

    const { data, error } = await supabase
        .from('results')
        .upsert({
            exam_code: examCode,
            student_id: student.studentId,
            student_name: student.fullName,
            class_name: student.class,
            answers: answers,
            status: status,
            activity_log: activityLog,
            score: score || 0,
            correct_answers: correctAnswers || 0,
            total_questions: totalQuestions || 0,
            location: location,
            updated_at: new Date().toISOString()
        }, { onConflict: 'exam_code,student_id' })
        .select()
        .single();

    if (error) {
        console.error("Submit error:", error);
        throw error;
    }

    return { ...resultPayload, isSynced: true };
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
  
  // Mengirim update progress ringan ke guru tanpa menulis ke database
  async sendProgressUpdate(examCode: string, studentId: string, answeredCount: number, totalQuestions: number) {
      const channel = supabase.channel(`exam-room-${examCode}`);
      
      // Kita tidak perlu subscribe penuh, cukup kirim pesan jika channel aktif atau buat baru sebentar
      // Namun untuk efisiensi, sebaiknya komponen React yang me-manage subscription.
      // Di sini kita gunakan send langsung via channel yang mungkin sudah ada atau stateless.
      
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
  
  async syncData() { }
}

export const storageService = new StorageService();
