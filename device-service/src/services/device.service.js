import Device from "../models/Device.js";
import crypto from "crypto";

export function generateSafeToken() {
  return crypto.randomBytes(20).toString("hex");
}

// FR-DEV-01: Cihaz Ekleme
export async function createDevice(deviceData, tenantId) {
  // 1. İsim Benzersizliği Kontrolü (BR-05)
  const existingName = await Device.findOne({
    tenantId: tenantId,
    name: deviceData.name,
  });

  if (existingName) {
    throw new AppError(
      `'${deviceData.name}' isminde bir cihaz bu organizasyonda zaten mevcut.`,
      409
    );
  }

  // 2. Access Token Zorunluluğu ve Benzersizliği
  if (!deviceData.accessToken) {
    throw new AppError("Access Token alanı zorunludur.", 400);
  }

  // Token daha önce başka bir cihazda kullanılmış mı?
  const existingToken = await Device.findOne({
    accessToken: deviceData.accessToken,
  });

  if (existingToken) {
    throw new AppError(
      "Bu Access Token zaten kullanımda. Lütfen yeni bir token üretin.",
      409
    );
  }

  // 3. Veritabanına Kayıt
  const device = await Device.create({
    tenant: tenantId,
    name: deviceData.name,
    profile: deviceData.profile,
    tag: deviceData.tag,
    description: deviceData.description,
    accessToken: deviceData.accessToken,
    status: false,
    active: false,

    serverAttributes: {},
    clientAttributes: {},
    sharedAttributes: {},
  });

  return device;
}

// Filtre varsa filtreye göre cihazları getirir. Not: Sadece ilgili tenantın cihazlarını getirir.
export async function getDevices(tenantId, queryParams) {
  const { page = 1, limit = 10, search, profile, status } = queryParams;
  const filter = { tenant: tenantId };

  if (search) {
    // search ifadesini (sensor) => /sensor/i gibi bir regExp ifadeye dönüştürü ve bunu sorgu olarak verir.
    const searchRegex = new RegExp(search, "i"); // Case-insensitive
    filter.$or = [{ name: searchRegex }, { label: searchRegex }];
  }

  if (profile && profile !== "all") filter.profile = profile;

  const devices = Device.find(filter)
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 }); // En yeniden en eskiye sırala

  const total = await Device.countDocuments(filter);

  return {
    devices,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / limit),
  };
}

// Id ye göre tekil bir cihaz döner...
export async function getDeviceById(deviceId, tenantId) {
  const device = await Device.findOne({ _id: deviceId, tenant: tenantId });
  if (!device) throw new AppError("Cihaz bulunamadı", 404);
  return device;
}

export async function updateDevice(deviceId, tenantId, updateData) {
  const allowedUpdates = {
    name: updateData.name,
    label: updateData.label,
    description: updateData.description,
    profile: updateData.profile,
    isGateway: updateData.isGateway,
  };

  // Boş (undefined) alanları temizle
  Object.keys(allowedUpdates).forEach(
    (key) => allowedUpdates[key] === undefined && delete allowedUpdates[key]
  );

  const device = await Device.findOneAndUpdate(
    { _id: deviceId, tenant: tenantId },
    { $set: allowedUpdates },
    { new: true, runValidators: true }
  );

  if (!device) throw new AppError("Cihaz bulunamadı", 404);
  return device;
}

// Cihazı Sil
export async function deleteDevice(deviceId, tenantId) {
  const result = await Device.deleteOne({ _id: deviceId, tenant: tenantId });
  if (result.deletedCount === 0) throw new AppError("Cihaz bulunamadı", 404);
  return true;
}

// export async function saveAttributes() {

// }
