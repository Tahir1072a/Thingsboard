"use client";

/**
 * DeviceEditModal — Cihaz Düzenleme Modalı
 * Mevcut cihazın bilgilerini (isim, profil, tag, durum, açıklama) günceller.
 * accessToken değiştirilemez (güvenlik).
 */

import { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Pencil, Save, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

const editSchema = z.object({
  name: z.string().min(2, "Cihaz adı en az 2 karakter olmalıdır."),
  profile: z.string().min(1, "Profil seçimi zorunludur."),
  tag: z.string().optional(),
  description: z.string().optional(),
  status: z.string(),
});

export default function DeviceEditModal({ open, onOpenChange, device, onDeviceUpdated }) {
  const [deviceProfiles, setDeviceProfiles] = useState([]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: "",
      profile: "default",
      tag: "",
      description: "",
      status: "active",
    },
  });

  // Modal açıldığında mevcut cihaz verilerini forma yükle
  useEffect(() => {
    if (open && device) {
      reset({
        name: device.name || "",
        profile: device.profile || "default",
        tag: device.tag || "",
        description: device.description || "",
        status: device.status || "active",
      });
      fetchDeviceProfiles();
    }
  }, [open, device, reset]);

  const fetchDeviceProfiles = useCallback(async () => {
    try {
      const res = await fetch("/api/device-profile");
      const data = await res.json();
      if (data.ok) setDeviceProfiles(data.data || []);
    } catch {
      setDeviceProfiles([]);
    }
  }, []);

  const onSubmit = async (formData) => {
    try {
      const res = await fetch(`/api/device/${device._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Güncelleme hatası");

      toast.success(`"${formData.name}" güncellendi.`);
      onOpenChange(false);
      if (onDeviceUpdated) onDeviceUpdated();
    } catch (error) {
      console.error("Device update error:", error);
      toast.error(error.message || "Bir hata oluştu.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-lg p-0 overflow-hidden border-white/20 max-h-[90vh] flex flex-col">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col h-full overflow-hidden"
        >
          {/* Header */}
          <DialogHeader className="bg-halo-50/50 px-6 py-5 shrink-0">
            <DialogTitle className="flex items-center gap-3 text-xl font-bold text-text-main">
              <div className="p-2 bg-halo-100 rounded-lg">
                <Pencil className="h-5 w-5 text-halo-600" />
              </div>
              Cihaz Düzenle
            </DialogTitle>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Cihaz Adı */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-text-main">
                Cihaz Adı <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Örn: Salon_Termostat_Main"
                className={cn(
                  "h-12 px-4 text-sm text-black bg-white/90 border-gray-200 focus-visible:ring-halo-600 shadow-sm",
                  errors.name && "border-red-500 focus-visible:ring-red-500"
                )}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-red-500 text-xs flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.name.message}
                </p>
              )}
            </div>

            {/* Cihaz Profili */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-text-main">
                Cihaz Profili <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="profile"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="h-12 w-full px-4 rounded-md border border-gray-200 bg-white/90 text-sm text-black shadow-sm focus:ring-2 focus:ring-halo-600 cursor-pointer">
                      <SelectValue placeholder="Profil Seçiniz..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 backdrop-blur-xl border-gray-200 shadow-xl">
                      <SelectItem value="default" className="py-2.5 cursor-pointer focus:bg-halo-50">
                        Default Device Profile
                      </SelectItem>
                      {deviceProfiles
                        .filter((p) => p.name !== "Default Device Profile")
                        .map((profile) => (
                          <SelectItem
                            key={profile._id}
                            value={profile._id}
                            className="py-2.5 cursor-pointer focus:bg-halo-50"
                          >
                            {profile.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.profile && (
                <p className="text-red-500 text-xs flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.profile.message}
                </p>
              )}
            </div>

            {/* Etiket */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-text-main">Etiket</Label>
              <Input
                {...register("tag")}
                placeholder="Örn: Depo 1, Kat 2"
                className="h-12 px-4 text-sm text-black bg-white/90 border-gray-200 focus-visible:ring-halo-600 shadow-sm"
              />
            </div>

            {/* Durum */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-text-main">Durum</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="h-12 w-full px-4 rounded-md border border-gray-200 bg-white/90 text-sm text-black shadow-sm focus:ring-2 focus:ring-halo-600 cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 backdrop-blur-xl border-gray-200 shadow-xl">
                      <SelectItem value="active" className="py-2.5 cursor-pointer focus:bg-halo-50">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-green-500" />
                          Aktif
                        </span>
                      </SelectItem>
                      <SelectItem value="inactive" className="py-2.5 cursor-pointer focus:bg-halo-50">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-gray-400" />
                          Pasif
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Açıklama */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-text-main">Açıklama</Label>
              <Input
                {...register("description")}
                placeholder="Cihaz hakkında kısa bilgi..."
                className="h-12 px-4 text-sm text-black bg-white/90 border-gray-200 focus-visible:ring-halo-600 shadow-sm"
              />
            </div>

            {/* Access Token (salt okunur) */}
            {device?.accessToken && (
              <div className="space-y-2">
                <Label className="text-sm font-bold text-text-muted">
                  Access Token <span className="text-xs font-normal">(değiştirilemez)</span>
                </Label>
                <Input
                  readOnly
                  value={device.accessToken}
                  className="h-12 px-4 text-xs font-mono text-gray-500 bg-gray-100 border-gray-200 cursor-not-allowed select-all"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="bg-halo-50/30 px-6 py-4 border-t border-white/10 shrink-0 flex flex-row justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 px-5 border-gray-300 text-gray-600 bg-white hover:bg-gray-100"
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 px-6 bg-halo-600 hover:bg-halo-700 text-white shadow-md"
            >
              {isSubmitting ? "Kaydediliyor..." : "Güncelle"}
              {!isSubmitting && <Save className="ml-2 h-4 w-4" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
