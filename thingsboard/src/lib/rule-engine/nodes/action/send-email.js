import { sendEmail } from "../../../email.js";

export async function sendEmailNode(msg, config) {
  try {
    const to = config.to || msg.metadata.email || "";
    if (!to) return { success: false, msg };
    const subject = renderTemplate(config.subject || "Almira Things Bildirimi", msg);
    const body = renderTemplate(config.body || JSON.stringify(msg.msg), msg);
    await sendEmail({ to, subject, html: `<div style="font-family:sans-serif;padding:16px">${body.replace(/\n/g, '<br>')}</div>` });
    console.log(`[send-email] → ${to}`);
    return { success: true, msg };
  } catch (err) {
    console.error("[send-email] Hata:", err.message);
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
