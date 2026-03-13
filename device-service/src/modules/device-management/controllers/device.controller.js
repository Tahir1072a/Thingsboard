import z, { string, success } from "zod";
import * as DeviceService from "../services/device.service.js";
import AppError from "../../../utilts/AppError.js";

// --- FR-DEV-01: Cihaz Ekleme Şeması ---
const CreateDeviceSchema = z.object({
  name: z.string().min(2, "Cihaz adı en az 2 karakter olmalıdır"),
  profile: z.string().regex(/^[0-9a-fA-F]{24}$/, "Geçersiz Profil ID'si"),
  tag: z.string().optional(),
  // SRS gereği token FR-DEV-15'ten alınmış ve buraya gönderilmiş olmalıdır.
  accessToken: z.string().min(10, "Geçersiz Access Token"),
  description: z.string().optional(),
});

// FR-DEV-01 Controller
export async function create(req, res) {
  const { tenantId } = req.user;

  // 1. Validasyon
  const body = CreateDeviceSchema.parse(req.body);

  // 2. Servis Çağrısı
  const newDevice = await DeviceService.createDevice(body, tenantId);

  return res.status(201).json({
    ok: true,
    message: "Cihaz başarıyla oluşturuldu",
    data: newDevice,
  });
}

// --FR-DEV-2
export async function getDevices(req, res) {
  const { tenantId } = req.user;
  const { queryParams } = req.query || {};

  const result = await DeviceService.getDevices(tenantId, queryParams);

  res.status(200).json({
    ok: true,
    data: result.devices,
    pagination: {
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    },
  });
}

// --- FR-DEV-15: Token Üretme Controller ---
export async function generateToken(req, res) {
  const token = DeviceService.generateSafeToken();

  return res.status(200).json({
    ok: true,
    message: "Güvenli token oluşturuldu",
    data: {
      token: token,
    },
  });
}

// GET api/device
export async function getById(req, res, next) {}

// Delete
export async function deleteDevice(req, res) {
  const { tenantId } = req.user;
  const { deviceId } = await req.params;

  const result = await DeviceService.deleteDevice(deviceId, tenantId);

  return res.status(200).json({
    ok: result,
    message: "Cihaz başarıyla silinmiştir.",
  });
}

export async function deleteManyDevices(req, res, next) {
  const { deviceIds } = req.body;

  if (!deviceIds || !Array.isArray(deviceIds) || deviceIds.length === 0) {
    return res.status(400).json({
      message:
        "Lütfen silinecek cihazları seçin (Liste boş veya hatalı format).",
    });
  }
  const { tenantId } = req.user;

  const result = await DeviceService.deleteMany(deviceIds, tenantId);

  if (deviceIds.length !== result.deleted) {
    return res.status(200).json({
      ok: true,
      message: `${result.requested} cihazdan ${result.deleted} cihaz başarıyla silindi`,
    });
  }

  return res.status(200).json({
    ok: true,
    message: "İstenilen tüm cihazlar silindi.",
  });
}
