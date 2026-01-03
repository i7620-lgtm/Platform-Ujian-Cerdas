
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
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        await ensureSchema();

        const { examCode, student, answers, activityLog, location, timestamp } = req.body;
        
        // Incoming Request Timestamp
        const requestTime = timestamp ? parseInt(timestamp) : Date.now();
        const incomingStatus = req.body.status || 'completed';

        // 1. Ambil Data Ujian
        const examResult = await db.query('SELECT * FROM exams WHERE code = $1', [examCode]);
        if (!examResult || examResult.rows.length === 0) {
            return res.status(404).json({ error: 'Exam not found (Offline)' });
        }
        const fullExam = examResult.rows[0];

        // 2. LOGIKA AUTHORITY GUARD (ANTI-ZOMBIE PACKET)
        const existingRes = await db.query(
            'SELECT activity_log, status, timestamp, answers, score, correct_answers, total_questions, location FROM results WHERE exam_code = $1 AND student_id = $2', 
            [examCode, student.studentId]
        );

        let finalActivityLog = activityLog || [];
        
        if (existingRes.rows.length > 0) {
            const row = existingRes.rows[0];
            const dbStatus = row.status;
            const dbTimestamp = row.timestamp ? parseInt(row.timestamp) : 0;
            
            // --- CORE FIX 1: ZOMBIE GUARD ---
            // Jika DB sudah 'in_progress', TOLAK semua request 'force_submitted' dari siswa.
            if (dbStatus === 'in_progress' && incomingStatus === 'force_submitted') {
                console.log(`[GUARD] Blocking stale force_submitted from ${student.studentId}. DB is in_progress.`);
                
                // Return data DB saat ini ke siswa, memaksa siswa menerima status 'in_progress'
                return res.status(200).json({
                     examCode,
                     student,
                     answers: JSON.parse(row.answers || '{}'),
                     score: row.score,
                     correctAnswers: row.correct_answers,
                     totalQuestions: row.total_questions,
                     status: 'in_progress', // FORCE CLIENT TO UNLOCK
                     isSynced: true,
                     timestamp: dbTimestamp,
                     location: row.location
                });
            }

            // --- CORE FIX 2: TEACHER AUTHORITY OVERRIDE ---
            // Jika request masuk adalah 'in_progress' (Unlock dari Guru), 
            // kita IZINKAN menimpa 'force_submitted' (Lock dari Siswa)
            // MESKIPUN timestamp Guru lebih tua dari timestamp Siswa (kasus jam siswa lebih cepat).
            const isTeacherUnlock = incomingStatus === 'in_progress' && dbStatus === 'force_submitted';

            if (!isTeacherUnlock) {
                // Hanya lakukan cek timestamp jika BUKAN Unlock Guru
                if (requestTime < dbTimestamp) {
                    console.log(`[IGNORE] Ignoring old packet. Req: ${requestTime}, DB: ${dbTimestamp}`);
                     return res.status(200).json({
                         examCode,
                         student,
                         answers: JSON.parse(row.answers || '{}'),
                         status: dbStatus,
                         isSynced: true,
                         timestamp: dbTimestamp
                    });
                }
            } else {
                 console.log(`[OVERRIDE] Teacher Unlock detected. Overriding Force Submit regardless of timestamp.`);
            }

            // Merging Activity Logs
            const prevLog = JSON.parse(row.activity_log || '[]');
            if (activityLog && activityLog.length > 0) {
                 finalActivityLog = [...prevLog, ...activityLog];
            } else {
                 finalActivityLog = prevLog;
            }
        }

        // 3. Hitung Nilai (Server-Side Grading)
        const grading = calculateGrade(fullExam, answers);
        
        let statusCode = 0;
        if (incomingStatus === 'in_progress') statusCode = 1;
        else if (incomingStatus === 'force_submitted') statusCode = 2;
        else if (incomingStatus === 'completed') statusCode = 3;

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
                activity_log = EXCLUDED.activity_log, 
                timestamp = EXCLUDED.timestamp,
                location = EXCLUDED.location;
        `;

        // Gunakan timestamp terbaru (atau paksa timestamp baru jika ini adalah Override Guru)
        const finalTimestamp = Date.now(); 

        await db.query(query, [
            examCode,
            student.studentId,
            student.fullName,
            student.class,
            JSON.stringify(answers),
            grading.score,
            grading.correctCount,
            grading.totalQuestions,
            incomingStatus,
            statusCode,
            JSON.stringify(finalActivityLog), 
            finalTimestamp, // Always use Server Time for consistency
            location || ''
        ]);

        const safeScore = incomingStatus === 'in_progress' ? null : grading.score;
        const safeCorrectAnswers = incomingStatus === 'in_progress' ? null : grading.correctCount;

        return res.status(200).json({
            examCode,
            student,
            answers,
            score: safeScore, 
            correctAnswers: safeCorrectAnswers,
            totalQuestions: grading.totalQuestions,
            status: incomingStatus,
            statusCode: statusCode,
            isSynced: true,
            timestamp: finalTimestamp,
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
