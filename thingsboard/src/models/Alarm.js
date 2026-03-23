import mongoose, { Schema } from "mongoose";

/**
 * Alarm Modeli
 *
 * Cihaz profili kuralları ihlal edildiğinde oluşturulan alarm kayıtları.
 */

const AlarmSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId zorunludur."],
      index: true,
    },

    // Hangi cihaz
    deviceId: {
      type: Schema.Types.ObjectId,
      ref: "Device",
      required: true,
      index: true,
    },

    deviceName: {
      type: String,
      default: "",
    },

    // Hangi profil kuralı tetikledi
    profileId: {
      type: Schema.Types.ObjectId,
      ref: "DeviceProfile",
    },

    // Alarm tipi (profil kuralındaki alarmType)
    type: {
      type: String,
      required: true,
      index: true,
    },

    severity: {
      type: String,
      enum: ["CRITICAL", "MAJOR", "MINOR"],
      default: "MAJOR",
    },

    status: {
      type: String,
      enum: ["ACTIVE", "CLEARED", "ACKNOWLEDGED"],
      default: "ACTIVE",
      index: true,
    },

    // Tetikleme detayları
    details: {
      key: String,        // Hangi telemetri key'i tetikledi
      triggerValue: Number, // Tetikleyen değer
      threshold: String,    // Koşul ifadesi
    },

    // Temizlenme zamanı
    clearedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Alarm =
  mongoose.models.Alarm || mongoose.model("Alarm", AlarmSchema);

export default Alarm;
