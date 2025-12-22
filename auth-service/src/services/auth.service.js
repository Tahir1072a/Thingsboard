import { sendActivationEmail, sendForgotPasswordLink } from "../lib/email.js";
import {
  generateToken,
  hashPassword,
  verifyPassword,
} from "../lib/security.js";
import Tenant from "../models/Tenant.js";
import User from "../models/User.js";
import UserCredentials from "../models/UserCredentials.js";
import AppError from "../utilts/AppError.js";
import jwt from "jsonwebtoken";
import { encrypt } from "../lib/crypto.js";
import qrcode from "qrcode";
import speakeasy from "speakeasy";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Parametre olarak, kayıt olan kullanıcı bilgileri ve organizasyon ismini alır.
// NOT: Aktivasyon linkini dönmemiz zorunlu değildir!
export async function registerTenant(organizationName, admin) {
  const existingUser = await User.findOne({ email: admin.email }).lean();

  if (existingUser) {
    if (existingUser.status === "INVITED") {
      const activateToken = generateToken(32);
      const activateTokenExp = new Date(Date.now() + 48 * 3600 * 1000);

      await UserCredentials.updateOne(
        {
          userId: existingUser._id,
        },
        {
          $set: {
            activateToken: activateToken,
            activateTokenExp: activateTokenExp,
          },
        },
        { upsert: true }
      );

      const activationLink = await sendActivationEmail(
        activateToken,
        existingUser._id,
        existingUser.firstName,
        existingUser.email
      );

      return { activationLink };
    }

    throw new AppError("Bu kullanıcı sisteme zaten kayıtlıdır", 409);
  }

  // Yeni kullanıcı oluşturma akışı

  const tenant = await Tenant.create({
    name: organizationName,
    additionalInfo: {},
  });

  const user = await User.create({
    email: admin.email,
    authority: "TENANT_ADMIN",
    tenantId: tenant._id,
    firstName: admin.firstName,
    lastName: admin.lastName,
    phone: admin.phone,
    status: "INVITED",
    additionalInfo: {},
  });

  const activateToken = generateToken(32);
  const activateTokenExp = new Date(Date.now() + 48 * 3600 * 1000);

  await UserCredentials.create({
    userId: user._id,
    isActive: false,
    passwordHash: null,
    activateToken,
    activateTokenExp,
    mfa: { totpEnabled: false },
  });

  const activationLink = await sendActivationEmail(
    activateToken,
    user._id,
    admin.firstName,
    user.email
  );

  // Controllera döneceğimiz sonuç.
  return {
    tenantId: tenant._id,
    userId: user._id,
    activationLink,
  };
}

export async function activateAccount(userId, token, password) {
  const cred = await UserCredentials.findOne({ userId: userId });

  if (!cred || !cred.activateToken || !cred.activateTokenExp) {
    throw new AppError("Aktivasyon kaydı bulunamadı veya geçersiz", 404);
  }

  if (cred.activateToken !== token) {
    throw new AppError("Aktivasyon token'ı hatalı", 400);
  }

  if (cred.activateTokenExp.getTime() < Date.now()) {
    throw new AppError("Aktivasyon linkinin süresi dolmuş", 400);
  }

  const newPasswordHash = await hashPassword(password);

  cred.passwordHash = newPasswordHash;
  cred.isActive = true;
  cred.activateToken = null;
  cred.activateTokenExp = null;
  cred.failedLoginCount = 0;
  cred.lockUntil = null;
  await cred.save();

  await User.updateOne({ _id: userId }, { $set: { status: "ACTIVE" } });
}

