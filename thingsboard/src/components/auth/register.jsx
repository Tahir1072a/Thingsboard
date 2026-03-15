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
import toast from "react-hot-toast";

const registerSchema = z
  .object({
    organizationName: z.string().min(1, "Organizasyon adı zorunludur."),
    firstName: z.string().min(1, "Ad zorunludur."),
    lastName: z.string().min(1, "Soyad zorunludur."),
    email: z.email("Geçerli bir e-posta adresi girin."),
    phone: z.string().optional(),
    password: z.string().min(6, "Parola en az 6 karakter olmalıdır."),
    passwordConfirm: z.string().min(1, "Parola tekrarı zorunludur."),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Parolalar eşleşmiyor.",
    path: ["passwordConfirm"],
  });

export default function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState(null);
  const [ok, setOk] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      organizationName: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      passwordConfirm: "",
    },
  });

  const onSubmit = async (data) => {
    setServerError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          organizationName: data.organizationName,
        }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        setServerError(responseData?.error ?? "Kayıt başarısız");
      } else {
        setOk(true);
        toast.success("Kayıt başarılı!");
      }
    } catch (err) {
      setServerError(err.message ?? "Ağ hatası");
    }
  };

  return (
    <Card className="bg-transparent border-white/10">
      <CardContent className="pt-6">
        {ok ? (
          <div className="space-y-2 text-center">
            <h3 className="text-xl font-semibold text-green-400">
              Kayıt Başarılı!
            </h3>
            <p className="text-white/90">
              Hesabınız oluşturuldu. Şimdi giriş yapabilirsiniz.
            </p>
            <Button
              onClick={() => router.push("/login")}
              className="w-full mt-4 h-11 rounded-xl bg-linear-to-r from-rose-950 via-red-600 to-rose-950 text-white"
            >
              Giriş Yap
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="org">Organizasyon Adı</Label>
              <Input
                id="org"
                type="text"
                {...register("organizationName")}
                placeholder="Örn. Pengona A.Ş."
                className="bg-white/5 border-white/20 focus-visible:ring-red-600"
              />
              {errors.organizationName && (
                <p className="text-sm text-red-400">
                  {errors.organizationName.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first">Ad</Label>
                <Input
                  id="first"
                  type="text"
                  {...register("firstName")}
                  className="bg-white/5 border-white/20 focus-visible:ring-red-600"
                />
                {errors.firstName && (
                  <p className="text-sm text-red-400">
                    {errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last">Soyad</Label>
                <Input
                  id="last"
                  type="text"
                  {...register("lastName")}
                  className="bg-white/5 border-white/20 focus-visible:ring-red-600"
                />
                {errors.lastName && (
                  <p className="text-sm text-red-400">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="email@domain.com"
                className="bg-white/5 border-white/20 focus-visible:ring-red-600"
              />
              {errors.email && (
                <p className="text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefon (opsiyonel)</Label>
              <Input
                id="phone"
                type="tel"
                {...register("phone")}
                placeholder="5xx xxx xx xx"
                className="bg-white/5 border-white/20 focus-visible:ring-red-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Parola</Label>
                <Input
                  id="password"
                  type="password"
                  {...register("password")}
                  placeholder="••••••••"
                  className="bg-white/5 border-white/20 focus-visible:ring-red-600"
                />
                {errors.password && (
                  <p className="text-sm text-red-400">
                    {errors.password.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="passwordConfirm">Parola Tekrarı</Label>
                <Input
                  id="passwordConfirm"
                  type="password"
                  {...register("passwordConfirm")}
                  placeholder="••••••••"
                  className="bg-white/5 border-white/20 focus-visible:ring-red-600"
                />
                {errors.passwordConfirm && (
                  <p className="text-sm text-red-400">
                    {errors.passwordConfirm.message}
                  </p>
                )}
              </div>
            </div>

            {serverError && (
              <p className="text-sm text-red-400">{serverError}</p>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-xl bg-linear-to-r from-rose-950 via-red-600 to-rose-950 text-white"
            >
              {isSubmitting ? "Kaydediliyor..." : "Kaydı Tamamla"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
