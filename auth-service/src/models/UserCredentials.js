import mongoose, { Schema } from "mongoose";
// TOTP => time-based-one-time password

const UserCredentialsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // Her kullanıcının sadece bir credentials'ı olabilir.
    },
    isActive: { type: Boolean, default: false },
    passwordHash: { type: String, default: null },

    activateToken: { type: String, default: null },
    activateTokenExp: { type: Date },

    resetToken: { type: String, default: null },
    resetTokenExp: { type: Date },

    mfa: {
      totpEnabled: { type: Boolean, default: false },
      totpSecretEnc: { type: String, default: null },
      backupCodesEnc: { type: [String], default: [] },
    },

    failedLoginCount: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.UserCredentials ||
  mongoose.model("UserCredentials", UserCredentialsSchema);
