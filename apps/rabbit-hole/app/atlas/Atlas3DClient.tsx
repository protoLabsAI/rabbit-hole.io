"use client";

/**
 * Atlas3DClient — 3D force-directed knowledge graph using react-force-graph-3d.
 *
<<<<<<< HEAD
 * Cosmograph runs force simulation on the GPU via WebGL2 compute shaders,
 * enabling 1M+ nodes at interactive framerates. Data flows from the existing
 * /api/atlas/graph-payload endpoint through a data adapter.
 *
 * Interactive features:
 * 1. Click-to-inspect — detail panel on right side
 * 2. Hover tooltip — floating label near cursor
 * 3. Search + focus — typeahead with zoom-to-node
 * 4. Node expansion — fetch and merge neighborhood
=======
 * Three.js WebGL rendering with d3-force-3d physics. Supports orbit/zoom/pan
 * camera controls, node click-to-inspect, and real Neo4j data from the existing
 * /api/atlas/graph-payload endpoint.
>>>>>>> origin/main
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import type { ForceGraphMethods } from "react-force-graph-3d";

import { Icon } from "@proto/icon-system";

<<<<<<< HEAD
import Atlas3DDetailPanel from "./components/Atlas3DDetailPanel";
import Atlas3DSearchBar from "./components/Atlas3DSearchBar";
import Atlas3DTooltip from "./components/Atlas3DTooltip";

// Cosmograph is WebGL-only — disable SSR
const Cosmograph = dynamic(
  () => import("@cosmograph/react").then((mod) => mod.Cosmograph),
  { ssr: false }
);
=======
import { getEntityVisual, getRelationshipVisual } from "./lib/atlas-schema";

// react-force-graph-3d requires WebGL — disable SSR
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), {
  ssr: false,
});
>>>>>>> origin/main

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
<<<<<<< HEAD
  centerEntity?: string,
  hops?: number
): Promise<GraphData> {
  const params = new URLSearchParams({
    viewMode,
    limit: String(limit),
  });
  if (centerEntity) params.set("centerEntity", centerEntity);
  if (hops !== undefined) params.set("hops", String(hops));
=======
  centerEntity?: string
): Promise<GraphData> {
  const params = new URLSearchParams({ viewMode, limit: String(limit) });
  if (centerEntity) params.set("centerEntity", centerEntity);
>>>>>>> origin/main

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

<<<<<<< HEAD
import { getEntityVisual, getRelationshipVisual } from "./lib/atlas-schema";

function getEntityColor(type: string): string {
  return getEntityVisual(type).color;
}

function getEntitySize(type: string): number {
  return getEntityVisual(type).size;
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Merge new graph data into existing, deduplicating by ID */
function mergeGraphData(existing: GraphData, incoming: GraphData): GraphData {
  const existingNodeIds = new Set(existing.nodes.map((n) => n.id));
  const existingLinkKeys = new Set(
    existing.links.map((l) => `${l.source}->${l.target}`)
  );

  const newNodes = incoming.nodes.filter((n) => !existingNodeIds.has(n.id));
  const newLinks = incoming.links.filter(
    (l) => !existingLinkKeys.has(`${l.source}->${l.target}`)
  );

  return {
    nodes: [...existing.nodes, ...newNodes],
    links: [...existing.links, ...newLinks],
  };
}

=======
>>>>>>> origin/main
// ─── Component ──────────────────────────────────────────────────────

export default function Atlas3DClient() {
  const containerRef = useRef<HTMLDivElement>(null);
<<<<<<< HEAD
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cosmographRef = useRef<any>(null);
=======
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);
>>>>>>> origin/main
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<AtlasNode | null>(null);
  const HEADER_HEIGHT = 45;
  const [dimensions, setDimensions] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight - HEADER_HEIGHT : 800,
  });

