import React, { useState } from "react";
import { Sparkles, X, Image as ImageIcon, Wand2, RefreshCw, Check, BookOpen } from "lucide-react";

interface AiImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (imageUrl: string, caption: string) => void;
}

const PRESET_TOPICS = [
  { label: "🌱 Fotosintesis", prompt: "Educational textbook diagram of photosynthesis process in a plant leaf with sunlight, water, carbon dioxide and oxygen, clean white background, detailed vector style" },
  { label: "💧 Daur Air", prompt: "Clear educational science diagram of water cycle showing evaporation, condensation, precipitation, and collection with mountains and clouds, clean white background" },
  { label: "🪐 Tata Surya", prompt: "Educational colorful diagram of the solar system showing the Sun and 8 planets in order with clear orbits, clean dark background with bright celestial bodies" },
  { label: "🫀 Anatomi Jantung", prompt: "Educational medical illustration of human heart cross-section structure, clean white background, clear labeled diagram style" },
  { label: "🦁 Rantai Makanan", prompt: "Educational biology diagram of food chain from grass producer to primary consumer grasshopper, frog, snake, and eagle apex predator, textbook illustration" },
  { label: "🔬 Sel Tumbuhan", prompt: "Educational biological diagram of plant cell structure with cell wall, chloroplast, vacuole, and nucleus, clean white background" },
  { label: "🌋 Struktur Bumi", prompt: "Educational cross section diagram of planet Earth showing crust, mantle, outer core, and inner core, clean white background" },
  { label: "⚡ Rangkaian Listrik", prompt: "Educational physics diagram of simple electric circuit with battery, switch, wires, and glowing light bulb, clean white background" },
];

const STYLE_OPTIONS = [
  { id: "textbook", label: "Buku Pelajaran (Vector)", suffix: "educational textbook illustration, crisp vector diagram, clean white background, vibrant educational colors, highly detailed" },
  { id: "diagram", label: "Diagram Berlabel", suffix: "clear educational scientific labeled schematic diagram, high contrast, clean white background, professional textbook quality" },
  { id: "kid", label: "Kartun Edukasi Anak", suffix: "friendly colorful educational cartoon illustration for elementary school students, bright cheerful colors, clean background" },
  { id: "realistic", label: "Fotografi / Realistis", suffix: "clean high resolution educational documentary photograph, studio lighting, high clarity, detailed" },
];

export const AiImageModal: React.FC<AiImageModalProps> = ({
  isOpen,
  onClose,
  onInsert,
}) => {
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("textbook");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 999999));

  if (!isOpen) return null;

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    const styleObj = STYLE_OPTIONS.find((s) => s.id === selectedStyle);
    const styleSuffix = styleObj ? styleObj.suffix : STYLE_OPTIONS[0].suffix;
    const newSeed = Math.floor(Math.random() * 999999);
    setSeed(newSeed);

    const fullPrompt = `${prompt.trim()}, ${styleSuffix}`;
    const generatedUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      fullPrompt
    )}?width=768&height=480&nologo=true&model=flux&enhance=true&seed=${newSeed}`;

    // Preload image to ensure it's ready
    const img = new Image();
    img.onload = () => {
      setPreviewUrl(generatedUrl);
      setIsGenerating(false);
    };
    img.onerror = () => {
      // Still set url even if preload has CORS quirks
      setPreviewUrl(generatedUrl);
      setIsGenerating(false);
    };
    img.src = generatedUrl;
  };

  const handleInsert = () => {
    if (!previewUrl) return;
    onInsert(previewUrl, prompt.trim());
    onClose();
    setPreviewUrl(null);
    setPrompt("");
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-slate-700 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/50 dark:from-slate-800 dark:to-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 dark:shadow-none">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-slate-800 dark:text-white">
                  AI Generator Gambar Stimulus
                </h3>
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                  100% Gratis
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Buat gambar ilustrasi atau diagram materi soal secara instan dengan AI.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          {/* Preset Topics */}
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-2">
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              <span>Contoh Topik Edukasi Cepat:</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TOPICS.map((topic, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setPrompt(topic.prompt);
                    setPreviewUrl(null);
                  }}
                  className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-700 dark:hover:bg-indigo-900/40 dark:hover:text-indigo-300 text-slate-700 dark:text-slate-300 rounded-lg transition-colors font-medium border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800"
                >
                  {topic.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Input */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Deskripsi Gambar yang Ingin Dibuat (Bahasa Indonesia atau Inggris):
            </label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Contoh: Diagram proses fotosintesis pada daun dengan sinar matahari, karbon dioksida, dan oksigen..."
                rows={3}
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs sm:text-sm transition-all"
              />
            </div>
          </div>

          {/* Style Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Gaya Visual Ilustrasi:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STYLE_OPTIONS.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setSelectedStyle(style.id)}
                  className={`p-2.5 rounded-xl border text-xs font-medium text-center transition-all ${
                    selectedStyle === style.id
                      ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm"
                      : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-gray-300"
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview Section */}
          <div className="pt-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                Hasil Preview Gambar:
              </span>
              {previewUrl && (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 text-[11px]"
                >
                  <RefreshCw className={`w-3 h-3 ${isGenerating ? "animate-spin" : ""}`} />
                  Generate Ulang (Variasi Baru)
                </button>
              )}
            </label>

            <div className="w-full min-h-[220px] max-h-[300px] rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center p-3 overflow-hidden relative group">
              {isGenerating ? (
                <div className="flex flex-col items-center gap-2.5 text-slate-500 dark:text-slate-400">
                  <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                  <p className="text-xs font-medium animate-pulse">
                    AI sedang menggambar stimulus visual berkualitas tinggi...
                  </p>
                </div>
              ) : previewUrl ? (
                <div className="w-full h-full flex flex-col items-center">
                  <img
                    src={previewUrl}
                    alt="AI Generated Preview"
                    className="max-h-[240px] w-auto max-w-full object-contain rounded-lg shadow-sm border border-gray-200 dark:border-slate-700"
                  />
                  <span className="text-[11px] text-slate-400 mt-1.5">
                    Model: Open Educational Engine • Resolusi: 768 × 480 px
                  </span>
                </div>
              ) : (
                <div className="text-center p-4 text-slate-400 dark:text-slate-500">
                  <Wand2 className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-medium">
                    Tuliskan deskripsi atau pilih salah satu contoh topik di atas, lalu klik tombol{" "}
                    <strong>"Generate Gambar dengan AI"</strong>.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Gambar otomatis disimpan dan dapat diatur ukurannya di editor.
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                isGenerating || !prompt.trim()
                  ? "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 dark:shadow-none"
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>{previewUrl ? "Generate Lagi" : "Generate Gambar AI"}</span>
            </button>
            {previewUrl && (
              <button
                type="button"
                onClick={handleInsert}
                className="flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 dark:shadow-none flex items-center justify-center gap-1.5 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Sisipkan ke Soal</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
