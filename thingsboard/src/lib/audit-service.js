/**
 * audit-service.js — Merkezi Denetim Günlüğü Servisi
 *
 * Tüm API route'lardan ve server.mjs'den çağrılarak
 * kullanıcı aksiyonlarını, cihaz olaylarını ve güvenlik
 * olaylarını AuditLog koleksiyonuna kaydeder.
 *
 * ÖNEMLİ: Bu servis asla hata fırlatmaz. Ana iş mantığını
 * engellemeden fire-and-forget çalışır.
 */

import connectDB from "./db.js";
import AuditLog from "../models/AuditLog.js";
import emitter from "./event-emitter.js";
import logger from "./logger.js";

/**
 * Denetim günlüğü kaydı oluşturur.
 * Hata durumunda sessizce loglar, asla throw etmez.
 */
export async function createAuditLog({
  userId,
  tenantId = null,
  action,
  entityType,
  entityId = null,
  entityName = "",
  status = "SUCCESS",
  details = {},
}) {
  try {
    await connectDB();

    const doc = await AuditLog.create({
      userId,
      tenantId,
      action,
      entityType,
      entityId,
      entityName,
      status,
      details,
      timestamp: new Date(),
    });

    // SSE üzerinden gerçek zamanlı bildirim gönder
    emitter.emit("audit-log", {
      _id: doc._id,
      userId: String(userId),
      tenantId: tenantId ? String(tenantId) : null,
      action,
      entityType,
      entityId: entityId ? String(entityId) : null,
      entityName,
      status,
      details,
      timestamp: doc.timestamp,
    });

    return doc;
  } catch (err) {
    // Audit log hatası ana işlemi ENGELLEMEMELİ
    logger.error({ err, action, entityType }, "Audit log kaydı oluşturulamadı");
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────
// Yardımcı fonksiyonlar — yaygın senaryolar için kısayollar
// ────────────────────────────────────────────────────────────────────

/**
 * Cihaz aksiyonu logla.
 */
export function auditDeviceAction(userId, action, device, details = {}, tenantId = null) {
  return createAuditLog({
    userId,
    tenantId,
    action,
    entityType: "DEVICE",
    entityId: device._id || device.id,
    entityName: device.name || "",
    details,
  });
}

/**
 * Profil aksiyonu logla.
 */
export function auditProfileAction(userId, action, profile, details = {}, tenantId = null) {
  return createAuditLog({
    userId,
    tenantId,
    action,
    entityType: "DEVICE_PROFILE",
    entityId: profile._id || profile.id,
    entityName: profile.name || "",
    details,
  });
}

/**
 * Dashboard aksiyonu logla.
 */
export function auditDashboardAction(userId, action, dashboard, details = {}, tenantId = null) {
  return createAuditLog({
    userId,
    tenantId,
    action,
    entityType: "DASHBOARD",
    entityId: dashboard._id || dashboard.id,
    entityName: dashboard.name || "",
    details,
  });
}

/**
 * Auth olayı logla.
 */
export function auditAuthEvent(action, userId, details = {}, tenantId = null) {
  return createAuditLog({
    userId,
    tenantId,
    action,
    entityType: "USER",
    entityId: userId,
    entityName: details.email || "",
    status: details.success === false ? "FAILURE" : "SUCCESS",
    details,
  });
}
