import z, { success } from "zod";
import * as DeviceProfileService from "../services/deviceProfile.service.js";
import { ALLOWED_TRANSPORT_TYPES } from "../services/deviceProfile.service.js";

const transportTypes = z.enum([...ALLOWED_TRANSPORT_TYPES]);

// Alarm Kuralları için Alt Şema (Tekrar tekrar kullanmak için ayırdık)
const AlarmRuleSchema = z.object({
  condition: z.string({ required_error: "Koşul zorunludur" }).min(1),
});

const AlarmSchema = z.object({
  alarmType: z.string().min(1, "Alarm tipi girilmelidir"),
  severity: z.enum(["CRITICAL", "MAJOR", "MINOR"]).default("MINOR"),
  createRules: AlarmRuleSchema,
  clearRules: AlarmRuleSchema.optional(),
});

const CreateDeviceProfileSchema = z.object({
  name: z.string().min(2, "Cihaz adı en az 2 karakterden oluşmalı"),
  description: z.string().optional(),
  isDefault: z.boolean().default(false).optional(),
  transportType: transportTypes.default("MQTT"),
  defaultRuleChainId: z.string().optional().nullable(),
  alarms: z.array(AlarmSchema).optional().default([]),
});

export async function create(req, res) {
  const { tenantId } = req.user;

  const body = CreateDeviceProfileSchema.parse(req.body);

  const newDeviceProfile = await DeviceProfileService.createDeviceProfile(
    body,
    tenantId
  );

  return res.status(201).json({
    ok: true,
    message: "Cihaz Profili başarıyla oluşturuldu",
    data: newDeviceProfile,
  });
}

// DeviceProfilleri aramaya parametrelerine göre listeler
export async function getDeviceProfiles(req, res) {
  const { tenantId } = req.user;
  const { queryParams } = req.query;

  const result = await DeviceProfileService.getDeviceProfiles(
    tenantId,
    queryParams
  );

  res.status(200).json({
    ok: true,
    data: result.data,
    pagination: {
      total: result.meta.total,
      page: result.meta.page,
      totalPages: result.meta.totalPages,
    },
  });
}
