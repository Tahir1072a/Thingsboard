/**
 * auth.js — NextAuth.js v4 Konfigürasyonu
 *
 * Credentials Provider (email + şifre) ve Google Provider ile
 * JWT tabanlı oturum yönetimi.
 */

import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { verifyPassword } from "@/lib/security";

/** @type {import("next-auth").AuthOptions} */
export const authOptions = {
  providers: [
    // ──────────────────────────────────────────────
    // 1. Credentials Provider — E-posta + Şifre
    // ──────────────────────────────────────────────
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Parola", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("E-posta ve parola zorunludur.");
        }

        await connectDB();

        // password alanı select: false olduğu için açıkça isteyelim
        const user = await User.findOne({ email: credentials.email })
          .select("+password")
          .lean();

        if (!user) {
          throw new Error("Bu e-posta ile kayıtlı kullanıcı bulunamadı.");
        }

        if (!user.password) {
          throw new Error(
            "Bu hesapta henüz parola tanımlı değil. Lütfen Google ile giriş yapın veya 'Parolamı Unuttum' ile parola belirleyin."
          );
        }

        if (!user.isActive) {
          throw new Error("Hesabınız devre dışı bırakılmış.");
        }

        const isValid = await verifyPassword(credentials.password, user.password);
        if (!isValid) {
          throw new Error("Parola hatalı.");
        }

        // Son giriş zamanını güncelle
        await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

        // NextAuth'a dönecek kullanıcı nesnesi
        return {
          id: user._id.toString(),
          email: user.email,
          name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationName: user.organizationName,
          image: user.image,
        };
      },
    }),

    // ──────────────────────────────────────────────
    // 2. Google Provider
    // ──────────────────────────────────────────────
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],

  // ──────────────────────────────────────────────
  // Oturum stratejisi: JWT (veritabanı session yok)
  // ──────────────────────────────────────────────
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 gün
  },

  // ──────────────────────────────────────────────
  // Özel sayfalar
  // ──────────────────────────────────────────────
  pages: {
    signIn: "/login",
    error: "/login",
  },

  // ──────────────────────────────────────────────
  // Callbacks
  // ──────────────────────────────────────────────
  callbacks: {
    /**
     * signIn callback — Google ile ilk girişte kullanıcı oluştur
     */
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          await connectDB();

          let dbUser = await User.findOne({ email: user.email });

          if (!dbUser) {
            // Google ile ilk giriş → yeni kullanıcı oluştur
            dbUser = await User.create({
              email: user.email,
              firstName: user.name?.split(" ")[0] ?? "",
              lastName: user.name?.split(" ").slice(1).join(" ") ?? "",
              provider: "google",
              googleId: account.providerAccountId,
              image: user.image,
              isActive: true,
            });
          } else if (!dbUser.googleId) {
            // E-posta mevcuttu ama Google ile bağlı değildi → ilişkilendir
            dbUser.googleId = account.providerAccountId;
            dbUser.image = user.image ?? dbUser.image;
            dbUser.lastLoginAt = new Date();
            await dbUser.save();
          } else {
            // Mevcut Google kullanıcısı — son giriş güncelle
            dbUser.lastLoginAt = new Date();
            await dbUser.save();
          }

          if (!dbUser.isActive) {
            return false; // giriş engelle
          }

          return true;
        } catch (error) {
          console.error("[NextAuth] Google signIn hatası:", error);
          return false;
        }
      }
      return true;
    },

    /**
     * jwt callback — her token yenilendiğinde çağrılır.
     * User bilgilerini JWT token'a göm.
     */
    async jwt({ token, user, account, trigger }) {
      // İlk giriş (signIn anı)
      if (user) {
        // Google ile giriş yaptıysa DB'den tam bilgileri çek
        if (account?.provider === "google") {
          await connectDB();
          const dbUser = await User.findOne({ email: user.email }).lean();
          if (dbUser) {
            token.id = dbUser._id.toString();
            token.role = dbUser.role;
            token.firstName = dbUser.firstName;
            token.lastName = dbUser.lastName;
            token.organizationName = dbUser.organizationName;
          }
        } else {
          // Credentials → authorize'dan gelen user objesini kullan
          token.id = user.id;
          token.role = user.role;
          token.firstName = user.firstName;
          token.lastName = user.lastName;
          token.organizationName = user.organizationName;
        }
      }

      return token;
    },

    /**
     * session callback — istemciye dönen session objesini şekillendir.
     */
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.firstName = token.firstName;
      session.user.lastName = token.lastName;
      session.user.organizationName = token.organizationName;
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
