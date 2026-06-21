"use client";

/**
 * PieChartWidget — Pasta Grafik Widget
 * Cihazların son değerlerini pasta/donut grafikle gösterir.
 * SSE ile canlı güncelleme alır.
 * publicToken verildiğinde SSE yerine polling kullanır.
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { useMultiTelemetrySSE, useSSEConnected } from "@/lib/sse-pool";
import { getUnitSymbol } from "@/lib/units";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#6366f1", "#22d3ee", "#f59e0b", "#10b981",
  "#ef4444", "#a855f7", "#ec4899", "#84cc16",
];

export default function PieChartWidget({
  devices = [], keys = [], title = "Pasta Grafik",
  config = {}, publicToken,
}) {
  const variant = config.variant || "donut";
  const showLabels = config.showLabels !== undefined ? config.showLabels : true;
  const showPercentage = config.showPercentage !== undefined ? config.showPercentage : true;
  const configInnerRadius = config.innerRadius ?? 55;
  const configOuterRadius = config.outerRadius ?? 85;
  const showLegend = config.showLegend !== undefined ? config.showLegend : true;
  const animation = config.animation !== undefined ? config.animation : true;
  const decimals = config.decimals ?? 1;
  const unitSymbol = config.unit ? getUnitSymbol(config.unit) : "";
  const targetKey = keys[0] || "value";

  const [latestValues, setLatestValues] = useState({});
  const connected = useSSEConnected();

  const handleData = useCallback((incoming) => {
    const { deviceId, key, value } = incoming;
    if (key !== targetKey) return;

    const device = devices.find(d => d.id === deviceId);
    if (!device) return;

    setLatestValues((prev) => ({ ...prev, [device.id]: value }));
  }, [targetKey, devices]);

  // SSE Pool hook — canlı veri (authenticated mod)
  const deviceIds = useMemo(() => devices.map(d => d.id), [devices]);
  useMultiTelemetrySSE(!publicToken ? deviceIds : null, handleData);

  // Telemetri URL'ini belirle
  const getTelemetryUrl = useCallback((deviceId, params = "") => {
    if (publicToken) {
      return `/api/public/telemetry/${publicToken}?deviceId=${encodeURIComponent(deviceId)}&key=${encodeURIComponent(targetKey)}${params}`;
    }
    return `/api/telemetry?deviceId=${encodeURIComponent(deviceId)}&key=${encodeURIComponent(targetKey)}${params}`;
  }, [publicToken, targetKey]);

  useEffect(() => {
    if (devices.length === 0) return;

    let isMounted = true;
    let pollInterval = null;

    // 1. Geçmiş verileri çek
    const fetchHistory = async () => {
      try {
        const promises = devices.map(d =>
          fetch(getTelemetryUrl(d.id, `&limit=1`))
            .then(res => res.json())
            .then(json => ({ deviceId: d.id, data: json.data || [] }))
        );

        const results = await Promise.all(promises);

        if (isMounted) {
          const initial = {};
          results.forEach(({ deviceId, data }) => {
            if (data.length > 0) {
              initial[deviceId] = data[0].value;
            }
          });
          setLatestValues(initial);
        }
      } catch (err) {
        console.error("Geçmiş veri çekilemedi:", err);
      }
    };

    // 2. Canlı veriyi başlat (sadece polling — SSE artık hook ile yönetiliyor)
    const startLiveData = () => {
      if (publicToken) {
        pollInterval = setInterval(async () => {
          if (!isMounted) return;
          try {
            const promises = devices.map(d =>
              fetch(getTelemetryUrl(d.id, `&limit=1`))
                .then(res => res.json())
                .then(json => ({ deviceId: d.id, data: json.data || [] }))
            );
            const results = await Promise.all(promises);
            results.forEach(({ deviceId, data }) => {
              if (data.length > 0) {
                handleData({
                  deviceId,
                  key: targetKey,
                  value: data[0].value,
                });
              }
            });
          } catch {}
        }, 10000);
      }
    };

    fetchHistory().then(() => {
      if (isMounted) startLiveData();
    });

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [devices, targetKey, publicToken, getTelemetryUrl]);

  // Pasta grafik verisi
  const pieData = devices
    .filter(d => latestValues[d.id] !== undefined && latestValues[d.id] > 0)
    .map((device, i) => ({
      name: device.name,
      value: Math.abs(latestValues[device.id]),
      color: COLORS[i % COLORS.length],
    }));

  const total = pieData.reduce((sum, d) => sum + d.value, 0);

  // Yüzdelik etiket
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    if (!showLabels) return null;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 20;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x} y={y}
        fill="#64748b"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={10}
        fontWeight={600}
      >
        {showPercentage ? `${(percent * 100).toFixed(decimals)}%` : name}
      </text>
    );
  };

  const innerRadius = variant === "donut" ? `${configInnerRadius}%` : 0;
  const outerRadius = `${configOuterRadius}%`;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-end mb-2 shrink-0 px-1">
        <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${connected ? "text-green-500" : "text-gray-400"}`}>
          <span className={`h-2 w-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)] ${connected ? "bg-green-400 shadow-green-400/50 animate-pulse" : "bg-red-400 shadow-red-400/50"}`} />
          {connected ? "LIVE" : "WAIT"}
        </span>
      </div>

      {pieData.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
          <svg className="h-10 w-10 mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
          <span className="text-xs font-medium">Henüz veri yok</span>
        </div>
      ) : (
        <div className="flex-1 min-h-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                dataKey="value"
                label={showLabels ? renderCustomLabel : false}
                labelLine={showLabels}
                isAnimationActive={animation}
                animationDuration={500}
                stroke="rgba(255,255,255,0.6)"
                strokeWidth={2}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.4)", borderRadius: "12px", fontSize: "11px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                itemStyle={{ fontWeight: "bold" }}
                formatter={(val, name) => [
                  `${typeof val === "number" ? val.toFixed(decimals) : val}${unitSymbol ? ` ${unitSymbol}` : ""} (${total > 0 ? ((val / total) * 100).toFixed(decimals) : 0}%)`,
                  name,
                ]}
              />
              {showLegend && (
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "10px", paddingTop: "8px" }}
                />
              )}
            </PieChart>
          </ResponsiveContainer>

          {/* Donut merkezi: toplam veya key adı */}
          {variant === "donut" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-xl font-extrabold text-slate-700 tabular-nums">
                  {total % 1 === 0 ? total : total.toFixed(decimals)}{unitSymbol ? ` ${unitSymbol}` : ""}
                </div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  {targetKey}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
