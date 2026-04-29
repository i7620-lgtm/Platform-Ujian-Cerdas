 
import type { Question, QuestionType, Exam, Result } from '../../types';

// --- INTERFACES ---
interface VisualLine {
    text: string;
    pageIdx: number;
    top: number;    
    bottom: number;
    left: number;   
    width: number;
    height: number;
}

interface Anchor {
    type: 'QUESTION' | 'OPTION';
    id: string; // "1", "A", etc.
    pageIdx: number;
    text: string;
    x: number;
    y: number; // Top Y
    bottom: number; // Bottom Y of the anchor line
    lineHeight: number;
}

interface PageData {
    canvas: HTMLCanvasElement;
    width: number;
    height: number;
}

export interface CategoryStat {
    name: string;
    total: number;
    correct: number;
    percentage: number;
}

export interface StudentAnalysis {
    stats: CategoryStat[];
    weakestCategory: string | null;
    strongestCategory: string | null;
    recommendation: string;
}

export interface QuestionTypeStat {
    type: QuestionType;
    typeName: string;
    totalQuestions: number;
    totalAttempt: number;
    correct: number;
    percentage: number;
}

export const analyzeQuestionTypePerformance = (exam: Exam, results: Result | Result[]): QuestionTypeStat[] => {
    const resultArray = Array.isArray(results) ? results : [results];
    const typeMap: Record<string, { totalQuestions: number; totalAttempt: number; correct: number }> = {};

    // Initialize map with all types present in exam
    exam.questions.forEach(q => {
        if (q.questionType === 'INFO') return;
        if (!typeMap[q.questionType]) {
            typeMap[q.questionType] = { totalQuestions: 0, totalAttempt: 0, correct: 0 };
        }
        typeMap[q.questionType].totalQuestions++;
    });

    const checkAnswer = (q: Question, ans: string, allAnswers: Record<string, string>) => {
        // Check if teacher has manually graded this question
        const manualGradeKey = `_grade_${q.id}`;
        if (allAnswers[manualGradeKey]) {
            return allAnswers[manualGradeKey] === 'CORRECT';
        }

        if (!ans) return false;
        const normAns = normalize(String(ans), q.questionType);
        const normKey = normalize(String(q.correctAnswer || ''), q.questionType);

        if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
            return normAns === normKey;
        } else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
            const sSet = new Set(parseList(String(ans)).map(a => normalize(a, q.questionType)));
            const cSet = new Set(parseList(String(q.correctAnswer || '')).map(a => normalize(a, q.questionType)));
            return sSet.size === cSet.size && [...sSet].every(x => cSet.has(x));
        } else if (q.questionType === 'TRUE_FALSE') {
            try {
                const ansObj = JSON.parse(ans);
                return q.trueFalseRows?.every((row, idx) => ansObj[idx] === row.answer) ?? false;
            } catch { return false; }
        } else if (q.questionType === 'MATCHING') {
            try {
                const ansObj = JSON.parse(ans);
                return q.matchingPairs?.every((pair, idx) => ansObj[idx] === pair.right) ?? false;
            } catch { return false; }
        }
        return false;
    };

    // Calculate stats
    resultArray.forEach(result => {
        exam.questions.forEach(q => {
             if (q.questionType === 'INFO') return;
             if (!typeMap[q.questionType]) return; // Should be initialized, but safety check

             typeMap[q.questionType].totalAttempt++;
             if (checkAnswer(q, result.answers[q.id], result.answers)) {
                 typeMap[q.questionType].correct++;
             }
        });
    });

    const getTypeName = (type: QuestionType) => {
        switch(type) {
            case 'MULTIPLE_CHOICE': return 'Pilihan Ganda';
            case 'COMPLEX_MULTIPLE_CHOICE': return 'Pilihan Ganda Kompleks';
            case 'TRUE_FALSE': return 'Benar / Salah';
            case 'MATCHING': return 'Menjodohkan';
            case 'FILL_IN_THE_BLANK': return 'Isian Singkat';
            case 'ESSAY': return 'Uraian / Esai';
            default: return type;
        }
    };

    return Object.entries(typeMap).map(([type, data]) => ({
        type: type as QuestionType,
        typeName: getTypeName(type as QuestionType),
        totalQuestions: data.totalQuestions,
        totalAttempt: data.totalAttempt,
        correct: data.correct,
        percentage: data.totalAttempt > 0 ? Math.round((data.correct / data.totalAttempt) * 100) : 0
    })).sort((a, b) => b.percentage - a.percentage);
};

export interface ClassAnalysis {
    schoolName: string;
    className: string;
    studentCount: number;
    averageScore: number;
    averageTime: number;
    highestScore: number;
    lowestScore: number;
    passCount: number;
    passRate: number;
    questionTypeStats: QuestionTypeStat[];
}

export const analyzeClassPerformance = (exam: Exam, results: Result[]): ClassAnalysis[] => {
    const groupMap: Record<string, Result[]> = {};
    
    // Group by school and class
    results.forEach(r => {
        const s = r.student.schoolName || 'Tanpa Sekolah';
        const c = r.student.class || 'Tanpa Kelas';
        const key = `${s}|${c}`;
        if (!groupMap[key]) groupMap[key] = [];
        groupMap[key].push(r);
    });

    return Object.entries(groupMap).map(([key, classResults]) => {
        const [schoolName, className] = key.split('|');
        const studentCount = classResults.length;
        const scores = classResults.map(r => r.score);
        const times = classResults.map(r => r.completionTime || 0).filter(t => t > 0);
        const averageScore = studentCount > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / studentCount) : 0;
        const averageTime = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
        const highestScore = studentCount > 0 ? Math.max(...scores) : 0;
        const lowestScore = studentCount > 0 ? Math.min(...scores) : 0;
        
        const kkm = exam.config.kkm || 75;
        const passCount = scores.filter(s => s >= kkm).length; 
        const passRate = studentCount > 0 ? Math.round((passCount / studentCount) * 100) : 0;
        
        // Analyze question type performance for this class specifically
        const questionTypeStats = analyzeQuestionTypePerformance(exam, classResults);

        return {
            schoolName,
            className,
            studentCount,
            averageScore,
            averageTime,
            highestScore,
            lowestScore,
            passCount,
            passRate,
            questionTypeStats
        };
    }).sort((a, b) => {
        const s = a.schoolName.localeCompare(b.schoolName);
        if (s !== 0) return s;
        return a.className.localeCompare(b.className, undefined, { numeric: true });
    });
};

// --- HELPER: Parse List (Supports JSON Array or Legacy CSV) ---
export const stripPrefix = (str: string) => str.replace(/^[A-E1-5][.)]\s*/i, '').trim();

export const isAnswerMatch = (ans: string | undefined | null, opt: string | undefined | null, type: QuestionType): boolean => {
    if (!ans || !opt) return false;
    
    // Direct match is fastest
    if (ans === opt) return true;
    
    // Normalize both for comparison
    const normAns = normalize(ans, type);
    const normOpt = normalize(opt, type);
    
    if (normAns === normOpt && normAns.length > 0) return true;
    
    // Check if they match after stripping prefixes (A., B., etc.)
    const strippedAns = stripPrefix(normAns);
    const strippedOpt = stripPrefix(normOpt);
    
    // If both are non-empty and match after stripping prefix
    if (strippedAns === strippedOpt && strippedAns.length > 0) return true;
    
    // Special case for image-only answers: if both contain the same image src
    if (normAns.includes('<img') && normOpt.includes('<img')) {
        const getSrc = (html: string) => {
            const match = html.match(/src="([^"]+)"/);
            return match ? match[1] : null;
        };
        const srcAns = getSrc(normAns);
        const srcOpt = getSrc(normOpt);
        if (srcAns && srcAns === srcOpt) return true;
    }
    
    return false;
};

