
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentLogin } from './components/StudentLogin';
import { StudentExamPage } from './components/StudentExamPage';
import { StudentResultPage } from './components/StudentResultPage';
import { TeacherLogin } from './components/TeacherLogin';
import type { Exam, Student, Result, ResultStatus } from './types';
import { LogoIcon, CloudArrowUpIcon, NoWifiIcon } from './components/Icons';
import { storageService } from './services/storage';
import { OngoingExamModal } from './components/teacher/DashboardModals'; 

type View = 'SELECTOR' | 'TEACHER_LOGIN' | 'STUDENT_LOGIN' | 'TEACHER_DASHBOARD' | 'STUDENT_EXAM' | 'STUDENT_RESULT' | 'PUBLIC_STREAM';

const App: React.FC = () => {
  const [view, setView] = useState<View>('SELECTOR');
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [studentResult, setStudentResult] = useState<Result | null>(null);
  const [resumedResult, setResumedResult] = useState<Result | null>(null);
  const [teacherId, setTeacherId] = useState<string>('ANONYMOUS');
  
  const [exams, setExams] = useState<Record<string, Exam>>({});
  const [results, setResults] = useState<Result[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);

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

  useEffect(() => {
    const handleOnline = () => {
        setIsOnline(true);
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

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const streamCode = urlParams.get('stream');
    const previewCode = urlParams.get('preview');
    
    if (streamCode) {
        const loadStream = async (retries = 3) => {
            setIsSyncing(true);
            try {
                const exam = await storageService.getExamForStudent(streamCode);
                if (exam && exam.config.enablePublicStream) {
                    setCurrentExam(exam);
                    await refreshResults();
                    setView('PUBLIC_STREAM');
                } else {
                    if (retries > 0) {
                        setTimeout(() => loadStream(retries - 1), 1500);
                        return;
                    }
                    alert("Livestream tidak ditemukan atau belum dimulai.");
                    window.history.replaceState(null, '', '/');
                }
            } catch(e) {
                if (retries > 0) setTimeout(() => loadStream(retries - 1), 1500);
            } finally {
                if (retries <= 0 || view === 'PUBLIC_STREAM') setIsSyncing(false);
            }
        };
        loadStream();
        return;
    }

    if (previewCode) {
        const loadPreview = async () => {
            setIsSyncing(true);
            try {
                const exam = await storageService.getExamForStudent(previewCode, true);
                if (exam) {
                    const dummyStudent: Student = {
                        fullName: "Mode Preview",
                        class: "Guru",
                        studentId: "PREV-" + Date.now().toString().slice(-4)
                    };
                    setCurrentExam(exam);
                    setCurrentStudent(dummyStudent);
                    setView('STUDENT_EXAM');
                } else {
                     alert("Gagal memuat preview.");
                     window.history.replaceState(null, '', '/');
                }
            } catch(e) {
                alert("Terjadi kesalahan.");
            } finally {
                setIsSyncing(false);
            }
        };
        loadPreview();
    }
  }, [refreshResults]);


  const handleTeacherLoginSuccess = async (id: string) => {
      setTeacherId(id);
      setView('TEACHER_DASHBOARD');
  };
  
  const handleStudentLoginSuccess = async (examCode: string, student: Student) => {
    setIsSyncing(true);
    setResumedResult(null);

    try {
      const exam = await storageService.getExamForStudent(examCode);
      if (!exam) {
        alert("Kode soal tidak ditemukan.");
        setIsSyncing(false);
        return;
      }

      const existingResult = await storageService.getStudentResult(examCode, student.studentId);
      const now = new Date();
      const dateStr = exam.config.date.includes('T') ? exam.config.date.split('T')[0] : exam.config.date;
      const examStartDate = new Date(`${dateStr}T${exam.config.startTime}`);
      const examEndDate = new Date(examStartDate.getTime() + exam.config.timeLimit * 60 * 1000);

      if (now < examStartDate) {
        alert(`Ujian belum dimulai. Mulai pukul ${exam.config.startTime}.`);
        setIsSyncing(false);
        return;
      }

      if (existingResult) {
          const normalize = (str: string) => str.trim().toLowerCase();
          if (normalize(student.fullName) !== normalize(existingResult.student.fullName)) {
              alert("Data identitas tidak cocok dengan sesi sebelumnya.");
              setIsSyncing(false);
              return;
          }

          if (existingResult.status === 'force_submitted') {
              setCurrentExam(exam);
              setCurrentStudent(student);
              setStudentResult(existingResult);
              setView('STUDENT_RESULT');
              setIsSyncing(false);
              return;
          }

          if ((existingResult.status === 'completed' || existingResult.status === 'pending_grading') && !exam.config.allowRetakes) {
               alert("Anda sudah menyelesaikan ujian ini.");
               setIsSyncing(false);
               return;
          }

          if (existingResult.status === 'in_progress') {
               setResumedResult(existingResult);
          }
      } else {
          if (now > examEndDate) {
              alert("Waktu ujian telah berakhir.");
              setIsSyncing(false);
              return;
          }
      }

      setCurrentExam(exam);
      setCurrentStudent(student);
      setView('STUDENT_EXAM');

    } catch (e) {
      alert("Gagal memuat data ujian.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExamSubmit = useCallback(async (answers: Record<string, string>, timeLeft: number, location?: string, activityLog?: string[]) => {
    if (!currentExam || !currentStudent) return;
    const resultPayload = {
        student: currentStudent,
        examCode: currentExam.code,
        answers,
        totalQuestions: currentExam.questions.filter(q => q.questionType !== 'INFO').length,
        completionTime: (currentExam.config.timeLimit * 60) - timeLeft,
        activityLog: activityLog || [],
        location 
    };
    const finalResult = await storageService.submitExamResult({ ...resultPayload, status: 'completed' });
    setStudentResult(finalResult);
    setView('STUDENT_RESULT');
  }, [currentExam, currentStudent]);

  const handleForceSubmit = useCallback(async (answers: Record<string, string>, timeLeft: number, activityLog?: string[]) => {
    if (!currentExam || !currentStudent) return;
    setResumedResult(null);
    const logs = activityLog || [];
    logs.push(`[${new Date().toLocaleTimeString('id-ID')}] Terdeteksi pelanggaran.`);
    const resultPayload = {
        student: currentStudent,
        examCode: currentExam.code,
        answers,
        totalQuestions: currentExam.questions.filter(q => q.questionType !== 'INFO').length,
        completionTime: (currentExam.config.timeLimit * 60) - timeLeft,
        activityLog: logs,
        status: 'force_submitted' as ResultStatus
    };
    const savedResult = await storageService.submitExamResult(resultPayload);
    setStudentResult(savedResult);
    setView('STUDENT_RESULT');
  }, [currentExam, currentStudent]);

  const handleExamUpdate = useCallback(async (answers: Record<string, string>, timeLeft: number, location?: string, activityLog?: string[]) => {
      if (!currentExam || !currentStudent) return;
      await storageService.submitExamResult({
          student: currentStudent,
          examCode: currentExam.code,
          answers, 
          totalQuestions: currentExam.questions.filter(q => q.questionType !== 'INFO').length,
          completionTime: (currentExam.config.timeLimit * 60) - timeLeft,
          activityLog: activityLog || [],
          location,
          status: 'in_progress' as ResultStatus
      });
  }, [currentExam, currentStudent]);

  const handleAllowContinuation = async (studentId: string, examCode: string) => {
      await refreshResults();
  };

  const handleCheckExamStatus = async () => {
      if (!currentExam || !currentStudent) return;
      setIsSyncing(true);
      try {
          const allResults = await storageService.getResults();
          const result = allResults.find(r => r.examCode === currentExam.code && r.student.studentId === currentStudent.studentId);
          if (result && result.status === 'in_progress') {
              setResumedResult(result);
              setView('STUDENT_EXAM');
          } else {
              alert("Akses masih dikunci oleh pengawas.");
          }
      } catch(e) {
          alert("Gagal mengecek status.");
      } finally {
          setIsSyncing(false);
      }
  };

  const addExam = useCallback(async (newExam: Exam) => {
    setExams(prev => ({ ...prev, [newExam.code]: newExam }));
    await storageService.saveExam(newExam);
  }, []);

  const updateExam = useCallback(async (updatedExam: Exam) => {
    setExams(prev => ({ ...prev, [updatedExam.code]: updatedExam }));
    await storageService.saveExam(updatedExam);
  }, []);

  const deleteExam = useCallback(async (code: string) => {
    setExams(prev => {
        const next = { ...prev };
        delete next[code];
        return next;
    });
    await storageService.deleteExam(code);
  }, []);

  const resetToHome = () => {
    setCurrentExam(null);
    setCurrentStudent(null);
    setStudentResult(null);
    setResumedResult(null);
    setView('SELECTOR');
    setTeacherId('ANONYMOUS');
    window.history.replaceState(null, '', '/'); 
  }

  const SyncStatus = () => (
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          {!isOnline && (
              <div className="bg-rose-100 text-rose-700 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md border border-rose-200 backdrop-blur-md">
                  <NoWifiIcon className="w-4 h-4"/> Offline
              </div>
          )}
          {isSyncing && isOnline && (
               <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md animate-pulse border border-primary/20 backdrop-blur-md">
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
                  deleteExam={deleteExam}
                  exams={exams} 
                  results={results} 
                  onLogout={resetToHome} 
                  onAllowContinuation={handleAllowContinuation}
                  onRefreshExams={refreshExams}
                  onRefreshResults={refreshResults}
                />;
      case 'STUDENT_EXAM':
        if (currentExam && currentStudent) {
          return (
            <StudentExamPage 
                exam={currentExam} 
                student={currentStudent} 
                initialData={resumedResult} 
                onSubmit={handleExamSubmit} 
                onForceSubmit={handleForceSubmit} 
                onUpdate={handleExamUpdate} 
            />
          );
        }
        return null;
      case 'STUDENT_RESULT':
        if (studentResult) {
          return (
            <StudentResultPage 
                result={studentResult} 
                config={currentExam?.config} 
                onFinish={resetToHome} 
                onCheckStatus={studentResult.status === 'force_submitted' ? handleCheckExamStatus : undefined}
            />
          );
        }
        return null;
      case 'PUBLIC_STREAM':
        return (
            <div className="min-h-screen bg-slate-50 p-4 flex flex-col items-center">
                 <div className="w-full max-w-7xl mb-4 flex justify-between items-center">
                    <h1 className="text-xl font-black text-slate-800 tracking-tight">Public Live Monitor</h1>
                    <button onClick={resetToHome} className="text-sm font-bold text-primary hover:text-primary-focus bg-primary/5 px-4 py-2 rounded-xl transition-all">Home</button>
                 </div>
                 <div className="w-full">
                     <OngoingExamModal 
                        exam={currentExam} 
                        results={results} 
                        onClose={resetToHome} 
                        onAllowContinuation={() => {}} 
                        isReadOnly={true}
                     />
                 </div>
            </div>
        );
      case 'SELECTOR':
      default:
        return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-[#FDFDFF] p-6 animate-fade-in relative overflow-hidden">
             {/* Abstract background shapes */}
             <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
             <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-secondary/5 rounded-full blur-[80px] pointer-events-none"></div>
             
             <div className="w-full max-w-md text-center relative z-10">
                <div className="bg-white/80 backdrop-blur-2xl p-10 sm:p-12 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.06)] border border-white">
                    <div className="flex justify-center mb-10">
                        <div className="bg-gradient-to-tr from-primary to-indigo-500 p-5 rounded-[1.5rem] shadow-2xl shadow-primary/20 transform rotate-2 transition-transform hover:rotate-0 duration-500">
                            <LogoIcon className="w-14 h-14 text-white" />
                        </div>
                    </div>
                    
                    <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">ExamDesk</h1>
                    <p className="text-slate-500 mb-12 leading-relaxed font-medium">Platform evaluasi modern yang ringan, aman, dan dapat diandalkan.</p>
                    
                    <div className="space-y-4">
                        <button 
                            onClick={() => setView('STUDENT_LOGIN')} 
                            className="group w-full bg-slate-900 text-white font-bold py-5 px-8 rounded-2xl hover:bg-black hover:shadow-2xl hover:shadow-slate-200 transition-all duration-300 transform active:scale-95 flex items-center justify-between"
                        >
                             <div className="flex items-center gap-4">
                                <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-md">
                                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.499 5.216 50.59 50.59 0 00-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                                    </svg>
                                </div>
                                <span className="text-lg">Mulai Ujian</span>
                            </div>
                            <span className="bg-white/10 group-hover:bg-white/20 p-2 rounded-lg transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                            </span>
                        </button>

                        <button 
                            onClick={() => setView('TEACHER_LOGIN')} 
                            className="group w-full bg-white border-2 border-slate-100 text-slate-700 font-bold py-5 px-8 rounded-2xl hover:border-primary hover:bg-primary/5 hover:text-primary transition-all duration-300 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-4">
                                <div className="bg-slate-50 p-2.5 rounded-xl group-hover:bg-primary/10 transition-colors">
                                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                    </svg>
                                </div>
                                <span className="text-lg">Panel Guru</span>
                            </div>
                            <span className="p-2 opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                            </span>
                        </button>
                    </div>
                    
                    <div className="mt-14 pt-8 border-t border-slate-50 flex flex-col items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-amber-500 animate-pulse'}`}></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                Status: <span className={isOnline ? "text-emerald-600" : "text-amber-600"}>{isOnline ? "Server Online" : "Local Mode"}</span>
                            </p>
                        </div>
                    </div>
                </div>
                <p className="mt-8 text-[11px] font-bold text-slate-300 uppercase tracking-widest">© 2025 Platform Ujian Cerdas</p>
             </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-primary/20">
        <SyncStatus />
        {renderView()}
    </div>
  );
};

export default App;
