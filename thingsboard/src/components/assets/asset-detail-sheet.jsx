"use client";

import { useState, useMemo } from "react";
import { Package, Settings, Link2 } from "lucide-react";
import CommonEntitySheet from "../common/rowDetails/common-entity-sheet";
import { AssetDetailForm, AssetEditForm } from "./asset-details-form";
import toast from "react-hot-toast";

// Relations tab placeholder
function AssetRelationsTab({ assetId }) {
  return (
    <div className="p-6 text-center text-muted-foreground">
      <Link2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
      <h3 className="text-lg font-medium mb-2">İlişkiler (Contains)</h3>
      <p>Bu varlığa bağlı cihaz ve alt varlıkların yönetimi yakında eklenecek.</p>
    </div>
  );
}

export default function AssetDetailSheet({ asset, open, onOpenChange, onAssetUpdated }) {
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async (formData) => {
    try {
      const response = await fetch(`/api/asset/${asset._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.ok) {
        toast.success("Varlık başarıyla güncellendi.");
        setIsEditing(false);
        if (onAssetUpdated) {
          onAssetUpdated(result.data);
        }
      } else {
        toast.error(result.message || "Güncelleme başarısız.");
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Sunucuya bağlanırken bir hata oluştu.");
    }
  };

  const tabConfiguration = useMemo(
    () => [
      {
        id: "details",
        label: "Ayrıntılar",
        icon: Settings,
        content: isEditing ? (
          <div className="p-6">
            <AssetEditForm
              asset={asset}
              onSave={handleSave}
              onCancel={() => setIsEditing(false)}
            />
          </div>
        ) : (
          <div className="p-6">
            <AssetDetailForm asset={asset} />
          </div>
        ),
      },
      {
        id: "relations",
        label: "İlişkiler",
        icon: Link2,
        content: <AssetRelationsTab assetId={asset?._id} />,
      },
    ],
    [asset, isEditing]
  );

  if (!asset) return null;

  return (
    <CommonEntitySheet
      open={open}
      onOpenChange={onOpenChange}
      title={asset.name}
      subtitle={
        <span className="font-mono text-xs bg-white/20 px-2 py-1 rounded">
          Varlık Ayrıntıları
        </span>
      }
      icon={Package}
      isEditing={isEditing}
      onEditToggle={() => setIsEditing(!isEditing)}
      tabs={tabConfiguration}
    />
  );
}
