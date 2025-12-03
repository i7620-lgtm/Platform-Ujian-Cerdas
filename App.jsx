import React, { useState, useCallback, useEffect } from 'react';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentLogin } from './components/StudentLogin';
import { StudentExamPage } from './components/StudentExamPage';
import { StudentResultPage } from './components/StudentResultPage';
import { TeacherLogin } from './components/TeacherLogin';
import { LogoIcon } from './components/Icons';
import { 
    saveExamToFirebase, 
    getExamFromFirebase, 
    saveResultToFirebase, 
    getAllExamsFromFirebase, 
    getAllResultsFromFirebase 
} from './services/firebase';

const App = () => {
  const [view, setView] = useState('SELECTOR');
  const [currentExam, setCurrentExam] = useState(null);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [studentResult, setStudentResult] = useState(null);
  
  // State for Teacher Dashboard
  const [exams, setExams] = useState({});
  const [results, setResults] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // --- TEACHER LOGIC ---

  const handleTeacherLoginSuccess = () => {
      // Start loading data from Firebase
      setIsLoadingData(true);
      Promise.all([getAllExamsFromFirebase(), getAllResultsFromFirebase()])
          .then(([fetchedExams, fetchedResults]) => {
              setExams(fetchedExams);
              setResults(fetchedResults);
              setIsLoadingData(false);
              setView('TEACHER_DASHBOARD');
          })
          .catch(err => {
              console.error("Failed to load initial data", err);
              setIsLoadingData(false);
              alert("Gagal memuat data dari database. Pastikan koneksi internet stabil.");
              setView('TEACHER_DASHBOARD'); // Still let them in, maybe they want to create offline?
          });
  };

  const addExam = useCallback(async (newExam) => {
    // 1. Update Local State (Optimistic UI)
    setExams(prevExams => ({ ...prevExams, [newExam.code]: newExam }));
    // 2. Save to Firebase
    await saveExamToFirebase(newExam);
  }, []);

  const updateExam = useCallback(async (updatedExam) => {
    setExams(prevExams => ({ ...prevExams, [updatedExam.code]: updatedExam }));
    await saveExamToFirebase(updatedExam);
  }, []);
  
  // --- STUDENT LOGIC ---

  const handleStudentLoginSuccess = async (examCode, student) => {
    // Fetch directly from Firebase to ensure student gets the latest exam version
    // even if they are on a different device than the teacher.
    const exam = await getExamFromFirebase(examCode);
    
    if (exam) {
      const now = new Date();
      const examStartDate = new Date(`${exam.config.date.split('T')[0]}T${exam.config.startTime}`);
      const examEndDate = new Date(examStartDate.getTime() + exam.config.timeLimit * 60 * 1000);

      if (now < examStartDate) {
        alert(`Ujian belum dimulai. Ujian akan dimulai pada ${examStartDate.toLocaleDateString('id-ID', {day: 'numeric', month: 'long'})} pukul ${exam.config.startTime}.`);
        return;
      }

      if (now > examEndDate) {
          alert("Waktu untuk mengikuti ujian ini telah berakhir.");
          return;
      }

      setCurrentExam(exam);
      setCurrentStudent(student);
      setView('STUDENT_EXAM');
    } else {
      alert("Kode soal tidak ditemukan di sistem.");
    }
  };

  const calculateScore = useCallback((exam, answers) => {
    let correctCount = 0;
    
    exam.questions.forEach(q => {
        const studentAnswer = answers[q.id];
        
        if (q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'FILL_IN_THE_BLANK') {
            const correctAnswer = q.correctAnswer;
            if (!studentAnswer || !correctAnswer) return;

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
            if (q.trueFalseRows) {
                 if (!studentAnswer) return;
                 try {
                     const studentArr = JSON.parse(studentAnswer);
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
                const correctAnswer = q.correctAnswer;
                if (!studentAnswer || !correctAnswer) return;
                if (studentAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
                    correctCount++;
                }
            }
        } else if (q.questionType === 'COMPLEX_MULTIPLE_CHOICE') {
            const correctAnswer = q.correctAnswer;
            if (!studentAnswer || !correctAnswer) return;
            
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

  const handleExamSubmit = useCallback(async (answers, timeLeft) => {
    if (!currentExam || !currentStudent) return;
    
    const { score, correctCount } = calculateScore(currentExam, answers);

    const result = {
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
    
    // Save to Firebase
    await saveResultToFirebase(result);

    setResults(prev => [...prev, result]);
    setStudentResult(result);
    setView('STUDENT_RESULT');
  }, [currentExam, currentStudent, calculateScore]);

  const handleForceSubmit = useCallback(async (answers, timeLeft) => {
    if (!currentExam || !currentStudent) return;

    const { score, correctCount } = calculateScore(currentExam, answers);

    const result = {
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
    
    // Save to Firebase
    await saveResultToFirebase(result);

    setResults(prevResults => {
        const otherResults = prevResults.filter(r => !(r.student.studentId === currentStudent.studentId && r.examCode === currentExam.code));
        return [...otherResults, result];
    });
  }, [currentExam, currentStudent, calculateScore]);

  const handleAllowContinuation = (studentId, examCode) => {
      setResults(prev => prev.filter(r => !(r.student.studentId === studentId && r.examCode === examCode && r.status === 'force_submitted')));
      alert(`Siswa dengan ID ${studentId} sekarang diizinkan untuk melanjutkan ujian ${examCode} (Instruksi: Minta siswa login ulang).`);
  };


  const resetToHome = () => {
    setCurrentExam(null);
    setCurrentStudent(null);
    setStudentResult(null);
    setView('SELECTOR');
  }

  const renderView = () => {
    if (isLoadingData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-base-200">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-gray-600 font-medium">Menghubungkan ke Database...</p>
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
