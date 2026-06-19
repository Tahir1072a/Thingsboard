"use client";

/**
 * BarChartWidget — Çubuk Grafik Widget
 * Birden fazla cihazın son değerlerini karşılaştırmalı çubuk grafikle gösterir.
 * SSE ile canlı güncelleme alır.
 */

import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, Cell, ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#6366f1", "#22d3ee", "#f59e0b", "#10b981",
  "#ef4444", "#a855f7", "#ec4899", "#84cc16",
];

export default function BarChartWidget({
  devices = [], keys = [], title = "Çubuk Grafik",
  config = {},
}) {
  const orientation = config.orientation || "vertical";
  const maxBars = config.maxBars || 10;
  const targetKey = keys[0] || "value";

  const [latestValues, setLatestValues] = useState({});
  const [connected, setConnected] = useState(false);

  const handleData = useCallback((incoming) => {
    const { deviceId, key, value } = incoming;
    if (key !== targetKey) return;

    const device = devices.find(d => d.id === deviceId);
    if (!device) return;

    setLatestValues((prev) => ({ ...prev, [device.id]: value }));
  }, [targetKey, devices]);

  useEffect(() => {
    if (devices.length === 0) return;

    let isMounted = true;
    const sseRef = { current: null };

    // 1. Geçmiş verileri çek (her cihaz için son değer)
    const fetchHistory = async () => {
      try {
        const promises = devices.map(d =>
          fetch(`/api/telemetry?deviceId=${encodeURIComponent(d.id)}&key=${encodeURIComponent(targetKey)}&limit=1`)
            .then(res => res.json())
            .then(json => ({ deviceId: d.id, data: json.data || [] }))
        );

        const results = await Promise.all(promises);

        if (isMounted) {
          const initial = {};
          results.forEach(({ deviceId, data }) => {
            if (data.length > 0) {
              initial[deviceId] = data[0].value;
            }
          });
          setLatestValues(initial);
        }
      } catch (err) {
        console.error("Geçmiş veri çekilemedi:", err);
      }
    };

    // 2. Canlı veriyi (SSE) başlat
    const startSSE = () => {
      const url = devices.length === 1
        ? `/api/sse?deviceId=${encodeURIComponent(devices[0].id)}`
        : `/api/sse`;

      const es = new EventSource(url);
      sseRef.current = es;

      es.onopen = () => { if (isMounted) setConnected(true); };
      es.onerror = () => { if (isMounted) setConnected(false); };
      es.onmessage = (e) => {
        if (!isMounted) return;
        try { handleData(JSON.parse(e.data)); } catch {}
      };
    };

    fetchHistory().then(() => {
      if (isMounted) startSSE();
    });

    return () => {
      isMounted = false;
      if (sseRef.current) sseRef.current.close();
      setConnected(false);
    };
  }, [devices, targetKey, handleData]);

  // Çubuk grafik verisi: her cihaz bir bar
  const chartData = devices
    .filter(d => latestValues[d.id] !== undefined)
    .slice(0, maxBars)
    .map((device, i) => ({
      name: device.name,
      value: latestValues[device.id],
      color: COLORS[i % COLORS.length],
    }));

  const isHorizontal = orientation === "horizontal";

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-end mb-2 shrink-0 px-1">
        <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${connected ? "text-green-500" : "text-gray-400"}`}>
          <span className={`h-2 w-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)] ${connected ? "bg-green-400 shadow-green-400/50 animate-pulse" : "bg-red-400 shadow-red-400/50"}`} />
          {connected ? "LIVE" : "WAIT"}
        </span>
      </div>

      {chartData.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
          <svg className="h-10 w-10 mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h2v8H3zM9 9h2v12H9zM15 5h2v16h-2zM21 1h2v20h-2z" />
          </svg>
          <span className="text-xs font-medium">Henüz veri yok</span>
        </div>
      ) : (
        <div className="flex-1 min-h-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            {isHorizontal ? (
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.2)" />
                <XAxis type="number" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={80} />
                <Tooltip
                  contentStyle={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.4)", borderRadius: "12px", fontSize: "11px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  itemStyle={{ fontWeight: "bold" }}
                  formatter={(val) => [typeof val === "number" ? val.toFixed(2) : val, targetKey]}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} isAnimationActive={true} animationDuration={500}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.2)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.4)", borderRadius: "12px", fontSize: "11px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  itemStyle={{ fontWeight: "bold" }}
                  formatter={(val) => [typeof val === "number" ? val.toFixed(2) : val, targetKey]}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={true} animationDuration={500}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      <div className="shrink-0 mt-1 text-center text-[10px] text-slate-400 font-medium">
        {chartData.length} Cihaz • {targetKey}
      </div>
    </div>
  );
}
