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
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/5 bg-[#0a0a0a]">
        <MarketingPanel
          title="Yeni nesil IoT platformuna <br /> ilk adımınızı atın."
          description="Premium güvenlik ve sorunsuz kayıt deneyimi."
          features={registerFeatures}
        />

        {/* SAĞ PANEL: Form Alanı */}
        <div className="bg-[#0a0a0a] text-white p-6 sm:p-10">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white text-black rounded-lg flex items-center justify-center font-bold">
                T
              </div>
              <span className="font-semibold tracking-tight">
                Pengona Things
              </span>
            </div>
            <div className="text-sm text-gray-500">
              <span className="opacity-80">Hesabın var mı?</span>{" "}
              <Link
                href="/login"
                className="text-red-400 hover:underline underline-offset-4"
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
