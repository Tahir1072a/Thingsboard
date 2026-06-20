/**
 * rule-message.js — Rule Engine Mesaj Formatı
 *
 * Rule chain üzerinden akan mesaj nesnesi.
 * ThingsBoard TbMsg yapısına benzer.
 */

/**
 * RuleMessage oluşturucu.
 *
 * @param {object} opts
 * @param {string} opts.msgType — "POST_TELEMETRY_REQUEST", "POST_ATTRIBUTES_REQUEST", "ALARM", vb.
 * @param {string} opts.originatorId — Mesajı oluşturan entity ID (genelde deviceId)
 * @param {string} opts.originatorType — "DEVICE", "ASSET", "TENANT"
 * @param {object} opts.msg — Mesaj içeriği (telemetri değerleri, alarm verileri vb.)
 * @param {object} opts.metadata — Ek bilgiler (tenantId, deviceName, deviceType vb.)
 */
export function createRuleMessage({
  msgType = "POST_TELEMETRY_REQUEST",
  originatorId = "",
  originatorType = "DEVICE",
  msg = {},
  metadata = {},
}) {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    msgType,
    originatorId,
    originatorType,
    msg,
    metadata: {
      ...metadata,
      ts: Date.now(),
    },
  };
}

/**
 * Desteklenen mesaj tipleri
 */
export const MSG_TYPES = {
  POST_TELEMETRY: "POST_TELEMETRY_REQUEST",
  POST_ATTRIBUTES: "POST_ATTRIBUTES_REQUEST",
  ACTIVITY_EVENT: "ACTIVITY_EVENT",
  INACTIVITY_EVENT: "INACTIVITY_EVENT",
  ALARM: "ALARM",
  ALARM_CLEARED: "ALARM_CLEARED",
  RPC_REQUEST: "RPC_REQUEST_FROM_DEVICE",
  RPC_REQUEST_TO_DEVICE: "RPC_REQUEST_TO_DEVICE",
};
