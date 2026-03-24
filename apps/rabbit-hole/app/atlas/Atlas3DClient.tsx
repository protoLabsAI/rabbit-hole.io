"use client";

/**
 * Atlas3DClient — GPU-accelerated graph visualization using cosmos.gl (MIT).
 *
 * cosmos.gl runs force simulation on the GPU via WebGL2 compute shaders,
 * enabling 1M+ nodes at interactive framerates. Wrapped in our own React
 * component (CosmosGraph) to stay fully MIT-licensed.
 */

import { useEffect, useRef, useState, useCallback } from "react";

import { Icon } from "@proto/icon-system";

import { CosmosGraph, type CosmosGraphRef, type CosmosNode, type CosmosLink } from "./lib/CosmosGraph";
import { getEntityVisual, getRelationshipVisual } from "./lib/atlas-schema";

// ─── Types ──────────────────────────────────────────────────────────

interface GraphData {
  nodes: CosmosNode[];
  links: CosmosLink[];
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

  const nodes: CosmosNode[] = (rawNodes ?? []).map(
    (n: { uid: string; name: string; type: string }) => {
      const visual = getEntityVisual(n.type);
      return {
        id: n.uid,
        name: n.name,
        type: n.type,
        color: visual.color,
        size: visual.size,
      };
    }
  );

  const nodeIds = new Set(nodes.map((n) => n.id));

  const links: CosmosLink[] = (rawEdges ?? [])
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
          width: visual.width,
        };
      }
    );

  return { nodes, links };
}

// ─── Component ──────────────────────────────────────────────────────

export default function Atlas3DClient() {
  const graphRef = useRef<CosmosGraphRef>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<CosmosNode | null>(null);

  // Fetch graph data on mount
  useEffect(() => {
    setLoading(true);
    fetchGraphData()
      .then((data) => setGraphData(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Read centerEntity from URL params for deep-linking from search
  useEffect(() => {
    if (!graphData || !graphRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const centerEntity = params.get("centerEntity");
    if (centerEntity) {
      const index = graphData.nodes.findIndex((n) => n.id === centerEntity);
      if (index >= 0) {
        setTimeout(() => {
          graphRef.current?.zoomToPoint(index);
          setSelectedNode(graphData.nodes[index]);
        }, 1000);
      }
    }
  }, [graphData]);

  const handleNodeClick = useCallback(
    (index: number | undefined) => {
      if (index === undefined || !graphData) {
        setSelectedNode(null);
        return;
      }
      const node = graphData.nodes[index];
      setSelectedNode(node ?? null);
      graphRef.current?.zoomToPoint(index);
    },
    [graphData]
  );

  const handleNodeHover = useCallback(
    (index: number | undefined) => {
      // Could add tooltip state here
    },
    []
  );

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
      <div className="flex-1 relative">
      {graphData && (
        <CosmosGraph
          ref={graphRef}
          nodes={graphData.nodes}
          links={graphData.links}
          backgroundColor="#0a0a12"
          pointSize={4}
          linkWidth={0.3}
          simulationGravity={0.15}
          simulationRepulsion={0.8}
          simulationFriction={0.85}
          simulationLinkSpring={0.3}
          simulationLinkDistance={10}
          simulationDecay={3000}
          fitViewOnInit={true}
          onClick={handleNodeClick}
          onHover={handleNodeHover}
        />
      )}

      {/* Selected node detail card */}
      {selectedNode && (
        <div className="absolute top-4 right-4 w-72 bg-card/95 backdrop-blur border border-border rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground truncate">
              {(selectedNode as any).name}
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
              {(selectedNode as any).type}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/atlas?viewMode=ego&centerEntity=${selectedNode.id}`}
              className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors"
            >
              <Icon name="Maximize2" className="h-3 w-3" />
              Ego network
            </a>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}

// ─── Header (matches search engine + research page style) ───────────

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
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
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
