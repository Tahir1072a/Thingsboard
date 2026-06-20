import connectDB from "../../../db.js";
import Attribute from "../../../../models/Attribute.js";

export async function deviceAttributes(msg, config) {
  try {
    await connectDB();
    const scope = config.scope || "SERVER_SCOPE";
    const attrs = await Attribute.getByScope(msg.originatorId, scope);
    const enriched = { ...msg };
    enriched.metadata = { ...enriched.metadata };
    attrs.forEach((attr) => {
      enriched.metadata[`${scope.toLowerCase()}_${attr.key}`] = attr.value;
    });
    return { success: true, msg: enriched };
  } catch (err) {
    console.error("[device-attributes] Hata:", err.message);
    return { success: false, msg };
  }
}
