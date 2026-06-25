import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ChartData } from "../types";

interface ChartRendererProps {
  data: ChartData;
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: { color: string; name: string; value: number | string }[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md dark:bg-slate-800/95 p-4 border-2 border-indigo-100 dark:border-indigo-900/50 shadow-2xl rounded-2xl z-[100] min-w-[200px] mx-auto transform -translate-x-1/2 left-1/2 relative">
        <p className="font-black text-slate-800 dark:text-slate-100 mb-2 border-b border-slate-100 dark:border-slate-700 pb-2 text-center">
          {label}
        </p>
        {payload.map(
          (
            entry: { color: string; name: string; value: number | string },
            index: number,
          ) => (
            <div
              key={index}
              className="flex items-center justify-center gap-3 text-sm mt-2"
            >
              <div
                className="w-4 h-4 rounded-md shadow-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-600 dark:text-slate-400 font-medium">
                {entry.name}:
              </span>
              <span className="font-black text-indigo-600 dark:text-indigo-400 text-base">
                {entry.value}
              </span>
            </div>
          ),
        )}
      </div>
    );
  }
  return null;
};

const BAR_CHART_MARGIN = { top: 20, right: 20, left: -20, bottom: 0 };

export const ChartRenderer: React.FC<ChartRendererProps> = ({ data }) => {
  const { type, title, labels, datasets } = data;

  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile(); // Check initial size
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const legendItems = React.useMemo(() => {
    if (type === "venn" || type === "relation") {
      return [];
    }
    if (type === "pie") {
      return labels.map((label, index) => {
        const val = datasets[0]?.data[index] ?? 0;
        return {
          value: `${label} (${val})`,
          color: COLORS[index % COLORS.length],
        };
      });
    } else {
      return datasets.map((dataset, index) => ({
        value: dataset.label,
        color:
          dataset.backgroundColor?.[0] ||
          dataset.borderColor?.[0] ||
          COLORS[index % COLORS.length],
      }));
    }
  }, [type, labels, datasets]);

  // Transform data for Recharts
  const chartData = React.useMemo(() => {
    return labels.map((label, index) => {
      const entry: Record<string, any> = { name: label };
      datasets.forEach((dataset) => {
        if (type === "bar" || type === "line") {
          entry[dataset.label] = Number(dataset.data[index]) || 0;
        } else {
          entry[dataset.label] = dataset.data[index];
        }
      });
      return entry;
    });
  }, [labels, datasets, type]);

  const pieData = React.useMemo(() => {
    if (type !== "pie") return [];
    return labels.map((label, index) => ({
      name: label,
      value: Number(datasets[0]?.data[index]) || 0,
    }));
  }, [type, labels, datasets]);

  const renderPieLabel = React.useCallback((props: any) => {
    const { name, percent, x, y, textAnchor, fill } = props;
    if (!percent || percent === 0) return null;
    return (
      <text
        x={x}
        y={y}
        textAnchor={textAnchor}
        dominantBaseline="central"
        fill={fill}
        fontWeight={700}
        style={{ fontSize: "clamp(9px, 2.5vw, 13px)" }}
      >
        {`${name}: ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  }, []);

  const labelLineConfig = React.useMemo(() => {
    return { stroke: "#64748b", strokeWidth: 1 };
  }, []);

  const pieChartMargin = React.useMemo(() => {
    return {
      top: 10,
      right: isMobile ? 10 : 40,
      left: isMobile ? 10 : 40,
      bottom: 10,
    };
  }, [isMobile]);

  // Calculate Y-axis ticks based on max data value
  const yTicks = React.useMemo(() => {
    let max = 0;
    datasets.forEach((d) => {
      d.data.forEach((v) => {
        const num = Number(v);
        if (!isNaN(num) && num > max) max = num;
      });
    });

    // Fallback if no numeric max found
    if (max === 0) return undefined;

    let interval = 5;
    if (max > 50 && max <= 100) interval = 10;
    else if (max > 100 && max <= 500) interval = 50;
    else if (max > 500) interval = 100;

    const ticks = [];
    const maxTick = Math.ceil(max / interval) * interval;
    for (let i = 0; i <= maxTick; i += interval) {
      ticks.push(i);
    }
    return ticks;
  }, [datasets]);

  const yDomain =
    yTicks && yTicks.length > 0 ? [0, yTicks[yTicks.length - 1]] : undefined;

  const renderChart = () => {
    switch (type) {
      case "bar":
        return (
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={10}
            minHeight={10}
          >
            <BarChart
              data={chartData}
              margin={BAR_CHART_MARGIN}
              barCategoryGap="15%"
            >
              <CartesianGrid
                strokeDasharray="5 5"
                stroke="#cbd5e1"
                opacity={0.8}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 13, fill: "#475569", fontWeight: 600 }}
                axisLine={{ stroke: "#64748b", strokeWidth: 1.5 }}
                tickLine={{ stroke: "#64748b" }}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={70}
                tickMargin={5}
              />
              <YAxis
                tick={{ fontSize: 13, fill: "#475569", fontWeight: 600 }}
                axisLine={{ stroke: "#64748b", strokeWidth: 1.5 }}
                tickLine={{ stroke: "#64748b" }}
                tickMargin={5}
                width={45}
                ticks={yTicks}
                domain={yDomain}
              />
              {data.showTooltip !== false && (
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "rgba(99, 102, 241, 0.08)" }}
                  wrapperStyle={{ zIndex: 1000, pointerEvents: "none" }}
                  position={{ y: 250 }}
                  allowEscapeViewBox={{ x: false, y: false }}
                />
              )}
              {datasets.map((dataset, index) => (
                <Bar
                  key={dataset.label}
                  dataKey={dataset.label}
                  fill={
                    dataset.backgroundColor?.[0] ||
                    COLORS[index % COLORS.length]
                  }
                  maxBarSize={80}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={10}
            minHeight={10}
          >
            <LineChart data={chartData} margin={BAR_CHART_MARGIN}>
              <CartesianGrid
                strokeDasharray="5 5"
                stroke="#cbd5e1"
                opacity={0.8}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 13, fill: "#475569", fontWeight: 600 }}
                axisLine={{ stroke: "#64748b", strokeWidth: 1.5 }}
                tickLine={{ stroke: "#64748b" }}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={70}
                tickMargin={5}
              />
              <YAxis
                tick={{ fontSize: 13, fill: "#475569", fontWeight: 600 }}
                axisLine={{ stroke: "#64748b", strokeWidth: 1.5 }}
                tickLine={{ stroke: "#64748b" }}
                tickMargin={5}
                width={45}
                ticks={yTicks}
                domain={yDomain}
              />
              {data.showTooltip !== false && (
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: "rgba(99, 102, 241, 0.2)", strokeWidth: 2 }}
                  wrapperStyle={{ zIndex: 1000, pointerEvents: "none" }}
                  position={{ y: 250 }}
                  allowEscapeViewBox={{ x: false, y: false }}
                />
              )}
              {datasets.map((dataset, index) => (
                <Line
                  key={dataset.label}
                  type="monotone"
                  dataKey={dataset.label}
                  stroke={
                    dataset.borderColor?.[0] || COLORS[index % COLORS.length]
                  }
                  strokeWidth={4}
                  dot={{ r: 6, strokeWidth: 2, fill: "#fff" }}
                  activeDot={{ r: 8, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      case "pie": {
        return (
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={10}
            minHeight={10}
          >
            <PieChart margin={pieChartMargin}>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={labelLineConfig}
                label={renderPieLabel}
                outerRadius={isMobile ? "60%" : "70%"}
                innerRadius={isMobile ? "30%" : "35%"}
                paddingAngle={5}
                fill="#8884d8"
                dataKey="value"
                isAnimationActive={false}
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke="none"
                  />
                ))}
              </Pie>
              {data.showTooltip !== false && (
                <Tooltip
                  content={<CustomTooltip />}
                  wrapperStyle={{ zIndex: 1000, pointerEvents: "none" }}
                  position={{ y: 250 }}
                  allowEscapeViewBox={{ x: false, y: false }}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        );
      }
      case "venn": {
        const d = (datasets[0]?.data || []) as (string | number)[];
        if (labels.length <= 2) {
          // 2 Sets Venn Diagram
          const vA = d[0] ?? "";
          const vB = d[1] ?? "";
          const vAB = d[2] ?? "";
          const vOuter = d[3] ?? "";
          const vTotal = d[4] ?? "";
          return (
            <div className="w-full h-auto flex items-center justify-center relative">
              <svg
                viewBox="0 0 400 300"
                className="w-full max-w-[400px] h-auto"
              >
                {/* Universe Rectangle */}
                <rect
                  x="10"
                  y="10"
                  width="380"
                  height="280"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="2"
                />
                <text
                  x="20"
                  y="30"
                  fill="#1e293b"
                  fontWeight="bold"
                  fontSize="16"
                >
                  S{vTotal !== "" ? ` = ${vTotal}` : ""}
                </text>

                {/* Outer Value */}
                <text
                  x="360"
                  y="270"
                  textAnchor="middle"
                  fill="#000"
                  fontWeight="bold"
                  fontSize="18"
                >
                  {vOuter}
                </text>

                {/* Circles */}
                <circle
                  cx="160"
                  cy="150"
                  r="100"
                  fill={COLORS[0]}
                  fillOpacity="0.5"
                  stroke={COLORS[0]}
                  strokeWidth="2"
                />
                <circle
                  cx="240"
                  cy="150"
                  r="100"
                  fill={COLORS[1]}
                  fillOpacity="0.5"
                  stroke={COLORS[1]}
                  strokeWidth="2"
                />

                {/* Labels */}
                <text
                  x="110"
                  y="70"
                  textAnchor="middle"
                  fill="#1e293b"
                  fontWeight="bold"
                  fontSize="16"
                >
                  {labels[0] || "A"}
                </text>
                <text
                  x="290"
                  y="70"
                  textAnchor="middle"
                  fill="#1e293b"
                  fontWeight="bold"
                  fontSize="16"
                >
                  {labels[1] || "B"}
                </text>

                {/* Data Values */}
                <text
                  x="120"
                  y="155"
                  textAnchor="middle"
                  fill="#000"
                  fontWeight="bold"
                  fontSize="20"
                >
                  {vA}
                </text>
                <text
                  x="280"
                  y="155"
                  textAnchor="middle"
                  fill="#000"
                  fontWeight="bold"
                  fontSize="20"
                >
                  {vB}
                </text>
                <text
                  x="200"
                  y="155"
                  textAnchor="middle"
                  fill="#000"
                  fontWeight="bold"
                  fontSize="20"
                >
                  {vAB}
                </text>
              </svg>
            </div>
          );
        } else {
          // 3 Sets Venn Diagram
          const vA = d[0] ?? "";
          const vB = d[1] ?? "";
          const vC = d[2] ?? "";
          const vAB = d[3] ?? "";
          const vAC = d[4] ?? "";
          const vBC = d[5] ?? "";
          const vABC = d[6] ?? "";
          const vOuter = d[7] ?? "";
          const vTotal = d[8] ?? "";
          return (
            <div className="w-full h-auto flex items-center justify-center relative">
              <svg
                viewBox="0 0 400 400"
                className="w-full max-w-[400px] h-auto"
              >
                {/* Universe Rectangle */}
                <rect
                  x="10"
                  y="10"
                  width="380"
                  height="380"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="2"
                />
                <text
                  x="20"
                  y="30"
                  fill="#1e293b"
                  fontWeight="bold"
                  fontSize="16"
                >
                  S{vTotal !== "" ? ` = ${vTotal}` : ""}
                </text>

                {/* Outer Value */}
                <text
                  x="360"
                  y="370"
                  textAnchor="middle"
                  fill="#000"
                  fontWeight="bold"
                  fontSize="18"
                >
                  {vOuter}
                </text>

                {/* Circles */}
                <circle
                  cx="160"
                  cy="160"
                  r="90"
                  fill={COLORS[0]}
                  fillOpacity="0.5"
                  stroke={COLORS[0]}
                  strokeWidth="2"
                />
                <circle
                  cx="240"
                  cy="160"
                  r="90"
                  fill={COLORS[1]}
                  fillOpacity="0.5"
                  stroke={COLORS[1]}
                  strokeWidth="2"
                />
                <circle
                  cx="200"
                  cy="230"
                  r="90"
                  fill={COLORS[2]}
                  fillOpacity="0.5"
                  stroke={COLORS[2]}
                  strokeWidth="2"
                />

                {/* Labels */}
                <text
                  x="100"
                  y="80"
                  textAnchor="middle"
                  fill="#1e293b"
                  fontWeight="bold"
                  fontSize="16"
                >
                  {labels[0] || "A"}
                </text>
                <text
                  x="300"
                  y="80"
                  textAnchor="middle"
                  fill="#1e293b"
                  fontWeight="bold"
                  fontSize="16"
                >
                  {labels[1] || "B"}
                </text>
                <text
                  x="200"
                  y="350"
                  textAnchor="middle"
                  fill="#1e293b"
                  fontWeight="bold"
                  fontSize="16"
                >
                  {labels[2] || "C"}
                </text>

                {/* Data Values */}
                <text
                  x="130"
                  y="150"
                  textAnchor="middle"
                  fill="#000"
                  fontWeight="bold"
                  fontSize="18"
                >
                  {vA}
                </text>
                <text
                  x="270"
                  y="150"
                  textAnchor="middle"
                  fill="#000"
                  fontWeight="bold"
                  fontSize="18"
                >
                  {vB}
                </text>
                <text
                  x="200"
                  y="270"
                  textAnchor="middle"
                  fill="#000"
                  fontWeight="bold"
                  fontSize="18"
                >
                  {vC}
                </text>

                <text
                  x="200"
                  y="135"
                  textAnchor="middle"
                  fill="#000"
                  fontWeight="bold"
                  fontSize="14"
                >
                  {vAB}
                </text>
                <text
                  x="155"
                  y="210"
                  textAnchor="middle"
                  fill="#000"
                  fontWeight="bold"
                  fontSize="14"
                >
                  {vAC}
                </text>
                <text
                  x="245"
                  y="210"
                  textAnchor="middle"
                  fill="#000"
                  fontWeight="bold"
                  fontSize="14"
                >
                  {vBC}
                </text>

                <text
                  x="200"
                  y="185"
                  textAnchor="middle"
                  fill="#000"
                  fontWeight="bold"
                  fontSize="16"
                >
                  {vABC}
                </text>
              </svg>
            </div>
          );
        }
      }
      case "relation": {
        const domainName = labels[0] || "A";
        const codomainName = labels[1] || "B";
        const domainItems = (datasets[0]?.data || []) as (string | number)[];
        const codomainItems = (datasets[1]?.data || []) as (string | number)[];
        const relationships = datasets[2]?.data || [];

        // Dynamic sizing for relation
        const svgW = 400;
        const svgH = Math.max(
          300,
          Math.max(domainItems.length, codomainItems.length) * 40 + 100,
        );

        const domainX = 100;
        const codomainX = 300;
        const ovalWidth = 100;
        const ovalHeight = svgH - 60;

        const getY = (index: number, total: number) => {
          if (total === 1) return svgH / 2 + 10;
          const startY = 80;
          const endY = svgH - 50;
          return startY + (index * (endY - startY)) / (total - 1);
        };

        return (
          <div className="w-full h-auto flex items-center justify-center relative">
            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              className="w-full max-w-[400px] h-auto"
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="6"
                  markerHeight="5"
                  refX="5"
                  refY="2.5"
                  orient="auto"
                >
                  <polygon points="0 0, 6 2.5, 0 5" fill="#1e293b" />
                </marker>
              </defs>

              {/* Ovals */}
              <ellipse
                cx={domainX}
                cy={svgH / 2 + 10}
                rx={ovalWidth / 2}
                ry={ovalHeight / 2}
                fill="#e2e8f0"
                fillOpacity="0.5"
                stroke="#94a3b8"
                strokeWidth="2"
              />
              <ellipse
                cx={codomainX}
                cy={svgH / 2 + 10}
                rx={ovalWidth / 2}
                ry={ovalHeight / 2}
                fill="#e2e8f0"
                fillOpacity="0.5"
                stroke="#94a3b8"
                strokeWidth="2"
              />

              {/* Labels */}
              <text
                x={domainX}
                y="30"
                textAnchor="middle"
                fill="#1e293b"
                fontWeight="bold"
                fontSize="16"
              >
                {domainName}
              </text>
              <text
                x={codomainX}
                y="30"
                textAnchor="middle"
                fill="#1e293b"
                fontWeight="bold"
                fontSize="16"
              >
                {codomainName}
              </text>

              {/* Relationships */}
              {relationships.map((rel, i) => {
                const pts = String(rel).split("-");
                if (pts.length === 2) {
                  const dIdx = parseInt(pts[0], 10);
                  const cIdx = parseInt(pts[1], 10);
                  if (
                    dIdx >= 0 &&
                    dIdx < domainItems.length &&
                    cIdx >= 0 &&
                    cIdx < codomainItems.length
                  ) {
                    const startY = getY(dIdx, domainItems.length);
                    const endY = getY(cIdx, codomainItems.length);
                    return (
                      <path
                        key={`rel-${i}`}
                        d={`M ${domainX + 15} ${startY} C ${domainX + 60} ${startY}, ${codomainX - 60} ${endY}, ${codomainX - 15} ${endY}`}
                        fill="none"
                        stroke="#1e293b"
                        strokeWidth="1.5"
                        markerEnd="url(#arrowhead)"
                      />
                    );
                  }
                }
                return null;
              })}

              {/* Items and Points */}
              {domainItems.map((item, i) => {
                const y = getY(i, domainItems.length);
                return (
                  <g key={`dom-${i}`}>
                    <text
                      x={domainX - 10}
                      y={y + 5}
                      textAnchor="end"
                      fill="#000"
                      fontWeight="600"
                      fontSize="14"
                    >
                      {item}
                    </text>
                    <circle cx={domainX + 10} cy={y} r="4" fill="#334155" />
                  </g>
                );
              })}

              {codomainItems.map((item, i) => {
                const y = getY(i, codomainItems.length);
                return (
                  <g key={`codom-${i}`}>
                    <circle cx={codomainX - 10} cy={y} r="4" fill="#334155" />
                    <text
                      x={codomainX + 10}
                      y={y + 5}
                      textAnchor="start"
                      fill="#000"
                      fontWeight="600"
                      fontSize="14"
                    >
                      {item}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        );
      }

      case "cartesian": {
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
      }

      default:
        return null;
    }
  };

  return (
    <div
      className={`w-full ${["venn", "relation", "cartesian"].includes(type) ? "h-auto max-w-[500px] mx-auto flex" : "min-h-[350px] h-[350px] sm:h-[450px] flex"} flex-col bg-white dark:bg-slate-900/50 p-4 sm:p-8 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 shadow-sm transition-all`}
    >
      {title && (
        <h3 className="text-center font-bold mb-[10px] text-slate-800 dark:text-white tracking-tight text-xl sm:text-2xl shrink-0">
          {title}
        </h3>
      )}
      <div
        className={`w-full ${["venn", "relation", "cartesian"].includes(type) ? "flex justify-center flex-col" : "flex-1 relative min-h-[1px] min-w-[1px]"}`}
      >
        <div
          className={
            ["venn", "relation", "cartesian"].includes(type)
              ? "w-full h-auto"
              : "absolute inset-0 min-h-[1px] min-w-[1px]"
          }
        >
          {renderChart()}
        </div>
      </div>
      {data.showLegend !== false && legendItems.length > 0 && (
        <div className="mt-[10px] flex flex-wrap justify-center items-center gap-x-4 gap-y-1.5 shrink-0">
          {legendItems.map((item, index) => (
            <div
              key={`item-${index}`}
              className="flex items-center text-[13px] sm:text-[14px] font-bold"
              style={{ color: item.color }}
            >
              <span
                className="w-3 h-3 rounded-full mr-1.5 shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate max-w-[150px] sm:max-w-[200px]">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
