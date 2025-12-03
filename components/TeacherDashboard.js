import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Exam, Question, ExamConfig, Result, QuestionType } from '../types';
import { 
    CloudArrowUpIcon, 
    ListBulletIcon, 
    CogIcon, 
    CheckCircleIcon, 
    ChartBarIcon, 
    LogoutIcon, 
    PencilIcon, 
    TrashIcon,
    CheckIcon,
    XMarkIcon,
    PlusCircleIcon,
    FileTextIcon,
    PhotoIcon,
    FileWordIcon,
    FilePdfIcon,
    PlayIcon,
    ClockIcon,
    CalendarDaysIcon,
    ArrowLeftIcon,
} from './Icons';

// --- COMPUTER VISION HELPERS (Client-Side Lightweight) ---

// 1. Crop Image Base
const cropImage = (sourceImage: CanvasImageSource, x: number, y: number, w: number, h: number): Promise<string> => {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx || w <= 0 || h <= 0) return resolve('');
        
        // Fill white background first to handle any potential transparency issues in crop
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        
        try {
            ctx.drawImage(sourceImage, x, y, w, h, 0, 0, w, h);
            resolve(canvas.toDataURL());
        } catch (e) {
            console.error("Crop error:", e);
            resolve('');
        }
    });
};

// 2. Add Padding
const addWhitePadding = (dataUrl: string, padding: number = 10): Promise<string> => {
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
            resolve(canvas.toDataURL());
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
};

// 3. Refine Image Content (Safer Despeckle & Edge Cleaning)
const refineImageContent = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(dataUrl);

            // A. Draw Original
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const w = canvas.width;
            const h = canvas.height;

            // Threshold strictness for "Ink"
            const isInk = (idx: number) => data[idx] < 200 && data[idx + 1] < 200 && data[idx + 2] < 200;

            // B. Despeckle (Noise Removal) 
            // Only remove pixels that are ISOLATED (little to no neighbors). 
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

            // C. Safe Edge Artifact Removal
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

            // D. Re-Calculate Bounds (Smart Crop)
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
                // If nothing found (too clean), return original to avoid empty/transparent error
                resolve(dataUrl); 
                return;
            }

            ctx.putImageData(imageData, 0, 0);

            const pad = 4;
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
                resolve(finalCanvas.toDataURL());
            } else {
                resolve(dataUrl);
            }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
};

// --- PDF PROCESSING ---

const convertPdfToImages = (file: File, scale = 2.0): Promise<string[]> => {
    return new Promise(async (resolve, reject) => {
        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) return reject(new Error("Pustaka PDF belum siap."));

        const reader = new FileReader();
        reader.onload = async (e) => {
            if (!e.target?.result) return reject(new Error("Gagal membaca file."));
            try {
                const doc = await pdfjsLib.getDocument({ data: e.target.result as ArrayBuffer }).promise;
                const images: string[] = [];
                for (let i = 1; i <= doc.numPages; i++) {
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
                    images.push(canvas.toDataURL());
                }
                resolve(images);
            } catch (err) { reject(new Error('Gagal mengonversi PDF.')); }
        };
        reader.readAsArrayBuffer(file);
    });
};

// --- GEOMETRIC PDF PARSER ENGINE ---

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

