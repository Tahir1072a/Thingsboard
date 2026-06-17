/**
 * /api/upload — Dosya Yükleme Endpoint'i
 *
 * Cloudflare R2'ye görsel yükler ve public URL döndürür.
 * Desteklenen formatlar: image/png, image/jpeg, image/svg+xml, image/webp
 * Maksimum dosya boyutu: 5MB
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import r2, { R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";
import crypto from "crypto";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
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

    // R2 yapılandırma kontrolü
    if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID) {
      return NextResponse.json(
        { ok: false, message: "Dosya yükleme servisi yapılandırılmamış." },
        { status: 503 }
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
        { ok: false, message: "Dosya boyutu 5MB'ı aşamaz." },
        { status: 400 }
      );
    }

    // Benzersiz dosya adı oluştur
    const ext = file.name.split(".").pop() || "png";
    const uniqueName = `floor-plans/${crypto.randomUUID()}.${ext}`;

    // Dosyayı buffer'a oku
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // R2'ye yükle
    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: uniqueName,
        Body: buffer,
        ContentType: file.type,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    // Public URL oluştur
    const url = R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL}/${uniqueName}`
      : `${process.env.R2_ENDPOINT}/${R2_BUCKET}/${uniqueName}`;

    return NextResponse.json({
      ok: true,
      url,
      fileName: uniqueName,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error("[POST /api/upload]", error);
    return NextResponse.json(
      { ok: false, message: "Dosya yükleme başarısız: " + error.message },
      { status: 500 }
    );
  }
}
