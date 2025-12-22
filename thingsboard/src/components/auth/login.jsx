"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

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

const mfaSchema = z.object({
  mfaCode: z.string().min(1, "MFA kodu boş olamaz."),
});

export default function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [mfaToken, setMfaToken] = useState();

  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors, isSubmitting: isLoginSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const {
    register: registerMfa,
    handleSubmit: handleMfaSubmit,
    formState: { errors: mfaErrors, isSubmitting: isMfaSubmitting }, // Doğru değişken adı 'isMfaSubmitting'
  } = useForm({
    resolver: zodResolver(mfaSchema),
    defaultValues: { mfaCode: "" },
  });

  const onSubmitLogin = async (data) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_GATEWAY_URL}/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );

      const responseData = await res.json();
      if (!res.ok) {
        console.log(responseData);
        toast.error(responseData.error || "Giriş başarısız");
        return;
      }

      if (responseData.mfaRequired) {
        setMfaToken(responseData.mfaToken);
        setStep(2);
      } else {
        handleSuccesfullyLogin(responseData.token, responseData.user);
      }
    } catch (err) {
      console.log(err);
      toast.error(err.message || "Ağ hatası, lütfen tekrar deneyin.");
    }
  };

  const onSubmitMfa = async (data) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_GATEWAY_URL}/api/auth/login/mfa`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mfaToken: mfaToken, mfaCode: data.mfaCode }),
        }
      );

      const responseData = await res.json();

      if (!res.ok) {
        toast.error(responseData.error || "MFA doğrulaması başarısız");
        return;
      }

      handleSuccesfullyLogin(responseData.token, responseData.user);
    } catch (err) {
      console.log(err);
      toast.error(err.message || "Ağ hatası, lütfen tekrar deneyin.");
    }
  };

  function handleSuccesfullyLogin(token, user) {
    localStorage.setItem("authToken", token);
    localStorage.setItem("user", JSON.stringify(user));
    router.push("/");
  }

  return (
    <Card className="bg-transparent border-white/10">
      <CardContent className="pt-6">
        {step === 1 ? (
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
                className="bg-white/[0.02] border-white/10 focus-visible:ring-spotify-400"
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
                className="bg-white/[0.02] border-white/10 focus-visible:ring-spotify-400"
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
                className="text-sm text-spotify-400 hover:text-spotify-300 underline-offset-4 hover:underline"
              >
                Parolanı mı unuttun?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={isLoginSubmitting}
              className="w-full h-11 rounded-xl bg-spotify-500 hover:bg-spotify-400 text-white"
            >
              {isLoginSubmitting ? "Gönderiliyor..." : "Giriş Yap"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleMfaSubmit(onSubmitMfa)} className="space-y-5">
            <p className="text-sm text-white/70">
              Bu hesap için MFA etkin. Lütfen Authenticator uygulamasındaki 6
              haneli kodu veya yedek kodlarından birini gir.
            </p>

            <div className="space-y-2">
              <Label htmlFor="mfa">MFA Kodu</Label>
              <Input
                id="mfa"
                type="text"
                placeholder="123456 veya yedek-kod"
                className="bg-white/[0.02] border-white/10 focus-visible:ring-spotify-400"
                {...registerMfa("mfaCode")}
              />
              {mfaErrors.mfaCode && (
                <p className="text-sm text-red-400">
                  {mfaErrors.mfaCode.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isMfaSubmitting || !mfaToken}
              className="w-full h-11 rounded-xl bg-spotify-500 hover:bg-spotify-400 text-white"
            >
              {isMfaSubmitting ? "Doğrulanıyor..." : "Doğrula ve Giriş Yap"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
