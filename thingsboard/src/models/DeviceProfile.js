import mongoose, { Schema } from "mongoose";

/**
 * DeviceProfile (Cihaz Profili) Modeli
 *
 * Aynı tipteki cihazlara ortak ayar/kurallar tanımlar.
 * Alarm kuralları profile'a gömülü olarak saklanır.
 */

const AlarmRuleSchema = new Schema(
  {
    alarmType: {
      type: String,
      required: [true, "Alarm tipi zorunludur."],
      trim: true,
    },
    severity: {
      type: String,
      enum: ["CRITICAL", "MAJOR", "MINOR", "WARNING"],
      default: "MAJOR",
    },
    // Tetikleme koşulu: "temperature > 50" veya "temperature > 50 AND humidity > 80"
    createCondition: {
      type: String,
      required: [true, "Tetikleme koşulu zorunludur."],
    },
    // Temizleme koşulu (opsiyonel): "temperature < 45"
    clearCondition: {
      type: String,
      default: "",
    },

    timeWindow: {
      enabled: { type: Boolean, default: false },
      durationSeconds: { type: Number, default: 300 },  // 5 dakika
      triggerCount: { type: Number, default: 3 },
    },
  },
  { _id: false }
);

const DeviceProfileSchema = new Schema(
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
      required: [true, "Profil adı zorunludur."],
      trim: true,
      maxlength: 200,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    transportType: {
      type: String,
      enum: ["MQTT", "MQTTS", "HTTP", "WS", "WSS"],
      default: "MQTT",
    },

    expectedKeys: {
      type: [String],
      default: [],
    },

    isDefault: {
      type: Boolean,
      default: false,
    },

    // Varsayılan dashboard
    defaultDashboard: {
      type: Schema.Types.ObjectId,
      ref: "Dashboard",
      default: null,
    },

    // Gömülü alarm kuralları
    alarms: [AlarmRuleSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const DeviceProfile =
  mongoose.models.DeviceProfile ||
  mongoose.model("DeviceProfile", DeviceProfileSchema);

export default DeviceProfile;
