"use client";

/**
 * DeviceProfileDetailSheet — Cihaz Profili detay paneli
 *
 * device-detail-sheet.jsx ile aynı pattern'i takip eder.
 * CommonEntitySheet wrapper'ı üzerinden 4 tab sunar:
 *   1. Detaylar (read-only / edit mode)
 *   2. Transport Yapılandırma
 *   3. Alarm Kuralları
 *   4. Denetim Günlükleri
 */

import { useState, useMemo } from "react";
import {
  Settings,
  Network,
  AlertTriangle,
  ScrollText,
  UserCheck,
} from "lucide-react";

import CommonEntitySheet from "../common/rowDetails/common-entity-sheet";
import { ProfileDetailForm, ProfileEditForm } from "./profile-details-form";
import { ProfileTransportTab } from "./tabs/profile-transport-tab";
import { ProfileAlarmRulesTab } from "./tabs/profile-alarm-rules-tab";
import { ProfileAuditLogTab } from "./tabs/profile-audit-log-tab";

export default function DeviceProfileDetailSheet({
  profile,
  open,
  onOpenChange,
  onProfileUpdated,
  onProfileDeleted,
}) {
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async (formData) => {
    try {
      const response = await fetch(`/api/device-profile/${profile._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.ok) {
        import("react-hot-toast").then((module) => {
          module.default.success("Profil başarıyla güncellendi.");
        });
        setIsEditing(false);
        if (onProfileUpdated) {
          onProfileUpdated(result.data);
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

  // --- TAB YAPILANDIRMASI ---
  const tabConfiguration = useMemo(
    () => [
      {
        id: "details",
        label: "Detaylar",
        icon: Settings,
        content: (
          <div className="space-y-6">
            {isEditing ? (
              <ProfileEditForm data={profile} onSave={handleSave} />
            ) : (
              <ProfileDetailForm
                data={profile}
                onProfileDeleted={onProfileDeleted}
              />
            )}
          </div>
        ),
      },
      {
        id: "transport",
        label: "Transport Yapılandırma",
        icon: Network,
        content: <ProfileTransportTab profile={profile} />,
      },
      {
        id: "alarm-rules",
        label: "Alarm Kuralları",
        icon: AlertTriangle,
        content: <ProfileAlarmRulesTab profile={profile} />,
      },
      {
        id: "audit-logs",
        label: "Denetim Günlükleri",
        icon: ScrollText,
        content: <ProfileAuditLogTab profileId={profile?._id} />,
      },
    ],
    [profile, isEditing]
  );

  if (!profile) return null;

  return (
    <CommonEntitySheet
      open={open}
      onOpenChange={onOpenChange}
      title={profile.name}
      subtitle={
        <span className="font-mono text-xs bg-white/20 px-2 py-1 rounded">
          Cihaz Profili
        </span>
      }
      icon={UserCheck}
      isEditing={isEditing}
      onEditToggle={() => setIsEditing(!isEditing)}
      tabs={tabConfiguration}
    />
  );
}
