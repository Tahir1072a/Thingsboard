/**
 * notification-service.js — Bildirim Gönderim Servisi
 *
 * Alarm tetiklendiğinde eşleşen NotificationRule'ları bulur ve
 * her kanal için bildirim gönderir (EMAIL, WEBHOOK, TELEGRAM).
 *
 * Template değişkenleri:
 *   ${deviceName}, ${alarmType}, ${severity}, ${status},
 *   ${details}, ${timestamp}, ${tenantId}, ${deviceId}
 */

import connectDB from "@/lib/db";
import NotificationRule from "@/models/NotificationRule";
import { sendEmail } from "@/lib/email";

/**
 * Alarm olayını işle — eşleşen kuralları bul ve bildirimleri gönder.
 *
 * @param {string} triggerType — "ALARM_CREATED" | "ALARM_CLEARED" | "DEVICE_INACTIVE"
 * @param {object} context — { tenantId, deviceId, deviceName, alarmType, severity, status, details, timestamp }
 */
export async function processNotifications(triggerType, context) {
  try {
    await connectDB();

    const rules = await NotificationRule.findMatchingRules(
      context.tenantId,
      triggerType,
      context.alarmType,
      context.severity
    );

    if (rules.length === 0) return;

    for (const rule of rules) {
      const subject = renderTemplate(rule.template?.subject || "", context);
      const body = renderTemplate(rule.template?.body || "", context);

      for (const channel of rule.channels) {
        if (!channel.enabled) continue;

        try {
          switch (channel.type) {
            case "EMAIL":
              await sendEmailNotification(channel.config, subject, body);
              break;
            case "WEBHOOK":
              await sendWebhookNotification(channel.config, subject, body, context);
              break;
            case "TELEGRAM":
              await sendTelegramNotification(channel.config, subject, body);
              break;
          }
        } catch (err) {
          console.error(
            `[notification-service] ${channel.type} gönderim hatası:`,
            err.message
          );
        }
      }
    }
  } catch (err) {
    console.error("[notification-service] processNotifications hatası:", err.message);
  }
}

// ────────────────────────────────────────────────────────────────────
// Kanal Gönderim Fonksiyonları
// ────────────────────────────────────────────────────────────────────

/**
 * E-posta gönder
 */
async function sendEmailNotification(config, subject, body) {
  if (!config?.to) {
    console.warn("[notification] EMAIL: 'to' adresi belirtilmemiş.");
    return;
  }

  const htmlBody = body
    .replace(/\n/g, "<br>")
    .replace(/\t/g, "&emsp;");

  await sendEmail({
    to: config.to,
    subject,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; background: #f8f9fa; border-radius: 8px;">
        <div style="background: #fff; border: 1px solid #e9ecef; border-radius: 8px; padding: 24px;">
          <h2 style="margin: 0 0 16px; color: #1a1a2e; font-size: 18px;">🔔 ${subject}</h2>
          <div style="color: #495057; line-height: 1.6; font-size: 14px;">
            ${htmlBody}
          </div>
          <hr style="border: none; border-top: 1px solid #e9ecef; margin: 20px 0;" />
          <p style="margin: 0; color: #868e96; font-size: 12px;">
            Bu bildirim Almira Things tarafından otomatik gönderilmiştir.
          </p>
        </div>
      </div>
    `,
  });

  console.log(`[notification] EMAIL → ${config.to}`);
}

/**
 * Webhook HTTP çağrısı
 */
async function sendWebhookNotification(config, subject, body, context) {
  if (!config?.url) {
    console.warn("[notification] WEBHOOK: URL belirtilmemiş.");
    return;
  }

  const method = config.method || "POST";
  const headers = {
    "Content-Type": "application/json",
    ...(config.headers ? Object.fromEntries(config.headers) : {}),
  };

  const payload = {
    event: context.alarmType || "notification",
    subject,
    body,
    deviceId: context.deviceId,
    deviceName: context.deviceName,
    severity: context.severity,
    status: context.status,
    timestamp: context.timestamp || new Date().toISOString(),
  };

  const fetchOptions = {
    method,
    headers,
  };

  if (method !== "GET") {
    fetchOptions.body = JSON.stringify(payload);
  }

  const response = await fetch(config.url, fetchOptions);

  console.log(
    `[notification] WEBHOOK → ${config.url} (${response.status})`
  );
}

/**
 * Telegram Bot API üzerinden mesaj gönder
 */
async function sendTelegramNotification(config, subject, body) {
  if (!config?.botToken || !config?.chatId) {
    console.warn("[notification] TELEGRAM: botToken veya chatId eksik.");
    return;
  }

  const text = `🔔 *${escapeMarkdown(subject)}*\n\n${escapeMarkdown(body)}`;

  const response = await fetch(
    `https://api.telegram.org/bot${config.botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.chatId,
        text,
        parse_mode: "Markdown",
      }),
    }
  );

  const result = await response.json();

  if (!result.ok) {
    throw new Error(`Telegram API hatası: ${result.description}`);
  }

  console.log(`[notification] TELEGRAM → chat:${config.chatId}`);
}

// ────────────────────────────────────────────────────────────────────
// Yardımcılar
// ────────────────────────────────────────────────────────────────────

/**
 * Template string'deki ${variable} ifadelerini context ile değiştir.
 */
function renderTemplate(template, context) {
  if (!template) return "";

  return template.replace(/\$\{(\w+)\}/g, (match, key) => {
    if (key === "details" && typeof context[key] === "object") {
      return JSON.stringify(context[key]);
    }
    return context[key] !== undefined ? String(context[key]) : match;
  });
}

/**
 * Telegram Markdown özel karakterlerini escape et.
 */
function escapeMarkdown(text) {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, "\\$1");
}
