import mongoose from "mongoose";

const telemetrySchema = new mongoose.Schema(
  {
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      // MongoDB bu alanın yerini bilecek şekilde saklar.
      index: true,
    },

    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      index: true,
    },

    timestamp: { type: Date, required: true },
    key: { type: String, required: true }, // "Temprature vb."
    value: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

telemetrySchema.index({ deviceId: 1, ts: -1 });

export default mongoose.models.Telemtry ||
  mongoose.model("Telemtry", telemetrySchema);
