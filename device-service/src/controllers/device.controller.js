import z, { string } from "zod";
import * as DeviceService from "../services/device.service.js";

// --- FR-DEV-01: Cihaz Ekleme Şeması ---
const CreateDeviceSchema = z.object({
  name: z.string().min(2, "Cihaz adı en az 2 karakter olmalıdır"),
  profile: z.string(),
  tag: z.string().optional(),
  // SRS gereği token FR-DEV-15'ten alınmış ve buraya gönderilmiş olmalıdır.
  accessToken: z.string().min(10, "Geçersiz Access Token"),
  isGateway: z.boolean().default(false),
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
export async function getDevices(req, res, next) {}

export async function getById(req, res, next) {}

export async function getAll(req, res, next) {}
