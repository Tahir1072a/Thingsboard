const ACCESS_TOKEN = "C73yn1wwjhohTgtoFpM56adl9J5RiwcSF0Ia8LRyUgo";
const URL = "http://localhost:3000/api/telemetry";

// veri gönderim hızı
const INTERVAL_MS = 2000;
const MAX_DURATION_MS = 120 * 1000;

console.log(`📡 HTTP Telemetri Simülatörü başlatıldı...`);
console.log(` Hedef URL: ${URL}`);
console.log(` Maksimum Çalışma Süresi: 2 Dakika`);
console.log("-------------------------------------------------");

const startTime = Date.now();

const sendData = async () => {
  const temperature = (22 + (Math.random() * 5 - 2.5)).toFixed(1); // 19.5 C ile 24.5 C arası
  const humidity = (45 + (Math.random() * 10 - 5)).toFixed(1); // 40% ile 50% arası

  const payload = {
    metrics: [
      { key: "temperature", value: Number(temperature), unit: "°C" },
      { key: "humidity", value: Number(humidity), unit: "%" }
    ]
  };

  try {
    const response = await fetch(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Access-Token": ACCESS_TOKEN
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`✅ [${new Date().toLocaleTimeString()}] Gönderildi -> Sıcaklık: ${temperature}°C, Nem: ${humidity}%`);
    } else {
      console.error(`❌ [${new Date().toLocaleTimeString()}] HTTP ${response.status} Hata:`, result.message || result);
    }
  } catch (error) {
    console.error(`❌ Beklenmeyen Ağ Hatası:`, error.message);
  }

  // Belirlenen süre (1-2 dk) dolmuşsa programı sonlandır
  if (Date.now() - startTime >= MAX_DURATION_MS) {
    console.log("🛑 2 dakikalık simülasyon tamamlandı. Çıkış yapılıyor...");
    clearInterval(intervalId);
  }
};

const intervalId = setInterval(sendData, INTERVAL_MS);
sendData();
