
import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Question, QuestionType, ExamConfig } from '../../types';
/* Added missing icon imports ChevronDownIcon and CogIcon */
import { 
    TrashIcon, XMarkIcon, PlusCircleIcon, PhotoIcon, 
    FileTextIcon, ListBulletIcon, CheckCircleIcon, PencilIcon, FileWordIcon, CheckIcon, ArrowLeftIcon,
    TableCellsIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon, AlignJustifyIcon,
    StrikethroughIcon, SuperscriptIcon, SubscriptIcon, EraserIcon, FunctionIcon,
    ArrowPathIcon, ChevronDownIcon, CogIcon
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[85vh]">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div><h3 className="font-bold text-lg text-slate-800">{title}</h3><p className="text-xs text-slate-500">Silakan pilih salah satu opsi dari daftar.</p></div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"><XMarkIcon className="w-5 h-5"/></button>
                </div>
                <div className="p-4 bg-slate-50/50"><input type="text" placeholder={searchPlaceholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 pl-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all shadow-sm" autoFocus /></div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {filteredOptions.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {filteredOptions.map((opt) => (
                                <button key={opt} onClick={() => { onSelect(opt); onClose(); }} className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border flex items-center justify-between group ${selectedValue === opt ? 'bg-primary text-white border-primary shadow-md shadow-primary/20' : 'bg-white text-slate-600 border-gray-100 hover:border-primary/30 hover:bg-slate-50 hover:shadow-sm'}`}><span>{opt}</span>{selectedValue === opt && <CheckIcon className="w-4 h-4 text-white" />}</button>
                            ))}
                        </div>
                    ) : (<div className="text-center py-10 text-slate-400"><p className="text-sm">Opsi tidak ditemukan.</p></div>)}
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
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-xs border border-gray-100">
                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><TableCellsIcon className="w-4 h-4"/> Sisipkan Tabel</h3>
                <div className="space-y-4">
                    <div><label className="text-xs font-bold text-gray-500 block mb-1">Jumlah Baris</label><input type="number" min="1" max="20" value={rows} onChange={e => setRows(Math.max(1, parseInt(e.target.value) || 1))} className="w-full p-2 border rounded text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-200 outline-none" /></div>
                    <div><label className="text-xs font-bold text-gray-500 block mb-1">Jumlah Kolom</label><input type="number" min="1" max="10" value={cols} onChange={e => setCols(Math.max(1, parseInt(e.target.value) || 1))} className="w-full p-2 border rounded text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-200 outline-none" /></div>
                    <div className="flex gap-2 justify-end pt-2"><button onClick={onClose} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded">Batal</button><button onClick={() => { onInsert(rows, cols); onClose(); }} className="px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow">Sisipkan</button></div>
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
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
                <div className="bg-gray-50 p-3 border-b flex justify-between items-center"><h3 className="text-sm font-bold text-gray-700">Rumus Matematika</h3><button onClick={onClose}><XMarkIcon className="w-5 h-5 text-gray-400 hover:text-gray-600"/></button></div>
                <div className="flex border-b overflow-x-auto">{['BASIC', 'CALCULUS', 'MATRIX', 'SYMBOLS'].map((t: any) => (<button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 text-[10px] font-bold tracking-wider ${tab === t ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-gray-500 hover:bg-gray-50'}`}>{t === 'BASIC' ? 'ALJABAR' : t === 'CALCULUS' ? 'KALKULUS' : t === 'MATRIX' ? 'MATRIKS' : 'SIMBOL'}</button>))}</div>
                <div className="p-5 overflow-y-auto">
                    {tab === 'BASIC' && (<div className="space-y-6"><div className="bg-gray-50 p-3 rounded-lg border border-gray-100"><p className="text-[10px] font-bold text-gray-400 uppercase mb-3 text-center">Pecahan</p><div className="flex flex-col gap-2"><div className="flex items-center justify-center gap-3"><input placeholder="Int" className="w-12 h-10 text-center text-sm p-1 border rounded" value={val3} onChange={e => setVal3(e.target.value)} /><div className="flex flex-col items-center gap-1"><input placeholder="Atas" className="w-16 text-center text-sm p-1 border rounded" value={val1} onChange={e => setVal1(e.target.value)} /><div className="w-20 h-0.5 bg-gray-800 rounded-full"></div><input placeholder="Bawah" className="w-16 text-center text-sm p-1 border rounded" value={val2} onChange={e => setVal2(e.target.value)} /></div></div><button onClick={() => insertStructure('FRAC')} className="mt-2 w-full text-xs bg-indigo-600 text-white font-bold py-1.5 rounded">Sisipkan</button></div></div><div className="bg-gray-50 p-3 rounded-lg border border-gray-100"><p className="text-[10px] font-bold text-gray-400 uppercase mb-2 text-center">Akar</p><div className="flex items-end gap-1 justify-center"><input placeholder="n" className="w-8 text-center text-xs p-1 border rounded mb-4" value={val1} onChange={e => setVal1(e.target.value)} /><span className="text-3xl text-gray-400 font-light">√</span><input placeholder="Nilai" className="w-24 text-sm p-1 border rounded mb-1" value={val2} onChange={e => setVal2(e.target.value)} /><button onClick={() => insertStructure('ROOT')} className="mb-1 text-xs bg-white border font-bold px-3 py-1.5 rounded">OK</button></div></div></div>)}
                    {tab === 'CALCULUS' && (<div className="space-y-4"><div className="border p-3 rounded bg-white"><p className="text-[10px] font-bold mb-2">Limit</p><div className="flex items-center gap-1 text-sm">lim <div className="flex flex-col gap-1"><input placeholder="x" className="w-8 p-0.5 border rounded text-center text-xs" value={val1} onChange={e => setVal1(e.target.value)} />➜<input placeholder="∞" className="w-8 p-0.5 border rounded text-center text-xs" value={val2} onChange={e => setVal2(e.target.value)} /></div><input placeholder="f(x)" className="w-24 p-1 border rounded ml-1" value={val3} onChange={e => setVal3(e.target.value)} /><button onClick={() => insertStructure('LIMIT')} className="ml-auto text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold">Add</button></div></div><div className="border p-3 rounded bg-white"><p className="text-[10px] font-bold mb-2">Integral / Sigma</p><div className="flex items-center gap-2"><div className="flex flex-col items-center"><input placeholder="b" className="w-10 text-center text-xs border rounded mb-1" value={val2} onChange={e => setVal2(e.target.value)} /><span className="text-2xl text-gray-400">∫/∑</span><input placeholder="a" className="w-10 text-center text-xs border rounded mt-1" value={val1} onChange={e => setVal1(e.target.value)} /></div><input placeholder="Fungsi" className="flex-1 p-1 border rounded" value={val3} onChange={e => setVal3(e.target.value)} /></div><div className="flex gap-2 mt-2"><button onClick={() => insertStructure('INT')} className="flex-1 text-xs bg-indigo-50 text-indigo-600 py-1 rounded">Integral</button><button onClick={() => insertStructure('SUM')} className="flex-1 text-xs bg-emerald-50 text-emerald-600 py-1 rounded">Sigma</button></div></div></div>)}
                    {tab === 'MATRIX' && (<div><div className="flex gap-4 justify-center mb-4"><label className="text-[10px] font-bold">Baris <input type="number" min="1" max="5" value={rows} onChange={e => setRows(Math.max(1, parseInt(e.target.value) || 1))} className="w-10 ml-1 border rounded p-1" /></label><label className="text-[10px] font-bold">Kolom <input type="number" min="1" max="5" value={cols} onChange={e => setCols(Math.max(1, parseInt(e.target.value) || 1))} className="w-10 ml-1 border rounded p-1" /></label></div><div className="grid gap-1 justify-center bg-gray-100 p-2 rounded" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>{matData.map((rArr, r) => rArr.map((val, c) => (<input key={`${r}-${c}`} value={val} onChange={e => updateMatrix(r, c, e.target.value)} className="w-10 h-8 text-center border rounded text-xs focus:bg-indigo-50 outline-none" placeholder="0" />)))}</div><button onClick={() => insertStructure('MATRIX')} className="w-full mt-4 bg-indigo-600 text-white py-2 rounded text-xs font-bold shadow hover:bg-indigo-700">Sisipkan Matriks</button></div>)}
                    {tab === 'SYMBOLS' && (<div className="grid grid-cols-5 gap-2">{symbols.map((s, i) => (<button key={i} onClick={() => insertStructure('SYMBOL', s.v)} className="aspect-square bg-gray-50 border rounded hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors text-sm font-serif">{s.l}</button>))}</div>)}
                </div>
            </div>
        </div>
    );
};

