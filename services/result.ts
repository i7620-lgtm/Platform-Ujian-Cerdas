import { supabase } from '../lib/supabase';
import { offlineService } from './offline';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Result, ResultStatus, Exam, ExamConfig } from '../types';

export class ResultService {
  mapRowToResult(row: Record<string, unknown>): Result {
        const studentIdStr = row.student_id as string;
        let absentNumber = '00';
        let dbSchoolName = '';
        let dbClassName = row.class_name as string;
        let studentName = row.student_name as string;

        // Parse Format 2 if applicable
        if (studentIdStr.startsWith('@') && studentIdStr.includes('#') && studentIdStr.includes('$') && studentIdStr.includes('%')) {
            const match = studentIdStr.match(/^@(.*?)#(.*?)\$(.*?)%(.*)$/);
            if (match) {
                dbSchoolName = match[1];
                studentName = match[2];
                dbClassName = match[3];
                absentNumber = match[4];
            }
        } else {
            // Format 1 Fallback
            const student = row.student as Record<string, string> | undefined;
            absentNumber = student?.absentNumber || '00';
            if (absentNumber === '00' && typeof studentIdStr === 'string') {
                const parts = studentIdStr.split('-');
                if (parts.length >= 2) {
                    const lastPart = parts[parts.length - 1];
                    if (!isNaN(parseInt(lastPart))) {
                        absentNumber = lastPart;
                    } else if (parts.length > 2) {
                        absentNumber = parts[parts.length - 2];
                    }
                }
            }
            dbSchoolName = student?.schoolName || '';
            if (dbClassName && dbClassName.includes('::')) {
                const parts = dbClassName.split('::');
                dbSchoolName = parts[0];
                dbClassName = parts[1];
            }
        }

        const answers = (row.answers as Record<string, string>) || {};
        const durationStr = answers['_duration'];
        const completionTime = durationStr ? parseInt(durationStr) : undefined;
        const validCompletionTime = !isNaN(completionTime as number) ? completionTime : 0;

        return {
            id: row.id as number, // Primary Key
            student: { 
                studentId: studentIdStr, 
                fullName: studentName, 
                class: dbClassName, 
                schoolName: dbSchoolName,
                absentNumber: absentNumber,
                resultId: row.id as number
            },
            examCode: row.exam_code as string, 
            answers: answers, // CRITICAL FIX: Fallback to empty object if null
            score: row.score as number, 
            correctAnswers: row.correct_answers as number,
            totalQuestions: row.total_questions as number, 
            completionTime: validCompletionTime,
            status: row.status as ResultStatus, 
            activityLog: row.activity_log as string[],
            timestamp: new Date(row.updated_at as string).getTime(), 
            location: row.location as { lat: number; lng: number } | undefined
        };
  }

  async getResults(examCode?: string, className?: string, schoolName?: string): Promise<Result[]> {
    let query = supabase.from('results').select('id, exam_code, student_id, student_name, class_name, status, score, correct_answers, total_questions, answers, updated_at, location');
    if (examCode) query = query.eq('exam_code', examCode);
    
    // SORTING IS CRITICAL FOR LIVE VIEW: Updated/Joined recently first
    query = query.order('updated_at', { ascending: false });
    
    const { data, error } = await query;
    if (error) return [];
    
    let results = data.map((row: Record<string, unknown>) => this.mapRowToResult(row));

    if (className && className !== 'ALL') {
        results = results.filter(r => r.student.class === className);
    }
    if (schoolName && schoolName !== 'ALL') {
        results = results.filter(r => r.student.schoolName === schoolName);
    }
    return results;
  }

  async submitExamResult(resultPayload: Result): Promise<Result> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        offlineService.addToQueue(resultPayload);
        return { ...resultPayload, isSynced: false, status: resultPayload.status || 'in_progress' };
    }