// İlgili kullanıcıyı veri tabanından bulur ve girilen şifreyi kontrol eder
export async function loginUser(email, password) {
  const user = await User.findOne({ email: email.toLowerCase() }).lean();
  if (!user) {
    throw new AppError("Kullanıcı bulunamadı", 404);
  }

  const userCred = await UserCredentials.findOne({ userId: user._id });
  if (!userCred || !userCred.isActive) {
    if (!userCred) {
      userCred = new UserCredentials({ userId: user._id, isActive: false });
    }

    const activateToken = generateToken(32);
    const activateTokenExp = new Date(Date.now() + 48 * 3600 * 1000);

    userCred.activateToken = activateToken;
    userCred.activateTokenExp = activateTokenExp;
    userCred.passwordHash = null;
    userCred.isActive = false;
    await userCred.save();

    // Aktivason linkini bize dönüyor.
    const result = await sendActivationEmail(
      activateToken,
      user._id,
      user.firstName,
      email
    );

    throw new AppError(
      "Hesabınız aktif değilmiş. Aktivasyon linki mailinize gönderilmiştir.",
      403
    );
  }

  const isPasswordCorrect = await verifyPassword(
    password,
    userCred.passwordHash
  );

  if (!isPasswordCorrect) {
    throw new AppError("Hatalı e-posta veya şifre", 401);
  }

  if (userCred.mfa && userCred.mfa.totpEnabled) {
    const mfaTokenPayload = {
      userId: user._id,
      purpose: "mfa-verification",
    };

    // 5 dakikalık geçici bir token oluştur.
    const mfaToken = jwt.sign(mfaTokenPayload, process.env.JWT_SECRET, {
      expiresIn: "5m",
    });

    return {
      mfaRequired: true,
      mfaToken: mfaToken,
      userId: user._id,
    };
  } else {
    const payload = {
      userId: user._id,
      email: user.email,
      authority: user.authority,
      tenantId: user.tenantId,
      customerId: user.customerId,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    return {
      mfaRequired: false,
      token: token,
      user: {
        id: user._id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        role: user.authority,
      },
    };
  }
}

export async function verifyMfa(mfaToken, mfaCode) {
  let mfaPayload;

  try {
    mfaPayload = jwt.verify(mfaToken, process.env.JWT_SECRET);
    if (mfaPaylaod.purpose !== "mfa-verification") {
      throw new Error("Geçersiz token amacı...");
    }
  } catch (err) {
    throw new AppError(
      "Geçersiz veya süresi dolmuş MFA oturumu. Lütfen tekrar giriş yapın",
      401
    );
  }

  const { userId } = mfaPayload;
  const userCred = await UserCredentials.findOne({ userId });
  if (!userCred || !userCred.mfa || !userCred.mfa.totpEnabled) {
    throw new AppError("MFA bu hesap için aktif değil", 400);
  }

  // MFA doğrulama kısmı...
  let isValid = false;
  let decryptedSecret;
  try {
    decryptedSecret = decrypt(userCred.mfa.totpSecretEnc);
  } catch (err) {
    throw new AppError(
      "MFA sırrı çözülemedi. Sistem yöneticisiyle iletişime geçin",
      500
    );
  }

  // mfaCode 6 haneli mi?
  if (/^\d{6}$/.test(mfaCode.trim())) {
    isValid = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: "base32",
      token: mfaCode.trim(),
      window: 1,
    });
  }

  if (
    !isValid &&
    userCred.mfa.backupCodesEnc &&
    userCred.mfa.backupCodesEnc.length > 0
  ) {
    const remainingCodes = [];

    for (const hashedCode of userCred.mfa.backupCodesEnc) {
      if (!isValid && (await bcrypt.compare(mfaCode.trim(), hashedCode))) {
        isValid = true;
      } else {
        remainingCodes.push(hashedCode);
      }
    }

    if (isValid) {
      userCred.mfa.backupCodesEnc = remainingCodes;
      await userCred.save();
    }

    if (!isValid) {
      throw new AppError("MFA kodu geçersiz.", 401);
    }

    const user = await User.findById(userId).lean();
    const payload = {
      userId: user._id,
      email: user.email,
      authority: user.authority,
      tenantId: user.tenantId,
      customerId: user.customerId,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    return {
      token: token,
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        role: user.authority,
      },
    };
  }
}

// KULLANICI PROFİLİ - MFA KURULUMUNU BAŞLAT
export async function setupMfa(userId) {
  // Yeni bir TOTP kodu oluştur.
  const secret = speakeasy.generateSecret({
    name: `PengonaThings (${userId})`,
    issuer: "PengonaThings",
  });

  // 2. Sırrı şifrele (veritabanına kaydetmeden önce)
  const encryptedSecret = encrypt(secret.base32);
  // 3. QR kod için URL oluştur
  const otpauthUrl = secret.otpauth_url;

  // 4. URL'yi QR kod resmine (Data URL) dönüştür
  const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

  return {
    encryptedSecret: encryptedSecret, // Frontend bunu saklamalı
    qrCode: qrCodeDataUrl, // Frontend bunu <img src..> içinde gösterecek
    secret: secret.base32, // (DEV için eklendi, production'da kaldırılabilir)
  };
}

