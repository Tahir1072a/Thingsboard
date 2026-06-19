"use client";

/**
 * LineChartWidget — Çizgi Grafik Widget
 * SSE ile canlı telemetri verisi gösterir.
 */

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Brush, Legend
} from "recharts";

const COLORS = [
  "#6366f1", "#22d3ee", "#f59e0b", "#10b981",
  "#ef4444", "#a855f7", "#ec4899", "#84cc16",
];

export default function LineChartWidget({
  devices = [], keys = [], title = "Çizgi Grafik",
  config = {},
}) {
  const maxPoints = config.maxPoints || 60;
  const targetKey = keys[0] || "value"; // LineChart artık tek key alıyor
  
  const [data, setData] = useState([]);
  const [connected, setConnected] = useState(false);
  const [lastValues, setLastValues] = useState({});

  // Grafikteki noktaları çizmek için gerekli.
  const addPoint = useCallback((incoming) => {
    const { deviceId, key, value, timestamp } = incoming;
    if (key !== targetKey) return;
    
    // Gelen verinin cihazı seçili cihazlar arasında mı?
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;

    const time = new Date(timestamp).toLocaleTimeString("tr-TR", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });

    setData((prev) => {
      const last = prev[prev.length - 1];
      if (last && last._time === time) {
        const updated = [...prev];
        updated[updated.length - 1] = { ...last, [device.name]: value };
        return updated;
      }

      const newPoint = { _time: time, [device.name]: value };
      const next = [...prev, newPoint];
      return next.length > maxPoints ? next.slice(-maxPoints) : next;
    });

    setLastValues((prev) => ({ ...prev, [device.name]: value }));
  }, [targetKey, devices, maxPoints]);

  useEffect(() => {
    if (devices.length === 0) return;

    let isMounted = true;
    const sseRef = { current: null };

    // 1. Önce geçmiş verileri çek
    const fetchHistory = async () => {
      try {
        const promises = devices.map(d => 
          fetch(`/api/telemetry?deviceId=${encodeURIComponent(d.id)}&key=${encodeURIComponent(targetKey)}&limit=${maxPoints}`)
            .then(res => res.json())
            .then(json => ({ deviceName: d.name, data: json.data || [] }))
        );
        
        const results = await Promise.all(promises);
        
        if (isMounted) {
          const grouped = {};
          const latestVals = { ...lastValues };

          // Tüm cihazların verilerini zamana göre grupla
          results.forEach(({ deviceName, data }) => {
            if (!data) return;
            // Eskiden yeniye sıralı olduğunu varsayıyoruz (veya tersine çeviriyoruz, API descending veriyorsa reverse yapalım)
            const sortedData = [...data].reverse();
            
            sortedData.forEach(item => {
              const time = new Date(item.timestamp).toLocaleTimeString("tr-TR", {
                hour: "2-digit", minute: "2-digit", second: "2-digit",
              });
              if (!grouped[time]) grouped[time] = { _time: time };
              grouped[time][deviceName] = item.value;
              latestVals[deviceName] = item.value;
            });
          });

          // Zamanlara göre sırala ve son maxPoints kadarını al
          // (Gruplama yapıldığında object key sırası güvenli olmayabilir ama TR saat formatında genelde sıralı kalır)
          const sortedKeys = Object.keys(grouped).sort();
          const arr = sortedKeys.map(k => grouped[k]).slice(-maxPoints);
          
          setData(arr);
          setLastValues(latestVals);
        }
      } catch (err) {
        console.error("Geçmiş veri çekilemedi:", err);
      }
    };

    // 2. Canlı veriyi (SSE) başlat
    const startSSE = () => {
      // Eğer tek cihaz varsa sadece ona abone ol, çok cihaz varsa hepsini dinle ve client tarafında filtrele
      const url = devices.length === 1 
        ? `/api/sse?deviceId=${encodeURIComponent(devices[0].id)}`
        : `/api/sse`;
        
      const es = new EventSource(url);
      sseRef.current = es;

      es.onopen = () => { if (isMounted) setConnected(true); };
      es.onerror = () => { if (isMounted) setConnected(false); };
      es.onmessage = (e) => {
        if (!isMounted) return;
        try { addPoint(JSON.parse(e.data)); } catch {}
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
  }, [devices, targetKey, maxPoints]); // addPoint dependency'si sorun yaratmamalı

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-end mb-2 shrink-0 px-1">
        <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${connected ? "text-green-500" : "text-gray-400"}`}>
          <span className={`h-2 w-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)] ${connected ? "bg-green-400 shadow-green-400/50 animate-pulse" : "bg-red-400 shadow-red-400/50"}`} />
          {connected ? "LIVE" : "WAIT"}
        </span>
      </div>

      {devices.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2 shrink-0">
          {devices.map((device, i) => (
            <div key={device.id} className="flex items-center gap-1.5 rounded-md bg-muted/40 px-2 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-[10px] text-text-muted capitalize">{device.name}</span>
              <span className="text-xs font-bold tabular-nums" style={{ color: COLORS[i % COLORS.length] }}>
                {lastValues[device.name] !== undefined ? lastValues[device.name].toFixed(1) : "—"}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 min-h-0 relative mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
            <defs>
              {devices.map((device, i) => (
                <linearGradient key={`color${device.id}`} id={`color${device.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.2)" />
            <XAxis dataKey="_time" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <Tooltip 
              contentStyle={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.4)", borderRadius: "12px", fontSize: "11px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} 
              itemStyle={{ fontWeight: "bold" }}
            />
            {devices.map((device, i) => (
              <Area 
                key={device.id} 
                name={device.name}
                type="monotone" 
                dataKey={device.name} 
                stroke={COLORS[i % COLORS.length]} 
                strokeWidth={3}
                fillOpacity={1} 
                fill={`url(#color${device.id})`} 
                isAnimationActive={false} 
                connectNulls={true}
              />
            ))}
            <Brush 
              dataKey="_time" 
              height={20} 
              stroke="#6366f1" 
              fill="rgba(255, 255, 255, 0.2)"
              tickFormatter={() => ""}
              className="rounded-xl overflow-hidden"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
