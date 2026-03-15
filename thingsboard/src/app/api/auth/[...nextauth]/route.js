/**
 * NextAuth.js API Route Handler
 *
 * /api/auth/* altındaki tüm auth endpoint'lerini NextAuth yönetir:
 *   /api/auth/signin
 *   /api/auth/signout
 *   /api/auth/session
 *   /api/auth/csrf
 *   /api/auth/callback/*
 */

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
