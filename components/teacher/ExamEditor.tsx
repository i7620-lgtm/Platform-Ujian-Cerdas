
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

// --- UNIVERSAL EDITOR TOOLBAR (MATH + RICH TEXT + ALIGNMENT + TABLES) ---
const EditorToolbar: React.FC<{ 
    onInsert: (prefix: string, suffix?: string, isBlock?: boolean) => void,
    className?: string 
}> = ({ onInsert, className = "" }) => {
    const [activeTab, setActiveTab] = useState<'TEXT' | 'STR' | 'SYM' | 'GREEK' | 'SCI'>('TEXT');
    const [showCustomMatrix, setShowCustomMatrix] = useState(false);
    const [matrixRows, setMatrixRows] = useState(2);
    const [matrixCols, setMatrixCols] = useState(2);
    const [matrixType, setMatrixType] = useState<'pmatrix' | 'vmatrix'>('pmatrix');

    const [showTableModal, setShowTableModal] = useState(false);
    const [tableRows, setTableRows] = useState(3);
    const [tableCols, setTableCols] = useState(3);

    const generateCustomMatrix = () => {
        let latex = `\\begin{${matrixType}}`;
        for (let r = 1; r <= matrixRows; r++) {
            let row = [];
            for (let c = 1; c <= matrixCols; c++) {
                row.push(`a_{${r},${c}}`);
            }
            latex += row.join(" & ") + (r < matrixRows ? " \\\\" : "");
        }
        latex += `\\end{${matrixType}}`;
        onInsert('$' + latex + '$');
        setShowCustomMatrix(false);
    };

    const generateMarkdownTable = () => {
        let md = "\n";
        // Header
        for (let c = 1; c <= tableCols; c++) md += `| Judul ${c} `;
        md += "|\n";
        // Separator
        for (let c = 1; c <= tableCols; c++) md += "|---------";
        md += "|\n";
        // Rows
        for (let r = 1; r < tableRows; r++) {
            for (let c = 1; c <= tableCols; c++) md += `| Baris ${r} `;
            md += "|\n";
        }
        onInsert(md, '', true);
        setShowTableModal(false);
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
        { label: 'Left', action: () => onInsert(':::left\n', '\n:::'), title: 'Rata Kiri' },
        { label: 'Center', action: () => onInsert(':::center\n', '\n:::'), title: 'Rata Tengah' },
        { label: 'Right', action: () => onInsert(':::right\n', '\n:::'), title: 'Rata Kanan' },
        { label: 'Justify', action: () => onInsert(':::justify\n', '\n:::'), title: 'Rata Kiri Kanan' },
        { label: 'Table', action: () => setShowTableModal(true), title: 'Buat Tabel' },
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

            {/* Matrix Popover */}
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

            {/* Table Popover */}
            {showTableModal && (
                <div className="absolute top-full left-0 z-50 mt-1 bg-white border border-emerald-100 shadow-xl rounded-xl p-4 w-64 animate-fade-in ring-4 ring-emerald-500/5">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-black uppercase tracking-tight text-emerald-600">
                            Konfigurasi Tabel
                        </h4>
                        <button type="button" onClick={() => setShowTableModal(false)}><XMarkIcon className="w-4 h-4 text-gray-400"/></button>
                    </div>
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-slate-500 block mb-1">BARIS</label>
                                <input type="number" min="2" max="20" value={tableRows} onChange={(e) => setTableRows(parseInt(e.target.value))} className="w-full p-2 bg-slate-50 border rounded-lg text-xs" />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-slate-500 block mb-1">KOLOM</label>
                                <input type="number" min="1" max="10" value={tableCols} onChange={(e) => setTableCols(parseInt(e.target.value))} className="w-full p-2 bg-slate-50 border rounded-lg text-xs" />
                            </div>
                        </div>
                        <button type="button" onClick={generateMarkdownTable} className="w-full bg-emerald-600 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-emerald-700">
                            Buat Tabel {tableRows}x{tableCols}
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
                            className={`min-w-[38px] h-[32px] flex items-center justify-center text-[10px] font-black bg-white border border-gray-200 rounded hover:bg-slate-100 transition-all shadow-sm active:scale-90 px-1`}
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
                // 1. Process Alignment Blocks
                let processedText = text
                    .replace(/:::left([\s\S]+?):::/g, '<div class="text-left">$1</div>')
                    .replace(/:::center([\s\S]+?):::/g, '<div class="text-center">$1</div>')
                    .replace(/:::right([\s\S]+?):::/g, '<div class="text-right">$1</div>')
                    .replace(/:::justify([\s\S]+?):::/g, '<div class="text-justify">$1</div>');

                // 2. Process Formatting
                processedText = processedText
                    .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*([\s\S]+?)\*/g, '<em>$1</em>')
                    .replace(/~~([\s\S]+?)~~/g, '<del>$1</del>')
                    .replace(/<u>([\s\S]+?)<\/u>/g, '<u>$1</u>');

                // 3. Process Tables & Lists
                const lines = processedText.split('\n');
                let finalHtmlChunks = [];
                let inUl = false;
                let inOl = false;
                let inTable = false;

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    
                    if (line.startsWith('|') && line.endsWith('|')) {
                        if (inUl) { finalHtmlChunks.push('</ul>'); inUl = false; }
                        if (inOl) { finalHtmlChunks.push('</ol>'); inOl = false; }
                        if (!inTable) {
                            finalHtmlChunks.push('<div class="overflow-x-auto my-2"><table class="min-w-full border-collapse border border-slate-200 text-xs">');
                            inTable = true;
                        }
                        if (line.match(/^\|[\s\-\|:]+\|$/)) continue;
                        const cells = line.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
                        const isHeader = i === 0 || (lines[i+1] && lines[i+1].trim().match(/^\|[\s\-\|:]+\|$/));
                        finalHtmlChunks.push(`<tr class="${isHeader ? 'bg-slate-50 font-bold' : ''}">`);
                        cells.forEach(cell => finalHtmlChunks.push(`<td class="border border-slate-200 px-2 py-1">${cell.trim()}</td>`));
                        finalHtmlChunks.push('</tr>');
                        continue;
                    } else if (inTable) {
                        finalHtmlChunks.push('</table></div>');
                        inTable = false;
                    }

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
                        if (inUl) { finalHtmlChunks.push('</ul>'); inUl = false; }
                        if (inOl) { finalHtmlChunks.push('</ol>'); inOl = false; }
                        finalHtmlChunks.push(line === '' ? '<div class="h-2"></div>' : line + '<br/>');
                    }
                }
                if (inUl) finalHtmlChunks.push('</ul>');
                if (inOl) finalHtmlChunks.push('</ol>');
                if (inTable) finalHtmlChunks.push('</table></div>');

                let html = finalHtmlChunks.join('');

                // 4. KaTeX handling
                if (html.includes('$') && (window as any).katex) {
                    html = html.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
                        return (window as any).katex.renderToString(math, { displayMode: true, throwOnError: false });
                    }).replace(/\$([\s\S]+?)\$/g, (_, math) => {
                        return (window as any).katex.renderToString(math, { displayMode: false, throwOnError: false });
                    });
                }
                
                previewRef.current.innerHTML = html;
            } catch (e) {
                previewRef.current.textContent = "Format tidak valid...";
            }
        }
    }, [text]);

    if (!text.trim()) return null;

    return (
        <div className="mt-3 p-4 bg-slate-50 border border-dashed border-gray-200 rounded-xl text-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <EyeIcon className="w-3.5 h-3.5"/> Pratinjau Tampilan:
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
    const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

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
            setConfig(prev => ({ ...prev, [name]: checked }));
        } else {
            setConfig(prev => ({ ...prev, [name]: name === 'timeLimit' || name === 'autoSaveInterval' ? parseInt(value) : value }));
        }
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
                if (q.questionType === 'MULTIPLE_CHOICE' && q.correctAnswer === oldOption) newCorrectAnswer = text;
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
        const selection = text.substring(start, end);
        let newText = "";
        if (isBlock) {
            const lines = selection.split('\n');
            newText = text.substring(0, start) + lines.map(line => prefix + line).join('\n') + text.substring(end);
        } else {
            newText = text.substring(0, start) + prefix + selection + suffix + text.substring(end);
        }
        const parts = textareaId.split('-');
        const qId = parts.slice(1, -1).join('-');
        const type = parts[0];
        if (type === 'q') handleQuestionTextChange(qId, newText);
        else if (type === 'opt') handleOptionTextChange(qId, parseInt(parts[parts.length - 1]), newText);
        else if (type === 'key') handleCorrectAnswerChange(qId, newText);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, qId: string, optIndex?: number) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const dataUrl = await compressImage(ev.target?.result as string, 0.7);
            setQuestions(prev => prev.map(q => {
                if (q.id === qId) {
                    if (optIndex !== undefined) {
                        const currentOptImages = q.optionImages ? [...q.optionImages] : (q.options ? new Array(q.options.length).fill(null) : []);
                        currentOptImages[optIndex] = dataUrl;
                        return { ...q, optionImages: currentOptImages };
                    }
                    return { ...q, imageUrl: dataUrl };
                }
                return q;
            }));
        };
        reader.readAsDataURL(file);
    };

    const handleDeleteImage = (qId: string, optIndex?: number) => {
        setQuestions(prev => prev.map(q => {
            if (q.id === qId) {
                if (optIndex !== undefined && q.optionImages) {
                    const newOptImages = [...q.optionImages];
                    newOptImages[optIndex] = null;
                    return { ...q, optionImages: newOptImages };
                }
                return { ...q, imageUrl: undefined };
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
                if (isChecked) { if (!currentAnswers.includes(option)) currentAnswers.push(option); }
                else { currentAnswers = currentAnswers.filter(a => a !== option); }
                return { ...q, correctAnswer: currentAnswers.join(',') };
            }
            return q;
        }));
    };
    
    const handleDeleteQuestion = (id: string) => {
        setQuestions(prev => prev.filter(q => q.id !== id));
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

    const openTypeSelectionModal = (index: number | null = null) => {
        setInsertIndex(index);
        setIsTypeSelectionModalOpen(true);
    };

    const handleSelectQuestionType = (type: QuestionType) => {
        const newQuestion = { id: `q-${Date.now()}-${Math.random()}`, questionText: '', questionType: type };
        if (insertIndex === null) setQuestions(prev => [...prev, newQuestion]);
        else {
            const newQuestions = [...questions];
            newQuestions.splice(insertIndex + 1, 0, newQuestion);
            setQuestions(newQuestions);
        }
        setIsTypeSelectionModalOpen(false);
    };

    const handleAddOption = (questionId: string) => {
        setQuestions(prev => prev.map(q => {
            if (q.id === questionId && q.options) {
                const nextChar = String.fromCharCode(65 + q.options.length); 
                return { ...q, options: [...q.options, `Opsi ${nextChar}`] };
            }
            return q;
        }));
    };

    const handleDeleteOption = (questionId: string, indexToRemove: number) => {
        setQuestions(prev => prev.map(q => {
            if (q.id === questionId && q.options && q.options.length > 1) { 
                const newOptions = q.options.filter((_, i) => i !== indexToRemove);
                return { ...q, options: newOptions };
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
             if (q.id === qId && q.matchingPairs) return { ...q, matchingPairs: [...q.matchingPairs, { left: '', right: '' }] };
             return q;
        }));
    };
    
    const handleDeleteMatchingPair = (qId: string, idx: number) => {
         setQuestions(prev => prev.map(q => {
             if (q.id === qId && q.matchingPairs && q.matchingPairs.length > 1) {
                 return { ...q, matchingPairs: q.matchingPairs.filter((_, i) => i !== idx) };
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
            if (q.id === qId && q.trueFalseRows) return { ...q, trueFalseRows: [...q.trueFalseRows, { text: `Pernyataan ${q.trueFalseRows.length + 1}`, answer: true }] };
            return q;
        }));
    };

    const handleDeleteTrueFalseRow = (qId: string, idx: number) => {
        setQuestions(prev => prev.map(q => {
            if (q.id === qId && q.trueFalseRows && q.trueFalseRows.length > 1) return { ...q, trueFalseRows: q.trueFalseRows.filter((_, i) => i !== idx) };
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
                            <button key={t.type} onClick={() => handleSelectQuestionType(t.type)} className="flex items-start gap-4 p-4 border rounded-lg hover:border-primary hover:bg-primary/5 hover:shadow-md transition-all text-left group">
                                <div className="bg-gray-100 p-2.5 rounded-full group-hover:bg-primary group-hover:text-white transition-colors"><t.icon className="w-6 h-6" /></div>
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
                    <h2 className="text-xl font-bold text-neutral">Tinjau dan Edit Soal</h2>
                    <p className="text-sm text-base-content mt-1">Periksa kembali soal yang telah dibuat. Gunakan bilah alat di atas textarea untuk format teks, penjajaran, tabel, dan rumus matematika.</p>
                </div>
                <div className="space-y-4">
                    {questions.length > 0 && (
                        <div className="relative py-2 group/insert">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                            <div className="relative flex justify-center"><button onClick={() => openTypeSelectionModal(-1)} className="bg-gray-50 text-gray-400 group-hover/insert:text-primary px-4 py-1 text-xs font-semibold rounded-full border border-gray-200 shadow-sm transition-all opacity-0 group-hover/insert:opacity-100 flex items-center gap-1"><PlusCircleIcon className="w-4 h-4" />Tambah Di Awal</button></div>
                        </div>
                    )}
                    {questions.map((q, index) => {
                        const qNum = questions.slice(0, index).filter(i => i.questionType !== 'INFO').length + 1;
                        const qTid = `q-${q.id}-0`;
                        return (
                        <React.Fragment key={q.id}>
                            <div id={q.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                <div className="p-4">
                                    <div className="flex justify-center mb-4">
                                        <select value={q.questionType} onChange={(e) => handleTypeChange(q.id, e.target.value as QuestionType)} className="bg-gray-100 border border-gray-200 text-gray-700 py-1 px-4 rounded-full text-[10px] font-bold uppercase cursor-pointer outline-none">
                                            <option value="MULTIPLE_CHOICE">Pilihan Ganda</option>
                                            <option value="COMPLEX_MULTIPLE_CHOICE">Pilihan Ganda Kompleks</option>
                                            <option value="TRUE_FALSE">Benar / Salah</option>
                                            <option value="MATCHING">Menjodohkan</option>
                                            <option value="ESSAY">Esai / Uraian</option>
                                            <option value="FILL_IN_THE_BLANK">Isian Singkat</option>
                                            <option value="INFO">Keterangan / Info</option>
                                        </select>
                                    </div>
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-start gap-2 mb-2">
                                                {q.questionType !== 'INFO' && <span className="text-primary font-bold mt-2">{qNum}.</span>}
                                                <div className="flex-1">
                                                    <div className="border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-slate-800 transition-all">
                                                        <EditorToolbar onInsert={(pre, suf, blk) => insertToTextarea(qTid, pre, suf, blk)} />
                                                        <textarea ref={(el) => { textareaRefs.current[qTid] = el; }} value={q.questionText} onChange={(e) => handleQuestionTextChange(q.id, e.target.value)} className="w-full p-3 bg-white border-0 focus:ring-0 text-sm min-h-[120px] outline-none" placeholder="Tulis soal di sini..." />
                                                    </div>
                                                    <EditorPreview text={q.questionText} />
                                                    {q.imageUrl && <div className="relative inline-block mt-4 group/img"><img src={q.imageUrl} alt="Soal" className="max-w-full h-auto border rounded-md max-h-[300px]" /><button onClick={() => handleDeleteImage(q.id)} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover/img:opacity-100"><XMarkIcon className="w-4 h-4" /></button></div>}
                                                    <div className="flex justify-end mt-2"><label className="cursor-pointer flex items-center gap-1 text-xs text-primary font-semibold"><PhotoIcon className="w-4 h-4" /><span>{q.imageUrl ? "Ganti Gambar" : "Tambah Gambar"}</span><input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, q.id)} /></label></div>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteQuestion(q.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-full"><TrashIcon className="w-5 h-5" /></button>
                                    </div>
                                    {/* Question Type Specific Editors */}
                                    {q.questionType === 'MULTIPLE_CHOICE' && q.options && (
                                        <div className="mt-4 ml-8 space-y-3">
                                            {q.options.map((option, i) => {
                                                const optTid = `opt-${q.id}-${i}`;
                                                return (
                                                    <div key={i} className={`relative rounded-lg border p-3 flex items-start gap-3 ${q.correctAnswer === option ? 'bg-emerald-50 border-emerald-300' : 'bg-gray-50 border-gray-200'}`}>
                                                        <input type="radio" name={`correct-${q.id}`} checked={q.correctAnswer === option} onChange={() => handleCorrectAnswerChange(q.id, option)} className="mt-1" />
                                                        <div className="flex-1">
                                                            <div className="border border-gray-200 rounded-md overflow-hidden bg-white mb-2">
                                                                <EditorToolbar onInsert={(pre, suf, blk) => insertToTextarea(optTid, pre, suf, blk)} className="scale-90 origin-top-left border-0 bg-slate-50" />
                                                                <input ref={(el) => { textareaRefs.current[optTid] = el as any; }} type="text" value={option} onChange={(e) => handleOptionTextChange(q.id, i, e.target.value)} className="w-full px-2 py-1.5 text-sm border-0 focus:ring-0 outline-none" placeholder={`Opsi ${String.fromCharCode(65+i)}`} />
                                                            </div>
                                                            <EditorPreview text={option} />
                                                        </div>
                                                        <button onClick={() => handleDeleteOption(q.id, i)} className="text-gray-400 hover:text-red-600"><TrashIcon className="w-4 h-4"/></button>
                                                    </div>
                                                )
                                            })}
                                            <button onClick={() => handleAddOption(q.id)} className="text-xs text-primary font-bold">+ Tambah Opsi</button>
                                        </div>
                                    )}
                                    {/* Complex Multiple Choice, True False, Matching, etc. handled similarly but abbreviated for brevity */}
                                    {q.questionType === 'COMPLEX_MULTIPLE_CHOICE' && q.options && (
                                        <div className="mt-4 ml-8 space-y-3">
                                            {q.options.map((option, i) => (
                                                <div key={i} className="flex items-center gap-3">
                                                    <input type="checkbox" checked={q.correctAnswer?.split(',').includes(option)} onChange={(e) => handleComplexCorrectAnswerChange(q.id, option, e.target.checked)} />
                                                    <input type="text" value={option} onChange={(e) => handleOptionTextChange(q.id, i, e.target.value)} className="flex-1 p-2 border rounded text-sm" />
                                                    <button onClick={() => handleDeleteOption(q.id, i)}><TrashIcon className="w-4 h-4"/></button>
                                                </div>
                                            ))}
                                            <button onClick={() => handleAddOption(q.id)} className="text-xs text-primary font-bold">+ Tambah Opsi</button>
                                        </div>
                                    )}
                                    {q.questionType === 'TRUE_FALSE' && q.trueFalseRows && (
                                        <div className="mt-4 ml-8 space-y-2">
                                            {q.trueFalseRows.map((row, i) => (
                                                <div key={i} className="flex gap-2 items-center">
                                                    <input type="text" value={row.text} onChange={(e) => handleTrueFalseRowTextChange(q.id, i, e.target.value)} className="flex-1 p-2 border rounded text-sm" />
                                                    <button onClick={() => handleTrueFalseRowAnswerChange(q.id, i, true)} className={`px-2 py-1 text-[10px] rounded font-bold ${row.answer ? 'bg-emerald-500 text-white' : 'bg-gray-100'}`}>B</button>
                                                    <button onClick={() => handleTrueFalseRowAnswerChange(q.id, i, false)} className={`px-2 py-1 text-[10px] rounded font-bold ${!row.answer ? 'bg-rose-500 text-white' : 'bg-gray-100'}`}>S</button>
                                                    <button onClick={() => handleDeleteTrueFalseRow(q.id, i)}><TrashIcon className="w-4 h-4"/></button>
                                                </div>
                                            ))}
                                            <button onClick={() => handleAddTrueFalseRow(q.id)} className="text-xs text-primary font-bold">+ Tambah Baris</button>
                                        </div>
                                    )}
                                    {q.questionType === 'MATCHING' && q.matchingPairs && (
                                        <div className="mt-4 ml-8 space-y-2">
                                            {q.matchingPairs.map((pair, i) => (
                                                <div key={i} className="flex gap-2 items-center">
                                                    <input type="text" value={pair.left} onChange={(e) => handleMatchingPairChange(q.id, i, 'left', e.target.value)} className="flex-1 p-2 border rounded text-sm" placeholder="Kiri"/>
                                                    <span>➜</span>
                                                    <input type="text" value={pair.right} onChange={(e) => handleMatchingPairChange(q.id, i, 'right', e.target.value)} className="flex-1 p-2 border rounded text-sm" placeholder="Kanan"/>
                                                    <button onClick={() => handleDeleteMatchingPair(q.id, i)}><TrashIcon className="w-4 h-4"/></button>
                                                </div>
                                            ))}
                                            <button onClick={() => handleAddMatchingPair(q.id)} className="text-xs text-primary font-bold">+ Tambah Pasangan</button>
                                        </div>
                                    )}
                                    {(q.questionType === 'FILL_IN_THE_BLANK' || q.questionType === 'ESSAY') && (
                                        <div className="mt-4 ml-8">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Kunci / Panduan Jawaban</label>
                                            <textarea value={q.correctAnswer || ''} onChange={(e) => handleCorrectAnswerChange(q.id, e.target.value)} className="w-full p-2 border rounded mt-1 text-sm h-20 outline-none" placeholder="Tuliskan kunci jawaban..." />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </React.Fragment>
                        )
                    })}
                </div>
                <div className="text-center mt-6"><button onClick={() => openTypeSelectionModal(null)} className="bg-primary/5 text-primary px-6 py-3 rounded-full font-bold hover:bg-primary/10 transition-all">+ Tambah Soal Manual</button></div>
            </div>

            <div className="pt-10 bg-white p-8 rounded-2xl border border-gray-200">
                <h2 className="text-xl font-bold text-neutral mb-6">Konfigurasi Ujian</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Mata Pelajaran</label>
                        <select name="subject" value={config.subject || 'Lainnya'} onChange={handleConfigChange} className="w-full p-3 bg-slate-50 border rounded-xl text-sm">
                            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Kelas</label>
                        <select name="classLevel" value={config.classLevel || 'Lainnya'} onChange={handleConfigChange} className="w-full p-3 bg-slate-50 border rounded-xl text-sm">
                            {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Tanggal</label>
                            <input type="date" name="date" value={config.date} onChange={handleConfigChange} className="w-full p-3 border rounded-xl text-sm" />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Jam Mulai</label>
                            <input type="time" name="startTime" value={config.startTime} onChange={handleConfigChange} className="w-full p-3 border rounded-xl text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Durasi (Menit)</label>
                        <input type="number" name="timeLimit" value={config.timeLimit} onChange={handleConfigChange} className="w-full p-3 border rounded-xl text-sm" />
                    </div>
                </div>
            </div>

            <div className="flex justify-center gap-4 pt-10 pb-20">
                <button onClick={onCancel} className="px-10 py-4 bg-white border border-gray-300 rounded-2xl font-bold">Batal</button>
                {onSaveDraft && <button onClick={onSaveDraft} className="px-10 py-4 bg-slate-100 rounded-2xl font-bold flex items-center gap-2"><PencilIcon className="w-5 h-5"/>Simpan Draf</button>}
                <button onClick={onSave} className="px-14 py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-indigo-100">Publikasikan Ujian</button>
            </div>
            
            {generatedCode && (
                <div ref={generatedCodeSectionRef} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
                    <div className="bg-white p-10 rounded-3xl text-center max-w-sm w-full shadow-2xl animate-fade-in">
                        <h4 className="text-2xl font-black mb-2">Ujian Aktif!</h4>
                        <div className="bg-emerald-50 p-6 rounded-2xl border-2 border-emerald-100 my-6">
                            <span className="text-4xl font-black tracking-widest text-emerald-600 font-mono">{generatedCode}</span>
                        </div>
                        <button onClick={onReset} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold">Selesai</button>
                    </div>
                </div>
            )}
            {renderTypeSelectionModal()}
        </div>
    );
};
