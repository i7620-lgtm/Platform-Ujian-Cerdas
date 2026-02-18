import React, { useState, useCallback, useEffect, Suspense } from 'react';
import { StudentLogin } from './components/StudentLogin';
import { StudentExamPage } from './components/StudentExamPage';
import { StudentResultPage } from './components/StudentResultPage';
import { TeacherLogin } from './components/TeacherLogin';
import { OngoingExamModal } from './components/teacher/DashboardModals';
import type { Exam, Student, Result, TeacherProfile, ResultStatus } from './types';
import { LogoIcon, NoWifiIcon, WifiIcon, UserIcon, ArrowLeftIcon, SignalIcon, SunIcon, MoonIcon, QrCodeIcon, BookOpenIcon } from './components/Icons';
import { storageService } from './services/storage';
import { InvitationModal } from './components/InvitationModal';
import { TermsPage, PrivacyPage } from './components/LegalPages';
import { TutorialPage } from './components/TutorialPage';
import { WaitingRoom } from './components/WaitingRoom';

// Lazy Load Teacher Dashboard
const TeacherDashboard = React.lazy(() => import('./components/TeacherDashboard').then(module => ({ default: module.TeacherDashboard })));

type View = 'SELECTOR' | 'TEACHER_LOGIN' | 'STUDENT_LOGIN' | 'TEACHER_DASHBOARD' | 'STUDENT_EXAM' | 'STUDENT_RESULT' | 'LIVE_MONITOR' | 'TERMS' | 'PRIVACY' | 'TUTORIAL' | 'WAITING_ROOM';

// Helper for safe date parsing across browsers
const parseExamSchedule = (dateStr: string, timeStr: string): Date => {
    try {
        // Ensure YYYY-MM-DD
        const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        const [year, month, day] = cleanDate.split('-').map(Number);
        
        // Ensure HH:mm
        const [hours, minutes] = timeStr.split(':').map(Number);
        
        // Construct local date (month is 0-indexed)
        return new Date(year, month - 1, day, hours, minutes, 0);
    } catch (e) {
        console.error("Date parsing error", e);
        return new Date(NaN);
    }
};

