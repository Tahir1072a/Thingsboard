"use client";

/**
 * DeviceAuditLogTab — Cihaza özel denetim günlükleri sekmesi
 *
 * DeviceDetailSheet içinde gösterilir.
 * /api/audit-log?entityId={deviceId}&entityType=DEVICE üzerinden veri çeker.
 */

import { useState, useEffect, useCallback } from "react";
import { useAuditLogSSE } from "@/lib/sse-pool";
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

import { TableContent, TableHeaderSheet } from "@/components/common/table/table-header";

const ACTION_LABELS = {
  DEVICE_CREATE: "Oluşturuldu",
  DEVICE_UPDATE: "Güncellendi",
  DEVICE_DELETE: "Silindi",
  INACTIVE_DEVICE_REJECTED: "Erişim Reddedildi",
  SECURITY_ALERT: "Güvenlik Alarmı",
  AUTH_FAILED: "Kimlik Doğrulama Başarısız",
  ALARM_ACKNOWLEDGE: "Alarm Onaylandı",
  ALARM_CLEAR: "Alarm Temizlendi",
  TRANSPORT_MISMATCH: "Protokol Uyumsuzluğu",
};

const ACTION_COLORS = {
  DEVICE_CREATE: "bg-green-500/10 text-green-600",
  DEVICE_UPDATE: "bg-blue-500/10 text-blue-600",
  DEVICE_DELETE: "bg-red-500/10 text-red-600",
  INACTIVE_DEVICE_REJECTED: "bg-orange-500/10 text-orange-600",
  SECURITY_ALERT: "bg-red-500/10 text-red-600 animate-pulse",
  AUTH_FAILED: "bg-orange-500/10 text-orange-600",
  ALARM_ACKNOWLEDGE: "bg-blue-500/10 text-blue-600",
  ALARM_CLEAR: "bg-green-500/10 text-green-600",
  TRANSPORT_MISMATCH: "bg-amber-500/10 text-amber-600",
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
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  const fetchLogs = useCallback(async () => {
    if (!deviceId) return;
    try {
      setLoading(true);
      const url = new URL("/api/audit-log", window.location.origin);
      url.searchParams.set("entityId", deviceId);
      url.searchParams.set("entityType", "DEVICE");
      url.searchParams.set("limit", itemsPerPage);
      url.searchParams.set("page", currentPage);
      if (searchQuery) url.searchParams.set("search", searchQuery);

      const res = await fetch(url);
      const data = await res.json();
      if (data.ok) {
        setLogs(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch {
      console.error("Audit log çekilemedi");
    } finally {
      setLoading(false);
    }
  }, [deviceId, currentPage, searchQuery]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSSEAuditLog = useCallback((log) => {
    if (log.entityId === deviceId && log.entityType === "DEVICE") {
      if (currentPage === 1) {
        setLogs((prev) => [log, ...prev.slice(0, itemsPerPage - 1)]);
      }
    }
  }, [deviceId, currentPage, itemsPerPage]);

  useAuditLogSSE(deviceId ? handleSSEAuditLog : null);

  const columns = [
    {
      id: "action",
      title: "İşlem",
      span: 3,
      cellRender: (row) => (
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${ACTION_COLORS[row.action] || "bg-gray-100 text-gray-600"
              }`}
          >
            {ACTION_LABELS[row.action] || row.action}
          </span>
          {row.status === "SUCCESS" ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
          )}
        </div>
      )
    },
    {
      id: "details",
      title: "Detaylar",
      span: 5,
      cellRender: (row) => {
        const { details } = row;
        if (!details || (!details.reason && !details.ip && !details.changes && !details.attemptCount)) {
           return <span className="text-muted-foreground text-xs">-</span>;
        }
        return (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            {details.reason && <span>{details.reason}</span>}
            {details.ip && <span className="font-mono">IP: {details.ip}</span>}
            {details.protocol && <span className="uppercase">{details.protocol}</span>}
            {details.attemptCount && (
              <span className="text-orange-600 font-medium">
                {details.attemptCount}× deneme
              </span>
            )}
            {details.changes && typeof details.changes === "object" && (
              <span>
                Değişen: {Object.keys(details.changes).join(", ")}
              </span>
            )}
          </div>
        );
      }
    },
    {
      id: "timestamp",
      title: "Zaman",
      span: 2,
      cellRender: (row) => (
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
          {getRelativeTime(row.timestamp)}
        </span>
      )
    }
  ];

  const rowActions = [
    {
      label: "Kopyala",
      icon: <CheckCircle2 />, // Using CheckCircle2 as a placeholder for Copy
      onClick: (row) => navigator.clipboard.writeText(JSON.stringify(row)),
    }
  ];

  return (
    <div className="flex flex-col h-full">
      <TableHeaderSheet
        title="Denetim Günlükleri"
        actions={[
          {
            icon: <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />,
            onClick: fetchLogs,
            tooltip: "Yenile",
          }
        ]}
        onSearch={(val) => { setSearchQuery(val || ""); setCurrentPage(1); }}
      />
      <TableContent
        data={logs}
        columns={columns}
        title={`${logs.length} işlem kaydı`}
        rowActions={rowActions}
        gridClassName="grid-cols-12"
        pagination={{
          currentPage,
          totalPages,
          itemsPerPage,
          onPageChange: setCurrentPage,
        }}
        emptyState={
          searchQuery
            ? `"${searchQuery}" için sonuç bulunamadı`
            : "Bu cihaz için denetim kaydı bulunmuyor."
        }
        getRowId={(row) => row._id || row.id || Math.random().toString()}
        rowClassName={(row) => row.action === "SECURITY_ALERT" ? "bg-red-50/10" : row.status === "FAILURE" ? "bg-orange-50/10" : ""}
      />
    </div>
  );
}
