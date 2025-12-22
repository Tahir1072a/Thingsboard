import { z } from "zod";
import * as AuthService from "../services/auth.service.js";
import AppError from "../utilts/AppError.js";

export const RegisterSchema = z.strictObject({
  organizationName: z
    .string({
      required_error: "Organizasyon adı zorunludur.",
      invalid_type_error: "Organizasyon adı metin olmalıdır.",
    })
    .min(2, { message: "Organizasyon adı en az 2 karakter olmalı." }),

  admin: z.strictObject(
    {
      email: z.email({ error: "Geçerli bir e-posta giriniz." }),
      firstName: z
        .string({
          required_error: "İsim alanı zorunludur.",
          invalid_type_error: "İsim alanı metin olmalıdır.",
        })
        .min(1, { message: "İsim alanı zorunludur." }),

      lastName: z
        .string({
          required_error: "Soyisim alanı zorunludur.",
          invalid_type_error: "Soyisim alanı metin olmalıdır.",
        })
        .min(1, { message: "Soyisim alanı zorunludur." }),

      phone: z.string().optional(),
    },
    {
      required_error: "Yönetici (admin) bilgileri zorunludur.",
      invalid_type_error: "Yönetici (admin) nesnesi geçersiz.",
    }
  ),
});

export async function register(req, res) {
  const body = RegisterSchema.parse(req.body);

  // Controller, 'nasıl yapıldığını' bilmez, sadece 'yapılmasını' ister
  const result = await AuthService.registerTenant(
    body.organizationName,
    body.admin
  );

  return res.status(201).json({
    ok: true,
    ...result,
    message: "Kayıt oluşturuldu. Aktivasyon linki ile parolanı belirle.",
  });
}

const ActivateSchema = z.object({
  userId: z.string().min(1, "Kullanıcı ID'si gereklidir."),
  token: z.string().min(1, "Token gereklidir"),
  password: z.string().min(8, "Parola en az 6 karakter içermek zorundadır"),
});

export async function activate(req, res) {
  const { userId, token, password } = ActivateSchema.parse(req.body);
  // İş mantığı burada olacak.
  await AuthService.activateAccount(userId, token, password);

  return res.status(200).json({
    ok: true,
    message: "Hesap başarıyla etkinleştirildi",
  });
}

const LoginSchema = z.object({
  email: z.email("Geçerli bir e posta adresini giriniz."),
  password: z.string().min(1, "Parola boş olamaz."),
});

export async function login(req, res) {
  const { email, password } = LoginSchema.parse(req.body);

  // User ve token döndürecek olan service fonksiyonumuz.
  const result = await AuthService.loginUser(email, password);

  return res.status(200).json({
    ok: true,
    message: "Giriş başarılı",
    ...result,
  });
}

export async function setupMfa(req, res) {
  const { userId } = req.user;
  const result = await AuthService.setupMfa(userId);

  return res.status(200).json({ ok: true, ...result });
}

export async function enableMfa(req, res) {
  const { userId } = req.user;
  const { encryptedSecret, mfaCode } = req.body;

  if (!encryptedSecret || !mfaCode) {
    throw new AppError("Eksik parametreler", 400);
  }

  const result = await AuthService.verifyAndEnableMfa(
    userId,
    encryptedSecret,
    mfaCode
  );

  return res.status(200).json({ ok: true, ...result });
}

export async function loginMfa(req, res) {
  const { mfaToken, mfaCode } = req.body;

  if (!mfaToken || !mfaCode) {
    throw new AppError("MFA token'ı veya kodu eksik", 400);
  }

  const result = await AuthService.verifyMfa(mfaToken, mfaCode.trim());

  return res
    .status(200)
    .json({ ok: true, message: "MFA doğrulaması başarılı", ...result });
}

const forgotPasswordSchema = z.object({
  email: z.email(),
});

export async function forgotPassword(req, res) {
  const { email } = forgotPasswordSchema.parse(req.body);

  if (!email) {
    throw new AppError("Lütfen geçerli bir mail adresi giriniz!", 404);
  }

  await AuthService.forgotPassword(email);

  return res.status(200).json({
    ok: true,
    message: "Mailiniz sisteme kayıtlı ise, mailinize link gönderilmiştir.",
  });
}

const resetPasswordSchema = z.object({
  userId: z.string(),
  token: z.string(),
  password: z.string(),
});

export async function resetPassword(req, res) {
  const { password, userId, token } = resetPasswordSchema.parse(req.body);

  if (!password) {
    throw new AppError(
      "Lütfen değiştirmek istediğiniz şifreyi gönderiniz.",
      404
    );
  }

  await AuthService.resetPassword(password, userId, token);

  return res.status(200).json({
    ok: true,
    message: "Şifreniz başarıyla değiştirilmiştir",
  });
}
