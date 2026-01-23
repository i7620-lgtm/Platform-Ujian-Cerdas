
import React, { useState, useRef, useEffect } from 'react';
import type { Question, QuestionType, ExamConfig } from '../../types';
import { 
    TrashIcon, XMarkIcon, PlusCircleIcon, PhotoIcon, 
    FileTextIcon, ListBulletIcon, CheckCircleIcon, PencilIcon, FileWordIcon, CheckIcon, ArrowLeftIcon,
    EyeIcon 
} from '../Icons';
import { compressImage } from './examUtils';

interface ExamEditorProps {
    questions: Question[];
    setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
    config: ExamConfig;
    setConfig: React.Dispatch<React.SetStateAction<ExamConfig>>;
    isEditing: boolean;
    onSave: () => void;
    onSaveDraft?: () => void;
    onCancel: () => void;
    generatedCode: string;
    onReset: () => void;
}

const SUBJECTS = [
    "Agama Buddha", "Agama Hindu", "Agama Islam", "Agama Katolik", "Agama Khonghucu", "Agama Kristen", 
    "Kepercayaan", "Bahasa Indonesia", "Bahasa Inggris", "Pendidikan Pancasila", "Matematika", 
    "Ilmu Pengetahuan Alam dan Sosial", "Ilmu Pengetahuan Alam", "Ilmu Pengetahuan Sosial", 
    "Pendidikan Jasmani Olahraga dan Kesehatan", "Seni Budaya", "Muatan Lokal", 
    "Koding dan Kecerdasan Artifisial", "Lainnya"
];

const CLASSES = [
    "SD Kelas 1", "SD Kelas 2", "SD Kelas 3", "SD Kelas 4", "SD Kelas 5", "SD Kelas 6",
    "SMP Kelas 7", "SMP Kelas 8", "SMP Kelas 9",
    "SMA Kelas 10", "SMA Kelas 11", "SMA Kelas 12",
    "SMK Kelas 10", "SMK Kelas 11", "SMK Kelas 12",
    "Lainnya"
];

const EXAM_TYPES = [
    "Latihan Soal", "Ulangan Harian (UH)", "Penilaian Tengah Semester (PTS)", 
    "Penilaian Akhir Semester (PAS)", "Lomba", "Kuis", "Tes Kemampuan Akademik (TKA)", "Lainnya"
];

