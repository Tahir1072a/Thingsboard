/**
 * rbac.js — Rol Tabanlı Erişim Kontrolü (RBAC)
 *
 * Roller:
 * - ADMIN:    Tam yetki (kullanıcı yönetimi dahil)
 * - OPERATOR: Cihaz/profil/dashboard/alarm CRUD
 * - VIEWER:   Sadece okuma
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

// Rol hiyerarşisi (yetki seviyesi)
const ROLE_LEVEL = { ADMIN: 3, OPERATOR: 2, VIEWER: 1 };

// Rol etiketleri (Türkçe)
export const ROLE_LABELS = {
  ADMIN: "Yönetici",
  OPERATOR: "Operatör",
  VIEWER: "İzleyici",
};

/**
 * Oturum bilgilerini al (userId + role).
 * Session yoksa { userId: null, role: null } döner.
 */
export async function getSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { userId: null, role: null, session: null };
  }
  return {
    userId: session.user.id,
    role: session.user.role || "VIEWER",
    session,
  };
}

/**
 * Auth + rol kontrolü yapan middleware.
 * Başarılıysa { userId, role } döner.
 * Başarısızsa NextResponse (401/403) döner.
 *
 * @param {...string} allowedRoles - İzin verilen roller
 * @returns {Promise<{userId: string, role: string} | NextResponse>}
 */
export async function requireAuth(...allowedRoles) {
  const { userId, role } = await getSession();

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

  return { userId, role };
}

/**
 * Yazma yetkisi kontrolü (ADMIN veya OPERATOR)
 */
export async function requireWrite() {
  return requireAuth("ADMIN", "OPERATOR");
}

/**
 * Sadece ADMIN yetkisi
 */
export async function requireAdmin() {
  return requireAuth("ADMIN");
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

// Yardımcı fonksiyonlar
export const canWrite = (role) => ["ADMIN", "OPERATOR"].includes(role);
export const canManageUsers = (role) => role === "ADMIN";
export const canViewAuditLogs = (role) => ["ADMIN", "OPERATOR"].includes(role);