<<<<<<< HEAD
  // Feature 1: Click-to-inspect
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  // Feature 2: Hover tooltip
  const [hoveredNode, setHoveredNode] = useState<AtlasNode | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [hoveredConnectionCount, setHoveredConnectionCount] = useState<
    number | undefined
  >(undefined);
  const hoverDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Set of node IDs in the graph (for search bar)
  const graphNodeIds = useMemo(
    () => new Set(graphData?.nodes.map((n) => n.id) ?? []),
    [graphData]
  );

  // Fetch graph data on mount
=======
  // Update on window resize
>>>>>>> origin/main
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

<<<<<<< HEAD
  // Feature 1: Handle node click -> open detail panel
  const handleNodeClick = useCallback(
    async (index: number | undefined) => {
      if (index === undefined || !cosmographRef.current) return;

      try {
        const ids = await cosmographRef.current.getPointIdsByIndices([index]);
        if (ids && ids.length > 0) {
          setSelectedEntityId(ids[0]);
        }
      } catch {
        // Fallback: try to find node by index in the data
        if (graphData && index < graphData.nodes.length) {
          setSelectedEntityId(graphData.nodes[index].id);
        }
      }
    },
    [graphData]
  );

  // Feature 2: Handle hover -> show tooltip
  const handlePointMouseOver = useCallback(
    (index: number, pointPosition: [number, number]) => {
      if (hoverDebounceRef.current) clearTimeout(hoverDebounceRef.current);

      hoverDebounceRef.current = setTimeout(async () => {
        if (!graphData) return;

        // Resolve the node from index
        let node: AtlasNode | null = null;
        try {
          if (cosmographRef.current) {
            const ids = await cosmographRef.current.getPointIdsByIndices([index]);
            if (ids && ids.length > 0) {
              node = graphData.nodes.find((n) => n.id === ids[0]) ?? null;
            }
          }
        } catch {
          // Fallback
          if (index < graphData.nodes.length) {
            node = graphData.nodes[index];
          }
        }

        if (!node) return;

        // Get connection count
        let connectionCount: number | undefined;
        try {
          if (cosmographRef.current) {
            const degrees = cosmographRef.current.getPointDegrees(index);
            if (degrees) {
              connectionCount = degrees.inDegree + degrees.outDegree;
            }
          }
        } catch {
          // Connection count is best-effort
        }

        // Convert space position to screen position for tooltip
        let screenPos: { x: number; y: number } | null = null;
        try {
          if (cosmographRef.current) {
            const sp = cosmographRef.current.spaceToScreenPosition(pointPosition);
            if (sp) {
              screenPos = { x: sp[0], y: sp[1] };
            }
          }
        } catch {
          // Fallback — skip tooltip
        }

        setHoveredNode(node);
        setHoveredConnectionCount(connectionCount);
        setTooltipPosition(screenPos);
      }, 100);
    },
    [graphData]
  );

  const handlePointMouseOut = useCallback(() => {
    if (hoverDebounceRef.current) clearTimeout(hoverDebounceRef.current);
    setHoveredNode(null);
    setTooltipPosition(null);
    setHoveredConnectionCount(undefined);
  }, []);
