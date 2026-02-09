
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
    y: number; // Top Y relative to page
    bottom: number; // Bottom Y of the anchor line
    lineHeight: number;
}

interface PageData {
    canvas: HTMLCanvasElement;
    width: number;
    height: number;
    columnSplitX: number | null; // Jika null, berarti 1 kolom
}

// --- COMPUTER VISION HELPERS ---

export const compressImage = (dataUrl: string, quality = 0.7, maxWidth = 800, maxSizeBytes = 150 * 1024): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let width = img.width;
            let height = img.height;
            let currentQuality = quality;

            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(dataUrl);

            const process = (w: number, h: number, q: number): string => {
                canvas.width = w;
                canvas.height = h;
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, w, h);
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high'; 
                ctx.drawImage(img, 0, 0, w, h);
                // FORCE WEBP
                return canvas.toDataURL('image/webp', q);
            };

            let resultUrl = process(width, height, currentQuality);

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

// Smart Crop: Memotong hanya area yang diminta
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
            // FORCE WEBP
            resolve(canvas.toDataURL('image/webp', 0.8));
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
            resolve(canvas.toDataURL('image/webp', 0.8));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
};

// --- SMART VISION ALGORITHMS ---

// Analisis Layout Halaman (Ide 2: Layout Analysis)
// Mendeteksi apakah halaman memiliki 2 kolom dengan teknik Vertical Projection Profile
const analyzePageStructure = (ctx: CanvasRenderingContext2D, width: number, height: number): number | null => {
    // 1. Ambil sampel piksel (Downscale agar cepat)
    // Kita hanya butuh pola gelap/terang, tidak perlu resolusi penuh
    const sampleScale = 0.2; // 20% resolusi asli
    const sW = Math.floor(width * sampleScale);
    const sH = Math.floor(height * sampleScale);
    
    // Buat canvas kecil untuk analisis
    const analysisCanvas = document.createElement('canvas');
    analysisCanvas.width = sW;
    analysisCanvas.height = sH;
    const aCtx = analysisCanvas.getContext('2d');
    if (!aCtx) return null;
    
    // Gambar ulang ke canvas kecil
    aCtx.drawImage(ctx.canvas, 0, 0, sW, sH);
    const imgData = aCtx.getImageData(0, 0, sW, sH);
    const data = imgData.data;

    // 2. Vertical Projection Profile (VPP)
    // Hitung jumlah piksel gelap di setiap kolom vertikal
    const vpp = new Array(sW).fill(0);
    for (let x = 0; x < sW; x++) {
        for (let y = 0; y < sH; y++) {
            const idx = (y * sW + x) * 4;
            // Jika piksel bukan putih (R<240 atau G<240 atau B<240)
            if (data[idx] < 240 || data[idx+1] < 240 || data[idx+2] < 240) {
                vpp[x]++;
            }
        }
    }

    // 3. Cari Gap di Tengah (Gutter Detection)
    // Kita cari area di tengah (30% - 70% lebar) yang memiliki sedikit sekali piksel gelap
    const startSearch = Math.floor(sW * 0.3);
    const endSearch = Math.floor(sW * 0.7);
    const minGapWidth = Math.floor(sW * 0.05); // Minimal lebar parit 5% dari lebar halaman
    
    let bestGapStart = -1;
    let bestGapWidth = 0;
    let currentGapStart = -1;

    for (let x = startSearch; x < endSearch; x++) {
        // Threshold: Dianggap kosong jika < 1% tinggi halaman berisi tinta
        const isEmpty = vpp[x] < (sH * 0.01); 
        
        if (isEmpty) {
            if (currentGapStart === -1) currentGapStart = x;
        } else {
            if (currentGapStart !== -1) {
                const gapW = x - currentGapStart;
                if (gapW > bestGapWidth) {
                    bestGapWidth = gapW;
                    bestGapStart = currentGapStart;
                }
                currentGapStart = -1;
            }
        }
    }

    // Cek gap terakhir jika sampai ujung
    if (currentGapStart !== -1) {
        const gapW = endSearch - currentGapStart;
        if (gapW > bestGapWidth) {
            bestGapWidth = gapW;
            bestGapStart = currentGapStart;
        }
    }

    // Jika ditemukan gap yang cukup lebar, kembalikan titik tengah gap dalam koordinat ASLI
    if (bestGapWidth > minGapWidth) {
        const centerGapX = (bestGapStart + (bestGapWidth / 2)) / sampleScale;
        return centerGapX;
    }

    return null; // 1 Kolom
};

