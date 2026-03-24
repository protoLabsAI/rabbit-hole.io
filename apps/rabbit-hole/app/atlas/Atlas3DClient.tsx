"use client";

/**
 * Atlas3DClient — GPU-accelerated graph visualization using Cosmograph.
 *
 * Cosmograph runs force simulation on the GPU via WebGL2 compute shaders,
 * enabling 1M+ nodes at interactive framerates. Data flows from the existing
 * /api/atlas/graph-payload endpoint through a data adapter.
 *
 * Interactive features:
 * 1. Click-to-inspect — detail panel on right side
 * 2. Hover tooltip — floating label near cursor
 * 3. Search + focus — typeahead with zoom-to-node
 * 4. Node expansion — fetch and merge neighborhood
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";

import { Icon } from "@proto/icon-system";

import Atlas3DDetailPanel from "./components/Atlas3DDetailPanel";
import Atlas3DSearchBar from "./components/Atlas3DSearchBar";
import Atlas3DTooltip from "./components/Atlas3DTooltip";

// Cosmograph is WebGL-only — disable SSR
const Cosmograph = dynamic(
  () => import("@cosmograph/react").then((mod) => mod.Cosmograph),
  { ssr: false }
);

// ─── Types ──────────────────────────────────────────────────────────

interface AtlasNode {
  id: string;
  name: string;
  type: string;
  color: string;
  size: number;
}

interface AtlasLink {
  source: string;
  target: string;
  color: string;
  width: number;
}

interface GraphData {
  nodes: AtlasNode[];
  links: AtlasLink[];
}

// ─── Data Fetching ──────────────────────────────────────────────────

async function fetchGraphData(
  viewMode = "full-atlas",
  limit = 2000,
  centerEntity?: string,
  hops?: number
): Promise<GraphData> {
  const params = new URLSearchParams({
    viewMode,
    limit: String(limit),
  });
  if (centerEntity) params.set("centerEntity", centerEntity);
  if (hops !== undefined) params.set("hops", String(hops));

  const res = await fetch(`/api/atlas/graph-payload?${params}`);
  const json = await res.json();

  if (!json.success || !json.data) {
    return { nodes: [], links: [] };
  }

  const { nodes: rawNodes, edges: rawEdges } = json.data;

  const nodes: AtlasNode[] = (rawNodes ?? []).map(
    (n: { uid: string; name: string; type: string }) => ({
      id: n.uid,
      name: n.name,
      type: n.type,
      color: getEntityColor(n.type),
      size: getEntitySize(n.type),
    })
  );

  const nodeIds = new Set(nodes.map((n) => n.id));

  const links: AtlasLink[] = (rawEdges ?? [])
    .filter(
      (e: { source: string; target: string }) =>
        nodeIds.has(e.source) && nodeIds.has(e.target)
    )
    .map((e: { source: string; target: string; type?: string; sentiment?: string; display?: { color?: string } }) => {
      const visual = getRelationshipVisual(e.type ?? "RELATED_TO", e.sentiment);
      return {
        source: e.source,
        target: e.target,
        color: e.display?.color ?? visual.color,
        width: visual.width,
      };
    });

  return { nodes, links };
}

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

// ─── Component ──────────────────────────────────────────────────────

export default function Atlas3DClient() {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cosmographRef = useRef<any>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nodeCount, setNodeCount] = useState(0);
  const [linkCount, setLinkCount] = useState(0);

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
  useEffect(() => {
    setLoading(true);
    fetchGraphData()
      .then((data) => {
        setGraphData(data);
        setNodeCount(data.nodes.length);
        setLinkCount(data.links.length);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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
      <div className="w-full h-full bg-[#000011] flex items-center justify-center">
        <div className="text-center">
          <Icon name="Loader2" className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading knowledge graph...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full bg-[#000011] flex items-center justify-center">
        <div className="text-center">
          <Icon name="AlertCircle" className="h-8 w-8 text-destructive mx-auto mb-3" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
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
      </div>
    </div>
  );
}
