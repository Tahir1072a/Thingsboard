"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Router,
  UserCheck,
  LayoutDashboard,
  Bell,
  User,
  ScrollText,
  AlertTriangle,
} from "lucide-react";
import {
  TableContent,
  TableHeader,
} from "@/components/common/table/table-header";
import toast from "react-hot-toast";

// --- Yardımcı: Göreceli zaman hesaplama ---
function getRelativeTime(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "az önce";
  if (diffMin < 60) return `${diffMin} dk önce`;
  if (diffHour < 24) return `${diffHour} saat önce`;
  if (diffDay === 1) return "dün";
  if (diffDay < 7) return `${diffDay} gün önce`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} hafta önce`;
  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// --- Yardımcı: Aksiyon adını Türkçeye çevir ---
const actionLabels = {
  DEVICE_CREATE: "Cihaz Oluşturuldu",
  DEVICE_UPDATE: "Cihaz Güncellendi",
  DEVICE_DELETE: "Cihaz Silindi",
  PROFILE_CREATE: "Profil Oluşturuldu",
  PROFILE_UPDATE: "Profil Güncellendi",
  PROFILE_DELETE: "Profil Silindi",
  DASHBOARD_CREATE: "Dashboard Oluşturuldu",
  DASHBOARD_UPDATE: "Dashboard Güncellendi",
  DASHBOARD_DELETE: "Dashboard Silindi",
  ALARM_ACKNOWLEDGE: "Alarm Onaylandı",
  ALARM_CLEAR: "Alarm Temizlendi",
  INACTIVE_DEVICE_REJECTED: "Devre Dışı Cihaz Reddedildi",
  AUTH_FAILED: "Kimlik Doğrulama Başarısız",
  SECURITY_ALERT: "Güvenlik Uyarısı",
};

// --- Yardımcı: Aksiyon badge renkleri ---
function getActionBadgeClass(action) {
  if (action === "SECURITY_ALERT") {
    return "bg-red-500/10 text-red-500 animate-pulse";
  }
  if (
    action === "INACTIVE_DEVICE_REJECTED" ||
    action === "AUTH_FAILED"
  ) {
    return "bg-orange-500/10 text-orange-500";
  }
  if (action === "ALARM_ACKNOWLEDGE" || action === "ALARM_CLEAR") {
    return "bg-yellow-500/10 text-yellow-500";
  }
  if (action.endsWith("_CREATE")) {
    return "bg-green-500/10 text-green-500";
  }
  if (action.endsWith("_UPDATE")) {
    return "bg-blue-500/10 text-blue-500";
  }
  if (action.endsWith("_DELETE")) {
    return "bg-red-500/10 text-red-500";
  }
  return "bg-gray-500/10 text-gray-500";
}

// --- Yardımcı: Entity type ikonu ---
const entityTypeIcons = {
  DEVICE: Router,
  DEVICE_PROFILE: UserCheck,
  DASHBOARD: LayoutDashboard,
  ALARM: Bell,
  USER: User,
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [pageParams, setPageParams] = useState({
    page: 1,
    limit: 20,
  });
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  const [filters, setFilters] = useState({
    search: "",
    action: "",
    status: "",
  });

  // Audit Log API'den verileri çek
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.append("page", pageParams.page);
      params.append("limit", pageParams.limit);

      if (filters.search) params.append("search", filters.search);
      if (filters.action && filters.action !== "all")
        params.append("action", filters.action);
      if (filters.status && filters.status !== "all")
        params.append("status", filters.status);

      const res = await fetch(`/api/audit-log?${params.toString()}`);
      const responseData = await res.json();

      if (res.ok && responseData.ok) {
        setLogs(responseData.data);
        setMeta({
          total: responseData.pagination.total,
          totalPages: responseData.pagination.totalPages,
        });
      } else {
        toast.error(responseData.message || "Veriler alınamadı");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Sunucuya bağlanılamadı");
    } finally {
      setLoading(false);
    }
  }, [pageParams.page, pageParams.limit, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // SSE Real-time Updates
  useEffect(() => {
    const es = new EventSource("/api/sse");
    es.addEventListener("audit-log", (e) => {
      const log = JSON.parse(e.data);
      setLogs((prev) => [log, ...prev.slice(0, pageParams.limit - 1)]);
    });
    return () => es.close();
  }, []);

  // Filtre konfigürasyonu
  const filterConfig = [
    {
      key: "action",
      placeholder: "Aksiyon Türü",
      options: [
        { label: "Cihaz İşlemleri", value: "DEVICE_%" },
        { label: "Profil İşlemleri", value: "PROFILE_%" },
        { label: "Dashboard İşlemleri", value: "DASHBOARD_%" },
        { label: "Alarm İşlemleri", value: "ALARM_%" },
        { label: "Güvenlik Olayları", value: "SECURITY_ALERT" },
        { label: "Devre Dışı Cihaz", value: "INACTIVE_DEVICE_REJECTED" },
      ],
    },
    {
      key: "status",
      placeholder: "Sonuç",
      options: [
        { label: "Başarılı", value: "SUCCESS" },
        { label: "Başarısız", value: "FAILURE" },
      ],
    },
  ];

  // Kolon tanımları
  const columns = [
    {
      id: "time",
      title: "Zaman",
      span: 2,
      cellRender: (log) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-text-main">
            {getRelativeTime(log.timestamp)}
          </span>
          <span className="text-xs text-text-muted">
            {new Date(log.timestamp).toLocaleTimeString("tr-TR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      ),
    },
    {
      id: "action",
      title: "Aksiyon",
      span: 3,
      cellRender: (log) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getActionBadgeClass(
            log.action
          )}`}
        >
          {actionLabels[log.action] || log.action}
        </span>
      ),
    },
    {
      id: "source",
      title: "Kaynak",
      span: 3,
      cellRender: (log) => {
        const Icon = entityTypeIcons[log.entityType] || User;
        return (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-halo-400 to-halo-600 shadow-sm">
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-text-main truncate">
                {log.entityName}
              </p>
              <p className="text-xs text-text-muted truncate">
                {log.entityType}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: "status",
      title: "Sonuç",
      span: 2,
      cellRender: (log) =>
        log.status === "SUCCESS" ? (
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-green-600">
              Başarılı
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-600">
              Başarısız
            </span>
          </div>
        ),
    },
    {
      id: "details",
      title: "Detay",
      span: 2,
      cellRender: (log) => {
        const details = log.details || {};
        return (
          <div className="flex flex-col text-xs text-text-muted overflow-hidden">
            {details.ip && (
              <span className="truncate">
                IP: <span className="font-mono">{details.ip}</span>
              </span>
            )}
            {details.protocol && (
              <span className="truncate uppercase">
                {details.protocol}
              </span>
            )}
            {details.attemptCount && (
              <span className="flex items-center gap-1 text-orange-500 font-semibold">
                <AlertTriangle className="h-3 w-3" />
                {details.attemptCount} deneme
              </span>
            )}
          </div>
        );
      },
    },
  ];

  const handlePageChange = (newPage) => {
    setPageParams((prev) => ({ ...prev, page: newPage }));
  };

  return (
    <>
      {/* Sayfa Başlığı ve Filtreler */}
      <TableHeader
        title="Denetim Günlükleri"
        advert="Sistem etkinliklerini ve kullanıcı işlemlerini takip edin"
        onRefresh={fetchData}
        filterConfig={filterConfig}
        onFilterChange={setFilters}
      />

      {/* Tablo İçeriği */}
      <TableContent
        data={logs}
        columns={columns}
        gridClassName="grid-cols-12"
        title="Denetim Kayıtları"
        getRowId={(log) => log._id}
        rowClassName={(log) => {
          if (log.action === "SECURITY_ALERT") return "bg-red-50/30";
          if (log.status === "FAILURE") return "opacity-75";
          return "";
        }}
        emptyState={
          <div className="text-center py-12">
            <ScrollText className="h-16 w-16 mx-auto text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold">
              Denetim Kaydı Bulunamadı
            </h3>
            <p className="text-gray-500 mt-2">
              {filters.search
                ? "Arama kriterlerinize uygun kayıt bulunamadı"
                : "Henüz hiç denetim kaydı oluşmamış"}
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
    </>
  );
}
