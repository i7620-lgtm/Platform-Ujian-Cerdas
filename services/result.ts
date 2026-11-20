import { supabase } from '../lib/supabase';
import { offlineService } from './offline';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Result, ResultStatus, Exam, ExamConfig } from '../types';
import { examService } from './exam';
import { isSameStudentIdentity, type StudentIdentityCandidate } from '../utils/studentIdentity';

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

        return { ok: false };
    } catch {
        return { ok: false };
    }
  }

  private sanitizeClientAnswers(
      clientAnswers?: Record<string, string>,
      existingAnswers?: Record<string, string>
  ): Record<string, string> {
      const clean: Record<string, string> = {};
      if (clientAnswers) {
          for (const [k, v] of Object.entries(clientAnswers)) {
              if (!k.startsWith('_grade_')) {
                  clean[k] = v;
              }
          }
      }
      if (existingAnswers) {
          for (const [k, v] of Object.entries(existingAnswers)) {
              if (k.startsWith('_grade_')) {
                  clean[k] = v;
              }
          }
      }
      return clean;
  }

  private async persistRawAnswersBackup(resultPayload: Result): Promise<{ ok: boolean; id?: number }> {
      try {
          const student = resultPayload.student;
          const rawResultId = student.resultId ?? resultPayload.id;
          let targetId =
              typeof rawResultId === 'number' && !isNaN(rawResultId) && rawResultId < 1e12
                  ? rawResultId
                  : undefined;

          let existingAnswers: Record<string, string> = {};
          let existingStatus: string | undefined;

          if (targetId) {
              const { data: existingRow } = await supabase
                  .from('results')
                  .select('id, answers, status')
                  .eq('id', targetId)
                  .maybeSingle();
              if (existingRow) {
                  existingAnswers = (existingRow.answers as Record<string, string>) || {};
                  existingStatus = existingRow.status as string | undefined;
              }
          } else {
              const { data: existingRow } = await supabase
                  .from('results')
                  .select('id, answers, status')
                  .eq('exam_code', resultPayload.examCode)
                  .eq('student_id', student.studentId)
                  .maybeSingle();
              if (existingRow) {
                  targetId = Number(existingRow.id);
                  existingAnswers = (existingRow.answers as Record<string, string>) || {};
                  existingStatus = existingRow.status as string | undefined;
              }
          }

          if ((existingStatus === 'completed' || existingStatus === 'force_closed') && resultPayload.status === 'in_progress') {
              return { ok: true, id: targetId };
          }

          const mergedAnswers = this.sanitizeClientAnswers(resultPayload.answers, existingAnswers);
          const deviceId = resultPayload.device_id || mergedAnswers['_deviceId'] || null;

          if (targetId) {
              // Persist raw answers and session state ONLY; never write score/correct_answers/total_questions from client
              const { error: updateErr } = await supabase
                  .from('results')
                  .update({
                      answers: mergedAnswers,
                      status: resultPayload.status || 'in_progress',
                      activity_log: resultPayload.activityLog || [],
                      location: resultPayload.location || null,
                      ...(deviceId ? { device_id: deviceId } : {}),
                      updated_at: new Date().toISOString(),
                  })
                  .eq('id', targetId);
              return { ok: !updateErr, id: targetId };
          }

          const classNameWithSchool = student.schoolName
              ? `${student.schoolName}::${student.class}`
              : student.class;

          const { data: upsertData, error: upsertErr } = await supabase
              .from('results')
              .upsert({
                  exam_code: resultPayload.examCode,
                  student_id: student.studentId,
                  student_name: student.fullName,
                  class_name: classNameWithSchool,
                  answers: mergedAnswers,
                  status: resultPayload.status || 'in_progress',
                  activity_log: resultPayload.activityLog || [],
                  score: 0,
                  correct_answers: 0,
                  total_questions: 0,
                  location: resultPayload.location || null,
                  ...(deviceId ? { device_id: deviceId } : {}),
                  updated_at: new Date().toISOString(),
              }, { onConflict: 'exam_code,student_id' })
              .select('id')
              .maybeSingle();

          return {
              ok: !upsertErr,
              id: upsertData?.id ? Number(upsertData.id) : targetId,
          };
      } catch {
          return { ok: false };
      }
  }

  async submitExamResult(resultPayload: Result): Promise<Result> {
    const durationStr = resultPayload.answers?.['_duration'];
    const parsedCompletion = durationStr ? parseInt(durationStr, 10) : undefined;
    const validCompletionTime = !isNaN(parsedCompletion as number) ? parsedCompletion : 0;

    // Never trust client-provided score or correctAnswers
    const sanitizedBase: Result = {
        ...resultPayload,
        answers: this.sanitizeClientAnswers(resultPayload.answers),
        score: 0,
        correctAnswers: 0,
        totalQuestions: resultPayload.totalQuestions || 0,
        completionTime: validCompletionTime,
    };

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        await offlineService.addToQueue(sanitizedBase, { skipImmediateProcess: true });
        return { ...sanitizedBase, isSynced: false, status: sanitizedBase.status || 'in_progress' };
    }

    // 1. Primary & sole grading authority: Server RPC calculate_and_submit_exam
    try {
        const rawResultId = sanitizedBase.student.resultId ?? sanitizedBase.id;
        const numericResultId =
            typeof rawResultId === 'number' && !isNaN(rawResultId) && rawResultId < 1e12
                ? rawResultId
                : (typeof rawResultId === 'string' && /^\d+$/.test(rawResultId) && Number(rawResultId) < 1e12
                    ? Number(rawResultId)
                    : null);
        const deviceId = sanitizedBase.device_id || sanitizedBase.answers?.['_deviceId'] || null;

        const { data: rpcData, error: rpcError } = await supabase.rpc('calculate_and_submit_exam', {
            p_exam_code: sanitizedBase.examCode,
            p_student_id: sanitizedBase.student.studentId,
            p_student_name: sanitizedBase.student.fullName,
            p_class_name: sanitizedBase.student.class,
            p_school_name: sanitizedBase.student.schoolName || '',
            p_answers: sanitizedBase.answers || {},
            p_status: sanitizedBase.status || 'in_progress',
            p_device_info: null,
            p_location: sanitizedBase.location || null,
            p_activity_log: sanitizedBase.activityLog || [],
            p_result_id: numericResultId,
            p_device_id: deviceId
        });

        if (!rpcError && rpcData) {
            return {
                ...sanitizedBase,
                id: rpcData.id,
                student: {
                    ...sanitizedBase.student,
                    resultId: rpcData.id
                },
                score: rpcData.score,
                correctAnswers: rpcData.correct_answers,
                wrongAnswers: rpcData.wrong_answers,
                unansweredQuestions: rpcData.unanswered_questions,
                totalQuestions: rpcData.total_questions || sanitizedBase.totalQuestions,
                maxScore: rpcData.max_score,
                minScore: rpcData.min_score,
                isOlympiadMode: rpcData.is_olympiad,
                status: rpcData.status,
                device_id: deviceId || undefined,
                completionTime: validCompletionTime,
                isSynced: true
            };
        }

        console.warn("RPC calculate_and_submit_exam unavailable/failed, saving raw answers & queuing for server grading:", rpcError?.message);
    } catch (rpcEx) {
        console.warn("RPC calculate_and_submit_exam exception, saving raw answers & queuing:", rpcEx);
    }

    // 2. Resilient raw-answer-only backup + auto-retry queue (ZERO client score calculation/writes)
    const backup = await this.persistRawAnswersBackup(sanitizedBase);
    const resolvedId = backup.id ?? sanitizedBase.student.resultId ?? sanitizedBase.id;
    const resultWithId: Result = {
        ...sanitizedBase,
        id: resolvedId ? Number(resolvedId) : undefined,
        student: {
            ...sanitizedBase.student,
            resultId: resolvedId ? Number(resolvedId) : undefined
        },
        score: 0,
        correctAnswers: 0,
        isSynced: false
    };

    const isFinalSubmission = sanitizedBase.status === 'completed' || sanitizedBase.status === 'force_closed';
    if (isFinalSubmission || !backup.ok) {
        await offlineService.addToQueue(resultWithId, { skipImmediateProcess: true });
        return { ...resultWithId, isSynced: false };
    }

    return { ...resultWithId, isSynced: true };
  }

  async getStudentResult(examCode: string, studentId: string, studentHint?: StudentIdentityCandidate): Promise<Result | null> {
      const { result } = await this.getStudentResultStatus(examCode, studentId, studentHint);
      return result;
  }

  async getStudentResultStatus(
      examCode: string,
      studentId: string,
      studentHint?: StudentIdentityCandidate,
  ): Promise<{ result: Result | null; isNetworkError: boolean }> {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          return { result: null, isNetworkError: true };
      }
      const cleanExamCode = String(examCode || '').trim().toUpperCase();
      const SELECT_COLS = 'id, exam_code, student_id, student_name, class_name, status, score, correct_answers, total_questions, answers, activity_log, updated_at, location, device_id';
      try {
          const { data, error } = await supabase
              .from('results')
              .select(SELECT_COLS)
              .eq('exam_code', cleanExamCode)
              .eq('student_id', studentId)
              .maybeSingle();

          if (error) {
              const msg = String(error.message || '').toLowerCase();
              const isNet = !error.code || msg.includes('failed to fetch') || msg.includes('network');
              return { result: null, isNetworkError: isNet };
          }

          if (data) {
              const mapped = this.mapRowToResult(data as Record<string, unknown>);
              return {
                  result: {
                      ...mapped,
                      student: {
                          ...mapped.student,
                          schoolName: mapped.student.schoolName || undefined,
                      },
                  },
                  isNetworkError: false,
              };
          }

          // Fallback: Tolerant identity matching across browsers (e.g. "05" vs "5", whitespace, letter case)
          if (studentHint && (studentHint.fullName || studentHint.absentNumber)) {
              const hintCandidate: StudentIdentityCandidate = {
                  studentId,
                  ...studentHint,
              };
              const PAGE_SIZE = 1000;
              let from = 0;
              const matches: Result[] = [];

              while (from < 3000) {
                  const { data: rows, error: listErr } = await supabase
                      .from('results')
                      .select(SELECT_COLS)
                      .eq('exam_code', cleanExamCode)
                      .order('updated_at', { ascending: false })
                      .range(from, from + PAGE_SIZE - 1);

                  if (listErr) {
                      const msg = String(listErr.message || '').toLowerCase();
                      const isNet = !listErr.code || msg.includes('failed to fetch') || msg.includes('network');
                      return { result: null, isNetworkError: isNet };
                  }
                  if (!rows || rows.length === 0) break;

                  for (const row of rows as Record<string, unknown>[]) {
                      const mapped = this.mapRowToResult(row);
                      if (isSameStudentIdentity(mapped.student, hintCandidate)) {
                          matches.push({
                              ...mapped,
                              student: {
                                  ...mapped.student,
                                  schoolName: mapped.student.schoolName || undefined,
                              },
                          });
                      }
                  }

                  if (rows.length < PAGE_SIZE) break;
                  from += PAGE_SIZE;
              }

              if (matches.length > 0) {
                  const completedMatch = matches.find((m) => m.status === 'completed');
                  const forceClosedMatch = matches.find((m) => m.status === 'force_closed');
                  return {
                      result: completedMatch || forceClosedMatch || matches[0],
                      isNetworkError: false,
                  };
              }
          }

          return { result: null, isNetworkError: false };
      } catch {
          return { result: null, isNetworkError: true };
      }
  }

  async unlockStudentExam(examCode: string, studentId: string, proctorToken?: string): Promise<void> {
      const { error } = await supabase.rpc('teacher_manage_student_session', {
          p_exam_code: examCode,
          p_student_id: studentId,
          p_action: 'unlock',
          p_proctor_token: proctorToken || null
      });
      if (error) throw new Error(error.message || 'Gagal membuka kunci sesi siswa.');
  }

  async finishStudentExam(examCode: string, studentId: string, proctorToken?: string): Promise<void> {
      const { error } = await supabase.rpc('teacher_manage_student_session', {
          p_exam_code: examCode,
          p_student_id: studentId,
          p_action: 'finish',
          p_proctor_token: proctorToken || null
      });
      if (error) throw new Error(error.message || 'Gagal menghentikan ujian siswa.');

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

  async generateUnlockToken(examCode: string, studentId: string, proctorToken?: string): Promise<string> {
      const { data, error } = await supabase.rpc('generate_unlock_token', {
          p_exam_code: examCode,
          p_student_id: studentId,
          p_proctor_token: proctorToken || null
      });
      if (error || !data) {
          throw new Error(error?.message || 'Gagal membuat token akses.');
      }
      return String(data);
  }

  async verifyUnlockToken(examCode: string, studentId: string, token: string, newDeviceId?: string): Promise<boolean> {
      try {
          const cleanToken = String(token || '').trim();
          if (!/^\d{4}$/.test(cleanToken)) return false;

          const { data, error } = await supabase.rpc('verify_unlock_token', {
              p_exam_code: examCode,
              p_student_id: studentId,
              p_token: cleanToken,
              p_new_device_id: newDeviceId || null
          });

          if (error || !data) return false;
          return Boolean((data as { success?: boolean }).success);
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
