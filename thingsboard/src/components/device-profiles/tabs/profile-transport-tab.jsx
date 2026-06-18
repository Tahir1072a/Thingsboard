"use client";

/**
 * ProfileTransportTab — Transport yapılandırma bilgileri sekmesi
 *
 * Profil'in transport tipine göre bilgilendirme kartları gösterir.
 * Salt-okunur (informational) tab.
 */

import { Wifi, Globe, Radio, Tag, Shield, Server } from "lucide-react";

// --- Transport tipi yapılandırmaları ---
const TRANSPORT_CONFIG = {
  MQTT: {
    label: "MQTT",
    color: "from-blue-500 to-blue-700",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Wifi,
    info: [
      {
        title: "Bağlantı Portları",
        items: [
          { label: "TCP Port", value: "1883" },
          { label: "TLS Port", value: "8883" },
        ],
      },
      {
        title: "Topic Formatı",
        code: "v1/devices/me/telemetry",
      },
      {
        title: "QoS Bilgisi",
        items: [
          { label: "QoS 0", value: "En fazla bir kez (At most once)" },
          { label: "QoS 1", value: "En az bir kez (At least once)" },
        ],
      },
      {
        title: "Kimlik Doğrulama",
        description:
          "Cihaz erişim anahtarı (Access Token) MQTT kullanıcı adı olarak kullanılır. Şifre alanı boş bırakılır.",
      },
    ],
  },
  HTTP: {
    label: "HTTP",
    color: "from-green-500 to-green-700",
    badgeClass: "bg-green-100 text-green-700 border-green-200",
    icon: Globe,
    info: [
      {
        title: "Telemetri Endpoint",
        code: "POST /api/v1/{accessToken}/telemetry",
      },
      {
        title: "Öznitelik Endpoint",
        code: "POST /api/v1/{accessToken}/attributes",
      },
      {
        title: "HTTP Headers",
        items: [
          { label: "Content-Type", value: "application/json" },
          { label: "Accept", value: "application/json" },
        ],
      },
      {
        title: "Kimlik Doğrulama",
        description:
          "Cihaz erişim anahtarı URL path parametresi olarak kullanılır. Ek başlık gerekmez.",
      },
    ],
  },
  COAP: {
    label: "CoAP",
    color: "from-orange-500 to-orange-700",
    badgeClass: "bg-orange-100 text-orange-700 border-orange-200",
    icon: Radio,
    info: [
      {
        title: "Telemetri Endpoint",
        code: "coap://{host}/api/v1/{accessToken}/telemetry",
      },
      {
        title: "Port Bilgisi",
        items: [
          { label: "UDP Port", value: "5683" },
          { label: "DTLS Port", value: "5684" },
        ],
      },
      {
        title: "Durum",
        description:
          "CoAP desteği gelecek güncellemelerde tam olarak yapılandırılacaktır. Şu anda temel telemetri gönderimi desteklenmektedir.",
      },
    ],
  },
};

export function ProfileTransportTab({ profile }) {
  const transportType = profile?.transportType || "MQTT";
  const config = TRANSPORT_CONFIG[transportType] || TRANSPORT_CONFIG.MQTT;
  const TransportIcon = config.icon;

  return (
    <div className="space-y-6">
      {/* --- Büyük Transport Tipi Badge --- */}
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${config.color} p-6 text-white shadow-lg`}
      >
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-lg">
            <TransportIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold tracking-tight">
              {config.label} Protokolü
            </h3>
            <p className="text-white/80 text-sm mt-1">
              Bu profil {config.label} transport yapılandırması kullanıyor
            </p>
          </div>
        </div>
        {/* Dekoratif arka plan elemanı */}
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -right-2 -bottom-8 h-24 w-24 rounded-full bg-white/5 blur-xl" />
      </div>

      {/* --- Bilgi Kartları --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {config.info.map((section, i) => (
          <div
            key={i}
            className="rounded-xl border border-white/30 bg-white/40 backdrop-blur-sm p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <h4 className="text-sm font-semibold text-text-main mb-3 flex items-center gap-2">
              <Server className="w-4 h-4 text-halo-500" />
              {section.title}
            </h4>

            {/* Kod bloğu */}
            {section.code && (
              <div className="bg-gray-100 rounded-lg px-3 py-2.5 font-mono text-sm text-gray-800 border border-gray-200">
                {section.code}
              </div>
            )}

            {/* Anahtar-değer listesi */}
            {section.items && (
              <div className="space-y-2">
                {section.items.map((item, j) => (
                  <div key={j} className="flex items-center justify-between">
                    <span className="text-sm text-text-muted">{item.label}</span>
                    <span className="text-sm font-mono font-medium text-text-main bg-gray-50 px-2 py-0.5 rounded">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Açıklama metni */}
            {section.description && (
              <p className="text-sm text-text-muted leading-relaxed">
                {section.description}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* --- Beklenen Anahtarlar --- */}
      <div className="rounded-xl border border-white/30 bg-white/40 backdrop-blur-sm p-5 shadow-sm">
        <h4 className="text-sm font-semibold text-text-main mb-3 flex items-center gap-2">
          <Tag className="w-4 h-4 text-halo-500" />
          Beklenen Telemetri Anahtarları
        </h4>
        <div className="flex flex-wrap gap-2">
          {profile?.expectedKeys && profile.expectedKeys.length > 0 ? (
            profile.expectedKeys.map((key, i) => (
              <span
                key={i}
                className={`inline-flex items-center px-3 py-1.5 rounded-lg border text-xs font-mono font-medium ${config.badgeClass}`}
              >
                {key}
              </span>
            ))
          ) : (
            <p className="text-sm text-gray-400 italic">
              Bu profil için beklenen telemetri anahtarı tanımlanmamış.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
