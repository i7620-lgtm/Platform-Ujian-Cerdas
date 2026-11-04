import React, { useState, useCallback, useEffect, Suspense } from 'react';
import { StudentLogin } from './components/StudentLogin';
import { StudentExamPage } from './components/StudentExamPage';
import { StudentResultPage } from './components/StudentResultPage';
import { ResultNotFoundPage } from './components/ResultNotFoundPage';
import { TeacherLogin } from './components/TeacherLogin';
import { OngoingExamModal } from './components/teacher/DashboardModals';
import type { Exam, Student, Result, TeacherProfile, ResultStatus } from './types';
import { LogoIcon, NoWifiIcon, UserIcon, ArrowLeftIcon, SunIcon, MoonIcon, QrCodeIcon, BookOpenIcon } from './components/Icons';
import { storageService } from './services/storage';
import { InvitationModal } from './components/teacher/InvitationModal';
import { ProfileCompletionModal } from './components/teacher/ProfileCompletionModal';
import { TermsPage, PrivacyPage } from './components/LegalPages';
import { TutorialPage } from './components/TutorialPage';
import { CollaboratorView } from './components/CollaboratorView';
import { supabase } from './lib/supabase';
import { hydrateMathInContainer } from './utils/mathRenderer';
import { calculateStudentAccess } from './utils/scheduleUtils';
import { measureClientBandwidthBytes, detectClientDevice, countIntegrityViolations } from './utils/telemetryUtils';

function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.error("Gagal memuat komponen dinamis, memuat ulang halaman...", error);
      const isChunkLoadFailed = 
        error instanceof TypeError ||
        (error as any)?.name === "ChunkLoadError" ||
        /Failed to fetch dynamically imported module|chunk/i.test(String(error));
        
      if (isChunkLoadFailed) {
        const lastReload = sessionStorage.getItem("last-chunk-reload-app");
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
          sessionStorage.setItem("last-chunk-reload-app", String(now));
          window.location.reload();
          return new Promise(() => {});
        }
      }
      throw error;
    }
  });
}

// Lazy Load Teacher Dashboard agar siswa tidak perlu mendownload kodenya
const TeacherDashboard = lazyWithRetry(() => import('./components/TeacherDashboard').then(module => ({ default: module.TeacherDashboard })));

type View = 'SELECTOR' | 'TEACHER_LOGIN' | 'STUDENT_LOGIN' | 'TEACHER_DASHBOARD' | 'STUDENT_EXAM' | 'STUDENT_RESULT' | 'LIVE_MONITOR' | 'TERMS' | 'PRIVACY' | 'TUTORIAL' | 'WAITING_ROOM' | 'COLLABORATOR_MODE' | 'RESULT_NOT_FOUND';

