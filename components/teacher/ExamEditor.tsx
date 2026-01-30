 
import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Question, QuestionType, ExamConfig } from '../../types';
import { 
    TrashIcon, XMarkIcon, PlusCircleIcon, PhotoIcon, 
    FileTextIcon, ListBulletIcon, CheckCircleIcon, PencilIcon, FileWordIcon, CheckIcon, ArrowLeftIcon,
    TableCellsIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon, AlignJustifyIcon,
    StrikethroughIcon, SuperscriptIcon, SubscriptIcon, EraserIcon, FunctionIcon,
    ArrowPathIcon // Used as chevron/search icon usually, referencing existing icons
} from '../Icons';
import { compressImage } from './examUtils';

// --- TIPE DATA & KONSTANTA ---
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

// Daftar Mata Pelajaran Diurutkan A-Z
const SUBJECTS = [
    "Agama Buddha",
    "Agama Hindu",
    "Agama Islam",
    "Agama Katolik",
    "Agama Khonghucu",
    "Agama Kristen",
    "Bahasa Indonesia",
    "Bahasa Inggris",
    "IPA",
    "IPAS",
    "IPS",
    "Kepercayaan",
    "KKA",
    "Lainnya",
    "Matematika",
    "Matematika Lanjut",
    "Muatan Lokal",
    "Pendidikan Pancasila",
    "PJOK",
    "Seni Budaya",
    "TIK"
];

const CLASSES = ["Kelas 1", "Kelas 2", "Kelas 3", "Kelas 4", "Kelas 5", "Kelas 6", "Kelas 7", "Kelas 8", "Kelas 9", "Kelas 10", "Kelas 11", "Kelas 12", "Mahasiswa", "Umum"];

// Daftar Jenis Evaluasi Diurutkan A-Z
const EXAM_TYPES = [
    "Kuis",
    "Lainnya",
    "Latihan",
    "Olimpiade",
    "PAS",
    "PTS",
    "TKA",
    "Ulangan Harian"
];

// --- HELPER FUNCTIONS ---
const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
};

