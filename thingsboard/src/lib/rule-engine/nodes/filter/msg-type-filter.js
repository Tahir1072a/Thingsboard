/**
 * Message Type Filter — Mesaj tipine göre yönlendirme
 * Config: { msgTypes: ["POST_TELEMETRY_REQUEST", "ALARM"] }
 * Returns: relationType TRUE if msg.msgType in list, FALSE otherwise
 */
export async function msgTypeFilter(msg, config) {
  const types = config.msgTypes || [];
  const match = types.includes(msg.msgType);
  return { success: true, relationType: match ? "TRUE" : "FALSE", msg };
}
