"use client";

/**
 * ScadaSensorWidget — Circular Sensor Display SCADA Symbol
 *
 * Inline SVG with thick ring border colored by thresholds.
 * Shows numeric value + unit in center. Pulses when critical.
 *
 * Config: label, unit, warningThreshold, criticalThreshold, decimals
 * Telemetry key: "value"
 */

import { useState, useCallback, useEffect } from "react";
import { useTelemetrySSE } from "@/lib/sse-pool";

export default function ScadaSensorWidget({
  devices = [], keys = [], title = "Sensor",
  config = {}, publicToken,
}) {
  const device = devices[0];
  const deviceId = device?.id || null;
  const deviceName = device?.name || "Unknown Device";
  const telemetryKey = keys[0] || "value";

  const label = config.label || title;
  const unit = config.unit || "";
  const decimals = config.decimals ?? 1;
  const warningThreshold = config.warningThreshold ?? 60;
  const criticalThreshold = config.criticalThreshold ?? 80;

  const [value, setValue] = useState(null);

  const handleData = useCallback((incoming) => {
    if (incoming.key === telemetryKey) {
      setValue(incoming.value);
    }
  }, [telemetryKey]);

  useTelemetrySSE(!publicToken ? deviceId : null, handleData);

  // Public mod polling fallback
  useEffect(() => {
    if (!publicToken || !deviceId) return;
    let alive = true;
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/public/telemetry/${publicToken}?deviceId=${encodeURIComponent(deviceId)}&key=${encodeURIComponent(telemetryKey)}&limit=1`);
        const json = await res.json();
        if (alive && json.ok && json.data?.[0]) {
          setValue(json.data[0].value);
        }
      } catch {}
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => { alive = false; clearInterval(interval); };
  }, [publicToken, deviceId, telemetryKey]);

  const numValue = Number(value);
  const hasValue = value !== null && !isNaN(numValue);

  // Determine ring color by thresholds
  const getRingColor = () => {
    if (!hasValue) return "#94a3b8";
    if (numValue >= criticalThreshold) return "#ef4444";
    if (numValue >= warningThreshold) return "#f59e0b";
    return "#22c55e";
  };

  const ringColor = getRingColor();
  const isCritical = hasValue && numValue >= criticalThreshold;

  return (
    <div className="h-full flex flex-col items-center justify-center p-3 gap-2">
      {/* Keyframes for critical pulse */}
      <style>{`
        @keyframes scada-sensor-pulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.5; }
        }
      `}</style>

      {/* Device badge */}
      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
        {deviceName}
      </div>

      {/* SVG Sensor */}
      <svg
        viewBox="0 0 120 120"
        className="w-full max-w-[180px]"
        style={{
          animation: isCritical ? "scada-sensor-pulse 1s ease-in-out infinite" : "none",
        }}
      >
        {/* Outer glow ring (critical only) */}
        {isCritical && (
          <circle
            cx="60" cy="60" r="56"
            fill="none"
            stroke={ringColor}
            strokeWidth="2"
            opacity="0.3"
          />
        )}

        {/* Main thick ring border */}
        <circle
          cx="60" cy="60" r="50"
          fill="#f8fafc"
          stroke={ringColor}
          strokeWidth="8"
          style={{ transition: "stroke 0.4s ease" }}
        />

        {/* Inner subtle ring */}
        <circle
          cx="60" cy="60" r="42"
          fill="none"
          stroke={ringColor}
          strokeWidth="1"
          opacity="0.2"
          style={{ transition: "stroke 0.4s ease" }}
        />

        {/* Value text */}
        <text
          x="60" y={unit ? "55" : "60"}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="22"
          fontWeight="800"
          fill="#1e293b"
        >
          {hasValue ? numValue.toFixed(decimals) : "—"}
        </text>

        {/* Unit text */}
        {unit && (
          <text
            x="60" y="75"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="12"
            fontWeight="600"
            fill="#64748b"
          >
            {unit}
          </text>
        )}
      </svg>

      {/* Label and threshold indicator */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <span
          className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
          style={{
            color: ringColor,
            backgroundColor: `${ringColor}15`,
            transition: "all 0.4s ease",
          }}
        >
          {!hasValue ? "NO DATA" : isCritical ? "CRITICAL" : numValue >= warningThreshold ? "WARNING" : "NORMAL"}
        </span>
      </div>
    </div>
  );
}
