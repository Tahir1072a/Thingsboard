import mongoose from "mongoose";

const DeviceProfileSchema = new mongoose.Schema(
  {
    // 1. Temel Bilgiler
    name: { type: String, required: true, index: true }, // Örn: "Oda Termostatı v1"
    description: { type: String },
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    isDefault: { type: Boolean, default: false }, // Yeni eklenen cihazlar varsayılan olarak bu profile mi gelsin?

    // 2. İletişim Tipi (Transport Configuration)
    transportType: {
      type: String,
      enum: ["MQTT", "HTTP", "COAP"],
      default: "MQTT",
    },

    // Bu profilin verileri hangi akış diyagramına (Rule Chain) gidecek?
    defaultRuleChainId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RuleChain",
    },

    // Bu profile bağlı tüm cihazlar için geçerli kurallar
    alarms: [
      {
        alarmType: { type: String },
        severity: { type: String, enum: ["CRITICAL", "MAJOR", "MINOR"] },
        // Örn: "temp > 50" (Bunu JS ile dinamik işleyebilirsin)
        createRules: {
          condition: { type: String },
        },
        // Örn: "temp < 45" (Alarm ne zaman kapansın?)
        clearRules: {
          condition: { type: String },
        },
      },
    ],
  },
  { timestamps: true }
);

DeviceProfileSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export default mongoose.models.DeviceProfile ||
  mongoose.model("DeviceProfile", DeviceProfileSchema);
