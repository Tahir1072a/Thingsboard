import mongoose, { Schema } from "mongoose";

/**
 * Attribute (Öznitelik) Modeli
 *
 * Varlık özniteliklerini (Cihaz ve Asset) 3 farklı scope'ta saklar:
 * - SERVER_SCOPE: Sunucu tarafı (platform tarafından yönetilir)
 * - CLIENT_SCOPE: İstemci tarafı (cihaz tarafından gönderilir)
 * - SHARED_SCOPE: Paylaşılan (platform yazar, cihaz okur)
 */
const AttributeSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: [true, "tenantId zorunludur."],
      index: true,
    },

    entityType: {
      type: String,
      enum: ["DEVICE", "ASSET"],
      default: "DEVICE",
    },

    entityId: {
      type: Schema.Types.ObjectId,
      required: [true, "entityId zorunludur."],
      index: true,
    },

    scope: {
      type: String,
      enum: {
        values: ["CLIENT_SCOPE", "SERVER_SCOPE", "SHARED_SCOPE"],
        message: "Scope CLIENT_SCOPE, SERVER_SCOPE veya SHARED_SCOPE olmalıdır.",
      },
      required: [true, "scope zorunludur."],
    },

    key: {
      type: String,
      required: [true, "key zorunludur."],
      trim: true,
      maxlength: [255, "Anahtar en fazla 255 karakter olabilir."],
    },

    value: {
      type: Schema.Types.Mixed,
      required: true,
    },

    valueType: {
      type: String,
      enum: ["STRING", "BOOLEAN", "LONG", "DOUBLE", "JSON"],
      default: "STRING",
    },

    lastUpdateTs: {
      type: Date,
      default: Date.now,
    },
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
// Benzersiz: Bir cihazın aynı scope ve key'de tek bir attribute'u olabilir
AttributeSchema.index({ tenantId: 1, entityId: 1, scope: 1, key: 1 }, { unique: true });
AttributeSchema.index({ entityId: 1, scope: 1 });
AttributeSchema.index({ key: "text" });

/* ------------------------------------------------------------------ */
/* Statics                                                              */
/* ------------------------------------------------------------------ */

/**
 * Bir cihazın belirtilen scope'daki tüm attribute'larını getir.
 */
AttributeSchema.statics.getByScope = function (entityId, scope) {
  return this.find({ entityId, scope }).sort({ key: 1 }).lean();
};

/**
 * Attribute upsert — aynı key varsa güncelle, yoksa oluştur.
 */
AttributeSchema.statics.upsertAttribute = async function (tenantId, entityId, scope, key, value, entityType = "DEVICE") {
  const valueType = detectValueType(value);
  return this.findOneAndUpdate(
    { tenantId, entityId, scope, key },
    {
      $set: {
        value,
        valueType,
        lastUpdateTs: new Date(),
      },
      $setOnInsert: { tenantId, entityId, entityType, scope, key },
    },
    { upsert: true, new: true, lean: true }
  );
};

/**
 * Birden fazla attribute'u aynı anda upsert et.
 */
AttributeSchema.statics.upsertMany = async function (tenantId, entityId, scope, attributes, entityType = "DEVICE") {
  const ops = Object.entries(attributes).map(([key, value]) => ({
    updateOne: {
      filter: { tenantId, entityId, scope, key },
      update: {
        $set: {
          value,
          valueType: detectValueType(value),
          lastUpdateTs: new Date(),
        },
        $setOnInsert: { tenantId, entityId, entityType, scope, key },
      },
      upsert: true,
    },
  }));

  if (ops.length > 0) {
    await this.bulkWrite(ops);
  }

  return this.find({ entityId, scope }).sort({ key: 1 }).lean();
};

/**
 * Belirtilen key'leri sil.
 */
AttributeSchema.statics.deleteKeys = function (tenantId, entityId, scope, keys) {
  return this.deleteMany({ tenantId, entityId, scope, key: { $in: keys } });
};

/* ------------------------------------------------------------------ */
/* Virtuals                                                             */
/* ------------------------------------------------------------------ */
AttributeSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

/**
 * Değerin tipini otomatik algıla.
 */
function detectValueType(value) {
  if (typeof value === "boolean") return "BOOLEAN";
  if (typeof value === "number") {
    return Number.isInteger(value) ? "LONG" : "DOUBLE";
  }
  if (typeof value === "object" && value !== null) return "JSON";
  return "STRING";
}

/* ------------------------------------------------------------------ */
/* Model                                                                */
/* ------------------------------------------------------------------ */
const Attribute =
  mongoose.models.Attribute || mongoose.model("Attribute", AttributeSchema);

export default Attribute;
