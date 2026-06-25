import { useState, useEffect, useRef, useCallback } from 'react';
import type { Exam, Student, Result, ResultStatus } from '../types';
import { storageService } from '../services/storage';

interface UseExamAntiCheatProps {
    student: Student;
    exam: Exam;
    initialData?: Result | null;
    storageKey: string;
    answersRef: React.MutableRefObject<Record<string, string>>;
    logRef: React.MutableRefObject<string[]>;
    timeLeftRef: React.MutableRefObject<number>;
    onForceSubmit: (isAuto: boolean, status: ResultStatus) => void;
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
    isSubmitting,
}: UseExamAntiCheatProps) => {
    const isSubmittingRef = useRef(isSubmitting);
    const [timeLeft, setTimeLeft] = useState(0);
    const [deadline, setDeadline] = useState<number>(0);

    // Keep dynamic isSubmitting status synchronized in real-time ref
    useEffect(() => {
        isSubmittingRef.current = isSubmitting;
    }, [isSubmitting]);

    // Helper to log violation events
    const addViolationLog = useCallback((reason: string) => {
        const timestamp = new Date().toLocaleTimeString();
        logRef.current.push(`[${timestamp}] Pelanggaran: ${reason}`);
        storageService.saveLocalProgress(storageKey, {
            answers: answersRef.current,
            logs: logRef.current,
        });
    }, [storageKey, answersRef, logRef]);

    // Calculate dynamic deadline (durations and exact dates limits)
    useEffect(() => {
        let calculatedDeadline: number;

        if (student.class === 'PREVIEW') {
            const mode = exam.config.examMode || 'UJIAN';
            const timeLimitMs = mode === 'PR' ? 0 : (exam.config.timeLimit || 0) * 60 * 1000;
            calculatedDeadline = timeLimitMs > 0 ? Date.now() + timeLimitMs : Infinity;
        } else {
            const mode = exam.config.examMode || 'UJIAN';
            const storedStartTime = initialData?.answers?._startTime ? parseInt(initialData.answers._startTime) : null;
            const actualStartTime = storedStartTime || initialData?.timestamp || Date.now();
            const timeLimitMs = mode === 'PR' ? 0 : (exam.config.timeLimit || 0) * 60 * 1000;

            const getLocalDateStr = (raw: string) => {
                if (!raw) return '';
                if (raw.includes('T')) {
                    const d = new Date(raw);
                    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-CA');
                }
                return raw;
            };

            const endDateStr = getLocalDateStr(exam.config.endDate || exam.config.date);
            const endTimeStr = mode === 'PR' ? '23:59' : (exam.config.endTime || '23:59');

            let absoluteExamEndTime: number;
            if (exam.config.endDate && exam.config.endDate.includes('T')) {
                absoluteExamEndTime = new Date(exam.config.endDate).getTime();
            } else {
                absoluteExamEndTime = new Date(`${endDateStr}T${endTimeStr}:59`).getTime();
            }

            if (isNaN(absoluteExamEndTime)) {
                absoluteExamEndTime = Infinity;
            }

            if (timeLimitMs > 0) {
                calculatedDeadline = Math.min(actualStartTime + timeLimitMs, absoluteExamEndTime);
            } else {
                calculatedDeadline = absoluteExamEndTime;
            }
        }

        // Defer state update to avoid synchronous cascading renders detection during effects
        const timeoutId = setTimeout(() => {
            setDeadline(calculatedDeadline);
        }, 0);

        return () => clearTimeout(timeoutId);
    }, [exam.config, student.class, initialData?.timestamp, initialData?.answers?._startTime]);

    // Setup active timers/clocks
    useEffect(() => {
        if (deadline === 0) return;

        const tick = () => {
            if (deadline === Infinity) {
                setTimeLeft(Infinity);
                timeLeftRef.current = Infinity;
                return;
            }
            const now = Date.now();
            const diff = Math.max(0, Math.floor((deadline - now) / 1000));
            setTimeLeft(diff);
            timeLeftRef.current = diff;

            if (diff <= 0 && student.class !== 'PREVIEW' && !isSubmittingRef.current) {
                onForceSubmit(true, 'completed');
            }
        };

        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [deadline, onForceSubmit, student.class, timeLeftRef]);

    // Handle Active Anti-Cheat (Meninggalkan Halaman / Buka Tab Baru / Keluar Halaman)
    useEffect(() => {
        if (student.class === 'PREVIEW' || !exam.config.detectBehavior || exam.config.examMode === 'PR') return;

        const handleViolation = (type: 'soft' | 'hard', reason: string) => {
            if (isSubmittingRef.current) return;

            const timestamp = new Date().toLocaleTimeString();
            logRef.current.push(`[${timestamp}] Pelanggaran: ${reason}`);
            storageService.saveLocalProgress(storageKey, {
                answers: answersRef.current,
                logs: logRef.current,
            });

            if (exam.config.continueWithPermission) {
                alert("PELANGGARAN TERDETEKSI: Sesi dikunci.");
                onForceSubmit(true, 'force_closed');
                return;
            }

            if (type === 'hard') {
                // Warning visual activity is documented in logRef
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden && !isSubmittingRef.current) {
                handleViolation('hard', 'Meninggalkan halaman');
            }
        };

        const handleBlur = () => {
            if (!isSubmittingRef.current) {
                handleViolation('soft', 'Kehilangan fokus (membuka aplikasi lain/tab baru)');
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
        };
    }, [exam.config, student.class, onForceSubmit, storageKey, answersRef, logRef]);

    // Handle Exam Force Stopped by Teacher
    useEffect(() => {
        if (exam.config.isFinished && student.class !== 'PREVIEW' && !isSubmittingRef.current) {
            alert("Ujian telah dihentikan oleh Guru. Jawaban Anda akan dikumpulkan otomatis.");
            onForceSubmit(true, 'completed');
        }
    }, [exam.config.isFinished, onForceSubmit, student.class]);

    return {
        timeLeft,
        addViolationLog,
    };
};
