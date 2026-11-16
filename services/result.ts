import { supabase } from '../lib/supabase';
import { offlineService } from './offline';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Result, ResultStatus, Exam, ExamConfig } from '../types';
import { examService } from './exam';

export class ResultService {
  private static rpcDisabled = false; // Zero-Trust server RPC primary with graceful DB fallback
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
                const parts = studentIdStr.includes('_') ? studentIdStr.split('_') : studentIdStr.split('-');
                if (parts.length >= 2) {
                    const lastPart = parts[parts.length - 1];
                    if (!isNaN(parseInt(lastPart))) {
                        absentNumber = lastPart;
                    } else if (parts.length > 2) {
                        absentNumber = parts[parts.length - 2];
                    }
                }
            }
            dbSchoolName = student?.schoolName || (row.school_name as string) || '';
            if (dbClassName && dbClassName.includes('::')) {
                const parts = dbClassName.split('::');
                dbSchoolName = parts[0];
                dbClassName = parts[1];
            }
        }

        // Clean dbClassName if it contains embedded School or limit, e.g. "SD NEGERI 2 PADANGSAMBIAN-6A(33)"
        if (dbClassName) {
            let clean = dbClassName.trim().replace(/\(\d+\)$/, '').trim();
            if (clean.includes('-')) {
                const parts = clean.split('-');
                if (!dbSchoolName && parts.length > 1) {
                    dbSchoolName = parts.slice(0, parts.length - 1).join('-').trim();
                }
                clean = parts[parts.length - 1].trim();
            }
            dbClassName = clean;
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
            location: row.location as { lat: number; lng: number } | undefined,
            device_id: (row.device_id as string | undefined) || answers['_deviceId'] || undefined
        };
  }

  async getResults(examCodeOrCodes?: string | string[], className?: string, schoolName?: string): Promise<Result[]> {
    const PAGE_SIZE = 1000;
    const CODE_BATCH_SIZE = 100;
    const SELECT_COLUMNS = 'id, exam_code, student_id, student_name, class_name, status, score, correct_answers, total_questions, answers, updated_at, location';

    let batches: (string | string[] | undefined)[];
    if (Array.isArray(examCodeOrCodes)) {
        const cleanCodes = Array.from(new Set(examCodeOrCodes.map(c => String(c || '').trim()).filter(Boolean)));
        if (cleanCodes.length === 0) return [];
        batches = [];
        for (let i = 0; i < cleanCodes.length; i += CODE_BATCH_SIZE) {
            batches.push(cleanCodes.slice(i, i + CODE_BATCH_SIZE));
        }
    } else {
        batches = [examCodeOrCodes];
    }

    const allRows: Record<string, unknown>[] = [];

    for (const batchFilter of batches) {
        let from = 0;
        while (true) {
            let query = supabase
                .from('results')
                .select(SELECT_COLUMNS)
                .order('updated_at', { ascending: false })
                .range(from, from + PAGE_SIZE - 1);

            if (Array.isArray(batchFilter)) {
                query = query.in('exam_code', batchFilter);
            } else if (batchFilter) {
                query = query.eq('exam_code', batchFilter);
            }

            const { data, error } = await query;
            if (error || !data || data.length === 0) break;

            allRows.push(...(data as Record<string, unknown>[]));
            if (data.length < PAGE_SIZE) break;
            from += PAGE_SIZE;
        }
    }

    let results = allRows.map((row) => this.mapRowToResult(row));

    if (className && className !== 'ALL') {
        results = results.filter(r => r.student.class === className);
    }
    if (schoolName && schoolName !== 'ALL') {
        results = results.filter(r => r.student.schoolName === schoolName);
    }
    return results;
  }

  /**
   * Lightweight non-realtime answers-only auto-save.
   * Sends ONLY { answers, updated_at } over REST, guards with status = 'in_progress',
   * and verifies via .select('id') that a database row was actually updated.
   */
  async autoSaveStudentAnswers(params: {
    resultId?: number;
    examCode: string;
    studentId: string;
    studentName?: string;
    className?: string;
    schoolName?: string;
    answers: Record<string, string>;
  }): Promise<{ ok: boolean; resultId?: number; lockedStatus?: ResultStatus }> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return { ok: false };
    }
    try {
        const validResultId =
            typeof params.resultId === 'number' &&
            params.resultId > 0 &&
            params.resultId < 1e12
                ? params.resultId
                : undefined;

        let query = supabase
            .from('results')
            .update({
                answers: params.answers,
                updated_at: new Date().toISOString()
            });

        if (validResultId) {
            query = query.eq('id', validResultId);
        } else {
            query = query.eq('exam_code', params.examCode).eq('student_id', params.studentId);
        }

        const { data: updatedRow, error } = await query
            .eq('status', 'in_progress')
            .select('id')
            .maybeSingle();

        if (!error && updatedRow?.id) {
            return { ok: true, resultId: Number(updatedRow.id) };
        }

        if (error) {
            return { ok: false };
        }

        // 0 rows matched: check whether row is locked/completed or never initialized (e.g., offline start)
        const { data: existing, error: checkErr } = await supabase
            .from('results')
            .select('id, status')
            .eq('exam_code', params.examCode)
            .eq('student_id', params.studentId)
            .maybeSingle();

        if (checkErr) {
            return { ok: false };
        }

        if (existing) {
            if (existing.status === 'completed' || existing.status === 'force_closed') {
                return { ok: false, lockedStatus: existing.status as ResultStatus };
            }
            if (existing.status === 'in_progress' && existing.id) {
                const { data: retried, error: retryErr } = await supabase
                    .from('results')
                    .update({
                        answers: params.answers,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id)
                    .eq('status', 'in_progress')
                    .select('id')
                    .maybeSingle();
                if (!retryErr && retried?.id) {
                    return { ok: true, resultId: Number(retried.id) };
                }
            }
            return { ok: false };
        }

        // Row does not exist yet on server (student likely started offline): initialize via Zero-Trust RPC
        if (!ResultService.rpcDisabled) {
            const deviceId = params.answers?.['_deviceId'] || null;
            const { data: rpcData, error: rpcErr } = await supabase.rpc('calculate_and_submit_exam', {
                p_exam_code: params.examCode,
                p_student_id: params.studentId,
                p_student_name: params.studentName || 'Peserta Ujian',
                p_class_name: params.className || '-',
                p_school_name: params.schoolName || '',
                p_answers: params.answers,
                p_status: 'in_progress',
                p_device_info: null,
                p_location: null,
                p_activity_log: [],
                p_result_id: null,
                p_device_id: deviceId
            });
            if (!rpcErr && rpcData?.id) {
                return { ok: true, resultId: Number(rpcData.id) };
            }
        }

        return { ok: false };
    } catch {
        return { ok: false };
    }
  }

  async submitExamResult(resultPayload: Result): Promise<Result> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        await offlineService.addToQueue(resultPayload);
        return { ...resultPayload, isSynced: false, status: resultPayload.status || 'in_progress' };
    }

    // 1. Try secure Zero-Trust RPC calculation if enabled and supported
    if (!ResultService.rpcDisabled) {
        try {
            const rawResultId = resultPayload.student.resultId ?? resultPayload.id;
            const numericResultId =
                typeof rawResultId === 'number' && !isNaN(rawResultId) && rawResultId < 1e12
                    ? rawResultId
                    : (typeof rawResultId === 'string' && /^\d+$/.test(rawResultId) && Number(rawResultId) < 1e12
                        ? Number(rawResultId)
                        : null);
            const deviceId = resultPayload.device_id || resultPayload.answers?.['_deviceId'] || null;

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
                p_result_id: numericResultId,
                p_device_id: deviceId
            });

            if (rpcError) {
                const errCode = String(rpcError.code || '');
                const errMsg = String(rpcError.message || '');
                if (errCode === 'PGRST202' || errCode === '42883') {
                    // RPC function truly absent/signature mismatched: fall back for this session
                    ResultService.rpcDisabled = true;
                    console.info("RPC calculate_and_submit_exam unavailable in Supabase. Falling back to direct persistence.");
                } else if (!errCode || errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError')) {
                    await offlineService.addToQueue(resultPayload);
                    return { ...resultPayload, isSynced: false };
                } else {
                    throw rpcError;
                }
            } else if (rpcData) {
                const durationStr = resultPayload.answers?.['_duration'];
                const completionTime = durationStr ? parseInt(durationStr) : undefined;
                const validCompletionTime = !isNaN(completionTime as number) ? completionTime : 0;

                return {
                    ...resultPayload,
                    id: rpcData.id,
                    student: {
                        ...resultPayload.student,
                        resultId: rpcData.id
                    },
                    score: rpcData.score,
                    correctAnswers: rpcData.correct_answers,
                    wrongAnswers: rpcData.wrong_answers,
                    unansweredQuestions: rpcData.unanswered_questions,
                    totalQuestions: rpcData.total_questions || resultPayload.totalQuestions,
                    maxScore: rpcData.max_score,
                    minScore: rpcData.min_score,
                    isOlympiadMode: rpcData.is_olympiad,
                    status: rpcData.status,
                    device_id: deviceId || undefined,
                    completionTime: validCompletionTime,
                    isSynced: true
                };
            }
        } catch (rpcEx) {
            const errObj = rpcEx as Record<string, unknown>;
            const errCode = String(errObj?.code || '');
            const errMsg = String(errObj?.message || '');
            if (errCode === 'PGRST202' || errCode === '42883') {
                ResultService.rpcDisabled = true;
            } else if (!errCode || errMsg === 'Failed to fetch' || errMsg.includes('NetworkError')) {
                await offlineService.addToQueue(resultPayload);
                return { ...resultPayload, isSynced: false };
            }
        }
    }

    // 2. Direct database persistence fallback ONLY when RPC function is absent (without querying exams.questions on client)
    try {
        const student = resultPayload.student;
        const classNameWithSchool = student.schoolName 
            ? `${student.schoolName}::${student.class}`
            : student.class;

        let finalError;
        let newId = student.resultId;

        const finalScore = typeof resultPayload.score === 'number' && !isNaN(resultPayload.score) ? resultPayload.score : 0;
        const finalCorrect = resultPayload.correctAnswers || 0;
        const finalTotal = resultPayload.totalQuestions || 0;

        if (student.resultId && student.resultId < 1e12) {
            const { error: updateError } = await supabase
                .from('results')
                .update({ 
                    answers: resultPayload.answers || {}, 
                    status: resultPayload.status || 'in_progress',
                    activity_log: resultPayload.activityLog || [], 
                    score: finalScore, 
                    correct_answers: finalCorrect, 
                    total_questions: finalTotal, 
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
                score: finalScore, 
                correct_answers: finalCorrect, 
                total_questions: finalTotal, 
                location: resultPayload.location || null, 
                updated_at: new Date().toISOString()
            }, { onConflict: 'exam_code,student_id' }).select('id').maybeSingle();

            finalError = upsertError;
            if (upsertData) newId = upsertData.id;
        }

        if (finalError) throw finalError;

        const durationStr = resultPayload.answers?.['_duration'];
        const completionTime = durationStr ? parseInt(durationStr) : undefined;
        const validCompletionTime = !isNaN(completionTime as number) ? completionTime : 0;

        return {
            ...resultPayload,
            score: finalScore,
            correctAnswers: finalCorrect,
            totalQuestions: finalTotal,
            id: newId ? Number(newId) : undefined,
            student: {
                ...resultPayload.student,
                resultId: newId ? Number(newId) : undefined
            },
            completionTime: validCompletionTime,
            isSynced: true
        };
    } catch (saveError) {
        console.error("Direct save failed:", saveError);
        const errObj = saveError as Record<string, unknown>;
        if (!errObj.code && errObj.message === 'Failed to fetch') {
            await offlineService.addToQueue(resultPayload);
            return { ...resultPayload, isSynced: false };
        }
        throw new Error("Gagal menyimpan hasil ujian: " + (errObj.message || "Izin database ditolak (RLS)."));
    }
  }

  async getStudentResult(examCode: string, studentId: string): Promise<Result | null> {
      const { result } = await this.getStudentResultStatus(examCode, studentId);
      return result;
  }

  async getStudentResultStatus(examCode: string, studentId: string): Promise<{ result: Result | null; isNetworkError: boolean }> {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          return { result: null, isNetworkError: true };
      }
      try {
          const { data, error } = await supabase
              .from('results')
              .select('*')
              .eq('exam_code', examCode)
              .eq('student_id', studentId)
              .maybeSingle();

          if (error) {
              const msg = String(error.message || '').toLowerCase();
              const isNet = !error.code || msg.includes('failed to fetch') || msg.includes('network');
              return { result: null, isNetworkError: isNet };
          }
          if (!data) {
              return { result: null, isNetworkError: false };
          }

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
                  const parts = studentId.includes('_') ? studentId.split('_') : studentId.split('-');
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
              result: {
                  id: data.id, // Include Primary Key
                  student: { studentId: data.student_id, fullName: studentName, class: dbClassName, schoolName: dbSchoolName || undefined, absentNumber: absentNumber, resultId: data.id },
                  examCode: data.exam_code, answers: answers, score: data.score, correctAnswers: data.correct_answers,
                  totalQuestions: data.total_questions, completionTime: validCompletionTime, status: data.status, activityLog: data.activity_log,
                  timestamp: new Date(data.updated_at).getTime(), location: data.location,
                  device_id: (data.device_id as string | undefined) || answers['_deviceId'] || undefined
              },
              isNetworkError: false
          };
      } catch {
          return { result: null, isNetworkError: true };
      }
  }

  async unlockStudentExam(examCode: string, studentId: string): Promise<void> {
      const { data } = await supabase.from('results').select('activity_log').eq('exam_code', examCode).eq('student_id', studentId).maybeSingle();
      const currentLog = (data?.activity_log as string[]) || [];
      await supabase.from('results').update({ status: 'in_progress', activity_log: [...currentLog, "Guru membuka kunci"] }).eq('exam_code', examCode).eq('student_id', studentId);
  }

  async finishStudentExam(examCode: string, studentId: string): Promise<void> {
      const { data } = await supabase.from('results').select('activity_log').eq('exam_code', examCode).eq('student_id', studentId).maybeSingle();
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

      const { data: examData } = await supabase.from('exams').select('config').eq('code', examCode).maybeSingle();
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
      try {
          const { error } = await supabase
              .from('results')
              .update({ status: 'completed' })
              .eq('exam_code', examCode)
              .in('status', ['in_progress', 'force_closed']);
          if (error) {
              console.warn("finishAllExams update warning:", error);
          }
      } catch (err) {
          console.warn("finishAllExams error caught:", err);
      }
  }

  async stopExamOverall(examCode: string, providedExam?: Exam): Promise<Exam | null> {
      const cleanCode = (examCode || '').trim().toUpperCase();
      const now = new Date();
      const nowIso = now.toISOString();
      const nowTime = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

      // 1. Finish all student exams in Supabase DB (graceful fallback)
      await this.finishAllExams(cleanCode);

      // 2. Update local teacher exams cache immediately to ensure UI never reverts
      let updatedExam: Exam | null = null;
      try {
          const localTeacherExams = await examService.getLocalTeacherExamsAsync();
          const target = providedExam || localTeacherExams[cleanCode];
          if (target) {
              const updatedConfig: ExamConfig = {
                  ...target.config,
                  isFinished: true,
                  endDate: nowIso,
                  endTime: nowTime,
              };
              updatedExam = {
                  ...target,
                  config: updatedConfig,
              };
              examService.saveLocalTeacherExam(updatedExam);
          }
      } catch (cacheErr) {
          console.warn("Local teacher exam cache update error:", cacheErr);
      }

      // 3. Update exam config to isFinished: true and adjusted end date in Supabase DB
      let isRealtimeDisabled = Boolean(updatedExam?.config?.disableRealtime);
      try {
          const selectCols = updatedExam
              ? 'code, author_id, school, config, status'
              : 'code, author_id, school, config, questions, status';
          const { data } = await supabase.from('exams').select(selectCols).eq('code', cleanCode).maybeSingle();
          const rawExamData = data as any;
          if (rawExamData) {
              const existingConfig = (rawExamData.config || {}) as ExamConfig;
              const newConfig: ExamConfig = {
                  ...existingConfig,
                  isFinished: true,
                  endDate: nowIso,
                  endTime: nowTime,
              };
              const existingVersion = typeof (existingConfig as any)?.version === 'number'
                  ? (existingConfig as any).version
                  : 1;
              const newVer = existingVersion + 1;
              (newConfig as any).version = newVer;
              isRealtimeDisabled = Boolean(newConfig.disableRealtime);
              
              await supabase
                  .from('exams')
                  .update({ config: newConfig })
                  .eq('code', cleanCode);

              if (!updatedExam) {
                  updatedExam = {
                      code: rawExamData.code,
                      authorId: rawExamData.author_id,
                      authorSchool: rawExamData.school,
                      config: newConfig,
                      questions: rawExamData.questions || [],
                      status: rawExamData.status,
                      version: newVer
                  };
                  examService.saveLocalTeacherExam(updatedExam);
              } else {
                  updatedExam = {
                      ...updatedExam,
                      config: newConfig,
                      version: newVer
                  };
                  examService.saveLocalTeacherExam(updatedExam);
              }
          }
      } catch (dbErr) {
          console.warn("Supabase update error during stopExamOverall:", dbErr);
      }

      // 4. Safe Realtime Broadcast (only when Realtime is enabled) to notify active students immediately
      if (!isRealtimeDisabled) {
          try {
              const channel = supabase.channel(`exam-room-${cleanCode}`);
              channel.subscribe(async (status) => {
                  if (status === 'SUBSCRIBED') {
                      try {
                          await channel.send({
                              type: 'broadcast',
                              event: 'force_submit_exam',
                              payload: { examCode: cleanCode, timestamp: Date.now() }
                          });
                      } catch { /* ignore */ }
                      setTimeout(() => {
                          try { supabase.removeChannel(channel); } catch { /* ignore */ }
                      }, 1000);
                  }
              });
          } catch (broadcastErr) {
              console.warn("Broadcast warning:", broadcastErr);
          }
      }

      return updatedExam;
  }

  async extendExamTime(examCode: string, additionalMinutes: number): Promise<void> {
      const { data } = await supabase.from('exams').select('config').eq('code', examCode).maybeSingle();
      if (data && data.config) {
          const oldConfig = data.config as ExamConfig;
          const newTimeLimit = (oldConfig.timeLimit || 0) + additionalMinutes;
          const existingVersion = typeof (oldConfig as any).version === 'number' ? (oldConfig as any).version : 1;
          const nextVersion = existingVersion + 1;
          
          let newEndDate = oldConfig.endDate;
          let newEndTime = oldConfig.endTime;

          // If endDate is an ISO string, update it
          if (oldConfig.endDate && oldConfig.endDate.includes('T')) {
              const dateObj = new Date(oldConfig.endDate);
              if (!isNaN(dateObj.getTime())) {
                  dateObj.setMinutes(dateObj.getMinutes() + additionalMinutes);
                  newEndDate = dateObj.toISOString();
                  
                  // Also update endTime string for UI consistency (HH:mm)
                  const hours = dateObj.getHours().toString().padStart(2, '0');
                  const mins = dateObj.getMinutes().toString().padStart(2, '0');
                  newEndTime = `${hours}:${mins}`;
              }
          } else if (oldConfig.endTime) {
              const [h, m] = oldConfig.endTime.split(':').map(Number);
              if (!isNaN(h) && !isNaN(m)) {
                  const totalMins = h * 60 + m + additionalMinutes;
                  const newH = Math.floor(totalMins / 60) % 24;
                  const newM = totalMins % 60;
                  newEndTime = `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
              }
          }

          const newConfig: ExamConfig = { 
              ...oldConfig, 
              timeLimit: newTimeLimit,
              endDate: newEndDate,
              endTime: newEndTime,
              version: nextVersion
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

  async verifyUnlockToken(examCode: string, studentId: string, token: string, newDeviceId?: string): Promise<boolean> {
      try {
          const { data, error } = await supabase
              .from('results')
              .select('unlock_token, activity_log, answers')
              .eq('exam_code', examCode)
              .eq('student_id', studentId)
              .maybeSingle();

          if (error || !data) return false;
          
          if (data.unlock_token && String(data.unlock_token).trim() === token.trim()) {
              const currentLog = (typeof data.activity_log === 'string' ? JSON.parse(data.activity_log) : data.activity_log) || [];
              const existingAnswers = (typeof data.answers === 'object' && data.answers) ? (data.answers as Record<string, string>) : {};
              const updatedAnswers = newDeviceId
                  ? { ...existingAnswers, _deviceId: newDeviceId }
                  : existingAnswers;
              
              const { error: updateError } = await supabase
                  .from('results')
                  .update({ 
                      unlock_token: null, 
                      status: 'in_progress',
                      answers: updatedAnswers,
                      activity_log: [...currentLog, `[${new Date().toLocaleTimeString()}] Akses dibuka siswa dengan token`]
                  })
                  .eq('exam_code', examCode)
                  .eq('student_id', studentId);
              
              if (updateError) throw updateError;

              if (newDeviceId) {
                  await supabase
                      .from('results')
                      .update({ device_id: newDeviceId })
                      .eq('exam_code', examCode)
                      .eq('student_id', studentId)
                      .then(() => {}, () => {});
              }
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
          .maybeSingle();
      
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
