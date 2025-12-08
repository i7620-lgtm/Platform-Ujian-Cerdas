
import React from 'react';
import type { Exam, Result } from '../../types';
import { XMarkIcon } from '../Icons';

interface OngoingExamModalProps {
    exam: Exam | null;
    results: Result[];
    onClose: () => void;
    onAllowContinuation: (studentId: string, examCode: string) => void;
}

export const OngoingExamModal: React.FC<OngoingExamModalProps> = ({ exam, results, onClose, onAllowContinuation }) => {
    if (!exam) return null;

    const examResults = results.filter(r => r.examCode === exam.code);
    const scorableQuestionsCount = exam.questions.filter(q => q.questionType !== 'ESSAY' && q.questionType !== 'INFO').length;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-bold text-neutral">Pantau Ujian: {exam.code}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {examResults.length > 0 ? (
                            <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Siswa</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Benar</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salah</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hasil</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keterangan</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {examResults.map(result => {
                                        const incorrectCount = scorableQuestionsCount - result.correctAnswers;
                                        return (
                                            <tr key={result.student.studentId} className={`transition-colors hover:bg-gray-50 ${result.status === 'force_submitted' ? 'bg-yellow-50' : ''}`}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.student.fullName}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">{result.correctAnswers}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">{incorrectCount < 0 ? 0 : incorrectCount}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">{result.score}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {result.status === 'force_submitted' ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-yellow-800 bg-yellow-100 px-2 py-1 rounded-full text-xs font-semibold">Ditangguhkan</span>
                                                            <button onClick={() => onAllowContinuation(result.student.studentId, result.examCode)} className="bg-green-500 text-white px-3 py-1 text-xs rounded-md hover:bg-green-600 font-semibold">
                                                                Izinkan
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-green-800 bg-green-100 px-2 py-1 rounded-full text-xs font-semibold">Mengerjakan</span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : <p className="text-center text-gray-500 py-8">Belum ada siswa yang memulai ujian ini.</p>}
                </div>
            </div>
        </div>
    );
};

interface FinishedExamModalProps {
    exam: Exam | null;
    results: Result[];
    onClose: () => void;
}

export const FinishedExamModal: React.FC<FinishedExamModalProps> = ({ exam, results, onClose }) => {
    if (!exam) return null;

    const examResults = results.filter(r => r.examCode === exam.code);
    const scorableQuestionsCount = exam.questions.filter(q => q.questionType !== 'ESSAY' && q.questionType !== 'INFO').length;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-bold text-neutral">Hasil Ujian: {exam.code}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {examResults.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Siswa</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Benar</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Salah</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Hasil</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aktivitas</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {examResults.map((result, index) => {
                                        const incorrectCount = scorableQuestionsCount - result.correctAnswers;
                                        return (
                                            <tr key={result.student.studentId} className="transition-colors hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.student.fullName}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold text-center">{result.correctAnswers}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold text-center">{incorrectCount < 0 ? 0 : incorrectCount}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-center">{result.score}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500 align-top">
                                                    {result.activityLog && result.activityLog.length > 0 ? (
                                                        <ul className="list-disc list-outside pl-5 space-y-1">
                                                            {result.activityLog.map((log, logIndex) => (
                                                                <li key={logIndex}>{log}</li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <span>-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500 align-top">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${result.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {result.status === 'completed' ? 'Selesai' : 'Dibatalkan'}
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : <p className="text-center text-gray-500 py-8">Belum ada hasil untuk ujian ini.</p>}
                </div>
            </div>
        </div>
    );
};
