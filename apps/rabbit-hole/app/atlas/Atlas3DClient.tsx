"use client";

/**
 * Atlas3DClient — 3D force-directed knowledge graph using react-force-graph-3d.
 *
 * Three.js WebGL rendering with d3-force-3d physics. Supports orbit/zoom/pan
 * camera controls, node click-to-inspect, and real Neo4j data from the existing
 * /api/atlas/graph-payload endpoint.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import type { ForceGraphMethods } from "react-force-graph-3d";

import { Icon } from "@proto/icon-system";

import { getEntityVisual, getRelationshipVisual } from "./lib/atlas-schema";

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
        const visual = getRelationshipVisual(e.type ?? "RELATED_TO", e.sentiment);
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
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Responsive canvas
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Fetch graph data
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const centerEntity = params.get("centerEntity") ?? undefined;
    const viewMode = centerEntity ? "ego" : "full-atlas";

    setLoading(true);
    fetchGraphData(viewMode, 2000, centerEntity)
      .then((data) => {
        setGraphData(data);
        // Fly to center entity if specified
        if (centerEntity) {
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

  // Node click → select + fly to
  const handleNodeClick = useCallback(
    (node: any) => {
      if (!node || !graphRef.current) return;
      setSelectedNode(node as AtlasNode);
      graphRef.current.cameraPosition(
        { x: node.x, y: node.y, z: node.z + 150 },
        { x: node.x, y: node.y, z: node.z },
        1000
      );
    },
    []
  );

  // Expand node → load neighbors and merge
  const handleExpand = useCallback(
    async (entityId: string) => {
      const data = await fetchGraphData("ego", 50, entityId);
      setGraphData((prev) => {
        if (!prev) return data;
        const existingIds = new Set(prev.nodes.map((n) => n.id));
        const newNodes = data.nodes.filter((n) => !existingIds.has(n.id));
        const existingLinks = new Set(
          prev.links.map((l) => `${typeof l.source === "string" ? l.source : (l.source as any).id}-${typeof l.target === "string" ? l.target : (l.target as any).id}`)
        );
        const newLinks = data.links.filter(
          (l) => !existingLinks.has(`${l.source}-${l.target}`)
        );
        return {
          nodes: [...prev.nodes, ...newNodes],
          links: [...prev.links, ...newLinks],
        };
      });
    },
    []
  );

  // Node label on hover
  const nodeLabel = useCallback(
    (node: any) =>
      `<div style="background:rgba(0,0,0,0.85);padding:6px 10px;border-radius:6px;font-size:12px;color:#e2e8f0;border:1px solid rgba(255,255,255,0.1)">
        <strong>${node.name}</strong>
        <br/><span style="color:#94a3b8;font-size:10px">${node.type}</span>
      </div>`,
    []
  );

  if (loading) {
    return (
      <div className="w-full h-full bg-background flex flex-col">
        <AtlasHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Icon name="Loader2" className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading knowledge graph...</p>
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
            <Icon name="AlertCircle" className="h-8 w-8 text-destructive mx-auto mb-3" />
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
      <div ref={containerRef} className="flex-1 relative">
        {graphData && (
          <ForceGraph3D
            ref={graphRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            backgroundColor="#0a0a12"
            showNavInfo={false}
            // Node rendering
            nodeColor={(node: any) => node.color ?? "#6B7280"}
            nodeVal={(node: any) => node.val ?? 1}
            nodeLabel={nodeLabel}
            nodeOpacity={0.9}
            nodeResolution={12}
            // Link rendering
            linkColor={(link: any) => link.color ?? "#334155"}
            linkOpacity={0.4}
            linkWidth={0.5}
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={0.8}
            linkDirectionalParticleSpeed={0.005}
            // Camera + controls
            enableNavigationControls={true}
            enablePointerInteraction={true}
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
        <a
          href="/"
          className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
        >
          <Icon name="ArrowLeft" className="h-4 w-4" />
        </a>
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
          <a
            href="/"
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
          >
            <Icon name="Search" className="h-3.5 w-3.5" />
            Search
          </a>
        </div>
      </div>
    </header>
  );
}
