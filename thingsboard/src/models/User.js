import mongoose, { Schema } from "mongoose";

/**
 * User Modeli
 *
 * NextAuth.js Credentials + Google Provider ile uyumlu kullanıcı şeması.
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
      enum: ["admin", "user"],
      default: "admin",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // Kullanıcının hangi yöntemle kayıt olduğu
    provider: {
      type: String,
      enum: ["credentials", "google"],
      default: "credentials",
    },

    // Google OAuth ile giriş yapanlar için Google hesap ID'si
    googleId: {
      type: String,
      default: null,
      sparse: true,
    },

    // Profil resmi (Google'dan gelebilir)
    image: {
      type: String,
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
/* Model                                                                */
/* ------------------------------------------------------------------ */
const User = mongoose.models.User || mongoose.model("User", UserSchema);

export default User;
