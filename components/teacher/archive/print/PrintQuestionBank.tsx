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
          <div key={q.id} className="avoid-break-inside mb-6">
            <h4 className="font-bold text-md mb-2">Soal {index + 1}</h4>
            <div dangerouslySetInnerHTML={{ __html: q.questionText }} className="prose prose-sm max-w-none text-slate-800 mb-2" />
            
            {(q.questionType === "MULTIPLE_CHOICE" || q.questionType === "COMPLEX_MULTIPLE_CHOICE") && q.options && (
              <ul className="list-disc pl-5 mt-2">
                {q.options.map((opt, i) => {
                  const isCorrect = q.questionType === "COMPLEX_MULTIPLE_CHOICE" 
                    ? parseList(q.correctAnswer || "").some(a => isAnswerMatch(a, opt, q.questionType))
                    : isAnswerMatch(q.correctAnswer || "", opt, q.questionType);
                  return (
                    <li key={i} className={isCorrect ? "text-emerald-600 font-bold" : ""}>
                      <div dangerouslySetInnerHTML={{ __html: opt }} />
                    </li>
                  );
                })}
              </ul>
            )}
            
            {q.questionType === "TRUE_FALSE" && q.trueFalseRows && (
              <table className="w-full text-xs mt-2 border border-slate-200">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-200 p-1 text-left">Pernyataan</th>
                    <th className="border border-slate-200 p-1 text-center">Jawaban</th>
                  </tr>
                </thead>
                <tbody>
                  {q.trueFalseRows.map((row, i) => (
                    <tr key={i}>
                      <td className="border border-slate-200 p-1">{row.text}</td>
                      <td className="border border-slate-200 p-1 text-center font-bold text-emerald-600">
                        {row.answer ? "BENAR" : "SALAH"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            
            {q.questionType === "MATCHING" && q.matchingPairs && (
               <table className="w-full text-xs mt-2 border border-slate-200">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-200 p-1 text-left">Kiri</th>
                    <th className="border border-slate-200 p-1 text-left">Kanan (Pasangan)</th>
                  </tr>
                </thead>
                <tbody>
                  {q.matchingPairs.map((pair, i) => (
                    <tr key={i}>
                      <td className="border border-slate-200 p-1">{pair.left}</td>
                      <td className="border border-slate-200 p-1 font-bold text-emerald-600">{pair.right}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            
            {(q.questionType === "FILL_IN_THE_BLANK" || q.questionType === "ESSAY") && (
              <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded">
                <p className="text-xs font-bold text-slate-500 uppercase">Kunci Jawaban</p>
                <div className="text-emerald-600 font-bold" dangerouslySetInnerHTML={{ __html: q.correctAnswer || "Tidak ada" }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
