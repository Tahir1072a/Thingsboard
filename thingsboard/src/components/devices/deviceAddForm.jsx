"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, ArrowRight, ArrowLeft, Copy, Check } from "lucide-react";

const deviceSchema = z.object({
  deviceName: z.string().min(2, "Cihaz adı en az 2 karakter olmalıdır."),
  deviceLabel: z.string().optional(),
  deviceProfile: z.string().min(1, "Lütfen bir profil seçiniz."),
  description: z.string().optional(),
  accessToken: z.string(),
});

export default function AddDeviceModal({ open, onOpenChange }) {
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(deviceSchema),
    defaultValues: {
      deviceName: "",
      deviceLabel: "",
      deviceProfile: "",
      description: "",
      accessToken: "",
    },
  });

  const currentToken = watch("accessToken");

  useEffect(() => {
    if (open) {
      setStep(1);
      reset();
      generateToken();
    }
  }, [open, reset]);

  const generateToken = () => {
    const token =
      "DEV_" + Math.random().toString(36).substring(2, 12).toUpperCase();
    setValue("accessToken", token);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNextStep = async () => {
    const isValid = await trigger([
      "deviceName",
      "deviceProfile",
      "deviceLabel",
      "description",
    ]);

    if (isValid) {
      setStep(2);
    }
  };

  const onSubmit = async (data) => {
    try {
      console.log("Form Verisi:", data);
      // Backend isteği buraya...
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-3xl p-0 overflow-hidden border-white/20">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader className="bg-halo-50 px-6 py-5 animate-fade-in">
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-text-main">
              <PlusCircle className="h-8 w-8 text-halo-600" />
              Yeni Cihaz Ekle
            </DialogTitle>

            {/* Stepper */}
            <div className="flex items-center bg-white/40 dark:bg-black/20 p-1 rounded-xl mt-3 border border-white/20">
              <div
                className={`flex-1 text-center text-base font-semibold py-2 rounded-lg transition-all duration-300 cursor-pointer ${
                  step === 1
                    ? "bg-halo-600 text-white shadow-md"
                    : "text-gray-500"
                }`}
              >
                1. Cihaz Ayrıntıları
              </div>
              <div
                className={`flex-1 text-center text-base font-semibold py-2 rounded-lg transition-all duration-300 cursor-pointer ${
                  step === 2
                    ? "bg-halo-600 text-white shadow-md"
                    : "text-gray-500"
                }`}
              >
                2. Kimlik ve Erişim
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 py-10 min-h-[320px]">
            {/* ADIM 1 */}
            {step === 1 && (
              <div className="space-y-5 slide-in-from-left-4">
                {/* Cihaz Adı */}
                <div className="grid gap-2">
                  <Label
                    htmlFor="deviceName"
                    className="text-base font-bold text-text-main"
                  >
                    Cihaz Adı <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="deviceName"
                    {...register("deviceName")}
                    placeholder="Örn: Salon_Termostat_Main"
                    className="h-14 px-4 text-base text-black bg-white/90 border-gray-200 focus-visible:ring-halo-600 shadow-sm placeholder:text-gray-400"
                  />
                  {errors.deviceName && (
                    <span className="text-sm font-medium text-red-500">
                      {errors.deviceName.message}
                    </span>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label
                    htmlFor="deviceLabel"
                    className="text-base font-bold text-text-main"
                  >
                    Etiket
                  </Label>
                  <Input
                    id="deviceLabel"
                    {...register("deviceLabel")}
                    placeholder="Örn: Depo 1"
                    className="h-14 px-4 text-base text-black bg-white/90 border-gray-200 focus-visible:ring-halo-600 shadow-sm placeholder:text-gray-400"
                  />
                </div>

                {/* Cihaz Profili */}
                <div className="grid gap-2">
                  <Label
                    htmlFor="deviceProfile"
                    className="text-base font-bold text-text-main"
                  >
                    Cihaz Profili <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <select
                      id="deviceProfile"
                      {...register("deviceProfile")}
                      className="flex h-14 w-full rounded-md border border-gray-200 bg-white/90 px-4 py-2 text-base text-black shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-halo-600 cursor-pointer appearance-none"
                    >
                      <option value="" disabled>
                        Seçiniz...
                      </option>
                      <option value="termostat">Termostat</option>
                      <option value="sensor">Sıcaklık Sensörü</option>
                    </select>
                  </div>
                  {errors.deviceProfile && (
                    <span className="text-sm font-medium text-red-500">
                      {errors.deviceProfile.message}
                    </span>
                  )}
                </div>

                {/* Açıklama */}
                <div className="grid gap-2">
                  <Label
                    htmlFor="description"
                    className="text-base font-bold text-text-main"
                  >
                    Açıklama
                  </Label>
                  <Input
                    id="description"
                    {...register("description")}
                    placeholder="Cihaz hakkında kısa bilgi..."
                    className="h-14 px-4 text-base text-black bg-white/90 border-gray-200 focus-visible:ring-halo-600 shadow-sm placeholder:text-gray-400"
                  />
                </div>
              </div>
            )}

            {/* ADIM 2 */}
            {step === 2 && (
              <div className="space-y-8 slide-in-from-right-4 pt-4">
                <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl text-base text-blue-900 shadow-sm">
                  <strong className="block mb-2 text-base font-bold">
                    Dikkat:
                  </strong>
                  Aşağıdaki Access Token, cihazınızın bulut ile haberleşmesi
                  için kullanılan tek anahtardır. Lütfen bunu cihazınızın
                  ayarlarına kaydedin.
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-bold">
                    Access Token (Erişim Anahtarı)
                  </Label>
                  <div className="flex gap-3">
                    <Input
                      readOnly
                      value={currentToken}
                      className="h-16 text-xl font-mono bg-gray-100 border-gray-300 text-black tracking-wider shadow-inner focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-16 w-16 border-gray-400 hover:bg-gray-200 cursor-pointer"
                      onClick={copyToClipboard}
                      title="Kopyala"
                    >
                      {copied ? (
                        <Check className="h-8 w-8 text-green-600" />
                      ) : (
                        <Copy className="h-8 w-8 text-gray-700" />
                      )}
                    </Button>
                  </div>
                  <input type="hidden" {...register("accessToken")} />
                </div>
              </div>
            )}
          </div>

          {/* --- FOOTER --- */}
          <DialogFooter className="px-6 py-5 flex flex-row justify-end gap-3">
            {step === 1 ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="h-12 px-6 text-base border-gray-300 text-gray-600 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors cursor-pointer"
                >
                  İptal
                </Button>
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="h-12 px-8 text-base bg-gradient-to-r from-halo-600 to-halo-700 text-white shadow-md hover:shadow-halo-500/30 transition-all cursor-pointer"
                >
                  İleri
                  <ArrowRight className="ml-2 h-6 w-6" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="h-12 px-6 text-base border-gray-300 text-gray-600 bg-white hover:bg-gray-100 cursor-pointer"
                >
                  <ArrowLeft className="mr-2 h-6 w-6" />
                  Geri
                </Button>
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-12 px-8 text-base bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-green-600/30 transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Ekleniyor..." : "Tamamla"}
                    {!isSubmitting && <Check className="ml-2 h-6 w-6" />}
                  </Button>
                </div>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
