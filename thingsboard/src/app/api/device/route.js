import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Device from "@/models/Device";
import DeviceProfile from "@/models/DeviceProfile";
import { getSessionUser } from "@/lib/getSessionUser";
import { generateDeviceCertificate } from "@/lib/certificate";
import { auditDeviceAction } from "@/lib/audit-service";

// ------------------------------------------------------------------ //
// GET — Listeleme
// ------------------------------------------------------------------ //
export async function GET(request) {
  try {
    const userId = await getSessionUser();

    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "10")));
    const search = searchParams.get("search") ?? "";
    const active = searchParams.get("active"); // "true" | "false" | null

    await connectDB();

    const filter = { userId };

    // Metin araması
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { tag: { $regex: search, $options: "i" } },
      ];
    }

    // Durum filtresi
    if (active === "true") filter.status = "active";
    else if (active === "false") filter.status = "inactive";

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Device.find(filter).populate("profile").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Device.countDocuments(filter),
    ]);

    return NextResponse.json({
      ok: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/device]", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}

// ------------------------------------------------------------------ //
// POST — Yeni cihaz oluştur (Token veya X.509)
// ------------------------------------------------------------------ //
export async function POST(request) {
  try {
    const userId = await getSessionUser();
    const body = await request.json();

    const { name, profile, tag, description, isGateway, isPublic, accessToken, authType } = body;

    if (!name) {
      return NextResponse.json(
        { ok: false, message: "Cihaz adı zorunludur." },
        { status: 400 }
      );
    }

    await connectDB();

    const device = await Device.create({
      userId,
      name,
      profile: profile || null,
      tag: tag || "",
      description: description || "",
      isGateway: isGateway ?? false,
      isPublic: isPublic ?? false,
      authType: authType || "TOKEN",
      accessToken: authType === "X509" ? undefined : (accessToken || undefined),
      status: "active",
    });

    const responseData = {
      ok: true,
      message: "Cihaz başarıyla oluşturuldu.",
      data: device.toObject(),
    };

    // X.509 seçildiyse sertifika üret ve response'a ekle
    if (authType === "X509") {
      const certs = generateDeviceCertificate(
        device._id.toString(),
        device.name
      );

      // Parmak izini veritabanına kaydet
      device.certificateFingerprint = certs.fingerprint;
      await device.save();

      // Sertifika dosyalarını response'a ekle (Frontend ZIP yapacak)
      responseData.certificates = {
        deviceKey: certs.deviceKeyPem,
        deviceCert: certs.deviceCertPem,
        caCert: certs.caCertPem,
        fingerprint: certs.fingerprint,
      };
      responseData.data = device.toObject(); // Güncel veriyi döndür
    }

    // Audit log
    auditDeviceAction(userId, "DEVICE_CREATE", responseData.data);

    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    console.error("[POST /api/device]", error);

    // Unique constraint hatası (accessToken veya fingerprint çakışması)
    if (error.code === 11000) {
      return NextResponse.json(
        { ok: false, message: "Bu kimlik bilgisi zaten kullanımda." },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}