=======
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
>>>>>>> origin/main

  // Feature 3: Search -> focus on node or re-fetch ego view
  const handleSearchSelect = useCallback(
    async (uid: string) => {
      // Check if node is in current graph
      if (graphData && graphNodeIds.has(uid)) {
        // Focus on the node using Cosmograph ref
        try {
          if (cosmographRef.current) {
            const indices = await cosmographRef.current.getPointIndicesByIds([uid]);
            if (indices && indices.length > 0) {
              cosmographRef.current.selectPoint(indices[0], false, true);
              cosmographRef.current.zoomToPoint(indices[0], 600, 1.5);
            }
          }
        } catch {
          // Silently fail
        }
        setSelectedEntityId(uid);
      } else {
        // Node not in graph — re-fetch ego view centered on this entity
        try {
          const data = await fetchGraphData("ego", 2000, uid);
          if (data.nodes.length > 0) {
            if (graphData) {
              const merged = mergeGraphData(graphData, data);
              setGraphData(merged);
              setNodeCount(merged.nodes.length);
              setLinkCount(merged.links.length);
            } else {
              setGraphData(data);
              setNodeCount(data.nodes.length);
              setLinkCount(data.links.length);
            }
            setSelectedEntityId(uid);

            // Zoom to the node after data update settles
            setTimeout(async () => {
              try {
                if (cosmographRef.current) {
                  const indices =
                    await cosmographRef.current.getPointIndicesByIds([uid]);
                  if (indices && indices.length > 0) {
                    cosmographRef.current.zoomToPoint(indices[0], 600, 1.5);
                  }
                }
              } catch {
                // Best-effort zoom
              }
            }, 500);
          }
        } catch {
          // Silently fail
        }
      }
    },
    [graphData, graphNodeIds]
  );

  // Feature 4: Expand neighborhood
  const handleExpand = useCallback(
    async (entityId: string) => {
      if (!graphData) return;

      try {
        const data = await fetchGraphData("ego", 50, entityId, 1);
        if (data.nodes.length > 0) {
          const merged = mergeGraphData(graphData, data);
          setGraphData(merged);
          setNodeCount(merged.nodes.length);
          setLinkCount(merged.links.length);
        }
      } catch {
        // Silently fail — expansion is best-effort
      }
    },
    [graphData]
  );

  // Cosmograph mount callback to capture the instance ref
  const handleCosmographMount = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (instance: any) => {
      cosmographRef.current = instance;
    },
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
<<<<<<< HEAD
    <div ref={containerRef} className="w-full h-full bg-[#000011] relative">
      {graphData && (
        <Cosmograph
          ref={cosmographRef}
          points={graphData.nodes}
          links={graphData.links}
          pointIdBy="id"
          pointLabelBy="name"
          pointColorBy="color"
          pointSizeBy="size"
          linkSourceBy="source"
          linkTargetBy="target"
          linkColorBy="color"
          linkWidthBy="width"
          backgroundColor="#000011"
          pointSize={3}
          pointSizeScale={1.5}
          linkWidth={0.3}
          linkArrows={false}
          linkGreyoutOpacity={0.15}
          // GPU force layout — tuned for knowledge graph topology
          simulationGravity={0.15}
          simulationRepulsion={0.8}
          simulationFriction={0.85}
          simulationLinkSpring={0.3}
          simulationLinkDistance={10}
          simulationDecay={3000}
          // Labels: show top N closest nodes (LOD)
          fitViewOnInit={true}
          showLabelsFor={150}
          // Preserve positions when merging new nodes (Feature 4)
          preservePointPositionsOnDataUpdate={true}
          // Interactivity
          onClick={handleNodeClick}
          onPointMouseOver={handlePointMouseOver}
          onPointMouseOut={handlePointMouseOut}
          hoveredPointRingColor="#ffffff"
          onMount={handleCosmographMount}
        />
      )}

      {/* Feature 3: Search bar */}
      <Atlas3DSearchBar
        onSelect={handleSearchSelect}
        graphNodeIds={graphNodeIds}
      />

      {/* Feature 2: Hover tooltip */}
      <Atlas3DTooltip
        node={hoveredNode}
        position={tooltipPosition}
        connectionCount={hoveredConnectionCount}
      />

      {/* Feature 1 + 4: Detail panel with expand */}
      <Atlas3DDetailPanel
        entityId={selectedEntityId}
        onClose={() => setSelectedEntityId(null)}
        onExpand={handleExpand}
      />

      {/* Stats overlay */}
      <div className="absolute bottom-3 left-3 text-[10px] text-muted-foreground/40 tabular-nums">
        {nodeCount.toLocaleString()} nodes &middot; {linkCount.toLocaleString()} edges
=======
    <div className="w-full h-full bg-background flex flex-col">
      <AtlasHeader
        nodeCount={graphData?.nodes.length}
        linkCount={graphData?.links.length}
      />
      <div ref={containerRef} className="flex-1 relative min-h-0" style={{ height: "calc(100vh - 45px)" }}>
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
>>>>>>> origin/main
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
