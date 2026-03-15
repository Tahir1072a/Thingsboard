"use client";

/**
 * LineChartWidget — Çizgi Grafik Widget
 * SSE ile canlı telemetri verisi gösterir.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = [
  "#6366f1", "#22d3ee", "#f59e0b", "#10b981",
  "#ef4444", "#a855f7", "#ec4899", "#84cc16",
];

export default function LineChartWidget({
  deviceId, keys = [], title = "Çizgi Grafik",
  config = {},
}) {
  const maxPoints = config.maxPoints || 60;
  const [data, setData] = useState([]);
  const [connected, setConnected] = useState(false);
  const [lastValues, setLastValues] = useState({});

  const addPoint = useCallback((incoming) => {
    const { key, value, timestamp } = incoming;
    if (!keys.includes(key)) return;

    const time = new Date(timestamp).toLocaleTimeString("tr-TR", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });

    setData((prev) => {
      const last = prev[prev.length - 1];
      if (last && last._time === time) {
        const updated = [...prev];
        updated[updated.length - 1] = { ...last, [key]: value };
        return updated;
      }
      const newPoint = { _time: time, [key]: value };
      const next = [...prev, newPoint];
      return next.length > maxPoints ? next.slice(-maxPoints) : next;
    });

    setLastValues((prev) => ({ ...prev, [key]: value }));
  }, [keys, maxPoints]);

  useEffect(() => {
    if (!deviceId) return;
    const url = `/api/sse?deviceId=${encodeURIComponent(deviceId)}`;
    const es = new EventSource(url);

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (e) => {
      try { addPoint(JSON.parse(e.data)); } catch {}
    };

    return () => { es.close(); setConnected(false); };
  }, [deviceId, addPoint]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h3 className="text-sm font-semibold text-text-main truncate">{title}</h3>
        <span className={`flex items-center gap-1.5 text-[10px] font-medium ${connected ? "text-green-500" : "text-gray-400"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
          {connected ? "Canlı" : "…"}
        </span>
      </div>

      {keys.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2 shrink-0">
          {keys.map((key, i) => (
            <div key={key} className="flex items-center gap-1.5 rounded-md bg-muted/40 px-2 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-[10px] text-text-muted capitalize">{key}</span>
              <span className="text-xs font-bold tabular-nums" style={{ color: COLORS[i % COLORS.length] }}>
                {lastValues[key] !== undefined ? lastValues[key].toFixed(1) : "—"}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
            <XAxis dataKey="_time" tick={{ fontSize: 9, fill: "#94a3b8" }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} />
            <Tooltip contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "11px" }} />
            {keys.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