export const parseList = (str: string | undefined | null): string[] => {
    if (!str) return [];
    
    // Helper to recursively unescape stringified JSON
    const deepParse = (input: string): unknown => {
        try {
            let fixedInput = input;
            try {
                JSON.parse(fixedInput);
            } catch {
                // If it fails, try replacing literal newlines with escaped newlines
                fixedInput = input.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");
            }
            const parsed = JSON.parse(fixedInput);
            if (typeof parsed === 'string') {
                return deepParse(parsed);
            }
            return parsed;
        } catch {
            let cleaned = input.trim();
            if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
                cleaned = cleaned.slice(1, -1);
            } else {
                if (cleaned.startsWith('[') && !cleaned.endsWith(']')) cleaned = cleaned.slice(1);
                if (cleaned.endsWith(']') && !cleaned.startsWith('[')) cleaned = cleaned.slice(0, -1);
            }
            if (cleaned.startsWith('"') && cleaned.endsWith('"')) cleaned = cleaned.slice(1, -1);
            cleaned = cleaned.replace(/\\"/g, '"');
            return cleaned;
        }
    };

    try {
        const parsed = deepParse(str);
        if (Array.isArray(parsed)) {
            // Flatten the array in case it contains stringified arrays
            const flattened: string[] = [];
            const processItem = (item: unknown) => {
                if (typeof item === 'string') {
                    // Only deepParse if it looks like a stringified array or object
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
        if (typeof parsed === 'string') {
            // Try splitting by ||| first as it's the most robust delimiter
            if (parsed.includes('|||')) {
                return parsed.split('|||').map(s => s.trim()).filter(Boolean);
            }
            // If it looks like HTML, don't split by comma as it might break equations or tags
            if (parsed.includes('<') && parsed.includes('>')) {
                return [parsed.trim()];
            }
            return parsed.split(',').map(s => {
                let trimmed = s.trim();
                if (trimmed.startsWith('"') && trimmed.endsWith('"')) trimmed = trimmed.slice(1, -1);
                return trimmed.replace(/\\"/g, '"');
            }).filter(Boolean);
        }
        return [String(parsed)];
    } catch { /* ignore */ }
    
    // Fallback: handle legacy comma-separated or ||| separated
    if (str.includes('|||')) {
        return str.split('|||').map(s => s.trim()).filter(Boolean);
    }
    
    // If it looks like HTML, don't split by comma as it might break equations
    if (str.includes('<') && str.includes('>')) {
        return [str.trim()];
    }
    
    // If it looks like a broken JSON array (starts with [ and ends with ]), strip them before splitting
    let cleanStr = str.trim();
    if (cleanStr.startsWith('[') && cleanStr.endsWith(']')) {
        cleanStr = cleanStr.slice(1, -1);
    }
    
    // Split by comma, but try to respect quotes if possible
    // Simple split for now, but clean up quotes
    return cleanStr.split(',').map(s => {
        let trimmed = s.trim();
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
            trimmed = trimmed.slice(1, -1);
        }
        // Unescape internal quotes
        trimmed = trimmed.replace(/\\"/g, '"');
        return trimmed;
    }).filter(s => s !== '');
};

// --- HELPER: Normalize Answer String ---
export const normalize = (str: string, qType: string) => {
    const s = String(str || '').trim();
    
    // For short answers, we want to be very aggressive in stripping HTML
    if (qType === 'FILL_IN_THE_BLANK') {
        return s.replace(/<[^>]*>?/gm, '').trim().toLowerCase().replace(/\s+/g, ' ');
    }
    
    try {
        const div = document.createElement('div');
        div.innerHTML = s;
        
        // Remove math-visual wrappers to compare actual content
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

        // Standardize images: remove unnecessary attributes that might differ
        div.querySelectorAll('img').forEach(img => {
            // Keep only essential attributes for comparison
            const src = img.getAttribute('src');
            const alt = img.getAttribute('alt');
            
            // Clear all attributes
            while (img.attributes.length > 0) {
                img.removeAttribute(img.attributes[0].name);
            }
            
            // Restore essential ones
            if (src) img.setAttribute('src', src);
            if (alt) img.setAttribute('alt', alt);
        });

        // Standardize HTML by removing whitespace between tags and collapsing spaces
        // Also replace non-breaking spaces with regular spaces for comparison
        let html = div.innerHTML
            .replace(/&nbsp;|\u00A0/g, ' ')
            .replace(/>\s+</g, '><')
            .replace(/\s+/g, ' ')
            .trim();
        
        // Strip wrapping <p> tags if they are the only ones (common from markdownToHtml)
        if (html.startsWith('<p>') && html.endsWith('</p>') && (html.match(/<p>/g) || []).length === 1) {
            html = html.substring(3, html.length - 4).trim();
        }
        
        return html;
    } catch {
        return s.replace(/\s+/g, ' ').trim();
    }
};

// --- ANALYTICS ENGINE (Pure Functions) ---

export const calculateAggregateStats = (exam: Exam, results: Result[]) => {
    const catMap: Record<string, { total: number; correct: number }> = {};
    const lvlMap: Record<string, { total: number; correct: number }> = {};

    const checkAnswer = (q: Question, ans: string) => {
        if (!ans) return false;
        const normAns = normalize(String(ans), q.questionType);
        const normKey = normalize(String(q.correctAnswer || ''), q.questionType);

        if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
            return normAns === normKey;
        } else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
            const sSet = new Set(parseList(String(ans)).map(a => normalize(a, q.questionType)));
            const cSet = new Set(parseList(String(q.correctAnswer || '')).map(a => normalize(a, q.questionType)));
            return sSet.size === cSet.size && [...sSet].every(x => cSet.has(x));
        } else if (q.questionType === 'TRUE_FALSE') {
            try {
                const ansObj = JSON.parse(ans);
                return q.trueFalseRows?.every((row, idx) => ansObj[idx] === row.answer) ?? false;
            } catch { return false; }
        } else if (q.questionType === 'MATCHING') {
            try {
                const ansObj = JSON.parse(ans);
                return q.matchingPairs?.every((pair, idx) => ansObj[idx] === pair.right) ?? false;
            } catch { return false; }
        }
        return false;
    };

    // 1. Initialize Maps
    exam.questions.forEach(q => {
        if (q.questionType === 'INFO') return;
        const cat = q.category && q.category.trim() !== '' ? q.category.trim() : 'Tanpa Kategori';
        const lvl = q.level && q.level.trim() !== '' ? q.level.trim() : 'Umum';

        if (!catMap[cat]) catMap[cat] = { total: 0, correct: 0 };
        if (!lvlMap[lvl]) lvlMap[lvl] = { total: 0, correct: 0 };

        // 2. Iterate Results
        results.forEach(r => {
            catMap[cat].total++;
            lvlMap[lvl].total++;
            if (checkAnswer(q, r.answers[q.id])) {
                catMap[cat].correct++;
                lvlMap[lvl].correct++;
            }
        });
    });

    // 3. Process to Array
    const processMap = (map: Record<string, { total: number; correct: number }>) => Object.entries(map).map(([name, data]) => ({
        name,
        percentage: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
        totalAttempt: data.total,
        totalCorrect: data.correct
    })).sort((a, b) => b.percentage - a.percentage);

    return { 
        categoryStats: processMap(catMap), 
        levelStats: processMap(lvlMap) 
    };
};

export const analyzeStudentPerformance = (exam: Exam, result: Result): StudentAnalysis => {
    const statsMap: Record<string, { total: number; correct: number }> = {};

    // 1. Calculate Stats per Category
    exam.questions.forEach(q => {
        if (q.questionType === 'INFO') return;

        const category = q.category && q.category.trim() !== '' ? q.category.trim() : 'Umum';
        
        if (!statsMap[category]) {
            statsMap[category] = { total: 0, correct: 0 };
        }

        statsMap[category].total += 1;

        // Check Correctness (Simplified Logic matching StudentResultPage)
        const studentAns = result.answers[q.id];
        let isCorrect = false;
        
        // Check if teacher has manually graded this question
        const manualGradeKey = `_grade_${q.id}`;
        if (result.answers[manualGradeKey]) {
            isCorrect = result.answers[manualGradeKey] === 'CORRECT';
        } else if (studentAns) {
            const normAns = normalize(String(studentAns), q.questionType);
            const normKey = normalize(String(q.correctAnswer || ''), q.questionType);

            if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
                isCorrect = normAns === normKey;
            } else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
                const sSet = new Set(parseList(String(studentAns)).map(a => normalize(a, q.questionType)));
                const cSet = new Set(parseList(String(q.correctAnswer || '')).map(a => normalize(a, q.questionType)));
                isCorrect = sSet.size === cSet.size && [...sSet].every(x => cSet.has(x));
            } else if (q.questionType === 'TRUE_FALSE') {
                try {
                    const ansObj = JSON.parse(studentAns);
                    isCorrect = q.trueFalseRows?.every((row, idx) => ansObj[idx] === row.answer) ?? false;
                } catch { /* ignore */ }
            } else if (q.questionType === 'MATCHING') {
                try {
                    const ansObj = JSON.parse(studentAns);
                    isCorrect = q.matchingPairs?.every((pair, idx) => ansObj[idx] === pair.right) ?? false;
                } catch { /* ignore */ }
            }
        }

        if (isCorrect) {
            statsMap[category].correct += 1;
        }
    });

    // 2. Convert to Array & Sort
    const stats: CategoryStat[] = Object.entries(statsMap).map(([name, data]) => ({
        name,
        total: data.total,
        correct: data.correct,
        percentage: Math.round((data.correct / data.total) * 100)
    })).sort((a, b) => b.percentage - a.percentage); // Sort highest to lowest

    // 3. Identify Weakest/Strongest
    const strongestCategory = stats.length > 0 ? stats[0].name : null;
    const weakestCategory = stats.length > 0 ? stats[stats.length - 1].name : null;
    const weakestScore = stats.length > 0 ? stats[stats.length - 1].percentage : 0;

    // 4. Generate Recommendation
    const score = Number(result.score);
    let recommendation = "";

    if (score < 60) {
        recommendation = "Perlu Remedial. Fokus ulangi materi dasar secara keseluruhan.";
    } else if (score < 80) {
        recommendation = `Cukup Baik. Tingkatkan pemahaman pada materi "${weakestCategory}" (${weakestScore}%).`;
    } else if (score < 95) {
        recommendation = `Sangat Baik. Pertahankan prestasi dan bantu teman sebagai Tutor Sebaya.`;
    } else {
        recommendation = "Istimewa (Perfect). Siap untuk materi pengayaan atau tingkat lanjut.";
    }

    return { stats, weakestCategory, strongestCategory, recommendation };
};

