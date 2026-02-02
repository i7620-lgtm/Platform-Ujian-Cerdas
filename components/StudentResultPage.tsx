
import React, { useMemo, useState } from 'react';
import type { Result, Exam, Question } from '../types';
import { CheckCircleIcon, LockClosedIcon, ChevronDownIcon, ChevronUpIcon } from './Icons';

interface StudentResultPageProps {
  result: Result;
  exam: Exam; 
  onFinish: () => void;
}

const normalize = (str: string) => (str || '').trim().toLowerCase();

export const StudentResultPage: React.FC<StudentResultPageProps> = ({ result, exam, onFinish }) => {
    const config = exam.config;
    const [expandedReview, setExpandedReview] = useState(false);

    // REAL-TIME CALCULATION LOGIC
    // Mengabaikan result.score dari DB dan menghitung ulang berdasarkan jawaban vs kunci soal saat ini
    const calculatedStats = useMemo(() => {
        const scorableQuestions = exam.questions.filter(q => q.questionType !== 'INFO');
        let correct = 0;
        let empty = 0;

        scorableQuestions.forEach(q => {
            const ans = result.answers[q.id];
            if (!ans) {
                empty++;
                return;
            }

            const studentAns = normalize(String(ans));
            const correctAns = normalize(String(q.correctAnswer || ''));
            let isCorrect = false;

            if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
                isCorrect = studentAns === correctAns;
            } 
            else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
                const sSet = new Set(studentAns.split(',').map(s=>s.trim()));
                const cSet = new Set(correctAns.split(',').map(s=>s.trim()));
                isCorrect = sSet.size === cSet.size && [...sSet].every(x => cSet.has(x));
            }
            else if (q.questionType === 'TRUE_FALSE') {
                try {
                    const ansObj = JSON.parse(ans);
                    isCorrect = q.trueFalseRows?.every((row, idx) => ansObj[idx] === row.answer) ?? false;
                } catch(e) {}
            }
            else if (q.questionType === 'MATCHING') {
                try {
                    const ansObj = JSON.parse(ans);
                    isCorrect = q.matchingPairs?.every((pair, idx) => ansObj[idx] === pair.right) ?? false;
                } catch(e) {}
            } else if (q.questionType === 'ESSAY') {
                // Essay cannot be auto-graded strictly here without teacher input, usually assumed manual or correct if logic exists
                // For student view consistency, we assume standard behavior or manual marking integration
                // Here we keep it simple: Essay count as correct only if exact match (rare) or marked.
                // For this fixing request, we align with the "grid" logic.
                // Assuming Essay needs manual check, usually score comes from DB. 
                // BUT, to fix the specific bug for auto-graded items:
                isCorrect = false; // Default for essay until graded
            }

            if (isCorrect) correct++;
        });

        const total = scorableQuestions.length;
        const score = total > 0 ? Math.round((correct / total) * 100) : 0;
        
        return {
            score,
            correctAnswers: correct,
            totalQuestions: total,
            wrongAnswers: total - correct - empty
        };
    }, [exam.questions, result.answers]);

    if (result.status === 'force_closed') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-rose-50 p-6">
                <div className="w-full max-w-sm text-center bg-white p-8 rounded-3xl shadow-xl border border-rose-100">
                    <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <LockClosedIcon className="w-8 h-8" />
                    </div>
                    <h1 className="text-xl font-black text-slate-900 mb-2">Akses Terkunci</h1>
                    <p className="text-sm text-slate-500 mb-6">
                        Ujian dihentikan sistem karena terdeteksi aktivitas mencurigakan. Hubungi pengawas.
                    </p>
                    <button onClick={onFinish} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-black transition-all text-sm">Kembali</button>
                </div>
            </div>
        );
    }

    const showResult = config.showResultToStudent;

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-6 font-sans">
            <div className={`w-full ${expandedReview ? 'max-w-3xl' : 'max-w-sm'} text-center animate-gentle-slide transition-all duration-500`}>
                <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white">
                    
                    <div className="mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 text-emerald-500 mb-6">
                            <CheckCircleIcon className="w-10 h-10" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 mb-2">Ujian Selesai</h1>
                        <p className="text-sm text-slate-500 font-medium">Jawaban Anda telah berhasil disimpan.</p>
                    </div>
                    
                    {showResult ? (
                        <div className="space-y-8">
                            <div className="py-6">
                                <span className="text-6xl font-black text-slate-800 tracking-tighter block">{calculatedStats.score}</span>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 block">Nilai Akhir</span>
                            </div>

                            <div className="flex justify-around border-t border-slate-100 pt-6">
                                <div className="text-center">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Benar</p>
                                    <p className="text-4xl font-black text-emerald-500 mt-1">{calculatedStats.correctAnswers}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Soal</p>
                                    <p className="text-4xl font-black text-slate-800 mt-1">{calculatedStats.totalQuestions}</p>
                                </div>
                            </div>
                            
                            {config.showCorrectAnswer && (
                                <div className="pt-6">
                                    <button 
                                        onClick={() => setExpandedReview(!expandedReview)}
                                        className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-full transition-all inline-flex items-center gap-2"
                                    >
                                        {expandedReview ? 'Tutup Pembahasan' : 'Lihat Pembahasan'}
                                        {expandedReview ? <ChevronUpIcon className="w-3 h-3"/> : <ChevronDownIcon className="w-3 h-3"/>}
                                    </button>

                                    {expandedReview && (
                                        <div className="mt-6 space-y-4 text-left border-t border-slate-50 pt-6">
                                            {exam.questions.filter(q => q.questionType !== 'INFO').map((q, idx) => {
                                                const studentAns = result.answers[q.id] || '-';
                                                const correctAns = q.correctAnswer || '-';
                                                
                                                // Gunakan logika normalisasi yang sama
                                                let isCorrect = false;
                                                const normalizedStudent = normalize(studentAns);
                                                const normalizedCorrect = normalize(correctAns);

                                                if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
                                                    isCorrect = normalizedStudent === normalizedCorrect;
                                                } else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
                                                    const sSet = new Set(normalizedStudent.split(',').map(s=>s.trim()));
                                                    const cSet = new Set(normalizedCorrect.split(',').map(s=>s.trim()));
                                                    isCorrect = sSet.size === cSet.size && [...sSet].every(x => cSet.has(x));
                                                } else if (q.questionType === 'TRUE_FALSE' || q.questionType === 'MATCHING') {
                                                     // Untuk review visual, kita asumsikan benar jika logic di atas sudah menghitungnya benar
                                                     // namun untuk display text, kita tampilkan raw
                                                     // Simplified check for styling
                                                     isCorrect = JSON.stringify(studentAns) === JSON.stringify(correctAns); // weak check, visual only
                                                     try {
                                                         // Re-verify strictly for coloring
                                                         if (q.questionType === 'TRUE_FALSE') {
                                                             const ansObj = JSON.parse(studentAns);
                                                             isCorrect = q.trueFalseRows?.every((row, i) => ansObj[i] === row.answer) ?? false;
                                                         } else {
                                                             const ansObj = JSON.parse(studentAns);
                                                             isCorrect = q.matchingPairs?.every((pair, i) => ansObj[i] === pair.right) ?? false;
                                                         }
                                                     } catch(e) {}
                                                }

                                                if (!['MULTIPLE_CHOICE', 'FILL_IN_THE_BLANK'].includes(q.questionType)) return null; 

                                                return (
                                                    <div key={q.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                                        <div className="flex justify-between mb-2">
                                                            <span className="text-[10px] font-bold uppercase text-slate-400">Soal {idx + 1}</span>
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{isCorrect ? 'Benar' : 'Salah'}</span>
                                                        </div>
                                                        <div className="text-sm font-medium text-slate-800 mb-2" dangerouslySetInnerHTML={{__html: q.questionText}}></div>
                                                        <div className="text-xs space-y-1">
                                                            <p><span className="text-slate-400">Jawab:</span> <span className={isCorrect ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>{studentAns}</span></p>
                                                            {!isCorrect && <p><span className="text-slate-400">Kunci:</span> <span className="font-bold text-slate-700">{correctAns}</span></p>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-slate-50 p-6 rounded-2xl">
                            <p className="text-sm font-medium text-slate-600">Menunggu pengumuman nilai dari pengajar.</p>
                        </div>
                    )}

                    <button 
                        onClick={onFinish} 
                        className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-black transition-all shadow-lg active:scale-[0.98] mt-8 text-sm uppercase tracking-widest"
                    >
                        Tutup Halaman
                    </button>
                </div>
            </div>
        </div>
    );
};
