import mongoose, { Schema } from "mongoose";
import crypto from "crypto";

/**
 * Device (Cihaz) Modeli
 *
 * IoT cihazlarını temsil eden Mongoose şeması.
 * Her cihaz benzersiz bir accessToken'a sahiptir.
 */
const DeviceSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId zorunludur."],
      index: true,
    },

    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: [true, "tenantId zorunludur."],
      index: true,
    },

    name: {
      type: String,
      required: [true, "Cihaz adı zorunludur."],
      trim: true,
      maxlength: [200, "Cihaz adı en fazla 200 karakter olabilir."],
    },

    profile: {
      type: Schema.Types.ObjectId,
      ref: "DeviceProfile",
      default: null,
    },

    tag: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: {
        values: ["active", "inactive"],
        message: "Durum 'active' veya 'inactive' olmalıdır.",
      },
      default: "inactive",
    },

    isGateway: {
      type: Boolean,
      default: false,
    },

    isPublic: {
      type: Boolean,
      default: false,
    },

    // Kimlik doğrulama yöntemi
    authType: {
      type: String,
      enum: ["TOKEN", "X509"],
      default: "TOKEN",
    },

    // Cihazın sisteme kimliğini kanıtlaması için benzersiz erişim anahtarı.
    // authType === "TOKEN" olan cihazlar için otomatik üretilir.
    accessToken: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    // X.509 sertifika parmak izi (SHA-256 hash).
    // authType === "X509" olan cihazlar için sertifika üretildiğinde kaydedilir.
    certificateFingerprint: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    additionalInfo: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },

    // Cihaz bazlı alarm kuralları (profil kurallarına ek olarak)
    alarms: [
      {
        alarmType: { type: String, required: true },
        severity: {
          type: String,
          enum: ["CRITICAL", "MAJOR", "MINOR", "WARNING"],
          default: "MAJOR",
        },
        createCondition: { type: String, required: true },
        clearCondition: { type: String, default: "" },
        timeWindow: {
          enabled: { type: Boolean, default: false },
          durationSeconds: { type: Number, default: 300 },
          triggerCount: { type: Number, default: 3 },
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true },
  }
);

/* ------------------------------------------------------------------ */
/* İndeksler                                                            */
/* ------------------------------------------------------------------ */
DeviceSchema.index({ name: "text", tag: "text" });
DeviceSchema.index({ tenantId: 1, name: 1 });
DeviceSchema.index({ tenantId: 1, profile: 1, status: 1 });
DeviceSchema.index({ isGateway: 1 });

/* ------------------------------------------------------------------ */
/* Hooks                                                                */
/* ------------------------------------------------------------------ */

// Yeni cihaz oluşturulurken authType'a göre accessToken üret
DeviceSchema.pre("validate", function (next) {
  if (this.authType === "X509") {
    // X509 cihazlarında token gerekmez
    this.accessToken = undefined;
  } else if (!this.accessToken) {
    // TOKEN cihazlarında otomatik üret
    this.accessToken = crypto.randomBytes(32).toString("base64url");
  }
  next();
});

/* ------------------------------------------------------------------ */
/* Virtuals                                                             */
/* ------------------------------------------------------------------ */
DeviceSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

/* ------------------------------------------------------------------ */
/* Statics                                                              */
/* ------------------------------------------------------------------ */

/**
 * Access token ile cihazı bul (telemetri doğrulama için).
 * @param {string} token
 * @returns {Promise<Object|null>}
 */
DeviceSchema.statics.findByToken = function (token) {
  return this.findOne({ accessToken: token }).lean();
};

/* ------------------------------------------------------------------ */
/* Model                                                                */
/* ------------------------------------------------------------------ */
const Device = mongoose.models.Device || mongoose.model("Device", DeviceSchema);

export default Device;
