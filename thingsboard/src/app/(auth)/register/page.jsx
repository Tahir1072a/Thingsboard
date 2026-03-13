"use client";

import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import MarketingPanel from "@/components/auth/marketingPanel";
import RegisterForm from "@/components/auth/register";

export default function RegisterPage() {
  const registerFeatures = [
    "Hızlı ve güvenli tenant oluşturma",
    "Otomatik yönetici (admin) ataması",
    "E-posta ile aktivasyon akışı",
    "Şifre sıfırlama / davet akışları",
    "Yüksek erişilebilirlik",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-spotify-900 via-spotify-800 to-spotify-700 text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 rounded-2xl shadow-2xl overflow-hidden border border-white/10 bg-muted/10 backdrop-blur-sm">
        <MarketingPanel
          title="Yeni nesil IoT platformuna <br /> ilk adımınızı atın."
          description="Premium güvenlik ve sorunsuz kayıt deneyimi."
          features={registerFeatures}
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
              <span className="opacity-80">Hesabın var mı?</span>{" "}
              <Link
                href="/login"
                className="text-spotify-400 hover:text-spotify-300 underline-offset-4 hover:underline"
              >
                Giriş yap
              </Link>
            </div>
          </div>
          <Separator className="mb-6 opacity-20" />

          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
