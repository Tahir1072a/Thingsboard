/**
 * getSessionUser.js
 *
 * API route'larında oturumdaki kullanıcının ID'sini ve rolünü döndüren yardımcı fonksiyon.
 * Session yoksa veya geçersizse hata fırlatır.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Oturumdaki kullanıcının ID'sini ve rolünü döndürür.
 * @returns {Promise<{userId: string, role: string}>}
 * @throws {Error} Oturum yoksa
 */
export async function getSessionUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    const error = new Error("Yetkisiz. Lütfen giriş yapın.");
    error.statusCode = 401;
    throw error;
  }

  return {
    userId: session.user.id,
    role: session.user.role || "VIEWER",
  };
}
