
import React, { useState, useEffect, useMemo } from 'react';
import { ChartBarIcon, TableCellsIcon, CheckCircleIcon, ArrowPathIcon, UserIcon, LightBulbIcon } from '../Icons';
import { storageService } from '../../services/storage';
import type { ExamSummary, Exam, Result, Question } from '../../types';

// --- TYPE DEFINITIONS FOR DIAGNOSTICS ---

export interface DiagnosticCategory {
    name: string;
    total: number;
    correct: number;
    score: number; // 0-100
}

export interface Recommendation {
    status: string; // "Perlu Intervensi", "Cukup", "Kompeten", "Istimewa"
    color: string; // Tailwind classes
    title: string;
    description: string;
    actionItem: string; // Saran konkret
}

export interface DiagnosticResult {
    score: number;
    categories: DiagnosticCategory[];
    levels: DiagnosticCategory[]; // HOTS, LOTS, etc.
    recommendation: Recommendation;
    weakestCategory: string;
    strongestCategory: string;
}

// --- RULE-BASED ENGINE (THE LOGIC) ---

/**
 * Menganalisis hasil satu siswa berdasarkan soal ujian.
 * Fungsi ini MURNI (Pure Function) dan bisa dipanggil di mana saja (Siswa/Guru).
 */
export const analyzeExamResult = (exam: Exam, result: Result): DiagnosticResult => {
    const categoriesMap: Record<string, { total: number; correct: number }> = {};
    const levelsMap: Record<string, { total: number; correct: number }> = {};
    
    // 1. Iterasi Soal & Jawaban
    exam.questions.forEach(q => {
        if (q.questionType === 'INFO') return;

        const catName = q.category && q.category.trim() !== '' ? q.category.trim() : 'Umum';
        const levelName = q.level && q.level.trim() !== '' ? q.level.trim() : 'Dasar';

        // Init Map
        if (!categoriesMap[catName]) categoriesMap[catName] = { total: 0, correct: 0 };
        if (!levelsMap[levelName]) levelsMap[levelName] = { total: 0, correct: 0 };

        // Hitung Total
        categoriesMap[catName].total++;
        levelsMap[levelName].total++;

        // Cek Kebenaran (Sederhana)
        const studentAns = (result.answers[q.id] || '').trim().toLowerCase();
        const correctAns = (q.correctAnswer || '').trim().toLowerCase();
        
        let isCorrect = false;
        
        // Logika Pengecekan Standar
        if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
            isCorrect = studentAns === correctAns;
        } else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
            const sSet = new Set(studentAns.split(',').map(s => s.trim()));
            const cSet = new Set(correctAns.split(',').map(s => s.trim()));
            isCorrect = sSet.size === cSet.size && [...sSet].every(x => cSet.has(x));
        } else if (q.questionType === 'TRUE_FALSE') {
             try {
                const ansObj = JSON.parse(result.answers[q.id] || '{}');
                isCorrect = q.trueFalseRows?.every((row, idx) => ansObj[idx] === row.answer) ?? false;
            } catch(e) {}
        } else if (q.questionType === 'MATCHING') {
            try {
                const ansObj = JSON.parse(result.answers[q.id] || '{}');
                isCorrect = q.matchingPairs?.every((pair, idx) => ansObj[idx] === pair.right) ?? false;
            } catch(e) {}
        }

        if (isCorrect) {
            categoriesMap[catName].correct++;
            levelsMap[levelName].correct++;
        }
    });

    // 2. Konversi ke Array & Hitung Persentase
    const processMap = (map: Record<string, { total: number; correct: number }>): DiagnosticCategory[] => {
        return Object.entries(map).map(([name, stats]) => ({
            name,
            total: stats.total,
            correct: stats.correct,
            score: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
        })).sort((a, b) => a.score - b.score); // Urutkan dari terlemah
    };

    const categories = processMap(categoriesMap);
    const levels = processMap(levelsMap);

    // 3. Tentukan Weakest & Strongest
    const weakestCategory = categories.length > 0 ? categories[0].name : '-';
    const strongestCategory = categories.length > 0 ? categories[categories.length - 1].name : '-';

    // 4. Generate Rekomendasi (Rule-Based)
    const score = result.score;
    let recommendation: Recommendation;

    if (score <= 45) {
        recommendation = {
            status: "Perlu Intervensi",
            color: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800",
            title: "Butuh Remedial Intensif",
            description: "Nilai belum mencapai standar minimum kompetensi.",
            actionItem: "Wajib mengikuti kelas Remedial. Fokus ulangi materi dasar dan konsep fundamental."
        };
    } else if (score <= 75) {
        recommendation = {
            status: "Cukup (Perlu Latihan)",
            color: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
            title: "Perbanyak Latihan Soal",
            description: "Pemahaman konsep sudah ada, namun ketelitian perlu ditingkatkan.",
            actionItem: "Lakukan penugasan mandiri pada topik yang lemah. Disarankan belajar metode Tutor Sebaya."
        };
    } else if (score <= 90) {
        recommendation = {
            status: "Kompeten",
            color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
            title: "Siap Pengayaan",
            description: "Penguasaan materi sangat baik. Siap untuk tantangan lebih.",
            actionItem: "Pertahankan prestasi. Anda bisa mulai mengerjakan soal-soal HOTS atau studi kasus."
        };
    } else {
        recommendation = {
            status: "Istimewa",
            color: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800",
            title: "Direkomendasikan Mentor Sebaya",
            description: "Sangat Memuaskan! Penguasaan materi sempurna.",
            actionItem: "Anda direkomendasikan menjadi 'Tutor Sebaya' untuk membantu teman sekelas."
        };
    }

    return { score, categories, levels, recommendation, weakestCategory, strongestCategory };
};