// --- UNIVERSAL EDITOR TOOLBAR (MATH + RICH TEXT) ---
const EditorToolbar: React.FC<{ 
    onInsert: (prefix: string, suffix?: string, isBlock?: boolean) => void,
    className?: string 
}> = ({ onInsert, className = "" }) => {
    const [activeTab, setActiveTab] = useState<'TEXT' | 'STR' | 'SYM' | 'GREEK' | 'SCI'>('TEXT');
    const [showCustomMatrix, setShowCustomMatrix] = useState(false);
    const [matrixRows, setMatrixRows] = useState(2);
    const [matrixCols, setMatrixCols] = useState(2);
    const [matrixType, setMatrixType] = useState<'pmatrix' | 'vmatrix'>('pmatrix');

    const generateCustomMatrix = () => {
        let latex = `\\begin{${matrixType}}\n`;
        for (let r = 1; r <= matrixRows; r++) {
            let row = [];
            for (let c = 1; c <= matrixCols; c++) {
                row.push(`a_{${r},${c}}`);
            }
            latex += "  " + row.join(" & ") + (r < matrixRows ? " \\\\" : "") + "\n";
        }
        latex += `\\end{${matrixType}}`;
        onInsert('$' + latex + '$');
        setShowCustomMatrix(false);
    };

    const mathCategories = {
        STR: {
            name: 'Struktur',
            items: [
                { label: 'a/b', latex: '\\frac{atas}{bawah}', title: 'Pecahan' },
                { label: '√', latex: '\\sqrt{x}', title: 'Akar Kuadrat' },
                { label: 'ⁿ√', latex: '\\sqrt[n]{x}', title: 'Akar Pangkat n' },
                { label: 'xⁿ', latex: '^{n}', title: 'Pangkat' },
                { label: 'xₙ', latex: '_{n}', title: 'Indeks' },
                { label: '()', latex: '\\left( x \\right)', title: 'Kurung Otomatis' },
                { 
                    label: 'M[n,n]', 
                    action: () => { setMatrixType('pmatrix'); setShowCustomMatrix(true); }, 
                    title: 'Matriks Custom ( )' 
                },
                { 
                    label: 'D[n,n]', 
                    action: () => { setMatrixType('vmatrix'); setShowCustomMatrix(true); }, 
                    title: 'Determinan Custom | |' 
                },
                { label: '∑', latex: '\\sum_{i=1}^{n}', title: 'Sumasi' },
                { label: '∫', latex: '\\int_{a}^{b}', title: 'Integral' },
                { label: 'lim', latex: '\\lim_{x \\to \\infty}', title: 'Limit' },
            ]
        },
        SYM: {
            name: 'Simbol',
            items: [
                { label: '±', latex: '\\pm', title: 'Plus Minus' },
                { label: '×', latex: '\\times', title: 'Kali' },
                { label: '÷', latex: '\\div', title: 'Bagi' },
                { label: '≠', latex: '\\neq', title: 'Tidak Sama Dengan' },
                { label: '≈', latex: '\\approx', title: 'Mendekati' },
                { label: '≤', latex: '\\le', title: 'Kurang Dari Sama Dengan' },
                { label: '≥', latex: '\\ge', title: 'Lebih Dari Sama Dengan' },
                { label: '∞', latex: '\\infty', title: 'Tak Hingga' },
                { label: '∴', latex: '\\therefore', title: 'Oleh Karena Itu' },
                { label: '⇒', latex: '\\implies', title: 'Implikasi' },
                { label: '⇔', latex: '\\iff', title: 'Ekuivalensi' },
                { label: '∈', latex: '\\in', title: 'Elemen Himpunan' },
                { label: '∅', latex: '\\emptyset', title: 'Himpunan Kosong' },
            ]
        },
        GREEK: {
            name: 'Yunani',
            items: [
                { label: 'α', latex: '\\alpha', title: 'Alpha' },
                { label: 'β', latex: '\\beta', title: 'Beta' },
                { label: 'γ', latex: '\\gamma', title: 'Gamma' },
                { label: 'δ', latex: '\\delta', title: 'Delta' },
                { label: 'ε', latex: '\\epsilon', title: 'Epsilon' },
                { label: 'θ', latex: '\\theta', title: 'Theta' },
                { label: 'λ', latex: '\\lambda', title: 'Lambda' },
                { label: 'μ', latex: '\\mu', title: 'Mu' },
                { label: 'π', latex: '\\pi', title: 'Pi' },
                { label: 'σ', latex: '\\sigma', title: 'Sigma' },
                { label: 'φ', latex: '\\phi', title: 'Phi' },
                { label: 'ω', latex: '\\omega', title: 'Omega' },
                { label: 'Δ', latex: '\\Delta', title: 'Delta Kapital' },
                { label: 'Ω', latex: '\\Omega', title: 'Omega Kapital' },
            ]
        },
        SCI: {
            name: 'Sains',
            items: [
                { label: 'ⁿlog', latex: '^{n}\\log(x)', title: 'Logaritma Berbasis' },
                { label: 'sin', latex: '\\sin', title: 'Sinus' },
                { label: 'cos', latex: '\\cos', title: 'Cosinus' },
                { label: 'tan', latex: '\\tan', title: 'Tangen' },
                { label: 'log', latex: '\\log', title: 'Logaritma' },
                { label: 'ln', latex: '\\ln', title: 'Logaritma Natural' },
                { label: '°', latex: '^{\\circ}', title: 'Derajat' },
                { label: '∠', latex: '\\angle', title: 'Sudut' },
                { label: '⊥', latex: '\\perp', title: 'Tegak Lurus' },
                { label: '||', latex: '\\parallel', title: 'Sejajar' },
                { label: '→', latex: '\\vec{v}', title: 'Vektor' },
                { label: 'x̄', latex: '\\bar{x}', title: 'Rata-rata (Mean)' },
                { label: '°C', latex: '^{\\circ}C', title: 'Celcius' },
            ]
        }
    };

    const textFormatting = [
        { label: 'B', action: () => onInsert('**', '**'), title: 'Tebal (Bold)' },
        { label: 'I', action: () => onInsert('*', '*'), title: 'Miring (Italic)' },
        { label: 'U', action: () => onInsert('<u>', '</u>'), title: 'Garis Bawah (Underline)' },
        { label: 'S', action: () => onInsert('~~', '~~'), title: 'Coret (Strikethrough)' },
        { label: 'List', action: () => onInsert('- ', '', true), title: 'Daftar Bullets' },
        { label: '1.', action: () => onInsert('1. ', '', true), title: 'Daftar Penomoran' },
    ];

    return (
        <div className={`flex flex-col bg-slate-50 border-b border-gray-200 rounded-t-lg overflow-visible relative ${className}`}>
            {/* Tab Selector */}
            <div className="flex border-b border-gray-100 bg-white px-2 pt-1 gap-1">
                <button
                    type="button"
                    onClick={() => setActiveTab('TEXT')}
                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all rounded-t-md ${activeTab === 'TEXT' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                >
                    Format Teks
                </button>
                {(Object.keys(mathCategories) as Array<keyof typeof mathCategories>).map((key) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setActiveTab(key)}
                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all rounded-t-md ${activeTab === key ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                    >
                        {mathCategories[key].name}
                    </button>
                ))}
            </div>

            {/* Custom Matrix Popover */}
            {showCustomMatrix && (
                <div className="absolute top-full left-0 z-50 mt-1 bg-white border border-indigo-100 shadow-xl rounded-xl p-4 w-64 animate-fade-in ring-4 ring-indigo-500/5">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-black uppercase tracking-tight text-indigo-600">
                            {matrixType === 'pmatrix' ? 'Konfigurasi Matriks' : 'Konfigurasi Determinan'}
                        </h4>
                        <button type="button" onClick={() => setShowCustomMatrix(false)}><XMarkIcon className="w-4 h-4 text-gray-400"/></button>
                    </div>
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-slate-500 block mb-1">BARIS</label>
                                <input type="number" min="1" max="10" value={matrixRows} onChange={(e) => setMatrixRows(parseInt(e.target.value))} className="w-full p-2 bg-slate-50 border rounded-lg text-xs" />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-slate-500 block mb-1">KOLOM</label>
                                <input type="number" min="1" max="10" value={matrixCols} onChange={(e) => setMatrixCols(parseInt(e.target.value))} className="w-full p-2 bg-slate-50 border rounded-lg text-xs" />
                            </div>
                        </div>
                        <button type="button" onClick={generateCustomMatrix} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-indigo-700">
                            Sisipkan {matrixRows}x{matrixCols}
                        </button>
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div className="flex flex-wrap items-center gap-1 p-2 min-h-[44px]">
                {activeTab === 'TEXT' ? (
                    textFormatting.map((item, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={item.action}
                            title={item.title}
                            className={`min-w-[38px] h-[32px] flex items-center justify-center text-[11px] font-black bg-white border border-gray-200 rounded hover:bg-slate-100 transition-all shadow-sm active:scale-90 ${item.label === 'B' ? 'font-black' : item.label === 'I' ? 'italic font-serif' : item.label === 'U' ? 'underline' : item.label === 'S' ? 'line-through' : ''}`}
                        >
                            {item.label}
                        </button>
                    ))
                ) : (
                    mathCategories[activeTab as keyof typeof mathCategories].items.map((item: any, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => item.action ? item.action() : onInsert('$' + item.latex + '$')}
                            title={item.title}
                            className="min-w-[38px] h-[32px] flex items-center justify-center text-[11px] font-bold bg-white border border-gray-200 rounded hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm active:scale-90"
                        >
                            {item.label}
                        </button>
                    ))
                )}
                
                {activeTab !== 'TEXT' && (
                    <button 
                        type="button"
                        onClick={() => onInsert('$$\n', '\n$$')}
                        className="ml-auto text-[10px] font-bold text-indigo-500 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded"
                    >
                        + Baris Matematika
                    </button>
                )}
            </div>
        </div>
    );
};

// --- REAL-TIME RICH TEXT + MATH PREVIEW ---
const EditorPreview: React.FC<{ text: string }> = ({ text }) => {
    const previewRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (previewRef.current) {
            try {
                // 1. Pre-process Formatting (Bold, Italic, Delete, Underline)
                let processedText = text
                    .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*([\s\S]+?)\*/g, '<em>$1</em>')
                    .replace(/~~([\s\S]+?)~~/g, '<del>$1</del>')
                    .replace(/<u>([\s\S]+?)<\/u>/g, '<u>$1</u>');

                // 2. State-based Line Parsing for Correct Lists
                const lines = processedText.split('\n');
                let finalHtmlChunks = [];
                let inUl = false;
                let inOl = false;

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const bulletMatch = line.match(/^\s*-\s+(.*)/);
                    const numberedMatch = line.match(/^\s*\d+[\.\)]\s+(.*)/);

                    if (bulletMatch) {
                        if (inOl) { finalHtmlChunks.push('</ol>'); inOl = false; }
                        if (!inUl) { finalHtmlChunks.push('<ul class="list-disc list-outside pl-6 space-y-1 my-2">'); inUl = true; }
                        finalHtmlChunks.push(`<li>${bulletMatch[1]}</li>`);
                    } else if (numberedMatch) {
                        if (inUl) { finalHtmlChunks.push('</ul>'); inUl = false; }
                        if (!inOl) { finalHtmlChunks.push('<ol class="list-decimal list-outside pl-6 space-y-1 my-2">'); inOl = true; }
                        finalHtmlChunks.push(`<li>${numberedMatch[1]}</li>`);
                    } else {
                        // Close any open list tags when meeting plain text
                        if (inUl) { finalHtmlChunks.push('</ul>'); inUl = false; }
                        if (inOl) { finalHtmlChunks.push('</ol>'); inOl = false; }
                        // Use <br/> for line breaks in normal text, but skip if it's an empty line to avoid huge gaps
                        finalHtmlChunks.push(line.trim() === '' ? '<div class="h-2"></div>' : line + '<br/>');
                    }
                }
                // Final close
                if (inUl) finalHtmlChunks.push('</ul>');
                if (inOl) finalHtmlChunks.push('</ol>');

                let html = finalHtmlChunks.join('');

                // 3. KaTeX handling
                if (html.includes('$') && (window as any).katex) {
                    html = html.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
                        return (window as any).katex.renderToString(math, { displayMode: true, throwOnError: false });
                    }).replace(/\$([\s\S]+?)\$/g, (_, math) => {
                        return (window as any).katex.renderToString(math, { displayMode: false, throwOnError: false });
                    });
                }
                
                previewRef.current.innerHTML = html;
            } catch (e) {
                previewRef.current.textContent = "Terjadi kesalahan format...";
            }
        }
    }, [text]);

    if (!text.trim()) return null;

    return (
        <div className="mt-3 p-4 bg-slate-50 border border-dashed border-gray-200 rounded-xl text-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <EyeIcon className="w-3.5 h-3.5"/> Pratinjau Tampilan Siswa:
            </p>
            <div ref={previewRef} className="prose prose-slate prose-sm max-w-none overflow-x-auto min-h-[1.5rem] text-slate-700"></div>
        </div>
    );
};

