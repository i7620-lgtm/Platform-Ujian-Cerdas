import React from "react";
import { GeometryToolbar } from "./GeometryToolbar";
import { generateGeometrySVG } from "./geometryUtils";
import { useGeometryModal } from "./useGeometryModal";

interface GeometryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (svgHtml: string) => void;
}

export const GeometryModal: React.FC<GeometryModalProps> = ({
  isOpen,
  onClose,
  onInsert,
}) => {
  const {
    workspaceMode,
    category,
    shape,
    labels,
    fillColor,
    strokeColor,
    showAngles,
    simulate,
    showLines,
    showGrid,
    setWorkspaceMode,
    setShape,
    setLabels,
    setFillColor,
    setStrokeColor,
    setShowAngles,
    setSimulate,
    setShowLines,
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
  } = useGeometryModal({ onInsert, onClose, isOpen });

  const {
    elements,
    undo,
    redo,
    historyLength,
    historyIndex,
    clearAll,
    currentTool,
    selectTool,
    strokeColor: toolColor,
    setStrokeColor: setToolColor,
    strokeWidth: toolWidth,
    setStrokeWidth: setToolWidth,
    cursorCoords,
    selectedElementId,
    setSelectedElementId,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
  } = canvasHook;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className={`bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full ${workspaceMode === "preset" ? "max-w-2xl" : "max-w-4xl"} overflow-hidden flex flex-col max-h-[90vh] transition-all duration-300`}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-gray-800 dark:text-slate-100">
              Kombinasi Studio Geometri
            </h3>
            <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-[10px] font-bold text-indigo-700 dark:text-indigo-400 rounded">
              v2.0 Refactored
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Workspace mode chooser */}
        <div className="flex border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/30">
          <button
            onClick={() => setWorkspaceMode("preset")}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              workspaceMode === "preset"
                ? "border-indigo-600 text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-800"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-amber-100"
            }`}
          >
            📐 Preset Bangun Ruang & Datar
          </button>
          <button
            onClick={() => setWorkspaceMode("canvas")}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              workspaceMode === "canvas"
                ? "border-indigo-600 text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-800"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-amber-100"
            }`}
          >
            🎨 Kanvas Sketsa & Gambar Bebas
          </button>
        </div>

        {/* Mode Panel Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {workspaceMode === "preset" ? (
            /* Original Preset Shape Form Controls */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-slate-700 rounded-lg mb-4">
                  <button
                    onClick={() => handleCategoryChange("2d")}
                    className={`flex-1 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-colors ${category === "2d" ? "bg-white dark:bg-slate-800 text-indigo-600 shadow" : "text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-600"}`}
                  >
                    B. Datar
                  </button>
                  <button
                    onClick={() => handleCategoryChange("3d")}
                    className={`flex-1 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-colors ${category === "3d" ? "bg-white dark:bg-slate-800 text-indigo-600 shadow" : "text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-600"}`}
                  >
                    B. Ruang
                  </button>
                  <button
                    onClick={() => handleCategoryChange("combined")}
                    className={`flex-1 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-colors ${category === "combined" ? "bg-white dark:bg-slate-800 text-indigo-600 shadow" : "text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-600"}`}
                  >
                    Gabungan
                  </button>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">
                    Bentuk Geometri
                  </label>
                  <select
                    value={shape}
                    onChange={(e) => {
                      setShape(e.target.value);
                      setLabels({});
                    }}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm dark:text-slate-200"
                  >
                    {shapes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">
                      Warna Garis
                    </label>
                    <input
                      type="color"
                      value={strokeColor}
                      onChange={(e) => setStrokeColor(e.target.value)}
                      className="w-full h-8 p-0 border-0 rounded cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">
                      Warna Isi
                    </label>
                    <input
                      type="color"
                      value={fillColor}
                      onChange={(e) => setFillColor(e.target.value)}
                      className="w-full h-8 p-0 border-0 rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div className="mb-4 flex flex-col gap-2">
                  {category === "2d" && shape !== "circle" && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="showAngles"
                        checked={showAngles}
                        onChange={(e) => setShowAngles(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                      />
                      <label
                        htmlFor="showAngles"
                        className="text-sm font-medium text-gray-700 dark:text-slate-300 cursor-pointer"
                      >
                        Tampilkan Sudut
                      </label>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showLines"
                      checked={showLines}
                      onChange={(e) => setShowLines(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                    />
                    <label
                      htmlFor="showLines"
                      className="text-sm font-medium text-gray-700 dark:text-slate-300 cursor-pointer"
                    >
                      Tampilkan Panjang Garis
                    </label>
                  </div>
                  {shape !== "house" &&
                    !["capsule", "capsule2", "icecream"].includes(shape) && (
                      <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded border border-indigo-100 dark:border-indigo-800">
                        <input
                          type="checkbox"
                          id="simulateSize"
                          checked={simulate}
                          onChange={(e) => setSimulate(e.target.checked)}
                          className="w-4 h-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-600"
                        />
                        <label
                          htmlFor="simulateSize"
                          className="text-sm font-bold text-indigo-700 dark:text-indigo-400 cursor-pointer"
                        >
                          Simulasikan Proporsi Garis
                        </label>
                      </div>
                    )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase border-b border-gray-100 dark:border-slate-700 pb-1">
                    Label Garis / Dimensi {showAngles ? "& Sudut" : ""}
                  </label>
                  <div className="space-y-2">
                    {["square", "rectangle"].includes(shape) && (
                      <>
                        <input
                          type="text"
                          placeholder="Sisi Atas"
                          value={labels.top || ""}
                          onChange={(e) =>
                            handleLabelChange("top", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="Sisi Bawah (Alas)"
                          value={labels.bottom || ""}
                          onChange={(e) =>
                            handleLabelChange("bottom", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="Sisi Kiri"
                          value={labels.left || ""}
                          onChange={(e) =>
                            handleLabelChange("left", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="Sisi Kanan"
                          value={labels.right || ""}
                          onChange={(e) =>
                            handleLabelChange("right", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400 dark:text-slate-100"
                        />
                      </>
                    )}
                    {shape === "triangle" && (
                      <>
                        <input
                          type="text"
                          placeholder="Alas"
                          value={labels.bottom || ""}
                          onChange={(e) =>
                            handleLabelChange("bottom", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="Sisi Kiri"
                          value={labels.left || ""}
                          onChange={(e) =>
                            handleLabelChange("left", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="Sisi Kanan"
                          value={labels.right || ""}
                          onChange={(e) =>
                            handleLabelChange("right", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="Tinggi"
                          value={labels.height || ""}
                          onChange={(e) =>
                            handleLabelChange("height", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400 dark:text-slate-100"
                        />
                        {showAngles && (
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            <input
                              type="text"
                              placeholder="Sudut Kiri"
                              value={labels.angleA || ""}
                              onChange={(e) =>
                                handleLabelChange("angleA", e.target.value)
                              }
                              className="w-full px-2 py-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-xs placeholder:text-gray-400"
                            />
                            <input
                              type="text"
                              placeholder="Sudut Atas"
                              value={labels.angleC || ""}
                              onChange={(e) =>
                                handleLabelChange("angleC", e.target.value)
                              }
                              className="w-full px-2 py-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-xs placeholder:text-gray-400"
                            />
                            <input
                              type="text"
                              placeholder="Sudut Kanan"
                              value={labels.angleB || ""}
                              onChange={(e) =>
                                handleLabelChange("angleB", e.target.value)
                              }
                              className="w-full px-2 py-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-xs placeholder:text-gray-400"
                            />
                          </div>
                        )}
                      </>
                    )}
                    {[
                      "parallelogram",
                      "trapezoid",
                      "trapezoid_isosceles",
                      "trapezoid_right",
                    ].includes(shape) && (
                      <>
                        <input
                          type="text"
                          placeholder="Sisi Atas"
                          value={labels.top || ""}
                          onChange={(e) =>
                            handleLabelChange("top", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="Sisi Bawah (Alas)"
                          value={labels.bottom || ""}
                          onChange={(e) =>
                            handleLabelChange("bottom", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="Sisi Kiri"
                          value={labels.left || ""}
                          onChange={(e) =>
                            handleLabelChange("left", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="Sisi Kanan"
                          value={labels.right || ""}
                          onChange={(e) =>
                            handleLabelChange("right", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="Tinggi"
                          value={labels.height || ""}
                          onChange={(e) =>
                            handleLabelChange("height", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400 dark:text-slate-100"
                        />
                        {showAngles && (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <input
                              type="text"
                              placeholder="Sudut Kiri Bawah"
                              value={labels.angleA || ""}
                              onChange={(e) =>
                                handleLabelChange("angleA", e.target.value)
                              }
                              className="w-full px-2 py-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-xs placeholder:text-gray-400"
                            />
                            <input
                              type="text"
                              placeholder="Sudut Kanan Bawah"
                              value={labels.angleB || ""}
                              onChange={(e) =>
                                handleLabelChange("angleB", e.target.value)
                              }
                              className="w-full px-2 py-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-xs placeholder:text-gray-400"
                            />
                            <input
                              type="text"
                              placeholder="Sudut Kiri Atas"
                              value={labels.angleD || ""}
                              onChange={(e) =>
                                handleLabelChange("angleD", e.target.value)
                              }
                              className="w-full px-2 py-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-xs placeholder:text-gray-400"
                            />
                            <input
                              type="text"
                              placeholder="Sudut Kanan Atas"
                              value={labels.angleC || ""}
                              onChange={(e) =>
                                handleLabelChange("angleC", e.target.value)
                              }
                              className="w-full px-2 py-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-xs placeholder:text-gray-400"
                            />
                          </div>
                        )}
                      </>
                    )}
                    {["kite", "rhombus"].includes(shape) && (
                      <>
                        <input
                          type="text"
                          placeholder="Sisi Kiri Atas"
                          value={labels.topLeft || ""}
                          onChange={(e) =>
                            handleLabelChange("topLeft", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="Sisi Kanan Atas"
                          value={labels.topRight || ""}
                          onChange={(e) =>
                            handleLabelChange("topRight", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="Sisi Kiri Bawah"
                          value={labels.bottomLeft || ""}
                          onChange={(e) =>
                            handleLabelChange("bottomLeft", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="Sisi Kanan Bawah"
                          value={labels.bottomRight || ""}
                          onChange={(e) =>
                            handleLabelChange("bottomRight", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="Diagonal Vertikal (d1)"
                          value={labels.d1 || ""}
                          onChange={(e) =>
                            handleLabelChange("d1", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="Diagonal Horizontal (d2)"
                          value={labels.d2 || ""}
                          onChange={(e) =>
                            handleLabelChange("d2", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400 dark:text-slate-100"
                        />
                        {showAngles && (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <input
                              type="text"
                              placeholder="Sudut Atas"
                              value={labels.angleA || ""}
                              onChange={(e) =>
                                handleLabelChange("angleA", e.target.value)
                              }
                              className="w-full px-2 py-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-xs placeholder:text-gray-400"
                            />
                            <input
                              type="text"
                              placeholder="Sudut Bawah"
                              value={labels.angleB || ""}
                              onChange={(e) =>
                                handleLabelChange("angleB", e.target.value)
                              }
                              className="w-full px-2 py-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-xs placeholder:text-gray-400"
                            />
                            <input
                              type="text"
                              placeholder="Sudut Kiri"
                              value={labels.angleC || ""}
                              onChange={(e) =>
                                handleLabelChange("angleC", e.target.value)
                              }
                              className="w-full px-2 py-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-xs placeholder:text-gray-400"
                            />
                            <input
                              type="text"
                              placeholder="Sudut Kanan"
                              value={labels.angleD || ""}
                              onChange={(e) =>
                                handleLabelChange("angleD", e.target.value)
                              }
                              className="w-full px-2 py-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-xs placeholder:text-gray-400"
                            />
                          </div>
                        )}
                      </>
                    )}
                    {shape === "polygon" && (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-gray-500 whitespace-nowrap">
                            Jumlah Sisi:
                          </span>
                          <input
                            type="number"
                            min="3"
                            max="20"
                            placeholder="6"
                            value={labels.nSides || ""}
                            onChange={(e) =>
                              handleLabelChange("nSides", e.target.value)
                            }
                            className="w-16 px-2 py-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Panjang Sisi"
                          value={labels.side || ""}
                          onChange={(e) =>
                            handleLabelChange("side", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400 dark:text-slate-100"
                        />
                        {showAngles && (
                          <div className="mt-2">
                            <input
                              type="text"
                              placeholder="Besar Tiap Sudut Dalam"
                              value={labels.angle || ""}
                              onChange={(e) =>
                                handleLabelChange("angle", e.target.value)
                              }
                              className="w-full px-2 py-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-xs placeholder:text-gray-400"
                            />
                          </div>
                        )}
                      </>
                    )}
                    {shape === "circle" && (
                      <input
                        type="text"
                        placeholder="Jari-jari (r)"
                        value={labels.radius || ""}
                        onChange={(e) =>
                          handleLabelChange("radius", e.target.value)
                        }
                        className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400 dark:text-slate-100"
                      />
                    )}
                    {["cube", "cuboid"].includes(shape) && (
                      <>
                        <input
                          type="text"
                          placeholder="Panjang (alas)"
                          value={labels.width || ""}
                          onChange={(e) =>
                            handleLabelChange("width", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="Lebar (samping)"
                          value={labels.depth || ""}
                          onChange={(e) =>
                            handleLabelChange("depth", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="Tinggi"
                          value={labels.height || ""}
                          onChange={(e) =>
                            handleLabelChange("height", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400 dark:text-slate-100"
                        />
                      </>
                    )}
                    {["cylinder", "cone"].includes(shape) && (
                      <>
                        <input
                          type="text"
                          placeholder="Jari-jari Alas (r)"
                          value={labels.radius || ""}
                          onChange={(e) =>
                            handleLabelChange("radius", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="Tinggi (t)"
                          value={labels.height || ""}
                          onChange={(e) =>
                            handleLabelChange("height", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400 dark:text-slate-100"
                        />
                        {shape === "cone" && (
                          <input
                            type="text"
                            placeholder="Garis Pelukis (s)"
                            value={labels.side || ""}
                            onChange={(e) =>
                              handleLabelChange("side", e.target.value)
                            }
                            className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400 dark:text-slate-100"
                          />
                        )}
                      </>
                    )}
                    {shape === "sphere" && (
                      <input
                        type="text"
                        placeholder="Jari-jari (r)"
                        value={labels.radius || ""}
                        onChange={(e) =>
                          handleLabelChange("radius", e.target.value)
                        }
                        className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400"
                      />
                    )}
                    {["prism", "pyramid"].includes(shape) && (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-gray-500 whitespace-nowrap">
                            Banyak Sisi Alas:
                          </span>
                          <input
                            type="number"
                            min="3"
                            max="20"
                            placeholder={shape === "prism" ? "3" : "4"}
                            value={labels.nSides || ""}
                            onChange={(e) =>
                              handleLabelChange("nSides", e.target.value)
                            }
                            className="w-16 px-2 py-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Panjang Sisi Alas"
                          value={labels.side || ""}
                          onChange={(e) =>
                            handleLabelChange("side", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400 dark:text-slate-105"
                        />
                        <input
                          type="text"
                          placeholder={
                            shape === "prism" ? "Tinggi Prisma" : "Tinggi Limas"
                          }
                          value={labels.height || ""}
                          onChange={(e) =>
                            handleLabelChange("height", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400"
                        />
                      </>
                    )}
                    {shape === "house" && (
                      <>
                        <input
                          type="text"
                          placeholder="Lebar Alas (P.panjang)"
                          value={labels.rectWidth || ""}
                          onChange={(e) =>
                            handleLabelChange("rectWidth", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400"
                        />
                        <input
                          type="text"
                          placeholder="Tinggi Persegi Panjang"
                          value={labels.rectHeight || ""}
                          onChange={(e) =>
                            handleLabelChange("rectHeight", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400"
                        />
                        <input
                          type="text"
                          placeholder="Tinggi Segitiga"
                          value={labels.triHeight || ""}
                          onChange={(e) =>
                            handleLabelChange("triHeight", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400"
                        />
                        <input
                          type="text"
                          placeholder="Sisi Miring Segitiga"
                          value={labels.triSide || ""}
                          onChange={(e) =>
                            handleLabelChange("triSide", e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm placeholder:text-gray-400"
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Pratinjau Instan
                </label>
                <div
                  className="flex-1 bg-white dark:bg-slate-900 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl flex items-center justify-center p-4 min-h-[250px] shadow-inner"
                  dangerouslySetInnerHTML={{
                    __html: generateGeometrySVG(
                      shape,
                      labels,
                      fillColor,
                      strokeColor,
                      showAngles,
                      simulate,
                      showLines,
                    ),
                  }}
                />

                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl flex flex-col gap-2">
                  <span className="text-[11px] text-indigo-850 dark:text-indigo-300 font-medium leading-relaxed">
                    💡 Kamu bisa memasukkan gambar ini secara langsung, atau
                    dikirim ke <strong>Kanvas Sketsa</strong> untuk ditambahkan
                    coretan, garis pengukur dsb.
                  </span>
                  <button
                    type="button"
                    id="btn-add-to-canvas"
                    onClick={handleAddPresetToCanvasState}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    🎨 + Kirim ke Kanvas Sketsa
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Construction Canvas Workspace (Drawing Board) */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
              {/* Toolbar Panel */}
              <div className="md:col-span-4 lg:col-span-3">
                <GeometryToolbar
                  currentTool={currentTool}
                  onSelectTool={selectTool}
                  strokeColor={toolColor}
                  onChangeColor={setToolColor}
                  strokeWidth={toolWidth}
                  onChangeWidth={setToolWidth}
                  onUndo={undo}
                  onRedo={redo}
                  canUndo={historyIndex > 0}
                  canRedo={historyIndex < historyLength - 1}
                  onClear={clearAll}
                />

                <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700/80 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400">
                      Garis Kisi (Grid)
                    </label>
                    <input
                      type="checkbox"
                      checked={showGrid}
                      onChange={(e) => setShowGrid(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">
                    Klik & geser mouse untuk menggambar sketsa geometris, atau
                    ukur garis lurus dengan tool panah.
                  </p>
                </div>
              </div>

              {/* Live Interactive SVG Canvas */}
              <div className="md:col-span-8 lg:col-span-9 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-gray-450 dark:text-slate-400 uppercase tracking-wider">
                    Kanvas Gambar Interaktif
                  </label>
                  <span className="font-mono text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-gray-100 dark:border-slate-700">
                    X: {cursorCoords.x}px, Y: {cursorCoords.y}px
                  </span>
                </div>

                <div className="relative bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 rounded-2xl shadow-inner overflow-hidden flex-1 flex items-center justify-center min-h-[360px] cursor-crosshair">
                  <svg
                    ref={svgRef}
                    viewBox="0 0 500 350"
                    className="w-full h-full block"
                    onMouseDown={(e) =>
                      executeSvgInteraction(e, handleCanvasMouseDown)
                    }
                    onMouseMove={(e) =>
                      executeSvgInteraction(e, handleCanvasMouseMove)
                    }
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                  >
                    {/* Dynamic Grid Background Pattern */}
                    {showGrid && (
                      <>
                        <defs>
                          <pattern
                            id="grid"
                            width="20"
                            height="20"
                            patternUnits="userSpaceOnUse"
                          >
                            <path
                              d="M 20 0 L 0 0 0 20"
                              fill="none"
                              stroke="rgba(226, 232, 240, 0.4)"
                              strokeWidth="1"
                            />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                      </>
                    )}

                    {/* Marker declarations for arrow vectors inside live canvas render */}
                    <defs>
                      <marker
                        id="canvas-arrow"
                        viewBox="0 0 10 10"
                        refX="6"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto-start-reverse"
                      >
                        <path
                          d="M 0 1.5 L 8 5 L 0 8.5 z"
                          fill="context-stroke"
                        />
                      </marker>
                    </defs>

                    {/* Render elements */}
                    {canvasHook.elements.map((elem) => {
                      if (
                        elem.type === "pencil" &&
                        elem.points &&
                        elem.points.length > 0
                      ) {
                        const dPath = elem.points
                          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
                          .join(" ");
                        return (
                          <path
                            key={elem.id}
                            d={dPath}
                            fill="none"
                            stroke={elem.color}
                            strokeWidth={elem.strokeWidth}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedElementId(elem.id);
                            }}
                            className={`transition-opacity cursor-pointer ${selectedElementId === elem.id ? "stroke-indigo-500 opacity-80" : ""}`}
                          />
                        );
                      } else if (
                        elem.type === "arrow" &&
                        elem.x1 !== undefined &&
                        elem.y1 !== undefined
                      ) {
                        const x1 = elem.x1;
                        const y1 = elem.y1;
                        const x2 = elem.x2 ?? x1;
                        const y2 = elem.y2 ?? y1;

                        return (
                          <g
                            key={elem.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedElementId(elem.id);
                            }}
                            className="cursor-pointer"
                          >
                            <line
                              x1={x1}
                              y1={y1}
                              x2={x2}
                              y2={y2}
                              stroke={elem.color}
                              strokeWidth={elem.strokeWidth}
                              markerEnd="url(#canvas-arrow)"
                              className={`transition-opacity ${selectedElementId === elem.id ? "stroke-indigo-500 opacity-80" : ""}`}
                            />
                            {elem.label && (
                              <text
                                x={(x1 + x2) / 2}
                                y={(y1 + y2) / 2 - 10}
                                fill={elem.color}
                                fontSize="12"
                                fontWeight="bold"
                                fontFamily="sans-serif"
                                textAnchor="middle"
                                className="select-none fill-indigo-600 dark:fill-indigo-400"
                              >
                                {elem.label}
                              </text>
                            )}
                          </g>
                        );
                      } else if (elem.type === "preset" && elem.presetSvgHtml) {
                        const xOffset = (elem.tx ?? 100) - 100;
                        const yOffset = (elem.ty ?? 100) - 100;
                        const rotateAngle = elem.rotate ?? 0;

                        return (
                          <g
                            key={elem.id}
                            transform={`translate(${xOffset}, ${yOffset}) rotate(${rotateAngle}, 100, 100)`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedElementId(elem.id);
                            }}
                            className="cursor-pointer group"
                          >
                            {/* Stripping any ambient absolute bounds in inner elements rendering */}
                            <g
                              dangerouslySetInnerHTML={{
                                __html: elem.presetSvgHtml
                                  .replace(/<svg[^>]*>/, "")
                                  .replace(/<\/svg>/, ""),
                              }}
                            />

                            {/* Selected feedback highlight bound border */}
                            {selectedElementId === elem.id && (
                              <rect
                                x="10"
                                y="10"
                                width="180"
                                height="180"
                                fill="none"
                                stroke="#6366f1"
                                strokeWidth="1.5"
                                strokeDasharray="4,4"
                                className="pointer-events-none"
                              />
                            )}
                          </g>
                        );
                      }
                      return null;
                    })}
                  </svg>

                  {elements.length === 0 && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 text-center text-gray-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/50">
                      <CompassIcon className="w-10 h-10 mb-2 text-gray-300 dark:text-slate-600 animate-pulse" />
                      <h4 className="font-bold text-sm text-gray-500 dark:text-slate-400">
                        Kanvas Sketsa Kosong
                      </h4>
                      <p className="text-xs max-w-sm mt-1 leading-normal">
                        Gunakan palet pensil di sebelah kiri untuk melepaskan
                        imajinasimu, atau pilih **Preset Bentuk** terlebih
                        dahulu lalu klik "Kirim ke Kanvas" untuk berkreasi!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-2 bg-gray-50 dark:bg-slate-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleInsert}
            className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <span>Sisipkan ke Editor</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Internal icon helper to prevent missing packages
const CompassIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88" />
  </svg>
);
