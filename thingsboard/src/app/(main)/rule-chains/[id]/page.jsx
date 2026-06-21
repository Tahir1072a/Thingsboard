"use client";

/**
 * /rule-chains/[id] — Rule Chain Visual Editor
 *
 * React Flow (@xyflow/react) ile görsel kural zinciri editörü.
 * Node'lar sürükle-bırak ile eklenir, bağlantılar çizilerek oluşturulur.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Save,
  ArrowLeft,
  Plus,
  X,
  Filter,
  Zap,
  Layers,
  RefreshCw,
  Globe,
  Radio,
  Loader2,
} from "lucide-react";
import Breadcrumbs from "@/components/common/breadcrumbs";

// ── Node tipi tanımları ──
const NODE_CATALOG = [
  {
    category: "Filter",
    icon: Filter,
    color: "#6366f1",
    nodes: [
      { type: "MSG_TYPE_FILTER", label: "Mesaj Tipi Filtre", desc: "Mesaj tipine göre yönlendir" },
      { type: "SCRIPT_FILTER", label: "Script Filtre", desc: "JS koşulu ile filtrele" },
      { type: "FIELD_CHECK", label: "Alan Kontrolü", desc: "Gerekli alanları kontrol et" },
    ],
  },
  {
    category: "Action",
    icon: Zap,
    color: "#f59e0b",
    nodes: [
      { type: "SAVE_TELEMETRY", label: "Telemetri Kaydet", desc: "Veriyi DB'ye yaz" },
      { type: "CREATE_ALARM", label: "Alarm Oluştur", desc: "Yeni alarm tetikle" },
      { type: "CLEAR_ALARM", label: "Alarm Temizle", desc: "Aktif alarmı kapat" },
      { type: "SEND_EMAIL", label: "E-posta Gönder", desc: "E-posta bildirimi" },
      { type: "LOG", label: "Log", desc: "Konsola yaz" },
    ],
  },
  {
    category: "Enrichment",
    icon: Layers,
    color: "#10b981",
    nodes: [
      { type: "DEVICE_ATTRIBUTES", label: "Cihaz Özn.", desc: "Cihaz özniteliklerini ekle" },
      { type: "TENANT_ATTRIBUTES", label: "Tenant Özn.", desc: "Tenant bilgilerini ekle" },
    ],
  },
  {
    category: "Transformation",
    icon: RefreshCw,
    color: "#8b5cf6",
    nodes: [
      { type: "SCRIPT_TRANSFORM", label: "Script Dönüşüm", desc: "JS ile veri dönüştür" },
      { type: "RENAME_KEYS", label: "Anahtar Değiştir", desc: "Key isimlerini değiştir" },
    ],
  },
  {
    category: "External",
    icon: Globe,
    color: "#ef4444",
    nodes: [
      { type: "REST_API_CALL", label: "REST API", desc: "HTTP çağrısı yap" },
      { type: "TELEGRAM", label: "Telegram", desc: "Telegram mesajı gönder" },
      { type: "MQTT_PUBLISH", label: "MQTT Yayınla", desc: "Harici MQTT broker'a gönder" },
    ],
  },
  {
    category: "RPC",
    icon: Radio,
    color: "#f59e0b",
    nodes: [
      { type: "RPC_CALL_REQUEST", label: "RPC Komut Gönder", desc: "Cihaza RPC komutu gönder" },
      { type: "RPC_CALL_REPLY", label: "RPC Yanıt Dön", desc: "Client-side RPC'ye yanıt" },
    ],
  },
];

// ── Kategori renkleri ──
const TYPE_COLORS = {};
NODE_CATALOG.forEach((cat) => {
  cat.nodes.forEach((n) => {
    TYPE_COLORS[n.type] = cat.color;
  });
});

// ── Edge relation types ──
const RELATION_TYPES = ["SUCCESS", "FAILURE", "TRUE", "FALSE", "OTHER"];
const RELATION_COLORS = {
  SUCCESS: "#10b981",
  FAILURE: "#ef4444",
  TRUE: "#6366f1",
  FALSE: "#f59e0b",
  OTHER: "#6b7280",
};

// ── Custom Node Component ──
function RuleNode({ data }) {
  const color = TYPE_COLORS[data.nodeType] || "#6b7280";
  return (
    <div
      className="px-3 py-2 rounded-lg border-2 bg-bg-card shadow-lg min-w-[140px]"
      style={{ borderColor: color }}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs font-semibold text-text-main truncate">{data.label}</span>
      </div>
      <span className="text-[10px] text-text-muted">{data.nodeType}</span>
    </div>
  );
}

const nodeTypes = { ruleNode: RuleNode };

export default function RuleChainEditorPage() {
  const params = useParams();
  const router = useRouter();
  const chainId = params.id;

  const [chain, setChain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const counterRef = useRef(0);

  // ── Chain yükle ──
  useEffect(() => {
    if (!chainId) return;
    (async () => {
      try {
        const res = await fetch(`/api/rule-chain/${chainId}`);
        const json = await res.json();
        if (json.ok) {
          setChain(json.data);

          // Node'ları React Flow formatına dönüştür
          const rfNodes = (json.data.nodes || []).map((n) => ({
            id: n.nodeId,
            type: "ruleNode",
            position: n.position || { x: 0, y: 0 },
            data: {
              label: n.name,
              nodeType: n.type,
              config: n.config || {},
            },
          }));

          // Edge'leri React Flow formatına dönüştür
          const rfEdges = (json.data.connections || []).map((c, i) => ({
            id: `e${i}-${c.fromNodeId}-${c.toNodeId}`,
            source: c.fromNodeId,
            target: c.toNodeId,
            label: c.relationType,
            animated: c.relationType === "SUCCESS",
            style: { stroke: RELATION_COLORS[c.relationType] || "#6b7280" },
            markerEnd: { type: MarkerType.ArrowClosed, color: RELATION_COLORS[c.relationType] || "#6b7280" },
          }));

          setNodes(rfNodes);
          setEdges(rfEdges);

          counterRef.current = rfNodes.length;
        }
      } catch (err) {
        console.error("Load chain error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [chainId, setNodes, setEdges]);

  // ── Bağlantı oluşturma ──
  const onConnect = useCallback(
    (connection) => {
      const relationType = prompt(
        "Bağlantı tipi seçin:\n" + RELATION_TYPES.join(", "),
        "SUCCESS"
      );
      if (!relationType || !RELATION_TYPES.includes(relationType)) return;

      const newEdge = {
        ...connection,
        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
        label: relationType,
        animated: relationType === "SUCCESS",
        style: { stroke: RELATION_COLORS[relationType] || "#6b7280" },
        markerEnd: { type: MarkerType.ArrowClosed, color: RELATION_COLORS[relationType] || "#6b7280" },
      };

      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // ── Node ekle ──
  const addNode = useCallback(
    (catalogNode) => {
      counterRef.current += 1;
      const nodeId = `node_${Date.now()}_${counterRef.current}`;

      const newNode = {
        id: nodeId,
        type: "ruleNode",
        position: { x: 200 + Math.random() * 200, y: 100 + Math.random() * 200 },
        data: {
          label: catalogNode.label,
          nodeType: catalogNode.type,
          config: {},
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setShowCatalog(false);
    },
    [setNodes]
  );

  // ── Kaydet ──
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // React Flow → DB formatına dönüştür
      const dbNodes = nodes.map((n) => ({
        nodeId: n.id,
        type: n.data.nodeType,
        name: n.data.label,
        config: n.data.config || {},
        position: n.position,
      }));

      const dbConnections = edges.map((e) => ({
        fromNodeId: e.source,
        toNodeId: e.target,
        relationType: e.label || "SUCCESS",
      }));

      await fetch(`/api/rule-chain/${chainId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: dbNodes,
          connections: dbConnections,
          firstNodeId: dbNodes[0]?.nodeId || "",
        }),
      });
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  }, [nodes, edges, chainId]);

  if (loading) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      <Breadcrumbs items={[
        { label: "Kural Zincirleri", href: "/rule-chains" },
        { label: chain?.name || "Kural Zinciri" },
      ]} className="px-4 pt-2" />

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-bg-card border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/rule-chains")}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-text-muted" />
          </button>
          <div>
            <h2 className="text-sm font-semibold text-text-main">
              {chain?.name || "Kural Zinciri"}
            </h2>
            <span className="text-[11px] text-text-muted">
              {nodes.length} node • {edges.length} bağlantı
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCatalog(!showCatalog)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white/5 hover:bg-white/10 border border-border rounded-lg transition-colors text-text-main"
          >
            <Plus className="h-3.5 w-3.5" />
            Node Ekle
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Kaydet
          </button>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode="Delete"
          className="bg-bg-main"
        >
          <Background color="#333" gap={20} />
          <Controls className="!bg-bg-card !border-border !rounded-lg" />
        </ReactFlow>

        {/* Node Catalog Panel */}
        {showCatalog && (
          <div className="absolute top-2 right-2 w-64 bg-bg-card border border-border rounded-xl shadow-2xl z-10 max-h-[calc(100vh-160px)] overflow-y-auto">
            <div className="flex items-center justify-between p-3 border-b border-border sticky top-0 bg-bg-card rounded-t-xl">
              <span className="text-sm font-medium text-text-main">Node Kataloğu</span>
              <button onClick={() => setShowCatalog(false)}>
                <X className="h-4 w-4 text-text-muted" />
              </button>
            </div>
            <div className="p-2 space-y-3">
              {NODE_CATALOG.map((cat) => (
                <div key={cat.category}>
                  <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-text-muted uppercase tracking-wider">
                    <cat.icon className="h-3 w-3" style={{ color: cat.color }} />
                    {cat.category}
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {cat.nodes.map((n) => (
                      <button
                        key={n.type}
                        onClick={() => addNode(n)}
                        className="w-full flex items-start gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <div>
                          <span className="text-xs font-medium text-text-main">{n.label}</span>
                          <p className="text-[10px] text-text-muted">{n.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
