import mongoose, { Schema } from "mongoose";

/**
 * RpcRequest — Sunucu ↔ Cihaz RPC İstek Modeli
 *
 * Server-side RPC: Platform → Cihaz (komut gönder)
 * Client-side RPC: Cihaz → Platform (sonuç bildir)
 */
const RpcRequestSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    deviceId: {
      type: Schema.Types.ObjectId,
      ref: "Device",
      required: true,
      index: true,
    },

    // Benzersiz istek ID (MQTT correlation)
    requestId: {
      type: String,
      required: true,
      unique: true,
      default: () => `rpc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    },

    // RPC yönü
    direction: {
      type: String,
      enum: ["SERVER_TO_DEVICE", "DEVICE_TO_SERVER"],
      required: true,
    },

    // Komut metodu (örn: "setValue", "getStatus", "reboot")
    method: {
      type: String,
      required: [true, "RPC method zorunludur."],
      trim: true,
    },

    // Parametre (JSON)
    params: {
      type: Schema.Types.Mixed,
      default: {},
    },

    // Zaman aşımı (ms)
    timeout: {
      type: Number,
      default: 10000,
    },

    // One-Way RPC (yanıt beklenmez)
    oneWay: {
      type: Boolean,
      default: false,
    },

    // Persistent RPC (offline cihaz için kuyruk)
    persistent: {
      type: Boolean,
      default: false,
    },

    // TTL — persistent RPC'nin son geçerlilik tarihi
    expirationTime: {
      type: Date,
      default: null,
    },

    // Retry sayısı (persistent RPC)
    retries: {
      type: Number,
      default: 0,
    },
    retriesLeft: {
      type: Number,
      default: 0,
    },

    // Durum
    status: {
      type: String,
      enum: ["QUEUED", "PENDING", "DELIVERED", "SUCCESS", "TIMEOUT", "ERROR", "EXPIRED"],
      default: "PENDING",
    },

    // Cihaz yanıtı
    response: {
      type: Schema.Types.Mixed,
      default: null,
    },

    // Tamamlanma zamanı
    completedAt: {
      type: Date,
      default: null,
    },

    errorMessage: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true },
  }
);

/* İndeksler */
RpcRequestSchema.index({ deviceId: 1, status: 1 });
RpcRequestSchema.index({ createdAt: -1 });

/* Virtuals */
RpcRequestSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

const RpcRequest =
  mongoose.models.RpcRequest || mongoose.model("RpcRequest", RpcRequestSchema);

export default RpcRequest;
