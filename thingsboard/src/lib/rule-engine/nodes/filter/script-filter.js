/**
 * Script Filter — JS koşul ile filtreleme
 * Config: { script: "return msg.temperature > 50;" }
 * Returns: relationType TRUE/FALSE based on script result
 *
 * Güvenlik: Tehlikeli global'ler (process, require, global, import, eval)
 * shadow edilerek kullanıcı scriptinin erişimi engellenir.
 */
import logger from "../../../logger.js";

const BLOCKED_GLOBALS = [
  "process", "require", "global", "globalThis",
  "__dirname", "__filename", "module", "exports",
  "eval", "Function", "setTimeout", "setInterval",
  "setImmediate", "clearTimeout", "clearInterval",
];

const SHADOW_PARAMS = BLOCKED_GLOBALS.join(", ");
const SHADOW_ARGS = BLOCKED_GLOBALS.map(() => "undefined");

export async function scriptFilter(msg, config) {
  if (!config.script) return { success: true, relationType: "FALSE", msg };
  try {
    // Kullanıcı scripti tehlikeli global'lerden izole edilir
    const wrappedScript = `"use strict"; return (function(${SHADOW_PARAMS}) { ${config.script} })(${SHADOW_ARGS.join(", ")});`;
    const fn = new Function("msg", "metadata", "msgType", wrappedScript);
    const result = fn({ ...msg.msg }, { ...msg.metadata }, msg.msgType);
    return { success: true, relationType: result ? "TRUE" : "FALSE", msg };
  } catch (err) {
    logger.error({ err: err.message }, "[script-filter] Hata");
    return { success: false, msg };
  }
}
