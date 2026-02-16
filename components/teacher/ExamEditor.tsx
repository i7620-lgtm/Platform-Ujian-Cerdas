
import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Question, QuestionType, ExamConfig } from '../../types';
import { 
    TrashIcon, XMarkIcon, PlusCircleIcon, PhotoIcon, 
    FileTextIcon, ListBulletIcon, CheckCircleIcon, PencilIcon, FileWordIcon, CheckIcon, ArrowLeftIcon,
    TableCellsIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon, AlignJustifyIcon,
    StrikethroughIcon, SuperscriptIcon, SubscriptIcon, EraserIcon, FunctionIcon,
    ArrowPathIcon, SignalIcon, WifiIcon, ExclamationTriangleIcon
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

const SUBJECTS = [
    "Agama Buddha", "Agama Hindu", "Agama Islam", "Agama Katolik", "Agama Khonghucu", "Agama Kristen",
    "Bahasa Indonesia", "Bahasa Inggris", "IPA", "IPAS", "IPS", "Kepercayaan", "KKA", "Lainnya",
    "Matematika", "Matematika Lanjut", "Muatan Lokal", "Pendidikan Pancasila", "PJOK", "Seni Budaya", "TIK"
];

const CLASSES = ["Kelas 1", "Kelas 2", "Kelas 3", "Kelas 4", "Kelas 5", "Kelas 6", "Kelas 7", "Kelas 8", "Kelas 9", "Kelas 10", "Kelas 11", "Kelas 12", "Mahasiswa", "Umum"];

const EXAM_TYPES = ["Kuis", "Lainnya", "Latihan", "Olimpiade", "PAS", "PTS", "TKA", "Ulangan Harian"];

// --- HELPER FUNCTIONS ---
const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
};

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
    useEffect(() => { if (isOpen) setSearchTerm(''); }, [isOpen]);
    const filteredOptions = useMemo(() => options.filter(s => s.toLowerCase().includes(searchTerm.toLowerCase())), [searchTerm, options]);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-slate-700 flex flex-col max-h-[85vh]">
                <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 sticky top-0 z-10">
                    <div><h3 className="font-bold text-lg text-slate-800 dark:text-white">{title}</h3><p className="text-xs text-slate-500 dark:text-slate-400">Silakan pilih salah satu opsi dari daftar.</p></div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><XMarkIcon className="w-5 h-5"/></button>
                </div>
                <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50"><input type="text" placeholder={searchPlaceholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 pl-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all shadow-sm" autoFocus /></div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {filteredOptions.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {filteredOptions.map((opt) => (
                                <button key={opt} onClick={() => { onSelect(opt); onClose(); }} className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border flex items-center justify-between group ${selectedValue === opt ? 'bg-primary text-white border-primary shadow-md shadow-primary/20' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-gray-100 dark:border-slate-700 hover:border-primary/30 hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-sm'}`}><span>{opt}</span>{selectedValue === opt && <CheckIcon className="w-4 h-4 text-white" />}</button>
                            ))}
                        </div>
                    ) : (<div className="text-center py-10 text-slate-400 dark:text-slate-500"><p className="text-sm">Opsi tidak ditemukan.</p></div>)}
                </div>
            </div>
        </div>
    );
};

const TableConfigModal: React.FC<{ isOpen: boolean; onClose: () => void; onInsert: (rows: number, cols: number) => void; }> = ({ isOpen, onClose, onInsert }) => {
    const [rows, setRows] = useState(3); const [cols, setCols] = useState(3);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-xs border border-gray-100 dark:border-slate-700">
                <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><TableCellsIcon className="w-4 h-4"/> Sisipkan Tabel</h3>
                <div className="space-y-4">
                    <div><label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">Jumlah Baris</label><input type="number" min="1" max="20" value={rows} onChange={e => setRows(Math.max(1, parseInt(e.target.value) || 1))} className="w-full p-2 border rounded text-sm bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 outline-none" /></div>
                    <div><label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">Jumlah Kolom</label><input type="number" min="1" max="10" value={cols} onChange={e => setCols(Math.max(1, parseInt(e.target.value) || 1))} className="w-full p-2 border rounded text-sm bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 outline-none" /></div>
                    <div className="flex gap-2 justify-end pt-2"><button onClick={onClose} className="px-3 py-1.5 text-xs font-bold text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded">Batal</button><button onClick={() => { onInsert(rows, cols); onClose(); }} className="px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow">Sisipkan</button></div>
                </div>
            </div>
        </div>
    );
};

