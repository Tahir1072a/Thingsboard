"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Tag,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit,
  Eye,
} from "lucide-react";
import AddDeviceModal from "@/components/devices/deviceAddForm";
import DeviceEditModal from "@/components/devices/deviceEditModal";
import DeviceDetailSheet from "@/components/devices/device-detail-sheet";
import {
  TableContent,
  TableHeader,
} from "@/components/common/table/table-header";
import toast from "react-hot-toast";
import { useConfirm } from "@/components/common/confirm-modal";

export default function DevicesPage() {
  const router = useRouter();
  const [openForm, setOpenForm] = useState(false);
  const [editDevice, setEditDevice] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const { confirm, ConfirmDialog } = useConfirm();

  const [pageParams, setPageParams] = useState({
    page: 1,
    limit: 10,
  });
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    isGateway: "",
  });

  // Device API'den verileri çek
  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.append("page", pageParams.page);
      params.append("limit", pageParams.limit);

      if (filters.search) params.append("search", filters.search);
      if (filters.status && filters.status !== "all")
        params.append("active", filters.status === "active");

      const res = await fetch(`/api/device?${params.toString()}`);
      const responseData = await res.json();

      if (res.ok && responseData.ok) {
        setDevices(responseData.data);
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
    fetchDevices();
  }, [fetchDevices]);

  const handleDeleteDevice = async (device) => {
    const confirmed = await confirm({
      title: "Cihazı Sil",
      message: `${device.name} cihazını silmek istediğinden emin misiniz?`,
      danger: true,
    });
    if (!confirmed) return;

    try {
      setLoading(true);

      const res = await fetch(`/api/device/${device._id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        toast.success(`"${device.name}" başarıyla silindi.`);
        await fetchDevices();
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

  // Filtre konfigürasyonu
  const filterConfig = [
    {
      key: "status",
      placeholder: "Durum",
      options: [
        { label: "Aktif", value: "active" },
        { label: "Pasif", value: "inactive" },
      ],
    },
    {
      key: "isGateway",
      placeholder: "Gateway",
      options: [
        { label: "Gateway", value: "true" },
        { label: "Gateway Değil", value: "false" },
      ],
    },
  ];

  // Kolon tanımları
  const columns = [
    {
      id: "info",
      title: "Cihaz Bilgisi",
      span: 2,
      cellRender: (device) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-halo-400 to-halo-600 shadow-sm group-hover:scale-105 transition-transform">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-text-main truncate">
              {device.name}
            </p>
            <p className="text-xs text-text-muted truncate">
              {new Date(device.createdAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "profile",
      title: "Cihaz Profil",
      span: 2,
      cellRender: (device) => (
        <Badge
          variant="outline"
          className="bg-halo-50/50 text-halo-700 border-halo-200 truncate"
        >
          {device.profile?.name || "Belirtilmemiş"}
        </Badge>
      ),
    },
    {
      id: "label",
      title: "Etiket",
      span: 2,
      cellRender: (device) =>
        device.tag !== "-" ? (
          <div className="flex items-center gap-1.5 text-sm text-text-muted truncate">
            <Tag className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{device.tag}</span>
          </div>
        ) : (
          <span className="text-sm text-text-muted">-</span>
        ),
    },
    {
      id: "status",
      title: "Durum",
      span: 1,
      cellRender: (device) => (
        <div className="flex items-center">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              device.status === "active"
                ? "bg-green-500 animate-pulse"
                : "bg-orange-500"
            }`}
          />
          <span className="ml-2 text-sm text-text-main hidden xl:block">
            {device.status === "active" ? "Aktif" : "Pasif"}
          </span>
        </div>
      ),
    },
    {
      id: "gateway",
      title: "Ağ Geçidi",
      span: 1,
      align: "center",
      cellRender: (device) =>
        device.isGateway ? (
          <CheckCircle2 className="h-5 w-5 text-halo-600" />
        ) : (
          <XCircle className="h-5 w-5 text-gray-300" />
        ),
    },
  ];

  // Satır eylemleri
  const rowActions = [
    {
      label: "Detay",
      onClick: (device) => {
        router.push(`/devices/${device._id}`);
      },
      icon: <Eye className="h-4 w-4" />,
    },
    {
      label: "Düzenle",
      onClick: (device) => {
        setEditDevice(device);
      },
      icon: <Edit className="h-4 w-4" />,
    },
    {
      label: "Sil",
      onClick: async (device) => handleDeleteDevice(device),
      icon: <Trash2 className="h-4 w-4" />,
      className: "text-red-600",
    },
  ];

  // Toplu silme işlemi
  const handleBulkDelete = async (selectedIds) => {
    const count = selectedIds.length;
    if (!(await confirm({ title: "Toplu Silme", message: `${count} cihazı silmek istediğinizden emin misiniz?`, danger: true }))) return;

    try {
      setLoading(true);
      const results = await Promise.all(
        selectedIds.map(async (id) => {
          try {
            const res = await fetch(`/api/device/${id}`, { method: "DELETE" });
            const data = await res.json();
            return res.ok && data.ok ? "success" : "fail";
          } catch { return "fail"; }
        })
      );
      const successCount = results.filter(r => r === "success").length;
      const failCount = results.filter(r => r === "fail").length;

      if (successCount > 0) toast.success(`${successCount} cihaz başarıyla silindi.`);
      if (failCount > 0) toast.error(`${failCount} cihaz silinemedi.`);

      await fetchDevices();
    } catch (err) {
      console.error(err);
      toast.error("Toplu silme sırasında hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // Toplu eylemler
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
        title="Cihazlar"
        advert="IoT cihazlarınızı tek bir yerden yönetin"
        addButtonName="Yeni Cihaz Ekle"
        onAdd={() => setOpenForm(true)}
        onRefresh={fetchDevices}
        filterConfig={filterConfig}
        onFilterChange={setFilters}
      />

      {/* Tablo İçeriği */}
      <TableContent
        data={devices}
        loading={loading}
        columns={columns}
        gridClassName="grid-cols-10"
        title="Cihaz Listesi"
        onRowClick={setSelectedDevice}
        rowActions={rowActions}
        bulkActions={bulkActions}
        getRowId={(device) => device._id}
        rowClassName={(device) => {
          // Pasif cihazları soluklaştır
          if (device.status === "inactive") return "opacity-60";
          return "";
        }}
        emptyState={
          <div className="text-center py-12">
            <Activity className="h-16 w-16 mx-auto text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold">Cihaz Bulunamadı</h3>
            <p className="text-gray-500 mt-2">
              {filters.search
                ? "Arama kriterlerinize uygun cihaz bulunamadı"
                : "Henüz hiç cihaz eklenmemiş"}
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

      {/* Detay Sheet */}
      {/* TODO: Burası genelleştirilecek!!! */}
      <DeviceDetailSheet
        open={!!selectedDevice}
        onOpenChange={(open) => !open && setSelectedDevice(null)}
        device={selectedDevice}
        onDeviceDeleted={() => {
          setSelectedDevice(null);
          fetchDevices();
        }}
        onDeviceUpdated={(updatedDevice) => {
          setSelectedDevice(updatedDevice);
          fetchDevices();
        }}
      />

      {/* Ekleme Modalı */}
      <AddDeviceModal open={openForm} onOpenChange={setOpenForm} onDeviceAdded={fetchDevices} />

      {/* Düzenleme Modalı */}
      <DeviceEditModal
        open={!!editDevice}
        onOpenChange={(open) => !open && setEditDevice(null)}
        device={editDevice}
        onDeviceUpdated={fetchDevices}
      />

      <ConfirmDialog />
    </>
  );
}
