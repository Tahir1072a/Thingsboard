"use client";

/**
 * ValueCardWidget — Değer Kartı
 * Son telemetri değerini büyük rakamla gösterir + trend.
 * publicToken verildiğinde SSE yerine polling kullanır.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { TrendingUp, TrendingDown, Minus, Thermometer, Droplets, Gauge, Zap, Wind, Sun, CloudRain, Activity, Flame, Waves } from "lucide-react";
import { useTelemetrySSE, useSSEConnected } from "@/lib/sse-pool";
import { getUnitSymbol } from "@/lib/units";

const ICON_MAP = {
  Thermometer, Droplets, Gauge, Zap, Wind, Sun, CloudRain, Activity, Flame, Waves,
};

export default function ValueCardWidget({
  devices = [], keys = [], title = "Değer",
  config = {}, publicToken,
}) {
  const device = devices[0];
  const deviceId = device?.id;
  const deviceName = device?.name || "Bilinmeyen Cihaz";
  const key = keys[0] || "value";
  const unitSymbol = config.unit ? getUnitSymbol(config.unit) : "";
  const showTrend = config.showTrend !== undefined ? config.showTrend : true;
  const IconComponent = ICON_MAP[config.icon] || Thermometer;
  const accentColor = config.accentColor || "#6366f1";
  const fontSize = config.fontSize || "text-4xl";
  const decimals = config.decimals ?? 1;
  const showLastUpdate = config.showLastUpdate !== undefined ? config.showLastUpdate : true;
  const animationEnabled = config.animation !== undefined ? config.animation : true;

  const [value, setValue] = useState(null);
  const [trend, setTrend] = useState("stable"); // up | down | stable
  const connected = useSSEConnected();
  const [lastUpdate, setLastUpdate] = useState(null);
  const prevValueRef = useRef(null);

  const handleData = useCallback((incoming) => {
    if (incoming.key !== key) return;

    const newVal = incoming.value;
    if (prevValueRef.current !== null) {
      if (newVal > prevValueRef.current) setTrend("up");
      else if (newVal < prevValueRef.current) setTrend("down");
      else setTrend("stable");
    }
    prevValueRef.current = newVal;
    setValue(newVal);
    setLastUpdate(new Date());
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
          const item = json.data[0];
          setValue(item.value);
          setLastUpdate(new Date(item.timestamp));
          prevValueRef.current = item.value;
        }
      } catch (err) {
        console.error("Geçmiş veri çekilemedi:", err);
      }
    };

    const startLiveData = () => {
      if (publicToken) {
        // Public mod: 10 saniyede bir polling
        pollInterval = setInterval(async () => {
          if (!isMounted) return;
          try {
            const res = await fetch(getTelemetryUrl("&limit=1"));
            const json = await res.json();
            if (json.ok && json.data && json.data.length > 0) {
              handleData({
                key,
                value: json.data[0].value,
                timestamp: json.data[0].timestamp,
              });
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

  const trendConfig = {
    up: { icon: TrendingUp, color: "text-green-500", bg: "bg-green-50" },
    down: { icon: TrendingDown, color: "text-red-500", bg: "bg-red-50" },
    stable: { icon: Minus, color: "text-gray-400", bg: "bg-gray-50" },
  };

  const { icon: TrendIcon, color: trendColor, bg: trendBg } = trendConfig[trend];

  return (
    <div className="h-full flex flex-col justify-between p-4 relative">
      {/* Cihaz İsmi Etiketi */}
      <div className="absolute top-2 left-2 px-2 py-0.5 bg-slate-100/50 backdrop-blur-md rounded border border-slate-200/50 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
        {deviceName}
      </div>

      <div className="flex items-center justify-between shrink-0 mt-3">
        <IconComponent className="h-5 w-5" style={{ color: accentColor }} />
        {showTrend && (
          <div className={`px-2 py-1 rounded-full flex items-center gap-1 ${trendBg} ${trendColor} bg-opacity-50 backdrop-blur-sm border border-white/20`}>
            <TrendIcon className="h-3 w-3" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{trend}</span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col items-start justify-center pt-2">
        <div className="flex items-baseline gap-1">
          <span className={`${fontSize} md:text-5xl font-extrabold tracking-tight text-slate-800 drop-shadow-sm${animationEnabled ? " transition-all duration-300" : ""}`}>
            {value !== null ? value.toFixed(decimals) : "—"}
          </span>
          <span className="text-base font-medium text-slate-500 uppercase">
            {unitSymbol || key}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 shrink-0 font-medium tracking-wide">
        <span className="uppercase" style={{ color: accentColor }}>{key}</span>
        {showLastUpdate && (
          <span className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)] ${connected ? "bg-green-400 shadow-green-400/50" : "bg-red-400 shadow-red-400/50"}`} />
            {lastUpdate ? lastUpdate.toLocaleTimeString("tr-TR") : "Bekleniyor..."}
          </span>
        )}
      </div>
    </div>
  );
}
