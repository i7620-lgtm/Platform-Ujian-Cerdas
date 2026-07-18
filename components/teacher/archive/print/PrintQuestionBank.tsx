import React from "react";
import type { Exam } from "../../../../types";
import { parseList, isAnswerMatch } from "../../examUtils";

interface PrintQuestionBankProps {
  exam: Exam;
}

export const PrintQuestionBank: React.FC<PrintQuestionBankProps> = ({ exam }) => {
  return (
    <div className="mb-4 break-before-page pt-4">
      <h3 className="font-bold text-sm uppercase tracking-wider mb-3 border-l-4 border-slate-800 pl-2 break-after-avoid">
        4. Bank Soal & Kunci Jawaban
      </h3>
      <div className="space-y-4">
        {exam.questions.filter(q => q.questionType !== "INFO").map((q, index) => (
          <div key={q.id} className="avoid-break-inside mb-4 p-4 border border-slate-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded text-xs font-bold text-slate-500">
                {index + 1}
              </span>
              <span className="text-[9px] font-bold bg-purple-50 text-purple-600 px-2 py-0.5 rounded border border-purple-100 uppercase">
                Bobot: {q.scoreWeight || 1}
              </span>
            </div>
            
            <div dangerouslySetInnerHTML={{ __html: q.questionText }} className="prose prose-sm max-w-none text-slate-800 mb-4" />
            
            {(q.questionType === "MULTIPLE_CHOICE" || q.questionType === "COMPLEX_MULTIPLE_CHOICE") && q.options && (
              <div className="space-y-2">
                {q.options.map((opt, i) => {
                  const isCorrect = q.questionType === "COMPLEX_MULTIPLE_CHOICE" 
                    ? parseList(q.correctAnswer || "").some(a => isAnswerMatch(a, opt, q.questionType))
                    : isAnswerMatch(q.correctAnswer || "", opt, q.questionType);
                  return (
                    <div 
                      key={i} 
                      className={`p-3 rounded-lg border text-sm flex items-center justify-between ${
                        isCorrect 
                          ? "border-emerald-300 bg-emerald-50 text-emerald-900" 
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`font-bold ${isCorrect ? "text-emerald-700" : "text-slate-500"}`}>
                          {String.fromCharCode(65 + i)}.
                        </span>
                        <div dangerouslySetInnerHTML={{ __html: opt }} />
                      </div>
                      {isCorrect && (
                        <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            {q.questionType === "TRUE_FALSE" && q.trueFalseRows && (
              <table className="w-full text-xs mt-2 border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-200 p-2 text-left font-bold">Pernyataan</th>
                    <th className="border border-slate-200 p-2 text-center font-bold w-24">Jawaban</th>
                  </tr>
                </thead>
                <tbody>
                  {q.trueFalseRows.map((row, i) => (
                    <tr key={i}>
                      <td className="border border-slate-200 p-2">{row.text}</td>
                      <td className={`border border-slate-200 p-2 text-center font-bold ${row.answer ? "text-emerald-600 bg-emerald-50" : "text-red-500 bg-red-50"}`}>
                        {row.answer ? "Benar" : "Salah"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            
            {q.questionType === "MATCHING" && q.matchingPairs && (
              <table className="w-full text-xs mt-2 border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-200 p-2 text-left font-bold w-1/2">Kiri</th>
                    <th className="border border-slate-200 p-2 text-left font-bold w-1/2">Kanan (Pasangan)</th>
                  </tr>
                </thead>
                <tbody>
                  {q.matchingPairs.map((pair, i) => (
                    <tr key={i}>
                      <td className="border border-slate-200 p-2">{pair.left}</td>
                      <td className="border border-slate-200 p-2 font-bold text-emerald-600 bg-emerald-50">{pair.right}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            
            {(q.questionType === "FILL_IN_THE_BLANK" || q.questionType === "ESSAY") && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Kunci Jawaban</p>
                {q.questionType === "FILL_IN_THE_BLANK" ? (
                   <div className="flex flex-wrap gap-2 mt-1">
                     {parseList(q.correctAnswer || "Tidak ada").map((ans, i) => (
                       <span key={i} className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded border border-emerald-200 text-sm font-bold" dangerouslySetInnerHTML={{ __html: ans }} />
                     ))}
                   </div>
                ) : (
                  <div className="text-emerald-900 text-sm font-medium" dangerouslySetInnerHTML={{ __html: q.correctAnswer || "Tidak ada" }} />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
