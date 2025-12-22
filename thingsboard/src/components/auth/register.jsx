"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// En basit hali ile şema tanımlama
const registerSchema = z.object({
  organizationName: z.string(),
  admin: z.object({
    email: z.email(),
    firstName: z.string(),
    lastName: z.string(),
    phone: z.string(),
  }),
});

// TODO: Register jsx kısmı yapılacak...!
export default function RegisterForm() {
  const router = useRouter(); // Login'e yönlendirme yapmak için
  const [serverError, setServerError] = useState(null); // API hataları için bu state'ti kullancağız.
  const [ok, setOk] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      organizationName: "",
      admin: {
        email: "",
        firstName: "",
        lastName: "",
        phone: "",
      },
    },
  });

  const onSubmit = async (data) => {
    setServerError("");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_GATEWAY_URL}/api/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      console.log(res);
      const responseData = await res.json();

      if (!res.ok) {
        setServerError(responseData?.error ?? "Kayıt başarısız");
      } else {
        setOk(true);
      }
    } catch (err) {
      setServerError(err.message ?? "Ağ hatası");
    }
  };

  return (
    <Card className="bg-transparent border-white/10">
      <CardContent className="pt-6">
        {ok ? (
          // BAŞARI DURUMU EKRANI
          <div className="space-y-2 text-center">
            <h3 className="text-xl font-semibold text-spotify-400">
              Kayıt Başarılı!
            </h3>
            <p className="text-white/90">
              Aktivasyon e-postası adresinize gönderildi. Lütfen gelen kutunuzu
              kontrol edin.
            </p>

            <Button
              onClick={() => router.push("/login")}
              className="w-full mt-4 h-11 rounded-xl bg-spotify-500 hover:bg-spotify-400 text-white"
            >
              Giriş Yap
            </Button>
          </div>
        ) : (
          // FORM EKRANI
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="org">Organizasyon Adı</Label>
              <Input
                id="org"
                type="text"
                {...register("organizationName")}
                placeholder="Örn. Pengona A.Ş."
                className="bg-white/5 border-white/20 focus-visible:ring-spotify-400"
              />
              {/* Zod hata mesajı */}
              {errors.organizationName && (
                <p className="text-sm text-red-400">
                  {errors.organizationName.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first">Yönetici Adı</Label>
                <Input
                  id="first"
                  type="text"
                  {...register("admin.firstName")}
                  className="bg-white/5 border-white/20 focus-visible:ring-spotify-400"
                />
                {errors.admin?.firstName && (
                  <p className="text-sm text-red-400">
                    {errors.admin.firstName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last">Yönetici Soyadı</Label>
                <Input
                  id="last"
                  type="text"
                  {...register("admin.lastName")}
                  className="bg-white/5 border-white/20 focus-visible:ring-spotify-400"
                />
                {errors.admin?.lastName && (
                  <p className="text-sm text-red-400">
                    {errors.admin.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Yönetici E-postası</Label>
              <Input
                id="email"
                type="email"
                {...register("admin.email")} // RHF bağlandı (nested)
                placeholder="email@domain.com"
                className="bg-white/5 border-white/20 focus-visible:ring-spotify-400"
              />
              {errors.admin?.email && (
                <p className="text-sm text-red-400">
                  {errors.admin.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefon (opsiyonel)</Label>
              <Input
                id="phone"
                type="tel"
                {...register("admin.phone")} // RHF bağlandı (nested)
                placeholder="5xx xxx xx xx"
                className="bg-white/5 border-white/20 focus-visible:ring-spotify-400"
              />
              {errors.admin?.phone && (
                <p className="text-sm text-red-400">
                  {errors.admin.phone.message}
                </p>
              )}
            </div>

            {serverError && (
              <p className="text-sm text-red-400">{serverError}</p>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-xl bg-spotify-500 hover:bg-spotify-400 text-white"
            >
              {isSubmitting ? "Kaydediliyor..." : "Kaydı Tamamla"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
