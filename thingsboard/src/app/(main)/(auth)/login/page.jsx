"use client";

import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import MarketingPanel from "@/components/auth/marketingPanel";
import LoginForm from "@/components/auth/login";

export default function LoginPage() {
  const loginFeatures = [
    "Hızlı ve güvenli oturum",
    "MFA (TOTP) desteği",
    "Tenant bazlı izolasyon",
    "Şifre sıfırlama / davet akışları",
    "Yüksek erişilebilirlik",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-spotify-900 via-spotify-800 to-spotify-700 text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 rounded-2xl shadow-2xl overflow-hidden border border-white/10 bg-muted/10 backdrop-blur-sm">
        <MarketingPanel
          title="IoT cihazlarınızı tek bir yerden yönetin! <br /> Auth for your Things."
          description="Premium güvenlik ve sorunsuz giriş deneyimi."
          features={loginFeatures}
        />

        {/* SAĞ PANEL: Form Alanı */}
        <div className="bg-auth-card text-auth-foreground p-6 sm:p-10">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-spotify-500/90" />
              <span className="font-semibold tracking-tight">
                Pengona Things
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="opacity-80">Hesabın yok mu?</span>{" "}
              <Link
                href="/register"
                className="text-spotify-400 hover:text-spotify-300 underline-offset-4 hover:underline"
              >
                Kayıt ol
              </Link>
            </div>
          </div>
          <Separator className="mb-6 opacity-20" />

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
