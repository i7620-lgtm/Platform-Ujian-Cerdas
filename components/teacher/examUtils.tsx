

import type { Question, QuestionType } from '../../types';

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

// --- COMPUTER VISION HELPERS ---

// STRATEGI PENYIMPANAN: 
// Kita menggunakan kualitas 0.6 (agak rendah) untuk menghemat database secara drastis.
// Namun kita menjaga resolusi (maxWidth) di 1000px.
// Tujuannya: File kecil, tapi pikselnya cukup banyak agar bisa "dipertajam" kembali oleh filter CSS/SVG di sisi siswa.
export const compressImage = (dataUrl: string, quality = 0.6, maxWidth = 1000): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(dataUrl);

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            // Menggunakan image smoothing 'medium' untuk hasil downscaling yang wajar
            ctx.imageSmoothingQuality = 'medium';
            ctx.drawImage(img, 0, 0, width, height);
            
            // Kompresi agresif (0.6)
            resolve(canvas.toDataURL('image/jpeg', quality));
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
            // Crop juga dikompresi
            resolve(canvas.toDataURL('image/jpeg', 0.6));
        } catch (e) {
            console.error("Crop error:", e);
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
            resolve(canvas.toDataURL('image/jpeg', 0.6));
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
                resolve(finalCanvas.toDataURL('image/jpeg', 0.6));
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
        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) return reject(new Error("Pustaka PDF belum siap."));

        const reader = new FileReader();
        reader.onload = async (e) => {
            if (!e.target?.result) return reject(new Error("Gagal membaca file."));
            try {
                // Set verbosity to 0 to suppress warnings (like "TT: undefined function: 32")
                const doc = await pdfjsLib.getDocument({ 
                    data: e.target.result as ArrayBuffer,
                    verbosity: 0 
                }).promise;
                
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
                    images.push(canvas.toDataURL('image/jpeg', 0.7));
                }
                resolve(images);
            } catch (err) { reject(new Error('Gagal mengonversi PDF.')); }
        };
        reader.readAsArrayBuffer(file);
    });
};

export const extractTextFromPdf = async (file: File): Promise<string> => {
    const pdfjsLib = (window as any).pdfjsLib;
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
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + "\n\n";
    }
    return fullText;
};

// --- GEOMETRIC PDF PARSER ENGINE ---

export const parsePdfAndAutoCrop = async (file: File): Promise<Question[]> => {
    const pdfjsLib = (window as any).pdfjsLib;
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
    const qRegex = /^\s*(\d+)[\.\)]/;
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
                    finalImage = canvas.toDataURL('image/jpeg', 0.6);
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
                });
            }
            
            // WRAP IMAGE IN HTML TAG
            const imgData = await processAnchorCrop(anchor, i);
            currentQObj = {
                id: `q-${anchor.id}-${Date.now()}`,
                questionText: `<img src="${imgData}" alt="Soal" style="max-width: 100%; height: auto; border-radius: 8px; display: block; margin: 10px 0;" />`
            };
            currentOptions = [];
        } else if (anchor.type === 'OPTION') {
            if (currentQObj.id) {
                currentOptions.push({
                    id: anchor.id,
                    // WRAP IMAGE IN HTML TAG
                    promise: processAnchorCrop(anchor, i).then(imgData => {
                        return `<img src="${imgData}" alt="Opsi" style="max-width: 100%; height: auto; border-radius: 6px; display: block;" />`;
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

    const questionStartPattern = /^\s*(?:soal|no\.?|nomor)?\s*(\d+)[\.\)\-\s]\s*(.*)/i;
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

export const generateExamCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};
