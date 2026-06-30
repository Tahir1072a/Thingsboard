import emitter from "../event-emitter.js";
import logger from "../logger.js";
import RpcRequest from "../../models/RpcRequest.js";
import connectDB from "../db.js";

export function setupRpcHandlers(aedesInstance) {

  // ── Persistent RPC: Cihaz bağlandığında kuyruktaki komutları gönder ──
  aedesInstance.on("client", async (client) => {
    if (!client.deviceId) return;
    try {
      await connectDB();

      const queuedRpcs = await RpcRequest.find({
        deviceId: client.deviceId,
        status: "QUEUED",
        $or: [
          { expirationTime: null },
          { expirationTime: { $gt: new Date() } },
        ],
      }).sort({ createdAt: 1 });

      for (const rpc of queuedRpcs) {
        rpc.status = "PENDING";
        await rpc.save();
        emitter.emit("rpc:request", {
          requestId: rpc.requestId,
          deviceId: rpc.deviceId.toString(),
          method: rpc.method,
          params: rpc.params,
          timeout: rpc.timeout,
          oneWay: rpc.oneWay || false,
        });
        logger.info({ requestId: rpc.requestId }, "Persistent RPC kuyruğundan gönderildi");
      }
    } catch (err) {
      logger.error({ err }, "Persistent RPC kuyruk hatası");
    }
  });

  // ── RPC: Platform → Cihaz komutu (MQTT publish) ──
  emitter.on("rpc:request", (rpcData) => {
    // Bağlı MQTT client'ları arasında cihazı bul
    const clients = aedesInstance.clients || {};
    for (const [, mqttClient] of Object.entries(clients)) {
      if (mqttClient.deviceId && String(mqttClient.deviceId) === String(rpcData.deviceId)) {
        const topic = `v1/devices/me/rpc/request/${rpcData.requestId}`;
        const payload = JSON.stringify({
          id: rpcData.requestId,
          method: rpcData.method,
          params: rpcData.params,
        });

        mqttClient.publish({
          topic,
          payload: Buffer.from(payload),
          qos: 1,
          retain: false,
        }, async (err) => {
          if (err) {
            logger.error({ err, requestId: rpcData.requestId }, "MQTT RPC publish hatası");
          } else {
            logger.info({ requestId: rpcData.requestId, device: rpcData.deviceId }, "MQTT RPC komutu gönderildi");
            // Status'u DELIVERED olarak güncelle
            try {
              await connectDB();

              // One-Way RPC: teslim edilince tamamlandı say
              if (rpcData.oneWay) {
                await RpcRequest.updateOne(
                  { requestId: rpcData.requestId, status: "PENDING" },
                  { status: "DELIVERED", completedAt: new Date() }
                );
              } else {
                await RpcRequest.updateOne(
                  { requestId: rpcData.requestId, status: "PENDING" },
                  { status: "DELIVERED" }
                );
              }
            } catch (dbErr) {
              logger.error({ err: dbErr }, "RPC DELIVERED status güncellenemedi");
            }
          }
        });
        return;
      }
    }
    logger.warn({ requestId: rpcData.requestId, deviceId: rpcData.deviceId }, "MQTT RPC: Cihaz bağlı değil");
  });

  // ── RPC Reply: Client-side RPC'ye yanıt gönder (Rule Engine'den) ──
  emitter.on("rpc:reply", (replyData) => {
    const clients = aedesInstance.clients || {};
    for (const [, mqttClient] of Object.entries(clients)) {
      if (mqttClient.deviceId && String(mqttClient.deviceId) === String(replyData.deviceId)) {
        const topic = `v1/devices/me/rpc/response/${replyData.requestId.replace('csrpc_', '')}`;
        const payload = JSON.stringify(replyData.response || {});

        mqttClient.publish({
          topic,
          payload: Buffer.from(payload),
          qos: 1,
          retain: false,
        }, (err) => {
          if (err) logger.error({ err }, "RPC reply publish hatası");
          else logger.info({ requestId: replyData.requestId }, "Client-Side RPC yanıtı gönderildi");
        });
        return;
      }
    }
    logger.warn({ requestId: replyData.requestId }, "RPC reply: Cihaz bağlı değil");
  });

}
