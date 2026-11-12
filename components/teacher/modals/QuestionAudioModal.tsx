import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Volume2,
  Upload,
  Type,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Check,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

export interface QuestionAudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAudioUrl?: string;
  initialScript?: string;
  onSave: (data: { audioUrl?: string; listeningScript?: string }) => void;
}

export const QuestionAudioModal: React.FC<QuestionAudioModalProps> = ({
  isOpen,
  onClose,
  initialAudioUrl = "",
  initialScript = "",
  onSave,
}) => {
  const isInitialScriptDefault = Boolean(initialScript && (!initialAudioUrl || initialAudioUrl.trim() === ""));
  const [activeTab, setActiveTab] = useState<"upload" | "tts">(isInitialScriptDefault ? "tts" : "upload");

  // Tab 1: Upload / URL state
  const [audioUrl, setAudioUrl] = useState(initialAudioUrl || "");
  const [uploadFileName, setUploadFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab 2: Text-to-Speech state
  const [script, setScript] = useState(initialScript || "");
  const initialLanguage = (initialScript && /\b(the|is|are|you|what|where|how|listen|conversation|speaker|excuse|hello|please)\b/i.test(initialScript))
    ? "en-US"
    : "id-ID";
  const [language, setLanguage] = useState<"id-ID" | "en-US">(initialLanguage);
  const [speechRate, setSpeechRate] = useState<number>(0.95);
  const [isTestingSpeech, setIsTestingSpeech] = useState(false);

  // Clean up speech synthesis when unmounted
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert("Ukuran berkas audio terlalu besar (maksimal 3MB).");
      return;
    }

    setUploadFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setAudioUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleTestSpeech = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Browser Anda tidak mendukung Web Speech Synthesis.");
      return;
    }

    if (isTestingSpeech) {
      window.speechSynthesis.cancel();
      setIsTestingSpeech(false);
    } else {
      window.speechSynthesis.cancel();
      const textToSpeak = script.trim();
      if (!textToSpeak) {
        alert("Silakan ketik atau tempel naskah teks yang ingin dibacakan terlebih dahulu.");
        return;
      }

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = language;
      utterance.rate = speechRate;
      utterance.pitch = 1.0;

      utterance.onstart = () => setIsTestingSpeech(true);
      utterance.onend = () => setIsTestingSpeech(false);
      utterance.onerror = () => setIsTestingSpeech(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSave = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    if (activeTab === "upload") {
      const cleanUrl = audioUrl.trim();
      if (!cleanUrl) {
        alert("Silakan unggah berkas audio atau masukkan tautan URL audio terlebih dahulu.");
        return;
      }
      onSave({
        audioUrl: cleanUrl,
        listeningScript: undefined,
      });
    } else {
      const cleanScript = script.trim();
      if (!cleanScript) {
        alert("Silakan ketik naskah teks percakapan atau cerita narasi listening terlebih dahulu.");
        return;
      }
      onSave({
        audioUrl: undefined,
        listeningScript: cleanScript,
      });
    }
    onClose();
  };

  const handleRemoveAudio = () => {
    if (window.confirm("Apakah Anda yakin ingin menghapus stimulus audio dari soal ini?")) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      onSave({
        audioUrl: undefined,
        listeningScript: undefined,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800 dark:text-white">
                Kelola Stimulus Audio / Listening
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih sumber berkas audio atau buat audio otomatis dari naskah teks.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800">
          <div className="grid grid-cols-2 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab("upload");
                if (typeof window !== "undefined" && "speechSynthesis" in window) {
                  window.speechSynthesis.cancel();
                  setIsTestingSpeech(false);
                }
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "upload"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Unggah Berkas / URL Audio</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("tts");
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "tts"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Buat dari Teks (Suara Otomatis)</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === "upload" ? (
            <div className="space-y-4">
              {/* File upload box */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Unggah Berkas Audio Lokal
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-5 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto mb-2 group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {uploadFileName || "Klik untuk memilih berkas audio (MP3, WAV, OGG, M4A)"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Maksimal 3MB agar pemuatan ujian siswa instan dan responsif.
                  </p>
                </div>
              </div>

              {/* URL input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Atau Masukkan Tautan URL Audio
                </label>
                <input
                  type="url"
                  value={audioUrl}
                  onChange={(e) => {
                    setAudioUrl(e.target.value);
                    setUploadFileName("");
                  }}
                  placeholder="https://example.com/audio/conversation.mp3"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Audio preview */}
              {audioUrl && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Pratinjau Pemutaran Audio:</span>
                  </div>
                  <audio controls src={audioUrl} className="w-full h-9" />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Protection notice banner */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div>
                  <span className="font-bold block">Proteksi Kerahasiaan Naskah Listening:</span>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400/90 leading-relaxed mt-0.5">
                    Teks yang Anda ketik di bawah akan dibacakan otomatis sebagai suara audio di ruang ujian, dan <b>teks naskah disembunyikan 100% dari siswa</b> agar asesmen menyimak tetap valid dan objektif.
                  </p>
                </div>
              </div>

              {/* Script Textarea */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Naskah Dialog / Monolog Narasi yang Dibacakan:
                </label>
                <textarea
                  rows={5}
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder={"Contoh dialog:\nSpeaker A: Excuse me, where is the library?\nSpeaker B: Go straight ahead and turn right at the traffic light.\nSpeaker A: Thank you very much!"}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none leading-relaxed font-sans"
                />
              </div>

              {/* Language and Speed settings */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Bahasa Pelafalan Suara:
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    <option value="id-ID">Bahasa Indonesia (id-ID)</option>
                    <option value="en-US">Bahasa Inggris (en-US)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Kecepatan Pembacaan:
                  </label>
                  <select
                    value={speechRate}
                    onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    <option value={0.85}>Perlahan (0.85x) - Rekomendasi Pemula</option>
                    <option value={0.95}>Normal Ramah (0.95x)</option>
                    <option value={1.0}>Standar Asli (1.0x)</option>
                    <option value={1.15}>Cepat (1.15x)</option>
                  </select>
                </div>
              </div>

              {/* Speech test button */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Uji Dengar Suara Narasi
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Pastikan suara terdengar jelas sebelum disematkan ke soal siswa.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleTestSpeech}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                    isTestingSpeech
                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                >
                  {isTestingSpeech ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Hentikan Suara</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Uji Dengar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          {(initialAudioUrl || initialScript) ? (
            <button
              type="button"
              onClick={handleRemoveAudio}
              className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 px-3 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Audio Soal</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all shadow-indigo-200 dark:shadow-none"
            >
              <Check className="w-4 h-4" />
              <span>Terapkan Audio ke Soal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
