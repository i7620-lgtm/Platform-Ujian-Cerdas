
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentLogin } from './components/StudentLogin';
import { StudentExamPage } from './components/StudentExamPage';
import { StudentResultPage } from './components/StudentResultPage';
import { TeacherLogin } from './components/TeacherLogin';
import type { Exam, Student, Result, ResultStatus, TeacherProfile } from './types';
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
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [exams, setExams] = useState<Record<string, Exam>>({});
  const [results, setResults] = useState<Result[]>([]);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);

  const getHeaders = useCallback(() => {
      if (!teacherProfile) return {};
      return {
          'x-role': teacherProfile.accountType,
          'x-user-id': teacherProfile.id,
          'x-school': teacherProfile.school
      };
  }, [teacherProfile]);

  const refreshExams = useCallback(async () => {
    setIsSyncing(true);
    try {
        const headers = getHeaders();
        const examMap = await storageService.getExams(headers as Record<string, string>);
        setExams(examMap);
    } catch (e) {
        console.error("Failed to load exams:", e);
    } finally {
        setIsSyncing(false);
    }
  }, [getHeaders]);

  const refreshResults = useCallback(async () => {
    if (!teacherProfile) return;
    setIsSyncing(true);
    try {
        const headers = getHeaders();
        // Fetch all results for the teacher
        const data = await storageService.getResults(undefined, undefined, headers as Record<string, string>);
        setResults(data);
    } catch (e) {
        console.error("Failed to load results:", e);
    } finally {
        setIsSyncing(false);
    }
  }, [getHeaders, teacherProfile]);

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
        const loadStream = async () => {
            setIsSyncing(true);
            try {
                const exam = await storageService.getExamForStudent(streamCode);
                if (exam && exam.config.enablePublicStream) {
                    setCurrentExam(exam);
                    setView('PUBLIC_STREAM');
                } else {
                    alert("Livestream tidak ditemukan atau akses publik dinonaktifkan.");
                    window.history.replaceState(null, '', '/');
                    setView('SELECTOR');
                }
            } catch(e) {} finally { setIsSyncing(false); }
        };
        loadStream();
        return;
    }
    if (previewCode) {
        const loadPreview = async () => {
            const exam = await storageService.getExamForStudent(previewCode, true);
            if (exam) {
                setCurrentExam(exam);
                setCurrentStudent({ fullName: "Mode Preview", class: "Guru", absentNumber: "00", studentId: "PREVIEW-"+Date.now() });
                setView('STUDENT_EXAM');
            }
        };
        loadPreview();
    }
  }, []);

  const handleTeacherLoginSuccess = async (profile: TeacherProfile) => {
      setTeacherProfile(profile);
      setView('TEACHER_DASHBOARD');
  };

  const handleStudentLoginSuccess = async (examCode: string, student: Student) => {
    setIsSyncing(true);
    try {
      const exam = await storageService.getExamForStudent(examCode);
      if (!exam) { alert("Kode soal tidak ditemukan."); setIsSyncing(false); return; }
      
      const existingResult = await storageService.getStudentResult(examCode, student.studentId) as Result | null;
      if (existingResult && existingResult.status === 'completed' && !exam.config.allowRetakes) {
          alert("Anda sudah menyelesaikan ujian ini.");
          setIsSyncing(false);
          return;
      }
      
      if (existingResult && existingResult.status === 'in_progress') {
           setResumedResult(existingResult);
      } else {
           const initialPayload = {
              student: student,
              examCode: exam.code,
              answers: {},
              totalQuestions: exam.questions.filter(q => q.questionType !== 'INFO').length,
              completionTime: 0,
              activityLog: [`[${new Date().toLocaleTimeString()}] Memulai ujian.`],
              status: 'in_progress' as ResultStatus
          };
          storageService.submitExamResult(initialPayload);
      }
      
      setCurrentExam(exam);
      setCurrentStudent(student);
      setView('STUDENT_EXAM');
    } catch (e) { alert("Error"); } finally { setIsSyncing(false); }
  };

  const handleExamSubmit = useCallback(async (answers: Record<string, string>, timeLeft: number, location?: string, activityLog?: string[]) => {
    if (!currentExam || !currentStudent) return;
    const finalResult = await storageService.submitExamResult({
        student: currentStudent,
        examCode: currentExam.code,
        answers,
        totalQuestions: currentExam.questions.filter(q => q.questionType !== 'INFO').length,
        completionTime: (currentExam.config.timeLimit * 60) - timeLeft,
        activityLog: activityLog || [],
        location,
        status: 'completed' 
    });
    setStudentResult(finalResult);
    setView('STUDENT_RESULT');
  }, [currentExam, currentStudent]);
  
  const handleForceSubmit = useCallback(async (answers: Record<string, string>, _timeLeft: number, activityLog?: string[]) => {
     if (!currentExam || !currentStudent) return;
     const result = await storageService.submitExamResult({
         student: currentStudent, examCode: currentExam.code, answers, totalQuestions: 0, completionTime: 0, activityLog: activityLog || [], status: 'force_submitted'
     }) as Result;
     setStudentResult(result);
     setView('STUDENT_RESULT');
  }, [currentExam, currentStudent]);
  
  const handleExamUpdate = useCallback(async (answers: Record<string, string>, _timeLeft: number, location?: string, activityLog?: string[]) => {
      if(currentExam && currentStudent) {
          storageService.submitExamResult({
             student: currentStudent, examCode: currentExam.code, answers, totalQuestions: 0, completionTime: 0, activityLog: activityLog||[], location, status: 'in_progress'
          });
      }
  }, [currentExam, currentStudent]);

  const handleCheckExamStatus = async () => {
      if(currentExam && currentStudent) {
          const res = await storageService.getStudentResult(currentExam.code, currentStudent.studentId) as Result | null;
          if(res && res.status === 'in_progress') {
              setResumedResult(res);
              setView('STUDENT_EXAM');
          } else { alert("Belum dibuka oleh guru."); }
      }
  };

  const addExam = useCallback(async (newExam: Exam) => {
    const enriched = { 
        ...newExam, 
        authorId: teacherProfile?.id, 
        authorSchool: teacherProfile?.school || '' 
    };
    setExams(prev => ({ ...prev, [newExam.code]: enriched }));
    await storageService.saveExam(enriched, getHeaders() as Record<string, string>);
  }, [teacherProfile, getHeaders]);

  const updateExam = useCallback(async (u: Exam) => { 
    setExams(p => ({...p, [u.code]: u})); 
    await storageService.saveExam(u, getHeaders() as Record<string, string>); 
  }, [getHeaders]);

  const deleteExam = useCallback(async (c: string) => { 
    setExams(p => { const n = {...p}; delete n[c]; return n; }); 
    await storageService.deleteExam(c, getHeaders() as Record<string, string>); 
  }, [getHeaders]);

  const onAllowContinuation = async () => { 
      // Refresh results to show unlocked status
      refreshResults();
  };

  const resetToHome = () => {
    setCurrentExam(null); setCurrentStudent(null); setStudentResult(null); setResumedResult(null); setTeacherProfile(null); setView('SELECTOR'); window.history.replaceState(null, '', '/'); 
  }

  const SyncStatus = () => (
      <div className="fixed top-4 right-4 z-[100] flex items-center gap-2 pointer-events-none">
          {!isOnline && <div className="bg-rose-500 text-white px-3 py-1 rounded-full text-[10px] font-bold shadow-lg flex items-center gap-1"><NoWifiIcon className="w-3 h-3"/> Offline Mode</div>}
          {isSyncing && isOnline && <div className="bg-white/80 backdrop-blur text-indigo-600 px-3 py-1 rounded-full text-[10px] font-bold shadow-lg border border-indigo-100 flex items-center gap-1 animate-pulse"><CloudArrowUpIcon className="w-3 h-3"/> Syncing...</div>}
      </div>
  );

  if (view === 'SELECTOR') {
      return (
        <div className="relative min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-indigo-100 overflow-hidden flex flex-col items-center justify-center p-6">
             <SyncStatus />
             
             <div className="absolute inset-0 overflow-hidden pointer-events-none">
                 <div className="absolute top-[-15%] right-[-5%] w-[500px] h-[500px] bg-indigo-100/40 rounded-full blur-[100px]" />
                 <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-blue-50/40 rounded-full blur-[100px]" />
             </div>

             <div className="relative z-10 w-full max-w-[400px] flex flex-col gap-8 animate-slide-in-up">
                 <div className="text-center">
                     <div className="inline-flex p-5 bg-white rounded-[2.5rem] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.05)] mb-8 border border-white">
                        <LogoIcon className="w-12 h-12 text-indigo-600" />
                     </div>
                     <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2">UjianCerdas</h1>
                     <p className="text-slate-400 font-medium text-sm leading-relaxed">Platform asesmen modern yang ringan,<br/>aman, dan mudah diakses.</p>
                 </div>

                 <div className="space-y-4">
                     <button onClick={() => setView('STUDENT_LOGIN')} className="group w-full bg-white p-6 rounded-[2rem] shadow-[0_8px_30px_-5px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.06)] transition-all duration-500 border border-white flex items-center justify-between hover:scale-[1.02] active:scale-[0.98]">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </div>
                            <div className="text-left">
                                <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Akses Masuk</div>
                                <div className="text-xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors">Siswa</div>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                        </div>
                     </button>

                     <button onClick={() => setView('TEACHER_LOGIN')} className="group w-full bg-slate-900 p-6 rounded-[2rem] shadow-xl shadow-slate-200 hover:shadow-2xl hover:shadow-slate-300 transition-all duration-500 flex items-center justify-between hover:scale-[1.02] active:scale-[0.98]">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-white/10 text-white flex items-center justify-center group-hover:bg-white group-hover:text-slate-900 transition-all duration-500">
                                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 01-2-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                            </div>
                            <div className="text-left">
                                <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-0.5">Akses Kelola</div>
                                <div className="text-xl font-black text-white">Guru / Admin</div>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-white/20 group-hover:text-white transition-all">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                        </div>
                     </button>
                 </div>

                 <div className="mt-4 flex justify-center">
                    <div className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border transition-all ${isOnline ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm shadow-emerald-50' : 'bg-rose-50 text-rose-600 border-rose-100 shadow-sm shadow-rose-50'}`}>
                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        {isOnline ? 'System Online' : 'Network Offline'}
                    </div>
                 </div>
             </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
        <SyncStatus />
        {view === 'TEACHER_LOGIN' && <TeacherLogin onLoginSuccess={handleTeacherLoginSuccess} onBack={() => setView('SELECTOR')} />}
        {view === 'STUDENT_LOGIN' && <StudentLogin onLoginSuccess={(code, student) => handleStudentLoginSuccess(code, student)} onBack={() => setView('SELECTOR')} />}
        {view === 'TEACHER_DASHBOARD' && teacherProfile && (
            <TeacherDashboard 
                  teacherProfile={teacherProfile} 
                  addExam={addExam} 
                  updateExam={updateExam} 
                  deleteExam={deleteExam}
                  exams={exams} 
                  results={results} 
                  onLogout={resetToHome} 
                  onAllowContinuation={onAllowContinuation}
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
                    <div className="flex items-center gap-3">
                         <LogoIcon className="w-6 h-6 text-indigo-600" />
                         <h1 className="text-xl font-black text-gray-800 tracking-tight">Public Live View</h1>
                    </div>
                    <button onClick={resetToHome} className="text-sm font-bold text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-colors">Keluar</button>
                 </div>
                 <div className="w-full">
                     {/* Fixed: Removed invalid results prop from OngoingExamModal */}
                     <OngoingExamModal 
                        exam={currentExam} 
                        onClose={resetToHome} 
                        onAllowContinuation={() => {}} 
                        isReadOnly={true}
                     />
                 </div>
            </div>
        )}
    </div>
  );
};

export default App;
