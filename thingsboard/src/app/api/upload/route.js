import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import r2, { R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/svg+xml",
  "image/webp",
];

export async function POST(request) {
  try {
    // Auth kontrolü
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Yetkisiz." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { ok: false, message: "Dosya bulunamadı." },
        { status: 400 }
      );
    }

    // MIME type kontrolü
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          ok: false,
          message: `Desteklenmeyen dosya türü: ${file.type}. İzin verilen: PNG, JPEG, SVG, WebP`,
        },
        { status: 400 }
      );
    }

    // Boyut kontrolü
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { ok: false, message: "Dosya boyutu 10MB'ı aşamaz." },
        { status: 400 }
      );
    }

    // Dosya adı oluştur
    const ext = file.name.split(".").pop() || "png";
    const uniqueName = `${crypto.randomUUID()}.${ext}`;

    // Dosyayı buffer'a oku
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // R2 yapılandırılmış mı kontrol et (Geliştirme aşamasında UPLOAD_PROVIDER=local ile devre dışı bırakılabilir)
    const useR2 = process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.UPLOAD_PROVIDER !== "local";

    if (useR2) {
      // ── Cloudflare R2 ──

      const r2Key = `floor-plans/${uniqueName}`;
      await r2.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: r2Key,
          Body: buffer,
          ContentType: file.type,
          CacheControl: "public, max-age=31536000, immutable",
        })
      );

      const url = R2_PUBLIC_URL
        ? `${R2_PUBLIC_URL}/${r2Key}`
        : `${process.env.R2_ENDPOINT}/${R2_BUCKET}/${r2Key}`;

      return NextResponse.json({
        ok: true,
        url,
        fileName: r2Key,
        size: file.size,
        type: file.type,
      });
    } else {
      // ── Lokal dosya sistemi fallback ──
      const uploadDir = path.join(process.cwd(), "public", "uploads", "floor-plans");
      await mkdir(uploadDir, { recursive: true });

      const filePath = path.join(uploadDir, uniqueName);
      await writeFile(filePath, buffer);

      const url = `/api/uploads/floor-plans/${uniqueName}`;

      return NextResponse.json({
        ok: true,
        url,
        fileName: uniqueName,
        size: file.size,
        type: file.type,
      });
    }
  } catch (error) {
    console.error("[POST /api/upload]", error);
    return NextResponse.json(
      { ok: false, message: "Dosya yükleme başarısız: " + error.message },
      { status: 500 }
    );
  }
}
