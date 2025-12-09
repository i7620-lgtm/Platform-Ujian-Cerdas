
import React, { useState, useRef, useEffect } from 'react';
import type { Question, QuestionType, ExamConfig } from '../../types';
import { 
    TrashIcon, XMarkIcon, PlusCircleIcon, PhotoIcon, 
    FileTextIcon, ListBulletIcon, CheckCircleIcon, PencilIcon, FileWordIcon, CheckIcon, ArrowLeftIcon 
} from '../Icons';
import { compressImage } from './examUtils';

interface ExamEditorProps {
    questions: Question[];
    setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
    config: ExamConfig;
    setConfig: React.Dispatch<React.SetStateAction<ExamConfig>>;
    isEditing: boolean;
    onSave: () => void;
    onCancel: () => void;
    generatedCode: string;
    onReset: () => void;
}

export const ExamEditor: React.FC<ExamEditorProps> = ({ 
    questions, setQuestions, config, setConfig, isEditing, onSave, onCancel, generatedCode, onReset 
}) => {
    const [isTypeSelectionModalOpen, setIsTypeSelectionModalOpen] = useState(false);
    const [insertIndex, setInsertIndex] = useState<number | null>(null);
    const questionsSectionRef = useRef<HTMLDivElement>(null);
    const generatedCodeSectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isEditing && questions.length > 0 && !generatedCode && questionsSectionRef.current) {
            // Scroll to editor on mount if creating new
            setTimeout(() => {
                questionsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 500);
        }
    }, []);

    useEffect(() => {
        if (generatedCode && generatedCodeSectionRef.current) {
            setTimeout(() => {
                generatedCodeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 200);
        }
    }, [generatedCode]);

    const isDataUrl = (str: string) => str.startsWith('data:image/');

    const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, qId: string, optIndex?: number) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            const rawDataUrl = ev.target?.result as string;
            // Compress Image before setting state to avoid payload too large
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

    // --- RENDER HELPERS ---

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
            {/* --- SECTION 1: QUESTIONS --- */}
            <div ref={questionsSectionRef} className="space-y-4">
                 <div className="p-4 bg-primary/5 rounded-lg">
                    <h2 className="text-xl font-bold text-neutral">
                        {isEditing ? '1. Tinjau dan Edit Soal' : '3. Tinjau dan Edit Soal'}
                    </h2>
                    <p className="text-sm text-base-content mt-1">Periksa kembali soal yang telah dibuat. Anda dapat mengedit, menghapus, atau menambahkan soal baru.</p>
                </div>
                <div className="space-y-4">
                    {questions.map((q, index) => (
                        <React.Fragment key={q.id}>
                            <div id={q.id} className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm group hover:shadow-md transition-shadow relative">
                                    <div>
                                        {/* TYPE BADGE */}
                                        <div className="flex justify-center mb-4">
                                            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200 shadow-sm">
                                                {q.questionType === 'MULTIPLE_CHOICE' && 'Pilihan Ganda'}
                                                {q.questionType === 'COMPLEX_MULTIPLE_CHOICE' && 'Pilihan Ganda Kompleks'}
                                                {q.questionType === 'TRUE_FALSE' && 'Benar / Salah'}
                                                {q.questionType === 'MATCHING' && 'Menjodohkan'}
                                                {q.questionType === 'ESSAY' && 'Esai'}
                                                {q.questionType === 'FILL_IN_THE_BLANK' && 'Isian Singkat'}
                                                {q.questionType === 'INFO' && 'Keterangan / Info'}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-start gap-2 mb-2">
                                                    <span className="text-primary font-bold mt-2">{index + 1}.</span>
                                                    <div className="flex-1 space-y-2">
                                                        <textarea
                                                            value={q.questionText}
                                                            onChange={(e) => handleQuestionTextChange(q.id, e.target.value)}
                                                            className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary text-sm leading-relaxed break-words ${isDataUrl(q.questionText) ? 'hidden' : 'min-h-[80px]'}`}
                                                            placeholder={q.questionType === 'INFO' ? "Tulis informasi atau teks bacaan di sini..." : "Tulis pertanyaan di sini..."}
                                                        />
                                                        {(isDataUrl(q.questionText) || q.imageUrl) && (
                                                            <div className="relative inline-block group/img mt-2">
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
                                                        <div className="flex justify-end">
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
                                                <div className="space-y-3">
                                                    {q.options.map((option, i) => (
                                                        <div key={i} className={`relative flex items-start gap-3 p-3 pr-10 rounded-md border group/opt ${q.correctAnswer === option ? 'bg-green-50 border-green-300 ring-1 ring-green-300' : 'bg-gray-50 border-gray-200'}`}>
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
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="text"
                                                                        value={option}
                                                                        onChange={(e) => handleOptionTextChange(q.id, i, e.target.value)}
                                                                        className={`block w-full px-2 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-sm break-words ${isDataUrl(option) ? 'hidden' : ''}`}
                                                                        placeholder={`Opsi ${String.fromCharCode(65 + i)}`}
                                                                    />
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
                                                    ))}
                                                </div>
                                                <button 
                                                    onClick={() => handleAddOption(q.id)}
                                                    className="mt-2 text-xs text-primary font-semibold hover:text-primary-focus flex items-center gap-1 hover:underline"
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
                                                <div className="space-y-3">
                                                    {q.options.map((option, i) => {
                                                        const isChecked = q.correctAnswer ? q.correctAnswer.split(',').includes(option) : false;
                                                        return (
                                                        <div key={i} className={`relative flex items-start gap-3 p-3 pr-10 rounded-md border group/opt ${isChecked ? 'bg-green-50 border-green-300 ring-1 ring-green-300' : 'bg-gray-50 border-gray-200'}`}>
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
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="text"
                                                                        value={option}
                                                                        onChange={(e) => handleOptionTextChange(q.id, i, e.target.value)}
                                                                        className={`block w-full px-2 py-1.5 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-sm break-words ${isDataUrl(option) ? 'hidden' : ''}`}
                                                                        placeholder={`Opsi ${String.fromCharCode(65 + i)}`}
                                                                    />
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
                                                    )})}
                                                </div>
                                                 <button 
                                                    onClick={() => handleAddOption(q.id)}
                                                    className="mt-2 text-xs text-primary font-semibold hover:text-primary-focus flex items-center gap-1 hover:underline"
                                                >
                                                    <PlusCircleIcon className="w-4 h-4" />
                                                    Tambah Opsi
                                                </button>
                                            </div>
                                        )}
                                        
                                        {/* EDITOR: TRUE/FALSE */}
                                        {q.questionType === 'TRUE_FALSE' && q.trueFalseRows && (
                                            <div className="mt-3 ml-8">
                                                <p className="text-xs text-gray-500 mb-2 italic">Tentukan pernyataan dan kunci jawabannya (Benar/Salah).</p>
                                                <div className="overflow-x-auto border rounded-md">
                                                    <table className="w-full text-sm text-left">
                                                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                                                            <tr>
                                                                <th className="px-4 py-2 w-full">Pernyataan</th>
                                                                <th className="px-4 py-2 text-center w-24">Benar</th>
                                                                <th className="px-4 py-2 text-center w-24">Salah</th>
                                                                <th className="px-2 py-2 w-10"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {q.trueFalseRows.map((row, i) => (
                                                                <tr key={i} className="bg-white hover:bg-gray-50">
                                                                    <td className="px-4 py-2">
                                                                        <input 
                                                                            type="text"
                                                                            value={row.text}
                                                                            onChange={(e) => handleTrueFalseRowTextChange(q.id, i, e.target.value)}
                                                                            className="w-full border-gray-300 rounded focus:ring-primary focus:border-primary text-sm p-1.5"
                                                                            placeholder="Tulis pernyataan..."
                                                                        />
                                                                    </td>
                                                                    <td className="px-4 py-2 text-center">
                                                                        <input 
                                                                            type="radio"
                                                                            name={`tf-row-${q.id}-${i}`}
                                                                            checked={row.answer === true}
                                                                            onChange={() => handleTrueFalseRowAnswerChange(q.id, i, true)}
                                                                            className="w-4 h-4 text-green-600 focus:ring-green-500 cursor-pointer"
                                                                        />
                                                                    </td>
                                                                    <td className="px-4 py-2 text-center">
                                                                        <input 
                                                                            type="radio"
                                                                            name={`tf-row-${q.id}-${i}`}
                                                                            checked={row.answer === false}
                                                                            onChange={() => handleTrueFalseRowAnswerChange(q.id, i, false)}
                                                                            className="w-4 h-4 text-red-600 focus:ring-red-500 cursor-pointer"
                                                                        />
                                                                    </td>
                                                                    <td className="px-2 py-2 text-center">
                                                                         <button onClick={() => handleDeleteTrueFalseRow(q.id, i)} className="text-gray-400 hover:text-red-500 p-1">
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
                                                    className="mt-2 text-xs text-primary font-semibold hover:text-primary-focus flex items-center gap-1 hover:underline"
                                                >
                                                    <PlusCircleIcon className="w-4 h-4" />
                                                    Tambah Pernyataan
                                                </button>
                                            </div>
                                        )}

                                        {/* EDITOR: MATCHING */}
                                        {q.questionType === 'MATCHING' && q.matchingPairs && (
                                             <div className="mt-3 ml-8">
                                                <p className="text-xs text-gray-500 mb-2 italic">Pasangkan item di kolom kiri dengan jawaban yang benar di kolom kanan.</p>
                                                <div className="space-y-2">
                                                    {q.matchingPairs.map((pair, i) => (
                                                        <div key={i} className="flex gap-2 items-center bg-gray-50 p-2 rounded border">
                                                             <div className="flex-1">
                                                                 <input 
                                                                    type="text" 
                                                                    placeholder="Item Kiri"
                                                                    value={pair.left}
                                                                    onChange={(e) => handleMatchingPairChange(q.id, i, 'left', e.target.value)}
                                                                    className="w-full text-sm p-1 border rounded"
                                                                 />
                                                             </div>
                                                             <div className="text-gray-400">→</div>
                                                             <div className="flex-1">
                                                                 <input 
                                                                    type="text" 
                                                                    placeholder="Pasangan Kanan (Benar)"
                                                                    value={pair.right}
                                                                    onChange={(e) => handleMatchingPairChange(q.id, i, 'right', e.target.value)}
                                                                    className="w-full text-sm p-1 border rounded bg-green-50 border-green-200"
                                                                 />
                                                             </div>
                                                             <button onClick={() => handleDeleteMatchingPair(q.id, i)} className="text-gray-400 hover:text-red-500 p-1">
                                                                 <TrashIcon className="w-4 h-4"/>
                                                             </button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <button 
                                                    onClick={() => handleAddMatchingPair(q.id)}
                                                    className="mt-2 text-xs text-primary font-semibold hover:text-primary-focus flex items-center gap-1 hover:underline"
                                                >
                                                    <PlusCircleIcon className="w-4 h-4" />
                                                    Tambah Pasangan
                                                </button>
                                             </div>
                                        )}

                                        {(q.questionType === 'FILL_IN_THE_BLANK' || q.questionType === 'ESSAY') && (
                                             <div className="mt-3 ml-8">
                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                    {q.questionType === 'ESSAY' ? 'Jawaban Referensi / Poin Penting' : 'Kunci Jawaban'}
                                                </label>
                                                {q.questionType === 'ESSAY' ? (
                                                     <textarea 
                                                        value={q.correctAnswer || ''}
                                                        onChange={(e) => handleCorrectAnswerChange(q.id, e.target.value)}
                                                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm break-words min-h-[60px]"
                                                        placeholder="Tuliskan poin-poin jawaban yang diharapkan (opsional, untuk referensi guru)"
                                                    />
                                                ) : (
                                                    <input 
                                                        type="text"
                                                        value={q.correctAnswer || ''}
                                                        onChange={(e) => handleCorrectAnswerChange(q.id, e.target.value)}
                                                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm break-words"
                                                        placeholder="Masukkan jawaban yang benar"
                                                    />
                                                )}
                                             </div>
                                        )}
                                    </div>
                            </div>
                            
                            {/* INSERT QUESTION DIVIDER */}
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
                    ))}
                </div>
                 <div className="mt-6 text-center">
                    <button onClick={() => openTypeSelectionModal(null)} className="flex items-center gap-2 text-sm text-primary font-semibold hover:text-primary-focus mx-auto transition-colors bg-primary/5 px-4 py-2 rounded-full hover:bg-primary/10">
                        <PlusCircleIcon className="w-5 h-5" />
                        Tambah Soal Manual Di Bawah
                    </button>
                </div>
             </div>

            {/* --- SECTION 2: CONFIGURATION --- */}
            <div>
                 <div className="p-4 bg-primary/5 rounded-lg">
                    <h2 className="text-xl font-bold text-neutral">
                        {isEditing ? '2. Atur Konfigurasi Ujian' : '4. Atur Konfigurasi Ujian'}
                    </h2>
                     <p className="text-sm text-base-content mt-1">Atur jadwal, durasi, dan aturan pengerjaan ujian.</p>
                </div>
                <div className="mt-4 bg-white p-6 border rounded-lg grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 shadow-sm">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Tanggal Ujian</label>
                        <input type="date" name="date" value={new Date(config.date).toISOString().split('T')[0]} onChange={handleConfigChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Waktu Mulai Ujian</label>
                        <input type="time" name="startTime" value={config.startTime} onChange={handleConfigChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Batas Waktu (menit)</label>
                        <input type="number" name="timeLimit" value={config.timeLimit} onChange={handleConfigChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Simpan Otomatis (detik)</label>
                        <input type="number" name="autoSaveInterval" value={config.autoSaveInterval} onChange={handleConfigChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
                    </div>
                    <div className="md:col-span-2 space-y-3 pt-2">
                       <label className="flex items-center cursor-pointer"><input type="checkbox" name="shuffleQuestions" checked={config.shuffleQuestions} onChange={handleConfigChange} className="h-4 w-4 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-2 text-sm text-gray-700">Acak Urutan Soal</span></label>
                       <label className="flex items-center cursor-pointer"><input type="checkbox" name="shuffleAnswers" checked={config.shuffleAnswers} onChange={handleConfigChange} className="h-4 w-4 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-2 text-sm text-gray-700">Acak Urutan Jawaban (Pilihan Ganda)</span></label>
                       <label className="flex items-center cursor-pointer"><input type="checkbox" name="allowRetakes" checked={config.allowRetakes} onChange={handleConfigChange} className="h-4 w-4 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-2 text-sm text-gray-700">Izinkan Siswa Mengerjakan Ulang</span></label>
                       <label className="flex items-center cursor-pointer"><input type="checkbox" name="detectBehavior" checked={config.detectBehavior} onChange={handleConfigChange} className="h-4 w-4 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-2 text-sm text-gray-700">Deteksi Pindah Tab/Aplikasi</span></label>
                       {config.detectBehavior && (
                        <label className="flex items-center ml-6 cursor-pointer"><input type="checkbox" name="continueWithPermission" checked={config.continueWithPermission} onChange={handleConfigChange} className="h-4 w-4 rounded text-primary focus:ring-primary border-gray-300" /><span className="ml-2 text-sm text-gray-700">Hentikan Ujian & Perlu Izin Guru untuk Melanjutkan</span></label>
                       )}
                       
                       {/* NEW CONFIGURATIONS */}
                       <div className="pt-2 mt-2 border-t border-gray-100 space-y-3">
                           <h4 className="text-sm font-bold text-gray-800">Pengaturan Lanjutan</h4>
                           <label className="flex items-center cursor-pointer">
                               <input type="checkbox" name="showResultToStudent" checked={config.showResultToStudent} onChange={handleConfigChange} className="h-4 w-4 rounded text-primary focus:ring-primary border-gray-300" />
                               <span className="ml-2 text-sm text-gray-700">Tampilkan Nilai ke Siswa Setelah Selesai</span>
                           </label>
                           {/* Feature prepared but hidden or disabled logic can be added later */}
                           <label className="flex items-center cursor-pointer">
                               <input type="checkbox" name="showCorrectAnswer" checked={config.showCorrectAnswer} onChange={handleConfigChange} className="h-4 w-4 rounded text-primary focus:ring-primary border-gray-300" />
                               <span className="ml-2 text-sm text-gray-700">Tampilkan Kunci Jawaban Setelah Selesai (Review)</span>
                           </label>
                           <label className="flex items-center cursor-pointer">
                               <input type="checkbox" name="enablePublicStream" checked={config.enablePublicStream} onChange={handleConfigChange} className="h-4 w-4 rounded text-primary focus:ring-primary border-gray-300" />
                               <span className="ml-2 text-sm text-gray-700">Aktifkan Link Livestream Publik (Tanpa Login)</span>
                           </label>
                           <label className="flex items-center cursor-pointer">
                               <input type="checkbox" name="trackLocation" checked={config.trackLocation} onChange={handleConfigChange} className="h-4 w-4 rounded text-primary focus:ring-primary border-gray-300" />
                               <span className="ml-2 text-sm text-gray-700">Lacak Lokasi Siswa saat Submit (GPS)</span>
                           </label>
                       </div>
                    </div>
                </div>
            </div>

            {/* --- SECTION 3: ACTIONS --- */}
            <div className="text-center pt-4 mt-8 pb-12">
                {isEditing ? (
                    <div className="flex justify-center items-center gap-4">
                        <button onClick={onCancel} className="bg-white text-gray-700 border border-gray-300 font-bold py-3 px-8 rounded-lg hover:bg-gray-50 transition-colors duration-300 shadow-sm">
                            Batal
                        </button>
                        <button onClick={onSave} className="bg-primary text-primary-content font-bold py-3 px-12 rounded-lg hover:bg-primary-focus transition-colors duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                            Simpan Perubahan
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="border-t pt-8">
                            <button onClick={onSave} className="bg-green-600 text-white font-bold py-3 px-12 rounded-lg hover:bg-green-700 transition-colors duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center gap-2 mx-auto">
                                <CheckCircleIcon className="w-6 h-6" />
                                Buat Ujian
                            </button>
                        </div>
                        {generatedCode && (
                            <div ref={generatedCodeSectionRef} className="mt-8 p-4 rounded-lg animate-fade-in text-center max-w-md mx-auto">
                                <div className="bg-green-50 border border-green-200 text-green-800 p-6 rounded-xl text-left shadow-sm">
                                    <h4 className="font-bold text-lg mb-2 flex items-center gap-2"><CheckCircleIcon className="w-5 h-5 text-green-600"/> Ujian Berhasil Dibuat!</h4>
                                    <p className="text-sm text-green-700 mb-4">Bagikan kode berikut kepada siswa untuk memulai ujian:</p>
                                    <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-green-200 shadow-inner">
                                        <span className="text-3xl font-mono tracking-widest text-neutral font-bold">{generatedCode}</span>
                                        <button onClick={() => navigator.clipboard.writeText(generatedCode)} className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded hover:bg-gray-200 font-semibold transition-colors border border-gray-300">
                                            Salin Kode
                                        </button>
                                    </div>
                                </div>
                                <button onClick={onReset} className="mt-8 bg-white text-primary border border-primary font-bold py-2 px-8 rounded-lg hover:bg-primary-50 transition-colors duration-300 shadow-sm">
                                    Buat Ujian Baru
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {renderTypeSelectionModal()}
        </div>
    );
};
