import { supabase } from '../lib/supabase';
import { authService } from './auth';
import type { Exam, Question, TeacherProfile, ExamConfig, ResultStatus } from '../types';
import { compressImage, calculateExamScore, cleanupQuestionContent, parseList } from '../components/teacher/examUtils';
import { uploadToCloudinary } from './cloudinary';
import { offlineService } from './offline';
import { clearExamLocalCache } from '../utils/cacheHygiene';
import { ContentModerator, ModerationError } from './contentModeration';

export { ModerationError };

// Helper: Get file extension safely from data URI
const getExtFromDataUrl = (dataUrl: string, defaultExt: string = 'png'): string => {
    if (!dataUrl) return defaultExt;
    const mimeMatch = dataUrl.match(/^data:([^;,]+)/);
    if (!mimeMatch) return defaultExt;
    const mime = mimeMatch[1].toLowerCase();
    if (mime.includes('svg')) return 'svg';
    if (mime.includes('png')) return 'png';
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
    if (mime.includes('webp')) return 'webp';
    if (mime.includes('gif')) return 'gif';
    if (mime.includes('mp3') || mime.includes('mpeg')) return 'mp3';
    if (mime.includes('wav')) return 'wav';
    if (mime.includes('ogg')) return 'ogg';
    const sub = mime.split('/')[1];
    return sub ? sub.replace(/[^a-zA-Z0-9]/g, '') : defaultExt;
};

