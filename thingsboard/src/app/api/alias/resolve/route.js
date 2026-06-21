import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveAliases } from "@/lib/alias-resolver";

/**
 * POST /api/alias/resolve
 *
 * Alias tanımlarını çözümleyerek gerçek cihaz listelerine dönüştürür.
 * Frontend'den alias preview ve widget rendering için kullanılır.
 *
 * Body: { aliases: [{id, aliasName, type, config}] }
 * Response: { ok: true, resolved: { [aliasId]: [{id, name, profileName}] } }
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Yetkisiz." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { aliases } = body;

    if (!aliases || !Array.isArray(aliases) || aliases.length === 0) {
      return NextResponse.json(
        { ok: false, message: "aliases dizisi zorunludur." },
        { status: 400 }
      );
    }

    // Alias sayısını sınırla (güvenlik)
    if (aliases.length > 50) {
      return NextResponse.json(
        { ok: false, message: "En fazla 50 alias çözümlenebilir." },
        { status: 400 }
      );
    }

    const tenantId = session.user.tenantId;
    const resolved = await resolveAliases(aliases, tenantId);

    return NextResponse.json({
      ok: true,
      resolved,
    });
  } catch (error) {
    console.error("[POST /api/alias/resolve]", error);
    return NextResponse.json(
      { ok: false, message: "Alias çözümleme hatası: " + error.message },
      { status: 500 }
    );
  }
}
