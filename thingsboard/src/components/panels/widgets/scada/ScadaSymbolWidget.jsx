"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTelemetrySSE } from "@/lib/sse-pool";
import { getSymbolById } from "@/lib/scada-symbol-registry";
import toast from "react-hot-toast";

export default function ScadaSymbolWidget({
  devices = [], keys = [], title = "SCADA Sembol",
  config = {}, isEditMode = false, widgetId, publicToken,
}) {
  const device = devices[0];
  const deviceId = device?.id;
  const svgContainerRef = useRef(null);
  const [svgContent, setSvgContent] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [values, setValues] = useState({}); // behavior values
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const symbolId = config.symbolId;
  const symbolInfo = symbolId ? getSymbolById(symbolId) : null;

  // 1. SVG yükle ve metadata parse et
  useEffect(() => {
    if (!symbolInfo?.svgUrl) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(symbolInfo.svgUrl)
      .then(r => r.text())
      .then(svgText => {
        // tb:metadata parse
        const metaMatch = svgText.match(/<tb:metadata[^>]*>\s*<!\[CDATA\[([\s\S]*?)\]\]>/);
        let meta = null;
        if (metaMatch) {
          try { meta = JSON.parse(metaMatch[1]); } catch { /* ignore parse error */ }
        }

        // tb:metadata elemanını SVG'den kaldır (render'da görünmesin)
        const cleanSvg = svgText.replace(/<tb:metadata[\s\S]*?<\/tb:metadata>/, '');

        setSvgContent(cleanSvg);
        setMetadata(meta);

        // behavior'lardan default değerleri al
        if (meta?.behavior) {
          const defaults = {};
          meta.behavior.forEach(b => {
            if (b.type === 'value') {
              const dv = b.defaultGetValueSettings?.defaultValue;
              defaults[b.id] = dv !== undefined ? dv : null;
            }
          });
          setValues(defaults);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('SVG yüklenemedi');
        setLoading(false);
      });
  }, [symbolInfo?.svgUrl]);

  // 2. SVG render & tag binding
  useEffect(() => {
    if (!svgContent || !svgContainerRef.current) return;

    const container = svgContainerRef.current;
    container.innerHTML = svgContent;

    const svgEl = container.querySelector('svg');
    if (svgEl) {
      svgEl.setAttribute('width', '100%');
      svgEl.setAttribute('height', '100%');
      svgEl.style.display = 'block';
    }
  }, [svgContent]);

  // 3. State render — behavior values değiştiğinde SVG elemanlarını güncelle
  useEffect(() => {
    if (!metadata?.tags || !svgContainerRef.current) return;

    const container = svgContainerRef.current;

    // properties'den config'e map
    const properties = {};
    if (metadata.properties) {
      metadata.properties.forEach(p => {
        properties[p.id] = config[`prop_${p.id}`] !== undefined
          ? config[`prop_${p.id}`]
          : p.defaultValue;
      });
    }

    // Tag bazlı elemanları bul
    const tags = {};
    metadata.tags.forEach(tagDef => {
      const elements = container.querySelectorAll(`[tb\\:tag="${tagDef.tag}"]`);
      tags[tagDef.tag] = Array.from(elements);
    });

    // Basitleştirilmiş context (ThingsBoard'un ctx'ini taklit)
    const ctx = {
      values,
      properties,
      tags,
      api: {
        formatValue: (v, dec, unit) => {
          const num = Number(v);
          if (isNaN(num)) return String(v);
          const formatted = dec !== undefined ? num.toFixed(dec) : String(num);
          return unit ? `${formatted} ${unit}` : formatted;
        },
        setValue: (id, val) => {
          setValues(prev => ({ ...prev, [id]: val }));
        },
        callAction: (event, behaviorId, value, observer) => {
          // RPC aksiyonu — behavior'dan method al
          if (!deviceId || isEditMode) return;
          const behavior = metadata.behavior?.find(b => b.id === behaviorId);
          if (!behavior) return;

          const rpcMethod = behavior.defaultSetValueSettings?.executeRpc?.method || behaviorId;
          fetch('/api/rpc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              deviceId,
              method: rpcMethod,
              params: value !== undefined ? { value } : {},
              timeout: 10000,
            }),
          })
          .then(r => r.json())
          .then(data => {
            if (data.ok && observer?.next) observer.next();
          })
          .catch(() => toast.error('RPC hatası'));
        },
        cssAnimate: (element, duration) => {
          // Basit CSS transition desteği
          element.style.transition = `all ${duration}ms ease`;
          return {
            attr: (attrs) => {
              Object.entries(attrs).forEach(([k, v]) => element.setAttribute(k, v));
              return this;
            },
            transform: (t) => {
              if (t.rotate !== undefined) {
                const ox = t.originX || 0;
                const oy = t.originY || 0;
                element.style.transformOrigin = `${ox}px ${oy}px`;
                element.style.transform = `rotate(${t.rotate}deg)`;
              }
              return this;
            },
          };
        },
      },
    };

    // Her tag için stateRenderFunction çalıştır
    metadata.tags.forEach(tagDef => {
      if (!tagDef.stateRenderFunction) return;
      const elements = tags[tagDef.tag] || [];
      elements.forEach(element => {
        try {
          const fn = new Function('ctx', 'element', tagDef.stateRenderFunction);
          fn(ctx, element);
        } catch (e) {
          console.warn(`SCADA tag render hatası [${tagDef.tag}]:`, e.message);
        }
      });
    });

    // Click aksiyonları bağla
    metadata.tags.forEach(tagDef => {
      if (!tagDef.actions?.click) return;
      const elements = tags[tagDef.tag] || [];
      elements.forEach(element => {
        // Eski listener'ı kaldır
        const oldHandler = element._scadaClickHandler;
        if (oldHandler) element.removeEventListener('click', oldHandler);

        const handler = (event) => {
          if (isEditMode) return;
          try {
            const fn = new Function('ctx', 'element', 'event', tagDef.actions.click.actionFunction);
            fn(ctx, element, event);
          } catch (e) {
            console.warn(`SCADA click hatası [${tagDef.tag}]:`, e.message);
          }
        };
        element._scadaClickHandler = handler;
        element.addEventListener('click', handler);
        element.style.cursor = isEditMode ? 'default' : 'pointer';
      });
    });

  }, [metadata, values, config, deviceId, isEditMode]);

  // 4. SSE ile telemetri dinle — behavior value'larını güncelle
  useTelemetrySSE(deviceId, useCallback((data) => {
    if (!metadata?.behavior) return;

    metadata.behavior.forEach(b => {
      if (b.type !== 'value') return;

      // Behavior'ın hangi telemetri key'ini dinlediğini bul
      const tsKey = b.defaultGetValueSettings?.getTimeSeries?.key;
      const attrKey = b.defaultGetValueSettings?.getAttribute?.key;
      const matchKey = tsKey || attrKey || b.id;

      if (data.key === matchKey) {
        let val = data.value;
        // Boolean dönüşüm
        if (b.valueType === 'BOOLEAN') {
          val = val === true || val === 'true' || val === 1 || val === '1';
        }
        setValues(prev => ({ ...prev, [b.id]: val }));
      }
    });
  }, [metadata]));

  // Loading & error states
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-halo-600 rounded-full" />
      </div>
    );
  }

  if (error || !symbolInfo) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
        <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
        </svg>
        <p className="text-sm">{error || 'Sembol seçilmedi'}</p>
        {isEditMode && <p className="text-xs">Widget ayarlarından bir SCADA sembolü seçin</p>}
      </div>
    );
  }

  return (
    <div
      ref={svgContainerRef}
      className="h-full w-full flex items-center justify-center overflow-hidden"
      style={{ padding: config.padding || '4px' }}
    />
  );
}
