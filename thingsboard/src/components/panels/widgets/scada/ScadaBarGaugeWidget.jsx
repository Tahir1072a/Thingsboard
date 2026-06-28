"use client";

/**
 * ScadaBarGaugeWidget — Linear Bar Gauge SCADA Symbol
 *
 * Horizontal or vertical progress bar with min/max scale.
 * Gradient fill from green → yellow → red based on value %.
 * Scale ticks at 0%, 25%, 50%, 75%, 100% with numeric labels.
 * Current value displayed as large text.
 *
 * Config: label, unit, min, max, orientation
 * Telemetry key: first key from keys[]
 */

import { useState, useCallback, useMemo } from "react";
import { useTelemetrySSE } from "@/lib/sse-pool";

export default function ScadaBarGaugeWidget({
  devices = [], keys = [], title = "Bar Gauge",
  config = {}, publicToken,
}) {
  const device = devices[0];
  const deviceId = device?.id || null;
  const deviceName = device?.name || "Unknown Device";
  const telemetryKey = keys[0] || "value";

  const label = config.label || title;
  const unit = config.unit || "";
  const min = config.min ?? 0;
  const max = config.max ?? 100;
  const orientation = config.orientation || "horizontal";

  const [value, setValue] = useState(null);

  const handleData = useCallback((incoming) => {
    if (incoming.key === telemetryKey) {
      setValue(incoming.value);
    }
  }, [telemetryKey]);

  useTelemetrySSE(deviceId, handleData);

  const numValue = Number(value);
  const hasValue = value !== null && !isNaN(numValue);

  // Clamp percentage between 0 and 100
  const range = max - min || 1;
  const pct = hasValue ? Math.max(0, Math.min(100, ((numValue - min) / range) * 100)) : 0;

  // Color for the current percentage (green → yellow → red)
  const getBarColor = (p) => {
    if (p < 50) {
      // green(120) → yellow(60)
      const hue = 120 - (p / 50) * 60;
      return `hsl(${hue}, 85%, 45%)`;
    }
    // yellow(60) → red(0)
    const hue = 60 - ((p - 50) / 50) * 60;
    return `hsl(${hue}, 85%, 45%)`;
  };

  const barColor = getBarColor(pct);

  // Tick marks at 0%, 25%, 50%, 75%, 100%
  const ticks = useMemo(() => {
    return [0, 25, 50, 75, 100].map((t) => ({
      pct: t,
      value: (min + (range * t) / 100),
    }));
  }, [min, range]);

  const isHorizontal = orientation === "horizontal";

  // ─── Horizontal layout ───
  if (isHorizontal) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-3 gap-1" style={{ fontFamily: "'Inter', sans-serif" }}>
        <style>{`
          @keyframes scada-bar-shimmer {
            0% { opacity: 0.7; }
            50% { opacity: 1; }
            100% { opacity: 0.7; }
          }
        `}</style>

        {/* Device badge */}
        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
          {deviceName}
        </div>

        {/* Value + unit */}
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-extrabold" style={{ color: hasValue ? barColor : "#94a3b8", transition: "color 0.4s ease" }}>
            {hasValue ? numValue.toFixed(1) : "—"}
          </span>
          {unit && (
            <span className="text-sm font-semibold text-slate-400">{unit}</span>
          )}
        </div>

        {/* Label */}
        <div className="text-xs font-semibold text-slate-500 mb-1">{label}</div>

        {/* SVG Horizontal Bar Gauge */}
        <svg viewBox="0 0 260 56" className="w-full max-w-[320px]" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="barGradH" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(120, 85%, 45%)" />
              <stop offset="50%" stopColor="hsl(60, 85%, 45%)" />
              <stop offset="100%" stopColor="hsl(0, 85%, 45%)" />
            </linearGradient>
            <clipPath id="barClipH">
              <rect x="20" y="10" width="220" height="20" rx="4" />
            </clipPath>
          </defs>

          {/* Track background */}
          <rect x="20" y="10" width="220" height="20" rx="4" fill="#2d3748" stroke="#4a5568" strokeWidth="1" />

          {/* Filled bar */}
          <rect
            x="20" y="10"
            width={hasValue ? (220 * pct) / 100 : 0}
            height="20"
            rx="4"
            fill="url(#barGradH)"
            clipPath="url(#barClipH)"
            style={{ transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }}
          />

          {/* Glow overlay on filled portion */}
          <rect
            x="20" y="10"
            width={hasValue ? (220 * pct) / 100 : 0}
            height="20"
            rx="4"
            fill="white"
            opacity="0.08"
            clipPath="url(#barClipH)"
            style={{ transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }}
          />

          {/* Tick marks and labels */}
          {ticks.map((tick) => {
            const x = 20 + (220 * tick.pct) / 100;
            return (
              <g key={tick.pct}>
                <line x1={x} y1="30" x2={x} y2="38" stroke="#718096" strokeWidth="1" />
                <text
                  x={x} y="48"
                  textAnchor="middle"
                  fontSize="8"
                  fontWeight="600"
                  fill="#a0aec0"
                >
                  {tick.value % 1 === 0 ? tick.value : tick.value.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Current value indicator line */}
          {hasValue && (
            <line
              x1={20 + (220 * pct) / 100}
              y1="8"
              x2={20 + (220 * pct) / 100}
              y2="32"
              stroke="white"
              strokeWidth="2"
              opacity="0.9"
              style={{ transition: "x1 0.6s cubic-bezier(0.4, 0, 0.2, 1), x2 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }}
            />
          )}
        </svg>
      </div>
    );
  }

  // ─── Vertical layout ───
  return (
    <div className="h-full flex flex-col items-center justify-center p-3 gap-1" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes scada-bar-shimmer {
          0% { opacity: 0.7; }
          50% { opacity: 1; }
          100% { opacity: 0.7; }
        }
      `}</style>

      {/* Device badge */}
      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
        {deviceName}
      </div>

      {/* Label */}
      <div className="text-xs font-semibold text-slate-500">{label}</div>

      <div className="flex items-center gap-3 flex-1 min-h-0">
        {/* SVG Vertical Bar Gauge */}
        <svg viewBox="0 0 56 180" className="h-full max-h-[220px]" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="barGradV" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="hsl(120, 85%, 45%)" />
              <stop offset="50%" stopColor="hsl(60, 85%, 45%)" />
              <stop offset="100%" stopColor="hsl(0, 85%, 45%)" />
            </linearGradient>
            <clipPath id="barClipV">
              <rect x="18" y="10" width="20" height="150" rx="4" />
            </clipPath>
          </defs>

          {/* Track background */}
          <rect x="18" y="10" width="20" height="150" rx="4" fill="#2d3748" stroke="#4a5568" strokeWidth="1" />

          {/* Filled bar (grows from bottom) */}
          <rect
            x="18"
            y={hasValue ? 10 + 150 * (1 - pct / 100) : 160}
            width="20"
            height={hasValue ? (150 * pct) / 100 : 0}
            rx="4"
            fill="url(#barGradV)"
            clipPath="url(#barClipV)"
            style={{ transition: "y 0.6s cubic-bezier(0.4, 0, 0.2, 1), height 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }}
          />

          {/* Glow overlay */}
          <rect
            x="18"
            y={hasValue ? 10 + 150 * (1 - pct / 100) : 160}
            width="20"
            height={hasValue ? (150 * pct) / 100 : 0}
            rx="4"
            fill="white"
            opacity="0.08"
            clipPath="url(#barClipV)"
            style={{ transition: "y 0.6s cubic-bezier(0.4, 0, 0.2, 1), height 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }}
          />

          {/* Tick marks and labels (right side) */}
          {ticks.map((tick) => {
            const y = 10 + 150 * (1 - tick.pct / 100);
            return (
              <g key={tick.pct}>
                <line x1="38" y1={y} x2="44" y2={y} stroke="#718096" strokeWidth="1" />
                <text
                  x="50" y={y + 3}
                  textAnchor="start"
                  fontSize="8"
                  fontWeight="600"
                  fill="#a0aec0"
                >
                  {tick.value % 1 === 0 ? tick.value : tick.value.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Current value indicator line */}
          {hasValue && (
            <line
              x1="16"
              y1={10 + 150 * (1 - pct / 100)}
              x2="40"
              y2={10 + 150 * (1 - pct / 100)}
              stroke="white"
              strokeWidth="2"
              opacity="0.9"
              style={{ transition: "y1 0.6s cubic-bezier(0.4, 0, 0.2, 1), y2 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }}
            />
          )}
        </svg>

        {/* Value + unit (beside the bar) */}
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-2xl font-extrabold" style={{ color: hasValue ? barColor : "#94a3b8", transition: "color 0.4s ease" }}>
            {hasValue ? numValue.toFixed(1) : "—"}
          </span>
          {unit && (
            <span className="text-sm font-semibold text-slate-400">{unit}</span>
          )}
        </div>
      </div>
    </div>
  );
}