const VisualMathModal: React.FC<{ isOpen: boolean; onClose: () => void; onInsert: (latex: string) => void; }> = ({ isOpen, onClose, onInsert }) => {
    const [tab, setTab] = useState<'BASIC' | 'CALCULUS' | 'MATRIX' | 'SYMBOLS'>('BASIC');
    const [val1, setVal1] = useState(''); const [val2, setVal2] = useState(''); const [val3, setVal3] = useState(''); 
    const [rows, setRows] = useState(2); const [cols, setCols] = useState(2);
    const [matData, setMatData] = useState<string[][]>([]);
    useEffect(() => {
        if (isOpen) {
            const safeRows = Math.max(1, Math.min(10, Math.floor(rows || 1)));
            const safeCols = Math.max(1, Math.min(10, Math.floor(cols || 1)));
            setMatData(Array.from({ length: safeRows }, () => Array(safeCols).fill('')));
            setVal1(''); setVal2(''); setVal3('');
        }
    }, [isOpen, rows, cols]);
    const updateMatrix = (r: number, c: number, v: string) => { const d = matData.map(row => [...row]); if(d[r]) { d[r][c] = v; setMatData(d); }};
    const insertStructure = (type: 'FRAC' | 'ROOT' | 'LIMIT' | 'INT' | 'SUM' | 'MATRIX' | 'SYMBOL', symbolVal?: string) => {
        let latex = '';
        switch(type) {
            case 'FRAC': latex = `${val3 || ''}\\frac{${val1 || 'x'}}{${val2 || 'y'}}`; break;
            case 'ROOT': latex = val1 ? `\\sqrt[${val1}]{${val2 || 'x'}}` : `\\sqrt{${val2 || 'x'}}`; break;
            case 'LIMIT': latex = `\\lim_{${val1 || 'x'} \\to ${val2 || '\\infty'}} ${val3 || 'f(x)'}`; break;
            case 'INT': latex = `\\int_{${val1 || 'a'}}^{${val2 || 'b'}} ${val3 || 'x'} \\,dx`; break;
            case 'SUM': latex = `\\sum_{${val1 || 'i=1'}}^{${val2 || 'n'}} ${val3 || 'x_i'}`; break;
            case 'MATRIX': latex = `\\begin{pmatrix} ${matData.map(row => row.map(c => c || '0').join(' & ')).join(' \\\\ ')} \\end{pmatrix}`; break;
            case 'SYMBOL': latex = symbolVal || ''; break;
        }
        onInsert(latex); if (type !== 'SYMBOL') onClose(); 
    };
    if (!isOpen) return null;
    const symbols = [{ l: '×', v: '\\times' }, { l: '÷', v: '\\div' }, { l: '≠', v: '\\neq' }, { l: '±', v: '\\pm' }, { l: '≤', v: '\\le' }, { l: '≥', v: '\\ge' }, { l: '≈', v: '\\approx' }, { l: '∞', v: '\\infty' }, { l: 'α', v: '\\alpha' }, { l: 'β', v: '\\beta' }, { l: 'θ', v: '\\theta' }, { l: 'π', v: '\\pi' }, { l: 'Δ', v: '\\Delta' }, { l: 'Ω', v: '\\Omega' }, { l: '∑', v: '\\Sigma' }, { l: '∫', v: '\\int' }, { l: '∠', v: '\\angle' }, { l: '°', v: '^{\\circ}' }, { l: '∈', v: '\\in' }, { l: '→', v: '\\rightarrow' }];
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 dark:border-slate-700 flex flex-col max-h-[90vh]">
                <div className="bg-gray-50 dark:bg-slate-900 p-3 border-b dark:border-slate-700 flex justify-between items-center"><h3 className="text-sm font-bold text-gray-700 dark:text-slate-200">Rumus Matematika</h3><button onClick={onClose}><XMarkIcon className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"/></button></div>
                <div className="flex border-b dark:border-slate-700 overflow-x-auto">{['BASIC', 'CALCULUS', 'MATRIX', 'SYMBOLS'].map((t: any) => (<button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 text-[10px] font-bold tracking-wider ${tab === t ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>{t === 'BASIC' ? 'ALJABAR' : t === 'CALCULUS' ? 'KALKULUS' : t === 'MATRIX' ? 'MATRIKS' : 'SIMBOL'}</button>))}</div>
                <div className="p-5 overflow-y-auto">
                    {tab === 'BASIC' && (<div className="space-y-6"><div className="bg-gray-50 dark:bg-slate-700/30 p-3 rounded-lg border border-gray-100 dark:border-slate-700"><p className="text-[10px] font-bold text-gray-400 uppercase mb-3 text-center">Pecahan</p><div className="flex flex-col gap-2"><div className="flex items-center justify-center gap-3"><input placeholder="Int" className="w-12 h-10 text-center text-sm p-1 border dark:border-slate-600 rounded bg-white dark:bg-slate-800 dark:text-slate-200" value={val3} onChange={e => setVal3(e.target.value)} /><div className="flex flex-col items-center gap-1"><input placeholder="Atas" className="w-16 text-center text-sm p-1 border dark:border-slate-600 rounded bg-white dark:bg-slate-800 dark:text-slate-200" value={val1} onChange={e => setVal1(e.target.value)} /><div className="w-20 h-0.5 bg-gray-800 dark:bg-slate-400 rounded-full"></div><input placeholder="Bawah" className="w-16 text-center text-sm p-1 border dark:border-slate-600 rounded bg-white dark:bg-slate-800 dark:text-slate-200" value={val2} onChange={e => setVal2(e.target.value)} /></div></div><button onClick={() => insertStructure('FRAC')} className="mt-2 w-full text-xs bg-indigo-600 text-white font-bold py-1.5 rounded">Sisipkan</button></div></div><div className="bg-gray-50 dark:bg-slate-700/30 p-3 rounded-lg border border-gray-100 dark:border-slate-700"><p className="text-[10px] font-bold text-gray-400 uppercase mb-2 text-center">Akar</p><div className="flex items-end gap-1 justify-center"><input placeholder="n" className="w-8 text-center text-xs p-1 border dark:border-slate-600 rounded mb-4 bg-white dark:bg-slate-800 dark:text-slate-200" value={val1} onChange={e => setVal1(e.target.value)} /><span className="text-3xl text-gray-400 font-light">√</span><input placeholder="Nilai" className="w-24 text-sm p-1 border dark:border-slate-600 rounded mb-1 bg-white dark:bg-slate-800 dark:text-slate-200" value={val2} onChange={e => setVal2(e.target.value)} /><button onClick={() => insertStructure('ROOT')} className="mb-1 text-xs bg-white dark:bg-slate-800 border dark:border-slate-600 font-bold px-3 py-1.5 rounded dark:text-slate-200">OK</button></div></div></div>)}
                    {tab === 'CALCULUS' && (<div className="space-y-4"><div className="border dark:border-slate-700 p-3 rounded bg-white dark:bg-slate-800 dark:text-slate-200"><p className="text-[10px] font-bold mb-2">Limit</p><div className="flex items-center gap-1 text-sm">lim <div className="flex flex-col gap-1"><input placeholder="x" className="w-8 p-0.5 border dark:border-slate-600 rounded text-center text-xs bg-white dark:bg-slate-900" value={val1} onChange={e => setVal1(e.target.value)} />➜<input placeholder="∞" className="w-8 p-0.5 border dark:border-slate-600 rounded text-center text-xs bg-white dark:bg-slate-900" value={val2} onChange={e => setVal2(e.target.value)} /></div><input placeholder="f(x)" className="w-24 p-1 border dark:border-slate-600 rounded ml-1 bg-white dark:bg-slate-900" value={val3} onChange={e => setVal3(e.target.value)} /><button onClick={() => insertStructure('LIMIT')} className="ml-auto text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded font-bold">Add</button></div></div><div className="border dark:border-slate-700 p-3 rounded bg-white dark:bg-slate-800 dark:text-slate-200"><p className="text-[10px] font-bold mb-2">Integral / Sigma</p><div className="flex items-center gap-2"><div className="flex flex-col items-center"><input placeholder="b" className="w-10 text-center text-xs border dark:border-slate-600 rounded mb-1 bg-white dark:bg-slate-900" value={val2} onChange={e => setVal2(e.target.value)} /><span className="text-2xl text-gray-400">∫/∑</span><input placeholder="a" className="w-10 text-center text-xs border dark:border-slate-600 rounded mt-1 bg-white dark:bg-slate-900" value={val1} onChange={e => setVal1(e.target.value)} /></div><input placeholder="Fungsi" className="flex-1 p-1 border dark:border-slate-600 rounded bg-white dark:bg-slate-900" value={val3} onChange={e => setVal3(e.target.value)} /></div><div className="flex gap-2 mt-2"><button onClick={() => insertStructure('INT')} className="flex-1 text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 py-1 rounded">Integral</button><button onClick={() => insertStructure('SUM')} className="flex-1 text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 py-1 rounded">Sigma</button></div></div></div>)}
                    {tab === 'MATRIX' && (<div><div className="flex gap-4 justify-center mb-4 dark:text-slate-200"><label className="text-[10px] font-bold">Baris <input type="number" min="1" max="5" value={rows} onChange={e => setRows(Math.max(1, parseInt(e.target.value) || 1))} className="w-10 ml-1 border dark:border-slate-600 rounded p-1 bg-white dark:bg-slate-900" /></label><label className="text-[10px] font-bold">Kolom <input type="number" min="1" max="5" value={cols} onChange={e => setCols(Math.max(1, parseInt(e.target.value) || 1))} className="w-10 ml-1 border dark:border-slate-600 rounded p-1 bg-white dark:bg-slate-900" /></label></div><div className="grid gap-1 justify-center bg-gray-100 dark:bg-slate-700/50 p-2 rounded" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>{matData.map((rArr, r) => rArr.map((val, c) => (<input key={`${r}-${c}`} value={val} onChange={e => updateMatrix(r, c, e.target.value)} className="w-10 h-8 text-center border dark:border-slate-600 rounded text-xs focus:bg-indigo-50 dark:focus:bg-slate-800 outline-none bg-white dark:bg-slate-900 dark:text-slate-200" placeholder="0" />)))}</div><button onClick={() => insertStructure('MATRIX')} className="w-full mt-4 bg-indigo-600 text-white py-2 rounded text-xs font-bold shadow hover:bg-indigo-700">Sisipkan Matriks</button></div>)}
                    {tab === 'SYMBOLS' && (<div className="grid grid-cols-5 gap-2">{symbols.map((s, i) => (<button key={i} onClick={() => insertStructure('SYMBOL', s.v)} className="aspect-square bg-gray-50 dark:bg-slate-700/50 border dark:border-slate-600 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 transition-colors text-sm font-serif dark:text-slate-200">{s.l}</button>))}</div>)}
                </div>
            </div>
        </div>
    );
};

