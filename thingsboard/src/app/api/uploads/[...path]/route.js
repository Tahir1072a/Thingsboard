import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export async function GET(request, context) {
  try {
    const { params } = context;
    const pathArray = await params.path;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const filePath = path.join(uploadDir, ...pathArray);

    // Güvenlik: Dizin dışına çıkılmasını engelle (Directory traversal)
    if (!filePath.startsWith(uploadDir)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (!fs.existsSync(filePath)) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    
    // Basit MIME type tespiti
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp'
    };
    
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.error("[GET /api/uploads]", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
