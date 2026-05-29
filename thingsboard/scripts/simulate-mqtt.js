const mqtt = require("mqtt");

const ACCESS_TOKEN = "txng8oJvXwPOVUh0BIEq6oEMF3F6PD-2vAkhGMUQ6E4";
const BROKER_URL = "mqtt://127.0.0.1:1883"; // MQTT Broker localhost üzerinde

const INTERVAL_MS = 2000;
const MAX_DURATION_MS = 120 * 1000;

console.log(`📡 MQTT Telemetri Simülatörü başlatıldı...`);
console.log(` Hedef: ${BROKER_URL}`);
console.log("-------------------------------------------------");

// Şifreye gerek duymadan cihazları token üstünden auth ediyoruz.
const client = mqtt.connect(BROKER_URL, {
  username: ACCESS_TOKEN,
});

client.on("connect", () => {
  console.log("✅ MQTT sunucusuna başarıyla bağlanıldı.");
  const startTime = Date.now();

  const sendData = () => {
    const temperature = (22 + (Math.random() * 5 - 2.5)).toFixed(1);
    const humidity = (45 + (Math.random() * 10 - 5)).toFixed(1);

    // 2. Çoklu veriyi doğrudan JSON property'leri şeklinde gönderebilmekteyiz
    const payload = JSON.stringify({
      temperature: Number(temperature),
      humidity: Number(humidity)
    });

    const topic = "devices/me/telemetry";

    client.publish(topic, payload, { qos: 0 }, (err) => {
      if (err) {
        console.error("❌ Mesaj yayınlama hatası:", err);
      } else {
        console.log(`🚀 [${new Date().toLocaleTimeString()}] Gönderildi (MQTT) -> ${payload}`);
      }
    });

    // Süre dolduğunda çıkış
    if (Date.now() - startTime >= MAX_DURATION_MS) {
        console.log("🛑 2 dakikalık simülasyon tamamlandı. Çıkış yapılıyor...");
        client.end(); // Bağlantıyı kapat
        process.exit(0);
    }
  };

  setInterval(sendData, INTERVAL_MS);
  sendData();
});

client.on("error", (error) => {
  console.error("❌ MQTT Bağlantı Hatası:", error.message);
  process.exit(1);
});
