"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Tag,
  Globe,
  Lock,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit,
  Eye,
} from "lucide-react";
import AddDeviceModal from "@/components/devices/deviceAddForm";
import DeviceDetailSheet from "@/components/devices/device-detail-sheet";
import {
  TableContent,
  TableHeader,
} from "@/components/common/table/table-header";
import toast from "react-hot-toast";
import { fetchClient } from "@/lib/api-client";

export default function DevicesPage() {
  const [openForm, setOpenForm] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Device servisten device verilerini çekecektir.
  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const params = new URLSearchParams();
      params.append("page", pageParams.page);
      params.append("limit", pageParams.limit);

      if (filters.search) params.append("search", filters.search);
      if (filters.status && filters.status !== "all")
        params.append("active", filters.status === "active");

      const res = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_GATEWAY_URL
        }/api/device?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const responseData = await res.json();
      console.log(responseData);
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
    const confirmed = confirm(
      `${device.name} cihazını silmek istediğinden emin misiniz?`
    );
    if (!confirmed) return;

    try {
      setLoading(true);

      const res = await fetchClient(`/api/device/${device._id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success(res.message || "Cihaz silindi");

        await fetchDevices();
      } else {
        toast.error(res.message || "Silme işlemi başarısız.");
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
              {device.createdAt}
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
          {device.profile}
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
      id: "customer",
      title: "Müşteri",
      span: 2,
      cellRender: () => (
        <span className="text-sm text-text-muted truncate">
          Global Teknoloji A.Ş.
        </span>
      ),
    },
    {
      id: "public",
      title: "Public",
      span: 1,
      align: "center",
      cellRender: (device) =>
        device.id % 2 === 0 ? (
          <Globe className="h-4 w-4 text-blue-500" />
        ) : (
          <Lock className="h-4 w-4 text-text-muted/50" />
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
      label: "Düzenle",
      onClick: (device) => {
        console.log("Düzenle:", device);
        // TODO: Düzenleme modalı aç
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

  // Toplu eylemler
  const bulkActions = [
    {
      label: "Seçilenleri Sil",
      onClick: (selectedDevices) => {
        if (
          confirm(
            `${selectedDevices.length} cihazı silmek istediğinizden emin misiniz?`
          )
        ) {
          console.log("Silinecek cihazlar:", selectedDevices);
          // TODO: Toplu silme işlemi
        }
      },
      icon: <Trash2 className="h-4 w-4" />,
      danger: true, // variant yerine danger kullanıyoruz
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
        columns={columns}
        gridClassName="grid-cols-13"
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
      />

      {/* Ekleme Modalı */}
      <AddDeviceModal open={openForm} onOpenChange={setOpenForm} />
    </>
  );
}
