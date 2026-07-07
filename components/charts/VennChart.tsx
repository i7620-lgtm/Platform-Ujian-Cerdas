import React from "react";
import { ChartData } from "../../types";

export const VennChart: React.FC<{ data: ChartData }> = ({ data }) => {
  const { labels, datasets } = data;
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
            fontSize="14"
          >
            S {vTotal ? `= ${vTotal}` : ""}
          </text>

          {/* Left Circle A */}
          <circle
            cx="160"
            cy="150"
            r="90"
            fill="rgba(59, 130, 246, 0.2)"
            stroke="#3b82f6"
            strokeWidth="2"
          />
          <text
            x="100"
            y="70"
            fill="#1e293b"
            fontWeight="bold"
            fontSize="16"
          >
            {labels[0] || "A"}
          </text>
          <text
            x="120"
            y="155"
            fill="#1e293b"
            fontWeight="bold"
            fontSize="20"
            textAnchor="middle"
          >
            {vA}
          </text>

          {/* Right Circle B */}
          <circle
            cx="240"
            cy="150"
            r="90"
            fill="rgba(239, 68, 68, 0.2)"
            stroke="#ef4444"
            strokeWidth="2"
          />
          <text
            x="290"
            y="70"
            fill="#1e293b"
            fontWeight="bold"
            fontSize="16"
          >
            {labels[1] || "B"}
          </text>
          <text
            x="280"
            y="155"
            fill="#1e293b"
            fontWeight="bold"
            fontSize="20"
            textAnchor="middle"
          >
            {vB}
          </text>

          {/* Intersection A ∩ B */}
          <text
            x="200"
            y="155"
            fill="#1e293b"
            fontWeight="bold"
            fontSize="20"
            textAnchor="middle"
          >
            {vAB}
          </text>

          {/* Outer Area (A ∪ B)' */}
          <text
            x="350"
            y="260"
            fill="#1e293b"
            fontWeight="bold"
            fontSize="20"
            textAnchor="middle"
          >
            {vOuter}
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
          viewBox="0 0 500 450"
          className="w-full max-w-[500px] h-auto"
        >
          {/* Universe Rectangle */}
          <rect
            x="10"
            y="10"
            width="480"
            height="430"
            fill="none"
            stroke="#1e293b"
            strokeWidth="2"
          />
          <text
            x="20"
            y="30"
            fill="#1e293b"
            fontWeight="bold"
            fontSize="14"
          >
            S {vTotal ? `= ${vTotal}` : ""}
          </text>

          {/* Top Left Circle A */}
          <circle
            cx="200"
            cy="180"
            r="110"
            fill="rgba(59, 130, 246, 0.2)"
            stroke="#3b82f6"
            strokeWidth="2"
          />
          <text
            x="90"
            y="70"
            fill="#1e293b"
            fontWeight="bold"
            fontSize="16"
          >
            {labels[0] || "A"}
          </text>
          <text
            x="150"
            y="160"
            fill="#1e293b"
            fontWeight="bold"
            fontSize="20"
            textAnchor="middle"
          >
            {vA}
          </text>

          {/* Top Right Circle B */}
          <circle
            cx="300"
            cy="180"
            r="110"
            fill="rgba(239, 68, 68, 0.2)"
            stroke="#ef4444"
            strokeWidth="2"
          />
          <text
            x="400"
            y="70"
            fill="#1e293b"
            fontWeight="bold"
            fontSize="16"
          >
            {labels[1] || "B"}
          </text>
          <text
            x="350"
            y="160"
            fill="#1e293b"
            fontWeight="bold"
            fontSize="20"
            textAnchor="middle"
          >
            {vB}
          </text>

          {/* Bottom Circle C */}
          <circle
            cx="250"
            cy="270"
            r="110"
            fill="rgba(34, 197, 94, 0.2)"
            stroke="#22c55e"
            strokeWidth="2"
          />
          <text
            x="250"
            y="410"
            fill="#1e293b"
            fontWeight="bold"
            fontSize="16"
            textAnchor="middle"
          >
            {labels[2] || "C"}
          </text>
          <text
            x="250"
            y="330"
            fill="#1e293b"
            fontWeight="bold"
            fontSize="20"
            textAnchor="middle"
          >
            {vC}
          </text>

          {/* Intersections */}
          {/* A ∩ B */}
          <text
            x="250"
            y="145"
            fill="#1e293b"
            fontWeight="bold"
            fontSize="18"
            textAnchor="middle"
          >
            {vAB}
          </text>
          {/* A ∩ C */}
          <text
            x="180"
            y="245"
            fill="#1e293b"
            fontWeight="bold"
            fontSize="18"
            textAnchor="middle"
          >
            {vAC}
          </text>
          {/* B ∩ C */}
          <text
            x="320"
            y="245"
            fill="#1e293b"
            fontWeight="bold"
            fontSize="18"
            textAnchor="middle"
          >
            {vBC}
          </text>
          {/* A ∩ B ∩ C */}
          <text
            x="250"
            y="215"
            fill="#1e293b"
            fontWeight="bold"
            fontSize="18"
            textAnchor="middle"
          >
            {vABC}
          </text>

          {/* Outer Area */}
          <text
            x="440"
            y="410"
            fill="#1e293b"
            fontWeight="bold"
            fontSize="20"
            textAnchor="middle"
          >
            {vOuter}
          </text>
        </svg>
      </div>
    );
  }
};
