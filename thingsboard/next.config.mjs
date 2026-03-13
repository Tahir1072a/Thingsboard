/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Tüm rotalar için bu kuralı uygula
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups", // <-- İŞTE ÇÖZÜM BURASI
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
