import {
  TableContent,
  TableHeaderSheet,
} from "@/components/common/table/table-header";
import { Copy, Edit, Plus, RotateCw, Search, Trash2, Loader2 } from "lucide-react";
import { useState, useMemo, useEffect, useCallback } from "react";
import Fuse from "fuse.js";

const SCOPE_CONFIG = {
  SERVER_SCOPE: {
    canAdd: true,
    canRefresh: true,
    canSearch: true,
    canEdit: true,
    canDelete: true,
  },
  CLIENT_SCOPE: {
    canAdd: false, // Client'tan geliyor, ekleyemezsin
    canRefresh: true,
    canSearch: true,
    canEdit: false,
    canDelete: false,
  },
  SHARED_SCOPE: {
    canAdd: true,
    canRefresh: true,
    canSearch: true,
    canEdit: true,
    canDelete: true,
  },
};

// Tablo kolonları
const columns = [
  {
    id: "lastUpdateTs",
    title: "Son Güncelleme",
    span: 3,
    cellRender: (row) => (
      <span className="text-sm text-text-muted">
        {row.lastUpdateTs
          ? new Date(row.lastUpdateTs).toLocaleString("tr-TR")
          : "—"}
      </span>
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
        {typeof row.value === "object"
          ? JSON.stringify(row.value)
          : String(row.value)}
      </span>
    ),
  },
];

export function DeviceAttributeTab({ deviceId }) {
  const [scope, setScope] = useState("SERVER_SCOPE");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAttr, setEditingAttr] = useState(null);
  const itemsPerPage = 10;
  const currentConfig = SCOPE_CONFIG[scope];

  // ── Attribute'ları API'den çek ──
  const fetchAttributes = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/device/${deviceId}/attributes?scope=${scope}`
      );
      const json = await res.json();
      if (json.ok) {
        setAttributes(json.data || []);
      }
    } catch (err) {
      console.error("Attribute fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [deviceId, scope]);

  useEffect(() => {
    fetchAttributes();
  }, [fetchAttributes]);

  const filteredData = useMemo(() => {
    if (!searchQuery) return attributes;
    const fuse = new Fuse(attributes, {
      keys: ["key", "value"],
      threshold: 0.3,
    });
    return fuse.search(searchQuery).map((res) => res.item);
  }, [attributes, searchQuery]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  // ── Add/Edit attribute ──
  const handleSave = async (key, value) => {
    try {
      const res = await fetch(`/api/device/${deviceId}/attributes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, key, value }),
      });
      const json = await res.json();
      if (json.ok) {
        await fetchAttributes();
        setShowAddModal(false);
        setEditingAttr(null);
      }
    } catch (err) {
      console.error("Attribute save error:", err);
    }
  };

  const handleDelete = async (row) => {
    if (!confirm(`"${row.key}" özniteliğini silmek istediğinize emin misiniz?`))
      return;
    try {
      const res = await fetch(`/api/device/${deviceId}/attributes`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, keys: [row.key] }),
      });
      const json = await res.json();
      if (json.ok) {
        await fetchAttributes();
      }
    } catch (err) {
      console.error("Attribute delete error:", err);
    }
  };

  const handleAdd = () => {
    setEditingAttr(null);
    setShowAddModal(true);
  };

  const handleEdit = (row) => {
    setEditingAttr(row);
    setShowAddModal(true);
  };

  const handleRefresh = () => fetchAttributes();

  const handleSearch = (value) => {
    setSearchQuery(value || "");
    setCurrentPage(1);
  };

  const handleRowClick = (row) => {
    if (currentConfig.canEdit) {
      handleEdit(row);
    }
  };

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
          onChange: (v) => {
            setScope(v);
            setCurrentPage(1);
            setSearchQuery("");
          },
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
            icon: loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCw className="h-4 w-4" />
            ),
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
        title={
          loading
            ? "Yükleniyor..."
            : `${filteredData.length} öznitelik`
        }
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
        getRowId={(row) => row._id || row.id}
      />

      {/* Add/Edit Modal */}
      {showAddModal && (
        <AttributeModal
          attribute={editingAttr}
          onSave={handleSave}
          onClose={() => {
            setShowAddModal(false);
            setEditingAttr(null);
          }}
        />
      )}
    </div>
  );
}

// ── Attribute Add/Edit Modal ──
function AttributeModal({ attribute, onSave, onClose }) {
  const [key, setKey] = useState(attribute?.key || "");
  const [value, setValue] = useState(
    attribute
      ? typeof attribute.value === "object"
        ? JSON.stringify(attribute.value)
        : String(attribute.value)
      : ""
  );
  const [saving, setSaving] = useState(false);
  const isEdit = !!attribute;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!key.trim()) return;

    setSaving(true);

    // Değeri otomatik parse et
    let parsedValue = value;
    if (value === "true") parsedValue = true;
    else if (value === "false") parsedValue = false;
    else if (!isNaN(value) && value.trim() !== "") parsedValue = Number(value);
    else {
      try {
        parsedValue = JSON.parse(value);
      } catch {
        // String olarak bırak
      }
    }

    await onSave(key.trim(), parsedValue);
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="bg-bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-2xl"
      >
        <h3 className="text-lg font-semibold text-text-main mb-4">
          {isEdit ? "Öznitelik Düzenle" : "Yeni Öznitelik"}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">
              Anahtar (Key)
            </label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              disabled={isEdit}
              placeholder="örn: targetTemperature"
              className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-text-main placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1">
              Değer (Value)
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="örn: 24.5"
              className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-text-main placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="text-xs text-text-muted mt-1">
              Sayılar, boolean (true/false) ve JSON otomatik algılanır.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-muted hover:text-text-main transition-colors"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={!key.trim() || saving}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            {isEdit ? "Güncelle" : "Ekle"}
          </button>
        </div>
      </form>
    </div>
  );
}
