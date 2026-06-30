"use client";

/**
 * ScadaPumpWidget — Centrifugal Pump SCADA Symbol
 *
 * Inline SVG with rotating fan blades when running.
 * Green glow when active, gray when stopped.
 *
 * Config: label
 * Telemetry key: "running" (truthy = spinning)
 */

import { useState, useCallback, useEffect } from "react";
import { useTelemetrySSE } from "@/lib/sse-pool";

export default function ScadaPumpWidget({
  devices = [], keys = [], title = "Pump",
  config = {}, publicToken,
}) {
  const device = devices[0];
  const deviceId = device?.id || null;
  const deviceName = device?.name || "Unknown Device";
  const telemetryKey = keys[0] || "running";

  const label = config.label || title;

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
          const v = json.data[0].value;
          setValue(v);
        }
      } catch {}
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => { alive = false; clearInterval(interval); };
  }, [publicToken, deviceId, telemetryKey]);

  const isRunning =
    value === true || value === 1 || value === "1" ||
    value === "true" || value === "ON" || value === "running";

  const activeColor = "#22c55e";
  const idleColor = "#94a3b8";
  const color = isRunning ? activeColor : idleColor;

  return (
    <div className="h-full flex flex-col items-center justify-center p-3 gap-2">
      {/* Keyframes injected via <style> */}
      <style>{`
        @keyframes scada-pump-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* Device badge */}
      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
        {deviceName}
      </div>

      {/* SVG Pump */}
      <svg viewBox="0 0 120 120" className="w-full max-w-[180px]">
        {/* Outer casing */}
        <circle
          cx="60" cy="60" r="44"
          fill="none"
          stroke={color}
          strokeWidth="5"
          style={{ transition: "stroke 0.4s ease" }}
        />

        {/* Glow ring when running */}
        {isRunning && (
          <circle
            cx="60" cy="60" r="48"
            fill="none"
            stroke={activeColor}
            strokeWidth="2"
            opacity="0.3"
          />
        )}

        {/* Inner fill */}
        <circle
          cx="60" cy="60" r="40"
          fill={color}
          opacity="0.06"
          style={{ transition: "fill 0.4s ease" }}
        />

        {/* Discharge pipe */}
        <rect x="100" y="52" width="18" height="16" rx="2" fill="#94a3b8" />
        {/* Suction pipe */}
        <rect x="52" y="100" width="16" height="18" rx="2" fill="#94a3b8" />

        {/* Fan blades group (rotates when running) */}
        <g
          style={{
            transformOrigin: "60px 60px",
            animation: isRunning ? "scada-pump-spin 1.2s linear infinite" : "none",
          }}
        >
          {/* 4 curved blades */}
          {[0, 90, 180, 270].map((angle) => (
            <path
              key={angle}
              d="M60,60 Q60,38 75,30"
              fill="none"
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
              style={{
                transformOrigin: "60px 60px",
                transform: `rotate(${angle}deg)`,
                transition: "stroke 0.4s ease",
              }}
            />
          ))}
          {/* Center hub */}
          <circle cx="60" cy="60" r="6" fill={color} style={{ transition: "fill 0.4s ease" }} />
        </g>
      </svg>

      {/* Status label */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <span
          className="text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
          style={{
            color,
            backgroundColor: isRunning ? "rgba(34,197,94,0.1)" : "rgba(148,163,184,0.1)",
            transition: "all 0.4s ease",
          }}
        >
          {isRunning ? "RUNNING" : "STOPPED"}
        </span>
      </div>
    </div>
  );
}