// KULLANICI PROFİLİ - MFA KURULUMUNU DOĞRULA VE AKTİF ET
export async function verifyAndEnableMfa(userId, encryptedSecret, mfaCode) {
  let decryptedSecret;

  try {
    decryptedSecret = decrypt(encryptedSecret);
  } catch (err) {
    throw new AppError("Geçici kod çözülemedi", 500);
  }

  const isValid = speakeasy.totp.verify({
    secret: decryptedSecret,
    encoding: "base32",
    token: mfaCode.trim(),
    window: 1,
  });

  if (!isValid) {
    throw new AppError("Geçersiz MFA kodu. Lütfen tekrar deneyin.", 400);
  }

  const backupCodes = [];
  const hashedBacupCodes = [];
  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(6).toString("hex");
    backupCodes.push(code);

    const hashCode = await hashPassword(code);
    hashedBacupCodes.push(hashCode);
  }

  await UserCredentials.updateOne(
    { userId: userId },
    {
      $set: {
        "mfa.totpEnabled": true,
        "mfa.totpSecretEnc": encryptedSecret, // Kalıcı sırrı kaydet
        "mfa.backupCodesEnc": hashedBackupCodes, // Hash'lenmiş yedekleri kaydet
      },
    }
  );

  return { backupCodes: backupCodes };
}

export async function forgotPassword(email) {
  try {
    const user = await User.findOne({ email: email, status: "ACTIVE" });

    if (!user) {
      console.log(
        `Parola sıfırlama talebi (bulunamadı): ${email}. Hata fırlatılmadı.`
      );
      // Güvenlik...
      // HATA FIRLATMA! Sadece sessizce fonksiyondan çık.
      // Controller bunun "başarılı" olduğunu düşünecek.
      return;
    }

    const userCred = await UserCredentials.findOne({ userId: user._id });

    if (!userCred) {
      console.log(
        `Parola sıfırlama talebi (creds bulunamadı): ${email}. Hata fırlatılmadı.`
      );
      return;
    }

    const resetToken = generateToken(32);
    const resetTokenExp = new Date(Date.now() + 1 * 3600 * 1000); // 1 saat

    userCred.resetToken = resetToken;
    userCred.resetTokenExp = resetTokenExp;
    await userCred.save();

    await sendForgotPasswordLink(
      resetToken,
      user._id,
      user.firstName,
      user.email
    );
  } catch (error) {
    // 4. Buraya düşen hata, 'kullanıcı bulunamadı' değil,
    // DB hatası veya Mail gönderme hatası gibi GERÇEK bir sunucu hatasıdır.
    console.error("Parola sıfırlama servisinde kritik hata:", error);

    throw new AppError(
      500,
      "Parola sıfırlama işlemi sırasında beklenmedik bir hata oluştu."
    );
  }
}

export async function resetPassword(password, userId, token) {
  try {
    const user = await User.findById(userId).lean();

    if (!user) {
      throw new AppError(`Bir hata oluştu. Böyle bir kullanıcı bulunamamıştır`);
    }

    const cred = await UserCredentials.findOne({ userId: user._id });
    if (!cred) {
      throw new AppError(
        `Kullanıcıya ait credentials bilgileri bulunamamıştır.`
      );
    }

    if (!cred || !cred.resetToken || !cred.resetTokenExp) {
      throw new AppError("Aktivasyon kaydı bulunamadı veya geçersiz", 404);
    }

    if (cred.resetToken !== token) {
      throw new AppError("Aktivasyon token'ı hatalı", 400);
    }

    if (cred.resetTokenExp.getTime() < Date.now()) {
      throw new AppError("Aktivasyon linkinin süresi dolmuş", 400);
    }

    const newPasswordHash = hashPassword(password);
    cred.password = newPasswordHash;
    cred.resetToken = null;
    cred.resetTokenExp = null;
    await cred.save();
  } catch (err) {
    console.error(`Parola resetleme hatası: ${err}`);
    throw new AppError("Parola resetleme sırasında bir hata oluştu.", 400);
  }
}
