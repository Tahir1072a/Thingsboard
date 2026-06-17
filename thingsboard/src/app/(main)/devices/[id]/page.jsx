"use client";

/**
 * /devices/[id] — Cihaz Detay Sayfası
 * Canlı grafik, geçmiş veri, cihaz bilgileri.
 */

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Activity, Key, Calendar, Tag, Radio,
  CheckCircle2, XCircle, RefreshCw, ScrollText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LiveChart from "@/components/dashboard/LiveChart";
import HistoricalChart from "@/components/dashboard/HistoricalChart";
import toast from "react-hot-toast";

export default function DeviceDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentTelemetry, setRecentTelemetry] = useState([]);
  const [telLoading, setTelLoading] = useState(false);
  const [telemetryKeys, setTelemetryKeys] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const fetchDevice = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/device/${id}`);
      const data = await res.json();
      if (data.ok) {
        setDevice(data.data);
      } else {
        toast.error("Cihaz bulunamadı.");
        router.push("/devices");
      }
    } catch {
      toast.error("Sunucu hatası.");
      router.push("/devices");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const fetchTelemetry = useCallback(async () => {
    try {
      setTelLoading(true);
      const to = new Date();
      const from = new Date(to - 15 * 60 * 1000); // son 15 dk

      const res = await fetch(
        `/api/telemetry?deviceId=${id}&from=${from.toISOString()}&to=${to.toISOString()}&limit=50`
      );
      const data = await res.json();
      if (data.ok) {
        setRecentTelemetry(data.data || []);
      }
    } catch {
      console.error("Telemetri çekilemedi");
    } finally {
      setTelLoading(false);
    }
  }, [id]);

  // Cihaza ait benzersiz telemetri key'lerini çek
  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch(`/api/telemetry/keys?deviceId=${id}`);
      const data = await res.json();
      if (data.ok && data.keys.length > 0) {
        setTelemetryKeys(data.keys);
      }
    } catch {
      console.error("Telemetri key'leri çekilemedi");
    }
  }, [id]);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setAuditLoading(true);
      const res = await fetch(`/api/audit-log?entityId=${id}&entityType=DEVICE&limit=10`);
      const data = await res.json();
      if (data.ok) {
        setAuditLogs(data.data || []);
      }
    } catch {
      console.error("Audit log çekilemedi");
    } finally {
      setAuditLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDevice();
    fetchTelemetry();
    fetchKeys();
    fetchAuditLogs();
  }, [fetchDevice, fetchTelemetry, fetchKeys, fetchAuditLogs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-halo-600" />
      </div>
    );
  }

  if (!device) return null;

  const infoItems = [
    { label: "Cihaz Adı", value: device.name, icon: Activity },
    { label: "Profil", value: device.profile?.name || "Belirtilmemiş", icon: Radio },
    { label: "Etiket", value: device.tag || "-", icon: Tag },
    { label: "Durum", value: device.status === "active" ? "Aktif" : "Pasif", icon: device.status === "active" ? CheckCircle2 : XCircle },
    { label: "Access Token", value: device.accessToken, icon: Key, mono: true },
    { label: "Oluşturulma", value: new Date(device.createdAt).toLocaleDateString("tr-TR"), icon: Calendar },
  ];

  return (
    <div className="space-y-6 p-1">
      {/* Üst Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/devices")}
            className="h-9 w-9 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-halo-400 to-halo-600 flex items-center justify-center shadow-md">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-main">{device.name}</h1>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-xs ${
                  device.status === "active"
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-gray-50 text-gray-600 border-gray-200"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                    device.status === "active" ? "bg-green-500" : "bg-gray-400"
                  }`} />
                  {device.status === "active" ? "Aktif" : "Pasif"}
                </Badge>
                <span className="text-xs text-text-muted font-mono">{device._id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cihaz Bilgileri */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {infoItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="glass rounded-xl p-4 flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-halo-50 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-halo-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-text-muted uppercase tracking-wider">{item.label}</p>
                <p className={`text-sm font-semibold text-text-main truncate ${item.mono ? "font-mono text-xs" : ""}`}>
                  {item.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Canlı Grafik */}
      {telemetryKeys.length > 0 ? (
        <>
          <LiveChart
            key={`device-live-${device._id}-${telemetryKeys.join(",")}`}
            deviceId={device._id}
            keys={telemetryKeys}
            title="Canlı Telemetri"
            maxPoints={60}
          />

          {/* Geçmiş Grafik */}
          <HistoricalChart
            key={`device-hist-${device._id}-${telemetryKeys.join(",")}`}
            deviceId={device._id}
            keys={telemetryKeys}
            title="Geçmiş Veri"
          />
        </>
      ) : (
        <div className="glass rounded-xl p-8 text-center text-text-muted text-sm">
          Henüz telemetri verisi yok. Cihaz veri göndermeye başladığında grafikler otomatik görünecek.
        </div>
      )}

      {/* Son Telemetri Tablosu */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-main">Son Telemetri Verileri</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTelemetry}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${telLoading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
        </div>

        <div className="overflow-auto max-h-[300px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white/90 backdrop-blur-sm">
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-semibold text-text-muted text-xs">Zaman</th>
                <th className="text-left py-2 px-3 font-semibold text-text-muted text-xs">Metrik</th>
                <th className="text-right py-2 px-3 font-semibold text-text-muted text-xs">Değer</th>
                <th className="text-center py-2 px-3 font-semibold text-text-muted text-xs">Protokol</th>
              </tr>
            </thead>
            <tbody>
              {recentTelemetry.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-text-muted">
                    {telLoading ? "Yükleniyor..." : "Bu aralıkta veri yok."}
                  </td>
                </tr>
              ) : (
                recentTelemetry.map((t, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-1.5 px-3 font-mono text-xs text-text-muted">
                      {new Date(t.timestamp).toLocaleTimeString("tr-TR")}
                    </td>
                    <td className="py-1.5 px-3 capitalize text-text-main font-medium">{t.key}</td>
                    <td className="py-1.5 px-3 text-right font-bold tabular-nums text-halo-700">
                      {typeof t.value === "number" ? t.value.toFixed(2) : t.value}
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {t.protocol || "—"}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Denetim Günlükleri */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-halo-600" />
            <h3 className="text-sm font-semibold text-text-main">Denetim Günlükleri</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAuditLogs}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${auditLoading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
        </div>

        <div className="overflow-auto max-h-[300px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white/90 backdrop-blur-sm">
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-semibold text-text-muted text-xs">Zaman</th>
                <th className="text-left py-2 px-3 font-semibold text-text-muted text-xs">Aksiyon</th>
                <th className="text-left py-2 px-3 font-semibold text-text-muted text-xs">Sonuç</th>
                <th className="text-left py-2 px-3 font-semibold text-text-muted text-xs">Detay</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-text-muted">
                    {auditLoading ? "Yükleniyor..." : "Bu cihaz için denetim kaydı yok."}
                  </td>
                </tr>
              ) : (
                auditLogs.map((log, i) => {
                  const actionLabels = {
                    DEVICE_CREATE: "Oluşturuldu",
                    DEVICE_UPDATE: "Güncellendi",
                    DEVICE_DELETE: "Silindi",
                    INACTIVE_DEVICE_REJECTED: "Erişim Reddedildi",
                    SECURITY_ALERT: "Güvenlik Alarmı",
                  };
                  const actionColors = {
                    DEVICE_CREATE: "bg-green-500/10 text-green-600",
                    DEVICE_UPDATE: "bg-blue-500/10 text-blue-600",
                    DEVICE_DELETE: "bg-red-500/10 text-red-600",
                    INACTIVE_DEVICE_REJECTED: "bg-orange-500/10 text-orange-600",
                    SECURITY_ALERT: "bg-red-500/10 text-red-600 animate-pulse",
                  };
                  return (
                    <tr key={log._id || i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-1.5 px-3 font-mono text-xs text-text-muted whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString("tr-TR", {
                          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="py-1.5 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${actionColors[log.action] || "bg-gray-100 text-gray-600"}`}>
                          {actionLabels[log.action] || log.action}
                        </span>
                      </td>
                      <td className="py-1.5 px-3">
                        {log.status === "SUCCESS" ? (
                          <span className="flex items-center gap-1 text-green-600 text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Başarılı
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-500 text-xs">
                            <XCircle className="h-3.5 w-3.5" /> Başarısız
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-3 text-xs text-text-muted max-w-[200px] truncate">
                        {log.details?.reason || log.details?.ip || (log.details?.changes ? "Alanlar güncellendi" : "—")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
