"use client";

/**
 * Atlas3DClient — 3D force-directed knowledge graph using react-force-graph-3d.
 *
 * Three.js WebGL rendering with d3-force-3d physics. Supports orbit/zoom/pan
 * camera controls, node click-to-inspect, and real Neo4j data from the existing
 * /api/atlas/graph-payload endpoint.
 *
 * Post-ingestion live updates are streamed via SSE from /api/atlas/graph-updates
 * and merged into graphData in real-time without a page refresh.
 */

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { ForceGraphMethods } from "react-force-graph-3d";

import { Icon } from "@proto/icon-system";

import Atlas3DDetailPanel from "./components/Atlas3DDetailPanel";
import { useGraphUpdates } from "./hooks/useGraphUpdates";
import {
  getEntityVisual,
  getRelationshipVisual,
  getEntityLegend,
} from "./lib/atlas-schema";

// ─── LOD / Performance Constants ────────────────────────────────────

/** Nodes beyond this distance from the camera suppress their text label. */
const LOD_LABEL_DISTANCE = 500;

/** Node count threshold above which large-graph performance mode activates. */
const LARGE_GRAPH_THRESHOLD = 5000;

// react-force-graph-3d requires WebGL — disable SSR
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), {
  ssr: false,
});

// ─── Settings ────────────────────────────────────────────────────────

const SETTINGS_STORAGE_KEY = "atlas-settings";

interface AtlasSettings {
  showLabels: boolean;
  particleSpeed: number;
  linkOpacity: number;
}

const DEFAULT_SETTINGS: AtlasSettings = {
  showLabels: true,
  particleSpeed: 0.005,
  linkOpacity: 0.4,
};

function loadSettings(): AtlasSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(s: AtlasSettings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore storage errors
  }
}

// ─── Types ──────────────────────────────────────────────────────────

interface AtlasNode {
  id: string;
  name: string;
  type: string;
  color: string;
  val: number;
  // Injected by react-force-graph-3d at simulation time
  x?: number;
  y?: number;
  z?: number;
}

interface AtlasLink {
  source: string;
  target: string;
  color: string;
}

interface GraphData {
  nodes: AtlasNode[];
  links: AtlasLink[];
}

// ─── Data Fetching ──────────────────────────────────────────────────

async function fetchGraphData(
  viewMode = "full-atlas",
  limit = 2000,
  centerEntity?: string
): Promise<GraphData> {
  const params = new URLSearchParams({ viewMode, limit: String(limit) });
  if (centerEntity) params.set("centerEntity", centerEntity);

  const res = await fetch(`/api/atlas/graph-payload?${params}`);
  const json = await res.json();

  if (!json.success || !json.data) {
    return { nodes: [], links: [] };
  }

  const { nodes: rawNodes, edges: rawEdges } = json.data;

  const nodes: AtlasNode[] = (rawNodes ?? []).map(
    (n: { uid: string; name: string; type: string }) => {
      const visual = getEntityVisual(n.type);
      return {
        id: n.uid,
        name: n.name,
        type: n.type,
        color: visual.color,
        val: visual.size,
      };
    }
  );

  const nodeIds = new Set(nodes.map((n) => n.id));

  const links: AtlasLink[] = (rawEdges ?? [])
    .filter(
      (e: { source: string; target: string }) =>
        nodeIds.has(e.source) && nodeIds.has(e.target)
    )
    .map(
      (e: {
        source: string;
        target: string;
        type?: string;
        sentiment?: string;
        display?: { color?: string };
      }) => {
        const visual = getRelationshipVisual(
          e.type ?? "RELATED_TO",
          e.sentiment
        );
        return {
          source: e.source,
          target: e.target,
          color: e.display?.color ?? visual.color,
        };
      }
    );

  return { nodes, links };
}

// ─── Component ──────────────────────────────────────────────────────