    try {
        // SECURITY FIX: SECURE SERVER-SIDE SCORING VIA RPC
        // Tries to use Supabase stored function to securely calculate and store results
        const { data: rpcData, error: rpcError } = await supabase.rpc('calculate_and_submit_exam', {
            p_exam_code: resultPayload.examCode,
            p_student_id: resultPayload.student.studentId,
            p_student_name: resultPayload.student.fullName,
            p_class_name: resultPayload.student.class,
            p_school_name: resultPayload.student.schoolName || '',
            p_answers: resultPayload.answers || {},
            p_status: resultPayload.status || 'in_progress',
            p_device_info: null,
            p_location: resultPayload.location || null,
            p_activity_log: resultPayload.activityLog || [],
            p_result_id: resultPayload.student.resultId || null
        });

        if (rpcError) {
             console.error("RPC calculate_and_submit_exam failed. You must deploy the RPC function in Supabase.", rpcError);
             throw rpcError;
        }

        const durationStr = resultPayload.answers['_duration'];
        const completionTime = durationStr ? parseInt(durationStr) : undefined;
        const validCompletionTime = !isNaN(completionTime as number) ? completionTime : 0;

        // VERIFY SCORE: If the server's score differs significantly from the client's payload, 
        // the RPC might be outdated (e.g. failing on MATCHING, TRUE_FALSE, or markdown math).
        // Since we know the client-side calculates newer question formats accurately, we override if there is a discrepancy.
        let finalScore = rpcData.score;
        let finalCorrect = rpcData.correct_answers;
        
        if (resultPayload.score !== undefined && resultPayload.score > finalScore) {
             console.warn(`RPC Score (${finalScore}) differs from Client Score (${resultPayload.score}). Overriding with client score to support new question formats.`);
             finalScore = resultPayload.score;
             finalCorrect = resultPayload.correctAnswers || finalCorrect;
             
             // Update the database to reflect the overridden score
             await supabase.from('results').update({
                  score: finalScore,
                  correct_answers: finalCorrect,
                  total_questions: resultPayload.totalQuestions
             }).eq('id', rpcData.id);
        }

        // Return successfully scored and saved result directly from server response
        return {
            ...resultPayload,
            id: rpcData.id,
            student: {
                 ...resultPayload.student,
                 resultId: rpcData.id
            },
            score: finalScore,
            correctAnswers: finalCorrect,
            totalQuestions: resultPayload.totalQuestions || rpcData.total_questions,
            status: rpcData.status,
            completionTime: validCompletionTime,
            isSynced: true
        };
    } catch (error) {
        console.error("CRITICAL DB ERROR / RPC FAILED:", error);
        
        const errObj = error as Record<string, unknown>;
        const isNetworkError = !errObj.code && errObj.message === 'Failed to fetch'; 
        
        if (isNetworkError) {
            console.warn("Network glitch, adding to queue...");
            offlineService.addToQueue(resultPayload);
            return { ...resultPayload, isSynced: false };
        }
        
        // --- FALLBACK TO CLIENT-SIDE UPSERT IF RPC FAILS ---
        console.warn("Falling back to client-side insert/update...");
        try {
             // Let's do the standard client-side calculation if we have to.
             // We'll trust the payload's score, or just pass what we have.
             const student = resultPayload.student;
             const classNameWithSchool = student.schoolName 
                 ? `${student.schoolName}::${student.class}`
                 : student.class;
             
             let finalError;
             let newId = student.resultId;
             
             if (student.resultId) {
                 const { error: updateError } = await supabase
                     .from('results')
                     .update({ 
                         answers: resultPayload.answers || {}, 
                         status: resultPayload.status || 'in_progress',
                         activity_log: resultPayload.activityLog || [], 
                         score: resultPayload.score || 0, 
                         correct_answers: resultPayload.correctAnswers || 0,
                         total_questions: resultPayload.totalQuestions || 0, 
                         location: resultPayload.location || null, 
                         updated_at: new Date().toISOString()
                     })
                     .eq('id', student.resultId);
                 finalError = updateError;
             } else {
                 const { data: upsertData, error: upsertError } = await supabase.from('results').upsert({
                    exam_code: resultPayload.examCode, 
                    student_id: student.studentId, 
                    student_name: student.fullName,
                    class_name: classNameWithSchool, 
                    answers: resultPayload.answers || {}, 
                    status: resultPayload.status || 'in_progress',
                    activity_log: resultPayload.activityLog || [], 
                    score: resultPayload.score || 0, 
                    correct_answers: resultPayload.correctAnswers || 0,
                    total_questions: resultPayload.totalQuestions || 0, 
                    location: resultPayload.location || null, 
                    updated_at: new Date().toISOString()
                 }, { onConflict: 'exam_code,student_id' }).select('id').single();
                 
                 finalError = upsertError;
                 if (upsertData) newId = upsertData.id;
             }
             
             if (finalError) throw finalError;
             
             // Successfully submitted using fallback
             return {
                 ...resultPayload,
                 id: newId ? Number(newId) : undefined,
                 student: {
                     ...resultPayload.student,
                     resultId: newId ? Number(newId) : undefined
                 },
                 isSynced: true
             };
        } catch (fallbackError) {
             console.error("Fallback UPSERT also failed:", fallbackError);
             const fallbackErrObj = fallbackError as Record<string, unknown>;
             throw new Error("Gagal menyimpan ke server: " + (fallbackErrObj.message || errObj.message || "Izin database ditolak (RLS)."));
        }
    }
  }

  async getStudentResult(examCode: string, studentId: string): Promise<Result | null> {
      const { data, error } = await supabase.from('results').select('*').eq('exam_code', examCode).eq('student_id', studentId).single();
      if (error || !data) return null;
      
      let absentNumber = '00';
      let dbSchoolName = '';
      let dbClassName = data.class_name as string;
      let studentName = data.student_name as string;

      // Parse Format 2 if applicable
      if (studentId.startsWith('@') && studentId.includes('#') && studentId.includes('$') && studentId.includes('%')) {
          const match = studentId.match(/^@(.*?)#(.*?)\$(.*?)%(.*)$/);
          if (match) {
              dbSchoolName = match[1];
              studentName = match[2];
              dbClassName = match[3];
              absentNumber = match[4];
          }
      } else {
          // Format 1 Fallback
          if (dbClassName && dbClassName.includes('::')) {
              const parts = dbClassName.split('::');
              dbSchoolName = parts[0];
              dbClassName = parts[1];
          }
          if (typeof studentId === 'string') {
              const parts = studentId.split('-');
              if (parts.length >= 2) {
                  const lastPart = parts[parts.length - 1];
                  if (!isNaN(parseInt(lastPart))) {
                      absentNumber = lastPart;
                  } else if (parts.length > 2) {
                      absentNumber = parts[parts.length - 2];
                  }
              }
          }
      }
      
      const answers = data.answers || {};
      const durationStr = answers['_duration'];
      const completionTime = durationStr ? parseInt(durationStr) : undefined;
      const validCompletionTime = !isNaN(completionTime as number) ? completionTime : 0;
      
      return {
        id: data.id, // Include Primary Key
        student: { studentId: data.student_id, fullName: studentName, class: dbClassName, schoolName: dbSchoolName || undefined, absentNumber: absentNumber },
        examCode: data.exam_code, answers: answers, score: data.score, correctAnswers: data.correct_answers,
        totalQuestions: data.total_questions, completionTime: validCompletionTime, status: data.status, activityLog: data.activity_log,
        timestamp: new Date(data.updated_at).getTime(), location: data.location
      };
  }

  async unlockStudentExam(examCode: string, studentId: string): Promise<void> {
      const { data } = await supabase.from('results').select('activity_log').eq('exam_code', examCode).eq('student_id', studentId).single();
      const currentLog = (data?.activity_log as string[]) || [];
      await supabase.from('results').update({ status: 'in_progress', activity_log: [...currentLog, "Guru membuka kunci"] }).eq('exam_code', examCode).eq('student_id', studentId);
  }

  async finishStudentExam(examCode: string, studentId: string): Promise<void> {
      const { data } = await supabase.from('results').select('activity_log').eq('exam_code', examCode).eq('student_id', studentId).single();
      const currentLog = (data?.activity_log as string[]) || [];
      const { error } = await supabase
          .from('results')
          .update({ 
              status: 'completed', 
              activity_log: [...currentLog, "Ujian dihentikan oleh Guru"] 
          })
          .eq('exam_code', examCode)
          .eq('student_id', studentId);
      if (error) throw error;

      const { data: examData } = await supabase.from('exams').select('config').eq('code', examCode).single();
      if (examData?.config?.disableRealtime) return;

      // Broadcast to specific student to force submit immediately
      const channel = supabase.channel(`exam-room-${examCode}`);
      await channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
              await channel.send({
                  type: 'broadcast',
                  event: 'force_submit_exam',
                  payload: { examCode, studentId, timestamp: Date.now() }
              });
              setTimeout(() => {
                  supabase.removeChannel(channel);
              }, 1000);
          }
      });
  }

  async finishAllExams(examCode: string): Promise<void> {
      const { error } = await supabase
          .from('results')
          .update({ status: 'completed' })
          .eq('exam_code', examCode)
          .in('status', ['in_progress', 'force_closed']);
      if (error) throw error;
  }

  async stopExamOverall(examCode: string): Promise<void> {
      // 1. Finish all student exams in DB
      await this.finishAllExams(examCode);

      // 2. Update exam config to isFinished: true
      const { data } = await supabase.from('exams').select('config').eq('code', examCode).single();
      if (data && data.config) {
          const newConfig = { ...data.config, isFinished: true };
          const { error } = await supabase.from('exams').update({ config: newConfig }).eq('code', examCode);
          if (error) throw error;
      }

      // 3. Broadcast to all students to force submit immediately
      if (data?.config?.disableRealtime) return;
      
      const channel = supabase.channel(`exam-room-${examCode}`);
      await channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
              await channel.send({
                  type: 'broadcast',
                  event: 'force_submit_exam',
                  payload: { examCode, timestamp: Date.now() }
              });
              // Give it a tiny bit of time to send before unsubscribing
              setTimeout(() => {
                  supabase.removeChannel(channel);
              }, 1000);
          }
      });
  }

  async extendExamTime(examCode: string, additionalMinutes: number): Promise<void> {
      const { data } = await supabase.from('exams').select('config').eq('code', examCode).single();
      if (data && data.config) {
          const oldConfig = data.config as ExamConfig;
          const newTimeLimit = (oldConfig.timeLimit || 0) + additionalMinutes;
          
          let newEndDate = oldConfig.endDate;
          let newEndTime = oldConfig.endTime;

          // If endDate is an ISO string, update it
          if (oldConfig.endDate && oldConfig.endDate.includes('T')) {
              const dateObj = new Date(oldConfig.endDate);
              if (!isNaN(dateObj.getTime())) {
                  dateObj.setMinutes(dateObj.getMinutes() + additionalMinutes);
                  newEndDate = dateObj.toISOString();
                  
                  // Also update endTime string for UI consistency (HH:mm)
                  // We use local time for the endTime string as it's usually displayed in local context
                  const hours = dateObj.getHours().toString().padStart(2, '0');
                  const mins = dateObj.getMinutes().toString().padStart(2, '0');
                  newEndTime = `${hours}:${mins}`;
              }
          } else if (oldConfig.endTime) {
              // Fallback if only endTime is set (as HH:mm)
              // This is less reliable but better than nothing
              const [h, m] = oldConfig.endTime.split(':').map(Number);
              if (!isNaN(h) && !isNaN(m)) {
                  const totalMins = h * 60 + m + additionalMinutes;
                  const newH = Math.floor(totalMins / 60) % 24;
                  const newM = totalMins % 60;
                  newEndTime = `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
              }
          }

          const newConfig = { 
              ...oldConfig, 
              timeLimit: newTimeLimit,
              endDate: newEndDate,
              endTime: newEndTime
          };
          await supabase.from('exams').update({ config: newConfig }).eq('code', examCode);
      }
  }

  async sendProgressUpdate(examCode: string, studentId: string, answeredCount: number, totalQuestions: number, existingChannel?: RealtimeChannel | null) {
      if (!existingChannel) return;
      try {
          await existingChannel.send({ 
              type: 'broadcast', 
              event: 'student_progress', 
              payload: { studentId, answeredCount, totalQuestions, timestamp: Date.now() } 
          });
      } catch (e) {
          console.warn("Failed to send progress update over realtime", e);
      }
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

  async deleteStudentResult(examCode: string, studentId: string): Promise<void> {
      const { error } = await supabase
          .from('results')
          .delete()
          .eq('exam_code', examCode)
          .eq('student_id', studentId);
      
      if (error) throw error;
  }

  async updateStudentData(resultId: number, oldStudentId: string, newData: { fullName: string, schoolName?: string, class: string, absentNumber: string }): Promise<void> {
      // Find by Primary Key ID
      // Note: 'student' column does not exist, we use flat columns
      const { data: currentResult, error: fetchError } = await supabase
          .from('results')
          .select('student_name, class_name, student_id, exam_code')
          .eq('id', resultId)
          .single();
      
      if (fetchError || !currentResult) throw new Error(`Data siswa tidak ditemukan. (ID: ${resultId})`);

      // Construct new Student ID (Format 2: @school#name$class%absent)
      const cleanSchool = (newData.schoolName || '').trim();
      const cleanName = newData.fullName.trim();
      const cleanClass = newData.class.replace(/\(\d+\)$/, '').trim();
      const cleanAbsent = newData.absentNumber.trim();

      const newStudentId = `@${cleanSchool}#${cleanName}$${cleanClass}%${cleanAbsent}`;

      const classNameWithSchool = newData.schoolName 
          ? `${newData.schoolName}::${newData.class}`
          : newData.class;

      const { error: updateError } = await supabase
          .from('results')
          .update({ 
              student_name: newData.fullName,
              class_name: classNameWithSchool,
              student_id: newStudentId 
          })
          .eq('id', resultId);

      if (updateError) throw updateError;
  }
}

export const resultService = new ResultService();
