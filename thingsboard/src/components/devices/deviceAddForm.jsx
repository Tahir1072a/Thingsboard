"use client";
import { cn } from "@/lib/utils";

import { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PlusCircle,
  Copy,
  Check,
  AlertCircle,
  Save,
  Fingerprint,
  ShieldCheck,
  KeyRound,
  Download,
} from "lucide-react";
import toast from "react-hot-toast";

const deviceSchema = z.object({
  name: z.string().min(2, "Cihaz adı en az 2 karakter olmalıdır."),
  tag: z.string().optional(),
  profile: z.string().min(1, "Lütfen bir profil seçiniz."),
  description: z.string().optional(),
  authType: z.enum(["TOKEN", "X509"]).default("TOKEN"),
  accessToken: z.string().optional(),
});

/**
 * Sertifika dosyalarını tek tek indirme yardımcısı
 */
function downloadFile(filename, content) {
  const blob = new Blob([content], { type: "application/x-pem-file" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AddDeviceModal({ open, onOpenChange, onDeviceAdded }) {
  const [activeTab, setActiveTab] = useState("general");
  const [copied, setCopied] = useState(false);

  const [loadingToken, setLoadingToken] = useState(false);
  const [deviceProfiles, setDeviceProfiles] = useState([]);

  // X.509 sertifika verileri (başarılı oluşturmadan sonra)
  const [certificates, setCertificates] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(deviceSchema),
    defaultValues: {
      name: "",
      tag: "",
      profile: "",
      description: "",
      authType: "TOKEN",
      accessToken: "",
    },
  });

  const accessToken = watch("accessToken");
  const authType = watch("authType");

  useEffect(() => {
    if (open) {
      reset();
      setActiveTab("general");
      setCertificates(null);
      generateToken();
      fetchDeviceProfiles();
    }
  }, [open, reset]);

  const onError = (errors) => {
    if (errors.name) {
      setActiveTab("general");
      toast.error("Genel bilgilerde bir hata var");
      return;
    }
  };

  // Cihazı yerel API'ye kaydet
  const onSubmit = useCallback(
    async (data) => {
      try {
        // X509 seçildiyse accessToken gönderme
        const payload = { ...data };
        if (payload.authType === "X509") {
          delete payload.accessToken;
        }

        const res = await fetch("/api/device", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.message || "Hata oluştu");

        // X.509 ise sertifikaları sakla ve modalı açık tut
        if (data.authType === "X509" && result.certificates) {
          setCertificates(result.certificates);
          toast.success("Cihaz oluşturuldu! Sertifikaları indirin.");
        } else {
          toast.success("Cihaz başarıyla sisteme kaydedildi!");
          onOpenChange(false);
        }

        // Cihaz listesini yenile
        if (onDeviceAdded) onDeviceAdded();
      } catch (error) {
        console.error("Device create error:", error);
        toast.error(error.message || "Bir hata oluştu");
      }
    },
    [onOpenChange, onDeviceAdded]
  );

  // Yerel API'den token üret
  const generateToken = useCallback(async () => {
    try {
      setLoadingToken(true);

      const res = await fetch("/api/device/token/generate");
      const data = await res.json();

      if (data.ok) {
        setValue("accessToken", data.data.token);
      }
    } catch (error) {
      console.error("Token generate error:", error);
      toast.error("Token oluşturulurken bir hata meydana geldi");
    } finally {
      setLoadingToken(false);
    }
  }, [setValue]);

  // Yerel API'den device profilleri çek
  const fetchDeviceProfiles = useCallback(async () => {
    try {
      const res = await fetch("/api/device-profile");
      const data = await res.json();

      if (data.ok) {
        setDeviceProfiles(data.data || []);
      }
    } catch (error) {
      console.error("Profile fetch error:", error);
      setDeviceProfiles([]);
    }
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(accessToken);
    setCopied(true);
    toast.success("Token kopyalandı!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Sertifika dosyalarını indir
  const downloadCertificates = () => {
    if (!certificates) return;
    downloadFile("device-key.pem", certificates.deviceKey);
    downloadFile("device-cert.pem", certificates.deviceCert);
    downloadFile("ca-cert.pem", certificates.caCert);
    toast.success("Sertifika dosyaları indiriliyor...");
  };

  // Sertifika indirme ekranı (cihaz başarıyla oluşturulduktan sonra)
  if (certificates) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass-strong sm:max-w-2xl p-0 overflow-hidden border-white/20 max-h-[90vh] flex flex-col">
          <DialogHeader className="bg-green-50/80 px-6 py-5 shrink-0">
            <DialogTitle className="flex items-center gap-3 text-xl font-bold text-green-800">
              <div className="p-2 bg-green-100 rounded-lg">
                <ShieldCheck className="h-6 w-6 text-green-600" />
              </div>
              Cihaz Oluşturuldu — Sertifikaları İndirin
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {/* Uyarı */}
            <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 shadow-sm">
              <p className="text-sm font-semibold mb-1">⚠️ Önemli Güvenlik Uyarısı</p>
              <p className="text-sm opacity-90 leading-relaxed">
                Bu sertifika dosyaları <strong>yalnızca bir kez</strong> indirilebilir.
                Modalı kapattıktan sonra <code className="bg-amber-100 px-1 rounded">device-key.pem</code> (Private Key)
                dosyasına tekrar erişemezsiniz. Lütfen dosyaları güvenli bir yerde saklayın.
              </p>
            </div>

            {/* Dosya listesi */}
            <div className="space-y-3">
              <Label className="text-base font-bold text-text-main">
                İndirilecek Dosyalar
              </Label>

              {[
                {
                  name: "device-key.pem",
                  desc: "Cihazın Private Key'i (GİZLİ — sadece cihazda tutulmalı)",
                  color: "red",
                },
                {
                  name: "device-cert.pem",
                  desc: "Cihazın Sertifikası (Kimlik belgesi)",
                  color: "blue",
                },
                {
                  name: "ca-cert.pem",
                  desc: "CA Sertifikası (Güven zinciri doğrulaması için)",
                  color: "green",
                },
              ].map((file) => (
                <div
                  key={file.name}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border shadow-sm",
                    file.color === "red" && "bg-red-50/60 border-red-200",
                    file.color === "blue" && "bg-blue-50/60 border-blue-200",
                    file.color === "green" && "bg-green-50/60 border-green-200"
                  )}
                >
                  <div className="p-2 bg-white rounded-lg shadow-sm shrink-0">
                    <KeyRound className={cn(
                      "h-5 w-5",
                      file.color === "red" && "text-red-500",
                      file.color === "blue" && "text-blue-500",
                      file.color === "green" && "text-green-500"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm font-semibold text-gray-800">{file.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{file.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Parmak İzi */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-500">
                Sertifika Parmak İzi (SHA-256)
              </Label>
              <Input
                readOnly
                value={certificates.fingerprint}
                className="h-12 text-xs font-mono bg-gray-100 border-gray-300 text-gray-600 tracking-wider select-all"
              />
            </div>
          </div>

          <DialogFooter className="bg-green-50/30 px-6 py-4 border-t border-white/10 shrink-0 flex flex-row justify-end gap-3 backdrop-blur-sm">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCertificates(null);
                onOpenChange(false);
              }}
              className="h-12 px-6 text-base border-gray-300 text-gray-600 bg-white hover:bg-gray-100"
            >
              Kapat
            </Button>
            <Button
              type="button"
              onClick={downloadCertificates}
              className="h-12 px-8 text-base bg-green-600 hover:bg-green-700 text-white shadow-md transition-all flex items-center"
            >
              Sertifikaları İndir
              <Download className="ml-2 h-5 w-5" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-2xl p-0 overflow-hidden border-white/20 max-h-[90vh] flex flex-col">
        <form
          onSubmit={handleSubmit(onSubmit, onError)}
          className="flex flex-col h-full overflow-hidden"
        >
          {/* --- HEADER --- */}
          <DialogHeader className="bg-halo-50/50 px-6 py-5 animate-fade-in shrink-0">
            <DialogTitle className="flex items-center gap-3 text-xl font-bold text-text-main">
              <div className="p-2 bg-halo-100 rounded-lg">
                <PlusCircle className="h-6 w-6 text-halo-600" />
              </div>
              Yeni Cihaz Ekle
            </DialogTitle>
          </DialogHeader>

          {/* --- CONTENT (TABS) --- */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              {/* TAB LISTESI */}
              <TabsList className="grid w-full grid-cols-2 mb-4">
                {/* 1. SEKME: Genel */}
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
                  {(errors.name || errors.profile) && (
                    <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />
                  )}
                </TabsTrigger>

                {/* 2. SEKME: Kimlik */}
                <TabsTrigger
                  value="identity"
                  className={cn(
                    "flex-1 text-center text-sm font-semibold py-2 rounded-lg transition-all duration-300 cursor-pointer flex items-center justify-center gap-4",
                    activeTab === "identity"
                      ? "bg-halo-600 text-white shadow-md"
                      : "text-gray-500 hover:text-gray-700 hover:bg-white/30"
                  )}
                >
                  <Fingerprint className="h-4 w-4" />
                  Kimlik ve Erişim
                </TabsTrigger>
              </TabsList>

              {/* --- TAB CONTENT 1: GENEL BİLGİLER --- */}
              <TabsContent
                value="general"
                className="space-y-5 slide-in-from-left-4 outline-none"
              >
                {/* Cihaz Adı */}
                <div className="space-y-2">
                  <Label className="text-base font-bold text-text-main">
                    Cihaz Adı <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Örn: Salon_Termostat_Main"
                    className={cn(
                      "h-14 px-4 text-base text-black bg-white/90 border-gray-200 focus-visible:ring-halo-600 shadow-sm placeholder:text-gray-400",
                      errors.name && "border-red-500 focus-visible:ring-red-500"
                    )}
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" /> {errors.name.message}
                    </p>
                  )}
                </div>

                {/* Profil Seçimi */}
                <div className="space-y-2">
                  <Label className="text-base font-bold text-text-main">
                    Cihaz Profili <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    name="profile"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="flex h-14 w-full px-4 py-6 rounded-md border border-gray-200 bg-white/90 text-base text-black shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-halo-600 cursor-pointer appearance-none">
                          <SelectValue placeholder="Profil Seçiniz..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white/95 backdrop-blur-xl border-gray-200 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2">
                          <SelectItem
                            value="default"
                            className="py-3 cursor-pointer focus:bg-halo-50"
                          >
                            Default Device Profile
                          </SelectItem>
                          {deviceProfiles.map((profile) => (
                            <SelectItem
                              key={profile._id}
                              value={profile._id}
                              className="py-3 cursor-pointer focus:bg-halo-50"
                            >
                              {profile.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.profile && (
                    <p className="text-red-500 text-xs flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />{" "}
                      {errors.profile.message}
                    </p>
                  )}
                </div>

                {/* Etiket */}
                <div className="space-y-2">
                  <Label className="text-base font-bold text-text-main">
                    Etiket
                  </Label>
                  <Input
                    {...register("tag")}
                    placeholder="Örn: Depo 1, Kat 2"
                    className="h-14 px-4 text-base text-black bg-white/90 border-gray-200 focus-visible:ring-halo-600 shadow-sm placeholder:text-gray-400"
                  />
                </div>

                {/* Açıklama */}
                <div className="space-y-2">
                  <Label className="text-base font-bold text-text-main">
                    Açıklama
                  </Label>
                  <Input
                    {...register("description")}
                    placeholder="Cihaz hakkında kısa bilgi..."
                    className="h-14 px-4 text-base text-black bg-white/90 border-gray-200 focus-visible:ring-halo-600 shadow-sm placeholder:text-gray-400"
                  />
                </div>
              </TabsContent>

              {/* --- TAB CONTENT 2: KİMLİK & ERİŞİM --- */}
              <TabsContent
                value="identity"
                className="space-y-6 slide-in-from-right-4 outline-none"
              >
                {/* Kimlik Doğrulama Yöntemi Seçimi */}
                <div className="space-y-3">
                  <Label className="text-base font-bold text-text-main">
                    Kimlik Doğrulama Yöntemi
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Token Seçeneği */}
                    <button
                      type="button"
                      onClick={() => setValue("authType", "TOKEN")}
                      className={cn(
                        "relative p-4 rounded-xl border-2 text-left transition-all duration-300 cursor-pointer group",
                        authType === "TOKEN"
                          ? "border-halo-500 bg-halo-50/80 shadow-md shadow-halo-500/10"
                          : "border-gray-200 bg-white/60 hover:border-gray-300 hover:bg-white/80"
                      )}
                    >
                      {authType === "TOKEN" && (
                        <div className="absolute top-3 right-3">
                          <Check className="h-5 w-5 text-halo-600" />
                        </div>
                      )}
                      <div className={cn(
                        "p-2 rounded-lg w-fit mb-3",
                        authType === "TOKEN" ? "bg-halo-100" : "bg-gray-100"
                      )}>
                        <KeyRound className={cn(
                          "h-5 w-5",
                          authType === "TOKEN" ? "text-halo-600" : "text-gray-400"
                        )} />
                      </div>
                      <p className={cn(
                        "font-semibold text-sm",
                        authType === "TOKEN" ? "text-halo-700" : "text-gray-700"
                      )}>
                        Erişim Anahtarı (Token)
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Basit ve hızlı bağlantı
                      </p>
                    </button>

                    {/* X.509 Seçeneği */}
                    <button
                      type="button"
                      onClick={() => setValue("authType", "X509")}
                      className={cn(
                        "relative p-4 rounded-xl border-2 text-left transition-all duration-300 cursor-pointer group",
                        authType === "X509"
                          ? "border-green-500 bg-green-50/80 shadow-md shadow-green-500/10"
                          : "border-gray-200 bg-white/60 hover:border-gray-300 hover:bg-white/80"
                      )}
                    >
                      {authType === "X509" && (
                        <div className="absolute top-3 right-3">
                          <Check className="h-5 w-5 text-green-600" />
                        </div>
                      )}
                      <div className={cn(
                        "p-2 rounded-lg w-fit mb-3",
                        authType === "X509" ? "bg-green-100" : "bg-gray-100"
                      )}>
                        <ShieldCheck className={cn(
                          "h-5 w-5",
                          authType === "X509" ? "text-green-600" : "text-gray-400"
                        )} />
                      </div>
                      <p className={cn(
                        "font-semibold text-sm",
                        authType === "X509" ? "text-green-700" : "text-gray-700"
                      )}>
                        X.509 Sertifika
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Endüstriyel güvenlik (mTLS)
                      </p>
                    </button>
                  </div>
                  {/* authType hidden input */}
                  <input type="hidden" {...register("authType")} />
                </div>

                {/* ─── TOKEN MODU ─── */}
                {authType === "TOKEN" && (
                  <>
                    {/* Bilgi Kartı */}
                    <div className="p-5 bg-blue-50/80 border border-blue-200 rounded-xl text-blue-900 shadow-sm flex gap-4 items-start">
                      <div className="p-2 bg-white rounded-lg shadow-sm shrink-0">
                        <Fingerprint className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <strong className="block mb-1 text-base font-bold">
                          Erişim Anahtarı (Token)
                        </strong>
                        <p className="text-sm opacity-90 leading-relaxed">
                          Cihazın sisteme veri göndermesi için bu anahtar zorunludur.
                          Güvenliğiniz için bu anahtarı şimdi kopyalayın.
                          Telemetri gönderirken <code className="bg-blue-100 px-1 rounded">X-Access-Token</code> header'ında gönderilmelidir.
                        </p>
                      </div>
                    </div>

                    {/* Token Gösterimi */}
                    <div className="space-y-3">
                      <Label className="text-base font-bold text-text-main">
                        Access Token
                      </Label>
                      <div className="relative group">
                        <Input
                          readOnly
                          value={
                            loadingToken
                              ? "Oluşturuluyor..."
                              : accessToken || "Bekleniyor..."
                          }
                          className="h-16 pr-16 text-lg font-mono bg-gray-100 border-gray-300 text-black tracking-wider shadow-inner focus-visible:ring-0 cursor-text select-all"
                        />
                        <div className="absolute right-2 top-2 h-12">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className={cn(
                              "h-12 w-12 rounded-lg hover:bg-white shadow-sm border border-transparent hover:border-gray-200 transition-all",
                              copied
                                ? "text-green-600 bg-green-50"
                                : "text-gray-500"
                            )}
                            onClick={copyToClipboard}
                            disabled={loadingToken || !accessToken}
                            title="Kopyala"
                          >
                            {copied ? (
                              <Check className="h-6 w-6" />
                            ) : (
                              <Copy className="h-6 w-6" />
                            )}
                          </Button>
                        </div>
                      </div>
                      {/* Hidden Input */}
                      <input type="hidden" {...register("accessToken")} />
                    </div>
                  </>
                )}

                {/* ─── X.509 MODU ─── */}
                {authType === "X509" && (
                  <div className="p-5 bg-green-50/80 border border-green-200 rounded-xl text-green-900 shadow-sm flex gap-4 items-start">
                    <div className="p-2 bg-white rounded-lg shadow-sm shrink-0">
                      <ShieldCheck className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <strong className="block mb-1 text-base font-bold">
                        X.509 Sertifika Tabanlı Doğrulama
                      </strong>
                      <p className="text-sm opacity-90 leading-relaxed">
                        Cihaz kaydedildiğinde platform otomatik olarak bir sertifika çifti üretecektir.
                        Üretilen <code className="bg-green-100 px-1 rounded">device-key.pem</code>,{" "}
                        <code className="bg-green-100 px-1 rounded">device-cert.pem</code> ve{" "}
                        <code className="bg-green-100 px-1 rounded">ca-cert.pem</code> dosyalarını
                        indirip cihazınıza yüklemeniz gerekecektir.
                      </p>
                      <p className="text-xs text-green-600 mt-2 font-semibold">
                        🔒 Cihaz MQTTS (port 8883) üzerinden TLS ile bağlanacaktır.
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* --- FOOTER --- */}
          <DialogFooter className="bg-halo-50/30 px-6 py-4 border-t border-white/10 shrink-0 flex flex-row justify-end gap-3 backdrop-blur-sm">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-12 px-6 text-base border-gray-300 text-gray-600 bg-white hover:bg-gray-100"
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || (authType === "TOKEN" && loadingToken)}
              className="h-12 px-8 text-base bg-halo-600 hover:bg-halo-700 text-white shadow-md hover:shadow-halo-600/30 transition-all flex items-center"
            >
              {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
              {!isSubmitting && <Save className="ml-2 h-5 w-5" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
