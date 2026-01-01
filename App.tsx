

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentLogin } from './components/StudentLogin';
import { StudentExamPage } from './components/StudentExamPage';
import { StudentResultPage } from './components/StudentResultPage';
import { TeacherLogin } from './components/TeacherLogin';
import type { Exam, Student, Result, ResultStatus } from './types';
import { LogoIcon, CloudArrowUpIcon, NoWifiIcon } from './components/Icons';
import { storageService } from './services/storage';
import { OngoingExamModal } from './components/teacher/DashboardModals'; // Reuse for stream

type View = 'SELECTOR' | 'TEACHER_LOGIN' | 'STUDENT_LOGIN' | 'TEACHER_DASHBOARD' | 'STUDENT_EXAM' | 'STUDENT_RESULT' | 'PUBLIC_STREAM';

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

  // Check URL for Public Stream Parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const streamCode = urlParams.get('stream');
    if (streamCode) {
        const loadStream = async () => {
            setIsSyncing(true);
            try {
                // Fetch specific exam for public view
                const exam = await storageService.getExamForStudent(streamCode);
                if (exam && exam.config.enablePublicStream) {
                    setCurrentExam(exam);
                    setView('PUBLIC_STREAM');
                    // Pre-fetch results
                    await refreshResults();
                } else {
                    alert("Livestream tidak ditemukan atau tidak diizinkan.");
                    window.history.replaceState(null, '', '/');
                }
            } catch(e) {
                console.error("Failed to load stream", e);
            } finally {
                setIsSyncing(false);
            }
        };
        loadStream();
    }
  }, [refreshResults]);


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
              alert("Ujian Anda ditangguhkan karena terdeteksi membuka aplikasi lain. Silakan hubungi guru untuk mendapatkan izin melanjutkan.");
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
  const handleExamSubmit = useCallback(async (answers: Record<string, string>, timeLeft: number, location?: string) => {
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
        location // Add location
    };
    
    const finalResult = await storageService.submitExamResult(resultPayload);
    setStudentResult(finalResult);
    setView('STUDENT_RESULT');
  }, [currentExam, currentStudent]);

  const handleForceSubmit = useCallback(async (answers: Record<string, string>, timeLeft: number) => {
    if (!currentExam || !currentStudent) return;

    // Construct the payload with status 'force_submitted' immediately
    const resultPayload = {
        student: currentStudent,
        examCode: currentExam.code,
        answers,
        totalQuestions: currentExam.questions.length,
        completionTime: (currentExam.config.timeLimit * 60) - timeLeft,
        activityLog: ["Ujian dihentikan paksa karena siswa terdeteksi membuka aplikasi/tab lain."],
        status: 'force_submitted' as ResultStatus
    };
    
    // Submit with correct status directly
    await storageService.submitExamResult(resultPayload);
    
    // Alert is handled by UI locking
  }, [currentExam, currentStudent]);

  const handleAllowContinuation = async (studentId: string, examCode: string) => {
      try {
          setIsSyncing(true);
          // 1. Update in Storage/Backend
          await storageService.unlockStudentExam(examCode, studentId);
          
          // 2. Optimistic UI Update with Explicit Type Casting
          setResults(prev => prev.map(r => {
              if (r.student.studentId === studentId && r.examCode === examCode) {
                  return { ...r, status: 'in_progress' as ResultStatus };
              }
              return r;
          }));
          
          alert(`Siswa dengan ID ${studentId} sekarang diizinkan untuk melanjutkan ujian.`);
      } catch(e) {
          console.error(e);
          alert("Gagal membuka blokir siswa.");
      } finally {
          setIsSyncing(false);
      }
  };

  const addExam = useCallback(async (newExam: Exam) => {
    setExams(prevExams => ({ ...prevExams, [newExam.code]: newExam }));
    await storageService.saveExam(newExam);
  }, []);

  const updateExam = useCallback(async (updatedExam: Exam) => {
    setExams(prevExams => ({ ...prevExams, [updatedExam.code]: updatedExam }));
    await storageService.saveExam(updatedExam);
  }, []);

  const resetToHome = () => {
    setCurrentExam(null);
    setCurrentStudent(null);
    setStudentResult(null);
    setView('SELECTOR');
    setTeacherId('ANONYMOUS');
    window.history.replaceState(null, '', '/'); // Clear URL params if any
  }

  // --- UI Components ---
  const SyncStatus = () => (
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          {!isOnline && (
              <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-md border border-yellow-200">
                  <NoWifiIcon className="w-4 h-4"/> Offline
              </div>
          )}
          {isSyncing && isOnline && (
               <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-md animate-pulse border border-indigo-100">
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
          return <StudentResultPage result={studentResult} config={currentExam?.config} onFinish={resetToHome} />;
        }
        return null;
      case 'PUBLIC_STREAM':
        return (
            <div className="min-h-screen bg-gray-50 p-4 flex flex-col items-center">
                 <div className="w-full max-w-7xl mb-4 flex justify-between items-center">
                    <h1 className="text-xl font-bold text-gray-800">Platform Ujian Cerdas - Public Live View</h1>
                    <button onClick={resetToHome} className="text-sm font-medium text-indigo-600 hover:underline">Home</button>
                 </div>
                 {/* Reusing Modal logic but rendered directly */}
                 <div className="w-full">
                     <OngoingExamModal 
                        exam={currentExam} 
                        results={results} 
                        onClose={resetToHome} 
                        onAllowContinuation={() => alert("Akses Publik: Anda tidak memiliki izin untuk mengubah status siswa.")}
                     />
                 </div>
            </div>
        );
      case 'SELECTOR':
      default:
        return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-gray-100 p-6 animate-fade-in relative">
             <div className="w-full max-w-md text-center">
                <div className="bg-white/70 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-white/80">
                    <div className="flex justify-center mb-8">
                        <div className="bg-gradient-to-tr from-primary to-indigo-500 p-4 rounded-2xl shadow-xl shadow-primary/20 transform rotate-3">
                            <LogoIcon className="w-12 h-12 text-white" />
                        </div>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">Platform Ujian Cerdas</h1>
                    <p className="text-gray-500 mb-10 leading-relaxed text-sm md:text-base">Platform evaluasi modern yang aman, cepat, dan terpercaya untuk semua.</p>
                    
                    <div className="space-y-5">
                        {/* TEACHER BUTTON - Blue Theme */}
                        <button onClick={() => setView('TEACHER_LOGIN')} className="group w-full bg-white border-2 border-indigo-100 text-indigo-700 font-bold py-5 px-6 rounded-2xl hover:border-indigo-600 hover:shadow-xl hover:shadow-indigo-100 transition-all duration-300 flex items-center justify-between relative overflow-hidden">
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="bg-indigo-50 p-2 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                    </svg>
                                </div>
                                <span className="text-lg">Masuk sebagai Guru</span>
                            </div>
                            <span className="bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white p-2 rounded-lg transition-colors duration-300 relative z-10">→</span>
                        </button>

                        {/* STUDENT BUTTON - Green Theme */}
                        <button onClick={() => setView('STUDENT_LOGIN')} className="group w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold py-5 px-6 rounded-2xl hover:shadow-xl hover:shadow-teal-200 transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-between">
                             <div className="flex items-center gap-4">
                                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.499 5.216 50.59 50.59 0 00-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                                    </svg>
                                </div>
                                <span className="text-lg">Masuk sebagai Siswa</span>
                            </div>
                            <span className="bg-white/20 p-2 rounded-lg backdrop-blur-sm group-hover:bg-white/30 transition-colors">→</span>
                        </button>
                    </div>
                    
                    <div className="mt-12 pt-6 border-t border-gray-100 flex justify-center items-center gap-3">
                        <div className={`relative flex items-center justify-center w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-yellow-500'}`}>
                             {isOnline && <span className="absolute inset-0 inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"></span>}
                        </div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                            System Status: <span className={isOnline ? "text-green-600" : "text-yellow-600"}>{isOnline ? "Online Ready" : "Offline Mode"}</span>
                        </p>
                    </div>
                </div>
             </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-primary/20">
        <SyncStatus />
        {renderView()}
    </div>
  );
};

export default App;
