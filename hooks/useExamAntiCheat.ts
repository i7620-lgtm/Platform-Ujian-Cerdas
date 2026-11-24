import { useState, useEffect, useRef, useCallback } from 'react';
import type { Exam, Student, Result, ResultStatus } from '../types';
import { storageService } from '../services/storage';
import { computeStudentExamDeadline } from '../utils/scheduleUtils';
import { getAntiCheatBlurThresholds } from '../utils/platformUtils';

interface UseExamAntiCheatProps {
    student: Student;
    exam: Exam;
    initialData?: Result | null;
    storageKey: string;
    answersRef: React.MutableRefObject<Record<string, string>>;
    logRef: React.MutableRefObject<string[]>;
    timeLeftRef: React.MutableRefObject<number>;
    onForceSubmit: (isAuto: boolean, status: ResultStatus) => void;
    onTeacherForceStop?: (message: string, status: ResultStatus) => void;
    onBeforeFlush?: () => void;
    isSubmitting: boolean;
}

export const useExamAntiCheat = ({
    student,
    exam,
    initialData,
    storageKey,
    answersRef,
    logRef,
    timeLeftRef,
    onForceSubmit,
    onTeacherForceStop,
    onBeforeFlush,
    isSubmitting,
}: UseExamAntiCheatProps) => {
    const isSubmittingRef = useRef(isSubmitting);
    const [deadline, setDeadline] = useState<number>(0);

    const examConfigRef = useRef(exam.config);
    const onForceSubmitRef = useRef(onForceSubmit);
    const onBeforeFlushRef = useRef(onBeforeFlush);

    useEffect(() => {
        examConfigRef.current = exam.config;
        onForceSubmitRef.current = onForceSubmit;
        onBeforeFlushRef.current = onBeforeFlush;
    }, [exam.config, onForceSubmit, onBeforeFlush]);

    const timeListenersRef = useRef<Set<(seconds: number) => void>>(new Set());

    const getTimeLeft = useCallback(() => timeLeftRef.current, [timeLeftRef]);

    const subscribeTimeLeft = useCallback((listener: (seconds: number) => void) => {
        timeListenersRef.current.add(listener);
        return () => {
            timeListenersRef.current.delete(listener);
        };
    }, []);

    // Keep dynamic isSubmitting status synchronized in real-time ref
    useEffect(() => {
        isSubmittingRef.current = isSubmitting;
    }, [isSubmitting]);

    // Helper to log violation events
    const addViolationLog = useCallback((reason: string) => {
        const timestamp = new Date().toLocaleTimeString();
        logRef.current.push(`[${timestamp}] Pelanggaran: ${reason}`);
        onBeforeFlushRef.current?.();
        storageService.saveLocalProgress(storageKey, {
            answers: answersRef.current,
            logs: logRef.current,
        });
    }, [storageKey, answersRef, logRef]);

    const examMode = exam.config.examMode;
    const timeLimit = exam.config.timeLimit;
    const startDate = exam.config.startDate;
    const endDate = exam.config.endDate;
    const startTime = exam.config.startTime;
    const endTime = exam.config.endTime;
    const timezone = exam.config.timezone;
    const allowOvertime = exam.config.allowOvertime;
    const enableDailyWindow = exam.config.enableDailyWindow;
    const dailyStartTime = exam.config.dailyStartTime;
    const dailyEndTime = exam.config.dailyEndTime;
    const dailySessionsJson = JSON.stringify(exam.config.dailySessions || null);

    // Calculate dynamic deadline (respecting allowOvertime, personal timeLimit, daily session end, and global exam end)
    useEffect(() => {
        const cfg = examConfigRef.current;
        let calculatedDeadline: number;

        const mode = (examMode || 'UJIAN').trim().toUpperCase();
        const isPR = mode === 'PR';

        if (student.class === 'PREVIEW') {
            const timeLimitMs = isPR ? 0 : (timeLimit || 0) * 60 * 1000;
            calculatedDeadline = timeLimitMs > 0 ? Date.now() + timeLimitMs : Infinity;
        } else {
            const storedStartTime = initialData?.answers?._startTime ? parseInt(initialData.answers._startTime) : null;
            const actualStartTime = storedStartTime || initialData?.timestamp || Date.now();
            calculatedDeadline = computeStudentExamDeadline(cfg, student.class, actualStartTime);
        }

        const timeoutId = setTimeout(() => {
            setDeadline(calculatedDeadline);
        }, 0);

        return () => clearTimeout(timeoutId);
    }, [
        examMode,
        timeLimit,
        startDate,
        endDate,
        startTime,
        endTime,
        timezone,
        allowOvertime,
        enableDailyWindow,
        dailyStartTime,
        dailyEndTime,
        dailySessionsJson,
        student.class,
        initialData?.timestamp,
        initialData?.answers?._startTime,
    ]);

    // Setup active timers/clocks without causing parent page re-renders every second
    useEffect(() => {
        if (deadline === 0) return;

        const notifyListeners = (nextValue: number) => {
            timeListenersRef.current.forEach((cb) => {
                try {
                    cb(nextValue);
                } catch {
                    // ignore listener error
                }
            });
        };

        const tick = () => {
            if (deadline === Infinity) {
                if (timeLeftRef.current !== Infinity) {
                    timeLeftRef.current = Infinity;
                    notifyListeners(Infinity);
                }
                return;
            }
            const now = Date.now();
            const diff = Math.max(0, Math.floor((deadline - now) / 1000));
            if (timeLeftRef.current !== diff) {
                timeLeftRef.current = diff;
                notifyListeners(diff);
            }

            if (diff <= 0 && student.class !== 'PREVIEW' && !isSubmittingRef.current) {
                const mode = (examMode || 'UJIAN').trim().toUpperCase();
                if (mode !== 'PR') {
                    onForceSubmitRef.current(true, 'completed');
                }
            }
        };

        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [deadline, student.class, timeLeftRef, examMode]);

    const detectBehavior = Boolean(exam.config.detectBehavior);
    const continueWithPermission = Boolean(exam.config.continueWithPermission);

    // Handle Active Anti-Cheat (Meninggalkan Halaman / Buka Tab Baru / Keluar Halaman)
    useEffect(() => {
        const isPR = (examMode || '').trim().toUpperCase() === 'PR';
        if (student.class === 'PREVIEW' || !detectBehavior || isPR) return;

        const { softLogDelayMs, hardLockDelayMs } = getAntiCheatBlurThresholds();
        let blurTimeout: ReturnType<typeof setTimeout> | null = null;
        let notifLockTimeout: ReturnType<typeof setTimeout> | null = null;

        const handleViolation = (type: 'soft' | 'hard', reason: string) => {
            const currentIsPR = (examMode || '').trim().toUpperCase() === 'PR';
            if (isSubmittingRef.current || currentIsPR) return;

            const timestamp = new Date().toLocaleTimeString();
            logRef.current.push(`[${timestamp}] Pelanggaran: ${reason}`);
            onBeforeFlushRef.current?.();
            storageService.saveLocalProgress(storageKey, {
                answers: answersRef.current,
                logs: logRef.current,
            });

            if (type === 'hard' && continueWithPermission) {
                onForceSubmitRef.current(true, 'force_closed');
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden && !isSubmittingRef.current) {
                handleViolation('hard', 'Meninggalkan halaman / beralih aplikasi');
            }
        };

        const handlePageHide = () => {
            onBeforeFlushRef.current?.();
            storageService.saveLocalProgress(storageKey, {
                answers: answersRef.current,
                logs: logRef.current,
            });
        };

        const handleBlur = () => {
            if (isSubmittingRef.current) return;

            const activeEl = document.activeElement;
            const isTypingField =
                activeEl &&
                (activeEl.tagName === 'INPUT' ||
                 activeEl.tagName === 'TEXTAREA' ||
                 activeEl.tagName === 'SELECT' ||
                 (activeEl as HTMLElement).isContentEditable);

            if (isTypingField) {
                return;
            }

            if (blurTimeout) clearTimeout(blurTimeout);
            blurTimeout = setTimeout(() => {
                if (document.hidden && !isSubmittingRef.current) {
                    handleViolation('hard', 'Meninggalkan halaman ujian');
                } else if (!document.hasFocus() && !isSubmittingRef.current) {
                    handleViolation('soft', 'Kehilangan fokus sementara / notifikasi');
                }
            }, softLogDelayMs);

            if (notifLockTimeout) clearTimeout(notifLockTimeout);
            notifLockTimeout = setTimeout(() => {
                if (!isSubmittingRef.current && (!document.hasFocus() || document.hidden)) {
                    handleViolation(
                        'hard',
                        `Melihat notifikasi / kehilangan fokus lebih dari ${Math.round(hardLockDelayMs / 1000)} detik`,
                    );
                }
            }, hardLockDelayMs);
        };

        const handleFocus = () => {
            if (blurTimeout) {
                clearTimeout(blurTimeout);
                blurTimeout = null;
            }
            if (notifLockTimeout) {
                clearTimeout(notifLockTimeout);
                notifLockTimeout = null;
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', handlePageHide);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);

        return () => {
            if (blurTimeout) clearTimeout(blurTimeout);
            if (notifLockTimeout) clearTimeout(notifLockTimeout);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pagehide', handlePageHide);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
        };
    }, [examMode, detectBehavior, continueWithPermission, student.class, storageKey, answersRef, logRef]);

    // Handle Exam Force Stopped by Teacher
    useEffect(() => {
        if (exam.config.isFinished && student.class !== 'PREVIEW' && !isSubmittingRef.current) {
            const msg = "Ujian telah dihentikan oleh Guru. Jawaban Anda akan dikumpulkan otomatis.";
            if (onTeacherForceStop) {
                onTeacherForceStop(msg, 'completed');
            } else {
                onForceSubmitRef.current(true, 'completed');
            }
        }
    }, [exam.config.isFinished, onTeacherForceStop, student.class]);

    return {
        getTimeLeft,
        subscribeTimeLeft,
        addViolationLog,
    };
};
