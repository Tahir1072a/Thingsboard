import DeviceProfile from "../models/DeviceProfile.js";
import RuleChain from "../models/RuleChain.js";

export const ALLOWED_TRANSPORT_TYPES = ["MQTT", "HTTP", "COAP"];

export async function createDeviceProfile(profileData, tenantId) {
  const existingName = await DeviceProfile.findOne({
    tenantId: tenantId,
    name: profileData.name,
  });

  if (existingName) {
    throw new AppError(
      `${profileData.name} isminde bir cihaz bu organizasyonda zaten mevcut`
    );
  }

  let transportType = profileData.transportType || "MQTT";

  if (!ALLOWED_TRANSPORT_TYPES.includes(transportType)) {
    throw new AppError(
      `Geçersiz transport tipi. İzin verilenler: ${ALLOWED_TRANSPORT_TYPES.join(
        `, `
      )}`,
      400
    );
  }

  if (profileData.defaultRuleChainId) {
    const ruleChainExist = await RuleChain.findOne({
      _id: profileData.defaultRuleChainId,
      tenantId: tenantId,
    });

    if (!ruleChainExist) {
      throw new AppError(
        "Belirtilen Rule Chain bulunamadı veya bu organizasyona ait değil.",
        404
      );
    }
  }

  const deviceProfile = await DeviceProfile.create({
    tenantId: tenantId,
    name: profileData.name,
    description: profileData.description,
    transportType: transportType,
    defaultRuleChainId: profileData.defaultRuleChainId || null,
    alarms: profileData.alarms || null,
    // İleride buraya veya 'provisionType' alanlarını da ekleyeceksin
  });

  return deviceProfile;
}

// Arama filtrelerine göre verileri sayfalayarak gönderir.
// Ayrıca toplam veri sayısınıda gönderir.
export async function getDeviceProfiles(tenantId, queryParams = {}) {
  const { page = 1, limit = 10, search, transportType } = queryParams;
  const filter = { tenantId: tenantId };

  if (search) {
    const searchRegex = new RegExp(search, "i");
    filter.$or = [{ name: searchRegex }, { description: searchRegex }];
  }

  if (transportType) {
    filter.transportType = transportType;
  }

  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);
  const skip = (pageNumber - 1) * limitNumber;

  const [profiles, total] = await Promise.all([
    DeviceProfile.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean(),

    DeviceProfile.countDocuments(filter),
  ]);

  return {
    ok: true,
    data: profiles,
    meta: {
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
    },
  };
}
