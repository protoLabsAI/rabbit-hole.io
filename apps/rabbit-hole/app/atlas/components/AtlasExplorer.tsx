/**
 * Atlas Explorer - Sigma.js Based
 *
 * High-performance read-only graph explorer
 * Fetches from /api/atlas/graph-payload (with cache)
 */

"use client";

import {
  SigmaContainer,
  useLoadGraph,
  useSigma,
  useRegisterEvents,
} from "@react-sigma/core";
import type Graph from "graphology";
import React, { useEffect, useState } from "react";

import "@react-sigma/core/lib/react-sigma.min.css";

import { canonicalToGraph } from "../../graph-visualizer/model/adapters/canonical";
import {
  prepareGraphForSigma,
  getSigmaSettings,
} from "../../graph-visualizer/model/adapters/sigma";
import type {
  GraphNodeAttributes,
  GraphEdgeAttributes,
} from "../../graph-visualizer/model/graph";

interface AtlasExplorerProps {
  viewMode: string;
  centerEntity?: string;
  communityId?: number;
  timeWindow?: { from: string; to: string };
  hops?: number;
  limit?: number;
  onNodeClick?: (node: any) => void;
  onNodeHover?: (node: any) => void;
  className?: string;
}

function SigmaGraphLoader({
  graph,
  onNodeClick,
  onNodeHover,
}: {
  graph: Graph<GraphNodeAttributes, GraphEdgeAttributes>;
  onNodeClick?: (node: any) => void;
  onNodeHover?: (node: any) => void;
}) {
  const loadGraph = useLoadGraph();
  const sigma = useSigma();
  const registerEvents = useRegisterEvents();

  // Load graph into Sigma
  useEffect(() => {
    const preparedGraph = prepareGraphForSigma(graph);
    loadGraph(preparedGraph);
  }, [graph, loadGraph]);

  // Register events
  useEffect(() => {
    const eventConfig: any = {};

    if (onNodeClick) {
      eventConfig.clickNode = (event: any) => {
        const nodeId = event.node;
        const attrs = graph.getNodeAttributes(nodeId);
        onNodeClick({
          uid: attrs.uid,
          name: attrs.name,
          type: attrs.type,
          properties: attrs.properties,
        });
      };
    }

    if (onNodeHover) {
      eventConfig.enterNode = (event: any) => {
        const nodeId = event.node;
        const attrs = graph.getNodeAttributes(nodeId);
        onNodeHover({
          uid: attrs.uid,
          name: attrs.name,
          type: attrs.type,
        });
      };

      eventConfig.leaveNode = () => {
        onNodeHover(null);
      };
    }

    registerEvents(eventConfig);
  }, [graph, onNodeClick, onNodeHover, registerEvents]);

  return null;
}

export function AtlasExplorer({
  viewMode,
  centerEntity,
  communityId,
  timeWindow,
  hops = 2,
  limit = 500,
  onNodeClick,
  onNodeHover,
  className = "w-full h-full",
}: AtlasExplorerProps) {
  const [graph, setGraph] = useState<Graph<
    GraphNodeAttributes,
    GraphEdgeAttributes
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch graph payload
  useEffect(() => {
    const fetchGraph = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          viewMode,
          hops: hops.toString(),
          limit: limit.toString(),
        });

        if (centerEntity) params.set("centerEntity", centerEntity);
        if (communityId !== undefined)
          params.set("communityId", communityId.toString());
        if (timeWindow) {
          params.set("timeFrom", timeWindow.from);
          params.set("timeTo", timeWindow.to);
        }

        const response = await fetch(`/api/atlas/graph-payload?${params}`);
        const result = await response.json();

        if (result.success && result.data) {
          // Convert payload to Graphology
          const newGraph = canonicalToGraph({
            nodes: result.data.nodes,
            edges: result.data.edges,
            meta: {
              nodeCount: result.data.nodes.length,
              edgeCount: result.data.edges.length,
              generatedAt: new Date().toISOString(),
              schemaVersion: "canonical-v1" as const,
              viewMode: viewMode as
                | "full-atlas"
                | "ego"
                | "community"
                | "timeslice"
                | "batch",
            },
          });

          setGraph(newGraph);
        } else {
          setError(result.error || "Failed to load graph");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error");
      } finally {
        setLoading(false);
      }
    };

    fetchGraph();
  }, [viewMode, centerEntity, communityId, timeWindow, hops, limit]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-lg font-medium">Loading Atlas...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="text-center text-destructive">
          <div className="text-lg font-semibold mb-2">Error Loading Graph</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }

  if (!graph || graph.order === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="text-center text-muted-foreground">
          <div className="text-lg font-medium mb-2">No Data</div>
          <div className="text-sm">No entities found for current filters</div>
        </div>
      </div>
    );
  }

  const settings = getSigmaSettings(graph.order);

  return (
    <div className={className}>
      <SigmaContainer
        graph={graph}
        settings={settings}
        style={{ width: "100%", height: "100%" }}
      >
        <SigmaGraphLoader
          graph={graph}
          onNodeClick={onNodeClick}
          onNodeHover={onNodeHover}
        />
      </SigmaContainer>
    </div>
  );
}
