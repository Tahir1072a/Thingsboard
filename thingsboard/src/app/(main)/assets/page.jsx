"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Boxes,
  Plus,
  Pencil,
  Trash2,
  Eye,
  MapPin,
  Building2,
  Truck,
  Factory,
  Tag,
} from "lucide-react";
import {
  TableContent,
  TableHeader,
} from "@/components/common/table/table-header";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// --- Type Config ---
const typeConfig = {
  ZONE: { label: "Bölge", icon: MapPin, color: "bg-emerald-500/10 text-emerald-600" },
  BUILDING: { label: "Bina", icon: Building2, color: "bg-blue-500/10 text-blue-600" },
  FLEET: { label: "Filo", icon: Truck, color: "bg-orange-500/10 text-orange-600" },
  LINE: { label: "Hat", icon: Factory, color: "bg-purple-500/10 text-purple-600" },
  CUSTOM: { label: "Özel", icon: Tag, color: "bg-gray-500/10 text-gray-600" },
};

// --- Helpers ---
function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Az önce";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

// --- Create Asset Modal ---
function CreateAssetModal({ open, onOpenChange, onSuccess }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("ZONE");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setName("");
      setType("ZONE");
      setLabel("");
      setDescription("");
    }
  }, [open]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Lütfen bir varlık adı girin");
      return;
    }

    try {
      setCreating(true);
      const res = await fetch("/api/asset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          label: label.trim() || undefined,
          description: description.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success("Varlık başarıyla oluşturuldu");
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast.error(data.message || "Varlık oluşturulamadı");
      }
    } catch (err) {
      console.error(err);
      toast.error("Bir hata oluştu");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-lg p-0 overflow-hidden border-white/20 max-h-[90vh] flex flex-col">
        <DialogHeader className="bg-halo-50/50 px-6 py-5 animate-fade-in shrink-0">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold text-text-main">
            <div className="p-2 bg-halo-100 rounded-lg">
              <Boxes className="h-6 w-6 text-halo-600" />
            </div>
            Yeni Varlık
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Name input */}
          <div className="space-y-2">
            <Label className="text-base font-bold text-text-main">Ad</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Varlık adı giriniz..."
              className="h-14 px-4 text-base bg-white/90 border-gray-200 focus:ring-halo-600"
            />
          </div>

          {/* Type selector */}
          <div className="space-y-2">
            <Label className="text-base font-bold text-text-main">Tip</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-14 w-full px-4 text-base bg-white/90 border-gray-200 focus:ring-2 focus:ring-halo-600 cursor-pointer">
                <SelectValue placeholder="Tip seçiniz" />
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-xl border-gray-200 shadow-xl">
                {Object.entries(typeConfig).map(([key, config]) => {
                  const TypeIcon = config.icon;
                  return (
                    <SelectItem
                      key={key}
                      value={key}
                      className="py-3 cursor-pointer focus:bg-halo-50"
                    >
                      <div className="flex items-center gap-2">
                        <TypeIcon className="h-4 w-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Label input */}
          <div className="space-y-2">
            <Label className="text-base font-bold text-text-main">Etiket</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Opsiyonel etiket..."
              className="h-14 px-4 text-base bg-white/90 border-gray-200 focus:ring-halo-600"
            />
          </div>

          {/* Description textarea */}
          <div className="space-y-2">
            <Label className="text-base font-bold text-text-main">Açıklama</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Varlık açıklaması..."
              rows={4}
              className="px-4 py-3 text-base bg-white/90 border-gray-200 focus:ring-halo-600 resize-none"
            />
          </div>
        </div>

        <DialogFooter className="bg-halo-50/30 px-6 py-4 border-t border-white/10 shrink-0 flex flex-row justify-end gap-3 backdrop-blur-sm">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-12 px-6 text-base border-gray-300 text-gray-600 bg-white hover:bg-gray-100"
          >
            İptal
          </Button>
          <Button
            type="button"
            disabled={creating}
            onClick={handleCreate}
            className="h-12 px-8 text-base bg-halo-600 hover:bg-halo-700 text-white shadow-md hover:shadow-halo-600/30 transition-all flex items-center"
          >
            {creating ? "Oluşturuluyor..." : "Oluştur"}
            {!creating && <Plus className="ml-2 h-5 w-5" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Main Page ---
export default function AssetsPage() {
  const [openCreate, setOpenCreate] = useState(false);

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [pageParams, setPageParams] = useState({
    page: 1,
    limit: 20,
  });
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  const [filters, setFilters] = useState({
    search: "",
    type: "",
  });

  // Fetch Assets
  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", pageParams.page);
      params.append("limit", pageParams.limit);

      if (filters.search) params.append("search", filters.search);
      if (filters.type && filters.type !== "all")
        params.append("type", filters.type);

      const res = await fetch(`/api/asset?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.ok) {
        setAssets(data.data || []);
        setMeta({
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 1,
        });
      } else {
        toast.error(data.message || "Veriler alınamadı");
      }
    } catch {
      toast.error("Varlıklar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [pageParams.page, pageParams.limit, filters]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Delete handler
  const handleDeleteAsset = async (asset) => {
    const confirmed = confirm(
      `"${asset.name}" varlığını silmek istediğinizden emin misiniz?`
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/asset/${asset._id || asset.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        toast.success(`"${asset.name}" başarıyla silindi.`);
        await fetchAssets();
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

  // Bulk delete handler
  const handleBulkDelete = async (selectedIds) => {
    const count = selectedIds.length;
    if (!confirm(`${count} varlığı silmek istediğinizden emin misiniz?`)) return;

    try {
      setLoading(true);
      let successCount = 0;
      let failCount = 0;

      for (const id of selectedIds) {
        try {
          const res = await fetch(`/api/asset/${id}`, { method: "DELETE" });
          const data = await res.json();
          if (res.ok && data.ok) successCount++;
          else failCount++;
        } catch {
          failCount++;
        }
      }

      if (successCount > 0) toast.success(`${successCount} varlık başarıyla silindi.`);
      if (failCount > 0) toast.error(`${failCount} varlık silinemedi.`);

      await fetchAssets();
    } catch (err) {
      console.error(err);
      toast.error("Toplu silme sırasında hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // Filter config
  const filterConfig = [
    {
      key: "type",
      placeholder: "Tip",
      options: [
        { label: "Bölge", value: "ZONE" },
        { label: "Bina", value: "BUILDING" },
        { label: "Filo", value: "FLEET" },
        { label: "Hat", value: "LINE" },
        { label: "Özel", value: "CUSTOM" },
      ],
    },
  ];

  // Column definitions
  const columns = [
    {
      id: "name",
      title: "Ad",
      span: 3,
      cellRender: (asset) => {
        const config = typeConfig[asset.type] || typeConfig.CUSTOM;
        const TypeIcon = config.icon;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-halo-400 to-halo-600 shadow-sm group-hover:scale-105 transition-transform">
              <TypeIcon className="h-4 w-4 text-white" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-text-main truncate">
                {asset.name}
              </p>
              {asset.label && (
                <p className="text-xs text-text-muted truncate">
                  {asset.label}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: "type",
      title: "Tip",
      span: 2,
      cellRender: (asset) => {
        const config = typeConfig[asset.type] || typeConfig.CUSTOM;
        return (
          <Badge
            variant="outline"
            className={cn(
              "border-transparent font-medium",
              config.color
            )}
          >
            {config.label}
          </Badge>
        );
      },
    },
    {
      id: "description",
      title: "Açıklama",
      span: 3,
      cellRender: (asset) => {
        const desc = asset.description || "—";
        const truncated = desc.length > 60 ? desc.slice(0, 60) + "…" : desc;
        return (
          <span className="text-sm text-text-muted truncate" title={desc}>
            {truncated}
          </span>
        );
      },
    },
    {
      id: "relations",
      title: "İlişkiler",
      span: 2,
      cellRender: (asset) => {
        const count = asset.relations?.length || 0;
        return (
          <span className="text-sm text-text-muted">
            {count} cihaz/varlık
          </span>
        );
      },
    },
    {
      id: "createdAt",
      title: "Oluşturulma",
      span: 2,
      cellRender: (asset) => (
        <span className="text-sm text-text-muted truncate">
          {timeAgo(asset.createdAt)}
        </span>
      ),
    },
  ];

  // Row actions
  const rowActions = [
    {
      label: "Detay Görüntüle",
      onClick: (asset) => {
        // TODO: Navigate to asset detail or open detail modal
        toast("Varlık detay sayfası yakında eklenecek", { icon: "🔧" });
      },
      icon: <Eye className="h-4 w-4" />,
    },
    {
      label: "Sil",
      onClick: (asset) => handleDeleteAsset(asset),
      icon: <Trash2 className="h-4 w-4" />,
      className: "text-red-600",
    },
  ];

  // Bulk actions
  const bulkActions = [
    {
      label: "Seçilenleri Sil",
      onClick: (selectedIds) => handleBulkDelete(selectedIds),
      icon: <Trash2 className="h-4 w-4" />,
      danger: true,
    },
  ];

  const handlePageChange = (newPage) => {
    setPageParams((prev) => ({ ...prev, page: newPage }));
  };

  return (
    <>
      {/* Sayfa Başlığı ve Filtreler */}
      <TableHeader
        title="Varlıklar"
        advert="Varlıklarınızı tek bir yerden yönetin ve takip edin"
        addButtonName="Yeni Varlık"
        onAdd={() => setOpenCreate(true)}
        onRefresh={fetchAssets}
        filterConfig={filterConfig}
        onFilterChange={setFilters}
      />

      {/* Tablo İçeriği */}
      <TableContent
        data={assets}
        columns={columns}
        gridClassName="grid-cols-12"
        title="Varlık Listesi"
        rowActions={rowActions}
        bulkActions={bulkActions}
        getRowId={(asset) => asset._id || asset.id}
        emptyState={
          <div className="text-center py-12">
            <Boxes className="h-16 w-16 mx-auto text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold">
              Varlık Bulunamadı
            </h3>
            <p className="text-gray-500 mt-2">
              {filters.search
                ? "Arama kriterlerinize uygun varlık bulunamadı"
                : "Henüz hiç varlık eklenmemiş"}
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

      {/* Varlık Oluştur Modalı */}
      <CreateAssetModal
        open={openCreate}
        onOpenChange={setOpenCreate}
        onSuccess={fetchAssets}
      />
    </>
  );
}
