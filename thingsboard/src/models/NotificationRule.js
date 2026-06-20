import mongoose, { Schema } from "mongoose";

/**
 * NotificationRule — Bildirim Kuralı Modeli
 *
 * Alarm veya olay tetiklendiğinde hangi kanallardan bildirim gönderileceğini tanımlar.
 * Desteklenen kanallar: EMAIL, WEBHOOK, TELEGRAM
 */
const NotificationRuleSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: [true, "tenantId zorunludur."],
      index: true,
    },

    name: {
      type: String,
      required: [true, "Kural adı zorunludur."],
      trim: true,
      maxlength: 200,
    },

    enabled: {
      type: Boolean,
      default: true,
    },

    // ── Tetikleme koşulu ──
    trigger: {
      type: {
        type: String,
        enum: ["ALARM_CREATED", "ALARM_CLEARED", "DEVICE_INACTIVE"],
        required: true,
      },
      // Opsiyonel filtre: belirli alarm tipi veya severity
      alarmType: { type: String, default: "" },
      severity: {
        type: String,
        enum: ["", "CRITICAL", "MAJOR", "MINOR", "WARNING"],
        default: "",
      },
    },

    // ── Bildirim kanalları ──
    channels: [
      {
        type: {
          type: String,
          enum: ["EMAIL", "WEBHOOK", "TELEGRAM"],
          required: true,
        },
        enabled: { type: Boolean, default: true },
        config: {
          // EMAIL
          to: { type: String, default: "" },

          // WEBHOOK
          url: { type: String, default: "" },
          method: { type: String, enum: ["POST", "PUT", "GET"], default: "POST" },
          headers: { type: Map, of: String, default: {} },

          // TELEGRAM
          botToken: { type: String, default: "" },
          chatId: { type: String, default: "" },
        },
      },
    ],

    // ── Bildirim şablonu ──
    template: {
      subject: {
        type: String,
        default: "${deviceName} — ${alarmType} Alarmı",
      },
      body: {
        type: String,
        default:
          "Cihaz: ${deviceName}\nAlarm: ${alarmType}\nSeviye: ${severity}\nDurum: ${status}\nDetay: ${details}\nZaman: ${timestamp}",
      },
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
NotificationRuleSchema.index({ tenantId: 1, enabled: 1 });
NotificationRuleSchema.index({ "trigger.type": 1 });

/* ------------------------------------------------------------------ */
/* Statics                                                              */
/* ------------------------------------------------------------------ */

/**
 * Belirtilen trigger tipine uyan aktif kuralları getir.
 */
NotificationRuleSchema.statics.findMatchingRules = function (tenantId, triggerType, alarmType, severity) {
  const filter = {
    tenantId,
    enabled: true,
    "trigger.type": triggerType,
  };

  return this.find(filter).lean().then((rules) => {
    return rules.filter((rule) => {
      // Alarm type filtresi
      if (rule.trigger.alarmType && rule.trigger.alarmType !== alarmType) {
        return false;
      }
      // Severity filtresi
      if (rule.trigger.severity && rule.trigger.severity !== severity) {
        return false;
      }
      return true;
    });
  });
};

/* ------------------------------------------------------------------ */
/* Virtuals                                                             */
/* ------------------------------------------------------------------ */
NotificationRuleSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

/* ------------------------------------------------------------------ */
/* Model                                                                */
/* ------------------------------------------------------------------ */
const NotificationRule =
  mongoose.models.NotificationRule ||
  mongoose.model("NotificationRule", NotificationRuleSchema);

export default NotificationRule;
