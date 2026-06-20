export async function telegramNode(msg, config) {
  if (!config.botToken || !config.chatId) return { success: false, msg };
  try {
    const text = renderTemplate(config.messageTemplate || "${deviceName}: ${JSON.stringify(msg)}", msg);
    const res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: config.chatId, text, parse_mode: "Markdown" }),
    });
    const result = await res.json();
    if (!result.ok) throw new Error(result.description);
    console.log(`[telegram] → chat:${config.chatId}`);
    return { success: true, msg };
  } catch (err) {
    console.error("[telegram] Hata:", err.message);
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
