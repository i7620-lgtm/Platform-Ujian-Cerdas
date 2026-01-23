
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
  
  // State baru untuk menampung data ujian yang dilanjutkan (resume)
  const [resumedResult, setResumedResult] = useState<Result | null>(null);

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

  // Check URL for Public Stream or Preview Parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const streamCode = urlParams.get('stream');
    const previewCode = urlParams.get('preview');
    
    // --- MODE 1: PUBLIC STREAM ---
    if (streamCode) {
        const loadStream = async (retries = 3) => {
            setIsSyncing(true);
            try {
                // Try fetching specific exam
                const exam = await storageService.getExamForStudent(streamCode);
                
                if (exam && exam.config.enablePublicStream) {
                    // Success!
                    setCurrentExam(exam);
                    // Fetch results before switching view to prevent empty modal
                    await refreshResults();
                    setView('PUBLIC_STREAM');
                } else {
                    if (retries > 0) {
                        // Retry after delay (handle Vercel cold starts)
                        console.log(`Stream load failed, retrying... (${retries} left)`);
                        setTimeout(() => loadStream(retries - 1), 1500);
                        return;
                    }
                    alert("Livestream tidak ditemukan atau belum dimulai. Silakan coba lagi nanti.");
                    window.history.replaceState(null, '', '/');
                }
            } catch(e) {
                console.error("Failed to load stream", e);
                if (retries > 0) {
                     setTimeout(() => loadStream(retries - 1), 1500);
                }
            } finally {
                if (retries <= 0 || view === 'PUBLIC_STREAM') {
                    setIsSyncing(false);
                }
            }
        };
        loadStream();
        return;
    }

    // --- MODE 2: EXAM PREVIEW (DRAFT) ---
    if (previewCode) {
        const loadPreview = async () => {
            setIsSyncing(true);
            try {
                // fetch with isPreview = true
                const exam = await storageService.getExamForStudent(previewCode, true);
                
                if (exam) {
                    const dummyStudent: Student = {
                        fullName: "Mode Preview",
                        class: "Guru",
                        studentId: "PREVIEW-" + Date.now().toString().slice(-4)
                    };
                    setCurrentExam(exam);
                    setCurrentStudent(dummyStudent);
                    setView('STUDENT_EXAM');
                    alert("Masuk ke Mode Preview. Jawaban Anda tidak akan disimpan secara permanen.");
                } else {
                     alert("Gagal memuat preview. Soal tidak ditemukan.");
                     window.history.replaceState(null, '', '/');
                }
            } catch(e) {
                 console.error("Failed to preview", e);
                 alert("Terjadi kesalahan saat memuat preview.");
            } finally {
                setIsSyncing(false);
            }
        };
        loadPreview();
    }
  }, [refreshResults]); // Dependencies stable


  const handleTeacherLoginSuccess = async (id: string) => {
      setTeacherId(id);
      setView('TEACHER_DASHBOARD');
  };
  
  const handleStudentLoginSuccess = async (examCode: string, student: Student) => {
    setIsSyncing(true);
    // Reset resumed result
    setResumedResult(null);

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

      // Check Exisiting Result Status
      if (existingResult) {
          // --- STRICT SECURITY CHECK ---
          const normalize = (str: string) => str.trim().toLowerCase();
          
          const inputName = normalize(student.fullName);
          const storedName = normalize(existingResult.student.fullName);
          const inputClass = normalize(student.class);
          const storedClass = normalize(existingResult.student.class);

          if (inputName !== storedName || inputClass !== storedClass) {
              alert(
                  `Akses Ditolak: Data Identitas Tidak Cocok.\n\n` +
                  `Sistem menemukan sesi ujian aktif untuk Absen No: ${student.studentId}, tetapi data berikut berbeda:\n` +
                  `------------------------------------------------\n` +
                  `DATA TERSIMPAN:\nNama: ${existingResult.student.fullName}\nKelas: ${existingResult.student.class}\n\n` +
                  `DATA INPUT ANDA:\nNama: ${student.fullName}\nKelas: ${student.class}\n` +
                  `------------------------------------------------\n` +
                  `Untuk melanjutkan ujian, Anda WAJIB memasukkan Nama Lengkap dan Kelas yang SAMA PERSIS dengan sesi sebelumnya.`
              );
              setIsSyncing(false);
              return;
          }
          // --- END STRICT CHECK ---

          if (existingResult.status === 'force_submitted') {
              setCurrentExam(exam);
              setCurrentStudent(student);
              setStudentResult(existingResult);
              setView('STUDENT_RESULT');
              setIsSyncing(false);
              return;
          }

          if (existingResult.status === 'completed' || existingResult.status === 'pending_grading') {
               if (!exam.config.allowRetakes) {
                   alert("Anda sudah menyelesaikan ujian ini.");
                   setIsSyncing(false);
                   return;
               }
          }

          if (existingResult.status === 'in_progress') {
               setResumedResult(existingResult);
               
               const resumeTime = new Date().toLocaleTimeString('id-ID');
               storageService.submitExamResult({
                  ...existingResult,
                  activityLog: [`[${resumeTime}] Melanjutkan ujian.`],
                  status: 'in_progress'
               });
          }
      } else {
          if (now > examEndDate) {
              alert("Waktu untuk mengikuti ujian ini telah berakhir.");
              setIsSyncing(false);
              return;
          }

          const startTime = new Date().toLocaleTimeString('id-ID');
          const initialPayload = {
              student: student,
              examCode: exam.code,
              answers: {},
              totalQuestions: exam.questions.filter(q => q.questionType !== 'INFO').length,
              completionTime: 0,
              activityLog: [`[${startTime}] Memulai ujian.`],
              status: 'in_progress' as ResultStatus
          };
          storageService.submitExamResult(initialPayload);
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
    
    // In Preview, we just calculate score locally if possible, or send to API but ignore result
    // To make it simple, we send it. The dashboard filter will show "Guru" class results if needed.
    const finalResult = await storageService.submitExamResult({
        ...resultPayload,
        status: 'completed' 
    });
    setStudentResult(finalResult);
    setView('STUDENT_RESULT');
  }, [currentExam, currentStudent]);

  const handleForceSubmit = useCallback(async (answers: Record<string, string>, timeLeft: number, activityLog?: string[]) => {
    if (!currentExam || !currentStudent) return;

    setResumedResult(null);

    const time = new Date().toLocaleTimeString('id-ID');
    const logs = activityLog || [];
    logs.push(`[${time}] Ujian dihentikan paksa karena pelanggaran aturan.`);

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

  // NEW: Update Handler for Auto-Save
  const handleExamUpdate = useCallback(async (answers: Record<string, string>, timeLeft: number, location?: string, activityLog?: string[]) => {
      if (!currentExam || !currentStudent) return;
      
      const resultPayload = {
          student: currentStudent,
          examCode: currentExam.code,
          answers, 
          totalQuestions: currentExam.questions.filter(q => q.questionType !== 'INFO').length,
          completionTime: (currentExam.config.timeLimit * 60) - timeLeft,
          activityLog: activityLog || [],
          location,
          status: 'in_progress' as ResultStatus
      };
      
      await storageService.submitExamResult(resultPayload);
  }, [currentExam, currentStudent]);


  const handleAllowContinuation = async (_studentId: string, _examCode: string) => {
      // Logic handled in DashboardModals.tsx now, _ prefix fixes TS6133
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
              
              const resumeTime = new Date().toLocaleTimeString('id-ID');
              await storageService.submitExamResult({
                  ...result,
                  activityLog: [...(result.activityLog || []), `[${resumeTime}] Siswa melanjutkan ujian setelah blokir dibuka.`]
              });
              
              setView('STUDENT_EXAM');
          } else {
              alert("Guru belum memberikan izin. Silakan hubungi pengawas ujian.");
          }
      } catch(e) {
          console.error(e);
          alert("Gagal mengecek status.");
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

  const deleteExam = useCallback(async (code: string) => {
    setExams(prevExams => {
        const next = { ...prevExams };
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

  // --- UI Components ---
  const SyncStatus = () => (
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          {!isOnline && (
              <div className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm border border-rose-100">
                  <NoWifiIcon className="w-3 h-3"/> Offline
              </div>
          )}
          {isSyncing && isOnline && (
               <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm animate-pulse border border-indigo-100">
                  <CloudArrowUpIcon className="w-3 h-3"/> Syncing...
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
            <div className="min-h-screen bg-gray-50 p-4 flex flex-col items-center">
                 <div className="w-full max-w-7xl mb-4 flex justify-between items-center">
                    <h1 className="text-xl font-bold text-gray-800">Public Live View</h1>
                    <button onClick={resetToHome} className="text-sm font-medium text-indigo-600 hover:underline">Home</button>
                 </div>
                 {/* Reusing Modal logic but rendered directly */}
                 <div className="w-full">
                     <OngoingExamModal 
                        exam={currentExam} 
                        results={results} 
                        onClose={resetToHome} 
                        onAllowContinuation={() => {}} // No-op for public
                        isReadOnly={true}
                     />
                 </div>
            </div>
        );
      case 'SELECTOR':
      default:
        return (
          <div className="relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden bg-slate-50">
             {/* Grid Background */}
             <div className="absolute inset-0 pointer-events-none" style={{
                backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(to right, #cbd5e1 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                opacity: 0.25
             }}></div>
             
             {/* Gradient Overlay for depth */}
             <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/30 to-slate-100/80 pointer-events-none"></div>

             <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-white p-8 sm:p-12 relative z-10 animate-fade-in">
                <div className="mb-10 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-3xl shadow-lg shadow-blue-200 flex items-center justify-center text-white mb-6 transform rotate-3 hover:rotate-6 transition-transform duration-500">
                        <LogoIcon className="w-10 h-10" />
                    </div>
                    
                    <h1 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Ujian Cerdas</h1>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed">Platform evaluasi modern berbasis AI.<br/>Cepat, Tepat, dan Terpercaya.</p>
                </div>
                
                <div className="space-y-4">
                     {/* Student Button - Green */}
                     <button onClick={() => setView('STUDENT_LOGIN')} className="group w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-emerald-200 transform hover:-translate-y-1 active:scale-95 flex items-center justify-between">
                        <div className="flex flex-col items-start">
                            <span className="text-xs font-medium opacity-90 uppercase tracking-wider">Masuk Sebagai</span>
                            <span className="text-lg">Siswa</span>
                        </div>
                        <div className="bg-white/20 p-2 rounded-xl group-hover:bg-white/30 transition-colors">
                           <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </div>
                    </button>

                    {/* Teacher Button - Blue */}
                    <button onClick={() => setView('TEACHER_LOGIN')} className="group w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-blue-200 transform hover:-translate-y-1 active:scale-95 flex items-center justify-between">
                        <div className="flex flex-col items-start">
                            <span className="text-xs font-medium opacity-90 uppercase tracking-wider">Masuk Sebagai</span>
                            <span className="text-lg">Guru</span>
                        </div>
                        <div className="bg-white/20 p-2 rounded-xl group-hover:bg-white/30 transition-colors">
                           <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                        </div>
                    </button>
                </div>
                
                <div className="mt-12 flex justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100/50 py-2 px-4 rounded-full w-fit mx-auto">
                    <span className={isOnline ? "text-emerald-500 animate-pulse" : "text-rose-500"}>●</span>
                    <span>{isOnline ? "System Online" : "System Offline"}</span>
                </div>
             </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
        <SyncStatus />
        {renderView()}
    </div>
  );
};

export default App;
