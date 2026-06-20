"use client";

/**
 * SSE Pool — Tek EventSource bağlantısı üzerinden tüm widget'lara veri dağıtımı
 *
 * Problem: Her widget kendi EventSource bağlantısını açıyor → 10+ widget = 10+ SSE bağlantı.
 * Çözüm: Singleton pool — tek bağlantı, subscription-based dağıtım.
 *
 * Kullanım:
 *   import { useSSEPool } from "./sse-pool.js";
 *   const { subscribe, unsubscribe } = useSSEPool();
 *   subscribe("telemetry", deviceId, callback);
 */

import { createContext, useContext, useEffect, useRef, useCallback, useState } from "react";

// ── Singleton SSE Manager ──
class SSEPoolManager {
  constructor() {
    this.eventSource = null;
    this.subscribers = new Map(); // Map<channel, Map<subId, {callback, filter}>>
    this.subCounter = 0;
    this.reconnectTimer = null;
    this.connected = false;
  }

  connect(url = "/api/sse") {
    if (this.eventSource) return;

    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      this.connected = true;
      console.log("[sse-pool] Bağlantı kuruldu");
    };

    // Telemetri event
    this.eventSource.addEventListener("telemetry", (e) => {
      try {
        const data = JSON.parse(e.data);
        this._dispatch("telemetry", data);
      } catch {}
    });

    // Alarm event
    this.eventSource.addEventListener("alarm", (e) => {
      try {
        const data = JSON.parse(e.data);
        this._dispatch("alarm", data);
      } catch {}
    });

    // Audit-log event
    this.eventSource.addEventListener("audit-log", (e) => {
      try {
        const data = JSON.parse(e.data);
        this._dispatch("audit-log", data);
      } catch {}
    });

    // Attribute event
    this.eventSource.addEventListener("attribute", (e) => {
      try {
        const data = JSON.parse(e.data);
        this._dispatch("attribute", data);
      } catch {}
    });

    this.eventSource.onerror = () => {
      this.connected = false;
      this.eventSource?.close();
      this.eventSource = null;

      // Reconnect (5 saniye sonra)
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => {
        if (this._hasSubscribers()) {
          console.log("[sse-pool] Yeniden bağlanılıyor...");
          this.connect(url);
        }
      }, 5000);
    };
  }

  _dispatch(channel, data) {
    const channelSubs = this.subscribers.get(channel);
    if (!channelSubs) return;

    for (const [, sub] of channelSubs) {
      // Filter: deviceId eşleşmesi
      if (sub.filter?.deviceId && data.deviceId) {
        if (String(data.deviceId) !== String(sub.filter.deviceId)) continue;
      }
      try {
        sub.callback(data);
      } catch (err) {
        console.error("[sse-pool] Subscriber hatası:", err);
      }
    }
  }

  subscribe(channel, callback, filter = {}) {
    this.subCounter += 1;
    const subId = `sub_${this.subCounter}`;

    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Map());
    }
    this.subscribers.get(channel).set(subId, { callback, filter });

    // İlk subscriber olduğunda bağlantı aç
    if (!this.eventSource) {
      this.connect();
    }

    return subId;
  }

  unsubscribe(channel, subId) {
    const channelSubs = this.subscribers.get(channel);
    if (channelSubs) {
      channelSubs.delete(subId);
      if (channelSubs.size === 0) {
        this.subscribers.delete(channel);
      }
    }

    // Hiç subscriber kalmazsa bağlantıyı kapat
    if (!this._hasSubscribers()) {
      this.disconnect();
    }
  }

  disconnect() {
    clearTimeout(this.reconnectTimer);
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.connected = false;
  }

  _hasSubscribers() {
    for (const [, subs] of this.subscribers) {
      if (subs.size > 0) return true;
    }
    return false;
  }

  getStats() {
    let totalSubs = 0;
    for (const [, subs] of this.subscribers) {
      totalSubs += subs.size;
    }
    return {
      connected: this.connected,
      channels: this.subscribers.size,
      totalSubscribers: totalSubs,
    };
  }
}

// ── Singleton instance ──
let poolInstance = null;
function getPool() {
  if (!poolInstance) {
    poolInstance = new SSEPoolManager();
  }
  return poolInstance;
}

// ── React Context ──
const SSEPoolContext = createContext(null);

export function SSEPoolProvider({ children }) {
  const poolRef = useRef(getPool());

  useEffect(() => {
    return () => {
      // Unmount'ta temizle
      poolRef.current.disconnect();
    };
  }, []);

  return (
    <SSEPoolContext.Provider value={poolRef.current}>
      {children}
    </SSEPoolContext.Provider>
  );
}

// ── Hook ──
export function useSSEPool() {
  const pool = useContext(SSEPoolContext) || getPool();

  const subscribe = useCallback(
    (channel, callback, filter = {}) => {
      return pool.subscribe(channel, callback, filter);
    },
    [pool]
  );

  const unsubscribe = useCallback(
    (channel, subId) => {
      pool.unsubscribe(channel, subId);
    },
    [pool]
  );

  const getStats = useCallback(() => pool.getStats(), [pool]);

  return { subscribe, unsubscribe, getStats };
}

/**
 * Convenience hook — belirli bir cihazın telemetrisini dinle
 */
export function useTelemetrySSE(deviceId, callback) {
  const { subscribe, unsubscribe } = useSSEPool();

  useEffect(() => {
    if (!deviceId || !callback) return;

    const subId = subscribe("telemetry", callback, { deviceId });
    return () => unsubscribe("telemetry", subId);
  }, [deviceId, callback, subscribe, unsubscribe]);
}

/**
 * Convenience hook — alarmları dinle
 */
export function useAlarmSSE(callback, deviceId) {
  const { subscribe, unsubscribe } = useSSEPool();

  useEffect(() => {
    if (!callback) return;

    const filter = deviceId ? { deviceId } : {};
    const subId = subscribe("alarm", callback, filter);
    return () => unsubscribe("alarm", subId);
  }, [callback, deviceId, subscribe, unsubscribe]);
}
