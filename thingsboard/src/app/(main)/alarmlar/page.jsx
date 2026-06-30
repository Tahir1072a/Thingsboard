"use client";

/**
 * /alarmlar — Alarm Listesi
 */

import { useState, useEffect, useCallback } from "react";
import { useAlarmSSE } from "@/lib/sse-pool";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle, XCircle, AlertTriangle,
  AlertOctagon, Info, Trash2, ShieldAlert
} from "lucide-react";
import toast from "react-hot-toast";
import {
  TableContent,
  TableHeader,
} from "@/components/common/table/table-header";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/common/confirm-modal";

const SEVERITY_CONFIG = {
  CRITICAL: { color: "bg-red-100 text-red-700 border-red-200", icon: AlertOctagon, label: "Kritik" },
  MAJOR: { color: "bg-orange-100 text-orange-700 border-orange-200", icon: AlertTriangle, label: "Önemli" },
  MINOR: { color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Info, label: "Düşük" },
};

const STATUS_CONFIG = {
  ACTIVE: { color: "bg-red-50 border-red-200 text-red-700", label: "Aktif", dot: "bg-red-500" },
  ACKNOWLEDGED: { color: "bg-blue-50 border-blue-200 text-blue-700", label: "Onaylandı", dot: "bg-blue-500" },
  CLEARED: { color: "bg-green-50 border-green-200 text-green-700", label: "Temizlendi", dot: "bg-green-500" },
};

