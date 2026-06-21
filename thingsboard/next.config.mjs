/** @type {import('next').NextConfig} */
const nextConfig = {
  // Worker thread chunking hatasını engelle
  serverExternalPackages: [],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // vendor-chunks/lib/worker.js hatasını engelle
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization?.splitChunks,
          cacheGroups: {
            ...config.optimization?.splitChunks?.cacheGroups,
            // lib/worker.js'yi vendor chunk'larına dahil etme
          },
        },
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
