import logger from "../../../logger.js";

export async function restApiCall(msg, config) {
  if (!config.url) return { success: false, msg };
  try {
    const url = renderTemplate(config.url, msg);
    const method = config.method || "POST";
    const headers = { "Content-Type": "application/json", ...(config.headers || {}) };
    const fetchOpts = { method, headers };
    if (method !== "GET") {
      fetchOpts.body = JSON.stringify({ msg: msg.msg, metadata: msg.metadata });
    }
    const res = await fetch(url, fetchOpts);
    const responseBody = await res.text();
    const enriched = { ...msg, metadata: { ...msg.metadata, responseStatus: res.status, responseBody } };
    logger.info("[rest-api-call] %s %s → %d", method, url, res.status);
    return { success: res.ok, msg: enriched };
  } catch (err) {
    logger.error({ err: err.message }, "[rest-api-call] Hata");
    return { success: false, msg };
  }
}

function renderTemplate(tpl, msg) {
  return tpl.replace(/\$\{(\w+)\}/g, (_, key) => {
    if (msg.msg[key] !== undefined) return String(msg.msg[key]);
    if (msg.metadata[key] !== undefined) return String(msg.metadata[key]);
    return `\${${key}}`;
  });
}
