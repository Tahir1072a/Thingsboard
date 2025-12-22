"use client";

import { useState } from "react";
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

// Mock data
const devicesData = [
  {
    id: 1,
    name: "Sensor A-101",
    createdAt: "2024-01-15",
    profile: "Temperature Sensor",
    label: "Warehouse-1",
    status: "active",
    isGateway: true,
  },
  {
    id: 2,
    name: "Sensor B-202",
    createdAt: "2024-01-20",
    profile: "Humidity Sensor",
    label: "-",
    status: "inactive",
    isGateway: false,
  },
  // ... daha fazla cihaz
];

export default function DevicesPage() {
  const [openForm, setOpenForm] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [filters, setFilters] = useState({});

  // Filtreleme mantığı
  const filteredData = devicesData.filter((device) => {
    // Search filtresi
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        device.name.toLowerCase().includes(searchLower) ||
        device.profile.toLowerCase().includes(searchLower) ||
        device.label.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Status filtresi
    if (filters.status && filters.status !== "all") {
      if (device.status !== filters.status) return false;
    }

    // Diğer filtreler...

    return true;
  });

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
        device.label !== "-" ? (
          <div className="flex items-center gap-1.5 text-sm text-text-muted truncate">
            <Tag className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{device.label}</span>
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
      label: "Detaylar",
      onClick: (device) => setSelectedDevice(device),
      icon: <Eye className="h-4 w-4" />,
    },
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
      onClick: (device) => {
        if (
          confirm(`${device.name} cihazını silmek istediğinizden emin misiniz?`)
        ) {
          console.log("Sil:", device);
          // TODO: Silme işlemi
        }
      },
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

  return (
    <>
      {/* Sayfa Başlığı ve Filtreler */}
      <TableHeader
        title="Cihazlar"
        advert="IoT cihazlarınızı tek bir yerden yönetin"
        addButtonName="Yeni Cihaz Ekle"
        onAdd={() => setOpenForm(true)}
        filterConfig={filterConfig}
        onFilterChange={setFilters}
      />

      {/* Tablo İçeriği */}
      <TableContent
        data={filteredData}
        columns={columns}
        gridClassName="grid-cols-13"
        title="Cihaz Listesi"
        onRowClick={setSelectedDevice}
        rowActions={rowActions}
        bulkActions={bulkActions}
        getRowId={(device) => device.id}
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
          currentPage: 1,
          totalPages: Math.ceil(filteredData.length / 10),
          itemsPerPage: 10,
          onPageChange: (page) => console.log("Sayfa:", page),
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
