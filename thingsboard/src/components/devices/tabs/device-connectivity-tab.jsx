"use client";

import { Copy, Terminal, Wifi, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export function DeviceConnectivityTab({ device }) {
  if (!device) return null;

  const accessToken = device.accessToken || "CIHAZ_TOKEN_BURAYA";
  const deviceName = device.name || "Cihazınız";

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Kopyalandı!");
    } catch (err) {
      toast.error("Kopyalama başarısız oldu.");
    }
  };

  const httpSnippet = `curl -X POST http://localhost:3000/api/telemetry \\
  -H "Content-Type: application/json" \\
  -H "X-Access-Token: ${accessToken}" \\
  -d '{
    "metrics": [
      { "key": "temperature", "value": 24.5 },
      { "key": "status", "value": "active" }
    ]
  }'`;

  const mqttSnippet = `// Node.js MQTT Örneği
const mqtt = require("mqtt");
const client = mqtt.connect("mqtt://localhost:1883", {
  username: "${accessToken}"
});

client.on("connect", () => {
  const payload = JSON.stringify({
    temperature: 24.5,
    status: "active",
    isOnline: true
  });
  client.publish("devices/me/telemetry", payload);
  console.log("Veri gönderildi!");
});`;

  const wsSnippet = `// Tarayıcı veya Node.js WebSocket Örneği
const ws = new WebSocket("ws://localhost:3001");

ws.onopen = () => {
  console.log("WebSocket bağlantısı başarılı!");
  const payload = JSON.stringify({
    accessToken: "${accessToken}",
    key: "temperature",
    value: 24.5
  });
  ws.send(payload);
  console.log("Veri gönderildi!");
};

ws.onmessage = (event) => {
  console.log("Sunucudan gelen mesaj:", event.data);
};

ws.onerror = (error) => {
  console.error("WebSocket Hatası:", error);
};`;

  return (
    <div className="space-y-6 animate-fade-in p-4">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-halo-100 text-halo-700 rounded-xl">
          <Wifi className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Bağlantı Rehberi</h3>
          <p className="text-sm text-gray-500">
            {deviceName} adlı cihaza dışarıdan veri göndermek için aşağıdaki yöntemleri kullanabilirsiniz.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* HTTP BÖLÜMÜ */}
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-gray-500" />
              <h4 className="font-semibold text-gray-700">HTTP REST (cURL)</h4>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(httpSnippet)}
              className="h-8 text-xs bg-white"
            >
              <Copy className="h-3 w-3 mr-1.5" />
              Kodu Kopyala
            </Button>
          </div>
          <div className="bg-gray-900 p-4 overflow-x-auto">
            <pre className="text-sm text-green-400 font-mono">
              <code>{httpSnippet}</code>
            </pre>
          </div>
        </div>

        {/* MQTT BÖLÜMÜ */}
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-gray-500" />
              <h4 className="font-semibold text-gray-700">MQTT (Node.js)</h4>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(mqttSnippet)}
              className="h-8 text-xs bg-white"
            >
              <Copy className="h-3 w-3 mr-1.5" />
              Kodu Kopyala
            </Button>
          </div>
          <div className="bg-gray-900 p-4 overflow-x-auto">
            <pre className="text-sm text-blue-400 font-mono">
              <code>{mqttSnippet}</code>
            </pre>
          </div>
        </div>

        {/* WEBSOCKET BÖLÜMÜ */}
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-gray-500" />
              <h4 className="font-semibold text-gray-700">WebSocket</h4>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(wsSnippet)}
              className="h-8 text-xs bg-white"
            >
              <Copy className="h-3 w-3 mr-1.5" />
              Kodu Kopyala
            </Button>
          </div>
          <div className="bg-gray-900 p-4 overflow-x-auto">
            <pre className="text-sm text-yellow-400 font-mono">
              <code>{wsSnippet}</code>
            </pre>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-200 text-sm">
        <p><strong>Önemli Not:</strong> Yukarıdaki <code>accessToken</code> ({accessToken}) cihazınıza özeldir. Bu anahtarı başkalarıyla paylaşmayın.</p>
      </div>
    </div>
  );
}