// --- COMPUTER VISION HELPERS ---

// STRATEGI HIBRIDA (WebP + Smart Resize Loop)
export const compressImage = (dataUrl: string, quality = 0.7, maxWidth = 800, maxSizeBytes = 150 * 1024): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let width = img.width;
            let height = img.height;
            let currentQuality = quality;

            // 1. Initial Resize (Dimension Cap)
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(dataUrl);

            // Fungsi proses encoding
            const process = (w: number, h: number, q: number): string => {
                canvas.width = w;
                canvas.height = h;
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, w, h);
                // Gunakan 'high' smoothing karena resolusi mungkin kecil
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high'; 
                ctx.drawImage(img, 0, 0, w, h);
                return canvas.toDataURL('image/webp', q);
            };

            let resultUrl = process(width, height, currentQuality);

            // 2. Iterative Compression Loop (Target Size Check)
            const targetLength = Math.ceil(maxSizeBytes * 1.37);
            let attempts = 0;
            const maxAttempts = 6;

            while (resultUrl.length > targetLength && attempts < maxAttempts) {
                if (currentQuality > 0.5) {
                    currentQuality -= 0.1;
                } else {
                    width = Math.floor(width * 0.9);
                    height = Math.floor(height * 0.9);
                }
                resultUrl = process(width, height, currentQuality);
                attempts++;
            }

            resolve(resultUrl);
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
};

export const cropImage = (sourceImage: CanvasImageSource, x: number, y: number, w: number, h: number): Promise<string> => {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx || w <= 0 || h <= 0) return resolve('');
        
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        
        try {
            ctx.drawImage(sourceImage, x, y, w, h, 0, 0, w, h);
            // Gunakan WebP untuk hasil crop
            resolve(canvas.toDataURL('image/webp', 0.7));
        } catch {
            resolve('');
        }
    });
};

export const addWhitePadding = (dataUrl: string, padding: number = 10): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width; 
            canvas.height = img.height + (padding * 2); 
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(dataUrl);

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, padding);
            // Gunakan WebP
            resolve(canvas.toDataURL('image/webp', 0.7));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
};

export const refineImageContent = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(dataUrl);

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const w = canvas.width;
            const h = canvas.height;

            const isInk = (idx: number) => data[idx] < 200 && data[idx + 1] < 200 && data[idx + 2] < 200;

            // Despeckle logic 
            const originalData = new Uint8ClampedArray(data);
            const checkOriginalInk = (idx: number) => originalData[idx] < 200 && originalData[idx + 1] < 200 && originalData[idx + 2] < 200;

            for (let y = 1; y < h - 1; y++) {
                for (let x = 1; x < w - 1; x++) {
                    const idx = (y * w + x) * 4;
                    if (checkOriginalInk(idx)) {
                        let neighbors = 0;
                        for (let dy = -1; dy <= 1; dy++) {
                            for (let dx = -1; dx <= 1; dx++) {
                                if (dx === 0 && dy === 0) continue;
                                const nIdx = ((y + dy) * w + (x + dx)) * 4;
                                if (checkOriginalInk(nIdx)) neighbors++;
                            }
                        }
                        if (neighbors < 2) {
                            data[idx] = 255; data[idx+1] = 255; data[idx+2] = 255;
                        }
                    }
                }
            }

            // Edge Artifact Removal
            const edgeThreshold = 6; 
            for (let x = 0; x < w; x++) {
                if (x > edgeThreshold && x < w - edgeThreshold) continue;
                let colInkCount = 0;
                for (let y = 0; y < h; y++) {
                    const idx = (y * w + x) * 4;
                    if (isInk(idx)) colInkCount++;
                }
                if (colInkCount > h * 0.4) {
                    for (let y = 0; y < h; y++) {
                        const idx = (y * w + x) * 4;
                        data[idx] = 255; data[idx+1] = 255; data[idx+2] = 255; 
                    }
                }
            }

            // Re-Calculate Bounds
            let minX = w, maxX = 0, minY = h, maxY = 0;
            let hasContent = false;

            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const idx = (y * w + x) * 4;
                    if (isInk(idx)) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                        hasContent = true;
                    }
                }
            }

            if (!hasContent) {
                resolve(dataUrl); 
                return;
            }

            ctx.putImageData(imageData, 0, 0);

            const pad = 8; 
            const cropX = Math.max(0, minX - pad);
            const cropY = Math.max(0, minY - pad);
            const cropW = Math.min(w, maxX + pad) - cropX + pad; 
            const cropH = Math.min(h, maxY + pad) - cropY + pad;

            if (cropW <= 0 || cropH <= 0) { resolve(dataUrl); return; }

            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = cropW;
            finalCanvas.height = cropH;
            const fCtx = finalCanvas.getContext('2d');
            if (fCtx) {
                fCtx.fillStyle = '#FFFFFF';
                fCtx.fillRect(0,0, cropW, cropH);
                fCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
                // Output WebP
                resolve(finalCanvas.toDataURL('image/webp', 0.7));
            } else {
                resolve(dataUrl);
            }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
};

