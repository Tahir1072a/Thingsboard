"use client";

/**
 * TableWidget — Pivot Tablo Widget
 * Cihazları satır, seçili metrikleri sütun olarak gösterir.
 * Her cihazın en güncel (anlık) değerini yansıtır.
 * publicToken verildiğinde SSE yerine polling kullanır.
 */

import { useEffect, useState, useCallback } from "react";
import { ArrowUpUp, ArrowDownDown } from "lucide-react";

export default function TableWidget({
  devices = [], keys = [], title = "Veri Tablosu",
  config = {}, publicToken,
}) {
  // Veri yapısı: { [deviceId]: { [key]: value, _time: timestamp } }
  const [deviceData, setDeviceData] = useState({});
  const [connected, setConnected] = useState(false);

  const handleData = useCallback((incoming) => {
    const { deviceId, key, value, timestamp } = incoming;
    
    // Gelen veri seçili key'lerden mi ve seçili cihazlardan mı?
    if (keys.length > 0 && !keys.includes(key)) return;
    if (!devices.find(d => d.id === deviceId)) return;

    setDeviceData((prev) => {
      const prevDevice = prev[deviceId] || {};
      return {
        ...prev,
        [deviceId]: {
          ...prevDevice,
          [key]: value,
          _time: timestamp, // Son güncelleme zamanı
        }
      };
    });
  }, [keys, devices]);

  // Telemetri URL'ini belirle
  const getTelemetryUrl = useCallback((deviceId, params = "") => {
    if (publicToken) {
      return `/api/public/telemetry/${publicToken}?deviceId=${encodeURIComponent(deviceId)}${params}`;
    }
    return `/api/telemetry?deviceId=${encodeURIComponent(deviceId)}${params}`;
  }, [publicToken]);

  useEffect(() => {
    if (devices.length === 0 || keys.length === 0) return;

    let isMounted = true;
    const sseRef = { current: null };
    let pollInterval = null;

    // 1. Tüm cihazların son değerlerini çek (Pivot için limit 1 yeterli)
    const fetchHistory = async () => {
      try {
        const promises = devices.map(d => 
          fetch(getTelemetryUrl(d.id, `&limit=${Math.max(10, keys.length)}`))
            .then(res => res.json())
            .then(json => ({ deviceId: d.id, data: json.data || [] }))
        );
        
        const results = await Promise.all(promises);
        
        if (isMounted) {
          const initialData = {};
          
          results.forEach(({ deviceId, data }) => {
            initialData[deviceId] = {};
            // En yeniler başta (limit 10 çektik çünkü birden fazla key olabilir)
            data.forEach(item => {
              // Sadece seçili key'leri al ve daha yeni bir değeri henüz yazmadıysak yaz
              if (keys.includes(item.key) && initialData[deviceId][item.key] === undefined) {
                initialData[deviceId][item.key] = item.value;
                if (!initialData[deviceId]._time) initialData[deviceId]._time = item.timestamp;
              }
            });
          });

          setDeviceData(initialData);
        }
      } catch (err) {
        console.error("Tablo geçmiş verisi çekilemedi:", err);
      }
    };

    // 2. Canlı veriyi başlat
    const startLiveData = () => {
      if (publicToken) {
        // Public mod: 10 saniyede bir polling
        pollInterval = setInterval(async () => {
          if (!isMounted) return;
          try {
            const promises = devices.map(d =>
              fetch(getTelemetryUrl(d.id, `&limit=${Math.max(10, keys.length)}`))
                .then(res => res.json())
                .then(json => ({ deviceId: d.id, data: json.data || [] }))
            );
            const results = await Promise.all(promises);
            results.forEach(({ deviceId, data }) => {
              data.forEach(item => {
                handleData({
                  deviceId,
                  key: item.key,
                  value: item.value,
                  timestamp: item.timestamp,
                });
              });
            });
            if (isMounted) setConnected(true);
          } catch {
            if (isMounted) setConnected(false);
          }
        }, 10000);
        setConnected(true);
      } else {
        // SSE modu (orijinal)
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
      }
    };

    fetchHistory().then(() => {
      if (isMounted) startLiveData();
    });

    return () => {
      isMounted = false;
      if (sseRef.current) sseRef.current.close();
      if (pollInterval) clearInterval(pollInterval);
      setConnected(false);
    };
  }, [devices, keys, handleData, publicToken, getTelemetryUrl]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-end mb-2 shrink-0 px-2 mt-1">
        <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${connected ? "text-green-500" : "text-gray-400"}`}>
          <span className={`h-2 w-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)] ${connected ? "bg-green-400 shadow-green-400/50 animate-pulse" : "bg-red-400 shadow-red-400/50"}`} />
          {connected ? "LIVE" : "WAIT"}
        </span>
      </div>

      <div className="flex-1 overflow-auto min-h-0 rounded-lg border border-slate-200/60 bg-white/50 backdrop-blur-sm shadow-sm mt-2">
        <table className="w-full text-sm text-left">
          <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-md z-10">
            <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
              <th className="py-3 px-4 font-bold">Cihaz İsmi</th>
              {keys.map(key => (
                <th key={key} className="py-3 px-4 font-bold text-right">{key}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {devices.length === 0 ? (
              <tr>
                <td colSpan={keys.length + 1} className="text-center py-6 text-slate-400 italic">
                  Cihaz seçilmedi...
                </td>
              </tr>
            ) : (
              devices.map((device) => {
                const vals = deviceData[device.id] || {};
                return (
                  <tr key={device.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-700">{device.name}</td>
                    {keys.map(key => {
                      const val = vals[key];
                      return (
                        <td key={key} className="py-2.5 px-4 text-right font-mono text-slate-600">
                          {val !== undefined 
                            ? (typeof val === "number" ? val.toFixed(2) : val) 
                            : <span className="text-slate-300">—</span>
                          }
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      <div className="shrink-0 mt-2 text-center text-[10px] text-slate-400 font-medium">
        {devices.length} Cihaz • {keys.length} Metrik Gösteriliyor
      </div>
    </div>
  );
}
