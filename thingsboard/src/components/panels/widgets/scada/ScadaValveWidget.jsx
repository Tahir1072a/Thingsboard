"use client";

/**
 * ScadaValveWidget — Butterfly Valve SCADA Symbol
 *
 * Inline SVG of a butterfly valve. Disc rotates 0° (closed) → 90° (open).
 * Green when open, red when closed. Smooth CSS transition.
 *
 * Config: label, rpcMethod
 * Telemetry key: "status" (truthy / "open" = open)
 */

import { useState, useCallback } from "react";
import { useTelemetrySSE } from "@/lib/sse-pool";

export default function ScadaValveWidget({
  devices = [], keys = [], title = "Valve",
  config = {}, publicToken,
}) {
  const device = devices[0];
  const deviceId = device?.id || null;
  const deviceName = device?.name || "Unknown Device";
  const telemetryKey = keys[0] || "status";

  const label = config.label || title;
  const rpcMethod = config.rpcMethod || null;

  const [value, setValue] = useState(null);

  const handleData = useCallback((incoming) => {
    if (incoming.key === telemetryKey) {
      setValue(incoming.value);
    }
  }, [telemetryKey]);

  useTelemetrySSE(deviceId, handleData);

  // Determine open/closed state
  const isOpen =
    value === true || value === 1 || value === "1" ||
    value === "open" || value === "true" || value === "ON";

  const stateColor = isOpen ? "#22c55e" : "#ef4444";
  const discAngle = isOpen ? 90 : 0;
  const clickable = !!rpcMethod;

  const handleClick = async () => {
    if (!rpcMethod || !deviceId) return;
    try {
      await fetch(`/api/rpc/${deviceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: rpcMethod, params: { state: !isOpen } }),
      });
    } catch (err) {
      console.error("RPC call failed:", err);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-3 gap-2">
      {/* Device badge */}
      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
        {deviceName}
      </div>

      {/* SVG Valve */}
      <svg
        viewBox="0 0 120 100"
        className="w-full max-w-[180px]"
        style={{ cursor: clickable ? "pointer" : "default" }}
        onClick={clickable ? handleClick : undefined}
        role={clickable ? "button" : undefined}
        aria-label={`${label}: ${isOpen ? "Open" : "Closed"}`}
      >
        {/* Pipe connections */}
        <rect x="0" y="40" width="30" height="20" rx="2" fill="#94a3b8" />
        <rect x="90" y="40" width="30" height="20" rx="2" fill="#94a3b8" />

        {/* Valve body (circle) */}
        <circle
          cx="60" cy="50" r="26"
          fill="none"
          stroke={stateColor}
          strokeWidth="4"
          style={{ transition: "stroke 0.4s ease" }}
        />

        {/* Inner fill glow */}
        <circle
          cx="60" cy="50" r="22"
          fill={stateColor}
          opacity="0.08"
          style={{ transition: "fill 0.4s ease" }}
        />

        {/* Disc (rotating line) */}
        <line
          x1="60" y1="28" x2="60" y2="72"
          stroke={stateColor}
          strokeWidth="5"
          strokeLinecap="round"
          style={{
            transformOrigin: "60px 50px",
            transform: `rotate(${discAngle}deg)`,
            transition: "transform 0.5s cubic-bezier(.4,0,.2,1), stroke 0.4s ease",
          }}
        />

        {/* Actuator stem */}
        <line x1="60" y1="24" x2="60" y2="10" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
        <rect x="50" y="4" width="20" height="10" rx="3" fill="#475569" />
      </svg>

      {/* Status label */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <span
          className="text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
          style={{
            color: stateColor,
            backgroundColor: isOpen ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            transition: "all 0.4s ease",
          }}
        >
          {isOpen ? "OPEN" : "CLOSED"}
        </span>
      </div>
    </div>
  );
}