// --- PDF PROCESSING ---

export const convertPdfToImages = (file: File, scale = 2.0): Promise<string[]> => {
    // Increased scale for preview
    return new Promise((resolve, reject) => {
        const pdfjsLib = (window as unknown as { pdfjsLib: { getDocument: (opts: unknown) => { promise: Promise<unknown> } } }).pdfjsLib;
        if (!pdfjsLib) return reject(new Error("Pustaka PDF belum siap."));

        const reader = new FileReader();
        reader.onload = async (e) => {
            if (!e.target?.result) return reject(new Error("Gagal membaca file."));
            try {
                // Set verbosity to 0 to suppress warnings (like "TT: undefined function: 32")
                const doc = await pdfjsLib.getDocument({ 
                    data: e.target.result as ArrayBuffer,
                    verbosity: 0 
                }).promise as { numPages: number, getPage: (i: number) => Promise<{ getViewport: (opts: { scale: number }) => { height: number, width: number }, render: (opts: { canvasContext: CanvasRenderingContext2D, viewport: { height: number, width: number } }) => { promise: Promise<void> } }> };
                
                const images: string[] = [];
                // Only render first few pages for preview to save memory
                const pagesToRender = Math.min(doc.numPages, 3);
                for (let i = 1; i <= pagesToRender; i++) {
                    const page = await doc.getPage(i);
                    const viewport = page.getViewport({ scale });
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) continue;
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    await page.render({ canvasContext: ctx, viewport }).promise;
                    // Gunakan WebP untuk preview
                    images.push(canvas.toDataURL('image/webp', 0.7));
                }
                resolve(images);
            } catch { reject(new Error('Gagal mengonversi PDF.')); }
        };
        reader.readAsArrayBuffer(file);
    });
};

export const extractTextFromPdf = async (file: File): Promise<string> => {
    const pdfjsLib = (window as unknown as { pdfjsLib: { getDocument: (opts: unknown) => { promise: Promise<{ numPages: number, getPage: (i: number) => Promise<{ getTextContent: () => Promise<{ items: { str: string }[] }> }> }> } } }).pdfjsLib;
    if (!pdfjsLib) throw new Error("Pustaka PDF belum siap.");
    
    // Set verbosity to 0
    const doc = await pdfjsLib.getDocument({ 
        data: await file.arrayBuffer(),
        verbosity: 0 
    }).promise;
    
    let fullText = "";
    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(' ');
        fullText += pageText + "\n\n";
    }
    return fullText;
};

// --- GEOMETRIC PDF PARSER ENGINE ---

export const parsePdfAndAutoCrop = async (file: File): Promise<Question[]> => {
    const pdfjsLib = (window as unknown as { pdfjsLib: { getDocument: (opts: unknown) => { promise: Promise<{ numPages: number, getPage: (i: number) => Promise<{ getViewport: (opts: unknown) => { width: number, height: number }, render: (opts: unknown) => { promise: Promise<void> }, getTextContent: () => Promise<{ items: { str: string, height?: number, width?: number, transform: number[] }[] }> }> }> } } }).pdfjsLib;
    if (!pdfjsLib) throw new Error("Pustaka PDF belum siap.");

    // Set verbosity to 0
    const doc = await pdfjsLib.getDocument({ 
        data: await file.arrayBuffer(),
        verbosity: 0 
    }).promise;
    
    const numPages = doc.numPages;
    // High Quality Scale for Cropping
    const SCALE = 2.0; 

    const pagesData: PageData[] = [];
    const allLines: VisualLine[] = [];

    // --- STEP 1: RENDER PAGES & ASSEMBLE LINES ---
    for (let i = 1; i <= numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: SCALE });
        
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if(!ctx) continue;

        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;

        pagesData.push({ canvas, width: viewport.width, height: viewport.height });

        const textContent = await page.getTextContent();
        
        const items = textContent.items.map((item) => {
            const h = (item.height || 10) * SCALE;
            const w = (item.width || 0) * SCALE;
            const pdfY = item.transform[5] * SCALE;
            const top = viewport.height - pdfY - h; 
            return {
                str: item.str,
                x: item.transform[4] * SCALE,
                top: top,
                bottom: top + h,
                height: h,
                width: w
            };
        }).sort((a, b) => {
            const yDiff = a.top - b.top;
            if (Math.abs(yDiff) < 5) return a.x - b.x; 
            return yDiff; 
        });

        let currentLine: VisualLine | null = null;
        items.forEach((item) => {
            if (item.top > viewport.height * 0.94) return; // Footer
            if (item.top < viewport.height * 0.04) return; // Header

            if (!currentLine) {
                currentLine = { text: item.str, pageIdx: i - 1, top: item.top, bottom: item.bottom, left: item.x, width: item.width, height: item.height };
            } else {
                const verticalDist = Math.abs(item.top - currentLine.top);
                const isSameLine = verticalDist < Math.max(currentLine.height * 0.8, 15); 
                if (isSameLine) {
                    const space = item.x - (currentLine.left + currentLine.width); 
                    currentLine.text += (space > 4 ? " " : "") + item.str;
                    currentLine.top = Math.min(currentLine.top, item.top);
                    currentLine.bottom = Math.max(currentLine.bottom, item.bottom);
                    currentLine.height = Math.max(currentLine.height, item.height);
                    currentLine.width = (item.x + item.width) - currentLine.left; 
                } else {
                    allLines.push(currentLine);
                    currentLine = { text: item.str, pageIdx: i - 1, top: item.top, bottom: item.bottom, left: item.x, width: item.width, height: item.height };
                }
            }
        });
        if (currentLine) allLines.push(currentLine);
    }

    // --- STEP 2: DETECT ANCHORS ---
    const anchors: Anchor[] = [];
    const qRegex = /^\s*(\d+)[.)]/;
    const optRegex = /^\s*([a-eA-E])[.)]/;

    allLines.forEach(line => {
        const text = line.text.trim();
        const qMatch = text.match(qRegex);
        const optMatch = text.match(optRegex);

        if (qMatch) {
             anchors.push({
                type: 'QUESTION',
                id: qMatch[1],
                pageIdx: line.pageIdx,
                text: text,
                x: line.left,
                y: line.top,
                bottom: line.bottom,
                lineHeight: line.height
             });
        } else if (optMatch) {
            anchors.push({
                type: 'OPTION',
                id: optMatch[1].toUpperCase(),
                pageIdx: line.pageIdx,
                text: text,
                x: line.left,
                y: line.top,
                bottom: line.bottom,
                lineHeight: line.height
             });
        }
    });

    anchors.sort((a,b) => {
        if (a.pageIdx !== b.pageIdx) return a.pageIdx - b.pageIdx;
        if (Math.abs(a.y - b.y) > 10) return a.y - b.y; // Row priority
        return a.x - b.x;
    });

    // --- STEP 3: BUILD GRID & CROP BOUNDS ---
    const questions: Question[] = [];
    let currentQObj: Partial<Question> = {};
    let currentOptions: {id: string, promise: Promise<string>}[] = [];

    const getCropRect = (anchor: Anchor) => {
        const pageData = pagesData[anchor.pageIdx];
        const PADDING = 5;
        const MIN_Y = anchor.y - PADDING;
        const MIN_X = anchor.x - PADDING;

        let limitX = pageData.width;
        if (anchor.type === 'OPTION') {
            for (const other of anchors) {
                if (other.pageIdx === anchor.pageIdx && 
                    Math.abs(other.y - anchor.y) < anchor.lineHeight * 1.5 && 
                    other.x > anchor.x + 20) {
                    if (other.x < limitX) limitX = other.x;
                }
            }
        }
        const MAX_X = limitX;

        let limitY = pageData.height * 0.94;
        let foundBottomAnchor = false;

        for (const other of anchors) {
            if (other.pageIdx === anchor.pageIdx) {
                if (other.y > anchor.y + 10) { 
                    if (other.y < limitY) {
                        limitY = other.y;
                        foundBottomAnchor = true;
                    }
                }
            }
        }
        const MAX_Y = limitY;

        return { x: MIN_X, y: MIN_Y, w: MAX_X - MIN_X, h: MAX_Y - MIN_Y, bottomAnchorFound: foundBottomAnchor };
    };

    const processAnchorCrop = async (anchor: Anchor, index: number): Promise<string> => {
        const rect = getCropRect(anchor); 
        const pageData = pagesData[anchor.pageIdx];
        let finalImage = '';

        if (rect.bottomAnchorFound || anchor.type === 'OPTION') {
             finalImage = await cropImage(pageData.canvas, rect.x, rect.y, rect.w, rect.h);
        } else {
            const h1 = pageData.height - rect.y - (pageData.height * 0.05);
            const img1 = await cropImage(pageData.canvas, rect.x, rect.y, rect.w, h1);

            const nextIndex = index + 1; 
            const nextAnchor = anchors[nextIndex]; 
            if (nextAnchor && nextAnchor.pageIdx === anchor.pageIdx + 1) {
                const page2 = pagesData[nextAnchor.pageIdx];
                const h2 = nextAnchor.y - (page2.height * 0.05); 
                const img2 = await cropImage(page2.canvas, 0, page2.height * 0.05, page2.width, h2);
                
                const canvas = document.createElement('canvas');
                const i1 = new Image(); i1.src = img1;
                const i2 = new Image(); i2.src = img2;
                await Promise.all([new Promise(r => i1.onload = r), new Promise(r => i2.onload = r)]);
                canvas.width = Math.max(i1.width, i2.width);
                canvas.height = i1.height + i2.height;
                const ctx = canvas.getContext('2d');
                if(ctx) {
                    ctx.fillStyle = "#FFFFFF";
                    ctx.fillRect(0,0, canvas.width, canvas.height);
                    ctx.drawImage(i1, 0, 0);
                    ctx.drawImage(i2, 0, i1.height);
                    // Use WebP for combined image
                    finalImage = canvas.toDataURL('image/webp', 0.6);
                }
            } else {
                finalImage = img1;
            }
        }

        // Refinement also handles compression
        const refined = await refineImageContent(finalImage);
        return await addWhitePadding(refined, 15);
    };

    for (let i = 0; i < anchors.length; i++) {
        const anchor = anchors[i];
        
        if (anchor.type === 'QUESTION') {
            if (currentQObj.id) {
                questions.push({
                    id: currentQObj.id,
                    questionText: currentQObj.questionText || '',
                    questionType: currentOptions.length > 0 ? 'MULTIPLE_CHOICE' : 'ESSAY',
                    options: currentOptions.length > 0 ? await Promise.all(currentOptions.map(o => o.promise)) : undefined,
                    correctAnswer: currentOptions.length > 0 ? await currentOptions[0].promise : undefined,
                    category: '',
                    level: ''
                });
            }
            
            // WRAP IMAGE IN HTML TAG
            const imgData = await processAnchorCrop(anchor, i);
            currentQObj = {
                id: `q-${anchor.id}-${Date.now()}`,
                questionText: `<img src="${imgData}" alt="Soal" style="max-width: 100%; max-height: 50vh; width: auto; height: auto; object-fit: contain; border-radius: 8px; display: block; margin: 10px 0;" />`
            };
            currentOptions = [];
        } else if (anchor.type === 'OPTION') {
            if (currentQObj.id) {
                currentOptions.push({
                    id: anchor.id,
                    // WRAP IMAGE IN HTML TAG
                    promise: processAnchorCrop(anchor, i).then(imgData => {
                        return `<img src="${imgData}" alt="Opsi" style="max-width: 100%; max-height: 50vh; width: auto; height: auto; object-fit: contain; border-radius: 6px; display: block;" />`;
                    })
                });
            }
        }
        await new Promise(r => setTimeout(r, 0));
    }
    if (currentQObj.id) {
        questions.push({
            id: currentQObj.id,
            questionText: currentQObj.questionText || '',
            questionType: currentOptions.length > 0 ? 'MULTIPLE_CHOICE' : 'ESSAY',
            options: currentOptions.length > 0 ? await Promise.all(currentOptions.map(o => o.promise)) : undefined,
            correctAnswer: currentOptions.length > 0 ? await currentOptions[0].promise : undefined,
            category: '',
            level: ''
        });
    }

    return questions;
};


