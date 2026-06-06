import React, { useState, useEffect, useMemo } from 'react';
import { storageService } from '../../services/storage';
import { Exam, TeacherProfile } from '../../types';
import { BookOpenIcon, MagnifyingGlassIcon } from '../Icons';

const PrinterIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.728 9.75h10.544c.905 0 1.637.732 1.637 1.637v4.09c0 .905-.732 1.637-1.637 1.637H6.728a1.637 1.637 0 01-1.637-1.637v-4.09c0-.905.732-1.637 1.637-1.637zM6.75 3.75h10.5a.75.75 0 01.75.75v5.25H6v-5.25a.75.75 0 01.75-.75zM16.5 17.25v2.25a.75.75 0 01-.75.75H8.25a.75.75 0 01-.75-.75v-2.25h9z" />
  </svg>
);

const PlusCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const MinusCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const normalizeQuestion = (q: any): any => {
    if (!q) {
        return {
            id: String(Math.random()),
            questionText: '',
            questionType: 'MULTIPLE_CHOICE'
        };
    }
    
    const questionText = q.questionText || q.question_text || '';
    
    const questionTypeRaw = q.questionType || q.question_type || 'MULTIPLE_CHOICE';
    let questionType: any = String(questionTypeRaw).toUpperCase().trim();
    if (questionType === 'MULTIPLE-CHOICE') questionType = 'MULTIPLE_CHOICE';
    if (questionType === 'COMPLEX-MULTIPLE-CHOICE') questionType = 'COMPLEX_MULTIPLE_CHOICE';
    if (questionType === 'TRUE-FALSE') questionType = 'TRUE_FALSE';
    if (questionType === 'FILL-IN-THE-BLANK') questionType = 'FILL_IN_THE_BLANK';

    const correctAnswer = q.correctAnswer || q.correct_answer || '';
    const options = q.options || q.choices || [];
    const optionImages = q.optionImages || q.option_images || [];
    const optionCharts = q.optionCharts || q.option_charts || [];
    const imageUrl = q.imageUrl || q.image_url || '';
    const audioUrl = q.audioUrl || q.audio_url || '';

    const category = q.category || '';
    const level = q.level || '';
    const scoreWeight = typeof q.scoreWeight === 'number' ? q.scoreWeight : (typeof q.score_weight === 'number' ? q.score_weight : 1);
    const kisiKisi = q.kisiKisi || q.kisi_kisi || '';

    let matchingPairs = q.matchingPairs || q.matching_pairs || [];
    matchingPairs = matchingPairs.map((pair: any) => ({
        left: pair.left || '',
        right: pair.right || '',
        leftChart: pair.leftChart || pair.left_chart,
        rightChart: pair.rightChart || pair.right_chart
    }));

    let trueFalseRows = q.trueFalseRows || q.true_false_rows || [];
    trueFalseRows = trueFalseRows.map((row: any) => ({
        text: row.text || '',
        answer: row.answer === true || row.answer === 'true' || row.answer === 'Benar' || row.answer === 'BENAR',
        chartData: row.chartData || row.chart_data
    }));

    return {
        id: String(q.id || Math.random()),
        questionText,
        questionType,
        options,
        correctAnswer,
        imageUrl,
        audioUrl,
        optionImages,
        chartData: q.chartData || q.chart_data,
        optionCharts,
        correctAnswerChart: q.correctAnswerChart || q.correct_answer_chart,
        category,
        level,
        scoreWeight,
        kisiKisi,
        matchingPairs,
        trueFalseRows
    };
};

const isLongQuestion = (q: any): boolean => {
    if (!q) return false;
    let score = 0;
    const text = q.questionText || q.question_text || '';
    if (text.length > 250) score += 3;
    if (q.imageUrl || q.image_url) score += 3;
    if (q.options) {
        score += q.options.length * 0.5;
        if (q.optionImages && q.optionImages.some((img: any) => !!img)) {
            score += q.options.length * 2.0;
        }
    }
    if (q.questionType === 'TRUE_FALSE' || q.questionType === 'TRUE-FALSE') {
        const rows = q.trueFalseRows || q.true_false_rows || [];
        score += rows.length * 2.5;
    }
    if (q.questionType === 'MATCHING') {
        const pairs = q.matchingPairs || q.matching_pairs || [];
        score += pairs.length * 2.5;
    }
    return score > 7;
};

const paginateQuestions = (questions: any[], maxPageHeight: number): any[][] => {
    // Return all questions as a single page collection, 
    // letting the browser engine (via CSS page-break-inside) handle the natural cutoff.
    return [questions.map(normalizeQuestion)];
};

const getFormattedAnswerText = (q: any): string => {
    // Ensure we are working with normalized fields
    const questionType = String(q.questionType || q.question_type || '').toUpperCase().trim();
    const rawOptions = q.options || q.choices || [];
    const rawAns = (q.correctAnswer || q.correct_answer || '').trim();

    if (questionType === 'MULTIPLE_CHOICE') {
        // 1. Check if correctAnswer is index (e.g. "0", "1", "2")
        const idxFromRaw = parseInt(rawAns, 10);
        if (!isNaN(idxFromRaw) && rawOptions && idxFromRaw >= 0 && idxFromRaw < rawOptions.length) {
            return String.fromCharCode(65 + idxFromRaw);
        }
        // 2. Check value matches
        if (rawOptions && rawOptions.length > 0) {
            const idx = rawOptions.findIndex((opt: string) => opt && opt.trim() === rawAns);
            if (idx !== -1) {
                return String.fromCharCode(65 + idx);
            }
        }
        // 3. Check directly A-Z
        const clean = rawAns.toUpperCase();
        if (clean.length === 1 && clean >= 'A' && clean <= 'Z') {
            return clean;
        }
        return rawAns.replace(/<[^>]*>/g, '').trim() || '-';
    }
    
    if (questionType === 'COMPLEX_MULTIPLE_CHOICE' || questionType === 'COMPLEX-MULTIPLE-CHOICE') {
        let answers: string[] = [];
        
        if (rawAns.startsWith('[') && rawAns.endsWith(']')) {
            try {
                const parsed = JSON.parse(rawAns);
                if (Array.isArray(parsed)) {
                    answers = parsed.map(s => String(s).trim());
                } else {
                    answers = [rawAns];
                }
            } catch (e) {
                answers = [rawAns];
            }
        } else {
            // Split by comma
            answers = rawAns ? rawAns.split(/,\s*/) : [];
        }
        
        const letters: string[] = [];
        answers.forEach(ans => {
            const trimmedAns = ans.trim();
            // Check if index
            const idxFromAns = parseInt(trimmedAns, 10);
            if (!isNaN(idxFromAns) && rawOptions && idxFromAns >= 0 && idxFromAns < rawOptions.length) {
                letters.push(String.fromCharCode(65 + idxFromAns));
                return;
            }
            // Check matching choice
            if (rawOptions && rawOptions.length > 0) {
                const idx = rawOptions.findIndex((opt: string) => opt && opt.trim() === trimmedAns);
                if (idx !== -1) {
                    letters.push(String.fromCharCode(65 + idx));
                    return;
                }
            }
            // Check A-Z
            const clean = trimmedAns.toUpperCase();
            if (clean.length === 1 && clean >= 'A' && clean <= 'Z') {
                letters.push(clean);
                return;
            }
            if (trimmedAns) {
                letters.push(trimmedAns.replace(/<[^>]*>/g, '').trim());
            }
        });
        
        if (letters.length > 0) {
            const uniqueSorted = Array.from(new Set(letters)).sort();
            return uniqueSorted.join(', ');
        }
        return rawAns.replace(/<[^>]*>/g, '').trim() || '-';
    }
    
    if (questionType === 'TRUE_FALSE' || questionType === 'TRUE-FALSE') {
        const rows = q.trueFalseRows || q.true_false_rows || [];
        const answers = rows.map((r: any) => {
            const isTrue = r.answer === true || String(r.answer).toLowerCase().trim() === 'true' || String(r.answer).trim() === '1' || String(r.answer).trim() === 'Benar' || String(r.answer).trim() === 'BENAR';
            return isTrue ? 'B' : 'S';
        });
        if (answers.length > 0) {
            return answers.join(', ');
        }
        return '-';
    }
    
    if (questionType === 'MATCHING') {
        const pairs = q.matchingPairs || q.matching_pairs || [];
        const matches = pairs.map((p: any) => {
            const cleanLeft = (p.left || '').replace(/<[^>]*>/g, '').trim();
            const cleanRight = (p.right || '').replace(/<[^>]*>/g, '').trim();
            return `${cleanLeft} ➔ ${cleanRight}`;
        }).join(', ');
        return matches || '-';
    }
    
    return rawAns.replace(/<[^>]*>/g, '').trim() || '-';
};

interface BookGeneratorViewProps {
    profile: TeacherProfile;
}

