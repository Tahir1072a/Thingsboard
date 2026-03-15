"use client";

/**
 * TableWidget — Tablo Widget
 * Son N telemetri kaydını tablo olarak gösterir.
 */

import { useEffect, useState, useCallback } from "react";

export default function TableWidget({
  deviceId, keys = [], title = "Veri Tablosu",
  config = {},
}) {
  const maxRows = config.maxRows || 20;
  const [rows, setRows] = useState([]);
  const [connected, setConnected] = useState(false);

  const handleData = useCallback((incoming) => {
    if (keys.length > 0 && !keys.includes(incoming.key)) return;

    setRows((prev) => {
      const newRow = {
        time: new Date(incoming.timestamp).toLocaleTimeString("tr-TR"),
        key: incoming.key,
        value: typeof incoming.value === "number" ? incoming.value.toFixed(2) : incoming.value,
      };
      const next = [newRow, ...prev];
      return next.length > maxRows ? next.slice(0, maxRows) : next;
    });
  }, [keys, maxRows]);

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

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h3 className="text-sm font-semibold text-text-main truncate">{title}</h3>
        <span className={`flex items-center gap-1 text-[10px] font-medium ${connected ? "text-green-500" : "text-gray-400"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
          {rows.length} kayıt
        </span>
      </div>

      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-white/80 backdrop-blur-sm">
            <tr className="border-b border-gray-200">
              <th className="text-left py-1.5 px-2 font-semibold text-text-muted">Zaman</th>
              <th className="text-left py-1.5 px-2 font-semibold text-text-muted">Metrik</th>
              <th className="text-right py-1.5 px-2 font-semibold text-text-muted">Değer</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-4 text-text-muted">
                  Veri bekleniyor...
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <td className="py-1 px-2 font-mono text-text-muted">{row.time}</td>
                  <td className="py-1 px-2 capitalize">{row.key}</td>
                  <td className="py-1 px-2 text-right font-bold tabular-nums text-text-main">{row.value}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
