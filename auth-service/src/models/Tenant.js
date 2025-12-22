import mongoose, { Schema } from "mongoose";

// Burası organizasyon modelimizdir. Buna bağlı tenantlar oluşturacağız.
const TenantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    additionalInfo: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.models.Tenant || mongoose.model("Tenant", TenantSchema);