export const parseQuestionsFromPlainText = (text: string): Question[] => {
    // ... existing function implementation ...
    if (!text || !text.trim()) return [];
    
    const normalizedText = text
        .replace(/\r\n/g, '\n')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/\u2013/g, "-")
        .replace(/\u2014/g, "--");

    const lines = normalizedText.split('\n');
    const questions: Question[] = [];
    let currentQuestion: (Partial<Question> & { textParts: string[] }) | null = null;
    let currentOptions: string[] = [];
    let currentAnswerKey: string | undefined = undefined;

    const questionStartPattern = /^\s*(?:soal|no\.?|nomor)?\s*(\d+)[.)-\s]\s*(.*)/i;
    const optionStartPattern = /^\s*(?:[([])?\s*([a-eA-E])\s*(?:[)\].])\s+(.*)/;
    const answerKeyPattern = /^\s*(?:kunci|jawaban)(?:\s+jawaban)?\s*(?::)?\s*([a-e])\b/i;

    const finalizeCurrentQuestion = () => {
        if (currentQuestion && currentQuestion.textParts.length > 0) {
            const questionText = currentQuestion.textParts.join('\n').trim();
            let finalCorrectAnswer: string | undefined = undefined;
            let questionType: QuestionType = 'ESSAY';
            
            const trimmedOptions = currentOptions.map(opt => opt.trim());

            if (trimmedOptions.length > 0) {
                questionType = 'MULTIPLE_CHOICE';
                if (currentAnswerKey) {
                    const keyChar = currentAnswerKey.trim().toLowerCase();
                    const keyIndex = keyChar.charCodeAt(0) - 'a'.charCodeAt(0);
                    if (keyIndex >= 0 && keyIndex < trimmedOptions.length) {
                        finalCorrectAnswer = trimmedOptions[keyIndex];
                    }
                }
            } else if (currentAnswerKey) {
                questionType = 'FILL_IN_THE_BLANK';
                finalCorrectAnswer = currentAnswerKey.trim();
            }

            questions.push({
                id: `q${questions.length + 1}-${Date.now()}`,
                questionText, questionType,
                options: trimmedOptions.length > 0 ? trimmedOptions : undefined,
                correctAnswer: finalCorrectAnswer,
                imageUrl: undefined,
                optionImages: undefined,
                category: '',
                level: ''
            });
        }
        currentQuestion = null;
        currentOptions = [];
        currentAnswerKey = undefined;
    };

    lines.forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;

        const questionMatch = line.match(questionStartPattern);
        const optionMatch = line.match(optionStartPattern);
        const answerKeyMatch = line.match(answerKeyPattern);

        if (questionMatch) {
            finalizeCurrentQuestion();
            const qContent = questionMatch[2] ? questionMatch[2].trim() : "";
            currentQuestion = { textParts: qContent ? [qContent] : [] };
        } else if (optionMatch && currentQuestion) {
            currentOptions.push(optionMatch[2].trim());
        } else if (answerKeyMatch && currentQuestion) {
            currentAnswerKey = answerKeyMatch[1];
        } else if (currentQuestion) {
            if (currentOptions.length > 0) {
                currentOptions[currentOptions.length - 1] += '\n' + trimmedLine;
            } else {
                currentQuestion.textParts.push(line.trimEnd());
            }
        }
    });
    finalizeCurrentQuestion();
    return questions;
};

export const generateExamCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

/**
 * Calculates the exam score based on student answers and exam configuration.
 * Handles weighted scoring and manual grades.
 */
