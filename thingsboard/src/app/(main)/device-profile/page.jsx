"use client";

import {
  TableHeader,
  TableContent,
} from "@/components/common/table/table-header";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import {
  BoxSelect,
  Link2,
  CheckCircle2,
  Activity,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";
// Modal importunu aşağıda oluşturacağımız dosyaya göre yapıyoruz
import AddDevicePorfileModal from "@/components/profiles/device-profile-modal";
import { fetchClient } from "@/lib/api-client";

export default function DeviceProfilesPage() {
  const [openForm, setOpenForm] = useState(false);
  const [selectedDeviceProfile, setSelectedDeviceProfile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [deviceProfiles, setDeviceProfiles] = useState([]);

  // --- State Yönetimi ---
  const [pageParams, setPageParams] = useState({ page: 1, limit: 10 });
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ search: "", transportType: "" });

  // --- Veri Çekme ---
  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.append("page", pageParams.page);
      params.append("limit", pageParams.limit);

      if (filters.search) params.append("search", filters.search);
      if (filters.transportType)
        params.append("transportType", filters.transportType);

      const responseData = await fetchClient(
        `/api/device-profile?${params.toString()}`
      );

      setDeviceProfiles(responseData.data);
      setMeta({
        total: responseData.pagination.total,
        totalPages: responseData.pagination.totalPages,
      });
    } catch (error) {
      console.error("Fetch error:", error);

      toast.error(error.message || "Veriler alınırken hata oluştu");
    } finally {
      setLoading(false);
    }
  }, [pageParams.page, pageParams.limit, filters]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // --- Handlerlar ---
  const handlePageChange = (newPage) => {
    setPageParams((prev) => ({ ...prev, page: newPage }));
  };

  const handleFilterChange = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPageParams((prev) => ({ ...prev, page: 1 })); // Filtre değişince başa dön
  };

  // --- Konfigürasyon ---
  const filterConfig = [
    {
      key: "transportType", // Typo düzeltildi
      placeholder: "İletişim Tipi",
      options: [
        { label: "MQTT", value: "MQTT" },
        { label: "HTTP", value: "HTTP" },
        { label: "COAP", value: "COAP" },
      ],
    },
  ];

  const columns = [
    {
      id: "info",
      title: "Profil Bilgisi",
      span: 2,
      cellRender: (profile) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 text-white shadow-md">
            <BoxSelect className="h-5 w-5" />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-text-main truncate">
              {profile.name}
            </p>
            <p className="text-xs text-text-muted">
              ID: {profile._id?.slice(-6).toUpperCase()}
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
      id: "ruleChain",
      title: "Kural Zinciri",
      span: 3,
      cellRender: (profile) => (
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Link2 className="h-4 w-4" />
          <span>{profile.ruleChainName || "Varsayılan Zincir"}</span>
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
      label: "Düzenle",
      onClick: (deviceProfile) => {
        console.log("Düzenle:", device);
        // TODO: Düzenleme modalı aç
      },
      icon: <Edit className="h-4 w-4" />,
    },
    {
      label: "Sil",
      onClick: async (deviceProfile) => console.log(deviceProfile),
      icon: <Trash2 className="h-4 w-4" />,
      className: "text-red-600",
    },
  ];

  return (
    <>
      <TableHeader
        title="Cihaz Profilleri"
        advert="IoT Cihazlarının davranışlarını ve kurallarını yönetin"
        addButtonName="Yeni Profil Ekle"
        onAdd={() => setOpenForm(true)}
        filterConfig={filterConfig}
        onFilterChange={handleFilterChange}
        onRefresh={fetchProfiles}
      />
      <TableContent
        data={deviceProfiles}
        columns={columns}
        gridClassName="grid-cols-13"
        title="Cihaz Profili Listesi"
        rowActions={rowActions}
        onRowClick={setSelectedDeviceProfile}
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
                  ? "Arama kriterlerinize uygun cihaz bulunamadı"
                  : "Henüz hiç cihaz profili eklenmemiş"}
              </p>
            </div>
          )
        }
        pagination={{
          currentPage: pageParams.page,
          totalPages: meta.totalPages,
          itemsPerPage: pageParams.limit,
          onPageChange: handlePageChange,
        }}
      />

      <AddDevicePorfileModal
        open={openForm}
        onOpenChange={(val) => {
          setOpenForm(val);
          if (!val) fetchProfiles(); // Modal kapandığında listeyi yenile
        }}
      />
    </>
  );
}
