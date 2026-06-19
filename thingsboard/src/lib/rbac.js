/**
 * rbac.js — Rol Tabanlı Erişim Kontrolü (RBAC) — Multi-Tenant
 *
 * Roller:
 * - SYSTEM_ADMIN: Platform yöneticisi (tenantId: null), tüm tenant'lara erişim
 * - TENANT_ADMIN: Tenant yöneticisi (kullanıcı yönetimi dahil)
 * - OPERATOR:     Cihaz/profil/dashboard/alarm CRUD
 * - VIEWER:       Sadece okuma
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

// Rol hiyerarşisi (yetki seviyesi)
const ROLE_LEVEL = { SYSTEM_ADMIN: 4, TENANT_ADMIN: 3, OPERATOR: 2, VIEWER: 1 };

// Rol etiketleri (Türkçe)
export const ROLE_LABELS = {
  SYSTEM_ADMIN: "Sistem Yöneticisi",
  TENANT_ADMIN: "Yönetici",
  OPERATOR: "Operatör",
  VIEWER: "İzleyici",
};

/**
 * Oturum bilgilerini al (userId + role + tenantId).
 * Session yoksa { userId: null, role: null, tenantId: null } döner.
 */
export async function getSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { userId: null, role: null, tenantId: null, session: null };
  }
  return {
    userId: session.user.id,
    role: session.user.role || "VIEWER",
    tenantId: session.user.tenantId || null,
    session,
  };
}

/**
 * Auth + rol kontrolü yapan middleware.
 * Başarılıysa { userId, role, tenantId } döner.
 * Başarısızsa NextResponse (401/403) döner.
 *
 * @param {...string} allowedRoles - İzin verilen roller
 * @returns {Promise<{userId: string, role: string, tenantId: string|null} | NextResponse>}
 */
export async function requireAuth(...allowedRoles) {
  const { userId, role, tenantId } = await getSession();

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Yetkisiz. Lütfen giriş yapın." },
      { status: 401 }
    );
  }

  // Rol kontrolü (allowedRoles boşsa sadece auth gerekli)
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return NextResponse.json(
      { ok: false, error: "Bu işlem için yetkiniz yok." },
      { status: 403 }
    );
  }

  return { userId, role, tenantId };
}

/**
 * Yazma yetkisi kontrolü (SYSTEM_ADMIN, TENANT_ADMIN veya OPERATOR)
 */
export async function requireWrite() {
  return requireAuth("SYSTEM_ADMIN", "TENANT_ADMIN", "OPERATOR");
}

/**
 * Tenant-level admin (TENANT_ADMIN veya SYSTEM_ADMIN)
 */
export async function requireTenantAdmin() {
  return requireAuth("SYSTEM_ADMIN", "TENANT_ADMIN");
}

/**
 * Sadece SYSTEM_ADMIN yetkisi (platform yönetimi)
 */
export async function requireSystemAdmin() {
  return requireAuth("SYSTEM_ADMIN");
}

/**
 * Herhangi bir oturum (tüm roller)
 */
export async function requireAnyAuth() {
  return requireAuth();
}

/**
 * Bir response NextResponse mı kontrol et (hata durumu)
 */
export function isAuthError(result) {
  return result instanceof NextResponse;
}

/**
 * Tenant filtresi oluştur.
 * SYSTEM_ADMIN tüm tenant'ları görebilir (boş filtre).
 * Diğer roller sadece kendi tenant'larını görür.
 *
 * @param {string|null} tenantId
 * @param {string} role
 * @returns {Object} MongoDB filtre objesi
 */
export function tenantFilter(tenantId, role) {
  if (role === "SYSTEM_ADMIN") return {};
  return { tenantId };
}

// Yardımcı fonksiyonlar
export const canWrite = (role) => ["SYSTEM_ADMIN", "TENANT_ADMIN", "OPERATOR"].includes(role);
export const canManageUsers = (role) => ["SYSTEM_ADMIN", "TENANT_ADMIN"].includes(role);
export const canViewAuditLogs = (role) => ["SYSTEM_ADMIN", "TENANT_ADMIN", "OPERATOR"].includes(role);
export const isSystemAdmin = (role) => role === "SYSTEM_ADMIN";