const WysiwygEditor: React.FC<{ value: string; onChange: (val: string) => void; placeholder?: string; minHeight?: string; isCompact?: boolean }> = ({ value, onChange, placeholder = "Ketik di sini...", minHeight = "120px", isCompact = false }) => {
    const editorRef = useRef<HTMLDivElement>(null); const fileInputRef = useRef<HTMLInputElement>(null); const savedRange = useRef<Range | null>(null);
    const [activeTab, setActiveTab] = useState<'FORMAT' | 'INSERT' | 'MATH'>(isCompact ? 'MATH' : 'FORMAT'); const [activeCmds, setActiveCmds] = useState<string[]>([]); const [isInsideTable, setIsInsideTable] = useState(false); const [showMath, setShowMath] = useState(false); const [showTable, setShowTable] = useState(false);
    useEffect(() => { if (editorRef.current && value !== editorRef.current.innerHTML) { if (!editorRef.current.innerText.trim() && !value) { editorRef.current.innerHTML = ""; } else if (document.activeElement !== editorRef.current) { editorRef.current.innerHTML = value; } } }, [value]);
    const handleInput = () => { if (editorRef.current) { onChange(editorRef.current.innerHTML); saveSelection(); checkActiveFormats(); } };
    const saveSelection = () => { const sel = window.getSelection(); if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) { savedRange.current = sel.getRangeAt(0).cloneRange(); } };
    const restoreSelection = () => { const sel = window.getSelection(); if (sel && savedRange.current) { sel.removeAllRanges(); sel.addRange(savedRange.current); } else if (editorRef.current) { editorRef.current.focus(); const range = document.createRange(); range.selectNodeContents(editorRef.current); range.collapse(false); sel?.removeAllRanges(); sel?.addRange(range); } };
    const checkActiveFormats = () => { saveSelection(); const cmds = ['bold', 'italic', 'underline', 'strikethrough', 'subscript', 'superscript', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull', 'insertUnorderedList', 'insertOrderedList']; const active = cmds.filter(cmd => document.queryCommandState(cmd)); setActiveCmds(active); const selection = window.getSelection(); let inTable = false; if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) { let node = selection.anchorNode; while (node && node !== editorRef.current) { if (node.nodeName === 'TABLE' || node.nodeName === 'TD' || node.nodeName === 'TH') { inTable = true; break; } node = node.parentNode; } } setIsInsideTable(inTable); };
    const runCmd = (cmd: string, val?: string) => { restoreSelection(); if(editorRef.current) editorRef.current.focus(); execCmd(cmd, val); saveSelection(); checkActiveFormats(); };
    const insertTable = (rows: number, cols: number) => { let html = '<table class="border-collapse border border-slate-300 my-2 w-full text-sm"><thead><tr>'; for(let c=0; c<cols; c++) html += `<th class="border border-slate-300 p-2 bg-slate-50">H${c+1}</th>`; html += '</tr></thead><tbody>'; for(let r=0; r<rows; r++) { html += '<tr>'; for(let c=0; c<cols; c++) html += `<td class="border border-slate-300 p-2">Data</td>`; html += '</tr>'; } html += '</tbody></table><p><br/></p>'; runCmd('insertHTML', html); handleInput(); };
    const deleteCurrentTable = () => { const selection = window.getSelection(); if (selection && selection.rangeCount > 0) { let node = selection.anchorNode; while (node && node !== editorRef.current) { if (node.nodeName === 'TABLE') { node.parentNode?.removeChild(node); handleInput(); setIsInsideTable(false); return; } node = node.parentNode; } } };
    const insertMath = (latex: string) => { if ((window as any).katex) { const html = (window as any).katex.renderToString(latex, { throwOnError: false }); const wrapper = `&nbsp;<span class="math-visual inline-block px-0.5 rounded select-none cursor-pointer hover:bg-indigo-50 align-middle" contenteditable="false" data-latex="${latex.replace(/"/g, '&quot;')}">${html}</span><span style="font-size: 100%; font-family: inherit; font-weight: normal; font-style: normal; color: inherit;">&nbsp;</span>`; runCmd('insertHTML', wrapper); handleInput(); } };
    const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) { const file = e.target.files[0]; const reader = new FileReader(); reader.onload = async (ev) => { const rawDataUrl = ev.target?.result as string; try { const dataUrl = await compressImage(rawDataUrl, 0.7); const imgTag = `<img src="${dataUrl}" alt="Inserted Image" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;" />&nbsp;`; runCmd('insertHTML', imgTag); handleInput(); } catch (error) { console.error("Image compression failed", error); } }; reader.readAsDataURL(file); } e.target.value = ''; };
    const editorStyle = `.wysiwyg-content table { width: 100%; border-collapse: collapse; margin: 0.5rem 0; } .wysiwyg-content th, .wysiwyg-content td { border: 1px solid #cbd5e1; padding: 0.5rem; min-width: 30px; } .wysiwyg-content th { background-color: #f8fafc; font-weight: bold; text-align: left; } .wysiwyg-content:empty:before { content: attr(data-placeholder); color: #94a3b8; font-style: italic; } .wysiwyg-content ul { list-style-type: disc; padding-left: 1.5rem; } .wysiwyg-content ol { list-style-type: decimal; padding-left: 1.5rem; } .wysiwyg-content blockquote { border-left: 3px solid #cbd5e1; padding-left: 1rem; color: #64748b; font-style: italic; }`;
    const Btn: React.FC<{ cmd?: string; label?: string; icon?: React.FC<any>; active?: boolean; onClick?: () => void }> = ({ cmd, label, icon: Icon, active, onClick }) => (<button type="button" onMouseDown={(e) => { e.preventDefault(); onClick ? onClick() : runCmd(cmd!); }} className={`min-w-[28px] h-7 px-1.5 rounded flex items-center justify-center transition-all ${active ? 'bg-indigo-100 text-indigo-700 shadow-inner' : 'hover:bg-gray-100 text-gray-600'}`} title={label}>{Icon ? <Icon className="w-4 h-4"/> : <span className="text-xs font-bold font-serif">{label}</span>}</button>);
    
    return (
        <div className={`relative group rounded-xl border border-gray-200 bg-white transition-all focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 ${isCompact ? 'shadow-sm' : ''}`}>
            <style>{editorStyle}</style>
            <div className="border-b border-gray-100 bg-gray-50/50 rounded-t-xl select-none">
                <div className="flex px-2 pt-1 gap-1 border-b border-gray-200/50 justify-between items-end">
                    <div className="flex gap-1">
                        {!isCompact ? (
                            ['FORMAT', 'INSERT', 'MATH'].map((t: any) => (
                                <button key={t} onClick={() => setActiveTab(t)} className={`px-3 py-1.5 text-[10px] font-bold tracking-wider rounded-t-lg transition-colors ${activeTab === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}>
                                    {t === 'MATH' ? 'RUMUS' : t === 'FORMAT' ? 'FORMAT' : 'SISIPKAN'}
                                </button>
                            ))
                        ) : (
                             ['FORMAT', 'MATH'].map((t: any) => (
                                <button key={t} onClick={() => setActiveTab(t)} className={`px-3 py-1.5 text-[10px] font-bold tracking-wider rounded-t-lg transition-colors ${activeTab === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}>
                                    {t === 'MATH' ? 'RUMUS' : 'FONT'}
                                </button>
                            ))
                        )}
                    </div>
                </div>
                <div className="p-1 flex flex-wrap gap-1 items-center bg-white rounded-b-none min-h-[32px]">
                    {activeTab === 'FORMAT' && (
                        <>
                            <Btn cmd="bold" label="B" active={activeCmds.includes('bold')} />
                            <Btn cmd="italic" label="I" active={activeCmds.includes('italic')} />
                            {!isCompact && <Btn cmd="underline" label="U" active={activeCmds.includes('underline')} />}
                            <Btn cmd="superscript" icon={SuperscriptIcon} active={activeCmds.includes('superscript')} />
                            <Btn cmd="subscript" icon={SubscriptIcon} active={activeCmds.includes('subscript')} />
                            <Btn cmd="removeFormat" icon={EraserIcon} />
                        </>
                    )}
                    {activeTab === 'INSERT' && !isCompact && (
                        <>
                            <button onMouseDown={(e) => {e.preventDefault(); fileInputRef.current?.click();}} className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 text-gray-700 rounded text-[10px] font-bold hover:bg-gray-100 transition-colors"><PhotoIcon className="w-3.5 h-3.5"/> Gambar</button>
                            <button onMouseDown={(e) => {e.preventDefault(); setShowTable(true);}} className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold hover:bg-indigo-100 transition-colors"><TableCellsIcon className="w-3.5 h-3.5"/> Tabel</button>
                        </>
                    )}
                    {activeTab === 'MATH' && (
                        <div className="flex items-center gap-2 w-full">
                            <button onMouseDown={(e) => {e.preventDefault(); setShowMath(true);}} className="flex-1 flex items-center justify-center gap-2 px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded shadow-sm text-[10px] font-bold hover:from-indigo-600 hover:to-purple-700 transition-all">
                                <FunctionIcon className="w-3.5 h-3.5" /> Rumus
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <div ref={editorRef} className="wysiwyg-content p-3 outline-none text-sm text-slate-800 leading-relaxed overflow-auto" style={{ minHeight }} contentEditable={true} onInput={handleInput} onKeyUp={checkActiveFormats} onMouseUp={checkActiveFormats} onBlur={saveSelection} onClick={checkActiveFormats} data-placeholder={placeholder} spellCheck={false} />
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
    
    useEffect(() => { if (!isEditing && !generatedCode) { const timer = setTimeout(() => { if (questionsSectionRef.current) questionsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 300); return () => clearTimeout(timer); } }, [isEditing, generatedCode]);
    useEffect(() => { if (generatedCode && generatedCodeSectionRef.current) { setTimeout(() => { generatedCodeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 200); } }, [generatedCode]);

    const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setConfig(prev => {
                const newConfig = { ...prev, [name]: checked };
                if (name === 'detectBehavior' && !checked) newConfig.continueWithPermission = false;
                if (name === 'disableRealtime' && checked) newConfig.enablePublicStream = false;
                return newConfig;
            });
        } else {
            setConfig(prev => ({ ...prev, [name]: name === 'timeLimit' ? parseInt(value) : value }));
        }
    };
    const handleSubjectSelect = (subject: string) => setConfig(prev => ({ ...prev, subject }));
    const handleQuestionTextChange = (id: string, text: string) => setQuestions(prev => prev.map(q => q.id === id ? { ...q, questionText: text } : q));
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
    
    const handleTrueFalseRowTextChange = (qId: string, idx: number, val: string) => { setQuestions(prev => prev.map(q => { if (q.id === qId && q.trueFalseRows) { const newRows = [...q.trueFalseRows]; newRows[idx] = { ...newRows[idx], text: val }; return { ...q, trueFalseRows: newRows }; } return q; })); };
    const handleTrueFalseRowAnswerChange = (qId: string, idx: number, val: boolean) => { setQuestions(prev => prev.map(q => { if (q.id === qId && q.trueFalseRows) { const newRows = [...q.trueFalseRows]; newRows[idx] = { ...newRows[idx], answer: val }; return { ...q, trueFalseRows: newRows }; } return q; })); };
    const handleAddTrueFalseRow = (qId: string) => { setQuestions(prev => prev.map(q => { if (q.id === qId && q.trueFalseRows) { const nextNum = q.trueFalseRows.length + 1; return { ...q, trueFalseRows: [...q.trueFalseRows, { text: `Pernyataan ${nextNum}`, answer: true }] }; } return q; })); };
    const handleDeleteTrueFalseRow = (qId: string, idx: number) => { setQuestions(prev => prev.map(q => { if (q.id === qId && q.trueFalseRows && q.trueFalseRows.length > 1) { const newRows = q.trueFalseRows.filter((_, i) => i !== idx); return { ...q, trueFalseRows: newRows }; } return q; })); };

    const handleMatchingPairChange = (qId: string, idx: number, field: 'left' | 'right', value: string) => { setQuestions(prev => prev.map(q => { if (q.id === qId && q.matchingPairs) { const newPairs = [...q.matchingPairs]; newPairs[idx] = { ...newPairs[idx], [field]: value }; return { ...q, matchingPairs: newPairs }; } return q; })); };
    const handleAddMatchingPair = (qId: string) => { setQuestions(prev => prev.map(q => { if (q.id === qId && q.matchingPairs) return { ...q, matchingPairs: [...q.matchingPairs, { left: '', right: '' }] }; return q; })); };
    const handleDeleteMatchingPair = (qId: string, idx: number) => { setQuestions(prev => prev.map(q => { if (q.id === qId && q.matchingPairs && q.matchingPairs.length > 1) { const newPairs = q.matchingPairs.filter((_, i) => i !== idx); return { ...q, matchingPairs: newPairs }; } return q; })); };

    const createNewQuestion = (type: QuestionType): Question => {
        const base = { id: `q-${Date.now()}-${Math.random()}`, questionText: '', questionType: type };
        switch (type) {
            case 'INFO': return { ...base }; case 'MULTIPLE_CHOICE': return { ...base, options: ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'], correctAnswer: 'Opsi A' }; case 'COMPLEX_MULTIPLE_CHOICE': return { ...base, options: ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'], correctAnswer: '' }; case 'TRUE_FALSE': return { ...base, trueFalseRows: [{ text: 'Pernyataan 1', answer: true }, { text: 'Pernyataan 2', answer: false }] }; case 'MATCHING': return { ...base, matchingPairs: [{ left: 'Item A', right: 'Pasangan A' }, { left: 'Item B', right: 'Pasangan B' }] }; case 'FILL_IN_THE_BLANK': return { ...base, correctAnswer: '' }; case 'ESSAY': default: return { ...base };
        }
    };
    const openTypeSelectionModal = (index: number | null = null) => { setInsertIndex(index); setIsTypeSelectionModalOpen(true); };
    const handleSelectQuestionType = (type: QuestionType) => {
        const newQuestion = createNewQuestion(type);
        if (insertIndex === null) { setQuestions(prev => [...prev, newQuestion]); setTimeout(() => { document.getElementById(newQuestion.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100); } 
        else { const newQuestions = [...questions]; newQuestions.splice(insertIndex + 1, 0, newQuestion); setQuestions(newQuestions); }
        setIsTypeSelectionModalOpen(false); setInsertIndex(null);
    };
    const handleAddOption = (questionId: string) => { setQuestions(prev => prev.map(q => { if (q.id === questionId && q.options) { const nextChar = String.fromCharCode(65 + q.options.length); const newOptions = [...q.options, `Opsi ${nextChar}`]; return { ...q, options: newOptions }; } return q; })); };
    const handleDeleteOption = (questionId: string, indexToRemove: number) => { setQuestions(prev => prev.map(q => { if (q.id === questionId && q.options && q.options.length > 1) { const optionToRemove = q.options[indexToRemove]; const newOptions = q.options.filter((_, i) => i !== indexToRemove); let newCorrectAnswer = q.correctAnswer; if (q.questionType === 'MULTIPLE_CHOICE') { if (q.correctAnswer === optionToRemove) newCorrectAnswer = newOptions[0] || ''; } else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') { let answers = q.correctAnswer ? q.correctAnswer.split(',') : []; answers = answers.filter(a => a !== optionToRemove); newCorrectAnswer = answers.join(','); } return { ...q, options: newOptions, correctAnswer: newCorrectAnswer }; } return q; })); };

    const renderTypeSelectionModal = () => { 
        if (!isTypeSelectionModalOpen) return null; 
        const types: {type: QuestionType, label: string, desc: string, icon: React.FC<any>}[] = [
            { type: 'INFO', label: 'Keterangan / Info', desc: 'Hanya teks informasi, tanpa pertanyaan.', icon: FileTextIcon }, 
            { type: 'MULTIPLE_CHOICE', label: 'Pilihan Ganda', desc: 'Satu jawaban benar.', icon: ListBulletIcon }, 
            { type: 'COMPLEX_MULTIPLE_CHOICE', label: 'Pilihan Ganda Kompleks', desc: 'Lebih dari satu jawaban.', icon: CheckCircleIcon }, 
            { type: 'FILL_IN_THE_BLANK', label: 'Isian Singkat', desc: 'Jawaban teks pendek.', icon: PencilIcon }, 
            { type: 'ESSAY', label: 'Uraian / Esai', desc: 'Jawaban panjang.', icon: FileWordIcon }, 
            { type: 'TRUE_FALSE', label: 'Benar / Salah', desc: 'Pernyataan logis.', icon: CheckIcon }, 
            { type: 'MATCHING', label: 'Menjodohkan', desc: 'Menghubungkan pasangan.', icon: ArrowLeftIcon }
        ]; 
        return (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[150] animate-fade-in backdrop-blur-sm">
                <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-white">
                    <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-black text-xl text-slate-800 tracking-tight">Pilih Tipe Soal</h3>
                        <button onClick={() => setIsTypeSelectionModalOpen(false)} className="p-2.5 rounded-xl hover:bg-white text-slate-400 hover:text-slate-600 transition-all border border-transparent hover:border-slate-100 shadow-sm"><XMarkIcon className="w-6 h-6"/></button>
                    </div>
                    <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        {types.map((t) => (
                            <button key={t.type} onClick={() => handleSelectQuestionType(t.type)} className="flex items-start gap-4 p-5 border-2 border-slate-50 rounded-2xl hover:border-indigo-100 hover:bg-indigo-50/30 hover:shadow-lg transition-all text-left group">
                                <div className="bg-slate-100 p-3 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                    <t.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="font-black text-slate-800 group-hover:text-indigo-600 transition-colors tracking-tight">{t.label}</p>
                                    <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">{t.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        ); 
    };

    return (
        <div className="space-y-12 border-t-2 border-slate-100 pt-16">
            <div ref={questionsSectionRef} id="exam-editor-section" className="space-y-6 scroll-mt-32">
                 <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
                         <FileTextIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">{isEditing ? '1. Editor Soal' : '3. Editor Soal'}</h2>
                        <p className="text-xs text-slate-400 font-medium">Klik pada area teks untuk menyisipkan rumus, tabel, atau gambar.</p>
                    </div>
                </div>

                <div className="space-y-8">
                    {questions.length > 0 && (
                        <div className="relative py-4 group/insert">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-slate-100 group-hover/insert:border-indigo-200 transition-colors"></div></div>
                            <div className="relative flex justify-center"><button onClick={() => openTypeSelectionModal(-1)} className="bg-white text-slate-400 group-hover/insert:text-indigo-600 group-hover/insert:bg-indigo-50 px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-full border border-slate-200 group-hover/insert:border-indigo-100 shadow-sm transition-all transform hover:scale-105 opacity-0 group-hover/insert:opacity-100 focus:opacity-100 flex items-center gap-2"><PlusCircleIcon className="w-4 h-4" /> Sisipkan Di Awal</button></div>
                        </div>
                    )}

                    {questions.map((q, index) => {
                        const questionNumber = questions.slice(0, index).filter(i => i.questionType !== 'INFO').length + 1;
                        return (
                            <React.Fragment key={q.id}>
                                <div id={q.id} className="bg-white rounded-[2rem] shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] border border-slate-100 group transition-all duration-300 hover:shadow-xl relative">
                                     <div className="absolute top-6 right-6 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all z-20">
                                         <div className="relative inline-block bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                                            <select value={q.questionType} onChange={(e) => handleTypeChange(q.id, e.target.value as QuestionType)} className="appearance-none bg-slate-50/50 border-none text-slate-500 py-2 pl-4 pr-10 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer hover:bg-white focus:outline-none transition-all">
                                                <option value="MULTIPLE_CHOICE">Pilihan Ganda</option><option value="COMPLEX_MULTIPLE_CHOICE">PG Kompleks</option><option value="TRUE_FALSE">Benar / Salah</option><option value="MATCHING">Menjodohkan</option><option value="ESSAY">Esai / Uraian</option><option value="FILL_IN_THE_BLANK">Isian Singkat</option><option value="INFO">Keterangan / Info</option>
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-300"><ChevronDownIcon className="w-4 h-4"/></div>
                                        </div>
                                        <button type="button" onClick={() => handleDeleteQuestion(q.id)} className="p-2.5 bg-white text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 border border-slate-100 hover:border-rose-100 transition-all shadow-sm" title="Hapus Soal"><TrashIcon className="w-5 h-5" /></button>
                                    </div>

                                    <div className="p-8 md:p-10">
                                        <div className="flex items-start gap-6 md:gap-8">
                                            <div className="flex-shrink-0 select-none hidden md:block">
                                                {q.questionType === 'INFO' ? 
                                                    <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm shadow-inner border border-blue-100">i</div> : 
                                                    <div className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center font-black text-lg border border-slate-100">{questionNumber}</div>
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="md:hidden mb-4">{q.questionType !== 'INFO' && <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider border border-slate-200">{questionNumber}. Soal</span>}</div>
                                                
                                                <WysiwygEditor value={q.questionText} onChange={(val) => handleQuestionTextChange(q.id, val)} placeholder={q.questionType === 'INFO' ? "Tulis teks informasi atau keterangan di sini..." : "Tulis pertanyaan Anda di sini..."} minHeight="100px" />
                                                
                                                {/* MULTIPLE CHOICE / COMPLEX */}
                                                {(q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'COMPLEX_MULTIPLE_CHOICE') && q.options && (
                                                    <div className="mt-8 space-y-4">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Opsi Jawaban & Kunci</p>
                                                        {q.options.map((option, i) => {
                                                            const isComplex = q.questionType === 'COMPLEX_MULTIPLE_CHOICE';
                                                            const isCorrect = isComplex ? (q.correctAnswer?.split(',').includes(option)) : (q.correctAnswer === option);
                                                            return (
                                                                <div key={i} className={`group/opt relative flex items-start gap-4 p-2 rounded-2xl transition-all border-2 ${isCorrect ? 'bg-emerald-50/40 border-emerald-100 shadow-sm' : 'border-transparent bg-slate-50/30'}`}>
                                                                    <div 
                                                                        className="flex items-center h-full pt-4 cursor-pointer" 
                                                                        onClick={() => isComplex ? handleComplexCorrectAnswerChange(q.id, option, !isCorrect) : handleCorrectAnswerChange(q.id, option)}
                                                                    >
                                                                        <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${isCorrect ? 'border-emerald-500 bg-emerald-500 shadow-lg shadow-emerald-200' : 'border-slate-200 bg-white group-hover/opt:border-emerald-300'}`}>
                                                                            {isCorrect && (isComplex ? <CheckIcon className="w-4 h-4 text-white" /> : <div className="w-2 h-2 bg-white rounded-full shadow-sm" />)}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex-1"><WysiwygEditor value={option} onChange={(val) => handleOptionTextChange(q.id, i, val)} placeholder={`Opsi ${String.fromCharCode(65 + i)}`} minHeight="40px" isCompact /></div>
                                                                    <div className="opacity-0 group-hover/opt:opacity-100 transition-opacity pt-4 pr-2">
                                                                        <button type="button" onClick={() => handleDeleteOption(q.id, i)} className="text-slate-300 hover:text-rose-500 transition-colors"><TrashIcon className="w-4 h-4"/></button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        <button onClick={() => handleAddOption(q.id)} className="ml-10 mt-2 text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-2 py-2 px-4 rounded-xl hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100"><PlusCircleIcon className="w-4 h-4" /> Tambah Opsi</button>
                                                    </div>
                                                )}

                                                {/* TRUE / FALSE (WYSIWYG Integration) */}
                                                {q.questionType === 'TRUE_FALSE' && q.trueFalseRows && (
                                                    <div className="mt-8 space-y-5">
                                                        <div className="flex justify-between items-center ml-1">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daftar Pernyataan & Kunci</p>
                                                            <div className="flex gap-12 mr-20">
                                                                <span className="text-[9px] font-black text-slate-400 uppercase">Benar</span>
                                                                <span className="text-[9px] font-black text-slate-400 uppercase">Salah</span>
                                                            </div>
                                                        </div>
                                                        {q.trueFalseRows.map((row, i) => (
                                                            <div key={i} className="group/row flex items-start gap-4 p-3 bg-slate-50/50 rounded-[1.5rem] border border-transparent hover:border-slate-100 hover:bg-white hover:shadow-md transition-all">
                                                                <div className="flex-1">
                                                                    <WysiwygEditor value={row.text} onChange={(val) => handleTrueFalseRowTextChange(q.id, i, val)} placeholder={`Pernyataan ${i+1}...`} minHeight="40px" isCompact />
                                                                </div>
                                                                <div className="flex items-center gap-3 pt-3 pr-2">
                                                                    <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
                                                                        <button onClick={() => handleTrueFalseRowAnswerChange(q.id, i, true)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${row.answer ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'text-slate-400 hover:text-slate-600'}`}>Benar</button>
                                                                        <button onClick={() => handleTrueFalseRowAnswerChange(q.id, i, false)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${!row.answer ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'text-slate-400 hover:text-slate-600'}`}>Salah</button>
                                                                    </div>
                                                                    <button onClick={() => handleDeleteTrueFalseRow(q.id, i)} className="text-slate-300 hover:text-rose-500 transition-colors p-1"><TrashIcon className="w-4 h-4"/></button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <button onClick={() => handleAddTrueFalseRow(q.id)} className="mt-2 text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-2 py-2 px-4 rounded-xl hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100"><PlusCircleIcon className="w-4 h-4" /> Tambah Baris</button>
                                                    </div>
                                                )}

                                                {/* MATCHING (WYSIWYG Integration) */}
                                                {q.questionType === 'MATCHING' && q.matchingPairs && (
                                                    <div className="mt-8 space-y-6">
                                                        <div className="grid grid-cols-12 gap-8 ml-1">
                                                            <div className="col-span-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kolom Premis (Kiri)</div>
                                                            <div className="col-span-1"></div>
                                                            <div className="col-span-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kolom Jawaban (Kanan)</div>
                                                        </div>
                                                        {q.matchingPairs.map((pair, i) => (
                                                            <div key={i} className="group/pair flex flex-col md:flex-row items-stretch gap-4 p-4 bg-slate-50/50 rounded-[1.5rem] border border-transparent hover:border-slate-100 hover:bg-white hover:shadow-md transition-all">
                                                                <div className="flex-1"><WysiwygEditor value={pair.left} onChange={(v) => handleMatchingPairChange(q.id, i, 'left', v)} placeholder="Teks Kiri..." minHeight="40px" isCompact /></div>
                                                                <div className="flex items-center justify-center text-slate-300"><ArrowPathIcon className="w-5 h-5 rotate-90"/></div>
                                                                <div className="flex-1"><WysiwygEditor value={pair.right} onChange={(v) => handleMatchingPairChange(q.id, i, 'right', v)} placeholder="Teks Kanan..." minHeight="40px" isCompact /></div>
                                                                <div className="flex items-center pt-2 md:pt-0"><button onClick={() => handleDeleteMatchingPair(q.id, i)} className="text-slate-300 hover:text-rose-500 transition-colors p-2"><TrashIcon className="w-4 h-4"/></button></div>
                                                            </div>
                                                        ))}
                                                        <button onClick={() => handleAddMatchingPair(q.id)} className="mt-2 text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-2 py-2 px-4 rounded-xl hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100"><PlusCircleIcon className="w-4 h-4" /> Tambah Pasangan</button>
                                                    </div>
                                                )}

                                                 {(q.questionType === 'FILL_IN_THE_BLANK' || q.questionType === 'ESSAY') && (
                                                    <div className="mt-10 pt-8 border-t border-slate-100">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">{q.questionType === 'ESSAY' ? 'Rubrik / Referensi Jawaban (Akan ditampilkan saat review)' : 'Kunci Jawaban Singkat'}</label>
                                                        <WysiwygEditor value={q.correctAnswer || ''} onChange={(val) => handleCorrectAnswerChange(q.id, val)} placeholder="Tulis pedoman penilaian atau kunci di sini..." minHeight="80px" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="relative py-4 group/insert">
                                    <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-slate-100 group-hover/insert:border-indigo-200 transition-colors"></div></div>
                                    <div className="relative flex justify-center"><button onClick={() => openTypeSelectionModal(index)} className="bg-white text-slate-400 group-hover/insert:text-indigo-600 group-hover/insert:bg-indigo-50 px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-full border border-slate-200 group-hover/insert:border-indigo-100 shadow-sm transition-all transform hover:scale-105 opacity-0 group-hover/insert:opacity-100 focus:opacity-100 flex items-center gap-2"><PlusCircleIcon className="w-4 h-4" /> Sisipkan Soal Berikutnya</button></div>
                                </div>
                            </React.Fragment>
                        );
                    })}
                </div>
                 
                <div className="mt-16 mb-24 text-center">
                    <button onClick={() => openTypeSelectionModal(null)} className="inline-flex items-center gap-3 text-sm text-white font-black uppercase tracking-widest bg-slate-900 border border-slate-900 px-10 py-5 rounded-[2rem] hover:bg-indigo-600 hover:border-indigo-600 shadow-xl shadow-slate-200 hover:shadow-indigo-200 transition-all active:scale-95 group">
                        <PlusCircleIcon className="w-6 h-6" /> Tambah Soal Baru
                    </button>
                </div>
             </div>

            {/* --- CONFIGURATION (Tetap Minimalis & Elegan) --- */}
            <div className="pt-10 scroll-mt-32" id="exam-config-section">
                <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner">
                         <CogIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">{isEditing ? '2. Konfigurasi' : '4. Konfigurasi'}</h2>
                        <p className="text-xs text-slate-400 font-medium">Lengkapi rincian jadwal dan aturan keamanan ujian.</p>
                    </div>
                </div>

                <div className="bg-white p-10 border border-slate-100 rounded-[2.5rem] shadow-[0_15px_50px_-15px_rgba(0,0,0,0.03)] space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                        <div className="md:col-span-2 pb-2 border-b border-slate-50 mb-2"><h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Informasi Dasar</h4></div>
                        
                        <div className="space-y-2">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Mata Pelajaran</label>
                            <div onClick={() => setIsSubjectModalOpen(true)} className="w-full p-4 bg-slate-50/50 border-2 border-transparent rounded-2xl hover:border-indigo-100 hover:bg-white transition-all text-sm font-bold flex items-center justify-between cursor-pointer shadow-inner hover:shadow-sm">
                                <span className={config.subject ? 'text-slate-800' : 'text-slate-300'}>{config.subject || 'Pilih Mata Pelajaran...'}</span>
                                <ArrowPathIcon className="w-4 h-4 text-slate-300 rotate-90" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Tingkat Kelas</label>
                            <div onClick={() => setIsClassModalOpen(true)} className="w-full p-4 bg-slate-50/50 border-2 border-transparent rounded-2xl hover:border-indigo-100 hover:bg-white transition-all text-sm font-bold flex items-center justify-between cursor-pointer shadow-inner hover:shadow-sm">
                                <span className={config.classLevel && config.classLevel !== 'Lainnya' ? 'text-slate-800' : 'text-slate-300'}>{config.classLevel === 'Lainnya' || !config.classLevel ? 'Pilih Kelas...' : config.classLevel}</span>
                                <ArrowPathIcon className="w-4 h-4 text-slate-300 rotate-90" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Jenis Evaluasi</label>
                            <div onClick={() => setIsExamTypeModalOpen(true)} className="w-full p-4 bg-slate-50/50 border-2 border-transparent rounded-2xl hover:border-indigo-100 hover:bg-white transition-all text-sm font-bold flex items-center justify-between cursor-pointer shadow-inner hover:shadow-sm">
                                <span className={config.examType && config.examType !== 'Lainnya' ? 'text-slate-800' : 'text-slate-300'}>{config.examType === 'Lainnya' || !config.examType ? 'Pilih Jenis...' : config.examType}</span>
                                <ArrowPathIcon className="w-4 h-4 text-slate-300 rotate-90" />
                            </div>
                        </div>

                        <div className="md:col-span-2 space-y-2">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Instruksi Khusus (Opsional)</label>
                            <textarea name="description" value={config.description || ''} onChange={handleConfigChange} className="w-full p-5 bg-slate-50/50 border-2 border-transparent rounded-[1.5rem] focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50/50 outline-none transition-all text-sm font-medium min-h-[120px] shadow-inner" placeholder="Contoh: Baca doa sebelum mengerjakan, dilarang menoleh ke belakang..." />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 pt-10 border-t border-slate-50">
                        <div className="md:col-span-2 pb-2 border-b border-slate-50 mb-2"><h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Penjadwalan & Keamanan</h4></div>
                        
                        <div className="space-y-2">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Tanggal Pelaksanaan</label>
                            <input type="date" name="date" value={new Date(config.date).toISOString().split('T')[0]} onChange={handleConfigChange} className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50/50 text-sm font-bold outline-none transition-all shadow-sm" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Jam Mulai</label>
                                <input type="time" name="startTime" value={config.startTime} onChange={handleConfigChange} className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50/50 text-sm font-bold outline-none transition-all shadow-sm" />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Durasi (Menit)</label>
                                <input type="number" name="timeLimit" value={config.timeLimit} onChange={handleConfigChange} className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50/50 text-sm font-bold outline-none transition-all shadow-sm" />
                            </div>
                        </div>

                        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                           <label className="flex items-center p-4 rounded-2xl border-2 border-slate-50 hover:border-indigo-100 hover:bg-indigo-50/20 transition-all cursor-pointer group shadow-sm bg-white"><input type="checkbox" name="shuffleQuestions" checked={config.shuffleQuestions} onChange={handleConfigChange} className="h-5 w-5 rounded-lg text-indigo-600 focus:ring-indigo-500 border-slate-200" /><span className="ml-4 text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">Acak Urutan Soal</span></label>
                           <label className="flex items-center p-4 rounded-2xl border-2 border-slate-50 hover:border-indigo-100 hover:bg-indigo-50/20 transition-all cursor-pointer group shadow-sm bg-white"><input type="checkbox" name="shuffleAnswers" checked={config.shuffleAnswers} onChange={handleConfigChange} className="h-5 w-5 rounded-lg text-indigo-600 focus:ring-indigo-500 border-slate-200" /><span className="ml-4 text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">Acak Opsi Jawaban</span></label>
                           <label className="flex items-center p-4 rounded-2xl border-2 border-slate-50 hover:border-indigo-100 hover:bg-indigo-50/20 transition-all cursor-pointer group shadow-sm bg-white"><input type="checkbox" name="detectBehavior" checked={config.detectBehavior} onChange={handleConfigChange} className="h-5 w-5 rounded-lg text-indigo-600 focus:ring-indigo-500 border-slate-200" /><span className="ml-4 text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">Anti-Curang (Cek Tab)</span></label>
                           <label className="flex items-center p-4 rounded-2xl border-2 border-slate-50 hover:border-indigo-100 hover:bg-indigo-50/20 transition-all cursor-pointer group shadow-sm bg-white"><input type="checkbox" name="trackLocation" checked={config.trackLocation} onChange={handleConfigChange} className="h-5 w-5 rounded-lg text-indigo-600 focus:ring-indigo-500 border-slate-200" /><span className="ml-4 text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">Lacak Lokasi (GPS)</span></label>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* ACTIONS */}
            <div className="text-center pt-10 pb-32">
                {isEditing ? (
                    <div className="flex flex-wrap justify-center items-center gap-4">
                        <button onClick={onCancel} className="px-10 py-4.5 bg-white text-slate-400 border-2 border-slate-100 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-50 hover:text-slate-600 transition-all active:scale-95">Batal</button>
                        {onSaveDraft && <button onClick={onSaveDraft} className="px-10 py-4.5 bg-indigo-50 text-indigo-600 border-2 border-indigo-100 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-indigo-100 transition-all flex items-center gap-2 active:scale-95 shadow-sm shadow-indigo-100/50"><PencilIcon className="w-4 h-4" /> Perbarui Draf</button>}
                        <button onClick={onSave} className="px-16 py-4.5 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-200 transform hover:-translate-y-1 active:scale-95">Simpan Perubahan</button>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col sm:flex-row justify-center gap-4 items-center">
                            {onSaveDraft && <button onClick={onSaveDraft} className="w-full sm:w-auto px-12 py-4.5 bg-white text-slate-500 border-2 border-slate-100 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-50 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"><PencilIcon className="w-4 h-4" /> Simpan Draf</button>}
                            <button onClick={onSave} className="w-full sm:w-auto px-16 py-4.5 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 transform hover:-translate-y-1 flex items-center justify-center gap-3 active:scale-95"><CheckCircleIcon className="w-5 h-5" /> Publikasikan Ujian</button>
                        </div>
                        {generatedCode && (
                            <div ref={generatedCodeSectionRef} className="mt-16 p-1 rounded-[3rem] animate-gentle-slide text-center max-w-md mx-auto bg-gradient-to-tr from-emerald-400 to-indigo-600 shadow-2xl">
                                <div className="bg-white p-10 rounded-[2.8rem] text-center border border-white">
                                    <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-emerald-50/50">
                                        <CheckCircleIcon className="w-8 h-8" />
                                    </div>
                                    <h4 className="font-black text-2xl text-slate-900 mb-2 tracking-tight">Berhasil Dibuat!</h4>
                                    <p className="text-sm text-slate-500 mb-8 font-medium leading-relaxed">Gunakan kode ini untuk dibagikan ke siswa.</p>
                                    <div className="bg-slate-50 p-8 rounded-[2rem] border-2 border-slate-100 shadow-inner group mb-4">
                                        <span className="text-4xl font-black tracking-[0.4em] text-slate-800 font-code block mb-1">{generatedCode}</span>
                                    </div>
                                    <button onClick={() => {navigator.clipboard.writeText(generatedCode); alert("Kode disalin!");}} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-all py-2 border-b border-transparent hover:border-indigo-200">Salin Kode Akses</button>
                                    <button onClick={onReset} className="mt-10 w-full bg-slate-900 text-white font-black text-xs uppercase tracking-widest py-4.5 rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95">Selesai & Keluar</button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {renderTypeSelectionModal()}
            <SelectionModal isOpen={isSubjectModalOpen} title="Pilih Mata Pelajaran" options={SUBJECTS} selectedValue={config.subject || ''} onClose={() => setIsSubjectModalOpen(false)} onSelect={handleSubjectSelect} searchPlaceholder="Cari mapel..." />
            <SelectionModal isOpen={isClassModalOpen} title="Pilih Tingkat Kelas" options={CLASSES} selectedValue={config.classLevel || ''} onClose={() => setIsClassModalOpen(false)} onSelect={(val) => setConfig(prev => ({ ...prev, classLevel: val }))} searchPlaceholder="Cari kelas..." />
            <SelectionModal isOpen={isExamTypeModalOpen} title="Pilih Jenis Evaluasi" options={EXAM_TYPES} selectedValue={config.examType || ''} onClose={() => setIsExamTypeModalOpen(false)} onSelect={(val) => setConfig(prev => ({ ...prev, examType: val }))} searchPlaceholder="Cari jenis..." />
        </div>
    );
};
