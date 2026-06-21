"use client";

/**
 * /device-profile — Cihaz Profili Listesi
 */

import {
  TableHeader,
  TableContent,
} from "@/components/common/table/table-header";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import {
  BoxSelect,
  CheckCircle2,
  Activity,
  Edit,
  Trash2,
  BellRing,
} from "lucide-react";
import AddDevicePorfileModal from "@/components/profiles/device-profile-modal";
import DeviceProfileDetailSheet from "@/components/device-profiles/device-profile-detail-sheet";
import { useConfirm } from "@/components/common/confirm-modal";

export default function DeviceProfilesPage() {
  const [openForm, setOpenForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [deviceProfiles, setDeviceProfiles] = useState([]);
  const [pageParams, setPageParams] = useState({ page: 1, limit: 10 });
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ search: "", transportType: "" });
  const { confirm, ConfirmDialog } = useConfirm();

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", pageParams.page);
      params.append("limit", pageParams.limit);
      if (filters.search) params.append("search", filters.search);
      if (filters.transportType)
        params.append("transportType", filters.transportType);

      const res = await fetch(`/api/device-profile?${params.toString()}`);
      const responseData = await res.json();

      if (responseData.ok) {
        setDeviceProfiles(responseData.data);
        setMeta({
          total: responseData.pagination.total,
          totalPages: responseData.pagination.totalPages,
        });
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Veriler alınırken hata oluştu");
    } finally {
      setLoading(false);
    }
  }, [pageParams.page, pageParams.limit, filters]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleDelete = async (profile) => {
    if (!(await confirm({ title: "Profili Sil", message: `"${profile.name}" profilini silmek istediğinize emin misiniz?`, danger: true })))
      return;
    try {
      const res = await fetch(`/api/device-profile/${profile._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`"${profile.name}" silindi.`);
        fetchProfiles();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Silme hatası.");
    }
  };

  const filterConfig = [
    {
      key: "transportType",
      placeholder: "İletişim Tipi",
      options: [
        { label: "MQTT", value: "MQTT" },
        { label: "MQTTS (TLS)", value: "MQTTS" },
        { label: "HTTP", value: "HTTP" },
        { label: "WebSocket", value: "WS" },
        { label: "WSS (Secure)", value: "WSS" },
      ],
    },
  ];

  const columns = [
    {
      id: "info",
      title: "Profil Bilgisi",
      span: 3,
      cellRender: (profile) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 text-white shadow-md">
            <BoxSelect className="h-5 w-5" />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-text-main truncate">
              {profile.name}
            </p>
            <p className="text-xs text-text-muted truncate">
              {profile.description || "Açıklama yok"}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "transportType",
      title: "İletişim Tipi",
      span: 2,
      cellRender: (profile) => (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-200 uppercase font-mono"
        >
          {profile.transportType || "DEFAULT"}
        </Badge>
      ),
    },
    {
      id: "alarms",
      title: "Alarm Kuralları",
      span: 2,
      cellRender: (profile) => (
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <BellRing className="h-4 w-4" />
          <span>{profile.alarms?.length || 0} kural</span>
        </div>
      ),
    },
    {
      id: "description",
      title: "Açıklama",
      span: 3,
      cellRender: (profile) => (
        <span className="text-sm text-text-muted truncate block max-w-[200px]">
          {profile.description || "-"}
        </span>
      ),
    },
    {
      id: "isDefault",
      title: "Varsayılan",
      span: 1,
      align: "center",
      cellRender: (profile) =>
        profile.isDefault ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : null,
    },
  ];

  const rowActions = [
    {
      label: "Sil",
      onClick: (profile) => handleDelete(profile),
      icon: <Trash2 className="h-4 w-4" />,
      className: "text-red-600",
    },
  ];

  return (
    <>
      <TableHeader
        title="Cihaz Profilleri"
        advert="Cihaz davranışlarını ve alarm kurallarını yönetin"
        addButtonName="Yeni Profil Ekle"
        onAdd={() => setOpenForm(true)}
        filterConfig={filterConfig}
        onFilterChange={(newFilters) => {
          setFilters((prev) => ({ ...prev, ...newFilters }));
          setPageParams((prev) => ({ ...prev, page: 1 }));
        }}
        onRefresh={fetchProfiles}
      />
      <TableContent
        data={deviceProfiles}
        loading={loading}
        columns={columns}
        gridClassName="grid-cols-13"
        title="Cihaz Profili Listesi"
        onRowClick={setSelectedProfile}
        rowActions={rowActions}
        getRowId={(p) => p._id}
        emptyState={
          loading ? (
            <div className="text-center py-12">Yükleniyor...</div>
          ) : (
            <div className="text-center py-12">
              <Activity className="h-16 w-16 mx-auto text-gray-300" />
              <h3 className="mt-4 text-lg font-semibold">Profil Bulunamadı</h3>
              <p className="text-gray-500 mt-2">
                {filters.search
                  ? "Arama kriterlerinize uygun profil bulunamadı"
                  : "Henüz hiç cihaz profili eklenmemiş"}
              </p>
            </div>
          )
        }
        pagination={{
          currentPage: pageParams.page,
          totalPages: meta.totalPages,
          itemsPerPage: pageParams.limit,
          onPageChange: (p) => setPageParams((prev) => ({ ...prev, page: p })),
        }}
      />

      {/* Detay Sheet */}
      <DeviceProfileDetailSheet
        open={!!selectedProfile}
        onOpenChange={(open) => !open && setSelectedProfile(null)}
        profile={selectedProfile}
        onProfileUpdated={(updatedProfile) => {
          setSelectedProfile(updatedProfile);
          setDeviceProfiles((prev) =>
            prev.map((p) => (p._id === updatedProfile._id ? updatedProfile : p))
          );
        }}
        onProfileDeleted={(id) => {
          setSelectedProfile(null);
          setDeviceProfiles((prev) => prev.filter((p) => p._id !== id));
        }}
      />

      <AddDevicePorfileModal
        open={openForm}
        onOpenChange={(val) => {
          setOpenForm(val);
          if (!val) fetchProfiles();
        }}
      />

      <ConfirmDialog />
    </>
  );
}
