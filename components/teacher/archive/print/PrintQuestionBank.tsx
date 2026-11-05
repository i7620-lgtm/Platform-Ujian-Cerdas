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
                  const letter = String.fromCharCode(65 + i);
                  let isCorrect = false;
                  if (q.questionType === "MULTIPLE_CHOICE") {
                    const ans = String(q.correctAnswer || "").trim();
                    isCorrect =
                      ans.toUpperCase() === letter ||
                      ans.toUpperCase().startsWith(`${letter}.`) ||
                      ans === String(i) ||
                      isAnswerMatch(ans, opt, q.questionType, q.options);
                  } else {
                    const answers = parseList(q.correctAnswer, q.options);
                    isCorrect = answers.some((a) => {
                      const cleanA = String(a).trim().toUpperCase();
                      return cleanA === letter || cleanA === String(i) || isAnswerMatch(a, opt, q.questionType, q.options);
                    });
                  }
                  return (
                    <div 
                      key={i} 
                      className={`p-3 rounded-lg border text-sm flex items-center justify-between ${
                        isCorrect 
                          ? "border-emerald-300 bg-emerald-50 text-emerald-900 font-bold" 
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`font-bold ${isCorrect ? "text-emerald-700" : "text-slate-500"}`}>
                          {letter}.
                        </span>
                        <div dangerouslySetInnerHTML={{ __html: opt }} />
                      </div>
                      {isCorrect && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                          Kunci Benar
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            {q.questionType === "TRUE_FALSE" && (q.trueFalseRows || (q as any).true_false_rows) && (
              <table className="w-full text-xs mt-2 border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-200 p-2 text-left font-bold">Pernyataan</th>
                    <th className="border border-slate-200 p-2 text-center font-bold w-24">Jawaban</th>
                  </tr>
                </thead>
                <tbody>
                  {(q.trueFalseRows || (q as any).true_false_rows || []).map((row: any, i: number) => {
                    const isTrue = row.answer === true || String(row.answer).toLowerCase() === "true" || String(row.answer).toLowerCase() === "benar" || String(row.answer) === "1";
                    return (
                      <tr key={i}>
                        <td className="border border-slate-200 p-2">{row.text}</td>
                        <td className={`border border-slate-200 p-2 text-center font-bold ${isTrue ? "text-emerald-600 bg-emerald-50" : "text-red-500 bg-red-50"}`}>
                          {isTrue
                            ? (q.categoryLabels && q.categoryLabels[0]) || "Benar"
                            : (q.categoryLabels && q.categoryLabels[1]) || "Salah"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            
            {q.questionType === "MATCHING" && (q.matchingPairs || (q as any).matching_pairs) && (
              <table className="w-full text-xs mt-2 border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-200 p-2 text-left font-bold w-1/2">Kiri</th>
                    <th className="border border-slate-200 p-2 text-left font-bold w-1/2">Kanan (Pasangan)</th>
                  </tr>
                </thead>
                <tbody>
                  {(q.matchingPairs || (q as any).matching_pairs || []).map((pair: any, i: number) => (
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
                     {parseList(q.correctAnswer || (q as any).correct_answer || "Tidak ada").map((ans, i) => (
                       <span key={i} className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded border border-emerald-200 text-sm font-bold" dangerouslySetInnerHTML={{ __html: ans }} />
                     ))}
                   </div>
                ) : (
                  <div className="text-emerald-900 text-sm font-medium" dangerouslySetInnerHTML={{ __html: q.correctAnswer || (q as any).correct_answer || "Tidak ada" }} />
                )}
              </div>
            )}

            {(q.explanation || (q as any).solution || (q as any).pembahasan) && (
              <div className="mt-3 p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                <p className="text-[10px] font-bold text-blue-700 uppercase mb-1">Pembahasan Soal:</p>
                <div className="text-slate-700 text-xs" dangerouslySetInnerHTML={{ __html: q.explanation || (q as any).solution || (q as any).pembahasan }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