const App: React.FC = () => {
  const [view, setView] = useState<View>('SELECTOR');
  const [previousView, setPreviousView] = useState<View>('SELECTOR');
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [waitingExam, setWaitingExam] = useState<Exam | null>(null);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [studentResult, setStudentResult] = useState<Result | null>(null);
  const [resumedResult, setResumedResult] = useState<Result | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [exams, setExams] = useState<Record<string, Exam>>({});
  const [results, setResults] = useState<Result[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [prefillCode, setPrefillCode] = useState<string>('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Theme State Management
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
        const local = localStorage.getItem('theme');
        return local === 'dark' || (!local && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // Apply Theme Effect
  useEffect(() => {
    if (darkMode) {
        document.documentElement.classList.add('dark');
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0f172a');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#ffffff');
        localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(!darkMode);

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
      const exam = await storageService.getExamForStudent(examCode, student.studentId, isPreview);
      
      // Check schedule with robust parsing
      if (!isPreview && exam) {
          const startTime = parseExamSchedule(exam.config.date, exam.config.startTime);
          const now = new Date();

          // Only redirect to waiting room if startTime is valid and in future
          if (!isNaN(startTime.getTime()) && now < startTime) {
              setWaitingExam(exam);
              setView('WAITING_ROOM');
              setIsSyncing(false); // Stop syncing loading state
              return; 
          }
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
            alert("Ujian ini masih berupa draf dan belum dipublikasikan.");
        } else if (err.message === 'EXAM_NOT_FOUND') {
            alert("Kode Ujian tidak ditemukan. Pastikan kode yang Anda masukkan benar.");
        } else {
            console.error(err);
            alert("Gagal memuat ujian. Periksa koneksi internet Anda.");
        }
    } finally { setIsSyncing(false); }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // 1. Check Preview (Teacher Mode)
    const previewCode = params.get('preview');
    if (previewCode) {
        const dummyStudent: Student = {
            fullName: 'Mode Pratinjau',
            class: 'PREVIEW',
            absentNumber: '00',
            studentId: `Mode Pratinjau-PREVIEW-00-${Date.now()}`
        };
        handleStudentLoginSuccess(previewCode.toUpperCase(), dummyStudent, true);
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }

    // 2. Check Join Code (Student Invitation)
    const joinCode = params.get('join');
    if (joinCode) {
        const code = joinCode.toUpperCase();
        
        // Fetch exam data FIRST before deciding logic
        storageService.getExamForStudent(code, 'check_schedule', true)
            .then(exam => {
                if (exam) {
                    setWaitingExam(exam);
                    setView('WAITING_ROOM'); // Explicitly go to Waiting Room
                } else {
                    // Fallback if exam not found
                    setPrefillCode(code);
                    setView('STUDENT_LOGIN');
                }
            })
            .catch((e) => {
                console.error("Join link error:", e);
                // Fallback on error
                setPrefillCode(code);
                setView('STUDENT_LOGIN');
            })
            .finally(() => {
                // Clear URL only AFTER processing to prevent race conditions
                window.history.replaceState({}, document.title, window.location.pathname);
            });
            
        return; // Halt other checks
    }

    // 3. Check Live Monitor
    const liveCode = params.get('live');
    if (liveCode) {
        setIsSyncing(true);
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
            .finally(() => {
                setIsSyncing(false);
                window.history.replaceState({}, document.title, window.location.pathname);
            });
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
        const examMap = await storageService.getExams(teacherProfile);
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

  const handleResumeFromLock = () => {
      if (studentResult) {
          const unlockedResult = { ...studentResult, status: 'in_progress' } as Result;
          setStudentResult(unlockedResult);
          setResumedResult(unlockedResult);
          setView('STUDENT_EXAM');
      }
  };

  const resetToHome = () => { 
    setView('SELECTOR'); 
    setCurrentExam(null); 
    setWaitingExam(null);
    setCurrentStudent(null); 
    setStudentResult(null); 
    setResumedResult(null);
    setTeacherProfile(null);
    setPrefillCode('');
    setExams({});
    setResults([]);
    window.history.replaceState({}, '', '/');
  };

  const handleLogout = async () => {
    resetToHome();
    try {
        await storageService.signOut();
    } catch(e) {
        console.error("Sign out error", e);
    }
  };

  const DashboardLoader = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-slate-900">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Memuat Dashboard...</p>
    </div>
  );

  if (isLoadingSession) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-slate-950">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-sm font-medium text-slate-500">Memuat sesi...</p>
            </div>
        </div>
    );
  }

  const ThemeToggle = ({ className = "" }: { className?: string }) => (
    <button 
        onClick={toggleTheme} 
        className={`p-2.5 rounded-full bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-md dark:shadow-none border border-slate-100 dark:border-slate-700 ${className}`}
        title={darkMode ? 'Mode Terang' : 'Mode Gelap'}
        aria-label="Toggle Theme"
    >
        {darkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans selection:bg-indigo-100 selection:text-indigo-800 overflow-x-hidden antialiased flex flex-col transition-colors duration-300">
        
        <div className="fixed top-6 right-6 z-[100] pointer-events-none flex flex-col gap-2 items-end">
            {view === 'SELECTOR' && (
                <div className="pointer-events-auto mb-2">
                    <ThemeToggle />
                </div>
            )}

            {!isOnline && (
                <div className="bg-rose-500/90 backdrop-blur-md text-white px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wide shadow-xl flex items-center gap-2 animate-bounce pointer-events-auto ring-1 ring-white/20">
                    <NoWifiIcon className="w-3.5 h-3.5"/> 
                    <span>Offline Mode</span>
                </div>
            )}
            
            {isSyncing && isOnline && (
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wide shadow-lg border border-indigo-50 dark:border-slate-700 flex items-center gap-2 pointer-events-auto">
                    <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>Menyimpan...</span>
                </div>
            )}
        </div>

        {view === 'SELECTOR' && (
            <div className="fixed top-6 left-6 z-[100]">
                <button 
                    onClick={() => setIsInviteOpen(true)}
                    className="p-2.5 rounded-full bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-md dark:shadow-none border border-slate-100 dark:border-slate-700"
                    title="Cetak Undangan"
                >
                    <QrCodeIcon className="w-5 h-5" />
                </button>
            </div>
        )}
        
        {view === 'SELECTOR' && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                <div className="absolute inset-0 z-0 opacity-40 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-100 dark:bg-slate-800 blur-[100px]"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-50 dark:bg-slate-800 blur-[100px]"></div>
                </div>
                
                <div className="w-full max-w-sm z-10 animate-gentle-slide">
                    <div className="text-center mb-10">
                        <div className="inline-flex p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm mb-6 border border-slate-50 dark:border-slate-700 ring-1 ring-slate-100 dark:ring-slate-800">
                            <LogoIcon className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-3">UjianCerdas</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">
                            Platform evaluasi modern.<br/>Ringan, Cepat, Terpercaya.
                        </p>
                    </div>
                    
                    <div className="space-y-4">
                        <button 
                            onClick={() => setView('STUDENT_LOGIN')} 
                            className="w-full group relative overflow-hidden bg-slate-900 dark:bg-indigo-600 text-white p-4 rounded-xl shadow-lg shadow-slate-200 dark:shadow-none transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <div className="relative z-10 flex items-center justify-center gap-3">
                                <span className="font-bold text-sm tracking-wide">Masuk sebagai Siswa</span>
                                <ArrowLeftIcon className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform opacity-70" />
                            </div>
                        </button>

                        <button 
                            onClick={() => setView('TEACHER_LOGIN')} 
                            className="w-full flex items-center justify-center gap-2 p-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-xl border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all duration-300 font-bold text-sm shadow-sm hover:shadow-md active:scale-[0.98]"
                        >
                            <UserIcon className="w-4 h-4" />
                            Area Pengajar
                        </button>

                        <button 
                            onClick={() => setView('TUTORIAL')} 
                            className="w-full flex items-center justify-center gap-2 p-4 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-xl border border-teal-100 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-all duration-300 font-bold text-sm shadow-sm hover:shadow-md active:scale-[0.98]"
                        >
                            <BookOpenIcon className="w-4 h-4" />
                            Panduan & Fitur
                        </button>
                    </div>

                    <p className="mt-12 text-center text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                        Versi 3.0 • Hemat Data
                    </p>
                </div>
            </div>
        )}

        {view === 'TEACHER_LOGIN' && (
            <TeacherLogin 
                onLoginSuccess={(p) => { setTeacherProfile(p); setView('TEACHER_DASHBOARD'); }} 
                onBack={() => setView('SELECTOR')}
                onViewTerms={() => { setPreviousView('TEACHER_LOGIN'); setView('TERMS'); }}
                onViewPrivacy={() => { setPreviousView('TEACHER_LOGIN'); setView('PRIVACY'); }}
                isDarkMode={darkMode}
                toggleTheme={toggleTheme}
            />
        )}
        
        {view === 'STUDENT_LOGIN' && (
            <StudentLogin 
                onLoginSuccess={handleStudentLoginSuccess} 
                onBack={() => setView('SELECTOR')} 
                isDarkMode={darkMode}
                toggleTheme={toggleTheme}
                initialCode={prefillCode}
            />
        )}
        
        {view === 'TEACHER_DASHBOARD' && teacherProfile && (
            <Suspense fallback={<DashboardLoader />}>
                <TeacherDashboard 
                    key={teacherProfile.id}
                    teacherProfile={teacherProfile} 
                    exams={exams} 
                    results={results}
                    isDarkMode={darkMode}
                    toggleTheme={toggleTheme}
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
            </Suspense>
        )}
        
        {view === 'STUDENT_EXAM' && currentExam && currentStudent && (
            <StudentExamPage 
                exam={currentExam} 
                student={currentStudent} 
                initialData={resumedResult}
                onSubmit={handleExamSubmit}
                isDarkMode={darkMode}
                toggleTheme={toggleTheme}
            />
        )}
        
        {view === 'STUDENT_RESULT' && studentResult && currentExam && (
            <StudentResultPage 
                result={studentResult} 
                exam={currentExam} 
                onFinish={resetToHome} 
                onResume={handleResumeFromLock}
                isDarkMode={darkMode}
                toggleTheme={toggleTheme}
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

        {view === 'WAITING_ROOM' && waitingExam && (
            <WaitingRoom
                exam={waitingExam}
                onEnter={() => {
                    setPrefillCode(waitingExam.code);
                    setView('STUDENT_LOGIN');
                }}
                onBack={() => {
                    resetToHome();
                }}
            />
        )}

        <InvitationModal 
            isOpen={isInviteOpen} 
            onClose={() => setIsInviteOpen(false)} 
        />

        {view === 'TERMS' && (
            <TermsPage onBack={() => setView(previousView)} />
        )}

        {view === 'PRIVACY' && (
            <PrivacyPage onBack={() => setView(previousView)} />
        )}

        {view === 'TUTORIAL' && (
            <TutorialPage onBack={() => setView('SELECTOR')} />
        )}
    </div>
  );
};
 
export default App;
