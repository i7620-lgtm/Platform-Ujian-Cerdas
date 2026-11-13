import { useState, useEffect, useRef, useCallback } from 'react';
import type { Exam, Student, Result, ResultStatus } from '../types';
import { storageService } from '../services/storage';
import { normalizeDateString, toAbsoluteUtcTimestamp } from '../utils/timezoneUtils';

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

        const mode = (exam.config.examMode || 'UJIAN').trim().toUpperCase();
        const isPR = mode === 'PR';

        if (student.class === 'PREVIEW') {
            const timeLimitMs = isPR ? 0 : (exam.config.timeLimit || 0) * 60 * 1000;
            calculatedDeadline = timeLimitMs > 0 ? Date.now() + timeLimitMs : Infinity;
        } else {
            const storedStartTime = initialData?.answers?._startTime ? parseInt(initialData.answers._startTime) : null;
            const actualStartTime = storedStartTime || initialData?.timestamp || Date.now();
            const timeLimitMs = isPR ? 0 : (exam.config.timeLimit || 0) * 60 * 1000;

            const examTz = exam.config.timezone || 'WIB';
            const rawEndDate = exam.config.endDate || exam.config.date;
            const endTimeStr = exam.config.endTime || '23:59';

            let absoluteExamEndTime: number;
            if (rawEndDate && rawEndDate.includes('T')) {
                absoluteExamEndTime = new Date(rawEndDate).getTime();
            } else if (rawEndDate) {
                absoluteExamEndTime = toAbsoluteUtcTimestamp(normalizeDateString(rawEndDate), endTimeStr, examTz, true);
            } else {
                absoluteExamEndTime = Infinity;
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
                // Pada mode PR, jangan auto-submit paksa saat deadline berakhir,
                // biarkan siswa mengumpulkan, namun sistem login telah diblokir untuk pengerjaan baru.
                const mode = (exam.config.examMode || 'UJIAN').trim().toUpperCase();
                if (mode !== 'PR') {
                    onForceSubmit(true, 'completed');
                }
            }
        };

        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [deadline, onForceSubmit, student.class, timeLeftRef, exam.config.examMode]);

    // Handle Active Anti-Cheat (Meninggalkan Halaman / Buka Tab Baru / Keluar Halaman)
    useEffect(() => {
        const isPR = (exam.config.examMode || '').trim().toUpperCase() === 'PR';
        if (student.class === 'PREVIEW' || !exam.config.detectBehavior || isPR) return;

        let blurTimeout: ReturnType<typeof setTimeout> | null = null;
        let notifLockTimeout: ReturnType<typeof setTimeout> | null = null;

        const handleViolation = (type: 'soft' | 'hard', reason: string) => {
            const currentIsPR = (exam.config.examMode || '').trim().toUpperCase() === 'PR';
            if (isSubmittingRef.current || currentIsPR) return;

            const timestamp = new Date().toLocaleTimeString();
            logRef.current.push(`[${timestamp}] Pelanggaran: ${reason}`);
            storageService.saveLocalProgress(storageKey, {
                answers: answersRef.current,
                logs: logRef.current,
            });

            // Hanya kunci sesi jika merupakan pelanggaran 'hard' (terbukti meninggalkan aplikasi/tab atau buka notifikasi > 5 detik)
            if (type === 'hard' && exam.config.continueWithPermission) {
                onForceSubmit(true, 'force_closed');
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden && !isSubmittingRef.current) {
                // Konfirmasi pasti bahwa aplikasi ditinggalkan / diminimalkan
                handleViolation('hard', 'Meninggalkan halaman / beralih aplikasi');
            }
        };

        const handleBlur = () => {
            if (isSubmittingRef.current) return;

            // 1. Deteksi apakah kehilangan fokus dipicu oleh elemen input / keyboard virtual mobile
            const activeEl = document.activeElement;
            const isTypingField =
                activeEl &&
                (activeEl.tagName === 'INPUT' ||
                 activeEl.tagName === 'TEXTAREA' ||
                 activeEl.tagName === 'SELECT' ||
                 (activeEl as HTMLElement).isContentEditable);

            if (isTypingField) {
                // Aktivitas pengetikan normal siswa di ponsel/iPhone, abaikan
                return;
            }

            // 2. Berikan toleransi waktu 1500ms untuk pencatatan log awal jika kehilangan fokus
            if (blurTimeout) clearTimeout(blurTimeout);
            blurTimeout = setTimeout(() => {
                if (document.hidden && !isSubmittingRef.current) {
                    handleViolation('hard', 'Meninggalkan halaman ujian');
                } else if (!document.hasFocus() && !isSubmittingRef.current) {
                    handleViolation('soft', 'Kehilangan fokus sementara / notifikasi');
                }
            }, 1500);

            // 3. Batas toleransi 5 detik (5000ms): Jika siswa tetap melihat notifikasi / tidak kembali fokus selama > 5 detik,
            // dan guru mengaktifkan 'Kunci Akses Jika Melanggar' (continueWithPermission), kunci aplikasi secara otomatis
            if (notifLockTimeout) clearTimeout(notifLockTimeout);
            notifLockTimeout = setTimeout(() => {
                if (!isSubmittingRef.current && (!document.hasFocus() || document.hidden)) {
                    handleViolation('hard', 'Melihat notifikasi / kehilangan fokus lebih dari 5 detik');
                }
            }, 5000);
        };

        const handleFocus = () => {
            // Batalkan kedua timer jika pengguna kembali fokus sebelum batas waktu
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
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);

        return () => {
            if (blurTimeout) clearTimeout(blurTimeout);
            if (notifLockTimeout) clearTimeout(notifLockTimeout);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
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
