import React, { useState, useCallback, useEffect } from 'react';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentLogin } from './components/StudentLogin';
import { StudentExamPage } from './components/StudentExamPage';
import { StudentResultPage } from './components/StudentResultPage';
import { TeacherLogin } from './components/TeacherLogin';
import { OngoingExamModal } from './components/teacher/DashboardModals';
import type { Exam, Student, Result, TeacherProfile, ResultStatus } from './types';
import { LogoIcon, NoWifiIcon, WifiIcon, UserIcon, ArrowLeftIcon } from './components/Icons';
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

  const handleStudentLoginSuccess = useCallback(async (examCode: string, student: Student, isPreview: boolean = false) => {
    setIsSyncing(true);
    try {
      const exam = await storageService.getExamForStudent(examCode, isPreview);
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
            studentId: 'preview_mode_' + Date.now()
        };
        handleStudentLoginSuccess(previewCode.toUpperCase(), dummyStudent, true);
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }

    const liveCode = params.get('live');
    if (liveCode) {
        setIsSyncing(true);
        storageService.getExamForStudent(liveCode.toUpperCase(), true)
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
        const examMap = await storageService.getExams({ 
          'x-user-id': teacherProfile.id, 
          'x-role': teacherProfile.accountType,
          'x-school': teacherProfile.school 
        });
        setExams(examMap);
    } finally { setIsSyncing(false); }
  }, [teacherProfile]);

  const refreshResults = useCallback(async () => {
    if (!teacherProfile) return;
    setIsSyncing(true);
    try {
        const data = await storageService.getResults(undefined, undefined, { 
          'x-user-id': teacherProfile.id,
          'x-role': teacherProfile.accountType,
          'x-school': teacherProfile.school
        });
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
    window.history.replaceState({}, '', '/');
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 font-sans selection:bg-orange-100 selection:text-orange-900 overflow-x-hidden antialiased flex flex-col">
        
        {/* Status Jaringan Minimalis - Pojok Kiri Bawah */}
        <div className="fixed bottom-6 left-6 z-[100] pointer-events-none transition-all duration-500">
            {!isOnline ? (
                <div className="bg-rose-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-lg flex items-center gap-2 animate-pulse pointer-events-auto">
                    <NoWifiIcon className="w-3 h-3"/> Offline
                </div>
            ) : isSyncing ? (
                <div className="bg-white/90 backdrop-blur text-orange-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow border border-orange-100 flex items-center gap-2 pointer-events-auto">
                    <div className="w-2.5 h-2.5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                    Sync
                </div>
            ) : null}
        </div>
        
        {view === 'SELECTOR' && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                <div className="absolute inset-0 z-0 opacity-30">
                     <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100 via-slate-50 to-slate-100"></div>
                </div>
                
                <div className="w-full max-w-md z-10 animate-gentle-slide">
                    <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white p-8 md:p-12 text-center">
                        <div className="inline-flex p-5 bg-white rounded-2xl shadow-sm mb-8 border border-slate-50">
                            <LogoIcon className="w-12 h-12 text-slate-800" />
                        </div>
                        
                        <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mb-3">UjianCerdas</h1>
                        <p className="text-slate-500 text-sm font-medium mb-12 leading-relaxed">
                            Platform evaluasi modern, cepat, dan terpercaya.
                        </p>
                        
                        <div className="space-y-4">
                            <button 
                                onClick={() => setView('STUDENT_LOGIN')} 
                                className="w-full group relative overflow-hidden bg-slate-900 text-white p-5 rounded-2xl shadow-lg shadow-slate-200 hover:shadow-xl hover:scale-[1.01] transition-all duration-300"
                            >
                                <div className="relative z-10 flex items-center justify-center gap-3">
                                    <span className="font-bold text-base tracking-wide">Mulai Ujian Siswa</span>
                                    <ArrowLeftIcon className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </button>

                            <button 
                                onClick={() => setView('TEACHER_LOGIN')} 
                                className="w-full flex items-center justify-center gap-2 p-5 bg-white text-slate-600 rounded-2xl border border-slate-200 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all duration-300 font-bold text-sm"
                            >
                                <UserIcon className="w-4 h-4" />
                                Area Pengajar
                            </button>
                        </div>
                    </div>
                    
                    <p className="mt-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Versi 3.0 • Secure & Lightweight
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
                addExam={async (e) => { await storageService.saveExam(e, { 'x-user-id': teacherProfile.id, 'x-school': teacherProfile.school }); refreshExams(); }}
                updateExam={async (e) => { await storageService.saveExam(e, { 'x-user-id': teacherProfile.id, 'x-school': teacherProfile.school }); refreshExams(); }}
                deleteExam={async (c) => { await storageService.deleteExam(c, { 'x-user-id': teacherProfile.id }); refreshExams(); }}
                onLogout={resetToHome}
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
