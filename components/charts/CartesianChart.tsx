import React from "react";
import { ChartData, ChartPoint } from "../../types";

const COLORS = [
  "#2563eb", // blue-600
  "#dc2626", // red-600
  "#16a34a", // green-600
  "#d97706", // amber-600
  "#7c3aed", // violet-600
  "#0891b2", // cyan-600
  "#db2777", // pink-600
  "#475569", // slate-600
];

export const CartesianChart: React.FC<{ data: ChartData; className?: string }> = ({
  data,
  className = "",
}) => {
  const { datasets } = data;

  const config = {
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
    ...(data.cartesianConfig || {}),
  };

  const w = 450;
  const h = 450;
  const padding = 28;
  const graphW = w - 2 * padding;
  const graphH = h - 2 * padding;

  const xRange = config.xMax - config.xMin || 1;
  const yRange = config.yMax - config.yMin || 1;

  // Origin coords in SVG
  const originX = padding + (Math.abs(config.xMin) / xRange) * graphW;
  const originY = h - padding - (Math.abs(config.yMin) / yRange) * graphH;

  const mapX = (x: number) => padding + ((x - config.xMin) / xRange) * graphW;
  const mapY = (y: number) => h - padding - ((y - config.yMin) / yRange) * graphH;

  // Tick generation
  const xTicks: number[] = [];
  const xStep = Math.max(0.1, config.xStep || 1);
  for (let i = Math.ceil(config.xMin / xStep) * xStep; i <= config.xMax + 0.001; i += xStep) {
    const rounded = Math.round(i * 1000) / 1000;
    if (rounded >= config.xMin && rounded <= config.xMax) {
      xTicks.push(rounded);
    }
  }

  const yTicks: number[] = [];
  const yStep = Math.max(0.1, config.yStep || 1);
  for (let MathI = Math.ceil(config.yMin / yStep) * yStep; MathI <= config.yMax + 0.001; MathI += yStep) {
    const rounded = Math.round(MathI * 1000) / 1000;
    if (rounded >= config.yMin && rounded <= config.yMax) {
      yTicks.push(rounded);
    }
  }

  const getDashArray = (style?: "solid" | "dashed" | "dotted") => {
    if (style === "dashed") return "6,4";
    if (style === "dotted") return "2,3";
    return undefined;
  };

  return (
    <div className={`w-full flex flex-col items-center justify-center relative select-none ${className}`}>
      {data.title && (
        <div className="text-center font-bold text-slate-800 dark:text-slate-100 text-sm mb-1.5">
          {data.title}
        </div>
      )}
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full max-w-[450px] h-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"
      >
        <defs>
          <marker
            id="cartesian-arrow-x"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#334155" className="dark:fill-slate-400" />
          </marker>
          <marker
            id="cartesian-arrow-y"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#334155" className="dark:fill-slate-400" />
          </marker>
          <marker
            id="cartesian-arrow-line"
            markerWidth="8"
            markerHeight="6"
            refX="6"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#2563eb" />
          </marker>
        </defs>

        {/* Grid lines */}
        {config.showGrid !== false && (
          <g className="grid-lines" opacity="0.75">
            {xTicks.map((x) => (
              <line
                key={`gx-${x}`}
                x1={mapX(x)}
                y1={padding}
                x2={mapX(x)}
                y2={h - padding}
                stroke="#e2e8f0"
                className="dark:stroke-slate-800"
                strokeWidth={x === 0 ? "1.5" : "1"}
              />
            ))}
            {yTicks.map((y) => (
              <line
                key={`gy-${y}`}
                x1={padding}
                y1={mapY(y)}
                x2={w - padding}
                y2={mapY(y)}
                stroke="#e2e8f0"
                className="dark:stroke-slate-800"
                strokeWidth={y === 0 ? "1.5" : "1"}
              />
            ))}
          </g>
        )}

        {/* Axes */}
        <line
          x1={padding - 4}
          y1={originY}
          x2={w - padding + 12}
          y2={originY}
          stroke="#334155"
          className="dark:stroke-slate-300"
          strokeWidth="2"
          markerEnd="url(#cartesian-arrow-x)"
        />
        <line
          x1={originX}
          y1={h - padding + 4}
          x2={originX}
          y2={padding - 12}
          stroke="#334155"
          className="dark:stroke-slate-300"
          strokeWidth="2"
          markerEnd="url(#cartesian-arrow-y)"
        />

        {/* Axis Labels (X & Y) */}
        <text
          x={w - padding + 14}
          y={originY + 14}
          fontSize="13"
          fontWeight="700"
          fill="#334155"
          className="dark:fill-slate-200"
          fontStyle="italic"
        >
          {config.xLabel || "X"}
        </text>
        <text
          x={originX - 14}
          y={padding - 12}
          fontSize="13"
          fontWeight="700"
          fill="#334155"
          className="dark:fill-slate-200"
          fontStyle="italic"
        >
          {config.yLabel || "Y"}
        </text>

        {/* Ticks & Numbers */}
        {config.showAxisNumbers !== false && (
          <g className="axis-numbers">
            {xTicks.map(
              (x) =>
                x !== 0 && (
                  <g key={`tx-${x}`}>
                    <line
                      x1={mapX(x)}
                      y1={originY - 3}
                      x2={mapX(x)}
                      y2={originY + 3}
                      stroke="#475569"
                      className="dark:stroke-slate-400"
                      strokeWidth="1.5"
                    />
                    <text
                      x={mapX(x)}
                      y={originY + 14}
                      fontSize="9.5"
                      textAnchor="middle"
                      fill="#64748b"
                      className="dark:fill-slate-400"
                      fontWeight="600"
                    >
                      {x}
                    </text>
                  </g>
                ),
            )}
            {yTicks.map(
              (y) =>
                y !== 0 && (
                  <g key={`ty-${y}`}>
                    <line
                      x1={originX - 3}
                      y1={mapY(y)}
                      x2={originX + 3}
                      y2={mapY(y)}
                      stroke="#475569"
                      className="dark:stroke-slate-400"
                      strokeWidth="1.5"
                    />
                    <text
                      x={originX - 6}
                      y={mapY(y) + 3.5}
                      fontSize="9.5"
                      textAnchor="end"
                      fill="#64748b"
                      className="dark:fill-slate-400"
                      fontWeight="600"
                    >
                      {y}
                    </text>
                  </g>
                ),
            )}

            {/* Origin (0,0) label */}
            <text
              x={originX - 5}
              y={originY + 12}
              fontSize="9.5"
              textAnchor="end"
              fill="#64748b"
              className="dark:fill-slate-400"
              fontWeight="600"
            >
              0
            </text>
          </g>
        )}

        {/* Datasets Layer: Polygons, Shapes, Lines, Functions, Circles, Points */}
        {datasets.map((ds, dIdx) => {
          const color = ds.borderColor?.[0] || ds.backgroundColor?.[0] || COLORS[dIdx % COLORS.length];
          const fillColor = ds.fillColor || `${color}25`; // ~15% opacity hex fallback
          const strokeWidth = ds.lineWidth || (ds.isPolygon ? 2 : 2.5);
          const strokeDash = getDashArray(ds.lineStyle);

          // CIRCLE RENDERING
          if (ds.isCircle && ds.circleRadius && ds.circleRadius > 0) {
            const rawCenter = (ds.data?.[0] as ChartPoint) || { x: 0, y: 0 };
            const cx = typeof rawCenter.x === "number" ? rawCenter.x : 0;
            const cy = typeof rawCenter.y === "number" ? rawCenter.y : 0;
            const rVal = ds.circleRadius;

            const rxPx = (rVal / xRange) * graphW;
            const ryPx = (rVal / yRange) * graphH;

            const centerPxX = mapX(cx);
            const centerPxY = mapY(cy);
            const edgePxX = mapX(cx + rVal);

            return (
              <g key={`circle-${dIdx}`} className="cartesian-circle">
                <ellipse
                  cx={centerPxX}
                  cy={centerPxY}
                  rx={rxPx}
                  ry={ryPx}
                  fill={fillColor}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDash}
                />
                {/* Radius line indicator */}
                <line
                  x1={centerPxX}
                  y1={centerPxY}
                  x2={edgePxX}
                  y2={centerPxY}
                  stroke={color}
                  strokeWidth="1.5"
                  strokeDasharray="3,3"
                />
                <text
                  x={(centerPxX + edgePxX) / 2}
                  y={centerPxY - 4}
                  fontSize="10"
                  fontWeight="bold"
                  fill={color}
                  textAnchor="middle"
                >
                  r = {rVal}
                </text>
                {/* Center dot */}
                <circle cx={centerPxX} cy={centerPxY} r="3.5" fill={color} stroke="#fff" strokeWidth="1" />
                <text
                  x={centerPxX + 6}
                  y={centerPxY + 12}
                  fontSize="10"
                  fontWeight="bold"
                  fill={color}
                >
                  {rawCenter.label || `P(${cx}, ${cy})`}
                </text>
              </g>
            );
          }

          // FUNCTION PLOT RENDERING
          if (ds.isFunction && ds.functionStr) {
            const segments: { x: number; y: number }[][] = [];
            let currentSegment: { x: number; y: number }[] = [];

            const startX = typeof ds.domainMin === "number" ? Math.max(config.xMin, ds.domainMin) : config.xMin;
            const endX = typeof ds.domainMax === "number" ? Math.min(config.xMax, ds.domainMax) : config.xMax;
            const totalSteps = 220;
            const step = (endX - startX) / totalSteps;

            let prevY: number | null = null;

            for (let x = startX; x <= endX + step * 0.5; x += step) {
              try {
                let fStr = ds.functionStr.toLowerCase().replace(/\s+/g, "");
                if (fStr.startsWith("y=")) fStr = fStr.substring(2);
                else if (fStr.startsWith("f(x)=")) fStr = fStr.substring(5);
                else if (fStr.endsWith("=0")) fStr = fStr.substring(0, fStr.length - 2);
                else if (fStr.startsWith("0=")) fStr = fStr.substring(2);
                else if (fStr.endsWith("=y")) fStr = fStr.substring(0, fStr.length - 2);

                // Basic substitutions: 2x -> 2*x, x^2 -> x**2, (x+1)(x-1) -> (x+1)*(x-1)
                let f = fStr
                  .replace(/(\d+)x/g, "$1*x")
                  .replace(/x(\d+)/g, "x*$1")
                  .replace(/\)\(/g, ")*(")
                  .replace(/(\d+)\(/g, "$1*(")
                  .replace(/\)(x|\d+)/g, ")*$1")
                  .replace(/\^/g, "**");

                const mathFuncs = [
                  "sin",
                  "cos",
                  "tan",
                  "asin",
                  "acos",
                  "atan",
                  "sqrt",
                  "cbrt",
                  "abs",
                  "log10",
                  "log",
                  "exp",
                ];
                mathFuncs.forEach((mf) => {
                  f = f.split(mf).join(`Math.${mf}`);
                  f = f.split(`Math.Math.${mf}`).join(`Math.${mf}`);
                });
                f = f.replace(/\bpi\b/g, "Math.PI").replace(/\be\b/g, "Math.E");

                // Evaluate safely
                const calc = new Function("x", `"use strict"; return (${f});`);
                const y = Number(calc(x));

                // Check bounds & asymptotes
                const isOutOfFarBounds = isNaN(y) || !isFinite(y) || Math.abs(y) > Math.max(Math.abs(config.yMax), Math.abs(config.yMin)) * 4;
                const isAsymptoteJump = prevY !== null && Math.abs(y - prevY) > yRange * 0.8 && ((y > 0 && prevY < 0) || (y < 0 && prevY > 0));

                if (isOutOfFarBounds || isAsymptoteJump) {
                  if (currentSegment.length > 1) {
                    segments.push(currentSegment);
                  }
                  currentSegment = [];
                  prevY = null;
                } else {
                  currentSegment.push({ x, y });
                  prevY = y;
                }
              } catch {
                if (currentSegment.length > 1) {
                  segments.push(currentSegment);
                }
                currentSegment = [];
                prevY = null;
              }
            }

            if (currentSegment.length > 1) {
              segments.push(currentSegment);
            }

            return (
              <g key={`func-${dIdx}`} className="cartesian-function">
                {segments.map((seg, sIdx) => (
                  <polyline
                    key={`seg-${sIdx}`}
                    points={seg.map((pt) => `${mapX(pt.x)},${mapY(pt.y)}`).join(" ")}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDash}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
                {ds.label && segments.length > 0 && segments[0].length > 0 && (
                  <text
                    x={mapX(segments[0][Math.floor(segments[0].length / 2)].x)}
                    y={mapY(segments[0][Math.floor(segments[0].length / 2)].y) - 8}
                    fontSize="11"
                    fontWeight="bold"
                    fill={color}
                    textAnchor="middle"
                    className="drop-shadow-sm font-mono"
                  >
                    {ds.label}
                  </text>
                )}
              </g>
            );
          }

          // POINTS / POLYGONS / LINES RENDERING
          const points: ChartPoint[] = (ds.data || []).map((p: any) => {
            if (typeof p === "object" && p !== null && "x" in p && "y" in p) {
              return {
                x: Number(p.x) || 0,
                y: Number(p.y) || 0,
                label: p.label,
                pointStyle: p.pointStyle,
                color: p.color,
              };
            }
            if (Array.isArray(p) && p.length >= 2) {
              return { x: Number(p[0]) || 0, y: Number(p[1]) || 0 };
            }
            return { x: 0, y: 0 };
          });

          if (points.length === 0) return null;

          // CLOSED POLYGON (Bangun Datar Geometri: Segitiga, Segiempat, Trapesium, dll)
          if (ds.isPolygon && points.length >= 3) {
            const polyPointsStr = points.map((pt) => `${mapX(pt.x)},${mapY(pt.y)}`).join(" ");

            // Calculate centroid for polygon label
            const centroidX = points.reduce((acc, p) => acc + p.x, 0) / points.length;
            const centroidY = points.reduce((acc, p) => acc + p.y, 0) / points.length;

            return (
              <g key={`poly-${dIdx}`} className="cartesian-polygon">
                <polygon
                  points={polyPointsStr}
                  fill={fillColor}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDash}
                  strokeLinejoin="round"
                />

                {/* Shape Center Label */}
                {ds.label && ds.label !== `Dataset ${dIdx + 1}` && (
                  <g transform={`translate(${mapX(centroidX)}, ${mapY(centroidY)})`}>
                    <rect
                      x="-36"
                      y="-10"
                      width="72"
                      height="20"
                      rx="4"
                      fill="rgba(255, 255, 255, 0.85)"
                      className="dark:fill-slate-900/85"
                      stroke={color}
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="4"
                      fontSize="10"
                      fontWeight="bold"
                      fill={color}
                      textAnchor="middle"
                    >
                      {ds.label}
                    </text>
                  </g>
                )}

                {/* Vertices */}
                {points.map((pt, pIdx) => {
                  const ptColor = pt.color || color;
                  const ptX = mapX(pt.x);
                  const ptY = mapY(pt.y);
                  const vertexLabel = pt.label || (points.length <= 8 ? String.fromCharCode(65 + pIdx) : "");

                  return (
                    <g key={`poly-vert-${dIdx}-${pIdx}`}>
                      <circle
                        cx={ptX}
                        cy={ptY}
                        r="4"
                        fill={pt.pointStyle === "hollow" ? "#fff" : ptColor}
                        stroke={ptColor}
                        strokeWidth="1.5"
                      />
                      {vertexLabel && (
                        <text
                          x={ptX + (pt.x >= centroidX ? 7 : -7)}
                          y={ptY + (pt.y >= centroidY ? -7 : 14)}
                          fontSize="11"
                          fontWeight="bold"
                          fill={ptColor}
                          textAnchor={pt.x >= centroidX ? "start" : "end"}
                        >
                          {vertexLabel}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          }

          // CONNECTED LINE / SEGMENT / VECTOR
          const hasLine = ds.showLine || ds.kind === "line";

          return (
            <g key={`ds-${dIdx}`} className="cartesian-points-and-line">
              {hasLine && points.length > 1 && (
                <polyline
                  points={points.map((pt) => `${mapX(pt.x)},${mapY(pt.y)}`).join(" ")}
                  fill="none"
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDash}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  markerEnd={ds.showArrows ? "url(#cartesian-arrow-line)" : undefined}
                />
              )}

              {/* Points markers */}
              {points.map((pt, pIdx) => {
                if (pt.pointStyle === "none") return null;

                const ptColor = pt.color || color;
                const ptX = mapX(pt.x);
                const ptY = mapY(pt.y);

                return (
                  <g key={`pt-${dIdx}-${pIdx}`}>
                    {pt.pointStyle === "hollow" ? (
                      <circle
                        cx={ptX}
                        cy={ptY}
                        r="4.5"
                        fill="#fff"
                        className="dark:fill-slate-900"
                        stroke={ptColor}
                        strokeWidth="2"
                      />
                    ) : pt.pointStyle === "cross" ? (
                      <g stroke={ptColor} strokeWidth="2">
                        <line x1={ptX - 4} y1={ptY - 4} x2={ptX + 4} y2={ptY + 4} />
                        <line x1={ptX - 4} y1={ptY + 4} x2={ptX + 4} y2={ptY - 4} />
                      </g>
                    ) : (
                      <circle
                        cx={ptX}
                        cy={ptY}
                        r="4.5"
                        fill={ptColor}
                        stroke="#fff"
                        className="dark:stroke-slate-900"
                        strokeWidth="1.5"
                      />
                    )}

                    {/* Coordinate or Custom Label */}
                    <text
                      x={ptX + 6}
                      y={ptY - 6}
                      fontSize="11"
                      fontWeight="bold"
                      fill={ptColor}
                      className="drop-shadow-sm select-none"
                    >
                      {pt.label || `(${pt.x}, ${pt.y})`}
                    </text>
                  </g>
                );
              })}

              {/* Line Label */}
              {ds.label &&
                ds.label !== `Dataset ${dIdx + 1}` &&
                ds.label !== "Titik Data" &&
                points.length > 0 && (
                  <text
                    x={mapX(points[Math.floor(points.length / 2)]?.x || 0)}
                    y={mapY(points[Math.floor(points.length / 2)]?.y || 0) - 10}
                    fontSize="11"
                    fontWeight="bold"
                    fill={color}
                    textAnchor="middle"
                  >
                    {ds.label}
                  </text>
                )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
