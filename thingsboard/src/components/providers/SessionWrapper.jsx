"use client";

/**
 * SessionWrapper — NextAuth SessionProvider'ı client bileşeni olarak sarmalamak için.
 * Root layout server component olduğundan, SessionProvider'ı burada ayrı client bileşen olarak export ediyoruz.
 */

import { SessionProvider } from "next-auth/react";

export default function SessionWrapper({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}
