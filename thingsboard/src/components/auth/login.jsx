"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { GoogleLogin } from "@react-oauth/google";

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

  // --- E-POSTA/ŞİFRE SUBMIT ---
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

  // --- 2. ADIM: MFA SUBMIT ---
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
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    toast.success("Giriş başarılı!");
    router.push("/");
  }

  // --- GOOGLE LOGIN ---
  async function handleGoogleLogin(credentialResponse) {
    try {
      const idToken = credentialResponse.credential;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_GATEWAY_URL}/api/auth/google`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: idToken }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || data.message || "Google ile giriş başarısız."
        );
      }

      if (data.ok) {
        handleSuccesfullyLogin(data.token, data.user);
      }
    } catch (error) {
      console.error("Google Auth Hatası:", error);
      toast.error("Google ile giriş yapılamadı.");
    }
  }

  const handleGoogleError = () => {
    setError("Google penceresi kapandı veya bağlantı başarısız.");
  };

  return (
    <Card className="bg-transparent border-white/10">
      <CardContent className="pt-6">
        {step === 1 ? (
          <>
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

            {/* Ayırıcı (Divider) - Görsel olarak şık durması için */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#0a0a0a] px-2 text-white/40">veya</span>
              </div>
            </div>

            <div className="flex justify-center w-full">
              <GoogleLogin
                onSuccess={handleGoogleLogin}
                onError={() => toast.error("Google penceresi kapandı")}
                theme="filled_black"
                shape="pill"
                width="320"
                text="continue_with"
                locale="en"
              />
            </div>
          </>
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
