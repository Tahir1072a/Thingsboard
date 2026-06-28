/**
 * MQTT Publish — Harici MQTT broker'a mesaj yayınla
 * Config: {
 *   brokerUrl: "mqtt://broker.example.com:1883",
 *   topic: "devices/${deviceId}/data",
 *   qos: 0,
 *   username: "",
 *   password: ""
 * }
 */
import logger from "../../../logger.js";

export async function mqttPublish(msg, config) {
  if (!config.brokerUrl || !config.topic) {
    logger.warn("[mqtt-publish] brokerUrl veya topic eksik.");
    return { success: false, msg };
  }

  try {
    // Topic template render
    const topic = renderTemplate(config.topic, msg);
    const payload = JSON.stringify({
      msg: msg.msg,
      metadata: msg.metadata,
      msgType: msg.msgType,
      originatorId: msg.originatorId,
    });

    // mqtt npm paketi runtime'da import (opsiyonel bağımlılık)
    let mqtt;
    try {
      mqtt = await import("mqtt");
    } catch {
      logger.error("[mqtt-publish] 'mqtt' paketi bulunamadı. npm install mqtt gerekli.");
      return { success: false, msg };
    }

    const client = mqtt.connect(config.brokerUrl, {
      username: config.username || undefined,
      password: config.password || undefined,
      connectTimeout: 5000,
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        client.end(true);
        reject(new Error("MQTT bağlantı zaman aşımı (5s)"));
      }, 5000);

      client.on("connect", () => {
        client.publish(
          topic,
          payload,
          { qos: config.qos || 0 },
          (err) => {
            clearTimeout(timeout);
            client.end();
            if (err) reject(err);
            else resolve();
          }
        );
      });

      client.on("error", (err) => {
        clearTimeout(timeout);
        client.end(true);
        reject(err);
      });
    });

    logger.info("[mqtt-publish] → %s topic:%s", config.brokerUrl, topic);
    return { success: true, msg };
  } catch (err) {
    logger.error({ err: err.message }, "[mqtt-publish] Hata");
    return { success: false, msg };
  }
}

function renderTemplate(tpl, msg) {
  return tpl.replace(/\$\{(\w+)\}/g, (_, key) => {
    if (msg.msg[key] !== undefined) return String(msg.msg[key]);
    if (msg.metadata[key] !== undefined) return String(msg.metadata[key]);
    if (key === "deviceId") return msg.originatorId || "";
    return `\${${key}}`;
  });
}
