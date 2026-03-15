"use client";

/**
 * GaugeWidget — Yarım Daire Gösterge
 * SSE ile anlık telemetri değeri gösterir.
 */

import { useEffect, useState, useCallback } from "react";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";

export default function GaugeWidget({
  deviceId, keys = [], title = "Gauge",
  config = {},
}) {
  const key = keys[0] || "value";
  const min = config.min ?? 0;
  const max = config.max ?? 100;
  const unit = config.unit || "";

  const [value, setValue] = useState(null);
  const [connected, setConnected] = useState(false);

  const handleData = useCallback((incoming) => {
    if (incoming.key === key) {
      setValue(incoming.value);
    }
  }, [key]);

  useEffect(() => {
    if (!deviceId) return;
    const es = new EventSource(`/api/sse?deviceId=${encodeURIComponent(deviceId)}`);
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (e) => {
      try { handleData(JSON.parse(e.data)); } catch {}
    };
    return () => { es.close(); setConnected(false); };
  }, [deviceId, handleData]);

  const percentage = value !== null ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100)) : 0;

  const getColor = () => {
    if (percentage > 80) return "#ef4444";
    if (percentage > 60) return "#f59e0b";
    if (percentage > 40) return "#22d3ee";
    return "#10b981";
  };

  const gaugeData = [{ value: percentage, fill: getColor() }];

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="flex items-center justify-between w-full mb-1 shrink-0 px-1">
        <h3 className="text-sm font-semibold text-text-main truncate">{title}</h3>
        <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full">
        <div className="relative w-full" style={{ maxWidth: "180px", aspectRatio: "1" }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%" cy="50%"
              innerRadius="70%"
              outerRadius="100%"
              startAngle={210}
              endAngle={-30}
              barSize={12}
              data={gaugeData}
            >
              <RadialBar
                cornerRadius={6}
                dataKey="value"
                background={{ fill: "#e2e8f0" }}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums" style={{ color: getColor() }}>
              {value !== null ? value.toFixed(1) : "—"}
            </span>
            <span className="text-xs text-text-muted capitalize">{unit || key}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
