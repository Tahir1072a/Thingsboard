# ==============================================================================
# Aşama 1: Build — Bağımlılıkları kur ve Next.js'i derle
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Önce sadece package dosyalarını kopyala (cache layer optimization)
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

# Kaynak kodları kopyala ve build et
COPY . .

# Build sırasında gerekli dummy ortam değişkenleri
# (ARG kullanıyoruz — final image'a yazılmaz, sadece build aşamasında geçerli)
ARG MONGODB_URI=mongodb://localhost:27018/thingsboard
ARG REDIS_URL=redis://localhost:6379
ARG NEXTAUTH_SECRET=build-time-dummy
ARG NEXTAUTH_URL=http://localhost:3000
ENV MONGODB_URI=$MONGODB_URI \
    REDIS_URL=$REDIS_URL \
    NEXTAUTH_SECRET=$NEXTAUTH_SECRET \
    NEXTAUTH_URL=$NEXTAUTH_URL

RUN npm run build

# ==============================================================================
# Aşama 2: Production — Sadece çalışması gereken dosyaları al
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Güvenlik: root olmayan kullanıcı ile çalıştır
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Production bağımlılıkları
COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm install --omit=dev --legacy-peer-deps && npm cache clean --force

# Next.js build çıktısı
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Sunucu ve yapılandırma dosyaları
COPY --from=builder /app/server.mjs ./
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/middleware.js ./
COPY --from=builder /app/src ./src

# Sertifikalar (varsa)
COPY --from=builder /app/certs* ./certs/

# Sahiplik ayarla
RUN chown -R appuser:appgroup /app

USER appuser

# Portlar: Next.js, MQTT, MQTTS, WS, WSS
EXPOSE 3000 1883 8883 3001 3002

CMD ["node", "server.mjs"]
