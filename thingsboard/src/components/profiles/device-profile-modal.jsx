"use client";
import { cn } from "@/lib/utils";

import { useEffect, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BoxSelect,
  Save,
  BellRing,
  Plus,
  Trash2,
  AlertCircle,
} from "lucide-react";

const alarmSchema = z.object({
  alarmType: z.string().min(1, "Alarm tipi giriniz (örn: High Temp)"),
  severity: z.enum(["CRITICAL", "MAJOR", "MINOR"]),
  createRules: z.object({
    condition: z
      .string()
      .min(1, "Oluşturma koşulu gereklidir (örn: temp > 50)"),
  }),
  clearRules: z.object({
    condition: z.string().optional(), // Opsiyonel olabilir
  }),
});

const profileSchema = z.object({
  name: z.string().min(2, "Profil adı gereklidir."),
  description: z.string().optional(),
  transportType: z.enum(["MQTT", "HTTP", "COAP"]),
  isDefault: z.boolean().default(false),
  // Alarm Kuralları Dizisi
  alarms: z.array(alarmSchema).optional(),
});

export default function AddDevicePorfileModal({ open, onOpenChange }) {
  const [activeTab, setActiveTab] = useState("general");

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      description: "",
      transportType: "MQTT",
      isDefault: false,
      alarms: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "alarms",
  });

  useEffect(() => {
    if (open) {
      reset();
      setActiveTab("general");
    }
  }, [open, reset]);

  const onError = (errors) => {
    if (errors.name) {
      setActiveTab("general");
      toast.error("Genel bilgilerde bir hata var");
      return;
    }

    if (errors.alarms) {
      setActiveTab("alarms");
      toast.error("Alarm ekleme formunda hata var.");
    }
  };

  const onSubmit = async (data) => {
    try {
      const token = localStorage.getItem("token");

      // Senin mevcut API'sine istek atıyoruz
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_GATEWAY_URL}/api/device-profile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Hata oluştu");

      toast.success("Profil ve kurallar kaydedildi!");
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-2xl p-0 overflow-hidden border-white/20 max-h-[90vh] flex flex-col">
        <form
          onSubmit={handleSubmit(onSubmit, onError)}
          className="flex flex-col h-full overflow-hidden"
        >
          <DialogHeader className="bg-halo-50/50 px-6 py-5 animate-fade-in shrink-0">
            <DialogTitle className="flex items-center gap-3 text-xl font-bold text-text-main">
              <div className="p-2 bg-halo-100 rounded-lg">
                <BoxSelect className="h-6 w-6 text-halo-600" />
              </div>
              Profil ve Alarm Yönetimi
            </DialogTitle>
          </DialogHeader>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger
                  value="general"
                  className={cn(
                    "flex-1 gap-4 text-center text-sm font-semibold py-2 rounded-lg transition-all duration-300 cursor-pointer",
                    activeTab === "general"
                      ? "bg-halo-600 text-white shadow-md"
                      : "text-gray-500 hover:text-gray-700 hover:bg-white/30"
                  )}
                >
                  Genel Bilgiler
                  {errors.name && (
                    <AlertCircle className="h-4 w-4  text-red-400 animate-pulse" />
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="alarms"
                  className={cn(
                    "flex-1 text-center text-sm font-semibold py-2 rounded-lg transition-all duration-300 cursor-pointer flex items-center justify-center gap-4",
                    activeTab === "alarms"
                      ? "bg-halo-600 text-white shadow-md"
                      : "text-gray-500 hover:text-gray-700 hover:bg-white/30"
                  )}
                >
                  <BellRing className="h-4 w-4" />
                  Alarm Kuralları ({fields.length})
                  {errors.alarms && (
                    <AlertCircle className="h-4 w-4  text-red-400 animate-pulse" />
                  )}
                </TabsTrigger>
              </TabsList>

              {/* --- TAB 1: GENEL BİLGİLER --- */}
              <TabsContent value="general" className="space-y-6 min-h-[320px]">
                <div className="space-y-5 slide-in-from-left-4">
                  <div className="space-y-2">
                    <Label className={"text-base font-bold text-text-main"}>
                      Profil Adı *
                    </Label>
                    <Input
                      placeholder="Örn: Akıllı Termostat"
                      className="h-14 px-4 text-base text-black bg-white/90 border-gray-200 focus-visible:ring-halo-600 shadow-sm placeholder:text-gray-400"
                      {...register("name")}
                    />
                    {errors.name && (
                      <p className="text-red-500 text-xs">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className={"text-base font-bold text-text-main"}>
                      İletişim Tipi
                    </Label>
                    <Controller
                      name="transportType"
                      control={control}
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger className="flex h-14 w-full px-4 py-6 rounded-md border border-gray-200 bg-white/90 text-base text-black shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-halo-600 cursor-pointer appearance-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent
                            className={cn(
                              "bg-white/95 backdrop-blur-xl border-gray-200 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
                            )}
                          >
                            <SelectItem
                              value="MQTT"
                              className="py-3 cursor-pointer focus:bg-halo-50 focus:text-halo-700"
                            >
                              MQTT
                            </SelectItem>
                            <SelectItem
                              value="HTTP"
                              className="py-3 cursor-pointer focus:bg-halo-50 focus:text-halo-700"
                            >
                              HTTP
                            </SelectItem>
                            <SelectItem
                              value="COAP"
                              className="py-3 cursor-pointer focus:bg-halo-50 focus:text-halo-700"
                            >
                              COAP
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-white/60 shadow-sm transition-colors hover:border-halo-300">
                    <div className="space-y-0.5">
                      <Label className="text-base font-bold text-text-main cursor-pointer">
                        Varsayılan Profil
                      </Label>
                      <p className="text-xs text-text-muted">
                        Yeni cihazlar otomatik olarak bu profili kullanır.
                      </p>
                    </div>
                    <Controller
                      name="isDefault"
                      control={control}
                      render={({ field }) => (
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-halo-600 data-[state=unchecked]:bg-gray-300 border-2 border-transparent"
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className={"text-base font-bold text-text-main"}>
                      Açıklama
                    </Label>
                    <Textarea
                      {...register("description")}
                      className="h-14 px-4 text-base text-black bg-white/90 border-gray-200 focus-visible:ring-halo-600 shadow-sm placeholder:text-gray-400"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* --- TAB 2: ALARM KURALLARI --- */}
              <TabsContent value="alarms" className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-semibold text-muted-foreground">
                    Tanımlı Alarmlar
                  </h4>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      append({
                        alarmType: "",
                        severity: "MAJOR",
                        createRules: { condition: "" },
                        clearRules: { condition: "" },
                      })
                    }
                  >
                    <Plus className="h-4 w-4 mr-1" /> Kural Ekle
                  </Button>
                </div>

                {fields.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed rounded-xl text-muted-foreground">
                    Henüz alarm kuralı eklenmemiş.
                  </div>
                )}

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="p-4 border rounded-xl bg-white/40 relative group"
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="space-y-1">
                          <Label className="text-xs">
                            Alarm Tipi (Benzersiz Ad)
                          </Label>
                          <Input
                            placeholder="Örn: HighTemperature"
                            className="h-8 text-sm"
                            {...register(`alarms.${index}.alarmType`)}
                          />
                          {errors.alarms?.[index]?.alarmType && (
                            <span className="text-red-500 text-[10px]">
                              {errors.alarms[index].alarmType.message}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Önem Derecesi</Label>
                          <Controller
                            name={`alarms.${index}.severity`}
                            control={control}
                            render={({ field }) => (
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <SelectTrigger className="h-8 text-sm bg-white/70">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent
                                  className={
                                    "bg-white/95 backdrop-blur-xl border-gray-200 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
                                  }
                                >
                                  <SelectItem
                                    value="CRITICAL"
                                    className="text-red-600 cursor-pointer"
                                  >
                                    CRITICAL
                                  </SelectItem>
                                  <SelectItem
                                    value="MAJOR"
                                    className="text-orange-500 cursor-pointer"
                                  >
                                    MAJOR
                                  </SelectItem>
                                  <SelectItem
                                    value="MINOR"
                                    className="text-yellow-500 cursor-pointer"
                                  >
                                    MINOR
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-blue-600">
                            Tetiklenme Koşulu (JS)
                          </Label>
                          <Input
                            placeholder="Örn: temperature > 50"
                            className="h-8 text-sm font-mono bg-blue-50/50"
                            {...register(
                              `alarms.${index}.createRules.condition`
                            )}
                          />
                          {errors.alarms?.[index]?.createRules?.condition && (
                            <span className="text-red-500 text-[10px]">
                              Koşul gereklidir
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-green-600">
                            Temizlenme Koşulu (Opsiyonel)
                          </Label>
                          <Input
                            placeholder="Örn: temperature < 45"
                            className="h-8 text-sm font-mono bg-green-50/50"
                            {...register(
                              `alarms.${index}.clearRules.condition`
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="bg-halo-50/30 px-6 py-4 border-t border-white/10 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-12 px-6 text-base border-gray-300 text-gray-600 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors cursor-pointer"
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-12 px-8 text-base bg-gradient-to-r from-halo-600 to-halo-700 text-white shadow-md hover:shadow-halo-500/30 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                "Kaydediliyor..."
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Kaydet
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
