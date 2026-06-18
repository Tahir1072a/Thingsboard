"use client";

/**
 * ProfileDetailForm — Profil detaylarını salt-okunur gösteren form
 * ProfileEditForm — Profil düzenleme formu
 *
 * device-details-form.jsx pattern'ini takip eder.
 */

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@radix-ui/react-dropdown-menu";
import {
  UserCheck,
  FileText,
  Network,
  Shield,
  Tag,
  Copy,
  Trash2,
  Check,
  CheckCircle2,
  XCircle,
  LayoutDashboard,
  Calendar,
} from "lucide-react";
import { FORM_STYLES, BUTTON_STYLES } from "@/lib/constants";
import EntityActionBar from "../common/rowDetails/entity-action-bar";
import toast from "react-hot-toast";

// --- Stiller (constants'tan türetilen) ---
const inputStyle = `${FORM_STYLES.base} ${FORM_STYLES.variants.readOnly}`;
const editableInputStyle = `${FORM_STYLES.base} ${FORM_STYLES.variants.editable}`;
const textareaStyle = `${FORM_STYLES.base} ${FORM_STYLES.variants.textareaReadOnly}`;
const editableTextareaStyle = `${FORM_STYLES.base} ${FORM_STYLES.variants.textareaEditable}`;
const labelStyle = FORM_STYLES.variants.label;

// --- Transport tipi renkleri ---
const TRANSPORT_COLORS = {
  MQTT: "bg-blue-100 text-blue-700 border-blue-200",
  HTTP: "bg-green-100 text-green-700 border-green-200",
  COAP: "bg-orange-100 text-orange-700 border-orange-200",
  DEFAULT: "bg-gray-100 text-gray-600 border-gray-200",
};

/**
 * ProfileDetailForm — Salt okunur profil detay formu
 */
