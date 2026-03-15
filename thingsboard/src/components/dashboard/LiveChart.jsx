"use client";

/**
 * LiveChart.jsx — Canlı Telemetri Grafiği
 * SSE bağlantısı ile kayan pencereli çizgi grafik.
 * deviceId = MongoDB ObjectId kullanır.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = [
  "#6366f1", "#06b6d4", "#f59e0b", "#10b981",
  "#ef4444", "#a855f7", "#ec4899", "#84cc16",
];

export default function LiveChart({
  deviceId,
  keys = [],
  maxPoints = 60,
  title = "Canlı Veri",
}) {
  const [data, setData] = useState([]);
  const [connected, setConnected] = useState(false);
  const [lastValues, setLastValues] = useState({});
  const esRef = useRef(null);

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
    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (e) => {
      try { addPoint(JSON.parse(e.data)); } catch {}
    };

    return () => { es.close(); setConnected(false); };
  }, [deviceId, addPoint]);

  return (
    <div className="glass rounded-xl p-4 shadow-sm">
      {/* Başlık */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-main">{title}</h3>
        <span className={`flex items-center gap-1.5 text-xs font-medium ${
          connected ? "text-green-500" : "text-gray-400"
        }`}>
          <span className={`h-2 w-2 rounded-full ${
            connected ? "bg-green-500 animate-pulse" : "bg-gray-400"
          }`} />
          {connected ? "Canlı" : "Bağlanıyor..."}
        </span>
      </div>

      {/* Son değer kartları */}
      {keys.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {keys.map((key, i) => (
            <div key={key} className="flex items-center gap-2 rounded-lg bg-white/60 px-3 py-1.5 border border-white/40">
              <span className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-xs text-text-muted capitalize">{key}</span>
              <span className="text-sm font-bold tabular-nums" style={{ color: COLORS[i % COLORS.length] }}>
                {lastValues[key] !== undefined ? lastValues[key].toFixed(1) : "—"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Grafik */}
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <defs>
            {keys.map((key, i) => (
              <linearGradient key={key} id={`live-grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} />
          <XAxis
            dataKey="_time"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            interval="preserveStartEnd"
            axisLine={{ stroke: "#e2e8f0" }}
          />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={{ stroke: "#e2e8f0" }} />
          <Tooltip
            contentStyle={{
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(8px)",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              fontSize: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
          {keys.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
