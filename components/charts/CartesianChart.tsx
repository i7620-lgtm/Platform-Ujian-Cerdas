import React from "react";
import { ChartData } from "../../types";

export const CartesianChart: React.FC<{ data: ChartData }> = ({ data }) => {
  const { labels, datasets } = data;
      
        const config = data.cartesianConfig || {
          xMin: -10,
          xMax: 10,
          yMin: -10,
          yMax: 10,
          xStep: 1,
          yStep: 1,
        };
        const w = 400;
        const h = 400;
        const padding = 20;
        const graphW = w - 2 * padding;
        const graphH = h - 2 * padding;

        const xRange = config.xMax - config.xMin;
        const yRange = config.yMax - config.yMin;

        // Origin coords in SVG
        const originX = padding + (Math.abs(config.xMin) / xRange) * graphW;
        const originY = h - padding - (Math.abs(config.yMin) / yRange) * graphH;

        // Tick generation
        const xTicks = [];
        for (
          let i = Math.ceil(config.xMin);
          i <= Math.floor(config.xMax);
          i += config.xStep || 1
        ) {
          xTicks.push(i);
        }
        const yTicks = [];
        for (
          let MathI = Math.ceil(config.yMin);
          MathI <= Math.floor(config.yMax);
          MathI += config.yStep || 1
        ) {
          yTicks.push(MathI);
        }

        const mapX = (x: number) =>
          padding + ((x - config.xMin) / xRange) * graphW;
        const mapY = (y: number) =>
          h - padding - ((y - config.yMin) / yRange) * graphH;

        return (
          <div className="w-full h-auto flex items-center justify-center relative">
            <svg
              viewBox={`0 0 ${w} ${h}`}
              className="w-full max-w-[400px] h-auto bg-white rounded-lg border border-slate-200"
            >
              <defs>
                <marker
                  id="arrowX"
                  markerWidth="6"
                  markerHeight="5"
                  refX="5"
                  refY="2.5"
                  orient="auto"
                >
                  <polygon points="0 0, 6 2.5, 0 5" fill="#334155" />
                </marker>
                <marker
                  id="arrowY"
                  markerWidth="6"
                  markerHeight="5"
                  refX="5"
                  refY="2.5"
                  orient="auto"
                >
                  <polygon points="0 0, 6 2.5, 0 5" fill="#334155" />
                </marker>
              </defs>

              {/* Grid */}
              {xTicks.map((x) => (
                <line
                  key={`gx-${x}`}
                  x1={mapX(x)}
                  y1={padding}
                  x2={mapX(x)}
                  y2={h - padding}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
              ))}
              {yTicks.map((y) => (
                <line
                  key={`gy-${y}`}
                  x1={padding}
                  y1={mapY(y)}
                  x2={w - padding}
                  y2={mapY(y)}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
              ))}

              {/* Axes */}
              <line
                x1={padding}
                y1={originY}
                x2={w - padding + 10}
                y2={originY}
                stroke="#334155"
                strokeWidth="2"
                markerEnd="url(#arrowX)"
              />
              <line
                x1={originX}
                y1={h - padding}
                x2={originX}
                y2={padding - 10}
                stroke="#334155"
                strokeWidth="2"
                markerEnd="url(#arrowY)"
              />

              {/* Axis Labels */}
              <text
                x={w - padding + 5}
                y={originY + 15}
                fontSize="14"
                fontWeight="bold"
                fill="#334155"
                fontStyle="italic"
              >
                X
              </text>
              <text
                x={originX - 15}
                y={padding - 5}
                fontSize="14"
                fontWeight="bold"
                fill="#334155"
                fontStyle="italic"
              >
                Y
              </text>

              {/* Ticks */}
              {xTicks.map(
                (x) =>
                  x !== 0 && (
                    <g key={`tx-${x}`}>
                      <line
                        x1={mapX(x)}
                        y1={originY - 3}
                        x2={mapX(x)}
                        y2={originY + 3}
                        stroke="#334155"
                        strokeWidth="1.5"
                      />
                      <text
                        x={mapX(x)}
                        y={originY + 14}
                        fontSize="10"
                        textAnchor="middle"
                        fill="#64748b"
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
                        stroke="#334155"
                        strokeWidth="1.5"
                      />
                      <text
                        x={originX - 6}
                        y={mapY(y) + 3}
                        fontSize="10"
                        textAnchor="end"
                        fill="#64748b"
                        fontWeight="600"
                      >
                        {y}
                      </text>
                    </g>
                  ),
              )}

              {/* Origin 0 text */}
              <text
                x={originX - 6}
                y={originY + 12}
                fontSize="10"
                textAnchor="end"
                fill="#64748b"
                fontWeight="600"
              >
                0
              </text>

              {/* Plot points and lines from datasets */}
              {datasets.map((ds, dIdx) => {
                let points = ds.data as { x: number; y: number }[];
                const color =
                  ds.backgroundColor?.[0] || COLORS[dIdx % COLORS.length];

                let isFuncPlot = false;
                if (ds.isFunction && ds.functionStr) {
                  isFuncPlot = true;
                  points = [];
                  const step = (config.xMax - config.xMin) / 100;
                  for (let x = config.xMin; x <= config.xMax; x += step) {
                    try {
                      let fStr = ds.functionStr
                        .toLowerCase()
                        .replace(/\s+/g, "");
                      if (fStr.startsWith("y=")) fStr = fStr.substring(2);
                      else if (fStr.startsWith("f(x)="))
                        fStr = fStr.substring(5);
                      else if (fStr.endsWith("=0"))
                        fStr = fStr.substring(0, fStr.length - 2);
                      else if (fStr.startsWith("0=")) fStr = fStr.substring(2);
                      else if (fStr.endsWith("=y"))
                        fStr = fStr.substring(0, fStr.length - 2);
                      let f = fStr
                        .replace(/(\d+)x/g, "$1*x")
                        .replace(/\^/g, "**");
                      const mathFuncs = [
                        "sin",
                        "cos",
                        "tan",
                        "asin",
                        "acos",
                        "atan",
                        "sqrt",
                        "abs",
                        "log",
                        "exp",
                      ];
                      mathFuncs.forEach((mf) => {
                        f = f.split(mf).join(`Math.${mf}`);
                        f = f.split(`Math.Math.${mf}`).join(`Math.${mf}`);
                      });
                      const calc = new Function("x", `return ${f}`);
                      const y = calc(x);
                      if (typeof y === "number" && !isNaN(y) && isFinite(y)) {
                        points.push({ x, y });
                      }
                    } catch (e) {
                      // ignore errors
                    }
                  }
                }

                if (!points || points.length === 0) return null;

                return (
                  <g key={`ds-${dIdx}`}>
                    {(ds.showLine || isFuncPlot) && points.length > 1 && (
                      <polyline
                        points={points
                          .map((pt) => `${mapX(pt.x)},${mapY(pt.y)}`)
                          .join(" ")}
                        fill="none"
                        stroke={color}
                        strokeWidth="2.5"
                      />
                    )}
                    {!isFuncPlot &&
                      points.map((pt, pIdx) => (
                        <g key={`pt-${dIdx}-${pIdx}`}>
                          <circle
                            cx={mapX(pt.x)}
                            cy={mapY(pt.y)}
                            r="4"
                            fill={color}
                            stroke="#fff"
                            strokeWidth="1"
                          />
                          <text
                            x={mapX(pt.x) + 6}
                            y={mapY(pt.y) - 6}
                            fontSize="12"
                            fontWeight="bold"
                            fill={color}
                          >{`(${pt.x},${pt.y})`}</text>
                        </g>
                      ))}
                    {ds.label &&
                      ds.label !== `Dataset ${dIdx + 1}` &&
                      ds.label !== "Titik Data" &&
                      points.length > 0 && (
                        <text
                          x={mapX(
                            points[Math.floor(points.length / 2)]?.x || 0,
                          )}
                          y={
                            mapY(
                              points[Math.floor(points.length / 2)]?.y || 0,
                            ) - 10
                          }
                          fontSize="12"
                          fontWeight="bold"
                          fill={color}
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
