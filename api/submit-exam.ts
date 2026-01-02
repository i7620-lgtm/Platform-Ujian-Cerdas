
import type { VercelRequest, VercelResponse } from '@vercel/node';
// WAJIB menggunakan ekstensi .js saat mengimpor file lokal di mode ESM ("type": "module")
import db from './db.js';

let isSchemaChecked = false;

// Helper Normalisasi: Lowercase, Trim, Remove Extra Spaces
const normalize = (str: any) => String(str || '').trim().toLowerCase().replace(/\s+/g, ' ');

// Logic Penilaian yang Ditingkatkan
const calculateGrade = (exam: any, answers: Record<string, string>) => {
    let correctCount = 0;
    const questions = JSON.parse(exam.questions || '[]');
    
    questions.forEach((q: any) => {
        const studentAnswer = answers[q.id];
        
        // Skip jika tidak dijawab (undefined / null / string kosong)
        if (studentAnswer === undefined || studentAnswer === null || studentAnswer === '') return;

        // 1. Pilihan Ganda & Isian Singkat
        if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
             if (q.correctAnswer && normalize(studentAnswer) === normalize(q.correctAnswer)) {
                 correctCount++;
             }
        } 
        // 2. Benar / Salah
        else if (q.questionType === 'TRUE_FALSE' && q.trueFalseRows) {
             try {
                 const studentArr = JSON.parse(studentAnswer);
                 let allCorrect = true;
                 // Validasi panjang array
                 if (!Array.isArray(studentArr) || studentArr.length !== q.trueFalseRows.length) {
                     allCorrect = false;
                 } else {
                     for(let i=0; i < q.trueFalseRows.length; i++) {
                         // Bandingkan boolean strict (true === true)
                         if (studentArr[i] !== q.trueFalseRows[i].answer) {
                             allCorrect = false; break;
                         }
                     }
                 }
                 if (allCorrect) correctCount++;
             } catch(e) { /* Invalid JSON = Salah */ }
        }
        // 3. Pilihan Ganda Kompleks
        else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
            let sArr: string[] = [];
            try {
                sArr = JSON.parse(studentAnswer);
                if (!Array.isArray(sArr)) throw new Error();
            } catch {
                sArr = String(studentAnswer).split(',');
            }
            
            const tArrRaw = String(q.correctAnswer || '').split(',');
            
            // Gunakan Set untuk mengabaikan urutan dan duplikat
            const tSet = new Set(tArrRaw.map((s: string) => normalize(s)).filter((s: string) => s !== ''));
            const sSet = new Set(sArr.map((s: string) => normalize(s)).filter((s: string) => s !== ''));

            // Harus sama persis isinya (Size sama DAN setiap item kunci ada di jawaban siswa)
            if (tSet.size === sSet.size && [...tSet].every((val: string) => sSet.has(val))) {
                correctCount++;
            }
        }
        // 4. Menjodohkan (Matching)
        else if (q.questionType === 'MATCHING' && q.matchingPairs) {
            try {
                const map = JSON.parse(studentAnswer); // Format: { "0": "JawabA", "1": "JawabB" }
                let allCorrect = true;
                
                // Iterasi setiap pasangan soal
                for (let i = 0; i < q.matchingPairs.length; i++) {
                    const expectedRight = q.matchingPairs[i].right;
                    const studentRight = map[i]; // Akses via index string ("0", "1")
                    
                    // Bandingkan string yang dinormalisasi
                    if (normalize(studentRight) !== normalize(expectedRight)) {
                        allCorrect = false; break;
                    }
                }
                if (allCorrect) correctCount++;
            } catch (e) { /* Salah jika JSON rusak */ }
        }
    });

    // FIX: Filter out INFO types for denominator (total questions)
    const scorableQuestions = questions.filter((q: any) => q.questionType !== 'INFO');
    const scorable = scorableQuestions.filter((q: any) => q.questionType !== 'ESSAY').length;
    
    const score = scorable > 0 ? Math.round((correctCount / scorable) * 100) : 0;
    
    return { score, correctCount, totalQuestions: scorableQuestions.length };
};

