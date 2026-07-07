import React from "react";
import { ChartData } from "../../types";

export const RelationChart: React.FC<{ data: ChartData }> = ({ data }) => {
  const { labels, datasets } = data;
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
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
          </marker>
        </defs>

        {/* Domain Oval */}
        <ellipse
          cx={domainX}
          cy={svgH / 2 + 10}
          rx={ovalWidth / 2}
          ry={ovalHeight / 2}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
        />
        <text
          x={domainX}
          y="30"
          fill="#1e293b"
          fontWeight="bold"
          fontSize="16"
          textAnchor="middle"
        >
          {domainName}
        </text>

        {/* Codomain Oval */}
        <ellipse
          cx={codomainX}
          cy={svgH / 2 + 10}
          rx={ovalWidth / 2}
          ry={ovalHeight / 2}
          fill="none"
          stroke="#ef4444"
          strokeWidth="2"
        />
        <text
          x={codomainX}
          y="30"
          fill="#1e293b"
          fontWeight="bold"
          fontSize="16"
          textAnchor="middle"
        >
          {codomainName}
        </text>

        {/* Render Arrows first so they are behind text/dots */}
        {relationships.map((relStr, i) => {
          if (typeof relStr !== "string") return null;
          const [dIdxStr, cIdxStr] = relStr.split(",");
          const dIdx = parseInt(dIdxStr);
          const cIdx = parseInt(cIdxStr);
          if (
            isNaN(dIdx) ||
            isNaN(cIdx) ||
            dIdx < 0 ||
            dIdx >= domainItems.length ||
            cIdx < 0 ||
            cIdx >= codomainItems.length
          )
            return null;

          const startX = domainX + 10;
          const startY = getY(dIdx, domainItems.length);
          const endX = codomainX - 15;
          const endY = getY(cIdx, codomainItems.length);

          return (
            <line
              key={`rel-${i}`}
              x1={startX}
              y1={startY}
              x2={endX}
              y2={endY}
              stroke="#6366f1"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
              opacity="0.6"
            />
          );
        })}

        {/* Domain Items */}
        {domainItems.map((item, i) => {
          const y = getY(i, domainItems.length);
          return (
            <g key={`d-${i}`}>
              <circle cx={domainX - 20} cy={y} r="4" fill="#3b82f6" />
              <text
                x={domainX}
                y={y + 5}
                fill="#1e293b"
                fontWeight="bold"
                fontSize="14"
                textAnchor="middle"
              >
                {item}
              </text>
            </g>
          );
        })}

        {/* Codomain Items */}
        {codomainItems.map((item, i) => {
          const y = getY(i, codomainItems.length);
          return (
            <g key={`c-${i}`}>
              <circle cx={codomainX - 20} cy={y} r="4" fill="#ef4444" />
              <text
                x={codomainX}
                y={y + 5}
                fill="#1e293b"
                fontWeight="bold"
                fontSize="14"
                textAnchor="middle"
              >
                {item}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
