import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Question, QuestionType, ExamConfig, ChartData } from '../types';
import { parseList, isAnswerMatch } from '../components/teacher/examUtils';
import { useExamEditorUIStore, type ChartTarget } from './examEditorUIStore';

const createNewQuestion = (type: QuestionType): Question => {
    const base = { id: `q-${Date.now()}-${Math.random()}`, questionText: '', questionType: type, imageUrl: undefined, optionImages: undefined, category: '', level: '', kisiKisi: '', scoreWeight: 1 };
    switch (type) {
        case 'INFO': return { ...base }; 
        case 'MULTIPLE_CHOICE': return { ...base, options: ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'], correctAnswer: 'Opsi A' }; 
        case 'COMPLEX_MULTIPLE_CHOICE': return { ...base, options: ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'], correctAnswer: '' }; 
        case 'TRUE_FALSE': return { ...base, trueFalseRows: [{ text: 'Pernyataan 1', answer: true }, { text: 'Pernyataan 2', answer: false }], options: undefined, correctAnswer: undefined }; 
        case 'MATCHING': return { ...base, matchingPairs: [{ left: 'Item A', right: 'Pasangan A' }, { left: 'Item B', right: 'Pasangan B' }] }; 
        case 'FILL_IN_THE_BLANK': return { ...base, correctAnswer: '' }; 
        case 'ESSAY': 
        default: return { ...base };
    }
};

interface ExamEditorState {
    // Source of truth state (no cascading props)
    questions: Question[];
    config: ExamConfig;

    // Methods
    setQuestions: (questions: Question[]) => void;
    setConfig: (config: ExamConfig) => void;
    reset: () => void;

    // Mutator actions
    handleAddClassTag: (newTag: string) => void;
    removeClassTag: (tag: string) => void;
    handleConfigChangeManual: (updater: (prev: ExamConfig) => ExamConfig) => void;
    handleSubjectSelect: (subject: string) => void;
    handleSaveChart: (data: ChartData) => void;
    handleQuestionTextChange: (id: string, text: string) => void;
    handleCategoryChange: (id: string, category: string) => void;
    handleLevelChange: (id: string, level: string) => void;
    handleKisiKisiChange: (id: string, kisiKisi: string) => void;
    handleScoreWeightChange: (id: string, weight: number) => void;
    handleTypeChange: (qId: string, newType: QuestionType) => void;
    handleOptionTextChange: (qId: string, optIndex: number, text: string) => void;
    handleCorrectAnswerChange: (questionId: string, answer: string) => void;
    handleComplexCorrectAnswerChange: (questionId: string, option: string, isChecked: boolean) => void;
    handleDeleteQuestion: (id: string) => void;
    handleSelectQuestionType: (type: QuestionType) => void;
    handleAddOption: (questionId: string) => void;
    handleDeleteOption: (questionId: string, indexToRemove: number) => void;
    
    handleTrueFalseRowTextChange: (qId: string, idx: number, val: string) => void;
    handleTrueFalseRowAnswerChange: (qId: string, idx: number, val: boolean) => void;
    handleAddTrueFalseRow: (qId: string) => void;
    handleDeleteTrueFalseRow: (qId: string, idx: number) => void;

    handleMatchingPairChange: (qId: string, idx: number, field: 'left' | 'right', value: string) => void;
    handleAddMatchingPair: (qId: string) => void;
    handleDeleteMatchingPair: (qId: string, idx: number) => void;
    handleDeleteChart: () => void;
}

const checkAndCascade = (state: any) => {
    const hasManualGrading = state.questions.some(
        (q: any) => q.questionType === 'ESSAY' || q.questionType === 'FILL_IN_THE_BLANK'
    );
    if (hasManualGrading && state.config.showResultToStudent) {
        state.config.showResultToStudent = false;
    }
};

export const useExamEditorStore = create<ExamEditorState>()(
    immer((set) => ({
        questions: [],
        config: {} as ExamConfig,

        setQuestions: (questions) => set((state) => {
            state.questions = questions;
        }),

        setConfig: (config) => set((state) => {
            state.config = config;
        }),

        reset: () => set((state) => {
            state.questions = [];
            state.config = {} as ExamConfig;
            useExamEditorUIStore.getState().resetUI();
        }),

        handleAddClassTag: (newTag) => set((state) => {
            if (!state.config.targetClasses?.includes(newTag)) {
                state.config.targetClasses = [...(state.config.targetClasses || []), newTag];
            }
            useExamEditorUIStore.getState().setClassTagInput('');
        }),

        removeClassTag: (tag) => set((state) => {
            state.config.targetClasses = state.config.targetClasses?.filter(t => t !== tag) || [];
        }),

        handleConfigChangeManual: (updater) => set((state) => {
            state.config = updater(state.config);
        }),

        handleSubjectSelect: (subject) => set((state) => {
            state.config.subject = subject;
        }),

        handleSaveChart: (data) => set((state) => {
            const target = useExamEditorUIStore.getState().editingChartTarget;
            if (target) {
                const { qId, type, index, subIndex } = target;
                state.questions = state.questions.map((q) => {
                    if (q.id === qId) {
                        const updated = { ...q };
                        if (type === 'question') {
                            updated.chartData = data;
                        } else if (type === 'option' && index !== undefined) {
                            const optionCharts = [...(q.optionCharts || [])];
                            while (optionCharts.length <= index) optionCharts.push(null);
                            optionCharts[index] = data;
                            updated.optionCharts = optionCharts;
                        } else if (type === 'tf' && index !== undefined) {
                            const trueFalseRows = [...(q.trueFalseRows || [])];
                            trueFalseRows[index] = { ...trueFalseRows[index], chartData: data };
                            updated.trueFalseRows = trueFalseRows;
                        } else if (type === 'matching' && index !== undefined && subIndex) {
                            const matchingPairs = [...(q.matchingPairs || [])];
                            if (subIndex === 'left') {
                                matchingPairs[index] = { ...matchingPairs[index], leftChart: data };
                            } else {
                                matchingPairs[index] = { ...matchingPairs[index], rightChart: data };
                            }
                            updated.matchingPairs = matchingPairs;
                        } else if (type === 'correctAnswer') {
                            updated.correctAnswerChart = data;
                        }
                        return updated;
                    }
                    return q;
                });
                checkAndCascade(state);
            }
        }),

        handleQuestionTextChange: (id, text) => set((state) => {
            const index = state.questions.findIndex(q => q.id === id);
            if (index !== -1) {
                state.questions[index].questionText = text;
            }
        }),

        handleCategoryChange: (id, category) => set((state) => {
            const index = state.questions.findIndex(q => q.id === id);
            if (index !== -1) {
                state.questions[index].category = category;
            }
        }),

        handleLevelChange: (id, level) => set((state) => {
            const index = state.questions.findIndex(q => q.id === id);
            if (index !== -1) {
                state.questions[index].level = level;
            }
        }),

        handleKisiKisiChange: (id, kisiKisi) => set((state) => {
            const index = state.questions.findIndex(q => q.id === id);
            if (index !== -1) {
                state.questions[index].kisiKisi = kisiKisi;
            }
        }),

        handleScoreWeightChange: (id, weight) => set((state) => {
            const index = state.questions.findIndex(q => q.id === id);
            if (index !== -1) {
                state.questions[index].scoreWeight = weight;
            }
        }),

        handleTypeChange: (qId, newType) => set((state) => {
            state.questions = state.questions.map((q) => {
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
            });
            checkAndCascade(state);
        }),

        handleOptionTextChange: (qId, optIndex, text) => set((state) => {
            state.questions = state.questions.map((q) => {
                if (q.id === qId && q.options) {
                    const oldOption = q.options[optIndex]; 
                    const newOptions = [...q.options]; 
                    newOptions[optIndex] = text; 
                    let newCorrectAnswer = q.correctAnswer;
                    
                    if (q.questionType === 'MULTIPLE_CHOICE') { 
                        if (isAnswerMatch(q.correctAnswer, oldOption, q.questionType)) newCorrectAnswer = text; 
                    } 
                    else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') { 
                        let answers = parseList(q.correctAnswer);
                        if (answers.some(a => isAnswerMatch(a, oldOption, q.questionType))) { 
                            answers = answers.map(a => isAnswerMatch(a, oldOption, q.questionType) ? text : a); 
                            newCorrectAnswer = JSON.stringify(answers); 
                        } 
                    }
                    return { ...q, options: newOptions, correctAnswer: newCorrectAnswer };
                }
                return q;
            });
        }),

        handleCorrectAnswerChange: (questionId, answer) => set((state) => {
            const index = state.questions.findIndex(q => q.id === questionId);
            if (index !== -1) {
                state.questions[index].correctAnswer = answer;
            }
        }),

        handleComplexCorrectAnswerChange: (questionId, option, isChecked) => set((state) => {
            state.questions = state.questions.map((q) => {
                if (q.id === questionId) {
                    const currentAnswers = parseList(q.correctAnswer);
                    const currentlyCheckedOptions = (q.options || []).filter(o => 
                        currentAnswers.some(a => isAnswerMatch(a, o, q.questionType))
                    );
                    
                    let newKeys;
                    if (isChecked) { 
                        newKeys = currentlyCheckedOptions.includes(option) ? currentlyCheckedOptions : [...currentlyCheckedOptions, option];
                    } else { 
                        newKeys = currentlyCheckedOptions.filter(o => o !== option);
                    } 
                    newKeys.sort((a, b) => (q.options || []).indexOf(a) - (q.options || []).indexOf(b));
                    return { ...q, correctAnswer: JSON.stringify(newKeys) };
                }
                return q;
            });
        }),

        handleDeleteQuestion: (id) => set((state) => {
            state.questions = state.questions.filter((q) => q.id !== id);
            checkAndCascade(state);
        }),

        handleSelectQuestionType: (type) => set((state) => {
            const newQuestion = createNewQuestion(type);
            const insertIndex = useExamEditorUIStore.getState().insertIndex;
            if (insertIndex === null) {
                state.questions.push(newQuestion);
                setTimeout(() => {
                    document.getElementById(newQuestion.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            } else {
                state.questions.splice(insertIndex + 1, 0, newQuestion);
            }
            useExamEditorUIStore.getState().setTypeSelectionModalOpen(false);
            useExamEditorUIStore.getState().setInsertIndex(null);
            checkAndCascade(state);
        }),

        handleAddOption: (questionId) => set((state) => {
            state.questions = state.questions.map((q) => {
                if (q.id === questionId && q.options) {
                    const nextChar = String.fromCharCode(65 + q.options.length);
                    const newOptions = [...q.options, `Opsi ${nextChar}`];
                    const newOptionImages = q.optionImages ? [...q.optionImages, null] : undefined;
                    const newOptionCharts = q.optionCharts ? [...q.optionCharts, null] : undefined;
                    return { ...q, options: newOptions, optionImages: newOptionImages, optionCharts: newOptionCharts };
                }
                return q;
            });
        }),

        handleDeleteOption: (questionId, indexToRemove) => set((state) => {
            state.questions = state.questions.map((q) => {
                if (q.id === questionId && q.options && q.options.length > 1) {
                    const optionToRemove = q.options[indexToRemove]; 
                    const newOptions = q.options.filter((_, i) => i !== indexToRemove); 
                    const newOptionImages = q.optionImages ? q.optionImages.filter((_, i) => i !== indexToRemove) : undefined; 
                    const newOptionCharts = q.optionCharts ? q.optionCharts.filter((_, i) => i !== indexToRemove) : undefined; 
                    let newCorrectAnswer = q.correctAnswer; 
                    
                    if (q.questionType === 'MULTIPLE_CHOICE') { 
                        if (isAnswerMatch(q.correctAnswer, optionToRemove, q.questionType)) newCorrectAnswer = newOptions[0] || ''; 
                    } else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') { 
                        let answers = parseList(q.correctAnswer);
                        answers = answers.filter(a => !isAnswerMatch(a, optionToRemove, q.questionType)); 
                        newCorrectAnswer = JSON.stringify(answers); 
                    } 
                    return { ...q, options: newOptions, optionImages: newOptionImages, optionCharts: newOptionCharts, correctAnswer: newCorrectAnswer };
                }
                return q;
            });
        }),

        handleTrueFalseRowTextChange: (qId, idx, val) => set((state) => {
            const q = state.questions.find(item => item.id === qId);
            if (q && q.trueFalseRows && q.trueFalseRows[idx]) {
                q.trueFalseRows[idx].text = val;
            }
        }),

        handleTrueFalseRowAnswerChange: (qId, idx, val) => set((state) => {
            const q = state.questions.find(item => item.id === qId);
            if (q && q.trueFalseRows && q.trueFalseRows[idx]) {
                q.trueFalseRows[idx].answer = val;
            }
        }),

        handleAddTrueFalseRow: (qId) => set((state) => {
            const q = state.questions.find(item => item.id === qId);
            if (q && q.trueFalseRows) {
                const nextNum = q.trueFalseRows.length + 1;
                q.trueFalseRows.push({ text: `Pernyataan ${nextNum}`, answer: true });
            }
        }),

        handleDeleteTrueFalseRow: (qId, idx) => set((state) => {
            const q = state.questions.find(item => item.id === qId);
            if (q && q.trueFalseRows && q.trueFalseRows.length > 1) {
                q.trueFalseRows = q.trueFalseRows.filter((_, i) => i !== idx);
            }
        }),

        handleMatchingPairChange: (qId, idx, field, value) => set((state) => {
            const q = state.questions.find(item => item.id === qId);
            if (q && q.matchingPairs && q.matchingPairs[idx]) {
                q.matchingPairs[idx][field] = value;
            }
        }),

        handleAddMatchingPair: (qId) => set((state) => {
            const q = state.questions.find(item => item.id === qId);
            if (q && q.matchingPairs) {
                q.matchingPairs.push({ left: '', right: '' });
            }
        }),

        handleDeleteMatchingPair: (qId, idx) => set((state) => {
            const q = state.questions.find(item => item.id === qId);
            if (q && q.matchingPairs && q.matchingPairs.length > 1) {
                q.matchingPairs = q.matchingPairs.filter((_, i) => i !== idx);
            }
        }),

        handleDeleteChart: () => set((state) => {
            const target = useExamEditorUIStore.getState().editingChartTarget;
            if (target) {
                const { qId, type, index, subIndex } = target;
                state.questions = state.questions.map((q) => {
                    if (q.id === qId) {
                        const updated = { ...q };
                        let fieldToUpdate = '';
                        if (type === 'question') fieldToUpdate = q.questionText;
                        else if (type === 'option' && index !== undefined && q.options) fieldToUpdate = q.options[index];
                        else if (type === 'tf' && index !== undefined && q.trueFalseRows) fieldToUpdate = q.trueFalseRows[index].text;
                        else if (type === 'matching' && index !== undefined && q.matchingPairs) {
                            fieldToUpdate = subIndex === 'left' ? q.matchingPairs[index].left : q.matchingPairs[index].right;
                        } else if (type === 'correctAnswer') fieldToUpdate = q.correctAnswer || '';

                        const parser = new DOMParser();
                        const doc = parser.parseFromString(fieldToUpdate, 'text/html');
                        const chartNode = doc.querySelector('[data-chart="true"]');
                        if (chartNode) {
                            chartNode.remove();
                        }
                        const newHtml = doc.body.innerHTML;

                        if (type === 'question') {
                            updated.questionText = newHtml;
                            updated.chartData = undefined;
                        } else if (type === 'option' && index !== undefined && q.options) {
                            const newOptions = [...q.options];
                            newOptions[index] = newHtml;
                            updated.options = newOptions;
                            const newOptionCharts = [...(q.optionCharts || [])];
                            if (newOptionCharts[index]) newOptionCharts[index] = null;
                            updated.optionCharts = newOptionCharts;
                        } else if (type === 'tf' && index !== undefined && q.trueFalseRows) {
                            const newRows = [...q.trueFalseRows];
                            newRows[index] = { ...newRows[index], text: newHtml, chartData: undefined };
                            updated.trueFalseRows = newRows;
                        } else if (type === 'matching' && index !== undefined && q.matchingPairs) {
                            const newPairs = [...q.matchingPairs];
                            if (subIndex === 'left') {
                                newPairs[index] = { ...newPairs[index], left: newHtml, leftChart: undefined };
                            } else {
                                newPairs[index] = { ...newPairs[index], right: newHtml, rightChart: undefined };
                            }
                            updated.matchingPairs = newPairs;
                        } else if (type === 'correctAnswer') {
                            updated.correctAnswer = newHtml;
                            updated.correctAnswerChart = undefined;
                        }
                        return updated;
                    }
                    return q;
                });
                checkAndCascade(state);
            }
        })
    }))
);
