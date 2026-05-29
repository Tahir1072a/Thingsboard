"use client";
import { useState, useMemo } from "react";
import {
  Activity,
  Settings,
  Tag,
  Database,
  AlertTriangle,
  Link2,
} from "lucide-react";

import CommonEntitySheet from "../common/rowDetails/common-entity-sheet";
import EntityActionBar from "../common/rowDetails/entity-action-bar";
import { DeviceDetailForm, DeviceEditForm } from "./device-details-form";

// Mock Tablarımızı import ediyoruz
import { DeviceAlarmsTab } from "./mock";
import { DeviceAttributeTab } from "./tabs/device-attribute-tab";
import { DeviceTelemetryTab } from "./tabs/device-telemetri-tab";
import { DeviceConnectivityTab } from "./tabs/device-connectivity-tab";

// TODO: Telemetri sayfası yapılacak!

export default function DeviceDetailSheet({ device, open, onOpenChange, onDeviceDeleted, onDeviceUpdated }) {
  const [isEditing, setIsEditing] = useState(false);
  const [hasCustomer, setHasCustomer] = useState(true);

  const handleSave = async (formData) => {
    try {
      const response = await fetch(`/api/device/${device._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.ok) {
        import("react-hot-toast").then((module) => {
          module.default.success("Cihaz başarıyla güncellendi.");
        });
        setIsEditing(false);
        if (onDeviceUpdated) {
          onDeviceUpdated(result.data);
        }
      } else {
        import("react-hot-toast").then((module) => {
          module.default.error(result.message || "Güncelleme başarısız.");
        });
      }
    } catch (error) {
      console.error("Update error:", error);
      import("react-hot-toast").then((module) => {
        module.default.error("Sunucuya bağlanırken bir hata oluştu.");
      });
    }
  };

  // --- 2. TAB YAPILANDIRMASI (Configuration) ---
  const tabConfiguration = useMemo(
    () => [
      {
        id: "details",
        label: "Ayrıntılar",
        icon: Settings,
        content: (
          <div className="space-y-6">
            {isEditing ? (
              <DeviceEditForm data={device} onSave={handleSave} />
            ) : (
              <DeviceDetailForm data={device} onDeviceDeleted={onDeviceDeleted} />
            )}
          </div>
        ),
      },
      {
        id: "attributes",
        label: "Öznitelikler",
        icon: Tag,
        content: <DeviceAttributeTab deviceId={device?._id} />, // Mock Bileşen
      },
      {
        id: "telemetry",
        label: "Telemetri",
        icon: Database,
        content: <DeviceTelemetryTab deviceId={device?._id} />, // Mock Bileşen
      },
      {
        id: "alarms",
        label: "Alarmlar",
        icon: AlertTriangle,
        content: <DeviceAlarmsTab deviceId={device?._id} />, // Mock Bileşen
      },
      {
        id: "connectivity",
        label: "Bağlantı Rehberi",
        icon: Link2,
        content: <DeviceConnectivityTab device={device} />, // Yeni Sekme
      },
      // Olaylar, İlişkiler vb. eklenecek.
    ],
    [device, isEditing, hasCustomer]
  );

  if (!device) return null;

  return (
    <CommonEntitySheet
      open={open}
      onOpenChange={onOpenChange}
      title={device.name}
      subtitle={
        <span className="font-mono text-xs bg-white/20 px-2 py-1 rounded">
          Cihaz Ayrıntıları
        </span>
      }
      icon={Activity}
      isEditing={isEditing}
      onEditToggle={() => setIsEditing(!isEditing)}
      tabs={tabConfiguration}
    />
  );
}
