"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const loginSchema = z.object({
  email: z.email("Geçerli bir e-posta adresi girin."),
  password: z.string().min(1, "Parola boş olamaz."),
});

// Google OAuth hata mesajları
const AUTH_ERROR_MESSAGES = {
  UnregisteredUser: "Bu e-posta ile kayıtlı bir hesap bulunamadı. Lütfen önce kayıt olun ve organizasyonunuzu oluşturun.",
  AccountDisabled: "Hesabınız devre dışı bırakılmış. Yöneticinizle iletişime geçin.",
  NoTenant: "Hesabınız bir organizasyona bağlı değil. Lütfen yöneticinizle iletişime geçin.",
};

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = "/dashboard";
  const authError = searchParams.get("error");

  // Google OAuth hata mesajlarını göster
  useEffect(() => {
    if (authError && AUTH_ERROR_MESSAGES[authError]) {
      toast.error(AUTH_ERROR_MESSAGES[authError], { duration: 6000 });
      // URL'den error parametresini temizle
      router.replace("/login", { scroll: false });
    }
  }, [authError, router]);

  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors, isSubmitting: isLoginSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // --- E-POSTA/ŞİFRE SUBMIT ---
  const onSubmitLogin = async (data) => {
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false, // Sayfa yenilemesiz sonuç al
      });

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      if (result?.ok) {
        toast.success("Giriş başarılı!");
        router.push(callbackUrl);
        router.refresh(); // Layout'u yenile (session güncelle)
      }
    } catch (err) {
      console.error(err);
      toast.error("Ağ hatası, lütfen tekrar deneyin.");
    }
  };

  // --- GOOGLE LOGIN ---
  const handleGoogleLogin = async () => {
    try {
      await signIn("google", { callbackUrl });
    } catch (error) {
      console.error("Google Auth Hatası:", error);
      toast.error("Google ile giriş yapılamadı.");
    }
  };

  return (
    <Card className="bg-transparent border-white/10">
      <CardContent className="pt-6">
        <form
          onSubmit={handleLoginSubmit(onSubmitLogin)}
          className="space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@domain.com"
              className="bg-white/[0.02] border-white/10 focus-visible:ring-red-600"
              {...registerLogin("email")}
            />
            {loginErrors.email && (
              <p className="text-sm text-red-400">
                {loginErrors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Parola</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="bg-white/[0.02] border-white/10 focus-visible:ring-red-600"
              {...registerLogin("password")}
            />
            {loginErrors.password && (
              <p className="text-sm text-red-400">
                {loginErrors.password.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Link
              href="/forgot-password"
              className="text-sm text-red-400 underline-offset-4 hover:underline"
            >
              Parolanı mı unuttun?
            </Link>
          </div>

          <Button
            type="submit"
            disabled={isLoginSubmitting}
            className="w-full h-11 rounded-xl bg-linear-to-r from-rose-950 via-red-600 to-rose-950 text-white"
          >
            {isLoginSubmitting ? "Gönderiliyor..." : "Giriş Yap"}
          </Button>
        </form>

        {/* Ayırıcı */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#0a0a0a] px-2 text-white/40">veya</span>
          </div>
        </div>

        {/* Google ile Giriş */}
        <Button
          type="button"
          onClick={handleGoogleLogin}
          variant="outline"
          className="w-full h-11 rounded-xl bg-white/5 border-white/10 text-white hover:bg-white/10"
        >
          <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google ile devam et
        </Button>
      </CardContent>
    </Card>
  );
}
