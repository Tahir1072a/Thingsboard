import mongoose, { Schema } from "mongoose";

/**
 * Tenant (Kiracı / Organizasyon) Modeli
 *
 * Multi-tenant mimaride her organizasyonu temsil eder.
 * Tüm veri modelleri (Device, DeviceProfile, Dashboard, Alarm, Telemetry)
 * bir tenant'a bağlıdır ve tenant bazında izole edilir.
 */
const TenantSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Organizasyon adı zorunludur."],
      trim: true,
      maxlength: [200, "Organizasyon adı en fazla 200 karakter olabilir."],
    },

    slug: {
      type: String,
      required: [true, "Slug zorunludur."],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, "Slug yalnızca küçük harf, rakam ve tire içerebilir."],
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    // Abonelik planı
    plan: {
      type: String,
      enum: ["FREE", "PRO", "ENTERPRISE"],
      default: "FREE",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // Tenant ayarları
    settings: {
      timezone: { type: String, default: "Europe/Istanbul" },
      language: { type: String, default: "tr" },
      logo: { type: String, default: null },
      maxDevices: { type: Number, default: 100 },
      maxUsers: { type: Number, default: 20 },
    },

    // Oluşturan kullanıcı (SYSTEM_ADMIN veya ilk kaydolan)
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true },
  }
);

/* ------------------------------------------------------------------ */
/* Virtuals                                                             */
/* ------------------------------------------------------------------ */
TenantSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

/* ------------------------------------------------------------------ */
/* Indexes                                                              */
/* ------------------------------------------------------------------ */
TenantSchema.index({ isActive: 1 });
TenantSchema.index({ name: "text" });

/* ------------------------------------------------------------------ */
/* Model                                                                */
/* ------------------------------------------------------------------ */
const Tenant =
  mongoose.models.Tenant || mongoose.model("Tenant", TenantSchema);

export default Tenant;