const WysiwygEditor: React.FC<{ value: string; onChange: (val: string) => void; placeholder?: string; minHeight?: string; showTabs?: boolean }> = ({ value, onChange, placeholder = "Ketik di sini...", minHeight = "120px", showTabs = true }) => {
    const editorRef = useRef<HTMLDivElement>(null); const fileInputRef = useRef<HTMLInputElement>(null); const savedRange = useRef<Range | null>(null);
    const [activeTab, setActiveTab] = useState<'FORMAT' | 'PARAGRAPH' | 'INSERT' | 'MATH'>(showTabs ? 'FORMAT' : 'INSERT'); const [activeCmds, setActiveCmds] = useState<string[]>([]); const [isInsideTable, setIsInsideTable] = useState(false); const [showMath, setShowMath] = useState(false); const [showTable, setShowTable] = useState(false);
    useEffect(() => { if (editorRef.current && value !== editorRef.current.innerHTML) { if (!editorRef.current.innerText.trim() && !value) { editorRef.current.innerHTML = ""; } else if (document.activeElement !== editorRef.current) { editorRef.current.innerHTML = value; } } }, [value]);
    const handleInput = () => { if (editorRef.current) { onChange(editorRef.current.innerHTML); saveSelection(); checkActiveFormats(); } };
    const saveSelection = () => { const sel = window.getSelection(); if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) { savedRange.current = sel.getRangeAt(0).cloneRange(); } };
    const restoreSelection = () => { const sel = window.getSelection(); if (sel && savedRange.current) { sel.removeAllRanges(); sel.addRange(savedRange.current); } else if (editorRef.current) { editorRef.current.focus(); const range = document.createRange(); range.selectNodeContents(editorRef.current); range.collapse(false); sel?.removeAllRanges(); sel?.addRange(range); } };
    const checkActiveFormats = () => { saveSelection(); const cmds = ['bold', 'italic', 'underline', 'strikethrough', 'subscript', 'superscript', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull', 'insertUnorderedList', 'insertOrderedList']; const active = cmds.filter(cmd => document.queryCommandState(cmd)); setActiveCmds(active); const selection = window.getSelection(); let inTable = false; if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) { let node = selection.anchorNode; while (node && node !== editorRef.current) { if (node.nodeName === 'TABLE' || node.nodeName === 'TD' || node.nodeName === 'TH') { inTable = true; break; } node = node.parentNode; } } setIsInsideTable(inTable); };
    const runCmd = (cmd: string, val?: string) => { restoreSelection(); if(editorRef.current) editorRef.current.focus(); execCmd(cmd, val); saveSelection(); checkActiveFormats(); };
    const insertTable = (rows: number, cols: number) => { let html = '<table class="border-collapse border border-slate-300 dark:border-slate-600 my-2 w-full text-sm"><thead><tr>'; for(let c=0; c<cols; c++) html += `<th class="border border-slate-300 dark:border-slate-600 p-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100">H${c+1}</th>`; html += '</tr></thead><tbody>'; for(let r=0; r<rows; r++) { html += '<tr>'; for(let c=0; c<cols; c++) html += `<td class="border border-slate-300 dark:border-slate-600 p-2 text-slate-800 dark:text-slate-200">Data</td>`; html += '</tr>'; } html += '</tbody></table><p><br/></p>'; runCmd('insertHTML', html); handleInput(); };
    const deleteCurrentTable = () => { const selection = window.getSelection(); if (selection && selection.rangeCount > 0) { let node = selection.anchorNode; while (node && node !== editorRef.current) { if (node.nodeName === 'TABLE') { node.parentNode?.removeChild(node); handleInput(); setIsInsideTable(false); return; } node = node.parentNode; } } };
    const insertMath = (latex: string) => { if ((window as any).katex) { const html = (window as any).katex.renderToString(latex, { throwOnError: false }); const wrapper = `&nbsp;<span class="math-visual inline-block px-0.5 rounded select-none cursor-pointer hover:bg-indigo-50 dark:hover:bg-slate-700 align-middle" contenteditable="false" data-latex="${latex.replace(/"/g, '&quot;')}">${html}</span><span style="font-size: 100%; font-family: inherit; font-weight: normal; font-style: normal; color: inherit;">&nbsp;</span>`; runCmd('insertHTML', wrapper); handleInput(); } };
    const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) { const file = e.target.files[0]; const reader = new FileReader(); reader.onload = async (ev) => { const rawDataUrl = ev.target?.result as string; try { const dataUrl = await compressImage(rawDataUrl, 0.7); const imgTag = `<img src="${dataUrl}" alt="Inserted Image" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;" />&nbsp;`; runCmd('insertHTML', imgTag); handleInput(); } catch (error) { console.error("Image compression failed", error); } }; reader.readAsDataURL(file); } e.target.value = ''; };
    
    // NOTE: Styles are now handled globally in style.css to ensure consistency between Editor and Preview/Draft View.
    const Btn: React.FC<{ cmd?: string; label?: string; icon?: React.FC<any>; active?: boolean; onClick?: () => void }> = ({ cmd, label, icon: Icon, active, onClick }) => (<button type="button" onMouseDown={(e) => { e.preventDefault(); onClick ? onClick() : runCmd(cmd!); }} className={`min-w-[28px] h-7 px-1.5 rounded flex items-center justify-center transition-all ${active ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 shadow-inner' : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-400'}`} title={label}>{Icon ? <Icon className="w-4 h-4"/> : <span className="text-xs font-bold font-serif">{label}</span>}</button>);
    return (<div className="relative group rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-all focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900 focus-within:border-indigo-300 dark:focus-within:border-indigo-700"><div className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 rounded-t-xl select-none"><div className="flex px-2 pt-1 gap-1 border-b border-gray-200/50 dark:border-slate-700/50 justify-between items-end">{showTabs && (<div className="flex gap-1">{['FORMAT', 'PARAGRAPH', 'INSERT', 'MATH'].map((t: any) => (<button key={t} onClick={() => setActiveTab(t)} className={`px-3 py-1.5 text-[10px] font-bold tracking-wider rounded-t-lg transition-colors ${activeTab === t ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>{t === 'MATH' ? 'RUMUS' : t === 'FORMAT' ? 'FORMAT' : t === 'PARAGRAPH' ? 'PARAGRAF' : 'SISIPKAN'}</button>))}</div>)}{isInsideTable && (<div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[9px] font-bold rounded-t uppercase tracking-widest border-t border-x border-indigo-100 dark:border-indigo-800">Table Active</div>)}</div><div className="p-1.5 flex flex-wrap gap-1 items-center bg-white dark:bg-slate-900 rounded-b-none min-h-[36px]">{activeTab === 'FORMAT' && (<><Btn cmd="bold" label="B" active={activeCmds.includes('bold')} /><Btn cmd="italic" label="I" active={activeCmds.includes('italic')} /><Btn cmd="underline" label="U" active={activeCmds.includes('underline')} /><Btn cmd="strikethrough" icon={StrikethroughIcon} active={activeCmds.includes('strikethrough')} /><div className="w-px h-4 bg-gray-200 dark:bg-slate-700 mx-1"></div><Btn cmd="superscript" icon={SuperscriptIcon} active={activeCmds.includes('superscript')} /><Btn cmd="subscript" icon={SubscriptIcon} active={activeCmds.includes('subscript')} /><div className="w-px h-4 bg-gray-200 dark:bg-slate-700 mx-1"></div><Btn cmd="removeFormat" icon={EraserIcon} label="Clear" /></>)}{activeTab === 'PARAGRAPH' && (<><Btn cmd="justifyLeft" icon={AlignLeftIcon} active={activeCmds.includes('justifyLeft')} /><Btn cmd="justifyCenter" icon={AlignCenterIcon} active={activeCmds.includes('justifyCenter')} /><Btn cmd="justifyRight" icon={AlignRightIcon} active={activeCmds.includes('justifyRight')} /><Btn cmd="justifyFull" icon={AlignJustifyIcon} active={activeCmds.includes('justifyFull')} /><div className="w-px h-4 bg-gray-200 dark:bg-slate-700 mx-1"></div><Btn cmd="insertUnorderedList" icon={ListBulletIcon} active={activeCmds.includes('insertUnorderedList')} /><Btn cmd="insertOrderedList" label="1." active={activeCmds.includes('insertOrderedList')} /><div className="w-px h-4 bg-gray-200 dark:bg-slate-700 mx-1"></div><Btn cmd="indent" label="Indent" icon={() => <span className="text-[10px] font-mono">→]</span>} /><Btn cmd="outdent" label="Outdent" icon={() => <span className="text-[10px] font-mono">[←</span>} /></>)}{activeTab === 'INSERT' && (<><button onMouseDown={(e) => {e.preventDefault(); fileInputRef.current?.click();}} className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded text-xs font-bold hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"><PhotoIcon className="w-4 h-4"/> Gambar</button><button onMouseDown={(e) => {e.preventDefault(); setShowTable(true);}} className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"><TableCellsIcon className="w-4 h-4"/> Tabel</button><button onMouseDown={(e) => {e.preventDefault(); runCmd('insertHorizontalRule');}} className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-400 rounded text-xs font-bold hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">—— Pemisah</button></>)}{activeTab === 'MATH' && (<div className="flex items-center gap-2 w-full"><button onMouseDown={(e) => {e.preventDefault(); setShowMath(true);}} className="flex-1 flex items-center justify-center gap-2 px-4 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded shadow text-xs font-bold hover:from-indigo-600 hover:to-purple-700 transition-all"><FunctionIcon className="w-4 h-4" /> Buka Math Pro</button></div>)}{isInsideTable && (<div className="ml-auto pl-2 border-l border-gray-200 dark:border-slate-700 flex items-center animate-fade-in"><button onMouseDown={(e) => { e.preventDefault(); deleteCurrentTable(); }} className="flex items-center gap-1 px-2 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-[10px] font-bold hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-100 dark:border-red-900 transition-colors" title="Hapus Tabel ini"><TrashIcon className="w-3 h-3"/> Hapus</button></div>)}</div></div><div ref={editorRef} className="wysiwyg-content p-4 outline-none text-sm text-slate-800 dark:text-slate-200 leading-relaxed overflow-auto" style={{ minHeight }} contentEditable={true} onInput={handleInput} onKeyUp={checkActiveFormats} onMouseUp={checkActiveFormats} onBlur={saveSelection} onClick={checkActiveFormats} data-placeholder={placeholder} spellCheck={false} /><input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageFileChange} /><TableConfigModal isOpen={showTable} onClose={() => setShowTable(false)} onInsert={insertTable} /><VisualMathModal isOpen={showMath} onClose={() => setShowMath(false)} onInsert={insertMath} /></div>);
};

export const ExamEditor: React.FC<ExamEditorProps> = ({ 
    questions, setQuestions, config, setConfig, isEditing, onSave, onSaveDraft, onCancel, generatedCode, onReset 
}) => {
    // Check if Essay Exists
    const hasEssay = useMemo(() => questions.some(q => q.questionType === 'ESSAY'), [questions]);

    // Force disable automatic result showing if Essay exists
    useEffect(() => {
        if (hasEssay && config.showResultToStudent) {
            setConfig(prev => ({ ...prev, showResultToStudent: false }));
        }
    }, [hasEssay]);

    const [isTypeSelectionModalOpen, setIsTypeSelectionModalOpen] = useState(false);
    const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false); 
    const [isClassModalOpen, setIsClassModalOpen] = useState(false); 
    const [isExamTypeModalOpen, setIsExamTypeModalOpen] = useState(false); 
    const [insertIndex, setInsertIndex] = useState<number | null>(null);
    const questionsSectionRef = useRef<HTMLDivElement>(null);
    const generatedCodeSectionRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => { if (!isEditing && !generatedCode) { const timer = setTimeout(() => { if (questionsSectionRef.current) questionsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 300); return () => clearTimeout(timer); } }, [isEditing, generatedCode]);
    useEffect(() => { if (generatedCode && generatedCodeSectionRef.current) { setTimeout(() => { generatedCodeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 200); } }, [generatedCode]);

    const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setConfig(prev => {
                const newConfig = { ...prev, [name]: checked };
                if (name === 'detectBehavior' && !checked) newConfig.continueWithPermission = false;
                // 'disableRealtime' is now handled by the radio group separately
                return newConfig;
            });
        } else {
            setConfig(prev => ({ ...prev, [name]: name === 'timeLimit' ? parseInt(value) : value }));
        }
    };
    // ... existing handlers (handleSubjectSelect, handleQuestionTextChange, etc.) ...
    const handleSubjectSelect = (subject: string) => setConfig(prev => ({ ...prev, subject }));
    const handleQuestionTextChange = (id: string, text: string) => setQuestions(prev => prev.map(q => q.id === id ? { ...q, questionText: text } : q));
    const handleCategoryChange = (id: string, category: string) => setQuestions(prev => prev.map(q => q.id === id ? { ...q, category } : q));
    const handleLevelChange = (id: string, level: string) => setQuestions(prev => prev.map(q => q.id === id ? { ...q, level } : q));

    const handleTypeChange = (qId: string, newType: QuestionType) => {
        setQuestions(prev => prev.map(q => {
            if (q.id === qId) {
                const updated = { ...q, questionType: newType };
                if (['MULTIPLE_CHOICE', 'COMPLEX_MULTIPLE_CHOICE'].includes(newType) && (!updated.options || updated.options.length === 0)) { updated.options = ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D']; updated.correctAnswer = newType === 'MULTIPLE_CHOICE' ? 'Opsi A' : ''; }
                if (newType === 'TRUE_FALSE' && (!updated.trueFalseRows || updated.trueFalseRows.length === 0)) { updated.trueFalseRows = [{ text: 'Pernyataan 1', answer: true }, { text: 'Pernyataan 2', answer: false }]; }
                if (newType === 'MATCHING' && (!updated.matchingPairs || updated.matchingPairs.length === 0)) { updated.matchingPairs = [{ left: 'Item A', right: 'Pasangan A' }, { left: 'Item B', right: 'Pasangan B' }]; }
                return updated;
            }
            return q;
        }));
    };
    const handleOptionTextChange = (qId: string, optIndex: number, text: string) => {
        setQuestions(prev => prev.map(q => {
            if (q.id === qId && q.options) {
                const oldOption = q.options[optIndex]; const newOptions = [...q.options]; newOptions[optIndex] = text; let newCorrectAnswer = q.correctAnswer;
                if (q.questionType === 'MULTIPLE_CHOICE') { if (q.correctAnswer === oldOption) newCorrectAnswer = text; } 
                else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') { let answers = q.correctAnswer ? q.correctAnswer.split(',') : []; if (answers.includes(oldOption)) { answers = answers.map(a => a === oldOption ? text : a); newCorrectAnswer = answers.join(','); } }
                return { ...q, options: newOptions, correctAnswer: newCorrectAnswer };
            }
            return q;
        }));
    };
    const handleCorrectAnswerChange = (questionId: string, answer: string) => setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, correctAnswer: answer } : q));
    const handleComplexCorrectAnswerChange = (questionId: string, option: string, isChecked: boolean) => {
        setQuestions(prev => prev.map(q => {
            if (q.id === questionId) { let currentAnswers = q.correctAnswer ? q.correctAnswer.split(',') : []; if (isChecked) { if (!currentAnswers.includes(option)) currentAnswers.push(option); } else { currentAnswers = currentAnswers.filter(a => a !== option); } return { ...q, correctAnswer: currentAnswers.join(',') }; }
            return q;
        }));
    };
    const handleDeleteQuestion = (id: string) => { if (window.confirm("Apakah Anda yakin ingin menghapus soal ini?")) { setQuestions(prev => prev.filter(q => q.id !== id)); } };
    const createNewQuestion = (type: QuestionType): Question => {
        const base = { id: `q-${Date.now()}-${Math.random()}`, questionText: '', questionType: type, imageUrl: undefined, optionImages: undefined, category: '', level: '' };
        switch (type) {
            case 'INFO': return { ...base }; case 'MULTIPLE_CHOICE': return { ...base, options: ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'], correctAnswer: 'Opsi A' }; case 'COMPLEX_MULTIPLE_CHOICE': return { ...base, options: ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'], correctAnswer: '' }; case 'TRUE_FALSE': return { ...base, trueFalseRows: [{ text: 'Pernyataan 1', answer: true }, { text: 'Pernyataan 2', answer: false }], options: undefined, correctAnswer: undefined }; case 'MATCHING': return { ...base, matchingPairs: [{ left: 'Item A', right: 'Pasangan A' }, { left: 'Item B', right: 'Pasangan B' }] }; case 'FILL_IN_THE_BLANK': return { ...base, correctAnswer: '' }; case 'ESSAY': default: return { ...base };
        }
    };
    const openTypeSelectionModal = (index: number | null = null) => { setInsertIndex(index); setIsTypeSelectionModalOpen(true); };
    const handleSelectQuestionType = (type: QuestionType) => {
        const newQuestion = createNewQuestion(type);
        if (insertIndex === null) { setQuestions(prev => [...prev, newQuestion]); setTimeout(() => { document.getElementById(newQuestion.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100); } 
        else { const newQuestions = [...questions]; newQuestions.splice(insertIndex + 1, 0, newQuestion); setQuestions(newQuestions); }
        setIsTypeSelectionModalOpen(false); setInsertIndex(null);
    };
    const handleAddOption = (questionId: string) => { setQuestions(prev => prev.map(q => { if (q.id === questionId && q.options) { const nextChar = String.fromCharCode(65 + q.options.length); const newOptions = [...q.options, `Opsi ${nextChar}`]; const newOptionImages = q.optionImages ? [...q.optionImages, null] : undefined; return { ...q, options: newOptions, optionImages: newOptionImages }; } return q; })); };
    const handleDeleteOption = (questionId: string, indexToRemove: number) => { setQuestions(prev => prev.map(q => { if (q.id === questionId && q.options && q.options.length > 1) { const optionToRemove = q.options[indexToRemove]; const newOptions = q.options.filter((_, i) => i !== indexToRemove); const newOptionImages = q.optionImages ? q.optionImages.filter((_, i) => i !== indexToRemove) : undefined; let newCorrectAnswer = q.correctAnswer; if (q.questionType === 'MULTIPLE_CHOICE') { if (q.correctAnswer === optionToRemove) newCorrectAnswer = newOptions[0] || ''; } else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') { let answers = q.correctAnswer ? q.correctAnswer.split(',') : []; answers = answers.filter(a => a !== optionToRemove); newCorrectAnswer = answers.join(','); } return { ...q, options: newOptions, optionImages: newOptionImages, correctAnswer: newCorrectAnswer }; } return q; })); };
    
    // --- HANDLERS FOR TRUE/FALSE ---
    const handleTrueFalseRowTextChange = (qId: string, idx: number, val: string) => { setQuestions(prev => prev.map(q => { if (q.id === qId && q.trueFalseRows) { const newRows = [...q.trueFalseRows]; newRows[idx] = { ...newRows[idx], text: val }; return { ...q, trueFalseRows: newRows }; } return q; })); };
    const handleTrueFalseRowAnswerChange = (qId: string, idx: number, val: boolean) => { setQuestions(prev => prev.map(q => { if (q.id === qId && q.trueFalseRows) { const newRows = [...q.trueFalseRows]; newRows[idx] = { ...newRows[idx], answer: val }; return { ...q, trueFalseRows: newRows }; } return q; })); };
    const handleAddTrueFalseRow = (qId: string) => { setQuestions(prev => prev.map(q => { if (q.id === qId && q.trueFalseRows) { const nextNum = q.trueFalseRows.length + 1; return { ...q, trueFalseRows: [...q.trueFalseRows, { text: `Pernyataan ${nextNum}`, answer: true }] }; } return q; })); };
    const handleDeleteTrueFalseRow = (qId: string, idx: number) => { setQuestions(prev => prev.map(q => { if (q.id === qId && q.trueFalseRows && q.trueFalseRows.length > 1) { const newRows = q.trueFalseRows.filter((_, i) => i !== idx); return { ...q, trueFalseRows: newRows }; } return q; })); };

    // --- HANDLERS FOR MATCHING ---
    const handleMatchingPairChange = (qId: string, idx: number, field: 'left' | 'right', value: string) => { setQuestions(prev => prev.map(q => { if (q.id === qId && q.matchingPairs) { const newPairs = [...q.matchingPairs]; newPairs[idx] = { ...newPairs[idx], [field]: value }; return { ...q, matchingPairs: newPairs }; } return q; })); };
    const handleAddMatchingPair = (qId: string) => { setQuestions(prev => prev.map(q => { if (q.id === qId && q.matchingPairs) return { ...q, matchingPairs: [...q.matchingPairs, { left: '', right: '' }] }; return q; })); };
    const handleDeleteMatchingPair = (qId: string, idx: number) => { setQuestions(prev => prev.map(q => { if (q.id === qId && q.matchingPairs && q.matchingPairs.length > 1) { const newPairs = q.matchingPairs.filter((_, i) => i !== idx); return { ...q, matchingPairs: newPairs }; } return q; })); };

    const renderTypeSelectionModal = () => { if (!isTypeSelectionModalOpen) return null; const types: {type: QuestionType, label: string, desc: string, icon: React.FC<any>}[] = [{ type: 'INFO', label: 'Keterangan / Info', desc: 'Hanya teks atau gambar, tanpa pertanyaan.', icon: FileTextIcon }, { type: 'MULTIPLE_CHOICE', label: 'Pilihan Ganda', desc: 'Satu jawaban benar dari beberapa opsi.', icon: ListBulletIcon }, { type: 'COMPLEX_MULTIPLE_CHOICE', label: 'Pilihan Ganda Kompleks', desc: 'Lebih dari satu jawaban benar.', icon: CheckCircleIcon }, { type: 'FILL_IN_THE_BLANK', label: 'Isian Singkat', desc: 'Jawaban teks pendek otomatis dinilai.', icon: PencilIcon }, { type: 'ESSAY', label: 'Uraian / Esai', desc: 'Jawaban panjang dinilai manual.', icon: FileWordIcon }, { type: 'TRUE_FALSE', label: 'Benar / Salah', desc: 'Memilih pernyataan benar atau salah.', icon: CheckIcon }, { type: 'MATCHING', label: 'Menjodohkan', desc: 'Menghubungkan pasangan item kiri dan kanan.', icon: ArrowLeftIcon },]; return (<div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[60] animate-fade-in"><div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white dark:border-slate-700"><div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900"><h3 className="font-bold text-lg text-gray-800 dark:text-white">Pilih Tipe Soal</h3><button onClick={() => setIsTypeSelectionModalOpen(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700"><XMarkIcon className="w-5 h-5 text-gray-500 dark:text-slate-400"/></button></div><div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">{types.map((t) => (<button key={t.type} onClick={() => handleSelectQuestionType(t.type)} className="flex items-start gap-4 p-4 border dark:border-slate-700 rounded-lg hover:border-primary dark:hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 hover:shadow-md transition-all text-left group bg-white dark:bg-slate-800"><div className="bg-gray-100 dark:bg-slate-700 p-2.5 rounded-full group-hover:bg-primary group-hover:text-white transition-colors text-gray-500 dark:text-slate-300"><t.icon className="w-6 h-6" /></div><div><p className="font-bold text-gray-800 dark:text-slate-200 group-hover:text-primary dark:group-hover:text-primary">{t.label}</p><p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{t.desc}</p></div></button>))}</div></div></div>); };

    return (
        <div className="space-y-10 border-t-2 border-gray-200 dark:border-slate-700 pt-12">
            {/* ... questions list ... */}
            <div ref={questionsSectionRef} id="exam-editor-section" className="space-y-4 scroll-mt-32">
                 <div className="p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm">
                    <h2 className="text-xl font-bold text-neutral dark:text-white">{isEditing ? '1. Editor Soal' : '3. Editor Soal'}</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Gunakan editor teks kaya di bawah untuk membuat konten soal berkualitas.</p>
                </div>
                <div className="space-y-6">
                    {questions.length > 0 && (
                        <div className="relative py-2 group/insert">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-gray-200 dark:border-slate-700 group-hover/insert:border-primary/30 transition-colors"></div></div>
                            <div className="relative flex justify-center"><button onClick={() => openTypeSelectionModal(-1)} className="bg-white dark:bg-slate-900 text-gray-400 dark:text-slate-500 group-hover/insert:text-primary group-hover/insert:bg-primary/5 px-4 py-1 text-xs font-semibold rounded-full border border-gray-200 dark:border-slate-700 group-hover/insert:border-primary/30 shadow-sm transition-all transform hover:scale-105 flex items-center gap-1 opacity-0 group-hover/insert:opacity-100 focus:opacity-100"><PlusCircleIcon className="w-4 h-4" /> Sisipkan Soal Di Awal</button></div>
                        </div>
                    )}
                    {questions.map((q, index) => {
                        const questionNumber = questions.slice(0, index).filter(i => i.questionType !== 'INFO').length + 1;
                        return (
                            <React.Fragment key={q.id}>
                                <div id={q.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 group transition-all duration-300 hover:shadow-md relative overflow-visible">
                                     <div className="absolute top-4 right-4 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-20">
                                         <div className="relative inline-block bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                            <select value={q.questionType} onChange={(e) => handleTypeChange(q.id, e.target.value as QuestionType)} className="appearance-none bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 py-1.5 pl-3 pr-7 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:bg-white dark:hover:bg-slate-600 hover:border-gray-300 dark:hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all">
                                                <option value="MULTIPLE_CHOICE">Pilihan Ganda</option><option value="COMPLEX_MULTIPLE_CHOICE">PG Kompleks</option><option value="TRUE_FALSE">Benar / Salah</option><option value="MATCHING">Menjodohkan</option><option value="ESSAY">Esai / Uraian</option><option value="FILL_IN_THE_BLANK">Isian Singkat</option><option value="INFO">Info / Teks</option>
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 dark:text-slate-400"><svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div>
                                        </div>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(q.id); }} className="p-1.5 bg-white dark:bg-slate-700 text-gray-400 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 border border-gray-200 dark:border-slate-600 transition-colors shadow-sm" title="Hapus Soal"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                    <div className="p-6 md:p-8">
                                        <div className="flex items-start gap-4 md:gap-6">
                                            <div className="flex-shrink-0 mt-1 hidden md:block select-none">{q.questionType === 'INFO' ? <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">i</div> : <span className="text-slate-300 dark:text-slate-600 font-bold text-xl">{String.fromCharCode(48 + Math.floor(questionNumber / 10)) + String.fromCharCode(48 + (questionNumber % 10))}</span>}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="md:hidden mb-2">{q.questionType !== 'INFO' && <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase">{questionNumber}. Soal</span>}</div>
                                                
                                                {/* METADATA INPUTS */}
                                                <div className="grid grid-cols-2 gap-4 mb-4">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Kategori Soal</label>
                                                        <input 
                                                            type="text" 
                                                            value={q.category || ''} 
                                                            onChange={(e) => handleCategoryChange(q.id, e.target.value)}
                                                            className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                                                            placeholder="Contoh: Aljabar, Teks Prosedur"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Level Soal</label>
                                                        <input 
                                                            type="text" 
                                                            value={q.level || ''} 
                                                            onChange={(e) => handleLevelChange(q.id, e.target.value)}
                                                            className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                                                            placeholder="Contoh: 1, 2, HOTS, LOTS"
                                                        />
                                                    </div>
                                                </div>

                                                <WysiwygEditor value={q.questionText} onChange={(val) => handleQuestionTextChange(q.id, val)} placeholder={q.questionType === 'INFO' ? "Tulis informasi atau teks bacaan di sini..." : "Tulis pertanyaan di sini..."} minHeight="80px" />
                                                
                                                {/* MULTIPLE CHOICE */}
                                                {q.questionType === 'MULTIPLE_CHOICE' && q.options && (
                                                    <div className="mt-6 space-y-3">
                                                        {q.options.map((option, i) => (
                                                            <div key={i} className={`group/opt relative flex items-start p-1 rounded-xl transition-all ${q.correctAnswer === option ? 'bg-emerald-50/50 dark:bg-emerald-900/20' : ''}`}>
                                                                <div className="flex items-center h-full pt-4 pl-2 pr-4 cursor-pointer" onClick={() => handleCorrectAnswerChange(q.id, option)}><div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${q.correctAnswer === option ? 'border-emerald-500 bg-emerald-500 dark:border-emerald-400 dark:bg-emerald-400' : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 group-hover/opt:border-emerald-300 dark:group-hover/opt:border-emerald-500'}`}>{q.correctAnswer === option && <div className="w-2 h-2 bg-white rounded-full" />}</div></div>
                                                                <div className="flex-1"><WysiwygEditor value={option} onChange={(val) => handleOptionTextChange(q.id, i, val)} placeholder={`Opsi ${String.fromCharCode(65 + i)}`} minHeight="40px" /></div>
                                                                <div className="flex flex-col gap-1 opacity-0 group-hover/opt:opacity-100 transition-opacity px-2 pt-2"><button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteOption(q.id, i); }} className="text-gray-300 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button></div>
                                                            </div>
                                                        ))}
                                                        <button onClick={() => handleAddOption(q.id)} className="ml-12 mt-2 text-xs font-bold text-primary dark:text-indigo-400 hover:text-primary-focus flex items-center gap-1 opacity-60 hover:opacity-100"><PlusCircleIcon className="w-4 h-4" /> Tambah Opsi</button>
                                                    </div>
                                                )}

                                                {/* COMPLEX MULTIPLE CHOICE */}
                                                {q.questionType === 'COMPLEX_MULTIPLE_CHOICE' && q.options && (
                                                    <div className="mt-6 space-y-3">
                                                        {q.options.map((option, i) => {
                                                            const currentAnswers = q.correctAnswer ? q.correctAnswer.split(',') : [];
                                                            const isSelected = currentAnswers.includes(option);
                                                            return (
                                                                <div key={i} className={`group/opt relative flex items-start p-1 rounded-xl transition-all ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}>
                                                                    <div className="flex items-center h-full pt-4 pl-2 pr-4 cursor-pointer" onClick={() => handleComplexCorrectAnswerChange(q.id, option, !isSelected)}>
                                                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'border-indigo-500 bg-indigo-500 dark:border-indigo-400 dark:bg-indigo-400' : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 group-hover/opt:border-indigo-300 dark:group-hover/opt:border-indigo-500'}`}>
                                                                            {isSelected && <CheckIcon className="w-3.5 h-3.5 text-white" />}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <WysiwygEditor value={option} onChange={(val) => handleOptionTextChange(q.id, i, val)} placeholder={`Opsi ${String.fromCharCode(65 + i)}`} minHeight="40px" />
                                                                    </div>
                                                                    <div className="flex flex-col gap-1 opacity-0 group-hover/opt:opacity-100 transition-opacity px-2 pt-2">
                                                                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteOption(q.id, i); }} className="text-gray-300 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        <button onClick={() => handleAddOption(q.id)} className="ml-12 mt-2 text-xs font-bold text-primary dark:text-indigo-400 hover:text-primary-focus flex items-center gap-1 opacity-60 hover:opacity-100"><PlusCircleIcon className="w-4 h-4" /> Tambah Opsi</button>
                                                    </div>
                                                )}

                                                {/* TRUE FALSE */}
                                                {q.questionType === 'TRUE_FALSE' && q.trueFalseRows && (
                                                    <div className="mt-6 space-y-4">
                                                        <div className="grid grid-cols-12 gap-4 mb-2 px-2">
                                                            <div className="col-span-8 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Pernyataan (Dukung Rumus & Gambar)</div>
                                                            <div className="col-span-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Jawaban Benar</div>
                                                        </div>
                                                        {q.trueFalseRows.map((row, i) => (
                                                            <div key={i} className="group/row relative grid grid-cols-12 gap-4 items-start p-3 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
                                                                <div className="col-span-8">
                                                                    <WysiwygEditor 
                                                                        value={row.text} 
                                                                        onChange={(val) => handleTrueFalseRowTextChange(q.id, i, val)} 
                                                                        minHeight="80px" 
                                                                        placeholder={`Pernyataan ${i+1}`}
                                                                    />
                                                                </div>
                                                                <div className="col-span-4 flex items-center justify-center gap-2 h-full pt-2">
                                                                    <button 
                                                                        onClick={() => handleTrueFalseRowAnswerChange(q.id, i, true)}
                                                                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${row.answer ? 'bg-emerald-500 text-white shadow-emerald-100 dark:shadow-emerald-900/50' : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                                                    >
                                                                        Benar
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleTrueFalseRowAnswerChange(q.id, i, false)}
                                                                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${!row.answer ? 'bg-rose-500 text-white shadow-rose-100 dark:shadow-rose-900/50' : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                                                    >
                                                                        Salah
                                                                    </button>
                                                                    <button onClick={() => handleDeleteTrueFalseRow(q.id, i)} className="ml-2 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"><TrashIcon className="w-4 h-4"/></button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <button onClick={() => handleAddTrueFalseRow(q.id)} className="ml-2 mt-2 text-xs font-bold text-primary dark:text-indigo-400 hover:text-primary-focus flex items-center gap-1 opacity-60 hover:opacity-100"><PlusCircleIcon className="w-4 h-4" /> Tambah Pernyataan</button>
                                                    </div>
                                                )}

                                                {/* MATCHING */}
                                                {q.questionType === 'MATCHING' && q.matchingPairs && (
                                                    <div className="mt-6 space-y-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-2 px-2">
                                                            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Kolom Kiri (Premis)</div>
                                                            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Kolom Kanan (Jawaban)</div>
                                                        </div>
                                                        {q.matchingPairs.map((pair, i) => (
                                                            <div key={i} className="group/pair relative flex flex-col md:flex-row items-center gap-4 p-4 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
                                                                <div className="flex-1 w-full">
                                                                    <WysiwygEditor 
                                                                        value={pair.left} 
                                                                        onChange={(val) => handleMatchingPairChange(q.id, i, 'left', val)} 
                                                                        minHeight="120px" 
                                                                        placeholder="Item Kiri"
                                                                    />
                                                                </div>
                                                                <div className="text-slate-300 dark:text-slate-600 hidden md:block select-none">→</div>
                                                                <div className="flex-1 w-full flex items-center gap-3">
                                                                    <div className="flex-1">
                                                                        <WysiwygEditor 
                                                                            value={pair.right} 
                                                                            onChange={(val) => handleMatchingPairChange(q.id, i, 'right', val)} 
                                                                            minHeight="120px" 
                                                                            placeholder="Pasangan Kanan"
                                                                        />
                                                                    </div>
                                                                    <button onClick={() => handleDeleteMatchingPair(q.id, i)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all shrink-0"><TrashIcon className="w-4 h-4"/></button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <button onClick={() => handleAddMatchingPair(q.id)} className="ml-2 mt-2 text-xs font-bold text-primary dark:text-indigo-400 hover:text-primary-focus flex items-center gap-1 opacity-60 hover:opacity-100"><PlusCircleIcon className="w-4 h-4" /> Tambah Pasangan</button>
                                                    </div>
                                                )}

                                                 {(q.questionType === 'FILL_IN_THE_BLANK' || q.questionType === 'ESSAY') && (
                                                    <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-700">
                                                        <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3 block">{q.questionType === 'ESSAY' ? 'Rubrik / Poin Jawaban' : 'Kunci Jawaban Singkat'}</label>
                                                        <WysiwygEditor value={q.correctAnswer || ''} onChange={(val) => handleCorrectAnswerChange(q.id, val)} placeholder="Tulis kunci jawaban..." minHeight="60px" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="relative py-2 group/insert">
                                    <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-gray-200 dark:border-slate-700 group-hover/insert:border-primary/30 transition-colors"></div></div>
                                    <div className="relative flex justify-center"><button onClick={() => openTypeSelectionModal(index)} className="bg-white dark:bg-slate-900 text-gray-400 dark:text-slate-500 group-hover/insert:text-primary dark:group-hover/insert:text-primary group-hover/insert:bg-primary/5 dark:group-hover/insert:bg-primary/20 px-4 py-1 text-xs font-semibold rounded-full border border-gray-200 dark:border-slate-700 group-hover/insert:border-primary/30 shadow-sm transition-all transform hover:scale-105 flex items-center gap-1 opacity-0 group-hover/insert:opacity-100 focus:opacity-100"><PlusCircleIcon className="w-4 h-4" /> Sisipkan Soal</button></div>
                                </div>
                            </React.Fragment>
                        );
                    })}
                </div>
                 <div className="mt-12 mb-20 text-center"><button onClick={() => openTypeSelectionModal(null)} className="flex items-center gap-2 text-sm text-primary dark:text-indigo-400 font-bold hover:text-primary-focus mx-auto transition-all bg-white dark:bg-slate-800 border border-primary/20 dark:border-indigo-500/30 px-8 py-4 rounded-2xl hover:bg-primary dark:hover:bg-indigo-600 hover:text-white shadow-sm hover:shadow-lg active:scale-95 group"><PlusCircleIcon className="w-5 h-5 group-hover:text-white transition-colors" /> Tambah Soal Baru</button></div>
             </div>
             {/* ... configuration section ... */}
             <div className="pt-10">
                 <div className="p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm mb-6">
                    <h2 className="text-xl font-bold text-neutral dark:text-white">{isEditing ? '2. Konfigurasi' : '4. Konfigurasi'}</h2>
                     <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Pengaturan waktu dan keamanan ujian.</p>
                </div>
                {/* ... config content ... */}
                <div className="bg-white dark:bg-slate-800 p-8 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-sm space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                        <div className="md:col-span-2 pb-2 border-b border-gray-100 dark:border-slate-700 mb-2"><h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Informasi Umum</h4></div>
                        
                        <div><label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Mata Pelajaran</label><div onClick={() => setIsSubjectModalOpen(true)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all text-sm font-medium flex items-center justify-between cursor-pointer hover:bg-white dark:hover:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600"><span className={config.subject ? 'text-slate-800 dark:text-slate-200' : 'text-gray-400'}>{config.subject || 'Pilih Mata Pelajaran...'}</span><ArrowPathIcon className="w-4 h-4 text-gray-400 rotate-90" /></div></div>
                        <div><label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Kelas</label><div onClick={() => setIsClassModalOpen(true)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all text-sm font-medium flex items-center justify-between cursor-pointer hover:bg-white dark:hover:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600"><span className={config.classLevel && config.classLevel !== 'Lainnya' ? 'text-slate-800 dark:text-slate-200' : 'text-gray-400'}>{config.classLevel === 'Lainnya' || !config.classLevel ? 'Pilih Kelas...' : config.classLevel}</span><ArrowPathIcon className="w-4 h-4 text-gray-400 rotate-90" /></div></div>

                        <div><label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Jenis Evaluasi</label><div onClick={() => setIsExamTypeModalOpen(true)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all text-sm font-medium flex items-center justify-between cursor-pointer hover:bg-white dark:hover:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600"><span className={config.examType && config.examType !== 'Lainnya' ? 'text-slate-800 dark:text-slate-200' : 'text-gray-400'}>{config.examType === 'Lainnya' || !config.examType ? 'Pilih Jenis...' : config.examType}</span><ArrowPathIcon className="w-4 h-4 text-gray-400 rotate-90" /></div></div>
                         <div className="md:col-span-2"><label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Instruksi Pengerjaan</label><textarea name="description" value={config.description || ''} onChange={handleConfigChange} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm min-h-[100px] shadow-inner text-slate-800 dark:text-slate-200" placeholder="Contoh: Baca doa sebelum mengerjakan, dilarang menoleh ke belakang..." /></div>
                    </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 pt-8 border-t border-gray-100 dark:border-slate-700">
                         <div className="md:col-span-2 pb-2 border-b border-gray-100 dark:border-slate-700 mb-2"><h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Waktu & Keamanan</h4></div>
                        <div><label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Tanggal Pelaksanaan</label><input type="date" name="date" value={new Date(config.date).toISOString().split('T')[0]} onChange={handleConfigChange} className="w-full p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm text-slate-800 dark:text-slate-200" /></div>
                        <div><label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Jam Mulai</label><input type="time" name="startTime" value={config.startTime} onChange={handleConfigChange} className="w-full p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm text-slate-800 dark:text-slate-200" /></div>
                        <div><label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Durasi Pengerjaan (Menit)</label><input type="number" name="timeLimit" value={config.timeLimit} onChange={handleConfigChange} className="w-full p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm text-slate-800 dark:text-slate-200" /></div>
                        
                        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                           <label className="flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group shadow-sm"><input type="checkbox" name="shuffleQuestions" checked={config.shuffleQuestions} onChange={handleConfigChange} className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-primary transition-colors">Acak Soal</span></label>
                           <label className="flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group shadow-sm"><input type="checkbox" name="shuffleAnswers" checked={config.shuffleAnswers} onChange={handleConfigChange} className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-primary transition-colors">Acak Opsi</span></label>
                           <label className="flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group shadow-sm"><input type="checkbox" name="allowRetakes" checked={config.allowRetakes} onChange={handleConfigChange} className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-primary transition-colors">Izinkan Kerjakan Ulang</span></label>
                           <label className="flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group shadow-sm"><input type="checkbox" name="detectBehavior" checked={config.detectBehavior} onChange={handleConfigChange} className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-primary transition-colors">Deteksi Kecurangan</span></label>
                           {config.detectBehavior && (
                            <label className="flex items-center ml-6 p-2 rounded-lg transition-colors cursor-pointer group bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400">
                                <input 
                                    type="checkbox" 
                                    name="continueWithPermission" 
                                    checked={config.continueWithPermission} 
                                    onChange={handleConfigChange} 
                                    className="h-4 w-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500" 
                                />
                                <span className="ml-2 text-xs font-bold uppercase tracking-tight">Kunci Akses Jika Melanggar</span>
                            </label>
                           )}
                        </div>

                        <div className="md:col-span-2 space-y-4 pt-6 mt-2 border-t border-gray-100 dark:border-slate-700">
                             <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Pengaturan Hasil & Monitor</h4>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className={`flex flex-col p-3 rounded-xl border transition-colors shadow-sm ${hasEssay ? 'bg-amber-50 border-amber-200 opacity-80' : 'border-gray-100 hover:bg-slate-50 cursor-pointer group'}`}>
                                    <label className={`flex items-center ${hasEssay ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                        <input type="checkbox" name="showResultToStudent" checked={config.showResultToStudent} onChange={handleConfigChange} disabled={hasEssay} className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300 disabled:text-gray-400" />
                                        <span className={`ml-3 text-sm font-medium ${hasEssay ? 'text-gray-500' : 'text-gray-700 group-hover:text-primary'}`}>Umumkan Nilai Otomatis</span>
                                    </label>
                                    {hasEssay && <div className="mt-2 text-xs font-bold text-amber-600 flex items-center gap-1"><ExclamationTriangleIcon className="w-3 h-3"/> Dinonaktifkan otomatis karena terdapat soal Esai.</div>}
                                </div>
                                <label className="flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group shadow-sm"><input type="checkbox" name="showCorrectAnswer" checked={config.showCorrectAnswer} onChange={handleConfigChange} className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-primary transition-colors">Tampilkan Kunci (Review)</span></label>
                                <label className="flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group shadow-sm"><input type="checkbox" name="trackLocation" checked={config.trackLocation} onChange={handleConfigChange} className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-primary transition-colors">Lacak Lokasi (GPS)</span></label>
                             </div>

                             {/* Mode Selection Block */}
                             <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Mode Operasi</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Mode Normal (Left - Default) */}
                                    <div 
                                        onClick={() => setConfig(prev => ({ ...prev, disableRealtime: true, enablePublicStream: false }))}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${config.disableRealtime ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-200'}`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${config.disableRealtime ? 'border-emerald-500' : 'border-slate-400'}`}>
                                                {config.disableRealtime && <div className="w-2 h-2 bg-emerald-500 rounded-full" />}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <WifiIcon className={`w-4 h-4 ${config.disableRealtime ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                                                <span className="font-bold text-sm text-slate-800 dark:text-white">Mode Normal</span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed ml-6">
                                            Menonaktifkan fitur pantauan orang tua dan progres ujian untuk menghemat kuota koneksi.
                                        </p>
                                    </div>

                                    {/* Mode Realtime (Right) */}
                                    <div 
                                        onClick={() => setConfig(prev => ({ ...prev, disableRealtime: false, enablePublicStream: true }))}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${!config.disableRealtime ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-200'}`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${!config.disableRealtime ? 'border-indigo-500' : 'border-slate-400'}`}>
                                                {!config.disableRealtime && <div className="w-2 h-2 bg-indigo-500 rounded-full" />}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <SignalIcon className={`w-4 h-4 ${!config.disableRealtime ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                                                <span className="font-bold text-sm text-slate-800 dark:text-white">Mode Realtime</span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed ml-6">
                                            Pantauan orang tua dan progres ujian akan aktif namun menghabiskan lebih banyak kuota koneksi.
                                        </p>
                                    </div>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* ... footer buttons ... */}
            <div className="text-center pt-10 pb-20">
                {isEditing ? (
                    <div className="flex justify-center items-center gap-4">
                        <button onClick={onCancel} className="bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-600 font-bold py-4 px-10 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-95">Batal</button>
                        {onSaveDraft && <button onClick={onSaveDraft} className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 font-bold py-4 px-10 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all shadow-sm flex items-center gap-2 active:scale-95"><PencilIcon className="w-5 h-5" /> Perbarui Draf</button>}
                        <button onClick={onSave} className="bg-primary dark:bg-indigo-600 text-white font-bold py-4 px-14 rounded-2xl hover:bg-primary-focus dark:hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-indigo-900/30 transform hover:-translate-y-1 active:scale-95">Simpan Perubahan</button>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col sm:flex-row justify-center gap-4 items-center">
                            {onSaveDraft && <button onClick={onSaveDraft} className="w-full sm:w-auto bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-2 border-slate-100 dark:border-slate-700 font-bold py-4 px-10 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2 active:scale-95"><PencilIcon className="w-5 h-5" /> Simpan Draf</button>}
                            <button onClick={onSave} className="w-full sm:w-auto bg-emerald-600 text-white font-bold py-4 px-14 rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 dark:shadow-emerald-900/30 transform hover:-translate-y-1 flex items-center justify-center gap-3 active:scale-95"><CheckCircleIcon className="w-6 h-6" /> Publikasikan Sekarang</button>
                        </div>
                        {generatedCode && (
                            <div ref={generatedCodeSectionRef} className="mt-12 p-1 rounded-3xl animate-fade-in text-center max-w-md mx-auto bg-gradient-to-tr from-emerald-400 to-teal-500 shadow-2xl">
                                <div className="bg-white dark:bg-slate-900 p-8 rounded-[1.4rem] text-center">
                                    <h4 className="font-black text-2xl text-slate-800 dark:text-white mb-2">Ujian Aktif!</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium leading-relaxed">Berikan kode unik ini kepada siswa Anda agar mereka dapat mulai mengerjakan.</p>
                                    <div className="flex flex-col gap-4">
                                        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border-2 border-emerald-50 dark:border-emerald-900/30 shadow-inner group transition-all hover:bg-emerald-50/30 dark:hover:bg-emerald-900/20"><span className="text-4xl font-black tracking-[0.3em] text-emerald-600 dark:text-emerald-400 font-mono block">{generatedCode}</span></div>
                                        <button onClick={() => {navigator.clipboard.writeText(generatedCode); alert("Kode berhasil disalin!");}} className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors py-2">Salin Kode Akses</button>
                                    </div>
                                    <button onClick={onReset} className="mt-8 w-full bg-slate-900 dark:bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-black dark:hover:bg-indigo-700 transition-all shadow-lg active:scale-95">Selesai & Tutup</button>
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
