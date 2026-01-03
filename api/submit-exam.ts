
import type { VercelRequest, VercelResponse } from '@vercel/node';
// WAJIB menggunakan ekstensi .js saat mengimpor file lokal di mode ESM ("type": "module")
import db from './db.js';

let isSchemaChecked = false;

// Helper Normalisasi
const normalize = (str: any) => String(str || '').trim().toLowerCase().replace(/\s+/g, ' ');

const calculateGrade = (exam: any, answers: Record<string, string>) => {
    let correctCount = 0;
    const questions = JSON.parse(exam.questions || '[]');
    
    questions.forEach((q: any) => {
        const studentAnswer = answers[q.id];
        if (studentAnswer === undefined || studentAnswer === null || studentAnswer === '') return;

        if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
             if (q.correctAnswer && normalize(studentAnswer) === normalize(q.correctAnswer)) correctCount++;
        } 
        else if (q.questionType === 'TRUE_FALSE' && q.trueFalseRows) {
             try {
                 const studentArr = JSON.parse(studentAnswer);
                 let allCorrect = true;
                 if (!Array.isArray(studentArr) || studentArr.length !== q.trueFalseRows.length) allCorrect = false;
                 else {
                     for(let i=0; i < q.trueFalseRows.length; i++) {
                         if (studentArr[i] !== q.trueFalseRows[i].answer) { allCorrect = false; break; }
                     }
                 }
                 if (allCorrect) correctCount++;
             } catch(e) {}
        }
        else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
            let sArr: string[] = [];
            try { sArr = JSON.parse(studentAnswer); } catch { sArr = String(studentAnswer).split(','); }
            const tArrRaw = String(q.correctAnswer || '').split(',');
            const tSet = new Set(tArrRaw.map((s: string) => normalize(s)).filter((s: string) => s !== ''));
            const sSet = new Set(sArr.map((s: string) => normalize(s)).filter((s: string) => s !== ''));
            if (tSet.size === sSet.size && [...tSet].every((val: string) => sSet.has(val))) correctCount++;
        }
        else if (q.questionType === 'MATCHING' && q.matchingPairs) {
            try {
                const map = JSON.parse(studentAnswer);
                let allCorrect = true;
                for (let i = 0; i < q.matchingPairs.length; i++) {
                    if (normalize(map[i]) !== normalize(q.matchingPairs[i].right)) { allCorrect = false; break; }
                }
                if (allCorrect) correctCount++;
            } catch (e) {}
        }
    });

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
        // Pastikan semua kolom ada
        const cols = [
            "student_name TEXT", "student_class TEXT", "correct_answers INTEGER", 
            "total_questions INTEGER", "status TEXT", "status_code INTEGER", 
            "activity_log TEXT", "timestamp BIGINT", "location TEXT"
        ];
        for (const col of cols) {
             try { await db.query(`ALTER TABLE results ADD COLUMN IF NOT EXISTS ${col};`); } catch (e) {}
        }
        isSchemaChecked = true;
    } catch (e) { console.error("Schema Init Error", e); }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        await ensureSchema();
        const { examCode, student, answers, activityLog, location } = req.body;
        
        // Kita gunakan Waktu Server sebagai 'Source of Truth' untuk penyimpanan
        const serverTimestamp = Date.now(); 
        const incomingStatus = req.body.status || 'completed';
        const incomingLog = activityLog || [];

        // 1. Ambil Data Ujian (untuk Grading)
        const examResult = await db.query('SELECT * FROM exams WHERE code = $1', [examCode]);
        if (!examResult || examResult.rows.length === 0) return res.status(404).json({ error: 'Exam not found' });
        const fullExam = examResult.rows[0];

        // 2. CEK DATA EKSISTING & FILTER "GHOST PACKET"
        const existingRes = await db.query(
            'SELECT status, activity_log FROM results WHERE exam_code = $1 AND student_id = $2', 
            [examCode, student.studentId]
        );

        let finalActivityLog = incomingLog;

        if (existingRes.rows.length > 0) {
            const row = existingRes.rows[0];
            const dbStatus = row.status;
            const dbLog = JSON.parse(row.activity_log || '[]');

            // --- LOGIKA INTEGRITAS (ANTI GHOST PACKET) ---
            // Skenario: Guru sudah Unlock (status DB = 'in_progress').
            // Paket masuk meminta Lock (status Incoming = 'force_submitted').
            if (dbStatus === 'in_progress' && incomingStatus === 'force_submitted') {
                
                // Cek: Apakah paket ini membawa informasi BARU?
                // Paket Zombie (dikirim sebelum guru unlock) pasti memiliki log lebih sedikit atau sama dengan DB
                // karena saat guru unlock, sistem menambah log "[Guru] Membuka kunci".
                if (incomingLog.length <= dbLog.length) {
                    console.log(`[ZOMBIE REJECTED] ${student.studentId} - Packet Ignored. DB Log: ${dbLog.length}, Incoming: ${incomingLog.length}`);
                    
                    // Kita tolak perubahan statusnya, tapi kita kembalikan respons SUKSES (200)
                    // dengan status 'in_progress' agar frontend siswa sadar dia sudah di-unlock.
                    return res.status(200).json({
                        ...req.body,
                        status: 'in_progress', // Override status kembali ke in_progress
                        isSynced: true,
                        timestamp: serverTimestamp
                    });
                }
            }

            // Merge activity logs (Append only untuk log baru)
            if (incomingLog.length > 0) {
                 // Saring log yang belum ada di DB
                 const newLogs = incomingLog.filter((l: string) => !dbLog.includes(l));
                 finalActivityLog = [...dbLog, ...newLogs];
            } else {
                 finalActivityLog = dbLog;
            }
        }

        // 3. Simpan Data (Upsert Standar)
        const grading = calculateGrade(fullExam, answers);
        let statusCode = 1;
        if (incomingStatus === 'force_submitted') statusCode = 2;
        if (incomingStatus === 'completed') statusCode = 3;

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

        await db.query(query, [
            examCode, student.studentId, student.fullName, student.class,
            JSON.stringify(answers), grading.score, grading.correctCount, grading.totalQuestions,
            incomingStatus, statusCode, JSON.stringify(finalActivityLog), 
            serverTimestamp, location || ''
        ]);

        return res.status(200).json({
            examCode, student, answers,
            score: incomingStatus === 'in_progress' ? null : grading.score,
            correctAnswers: incomingStatus === 'in_progress' ? null : grading.correctCount,
            totalQuestions: grading.totalQuestions,
            status: incomingStatus,
            statusCode,
            isSynced: true,
            timestamp: serverTimestamp
        });

    } catch (error: any) {
        console.error("Submit Error:", error);
        return res.status(500).json({ error: "Server Error", details: error.message });
    }
}
