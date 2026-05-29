"use client";

/**
 * AuthGuard — Korumalı sayfalarda oturum kontrolü yapan client bileşen.
 *
 * Session durumunu izler:
 * - "loading"         → Loading spinner gösterir
 * - "unauthenticated" → /login sayfasına yönlendirir
 * - "authenticated"   → children'ı render eder
 *
 * Bu bileşen (main)/layout.jsx içinde kullanılır.
 * Middleware zaten server-side redirect yapıyor, bu bileşen
 * client-side navigation sırasında session süresi dolunca ek koruma sağlar.
 */

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function AuthGuard({ children }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }
  }, [status, router, pathname]);

  if (status === "loading") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-red-500" />
          <p className="text-sm text-white/40">Oturum doğrulanıyor…</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return children;
}
