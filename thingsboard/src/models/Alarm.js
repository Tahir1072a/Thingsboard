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

    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: [true, "tenantId zorunludur."],
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
      enum: ["CRITICAL", "MAJOR", "MINOR", "WARNING"],
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
      key: String,
      triggerValue: Schema.Types.Mixed,
      threshold: String,
    },

    // Alarm kaynağı (profil kuralı mı, cihaz kuralı mı?)
    source: {
      type: String,
      enum: ["PROFILE", "DEVICE"],
      default: "PROFILE",
    },

    // Başlangıç zamanı (alarm tetiklendiği an)
    startTime: {
      type: Date,
      default: () => new Date(),
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

// Alarm süresi (milisaniye cinsinden)
AlarmSchema.virtual("durationMs").get(function () {
  const end = this.clearedAt || new Date();
  return end.getTime() - (this.startTime || this.createdAt).getTime();
});

// Alarm süresi (okunabilir format)
AlarmSchema.virtual("duration").get(function () {
  const ms = this.durationMs;
  if (ms < 0) return "0 sn";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec} sn`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} dk`;
  const hr = Math.floor(min / 60);
  const remainMin = min % 60;
  if (hr < 24) return remainMin > 0 ? `${hr} saat ${remainMin} dk` : `${hr} saat`;
  const days = Math.floor(hr / 24);
  const remainHr = hr % 24;
  return remainHr > 0 ? `${days} gün ${remainHr} saat` : `${days} gün`;
});

const Alarm =
  mongoose.models.Alarm || mongoose.model("Alarm", AlarmSchema);

export default Alarm;