export default function Atlas3DClient() {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<AtlasNode | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [settings, setSettings] = useState<AtlasSettings>(DEFAULT_SETTINGS);
  // Mutable ref tracking camera position — updated per-frame via onRenderFramePre
  // to drive LOD label and nodeVisibility callbacks without React re-renders.
  const cameraPositionRef = useRef({ x: 0, y: 0, z: 0 });
  const HEADER_HEIGHT = 45;
  const [dimensions, setDimensions] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height:
      typeof window !== "undefined" ? window.innerHeight - HEADER_HEIGHT : 800,
  });

  // Load persisted settings on mount
  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  // Parse URL params — supports both ?centerEntity=uid and ?entities=uid1,uid2,uid3
  const searchParams = useSearchParams();
  const centerEntity = searchParams.get("centerEntity") ?? undefined;
  const entitiesParam = searchParams.get("entities") ?? undefined;

  // Build the set of highlighted UIDs from either param
  const highlightedUids = useMemo<Set<string>>(() => {
    const uids = new Set<string>();
    if (centerEntity) uids.add(centerEntity);
    if (entitiesParam) {
      entitiesParam.split(",").forEach((uid) => {
        const trimmed = uid.trim();
        if (trimmed) uids.add(trimmed);
      });
    }
    return uids;
  }, [centerEntity, entitiesParam]);

  // Whether multi-entity highlight mode is active
  const isMultiHighlight = highlightedUids.size > 1;

  // SSE subscription — merges new nodes/links from ingest events in real-time
  const { connected, outOfSync, recentEntityCount, clearOutOfSync } =
    useGraphUpdates(setGraphData, graphRef);

  // Update on window resize
  useEffect(() => {
    const onResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight - HEADER_HEIGHT,
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Fetch graph data
  useEffect(() => {
    const viewMode = centerEntity ? "ego" : "full-atlas";

    setLoading(true);
    fetchGraphData(viewMode, 2000, centerEntity)
      .then((data) => {
        setGraphData(data);
        if (isMultiHighlight) {
          // For multi-entity mode: fit camera to contain all highlighted nodes
          setTimeout(() => {
            if (!graphRef.current) return;
            const highlighted = data.nodes.filter((n) =>
              highlightedUids.has(n.id)
            );
            if (highlighted.length === 0) return;
            // Compute bounding box centroid
            const xs = highlighted.map((n) => (n as any).x ?? 0);
            const ys = highlighted.map((n) => (n as any).y ?? 0);
            const zs = highlighted.map((n) => (n as any).z ?? 0);
            const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
            const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
            const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
            const spread = Math.max(
              Math.max(...xs) - Math.min(...xs),
              Math.max(...ys) - Math.min(...ys),
              100
            );
            graphRef.current.cameraPosition(
              { x: cx, y: cy, z: cz + spread * 2 + 300 },
              { x: cx, y: cy, z: cz },
              1500
            );
          }, 2500);
        } else if (centerEntity) {
          // Single entity: fly to it
          setTimeout(() => {
            const node = data.nodes.find((n) => n.id === centerEntity);
            if (node && graphRef.current) {
              graphRef.current.cameraPosition(
                { x: (node as any).x ?? 0, y: (node as any).y ?? 0, z: 200 },
                { x: (node as any).x ?? 0, y: (node as any).y ?? 0, z: 0 },
                1000
              );
            }
          }, 2000);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Node click → select + fly to + open detail panel
  const handleNodeClick = useCallback((node: any) => {
    if (!node || !graphRef.current) return;
    setSelectedNode(node as AtlasNode);
    setDetailPanelOpen(true);
    graphRef.current.cameraPosition(
      { x: node.x, y: node.y, z: node.z + 150 },
      { x: node.x, y: node.y, z: node.z },
      1000
    );
  }, []);

  // Expand node → load neighbors and merge
  const handleExpand = useCallback(async (entityId: string) => {
    const data = await fetchGraphData("ego", 50, entityId);
    setGraphData((prev) => {
      if (!prev) return data;
      const existingIds = new Set(prev.nodes.map((n) => n.id));
      const newNodes = data.nodes.filter((n) => !existingIds.has(n.id));
      const existingLinks = new Set(
        prev.links.map(
          (l) =>
            `${typeof l.source === "string" ? l.source : (l.source as any).id}-${typeof l.target === "string" ? l.target : (l.target as any).id}`
        )
      );
      const newLinks = data.links.filter(
        (l) => !existingLinks.has(`${l.source}-${l.target}`)
      );
      return {
        nodes: [...prev.nodes, ...newNodes],
        links: [...prev.links, ...newLinks],
      };
    });
  }, []);

  // Sync camera position ref via requestAnimationFrame loop so LOD callbacks
  // always read a fresh position without triggering React re-renders.
  // Runs only while graphData is loaded; cancelled on unmount.
  useEffect(() => {
    if (!graphData) return;
    let rafId: number;
    const tick = () => {
      const cam = (graphRef.current as any)?.camera?.();
      if (cam) {
        cameraPositionRef.current = {
          x: cam.position.x,
          y: cam.position.y,
          z: cam.position.z,
        };
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [graphData]);

  // LOD label: return HTML tooltip only when the node is within
  // LOD_LABEL_DISTANCE of the camera. Returning an empty string suppresses
  // the label entirely — cheaper than rendering invisible DOM nodes.
  // When showLabels is false, always return empty string.
  const nodeLabelFn = useCallback(
    (node: any) => {
      if (!settings.showLabels) return "";
      const cam = cameraPositionRef.current;
      const nx = node.x ?? 0;
      const ny = node.y ?? 0;
      const nz = node.z ?? 0;
      const dist = Math.sqrt(
        (cam.x - nx) ** 2 + (cam.y - ny) ** 2 + (cam.z - nz) ** 2
      );
      if (dist > LOD_LABEL_DISTANCE) return "";
      return `<div style="background:rgba(13,13,24,0.92);padding:8px 10px;border-radius:8px;font-size:12px;color:#e2e8f0;border:1px solid rgba(255,255,255,0.08);backdrop-filter:blur(8px)">
      <strong style="display:block;margin-bottom:3px">${node.name}</strong>
      <span style="color:#94a3b8;font-size:10px;display:block;margin-bottom:6px">${node.type}</span>
      <span style="display:inline-block;font-size:10px;color:#a78bfa;background:rgba(167,139,250,0.12);border:1px solid rgba(167,139,250,0.25);border-radius:4px;padding:2px 6px;cursor:pointer" data-node-details="${node.id}">Details →</span>
    </div>`;
    },
    [settings.showLabels]
  );

  // Lazy frustum culling: hide nodes that have drifted far behind the camera
  // to reduce per-frame geometry submissions on large graphs.
  const nodeVisibility = useCallback((node: any): boolean => {
    const cam = cameraPositionRef.current;
    // Cull nodes more than 3× LOD_LABEL_DISTANCE behind the camera along z.
    const nz = node.z ?? 0;
    return nz > cam.z - LOD_LABEL_DISTANCE * 3;
  }, []);

  // Settings updater — persists to localStorage
  const updateSettings = useCallback((patch: Partial<AtlasSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  // Derived performance settings based on current graph size.
  const nodeCount = graphData?.nodes.length ?? 0;
  const isLargeGraph = nodeCount > LARGE_GRAPH_THRESHOLD;

  if (loading) {
    return (
      <div className="w-full h-full bg-background flex flex-col">
        <AtlasHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Icon
              name="Loader2"
              className="h-8 w-8 animate-spin text-primary mx-auto mb-3"
            />
            <p className="text-sm text-muted-foreground">
              Loading knowledge graph...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full bg-background flex flex-col">
        <AtlasHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Icon
              name="AlertCircle"
              className="h-8 w-8 text-destructive mx-auto mb-3"
            />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-background flex flex-col">
      <AtlasHeader
        nodeCount={graphData?.nodes.length}
        linkCount={graphData?.links.length}
        settings={settings}
        onSettingsChange={updateSettings}
      />
      <div
        ref={containerRef}
        className="flex-1 relative min-h-0"
        style={{ height: "calc(100vh - 45px)" }}
      >
        {graphData && (
          <ForceGraph3D
            ref={graphRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            backgroundColor="#0a0a12"
            showNavInfo={false}
            // Node rendering — highlight matching nodes when ?entities= is set
            nodeColor={(node: any) => {
              if (highlightedUids.size === 0) return node.color ?? "#6B7280";
              return highlightedUids.has(node.id)
                ? (node.color ?? "#6B7280")
                : "#1e2130";
            }}
            nodeVal={(node: any) => {
              if (highlightedUids.size === 0) return node.val ?? 1;
              return highlightedUids.has(node.id)
                ? (node.val ?? 1) * 1.6
                : (node.val ?? 1);
            }}
            nodeLabel={nodeLabelFn}
            nodeVisibility={nodeVisibility}
            nodeOpacity={0.9}
            nodeResolution={isLargeGraph ? 8 : 12}
            // Link rendering
            linkColor={(link: any) => link.color ?? "#334155"}
            linkOpacity={settings.linkOpacity}
            linkWidth={0.5}
            linkDirectionalParticles={isLargeGraph ? 1 : 2}
            linkDirectionalParticleWidth={0.8}
            linkDirectionalParticleSpeed={settings.particleSpeed}
            // Camera + controls
            enableNavigationControls={true}
            enablePointerInteraction={true}
            enableNodeDrag={!isLargeGraph}
            // Force layout
            warmupTicks={100}
            cooldownTicks={200}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            // Events
            onNodeClick={handleNodeClick}
          />
        )}

        {/* Full-detail slide-out panel — opens on node click */}
        <Atlas3DDetailPanel
          entityId={detailPanelOpen ? (selectedNode?.id ?? null) : null}
          entityName={selectedNode?.name}
          entityType={selectedNode?.type}
          entityColor={selectedNode?.color}
          onClose={() => setDetailPanelOpen(false)}
          onExpand={(id) => {
            handleExpand(id);
            setDetailPanelOpen(false);
          }}
          onEntityNavigate={(uid, _name) => {
            const node = graphData?.nodes.find((n) => n.id === uid);
            if (node && graphRef.current) {
              setSelectedNode(node);
              graphRef.current.cameraPosition(
                { x: node.x ?? 0, y: node.y ?? 0, z: (node.z ?? 0) + 150 },
                { x: node.x ?? 0, y: node.y ?? 0, z: node.z ?? 0 },
                1000
              );
            }
          }}
        />

        {/* Legend — collapsible, bottom-left, above stats */}
        <AtlasLegend />

        {/* Stats */}
        <div className="absolute bottom-3 left-3 text-[10px] text-muted-foreground/40 tabular-nums z-10">
          {graphData
            ? `${graphData.nodes.length.toLocaleString()} nodes · ${graphData.links.length.toLocaleString()} edges`
            : ""}
        </div>

        {/* Live indicator — shown while SSE is connected and entities arrived */}
        {connected && recentEntityCount > 0 && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 text-[10px] text-emerald-400/70 z-10">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            Live
          </div>
        )}

        {/* Out-of-sync banner — shown when SSE connection drops */}
        {outOfSync && (
          <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-card/90 backdrop-blur border border-amber-500/30 text-amber-400 text-[11px] px-3 py-1.5 rounded-lg shadow z-10">
            <Icon name="WifiOff" className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Atlas out of sync</span>
            <button
              onClick={() => {
                clearOutOfSync();
                window.location.reload();
              }}
              className="ml-1 underline underline-offset-2 hover:text-amber-300 transition-colors"
            >
              Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Legend ─────────────────────────────────────────────────────────

function AtlasLegend() {
  const [open, setOpen] = useState(false);
  const legend = getEntityLegend();

  return (
    <div className="absolute z-10" style={{ bottom: "28px", left: "12px" }}>
      {open && (
        <div className="mb-1.5 bg-card/90 backdrop-blur border border-border rounded-lg shadow-lg p-3 w-44">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Entity Types
          </p>
          <ul className="space-y-1.5">
            {legend.map((entry) => (
              <li key={entry.type} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-[11px] text-foreground/80">
                  {entry.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 bg-card/80 backdrop-blur border border-border rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors shadow-sm"
        title={open ? "Hide legend" : "Show legend"}
      >
        <Icon name="Layers" className="h-3 w-3" />
        Legend
        <Icon
          name={open ? "ChevronDown" : "ChevronUp"}
          className="h-3 w-3 opacity-60"
        />
      </button>
    </div>
  );
}

// ─── Settings Panel ──────────────────────────────────────────────────

function AtlasSettingsDropdown({
  settings,
  onChange,
}: {
  settings: AtlasSettings;
  onChange: (patch: Partial<AtlasSettings>) => void;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`p-1.5 rounded-md transition-colors ${
          open
            ? "text-foreground bg-muted/70"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        }`}
        title="Graph settings"
        aria-label="Graph settings"
      >
        <Icon name="Settings" className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-card/95 backdrop-blur border border-border rounded-lg shadow-xl p-3 z-50">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Graph Settings
          </p>

          {/* Label visibility toggle */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Icon
                name={settings.showLabels ? "Eye" : "EyeOff"}
                className="h-3 w-3 text-muted-foreground"
              />
              <span className="text-[11px] text-foreground/80">
                Node Labels
              </span>
            </div>
            <button
              onClick={() => onChange({ showLabels: !settings.showLabels })}
              className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none ${
                settings.showLabels ? "bg-primary" : "bg-muted"
              }`}
              role="switch"
              aria-checked={settings.showLabels}
            >
              <span
                className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${
                  settings.showLabels ? "translate-x-3.5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Particle speed slider */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-foreground/80">
                Particle Speed
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {settings.particleSpeed.toFixed(3)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={0.02}
              step={0.001}
              value={settings.particleSpeed}
              onChange={(e) =>
                onChange({ particleSpeed: parseFloat(e.target.value) })
              }
              className="w-full h-1 accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-muted-foreground/50 mt-0.5">
              <span>0</span>
              <span>0.02</span>
            </div>
          </div>

          {/* Link opacity slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-foreground/80">
                Link Opacity
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {settings.linkOpacity.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.linkOpacity}
              onChange={(e) =>
                onChange({ linkOpacity: parseFloat(e.target.value) })
              }
              className="w-full h-1 accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-muted-foreground/50 mt-0.5">
              <span>0</span>
              <span>1</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Header ─────────────────────────────────────────────────────────

function AtlasHeader({
  nodeCount,
  linkCount,
  settings,
  onSettingsChange,
}: {
  nodeCount?: number;
  linkCount?: number;
  settings?: AtlasSettings;
  onSettingsChange?: (patch: Partial<AtlasSettings>) => void;
}) {
  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="px-4 py-2 flex items-center gap-3">
        <Link
          href="/"
          className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
        >
          <Icon name="ArrowLeft" className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2">
          <Icon name="Globe" className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-foreground">Atlas</span>
        </div>
        {nodeCount !== undefined && (
          <span className="text-[10px] text-muted-foreground/50 tabular-nums">
            {nodeCount.toLocaleString()} nodes &middot;{" "}
            {(linkCount ?? 0).toLocaleString()} edges
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {settings && onSettingsChange && (
            <AtlasSettingsDropdown
              settings={settings}
              onChange={onSettingsChange}
            />
          )}
          <Link
            href="/"
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
          >
            <Icon name="Search" className="h-3.5 w-3.5" />
            Search
          </Link>
        </div>
      </div>
    </header>
  );
}
