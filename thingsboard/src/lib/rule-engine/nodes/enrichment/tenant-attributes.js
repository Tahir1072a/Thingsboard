/**
 * Tenant Attributes — Tenant özniteliklerini metadata'ya ekle
 * Config: { keys: ["companyName", "region"] } (opsiyonel, boşsa hepsini ekle)
 *
 * NOT: Tenant attribute'ları henüz ayrı model olarak implemente edilmedi.
 * Şimdilik Tenant modelindeki alanları metadata'ya ekler.
 */
import connectDB from "../../../db.js";

export async function tenantAttributes(msg, config) {
  try {
    await connectDB();
    const { default: mongoose } = await import("mongoose");
    const Tenant = mongoose.models.Tenant;

    if (!Tenant || !msg.metadata.tenantId) {
      return { success: true, msg };
    }

    const tenant = await Tenant.findById(msg.metadata.tenantId).lean();
    if (!tenant) return { success: true, msg };

    const enriched = { ...msg, metadata: { ...msg.metadata } };
    const allowedKeys = config.keys && config.keys.length > 0 ? config.keys : null;

    // Tenant alanlarını metadata'ya ekle
    const tenantFields = ["name", "email", "phone", "country", "city", "address"];
    for (const field of tenantFields) {
      if (tenant[field] !== undefined && (!allowedKeys || allowedKeys.includes(field))) {
        enriched.metadata[`tenant_${field}`] = tenant[field];
      }
    }

    return { success: true, msg: enriched };
  } catch (err) {
    console.error("[tenant-attributes] Hata:", err.message);
    return { success: false, msg };
  }
}
