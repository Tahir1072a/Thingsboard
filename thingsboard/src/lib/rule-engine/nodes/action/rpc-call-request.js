/**
 * RPC Call Request — Rule chain'den cihaza RPC gönder
 * Config: { method: "setValue", params: { pin: 1 }, timeout: 10000, oneWay: false }
 */
import connectDB from "../../../db.js";
// NOTE: Use relative imports, NOT @/ aliases (this runs in server.mjs context)

export async function rpcCallRequest(msg, config) {
  try {
    if (!config.method) return { success: false, msg };
    
    await connectDB();
    const { default: RpcRequest } = await import("../../../../models/RpcRequest.js");
    const { default: emitter } = await import("../../../event-emitter.js");
    
    const rpc = await RpcRequest.create({
      tenantId: msg.metadata.tenantId,
      deviceId: msg.originatorId,
      direction: "SERVER_TO_DEVICE",
      method: config.method,
      params: config.params || msg.msg || {},
      timeout: config.timeout || 10000,
      oneWay: config.oneWay || false,
      status: "PENDING",
    });
    
    emitter.emit("rpc:request", {
      requestId: rpc.requestId,
      deviceId: msg.originatorId,
      method: config.method,
      params: config.params || msg.msg || {},
      timeout: config.timeout || 10000,
      oneWay: config.oneWay || false,
    });
    
    // Timeout for non-oneWay
    if (!config.oneWay) {
      setTimeout(async () => {
        try {
          await connectDB();
          const req = await RpcRequest.findOne({ requestId: rpc.requestId });
          if (req && req.status === "PENDING") {
            req.status = "TIMEOUT";
            req.completedAt = new Date();
            req.errorMessage = "Cihaz yanıt vermedi (timeout).";
            await req.save();
          }
        } catch {}
      }, config.timeout || 10000);
    }
    
    console.log(`[rpc-call-request] ${config.method} → ${msg.originatorId}`);
    return { success: true, msg: { ...msg, metadata: { ...msg.metadata, rpcRequestId: rpc.requestId } } };
  } catch (err) {
    console.error("[rpc-call-request] Hata:", err.message);
    return { success: false, msg };
  }
}