export function ProfileDetailForm({ data, onProfileDeleted }) {
  const handleDelete = async () => {
    const isConfirmed = confirm(
      "Bu profili silmek istediğinizden emin misiniz?"
    );
    if (!isConfirmed) return;

    try {
      const response = await fetch(`/api/device-profile/${data._id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        toast.success("Profil başarıyla silindi");
        if (onProfileDeleted) {
          onProfileDeleted(data._id);
        }
      } else {
        const result = await response.json();
        toast.error(result.message || "Silme işlemi başarısız.");
      }
    } catch (error) {
      console.error("Silme hatası:", error);
      toast.error("Sunucuya bağlanırken hata oluştu.");
    }
  };

  const handleCopy = async (textToCopy, itemLabel) => {
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast.success(`${itemLabel} başarıyla kopyalandı`);
    } catch (error) {
      console.error("Kopyalama hatası:", error);
    }
  };

  const getActions = () => {
    const defaultStyle = `${BUTTON_STYLES.base} ${BUTTON_STYLES.variants.default}`;
    const destructiveStyle = `${BUTTON_STYLES.base} ${BUTTON_STYLES.variants.destructive}`;

    return [
      {
        label: "Profil Id'sini Kopyala",
        icon: Copy,
        onClick: () => handleCopy(data._id, "Profil ID"),
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

  const transportType = data?.transportType || "DEFAULT";
  const colorClass =
    TRANSPORT_COLORS[transportType] || TRANSPORT_COLORS.DEFAULT;

  return (
    <div className="p-1">
      <EntityActionBar actions={getActions()} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* --- Profil Adı --- */}
        <div className="space-y-1">
          <Label htmlFor="profileName" className={labelStyle}>
            <UserCheck className="w-4 h-4 text-halo-500" />
            Profil Adı
          </Label>
          <Input
            id="profileName"
            value={data?.name || ""}
            disabled
            className={inputStyle}
          />
        </div>

        {/* --- Transport Tipi --- */}
        <div className="space-y-1">
          <Label htmlFor="transportType" className={labelStyle}>
            <Network className="w-4 h-4 text-halo-500" />
            Transport Tipi
          </Label>
          <div className="h-12 flex items-center">
            <span
              className={`inline-flex items-center px-3 py-1.5 rounded-lg border text-sm font-semibold uppercase font-mono ${colorClass}`}
            >
              {transportType}
            </span>
          </div>
        </div>

        {/* --- Varsayılan Profil --- */}
        <div className="space-y-1">
          <Label htmlFor="isDefault" className={labelStyle}>
            <Shield className="w-4 h-4 text-halo-500" />
            Varsayılan Profil
          </Label>
          <div className="h-12 flex items-center gap-2">
            {data?.isDefault ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-700">
                  Evet — Varsayılan profil
                </span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-500">Hayır</span>
              </>
            )}
          </div>
        </div>

        {/* --- Varsayılan Dashboard --- */}
        <div className="space-y-1">
          <Label htmlFor="defaultDashboard" className={labelStyle}>
            <LayoutDashboard className="w-4 h-4 text-halo-500" />
            Varsayılan Dashboard
          </Label>
          <div className="h-12 flex items-center">
            {data?.defaultDashboard ? (
              <span className="text-sm font-medium text-halo-600">
                {data.defaultDashboard.name || data.defaultDashboard}
              </span>
            ) : (
              <span className="text-sm text-gray-400 italic">
                Belirtilmemiş
              </span>
            )}
          </div>
        </div>

        {/* --- Beklenen Anahtarlar (Expected Keys) --- */}
        <div className="md:col-span-2 space-y-1">
          <Label htmlFor="expectedKeys" className={labelStyle}>
            <Tag className="w-4 h-4 text-halo-500" />
            Beklenen Telemetri Anahtarları
          </Label>
          <div className="min-h-[48px] flex items-center flex-wrap gap-2 py-2">
            {data?.expectedKeys && data.expectedKeys.length > 0 ? (
              data.expectedKeys.map((key, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2.5 py-1 rounded-md bg-halo-50 text-halo-700 border border-halo-200 text-xs font-mono font-medium"
                >
                  {key}
                </span>
              ))
            ) : (
              <span className="text-sm text-gray-400 italic">
                Anahtar tanımlanmamış
              </span>
            )}
          </div>
        </div>

        {/* --- Açıklama --- */}
        <div className="md:col-span-2 space-y-1">
          <Label htmlFor="description" className={labelStyle}>
            <FileText className="w-4 h-4 text-halo-500" />
            Açıklama
          </Label>
          <Textarea
            id="description"
            value={data?.description || "Açıklama girilmemiş."}
            disabled
            className={textareaStyle}
          />
        </div>

        {/* --- Oluşturma Tarihi --- */}
        <div className="space-y-1">
          <Label htmlFor="createdAt" className={labelStyle}>
            <Calendar className="w-4 h-4 text-halo-500" />
            Oluşturma Tarihi
          </Label>
          <Input
            id="createdAt"
            value={
              data?.createdAt
                ? new Date(data.createdAt).toLocaleDateString("tr-TR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Bilinmiyor"
            }
            disabled
            className={inputStyle}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * ProfileEditForm — Profil düzenleme formu
 */
export function ProfileEditForm({ data, onSave }) {
  const [formData, setFormData] = useState({
    name: data?.name || "",
    description: data?.description || "",
    transportType: data?.transportType || "MQTT",
    isDefault: data?.isDefault || false,
    expectedKeys: data?.expectedKeys?.join(", ") || "",
    defaultDashboard: data?.defaultDashboard?._id || data?.defaultDashboard || "",
  });

  const [dashboards, setDashboards] = useState([]);

  // Dashboard listesini çek
  useEffect(() => {
    const fetchDashboards = async () => {
      try {
        const res = await fetch("/api/dashboard");
        const result = await res.json();
        if (result.ok) {
          setDashboards(result.data || []);
        }
      } catch (error) {
        console.error("Dashboard listesi alınamadı:", error);
      }
    };
    fetchDashboards();
  }, []);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSwitchChange = (checked) => {
    setFormData((prev) => ({ ...prev, isDefault: checked }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // expectedKeys'i virgülle ayrılmış string'den diziye çevir
    const processed = {
      ...formData,
      expectedKeys: formData.expectedKeys
        ? formData.expectedKeys
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean)
        : [],
      defaultDashboard: formData.defaultDashboard || null,
    };
    if (onSave) onSave(processed);
  };

  return (
    <form onSubmit={handleSubmit} className="p-1">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* --- Profil Adı --- */}
        <div className="space-y-1">
          <Label htmlFor="name" className={labelStyle}>
            <UserCheck className="w-4 h-4 text-halo-500" />
            Profil Adı
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Profil adını giriniz"
            className={editableInputStyle}
          />
        </div>

        {/* --- Transport Tipi --- */}
        <div className="space-y-1">
          <Label htmlFor="transportType" className={labelStyle}>
            <Network className="w-4 h-4 text-halo-500" />
            Transport Tipi
          </Label>
          <select
            id="transportType"
            value={formData.transportType}
            onChange={handleChange}
            className={editableInputStyle}
          >
            <option value="MQTT">MQTT</option>
            <option value="HTTP">HTTP</option>
            <option value="COAP">CoAP</option>
          </select>
        </div>

        {/* --- Varsayılan Dashboard --- */}
        <div className="space-y-1">
          <Label htmlFor="defaultDashboard" className={labelStyle}>
            <LayoutDashboard className="w-4 h-4 text-halo-500" />
            Varsayılan Dashboard
          </Label>
          <select
            id="defaultDashboard"
            value={formData.defaultDashboard}
            onChange={handleChange}
            className={editableInputStyle}
          >
            <option value="">Seçiniz...</option>
            {dashboards.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* --- Beklenen Anahtarlar --- */}
        <div className="space-y-1">
          <Label htmlFor="expectedKeys" className={labelStyle}>
            <Tag className="w-4 h-4 text-halo-500" />
            Beklenen Anahtarlar
          </Label>
          <Input
            id="expectedKeys"
            value={formData.expectedKeys}
            onChange={handleChange}
            placeholder="temperature, humidity, pressure"
            className={editableInputStyle}
          />
          <p className="text-xs text-gray-400 mt-1">
            Virgülle ayırarak birden fazla anahtar girebilirsiniz
          </p>
        </div>

        {/* --- Varsayılan Profil Toggle --- */}
        <div className="md:col-span-2 mt-2">
          <div
            className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${
              formData.isDefault
                ? "bg-halo-50/50 border-halo-200"
                : "bg-white border-gray-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg transition-colors ${
                  formData.isDefault
                    ? "bg-halo-500 text-white shadow-md shadow-halo-200"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                <Shield className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <Label
                  htmlFor="isDefault"
                  className="text-base font-semibold text-gray-900 cursor-pointer"
                >
                  Varsayılan Profil
                </Label>
                <span className="text-xs text-gray-500">
                  Bu profili varsayılan cihaz profili olarak ayarla
                </span>
              </div>
            </div>
            <Switch
              id="isDefault"
              checked={formData.isDefault}
              onCheckedChange={handleSwitchChange}
              className="data-[state=checked]:bg-halo-600"
            />
          </div>
        </div>

        {/* --- Açıklama --- */}
        <div className="md:col-span-2 space-y-1">
          <Label htmlFor="description" className={labelStyle}>
            <FileText className="w-4 h-4 text-halo-500" />
            Açıklama
          </Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Profil hakkında detaylı açıklama giriniz..."
            className={editableTextareaStyle}
          />
        </div>

        {/* --- Kaydet Butonu --- */}
        <div className="md:col-span-2 space-y-1">
          <div className="animate-fade-in">
            <Separator className="bg-white/20 my-6" />
            <div className="flex justify-end">
              <Button
                type="submit"
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
