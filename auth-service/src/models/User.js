import mongoose from "mongoose";
import { Schema } from "mongoose";

export const Authority = ["SYS_ADMIN", "TENANT_ADMIN", "CUSTOMER_USER"];

const UserSchema = new Schema(
  {
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
    },
    authority: { type: String, enum: Authority, required: true },

    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", default: null },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", default: null },

    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    phone: { type: String, trim: true },

    locale: { type: String, default: "tr-TR" },
    timezone: { type: String, default: "Europe/Istanbul" },

    // Bu alan değiştiğinde mongoDB bunu algılamayabilir. MarkModified fonskiyonu ie bildirilmelidir.
    additionalInfo: {
      type: Schema.Types.Mixed,
      default: [],
    },

    status: {
      type: String,
      enum: ["INVITED", "ACTIVE", "SUSPENDED"],
      default: "INVITED",
    },

    lastLoginTime: { type: Date },
  },
  { timestamps: { createdAt: "createdTime", updatedAt: "updatedTime" } }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
