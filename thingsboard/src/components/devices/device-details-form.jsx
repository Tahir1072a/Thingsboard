"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "../ui/button";
import { Separator } from "@radix-ui/react-dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Smartphone,
  Tag,
  Server,
  Wifi,
  FileText,
  Check,
  Trash2,
  Copy,
  Power,
} from "lucide-react";
import { FORM_STYLES } from "@/lib/constants";
import EntityActionBar from "../common/rowDetails/entity-action-bar";
import { BUTTON_STYLES } from "@/lib/constants";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const defaultData = {
  customerName: "Global Teknoloji A.Ş.",
  deviceName: "Termostat-Main-01",
  profile: "Sıcaklık Sensörü",
  label: "Depo Girişi - Bölge A",
  description:
    "Bu cihaz ana depo girişindeki sıcaklık değişimlerini izlemek ve merkezi sisteme raporlamak için yapılandırılmıştır. Bakım tarihi: 20.11.2025.",
};

const inputStyle = `${FORM_STYLES.base} ${FORM_STYLES.variants.readOnly}`;
const textareaStyle = `${FORM_STYLES.base} ${FORM_STYLES.variants.textareaReadOnly}`;
const labelStyle = FORM_STYLES.variants.label;

export function DeviceDetailForm({ data = defaultData, onDeviceDeleted }) {
  const router = useRouter();

  const handleDelete = async () => {
    const isConfirmed = confirm("Bu cihazı silmek istediğinizden emin misiniz?");
    if (!isConfirmed) return;

    try {
      const response = await fetch(`/api/device/${data._id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        toast.success("Cihaz başarıyla silindi");
        if (onDeviceDeleted) {
          onDeviceDeleted();
        } else {
          router.push("/devices");
          router.refresh();
        }
      }
    } catch (error) {
      console.error("Silme hatası:", error);
    } 
  }

  const handleCopy = async (textToCopy, itemLabel) => {
    if (!textToCopy) return;
    console.log(textToCopy);
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast.success(`${itemLabel} başarıyla kopyalandı`);
    } catch (error) {
      console.error("Kopyalama hatası:", error);
    }
  }

  const getActions = () => {
      const defaultStyle = `${BUTTON_STYLES.base} ${BUTTON_STYLES.variants.default}`;
      const destructiveStyle = `${BUTTON_STYLES.base} ${BUTTON_STYLES.variants.destructive}`;

      return [
        {
          label: "Detay Sayfasına Git",
          icon: Power,
          onClick: () => router.push(`/devices/${data._id}`),
          className: defaultStyle,
        },
        {
          label: "Erişim Anahtarını Kopyala",
          icon: Copy,
          onClick: () => handleCopy(data.accessToken, "Erişim Anahtarı"),
          className: defaultStyle,
        },
        {
          label: "Cihaz Id'sini kopyala",
          icon: Copy,
          onClick: () => handleCopy(data._id, "Cihaz Id"),
          className: defaultStyle,
        },
        {
          label: "Sil",
          icon: Trash2,
          onClick: () => handleDelete(),
          className: destructiveStyle,
        },
      ];
    };

  return (
    <div className="p-1">
      <EntityActionBar actions={getActions()} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* --- Cihaz İsmi --- */}
        <div className="space-y-1">
          <Label htmlFor="deviceName" className={labelStyle}>
            <Smartphone className="w-4 h-4 text-halo-500" />
            Cihaz İsmi
          </Label>
          <Input
            id="deviceName"
            value={data.name}
            disabled
            className={`${inputStyle}`}
          />
        </div>

        {/* --- Cihaz Profili --- */}
        <div className="space-y-1">
          <Label htmlFor="profile" className={labelStyle}>
            <Server className="w-4 h-4 text-halo-500" />
            Cihaz Profili
          </Label>
          <Input
            id="profile"
            value={data.profile?.name || "Belirtilmemiş"}
            disabled
            className={`${inputStyle}`}
          />
        </div>

        {/* --- Etiket --- */}
        <div className="space-y-1">
          <Label htmlFor="tag" className={labelStyle}>
            <Tag className="w-4 h-4 text-halo-500" />
            Etiket
          </Label>
          <Input
            id="tag"
            value={data.tag}
            disabled
            className={`${inputStyle}`}
          />
        </div>

        {/* --- Açıklama (Textarea) - YENİ EKLENEN KISIM --- */}
        <div className="md:col-span-2 space-y-1">
          <Label htmlFor="description" className={labelStyle}>
            <FileText className="w-4 h-4 text-halo-500" />
            Açıklama
          </Label>
          <Textarea
            id="description"
            value={data.description || "Açıklama girilmemiş."}
            disabled
            className={`${textareaStyle}`}
          />
        </div>
      </div>
    </div>
  );
}

// TODO: Form yapısı ayarlanacak...
export function DeviceEditForm({ data, onCancel, onSave }) {
  // Form verilerini yerel state'te tutuyoruz
  const [formData, setFormData] = useState({
    customerName: data?.customerName || "",
    name: data?.name || "",
    profile: data?.profile?._id || data?.profile || "",
    label: data?.label || "",
    isGateway: data?.isGateway || false,
    description: data?.description || "",
  });

  // Input ve Textarea değişikliklerini yakalar
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // Switch değişimini yakalar
  const handleSwitchChange = (checked) => {
    setFormData((prev) => ({ ...prev, isGateway: checked }));
  };

  // Kaydetme işlemi
  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-1">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* --- Cihaz İsmi --- */}
        <div className="space-y-1">
          <Label htmlFor="name" className={labelStyle}>
            <Smartphone className="w-4 h-4 text-halo-500" />
            Cihaz İsmi
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Cihaz ismini giriniz"
            className={inputStyle}
          />
        </div>

        {/* --- Cihaz Profili --- */}
        <div className="space-y-1">
          <Label htmlFor="profile" className={labelStyle}>
            <Server className="w-4 h-4 text-halo-500" />
            Cihaz Profili
          </Label>
          {/* İstersen burayı Select component'i ile değiştirebilirsin */}
          <Input
            id="profile"
            value={formData.profile}
            onChange={handleChange}
            placeholder="Profil seçiniz"
            className={inputStyle}
          />
        </div>

        {/* --- Etiket --- */}
        <div className="space-y-1">
          <Label htmlFor="label" className={labelStyle}>
            <Tag className="w-4 h-4 text-halo-500" />
            Etiket
          </Label>
          <Input
            id="label"
            value={formData.label}
            onChange={handleChange}
            placeholder="Etiket giriniz"
            className={inputStyle}
          />
        </div>

        {/* --- Ağ Geçidi (Toggle) --- */}
        <div className="md:col-span-2 mt-2">
          <div
            className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${
              formData.isGateway
                ? "bg-halo-50/50 border-halo-200"
                : "bg-white border-gray-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg transition-colors ${
                  formData.isGateway
                    ? "bg-halo-500 text-white shadow-md shadow-halo-200"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                <Wifi className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <Label
                  htmlFor="isGateway"
                  className="text-base font-semibold text-gray-900 cursor-pointer"
                >
                  Ağ Geçidi (Gateway)
                </Label>
                <span className="text-xs text-gray-500">
                  Bu cihazı gateway olarak yapılandır
                </span>
              </div>
            </div>
            <Switch
              id="isGateway"
              checked={formData.isGateway}
              onCheckedChange={handleSwitchChange}
              className="data-[state=checked]:bg-halo-600"
            />
          </div>
        </div>

        {/* --- Açıklama (Textarea) --- */}
        <div className="md:col-span-2 space-y-1">
          <Label htmlFor="description" className={labelStyle}>
            <FileText className="w-4 h-4 text-halo-500" />
            Açıklama
          </Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Cihaz hakkında detaylı açıklama giriniz..."
            className={textareaStyle}
          />
        </div>

        <div className="md:col-span-2 space-y-1">
          <div className="animate-fade-in">
            <Separator className="bg-white/20 my-6" />
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  console.log("Save");
                }}
                className="px-8 h-12 bg-gradient-to-r from-halo-600 to-halo-700 hover:from-halo-700 text-white cursor-pointer shadow-lg"
              >
                <Check className="h-5 w-5 mr-2" />
                Değişiklikleri Kaydet
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
