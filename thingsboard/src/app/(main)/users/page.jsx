"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Trash2,
  Edit,
  ToggleLeft,
  ToggleRight,
  Mail,
  ShieldCheck,
  Eye,
  UserPlus,
  Save,
  AlertCircle,
} from "lucide-react";
import UserInviteModal from "@/components/users/user-invite-modal";
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
const roleLabels = { TENANT_ADMIN: "Yönetici", OPERATOR: "Operatör", VIEWER: "İzleyici" };
const roleColors = {
  TENANT_ADMIN: "bg-purple-500/10 text-purple-600",
  OPERATOR: "bg-blue-500/10 text-blue-600",
  VIEWER: "bg-gray-500/10 text-gray-600",
};
const providerLabels = {
  credentials: "E-posta",
  google: "Google",
  invite: "Davet",
};

function getInitials(firstName, lastName) {
  return `${(firstName || "")[0] || ""}${(lastName || "")[0] || ""}`.toUpperCase();
}

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
  if (days < 30) return `${days} gün önce`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ay önce`;
  const years = Math.floor(months / 12);
  return `${years} yıl önce`;
}

// --- User Edit Modal ---
function UserEditModal({ open, onOpenChange, user, onSuccess }) {
  const [role, setRole] = useState(user?.role || "OPERATOR");
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setRole(user.role || "OPERATOR");
      setIsActive(user.isActive ?? true);
    }
  }, [user]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/user/${user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, isActive }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success("Kullanıcı güncellendi.");
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast.error(data.message || "Güncelleme başarısız.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-lg p-0 overflow-hidden border-white/20 max-h-[90vh] flex flex-col">
        <DialogHeader className="bg-halo-50/50 px-6 py-5 animate-fade-in shrink-0">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold text-text-main">
            <div className="p-2 bg-halo-100 rounded-lg">
              <Edit className="h-6 w-6 text-halo-600" />
            </div>
            Kullanıcıyı Düzenle
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Read-only info */}
          <div className="space-y-2">
            <Label className="text-base font-bold text-text-main">E-posta</Label>
            <Input
              readOnly
              value={user.email}
              className="h-14 px-4 text-base text-black bg-gray-100 border-gray-200 cursor-not-allowed"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-base font-bold text-text-main">Ad Soyad</Label>
            <Input
              readOnly
              value={`${user.firstName || ""} ${user.lastName || ""}`.trim()}
              className="h-14 px-4 text-base text-black bg-gray-100 border-gray-200 cursor-not-allowed"
            />
          </div>

          {/* Editable role */}
          <div className="space-y-2">
            <Label className="text-base font-bold text-text-main">Rol</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-14 w-full px-4 text-base bg-white/90 border-gray-200 focus:ring-2 focus:ring-halo-600 cursor-pointer">
                <SelectValue placeholder="Rol seçiniz" />
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-xl border-gray-200 shadow-xl">
                <SelectItem value="TENANT_ADMIN" className="py-3 cursor-pointer focus:bg-halo-50">Yönetici</SelectItem>
                <SelectItem value="OPERATOR" className="py-3 cursor-pointer focus:bg-halo-50">Operatör</SelectItem>
                <SelectItem value="VIEWER" className="py-3 cursor-pointer focus:bg-halo-50">İzleyici</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Editable active status */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 border border-gray-200">
            <div>
              <Label className="text-base font-bold text-text-main">Aktif Durum</Label>
              <p className="text-sm text-text-muted mt-0.5">
                Kullanıcı sisteme giriş yapabilir mi?
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
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
export default function UsersPage() {
  const [openInvite, setOpenInvite] = useState(false);
  const [editUser, setEditUser] = useState(null);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [pageParams, setPageParams] = useState({
    page: 1,
    limit: 20,
  });
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  const [filters, setFilters] = useState({
    search: "",
    role: "",
    active: "",
  });

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.append("page", pageParams.page);
      params.append("limit", pageParams.limit);

      if (filters.search) params.append("search", filters.search);
      if (filters.role && filters.role !== "all")
        params.append("role", filters.role);
      if (filters.active && filters.active !== "all")
        params.append("active", filters.active);

      const res = await fetch(`/api/user?${params.toString()}`);
      const responseData = await res.json();

      if (res.ok && responseData.ok) {
        setUsers(responseData.data);
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
    fetchUsers();
  }, [fetchUsers]);

  // Toggle active status
  const handleToggleActive = async (user) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/user/${user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        toast.success(
          `Kullanıcı ${user.isActive ? "deaktif" : "aktif"} edildi.`
        );
        await fetchUsers();
      } else {
        toast.error(data.message || "İşlem başarısız.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (user) => {
    const confirmed = confirm(
      `${user.firstName} ${user.lastName} kullanıcısını silmek istediğinizden emin misiniz?`
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/user/${user._id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        toast.success(`"${user.firstName} ${user.lastName}" başarıyla silindi.`);
        await fetchUsers();
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

  // Filter config
  const filterConfig = [
    {
      key: "role",
      placeholder: "Rol",
      options: [
        { label: "Yönetici", value: "TENANT_ADMIN" },
        { label: "Operatör", value: "OPERATOR" },
        { label: "İzleyici", value: "VIEWER" },
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
      id: "user",
      title: "Kullanıcı",
      span: 3,
      cellRender: (user) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-halo-400 to-halo-600 shadow-sm group-hover:scale-105 transition-transform overflow-hidden">
            {user.image ? (
              <img
                src={user.image}
                alt={`${user.firstName} ${user.lastName}`}
                className="h-full w-full object-cover rounded-full"
              />
            ) : (
              <span className="text-xs font-bold text-white">
                {getInitials(user.firstName, user.lastName)}
              </span>
            )}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-text-main truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-text-muted truncate">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: "role",
      title: "Rol",
      span: 2,
      cellRender: (user) => (
        <Badge
          variant="outline"
          className={cn(
            "border-transparent font-medium",
            roleColors[user.role] || "bg-gray-500/10 text-gray-600"
          )}
        >
          {roleLabels[user.role] || user.role}
        </Badge>
      ),
    },
    {
      id: "status",
      title: "Durum",
      span: 1,
      cellRender: (user) => (
        <div className="flex items-center">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              user.isActive
                ? "bg-green-500 animate-pulse"
                : "bg-red-500"
            }`}
          />
          <span className="ml-2 text-sm text-text-main hidden xl:block">
            {user.isActive ? "Aktif" : "Deaktif"}
          </span>
        </div>
      ),
    },
    {
      id: "provider",
      title: "Sağlayıcı",
      span: 2,
      cellRender: (user) => (
        <div className="flex items-center gap-1.5 text-sm text-text-muted">
          <Mail className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {providerLabels[user.provider] || user.provider || "—"}
          </span>
        </div>
      ),
    },
    {
      id: "lastLogin",
      title: "Son Giriş",
      span: 2,
      cellRender: (user) => (
        <span className="text-sm text-text-muted truncate">
          {timeAgo(user.lastLoginAt)}
        </span>
      ),
    },
  ];

  // Row actions
  const rowActions = [
    {
      label: "Düzenle",
      onClick: (user) => {
        setEditUser(user);
      },
      icon: <Edit className="h-4 w-4" />,
    },
    {
      label: (user) => (user.isActive ? "Deaktif Et" : "Aktif Et"),
      onClick: (user) => handleToggleActive(user),
      icon: <ToggleLeft className="h-4 w-4" />,
    },
    {
      label: "Sil",
      onClick: async (user) => handleDeleteUser(user),
      icon: <Trash2 className="h-4 w-4" />,
      className: "text-red-600",
    },
  ];

  // Bulk delete
  const handleBulkDelete = async (selectedIds) => {
    const count = selectedIds.length;
    if (!confirm(`${count} kullanıcıyı silmek istediğinizden emin misiniz?`))
      return;

    try {
      setLoading(true);
      let successCount = 0;
      let failCount = 0;

      for (const id of selectedIds) {
        try {
          const res = await fetch(`/api/user/${id}`, { method: "DELETE" });
          const data = await res.json();
          if (res.ok && data.ok) successCount++;
          else failCount++;
        } catch {
          failCount++;
        }
      }

      if (successCount > 0)
        toast.success(`${successCount} kullanıcı başarıyla silindi.`);
      if (failCount > 0)
        toast.error(`${failCount} kullanıcı silinemedi.`);

      await fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error("Toplu silme sırasında hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

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
        title="Kullanıcılar"
        advert="Sistem kullanıcılarını yönetin ve davet edin"
        addButtonName="Kullanıcı Davet Et"
        onAdd={() => setOpenInvite(true)}
        onRefresh={fetchUsers}
        filterConfig={filterConfig}
        onFilterChange={setFilters}
      />

      {/* Tablo İçeriği */}
      <TableContent
        data={users}
        columns={columns}
        gridClassName="grid-cols-12"
        title="Kullanıcı Listesi"
        rowActions={rowActions}
        bulkActions={bulkActions}
        getRowId={(user) => user._id}
        rowClassName={(user) => {
          if (!user.isActive) return "opacity-60";
          return "";
        }}
        emptyState={
          <div className="text-center py-12">
            <Users className="h-16 w-16 mx-auto text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold">
              Kullanıcı Bulunamadı
            </h3>
            <p className="text-gray-500 mt-2">
              {filters.search
                ? "Arama kriterlerinize uygun kullanıcı bulunamadı"
                : "Henüz hiç kullanıcı eklenmemiş"}
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

      {/* Davet Modalı */}
      <UserInviteModal
        open={openInvite}
        onOpenChange={setOpenInvite}
        onSuccess={fetchUsers}
      />

      {/* Düzenleme Modalı */}
      <UserEditModal
        open={!!editUser}
        onOpenChange={(open) => !open && setEditUser(null)}
        user={editUser}
        onSuccess={fetchUsers}
      />
    </>
  );
}
