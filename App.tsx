import React, { useState, useEffect } from 'react';
import { TeacherLogin } from './components/TeacherLogin';
import { StudentLogin } from './components/StudentLogin';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentExamPage } from './components/StudentExamPage';
import { StudentResultPage } from './components/StudentResultPage';
import { LogoIcon, UserIcon, QrCodeIcon, MoonIcon, SunIcon } from './components/Icons';
import { storageService } from './services/storage';
import type { TeacherProfile, Student, Exam, Result, ResultStatus } from './types';

type ViewState = 'HOME' | 'TEACHER_LOGIN' | 'STUDENT_LOGIN' | 'TEACHER_DASHBOARD' | 'STUDENT_EXAM' | 'STUDENT_RESULT';

function App() {
  const [view, setView] = useState<ViewState>('HOME');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  
  // Teacher State
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [exams, setExams] = useState<Record<string, Exam>>({});
  const [results, setResults] = useState<Result[]>([]);

  // Student State
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [studentResult, setStudentResult] = useState<Result | null>(null);
  const [resumedResult, setResumedResult] = useState<Result | null>(null);

  // Theme Toggle
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(!darkMode);

  // --- TEACHER FLOW ---

  const handleTeacherLogin = (profile: TeacherProfile) => {
    setTeacherProfile(profile);
    setView('TEACHER_DASHBOARD');
    refreshData(profile);
  };

  const refreshData = async (profile = teacherProfile) => {
    if (!profile) return;
    try {
        const fetchedExams = await storageService.getExams(profile);
        setExams(fetchedExams);
        const fetchedResults = await storageService.getResults(undefined, undefined); 
        setResults(fetchedResults);
    } catch (error) {
        console.error("Failed to refresh data", error);
    }
  };

  const handleAddExam = async (newExam: Exam) => {
      try {
          await storageService.saveExam(newExam);
          await refreshData();
      } catch (e) {
          alert("Gagal menyimpan ujian.");
      }
  };

  const handleUpdateExam = async (updatedExam: Exam) => {
      try {
          await storageService.saveExam(updatedExam);
          await refreshData();
      } catch (e) {
          alert("Gagal memperbarui ujian.");
      }
  };

  const handleDeleteExam = async (code: string) => {
      try {
          await storageService.deleteExam(code);
          await refreshData();
      } catch (e) {
          alert("Gagal menghapus ujian.");
      }
  };

  const handleAllowContinuation = async (studentId: string, examCode: string) => {
      try {
          await storageService.unlockStudentExam(examCode, studentId);
          await refreshData();
          alert("Akses siswa dibuka kembali.");
      } catch (e) {
          alert("Gagal membuka akses.");
      }
  };

  // --- STUDENT FLOW ---

  const handleStudentLogin = async (examCode: string, student: Student) => {
      try {
          // Check local progress first
          const localKey = `exam_local_${examCode}_${student.studentId}`;
          const localData = await storageService.getLocalProgress(localKey);
          
          let examToTake: Exam | null = null;
          
          if (localData) {
              examToTake = await storageService.getExamForStudent(examCode, student.studentId);
              setResumedResult({
                  student,
                  examCode,
                  answers: localData.answers,
                  score: 0,
                  totalQuestions: 0,
                  correctAnswers: 0,
                  activityLog: localData.logs
              });
          } else {
              setResumedResult(null);
              examToTake = await storageService.getExamForStudent(examCode, student.studentId);
          }

          if (examToTake) {
              setCurrentExam(examToTake);
              setCurrentStudent(student);
              setView('STUDENT_EXAM');
          }
      } catch (error: any) {
          if (error.message === "EXAM_NOT_FOUND") alert("Kode ujian tidak ditemukan.");
          else if (error.message === "EXAM_IS_DRAFT") alert("Ujian belum dipublikasikan.");
          else alert("Terjadi kesalahan saat memuat ujian: " + error.message);
      }
  };

  const handleExamSubmit = async (answers: Record<string, string>, timeLeft: number, status: ResultStatus = 'completed', logs: string[] = [], location?: string, grading?: any) => {
      if (!currentExam || !currentStudent) return;

      const resultData: Result = {
          student: currentStudent,
          examCode: currentExam.code,
          answers,
          score: grading?.score || 0,
          totalQuestions: grading?.totalQuestions || 0,
          correctAnswers: grading?.correctAnswers || 0,
          status,
          activityLog: logs,
          location
      };

      try {
          await storageService.submitExamResult(resultData);
          setStudentResult(resultData);
          setView('STUDENT_RESULT');
      } catch (e) {
          alert("Gagal mengirim jawaban. Coba lagi.");
      }
  };

  const handleResumeFromLock = () => {
      if (currentExam && currentStudent && studentResult) {
          setResumedResult(studentResult);
          setView('STUDENT_EXAM');
      }
  };

  const resetToHome = () => {
      setView('HOME');
      setCurrentExam(null);
      setCurrentStudent(null);
      setStudentResult(null);
      setResumedResult(null);
      setTeacherProfile(null);
  };

  // --- RENDER ---

  if (view === 'HOME') {
      return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-300">
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-100/50 dark:bg-indigo-900/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-100/50 dark:bg-blue-900/10 rounded-full blur-[120px] animate-pulse" style={{animationDelay: '1s'}}></div>

            <div className="relative z-10 w-full max-w-md text-center">
                <div className="mb-10 flex justify-center">
                    <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-indigo-100 dark:shadow-none flex items-center justify-center text-indigo-600 dark:text-indigo-500 transform rotate-3 hover:rotate-6 transition-transform duration-500 border border-white dark:border-slate-800">
                        <LogoIcon className="w-12 h-12" />
                    </div>
                </div>
                
                <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                    Ujian<span className="text-indigo-600 dark:text-indigo-400">Cerdas</span>
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mb-12 text-lg font-medium leading-relaxed">
                    Platform ujian digital modern yang aman, cepat, dan mudah digunakan.
                </p>

                <div className="space-y-4">
                    <button 
                        onClick={() => setView('STUDENT_LOGIN')} 
                        className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-base py-4 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-slate-200 dark:shadow-none flex items-center justify-center gap-3 group"
                    >
                        <QrCodeIcon className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                        Masuk sebagai Siswa
                    </button>
                    
                    <button 
                        onClick={() => setView('TEACHER_LOGIN')} 
                        className="w-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-base py-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-3 group"
                    >
                        <UserIcon className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                        Masuk sebagai Guru
                    </button>
                </div>

                <div className="mt-12">
                    <button 
                        onClick={toggleTheme}
                        className="p-3 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                        title={darkMode ? 'Mode Terang' : 'Mode Gelap'}
                    >
                        {darkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                    </button>
                </div>
                
                <p className="mt-8 text-xs font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest">
                    Versi 2.5 • By UjianCerdas Team
                </p>
            </div>
        </div>
      );
  }

  return (
    <>
        {view === 'TEACHER_LOGIN' && (
            <TeacherLogin 
                onLoginSuccess={handleTeacherLogin} 
                onBack={resetToHome} 
            />
        )}

        {view === 'STUDENT_LOGIN' && (
            <StudentLogin 
                onLoginSuccess={handleStudentLogin} 
                onBack={resetToHome} 
            />
        )}

        {view === 'TEACHER_DASHBOARD' && teacherProfile && (
            <TeacherDashboard 
                teacherProfile={teacherProfile}
                exams={exams}
                results={results}
                addExam={handleAddExam}
                updateExam={handleUpdateExam}
                deleteExam={handleDeleteExam}
                onLogout={resetToHome}
                onAllowContinuation={handleAllowContinuation}
                onRefreshExams={() => refreshData(teacherProfile)}
                onRefreshResults={() => refreshData(teacherProfile)}
                isDarkMode={darkMode}
                toggleTheme={toggleTheme}
            />
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
            />
        )}
    </>
  );
}

export default App;
