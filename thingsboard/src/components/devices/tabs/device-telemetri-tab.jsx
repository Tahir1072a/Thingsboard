"use client";

/**
 * DeviceTelemetryTab — Cihaza özel telemetri sekmesi
 *
 * Her benzersiz key için son değeri gösterir.
 * GET /api/telemetry?deviceId={id}&latest=true ile veri çeker.
 * SSE ile gelen yeni telemetri verisiyle anlık güncellenir.
 */

import {
  TableContent,
  TableHeaderSheet,
} from "@/components/common/table/table-header";
import {
  RotateCw,
  LineChart,
  Copy,
  Trash2,
  Hash,
  Type,
  ToggleLeft,
  Braces,
  Clock,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useTelemetrySSE } from "@/lib/sse-pool";
import Fuse from "fuse.js";
import { Badge } from "@/components/ui/badge";

// Veri tipi ikonu
const TypeIcon = ({ type }) => {
  const icons = {
    number: <Hash className="h-3.5 w-3.5" />,
    string: <Type className="h-3.5 w-3.5" />,
    boolean: <ToggleLeft className="h-3.5 w-3.5" />,
    json: <Braces className="h-3.5 w-3.5" />,
  };

  const colors = {
    number: "text-blue-500 bg-blue-50",
    string: "text-green-500 bg-green-50",
    boolean: "text-purple-500 bg-purple-50",
    json: "text-orange-500 bg-orange-50",
  };

  return (
    <div
      className={`p-1 rounded ${colors[type] || "text-gray-500 bg-gray-50"}`}
    >
      {icons[type] || <Type className="h-3.5 w-3.5" />}
    </div>
  );
};

// Değer formatla
const formatValue = (value, type, unit) => {
  if (type === "boolean") {
    const boolVal = value === "true" || value === true;
    return (
      <Badge
        variant="outline"
        className={
          boolVal
            ? "bg-green-50 text-green-600 border-green-200"
            : "bg-red-50 text-red-600 border-red-200"
        }
      >
        {boolVal ? "True" : "False"}
      </Badge>
    );
  }

  if (type === "json") {
    return (
      <span className="text-xs font-mono bg-orange-50 text-orange-600 px-2 py-1 rounded truncate max-w-[150px] block">
        {typeof value === "object" ? JSON.stringify(value) : value}
      </span>
    );
  }

  return (
    <span className="font-mono text-text-main">
      {String(value)}
      {unit && <span className="text-text-muted ml-1 text-xs">{unit}</span>}
    </span>
  );
};

// Relative time
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

// Tablo kolonları
const columns = [
  {
    id: "key",
    title: "Anahtar",
    span: 3,
    cellRender: (row) => (
      <div className="flex items-center gap-2">
        <TypeIcon type={row.type} />
        <span className="font-medium text-text-main">{row.key}</span>
      </div>
    ),
  },
  {
    id: "value",
    title: "Son Değer",
    span: 4,
    cellRender: (row) => formatValue(row.value, row.type, row.unit),
  },
  {
    id: "lastUpdateTs",
    title: "Son Güncelleme",
    span: 3,
    cellRender: (row) => (
      <div className="flex items-center gap-1.5 text-sm text-text-muted">
        <Clock className="h-3.5 w-3.5" />
        <span>{getRelativeTime(row.timestamp)}</span>
      </div>
    ),
  },
];

export function DeviceTelemetryTab({ deviceId }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [telemetryData, setTelemetryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchTelemetry = useCallback(async () => {
    if (!deviceId) return;
    try {
      setLoading(true);
      const res = await fetch(
        `/api/telemetry?deviceId=${deviceId}&latest=true`
      );
      const data = await res.json();
      if (data.ok && data.data) {
        const formatted = data.data.map((item) => ({
          id: item._id,
          key: item.key,
          value: item.value,
          type: item.valueType || "string",
          timestamp: item.timestamp,
          unit: item.unit,
          protocol: item.protocol,
        }));
        setTelemetryData(formatted);
      }
    } catch (err) {
      console.error("Telemetry fetch hatası", err);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  // SSE Canlı Güncelleme
  const handleSSETelemetry = useCallback((item) => {
    const newItem = {
      id: item._id || Date.now().toString(),
      key: item.key,
      value: item.value,
      type: item.valueType || (typeof item.value === "number" ? "number" : "string"),
      timestamp: item.timestamp || new Date().toISOString(),
      unit: item.unit,
      protocol: item.protocol,
    };

    // Aynı key varsa güncelle, yoksa ekle
    setTelemetryData((prev) => {
      const idx = prev.findIndex((p) => p.key === newItem.key);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = newItem;
        return updated;
      }
      return [...prev, newItem].sort((a, b) => a.key.localeCompare(b.key));
    });
  }, []);

  useTelemetrySSE(deviceId, handleSSETelemetry);

  const filteredData = useMemo(() => {
    if (!searchQuery) return telemetryData;
    const fuse = new Fuse(telemetryData, {
      keys: ["key", "value"],
      threshold: 0.3,
    });
    return fuse.search(searchQuery).map((res) => res.item);
  }, [telemetryData, searchQuery]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const handleSearch = (value) => {
    setSearchQuery(value || "");
    setCurrentPage(1);
  };
  const handleViewChart = (row) => console.log("View chart:", row.key);
  const handleDelete = (row) => console.log("Delete telemetry:", row.key);
  const handleRowClick = (row) => console.log("Row clicked:", row);

  const rowActions = [
    {
      label: "Grafik Görüntüle",
      icon: <LineChart />,
      onClick: handleViewChart,
    },
    {
      label: "Anahtarı Kopyala",
      icon: <Copy />,
      onClick: async (row) => {
        await navigator.clipboard.writeText(row.key);
        const toast = await import("react-hot-toast");
        toast.default.success("Anahtar kopyalandı");
      },
    },
    {
      label: "Veriyi Sil",
      icon: <Trash2 />,
      onClick: handleDelete,
      className: "text-red-500 hover:text-red-600 hover:bg-red-50/50",
    },
  ];

  const bulkActions = [
    {
      label: "Seçilenleri Grafikte Göster",
      icon: <LineChart className="h-4 w-4" />,
      onClick: (selected) => console.log("Show chart for:", selected),
    },
    {
      label: "Seçilenleri Sil",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (selected) => console.log("Delete:", selected),
      variant: "destructive",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <TableHeaderSheet
        title="Telemetri"
        actions={[
          {
            icon: <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />,
            onClick: fetchTelemetry,
            tooltip: "Yenile",
          },
          {
            icon: <LineChart className="h-4 w-4" />,
            onClick: () => console.log("Open chart view"),
            tooltip: "Grafik Görünümü",
          },
        ]}
        onSearch={handleSearch}
      />

      <TableContent
        data={paginatedData}
        columns={columns}
        title={`${filteredData.length} benzersiz telemetri anahtarı`}
        onRowClick={handleRowClick}
        rowActions={rowActions}
        bulkActions={bulkActions}
        gridClassName="grid-cols-12"
        pagination={{
          currentPage,
          totalPages: Math.ceil(filteredData.length / itemsPerPage) || 1,
          itemsPerPage,
          onPageChange: setCurrentPage,
        }}
        emptyState={
          searchQuery
            ? `"${searchQuery}" için sonuç bulunamadı`
            : "Henüz telemetri verisi yok"
        }
        getRowId={(row) => row.id}
      />
    </div>
  );
}