export const ExamEditor: React.FC<ExamEditorProps> = ({ 
    questions, setQuestions, config, setConfig, isEditing, onSave, onSaveDraft, onCancel, generatedCode, onReset 
}) => {
    const [isTypeSelectionModalOpen, setIsTypeSelectionModalOpen] = useState(false);
    const [insertIndex, setInsertIndex] = useState<number | null>(null);
    const questionsSectionRef = useRef<HTMLDivElement>(null);
    const generatedCodeSectionRef = useRef<HTMLDivElement>(null);
    
    // Track textareas for inserting text
    const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

    // Scroll Effect
    useEffect(() => {
        if (!isEditing && !generatedCode) {
            const timer = setTimeout(() => {
                if (questionsSectionRef.current) {
                    questionsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isEditing, generatedCode]);

    useEffect(() => {
        if (generatedCode && generatedCodeSectionRef.current) {
            setTimeout(() => {
                generatedCodeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 200);
        }
    }, [generatedCode]);

    const isDataUrl = (str: string) => str.startsWith('data:image/');

    const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

    const handleQuestionTextChange = (id: string, text: string) => {
        setQuestions(prev => prev.map(q => q.id === id ? { ...q, questionText: text } : q));
    };

    const handleTypeChange = (qId: string, newType: QuestionType) => {
        setQuestions(prev => prev.map(q => {
            if (q.id === qId) {
                const updated = { ...q, questionType: newType };
                if (['MULTIPLE_CHOICE', 'COMPLEX_MULTIPLE_CHOICE'].includes(newType) && (!updated.options || updated.options.length === 0)) {
                    updated.options = ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'];
                    updated.correctAnswer = newType === 'MULTIPLE_CHOICE' ? 'Opsi A' : '';
                }
                if (newType === 'TRUE_FALSE' && (!updated.trueFalseRows || updated.trueFalseRows.length === 0)) {
                    updated.trueFalseRows = [{ text: 'Pernyataan 1', answer: true }, { text: 'Pernyataan 2', answer: false }];
                }
                if (newType === 'MATCHING' && (!updated.matchingPairs || updated.matchingPairs.length === 0)) {
                    updated.matchingPairs = [{ left: 'Item A', right: 'Pasangan A' }, { left: 'Item B', right: 'Pasangan B' }];
                }
                return updated;
            }
            return q;
        }));
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

    const insertToTextarea = (textareaId: string, prefix: string, suffix: string = '', isBlock: boolean = false) => {
        const textarea = textareaRefs.current[textareaId];
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const before = text.substring(0, start);
        const selection = text.substring(start, end);
        const after = text.substring(end);

        let newText = "";
        if (isBlock) {
            // Logic for list items
            const lines = selection.split('\n');
            const formattedLines = lines.map(line => prefix + line);
            newText = before + formattedLines.join('\n') + after;
        } else {
            newText = before + prefix + selection + suffix + after;
        }

        // We need to update state
        const parts = textareaId.split('-');
        const qId = parts.slice(1, -1).join('-'); // Re-assemble if qId contains dashes
        const type = parts[0]; // 'q' for question, 'opt' for option
        
        if (type === 'q') {
            handleQuestionTextChange(qId, newText);
        } else if (type === 'opt') {
            const optIdx = parseInt(parts[parts.length - 1]);
            handleOptionTextChange(qId, optIdx, newText);
        } else if (type === 'key') {
             handleCorrectAnswerChange(qId, newText);
        }

        // Maintain focus and set selection
        setTimeout(() => {
            textarea.focus();
            const newPos = start + prefix.length;
            textarea.setSelectionRange(newPos, newPos + selection.length);
        }, 10);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, qId: string, optIndex?: number) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            const rawDataUrl = ev.target?.result as string;
            const dataUrl = await compressImage(rawDataUrl, 0.7);

            setQuestions(prev => prev.map(q => {
                if (q.id === qId) {
                    if (optIndex !== undefined) {
                        const currentOptImages = q.optionImages ? [...q.optionImages] : (q.options ? new Array(q.options.length).fill(null) : []);
                        while (currentOptImages.length <= optIndex) currentOptImages.push(null);
                        currentOptImages[optIndex] = dataUrl;
                        return { ...q, optionImages: currentOptImages };
                    } else {
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

    const handleCorrectAnswerChange = (questionId: string, answer: string) => {
        setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, correctAnswer: answer } : q));
    };

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

    const createNewQuestion = (type: QuestionType): Question => {
        const base = {
            id: `q-${Date.now()}-${Math.random()}`,
            questionText: '',
            questionType: type,
            imageUrl: undefined,
            optionImages: undefined
        };

        switch (type) {
            case 'INFO': return { ...base };
            case 'MULTIPLE_CHOICE': return { ...base, options: ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'], correctAnswer: 'Opsi A' };
            case 'COMPLEX_MULTIPLE_CHOICE': return { ...base, options: ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'], correctAnswer: '' };
            case 'TRUE_FALSE': return { ...base, trueFalseRows: [{ text: 'Pernyataan 1', answer: true }, { text: 'Pernyataan 2', answer: false }], options: undefined, correctAnswer: undefined };
            case 'MATCHING': return { ...base, matchingPairs: [{ left: 'Item A', right: 'Pasangan A' }, { left: 'Item B', right: 'Pasangan B' }] };
            case 'FILL_IN_THE_BLANK': return { ...base, correctAnswer: '' };
            case 'ESSAY': default: return { ...base };
        }
    };

    const openTypeSelectionModal = (index: number | null = null) => {
        setInsertIndex(index);
        setIsTypeSelectionModalOpen(true);
    };

    const handleSelectQuestionType = (type: QuestionType) => {
        const newQuestion = createNewQuestion(type);
        if (insertIndex === null) {
            setQuestions(prev => [...prev, newQuestion]);
             setTimeout(() => {
                document.getElementById(newQuestion.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        } else {
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
                const nextChar = String.fromCharCode(65 + q.options.length); 
                const newOptions = [...q.options, `Opsi ${nextChar}`];
                const newOptionImages = q.optionImages ? [...q.optionImages, null] : undefined;
                return { ...q, options: newOptions, optionImages: newOptionImages };
            }
            return q;
        }));
    };

    const handleDeleteOption = (questionId: string, indexToRemove: number) => {
        setQuestions(prev => prev.map(q => {
            if (q.id === questionId && q.options && q.options.length > 1) { 
                const optionToRemove = q.options[indexToRemove];
                const newOptions = q.options.filter((_, i) => i !== indexToRemove);
                const newOptionImages = q.optionImages ? q.optionImages.filter((_, i) => i !== indexToRemove) : undefined;
                
                let newCorrectAnswer = q.correctAnswer;
                if (q.questionType === 'MULTIPLE_CHOICE') {
                     if (q.correctAnswer === optionToRemove) newCorrectAnswer = newOptions[0] || ''; 
                } else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
                    let answers = q.correctAnswer ? q.correctAnswer.split(',') : [];
                    answers = answers.filter(a => a !== optionToRemove);
                    newCorrectAnswer = answers.join(',');
                }

                return { ...q, options: newOptions, optionImages: newOptionImages, correctAnswer: newCorrectAnswer };
            }
            return q;
        }));
    };

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
        <div className="space-y-10 border-t-2 border-gray-200 pt-12">
            <div ref={questionsSectionRef} id="exam-editor-section" className="space-y-4 scroll-mt-32">
                 <div className="p-4 bg-primary/5 rounded-lg">
                    <h2 className="text-xl font-bold text-neutral">
                        {isEditing ? '1. Tinjau dan Edit Soal' : '3. Tinjau dan Edit Soal'}
                    </h2>
                    <p className="text-sm text-base-content mt-1">Periksa kembali soal yang telah dibuat. Gunakan bilah alat di atas textarea untuk format teks dan rumus matematika.</p>
                </div>
                <div className="space-y-4">
                    {questions.length > 0 && (
                        <div className="relative py-2 group/insert">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-gray-200 group-hover/insert:border-primary/30 transition-colors"></div>
                            </div>
                            <div className="relative flex justify-center">
                                <button
                                    onClick={() => openTypeSelectionModal(-1)}
                                    className="bg-gray-50 text-gray-400 group-hover/insert:text-primary group-hover/insert:bg-primary/5 px-4 py-1 text-xs font-semibold rounded-full border border-gray-200 group-hover/insert:border-primary/30 shadow-sm transition-all transform hover:scale-105 flex items-center gap-1 opacity-0 group-hover/insert:opacity-100 focus:opacity-100"
                                >
                                    <PlusCircleIcon className="w-4 h-4" />
                                    Tambah Soal / Keterangan Di Awal
                                </button>
                            </div>
                        </div>
                    )}

                    {questions.map((q, index) => {
                        const questionNumber = questions.slice(0, index).filter(i => i.questionType !== 'INFO').length + 1;
                        const qTextareaId = `q-${q.id}-0`;

                        return (
                        <React.Fragment key={q.id}>
                            <div id={q.id} className="bg-white border border-gray-200 rounded-lg shadow-sm group hover:shadow-md transition-shadow relative overflow-hidden">
                                    <div className="p-4">
                                        <div className="flex justify-center mb-4">
                                            <div className="relative inline-block">
                                                <select
                                                    value={q.questionType}
                                                    onChange={(e) => handleTypeChange(q.id, e.target.value as QuestionType)}
                                                    className="appearance-none bg-gray-100 border border-gray-200 text-gray-700 py-1.5 pl-4 pr-8 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:bg-gray-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                                                >
                                                    <option value="MULTIPLE_CHOICE">Pilihan Ganda</option>
                                                    <option value="COMPLEX_MULTIPLE_CHOICE">Pilihan Ganda Kompleks</option>
                                                    <option value="TRUE_FALSE">Benar / Salah</option>
                                                    <option value="MATCHING">Menjodohkan</option>
                                                    <option value="ESSAY">Esai / Uraian</option>
                                                    <option value="FILL_IN_THE_BLANK">Isian Singkat</option>
                                                    <option value="INFO">Keterangan / Info</option>
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-start gap-2 mb-2">
                                                    {q.questionType === 'INFO' ? (
                                                        <span className="flex-shrink-0 mt-2 bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-md">INFO</span>
                                                    ) : (
                                                        <span className="text-primary font-bold mt-2">{questionNumber}.</span>
                                                    )}
                                                    <div className="flex-1">
                                                        <div className="border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-slate-800 focus-within:border-transparent transition-all">
                                                            <EditorToolbar onInsert={(pre, suf, blk) => insertToTextarea(qTextareaId, pre, suf, blk)} />
                                                            <textarea
                                                                // Fixed ref callback to return void
                                                                ref={(el) => { textareaRefs.current[qTextareaId] = el; }}
                                                                value={q.questionText}
                                                                onChange={(e) => handleQuestionTextChange(q.id, e.target.value)}
                                                                className={`w-full p-3 bg-white border-0 focus:ring-0 text-sm leading-relaxed break-words outline-none font-sans ${isDataUrl(q.questionText) ? 'hidden' : 'min-h-[120px]'}`}
                                                                placeholder={q.questionType === 'INFO' ? "Tulis informasi atau teks bacaan di sini..." : "Tulis pertanyaan di sini..."}
                                                            />
                                                        </div>
                                                        <EditorPreview text={q.questionText} />

                                                        {(isDataUrl(q.questionText) || q.imageUrl) && (
                                                            <div className="relative inline-block group/img mt-4">
                                                                <img 
                                                                    src={q.imageUrl || q.questionText} 
                                                                    alt="Gambar Soal" 
                                                                    className="max-w-full h-auto border rounded-md max-h-[300px]" 
                                                                />
                                                                <button 
                                                                    onClick={() => {
                                                                        if (q.imageUrl) handleDeleteImage(q.id);
                                                                        else handleQuestionTextChange(q.id, ''); 
                                                                    }}
                                                                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity shadow-sm"
                                                                >
                                                                    <XMarkIcon className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                        <div className="flex justify-end mt-2">
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
                                                <div className="space-y-4">
                                                    {q.options.map((option, i) => {
                                                        const optTextareaId = `opt-${q.id}-${i}`;
                                                        return (
                                                        <div key={i} className={`relative rounded-lg border transition-all duration-200 group/opt ${q.correctAnswer === option ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300' : 'bg-gray-50 border-gray-200'}`}>
                                                            <EditorToolbar onInsert={(pre, suf, blk) => insertToTextarea(optTextareaId, pre, suf, blk)} className="rounded-t-lg bg-white/50" />
                                                            <div className="p-3 pr-10 flex items-start gap-3">
                                                                <button 
                                                                    onClick={() => handleDeleteOption(q.id, i)}
                                                                    className="absolute top-2 right-2 text-gray-400 hover:text-red-600 p-1 transition-colors z-10 bg-white/50 hover:bg-white rounded-full"
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
                                                                />
                                                                <div className="flex-1 space-y-2">
                                                                    <div className="flex flex-col">
                                                                        <input
                                                                            // Fixed ref callback to return void
                                                                            ref={(el) => { textareaRefs.current[optTextareaId] = el as any; }}
                                                                            type="text"
                                                                            value={option}
                                                                            onChange={(e) => handleOptionTextChange(q.id, i, e.target.value)}
                                                                            className={`block w-full px-2 py-1.5 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-sm break-words ${isDataUrl(option) ? 'hidden' : ''}`}
                                                                            placeholder={`Opsi ${String.fromCharCode(65 + i)}`}
                                                                        />
                                                                        <EditorPreview text={option} />
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
                                                        </div>
                                                    )})}
                                                </div>
                                                <button 
                                                    onClick={() => handleAddOption(q.id)}
                                                    className="mt-4 text-xs text-primary font-semibold hover:text-primary-focus flex items-center gap-1 hover:underline"
                                                >
                                                    <PlusCircleIcon className="w-4 h-4" />
                                                    Tambah Opsi
                                                </button>
                                            </div>
                                        )}
                                        
                                        {/* EDITOR: COMPLEX MULTIPLE CHOICE */}
                                        {q.questionType === 'COMPLEX_MULTIPLE_CHOICE' && q.options && (
                                            <div className="mt-3 ml-8">
                                                <p className="text-xs text-gray-500 mb-2 italic">Centang kotak untuk menandai semua jawaban yang benar.</p>
                                                <div className="space-y-4">
                                                    {q.options.map((option, i) => {
                                                        const isChecked = q.correctAnswer ? q.correctAnswer.split(',').includes(option) : false;
                                                        const optTextareaId = `opt-${q.id}-${i}`;
                                                        return (
                                                        <div key={i} className={`relative rounded-lg border transition-all duration-200 group/opt ${isChecked ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300' : 'bg-gray-50 border-gray-200'}`}>
                                                            <EditorToolbar onInsert={(pre, suf, blk) => insertToTextarea(optTextareaId, pre, suf, blk)} className="rounded-t-lg bg-white/50" />
                                                            <div className="p-3 pr-10 flex items-start gap-3">
                                                                <button 
                                                                    onClick={() => handleDeleteOption(q.id, i)}
                                                                    className="absolute top-2 right-2 text-gray-400 hover:text-red-600 p-1 transition-colors z-10 bg-white/50 hover:bg-white rounded-full"
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
                                                                    <div className="flex flex-col">
                                                                        <input
                                                                            // Fixed ref callback to return void
                                                                            ref={(el) => { textareaRefs.current[optTextareaId] = el as any; }}
                                                                            type="text"
                                                                            value={option}
                                                                            onChange={(e) => handleOptionTextChange(q.id, i, e.target.value)}
                                                                            className={`block w-full px-2 py-1.5 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-sm break-words ${isDataUrl(option) ? 'hidden' : ''}`}
                                                                            placeholder={`Opsi ${String.fromCharCode(65 + i)}`}
                                                                        />
                                                                        <EditorPreview text={option} />
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
                                                        </div>
                                                    )})}
                                                </div>
                                                 <button 
                                                    onClick={() => handleAddOption(q.id)}
                                                    className="mt-4 text-xs text-primary font-semibold hover:text-primary-focus flex items-center gap-1 hover:underline"
                                                >
                                                    <PlusCircleIcon className="w-4 h-4" />
                                                    Tambah Opsi
                                                </button>
                                            </div>
                                        )}
                                        
                                        {/* EDITOR: TRUE/FALSE */}
                                        {q.questionType === 'TRUE_FALSE' && q.trueFalseRows && (
                                            <div className="mt-3 ml-8">
                                                <div className="overflow-x-auto border rounded-md shadow-inner">
                                                    <table className="w-full text-sm text-left">
                                                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                                                            <tr>
                                                                <th className="px-4 py-3 w-full">Pernyataan</th>
                                                                <th className="px-4 py-3 text-center w-24">Benar</th>
                                                                <th className="px-4 py-3 text-center w-24">Salah</th>
                                                                <th className="px-2 py-3 w-10"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {q.trueFalseRows.map((row, i) => (
                                                                <tr key={i} className="bg-white hover:bg-indigo-50/30 transition-colors">
                                                                    <td className="px-4 py-3">
                                                                        <input 
                                                                            type="text"
                                                                            value={row.text}
                                                                            onChange={(e) => handleTrueFalseRowTextChange(q.id, i, e.target.value)}
                                                                            className="w-full border-gray-200 rounded focus:ring-2 focus:ring-indigo-500 text-sm p-1.5"
                                                                            placeholder="Tulis pernyataan..."
                                                                        />
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <input 
                                                                            type="radio"
                                                                            name={`tf-row-${q.id}-${i}`}
                                                                            checked={row.answer === true}
                                                                            onChange={() => handleTrueFalseRowAnswerChange(q.id, i, true)}
                                                                            className="w-5 h-5 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                                        />
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <input 
                                                                            type="radio"
                                                                            name={`tf-row-${q.id}-${i}`}
                                                                            checked={row.answer === false}
                                                                            onChange={() => handleTrueFalseRowAnswerChange(q.id, i, false)}
                                                                            className="w-5 h-5 text-rose-600 focus:ring-rose-500 cursor-pointer"
                                                                        />
                                                                    </td>
                                                                    <td className="px-2 py-3 text-center">
                                                                         <button onClick={() => handleDeleteTrueFalseRow(q.id, i)} className="text-gray-300 hover:text-rose-500 p-1 transition-colors">
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
                                                    className="mt-3 text-xs text-primary font-semibold hover:text-primary-focus flex items-center gap-1 hover:underline"
                                                >
                                                    <PlusCircleIcon className="w-4 h-4" />
                                                    Tambah Pernyataan
                                                </button>
                                            </div>
                                        )}

                                        {/* EDITOR: MATCHING */}
                                        {q.questionType === 'MATCHING' && q.matchingPairs && (
                                             <div className="mt-3 ml-8">
                                                <div className="space-y-3">
                                                    {q.matchingPairs.map((pair, i) => (
                                                        <div key={i} className="flex gap-3 items-center bg-slate-50 p-3 rounded-lg border border-slate-200 shadow-sm">
                                                             <div className="flex-1">
                                                                 <input 
                                                                    type="text" 
                                                                    placeholder="Item Kiri"
                                                                    value={pair.left}
                                                                    onChange={(e) => handleMatchingPairChange(q.id, i, 'left', e.target.value)}
                                                                    className="w-full text-sm p-2 bg-white border border-gray-200 rounded shadow-inner"
                                                                 />
                                                             </div>
                                                             <div className="text-slate-400 font-bold">➜</div>
                                                             <div className="flex-1">
                                                                 <input 
                                                                    type="text" 
                                                                    placeholder="Pasangan Kanan"
                                                                    value={pair.right}
                                                                    onChange={(e) => handleMatchingPairChange(q.id, i, 'right', e.target.value)}
                                                                    className="w-full text-sm p-2 bg-emerald-50 border border-emerald-100 rounded shadow-inner text-emerald-800"
                                                                 />
                                                             </div>
                                                             <button onClick={() => handleDeleteMatchingPair(q.id, i)} className="text-slate-300 hover:text-rose-500 p-1.5 transition-colors">
                                                                 <TrashIcon className="w-5 h-5"/>
                                                             </button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <button 
                                                    onClick={() => handleAddMatchingPair(q.id)}
                                                    className="mt-3 text-xs text-primary font-semibold hover:text-primary-focus flex items-center gap-1 hover:underline"
                                                >
                                                    <PlusCircleIcon className="w-4 h-4" />
                                                    Tambah Pasangan
                                                </button>
                                             </div>
                                        )}

                                        {(q.questionType === 'FILL_IN_THE_BLANK' || q.questionType === 'ESSAY') && (
                                             <div className="mt-4 ml-8">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                                                    {q.questionType === 'ESSAY' ? 'Panduan Jawaban' : 'Kunci Jawaban'}
                                                </label>
                                                {q.questionType === 'ESSAY' ? (
                                                     <textarea 
                                                        value={q.correctAnswer || ''}
                                                        onChange={(e) => handleCorrectAnswerChange(q.id, e.target.value)}
                                                        className="mt-1 block w-full px-3 py-3 bg-white border border-gray-200 rounded-lg shadow-inner focus:ring-2 focus:ring-primary text-sm break-words min-h-[80px]"
                                                        placeholder="Tuliskan poin-poin jawaban yang diharapkan..."
                                                    />
                                                ) : (
                                                    <div className="border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary transition-all">
                                                        <EditorToolbar onInsert={(pre, suf, blk) => insertToTextarea(`key-${q.id}-0`, pre, suf, blk)} />
                                                        <input 
                                                            // Fixed ref callback to return void
                                                            ref={(el) => { textareaRefs.current[`key-${q.id}-0`] = el as any; }}
                                                            type="text"
                                                            value={q.correctAnswer || ''}
                                                            onChange={(e) => handleCorrectAnswerChange(q.id, e.target.value)}
                                                            className="block w-full px-3 py-3 bg-white border-0 text-sm break-words outline-none"
                                                            placeholder="Masukkan jawaban yang benar..."
                                                        />
                                                    </div>
                                                )}
                                                <EditorPreview text={q.correctAnswer || ''} />
                                             </div>
                                        )}
                                    </div>
                            </div>
                            
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
                        );
                    })}
                </div>
                 <div className="mt-10 text-center">
                    <button onClick={() => openTypeSelectionModal(null)} className="flex items-center gap-2 text-sm text-primary font-bold hover:text-primary-focus mx-auto transition-all bg-primary/5 px-6 py-3 rounded-full hover:bg-primary/10 hover:shadow-md active:scale-95">
                        <PlusCircleIcon className="w-5 h-5" />
                        Tambah Soal Manual
                    </button>
                </div>
             </div>

            {/* --- CONFIGURATION --- */}
            <div className="pt-10">
                 <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                    <h2 className="text-xl font-bold text-neutral">
                        {isEditing ? '2. Konfigurasi Ujian' : '4. Konfigurasi Ujian'}
                    </h2>
                     <p className="text-sm text-base-content mt-1">Lengkapi detail mata pelajaran dan aturan pengerjaan.</p>
                </div>
                <div className="mt-6 bg-white p-8 border border-gray-200 rounded-2xl shadow-sm space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                        <div className="md:col-span-2 pb-2 border-b border-gray-100 mb-2">
                             <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Informasi Umum</h4>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Mata Pelajaran</label>
                            <select 
                                name="subject" 
                                value={config.subject || 'Lainnya'} 
                                onChange={handleConfigChange} 
                                className="w-full p-3 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm font-medium"
                            >
                                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Kelas</label>
                             <select 
                                name="classLevel" 
                                value={config.classLevel || 'Lainnya'} 
                                onChange={handleConfigChange} 
                                className="w-full p-3 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm font-medium"
                            >
                                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Jenis Evaluasi</label>
                             <select 
                                name="examType" 
                                value={config.examType || 'Lainnya'} 
                                onChange={handleConfigChange} 
                                className="w-full p-3 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm font-medium"
                            >
                                {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                         <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Instruksi Pengerjaan</label>
                            <textarea
                                name="description"
                                value={config.description || ''}
                                onChange={handleConfigChange}
                                className="w-full p-4 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm min-h-[100px] shadow-inner"
                                placeholder="Contoh: Baca doa sebelum mengerjakan, dilarang menoleh ke belakang..."
                            />
                        </div>
                    </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 pt-8 border-t border-gray-100">
                         <div className="md:col-span-2 pb-2 border-b border-gray-100 mb-2">
                             <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Waktu & Keamanan</h4>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Tanggal Pelaksanaan</label>
                            <input type="date" name="date" value={new Date(config.date).toISOString().split('T')[0]} onChange={handleConfigChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Jam Mulai</label>
                            <input type="time" name="startTime" value={config.startTime} onChange={handleConfigChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Durasi Pengerjaan (Menit)</label>
                            <input type="number" name="timeLimit" value={config.timeLimit} onChange={handleConfigChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Interval Auto-Save (Detik)</label>
                            <input type="number" name="autoSaveInterval" value={config.autoSaveInterval} onChange={handleConfigChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm" />
                        </div>
                        
                        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                           <label className="flex items-center p-3 rounded-xl border border-gray-100 hover:bg-slate-50 transition-colors cursor-pointer group shadow-sm"><input type="checkbox" name="shuffleQuestions" checked={config.shuffleQuestions} onChange={handleConfigChange} className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">Acak Soal</span></label>
                           <label className="flex items-center p-3 rounded-xl border border-gray-100 hover:bg-slate-50 transition-colors cursor-pointer group shadow-sm"><input type="checkbox" name="shuffleAnswers" checked={config.shuffleAnswers} onChange={handleConfigChange} className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">Acak Opsi</span></label>
                           <label className="flex items-center p-3 rounded-xl border border-gray-100 hover:bg-slate-50 transition-colors cursor-pointer group shadow-sm"><input type="checkbox" name="allowRetakes" checked={config.allowRetakes} onChange={handleConfigChange} className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">Izinkan Kerjakan Ulang</span></label>
                           <label className="flex items-center p-3 rounded-xl border border-gray-100 hover:bg-slate-50 transition-colors cursor-pointer group shadow-sm"><input type="checkbox" name="detectBehavior" checked={config.detectBehavior} onChange={handleConfigChange} className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">Deteksi Pindah Tab</span></label>
                           {config.detectBehavior && (
                            <label className="flex items-center ml-6 p-2 bg-rose-50 rounded-lg text-rose-700 cursor-pointer group"><input type="checkbox" name="continueWithPermission" checked={config.continueWithPermission} onChange={handleConfigChange} className="h-4 w-4 rounded text-rose-600 focus:ring-rose-500 border-rose-300" /><span className="ml-2 text-xs font-bold uppercase tracking-tight">Kunci Akses Jika Melanggar</span></label>
                           )}
                        </div>

                        <div className="md:col-span-2 space-y-4 pt-6 mt-2 border-t border-gray-100">
                             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pengaturan Hasil & Stream</h4>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <label className="flex items-center p-3 rounded-xl border border-gray-100 hover:bg-slate-50 transition-colors cursor-pointer group shadow-sm">
                                    <input type="checkbox" name="showResultToStudent" checked={config.showResultToStudent} onChange={handleConfigChange} className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300" />
                                    <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">Umumkan Nilai Otomatis</span>
                                </label>
                                <label className="flex items-center p-3 rounded-xl border border-gray-100 hover:bg-slate-50 transition-colors cursor-pointer group shadow-sm">
                                    <input type="checkbox" name="showCorrectAnswer" checked={config.showCorrectAnswer} onChange={handleConfigChange} className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300" />
                                    <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">Tampilkan Kunci (Review)</span>
                                </label>
                                <label className="flex items-center p-3 rounded-xl border border-gray-100 hover:bg-slate-50 transition-colors cursor-pointer group shadow-sm">
                                    <input type="checkbox" name="enablePublicStream" checked={config.enablePublicStream} onChange={handleConfigChange} className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300" />
                                    <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">Pantauan Orang Tua (Live)</span>
                                </label>
                                <label className="flex items-center p-3 rounded-xl border border-gray-100 hover:bg-slate-50 transition-colors cursor-pointer group shadow-sm">
                                    <input type="checkbox" name="trackLocation" checked={config.trackLocation} onChange={handleConfigChange} className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300" />
                                    <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">Lacak Lokasi (GPS)</span>
                                </label>
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- ACTIONS --- */}
            <div className="text-center pt-10 pb-20">
                {isEditing ? (
                    <div className="flex justify-center items-center gap-4">
                        <button onClick={onCancel} className="bg-white text-gray-700 border border-gray-300 font-bold py-4 px-10 rounded-2xl hover:bg-gray-50 transition-all shadow-sm active:scale-95">
                            Batal
                        </button>
                        {onSaveDraft && (
                            <button onClick={onSaveDraft} className="bg-slate-100 text-slate-700 border border-slate-200 font-bold py-4 px-10 rounded-2xl hover:bg-slate-200 transition-all shadow-sm flex items-center gap-2 active:scale-95">
                                <PencilIcon className="w-5 h-5" />
                                Perbarui Draf
                            </button>
                        )}
                        <button onClick={onSave} className="bg-primary text-white font-bold py-4 px-14 rounded-2xl hover:bg-primary-focus transition-all shadow-xl shadow-indigo-100 transform hover:-translate-y-1 active:scale-95">
                            Simpan Ujian
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col sm:flex-row justify-center gap-4 items-center">
                            {onSaveDraft && (
                                <button onClick={onSaveDraft} className="w-full sm:w-auto bg-white text-slate-600 border-2 border-slate-100 font-bold py-4 px-10 rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2 active:scale-95">
                                    <PencilIcon className="w-5 h-5" />
                                    Simpan Draf
                                </button>
                            )}
                            <button onClick={onSave} className="w-full sm:w-auto bg-emerald-600 text-white font-bold py-4 px-14 rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 transform hover:-translate-y-1 flex items-center justify-center gap-3 active:scale-95">
                                <CheckCircleIcon className="w-6 h-6" />
                                Publikasikan Sekarang
                            </button>
                        </div>
                        {generatedCode && (
                            <div ref={generatedCodeSectionRef} className="mt-12 p-1 rounded-3xl animate-fade-in text-center max-w-md mx-auto bg-gradient-to-tr from-emerald-400 to-teal-500 shadow-2xl">
                                <div className="bg-white p-8 rounded-[1.4rem] text-center">
                                    <h4 className="font-black text-2xl text-slate-800 mb-2">Ujian Aktif!</h4>
                                    <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">Berikan kode unik ini kepada siswa Anda agar mereka dapat mulai mengerjakan.</p>
                                    <div className="flex flex-col gap-4">
                                        <div className="bg-slate-50 p-6 rounded-2xl border-2 border-emerald-50 shadow-inner group transition-all hover:bg-emerald-50/30">
                                            <span className="text-4xl font-black tracking-[0.3em] text-emerald-600 font-mono block">{generatedCode}</span>
                                        </div>
                                        <button onClick={() => {
                                            navigator.clipboard.writeText(generatedCode);
                                            alert("Kode berhasil disalin!");
                                        }} className="text-xs font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-700 transition-colors py-2">
                                            Salin Kode Akses
                                        </button>
                                    </div>
                                    <button onClick={onReset} className="mt-8 w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all shadow-lg active:scale-95">
                                        Selesai & Tutup
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {renderTypeSelectionModal()}
        </div>
    );
};