// Analisis Ketinggian Visual (Ide 1: Projection Profile)
// Mencari batas bawah visual yang sebenarnya (menghindari memotong gambar)
const findVisualBottom = (ctx: CanvasRenderingContext2D, startY: number, limitY: number, width: number, startX: number, endX: number): number => {
    // Safety margin
    if (limitY <= startY) return startY + 50;

    const cropH = limitY - startY;
    const cropW = endX - startX;
    
    // Ambil data piksel area kandidat potong
    const imgData = ctx.getImageData(startX, startY, cropW, cropH);
    const data = imgData.data;
    
    // Horizontal Projection Profile (HPP) dari bawah ke atas
    // Kita cari baris kosong terakhir sebelum menyentuh konten soal berikutnya
    
    // Default: gunakan limitY (batas teks soal berikutnya)
    // Tapi kita cek apakah area "di atas" limitY itu kosong atau padat?
    
    // Strategi: Scan dari bawah (limitY) ke atas.
    // Jika kita menemukan area kosong (putih) tepat di atas limitY, itu bagus.
    // Tapi jika tepat di atas limitY ada tinta (gambar), kita harus hati-hati. 
    // Namun, logika aplikasi ini adalah: Soal N ada di Y1, Soal N+1 ada di Y2. 
    // Area N adalah Y1 sampai Y2.
    // Jadi fungsi ini sebenarnya lebih berguna untuk TRIM WHITESPACE di bawah.
    
    let lastInkY = 0; // Relative to startY
    
    for (let y = cropH - 1; y >= 0; y--) {
        let hasInk = false;
        // Scan baris (skip pixel agar cepat)
        for (let x = 0; x < cropW; x += 4) {
            const idx = (y * cropW + x) * 4;
            if (data[idx] < 240 || data[idx+1] < 240 || data[idx+2] < 240) {
                hasInk = true;
                break;
            }
        }
        
        if (hasInk) {
            lastInkY = y;
            break;
        }
    }
    
    // Berikan padding sedikit di bawah tinta terakhir
    const visualBottom = startY + lastInkY + 15; // +15px padding
    
    // Jangan pernah melebihi limitY (karena itu milik soal berikutnya)
    return Math.min(visualBottom, limitY);
};

// --- PDF PROCESSING & MAIN LOGIC ---

export const convertPdfToImages = (file: File, scale = 1.5): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) return reject(new Error("Pustaka PDF belum siap."));

        const reader = new FileReader();
        reader.onload = async (e) => {
            if (!e.target?.result) return reject(new Error("Gagal membaca file."));
            try {
                const doc = await pdfjsLib.getDocument({ 
                    data: e.target.result as ArrayBuffer,
                    verbosity: 0 
                }).promise;
                
                const images: string[] = [];
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
                    images.push(canvas.toDataURL('image/webp', 0.8));
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
    const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer(), verbosity: 0 }).promise;
    let fullText = "";
    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + "\n\n";
    }
    return fullText;
};

// --- CORE: SMART PARSER ENGINE ---

