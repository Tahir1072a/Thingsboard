/**
 * Script Transform — JS ile veri dönüştürme
 * Config: { script: "return { msg: { ...msg, celcius: (msg.fahrenheit - 32) * 5/9 }, metadata, msgType };" }
 *
 * Güvenlik: Tehlikeli global'ler shadow edilerek izole edilir.
 */

const BLOCKED_GLOBALS = [
  "process", "require", "global", "globalThis",
  "__dirname", "__filename", "module", "exports",
  "eval", "Function", "setTimeout", "setInterval",
  "setImmediate", "clearTimeout", "clearInterval",
];

const SHADOW_PARAMS = BLOCKED_GLOBALS.join(", ");
const SHADOW_ARGS = BLOCKED_GLOBALS.map(() => "undefined");

export async function scriptTransform(msg, config) {
  if (!config.script) return { success: true, msg };
  try {
    const wrappedScript = `"use strict"; return (function(${SHADOW_PARAMS}) { ${config.script} })(${SHADOW_ARGS.join(", ")});`;
    const fn = new Function("msg", "metadata", "msgType", wrappedScript);
    const result = fn({ ...msg.msg }, { ...msg.metadata }, msg.msgType);
    const transformed = { ...msg };
    if (result && typeof result === "object") {
      if (result.msg !== undefined) transformed.msg = result.msg;
      if (result.metadata !== undefined) transformed.metadata = { ...transformed.metadata, ...result.metadata };
      if (result.msgType !== undefined) transformed.msgType = result.msgType;
    }
    return { success: true, msg: transformed };
  } catch (err) {
    console.error("[script-transform] Hata:", err.message);
    return { success: false, msg };
  }
}
