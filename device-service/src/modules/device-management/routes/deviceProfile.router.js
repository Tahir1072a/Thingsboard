import { Router } from "express";
import * as DeviceProfileController from "../controllers/deviceProfile.controller.js";
import { protectRoute } from "../../../middleware/authMiddleware.js";

const router = Router();

router.post("/", protectRoute, DeviceProfileController.create);
router.get("/", protectRoute, DeviceProfileController.getDeviceProfiles);

export default router;
