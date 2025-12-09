
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentLogin } from './components/StudentLogin';
import { StudentExamPage } from './components/StudentExamPage';
import { StudentResultPage } from './components/StudentResultPage';
import { TeacherLogin } from './components/TeacherLogin';
import type { Exam, Student, Result } from './types';
import { LogoIcon, CloudArrowUpIcon, NoWifiIcon } from './components/Icons';
import { storageService } from './services/storage';

type View = 'SELECTOR' | 'TEACHER_LOGIN' | 'STUDENT_LOGIN' | 'TEACHER_DASHBOARD' | 'STUDENT_EXAM' | 'STUDENT_RESULT';

const App: React.FC = () => {
  const [view, setView] = useState<View>('SELECTOR');
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [studentResult, setStudentResult] = useState<Result | null>(null);
  const [teacherId, setTeacherId] = useState<string>('ANONYMOUS');
  
  // Data State
  const [exams, setExams] = useState<Record<string, Exam>>({});
  const [results, setResults] = useState<Result[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Keep track of view for event listeners
  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);

  // --- SEPARATED DATA FETCHERS (Only called on demand) ---
  const refreshExams = useCallback(async () => {
    setIsSyncing(true);
    try {
        const loadedExams = await storageService.getExams();
        setExams(loadedExams);
    } catch (e) {
        console.error("Failed to load exams:", e);
    } finally {
        setIsSyncing(false);
    }
  }, []);

  const refreshResults = useCallback(async () => {
    setIsSyncing(true);
    try {
        const loadedResults = await storageService.getResults();
        setResults(loadedResults);
    } catch (e) {
        console.error("Failed to load results:", e);
    } finally {
        setIsSyncing(false);
    }
  }, []);

  // Connection Listeners
  useEffect(() => {
    const handleOnline = () => {
        setIsOnline(true);
        // Only sync if in dashboard
        if (viewRef.current === 'TEACHER_DASHBOARD') {
            storageService.syncData();
        }
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleTeacherLoginSuccess = async (id: string) => {
      setTeacherId(id);
      setView('TEACHER_DASHBOARD');
  };
  
  const handleStudentLoginSuccess = async (examCode: string, student: Student) => {
    setIsSyncing(true);
    try {
      // 1. Fetch SPECIFIC Exam only
      const exam = await storageService.getExamForStudent(examCode);
      
      if (!exam) {
        alert("Kode soal tidak ditemukan atau gagal memuat soal.");
        setIsSyncing(false);
        return;
      }

      // 2. Fetch SPECIFIC Result only to check status
      const existingResult = await storageService.getStudentResult(examCode, student.studentId);
      
      const now = new Date();
      const dateStr = exam.config.date.includes('T') ? exam.config.date.split('T')[0] : exam.config.date;
      const examStartDate = new Date(`${dateStr}T${exam.config.startTime}`);
      const examEndDate = new Date(examStartDate.getTime() + exam.config.timeLimit * 60 * 1000);

      if (now < examStartDate) {
        alert(`Ujian belum dimulai. Ujian akan dimulai pada ${examStartDate.toLocaleDateString('id-ID', {day: 'numeric', month: 'long'})} pukul ${exam.config.startTime}.`);
        setIsSyncing(false);
        return;
      }

      if (now > examEndDate) {
          alert("Waktu untuk mengikuti ujian ini telah berakhir.");
          setIsSyncing(false);
          return;
      }

      if (existingResult) {
          if (existingResult.status === 'completed' || existingResult.status === 'pending_grading') {
               if (!exam.config.allowRetakes) {
                   alert("Anda sudah menyelesaikan ujian ini.");
                   setIsSyncing(false);
                   return;
               }
          }
          if (existingResult.status === 'force_submitted') {
              alert("Ujian Anda ditangguhkan. Silakan hubungi guru untuk mendapatkan izin melanjutkan.");
              setIsSyncing(false);
              return;
          }
      }
      setCurrentExam(exam);
      setCurrentStudent(student);
      setView('STUDENT_EXAM');
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan saat memuat data ujian.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Submit Handler
  const handleExamSubmit = useCallback(async (answers: Record<string, string>, timeLeft: number) => {
    if (!currentExam || !currentStudent) return;
    
    const resultPayload = {
        student: currentStudent,
        examCode: currentExam.code,
        answers,
        totalQuestions: currentExam.questions.length,
        completionTime: (currentExam.config.timeLimit * 60) - timeLeft,
        activityLog: [
            "Siswa fokus penuh selama ujian.",
            "Tidak terdeteksi membuka aplikasi lain."
        ],
    };
    
    const finalResult = await storageService.submitExamResult(resultPayload);
    setStudentResult(finalResult);
    setView('STUDENT_RESULT');
  }, [currentExam, currentStudent]);

  const handleForceSubmit = useCallback(async (answers: Record<string, string>, timeLeft: number) => {
    if (!currentExam || !currentStudent) return;

    // Construct the payload as expected by submitExamResult (without status)
    const resultPayload = {
        student: currentStudent,
        examCode: currentExam.code,
        answers,
        totalQuestions: currentExam.questions.length,
        completionTime: (currentExam.config.timeLimit * 60) - timeLeft,
        activityLog: ["Ujian dihentikan paksa karena siswa terdeteksi membuka aplikasi/tab lain."],
    };
    
    // Submit normally first to get the grade
    const finalResult = await storageService.submitExamResult(resultPayload);
    
    // Then forcibly update status and save again
    finalResult.status = 'force_submitted'; 
    await storageService.saveResult(finalResult);
    
    // Alert is handled by UI locking
  }, [currentExam, currentStudent]);

  const handleAllowContinuation = async (studentId: string, examCode: string) => {
      // Optimistic Update
      setResults(prev => prev.filter(r => !(r.student.studentId === studentId && r.examCode === examCode && r.status === 'force_submitted')));
      alert(`Siswa dengan ID ${studentId} sekarang diizinkan untuk melanjutkan ujian ${examCode}.`);
      // Re-fetch to confirm from server
      await refreshResults();
  };

  const addExam = useCallback(async (newExam: Exam) => {
    setExams(prevExams => ({ ...prevExams, [newExam.code]: newExam }));
    await storageService.saveExam(newExam);
    // Removed refreshExams() call. Local state is updated optimistically.
    // Server sync happens in background via storageService.saveExam
  }, []);

  const updateExam = useCallback(async (updatedExam: Exam) => {
    setExams(prevExams => ({ ...prevExams, [updatedExam.code]: updatedExam }));
    await storageService.saveExam(updatedExam);
    // Removed refreshExams() call.
  }, []);

  const resetToHome = () => {
    setCurrentExam(null);
    setCurrentStudent(null);
    setStudentResult(null);
    setView('SELECTOR');
    setTeacherId('ANONYMOUS');
  }

  // --- UI Components ---
  const SyncStatus = () => (
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          {!isOnline && (
              <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-md">
                  <NoWifiIcon className="w-4 h-4"/> Offline
              </div>
          )}
          {isSyncing && isOnline && (
               <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-md animate-pulse">
                  <CloudArrowUpIcon className="w-4 h-4"/> Syncing...
              </div>
          )}
      </div>
  );

  const renderView = () => {
    switch (view) {
      case 'TEACHER_LOGIN':
        return <TeacherLogin onLoginSuccess={handleTeacherLoginSuccess} onBack={() => setView('SELECTOR')} />;
      case 'STUDENT_LOGIN':
        return <StudentLogin onLoginSuccess={handleStudentLoginSuccess} onBack={() => setView('SELECTOR')} />;
      case 'TEACHER_DASHBOARD':
        return <TeacherDashboard 
                  teacherId={teacherId}
                  addExam={addExam} 
                  updateExam={updateExam} 
                  exams={exams} 
                  results={results} 
                  onLogout={resetToHome} 
                  onAllowContinuation={handleAllowContinuation}
                  onRefreshExams={refreshExams}
                  onRefreshResults={refreshResults}
                />;
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
          <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 p-4 animate-fade-in relative">
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
                    <div className="mt-8 pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                            Status Penyimpanan: {isOnline ? <span className="text-green-600 font-bold">Cloud (Neon) + Lokal</span> : <span className="text-yellow-600 font-bold">Lokal (Offline Mode)</span>}
                        </p>
                    </div>
                </div>
             </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-base-200">
        <SyncStatus />
        {renderView()}
    </div>
  );
};

export default App;
