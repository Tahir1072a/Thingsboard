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
      enum: ["CRITICAL", "MAJOR", "MINOR"],
      default: "MAJOR",
    },
    // Tetikleme koşulu (JS ifadesi): "temperature > 50"
    createCondition: {
      type: String,
      required: [true, "Tetikleme koşulu zorunludur."],
    },
    // Temizleme koşulu (opsiyonel): "temperature < 45"
    clearCondition: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const DeviceProfileSchema = new Schema(
  {
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
      enum: ["MQTT", "HTTP", "COAP"],
      default: "MQTT",
    },

    isDefault: {
      type: Boolean,
      default: false,
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
