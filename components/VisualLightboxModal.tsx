import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw, Maximize2 } from "lucide-react";
import { LightboxData, openVisualLightbox } from "../utils/lightboxUtils";
import { ChartRenderer } from "./ChartRenderer";

function processSvgStringsInHtml(html: string): string {
  if (!html || typeof window === "undefined") return html;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const svgs = doc.querySelectorAll("svg");
    svgs.forEach((svg) => {
      if (!svg.getAttribute("viewBox")) {
        const bbox = svg.getBoundingClientRect();
        const w = bbox.width || parseFloat(svg.getAttribute("width") || "500") || 500;
        const h = bbox.height || parseFloat(svg.getAttribute("height") || "350") || 350;
        svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      }
      if (!svg.getAttribute("width")) {
        svg.setAttribute("width", "100%");
      }
    });
    return doc.body.innerHTML;
  } catch (err) {
    console.warn("Failed to process SVG in lightbox HTML:", err);
    return html;
  }
}

export const VisualLightboxModal: React.FC = () => {
  const [data, setData] = useState<LightboxData | null>(null);
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const contentRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setData(null);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 4));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));
  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && data) {
        close();
      }
    };

    if (data) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [data, close]);

  // Listen to custom event and global click on images/diagrams
  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<LightboxData>;
      if (customEvent.detail) {
        setData(customEvent.detail);
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
    };

    window.addEventListener("open-visual-lightbox", handleOpen);

    // Global click delegate for images and SVG diagrams inside exam and preview areas
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Ignore clicks on buttons, links, inputs, no-lightbox, or inside a ChartRenderer container
      if (
        target.closest("button") ||
        target.closest("a") ||
        target.closest("input") ||
        target.closest(".no-lightbox") ||
        target.closest("[data-chart-renderer]") ||
        target.closest(".chart-renderer-container")
      ) {
        return;
      }

      // 1. Check if an <img> was clicked inside wysiwyg/prose/options
      const img = target.closest(
        ".wysiwyg-content img, .prose img, .option-content img, .zoomable-visual img"
      ) as HTMLImageElement | null;
      if (img && img.src && !img.closest(".print-container")) {
        e.stopPropagation();
        openVisualLightbox({
          src: img.src,
          alt: img.alt || "Gambar Soal",
          title: img.alt || "Tampilan Gambar Soal",
        });
        return;
      }

      // 2. Check if geometry shape or visual container was clicked
      const geomBox = target.closest(".geometry-shape, .zoomable-visual") as HTMLElement | null;
      if (geomBox && !geomBox.closest(".print-container")) {
        e.stopPropagation();
        const clone = geomBox.cloneNode(true) as HTMLElement;
        clone.querySelectorAll(".no-lightbox").forEach((el) => el.remove());
        openVisualLightbox({
          htmlContent: clone.outerHTML,
          title: "Tampilan Visual & Geometri Soal",
        });
        return;
      }

      // 3. Check if an SVG diagram or cartesian chart was clicked (outside ChartRenderer)
      const svg = target.closest(
        ".wysiwyg-content svg:not(.katex *), .prose svg:not(.katex *), .option-content svg:not(.katex *), .zoomable-svg"
      ) as SVGSVGElement | null;
      if (
        svg &&
        !svg.closest(".katex") &&
        !svg.closest(".lucide") &&
        !svg.closest("[data-chart-renderer]") &&
        !svg.closest(".chart-renderer-container")
      ) {
        const rect = svg.getBoundingClientRect();
        if (rect.width > 40 && rect.height > 40) {
          e.stopPropagation();
          openVisualLightbox({
            svgHtml: svg.outerHTML,
            title: "Tampilan Diagram & Grafik Soal",
          });
          return;
        }
      }
    };

    document.addEventListener("click", handleGlobalClick, true);

    return () => {
      window.removeEventListener("open-visual-lightbox", handleOpen);
      document.removeEventListener("click", handleGlobalClick, true);
    };
  }, []);

  // Mouse wheel zoom inside modal
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale((s) => Math.min(s + 0.15, 4));
    } else {
      setScale((s) => Math.max(s - 0.15, 0.5));
    }
  };

  // Drag to pan when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  if (!data) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-6 select-none animate-in fade-in duration-200"
      onClick={close}
    >
      {/* Top Header Bar */}
      <div
        className="w-full max-w-5xl flex items-center justify-between text-white py-2 px-3 sm:px-4 bg-slate-900/90 rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl z-10 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
            <Maximize2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm sm:text-base text-slate-100 truncate">
              {data.title || "Tampilan Penuh Visual Soal"}
            </h3>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Gunakan mouse wheel untuk zoom, drag untuk geser, atau tekan tombol Esc untuk keluar
            </p>
          </div>
        </div>

        {/* Action Controls & Close Button */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center bg-white/10 rounded-xl p-1 gap-1">
            <button
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              title="Perkecil (-)"
              className="p-1.5 rounded-lg hover:bg-white/20 text-slate-200 hover:text-white disabled:opacity-40 transition-all"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-medium text-slate-200 px-1.5 min-w-[42px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={scale >= 4}
              title="Perbesar (+)"
              className="p-1.5 rounded-lg hover:bg-white/20 text-slate-200 hover:text-white disabled:opacity-40 transition-all"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              title="Reset Ukuran (100%)"
              className="p-1.5 rounded-lg hover:bg-white/20 text-slate-300 hover:text-white transition-all ml-0.5 border-l border-white/10"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Prominent Close Button */}
          <button
            onClick={close}
            title="Tutup Tampilan Penuh (Esc)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/80 hover:bg-red-500 text-white font-medium text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="font-semibold">Tutup</span>
          </button>
        </div>
      </div>

      {/* Main Visual Display Area */}
      <div
        className="flex-1 w-full flex items-center justify-center overflow-hidden my-2 sm:my-4 relative cursor-default"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          ref={contentRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
          }}
          className="transition-transform duration-75 ease-out max-w-[92vw] max-h-[82vh] flex items-center justify-center p-3 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl"
        >
          {data.chartData ? (
            <div className="lightbox-chart-container w-[88vw] max-w-[780px] h-[360px] sm:h-[480px] max-h-[75vh] p-3 sm:p-5 bg-white dark:bg-slate-900 rounded-xl flex flex-col justify-center items-center overflow-hidden">
              <ChartRenderer data={data.chartData} isLightbox={true} />
            </div>
          ) : data.src ? (
            <img
              src={data.src}
              alt={data.alt || "Visual Soal"}
              className="max-w-[88vw] max-h-[78vh] w-auto h-auto object-contain rounded-xl select-none"
              draggable={false}
            />
          ) : data.htmlContent ? (
            <div
              className="lightbox-html-container max-w-[88vw] max-h-[78vh] w-full overflow-y-auto flex flex-col items-center justify-center p-3 sm:p-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl select-none [&_svg]:max-w-full [&_svg]:max-h-[62vh] [&_svg]:w-auto [&_svg]:h-auto [&_svg]:min-w-[280px] [&_svg]:min-h-[200px] [&_svg]:mx-auto"
              dangerouslySetInnerHTML={{ __html: processSvgStringsInHtml(data.htmlContent) }}
            />
          ) : data.svgHtml ? (
            <div
              className="lightbox-svg-container max-w-[88vw] max-h-[78vh] flex items-center justify-center select-none p-3 sm:p-5 bg-white dark:bg-slate-900 rounded-xl [&_svg]:max-w-full [&_svg]:max-h-[72vh] [&_svg]:min-w-[280px] [&_svg]:min-h-[200px] [&_svg]:w-auto [&_svg]:h-auto [&_svg]:mx-auto"
              dangerouslySetInnerHTML={{ __html: processSvgStringsInHtml(data.svgHtml) }}
            />
          ) : null}
        </div>
      </div>

      {/* Bottom Hint */}
      <div
        className="text-[11px] sm:text-xs text-slate-400 bg-slate-900/60 px-3 py-1 rounded-full border border-white/5 backdrop-blur-sm pointer-events-none"
      >
        Klik di luar gambar atau tekan tombol <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">Esc</kbd> untuk kembali
      </div>
    </div>
  );
};
