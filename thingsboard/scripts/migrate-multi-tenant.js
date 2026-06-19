/**
 * Multi-Tenant Migrasyon Scripti
 *
 * Mevcut single-tenant verileri multi-tenant yapıya dönüştürür.
 *
 * Kullanım:
 *   node scripts/migrate-multi-tenant.js
 *
 * Not: .env dosyasındaki MONGODB_URI kullanılır.
 */

import "dotenv/config";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI .env dosyasında bulunamadı.");
  process.exit(1);
}

async function migrate() {
  console.log("🔄 Multi-tenant migrasyonu başlatılıyor...\n");

  await mongoose.connect(MONGODB_URI);
  console.log("✅ MongoDB bağlantısı kuruldu.\n");

  const db = mongoose.connection.db;

  // 1. Mevcut kullanıcı sayısını kontrol et
  const userCount = await db.collection("users").countDocuments();
  console.log(`📊 Mevcut kullanıcı sayısı: ${userCount}`);

  if (userCount === 0) {
    console.log("ℹ️  Veritabanında kullanıcı yok — migrasyon atlanıyor.");
    await mongoose.disconnect();
    return;
  }

  // 2. Varsayılan tenant oluştur
  const existingTenant = await db.collection("tenants").findOne({ slug: "default" });
  let tenantId;

  if (existingTenant) {
    tenantId = existingTenant._id;
    console.log(`ℹ️  Varsayılan tenant zaten mevcut: ${tenantId}`);
  } else {
    const firstUser = await db.collection("users").findOne({}, { sort: { createdAt: 1 } });
    const orgName = firstUser?.organizationName || "Varsayılan Organizasyon";

    const result = await db.collection("tenants").insertOne({
      name: orgName,
      slug: "default",
      description: "Migrasyon sırasında otomatik oluşturuldu.",
      plan: "PRO",
      isActive: true,
      settings: {
        timezone: "Europe/Istanbul",
        language: "tr",
        logo: null,
        maxDevices: 500,
        maxUsers: 100,
      },
      createdBy: firstUser?._id || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    tenantId = result.insertedId;
    console.log(`✅ Varsayılan tenant oluşturuldu: ${tenantId} (${orgName})`);
  }

  // 3. Kullanıcı rollerini güncelle
  console.log("\n🔄 Kullanıcı rolleri güncelleniyor...");

  // ADMIN → TENANT_ADMIN
  const adminResult = await db.collection("users").updateMany(
    { role: "admin" },
    { $set: { role: "TENANT_ADMIN", tenantId } }
  );
  console.log(`  ✅ admin → TENANT_ADMIN: ${adminResult.modifiedCount} kullanıcı`);

  // Büyük harfli ADMIN → TENANT_ADMIN
  const adminResult2 = await db.collection("users").updateMany(
    { role: "ADMIN" },
    { $set: { role: "TENANT_ADMIN", tenantId } }
  );
  console.log(`  ✅ ADMIN → TENANT_ADMIN: ${adminResult2.modifiedCount} kullanıcı`);

  // user → VIEWER
  const userResult = await db.collection("users").updateMany(
    { role: "user" },
    { $set: { role: "VIEWER", tenantId } }
  );
  console.log(`  ✅ user → VIEWER: ${userResult.modifiedCount} kullanıcı`);

  // Diğer rollere tenantId ata (OPERATOR, VIEWER)
  const otherResult = await db.collection("users").updateMany(
    { tenantId: { $exists: false } },
    { $set: { tenantId } }
  );
  console.log(`  ✅ Diğer kullanıcılar: ${otherResult.modifiedCount} güncellendi`);

  // tenantId null olanlar
  const nullTenantResult = await db.collection("users").updateMany(
    { tenantId: null, role: { $ne: "SYSTEM_ADMIN" } },
    { $set: { tenantId } }
  );
  console.log(`  ✅ tenantId null → atandı: ${nullTenantResult.modifiedCount} kullanıcı`);

  // 4. Veri modellerine tenantId ekle
  const collections = ["devices", "deviceprofiles", "dashboards", "alarms", "audit_logs"];

  console.log("\n🔄 Veri modelleri güncelleniyor...");
  for (const col of collections) {
    try {
      const result = await db.collection(col).updateMany(
        { tenantId: { $exists: false } },
        { $set: { tenantId } }
      );
      console.log(`  ✅ ${col}: ${result.modifiedCount} belge güncellendi`);
    } catch (err) {
      console.log(`  ⚠️  ${col}: ${err.message}`);
    }
  }

  // Ayrıca tenantId: null olanları da güncelle
  for (const col of collections) {
    try {
      const result = await db.collection(col).updateMany(
        { tenantId: null },
        { $set: { tenantId } }
      );
      if (result.modifiedCount > 0) {
        console.log(`  ✅ ${col} (null fix): ${result.modifiedCount} belge güncellendi`);
      }
    } catch (err) {
      // skip
    }
  }

  // 5. Telemetri (büyük koleksiyon — batch ile)
  console.log("\n🔄 Telemetri verileri güncelleniyor (bu uzun sürebilir)...");
  try {
    const telResult = await db.collection("telemetries").updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId } }
    );
    console.log(`  ✅ telemetries: ${telResult.modifiedCount} belge güncellendi`);
  } catch (err) {
    console.log(`  ⚠️  telemetries: ${err.message}`);
  }

  // 6. Özet
  console.log("\n" + "═".repeat(50));
  console.log("✅ Multi-tenant migrasyonu tamamlandı!");
  console.log("═".repeat(50));
  console.log(`\n📋 Özet:`);
  console.log(`   Tenant: ${tenantId}`);
  console.log(`   Toplam koleksiyon: ${collections.length + 1} (+ telemetries)`);
  console.log(`\n⚠️  NOT: SYSTEM_ADMIN rolünü manuel olarak atayın:`);
  console.log(`   db.users.updateOne({email: "sizin@email.com"}, {$set: {role: "SYSTEM_ADMIN", tenantId: null}})`);

  await mongoose.disconnect();
  console.log("\n🔌 MongoDB bağlantısı kapatıldı.");
}

migrate().catch((err) => {
  console.error("❌ Migrasyon hatası:", err);
  process.exit(1);
});
