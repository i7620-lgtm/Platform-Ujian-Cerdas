 
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentLogin } from './components/StudentLogin';
import { StudentExamPage } from './components/StudentExamPage';
import { StudentResultPage } from './components/StudentResultPage';
import { TeacherLogin } from './components/TeacherLogin';
import type { Exam, Student, Result, ResultStatus, TeacherProfile } from './types';
import { LogoIcon, CloudArrowUpIcon, NoWifiIcon, ExclamationTriangleIcon } from './components/Icons';
import { storageService } from './services/storage';
import { OngoingExamModal } from './components/teacher/DashboardModals'; 

type View = 'SELECTOR' | 'TEACHER_LOGIN' | 'STUDENT_LOGIN' | 'TEACHER_DASHBOARD' | 'STUDENT_EXAM' | 'STUDENT_RESULT' | 'PUBLIC_STREAM';

const App: React.FC = () => {
  const [view, setView] = useState<View>('SELECTOR');
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [studentResult, setStudentResult] = useState<Result | null>(null);
  
  const [resumedResult, setResumedResult] = useState<Result | null>(null);

  // New: Store Full Teacher Profile
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  
  // Data State
  const [exams, setExams] = useState<Record<string, Exam>>({});
  const [results, setResults] = useState<Result[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [loginConflict, setLoginConflict] = useState<{ message: string; onConfirm: () => void; } | null>(null);

  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);

  // Extend storage service to support headers based on active profile
  const getHeaders = () => {
      if (!teacherProfile) return {};
      return {
          'x-role': teacherProfile.accountType,
          'x-user-id': teacherProfile.id,
          'x-school': teacherProfile.school
      };
  };

  const refreshExams = useCallback(async () => {
    setIsSyncing(true);
    try {
        const headers = getHeaders();
        const res = await fetch('/api/exams', { headers: headers as any });
        if (res.ok) {
            const data: Exam[] = await res.json();
            const examMap: Record<string, Exam> = {};
            data.forEach(e => examMap[e.code] = { ...e, isSynced: true });
            setExams(examMap);
        }
    } catch (e) {
        console.error("Failed to load exams:", e);
    } finally {
        setIsSyncing(false);
    }
  }, [teacherProfile]);

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
                        absentNumber: "00",
                        studentId: "PREVIEW-" + Date.now().toString().slice(-4)
                    };
                    setCurrentExam(exam);
                    setCurrentStudent(dummyStudent);
                    setView('STUDENT_EXAM');
                    alert("Masuk ke Mode Preview.");
                } else {
                     alert("Gagal memuat preview.");
                     window.history.replaceState(null, '', '/');
                }
            } catch(e) {
                 console.error(e);
            } finally {
                setIsSyncing(false);
            }
        };
        loadPreview();
    }
  }, [refreshResults]);


  const handleTeacherLoginSuccess = async (profile: TeacherProfile) => {
      setTeacherProfile(profile);
      setView('TEACHER_DASHBOARD');
  };
  
  const handleStudentLoginSuccess = async (examCode: string, student: Student, bypassValidation = false) => {
    setIsSyncing(true);
    setResumedResult(null);

    try {
      const exam = await storageService.getExamForStudent(examCode);
      if (!exam) {
        alert("Kode soal tidak ditemukan.");
        setIsSyncing(false);
        return;
      }

      if (!bypassValidation) {
          try {
              const allResults = await storageService.getResults();
              const examResults = allResults.filter(r => r.examCode === examCode);
              const normalize = (str: any) => String(str || '').trim().toLowerCase().replace(/\s+/g, ' ');
              const inputName = normalize(student.fullName);
              const inputClass = normalize(student.class);
              const inputAbsent = normalize(student.absentNumber);
              
              let conflictMessage = "";

              for (const res of examResults) {
                  const existingName = normalize(res.student.fullName);
                  const existingClass = normalize(res.student.class);
                  const existingAbsent = normalize(res.student.absentNumber || ''); 

                  if (existingName === inputName && existingClass === inputClass && existingAbsent !== inputAbsent && existingAbsent !== '') {
                      conflictMessage = `Data menunjukkan siswa dengan Nama Lengkap "${res.student.fullName}" dan Kelas "${res.student.class}" sudah terdaftar dengan Nomor Absen berbeda (${res.student.absentNumber}).\n\nApakah Nomor Absen Anda (${student.absentNumber}) sudah benar?`;
                      break;
                  }
                  if (existingClass === inputClass && existingAbsent === inputAbsent && existingName !== inputName && existingAbsent !== '') {
                      conflictMessage = `Nomor Absen "${student.absentNumber}" di Kelas "${student.class}" sebelumnya terdaftar atas nama "${res.student.fullName}".\n\nApakah nama lengkap Anda "${student.fullName}"?`;
                      break;
                  }
              }

              if (conflictMessage) {
                  setIsSyncing(false);
                  setLoginConflict({
                      message: conflictMessage,
                      onConfirm: () => {
                          setLoginConflict(null);
                          handleStudentLoginSuccess(examCode, student, true);
                      }
                  });
                  return;
              }
          } catch (e) {}
      }

      const existingResult = await storageService.getStudentResult(examCode, student.studentId);
      const now = new Date();
      const dateStr = exam.config.date.includes('T') ? exam.config.date.split('T')[0] : exam.config.date;
      const examStartDate = new Date(`${dateStr}T${exam.config.startTime}`);
      const examEndDate = new Date(examStartDate.getTime() + exam.config.timeLimit * 60 * 1000);

      if (now < examStartDate) {
        alert(`Ujian belum dimulai.`);
        setIsSyncing(false);
        return;
      }

      if (existingResult) {
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
      alert("Terjadi kesalahan.");
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
    logs.push(`[${time}] Ujian dihentikan paksa.`);

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
                  activityLog: [...(result.activityLog || []), `[${resumeTime}] Melanjutkan ujian.`]
              });
              setView('STUDENT_EXAM');
          } else {
              alert("Guru belum memberikan izin.");
          }
      } catch(e) {
          alert("Gagal mengecek status.");
      } finally {
          setIsSyncing(false);
      }
  };

  const addExam = useCallback(async (newExam: Exam) => {
    // Add author school context
    const enrichedExam = { 
        ...newExam, 
        authorSchool: teacherProfile?.school || '' 
    };
    setExams(prevExams => ({ ...prevExams, [newExam.code]: enrichedExam }));
    await storageService.saveExam(enrichedExam);
  }, [teacherProfile]);

  const updateExam = useCallback(async (updatedExam: Exam) => {
    // Keep original school if possible, or update
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
    setTeacherProfile(null);
    setView('SELECTOR');
    window.history.replaceState(null, '', '/'); 
  }

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

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
        <SyncStatus />
        
        {view === 'TEACHER_LOGIN' && <TeacherLogin onLoginSuccess={handleTeacherLoginSuccess} onBack={() => setView('SELECTOR')} />}
        {view === 'STUDENT_LOGIN' && <StudentLogin onLoginSuccess={(code, student) => handleStudentLoginSuccess(code, student)} onBack={() => setView('SELECTOR')} />}
        {view === 'TEACHER_DASHBOARD' && teacherProfile && (
            <TeacherDashboard 
                  teacherProfile={teacherProfile} // Pass full profile
                  addExam={addExam} 
                  updateExam={updateExam} 
                  deleteExam={deleteExam}
                  exams={exams} 
                  results={results} 
                  onLogout={resetToHome} 
                  onAllowContinuation={handleAllowContinuation}
                  onRefreshExams={refreshExams}
                  onRefreshResults={refreshResults}
            />
        )}
        {view === 'STUDENT_EXAM' && currentExam && currentStudent && (
            <StudentExamPage 
                exam={currentExam} 
                student={currentStudent} 
                initialData={resumedResult} 
                onSubmit={handleExamSubmit} 
                onForceSubmit={handleForceSubmit} 
                onUpdate={handleExamUpdate} 
            />
        )}
        {view === 'STUDENT_RESULT' && studentResult && (
            <StudentResultPage 
                result={studentResult} 
                config={currentExam?.config} 
                onFinish={resetToHome} 
                onCheckStatus={studentResult.status === 'force_submitted' ? handleCheckExamStatus : undefined}
            />
        )}
        {view === 'PUBLIC_STREAM' && (
             <div className="min-h-screen bg-gray-50 p-4 flex flex-col items-center">
                 <div className="w-full max-w-7xl mb-4 flex justify-between items-center">
                    <h1 className="text-xl font-bold text-gray-800">Public Live View</h1>
                    <button onClick={resetToHome} className="text-sm font-medium text-indigo-600 hover:underline">Home</button>
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
        )}
        {view === 'SELECTOR' && (
           <div className="relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden bg-slate-50">
             <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(to right, #cbd5e1 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.25 }}></div>
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
                     <button onClick={() => setView('STUDENT_LOGIN')} className="group w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-emerald-200 transform hover:-translate-y-1 active:scale-95 flex items-center justify-between">
                        <div className="flex flex-col items-start">
                            <span className="text-xs font-medium opacity-90 uppercase tracking-wider">Masuk Sebagai</span>
                            <span className="text-lg">Siswa</span>
                        </div>
                        <div className="bg-white/20 p-2 rounded-xl group-hover:bg-white/30 transition-colors">
                           <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </div>
                    </button>

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
        )}

        {loginConflict && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 transform scale-100 transition-all border border-gray-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-500"></div>
                    <div className="flex items-center gap-4 mb-6">
                         <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0 border border-amber-100">
                            <ExclamationTriangleIcon className="w-6 h-6 text-amber-500" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">Konfirmasi Data</h3>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Peringatan Validasi Identitas</p>
                        </div>
                    </div>
                    <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 mb-8">
                        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                            {loginConflict.message}
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                         <button onClick={() => setLoginConflict(null)} className="w-full bg-white text-gray-700 border-2 border-gray-200 font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm">Tidak, Periksa Lagi</button>
                         <button onClick={loginConflict.onConfirm} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-black transition-colors text-sm shadow-lg shadow-gray-200">Ya, Data Benar</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default App;
