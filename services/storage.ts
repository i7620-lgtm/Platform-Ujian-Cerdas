
import { supabase } from '../lib/supabase';
import type { Exam, Result, Question, TeacherProfile, AccountType, UserProfile, ExamSummary, ExamConfig, ResultStatus } from '../types';
import { compressImage } from '../components/teacher/examUtils';
import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      console.warn("API key is missing. AI features will not work.");
      throw new Error("API key is missing. Please set GEMINI_API_KEY or API_KEY.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

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
const urlToBase64 = async (url: string): Promise<string | null> => {
    try {
        // Attempt 1: Fetch (Works for same-origin or CORS-enabled)
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch {
        // Attempt 2: Image Object with CrossOrigin (Works if server supports it but fetch failed for some reason)
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve(null);
                try {
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                } catch {
                    // Canvas tainted - cannot export
                    console.warn("Canvas tainted, cannot convert to base64:", url);
                    resolve(null);
                }
            };
            img.onerror = () => {
                console.warn("Failed to load image for base64 conversion:", url);
                resolve(null);
            };
            img.src = url;
        });
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

function selectBankSoalQuestions(questions: Question[], config: ExamConfig): Question[] {
    if (!config.useBankSoal || !config.bankSoalCount || config.bankSoalCount >= questions.length) {
        return questions;
    }

    const totalNeeded = config.bankSoalCount;
    const props = config.bankSoalProportions || { mudah: 30, sedang: 50, sulit: 20 };
    
    const getLevelCategory = (level?: string) => {
        if (!level) return 'unassigned';
        const l = level.toLowerCase().trim();
        if (['mudah', 'lots', '1', 'easy', 'rendah'].includes(l)) return 'mudah';
        if (['sedang', 'mots', '2', 'medium', 'menengah'].includes(l)) return 'sedang';
        if (['sulit', 'hots', '3', 'hard', 'tinggi'].includes(l)) return 'sulit';
        return 'unassigned';
    };

    const grouped = {
        mudah: questions.filter(q => getLevelCategory(q.level) === 'mudah'),
        sedang: questions.filter(q => getLevelCategory(q.level) === 'sedang'),
        sulit: questions.filter(q => getLevelCategory(q.level) === 'sulit'),
        unassigned: questions.filter(q => getLevelCategory(q.level) === 'unassigned')
    };

    let targetMudah = Math.round((props.mudah / 100) * totalNeeded);
    let targetSedang = Math.round((props.sedang / 100) * totalNeeded);
    let targetSulit = Math.round((props.sulit / 100) * totalNeeded);

    let currentTotal = targetMudah + targetSedang + targetSulit;
    while (currentTotal < totalNeeded) { targetSedang++; currentTotal++; }
    while (currentTotal > totalNeeded) {
        if (targetSedang > 0) targetSedang--;
        else if (targetMudah > 0) targetMudah--;
        else targetSulit--;
        currentTotal--;
    }

    const shuffledMudah = shuffleArray(grouped.mudah);
    const shuffledSedang = shuffleArray(grouped.sedang);
    const shuffledSulit = shuffleArray(grouped.sulit);
    const shuffledUnassigned = shuffleArray(grouped.unassigned);

    const selected: Question[] = [];

    const take = (arr: Question[], count: number) => {
        const taken = arr.splice(0, count);
        selected.push(...taken);
        return count - taken.length;
    };

    const deficitMudah = take(shuffledMudah, targetMudah);
    const deficitSedang = take(shuffledSedang, targetSedang);
    const deficitSulit = take(shuffledSulit, targetSulit);

    const totalDeficit = deficitMudah + deficitSedang + deficitSulit;
    const remaining = [...shuffledMudah, ...shuffledSedang, ...shuffledSulit, ...shuffledUnassigned];
    
    if (totalDeficit > 0) {
        take(remaining, totalDeficit);
    }

    return selected;
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

const stripAnswersFromQuestion = (q: Question): Question => {
    const sanitizedQ = { ...q } as Question;
    
    // SECURITY FIX: Remove correct answers before sending to client
    delete sanitizedQ.correctAnswer;
    
    if (sanitizedQ.trueFalseRows) {
        sanitizedQ.trueFalseRows = sanitizedQ.trueFalseRows.map(row => {
            const newRow = { ...row };
            delete newRow.answer;
            return newRow;
        });
    }
    
    if (sanitizedQ.matchingPairs) {
        const rightOptions = sanitizedQ.matchingPairs.map(p => p.right);
        const shuffledRight = shuffleArray(rightOptions);
        sanitizedQ.matchingPairs = sanitizedQ.matchingPairs.map((pair, idx) => ({
            left: pair.left,
            right: shuffledRight[idx]
        }));
    }
    
    return sanitizedQ;
};

const sanitizeExamForStudent = (exam: Exam, studentId?: string): Exam => {
    if (!studentId || studentId === 'monitor' || studentId === 'check_schedule') {
        let questionsToProcess = selectBankSoalQuestions([...exam.questions], exam.config);
        if (exam.config.shuffleQuestions) {
            questionsToProcess = shuffleArray(questionsToProcess);
        }
        const sanitizedQuestions = questionsToProcess.map(q => {
            const sanitizedQ = { ...q, options: q.options ? [...q.options] : undefined } as Question;
            // Verified: Shuffling options here is safe because answers are stored/graded by text value, not index.
            if (exam.config.shuffleAnswers) {
                if ((sanitizedQ.questionType === 'MULTIPLE_CHOICE' || sanitizedQ.questionType === 'COMPLEX_MULTIPLE_CHOICE') && sanitizedQ.options) {
                    sanitizedQ.options = shuffleArray(sanitizedQ.options);
                }
            }
            return stripAnswersFromQuestion(sanitizedQ);
        });
        return { ...exam, questions: sanitizedQuestions };
    }

    const STORAGE_KEY_ORDER = `exam_order_${exam.code}_${studentId}`;
    let orderMap: { qOrder: string[]; optOrders: Record<string, string[]> } | null = null;
    
    try {
        const stored = localStorage.getItem(STORAGE_KEY_ORDER);
        if (stored) orderMap = JSON.parse(stored);
    } catch { /* ignore */ }

    if (!orderMap) {
        let questionsToProcess = selectBankSoalQuestions([...exam.questions], exam.config);
        
        // INDEPENDENT LOGIC: Shuffle Questions
        // Only shuffles the order of questions if enabled. Does NOT affect options.
        if (exam.config.shuffleQuestions) {
            questionsToProcess = shuffleArray(questionsToProcess);
        }
        
        const qOrder = questionsToProcess.map(q => q.id);
        const optOrders: Record<string, string[]> = {};

        // INDEPENDENT LOGIC: Shuffle Answers
        // Iterates through questions (whether shuffled or not) and shuffles options if enabled.
        questionsToProcess.forEach(q => {
             // Only shuffle options if explicitly enabled in config
             if (exam.config.shuffleAnswers && q.options && 
                (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'COMPLEX_MULTIPLE_CHOICE')) {
                 const shuffledOpts = shuffleArray([...q.options]);
                 optOrders[q.id] = shuffledOpts;
             }
        });

        orderMap = { qOrder, optOrders };
        try { localStorage.setItem(STORAGE_KEY_ORDER, JSON.stringify(orderMap)); } catch { /* ignore */ }
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
        return stripAnswersFromQuestion(sanitizedQ);
    });

    return { ...exam, questions: finalQuestions };
};

class StorageService {
    private syncQueue: Result[] = [];
    private isProcessingQueue = false;

    private parseList(str: string | undefined | null): string[] {
        if (!str) return [];
        
        const deepParse = (input: string): any => {
            try {
                let fixedInput = input;
                try {
                    JSON.parse(fixedInput);
                } catch (e) {
                    fixedInput = input.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");
                }
                const parsed = JSON.parse(fixedInput);
                if (typeof parsed === 'string') {
                    return deepParse(parsed);
                }
                return parsed;
            } catch {
                let cleaned = input.trim();
                if (cleaned.startsWith('[') && !cleaned.endsWith(']')) cleaned = cleaned.slice(1);
                if (cleaned.endsWith(']') && !cleaned.startsWith('[')) cleaned = cleaned.slice(0, -1);
                if (cleaned.startsWith('"') && cleaned.endsWith('"')) cleaned = cleaned.slice(1, -1);
                cleaned = cleaned.replace(/\\"/g, '"');
                return cleaned;
            }
        };

        try {
            const parsed = deepParse(str);
            if (Array.isArray(parsed)) {
                const flattened: string[] = [];
                const processItem = (item: any) => {
                    if (typeof item === 'string') {
                        if ((item.startsWith('[') && item.endsWith(']')) || (item.startsWith('{') && item.endsWith('}'))) {
                            try {
                                const unescaped = deepParse(item);
                                if (Array.isArray(unescaped)) {
                                    unescaped.forEach(processItem);
                                } else {
                                    flattened.push(String(unescaped));
                                }
                            } catch {
                                flattened.push(String(item));
                            }
                        } else {
                            flattened.push(String(item));
                        }
                    } else if (Array.isArray(item)) {
                        item.forEach(processItem);
                    } else {
                        flattened.push(String(item));
                    }
                };
                parsed.forEach(processItem);
                return flattened;
            }
        } catch { /* ignore */ }
        
        if (str.includes('<') && str.includes('>')) {
            return [str.trim()];
        }
        
        let cleanStr = str.trim();
        if (cleanStr.startsWith('[') && cleanStr.endsWith(']')) {
            cleanStr = cleanStr.slice(1, -1);
        }
        
        return cleanStr.split(',').map(s => {
            let trimmed = s.trim();
            if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                trimmed = trimmed.slice(1, -1);
            }
            trimmed = trimmed.replace(/\\"/g, '"');
            return trimmed;
        }).filter(s => s !== '');
    }

    private normalize(str: unknown, qType: string): string {
        const s = String(str || '');
        if (qType === 'FILL_IN_THE_BLANK') {
            return s.replace(/<[^>]*>?/gm, '').trim().toLowerCase().replace(/\s+/g, ' ');
        }
        try {
            const div = document.createElement('div');
            div.innerHTML = s;
            
            // Remove math-visual wrappers to compare actual content
            // Better: replace with LaTeX content to be more robust
            div.querySelectorAll('.math-visual').forEach(el => {
                const latex = el.getAttribute('data-latex');
                if (latex) {
                    el.replaceWith(document.createTextNode(`$${latex}$`));
                } else {
                    while (el.firstChild) {
                        el.parentNode?.insertBefore(el.firstChild, el);
                    }
                    el.parentNode?.removeChild(el);
                }
            });

            // Standardize HTML by removing whitespace between tags and trimming
            return div.innerHTML.replace(/>\s+</g, '><').trim().replace(/\s+/g, ' ');
        } catch {
            return s.trim().replace(/\s+/g, ' ');
        }
    }

    constructor() {
        try {
            const savedQueue = localStorage.getItem('exam_sync_queue');
            if (savedQueue) {
                this.syncQueue = JSON.parse(savedQueue);
            }
        } catch { /* ignore */ }
        
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.processQueue());
            setInterval(() => {
                if (this.syncQueue.length > 0) this.processQueue();
            }, 30000);
        }
    }

    /**
     * Specialized method for saving exams by collaborators.
     * Includes token verification and specific fallback strategies.
     */
    async saveCollaboratorExam(exam: Exam, token: string): Promise<void> {
        console.log("Saving exam as collaborator...", { code: exam.code, token });
        const BUCKET_NAME = 'soal';
        const examCode = exam.code;

        // 1. Fetch existing exam to verify token and get author_id
        const { data: existingExam, error: fetchError } = await supabase
            .from('exams')
            .select('*')
            .eq('code', exam.code)
            .single();

        if (fetchError || !existingExam) {
            console.error("Collaborator save failed: Exam not found", fetchError);
            throw new Error("Ujian tidak ditemukan.");
        }

        // 2. Verify Token
        const config = existingExam.config as ExamConfig;
        const collaborators = config.collaborators || [];
        const collaborator = collaborators.find(c => c.token === token);

        if (!collaborator || collaborator.role !== 'editor') {
            throw new Error("Akses ditolak. Token kolaborator tidak valid atau Anda hanya memiliki akses 'viewer'.");
        }

        // 3. Prepare Data
        const newConfig = { 
            ...exam.config, 
            collaborators: config.collaborators // Keep existing collaborators from DB
        };

        // Helper to process HTML content (images/audio)
        const processHtmlString = async (html: string, contextId: string): Promise<string> => {
            if (!html || (!html.includes('data:image') && !html.includes('data:audio'))) return html;
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
                        const filename = `${examCode}/${contextId}_img_${Date.now()}_${i}.${ext}`;
                        const { data } = await supabase.storage.from(BUCKET_NAME).upload(filename, blob, { upsert: true });
                        if (data) {
                            const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filename);
                            img.setAttribute('src', publicUrlData.publicUrl);
                            img.setAttribute('data-bucket-path', filename); 
                        }
                    } catch (e) { console.error("Gagal upload gambar", e); }
                }
            }
            // Audio processing if needed inside HTML...
            return doc.body.innerHTML;
        };

        const processedQuestions = JSON.parse(JSON.stringify(exam.questions));
        
        for (const q of processedQuestions) {
            // Process HTML content
            q.questionText = await processHtmlString(q.questionText, q.id);
            if (q.options) {
                for (let i = 0; i < q.options.length; i++) {
                    q.options[i] = await processHtmlString(q.options[i], `${q.id}_opt_${i}`);
                }
            }

            // Handle Explicit Image Upload (imageUrl)
            if (q.imageUrl && q.imageUrl.startsWith('data:image')) {
                try {
                    const blob = base64ToBlob(q.imageUrl);
                    const mime = q.imageUrl.substring(5, q.imageUrl.indexOf(';'));
                    const ext = mime.split('/')[1] || 'png';
                    const filename = `${exam.code}/${q.id}_img_${Date.now()}.${ext}`;
                    const { data } = await supabase.storage.from(BUCKET_NAME).upload(filename, blob, { upsert: true });
                    if (data) {
                        const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filename);
                        q.imageUrl = publicUrlData.publicUrl;
                    }
                } catch (e) { console.error("Upload image failed", e); }
            }

            // Handle Explicit Audio Upload (audioUrl)
            if (q.audioUrl && q.audioUrl.startsWith('data:audio')) {
                 try {
                    const blob = base64ToBlob(q.audioUrl);
                    const mime = q.audioUrl.substring(5, q.audioUrl.indexOf(';'));
                    const ext = mime.split('/')[1] || 'mp3';
                    const filename = `${exam.code}/${q.id}_audio_${Date.now()}.${ext}`;
                    const { data } = await supabase.storage.from(BUCKET_NAME).upload(filename, blob, { upsert: true });
                    if (data) {
                        const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filename);
                        q.audioUrl = publicUrlData.publicUrl;
                    }
                } catch (e) { console.error("Upload audio failed", e); }
            }
        }

        // 4. Attempt Update via RPC (Bypass RLS securely)
        const { error: rpcError } = await supabase.rpc('save_collaborator_exam', {
            p_exam_code: exam.code,
            p_token: token,
            p_new_config: newConfig,
            p_new_questions: processedQuestions
        });

        if (!rpcError) {
            console.log("Collaborator save success (RPC)");
            return;
        }

        console.warn("Collaborator RPC failed. Make sure the SQL function is created in Supabase.", rpcError);
        throw new Error(`Gagal menyimpan. Pastikan fungsi SQL 'save_collaborator_exam' telah dibuat di Supabase. Error: ${rpcError.message}`);
    }

  async updateExamAnswerKey(examCode: string, questionId: string, newCorrectAnswer: string): Promise<void> {
      // 1. Fetch Exam
      const { data: examData, error: examError } = await supabase
          .from('exams')
          .select('*')
          .eq('code', examCode)
          .single();
      
      if (examError || !examData) throw new Error("Exam not found");

      const questions = examData.questions as Question[];
      const qIndex = questions.findIndex(q => q.id === questionId);
      if (qIndex === -1) throw new Error("Question not found");

      // 2. Update Question
      if (questions[qIndex].questionType === 'TRUE_FALSE') {
          try {
              questions[qIndex].trueFalseRows = JSON.parse(newCorrectAnswer);
          } catch {
              console.error("Failed to parse TRUE_FALSE rows");
              throw new Error("Invalid data format for TRUE_FALSE");
          }
      } else if (questions[qIndex].questionType === 'MATCHING') {
          try {
              questions[qIndex].matchingPairs = JSON.parse(newCorrectAnswer);
          } catch {
              console.error("Failed to parse MATCHING pairs");
              throw new Error("Invalid data format for MATCHING");
          }
      } else {
          questions[qIndex].correctAnswer = newCorrectAnswer;
      }

      // 3. Save Exam
      const { error: updateError } = await supabase
          .from('exams')
          .update({ questions: questions })
          .eq('code', examCode);

      if (updateError) throw updateError;

      // 4. Fetch Results
      const { data: results, error: resultsError } = await supabase
          .from('results')
          .select('*')
          .eq('exam_code', examCode);

      if (resultsError) throw resultsError;

      // 5. Recalculate Scores
      const updates = results.map((r: Result) => {
          const answers = r.answers;
          let correctCount = 0;
          
          const scorableQuestions = questions.filter(q => q.questionType !== 'INFO');
          
          scorableQuestions.forEach(q => {
              // Logic from checkAnswerStatus
              const manualGradeKey = `_grade_${q.id}`;
              if (answers[manualGradeKey]) {
                  if (answers[manualGradeKey] === 'CORRECT') correctCount++;
                  return;
              }

              const ans = answers[q.id];
              if (!ans) {
                  return;
              }

              const studentAns = this.normalize(String(ans), q.questionType);
              const correctAns = this.normalize(String(q.correctAnswer || ''), q.questionType);

              let isCorrect = false;
               if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
                  isCorrect = studentAns === correctAns;
              } 
              else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
                  const sSet = new Set(this.parseList(String(ans)).map(a => this.normalize(a, q.questionType)));
                  const cSet = new Set(this.parseList(String(q.correctAnswer || '')).map(a => this.normalize(a, q.questionType)));
                  isCorrect = sSet.size === cSet.size && [...sSet].every(x => cSet.has(x));
              }
              else if (q.questionType === 'TRUE_FALSE') {
                   try {
                      const ansObj = JSON.parse(ans);
                      isCorrect = q.trueFalseRows?.every((row, idx) => ansObj[idx] === row.answer) ?? false;
                  } catch { isCorrect = false; }
              }
              else if (q.questionType === 'MATCHING') {
                  try {
                      const ansObj = JSON.parse(ans);
                      isCorrect = q.matchingPairs?.every((pair, idx) => ansObj[idx] === pair.right) ?? false;
                  } catch { isCorrect = false; }
              }

              if (isCorrect) correctCount++;
          });

          const total = scorableQuestions.length;
          const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;

          return {
              id: r.id,
              exam_code: (r as any).exam_code,
              student_id: (r as any).student_id,
              student_name: (r as any).student_name,
              class_name: (r as any).class_name,
              status: (r as any).status,
              answers: (r as any).answers,
              activity_log: (r as any).activity_log,
              location: (r as any).location,
              unlock_token: (r as any).unlock_token,
              score: score,
              correct_answers: correctCount,
              total_questions: total,
              updated_at: new Date().toISOString()
          };
      });

      // 6. Bulk Update Results
      if (updates.length > 0) {
          const { error: bulkError } = await supabase
              .from('results')
              .upsert(updates);
          
          if (bulkError) throw bulkError;
      }
  }

  // --- INDEXED DB METHODS (LOCAL PROGRESS) ---
  
  async saveLocalProgress(key: string, data: unknown): Promise<void> {
      try {
          const db = await initDB();
          return new Promise((resolve, reject) => {
              const tx = db.transaction(STORE_PROGRESS, 'readwrite');
              const store = tx.objectStore(STORE_PROGRESS);
              store.put({ key, data, updatedAt: Date.now() });
              tx.oncomplete = () => resolve();
              tx.onerror = () => reject(tx.error);
          });
      } catch { 
          // Fallback to LocalStorage if IDB fails
          try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* ignore */ }
      }
  }

  async getLocalProgress(key: string): Promise<unknown | null> {
      try {
          const db = await initDB();
          return new Promise((resolve, reject) => {
              const tx = db.transaction(STORE_PROGRESS, 'readonly');
              const store = tx.objectStore(STORE_PROGRESS);
              const req = store.get(key);
              req.onsuccess = () => resolve(req.result ? req.result.data : null);
              req.onerror = () => reject(req.error);
          });
      } catch { 
          // Fallback to LocalStorage
          try { 
              const item = localStorage.getItem(key);
              return item ? JSON.parse(item) : null;
          } catch { return null; }
      }
  }

  async clearLocalProgress(key: string): Promise<void> {
      try {
          const db = await initDB();
          const tx = db.transaction(STORE_PROGRESS, 'readwrite');
          tx.objectStore(STORE_PROGRESS).delete(key);
      } catch {
          try { localStorage.removeItem(key); } catch { /* ignore */ }
      }
  }
  
  // --- AUTH METHODS ---
  async getCurrentUser(): Promise<TeacherProfile | null> {
      const auth = supabase.auth;
      const { data: { session } } = await auth.getSession();
      if (!session?.user) return null;

      const { data: profile, error } = await supabase
          .from('profiles')
          .select('full_name, school, role, regency')
          .eq('id', session.user.id)
          .maybeSingle();

      if (error) return null;

      if (!profile) {
          // Create default profile for new OAuth users
          const meta = session.user.user_metadata || {};
          const { data: newProfile, error: insertError } = await supabase
              .from('profiles')
              .insert({
                  id: session.user.id,
                  full_name: meta.full_name || meta.name || 'Pengguna',
                  school: '-',
                  regency: '-',
                  role: 'guru'
              })
              .select()
              .single();
          
          if (insertError || !newProfile) return null;

          return {
              id: session.user.id,
              fullName: newProfile.full_name,
              accountType: newProfile.role as AccountType,
              school: newProfile.school,
              regency: newProfile.regency,
              email: session.user.email
          };
      }

      return {
          id: session.user.id,
          fullName: profile.full_name,
          accountType: profile.role as AccountType,
          school: profile.school,
          regency: profile.regency,
          email: session.user.email
      };
  }

  // SECURITY HELPER: Verify role against server data
  private async _verifyRole(allowedRoles: AccountType[]): Promise<TeacherProfile> {
      const profile = await this.getCurrentUser();
      if (!profile || !allowedRoles.includes(profile.accountType)) {
          throw new Error("Akses Ditolak: Peran pengguna tidak valid atau telah dimodifikasi.");
      }
      return profile;
  }

  async signUpWithEmail(email: string, password: string, fullName: string, school: string, regency: string): Promise<TeacherProfile> {
      const { data: authData, error: authError } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
              data: {
                  full_name: fullName,
                  school: school,
                  regency: regency,
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
          regency: regency,
          email: email
      };
  }

  async signInWithEmail(email: string, password: string): Promise<TeacherProfile> {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error('Email atau password salah.');
      
      // Tunggu sebentar untuk trigger
      await new Promise(r => setTimeout(r, 500));

      const profile = await this.getCurrentUser();
      
      if (!profile) throw new Error('Gagal memuat profil pengguna. Silakan hubungi admin.');
      return profile;
  }

  async signOut() {
      await supabase.auth.signOut();
  }

  async updateTeacherProfile(id: string, updates: Partial<TeacherProfile>): Promise<void> {
      const dbUpdates: Record<string, string | undefined> = {};
      if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
      if (updates.school !== undefined) dbUpdates.school = updates.school;
      if (updates.regency !== undefined) dbUpdates.regency = updates.regency;
      if (updates.accountType !== undefined) dbUpdates.role = updates.accountType;

      const { error } = await supabase
          .from('profiles')
          .update(dbUpdates)
          .eq('id', id);

      if (error) throw error;
  }

  // --- USER MANAGEMENT (SUPER ADMIN) ---
  
  async getAllUsers(): Promise<UserProfile[]> {
      // SECURITY: Verify Super Admin
      await this._verifyRole(['super_admin']);

      const { data: profiles, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      
      return profiles.map((p: Record<string, unknown>) => ({
          id: p.id as string,
          fullName: p.full_name as string,
          accountType: p.role as AccountType,
          school: p.school as string,
          email: '-' 
      }));
  }

  async updateUserRole(userId: string, newRole: AccountType, newSchool: string): Promise<void> {
      // SECURITY: Verify Super Admin
      await this._verifyRole(['super_admin']);

      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, school: newSchool })
        .eq('id', userId);
      
      if (error) throw error;
  }

  // --- EXAM METHODS ---

  async getExams(profile?: TeacherProfile): Promise<Record<string, Exam>> {
    // SECURITY CHECK: Verify identity if privileged access is requested
    // This prevents "Inspect Element" attacks where user modifies local state to 'super_admin'
    if (profile && (profile.accountType === 'super_admin' || profile.accountType === 'admin_sekolah')) {
        const verified = await this.getCurrentUser();
        // If verification fails or role mismatch, force use of verified profile (which might be 'guru' or null)
        if (!verified || verified.accountType !== profile.accountType) {
            console.warn("Security Alert: Profile mismatch detected in getExams. Enforcing server-side profile.");
            profile = verified || undefined;
        }
    }

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
        data.forEach((row: Record<string, unknown>) => {
            examMap[row.code as string] = {
                code: row.code as string,
                authorId: row.author_id as string,
                authorSchool: row.school as string,
                config: row.config as ExamConfig,
                questions: row.questions as Question[],
                status: row.status as 'DRAFT' | 'PUBLISHED',
                createdAt: row.created_at as string
            };
        });
    }
    return examMap;
  }

  async getExamForStudent(code: string, studentId?: string, isPreview = false): Promise<Exam | null> {
      let data = null;

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
      } catch {
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
    const processedQuestions = JSON.parse(JSON.stringify(exam.questions));
    const BUCKET_NAME = 'soal';
    const examCode = exam.code;

    // SECURITY FIX: Fetch existing author_id to prevent ownership hijacking
    const { data: existing } = await supabase.from('exams').select('code, author_id').eq('code', examCode).maybeSingle();
    
    let finalAuthorId = exam.authorId;

    if (existing) {
        // CRITICAL: If exam exists, enforce original ownership.
        // This prevents admins/users from changing author_id via Inspect Element or payload manipulation.
        finalAuthorId = existing.author_id;
    } else {
        const { error: initError } = await supabase.from('exams').insert({
            code: exam.code, 
            author_id: finalAuthorId, 
            school: exam.authorSchool,
            config: exam.config, 
            questions: [], 
            status: 'DRAFT'
        });
        if (initError) throw initError;
    }

    const processHtmlString = async (html: string, contextId: string): Promise<string> => {
        if (!html || (!html.includes('data:image') && !html.includes('data:audio'))) return html;
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
                    const filename = `${examCode}/${contextId}_img_${Date.now()}_${i}.${ext}`;
                    const { data } = await supabase.storage.from(BUCKET_NAME).upload(filename, blob, { upsert: true });
                    if (data) {
                        const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filename);
                        img.setAttribute('src', publicUrlData.publicUrl);
                        img.setAttribute('data-bucket-path', filename); 
                    }
                } catch (e) { console.error("Gagal upload gambar", e); }
            }
        }

        const audios = doc.getElementsByTagName('audio');
        for (let i = 0; i < audios.length; i++) {
            const audio = audios[i];
            const src = audio.getAttribute('src');
            if (src && src.startsWith('data:audio')) {
                try {
                    const blob = base64ToBlob(src);
                    const ext = src.substring(src.indexOf('/') + 1, src.indexOf(';'));
                    const filename = `${examCode}/${contextId}_audio_${Date.now()}_${i}.${ext}`;
                    const { data } = await supabase.storage.from(BUCKET_NAME).upload(filename, blob, { upsert: true });
                    if (data) {
                        const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filename);
                        audio.setAttribute('src', publicUrlData.publicUrl);
                        audio.setAttribute('data-bucket-path', filename);
                    }
                } catch (e) { console.error("Gagal upload audio", e); }
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

        // Handle Audio Upload
        if (q.audioUrl && q.audioUrl.startsWith('data:audio')) {
             try {
                const blob = base64ToBlob(q.audioUrl);
                const mime = q.audioUrl.substring(5, q.audioUrl.indexOf(';'));
                const ext = mime.split('/')[1] || 'mp3';
                const filename = `${examCode}/${q.id}_audio_${Date.now()}.${ext}`;
                
                const { data } = await supabase.storage.from(BUCKET_NAME).upload(filename, blob, { upsert: true });
                if (data) {
                    const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filename);
                    q.audioUrl = publicUrlData.publicUrl;
                }
            } catch (e) { console.error("Gagal upload audio", e); }
        }
    }

    // FIX: Use update instead of upsert to avoid RLS issues with author_id for collaborators
    // We don't need to send author_id as it's already set during creation/check
    const { data, error } = await supabase.from('exams').update({
        school: exam.authorSchool,
        config: exam.config, 
        questions: processedQuestions, 
        status: exam.status || 'PUBLISHED'
    }).eq('code', exam.code).select();

    if (error) throw error;

    // If no rows were updated, it implies RLS blocked the update or the exam wasn't found.
    // We attempt a fallback strategy for collaborators.
    if (!data || data.length === 0) {
        console.warn("Update returned 0 rows. Attempting fallback strategies...");
        
        // Strategy 1: Partial Update (Questions & Config only)
        // Some RLS policies might restrict updating 'school' or 'status' for non-owners.
        console.log("Attempting partial update (questions & config only)...");
        const { data: partialData, error: partialError } = await supabase.from('exams').update({
            config: exam.config,
            questions: processedQuestions
        }).eq('code', exam.code).select();

        if (partialData && partialData.length > 0) {
            console.log("Partial update successful!");
            return;
        }

        if (partialError) {
             console.warn("Partial update failed:", partialError);
        }

        // Strategy 2: Upsert with existing author_id (Last Resort)
        console.log("Attempting fallback upsert with existing author_id...");
        
        // 1. Fetch existing exam to get author_id
        const { data: existingExam, error: fetchError } = await supabase
            .from('exams')
            .select('author_id')
            .eq('code', exam.code)
            .single();

        if (fetchError || !existingExam) {
             console.error("Failed to fetch existing exam for fallback:", fetchError);
             throw new Error("Gagal menyimpan perubahan. Ujian tidak ditemukan atau Anda tidak memiliki akses.");
        }

        // 2. Perform upsert with the correct author_id
        // We exclude 'school' here as well just in case it's protected
        const { error: upsertError } = await supabase.from('exams').upsert({
            code: exam.code,
            author_id: existingExam.author_id, // Include the original author_id
            // school: exam.authorSchool, // Exclude school to be safe
            config: exam.config,
            questions: processedQuestions,
            status: exam.status || 'PUBLISHED'
        }, { onConflict: 'code' });

        if (upsertError) {
            console.error("Fallback upsert failed:", upsertError);
            throw new Error(`Gagal menyimpan perubahan. Izin ditolak oleh server (RLS). Pastikan Anda login atau memiliki akses edit yang valid. (Error: ${upsertError.message})`);
        }
    }
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
      
      // FETCH AUTHOR REGION (Default if not manually edited)
      if (exam.authorId) {
          const { data: profile } = await supabase
              .from('profiles')
              .select('regency')
              .eq('id', exam.authorId)
              .maybeSingle();
          if (profile?.regency) {
              summary.region = profile.regency;
          }
      }

      // PRESERVE MANUAL EDITS: Fetch existing summary first
      const { data: existing } = await supabase
          .from('exam_summaries')
          .select('region, exam_type')
          .eq('exam_code', exam.code)
          .maybeSingle();

      if (existing) {
          if (existing.region) summary.region = existing.region;
          if (existing.exam_type) summary.exam_type = existing.exam_type;
      }

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
          await this.uploadArchive(exam.code, jsonString, {
              school: exam.authorSchool,
              subject: exam.config.subject,
              classLevel: exam.config.classLevel,
              examType: exam.config.examType,
              targetClasses: exam.config.targetClasses,
              date: exam.config.date,
              participantCount: examResults.length
          });
          // 7. CLEANUP (Transaction Step 4 - Only if upload success)
          await this.cleanupExamAssets(exam.code);
          await this.deleteExam(exam.code);
      } catch (cloudError) {
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
      // PRESERVE MANUAL EDITS: Fetch existing summary first
      const { data: existing } = await supabase
          .from('exam_summaries')
          .select('region, exam_type')
          .eq('exam_code', exam.code)
          .maybeSingle();

      // Hitung statistik menggunakan logika yang sama dengan proses arsip otomatis
      const summary = this.calculateExamStatistics(exam, results);

      // FETCH AUTHOR REGION (Default if not manually edited)
      if (exam.authorId) {
          const { data: profile } = await supabase
              .from('profiles')
              .select('regency')
              .eq('id', exam.authorId)
              .maybeSingle();
          if (profile?.regency) {
              summary.region = profile.regency;
          }
      }

      // Restore manual edits if available
      if (existing) {
          if (existing.region) summary.region = existing.region;
          if (existing.exam_type) summary.exam_type = existing.exam_type;
      }
      
      // Hapus data lama jika ada (berdasarkan kode ujian) untuk menghindari duplikasi
      // Ini memenuhi permintaan: "aplikasi dapat mengganti data lama menjadi data baru"
      const { error: deleteError } = await supabase
          .from('exam_summaries')
          .delete()
          .eq('exam_code', exam.code);

      if (deleteError) {
          console.warn("Gagal menghapus data lama (mungkin tidak ada):", deleteError);
      }

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
      const questionStats: Record<string, unknown>[] = exam.questions
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
          exam_type: exam.config.examType, // Added exam_type
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

  private isAnswerCorrect(q: Question, ans: unknown): boolean {
      if (!ans) return false;
      
      if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
          return this.normalize(ans as string, q.questionType) === this.normalize(q.correctAnswer || '', q.questionType);
      }
      
      if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
          const sSet = new Set(this.parseList(String(ans)).map(a => this.normalize(a, q.questionType)));
          const cSet = new Set(this.parseList(q.correctAnswer).map(a => this.normalize(a, q.questionType)));
          return sSet.size === cSet.size && [...sSet].every(x => cSet.has(x));
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
      // SECURITY: Verify Admin Access
      await this._verifyRole(['super_admin', 'admin_sekolah']);

      let query = supabase.from('exam_summaries').select('*');
      if (filters?.region) query = query.ilike('school_name', `%${filters.region}%`); // Simple proxy for region
      if (filters?.subject) query = query.eq('exam_subject', filters.subject);
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) return [];
      return data as ExamSummary[];
  }

  async deleteAnalyticsData(id: string): Promise<void> {
      // SECURITY: Verify Admin Access
      await this._verifyRole(['super_admin']);

      const { error } = await supabase.from('exam_summaries').delete().eq('id', id);
      if (error) throw error;
  }

  // --- PROMPT GENERATOR (NO AI CALL) ---
  generateAnalysisPrompt(summaries: ExamSummary[]): string {
      // Pre-process data to save tokens
      const simpleData = summaries.map(s => ({
          school: s.school_name,
          avg: s.average_score,
          participants: s.total_participants,
          weakness_count: s.question_stats.filter((qs: Record<string, unknown>) => (qs.correct_rate as number) < 50).length,
          top_difficulty_questions: s.question_stats
              .filter((qs: Record<string, unknown>) => (qs.correct_rate as number) < 40)
              .map((qs: Record<string, unknown>) => `Q${(qs.id as string).split('-')[1] || qs.id}: ${qs.correct_rate}%`)
              .slice(0, 3)
      }));

      return `
        You are a Senior Education Data Consultant specializing in Competency-Based Curriculum Analysis.
        
        INPUT DATA (JSON):
        ${JSON.stringify(simpleData, null, 2)}

        TASK:
        Generate a comprehensive "Best Practices & Competency Gap Analysis" report for the Regional Education Department.
        
        OUTPUT FORMAT:
        - Use standard Markdown (MD) for all formatting.
        - DO NOT use HTML tags (no <div>, <table>, etc.).
        - Use Markdown tables for structured data.
        - Use ASCII charts or simple text-based visualizations if needed (e.g., [||||||||||] 80%).
        
        STRUCTURE:

        1. EXECUTIVE SUMMARY:
           - Provide a high-level overview of regional performance.
           - Highlight top 3 key findings (positive & negative).

        2. COMPETENCY MASTERY (Text-Based Chart):
           - List schools and their scores using a text-based bar chart format.
           - Example:
             School A: [==========] 100%
             School B: [=====     ] 50%

        3. DEEP DIVE ANALYSIS (Qualitative & Competency-Based):
           - **Identify Systemic Weaknesses:** Analyze questions/topics that failed across most schools. What specific competency (e.g., Numeracy, Logic, Recall) is likely missing?
           - **Analyze Disparities:** Compare high-performing vs low-performing schools. Is the gap wide? What does this suggest about resource distribution or teacher quality?
           - **Avoid Assumptions:** Do NOT guess teaching methods (e.g., "PBL", "Inquiry"). Focus strictly on *what* was tested and *how* students performed.

        4. STRATEGIC RECOMMENDATIONS (Markdown Table):
           - Create a Markdown Table with columns: "Fokus Masalah", "Kompetensi Target", "Rekomendasi Program Dinas/MGMP".
           - Suggest concrete actions like "Workshop Bedah SKL untuk Materi X" or "Penguatan Literasi Numerasi Dasar".

        TONE:
        - Professional, analytical, yet accessible to education policymakers.
        - Use Indonesian language (Bahasa Indonesia).
      `;
  }

  // --- GEMINI AI ANALYTICS (GENERATIVE VISUALIZATION) ---
  async generateAIAnalysis(summaries: ExamSummary[]): Promise<string> {
      try {
          const prompt = this.generateAnalysisPrompt(summaries);
          
          // Use the new SDK method
          const ai = getAI();
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview', 
              contents: prompt
          });

          return response.text || "Gagal menghasilkan analisis.";
      } catch (e) {
          console.error("Gemini Error:", e);
          
          // Friendly Error UI for Rate Limits (429)
          const errorMsg = e instanceof Error ? e.message : String(e);
          if (errorMsg.includes('429') || (e && typeof e === 'object' && 'status' in e && e.status === 429)) {
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

      const examData: Exam = {
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
                  } catch {
                      console.warn("Direct download failed for archive, falling back to fetch:", bucketPath);
                  }
              }

              if (!rawBase64 && src && src.startsWith('http')) {
                  const converted = await urlToBase64(src);
                  if (converted) rawBase64 = converted;
              }

              if (rawBase64 && rawBase64.startsWith('data:image')) {
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
              } else if (!rawBase64 && src) {
                  // Keep original src if conversion failed (CORS blocked)
                  // No changes needed, src is already there
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
  }  async getResults(examCode?: string, className?: string, schoolName?: string): Promise<Result[]> {
    let query = supabase.from('results').select('*');
    if (examCode) query = query.eq('exam_code', examCode);
    
    // SORTING IS CRITICAL FOR LIVE VIEW: Updated/Joined recently first
    query = query.order('updated_at', { ascending: false });
    
    const { data, error } = await query;
    if (error) return [];
    
    let results = data.map((row: Record<string, unknown>) => {
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

        return {
            id: row.id as number, // Primary Key
            student: { 
                studentId: studentIdStr, 
                fullName: studentName, 
                class: dbClassName, 
                schoolName: dbSchoolName,
                absentNumber: absentNumber 
            },
            examCode: row.exam_code as string, 
            answers: (row.answers as Record<string, string>) || {}, // CRITICAL FIX: Fallback to empty object if null
            score: row.score as number, 
            correctAnswers: row.correct_answers as number,
            totalQuestions: row.total_questions as number, 
            status: row.status as ResultStatus, 
            activityLog: row.activity_log as string[],
            timestamp: new Date(row.updated_at as string).getTime(), 
            location: row.location as { lat: number; lng: number } | undefined
        };
    });

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
        this.addToQueue(resultPayload);
        return { ...resultPayload, isSynced: false, status: resultPayload.status || 'in_progress' };
    }

    try {
        // SECURITY FIX: Recalculate score on server-side (or at least using true DB data before insert)
        // to prevent client-side manipulation of the score.
        let calculatedScore = resultPayload.score || 0;
        let calculatedCorrect = resultPayload.correctAnswers || 0;
        let calculatedTotal = resultPayload.totalQuestions || 0;

        try {
            const { data: examData } = await supabase.from('exams').select('questions').eq('code', resultPayload.examCode).single();
            if (examData && examData.questions) {
                const questions = examData.questions as Question[];
                const scorableQuestions = questions.filter(q => q.questionType !== 'INFO' && q.questionType !== 'ESSAY');
                calculatedTotal = scorableQuestions.length;
                calculatedCorrect = 0;

                scorableQuestions.forEach((q: Question) => {
                    const studentAnswer = resultPayload.answers[q.id];
                    if (!studentAnswer) return;

                    if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
                         if (q.correctAnswer && this.normalize(studentAnswer, q.questionType) === this.normalize(q.correctAnswer, q.questionType)) calculatedCorrect++;
                    } 
                    else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
                         const studentSet = new Set(this.parseList(studentAnswer).map(a => this.normalize(a, q.questionType)));
                         const correctSet = new Set(this.parseList(q.correctAnswer).map(a => this.normalize(a, q.questionType)));
                         if (studentSet.size === correctSet.size && [...studentSet].every(val => correctSet.has(val))) {
                             calculatedCorrect++;
                         }
                    }
                    else if (q.questionType === 'TRUE_FALSE') {
                        try {
                            const ansObj = JSON.parse(studentAnswer);
                            const allCorrect = q.trueFalseRows?.every((row: { answer: boolean }, idx: number) => {
                                return ansObj[idx] === row.answer;
                            });
                            if (allCorrect) calculatedCorrect++;
                        } catch { /* ignore */ }
                    }
                    else if (q.questionType === 'MATCHING') {
                        try {
                            const ansObj = JSON.parse(studentAnswer);
                            const allCorrect = q.matchingPairs?.every((pair: { right: string }, idx: number) => {
                                return ansObj[idx] === pair.right;
                            });
                            if (allCorrect) calculatedCorrect++;
                        } catch { /* ignore */ }
                    }
                });

                calculatedScore = calculatedTotal > 0 ? Math.round((calculatedCorrect / calculatedTotal) * 100) : 0;
            }
        } catch (err) {
            console.error("Failed to recalculate score securely", err);
        }

        let data, error;

        // CRITICAL FIX: If resultId exists, update by Primary Key ID.
        // This ensures that if a teacher edits student data (changing student_id),
        // the student's submission still updates the correct record without reverting the identity changes.
        if (resultPayload.student.resultId) {
             const { data: updatedData, error: updateError } = await supabase
                .from('results')
                .update({
                    answers: resultPayload.answers || {},
                    status: resultPayload.status,
                    activity_log: resultPayload.activityLog || [],
                    score: calculatedScore,
                    correct_answers: calculatedCorrect,
                    total_questions: calculatedTotal,
                    location: resultPayload.location,
                    updated_at: new Date().toISOString()
                })
                .eq('id', resultPayload.student.resultId)
                .select()
                .single();
             
             data = updatedData;
             error = updateError;
        } else {
            // Fallback: Upsert by Composite Key (exam_code, student_id) for initial creation
            const classNameWithSchool = resultPayload.student.schoolName 
                ? `${resultPayload.student.schoolName}::${resultPayload.student.class}`
                : resultPayload.student.class;

            const { data: upsertData, error: upsertError } = await supabase.from('results').upsert({
                exam_code: resultPayload.examCode, 
                student_id: resultPayload.student.studentId, 
                student_name: resultPayload.student.fullName,
                class_name: classNameWithSchool, 
                answers: resultPayload.answers || {}, 
                status: resultPayload.status,
                activity_log: resultPayload.activityLog || [], 
                score: calculatedScore, 
                correct_answers: calculatedCorrect,
                total_questions: calculatedTotal, 
                location: resultPayload.location, 
                updated_at: new Date().toISOString()
            }, { onConflict: 'exam_code,student_id' })
            .select()
            .single();

            data = upsertData;
            error = upsertError;
        }

        if (error) throw error;
        
        return { 
            ...resultPayload, 
            id: data?.id,
            student: { ...resultPayload.student, resultId: data?.id },
            isSynced: true 
        };
    } catch (error) {
        console.error("CRITICAL DB ERROR:", error);
        
        const errObj = error as Record<string, unknown>;
        const isNetworkError = !errObj.code && errObj.message === 'Failed to fetch'; 
        
        if (isNetworkError) {
            console.warn("Network glitch, adding to queue...");
            this.addToQueue(resultPayload);
            return { ...resultPayload, isSynced: false };
        } else {
             throw new Error("Gagal menyimpan ke server: " + (errObj.message || "Izin database ditolak (RLS)."));
        }
    }
  }

  private addToQueue(payload: Result) {
      this.syncQueue = this.syncQueue.filter(item => !(item.examCode === payload.examCode && item.student.studentId === payload.student.studentId));
      this.syncQueue.push({ ...payload, timestamp: Date.now() });
      this.saveQueue();
      if(typeof navigator === 'undefined' || navigator.onLine !== false) this.processQueue(); 
  }

  private saveQueue() {
      try { localStorage.setItem('exam_sync_queue', JSON.stringify(this.syncQueue)); } catch { /* ignore */ }
  }

  async processQueue() {
      if (this.isProcessingQueue || this.syncQueue.length === 0 || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
      this.isProcessingQueue = true;
      const queueCopy = [...this.syncQueue];
      const remainingQueue: Result[] = [];
      
      for (const payload of queueCopy) {
          try {
             // SECURITY FIX: Recalculate score before processing queue item
             let calculatedScore = payload.score || 0;
             let calculatedCorrect = payload.correctAnswers || 0;
             let calculatedTotal = payload.totalQuestions || 0;

             try {
                 const { data: examData } = await supabase.from('exams').select('questions').eq('code', payload.examCode).single();
                 if (examData && examData.questions) {
                     const questions = examData.questions as Question[];
                     const scorableQuestions = questions.filter(q => q.questionType !== 'INFO' && q.questionType !== 'ESSAY');
                     calculatedTotal = scorableQuestions.length;
                     calculatedCorrect = 0;

                     const normalize = (str: unknown, qType: string): string => {
                         const s = String(str || '');
                         if (qType === 'FILL_IN_THE_BLANK') {
                             return s.trim().toLowerCase().replace(/\s+/g, ' ');
                         }
                         try {
                             const div = document.createElement('div');
                             div.innerHTML = s;

                             // Remove math-visual wrappers to compare actual content
                             div.querySelectorAll('.math-visual').forEach(el => {
                                 while (el.firstChild) {
                                     el.parentNode?.insertBefore(el.firstChild, el);
                                 }
                                 el.parentNode?.removeChild(el);
                             });

                             // Standardize HTML by removing whitespace between tags and trimming
                             return div.innerHTML.replace(/>\s+</g, '><').trim().replace(/\s+/g, ' ');
                         } catch {
                             return s.trim().replace(/\s+/g, ' ');
                         }
                     };

                     const parseList = (str: unknown): string[] => {
                         if (!str) return [];
                         const s = String(str);
                         
                         const deepParse = (input: string): any => {
                             try {
                                 let fixedInput = input;
                                 try {
                                     JSON.parse(fixedInput);
                                 } catch (e) {
                                     fixedInput = input.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");
                                 }
                                 const parsed = JSON.parse(fixedInput);
                                 if (typeof parsed === 'string') {
                                     return deepParse(parsed);
                                 }
                                 return parsed;
                             } catch {
                                 let cleaned = input.trim();
                                 if (cleaned.startsWith('[') && !cleaned.endsWith(']')) cleaned = cleaned.slice(1);
                                 if (cleaned.endsWith(']') && !cleaned.startsWith('[')) cleaned = cleaned.slice(0, -1);
                                 if (cleaned.startsWith('"') && cleaned.endsWith('"')) cleaned = cleaned.slice(1, -1);
                                 cleaned = cleaned.replace(/\\"/g, '"');
                                 return cleaned;
                             }
                         };

                         try {
                             const parsed = deepParse(s);
                             if (Array.isArray(parsed)) {
                                 const flattened: string[] = [];
                                 const processItem = (item: any) => {
                                     if (typeof item === 'string') {
                                         if ((item.startsWith('[') && item.endsWith(']')) || (item.startsWith('{') && item.endsWith('}'))) {
                                             try {
                                                 const unescaped = deepParse(item);
                                                 if (Array.isArray(unescaped)) {
                                                     unescaped.forEach(processItem);
                                                 } else {
                                                     flattened.push(String(unescaped));
                                                 }
                                             } catch {
                                                 flattened.push(String(item));
                                             }
                                         } else {
                                             flattened.push(String(item));
                                         }
                                     } else if (Array.isArray(item)) {
                                         item.forEach(processItem);
                                     } else {
                                         flattened.push(String(item));
                                     }
                                 };
                                 parsed.forEach(processItem);
                                 return flattened;
                             }
                         } catch { /* ignore */ }
                         
                         if (s.includes('<') && s.includes('>')) {
                             return [s.trim()];
                         }
                         
                         let cleanStr = s.trim();
                         if (cleanStr.startsWith('[') && cleanStr.endsWith(']')) {
                             cleanStr = cleanStr.slice(1, -1);
                         }
                         
                         return cleanStr.split(',').map(item => {
                             let trimmed = item.trim();
                             if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                                 trimmed = trimmed.slice(1, -1);
                             }
                             trimmed = trimmed.replace(/\\"/g, '"');
                             return trimmed;
                         }).filter(item => item !== '');
                     };

                     scorableQuestions.forEach((q: Question) => {
                         const studentAnswer = payload.answers[q.id];
                         if (!studentAnswer) return;

                         if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
                              if (q.correctAnswer && normalize(studentAnswer, q.questionType) === normalize(q.correctAnswer, q.questionType)) calculatedCorrect++;
                         } 
                         else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
                              const studentSet = new Set(parseList(studentAnswer).map(a => normalize(a, q.questionType)));
                              const correctSet = new Set(parseList(q.correctAnswer).map(a => normalize(a, q.questionType)));
                              if (studentSet.size === correctSet.size && [...studentSet].every(val => correctSet.has(val))) {
                                  calculatedCorrect++;
                              }
                         }
                         else if (q.questionType === 'TRUE_FALSE') {
                             try {
                                 const ansObj = JSON.parse(studentAnswer);
                                 const allCorrect = q.trueFalseRows?.every((row: { answer: boolean }, idx: number) => {
                                     return ansObj[idx] === row.answer;
                                 });
                                 if (allCorrect) calculatedCorrect++;
                             } catch { /* ignore */ }
                         }
                         else if (q.questionType === 'MATCHING') {
                             try {
                                 const ansObj = JSON.parse(studentAnswer);
                                 const allCorrect = q.matchingPairs?.every((pair: { right: string }, idx: number) => {
                                     return ansObj[idx] === pair.right;
                                 });
                                 if (allCorrect) calculatedCorrect++;
                             } catch { /* ignore */ }
                         }
                     });

                     calculatedScore = calculatedTotal > 0 ? Math.round((calculatedCorrect / calculatedTotal) * 100) : 0;
                 }
             } catch (err) {
                 console.error("Failed to recalculate score securely in queue", err);
             }

             const student = payload.student;
             const classNameWithSchool = student.schoolName 
                 ? `${student.schoolName}::${student.class}`
                 : student.class;

             const { error } = await supabase.from('results').upsert({
                exam_code: payload.examCode, student_id: student.studentId, student_name: student.fullName,
                class_name: classNameWithSchool, answers: payload.answers || {}, status: payload.status,
                activity_log: payload.activityLog, score: calculatedScore, correct_answers: calculatedCorrect,
                total_questions: calculatedTotal, location: payload.location, updated_at: new Date().toISOString()
             }, { onConflict: 'exam_code,student_id' });
             
             if (error) {
                 if (error.code === '42501' || error.code === 'PGRST301') { 
                     console.error("Queue item dropped due to permission error:", error);
                 } else {
                     throw error; 
                 }
             }
          } catch {
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
      
      let className = data.class_name as string;
      let schoolName: string | undefined = undefined;
      if (className && className.includes('::')) {
          const parts = className.split('::');
          schoolName = parts[0];
          className = parts[1];
      }
      
      return {
        id: data.id, // Include Primary Key
        student: { studentId: data.student_id, fullName: data.student_name, class: className, schoolName: schoolName, absentNumber: '00' },
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
  }

  async finishAllExams(examCode: string): Promise<void> {
      const { error } = await supabase
          .from('results')
          .update({ status: 'completed' })
          .eq('exam_code', examCode)
          .in('status', ['in_progress', 'force_closed']);
      if (error) throw error;
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

  async uploadArchive(examCode: string, jsonString: string, metadata?: Record<string, unknown>): Promise<string> {
      const blob = new Blob([jsonString], { type: "application/json" });
      
      // Default simple filename
      let filename = `${examCode}_${Date.now()}.json`;
      
      // Attempt to encode metadata into filename for list view availability
      if (metadata) {
          try {
              const minMeta = {
                  s: metadata.school,
                  su: metadata.subject,
                  c: metadata.classLevel,
                  t: metadata.examType,
                  tc: metadata.targetClasses,
                  d: metadata.date,
                  p: metadata.participantCount // NEW: Participant Count
              };
              // URL-safe Base64 encoding
              const b64 = btoa(JSON.stringify(minMeta))
                  .replace(/\+/g, '-')
                  .replace(/\//g, '_')
                  .replace(/=+$/, '');
              
              filename = `${examCode}_meta_${b64}_${Date.now()}.json`;
          } catch (e) {
              console.warn("Failed to encode metadata into filename, using simple name", e);
          }
      }
      
      const { data, error } = await supabase.storage
          .from('archives')
          .upload(filename, blob, { upsert: true });
          
      if (error) throw error;
      return data?.path || filename;
  }

  async getArchivedList(): Promise<{name: string, created_at: string, size: number, metadata?: Record<string, unknown>}[]> {
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
      
      return data.map((f: {name: string, created_at: string, metadata?: Record<string, unknown>}) => {
          let metadata = null;
          if (typeof f.name === 'string' && f.name.includes('_meta_')) {
              try {
                  const parts = f.name.split('_meta_');
                  if (parts.length > 1) {
                      let b64 = parts[1].split('_')[0]; // Take until next underscore or end
                      // Restore Base64 standard chars
                      b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
                      // Add padding
                      while (b64.length % 4) b64 += '=';
                      
                      const parsed = JSON.parse(atob(b64));
                      metadata = {
                          school: parsed.s,
                          subject: parsed.su,
                          classLevel: parsed.c,
                          examType: parsed.t,
                          targetClasses: parsed.tc,
                          date: parsed.d,
                          participantCount: parsed.p // NEW: Parse Participant Count
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
  // --- COLLABORATOR METHODS ---

  async addCollaborator(examCode: string, label: string, role: 'editor' | 'viewer'): Promise<string> {
      // Fetch raw to avoid status checks
      const { data, error } = await supabase
          .from('exams')
          .select('config')
          .eq('code', examCode)
          .single();
          
      if (error || !data) throw new Error("Exam not found");

      const config = data.config as ExamConfig;
      const token = (typeof crypto !== 'undefined' && crypto.randomUUID) 
          ? crypto.randomUUID() 
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
              const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
              return v.toString(16);
            });
      const newCollaborator = {
          token,
          label,
          role,
          createdAt: Date.now()
      };

      const currentCollaborators = config.collaborators || [];
      const updatedCollaborators = [...currentCollaborators, newCollaborator];
      
      const updatedConfig = { ...config, collaborators: updatedCollaborators };
      
      const { error: updateError } = await supabase
          .from('exams')
          .update({ config: updatedConfig })
          .eq('code', examCode);

      if (updateError) throw updateError;
      return token;
  }

  async removeCollaborator(examCode: string, token: string): Promise<void> {
      const { data, error } = await supabase
          .from('exams')
          .select('config')
          .eq('code', examCode)
          .single();
          
      if (error || !data) throw new Error("Exam not found");

      const config = data.config as ExamConfig;
      const currentCollaborators = config.collaborators || [];
      const updatedCollaborators = currentCollaborators.filter(c => c.token !== token);
      
      const updatedConfig = { ...config, collaborators: updatedCollaborators };
      
      const { error: updateError } = await supabase
          .from('exams')
          .update({ config: updatedConfig })
          .eq('code', examCode);

      if (updateError) throw updateError;
  }

  async getExamByCollaboratorToken(code: string, token: string): Promise<{ exam: Exam, role: 'editor' | 'viewer' } | null> {
      const { data, error } = await supabase
          .from('exams')
          .select('*')
          .eq('code', code)
          .maybeSingle();

      if (error || !data) return null;

      const config = data.config as ExamConfig;
      const collaborators = config.collaborators || [];
      const collaborator = collaborators.find(c => c.token === token);

      if (!collaborator) return null;

      const exam: Exam = {
          code: data.code,
          authorId: data.author_id,
          authorName: 'Pengajar Utama',
          authorSchool: data.school,
          config: data.config,
          questions: data.questions,
          status: data.status
      };

      return { exam, role: collaborator.role };
  }

  async updateAnalyticsData(examCode: string, updates: Partial<ExamSummary>): Promise<void> {
      // SECURITY: Verify Super Admin
      await this._verifyRole(['super_admin']);

      // Try updating by exam_code which is the semantic key
      const { data, error } = await supabase
          .from('exam_summaries')
          .update(updates)
          .eq('exam_code', examCode)
          .select();

      if (error) throw error;
      
      if (!data || data.length === 0) {
          // Fallback: Try by ID if exam_code update returned nothing (though unlikely if exam_code is correct)
          // This handles cases where maybe exam_code is mutated? (Should not happen)
           throw new Error("Gagal memperbarui data. Data tidak ditemukan atau akun Super Admin Anda tidak memiliki izin RLS (Row Level Security) untuk mengedit data milik pengguna lain. Silakan hubungi teknisi untuk menambahkan kebijakan RLS.");
      }
  }
}

export const storageService = new StorageService();
