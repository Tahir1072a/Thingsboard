/**
 * /api/rule-chain/[id] — Tekil Rule Chain
 *
 * GET    — Detay
 * PUT    — Güncelle (nodes, connections, firstNodeId dahil)
 * DELETE — Sil
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import RuleChain from "@/models/RuleChain";
import { getSessionUser } from "@/lib/getSessionUser";

export async function GET(request, { params }) {
  try {
    const { userId, tenantId } = await getSessionUser();
    const { id } = await params;
    await connectDB();

    const chain = await RuleChain.findOne({ _id: id, tenantId }).lean();
    if (!chain) {
      return NextResponse.json(
        { ok: false, message: "Kural zinciri bulunamadı." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: chain });
  } catch (error) {
    console.error("[GET /api/rule-chain/:id]", error.message);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { userId, tenantId } = await getSessionUser();
    const { id } = await params;
    const body = await request.json();
    await connectDB();

    const chain = await RuleChain.findOne({ _id: id, tenantId });
    if (!chain) {
      return NextResponse.json(
        { ok: false, message: "Kural zinciri bulunamadı." },
        { status: 404 }
      );
    }

    // Root yapılmak isteniyorsa
    if (body.isRoot && !chain.isRoot) {
      await RuleChain.updateMany(
        { tenantId, isRoot: true, _id: { $ne: id } },
        { isRoot: false }
      );
    }

    if (body.name !== undefined) chain.name = body.name;
    if (body.description !== undefined) chain.description = body.description;
    if (body.isRoot !== undefined) chain.isRoot = body.isRoot;
    if (body.nodes !== undefined) chain.nodes = body.nodes;
    if (body.connections !== undefined) chain.connections = body.connections;
    if (body.firstNodeId !== undefined) chain.firstNodeId = body.firstNodeId;

    await chain.save();

    return NextResponse.json({ ok: true, data: chain });
  } catch (error) {
    console.error("[PUT /api/rule-chain/:id]", error.message);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { userId, tenantId } = await getSessionUser();
    const { id } = await params;
    await connectDB();

    const result = await RuleChain.findOneAndDelete({ _id: id, tenantId });
    if (!result) {
      return NextResponse.json(
        { ok: false, message: "Kural zinciri bulunamadı." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, message: "Kural zinciri silindi." });
  } catch (error) {
    console.error("[DELETE /api/rule-chain/:id]", error.message);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }
}
