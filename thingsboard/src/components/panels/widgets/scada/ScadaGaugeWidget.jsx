"use client";

/**
 * ScadaGaugeWidget — Industrial Analog Gauge
 *
 * Inline SVG pressure/temperature gauge with needle, tick marks, red zone.
 * Different from GaugeWidget — raw SVG for an industrial SCADA look.
 *
 * Config:
 *  - min (default 0), max (default 100)
 *  - unit (e.g. "bar", "PSI", "°C")
 *  - label (e.g. "Basınç")
 */

import { useEffect, useState, useCallback } from "react";
import { useTelemetrySSE } from "@/lib/sse-pool";

const ARC_START = -135;
const ARC_END = 135;
const ARC_RANGE = ARC_END - ARC_START; // 270°
const CX = 60;
const CY = 60;
const R = 44;
const TICK_COUNT = 10;

function polarToXY(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const s = polarToXY(cx, cy, r, startAngle);
  const e = polarToXY(cx, cy, r, endAngle);
  const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
}

export default function ScadaGaugeWidget({
  devices = [], keys = [], title = "Gauge",
  config = {}, publicToken,
}) {
  const device = devices[0];
  const deviceId = device?.id;
  const key = keys[0] || "value";
  const min = config.min ?? 0;
  const max = config.max ?? 100;
  const unit = config.unit || "";
  const label = config.label || title;

  const [value, setValue] = useState(null);

  const handleData = useCallback((incoming) => {
    if (incoming.key === key) setValue(Number(incoming.value));
  }, [key]);

  useTelemetrySSE(!publicToken ? deviceId : null, handleData);

  /* Initial fetch */
  useEffect(() => {
    if (!deviceId) return;
    let alive = true;
    const url = publicToken
      ? `/api/public/telemetry/${publicToken}?deviceId=${encodeURIComponent(deviceId)}&key=${encodeURIComponent(key)}&limit=1`
      : `/api/telemetry?deviceId=${encodeURIComponent(deviceId)}&key=${encodeURIComponent(key)}&limit=1`;
    fetch(url).then(r => r.json()).then(json => {
      if (alive && json.ok && json.data?.[0]) setValue(Number(json.data[0].value));
    }).catch(() => {});
    return () => { alive = false; };
  }, [deviceId, key, publicToken]);

  const clamped = value !== null ? Math.min(max, Math.max(min, value)) : min;
  const ratio = (clamped - min) / (max - min);
  const needleAngle = ARC_START + ratio * ARC_RANGE;

  // Red zone: last 20%
  const redStart = ARC_START + 0.8 * ARC_RANGE; // 81° → 135°

  // Tick marks
  const ticks = [];
  for (let i = 0; i <= TICK_COUNT; i++) {
    const frac = i / TICK_COUNT;
    const angle = ARC_START + frac * ARC_RANGE;
    const isMajor = i % 2 === 0;
    const outer = polarToXY(CX, CY, R - 1, angle);
    const inner = polarToXY(CX, CY, R - (isMajor ? 10 : 6), angle);
    const labelPos = polarToXY(CX, CY, R - 16, angle);
    const tickVal = min + frac * (max - min);
    ticks.push({ outer, inner, labelPos, isMajor, angle, tickVal });
  }

  const needleTip = polarToXY(CX, CY, R - 10, needleAngle);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 8 }}>
      <svg viewBox="0 0 120 120" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        {/* Bezel */}
        <circle cx={CX} cy={CY} r="54" fill="#1e293b" stroke="#475569" strokeWidth="3" />
        <circle cx={CX} cy={CY} r="50" fill="#0f172a" />

        {/* Scale arc — normal zone */}
        <path d={describeArc(CX, CY, R, ARC_START, redStart)} fill="none" stroke="#475569" strokeWidth="3" strokeLinecap="round" />

        {/* Scale arc — red zone */}
        <path d={describeArc(CX, CY, R, redStart, ARC_END)} fill="none" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" />

        {/* Tick marks */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={t.outer.x} y1={t.outer.y}
              x2={t.inner.x} y2={t.inner.y}
              stroke={t.angle >= redStart ? "#dc2626" : "#94a3b8"}
              strokeWidth={t.isMajor ? 1.5 : 0.8}
            />
            {t.isMajor && (
              <text
                x={t.labelPos.x} y={t.labelPos.y}
                textAnchor="middle" dominantBaseline="central"
                fontSize="6" fill="#94a3b8" fontFamily="monospace"
              >
                {Math.round(t.tickVal)}
              </text>
            )}
          </g>
        ))}

        {/* Needle */}
        <line
          x1={CX} y1={CY}
          x2={needleTip.x} y2={needleTip.y}
          stroke="#f97316" strokeWidth="2" strokeLinecap="round"
          style={{ transition: "all 0.5s ease-out" }}
        />

        {/* Center cap */}
        <circle cx={CX} cy={CY} r="4" fill="#475569" stroke="#64748b" strokeWidth="1" />

        {/* Digital value */}
        <text x={CX} y={CY + 20} textAnchor="middle" fontSize="10" fontWeight="700" fill="#e2e8f0" fontFamily="monospace">
          {value !== null ? Number(value).toFixed(1) : "—"}
        </text>
        <text x={CX} y={CY + 28} textAnchor="middle" fontSize="6" fill="#64748b" fontFamily="monospace">
          {unit}
        </text>

        {/* Label */}
        <text x={CX} y="112" textAnchor="middle" fontSize="6" fontWeight="600" fill="#94a3b8" textTransform="uppercase">
          {label}
        </text>
      </svg>
    </div>
  );
}
