"use client";

/**
 * ScadaTankWidget — Cylindrical Tank SCADA Symbol
 *
 * Inline SVG of a tank with animated fill level.
 * Color changes based on level: <20% red, 20-80% blue, >80% green.
 *
 * Config: label, capacity, unit
 * Telemetry key: "level" (0–100 percentage)
 */

import { useState, useCallback } from "react";
import { useTelemetrySSE } from "@/lib/sse-pool";

export default function ScadaTankWidget({
  devices = [], keys = [], title = "Tank",
  config = {}, publicToken,
}) {
  const device = devices[0];
  const deviceId = device?.id || null;
  const deviceName = device?.name || "Unknown Device";
  const telemetryKey = keys[0] || "level";

  const label = config.label || title;
  const capacity = config.capacity ?? 1000;
  const unit = config.unit || "L";

  const [value, setValue] = useState(null);

  const handleData = useCallback((incoming) => {
    if (incoming.key === telemetryKey) {
      setValue(incoming.value);
    }
  }, [telemetryKey]);

  useTelemetrySSE(deviceId, handleData);

  const level = Math.min(100, Math.max(0, Number(value) || 0));

  // Color based on fill level
  const getFillColor = () => {
    if (level < 20) return "#ef4444";
    if (level > 80) return "#22c55e";
    return "#3b82f6";
  };

  const fillColor = getFillColor();

  // Tank dimensions within viewBox
  const tankX = 20;
  const tankY = 10;
  const tankW = 80;
  const tankH = 100;
  const fillH = (level / 100) * tankH;
  const fillY = tankY + tankH - fillH;

  return (
    <div className="h-full flex flex-col items-center justify-center p-3 gap-2">
      {/* Device badge */}
      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
        {deviceName}
      </div>

      {/* Label */}
      <span className="text-sm font-semibold text-slate-700">{label}</span>

      {/* SVG Tank */}
      <svg viewBox="0 0 120 140" className="w-full max-w-[160px]">
        <defs>
          {/* Clip path for tank body */}
          <clipPath id="tank-clip">
            <rect x={tankX} y={tankY} width={tankW} height={tankH} rx="8" />
          </clipPath>
          {/* Fill gradient */}
          <linearGradient id="tank-fill-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.7" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="0.95" />
          </linearGradient>
        </defs>

        {/* Tank body outline */}
        <rect
          x={tankX} y={tankY}
          width={tankW} height={tankH}
          rx="8"
          fill="#f1f5f9"
          stroke="#94a3b8"
          strokeWidth="3"
        />

        {/* Fill level (clipped to tank shape) */}
        <rect
          x={tankX} y={fillY}
          width={tankW} height={fillH}
          clipPath="url(#tank-clip)"
          fill="url(#tank-fill-grad)"
          style={{ transition: "y 0.6s ease, height 0.6s ease" }}
        />

        {/* Wave decoration at fill top */}
        {level > 2 && level < 98 && (
          <path
            d={`M${tankX},${fillY} q10,-4 20,0 t20,0 t20,0 t20,0`}
            fill={fillColor}
            opacity="0.4"
            clipPath="url(#tank-clip)"
            style={{ transition: "d 0.6s ease" }}
          />
        )}

        {/* Level text inside tank */}
        <text
          x="60" y="65"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="18"
          fontWeight="800"
          fill={level > 40 ? "#fff" : "#334155"}
          style={{ transition: "fill 0.4s ease" }}
        >
          {level.toFixed(0)}%
        </text>

        {/* Tank top cap (ellipse) */}
        <ellipse cx="60" cy={tankY} rx={tankW / 2} ry="6" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
        {/* Tank bottom cap */}
        <ellipse cx="60" cy={tankY + tankH} rx={tankW / 2} ry="6" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />

        {/* Inlet pipe */}
        <rect x="50" y="0" width="10" height={tankY} fill="#94a3b8" rx="1" />
        {/* Outlet pipe */}
        <rect x="50" y={tankY + tankH + 4} width="10" height="14" fill="#94a3b8" rx="1" />
      </svg>

      {/* Capacity info */}
      <span
        className="text-xs font-bold px-2 py-0.5 rounded-full"
        style={{
          color: fillColor,
          backgroundColor: `${fillColor}15`,
          transition: "all 0.4s ease",
        }}
      >
        {level.toFixed(0)}% / {capacity} {unit}
      </span>
    </div>
  );
}
