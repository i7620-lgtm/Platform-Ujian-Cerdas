import { useEffect, useRef, useState } from "react";
import { generateGeometrySVG } from "./geometryUtils";
import { useGeometryCanvas } from "./useGeometryCanvas";

export const SHAPES_2D = [
  { id: "triangle", name: "Segitiga" },
  { id: "square", name: "Persegi" },
  { id: "rectangle", name: "Persegi Panjang" },
  { id: "parallelogram", name: "Jajar Genjang" },
  { id: "kite", name: "Layang-layang" },
  { id: "rhombus", name: "Belah Ketupat" },
  { id: "trapezoid", name: "Trapesium Sembarang" },
  { id: "trapezoid_isosceles", name: "Trapesium Sama Kaki" },
  { id: "trapezoid_right", name: "Trapesium Siku-siku" },
  { id: "polygon", name: "Segi Banyak" },
  { id: "circle", name: "Lingkaran" },
];

export const SHAPES_3D = [
  { id: "cube", name: "Kubus" },
  { id: "cuboid", name: "Balok" },
  { id: "prism", name: "Prisma" },
  { id: "pyramid", name: "Limas" },
  { id: "cylinder", name: "Tabung" },
  { id: "cone", name: "Kerucut" },
  { id: "sphere", name: "Bola" },
];

export const SHAPES_COMBINED = [
  { id: "house", name: "Segiempat + Segitiga" },
  { id: "capsule", name: "Tabung + Setengah Bola Atas" },
  { id: "capsule2", name: "Kapsul (Tabung + 2 Setengah Bola)" },
  { id: "icecream", name: "Kerucut + Setengah Bola" },
  { id: "tube_cone", name: "Tabung + Kerucut" },
  { id: "cone_cone", name: "Kerucut Ganda (Gasing)" },
  { id: "cube_pyramid", name: "Kubus + Limas Segiempat" },
  { id: "block_pyramid", name: "Balok + Limas Segiempat" },
  { id: "block_roof", name: "Balok + Prisma Segitiga" },
  { id: "tube_tubes", name: "Bertingkat (Tabung)" },
  { id: "tube_sphere", name: "Tabung + Bola (di dalam)" },
];

