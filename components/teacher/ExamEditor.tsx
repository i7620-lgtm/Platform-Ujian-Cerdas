import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Question, QuestionType, ExamConfig } from '../../types';
import { 
    TrashIcon, XMarkIcon, PlusCircleIcon, PhotoIcon, 
    FileTextIcon, ListBulletIcon, CheckCircleIcon, PencilIcon, FileWordIcon, CheckIcon, ArrowLeftIcon,
    TableCellsIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon, AlignJustifyIcon,
    StrikethroughIcon, SuperscriptIcon, SubscriptIcon, EraserIcon, FunctionIcon,
    ArrowPathIcon
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

// --- MODALS ---

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
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><XMarkIcon className="w-5 h-5"/></button>
                </div>
                <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50"><input type="text" placeholder={searchPlaceholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 pl-4 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all shadow-sm" autoFocus /></div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {filteredOptions.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {filteredOptions.map((opt) => (
                                <button key={opt} onClick={() => { onSelect(opt); onClose(); }} className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border flex items-center justify-between group ${selectedValue === opt ? 'bg-primary text-white border-primary shadow-md shadow-primary/20' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border-gray-100 dark:border-slate-600 hover:border-primary/30 hover:bg-slate-50 dark:hover:bg-slate-600 hover:shadow-sm'}`}><span>{opt}</span>{selectedValue === opt && <CheckIcon className="w-4 h-4 text-white" />}</button>
                            ))}
                        </div>
                    ) : (<div className="text-center py-10 text-slate-400"><p className="text-sm">Opsi tidak ditemukan.</p></div>)}
                </div>
            </div>
        </div>
    );
};

const TableConfigModal: React.FC<{ isOpen: boolean; onClose: () => void; onInsert: (rows: number, cols: number) => void }> = ({ isOpen, onClose, onInsert }) => {
    const [rows, setRows] = useState(3);
    const [cols, setCols] = useState(3);
    if (!isOpen) return null;
    return (
        <div className="absolute top-10 right-0 z-50 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 w-64 animate-fade-in">
            <h4 className="text-xs font-bold text-slate-800 dark:text-white mb-3 uppercase tracking-wider">Sisipkan Tabel</h4>
            <div className="flex gap-2 mb-3">
                <div className="flex-1"><label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1">Baris</label><input type="number" min="1" max="10" value={rows} onChange={e => setRows(parseInt(e.target.value))} className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-center outline-none focus:border-primary text-slate-800 dark:text-slate-200" /></div>
                <div className="flex-1"><label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1">Kolom</label><input type="number" min="1" max="6" value={cols} onChange={e => setCols(parseInt(e.target.value))} className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-center outline-none focus:border-primary text-slate-800 dark:text-slate-200" /></div>
            </div>
            <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 rounded-lg">Batal</button>
                <button onClick={() => { onInsert(rows, cols); onClose(); }} className="flex-1 py-2 text-xs font-bold bg-primary text-white rounded-lg hover:bg-primary-focus">Sisipkan</button>
            </div>
        </div>
    );
};

const VisualMathModal: React.FC<{ isOpen: boolean; onClose: () => void; onInsert: (latex: string) => void }> = ({ isOpen, onClose, onInsert }) => {
    const [latex, setLatex] = useState('');
    if (!isOpen) return null;
    return (
        <div className="absolute top-10 left-0 z-50 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 w-80 animate-fade-in">
            <h4 className="text-xs font-bold text-slate-800 dark:text-white mb-3 uppercase tracking-wider">Rumus Matematika (LaTeX)</h4>
            <textarea value={latex} onChange={e => setLatex(e.target.value)} className="w-full h-24 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm mb-3 outline-none focus:border-primary text-slate-800 dark:text-slate-200 placeholder:text-slate-400 font-mono" placeholder="\frac{a}{b} = \sqrt{c}" />
            <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 rounded-lg">Batal</button>
                <button onClick={() => { if(latex) onInsert(latex); onClose(); setLatex(''); }} className="flex-1 py-2 text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 shadow-md">Sisipkan</button>
            </div>
        </div>
    );
};

// --- WYSIWYG EDITOR ---

