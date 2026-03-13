import { Router } from "express";
import * as TelemetryContoller from "../controllers/telemetryController.js";

const router = Router();

router.use((req, res, next) => {
  req.user = {
    tenantId: "673c8...", // Buraya MongoDB'den geçerli bir Tenant ID (veya rastgele 24 karakter hex) yaz
    authority: "TENANT_ADMIN",
  };
  next();
});

router.post(":token/telemetry", TelemetryContoller.postTelemetry);

export default router;
