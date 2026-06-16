/**
 * /api/health — Sistem Sağlık Kontrolü
 *
 * Docker healthcheck, load balancer ve monitoring araçları için.
 * MongoDB ve Redis bağlantı durumlarını kontrol eder.
 *
 * 200 → Tüm bileşenler sağlıklı
 * 503 → Bir veya daha fazla bileşen erişilemez
 */

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import redis from "@/lib/redis";

export async function GET() {
  const checks = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    services: {},
  };

  let isHealthy = true;

  // ── MongoDB Kontrolü ──
  try {
    const mongoState = mongoose.connection.readyState;
    // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
    if (mongoState === 1) {
      checks.services.mongodb = { status: "up" };
    } else {
      checks.services.mongodb = {
        status: "down",
        readyState: mongoState,
      };
      isHealthy = false;
    }
  } catch (err) {
    checks.services.mongodb = { status: "down", error: err.message };
    isHealthy = false;
  }

  // ── Redis Kontrolü ──
  try {
    const pong = await redis.ping();
    if (pong === "PONG") {
      checks.services.redis = { status: "up" };
    } else {
      checks.services.redis = { status: "down", response: pong };
      isHealthy = false;
    }
  } catch (err) {
    checks.services.redis = { status: "down", error: err.message };
    isHealthy = false;
  }

  if (!isHealthy) {
    checks.status = "unhealthy";
  }

  return NextResponse.json(checks, {
    status: isHealthy ? 200 : 503,
  });
}
