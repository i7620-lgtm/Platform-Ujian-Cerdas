
import React, { useState, useCallback, useEffect } from 'react';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentLogin } from './components/StudentLogin';
import { StudentExamPage } from './components/StudentExamPage';
import { StudentResultPage } from './components/StudentResultPage';
import { TeacherLogin } from './components/TeacherLogin';
import { OngoingExamModal } from './components/teacher/DashboardModals';
import type { Exam, Student, Result, TeacherProfile, ResultStatus } from './types';
import { LogoIcon, NoWifiIcon, WifiIcon } from './components/Icons';
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
        // Add grading info if passed
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
    <div className="min-h-screen bg-[#FDFEFF] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-700 overflow-x-hidden antialiased">
        {/* Network Status Bar - Moved to Bottom Left to prevent obstruction */}
        <div className="fixed bottom-4 left-4 z-[100] flex flex-col items-start gap-2 pointer-events-none">
            {!isOnline ? (
                <div className="bg-rose-500 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2 animate-pulse pointer-events-auto">
                    <NoWifiIcon className="w-3 h-3"/> Offline
                </div>
            ) : isSyncing ? (
                <div className="bg-white/90 backdrop-blur-md text-indigo-600 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg border border-slate-100 flex items-center gap-2 pointer-events-auto">
                    <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    Sync
                </div>
            ) : (
                <div className="bg-white/80 backdrop-blur-sm text-emerald-600 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-2 pointer-events-auto opacity-60 hover:opacity-100 transition-opacity shadow-sm">
                    <WifiIcon className="w-3 h-3"/> Online
                </div>
            )}
        </div>
        
        {view === 'SELECTOR' && (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 relative bg-white">
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>
                
                <div className="w-full max-w-sm text-center animate-gentle-slide">
                    <div className="inline-flex p-6 bg-white rounded-3xl shadow-2xl shadow-slate-200/50 mb-10 border border-slate-50">
                        <LogoIcon className="w-14 h-14 text-indigo-600" />
                    </div>
                    
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">UjianCerdas</h1>
                    <p className="text-slate-400 text-sm font-medium mb-16 leading-relaxed px-6">
                        Platform evaluasi masa depan yang elegan, ringan, dan fokus pada kemudahan akses.
                    </p>
                    
                    <div className="space-y-4">
                        <button 
                            onClick={() => setView('STUDENT_LOGIN')} 
                            className="w-full group flex items-center justify-between p-6 bg-lime-400 rounded-2xl shadow-xl shadow-lime-200 hover:bg-lime-500 hover:-translate-y-1 transition-all duration-300"
                        >
                            <span className="text-lime-950 font-black text-lg ml-2 tracking-tight">Mulai Ujian</span>
                            <div className="w-10 h-10 rounded-xl bg-white/30 text-lime-900 flex items-center justify-center group-hover:bg-white group-hover:text-lime-600 transition-all">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                            </div>
                        </button>

                        <button 
                            onClick={() => setView('TEACHER_LOGIN')} 
                            className="w-full group flex items-center justify-between p-6 bg-white rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300"
                        >
                            <span className="text-slate-700 font-bold text-lg ml-2 group-hover:text-blue-700 transition-colors">Area Pengajar</span>
                            <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                        </button>
                    </div>

                    <div className="mt-20 text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">
                        PLATFORM EVALUASI v3.0
                    </div>
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