export const calculateExamScore = (exam: Exam, answers: Record<string, string>) => {
    let correctCount = 0;
    let totalScore = 0;
    let maxPossibleScore = 0;
    const scorableQuestions = exam.questions.filter(q => q.questionType !== 'INFO');
    
    scorableQuestions.forEach((q: Question) => {
        const weight = q.scoreWeight || 1;
        maxPossibleScore += weight;

        const studentAnswer = answers[q.id];
        
        // Check if teacher has manually graded this question
        const manualGradeKey = `_grade_${q.id}`;
        if (answers[manualGradeKey]) {
            if (answers[manualGradeKey] === 'CORRECT') {
                correctCount++;
                totalScore += weight;
            }
            return;
        }

        if (!studentAnswer) return;

        let isCorrect = false;
        if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
             if (q.correctAnswer && isAnswerMatch(q.correctAnswer, studentAnswer, q.questionType)) isCorrect = true;
        } 
        else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
             const studentSet = new Set(parseList(studentAnswer).map(a => normalize(a, q.questionType)));
             const correctSet = new Set(parseList(q.correctAnswer).map(a => normalize(a, q.questionType)));
             if (studentSet.size === correctSet.size && [...studentSet].every(val => correctSet.has(val))) {
                 isCorrect = true;
             }
        }
        else if (q.questionType === 'TRUE_FALSE') {
            try {
                const ansObj = JSON.parse(studentAnswer);
                const allCorrect = q.trueFalseRows?.every((row: { answer: boolean }, idx: number) => {
                    if (ansObj[idx] === undefined) return false;
                    return ansObj[idx] === row.answer;
                });
                if (allCorrect) isCorrect = true;
            } catch { /* ignore */ }
        }
        else if (q.questionType === 'MATCHING') {
            try {
                const ansObj = JSON.parse(studentAnswer);
                const allCorrect = q.matchingPairs?.every((pair: { right: string }, idx: number) => {
                    if (ansObj[idx] === undefined) return false;
                    return isAnswerMatch(pair.right, ansObj[idx], q.questionType);
                });
                if (allCorrect) isCorrect = true;
            } catch { /* ignore */ }
        }

        if (isCorrect) {
            correctCount++;
            totalScore += weight;
        }
    });

    const score = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
    return { score, correctAnswers: correctCount, totalQuestions: scorableQuestions.length };
};

export const sanitizeHtml = (html: string): string => {
    if (!html) return '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // SECURITY FIX: Remove potentially dangerous tags (XSS Protection)
    const dangerousTags = ['script', 'iframe', 'object', 'embed', 'applet', 'meta', 'link', 'base'];
    dangerousTags.forEach(tag => {
        const elements = doc.getElementsByTagName(tag);
        for (let i = elements.length - 1; i >= 0; i--) {
            elements[i].parentNode?.removeChild(elements[i]);
        }
    });

    const isMath = (el: Element) => 
        el.classList.contains('math-visual') || 
        el.closest('.math-visual') ||
        el.classList.contains('katex') ||
        el.closest('.katex') ||
        el.tagName.toLowerCase() === 'math' ||
        el.closest('math') ||
        el.classList.contains('MathJax') ||
        el.closest('.MathJax') ||
        el.classList.contains('mjx-container') ||
        el.closest('.mjx-container') ||
        el.classList.contains('math-tex') ||
        el.closest('.math-tex');

    // Handle style tags separately to preserve them if they are inside math
    const styleElements = doc.getElementsByTagName('style');
    for (let i = styleElements.length - 1; i >= 0; i--) {
        const el = styleElements[i];
        if (!isMath(el)) {
            el.parentNode?.removeChild(el);
        }
    }
        
    const isAksaraBali = (el: Element) =>
        el.classList.contains('aksara-bali') ||
        (el instanceof HTMLElement && el.style.fontFamily.includes('Noto Sans Balinese'));

    doc.body.querySelectorAll('*').forEach(el => {
        // SECURITY FIX: Remove all inline event handlers (on*)
        const attrs = el.attributes;
        for (let i = attrs.length - 1; i >= 0; i--) {
            if (attrs[i].name.toLowerCase().startsWith('on')) {
                el.removeAttribute(attrs[i].name);
            }
        }
        
        // SECURITY FIX: Prevent javascript: URIs
        if (el.tagName === 'A') {
            const href = el.getAttribute('href');
            if (href && href.toLowerCase().trim().startsWith('javascript:')) {
                el.removeAttribute('href');
            }
        }

        if (!isMath(el)) {
            if (el instanceof HTMLElement) {
                // Remove color and background-color styles
                el.style.color = '';
                el.style.backgroundColor = '';
                
                // Remove font-size, font-family, and line-height to allow app to control text size
                el.style.fontSize = '';
                if (!isAksaraBali(el)) {
                    el.style.fontFamily = '';
                }
                el.style.lineHeight = '';
                
                // Remove theme-specific classes (Tailwind)
                const classes = Array.from(el.classList);
                classes.forEach(cls => {
                    if (cls.startsWith('dark:') || 
                        cls.includes('slate-') || 
                        cls.includes('gray-') || 
                        cls.includes('zinc-') || 
                        cls.includes('neutral-') || 
                        cls.includes('stone-') ||
                        cls.includes('text-white') ||
                        cls.includes('text-black') ||
                        cls.includes('bg-white') ||
                        cls.includes('bg-black')
                    ) {
                        el.classList.remove(cls);
                    }
                });

                if (el.getAttribute('style') === '') el.removeAttribute('style');
                if (el.getAttribute('class') === '') el.removeAttribute('class');
            }
            // Remove legacy attributes
            el.removeAttribute('color');
            el.removeAttribute('bgcolor');
        }
    });

    // Wrap tables in a responsive container to prevent overflow
    doc.body.querySelectorAll('table').forEach(table => {
        // Check if it's already wrapped
        if (table.parentElement && table.parentElement.classList.contains('overflow-x-auto')) {
            return;
        }
        const wrapper = doc.createElement('div');
        wrapper.className = 'w-full overflow-x-auto custom-scrollbar';
        table.parentNode?.insertBefore(wrapper, table);
        wrapper.appendChild(table);
    });

    return doc.body.innerHTML;
};

// --- MARKDOWN CONVERTER ---

