/**
 * alias-resolver.js — Entity Alias Çözümleme Motoru
 *
 * Dashboard'daki alias tanımlarını gerçek cihaz listelerine dönüştürür.
 * Her alias tipi farklı bir strateji ile çözümlenir.
 *
 * Desteklenen alias tipleri:
 *  - SINGLE_DEVICE:             Tek cihaz
 *  - DEVICE_LIST:               Birden fazla cihaz (elle seçilmiş)
 *  - ASSET_CHILDREN:            Asset'in altındaki tüm cihazlar
 *  - DEVICE_PROFILE:            Belirli profildeki tüm cihazlar
 *  - ASSET_CHILDREN_BY_PROFILE: Asset altında + profil filtreli
 */

import connectDB from "./db.js";
import Device from "../models/Device.js";
import Asset from "../models/Asset.js";
import DeviceProfile from "../models/DeviceProfile.js";
import logger from "./logger.js";

/**
 * Tek bir alias'ı çözümle → cihaz listesi döndür.
 *
 * @param {object} alias — { id, aliasName, type, config }
 * @param {string} tenantId — Tenant ID
 * @returns {Promise<Array<{id: string, name: string, profileName?: string}>>}
 */
export async function resolveAlias(alias, tenantId) {
  await connectDB();

  if (!alias || !alias.type) {
    return [];
  }

  try {
    switch (alias.type) {
      case "SINGLE_DEVICE":
        return await resolveSingleDevice(alias.config, tenantId);

      case "DEVICE_LIST":
        return await resolveDeviceList(alias.config, tenantId);

      case "ASSET_CHILDREN":
        return await resolveAssetChildren(alias.config, tenantId);

      case "DEVICE_PROFILE":
        return await resolveDeviceProfile(alias.config, tenantId);

      case "ASSET_CHILDREN_BY_PROFILE":
        return await resolveAssetChildrenByProfile(alias.config, tenantId);

      default:
        logger.warn("[alias-resolver] Bilinmeyen alias tipi: %s", alias.type);
        return [];
    }
  } catch (err) {
    logger.error({ err }, "[alias-resolver] Alias çözümleme hatası (%s)", alias.id);
    return [];
  }
}

/**
 * Birden fazla alias'ı toplu çözümle.
 *
 * @param {Array} aliases — entityAliases dizisi
 * @param {string} tenantId
 * @returns {Promise<Object>} — { [aliasId]: [{id, name, profileName}] }
 */
export async function resolveAliases(aliases, tenantId) {
  if (!aliases || aliases.length === 0) return {};

  await connectDB();

  const resolved = {};
  // Paralel çözümle — her alias bağımsız
  const results = await Promise.allSettled(
    aliases.map(async (alias) => ({
      id: alias.id,
      devices: await resolveAlias(alias, tenantId),
    }))
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      resolved[result.value.id] = result.value.devices;
    }
  }

  return resolved;
}

/* ──────────────────────────────────────────────
 * Strateji İmplementasyonları
 * ────────────────────────────────────────────── */

/**
 * SINGLE_DEVICE: Tek bir cihaz.
 * config: { deviceId: "..." }
 */
async function resolveSingleDevice(config, tenantId) {
  if (!config?.deviceId) return [];

  const device = await Device.findOne({
    _id: config.deviceId,
    tenantId,
  })
    .populate("profile", "name")
    .lean();

  if (!device) return [];

  return [
    {
      id: device._id.toString(),
      name: device.name,
      profileName: device.profile?.name || "",
    },
  ];
}

/**
 * DEVICE_LIST: Elle seçilmiş cihaz listesi.
 * config: { deviceIds: ["id1", "id2", ...] }
 */
async function resolveDeviceList(config, tenantId) {
  if (!config?.deviceIds || config.deviceIds.length === 0) return [];

  const devices = await Device.find({
    _id: { $in: config.deviceIds },
    tenantId,
  })
    .populate("profile", "name")
    .lean();

  return devices.map((d) => ({
    id: d._id.toString(),
    name: d.name,
    profileName: d.profile?.name || "",
  }));
}

/**
 * ASSET_CHILDREN: Bir asset'in altındaki TÜM cihazlar.
 * config: { assetId: "..." }
 */
async function resolveAssetChildren(config, tenantId) {
  if (!config?.assetId) return [];

  const asset = await Asset.findOne({
    _id: config.assetId,
    tenantId,
  }).lean();

  if (!asset || !asset.relations || asset.relations.length === 0) return [];

  // Sadece DEVICE tipindeki ilişkileri al
  const deviceIds = asset.relations
    .filter((r) => r.entityType === "DEVICE")
    .map((r) => r.entityId.toString());

  if (deviceIds.length === 0) return [];

  const devices = await Device.find({
    _id: { $in: deviceIds },
    tenantId,
  })
    .populate("profile", "name")
    .lean();

  return devices.map((d) => ({
    id: d._id.toString(),
    name: d.name,
    profileName: d.profile?.name || "",
  }));
}

/**
 * DEVICE_PROFILE: Belirli bir profile sahip tüm cihazlar.
 * config: { deviceProfileId: "..." }
 */
async function resolveDeviceProfile(config, tenantId) {
  if (!config?.deviceProfileId) return [];

  const devices = await Device.find({
    profile: config.deviceProfileId,
    tenantId,
  })
    .populate("profile", "name")
    .lean();

  return devices.map((d) => ({
    id: d._id.toString(),
    name: d.name,
    profileName: d.profile?.name || "",
  }));
}

/**
 * ASSET_CHILDREN_BY_PROFILE: Asset altındaki cihazlar + profil filtresi.
 * config: { assetId: "...", deviceProfileId: "..." }
 *
 * En güçlü strateji — "Bu sera'nın sıcaklık sensörlerini getir" senaryosu.
 */
async function resolveAssetChildrenByProfile(config, tenantId) {
  if (!config?.assetId) return [];

  const asset = await Asset.findOne({
    _id: config.assetId,
    tenantId,
  }).lean();

  if (!asset || !asset.relations || asset.relations.length === 0) return [];

  const deviceIds = asset.relations
    .filter((r) => r.entityType === "DEVICE")
    .map((r) => r.entityId.toString());

  if (deviceIds.length === 0) return [];

  // Profil filtresi varsa uygula
  const query = {
    _id: { $in: deviceIds },
    tenantId,
  };

  if (config.deviceProfileId) {
    query.profile = config.deviceProfileId;
  }

  const devices = await Device.find(query)
    .populate("profile", "name")
    .lean();

  return devices.map((d) => ({
    id: d._id.toString(),
    name: d.name,
    profileName: d.profile?.name || "",
  }));
}
