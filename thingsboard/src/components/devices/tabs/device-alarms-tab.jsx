"use client";

/**
 * DeviceAlarmsTab — Cihaza özel alarm geçmişi sekmesi
 *
 * DeviceDetailSheet içinde gösterilir.
 * /api/alarm?deviceId={deviceId} üzerinden veri çeker.
 * SSE ile gerçek zamanlı güncellenir.
 */

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Bell,
  BellOff,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableContent, TableHeaderSheet } from "@/components/common/table/table-header";

const SEVERITY_CONFIG = {
  CRITICAL: {
    label: "Kritik",
    color: "bg-red-500/10 text-red-600 border-red-200",
    icon: ShieldAlert,
  },
  MAJOR: {
    label: "Yüksek",
    color: "bg-orange-500/10 text-orange-600 border-orange-200",
    icon: AlertTriangle,
  },
  MINOR: {
    label: "Düşük",
    color: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
    icon: Bell,
  },
};

const STATUS_CONFIG = {
  ACTIVE: { label: "Aktif", color: "bg-red-500/10 text-red-600", dot: "bg-red-500 animate-pulse" },
  ACKNOWLEDGED: { label: "Onaylandı", color: "bg-blue-500/10 text-blue-600", dot: "bg-blue-500" },
  CLEARED: { label: "Temizlendi", color: "bg-green-500/10 text-green-600", dot: "bg-green-500" },
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

export function DeviceAlarmsTab({ deviceId }) {
  const [alarms, setAlarms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  const fetchAlarms = useCallback(async () => {
    if (!deviceId) return;
    try {
      setLoading(true);
      const url = new URL("/api/alarm", window.location.origin);
      url.searchParams.set("deviceId", deviceId);
      url.searchParams.set("limit", itemsPerPage);
      url.searchParams.set("page", currentPage);
      if (searchQuery) url.searchParams.set("search", searchQuery);

      const res = await fetch(url);
      const data = await res.json();
      if (data.ok) {
        setAlarms(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch {
      console.error("Alarmlar çekilemedi");
    } finally {
      setLoading(false);
    }
  }, [deviceId, currentPage, searchQuery]);

  useEffect(() => {
    fetchAlarms();
  }, [fetchAlarms]);

  useEffect(() => {
    if (!deviceId) return;
    const es = new EventSource("/api/sse");
    es.addEventListener("alarm", (e) => {
      try {
        const alarm = JSON.parse(e.data);
        if (String(alarm.deviceId) === String(deviceId)) {
          setAlarms((prev) => {
            const idx = prev.findIndex((a) => a._id === alarm._id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = alarm;
              return updated;
            }
            if (currentPage === 1) {
              return [alarm, ...prev.slice(0, itemsPerPage - 1)];
            }
            return prev;
          });
        }
      } catch {}
    });
    return () => es.close();
  }, [deviceId]);

  const handleAction = async (alarmId, action) => {
    try {
      const res = await fetch("/api/alarm", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alarmId, action }),
      });
      const data = await res.json();
      if (data.ok) {
        setAlarms((prev) =>
          prev.map((a) => (a._id === alarmId ? data.data : a))
        );
        const toast = await import("react-hot-toast");
        toast.default.success(
          action === "acknowledge" ? "Alarm onaylandı" : "Alarm temizlendi"
        );
      }
    } catch {
      const toast = await import("react-hot-toast");
      toast.default.error("İşlem başarısız");
    }
  };

  const columns = [
    {
      id: "type",
      title: "Alarm Tipi",
      span: 3,
      cellRender: (row) => {
        const sev = SEVERITY_CONFIG[row.severity] || SEVERITY_CONFIG.MINOR;
        const SevIcon = sev.icon;
        return (
          <div className="flex items-center gap-2 min-w-0">
            <SevIcon className="h-4 w-4 shrink-0" style={{ color: row.severity === "CRITICAL" ? "#ef4444" : row.severity === "MAJOR" ? "#f97316" : "#eab308" }} />
            <span className="text-sm font-medium truncate text-text-main">{row.type}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${sev.color}`}>
              {sev.label}
            </span>
          </div>
        );
      }
    },
    {
      id: "details",
      title: "Detaylar",
      span: 3,
      cellRender: (row) => {
        if (!row.details) return <span className="text-muted-foreground text-xs">-</span>;
        return (
          <div className="text-[11px] text-muted-foreground flex flex-col">
            {row.details.key && (
              <span className="font-mono">{row.details.key} = {row.details.triggerValue}</span>
            )}
            {row.details.threshold && (
              <span className="opacity-70 truncate max-w-[150px]" title={row.details.threshold}>
                Koşul: <code className="bg-white/40 px-1 rounded text-[10px]">{row.details.threshold}</code>
              </span>
            )}
          </div>
        );
      }
    },
    {
      id: "status",
      title: "Durum",
      span: 2,
      cellRender: (row) => {
        const sts = STATUS_CONFIG[row.status] || STATUS_CONFIG.ACTIVE;
        return (
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${sts.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sts.dot}`} />
              {sts.label}
            </span>
            {row.status === "ACTIVE" && (
              <div className="flex gap-1 ml-2">
                <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-500 hover:text-blue-600 hover:bg-blue-50/50" onClick={(e) => { e.stopPropagation(); handleAction(row._id, "acknowledge"); }} title="Onayla">
                  <CheckCircle2 className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-green-500 hover:text-green-600 hover:bg-green-50/50" onClick={(e) => { e.stopPropagation(); handleAction(row._id, "clear"); }} title="Temizle">
                  <XCircle className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        );
      }
    },
    {
      id: "time",
      title: "Zaman",
      span: 2,
      cellRender: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-muted-foreground">{getRelativeTime(row.createdAt)}</span>
          {row.status === "CLEARED" && row.clearedAt && (
             <span className="text-[10px] text-muted-foreground/70">Temizlenme: {getRelativeTime(row.clearedAt)}</span>
          )}
        </div>
      )
    }
  ];

  const rowActions = [
    {
      label: "Kopyala",
      icon: <CheckCircle2 />, // You can use Copy icon here but since we only imported CheckCircle2 earlier we'll import it above...
      onClick: (row) => navigator.clipboard.writeText(JSON.stringify(row)),
    }
  ];

  const bulkActions = [
    {
      label: "Seçilenleri Onayla",
      icon: <CheckCircle2 className="h-4 w-4" />,
      onClick: async (selected) => {
        for (const id of selected) await handleAction(id, "acknowledge");
      }
    },
    {
      label: "Seçilenleri Temizle",
      icon: <XCircle className="h-4 w-4" />,
      onClick: async (selected) => {
        for (const id of selected) await handleAction(id, "clear");
      }
    }
  ];

  return (
    <div className="flex flex-col h-full">
      <TableHeaderSheet
        title="Alarmlar"
        actions={[
          {
            icon: <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />,
            onClick: fetchAlarms,
            tooltip: "Yenile",
          }
        ]}
        onSearch={(val) => { setSearchQuery(val || ""); setCurrentPage(1); }}
      />
      <TableContent
        data={alarms}
        columns={columns}
        title={`${alarms.length} alarm kaydı`}
        rowActions={rowActions}
        bulkActions={bulkActions}
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
            : "Bu cihaz için alarm kaydı bulunmuyor."
        }
        getRowId={(row) => row._id}
        rowClassName={(row) => row.status === "ACTIVE" ? (row.severity === "CRITICAL" ? "bg-red-50/10" : row.severity === "MAJOR" ? "bg-orange-50/10" : "bg-yellow-50/10") : ""}
      />
    </div>
  );
}
