import React from "react";
import { CartesianConfig, ChartDataset, ChartPoint, ChartData } from "../../../types";
import { CartesianChart } from "../../charts/CartesianChart";
import { TrashIcon, PlusCircleIcon } from "../../Icons";

const PALETTE = [
  { name: "Biru", color: "#2563eb", fill: "rgba(37, 99, 235, 0.2)" },
  { name: "Merah", color: "#dc2626", fill: "rgba(220, 38, 38, 0.2)" },
  { name: "Hijau", color: "#16a34a", fill: "rgba(22, 163, 74, 0.2)" },
  { name: "Oranye", color: "#d97706", fill: "rgba(217, 119, 6, 0.2)" },
  { name: "Ungu", color: "#7c3aed", fill: "rgba(124, 58, 237, 0.2)" },
  { name: "Cyan", color: "#0891b2", fill: "rgba(8, 145, 178, 0.2)" },
  { name: "Slate", color: "#475569", fill: "rgba(71, 85, 105, 0.2)" },
];

interface CartesianEditorProps {
  title: string;
  cartesianConfig: CartesianConfig;
  setCartesianConfig: (config: CartesianConfig) => void;
  datasets: ChartDataset[];
  setDatasets: (datasets: ChartDataset[]) => void;
}

export const CartesianEditor: React.FC<CartesianEditorProps> = ({
  title,
  cartesianConfig,
  setCartesianConfig,
  datasets,
  setDatasets,
}) => {
  // Safe Cartesian Config
  const safeConfig: CartesianConfig = {
    xMin: -10,
    xMax: 10,
    yMin: -10,
    yMax: 10,
    xStep: 1,
    yStep: 1,
    showGrid: true,
    showAxisNumbers: true,
    xLabel: "X",
    yLabel: "Y",
    ...(cartesianConfig || {}),
  };

  // Preview data object
  const previewData: ChartData = {
    type: "cartesian",
    title: title || undefined,
    labels: ["X", "Y"],
    datasets,
    cartesianConfig: safeConfig,
  };

  // Quick Preset Handlers
  const handleAddPresetTriangle = () => {
    const newDs: ChartDataset = {
      label: "Segitiga ABC",
      kind: "polygon",
      isPolygon: true,
      fill: true,
      fillColor: "rgba(37, 99, 235, 0.2)",
      backgroundColor: ["#2563eb"],
      borderColor: ["#2563eb"],
      lineWidth: 2,
      data: [
        { x: 1, y: 1, label: "A(1,1)" },
        { x: 7, y: 1, label: "B(7,1)" },
        { x: 4, y: 6, label: "C(4,6)" },
      ],
    };
    setDatasets([...datasets, newDs]);
  };

  const handleAddPresetRectangle = () => {
    const newDs: ChartDataset = {
      label: "Persegi Panjang ABCD",
      kind: "polygon",
      isPolygon: true,
      fill: true,
      fillColor: "rgba(22, 163, 74, 0.2)",
      backgroundColor: ["#16a34a"],
      borderColor: ["#16a34a"],
      lineWidth: 2,
      data: [
        { x: 1, y: 1, label: "A" },
        { x: 6, y: 1, label: "B" },
        { x: 6, y: 5, label: "C" },
        { x: 1, y: 5, label: "D" },
      ],
    };
    setDatasets([...datasets, newDs]);
  };

  const handleAddPresetTrapezoid = () => {
    const newDs: ChartDataset = {
      label: "Trapesium",
      kind: "polygon",
      isPolygon: true,
      fill: true,
      fillColor: "rgba(217, 119, 6, 0.2)",
      backgroundColor: ["#d97706"],
      borderColor: ["#d97706"],
      lineWidth: 2,
      data: [
        { x: 1, y: 1, label: "A(1,1)" },
        { x: 8, y: 1, label: "B(8,1)" },
        { x: 6, y: 5, label: "C(6,5)" },
        { x: 3, y: 5, label: "D(3,5)" },
      ],
    };
    setDatasets([...datasets, newDs]);
  };

  const handleAddPresetLine = () => {
    const newDs: ChartDataset = {
      label: "Ruas Garis PQ",
      kind: "line",
      showLine: true,
      lineStyle: "solid",
      backgroundColor: ["#dc2626"],
      borderColor: ["#dc2626"],
      lineWidth: 2.5,
      showArrows: true,
      data: [
        { x: -4, y: -2, label: "P(-4,-2)" },
        { x: 5, y: 4, label: "Q(5,4)" },
      ],
    };
    setDatasets([...datasets, newDs]);
  };

  const handleAddPresetParabola = () => {
    const newDs: ChartDataset = {
      label: "f(x) = x² - 4",
      kind: "function",
      isFunction: true,
      functionStr: "x^2 - 4",
      backgroundColor: ["#7c3aed"],
      borderColor: ["#7c3aed"],
      lineWidth: 2.5,
      data: [],
    };
    setDatasets([...datasets, newDs]);
  };

  const handleAddPresetCircle = () => {
    const newDs: ChartDataset = {
      label: "Lingkaran Pusat O",
      kind: "circle",
      isCircle: true,
      circleRadius: 4,
      fill: true,
      fillColor: "rgba(8, 145, 178, 0.2)",
      backgroundColor: ["#0891b2"],
      borderColor: ["#0891b2"],
      lineWidth: 2,
      data: [{ x: 0, y: 0, label: "O(0,0)" }],
    };
    setDatasets([...datasets, newDs]);
  };

  const handleAddPresetPoints = () => {
    const newDs: ChartDataset = {
      label: "Titik Koordinat",
      kind: "point",
      showLine: false,
      backgroundColor: ["#2563eb"],
      borderColor: ["#2563eb"],
      data: [
        { x: 2, y: 3, label: "A(2,3)", pointStyle: "solid" },
        { x: -3, y: 4, label: "B(-3,4)", pointStyle: "solid" },
        { x: -2, y: -3, label: "C(-2,-3)", pointStyle: "hollow" },
        { x: 4, y: -2, label: "D(4,-2)", pointStyle: "solid" },
      ],
    };
    setDatasets([...datasets, newDs]);
  };

  // Dataset item modifiers
  const updateDataset = (idx: number, patch: Partial<ChartDataset>) => {
    const next = [...datasets];
    next[idx] = { ...next[idx], ...patch };
    setDatasets(next);
  };

  const deleteDataset = (idx: number) => {
    if (datasets.length <= 1) return;
    const next = [...datasets];
    next.splice(idx, 1);
    setDatasets(next);
  };

  const addPointToDataset = (idx: number) => {
    const ds = datasets[idx];
    const pts = [...((ds.data as ChartPoint[]) || [])];
    const letter = pts.length < 26 ? String.fromCharCode(65 + pts.length) : `P${pts.length + 1}`;
    pts.push({ x: 0, y: 0, label: letter, pointStyle: "solid" });
    updateDataset(idx, { data: pts });
  };

  const updatePoint = (dsIdx: number, ptIdx: number, patch: Partial<ChartPoint>) => {
    const ds = datasets[dsIdx];
    const pts = [...((ds.data as ChartPoint[]) || [])];
    pts[ptIdx] = { ...(pts[ptIdx] || { x: 0, y: 0 }), ...patch };
    updateDataset(dsIdx, { data: pts });
  };

  const deletePoint = (dsIdx: number, ptIdx: number) => {
    const ds = datasets[dsIdx];
    const pts = [...((ds.data as ChartPoint[]) || [])];
    pts.splice(ptIdx, 1);
    updateDataset(dsIdx, { data: pts });
  };

  return (
    <div className="space-y-6">
      {/* 2-Column Responsive Layout: Controls on Left, Live SVG Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form & Presets (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Quick Shape & Element Templates */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800/80 dark:to-indigo-950/40 p-4 rounded-2xl border border-blue-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                <span>⚡</span> Template Elemen Cepat (1-Klik)
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Klik untuk menambahkan
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleAddPresetTriangle}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>📐</span> Segitiga
              </button>
              <button
                type="button"
                onClick={handleAddPresetRectangle}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-green-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>⏹️</span> Segiempat
              </button>
              <button
                type="button"
                onClick={handleAddPresetTrapezoid}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>⏢</span> Trapesium
              </button>
              <button
                type="button"
                onClick={handleAddPresetLine}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>📏</span> Ruas Garis
              </button>
              <button
                type="button"
                onClick={handleAddPresetCircle}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-cyan-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>⭕</span> Lingkaran
              </button>
              <button
                type="button"
                onClick={handleAddPresetParabola}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-violet-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>📈</span> Fungsi Parabola
              </button>
              <button
                type="button"
                onClick={handleAddPresetPoints}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>📍</span> Titik Koordinat
              </button>
            </div>
          </div>

          {/* Coordinate System Boundaries & Grid */}
          <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b dark:border-slate-700 pb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                ⚙️ Rentang Sumbu &amp; Skala Kisi
              </span>
              <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={safeConfig.showGrid !== false}
                    onChange={(e) =>
                      setCartesianConfig({ ...safeConfig, showGrid: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  Kisi-kisi
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={safeConfig.showAxisNumbers !== false}
                    onChange={(e) =>
                      setCartesianConfig({ ...safeConfig, showAxisNumbers: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  Angka Sumbu
                </label>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-0.5">X Min</label>
                <input
                  type="number"
                  value={safeConfig.xMin}
                  onChange={(e) =>
                    setCartesianConfig({ ...safeConfig, xMin: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full p-1.5 text-xs text-center font-bold border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-0.5">X Max</label>
                <input
                  type="number"
                  value={safeConfig.xMax}
                  onChange={(e) =>
                    setCartesianConfig({ ...safeConfig, xMax: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full p-1.5 text-xs text-center font-bold border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-0.5">Y Min</label>
                <input
                  type="number"
                  value={safeConfig.yMin}
                  onChange={(e) =>
                    setCartesianConfig({ ...safeConfig, yMin: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full p-1.5 text-xs text-center font-bold border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-0.5">Y Max</label>
                <input
                  type="number"
                  value={safeConfig.yMax}
                  onChange={(e) =>
                    setCartesianConfig({ ...safeConfig, yMax: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full p-1.5 text-xs text-center font-bold border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-0.5">Langkah X</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={safeConfig.xStep}
                  onChange={(e) =>
                    setCartesianConfig({
                      ...safeConfig,
                      xStep: Math.max(0.1, parseFloat(e.target.value) || 1),
                    })
                  }
                  className="w-full p-1.5 text-xs text-center font-bold border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-0.5">Langkah Y</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={safeConfig.yStep}
                  onChange={(e) =>
                    setCartesianConfig({
                      ...safeConfig,
                      yStep: Math.max(0.1, parseFloat(e.target.value) || 1),
                    })
                  }
                  className="w-full p-1.5 text-xs text-center font-bold border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* List of Datasets / Shapes */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>🎨</span> Daftar Elemen Diagram ({datasets.length})
              </h3>
              <button
                type="button"
                onClick={() => {
                  setDatasets([
                    ...datasets,
                    {
                      label: `Elemen ${datasets.length + 1}`,
                      kind: "polygon",
                      isPolygon: true,
                      fill: true,
                      fillColor: "rgba(37, 99, 235, 0.2)",
                      backgroundColor: ["#2563eb"],
                      borderColor: ["#2563eb"],
                      data: [
                        { x: 0, y: 0, label: "A" },
                        { x: 4, y: 0, label: "B" },
                        { x: 2, y: 3, label: "C" },
                      ],
                    },
                  ]);
                }}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-xl font-bold hover:bg-blue-700 transition flex items-center gap-1 shadow-sm"
              >
                <PlusCircleIcon className="w-3.5 h-3.5" /> Tambah Elemen Bebas
              </button>
            </div>

            {datasets.map((ds, idx) => {
              const activeColor = ds.borderColor?.[0] || ds.backgroundColor?.[0] || "#2563eb";
              const currentKind =
                ds.kind ||
                (ds.isCircle
                  ? "circle"
                  : ds.isFunction
                  ? "function"
                  : ds.isPolygon
                  ? "polygon"
                  : ds.showLine
                  ? "line"
                  : "point");

              return (
                <div
                  key={`cart-ds-${idx}`}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm space-y-3 transition-all"
                >
                  {/* Top Bar: Title, Kind Selector & Delete */}
                  <div className="flex flex-wrap items-center gap-2 pb-2.5 border-b dark:border-slate-700">
                    <input
                      type="text"
                      value={ds.label || ""}
                      onChange={(e) => updateDataset(idx, { label: e.target.value })}
                      placeholder="Nama elemen / bangun..."
                      className="flex-1 min-w-[140px] p-1.5 text-xs font-bold border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                    />

                    {/* Kind Selector */}
                    <select
                      value={currentKind}
                      onChange={(e) => {
                        const nextKind = e.target.value as
                          | "polygon"
                          | "line"
                          | "point"
                          | "function"
                          | "circle";
                        if (nextKind === "polygon") {
                          updateDataset(idx, {
                            kind: "polygon",
                            isPolygon: true,
                            isCircle: false,
                            isFunction: false,
                            showLine: true,
                            fill: true,
                            fillColor: ds.fillColor || `${activeColor}30`,
                            data:
                              ds.data?.length >= 3
                                ? ds.data
                                : [
                                    { x: 1, y: 1, label: "A" },
                                    { x: 5, y: 1, label: "B" },
                                    { x: 3, y: 4, label: "C" },
                                  ],
                          });
                        } else if (nextKind === "line") {
                          updateDataset(idx, {
                            kind: "line",
                            isPolygon: false,
                            isCircle: false,
                            isFunction: false,
                            showLine: true,
                            fill: false,
                            data:
                              ds.data?.length >= 2
                                ? ds.data
                                : [
                                    { x: -3, y: -2, label: "A" },
                                    { x: 4, y: 3, label: "B" },
                                  ],
                          });
                        } else if (nextKind === "point") {
                          updateDataset(idx, {
                            kind: "point",
                            isPolygon: false,
                            isCircle: false,
                            isFunction: false,
                            showLine: false,
                            fill: false,
                            data: ds.data?.length >= 1 ? ds.data : [{ x: 2, y: 3, label: "A(2,3)" }],
                          });
                        } else if (nextKind === "function") {
                          updateDataset(idx, {
                            kind: "function",
                            isFunction: true,
                            isPolygon: false,
                            isCircle: false,
                            showLine: true,
                            functionStr: ds.functionStr || "2x + 1",
                          });
                        } else if (nextKind === "circle") {
                          updateDataset(idx, {
                            kind: "circle",
                            isCircle: true,
                            circleRadius: ds.circleRadius || 3,
                            isPolygon: false,
                            isFunction: false,
                            fill: true,
                            fillColor: ds.fillColor || `${activeColor}25`,
                            data: ds.data?.length >= 1 ? [ds.data[0]] : [{ x: 0, y: 0, label: "P(0,0)" }],
                          });
                        }
                      }}
                      className="p-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border rounded-lg outline-none"
                    >
                      <option value="polygon">📐 Bangun Poligon (Segitiga/Segiempat)</option>
                      <option value="line">📏 Garis / Ruas Garis</option>
                      <option value="point">📍 Titik-Titik Koordinat</option>
                      <option value="function">📈 Grafik Fungsi f(x)</option>
                      <option value="circle">⭕ Lingkaran (Pusat &amp; Jari-jari)</option>
                    </select>

                    {/* Color Picker Palette */}
                    <div className="flex items-center gap-1">
                      {PALETTE.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          title={p.name}
                          onClick={() =>
                            updateDataset(idx, {
                              backgroundColor: [p.color],
                              borderColor: [p.color],
                              fillColor: p.fill,
                            })
                          }
                          className={`w-5 h-5 rounded-full border-2 transition-transform ${
                            activeColor === p.color
                              ? "scale-110 border-slate-900 dark:border-white shadow-sm"
                              : "border-transparent hover:scale-105"
                          }`}
                          style={{ backgroundColor: p.color }}
                        />
                      ))}
                    </div>

                    {datasets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => deleteDataset(idx)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                        title="Hapus Elemen"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* ELEMENT CONTROLS BASED ON KIND */}

                  {/* 1. FUNCTION MODE */}
                  {currentKind === "function" && (
                    <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Rumus Fungsi Matematika f(x):
                        </label>
                        <input
                          type="text"
                          value={ds.functionStr || ""}
                          onChange={(e) => updateDataset(idx, { functionStr: e.target.value })}
                          placeholder="misal: 2x + 1, x^2 - 4, sin(x), sqrt(x)"
                          className="w-full p-2 text-sm font-mono border rounded-lg dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                        />
                      </div>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[11px] text-slate-500 font-medium">Contoh:</span>
                        {["2x + 1", "x^2 - 4", "-x + 3", "sin(x)", "cos(x)", "abs(x)", "sqrt(x)"].map(
                          (sample) => (
                            <button
                              key={sample}
                              type="button"
                              onClick={() => updateDataset(idx, { functionStr: sample })}
                              className="text-[10px] px-2 py-0.5 bg-white dark:bg-slate-800 border rounded hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono"
                            >
                              {sample}
                            </button>
                          ),
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-1 border-t dark:border-slate-700">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500">
                            Gaya Garis
                          </label>
                          <select
                            value={ds.lineStyle || "solid"}
                            onChange={(e) =>
                              updateDataset(idx, { lineStyle: e.target.value as any })
                            }
                            className="w-full p-1 text-xs border rounded dark:bg-slate-800 dark:text-white"
                          >
                            <option value="solid">Padat (Solid)</option>
                            <option value="dashed">Putus-putus (Dashed)</option>
                            <option value="dotted">Titik-titik (Dotted)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500">
                            Ketebalan Garis
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={ds.lineWidth || 2.5}
                            onChange={(e) =>
                              updateDataset(idx, { lineWidth: parseFloat(e.target.value) })
                            }
                            className="w-full mt-1.5 accent-blue-600"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. CIRCLE MODE */}
                  {currentKind === "circle" && (
                    <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500">
                            Pusat X
                          </label>
                          <input
                            type="number"
                            value={(ds.data?.[0] as ChartPoint)?.x || 0}
                            onChange={(e) =>
                              updateDataset(idx, {
                                data: [
                                  {
                                    ...((ds.data?.[0] as ChartPoint) || { x: 0, y: 0 }),
                                    x: parseFloat(e.target.value) || 0,
                                  },
                                ],
                              })
                            }
                            className="w-full p-1.5 text-xs text-center font-bold border rounded dark:bg-slate-800 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500">
                            Pusat Y
                          </label>
                          <input
                            type="number"
                            value={(ds.data?.[0] as ChartPoint)?.y || 0}
                            onChange={(e) =>
                              updateDataset(idx, {
                                data: [
                                  {
                                    ...((ds.data?.[0] as ChartPoint) || { x: 0, y: 0 }),
                                    y: parseFloat(e.target.value) || 0,
                                  },
                                ],
                              })
                            }
                            className="w-full p-1.5 text-xs text-center font-bold border rounded dark:bg-slate-800 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500">
                            Jari-jari (r)
                          </label>
                          <input
                            type="number"
                            min="0.5"
                            step="0.5"
                            value={ds.circleRadius || 3}
                            onChange={(e) =>
                              updateDataset(idx, {
                                circleRadius: Math.max(0.1, parseFloat(e.target.value) || 1),
                              })
                            }
                            className="w-full p-1.5 text-xs text-center font-bold border rounded dark:bg-slate-800 dark:text-white"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-medium">
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={ds.fill !== false}
                            onChange={(e) => updateDataset(idx, { fill: e.target.checked })}
                            className="rounded text-blue-600"
                          />
                          Arsir Daerah Lingkaran
                        </label>
                        <select
                          value={ds.lineStyle || "solid"}
                          onChange={(e) => updateDataset(idx, { lineStyle: e.target.value as any })}
                          className="p-1 text-xs border rounded dark:bg-slate-800 dark:text-white"
                        >
                          <option value="solid">Garis Lingkaran Solid</option>
                          <option value="dashed">Garis Putus-putus</option>
                          <option value="dotted">Garis Titik-titik</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* 3. POLYGON / LINE / POINT MODES */}
                  {(currentKind === "polygon" || currentKind === "line" || currentKind === "point") && (
                    <div className="space-y-3">
                      {/* Controls row */}
                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        {currentKind === "polygon" && (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-600 dark:text-slate-300">
                              Arsiran:
                            </span>
                            <input
                              type="color"
                              value={
                                activeColor.startsWith("#") && activeColor.length === 7
                                  ? activeColor
                                  : "#2563eb"
                              }
                              onChange={(e) =>
                                updateDataset(idx, {
                                  backgroundColor: [e.target.value],
                                  borderColor: [e.target.value],
                                  fillColor: `${e.target.value}30`,
                                })
                              }
                              className="w-6 h-6 rounded cursor-pointer border-0"
                            />
                            <span className="text-[11px] text-slate-500">Transparan (Fill)</span>
                          </div>
                        )}

                        {currentKind === "line" && (
                          <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                            <input
                              type="checkbox"
                              checked={ds.showArrows || false}
                              onChange={(e) => updateDataset(idx, { showArrows: e.target.checked })}
                              className="rounded text-blue-600"
                            />
                            Panah Vektor / Sinar Garis (→)
                          </label>
                        )}

                        <div className="flex items-center gap-2 ml-auto">
                          <label className="text-[11px] text-slate-500 font-medium">Gaya:</label>
                          <select
                            value={ds.lineStyle || "solid"}
                            onChange={(e) =>
                              updateDataset(idx, { lineStyle: e.target.value as any })
                            }
                            className="p-1 text-xs border rounded dark:bg-slate-800 dark:text-white"
                          >
                            <option value="solid">Garis Padat (Solid)</option>
                            <option value="dashed">Garis Putus-putus</option>
                            <option value="dotted">Garis Titik-titik</option>
                          </select>
                        </div>
                      </div>

                      {/* Points / Vertices Table */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-300">
                          <span>
                            {currentKind === "polygon"
                              ? "Titik Sudut Bangun Datar"
                              : currentKind === "line"
                              ? "Titik Penghubung Garis"
                              : "Titik-Titik Koordinat"}
                          </span>
                          <button
                            type="button"
                            onClick={() => addPointToDataset(idx)}
                            className="text-xs text-blue-600 font-bold hover:text-blue-700 flex items-center gap-1"
                          >
                            <PlusCircleIcon className="w-3.5 h-3.5" /> + Tambah Titik
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {((ds.data as ChartPoint[]) || []).map((pt, pIdx) => (
                            <div
                              key={`pt-row-${idx}-${pIdx}`}
                              className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200 dark:border-slate-700"
                            >
                              {/* Label Nama Titik */}
                              <input
                                type="text"
                                value={pt.label || ""}
                                onChange={(e) =>
                                  updatePoint(idx, pIdx, { label: e.target.value })
                                }
                                placeholder={String.fromCharCode(65 + pIdx)}
                                className="w-14 p-1 text-xs text-center font-bold border rounded dark:bg-slate-800 dark:text-white"
                                title="Nama Titik (A, B, P, dll)"
                              />

                              {/* Coordinate Inputs (X, Y) */}
                              <div className="flex items-center gap-1 flex-1 font-mono text-xs">
                                <span className="text-slate-400 font-bold">(</span>
                                <input
                                  type="number"
                                  value={pt.x}
                                  onChange={(e) =>
                                    updatePoint(idx, pIdx, {
                                      x: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full p-1 text-xs text-center border rounded dark:bg-slate-800 dark:text-white"
                                  placeholder="x"
                                />
                                <span className="text-slate-400 font-bold">,</span>
                                <input
                                  type="number"
                                  value={pt.y}
                                  onChange={(e) =>
                                    updatePoint(idx, pIdx, {
                                      y: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full p-1 text-xs text-center border rounded dark:bg-slate-800 dark:text-white"
                                  placeholder="y"
                                />
                                <span className="text-slate-400 font-bold">)</span>
                              </div>

                              {/* Point style (solid / hollow) for points mode */}
                              {currentKind === "point" && (
                                <select
                                  value={pt.pointStyle || "solid"}
                                  onChange={(e) =>
                                    updatePoint(idx, pIdx, {
                                      pointStyle: e.target.value as any,
                                    })
                                  }
                                  className="p-1 text-[11px] border rounded dark:bg-slate-800 dark:text-white"
                                  title="Gaya Titik"
                                >
                                  <option value="solid">Padat</option>
                                  <option value="hollow">Kosong</option>
                                  <option value="cross">Silang ✕</option>
                                </select>
                              )}

                              <button
                                type="button"
                                onClick={() => deletePoint(idx, pIdx)}
                                className="text-slate-400 hover:text-red-500 font-bold px-1 text-sm"
                                title="Hapus Titik"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Live Interactive SVG Preview (5 cols) Sticky */}
        <div className="lg:col-span-5 sticky top-2 space-y-3">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-md">
            <div className="flex items-center justify-between mb-3 border-b dark:border-slate-700 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Pratinjau Langsung (Live SVG)
              </span>
              <span className="text-[11px] text-slate-400">
                Skala otomatis
              </span>
            </div>

            {/* Live Chart Rendering */}
            <div className="flex justify-center items-center py-2">
              <CartesianChart data={previewData} className="max-w-[380px]" />
            </div>

            <div className="mt-3 p-2.5 bg-blue-50/70 dark:bg-slate-900/50 rounded-xl border border-blue-100 dark:border-slate-700/80 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
              <span className="text-blue-500 text-sm">💡</span>
              <div>
                Diagram ini mendukung poligon bidang tertutup (arsiran luas), garis &amp; panah vektor, lingkaran, titik koordinat, serta kurva fungsi matematika $f(x)$.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
