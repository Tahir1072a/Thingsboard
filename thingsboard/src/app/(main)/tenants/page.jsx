"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Edit,
  ToggleLeft,
  Save,
  Plus,
  Users,
  Router,
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
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// --- Helpers ---
const planLabels = { FREE: "Ücretsiz", PRO: "Profesyonel", ENTERPRISE: "Kurumsal" };
const planColors = {
  FREE: "bg-gray-500/10 text-gray-600 border-gray-200",
  PRO: "bg-blue-500/10 text-blue-600 border-blue-200",
  ENTERPRISE: "bg-purple-500/10 text-purple-600 border-purple-200",
};

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// --- Tenant Add Modal ---
function TenantAddModal({ open, onOpenChange, onSuccess }) {
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("FREE");
  const [maxDevices, setMaxDevices] = useState(100);
  const [maxUsers, setMaxUsers] = useState(20);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setName("");
    setPlan("FREE");
    setMaxDevices(100);
    setMaxUsers(20);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Organizasyon adı zorunludur.");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          plan,
          settings: {
            maxDevices: Number(maxDevices),
            maxUsers: Number(maxUsers),
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success("Organizasyon başarıyla oluşturuldu.");
        onSuccess?.();
        onOpenChange(false);
        resetForm();
      } else {
        toast.error(data.error || "Oluşturma başarısız.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="glass-strong sm:max-w-lg p-0 overflow-hidden border-white/20 max-h-[90vh] flex flex-col">
        <DialogHeader className="bg-halo-50/50 px-6 py-5 animate-fade-in shrink-0">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold text-text-main">
            <div className="p-2 bg-halo-100 rounded-lg">
              <Plus className="h-6 w-6 text-halo-600" />
            </div>
            Yeni Organizasyon
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label className="text-base font-bold text-text-main">
              Organizasyon Adı <span className="text-red-500">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Organizasyon adını girin"
              className="h-14 px-4 text-base bg-white/90 border-gray-200 focus:ring-2 focus:ring-halo-600"
            />
          </div>

          {/* Plan */}
          <div className="space-y-2">
            <Label className="text-base font-bold text-text-main">Plan</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger className="h-14 w-full px-4 text-base bg-white/90 border-gray-200 focus:ring-2 focus:ring-halo-600 cursor-pointer">
                <SelectValue placeholder="Plan seçiniz" />
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-xl border-gray-200 shadow-xl">
                <SelectItem value="FREE" className="py-3 cursor-pointer focus:bg-halo-50">Ücretsiz</SelectItem>
                <SelectItem value="PRO" className="py-3 cursor-pointer focus:bg-halo-50">Profesyonel</SelectItem>
                <SelectItem value="ENTERPRISE" className="py-3 cursor-pointer focus:bg-halo-50">Kurumsal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Max Devices */}
          <div className="space-y-2">
            <Label className="text-base font-bold text-text-main">Maksimum Cihaz</Label>
            <Input
              type="number"
              value={maxDevices}
              onChange={(e) => setMaxDevices(e.target.value)}
              className="h-14 px-4 text-base bg-white/90 border-gray-200 focus:ring-2 focus:ring-halo-600"
            />
          </div>

          {/* Max Users */}
          <div className="space-y-2">
            <Label className="text-base font-bold text-text-main">Maksimum Kullanıcı</Label>
            <Input
              type="number"
              value={maxUsers}
              onChange={(e) => setMaxUsers(e.target.value)}
              className="h-14 px-4 text-base bg-white/90 border-gray-200 focus:ring-2 focus:ring-halo-600"
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
            disabled={saving}
            onClick={handleSave}
            className="h-12 px-8 text-base bg-halo-600 hover:bg-halo-700 text-white shadow-md hover:shadow-halo-600/30 transition-all flex items-center"
          >
            {saving ? "Oluşturuluyor..." : "Oluştur"}
            {!saving && <Save className="ml-2 h-5 w-5" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Tenant Edit Modal ---
function TenantEditModal({ open, onOpenChange, tenant, onSuccess }) {
  const [name, setName] = useState(tenant?.name || "");
  const [plan, setPlan] = useState(tenant?.plan || "FREE");
  const [isActive, setIsActive] = useState(tenant?.isActive ?? true);
  const [maxDevices, setMaxDevices] = useState(tenant?.settings?.maxDevices || 100);
  const [maxUsers, setMaxUsers] = useState(tenant?.settings?.maxUsers || 20);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenant) {
      setName(tenant.name || "");
      setPlan(tenant.plan || "FREE");
      setIsActive(tenant.isActive ?? true);
      setMaxDevices(tenant.settings?.maxDevices || 100);
      setMaxUsers(tenant.settings?.maxUsers || 20);
    }
  }, [tenant]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Organizasyon adı zorunludur.");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/tenant/${tenant._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          plan,
          isActive,
          settings: {
            maxDevices: Number(maxDevices),
            maxUsers: Number(maxUsers),
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success("Organizasyon güncellendi.");
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast.error(data.error || "Güncelleme başarısız.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  if (!tenant) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-lg p-0 overflow-hidden border-white/20 max-h-[90vh] flex flex-col">
        <DialogHeader className="bg-halo-50/50 px-6 py-5 animate-fade-in shrink-0">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold text-text-main">
            <div className="p-2 bg-halo-100 rounded-lg">
              <Edit className="h-6 w-6 text-halo-600" />
            </div>
            Organizasyonu Düzenle
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label className="text-base font-bold text-text-main">Organizasyon Adı</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-14 px-4 text-base bg-white/90 border-gray-200 focus:ring-2 focus:ring-halo-600"
            />
          </div>

          {/* Plan */}
          <div className="space-y-2">
            <Label className="text-base font-bold text-text-main">Plan</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger className="h-14 w-full px-4 text-base bg-white/90 border-gray-200 focus:ring-2 focus:ring-halo-600 cursor-pointer">
                <SelectValue placeholder="Plan seçiniz" />
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-xl border-gray-200 shadow-xl">
                <SelectItem value="FREE" className="py-3 cursor-pointer focus:bg-halo-50">Ücretsiz</SelectItem>
                <SelectItem value="PRO" className="py-3 cursor-pointer focus:bg-halo-50">Profesyonel</SelectItem>
                <SelectItem value="ENTERPRISE" className="py-3 cursor-pointer focus:bg-halo-50">Kurumsal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active status */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 border border-gray-200">
            <div>
              <Label className="text-base font-bold text-text-main">Aktif Durum</Label>
              <p className="text-sm text-text-muted mt-0.5">
                Organizasyon aktif mi?
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {/* Max Devices */}
          <div className="space-y-2">
            <Label className="text-base font-bold text-text-main">Maksimum Cihaz</Label>
            <Input
              type="number"
              value={maxDevices}
              onChange={(e) => setMaxDevices(e.target.value)}
              className="h-14 px-4 text-base bg-white/90 border-gray-200 focus:ring-2 focus:ring-halo-600"
            />
          </div>

          {/* Max Users */}
          <div className="space-y-2">
            <Label className="text-base font-bold text-text-main">Maksimum Kullanıcı</Label>
            <Input
              type="number"
              value={maxUsers}
              onChange={(e) => setMaxUsers(e.target.value)}
              className="h-14 px-4 text-base bg-white/90 border-gray-200 focus:ring-2 focus:ring-halo-600"
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
            disabled={saving}
            onClick={handleSave}
            className="h-12 px-8 text-base bg-halo-600 hover:bg-halo-700 text-white shadow-md hover:shadow-halo-600/30 transition-all flex items-center"
          >
            {saving ? "Kaydediliyor..." : "Kaydet"}
            {!saving && <Save className="ml-2 h-5 w-5" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Main Page ---
export default function TenantsPage() {
  const [openAdd, setOpenAdd] = useState(false);
  const [editTenant, setEditTenant] = useState(null);

  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  const [pageParams, setPageParams] = useState({
    page: 1,
    limit: 20,
  });
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  const [filters, setFilters] = useState({
    search: "",
    plan: "",
    active: "",
  });

  // Fetch tenants
  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.append("page", pageParams.page);
      params.append("limit", pageParams.limit);

      if (filters.search) params.append("search", filters.search);
      if (filters.plan && filters.plan !== "all")
        params.append("plan", filters.plan);
      if (filters.active && filters.active !== "all")
        params.append("active", filters.active);

      const res = await fetch(`/api/tenant?${params.toString()}`);
      const responseData = await res.json();

      if (res.ok && responseData.ok) {
        setTenants(responseData.data);
        setMeta({
          total: responseData.pagination.total,
          totalPages: responseData.pagination.totalPages,
        });
      } else {
        toast.error(responseData.error || "Veriler alınamadı");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Sunucuya bağlanılamadı");
    } finally {
      setLoading(false);
    }
  }, [pageParams.page, pageParams.limit, filters]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // Toggle active status
  const handleToggleActive = async (tenant) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tenant/${tenant._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !tenant.isActive }),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        toast.success(
          `Organizasyon ${tenant.isActive ? "deaktif" : "aktif"} edildi.`
        );
        await fetchTenants();
      } else {
        toast.error(data.error || "İşlem başarısız.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // Filter config
  const filterConfig = [
    {
      key: "plan",
      placeholder: "Plan",
      options: [
        { label: "Ücretsiz", value: "FREE" },
        { label: "Profesyonel", value: "PRO" },
        { label: "Kurumsal", value: "ENTERPRISE" },
      ],
    },
    {
      key: "active",
      placeholder: "Durum",
      options: [
        { label: "Aktif", value: "true" },
        { label: "Deaktif", value: "false" },
      ],
    },
  ];

  // Column definitions
  const columns = [
    {
      id: "organization",
      title: "Organizasyon",
      span: 3,
      cellRender: (tenant) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-halo-400 to-halo-600 shadow-sm group-hover:scale-105 transition-transform">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-text-main truncate">
              {tenant.name}
            </p>
            <p className="text-xs text-text-muted truncate">{tenant.slug}</p>
          </div>
        </div>
      ),
    },
    {
      id: "plan",
      title: "Plan",
      span: 2,
      cellRender: (tenant) => (
        <Badge
          variant="outline"
          className={cn(
            "border font-medium",
            planColors[tenant.plan] || "bg-gray-500/10 text-gray-600"
          )}
        >
          {planLabels[tenant.plan] || tenant.plan}
        </Badge>
      ),
    },
    {
      id: "status",
      title: "Durum",
      span: 2,
      cellRender: (tenant) => (
        <div className="flex items-center">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              tenant.isActive
                ? "bg-green-500 animate-pulse"
                : "bg-red-500"
            }`}
          />
          <span className="ml-2 text-sm text-text-main hidden xl:block">
            {tenant.isActive ? "Aktif" : "Deaktif"}
          </span>
        </div>
      ),
    },
    {
      id: "users",
      title: "Kullanıcılar",
      span: 1,
      cellRender: (tenant) => (
        <div className="flex items-center gap-1.5 text-sm text-text-muted">
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span>{tenant._stats?.userCount ?? 0}</span>
        </div>
      ),
    },
    {
      id: "devices",
      title: "Cihazlar",
      span: 2,
      cellRender: (tenant) => (
        <div className="flex items-center gap-1.5 text-sm text-text-muted">
          <Router className="h-3.5 w-3.5 shrink-0" />
          <span>
            {tenant._stats?.deviceCount ?? 0} / {tenant.settings?.maxDevices ?? 100}
          </span>
        </div>
      ),
    },
    {
      id: "createdAt",
      title: "Oluşturulma",
      span: 1,
      cellRender: (tenant) => (
        <span className="text-sm text-text-muted truncate">
          {formatDate(tenant.createdAt)}
        </span>
      ),
    },
  ];

  // Row actions
  const rowActions = [
    {
      label: "Düzenle",
      onClick: (tenant) => {
        setEditTenant(tenant);
      },
      icon: <Edit className="h-4 w-4" />,
    },
    {
      label: (tenant) => (tenant.isActive ? "Deaktif Et" : "Aktif Et"),
      onClick: (tenant) => handleToggleActive(tenant),
      icon: <ToggleLeft className="h-4 w-4" />,
    },
  ];

  const handlePageChange = (newPage) => {
    setPageParams((prev) => ({ ...prev, page: newPage }));
  };

  return (
    <>
      {/* Sayfa Başlığı ve Filtreler */}
      <TableHeader
        title="Kiracılar (Tenant)"
        advert="Platform organizasyonlarını yönetin"
        addButtonName="Yeni Organizasyon"
        onAdd={() => setOpenAdd(true)}
        onRefresh={fetchTenants}
        filterConfig={filterConfig}
        onFilterChange={setFilters}
      />

      {/* Tablo İçeriği */}
      <TableContent
        data={tenants}
        columns={columns}
        gridClassName="grid-cols-12"
        title="Organizasyon Listesi"
        rowActions={rowActions}
        getRowId={(tenant) => tenant._id}
        rowClassName={(tenant) => {
          if (!tenant.isActive) return "opacity-60";
          return "";
        }}
        emptyState={
          <div className="text-center py-12">
            <Building2 className="h-16 w-16 mx-auto text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold">
              Organizasyon Bulunamadı
            </h3>
            <p className="text-gray-500 mt-2">
              {filters.search
                ? "Arama kriterlerinize uygun organizasyon bulunamadı"
                : "Henüz hiç organizasyon eklenmemiş"}
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

      {/* Ekleme Modalı */}
      <TenantAddModal
        open={openAdd}
        onOpenChange={setOpenAdd}
        onSuccess={fetchTenants}
      />

      {/* Düzenleme Modalı */}
      <TenantEditModal
        open={!!editTenant}
        onOpenChange={(open) => !open && setEditTenant(null)}
        tenant={editTenant}
        onSuccess={fetchTenants}
      />
    </>
  );
}