export default function AlarmlarPage() {
  const [alarms, setAlarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCount, setActiveCount] = useState(0);

  const [pageParams, setPageParams] = useState({ page: 1, limit: 20 });
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ search: "", status: "all", severity: "all" });
  const { confirm, ConfirmDialog } = useConfirm();

  const fetchAlarms = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", pageParams.page);
      params.append("limit", pageParams.limit);
      if (filters.search) params.append("search", filters.search);
      if (filters.status && filters.status !== "all") params.append("status", filters.status);
      if (filters.severity && filters.severity !== "all") params.append("severity", filters.severity);

      const res = await fetch(`/api/alarm?${params.toString()}`);
      const data = await res.json();
      if (data.ok) {
        setAlarms(data.data);
        setActiveCount(data.activeCount);
        if (data.pagination) {
          setMeta({
            total: data.pagination.total,
            totalPages: data.pagination.totalPages,
          });
        }
      }
    } catch (err) {
      toast.error("Alarmlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [pageParams.page, pageParams.limit, filters]);

  useEffect(() => {
    fetchAlarms();
  }, [fetchAlarms]);

  // Yeni alarm geldiğinde veya durumu değiştiğinde listeyi güncelle
  useAlarmSSE(fetchAlarms);

  const handleAction = async (alarmId, action) => {
    try {
      setLoading(true);
      const res = await fetch("/api/alarm", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alarmId, action }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(data.message);
        await fetchAlarms();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (alarm) => {
    const confirmed = await confirm({
      title: "Alarmı Sil",
      message: "Bu alarmı silmek istediğinizden emin misiniz?",
      danger: true,
    });
    if (!confirmed) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/alarm`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alarmId: alarm._id }),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        toast.success("Alarm silindi.");
        await fetchAlarms();
      } else {
        toast.error(data.message || "Silme işlemi başarısız.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async (selectedIds) => {
    const count = selectedIds.length;
    if (!(await confirm({ title: "Toplu Silme", message: `${count} alarmı silmek istediğinizden emin misiniz?`, danger: true }))) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/alarm`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alarmIds: selectedIds }),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        toast.success(`${count} alarm silindi.`);
        await fetchAlarms();
      } else {
        toast.error(data.message || "Toplu silme işlemi başarısız.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // Toplu onayla
  const handleBulkAcknowledge = async (selectedIds) => {
    try {
      setLoading(true);
      const results = await Promise.all(
        selectedIds.map(id =>
          fetch("/api/alarm", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ alarmId: id, action: "acknowledge" }),
          }).then(r => r.json()).catch(() => ({ ok: false }))
        )
      );
      const success = results.filter(r => r.ok).length;
      if (success > 0) toast.success(`${success} alarm onaylandı.`);
      await fetchAlarms();
    } catch {
      toast.error("Toplu onaylama başarısız.");
    } finally {
      setLoading(false);
    }
  };

  // Toplu temizle
  const handleBulkClear = async (selectedIds) => {
    try {
      setLoading(true);
      const results = await Promise.all(
        selectedIds.map(id =>
          fetch("/api/alarm", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ alarmId: id, action: "clear" }),
          }).then(r => r.json()).catch(() => ({ ok: false }))
        )
      );
      const success = results.filter(r => r.ok).length;
      if (success > 0) toast.success(`${success} alarm temizlendi.`);
      await fetchAlarms();
    } catch {
      toast.error("Toplu temizleme başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const filterConfig = [
    {
      key: "status",
      placeholder: "Durum",
      options: [
        { label: "Aktif", value: "ACTIVE" },
        { label: "Onaylanmış", value: "ACKNOWLEDGED" },
        { label: "Temizlenmiş", value: "CLEARED" },
      ],
    },
    {
      key: "severity",
      placeholder: "Önem",
      options: [
        { label: "Kritik", value: "CRITICAL" },
        { label: "Önemli", value: "MAJOR" },
        { label: "Düşük", value: "MINOR" },
      ],
    },
  ];

  const columns = [
    {
      id: "alarm",
      title: "Alarm",
      span: 3,
      cellRender: (alarm) => {
        const sev = SEVERITY_CONFIG[alarm.severity] || SEVERITY_CONFIG.MINOR;
        const SevIcon = sev.icon;
        return (
          <div className="flex items-center gap-3">
            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm transition-transform", sev.color)}>
              <SevIcon className="h-4 w-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-text-main truncate">
                {alarm.type}
              </p>
              <p className="text-xs text-text-muted truncate">
                📱 {alarm.deviceName || "Bilinmeyen"}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: "details",
      title: "Detaylar",
      span: 3,
      cellRender: (alarm) => (
        <div className="overflow-hidden">
          <p className="text-sm text-text-main truncate">
            Anahtar: {alarm.details?.key || "—"}
          </p>
          <p className="text-xs text-text-muted truncate">
            Değer: {alarm.details?.triggerValue?.toFixed(1) || "—"} {alarm.details?.threshold ? `(Eşik: ${alarm.details.threshold})` : ""}
          </p>
        </div>
      ),
    },
    {
      id: "severity",
      title: "Önem",
      span: 1,
      align: "center",
      cellRender: (alarm) => {
        const sev = SEVERITY_CONFIG[alarm.severity] || SEVERITY_CONFIG.MINOR;
        return (
          <Badge variant="outline" className={cn("border-transparent font-medium", sev.color)}>
            {sev.label}
          </Badge>
        );
      },
    },
    {
      id: "status",
      title: "Durum",
      span: 1,
      align: "center",
      cellRender: (alarm) => {
        const stat = STATUS_CONFIG[alarm.status] || STATUS_CONFIG.ACTIVE;
        return (
          <Badge variant="outline" className={cn("border-transparent font-medium", stat.color)}>
            <span className={`h-1.5 w-1.5 rounded-full ${stat.dot} mr-1.5`} />
            {stat.label}
          </Badge>
        );
      },
    },
    {
      id: "createdAt",
      title: "Zaman",
      span: 2,
      cellRender: (alarm) => (
        <span className="text-sm text-text-muted truncate">
          {new Date(alarm.createdAt).toLocaleString("tr-TR")}
        </span>
      ),
    },
  ];

  const rowActions = [
    {
      label: "Onayla",
      onClick: (alarm) => handleAction(alarm._id, "acknowledge"),
      icon: <CheckCircle className="h-4 w-4" />,
      show: (alarm) => alarm.status === "ACTIVE",
    },
    {
      label: "Temizle",
      onClick: (alarm) => handleAction(alarm._id, "clear"),
      icon: <XCircle className="h-4 w-4" />,
      show: (alarm) => alarm.status === "ACTIVE" || alarm.status === "ACKNOWLEDGED",
    },
    {
      label: "Sil",
      onClick: (alarm) => handleDelete(alarm),
      icon: <Trash2 className="h-4 w-4" />,
      className: "text-red-600",
    },
  ];

  const bulkActions = (selectedItems) => {
    const actions = [];
    const hasActive = selectedItems.some(a => a.status === "ACTIVE");
    const hasUncleared = selectedItems.some(a => a.status === "ACTIVE" || a.status === "ACKNOWLEDGED");
    
    if (hasActive) {
      actions.push({
        label: "Seçilenleri Onayla",
        onClick: (ids) => handleBulkAcknowledge(ids),
        icon: <CheckCircle className="h-4 w-4" />,
      });
    }
    if (hasUncleared) {
      actions.push({
        label: "Seçilenleri Temizle",
        onClick: (ids) => handleBulkClear(ids),
        icon: <XCircle className="h-4 w-4" />,
      });
    }
    actions.push({
      label: "Seçilenleri Sil",
      onClick: (ids) => handleBulkDelete(ids),
      icon: <Trash2 className="h-4 w-4" />,
      danger: true,
    });
    return actions;
  };

  const handlePageChange = (newPage) => {
    setPageParams((prev) => ({ ...prev, page: newPage }));
  };

  return (
    <>
      <TableHeader
        title="Alarmlar"
        advert={`Cihaz profillerindeki kurallar ihlal edildiğinde oluşan alarmlar${activeCount > 0 ? ` — ${activeCount} Aktif Alarm` : ""}`}
        onRefresh={fetchAlarms}
        filterConfig={filterConfig}
        onFilterChange={setFilters}
      />

      <TableContent
        data={alarms}
        loading={loading}
        columns={columns}
        gridClassName="grid-cols-12"
        title="Alarm Listesi"
        rowActions={rowActions}
        bulkActions={bulkActions}
        getRowId={(alarm) => alarm._id}
        rowClassName={(alarm) => {
          if (alarm.status === "ACTIVE") return "bg-red-50/50 hover:bg-red-50 border-l-2 border-l-red-500 transition-all duration-300";
          if (alarm.status === "ACKNOWLEDGED") return "bg-blue-50/50 hover:bg-blue-50 transition-all duration-300";
          return "transition-all duration-300";
        }}
        emptyState={
          <div className="text-center py-12">
            <ShieldAlert className="h-16 w-16 mx-auto text-green-400 mb-4" />
            <h3 className="text-lg font-semibold text-text-main">Alarm bulunmuyor</h3>
            <p className="text-sm text-text-muted mt-2">
              {filters.search || filters.status !== "all" || filters.severity !== "all" 
                ? "Filtrelerinize uygun alarm bulunamadı" 
                : "Tüm sistemler normal çalışıyor"}
            </p>
          </div>
        }
        pagination={{
          currentPage: pageParams.page,
          totalPages: meta.totalPages,
          itemsPerPage: pageParams.limit,
          onPageChange: handlePageChange,
        }}
      />

      <ConfirmDialog />
    </>
  );
}
