export async function logNode(msg, config) {
  const level = config.level || "info";
  const prefix = config.prefix || "[rule-engine-log]";
  const logMsg = `${prefix} [${msg.msgType}] originator=${msg.originatorId} data=${JSON.stringify(msg.msg)}`;
  if (level === "error") console.error(logMsg);
  else if (level === "warn") console.warn(logMsg);
  else console.log(logMsg);
  return { success: true, msg };
}
