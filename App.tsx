
import React, { useState, useCallback, useEffect } from 'react';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentLogin } from './components/StudentLogin';
import { StudentExamPage } from './components/StudentExamPage';
import { StudentResultPage } from './components/StudentResultPage';
import { TeacherLogin } from './components/TeacherLogin';
import type { Exam, Student, Result, TeacherProfile, ResultStatus } from './types';
import { LogoIcon, NoWifiIcon, WifiIcon } from './components/Icons';
import { storageService } from './services/storage';

type View = 'SELECTOR' | 'TEACHER_LOGIN' | 'STUDENT_LOGIN' | 'TEACHER_DASHBOARD' | 'STUDENT_EXAM' | 'STUDENT_RESULT';

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
          setCurrentExam(exam);
          setCurrentStudent(student);
          setStudentResult(res);
          setView('STUDENT_RESULT');
          return;
      }

      // Jika status force_closed, langsung ke halaman hasil (terkunci)
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
            alert("Ujian ini masih berupa draf. Gunakan fitur Preview dari dashboard guru.");
        } else {
            alert("Gagal memuat ujian. Periksa koneksi internet Anda.");
        }
    } finally { setIsSyncing(false); }
  }, []);

  // Effect to handle URL parameters (for Preview Mode)
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
        // Clear param to prevent re-triggering on manual refresh
        window.history.replaceState({}, document.title, window.location.pathname);
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

  // Updated Signature to support status and logs
  const handleExamSubmit = async (answers: Record<string, string>, timeLeft: number, status: ResultStatus = 'completed', activityLog: string[] = []) => {
    if (!currentExam || !currentStudent) return;
    
    // In preview mode, just go back home after finishing
    if (currentStudent.class === 'PREVIEW') {
        alert("Mode Pratinjau: Jawaban Anda tidak disimpan di server.");
        resetToHome();
        return;
    }

    setIsSyncing(true);
    const res = await storageService.submitExamResult({
        student: currentStudent,
        examCode: currentExam.code,
        answers,
        status, // Use passed status (completed or force_closed)
        activityLog, // Save activity logs
        timestamp: Date.now()
    });
    setStudentResult(res);
    setView('STUDENT_RESULT');
    setIsSyncing(false);
  };

  const resetToHome = () => { 
    setView('SELECTOR'); 
    setCurrentExam(null); 
    setCurrentStudent(null); 
    setStudentResult(null); 
    setResumedResult(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-brand-100 selection:text-brand-700 overflow-x-hidden antialiased">
        {/* Network & Sync Status - Lean Design */}
        <div className="fixed top-4 right-4 z-[100] flex flex-col items-end gap-2 pointer-events-none">
            {!isOnline ? (
                <div className="bg-rose-500 text-white px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg flex items-center gap-2 animate-pulse pointer-events-auto">
                    <NoWifiIcon className="w-3.5 h-3.5"/> Offline
                </div>
            ) : isSyncing ? (
                <div className="bg-white/80 backdrop-blur-md text-brand-600 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border border-brand-100 flex items-center gap-2 pointer-events-auto">
                    <div className="w-2 h-2 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
                    Sinkronisasi...
                </div>
            ) : (
                <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-100 flex items-center gap-2 pointer-events-auto opacity-50 hover:opacity-100 transition-opacity">
                    <WifiIcon className="w-3.5 h-3.5"/> Online
                </div>
            )}
        </div>
        
        {view === 'SELECTOR' && (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 relative">
                {/* Minimalist Background Accents */}
                <div className="absolute inset-0 -z-10 overflow-hidden">
                    <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-50 rounded-full blur-3xl opacity-50"></div>
                    <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
                </div>

                <div className="w-full max-w-sm text-center animate-gentle-slide">
                    <div className="inline-flex p-6 bg-white rounded-3xl shadow-xl shadow-brand-100/50 mb-8 border border-white">
                        <LogoIcon className="w-12 h-12 text-brand-600" />
                    </div>
                    
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">UjianCerdas</h1>
                    <p className="text-slate-500 text-sm font-medium mb-12 leading-relaxed px-4">
                        Platform evaluasi digital yang elegan, ringan, dan siap diakses kapan saja.
                    </p>
                    
                    <div className="space-y-4">
                        <button 
                            onClick={() => setView('STUDENT_LOGIN')} 
                            className="w-full group flex items-center justify-between p-5 bg-brand-600 rounded-2xl shadow-lg shadow-brand-100 hover:bg-brand-700 hover:-translate-y-0.5 transition-all duration-300"
                        >
                            <span className="text-white font-bold text-lg ml-2">Mulai Ujian</span>
                            <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center group-hover:bg-white group-hover:text-brand-600 transition-all">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                            </div>
                        </button>

                        <button 
                            onClick={() => setView('TEACHER_LOGIN')} 
                            className="w-full group flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-200 hover:border-brand-300 hover:bg-brand-50/30 transition-all duration-300"
                        >
                            <span className="text-slate-700 font-bold text-lg ml-2">Halaman Guru</span>
                            <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-brand-100 group-hover:text-brand-600 transition-all">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                        </button>
                    </div>

                    <div className="mt-16 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                        v2.0 • Minimalist Edition
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
                onUpdate={(a, t) => {
                    if (currentStudent.class !== 'PREVIEW') {
                        storageService.submitExamResult({ student: currentStudent, examCode: currentExam.code, answers: a, status: 'in_progress' });
                    }
                }}
            />
        )}
        
        {view === 'STUDENT_RESULT' && studentResult && currentExam && (
            <StudentResultPage result={studentResult} config={currentExam.config} onFinish={resetToHome} />
        )}
    </div>
  );
};

export default App;
