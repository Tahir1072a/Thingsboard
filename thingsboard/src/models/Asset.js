import mongoose, { Schema } from "mongoose";

/**
 * Asset (Varlık) Modeli
 *
 * Fiziksel/mantıksal lokasyonları ve grupları temsil eder.
 * Zone, Building, Fleet, Line vb. tipler desteklenir.
 * ThingsBoard Asset kavramının karşılığıdır.
 */
const AssetSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: [true, "tenantId zorunludur."],
      index: true,
    },

    name: {
      type: String,
      required: [true, "Varlık adı zorunludur."],
      trim: true,
      maxlength: [200, "Varlık adı en fazla 200 karakter olabilir."],
    },

    type: {
      type: String,
      enum: {
        values: ["ZONE", "BUILDING", "FLEET", "LINE", "CUSTOM"],
        message: "Tip ZONE, BUILDING, FLEET, LINE veya CUSTOM olmalıdır.",
      },
      default: "CUSTOM",
    },

    label: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    // Zone tipi için polygon koordinatları
    polygon: [
      {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
      },
    ],

    // Zone görünüm ayarları
    zoneConfig: {
      color: { type: String, default: "#6941c6" },
      opacity: { type: Number, default: 0.25, min: 0, max: 1 },
      borderColor: { type: String, default: "#6941c6" },
      borderWidth: { type: Number, default: 2, min: 0, max: 10 },
    },

    // İlişkiler (cihaz-asset, asset-asset bağlantısı)
    relations: [
      {
        entityType: {
          type: String,
          enum: ["DEVICE", "ASSET"],
          required: true,
        },
        entityId: {
          type: Schema.Types.ObjectId,
          required: true,
        },
        relationType: {
          type: String,
          default: "Contains",
        },
      },
    ],

    additionalInfo: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
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
AssetSchema.index({ tenantId: 1, type: 1 });
AssetSchema.index({ tenantId: 1, name: 1 }, { unique: true });
AssetSchema.index({ "relations.entityId": 1 });

/* ------------------------------------------------------------------ */
/* Statics                                                              */
/* ------------------------------------------------------------------ */

/**
 * Tipe göre asset'leri getir.
 */
AssetSchema.statics.getByType = function (tenantId, type) {
  return this.find({ tenantId, type }).sort({ name: 1 }).lean();
};

/**
 * Sadece ZONE tipindeki asset'leri getir (harita için).
 */
AssetSchema.statics.getZones = function (tenantId) {
  return this.find({ tenantId, type: "ZONE" }).sort({ name: 1 }).lean();
};

/**
 * Asset'e ilişki ekle.
 */
AssetSchema.statics.addRelation = async function (assetId, entityType, entityId, relationType = "Contains") {
  return this.findByIdAndUpdate(
    assetId,
    {
      $addToSet: {
        relations: { entityType, entityId, relationType },
      },
    },
    { new: true, lean: true }
  );
};

/**
 * Asset'ten ilişki kaldır.
 */
AssetSchema.statics.removeRelation = async function (assetId, entityId) {
  return this.findByIdAndUpdate(
    assetId,
    {
      $pull: {
        relations: { entityId },
      },
    },
    { new: true, lean: true }
  );
};

/* ------------------------------------------------------------------ */
/* Virtuals                                                             */
/* ------------------------------------------------------------------ */
AssetSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

/* ------------------------------------------------------------------ */
/* Model                                                                */
/* ------------------------------------------------------------------ */
const Asset =
  mongoose.models.Asset || mongoose.model("Asset", AssetSchema);

export default Asset;
