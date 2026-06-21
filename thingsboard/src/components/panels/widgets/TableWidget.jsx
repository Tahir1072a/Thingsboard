"use client";

/**
 * TableWidget — Pivot Tablo Widget
 * Cihazları satır, seçili metrikleri sütun olarak gösterir.
 * Her cihazın en güncel (anlık) değerini yansıtır.
 * publicToken verildiğinde SSE yerine polling kullanır.
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { useMultiTelemetrySSE, useSSEConnected } from "@/lib/sse-pool";
import { ArrowUpUp, ArrowDownDown, ChevronLeft, ChevronRight } from "lucide-react";

export default function TableWidget({
  devices = [], keys = [], title = "Veri Tablosu",
  config = {}, publicToken,
}) {
  // Config değerleri
  const rowLimit = config.rowLimit !== undefined ? config.rowLimit : 50;
  const sortOrder = config.sortOrder || "desc";
  const striped = config.striped !== undefined ? config.striped : true;
  const pagination = config.pagination || false;
  const pageSize = config.pageSize !== undefined ? config.pageSize : 10;
  const decimals = config.decimals !== undefined ? config.decimals : 2;
  const showDeviceName = config.showDeviceName !== undefined ? config.showDeviceName : true;
  const showTimestamp = config.showTimestamp !== undefined ? config.showTimestamp : true;

  // Veri yapısı: { [deviceId]: { [key]: value, _time: timestamp } }
  const [deviceData, setDeviceData] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const connected = useSSEConnected();

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

  // SSE Pool hook — canlı veri (authenticated mod)
  const deviceIds = useMemo(() => devices.map(d => d.id), [devices]);
  useMultiTelemetrySSE(!publicToken ? deviceIds : null, handleData);

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
            data.forEach(item => {
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

    // 2. Canlı veriyi başlat (sadece polling — SSE artık hook ile yönetiliyor)
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
  }, [devices, keys, publicToken, getTelemetryUrl]);

  // Sıralama ve sınırlama
  const sortedDevices = useMemo(() => {
    const sorted = [...devices].sort((a, b) => {
      const tA = deviceData[a.id]?._time || 0;
      const tB = deviceData[b.id]?._time || 0;
      return sortOrder === "asc" ? tA - tB : tB - tA;
    });
    return sorted.slice(0, rowLimit);
  }, [devices, deviceData, sortOrder, rowLimit]);

  // Pagination hesaplaması
  const totalPages = pagination ? Math.max(1, Math.ceil(sortedDevices.length / pageSize)) : 1;
  const displayedDevices = pagination
    ? sortedDevices.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
    : sortedDevices;

  // Sayfa sınırını aşmamak için
  const safePage = Math.min(currentPage, totalPages - 1);
  if (safePage !== currentPage) setCurrentPage(safePage);

  const colSpan = (showDeviceName ? 1 : 0) + keys.length + (showTimestamp ? 1 : 0);

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
              {showDeviceName && <th className="py-3 px-4 font-bold">Cihaz İsmi</th>}
              {keys.map(key => (
                <th key={key} className="py-3 px-4 font-bold text-right">{key}</th>
              ))}
              {showTimestamp && <th className="py-3 px-4 font-bold text-right">Zaman</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayedDevices.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="text-center py-6 text-slate-400 italic">
                  Cihaz seçilmedi...
                </td>
              </tr>
            ) : (
              displayedDevices.map((device, rowIdx) => {
                const vals = deviceData[device.id] || {};
                const rowBg = striped && rowIdx % 2 === 1 ? "bg-slate-50/60" : "";
                return (
                  <tr key={device.id} className={`hover:bg-slate-50/80 transition-colors ${rowBg}`}>
                    {showDeviceName && (
                      <td className="py-2.5 px-4 font-semibold text-slate-700">{device.name}</td>
                    )}
                    {keys.map(key => {
                      const val = vals[key];
                      return (
                        <td key={key} className="py-2.5 px-4 text-right font-mono text-slate-600">
                          {val !== undefined 
                            ? (typeof val === "number" ? val.toFixed(decimals) : val) 
                            : <span className="text-slate-300">—</span>
                          }
                        </td>
                      );
                    })}
                    {showTimestamp && (
                      <td className="py-2.5 px-4 text-right text-xs text-slate-400 font-mono">
                        {vals._time
                          ? new Date(vals._time).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {pagination && totalPages > 1 && (
        <div className="shrink-0 mt-2 flex items-center justify-center gap-3">
          <button
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-slate-500" />
          </button>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {currentPage + 1} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage >= totalPages - 1}
            className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </button>
        </div>
      )}
      
      <div className="shrink-0 mt-2 text-center text-[10px] text-slate-400 font-medium">
        {displayedDevices.length} Cihaz • {keys.length} Metrik Gösteriliyor
      </div>
    </div>
  );
}
