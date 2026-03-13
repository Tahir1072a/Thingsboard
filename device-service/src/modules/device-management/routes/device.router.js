import { Router } from "express";
import * as DeviceController from "../controllers/device.controller.js";
import { protectRoute } from "../../../middleware/authMiddleware.js";

const router = Router();

// Token oluşturma...
router.get("/token/generate", DeviceController.generateToken);

router.post("/", protectRoute, DeviceController.create);
router.get("/", protectRoute, DeviceController.getDevices);

router.delete("/:deviceId", protectRoute, DeviceController.deleteDevice);

export default router;
