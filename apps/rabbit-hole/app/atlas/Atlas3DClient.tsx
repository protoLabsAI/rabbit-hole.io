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

import { useGraphUpdates } from "./hooks/useGraphUpdates";
import { getEntityVisual, getRelationshipVisual } from "./lib/atlas-schema";

// ─── LOD / Performance Constants ────────────────────────────────────

/** Nodes beyond this distance from the camera suppress their text label. */
const LOD_LABEL_DISTANCE = 500;

/** Node count threshold above which large-graph performance mode activates. */
const LARGE_GRAPH_THRESHOLD = 5000;

// react-force-graph-3d requires WebGL — disable SSR
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), {
  ssr: false,
});

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
  // Mutable ref tracking camera position — updated per-frame via onRenderFramePre
  // to drive LOD label and nodeVisibility callbacks without React re-renders.
  const cameraPositionRef = useRef({ x: 0, y: 0, z: 0 });
  const HEADER_HEIGHT = 45;
  const [dimensions, setDimensions] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height:
      typeof window !== "undefined" ? window.innerHeight - HEADER_HEIGHT : 800,
  });

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Node click → select + fly to
  const handleNodeClick = useCallback((node: any) => {
    if (!node || !graphRef.current) return;
    setSelectedNode(node as AtlasNode);
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
  const nodeLabel = useCallback((node: any) => {
    const cam = cameraPositionRef.current;
    const nx = node.x ?? 0;
    const ny = node.y ?? 0;
    const nz = node.z ?? 0;
    const dist = Math.sqrt(
      (cam.x - nx) ** 2 + (cam.y - ny) ** 2 + (cam.z - nz) ** 2
    );
    if (dist > LOD_LABEL_DISTANCE) return "";
    return `<div style="background:rgba(0,0,0,0.85);padding:6px 10px;border-radius:6px;font-size:12px;color:#e2e8f0;border:1px solid rgba(255,255,255,0.1)">
      <strong>${node.name}</strong>
      <br/><span style="color:#94a3b8;font-size:10px">${node.type}</span>
    </div>`;
  }, []);

  // Lazy frustum culling: hide nodes that have drifted far behind the camera
  // to reduce per-frame geometry submissions on large graphs.
  const nodeVisibility = useCallback((node: any): boolean => {
    const cam = cameraPositionRef.current;
    // Cull nodes more than 3× LOD_LABEL_DISTANCE behind the camera along z.
    const nz = node.z ?? 0;
    return nz > cam.z - LOD_LABEL_DISTANCE * 3;
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
                ? node.color ?? "#6B7280"
                : "#1e2130";
            }}
            nodeVal={(node: any) => {
              if (highlightedUids.size === 0) return node.val ?? 1;
              return highlightedUids.has(node.id)
                ? (node.val ?? 1) * 1.6
                : node.val ?? 1;
            }}
            nodeLabel={nodeLabel}
            nodeVisibility={nodeVisibility}
            nodeOpacity={0.9}
            nodeResolution={isLargeGraph ? 8 : 12}
            // Link rendering
            linkColor={(link: any) => link.color ?? "#334155"}
            linkOpacity={0.4}
            linkWidth={0.5}
            linkDirectionalParticles={isLargeGraph ? 1 : 2}
            linkDirectionalParticleWidth={0.8}
            linkDirectionalParticleSpeed={0.005}
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

        {/* Selected node detail card */}
        {selectedNode && (
          <div className="absolute top-4 right-4 w-72 bg-card/95 backdrop-blur border border-border rounded-lg shadow-lg p-4 z-10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {selectedNode.name}
              </h3>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded"
              >
                <Icon name="X" className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: selectedNode.color }}
              />
              <span className="text-xs text-muted-foreground capitalize">
                {selectedNode.type}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleExpand(selectedNode.id)}
                className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors"
              >
                <Icon name="Maximize2" className="h-3 w-3" />
                Expand
              </button>
              <a
                href={`/atlas?viewMode=ego&centerEntity=${selectedNode.id}`}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon name="Focus" className="h-3 w-3" />
                Ego view
              </a>
            </div>
          </div>
        )}

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

// ─── Header ─────────────────────────────────────────────────────────

function AtlasHeader({
  nodeCount,
  linkCount,
}: {
  nodeCount?: number;
  linkCount?: number;
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