// --- GENERIC SELECTION MODAL ---
const SelectionModal: React.FC<{
    isOpen: boolean;
    title: string;
    options: string[];
    selectedValue: string;
    onClose: () => void;
    onSelect: (value: string) => void;
    searchPlaceholder?: string;
}> = ({ isOpen, title, options, selectedValue, onClose, onSelect, searchPlaceholder = "Cari..." }) => {
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen) setSearchTerm('');
    }, [isOpen]);

    const filteredOptions = useMemo(() => {
        return options.filter(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [searchTerm, options]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[85vh]">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">{title}</h3>
                        <p className="text-xs text-slate-500">Silakan pilih salah satu opsi dari daftar.</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <XMarkIcon className="w-5 h-5"/>
                    </button>
                </div>
                
                <div className="p-4 bg-slate-50/50">
                    <input 
                        type="text" 
                        placeholder={searchPlaceholder} 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-3 pl-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all shadow-sm"
                        autoFocus
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {filteredOptions.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {filteredOptions.map((opt) => (
                                <button
                                    key={opt}
                                    onClick={() => { onSelect(opt); onClose(); }}
                                    className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border flex items-center justify-between group
                                        ${selectedValue === opt 
                                            ? 'bg-primary text-white border-primary shadow-md shadow-primary/20' 
                                            : 'bg-white text-slate-600 border-gray-100 hover:border-primary/30 hover:bg-slate-50 hover:shadow-sm'
                                        }`}
                                >
                                    <span>{opt}</span>
                                    {selectedValue === opt && <CheckIcon className="w-4 h-4 text-white" />}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-slate-400">
                            <p className="text-sm">Opsi tidak ditemukan.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- TABLE CONFIG MODAL ---
const TableConfigModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onInsert: (rows: number, cols: number) => void;
}> = ({ isOpen, onClose, onInsert }) => {
    const [rows, setRows] = useState(3);
    const [cols, setCols] = useState(3);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-xs border border-gray-100">
                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <TableCellsIcon className="w-4 h-4"/> Sisipkan Tabel
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">Jumlah Baris</label>
                        <input 
                            type="number" 
                            min="1" 
                            max="20" 
                            value={rows} 
                            onChange={e => setRows(Math.max(1, parseInt(e.target.value) || 1))} 
                            className="w-full p-2 border rounded text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-200 outline-none" 
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">Jumlah Kolom</label>
                        <input 
                            type="number" 
                            min="1" 
                            max="10" 
                            value={cols} 
                            onChange={e => setCols(Math.max(1, parseInt(e.target.value) || 1))} 
                            className="w-full p-2 border rounded text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-200 outline-none" 
                        />
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                        <button onClick={onClose} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded">Batal</button>
                        <button onClick={() => { onInsert(rows, cols); onClose(); }} className="px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow">Sisipkan</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- VISUAL MATH BUILDER PRO ---
const VisualMathModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onInsert: (latex: string) => void; 
}> = ({ isOpen, onClose, onInsert }) => {
    const [tab, setTab] = useState<'BASIC' | 'CALCULUS' | 'MATRIX' | 'SYMBOLS'>('BASIC');
    const [val1, setVal1] = useState('');
    const [val2, setVal2] = useState('');
    const [val3, setVal3] = useState(''); 
    const [rows, setRows] = useState(2);
    const [cols, setCols] = useState(2);
    const [matData, setMatData] = useState<string[][]>([]);

    useEffect(() => {
        if (isOpen) {
            const safeRows = Math.max(1, Math.min(10, Math.floor(rows || 1)));
            const safeCols = Math.max(1, Math.min(10, Math.floor(cols || 1)));
            setMatData(Array.from({ length: safeRows }, () => Array(safeCols).fill('')));
            setVal1(''); setVal2(''); setVal3('');
        }
    }, [isOpen, rows, cols]);

    const updateMatrix = (r: number, c: number, v: string) => {
        const d = matData.map(row => [...row]); 
        if(d[r]) { d[r][c] = v; setMatData(d); }
    };

    const insertStructure = (type: 'FRAC' | 'ROOT' | 'LIMIT' | 'INT' | 'SUM' | 'MATRIX' | 'SYMBOL', symbolVal?: string) => {
        let latex = '';
        switch(type) {
            case 'FRAC': 
                const wholePart = val3 ? `${val3}` : '';
                const fractionPart = `\\frac{${val1 || 'x'}}{${val2 || 'y'}}`;
                latex = wholePart + fractionPart;
                break;
            case 'ROOT': latex = val1 ? `\\sqrt[${val1}]{${val2 || 'x'}}` : `\\sqrt{${val2 || 'x'}}`; break;
            case 'LIMIT': latex = `\\lim_{${val1 || 'x'} \\to ${val2 || '\\infty'}} ${val3 || 'f(x)'}`; break;
            case 'INT': latex = `\\int_{${val1 || 'a'}}^{${val2 || 'b'}} ${val3 || 'x'} \\,dx`; break;
            case 'SUM': latex = `\\sum_{${val1 || 'i=1'}}^{${val2 || 'n'}} ${val3 || 'x_i'}`; break;
            case 'MATRIX': 
                const contents = matData.map(row => row.map(c => c || '0').join(' & ')).join(' \\\\ ');
                latex = `\\begin{pmatrix} ${contents} \\end{pmatrix}`; 
                break;
            case 'SYMBOL': latex = symbolVal || ''; break;
        }
        onInsert(latex);
        if (type !== 'SYMBOL') onClose(); 
    };

    if (!isOpen) return null;

    const symbols = [
        { l: '×', v: '\\times' }, { l: '÷', v: '\\div' }, { l: '≠', v: '\\neq' }, { l: '±', v: '\\pm' },
        { l: '≤', v: '\\le' }, { l: '≥', v: '\\ge' }, { l: '≈', v: '\\approx' }, { l: '∞', v: '\\infty' },
        { l: 'α', v: '\\alpha' }, { l: 'β', v: '\\beta' }, { l: 'θ', v: '\\theta' }, { l: 'π', v: '\\pi' },
        { l: 'Δ', v: '\\Delta' }, { l: 'Ω', v: '\\Omega' }, { l: '∑', v: '\\Sigma' }, { l: '∫', v: '\\int' },
        { l: '∠', v: '\\angle' }, { l: '°', v: '^{\\circ}' }, { l: '∈', v: '\\in' }, { l: '→', v: '\\rightarrow' }
    ];

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
                <div className="bg-gray-50 p-3 border-b flex justify-between items-center">
                    <h3 className="text-sm font-bold text-gray-700">Rumus Matematika</h3>
                    <button onClick={onClose}><XMarkIcon className="w-5 h-5 text-gray-400 hover:text-gray-600"/></button>
                </div>
                
                <div className="flex border-b overflow-x-auto">
                    {['BASIC', 'CALCULUS', 'MATRIX', 'SYMBOLS'].map((t: any) => (
                        <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 text-[10px] font-bold tracking-wider ${tab === t ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-gray-500 hover:bg-gray-50'}`}>
                            {t === 'BASIC' ? 'ALJABAR' : t === 'CALCULUS' ? 'KALKULUS' : t === 'MATRIX' ? 'MATRIKS' : 'SIMBOL'}
                        </button>
                    ))}
                </div>

                <div className="p-5 overflow-y-auto">
                    {tab === 'BASIC' && (
                        <div className="space-y-6">
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-3 text-center">Pecahan & Pecahan Campuran</p>
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="flex flex-col items-center">
                                            <input placeholder="Int" className="w-12 h-10 text-center text-sm p-1 border rounded focus:ring-1 focus:ring-indigo-300 outline-none bg-white shadow-sm" value={val3} onChange={e => setVal3(e.target.value)} title="Bilangan Bulat (Opsional)" />
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <input placeholder="Atas" className="w-16 text-center text-sm p-1 border rounded focus:ring-1 focus:ring-indigo-300 outline-none bg-white shadow-sm" value={val1} onChange={e => setVal1(e.target.value)} />
                                            <div className="w-20 h-0.5 bg-gray-800 rounded-full"></div>
                                            <input placeholder="Bawah" className="w-16 text-center text-sm p-1 border rounded focus:ring-1 focus:ring-indigo-300 outline-none bg-white shadow-sm" value={val2} onChange={e => setVal2(e.target.value)} />
                                        </div>
                                    </div>
                                    <button onClick={() => insertStructure('FRAC')} className="mt-2 w-full text-xs bg-indigo-600 text-white border border-indigo-600 font-bold py-1.5 rounded hover:bg-indigo-700 shadow-sm transition-colors">Sisipkan Pecahan</button>
                                </div>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 text-center">Akar</p>
                                <div className="flex items-end gap-1 justify-center">
                                    <input placeholder="n" className="w-8 text-center text-xs p-1 border rounded mb-4 focus:ring-1 focus:ring-indigo-300 outline-none" value={val1} onChange={e => setVal1(e.target.value)} />
                                    <span className="text-3xl text-gray-400 font-light">√</span>
                                    <input placeholder="Nilai" className="w-24 text-sm p-1 border rounded mb-1 focus:ring-1 focus:ring-indigo-300 outline-none" value={val2} onChange={e => setVal2(e.target.value)} />
                                    <button onClick={() => insertStructure('ROOT')} className="mb-1 text-xs bg-white border font-bold px-3 py-1.5 rounded hover:bg-gray-50 shadow-sm">OK</button>
                                </div>
                            </div>
                        </div>
                    )}
                    {tab === 'CALCULUS' && (
                        <div className="space-y-4">
                            <div className="flex gap-2 justify-center border-b pb-2">
                                <button onClick={() => {setVal1(''); setVal2(''); setVal3('');}} className="text-xs font-bold px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">Reset Input</button>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="border p-3 rounded bg-white">
                                    <p className="text-[10px] font-bold mb-2">Limit</p>
                                    <div className="flex items-center gap-1 text-sm">
                                        lim 
                                        <div className="flex flex-col gap-1">
                                            <input placeholder="x" className="w-8 p-0.5 border rounded text-center text-xs" value={val1} onChange={e => setVal1(e.target.value)} />
                                            ➜
                                            <input placeholder="∞" className="w-8 p-0.5 border rounded text-center text-xs" value={val2} onChange={e => setVal2(e.target.value)} />
                                        </div>
                                        <input placeholder="Fungsi f(x)" className="w-24 p-1 border rounded ml-1" value={val3} onChange={e => setVal3(e.target.value)} />
                                        <button onClick={() => insertStructure('LIMIT')} className="ml-auto text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold">Add</button>
                                    </div>
                                </div>
                                <div className="border p-3 rounded bg-white">
                                    <p className="text-[10px] font-bold mb-2">Integral / Sigma</p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex flex-col items-center">
                                            <input placeholder="b" className="w-10 text-center text-xs border rounded mb-1" value={val2} onChange={e => setVal2(e.target.value)} />
                                            <span className="text-2xl text-gray-400">∫/∑</span>
                                            <input placeholder="a" className="w-10 text-center text-xs border rounded mt-1" value={val1} onChange={e => setVal1(e.target.value)} />
                                        </div>
                                        <input placeholder="Fungsi" className="flex-1 p-1 border rounded" value={val3} onChange={e => setVal3(e.target.value)} />
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        <button onClick={() => insertStructure('INT')} className="flex-1 text-xs bg-indigo-50 text-indigo-600 py-1 rounded font-bold border border-indigo-100">Integral</button>
                                        <button onClick={() => insertStructure('SUM')} className="flex-1 text-xs bg-emerald-50 text-emerald-600 py-1 rounded font-bold border border-emerald-100">Sigma</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {tab === 'MATRIX' && (
                        <div>
                            <div className="flex gap-4 justify-center mb-4">
                                <label className="text-[10px] font-bold">Baris <input type="number" min="1" max="5" value={rows} onChange={e => setRows(Math.max(1, parseInt(e.target.value) || 1))} className="w-10 ml-1 border rounded p-1" /></label>
                                <label className="text-[10px] font-bold">Kolom <input type="number" min="1" max="5" value={cols} onChange={e => setCols(Math.max(1, parseInt(e.target.value) || 1))} className="w-10 ml-1 border rounded p-1" /></label>
                            </div>
                            <div className="grid gap-1 justify-center bg-gray-100 p-2 rounded" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                                {matData.map((rArr, r) => rArr.map((val, c) => (
                                    <input key={`${r}-${c}`} value={val} onChange={e => updateMatrix(r, c, e.target.value)} className="w-10 h-8 text-center border rounded text-xs focus:bg-indigo-50 outline-none" placeholder="0" />
                                )))}
                            </div>
                            <button onClick={() => insertStructure('MATRIX')} className="w-full mt-4 bg-indigo-600 text-white py-2 rounded text-xs font-bold shadow hover:bg-indigo-700">Sisipkan Matriks</button>
                        </div>
                    )}
                    {tab === 'SYMBOLS' && (
                        <div className="grid grid-cols-5 gap-2">
                            {symbols.map((s, i) => (
                                <button key={i} onClick={() => insertStructure('SYMBOL', s.v)} className="aspect-square bg-gray-50 border rounded hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors text-sm font-serif">
                                    {s.l}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- WYSIWYG EDITOR PRO COMPONENT ---
const WysiwygEditor: React.FC<{
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    minHeight?: string;
}> = ({ value, onChange, placeholder = "Ketik di sini...", minHeight = "120px" }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const savedRange = useRef<Range | null>(null); 
    
    const [activeTab, setActiveTab] = useState<'FORMAT' | 'PARAGRAPH' | 'INSERT' | 'MATH'>('FORMAT');
    const [activeCmds, setActiveCmds] = useState<string[]>([]);
    const [isInsideTable, setIsInsideTable] = useState(false);
    const [showMath, setShowMath] = useState(false);
    const [showTable, setShowTable] = useState(false);

    useEffect(() => {
        if (editorRef.current) {
            if (value !== editorRef.current.innerHTML) {
                if (!editorRef.current.innerText.trim() && !value) {
                     editorRef.current.innerHTML = "";
                } else if (document.activeElement !== editorRef.current) {
                     editorRef.current.innerHTML = value;
                }
            }
        }
    }, [value]);

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
            saveSelection(); 
            checkActiveFormats();
        }
    };

    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
            savedRange.current = sel.getRangeAt(0).cloneRange();
        }
    };

    const restoreSelection = () => {
        const sel = window.getSelection();
        if (sel && savedRange.current) {
            sel.removeAllRanges();
            sel.addRange(savedRange.current);
        } else if (editorRef.current) {
            editorRef.current.focus();
            const range = document.createRange();
            range.selectNodeContents(editorRef.current);
            range.collapse(false);
            sel?.removeAllRanges();
            sel?.addRange(range);
        }
    };

    const checkActiveFormats = () => {
        saveSelection(); 
        const cmds = ['bold', 'italic', 'underline', 'strikethrough', 'subscript', 'superscript', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull', 'insertUnorderedList', 'insertOrderedList'];
        const active = cmds.filter(cmd => document.queryCommandState(cmd));
        setActiveCmds(active);

        const selection = window.getSelection();
        let inTable = false;
        if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
            let node = selection.anchorNode;
            while (node && node !== editorRef.current) {
                if (node.nodeName === 'TABLE' || node.nodeName === 'TD' || node.nodeName === 'TH') {
                    inTable = true;
                    break;
                }
                node = node.parentNode;
            }
        }
        setIsInsideTable(inTable);
    };

    const runCmd = (cmd: string, val?: string) => {
        restoreSelection(); 
        if(editorRef.current) editorRef.current.focus();
        execCmd(cmd, val);
        saveSelection(); 
        checkActiveFormats();
    };

    const insertTable = (rows: number, cols: number) => {
        let html = '<table class="border-collapse border border-slate-300 my-2 w-full text-sm"><thead><tr>';
        for(let c=0; c<cols; c++) html += `<th class="border border-slate-300 p-2 bg-slate-50">H${c+1}</th>`;
        html += '</tr></thead><tbody>';
        for(let r=0; r<rows; r++) {
            html += '<tr>';
            for(let c=0; c<cols; c++) html += `<td class="border border-slate-300 p-2">Data</td>`;
            html += '</tr>';
        }
        html += '</tbody></table><p><br/></p>';
        runCmd('insertHTML', html);
        handleInput();
    };

    const deleteCurrentTable = () => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            let node = selection.anchorNode;
            while (node && node !== editorRef.current) {
                if (node.nodeName === 'TABLE') {
                    node.parentNode?.removeChild(node);
                    handleInput();
                    setIsInsideTable(false);
                    return;
                }
                node = node.parentNode;
            }
        }
    };

    const insertMath = (latex: string) => {
        if ((window as any).katex) {
            const html = (window as any).katex.renderToString(latex, { throwOnError: false });
            const wrapper = `&nbsp;<span class="math-visual inline-block px-0.5 rounded select-none cursor-pointer hover:bg-indigo-50 align-middle" contenteditable="false" data-latex="${latex.replace(/"/g, '&quot;')}">${html}</span><span style="font-size: 100%; font-family: inherit; font-weight: normal; font-style: normal; color: inherit;">&nbsp;</span>`;
            runCmd('insertHTML', wrapper); 
            handleInput();
        }
    };

    const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const rawDataUrl = ev.target?.result as string;
                try {
                    const dataUrl = await compressImage(rawDataUrl, 0.7);
                    const imgTag = `<img src="${dataUrl}" alt="Inserted Image" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;" />&nbsp;`;
                    runCmd('insertHTML', imgTag);
                    handleInput(); 
                } catch (error) {
                    console.error("Image compression failed", error);
                }
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const editorStyle = `
        .wysiwyg-content table { width: 100%; border-collapse: collapse; margin: 0.5rem 0; }
        .wysiwyg-content th, .wysiwyg-content td { border: 1px solid #cbd5e1; padding: 0.5rem; min-width: 30px; }
        .wysiwyg-content th { background-color: #f8fafc; font-weight: bold; text-align: left; }
        .wysiwyg-content:empty:before { content: attr(data-placeholder); color: #94a3b8; font-style: italic; }
        .wysiwyg-content ul { list-style-type: disc; padding-left: 1.5rem; }
        .wysiwyg-content ol { list-style-type: decimal; padding-left: 1.5rem; }
        .wysiwyg-content blockquote { border-left: 3px solid #cbd5e1; padding-left: 1rem; color: #64748b; font-style: italic; }
    `;

    const Btn: React.FC<{ cmd?: string; label?: string; icon?: React.FC<any>; active?: boolean; onClick?: () => void }> = ({ cmd, label, icon: Icon, active, onClick }) => (
        <button 
            type="button" 
            onMouseDown={(e) => { e.preventDefault(); onClick ? onClick() : runCmd(cmd!); }} 
            className={`min-w-[28px] h-7 px-1.5 rounded flex items-center justify-center transition-all ${active ? 'bg-indigo-100 text-indigo-700 shadow-inner' : 'hover:bg-gray-100 text-gray-600'}`}
            title={label}
        >
            {Icon ? <Icon className="w-4 h-4"/> : <span className="text-xs font-bold font-serif">{label}</span>}
        </button>
    );

    return (
        <div className="relative group rounded-xl border border-gray-200 bg-white transition-all focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300">
            <style>{editorStyle}</style>
            <div className="border-b border-gray-100 bg-gray-50/50 rounded-t-xl select-none">
                <div className="flex px-2 pt-1 gap-1 border-b border-gray-200/50 justify-between items-end">
                    <div className="flex gap-1">
                        {['FORMAT', 'PARAGRAPH', 'INSERT', 'MATH'].map((t: any) => (
                            <button key={t} onClick={() => setActiveTab(t)} className={`px-3 py-1.5 text-[10px] font-bold tracking-wider rounded-t-lg transition-colors ${activeTab === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}>
                                {t === 'MATH' ? 'RUMUS' : t === 'FORMAT' ? 'FORMAT' : t === 'PARAGRAPH' ? 'PARAGRAF' : 'SISIPKAN'}
                            </button>
                        ))}
                    </div>
                    {isInsideTable && (
                        <div className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[9px] font-bold rounded-t uppercase tracking-widest border-t border-x border-indigo-100">Table Active</div>
                    )}
                </div>
                <div className="p-1.5 flex flex-wrap gap-1 items-center bg-white rounded-b-none min-h-[36px]">
                    {activeTab === 'FORMAT' && (
                        <>
                            <Btn cmd="bold" label="B" active={activeCmds.includes('bold')} />
                            <Btn cmd="italic" label="I" active={activeCmds.includes('italic')} />
                            <Btn cmd="underline" label="U" active={activeCmds.includes('underline')} />
                            <Btn cmd="strikethrough" icon={StrikethroughIcon} active={activeCmds.includes('strikethrough')} />
                            <div className="w-px h-4 bg-gray-200 mx-1"></div>
                            <Btn cmd="superscript" icon={SuperscriptIcon} active={activeCmds.includes('superscript')} />
                            <Btn cmd="subscript" icon={SubscriptIcon} active={activeCmds.includes('subscript')} />
                            <div className="w-px h-4 bg-gray-200 mx-1"></div>
                            <Btn cmd="removeFormat" icon={EraserIcon} label="Clear" />
                        </>
                    )}
                    {activeTab === 'PARAGRAPH' && (
                        <>
                            <Btn cmd="justifyLeft" icon={AlignLeftIcon} active={activeCmds.includes('justifyLeft')} />
                            <Btn cmd="justifyCenter" icon={AlignCenterIcon} active={activeCmds.includes('justifyCenter')} />
                            <Btn cmd="justifyRight" icon={AlignRightIcon} active={activeCmds.includes('justifyRight')} />
                            <Btn cmd="justifyFull" icon={AlignJustifyIcon} active={activeCmds.includes('justifyFull')} />
                            <div className="w-px h-4 bg-gray-200 mx-1"></div>
                            <Btn cmd="insertUnorderedList" icon={ListBulletIcon} active={activeCmds.includes('insertUnorderedList')} />
                            <Btn cmd="insertOrderedList" label="1." active={activeCmds.includes('insertOrderedList')} />
                            <div className="w-px h-4 bg-gray-200 mx-1"></div>
                            <Btn cmd="indent" label="Indent" icon={() => <span className="text-[10px] font-mono">→]</span>} />
                            <Btn cmd="outdent" label="Outdent" icon={() => <span className="text-[10px] font-mono">[←</span>} />
                        </>
                    )}
                    {activeTab === 'INSERT' && (
                        <>
                            <button onMouseDown={(e) => {e.preventDefault(); fileInputRef.current?.click();}} className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 text-gray-700 rounded text-xs font-bold hover:bg-gray-100 transition-colors"><PhotoIcon className="w-4 h-4"/> Gambar</button>
                            <button onMouseDown={(e) => {e.preventDefault(); setShowTable(true);}} className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-bold hover:bg-indigo-100 transition-colors"><TableCellsIcon className="w-4 h-4"/> Tabel N x N</button>
                            <button onMouseDown={(e) => {e.preventDefault(); runCmd('insertHorizontalRule');}} className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 text-gray-600 rounded text-xs font-bold hover:bg-gray-100 transition-colors">—— Garis Pemisah</button>
                        </>
                    )}
                    {activeTab === 'MATH' && (
                        <div className="flex items-center gap-2 w-full">
                            <button onMouseDown={(e) => {e.preventDefault(); setShowMath(true);}} className="flex-1 flex items-center justify-center gap-2 px-4 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded shadow text-xs font-bold hover:from-indigo-600 hover:to-purple-700 transition-all"><FunctionIcon className="w-4 h-4" /> Buka Math Builder Pro</button>
                            <span className="text-[10px] text-gray-400 italic">Untuk Limit, Integral, Matriks, dll.</span>
                        </div>
                    )}
                    {isInsideTable && (
                        <div className="ml-auto pl-2 border-l border-gray-200 flex items-center animate-fade-in">
                            <button onMouseDown={(e) => { e.preventDefault(); deleteCurrentTable(); }} className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded text-[10px] font-bold hover:bg-red-100 border border-red-100 transition-colors" title="Hapus Tabel ini"><TrashIcon className="w-3 h-3"/> Hapus Tabel</button>
                        </div>
                    )}
                </div>
            </div>
            <div ref={editorRef} className="wysiwyg-content p-4 outline-none text-sm text-slate-800 leading-relaxed overflow-auto" style={{ minHeight }} contentEditable={true} onInput={handleInput} onKeyUp={checkActiveFormats} onMouseUp={checkActiveFormats} onBlur={saveSelection} onClick={checkActiveFormats} data-placeholder={placeholder} spellCheck={false} />
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageFileChange} />
            <TableConfigModal isOpen={showTable} onClose={() => setShowTable(false)} onInsert={insertTable} />
            <VisualMathModal isOpen={showMath} onClose={() => setShowMath(false)} onInsert={insertMath} />
        </div>
    );
};

export const ExamEditor: React.FC<ExamEditorProps> = ({ 
    questions, setQuestions, config, setConfig, isEditing, onSave, onSaveDraft, onCancel, generatedCode, onReset 
}) => {
    const [isTypeSelectionModalOpen, setIsTypeSelectionModalOpen] = useState(false);
    const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false); 
    const [isClassModalOpen, setIsClassModalOpen] = useState(false); 
    const [isExamTypeModalOpen, setIsExamTypeModalOpen] = useState(false); 
    const [insertIndex, setInsertIndex] = useState<number | null>(null);
    const questionsSectionRef = useRef<HTMLDivElement>(null);
    const generatedCodeSectionRef = useRef<HTMLDivElement>(null);
    
    // Scroll Effect
    useEffect(() => {
        if (!isEditing && !generatedCode) {
            const timer = setTimeout(() => {
                if (questionsSectionRef.current) questionsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

    const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setConfig(prev => {
                const newConfig = { ...prev, [name]: checked };
                if (name === 'detectBehavior' && !checked) newConfig.continueWithPermission = false;
                return newConfig;
            });
        } else {
            setConfig(prev => ({ ...prev, [name]: name === 'timeLimit' || name === 'autoSaveInterval' ? parseInt(value) : value }));
        }
    };

    const handleSubjectSelect = (subject: string) => setConfig(prev => ({ ...prev, subject }));
    const handleQuestionTextChange = (id: string, text: string) => setQuestions(prev => prev.map(q => q.id === id ? { ...q, questionText: text } : q));
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

    const handleCorrectAnswerChange = (questionId: string, answer: string) => setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, correctAnswer: answer } : q));
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
        if (window.confirm("Apakah Anda yakin ingin menghapus soal ini?")) {
            setQuestions(prev => prev.filter(q => q.id !== id));
        }
    };
    
    const createNewQuestion = (type: QuestionType): Question => {
        const base = { id: `q-${Date.now()}-${Math.random()}`, questionText: '', questionType: type, imageUrl: undefined, optionImages: undefined };
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

    const openTypeSelectionModal = (index: number | null = null) => { setInsertIndex(index); setIsTypeSelectionModalOpen(true); };
    const handleSelectQuestionType = (type: QuestionType) => {
        const newQuestion = createNewQuestion(type);
        if (insertIndex === null) {
            setQuestions(prev => [...prev, newQuestion]);
             setTimeout(() => { document.getElementById(newQuestion.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
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
             if (q.id === qId && q.matchingPairs) return { ...q, matchingPairs: [...q.matchingPairs, { left: '', right: '' }] };
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
                            <button key={t.type} onClick={() => handleSelectQuestionType(t.type)} className="flex items-start gap-4 p-4 border rounded-lg hover:border-primary hover:bg-primary/5 hover:shadow-md transition-all text-left group">
                                <div className="bg-gray-100 p-2.5 rounded-full group-hover:bg-primary group-hover:text-white transition-colors"><t.icon className="w-6 h-6" /></div>
                                <div><p className="font-bold text-gray-800 group-hover:text-primary">{t.label}</p><p className="text-xs text-gray-500 mt-1">{t.desc}</p></div>
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
                 <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                    <h2 className="text-xl font-bold text-neutral">{isEditing ? '1. Editor Soal' : '3. Editor Soal'}</h2>
                    <p className="text-sm text-gray-500 mt-1">Gunakan editor di bawah untuk membuat soal. Klik tombol tabel atau rumus untuk menyisipkan objek visual.</p>
                </div>
                <div className="space-y-6">
                    {questions.length > 0 && (
                        <div className="relative py-2 group/insert">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-gray-200 group-hover/insert:border-primary/30 transition-colors"></div></div>
                            <div className="relative flex justify-center"><button onClick={() => openTypeSelectionModal(-1)} className="bg-white text-gray-400 group-hover/insert:text-primary group-hover/insert:bg-primary/5 px-4 py-1 text-xs font-semibold rounded-full border border-gray-200 group-hover/insert:border-primary/30 shadow-sm transition-all transform hover:scale-105 flex items-center gap-1 opacity-0 group-hover/insert:opacity-100 focus:opacity-100"><PlusCircleIcon className="w-4 h-4" /> Sisipkan Soal Di Awal</button></div>
                        </div>
                    )}
                    {questions.map((q, index) => {
                        const questionNumber = questions.slice(0, index).filter(i => i.questionType !== 'INFO').length + 1;
                        return (
                        <React.Fragment key={q.id}>
                            <div id={q.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 group transition-all duration-300 hover:shadow-md relative overflow-visible">
                                    <div className="absolute top-4 right-4 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-20">
                                         <div className="relative inline-block bg-white rounded-lg shadow-sm">
                                            <select value={q.questionType} onChange={(e) => handleTypeChange(q.id, e.target.value as QuestionType)} className="appearance-none bg-gray-50 border border-gray-200 text-gray-600 py-1.5 pl-3 pr-7 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all">
                                                <option value="MULTIPLE_CHOICE">Pilihan Ganda</option><option value="COMPLEX_MULTIPLE_CHOICE">PG Kompleks</option><option value="TRUE_FALSE">Benar / Salah</option><option value="MATCHING">Menjodohkan</option><option value="ESSAY">Esai / Uraian</option><option value="FILL_IN_THE_BLANK">Isian Singkat</option><option value="INFO">Info / Teks</option>
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400"><svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(q.id); }} 
                                            className="p-1.5 bg-white text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 border border-gray-200 transition-colors shadow-sm" 
                                            title="Hapus Soal"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="p-6 md:p-8">
                                        <div className="flex items-start gap-4 md:gap-6">
                                            <div className="flex-shrink-0 mt-1 hidden md:block select-none">{q.questionType === 'INFO' ? <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">i</div> : <span className="text-slate-300 font-bold text-xl">{String(questionNumber).padStart(2, '0')}</span>}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="md:hidden mb-2">{q.questionType !== 'INFO' && <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded uppercase">{questionNumber}. Soal</span>}</div>
                                                <WysiwygEditor value={q.questionText} onChange={(val) => handleQuestionTextChange(q.id, val)} placeholder={q.questionType === 'INFO' ? "Tulis informasi atau teks bacaan di sini..." : "Tulis pertanyaan di sini..."} minHeight="80px" />
                                                {q.questionType === 'MULTIPLE_CHOICE' && q.options && (
                                                    <div className="mt-6 space-y-3">
                                                        {q.options.map((option, i) => (
                                                            <div key={i} className={`group/opt relative flex items-start p-1 rounded-xl transition-all ${q.correctAnswer === option ? 'bg-emerald-50/50' : ''}`}>
                                                                <div className="flex items-center h-full pt-4 pl-2 pr-4 cursor-pointer" onClick={() => handleCorrectAnswerChange(q.id, option)}><div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${q.correctAnswer === option ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300 bg-white group-hover/opt:border-emerald-300'}`}>{q.correctAnswer === option && <div className="w-2 h-2 bg-white rounded-full" />}</div></div>
                                                                <div className="flex-1"><WysiwygEditor value={option} onChange={(val) => handleOptionTextChange(q.id, i, val)} placeholder={`Opsi ${String.fromCharCode(65 + i)}`} minHeight="40px" /></div>
                                                                <div className="flex flex-col gap-1 opacity-0 group-hover/opt:opacity-100 transition-opacity px-2 pt-2">
                                                                    <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteOption(q.id, i); }} className="text-gray-300 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <button onClick={() => handleAddOption(q.id)} className="ml-12 mt-2 text-xs font-bold text-primary hover:text-primary-focus flex items-center gap-1 opacity-60 hover:opacity-100"><PlusCircleIcon className="w-4 h-4" /> Tambah Opsi</button>
                                                    </div>
                                                )}
                                                {q.questionType === 'COMPLEX_MULTIPLE_CHOICE' && q.options && (
                                                    <div className="mt-6 space-y-3">
                                                        <p className="text-xs text-gray-400 italic mb-2 ml-1">Pilih semua jawaban benar:</p>
                                                        {q.options.map((option, i) => {
                                                             const isChecked = q.correctAnswer ? q.correctAnswer.split(',').includes(option) : false;
                                                             return (
                                                                <div key={i} className={`group/opt relative flex items-start p-1 rounded-xl transition-all ${isChecked ? 'bg-emerald-50/50' : ''}`}>
                                                                    <div className="flex items-center h-full pt-4 pl-2 pr-4 cursor-pointer" onClick={() => handleComplexCorrectAnswerChange(q.id, option, !isChecked)}><div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isChecked ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300 bg-white'}`}>{isChecked && <CheckIcon className="w-3.5 h-3.5 text-white" />}</div></div>
                                                                    <div className="flex-1"><WysiwygEditor value={option} onChange={(val) => handleOptionTextChange(q.id, i, val)} placeholder={`Opsi ${String.fromCharCode(65 + i)}`} minHeight="40px" /></div>
                                                                    <div className="flex flex-col gap-1 opacity-0 group-hover/opt:opacity-100 transition-opacity px-2 pt-2">
                                                                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteOption(q.id, i); }} className="text-gray-300 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>
                                                                    </div>
                                                                </div>
                                                        )})}
                                                        <button onClick={() => handleAddOption(q.id)} className="ml-12 mt-2 text-xs font-bold text-primary hover:text-primary-focus flex items-center gap-1 opacity-60 hover:opacity-100"><PlusCircleIcon className="w-4 h-4" /> Tambah Opsi</button>
                                                    </div>
                                                )}
                                                {q.questionType === 'TRUE_FALSE' && q.trueFalseRows && (
                                                    <div className="mt-6 ml-1 overflow-hidden rounded-xl border border-gray-100">
                                                        {q.trueFalseRows.map((row, i) => (
                                                            <div key={i} className="flex items-center gap-4 bg-white border-b border-gray-50 p-3 last:border-0 group/row">
                                                                <div className="flex-1"><input type="text" value={row.text} onChange={(e) => handleTrueFalseRowTextChange(q.id, i, e.target.value)} className="w-full text-sm border-0 focus:ring-0 p-2 bg-gray-50 rounded hover:bg-white transition-colors placeholder-gray-300" placeholder="Pernyataan..." /></div>
                                                                <div className="flex gap-2"><button onClick={() => handleTrueFalseRowAnswerChange(q.id, i, true)} className={`px-3 py-1 rounded text-xs font-bold border transition-all ${row.answer ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-300 border-gray-200'}`}>Benar</button><button onClick={() => handleTrueFalseRowAnswerChange(q.id, i, false)} className={`px-3 py-1 rounded text-xs font-bold border transition-all ${!row.answer ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-gray-300 border-gray-200'}`}>Salah</button></div>
                                                                <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteTrueFalseRow(q.id, i); }} className="text-gray-300 hover:text-red-500 opacity-0 group-hover/row:opacity-100 transition-opacity"><TrashIcon className="w-4 h-4"/></button>
                                                            </div>
                                                        ))}
                                                        <div className="p-2 bg-gray-50 text-center"><button onClick={() => handleAddTrueFalseRow(q.id)} className="text-xs font-bold text-primary hover:underline">+ Tambah Baris</button></div>
                                                    </div>
                                                )}
                                                {q.questionType === 'MATCHING' && q.matchingPairs && (
                                                    <div className="mt-6 space-y-2">
                                                        {q.matchingPairs.map((pair, i) => (
                                                            <div key={i} className="flex gap-4 items-center group/match">
                                                                <div className="flex-1 bg-white border border-gray-200 rounded-lg p-1 focus-within:ring-1 focus-within:ring-primary"><input type="text" value={pair.left} onChange={(e) => handleMatchingPairChange(q.id, i, 'left', e.target.value)} className="w-full text-sm border-0 focus:ring-0 p-2" placeholder="Item Kiri" /></div>
                                                                <div className="text-gray-300">➜</div>
                                                                <div className="flex-1 bg-emerald-50/50 border border-emerald-100 rounded-lg p-1 focus-within:ring-1 focus-within:ring-emerald-400"><input type="text" value={pair.right} onChange={(e) => handleMatchingPairChange(q.id, i, 'right', e.target.value)} className="w-full text-sm border-0 focus:ring-0 p-2 bg-transparent text-emerald-800" placeholder="Pasangan Kanan" /></div>
                                                                <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteMatchingPair(q.id, i); }} className="text-gray-300 hover:text-red-500 opacity-0 group-hover/match:opacity-100"><TrashIcon className="w-4 h-4"/></button>
                                                            </div>
                                                        ))}
                                                        <button onClick={() => handleAddMatchingPair(q.id)} className="mt-2 text-xs font-bold text-primary hover:underline">+ Tambah Pasangan</button>
                                                    </div>
                                                )}
                                                {(q.questionType === 'FILL_IN_THE_BLANK' || q.questionType === 'ESSAY') && (
                                                    <div className="mt-8 pt-4 border-t border-gray-50">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">{q.questionType === 'ESSAY' ? 'Rubrik / Poin Jawaban' : 'Kunci Jawaban Singkat'}</label>
                                                        <WysiwygEditor value={q.correctAnswer || ''} onChange={(val) => handleCorrectAnswerChange(q.id, val)} placeholder="Tulis kunci jawaban..." minHeight="60px" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                            </div>
                            <div className="relative py-2 group/insert">
                                <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-gray-200 group-hover/insert:border-primary/30 transition-colors"></div></div>
                                <div className="relative flex justify-center"><button onClick={() => openTypeSelectionModal(index)} className="bg-white text-gray-400 group-hover/insert:text-primary group-hover/insert:bg-primary/5 px-4 py-1 text-xs font-semibold rounded-full border border-gray-200 group-hover/insert:border-primary/30 shadow-sm transition-all transform hover:scale-105 flex items-center gap-1 opacity-0 group-hover/insert:opacity-100 focus:opacity-100"><PlusCircleIcon className="w-4 h-4" /> Sisipkan Soal</button></div>
                            </div>
                        </React.Fragment>
                        );
                    })}
                </div>
                 <div className="mt-12 mb-20 text-center"><button onClick={() => openTypeSelectionModal(null)} className="flex items-center gap-2 text-sm text-primary font-bold hover:text-primary-focus mx-auto transition-all bg-white border border-primary/20 px-8 py-4 rounded-2xl hover:bg-primary hover:text-white shadow-sm hover:shadow-lg active:scale-95 group"><PlusCircleIcon className="w-5 h-5 group-hover:text-white transition-colors" /> Tambah Soal Baru</button></div>
             </div>

            {/* --- CONFIGURATION --- */}
            <div className="pt-10">
                 <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm mb-6">
                    <h2 className="text-xl font-bold text-neutral">{isEditing ? '2. Konfigurasi' : '4. Konfigurasi'}</h2>
                     <p className="text-sm text-gray-500 mt-1">Pengaturan waktu dan akses.</p>
                </div>
                <div className="bg-white p-8 border border-gray-200 rounded-2xl shadow-sm space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                        <div className="md:col-span-2 pb-2 border-b border-gray-100 mb-2"><h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Informasi Umum</h4></div>
                        
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Mata Pelajaran</label>
                            <div onClick={() => setIsSubjectModalOpen(true)} className="w-full p-3 bg-slate-50 border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all text-sm font-medium flex items-center justify-between cursor-pointer hover:bg-white hover:border-gray-300">
                                <span className={config.subject ? 'text-slate-800' : 'text-gray-400'}>{config.subject || 'Pilih Mata Pelajaran...'}</span>
                                <ArrowPathIcon className="w-4 h-4 text-gray-400 rotate-90" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Kelas</label>
                            <div onClick={() => setIsClassModalOpen(true)} className="w-full p-3 bg-slate-50 border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all text-sm font-medium flex items-center justify-between cursor-pointer hover:bg-white hover:border-gray-300">
                                <span className={config.classLevel && config.classLevel !== 'Lainnya' ? 'text-slate-800' : 'text-gray-400'}>{config.classLevel === 'Lainnya' || !config.classLevel ? 'Pilih Kelas...' : config.classLevel}</span>
                                <ArrowPathIcon className="w-4 h-4 text-gray-400 rotate-90" />
                            </div>
                        </div>

                        {/* NEW: TARGET CLASSES FOR SHARDING */}
                        <div className="md:col-span-2 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                            <label className="block text-sm font-bold text-indigo-900 mb-1">Daftar Kelas Spesifik (Opsional)</label>
                            <p className="text-xs text-indigo-500 mb-2">Masukkan nama kelas yang dipisahkan dengan koma (contoh: X-IPA-1, X-IPA-2). Sistem akan menyiapkan database terpisah untuk setiap kelas ini secara otomatis.</p>
                            <input 
                                type="text" 
                                value={config.targetClasses?.join(', ') || ''} 
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const classes = val.split(',').map(c => c.trim()).filter(c => c !== '');
                                    setConfig(prev => ({ ...prev, targetClasses: classes }));
                                }}
                                className="w-full p-3 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm font-bold text-indigo-900 placeholder:text-indigo-300"
                                placeholder="X-IPA-1, X-IPA-2, X-IPS-1"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Jenis Evaluasi</label>
                            <div onClick={() => setIsExamTypeModalOpen(true)} className="w-full p-3 bg-slate-50 border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all text-sm font-medium flex items-center justify-between cursor-pointer hover:bg-white hover:border-gray-300">
                                <span className={config.examType && config.examType !== 'Lainnya' ? 'text-slate-800' : 'text-gray-400'}>{config.examType === 'Lainnya' || !config.examType ? 'Pilih Jenis...' : config.examType}</span>
                                <ArrowPathIcon className="w-4 h-4 text-gray-400 rotate-90" />
                            </div>
                        </div>

                         <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Instruksi Pengerjaan</label>
                            <textarea name="description" value={config.description || ''} onChange={handleConfigChange} className="w-full p-4 bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm min-h-[100px] shadow-inner" placeholder="Contoh: Baca doa sebelum mengerjakan, dilarang menoleh ke belakang..." />
                        </div>
                    </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 pt-8 border-t border-gray-100">
                         <div className="md:col-span-2 pb-2 border-b border-gray-100 mb-2"><h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Waktu & Keamanan</h4></div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-2">Tanggal Pelaksanaan</label><input type="date" name="date" value={new Date(config.date).toISOString().split('T')[0]} onChange={handleConfigChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm" /></div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-2">Jam Mulai</label><input type="time" name="startTime" value={config.startTime} onChange={handleConfigChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm" /></div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-2">Durasi Pengerjaan (Menit)</label><input type="number" name="timeLimit" value={config.timeLimit} onChange={handleConfigChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm" /></div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-2">Interval Auto-Save (Detik)</label><input type="number" name="autoSaveInterval" value={config.autoSaveInterval} onChange={handleConfigChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm" /></div>
                        
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
                                <label className="flex items-center p-3 rounded-xl border border-gray-100 hover:bg-slate-50 transition-colors cursor-pointer group shadow-sm"><input type="checkbox" name="showResultToStudent" checked={config.showResultToStudent} onChange={handleConfigChange} className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">Umumkan Nilai Otomatis</span></label>
                                <label className="flex items-center p-3 rounded-xl border border-gray-100 hover:bg-slate-50 transition-colors cursor-pointer group shadow-sm"><input type="checkbox" name="showCorrectAnswer" checked={config.showCorrectAnswer} onChange={handleConfigChange} className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">Tampilkan Kunci (Review)</span></label>
                                <label className="flex items-center p-3 rounded-xl border border-gray-100 hover:bg-slate-50 transition-colors cursor-pointer group shadow-sm"><input type="checkbox" name="enablePublicStream" checked={config.enablePublicStream} onChange={handleConfigChange} className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">Pantauan Orang Tua (Live)</span></label>
                                <label className="flex items-center p-3 rounded-xl border border-gray-100 hover:bg-slate-50 transition-colors cursor-pointer group shadow-sm"><input type="checkbox" name="trackLocation" checked={config.trackLocation} onChange={handleConfigChange} className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">Lacak Lokasi (GPS)</span></label>
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- ACTIONS --- */}
            <div className="text-center pt-10 pb-20">
                {isEditing ? (
                    <div className="flex justify-center items-center gap-4">
                        <button onClick={onCancel} className="bg-white text-gray-700 border border-gray-300 font-bold py-4 px-10 rounded-2xl hover:bg-gray-50 transition-all shadow-sm active:scale-95">Batal</button>
                        {onSaveDraft && <button onClick={onSaveDraft} className="bg-slate-100 text-slate-700 border border-slate-200 font-bold py-4 px-10 rounded-2xl hover:bg-slate-200 transition-all shadow-sm flex items-center gap-2 active:scale-95"><PencilIcon className="w-5 h-5" /> Perbarui Draf</button>}
                        <button onClick={onSave} className="bg-primary text-white font-bold py-4 px-14 rounded-2xl hover:bg-primary-focus transition-all shadow-xl shadow-indigo-100 transform hover:-translate-y-1 active:scale-95">Simpan Perubahan</button>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col sm:flex-row justify-center gap-4 items-center">
                            {onSaveDraft && <button onClick={onSaveDraft} className="w-full sm:w-auto bg-white text-slate-600 border-2 border-slate-100 font-bold py-4 px-10 rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2 active:scale-95"><PencilIcon className="w-5 h-5" /> Simpan Draf</button>}
                            <button onClick={onSave} className="w-full sm:w-auto bg-emerald-600 text-white font-bold py-4 px-14 rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 transform hover:-translate-y-1 flex items-center justify-center gap-3 active:scale-95"><CheckCircleIcon className="w-6 h-6" /> Publikasikan Sekarang</button>
                        </div>
                        {generatedCode && (
                            <div ref={generatedCodeSectionRef} className="mt-12 p-1 rounded-3xl animate-fade-in text-center max-w-md mx-auto bg-gradient-to-tr from-emerald-400 to-teal-500 shadow-2xl">
                                <div className="bg-white p-8 rounded-[1.4rem] text-center">
                                    <h4 className="font-black text-2xl text-slate-800 mb-2">Ujian Aktif!</h4>
                                    <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">Berikan kode unik ini kepada siswa Anda agar mereka dapat mulai mengerjakan.</p>
                                    <div className="flex flex-col gap-4">
                                        <div className="bg-slate-50 p-6 rounded-2xl border-2 border-emerald-50 shadow-inner group transition-all hover:bg-emerald-50/30"><span className="text-4xl font-black tracking-[0.3em] text-emerald-600 font-mono block">{generatedCode}</span></div>
                                        <button onClick={() => {navigator.clipboard.writeText(generatedCode); alert("Kode berhasil disalin!");}} className="text-xs font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-700 transition-colors py-2">Salin Kode Akses</button>
                                    </div>
                                    <button onClick={onReset} className="mt-8 w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all shadow-lg active:scale-95">Selesai & Tutup</button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {renderTypeSelectionModal()}
            <SelectionModal isOpen={isSubjectModalOpen} title="Pilih Mata Pelajaran" options={SUBJECTS} selectedValue={config.subject || ''} onClose={() => setIsSubjectModalOpen(false)} onSelect={handleSubjectSelect} searchPlaceholder="Cari mata pelajaran..." />
            <SelectionModal isOpen={isClassModalOpen} title="Pilih Kelas" options={CLASSES} selectedValue={config.classLevel || ''} onClose={() => setIsClassModalOpen(false)} onSelect={(val) => setConfig(prev => ({ ...prev, classLevel: val }))} searchPlaceholder="Cari kelas..." />
            <SelectionModal isOpen={isExamTypeModalOpen} title="Pilih Jenis Evaluasi" options={EXAM_TYPES} selectedValue={config.examType || ''} onClose={() => setIsExamTypeModalOpen(false)} onSelect={(val) => setConfig(prev => ({ ...prev, examType: val }))} searchPlaceholder="Cari jenis evaluasi..." />
        </div>
    );
};