const WysiwygEditor: React.FC<{ value: string; onChange: (val: string) => void; placeholder?: string; minHeight?: string; showTabs?: boolean }> = ({ value, onChange, placeholder = "Ketik di sini...", minHeight = "120px", showTabs = true }) => {
    const editorRef = useRef<HTMLDivElement>(null); 
    const fileInputRef = useRef<HTMLInputElement>(null); 
    const savedRange = useRef<Range | null>(null);
    const [activeTab, setActiveTab] = useState<'FORMAT' | 'PARAGRAPH' | 'INSERT' | 'MATH'>(showTabs ? 'FORMAT' : 'INSERT'); 
    const [activeCmds, setActiveCmds] = useState<string[]>([]); 
    const [isInsideTable, setIsInsideTable] = useState(false); 
    const [showMath, setShowMath] = useState(false); 
    const [showTable, setShowTable] = useState(false);
    
    useEffect(() => { if (editorRef.current && value !== editorRef.current.innerHTML) { if (!editorRef.current.innerText.trim() && !value) { editorRef.current.innerHTML = ""; } else if (document.activeElement !== editorRef.current) { editorRef.current.innerHTML = value; } } }, [value]);
    
    const handleInput = () => { if (editorRef.current) { onChange(editorRef.current.innerHTML); saveSelection(); checkActiveFormats(); } };
    const saveSelection = () => { const sel = window.getSelection(); if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) { savedRange.current = sel.getRangeAt(0).cloneRange(); } };
    const restoreSelection = () => { const sel = window.getSelection(); if (sel && savedRange.current) { sel.removeAllRanges(); sel.addRange(savedRange.current); } else if (editorRef.current) { editorRef.current.focus(); const range = document.createRange(); range.selectNodeContents(editorRef.current); range.collapse(false); sel?.removeAllRanges(); sel?.addRange(range); } };
    const checkActiveFormats = () => { saveSelection(); const cmds = ['bold', 'italic', 'underline', 'strikethrough', 'subscript', 'superscript', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull', 'insertUnorderedList', 'insertOrderedList']; const active = cmds.filter(cmd => document.queryCommandState(cmd)); setActiveCmds(active); const selection = window.getSelection(); let inTable = false; if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) { let node = selection.anchorNode; while (node && node !== editorRef.current) { if (node.nodeName === 'TABLE' || node.nodeName === 'TD' || node.nodeName === 'TH') { inTable = true; break; } node = node.parentNode; } } setIsInsideTable(inTable); };
    const runCmd = (cmd: string, val?: string) => { restoreSelection(); if(editorRef.current) editorRef.current.focus(); execCmd(cmd, val); saveSelection(); checkActiveFormats(); };
    
    const insertTable = (rows: number, cols: number) => { let html = '<table class="border-collapse border border-slate-300 dark:border-slate-600 my-2 w-full text-sm"><thead><tr>'; for(let c=0; c<cols; c++) html += `<th class="border border-slate-300 dark:border-slate-600 p-2 bg-slate-50 dark:bg-slate-700">H${c+1}</th>`; html += '</tr></thead><tbody>'; for(let r=0; r<rows; r++) { html += '<tr>'; for(let c=0; c<cols; c++) html += `<td class="border border-slate-300 dark:border-slate-600 p-2">Data</td>`; html += '</tr>'; } html += '</tbody></table><p><br/></p>'; runCmd('insertHTML', html); handleInput(); };
    const deleteCurrentTable = () => { const selection = window.getSelection(); if (selection && selection.rangeCount > 0) { let node = selection.anchorNode; while (node && node !== editorRef.current) { if (node.nodeName === 'TABLE') { node.parentNode?.removeChild(node); handleInput(); setIsInsideTable(false); return; } node = node.parentNode; } } };
    const insertMath = (latex: string) => { if ((window as any).katex) { const html = (window as any).katex.renderToString(latex, { throwOnError: false }); const wrapper = `&nbsp;<span class="math-visual inline-block px-0.5 rounded select-none cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900 align-middle" contenteditable="false" data-latex="${latex.replace(/"/g, '&quot;')}">${html}</span><span style="font-size: 100%; font-family: inherit; font-weight: normal; font-style: normal; color: inherit;">&nbsp;</span>`; runCmd('insertHTML', wrapper); handleInput(); } };
    
    const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) { const file = e.target.files[0]; const reader = new FileReader(); reader.onload = async (ev) => { const rawDataUrl = ev.target?.result as string; try { const dataUrl = await compressImage(rawDataUrl, 0.7); const imgTag = `<img src="${dataUrl}" alt="Inserted Image" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;" />&nbsp;`; runCmd('insertHTML', imgTag); handleInput(); } catch (error) { console.error("Image compression failed", error); } }; reader.readAsDataURL(file); } e.target.value = ''; };
    
    // Editor CSS for dark mode content
    const editorStyle = `.wysiwyg-content table { width: 100%; border-collapse: collapse; margin: 0.5rem 0; } .wysiwyg-content th, .wysiwyg-content td { border: 1px solid #cbd5e1; padding: 0.5rem; min-width: 30px; } .wysiwyg-content th { background-color: #f8fafc; font-weight: bold; text-align: left; } .wysiwyg-content:empty:before { content: attr(data-placeholder); color: #94a3b8; font-style: italic; } .wysiwyg-content ul { list-style-type: disc; padding-left: 1.5rem; } .wysiwyg-content ol { list-style-type: decimal; padding-left: 1.5rem; } .wysiwyg-content blockquote { border-left: 3px solid #cbd5e1; padding-left: 1rem; color: #64748b; font-style: italic; } .dark .wysiwyg-content th, .dark .wysiwyg-content td { border-color: #475569; } .dark .wysiwyg-content th { background-color: #1e293b; color: #e2e8f0; } .dark .wysiwyg-content { color: #e2e8f0; }`;
    
    const Btn: React.FC<{ cmd?: string; label?: string; icon?: React.FC<any>; active?: boolean; onClick?: () => void }> = ({ cmd, label, icon: Icon, active, onClick }) => (<button type="button" onMouseDown={(e) => { e.preventDefault(); onClick ? onClick() : runCmd(cmd!); }} className={`min-w-[28px] h-7 px-1.5 rounded flex items-center justify-center transition-all ${active ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 shadow-inner' : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-400'}`} title={label}>{Icon ? <Icon className="w-4 h-4"/> : <span className="text-xs font-bold font-serif">{label}</span>}</button>);
    
    return (
        <div className="relative group rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-all focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900 focus-within:border-indigo-300 dark:focus-within:border-indigo-500">
            <style>{editorStyle}</style>
            <div className="border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 rounded-t-xl select-none">
                <div className="flex px-2 pt-1 gap-1 border-b border-gray-200/50 dark:border-slate-700/50 justify-between items-end">
                    {showTabs && (<div className="flex gap-1">{['FORMAT', 'PARAGRAPH', 'INSERT', 'MATH'].map((t: any) => (<button key={t} onClick={() => setActiveTab(t)} className={`px-3 py-1.5 text-[10px] font-bold tracking-wider rounded-t-lg transition-colors ${activeTab === t ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>{t === 'MATH' ? 'RUMUS' : t === 'FORMAT' ? 'FORMAT' : t === 'PARAGRAPH' ? 'PARAGRAF' : 'SISIPKAN'}</button>))}</div>)}
                    {isInsideTable && (<div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[9px] font-bold rounded-t uppercase tracking-widest border-t border-x border-indigo-100 dark:border-slate-700">Table Active</div>)}
                </div>
                <div className="p-1.5 flex flex-wrap gap-1 items-center bg-white dark:bg-slate-900 rounded-b-none min-h-[36px]">
                    {activeTab === 'FORMAT' && (<><Btn cmd="bold" label="B" active={activeCmds.includes('bold')} /><Btn cmd="italic" label="I" active={activeCmds.includes('italic')} /><Btn cmd="underline" label="U" active={activeCmds.includes('underline')} /><Btn cmd="strikethrough" icon={StrikethroughIcon} active={activeCmds.includes('strikethrough')} /><div className="w-px h-4 bg-gray-200 dark:bg-slate-700 mx-1"></div><Btn cmd="superscript" icon={SuperscriptIcon} active={activeCmds.includes('superscript')} /><Btn cmd="subscript" icon={SubscriptIcon} active={activeCmds.includes('subscript')} /><div className="w-px h-4 bg-gray-200 dark:bg-slate-700 mx-1"></div><Btn cmd="removeFormat" icon={EraserIcon} label="Clear" /></>)}
                    {activeTab === 'PARAGRAPH' && (<><Btn cmd="justifyLeft" icon={AlignLeftIcon} active={activeCmds.includes('justifyLeft')} /><Btn cmd="justifyCenter" icon={AlignCenterIcon} active={activeCmds.includes('justifyCenter')} /><Btn cmd="justifyRight" icon={AlignRightIcon} active={activeCmds.includes('justifyRight')} /><Btn cmd="justifyFull" icon={AlignJustifyIcon} active={activeCmds.includes('justifyFull')} /><div className="w-px h-4 bg-gray-200 dark:bg-slate-700 mx-1"></div><Btn cmd="insertUnorderedList" icon={ListBulletIcon} active={activeCmds.includes('insertUnorderedList')} /><Btn cmd="insertOrderedList" label="1." active={activeCmds.includes('insertOrderedList')} /><div className="w-px h-4 bg-gray-200 dark:bg-slate-700 mx-1"></div><Btn cmd="indent" label="Indent" icon={() => <span className="text-[10px] font-mono">→]</span>} /><Btn cmd="outdent" label="Outdent" icon={() => <span className="text-[10px] font-mono">[←</span>} /></>)}
                    {activeTab === 'INSERT' && (<><button onMouseDown={(e) => {e.preventDefault(); fileInputRef.current?.click();}} className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded text-xs font-bold hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"><PhotoIcon className="w-4 h-4"/> Gambar</button><button onMouseDown={(e) => {e.preventDefault(); setShowTable(!showTable);}} className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"><TableCellsIcon className="w-4 h-4"/> Tabel</button><button onMouseDown={(e) => {e.preventDefault(); runCmd('insertHorizontalRule');}} className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-400 rounded text-xs font-bold hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">—— Pemisah</button></>)}
                    {activeTab === 'MATH' && (<div className="flex items-center gap-2 w-full"><button onMouseDown={(e) => {e.preventDefault(); setShowMath(!showMath);}} className="flex-1 flex items-center justify-center gap-2 px-4 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded shadow text-xs font-bold hover:from-indigo-600 hover:to-purple-700 transition-all"><FunctionIcon className="w-4 h-4" /> Buka Math Pro</button></div>)}
                    {isInsideTable && (<div className="ml-auto pl-2 border-l border-gray-200 dark:border-slate-700 flex items-center animate-fade-in"><button onMouseDown={(e) => { e.preventDefault(); deleteCurrentTable(); }} className="flex items-center gap-1 px-2 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-[10px] font-bold hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-100 dark:border-red-900 transition-colors" title="Hapus Tabel ini"><TrashIcon className="w-3 h-3"/> Hapus</button></div>)}
                </div>
                {/* Popups */}
                <div className="relative">
                    <TableConfigModal isOpen={showTable} onClose={() => setShowTable(false)} onInsert={insertTable} />
                    <VisualMathModal isOpen={showMath} onClose={() => setShowMath(false)} onInsert={insertMath} />
                </div>
            </div>
            <div ref={editorRef} className="wysiwyg-content p-4 outline-none text-sm text-slate-800 dark:text-slate-200 leading-relaxed overflow-auto" style={{ minHeight }} contentEditable={true} onInput={handleInput} onKeyUp={checkActiveFormats} onMouseUp={checkActiveFormats} onBlur={saveSelection} onClick={checkActiveFormats} data-placeholder={placeholder} spellCheck={false} />
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageFileChange} />
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
    
    // --- QUESTION LOGIC HANDLERS ---

    const handleTypeChange = (qId: string, newType: QuestionType) => {
        setQuestions(prev => prev.map(q => {
            if (q.id !== qId) return q;
            // Reset options logic based on type change
            let newOptions: string[] | undefined = undefined;
            if (newType === 'MULTIPLE_CHOICE' || newType === 'COMPLEX_MULTIPLE_CHOICE') {
                newOptions = q.options && q.options.length > 0 ? q.options : ["Opsi A", "Opsi B", "Opsi C", "Opsi D"];
            } else if (newType === 'FILL_IN_THE_BLANK') {
                newOptions = undefined;
            }
            // Reset correct answer if incompatible
            let newCorrectAnswer = q.correctAnswer;
            if (newType === 'MULTIPLE_CHOICE' && newOptions && !newOptions.includes(newCorrectAnswer || '')) {
                newCorrectAnswer = undefined;
            } else if (newType === 'ESSAY' || newType === 'INFO') {
                newCorrectAnswer = undefined;
            }

            return { 
                ...q, 
                questionType: newType, 
                options: newOptions, 
                correctAnswer: newCorrectAnswer,
                // Reset complex fields
                matchingPairs: newType === 'MATCHING' ? [{left:'', right:''}] : undefined,
                trueFalseRows: newType === 'TRUE_FALSE' ? [{text:'', answer: true}] : undefined
            };
        }));
    };

    const handleQuestionTextChange = (qId: string, val: string) => {
        setQuestions(prev => prev.map(q => q.id === qId ? { ...q, questionText: val } : q));
    };

    const handleOptionTextChange = (qId: string, optIndex: number, val: string) => {
        setQuestions(prev => prev.map(q => {
            if (q.id !== qId || !q.options) return q;
            const newOpts = [...q.options];
            const oldVal = newOpts[optIndex];
            newOpts[optIndex] = val;
            
            // Update correct answer reference if it matches the text
            let newCorrect = q.correctAnswer;
            if (q.correctAnswer === oldVal) {
                newCorrect = val;
            }
            return { ...q, options: newOpts, correctAnswer: newCorrect };
        }));
    };

    const handleDeleteOption = (qId: string, optIndex: number) => {
        setQuestions(prev => prev.map(q => {
            if (q.id !== qId || !q.options) return q;
            const deletedOpt = q.options[optIndex];
            const newOpts = q.options.filter((_, i) => i !== optIndex);
            // Reset correct answer if deleted
            const newCorrect = q.correctAnswer === deletedOpt ? undefined : q.correctAnswer;
            return { ...q, options: newOpts, correctAnswer: newCorrect };
        }));
    };

    const handleAddOption = (qId: string) => {
        setQuestions(prev => prev.map(q => {
            if (q.id !== qId) return q;
            const newOpts = q.options ? [...q.options, `Opsi Baru`] : [`Opsi Baru`];
            return { ...q, options: newOpts };
        }));
    };

    const handleCorrectAnswer = (qId: string, val: string) => {
        setQuestions(prev => prev.map(q => q.id === qId ? { ...q, correctAnswer: val } : q));
    };

    const handleDeleteQuestion = (qId: string) => {
        if (confirm("Hapus soal ini?")) {
            setQuestions(prev => prev.filter(q => q.id !== qId));
        }
    };

    const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setConfig(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : (type === 'number' ? parseInt(value) : value)
        }));
    };

    const insertQuestion = (type: QuestionType) => {
        const newQ: Question = {
            id: `new-q-${Date.now()}`,
            questionText: '',
            questionType: type,
            options: (type === 'MULTIPLE_CHOICE' || type === 'COMPLEX_MULTIPLE_CHOICE') ? ["Opsi A", "Opsi B", "Opsi C", "Opsi D"] : undefined,
            correctAnswer: undefined
        };
        
        setQuestions(prev => {
            const newList = [...prev];
            if (insertIndex !== null && insertIndex >= -1) {
                newList.splice(insertIndex + 1, 0, newQ);
            } else {
                newList.push(newQ);
            }
            return newList;
        });
        setInsertIndex(null);
        setIsTypeSelectionModalOpen(false);
        // Scroll logic could be added here
    };

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
                            <div className="relative flex justify-center"><button onClick={() => { setInsertIndex(-1); setIsTypeSelectionModalOpen(true); }} className="bg-white dark:bg-slate-900 text-gray-400 dark:text-slate-500 group-hover/insert:text-primary group-hover/insert:bg-primary/5 px-4 py-1 text-xs font-semibold rounded-full border border-gray-200 dark:border-slate-700 group-hover/insert:border-primary/30 shadow-sm transition-all transform hover:scale-105 flex items-center gap-1 opacity-0 group-hover/insert:opacity-100 focus:opacity-100"><PlusCircleIcon className="w-4 h-4" /> Sisipkan Soal Di Awal</button></div>
                        </div>
                    )}
                    {questions.map((q, index) => {
                        const questionNumber = questions.slice(0, index).filter(i => i.questionType !== 'INFO').length + 1;
                        return (
                            <React.Fragment key={q.id}>
                                <div id={q.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 group transition-all duration-300 hover:shadow-md relative overflow-visible">
                                     <div className="absolute top-4 right-4 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-20">
                                         <div className="relative inline-block bg-white dark:bg-slate-900 rounded-lg shadow-sm">
                                            {/* Dropdown Type Change */}
                                            <select value={q.questionType} onChange={(e) => handleTypeChange(q.id, e.target.value as QuestionType)} className="appearance-none bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-200 py-1.5 pl-3 pr-7 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:bg-white dark:hover:bg-slate-600 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all">
                                                <option value="MULTIPLE_CHOICE">Pilihan Ganda</option><option value="COMPLEX_MULTIPLE_CHOICE">PG Kompleks</option><option value="TRUE_FALSE">Benar / Salah</option><option value="MATCHING">Menjodohkan</option><option value="ESSAY">Esai / Uraian</option><option value="FILL_IN_THE_BLANK">Isian Singkat</option><option value="INFO">Info / Teks</option>
                                            </select>
                                        </div>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(q.id); }} className="p-1.5 bg-white dark:bg-slate-700 text-gray-400 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 border border-gray-200 dark:border-slate-600 transition-colors shadow-sm" title="Hapus Soal"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                    <div className="p-6 md:p-8">
                                        <div className="flex items-start gap-4 md:gap-6">
                                            <div className="flex-shrink-0 mt-1 hidden md:block select-none">{q.questionType === 'INFO' ? <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">i</div> : <span className="text-slate-300 dark:text-slate-600 font-bold text-xl">{String(questionNumber).padStart(2, '0')}</span>}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="md:hidden mb-2">{q.questionType !== 'INFO' && <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase">{questionNumber}. Soal</span>}</div>
                                                <WysiwygEditor value={q.questionText} onChange={(val) => handleQuestionTextChange(q.id, val)} placeholder={q.questionType === 'INFO' ? "Tulis informasi atau teks bacaan di sini..." : "Tulis pertanyaan di sini..."} minHeight="80px" />
                                                
                                                {/* OPTION RENDERERS WITH DARK MODE */}
                                                {(q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'COMPLEX_MULTIPLE_CHOICE') && q.options && (
                                                    <div className="mt-6 space-y-3">
                                                        {q.options.map((option, i) => (
                                                            <div key={i} className={`group/opt relative flex items-start p-1 rounded-xl transition-all ${q.correctAnswer === option || (q.questionType === 'COMPLEX_MULTIPLE_CHOICE' && q.correctAnswer?.includes(option)) ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}>
                                                                <div className="flex items-center h-full pt-4 pl-2 pr-4 cursor-pointer" onClick={() => handleCorrectAnswer(q.id, option)}><div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${q.correctAnswer === option ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 group-hover/opt:border-emerald-300'}`}>{q.correctAnswer === option && <div className="w-2 h-2 bg-white rounded-full" />}</div></div>
                                                                <div className="flex-1"><WysiwygEditor value={option} onChange={(val) => handleOptionTextChange(q.id, i, val)} placeholder={`Opsi ${String.fromCharCode(65 + i)}`} minHeight="40px" /></div>
                                                                <div className="flex flex-col gap-1 opacity-0 group-hover/opt:opacity-100 transition-opacity px-2 pt-2"><button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteOption(q.id, i); }} className="text-gray-300 dark:text-slate-600 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button></div>
                                                            </div>
                                                        ))}
                                                        <button onClick={() => handleAddOption(q.id)} className="ml-12 mt-2 text-xs font-bold text-primary hover:text-primary-focus flex items-center gap-1 opacity-60 hover:opacity-100"><PlusCircleIcon className="w-4 h-4" /> Tambah Opsi</button>
                                                    </div>
                                                )}
                                                
                                                {q.questionType === 'ESSAY' && (
                                                    <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-center text-sm text-slate-400 dark:text-slate-500 select-none">Area jawaban siswa (teks panjang)</div>
                                                )}

                                                {q.questionType === 'FILL_IN_THE_BLANK' && (
                                                    <div className="mt-4">
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Kunci Jawaban Singkat</label>
                                                        <input type="text" value={q.correctAnswer || ''} onChange={(e) => handleCorrectAnswer(q.id, e.target.value)} className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-primary outline-none text-sm text-slate-800 dark:text-slate-200" placeholder="Jawaban yang benar..." />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="relative py-2 group/insert">
                                    <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-gray-200 dark:border-slate-700 group-hover/insert:border-primary/30 transition-colors"></div></div>
                                    <div className="relative flex justify-center"><button onClick={() => { setInsertIndex(index); setIsTypeSelectionModalOpen(true); }} className="bg-white dark:bg-slate-900 text-gray-400 dark:text-slate-500 group-hover/insert:text-primary group-hover/insert:bg-primary/5 px-4 py-1 text-xs font-semibold rounded-full border border-gray-200 dark:border-slate-700 group-hover/insert:border-primary/30 shadow-sm transition-all transform hover:scale-105 flex items-center gap-1 opacity-0 group-hover/insert:opacity-100 focus:opacity-100"><PlusCircleIcon className="w-4 h-4" /> Sisipkan Soal</button></div>
                                </div>
                            </React.Fragment>
                        );
                    })}
                </div>
                 <div className="mt-12 mb-20 text-center"><button onClick={() => { setInsertIndex(null); setIsTypeSelectionModalOpen(true); }} className="flex items-center gap-2 text-sm text-primary font-bold hover:text-primary-focus mx-auto transition-all bg-white dark:bg-slate-800 border border-primary/20 px-8 py-4 rounded-2xl hover:bg-primary hover:text-white shadow-sm hover:shadow-lg active:scale-95 group"><PlusCircleIcon className="w-5 h-5 group-hover:text-white transition-colors" /> Tambah Soal Baru</button></div>
             </div>
             {/* ... configuration section ... */}
             <div className="pt-10">
                 <div className="p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm mb-6">
                    <h2 className="text-xl font-bold text-neutral dark:text-white">{isEditing ? '2. Konfigurasi' : '4. Konfigurasi'}</h2>
                     <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Pengaturan waktu dan keamanan ujian.</p>
                </div>
                {/* ... config content with dark mode inputs ... */}
                <div className="bg-white dark:bg-slate-800 p-8 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-sm space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                        <div className="md:col-span-2 pb-2 border-b border-gray-100 dark:border-slate-700 mb-2"><h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Informasi Umum</h4></div>
                        
                        <div><label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Mata Pelajaran</label><div onClick={() => setIsSubjectModalOpen(true)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all text-sm font-medium flex items-center justify-between cursor-pointer hover:bg-white dark:hover:bg-slate-800 hover:border-gray-300"><span className={config.subject ? 'text-slate-800 dark:text-slate-200' : 'text-gray-400 dark:text-slate-500'}>{config.subject || 'Pilih Mata Pelajaran...'}</span><ArrowPathIcon className="w-4 h-4 text-gray-400 rotate-90" /></div></div>
                        <div><label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Kelas</label><div onClick={() => setIsClassModalOpen(true)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all text-sm font-medium flex items-center justify-between cursor-pointer hover:bg-white dark:hover:bg-slate-800 hover:border-gray-300"><span className={config.classLevel && config.classLevel !== 'Lainnya' ? 'text-slate-800 dark:text-slate-200' : 'text-gray-400 dark:text-slate-500'}>{config.classLevel === 'Lainnya' || !config.classLevel ? 'Pilih Kelas...' : config.classLevel}</span><ArrowPathIcon className="w-4 h-4 text-gray-400 rotate-90" /></div></div>

                        <div><label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Jenis Evaluasi</label><div onClick={() => setIsExamTypeModalOpen(true)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all text-sm font-medium flex items-center justify-between cursor-pointer hover:bg-white dark:hover:bg-slate-800 hover:border-gray-300"><span className={config.examType && config.examType !== 'Lainnya' ? 'text-slate-800 dark:text-slate-200' : 'text-gray-400 dark:text-slate-500'}>{config.examType === 'Lainnya' || !config.examType ? 'Pilih Jenis...' : config.examType}</span><ArrowPathIcon className="w-4 h-4 text-gray-400 rotate-90" /></div></div>
                         <div className="md:col-span-2"><label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Instruksi Pengerjaan</label><textarea name="description" value={config.description || ''} onChange={handleConfigChange} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm min-h-[100px] shadow-inner text-slate-800 dark:text-slate-200" placeholder="Contoh: Baca doa sebelum mengerjakan, dilarang menoleh ke belakang..." /></div>
                    </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 pt-8 border-t border-gray-100 dark:border-slate-700">
                         <div className="md:col-span-2 pb-2 border-b border-gray-100 dark:border-slate-700 mb-2"><h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Waktu & Keamanan</h4></div>
                        <div><label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Tanggal Pelaksanaan</label><input type="date" name="date" value={new Date(config.date).toISOString().split('T')[0]} onChange={handleConfigChange} className="w-full p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm text-slate-800 dark:text-slate-200" /></div>
                        <div><label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Jam Mulai</label><input type="time" name="startTime" value={config.startTime} onChange={handleConfigChange} className="w-full p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm text-slate-800 dark:text-slate-200" /></div>
                        <div><label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Durasi Pengerjaan (Menit)</label><input type="number" name="timeLimit" value={config.timeLimit} onChange={handleConfigChange} className="w-full p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium shadow-sm text-slate-800 dark:text-slate-200" /></div>
                        
                        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                           <label className="flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group shadow-sm"><input type="checkbox" name="shuffleQuestions" checked={config.shuffleQuestions} onChange={handleConfigChange} className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-primary transition-colors">Acak Soal</span></label>
                           <label className="flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group shadow-sm"><input type="checkbox" name="shuffleAnswers" checked={config.shuffleAnswers} onChange={handleConfigChange} className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-primary transition-colors">Acak Jawaban</span></label>
                           <label className="flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group shadow-sm"><input type="checkbox" name="showResultToStudent" checked={config.showResultToStudent} onChange={handleConfigChange} className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-primary transition-colors">Tampilkan Nilai ke Siswa</span></label>
                           <label className="flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group shadow-sm"><input type="checkbox" name="showCorrectAnswer" checked={config.showCorrectAnswer} onChange={handleConfigChange} className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-primary transition-colors">Tampilkan Pembahasan</span></label>
                           <label className="flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group shadow-sm"><input type="checkbox" name="detectBehavior" checked={config.detectBehavior} onChange={handleConfigChange} className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-primary transition-colors">Deteksi Kecurangan (Blur/Tab)</span></label>
                           <label className="flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group shadow-sm"><input type="checkbox" name="trackLocation" checked={config.trackLocation} onChange={handleConfigChange} className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-primary transition-colors">Catat Lokasi GPS</span></label>
                           <label className="flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group shadow-sm"><input type="checkbox" name="enablePublicStream" checked={config.enablePublicStream} onChange={handleConfigChange} className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-primary transition-colors">Live Monitoring Publik</span></label>
                           <label className="flex items-center p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group shadow-sm"><input type="checkbox" name="disableRealtime" checked={config.disableRealtime} onChange={handleConfigChange} className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-primary transition-colors">Mode Hemat Kuota (Sync 30s)</span></label>
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
                        <button onClick={onSave} className="bg-primary text-white font-bold py-4 px-14 rounded-2xl hover:bg-primary-focus transition-all shadow-xl shadow-indigo-100 dark:shadow-indigo-900/30 transform hover:-translate-y-1 active:scale-95">Simpan Perubahan</button>
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
                                        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border-2 border-emerald-50 dark:border-emerald-900/30 shadow-inner group transition-all hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10"><span className="text-4xl font-black tracking-[0.3em] text-emerald-600 dark:text-emerald-400 font-mono block">{generatedCode}</span></div>
                                        <button onClick={() => {navigator.clipboard.writeText(generatedCode); alert("Kode berhasil disalin!");}} className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors py-2">Salin Kode Akses</button>
                                    </div>
                                    <button onClick={onReset} className="mt-8 w-full bg-slate-900 dark:bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-black dark:hover:bg-indigo-700 transition-all shadow-lg active:scale-95">Selesai & Tutup</button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modals */}
            <SelectionModal isOpen={isSubjectModalOpen} title="Pilih Mata Pelajaran" options={SUBJECTS} selectedValue={config.subject || ''} onClose={() => setIsSubjectModalOpen(false)} onSelect={(val) => setConfig(prev => ({...prev, subject: val}))} searchPlaceholder="Cari mata pelajaran..." />
            <SelectionModal isOpen={isClassModalOpen} title="Pilih Tingkat Kelas" options={CLASSES} selectedValue={config.classLevel || ''} onClose={() => setIsClassModalOpen(false)} onSelect={(val) => setConfig(prev => ({...prev, classLevel: val}))} searchPlaceholder="Cari kelas..." />
            <SelectionModal isOpen={isExamTypeModalOpen} title="Pilih Jenis Evaluasi" options={EXAM_TYPES} selectedValue={config.examType || ''} onClose={() => setIsExamTypeModalOpen(false)} onSelect={(val) => setConfig(prev => ({...prev, examType: val}))} searchPlaceholder="Cari jenis ujian..." />
            <SelectionModal isOpen={isTypeSelectionModalOpen} title="Pilih Tipe Soal" options={["Pilihan Ganda", "PG Kompleks", "Benar Salah", "Menjodohkan", "Isian Singkat", "Esai", "Informasi"]} selectedValue="" onClose={() => setIsTypeSelectionModalOpen(false)} onSelect={(val) => {
                const map: Record<string, QuestionType> = { "Pilihan Ganda": 'MULTIPLE_CHOICE', "PG Kompleks": 'COMPLEX_MULTIPLE_CHOICE', "Benar Salah": 'TRUE_FALSE', "Menjodohkan": 'MATCHING', "Isian Singkat": 'FILL_IN_THE_BLANK', "Esai": 'ESSAY', "Informasi": 'INFO' };
                insertQuestion(map[val]);
            }} />
        </div>
    );
};
