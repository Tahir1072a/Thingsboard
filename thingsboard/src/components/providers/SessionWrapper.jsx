"use client";

/**
 * SessionWrapper — NextAuth SessionProvider'ı client bileşeni olarak sarmalamak için.
 * Root layout server component olduğundan, SessionProvider'ı burada ayrı client bileşen olarak export ediyoruz.
 *
 * refetchInterval: Session geçerliliğini periyodik olarak kontrol eder (5 dk).
 * refetchOnWindowFocus: Sekme/pencere odağı geldiğinde session'ı yeniler.
 */

import { SessionProvider } from "next-auth/react";

export default function SessionWrapper({ children }) {
  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={true}>
      {children}
    </SessionProvider>
  );
}
