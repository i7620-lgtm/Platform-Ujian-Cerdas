import React, { useState, useCallback } from 'react';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentLogin } from './components/StudentLogin';
import { StudentExamPage } from './components/StudentExamPage';
import { StudentResultPage } from './components/StudentResultPage';
import { TeacherLogin } from './components/TeacherLogin';
import type { Exam, Student, Result } from './types';
import { LogoIcon } from './components/Icons';
import { 
  getExamFromFirebase, 
  saveResultToFirebase, 
  saveExamToFirebase, 
  updateExamInFirebase,
  getAllExamsFromFirebase,
  getAllResultsFromFirebase
} from './services/firebase';

type View = 'SELECTOR' | 'TEACHER_LOGIN' | 'STUDENT_LOGIN' | 'TEACHER_DASHBOARD' | 'STUDENT_EXAM' | 'STUDENT_RESULT';

const App: React.FC = () => {
  const [view, setView] = useState<View>('SELECTOR');
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [studentResult, setStudentResult] = useState<Result | null>(null);
  
  // State for Teacher Dashboard
  const [exams, setExams] = useState<Record<string, Exam>>({});
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch data when teacher logs in
  const handleTeacherLoginSuccess = async () => {
    setLoading(true);
    try {
      // Parallel fetch for speed
      const [fetchedExams, fetchedResults] = await Promise.all([
        getAllExamsFromFirebase(),
        getAllResultsFromFirebase()
      ]);
      setExams(fetchedExams);
      setResults(fetchedResults);
      setView('TEACHER_DASHBOARD');
    } catch (e) {
      alert("Gagal memuat data dari server. Silakan coba lagi.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  
  const handleStudentLoginSuccess = async (examCode: string, student: Student) => {
    setLoading(true);
    try {
      // Fetch specific exam from Firebase
      const exam = await getExamFromFirebase(examCode);
      
      if (exam) {
        const now = new Date();
        const examStartDate = new Date(`${exam.config.date.split('T')[0]}T${exam.config.startTime}`);
        const examEndDate = new Date(examStartDate.getTime() + exam.config.timeLimit * 60 * 1000);

        // Validations
        if (now < examStartDate) {
          alert(`Ujian belum dimulai. Ujian akan dimulai pada ${examStartDate.toLocaleDateString('id-ID', {day: 'numeric', month: 'long'})} pukul ${exam.config.startTime}.`);
          return;
        }

        if (now > examEndDate) {
            alert("Waktu untuk mengikuti ujian ini telah berakhir.");
            return;
        }

        // Check if student already took it (Optimistic check, ideal world should verify with DB)
        // Since we don't load ALL results for students, we might skip this or do a quick specific query if needed.
        // For now, we proceed to exam.

        setCurrentExam(exam);
        setCurrentStudent(student);
        setView('STUDENT_EXAM');
      } else {
        alert("Kode soal tidak ditemukan atau koneksi bermasalah.");
      }
    } catch (e) {
      alert("Terjadi kesalahan saat mencari ujian.");
    } finally {
      setLoading(false);
    }
  };

  const calculateScore = useCallback((exam: Exam, answers: Record<string, string>): { score: number, correctCount: number } => {
    let correctCount = 0;
    
    exam.questions.forEach(q => {
        const studentAnswer = answers[q.id];
        
        if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
            const correctAnswer = q.correctAnswer;
            if (!studentAnswer || !correctAnswer) return;

            // Handle image-based (dataURL) or text-based answers
            if (correctAnswer.startsWith('data:image/')) {
                 if (studentAnswer === correctAnswer) {
                    correctCount++;
                 }
            } else {
                 if (studentAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
                    correctCount++;
                }
            }
        } else if (q.questionType === 'TRUE_FALSE') {
            // New logic for True/False Matrix
            if (q.trueFalseRows) {
                 if (!studentAnswer) return;
                 try {
                     const studentArr = JSON.parse(studentAnswer); // Array of booleans
                     let allCorrect = true;
                     if (!Array.isArray(studentArr) || studentArr.length !== q.trueFalseRows.length) return;
                     
                     for(let i=0; i < q.trueFalseRows.length; i++) {
                         if (studentArr[i] !== q.trueFalseRows[i].answer) {
                             allCorrect = false;
                             break;
                         }
                     }
                     if (allCorrect) correctCount++;
                 } catch(e) {}
            } else {
                // Legacy fallback logic
                const correctAnswer = q.correctAnswer;
                if (!studentAnswer || !correctAnswer) return;
                if (studentAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
                    correctCount++;
                }
            }
        } else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
            const correctAnswer = q.correctAnswer;
            if (!studentAnswer || !correctAnswer) return;
            
            // Check if arrays match (order doesn't matter for correctness check if we sort)
            const studentArr = studentAnswer.split(',').map(s => s.trim()).sort();
            const correctArr = correctAnswer.split(',').map(s => s.trim()).sort();
            
            if (JSON.stringify(studentArr) === JSON.stringify(correctArr)) {
                correctCount++;
            }
        } else if (q.questionType === 'MATCHING' && q.matchingPairs) {
            if (!studentAnswer) return;
            try {
                const map = JSON.parse(studentAnswer);
                let allCorrect = true;
                // Strict scoring: All pairs must be correct to get the point
                for (let i = 0; i < q.matchingPairs.length; i++) {
                    const expectedRight = q.matchingPairs[i].right;
                    const studentRight = map[i];
                    if (studentRight !== expectedRight) {
                        allCorrect = false;
                        break;
                    }
                }
                if (allCorrect) correctCount++;
            } catch (e) {}
        }
    });

    const scorableQuestions = exam.questions.filter(q => q.questionType !== 'ESSAY' && q.questionType !== 'INFO').length;
    const score = scorableQuestions > 0 ? Math.round((correctCount / scorableQuestions) * 100) : 0;
    return { score, correctCount };
  }, []);

  const handleExamSubmit = useCallback(async (answers: Record<string, string>, timeLeft: number) => {
    if (!currentExam || !currentStudent) return;
    setLoading(true);

    const { score, correctCount } = calculateScore(currentExam, answers);

    const result: Result = {
        student: currentStudent,
        examCode: currentExam.code,
        answers,
        score,
        totalQuestions: currentExam.questions.length,
        correctAnswers: correctCount,
        completionTime: (currentExam.config.timeLimit * 60) - timeLeft,
        activityLog: [
            "Siswa fokus penuh selama ujian.",
            "Tidak terdeteksi membuka aplikasi lain."
        ],
        status: 'completed',
    };

    // Save to Cloud
    await saveResultToFirebase(result);

    // Update local state (optional, for immediate feedback if needed)
    setResults(prev => [...prev, result]);
    setStudentResult(result);
    setView('STUDENT_RESULT');
    setLoading(false);
  }, [currentExam, currentStudent, calculateScore]);

  const handleForceSubmit = useCallback(async (answers: Record<string, string>, timeLeft: number) => {
    if (!currentExam || !currentStudent) return;
    
    // Don't show full loading screen for force submit, just do it in bg
    const { score, correctCount } = calculateScore(currentExam, answers);

    const result: Result = {
        student: currentStudent,
        examCode: currentExam.code,
        answers,
        score,
        totalQuestions: currentExam.questions.length,
        correctAnswers: correctCount,
        completionTime: (currentExam.config.timeLimit * 60) - timeLeft,
        activityLog: ["Ujian dihentikan paksa karena siswa terdeteksi membuka aplikasi/tab lain."],
        status: 'force_submitted',
    };
    
    await saveResultToFirebase(result);

    setResults(prevResults => {
        const otherResults = prevResults.filter(r => !(r.student.studentId === currentStudent.studentId && r.examCode === currentExam.code));
        return [...otherResults, result];
    });
  }, [currentExam, currentStudent, calculateScore]);

  const handleAllowContinuation = async (studentId: string, examCode: string) => {
      // In a real app, you would update the status in Firebase here.
      // For this MVP, we just update local state to reflect the UI change, 
      // but in a production environment, you should add a field to 'Result' (e.g. isLocked: false) 
      // and update it via updateDoc.
      
      setResults(prev => prev.filter(r => !(r.student.studentId === studentId && r.examCode === examCode && r.status === 'force_submitted')));
      alert(`Siswa dengan ID ${studentId} sekarang diizinkan untuk melanjutkan ujian ${examCode} (Instruksikan siswa untuk login kembali).`);
  };

  const addExam = useCallback(async (newExam: Exam) => {
    setLoading(true);
    const success = await saveExamToFirebase(newExam);
    if (success) {
        setExams(prevExams => ({ ...prevExams, [newExam.code]: newExam }));
    }
    setLoading(false);
  }, []);

  const updateExam = useCallback(async (updatedExam: Exam) => {
    setLoading(true);
    const success = await updateExamInFirebase(updatedExam);
    if (success) {
         setExams(prevExams => ({ ...prevExams, [updatedExam.code]: updatedExam }));
    }
    setLoading(false);
  }, []);


  const resetToHome = () => {
    setCurrentExam(null);
    setCurrentStudent(null);
    setStudentResult(null);
    setView('SELECTOR');
  }

  const renderView = () => {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-base-200">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mb-4"></div>
                <p className="text-lg font-semibold text-gray-600">Memuat data...</p>
            </div>
        )
    }

    switch (view) {
      case 'TEACHER_LOGIN':
        return <TeacherLogin onLoginSuccess={handleTeacherLoginSuccess} onBack={() => setView('SELECTOR')} />;
      case 'STUDENT_LOGIN':
        return <StudentLogin onLoginSuccess={handleStudentLoginSuccess} onBack={() => setView('SELECTOR')} />;
      case 'TEACHER_DASHBOARD':
        return <TeacherDashboard addExam={addExam} updateExam={updateExam} exams={exams} results={results} onLogout={resetToHome} onAllowContinuation={handleAllowContinuation} />;
      case 'STUDENT_EXAM':
        if (currentExam && currentStudent) {
          return <StudentExamPage exam={currentExam} student={currentStudent} onSubmit={handleExamSubmit} onForceSubmit={handleForceSubmit} />;
        }
        return null;
      case 'STUDENT_RESULT':
        if (studentResult) {
          return <StudentResultPage result={studentResult} onFinish={resetToHome} />;
        }
        return null;
      case 'SELECTOR':
      default:
        return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 p-4 animate-fade-in">
             <div className="w-full max-w-md text-center">
                <div className="bg-base-100/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg">
                    <div className="flex justify-center mb-6">
                        <div className="bg-primary/10 p-3 rounded-full">
                            <LogoIcon className="w-12 h-12 text-primary" />
                        </div>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-neutral mb-2">Platform Ujian Cerdas</h1>
                    <p className="text-base-content mb-8">Pilih peran Anda untuk melanjutkan.</p>
                    <div className="space-y-4">
                        <button onClick={() => setView('TEACHER_LOGIN')} className="w-full bg-primary text-primary-content font-bold py-3 px-4 rounded-lg hover:bg-primary-focus transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-1">
                            Masuk sebagai Guru
                        </button>
                        <button onClick={() => setView('STUDENT_LOGIN')} className="w-full bg-secondary text-white font-bold py-3 px-4 rounded-lg hover:bg-secondary-focus transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-1">
                            Masuk sebagai Siswa
                        </button>
                    </div>
                </div>
             </div>
          </div>
        );
    }
  };

  return <div className="min-h-screen bg-base-200">{renderView()}</div>;
};

export default App;