// Helper: Convert Data URI (Base64, UTF-8 SVG, etc.) to Blob for Upload
const base64ToBlob = (dataUrl: string): Blob => {
    if (!dataUrl || typeof dataUrl !== 'string') {
        return new Blob([], { type: 'application/octet-stream' });
    }

    const commaIndex = dataUrl.indexOf(',');
    const header = commaIndex !== -1 ? dataUrl.slice(0, commaIndex) : '';
    let content = commaIndex !== -1 ? dataUrl.slice(commaIndex + 1) : dataUrl;

    const mimeMatch = header.match(/^data:([^;,]+)/);
    const mime = mimeMatch ? mimeMatch[1] : (header.includes('image') ? 'image/png' : 'application/octet-stream');
    const isBase64 = header.toLowerCase().includes(';base64') || commaIndex === -1;

    // If content contains URL encoding (like %20, %2B, %3D), decode it first
    if (content.includes('%')) {
        try {
            content = decodeURIComponent(content);
        } catch {
            // Keep original content if decode fails
        }
    }

    if (isBase64) {
        try {
            // Strip whitespace, newlines, and convert URL-safe base64
            let cleanB64 = content.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
            // Filter to only valid base64 characters
            cleanB64 = cleanB64.replace(/[^A-Za-z0-9+/=]/g, '');
            // Remove any trailing padding characters to correctly re-pad
            cleanB64 = cleanB64.replace(/=+$/, '');
            
            // Correct length modulo 4
            const remainder = cleanB64.length % 4;
            if (remainder === 2) {
                cleanB64 += '==';
            } else if (remainder === 3) {
                cleanB64 += '=';
            } else if (remainder === 1) {
                cleanB64 = cleanB64.slice(0, -1);
            }

            if (cleanB64.length > 0) {
                const bstr = atob(cleanB64);
                const u8arr = new Uint8Array(bstr.length);
                for (let i = 0; i < bstr.length; i++) {
                    u8arr[i] = bstr.charCodeAt(i);
                }
                return new Blob([u8arr], { type: mime });
            }
        } catch (e) {
            console.warn("Gagal atob base64, mencoba alternatif decodeURIComponent:", e);
        }
    }

    // Handle non-base64 or failed base64 data URIs (e.g. data:image/svg+xml;utf8,... or percent-encoded data URLs)
    try {
        const decoded = decodeURIComponent(content);
        return new Blob([decoded], { type: mime });
    } catch {
        return new Blob([content], { type: mime });
    }
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

// Helper: Upload media to Cloudinary (zero Supabase egress) with fallback to Supabase Storage
const uploadMediaWithFallback = async (
    src: string,
    examCode: string,
    contextId: string,
    type: 'img' | 'audio',
    index?: number
): Promise<{ url: string; bucketPath?: string } | null> => {
    // 1. Prioritize Cloudinary (Free egress, global CDN, auto-optimized)
    try {
        const cloudUrl = await uploadToCloudinary(src);
        if (cloudUrl) {
            return { url: cloudUrl };
        }
    } catch (err) {
        console.warn('Cloudinary upload attempt failed, falling back to Supabase Storage:', err);
    }

    // 2. Safe Fallback: Supabase Storage
    try {
        const defaultExt = type === 'img' ? 'png' : 'mp3';
        const blob = base64ToBlob(src);
        const ext = getExtFromDataUrl(src, defaultExt);
        const suffix = index !== undefined ? `_${index}` : '';
        const filename = `${examCode}/${contextId}_${type}_${Date.now()}${suffix}.${ext}`;
        const { data } = await supabase.storage.from('soal').upload(filename, blob, { upsert: true, cacheControl: '31536000' });
        if (data) {
            const { data: publicUrlData } = supabase.storage.from('soal').getPublicUrl(filename);
            return { url: publicUrlData.publicUrl, bucketPath: filename };
        }
    } catch (e) {
        console.error(`Fallback upload ${type} to Supabase failed:`, e);
    }
    return null;
};

// Helper: Bounded concurrency runner for media uploads
async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], limit = 4): Promise<T[]> {
    const results: T[] = new Array(tasks.length);
    let nextIndex = 0;
    const worker = async () => {
        while (nextIndex < tasks.length) {
            const current = nextIndex++;
            results[current] = await tasks[current]();
        }
    };
    const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
    await Promise.all(workers);
    return results;
}

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
        if (!html.includes('<')) return html;
        if (typeof DOMParser === 'undefined') return html;

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Security hardening: Strip dangerous tags (preserving raw LaTeX/text until render)
            const dangerousTags = ['script', 'iframe', 'object', 'embed', 'applet', 'meta', 'link', 'base', 'noscript'];
            dangerousTags.forEach((tag) => {
                const elements = doc.getElementsByTagName(tag);
                for (let i = elements.length - 1; i >= 0; i--) {
                    elements[i].parentNode?.removeChild(elements[i]);
                }
            });

            const isMathOrGeometryStyle = (el: Element) =>
                el.closest('.math-visual, .katex, .katex-html, .katex-mathml, .math-fallback, math, .MathJax, .mjx-container, .math-tex, .geometry-shape, svg') !== null;

            const styleElements = doc.getElementsByTagName('style');
            for (let i = styleElements.length - 1; i >= 0; i--) {
                if (!isMathOrGeometryStyle(styleElements[i])) {
                    styleElements[i].parentNode?.removeChild(styleElements[i]);
                }
            }

            const uriAttrs = ['href', 'src', 'xlink:href', 'formaction', 'action', 'poster'];
            const allElements = doc.body.querySelectorAll('*');
            for (let i = 0; i < allElements.length; i++) {
                const el = allElements[i];

                // Strip inline event handlers (on*)
                const attrs = el.attributes;
                for (let j = attrs.length - 1; j >= 0; j--) {
                    if (attrs[j].name.toLowerCase().startsWith('on')) {
                        el.removeAttribute(attrs[j].name);
                    }
                }

                // Strip dangerous URI schemes while keeping image/audio data URIs for storage upload
                uriAttrs.forEach((attrName) => {
                    const val = el.getAttribute(attrName);
                    if (val) {
                        const normalized = Array.from(val)
                            .filter((ch) => ch.charCodeAt(0) > 32)
                            .join('')
                            .toLowerCase();
                        const isDangerousProtocol =
                            normalized.startsWith('javascript:') ||
                            normalized.startsWith('vbscript:') ||
                            normalized.startsWith('data:text/html') ||
                            (normalized.startsWith('data:') &&
                             !normalized.startsWith('data:image/') &&
                             !normalized.startsWith('data:audio/'));
                        if (isDangerousProtocol) {
                            el.removeAttribute(attrName);
                        }
                    }
                });

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

    sanitizeConfigForStudent(config: ExamConfig, status?: string): ExamConfig {
        const clean = { ...(config || {}) } as ExamConfig;
        if (Array.isArray(clean.collaborators)) {
            clean.collaborators = clean.collaborators.map((c) => ({
                label: c.label,
                role: c.role,
                createdAt: c.createdAt,
                token: '',
            }));
        }
        if (status === 'closed') {
            clean.isFinished = true;
        }
        return clean;
    }

    stripAnswersFromQuestion(q: Question): Question {
        const sanitizedQ = { ...q, options: q.options ? [...q.options] : undefined } as Question;
        
        // SECURITY FIX: Remove correct answers & detailed solution steps before sending to client
        delete sanitizedQ.correctAnswer;
        delete sanitizedQ.solutionSteps;
        
        if (sanitizedQ.trueFalseRows) {
            sanitizedQ.trueFalseRows = sanitizedQ.trueFalseRows.map(row => {
                const newRow = { ...row };
                delete newRow.answer;
                return newRow;
            });
        }
        
        if (sanitizedQ.matchingPairs) {
            const rightList = sanitizedQ.matchingPairs.map(p => ({
                right: p.right,
                rightChart: p.rightChart
            }));
            const shuffledRight = shuffleArray(rightList);
            sanitizedQ.matchingPairs = sanitizedQ.matchingPairs.map((pair, idx) => ({
                left: pair.left,
                leftChart: pair.leftChart,
                right: shuffledRight[idx]?.right ?? pair.right,
                rightChart: shuffledRight[idx]?.rightChart,
                weight: pair.weight
            }));
        }
        
        return sanitizedQ;
    }

    buildStudentEdgeBundle(exam: Exam, version: number) {
        const cleanStatus = exam.status || 'PUBLISHED';
        const sanitizedConfig = this.sanitizeConfigForStudent(exam.config, cleanStatus);
        (sanitizedConfig as any).version = version;
        return {
            code: (exam.code || '').trim().toUpperCase(),
            authorId: exam.authorId,
            authorName: exam.authorName || (sanitizedConfig as any)?.authorName || 'Pengajar',
            authorSchool: exam.authorSchool || '',
            status: cleanStatus,
            version,
            config: sanitizedConfig,
            questions: (exam.questions || []).map(q => this.stripAnswersFromQuestion(q)),
        };
    }

    private async fetchEdgeMeta(
        code: string,
        isPreview = false
    ): Promise<{
        ok: boolean;
        statusCode: number;
        data?: {
            code: string;
            authorId?: string;
            authorName?: string;
            authorSchool?: string;
            status: string;
            version: number;
            config: ExamConfig;
        };
        errorCode?: string;
        networkError?: boolean;
    }> {
        try {
            const response = await fetch(`/api/exam-content/${code}/meta?preview=${isPreview}`);
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                return { ok: false, statusCode: response.status, networkError: true };
            }
            const json = await response.json();
            if (response.ok && json?.success && json?.config) {
                return {
                    ok: true,
                    statusCode: response.status,
                    data: {
                        code: json.code || code,
                        authorId: json.authorId,
                        authorName: json.authorName || json.config?.authorName || 'Pengajar',
                        authorSchool: json.authorSchool || '',
                        status: json.status || 'PUBLISHED',
                        version: typeof json.version === 'number' ? json.version : (json.config?.version || 1),
                        config: json.config as ExamConfig,
                    },
                };
            }
            return {
                ok: false,
                statusCode: response.status,
                errorCode: json?.error,
                networkError: response.status >= 500,
            };
        } catch {
            return { ok: false, statusCode: 0, networkError: true };
        }
    }

    sanitizeExamForStudent(exam: Exam, studentId?: string, includeAnswers = false): Exam {
        if (studentId === 'monitor') {
            return {
                ...exam,
                questions: includeAnswers ? exam.questions : exam.questions.map(q => this.stripAnswersFromQuestion(q))
            };
        }

        // ANTI-LEAK: Jika hanya memeriksa jadwal (misal kartu undangan / pre-login), jangan kirim naskah soal sama sekali
        if (studentId === 'check_schedule') {
            return { ...exam, questions: [] };
        }

        if (!studentId) {
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

    private static readonly LEGACY_TEACHER_EXAMS_KEY = 'ujiancerdas_saved_teacher_exams';
    private static readonly TEACHER_EXAM_INDEX_KEY = 'ujiancerdas_teacher_exam_index';
    private static readonly TEACHER_EXAM_IDB_PREFIX = 'teacher_exam_';
    private teacherExamsMemoryCache: Record<string, Exam> = {};
    private hasHydratedLocalExams = false;
    private hydratePromise: Promise<Record<string, Exam>> | null = null;

    private writeTeacherExamIndex(map: Record<string, Exam>) {
        try {
            if (typeof window === 'undefined') return;
            const index: Record<string, { code: string; authorId?: string; authorSchool?: string; status?: string; updatedAt: number }> = {};
            Object.values(map).forEach((ex) => {
                if (!ex?.code) return;
                index[ex.code] = {
                    code: ex.code,
                    authorId: ex.authorId,
                    authorSchool: ex.authorSchool,
                    status: ex.status,
                    updatedAt: Date.now()
                };
            });
            localStorage.setItem(ExamService.TEACHER_EXAM_INDEX_KEY, JSON.stringify(index));
        } catch (e) {
            console.warn("Failed to write lightweight teacher exam index:", e);
        }
    }

    private migrateLegacyLocalStorageCache(): Record<string, Exam> {
        try {
            if (typeof window === 'undefined') return {};
            const raw = localStorage.getItem(ExamService.LEGACY_TEACHER_EXAMS_KEY);
            if (!raw) return {};
            const parsed = JSON.parse(raw) as Record<string, Exam>;
            if (parsed && typeof parsed === 'object') {
                Object.values(parsed).forEach((ex) => {
                    if (ex?.code) {
                        this.teacherExamsMemoryCache[ex.code] = ex;
                        offlineService.saveLocalProgress(`${ExamService.TEACHER_EXAM_IDB_PREFIX}${ex.code}`, ex).catch(() => {});
                    }
                });
                this.writeTeacherExamIndex(this.teacherExamsMemoryCache);
                localStorage.removeItem(ExamService.LEGACY_TEACHER_EXAMS_KEY);
                return parsed;
            }
        } catch {
            /* ignore */
        }
        return {};
    }

    async getLocalTeacherExamsAsync(): Promise<Record<string, Exam>> {
        if (this.hasHydratedLocalExams) {
            return { ...this.teacherExamsMemoryCache };
        }
        if (this.hydratePromise) {
            return this.hydratePromise;
        }
        this.hydratePromise = (async () => {
            this.migrateLegacyLocalStorageCache();
            try {
                const fromIdb = await offlineService.getLocalProgressByPrefix<Exam>(ExamService.TEACHER_EXAM_IDB_PREFIX);
                Object.entries(fromIdb).forEach(([code, exam]) => {
                    if (exam && !this.teacherExamsMemoryCache[code]) {
                        this.teacherExamsMemoryCache[code] = exam;
                    }
                });
                if (Object.keys(this.teacherExamsMemoryCache).length > 0) {
                    this.writeTeacherExamIndex(this.teacherExamsMemoryCache);
                }
            } catch (e) {
                console.warn("Failed to hydrate teacher exams from IndexedDB:", e);
            }
            this.hasHydratedLocalExams = true;
            this.hydratePromise = null;
            return { ...this.teacherExamsMemoryCache };
        })();
        return this.hydratePromise;
    }

    getLocalTeacherExams(): Record<string, Exam> {
        this.migrateLegacyLocalStorageCache();
        return { ...this.teacherExamsMemoryCache };
    }

    saveLocalTeacherExam(exam: Exam) {
        try {
            if (typeof window === 'undefined' || !exam?.code) return;
            this.migrateLegacyLocalStorageCache();
            this.teacherExamsMemoryCache[exam.code] = exam;
            this.writeTeacherExamIndex(this.teacherExamsMemoryCache);
            offlineService.saveLocalProgress(`${ExamService.TEACHER_EXAM_IDB_PREFIX}${exam.code}`, exam).catch((err) => {
                console.warn("Failed to persist exam to IndexedDB:", err);
            });
        } catch (e) {
            console.warn("Failed to persist exam to local cache:", e);
        }
    }

    removeLocalTeacherExam(code: string) {
        try {
            if (typeof window === 'undefined') return;
            delete this.teacherExamsMemoryCache[code];
            this.writeTeacherExamIndex(this.teacherExamsMemoryCache);
            offlineService.clearLocalProgress(`${ExamService.TEACHER_EXAM_IDB_PREFIX}${code}`).catch(() => {});
        } catch (e) {
            console.warn("Failed to delete exam from local cache:", e);
        }
    }

    private withQuestionCountMetadata(config: ExamConfig, questions: Question[]): ExamConfig {
        const list = Array.isArray(questions) ? questions : [];
        const scorableCount = list.filter((q) => q?.questionType !== 'INFO').length;
        return {
            ...(config || ({} as ExamConfig)),
            totalQuestionCount: list.length,
            scorableQuestionCount: scorableCount,
        };
    }

    async getExams(profile?: TeacherProfile, options?: { includeQuestions?: boolean }): Promise<Record<string, Exam>> {
        if (profile && (profile.accountType === 'super_admin' || profile.accountType === 'admin_sekolah')) {
            const verified = await authService.getCurrentUser();
            if (!verified || verified.accountType !== profile.accountType) {
                console.warn("Security Alert: Profile mismatch detected in getExams. Enforcing server-side profile.");
                profile = verified || undefined;
            }
        }

        const includeQuestions = options?.includeQuestions ?? true;
        const selectColumns = includeQuestions
            ? 'code, author_id, school, config, questions, status, created_at'
            : 'code, author_id, school, config, status, created_at';

        const localExams = await this.getLocalTeacherExamsAsync();

        let query = supabase.from('exams').select(selectColumns);

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

        const examMap: Record<string, Exam> = {};
        if (data) {
            (data as unknown as Record<string, unknown>[]).forEach((row) => {
                const code = row.code as string;
                const config = row.config as ExamConfig;
                const status = row.status as 'DRAFT' | 'PUBLISHED';
                const serverVersion = typeof config?.version === 'number' ? config.version : undefined;

                if (includeQuestions) {
                    examMap[code] = {
                        code,
                        authorId: row.author_id as string,
                        authorSchool: row.school as string,
                        config,
                        questions: (row.questions as Question[]) || [],
                        questionsDeferred: false,
                        status,
                        version: serverVersion,
                        createdAt: row.created_at as string,
                    };
                } else {
                    const localMatch = localExams[code];
                    const localVersion = typeof localMatch?.config?.version === 'number'
                        ? localMatch.config.version
                        : localMatch?.version;
                    const canReuseLocalQuestions = Boolean(
                        localMatch &&
                        !localMatch.questionsDeferred &&
                        Array.isArray(localMatch.questions) &&
                        localMatch.questions.length > 0 &&
                        localMatch.status === status &&
                        (serverVersion === undefined || serverVersion === localVersion)
                    );

                    examMap[code] = {
                        code,
                        authorId: row.author_id as string,
                        authorSchool: row.school as string,
                        config,
                        questions: canReuseLocalQuestions ? localMatch.questions : [],
                        questionsDeferred: !canReuseLocalQuestions,
                        status,
                        version: serverVersion,
                        createdAt: row.created_at as string,
                    };
                }
            });
        } else if (error) {
            console.error("Error fetching exams from Supabase:", error);
        }

        // Merge local teacher exams cache (IndexedDB) to guarantee drafts and published exams never disappear
        Object.values(localExams).forEach((localExam) => {
            const isMatch = !profile ||
                profile.accountType === 'super_admin' ||
                localExam.authorId === profile.id ||
                (profile.accountType === 'admin_sekolah' && localExam.authorSchool === profile.school);

            if (isMatch) {
                if (!examMap[localExam.code]) {
                    examMap[localExam.code] = localExam;
                }
            }
        });

        return examMap;
    }

    async ensureExamQuestions(exam: Exam): Promise<Exam> {
        if (!exam?.code) return exam;
        if (!exam.questionsDeferred && Array.isArray(exam.questions) && exam.questions.length > 0) {
            return exam;
        }

        const cleanCode = exam.code.trim().toUpperCase();
        const targetVersion = typeof exam.config?.version === 'number' ? exam.config.version : exam.version;
        const localExams = await this.getLocalTeacherExamsAsync();
        const localMatch = localExams[cleanCode];

        if (
            localMatch &&
            !localMatch.questionsDeferred &&
            Array.isArray(localMatch.questions) &&
            localMatch.questions.length > 0
        ) {
            const localVersion = typeof localMatch.config?.version === 'number'
                ? localMatch.config.version
                : localMatch.version;
            if ((targetVersion === undefined || localVersion === targetVersion) && localMatch.status === exam.status) {
                return {
                    ...exam,
                    ...localMatch,
                    questions: localMatch.questions,
                    questionsDeferred: false,
                };
            }
        }

        try {
            const { data, error } = await supabase
                .from('exams')
                .select('code, author_id, school, config, questions, status, created_at')
                .eq('code', cleanCode)
                .maybeSingle();

            if (!error && data && Array.isArray(data.questions)) {
                const config = (data.config || exam.config) as ExamConfig;
                const hydrated: Exam = {
                    code: data.code,
                    authorId: data.author_id,
                    authorName: exam.authorName || (config as any)?.authorName,
                    authorSchool: data.school,
                    config,
                    questions: data.questions as Question[],
                    questionsDeferred: false,
                    status: data.status as 'DRAFT' | 'PUBLISHED',
                    createdAt: data.created_at,
                    version: typeof config?.version === 'number' ? config.version : exam.version,
                };
                this.saveLocalTeacherExam(hydrated);
                return hydrated;
            }
        } catch (err) {
            console.warn("ensureExamQuestions fetch failed, falling back to local cache:", err);
        }

        if (localMatch && Array.isArray(localMatch.questions) && localMatch.questions.length > 0) {
            return {
                ...exam,
                questions: localMatch.questions,
                questionsDeferred: false,
            };
        }

        return exam;
    }

    async checkLiveExamStatusForStudent(code: string): Promise<{ status?: string; config?: ExamConfig } | null> {
        const cleanCode = (code || '').trim().toUpperCase();
        if (!cleanCode) return null;

        const edgeMeta = await this.fetchEdgeMeta(cleanCode, false);
        if (edgeMeta.ok && edgeMeta.data) {
            return {
                status: edgeMeta.data.status,
                config: edgeMeta.data.config,
            };
        }

        const { data, error } = await supabase
            .from('exams')
            .select('status, config')
            .eq('code', cleanCode)
            .maybeSingle();

        if (error || !data) return null;
        return {
            status: data.status as string,
            config: this.sanitizeConfigForStudent(data.config as ExamConfig, data.status as string),
        };
    }

    async getExamForStudent(code: string, studentId?: string, isPreview = false): Promise<Exam | null> {
        const cleanCode = (code || '').trim().toUpperCase();

        // 0. FAST PATH FOR PREVIEW MODE (0ms latency, resilient against any DB schema/network issues)
        if (isPreview) {
            try {
                if (typeof window !== 'undefined') {
                    const previewCacheKey = `ujiancerdas_preview_exam_${cleanCode}`;
                    const rawPreview = localStorage.getItem(previewCacheKey);
                    if (rawPreview) {
                        const parsed = JSON.parse(rawPreview) as Exam;
                        if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
                            return this.sanitizeExamForStudent(parsed, studentId, true);
                        }
                    }
                }
            } catch (e) {
                console.warn("Preview cache check failed:", e);
            }

            const localExams = await this.getLocalTeacherExamsAsync();
            if (localExams[cleanCode] && Array.isArray(localExams[cleanCode].questions) && localExams[cleanCode].questions.length > 0) {
                return this.sanitizeExamForStudent(localExams[cleanCode], studentId, true);
            }
        }

        // 1. FAST PATH: Check Schedule / Pre-login (Vercel Edge meta first, zero questions payload)
        if (studentId === 'check_schedule') {
            const edgeMeta = await this.fetchEdgeMeta(cleanCode, isPreview);
            if (edgeMeta.errorCode === 'EXAM_IS_DRAFT' && !isPreview) {
                throw new Error("EXAM_IS_DRAFT");
            }
            if (edgeMeta.ok && edgeMeta.data) {
                if (edgeMeta.data.status === 'DRAFT' && !isPreview) {
                    throw new Error("EXAM_IS_DRAFT");
                }
                return {
                    code: edgeMeta.data.code,
                    authorId: edgeMeta.data.authorId,
                    authorName: edgeMeta.data.authorName || 'Pengajar',
                    authorSchool: edgeMeta.data.authorSchool,
                    config: edgeMeta.data.config,
                    questions: [],
                    status: edgeMeta.data.status as 'DRAFT' | 'PUBLISHED',
                    version: edgeMeta.data.version
                };
            }

            // Fallback to Supabase/local cache only if Edge meta was unavailable or missed
            let scheduleData: any = null;
            let scheduleError: any = null;
            try {
                const res = await supabase
                    .from('exams')
                    .select('code, author_id, school, config, status, created_at')
                    .eq('code', cleanCode)
                    .maybeSingle();
                scheduleData = res.data;
                scheduleError = res.error;
            } catch (e) {
                scheduleError = e;
            }

            if (scheduleError || !scheduleData) {
                const localExams = await this.getLocalTeacherExamsAsync();
                if (localExams[cleanCode]) {
                    const local = localExams[cleanCode];
                    return {
                        code: local.code,
                        authorId: local.authorId,
                        authorName: local.authorName || (local.config as any)?.authorName || 'Pengajar',
                        authorSchool: local.authorSchool,
                        config: local.config,
                        questions: [],
                        status: local.status,
                        version: local.config?.version || 1
                    };
                }
                throw new Error("EXAM_NOT_FOUND");
            }
            if (scheduleData.status === 'DRAFT' && !isPreview) throw new Error("EXAM_IS_DRAFT");

            return {
                code: scheduleData.code,
                authorId: scheduleData.author_id,
                authorName: scheduleData.author_name || scheduleData.config?.authorName || 'Pengajar',
                authorSchool: scheduleData.school,
                config: this.sanitizeConfigForStudent(scheduleData.config, scheduleData.status),
                questions: [],
                status: scheduleData.status,
                version: scheduleData.config?.version || 1
            };
        }

        // 2. Fetch exam metadata & allowed config directly from Vercel Edge first
        let metaData: {
            code: string;
            authorId?: string;
            authorName?: string;
            authorSchool?: string;
            config: ExamConfig;
            status: 'DRAFT' | 'PUBLISHED';
            version: number;
        } | null = null;

        const edgeMeta = await this.fetchEdgeMeta(cleanCode, isPreview);
        if (edgeMeta.errorCode === 'EXAM_IS_DRAFT' && !isPreview) {
            throw new Error("EXAM_IS_DRAFT");
        }
        if (edgeMeta.ok && edgeMeta.data) {
            metaData = {
                code: edgeMeta.data.code,
                authorId: edgeMeta.data.authorId,
                authorName: edgeMeta.data.authorName || 'Pengajar',
                authorSchool: edgeMeta.data.authorSchool,
                config: edgeMeta.data.config,
                status: edgeMeta.data.status as 'DRAFT' | 'PUBLISHED',
                version: edgeMeta.data.version
            };
        } else {
            // Fallback: Query safe metadata columns from Supabase if Edge meta did not succeed
            try {
                const metaRes = await supabase
                    .from('exams')
                    .select('code, author_id, school, config, status, created_at')
                    .eq('code', cleanCode)
                    .maybeSingle();

                if (!metaRes.error && metaRes.data) {
                    metaData = {
                        code: metaRes.data.code,
                        authorId: metaRes.data.author_id,
                        authorName: (metaRes.data.config as any)?.authorName || 'Pengajar',
                        authorSchool: metaRes.data.school,
                        config: this.sanitizeConfigForStudent(metaRes.data.config, metaRes.data.status),
                        status: metaRes.data.status,
                        version: (metaRes.data.config && typeof (metaRes.data.config as any).version === 'number')
                            ? (metaRes.data.config as any).version
                            : 1,
                    };
                }
            } catch { /* ignore */ }
        }

        if (!metaData) {
            try {
                if (typeof window !== 'undefined') {
                    const rawPreview = localStorage.getItem(`ujiancerdas_preview_exam_${cleanCode}`);
                    if (rawPreview) {
                        const parsed = JSON.parse(rawPreview) as Exam;
                        return this.sanitizeExamForStudent(parsed, studentId, isPreview);
                    }
                }
            } catch { /* ignore */ }

            const offlineExam = await offlineService.getLocalProgress(`offline_exam_${cleanCode}`) as Exam | null;
            if (offlineExam) {
                return this.sanitizeExamForStudent(offlineExam, studentId, isPreview);
            }
            const edgeBundle = await offlineService.getLocalProgress(`edge_bundle_${cleanCode}`) as {
                config?: ExamConfig;
                questions?: Question[];
                version?: number;
            } | null;
            if (edgeBundle && edgeBundle.config && Array.isArray(edgeBundle.questions) && edgeBundle.questions.length > 0) {
                const reconstructed: Exam = {
                    code: cleanCode,
                    config: edgeBundle.config,
                    questions: edgeBundle.questions,
                    status: edgeBundle.config.isFinished ? 'closed' : 'PUBLISHED',
                    version: edgeBundle.version || 1,
                };
                return this.sanitizeExamForStudent(reconstructed, studentId, isPreview);
            }
            const localExams = await this.getLocalTeacherExamsAsync();
            if (localExams[cleanCode]) {
                return this.sanitizeExamForStudent(localExams[cleanCode], studentId, isPreview);
            }
            throw new Error("EXAM_NOT_FOUND");
        }

        if (metaData.status === 'DRAFT' && !isPreview) throw new Error("EXAM_IS_DRAFT");

        const examVersion = metaData.version || 1;
        let loadedQuestions: Question[] = [];
        let resolvedConfig: ExamConfig = metaData.config;

        // 3. Check IndexedDB local cache matching current version
        const localCacheKey = `edge_bundle_${cleanCode}`;
        const localCached = await offlineService.getLocalProgress(localCacheKey) as {
            version: number;
            config?: ExamConfig;
            questions: Question[];
        } | null;

        if (localCached && localCached.version === examVersion && Array.isArray(localCached.questions) && localCached.questions.length > 0) {
            loadedQuestions = localCached.questions;
            if (!resolvedConfig && localCached.config) {
                resolvedConfig = localCached.config;
            }
        } else {
            // 4. Download complete student package (allowed config + stripped questions) directly from Vercel Edge CDN
            try {
                const response = await fetch(`/api/exam-content/${cleanCode}/test?v=${examVersion}&preview=${isPreview}`);
                const contentType = response.headers.get('content-type') || '';
                if (response.ok && contentType.includes('application/json')) {
                    const json = await response.json();
                    if (json.success && Array.isArray(json.questions)) {
                        loadedQuestions = json.questions;
                        if (json.config) {
                            resolvedConfig = json.config as ExamConfig;
                        }
                        await offlineService.saveLocalProgress(localCacheKey, {
                            version: examVersion,
                            config: resolvedConfig,
                            questions: loadedQuestions,
                            savedAt: Date.now()
                        });
                    }
                }
            } catch (edgeErr) {
                console.warn("Edge CDN fetch error, checking fallback caches:", edgeErr);
            }

            // Fallback 1: Direct Supabase query ONLY if Edge failed (will gracefully no-op for restricted anon role)
            if (loadedQuestions.length === 0 && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
                try {
                    const { data: directExam, error: directErr } = await supabase
                        .from('exams')
                        .select('questions, status')
                        .eq('code', cleanCode)
                        .maybeSingle();

                    if (!directErr && directExam && Array.isArray(directExam.questions)) {
                        if (directExam.status === 'DRAFT' && !isPreview) {
                            throw new Error("EXAM_IS_DRAFT");
                        }
                        const rawQs = directExam.questions as Question[];
                        loadedQuestions = isPreview
                            ? rawQs
                            : rawQs.map(q => this.stripAnswersFromQuestion(q));

                        if (loadedQuestions.length > 0) {
                            await offlineService.saveLocalProgress(localCacheKey, {
                                version: examVersion,
                                config: resolvedConfig,
                                questions: loadedQuestions,
                                savedAt: Date.now()
                            });
                        }
                    }
                } catch (directFallbackErr: any) {
                    if (directFallbackErr?.message === 'EXAM_IS_DRAFT') {
                        throw directFallbackErr;
                    }
                    console.warn("Supabase direct fallback error, checking local caches:", directFallbackErr);
                }
            }

            // Fallback 2: Check local cached/teacher questions if both Edge & direct DB failed
            if (loadedQuestions.length === 0) {
                const localExams = await this.getLocalTeacherExamsAsync();
                if (localExams[cleanCode] && Array.isArray(localExams[cleanCode].questions) && localExams[cleanCode].questions.length > 0) {
                    loadedQuestions = isPreview ? localExams[cleanCode].questions : localExams[cleanCode].questions.map(q => this.stripAnswersFromQuestion(q));
                } else if (localCached && Array.isArray(localCached.questions) && localCached.questions.length > 0) {
                    loadedQuestions = localCached.questions;
                } else {
                    const offlineExam = await offlineService.getLocalProgress(`offline_exam_${cleanCode}`) as Exam | null;
                    if (offlineExam && Array.isArray(offlineExam.questions) && offlineExam.questions.length > 0) {
                        loadedQuestions = isPreview ? offlineExam.questions : offlineExam.questions.map(q => this.stripAnswersFromQuestion(q));
                    }
                }
            }

            if (loadedQuestions.length === 0 && !isPreview) {
                const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
                throw new Error(isOffline ? 'OFFLINE_NO_LOCAL_EXAM' : 'EDGE_CONTENT_UNAVAILABLE');
            }
        }

        const exam: Exam = {
            code: metaData.code,
            authorId: metaData.authorId,
            authorName: metaData.authorName || (resolvedConfig as any)?.authorName || 'Pengajar',
            authorSchool: metaData.authorSchool,
            config: resolvedConfig,
            questions: loadedQuestions,
            status: metaData.status,
            version: examVersion
        };

        // Persist complete exam object locally for offline support
        await offlineService.saveLocalProgress(`offline_exam_${cleanCode}`, exam);

        let includeAnswers = false;
        if (studentId === 'monitor') {
            includeAnswers = !!exam.config.enablePublicStream || (exam.config.collaborators || []).some(c => c.role === 'public' || c.role === 'viewer');
        }

        return this.sanitizeExamForStudent(exam, studentId, includeAnswers);
    }

    /**
     * Fetch latest sanitized question bundle for live mid-exam updates (Edge CDN + Supabase fallback)
     */
    async fetchLatestQuestionsBundleForStudent(code: string, version: number): Promise<Question[] | null> {
        const cleanCode = (code || '').trim().toUpperCase();
        if (!cleanCode) return null;

        try {
            const response = await fetch(`/api/exam-content/${cleanCode}/test?v=${version}`);
            const contentType = response.headers.get('content-type') || '';
            if (response.ok && contentType.includes('application/json')) {
                const json = await response.json();
                if (json.success && Array.isArray(json.questions)) {
                    return json.questions as Question[];
                }
            }
        } catch {
            // Fall through to Supabase fallback
        }

        try {
            const { data, error } = await supabase
                .from('exams')
                .select('questions, status')
                .eq('code', cleanCode)
                .maybeSingle();
            if (!error && data && data.status !== 'DRAFT' && Array.isArray(data.questions)) {
                return (data.questions as Question[]).map(q => this.stripAnswersFromQuestion(q));
            }
        } catch {
            // ignore
        }

        return null;
    }

    /**
     * Fetch solutions and explanations with server-side authorization and zero-login ownership proof,
     * with guarded Supabase fallback if Edge endpoint is unavailable.
     */
    async getExamSolutions(
        code: string,
        studentId: string,
        proctorToken?: string,
        proof?: { deviceId?: string; resultId?: string | number }
    ): Promise<Record<string, any> | null> {
        const cleanCode = (code || '').trim().toUpperCase();
        try {
            const params = new URLSearchParams({
                studentId: studentId || '',
                token: proctorToken || '',
            });
            if (proof?.deviceId) params.set('deviceId', String(proof.deviceId));
            if (proof?.resultId !== undefined && proof?.resultId !== null) {
                params.set('resultId', String(proof.resultId));
            }
            const url = `/api/exam-content/${cleanCode}/solutions?${params.toString()}`;
            const res = await fetch(url);
            const contentType = res.headers.get('content-type') || '';
            if (res.ok && contentType.includes('application/json')) {
                const json = await res.json();
                if (json.success && json.solutions) {
                    return json.solutions;
                }
            } else if (res.status === 403) {
                return null;
            }
        } catch (e) {
            console.warn("Failed to fetch solutions from edge endpoint, trying Supabase fallback:", e);
        }

        // Guarded Supabase fallback when edge endpoint is unreachable/404/503
        try {
            const { data: examRow, error: examErr } = await supabase
                .from('exams')
                .select('config, questions')
                .eq('code', cleanCode)
                .maybeSingle();

            if (examErr || !examRow) return null;

            const cfg = (examRow.config || {}) as ExamConfig;
            const isSolutionsAllowed = Boolean(
                cfg.showCorrectAnswer || cfg.showHints || cfg.showSolutionSteps || cfg.showResultToStudent
            );

            let authorized = false;
            if (studentId === 'monitor' && cfg.enablePublicStream) {
                authorized = true;
            } else if (proctorToken && Array.isArray(cfg.collaborators)) {
                authorized = cfg.collaborators.some(
                    c => c.token === proctorToken && (c.role === 'editor' || c.role === 'viewer')
                );
            } else if (studentId && studentId !== 'monitor' && isSolutionsAllowed) {
                const { data: resultRow } = await supabase
                    .from('results')
                    .select('id, status, device_id, answers')
                    .eq('exam_code', cleanCode)
                    .eq('student_id', studentId)
                    .maybeSingle();

                if (resultRow && (resultRow.status === 'completed' || resultRow.status === 'force_closed')) {
                    const dbDeviceId = String(resultRow.device_id || (resultRow.answers as Record<string, unknown> | null)?._deviceId || '').trim();
                    const dbResultId = resultRow.id ? String(resultRow.id) : '';
                    const providedDeviceId = String(proof?.deviceId || '').trim();
                    const providedResultId = proof?.resultId !== undefined && proof?.resultId !== null ? String(proof.resultId).trim() : '';

                    authorized = dbDeviceId
                        ? Boolean(providedDeviceId) && providedDeviceId === dbDeviceId
                        : Boolean(dbResultId) && Boolean(providedResultId) && providedResultId === dbResultId;
                }
            }

            if (!authorized || !Array.isArray(examRow.questions)) {
                return null;
            }

            const solutions: Record<string, any> = {};
            (examRow.questions as Question[]).forEach(q => {
                solutions[q.id] = {
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation,
                    solutionSteps: q.solutionSteps,
                    trueFalseRows: q.trueFalseRows?.map(r => ({ text: r.text, answer: r.answer })),
                    matchingPairs: q.matchingPairs?.map(m => ({ left: m.left, right: m.right })),
                };
            });
            return solutions;
        } catch {
            return null;
        }
    }

    /**
     * Subscribe to live exam version updates:
     * - Primary: Supabase Realtime channel (if enabled)
     * - Fallback: Staggered lightweight version polling (~3m + random jitter, <50 bytes)
     */
    subscribeToExamVersionUpdates(
        code: string,
        currentVersion: number,
        onUpdate: (newVersion: number) => void,
        disableRealtime = true
    ): () => void {
        const cleanCode = (code || '').trim().toUpperCase();
        let active = true;

        // 1. Supabase Realtime Listener (ONLY when Realtime is explicitly enabled)
        const channel = !disableRealtime
            ? supabase
                .channel(`exam_live_version_${cleanCode}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'exams',
                        filter: `code=eq.${cleanCode}`
                    },
                    (payload: any) => {
                        const newVer = payload.new?.config?.version;
                        if (typeof newVer === 'number' && newVer > currentVersion) {
                            onUpdate(newVer);
                        }
                    }
                )
                .subscribe()
            : null;

        // 2. Normal Mode Fallback: Staggered Periodic Check (Vercel Edge meta first, <500 bytes, fallback Supabase)
        const jitterMs = Math.floor(Math.random() * 20000) + 180000;
        const timerId = setInterval(async () => {
            if (!active) return;
            try {
                const edgeMeta = await this.fetchEdgeMeta(cleanCode, false);
                if (edgeMeta.ok && edgeMeta.data) {
                    const ver = edgeMeta.data.version;
                    if (typeof ver === 'number' && ver > currentVersion) {
                        onUpdate(ver);
                    }
                    return;
                }

                const { data } = await supabase
                    .from('exams')
                    .select('config')
                    .eq('code', cleanCode)
                    .maybeSingle();

                const ver = (data?.config as any)?.version;
                if (typeof ver === 'number' && ver > currentVersion) {
                    onUpdate(ver);
                }
            } catch {
                /* silent fallback */
            }
        }, jitterMs);

        return () => {
            active = false;
            clearInterval(timerId);
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }

    async getExamConfig(code: string): Promise<ExamConfig | null> {
        const cleanCode = (code || '').trim().toUpperCase();
        const edgeMeta = await this.fetchEdgeMeta(cleanCode, false);
        if (edgeMeta.ok && edgeMeta.data?.config) {
            return edgeMeta.data.config;
        }
        const { data, error } = await supabase.from('exams').select('config').eq('code', cleanCode).maybeSingle();
        if (error || !data) return null;
        return this.sanitizeConfigForStudent(data.config);
    }

    async getExamConfigStatus(code: string): Promise<{ config: ExamConfig | null; isNetworkError: boolean }> {
        const cleanCode = (code || '').trim().toUpperCase();
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            const offlineExam = await offlineService.getLocalProgress(`offline_exam_${cleanCode}`) as Exam | null;
            return { config: offlineExam?.config || null, isNetworkError: true };
        }
        try {
            // Primary: Read allowed exam config directly from Vercel Edge
            const edgeMeta = await this.fetchEdgeMeta(cleanCode, false);
            if (edgeMeta.ok && edgeMeta.data?.config) {
                const resolvedConfig: ExamConfig = edgeMeta.data.status === 'closed'
                    ? { ...edgeMeta.data.config, isFinished: true }
                    : edgeMeta.data.config;
                return { config: resolvedConfig, isNetworkError: false };
            }
            if (edgeMeta.errorCode === 'EXAM_IS_DRAFT') {
                return { config: null, isNetworkError: false };
            }

            // Fallback: Query Supabase safe config column if Edge missed/unavailable
            const { data, error } = await supabase.from('exams').select('config, status').eq('code', cleanCode).maybeSingle();
            if (error) {
                const msg = String(error.message || '').toLowerCase();
                const isNet = !error.code || msg.includes('failed to fetch') || msg.includes('network');
                if (isNet) {
                    const offlineExam = await offlineService.getLocalProgress(`offline_exam_${cleanCode}`) as Exam | null;
                    return { config: offlineExam?.config || null, isNetworkError: true };
                }
                return { config: null, isNetworkError: false };
            }
            if (!data?.config) {
                return { config: null, isNetworkError: false };
            }
            const resolvedConfig = this.sanitizeConfigForStudent(data.config, data.status);
            return { config: resolvedConfig, isNetworkError: false };
        } catch {
            const offlineExam = await offlineService.getLocalProgress(`offline_exam_${cleanCode}`) as Exam | null;
            return { config: offlineExam?.config || null, isNetworkError: true };
        }
    }

    private async prepareQuestionsForSave(questions: Question[], examCode: string): Promise<Question[]> {
        const processedQuestions: Question[] = (questions || []).map(q => {
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
                        const res = await uploadMediaWithFallback(src, examCode, contextId, 'img', i);
                        if (res) {
                            img.setAttribute('src', res.url);
                            if (res.bucketPath) img.setAttribute('data-bucket-path', res.bucketPath);
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
                        const res = await uploadMediaWithFallback(src, examCode, contextId, 'audio', i);
                        if (res) {
                            audio.setAttribute('src', res.url);
                            if (res.bucketPath) audio.setAttribute('data-bucket-path', res.bucketPath);
                        }
                    } catch (e) { console.error("Gagal upload audio", e); }
                }
            }

            return doc.body.innerHTML;
        };

        await runWithConcurrency(
            processedQuestions.map((q) => async () => {
                if (q.questionText) q.questionText = this.sanitizeHtmlString(q.questionText);
                q.questionText = await processHtmlString(q.questionText, q.id);

                if (q.options) {
                    for (let i = 0; i < q.options.length; i++) {
                        if (q.options[i]) q.options[i] = this.sanitizeHtmlString(q.options[i]);
                        q.options[i] = await processHtmlString(q.options[i], `${q.id}_opt_${i}`);
                    }
                }
                if (q.hint) {
                    q.hint = await processHtmlString(this.sanitizeHtmlString(q.hint), `${q.id}_hint`);
                }
                if (q.solutionSteps) {
                    q.solutionSteps = await processHtmlString(this.sanitizeHtmlString(q.solutionSteps), `${q.id}_steps`);
                }
                if (q.trueFalseRows) {
                    q.trueFalseRows = q.trueFalseRows.map((r: { text: string; answer?: boolean }) => ({ ...r, text: this.sanitizeHtmlString(r.text) }));
                }
                if (q.categoryLabels && Array.isArray(q.categoryLabels)) {
                    q.categoryLabels = q.categoryLabels.map((l: string) => this.sanitizeHtmlString(String(l))) as [string, string];
                }
                if (q.matchingPairs) {
                    q.matchingPairs = q.matchingPairs.map((p: { left: string; right: string }) => ({ left: this.sanitizeHtmlString(p.left), right: this.sanitizeHtmlString(p.right) }));
                }
                if (q.correctAnswer && typeof q.correctAnswer === 'string') {
                    if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
                        const parsed = parseList(q.correctAnswer, q.options);
                        q.correctAnswer = JSON.stringify(
                            (parsed || []).map((opt: string) => this.sanitizeHtmlString(opt))
                        );
                    } else {
                        q.correctAnswer = this.sanitizeHtmlString(q.correctAnswer);
                    }
                }

                if (q.imageUrl && q.imageUrl.startsWith('data:image')) {
                    try {
                        const res = await uploadMediaWithFallback(q.imageUrl, examCode, q.id, 'img');
                        if (res) q.imageUrl = res.url;
                    } catch (e) { console.error("Upload image failed", e); }
                }

                if (q.audioUrl && q.audioUrl.startsWith('data:audio')) {
                    try {
                        const res = await uploadMediaWithFallback(q.audioUrl, examCode, q.id, 'audio');
                        if (res) q.audioUrl = res.url;
                    } catch (e) { console.error("Gagal upload audio", e); }
                }
            }),
            4
        );

        return processedQuestions;
    }

    /**
     * Push sanitized student-allowed exam bundle to Vercel Edge origin and prime CDN GET caches
     * whenever a teacher publishes or updates a non-DRAFT exam.
     */
    private async warmExamEdgeCache(examOrCode: Exam | string, version: number, status?: string): Promise<void> {
        const cleanCode = (typeof examOrCode === 'string' ? examOrCode : examOrCode?.code || '').trim().toUpperCase();
        if (!cleanCode || status === 'DRAFT') {
            return;
        }
        try {
            const examBundle = typeof examOrCode === 'string' ? undefined : this.buildStudentEdgeBundle(examOrCode, version);
            const warmTask = (async () => {
                await fetch(`/api/exam-content/${cleanCode}/warm?v=${version}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(examBundle ? { code: cleanCode, examBundle } : { code: cleanCode }),
                }).catch(() => {});

                await Promise.allSettled([
                    fetch(`/api/exam-content/${cleanCode}/meta?preview=false`, { method: 'GET' }),
                    fetch(`/api/exam-content/${cleanCode}/test?v=${version}&preview=false`, { method: 'GET' }),
                ]);
            })();

            await Promise.race([
                warmTask,
                new Promise<void>((resolve) => setTimeout(resolve, 2500)),
            ]);
        } catch { /* ignore */ }
    }

    async saveExam(exam: Exam, options?: { bypassConfirmation?: boolean }): Promise<void> {
        // Content Moderation Check (SARA, Pornography, Bullying, etc.)
        if (!options?.bypassConfirmation) {
            const moderation = await ContentModerator.validateExamContent(exam);
            if (!moderation.isValid) {
                throw new ModerationError(moderation.issues);
            }
        }

        // Immediate local cache save to prevent data loss or UI disappearance
        this.saveLocalTeacherExam(exam);

        if (exam.config && (exam.config.examMode || '').trim().toUpperCase() === 'PR') {
            exam.config.detectBehavior = false;
            exam.config.continueWithPermission = false;
            exam.config.trackLocation = false;
        }

        const examCode = exam.code;

        const { data: existing } = await supabase.from('exams').select('code, author_id, config').eq('code', examCode).maybeSingle();
        const existingVersion = (existing?.config && typeof (existing.config as any).version === 'number') ? (existing.config as any).version : 1;
        const nextVersion = existing ? existingVersion + 1 : 1;
        if (!exam.config) exam.config = {} as any;
        (exam.config as any).version = nextVersion;
        
        let finalAuthorId = exam.authorId;

        if (existing) {
            finalAuthorId = existing.author_id;
        } else {
            const { error: initError } = await supabase.from('exams').insert({
                code: exam.code, 
                author_id: finalAuthorId, 
                school: exam.authorSchool || "",
                config: exam.config, 
                questions: [], 
                status: 'DRAFT'
            });
            if (initError) throw initError;
        }

        const processedQuestions = await this.prepareQuestionsForSave(exam.questions, examCode);
        exam.config = this.withQuestionCountMetadata(exam.config, processedQuestions);
        const resolvedStatus = exam.status || 'PUBLISHED';
        const publishedExamSnapshot: Exam = {
            ...exam,
            authorId: finalAuthorId,
            questions: processedQuestions,
            questionsDeferred: false,
            status: resolvedStatus,
            version: nextVersion,
        };
        this.saveLocalTeacherExam(publishedExamSnapshot);

        const { data, error } = await supabase.from('exams').update({
            school: exam.authorSchool || "",
            config: exam.config, 
            questions: processedQuestions, 
            status: resolvedStatus
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
                await this.syncRegisteredStudents(exam);
                await this.warmExamEdgeCache(publishedExamSnapshot, nextVersion, resolvedStatus);
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
                status: resolvedStatus
            }, { onConflict: 'code' });

            if (upsertError) {
                console.error("Fallback upsert failed:", upsertError);
                throw new Error(`Gagal menyimpan perubahan. Izin ditolak oleh server (RLS). Pastikan Anda login atau memiliki akses edit yang valid. (Error: ${upsertError.message})`);
            }
        }

        await this.syncRegisteredStudents(exam);

        // Push sanitized student bundle & warm Vercel Edge CDN cache (published/active exams only)
        await this.warmExamEdgeCache(publishedExamSnapshot, nextVersion, resolvedStatus);
    }

    private async syncRegisteredStudents(exam: Exam): Promise<void> {
        if (!exam.config || !exam.config.registeredStudents || exam.config.registeredStudents.length === 0) {
            return;
        }
        try {
            const recordsToInsert = exam.config.registeredStudents.map((s) => ({
                exam_code: exam.code,
                school_name: s.school_name || s.schoolName || exam.authorSchool || '',
                class_name: s.class_name || s.className || '',
                student_name: s.student_name || s.fullName || '',
                absent_number: s.absent_number || s.absentNumber || null,
                is_active: false,
            }));

            // Backup existing records before replacing so transient insert failures never wipe registered students
            const { data: backupRows } = await supabase
                .from('registered_students')
                .select('exam_code, school_name, class_name, student_name, absent_number, is_active')
                .eq('exam_code', exam.code);

            const { error: delErr } = await supabase.from('registered_students').delete().eq('exam_code', exam.code);
            if (delErr) {
                console.warn("Delete existing registered_students failed, aborting replace:", delErr);
                return;
            }

            const BATCH_SIZE = 200;
            let insertFailed = false;
            for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
                const batch = recordsToInsert.slice(i, i + BATCH_SIZE);
                const { error: regErr } = await supabase.from('registered_students').insert(batch);
                if (regErr) {
                    console.warn("Sync to registered_students batch failed:", regErr);
                    insertFailed = true;
                    break;
                }
            }

            if (insertFailed && backupRows && backupRows.length > 0) {
                await supabase.from('registered_students').delete().eq('exam_code', exam.code);
                for (let i = 0; i < backupRows.length; i += BATCH_SIZE) {
                    await supabase.from('registered_students').insert(backupRows.slice(i, i + BATCH_SIZE));
                }
            } else if (!insertFailed) {
                console.log(`Berhasil menyinkronkan ${recordsToInsert.length} data siswa ke tabel registered_students.`);
            }
        } catch (syncErr) {
            console.warn("Gagal menyinkronkan registered_students:", syncErr);
        }
    }

    async saveCollaboratorExam(exam: Exam, token: string): Promise<void> {
        console.log("Saving exam as collaborator...", { code: exam.code, token });
        const examCode = exam.code;

        const { data: existingExam, error: fetchError } = await supabase
            .from('exams')
            .select('code, config, status')
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

        const currentVersion = typeof (config as any).version === 'number' ? (config as any).version : 1;
        const nextVersion = currentVersion + 1;
        const processedQuestions = await this.prepareQuestionsForSave(exam.questions, examCode);

        const nextConfig = this.withQuestionCountMetadata({
            ...exam.config,
            collaborators: config.collaborators,
            version: nextVersion
        }, processedQuestions);

        const { error: rpcError } = await supabase.rpc('save_collaborator_exam', {
            p_exam_code: exam.code,
            p_token: token,
            p_new_config: nextConfig,
            p_new_questions: processedQuestions
        });

        if (!rpcError) {
            console.log("Collaborator save success (RPC)");
            const resolvedStatus = (exam.status || (existingExam as { status?: string }).status || 'PUBLISHED') as 'DRAFT' | 'PUBLISHED';
            await this.warmExamEdgeCache(
                { ...exam, config: nextConfig, questions: processedQuestions, status: resolvedStatus },
                nextVersion,
                resolvedStatus
            );
            return;
        }

        console.warn("Collaborator RPC failed. Make sure the SQL function is created in Supabase.", rpcError);
        throw new Error(`Gagal menyimpan. Pastikan fungsi SQL 'save_collaborator_exam' telah dibuat di Supabase. Error: ${rpcError.message}`);
    }

    async deleteExam(code: string): Promise<void> {
        const cleanCode = (code || '').trim().toUpperCase();
        if (!cleanCode) return;

        this.removeLocalTeacherExam(cleanCode);
        await clearExamLocalCache(cleanCode);

        await supabase.from('registered_students').delete().eq('exam_code', cleanCode);
        await supabase.from('results').delete().eq('exam_code', cleanCode);
        await supabase.from('exams').delete().eq('code', cleanCode);
        const { data: files } = await supabase.storage.from('soal').list(cleanCode);
        if (files && files.length > 0) {
            const paths = files.map(f => `${cleanCode}/${f.name}`);
            await supabase.storage.from('soal').remove(paths);
        }
    }

    async getExamForArchive(code: string): Promise<Exam | null> {
        const { data, error } = await supabase.from('exams').select('code, author_id, school, config, questions, status, created_at').eq('code', code).maybeSingle();
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
            if (q.hint) {
                q.hint = await revertHtmlImages(q.hint);
            }
            if (q.solutionSteps) {
                q.solutionSteps = await revertHtmlImages(q.solutionSteps);
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
            .select('questions, config, status')
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

        // Bump version so Edge CDN & active clients pick up changes cleanly
        const existingConfig = (examData.config || {}) as ExamConfig;
        const currentVersion = typeof (existingConfig as any).version === 'number' ? (existingConfig as any).version : 1;
        const nextVersion = currentVersion + 1;
        const nextConfig: ExamConfig = { ...existingConfig, version: nextVersion };

        // 3. Save Exam
        const { error: updateError } = await supabase
            .from('exams')
            .update({ questions, config: nextConfig })
            .eq('code', examCode);

        if (updateError) throw updateError;

        // Push updated bundle & prime Edge CDN (published/active exams only)
        const resolvedStatus = ((examData as { status?: string }).status || 'PUBLISHED') as 'DRAFT' | 'PUBLISHED';
        await this.warmExamEdgeCache(
            {
                code: examCode,
                config: nextConfig,
                questions,
                status: resolvedStatus,
                version: nextVersion,
            },
            nextVersion,
            resolvedStatus
        );

        // 4. Fetch All Results with 1000-row range pagination
        const PAGE_SIZE = 1000;
        const allResults: Record<string, unknown>[] = [];
        let from = 0;
        while (true) {
            const { data: pageRows, error: resultsError } = await supabase
                .from('results')
                .select('*')
                .eq('exam_code', examCode)
                .range(from, from + PAGE_SIZE - 1);

            if (resultsError) throw resultsError;
            if (!pageRows || pageRows.length === 0) break;
            allResults.push(...(pageRows as Record<string, unknown>[]));
            if (pageRows.length < PAGE_SIZE) break;
            from += PAGE_SIZE;
        }

        // 5. Recalculate Scores
        const updates = allResults.map((row) => {
            const answers = row.answers as Record<string, string>;
            const { score, correctAnswers, totalQuestions } = calculateExamScore({ questions, config: nextConfig } as Exam, answers);

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

        // 6. Bulk Update Results in safe batches
        const BATCH_SIZE = 200;
        for (let i = 0; i < updates.length; i += BATCH_SIZE) {
            const { error: bulkError } = await supabase
                .from('results')
                .upsert(updates.slice(i, i + BATCH_SIZE));
            if (bulkError) throw bulkError;
        }
    }

    async addCollaborator(examCode: string, label: string, role: 'editor' | 'viewer' | 'public'): Promise<string> {
        const cleanCode = (examCode || '').trim().toUpperCase();
        let config: ExamConfig | null = null;
        let localExam: Exam | null = null;

        const { data } = await supabase
            .from('exams')
            .select('config')
            .eq('code', cleanCode)
            .maybeSingle();

        if (data && data.config) {
            config = data.config as ExamConfig;
        }

        const localExams = await this.getLocalTeacherExamsAsync();
        if (localExams[cleanCode]) {
            localExam = localExams[cleanCode];
            if (!config) config = localExam.config;
        }

        if (!config) {
            config = {
                examName: 'Ujian Baru',
                subject: 'Umum',
                durationMinutes: 60,
                shuffleQuestions: false,
                shuffleAnswers: false,
                showScore: true,
                collaborators: []
            };
        }

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

        // Save locally first so UI updates immediately
        if (localExam) {
            localExam.config = updatedConfig;
            this.saveLocalTeacherExam(localExam);
        }

        // Save to Supabase
        try {
            await supabase
                .from('exams')
                .update({ config: updatedConfig })
                .eq('code', cleanCode);
        } catch (e) {
            console.warn("Supabase update for addCollaborator failed, relying on local cache:", e);
        }

        return token;
    }

    async removeCollaborator(examCode: string, token: string): Promise<void> {
        const cleanCode = (examCode || '').trim().toUpperCase();
        let config: ExamConfig | null = null;
        let localExam: Exam | null = null;

        const { data } = await supabase
            .from('exams')
            .select('config')
            .eq('code', cleanCode)
            .maybeSingle();

        if (data && data.config) {
            config = data.config as ExamConfig;
        }

        const localExams = await this.getLocalTeacherExamsAsync();
        if (localExams[cleanCode]) {
            localExam = localExams[cleanCode];
            if (!config) config = localExam.config;
        }

        if (!config) return;

        const currentCollaborators = config.collaborators || [];
        const updatedCollaborators = currentCollaborators.filter(c => c.token !== token);
        const updatedConfig = { ...config, collaborators: updatedCollaborators };

        if (localExam) {
            localExam.config = updatedConfig;
            this.saveLocalTeacherExam(localExam);
        }

        try {
            await supabase
                .from('exams')
                .update({ config: updatedConfig })
                .eq('code', cleanCode);
        } catch (e) {
            console.warn("Supabase update for removeCollaborator failed:", e);
        }
    }

    async getExamByCollaboratorToken(code: string, token: string): Promise<{ exam: Exam, role: 'editor' | 'viewer' | 'public' } | null> {
        const cleanCode = (code || '').trim().toUpperCase();

        const { data, error } = await supabase
            .from('exams')
            .select('code, author_id, school, config, questions, status')
            .eq('code', cleanCode)
            .maybeSingle();

        let exam: Exam | null = null;
        if (data && !error) {
            exam = {
                code: data.code,
                authorId: data.author_id,
                authorName: (data.config as any)?.authorName || 'Pengajar Utama',
                authorSchool: data.school,
                config: data.config,
                questions: data.questions,
                status: data.status
            };
        } else {
            // Anon column permissions revoke SELECT on `questions`: query safe columns and hydrate questions from Vercel Edge
            const { data: metaRow } = await supabase
                .from('exams')
                .select('code, author_id, school, config, status')
                .eq('code', cleanCode)
                .maybeSingle();

            if (metaRow) {
                const version = (metaRow.config as any)?.version || 1;
                let fetchedQuestions: Question[] = [];
                try {
                    const edgeRes = await fetch(`/api/exam-content/${cleanCode}/test?v=${version}&preview=${metaRow.status === 'DRAFT'}`);
                    const ct = edgeRes.headers.get('content-type') || '';
                    if (edgeRes.ok && ct.includes('application/json')) {
                        const json = await edgeRes.json();
                        if (json.success && Array.isArray(json.questions)) {
                            fetchedQuestions = json.questions;
                        }
                    }
                } catch { /* ignore */ }

                exam = {
                    code: metaRow.code,
                    authorId: metaRow.author_id,
                    authorName: (metaRow.config as any)?.authorName || 'Pengajar Utama',
                    authorSchool: metaRow.school,
                    config: metaRow.config,
                    questions: fetchedQuestions,
                    status: metaRow.status
                };
            } else {
                const localExams = await this.getLocalTeacherExamsAsync();
                if (localExams[cleanCode]) {
                    exam = localExams[cleanCode];
                }
            }
        }

        if (!exam) return null;

        const config = exam.config as ExamConfig;
        const collaborators = config?.collaborators || [];
        const collaborator = collaborators.find(c => c.token === token);

        if (!collaborator) return null;

        return { exam, role: collaborator.role };
    }
}

export const examService = new ExamService();