export const parsePdfAndAutoCrop = async (file: File): Promise<Question[]> => {
    const pdfjsLib = (window as any).pdfjsLib;
    if (!pdfjsLib) throw new Error("Pustaka PDF belum siap.");

    const doc = await pdfjsLib.getDocument({ 
        data: await file.arrayBuffer(),
        verbosity: 0 
    }).promise;
    
    const numPages = doc.numPages;
    const SCALE = 2.0; // High Quality for OCR/Reading

    const pagesData: PageData[] = [];
    const allLines: VisualLine[] = [];

    // --- STEP 1: RENDER PAGES & DETECT LAYOUT (Ide 1 & 2) ---
    for (let i = 1; i <= numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: SCALE });
        
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if(!ctx) continue;

        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;

        // ANALISIS KOLOM OTOMATIS
        const columnSplitX = analyzePageStructure(ctx, viewport.width, viewport.height);
        
        pagesData.push({ 
            canvas, 
            width: viewport.width, 
            height: viewport.height,
            columnSplitX 
        });

        // Extract Text Positions
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
            // Sort dasar: Y dulu, baru X
            const yDiff = a.top - b.top;
            if (Math.abs(yDiff) < 5) return a.x - b.x; 
            return yDiff; 
        });

        // Group Text into Lines
        let currentLine: VisualLine | null = null;
        items.forEach((item: any) => {
            if (item.top > viewport.height * 0.96) return; // Footer filtering
            if (item.top < viewport.height * 0.02) return; // Header filtering

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

    // --- STEP 2: DETECT ANCHORS & INTELLIGENT SORTING (Ide 2) ---
    const anchors: Anchor[] = [];
    // Regex fleksibel untuk menangkap: "1.", "1)", "No. 1", dll
    const qRegex = /^\s*(?:no\.?|soal)?\s*(\d+)[\.\)\-\s]/i;
    // Regex fleksibel untuk opsi: "A.", "a)", "(A)", dll
    const optRegex = /^\s*(?:[\(\[])?\s*([a-eA-E])\s*(?:[\)\]\.]|\s-)/;

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

    // PENTING: Pengurutan Cerdas Berdasarkan Kolom
    anchors.sort((a,b) => {
        if (a.pageIdx !== b.pageIdx) return a.pageIdx - b.pageIdx;
        
        const pageInfo = pagesData[a.pageIdx];
        if (pageInfo.columnSplitX) {
            // Mode 2 Kolom
            const aIsLeft = a.x < pageInfo.columnSplitX;
            const bIsLeft = b.x < pageInfo.columnSplitX;
            
            if (aIsLeft && !bIsLeft) return -1; // Kiri duluan
            if (!aIsLeft && bIsLeft) return 1;  // Kanan belakangan
            
            // Jika satu kolom, urutkan berdasarkan Y (vertikal)
            return a.y - b.y;
        } else {
            // Mode 1 Kolom (Standar)
            if (Math.abs(a.y - b.y) > 15) return a.y - b.y;
            return a.x - b.x;
        }
    });

    // --- STEP 3: BUILD GRID & SMART CROP (Ide 3: Hybrid Bounding) ---
    const questions: Question[] = [];
    let currentQObj: Partial<Question> = {};
    let currentOptions: {id: string, promise: Promise<string>}[] = [];

    const getCropRect = (anchor: Anchor, nextAnchor?: Anchor) => {
        const pageData = pagesData[anchor.pageIdx];
        const PADDING_TOP = 10;
        
        const MIN_Y = Math.max(0, anchor.y - PADDING_TOP);
        
        // Tentukan batas kiri dan kanan (Column Aware)
        let MIN_X = 0;
        let MAX_X = pageData.width;
        
        if (pageData.columnSplitX) {
            if (anchor.x < pageData.columnSplitX) {
                // Kolom Kiri
                MAX_X = pageData.columnSplitX - 10;
            } else {
                // Kolom Kanan
                MIN_X = pageData.columnSplitX + 10;
            }
        } else {
            // 1 Kolom: Gunakan margin standard
            MIN_X = Math.max(0, anchor.x - 20);
        }

        // Tentukan batas bawah (Smart Zoning)
        let MAX_Y = pageData.height * 0.96; // Default ke footer
        
        if (nextAnchor && nextAnchor.pageIdx === anchor.pageIdx) {
            // Cek apakah next anchor berada di kolom yang sama (jika mode 2 kolom)
            let sameColumn = true;
            if (pageData.columnSplitX) {
                const currLeft = anchor.x < pageData.columnSplitX;
                const nextLeft = nextAnchor.x < pageData.columnSplitX;
                sameColumn = (currLeft === nextLeft);
            }
            
            if (sameColumn && nextAnchor.y > anchor.y) {
                // Batas bawah adalah atas anchor berikutnya dikurangi padding
                MAX_Y = nextAnchor.y - 8;
            }
        }

        // TRIM VISUAL (Ide 1)
        // Gunakan Projection Profile untuk memangkas ruang kosong berlebih di bawah
        // agar gambar tidak terlalu tinggi jika ada space kosong besar
        const ctx = pageData.canvas.getContext('2d');
        if (ctx) {
            MAX_Y = findVisualBottom(ctx, MIN_Y, MAX_Y, pageData.width, MIN_X, MAX_X);
        }

        return { x: MIN_X, y: MIN_Y, w: MAX_X - MIN_X, h: MAX_Y - MIN_Y };
    };

    const processAnchorCrop = async (anchor: Anchor, index: number): Promise<string> => {
        const nextAnchor = anchors[index + 1];
        const rect = getCropRect(anchor, nextAnchor); 
        const pageData = pagesData[anchor.pageIdx];
        
        let finalImage = '';

        // Kasus Split Lintas Halaman (Jarang terjadi di soal standar, tapi ditangani)
        const isSplitAcrossPages = nextAnchor && nextAnchor.pageIdx === anchor.pageIdx + 1 && nextAnchor.type === 'OPTION' && anchor.type === 'QUESTION';
        
        if (isSplitAcrossPages) {
            // Logika kompleks join halaman bisa ditambahkan di sini
            // Untuk versi ringan, kita crop halaman ini saja
            finalImage = await cropImage(pageData.canvas, rect.x, rect.y, rect.w, rect.h);
        } else {
            finalImage = await cropImage(pageData.canvas, rect.x, rect.y, rect.w, rect.h);
        }

        return await addWhitePadding(finalImage, 10);
    };

    // --- PROCESSING LOOP ---
    for (let i = 0; i < anchors.length; i++) {
        const anchor = anchors[i];
        
        if (anchor.type === 'QUESTION') {
            // Finalisasi soal sebelumnya jika ada
            if (currentQObj.id) {
                questions.push({
                    id: currentQObj.id,
                    questionText: currentQObj.questionText || '',
                    questionType: currentOptions.length > 0 ? 'MULTIPLE_CHOICE' : 'ESSAY',
                    options: currentOptions.length > 0 ? await Promise.all(currentOptions.map(o => o.promise)) : undefined,
                    correctAnswer: currentOptions.length > 0 ? await currentOptions[0].promise : undefined,
                });
            }
            
            const imgData = await processAnchorCrop(anchor, i);
            currentQObj = {
                id: `q-${anchor.id}-${Date.now()}`,
                questionText: `<img src="${imgData}" alt="Soal ${anchor.id}" style="max-width: 100%; height: auto; border-radius: 8px; display: block; margin: 5px 0;" />`
            };
            currentOptions = [];
        } else if (anchor.type === 'OPTION') {
            if (currentQObj.id) {
                currentOptions.push({
                    id: anchor.id,
                    promise: processAnchorCrop(anchor, i).then(imgData => {
                        return `<img src="${imgData}" alt="Opsi ${anchor.id}" style="max-width: 100%; height: auto; border-radius: 6px; display: block;" />`;
                    })
                });
            }
        }
        // Non-blocking loop trick
        if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
    }

    // Push soal terakhir
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
