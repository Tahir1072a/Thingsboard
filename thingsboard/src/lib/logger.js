/**
 * logger.js — Yapısal Loglama (pino)
 *
 * Production'da JSON formatında log üretir (ELK, Grafana, Datadog uyumlu).
 * Development'da renkli, okunabilir çıktı (pino-pretty) üretir.
 *
 * Ortam değişkenleri:
 *   LOG_LEVEL — debug | info | warn | error (varsayılan: development=debug, production=info)
 */

import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),

  // Production'da JSON, development'da okunabilir format
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
          },
        },
      }),
});

export default logger;
