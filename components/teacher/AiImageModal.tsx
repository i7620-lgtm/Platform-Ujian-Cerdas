import React, { useState } from "react";
import {
  Sparkles,
  X,
  Image as ImageIcon,
  Wand2,
  RefreshCw,
  Check,
  Layers,
  FileCode,
  Download,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";
import {
  generateEducationalSvg,
  svgToDataUrl,
  svgToPngDataUrl,
} from "../../services/svgGeneratorService";
import { validateEducationalSafety } from "../../services/contentModeration";

interface AiImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (imageUrl: string, caption: string) => void;
}

type EngineType = "svg" | "flux";

const SVG_STYLE_OPTIONS = [
  {
    id: "infographic",
    label: "Infografis & Rangkuman",
    desc: "Kartu konsep simetris & banner kesimpulan rapi",
  },
  {
    id: "diagram",
    label: "Diagram Berlabel",
    desc: "Skema ilmiah dengan panah & label keterangan",
  },
  {
    id: "flowchart",
    label: "Bagan Alur & Siklus",
    desc: "Alur proses bertahap, siklus, atau piramida",
  },
  {
    id: "geometry",
    label: "Geometri & Matematika",
    desc: "Bentuk presisi, dimensi ukuran, atau grafik",
  },
  {
    id: "flat_art",
    label: "Ilustrasi Flat Art",
    desc: "Vektor kartun edukatif modern & warna-warni",
  },
];

const FLUX_STYLE_OPTIONS = [
  {
    id: "textbook",
    label: "Buku Pelajaran (Vector)",
    suffix: "educational textbook illustration, crisp vector diagram, clean white background, vibrant educational colors, highly detailed",
  },
  {
    id: "diagram",
    label: "Diagram Berlabel",
    suffix: "clear educational scientific labeled schematic diagram, high contrast, clean white background, professional textbook quality",
  },
  {
    id: "kid",
    label: "Kartun Edukasi Anak",
    suffix: "friendly colorful educational cartoon illustration for elementary school students, bright cheerful colors, clean background",
  },
  {
    id: "realistic",
    label: "Fotografi / Realistis",
    suffix: "clean high resolution educational documentary photograph, studio lighting, high clarity, detailed",
  },
];

