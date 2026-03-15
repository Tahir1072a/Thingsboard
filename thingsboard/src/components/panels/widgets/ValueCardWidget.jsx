"use client";

/**
 * ValueCardWidget — Değer Kartı
 * Son telemetri değerini büyük rakamla gösterir + trend.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function ValueCardWidget({
  deviceId, keys = [], title = "Değer",
  config = {},
}) {
  const key = keys[0] || "value";
  const unit = config.unit || "";

  const [value, setValue] = useState(null);
  const [trend, setTrend] = useState("stable"); // up | down | stable
  const [connected, setConnected] = useState(false);
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

  const trendConfig = {
    up: { icon: TrendingUp, color: "text-green-500", bg: "bg-green-50" },
    down: { icon: TrendingDown, color: "text-red-500", bg: "bg-red-50" },
    stable: { icon: Minus, color: "text-gray-400", bg: "bg-gray-50" },
  };

  const { icon: TrendIcon, color: trendColor, bg: trendBg } = trendConfig[trend];

  return (
    <div className="h-full flex flex-col justify-between p-1">
      <div className="flex items-center justify-between shrink-0">
        <h3 className="text-sm font-semibold text-text-main truncate">{title}</h3>
        <div className={`p-1 rounded-md ${trendBg}`}>
          <TrendIcon className={`h-3.5 w-3.5 ${trendColor}`} />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tabular-nums text-text-main">
          {value !== null ? value.toFixed(1) : "—"}
        </span>
        <span className="text-sm text-text-muted capitalize mt-1">
          {unit || key}
        </span>
      </div>

      <div className="flex items-center justify-between text-[10px] text-text-muted shrink-0">
        <span className="capitalize">{key}</span>
        <span className="flex items-center gap-1">
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-green-500" : "bg-gray-400"}`} />
          {lastUpdate ? lastUpdate.toLocaleTimeString("tr-TR") : "—"}
        </span>
      </div>
    </div>
  );
}
