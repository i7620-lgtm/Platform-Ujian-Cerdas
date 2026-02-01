import React, { useState, useCallback, useEffect } from 'react';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentLogin } from './components/StudentLogin';
import { StudentExamPage } from './components/StudentExamPage';
import { StudentResultPage } from './components/StudentResultPage';
import { TeacherLogin } from './components/TeacherLogin';
import { OngoingExamModal } from './components/teacher/DashboardModals';
import type { Exam, Student, Result, TeacherProfile, ResultStatus } from './types';
import { LogoIcon, NoWifiIcon, WifiIcon, UserIcon, ArrowLeftIcon, SignalIcon } from './components/Icons';
import { storageService } from './services/storage';

type View = 'SELECTOR' | 'TEACHER_LOGIN' | 'STUDENT_LOGIN' | 'TEACHER_DASHBOARD' | 'STUDENT_EXAM' | 'STUDENT_RESULT' | 'LIVE_MONITOR';

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
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
        try {
            const profile = await storageService.getCurrentUser();
            if (profile) {
                setTeacherProfile(profile);
                setView('TEACHER_DASHBOARD');
            }
        } catch (e) {
            console.error("Session check failed", e);
        } finally {
            setIsLoadingSession(false);
        }
    };
    checkSession();
  }, []);

  const handleStudentLoginSuccess = useCallback(async (examCode: string, student: Student, isPreview: boolean = false) => {
    setIsSyncing(true);
    try {
      // Pass studentId to ensure consistent shuffling (Fix #2)
      const exam = await storageService.getExamForStudent(examCode, student.studentId, isPreview);
      if (!exam) { 
        alert("Kode Ujian tidak ditemukan atau belum dipublikasikan."); 
        return; 
      }
      
      const res = await storageService.getStudentResult(examCode, student.studentId);
      
      if (res && res.status === 'completed' && !isPreview) {
          if (!exam.config.allowRetakes) {
              setCurrentExam(exam);
              setCurrentStudent(student);
              setStudentResult(res);
              setView('STUDENT_RESULT');
              return;
          }
      }

      if (res && res.status === 'force_closed' && !isPreview) {
          setCurrentExam(exam);
          setCurrentStudent(student);
          setStudentResult(res);
          setView('STUDENT_RESULT');
          return;
      }

      setCurrentExam(exam);
      setCurrentStudent(student);
      
      if (res && res.status === 'in_progress' && !isPreview) {
        setResumedResult(res);
      } else if (!isPreview) {
        await storageService.submitExamResult({
          student,
          examCode,
          answers: {},
          status: 'in_progress',
          timestamp: Date.now()
        });
      }
      
      setView('STUDENT_EXAM');
    } catch (err: any) {
        if (err.message === 'EXAM_IS_DRAFT') {
            alert("Ujian ini masih berupa draf.");
        } else {
            console.error(err);
            alert("Gagal memuat ujian. Periksa koneksi internet Anda.");
        }
    } finally { setIsSyncing(false); }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const previewCode = params.get('preview');
    if (previewCode) {
        const dummyStudent: Student = {
            fullName: 'Mode Pratinjau',
            class: 'PREVIEW',
            absentNumber: '00',
            // Format ID Konsisten: Nama-Kelas-Absen
            studentId: `Mode Pratinjau-PREVIEW-00-${Date.now()}`
        };
        handleStudentLoginSuccess(previewCode.toUpperCase(), dummyStudent, true);
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }

    const liveCode = params.get('live');
    if (liveCode) {
        setIsSyncing(true);
        // Live monitor doesn't need student specific shuffling, pass generic ID or empty
        storageService.getExamForStudent(liveCode.toUpperCase(), 'monitor', true)
            .then(exam => {
                if (exam && exam.config.enablePublicStream) {
                    setCurrentExam(exam);
                    setView('LIVE_MONITOR');
                } else {
                    alert("Akses Pantauan Ditolak.");
                    window.history.replaceState({}, '', '/');
                }
            })
            .catch(() => {
                alert("Gagal memuat data ujian.");
                window.history.replaceState({}, '', '/');
            })
            .finally(() => setIsSyncing(false));
    }
  }, [handleStudentLoginSuccess]);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); storageService.syncData(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const refreshExams = useCallback(async () => {
    if (!teacherProfile) return;
    setIsSyncing(true);
    try {
        const examMap = await storageService.getExams();
        setExams(examMap);
    } finally { setIsSyncing(false); }
  }, [teacherProfile]);

  const refreshResults = useCallback(async () => {
    if (!teacherProfile) return;
    setIsSyncing(true);
    try {
        const data = await storageService.getResults();
        setResults(data);
    } finally { setIsSyncing(false); }
  }, [teacherProfile]);

  const handleExamSubmit = async (answers: Record<string, string>, timeLeft: number, status: ResultStatus = 'completed', activityLog: string[] = [], location?: string, grading?: any) => {
    if (!currentExam || !currentStudent) return;
    
    if (currentStudent.class === 'PREVIEW') {
        alert("Mode Pratinjau selesai.");
        resetToHome();
        return;
    }

    if (status === 'completed' || status === 'force_closed') setIsSyncing(true);
    
    const res = await storageService.submitExamResult({
        student: currentStudent,
        examCode: currentExam.code,
        answers,
        status, 
        activityLog, 
        location, 
        timestamp: Date.now(),
        ...(grading || {})
    });
    
    if (status === 'completed' || status === 'force_closed') {
        setStudentResult(res);
        setView('STUDENT_RESULT');
        setIsSyncing(false);
    }
  };

  const resetToHome = () => { 
    setView('SELECTOR'); 
    setCurrentExam(null); 
    setCurrentStudent(null); 
    setStudentResult(null); 
    setResumedResult(null);
    setTeacherProfile(null);
    window.history.replaceState({}, '', '/');
  };

  const handleLogout = async () => {
    await storageService.signOut();
    resetToHome();
  };

  if (isLoadingSession) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-sm font-medium text-slate-500">Memuat sesi...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-800 overflow-x-hidden antialiased flex flex-col">
        
        {/* Status Jaringan Minimalis & Elegan */}
        <div className="fixed top-6 right-6 z-[100] pointer-events-none flex flex-col gap-2 items-end">
            {!isOnline && (
                <div className="bg-rose-500/90 backdrop-blur-md text-white px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wide shadow-xl flex items-center gap-2 animate-bounce pointer-events-auto ring-1 ring-white/20">
                    <NoWifiIcon className="w-3.5 h-3.5"/> 
                    <span>Offline Mode</span>
                </div>
            )}
            
            {isSyncing && isOnline && (
                <div className="bg-white/80 backdrop-blur-md text-indigo-600 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wide shadow-lg border border-indigo-50 flex items-center gap-2 pointer-events-auto">
                    <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>Menyimpan...</span>
                </div>
            )}
        </div>
        
        {view === 'SELECTOR' && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                {/* Background Decor */}
                <div className="absolute inset-0 z-0 opacity-40 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-100 blur-[100px]"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-50 blur-[100px]"></div>
                </div>
                
                <div className="w-full max-w-sm z-10 animate-gentle-slide">
                    <div className="text-center mb-10">
                        <div className="inline-flex p-4 bg-white rounded-2xl shadow-sm mb-6 border border-slate-50 ring-1 ring-slate-100">
                            <LogoIcon className="w-10 h-10 text-indigo-600" />
                        </div>
                        
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-3">UjianCerdas</h1>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed">
                            Platform evaluasi modern.<br/>Ringan, Cepat, Terpercaya.
                        </p>
                    </div>
                    
                    <div className="space-y-4">
                        <button 
                            onClick={() => setView('STUDENT_LOGIN')} 
                            className="w-full group relative overflow-hidden bg-slate-900 text-white p-4 rounded-xl shadow-lg shadow-slate-200 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <div className="relative z-10 flex items-center justify-center gap-3">
                                <span className="font-bold text-sm tracking-wide">Masuk sebagai Siswa</span>
                                <ArrowLeftIcon className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform opacity-70" />
                            </div>
                        </button>

                        <button 
                            onClick={() => setView('TEACHER_LOGIN')} 
                            className="w-full flex items-center justify-center gap-2 p-4 bg-white text-slate-600 rounded-xl border border-slate-200 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all duration-300 font-bold text-sm hover:shadow-sm active:scale-[0.98]"
                        >
                            <UserIcon className="w-4 h-4" />
                            Area Pengajar
                        </button>
                    </div>

                    <p className="mt-12 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                        Versi 3.0 • Hemat Data
                    </p>
                </div>
            </div>
        )}

        {view === 'TEACHER_LOGIN' && <TeacherLogin onLoginSuccess={(p) => { setTeacherProfile(p); setView('TEACHER_DASHBOARD'); }} onBack={() => setView('SELECTOR')} />}
        {view === 'STUDENT_LOGIN' && <StudentLogin onLoginSuccess={handleStudentLoginSuccess} onBack={() => setView('SELECTOR')} />}
        
        {view === 'TEACHER_DASHBOARD' && teacherProfile && (
            <TeacherDashboard 
                teacherProfile={teacherProfile} 
                exams={exams} 
                results={results}
                addExam={async (e) => { 
                    const examWithAuthor = { ...e, authorId: teacherProfile.id, authorSchool: teacherProfile.school };
                    await storageService.saveExam(examWithAuthor); 
                    refreshExams(); 
                }}
                updateExam={async (e) => { 
                    const examWithAuthor = { ...e, authorId: teacherProfile.id, authorSchool: teacherProfile.school };
                    await storageService.saveExam(examWithAuthor); 
                    refreshExams(); 
                }}
                deleteExam={async (c) => { await storageService.deleteExam(c); refreshExams(); }}
                onLogout={handleLogout}
                onRefreshExams={refreshExams}
                onRefreshResults={refreshResults}
                onAllowContinuation={async (sid, ec) => { await storageService.unlockStudentExam(ec, sid); refreshResults(); }}
            />
        )}
        
        {view === 'STUDENT_EXAM' && currentExam && currentStudent && (
            <StudentExamPage 
                exam={currentExam} 
                student={currentStudent} 
                initialData={resumedResult}
                onSubmit={handleExamSubmit}
            />
        )}
        
        {view === 'STUDENT_RESULT' && studentResult && currentExam && (
            <StudentResultPage 
                result={studentResult} 
                exam={currentExam} 
                onFinish={resetToHome} 
            />
        )}

        {view === 'LIVE_MONITOR' && currentExam && (
            <OngoingExamModal 
                exam={currentExam}
                onClose={resetToHome}
                onAllowContinuation={()=>{}}
                isReadOnly={true}
            />
        )}
    </div>
  );
};
 
export default App;