interface UseGeometryModalParams {
  onInsert: (svgHtml: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const useGeometryModal = ({
  onInsert,
  onClose,
  isOpen,
}: UseGeometryModalParams) => {
  const [category, setCategory] = useState<"2d" | "3d" | "combined">("2d");
  const [shape, setShape] = useState<string>("triangle");
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [workspaceMode, setWorkspaceMode] = useState<"preset" | "canvas">(
    "preset",
  );

  // Config presets
  const [fillColor, setFillColor] = useState<string>("#f3f4f6");
  const [strokeColor, setStrokeColor] = useState<string>("#374151");
  const [showAngles, setShowAngles] = useState<boolean>(false);
  const [showLines, setShowLines] = useState<boolean>(true);
  const [simulate, setSimulate] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);

  const canvasHook = useGeometryCanvas();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { clearAll } = canvasHook;

  const shapes =
    category === "2d"
      ? SHAPES_2D
      : category === "3d"
        ? SHAPES_3D
        : SHAPES_COMBINED;

  const handleCategoryChange = (cat: "2d" | "3d" | "combined") => {
    setCategory(cat);
    setShape(
      cat === "2d"
        ? SHAPES_2D[0].id
        : cat === "3d"
          ? SHAPES_3D[0].id
          : SHAPES_COMBINED[0].id,
    );
    setLabels({});
    setShowAngles(false);
    setShowLines(true);
  };

  const handleLabelChange = (key: string, value: string) => {
    setLabels({ ...labels, [key]: value });
  };

  const handleAddPresetToCanvasState = () => {
    const svgContent = generateGeometrySVG(
      shape,
      labels,
      fillColor,
      strokeColor,
      showAngles,
      simulate,
      showLines,
    );
    const name = shapes.find((s) => s.id === shape)?.name || "Geometri";
    canvasHook.addPresetShape(svgContent, name);
    setWorkspaceMode("canvas");
  };

  const generateCanvasCombinedSVG = (
    elems: any[],
    width = 500,
    height = 350,
  ) => {
    let body = "";

    body += `
          <defs>
            <marker id="arrow-marker" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="context-stroke" />
            </marker>
            <marker id="arrow-marker-ef4444" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#ef4444" />
            </marker>
            <marker id="arrow-marker-2563eb" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#2563eb" />
            </marker>
            <marker id="arrow-marker-10b981" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
            </marker>
            <marker id="arrow-marker-f97316" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f97316" />
            </marker>
            <marker id="arrow-marker-8b5cf6" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#8b5cf6" />
            </marker>
          </defs>
        `;

    elems.forEach((elem) => {
      if (elem.type === "pencil" && elem.points && elem.points.length > 0) {
        const d = elem.points
          .map((p: any, i: number) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
          .join(" ");
        body += `<path d="${d}" fill="none" stroke="${elem.color}" stroke-width="${elem.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`;
      } else if (elem.type === "arrow") {
        const x1 = elem.x1 ?? 0;
        const y1 = elem.y1 ?? 0;
        const x2 = elem.x2 ?? 0;
        const y2 = elem.y2 ?? 0;

        let colorKey = elem.color.replace("#", "");
        if (colorKey === "4f46e5") colorKey = "";
        const markerAttr = colorKey
          ? `url(#arrow-marker-${colorKey})`
          : "url(#arrow-marker)";

        body += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${elem.color}" stroke-width="${elem.strokeWidth}" marker-end="${markerAttr}" />`;

        if (elem.label) {
          const cx = (x1 + x2) / 2;
          const cy = (y1 + y2) / 2 - 8;
          body += `<text x="${cx}" y="${cy}" fill="${elem.color}" font-size="12" font-family="sans-serif" font-weight="bold" text-anchor="middle">${elem.label}</text>`;
        }
      } else if (elem.type === "preset" && elem.presetSvgHtml) {
        const innerBody = elem.presetSvgHtml
          .replace(/<svg[^>]*>/, "")
          .replace(/<\/svg>/, "");

        const xOffset = (elem.tx ?? 100) - 100;
        const yOffset = (elem.ty ?? 100) - 100;
        const angle = elem.rotate ?? 0;

        body += `<g transform="translate(${xOffset}, ${yOffset}) rotate(${angle}, 100, 100)">${innerBody}</g>`;
      }
    });

    return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="max-width: 100%; display: inline-block; vertical-align: middle; margin: 4px; overflow: visible; background-color: transparent;">${body}</svg>`;
  };

  const handleInsert = () => {
    let finalSvg = "";
    if (workspaceMode === "preset") {
      finalSvg = generateGeometrySVG(
        shape,
        labels,
        fillColor,
        strokeColor,
        showAngles,
        simulate,
        showLines,
      );
    } else {
      finalSvg = generateCanvasCombinedSVG(canvasHook.elements, 500, 350);
    }

    const html = `<span class="geometry-shape" contenteditable="false" style="display: inline-block; vertical-align: middle; margin: 0 0.5rem; text-align: center; line-height: 1;">${finalSvg}</span>`;
    onInsert(html);
    onClose();
  };

  const executeSvgInteraction = (
    e: React.MouseEvent<SVGSVGElement, MouseEvent>,
    handler: (x: number, y: number) => void,
  ) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const x = Math.round(clientX * (500 / rect.width));
    const y = Math.round(
      clientY * ((500 / rect.width) * (rect.height / rect.width)),
    );
    const boundedY = Math.max(0, Math.min(350, y));
    const boundedX = Math.max(0, Math.min(500, x));
    handler(boundedX, boundedY);
  };

  return {
    category,
    setCategory,
    shape,
    setShape,
    labels,
    setLabels,
    fillColor,
    strokeColor,
    showAngles,
    setShowAngles,
    showLines,
    setShowLines,
    simulate,
    workspaceMode,
    setWorkspaceMode,
    setFillColor,
    setStrokeColor,
    setSimulate,
    showGrid,
    setShowGrid,
    shapes,
    svgRef,
    canvasHook,
    handleCategoryChange,
    handleLabelChange,
    handleAddPresetToCanvasState,
    handleInsert,
    generateCanvasCombinedSVG,
    executeSvgInteraction,
  };
};
