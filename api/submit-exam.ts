import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from './db.js';

// Logic Penilaian (Duplikasi dari Frontend tapi dijalankan di Server agar aman)
const calculateGrade = (exam: any, answers: Record<string, string>) => {
    let correctCount = 0;
    
    exam.questions.forEach((q: any) => {
        const studentAnswer = answers[q.id];
        if (!studentAnswer) return;

        if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
             if (q.correctAnswer && studentAnswer.toLowerCase() === q.correctAnswer.toLowerCase()) correctCount++;
        } 
        else if (q.questionType === 'TRUE_FALSE' && q.trueFalseRows) {
             try {
                 const studentArr = JSON.parse(studentAnswer);
                 let allCorrect = true;
                 for(let i=0; i < q.trueFalseRows.length; i++) {
                     if (studentArr[i] !== q.trueFalseRows[i].answer) {
                         allCorrect = false; break;
                     }
                 }
                 if (allCorrect) correctCount++;
             } catch(e) {}
        }
        else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
            const sArr = studentAnswer.split(',').map(s => s.trim()).sort().join(',');
            const cArr = (q.correctAnswer || '').split(',').map((s:string) => s.trim()).sort().join(',');
            if (sArr === cArr) correctCount++;
        }
        else if (q.questionType === 'MATCHING' && q.matchingPairs) {
            try {
                const map = JSON.parse(studentAnswer);
                let allCorrect = true;
                for (let i = 0; i < q.matchingPairs.length; i++) {
                    if (map[i] !== q.matchingPairs[i].right) {
                        allCorrect = false; break;
                    }
                }
                if (allCorrect) correctCount++;
            } catch (e) {}
        }
    });

    const scorable = exam.questions.filter((q: any) => q.questionType !== 'ESSAY' && q.questionType !== 'INFO').length;
    const score = scorable > 0 ? Math.round((correctCount / scorable) * 100) : 0;
    
    return { score, correctCount, totalQuestions: exam.questions.length }; // Use real length
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { examCode, student, answers, activityLog, completionTime } = req.body;

        // 1. Ambil Kunci Jawaban Asli dari Database
        const examResult = await pool.query('SELECT * FROM exams WHERE code = $1', [examCode]);
        if (examResult.rows.length === 0) {
            return res.status(404).json({ error: 'Exam not found' });
        }
        const fullExam = examResult.rows[0];

        // 2. Lakukan Penilaian di Server
        const grading = calculateGrade(fullExam, answers);

        // 3. Tentukan Status
        // Jika force_submitted dikirim dari frontend, gunakan itu. Jika tidak, completed.
        const status = req.body.status || 'completed';

        // 4. Simpan Hasil ke Database
        const query = `
            INSERT INTO results (
                exam_code, student_id, student_name, student_class, 
                answers, score, correct_answers, total_questions, 
                status, activity_log, timestamp
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (exam_code, student_id)
            DO UPDATE SET
                answers = EXCLUDED.answers,
                score = EXCLUDED.score,
                correct_answers = EXCLUDED.correct_answers,
                status = EXCLUDED.status,
                activity_log = EXCLUDED.activity_log;
        `;

        await pool.query(query, [
            examCode,
            student.studentId,
            student.fullName,
            student.class,
            JSON.stringify(answers),
            grading.score,
            grading.correctCount,
            grading.totalQuestions,
            status,
            JSON.stringify(activityLog || []),
            Date.now()
        ]);

        // 5. Kembalikan Hasil ke Frontend (agar siswa bisa melihat nilai)
        return res.status(200).json({
            examCode,
            student,
            answers,
            score: grading.score,
            correctAnswers: grading.correctCount,
            totalQuestions: grading.totalQuestions,
            status: status,
            isSynced: true,
            timestamp: Date.now()
        });

    } catch (error: any) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
}