export const htmlToMarkdown = (html: string): string => {
    if (!html) return '';
    let markdown = html;

    // 1. Math (Inline)
    // From: <span class="math-visual" ... data-latex="\frac{1}{2}">...</span>
    // To: $\frac{1}{2}$
    const mathRegex = /(?:&#8203;|\u200B)?<span[^>]*class="math-visual"[^>]*data-latex="([^"]*)"[^>]*>.*?<\/span>(?:&#8203;|\u200B)?/g;
    markdown = markdown.replace(mathRegex, (match, latex) => {
        return `$${latex.replace(/&quot;/g, '"')}$`;
    });

    // 2. Images
    // From: <img src="..." alt="..." />
    // To: ![alt](src)
    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*\/?>/g;
    markdown = markdown.replace(imgRegex, (match, src, alt) => {
        return `![${alt}](${src})`;
    });

    // 3. Audio (Custom)
    // From: <audio ... src="..."></audio>
    // To: [[audio:src]]
    const audioRegex = /<audio[^>]+src="([^"]+)"[^>]*>.*?<\/audio>/g;
    markdown = markdown.replace(audioRegex, (match, src) => {
        return `[[audio:${src}]]`;
    });

    // 4. Basic Formatting
    markdown = markdown
        .replace(/<b>(.*?)<\/b>/g, '**$1**')
        .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
        .replace(/<i>(.*?)<\/i>/g, '*$1*')
        .replace(/<em>(.*?)<\/em>/g, '*$1*')
        .replace(/<u>(.*?)<\/u>/g, '__$1__')
        .replace(/<s>(.*?)<\/s>/g, '~~$1~~')
        .replace(/<strike>(.*?)<\/strike>/g, '~~$1~~')
        .replace(/<sup>(.*?)<\/sup>/g, '^$1^')
        .replace(/<sub>(.*?)<\/sub>/g, '~$1~');

    // 5. Lists
    markdown = markdown.replace(/<ul>(.*?)<\/ul>/gs, (match, content) => {
        return content.replace(/<li>(.*?)<\/li>/g, '- $1\n');
    });
    markdown = markdown.replace(/<ol>(.*?)<\/ol>/gs, (match, content) => {
        let i = 1;
        return content.replace(/<li>(.*?)<\/li>/g, () => `${i++}. $1\n`);
    });

    // 6. Tables (Simple conversion)
    // Note: Complex tables might need a more robust library, but this covers basic usage
    // This is a simplified placeholder. For full table support, we'd need a DOM parser approach.
    // For now, let's keep tables as HTML if they are complex, or try to strip them if simple.
    // Given the complexity, let's leave tables as HTML for now to prevent data loss, 
    // or use a dedicated library if requested. 
    // However, the user asked for markdown. Let's try a basic DOM parser approach for robustness.
    
    // We already handled special tags (math, img, audio) via regex above, 
    // so 'markdown' string currently has mixed HTML and Markdown.
    // To be safe and simple for this iteration without breaking the existing regex replacements:
    // We will just clean up the remaining block tags.
    
    markdown = markdown
        .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
        .replace(/<br\s*\/?>/g, '\n')
        .replace(/<div>(.*?)<\/div>/g, '$1\n');

    return markdown.trim();
};

import { marked } from 'marked';

export const markdownToHtml = (markdown: string): string => {
    if (!markdown) return '';
    
    // Fix literal \n that might come from AI JSON parsing
    let processedMarkdown = markdown.replace(/\\n/g, '\n');
    
    // Fix trailing double pipes in table rows (AI hallucination fix)
    processedMarkdown = processedMarkdown.replace(/\|\|[ \t]*$/gm, '|');

    // Remove blank lines between table rows (AI hallucination fix)
    // We need to do this repeatedly until no more blank lines exist between rows
    let previousMarkdown;
    do {
        previousMarkdown = processedMarkdown;
        processedMarkdown = processedMarkdown.replace(/(\|[^\n]*\|)\n\n+(\|[^\n]*\|)/g, '$1\n$2');
    } while (processedMarkdown !== previousMarkdown);

    // Ensure blank lines before markdown tables (only if previous line is not part of the table)
    processedMarkdown = processedMarkdown.replace(/(^|\n)(?![ \t]*\|)([^\n]+)\n([ \t]*\|)/g, '$1$2\n\n$3');

    // Fix tables that might have missing leading/trailing pipes
    // This is a common AI hallucination where it provides rows like "Col 1 | Col 2" instead of "| Col 1 | Col 2 |"
    processedMarkdown = processedMarkdown.replace(/^([ \t]*[^|\n]+(?:\|[^|\n]+)+[ \t]*)$/gm, (match) => {
        // Only wrap if it looks like a table row and not already wrapped
        if (match.includes('|') && !match.trim().startsWith('|')) {
            return `| ${match.trim()} |`;
        }
        return match;
    });

    // Ensure table headers have the separator row if missing
    // This looks for a row with pipes followed by a row without pipes (or end of string)
    // and inserts a separator if the next row doesn't look like a separator
    const lines = processedMarkdown.split('\n');
    for (let i = 0; i < lines.length - 1; i++) {
        const currentLine = lines[i].trim();
        const nextLine = lines[i+1].trim();
        if (currentLine.startsWith('|') && currentLine.endsWith('|') && currentLine.includes('|')) {
            // Check if next line is a separator
            if (!nextLine.startsWith('|') || !nextLine.includes('-')) {
                // If next line is another table row, we might need a separator before it if this is the first row
                if (nextLine.startsWith('|') && (i === 0 || !lines[i-1].trim().startsWith('|'))) {
                    const colCount = currentLine.split('|').length - 2;
                    const separator = `|${' --- |'.repeat(colCount)}`;
                    lines.splice(i + 1, 0, separator);
                }
            }
        }
    }
    processedMarkdown = lines.join('\n');
    
    // 1. Extract Math to prevent marked from messing it up
    const mathBlocks: string[] = [];
    processedMarkdown = processedMarkdown.replace(/\$\$([\s\S]+?)\$\$/g, (match, latex) => {
        const placeholder = `%%%MATH_BLOCK_${mathBlocks.length}%%%`;
        mathBlocks.push(latex);
        return placeholder;
    });
    
    const mathInlines: string[] = [];
    processedMarkdown = processedMarkdown.replace(/\$([^$\n]+?)\$/g, (match, latex) => {
        const placeholder = `%%%MATH_INLINE_${mathInlines.length}%%%`;
        mathInlines.push(latex);
        return placeholder;
    });

    // 2. Extract Audio
    const audios: string[] = [];
    processedMarkdown = processedMarkdown.replace(/\[\[audio:([^\]]+)\]\]/g, (match, src) => {
        const placeholder = `%%%AUDIO_${audios.length}%%%`;
        audios.push(src);
        return placeholder;
    });

    // 3. Parse with marked
    let html = marked.parse(processedMarkdown) as string;

    // 4. Restore Audio
    audios.forEach((src, i) => {
        html = html.replace(`%%%AUDIO_${i}%%%`, `<br/><audio controls src="${src}" style="max-width: 100%; display: block; margin: 8px 0;"></audio><br/>`);
    });

    // 5. Restore Math
    const renderMath = (latex: string, displayMode: boolean) => {
        let rendered = latex;
        const w = window as unknown as { katex?: { renderToString: (latex: string, options: { throwOnError: boolean, displayMode: boolean }) => string } };
        if (w.katex) {
            try {
                rendered = w.katex.renderToString(latex, { throwOnError: false, displayMode });
            } catch { /* ignore */ }
        }
        return `&#8203;<span class="math-visual" style="display: ${displayMode ? 'block' : 'inline-block'}; vertical-align: middle;" contenteditable="false" data-latex="${latex.replace(/"/g, '&quot;')}">${rendered}</span>&#8203;`;
    };

    mathBlocks.forEach((latex, i) => {
        html = html.replace(`%%%MATH_BLOCK_${i}%%%`, renderMath(latex, true));
    });

    mathInlines.forEach((latex, i) => {
        html = html.replace(`%%%MATH_INLINE_${i}%%%`, renderMath(latex, false));
    });

    return html.trim();
};

export const minifyExamHtml = (html: string | undefined | null): string => {
    if (!html) return html || '';
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // 1. Minify KaTeX/Math content
        doc.querySelectorAll('.math-visual[data-latex]').forEach(el => {
            el.innerHTML = ''; 
        });

        // 2. Clean Chart Placeholders
        doc.querySelectorAll('.chart-placeholder').forEach(el => {
            el.removeAttribute('style');
            el.innerHTML = '📊 Diagram';
        });

        // 3. Remove Tailwind CSS variables from inline styles
        doc.querySelectorAll('*').forEach(el => {
            if (el instanceof HTMLElement) {
                const style = el.style;
                const propsToRemove: string[] = [];
                for (let i = 0; i < style.length; i++) {
                    const prop = style[i];
                    if (prop && prop.startsWith('--tw-')) {
                        propsToRemove.push(prop);
                    }
                }
                propsToRemove.forEach(prop => style.removeProperty(prop));

                if (el.getAttribute('style') === '') {
                    el.removeAttribute('style');
                }
            }
        });

        return doc.body.innerHTML;
    } catch {
        return html; // Fallback if parsing fails
    }
};

