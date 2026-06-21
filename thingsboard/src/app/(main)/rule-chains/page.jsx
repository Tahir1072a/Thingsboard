"use client";

/**
 * /rule-chains — Kural Zinciri Yönetim Sayfası
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  TableContent,
  TableHeader,
} from "@/components/common/table/table-header";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  Workflow,
  Edit,
  Trash2,
  Star,
  Save,
  Loader2,
  FileQuestion,
  Eye,
} from "lucide-react";
import { useConfirm } from "@/components/common/confirm-modal";

// --- Create Modal ---
function CreateChainModal({ open, onOpenChange, onSuccess }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isRoot, setIsRoot] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      setSaving(true);
      const res = await fetch("/api/rule-chain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), isRoot }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success("Kural zinciri oluşturuldu.");
        onOpenChange(false);
        setName("");
        setDescription("");
        setIsRoot(false);
        router.push(`/rule-chains/${data.data._id}`);
      } else {
        toast.error(data.message || "Oluşturma başarısız.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-lg p-0 overflow-hidden border-white/20 max-h-[90vh] flex flex-col">
        <DialogHeader className="bg-halo-50/50 px-6 py-5 animate-fade-in shrink-0">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold text-text-main">
            <div className="p-2 bg-halo-100 rounded-lg">
              <Workflow className="h-6 w-6 text-halo-600" />
            </div>
            Yeni Kural Zinciri
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <div className="space-y-2">
            <Label className="text-base font-bold text-text-main">Zincir Adı *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Telemetri İşleme Zinciri"
              className="h-14 px-4 text-base bg-white/90 border-gray-200 focus:ring-halo-600"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label className="text-base font-bold text-text-main">Açıklama</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Zincir açıklaması (opsiyonel)"
              className="h-14 px-4 text-base bg-white/90 border-gray-200 focus:ring-halo-600"
            />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 border border-gray-200">
            <div>
              <Label className="text-base font-bold text-text-main">Root Zincir</Label>
              <p className="text-sm text-text-muted mt-0.5">Varsayılan veri işleme zinciri olarak ayarla</p>
            </div>
            <Switch checked={isRoot} onCheckedChange={setIsRoot} />
          </div>
        </div>

        <DialogFooter className="bg-halo-50/30 px-6 py-4 border-t border-white/10 shrink-0 flex flex-row justify-end gap-3 backdrop-blur-sm">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-12 px-6 text-base border-gray-300 text-gray-600 bg-white hover:bg-gray-100"
          >
            İptal
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || saving}
            className="h-12 px-8 text-base bg-halo-600 hover:bg-halo-700 text-white shadow-md hover:shadow-halo-600/30"
          >
            {saving ? "Oluşturuluyor..." : "Oluştur & Düzenle"}
            {!saving && <Save className="ml-2 h-5 w-5" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Main Page ---
export default function RuleChainsPage() {
  const [chains, setChains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const router = useRouter();

  const [pageParams, setPageParams] = useState({ page: 1, limit: 20 });
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ search: "" });
  const { confirm, ConfirmDialog } = useConfirm();

  const fetchChains = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", pageParams.page);
      params.append("limit", pageParams.limit);
      if (filters.search) params.append("search", filters.search);

      const res = await fetch(`/api/rule-chain?${params.toString()}`);
      const json = await res.json();
      if (json.ok) {
        setChains(json.data || []);
        if (json.pagination) {
          setMeta({
            total: json.pagination.total,
            totalPages: json.pagination.totalPages,
          });
        }
      } else {
        toast.error(json.message || "Veri alınamadı");
      }
    } catch (err) {
      console.error(err);
      toast.error("Sunucuya bağlanılamadı");
    } finally {
      setLoading(false);
    }
  }, [pageParams.page, pageParams.limit, filters]);

  useEffect(() => {
    fetchChains();
  }, [fetchChains]);

  const toggleRoot = async (chain) => {
    try {
      const res = await fetch(`/api/rule-chain/${chain._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRoot: !chain.isRoot }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success(chain.isRoot ? "Root kaldırıldı." : "Root olarak ayarlandı.");
        await fetchChains();
      } else {
        toast.error(data.message || "İşlem başarısız.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    }
  };

  const handleDelete = async (chain) => {
    if (chain.isRoot) {
      toast.error("Root zincir silinemez.");
      return;
    }
    const confirmed = await confirm({ title: "Zinciri Sil", message: `"${chain.name}" zincirini silmek istediğinizden emin misiniz?`, danger: true });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/rule-chain/${chain._id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success(`"${chain.name}" silindi.`);
        await fetchChains();
      } else {
        toast.error(data.message || "Silme başarısız.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    }
  };

  // Column definitions
  const columns = [
    {
      id: "chain",
      title: "Kural Zinciri",
      span: 3,
      cellRender: (chain) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-halo-400 to-halo-600 shadow-sm group-hover:scale-105 transition-transform">
            <Workflow className="h-4 w-4 text-white" />
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-text-main truncate">{chain.name}</p>
              {chain.isRoot && (
                <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded font-medium">
                  ROOT
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted truncate">
              {chain.description || "Açıklama yok"}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "description",
      title: "Açıklama",
      span: 3,
      cellRender: (chain) => (
        <p className="text-sm text-text-main truncate">
          {chain.description || "—"}
        </p>
      ),
    },
    {
      id: "nodes",
      title: "Node Sayısı",
      span: 1,
      align: "center",
      cellRender: (chain) => (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-transparent font-medium">
          {chain.nodes?.length || 0} node
        </Badge>
      ),
    },
    {
      id: "connections",
      title: "Bağlantı",
      span: 1,
      align: "center",
      cellRender: (chain) => (
        <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-transparent font-medium">
          {chain.connections?.length || 0} bağlantı
        </Badge>
      ),
    },
    {
      id: "status",
      title: "Durum",
      span: 2,
      align: "center",
      cellRender: (chain) => (
        <Badge
          variant="outline"
          className={cn(
            "border-transparent font-medium",
            chain.isRoot
              ? "bg-amber-500/10 text-amber-600"
              : "bg-gray-500/10 text-gray-600"
          )}
        >
          {chain.isRoot ? "⭐ Root" : "Normal"}
        </Badge>
      ),
    },
  ];

  const rowActions = [
    {
      label: "Düzenle",
      onClick: (chain) => router.push(`/rule-chains/${chain._id}`),
      icon: <Edit className="h-4 w-4" />,
    },
    {
      label: (chain) => (chain.isRoot ? "Root Kaldır" : "Root Yap"),
      onClick: (chain) => toggleRoot(chain),
      icon: <Star className="h-4 w-4" />,
    },
    {
      label: "Sil",
      onClick: (chain) => handleDelete(chain),
      icon: <Trash2 className="h-4 w-4" />,
      className: "text-red-600",
    },
  ];

  const handlePageChange = (newPage) => {
    setPageParams((prev) => ({ ...prev, page: newPage }));
  };

  return (
    <>
      <TableHeader
        title="Kural Zincirleri"
        advert="Veri işleme akışlarını görsel olarak tasarlayın"
        addButtonName="Yeni Kural Zinciri"
        onAdd={() => setShowCreate(true)}
        onRefresh={fetchChains}
        filterConfig={[]}
        onFilterChange={setFilters}
      />

      <TableContent
        data={chains}
        loading={loading}
        columns={columns}
        gridClassName="grid-cols-12"
        title="Kural Zinciri Listesi"
        rowActions={rowActions}
        getRowId={(chain) => chain._id}
        onRowClick={(chain) => router.push(`/rule-chains/${chain._id}`)}
        emptyState={
          <div className="text-center py-12">
            <Workflow className="h-16 w-16 mx-auto text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold">Kural Zinciri Bulunamadı</h3>
            <p className="text-gray-500 mt-2">
              {filters.search ? "Arama kriterlerinize uygun zincir bulunamadı" : "Yeni bir zincir oluşturup veri akışınızı tasarlayın"}
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

      <CreateChainModal
        open={showCreate}
        onOpenChange={setShowCreate}
        onSuccess={fetchChains}
      />

      <ConfirmDialog />
    </>
  );
}