const ensureSchema = async () => {
    if (isSchemaChecked) return;
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS results (
                exam_code TEXT,
                student_id TEXT,
                answers TEXT,
                score INTEGER,
                PRIMARY KEY (exam_code, student_id)
            );
        `);
        const alterQueries = [
            "ALTER TABLE results ADD COLUMN IF NOT EXISTS student_name TEXT;",
            "ALTER TABLE results ADD COLUMN IF NOT EXISTS student_class TEXT;",
            "ALTER TABLE results ADD COLUMN IF NOT EXISTS correct_answers INTEGER;",
            "ALTER TABLE results ADD COLUMN IF NOT EXISTS total_questions INTEGER;",
            "ALTER TABLE results ADD COLUMN IF NOT EXISTS status TEXT;",
            "ALTER TABLE results ADD COLUMN IF NOT EXISTS status_code INTEGER;", 
            "ALTER TABLE results ADD COLUMN IF NOT EXISTS activity_log TEXT;",
            "ALTER TABLE results ADD COLUMN IF NOT EXISTS timestamp BIGINT;",
            "ALTER TABLE results ADD COLUMN IF NOT EXISTS location TEXT;"
        ];
        for (const q of alterQueries) {
            try { await db.query(q); } catch (e) { /* Ignore */ }
        }
        isSchemaChecked = true;
    } catch (e: any) { console.error("Results Table Init Error:", e.message); }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        await ensureSchema();

        const { examCode, student, answers, activityLog, location } = req.body;

        // 1. Ambil Data Ujian (untuk Kunci Jawaban)
        const examResult = await db.query('SELECT * FROM exams WHERE code = $1', [examCode]);
        if (!examResult || examResult.rows.length === 0) {
            return res.status(404).json({ error: 'Exam not found (Offline)' });
        }
        const fullExam = examResult.rows[0];

        // 2. FETCH EXISTING RESULT (for merging activity log)
        let finalActivityLog = activityLog || [];
        try {
            const existingRes = await db.query(
                'SELECT activity_log FROM results WHERE exam_code = $1 AND student_id = $2', 
                [examCode, student.studentId]
            );
            if (existingRes.rows.length > 0) {
                const prevLog = JSON.parse(existingRes.rows[0].activity_log || '[]');
                // Jika log baru tidak kosong, append. Jika kosong, pertahankan yang lama.
                if (activityLog && activityLog.length > 0) {
                     // Filter duplicates if needed, or just append
                     finalActivityLog = [...prevLog, ...activityLog];
                } else {
                     finalActivityLog = prevLog;
                }
            }
        } catch(e) { /* Ignore read errors */ }

        // 3. Hitung Nilai (Server-Side Grading)
        const grading = calculateGrade(fullExam, answers);
        const status = req.body.status || 'completed';

        let statusCode = 0;
        if (status === 'in_progress') statusCode = 1;
        else if (status === 'force_submitted') statusCode = 2;
        else if (status === 'completed') statusCode = 3;

        // 4. Simpan ke Database
        const query = `
            INSERT INTO results (
                exam_code, student_id, student_name, student_class, 
                answers, score, correct_answers, total_questions, 
                status, status_code, activity_log, timestamp, location
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (exam_code, student_id)
            DO UPDATE SET
                answers = EXCLUDED.answers,
                score = EXCLUDED.score,
                correct_answers = EXCLUDED.correct_answers,
                status = EXCLUDED.status,
                status_code = EXCLUDED.status_code,
                activity_log = EXCLUDED.activity_log, -- Now contains the merged logs
                timestamp = EXCLUDED.timestamp,
                location = EXCLUDED.location;
        `;

        await db.query(query, [
            examCode,
            student.studentId,
            student.fullName,
            student.class,
            JSON.stringify(answers),
            grading.score,
            grading.correctCount,
            grading.totalQuestions,
            status,
            statusCode,
            JSON.stringify(finalActivityLog), // Use merged logs
            Date.now(),
            location || ''
        ]);

        // 5. Respon Aman (Sembunyikan nilai jika masih pengerjaan)
        const safeScore = status === 'in_progress' ? null : grading.score;
        const safeCorrectAnswers = status === 'in_progress' ? null : grading.correctCount;

        return res.status(200).json({
            examCode,
            student,
            answers,
            score: safeScore, 
            correctAnswers: safeCorrectAnswers,
            totalQuestions: grading.totalQuestions,
            status: status,
            statusCode: statusCode,
            isSynced: true,
            timestamp: Date.now(),
            location: location
        });

    } catch (error: any) {
        console.error("Submit Exam Error:", error);
        return res.status(500).json({ 
            error: "Submission Failed", 
            details: error.message
        });
    }
}
