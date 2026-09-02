import { supabase } from '../lib/supabase';
import { authService } from './auth';
import type { Exam, Question, TeacherProfile, ExamConfig, ResultStatus } from '../types';
import { compressImage, calculateExamScore, cleanupQuestionContent } from '../components/teacher/examUtils';

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
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch {
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

// Helper: shuffle array (Fisher-Yates)
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

export class ExamService {
    sanitizeHtmlString(html: string): string {
        if (!html || typeof html !== 'string') return html;
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const allElements = doc.querySelectorAll('*');
            for (let i = 0; i < allElements.length; i++) {
                const el = allElements[i];
                const styleAttr = el.getAttribute('style');
                if (styleAttr && styleAttr.includes('--tw-')) {
                    const newStyle = styleAttr.split(';')
                        .map(style => style.trim())
                        .filter(style => style && !style.startsWith('--tw-'))
                        .join('; ');
                    
                    if (newStyle) {
                        el.setAttribute('style', newStyle);
                    } else {
                        el.removeAttribute('style');
                    }
                }
                
                if (el.classList.contains('chart-placeholder')) {
                    el.removeAttribute('style');
                    el.innerHTML = '<span class="chart-placeholder-text">📊 Diagram</span>';
                }
            }

            return doc.body.innerHTML;
        } catch {
            return html;
        }
    }

    stripAnswersFromQuestion(q: Question): Question {
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
    }

    sanitizeExamForStudent(exam: Exam, studentId?: string, includeAnswers = false): Exam {
        if (!studentId || studentId === 'monitor' || studentId === 'check_schedule') {
            let questionsToProcess = selectBankSoalQuestions([...exam.questions], exam.config);
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
                return includeAnswers ? sanitizedQ : this.stripAnswersFromQuestion(sanitizedQ);
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
            return includeAnswers ? sanitizedQ : this.stripAnswersFromQuestion(sanitizedQ);
        });

        return { ...exam, questions: finalQuestions };
    }

    async getExams(profile?: TeacherProfile): Promise<Record<string, Exam>> {
        if (profile && (profile.accountType === 'super_admin' || profile.accountType === 'admin_sekolah')) {
            const verified = await authService.getCurrentUser();
            if (!verified || verified.accountType !== profile.accountType) {
                console.warn("Security Alert: Profile mismatch detected in getExams. Enforcing server-side profile.");
                profile = verified || undefined;
            }
        }

        let query = supabase.from('exams').select('*');

        if (profile) {
            if (profile.accountType === 'super_admin') {
                // No Filter
            } else if (profile.accountType === 'admin_sekolah' && profile.school) {
                query = query.or(`school.eq."${profile.school}",author_id.eq.${profile.id}`);
            } else {
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

        try {
            const { data: fullData, error: fullError } = await supabase
                .from('exams')
                .select('*, profiles:author_id(full_name)')
                .eq('code', code)
                .maybeSingle();
            
            if (!fullError && fullData) {
                data = fullData;
            }
        } catch {
            console.warn("Attempt 1 (Full Fetch) failed, retrying with fallback...");
        }

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

        let includeAnswers = false;
        if (studentId && studentId !== 'monitor' && studentId !== 'check_schedule') {
            const { data: result } = await supabase.from('results').select('status').eq('exam_code', code).eq('student_id', studentId).maybeSingle();
            if (result && (result.status === 'completed' || result.status === 'force_closed')) {
                includeAnswers = exam.config.showResultToStudent;
            }
        }

        return this.sanitizeExamForStudent(exam, studentId, includeAnswers);
    }

    async getExamConfig(code: string): Promise<ExamConfig | null> {
        const { data, error } = await supabase.from('exams').select('config').eq('code', code).maybeSingle();
        if (error || !data) return null;
        return data.config;
    }

    async saveExam(exam: Exam): Promise<void> {
        const processedQuestions = exam.questions.map(q => {
            let qCopy = JSON.parse(JSON.stringify(q));
            if (typeof cleanupQuestionContent === 'function') {
                qCopy = cleanupQuestionContent(qCopy);
            }
            return qCopy;
        });
        const BUCKET_NAME = 'soal';
        const examCode = exam.code;

        const { data: existing } = await supabase.from('exams').select('code, author_id').eq('code', examCode).maybeSingle();
        
        let finalAuthorId = exam.authorId;

        if (existing) {
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
            const sanitizedHtml = this.sanitizeHtmlString(html);
            if (!sanitizedHtml || (!sanitizedHtml.includes('data:image') && !sanitizedHtml.includes('data:audio'))) return sanitizedHtml;
            const parser = new DOMParser();
            const doc = parser.parseFromString(sanitizedHtml, 'text/html');
            
            const images = doc.getElementsByTagName('img');
            for (let i = 0; i < images.length; i++) {
                const img = images[i];
                const src = img.getAttribute('src');
                if (src && src.startsWith('data:image')) {
                    try {
                        const blob = base64ToBlob(src);
                        const ext = src.substring(src.indexOf('/') + 1, src.indexOf(';'));
                        const filename = `${examCode}/${contextId}_img_${Date.now()}_${i}.${ext}`;
                        const { data } = await supabase.storage.from(BUCKET_NAME).upload(filename, blob, { upsert: true, cacheControl: '31536000' });
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
                        const { data } = await supabase.storage.from(BUCKET_NAME).upload(filename, blob, { upsert: true, cacheControl: '31536000' });
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
            if (q.questionText) q.questionText = this.sanitizeHtmlString(q.questionText);
            q.questionText = await processHtmlString(q.questionText, q.id);
            
            if (q.options) {
                for (let i = 0; i < q.options.length; i++) {
                    if (q.options[i]) q.options[i] = this.sanitizeHtmlString(q.options[i]);
                    q.options[i] = await processHtmlString(q.options[i], `${q.id}_opt_${i}`);
                }
            }
            if (q.trueFalseRows) {
                q.trueFalseRows = q.trueFalseRows.map((r: { text: string; answer?: boolean }) => ({ ...r, text: this.sanitizeHtmlString(r.text) }));
            }
            if (q.matchingPairs) {
                q.matchingPairs = q.matchingPairs.map((p: { left: string; right: string }) => ({ left: this.sanitizeHtmlString(p.left), right: this.sanitizeHtmlString(p.right) }));
            }
            if (q.correctAnswer && typeof q.correctAnswer === 'string') {
                q.correctAnswer = this.sanitizeHtmlString(q.correctAnswer);
            }

            if (q.imageUrl && q.imageUrl.startsWith('data:image')) {
                try {
                    const blob = base64ToBlob(q.imageUrl);
                    const mime = q.imageUrl.substring(5, q.imageUrl.indexOf(';'));
                    const ext = mime.split('/')[1] || 'png';
                    const filename = `${examCode}/${q.id}_img_${Date.now()}.${ext}`;
                    const { data } = await supabase.storage.from(BUCKET_NAME).upload(filename, blob, { upsert: true, cacheControl: '31536000' });
                    if (data) {
                        const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filename);
                        q.imageUrl = publicUrlData.publicUrl;
                    }
                } catch (e) { console.error("Upload image failed", e); }
            }

            if (q.audioUrl && q.audioUrl.startsWith('data:audio')) {
                 try {
                    const blob = base64ToBlob(q.audioUrl);
                    const mime = q.audioUrl.substring(5, q.audioUrl.indexOf(';'));
                    const ext = mime.split('/')[1] || 'mp3';
                    const filename = `${examCode}/${q.id}_audio_${Date.now()}.${ext}`;
                    
                    const { data } = await supabase.storage.from(BUCKET_NAME).upload(filename, blob, { upsert: true, cacheControl: '31536000' });
                    if (data) {
                        const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filename);
                        q.audioUrl = publicUrlData.publicUrl;
                    }
                } catch (e) { console.error("Gagal upload audio", e); }
            }
        }

        const { data, error } = await supabase.from('exams').update({
            school: exam.authorSchool,
            config: exam.config, 
            questions: processedQuestions, 
            status: exam.status || 'PUBLISHED'
        }).eq('code', exam.code).select();

        if (error) throw error;

        if (!data || data.length === 0) {
            console.warn("Update returned 0 rows. Attempting fallback strategies...");
            
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

            console.log("Attempting fallback upsert with existing author_id...");
            
            const { data: existingExam, error: fetchError } = await supabase
                .from('exams')
                .select('author_id')
                .eq('code', exam.code)
                .single();

            if (fetchError || !existingExam) {
                 console.error("Failed to fetch existing exam for fallback:", fetchError);
                 throw new Error("Gagal menyimpan perubahan. Ujian tidak ditemukan atau Anda tidak memiliki akses.");
            }

            const { error: upsertError } = await supabase.from('exams').upsert({
                code: exam.code,
                author_id: existingExam.author_id,
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

    async saveCollaboratorExam(exam: Exam, token: string): Promise<void> {
        console.log("Saving exam as collaborator...", { code: exam.code, token });
        const BUCKET_NAME = 'soal';
        const examCode = exam.code;

        const { data: existingExam, error: fetchError } = await supabase
            .from('exams')
            .select('*')
            .eq('code', exam.code)
            .single();

        if (fetchError || !existingExam) {
            console.error("Collaborator save failed: Exam not found", fetchError);
            throw new Error("Ujian tidak ditemukan.");
        }

        const config = existingExam.config as ExamConfig;
        const collaborators = config.collaborators || [];
        const collaborator = collaborators.find(c => c.token === token);

        if (!collaborator || collaborator.role !== 'editor') {
            throw new Error("Akses ditolak. Token kolaborator tidak valid atau Anda hanya memiliki akses 'viewer'.");
        }

        const processedQuestions = exam.questions.map(q => {
            let qCopy = JSON.parse(JSON.stringify(q));
            if (typeof cleanupQuestionContent === 'function') {
                qCopy = cleanupQuestionContent(qCopy);
            }
            return qCopy;
        });

        const processHtmlString = async (html: string, contextId: string): Promise<string> => {
            const sanitizedHtml = this.sanitizeHtmlString(html);
            if (!sanitizedHtml || (!sanitizedHtml.includes('data:image') && !sanitizedHtml.includes('data:audio'))) return sanitizedHtml;
            const parser = new DOMParser();
            const doc = parser.parseFromString(sanitizedHtml, 'text/html');
            
            const images = doc.getElementsByTagName('img');
            for (let i = 0; i < images.length; i++) {
                const img = images[i];
                const src = img.getAttribute('src');
                if (src && src.startsWith('data:image')) {
                    try {
                        const blob = base64ToBlob(src);
                        const ext = src.substring(src.indexOf('/') + 1, src.indexOf(';'));
                        const filename = `${examCode}/${contextId}_img_${Date.now()}_${i}.${ext}`;
                        const { data } = await supabase.storage.from(BUCKET_NAME).upload(filename, blob, { upsert: true, cacheControl: '31536000' });
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
                        const { data } = await supabase.storage.from(BUCKET_NAME).upload(filename, blob, { upsert: true, cacheControl: '31536000' });
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
            if (q.questionText) q.questionText = this.sanitizeHtmlString(q.questionText);
            q.questionText = await processHtmlString(q.questionText, q.id);
            
            if (q.options) {
                for (let i = 0; i < q.options.length; i++) {
                    if (q.options[i]) q.options[i] = this.sanitizeHtmlString(q.options[i]);
                    q.options[i] = await processHtmlString(q.options[i], `${q.id}_opt_${i}`);
                }
            }
            if (q.trueFalseRows) {
                q.trueFalseRows = q.trueFalseRows.map((r: { text: string; answer?: boolean }) => ({ ...r, text: this.sanitizeHtmlString(r.text) }));
            }
            if (q.matchingPairs) {
                q.matchingPairs = q.matchingPairs.map((p: { left: string; right: string }) => ({ left: this.sanitizeHtmlString(p.left), right: this.sanitizeHtmlString(p.right) }));
            }
            if (q.correctAnswer && typeof q.correctAnswer === 'string') {
                q.correctAnswer = this.sanitizeHtmlString(q.correctAnswer);
            }

            if (q.imageUrl && q.imageUrl.startsWith('data:image')) {
                try {
                    const blob = base64ToBlob(q.imageUrl);
                    const mime = q.imageUrl.substring(5, q.imageUrl.indexOf(';'));
                    const ext = mime.split('/')[1] || 'png';
                    const filename = `${examCode}/${q.id}_img_${Date.now()}.${ext}`;
                    const { data } = await supabase.storage.from(BUCKET_NAME).upload(filename, blob, { upsert: true, cacheControl: '31536000' });
                    if (data) {
                        const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filename);
                        q.imageUrl = publicUrlData.publicUrl;
                    }
                } catch (e) { console.error("Upload image failed", e); }
            }

            if (q.audioUrl && q.audioUrl.startsWith('data:audio')) {
                 try {
                    const blob = base64ToBlob(q.audioUrl);
                    const mime = q.audioUrl.substring(5, q.audioUrl.indexOf(';'));
                    const ext = mime.split('/')[1] || 'mp3';
                    const filename = `${examCode}/${q.id}_audio_${Date.now()}.${ext}`;
                    
                    const { data } = await supabase.storage.from(BUCKET_NAME).upload(filename, blob, { upsert: true, cacheControl: '31536000' });
                    if (data) {
                        const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filename);
                        q.audioUrl = publicUrlData.publicUrl;
                    }
                } catch (e) { console.error("Gagal upload audio", e); }
            }
        }

        const { error: rpcError } = await supabase.rpc('save_collaborator_exam', {
            p_exam_code: exam.code,
            p_token: token,
            p_new_config: {
                ...exam.config,
                collaborators: config.collaborators
            },
            p_new_questions: processedQuestions
        });

        if (!rpcError) {
            console.log("Collaborator save success (RPC)");
            return;
        }

        console.warn("Collaborator RPC failed. Make sure the SQL function is created in Supabase.", rpcError);
        throw new Error(`Gagal menyimpan. Pastikan fungsi SQL 'save_collaborator_exam' telah dibuat di Supabase. Error: ${rpcError.message}`);
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
        const updates = results.map((r: unknown) => {
            const row = r as Record<string, unknown>;
            const answers = row.answers as Record<string, string>;
            
            const { score, correctAnswers, totalQuestions } = calculateExamScore({ questions } as Exam, answers);

            return {
                id: row.id,
                exam_code: row.exam_code,
                student_id: row.student_id,
                student_name: row.student_name,
                class_name: row.class_name,
                status: row.status,
                answers: row.answers,
                activity_log: row.activity_log,
                location: row.location,
                unlock_token: row.unlock_token,
                score: score,
                correct_answers: correctAnswers,
                total_questions: totalQuestions,
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
}

export const examService = new ExamService();
