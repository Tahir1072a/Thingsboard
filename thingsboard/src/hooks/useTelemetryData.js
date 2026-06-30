"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useTelemetrySSE, useMultiTelemetrySSE } from "@/lib/sse-pool";

/**
 * Birleşik telemetri veri hook'u.
 * Authenticated modda SSE, public modda polling kullanır.
 * @param {Object} options
 * @param {string} options.deviceId - Tek cihaz ID
 * @param {string[]} options.deviceIds - Çoklu cihaz ID'leri 
 * @param {string[]} options.keys - Telemetri key'leri
 * @param {string} options.publicToken - Public dashboard token
 * @param {number} options.limit - Geçmiş veri limiti (default: 100)
 * @param {number} options.pollingInterval - Polling süresi ms (default: 10000)
 * @param {string} options.aggregation - AVG/MIN/MAX/SUM/NONE
 * @param {string} options.timeRange - 1h/6h/24h/7d/30d
 * @returns {{ data: Array, latestValues: Object, loading: boolean, error: string|null, isLive: boolean }}
 */
export function useTelemetryData({
  deviceId,
  deviceIds,
  keys = [],
  publicToken,
  limit = 100,
  pollingInterval = 10000,
  aggregation,
  timeRange,
} = {}) {
  const [data, setData] = useState([]);
  const [latestValues, setLatestValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  
  const effectiveDeviceIds = deviceIds || (deviceId ? [deviceId] : []);
  const isPublic = !!publicToken;
  const isMulti = effectiveDeviceIds.length > 1;
  
  // Geçmiş veriyi çek
  const fetchHistory = useCallback(async () => {
    if (effectiveDeviceIds.length === 0) return;
    try {
      setLoading(true);
      const promises = effectiveDeviceIds.map(async (dId) => {
        const params = new URLSearchParams();
        params.set('deviceId', dId);
        if (keys.length > 0) params.set('key', keys[0]);
        params.set('limit', String(limit));
        if (aggregation) params.set('aggregation', aggregation);
        if (timeRange) params.set('timeRange', timeRange);
        
        const url = isPublic
          ? `/api/public/telemetry?token=${publicToken}&${params.toString()}`
          : `/api/telemetry?${params.toString()}`;
        
        const res = await fetch(url);
        const json = await res.json();
        return { deviceId: dId, data: json.ok ? (json.data || []) : [] };
      });
      
      const results = await Promise.all(promises);
      const allData = results.flatMap(r => r.data.map(d => ({ ...d, deviceId: r.deviceId })));
      setData(allData);
      
      // Latest values
      const latest = {};
      results.forEach(r => {
        if (r.data.length > 0) {
          const last = r.data[0];
          latest[r.deviceId] = last;
        }
      });
      setLatestValues(latest);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [effectiveDeviceIds.join(','), keys.join(','), limit, aggregation, timeRange, publicToken, isPublic]);

  // İlk yükleme
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);
  
  // Public modda polling
  useEffect(() => {
    if (!isPublic || effectiveDeviceIds.length === 0) return;
    intervalRef.current = setInterval(fetchHistory, pollingInterval);
    return () => clearInterval(intervalRef.current);
  }, [isPublic, fetchHistory, pollingInterval]);

  // Authenticated modda SSE
  const handleSSEData = useCallback((telemetryData) => {
    if (!telemetryData?.key) return;
    // Latest values güncelle
    setLatestValues(prev => ({
      ...prev,
      [telemetryData.deviceId || deviceId]: {
        key: telemetryData.key,
        value: telemetryData.value,
        ts: telemetryData.ts || Date.now(),
      },
    }));
    // Data array'e ekle
    setData(prev => {
      const newEntry = {
        key: telemetryData.key,
        value: telemetryData.value,
        ts: telemetryData.ts || Date.now(),
        deviceId: telemetryData.deviceId || deviceId,
      };
      const updated = [newEntry, ...prev];
      return updated.slice(0, limit);
    });
  }, [deviceId, limit]);

  // SSE hook — sadece authenticated modda
  useTelemetrySSE(
    !isPublic && !isMulti ? deviceId : null,
    handleSSEData
  );
  
  useMultiTelemetrySSE(
    !isPublic && isMulti ? effectiveDeviceIds : [],
    handleSSEData
  );

  return {
    data,
    latestValues,
    loading,
    error,
    isLive: !isPublic,
    refetch: fetchHistory,
  };
}
