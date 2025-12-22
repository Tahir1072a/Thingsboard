import { Router } from "express";
import * as DeviceController from "../controllers/device.controller.js";

const router = Router();

router.use((req, res, next) => {
  req.user = {
    tenantId: "673c8...", // Buraya MongoDB'den geçerli bir Tenant ID (veya rastgele 24 karakter hex) yaz
    authority: "TENANT_ADMIN",
  };
  next();
});

router.get("/token/generate", DeviceController.generateToken);
router.post("/", DeviceController.create);

export default router;
