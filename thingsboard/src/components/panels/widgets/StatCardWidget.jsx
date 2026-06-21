"use client";

/**
 * StatCardWidget — Çoklu Metrik Kartı
 * Tek cihazın birden fazla metriğini yan yana gösterir.
 * SSE ile canlı güncelleme alır. Recharts kullanmaz — pure CSS + Lucide icons.
 * publicToken verildiğinde SSE yerine polling kullanır.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { Activity, TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import { getUnitSymbol } from "@/lib/units";
import { useTelemetrySSE, useSSEConnected } from "@/lib/sse-pool";

const ACCENT_COLORS = [
  { text: "text-indigo-500", bg: "bg-indigo-50", border: "border-indigo-200/50", ring: "ring-indigo-100" },
  { text: "text-cyan-500", bg: "bg-cyan-50", border: "border-cyan-200/50", ring: "ring-cyan-100" },
  { text: "text-amber-500", bg: "bg-amber-50", border: "border-amber-200/50", ring: "ring-amber-100" },
  { text: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200/50", ring: "ring-emerald-100" },
  { text: "text-red-500", bg: "bg-red-50", border: "border-red-200/50", ring: "ring-red-100" },
  { text: "text-purple-500", bg: "bg-purple-50", border: "border-purple-200/50", ring: "ring-purple-100" },
  { text: "text-pink-500", bg: "bg-pink-50", border: "border-pink-200/50", ring: "ring-pink-100" },
  { text: "text-lime-500", bg: "bg-lime-50", border: "border-lime-200/50", ring: "ring-lime-100" },
];

export default function StatCardWidget({
  devices = [], keys = [], title = "Çoklu Metrik",
  config = {}, publicToken,
}) {
  const device = devices[0];
  const deviceId = device?.id;
  const deviceName = device?.name || "Bilinmeyen Cihaz";

  // Config değerleri
  const layout = config.layout || "grid";
  const columns = config.columns || Math.min(keys.length, 4) || 3;
  const showTrend = config.showTrend !== undefined ? config.showTrend : true;
  const showSparkline = config.showSparkline || false;
  const decimals = config.decimals !== undefined ? config.decimals : 1;
  const unitSymbol = config.unit ? getUnitSymbol(config.unit) : "";

  // { [key]: { value, prevValue, trend } }
  const [metrics, setMetrics] = useState({});
  const connected = useSSEConnected();
  const prevValuesRef = useRef({});

  const handleData = useCallback((incoming) => {
    const { key, value } = incoming;
    if (!keys.includes(key)) return;

    setMetrics((prev) => {
      const prevValue = prevValuesRef.current[key];
      let trend = "stable";
      if (prevValue !== undefined) {
        if (value > prevValue) trend = "up";
        else if (value < prevValue) trend = "down";
      }
      prevValuesRef.current[key] = value;

      return {
        ...prev,
        [key]: { value, prevValue: prevValue ?? null, trend },
      };
    });
  }, [keys]);

  // Telemetri URL'ini belirle
  const getTelemetryUrl = useCallback((key, params = "") => {
    if (publicToken) {
      return `/api/public/telemetry/${publicToken}?deviceId=${encodeURIComponent(deviceId)}&key=${encodeURIComponent(key)}${params}`;
    }
    return `/api/telemetry?deviceId=${encodeURIComponent(deviceId)}&key=${encodeURIComponent(key)}${params}`;
  }, [publicToken, deviceId]);

  // SSE pool hook — aktif sadece publicToken yokken
  useTelemetrySSE(!publicToken ? deviceId : null, handleData);

  useEffect(() => {
    if (!deviceId || keys.length === 0) return;

    let isMounted = true;
    let pollInterval = null;

    // 1. Her key için geçmiş veriyi çek
    const fetchHistory = async () => {
      try {
        const promises = keys.map(key =>
          fetch(getTelemetryUrl(key, `&limit=2`))
            .then(res => res.json())
            .then(json => ({ key, data: json.data || [] }))
        );

        const results = await Promise.all(promises);

        if (isMounted) {
          const initial = {};
          results.forEach(({ key, data }) => {
            if (data.length > 0) {
              const current = data[0].value;
              const prev = data.length > 1 ? data[1].value : null;
              let trend = "stable";
              if (prev !== null) {
                if (current > prev) trend = "up";
                else if (current < prev) trend = "down";
              }
              initial[key] = { value: current, prevValue: prev, trend };
              prevValuesRef.current[key] = current;
            }
          });
          setMetrics(initial);
        }
      } catch (err) {
        console.error("Geçmiş veri çekilemedi:", err);
      }
    };

    // 2. Canlı veriyi başlat
    const startLiveData = () => {
      if (publicToken) {
        pollInterval = setInterval(async () => {
          if (!isMounted) return;
          try {
            const promises = keys.map(key =>
              fetch(getTelemetryUrl(key, `&limit=1`))
                .then(res => res.json())
                .then(json => ({ key, data: json.data || [] }))
            );
            const results = await Promise.all(promises);
            results.forEach(({ key, data }) => {
              if (data.length > 0) {
                handleData({
                  key,
                  value: data[0].value,
                });
              }
            });
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
  }, [deviceId, keys, handleData, publicToken, getTelemetryUrl]);

  const TrendIcon = { up: TrendingUp, down: TrendingDown, stable: Minus };
  const trendLabel = { up: "text-green-500", down: "text-red-500", stable: "text-gray-400" };

  return (
    <div className="h-full flex flex-col">
      {/* Cihaz adı badge + LIVE göstergesi */}
      <div className="flex items-center justify-between mb-3 shrink-0 px-1">
        <span className="px-2 py-0.5 bg-slate-100/50 backdrop-blur-md rounded border border-slate-200/50 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
          {deviceName}
        </span>
        <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${connected ? "text-green-500" : "text-gray-400"}`}>
          <span className={`h-2 w-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)] ${connected ? "bg-green-400 shadow-green-400/50 animate-pulse" : "bg-red-400 shadow-red-400/50"}`} />
          {connected ? "LIVE" : "WAIT"}
        </span>
      </div>

      {/* Metrik Grid / List */}
      <div
        className={`flex-1 min-h-0 gap-3 ${
          layout === "list" ? "flex flex-col" : "grid"
        }`}
        style={layout === "grid" ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
      >
        {keys.map((key, i) => {
          const metric = metrics[key];
          const accent = ACCENT_COLORS[i % ACCENT_COLORS.length];
          const trend = metric?.trend || "stable";
          const Icon = TrendIcon[trend];

          return (
            <div
              key={key}
              className={`${
                layout === "list"
                  ? "flex items-center justify-between p-3 rounded-xl border bg-white/60 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow duration-200"
                  : "flex flex-col justify-between p-3 rounded-xl border bg-white/60 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow duration-200"
              } ${accent.border}`}
            >
              {/* İkon + Key İsmi */}
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${accent.bg}`}>
                  <Activity className={`h-3.5 w-3.5 ${accent.text}`} />
                </div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                  {key}
                </span>
              </div>

              {/* Değer + Birim */}
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-2xl font-extrabold text-slate-800 tabular-nums tracking-tight">
                  {metric?.value !== undefined
                    ? (typeof metric.value === "number" ? metric.value.toFixed(decimals) : metric.value)
                    : "—"}
                </span>
                {unitSymbol && (
                  <span className="text-sm font-medium text-slate-400">{unitSymbol}</span>
                )}
              </div>

              {/* Sparkline placeholder */}
              {showSparkline && (
                <div className="flex items-center gap-1 mb-1 text-slate-300">
                  <BarChart3 className="h-4 w-10" />
                </div>
              )}

              {/* Trend */}
              {showTrend && (
                <div className={`flex items-center gap-1 ${trendLabel[trend]}`}>
                  <Icon className="h-3 w-3" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">{trend}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