export const cleanupQuestionContent = (q: any): any => {
    const qClean = { ...q };
    if (qClean.questionText) qClean.questionText = minifyExamHtml(qClean.questionText);
    if (qClean.correctAnswer) qClean.correctAnswer = minifyExamHtml(qClean.correctAnswer);
    if (qClean.options && Array.isArray(qClean.options)) {
        qClean.options = qClean.options.map((opt: string) => minifyExamHtml(opt));
    }
    if (qClean.trueFalseRows && Array.isArray(qClean.trueFalseRows)) {
        qClean.trueFalseRows = qClean.trueFalseRows.map((row: any) => ({ ...row, text: minifyExamHtml(row.text) }));
    }
    if (qClean.matchingPairs && Array.isArray(qClean.matchingPairs)) {
        qClean.matchingPairs = qClean.matchingPairs.map((pair: any) => ({ 
            ...pair, 
            left: minifyExamHtml(pair.left), 
            right: minifyExamHtml(pair.right) 
        }));
    }
    return qClean;
};

export const generateQuestionsPDF = async (exam: Exam): Promise<void> => {
    try {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert("Pop-up blocker mencegah pembukaan tab baru. Mohon izinkan pop-up untuk situs ini.");
            return;
        }

        // Get all stylesheets from current document to ensure KaTeX and Tailwind are applied
        const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
            .map(el => el.outerHTML)
            .join('\n');

        let htmlContent = `
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <title>Naskah Soal UjianCerdas - ${exam.config.examType ? exam.config.examType + ' - ' : ''}${exam.config.subject || 'Ujian'} - ${exam.code}</title>
            ${styleTags}
            <style>
                @page { margin: 20mm; }
                body { font-family: 'Inter', sans-serif; background: white; color: black; padding: 0; margin: 0; }
                .print-container { max-width: 100%; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid black; padding-bottom: 10px; }
                .header h1 { margin: 0 0 10px 0; font-size: 24px; text-transform: uppercase; font-weight: 800; }
                .meta-info { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 10px; }
                .question-item { margin-bottom: 24px; page-break-inside: avoid; }
                .question-text { font-size: 14px; margin-bottom: 10px; }
                .options-container { margin-left: 20px; font-size: 14px; }
                .option-item { margin-bottom: 8px; }
                .answer-key { page-break-before: always; }
                img { max-width: 100%; height: auto; object-fit: contain; }
                table { border-collapse: collapse; width: 100%; margin: 10px 0; }
                table, th, td { border: 1px solid #ddd; padding: 8px; }
                .prose { max-width: none !important; }
            </style>
        </head>
        <body class="bg-white text-black p-8">
            <div class="print-container">
                <div class="header">
                    <h1>NASKAH SOAL UJIAN</h1>
                    <div class="meta-info">
                        <div><strong>Mata Pelajaran:</strong> ${exam.config.subject || '-'}</div>
                        <div><strong>Kelas:</strong> ${exam.config.classLevel || '-'}</div>
                        <div><strong>Jenis Ujian:</strong> ${exam.config.examType || '-'}</div>
                    </div>
                </div>
                
                <div class="questions-list">
        `;

        const scorableQuestions = exam.questions.filter(q => q.questionType !== 'INFO');
        
        scorableQuestions.forEach((q, index) => {
            htmlContent += `<div class="question-item">`;
            htmlContent += `<div class="question-text flex gap-4"><span class="font-bold">${index + 1}.</span> <div class="prose prose-sm max-w-none text-black flex-1">${q.questionText}</div></div>`;
            
            htmlContent += `<div class="options-container">`;
            if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
                if (q.options) {
                    q.options.forEach((opt, optIdx) => {
                        htmlContent += `<div class="option-item flex gap-3">
                            <span class="font-bold mt-1">${String.fromCharCode(65 + optIdx)}.</span> 
                            <div class="prose prose-sm max-w-none text-black flex-1">${opt}</div>
                        </div>`;
                    });
                }
            } else if (q.questionType === 'TRUE_FALSE') {
                if (q.trueFalseRows) {
                    htmlContent += `<table class="w-full mt-2 mb-4 border border-slate-300">
                        <thead>
                            <tr class="bg-slate-100">
                                <th class="p-2 border border-slate-300 text-left">Pernyataan</th>
                                <th class="p-2 border border-slate-300 w-24 text-center">Benar</th>
                                <th class="p-2 border border-slate-300 w-24 text-center">Salah</th>
                            </tr>
                        </thead>
                        <tbody>`;
                    q.trueFalseRows.forEach((row) => {
                        htmlContent += `<tr>
                            <td class="p-2 border border-slate-300"><div class="prose prose-sm max-w-none text-black">${row.text}</div></td>
                            <td class="p-2 border border-slate-300 text-center"><div class="w-4 h-4 border border-black rounded-sm mx-auto"></div></td>
                            <td class="p-2 border border-slate-300 text-center"><div class="w-4 h-4 border border-black rounded-sm mx-auto"></div></td>
                        </tr>`;
                    });
                    htmlContent += `</tbody></table>`;
                }
            } else if (q.questionType === 'MATCHING') {
                if (q.matchingPairs) {
                    htmlContent += `<div class="mt-2 space-y-4">`;
                    q.matchingPairs.forEach((pair) => {
                        htmlContent += `<div class="flex items-center gap-4">
                            <div class="flex-1 p-3 border border-slate-300 rounded-lg"><div class="prose prose-sm max-w-none text-black">${pair.left}</div></div>
                            <div class="font-bold mx-2">......</div>
                            <div class="flex-1 border-b border-slate-400"></div>
                        </div>`;
                    });
                    htmlContent += `</div>`;
                }
            } else if (q.questionType === 'FILL_IN_THE_BLANK' || q.questionType === 'ESSAY') {
                htmlContent += `<div class="mt-4 mb-4">
                    <strong>Jawaban:</strong>
                    <div class="w-full h-32 border border-slate-300 rounded-lg mt-2"></div>
                </div>`;
            }
            htmlContent += `</div></div>`; // End options-container and question-item
        });

        // Answer Key
        htmlContent += `
                </div>
                
                <div class="answer-key">
                    <div class="header" style="margin-top: 40px;">
                        <h1>KUNCI JAWABAN</h1>
                    </div>
                    <div class="grid grid-cols-2 gap-x-8 gap-y-6 text-sm mt-6">
        `;

        scorableQuestions.forEach((q, index) => {
            let ansStr = "";
            if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
                ansStr = parseList(q.correctAnswer || '').map(s => String(s)).join(", ");
            } else if (q.questionType === 'TRUE_FALSE') {
                if (q.trueFalseRows) {
                    ansStr = q.trueFalseRows.map(r => `${r.text}: <strong>${r.answer ? 'Benar' : 'Salah'}</strong>`).join("<br/>");
                }
            } else if (q.questionType === 'MATCHING') {
                if (q.matchingPairs) {
                    ansStr = q.matchingPairs.map(p => `${p.left} &rarr; ${p.right}`).join("<br/>");
                }
            } else if (q.correctAnswer) {
                if (Array.isArray(q.correctAnswer)) {
                    ansStr = q.correctAnswer.map(a => String(a)).join(", ");
                } else {
                    ansStr = String(q.correctAnswer);
                }
            } else {
                ansStr = "<em>Koreksi Manual</em>";
            }
            
            htmlContent += `<div class="mb-2"><div class="font-bold mb-1">${index + 1}.</div> <div class="prose prose-sm max-w-none text-black">${ansStr}</div></div>`;
        });

        htmlContent += `
                    </div>
                </div>
            </div>
            <script>
                // Wait for images and fonts to load before printing
                window.onload = () => {
                    setTimeout(() => {
                        window.print();
                    }, 500);
                };
            </script>
        </body>
        </html>
        `;

        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    } catch (e) {
        console.error("Gagal membuat naskah soal", e);
        alert("Terjadi kesalahan saat membuat dokumen soal.");
    }
};
