/**
 * middleware.js — Route Koruması
 *
 * NextAuth.js getToken ile JWT doğrulaması yapar.
 * - Korumalı rotalar (/(main)/*) → giriş yapmamışsa /login'e yönlendir
 * - Auth rotaları (/login, /register) → giriş yapmışsa /dashboard'a yönlendir
 */

import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Herkese açık (giriş gerektirmeyen) rotalar
const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/activate"];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Herkese açık sayfa mı?
  const isPublicPage = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  // NextAuth JWT token'ını kontrol et
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthenticated = !!token;

  // ── Giriş yapmış kullanıcı auth sayfasında → dashboard'a yönlendir ──
  if (isPublicPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // ── Giriş yapmamış kullanıcı korumalı sayfada → login'e yönlendir ──
  if (!isPublicPage && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Middleware'in çalışacağı path'ler
export const config = {
  matcher: [
    /*
     * Aşağıdakileri HARİÇ TUT:
     *   _next/static, _next/image, favicon.ico, api/* (NextAuth kendi yönetir)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
