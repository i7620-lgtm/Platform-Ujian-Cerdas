import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Trash2,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface AudioPlayerProps {
  src?: string;
  script?: string;
  title?: string;
  onDelete?: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  script,
  title,
  onDelete,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showScript, setShowScript] = useState(false);

  // Web Speech API state for listeningScript
  const isSpeechMode = (!src || src.trim() === "") && Boolean(script && script.trim());
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Standard HTML Audio event listeners
  useEffect(() => {
    if (isSpeechMode) return;
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration) {
        setCurrentTime(audio.currentTime);
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    const handleEnded = () => setIsPlaying(false);
    const handleLoadedMetadata = () => setDuration(audio.duration);

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [src, isSpeechMode]);

  // Clean up speech synthesis when unmounted or script changes
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [script]);

  const togglePlay = () => {
    if (isSpeechMode) {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        alert("Browser Anda tidak mendukung pemutaran suara Web Speech.");
        return;
      }

      if (isPlaying) {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
      } else {
        window.speechSynthesis.cancel(); // Reset any existing speech
        const cleanScript = (script || "").trim();
        const utterance = new SpeechSynthesisUtterance(cleanScript);

        // Detect language based on simple word heuristics
        const englishKeywords = /\b(the|is|are|you|what|where|how|listen|conversation|speaker|excuse|hello|please|thank)\b/i;
        const isEnglish = englishKeywords.test(cleanScript);
        utterance.lang = isEnglish ? "en-US" : "id-ID";
        utterance.rate = 0.95; // Sedikit lebih lambat agar mudah disimak murid
        utterance.pitch = 1.0;

        utterance.onstart = () => setIsPlaying(true);
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      }
    } else if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleReset = () => {
    if (isSpeechMode) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
    } else if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      setProgress(0);
      setIsPlaying(false);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  if (!src && !script) return null;

  return (
    <div className="bg-slate-50 dark:bg-slate-900/90 border border-indigo-100 dark:border-indigo-950/60 rounded-2xl p-3.5 shadow-sm w-full max-w-xl transition-all">
      {!isSpeechMode && src && <audio ref={audioRef} src={src} className="hidden" />}

      {/* Header bar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Volume2 className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {title || (isSpeechMode ? "Stimulus Audio Listening (Suara Narasi)" : "Stimulus Audio Soal")}
          </span>
          {isSpeechMode && (
            <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Text-to-Speech
            </span>
          )}
        </div>

        {script && (
          <button
            type="button"
            onClick={() => setShowScript(!showScript)}
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <FileText className="w-3 h-3" />
            <span>{showScript ? "Tutup Naskah" : "Lihat Naskah"}</span>
            {showScript ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* Controls and Track */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold transition-all shadow-sm shrink-0 ${
            isPlaying
              ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200 dark:shadow-none"
              : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-none"
          }`}
          title={isPlaying ? "Jeda Audio" : "Putar Audio"}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors shrink-0"
          title="Ulangi dari awal"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
            {isSpeechMode ? (
              <>
                <span className="flex items-center gap-1">
                  {isPlaying ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Sedang memutar suara...
                    </span>
                  ) : (
                    "Klik putar untuk mendengarkan"
                  )}
                </span>
                <span>Otomatis</span>
              </>
            ) : (
              <>
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </>
            )}
          </div>

          <div
            className={`h-2.5 rounded-full overflow-hidden relative ${
              isSpeechMode
                ? "bg-slate-200 dark:bg-slate-800"
                : "bg-slate-200 dark:bg-slate-700 cursor-pointer"
            }`}
            onClick={(e) => {
              if (!isSpeechMode && audioRef.current && audioRef.current.duration) {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                audioRef.current.currentTime = pos * audioRef.current.duration;
              }
            }}
          >
            {isSpeechMode ? (
              <div
                className={`h-full bg-indigo-500 transition-all duration-300 ${
                  isPlaying ? "w-full animate-pulse" : "w-0"
                }`}
              />
            ) : (
              <div
                className="absolute top-0 left-0 h-full bg-indigo-500 transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            )}
          </div>
        </div>

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors shrink-0"
            title="Hapus Audio"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Accordion / Preview Naskah Listening */}
      {showScript && script && (
        <div className="mt-3 p-3 bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-line max-h-48 overflow-y-auto">
          <div className="font-bold text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Naskah Narasi / Dialog:
          </div>
          {script}
        </div>
      )}
    </div>
  );
};