const App: React.FC = () => {
  const [view, setView] = useState<View>('SELECTOR');
  const [previousView, setPreviousView] = useState<View>('SELECTOR');
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [invitationExam, setInvitationExam] = useState<Exam | null>(null);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [studentResult, setStudentResult] = useState<Result | null>(null);
  const [resumedResult, setResumedResult] = useState<Result | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [exams, setExams] = useState<Record<string, Exam>>({});
  const [results, setResults] = useState<Result[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' && navigator.onLine !== undefined ? navigator.onLine : true);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [prefillCode, setPrefillCode] = useState<string>('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [collaboratorData, setCollaboratorData] = useState<{ exam: Exam, role: 'editor' | 'viewer' | 'public', token: string } | null>(null);
  const [isMonitorProctor, setIsMonitorProctor] = useState(false);

  // Theme State Management
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
        try {
            const local = localStorage.getItem('theme');
            return local === 'dark' || (!local && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
        } catch {
            return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
    }
    return false;
  });

  // Apply Theme Effect
  useEffect(() => {
    if (darkMode) {
        document.documentElement.classList.add('dark');
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0f172a');
        try { localStorage.setItem('theme', 'dark'); } catch { /* ignore */ }
    } else {
        document.documentElement.classList.remove('dark');
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#ffffff');
        try { localStorage.setItem('theme', 'light'); } catch { /* ignore */ }
    }
  }, [darkMode]);

  // Track active exam session for safe PWA updates
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
        if (view === 'STUDENT_EXAM') {
          sessionStorage.setItem('is_exam_in_progress', 'true');
        } else {
          sessionStorage.removeItem('is_exam_in_progress');
          if (sessionStorage.getItem('pending_pwa_refresh') === 'true') {
            sessionStorage.removeItem('pending_pwa_refresh');
            window.location.reload();
          }
        }
      }
    } catch {
      // Ignore sessionStorage exceptions in private/restricted modes
    }
  }, [view]);

  // Global Math Hydration Effect (Optimized for iPhone WebKit & Mobile to prevent DOM loops)
  useEffect(() => {
    // Initial hydration
    hydrateMathInContainer(document.body);

    // Observe changes for dynamic rendering with intelligent node filtering
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const observer = new MutationObserver((mutations) => {
      let shouldRender = false;
      for (const m of mutations) {
        if (m.addedNodes.length > 0) {
          for (let i = 0; i < m.addedNodes.length; i++) {
            const node = m.addedNodes[i];
            if (node instanceof HTMLElement) {
              // Ignore internal KaTeX nodes or nodes already marked as hydrated
              if (
                node.classList.contains('katex') ||
                node.classList.contains('katex-html') ||
                node.hasAttribute('data-math-hydrated') ||
                node.querySelector?.('.katex')
              ) {
                continue;
              }
              // Ignore inputs and form controls
              if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' || node.tagName === 'SELECT') {
                continue;
              }
              shouldRender = true;
              break;
            }
          }
          if (shouldRender) break;
        }
      }
      if (shouldRender) {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          hydrateMathInContainer(document.body);
        }, 120);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    
    return () => {
      observer.disconnect();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, []);

  const toggleTheme = () => setDarkMode(!darkMode);

  const isProfileComplete = (profile: TeacherProfile) => {
    return !!(profile.fullName && profile.school && profile.regency && 
           profile.fullName !== 'Pengguna' && profile.school !== '-' && profile.regency !== '-');
  };



  useEffect(() => {
    // HARD BLOCK: Ensure Realtime is ONLY enabled if disableRealtime is explicitly false.
    // This prevents students in "Normal Mode" from consuming Realtime Concurrent Peak Connections.
    const isRealtimeEnabled = currentExam?.config?.disableRealtime === false;
    
    if ((view === 'STUDENT_EXAM' || view === 'STUDENT_RESULT') && currentStudent && currentStudent.resultId && currentStudent.class !== 'PREVIEW' && currentExam && isRealtimeEnabled) {
      const channel = supabase.channel(`student-result-${currentStudent.resultId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'results', filter: `id=eq.${currentStudent.resultId}` }, async (payload) => {
            const newStudentName = payload.new.student_name;
            const newClassName = payload.new.class_name;
            const newStudentId = payload.new.student_id;
            
            if (newStudentName && newClassName && newStudentId) {
                const [schoolName, className] = newClassName.includes('::') ? newClassName.split('::') : ['', newClassName];
                const absentNumber = newStudentId.match(/%([^%]+)$/)?.[1] || '';

                setCurrentStudent(prev => {
                    if (!prev) return null;
                    
                    // Update localStorage so next login uses the updated data
                    try {
                        const examCode = currentExam?.code;
                        if (examCode) {
                            const prefData = {
                                fullName: newStudentName.trim(),
                                schoolName: schoolName.trim(),
                                studentClass: className.trim(),
                                absentNumber: absentNumber.trim()
                            };
                            localStorage.setItem(`student_pref_${examCode}`, JSON.stringify(prefData));
                        }

                        localStorage.setItem('saved_student_fullname', newStudentName.trim());
                        localStorage.setItem('saved_student_class', className.trim());
                        localStorage.setItem('saved_student_absent', absentNumber.trim());
                        if (schoolName) localStorage.setItem('saved_student_school', schoolName.trim());
                    } catch { /* ignore */ }

                    return {
                        ...prev,
                        fullName: newStudentName,
                        class: className,
                        schoolName: schoolName,
                        absentNumber: absentNumber,
                        studentId: newStudentId
                    };
                });
                
                // Update studentResult if it exists
                setStudentResult(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        student: {
                            ...prev.student,
                            fullName: newStudentName,
                            class: className,
                            schoolName: schoolName,
                            absentNumber: absentNumber,
                            studentId: newStudentId
                        }
                    };
                });
            }
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [view, currentStudent, currentExam]);

  const handleStudentLoginSuccess = useCallback(async (examCode: string, student: Student, isPreview: boolean = false) => {
    setIsSyncing(true);
    try {
      // Pass studentId to ensure consistent shuffling (Fix #2)
      const exam = await storageService.getExamForStudent(examCode, student.studentId, isPreview);
      if (!exam) { 
        alert("Kode Ujian tidak ditemukan atau belum dipublikasikan."); 
        return; 
      }

      // FIX: Check schedule before allowing entry (Manual Login & Class Session Isolation)
      if (!isPreview) {
          const access = calculateStudentAccess(exam.config, student.class, new Date());
          if (!access.canAccess) {
              setInvitationExam(exam);
              return;
          }
      }
      
      const res = await storageService.getStudentResult(examCode, student.studentId);
      
      if (res && res.status === 'completed' && !isPreview) {
          if (!exam.config.allowRetakes) {
              setCurrentExam(exam);
              setCurrentStudent({ ...student, resultId: res.id });
              setStudentResult(res);
              setView('STUDENT_RESULT');
              return;
          }
      }

      // Initialize with potential resultId if resuming
      let studentWithId = { ...student, resultId: res?.id };

      if (res && res.status === 'force_closed' && !isPreview) {
          const isPR = (exam.config.examMode || '').trim().toUpperCase() === 'PR';
          if (isPR) {
              // Pada mode PR, siswa tidak boleh terkunci akibat force_closed. Izinkan melanjutkan pengerjaan.
              setResumedResult(res);
              studentWithId = { ...student, resultId: res.id };
          } else {
              setCurrentExam(exam);
              setCurrentStudent({ ...student, resultId: res.id });
              setStudentResult(res);
              setView('STUDENT_RESULT');
              return;
          }
      }
      
      if (res && res.status === 'in_progress' && !isPreview) {
        setResumedResult(res);
        studentWithId = { ...student, resultId: res.id };
      } else if (!isPreview) {
        // Initial creation
        const newRes = await storageService.submitExamResult({
          student,
          examCode,
          answers: { _startTime: Date.now().toString() },
          score: 0,
          totalQuestions: exam.questions.length,
          correctAnswers: 0,
          status: 'in_progress',
          timestamp: Date.now()
        });
        // Capture the new ID
        studentWithId = { ...student, resultId: newRes.id as number };
        setResumedResult(newRes as unknown as Result);
      }
      
      setCurrentExam(exam);
      setCurrentStudent(studentWithId);
      setView('STUDENT_EXAM');

      try {
        localStorage.setItem(
          'ujiancerdas_active_exam_session',
          JSON.stringify({
            examCode,
            student: studentWithId,
            isPreview,
            savedAt: Date.now(),
          })
        );
        sessionStorage.setItem('is_exam_in_progress', 'true');
      } catch {
        // ignore storage errors
      }
    } catch (err: unknown) {
        const error = err as Error;
        if (error.message === 'EXAM_IS_DRAFT') {
            alert("Ujian ini masih berupa draf.");
        } else {
            console.error(error);
            alert("Gagal memuat ujian. Periksa koneksi internet Anda.");
        }
    } finally { setIsSyncing(false); }
  }, []);

  // Session check & automatic recovery on reload (iPhone/mobile crash protection)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const pathname = window.location.pathname;
        const search = window.location.search;
        const hasDirectRoute =
          pathname.startsWith('/result/') ||
          search.includes('collab_') ||
          search.includes('proctor=') ||
          search.includes('preview=') ||
          search.includes('join=') ||
          search.includes('invite=') ||
          search.includes('live=');

        const profile = await storageService.getCurrentUser();
        if (profile) {
          setTeacherProfile(profile);
          if (!isProfileComplete(profile)) {
            setShowProfileCompletion(true);
          }
          if (!hasDirectRoute) {
            setView('TEACHER_DASHBOARD');
            return;
          }
        }

        // Auto-restore student session if page was reloaded or crashed on mobile/iPhone
        if (!hasDirectRoute) {
          try {
            const savedSessionRaw = localStorage.getItem('ujiancerdas_active_exam_session');
            if (savedSessionRaw) {
              const savedSession = JSON.parse(savedSessionRaw);
              const isRecent =
                savedSession?.savedAt &&
                Date.now() - savedSession.savedAt < 24 * 3600 * 1000;

              if (savedSession && savedSession.examCode && savedSession.student && isRecent) {
                await handleStudentLoginSuccess(
                  savedSession.examCode,
                  savedSession.student,
                  !!savedSession.isPreview
                );
                return;
              } else {
                localStorage.removeItem('ujiancerdas_active_exam_session');
                sessionStorage.removeItem('is_exam_in_progress');
              }
            }
          } catch (restoreErr) {
            console.error("Auto restore student session error:", restoreErr);
          }
        }
      } catch (e) {
        console.error("Session check failed", e);
      } finally {
        setIsLoadingSession(false);
      }
    };

    checkSession();
  }, [handleStudentLoginSuccess]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pathname = window.location.pathname;

    // RESULT PAGE DIRECT LINK CHECK (/result/:examCode/:studentId)
    if (pathname.startsWith('/result/')) {
        const parts = pathname.split('/');
        if (parts.length >= 4) {
            const examCode = parts[2].trim().toUpperCase();
            let studentId = decodeURIComponent(parts[3]);
            if (window.location.hash) {
                studentId += decodeURIComponent(window.location.hash);
            }
            
            setIsSyncing(true);
            storageService.getExamForStudent(examCode, studentId, true)
                .then(async (exam) => {
                    if (exam) {
                        const res = await storageService.getStudentResult(examCode, studentId);
                        if (res) {
                            setCurrentExam(exam);
                            setStudentResult(res);
                            setView('STUDENT_RESULT');
                        } else {
                            setView('RESULT_NOT_FOUND');
                            window.history.replaceState({}, '', '/');
                        }
                    } else {
                        setView('RESULT_NOT_FOUND');
                        window.history.replaceState({}, '', '/');
                    }
                })
                .catch(e => {
                    console.error(e);
                    setView('RESULT_NOT_FOUND');
                    window.history.replaceState({}, '', '/');
                })
                .finally(() => setIsSyncing(false));
            return;
        }
    }
    
    // COLLABORATOR / PROCTOR / PUBLIC LIVE MONITOR CHECK
    const collabCode = params.get('collab_code') || params.get('proctor');
    const collabToken = params.get('collab_token') || params.get('token') || params.get('proctorToken');
    
    if (collabCode && collabToken) {
        setIsSyncing(true);
        const cleanCollabCode = collabCode.trim().toUpperCase();
        storageService.getExamByCollaboratorToken(cleanCollabCode, collabToken)
            .then(data => {
                if (data) {
                    if (data.role === 'viewer') {
                        // Supervisor live monitor view (has proctor action permissions)
                        setCurrentExam(data.exam);
                        setIsMonitorProctor(true);
                        setView('LIVE_MONITOR');
                    } else if (data.role === 'public') {
                        // Public/Parent live stream view (strict read-only, no proctor actions)
                        setCurrentExam(data.exam);
                        setIsMonitorProctor(false);
                        setView('LIVE_MONITOR');
                    } else {
                        setCollaboratorData({ ...data, token: collabToken });
                        setView('COLLABORATOR_MODE');
                    }
                    window.history.replaceState({}, document.title, window.location.pathname);
                } else {
                    alert("Tautan pengawas atau publik tidak valid atau akses telah dinonaktifkan.");
                    window.history.replaceState({}, '', '/');
                }
            })
            .catch(e => {
                console.error(e);
                alert("Gagal memuat sesi pantauan ujian.");
                window.history.replaceState({}, '', '/');
            })
            .finally(() => setIsSyncing(false));
        return;
    }

    const previewCode = params.get('preview');
    if (previewCode) {
        const dummyStudent: Student = {
            fullName: 'Mode Pratinjau',
            class: 'PREVIEW',
            absentNumber: '00',
            studentId: `Mode Pratinjau-PREVIEW-00-${Date.now()}`
        };
        handleStudentLoginSuccess(previewCode.trim().toUpperCase(), dummyStudent, true);
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }

    const joinCode = params.get('join') || params.get('invite');
    if (joinCode) {
        const code = joinCode.trim().toUpperCase();
        // Check schedule before showing login
        storageService.getExamForStudent(code, 'check_schedule', true)
            .then(exam => {
                if (exam) {
                    const mode = exam.config.examMode || 'UJIAN';
                    
                    if (mode === 'UJIAN') {
                        const access = calculateStudentAccess(exam.config, undefined, new Date());
                        if (access.status === 'NOT_STARTED_GLOBAL') {
                            setInvitationExam(exam);
                            setPrefillCode(code);
                            setView('STUDENT_LOGIN');
                        } else {
                            setPrefillCode(code);
                            setView('STUDENT_LOGIN');
                        }
                    } else {
                        // PR Mode: Direct Login
                        setPrefillCode(code);
                        setView('STUDENT_LOGIN');
                    }
                } else {
                    setPrefillCode(code);
                    setView('STUDENT_LOGIN');
                }
            })
            .catch(() => {
                // Fallback on error (Network or Not Found)
                // Still prefill to let user try manually or see error in login form
                setPrefillCode(code);
                setView('STUDENT_LOGIN');
            });
            
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }

    const liveCode = params.get('live');
    if (liveCode) {
        alert("Akses pantauan langsung memerlukan tautan resmi ber-token dari guru atau pengawas.");
        window.history.replaceState({}, '', '/');
        return;
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

  const handleExamSubmit = async (answers: Record<string, string>, timeLeft: number, status: ResultStatus = 'completed', activityLog: string[] = [], location?: string, grading?: unknown) => {
    if (!currentExam || !currentStudent) return;
    
    if (currentStudent.class === 'PREVIEW') {
        alert("Mode Pratinjau selesai.");
        resetToHome();
        return;
    }

    if (status === 'completed' || status === 'force_closed') setIsSyncing(true);
    
    // Add additional safety to ensure duration and telemetry are populated
    const finalAnswers = { ...answers };
    if (status === 'completed' || status === 'force_closed') {
      if (finalAnswers['_startTime']) {
        const startTime = parseInt(finalAnswers['_startTime']);
        if (!isNaN(startTime)) {
          const seconds = Math.floor((Date.now() - startTime) / 1000);
          finalAnswers['_duration'] = Math.max(0, seconds).toString();
        }
      }

      if (!finalAnswers['_bandwidthBytes']) {
        try {
          finalAnswers['_bandwidthBytes'] = measureClientBandwidthBytes().toString();
        } catch { /* ignore */ }
      }
      if (!finalAnswers['_os']) {
        try {
          const dev = detectClientDevice();
          finalAnswers['_os'] = dev.os;
          finalAnswers['_device'] = dev.deviceType;
          finalAnswers['_browser'] = dev.browser;
        } catch { /* ignore */ }
      }
      if (!finalAnswers['_tabSwitches'] && activityLog) {
        finalAnswers['_tabSwitches'] = countIntegrityViolations(activityLog).toString();
      }
      if (!finalAnswers['_submissionHour']) {
        finalAnswers['_submissionHour'] = new Date().getHours().toString();
      }
    }

    const res = await storageService.submitExamResult({
        student: currentStudent,
        examCode: currentExam.code,
        answers: finalAnswers,
        score: typeof (grading as {score?: number})?.score === 'number' ? (grading as {score: number}).score : 0,
        totalQuestions: (grading as {totalQuestions?: number})?.totalQuestions || currentExam.questions.length,
        correctAnswers: (grading as {correctAnswers?: number})?.correctAnswers || 0,
        status, 
        activityLog, 
        location, 
        timestamp: Date.now()
    });
    
    if (status === 'completed' || status === 'force_closed') {
        // Clear active session storage upon completion
        if (status === 'completed') {
          try {
            localStorage.removeItem('ujiancerdas_active_exam_session');
            sessionStorage.removeItem('is_exam_in_progress');
          } catch {
            // ignore
          }
        }

        // RE-FETCH EXAM: Ensure we have the full exam with answers if showResultToStudent is true
        // This is necessary because the initial fetch at login might have stripped answers
        const updatedExam = await storageService.getExamForStudent(currentExam.code, currentStudent.studentId, false);
        if (updatedExam) setCurrentExam(updatedExam);
        
        setStudentResult(res as unknown as Result);
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
    try {
      localStorage.removeItem('ujiancerdas_active_exam_session');
      sessionStorage.removeItem('is_exam_in_progress');
    } catch {
      // ignore
    }
    setView('SELECTOR'); 
    setCurrentExam(null); 
    setInvitationExam(null);
    setIsInviteOpen(false);
    setCurrentStudent(null); 
    setStudentResult(null); 
    setResumedResult(null);
    setTeacherProfile(null);
    setPrefillCode('');
    setCollaboratorData(null);
    // FIX: Clear shared state to prevent data leakage/ghosting between sessions
    setExams({});
    setResults([]);
    window.history.replaceState({}, '', '/');
  };

  const exitPreviewToDashboard = useCallback(async () => {
    try {
      localStorage.removeItem('ujiancerdas_active_exam_session');
      sessionStorage.removeItem('is_exam_in_progress');
    } catch {
      // ignore
    }
    setCurrentExam(null);
    setCurrentStudent(null);
    setStudentResult(null);
    setResumedResult(null);
    window.history.replaceState({}, document.title, '/');

    let profile = teacherProfile;
    if (!profile) {
      try {
        profile = await storageService.getCurrentUser();
        if (profile) setTeacherProfile(profile);
      } catch {
        // ignore
      }
    }

    if (profile) {
      setView('TEACHER_DASHBOARD');
    } else {
      setView('SELECTOR');
    }
  }, [teacherProfile]);

  const handleLogout = async () => {
    // Immediate state clear to prevent flash
    resetToHome();
    try {
        await storageService.signOut();
    } catch(e) {
        console.error("Sign out error", e);
    }
  };

  // Loading Fallback Component for Suspense
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

  // Common Theme Toggle Button
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
    <div className={`min-h-screen bg-[#FAFAFA] dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans selection:bg-indigo-100 selection:text-indigo-800 overflow-x-hidden antialiased flex flex-col transition-colors duration-300 ${view === 'SELECTOR' ? 'h-[100dvh] max-h-[100dvh] overflow-hidden' : ''}`}>
        
        {/* Status Jaringan Minimalis & Elegan untuk Halaman Non-Selector */}
        {view !== 'SELECTOR' && (
            <div className="fixed top-6 right-6 z-[100] pointer-events-none flex flex-col gap-2 items-end">
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
        )}
        
        {/* Halaman Awal / Selector: Pas Satu Layar Penuh Tanpa Scroll Vertikal & Horizontal */}
        {view === 'SELECTOR' && (
            <div className="h-[100dvh] max-h-[100dvh] w-full max-w-full flex flex-col justify-between relative overflow-hidden select-none">
                {/* Background Decor Terisolasi */}
                <div className="absolute inset-0 z-0 opacity-40 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-100 dark:bg-slate-800 blur-[100px]"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-50 dark:bg-slate-800 blur-[100px]"></div>
                </div>

                {/* Tombol Melayang Pojok Kiri Atas (Tidak memakan tinggi alur dokumen) */}
                <div className="absolute top-3.5 sm:top-5 left-3.5 sm:left-6 z-20">
                    <button
                        onClick={() => setIsInviteOpen(true)}
                        className="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-md shadow-slate-200/50 dark:shadow-none border border-slate-200/60 dark:border-slate-700 backdrop-blur-sm group active:scale-95"
                        title="Bagikan Aplikasi"
                    >
                        <QrCodeIcon className="w-4 h-4 group-hover:scale-110 transition-transform shrink-0" />
                        <span className="text-xs font-bold uppercase tracking-wider">Bagikan App</span>
                    </button>
                </div>

                {/* Tombol Melayang Pojok Kanan Atas (Theme Toggle & Status Jaringan) */}
                <div className="absolute top-3.5 sm:top-5 right-3.5 sm:right-6 z-20 flex items-center gap-2">
                    {!isOnline && (
                        <div className="bg-rose-500/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wide shadow-md flex items-center gap-1.5 animate-bounce ring-1 ring-white/20">
                            <NoWifiIcon className="w-3.5 h-3.5" />
                            <span>Offline</span>
                        </div>
                    )}

                    {isSyncing && isOnline && (
                        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wide shadow-md border border-indigo-50 dark:border-slate-700 flex items-center gap-1.5">
                            <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="hidden sm:inline">Menyimpan...</span>
                        </div>
                    )}

                    <ThemeToggle />
                </div>

                {/* Alur Konten Utama: Jarak atas dihitung langsung dari batas atas layar ke ikon UjianCerdas */}
                <main className="flex-1 w-full max-w-sm mx-auto px-4 sm:px-6 flex flex-col items-center justify-center pt-6 sm:pt-8 md:pt-10 z-10 min-h-0">
                    <div className="text-center mb-5 sm:mb-6 shrink-0">
                        <div className="inline-flex p-3 sm:p-3.5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm mb-2.5 sm:mb-3 border border-slate-50 dark:border-slate-700 ring-1 ring-slate-100 dark:ring-slate-800">
                            <LogoIcon className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-1 sm:mb-1.5">
                            UjianCerdas
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium leading-relaxed">
                            Platform evaluasi modern.<br/>Ringan, Cepat, Terpercaya.
                        </p>
                    </div>
                    
                    <div className="w-full space-y-2.5 sm:space-y-3 shrink-0">
                        <button 
                            onClick={() => setView('STUDENT_LOGIN')} 
                            className="w-full group relative overflow-hidden bg-slate-900 dark:bg-indigo-600 text-white p-3.5 sm:p-4 rounded-xl shadow-lg shadow-slate-200 dark:shadow-none transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <div className="relative z-10 flex items-center justify-center gap-3">
                                <span className="font-bold text-sm tracking-wide">Masuk sebagai Siswa</span>
                                <ArrowLeftIcon className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform opacity-70" />
                            </div>
                        </button>

                        <button 
                            onClick={() => setView('TEACHER_LOGIN')} 
                            className="w-full flex items-center justify-center gap-2 p-3.5 sm:p-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-xl border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all duration-300 font-bold text-sm shadow-xs hover:shadow-md active:scale-[0.98]"
                        >
                            <UserIcon className="w-4 h-4" />
                            Area Pengajar
                        </button>

                        <button 
                            onClick={() => setView('TUTORIAL')} 
                            className="w-full flex items-center justify-center gap-2 p-3.5 sm:p-4 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-xl border border-teal-100 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-all duration-300 font-bold text-sm shadow-xs hover:shadow-md active:scale-[0.98]"
                        >
                            <BookOpenIcon className="w-4 h-4" />
                            Panduan & Fitur
                        </button>
                    </div>
                </main>

                {/* Footer Teks HAKI: Jarak bawah dihitung langsung dari tombol panduan & fitur menuju teks HAKI yang menempel di batas paling bawah layar */}
                <footer className="w-full max-w-full px-4 pt-2 pb-3 sm:pb-4 z-10 shrink-0">
                    <p className="text-center text-[10px] sm:text-[11px] font-medium text-slate-400 dark:text-slate-500 tracking-wide select-none leading-relaxed">
                        © {new Date().getFullYear()} I Made Hermawan Surya Putra · Hak Cipta Dilindungi
                    </p>
                </footer>
            </div>
        )}

        {view === 'TEACHER_LOGIN' && (
            <TeacherLogin 
                onLoginSuccess={(p) => { 
                    setTeacherProfile(p); 
                    if (!isProfileComplete(p)) {
                        setShowProfileCompletion(true);
                    }
                    setView('TEACHER_DASHBOARD'); 
                }} 
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
                    key={teacherProfile.id} /* FIX: Force remount to prevent ghosting */
                    teacherProfile={teacherProfile} 
                    exams={exams} 
                    results={results}
                    isDarkMode={darkMode}
                    toggleTheme={toggleTheme}
                    addExam={async (e) => { 
                        const examWithAuthor: Exam = { ...e, authorId: teacherProfile.id, authorSchool: teacherProfile.school };
                        // Optimistic UI update: immediately add to state so tabs show it with zero delay
                        setExams((prev) => ({ ...prev, [examWithAuthor.code]: examWithAuthor }));
                        try {
                            await storageService.saveExam(examWithAuthor); 
                        } catch (err) {
                            console.error("Gagal simpan ujian ke database, data aman di lokal:", err);
                        }
                        await refreshExams(); 
                    }}
                    updateExam={async (e) => { 
                        const examWithAuthor: Exam = { ...e, authorId: teacherProfile.id, authorSchool: teacherProfile.school };
                        // Optimistic UI update: immediately reflect changes
                        setExams((prev) => ({ ...prev, [examWithAuthor.code]: examWithAuthor }));
                        try {
                            await storageService.saveExam(examWithAuthor); 
                        } catch (err) {
                            console.error("Gagal perbarui ujian ke database, data aman di lokal:", err);
                        }
                        await refreshExams(); 
                    }}
                    deleteExam={async (c) => { 
                        setExams((prev) => {
                            const updated = { ...prev };
                            delete updated[c];
                            return updated;
                        });
                        try {
                            await storageService.deleteExam(c); 
                        } catch (err) {
                            console.error("Gagal menghapus ujian di server:", err);
                        }
                        await refreshExams(); 
                    }}
                    onLogout={handleLogout}
                    onRefreshExams={refreshExams}
                    onRefreshResults={refreshResults}

                />
            </Suspense>
        )}
        
        {view === 'STUDENT_EXAM' && currentExam && currentStudent && (
            <StudentExamPage 
                exam={currentExam} 
                student={currentStudent} 
                initialData={resumedResult}
                onSubmit={handleExamSubmit}
                onBack={currentStudent.class === 'PREVIEW' ? exitPreviewToDashboard : resetToHome}
                isDarkMode={darkMode}
                toggleTheme={toggleTheme}
            />
        )}
        
        {view === 'RESULT_NOT_FOUND' && (
        <ResultNotFoundPage 
          onBack={() => setView('SELECTOR')}
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
                onExamFinished={() => resetToHome()}
                isReadOnly={!isMonitorProctor}
                isProctor={isMonitorProctor}
            />
        )}

        {view === 'COLLABORATOR_MODE' && collaboratorData && (
            <CollaboratorView 
                exam={collaboratorData.exam}
                role={collaboratorData.role}
                token={collaboratorData.token}
                onExit={resetToHome}
                isDarkMode={darkMode}
                toggleTheme={toggleTheme}
            />
        )}

        {/* Global & Specific Invitation Modal */}
        <InvitationModal 
            isOpen={isInviteOpen || !!invitationExam} 
            onClose={() => {
                setIsInviteOpen(false);
                setInvitationExam(null);
            }} 
            exam={invitationExam}
            teacherName={invitationExam?.authorName || teacherProfile?.name}
            schoolName={invitationExam?.authorSchool || teacherProfile?.school}
            onJoin={(code) => {
                setInvitationExam(null);
                setIsInviteOpen(false);
                setPrefillCode(code);
                setView('STUDENT_LOGIN');
            }}
        />

        {/* Profile Completion Modal */}
        {showProfileCompletion && teacherProfile && (
            <ProfileCompletionModal 
                profile={teacherProfile}
                onComplete={(updated) => {
                    setTeacherProfile(updated);
                    setShowProfileCompletion(false);
                }}
            />
        )}

        {/* Legal Pages */}
        {view === 'TERMS' && (
            <TermsPage onBack={() => setView(previousView)} />
        )}

        {view === 'PRIVACY' && (
            <PrivacyPage onBack={() => setView(previousView)} />
        )}

        {/* Tutorial Page */}
        {view === 'TUTORIAL' && (
            <TutorialPage onBack={() => setView('SELECTOR')} />
        )}
    </div>
  );
};
 
export default App;
