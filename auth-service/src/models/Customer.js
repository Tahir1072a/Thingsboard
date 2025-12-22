import mongoose, { Schema } from "mongoose";

// Müşteri şirketlerin genel profilidir.
const CustomerSchema = Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    title: { type: String, required: true, trim: true },
    additionalInfo: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.models.Customer ||
  mongoose.model("Customer", CustomerSchema);
