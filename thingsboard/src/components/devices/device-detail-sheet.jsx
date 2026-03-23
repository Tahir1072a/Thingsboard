"use client";
import { useState, useMemo } from "react";
import {
  Activity,
  Settings,
  Tag,
  Database,
  AlertTriangle,
} from "lucide-react";

import CommonEntitySheet from "../common/rowDetails/common-entity-sheet";
import EntityActionBar from "../common/rowDetails/entity-action-bar";
import { DeviceDetailForm, DeviceEditForm } from "./device-details-form";

// Mock Tablarımızı import ediyoruz
import { DeviceAlarmsTab } from "./mock";
import { DeviceAttributeTab } from "./tabs/device-attribute-tab";
import { DeviceTelemetryTab } from "./tabs/device-telemetri-tab";

// TODO: Telemetri sayfası yapılacak!

export default function DeviceDetailSheet({ device, open, onOpenChange, onDeviceDeleted }) {
  const [isEditing, setIsEditing] = useState(false);
  const [hasCustomer, setHasCustomer] = useState(true);

  const handleSave = () => {
    console.log("Kaydetme işlemi yapılıyor...");
    setIsEditing(false);
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
              <DeviceEditForm data={device} />
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
        content: <DeviceAttributeTab />, // Mock Bileşen
      },
      {
        id: "telemetry",
        label: "Telemetri",
        icon: Database,
        content: <DeviceTelemetryTab />, // Mock Bileşen
      },
      {
        id: "alarms",
        label: "Alarmlar",
        icon: AlertTriangle,
        content: <DeviceAlarmsTab />, // Mock Bileşen
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
