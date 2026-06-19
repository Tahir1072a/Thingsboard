import mongoose, { Schema } from "mongoose";

/**
 * User Modeli
 *
 * NextAuth.js Credentials + Google Provider ile uyumlu kullanıcı şeması.
 * Roller: ADMIN (Yönetici), OPERATOR (Operatör), VIEWER (İzleyici)
 */
const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, "E-posta zorunludur."],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Geçerli bir e-posta adresi girin."],
    },

    // Credentials ile kayıt olanlarda hash'lenmiş şifre.
    // Google ile giriş yapanlarda null olabilir.
    password: {
      type: String,
      default: null,
      select: false, // Varsayılan sorgularda şifreyi döndürme
    },

    firstName: {
      type: String,
      trim: true,
      default: "",
    },

    lastName: {
      type: String,
      trim: true,
      default: "",
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    organizationName: {
      type: String,
      trim: true,
      default: "",
    },

    role: {
      type: String,
      enum: ["ADMIN", "OPERATOR", "VIEWER"],
      default: "VIEWER",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // Kullanıcının hangi yöntemle kayıt olduğu
    provider: {
      type: String,
      enum: ["credentials", "google", "invite"],
      default: "credentials",
    },

    // Google OAuth ile giriş yapanlar için Google hesap ID'si
    googleId: {
      type: String,
      default: null,
      sparse: true,
      index: true,
    },

    // Profil resmi (Google'dan gelebilir veya upload)
    image: {
      type: String,
      default: null,
    },

    // Davet eden kullanıcı
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Son giriş zamanı
    lastLoginAt: {
      type: Date,
      default: null,
    },

    // Parola sıfırlama token'ı (forgot-password akışı)
    resetToken: {
      type: String,
      default: null,
      select: false,
    },

    // Parola sıfırlama token'ının geçerlilik süresi
    resetTokenExpiry: {
      type: Date,
      default: null,
      select: false,
    },

    // Davet token'ı (hesap aktivasyonu için)
    inviteToken: {
      type: String,
      default: null,
      select: false,
    },

    inviteTokenExpiry: {
      type: Date,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true },
  }
);

/* ------------------------------------------------------------------ */
/* Virtuals                                                             */
/* ------------------------------------------------------------------ */
UserSchema.virtual("fullName").get(function () {
  return [this.firstName, this.lastName].filter(Boolean).join(" ") || this.email;
});

/* ------------------------------------------------------------------ */
/* Indexes                                                              */
/* ------------------------------------------------------------------ */
UserSchema.index({ role: 1, isActive: 1 });

/* ------------------------------------------------------------------ */
/* Model                                                                */
/* ------------------------------------------------------------------ */
const User = mongoose.models.User || mongoose.model("User", UserSchema);

export default User;
