import mongoose, { Schema } from "mongoose";

/**
 * AuditLog (Denetim Günlüğü) Modeli
 *
 * Kullanıcı aksiyonlarını, cihaz olaylarını ve güvenlik olaylarını
 * merkezi olarak kaydeder. 90 gün sonra otomatik silinir (TTL).
 */
const AuditLogSchema = new Schema(
  {
    // ── Kim? ──
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId zorunludur."],
      index: true,
    },

    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      default: null,
      index: true,
    },

    // ── Ne yaptı? ──
    action: {
      type: String,
      required: [true, "action zorunludur."],
      enum: [
        // Kullanıcı aksiyonları
        "DEVICE_CREATE",
        "DEVICE_UPDATE",
        "DEVICE_DELETE",
        "PROFILE_CREATE",
        "PROFILE_UPDATE",
        "PROFILE_DELETE",
        "DASHBOARD_CREATE",
        "DASHBOARD_UPDATE",
        "DASHBOARD_DELETE",
        "ALARM_ACKNOWLEDGE",
        "ALARM_CLEAR",
        // Auth olayları
        "USER_LOGIN",
        "USER_LOGOUT",
        "USER_REGISTER",
        "PASSWORD_RESET",
        "LOGIN_FAILED",
        // Cihaz olayları
        "INACTIVE_DEVICE_REJECTED",
        "AUTH_FAILED",
        "SECURITY_ALERT",
        "TRANSPORT_MISMATCH",
        // Kullanıcı yönetimi
        "USER_CREATE",
        "USER_UPDATE",
        "USER_DELETE",
        "USER_ACTIVATE",
        // Alarm yönetimi
        "ALARM_DELETE",
        // Token yönetimi
        "DEVICE_TOKEN_GENERATED",
      ],
      index: true,
    },

    // ── Hangi kaynak? ──
    entityType: {
      type: String,
      enum: ["DEVICE", "DEVICE_PROFILE", "DASHBOARD", "ALARM", "USER", "TENANT"],
      required: [true, "entityType zorunludur."],
      index: true,
    },

    entityId: {
      type: Schema.Types.ObjectId,
      default: null,
    },

    entityName: {
      type: String,
      default: "",
      trim: true,
    },

    // ── Sonuç ──
    status: {
      type: String,
      enum: ["SUCCESS", "FAILURE"],
      default: "SUCCESS",
    },

    // ── Detaylar (esnek yapı) ──
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },

    // ── Ne zaman? ──
    timestamp: {
      type: Date,
      default: () => new Date(),
    },
  },
  {
    timestamps: false,
    collection: "audit_logs",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ------------------------------------------------------------------ */
/* İndeksler                                                            */
/* ------------------------------------------------------------------ */

// Kullanıcının kendi loglarını tarihe göre sorgulama
AuditLogSchema.index({ userId: 1, timestamp: -1 });

// Aksiyon türüne göre filtreleme
AuditLogSchema.index({ userId: 1, action: 1, timestamp: -1 });

// Kaynak türüne göre filtreleme
AuditLogSchema.index({ userId: 1, entityType: 1, timestamp: -1 });

// 90 gün sonra otomatik silme (TTL)
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

/* ------------------------------------------------------------------ */
/* Model                                                                */
/* ------------------------------------------------------------------ */
const AuditLog =
  mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);

export default AuditLog;
