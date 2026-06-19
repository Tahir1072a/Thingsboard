import {
  TableContent,
  TableHeaderSheet,
} from "@/components/common/table/table-header";
import { Copy, Edit, Plus, RotateCw, Search, Trash2 } from "lucide-react";
import { useState, useMemo } from "react";
import Fuse from "fuse.js";

const SCOPE_CONFIG = {
  SERVER_SCOPE: {
    canAdd: true,
    canRefresh: true,
    canSearch: true,
  },
  CLIENT_SCOPE: {
    canAdd: false, // Client'tan geliyor, ekleyemezsin
    canRefresh: true,
    canSearch: true,
  },
  SHARED_SCOPE: {
    canAdd: true,
    canRefresh: true,
    canSearch: true,
  },
};

const MOCK_ATTRIBUTES = {
  SERVER_SCOPE: [
    {
      id: "1",
      key: "active",
      value: "false",
      lastUpdateTs: "2025-11-05 15:41:45",
    },
    {
      id: "2",
      key: "inactivityAlarmTime",
      value: "1762346504945",
      lastUpdateTs: "2025-11-05 15:41:45",
    },
    {
      id: "3",
      key: "lastActivityTime",
      value: "1762345866727",
      lastUpdateTs: "2025-11-05 15:31:08",
    },
    {
      id: "4",
      key: "lastConnectTime",
      value: "1762345800000",
      lastUpdateTs: "2025-11-05 15:30:00",
    },
    {
      id: "5",
      key: "lastDisconnectTime",
      value: "1762345866727",
      lastUpdateTs: "2025-11-05 15:31:08",
    },
  ],
  CLIENT_SCOPE: [
    {
      id: "6",
      key: "firmwareVersion",
      value: "v2.3.1",
      lastUpdateTs: "2025-11-04 10:20:30",
    },
    {
      id: "7",
      key: "hardwareVersion",
      value: "rev-B",
      lastUpdateTs: "2025-11-04 10:20:30",
    },
    {
      id: "8",
      key: "serialNumber",
      value: "SN-2024-001234",
      lastUpdateTs: "2025-11-04 10:20:30",
    },
    {
      id: "9",
      key: "ipAddress",
      value: "192.168.1.105",
      lastUpdateTs: "2025-11-05 14:22:10",
    },
  ],
  SHARED_SCOPE: [
    {
      id: "10",
      key: "targetTemperature",
      value: "24.5",
      lastUpdateTs: "2025-11-05 12:00:00",
    },
    {
      id: "11",
      key: "operationMode",
      value: "auto",
      lastUpdateTs: "2025-11-05 11:45:00",
    },
    {
      id: "12",
      key: "alertThreshold",
      value: "30",
      lastUpdateTs: "2025-11-05 09:30:00",
    },
  ],
};

// Tablo kolonları
const columns = [
  {
    id: "lastUpdateTs",
    title: "Son Güncelleme",
    span: 3,
    cellRender: (row) => (
      <span className="text-sm text-text-muted">{row.lastUpdateTs}</span>
    ),
  },
  {
    id: "key",
    title: "Anahtar",
    span: 4,
    cellRender: (row) => (
      <div className="flex items-center gap-2">
        <span className="font-medium text-text-main">{row.key}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(row.key);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/40 rounded transition-all"
          title="Kopyala"
        >
          <Copy className="h-3 w-3 text-text-muted" />
        </button>
      </div>
    ),
  },
  {
    id: "value",
    title: "Değer",
    span: 3,
    cellRender: (row) => (
      <span className="text-sm text-text-main font-mono bg-white/30 px-2 py-0.5 rounded">
        {row.value}
      </span>
    ),
  },
];

export function DeviceAttributeTab() {
  const [scope, setScope] = useState("SERVER_SCOPE");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const currentConfig = SCOPE_CONFIG[scope];

  const filteredData = useMemo(() => {
    const rawData = MOCK_ATTRIBUTES[scope] || [];
    if (!searchQuery) return rawData;
    const fuse = new Fuse(rawData, {
      keys: ["key", "value"],
      threshold: 0.3,
    });
    return fuse.search(searchQuery).map((res) => res.item);
  }, [scope, searchQuery]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const handleAdd = () => console.log("Add clicked");
  const handleRefresh = () => console.log("Refresh clicked");
  const handleSearch = (value) => {
    setSearchQuery(value || "");
    setCurrentPage(1);
  };
  const handleEdit = (row) => console.log("Edit:", row);
  const handleDelete = (row) => console.log("Delete:", row);
  const handleRowClick = (row) => console.log("Row clicked:", row);

  const rowActions = [
    currentConfig.canEdit && {
      label: "Düzenle",
      icon: <Edit />,
      onClick: handleEdit,
    },
    {
      label: "Kopyala",
      icon: <Copy />,
      onClick: (row) => navigator.clipboard.writeText(JSON.stringify(row)),
    },
    currentConfig.canDelete && {
      label: "Sil",
      icon: <Trash2 />,
      onClick: handleDelete,
      className: "text-red-500 hover:text-red-600 hover:bg-red-50/50",
    },
  ].filter(Boolean);

  return (
    <div className="flex flex-col h-full">
      <TableHeaderSheet
        title="Öznitelikler"
        selectConfig={{
          value: scope,
          onChange: setScope,
          options: [
            { label: "Sunucu Öznitelikleri", value: "SERVER_SCOPE" },
            { label: "İstemci Öznitelikleri", value: "CLIENT_SCOPE" },
            { label: "Paylaşılan Öznitelikler", value: "SHARED_SCOPE" },
          ],
        }}
        actions={[
          {
            icon: <Plus className="h-4 w-4" />,
            onClick: handleAdd,
            tooltip: "Yeni Öznitelik Ekle",
            show: currentConfig.canAdd,
          },
          {
            icon: <RotateCw className="h-4 w-4" />,
            onClick: handleRefresh,
            tooltip: "Yenile",
            show: currentConfig.canRefresh,
          },
        ]}
        onSearch={handleSearch}
      />

      <TableContent
        data={paginatedData}
        columns={columns}
        title={`${filteredData.length} öznitelik`}
        onRowClick={handleRowClick}
        rowActions={rowActions}
        bulkActions={[]}
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
            : "Henüz öznitelik yok"
        }
        getRowId={(row) => row.id}
      />
    </div>
  );
}
