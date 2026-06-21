"use client";

/**
 * SSE Pool — Tek EventSource bağlantısı üzerinden tüm widget'lara veri dağıtımı
 *
 * Problem: Her widget kendi EventSource bağlantısını açıyor → 6+ bağlantı = tarayıcı limiti.
 * Çözüm: Singleton pool — tek bağlantı, subscription-based dağıtım.
 *
 * Kullanım:
 *   import { useTelemetrySSE, useAlarmSSE, useSSEConnected } from "@/lib/sse-pool";
 *
 *   // Tek cihaz telemetrisi
 *   useTelemetrySSE(deviceId, handleData);
 *
 *   // Çoklu cihaz telemetrisi
 *   useMultiTelemetrySSE(deviceIds, handleData);
 *
 *   // Alarm dinleme
 *   useAlarmSSE(handleAlarm, deviceId);
 *
 *   // Bağlantı durumu
 *   const connected = useSSEConnected();
 */

import { createContext, useContext, useEffect, useRef, useCallback, useState, useSyncExternalStore } from "react";

// ── Singleton SSE Manager ──
class SSEPoolManager {
  constructor() {
    this.eventSource = null;
    this.subscribers = new Map(); // Map<channel, Map<subId, {callback, filter}>>
    this.subCounter = 0;
    this.reconnectTimer = null;
    this.connected = false;
    this._connectedListeners = new Set(); // React state sync
  }

  connect(url = "/api/sse") {
    if (this.eventSource) return;

    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      this._setConnected(true);
    };

    // Telemetri event (named event — server sends "event: telemetry\ndata: ...")
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
      this._setConnected(false);
      this.eventSource?.close();
      this.eventSource = null;

      // Reconnect (5 saniye sonra)
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => {
        if (this._hasSubscribers()) {
          this.connect(url);
        }
      }, 5000);
    };
  }

  _setConnected(value) {
    if (this.connected === value) return;
    this.connected = value;
    // React bileşenlerini bilgilendir
    for (const listener of this._connectedListeners) {
      listener();
    }
  }

  // useSyncExternalStore API — React'in önerdiği yöntem
  subscribeConnected(listener) {
    this._connectedListeners.add(listener);
    return () => this._connectedListeners.delete(listener);
  }

  getConnectedSnapshot() {
    return this.connected;
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
    this._setConnected(false);
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

// ── Base Hook ──
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

  return { subscribe, unsubscribe, getStats, pool };
}

// ── Connected State Hook ──
/**
 * SSE bağlantı durumunu döndürür.
 * @returns {boolean} true = bağlı, false = bağlı değil
 */
export function useSSEConnected() {
  const pool = useContext(SSEPoolContext) || getPool();

  return useSyncExternalStore(
    (listener) => pool.subscribeConnected(listener),
    () => pool.getConnectedSnapshot(),
    () => false // SSR snapshot
  );
}

// ── Convenience Hooks ──

/**
 * Tek cihazın telemetrisini dinle.
 * @param {string|null} deviceId - Cihaz ID (null = devre dışı)
 * @param {Function} callback - Veri geldiğinde çağrılır: (data) => void
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
 * Çoklu cihazın telemetrisini dinle (filtre yok — tüm telemetri gelir, callback'te filtrele).
 * @param {string[]|null} deviceIds - Cihaz ID listesi (boş/null = devre dışı)
 * @param {Function} callback - Veri geldiğinde çağrılır: (data) => void
 */
export function useMultiTelemetrySSE(deviceIds, callback) {
  const { subscribe, unsubscribe } = useSSEPool();

  useEffect(() => {
    if (!deviceIds?.length || !callback) return;

    // Tek cihaz → deviceId filtreli subscribe
    if (deviceIds.length === 1) {
      const subId = subscribe("telemetry", callback, { deviceId: deviceIds[0] });
      return () => unsubscribe("telemetry", subId);
    }

    // Çoklu cihaz → filtre yok, tüm telemetriyi al, callback içinde filtrele
    const subId = subscribe("telemetry", callback);
    return () => unsubscribe("telemetry", subId);
  }, [deviceIds?.join(","), callback, subscribe, unsubscribe]);
}

/**
 * Alarmları dinle.
 * @param {Function} callback - Alarm geldiğinde çağrılır: (alarm) => void
 * @param {string} [deviceId] - Opsiyonel cihaz filtresi
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
