/**
 * Field Check — Mesajda belirli alanların varlığını kontrol et
 * Config: { fields: ["temperature", "humidity"] }
 * Returns: TRUE if all fields exist, FALSE otherwise
 */
export async function fieldCheck(msg, config) {
  const fields = config.fields || [];
  const allExist = fields.every((f) => msg.msg[f] !== undefined);
  return { success: true, relationType: allExist ? "TRUE" : "FALSE", msg };
}
