"use client";

/**
 * HistoricalChart.jsx — Geçmiş Telemetri Grafiği
 * REST API'den veri çeker, area chart ile gösterir.
 * deviceId = MongoDB ObjectId kullanır.
 */

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = [
  "#6366f1", "#06b6d4", "#f59e0b", "#10b981",
  "#ef4444", "#a855f7", "#ec4899", "#84cc16",
];

const PRESETS = [
  { label: "5 dk", minutes: 5 },
  { label: "15 dk", minutes: 15 },
  { label: "1 sa", minutes: 60 },
  { label: "6 sa", minutes: 360 },
  { label: "24 sa", minutes: 1440 },
];

export default function HistoricalChart({
  deviceId,
  keys = [],
  title = "Geçmiş Veri",
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMinutes, setSelectedMinutes] = useState(15);

  const fetchHistory = useCallback(async () => {
    if (!deviceId || keys.length === 0) return;

    setLoading(true);
    try {
      const to = new Date();
      const from = new Date(to - selectedMinutes * 60 * 1000);

      const promises = keys.map((key) =>
        fetch(
          `/api/telemetry?deviceId=${encodeURIComponent(deviceId)}` +
          `&key=${encodeURIComponent(key)}` +
          `&from=${from.toISOString()}&to=${to.toISOString()}&limit=500`
        ).then((r) => r.json())
      );

      const results = await Promise.all(promises);

      const merged = {};
      results.forEach((res, i) => {
        if (!res.ok) return;
        res.data.forEach((point) => {
          const time = new Date(point.timestamp).toLocaleTimeString("tr-TR", {
            hour: "2-digit", minute: "2-digit", second: "2-digit",
          });
          if (!merged[time]) merged[time] = { _time: time };
          merged[time][keys[i]] = point.value;
        });
      });

      setData(Object.values(merged).sort((a, b) => a._time.localeCompare(b._time)));
    } catch (err) {
      console.error("[HistoricalChart] Fetch hatası:", err);
    } finally {
      setLoading(false);
    }
  }, [deviceId, keys, selectedMinutes]);

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 60_000);
    return () => clearInterval(interval);
  }, [fetchHistory]);

  return (
    <div className="glass rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-text-main">{title}</h3>
        <div className="flex gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.minutes}
              onClick={() => setSelectedMinutes(p.minutes)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all cursor-pointer ${
                selectedMinutes === p.minutes
                  ? "bg-halo-600 text-white shadow-md"
                  : "bg-white/60 text-text-muted hover:bg-white/90 border border-white/40"
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={fetchHistory}
            className="px-3 py-1.5 text-xs rounded-lg bg-white/60 text-text-muted hover:bg-white/90 border border-white/40 transition-all cursor-pointer"
          >
            ↻ Yenile
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-56 text-sm text-text-muted">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-halo-600 mr-2" />
          Yükleniyor...
        </div>
      )}

      {!loading && data.length === 0 && (
        <div className="flex items-center justify-center h-56 text-sm text-text-muted">
          Bu aralıkta veri bulunamadı.
        </div>
      )}

      {!loading && data.length > 0 && (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <defs>
              {keys.map((key, i) => (
                <linearGradient key={key} id={`hist-grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} />
            <XAxis dataKey="_time" tick={{ fontSize: 10, fill: "#94a3b8" }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
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
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2.5}
                fill={`url(#hist-grad-${key})`}
                dot={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
