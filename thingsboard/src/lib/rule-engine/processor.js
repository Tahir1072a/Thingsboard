/**
 * processor.js — Rule Engine Ana İşlemci
 *
 * RuleMessage'ı rule chain'in node'ları üzerinden yürütür.
 * Her node bir sonucu döner: { success: bool, msg: RuleMessage }
 * Sonuca göre (SUCCESS/FAILURE/TRUE/FALSE) ilgili bağlantılar takip edilir.
 */

import connectDB from "../db.js";
import RuleChain from "../../models/RuleChain.js";

// Node işleyicileri
import { msgTypeFilter } from "./nodes/filter/msg-type-filter.js";
import { scriptFilter } from "./nodes/filter/script-filter.js";
import { fieldCheck } from "./nodes/filter/field-check.js";
import { saveTelemetry } from "./nodes/action/save-telemetry.js";
import { createAlarm } from "./nodes/action/create-alarm.js";
import { clearAlarm } from "./nodes/action/clear-alarm.js";
import { sendEmailNode } from "./nodes/action/send-email.js";
import { logNode } from "./nodes/action/log.js";
import { deviceAttributes } from "./nodes/enrichment/device-attributes.js";
import { tenantAttributes } from "./nodes/enrichment/tenant-attributes.js";
import { scriptTransform } from "./nodes/transformation/script-transform.js";
import { renameKeys } from "./nodes/transformation/rename-keys.js";
import { restApiCall } from "./nodes/external/rest-api-call.js";
import { telegramNode } from "./nodes/external/telegram.js";
import { mqttPublish } from "./nodes/external/mqtt-publish.js";
import { rpcCallRequest } from "./nodes/action/rpc-call-request.js";
import { rpcCallReply } from "./nodes/action/rpc-call-reply.js";

// Node tipi → işleyici eşlemesi
const NODE_HANDLERS = {
  MSG_TYPE_FILTER: msgTypeFilter,
  SCRIPT_FILTER: scriptFilter,
  FIELD_CHECK: fieldCheck,
  SAVE_TELEMETRY: saveTelemetry,
  CREATE_ALARM: createAlarm,
  CLEAR_ALARM: clearAlarm,
  SEND_EMAIL: sendEmailNode,
  LOG: logNode,
  DEVICE_ATTRIBUTES: deviceAttributes,
  TENANT_ATTRIBUTES: tenantAttributes,
  SCRIPT_TRANSFORM: scriptTransform,
  RENAME_KEYS: renameKeys,
  REST_API_CALL: restApiCall,
  TELEGRAM: telegramNode,
  MQTT_PUBLISH: mqttPublish,
  RPC_CALL_REQUEST: rpcCallRequest,
  RPC_CALL_REPLY: rpcCallReply,
};

/**
 * Mesajı rule chain üzerinden işle.
 *
 * @param {string} tenantId — Tenant ID
 * @param {object} ruleMessage — createRuleMessage() ile oluşturulmuş mesaj
 * @param {string} [chainId] — Spesifik chain ID (yoksa root chain kullanılır)
 */
export async function processRuleChain(tenantId, ruleMessage, chainId) {
  try {
    await connectDB();

    // Chain'i bul
    let chain;
    if (chainId) {
      chain = await RuleChain.findOne({ _id: chainId, tenantId }).lean();
    } else {
      chain = await RuleChain.getRootChain(tenantId);
    }

    if (!chain || !chain.nodes || chain.nodes.length === 0) {
      return; // Chain yoksa sessizce çık
    }

    // Node haritası oluştur
    const nodeMap = new Map();
    chain.nodes.forEach((node) => nodeMap.set(node.nodeId, node));

    // Connection haritası oluştur (fromNodeId → [{toNodeId, relationType}])
    const connMap = new Map();
    (chain.connections || []).forEach((conn) => {
      if (!connMap.has(conn.fromNodeId)) connMap.set(conn.fromNodeId, []);
      connMap.get(conn.fromNodeId).push(conn);
    });

    // İlk node'dan başla
    const startNodeId = chain.firstNodeId || chain.nodes[0]?.nodeId;
    if (!startNodeId) return;

    // BFS/DFS ile node'ları işle (max 50 adım — sonsuz döngü koruması)
    const queue = [{ nodeId: startNodeId, msg: ruleMessage }];
    const visited = new Set();
    let steps = 0;
    const MAX_STEPS = 50;

    while (queue.length > 0 && steps < MAX_STEPS) {
      const { nodeId, msg } = queue.shift();
      steps++;

      // Sonsuz döngü koruması — aynı node'a aynı mesajla tekrar gelme
      const visitKey = `${nodeId}:${msg.id}`;
      if (visited.has(visitKey)) continue;
      visited.add(visitKey);

      const node = nodeMap.get(nodeId);
      if (!node) continue;

      const handler = NODE_HANDLERS[node.type];
      if (!handler) {
        console.warn(`[rule-engine] Bilinmeyen node tipi: ${node.type}`);
        continue;
      }

      try {
        // Node'u çalıştır
        const result = await handler(msg, node.config || {});

        // Sonuca göre bağlantıları takip et
        const connections = connMap.get(nodeId) || [];

        for (const conn of connections) {
          let shouldFollow = false;

          if (result.relationType) {
            // Node belirli bir relationType döndüyse (filter node'ları için)
            shouldFollow = conn.relationType === result.relationType;
          } else if (result.success) {
            shouldFollow = conn.relationType === "SUCCESS";
          } else {
            shouldFollow = conn.relationType === "FAILURE";
          }

          if (shouldFollow) {
            queue.push({
              nodeId: conn.toNodeId,
              msg: result.msg || msg,
            });
          }
        }
      } catch (err) {
        console.error(
          `[rule-engine] Node hatası: ${node.name} (${node.type})`,
          err.message
        );

        // Hata durumunda FAILURE bağlantılarını takip et
        const connections = connMap.get(nodeId) || [];
        for (const conn of connections) {
          if (conn.relationType === "FAILURE") {
            queue.push({ nodeId: conn.toNodeId, msg });
          }
        }
      }
    }

    if (steps >= MAX_STEPS) {
      console.warn(`[rule-engine] Max adım limiti aşıldı (${MAX_STEPS}), chain: ${chain.name}`);
    }
  } catch (err) {
    console.error("[rule-engine] processRuleChain hatası:", err.message);
  }
}