const parsePdfAndAutoCrop = async (file: File): Promise<Question[]> => {
    const pdfjsLib = (window as any).pdfjsLib;
    if (!pdfjsLib) throw new Error("Pustaka PDF belum siap.");

    const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const numPages = doc.numPages;
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
        
        // Assemble Lines Logic (Reused)
        const items = textContent.items.map((item: any) => {
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
        }).sort((a: any, b: any) => {
            const yDiff = a.top - b.top;
            if (Math.abs(yDiff) < 5) return a.x - b.x; 
            return yDiff; 
        });

        let currentLine: VisualLine | null = null;
        items.forEach((item: any) => {
            if (item.top > viewport.height * 0.94) return; // Footer
            if (item.top < viewport.height * 0.04) return; // Header

            if (!currentLine) {
                currentLine = { text: item.str, pageIdx: i - 1, top: item.top, bottom: item.bottom, left: item.x, width: item.width, height: item.height };
            } else {
                const verticalDist = Math.abs(item.top - currentLine.top);
                // Increased tolerance for lines with superscripts/subscripts which might shift vertical alignment slightly
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

    // --- STEP 2: DETECT ANCHORS (1., A., etc) ---
    const anchors: Anchor[] = [];
    // Regex for Questions: "1.", "1)", "10."
    const qRegex = /^\s*(\d+)[\.\)]/;
    // Regex for Options: Matches A., a., A), a) ... E)
    // Strictly [a-eA-E] to match A, B, C, D, E. Matches dot or closing paren.
    const optRegex = /^\s*([a-eA-E])[\.\)]/;

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
            // Check if it's a valid option format (e.g., A. something) or just A.
            // Avoid false positives like "A" inside a sentence, but here we check start of line.
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

    // Sort Anchors: Page -> Y -> X
    anchors.sort((a,b) => {
        if (a.pageIdx !== b.pageIdx) return a.pageIdx - b.pageIdx;
        if (Math.abs(a.y - b.y) > 10) return a.y - b.y; // Row priority
        return a.x - b.x;
    });

    // --- STEP 3: BUILD GRID & CROP BOUNDS ---
    const questions: Question[] = [];
    let currentQObj: Partial<Question> = {};
    let currentOptions: {id: string, promise: Promise<string>}[] = [];

    // Helper to find Geometric Limits
    const getCropRect = (anchor: Anchor, index: number) => {
        const pageData = pagesData[anchor.pageIdx];
        const PADDING = 5;
        const MIN_Y = anchor.y - PADDING;
        const MIN_X = anchor.x - PADDING;

        // 1. Right Limit (Max X)
        // Find closest anchor on the SAME PAGE, SAME ROW (y ~ anchor.y), to the RIGHT
        let limitX = pageData.width;
        if (anchor.type === 'OPTION') {
            for (const other of anchors) {
                if (other.pageIdx === anchor.pageIdx && 
                    Math.abs(other.y - anchor.y) < anchor.lineHeight * 1.5 && 
                    other.x > anchor.x + 20) { // +20 to avoid self or very close overlapping
                    if (other.x < limitX) limitX = other.x;
                }
            }
        }
        // Questions usually take full width
        const MAX_X = limitX;

        // 2. Bottom Limit (Max Y)
        // Find closest anchor on the SAME PAGE, strictly BELOW the current row
        // FIX: Use anchor.y as reference point instead of anchor.bottom for stability against superscripts
        let limitY = pageData.height * 0.94; // Default to footer margin
        let foundBottomAnchor = false;

        for (const other of anchors) {
            if (other.pageIdx === anchor.pageIdx) {
                // Determine if 'other' is strictly below 'anchor'
                // We use a safe threshold. If other.y is significantly greater than anchor.y
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
        const rect = getCropRect(anchor, index);
        const pageData = pagesData[anchor.pageIdx];
        let finalImage = '';

        // Single Page Crop
        if (rect.bottomAnchorFound || anchor.type === 'OPTION') {
             // If we found a bottom anchor, or it's an option (assume options don't split pages), simple crop
             finalImage = await cropImage(pageData.canvas, rect.x, rect.y, rect.w, rect.h);
        } else {
            // It's a Question that might span to next page
            // Crop current page until bottom
            const h1 = pageData.height - rect.y - (pageData.height * 0.05); // Margin bottom
            const img1 = await cropImage(pageData.canvas, rect.x, rect.y, rect.w, h1);

            // Check next anchor to see where it starts on next page
            const nextAnchor = anchors[index + 1];
            if (nextAnchor && nextAnchor.pageIdx === anchor.pageIdx + 1) {
                // Crop next page top until next anchor
                const page2 = pagesData[nextAnchor.pageIdx];
                const h2 = nextAnchor.y - (page2.height * 0.05); // Margin top
                const img2 = await cropImage(page2.canvas, 0, page2.height * 0.05, page2.width, h2);
                
                // Merge
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
                    finalImage = canvas.toDataURL();
                }
            } else {
                finalImage = img1;
            }
        }

        // Apply Black Pixel Hunt (Refine) on the safe geometric crop
        const refined = await refineImageContent(finalImage);
        return await addWhitePadding(refined, 10);
    };

    // --- STEP 4: EXECUTE ---
    for (let i = 0; i < anchors.length; i++) {
        const anchor = anchors[i];
        
        if (anchor.type === 'QUESTION') {
            // Push previous
            if (currentQObj.id) {
                questions.push({
                    id: currentQObj.id,
                    questionText: currentQObj.questionText || '',
                    questionType: currentOptions.length > 0 ? 'MULTIPLE_CHOICE' : 'ESSAY',
                    options: currentOptions.length > 0 ? await Promise.all(currentOptions.map(o => o.promise)) : undefined,
                    correctAnswer: currentOptions.length > 0 ? await currentOptions[0].promise : undefined,
                });
            }
            // Start New
            currentQObj = {
                id: `q-${anchor.id}-${Date.now()}`,
                questionText: await processAnchorCrop(anchor, i)
            };
            currentOptions = [];
        } else if (anchor.type === 'OPTION') {
            if (currentQObj.id) {
                currentOptions.push({
                    id: anchor.id,
                    promise: processAnchorCrop(anchor, i)
                });
            }
        }
        await new Promise(r => setTimeout(r, 0)); // Yield UI
    }
    // Push last
    if (currentQObj.id) {
        questions.push({
            id: currentQObj.id,
            questionText: currentQObj.questionText || '',
            questionType: currentOptions.length > 0 ? 'MULTIPLE_CHOICE' : 'ESSAY',
            options: currentOptions.length > 0 ? await Promise.all(currentOptions.map(o => o.promise)) : undefined,
            correctAnswer: currentOptions.length > 0 ? await currentOptions[0].promise : undefined,
        });
    }

    return questions;
};


// Unified Plain Text Parser
const parseQuestionsFromPlainText = (text: string): Question[] => {
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

    const questionStartPattern = /^\s*(?:soal|no\.?|nomor)?\s*(\d+)[\.\)\-\s]\s*(.*)/i;
    // Matches (a), [a], a., a), A., A) - restricted to a-e for consistency
    const optionStartPattern = /^\s*(?:[\(\[])?\s*([a-eA-E])\s*(?:[\)\]\.])\s+(.*)/;
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
                optionImages: undefined
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

const generateExamCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

interface TeacherDashboardProps {
    addExam: (newExam: Exam) => void;
    updateExam: (updatedExam: Exam) => void;
    exams: Record<string, Exam>;
    results: Result[];
    onLogout: () => void;
    onAllowContinuation: (studentId: string, examCode: string) => void;
}

type TeacherView = 'UPLOAD' | 'ONGOING' | 'UPCOMING_EXAMS' | 'FINISHED_EXAMS';
type InputMethod = 'paste' | 'upload';


const RemainingTime: React.FC<{ exam: Exam }> = ({ exam }) => {
    const calculateTimeLeft = () => {
        const examStartDateTime = new Date(`${exam.config.date.split('T')[0]}T${exam.config.startTime}`);
        const examEndTime = examStartDateTime.getTime() + exam.config.timeLimit * 60 * 1000;
        const timeLeft = Math.max(0, examEndTime - Date.now());
        return timeLeft;
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [exam]);

    if (timeLeft === 0) {
        return <span className="text-red-600 font-bold">Waktu Habis</span>;
    }

    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    return (
        <span className="font-mono tracking-wider">
            {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </span>
    );
};


export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ addExam, updateExam, exams, results, onLogout, onAllowContinuation }) => {
    const [view, setView] = useState<TeacherView>('UPLOAD');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [config, setConfig] = useState<ExamConfig>({
        timeLimit: 60,
        date: new Date().toISOString().split('T')[0],
        startTime: '08:00',
        allowRetakes: false,
        detectBehavior: true,
        autoSubmitInactive: true,
        autoSaveInterval: 10,
        shuffleQuestions: false,
        shuffleAnswers: false,
        continueWithPermission: false,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [inputText, setInputText] = useState(''); 
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [inputMethod, setInputMethod] = useState<InputMethod>('paste');
    const [generatedCode, setGeneratedCode] = useState('');
    const [manualMode, setManualMode] = useState(false);
    
    const [previewImages, setPreviewImages] = useState<string[]>([]);
    
    const [selectedOngoingExam, setSelectedOngoingExam] = useState<Exam | null>(null);
    const [selectedFinishedExam, setSelectedFinishedExam] = useState<Exam | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingExam, setEditingExam] = useState<Exam | null>(null);
    
    // Type Selection Modal State
    const [isTypeSelectionModalOpen, setIsTypeSelectionModalOpen] = useState(false);
    const [insertIndex, setInsertIndex] = useState<number | null>(null); // null means add to end
    
    const questionsSectionRef = useRef<HTMLDivElement>(null);
    const generatedCodeSectionRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLElement>(null);
    const [analysisCompleted, setAnalysisCompleted] = useState(false);
    
    useEffect(() => {
        if (analysisCompleted && questionsSectionRef.current && headerRef.current) {
            setTimeout(() => {
                const headerHeight = headerRef.current ? headerRef.current.offsetHeight : 0;
                const elementTop = questionsSectionRef.current ? questionsSectionRef.current.getBoundingClientRect().top + window.scrollY : 0;
                const offsetPosition = elementTop - headerHeight - 24;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });

            }, 200);
            setAnalysisCompleted(false);
        }
    }, [analysisCompleted]);

    useEffect(() => {
        if (generatedCode && generatedCodeSectionRef.current) {
            setTimeout(() => {
                generatedCodeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 200);
        }
    }, [generatedCode]);
    
    useEffect(() => {
        const loadPreview = async () => {
            if (uploadedFile && uploadedFile.type === 'application/pdf') {
                try {
                    const images = await convertPdfToImages(uploadedFile, 1.5);
                    setPreviewImages(images);
                } catch (e) {
                    console.error("Gagal memuat pratinjau PDF:", e);
                    setPreviewImages([]);
                }
            } else {
                setPreviewImages([]);
            }
        };
        loadPreview();
    }, [uploadedFile]);

    const extractTextFromPdf = async (file: File): Promise<string> => {
        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) throw new Error("Pustaka PDF belum siap.");
        
        const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
        let fullText = "";
        for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + "\n\n";
        }
        return fullText;
    };

    const handleExtractText = async () => {
        if (!uploadedFile) return;
        setIsLoading(true);
        try {
            const text = await extractTextFromPdf(uploadedFile);
            setInputText(text);
            setInputMethod('paste'); 
            setManualMode(false);
        } catch (e) {
            setError("Gagal mengekstrak teks dari PDF.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDirectManualTransfer = () => {
        if (!inputText.trim()) {
            setError("Tidak ada teks untuk ditransfer.");
            return;
        }
        const blocks = inputText.split(/\n\s*\n/);
        const newQuestions: Question[] = blocks.filter(b => b.trim().length > 0).map((block, index) => ({
            id: `manual-q-${Date.now()}-${index}`,
            questionText: block.trim(),
            questionType: 'ESSAY', 
            options: [],
            correctAnswer: '',
            imageUrl: undefined,
            optionImages: undefined
        }));
        
        setQuestions(newQuestions);
        setManualMode(true); 
        setAnalysisCompleted(true);
    };

    const handleStartAnalysis = async () => {
        setIsLoading(true);
        setError('');
        setQuestions([]);
        setGeneratedCode('');
        
        try {
            if (inputMethod === 'paste') {
                if (!inputText.trim()) throw new Error("Silakan tempel konten soal terlebih dahulu.");
                const parsedQuestions = parseQuestionsFromPlainText(inputText);
                if (parsedQuestions.length === 0) throw new Error("Tidak dapat menemukan soal yang valid. Pastikan format soal menggunakan penomoran (1. Soal) dan opsi (A. Opsi).");
                setQuestions(parsedQuestions);
                setAnalysisCompleted(true);
            } else if (inputMethod === 'upload' && uploadedFile) {
                if (uploadedFile.type !== 'application/pdf') throw new Error("Fitur ini hanya mendukung file PDF.");
                const parsedQuestions = await parsePdfAndAutoCrop(uploadedFile);
                 if (parsedQuestions.length === 0) throw new Error("Tidak dapat menemukan soal yang valid dari PDF. Pastikan format soal jelas.");
                setQuestions(parsedQuestions);
                setManualMode(true);
                setAnalysisCompleted(true);
            } else {
                 throw new Error("Silakan pilih file untuk diunggah.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal memproses file.');
        } finally {
            setIsLoading(false);
        }
    };

    const isDataUrl = (str: string) => str.startsWith('data:image/');

     const handleManualCreateClick = () => {
        setInputText('');
        setUploadedFile(null);
        setGeneratedCode('');
        setError('');
        setIsLoading(false);
        setQuestions([]);
        setManualMode(true);
        setAnalysisCompleted(true);
    };

    const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setConfig(prev => {
                const newConfig = { ...prev, [name]: checked };
                if (name === 'detectBehavior' && !checked) {
                    newConfig.continueWithPermission = false;
                }
                return newConfig;
            });
        } else {
            setConfig(prev => ({ ...prev, [name]: name === 'timeLimit' || name === 'autoSaveInterval' ? parseInt(value) : value }));
        }
    };

    const handleCorrectAnswerChange = (questionId: string, answer: string) => {
        setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, correctAnswer: answer } : q));
    };

    // New handler for Complex MC checkboxes
    const handleComplexCorrectAnswerChange = (questionId: string, option: string, isChecked: boolean) => {
        setQuestions(prev => prev.map(q => {
            if (q.id === questionId) {
                let currentAnswers = q.correctAnswer ? q.correctAnswer.split(',') : [];
                if (isChecked) {
                    if (!currentAnswers.includes(option)) currentAnswers.push(option);
                } else {
                    currentAnswers = currentAnswers.filter(a => a !== option);
                }
                return { ...q, correctAnswer: currentAnswers.join(',') };
            }
            return q;
        }));
    };
    
    const handleDeleteQuestion = (id: string) => {
        setQuestions(prev => prev.filter(q => q.id !== id));
    };
    
    // Updated Create Question Function for different types
    const createNewQuestion = (type: QuestionType): Question => {
        const base = {
            id: `q-${Date.now()}-${Math.random()}`,
            questionText: '',
            questionType: type,
            imageUrl: undefined,
            optionImages: undefined
        };

        switch (type) {
            case 'INFO':
                return { ...base };
            case 'MULTIPLE_CHOICE':
                return { ...base, options: ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'], correctAnswer: 'Opsi A' };
            case 'COMPLEX_MULTIPLE_CHOICE':
                return { ...base, options: ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'], correctAnswer: '' };
            case 'TRUE_FALSE':
                // New structure for True/False Matrix
                return { 
                    ...base, 
                    trueFalseRows: [
                        { text: 'Pernyataan 1', answer: true },
                        { text: 'Pernyataan 2', answer: false }
                    ],
                    // We don't use standard options for matrix style
                    options: undefined, 
                    correctAnswer: undefined 
                };
            case 'MATCHING':
                return { 
                    ...base, 
                    matchingPairs: [
                        { left: 'Item A', right: 'Pasangan A' }, 
                        { left: 'Item B', right: 'Pasangan B' }
                    ] 
                };
            case 'FILL_IN_THE_BLANK':
                return { ...base, correctAnswer: '' };
            case 'ESSAY':
            default:
                return { ...base };
        }
    };

    // Open Modal for Add
    const openTypeSelectionModal = (index: number | null = null) => {
        setInsertIndex(index);
        setIsTypeSelectionModalOpen(true);
    };

    const handleSelectQuestionType = (type: QuestionType) => {
        const newQuestion = createNewQuestion(type);
        if (insertIndex === null) {
            // Add to end
            setQuestions(prev => [...prev, newQuestion]);
             setTimeout(() => {
                document.getElementById(newQuestion.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        } else {
            // Insert at index
            const newQuestions = [...questions];
            newQuestions.splice(insertIndex + 1, 0, newQuestion);
            setQuestions(newQuestions);
        }
        setIsTypeSelectionModalOpen(false);
        setInsertIndex(null);
    };

    const handleAddOption = (questionId: string) => {
        setQuestions(prev => prev.map(q => {
            if (q.id === questionId && q.options) {
                const nextChar = String.fromCharCode(65 + q.options.length); // A, B, C...
                const newOptions = [...q.options, `Opsi ${nextChar}`];
                const newOptionImages = q.optionImages ? [...q.optionImages, null] : undefined;
                return { ...q, options: newOptions, optionImages: newOptionImages };
            }
            return q;
        }));
    };

    const handleDeleteOption = (questionId: string, indexToRemove: number) => {
        setQuestions(prev => prev.map(q => {
            if (q.id === questionId && q.options && q.options.length > 1) { // Prevent removing last option
                const optionToRemove = q.options[indexToRemove];
                const newOptions = q.options.filter((_, i) => i !== indexToRemove);
                const newOptionImages = q.optionImages ? q.optionImages.filter((_, i) => i !== indexToRemove) : undefined;
                
                // If the deleted option was the correct answer (or part of it for complex), reset or try to keep logical
                let newCorrectAnswer = q.correctAnswer;
                if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'TRUE_FALSE') {
                     if (q.correctAnswer === optionToRemove) {
                        newCorrectAnswer = newOptions[0] || ''; 
                    }
                } else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
                    // Remove from comma separated list
                    let answers = q.correctAnswer ? q.correctAnswer.split(',') : [];
                    answers = answers.filter(a => a !== optionToRemove);
                    newCorrectAnswer = answers.join(',');
                }

                return { 
                    ...q, 
                    options: newOptions, 
                    optionImages: newOptionImages,
                    correctAnswer: newCorrectAnswer
                };
            }
            return q;
        }));
    };

    // Handle Matching Pair logic
    const handleMatchingPairChange = (qId: string, idx: number, field: 'left' | 'right', value: string) => {
         setQuestions(prev => prev.map(q => {
            if (q.id === qId && q.matchingPairs) {
                const newPairs = [...q.matchingPairs];
                newPairs[idx] = { ...newPairs[idx], [field]: value };
                return { ...q, matchingPairs: newPairs };
            }
            return q;
        }));
    };

    const handleAddMatchingPair = (qId: string) => {
        setQuestions(prev => prev.map(q => {
             if (q.id === qId && q.matchingPairs) {
                 return { ...q, matchingPairs: [...q.matchingPairs, { left: '', right: '' }] };
             }
             return q;
        }));
    };
    
    const handleDeleteMatchingPair = (qId: string, idx: number) => {
         setQuestions(prev => prev.map(q => {
             if (q.id === qId && q.matchingPairs && q.matchingPairs.length > 1) {
                 const newPairs = q.matchingPairs.filter((_, i) => i !== idx);
                 return { ...q, matchingPairs: newPairs };
             }
             return q;
        }));
    };

    // --- TRUE/FALSE MATRIX HANDLERS ---
    const handleTrueFalseRowTextChange = (qId: string, idx: number, val: string) => {
        setQuestions(prev => prev.map(q => {
            if (q.id === qId && q.trueFalseRows) {
                const newRows = [...q.trueFalseRows];
                newRows[idx] = { ...newRows[idx], text: val };
                return { ...q, trueFalseRows: newRows };
            }
            return q;
        }));
    };

    const handleTrueFalseRowAnswerChange = (qId: string, idx: number, val: boolean) => {
        setQuestions(prev => prev.map(q => {
            if (q.id === qId && q.trueFalseRows) {
                const newRows = [...q.trueFalseRows];
                newRows[idx] = { ...newRows[idx], answer: val };
                return { ...q, trueFalseRows: newRows };
            }
            return q;
        }));
    };

    const handleAddTrueFalseRow = (qId: string) => {
        setQuestions(prev => prev.map(q => {
            if (q.id === qId && q.trueFalseRows) {
                const nextNum = q.trueFalseRows.length + 1;
                return { ...q, trueFalseRows: [...q.trueFalseRows, { text: `Pernyataan ${nextNum}`, answer: true }] };
            }
            return q;
        }));
    };

    const handleDeleteTrueFalseRow = (qId: string, idx: number) => {
        setQuestions(prev => prev.map(q => {
            if (q.id === qId && q.trueFalseRows && q.trueFalseRows.length > 1) {
                const newRows = q.trueFalseRows.filter((_, i) => i !== idx);
                return { ...q, trueFalseRows: newRows };
            }
            return q;
        }));
    };

    const handleCreateExam = () => {
        if (questions.length === 0) {
            setError("Tidak ada soal. Silakan buat atau unggah soal terlebih dahulu.");
            return;
        }

        const code = generateExamCode();
        const newExam: Exam = {
            code,
            questions,
            config
        };
        addExam(newExam);
        setGeneratedCode(code);
        setError('');
    };

     const handleUpdateExam = () => {
        if (!editingExam) return;

        if (questions.length === 0) {
            setError("Ujian tidak boleh kosong. Harap tambahkan setidaknya satu soal.");
            return;
        }
        
        const updatedExam: Exam = {
            code: editingExam.code,
            questions,
            config
        };
        updateExam(updatedExam);
        alert('Ujian berhasil diperbarui!');
        setIsEditModalOpen(false);
        setEditingExam(null);
    };

    const resetForm = () => {
        setQuestions([]);
        setInputText('');
        setUploadedFile(null);
        setGeneratedCode('');
        setError('');
        setIsLoading(false);
        setManualMode(false);
        setConfig({
            timeLimit: 60,
            date: new Date().toISOString().split('T')[0],
            startTime: '08:00',
            allowRetakes: false,
            detectBehavior: true,
            autoSubmitInactive: true,
            autoSaveInterval: 10,
            shuffleQuestions: false,
            shuffleAnswers: false,
            continueWithPermission: false,
        });
        setView('UPLOAD');
    };

    const handleQuestionTextChange = (id: string, text: string) => {
        setQuestions(prev => prev.map(q => q.id === id ? { ...q, questionText: text } : q));
    };

    const handleOptionTextChange = (qId: string, optIndex: number, text: string) => {
        setQuestions(prev => prev.map(q => {
            if (q.id === qId && q.options) {
                const oldOption = q.options[optIndex];
                const newOptions = [...q.options];
                newOptions[optIndex] = text;
                
                let newCorrectAnswer = q.correctAnswer;
                if (q.questionType === 'MULTIPLE_CHOICE') {
                    if (q.correctAnswer === oldOption) newCorrectAnswer = text;
                } else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
                    let answers = q.correctAnswer ? q.correctAnswer.split(',') : [];
                    if (answers.includes(oldOption)) {
                        answers = answers.map(a => a === oldOption ? text : a);
                        newCorrectAnswer = answers.join(',');
                    }
                }
                
                return { ...q, options: newOptions, correctAnswer: newCorrectAnswer };
            }
            return q;
        }));
    };

    // Handle Image Upload for Question/Option (Separate from text)
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, qId: string, optIndex?: number) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            setQuestions(prev => prev.map(q => {
                if (q.id === qId) {
                    if (optIndex !== undefined) {
                        // Update Option Image
                        const currentOptImages = q.optionImages ? [...q.optionImages] : (q.options ? new Array(q.options.length).fill(null) : []);
                        // Ensure array is large enough
                        while (currentOptImages.length <= optIndex) currentOptImages.push(null);
                        currentOptImages[optIndex] = dataUrl;
                        return { ...q, optionImages: currentOptImages };
                    } else {
                        // Update Question Image
                        return { ...q, imageUrl: dataUrl };
                    }
                }
                return q;
            }));
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleDeleteImage = (qId: string, optIndex?: number) => {
        setQuestions(prev => prev.map(q => {
            if (q.id === qId) {
                if (optIndex !== undefined) {
                    if (q.optionImages) {
                        const newOptImages = [...q.optionImages];
                        newOptImages[optIndex] = null;
                        return { ...q, optionImages: newOptImages };
                    }
                } else {
                    return { ...q, imageUrl: undefined };
                }
            }
            return q;
        }));
    };

    const renderEditorView = (isEditing: boolean) => (
         <div className="space-y-10">
             <div ref={questionsSectionRef} className="space-y-4">
                 <div className="p-4 bg-primary/5 rounded-lg">
                    <h2 className="text-xl font-bold text-neutral">
                        {isEditing ? '1. Tinjau dan Edit Soal' : '3. Tinjau dan Edit Soal'}
                    </h2>
                    <p className="text-sm text-base-content mt-1">Periksa kembali soal yang telah dibuat. Anda dapat mengedit, menghapus, atau menambahkan soal baru.</p>
                </div>
                <div className="space-y-4">
                    {questions.map((q, index) => (
                        <React.Fragment key={q.id}>
                            <div id={q.id} className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm group hover:shadow-md transition-shadow relative">
                                    <div>
                                        {/* TYPE BADGE - Moved to Center Top */}
                                        <div className="flex justify-center mb-4">
                                            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200 shadow-sm">
                                                {q.questionType === 'MULTIPLE_CHOICE' && 'Pilihan Ganda'}
                                                {q.questionType === 'COMPLEX_MULTIPLE_CHOICE' && 'Pilihan Ganda Kompleks'}
                                                {q.questionType === 'TRUE_FALSE' && 'Benar / Salah'}
                                                {q.questionType === 'MATCHING' && 'Menjodohkan'}
                                                {q.questionType === 'ESSAY' && 'Esai'}
                                                {q.questionType === 'FILL_IN_THE_BLANK' && 'Isian Singkat'}
                                                {q.questionType === 'INFO' && 'Keterangan / Info'}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-start gap-2 mb-2">
                                                    <span className="text-primary font-bold mt-2">{index + 1}.</span>
                                                    <div className="flex-1 space-y-2">
                                                        {/* QUESTION TEXT AREA */}
                                                        <textarea
                                                            value={q.questionText}
                                                            onChange={(e) => handleQuestionTextChange(q.id, e.target.value)}
                                                            className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary text-sm leading-relaxed break-words ${isDataUrl(q.questionText) ? 'hidden' : 'min-h-[80px]'}`}
                                                            placeholder={q.questionType === 'INFO' ? "Tulis informasi atau teks bacaan di sini..." : "Tulis pertanyaan di sini..."}
                                                        />
                                                        
                                                        {/* PDF CROP (Stored in questionText) or MANUAL UPLOAD (Stored in imageUrl) */}
                                                        {(isDataUrl(q.questionText) || q.imageUrl) && (
                                                            <div className="relative inline-block group/img mt-2">
                                                                <img 
                                                                    src={q.imageUrl || q.questionText} 
                                                                    alt="Gambar Soal" 
                                                                    className="max-w-full h-auto border rounded-md max-h-[300px]" 
                                                                />
                                                                <button 
                                                                    onClick={() => {
                                                                        if (q.imageUrl) handleDeleteImage(q.id);
                                                                        else handleQuestionTextChange(q.id, ''); // Clear crop if it was a crop
                                                                    }}
                                                                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity shadow-sm"
                                                                    title="Hapus Gambar"
                                                                >
                                                                    <XMarkIcon className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                        
                                                        <div className="flex justify-end">
                                                            <label className="cursor-pointer flex items-center gap-1 text-xs text-primary hover:text-primary-focus font-semibold">
                                                                <PhotoIcon className="w-4 h-4" />
                                                                <span>{q.imageUrl ? "Ganti Gambar" : "Tambah Gambar"}</span>
                                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, q.id)} />
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleDeleteQuestion(q.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors" title="Hapus Soal"><TrashIcon className="w-5 h-5" /></button>
                                            </div>
                                        </div>

                                        {/* EDITOR: MULTIPLE CHOICE */}
                                        {q.questionType === 'MULTIPLE_CHOICE' && q.options && (
                                            <div className="mt-3 ml-8">
                                                <div className="space-y-3">
                                                    {q.options.map((option, i) => (
                                                        <div key={i} className={`relative flex items-start gap-3 p-3 pr-10 rounded-md border group/opt ${q.correctAnswer === option ? 'bg-green-50 border-green-300 ring-1 ring-green-300' : 'bg-gray-50 border-gray-200'}`}>
                                                            {/* DELETE OPTION BUTTON */}
                                                            <button 
                                                                onClick={() => handleDeleteOption(q.id, i)}
                                                                className="absolute top-2 right-2 text-gray-400 hover:text-red-600 p-1 transition-colors z-10 bg-white/50 hover:bg-white rounded-full"
                                                                title="Hapus Opsi Ini"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>

                                                            <input
                                                                type="radio"
                                                                name={`correct-answer-${q.id}`}
                                                                value={option} 
                                                                checked={q.correctAnswer === option}
                                                                onChange={() => handleCorrectAnswerChange(q.id, option)}
                                                                className="h-4 w-4 mt-2 text-primary focus:ring-primary border-gray-300 flex-shrink-0 cursor-pointer"
                                                                title="Tandai sebagai jawaban benar"
                                                            />
                                                            <div className="flex-1 space-y-2">
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="text"
                                                                        value={option}
                                                                        onChange={(e) => handleOptionTextChange(q.id, i, e.target.value)}
                                                                        className={`block w-full px-2 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-sm break-words ${isDataUrl(option) ? 'hidden' : ''}`}
                                                                        placeholder={`Opsi ${String.fromCharCode(65 + i)}`}
                                                                    />
                                                                </div>

                                                                {/* Image handling only for MC */}
                                                                {(isDataUrl(option) || (q.optionImages && q.optionImages[i])) && (
                                                                    <div className="relative inline-block group/optImg">
                                                                        <img 
                                                                            src={(q.optionImages && q.optionImages[i]) || option} 
                                                                            alt={`Opsi ${i+1}`} 
                                                                            className="max-w-full h-auto border rounded-md max-h-[150px]" 
                                                                        />
                                                                        <button 
                                                                            onClick={() => {
                                                                                if (q.optionImages && q.optionImages[i]) handleDeleteImage(q.id, i);
                                                                                else handleOptionTextChange(q.id, i, ''); // Clear crop
                                                                            }}
                                                                            className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full opacity-0 group-hover/optImg:opacity-100 transition-opacity shadow-sm"
                                                                            title="Hapus Gambar"
                                                                        >
                                                                            <XMarkIcon className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                                <div className="flex justify-end">
                                                                    <label className="cursor-pointer p-1 text-gray-400 hover:text-primary rounded-full hover:bg-gray-100 transition-colors" title="Tambah/Ganti Gambar Opsi">
                                                                        <PhotoIcon className="w-4 h-4" />
                                                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, q.id, i)} />
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <button 
                                                    onClick={() => handleAddOption(q.id)}
                                                    className="mt-2 text-xs text-primary font-semibold hover:text-primary-focus flex items-center gap-1 hover:underline"
                                                >
                                                    <PlusCircleIcon className="w-4 h-4" />
                                                    Tambah Opsi
                                                </button>
                                            </div>
                                        )}
                                        
                                        {/* EDITOR: COMPLEX MULTIPLE CHOICE (CHECKBOX) */}
                                        {q.questionType === 'COMPLEX_MULTIPLE_CHOICE' && q.options && (
                                            <div className="mt-3 ml-8">
                                                <p className="text-xs text-gray-500 mb-2 italic">Centang kotak untuk menandai semua jawaban yang benar.</p>
                                                <div className="space-y-3">
                                                    {q.options.map((option, i) => {
                                                        const isChecked = q.correctAnswer ? q.correctAnswer.split(',').includes(option) : false;
                                                        return (
                                                        <div key={i} className={`relative flex items-start gap-3 p-3 pr-10 rounded-md border group/opt ${isChecked ? 'bg-green-50 border-green-300 ring-1 ring-green-300' : 'bg-gray-50 border-gray-200'}`}>
                                                            <button 
                                                                onClick={() => handleDeleteOption(q.id, i)}
                                                                className="absolute top-2 right-2 text-gray-400 hover:text-red-600 p-1 transition-colors z-10 bg-white/50 hover:bg-white rounded-full"
                                                                title="Hapus Opsi Ini"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>

                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={(e) => handleComplexCorrectAnswerChange(q.id, option, e.target.checked)}
                                                                className="h-4 w-4 mt-2 text-primary focus:ring-primary border-gray-300 flex-shrink-0 cursor-pointer rounded"
                                                            />
                                                            <div className="flex-1 space-y-2">
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="text"
                                                                        value={option}
                                                                        onChange={(e) => handleOptionTextChange(q.id, i, e.target.value)}
                                                                        className={`block w-full px-2 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-sm break-words ${isDataUrl(option) ? 'hidden' : ''}`}
                                                                        placeholder={`Opsi ${String.fromCharCode(65 + i)}`}
                                                                    />
                                                                </div>
                                                                 {(isDataUrl(option) || (q.optionImages && q.optionImages[i])) && (
                                                                    <div className="relative inline-block group/optImg">
                                                                        <img 
                                                                            src={(q.optionImages && q.optionImages[i]) || option} 
                                                                            alt={`Opsi ${i+1}`} 
                                                                            className="max-w-full h-auto border rounded-md max-h-[150px]" 
                                                                        />
                                                                         <button 
                                                                            onClick={() => {
                                                                                if (q.optionImages && q.optionImages[i]) handleDeleteImage(q.id, i);
                                                                                else handleOptionTextChange(q.id, i, ''); 
                                                                            }}
                                                                            className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full opacity-0 group-hover/optImg:opacity-100 transition-opacity shadow-sm"
                                                                        >
                                                                            <XMarkIcon className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                                <div className="flex justify-end">
                                                                    <label className="cursor-pointer p-1 text-gray-400 hover:text-primary rounded-full hover:bg-gray-100 transition-colors">
                                                                        <PhotoIcon className="w-4 h-4" />
                                                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, q.id, i)} />
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )})}
                                                </div>
                                                 <button 
                                                    onClick={() => handleAddOption(q.id)}
                                                    className="mt-2 text-xs text-primary font-semibold hover:text-primary-focus flex items-center gap-1 hover:underline"
                                                >
                                                    <PlusCircleIcon className="w-4 h-4" />
                                                    Tambah Opsi
                                                </button>
                                            </div>
                                        )}
                                        
                                        {/* EDITOR: TRUE/FALSE MATRIX */}
                                        {q.questionType === 'TRUE_FALSE' && q.trueFalseRows && (
                                            <div className="mt-3 ml-8">
                                                <p className="text-xs text-gray-500 mb-2 italic">Tentukan pernyataan dan kunci jawabannya (Benar/Salah).</p>
                                                <div className="overflow-x-auto border rounded-md">
                                                    <table className="w-full text-sm text-left">
                                                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                                                            <tr>
                                                                <th className="px-4 py-2 w-full">Pernyataan</th>
                                                                <th className="px-4 py-2 text-center w-24">Benar</th>
                                                                <th className="px-4 py-2 text-center w-24">Salah</th>
                                                                <th className="px-2 py-2 w-10"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {q.trueFalseRows.map((row, i) => (
                                                                <tr key={i} className="bg-white hover:bg-gray-50">
                                                                    <td className="px-4 py-2">
                                                                        <input 
                                                                            type="text"
                                                                            value={row.text}
                                                                            onChange={(e) => handleTrueFalseRowTextChange(q.id, i, e.target.value)}
                                                                            className="w-full border-gray-300 rounded focus:ring-primary focus:border-primary text-sm p-1.5"
                                                                            placeholder="Tulis pernyataan..."
                                                                        />
                                                                    </td>
                                                                    <td className="px-4 py-2 text-center">
                                                                        <input 
                                                                            type="radio"
                                                                            name={`tf-row-${q.id}-${i}`}
                                                                            checked={row.answer === true}
                                                                            onChange={() => handleTrueFalseRowAnswerChange(q.id, i, true)}
                                                                            className="w-4 h-4 text-green-600 focus:ring-green-500 cursor-pointer"
                                                                        />
                                                                    </td>
                                                                    <td className="px-4 py-2 text-center">
                                                                        <input 
                                                                            type="radio"
                                                                            name={`tf-row-${q.id}-${i}`}
                                                                            checked={row.answer === false}
                                                                            onChange={() => handleTrueFalseRowAnswerChange(q.id, i, false)}
                                                                            className="w-4 h-4 text-red-600 focus:ring-red-500 cursor-pointer"
                                                                        />
                                                                    </td>
                                                                    <td className="px-2 py-2 text-center">
                                                                         <button onClick={() => handleDeleteTrueFalseRow(q.id, i)} className="text-gray-400 hover:text-red-500 p-1">
                                                                             <TrashIcon className="w-4 h-4"/>
                                                                         </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <button 
                                                    onClick={() => handleAddTrueFalseRow(q.id)}
                                                    className="mt-2 text-xs text-primary font-semibold hover:text-primary-focus flex items-center gap-1 hover:underline"
                                                >
                                                    <PlusCircleIcon className="w-4 h-4" />
                                                    Tambah Pernyataan
                                                </button>
                                            </div>
                                        )}

                                        {/* EDITOR: MATCHING */}
                                        {q.questionType === 'MATCHING' && q.matchingPairs && (
                                             <div className="mt-3 ml-8">
                                                <p className="text-xs text-gray-500 mb-2 italic">Pasangkan item di kolom kiri dengan jawaban yang benar di kolom kanan.</p>
                                                <div className="space-y-2">
                                                    {q.matchingPairs.map((pair, i) => (
                                                        <div key={i} className="flex gap-2 items-center bg-gray-50 p-2 rounded border">
                                                             <div className="flex-1">
                                                                 <input 
                                                                    type="text" 
                                                                    placeholder="Item Kiri"
                                                                    value={pair.left}
                                                                    onChange={(e) => handleMatchingPairChange(q.id, i, 'left', e.target.value)}
                                                                    className="w-full text-sm p-1 border rounded"
                                                                 />
                                                             </div>
                                                             <div className="text-gray-400">→</div>
                                                             <div className="flex-1">
                                                                 <input 
                                                                    type="text" 
                                                                    placeholder="Pasangan Kanan (Benar)"
                                                                    value={pair.right}
                                                                    onChange={(e) => handleMatchingPairChange(q.id, i, 'right', e.target.value)}
                                                                    className="w-full text-sm p-1 border rounded bg-green-50 border-green-200"
                                                                 />
                                                             </div>
                                                             <button onClick={() => handleDeleteMatchingPair(q.id, i)} className="text-gray-400 hover:text-red-500 p-1">
                                                                 <TrashIcon className="w-4 h-4"/>
                                                             </button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <button 
                                                    onClick={() => handleAddMatchingPair(q.id)}
                                                    className="mt-2 text-xs text-primary font-semibold hover:text-primary-focus flex items-center gap-1 hover:underline"
                                                >
                                                    <PlusCircleIcon className="w-4 h-4" />
                                                    Tambah Pasangan
                                                </button>
                                             </div>
                                        )}

                                        {(q.questionType === 'FILL_IN_THE_BLANK' || q.questionType === 'ESSAY') && (
                                             <div className="mt-3 ml-8">
                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                    {q.questionType === 'ESSAY' ? 'Jawaban Referensi / Poin Penting' : 'Kunci Jawaban'}
                                                </label>
                                                {q.questionType === 'ESSAY' ? (
                                                     <textarea 
                                                        value={q.correctAnswer || ''}
                                                        onChange={(e) => handleCorrectAnswerChange(q.id, e.target.value)}
                                                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm break-words min-h-[60px]"
                                                        placeholder="Tuliskan poin-poin jawaban yang diharapkan (opsional, untuk referensi guru)"
                                                    />
                                                ) : (
                                                    <input 
                                                        type="text"
                                                        value={q.correctAnswer || ''}
                                                        onChange={(e) => handleCorrectAnswerChange(q.id, e.target.value)}
                                                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm break-words"
                                                        placeholder="Masukkan jawaban yang benar"
                                                    />
                                                )}
                                             </div>
                                        )}
                                    </div>
                            </div>
                            
                            {/* INSERT QUESTION DIVIDER */}
                            <div className="relative py-2 group/insert">
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="w-full border-t border-gray-200 group-hover/insert:border-primary/30 transition-colors"></div>
                                </div>
                                <div className="relative flex justify-center">
                                    <button
                                        onClick={() => openTypeSelectionModal(index)}
                                        className="bg-gray-50 text-gray-400 group-hover/insert:text-primary group-hover/insert:bg-primary/5 px-4 py-1 text-xs font-semibold rounded-full border border-gray-200 group-hover/insert:border-primary/30 shadow-sm transition-all transform hover:scale-105 flex items-center gap-1 opacity-0 group-hover/insert:opacity-100 focus:opacity-100"
                                    >
                                        <PlusCircleIcon className="w-4 h-4" />
                                        Tambah Soal / Keterangan Di Sini
                                    </button>
                                </div>
                            </div>
                        </React.Fragment>
                    ))}
                </div>
                 <div className="mt-6 text-center">
                    <button onClick={() => openTypeSelectionModal(null)} className="flex items-center gap-2 text-sm text-primary font-semibold hover:text-primary-focus mx-auto transition-colors bg-primary/5 px-4 py-2 rounded-full hover:bg-primary/10">
                        <PlusCircleIcon className="w-5 h-5" />
                        Tambah Soal Manual Di Bawah
                    </button>
                </div>
             </div>

            {/* --- Section 4: Configuration --- */}
            <div>
                 <div className="p-4 bg-primary/5 rounded-lg">
                    <h2 className="text-xl font-bold text-neutral">
                        {isEditing ? '2. Atur Konfigurasi Ujian' : '4. Atur Konfigurasi Ujian'}
                    </h2>
                     <p className="text-sm text-base-content mt-1">Atur jadwal, durasi, dan aturan pengerjaan ujian.</p>
                </div>
                <div className="mt-4 bg-white p-6 border rounded-lg grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 shadow-sm">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Tanggal Ujian</label>
                        <input type="date" name="date" value={new Date(config.date).toISOString().split('T')[0]} onChange={handleConfigChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Waktu Mulai Ujian</label>
                        <input type="time" name="startTime" value={config.startTime} onChange={handleConfigChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Batas Waktu (menit)</label>
                        <input type="number" name="timeLimit" value={config.timeLimit} onChange={handleConfigChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Simpan Otomatis (detik)</label>
                        <input type="number" name="autoSaveInterval" value={config.autoSaveInterval} onChange={handleConfigChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
                    </div>
                    <div className="md:col-span-2 space-y-3 pt-2">
                       <label className="flex items-center cursor-pointer"><input type="checkbox" name="shuffleQuestions" checked={config.shuffleQuestions} onChange={handleConfigChange} className="h-4 w-4 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-2 text-sm text-gray-700">Acak Urutan Soal</span></label>
                       <label className="flex items-center cursor-pointer"><input type="checkbox" name="shuffleAnswers" checked={config.shuffleAnswers} onChange={handleConfigChange} className="h-4 w-4 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-2 text-sm text-gray-700">Acak Urutan Jawaban (Pilihan Ganda)</span></label>
                       <label className="flex items-center cursor-pointer"><input type="checkbox" name="allowRetakes" checked={config.allowRetakes} onChange={handleConfigChange} className="h-4 w-4 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-2 text-sm text-gray-700">Izinkan Siswa Mengerjakan Ulang</span></label>
                       <label className="flex items-center cursor-pointer"><input type="checkbox" name="detectBehavior" checked={config.detectBehavior} onChange={handleConfigChange} className="h-4 w-4 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-2 text-sm text-gray-700">Deteksi Pindah Tab/Aplikasi</span></label>
                       {config.detectBehavior && (
                        <label className="flex items-center ml-6 cursor-pointer"><input type="checkbox" name="continueWithPermission" checked={config.continueWithPermission} onChange={handleConfigChange} className="h-4 w-4 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-2 text-sm text-gray-700">Hentikan Ujian & Perlu Izin Guru untuk Melanjutkan</span></label>
                       )}
                    </div>
                </div>
            </div>

            {/* --- Section 5: Generate/Update Exam --- */}
            <div className="text-center pt-4 mt-8 pb-12">
                {isEditing ? (
                    <div className="flex justify-center items-center gap-4">
                        <button onClick={() => setIsEditModalOpen(false)} className="bg-white text-gray-700 border border-gray-300 font-bold py-3 px-8 rounded-lg hover:bg-gray-50 transition-colors duration-300 shadow-sm">
                            Batal
                        </button>
                        <button onClick={handleUpdateExam} className="bg-primary text-primary-content font-bold py-3 px-12 rounded-lg hover:bg-primary-focus transition-colors duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                            Simpan Perubahan
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="border-t pt-8">
                            <button onClick={handleCreateExam} className="bg-green-600 text-white font-bold py-3 px-12 rounded-lg hover:bg-green-700 transition-colors duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center gap-2 mx-auto">
                                <CheckCircleIcon className="w-6 h-6" />
                                Buat Ujian
                            </button>
                        </div>
                        {generatedCode && (
                            <div ref={generatedCodeSectionRef} className="mt-8 p-4 rounded-lg animate-fade-in text-center max-w-md mx-auto">
                                <div className="bg-green-50 border border-green-200 text-green-800 p-6 rounded-xl text-left shadow-sm">
                                    <h4 className="font-bold text-lg mb-2 flex items-center gap-2"><CheckCircleIcon className="w-5 h-5 text-green-600"/> Ujian Berhasil Dibuat!</h4>
                                    <p className="text-sm text-green-700 mb-4">Bagikan kode berikut kepada siswa untuk memulai ujian:</p>
                                    <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-green-200 shadow-inner">
                                        <span className="text-3xl font-mono tracking-widest text-neutral font-bold">{generatedCode}</span>
                                        <button onClick={() => navigator.clipboard.writeText(generatedCode)} className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded hover:bg-gray-200 font-semibold transition-colors border border-gray-300">
                                            Salin Kode
                                        </button>
                                    </div>
                                </div>
                                <button onClick={resetForm} className="mt-8 bg-white text-primary border border-primary font-bold py-2 px-8 rounded-lg hover:bg-primary-50 transition-colors duration-300 shadow-sm">
                                    Buat Ujian Baru
                                </button>
                            </div>
                        )}
                    </>
                )}
                 {error && <p className="text-red-500 text-sm mt-4 font-medium bg-red-50 py-2 px-4 rounded inline-block">{error}</p>}
            </div>
        </div>
    );

    // ... (renderUploadView, renderOngoingExamsView, renderUpcomingExamsView, renderFinishedExamsView logic remains same)
    const renderUploadView = () => {
        return (
            <div className="max-w-4xl mx-auto animate-fade-in space-y-12">
                 <div className="space-y-8">
                    <div className="text-center space-y-4">
                        <h2 className="text-3xl font-bold text-neutral">Buat Ujian Baru</h2>
                        <p className="text-gray-500 max-w-2xl mx-auto">
                            Mulai dengan mengunggah soal dalam format PDF, menempelkan teks soal, atau membuat soal secara manual. 
                            Sistem kami akan membantu Anda menyusun ujian dengan mudah.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Method 3: Manual */}
                        <div 
                            className={`p-6 border-2 rounded-xl cursor-pointer transition-all duration-300 group border-gray-200 hover:border-primary/50 hover:shadow-md`}
                            onClick={handleManualCreateClick}
                        >
                            <div className="flex flex-col items-center text-center space-y-3">
                                <div className={`p-4 rounded-full transition-colors bg-gray-100 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary`}>
                                    <PlusCircleIcon className="w-8 h-8" />
                                </div>
                                <h3 className="font-bold text-lg text-neutral">Buat Manual</h3>
                                <p className="text-sm text-gray-500">
                                    Buat soal dari awal secara manual tanpa impor file atau teks.
                                </p>
                            </div>
                        </div>

                        {/* Method 1: Upload PDF */}
                        <div 
                            className={`p-6 border-2 rounded-xl cursor-pointer transition-all duration-300 group ${inputMethod === 'upload' ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-200 hover:border-primary/50 hover:shadow-md'}`}
                            onClick={() => setInputMethod('upload')}
                        >
                            <div className="flex flex-col items-center text-center space-y-3">
                                <div className={`p-4 rounded-full transition-colors ${inputMethod === 'upload' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary'}`}>
                                    <CloudArrowUpIcon className="w-8 h-8" />
                                </div>
                                <h3 className="font-bold text-lg text-neutral">Unggah PDF Soal</h3>
                                <p className="text-sm text-gray-500">
                                    Sistem akan otomatis mendeteksi dan memotong soal dari file PDF Anda.
                                </p>
                            </div>
                        </div>

                        {/* Method 2: Paste Text */}
                        <div 
                            className={`p-6 border-2 rounded-xl cursor-pointer transition-all duration-300 group ${inputMethod === 'paste' ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-200 hover:border-primary/50 hover:shadow-md'}`}
                            onClick={() => setInputMethod('paste')}
                        >
                            <div className="flex flex-col items-center text-center space-y-3">
                                <div className={`p-4 rounded-full transition-colors ${inputMethod === 'paste' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary'}`}>
                                    <ListBulletIcon className="w-8 h-8" />
                                </div>
                                <h3 className="font-bold text-lg text-neutral">Tempel Teks Soal</h3>
                                <p className="text-sm text-gray-500">
                                    Salin dan tempel teks soal langsung dari dokumen Word atau sumber lain.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border shadow-sm transition-all duration-300">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-neutral mb-1">
                                {inputMethod === 'upload' ? 'Unggah File PDF' : 'Tempel Teks Soal'}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {inputMethod === 'upload' ? 'Pilih file PDF dari perangkat Anda.' : 'Pastikan format soal jelas (nomor dan opsi).'}
                            </p>
                        </div>

                        {inputMethod === 'upload' ? (
                            <div className="space-y-4">
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors relative">
                                    <input 
                                        type="file" 
                                        accept=".pdf" 
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                setUploadedFile(e.target.files[0]);
                                                setInputText('');
                                            }
                                        }}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="space-y-2 pointer-events-none">
                                        <CloudArrowUpIcon className="w-10 h-10 text-gray-400 mx-auto" />
                                        {uploadedFile ? (
                                            <p className="font-semibold text-primary">{uploadedFile.name}</p>
                                        ) : (
                                            <>
                                                <p className="text-gray-600 font-medium">Klik atau seret file PDF ke sini</p>
                                                <p className="text-xs text-gray-400">Maksimal ukuran file 10MB</p>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {previewImages.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-semibold text-gray-700">Pratinjau Halaman Pertama:</p>
                                        <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto bg-gray-100 p-2 text-center">
                                            <img src={previewImages[0]} alt="Preview PDF" className="max-w-full h-auto mx-auto shadow-sm" />
                                        </div>
                                        <div className="flex justify-end">
                                            <button 
                                                onClick={handleExtractText}
                                                className="text-sm text-primary hover:underline flex items-center gap-1"
                                                disabled={isLoading}
                                            >
                                                <FileTextIcon className="w-4 h-4" />
                                                Ekstrak Teks dari PDF (Jika Auto-Crop Gagal)
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <textarea
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    className="w-full h-64 p-4 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary font-mono text-sm resize-y"
                                    placeholder={`Contoh Format:\n\n1. Apa ibukota Indonesia?\nA. Bandung\nB. Jakarta\nC. Surabaya\nD. Medan\n\nKunci Jawaban: B`}
                                />
                                {inputText && (
                                    <div className="flex justify-end">
                                        <button 
                                            onClick={handleDirectManualTransfer}
                                            className="text-sm text-secondary hover:underline flex items-center gap-1"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                            Gunakan sebagai Soal Manual (Tanpa Parsing Otomatis)
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {error && (
                            <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2">
                                <span className="font-bold">Error:</span> {error}
                            </div>
                        )}

                        <div className="mt-6 flex justify-end">
                            <button 
                                onClick={handleStartAnalysis} 
                                disabled={isLoading || (!inputText && !uploadedFile)}
                                className={`w-full sm:w-auto px-8 py-3 rounded-lg font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all ${isLoading || (!inputText && !uploadedFile) ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-focus hover:shadow-lg transform hover:-translate-y-0.5'}`}
                            >
                                {isLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        Memproses...
                                    </>
                                ) : (
                                    <>
                                        <CogIcon className="w-5 h-5" />
                                        {inputMethod === 'upload' ? 'Analisis & Crop PDF' : 'Analisis Teks'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* EDITOR SECTION - RENDERED BELOW INPUT */}
                {(questions.length > 0 || manualMode) && !isLoading && (
                    <div className="border-t-2 border-gray-200 pt-12">
                        {renderEditorView(false)}
                    </div>
                )}
            </div>
        );
    };

    const renderOngoingExamsView = () => {
        const now = new Date();
        const allExams: Exam[] = Object.values(exams);

        const ongoingExams = allExams.filter((exam) => {
            const examStartDateTime = new Date(`${exam.config.date.split('T')[0]}T${exam.config.startTime}`);
            const examEndDateTime = new Date(examStartDateTime.getTime() + exam.config.timeLimit * 60 * 1000);
            return now >= examStartDateTime && now <= examEndDateTime;
        });


        return (
            <div className="space-y-6 animate-fade-in">
                <div>
                    <h2 className="text-2xl font-bold text-neutral">Ujian Sedang Berlangsung</h2>
                    <p className="text-base-content mt-1">Pantau kemajuan ujian yang sedang berjalan secara real-time.</p>
                </div>
                {ongoingExams.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {ongoingExams.map(exam => (
                            <div key={exam.code} className="bg-white p-5 rounded-lg border shadow-sm hover:shadow-lg hover:border-primary transition-all duration-200 cursor-pointer" onClick={() => setSelectedOngoingExam(exam)}>
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-lg text-primary">{exam.code}</h3>
                                    <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                        {results.filter(r => r.examCode === exam.code).length} Siswa
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                    {new Date(exam.config.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                                    <span className="text-sm font-semibold text-gray-600">Sisa Waktu:</span>
                                    <div className="text-lg text-red-500">
                                        <RemainingTime exam={exam} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-white rounded-lg border">
                        <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak Ada Ujian Aktif</h3>
                        <p className="mt-1 text-sm text-gray-500">Saat ini tidak ada ujian yang sedang berlangsung.</p>
                    </div>
                )}
            </div>
        );
    };

    const renderUpcomingExamsView = () => {
        const now = new Date();
        const allExams: Exam[] = Object.values(exams);
        
        const upcomingExams = allExams.filter((exam) => {
            const examStartDateTime = new Date(`${exam.config.date.split('T')[0]}T${exam.config.startTime}`);
            return examStartDateTime > now;
        }).sort((a, b) => {
             const aDate = new Date(`${a.config.date.split('T')[0]}T${a.config.startTime}`);
             const bDate = new Date(`${b.config.date.split('T')[0]}T${b.config.startTime}`);
             return aDate.getTime() - bDate.getTime();
        });


        return (
            <div className="space-y-3">
                <div>
                    <h2 className="text-2xl font-bold text-neutral">Ujian Akan Datang</h2>
                    <p className="text-base-content mt-1">Daftar semua ujian yang telah dijadwalkan untuk masa depan.</p>
                </div>
                {upcomingExams.length > 0 ? (
                    <div className="space-y-3">
                        {upcomingExams.map(exam => (
                            <div key={exam.code} className="bg-white p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all hover:shadow-md hover:border-secondary">
                                <div className="flex items-center gap-4">
                                    <div className="bg-secondary/10 p-3 rounded-lg">
                                        <CalendarDaysIcon className="w-6 h-6 text-secondary" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg text-neutral">{exam.code}</p>
                                        <p className="text-sm text-gray-500">
                                            {new Date(exam.config.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                                            {` - ${exam.config.startTime}`}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => { setIsEditModalOpen(true); setEditingExam(exam); setQuestions(exam.questions); setConfig(exam.config); }} className="flex items-center gap-2 bg-accent text-white px-4 py-2 text-sm rounded-md hover:bg-accent-focus transition-colors font-semibold shadow-sm self-end sm:self-auto">
                                    <PencilIcon className="w-4 h-4" />
                                    Edit
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-white rounded-lg border mt-4">
                        <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak Ada Ujian Terjadwal</h3>
                        <p className="mt-1 text-sm text-gray-500">Buat ujian baru untuk memulai.</p>
                    </div>
                )}
            </div>
        );
    };

    const renderFinishedExamsView = () => {
        const now = new Date();
        const allExams: Exam[] = Object.values(exams);
        
        const finishedExams = allExams.filter((exam) => {
            const examStartDateTime = new Date(`${exam.config.date.split('T')[0]}T${exam.config.startTime}`);
            const examEndDateTime = new Date(examStartDateTime.getTime() + exam.config.timeLimit * 60 * 1000);
            return examEndDateTime < now;
        }).sort((a, b) => {
            const aDate = new Date(`${b.config.date.split('T')[0]}T${b.config.startTime}`);
            const bDate = new Date(`${a.config.date.split('T')[0]}T${a.config.startTime}`);
            return aDate.getTime() - bDate.getTime();
        });


        return (
            <div className="space-y-6 animate-fade-in">
                <div>
                    <h2 className="text-2xl font-bold text-neutral">Ujian Selesai</h2>
                    <p className="text-base-content mt-1">Lihat kembali hasil dari ujian yang telah selesai.</p>
                </div>
                {finishedExams.length > 0 ? (
                    <div className="space-y-3">
                        {finishedExams.map(exam => (
                            <div key={exam.code} className="bg-white p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all hover:shadow-md hover:border-gray-400">
                                <div className="flex items-center gap-4">
                                    <div className="bg-gray-100 p-3 rounded-lg">
                                        <CheckCircleIcon className="w-6 h-6 text-gray-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg text-neutral">{exam.code}</p>
                                        <p className="text-sm text-gray-500">{new Date(exam.config.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedFinishedExam(exam)} className="flex items-center gap-2 bg-primary text-primary-content px-4 py-2 text-sm rounded-md hover:bg-primary-focus transition-colors font-semibold shadow-sm self-end sm:self-auto">
                                    <ChartBarIcon className="w-4 h-4" />
                                    Lihat Hasil
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                     <div className="text-center py-12 bg-white rounded-lg border mt-4">
                        <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Belum Ada Ujian Selesai</h3>
                        <p className="mt-1 text-sm text-gray-500">Hasil ujian yang telah selesai akan muncul di sini.</p>
                    </div>
                )}
            </div>
        );
    };
    
    // ... (renderOngoingExamModal, renderFinishedExamModal remains same)
    const renderOngoingExamModal = () => {
        if (!selectedOngoingExam) return null;

        const examResults = results.filter(r => r.examCode === selectedOngoingExam.code);
        const scorableQuestionsCount = selectedOngoingExam.questions.filter(q => q.questionType !== 'ESSAY' && q.questionType !== 'INFO').length;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in">
                <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                    <div className="p-4 border-b flex justify-between items-center">
                        <h2 className="text-lg font-bold text-neutral">Pantau Ujian: {selectedOngoingExam.code}</h2>
                        <button onClick={() => setSelectedOngoingExam(null)} className="p-1 rounded-full hover:bg-gray-200">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="p-6 overflow-y-auto">
                        {examResults.length > 0 ? (
                             <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Siswa</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Benar</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salah</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hasil</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keterangan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {examResults.map(result => {
                                            const incorrectCount = scorableQuestionsCount - result.correctAnswers;
                                            return (
                                                <tr key={result.student.studentId} className={`transition-colors hover:bg-gray-50 ${result.status === 'force_submitted' ? 'bg-yellow-50' : ''}`}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.student.fullName}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">{result.correctAnswers}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">{incorrectCount < 0 ? 0 : incorrectCount}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">{result.score}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        {result.status === 'force_submitted' ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-yellow-800 bg-yellow-100 px-2 py-1 rounded-full text-xs font-semibold">Ditangguhkan</span>
                                                                <button onClick={() => onAllowContinuation(result.student.studentId, result.examCode)} className="bg-green-500 text-white px-3 py-1 text-xs rounded-md hover:bg-green-600 font-semibold">
                                                                    Izinkan
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-green-800 bg-green-100 px-2 py-1 rounded-full text-xs font-semibold">Mengerjakan</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : <p className="text-center text-gray-500 py-8">Belum ada siswa yang memulai ujian ini.</p>}
                    </div>
                </div>
            </div>
        );
    };

    const renderFinishedExamModal = () => {
        if (!selectedFinishedExam) return null;

        const examResults = results.filter(r => r.examCode === selectedFinishedExam.code);
        const scorableQuestionsCount = selectedFinishedExam.questions.filter(q => q.questionType !== 'ESSAY' && q.questionType !== 'INFO').length;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in">
                <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                    <div className="p-4 border-b flex justify-between items-center">
                        <h2 className="text-lg font-bold text-neutral">Hasil Ujian: {selectedFinishedExam.code}</h2>
                        <button onClick={() => setSelectedFinishedExam(null)} className="p-1 rounded-full hover:bg-gray-200">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="p-6 overflow-y-auto">
                        {examResults.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Siswa</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Benar</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Salah</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Hasil</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aktivitas</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {examResults.map((result, index) => {
                                            const incorrectCount = scorableQuestionsCount - result.correctAnswers;
                                            return (
                                                <tr key={result.student.studentId} className="transition-colors hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.student.fullName}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold text-center">{result.correctAnswers}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold text-center">{incorrectCount < 0 ? 0 : incorrectCount}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-center">{result.score}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 align-top">
                                                        {result.activityLog && result.activityLog.length > 0 ? (
                                                            <ul className="list-disc list-outside pl-5 space-y-1">
                                                                {result.activityLog.map((log, logIndex) => (
                                                                    <li key={logIndex}>{log}</li>
                                                                ))}
                                                            </ul>
                                                        ) : (
                                                            <span>-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 align-top">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${result.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                            {result.status === 'completed' ? 'Selesai' : 'Dibatalkan'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : <p className="text-center text-gray-500 py-8">Belum ada hasil untuk ujian ini.</p>}
                    </div>
                </div>
            </div>
        );
    }

    const renderEditExamModal = () => {
        if (!isEditModalOpen || !editingExam) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in">
                <div className="bg-base-200 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                    <div className="p-4 bg-base-100 border-b flex justify-between items-center sticky top-0">
                        <h2 className="text-lg font-bold text-neutral">Edit Ujian: <span className="text-primary font-mono">{editingExam.code}</span></h2>
                        <button onClick={() => setIsEditModalOpen(false)} className="p-1 rounded-full hover:bg-gray-200">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="p-6 overflow-y-auto">
                        {renderEditorView(true)}
                    </div>
                </div>
            </div>
        );
    };

    // Render Type Selection Modal
    const renderTypeSelectionModal = () => {
        if (!isTypeSelectionModalOpen) return null;
        
        const types: {type: QuestionType, label: string, desc: string, icon: React.FC<any>}[] = [
            { type: 'INFO', label: 'Keterangan / Info', desc: 'Hanya teks atau gambar, tanpa pertanyaan.', icon: FileTextIcon },
            { type: 'MULTIPLE_CHOICE', label: 'Pilihan Ganda', desc: 'Satu jawaban benar dari beberapa opsi.', icon: ListBulletIcon },
            { type: 'COMPLEX_MULTIPLE_CHOICE', label: 'Pilihan Ganda Kompleks', desc: 'Lebih dari satu jawaban benar.', icon: CheckCircleIcon },
            { type: 'FILL_IN_THE_BLANK', label: 'Isian Singkat', desc: 'Jawaban teks pendek otomatis dinilai.', icon: PencilIcon },
            { type: 'ESSAY', label: 'Uraian / Esai', desc: 'Jawaban panjang dinilai manual.', icon: FileWordIcon },
            { type: 'TRUE_FALSE', label: 'Benar / Salah', desc: 'Memilih pernyataan benar atau salah.', icon: CheckIcon },
            { type: 'MATCHING', label: 'Menjodohkan', desc: 'Menghubungkan pasangan item kiri dan kanan.', icon: ArrowLeftIcon },
        ];

        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[60] animate-fade-in">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-lg text-gray-800">Pilih Tipe Soal</h3>
                        <button onClick={() => setIsTypeSelectionModalOpen(false)} className="p-1 rounded-full hover:bg-gray-200"><XMarkIcon className="w-5 h-5"/></button>
                    </div>
                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {types.map((t) => (
                            <button 
                                key={t.type}
                                onClick={() => handleSelectQuestionType(t.type)}
                                className="flex items-start gap-4 p-4 border rounded-lg hover:border-primary hover:bg-primary/5 hover:shadow-md transition-all text-left group"
                            >
                                <div className="bg-gray-100 p-2.5 rounded-full group-hover:bg-primary group-hover:text-white transition-colors">
                                    <t.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800 group-hover:text-primary">{t.label}</p>
                                    <p className="text-xs text-gray-500 mt-1">{t.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-base-200">
            <header ref={headerRef} className="bg-base-100 shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="py-4 flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-neutral">Dashboard Guru</h1>
                        <div className="flex items-center gap-4">
                            <button onClick={onLogout} className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary font-semibold">
                                <LogoutIcon className="w-5 h-5"/>
                                Logout
                            </button>
                        </div>
                    </div>
                    <nav className="flex border-b -mb-px overflow-x-auto whitespace-nowrap">
                         <button onClick={() => setView('UPLOAD')} className={`px-4 sm:px-6 py-3 text-sm font-medium flex items-center gap-2 transition-colors border-b-2 flex-shrink-0 ${view === 'UPLOAD' ? 'border-primary text-primary' : 'text-gray-500 hover:text-gray-700 border-transparent'}`}>
                            <CheckCircleIcon className="w-5 h-5"/> Buat Ujian
                        </button>
                        <button onClick={() => setView('ONGOING')} className={`px-4 sm:px-6 py-3 text-sm font-medium flex items-center gap-2 transition-colors border-b-2 flex-shrink-0 ${view === 'ONGOING' ? 'border-primary text-primary' : 'text-gray-500 hover:text-gray-700 border-transparent'}`}>
                            <ClockIcon className="w-5 h-5"/> Ujian Berlangsung
                        </button>
                        <button onClick={() => setView('UPCOMING_EXAMS')} className={`px-4 sm:px-6 py-3 text-sm font-medium flex items-center gap-2 transition-colors border-b-2 flex-shrink-0 ${view === 'UPCOMING_EXAMS' ? 'border-primary text-primary' : 'text-gray-500 hover:text-gray-700 border-transparent'}`}>
                            <CalendarDaysIcon className="w-5 h-5"/> Ujian Akan Datang
                        </button>
                        <button onClick={() => setView('FINISHED_EXAMS')} className={`px-4 sm:px-6 py-3 text-sm font-medium flex items-center gap-2 transition-colors border-b-2 flex-shrink-0 ${view === 'FINISHED_EXAMS' ? 'border-primary text-primary' : 'text-gray-500 hover:text-gray-700 border-transparent'}`}>
                            <ChartBarIcon className="w-5 h-5"/> Ujian Selesai
                        </button>
                    </nav>
                </div>
            </header>
            <main className="max-w-[95%] mx-auto p-4 md:p-8">
                {view === 'UPLOAD' && renderUploadView()}
                {view === 'ONGOING' && renderOngoingExamsView()}
                {view === 'UPCOMING_EXAMS' && renderUpcomingExamsView()}
                {view === 'FINISHED_EXAMS' && renderFinishedExamsView()}
            </main>

            {renderOngoingExamModal()}
            {renderFinishedExamModal()}
            {renderEditExamModal()}
            {renderTypeSelectionModal()}
        </div>
    );
};
