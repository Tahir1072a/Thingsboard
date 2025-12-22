"use client";
import { useState, useMemo } from "react";
import {
  Activity,
  UserPlus,
  UserMinus,
  Trash2,
  Power,
  Settings,
  Tag,
  Database,
  AlertTriangle,
} from "lucide-react";
import { BUTTON_STYLES } from "@/lib/constants";

import CommonEntitySheet from "../common/rowDetails/common-entity-sheet";
import EntityActionBar from "../common/rowDetails/entity-action-bar";
import { DeviceDetailForm, DeviceEditForm } from "./device-details-form";

// Mock Tablarımızı import ediyoruz
import { DeviceAlarmsTab } from "./mock";
import { DeviceAttributeTab } from "./tabs/device-attribute-tab";
import { DeviceTelemetryTab } from "./tabs/device-telemetri-tab";

// TODO: Telemetri sayfası yapılacak!

export default function DeviceDetailSheet({ device, open, onOpenChange }) {
  const [isEditing, setIsEditing] = useState(false);
  const [hasCustomer, setHasCustomer] = useState(true);

  const getActions = () => {
    const defaultStyle = `${BUTTON_STYLES.base} ${BUTTON_STYLES.variants.default}`;
    const destructiveStyle = `${BUTTON_STYLES.base} ${BUTTON_STYLES.variants.destructive}`;

    return [
      {
        label: "Detay Sayfasına Git",
        icon: Power,
        onClick: () => console.log("Detay"),
        className: defaultStyle,
      },
      {
        label: "Cihazı herkese açık yap",
        icon: Power,
        onClick: () => console.log("Public"),
        className: defaultStyle,
      },
      !hasCustomer
        ? {
            label: "Müşteriye Ata",
            icon: UserPlus,
            onClick: () => setHasCustomer(true),
            className: defaultStyle,
          }
        : {
            label: "Müşteriden Çıkar",
            icon: UserMinus,
            onClick: () => setHasCustomer(false),
            className: destructiveStyle,
          },
      {
        label: "Erişim Anahtarını Kopyala",
        icon: Power,
        onClick: () => console.log("Access Token"),
        className: defaultStyle,
      },
      {
        label: "Cihaz Id'sini kopyala",
        icon: Power,
        onClick: () => console.log("Reboot"),
        className: defaultStyle,
      },
      {
        label: "Sil",
        icon: Trash2,
        onClick: () => confirm("Silinsin mi?"),
        className: destructiveStyle,
      },
    ];
  };

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
            <EntityActionBar actions={getActions()} />
            {isEditing ? (
              <DeviceEditForm data={device} />
            ) : (
              <DeviceDetailForm data={device} />
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
      // Olaylar, İlişkiler vb. ekleyebilirsin
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
