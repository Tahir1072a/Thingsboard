"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useForm } from "react-hook-form";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Parola en az 8 karakter içermelidir."),
    passwordConfirm: z.string().min(1, "Parola onayı alanı boş bırakılamaz."),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Parolalar eşleşmiyor",
    path: ["passwordConfirm"],
  });

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", passwordConfirm: "" },
  });

  const onSubmit = async (data) => {
    if (!uid || !token) {
      console.log("(uid veya token) eksik!");
      toast.error("Geçersiz reset bağlantısı.");
      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_GATEWAY_URL}/api/auth/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password: data.password,
            userId: uid,
            token: token,
          }),
        }
      );

      const responseData = await res.json();

      if (!res.ok) {
        toast.error(
          responseData.error || responseData.message || "Resetleme başarısız"
        );
        return;
      }

      toast.success(
        "Hesabınızın şifresi başarıyla aktive edilmiştir! Giriş yapabilirsiniz."
      );
      router.push("/login");
    } catch (err) {
      console.error("Resetleme hatası", err);
      toast.error("Bİr ağ hatası oluştu, lütfen daha sonra tekrar deneyin");
    }
  };

  if (!uid || !token) {
    return (
      <Card className="bg-transparent border-white/10">
        <CardContent className="pt-6">
          <p className="text-center text-red-400">
            Geçersiz veya eksik aktivasyon bağlantısı. Lütfen e-postanızdaki
            bağlantıyı kontrol edin.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-transparent border-white/10">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <p className="text-sm text-white/70">
            Hesabınız için lütfen yeni bir parola belirleyin.
          </p>
          <div className="space-y-2">
            <Label htmlFor="password">Yeni Parola</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="bg-white/[0.02] border-white/10 focus-visible:ring-spotify-400"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-red-400">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="passwordConfirm">Parolayı Onayla</Label>
            <Input
              id="passwordConfirm"
              type="password"
              placeholder="••••••••"
              className="bg-white/[0.02] border-white/10 focus-visible:ring-spotify-400"
              {...register("passwordConfirm")}
            />
            {errors.passwordConfirm && (
              <p className="text-sm text-red-400">
                {errors.passwordConfirm.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 rounded-xl bg-spotify-500 hover:bg-spotify-400 text-white"
          >
            {isSubmitting ? "Kaydediliyor..." : "Parolayı Sıfırla"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
