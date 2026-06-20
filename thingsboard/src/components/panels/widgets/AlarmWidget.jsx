"use client";

/**
 * AlarmWidget — Alarm Listesi Widget
 * Seçili cihazlar için canlı alarm tablosu gösterir.
 * SSE ile yeni alarm olaylarını dinler.
 */

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";

const SEVERITY_STYLES = {
  CRITICAL: { bg: "bg-red-100", text: "text-red-700", border: "border-red-200", label: "Kritik" },
  MAJOR: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200", label: "Büyük" },
  MINOR: { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-200", label: "Küçük" },
  WARNING: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200", label: "Uyarı" },
};

const STATUS_STYLES = {
  ACTIVE: { color: "bg-red-500", shadow: "shadow-red-400/50", label: "Aktif" },
  ACKNOWLEDGED: { color: "bg-yellow-500", shadow: "shadow-yellow-400/50", label: "Onaylandı" },
  CLEARED: { color: "bg-green-500", shadow: "shadow-green-400/50", label: "Temizlendi" },
};

export default function AlarmWidget({
  devices = [], keys = [], title = "Alarm Listesi",
  config = {},
}) {
  const showCleared = config.showCleared || false;
  const maxRows = config.maxRows || 10;

  const [alarms, setAlarms] = useState([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  // Cihaz ismi hızlı lookup
  const deviceNameMap = {};
  devices.forEach(d => { deviceNameMap[d.id] = d.name; });

  const fetchAlarms = useCallback(async () => {
    if (devices.length === 0) return;

    try {
      const promises = devices.map(d =>
        fetch(`/api/alarm?deviceId=${encodeURIComponent(d.id)}&limit=20`)
          .then(res => res.json())
          .then(json => (json.data || []).map(a => ({ ...a, deviceId: d.id })))
      );

      const results = await Promise.all(promises);
      const all = results.flat();

      // Zamana göre sırala (en yeni başta)
      all.sort((a, b) => new Date(b.timestamp || b.createdTime) - new Date(a.timestamp || a.createdTime));

      setAlarms(all);
    } catch (err) {
      console.error("Alarmlar çekilemedi:", err);
    } finally {
      setLoading(false);
    }
  }, [devices]);

  const handleAlarmEvent = useCallback((incoming) => {
    // SSE'den gelen alarm event'i
    const alarm = incoming;

    // Seçili cihazlardan biri mi kontrol et
    if (!devices.find(d => d.id === alarm.deviceId)) return;

    setAlarms((prev) => {
      // Aynı alarm varsa güncelle
      const existingIdx = prev.findIndex(a => a.id === alarm.id);
      let updated;
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], ...alarm };
      } else {
        updated = [alarm, ...prev];
      }

      // Sırala
      updated.sort((a, b) => new Date(b.timestamp || b.createdTime) - new Date(a.timestamp || a.createdTime));
      return updated;
    });
  }, [devices]);

  useEffect(() => {
    if (devices.length === 0) return;

    let isMounted = true;
    const sseRef = { current: null };

    // 1. Alarmları çek
    const init = async () => {
      await fetchAlarms();

      if (!isMounted) return;

      // 2. SSE başlat (alarm event'leri dinlemek için)
      const url = devices.length === 1
        ? `/api/sse?deviceId=${encodeURIComponent(devices[0].id)}`
        : `/api/sse`;

      const es = new EventSource(url);
      sseRef.current = es;

      es.onopen = () => { if (isMounted) setConnected(true); };
      es.onerror = () => { if (isMounted) setConnected(false); };
      es.addEventListener("alarm", (e) => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(e.data);
          handleAlarmEvent(data);
        } catch { }
      });
    };

    init();

    return () => {
      isMounted = false;
      if (sseRef.current) sseRef.current.close();
      setConnected(false);
    };
  }, [devices, fetchAlarms, handleAlarmEvent]);

  // Filtreleme
  const filteredAlarms = alarms
    .filter(a => showCleared || a.status !== "CLEARED")
    .slice(0, maxRows);

  const formatTime = (ts) => {
    if (!ts) return "—";
    const date = new Date(ts);
    return date.toLocaleString("tr-TR", {
      day: "2-digit", month: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-end mb-2 shrink-0 px-2 mt-1">
        <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${connected ? "text-green-500" : "text-gray-400"}`}>
          <span className={`h-2 w-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)] ${connected ? "bg-green-400 shadow-green-400/50 animate-pulse" : "bg-red-400 shadow-red-400/50"}`} />
          {connected ? "LIVE" : "WAIT"}
        </span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-xs font-medium">Alarmlar yükleniyor...</span>
          </div>
        </div>
      ) : filteredAlarms.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
          <CheckCircle2 className="h-10 w-10 mb-2 text-green-400 opacity-60" />
          <span className="text-xs font-medium text-green-600">Aktif alarm bulunmuyor</span>
        </div>
      ) : (
        <div className="flex-1 overflow-auto min-h-0 rounded-lg border border-slate-200/60 bg-white/50 backdrop-blur-sm shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-md z-10">
              <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                <th className="py-3 px-3 font-bold">Cihaz</th>
                <th className="py-3 px-3 font-bold">Tip</th>
                <th className="py-3 px-3 font-bold">Önem</th>
                <th className="py-3 px-3 font-bold">Durum</th>
                <th className="py-3 px-3 font-bold text-right">Zaman</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAlarms.map((alarm, idx) => {
                const sev = SEVERITY_STYLES[alarm.severity] || SEVERITY_STYLES.WARNING;
                const stat = STATUS_STYLES[alarm.status] || STATUS_STYLES.ACTIVE;
                const dName = deviceNameMap[alarm.deviceId] || alarm.deviceId;

                return (
                  <tr key={alarm.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-700 text-xs">
                      {dName}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3 text-slate-400" />
                        {alarm.type || alarm.alarmType || "Alarm"}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${sev.bg} ${sev.text} border ${sev.border}`}>
                        {sev.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${stat.color} shadow-[0_0_6px] ${stat.shadow}`} />
                        <span className="text-[10px] font-semibold text-slate-500 uppercase">{stat.label}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-[10px] text-slate-400 font-mono">
                      {formatTime(alarm.timestamp || alarm.createdTime)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="shrink-0 mt-2 text-center text-[10px] text-slate-400 font-medium">
        {filteredAlarms.length} Alarm • {devices.length} Cihaz
      </div>
    </div>
  );
}
