"use client";

/**
 * ScadaMotorWidget — Electric Motor Symbol
 *
 * Inline SVG of an electric motor with telemetry-driven state.
 * - `running` key = true/false from telemetry
 * - When running: shaft rotates, green LED, power value shown
 * - When stopped: static, red LED
 *
 * Config:
 *  - label: display name (default "Motor")
 *  - powerKey: optional second telemetry key for power reading
 */

import { useEffect, useState, useCallback } from "react";
import { useTelemetrySSE } from "@/lib/sse-pool";

export default function ScadaMotorWidget({
  devices = [], keys = [], title = "Motor",
  config = {}, publicToken,
}) {
  const device = devices[0];
  const deviceId = device?.id;
  const key = keys[0] || "running";
  const powerKey = config.powerKey || null;
  const label = config.label || title;

  const [running, setRunning] = useState(false);
  const [power, setPower] = useState(null);

  const handleData = useCallback((incoming) => {
    if (incoming.key === key) {
      const v = incoming.value;
      setRunning(v === true || v === "true" || v === 1 || v === "1");
    }
    if (powerKey && incoming.key === powerKey) {
      setPower(Number(incoming.value));
    }
  }, [key, powerKey]);

  useTelemetrySSE(!publicToken ? deviceId : null, handleData);

  /* Initial fetch + public mod polling */
  useEffect(() => {
    if (!deviceId) return;
    let alive = true;
    const url = publicToken
      ? `/api/public/telemetry/${publicToken}?deviceId=${encodeURIComponent(deviceId)}&key=${encodeURIComponent(key)}&limit=1`
      : `/api/telemetry?deviceId=${encodeURIComponent(deviceId)}&key=${encodeURIComponent(key)}&limit=1`;
    const fetchData = () => {
      fetch(url).then(r => r.json()).then(json => {
        if (alive && json.ok && json.data?.[0]) {
          const v = json.data[0].value;
          setRunning(v === true || v === "true" || v === 1 || v === "1");
        }
      }).catch(() => {});
    };
    fetchData();
    // Public modda 10s'de bir polling yap
    const interval = publicToken ? setInterval(fetchData, 10000) : null;
    return () => { alive = false; if (interval) clearInterval(interval); };
  }, [deviceId, key, publicToken]);

  const ledColor = running ? "#22c55e" : "#ef4444";
  const ledGlow = running ? "drop-shadow(0 0 4px #22c55e)" : "drop-shadow(0 0 4px #ef4444)";

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: 8 }}>
      <style>{`
        @keyframes scada-motor-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <svg viewBox="0 0 120 80" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        {/* Motor body */}
        <rect x="10" y="15" width="60" height="50" rx="4" fill="#475569" stroke="#334155" strokeWidth="2" />
        <rect x="12" y="17" width="56" height="46" rx="3" fill="#1e293b" />

        {/* M label */}
        <text x="40" y="46" textAnchor="middle" fontSize="20" fontWeight="700" fontFamily="monospace" fill="#94a3b8">M</text>

        {/* Mounting feet */}
        <rect x="14" y="65" width="14" height="6" rx="1" fill="#475569" />
        <rect x="42" y="65" width="14" height="6" rx="1" fill="#475569" />

        {/* Shaft housing */}
        <rect x="70" y="30" width="14" height="20" rx="2" fill="#475569" stroke="#334155" strokeWidth="1.5" />

        {/* Shaft circle (rotates when running) */}
        <g style={{
          transformOrigin: "96px 40px",
          animation: running ? "scada-motor-spin 0.8s linear infinite" : "none",
        }}>
          <circle cx="96" cy="40" r="12" fill="#334155" stroke="#475569" strokeWidth="2" />
          <line x1="96" y1="30" x2="96" y2="40" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
          <line x1="96" y1="40" x2="104" y2="46" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* LED indicator */}
        <circle cx="22" cy="24" r="4" fill={ledColor} style={{ filter: ledGlow }} />

        {/* Terminal box */}
        <rect x="24" y="8" width="20" height="8" rx="2" fill="#475569" stroke="#334155" strokeWidth="1" />
        <line x1="29" y1="8" x2="29" y2="4" stroke="#64748b" strokeWidth="1.5" />
        <line x1="34" y1="8" x2="34" y2="4" stroke="#64748b" strokeWidth="1.5" />
        <line x1="39" y1="8" x2="39" y2="4" stroke="#64748b" strokeWidth="1.5" />
      </svg>

      {/* Label & power */}
      <div style={{ textAlign: "center", lineHeight: 1.2 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </div>
        <div style={{ fontSize: 10, color: running ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
          {running ? "RUNNING" : "STOPPED"}
          {running && power !== null && ` · ${power.toFixed(1)} kW`}
        </div>
      </div>
    </div>
  );
}
