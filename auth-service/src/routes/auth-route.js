import { Router } from "express";
import * as AuthController from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/authMiddleware.js";

const router = Router();

// Rota, sadece Controller'daki ilgili fonksiyona yönlendiriyor.
router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/activate", AuthController.activate);
router.post("/login/mfa", AuthController.loginMfa);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password", AuthController.resetPassword);

// --- Korumalı Rotalar (Sadece giriş yapmış kullanıcılar) ---
// 'protectRoute' middleware'i, bu rotalardan önce çalışır
// ve sadece geçerli JWT'si olanların devam etmesine izin verir.

router.post("/mfa/setup", protectRoute, AuthController.setupMfa);
router.post("/mfa/enable", protectRoute, AuthController.enableMfa);
// (Buraya /mfa/disable ve /change-password da gelecek)

export default router;
