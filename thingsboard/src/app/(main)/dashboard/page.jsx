"use client";

/**
 * Dashboard Ana Sayfası
 * Gerçek cihazları API'den çeker, MongoDB _id ile SSE'ye bağlanır.
 */

import { useState, useEffect, useCallback } from "react";
import { Activity, Radio, Wifi, Globe, AlertTriangle, Router, BarChart3 } from "lucide-react";
import LiveChart from "@/components/dashboard/LiveChart";
import HistoricalChart from "@/components/dashboard/HistoricalChart";
import { Badge } from "@/components/ui/badge";

const PROTOCOL_ICONS = {
  http: <Globe className="h-3 w-3" />,
  mqtt: <Radio className="h-3 w-3" />,
  websocket: <Wifi className="h-3 w-3" />,
};

const PROTOCOL_COLORS = {
  http: "bg-blue-100 text-blue-700",
  mqtt: "bg-purple-100 text-purple-700",
  websocket: "bg-green-100 text-green-700",
};

const DEFAULT_KEYS = ["temperature", "humidity"];
const OVERVIEW_KEYS = ["temperature"];

export default function DashboardPage() {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [mode, setMode] = useState("live");
  const [activeAlarms, setActiveAlarms] = useState(0);
  const [loading, setLoading] = useState(true);
  const [telemetryKeys, setTelemetryKeys] = useState([]);

  // Cihazları API'den çek
  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch("/api/device?limit=50");
      const data = await res.json();
      if (data.ok && data.data.length > 0) {
        setDevices(data.data);
        if (!selectedDevice) setSelectedDevice(data.data[0]);
      }
    } catch (err) {
      console.error("Cihaz listesi çekilemedi:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Aktif alarm sayısını çek
  const fetchAlarms = useCallback(async () => {
    try {
      const res = await fetch("/api/alarm?status=ACTIVE&limit=1");
      const data = await res.json();
      if (data.ok) setActiveAlarms(data.activeCount || 0);
    } catch {}
  }, []);

  // Seçilen cihaza ait telemetri key'lerini çek
  const fetchKeys = useCallback(async (deviceId) => {
    try {
      const res = await fetch(`/api/telemetry/keys?deviceId=${deviceId}`);
      const data = await res.json();
      if (data.ok && data.keys.length > 0) {
        setTelemetryKeys(data.keys);
      } else {
        setTelemetryKeys(DEFAULT_KEYS);
      }
    } catch {
      setTelemetryKeys(DEFAULT_KEYS);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
    fetchAlarms();
    const interval = setInterval(fetchAlarms, 30000);
    return () => clearInterval(interval);
  }, [fetchDevices, fetchAlarms]);

  // Cihaz seçildiğinde key'leri güncelle
  useEffect(() => {
    if (selectedDevice?._id) {
      fetchKeys(selectedDevice._id);
    }
  }, [selectedDevice, fetchKeys]);

  // Seçili cihaz için telemetri key'lerini tahmin et (simülatör temperature + humidity gönderir)
  // const defaultKeys = ["temperature", "humidity"];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-halo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      {/* ── Özet Kartlar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg">
            <Router className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-text-main">{devices.length}</p>
            <p className="text-xs text-text-muted">Kayıtlı Cihaz</p>
          </div>
        </div>

        <div className="glass rounded-xl p-4 flex items-center gap-4">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-lg ${
            activeAlarms > 0
              ? "bg-gradient-to-br from-red-400 to-red-600"
              : "bg-gradient-to-br from-green-400 to-green-600"
          }`}>
            <AlertTriangle className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-text-main">{activeAlarms}</p>
            <p className="text-xs text-text-muted">Aktif Alarm</p>
          </div>
        </div>

        <div className="glass rounded-xl p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-text-main">
              {devices.filter((d) => d.status === "active").length}
            </p>
            <p className="text-xs text-text-muted">Aktif Cihaz</p>
          </div>
        </div>
      </div>

      {/* ── Cihaz Seçici ── */}
      <div>
        <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
          Cihaz Seç
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {devices.map((device) => {
            const tag = device.tag || "";
            const protocol = tag.includes("http") ? "http"
              : tag.includes("mqtt") ? "mqtt"
              : tag.includes("ws") ? "websocket" : "http";

            return (
              <button
                key={device._id}
                onClick={() => setSelectedDevice(device)}
                className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                  selectedDevice?._id === device._id
                    ? "border-halo-500 bg-halo-50/50 shadow-md ring-1 ring-halo-500/30"
                    : "glass hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Activity className={`h-4 w-4 ${
                    selectedDevice?._id === device._id ? "text-halo-600" : "text-text-muted"
                  }`} />
                  <span className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    PROTOCOL_COLORS[protocol] || "bg-gray-100 text-gray-600"
                  }`}>
                    {PROTOCOL_ICONS[protocol]}
                    {protocol.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs font-semibold text-text-main line-clamp-1">
                  {device.name}
                </p>
                <div className="flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    device.status === "active" ? "bg-green-500" : "bg-gray-400"
                  }`} />
                  <p className="text-[10px] text-text-muted">
                    {device.status === "active" ? "Aktif" : "Pasif"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Mod Seçim Sekmeleri ── */}
      <div className="flex gap-1 rounded-xl glass p-1 w-fit">
        {[
          { key: "live", label: "🔴 Canlı" },
          { key: "history", label: "📊 Geçmiş" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMode(tab.key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              mode === tab.key
                ? "bg-halo-600 text-white shadow-md"
                : "text-text-muted hover:text-text-main hover:bg-white/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Grafik Paneli ── */}
      {selectedDevice && (
        <>
          {mode === "live" ? (
            <div className="space-y-4">
              <LiveChart
                key={`live-${selectedDevice._id}-${telemetryKeys.join(",")}`}
                deviceId={selectedDevice._id}
                keys={telemetryKeys}
                title={`${selectedDevice.name} — Canlı Telemetri`}
                maxPoints={60}
              />

              {/* Tüm cihazların sıcaklık karşılaştırması */}
              {/* Cihazın biri bağlantı sorunları yaşıyor. */}
              {/* <div>
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                  Tüm Cihazlar — Sıcaklık Karşılaştırması
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {devices.slice(0, 6).map((device) => (
                    <LiveChart
                      key={`overview-${device._id}`}
                      deviceId={device._id}
                      keys={OVERVIEW_KEYS}
                      title={device.name}
                      maxPoints={30}
                    />
                  ))}
                </div>
              </div> */}
            </div>
          ) : (
            <HistoricalChart
              key={`hist-${selectedDevice._id}-${telemetryKeys.join(",")}`}
              deviceId={selectedDevice._id}
              keys={telemetryKeys}
              title={`${selectedDevice.name} — Geçmiş Veri`}
            />
          )}
        </>
      )}

      {devices.length === 0 && (
        <div className="glass rounded-xl text-center py-16">
          <Router className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold">Cihaz Bulunamadı</h3>
          <p className="text-sm text-text-muted mt-2">
            Simülatörü başlat: <code className="bg-black/80 text-green-400 rounded px-2 py-0.5 text-xs">npm run simulate</code>
          </p>
        </div>
      )}
    </div>
  );
}
