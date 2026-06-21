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

    const searchParams = new URL(request.url).searchParams;
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");

    const filter = { tenantId };
    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const [data, total] = await Promise.all([
      RuleChain.find(filter)
        .sort({ isRoot: -1, updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      RuleChain.countDocuments(filter),
    ]);

    return NextResponse.json({
      ok: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
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
