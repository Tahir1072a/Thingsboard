"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Activity,
  Tag,
  Square,
  CheckCircle2,
  XCircle,
  Globe,
  Lock,
  CheckSquare,
  Trash2,
} from "lucide-react";

import {
  CustomTableHeader,
  CustomTableRow,
} from "../common/table/custom-table";
import DeviceDetailSheet from "./device-detail-sheet";

export default function DeviceTable({ data }) {
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const isAllSelected = data.length > 0 && selectedIds.length === data.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.map((d) => d.id));
    }
  };

  const toggleSelectRow = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]); // Ekle
    }
  };

  const columns = useMemo(
    () => [
      {
        id: "select",
        title: "",
        span: 1,
        headerRender: () => (
          <div
            onClick={toggleSelectAll}
            className="cursor-pointer hover:text-halo-600 transition-colors"
          >
            {isAllSelected ? (
              <CheckSquare className="w-6 h-6 text-halo-600" />
            ) : (
              <Square className="w-6 h-6 text-text-muted" />
            )}
          </div>
        ),
      },
      { id: "info", title: "Cihaz Bilgisi", span: 2 },
      { id: "profile", title: "Cihaz Profil", span: 2 },
      { id: "label", title: "Etiket", span: 2 },
      { id: "status", title: "Durum", span: 1 },
      { id: "customer", title: "Müşteri", span: 2 },
      { id: "public", title: "Public", span: 1, align: "center" },
      { id: "gateway", title: "Ağ Geçidi", span: 1, align: "center" },
      { id: "actions", title: "Eylemler", span: 1, align: "right" },
    ],
    [isAllSelected, data]
  );

  return (
    <>
      <div className="glass overflow-hidden">
        {selectedIds.length > 0 ? (
          <div className="p-6 border-b border-white/20 bg-halo-50/10 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-halo-100/50 text-halo-600">
                  <CheckSquare className="h-4 w-4" />
                </div>
                <span className="font-semibold text-text-main">
                  {selectedIds.length} cihaz seçildi
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log("Silinecek ID'ler:", selectedIds);
                  // TODO: Toplu silme fonksiyonu
                }}
                className="text-red-500 hover:text-red-600 hover:bg-red-50/50 gap-2 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Seçilenleri Sil</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6 border-b border-white/20">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text-main">Cihaz Listesi</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-muted">
                  {data.length} cihaz gösteriliyor
                </span>
              </div>
            </div>
          </div>
        )}

        <CustomTableHeader columns={columns} gridClassName="grid-cols-13" />

        {/* Tablo İçeriği */}
        <div className="divide-y divide-white/10">
          {data.map((device, index) => {
            const isSelected = selectedIds.includes(device.id);
            return (
              <CustomTableRow
                key={device.id}
                index={index}
                gridClassName="grid-cols-13"
                onClick={() => setSelectedDevice(device)}
                className={isSelected ? "bg-halo-50/40" : ""}
              >
                <div
                  className="col-span-1 flex items-center"
                  onClick={(e) => {
                    e.stopPropagation(); // Satırın detay açma olayını engelle
                    toggleSelectRow(device.id);
                  }}
                >
                  {isSelected ? (
                    <CheckSquare className="w-6 h-6 text-halo-600 cursor-pointer" />
                  ) : (
                    <Square className="w-6 h-6 text-text-muted cursor-pointer hover:text-halo-600 transition-colors" />
                  )}
                </div>

                {/* Col 2: Bilgi */}
                <div className="col-span-2 flex items-center gap-3">
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

                {/* Col 3: Profil */}
                <div className="col-span-2 flex items-center">
                  <Badge
                    variant="outline"
                    className="bg-halo-50/50 text-halo-700 border-halo-200 truncate"
                  >
                    {device.profile}
                  </Badge>
                </div>

                {/* Col 4: Etiket */}
                <div className="col-span-2 flex items-center overflow-hidden">
                  {device.label !== "-" ? (
                    <div className="flex items-center gap-1.5 text-sm text-text-muted truncate">
                      <Tag className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{device.label}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-text-muted">-</span>
                  )}
                </div>

                {/* Col 5: Durum */}
                <div className="col-span-1 flex items-center">
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

                {/* Col 6: Müşteri */}
                <div className="col-span-2 flex items-center">
                  <span className="text-sm text-text-muted truncate">
                    Global Teknoloji A.Ş.
                  </span>
                </div>

                {/* Col 7: Public */}
                <div className="col-span-1 flex items-center justify-center">
                  {device.id % 2 === 0 ? (
                    <Globe className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Lock className="h-4 w-4 text-text-muted/50" />
                  )}
                </div>

                {/* Col 8: Gateway */}
                <div className="col-span-1 flex items-center justify-center">
                  {device.isGateway ? (
                    <CheckCircle2 className="h-5 w-5 text-halo-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-300" />
                  )}
                </div>

                {/* Col 9: Eylemler */}
                <div
                  className="col-span-1 flex items-center justify-end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-white/60"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass-strong">
                      <DropdownMenuItem
                        onClick={() => setSelectedDevice(device)}
                      >
                        Detaylar
                      </DropdownMenuItem>
                      <DropdownMenuItem>Düzenle</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        Sil
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CustomTableRow>
            );
          })}
        </div>

        {/* Sayfalama */}
        <div className="flex items-center justify-between border-t border-white/20 px-6 py-4 bg-white/20">
          <div className="text-sm text-text-muted">
            Sayfa başına <strong>10</strong> öğe gösteriliyor
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="glass-hover border-white/60"
              disabled
            >
              Önceki
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="glass-hover border-white/60 bg-gradient-to-r from-halo-600 to-halo-700 text-white border-transparent"
            >
              1
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="glass-hover border-white/60"
            >
              Sonraki
            </Button>
          </div>
        </div>
      </div>

      <DeviceDetailSheet
        open={!!selectedDevice}
        onOpenChange={(open) => !open && setSelectedDevice(null)}
        device={selectedDevice}
      />
    </>
  );
}