export const BookGeneratorView: React.FC<BookGeneratorViewProps> = ({ profile }) => {
    const [exams, setExams] = useState<{exam?: Exam, isArchived: boolean, archivePath?: string, subject: string, examType: string, school: string, count: number, code: string}[]>([]);
    const [selectedExams, setSelectedExams] = useState<Exam[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [downloadProgress, setDownloadProgress] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
    const [downloadErrorMsg, setDownloadErrorMsg] = useState('');
    const [bookTitle, setBookTitle] = useState('Buku Kumpulan Soal Resmi');
    const [bookSubtitle, setBookSubtitle] = useState('Disusun oleh Super Admin');
    const [fontSize, setFontSize] = useState<'small' | 'normal' | 'large'>('normal');
    const [lineSpacing, setLineSpacing] = useState<'tight' | 'normal' | 'relaxed'>('normal');
    const [paperMargin, setPaperMargin] = useState<'thin' | 'normal' | 'thick'>('normal');
    const [keepTogether, setKeepTogether] = useState<'always' | 'never' | 'auto'>('auto');

    useEffect(() => {
        const fetchExams = async () => {
            setIsLoading(true);
            try {
                // 1. Fetch active/finished exams from SQL
                const examMap = await storageService.getExams(profile);
                const activeSQL = Object.values(examMap).map(e => ({
                    exam: e,
                    isArchived: false,
                    subject: e.config.subject,
                    examType: e.config.examType || '',
                    school: e.authorSchool || '',
                    count: e.questions.length,
                    code: e.code
                }));

                // 2. Fetch Archived exams from Cloud Storage
                const archList = await storageService.getArchivedList();
                const archives = archList.map(a => {
                    const meta = a.metadata || {};
                    return {
                        isArchived: true,
                        archivePath: a.name,
                        subject: (meta.subject as string) || 'Ujian Diarsipkan',
                        examType: (meta.examType as string) || '',
                        school: (meta.school as string) || '',
                        count: (meta.participantCount as number) || 0, // Not question count, but we show a placeholder
                        code: a.name.split('_')[0] || a.name
                    };
                });

                setExams([...activeSQL, ...archives]);
            } catch (e) {
                console.error(e);
            }
            setIsLoading(false);
        };
        fetchExams();
    }, [profile]);

    const filteredExams = useMemo(() => {
        return exams.filter(e => 
            e.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
            e.examType.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.school.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.code.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [exams, searchTerm]);

    const handleSelect = async (item: typeof exams[0]) => {
        if (selectedExams.find(e => e.code === item.code)) return;

        if (item.isArchived && item.archivePath) {
            setIsDownloading(true);
            try {
                const data = await storageService.downloadArchive(item.archivePath);
                if (data && data.exam) {
                    const loadedExam = { ...(data.exam as any) } as Exam;
                    if (loadedExam.questions) {
                        loadedExam.questions = loadedExam.questions.map(q => normalizeQuestion(q));
                    }
                    setSelectedExams(prev => {
                        if (prev.find(e => e.code === loadedExam.code)) return prev;
                        return [...prev, loadedExam];
                    });
                } else {
                    alert("Gagal membaca data ujian dari arsip.");
                }
            } catch (e) {
                console.error(e);
                alert("Gagal mengunduh arsip ujian.");
            }
            setIsDownloading(false);
        } else if (item.exam) {
            const loadedExam = { ...(item.exam as any) } as Exam;
            if (loadedExam.questions) {
                loadedExam.questions = loadedExam.questions.map(q => normalizeQuestion(q));
            }
            setSelectedExams([...selectedExams, loadedExam]);
        }
    };


    const handleDeselect = (examCode: string) => {
        setSelectedExams(selectedExams.filter(e => e.code !== examCode));
    };

    const handleDownload = () => {
        handleNativePrint();
    };

    const handleNativePrint = () => {
        setIsPrinting(true);
        setDownloadProgress('generating');
        
        try {
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                throw new Error("Pop-up blocker mencegah pembukaan tab baru. Mohon izinkan pop-up untuk situs ini.");
            }

            const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
                .map(el => {
                    if (el.tagName === 'LINK') {
                        const href = (el as HTMLLinkElement).href;
                        return `<link rel="stylesheet" href="${href}">`;
                    }
                    let cssText = el.innerHTML || '';
                    if (cssText.includes('visibility: hidden') || cssText.includes('visibility:hidden')) {
                        // Strip high-level hiding rules that would render the print page blank
                        cssText = cssText.replace(/body\s*\*\s*\{\s*visibility:\s*hidden\s*(!important)?\s*;?\s*\}/g, '/* stripped hiding rule */');
                    }
                    return `<style>${cssText}</style>`;
                })
                .join('\n');

            let chartCounter = 0;
            let chartScripts = '';

            const injectChart = (chartData: any, html: string): string => {
                let processedHtml = html || '';
                if (chartData) {
                    chartCounter++;
                    const canvasId = "pdf-chart-" + chartCounter;
                    const typedData = chartData as any;
                    
                    if (typedData.type === 'venn' || typedData.type === 'relation' || typedData.type === 'cartesian') {
                        const newHtml = "<div class='chart-wrapper font-sans text-xs bg-slate-50 p-4 border rounded' style='text-align: center; margin: 15px 0;'>[Diagram Matematika/Fisika: " + (typedData.title || typedData.type.toUpperCase()) + "]</div>";
                        processedHtml = processedHtml.includes('chart-placeholder') 
                            ? processedHtml.replace(/<span[^>]*class="[^"]*chart-placeholder[^"]*"[^>]*>.*?<\/span>/g, newHtml)
                            : processedHtml + newHtml;
                    } else {
                        const canvasHtml = "<div class='chart-wrapper' style='height: 280px; width: 100%; max-width: 550px; margin: 15px auto;'><canvas id='" + canvasId + "'></canvas></div>";
                        processedHtml = processedHtml.includes('chart-placeholder')
                            ? processedHtml.replace(/<span[^>]*class="[^"]*chart-placeholder[^"]*"[^>]*>.*?<\/span>/g, canvasHtml)
                            : processedHtml + canvasHtml;
                        
                        const labelsStr = JSON.stringify(typedData.labels || []);
                        const datasetsStr = JSON.stringify(typedData.datasets?.map((ds: any, idx: number) => ({
                            label: ds.label,
                            data: ds.data,
                            backgroundColor: ds.backgroundColor || '#0088FE',
                            borderColor: ds.borderColor || '#0088FE',
                            borderWidth: 1
                        })) || []);

                        chartScripts += "try { new Chart(document.getElementById('" + canvasId + "'), { type: '" + typedData.type + "', data: { labels: " + labelsStr + ", datasets: " + datasetsStr + " }, options: { responsive: true, maintainAspectRatio: false, animation: false } }); } catch(e) { console.error(e); }\n";
                    }
                }
                return processedHtml.replace(/<span[^>]*class="[^"]*chart-placeholder[^"]*"[^>]*>.*?<\/span>/g, '');
            };            const maxPageHeight = paperMargin === 'thin' ? 880 : paperMargin === 'thick' ? 820 : 850;

            let questionsHtmlStr = '<div id="questions-source" style="display: none;">';
            selectedExams.forEach((exam, examIndex) => {
                questionsHtmlStr += `
                    <div class="printable-item exam-header" style="page-break-after: avoid; break-after: avoid;">
                        <div class="border-b-4 border-black pb-3 mb-6 flex justify-between items-end font-sans" style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 4px solid black; padding-bottom: 8px; margin-bottom: 16px; margin-top: 16px;">
                            <div>
                                <p style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #64748b; letter-spacing: 0.12em; margin: 0 0 3px 0;">MATA PELAJARAN - MODUL ${examIndex + 1}</p>
                                <h2 style="margin: 0; font-size: 20px; font-weight: 900; text-transform: uppercase;">${exam.config.subject || 'Kisi-Kisi'}</h2>
                            </div>
                            <div style="background-color: black; color: white; padding: 4px 10px; font-size: 11px; font-weight: 800; text-transform: uppercase; display: inline-block; line-height: 1.2; box-sizing: border-box; vertical-align: middle; text-align: center;">Materi Soal</div>
                        </div>
                    </div>
                `;

                exam.questions.forEach((q) => {
                    const originalIndex = exam.questions.findIndex(eq => eq.id === q.id) + 1;

                    let cleanedText = q.questionText || '';
                    cleanedText = injectChart(q.chartData, cleanedText);

                    const qFontSize = fontSize === 'small' ? '10.5pt' : fontSize === 'large' ? '12.5pt' : '11.5pt';
                    const qLineHeight = lineSpacing === 'tight' ? '1.35' : lineSpacing === 'relaxed' ? '1.8' : '1.55';

                    questionsHtmlStr += `
                        <div class="printable-item question-part" style="page-break-inside: avoid; break-inside: avoid; margin-bottom: 8px;">
                            <div class="question-container bg-white text-black">
                                <div style="display: flex; gap: 12px;">
                                    <div style="font-weight: 955; font-size: 16px; min-width: 24px;">${originalIndex}.</div>
                                    <div style="flex: 1; font-size: ${qFontSize}; line-height: ${qLineHeight}; color: #0f172a;">
                                        <div style="text-align: justify; margin-bottom: 4px;">${cleanedText}</div>
                                        
                                        ${q.imageUrl ? `
                                            <div style="margin-top: 10px; margin-bottom: 10px; max-width: 80%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px; display: inline-block;">
                                                <img src="${q.imageUrl}" style="max-height: 180px; object-fit: contain; display: block;" referrerPolicy="no-referrer" />
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;

                        if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
                            const optFontSize = fontSize === 'small' ? '10pt' : fontSize === 'large' ? '12pt' : '11pt';
                            const isComplex = q.questionType === 'COMPLEX_MULTIPLE_CHOICE';
                            const borderRadius = isComplex ? '4px' : '9999px';
                            q.options?.forEach((opt, oIndex) => {
                                let optText = opt || '';
                                if (q.optionCharts && q.optionCharts[oIndex]) {
                                    optText = injectChart(q.optionCharts[oIndex], optText);
                                }
                                const isLastOption = oIndex === (q.options?.length || 0) - 1;
                                const optionStyle = isLastOption ? 'margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px dashed #e2e8f0;' : 'margin-bottom: 8px;';
                                questionsHtmlStr += `
                                    <div class="printable-item option-part" style="page-break-inside: avoid; break-inside: avoid; margin-left: 36px; ${optionStyle} font-size: ${optFontSize};">
                                        <div style="display: flex; gap: 12px; align-items: flex-start;">
                                            <span style="font-weight: 955; border: 1.5px solid #0f172a; border-radius: ${borderRadius}; width: 22px; height: 22px; display: inline-block; text-align: center; line-height: 19px !important; flex-shrink: 0; font-size: 11px; background-color: #f8fafc; color: #0f172a; box-sizing: border-box; padding: 0; margin: 5px 0 0 0; vertical-align: middle;">
                                                ${String.fromCharCode(65 + oIndex)}
                                            </span>
                                            <div style="padding-top: 2px; flex: 1; word-wrap: break-word; overflow-wrap: break-word;">
                                                <span style="display: inline-block; max-width: 100%; white-space: normal; line-height: 1.4;">${optText}</span>
                                                ${q.optionImages && q.optionImages[oIndex] ? `
                                                    <div style="margin-top: 4px; border: 1px solid #e2e8f0; border-radius: 4px; padding: 2px; display: block; max-width: 120px; background-color: white;">
                                                        <img src="${q.optionImages[oIndex]}" style="max-height: 75px; object-fit: contain;" referrerPolicy="no-referrer" />
                                                    </div>
                                                ` : ''}
                                            </div>
                                        </div>
                                    </div>
                                `;
                            });
                        } else if (q.questionType === 'TRUE_FALSE') {
                            questionsHtmlStr += `
                                <div class="printable-item tf-part" style="margin-top: 8px; margin-left: 36px; margin-bottom: 24px; width: calc(100% - 36px); page-break-inside: avoid; break-inside: avoid;">
                                    <table style="width: 100%; table-layout: fixed; word-wrap: break-word; border-collapse: collapse; border: 1.5px solid #0f172a; font-size: 10pt;">
                                        <thead>
                                            <tr style="background-color: #f1f5f9;">
                                                <th style="text-align: left; padding: 6px 10px; font-weight: bold; border-right: 1px solid #0f172a; border-bottom: 1.5px solid #0f172a;">Pernyataan</th>
                                                <th style="width: 80px; text-align: center; font-weight: bold; border-right: 1px solid #0f172a; border-bottom: 1.5px solid #0f172a; white-space: nowrap;">BENAR</th>
                                                <th style="width: 80px; text-align: center; font-weight: bold; border-bottom: 1.5px solid #0f172a; white-space: nowrap;">SALAH</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                            `;
                            q.trueFalseRows?.forEach((row) => {
                                let rText = row.text || '';
                                if (row.chartData) {
                                    rText = injectChart(row.chartData, rText);
                                }
                                questionsHtmlStr += `
                                    <tr style="border-bottom: 1px solid #cbd5e1;">
                                        <td style="padding: 6px 10px; text-align: left; border-right: 1px solid #cbd5e1; font-weight: 500;">${rText}</td>
                                        <td style="padding: 6px; text-align: center; border-right: 1px solid #cbd5e1;">
                                            <div style="width: 16px; height: 16px; border: 1px solid #94a3b8; border-radius: 3px; margin: 0 auto; display: inline-block; text-align: center; line-height: 14px !important; font-size: 8px; font-weight: bold; color: #94a3b8; background-color: #f8fafc; box-sizing: border-box; padding: 0; vertical-align: middle;">B</div>
                                        </td>
                                        <td style="padding: 6px; text-align: center;">
                                            <div style="width: 16px; height: 16px; border: 1px solid #94a3b8; border-radius: 3px; margin: 0 auto; display: inline-block; text-align: center; line-height: 14px !important; font-size: 8px; font-weight: bold; color: #94a3b8; background-color: #f8fafc; box-sizing: border-box; padding: 0; vertical-align: middle;">S</div>
                                        </td>
                                    </tr>
                                `;
                            });
                            questionsHtmlStr += `
                                        </tbody>
                                    </table>
                                </div>
                            `;
                        } else if (q.questionType === 'MATCHING') {
                            questionsHtmlStr += `<div class="printable-item match-part" style="margin-left: 36px; margin-top: 10px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px dashed #e2e8f0; width: calc(100% - 36px); display: flex; flex-direction: column; gap: 8px; page-break-inside: avoid; break-inside: avoid;">`;
                            q.matchingPairs?.forEach((pair) => {
                                let leftItem = pair.left || '';
                                if (pair.leftChart) {
                                    leftItem = injectChart(pair.leftChart, leftItem);
                                }
                                questionsHtmlStr += `
                                    <div style="display: flex; align-items: center; gap: 12px; page-break-inside: avoid; break-inside: avoid;">
                                        <div style="flex: 1; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; background-color: #f8fafc; font-size: 10.5pt;">${leftItem}</div>
                                        <div style="font-weight: bold; color: #475569;">......</div>
                                        <div style="flex: 1; border-bottom: 1px solid #475569; height: 18px;"></div>
                                    </div>
                                `;
                            });
                            questionsHtmlStr += `</div>`;
                        } else if (q.questionType === 'ESSAY' || q.questionType === 'FILL_IN_THE_BLANK') {
                            questionsHtmlStr += `
                                <div class="printable-item essay-part" style="margin-left: 36px; margin-top: 10px; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px; background-color: #f8fafc; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px dashed #e2e8f0; width: calc(100% - 36px); page-break-inside: avoid; break-inside: avoid;">
                                    <p style="font-size: 8.5pt; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 6px 0;">Jawaban Uraian:</p>
                                    <div style="border-bottom: 1px dashed #cbd5e1; height: 18px; margin-bottom: 6px;"></div>
                                    <div style="border-bottom: 1px dashed #cbd5e1; height: 18px; margin-bottom: 6px;"></div>
                                    <div style="border-bottom: 1px dashed #cbd5e1; height: 18px;"></div>
                                </div>
                            `;
                        }

                    });
                });
            questionsHtmlStr += `</div><div id="paginated-questions"></div>`;

            const examChunks: Exam[][] = [];
            const examsPerPage = 2;
            for (let i = 0; i < selectedExams.length; i += examsPerPage) {
                examChunks.push(selectedExams.slice(i, i + examsPerPage));
            }

            let answerKeyHtmlStr = '';
            examChunks.forEach((chunk, chunkIdx) => {
                let chunkKeysHtml = '';
                chunk.forEach((exam) => {
                    const examIndex = selectedExams.findIndex(e => e.code === exam.code);
                    chunkKeysHtml += `
                        <div style="margin-bottom: 20px; break-inside: avoid; page-break-inside: avoid;">
                            <div style="display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 12px;">
                                <div style="width: 24px; height: 24px; border-radius: 50%; background-color: #000; color: #fff; display: block; text-align: center; line-height: 24px; box-sizing: border-box; font-weight: 900; font-size: 12px;">${examIndex + 1}</div>
                                <h2 style="font-size: 14px; font-weight: 900; text-transform: uppercase; margin: 0;">${exam.config.subject || 'Kisi-Kisi'}</h2>
                            </div>
                            
                            <div class="keys-grid" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; background-color: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; box-sizing: border-box; width: 100%;">
                    `;

                    exam.questions.forEach((q, qIndex) => {
                        const ansText = getFormattedAnswerText(q);
                        chunkKeysHtml += `
                            <div style="font-size: 11px; display: flex; align-items: flex-start; gap: 6px; box-sizing: border-box;">
                                <span style="font-weight: 800; color: #64748b; min-width: 18px; text-align: right;">${qIndex + 1}.</span>
                                <span style="font-weight: 950; color: #0f172a; text-transform: uppercase; background-color: white; border: 1px solid #e2e8f0; border-radius: 4px; padding: 2px 4px; flex: 1; text-align: center; display: inline-block; word-break: break-all; min-height: 18px;">${ansText}</span>
                            </div>
                        `;
                    });

                    chunkKeysHtml += `
                            </div>
                        </div>
                    `;
                });

                answerKeyHtmlStr += `
                    <div class="page-container">
                        <div style="flex: 1; display: flex; flex-direction: column; justify-content: flex-start; width: 100%; box-sizing: border-box;">
                            <div style="text-align: center; padding-bottom: 8px; margin-bottom: 16px; border-bottom: 4px solid black;">
                                <p style="font-weight: 900; letter-spacing: 0.2em; font-size: 10px; color: #dc2626; text-transform: uppercase; margin: 0 0 4px 0;">DOKUMEN SANGAT RAHASIA</p>
                                <h1 style="font-family: serif; font-size: 20px; font-weight: 900; text-transform: uppercase; margin: 0;">KUNCI JAWABAN RESMI</h1>
                                <p style="font-size: 10px; text-transform: uppercase; font-weight: bold; margin: 4px 0 0 0; color: #64748b;">Halaman ${chunkIdx + 1} dari ${examChunks.length}</p>
                            </div>
                            ${chunkKeysHtml}
                        </div>
                        <div style="border-top: 1px solid #cbd5e1; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #64748b; font-family: sans-serif; margin-top: auto; width: 100%;">
                            <div style="font-weight: bold; text-transform: uppercase;">KUNCI JAWABAN RESMI</div>
                            <div style="font-weight: 900; letter-spacing: 0.1em;">DOKUMEN NEGARA - RAHASIA</div>
                        </div>
                    </div>
                `;
            });

            const computedPadding = paperMargin === 'thin' ? '15mm' : paperMargin === 'thick' ? '25mm' : '20mm';

            const fullHtmlContent = `
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8">
                <title>${bookTitle} - Platform Ujian Cerdas</title>
                <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
                ${styleTags}
                <style>
                    @page {
                        size: A4 portrait !important;
                        margin: 0 !important;
                    }
                    @media print {
                        body {
                            background: white !important;
                            margin: 0 !important;
                            padding: 0 !important;
                        }
                        body, .book-canvas, .book-canvas * {
                            visibility: visible !important;
                        }
                        .no-print {
                            display: none !important;
                        }
                        .page-break {
                            display: none !important;
                        }
                        .avoid-break {
                            page-break-inside: ${keepTogether === 'never' ? 'auto' : 'avoid'} !important;
                            break-inside: ${keepTogether === 'never' ? 'auto' : 'avoid'} !important;
                        }
                        .book-canvas {
                            width: 210mm !important;
                            max-width: 210mm !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            box-shadow: none !important;
                            background: white !important;
                        }
                        .page-container {
                            width: 210mm !important;
                            height: auto !important;
                            min-height: 296.5mm !important;
                            padding: calc(${computedPadding} - 20px) ${computedPadding} calc(${computedPadding} + 20px) ${computedPadding} !important;
                            margin: 0 !important;
                            border: none !important;
                            box-sizing: border-box !important;
                            display: flex !important;
                            flex-direction: column !important;
                            justify-content: space-between !important;
                            page-break-after: always !important;
                            break-after: page !important;
                        }
                        .page-container-flow {
                            width: 210mm !important;
                            min-height: 296.5mm !important;
                            padding: calc(${computedPadding} - 20px) ${computedPadding} calc(${computedPadding} + 20px) ${computedPadding} !important;
                            margin: 0 !important;
                            box-shadow: none !important;
                            border: none !important;
                            box-sizing: border-box !important;
                            page-break-after: always !important;
                            break-after: page !important;
                        }
                        .page-cover {
                            border: none !important;
                            padding: calc(${computedPadding} - 20px) ${computedPadding} calc(${computedPadding} + 20px) ${computedPadding} !important;
                            height: 296.5mm !important;
                        }
                        .keys-grid {
                            grid-template-columns: repeat(5, 1fr) !important;
                        }
                    }
                    body {
                        font-family: 'Inter', sans-serif;
                        background-color: #f1f5f9;
                        color: #0f172a;
                        margin: 0;
                        padding: 30px 0;
                    }
                    .book-canvas {
                        background-color: white;
                        width: 210mm;
                        margin: 0 auto;
                        box-sizing: border-box;
                        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                        display: flex;
                        flex-direction: column;
                    }
                    .page-container {
                        position: relative;
                        width: 210mm;
                        height: auto;
                        min-height: 296.5mm;
                        padding: calc(${computedPadding} - 20px) ${computedPadding} calc(${computedPadding} + 20px) ${computedPadding};
                        box-sizing: border-box;
                        background: white;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        page-break-after: always;
                        break-after: page;
                    }
                    .page-container-flow {
                        position: relative;
                        width: 210mm;
                        min-height: 296.5mm;
                        padding: calc(${computedPadding} - 20px) ${computedPadding} calc(${computedPadding} + 20px) ${computedPadding};
                        box-sizing: border-box;
                        background: white;
                        page-break-after: always;
                        break-after: page;
                    }
                    .page-break {
                        display: none !important;
                    }
                    .avoid-break {
                        page-break-inside: ${keepTogether === 'never' ? 'auto' : 'avoid'};
                        break-inside: ${keepTogether === 'never' ? 'auto' : 'avoid'};
                    }
                    .chart-wrapper {
                        width: 100%;
                        max-width: 550px;
                        margin: 15px auto;
                        page-break-inside: avoid;
                        text-align: center;
                    }
                    img {
                        max-width: 100%;
                        height: auto;
                        object-fit: contain;
                        border-radius: 4px;
                    }
                    table {
                        border-collapse: collapse;
                        width: 100%;
                        margin: 10px 0;
                    }
                    table, th, td {
                        border: 1px solid #cbd5e1;
                        padding: 8px;
                    }
                    /* KaTeX Math line-height and alignment fixes to prevent fractions overlapping or breaking */
                    .katex, .katex * {
                        line-height: normal !important;
                        text-indent: 0 !important;
                    }
                </style>
            </head>
            <body>
                <div class="no-print" style="position: fixed; top: 12px; left: 50%; transform: translateX(-50%); z-index: 9999; display: flex; gap: 12px; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(8px); padding: 8px 16px; border-radius: 9999px; box-shadow: 0 10px 20px rgba(0,0,0,0.25);">
                    <button onclick="window.print()" style="background-color: #10b981; color: white; border: none; padding: 8px 18px; border-radius: 9999px; font-weight: bold; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px;"><span style="font-size: 15px;">🖨️</span> Cetak / Simpan PDF</button>
                    <button onclick="window.close()" style="background-color: transparent; color: #cbd5e1; border: 1px solid #475569; padding: 8px 18px; border-radius: 9999px; font-weight: bold; font-size: 13px; cursor: pointer;">Tutup Halaman</button>
                </div>

                <div class="book-canvas">
                    <!-- Cover Page -->
                    <div class="page-container page-cover" style="page-break-after: always; break-after: page;">
                        <div style="border: 12px double #000000; padding: 12mm; flex: 1; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; width: 100%;">
                            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid black; padding-bottom: 12px;">
                                <div style="border: 2px solid black; padding: 5px 12px; font-size: 10px; font-weight: 900; letter-spacing: 0.15em; text-transform: uppercase; display: inline-block; line-height: 1.2 !important; box-sizing: border-box; vertical-align: middle; background-color: white; text-align: center;">DOKUMEN NEGARA</div>
                                <div style="text-align: center;">
                                    <p style="font-family: serif; font-weight: bold; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 2px 0;">Republik Indonesia</p>
                                    <p style="font-size: 11px; font-weight: 900; text-transform: uppercase; margin: 0; color: #1e293b; letter-spacing: 0.05em;">Platform Ujian Cerdas</p>
                                </div>
                                <div style="border: 2px solid black; padding: 5px 12px; font-size: 10px; font-weight: 900; letter-spacing: 0.15em; text-transform: uppercase; font-style: italic; display: inline-block; line-height: 1.2 !important; box-sizing: border-box; vertical-align: middle; background-color: white; text-align: center;">SANGAT RAHASIA</div>
                            </div>

                            <div style="display: block; text-align: center; margin: auto 0; padding: 24px 0;">
                                <div style="display: block; text-align: center; margin-bottom: 24px; width: 100%;">
                                    <div style="width: 98px; height: 98px; padding: 10px; border: 4px solid black; border-radius: 50%; display: inline-block; box-sizing: border-box; background-color: white; margin: 0 auto; text-align: center; vertical-align: middle;">
                                        <div style="box-sizing: border-box; width: 70px; height: 70px; border: 2px dashed black; border-radius: 50%; display: block; padding-top: 18px; text-align: center; margin: 0 auto;">
                                            <span style="font-family: serif; font-size: 24px; font-weight: 900; letter-spacing: -0.05em; line-height: 1; display: block; margin: 0; padding: 0; margin-top: -2px;">BSR</span>
                                            <span style="font-size: 7px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; line-height: 1; display: block; margin: 2px 0 0 0; padding: 0;">SOAL RESMI</span>
                                        </div>
                                    </div>
                                </div>

                                <h1 style="font-family: serif; font-size: 32px; font-weight: 900; text-transform: uppercase; tracking-wider: 0.05em; line-height: 1.25; max-width: 600px; margin: 0 0 12px 0; color: black;">
                                    ${bookTitle}
                                </h1>
                                <p style="font-size: 14px; font-weight: bold; color: #475569; letter-spacing: 0.12em; text-transform: uppercase; margin: 0 0 28px 0;">
                                    ${bookSubtitle}
                                </p>

                                <div style="width: 100%; max-width: 480px; border: 4px double black; padding: 16px; background-color: white; text-align: left;">
                                    <p style="text-align: center; font-weight: 950; text-transform: uppercase; letter-spacing: 0.12em; font-size: 11px; border-bottom: 2px solid black; padding-bottom: 6px; margin: 0 0 12px 0;">IDENTITAS KUMPULAN SOAL</p>
                                    <table style="width: 100%; font-size: 12px; border: none; border-collapse: collapse;">
                                        <tr style="border: none;">
                                            <td style="border: none; padding: 4px 0; width: 130px; text-transform: uppercase; color: #64748b; font-weight: bold;">Jenis Dokumen</td>
                                            <td style="border: none; padding: 4px; width: 10px;">:</td>
                                            <td style="border: none; padding: 4px 0; font-weight: bold; text-transform: uppercase;">Buku Kumpulan Soal Resmi (BSR)</td>
                                        </tr>
                                        <tr style="border: none; border-top: 1px solid #e2e8f0;">
                                            <td style="border: none; padding: 4px 0; text-transform: uppercase; color: #64748b; font-weight: bold;">Total Modul</td>
                                            <td style="border: none; padding: 4px;">:</td>
                                            <td style="border: none; padding: 4px 0; font-weight: bold;">${selectedExams.length} Modul Kisi-Kisi</td>
                                        </tr>
                                        <tr style="border: none; border-top: 1px solid #e2e8f0;">
                                            <td style="border: none; padding: 4px 0; text-transform: uppercase; color: #64748b; font-weight: bold;">Total Soal</td>
                                            <td style="border: none; padding: 4px;">:</td>
                                            <td style="border: none; padding: 4px 0; font-weight: bold;">${selectedExams.reduce((acc, exam) => acc + exam.questions.length, 0)} Butir Soal</td>
                                        </tr>
                                        <tr style="border: none; border-top: 1px solid #e2e8f0;">
                                            <td style="border: none; padding: 4px 0; text-transform: uppercase; color: #64748b; font-weight: bold;">Tahun Terbit</td>
                                            <td style="border: none; padding: 4px;">:</td>
                                            <td style="border: none; padding: 4px 0; font-weight: bold;">${new Date().getFullYear()} / ${new Date().getFullYear() + 1}</td>
                                        </tr>
                                        <tr style="border: none; border-top: 1px solid #e2e8f0;">
                                            <td style="border: none; padding: 6px 0; text-transform: uppercase; color: #64748b; font-weight: bold;">Hak Akses</td>
                                            <td style="border: none; padding: 6px;">:</td>
                                            <td style="border: none; padding: 6px 0;"><span style="font-weight: 955; font-size: 10px; padding: 4px 10px; border: 1.5px solid black; background-color: #f8fafc; display: inline-block; line-height: 1.2 !important; box-sizing: border-box; vertical-align: middle; text-align: center;">GURU / PENGAWAS</span></td>
                                        </tr>
                                    </table>
                                </div>
                            </div>

                            <div style="border-top: 1px solid #cbd5e1; padding-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 9px;">
                                <p style="font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; margin: 0; color: #475569;">PLATFORM UJIAN CERDAS INDONESIA</p>
                                <p style="font-weight: 600; margin: 0; color: #64748b;">Dicetak: ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Petunjuk Umum Page -->
                    <div class="page-container" style="page-break-after: always; break-after: page;">
                        <div style="border: 12px double #000000; padding: 12mm; flex: 1; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; width: 100%;">
                            <div>
                                <div style="border-bottom: 4px solid black; padding-bottom: 12px; margin-bottom: 20px; text-align: center;">
                                    <h2 style="font-family: serif; font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">PETUNJUK UMUM</h2>
                                    <p style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; margin: 4px 0 0 0;">ASESMEN KOMPETENSI MINIMUM & EVALUASI BELAJAR GURU</p>
                                </div>

                                <div style="font-size: 13px; line-height: 1.6; text-align: justify; color: #334155;">
                                    <p style="font-weight: bold; color: #0f172a; margin-bottom: 14px;">Sebelum menguji atau membagikan soal-soal di dalam buku ini, mohon diperhatikan beberapa pedoman penting berikut:</p>
                                    <ol style="padding-left: 20px; display: flex; flex-direction: column; gap: 12px; margin: 0;">
                                        <li><strong>Pembacaan Doa:</strong> Awali pelaksanaan kegiatan mengkaji ataupun pengujian ujian evaluasi dengan berdoa setulus hati demi kesuksesan bersama.</li>
                                        <li><strong>Verifikasi Modul:</strong> Periksa keselarasan semua modul materi (${selectedExams.length} Modul) dalam kumpulan soal ini sebelum didistribusikan secara cetak fisik atau digital.</li>
                                        <li><strong>Pilihan Ganda Resmi:</strong> Pilihan ganda tunggal dan kompleks tersaji dengan visual huruf lingkaran tebal (A, B, C, D, E) untuk menjamin kerapihan tata letak halaman saat diprint.</li>
                                        <li><strong>Soal Isian & Benar-Salah:</strong> Untuk soal berpola Benar/Salah (True-False), siswa dapat memberi tanda checklist atau lingkaran langsung pada kolom pilihan tabel yang tertera.</li>
                                        <li><strong>Lembar Jawaban Esai:</strong> Buku printout ini melampirkan lembar garis putus-putus elegan di bawah soal esai agar memudahkan siswa menjabarkan rincian rumus atau argumen tulisan tangan secara rapi.</li>
                                        <li><strong>Kunci Jawaban:</strong> Lembar Kunci Jawaban Resmi telah nilampirkan pada bagian halaman penutup buku. Pisahkan lembar penutup ini saat mendistribusikan soal kepada peserta didik Anda.</li>
                                    </ol>
                                </div>
                            </div>
                            <div style="border-top: 2px solid #000000; padding-top: 10px; text-align: center; font-size: 11px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase;">SELAMAT BEKERJA • PRESTASI PENTING JUJUR UTAMA</div>
                        </div>
                    </div>

                    <!-- Materi Soal Ujian -->
                    ${questionsHtmlStr}

                    <!-- Kunci Jawaban Page -->
                    ${answerKeyHtmlStr}
                </div>

                <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
                <script>
                    ${chartScripts}
                </script>
                <script>
                    window.onload = () => {
                        // Render math with katex
                        if (window.katex) {
                            document.querySelectorAll('.math-visual[data-latex]').forEach(el => {
                                try {
                                    const latex = el.getAttribute('data-latex');
                                    if (latex) {
                                        const isBlock = el.style.display === 'block';
                                        el.innerHTML = window.katex.renderToString(latex, {
                                            throwOnError: false,
                                            displayMode: isBlock
                                        });
                                    }
                                } catch (e) {
                                    console.error('KaTeX error:', e);
                                }
                            });
                        }
                        
                        // Start dynamic pagination
                        const sourceDiv = document.getElementById('questions-source');
                        const targetDiv = document.getElementById('paginated-questions');
                        
                        if (sourceDiv && targetDiv) {
                            // Display source briefly so we can measure it
                            sourceDiv.style.display = 'block';
                            sourceDiv.style.visibility = 'hidden';
                            sourceDiv.style.position = 'absolute';
                            
                            const items = Array.from(sourceDiv.children);
                            let pageIdx = 1;
                            
                            function createNewPage() {
                                const page = document.createElement('div');
                                page.className = 'page-container pdf-render-page';
                                page.style = 'width: 210mm; min-height: 296.5mm; height: 296.5mm; padding: calc(${computedPadding} - 20px) ${computedPadding} calc(${computedPadding} + 20px) ${computedPadding}; box-sizing: border-box; background: white; display: flex; flex-direction: column; position: relative; margin: 0 auto; overflow: hidden;';
                                
                                const content = document.createElement('div');
                                content.className = 'page-content';
                                content.style = 'flex: 1; display: flex; flex-direction: column; overflow: hidden; gap: 8px;';
                                page.appendChild(content);

                                const footer = document.createElement('div');
                                footer.className = 'page-footer';
                                footer.style = 'border-top: 1px solid #cbd5e1; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #64748b; font-family: sans-serif; position: absolute; bottom: ${computedPadding}; left: ${computedPadding}; right: ${computedPadding};';
                                footer.innerHTML = '<div style="font-weight: bold; text-transform: uppercase;">HALAMAN ' + pageIdx + '</div><div style="font-weight: 900; letter-spacing: 0.1em;">KUMPULAN SOAL RESMI</div>';
                                page.appendChild(footer);
                                
                                return page;
                            }
                            
                            let currentPage = createNewPage();
                            let pageContent = currentPage.querySelector('.page-content');
                            targetDiv.appendChild(currentPage);

                            for (let i = 0; i < items.length; i++) {
                                const item = items[i];
                                pageContent.appendChild(item);
                                
                                if (pageContent.scrollHeight > pageContent.clientHeight) {
                                    if (pageContent.children.length === 1) {
                                        continue; 
                                    }
                                    pageContent.removeChild(item);
                                    pageIdx++;
                                    currentPage = createNewPage();
                                    pageContent = currentPage.querySelector('.page-content');
                                    targetDiv.appendChild(currentPage);
                                    pageContent.appendChild(item);
                                }
                            }
                            sourceDiv.parentNode?.removeChild(sourceDiv);
                        }

                        const overlay = document.createElement('div');
                        overlay.style = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#f8fafc;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;text-align:center;';
                        overlay.innerHTML = '<div style="width:48px;height:48px;border:4px solid #e2e8f0;border-top:4px solid #4f46e5;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:24px;"></div><h2 style="color:#0f172a;margin:0 0 8px 0;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Memproses PDF Resmi</h2><p style="color:#64748b;margin:0;font-size:15px;max-width:300px;">Mohon tunggu, dokumen sedang disusun dan dirender dengan presisi tinggi...</p><style>@keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}</style>';
                        document.body.appendChild(overlay);

                        setTimeout(async () => {
                            try {
                                const { jsPDF } = window.jspdf;
                                const pdf = new jsPDF('p', 'mm', 'a4');
                                // Target all naturally pre-existing and dynamically generated pages!
                                const pages = document.querySelectorAll('.page-container'); 
                                
                                for (let i = 0; i < pages.length; i++) {
                                    const page = pages[i];
                                    
                                    overlay.innerHTML = '<div style="width:48px;height:48px;border:4px solid #e2e8f0;border-top:4px solid #4f46e5;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:24px;"></div><h2 style="color:#0f172a;margin:0 0 8px 0;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Memproses PDF Resmi</h2><p style="color:#64748b;margin:0;font-size:15px;max-width:300px;">Merender halaman ' + (i + 1) + ' dari ' + pages.length + '...</p><style>@keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}</style>';
                                    await new Promise(r => setTimeout(r, 50));
                                    
                                    const canvas = await html2canvas(page, {
                                        scale: 2,
                                        useCORS: true,
                                        logging: false
                                    });
                                    
                                    const imgData = canvas.toDataURL('image/jpeg', 0.98);
                                    
                                    if (i > 0) {
                                        pdf.addPage();
                                    }
                                    
                                    const imgProps = pdf.getImageProperties(imgData);
                                    const pdfWidth = pdf.internal.pageSize.getWidth();
                                    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                                    
                                    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
                                }
                                
                                window.__pdf = pdf;
                                
                                overlay.innerHTML = '<div style="width:56px;height:56px;border-radius:50%;background:#10b981;color:white;display:flex;align-items:center;justify-content:center;margin-bottom:24px;"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div><h2 style="color:#0f172a;margin:0 0 8px 0;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Render Selesai!</h2><p style="color:#64748b;margin:0 0 24px 0;font-size:15px;max-width:350px;">Dokumen PDF Anda telah berhasil dibuat. Silakan klik tombol di bawah untuk mengunduhnya.</p><button id="auto-download-btn" onclick="window.__pdf.save(&quot;Buku_Soal_Resmi.pdf&quot;)" style="display:inline-block;padding:14px 28px;background-color:#4f46e5;color:white;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;border:none;cursor:pointer;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">⬇ Unduh Buku PDF Sekarang</button><p style="color:#94a3b8;font-size:13px;margin-top:24px;">Anda dapat menutup halaman ini setelah dokumen terunduh.</p>';
                                
                                setTimeout(() => {
                                    const btn = document.getElementById('auto-download-btn');
                                    if(btn) btn.click();
                                }, 500);
                            } catch (err) {
                                overlay.innerHTML = '<div style="color:#ef4444;margin-bottom:16px;"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg></div><h2 style="color:#0f172a;margin:0 0 8px 0;font-size:24px;font-weight:700;">Gagal Merender PDF</h2><p style="color:#64748b;margin:0;font-size:15px;">Terjadi kesalahan: ' + err + '</p><button onclick="window.close()" style="margin-top:24px;padding:8px 16px;background:#0f172a;color:white;border:none;border-radius:6px;cursor:pointer;">Tutup Halaman</button>';
                            }
                        }, 1000);
                    };
                </script>
            </body>
            </html>
            `;

            printWindow.document.open();
            printWindow.document.write(fullHtmlContent);
            printWindow.document.close();

            setDownloadProgress('success');
        } catch (e) {
            console.error("Gagal mencetak secara native:", e);
            setDownloadProgress('error');
            setDownloadErrorMsg(e instanceof Error ? e.message : String(e));
        } finally {
            setIsPrinting(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500">Memuat data soal...</div>;

    return (
        <div className="p-4 sm:p-8">
            <div className="print:hidden">
                <div className="flex items-center gap-3 mb-6">
                    <BookOpenIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Generator Buku Soal</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Panel: Select Exams */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-800">
                        <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">Pilih Sumber Soal</h3>
                        
                        <div className="relative mb-4">
                            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Cari pelajaran, sekolah, atau tipe..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        <div className="overflow-y-auto h-[400px] space-y-2 pr-2 custom-scrollbar relative">
                            {isDownloading && (
                                <div className="absolute inset-0 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
                                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                </div>
                            )}
                            {filteredExams.map(exam => (
                                <div key={exam.code} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-xl transition-all hover:border-indigo-300 dark:hover:border-indigo-500/50">
                                    <div className="min-w-0 pr-3">
                                        <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                            {exam.subject} {exam.examType ? `- ${exam.examType}` : ''}
                                            {exam.isArchived && <span className="ml-2 px-1.5 py-0.5 text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 rounded-md font-bold uppercase tracking-wider">Arsip</span>}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{exam.school || 'Sekolah Tidak Diketahui'} • {exam.isArchived ? '(Unduh untuk melihat jumlah soal)' : `${exam.count} Soal`}</p>
                                        <p className="text-[10px] font-mono text-slate-400 mt-1">{exam.code}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleSelect(exam)}
                                        disabled={!!selectedExams.find(e => e.code === exam.code) || isDownloading}
                                        className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-800/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                                    >
                                        <PlusCircleIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                            {filteredExams.length === 0 && (
                                <div className="text-center p-8 text-slate-500 text-sm">Tidak ada ujian ditemukan.</div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Selected Exams & Book Config */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-5 border border-slate-200 dark:border-slate-800 flex flex-col min-h-[660px]">
                         <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">Pengaturan Buku</h3>
                         
                         <div className="space-y-4 mb-4 shrink-0">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Judul Buku</label>
                                    <input 
                                        type="text"
                                        value={bookTitle}
                                        onChange={(e) => setBookTitle(e.target.value)}
                                        className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Sub Judul / Keterangan</label>
                                    <input 
                                        type="text"
                                        value={bookSubtitle}
                                        onChange={(e) => setBookSubtitle(e.target.value)}
                                        className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>

                            {/* Panel Tata Letak Cetak */}
                            <div className="bg-indigo-50/20 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-xl p-3.5 space-y-3 shrink-0">
                                <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <span>⚙️</span> Pengaturan Tata Letak & Toleransi Cetak
                                </p>
                                
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    {/* Font Size Selector */}
                                    <div>
                                        <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Ukuran Huruf</label>
                                        <select
                                            value={fontSize}
                                            onChange={(e) => setFontSize(e.target.value as any)}
                                            className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
                                        >
                                            <option value="small">Kecil (10.5pt)</option>
                                            <option value="normal">Sedang (11.5pt)</option>
                                            <option value="large">Besar (12.5pt)</option>
                                        </select>
                                    </div>

                                    {/* Line Spacing Selector */}
                                    <div>
                                        <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Jarak Baris</label>
                                        <select
                                            value={lineSpacing}
                                            onChange={(e) => setLineSpacing(e.target.value as any)}
                                            className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
                                        >
                                            <option value="tight">Rapat (1.35)</option>
                                            <option value="normal">Sedang (1.55)</option>
                                            <option value="relaxed">Longgar (1.80)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    {/* Paper Margin Selector */}
                                    <div>
                                        <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Margin Halaman</label>
                                        <select
                                            value={paperMargin}
                                            onChange={(e) => setPaperMargin(e.target.value as any)}
                                            className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
                                        >
                                            <option value="thin">Tipis (15mm)</option>
                                            <option value="normal">Sedang (20mm)</option>
                                            <option value="thick">Tebal (25mm)</option>
                                        </select>
                                    </div>

                                    {/* Keep Together Selector */}
                                    <div>
                                        <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Pemisahan Halaman</label>
                                        <select
                                            value={keepTogether}
                                            onChange={(e) => setKeepTogether(e.target.value as any)}
                                            className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
                                        >
                                            <option value="auto">Auto Repair (Saran)</option>
                                            <option value="always">Selalu Utuh</option>
                                            <option value="never">Bebas Terpotong</option>
                                        </select>
                                    </div>
                                </div>
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal">
                                    *Pemisahan <strong>Auto Repair</strong> mencegah soal pendek terputus, namun mengizinkan soal panjang / tabel terpecah agar bagian bawah kertas tidak kosong atau meluap.
                                </p>
                            </div>
                         </div>

                         <div className="flex items-center justify-between mb-2">
                             <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">Soal Terpilih ({selectedExams.length})</h4>
                         </div>
                         
                         <div className="flex-1 overflow-y-auto space-y-2 pr-2 mb-4 custom-scrollbar min-h-[140px]">
                            {selectedExams.map(exam => (
                                <div key={exam.code} className="flex items-center justify-between p-2 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-lg group">
                                    <div className="min-w-0 pr-2">
                                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{exam.config.subject}</p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{exam.questions.length} Soal • {exam.code}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleDeselect(exam.code)}
                                        className="p-1.5 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-md transition-colors opacity-80 group-hover:opacity-100 shrink-0"
                                        title="Hapus dari buku"
                                    >
                                        <MinusCircleIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                            {selectedExams.length === 0 && (
                                <div className="text-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 text-sm font-medium">
                                    Belum ada soal terpilih.<br/>
                                    <span className="text-xs font-normal">Pilih ujian dari panel sebelah kiri.</span>
                                </div>
                            )}
                         </div>

                         <button 
                            onClick={handleDownload}
                            disabled={selectedExams.length === 0 || isPrinting}
                            className="w-full shrink-0 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
                         >
                            {isPrinting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <PrinterIcon className="w-5 h-5" />
                            )}
                            <span>{isPrinting ? 'Menyiapkan Unduhan...' : 'Unduh PDF Buku'}</span>
                         </button>
                    </div>
                </div>
                   {/* Live Book Page Preview Section */}
            {selectedExams.length < 0 && (
                <div className="mt-12 bg-slate-100 dark:bg-slate-950/40 rounded-2xl p-4 sm:p-8 border border-slate-200 dark:border-slate-800 print:bg-transparent print:p-0 print:m-0 print:border-none">
                    <div className="max-w-5xl mx-auto mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800/60 print:hidden">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span>📖</span> Pratinjau Buku Cetak (Live Preview)
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Halaman di bawah memuat margin & tata letak yang 100% sama dengan hasil cetak PDF.
                            </p>
                        </div>
                        <button 
                            onClick={handleDownload}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow transition-all hover:shadow-md active:scale-[0.98]"
                        >
                            <PrinterIcon className="w-4 h-4" />
                            Cetak / Unduh PDF
                        </button>
                    </div>

                    <div className="overflow-x-auto py-4 flex flex-col items-center">
                        <div 
                            id="pdf-book-container" 
                            className="print:block font-serif w-full max-w-none text-black bg-slate-100 print:bg-white !m-0 !p-0 flex flex-col items-center gap-8 print:gap-0 select-none print:select-text"
                        >
                                      <style>{`
                                .page-container {
                                    width: 210mm !important;
                                    height: auto !important;
                                    min-height: 296.5mm !important;
                                    padding: calc(${paperMargin === 'thin' ? '15mm' : paperMargin === 'thick' ? '25mm' : '20mm'} - 20px) ${paperMargin === 'thin' ? '15mm' : paperMargin === 'thick' ? '25mm' : '20mm'} calc(${paperMargin === 'thin' ? '15mm' : paperMargin === 'thick' ? '25mm' : '20mm'} + 20px) ${paperMargin === 'thin' ? '15mm' : paperMargin === 'thick' ? '25mm' : '20mm'} !important;
                                    box-sizing: border-box !important;
                                    background-color: white !important;
                                    box-shadow: 0 10px 25px rgba(0,0,0,0.1) !important;
                                    border: 1px solid #cbd5e1 !important;
                                    display: flex !important;
                                    flex-direction: column !important;
                                    justify-content: space-between !important;
                                    page-break-after: always !important;
                                    break-after: page !important;
                                    position: relative !important;
                                }
                                
                                .page-container-flow {
                                    width: 210mm !important;
                                    min-height: 296.5mm !important;
                                    padding: calc(${paperMargin === 'thin' ? '15mm' : paperMargin === 'thick' ? '25mm' : '20mm'} - 20px) ${paperMargin === 'thin' ? '15mm' : paperMargin === 'thick' ? '25mm' : '20mm'} calc(${paperMargin === 'thin' ? '15mm' : paperMargin === 'thick' ? '25mm' : '20mm'} + 20px) ${paperMargin === 'thin' ? '15mm' : paperMargin === 'thick' ? '25mm' : '20mm'} !important;
                                    box-sizing: border-box !important;
                                    background-color: white !important;
                                    box-shadow: 0 10px 25px rgba(0,0,0,0.1) !important;
                                    border: 1px solid #cbd5e1 !important;
                                    position: relative !important;
                                    page-break-after: always !important;
                                    break-after: page !important;
                                }
                                
                                .page-break { display: none !important; }
                                .avoid-break { 
                                    page-break-inside: ${keepTogether === 'never' ? 'auto' : 'avoid'} !important; 
                                    break-inside: ${keepTogether === 'never' ? 'auto' : 'avoid'} !important; 
                                }
                                
                                @media print {
                                    body {
                                        background-color: white !important;
                                        margin: 0 !important;
                                        padding: 0 !important;
                                    }
                                    body * {
                                        visibility: hidden !important;
                                    }
                                    #pdf-book-container, #pdf-book-container * {
                                        visibility: visible !important;
                                    }
                                    #pdf-book-container {
                                        position: absolute !important;
                                        left: 0 !important;
                                        top: 0 !important;
                                        width: 210mm !important;
                                        margin: 0 !important;
                                        padding: 0 !important;
                                        background: white !important;
                                    }
                                    
                                    .page-container {
                                        width: 210mm !important;
                                        height: auto !important;
                                        min-height: 296.5mm !important;
                                        padding: calc(${paperMargin === 'thin' ? '15mm' : paperMargin === 'thick' ? '25mm' : '20mm'} - 20px) ${paperMargin === 'thin' ? '15mm' : paperMargin === 'thick' ? '25mm' : '20mm'} calc(${paperMargin === 'thin' ? '15mm' : paperMargin === 'thick' ? '25mm' : '20mm'} + 20px) ${paperMargin === 'thin' ? '15mm' : paperMargin === 'thick' ? '25mm' : '20mm'} !important;
                                        margin: 0 !important;
                                        box-shadow: none !important;
                                        border: none !important;
                                        page-break-after: always !important;
                                        break-after: page !important;
                                    }
                                    
                                    .page-container-flow {
                                        width: 210mm !important;
                                        min-height: 296.5mm !important;
                                        padding: calc(${paperMargin === 'thin' ? '15mm' : paperMargin === 'thick' ? '25mm' : '20mm'} - 20px) ${paperMargin === 'thin' ? '15mm' : paperMargin === 'thick' ? '25mm' : '20mm'} calc(${paperMargin === 'thin' ? '15mm' : paperMargin === 'thick' ? '25mm' : '20mm'} + 20px) ${paperMargin === 'thin' ? '15mm' : paperMargin === 'thick' ? '25mm' : '20mm'} !important;
                                        margin: 0 !important;
                                        box-shadow: none !important;
                                        border: none !important;
                                        page-break-after: always !important;
                                        break-after: page !important;
                                    }
                                    
                                    @page {
                                        margin: 0 !important;
                                        size: A4 portrait !important;
                                    }
                                }
                             `}</style>

                            {/* Cover Page */}
                            <div className="page-container text-black font-sans">
                                <div className="border-[12px] border-double border-black p-8 flex-1 flex flex-col justify-between box-sizing-border-box">
                                    {/* Header Dokumen Negara */}
                                    <div className="flex justify-between items-center border-b-4 border-black pb-4">
                                        <div className="border-2 border-black px-4 py-1.5 font-sans font-black tracking-widest text-[9px] sm:text-xs uppercase bg-white">
                                            DOKUMEN NEGARA
                                        </div>
                                        <div className="text-center">
                                            <p className="font-serif font-bold text-[8px] tracking-[0.2em] uppercase">Republik Indonesia</p>
                                            <p className="font-sans font-black text-[10px] uppercase text-slate-800 tracking-wider">Platform Ujian Cerdas</p>
                                        </div>
                                        <div className="border-2 border-black px-4 py-1.5 font-sans font-black tracking-widest text-[9px] sm:text-xs uppercase italic bg-white">
                                            SANGAT RAHASIA
                                        </div>
                                    </div>

                                    {/* Lambang / Logo */}
                                    <div className="my-auto flex flex-col items-center text-center py-6">
                                        <div className="mb-6 p-2 border-4 border-black rounded-full inline-flex items-center justify-center bg-white shadow-sm">
                                            <div className="w-16 h-16 border-2 border-dashed border-black rounded-full flex flex-col items-center justify-center">
                                                <span className="font-serif text-2xl font-black tracking-tighter m-0 leading-none">BSR</span>
                                                <span className="text-[6px] font-sans font-black uppercase tracking-widest mt-1">SOAL RESMI</span>
                                            </div>
                                        </div>

                                        <h1 className="text-2xl sm:text-3xl font-black mb-2 uppercase tracking-wider leading-tight max-w-3xl font-serif">
                                            {bookTitle}
                                        </h1>
                                        <p className="text-xs font-bold text-slate-700 tracking-[0.15em] uppercase font-sans mb-8">
                                            {bookSubtitle}
                                        </p>

                                        {/* Lembar Identitas */}
                                        <div className="w-full max-w-md border-4 border-double border-black p-4 bg-white mx-auto text-left font-sans">
                                            <p className="text-center font-black uppercase tracking-widest text-[9px] border-b-2 border-black pb-1 mb-2">
                                                IDENTITAS KUMPULAN SOAL
                                            </p>
                                            <table className="w-full text-[11px] font-medium border-collapse">
                                                <tbody>
                                                    <tr>
                                                        <td className="w-32 py-1 uppercase text-slate-500 font-extrabold tracking-wider">Jenis Dokumen</td>
                                                        <td className="py-1 px-1">:</td>
                                                        <td className="py-1 text-slate-900 font-bold uppercase">Buku Kumpulan Soal Resmi (BSR)</td>
                                                    </tr>
                                                    <tr className="border-t border-slate-200">
                                                        <td className="py-1 uppercase text-slate-500 font-extrabold tracking-wider">Total Modul</td>
                                                        <td className="py-1 px-1">:</td>
                                                        <td className="py-1 text-slate-900 font-bold">{selectedExams.length} Modul Kisi-Kisi</td>
                                                    </tr>
                                                    <tr className="border-t border-slate-200">
                                                        <td className="py-1 uppercase text-slate-500 font-extrabold tracking-wider">Total Soal</td>
                                                        <td className="py-1 px-1">:</td>
                                                        <td className="py-1 text-slate-900 font-bold">{selectedExams.reduce((acc, exam) => acc + exam.questions.length, 0)} Butir Pertanyaan</td>
                                                    </tr>
                                                    <tr className="border-t border-slate-200">
                                                        <td className="py-1 uppercase text-slate-500 font-extrabold tracking-wider">Tahun Terbit</td>
                                                        <td className="py-1 px-1">:</td>
                                                        <td className="py-1 text-slate-900 font-bold">{new Date().getFullYear()} / {new Date().getFullYear() + 1}</td>
                                                    </tr>
                                                    <tr className="border-t border-slate-200">
                                                        <td className="py-1 uppercase text-slate-500 font-extrabold tracking-wider">Hak Akses</td>
                                                        <td className="py-1 px-1">:</td>
                                                        <td className="py-1">
                                                            <span className="px-1.5 py-0.5 border border-black text-[9px] font-black uppercase tracking-widest bg-slate-50">GURU / PENGAWAS</span>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Footer Cover */}
                                    <div className="border-t border-slate-300 pt-3 flex justify-between items-center text-[9px]">
                                        <p className="font-bold tracking-widest uppercase text-slate-700">PLATFORM UJIAN CERDAS INDONESIA</p>
                                        <p className="font-semibold text-slate-500">
                                            Dicetak: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* General Instructions Sheet */}
                            <div className="page-container text-black font-sans">
                                <div className="border-[12px] border-double border-black p-8 flex-1 flex flex-col justify-between box-sizing-border-box">
                                    <div>
                                        <div className="border-b-4 border-black pb-4 mb-6 text-center">
                                            <h2 className="text-xl font-black uppercase tracking-widest font-serif">PETUNJUK UMUM</h2>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-sans mt-1">ASESMEN KOMPETENSI MINIMUM & UJIAN EKSTERNAL GURU</p>
                                        </div>

                                        <div className="space-y-4 text-xs leading-relaxed text-justify max-w-4xl mx-auto text-slate-800">
                                            <p className="font-bold text-slate-900">Sebelum menguji, mengkaji, atau membagikan soal-soal di dalam buku ini, mohon diperhatikan beberapa pedoman instruksi berikut:</p>
                                            
                                            <ul className="list-decimal pl-5 space-y-3">
                                                <li>
                                                    <strong>Persiapan Guru & Siswa:</strong> Mulailah setiap kegiatan belajar mengajar atau pelaksanaan ujian dengan berdoa sesuai keyakinan masing-masing agar proses berpikir diberikan kelancaran.
                                                </li>
                                                <li>
                                                    <strong>Verifikasi Lembar Soal:</strong> Teliti kembali kelengkapan butir soal untuk setiap modul ujian ({selectedExams.length} Modul) dalam cetakan ini. Periksa gambar, bagan, tabel, opsi pilihan, dan kunci jawaban agar tidak ada aspek penting yang cacat atau terpotong.
                                                </li>
                                                <li>
                                                    <strong>Format Pilihan Ganda:</strong> Opsi pilihan ganda tunggal dan kompleks (MULTIPLE CHOICE) ditandai dengan alfabetis bunder tebal (A, B, C, D, E). Siswa dapat memberikan jawaban tertulis dengan menyilang atau melingkari huruf yang sesuai.
                                                </li>
                                                <li>
                                                    <strong>Soal Tabel Benar/Salah (TRUE_FALSE):</strong> Untuk tipe soal benar/salah, buku ini dilengkapi dengan kotak isian bagi siswa untuk mencentang (✓) atau menyilang (X) pernyataan berdasarkan kesimpulan yang logis.
                                                </li>
                                                <li>
                                                    <strong>Soal Esai & Uraian (ESSAY):</strong> Untuk soal esai, buku menyediakan lembar garis bergaris ("Ledger/Writing Paper style") di bawah soal untuk memudahkan corat-coret, penyusunan langkah pengerjaan matematika, atau uraian deskriptif.
                                                </li>
                                                <li>
                                                    <strong>Keamanan Jawaban:</strong> Kunci jawaban terletak di bagian paling akhir buku ini. Cetakan kunci jawaban disarankan dipisah saat pembagian soal guna menjaga kerahasiaan evaluasi mandiri siswa.
                                                </li>
                                            </ul>
                                        </div>
                                    </div>

                                    <div className="border-t-2 border-black pt-3 text-center text-[10px] tracking-widest font-bold uppercase text-slate-800">
                                        SELAMAT BEKERJA • PRESTASI PENTING JUJUR UTAMA
                                    </div>
                                </div>
                            </div>

                            {/* Questions */}
                            {selectedExams.map((exam, examIndex) => {
                                return (
                                    <div key={exam.code} className="page-container-flow text-black font-serif">
                                        {/* Header Modul / Pelajaran */}
                                        <div className="border-b-4 border-black pb-3 mb-6 flex justify-between items-end avoid-break font-sans">
                                            <div>
                                                <p className="text-[10px] tracking-widest uppercase text-slate-500 font-black mb-1">MATA PELAJARAN - MODUL {examIndex + 1}</p>
                                                <h2 className="text-2xl font-black uppercase m-0 tracking-tight font-serif">{exam.config.subject}</h2>
                                            </div>
                                            <div className="text-right pb-1">
                                                <span className="bg-black text-white px-3 py-1 font-black text-xs uppercase tracking-wider">{exam.questions.length} Butir Soal</span>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-8">
                                            {exam.questions.map((q, qIndex) => {
                                                const normalized = normalizeQuestion(q);
                                                const isLong = isLongQuestion(normalized);
                                                const shouldAvoidBreak = keepTogether === 'always' || (keepTogether === 'auto' && !isLong);

                                                return (
                                                    <div key={normalized.id || qIndex} className={`${shouldAvoidBreak ? 'avoid-break' : ''} bg-white text-black mb-8 pb-6 border-b border-dashed border-slate-200 last:border-0 last:pb-0`}>
                                                        <div className="flex gap-4">
                                                            {/* Nomor Soal */}
                                                            <div className="font-black font-sans text-base pt-0.5 text-slate-950 min-w-[28px]">{qIndex + 1}.</div>
                                                            
                                                            {/* Konten Pertanyaan */}
                                                            <div className="font-serif flex-1 text-slate-900" style={{
                                                                fontSize: fontSize === 'small' ? '10.5pt' : fontSize === 'large' ? '12.5pt' : '11.5pt',
                                                                lineHeight: lineSpacing === 'tight' ? '1.35' : lineSpacing === 'relaxed' ? '1.8' : '1.55',
                                                            }}>
                                                                <div className="text-justify whitespace-pre-wrap mb-3 font-serif text-slate-950" dangerouslySetInnerHTML={{ __html: normalized.questionText }}></div>
                                                                
                                                                {/* Lampiran Gambar */}
                                                                {normalized.imageUrl && (
                                                                    <div className="my-3 max-w-[80%] border border-slate-300 rounded-lg p-1 inline-block bg-white shadow-sm">
                                                                        <img src={normalized.imageUrl} alt="soal" className="max-h-60 object-contain" referrerPolicy="no-referrer" />
                                                                    </div>
                                                                )}
                                                                
                                                                {/* Render Pilihan Ganda (Tunggal & Kompleks) */}
                                                                {(normalized.questionType === 'MULTIPLE_CHOICE' || normalized.questionType === 'COMPLEX_MULTIPLE_CHOICE') ? (
                                                                    <div className="mt-3 space-y-2.5 font-sans text-slate-900" style={{
                                                                        fontSize: fontSize === 'small' ? '10pt' : fontSize === 'large' ? '12pt' : '11pt'
                                                                    }}>
                                                                        {normalized.options?.map((opt, oIndex) => {
                                                                            const isComplex = normalized.questionType === 'COMPLEX_MULTIPLE_CHOICE';
                                                                            const roundedClass = isComplex ? 'rounded' : 'rounded-full';
                                                                            return (
                                                                                <div key={oIndex} className="flex gap-3 items-start py-0.5">
                                                                                    <span className={`font-black border-2 border-slate-900 ${roundedClass} w-5 h-5 min-w-[20px] flex items-center justify-center shrink-0 text-[10px] text-slate-955 bg-slate-50 leading-none`} style={{ marginTop: '5px' }}>
                                                                                        {String.fromCharCode(65 + oIndex)}
                                                                                    </span>
                                                                                    <div className="pt-0.5 flex-1 leading-normal font-sans">
                                                                                        <span>{opt}</span>
                                                                                        {normalized.optionImages && normalized.optionImages[oIndex] && (
                                                                                            <div className="mt-1.5 block max-w-[130px] border border-slate-200 rounded p-0.5 bg-white">
                                                                                                <img src={normalized.optionImages[oIndex] as string} alt={`opt ${oIndex}`} className="max-h-[110px] object-contain" referrerPolicy="no-referrer" />
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                ) : normalized.questionType === 'TRUE_FALSE' ? (
                                                                    /* Render Tabel Benar / Salah AKM Style */
                                                                    <div className="mt-4 pt-1 overflow-x-auto">
                                                                        <table className="w-full font-sans border-collapse border-2 border-slate-900" style={{
                                                                            fontSize: fontSize === 'small' ? '9.5pt' : fontSize === 'large' ? '11.5pt' : '10.5pt'
                                                                        }}>
                                                                            <thead>
                                                                                <tr className="bg-slate-100 border-b-2 border-slate-900 text-slate-950">
                                                                                    <th className="text-left py-2 px-3 font-bold border-r border-slate-900 text-[9pt] uppercase tracking-wider bg-slate-50">Daftar Pernyataan / Kasus</th>
                                                                                    <th className="w-20 border-r border-slate-900 py-2 text-center font-bold text-[9pt] uppercase tracking-wider bg-slate-50">BENAR</th>
                                                                                    <th className="w-20 py-2 text-center font-bold text-[9pt] uppercase tracking-wider bg-slate-50">SALAH</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {normalized.trueFalseRows?.map((row, rIdx) => (
                                                                                    <tr key={rIdx} className="border-b border-slate-950 last:border-b-0 hover:bg-slate-50">
                                                                                        <td className="py-2 px-3 text-left border-r border-slate-300 font-medium">{row.text}</td>
                                                                                        <td className="py-2 border-r border-slate-300 text-center">
                                                                                            <div className="w-4 h-4 rounded border border-slate-400 mx-auto bg-slate-50 shadow-inner flex items-center justify-center text-[9px] font-bold text-slate-400 leading-none">B</div>
                                                                                        </td>
                                                                                        <td className="py-2 text-center">
                                                                                            <div className="w-4 h-4 rounded border border-slate-400 mx-auto bg-slate-50 shadow-inner flex items-center justify-center text-[9px] font-bold text-slate-400 leading-none">S</div>
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                ) : normalized.questionType === 'ESSAY' ? (
                                                                    /* Render Kertas Bergaris Penulisan Lembar Uraian */
                                                                    <div className="mt-3 border-2 border-slate-300 p-3 rounded-lg bg-slate-50/20 avoid-break">
                                                                        <p className="text-[9pt] font-bold text-slate-500 uppercase tracking-widest mb-2 font-sans">Lembar Jawaban Uraian / Langkah Penyelesaian:</p>
                                                                        <div className="space-y-3 py-1">
                                                                            <div className="border-b border-dashed border-slate-300 h-5"></div>
                                                                            <div className="border-b border-dashed border-slate-300 h-5"></div>
                                                                            <div className="border-b border-dashed border-slate-300 h-5"></div>
                                                                            <div className="border-b border-dashed border-slate-300 h-5"></div>
                                                                        </div>
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Answer Key */}
                            <div className="page-container-flow text-black font-sans">
                                <div className="mb-8 text-center pb-4 border-b-4 border-black font-sans">
                                    <p className="font-sans font-black tracking-[0.3em] text-[10px] text-rose-600 uppercase mb-1">DOKUMEN SANGAT RAHASIA</p>
                                    <h1 className="text-3xl font-black uppercase m-0 tracking-wider">Kunci Jawaban Resmi</h1>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1 font-sans font-bold">Kumpulah Soal Evaluasi Belajar - Platform Ujian Cerdas</p>
                                </div>
                                
                                <div className="space-y-10">
                                    {selectedExams.map((exam, examIndex) => {
                                        return (
                                            <div key={exam.code} className="avoid-break font-sans">
                                                <div className="flex items-center gap-3.5 mb-4 border-b-2 border-slate-900 pb-1.5">
                                                    <div className="w-6 h-6 rounded-full bg-slate-950 text-white flex items-center justify-center font-black text-xs">{examIndex + 1}</div>
                                                    <h2 className="text-sm font-black uppercase m-0 tracking-tight text-slate-900">{exam.config.subject}</h2>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-5 gap-y-3 bg-slate-50 p-4 rounded-xl border border-slate-300 shadow-sm">
                                                    {exam.questions.map((q, qIndex) => {
                                                        const answerText = getFormattedAnswerText(q);
                                                        return (
                                                            <div key={q.id} className="text-xs flex items-start gap-2">
                                                                <span className="font-extrabold text-slate-500 min-w-[20px] text-right">{qIndex + 1}.</span> 
                                                                <span className="font-black text-slate-950 break-all flex-1 uppercase tracking-wide bg-white px-1.5 py-0.5 border border-slate-200 rounded shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-center">{answerText}</span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}           </div>

            </div>
    );
};

export default BookGeneratorView;
