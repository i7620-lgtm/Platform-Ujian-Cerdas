
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentLogin } from './components/StudentLogin';
import { StudentExamPage } from './components/StudentExamPage';
import { StudentResultPage } from './components/StudentResultPage';
import { TeacherLogin } from './components/TeacherLogin';
import type { Exam, Student, Result, ResultStatus, TeacherProfile } from './types';
import { LogoIcon, NoWifiIcon } from './components/Icons';
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
        const examMap = await storageService.getExams({ 'x-user-id': teacherProfile.id, 'x-school': teacherProfile.school });
        setExams(examMap);
    } finally { setIsSyncing(false); }
  }, [teacherProfile]);

  const refreshResults = useCallback(async () => {
    if (!teacherProfile) return;
    setIsSyncing(true);
    try {
        const data = await storageService.getResults(undefined, undefined, { 'x-user-id': teacherProfile.id });
        setResults(data);
    } finally { setIsSyncing(false); }
  }, [teacherProfile]);

  const handleStudentLoginSuccess = async (examCode: string, student: Student) => {
    setIsSyncing(true);
    try {
      const exam = await storageService.getExamForStudent(examCode);
      if (!exam) { alert("Kode ujian tidak ditemukan."); return; }
      
      const res = await storageService.getStudentResult(examCode, student.studentId);
      if (res && res.status === 'completed' && !exam.config.allowRetakes) {
          alert("Ujian sudah pernah diselesaikan."); return;
      }
      
      if (res && res.status === 'in_progress') setResumedResult(res);
      
      setCurrentExam(exam);
      setCurrentStudent(student);
      setView('STUDENT_EXAM');
    } finally { setIsSyncing(false); }
  };

  const handleExamSubmit = async (answers: Record<string, string>, timeLeft: number) => {
    if (!currentExam || !currentStudent) return;
    setIsSyncing(true);
    const res = await storageService.submitExamResult({
        student: currentStudent,
        examCode: currentExam.code,
        answers,
        score: 0, 
        status: 'completed',
        timestamp: Date.now()
    });
    setStudentResult(res);
    setView('STUDENT_RESULT');
    setIsSyncing(false);
  };

  const resetToHome = () => { setView('SELECTOR'); setCurrentExam(null); setCurrentStudent(null); };

  const SyncStatusIndicator = () => (
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-3 pointer-events-none">
          {!isOnline && (
              <div className="bg-rose-500 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-2.5 animate-bounce">
                  <NoWifiIcon className="w-4 h-4"/> Mode Offline
              </div>
          )}
          {isSyncing && (
              <div className="bg-white/90 backdrop-blur-md text-indigo-600 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl border border-indigo-100 flex items-center gap-2.5">
                  <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  Mensinkronisasi...
              </div>
          )}
      </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFEFF] text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden antialiased">
        <SyncStatusIndicator />
        
        {view === 'SELECTOR' && (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 relative">
                {/* Minimal Background Decoration */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-40">
                    <div className="absolute top-[-5%] right-[-5%] w-[35rem] h-[35rem] bg-indigo-50 rounded-full blur-[100px]"></div>
                    <div className="absolute bottom-[-5%] left-[-5%] w-[25rem] h-[25rem] bg-blue-50 rounded-full blur-[80px]"></div>
                </div>

                <div className="w-full max-w-[420px] text-center animate-slide-in-up">
                    <div className="inline-flex p-5 bg-white rounded-[2rem] shadow-xl shadow-indigo-100/50 mb-12 border border-white">
                        <LogoIcon className="w-12 h-12 text-indigo-600" />
                    </div>
                    
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">UjianCerdas</h1>
                    <p className="text-slate-400 font-medium mb-14 leading-relaxed">Platform evaluasi siswa masa depan.<br/>Elegan, aman, dan sangat ringan.</p>
                    
                    <div className="flex flex-col gap-5">
                        <button 
                            onClick={() => setView('STUDENT_LOGIN')} 
                            className="group flex items-center justify-between p-7 bg-white rounded-[1.8rem] border border-slate-100 shadow-lg shadow-slate-200/20 hover:shadow-2xl hover:shadow-indigo-100/40 hover:-translate-y-1.5 transition-all duration-500"
                        >
                            <div className="flex items-center gap-6">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                </div>
                                <div className="text-left">
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-0.5">Siswa</span>
                                    <span className="text-lg font-bold text-slate-800">Masuk Peserta</span>
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-all">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                            </div>
                        </button>

                        <button 
                            onClick={() => setView('TEACHER_LOGIN')} 
                            className="group flex items-center justify-between p-7 bg-slate-900 rounded-[1.8rem] shadow-xl shadow-slate-300 hover:bg-black hover:-translate-y-1.5 transition-all duration-500"
                        >
                            <div className="flex items-center gap-6">
                                <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-500">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 01-2-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                                </div>
                                <div className="text-left">
                                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-0.5">Tenaga Pengajar</span>
                                    <span className="text-lg font-bold text-white">Dashboard Guru</span>
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/20 group-hover:text-white group-hover:bg-white/10 transition-all">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                            </div>
                        </button>
                    </div>

                    <div className="mt-20 flex items-center justify-center gap-2.5 opacity-60">
                        <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{isOnline ? 'System Online' : 'Offline Access'}</span>
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
                onUpdate={(a, t) => storageService.submitExamResult({ student: currentStudent, examCode: currentExam.code, answers: a, status: 'in_progress' })}
            />
        )}
        
        {view === 'STUDENT_RESULT' && studentResult && (
            <StudentResultPage result={studentResult} onFinish={resetToHome} />
        )}
    </div>
  );
};

export default App;
