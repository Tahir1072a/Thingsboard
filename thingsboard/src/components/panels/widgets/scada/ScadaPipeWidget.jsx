"use client";

/**
 * ScadaPipeWidget — Decorative SCADA Pipe Segment
 *
 * Inline SVG of industrial pipe segments with optional animated flow.
 * No device/telemetry needed — purely decorative.
 *
 * Config:
 *  - direction: "horizontal" | "vertical" | "elbow-tr" | "elbow-tl" | "elbow-br" | "elbow-bl"
 *  - flowing: boolean — animated dashed stroke when true
 *  - flowColor: pipe flow color (default #3b82f6)
 */

const PIPE_WIDTH = 18;
const PIPE_OUTER = "#64748b";

const pipePaths = {
  horizontal: { d: "M0,50 L100,50", viewBox: "0 30 100 40" },
  vertical:   { d: "M50,0 L50,100", viewBox: "30 0 40 100" },
  "elbow-tr": { d: "M0,50 Q50,50 50,0",   viewBox: "0 0 60 60" },
  "elbow-tl": { d: "M100,50 Q50,50 50,0",  viewBox: "40 0 60 60" },
  "elbow-br": { d: "M0,50 Q50,50 50,100",  viewBox: "0 40 60 60" },
  "elbow-bl": { d: "M100,50 Q50,50 50,100", viewBox: "40 40 60 60" },
};

export default function ScadaPipeWidget({ config = {} }) {
  const direction = config.direction || "horizontal";
  const flowing = config.flowing ?? false;
  const flowColor = config.flowColor || "#3b82f6";

  const pipe = pipePaths[direction] || pipePaths.horizontal;

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`
        @keyframes scada-pipe-flow {
          to { stroke-dashoffset: -20px; }
        }
      `}</style>
      <svg
        viewBox={pipe.viewBox}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer pipe wall */}
        <path
          d={pipe.d}
          fill="none"
          stroke={PIPE_OUTER}
          strokeWidth={PIPE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Inner pipe highlight */}
        <path
          d={pipe.d}
          fill="none"
          stroke="#94a3b8"
          strokeWidth={PIPE_WIDTH - 6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Flowing liquid animation */}
        {flowing && (
          <path
            d={pipe.d}
            fill="none"
            stroke={flowColor}
            strokeWidth={PIPE_WIDTH - 10}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="8 12"
            style={{
              animation: "scada-pipe-flow 0.6s linear infinite",
            }}
          />
        )}
      </svg>
    </div>
  );
}
