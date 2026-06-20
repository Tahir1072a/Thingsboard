/**
 * /api/rule-chain — Rule Chain CRUD
 *
 * GET  — Tenant'a ait tüm rule chain'leri listele
 * POST — Yeni rule chain oluştur
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import RuleChain from "@/models/RuleChain";
import { getSessionUser } from "@/lib/getSessionUser";

export async function GET(request) {
  try {
    const { userId, tenantId } = await getSessionUser();
    await connectDB();

    const chains = await RuleChain.find({ tenantId })
      .sort({ isRoot: -1, updatedAt: -1 })
      .lean();

    return NextResponse.json({ ok: true, count: chains.length, data: chains });
  } catch (error) {
    console.error("[GET /api/rule-chain]", error.message);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { userId, tenantId } = await getSessionUser();
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { ok: false, message: "Kural zinciri adı zorunludur." },
        { status: 400 }
      );
    }

    await connectDB();

    // Root yapılmak isteniyorsa, mevcut root'u kaldır
    if (body.isRoot) {
      await RuleChain.updateMany({ tenantId, isRoot: true }, { isRoot: false });
    }

    const chain = await RuleChain.create({
      tenantId,
      name: body.name,
      description: body.description || "",
      isRoot: body.isRoot || false,
      nodes: body.nodes || [],
      connections: body.connections || [],
      firstNodeId: body.firstNodeId || "",
    });

    return NextResponse.json({ ok: true, data: chain }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/rule-chain]", error.message);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }
}
