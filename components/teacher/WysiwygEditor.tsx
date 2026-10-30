import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import type { ChartData } from "../../types";
import {
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  TableCellsIcon,
  LinkIcon,
} from "../Icons";
import { ChartRenderer } from "../ChartRenderer";
import EmojiPickerModal from "./EmojiPickerModal";
import { GeometryModal } from "./GeometryModal";
import { AiImageModal } from "./AiImageModal";
import { ToolbarActions } from "./ToolbarActions";
import { InlineEquationToolbar } from "./InlineEquationToolbar";
import { InlineLatexCursorChip } from "./InlineLatexCursorChip";
import { useWysiwygEditor } from "./useWysiwygEditor";
import { transliterate } from "../../utils/aksaraBali";
import { generateGeometrySVG, parseGeometryLabels } from "./geometryUtils";
import { cleanOrphanedSvgMarkup, repairGeometrySvgInHtml, sanitizeHtml } from "./examUtils";
import { hydrateMathInContainer, renderMathInHtml } from "../../utils/mathRenderer";
import {
  isEditorActive,
  getCaretCharacterOffsetWithin,
  setCaretCharacterOffsetWithin,
} from "./caretUtils";

export const SelectionModal: React.FC<{
  isOpen: boolean;
  title: string;
  options: string[];
  selectedValue: string;
  onClose: () => void;
  onSelect: (value: string) => void;
  searchPlaceholder?: string;
}> = ({
  isOpen,
  title,
  options,
  selectedValue,
  onClose,
  onSelect,
  searchPlaceholder = "Cari...",
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const filteredOptions = useMemo(
    () =>
      options.filter((s) => s.toLowerCase().includes(searchTerm.toLowerCase())),
    [searchTerm, options],
  );
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-slate-700 flex flex-col max-h-[85vh]">
        <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 sticky top-0 z-10">
          <div>
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">
              {title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Silakan pilih salah satu opsi dari daftar.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 pl-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all shadow-sm"
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {filteredOptions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    onSelect(opt);
                    onClose();
                  }}
                  className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border flex items-center justify-between group ${selectedValue === opt ? "bg-primary text-white border-primary shadow-md shadow-primary/20" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-gray-100 dark:border-slate-700 hover:border-primary/30 hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-sm"}`}
                >
                  <span>{opt}</span>
                  {selectedValue === opt && (
                    <CheckIcon className="w-4 h-4 text-white" />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 dark:text-slate-500">
              <p className="text-sm">Opsi tidak ditemukan.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const TableConfigModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onInsert: (rows: number, cols: number) => void;
}> = ({ isOpen, onClose, onInsert }) => {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-xs border border-gray-100 dark:border-slate-700">
        <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <TableCellsIcon className="w-4 h-4" /> Sisipkan Tabel
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">
              Jumlah Baris
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={rows}
              onChange={(e) =>
                setRows(Math.max(1, parseInt(e.target.value) || 1))
              }
              className="w-full p-2 border rounded text-sm bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">
              Jumlah Kolom
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={cols}
              onChange={(e) =>
                setCols(Math.max(1, parseInt(e.target.value) || 1))
              }
              className="w-full p-2 border rounded text-sm bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 outline-none"
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-bold text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
            >
              Batal
            </button>
            <button
              onClick={() => {
                onInsert(rows, cols);
                onClose();
              }}
              className="px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow"
            >
              Sisipkan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AksaraBaliModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onInsert: (text: string) => void;
}> = ({ isOpen, onClose, onInsert }) => {
  const [latinText, setLatinText] = useState("");
  const [aksaraText, setAksaraText] = useState("");

  useEffect(() => {
    setAksaraText(transliterate(latinText));
  }, [latinText]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-slate-700 flex flex-col max-h-[90vh]">
        <div className="bg-gray-50 dark:bg-slate-900 p-4 border-b dark:border-slate-700 flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-700 dark:text-slate-200">
            Aksara Bali
          </h3>
          <button onClick={onClose}>
            <XMarkIcon className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-2">
              Teks Latin
            </label>
            <textarea
              value={latinText}
              onChange={(e) => setLatinText(e.target.value)}
              className="w-full p-3 border rounded-lg text-sm bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 outline-none min-h-[100px] resize-y"
              placeholder="Ketik teks latin di sini..."
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-2">
              Aksara Bali (Preview)
            </label>
            <div
              className="w-full p-3 border rounded-lg text-lg bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 min-h-[100px] break-words"
              style={{ fontFamily: '"Noto Sans Balinese", sans-serif' }}
            >
              {aksaraText || (
                <span className="text-gray-400 dark:text-slate-500 text-sm">
                  Hasil transliterasi akan muncul di sini...
                </span>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              onClick={() => {
                onInsert(aksaraText);
                onClose();
              }}
              disabled={!aksaraText}
              className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sisipkan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const LinkModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onInsert: (url: string, text?: string, customHtml?: string) => void;
  selectedText?: string;
}> = ({ isOpen, onClose, onInsert, selectedText = "" }) => {
  const [url, setUrl] = useState("");
  const [text, setText] = useState(selectedText);
  const [simulatePreview, setSimulatePreview] = useState(true);

  if (!isOpen) return null;

  const getYouTubeId = (rawUrl: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = rawUrl.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!url.trim()) return;
    let formattedUrl = url.trim();
    if (
      !/^https?:\/\//i.test(formattedUrl) &&
      !formattedUrl.startsWith("#") &&
      !formattedUrl.startsWith("mailto:")
    ) {
      formattedUrl = "https://" + formattedUrl;
    }

    if (simulatePreview) {
      const videoId = getYouTubeId(formattedUrl);
      if (videoId) {
        const cleanTitle = (text.trim() || "Video Pembelajaran").replace(/"/g, "&quot;");
        const embedHtml = `<div class="video-embed-container my-3 mx-auto max-w-full sm:max-w-xl rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm bg-slate-900" contenteditable="false"><div class="video-responsive-wrapper relative w-full aspect-video"><iframe src="https://www.youtube-nocookie.com/embed/${videoId}" title="${cleanTitle}" class="w-full h-full border-0 absolute inset-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div><div class="print-video-thumbnail" style="display: none;"><img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" alt="Video Screenshot" style="max-width: 100%; height: auto; margin: 0 auto; border-radius: 8px;" /><p style="font-size: 11px; color: #64748b; margin-top: 4px; text-align: center; font-family: monospace;">▶ Video: ${cleanTitle} (${formattedUrl})</p></div><div class="p-2 bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-200 dark:border-slate-700"><span>▶ ${cleanTitle}</span><a href="${formattedUrl}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 dark:text-indigo-400 underline font-mono shrink-0 ml-2">Buka YouTube</a></div></div><p><br/></p>`;
        onInsert(formattedUrl, text.trim() || formattedUrl, embedHtml);
        onClose();
        return;
      }

      let domain = "";
      try {
        domain = new URL(formattedUrl).hostname;
      } catch {
        domain = formattedUrl;
      }
      const cardTitle = (text.trim() || domain).replace(/"/g, "&quot;");
      const cardHtml = `<div class="link-preview-card my-3 mx-auto max-w-xl rounded-xl border border-indigo-100 dark:border-slate-700 bg-gradient-to-r from-indigo-50/50 via-white to-blue-50/40 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800/80 p-3 shadow-sm hover:shadow transition-all" contenteditable="false"><div class="flex items-start gap-3"><div class="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 text-lg font-bold">🌐</div><div class="flex-1 min-w-0"><a href="${formattedUrl}" target="_blank" rel="noopener noreferrer" class="font-bold text-sm text-indigo-600 dark:text-indigo-400 hover:underline block truncate">${cardTitle}</a><p class="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-mono">${formattedUrl}</p><span class="inline-flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">🔗 Materi / Referensi Eksternal</span></div></div></div><p><br/></p>`;
      onInsert(formattedUrl, text.trim() || formattedUrl, cardHtml);
      onClose();
      return;
    }

    onInsert(formattedUrl, text.trim() || formattedUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 dark:border-slate-700 flex flex-col">
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800">
          <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Sisipkan Tautan (Link)
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">
              URL Link / Alamat Web
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://contoh.com atau link video YouTube"
              className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 outline-none text-xs"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">
              Teks / Judul Tautan (Opsional)
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Judul / Teks deskripsi link"
              className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 outline-none text-xs"
            />
          </div>
          <div className="pt-1">
            <label className="flex items-start gap-2.5 p-2 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={simulatePreview}
                onChange={(e) => setSimulatePreview(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 mt-0.5"
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 block">
                  Simulasikan Tampilan (Embed / Preview)
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight mt-0.5">
                  Tampilkan video YouTube responsif atau kartu preview link (cetak/PDF otomatis tampil sebagai tangkapan layar/thumbnail).
                </span>
              </div>
            </label>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-bold text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!url.trim()}
              className="px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sisipkan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const WysiwygEditor: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minHeight?: string;
  showTabs?: boolean;
  onChartClick?: (chartType?: "cartesian") => void;
  chartData?: ChartData;
}> = ({
  value,
  onChange,
  placeholder = "Ketik di sini...",
  minHeight = "120px",
  showTabs = true,
  onChartClick,
  chartData,
}) => {
  const {
    editorRef,
    fileInputRef,
    audioInputRef,
    state,
    setEditorSubState,
    handleInput,
    handleBlur,
    checkActiveFormats,
    handleEditorClick,
    runCmd,
    insertTable,
    deleteCurrentTable,
    toggleVerticalIndentQuote,
    insertMath,
    inlineMathNode,
    inlineMathInitialLatex,
    externalLatexAppend,
    setExternalLatexAppend,
    startInlineMathAtCursor,
    commitInlineMath,
    cancelInlineMath,
    activeInlineLatex,
    setActiveInlineLatex,
    insertAiImage,
    openLinkModal,
    insertLink,
    handlePaste,
    handleImageFileChange,
    handleAudioFileChange,
    restoreSelection,
    lastEmittedValueRef,
    isTypingRef,
    debounceRef,
  } = useWysiwygEditor({ value, onChange, showTabs, onChartClick, chartData });

  const {
    activeTab,
    activeCmds,
    isInsideTable,
    showMath,
    showTable,
    showGeometry,
    showAksara,
    showEmoji,
    showAiImage,
    showLink,
    selectedTextForLink,
  } = state;

  const [chartNode, setChartNode] = useState<HTMLElement | null>(null);
  const lastValueRef = useRef(value);

  useEffect(() => {
    if (editorRef.current) {
      const isFocused = isEditorActive(editorRef.current);
      const currentHtml = editorRef.current.innerHTML;

      // 1. If this incoming value was emitted by this editor instance, do NOT touch DOM
      const isSelfChange =
        value === lastEmittedValueRef.current ||
        (lastEmittedValueRef.current !== null &&
          sanitizeHtml(value) === lastEmittedValueRef.current);

      if (isSelfChange) {
        lastValueRef.current = value;
        return;
      }

      // 2. If the user is actively focused and typing/pending debounce in this editor, do NOT disrupt cursor
      if (isFocused && (isTypingRef.current || debounceRef.current !== null)) {
        lastValueRef.current = value;
        return;
      }

      const propChangedExternally = value !== lastValueRef.current;
      lastValueRef.current = value;

      if (value !== currentHtml) {
        if (
          propChangedExternally ||
          !isFocused ||
          !currentHtml ||
          currentHtml === "<p><br></p>"
        ) {
          // If the editor is currently focused, preserve caret character offset
          const savedOffset = isFocused
            ? getCaretCharacterOffsetWithin(editorRef.current)
            : -1;

          let newHtml = value || "";

          // If plain text with newlines and no HTML tags (e.g. preset or raw multiline text)
          if (
            newHtml &&
            !/<[a-z][\s\S]*>/i.test(newHtml) &&
            newHtml.includes("\n")
          ) {
            newHtml = newHtml
              .split(/\r?\n\r?\n/)
              .map((para) => `<p>${para.replace(/\r?\n/g, "<br/>")}</p>`)
              .join("");
          }

          // Pre-render any LaTeX delimiters ($...$ or $$...$$) into rich math-visual spans
          newHtml = renderMathInHtml(newHtml);

          const CHART_PLACEHOLDER = `<br/><span class="chart-placeholder" contenteditable="false" data-chart="true" style="display: block; width: 100%; max-width: 600px; min-height: 100px; padding: 10px; background: #f8fafc; border: 2px dashed #cbd5e1; text-align: center; border-radius: 8px; margin: 10px auto; color: #475569; font-weight: bold; cursor: pointer;"><span class="chart-placeholder-text" style="display: block; padding: 40px 0;">📊 Diagram (Klik untuk mengedit)</span></span><br/>`;

          if (/\\?\[(CHART|DIAGRAM|GRAFIK).*?\\?\]/i.test(newHtml)) {
            newHtml = newHtml.replace(
              /(?:<p>)?\s*\\?\[(CHART|DIAGRAM|GRAFIK).*?\\?\]\s*(?:<\/p>)?/gi,
              CHART_PLACEHOLDER,
            );
          } else if (chartData && !newHtml.includes('data-chart="true"')) {
            newHtml += CHART_PLACEHOLDER;
          }

          // Resolve any unrendered geometry tag
          if (
            /\[GEOMETRY:([a-zA-Z0-9_-]+)(?:[:|]([\s\S]*?))?\]/i.test(newHtml)
          ) {
            newHtml = newHtml.replace(
              /\[GEOMETRY:([a-zA-Z0-9_-]+)(?:[:|]([\s\S]*?))?\]/gi,
              (_match, shape, labelsStr) => {
                try {
                  const labels = parseGeometryLabels(labelsStr || "{}");
                  const svg = generateGeometrySVG(
                    shape,
                    labels,
                    "#e2e8f0",
                    "#0f172a",
                    false,
                    true,
                    true,
                  );
                  return `<span class="geometry-shape" contenteditable="false" data-shape="${shape}" data-labels="${encodeURIComponent(JSON.stringify(labels))}" style="display: block; max-width: 250px; margin: 0.35rem auto; text-align: center; line-height: 1;">${svg}</span>`;
                } catch {
                  return _match;
                }
              },
            );
          }

          // Clean any orphaned SVG code fragments from past errors and repair geometry SVGs
          newHtml = repairGeometrySvgInHtml(cleanOrphanedSvgMarkup(newHtml));
          editorRef.current.innerHTML = newHtml;

          // Rehydrate any KaTeX math elements or raw LaTeX
          hydrateMathInContainer(editorRef.current);

          // Restore caret position if editor was focused
          if (isFocused && savedOffset >= 0) {
            setCaretCharacterOffsetWithin(editorRef.current, savedOffset);
          }
        }
      }
    }
  }, [value, chartData, editorRef, lastEmittedValueRef, isTypingRef, debounceRef]);

  useEffect(() => {
    if (editorRef.current) {
      const node = editorRef.current.querySelector('[data-chart="true"]');
      if (node) {
        const textSpan = node.querySelector(
          ".chart-placeholder-text",
        ) as HTMLElement;
        if (textSpan) {
          textSpan.style.display = chartData ? "none" : "block";
        }
      }
      setChartNode(node as HTMLElement);
    }
  }, [value, chartData, editorRef]);

  return (
    <div className="relative group rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-all focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900 focus-within:border-indigo-300 dark:focus-within:border-indigo-700 w-full max-w-full">
      <div className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 rounded-t-xl select-none">
        <div className="flex px-2 pt-1 gap-1 border-b border-gray-200/50 dark:border-slate-700/50 justify-between items-end overflow-x-auto custom-scrollbar">
          {showTabs && (
            <div className="flex gap-1 shrink-0">
              {["FORMAT", "PARAGRAPH", "INSERT", "MATH"].map((t: string) => (
                <button
                  key={t}
                  onClick={() => setEditorSubState({ activeTab: t as any })}
                  className={`px-2 sm:px-3 py-1.5 text-[9px] sm:text-[10px] font-bold tracking-wider rounded-t-lg transition-colors whitespace-nowrap ${activeTab === t ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-gray-500 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700"}`}
                >
                  {t === "MATH"
                    ? "RUMUS"
                    : t === "FORMAT"
                      ? "FORMAT"
                      : t === "PARAGRAPH"
                        ? "PARAGRAF"
                        : "SISIPKAN"}
                </button>
              ))}
            </div>
          )}
          {isInsideTable && (
            <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[9px] font-bold rounded-t uppercase tracking-widest border-t border-x border-indigo-100 dark:border-indigo-800 shrink-0">
              Table Active
            </div>
          )}
        </div>
        <div className="p-1.5 flex flex-wrap gap-1 items-center bg-white dark:bg-slate-900 rounded-b-none min-h-[36px]">
          <ToolbarActions
            activeTab={activeTab}
            activeCmds={activeCmds}
            runCmd={runCmd}
            onAudioClick={() => audioInputRef.current?.click()}
            onImageClick={() => fileInputRef.current?.click()}
            onAiImageClick={() => setEditorSubState({ showAiImage: true })}
            onTableClick={() => setEditorSubState({ showTable: true })}
            onGeometryClick={() => setEditorSubState({ showGeometry: true })}
            onChartClick={onChartClick}
            onAksaraClick={() => setEditorSubState({ showAksara: true })}
            onEmojiClick={() => setEditorSubState({ showEmoji: true })}
            onLinkClick={openLinkModal}
            onVerticalIndentClick={toggleVerticalIndentQuote}
            isInsideTable={isInsideTable}
            onDeleteTable={deleteCurrentTable}
            chartData={chartData}
            editorRef={editorRef}
            restoreSelection={restoreSelection}
            handleInput={handleInput}
          />
          {activeTab === "MATH" && (
            <div className="w-full">
              <InlineEquationToolbar
                onInsert={insertMath}
                onStartInlineLatex={() => startInlineMathAtCursor()}
                isInlineEditingActive={!!inlineMathNode}
                activeLatex={activeInlineLatex}
              />
            </div>
          )}
          {isInsideTable && (
            <div className="ml-auto pl-2 border-l border-gray-200 dark:border-slate-700 flex items-center animate-fade-in shrink-0">
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  deleteCurrentTable();
                }}
                className="flex items-center gap-1 px-2 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-[10px] font-bold hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-100 dark:border-red-900 transition-colors whitespace-nowrap"
                title="Hapus Tabel ini"
              >
                <TrashIcon className="w-3 h-3" /> Hapus
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="relative">
        <div
          ref={editorRef}
          className="wysiwyg-content p-3 sm:p-4 outline-none text-sm text-slate-900 dark:text-slate-200 leading-relaxed overflow-auto break-words"
          style={{ minHeight }}
          contentEditable={true}
          onInput={handleInput}
          onKeyUp={checkActiveFormats}
          onMouseUp={checkActiveFormats}
          onBlur={handleBlur}
          onClick={handleEditorClick}
          onPaste={handlePaste}
          data-placeholder={placeholder}
          spellCheck={false}
          suppressContentEditableWarning={true}
        />
        {chartNode &&
          chartData &&
          createPortal(
            <div className="w-full pointer-events-none">
              <ChartRenderer data={chartData} />
            </div>,
            chartNode,
          )}
        {inlineMathNode &&
          createPortal(
            <InlineLatexCursorChip
              initialLatex={inlineMathInitialLatex}
              onCommit={commitInlineMath}
              onCancel={cancelInlineMath}
              onChange={setActiveInlineLatex}
              externalAppend={externalLatexAppend}
              onClearExternalAppend={() => setExternalLatexAppend(null)}
            />,
            inlineMathNode,
          )}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleImageFileChange}
      />
      <input
        type="file"
        ref={audioInputRef}
        className="hidden"
        accept="audio/*"
        onChange={handleAudioFileChange}
      />

      <TableConfigModal
        key={showTable ? "table-open" : "table-closed"}
        isOpen={showTable}
        onClose={() => setEditorSubState({ showTable: false })}
        onInsert={insertTable}
      />
      <GeometryModal
        key={showGeometry ? "geometry-open" : "geometry-closed"}
        isOpen={showGeometry}
        onClose={() => setEditorSubState({ showGeometry: false })}
        onInsert={(svgHtml) => {
          runCmd("insertHTML", svgHtml);
          handleInput();
        }}
      />
      <AksaraBaliModal
        key={showAksara ? "aksara-open" : "aksara-closed"}
        isOpen={showAksara}
        onClose={() => setEditorSubState({ showAksara: false })}
        onInsert={(text) => {
          runCmd(
            "insertHTML",
            `<span class="aksara-bali" style="font-family: 'Noto Sans Balinese', sans-serif;">${text}</span>&nbsp;`,
          );
          handleInput();
        }}
      />
      <EmojiPickerModal
        key={showEmoji ? "emoji-open" : "emoji-closed"}
        isOpen={showEmoji}
        onClose={() => setEditorSubState({ showEmoji: false })}
        onInsert={(emoji) => {
          runCmd("insertHTML", emoji);
          handleInput();
        }}
      />
      <AiImageModal
        key={showAiImage ? "ai-image-open" : "ai-image-closed"}
        isOpen={showAiImage}
        onClose={() => setEditorSubState({ showAiImage: false })}
        onInsert={insertAiImage}
      />
      <LinkModal
        key={showLink ? `link-open-${selectedTextForLink}` : "link-closed"}
        isOpen={showLink}
        onClose={() => setEditorSubState({ showLink: false })}
        onInsert={insertLink}
        selectedText={selectedTextForLink}
      />
    </div>
  );
};
