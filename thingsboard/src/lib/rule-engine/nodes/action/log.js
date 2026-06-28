import logger from "../../../logger.js";

export async function logNode(msg, config) {
  const level = config.level || "info";
  const prefix = config.prefix || "[rule-engine-log]";
  const logMsg = `${prefix} [${msg.msgType}] originator=${msg.originatorId} data=${JSON.stringify(msg.msg)}`;
  if (level === "error") logger.error(logMsg);
  else if (level === "warn") logger.warn(logMsg);
  else logger.info(logMsg);
  return { success: true, msg };
}