// --- COMPONENT UI (TEACHER VIEW) ---

const AnalyticsView: React.FC = () => {
    const [summaries, setSummaries] = useState<ExamSummary[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const data = await storageService.getAnalyticsData();
            setSummaries(data);
            setIsLoading(false);
        };
        fetchData();
    }, []);

    return (
        <div className="space-y-6 animate-fade-in relative">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <ChartBarIcon className="w-6 h-6 text-indigo-600"/> Analisis Daerah & Sekolah
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Data agregat dari hasil ujian yang telah diarsipkan.</p>
                </div>
                <button onClick={() => window.location.reload()} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200"><ArrowPathIcon className="w-5 h-5 text-slate-600"/></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Scorecard Summary */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Ujian</p>
                    <p className="text-3xl font-black text-slate-800 dark:text-white mt-1">{summaries.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Rata-rata Total</p>
                    <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                        {summaries.length > 0 ? Math.round(summaries.reduce((a,b) => a + Number(b.average_score), 0) / summaries.length) : 0}
                    </p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Partisipan</p>
                    <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                        {summaries.reduce((a,b) => a + b.total_participants, 0)}
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200">Riwayat Statistik Sekolah</h3>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                        <tr>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase">Sekolah</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase">Mapel</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase text-center">Rerata</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase text-center">Partisipan</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase text-center">Kelulusan</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                        {isLoading ? <tr><td colSpan={5} className="p-8 text-center">Loading...</td></tr> : summaries.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{s.school_name}</td>
                                <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                                    {s.exam_subject}
                                    <span className="block text-[10px] text-slate-400 font-mono">{s.exam_code}</span>
                                </td>
                                <td className="px-6 py-4 text-center font-black text-indigo-600 dark:text-indigo-400">{s.average_score}</td>
                                <td className="px-6 py-4 text-center text-sm">{s.total_participants}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${s.passing_rate > 75 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                        {s.passing_rate}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {summaries.length === 0 && !isLoading && (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">Belum ada data statistik tersimpan.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AnalyticsView;
