
import React, { useMemo, useState, useEffect } from 'react';
import type { Exam, Question, Result } from '../../../types';
import { ChartBarIcon, CheckCircleIcon, XMarkIcon, ListBulletIcon, ChevronUpIcon, ChevronDownIcon } from '../../Icons';
import { parseList } from '../examUtils';

// --- SHARED COMPONENTS ---

export const StatWidget: React.FC<{ label: string; value: string | number; color: string; icon?: React.FC<any> }> = ({ label, value, color, icon: Icon }) => {
    const colorName = color.split('-')[1] || 'gray';
    return (
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4 transition-all hover:shadow-md flex-1 print:border-slate-300 print:shadow-none print:rounded-lg">
            <div className={`p-3 rounded-xl ${color} dark:bg-${colorName}-900/20 bg-opacity-10 text-${colorName}-600 dark:text-${colorName}-400 print:bg-transparent print:p-0`}>
                {Icon ? <Icon className="w-6 h-6 print:w-4 print:h-4" /> : <ChartBarIcon className="w-6 h-6 print:w-4 print:h-4" />}
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest print:text-slate-600">{label}</p>
                <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-none mt-1 print:text-lg">{value}</p>
            </div>
        </div>
    );
};

export const QuestionAnalysisItem: React.FC<{ 
    q: Question; 
    index: number; 
    stats: any; 
    examResults: Result[];
    onUpdateKey?: (qId: string, newKey: string) => Promise<void>;
}> = ({ q, index, stats, examResults, onUpdateKey }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditingKey, setIsEditingKey] = useState(false);
    
    // Initialize tempKey based on question type
    const getInitialKey = () => {
        if (q.questionType === 'TRUE_FALSE' && q.trueFalseRows) return JSON.stringify(q.trueFalseRows);
        if (q.questionType === 'MATCHING' && q.matchingPairs) return JSON.stringify(q.matchingPairs);
        return q.correctAnswer || '';
    };

    const [tempKey, setTempKey] = useState(getInitialKey());
    const [isSaving, setIsSaving] = useState(false);

    // Update tempKey when q changes (e.g. after save)
    useEffect(() => {
        setTempKey(getInitialKey());
    }, [q]);

    const handleSaveKey = async () => {
        if (onUpdateKey) {
            setIsSaving(true);
            try {
                await onUpdateKey(q.id, tempKey);
                setIsEditingKey(false);
            } catch (e) {
                alert('Gagal memperbarui kunci jawaban');
                console.error(e);
            } finally {
                setIsSaving(false);
            }
        }
    };

    const difficultyColor = stats.correctRate >= 80 
        ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' 
        : stats.correctRate >= 50 
            ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800' 
            : 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800';

    const difficultyLabel = stats.correctRate >= 80 ? 'Mudah' : stats.correctRate >= 50 ? 'Sedang' : 'Sulit';

    const distribution = useMemo(() => {
        const counts: Record<string, number> = {};
        let totalAnswered = 0;
        
        examResults.forEach(r => {
            const ans = r.answers[q.id];
            if (ans) {
                const normalizedAns = String(ans).trim(); 
                counts[normalizedAns] = (counts[normalizedAns] || 0) + 1;
                totalAnswered++;
            }
        });
        return { counts, totalAnswered, totalStudents: examResults.length };
    }, [examResults, q.id]);

    const correctAnswerString = useMemo(() => {
        if (q.questionType === 'MULTIPLE_CHOICE') return q.correctAnswer;
        if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') return q.correctAnswer;
        if (q.questionType === 'FILL_IN_THE_BLANK') return q.correctAnswer;
        if (q.questionType === 'TRUE_FALSE' && q.trueFalseRows) {
            const obj: Record<number, boolean> = {};
            q.trueFalseRows.forEach((r, i) => obj[i] = r.answer);
            return JSON.stringify(obj);
        }
        if (q.questionType === 'MATCHING') {
            const obj: Record<number, string> = {};
            q.matchingPairs.forEach((p, i) => obj[i] = p.right);
            return JSON.stringify(obj);
        }
        return null;
    }, [q]);

    const normalize = (str: string) => str.trim().toLowerCase();

    const isCorrectAnswer = (ans: string) => {
        if (!correctAnswerString) return false;
        
        if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
            // FIX: Use parseList to safely handle JSON array comparison independent of order
            const sSet = new Set(parseList(ans).map(normalize));
            const cSet = new Set(parseList(correctAnswerString).map(normalize));
            return sSet.size === cSet.size && [...sSet].every(x => cSet.has(x));
        }

        if (ans === correctAnswerString) return true;
        if (q.questionType === 'FILL_IN_THE_BLANK' || q.questionType === 'MULTIPLE_CHOICE') {
            return normalize(ans) === normalize(correctAnswerString);
        }
        
        return false;
    };

    return (
        <div className={`border rounded-2xl bg-white dark:bg-slate-800 transition-all duration-300 overflow-hidden ${isExpanded ? 'shadow-md ring-1 ring-indigo-50 border-indigo-100 dark:border-indigo-900 dark:ring-indigo-900' : 'border-slate-100 dark:border-slate-700 hover:border-indigo-100 dark:hover:border-indigo-900'}`}>
            <div 
                className="p-5 cursor-pointer flex flex-col gap-3"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex justify-between items-start">
                    <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Soal {index + 1}</span>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase border ${difficultyColor}`}>
                        {stats.correctRate}% Benar • {difficultyLabel}
                    </span>
                </div>
                
                {(q.category || q.level || q.scoreWeight) && (
                    <div className="flex gap-2 mb-2">
                        {q.category && <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">{q.category}</span>}
                        {q.level && <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800">{q.level}</span>}
                        <span className="text-[10px] font-bold bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded border border-purple-100 dark:border-purple-800">Bobot: {q.scoreWeight || 1}</span>
                    </div>
                )}
                
                <div className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 font-medium" dangerouslySetInnerHTML={{ __html: q.questionText }}></div>

                <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
                    <div 
                        className={`h-full transition-all duration-1000 ${stats.correctRate >= 80 ? 'bg-emerald-500' : stats.correctRate >= 50 ? 'bg-orange-500' : 'bg-rose-500'}`} 
                        style={{ width: `${stats.correctRate}%` }}
                    ></div>
                </div>
                
                {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-700 animate-fade-in">
                        {/* NEW: Edit Key Section */}
                        {onUpdateKey && (
                            <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase flex items-center gap-2">
                                        <CheckCircleIcon className="w-4 h-4"/> Kunci Jawaban
                                    </span>
                                    {!isEditingKey ? (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setTempKey(q.correctAnswer || ''); setIsEditingKey(true); }} 
                                            className="text-[10px] font-bold bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 px-2 py-1 rounded text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900 transition-colors"
                                        >
                                            Ubah Kunci
                                        </button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setIsEditingKey(false); }} 
                                                className="text-[10px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                                disabled={isSaving}
                                            >
                                                Batal
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleSaveKey(); }} 
                                                className="text-[10px] font-bold bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
                                                disabled={isSaving}
                                            >
                                                {isSaving ? 'Menyimpan...' : 'Simpan'}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {isEditingKey ? (
                                    <div className="mt-2 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                                        {q.questionType === 'MULTIPLE_CHOICE' && q.options ? (
                                            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto custom-scrollbar">
                                                {q.options.map((opt, i) => (
                                                    <label key={i} className={`flex items-center gap-3 p-2 rounded border cursor-pointer transition-colors ${tempKey === opt ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500 dark:bg-emerald-900/30 dark:border-emerald-500' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                                        <input 
                                                            type="radio" 
                                                            name={`key-${q.id}`} 
                                                            value={opt} 
                                                            checked={tempKey === opt} 
                                                            onChange={(e) => setTempKey(e.target.value)}
                                                            className="text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                                                        />
                                                        <div className="flex-1 min-w-0 text-xs text-slate-700 dark:text-slate-300 [&_p]:inline [&_img]:max-h-10 [&_img]:inline-block" dangerouslySetInnerHTML={{__html: opt}}></div>
                                                    </label>
                                                ))}
                                            </div>
                                        ) : q.questionType === 'COMPLEX_MULTIPLE_CHOICE' && q.options ? (
                                            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto custom-scrollbar">
                                                {q.options.map((opt, i) => {
                                                    const currentKeys = parseList(tempKey);
                                                    const isChecked = currentKeys.includes(opt);
                                                    return (
                                                        <label key={i} className={`flex items-center gap-3 p-2 rounded border cursor-pointer transition-colors ${isChecked ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500 dark:bg-emerald-900/30 dark:border-emerald-500' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                                            <input 
                                                                type="checkbox" 
                                                                value={opt} 
                                                                checked={isChecked} 
                                                                onChange={(e) => {
                                                                    const newKeys = e.target.checked 
                                                                        ? [...currentKeys, opt]
                                                                        : currentKeys.filter(k => k !== opt);
                                                                    setTempKey(JSON.stringify(newKeys));
                                                                }}
                                                                className="text-emerald-600 focus:ring-emerald-500 w-4 h-4 rounded"
                                                            />
                                                            <div className="flex-1 min-w-0 text-xs text-slate-700 dark:text-slate-300 [&_p]:inline [&_img]:max-h-10 [&_img]:inline-block" dangerouslySetInnerHTML={{__html: opt}}></div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        ) : q.questionType === 'TRUE_FALSE' ? (
                                            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                                {(() => {
                                                    try {
                                                        const rows = JSON.parse(tempKey);
                                                        return rows.map((row: any, i: number) => (
                                                            <div key={i} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                                                                <div className="text-xs flex-1 mr-4 text-slate-700 dark:text-slate-300 [&_p]:inline [&_img]:max-h-10 [&_img]:inline-block" dangerouslySetInnerHTML={{__html: row.text}}></div>
                                                                <div className="flex gap-2 shrink-0">
                                                                    <button 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const newRows = [...rows];
                                                                            newRows[i].answer = true;
                                                                            setTempKey(JSON.stringify(newRows));
                                                                        }}
                                                                        className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-colors ${row.answer ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
                                                                    >
                                                                        Benar
                                                                    </button>
                                                                    <button 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const newRows = [...rows];
                                                                            newRows[i].answer = false;
                                                                            setTempKey(JSON.stringify(newRows));
                                                                        }}
                                                                        className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-colors ${!row.answer ? 'bg-rose-500 text-white border-rose-600 shadow-sm' : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
                                                                    >
                                                                        Salah
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ));
                                                    } catch (e) { return <p className="text-rose-500 text-xs italic">Gagal memuat data (format tidak valid)</p>; }
                                                })()}
                                            </div>
                                        ) : q.questionType === 'MATCHING' ? (
                                            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                                {(() => {
                                                    try {
                                                        const pairs = JSON.parse(tempKey);
                                                        return pairs.map((pair: any, i: number) => (
                                                            <div key={i} className="flex flex-col gap-1 p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                                                                <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Pasangan {i+1}</div>
                                                                <div className="text-xs text-slate-700 dark:text-slate-300 mb-2 p-2 bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700" dangerouslySetInnerHTML={{__html: pair.left}}></div>
                                                                <input 
                                                                    type="text" 
                                                                    value={pair.right} 
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onChange={(e) => {
                                                                        const newPairs = [...pairs];
                                                                        newPairs[i].right = e.target.value;
                                                                        setTempKey(JSON.stringify(newPairs));
                                                                    }}
                                                                    className="w-full text-xs p-2 border rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                                    placeholder="Jawaban Pasangan..."
                                                                />
                                                            </div>
                                                        ));
                                                    } catch (e) { return <p className="text-rose-500 text-xs italic">Gagal memuat data (format tidak valid)</p>; }
                                                })()}
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <p className="text-[10px] text-slate-500 italic">Masukkan kunci jawaban baru (teks persis):</p>
                                                <input 
                                                    type="text" 
                                                    value={tempKey} 
                                                    onChange={(e) => setTempKey(e.target.value)} 
                                                    className="w-full text-xs p-2 border rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    placeholder="Contoh: Jawaban Benar"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700">
                                        {q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK' ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-400 text-[10px] uppercase font-bold">Saat ini:</span>
                                                <div className="[&_p]:inline [&_img]:max-h-8 [&_img]:inline-block" dangerouslySetInnerHTML={{__html: q.correctAnswer || '<span class="text-rose-500 italic">Belum diset</span>'}}></div>
                                            </div>
                                        ) : (
                                            <span className="italic text-slate-500">Edit kunci untuk tipe soal ini belum didukung penuh di tampilan ini.</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Distribusi Jawaban Siswa</p>
                        
                        {q.questionType === 'MULTIPLE_CHOICE' && q.options ? (
                            <div className="space-y-2">
                                {q.options.map((opt, i) => {
                                    // FIX: Sum counts of all answers that match this option (normalized)
                                    const count = Object.entries(distribution.counts).reduce((acc, [ans, c]) => {
                                        return normalize(ans) === normalize(opt) ? acc + c : acc;
                                    }, 0);
                                    
                                    const percentage = distribution.totalStudents > 0 ? Math.round((count / distribution.totalStudents) * 100) : 0;
                                    const isCorrect = opt === q.correctAnswer;
                                    
                                    return (
                                        <div key={i} className={`relative flex items-center justify-between p-2 rounded-lg text-xs ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800' : count > 0 ? 'bg-slate-50 dark:bg-slate-700/50' : ''}`}>
                                            <div className="flex items-center gap-2 z-10 w-full overflow-hidden">
                                                <span className={`w-5 h-5 flex shrink-0 items-center justify-center rounded font-bold ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300'}`}>
                                                    {String.fromCharCode(65+i)}
                                                </span>
                                                {/* FIX: Removed truncate, added max-w-full and image styling */}
                                                <div className="flex-1 min-w-0 [&_p]:inline [&_br]:hidden dark:text-slate-300 option-content [&_img]:max-h-20 [&_img]:w-auto [&_img]:inline-block" dangerouslySetInnerHTML={{ __html: opt }}></div>
                                                <span className="font-bold text-slate-600 dark:text-slate-300 shrink-0 ml-2">{count} Siswa ({percentage}%)</span>
                                            </div>
                                            <div className={`absolute top-0 left-0 h-full rounded-lg opacity-10 ${isCorrect ? 'bg-emerald-500' : 'bg-slate-500'}`} style={{ width: `${percentage}%` }}></div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="max-h-40 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-700/30 p-3 rounded-xl">
                                {q.correctAnswer || (q.questionType === 'TRUE_FALSE' || q.questionType === 'MATCHING') ? (
                                    <div className="mb-2 p-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded text-xs text-indigo-700 dark:text-indigo-300">
                                        <span className="font-bold">Kunci Jawaban: </span> 
                                        {q.questionType === 'TRUE_FALSE' && q.trueFalseRows ? 
                                            <div className="inline">
                                                {q.trueFalseRows.map((r, i) => (
                                                    <span key={i}>
                                                        <span dangerouslySetInnerHTML={{__html: r.text}} className="inline answer-key-reset [&_p]:inline [&_span]:inline" />
                                                        <span className="font-bold"> ({r.answer ? 'Benar' : 'Salah'})</span>
                                                        {i < q.trueFalseRows!.length - 1 && ', '}
                                                    </span>
                                                ))}
                                            </div> :
                                        q.questionType === 'MATCHING' && q.matchingPairs ?
                                            q.matchingPairs.map(p => `${p.left}→${p.right}`).join(', ') :
                                            <span dangerouslySetInnerHTML={{__html: q.correctAnswer || ''}}></span>
                                        }
                                    </div>
                                ) : null}
                                <ul className="space-y-2">
                                    {Object.entries(distribution.counts).map(([ans, count], idx) => {
                                        const isCorrect = isCorrectAnswer(ans);
                                        let displayAns = ans;
                                        try {
                                            if (ans.startsWith('{')) {
                                                const parsed = JSON.parse(ans);
                                                displayAns = Object.entries(parsed).map(([k,v]) => `${v}`).join(', ');
                                            } else if (ans.startsWith('[')) {
                                                const parsed = JSON.parse(ans);
                                                displayAns = parsed.join(', ');
                                            }
                                        } catch(e){}

                                        return (
                                            <li key={idx} className={`text-xs flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1 last:border-0 items-center ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20 p-1 rounded -mx-1 border-emerald-100 dark:border-emerald-800' : 'text-slate-600 dark:text-slate-300'}`}>
                                                <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                                                    {isCorrect && <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0"/>}
                                                    {/* FIX: Removed truncate, added image styling */}
                                                    <div className={`italic ${isCorrect ? 'text-emerald-700 dark:text-emerald-400 font-medium' : ''} [&_p]:inline [&_br]:hidden option-content [&_img]:max-h-10 [&_img]:w-auto [&_img]:inline-block`} dangerouslySetInnerHTML={{__html: displayAns}}></div>
                                                </div>
                                                <span className={`font-bold ml-2 ${isCorrect ? 'text-emerald-700 dark:text-emerald-400' : ''}`}>{count} Siswa</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
                
                <div className="flex justify-center mt-1">
                     {isExpanded ? <ChevronUpIcon className="w-4 h-4 text-slate-300 dark:text-slate-600"/> : <ChevronDownIcon className="w-4 h-4 text-slate-300 dark:text-slate-600"/>}
                </div>
            </div>
        </div>
    );
};

export const RemainingTime: React.FC<{ exam: Exam; minimal?: boolean }> = ({ exam, minimal = false }) => {
    const calculateTimeLeft = () => {
        const dateStr = exam.config.date.includes('T') ? exam.config.date.split('T')[0] : exam.config.date;
        const examStartDateTime = new Date(`${dateStr}T${exam.config.startTime}`);
        const examEndTime = examStartDateTime.getTime() + exam.config.timeLimit * 60 * 1000;
        const now = Date.now();
        if (now < examStartDateTime.getTime()) { return { status: 'UPCOMING', diff: examStartDateTime.getTime() - now }; }
        const timeLeft = Math.max(0, examEndTime - now);
        return { status: timeLeft === 0 ? 'FINISHED' : 'ONGOING', diff: timeLeft };
    };
    const [timeState, setTimeState] = useState(calculateTimeLeft());
    useEffect(() => { const timer = setInterval(() => { setTimeState(calculateTimeLeft()); }, 1000); return () => clearInterval(timer); }, [exam]);
    if (timeState.status === 'FINISHED') return (<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300 border border-gray-200 dark:border-slate-600`}>Selesai</span>);
    if (timeState.status === 'UPCOMING') return (<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800`}>Belum Dimulai</span>);
    const hours = Math.floor(timeState.diff / (1000 * 60 * 60)); const minutes = Math.floor((timeState.diff % (1000 * 60 * 60)) / (1000 * 60)); const seconds = Math.floor((timeState.diff % (1000 * 60)) / 1000); const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    const totalMinutesLeft = timeState.diff / (1000 * 60); 
    let colorClass = "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800"; 
    let dotClass = "bg-emerald-500"; 
    if (totalMinutesLeft < 5) { colorClass = "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800 animate-pulse"; dotClass = "bg-rose-500"; } 
    else if (totalMinutesLeft < 15) { colorClass = "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800"; dotClass = "bg-amber-500"; }
    if (minimal) { return <span className="font-mono font-bold tracking-tight">{timeString}</span>; }
    return (<div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colorClass} transition-colors duration-500`}><span className="relative flex h-2 w-2"><span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotClass}`}></span><span className={`relative inline-flex rounded-full h-2 w-2 ${dotClass}`}></span></span><span className="font-mono text-sm font-bold tracking-widest tabular-nums">{timeString}</span></div>);
};

export const MetaBadge: React.FC<{ text: string; colorClass?: string }> = ({ text, colorClass = "bg-gray-100 text-gray-600" }) => { 
    if (!text || text === 'Lainnya') return null; 
    let darkClass = "";
    if (colorClass.includes("blue")) darkClass = "dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
    else if (colorClass.includes("purple")) darkClass = "dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800";
    else if (colorClass.includes("gray")) darkClass = "dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600";
    else darkClass = "dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600";

    return (<span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border border-opacity-50 ${colorClass} ${darkClass}`}>{text}</span>); 
};
