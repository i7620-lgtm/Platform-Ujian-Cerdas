import { useState, useCallback, useRef } from "react";

export interface CanvasElement {
  id: string;
  type: "pencil" | "arrow" | "preset";
  points?: { x: number; y: number }[]; // for freehand pencil
  x1?: number;
  y1?: number; // start of measurement arrow
  x2?: number;
  y2?: number; // end of measurement arrow
  label?: string; // arrow length text
  color: string;
  strokeWidth: number;
  rotate?: number; // rotation in degrees
  tx?: number;
  ty?: number; // translation offset
  presetSvgHtml?: string; // raw preset SVG path body
}

export function useGeometryCanvas() {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [history, setHistory] = useState<CanvasElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const [currentTool, setCurrentTool] = useState<
    "pencil" | "arrow" | "rotate" | "pan"
  >("pencil");
  const [strokeColor, setStrokeColor] = useState<string>("#4f46e5"); // indigo default
  const [strokeWidth, setStrokeWidth] = useState<number>(3);

  // Tracking current interaction states
  const [cursorCoords, setCursorCoords] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null,
  );

  // Temp references for interactive rotation math
  const dragStartCoords = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialElementAngle = useRef<number>(0);
  const initialElementPosition = useRef<{ tx: number; ty: number }>({
    tx: 0,
    ty: 0,
  });

  // History undo/redo wrappers
  const pushState = useCallback(
    (newElements: CanvasElement[]) => {
      const nextHistory = history.slice(0, historyIndex + 1);
      setHistory([...nextHistory, newElements]);
      setHistoryIndex(nextHistory.length);
      setElements(newElements);
    },
    [history, historyIndex],
  );

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setElements(history[prevIndex]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setElements(history[nextIndex]);
    }
  }, [history, historyIndex]);

  const clearAll = useCallback(() => {
    pushState([]);
    setSelectedElementId(null);
  }, [pushState]);

  const selectTool = useCallback(
    (tool: "pencil" | "arrow" | "rotate" | "pan") => {
      setCurrentTool(tool);
      setSelectedElementId(null);
    },
    [],
  );

  // Trigonometric distance formula for measurement labels
  const calculateDistance = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): number => {
    return Math.round(Math.hypot(x2 - x1, y2 - y1));
  };

  // Trigonometric angle calculation relative to element center
  const calculateAngle = (
    x: number,
    y: number,
    cx: number,
    cy: number,
  ): number => {
    const dy = y - cy;
    const dx = x - cx;
    const radian = Math.atan2(dy, dx);
    let angle = radian * (180 / Math.PI);
    if (angle < 0) angle += 360;
    return Math.round(angle);
  };

  // Insert a preset geometric shape node on the canvas to move/rotate it freely
  const addPresetShape = useCallback(
    (svgPathHtml: string, title?: string) => {
      const id = `preset-${Date.now()}`;
      const newElem: CanvasElement = {
        id,
        type: "preset",
        presetSvgHtml: svgPathHtml,
        rotate: 0,
        tx: 100, // centered initially
        ty: 80,
        color: strokeColor,
        strokeWidth,
        label: title || "Preset Shape",
      };
      const nextElements = [...elements, newElem];
      pushState(nextElements);
      setSelectedElementId(id);
    },
    [elements, strokeColor, strokeWidth, pushState],
  );

  // Track mouse-down action depending on key Tool
  const handleCanvasMouseDown = useCallback(
    (x: number, y: number) => {
      setIsDrawing(true);
      dragStartCoords.current = { x, y };

      if (currentTool === "pencil") {
        const id = `pencil-${Date.now()}`;
        const newElem: CanvasElement = {
          id,
          type: "pencil",
          points: [{ x, y }],
          color: strokeColor,
          strokeWidth,
        };
        setActiveElementId(id);
        setElements((prev) => [...prev, newElem]);
      } else if (currentTool === "arrow") {
        const id = `arrow-${Date.now()}`;
        const newElem: CanvasElement = {
          id,
          type: "arrow",
          x1: x,
          y1: y,
          x2: x,
          y2: y,
          color: strokeColor,
          strokeWidth,
          label: "0 cm",
        };
        setActiveElementId(id);
        setElements((prev) => [...prev, newElem]);
      } else if (currentTool === "rotate" || currentTool === "pan") {
        // Find clicked element
        // Simple proximity lookup: presets or arrows
        const clicked = [...elements].reverse().find((elem) => {
          if (elem.type === "preset") {
            // Check bounding hit box roughly around offset
            const tx = elem.tx ?? 0;
            const ty = elem.ty ?? 0;
            return Math.hypot(x - tx, y - ty) < 100;
          } else if (elem.type === "arrow") {
            const cx = ((elem.x1 ?? 0) + (elem.x2 ?? 0)) / 2;
            const cy = ((elem.y1 ?? 0) + (elem.y2 ?? 0)) / 2;
            return Math.hypot(x - cx, y - cy) < 40;
          }
          return false;
        });

        if (clicked) {
          setSelectedElementId(clicked.id);
          initialElementAngle.current = clicked.rotate ?? 0;
          initialElementPosition.current = {
            tx: clicked.tx ?? 0,
            ty: clicked.ty ?? 0,
          };
        } else {
          setSelectedElementId(null);
        }
      }
    },
    [currentTool, strokeColor, strokeWidth, elements],
  );

  // Drag-move active brush pathing or rotation trigonometry action
  const handleCanvasMouseMove = useCallback(
    (x: number, y: number) => {
      setCursorCoords({ x, y });
      if (!isDrawing) return;

      if (currentTool === "pencil" && activeElementId) {
        setElements((prev) =>
          prev.map((elem) => {
            if (elem.id === activeElementId && elem.points) {
              return { ...elem, points: [...elem.points, { x, y }] };
            }
            return elem;
          }),
        );
      } else if (currentTool === "arrow" && activeElementId) {
        setElements((prev) =>
          prev.map((elem) => {
            if (elem.id === activeElementId) {
              const dist = calculateDistance(elem.x1 ?? 0, elem.y1 ?? 0, x, y);
              // Map distance roughly to simulated coordinate scales
              const distanceLabel = `${(dist / 14).toFixed(1)} cm`;
              return {
                ...elem,
                x2: x,
                y2: y,
                label: distanceLabel,
              };
            }
            return elem;
          }),
        );
      } else if (selectedElementId) {
        const dx = x - dragStartCoords.current.x;
        const dy = y - dragStartCoords.current.y;

        setElements((prev) =>
          prev.map((elem) => {
            if (elem.id === selectedElementId) {
              if (currentTool === "pan") {
                return {
                  ...elem,
                  tx: initialElementPosition.current.tx + dx,
                  ty: initialElementPosition.current.ty + dy,
                };
              } else if (currentTool === "rotate") {
                // Center is roughly at tx, ty for preset, or bounding centroid
                const cx = elem.tx ?? 100;
                const cy = elem.ty ?? 100;
                const currentAngle = calculateAngle(x, y, cx, cy);
                const startAngle = calculateAngle(
                  dragStartCoords.current.x,
                  dragStartCoords.current.y,
                  cx,
                  cy,
                );
                const angleDiff = currentAngle - startAngle;

                return {
                  ...elem,
                  rotate: (initialElementAngle.current + angleDiff + 360) % 360,
                };
              }
            }
            return elem;
          }),
        );
      }
    },
    [isDrawing, currentTool, activeElementId, selectedElementId],
  );

  // End drawing state
  const handleCanvasMouseUp = useCallback(() => {
    setIsDrawing(false);
    setActiveElementId(null);
    pushState(elements);
  }, [elements, pushState]);

  return {
    elements,
    undo,
    redo,
    historyIndex,
    historyLength: history.length,
    clearAll,
    currentTool,
    selectTool,
    strokeColor,
    setStrokeColor,
    strokeWidth,
    setStrokeWidth,
    cursorCoords,
    selectedElementId,
    setSelectedElementId,
    addPresetShape,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
  };
}