export const AiImageModal: React.FC<AiImageModalProps> = ({
  isOpen,
  onClose,
  onInsert,
}) => {
  const [engine, setEngine] = useState<EngineType>("svg");
  const [prompt, setPrompt] = useState("");
  const [selectedSvgStyle, setSelectedSvgStyle] = useState("infographic");
  const [selectedFluxStyle, setSelectedFluxStyle] = useState("textbook");
  
  // States for SVG
  const [generatedSvg, setGeneratedSvg] = useState<string | null>(null);
  
  // States for preview & status
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    // Validasi Etika & Kepatutan Edukasi Bebas Pornografi & SARA
    const safety = validateEducationalSafety(trimmed);
    if (!safety.isSafe) {
      setErrorMessage(safety.reason || "Permintaan tidak sesuai dengan standar etika pendidikan sekolah.");
      setGeneratedSvg(null);
      setPreviewUrl(null);
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    if (engine === "svg") {
      try {
        const svgCode = await generateEducationalSvg(trimmed, selectedSvgStyle);
        setGeneratedSvg(svgCode);
        const dataUrl = svgToDataUrl(svgCode);
        setPreviewUrl(dataUrl);
      } catch (err: any) {
        console.error("Gagal generate SVG:", err);
        setErrorMessage(err.message || "Gagal membuat gambar SVG dari AI.");
        setGeneratedSvg(null);
        setPreviewUrl(null);
      } finally {
        setIsGenerating(false);
      }
    } else {
      // FLUX Engine dengan Perlindungan Ketat K-12 Anti-Pornografi & Anti-SARA
      const styleObj = FLUX_STYLE_OPTIONS.find((s) => s.id === selectedFluxStyle);
      const styleSuffix = styleObj ? styleObj.suffix : FLUX_STYLE_OPTIONS[0].suffix;
      const newSeed = Math.floor(Math.random() * 999999);

      // Safe educational negative constraints
      const strictEducationalSafety = "safe for school, K-12 educational textbook, strictly safe for work, child friendly, modest, fully clothed, respectful, no nudity, no NSFW, no violence, no gore, no hate speech, no racial prejudice, no religious disrespect";
      const fullPrompt = `${trimmed}, ${styleSuffix}, ${strictEducationalSafety}`;
      const generatedUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
        fullPrompt
      )}?width=768&height=480&nologo=true&model=flux&enhance=true&safe=true&seed=${newSeed}`;

      setGeneratedSvg(null);
      const img = new Image();
      img.onload = () => {
        setPreviewUrl(generatedUrl);
        setIsGenerating(false);
      };
      img.onerror = () => {
        setPreviewUrl(generatedUrl);
        setIsGenerating(false);
      };
      img.src = generatedUrl;
    }
  };

  // Insert standard FLUX / image URL
  const handleInsertFlux = () => {
    if (!previewUrl) return;
    onInsert(previewUrl, prompt.trim());
    handleClose();
  };

  // Insert as pure SVG
  const handleInsertSvg = () => {
    if (!generatedSvg) return;
    const dataUrl = svgToDataUrl(generatedSvg);
    onInsert(dataUrl, prompt.trim());
    handleClose();
  };

  // Insert as PNG High-Definition (1700 × 1120)
  const handleInsertPng = async () => {
    if (!generatedSvg) return;
    setIsExportingPng(true);
    try {
      const pngUrl = await svgToPngDataUrl(generatedSvg, 1700, 1120);
      onInsert(pngUrl, prompt.trim());
      handleClose();
    } catch (err) {
      console.error("Gagal konversi SVG ke PNG:", err);
      // Fallback to SVG data URL
      const dataUrl = svgToDataUrl(generatedSvg);
      onInsert(dataUrl, prompt.trim());
      handleClose();
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleClose = () => {
    onClose();
    setPreviewUrl(null);
    setGeneratedSvg(null);
    setPrompt("");
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-slate-700 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-indigo-50/60 via-white to-purple-50/60 dark:from-slate-800 dark:to-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 dark:shadow-none">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-slate-800 dark:text-white">
                  Generator Gambar AI
                </h3>
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  Bebas Pornografi &amp; SARA
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Buat gambar materi, skema pembelajaran, atau ilustrasi soal ujian yang 100% aman &amp; edukatif.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          {/* Engine Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
              Pilih Mesin Generator AI:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Option 1: SVG / PNG */}
              <button
                type="button"
                onClick={() => {
                  setEngine("svg");
                  setPreviewUrl(null);
                  setGeneratedSvg(null);
                  setErrorMessage(null);
                }}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  engine === "svg"
                    ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 dark:border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm"
                    : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-slate-800 dark:text-white">
                    <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Vektor SVG / PNG</span>
                  </div>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                    Paling Akurat
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  Teks Bahasa Indonesia 100% terbaca jelas tanpa typo/halusinasi, bagan rapi, dan tajam (HD).
                </p>
              </button>

              {/* Option 2: FLUX */}
              <button
                type="button"
                onClick={() => {
                  setEngine("flux");
                  setPreviewUrl(null);
                  setGeneratedSvg(null);
                  setErrorMessage(null);
                }}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  engine === "flux"
                    ? "border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 dark:border-purple-500 ring-2 ring-purple-500/20 shadow-sm"
                    : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-slate-800 dark:text-white">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>FLUX AI</span>
                  </div>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">
                    Difusi
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  Ilustrasi artistik, lukisan digital pemandangan alam, atau objek realistis ramah anak.
                </p>
              </button>
            </div>

            {/* Child-friendly Educational Safety Assurance Banner */}
            <div className="mt-2.5 flex items-start gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 text-[11px] text-slate-600 dark:text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="leading-tight">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Etika &amp; Kepatutan Konten Terjamin:
                </span>{" "}
                Generator ini memfilter secara otomatis pornografi, ketelanjangan, kekerasan, serta pelecehan SARA. Materi sains/biologi disajikan dalam skema anatomi medis formal buku pelajaran.
              </div>
            </div>
          </div>

          {/* Prompt Input */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Deskripsi Gambar yang Ingin Dibuat:
            </label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  engine === "svg"
                    ? "Contoh: Infografis peran ekologis hutan bakau pesisir dengan 3 fungsi strategis dan kesimpulan ringkas..."
                    : "Contoh: Pemandangan ekosistem hutan hujan tropis dengan keanekaragaman satwa langka Indonesia yang indah..."
                }
                rows={3}
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs sm:text-sm transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Style Selector based on Engine */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Gaya Visual {engine === "svg" ? "Vektor / Diagram:" : "Ilustrasi FLUX:"}
            </label>
            {engine === "svg" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {SVG_STYLE_OPTIONS.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setSelectedSvgStyle(style.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      selectedSvgStyle === style.id
                        ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm"
                        : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-xs font-bold truncate">{style.label}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                      {style.desc}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FLUX_STYLE_OPTIONS.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setSelectedFluxStyle(style.id)}
                    className={`p-2.5 rounded-xl border text-xs font-medium text-center transition-all ${
                      selectedFluxStyle === style.id
                        ? "border-purple-600 bg-purple-50/70 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-bold shadow-sm"
                        : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-gray-300"
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Error Notice if any */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">Gagal Membuat Gambar:</span> {errorMessage}
              </div>
            </div>
          )}

          {/* Preview Section */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                <span>Hasil Preview Gambar:</span>
              </label>
              {previewUrl && (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 text-[11px] font-medium"
                >
                  <RefreshCw className={`w-3 h-3 ${isGenerating ? "animate-spin" : ""}`} />
                  Generate Ulang
                </button>
              )}
            </div>

            <div className="w-full min-h-[220px] max-h-[340px] rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center p-3 overflow-hidden relative group">
              {isGenerating ? (
                <div className="flex flex-col items-center gap-2.5 text-slate-500 dark:text-slate-400 p-4 text-center">
                  <div className="w-9 h-9 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {engine === "svg"
                      ? "AI sedang merancang diagram vektor & label teks..."
                      : "AI sedang melukis gambar stimulus resolusi tinggi..."}
                  </p>
                  <span className="text-[11px] text-slate-400">
                    {engine === "svg"
                      ? "Menghasilkan elemen grafik SVG murni yang presisi"
                      : "Memproses model difusi FLUX"}
                  </span>
                </div>
              ) : previewUrl ? (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <img
                    src={previewUrl}
                    alt="AI Generated Preview"
                    className="max-h-[240px] w-auto max-w-full object-contain rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 bg-white"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {engine === "svg" ? (
                        <span className="text-indigo-600 dark:text-indigo-400">
                          Format: Vektor SVG Murni (Tersedia opsi sisip SVG atau PNG)
                        </span>
                      ) : (
                        <span>Model: FLUX Educational Engine • Resolusi: 768 × 480 px</span>
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 text-slate-400 dark:text-slate-500 max-w-sm">
                  <Wand2 className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-medium">
                    Ketik deskripsi gambar materi di atas, lalu klik tombol{" "}
                    <strong className="text-slate-700 dark:text-slate-300">
                      "Generate Gambar AI"
                    </strong>
                    .
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
            <span>
              {engine === "svg"
                ? "Format SVG super ringan (~5KB), sedangkan PNG kompatibel di semua printer."
                : "Gambar FLUX otomatis dioptimasi untuk stimulasi visual siswa."}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                isGenerating || !prompt.trim()
                  ? "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                  : engine === "svg"
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 dark:shadow-none"
                  : "bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-200 dark:shadow-none"
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>{previewUrl ? "Generate Ulang" : "Generate Gambar AI"}</span>
            </button>

            {/* Insert Actions for SVG: 2 options (SVG or PNG) */}
            {previewUrl && engine === "svg" && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleInsertSvg}
                  title="Sisipkan sebagai kode Vektor SVG (Sangat ringan, tidak pecah)"
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Sisipkan sbg SVG</span>
                </button>

                <button
                  type="button"
                  onClick={handleInsertPng}
                  disabled={isExportingPng}
                  title="Konversi dan sisipkan sebagai gambar PNG beresolusi tinggi"
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <Download className={`w-3.5 h-3.5 ${isExportingPng ? "animate-bounce" : ""}`} />
                  <span>{isExportingPng ? "Memproses PNG..." : "Sisipkan sbg PNG"}</span>
                </button>
              </div>
            )}

            {/* Insert Action for FLUX */}
            {previewUrl && engine === "flux" && (
              <button
                type="button"
                onClick={handleInsertFlux}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 dark:shadow-none flex items-center justify-center gap-1.5 transition-all"
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
