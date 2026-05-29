import mongoose, { Schema } from "mongoose";

/**
 * Telemetry (Telemetri) Modeli
 *
 * IoT cihazlarından gelen ölçüm verilerini time-series formatında saklar.
 * MongoDB'nin native time-series collection özelliğini kullanır — bu yöntem
 * büyük zaman serisi verilerinde standart koleksiyona göre çok daha verimlidir.
 *
 * Desteklenen veri tipleri: number, string, boolean, json
 *
 * Örnek dökümanlar:
 * {
 *   deviceId:  ObjectId("..."),
 *   key:       "temperature",
 *   value:     23.5,
 *   valueType: "number",
 *   unit:      "°C",
 *   protocol:  "mqtt",
 *   timestamp: ISODate("2026-03-13T09:00:00Z")
 * }
 * {
 *   deviceId:  ObjectId("..."),
 *   key:       "status",
 *   value:     "active",
 *   valueType: "string",
 *   protocol:  "http",
 *   timestamp: ISODate("2026-03-13T09:01:00Z")
 * }
 * {
 *   deviceId:  ObjectId("..."),
 *   key:       "isOnline",
 *   value:     true,
 *   valueType: "boolean",
 *   protocol:  "mqtt",
 *   timestamp: ISODate("2026-03-13T09:02:00Z")
 * }
 * {
 *   deviceId:  ObjectId("..."),
 *   key:       "location",
 *   value:     "{\"lat\":41.0,\"lng\":28.9}",
 *   valueType: "json",
 *   protocol:  "http",
 *   timestamp: ISODate("2026-03-13T09:03:00Z")
 * }
 */
const TelemetrySchema = new Schema(
  {
    // --------------------------------------------------------
    // TIME-SERIES META ALANLARI
    // --------------------------------------------------------

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId zorunludur."],
      index: true,
    },

    // Hangi cihazdan geldiği (time-series "metaField" olarak kullanılır)
    deviceId: {
      type: Schema.Types.ObjectId,
      ref: "Device",
      required: [true, "deviceId zorunludur."],
      index: true,
    },

    // Metrik adı: "temperature", "humidity", "pressure", "voltage" vb.
    key: {
      type: String,
      required: [true, "Metrik anahtarı (key) zorunludur."],
      trim: true,
      maxlength: [100, "key en fazla 100 karakter olabilir."],
      index: true,
    },

    // --------------------------------------------------------
    // ZAMAN DAMGASI — time-series "timeField"
    // --------------------------------------------------------
    timestamp: {
      type: Date,
      required: [true, "timestamp zorunludur."],
      default: () => new Date(),
      index: true,
    },

    // --------------------------------------------------------
    // VERİ ALANLARI
    // --------------------------------------------------------

    // Değer (Mixed, tüm veri tiplerini destekler: Number, String, Boolean, JSON objesi)
    value: {
      type: Schema.Types.Mixed,
      required: [true, "value zorunludur."],
    },

    // Değerin veri türünü tutan alan ("number", "string", "boolean", "json")
    valueType: {
      type: String,
      enum: ["number", "string", "boolean", "json"],
      default: "number",
    },

    // Ölçüm birimi (ör. "°C", "%", "hPa", "V")
    unit: {
      type: String,
      trim: true,
      default: null,
    },

    // Veriyi hangi protokol üzerinden aldık
    protocol: {
      type: String,
      enum: {
        values: ["http", "mqtt", "websocket", "internal"],
        message: "Geçerli protokoller: http, mqtt, websocket, internal",
      },
      default: "http",
    },
  },
  {
    timestamps: false,

    // MongoDB time-series collection için koleksiyon seçenekleri.
    // NOT: Bu seçenekler yalnızca koleksiyon ilk oluşturulduğunda geçerlidir;
    // varolan bir koleksiyonu dönüştürmez.
    // Koleksiyonu manuel oluşturmak için aşağıdaki komutu kullan:
    //
    // db.createCollection("telemetries", {
    //   timeseries: {
    //     timeField:   "timestamp",
    //     metaField:   "deviceId",
    //     granularity: "seconds"
    //   },
    //   expireAfterSeconds: 7776000  // 90 gün
    // })
    collection: "telemetries",

    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true },
  }
);

/* ------------------------------------------------------------------ */
/* İndeksler                                                            */
/* ------------------------------------------------------------------ */

// En sık kullanılan sorgu: belirli cihazın belirli metriği, zaman sıralı
TelemetrySchema.index({ userId: 1, deviceId: 1, key: 1, timestamp: -1 });

// Dashboard'da "son N dakika" sorguları için
TelemetrySchema.index({ timestamp: -1 });

/* ------------------------------------------------------------------ */
/* Statik Yardımcı Metotlar                                            */
/* ------------------------------------------------------------------ */

/**
 * Bir cihaza ait son `limit` telemetri kaydını döner.
 * @param {string} deviceId
 * @param {string} key        - Metrik adı (ör. "temperature")
 * @param {number} limit      - Kaç kayıt (varsayılan 60)
 */
TelemetrySchema.statics.getLatest = function (deviceId, key, limit = 60, userId = null) {
  const filter = { deviceId, key };
  if (userId) filter.userId = userId;
  return this.find(filter)
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

/**
 * Belirli zaman aralığındaki kayıtları döner.
 * @param {string} deviceId
 * @param {string} key
 * @param {Date}   from
 * @param {Date}   to
 * @param {number} limit
 */
TelemetrySchema.statics.getRange = function (
  deviceId,
  key,
  from,
  to,
  limit = 1000,
  userId = null
) {
  const filter = {
    deviceId,
    key,
    timestamp: { $gte: from, $lte: to },
  };
  if (userId) filter.userId = userId;
  return this.find(filter)
    .sort({ timestamp: 1 })
    .limit(limit)
    .lean();
};

/* ------------------------------------------------------------------ */
/* Model                                                                */
/* ------------------------------------------------------------------ */

const Telemetry =
  mongoose.models.Telemetry ||
  mongoose.model("Telemetry", TelemetrySchema);

export default Telemetry;
