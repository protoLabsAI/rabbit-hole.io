"use client";

/**
 * Atlas3DClient — GPU-accelerated graph visualization using Cosmograph.
 *
 * Cosmograph runs force simulation on the GPU via WebGL2 compute shaders,
 * enabling 1M+ nodes at interactive framerates. Data flows from the existing
 * /api/atlas/graph-payload endpoint through a data adapter.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";

import { Icon } from "@proto/icon-system";

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
  limit = 2000
): Promise<GraphData> {
  const res = await fetch(
    `/api/atlas/graph-payload?viewMode=${viewMode}&limit=${limit}`
  );
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

// ─── Component ──────────────────────────────────────────────────────

export default function Atlas3DClient() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nodeCount, setNodeCount] = useState(0);
  const [linkCount, setLinkCount] = useState(0);

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

  const handleNodeClick = useCallback((node: AtlasNode | undefined) => {
    if (node) {
      console.log("[atlas] clicked:", node.name, node.type);
    }
  }, []);

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
          // Interactivity
          onClick={handleNodeClick}
          hoveredPointRingColor="#ffffff"
        />
      )}

      {/* Stats overlay */}
      <div className="absolute bottom-3 left-3 text-[10px] text-muted-foreground/40 tabular-nums">
        {nodeCount.toLocaleString()} nodes &middot; {linkCount.toLocaleString()} edges
      </div>
    </div>
  );
}
