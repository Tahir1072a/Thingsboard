import { processTelemetry } from "../../modules/telemetry/services/telemetryService.js";

export async function handleTelemetry(topic, message, client) {
  try {
    const messageString = message.toString();
    const data = JSON.parse(messageString);

    const token = client.id;

    console.log(`MQTT Verisi Geldi (${client.id}):`, data);

    await processTelemetry(token, data);
  } catch (err) {
    console.error(`Telemetry İşleme Hatası: ${err.message}`);
  }
}
