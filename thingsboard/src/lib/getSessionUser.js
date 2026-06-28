/**
 * getSessionUser.js
 *
 * API route'larında oturumdaki kullanıcının ID'sini, rolünü ve tenantId'sini döndüren yardımcı fonksiyon.
 * Session yoksa veya geçersizse hata fırlatır.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "./auth.js";

/** Yazma yetkisi olan roller */
const WRITE_ROLES = ["SYSTEM_ADMIN", "TENANT_ADMIN", "OPERATOR"];

/**
 * Oturumdaki kullanıcının ID'sini, rolünü ve tenantId'sini döndürür.
 * @returns {Promise<{userId: string, role: string, tenantId: string|null, canWrite: boolean}>}
 * @throws {Error} Oturum yoksa
 */
export async function getSessionUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    const error = new Error("Yetkisiz. Lütfen giriş yapın.");
    error.statusCode = 401;
    throw error;
  }

  const role = session.user.role || "VIEWER";

  return {
    userId: session.user.id,
    role,
    tenantId: session.user.tenantId || null,
    canWrite: WRITE_ROLES.includes(role),
  };
}
