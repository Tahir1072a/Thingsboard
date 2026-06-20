/**
 * RPC Call Reply — Client-side RPC'ye yanıt döner
 * Config: { responseBody: { result: "ok" } } — veya msg.msg'den alır
 */
import connectDB from "../../../db.js";

export async function rpcCallReply(msg, config) {
  try {
    const requestId = msg.metadata?.rpcRequestId;
    if (!requestId) {
      console.warn("[rpc-call-reply] rpcRequestId metadata'da bulunamadı");
      return { success: false, msg };
    }
    
    await connectDB();
    const { default: RpcRequest } = await import("../../../../models/RpcRequest.js");
    const { default: emitter } = await import("../../../event-emitter.js");
    
    const rpc = await RpcRequest.findOne({ requestId });
    if (!rpc) return { success: false, msg };
    
    const responseBody = config.responseBody || msg.msg || {};
    
    rpc.status = "SUCCESS";
    rpc.response = responseBody;
    rpc.completedAt = new Date();
    await rpc.save();
    
    // Cihaza yanıt gönder (MQTT response topic)
    emitter.emit("rpc:reply", {
      requestId,
      deviceId: rpc.deviceId.toString(),
      response: responseBody,
    });
    
    console.log(`[rpc-call-reply] Yanıt gönderildi: ${requestId}`);
    return { success: true, msg };
  } catch (err) {
    console.error("[rpc-call-reply] Hata:", err.message);
    return { success: false, msg };
  }
}
