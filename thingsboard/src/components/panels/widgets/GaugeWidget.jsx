"use client";

/**
 * GaugeWidget — Yarım Daire Gösterge
 * SSE Pool ile anlık telemetri değeri gösterir.
 * publicToken verildiğinde SSE yerine polling kullanır.
 *
 * Config ayarları:
 *  - min, max, unit, colorRanges, decimals
 *  - barSize, startAngle, endAngle, showPercentage
 *  - animation, showTitle, backgroundColor
 */

import { useEffect, useState, useCallback } from "react";
import { useTelemetrySSE, useSSEConnected } from "@/lib/sse-pool";
import { getUnitSymbol } from "@/lib/units";
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from "recharts";

export default function GaugeWidget({
  devices = [], keys = [], title = "Gauge",
  config = {}, publicToken,
}) {
  const device = devices[0];
  const deviceId = device?.id;
  const deviceName = device?.name || "Bilinmeyen Cihaz";
  const key = keys[0] || "value";

  // Config değerlerini oku (varsayılanlarla birlikte)
  const min = config.min ?? 0;
  const max = config.max ?? 100;
  const unitKey = config.unit || "";
  const unitSymbol = getUnitSymbol(unitKey);
  const decimals = config.decimals ?? 1;
  const barSize = config.barSize ?? 14;
  const startAngle = config.startAngle ?? 210;
  const endAngle = config.endAngle ?? -30;
  const showPercentage = config.showPercentage !== false;
  const showTitle = config.showTitle !== false;
  const isAnimationActive = config.animation !== false;
  const backgroundColor = config.backgroundColor || "transparent";
  const colorRanges = config.colorRanges || [
    { from: 0, to: 50, color: "#22c55e" },
    { from: 50, to: 80, color: "#f59e0b" },
    { from: 80, to: 100, color: "#ef4444" },
  ];

  const [value, setValue] = useState(null);
  const connected = useSSEConnected();

  const handleData = useCallback((incoming) => {
    if (incoming.key === key) {
      setValue(incoming.value);
    }
  }, [key]);

  // Telemetri URL'ini belirle
  const getTelemetryUrl = useCallback((params = "") => {
    if (publicToken) {
      return `/api/public/telemetry/${publicToken}?deviceId=${encodeURIComponent(deviceId)}&key=${encodeURIComponent(key)}${params}`;
    }
    return `/api/telemetry?deviceId=${encodeURIComponent(deviceId)}&key=${encodeURIComponent(key)}${params}`;
  }, [publicToken, deviceId, key]);

  // SSE pool hook — aktif sadece publicToken yokken
  useTelemetrySSE(!publicToken ? deviceId : null, handleData);

  useEffect(() => {
    if (!deviceId) return;

    let isMounted = true;
    let pollInterval = null;

    const fetchHistory = async () => {
      try {
        const res = await fetch(getTelemetryUrl("&limit=1"));
        const json = await res.json();
        if (json.ok && json.data && json.data.length > 0 && isMounted) {
          setValue(json.data[0].value);
        }
      } catch (err) {
        console.error("Geçmiş veri çekilemedi:", err);
      }
    };

    const startLiveData = () => {
      if (publicToken) {
        pollInterval = setInterval(async () => {
          if (!isMounted) return;
          try {
            const res = await fetch(getTelemetryUrl("&limit=1"));
            const json = await res.json();
            if (json.ok && json.data && json.data.length > 0) {
              handleData({ key, value: json.data[0].value });
            }
          } catch {}
        }, 10000);
      }
    };

    fetchHistory().then(() => {
      if (isMounted) startLiveData();
    });

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [deviceId, key, handleData, publicToken, getTelemetryUrl]);

  const percentage = value !== null ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100)) : 0;

  // Config-driven renk hesaplama — colorRanges'den eşleşen aralığı bul
  const getColor = () => {
    if (!colorRanges || colorRanges.length === 0) return "#6366f1";

    // Yüzde yerine gerçek değer üzerinden eşleştir
    const actualValue = value ?? min;
    for (const range of colorRanges) {
      if (actualValue >= range.from && actualValue < range.to) {
        return range.color;
      }
    }
    // Son aralığın üst sınırında olanlar için son aralığın rengini döndür
    return colorRanges[colorRanges.length - 1]?.color || "#6366f1";
  };

  const gaugeData = [{ value: percentage, fill: getColor() }];

  return (
    <div
      className="h-full flex flex-col justify-between p-2 relative"
      style={{ backgroundColor: backgroundColor !== "transparent" ? backgroundColor : undefined }}
    >
      {/* Cihaz İsmi Etiketi */}
      <div className="absolute top-1 left-2 px-2 py-0.5 bg-slate-100/50 backdrop-blur-md rounded border border-slate-200/50 text-[9px] font-bold text-slate-500 uppercase tracking-wider z-10">
        {deviceName}
      </div>

      {/* Başlık ve Durum */}
      <div className="flex items-center justify-end w-full mb-2 shrink-0 px-2 mt-4">
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
              startAngle={startAngle}
              endAngle={endAngle}
              barSize={barSize}
              data={gaugeData}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar
                cornerRadius={10}
                dataKey="value"
                background={{ fill: "rgba(255, 255, 255, 0.3)" }}
                isAnimationActive={isAnimationActive}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
            <span className="text-4xl font-extrabold tabular-nums tracking-tight text-slate-800 drop-shadow-sm">
              {value !== null ? Number(value).toFixed(decimals) : "—"}
              {unitSymbol && <span className="text-lg font-semibold text-slate-500 ml-1">{unitSymbol}</span>}
            </span>
            {showPercentage && (
              <span className="text-sm font-medium text-slate-500 capitalize mt-1">
                {percentage.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Alt Bilgiler (Footer) */}
      <div className="grid grid-cols-2 gap-2 mt-4 shrink-0 px-1">
        <div className="bg-white/30 backdrop-blur-md rounded-xl p-3 border border-white/40 flex flex-col items-center justify-center shadow-sm">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Gauge Range</span>
          <span className="text-sm font-bold text-slate-800">{min} – {max} {unitSymbol}</span>
        </div>
        <div className="bg-white/30 backdrop-blur-md rounded-xl p-3 border border-white/40 flex flex-col items-center justify-center shadow-sm">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Raw Value</span>
          <span className="text-sm font-bold text-slate-800">{value !== null ? Number(value).toFixed(decimals) : "—"} {unitSymbol}</span>
        </div>
      </div>
    </div>
  );
}
