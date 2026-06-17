"use client";

/**
 * DeviceAuditLogTab — Cihaza özel denetim günlükleri sekmesi
 *
 * DeviceDetailSheet içinde gösterilir.
 * /api/audit-log?entityId={deviceId}&entityType=DEVICE üzerinden veri çeker.
 */

import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const ACTION_LABELS = {
  DEVICE_CREATE: "Oluşturuldu",
  DEVICE_UPDATE: "Güncellendi",
  DEVICE_DELETE: "Silindi",
  INACTIVE_DEVICE_REJECTED: "Erişim Reddedildi",
  SECURITY_ALERT: "Güvenlik Alarmı",
  AUTH_FAILED: "Kimlik Doğrulama Başarısız",
};

const ACTION_COLORS = {
  DEVICE_CREATE: "bg-green-500/10 text-green-600",
  DEVICE_UPDATE: "bg-blue-500/10 text-blue-600",
  DEVICE_DELETE: "bg-red-500/10 text-red-600",
  INACTIVE_DEVICE_REJECTED: "bg-orange-500/10 text-orange-600",
  SECURITY_ALERT: "bg-red-500/10 text-red-600 animate-pulse",
  AUTH_FAILED: "bg-orange-500/10 text-orange-600",
};

function getRelativeTime(dateStr) {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec} sn önce`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} dk önce`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} saat önce`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days} gün önce`;
  return new Date(dateStr).toLocaleDateString("tr-TR");
}

export function DeviceAuditLogTab({ deviceId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!deviceId) return;
    try {
      setLoading(true);
      const res = await fetch(
        `/api/audit-log?entityId=${deviceId}&entityType=DEVICE&limit=20`
      );
      const data = await res.json();
      if (data.ok) {
        setLogs(data.data || []);
      }
    } catch {
      console.error("Audit log çekilemedi");
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // SSE ile gerçek zamanlı güncelleme
  useEffect(() => {
    if (!deviceId) return;
    const es = new EventSource("/api/sse");
    es.addEventListener("audit-log", (e) => {
      try {
        const log = JSON.parse(e.data);
        if (log.entityId === deviceId && log.entityType === "DEVICE") {
          setLogs((prev) => [log, ...prev.slice(0, 19)]);
        }
      } catch {}
    });
    return () => es.close();
  }, [deviceId]);

  return (
    <div className="space-y-3">
      {/* Başlık + Yenile */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Bu cihaza ait son işlem kayıtları
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchLogs}
          className="gap-1.5 h-7 text-xs"
        >
          <RefreshCw
            className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
          />
          Yenile
        </Button>
      </div>

      {/* Loglar */}
      {loading && logs.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          Yükleniyor...
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Bu cihaz için denetim kaydı bulunmuyor.
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log, i) => (
            <div
              key={log._id || i}
              className={`rounded-lg border p-3 transition-colors hover:bg-muted/30 ${
                log.action === "SECURITY_ALERT"
                  ? "border-red-200 bg-red-50/30"
                  : log.status === "FAILURE"
                  ? "border-orange-200 bg-orange-50/20"
                  : "border-border"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                {/* Sol: Aksiyon badge */}
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${
                      ACTION_COLORS[log.action] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {ACTION_LABELS[log.action] || log.action}
                  </span>

                  {/* Sonuç ikonu */}
                  {log.status === "SUCCESS" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  )}
                </div>

                {/* Sağ: Zaman */}
                <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                  {getRelativeTime(log.timestamp)}
                </span>
              </div>

              {/* Detay satırı */}
              {(log.details?.reason ||
                log.details?.ip ||
                log.details?.changes ||
                log.details?.attemptCount) && (
                <div className="mt-1.5 text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                  {log.details.reason && (
                    <span>{log.details.reason}</span>
                  )}
                  {log.details.ip && (
                    <span className="font-mono">IP: {log.details.ip}</span>
                  )}
                  {log.details.protocol && (
                    <span className="uppercase">
                      {log.details.protocol}
                    </span>
                  )}
                  {log.details.attemptCount && (
                    <span className="text-orange-600 font-medium">
                      {log.details.attemptCount}× deneme
                    </span>
                  )}
                  {log.details.changes &&
                    typeof log.details.changes === "object" && (
                      <span>
                        Değişen:{" "}
                        {Object.keys(log.details.changes).join(", ")}
                      </span>
                    )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
