"use client";

/**
 * GaugeWidget — Yarım Daire Gösterge
 * SSE ile anlık telemetri değeri gösterir.
 */

import { useEffect, useState, useCallback } from "react";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";

export default function GaugeWidget({
  devices = [], keys = [], title = "Gauge",
  config = {},
}) {
  const device = devices[0];
  const deviceId = device?.id;
  const deviceName = device?.name || "Bilinmeyen Cihaz";
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

    let isMounted = true;
    const sseRef = { current: null };

    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/telemetry?deviceId=${encodeURIComponent(deviceId)}&key=${encodeURIComponent(key)}&limit=1`);
        const json = await res.json();
        if (json.ok && json.data && json.data.length > 0 && isMounted) {
          setValue(json.data[0].value);
        }
      } catch (err) {
        console.error("Geçmiş veri çekilemedi:", err);
      }
    };

    const startSSE = () => {
      const es = new EventSource(`/api/sse?deviceId=${encodeURIComponent(deviceId)}`);
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
  }, [deviceId, key, handleData]);

  const percentage = value !== null ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100)) : 0;

  const getColor = () => {
    if (percentage > 90) return "#ef4444"; // Kırmızı (Tehlike)
    if (percentage > 75) return "#f59e0b"; // Turuncu (Uyarı)
    return "#6366f1"; // Indigo (Normal/Uyumlu)
  };

  const gaugeData = [{ value: percentage, fill: getColor() }];

  return (
    <div className="h-full flex flex-col justify-between p-2 relative">
      {/* Cihaz İsmi Etiketi */}
      <div className="absolute top-1 left-2 px-2 py-0.5 bg-slate-100/50 backdrop-blur-md rounded border border-slate-200/50 text-[9px] font-bold text-slate-500 uppercase tracking-wider z-10">
        {deviceName}
      </div>

      {/* Başlık ve Durum */}
      <div className="flex items-center justify-between w-full mb-2 shrink-0 px-2 mt-4">
        <h3 className="text-sm font-medium text-slate-500 truncate">{title}</h3>
        <span className={`h-2 w-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)] ${connected ? "bg-green-400 shadow-green-400/50" : "bg-red-400 shadow-red-400/50"}`} />
      </div>

      {/* Gösterge (Gauge) */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full relative">
        <div className="relative w-full" style={{ maxWidth: "200px", aspectRatio: "1" }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%" cy="50%"
              innerRadius="75%"
              outerRadius="100%"
              startAngle={210}
              endAngle={-30}
              barSize={14}
              data={gaugeData}
            >
              <RadialBar
                cornerRadius={10}
                dataKey="value"
                background={{ fill: "rgba(255, 255, 255, 0.3)" }}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
            <span className="text-4xl font-extrabold tabular-nums tracking-tight text-slate-800 drop-shadow-sm">
              {value !== null ? value.toFixed(1) : "—"}
            </span>
            <span className="text-sm font-medium text-slate-500 capitalize mt-1">
              {percentage.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Alt Bilgiler (Footer) */}
      <div className="grid grid-cols-2 gap-2 mt-4 shrink-0 px-1">
        <div className="bg-white/30 backdrop-blur-md rounded-xl p-3 border border-white/40 flex flex-col items-center justify-center shadow-sm">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Gauge Range</span>
          <span className="text-sm font-bold text-slate-800">{min} – {max} {unit}</span>
        </div>
        <div className="bg-white/30 backdrop-blur-md rounded-xl p-3 border border-white/40 flex flex-col items-center justify-center shadow-sm">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Raw Value</span>
          <span className="text-sm font-bold text-slate-800">{value !== null ? value.toFixed(1) : "—"} {unit}</span>
        </div>
      </div>
    </div>
  );
}
